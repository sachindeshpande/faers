/**
 * FAERS Case Types - E2B(R3) compliant data structures
 */

// Case status enum - Phase 2: Extended for FDA ESG NextGen USP submission workflow
// Phase 2B: Added 'Submitting' and 'Submission Failed' for API submission
export type CaseStatus =
  | 'Draft'
  | 'Ready for Export'
  | 'Exported'
  | 'Submitting'
  | 'Submitted'
  | 'Acknowledged'
  | 'Submission Failed'
  | 'Rejected';

// Submission History Event Types (Phase 2)
// Phase 2B: Added API submission event types
export type SubmissionEventType =
  | 'created'
  | 'marked_ready'
  | 'returned_to_draft'
  | 'exported'
  | 'submitted'
  | 'acknowledged'
  | 'rejected'
  | 'api_submitting'
  | 'api_submit_success'
  | 'api_submit_failed'
  | 'api_retry'
  | 'ack_received'
  | 'nack_received';

// Acknowledgment Type (Phase 2)
// Phase 2B: Added granular ACK types for API acknowledgments
export type AcknowledgmentType = 'Accepted' | 'Rejected' | 'ACK1' | 'ACK2' | 'ACK3' | 'NACK';

// E2B Report Types (A.1.2)
export enum ReportType {
  Spontaneous = 1,
  Study = 2,
  Other = 3,
  NotAvailable = 4
}

// Initial or Follow-up (A.1.4)
export enum ReportCategory {
  Initial = 1,
  FollowUp = 2
}

// Reporter Qualification (A.2.1.4)
export enum ReporterQualification {
  Physician = 1,
  Pharmacist = 2,
  OtherHealthProfessional = 3,
  Lawyer = 4,
  Consumer = 5
}

// Sender Type (A.3.1.1)
export enum SenderType {
  PharmaceuticalCompany = 1,
  RegulatoryAuthority = 2,
  HealthProfessional = 3,
  RegionalPVCentre = 4,
  WHOCollaboratingCentre = 5,
  Other = 6
}

// Patient Sex (B.1.5)
export enum PatientSex {
  Unknown = 0,
  Male = 1,
  Female = 2
}

// Age Unit (B.1.2.2b)
export enum AgeUnit {
  Year = 'Year',
  Month = 'Month',
  Week = 'Week',
  Day = 'Day',
  Hour = 'Hour'
}

// Patient Race (B.1.7.x) — NCI Thesaurus codes used by E2B(R3) per FDA Regional IG
export enum PatientRace {
  AmericanIndianOrAlaskaNative = 'C41259',
  Asian = 'C41260',
  BlackOrAfricanAmerican = 'C16352',
  NativeHawaiianOrPacificIslander = 'C41219',
  White = 'C41261',
  Other = 'C17649',
  NotReported = 'C67109'
}

// Patient Ethnicity (B.1.7.x) — NCI Thesaurus codes
export enum PatientEthnicity {
  HispanicOrLatino = 'C17459',
  NotHispanicOrLatino = 'C41222',
  NotReported = 'C67109',
  Unknown = 'C17998'
}

// C.1.7 Local Report Type (E2B Regional IG §4.2.1) — lint requires 1 or 7
export enum LocalReportTypeCode {
  FifteenDay = 1,
  SevenDay = 7
}

// Patient Age Group (B.1.2.3)
export enum PatientAgeGroup {
  Neonate = 1,      // < 1 month
  Infant = 2,       // 1 month - 2 years
  Child = 3,        // 2-11 years
  Adolescent = 4,   // 12-17 years
  Adult = 5,        // 18-64 years
  Elderly = 6       // >= 65 years
}

// Reaction Outcome (B.2.i.8)
export enum ReactionOutcome {
  Unknown = 0,
  Recovered = 1,
  Recovering = 2,
  NotRecovered = 3,
  RecoveredWithSequelae = 4,
  Fatal = 5
}

// Drug Characterization (B.4.k.1)
export enum DrugCharacterization {
  Suspect = 1,
  Concomitant = 2,
  Interacting = 3
}

// Action Taken with Drug (B.4.k.12)
export enum DrugActionTaken {
  Withdrawn = 1,
  DoseReduced = 2,
  DoseIncreased = 3,
  DoseNotChanged = 4,
  Unknown = 5,
  NotApplicable = 6
}

// Dechallenge/Rechallenge Result (B.4.k.13)
export enum ChallengeResult {
  Yes = 1,
  No = 2,
  Unknown = 3,
  NotApplicable = 4
}

// Nullification Type (A.1.10.1)
export enum NullificationType {
  Nullification = 1,
  Amendment = 2
}

// Reporter data structure (A.2)
export interface CaseReporter {
  id?: number;
  caseId: string;
  isPrimary: boolean;
  title?: string;
  givenName?: string;
  familyName?: string;
  qualification?: ReporterQualification;
  organization?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
  sortOrder: number;
}

// Case Identifier (A.1.9)
export interface CaseIdentifier {
  id?: number;
  caseId: string;
  source?: string;
  identifier?: string;
}

// Related Report (A.1.11)
export interface CaseRelatedReport {
  id?: number;
  caseId: string;
  relatedCaseId?: string;
  linkType?: number;
}

// Medical History (B.1.7)
export interface CaseMedicalHistory {
  id?: number;
  caseId: string;
  condition?: string;
  meddraCode?: string;
  meddraVersion?: string;
  startDate?: string;
  continuing?: boolean;
  endDate?: string;
  comments?: string;
  familyHistory?: boolean;
  sortOrder: number;
}

// Drug History (B.1.8)
export interface CaseDrugHistory {
  id?: number;
  caseId: string;
  drugName?: string;
  mpid?: string;
  startDate?: string;
  endDate?: string;
  indication?: string;
  indicationCode?: string;
  reaction?: string;
  reactionCode?: string;
  sortOrder: number;
}

// Death Cause (B.1.9.2, B.1.9.4)
export interface CaseDeathCause {
  id?: number;
  caseId: string;
  causeType: 'reported' | 'autopsy';
  cause?: string;
  meddraCode?: string;
  sortOrder: number;
}

// Seriousness criteria
export interface ReactionSeriousness {
  death: boolean;
  lifeThreatening: boolean;
  hospitalization: boolean;
  disability: boolean;
  congenital: boolean;
  other: boolean;
}

// Reaction (B.2)
export interface CaseReaction {
  id?: number;
  caseId: string;
  assessmentSource?: number;
  reactionTerm: string;
  meddraCode?: string;
  meddraVersion?: string;
  nativeTerm?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  durationUnit?: string;
  seriousDeath: boolean;
  seriousLifeThreat: boolean;
  seriousHospitalization: boolean;
  seriousDisability: boolean;
  seriousCongenital: boolean;
  seriousOther: boolean;
  outcome?: ReactionOutcome;
  medicalConfirm?: boolean;
  sortOrder: number;
}

// Drug Substance (B.4.k.3)
export interface CaseDrugSubstance {
  id?: number;
  drugId: number;
  substanceName?: string;
  substanceCode?: string;
  strength?: number;
  strengthUnit?: string;
  sortOrder: number;
}

// Drug Dosage (B.4.k.4)
export interface CaseDrugDosage {
  id?: number;
  drugId: number;
  dose?: number;
  doseFirst?: number;
  doseLast?: number;
  doseUnit?: string;
  numUnits?: number;
  intervalUnit?: string;
  intervalDef?: string;
  dosageText?: string;
  pharmaForm?: string;
  route?: string;
  parentRoute?: string;
  sortOrder: number;
}

// Drug (B.4)
export interface CaseDrug {
  id?: number;
  caseId: string;
  characterization: DrugCharacterization;
  productName: string;
  mpid?: string;
  phpid?: string;
  cumulativeDose?: number;
  cumulativeUnit?: string;
  cumulativeFirst?: number;
  cumulativeFirstUnit?: string;
  gestationExposure?: number;
  indication?: string;
  indicationCode?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  durationUnit?: string;
  timeToOnset?: number;
  timeOnsetUnit?: string;
  actionTaken?: DrugActionTaken;
  dechallenge?: ChallengeResult;
  rechallenge?: ChallengeResult;
  additionalInfo?: string;
  sortOrder: number;
  substances?: CaseDrugSubstance[];
  dosages?: CaseDrugDosage[];

  // Source document fields (not part of E2B R3, but captured from Form 3500)
  ndcNumber?: string;
  manufacturerName?: string;
  lotNumber?: string;
  expirationDate?: string;

  // Phase 5: WHO Drug coding fields
  whodrugCode?: string;
  whodrugVersion?: string;
  atcCode?: string;
  atcName?: string;
  verbatimName?: string; // Original name as reported

  // SUSAR / IND Safety Report — per-drug IND fields (spec §3.2).
  // `indAuthorizationNumber` drives the G.k.3.1 <approval> block when set.
  // `fdaAdditionalDrugInfo` drives the G.k.10a.r <outboundRelationship2>
  // observation; required only for IND-Exempt BA/BE submissions.
  indAuthorizationNumber?: string;
  fdaAdditionalDrugInfo?: FdaAdditionalDrugInfo;
}

// Drug-Reaction Matrix (B.4.k.16)
export interface CaseDrugReactionMatrix {
  id?: number;
  drugId: number;
  reactionId: number;
  assessmentSource?: string;
  assessmentMethod?: string;
  assessmentResult?: string;
}

// Attachment
export interface CaseAttachment {
  id?: number;
  caseId: string;
  filename: string;
  fileType?: string;
  fileSize?: number;
  filePath?: string;
  description?: string;
  createdAt: string;
}

// Phase 3: Workflow status (more granular than CaseStatus)
// Phase 4: Added 'Pending PSR' and 'Included in PSR' for non-expedited workflow
export type WorkflowStatus =
  | 'Draft'
  | 'Data Entry Complete'
  | 'In Medical Review'
  | 'Medical Review Complete'
  | 'In QC Review'
  | 'QC Complete'
  | 'Approved'
  | 'Pending PSR'        // Phase 4: Non-expedited case approved, waiting for PSR
  | 'Included in PSR'    // Phase 4: Case linked to specific PSR
  | 'Submitted'
  | 'Acknowledged'
  | 'Rejected';

// Phase 3: Due date type
export type DueDateType = 'expedited' | 'non_expedited' | 'custom';

// Phase 6: Case Type
export type CaseType = 'postmarket' | 'ind' | 'babe';

// Phase 6: IND Report Type
export type INDReportType = '7_day' | '15_day' | 'followup_7day' | 'followup_15day' | 'annual_only';

/**
 * IND study block (E2B C.5.*, FDA.C.5.*) — populated for cases where
 * `caseType === 'ind'`. Drives the <researchStudy> emission under
 * primaryRole/subjectOf1 per SUSAR / IND Safety Report spec §4.4.
 * `indNumber` (FDA.C.5.5a) is the only required field; all others are
 * optional and suppressed from the XML when absent.
 */
export interface IndStudyInfo {
  indNumber: string;
  sponsorStudyNumber?: string;
  studyName?: string;
  studyRegistrationNumber?: string;
  crossReferencedIndNumbers?: string[];
}

/**
 * Drug role within a BA/BE study, per E2B G.k.10a.r. Populated only for
 * IND-Exempt BA/BE submissions; `NA` is the nullFlavor sentinel the spec
 * mandates for non-test/reference drugs in such studies.
 */
export type FdaAdditionalDrugInfo = 'TEST' | 'REFERENCE' | 'NA';

// Main Case structure
export interface Case {
  id: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  // Phase 3: Workflow and Assignment fields
  workflowStatus?: WorkflowStatus;
  createdBy?: string;
  currentOwner?: string;
  currentAssignee?: string;
  dueDate?: string;
  dueDateType?: DueDateType;
  rejectionCount?: number;
  lastRejectionReason?: string;

  // Report Information (A.1)
  safetyReportId?: string;
  reportType?: ReportType;
  initialOrFollowup?: ReportCategory;
  receiptDate?: string;
  receiveDate?: string;
  additionalDocs?: boolean;
  expeditedReport?: boolean;
  /** When true, sets C.1.3 = 2 (Report from study) and emits a minimal
   *  researchStudy block with C.5.4 = "Clinical trials" (code 1).
   *  Required by CDER 2.18 when C.1.3 = 2; omitting C.5.4 → CR+AR.
   *  Confirmed: TC-F04 ci260501170904 (2026-05-01). */
  studyReport?: boolean;
  worldwideCaseId?: string;
  nullificationType?: NullificationType;
  nullificationReason?: string;

  // Sender Information (A.3)
  senderType?: SenderType;
  senderOrganization?: string;
  senderDepartment?: string;
  senderGivenName?: string;
  senderFamilyName?: string;
  senderAddress?: string;
  senderCity?: string;
  senderState?: string;
  senderPostcode?: string;
  senderCountry?: string;
  senderPhone?: string;
  senderFax?: string;
  senderEmail?: string;

  // Patient Information (B.1)
  patientInitials?: string;
  patientGpRecord?: string;
  patientSpecialistRecord?: string;
  patientHospitalRecord?: string;
  patientInvestigation?: string;
  patientBirthdate?: string;
  patientAge?: number;
  patientAgeUnit?: AgeUnit;
  patientAgeGroup?: PatientAgeGroup;
  patientWeight?: number;
  patientHeight?: number;
  patientSex?: PatientSex;
  patientLmpDate?: string;
  patientRace?: PatientRace;
  patientEthnicity?: PatientEthnicity;

  // Medical History (D.7.2 / D.7.3) — free text narrative + concomitant flag
  medicalHistoryText?: string;
  hasConcomitantTherapy?: boolean;

  // C.1.7 Local Report Type Code (15-Day vs 7-Day expedited classification)
  localReportTypeCode?: LocalReportTypeCode;

  // Death Information (B.1.9)
  patientDeath: boolean;
  deathDate?: string;
  autopsyPerformed?: boolean;

  // Narrative (B.5)
  caseNarrative?: string;
  reporterComments?: string;
  senderComments?: string;
  senderDiagnosis?: string;

  // Metadata
  version: number;
  exportedAt?: string;
  exportedXmlPath?: string;

  // Phase 2: Submission Tracking
  submissionId?: number;
  lastSubmittedAt?: string;
  srpConfirmationNumber?: string;
  fdaCaseNumber?: string;
  acknowledgmentDate?: string;

  // Phase 2B: ESG API Submission Tracking
  esgSubmissionId?: string;
  esgCoreId?: string;
  apiSubmissionStartedAt?: string;
  apiLastError?: string;
  apiAttemptCount?: number;

  // Phase 4: Report Type Classification
  reportTypeClassification?: 'expedited' | 'non_expedited' | 'followup' | 'nullification';
  expeditedCriteria?: '15_day' | 'periodic' | 'remedial' | 'malfunction';
  isSerious?: boolean;
  /**
   * When true, the case is classified as non-serious (A.1.2 = 2) and all
   * seriousness criteria BL fields are intentionally false. Suppresses the
   * B.2.i.7 "at least one criterion required" validator finding so legitimate
   * non-serious adverse-event reports can submit. Empirical evidence: TC-G01
   * golden XML (CA+AA, ci260501225706) — see
   * `test/golden/postmarket/accepted/xml/TC-G01-nonserous.xml`.
   */
  overallNonSerious?: boolean;
  expectedness?: 'expected' | 'unexpected' | 'unknown';
  // expectednessJustification is declared in the Phase 6 IND block below.

  // Phase 4: Follow-up
  parentCaseId?: string;
  caseVersion?: number;
  followupType?: 'additional_info' | 'outcome_update' | 'correction' | 'fda_response' | 'upgrade_serious' | 'downgrade';
  followupInfoDate?: string;

  // Phase 4: Nullification
  isNullified?: boolean;
  nullificationReasonCode?: 'duplicate' | 'error' | 'not_ae' | 'wrong_product' | 'consent_withdrawn';
  nullificationReference?: string;

  // Phase 4: Product link
  productId?: number;

  // Phase 6: IND Safety Report fields
  caseType?: CaseType;
  studyId?: number;
  siteId?: number;
  subjectNumber?: string;
  isBlinded?: boolean;
  treatmentArm?: string;
  studyDayOnset?: number;
  firstDoseDate?: string;
  lastDoseDate?: string;
  dateInformed?: string;
  isExpected?: boolean;
  expectednessIbVersion?: string;
  expectednessIbSection?: string;
  expectednessJustification?: string;
  indReportType?: INDReportType;

  // SUSAR / IND Safety Report — researchStudy block. Present when
  // caseType === 'ind'. Required at XML generation time if caseType is
  // 'ind'; the validator enforces `indStudy.indNumber` per spec §3.1.
  indStudy?: IndStudyInfo;

  // Related data (loaded separately)
  reporters?: CaseReporter[];
  identifiers?: CaseIdentifier[];
  relatedReports?: CaseRelatedReport[];
  medicalHistory?: CaseMedicalHistory[];
  drugHistory?: CaseDrugHistory[];
  deathCauses?: CaseDeathCause[];
  reactions?: CaseReaction[];
  drugs?: CaseDrug[];
  attachments?: CaseAttachment[];
}

// Case list item (summary view)
export interface CaseListItem {
  id: string;
  status: CaseStatus;
  patientInitials?: string;
  productName?: string;
  createdAt: string;
  updatedAt: string;
  // Phase 2: Submission tracking fields
  exportedAt?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  srpConfirmationNumber?: string;
  fdaCaseNumber?: string;
  // Phase 3: Workflow and assignment fields
  workflowStatus?: WorkflowStatus;
  currentAssignee?: string;
  currentAssigneeName?: string;
  dueDate?: string;
  dueDateType?: DueDateType;
  isOverdue?: boolean;
  daysUntilDue?: number;
  // Phase 4: Report type classification
  reportTypeClassification?: 'expedited' | 'non_expedited' | 'followup' | 'nullification';
  isSerious?: boolean;
  parentCaseId?: string;
  caseVersion?: number;
  // Phase 6: IND fields
  caseType?: CaseType;
  indReportType?: INDReportType;
  studyProtocol?: string;
  dateInformed?: string;
}

// Create case DTO
export interface CreateCaseDTO {
  safetyReportId?: string;
  reportType?: ReportType;
  initialOrFollowup?: ReportCategory;
}

// Update case DTO (partial case data)
export type UpdateCaseDTO = Partial<Omit<Case, 'id' | 'createdAt' | 'version'>>;

// Case filter options
export interface CaseFilterOptions {
  status?: CaseStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Validation result
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================
// Phase 2: Submission Environment Types
// ============================================================

// Submission environment - For workflow tracking only (Test vs Production submission in FDA ESG NextGen USP)
// Note: XML routing identifiers are the SAME for test and production when using USP
export type SubmissionEnvironment = 'Test' | 'Production';

// Submission report type - affects routing identifiers (Postmarket vs Premarket)
export type SubmissionReportType = 'Postmarket' | 'Premarket';

// Target FDA center
export type TargetCenter = 'CDER' | 'CBER';

// Sender identifier type - determines which OID is used in the XML
export type SenderIdentifierType = 'senderId' | 'duns';

// OID for default sender identifier (FDA-assigned)
export const SENDER_OID_DEFAULT = '2.16.840.1.113883.3.989.2.1.3.13';

// OID for DUNS number (Dun & Bradstreet Data Universal Numbering System)
export const SENDER_OID_DUNS = '1.3.6.1.4.1.519.1';

// Batch receiver identifiers (N.1.4) for the FDA ESG NextGen gateway.
// Both pathways follow the same `_TST` suffix convention for the test
// environment.
//
// Empirical history (read this before changing any of these values):
//   v1: codebase had Test.Premarket = 'ZZFDATST_PREMKT' (correct).
//   v2: a pre-submission gap analysis (IND-SUSAR-XML-Gap-Analysis.docx,
//       Apr 24 2026) asserted that test and production share the same
//       Premarket value; we flipped to 'ZZFDA_PREMKT' in commit 26df8f0.
//   v3: real FDA ACK3 on IND-T01 (2026-04-27, GAP-IND-001) returned CR+AR
//       with the error "File sent with AS2 header 'CDER_IND' must have
//       N.1.4 = 'ZZFDATST_PREMKT'". The pre-submission gap analysis was
//       wrong; v1 was right; this is back to that.
// Lesson: don't change values like these on the basis of a non-empirical
// gap analysis. Wait for an ACK3 — the empirical policy is the source
// of truth, not the spec interpretation.
export const BATCH_RECEIVERS: Record<SubmissionEnvironment, Record<SubmissionReportType, string>> = {
  Test: {
    Postmarket: 'ZZFDATST',
    Premarket: 'ZZFDATST_PREMKT'
  },
  Production: {
    Postmarket: 'ZZFDA',
    Premarket: 'ZZFDA_PREMKT'
  }
};

// Message receiver identifiers based on target center and report type
export const MESSAGE_RECEIVERS: Record<SubmissionReportType, Record<TargetCenter, string>> = {
  Postmarket: {
    CDER: 'CDER',
    CBER: 'CBER'
  },
  Premarket: {
    CDER: 'CDER_IND',
    CBER: 'CBER_IND'
  }
};

// ============================================================
// Phase 2: Submission Tracking Types
// ============================================================

// Submission History Entry (append-only log)
export interface SubmissionHistoryEntry {
  id?: number;
  caseId: string;
  eventType: SubmissionEventType;
  timestamp: string;
  details?: string; // JSON string for event-specific data
  notes?: string;
  userId?: string; // Future: user tracking
}

// Submission Record (tracks FDA ESG NextGen USP submission details)
export interface SubmissionRecord {
  id?: number;
  caseId: string;
  srpConfirmationNumber?: string;
  submissionDate?: string;
  acknowledgmentDate?: string;
  acknowledgmentType?: AcknowledgmentType;
  fdaCaseNumber?: string; // FDA-assigned case number on acceptance
  rejectionReason?: string;
  exportedFilename?: string;
  exportedFilePath?: string;
  submissionEnvironment?: SubmissionEnvironment; // Test or Production
  submissionReportType?: SubmissionReportType; // Postmarket or Premarket
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Export Sequence Tracking (for FDA filename generation)
export interface ExportSequence {
  date: string; // YYYYMMDD
  lastSequence: number;
}

// Application Settings
export interface AppSettings {
  senderId: string;
  senderOrganization?: string;
  // Default sender address fields — auto-populate new cases
  senderAddress?: string;
  senderCity?: string;
  senderState?: string;
  senderPostcode?: string;
  senderCountry?: string;
  // Sender identifier type: 'senderId' (FDA-assigned) or 'duns' (DUNS number)
  senderIdentifierType: SenderIdentifierType;
  dunsNumber?: string;
  defaultExportPath?: string;
  autoValidateOnExport: boolean;
  warnOnExportWithWarnings: boolean;
  // Environment settings
  submissionEnvironment: SubmissionEnvironment;
  submissionReportType: SubmissionReportType;
  targetCenter: TargetCenter;
  // Track if user has confirmed production mode
  productionModeConfirmed: boolean;

  // Phase 2B: ESG API Settings
  esgApiConfigured?: boolean;
  esgApiEnvironment?: SubmissionEnvironment;
  esgSenderCompanyName?: string;
  esgSenderContactName?: string;
  esgSenderContactEmail?: string;
  esgPollingIntervalMinutes?: number;
  esgPollingTimeoutHours?: number;
  esgMaxAutomaticRetries?: number;
  esgMaxTotalAttempts?: number;
}

// Dashboard Statistics
export interface DashboardStats {
  totalCases: number;
  statusCounts: Record<CaseStatus, number>;
  needsAttention: NeedsAttentionItem[];
  recentActivity: RecentActivityItem[];
}

// Cases needing attention (for dashboard)
// Phase 2B: Added API submission failure and ACK timeout reasons
export interface NeedsAttentionItem {
  caseId: string;
  reason: 'exported_not_submitted' | 'submitted_no_ack' | 'rejected' | 'submission_failed' | 'awaiting_ack_timeout';
  daysSinceEvent: number;
  lastEventDate: string;
}

// Recent activity item (for dashboard feed)
export interface RecentActivityItem {
  caseId: string;
  eventType: SubmissionEventType;
  timestamp: string;
  description: string;
}
