/**
 * Batch Submission Types
 * Phase 4: Batch Submission for Multiple ICSRs
 */

// Batch type categorization
export type BatchType = 'expedited' | 'non_expedited' | 'psr' | 'followup';

// Batch status values
export type BatchStatus =
  | 'created'     // Batch created, cases selected
  | 'validating'  // Validation in progress
  | 'validated'   // All cases validated successfully
  | 'validation_failed' // One or more cases failed validation
  | 'exporting'   // XML generation in progress
  | 'exported'    // XML generated and ready for submission
  | 'submitted'   // Submitted to FDA ESG
  | 'acknowledged'// Acknowledgment received from FDA
  | 'rejected'    // FDA rejected the batch
  | 'failed';     // Submission failed

// Labels for batch types
export const BATCH_TYPE_LABELS: Record<BatchType, string> = {
  expedited: 'Expedited ICSRs',
  non_expedited: 'Non-Expedited ICSRs',
  psr: 'Periodic Safety Report',
  followup: 'Follow-up Reports'
};

// Labels for batch statuses
export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  created: 'Created',
  validating: 'Validating',
  validated: 'Validated',
  validation_failed: 'Validation Failed',
  exporting: 'Exporting',
  exported: 'Exported',
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  rejected: 'Rejected',
  failed: 'Failed'
};

// Status colors for UI
export const BATCH_STATUS_COLORS: Record<BatchStatus, string> = {
  created: 'default',
  validating: 'processing',
  validated: 'success',
  validation_failed: 'error',
  exporting: 'processing',
  exported: 'cyan',
  submitted: 'blue',
  acknowledged: 'green',
  rejected: 'red',
  failed: 'error'
};

// Submission batch record
export interface SubmissionBatch {
  id: number;
  batchNumber: string;
  batchType: BatchType;
  caseCount: number;
  validCaseCount?: number;
  invalidCaseCount?: number;
  xmlFilename?: string;
  xmlFilePath?: string;
  status: BatchStatus;
  submissionMode?: 'test' | 'production';
  esgCoreId?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  ackType?: 'accepted' | 'rejected' | 'partial';
  ackDetails?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// Batch case record
export interface BatchCase {
  batchId: number;
  caseId: string;
  validationStatus: 'pending' | 'valid' | 'invalid';
  validationErrors?: string[];
  addedAt: string;
  // Joined case info
  safetyReportId?: string;
  patientInitials?: string;
  reportType?: string;
  workflowStatus?: string;
}

// List item for batch display
export interface BatchListItem {
  id: number;
  batchNumber: string;
  batchType: BatchType;
  caseCount: number;
  validCaseCount: number;
  invalidCaseCount: number;
  status: BatchStatus;
  submissionMode?: 'test' | 'production';
  createdByName?: string;
  createdAt: string;
  submittedAt?: string;
  acknowledgedAt?: string;
}

// Request to create a batch
export interface CreateBatchRequest {
  batchType: BatchType;
  caseIds: string[];
  notes?: string;
  submissionMode?: 'test' | 'production';
}

// Response from creating a batch
export interface CreateBatchResponse {
  batch: SubmissionBatch;
  cases: BatchCase[];
}

// Request to validate a batch
export interface ValidateBatchRequest {
  batchId: number;
}

// Validation result for a batch
export interface BatchValidationResult {
  batchId: number;
  totalCases: number;
  validCases: number;
  invalidCases: number;
  caseResults: BatchCaseValidationResult[];
  isValid: boolean;
}

// Validation result for individual case in batch
export interface BatchCaseValidationResult {
  caseId: string;
  safetyReportId?: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Request to export batch XML
export interface ExportBatchRequest {
  batchId: number;
  exportPath: string;
}

// Response from exporting batch
export interface ExportBatchResponse {
  batchId: number;
  filename: string;
  filePath: string;
  caseCount: number;
  xmlSize: number;
}

// Request to record batch submission
export interface RecordBatchSubmissionRequest {
  batchId: number;
  esgCoreId: string;
  submissionDate: string;
  notes?: string;
}

// Request to record batch acknowledgment
export interface RecordBatchAcknowledgmentRequest {
  batchId: number;
  ackType: 'accepted' | 'rejected' | 'partial';
  acknowledgmentDate: string;
  ackDetails?: string;
  notes?: string;
}

// Filter options for batch list
export interface BatchFilter {
  batchType?: BatchType;
  status?: BatchStatus;
  submissionMode?: 'test' | 'production';
  fromDate?: string;
  toDate?: string;
  createdBy?: string;
  search?: string;
}

// Batch list response with pagination
export interface BatchListResponse {
  batches: BatchListItem[];
  total: number;
}

// Case eligibility for batch inclusion
export interface BatchCaseEligibility {
  caseId: string;
  safetyReportId?: string;
  patientInitials?: string;
  reportTypeClassification?: string;
  workflowStatus?: string;
  isEligible: boolean;
  eligibilityReason?: string;
  alreadyInBatch?: boolean;
  existingBatchId?: number;
}

// Get eligible cases request
export interface GetEligibleCasesRequest {
  batchType: BatchType;
}

// Get eligible cases response
export interface GetEligibleCasesResponse {
  cases: BatchCaseEligibility[];
  total: number;
}
