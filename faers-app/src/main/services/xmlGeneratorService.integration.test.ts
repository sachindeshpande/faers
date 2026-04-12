/**
 * End-to-end integration test for the 5 new patient/report fields.
 *
 * Exercises the full persistence path with a real SQLite database
 * (migration 024 applied at init time, real CaseRepository writes and reads,
 * real boolean→integer coercion in the update loop, real row→Case mapping)
 * and then runs the XMLGeneratorService against the rehydrated case to
 * confirm the new fields flow all the way through to the E2B(R3) output.
 *
 * Reporters/reactions/drugs are still stubbed so this test stays focused on
 * the fields the migration added; the lint-conformance test covers the
 * full XML structure separately.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmpUserData = mkdtempSync(join(tmpdir(), 'faers-int-userdata-'));

// Stub the 'electron' module so connection.ts (which imports `app` from
// 'electron') can be loaded in a plain Node vitest environment. We only need
// the getPath/getAppPath/isPackaged surface the module actually touches.
vi.mock('electron', () => ({
  app: {
    getPath: (key: string) => (key === 'userData' ? tmpUserData : tmpUserData),
    isPackaged: false,
    getAppPath: () => process.cwd()
  }
}));

// These imports must come *after* vi.mock so the stub is in place when
// connection.ts's top-level `import { app } from 'electron'` resolves.
import { initDatabase, closeDatabase } from '../database/connection';
import { CaseRepository } from '../database/repositories/case.repository';
import { XMLGeneratorService } from './xmlGeneratorService';
import {
  PatientRace,
  PatientEthnicity,
  LocalReportTypeCode,
  ReportType,
  ReportCategory,
  ReporterQualification,
  PatientSex,
  AgeUnit,
  DrugCharacterization,
  ReactionOutcome
} from '../../shared/types/case.types';
import type { CaseReporter, CaseReaction, CaseDrug } from '../../shared/types/case.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;
let caseRepo: CaseRepository;

beforeAll(() => {
  db = initDatabase();
  caseRepo = new CaseRepository(db);
});

afterAll(() => {
  closeDatabase();
  rmSync(tmpUserData, { recursive: true, force: true });
});

describe('Migration 024: patient demographics and local report type', () => {
  it('adds the 5 new columns to the cases table', () => {
    const columns = db
      .prepare("PRAGMA table_info(cases)")
      .all() as Array<{ name: string }>;
    const names = new Set(columns.map((c: { name: string }) => c.name));
    expect(names.has('patient_race')).toBe(true);
    expect(names.has('patient_ethnicity')).toBe(true);
    expect(names.has('medical_history_text')).toBe(true);
    expect(names.has('has_concomitant_therapy')).toBe(true);
    expect(names.has('local_report_type_code')).toBe(true);
  });

  it('records migration 024 in the migrations ledger', () => {
    const row = db
      .prepare('SELECT name FROM migrations WHERE name = ?')
      .get('024_patient_demographics_and_local_report_type') as { name: string } | undefined;
    expect(row?.name).toBe('024_patient_demographics_and_local_report_type');
  });
});

describe('CaseRepository round-trip for new fields', () => {
  it('persists and reads back all 5 new fields (populated variant)', () => {
    const created = caseRepo.create({
      reportType: ReportType.Spontaneous,
      initialOrFollowup: ReportCategory.Initial
    });
    const updated = caseRepo.update(created.id, {
      patientInitials: 'T.P.',
      patientSex: PatientSex.Male,
      patientAge: 50,
      patientAgeUnit: AgeUnit.Year,
      patientRace: PatientRace.Asian,
      patientEthnicity: PatientEthnicity.NotHispanicOrLatino,
      medicalHistoryText: 'History of hypertension treated with lisinopril.',
      hasConcomitantTherapy: true,
      localReportTypeCode: LocalReportTypeCode.SevenDay,
      receiptDate: '2026-03-15',
      expeditedReport: true
    });

    expect(updated).toBeTruthy();
    expect(updated!.patientRace).toBe(PatientRace.Asian);
    expect(updated!.patientEthnicity).toBe(PatientEthnicity.NotHispanicOrLatino);
    expect(updated!.medicalHistoryText).toBe('History of hypertension treated with lisinopril.');
    expect(updated!.hasConcomitantTherapy).toBe(true);
    expect(updated!.localReportTypeCode).toBe(LocalReportTypeCode.SevenDay);

    // Fully re-read from SQLite to confirm persistence, not just in-memory echo.
    const reloaded = caseRepo.findById(created.id);
    expect(reloaded).toBeTruthy();
    expect(reloaded!.patientRace).toBe(PatientRace.Asian);
    expect(reloaded!.patientEthnicity).toBe(PatientEthnicity.NotHispanicOrLatino);
    expect(reloaded!.medicalHistoryText).toBe('History of hypertension treated with lisinopril.');
    expect(reloaded!.hasConcomitantTherapy).toBe(true);
    expect(reloaded!.localReportTypeCode).toBe(LocalReportTypeCode.SevenDay);

    // Confirm the boolean was coerced to integer at the SQLite layer
    // (the update loop fix — better-sqlite3 cannot bind raw booleans).
    const raw = db
      .prepare('SELECT has_concomitant_therapy FROM cases WHERE id = ?')
      .get(created.id) as { has_concomitant_therapy: number };
    expect(raw.has_concomitant_therapy).toBe(1);
  });

  it('leaves the 5 new fields undefined when never set (nullFlavor path)', () => {
    const created = caseRepo.create({
      reportType: ReportType.Spontaneous,
      initialOrFollowup: ReportCategory.Initial
    });
    const reloaded = caseRepo.findById(created.id);
    expect(reloaded).toBeTruthy();
    expect(reloaded!.patientRace).toBeUndefined();
    expect(reloaded!.patientEthnicity).toBeUndefined();
    expect(reloaded!.medicalHistoryText).toBeUndefined();
    expect(reloaded!.hasConcomitantTherapy).toBeUndefined();
    expect(reloaded!.localReportTypeCode).toBeUndefined();
  });

  it('accepts setting hasConcomitantTherapy to false (not just unset)', () => {
    const created = caseRepo.create({
      reportType: ReportType.Spontaneous,
      initialOrFollowup: ReportCategory.Initial
    });
    caseRepo.update(created.id, { hasConcomitantTherapy: false });
    const reloaded = caseRepo.findById(created.id);
    expect(reloaded!.hasConcomitantTherapy).toBe(false);
  });
});

describe('XMLGeneratorService uses rehydrated Case from real DB', () => {
  const reporters: CaseReporter[] = [
    {
      caseId: '',
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

  const reactions: CaseReaction[] = [
    {
      caseId: '',
      reactionTerm: 'Nausea',
      meddraCode: '10028813',
      startDate: '2026-03-01',
      endDate: '2026-03-10',
      seriousHospitalization: true,
      seriousOther: true,
      outcome: ReactionOutcome.NotRecovered,
      sortOrder: 0
    }
  ] as CaseReaction[];

  const drugs: CaseDrug[] = [
    {
      caseId: '',
      characterization: DrugCharacterization.Suspect,
      productName: 'Testdrugimab',
      startDate: '2026-01-15',
      indication: 'Rheumatoid arthritis',
      indicationCode: '10039073',
      actionTaken: 1,
      sortOrder: 0
    }
  ] as CaseDrug[];

  function makeSvc(caseId: string): XMLGeneratorService {
    const svc = new XMLGeneratorService(db);
    // Real caseRepo/findById for the case under test; fixtures for the other
    // repos so we only have to seed the cases table.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySvc = svc as any;
    anySvc.reporterRepo.findByCaseId = () => reporters.map(r => ({ ...r, caseId }));
    anySvc.reactionRepo.findByCaseId = () => reactions.map(r => ({ ...r, caseId }));
    anySvc.drugRepo.findByCaseId = () => drugs.map(d => ({ ...d, caseId }));
    return svc;
  }

  it('emits real NCIt codes + history text + 7-Day when those fields are set in the DB', () => {
    const created = caseRepo.create({
      reportType: ReportType.Spontaneous,
      initialOrFollowup: ReportCategory.Initial
    });
    caseRepo.update(created.id, {
      patientInitials: 'T.P.',
      patientSex: PatientSex.Male,
      patientAge: 50,
      patientAgeUnit: AgeUnit.Year,
      patientRace: PatientRace.White,
      patientEthnicity: PatientEthnicity.HispanicOrLatino,
      medicalHistoryText: 'Asthma since childhood.',
      hasConcomitantTherapy: true,
      localReportTypeCode: LocalReportTypeCode.SevenDay,
      receiptDate: '2026-03-15',
      expeditedReport: true,
      caseNarrative: 'Integration-test narrative.'
    });

    const result = makeSvc(created.id).generate(created.id, {
      submissionEnvironment: 'Test',
      submissionReportType: 'Postmarket',
      senderIdentifierType: 'duns',
      senderIdentifierValue: '334818134',
      targetCenter: 'CDER',
      batchNumber: `IntTest-${Date.now()}`
    });

    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    const xml = result.xml!;

    // Race: White (C41261) made it through the round trip
    expect(xml).toContain(`<value xsi:type="CE" code="${PatientRace.White}"`);
    // Ethnicity: Hispanic or Latino (C17459)
    expect(xml).toContain(`<value xsi:type="CE" code="${PatientEthnicity.HispanicOrLatino}"`);
    // Free-text history is emitted as ED, not nullFlavor
    expect(xml).toContain('<value xsi:type="ED">Asthma since childhood.</value>');
    // Concomitant therapy = true
    expect(xml).toMatch(/displayName="concomitantTherapy"\/>\s*<value xsi:type="BL" value="true"/);
    // 7-Day report type
    expect(xml).toMatch(/displayName="localCriteriaReportType"\/>\s*<value xsi:type="CE" code="7"[^>]*displayName="7-Day"/);
    // No nullFlavor for the fields we populated
    expect(xml).not.toMatch(/code="C17049"[^/]*\/>\s*<value xsi:type="CE" nullFlavor="NI"/);
    expect(xml).not.toMatch(/code="C16564"[^/]*\/>\s*<value xsi:type="CE" nullFlavor="NI"/);
  });

  it('emits nullFlavor CE + false concomitant + 15-Day when the DB fields are unset', () => {
    const created = caseRepo.create({
      reportType: ReportType.Spontaneous,
      initialOrFollowup: ReportCategory.Initial
    });
    caseRepo.update(created.id, {
      patientInitials: 'T.P.',
      patientSex: PatientSex.Male,
      patientAge: 50,
      patientAgeUnit: AgeUnit.Year,
      receiptDate: '2026-03-15',
      caseNarrative: 'Integration-test narrative (empty demographics).'
    });

    const result = makeSvc(created.id).generate(created.id, {
      submissionEnvironment: 'Test',
      submissionReportType: 'Postmarket',
      senderIdentifierType: 'duns',
      senderIdentifierValue: '334818134',
      targetCenter: 'CDER',
      batchNumber: `IntTest-empty-${Date.now()}`
    });

    expect(result.success).toBe(true);
    const xml = result.xml!;

    // Race + Ethnicity fall back to nullFlavor
    expect(xml).toMatch(/code="C17049"[^/]*\/>\s*<value xsi:type="CE" nullFlavor="NI"/);
    expect(xml).toMatch(/code="C16564"[^/]*\/>\s*<value xsi:type="CE" nullFlavor="NI"/);
    // History text falls back to nullFlavor ED
    expect(xml).toMatch(/displayName="historyAndConcurrentConditionText"\/>\s*<value xsi:type="ED" nullFlavor="NI"/);
    // Concomitant = false (default when unset)
    expect(xml).toMatch(/displayName="concomitantTherapy"\/>\s*<value xsi:type="BL" value="false"/);
    // localCriteriaReportType = 15-Day (default)
    expect(xml).toMatch(/displayName="localCriteriaReportType"\/>\s*<value xsi:type="CE" code="1"/);
  });
});
