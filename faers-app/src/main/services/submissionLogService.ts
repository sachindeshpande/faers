/**
 * Submission Log Service — GAP-SUB-002 / GAP-CLI-001
 *
 * Persists a JSON-array log of every XML batch the headless CLI writes,
 * so the operator can detect duplicate batch UUIDs (FDA rejects re-uploads
 * of the same Sender + Message No combination — see ISSUE-003 in
 * `test/test_submission/ACK_Issue_Tracker.md`) and close the loop after a
 * portal submission with `--record-ack`.
 *
 * Path resolution mirrors `connection.ts:getDatabasePath`:
 *   1. `FAERS_SUBMISSION_LOG` env var (used by tests + ephemeral runs)
 *   2. `app.getPath('userData')/submission-log.json` (Electron context)
 *   3. `~/.faers-headless/submission-log.json` (headless / no Electron)
 *
 * Writes are atomic (tmp file + rename) so a crash mid-write does not
 * corrupt the log.
 */

import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export type SubmissionOutcome = 'CA' | 'CR' | 'AE' | 'AR' | 'CA+AE' | 'CR+AR';

export interface SubmissionRecord {
  /** Wrapper batch UUID — `<id root="...3.22" extension="...">`. Unique per generation. */
  batchUuid: string;
  /** Internal app case id (e.g. `CASE-20260429-XXXX`). */
  caseId: string;
  /** N.1.4 batch receiver (e.g. `ZZFDATST_PREMKT`). */
  channel: string;
  /** N.2.r.3 message receiver (e.g. `CDER_IND`). */
  msgReceiver: string;
  /** Absolute path of the XML file written. */
  outputPath: string;
  /** ISO-8601 UTC timestamp recorded at write time. */
  timestamp: string;
  /** Filled in via `updateAckOutcome` after FDA returns an ACK3. */
  outcome?: SubmissionOutcome;
  /** FDA ACK file id (e.g. `ci260429052038`). Set together with `outcome`. */
  ackId?: string;
}

// ────────────────────────────────────────────────────────────────────────────
//  Path resolution
// ────────────────────────────────────────────────────────────────────────────

const LOG_FILENAME = 'submission-log.json';

export function resolveLogPath(): string {
  if (process.env.FAERS_SUBMISSION_LOG) return process.env.FAERS_SUBMISSION_LOG;

  // `app` is undefined under ELECTRON_RUN_AS_NODE / non-Electron contexts —
  // guard the same way fivePassValidatorService.ts does for golden lookup.
  const electronApp = app as unknown as typeof app | undefined;
  try {
    const userData = electronApp?.getPath?.('userData');
    if (userData) return join(userData, LOG_FILENAME);
  } catch {
    // app available but userData not initialised yet (e.g. early bootstrap)
  }

  return join(homedir(), '.faers-headless', LOG_FILENAME);
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ────────────────────────────────────────────────────────────────────────────
//  Read / write
// ────────────────────────────────────────────────────────────────────────────

export function readLog(): SubmissionRecord[] {
  const path = resolveLogPath();
  if (!existsSync(path)) return [];
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch {
    return [];
  }
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SubmissionRecord[]) : [];
  } catch {
    // Corrupt log — surface but don't crash; the operator can repair it
    // out-of-band. Returning [] still lets `recordSubmission` overwrite.
    return [];
  }
}

function writeLog(records: SubmissionRecord[]): void {
  const path = resolveLogPath();
  ensureDir(path);
  const tmp = join(dirname(path), `.${LOG_FILENAME}.${process.pid}.${Date.now()}.tmp`);
  // tmpdir() exists for completeness if dirname is unwritable, but normally
  // we keep the tmp file alongside the target so the rename is atomic.
  void tmpdir;
  writeFileSync(tmp, JSON.stringify(records, null, 2) + '\n', 'utf-8');
  renameSync(tmp, path);
}

// ────────────────────────────────────────────────────────────────────────────
//  Public API
// ────────────────────────────────────────────────────────────────────────────

export function hasBeenSubmitted(batchUuid: string): boolean {
  if (!batchUuid) return false;
  return readLog().some((r) => r.batchUuid === batchUuid);
}

export function recordSubmission(record: SubmissionRecord): void {
  const records = readLog();
  // Idempotent: if the same batchUuid is written twice (e.g. retry after
  // a transient write failure), update the existing row rather than
  // appending a duplicate.
  const idx = records.findIndex((r) => r.batchUuid === record.batchUuid);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...record };
  } else {
    records.push(record);
  }
  writeLog(records);
}

/**
 * Update an existing record with the FDA ACK outcome. Returns true when a
 * matching record was found and updated, false otherwise. Used by the
 * `--record-ack` subcommand of the headless CLI.
 */
export function updateAckOutcome(
  batchUuid: string,
  ackId: string,
  outcome: SubmissionOutcome
): boolean {
  const records = readLog();
  const idx = records.findIndex((r) => r.batchUuid === batchUuid);
  if (idx < 0) return false;
  records[idx] = { ...records[idx], ackId, outcome };
  writeLog(records);
  return true;
}
