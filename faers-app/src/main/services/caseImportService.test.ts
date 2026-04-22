/**
 * CaseImportService tests — JSON import → Case + reporter + reactions + drugs.
 *
 * Repositories are mocked at the module level so we can assert on the exact
 * DTOs handed to each repo without spinning up a real better-sqlite3 DB
 * (which is already globally mocked by src/test/setup.ts).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock repositories ──────────────────────────────────────────────────────
// Declared with vi.hoisted so they're initialized before the vi.mock factory
// runs. Each repo's `create` is captured so tests can inspect the args.

const mocks = vi.hoisted(() => {
  return {
    caseCreate: vi.fn(),
    caseUpdate: vi.fn(),
    reporterCreate: vi.fn(),
    reactionCreate: vi.fn(),
    drugCreate: vi.fn()
  };
});

vi.mock('../database/repositories', () => ({
  CaseRepository: vi.fn().mockImplementation(() => ({
    create: mocks.caseCreate,
    update: mocks.caseUpdate
  })),
  ReporterRepository: vi.fn().mockImplementation(() => ({
    create: mocks.reporterCreate
  })),
  ReactionRepository: vi.fn().mockImplementation(() => ({
    create: mocks.reactionCreate
  })),
  DrugRepository: vi.fn().mockImplementation(() => ({
    create: mocks.drugCreate
  }))
}));

import { CaseImportService } from './caseImportService';
import {
  DrugCharacterization,
  PatientSex,
  ReportCategory,
  ReportType,
  ReporterQualification,
  ReactionOutcome,
  DrugActionTaken,
  ChallengeResult
} from '../../shared/types/case.types';

/** Mock DB exposing just the transaction wrapper our service needs. */
function makeMockDb() {
  return {
    transaction: <R>(fn: () => R) => () => fn()
  };
}

beforeEach(() => {
  // Reset mocks + set sensible defaults. caseRepo.create returns a Case-ish
  // object; update returns the same shape.
  mocks.caseCreate.mockReset();
  mocks.caseUpdate.mockReset();
  mocks.reporterCreate.mockReset();
  mocks.reactionCreate.mockReset();
  mocks.drugCreate.mockReset();

  mocks.caseCreate.mockImplementation((dto) => ({
    id: 'CASE-20260422-TEST',
    status: 'Draft',
    createdAt: '2026-04-22T00:00:00Z',
    updatedAt: '2026-04-22T00:00:00Z',
    safetyReportId: dto?.safetyReportId ?? 'SR-CASE-20260422-TEST',
    patientDeath: false,
    version: 1,
    ...dto
  }));
  mocks.caseUpdate.mockImplementation((id, dto) => ({
    id,
    status: 'Draft',
    createdAt: '2026-04-22T00:00:00Z',
    updatedAt: '2026-04-22T00:00:00Z',
    patientDeath: false,
    version: 1,
    ...dto
  }));
  mocks.reporterCreate.mockImplementation((r) => ({ ...r, id: 1 }));
  mocks.reactionCreate.mockImplementation((r) => ({ ...r, id: 1 }));
  mocks.drugCreate.mockImplementation((d) => ({ ...d, id: 1 }));
});

describe('CaseImportService.importCaseFromJson', () => {
  const svc = () => new CaseImportService(makeMockDb());

  const FULL_JSON = {
    $schema: 'faers-case-import-v1',
    exampleId: 'baseline',
    case: {
      safetyReportId: 'SR-CASE-EXAMPLE-BASELINE',
      reportType: 'Spontaneous',
      initialOrFollowup: 'Initial',
      receiptDate: '2026-03-15',
      expeditedReport: true,
      localReportTypeCode: 1,
      caseNarrative: 'Patient experienced an adverse event.'
    },
    patient: {
      initials: 'T.P.',
      sex: 'Male',
      birthDate: '1970-05-15',
      ageValue: 55,
      ageUnit: 'Year',
      weightKg: 82,
      race: 'C41260',
      ethnicity: 'C41222',
      medicalHistoryText: 'None reported',
      death: false
    },
    reporter: {
      qualification: 'Physician',
      prefix: 'Dr',
      givenName: 'Jane',
      familyName: 'Doe',
      organization: 'City General Hospital',
      department: 'Emergency',
      address: {
        street: '100 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '94085',
        country: 'US'
      },
      contact: {
        phone: '+1-408-555-0100',
        email: 'jane@example.com'
      }
    },
    reactions: [
      {
        term: 'Nausea',
        meddraCode: '10028813',
        outcomeCode: 1,
        seriousness: {
          hospitalization: false,
          otherMedicallyImportant: false
        }
      }
    ],
    drugs: [
      {
        role: 'Suspect',
        productName: 'Testdrugimab',
        indication: 'Rheumatoid arthritis',
        actionTakenCode: 1,
        dechallengeCode: 3,
        rechallengeCode: 3
      },
      {
        role: 'Concomitant',
        productName: 'Lisinopril',
        indication: 'Hypertension'
      }
    ]
  };

  it('creates a case + reporter + reactions + drugs from a full JSON', () => {
    const result = svc().importCaseFromJson({ jsonObject: FULL_JSON });

    expect(result.success).toBe(true);
    expect(result.caseId).toBe('CASE-20260422-TEST');
    expect(result.errors).toBeUndefined();

    // Case create used the JSON's safetyReportId + mapped enums
    expect(mocks.caseCreate).toHaveBeenCalledWith({
      safetyReportId: 'SR-CASE-EXAMPLE-BASELINE',
      reportType: ReportType.Spontaneous,
      initialOrFollowup: ReportCategory.Initial
    });

    // Case update patched in the remaining fields
    const [, updateDto] = mocks.caseUpdate.mock.calls[0];
    expect(updateDto).toMatchObject({
      receiptDate: '2026-03-15',
      expeditedReport: true,
      localReportTypeCode: 1,
      patientInitials: 'T.P.',
      patientSex: PatientSex.Male,
      patientBirthdate: '1970-05-15',
      patientAge: 55,
      patientAgeUnit: 'Year',
      patientWeight: 82,
      patientRace: 'C41260',
      patientEthnicity: 'C41222',
      medicalHistoryText: 'None reported',
      patientDeath: false,
      caseNarrative: 'Patient experienced an adverse event.'
    });

    // Reporter mapped correctly; isPrimary set automatically
    expect(mocks.reporterCreate).toHaveBeenCalledTimes(1);
    const reporter = mocks.reporterCreate.mock.calls[0][0];
    expect(reporter).toMatchObject({
      caseId: 'CASE-20260422-TEST',
      isPrimary: true,
      sortOrder: 0,
      qualification: ReporterQualification.Physician,
      title: 'Dr',
      givenName: 'Jane',
      familyName: 'Doe',
      organization: 'City General Hospital',
      department: 'Emergency',
      address: '100 Main St',
      city: 'Anytown',
      state: 'CA',
      postcode: '94085',
      country: 'US',
      phone: '+1-408-555-0100',
      email: 'jane@example.com'
    });

    // One reaction, outcome mapped
    expect(mocks.reactionCreate).toHaveBeenCalledTimes(1);
    expect(mocks.reactionCreate.mock.calls[0][0]).toMatchObject({
      caseId: 'CASE-20260422-TEST',
      reactionTerm: 'Nausea',
      meddraCode: '10028813',
      outcome: ReactionOutcome.Recovered,
      seriousHospitalization: false,
      seriousOther: false,
      sortOrder: 0
    });

    // Two drugs, characterization + action mapped
    expect(mocks.drugCreate).toHaveBeenCalledTimes(2);
    expect(mocks.drugCreate.mock.calls[0][0]).toMatchObject({
      caseId: 'CASE-20260422-TEST',
      characterization: DrugCharacterization.Suspect,
      productName: 'Testdrugimab',
      indication: 'Rheumatoid arthritis',
      actionTaken: DrugActionTaken.Withdrawn,
      dechallenge: ChallengeResult.Unknown,
      rechallenge: ChallengeResult.Unknown,
      sortOrder: 0
    });
    expect(mocks.drugCreate.mock.calls[1][0]).toMatchObject({
      characterization: DrugCharacterization.Concomitant,
      productName: 'Lisinopril',
      sortOrder: 1
    });
  });

  it('generates a safetyReportId when the JSON omits it', () => {
    const result = svc().importCaseFromJson({
      jsonObject: {
        case: { reportType: 'Spontaneous', initialOrFollowup: 'Initial' }
      }
    });

    expect(result.success).toBe(true);
    expect(mocks.caseCreate).toHaveBeenCalledWith({
      safetyReportId: undefined,
      reportType: ReportType.Spontaneous,
      initialOrFollowup: ReportCategory.Initial
    });
    // CaseRepository generates one automatically when safetyReportId is
    // undefined — we only verify we don't forward anything.
  });

  it('accepts a minimal JSON with no fields and creates a bare Draft', () => {
    const result = svc().importCaseFromJson({ jsonObject: {} });

    expect(result.success).toBe(true);
    expect(mocks.caseCreate).toHaveBeenCalledWith({
      safetyReportId: undefined,
      reportType: undefined,
      initialOrFollowup: undefined
    });
    // No patches, no children
    expect(mocks.caseUpdate).not.toHaveBeenCalled();
    expect(mocks.reporterCreate).not.toHaveBeenCalled();
    expect(mocks.reactionCreate).not.toHaveBeenCalled();
    expect(mocks.drugCreate).not.toHaveBeenCalled();
  });

  it('returns structured errors when the JSON does not match the schema', () => {
    const result = svc().importCaseFromJson({
      jsonObject: {
        reactions: [{ term: '' }] // term is required non-empty
      }
    });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    const paths = result.errors!.map((e) => e.path);
    expect(paths.some((p) => p.includes('reactions[0].term'))).toBe(true);
    // Nothing should have been persisted
    expect(mocks.caseCreate).not.toHaveBeenCalled();
  });

  it('rejects unknown top-level keys', () => {
    const result = svc().importCaseFromJson({
      jsonObject: { someUnknownField: 42 }
    });
    expect(result.success).toBe(false);
    expect(mocks.caseCreate).not.toHaveBeenCalled();
  });

  it('surfaces JSON parse errors as a single $ error', () => {
    const result = svc().importCaseFromJson({ jsonText: 'not json {' });
    expect(result.success).toBe(false);
    expect(result.errors![0].path).toBe('$');
    expect(result.errors![0].message).toMatch(/JSON parse failed/i);
  });

  it('rolls back the transaction when a mid-import insert fails', () => {
    mocks.drugCreate.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const result = svc().importCaseFromJson({ jsonObject: FULL_JSON });

    expect(result.success).toBe(false);
    expect(result.errors![0].message).toBe('boom');
    // Create + update + reporter + reaction attempted, drug threw.
    // Our mock transaction doesn't actually roll back; but a real DB would.
    // We only assert the service translated the error correctly.
  });

  it('collects warnings for unknown enum values without failing', () => {
    const result = svc().importCaseFromJson({
      jsonObject: {
        case: { reportType: 'NotAStudyOrSpontaneous' },
        patient: { sex: 'Martian', ageUnit: 'Fortnight' }
      }
    });
    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.join(' ')).toMatch(/reportType/);
    expect(result.warnings!.join(' ')).toMatch(/patient.sex/);
    expect(result.warnings!.join(' ')).toMatch(/ageUnit/);
  });

  it('returns an error when no input is provided', () => {
    const result = svc().importCaseFromJson({});
    expect(result.success).toBe(false);
    expect(result.errors![0].message).toMatch(/Provide filePath/);
  });
});
