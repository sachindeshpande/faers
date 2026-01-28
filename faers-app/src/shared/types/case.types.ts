/**
 * FAERS Case Types - E2B(R3) compliant data structures
 */

// Case status enum - Phase 2: Extended for FDA ESG NextGen USP submission workflow
export type CaseStatus =
  | 'Draft'
  | 'Ready for Export'
  | 'Exported'
  | 'Submitted'
  | 'Acknowledged'
  | 'Rejected';

// Submission History Event Types (Phase 2)
export type SubmissionEventType =
  | 'created'
  | 'marked_ready'
  | 'returned_to_draft'
  | 'exported'
  | 'submitted'
  | 'acknowledged'
  | 'rejected';

// Acknowledgment Type (Phase 2)
export type AcknowledgmentType = 'Accepted' | 'Rejected';

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

  // Phase 4: Report Type Classification
  reportTypeClassification?: 'expedited' | 'non_expedited' | 'followup' | 'nullification';
  expeditedCriteria?: '15_day' | 'periodic' | 'remedial' | 'malfunction';
  isSerious?: boolean;
  expectedness?: 'expected' | 'unexpected' | 'unknown';
  expectednessJustification?: string;

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

// Batch receiver identifiers for FDA ESG NextGen USP
// Note: These are the SAME for both Test and Production environments when using USP
// The distinction between test/production is made in the FDA portal, not in the XML
export const BATCH_RECEIVERS: Record<SubmissionReportType, string> = {
  Postmarket: 'ZZFDA',
  Premarket: 'ZZFDA_PREMKT'
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
  defaultExportPath?: string;
  autoValidateOnExport: boolean;
  warnOnExportWithWarnings: boolean;
  // Environment settings
  submissionEnvironment: SubmissionEnvironment;
  submissionReportType: SubmissionReportType;
  targetCenter: TargetCenter;
  // Track if user has confirmed production mode
  productionModeConfirmed: boolean;
}

// Dashboard Statistics
export interface DashboardStats {
  totalCases: number;
  statusCounts: Record<CaseStatus, number>;
  needsAttention: NeedsAttentionItem[];
  recentActivity: RecentActivityItem[];
}

// Cases needing attention (for dashboard)
export interface NeedsAttentionItem {
  caseId: string;
  reason: 'exported_not_submitted' | 'submitted_no_ack' | 'rejected';
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
