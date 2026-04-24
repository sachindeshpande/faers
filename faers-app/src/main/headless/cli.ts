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
  const submissionReportType = opts.submissionReportType || 'Postmarket';
  const targetCenter = opts.targetCenter || 'CDER';

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
      submissionReportType,
      targetCenter,
      report: opts.report,
      noGate: opts.noGate,
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
//  Per-file pipeline
// ────────────────────────────────────────────────────────────────────────────

interface ProcessArgs {
  input: string;
  outDir?: string;
  duns: string;
  submissionEnvironment: SubmissionEnvironment;
  submissionReportType: SubmissionReportType;
  targetCenter: TargetCenter;
  report?: boolean;
  noGate?: boolean;
  log: (msg: string) => void;
  importSvc: CaseImportService;
  xmlSvc: XMLGeneratorService;
  statusSvc: StatusTransitionService;
  caseRepo: CaseRepository;
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

  // ── Stage 3: generate XML ─────────────────────────────────────────────
  const xmlRes = args.xmlSvc.generate(importRes.caseId, {
    submissionEnvironment: args.submissionEnvironment,
    submissionReportType: args.submissionReportType,
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

  // ── Stage 6: 55-check lint ────────────────────────────────────────────
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

  // ── Stage 7: 5-pass empirical validator ───────────────────────────────
  try {
    const fivePass = runFivePassValidation(xmlRes.xml);
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
    submissionReportType: args.submissionReportType
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
      default:
        if (a.startsWith('-')) {
          out.usageError = `Unknown flag: ${a}`;
        } else {
          out.inputs.push(a);
        }
    }
    i++;
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
      --report-type <t>   Postmarket | Premarket (default: Postmarket)
      --center <c>        CDER | CBER (default: CDER)
      --report            Also emit <base>.report.json for each input
      --no-gate           Emit XML even when lint/5-pass report errors
      --strict            Stop at the first failing input
  -q, --quiet             Suppress per-stage log lines
  -h, --help              Show this help

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
