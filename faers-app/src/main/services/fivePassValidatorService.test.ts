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

describe('Pass 3 — IND structural checks', () => {
  // Minimal IND-shaped XML fragment sufficient to exercise the three
  // structural checks. Intentionally terse — we feed snippets, not full
  // MCCI envelopes, because runPass3 doesn't care about the outer wrapper.
  // Passes 1/4/5 are skipped for IND so the v37 golden isn't relevant.
  function indXml(opts: {
    c13?: string | null;           // C.1.3 report type value code
    c54?: string | null;           // C.5.4 study type code
    fdaAddDrug?: Array<{ code?: string; nullFlavor?: string }>;
  } = {}): string {
    const c13 = opts.c13 === undefined ? '2' : opts.c13;
    const c54 = opts.c54 === undefined ? '1' : opts.c54;
    const c13Block = c13 === null
      ? ''
      : `<subjectOf2><investigationCharacteristic><code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.23"/><value xsi:type="CE" code="${c13}" codeSystem="2.16.840.1.113883.3.989.2.1.1.2"/></investigationCharacteristic></subjectOf2>`;
    const researchStudy = c54 === null
      ? ''
      : `<researchStudy classCode="CLNTRL" moodCode="EVN"><code code="${c54}" codeSystem="2.16.840.1.113883.3.989.2.1.1.8"/></researchStudy>`;
    const fdaAddObservations = (opts.fdaAddDrug ?? [])
      .map((d) => {
        const valAttrs = d.nullFlavor
          ? `nullFlavor="${d.nullFlavor}"`
          : `code="${d.code ?? ''}"`;
        return `<observation><code code="9" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="FDAAddDrugInformation"/><value xsi:type="CE" ${valAttrs} codeSystem="2.16.840.1.113883.3.989.2.1.1.7"/></observation>`;
      })
      .join('');
    return `<?xml version="1.0"?><root>${c13Block}${researchStudy}${fdaAddObservations}</root>`;
  }

  it('passes cleanly on a correctly-shaped IND XML', () => {
    const r = runFivePassValidation(indXml(), { caseType: 'ind', v37Path: null });
    const p3Errors = r.findings.filter((f) => f.pass === 3 && f.severity === 'error');
    expect(p3Errors).toEqual([]);
  });

  it('flags C.1.3 = "1" in an IND case', () => {
    const r = runFivePassValidation(indXml({ c13: '1' }), { caseType: 'ind', v37Path: null });
    const errs = r.findings.filter((f) => f.pass === 3 && f.severity === 'error');
    expect(errs.some((e) => e.label.includes('C.1.3 must be code="2"'))).toBe(true);
  });

  it('flags a missing researchStudy block', () => {
    const r = runFivePassValidation(indXml({ c54: null }), { caseType: 'ind', v37Path: null });
    const errs = r.findings.filter((f) => f.pass === 3 && f.severity === 'error');
    expect(errs.some((e) => e.label.includes('missing <researchStudy>'))).toBe(true);
  });

  it('flags a researchStudy with wrong C.5.4 code', () => {
    const r = runFivePassValidation(indXml({ c54: '2' }), { caseType: 'ind', v37Path: null });
    const errs = r.findings.filter((f) => f.pass === 3 && f.severity === 'error');
    expect(errs.some((e) => e.label.includes('C.5.4 must be code="1"'))).toBe(true);
  });

  it('flags an invalid G.k.10a.r code', () => {
    const r = runFivePassValidation(
      indXml({ fdaAddDrug: [{ code: '99' }] }),
      { caseType: 'ind', v37Path: null }
    );
    const errs = r.findings.filter((f) => f.pass === 3 && f.severity === 'error');
    expect(errs.some((e) => e.label.includes('G.k.10a.r'))).toBe(true);
  });

  it('accepts nullFlavor="NA" on G.k.10a.r', () => {
    const r = runFivePassValidation(
      indXml({ fdaAddDrug: [{ nullFlavor: 'NA' }] }),
      { caseType: 'ind', v37Path: null }
    );
    const errs = r.findings.filter((f) => f.pass === 3 && f.severity === 'error');
    expect(errs.filter((e) => e.label.includes('G.k.10a.r'))).toEqual([]);
  });

  it('does not run IND checks on postmarket cases', () => {
    // Feed an IND-shaped XML but declare caseType='postmarket' — the
    // IND structural checks should all be silent.
    const r = runFivePassValidation(indXml({ c13: '1', c54: '2' }), {
      caseType: 'postmarket',
      v37Path: null
    });
    const indErrs = r.findings.filter(
      (f) => f.pass === 3 && f.severity === 'error' && f.label.startsWith('IND:')
    );
    expect(indErrs).toEqual([]);
  });
});

describe('Pass 3 — D.9.1/D.9.3 fatal co-dependency (GAP-IND-004 / GAP-XML-001)', () => {
  // ISSUE-005 (closed): IND-T05 ACK ci260428001004 returned CR+AR with
  // "Date of Death D.9.1 has a value, the element Was Autopsy Done? D.9.3
  // must contain a value." This regression test locks in the validator
  // rule that was added in GAP-IND-004.
  //
  // Minimal IND fragment with a fatal reaction (resultsInDeath=34
  // observation with value="true"). The structural checks fire only when
  // a fatal observation is present.
  function fatalIndXml(opts: {
    deceasedTime?: boolean;
    autopsy?: boolean;
  } = {}): string {
    const deceased = opts.deceasedTime
      ? '<deceasedTime value="20260312"/>'
      : '';
    const autopsy = opts.autopsy
      ? '<subjectOf2><observation><code code="5" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="autopsy"/><value xsi:type="BL" value="false"/></observation></subjectOf2>'
      : '';
    return `<?xml version="1.0"?>
<root>
  <subjectOf2><investigationCharacteristic><code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.23"/><value xsi:type="CE" code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.2"/></investigationCharacteristic></subjectOf2>
  <researchStudy classCode="CLNTRL" moodCode="EVN"><code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.8"/></researchStudy>
  <subject1>
    <primaryRole>
      <player1 classCode="PSN" determinerCode="INSTANCE">${deceased}</player1>
      <subjectOf2>
        <observation>
          <code code="34" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="resultsInDeath"/>
          <value xsi:type="BL" value="true"/>
        </observation>
      </subjectOf2>
      ${autopsy}
    </primaryRole>
  </subject1>
</root>`;
  }

  it('flags a fatal IND case missing <deceasedTime> on player1 (D.9.1)', () => {
    const r = runFivePassValidation(fatalIndXml({ deceasedTime: false, autopsy: true }), {
      caseType: 'ind',
      v37Path: null
    });
    const errs = r.findings.filter((f) => f.pass === 3 && f.severity === 'error');
    expect(errs.some((e) => e.label.includes('deceasedTime'))).toBe(true);
  });

  it('flags a fatal IND case missing the autopsy observation (D.9.3)', () => {
    const r = runFivePassValidation(fatalIndXml({ deceasedTime: true, autopsy: false }), {
      caseType: 'ind',
      v37Path: null
    });
    const errs = r.findings.filter((f) => f.pass === 3 && f.severity === 'error');
    expect(errs.some((e) => e.label.includes('autopsy'))).toBe(true);
  });

  it('passes when both <deceasedTime> and the autopsy observation are present', () => {
    const r = runFivePassValidation(fatalIndXml({ deceasedTime: true, autopsy: true }), {
      caseType: 'ind',
      v37Path: null
    });
    const fatalErrs = r.findings.filter(
      (f) =>
        f.pass === 3 &&
        f.severity === 'error' &&
        (f.label.includes('deceasedTime') || f.label.includes('autopsy'))
    );
    expect(fatalErrs).toEqual([]);
  });

  it('does not require deceasedTime/autopsy when no fatal observation is present', () => {
    // Strip the resultsInDeath block — the rule should be silent.
    const xml = fatalIndXml({ deceasedTime: false, autopsy: false }).replace(
      /<observation>\s*<code code="34"[\s\S]*?<\/observation>/,
      ''
    );
    const r = runFivePassValidation(xml, { caseType: 'ind', v37Path: null });
    const fatalErrs = r.findings.filter(
      (f) =>
        f.pass === 3 &&
        f.severity === 'error' &&
        (f.label.includes('deceasedTime') || f.label.includes('autopsy'))
    );
    expect(fatalErrs).toEqual([]);
  });
});
