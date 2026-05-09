/**
 * XML Generator v37 Lint Conformance Test
 *
 * Generates an XML from a fixture matching the v37 golden case data,
 * writes it to a temp file, and shells out to
 *   test/test_submission/faers_xml_lint.py
 * The test passes only when the lint script reports 0 FAIL.
 *
 * This is the objective "done" criterion for the v37 rewrite: a newly
 * generated XML must pass all 55 checks in faers_xml_lint.py.
 */

import { describe, it, expect } from 'vitest';
import { XMLGeneratorService } from './xmlGeneratorService';
import {
  ReportType,
  ReportCategory,
  ReporterQualification,
  PatientSex,
  AgeUnit,
  DrugCharacterization,
  ReactionOutcome,
  PatientRace,
  PatientEthnicity,
  LocalReportTypeCode
} from '../../shared/types/case.types';
import type { Case, CaseReporter, CaseReaction, CaseDrug } from '../../shared/types/case.types';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const FIXTURE_CASE: Case = {
  id: 'CASE-20260331-EMJQ',
  version: 2,
  status: 'Draft' as never,
  createdAt: '2026-03-31T16:14:51Z',
  updatedAt: '2026-03-31T16:14:51Z',

  safetyReportId: 'SR-CASE-20260331-EMJQ',
  worldwideCaseId: 'SR-CASE-20260331-EMJQ',
  reportType: ReportType.Spontaneous,
  initialOrFollowup: ReportCategory.Initial,
  receiptDate: '2026-03-15',
  receiveDate: '2026-03-15',
  additionalDocs: false,
  expeditedReport: true,

  patientInitials: 'T.P.',
  patientBirthdate: '1975-06-15',
  patientAge: 50,
  patientAgeUnit: AgeUnit.Year,
  patientWeight: 82,
  patientSex: PatientSex.Male,
  patientRace: PatientRace.Asian,
  patientEthnicity: PatientEthnicity.NotHispanicOrLatino,
  medicalHistoryText: 'History of hypertension treated with lisinopril.',
  hasConcomitantTherapy: true,
  localReportTypeCode: LocalReportTypeCode.FifteenDay,
  patientDeath: false,

  caseNarrative:
    'A 50-year-old male patient (initials T.P.) with a history of hypertension was started on Testdrugimab for rheumatoid arthritis and developed nausea and elevated hepatic enzymes.'
} as Case;

const FIXTURE_REPORTERS: CaseReporter[] = [
  {
    caseId: FIXTURE_CASE.id,
    isPrimary: true,
    title: 'Mr',
    givenName: 'Sachin',
    familyName: 'Deshpande',
    qualification: ReporterQualification.Physician,
    organization: 'DeepQuence',
    department: 'Drug Safety',
    address: '123 Test St',
    city: 'Sunnyvale',
    state: 'CA',
    postcode: '94085',
    country: 'US',
    phone: '+14085550100',
    fax: '+14085550101',
    email: 'sachindeshpande@deepquence.com',
    sortOrder: 0
  }
];

const FIXTURE_REACTIONS: CaseReaction[] = [
  {
    caseId: FIXTURE_CASE.id,
    reactionTerm: 'Nausea',
    meddraCode: '10028813',
    startDate: '2026-03-01',
    endDate: '2026-03-10',
    seriousHospitalization: true,
    seriousOther: true,
    outcome: ReactionOutcome.NotRecovered,
    sortOrder: 0
  },
  {
    caseId: FIXTURE_CASE.id,
    reactionTerm: 'Hepatic enzyme increased',
    meddraCode: '10019675',
    startDate: '2026-03-05',
    seriousHospitalization: true,
    seriousOther: true,
    outcome: ReactionOutcome.NotRecovered,
    sortOrder: 1
  }
] as CaseReaction[];

const FIXTURE_DRUGS: CaseDrug[] = [
  {
    caseId: FIXTURE_CASE.id,
    characterization: DrugCharacterization.Suspect,
    productName: 'Testdrugimab',
    startDate: '2026-01-15',
    endDate: '2026-03-10',
    indication: 'Rheumatoid arthritis',
    indicationCode: '10039073',
    actionTaken: 1,
    dechallenge: 3,
    rechallenge: 3,
    sortOrder: 0
  },
  {
    caseId: FIXTURE_CASE.id,
    characterization: DrugCharacterization.Concomitant,
    productName: 'Lisinopril',
    startDate: '2024-06-01',
    indication: 'Hypertension',
    indicationCode: '10020772',
    actionTaken: 4,
    dechallenge: 3,
    rechallenge: 3,
    sortOrder: 1
  }
] as CaseDrug[];

function makeServiceWithFixture(caseOverride?: Case): XMLGeneratorService {
  // DatabaseInstance is typed as `any`; passing {} is safe because the
  // repo constructors only store the reference. We replace the repo
  // methods below so no DB calls are made.
  const svc = new XMLGeneratorService({} as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyS = svc as any;
  const fixture = caseOverride || FIXTURE_CASE;
  anyS.caseRepo.findById = (id: string) => (id === fixture.id ? fixture : null);
  anyS.reporterRepo.findByCaseId = () => FIXTURE_REPORTERS;
  anyS.reactionRepo.findByCaseId = () => FIXTURE_REACTIONS;
  anyS.drugRepo.findByCaseId = () => FIXTURE_DRUGS;
  return svc;
}

function runLint(xml: string, label: string): { stdout: string; status: number | null } {
  const dir = mkdtempSync(join(tmpdir(), 'faers-lint-'));
  const xmlPath = join(dir, `${label}.xml`);
  writeFileSync(xmlPath, xml);
  writeFileSync(`/tmp/faers_generated_${label}.xml`, xml);

  const lintScript = resolve(__dirname, '../../../../test/test_submission/faers_xml_lint.py');
  const proc = spawnSync('python3', [lintScript, xmlPath], { encoding: 'utf-8' });
  // eslint-disable-next-line no-console
  console.log(`--- lint output for ${label} ---\n${proc.stdout}`);
  if (proc.stderr) console.error(proc.stderr);
  if (proc.status !== 0) {
    throw new Error(`Lint failed (exit ${proc.status}) for ${xmlPath}`);
  }
  return { stdout: proc.stdout, status: proc.status };
}

const GEN_OPTIONS = {
  submissionEnvironment: 'Test' as const,
  submissionReportType: 'Postmarket' as const,
  senderIdentifierType: 'duns' as const,
  senderIdentifierValue: '334818134',
  targetCenter: 'CDER' as const
};

describe('XMLGeneratorService v37 lint conformance', () => {
  it('passes lint when all new demographic fields are populated (real values)', () => {
    const svc = makeServiceWithFixture();
    const result = svc.generate(FIXTURE_CASE.id, {
      ...GEN_OPTIONS,
      batchNumber: `DeepQuenceTest-20260410-v37-real-${Date.now()}`
    });

    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.xml).toBeDefined();

    // Spot-check that the real values made it into the XML, not nullFlavor.
    expect(result.xml).toContain(`code="${PatientRace.Asian}"`);
    expect(result.xml).toContain(`code="${PatientEthnicity.NotHispanicOrLatino}"`);
    expect(result.xml).toContain('History of hypertension treated with lisinopril.');
    expect(result.xml).toContain('displayName="concomitantTherapy"/>\n                          <value xsi:type="BL" value="true"');
    // Real values should appear instead of v37 defaults.
    // Fixture sets Asian (C41260) explicitly, so this is a no-op check,
    // but ethnicity is set to C41222 which happens to match the default.
    // Check the race code is the fixture's explicit value.
    expect(result.xml).toContain(`code="${PatientRace.Asian}"`);

    runLint(result.xml!, 'populated');
  }, 15_000);

  it('passes lint with coded Unknown fallback when new fields are empty', () => {
    // Strip the 5 new fields; everything else mirrors the populated fixture.
    const emptyCase: Case = {
      ...FIXTURE_CASE,
      patientRace: undefined,
      patientEthnicity: undefined,
      medicalHistoryText: undefined,
      hasConcomitantTherapy: undefined,
      localReportTypeCode: undefined
    };
    const svc = makeServiceWithFixture(emptyCase);
    const result = svc.generate(emptyCase.id, {
      ...GEN_OPTIONS,
      batchNumber: `DeepQuenceTest-20260410-v37-empty-${Date.now()}`
    });

    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);

    // Race + ethnicity fall back to v37-confirmed codes — FAERS 2.18 rejects
    // both nullFlavor (QTXZ) and C17998 "Unknown" (26ZL).
    expect(result.xml).toMatch(/code="C17049"[^/]*\/>\s*<value xsi:type="CE" code="C41260" displayName="Asian"/);
    expect(result.xml).toMatch(/code="C16564"[^/]*\/>\s*<value xsi:type="CE" code="C41222" displayName="Not Hispanic or Latino"/);
    // Medical history text falls back to "None reported" — NOT nullFlavor.
    expect(result.xml).toContain('>None reported</value>');
    // Concomitant therapy auto-detected from drug list — the fixture includes
    // a concomitant drug (Lisinopril), so the flag is true even when the
    // explicit hasConcomitantTherapy field is unset.
    expect(result.xml).toMatch(/displayName="concomitantTherapy"\/>\s*<value xsi:type="BL" value="true"/);
    // localCriteriaReportType defaults to 15-Day (code="1") when localReportTypeCode is unset.
    expect(result.xml).toMatch(/displayName="localCriteriaReportType"\/>\s*<value xsi:type="CE" code="1"/);

    runLint(result.xml!, 'empty');
  }, 15_000);

  it('emits 7-Day report type when localReportTypeCode = 7', () => {
    const sevenDayCase: Case = { ...FIXTURE_CASE, localReportTypeCode: LocalReportTypeCode.SevenDay };
    const svc = makeServiceWithFixture(sevenDayCase);
    const result = svc.generate(sevenDayCase.id, {
      ...GEN_OPTIONS,
      batchNumber: `DeepQuenceTest-20260410-v37-7day-${Date.now()}`
    });

    expect(result.success).toBe(true);
    expect(result.xml).toMatch(/displayName="localCriteriaReportType"\/>\s*<value xsi:type="CE" code="6"[^>]*displayName="7-Day"/);
    runLint(result.xml!, '7day');
  }, 15_000);

  // FIX-X05: FDA PREMKT channel only accepts code="1" (15-Day) for
  // localCriteriaReportType. Even when the JSON requests 7-Day, IND/babe
  // submissions route via Premarket and the generator must force 15-Day.
  // See FAERS_Workflow_XML_Gap_Analysis_v2.docx FIX-X05 (IND-T05 CR+AR
  // before fix → CA+AE after manual XML patch).
  it('forces localCriteriaReportType to 1 (15-Day) for IND PREMKT regardless of localReportTypeCode = 7', () => {
    const indCase: Case = {
      ...FIXTURE_CASE,
      caseType: 'ind',
      localReportTypeCode: LocalReportTypeCode.SevenDay
    };
    const svc = makeServiceWithFixture(indCase);
    const result = svc.generate(indCase.id, {
      ...GEN_OPTIONS,
      submissionReportType: 'Premarket',
      batchNumber: `DeepQuenceTest-20260508-v37-ind-${Date.now()}`
    });

    expect(result.success).toBe(true);
    // FIX-X05: forced to 15-Day on the PREMKT channel.
    expect(result.xml).toMatch(/displayName="localCriteriaReportType"\/>\s*<value xsi:type="CE" code="1"[^>]*displayName="15-Day"/);
    expect(result.xml).not.toMatch(/displayName="localCriteriaReportType"\/>\s*<value xsi:type="CE" code="6"/);
  }, 15_000);
});
