/**
 * Duplicate Detection Types
 * Phase 5: Duplicate Detection & Resolution
 */

// Duplicate candidate status
export type DuplicateStatus = 'pending' | 'dismissed' | 'confirmed' | 'merged';

// Resolution action taken
export type DuplicateResolution =
  | 'not_duplicate'  // Dismissed - not a duplicate
  | 'duplicate'      // Confirmed as duplicate, linked
  | 'related'        // Same patient, different events
  | 'merged';        // Cases merged into one

// Matching criterion with weight and result
export interface MatchingCriterion {
  criterion: string;
  label: string;
  weight: number;
  matched: boolean;
  value1?: unknown;
  value2?: unknown;
  similarity?: number; // 0-1 for fuzzy matches
}

// Duplicate candidate record
export interface DuplicateCandidate {
  id: number;
  caseId1: string;
  caseId2: string;
  similarityScore: number; // 0-100
  matchingCriteria: MatchingCriterion[];
  status: DuplicateStatus;
  resolution?: DuplicateResolution;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  detectedAt: string;
}

// Result of duplicate check
export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  candidates: DuplicateCandidate[];
  highestScore: number;
  totalChecked: number;
  checkDurationMs: number;
}

// Merge field selection
export interface MergeFieldSelection {
  fieldPath: string;
  fieldLabel: string;
  sourceCase: 'case1' | 'case2';
  value1?: unknown;
  value2?: unknown;
}

// Merge request
export interface MergeCasesRequest {
  masterCaseId: string;
  sourceCaseId: string;
  fieldSelections: MergeFieldSelection[];
  notes?: string;
}

// Merge result
export interface MergeCasesResult {
  success: boolean;
  mergedCaseId: string;
  fieldsFromMaster: number;
  fieldsFromSource: number;
  error?: string;
}

// Merged case record
export interface MergedCase {
  id: number;
  masterCaseId: string;
  mergedCaseId: string;
  mergedBy?: string;
  mergedByName?: string;
  mergedAt: string;
  fieldSources: MergeFieldSelection[];
}

// Duplicate registry filter
export interface DuplicateFilter {
  status?: DuplicateStatus;
  resolution?: DuplicateResolution;
  minScore?: number;
  maxScore?: number;
  fromDate?: string;
  toDate?: string;
  caseId?: string;
  resolvedBy?: string;
}

// Duplicate registry list item
export interface DuplicateListItem {
  id: number;
  caseId1: string;
  caseId2: string;
  case1SafetyReportId?: string;
  case2SafetyReportId?: string;
  case1PatientInitials?: string;
  case2PatientInitials?: string;
  similarityScore: number;
  status: DuplicateStatus;
  resolution?: DuplicateResolution;
  resolvedByName?: string;
  detectedAt: string;
  resolvedAt?: string;
}

// Batch duplicate scan request
export interface BatchDuplicateScanRequest {
  filter?: {
    status?: string[];
    fromDate?: string;
    toDate?: string;
    productName?: string;
  };
  threshold?: number;
}

// Batch duplicate scan result
export interface BatchDuplicateScanResult {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  casesScanned: number;
  totalCases: number;
  duplicatesFound: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// Default matching criteria weights
export const DEFAULT_MATCHING_CRITERIA = [
  { criterion: 'patient_id', label: 'Patient Identifier', weight: 30, matchType: 'exact' },
  { criterion: 'patient_initials_dob', label: 'Patient Initials + DOB', weight: 25, matchType: 'exact' },
  { criterion: 'product_name', label: 'Product Name', weight: 15, matchType: 'fuzzy' },
  { criterion: 'reaction_pt', label: 'Reaction (PT)', weight: 15, matchType: 'fuzzy' },
  { criterion: 'event_date', label: 'Event Date', weight: 10, matchType: 'fuzzy', tolerance: 7 },
  { criterion: 'reporter', label: 'Reporter Name', weight: 5, matchType: 'fuzzy' }
];

// Duplicate check settings
export interface DuplicateCheckSettings {
  enabled: boolean;
  checkOnSave: boolean;
  checkOnSubmit: boolean;
  threshold: number; // 0-100
  maxCandidates: number;
  dateTolerance: number; // days
  criteria: typeof DEFAULT_MATCHING_CRITERIA;
}

// Default settings
export const DEFAULT_DUPLICATE_SETTINGS: DuplicateCheckSettings = {
  enabled: true,
  checkOnSave: true,
  checkOnSubmit: true,
  threshold: 70,
  maxCandidates: 5,
  dateTolerance: 7,
  criteria: DEFAULT_MATCHING_CRITERIA
};

// Status labels
export const DUPLICATE_STATUS_LABELS: Record<DuplicateStatus, string> = {
  pending: 'Pending Review',
  dismissed: 'Dismissed',
  confirmed: 'Confirmed Duplicate',
  merged: 'Merged'
};

// Resolution labels
export const DUPLICATE_RESOLUTION_LABELS: Record<DuplicateResolution, string> = {
  not_duplicate: 'Not a Duplicate',
  duplicate: 'Confirmed Duplicate',
  related: 'Related Case',
  merged: 'Merged'
};

// Status colors for UI
export const DUPLICATE_STATUS_COLORS: Record<DuplicateStatus, string> = {
  pending: 'orange',
  dismissed: 'default',
  confirmed: 'red',
  merged: 'blue'
};
