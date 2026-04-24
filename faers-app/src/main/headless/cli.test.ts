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
import { parseArgs, runHeadless } from './cli';

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
});

describe('runHeadless — guard paths', () => {
  it('returns exit code 2 when no inputs are provided', async () => {
    const result = await runHeadless({ inputs: [] });
    expect(result.exitCode).toBe(2);
    expect(result.results).toEqual([]);
  });
});
