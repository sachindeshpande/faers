/**
 * Headless mode entry point.
 *
 * Runs the full "import JSON → generate E2B(R3) XML → validate" workflow
 * without the Electron GUI. Designed for testing — no auth, no FDA gateway
 * submission, no UI. The file-level workflow mirrors the GUI's Submit path
 * up to XML generation:
 *
 *   1. Import the JSON (same `CaseImportService` the GUI uses)
 *   2. Transition the Draft → Ready for Export (runs field-level validation)
 *   3. Generate the E2B(R3) XML
 *   4. Run the three pre-submission gates (structural, 55-check lint, 5-pass)
 *   5. Write `<input-base>.xml` next to the input (or to --out-dir)
 *   6. Transition Ready → Exported (audit trail records it)
 *
 * Steps 1–6 happen against an ephemeral SQLite file in the OS temp dir by
 * default. The existing GUI database is untouched.
 *
 * Invoked via `npm run headless -- [options] <input.json> [<input2.json>...]`
 * which in turn runs `ELECTRON_RUN_AS_NODE=1 electron out/main/headless.js`
 * — same trick the integration test suite uses so `better-sqlite3`'s native
 * bindings load against Electron's Node.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, resolve as resolvePath } from 'node:path';
import { tmpdir } from 'node:os';

import { initDatabase, closeDatabase } from '../database/connection';
import { CaseRepository } from '../database/repositories';
import { CaseImportService } from '../services/caseImportService';
import { XMLGeneratorService } from '../services/xmlGeneratorService';
import { ValidationService } from '../services/validationService';
import { lintE2bXml } from '../services/xmlLintService';
import { runFivePassValidation } from '../services/fivePassValidatorService';
import { StatusTransitionService } from '../services/statusTransitionService';
import {
  hasBeenSubmitted,
  recordSubmission,
  resolveLogPath,
  updateAckOutcome
} from '../services/submissionLogService';
import type {
  SubmissionEnvironment,
  SubmissionReportType,
  TargetCenter
} from '../../shared/types/case.types';
import type { CaseImportResult } from '../../shared/types/caseImport.types';
import type { LintResult } from '../services/xmlLintService';
import type { FivePassResult } from '../../shared/types/faersValidation.types';

// ────────────────────────────────────────────────────────────────────────────
//  Public API — exported so tests can call the runner directly without
//  going through the process.argv / process.exit path.
// ────────────────────────────────────────────────────────────────────────────

export interface HeadlessOptions {
  /** Absolute paths to input JSON files. */
  inputs: string[];
  /** Output directory. Defaults to each input's own directory. */
  outDir?: string;
  /**
   * DB path. When absent, an ephemeral file is created in the OS temp dir
   * and deleted at the end of the run (unless `keepDb` is true).
   */
  dbPath?: string;
  /** Don't delete the ephemeral DB when exiting. No-op if `dbPath` was set. */
  keepDb?: boolean;
  /** Sender DUNS for XML generation. */
  duns?: string;
  /** Submission environment baked into the XML. */
  submissionEnvironment?: SubmissionEnvironment;
  /** Submission report type (postmarket vs premarket). */
  submissionReportType?: SubmissionReportType;
  /** Target center (CDER or CBER). */
  targetCenter?: TargetCenter;
  /** Also write `<input-base>.report.json` with structured gate results. */
  report?: boolean;
  /**
   * Emit XML even when gates fail. Normally any gate failure → no Exported
   * transition and non-zero exit for that file. With `noGate=true` we write
   * the XML regardless (gates still run and get logged).
   */
  noGate?: boolean;
  /** Stop at the first input failure. Default is continue. */
  strict?: boolean;
  /** Suppress per-stage log lines. Final summary still prints. */
  quiet?: boolean;
  /**
   * Skip the duplicate-batch-UUID guard from `submissionLogService`. The
   * generator emits a fresh UUID per call, so the guard rarely fires in
   * normal use; the flag exists for tests that inject a known UUID.
   */
  allowDuplicate?: boolean;
  /**
   * Skip the IND enrollment pre-flight (GAP-SUB-003). For offline
   * regeneration or testing only — never set in CI / production.
   */
  skipIndEnrollment?: boolean;
}

/**
 * Subcommand options for `--record-ack` — closes the loop after a
 * portal submission by attaching the FDA ACK outcome to an existing
 * record in the submission log. Mutually exclusive with `inputs`.
 */
export interface RecordAckOptions {
  batchUuid: string;
  ackId: string;
  outcome: 'CA' | 'CR' | 'AE' | 'AR' | 'CA+AE' | 'CR+AR';
}

export interface HeadlessFileResult {
  input: string;
  output?: string;
  caseId?: string;
  ok: boolean;
  stages: Array<{ stage: string; ok: boolean; detail?: string }>;
  error?: string;
  import?: CaseImportResult;
  lint?: LintResult;
  fivePass?: FivePassResult;
  /** ESG routing — populated after Stage 4 (write). Drives the checklist. */
  routing?: {
    channel: 'ZZFDATST' | 'ZZFDATST_PREMKT';
    portalLabel: string;        // e.g. 'ZZFDATST (CDER)'
    batchReceiver: string;      // N.1.4 — must equal `channel`
    msgReceiver: string;        // N.2.r.3 — 'CDER' | 'CDER_IND' | 'CBER' | 'CBER_IND'
    batchUuid: string;          // for the submission log + duplicate detection
    caseType: 'postmarket' | 'ind' | 'babe' | undefined;
    isDuplicate?: boolean;      // set when the batch UUID was already in the log
  };
}

export interface HeadlessResult {
  results: HeadlessFileResult[];
  exitCode: number;
}

// ────────────────────────────────────────────────────────────────────────────
//  Runner — this is the unit testable bit.
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_DUNS = '334818134';

export async function runHeadless(opts: HeadlessOptions): Promise<HeadlessResult> {
  const log = opts.quiet ? () => {} : (msg: string) => console.log(msg);

  if (!opts.inputs || opts.inputs.length === 0) {
    console.error('No input JSON files provided.');
    return { results: [], exitCode: 2 };
  }

  // Set up the DB. Ephemeral by default. The env-var override on
  // getDatabasePath() makes this a one-line setup — initDatabase() runs
  // migrations and seeds the default admin.
  const { dbFile, tempDir } = resolveDbPath(opts);
  const prevEnv = process.env.FAERS_DB_PATH;
  process.env.FAERS_DB_PATH = dbFile;
  let db;
  try {
    db = initDatabase();
  } catch (e) {
    console.error(`Failed to initialise database at ${dbFile}:`, (e as Error).message);
    return { results: [], exitCode: 1 };
  }

  const duns = opts.duns || DEFAULT_DUNS;
  const submissionEnvironment = opts.submissionEnvironment || 'Test';
  const targetCenter = opts.targetCenter || 'CDER';
  // Don't default submissionReportType globally — pass `undefined` through
  // so each file's caseType can drive the choice (IND → Premarket,
  // postmarket → Postmarket). An explicit CLI flag still wins per file.
  const submissionReportTypeFlag = opts.submissionReportType;

  const caseRepo = new CaseRepository(db);
  const importSvc = new CaseImportService(db);
  const xmlSvc = new XMLGeneratorService(db);
  const statusSvc = new StatusTransitionService(db);

  const results: HeadlessFileResult[] = [];

  for (const input of opts.inputs) {
    const absInput = isAbsolute(input) ? input : resolvePath(process.cwd(), input);
    const result = await processOneFile({
      input: absInput,
      outDir: opts.outDir,
      duns,
      submissionEnvironment,
      submissionReportTypeFlag,
      targetCenter,
      report: opts.report,
      noGate: opts.noGate,
      allowDuplicate: opts.allowDuplicate,
      skipIndEnrollment: opts.skipIndEnrollment,
      log,
      importSvc,
      xmlSvc,
      statusSvc,
      caseRepo
    });
    results.push(result);
    if (opts.strict && !result.ok) break;
  }

  // Summary
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  console.log(`\nHeadless run complete: ${okCount} succeeded, ${failCount} failed.`);
  for (const r of results) {
    const mark = r.ok ? '✓' : '✗';
    console.log(`  ${mark} ${basename(r.input)}${r.output ? ` → ${r.output}` : ''}${r.error ? ` — ${r.error}` : ''}`);
  }

  // Submission checklist (GAP-CLI-001) — group by ESG channel so any
  // cross-channel mistake in a single batch is impossible to miss.
  // Suppressed under --quiet since it's purely operator-facing.
  if (!opts.quiet) {
    printSubmissionChecklist(results);
  }

  // Cleanup
  closeDatabase();
  if (prevEnv === undefined) delete process.env.FAERS_DB_PATH;
  else process.env.FAERS_DB_PATH = prevEnv;
  if (tempDir && !opts.keepDb) {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* best effort */ }
  }

  return { results, exitCode: failCount > 0 ? 1 : 0 };
}

// ────────────────────────────────────────────────────────────────────────────
//  Submission checklist (GAP-CLI-001)
// ────────────────────────────────────────────────────────────────────────────

const CHANNEL_HINT: Record<string, string> = {
  ZZFDATST: 'Submit via the ESG portal ZZFDATST (postmarket) channel only',
  ZZFDATST_PREMKT: 'Submit via the ESG portal ZZFDATST_PREMKT (CDER_IND) channel only',
  ZZFDA: 'PRODUCTION postmarket — submit via the ZZFDA channel only',
  ZZFDA_PREMKT: 'PRODUCTION premarket — submit via the ZZFDA_PREMKT channel only'
};

function printSubmissionChecklist(results: HeadlessFileResult[]): void {
  const routed = results.filter((r) => r.routing && r.output);
  if (routed.length === 0) return;

  // Group by channel so cross-channel mistakes are visible at a glance.
  const byChannel = new Map<string, HeadlessFileResult[]>();
  for (const r of routed) {
    const ch = r.routing!.batchReceiver;
    const list = byChannel.get(ch) ?? [];
    list.push(r);
    byChannel.set(ch, list);
  }

  console.log('');
  console.log('=== SUBMISSION CHECKLIST ===');
  for (const [channel, files] of byChannel) {
    const portal = files[0].routing!.portalLabel;
    console.log(`\nChannel: ${portal}`);
    console.log(`  ${CHANNEL_HINT[channel] ?? `Submit via the ESG portal ${channel} channel`}`);
    for (const r of files) {
      const dupe = r.routing!.isDuplicate ? '  *** DUPLICATE — REGENERATE ***' : '';
      const shortUuid = r.routing!.batchUuid.slice(-12) || '(none)';
      console.log(`    ${basename(r.input)}  [${shortUuid}]${dupe}`);
    }
  }
  console.log('============================');
}

// ────────────────────────────────────────────────────────────────────────────
//  Per-file pipeline
// ────────────────────────────────────────────────────────────────────────────

interface ProcessArgs {
  input: string;
  outDir?: string;
  duns: string;
  submissionEnvironment: SubmissionEnvironment;
  /**
   * CLI-provided report type override (`--report-type`). Undefined when
   * the user omitted the flag, in which case the effective value is
   * resolved from the imported case's caseType: `'ind'` → `Premarket`,
   * otherwise `Postmarket`.
   */
  submissionReportTypeFlag?: SubmissionReportType;
  targetCenter: TargetCenter;
  report?: boolean;
  noGate?: boolean;
  /** Skip the duplicate-batch-UUID guard (GAP-SUB-002). */
  allowDuplicate?: boolean;
  /** Skip the IND enrollment pre-flight (GAP-SUB-003). */
  skipIndEnrollment?: boolean;
  log: (msg: string) => void;
  importSvc: CaseImportService;
  xmlSvc: XMLGeneratorService;
  statusSvc: StatusTransitionService;
  caseRepo: CaseRepository;
}

/**
 * Per-file effective report type. When the user omits `--report-type`, we
 * infer from the imported case's caseType so an IND JSON always routes
 * via Premarket receivers even from a bare `npm run headless -- foo.json`
 * invocation. When the flag IS set but disagrees with caseType (e.g. IND
 * case but `--report-type Postmarket`), we honor the flag (user intent
 * wins) and push a warning to `stages` so it's visible in the log.
 */
export function resolveSubmissionReportType(
  caseType: string | undefined,
  cliFlag: SubmissionReportType | undefined
): { value: SubmissionReportType; reason: 'cli' | 'inferred-ind' | 'default-postmarket'; warning?: string } {
  // Both IND SUSAR and IND-Exempt BA/BE route via Premarket receivers.
  // Any case with caseType in {'ind', 'babe'} gets Premarket by default
  // when the CLI flag is absent.
  const isStudy = caseType === 'ind' || caseType === 'babe';
  if (cliFlag) {
    if (isStudy && cliFlag !== 'Premarket') {
      return {
        value: cliFlag,
        reason: 'cli',
        warning: `case.caseType="${caseType}" but --report-type=${cliFlag}; routing headers will not match the study-report body`
      };
    }
    if (!isStudy && cliFlag === 'Premarket' && caseType === 'postmarket') {
      return {
        value: cliFlag,
        reason: 'cli',
        warning: `case.caseType="postmarket" but --report-type=Premarket; IND receivers will wrap a postmarket ICSR`
      };
    }
    return { value: cliFlag, reason: 'cli' };
  }
  if (isStudy) return { value: 'Premarket', reason: 'inferred-ind' };
  return { value: 'Postmarket', reason: 'default-postmarket' };
}

async function processOneFile(args: ProcessArgs): Promise<HeadlessFileResult> {
  const { input, log } = args;
  const stages: HeadlessFileResult['stages'] = [];
  const baseName = basename(input, extname(input));
  const outDir = args.outDir ?? dirname(input);
  const outPath = join(outDir, `${baseName}.xml`);
  const reportPath = join(outDir, `${baseName}.report.json`);

  const result: HeadlessFileResult = { input, ok: false, stages };

  log(`\n▶ ${input}`);

  // ── Stage 1: import ────────────────────────────────────────────────────
  if (!existsSync(input)) {
    result.error = `Input file not found: ${input}`;
    stages.push({ stage: 'import', ok: false, detail: result.error });
    log(`  [import] FAIL — ${result.error}`);
    return result;
  }

  const importRes = args.importSvc.importCaseFromJson({ filePath: input });
  result.import = importRes;
  if (!importRes.success || !importRes.caseId) {
    const detail = (importRes.errors ?? [])
      .map((e) => `${e.path}: ${e.message}`)
      .join('; ') || 'import failed';
    result.error = detail;
    stages.push({ stage: 'import', ok: false, detail });
    log(`  [import] FAIL — ${detail}`);
    return result;
  }
  result.caseId = importRes.caseId;
  stages.push({ stage: 'import', ok: true, detail: importRes.caseId });
  log(`  [import] OK ${importRes.caseId}`);
  if (importRes.warnings?.length) {
    importRes.warnings.forEach((w) => log(`           ⚠ ${w}`));
  }

  // ── Stage 2: markReady (field-level validation + status transition) ───
  const ready = args.statusSvc.markReady(importRes.caseId);
  if (!ready.success) {
    const detail = ready.validationResult
      ? ready.validationResult.errors
          .filter((e) => e.severity === 'error')
          .map((e) => `${e.field}: ${e.message}`)
          .join('; ')
      : ready.error ?? 'markReady failed';
    result.error = detail;
    stages.push({ stage: 'validate', ok: false, detail });
    log(`  [validate] FAIL — ${detail}`);
    return result;
  }
  stages.push({ stage: 'validate', ok: true });
  log(`  [validate] OK`);

  // Look up the persisted case once so the downstream stages can branch
  // on caseType — report-type resolution (this line), lint skip, and the
  // 5-pass validator all need it.
  const persistedCaseForRouting = args.caseRepo.findById(importRes.caseId);

  // ── Stage 2b: IND enrollment pre-flight (GAP-SUB-003) ──────────────────
  // ISSUE-004 (T02 portal decline 2026-04-29): IND/babe submissions need
  // a separate AEMSESUB enrollment that the XML alone can't satisfy. The
  // ICSR ACK comes back CA+AE but the portal admin-declines the file
  // until enrollment is on record. Refuse to generate IND/babe XMLs when
  // the operator hasn't acknowledged this with `IND_ENROLLMENT_CONFIRMED=true`.
  // Per-file failure (not process.exit) keeps `--strict` semantics intact
  // and lets postmarket files in the same batch still process.
  const caseTypeForEnrollment = persistedCaseForRouting?.caseType;
  if (
    (caseTypeForEnrollment === 'ind' || caseTypeForEnrollment === 'babe') &&
    process.env.IND_ENROLLMENT_CONFIRMED !== 'true' &&
    !args.skipIndEnrollment
  ) {
    const detail =
      'IND_ENROLLMENT_CONFIRMED=true required for IND/BA-BE generation. ' +
      'Email AEMSESUB@fda.hhs.gov to confirm enrollment then re-run with the env var set, ' +
      'or pass --skip-ind-enrollment for offline regeneration only.';
    result.error = detail;
    stages.push({ stage: 'ind-enrollment', ok: false, detail });
    log(`  [ind-enrollment] FAIL — ${detail}`);
    return result;
  }

  // Resolve the effective submission report type for this file. Without a
  // CLI flag, caseType="ind" auto-routes to Premarket; postmarket
  // remains the default otherwise. A flag → caseType mismatch is kept
  // non-fatal but logged so it's visible.
  const reportTypeRes = resolveSubmissionReportType(
    persistedCaseForRouting?.caseType,
    args.submissionReportTypeFlag
  );
  if (reportTypeRes.reason === 'inferred-ind') {
    log(`  [route] auto-selected Premarket for IND case (no --report-type given)`);
  }
  if (reportTypeRes.warning) {
    log(`  [route] ⚠ ${reportTypeRes.warning}`);
    stages.push({ stage: 'route', ok: true, detail: reportTypeRes.warning });
  }

  // ── Stage 3: generate XML ─────────────────────────────────────────────
  const xmlRes = args.xmlSvc.generate(importRes.caseId, {
    submissionEnvironment: args.submissionEnvironment,
    submissionReportType: reportTypeRes.value,
    senderIdentifierType: 'duns',
    senderIdentifierValue: args.duns,
    targetCenter: args.targetCenter
  });
  if (!xmlRes.success || !xmlRes.xml) {
    const detail = xmlRes.errors?.join('; ') || 'xml generation failed';
    result.error = detail;
    stages.push({ stage: 'generate', ok: false, detail });
    log(`  [generate] FAIL — ${detail}`);
    return result;
  }
  stages.push({ stage: 'generate', ok: true, detail: `${xmlRes.xml.length} bytes` });
  log(`  [generate] OK ${xmlRes.xml.length} bytes`);

  // ── Stage 3b: duplicate batch UUID guard (GAP-SUB-002) ─────────────────
  // The generator emits a fresh UUID per call, so this guard is rarely
  // tripped in normal use; it exists to catch cases where someone hand-
  // edits a JSON to inject a fixed `batchNumber`, or to surface a corrupt
  // log state. The submission log row is written below, post-write.
  let isDuplicate = false;
  if (xmlRes.batchUuid && hasBeenSubmitted(xmlRes.batchUuid)) {
    isDuplicate = true;
    if (args.allowDuplicate) {
      stages.push({
        stage: 'duplicate-check',
        ok: true,
        detail: `WARN: batch UUID ${xmlRes.batchUuid} already in submission log; --allow-duplicate set`
      });
      log(`  [duplicate-check] WARN — batch UUID ${xmlRes.batchUuid} already in log (--allow-duplicate)`);
    } else {
      const detail = `batch UUID ${xmlRes.batchUuid} already in submission log; rerun without --batch-number or pass --allow-duplicate to override`;
      result.error = detail;
      stages.push({ stage: 'duplicate-check', ok: false, detail });
      log(`  [duplicate-check] FAIL — ${detail}`);
      return result;
    }
  }

  // ── Stage 4: write XML ────────────────────────────────────────────────
  // Write early so the user can inspect the output even when later gates
  // fail. Gates only affect exit code + the markExported transition.
  try {
    writeXml(outPath, xmlRes.xml);
    result.output = outPath;
    stages.push({ stage: 'write', ok: true, detail: outPath });
    log(`  [write] ${outPath}`);
  } catch (e) {
    const detail = (e as Error).message;
    result.error = detail;
    stages.push({ stage: 'write', ok: false, detail });
    log(`  [write] FAIL — ${detail}`);
    return result;
  }

  // ── Stage 4b: ESG channel routing directive (GAP-SUB-001) ─────────────
  // Print the portal channel + N.1.4 / N.2.r.3 values right after the
  // write so the operator never has to inspect the XML to know where to
  // upload it. The values come from the generator's actual output —
  // never re-derive them from caseType to avoid drift.
  const caseTypeForRouting = persistedCaseForRouting?.caseType as
    | 'postmarket'
    | 'ind'
    | 'babe'
    | undefined;
  const isStudyForRouting =
    caseTypeForRouting === 'ind' || caseTypeForRouting === 'babe';
  const channel: 'ZZFDATST' | 'ZZFDATST_PREMKT' = isStudyForRouting
    ? 'ZZFDATST_PREMKT'
    : 'ZZFDATST';
  const portalLabel = isStudyForRouting
    ? 'ZZFDATST_PREMKT (CDER_IND)'
    : 'ZZFDATST (CDER)';
  const routedBatchReceiver = xmlRes.batchReceiver ?? channel;
  const routedMsgReceiver = xmlRes.msgReceiver ?? (isStudyForRouting ? 'CDER_IND' : 'CDER');
  const routedBatchUuid = xmlRes.batchUuid ?? '';
  result.routing = {
    channel,
    portalLabel,
    batchReceiver: routedBatchReceiver,
    msgReceiver: routedMsgReceiver,
    batchUuid: routedBatchUuid,
    caseType: caseTypeForRouting,
    isDuplicate
  };
  stages.push({
    stage: 'route-portal',
    ok: true,
    detail: `${portalLabel}  N.1.4=${routedBatchReceiver}  N.2.r.3=${routedMsgReceiver}`
  });
  log(`  [route] ${portalLabel}  N.1.4=${routedBatchReceiver}  N.2.r.3=${routedMsgReceiver}`);

  // ── Stage 4c: persist submission record (GAP-SUB-002) ──────────────────
  // The log is the source of truth for "what UUIDs has this operator
  // already generated". Writing here (post-write, post-route) means a
  // failed write doesn't pollute the log. Outcome is left undefined
  // until the operator runs `--record-ack`.
  if (routedBatchUuid) {
    try {
      recordSubmission({
        batchUuid: routedBatchUuid,
        caseId: importRes.caseId,
        channel: routedBatchReceiver,
        msgReceiver: routedMsgReceiver,
        outputPath: outPath,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      // Don't fail the whole run for a log-write hiccup; surface as warning.
      log(`  [submission-log] WARN — could not persist log entry: ${(e as Error).message}`);
    }
  }

  // ── Stage 5: structural validation ────────────────────────────────────
  let anyGateFailed = false;
  try {
    const structural = ValidationService.validateXmlStructure(xmlRes.xml);
    const structuralErrs = structural.errors.filter((e) => e.severity === 'error');
    if (structuralErrs.length > 0) {
      const detail = structuralErrs.map((e) => `${e.field}: ${e.message}`).join('; ');
      stages.push({ stage: 'structural', ok: false, detail });
      log(`  [structural] FAIL — ${detail}`);
      anyGateFailed = true;
    } else {
      stages.push({ stage: 'structural', ok: true });
      log(`  [structural] OK`);
    }
  } catch (e) {
    const detail = `gate crashed: ${(e as Error).message}`;
    stages.push({ stage: 'structural', ok: false, detail });
    log(`  [structural] ERR — ${detail}`);
    anyGateFailed = true;
  }

  // Same persistedCase used above for report-type resolution; re-used
  // here to drive the lint skip and 5-pass caseType option.
  const caseTypeForGates = persistedCaseForRouting?.caseType;
  const isStudyCase = caseTypeForGates === 'ind' || caseTypeForGates === 'babe';

  // ── Stage 6: 55-check lint ────────────────────────────────────────────
  // Skip for IND + BA/BE — the 55-check Python lint hard-codes the
  // postmarket v37 receiver set (ZZFDATST / CDER) and would always fail
  // for a Premarket XML (ZZFDATST_PREMKT / CDER_IND). A future Premarket-
  // specific lint catalogue can replace this skip.
  if (isStudyCase) {
    stages.push({ stage: 'lint', ok: true, detail: `skipped: ${caseTypeForGates?.toUpperCase()} case (postmarket lint N/A)` });
    log(`  [lint] skipped — ${caseTypeForGates?.toUpperCase()} case (postmarket 55-check N/A)`);
  } else {
    try {
      const lint = lintE2bXml(xmlRes.xml);
      result.lint = lint;
      if (lint.ran) {
        const summary = `${lint.pass} PASS / ${lint.warn} WARN / ${lint.fail} FAIL`;
        if (lint.fail > 0) {
          const detail = lint.failures.map((f) => f.label).slice(0, 5).join('; ');
          stages.push({ stage: 'lint', ok: false, detail });
          log(`  [lint] FAIL ${summary} — ${detail}`);
          anyGateFailed = true;
        } else {
          stages.push({ stage: 'lint', ok: true, detail: summary });
          log(`  [lint] OK ${summary}`);
        }
      } else {
        stages.push({ stage: 'lint', ok: true, detail: `skipped: ${lint.skipReason}` });
        log(`  [lint] skipped — ${lint.skipReason}`);
      }
    } catch (e) {
      const detail = `gate crashed: ${(e as Error).message}`;
      stages.push({ stage: 'lint', ok: false, detail });
      log(`  [lint] ERR — ${detail}`);
      anyGateFailed = true;
    }
  }

  // ── Stage 7: 5-pass empirical validator ───────────────────────────────
  try {
    const fivePass = runFivePassValidation(xmlRes.xml, {
      caseType: persistedCaseForRouting?.caseType
    });
    result.fivePass = fivePass;
    if (fivePass.ran) {
      const errs = fivePass.findings.filter((f) => f.severity === 'error').length;
      const warns = fivePass.findings.filter((f) => f.severity === 'warning').length;
      const summary = `errors=${errs} warnings=${warns} pass=${fivePass.pass}`;
      if (errs > 0) {
        const detail = fivePass.findings
          .filter((f) => f.severity === 'error')
          .slice(0, 5)
          .map((f) => `P${f.pass}: ${f.label}`)
          .join('; ');
        stages.push({ stage: '5pass', ok: false, detail });
        log(`  [5pass] FAIL ${summary} — ${detail}`);
        anyGateFailed = true;
      } else {
        stages.push({ stage: '5pass', ok: true, detail: summary });
        log(`  [5pass] OK ${summary}`);
      }
    } else {
      stages.push({ stage: '5pass', ok: true, detail: `skipped: ${fivePass.skipReason}` });
      log(`  [5pass] skipped — ${fivePass.skipReason}`);
    }
  } catch (e) {
    const detail = `gate crashed: ${(e as Error).message}`;
    stages.push({ stage: '5pass', ok: false, detail });
    log(`  [5pass] ERR — ${detail}`);
    anyGateFailed = true;
  }

  // If any gate failed and we're NOT in --no-gate, this file's run is a
  // failure for exit-code purposes. XML is still on disk; markExported
  // is skipped so the audit trail reflects that the case didn't actually
  // finish the export workflow cleanly.
  if (anyGateFailed && !args.noGate) {
    result.error = result.error
      ?? stages.filter((s) => !s.ok).map((s) => `${s.stage}: ${s.detail ?? 'failed'}`).join(' | ');
    return result;
  }

  // ── Stage 8: markExported (audit trail) ───────────────────────────────
  const exported = args.statusSvc.markExported(importRes.caseId, {
    filename: `${baseName}.xml`,
    filePath: outPath,
    submissionEnvironment: args.submissionEnvironment,
    submissionReportType: reportTypeRes.value
  });
  if (exported.success) {
    args.caseRepo.update(importRes.caseId, {
      status: 'Exported',
      exportedAt: new Date().toISOString(),
      exportedXmlPath: outPath
    });
    stages.push({ stage: 'markExported', ok: true });
    log(`  [markExported] OK`);
  } else {
    stages.push({ stage: 'markExported', ok: false, detail: exported.error });
    log(`  [markExported] WARN — ${exported.error}`);
    // Non-fatal: XML is already written.
  }

  if (args.report) {
    writeFileSync(
      reportPath,
      JSON.stringify(
        {
          input,
          output: outPath,
          caseId: importRes.caseId,
          stages,
          warnings: importRes.warnings ?? []
        },
        null,
        2
      ),
      'utf-8'
    );
    log(`  [report] ${reportPath}`);
  }

  result.ok = true;
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────────

function writeXml(path: string, xml: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, xml, 'utf-8');
}

function resolveDbPath(opts: HeadlessOptions): { dbFile: string; tempDir?: string } {
  if (opts.dbPath) {
    mkdirSync(dirname(opts.dbPath), { recursive: true });
    return { dbFile: opts.dbPath };
  }
  const tempDir = mkdtempSync(join(tmpdir(), 'faers-headless-'));
  return { dbFile: join(tempDir, 'faers.db'), tempDir };
}

// ────────────────────────────────────────────────────────────────────────────
//  CLI parsing + entry point
// ────────────────────────────────────────────────────────────────────────────

interface ParsedArgs extends HeadlessOptions {
  help?: boolean;
  usageError?: string;
  /** When set, the run ignores `inputs` and updates the submission log only. */
  recordAck?: RecordAckOptions;
}

const VALID_OUTCOMES = ['CA', 'CR', 'AE', 'AR', 'CA+AE', 'CR+AR'] as const;
type ValidOutcome = (typeof VALID_OUTCOMES)[number];
function isValidOutcome(v: string): v is ValidOutcome {
  return (VALID_OUTCOMES as readonly string[]).includes(v);
}

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { inputs: [] };
  let i = 0;
  const read = (flag: string): string => {
    const next = argv[++i];
    if (next === undefined || next.startsWith('--')) {
      out.usageError = `Expected value after ${flag}`;
      return '';
    }
    return next;
  };
  while (i < argv.length) {
    const a = argv[i];
    switch (a) {
      case '--help':
      case '-h':
        out.help = true;
        break;
      case '--out-dir':
      case '-o':
        out.outDir = read(a);
        break;
      case '--db':
        out.dbPath = read(a);
        break;
      case '--keep-db':
        out.keepDb = true;
        break;
      case '--duns':
        out.duns = read(a);
        break;
      case '--env': {
        const v = read(a);
        if (v !== 'Test' && v !== 'Production') {
          out.usageError = `--env must be Test or Production (got "${v}")`;
        } else {
          out.submissionEnvironment = v;
        }
        break;
      }
      case '--report-type': {
        const v = read(a);
        if (v !== 'Postmarket' && v !== 'Premarket') {
          out.usageError = `--report-type must be Postmarket or Premarket (got "${v}")`;
        } else {
          out.submissionReportType = v;
        }
        break;
      }
      case '--center': {
        const v = read(a);
        if (v !== 'CDER' && v !== 'CBER') {
          out.usageError = `--center must be CDER or CBER (got "${v}")`;
        } else {
          out.targetCenter = v;
        }
        break;
      }
      case '--report':
        out.report = true;
        break;
      case '--no-gate':
        out.noGate = true;
        break;
      case '--strict':
        out.strict = true;
        break;
      case '--quiet':
      case '-q':
        out.quiet = true;
        break;
      case '--allow-duplicate':
        out.allowDuplicate = true;
        break;
      case '--skip-ind-enrollment':
        out.skipIndEnrollment = true;
        break;
      case '--record-ack': {
        const uuid = read(a);
        if (!uuid) break;
        out.recordAck = { batchUuid: uuid, ackId: '', outcome: 'CA' };
        break;
      }
      case '--ack-id': {
        const id = read(a);
        if (!id) break;
        if (!out.recordAck) out.recordAck = { batchUuid: '', ackId: id, outcome: 'CA' };
        else out.recordAck.ackId = id;
        break;
      }
      case '--outcome': {
        const v = read(a);
        if (!v) break;
        if (!isValidOutcome(v)) {
          out.usageError = `--outcome must be one of ${VALID_OUTCOMES.join(', ')} (got "${v}")`;
        } else if (!out.recordAck) {
          out.recordAck = { batchUuid: '', ackId: '', outcome: v };
        } else {
          out.recordAck.outcome = v;
        }
        break;
      }
      default:
        if (a.startsWith('-')) {
          out.usageError = `Unknown flag: ${a}`;
        } else {
          out.inputs.push(a);
        }
    }
    i++;
  }
  // Subcommand sanity: --record-ack requires both --ack-id and --outcome.
  if (out.recordAck && !out.usageError) {
    if (!out.recordAck.batchUuid) {
      out.usageError = '--record-ack requires a batch UUID';
    } else if (!out.recordAck.ackId) {
      out.usageError = '--record-ack requires --ack-id <id>';
    }
    // Outcome defaults to 'CA' when --outcome is omitted; that's permissive
    // by design for the common "I just got a CA+AE" workflow — the operator
    // can pass --outcome explicitly if they want a different value.
  }
  return out;
}

export const HELP_TEXT = `
faers-headless — generate FAERS E2B(R3) XML from JSON case files

USAGE
  npm run headless -- [options] <input.json> [<input2.json> ...]

OPTIONS
  -o, --out-dir <dir>     Where to write XML files (default: alongside input)
      --db <path>         SQLite file to use (default: ephemeral file in temp)
      --keep-db           Keep the ephemeral DB after run (ignored with --db)
      --duns <value>      Sender DUNS (default: 334818134)
      --env <env>         Test | Production (default: Test)
      --report-type <t>   Postmarket | Premarket. Omit to auto-select
                          per file from JSON case.caseType — "ind" maps
                          to Premarket, everything else to Postmarket.
                          An explicit flag wins; a flag mismatched with
                          the file's caseType prints a warning but is
                          still used.
      --center <c>        CDER | CBER (default: CDER)
      --report            Also emit <base>.report.json for each input
      --no-gate           Emit XML even when lint/5-pass report errors
      --strict            Stop at the first failing input
      --allow-duplicate   Skip the duplicate batch UUID guard (testing only)
      --skip-ind-enrollment
                          Skip the IND enrollment pre-flight (offline only).
                          Normal IND/BA-BE runs require env var
                          IND_ENROLLMENT_CONFIRMED=true; without it the
                          generator refuses with the AEMSESUB@fda.hhs.gov
                          enrollment instructions (GAP-SUB-003).
  -q, --quiet             Suppress per-stage log lines
  -h, --help              Show this help

SUBCOMMANDS
  --record-ack <uuid> --ack-id <ackId> --outcome <CA|CR|AE|AR|CA+AE|CR+AR>
        Update the submission log entry for <uuid> with the FDA ACK
        outcome. Run after the operator submits via the ESG portal and
        receives an ACK3. Mutually exclusive with input file arguments.
        --outcome defaults to 'CA' when omitted.

ENVIRONMENT VARIABLES
  IND_ENROLLMENT_CONFIRMED
        Must equal 'true' before IND/BA-BE cases will generate.
        Resolves the ISSUE-004 portal decline (email AEMSESUB@fda.hhs.gov
        to confirm enrollment). Use --skip-ind-enrollment to bypass.
  FAERS_SUBMISSION_LOG
        Override the default submission-log.json path
        (default: <userData>/submission-log.json or
        ~/.faers-headless/submission-log.json).

EXIT CODES
  0   all inputs succeeded all gates
  1   at least one input failed
  2   CLI usage error
`;

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  if (parsed.usageError) {
    console.error(`Error: ${parsed.usageError}`);
    console.error(HELP_TEXT);
    process.exit(2);
  }

  // ── Subcommand: --record-ack (no DB, no XML generation) ────────────────
  if (parsed.recordAck) {
    if (parsed.inputs.length > 0) {
      console.error('Error: --record-ack does not accept input files.');
      process.exit(2);
    }
    const ok = updateAckOutcome(
      parsed.recordAck.batchUuid,
      parsed.recordAck.ackId,
      parsed.recordAck.outcome
    );
    if (!ok) {
      console.error(`Error: no submission log entry for batch UUID ${parsed.recordAck.batchUuid}`);
      console.error(`Log path: ${resolveLogPath()}`);
      process.exit(1);
    }
    console.log(`Recorded ACK ${parsed.recordAck.ackId} (${parsed.recordAck.outcome}) on batch ${parsed.recordAck.batchUuid}`);
    process.exit(0);
  }

  if (parsed.inputs.length === 0) {
    console.error('Error: provide at least one input JSON file.');
    console.error(HELP_TEXT);
    process.exit(2);
  }

  // Guard: make sure each input exists and is a file before we init the DB.
  for (const p of parsed.inputs) {
    const abs = isAbsolute(p) ? p : resolvePath(process.cwd(), p);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      console.error(`Error: input not found or not a file: ${abs}`);
      process.exit(2);
    }
  }

  const result = await runHeadless(parsed);
  process.exit(result.exitCode);
}

// Run only when this file is the script entry (not when imported by tests).
// Under ELECTRON_RUN_AS_NODE, process.argv[1] is the built out/main/headless.js.
const entryBasename = basename(process.argv[1] ?? '');
if (entryBasename === 'headless.js' || entryBasename === 'cli.ts' || entryBasename === 'cli.js') {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

// Silence unused-import warnings from tooling — these are surfaced as public
// API types from this module's consumers.
export type { LintResult, FivePassResult, CaseImportResult };

// Also re-read input as JSON when a test wants a preview — convenience.
export function readJsonPreview(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}
