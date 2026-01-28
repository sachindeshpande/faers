/**
 * Follow-up and Nullification Types
 * Phase 4: Follow-Up Reports and Nullification Reports
 */

// Follow-up type categorization
export type FollowupType =
  | 'additional_info'    // New information received
  | 'outcome_update'     // Patient outcome changed
  | 'correction'         // Correction to previously submitted data
  | 'fda_response'       // Response to FDA request
  | 'upgrade_serious'    // Case upgraded to serious
  | 'downgrade';         // Case downgraded from serious

// Nullification reason codes
export type NullificationReason =
  | 'duplicate'          // Duplicate of another case
  | 'error'              // Case created in error
  | 'not_ae'             // Not an adverse event
  | 'wrong_product'      // Wrong product assigned
  | 'consent_withdrawn'; // Patient consent withdrawn

// Labels for follow-up types
export const FOLLOWUP_TYPE_LABELS: Record<FollowupType, string> = {
  additional_info: 'Additional Information',
  outcome_update: 'Outcome Update',
  correction: 'Correction',
  fda_response: 'Response to FDA Request',
  upgrade_serious: 'Upgrade to Serious',
  downgrade: 'Downgrade from Serious'
};

// Labels for nullification reasons
export const NULLIFICATION_REASON_LABELS: Record<NullificationReason, string> = {
  duplicate: 'Duplicate of another case',
  error: 'Case created in error',
  not_ae: 'Not an adverse event',
  wrong_product: 'Wrong product assigned',
  consent_withdrawn: 'Patient consent withdrawn'
};

// Case version record for version history
export interface CaseVersion {
  caseId: string;
  version: number;
  parentCaseId?: string;
  followupType?: FollowupType;
  followupInfoDate?: string;
  status: string;
  workflowStatus?: string;
  isNullified?: boolean;
  nullificationReason?: NullificationReason;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
}

// Request to create a follow-up case
export interface CreateFollowupRequest {
  parentCaseId: string;
  followupType: FollowupType;
  followupInfoDate: string; // Date when new information was received
  copyAllData?: boolean;    // Whether to copy all data from parent
}

// Response from creating a follow-up
export interface CreateFollowupResponse {
  caseId: string;
  version: number;
  followupType: FollowupType;
  parentCaseId: string;
}

// Request to create a nullification report
export interface CreateNullificationRequest {
  originalCaseId: string;
  nullificationReason: NullificationReason;
  nullificationReference?: string; // e.g., reference to duplicate case ID
  notes?: string;
}

// Response from creating a nullification
export interface CreateNullificationResponse {
  caseId: string;
  originalCaseId: string;
  nullificationReason: NullificationReason;
}

// Case version chain (for timeline display)
export interface CaseVersionChain {
  originalCaseId: string;
  versions: CaseVersion[];
  totalVersions: number;
  isNullified: boolean;
  nullifiedAt?: string;
  nullifiedBy?: string;
  nullificationReason?: NullificationReason;
}

// Comparison between two versions
export interface VersionFieldChange {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  section: string;
}

export interface VersionComparison {
  fromVersion: number;
  toVersion: number;
  fromCaseId: string;
  toCaseId: string;
  changes: VersionFieldChange[];
  totalChanges: number;
}

// Follow-up due date calculation
export interface FollowupDueDate {
  caseId: string;
  followupType: FollowupType;
  isExpedited: boolean;
  dueDate: string;
  daysRemaining: number;
  isOverdue: boolean;
}
