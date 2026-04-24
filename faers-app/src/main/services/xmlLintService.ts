/**
 * E2B(R3) XML Lint Service
 *
 * Thin wrapper around `test/test_submission/faers_xml_lint.py` — the 55-check
 * lint catalogue built from the 37-version FDA debugging history. Used as a
 * pre-submission gate: any generated XML must produce 0 FAIL before the app
 * allows the user to write it to disk or ship it to FDA ESG.
 *
 * Gracefully degrades when the lint script or python3 aren't available
 * (e.g. a packaged production build that doesn't ship the test tree) — the
 * caller can distinguish "ran and passed" from "couldn't run" via the
 * `ran` / `skipReason` fields.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { app } from 'electron';

export interface LintFinding {
  label: string;
  detail: string;
}

export interface LintResult {
  /** True when the Python lint script actually ran. False when skipped. */
  ran: boolean;
  /** Reason the lint was skipped (missing script, missing python3, etc.). */
  skipReason?: string;
  /** PASS ✅, WARN ⚠️, FAIL ❌ — from the lint summary line. */
  pass: number;
  warn: number;
  fail: number;
  /** Parsed failure list — one entry per ❌ line in the FAILURES block. */
  failures: LintFinding[];
  warnings: LintFinding[];
  /** Raw stdout for debugging. */
  stdout: string;
}

/**
 * Locate the faers_xml_lint.py script. The script lives under
 * `test/test_submission/` at repo root in dev, and may be packaged into the
 * Electron resources folder in production. Returns the first candidate that
 * exists on disk, or null if none do.
 */
export function resolveLintScriptPath(): string | null {
  const candidates: string[] = [];

  // `app` is undefined when running as a standalone headless script
  // without the full Electron runtime attached (e.g. esbuild-bundled CLI
  // invoked via ELECTRON_RUN_AS_NODE). Guard each access so lookup still
  // works from process.cwd() fallbacks.
  const electronApp = (app as unknown as typeof app | undefined);

  // Production: packaged into app resources via electron-builder
  // `extraResources` mapping in package.json — `from: ../test/test_submission/
  // faers_xml_lint.py, to: lint/faers_xml_lint.py` — so the script ends up at
  // {Contents/Resources/lint on macOS, resources/lint on Windows/Linux}.
  try {
    if (electronApp?.isPackaged) {
      candidates.push(join(process.resourcesPath, 'lint', 'faers_xml_lint.py'));
      // Legacy / alternate layouts in case the build config changes.
      candidates.push(join(process.resourcesPath, 'faers_xml_lint.py'));
      candidates.push(join(process.resourcesPath, 'test', 'test_submission', 'faers_xml_lint.py'));
    }
  } catch {
    // Accessing app.isPackaged outside a full Electron context throws.
  }

  // Dev (electron-vite): app.getAppPath() is the project's `faers-app/`
  // directory; the lint script is two levels up.
  try {
    const appPath = electronApp?.getAppPath?.();
    if (appPath) {
      candidates.push(join(appPath, '..', 'test', 'test_submission', 'faers_xml_lint.py'));
      candidates.push(join(appPath, '..', '..', 'test', 'test_submission', 'faers_xml_lint.py'));
    }
  } catch {
    // app.getAppPath can throw outside an Electron context — tests etc.
  }

  // Fallback: process.cwd() (useful when vitest runs under Electron Node
  // or when the headless CLI is invoked from the repo root).
  candidates.push(join(process.cwd(), 'test', 'test_submission', 'faers_xml_lint.py'));
  candidates.push(join(process.cwd(), '..', 'test', 'test_submission', 'faers_xml_lint.py'));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const SUMMARY_LINE = /RESULT:\s*(\d+)\s*✅\s*PASS\s*\|\s*(\d+)\s*⚠️\s*WARN\s*\|\s*(\d+)\s*❌\s*FAIL/;

/**
 * Parse the stdout of faers_xml_lint.py into structured counts + findings.
 * The script prints a summary line near the end, plus optional FAILURES /
 * WARNINGS blocks. Parsing is forgiving: missing summary lines degrade to
 * zeros and the raw stdout is always preserved on the result.
 */
function parseLintOutput(stdout: string): { pass: number; warn: number; fail: number; failures: LintFinding[]; warnings: LintFinding[] } {
  let pass = 0, warn = 0, fail = 0;
  const summary = stdout.match(SUMMARY_LINE);
  if (summary) {
    pass = Number(summary[1]);
    warn = Number(summary[2]);
    fail = Number(summary[3]);
  }

  const failures: LintFinding[] = [];
  const warnings: LintFinding[] = [];
  const lines = stdout.split('\n');
  let mode: 'fail' | 'warn' | null = null;
  let current: LintFinding | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*FAILURES:/.test(line)) { mode = 'fail'; current = null; continue; }
    if (/^\s*WARNINGS:/.test(line)) { mode = 'warn'; current = null; continue; }
    if (!mode) continue;

    // A new finding starts with "❌  label" or "⚠️   label" (indented)
    const headerMatch = line.match(/^\s*(❌|⚠️)\s+(.*)$/);
    if (headerMatch) {
      if (current) (mode === 'fail' ? failures : warnings).push(current);
      current = { label: headerMatch[2].trim(), detail: '' };
      continue;
    }

    // Continuation detail line (indented under the finding)
    if (current && /^\s{6,}/.test(line)) {
      current.detail = current.detail ? `${current.detail} ${line.trim()}` : line.trim();
      continue;
    }

    // Blank or unindented line ends the finding
    if (current) {
      (mode === 'fail' ? failures : warnings).push(current);
      current = null;
    }
  }
  if (current && mode) {
    (mode === 'fail' ? failures : warnings).push(current);
  }

  return { pass, warn, fail, failures, warnings };
}

/**
 * Run the FAERS XML lint against an in-memory XML string.
 *
 * @param xml  The generated E2B(R3) XML.
 * @param opts Optional override for the lint script path (used by tests).
 */
export function lintE2bXml(xml: string, opts: { scriptPath?: string | null; pythonExe?: string } = {}): LintResult {
  const scriptPath = opts.scriptPath ?? resolveLintScriptPath();
  const pythonExe = opts.pythonExe ?? 'python3';

  const emptyResult: LintResult = {
    ran: false,
    pass: 0, warn: 0, fail: 0,
    failures: [], warnings: [],
    stdout: ''
  };

  if (!scriptPath) {
    return { ...emptyResult, skipReason: 'faers_xml_lint.py not found in any known location' };
  }
  if (!existsSync(scriptPath)) {
    return { ...emptyResult, skipReason: `faers_xml_lint.py not found at ${scriptPath}` };
  }

  // Write XML to a temp file — the script reads a path, not stdin.
  const tmpDir = mkdtempSync(join(tmpdir(), 'faers-lint-gate-'));
  const xmlPath = join(tmpDir, 'generated.xml');
  try {
    writeFileSync(xmlPath, xml, 'utf-8');

    const proc = spawnSync(pythonExe, [scriptPath, xmlPath], {
      encoding: 'utf-8',
      // 30s is more than enough for a ~500 line XML; lint typically runs in <1s.
      timeout: 30_000
    });

    // ENOENT on python3 → skip cleanly
    if (proc.error && (proc.error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...emptyResult, skipReason: `python3 executable not found: ${pythonExe}` };
    }
    if (proc.error) {
      return { ...emptyResult, skipReason: `lint script failed to spawn: ${proc.error.message}` };
    }

    const stdout = proc.stdout || '';
    const parsed = parseLintOutput(stdout);
    return { ran: true, stdout, ...parsed };
  } finally {
    try { unlinkSync(xmlPath); } catch { /* ignore */ }
    try { rmdirSync(tmpDir); } catch { /* ignore */ }
  }
}
