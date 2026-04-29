/**
 * Unit tests for submissionLogService — GAP-SUB-002.
 *
 * Uses the FAERS_SUBMISSION_LOG env var override to point each test at a
 * unique tmp file, so tests are isolated and don't touch the operator's
 * real submission log.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  hasBeenSubmitted,
  readLog,
  recordSubmission,
  resolveLogPath,
  updateAckOutcome
} from './submissionLogService';

let workDir = '';
let prevEnv: string | undefined;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'faers-sub-log-'));
  prevEnv = process.env.FAERS_SUBMISSION_LOG;
  process.env.FAERS_SUBMISSION_LOG = join(workDir, 'submission-log.json');
});

afterEach(() => {
  if (prevEnv === undefined) delete process.env.FAERS_SUBMISSION_LOG;
  else process.env.FAERS_SUBMISSION_LOG = prevEnv;
  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

const baseRecord = {
  batchUuid: 'DeepQuenceTest-20260429-abc-def-001',
  caseId: 'CASE-20260429-AAAA',
  channel: 'ZZFDATST_PREMKT',
  msgReceiver: 'CDER_IND',
  outputPath: '/tmp/IND-T01-baseline.xml',
  timestamp: '2026-04-29T12:00:00.000Z'
};

describe('submissionLogService.resolveLogPath', () => {
  it('honors FAERS_SUBMISSION_LOG env var when set', () => {
    expect(resolveLogPath()).toBe(process.env.FAERS_SUBMISSION_LOG);
  });

  it('falls back to a userData or homedir path when the env var is unset', () => {
    delete process.env.FAERS_SUBMISSION_LOG;
    const path = resolveLogPath();
    // Test setup mocks electron.app.getPath('userData'); in headless
    // contexts the resolver falls back to ~/.faers-headless. Either is
    // valid — what matters is the leaf filename.
    expect(path.endsWith('submission-log.json')).toBe(true);
    expect(path).not.toBe('');
  });
});

describe('submissionLogService.readLog', () => {
  it('returns [] when the file does not exist', () => {
    expect(readLog()).toEqual([]);
  });

  it('returns [] when the file is empty', () => {
    // recordSubmission then manually empty the file
    recordSubmission(baseRecord);
    expect(readLog().length).toBe(1);
    // Now overwrite with empty content to confirm tolerance
    const fs = require('node:fs');
    fs.writeFileSync(process.env.FAERS_SUBMISSION_LOG!, '', 'utf-8');
    expect(readLog()).toEqual([]);
  });

  it('returns [] when the file is corrupt JSON', () => {
    const fs = require('node:fs');
    fs.mkdirSync(workDir, { recursive: true });
    fs.writeFileSync(process.env.FAERS_SUBMISSION_LOG!, 'not json {{{', 'utf-8');
    expect(readLog()).toEqual([]);
  });
});

describe('submissionLogService.recordSubmission + hasBeenSubmitted', () => {
  it('persists a record and finds it on a subsequent call', () => {
    expect(hasBeenSubmitted(baseRecord.batchUuid)).toBe(false);
    recordSubmission(baseRecord);
    expect(hasBeenSubmitted(baseRecord.batchUuid)).toBe(true);
    expect(readLog()).toEqual([baseRecord]);
  });

  it('persists across multiple recordSubmission calls in different processes (file-based)', () => {
    // Simulate "process 1": write
    recordSubmission(baseRecord);
    // Simulate "process 2": read fresh from disk
    const fresh = readLog();
    expect(fresh).toHaveLength(1);
    expect(fresh[0].batchUuid).toBe(baseRecord.batchUuid);
    // The file actually exists on disk
    expect(existsSync(resolveLogPath())).toBe(true);
  });

  it('is idempotent when the same batch UUID is recorded twice', () => {
    recordSubmission(baseRecord);
    recordSubmission({ ...baseRecord, outputPath: '/tmp/different.xml' });
    const log = readLog();
    expect(log).toHaveLength(1);
    // The second write merged onto the first — outputPath is the new value
    expect(log[0].outputPath).toBe('/tmp/different.xml');
    // And caseId stays the same (no field lost)
    expect(log[0].caseId).toBe(baseRecord.caseId);
  });

  it('records distinct UUIDs as separate entries', () => {
    recordSubmission(baseRecord);
    recordSubmission({ ...baseRecord, batchUuid: 'second-uuid' });
    const log = readLog();
    expect(log).toHaveLength(2);
    expect(hasBeenSubmitted('second-uuid')).toBe(true);
  });

  it('hasBeenSubmitted returns false for empty/unknown UUIDs', () => {
    recordSubmission(baseRecord);
    expect(hasBeenSubmitted('')).toBe(false);
    expect(hasBeenSubmitted('unrelated')).toBe(false);
  });
});

describe('submissionLogService.updateAckOutcome', () => {
  it('returns false when no matching record exists', () => {
    expect(updateAckOutcome('nonexistent', 'ci260429052038', 'CA+AE')).toBe(false);
    expect(readLog()).toEqual([]);
  });

  it('attaches outcome + ackId to an existing record', () => {
    recordSubmission(baseRecord);
    const ok = updateAckOutcome(baseRecord.batchUuid, 'ci260429052038', 'CA+AE');
    expect(ok).toBe(true);
    const log = readLog();
    expect(log[0].ackId).toBe('ci260429052038');
    expect(log[0].outcome).toBe('CA+AE');
    // The original fields are still intact
    expect(log[0].caseId).toBe(baseRecord.caseId);
    expect(log[0].channel).toBe(baseRecord.channel);
  });

  it('overwrites a prior outcome on a second call', () => {
    recordSubmission(baseRecord);
    updateAckOutcome(baseRecord.batchUuid, 'ack-1', 'CA');
    updateAckOutcome(baseRecord.batchUuid, 'ack-2', 'CR+AR');
    const log = readLog();
    expect(log[0].ackId).toBe('ack-2');
    expect(log[0].outcome).toBe('CR+AR');
  });
});
