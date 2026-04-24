/**
 * Case Import Service — import a new case from a JSON document.
 *
 * Entry point: `importCaseFromJson(rawInput)` — accepts either a file path
 * or an already-parsed object, validates with the zod schema in
 * `caseImport.types.ts`, and atomically creates the Case + reporter(s) +
 * reactions + drugs in a single better-sqlite3 transaction. On any failure
 * (JSON parse, zod, enum mapping, repo insert), the transaction rolls back
 * and nothing is persisted.
 *
 * This is the backbone for both the "Import JSON" UI toolbar and the
 * upcoming headless CLI path — the transport (file / IPC / stdin) doesn't
 * matter; the service takes the same payload either way.
 */

import { readFileSync } from 'node:fs';
import { ZodError } from 'zod';
import {
  CaseImportDocumentSchema,
  type CaseImportDocument,
  type CaseImportDrug,
  type CaseImportReaction,
  type CaseImportReporter,
  type CaseImportResult,
  type CaseImportError
} from '../../shared/types/caseImport.types';
import {
  AgeUnit,
  ChallengeResult,
  DrugActionTaken,
  DrugCharacterization,
  PatientSex,
  ReactionOutcome,
  ReportCategory,
  ReportType,
  ReporterQualification,
  LocalReportTypeCode,
  SenderType,
  type Case,
  type CaseDrug,
  type CaseReaction,
  type CaseReporter,
  type UpdateCaseDTO
} from '../../shared/types/case.types';
import {
  CaseRepository,
  DrugRepository,
  ReactionRepository,
  ReporterRepository
} from '../database/repositories';
import type { DatabaseInstance } from '../database/types';

// ────────────────────────────────────────────────────────────────────────────
//  Public API
// ────────────────────────────────────────────────────────────────────────────

export interface ImportFromJsonInput {
  /** Absolute path to a JSON file. Preferred for the UI file picker. */
  filePath?: string;
  /** Raw JSON string. */
  jsonText?: string;
  /** Already-parsed JSON object. Used by tests and the forthcoming CLI. */
  jsonObject?: unknown;
}

export class CaseImportService {
  constructor(private db: DatabaseInstance) {}

  /** Parse + validate + atomically persist. Never throws on caller errors. */
  importCaseFromJson(input: ImportFromJsonInput): CaseImportResult {
    // 1. Load raw content
    let raw: unknown;
    try {
      raw = this.loadRaw(input);
    } catch (e) {
      return {
        success: false,
        errors: [{ path: '$', message: (e as Error).message }]
      };
    }

    // 2. Schema-validate
    const parsed = CaseImportDocumentSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, errors: zodToImportErrors(parsed.error) };
    }
    const doc = parsed.data;

    // 3. Map + persist inside a transaction
    const warnings: string[] = [];
    try {
      // Typing: better-sqlite3's transaction fn returns whatever the wrapped
      // function returns. We pass a lambda and invoke the result.
      const txn = (this.db as unknown as {
        transaction: <R>(fn: () => R) => () => R;
      }).transaction<Case>(() => this.createInsideTransaction(doc, warnings));
      const createdCase = txn();
      return { success: true, caseId: createdCase.id, warnings: warnings.length ? warnings : undefined };
    } catch (e) {
      if (e instanceof ImportError) {
        return { success: false, errors: e.errors };
      }
      return {
        success: false,
        errors: [{ path: '$', message: (e as Error).message || 'Import failed' }]
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Internals
  // ────────────────────────────────────────────────────────────────────────

  private loadRaw(input: ImportFromJsonInput): unknown {
    if (input.jsonObject !== undefined) return input.jsonObject;
    if (typeof input.jsonText === 'string') {
      try {
        return JSON.parse(input.jsonText);
      } catch (e) {
        throw new Error(`JSON parse failed: ${(e as Error).message}`);
      }
    }
    if (input.filePath) {
      const text = readFileSync(input.filePath, 'utf-8');
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`JSON parse failed at ${input.filePath}: ${(e as Error).message}`);
      }
    }
    throw new Error('Provide filePath, jsonText, or jsonObject');
  }

  private createInsideTransaction(doc: CaseImportDocument, warnings: string[]): Case {
    const caseRepo = new CaseRepository(this.db);
    const reporterRepo = new ReporterRepository(this.db);
    const reactionRepo = new ReactionRepository(this.db);
    const drugRepo = new DrugRepository(this.db);

    // Step 1: create the bare Draft with whatever A.1 fields we have.
    const reportType = mapReportType(doc.case?.reportType, warnings);
    const initialOrFollowup = mapReportCategory(doc.case?.initialOrFollowup, warnings);
    const created = caseRepo.create({
      safetyReportId: doc.case?.safetyReportId,
      reportType,
      initialOrFollowup
    });

    // Step 2: patch the remaining case-level + patient-level fields.
    const update: UpdateCaseDTO = buildUpdateDto(doc, warnings);
    if (Object.keys(update).length > 0) {
      const updated = caseRepo.update(created.id, update);
      if (!updated) {
        throw new ImportError([
          { path: '$', message: `Failed to update case ${created.id} post-create` }
        ]);
      }
    }

    // Step 3: reporter(s). Today the import DSL carries a single reporter;
    // promote it to primary and mark sortOrder=0. More reporters can be added
    // later by extending the schema to accept an array.
    if (doc.reporter) {
      const reporter = mapReporter(doc.reporter, created.id, warnings);
      reporterRepo.create(reporter);
    }

    // Step 4: reactions.
    if (doc.reactions) {
      doc.reactions.forEach((r, idx) => {
        const reaction = mapReaction(r, created.id, idx, warnings);
        reactionRepo.create(reaction);
      });
    }

    // Step 5: drugs.
    if (doc.drugs) {
      doc.drugs.forEach((d, idx) => {
        const drug = mapDrug(d, created.id, idx, warnings);
        drugRepo.create(drug);
      });
    }

    return created;
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Mapping helpers — JSON DSL → internal DTOs
// ────────────────────────────────────────────────────────────────────────────

/**
 * Error carrier that bubbles out of the transaction. The transaction fn
 * throws to trigger rollback; we catch at the service entry and translate
 * to a non-throwing CaseImportResult.
 */
class ImportError extends Error {
  constructor(public readonly errors: CaseImportError[]) {
    super(errors.map((e) => `${e.path}: ${e.message}`).join('; '));
    this.name = 'ImportError';
  }
}

function buildUpdateDto(doc: CaseImportDocument, warnings: string[]): UpdateCaseDTO {
  const update: UpdateCaseDTO = {};

  if (doc.case) {
    if (doc.case.receiptDate) update.receiptDate = doc.case.receiptDate;
    if (doc.case.receiveDate) update.receiveDate = doc.case.receiveDate;
    if (doc.case.expeditedReport !== undefined) update.expeditedReport = doc.case.expeditedReport;
    if (doc.case.additionalDocs !== undefined) update.additionalDocs = doc.case.additionalDocs;
    if (doc.case.worldwideCaseId) update.worldwideCaseId = doc.case.worldwideCaseId;
    if (doc.case.caseNarrative) update.caseNarrative = doc.case.caseNarrative;
    if (doc.case.reporterComments) update.reporterComments = doc.case.reporterComments;
    if (doc.case.senderComments) update.senderComments = doc.case.senderComments;
    if (doc.case.senderDiagnosis) update.senderDiagnosis = doc.case.senderDiagnosis;
    if (doc.case.localReportTypeCode !== undefined) {
      const code = mapLocalReportType(doc.case.localReportTypeCode, warnings);
      if (code !== undefined) update.localReportTypeCode = code;
    }
  }

  // Sender (E2B A.3) — required for validation; stored as flat columns on
  // the Case record itself.
  if (doc.sender) {
    const s = doc.sender;
    if (s.senderType !== undefined) {
      const t = mapSenderType(s.senderType, warnings);
      if (t !== undefined) update.senderType = t;
    }
    if (s.organization) update.senderOrganization = s.organization;
    if (s.department) update.senderDepartment = s.department;
    if (s.givenName) update.senderGivenName = s.givenName;
    if (s.familyName) update.senderFamilyName = s.familyName;
    if (s.address?.street) update.senderAddress = s.address.street;
    if (s.address?.city) update.senderCity = s.address.city;
    if (s.address?.state) update.senderState = s.address.state;
    if (s.address?.postalCode) update.senderPostcode = s.address.postalCode;
    if (s.address?.country) update.senderCountry = s.address.country;
    if (s.contact?.phone) update.senderPhone = s.contact.phone;
    if (s.contact?.fax) update.senderFax = s.contact.fax;
    if (s.contact?.email) update.senderEmail = s.contact.email;
  }

  if (doc.patient) {
    const p = doc.patient;
    if (p.initials) update.patientInitials = p.initials;
    if (p.birthDate) update.patientBirthdate = p.birthDate;
    if (p.ageValue !== undefined) update.patientAge = p.ageValue;
    if (p.ageUnit !== undefined) {
      const u = mapAgeUnit(p.ageUnit, warnings);
      if (u) update.patientAgeUnit = u;
    }
    if (p.weightKg !== undefined) update.patientWeight = p.weightKg;
    if (p.heightCm !== undefined) update.patientHeight = p.heightCm;
    if (p.sex !== undefined) {
      const s = mapSex(p.sex, warnings);
      if (s !== undefined) update.patientSex = s;
    }
    // Race / ethnicity are NCI codes in the JSON; the internal enum holds
    // those codes as string values, so cast after validating it's a
    // non-empty string.
    if (p.race) update.patientRace = p.race as Case['patientRace'];
    if (p.ethnicity) update.patientEthnicity = p.ethnicity as Case['patientEthnicity'];
    if (p.medicalHistoryText !== undefined) update.medicalHistoryText = p.medicalHistoryText;
    if (p.hasConcomitantTherapy !== undefined) update.hasConcomitantTherapy = p.hasConcomitantTherapy;
    if (p.death !== undefined) update.patientDeath = p.death;
    if (p.deathDate) update.deathDate = p.deathDate;
    if (p.autopsyPerformed !== undefined) update.autopsyPerformed = p.autopsyPerformed;
  }

  return update;
}

function mapReporter(
  r: CaseImportReporter,
  caseId: string,
  warnings: string[]
): Omit<CaseReporter, 'id'> {
  return {
    caseId,
    isPrimary: true,
    sortOrder: 0,
    title: r.prefix,
    givenName: r.givenName,
    familyName: r.familyName,
    qualification: r.qualification !== undefined
      ? mapReporterQualification(r.qualification, warnings)
      : undefined,
    organization: r.organization,
    department: r.department,
    address: r.address?.street,
    city: r.address?.city,
    state: r.address?.state,
    postcode: r.address?.postalCode,
    country: r.address?.country,
    phone: r.contact?.phone,
    fax: r.contact?.fax,
    email: r.contact?.email
  };
}

function mapReaction(
  r: CaseImportReaction,
  caseId: string,
  idx: number,
  warnings: string[]
): Omit<CaseReaction, 'id'> {
  const s = r.seriousness;
  return {
    caseId,
    reactionTerm: r.term,
    meddraCode: r.meddraCode,
    meddraVersion: r.meddraVersion,
    nativeTerm: r.nativeTerm,
    startDate: r.startDate,
    endDate: r.endDate,
    seriousDeath: !!s?.death,
    seriousLifeThreat: !!s?.lifeThreatening,
    seriousHospitalization: !!s?.hospitalization,
    seriousDisability: !!s?.disability,
    seriousCongenital: !!s?.congenitalAnomaly,
    seriousOther: !!s?.otherMedicallyImportant,
    outcome: r.outcomeCode !== undefined
      ? mapReactionOutcome(r.outcomeCode, `reactions[${idx}].outcomeCode`, warnings)
      : undefined,
    medicalConfirm: r.medicalConfirm,
    sortOrder: idx
  };
}

function mapDrug(
  d: CaseImportDrug,
  caseId: string,
  idx: number,
  warnings: string[]
): Omit<CaseDrug, 'id'> {
  const characterization = d.role !== undefined
    ? mapDrugCharacterization(d.role, `drugs[${idx}].role`, warnings)
    : DrugCharacterization.Suspect; // Sensible default — every case has at least one suspect.

  return {
    caseId,
    characterization,
    productName: d.productName,
    indication: d.indication,
    indicationCode: d.indicationMeddraCode,
    startDate: d.startDate,
    endDate: d.endDate,
    actionTaken: d.actionTakenCode !== undefined
      ? mapActionTaken(d.actionTakenCode, `drugs[${idx}].actionTakenCode`, warnings)
      : undefined,
    dechallenge: d.dechallengeCode !== undefined
      ? mapChallenge(d.dechallengeCode, `drugs[${idx}].dechallengeCode`, warnings)
      : undefined,
    rechallenge: d.rechallengeCode !== undefined
      ? mapChallenge(d.rechallengeCode, `drugs[${idx}].rechallengeCode`, warnings)
      : undefined,
    additionalInfo: d.additionalInfo,
    sortOrder: idx,
    ndcNumber: d.ndcNumber,
    manufacturerName: d.manufacturerName,
    lotNumber: d.lotNumber,
    expirationDate: d.expirationDate
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  Enum mappers — accept name-string OR numeric code.
//  `name` key on each case is the field path we use for the warning.
// ────────────────────────────────────────────────────────────────────────────

function mapSenderType(v: unknown, warnings: string[]): SenderType | undefined {
  if (v === undefined) return undefined;
  const byName: Record<string, SenderType> = {
    PharmaceuticalCompany: SenderType.PharmaceuticalCompany,
    RegulatoryAuthority: SenderType.RegulatoryAuthority,
    HealthProfessional: SenderType.HealthProfessional,
    RegionalPVCentre: SenderType.RegionalPVCentre,
    WHOCollaboratingCentre: SenderType.WHOCollaboratingCentre,
    Other: SenderType.Other
  };
  return resolveEnum(v, byName, [1, 2, 3, 4, 5, 6], 'sender.senderType', warnings) as SenderType | undefined;
}

function mapReportType(v: unknown, warnings: string[]): ReportType | undefined {
  if (v === undefined) return undefined;
  const byName: Record<string, ReportType> = {
    Spontaneous: ReportType.Spontaneous,
    Study: ReportType.Study,
    Other: ReportType.Other,
    NotAvailable: ReportType.NotAvailable
  };
  return resolveEnum(v, byName, [1, 2, 3, 4], 'case.reportType', warnings) as ReportType | undefined;
}

function mapReportCategory(v: unknown, warnings: string[]): ReportCategory | undefined {
  if (v === undefined) return undefined;
  const byName: Record<string, ReportCategory> = {
    Initial: ReportCategory.Initial,
    FollowUp: ReportCategory.FollowUp
  };
  return resolveEnum(v, byName, [1, 2], 'case.initialOrFollowup', warnings) as ReportCategory | undefined;
}

function mapLocalReportType(v: unknown, warnings: string[]): LocalReportTypeCode | undefined {
  if (v === undefined) return undefined;
  const byName: Record<string, LocalReportTypeCode> = {
    FifteenDay: LocalReportTypeCode.FifteenDay,
    SevenDay: LocalReportTypeCode.SevenDay,
    '15-Day': LocalReportTypeCode.FifteenDay,
    '7-Day': LocalReportTypeCode.SevenDay
  };
  return resolveEnum(v, byName, [1, 7], 'case.localReportTypeCode', warnings) as LocalReportTypeCode | undefined;
}

function mapReporterQualification(v: unknown, warnings: string[]): ReporterQualification | undefined {
  const byName: Record<string, ReporterQualification> = {
    Physician: ReporterQualification.Physician,
    Pharmacist: ReporterQualification.Pharmacist,
    OtherHealthProfessional: ReporterQualification.OtherHealthProfessional,
    'Other Health Professional': ReporterQualification.OtherHealthProfessional,
    Lawyer: ReporterQualification.Lawyer,
    Consumer: ReporterQualification.Consumer
  };
  return resolveEnum(v, byName, [1, 2, 3, 4, 5], 'reporter.qualification', warnings) as ReporterQualification | undefined;
}

function mapSex(v: unknown, warnings: string[]): PatientSex | undefined {
  const byName: Record<string, PatientSex> = {
    Unknown: PatientSex.Unknown,
    Male: PatientSex.Male,
    Female: PatientSex.Female
  };
  return resolveEnum(v, byName, [0, 1, 2], 'patient.sex', warnings) as PatientSex | undefined;
}

function mapAgeUnit(v: unknown, warnings: string[]): AgeUnit | undefined {
  const valid: AgeUnit[] = [AgeUnit.Year, AgeUnit.Month, AgeUnit.Week, AgeUnit.Day, AgeUnit.Hour];
  if (typeof v === 'string' && (valid as string[]).includes(v)) return v as AgeUnit;
  warnings.push(`patient.ageUnit: "${String(v)}" is not a known AgeUnit; left unset`);
  return undefined;
}

function mapReactionOutcome(v: unknown, path: string, warnings: string[]): ReactionOutcome | undefined {
  const byName: Record<string, ReactionOutcome> = {
    Unknown: ReactionOutcome.Unknown,
    Recovered: ReactionOutcome.Recovered,
    Recovering: ReactionOutcome.Recovering,
    NotRecovered: ReactionOutcome.NotRecovered,
    RecoveredWithSequelae: ReactionOutcome.RecoveredWithSequelae,
    Fatal: ReactionOutcome.Fatal
  };
  return resolveEnum(v, byName, [0, 1, 2, 3, 4, 5], path, warnings) as ReactionOutcome | undefined;
}

function mapDrugCharacterization(v: unknown, path: string, warnings: string[]): DrugCharacterization {
  const byName: Record<string, DrugCharacterization> = {
    Suspect: DrugCharacterization.Suspect,
    Concomitant: DrugCharacterization.Concomitant,
    Interacting: DrugCharacterization.Interacting
  };
  const resolved = resolveEnum(v, byName, [1, 2, 3], path, warnings);
  // Unlike the other fields, the drug type is required — default Suspect.
  return (resolved ?? DrugCharacterization.Suspect) as DrugCharacterization;
}

function mapActionTaken(v: unknown, path: string, warnings: string[]): DrugActionTaken | undefined {
  const byName: Record<string, DrugActionTaken> = {
    Withdrawn: DrugActionTaken.Withdrawn,
    DoseReduced: DrugActionTaken.DoseReduced,
    DoseIncreased: DrugActionTaken.DoseIncreased,
    DoseNotChanged: DrugActionTaken.DoseNotChanged,
    Unknown: DrugActionTaken.Unknown,
    NotApplicable: DrugActionTaken.NotApplicable
  };
  return resolveEnum(v, byName, [1, 2, 3, 4, 5, 6], path, warnings) as DrugActionTaken | undefined;
}

function mapChallenge(v: unknown, path: string, warnings: string[]): ChallengeResult | undefined {
  const byName: Record<string, ChallengeResult> = {
    Yes: ChallengeResult.Yes,
    No: ChallengeResult.No,
    Unknown: ChallengeResult.Unknown,
    NotApplicable: ChallengeResult.NotApplicable
  };
  return resolveEnum(v, byName, [1, 2, 3, 4], path, warnings) as ChallengeResult | undefined;
}

/**
 * Accept a name-string or numeric code, return the enum value or undefined
 * if neither matched. On mismatch, push a warning with the full path.
 */
function resolveEnum(
  v: unknown,
  byName: Record<string, number>,
  validNumbers: number[],
  path: string,
  warnings: string[]
): number | undefined {
  if (typeof v === 'number') {
    if (validNumbers.includes(v)) return v;
  } else if (typeof v === 'string') {
    if (v in byName) return byName[v];
    const asNum = Number(v);
    if (!Number.isNaN(asNum) && validNumbers.includes(asNum)) return asNum;
  }
  warnings.push(`${path}: "${String(v)}" is not a recognised enum value; left unset`);
  return undefined;
}

// ────────────────────────────────────────────────────────────────────────────
//  Zod error → CaseImportError[]
// ────────────────────────────────────────────────────────────────────────────

function zodToImportErrors(err: ZodError): CaseImportError[] {
  return err.issues.map((i) => ({
    path: i.path.length ? i.path.map(segmentToPath).join('') : '$',
    message: i.message
  }));
}

function segmentToPath(seg: string | number, idx: number): string {
  if (typeof seg === 'number') return `[${seg}]`;
  return idx === 0 ? seg : `.${seg}`;
}
