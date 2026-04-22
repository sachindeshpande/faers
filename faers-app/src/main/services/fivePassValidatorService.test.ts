/**
 * 5-Pass Validator tests — fixture-driven against the real v37 golden XML
 * and the five app-generated submissions (CF97 → 2L8T) whose ACK3 outcomes
 * are known. The validator must align its verdicts with what ZZFDATST said.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { mockApp } = vi.hoisted(() => ({
  mockApp: { isPackaged: false, getAppPath: () => process.cwd() }
}));
vi.mock('electron', () => ({ app: mockApp }));

import { runFivePassValidation, resolveGoldenV37Path } from './fivePassValidatorService';

const V37_PATH = resolve(
  __dirname,
  '../../../../test/test_submission/package/CASE-20260331-EMJQ_fixed_v37_patch.xml'
);
const FROM_APP = resolve(__dirname, '../../../../test/test_submission/from_app');

function read(p: string): string {
  return readFileSync(p, 'utf-8');
}

const V37_XML = read(V37_PATH);

describe('runFivePassValidation', () => {
  it('resolves the v37 golden reference from the test tree', () => {
    expect(resolveGoldenV37Path()).toBeTruthy();
  });

  it('accepts the v37 golden XML (self-diff has zero content divergences)', () => {
    const result = runFivePassValidation(V37_XML, { v37Xml: V37_XML });
    expect(result.ran).toBe(true);
    expect(result.pass).toBe(true);
    expect(result.passes.p1_elementDiff.errors).toBe(0);
    expect(result.passes.p3_businessRules.errors).toBe(0);
    expect(result.passes.p5_empiricalSafety.errors).toBe(0);
    expect(result.safety.proven_rejected).toBe(0);
  });

  it('accepts the 2L8T app-generated XML (no proven-rejected errors)', () => {
    const xml = read(resolve(FROM_APP, 'CASE-20260421-2L8T.xml'));
    const result = runFivePassValidation(xml, { v37Xml: V37_XML });
    expect(result.ran).toBe(true);
    expect(result.passes.p3_businessRules.errors).toBe(0);
    expect(result.safety.proven_rejected).toBe(0);
  });

  it('flags 26ZL (race=C17998 + ethnicity=C17998) as proven-rejected', () => {
    const xml = read(resolve(FROM_APP, 'CASE-20260413-26ZL.xml'));
    const result = runFivePassValidation(xml, { v37Xml: V37_XML });

    expect(result.ran).toBe(true);
    expect(result.pass).toBe(false);

    // Pass 3 should fire at least one proven-rejected error for race and/or
    // ethnicity. We don't assert exact count because the XML might also carry
    // other untested things; we just need at least one error here.
    const p3Errors = result.findings.filter((f) => f.pass === 3 && f.severity === 'error');
    expect(p3Errors.length).toBeGreaterThan(0);

    // At least one of the error messages must name C17998 (the actual rejected code).
    const mentionsC17998 = p3Errors.some((f) => (f.detail ?? '').includes('C17998'));
    expect(mentionsC17998).toBe(true);
  });

  it('flags QTXZ nullFlavor NI on race as proven-rejected', () => {
    const xml = read(resolve(FROM_APP, 'CASE-20260413-QTXZ.xml'));
    const result = runFivePassValidation(xml, { v37Xml: V37_XML });

    expect(result.ran).toBe(true);
    const p3Errors = result.findings.filter((f) => f.pass === 3 && f.severity === 'error');
    // At least one error mentioning nullFlavor="NI" proven rejection for D.7.2 or race.
    const mentionsNI = p3Errors.some(
      (f) =>
        (f.detail ?? '').includes('NI') ||
        (f.label ?? '').toLowerCase().includes('nullflavor')
    );
    expect(mentionsNI).toBe(true);
  });

  it('skips passes that need v37 when the golden path is unavailable', () => {
    const xml = read(resolve(FROM_APP, 'CASE-20260421-2L8T.xml'));
    // Force the resolver to find nothing by handing in an explicit non-path.
    const result = runFivePassValidation(xml, { v37Path: null });
    expect(result.passes.p1_elementDiff.ran).toBe(false);
    expect(result.passes.p4_valueDiff.ran).toBe(false);
    expect(result.passes.p5_empiricalSafety.ran).toBe(false);
    // Passes 2 and 3 are self-contained and still run.
    expect(result.passes.p2_ceCompleteness.ran).toBe(true);
    expect(result.passes.p3_businessRules.ran).toBe(true);
  });

  it('handles empty input cleanly', () => {
    const result = runFivePassValidation('', { v37Xml: V37_XML });
    expect(result.ran).toBe(false);
    expect(result.skipReason).toMatch(/empty/i);
  });
});
