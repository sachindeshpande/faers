/**
 * JSON Case Import — schema for the "seed a new case from a JSON file" feature.
 *
 * Design principles:
 *   - Human-friendly field names (`weightKg` vs the internal `patientWeight`).
 *   - Optional by default. A Draft can persist with any subset; existing
 *     validators (field-level + 5-pass pre-submission) catch gaps later.
 *   - Enums accept either the name ("Male") or the numeric code (1). The
 *     service normalises to the internal enum at mapping time.
 *   - Required at the top level: nothing, because a caller can import an
 *     almost-empty JSON to prototype a case. The service handles defaults.
 *
 * Source of truth for the types the service emits (Case, CaseReporter, …)
 * remains `case.types.ts`. This file is just the import DSL plus the zod
 * schema that validates caller-supplied JSON against it.
 */

import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Accept an enum-name string, the numeric code, or the stringified code; the
 * service maps to the internal enum. Zod keeps the raw value; we validate
 * semantically at mapping time where we can emit a focused error.
 */
const enumish = z.union([z.string(), z.number()]);

const isoDate = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Expected ISO date YYYY-MM-DD'
);

// ────────────────────────────────────────────────────────────────────────────
//  Case-level fields
// ────────────────────────────────────────────────────────────────────────────

export const CaseImportCaseSchema = z
  .object({
    safetyReportId: z.string().min(1).optional(),
    worldwideCaseId: z.string().optional(),
    reportType: enumish.optional(),            // "Spontaneous" | "Study" | ... | 1..4
    initialOrFollowup: enumish.optional(),      // "Initial" | "FollowUp" | 1 | 2
    receiptDate: isoDate.optional(),
    /**
     * Most Recent Information Date (E2B A.1.5.2). Validator requires this
     * distinct from receiptDate. For an Initial report they're the same
     * day; for follow-ups it's the follow-up receipt.
     */
    receiveDate: isoDate.optional(),
    expeditedReport: z.boolean().optional(),
    localReportTypeCode: enumish.optional(),    // 1 (15-Day) | 7 (7-Day)
    additionalDocs: z.boolean().optional(),
    caseNarrative: z.string().optional(),
    reporterComments: z.string().optional(),
    senderComments: z.string().optional(),
    senderDiagnosis: z.string().optional()
  })
  .strict();

// ────────────────────────────────────────────────────────────────────────────
//  Sender (E2B A.3) — required for validation, must live on the Case record
//  itself (not as a child entity like reporter).
// ────────────────────────────────────────────────────────────────────────────

export const CaseImportSenderSchema = z
  .object({
    senderType: enumish.optional(),             // 1..6 per SenderType enum
    organization: z.string().optional(),
    department: z.string().optional(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional()
      })
      .strict()
      .optional(),
    contact: z
      .object({
        phone: z.string().optional(),
        fax: z.string().optional(),
        email: z.string().email().optional()
      })
      .strict()
      .optional()
  })
  .strict();

// ────────────────────────────────────────────────────────────────────────────
//  Patient
// ────────────────────────────────────────────────────────────────────────────

export const CaseImportPatientSchema = z
  .object({
    initials: z.string().optional(),
    sex: enumish.optional(),                   // "Male" | "Female" | "Unknown" | 0|1|2
    birthDate: isoDate.optional(),
    ageValue: z.number().nonnegative().optional(),
    ageUnit: enumish.optional(),                // "Year" | "Month" | ...
    weightKg: z.number().positive().optional(),
    heightCm: z.number().positive().optional(),
    race: z.string().optional(),                // NCI code like "C41260"
    ethnicity: z.string().optional(),           // NCI code like "C41222"
    medicalHistoryText: z.string().optional(),
    hasConcomitantTherapy: z.boolean().optional(),
    death: z.boolean().optional(),
    deathDate: isoDate.optional(),
    autopsyPerformed: z.boolean().optional()
  })
  .strict();

// ────────────────────────────────────────────────────────────────────────────
//  Reporter
// ────────────────────────────────────────────────────────────────────────────

export const CaseImportReporterSchema = z
  .object({
    qualification: enumish.optional(),          // 1..5 or "Physician"|"Pharmacist"|...
    prefix: z.string().optional(),              // "Mr"|"Dr"|…
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    organization: z.string().optional(),
    department: z.string().optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional()          // ISO-2 country code
      })
      .strict()
      .optional(),
    contact: z
      .object({
        phone: z.string().optional(),
        fax: z.string().optional(),
        email: z.string().email().optional()
      })
      .strict()
      .optional()
  })
  .strict();

// ────────────────────────────────────────────────────────────────────────────
//  Reactions
// ────────────────────────────────────────────────────────────────────────────

export const CaseImportSeriousnessSchema = z
  .object({
    death: z.boolean().optional(),
    lifeThreatening: z.boolean().optional(),
    hospitalization: z.boolean().optional(),
    disability: z.boolean().optional(),
    congenitalAnomaly: z.boolean().optional(),
    otherMedicallyImportant: z.boolean().optional()
  })
  .strict();

export const CaseImportReactionSchema = z
  .object({
    term: z.string().min(1, 'Reaction term is required'),
    meddraCode: z.string().optional(),
    meddraVersion: z.string().optional(),
    nativeTerm: z.string().optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    outcomeCode: enumish.optional(),            // 0..5 per ReactionOutcome
    medicalConfirm: z.boolean().optional(),
    seriousness: CaseImportSeriousnessSchema.optional()
  })
  .strict();

// ────────────────────────────────────────────────────────────────────────────
//  Drugs
// ────────────────────────────────────────────────────────────────────────────

export const CaseImportDrugSchema = z
  .object({
    role: enumish.optional(),                   // "Suspect"|"Concomitant"|"Interacting" or 1|2|3
    productName: z.string().min(1, 'Drug productName is required'),
    dose: z.string().optional(),                // free text; dosage detail goes via separate fields below
    doseValue: z.number().optional(),
    doseUnit: z.string().optional(),
    route: z.string().optional(),
    indication: z.string().optional(),
    indicationMeddraCode: z.string().optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    actionTakenCode: enumish.optional(),        // 1..6
    dechallengeCode: enumish.optional(),        // 1..4
    rechallengeCode: enumish.optional(),        // 1..4
    authorizationType: z.string().optional(),   // "NDA" | "ANDA" | "IND" | "BLA" | ...
    authorizationNumber: z.string().optional(),
    lotNumber: z.string().optional(),
    expirationDate: isoDate.optional(),
    manufacturerName: z.string().optional(),
    ndcNumber: z.string().optional(),
    additionalInfo: z.string().optional()
  })
  .strict();

// ────────────────────────────────────────────────────────────────────────────
//  Top-level document
// ────────────────────────────────────────────────────────────────────────────

export const CaseImportDocumentSchema = z
  .object({
    /**
     * Schema version tag. Currently always "faers-case-import-v1". Readers
     * that see a newer version should refuse rather than silently skipping
     * unknown fields.
     */
    $schema: z.string().optional(),
    exampleId: z.string().optional(),
    description: z.string().optional(),
    /**
     * Free-form pointer back to a reference case (e.g. "2L8T"). Informational
     * only — the importer does not auto-fill from any baseline.
     */
    baseline: z.string().optional(),

    case: CaseImportCaseSchema.optional(),
    patient: CaseImportPatientSchema.optional(),
    sender: CaseImportSenderSchema.optional(),
    reporter: CaseImportReporterSchema.optional(),
    reactions: z.array(CaseImportReactionSchema).optional(),
    drugs: z.array(CaseImportDrugSchema).optional()
  })
  .strict();

// ────────────────────────────────────────────────────────────────────────────
//  Derived TS types
// ────────────────────────────────────────────────────────────────────────────

export type CaseImportDocument = z.infer<typeof CaseImportDocumentSchema>;
export type CaseImportCase = z.infer<typeof CaseImportCaseSchema>;
export type CaseImportPatient = z.infer<typeof CaseImportPatientSchema>;
export type CaseImportSender = z.infer<typeof CaseImportSenderSchema>;
export type CaseImportReporter = z.infer<typeof CaseImportReporterSchema>;
export type CaseImportReaction = z.infer<typeof CaseImportReactionSchema>;
export type CaseImportDrug = z.infer<typeof CaseImportDrugSchema>;
export type CaseImportSeriousness = z.infer<typeof CaseImportSeriousnessSchema>;

// ────────────────────────────────────────────────────────────────────────────
//  Service result shape (shared with renderer so preload can type it)
// ────────────────────────────────────────────────────────────────────────────

export interface CaseImportResult {
  /** True when the case + children were created. False → check `errors`. */
  success: boolean;
  /** ID of the created Draft case. Present iff success. */
  caseId?: string;
  /**
   * Zod / semantic validation errors. When present, nothing was written —
   * the service runs the full import inside a DB transaction that rolls back
   * on any error.
   */
  errors?: CaseImportError[];
  /** Non-blocking notes (e.g. an unresolved MedDRA term). */
  warnings?: string[];
}

export interface CaseImportError {
  /** Dot-path into the JSON, e.g. `patient.sex` or `reactions[0].term`. */
  path: string;
  message: string;
}
