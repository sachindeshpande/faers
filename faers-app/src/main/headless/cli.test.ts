/**
 * Unit tests for the headless CLI argument parser and the top-level runner.
 *
 * The full end-to-end runner exercises SQLite + XML generation and needs
 * better-sqlite3 native bindings, so it lives in a separate *.integration
 * test that runs under `test:integration`. These tests stay in the fast
 * vitest suite and only cover parseArgs + the guard paths (empty inputs,
 * usage errors, missing files).
 */

import { describe, it, expect } from 'vitest';
import { parseArgs, runHeadless, resolveSubmissionReportType } from './cli';

describe('parseArgs', () => {
  it('parses positional input file paths', () => {
    const r = parseArgs(['a.json', 'b.json']);
    expect(r.inputs).toEqual(['a.json', 'b.json']);
    expect(r.usageError).toBeUndefined();
  });

  it('parses --out-dir and its short form', () => {
    const r1 = parseArgs(['--out-dir', '/tmp/out', 'x.json']);
    expect(r1.outDir).toBe('/tmp/out');
    const r2 = parseArgs(['-o', '/tmp/out', 'x.json']);
    expect(r2.outDir).toBe('/tmp/out');
  });

  it('accepts Test and Production for --env', () => {
    expect(parseArgs(['--env', 'Test']).submissionEnvironment).toBe('Test');
    expect(parseArgs(['--env', 'Production']).submissionEnvironment).toBe('Production');
  });

  it('rejects invalid --env with a usage error', () => {
    const r = parseArgs(['--env', 'staging']);
    expect(r.usageError).toMatch(/--env must be Test or Production/);
  });

  it('rejects --report-type and --center with invalid values', () => {
    expect(parseArgs(['--report-type', 'foo']).usageError).toMatch(/--report-type/);
    expect(parseArgs(['--center', 'FDA']).usageError).toMatch(/--center/);
  });

  it('captures boolean flags', () => {
    const r = parseArgs(['--report', '--no-gate', '--strict', '--quiet', '--keep-db']);
    expect(r.report).toBe(true);
    expect(r.noGate).toBe(true);
    expect(r.strict).toBe(true);
    expect(r.quiet).toBe(true);
    expect(r.keepDb).toBe(true);
  });

  it('reports unknown flags', () => {
    const r = parseArgs(['--what', 'x.json']);
    expect(r.usageError).toMatch(/Unknown flag: --what/);
  });

  it('reports missing value after a flag that needs one', () => {
    const r = parseArgs(['--duns']); // no following token
    expect(r.usageError).toMatch(/Expected value after --duns/);
  });

  it('--help toggles help', () => {
    expect(parseArgs(['-h']).help).toBe(true);
    expect(parseArgs(['--help']).help).toBe(true);
  });

  // ── GAP-SUB-002 / GAP-SUB-003 / GAP-CLI-001 flag wiring ───────────────
  it('captures --allow-duplicate and --skip-ind-enrollment booleans', () => {
    const r = parseArgs(['--allow-duplicate', '--skip-ind-enrollment', 'x.json']);
    expect(r.allowDuplicate).toBe(true);
    expect(r.skipIndEnrollment).toBe(true);
    expect(r.usageError).toBeUndefined();
  });

  it('parses the --record-ack subcommand with all required values', () => {
    const r = parseArgs([
      '--record-ack', 'DeepQuenceTest-20260429-abc-def',
      '--ack-id', 'ci260429052038',
      '--outcome', 'CA+AE'
    ]);
    expect(r.recordAck).toEqual({
      batchUuid: 'DeepQuenceTest-20260429-abc-def',
      ackId: 'ci260429052038',
      outcome: 'CA+AE'
    });
    expect(r.usageError).toBeUndefined();
  });

  it('--record-ack defaults --outcome to CA when omitted', () => {
    const r = parseArgs([
      '--record-ack', 'uuid-1',
      '--ack-id', 'ci260429052038'
    ]);
    expect(r.recordAck?.outcome).toBe('CA');
    expect(r.usageError).toBeUndefined();
  });

  it('--record-ack flags an invalid outcome', () => {
    const r = parseArgs([
      '--record-ack', 'uuid-1',
      '--ack-id', 'ci',
      '--outcome', 'PARTIAL'
    ]);
    expect(r.usageError).toMatch(/--outcome must be one of/);
  });

  it('--record-ack requires --ack-id', () => {
    const r = parseArgs(['--record-ack', 'uuid-1']);
    expect(r.usageError).toMatch(/--record-ack requires --ack-id/);
  });
});

describe('runHeadless — guard paths', () => {
  it('returns exit code 2 when no inputs are provided', async () => {
    const result = await runHeadless({ inputs: [] });
    expect(result.exitCode).toBe(2);
    expect(result.results).toEqual([]);
  });
});

describe('resolveSubmissionReportType', () => {
  it('defaults to Postmarket when no caseType and no flag', () => {
    const r = resolveSubmissionReportType(undefined, undefined);
    expect(r.value).toBe('Postmarket');
    expect(r.reason).toBe('default-postmarket');
    expect(r.warning).toBeUndefined();
  });

  it('auto-selects Premarket for an IND case when no flag is set', () => {
    const r = resolveSubmissionReportType('ind', undefined);
    expect(r.value).toBe('Premarket');
    expect(r.reason).toBe('inferred-ind');
    expect(r.warning).toBeUndefined();
  });

  it('honors an explicit --report-type Premarket flag', () => {
    const r = resolveSubmissionReportType('ind', 'Premarket');
    expect(r.value).toBe('Premarket');
    expect(r.reason).toBe('cli');
    expect(r.warning).toBeUndefined();
  });

  it('warns when caseType=ind but flag says Postmarket', () => {
    const r = resolveSubmissionReportType('ind', 'Postmarket');
    expect(r.value).toBe('Postmarket');
    expect(r.reason).toBe('cli');
    expect(r.warning).toMatch(/case\.caseType="ind"/);
  });

  it('warns when caseType=postmarket but flag says Premarket', () => {
    const r = resolveSubmissionReportType('postmarket', 'Premarket');
    expect(r.value).toBe('Premarket');
    expect(r.reason).toBe('cli');
    expect(r.warning).toMatch(/case\.caseType="postmarket"/);
  });

  it('does not warn when caseType is unset and flag says Premarket', () => {
    // No inference, no mismatch signal — treat undefined caseType as
    // "caller knows what they're doing."
    const r = resolveSubmissionReportType(undefined, 'Premarket');
    expect(r.value).toBe('Premarket');
    expect(r.reason).toBe('cli');
    expect(r.warning).toBeUndefined();
  });
});
