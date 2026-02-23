/**
 * Bulk Import Types
 * Phase 5: Bulk Import
 */

// Import job status
export type ImportStatus =
  | 'pending'
  | 'uploaded'
  | 'mapping'
  | 'validating'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Import row status
export type ImportRowStatus = 'pending' | 'valid' | 'warning' | 'error' | 'imported' | 'skipped';

// Column mapping configuration
export interface ColumnMapping {
  fileColumn: string;
  caseField?: string;
  transformation?: string;
  defaultValue?: unknown;
  dateFormat?: string;
  valueMapping?: Record<string, string>; // For mapping values like "M" -> "Male"
}

// Value transformation rule
export interface TransformationRule {
  type: 'date_format' | 'value_map' | 'concatenate' | 'split' | 'trim' | 'uppercase' | 'lowercase' | 'meddra_lookup' | 'whodrug_lookup';
  params?: Record<string, unknown>;
}

// Import job entity
export interface ImportJob {
  id: number;
  filename: string;
  filePath: string;
  fileSize?: number;
  rowCount?: number;
  columnCount?: number;
  status: ImportStatus;
  columnMapping?: ColumnMapping[];
  transformationRules?: Record<string, TransformationRule>;
  validationSummary?: ImportValidationSummary;
  importedCount: number;
  errorCount: number;
  warningCount: number;
  skippedCount: number;
  createdBy?: string;
  createdByName?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// Import job list item
export interface ImportJobListItem {
  id: number;
  filename: string;
  fileSize?: number;
  rowCount?: number;
  status: ImportStatus;
  importedCount: number;
  errorCount: number;
  createdByName?: string;
  createdAt: string;
  completedAt?: string;
}

// Validation summary
export interface ImportValidationSummary {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  errors: ImportValidationError[];
}

// Validation error detail
export interface ImportValidationError {
  rowNumber: number;
  columnName?: string;
  fieldPath?: string;
  errorType: 'required' | 'format' | 'invalid_value' | 'duplicate' | 'coding' | 'other';
  message: string;
  value?: unknown;
  severity: 'error' | 'warning';
}

// Import row result
export interface ImportRowResult {
  rowNumber: number;
  status: ImportRowStatus;
  caseId?: string;
  errors?: ImportValidationError[];
  warnings?: ImportValidationError[];
}

// File preview data
export interface FilePreview {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  delimiter?: string;
  encoding?: string;
}

// Upload response
export interface ImportUploadResponse {
  jobId: number;
  filename: string;
  fileSize: number;
  preview: FilePreview;
}

// Importable field definition
export interface ImportableField {
  fieldPath: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'boolean' | 'coded';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  codedType?: 'meddra' | 'whodrug';
  example?: string;
}

// Execute import options
export interface ImportExecuteOptions {
  skipErrors: boolean;
  defaultStatus?: string;
  assignTo?: string;
  runDuplicateCheck?: boolean;
  autoCodeMeddra?: boolean;
  autoCodeWhodrug?: boolean;
}

// Execute import request
export interface ImportExecuteRequest {
  jobId: number;
  options: ImportExecuteOptions;
}

// Execute import result
export interface ImportExecuteResult {
  success: boolean;
  jobId: number;
  importedCount: number;
  errorCount: number;
  skippedCount: number;
  caseIds: string[];
  errors?: ImportValidationError[];
}

// Saved column mapping
export interface SavedColumnMapping {
  id: number;
  name: string;
  description?: string;
  mapping: ColumnMapping[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Status labels
export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  pending: 'Pending',
  uploaded: 'Uploaded',
  mapping: 'Mapping Columns',
  validating: 'Validating',
  importing: 'Importing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled'
};

// Status colors
export const IMPORT_STATUS_COLORS: Record<ImportStatus, string> = {
  pending: 'default',
  uploaded: 'processing',
  mapping: 'processing',
  validating: 'processing',
  importing: 'processing',
  completed: 'success',
  failed: 'error',
  cancelled: 'default'
};

// Row status labels
export const IMPORT_ROW_STATUS_LABELS: Record<ImportRowStatus, string> = {
  pending: 'Pending',
  valid: 'Valid',
  warning: 'Warning',
  error: 'Error',
  imported: 'Imported',
  skipped: 'Skipped'
};

// Row status colors
export const IMPORT_ROW_STATUS_COLORS: Record<ImportRowStatus, string> = {
  pending: 'default',
  valid: 'success',
  warning: 'warning',
  error: 'error',
  imported: 'success',
  skipped: 'default'
};

// Importable case fields definition
export const IMPORTABLE_FIELDS: ImportableField[] = [
  // Patient Information
  { fieldPath: 'patient_initials', label: 'Patient Initials', type: 'text', example: 'J.S.' },
  { fieldPath: 'patient_birthdate', label: 'Patient Date of Birth', type: 'date', example: '1985-03-15' },
  { fieldPath: 'patient_age', label: 'Patient Age', type: 'number', example: '45' },
  { fieldPath: 'patient_age_unit', label: 'Age Unit', type: 'select', options: [
    { value: '801', label: 'Years' },
    { value: '802', label: 'Months' },
    { value: '803', label: 'Weeks' },
    { value: '804', label: 'Days' }
  ]},
  { fieldPath: 'patient_sex', label: 'Patient Sex', type: 'select', options: [
    { value: '1', label: 'Male' },
    { value: '2', label: 'Female' },
    { value: '0', label: 'Unknown' }
  ]},
  { fieldPath: 'patient_weight', label: 'Patient Weight (kg)', type: 'number', example: '70' },
  { fieldPath: 'patient_height', label: 'Patient Height (cm)', type: 'number', example: '175' },

  // Reaction Information
  { fieldPath: 'reaction_term', label: 'Reaction Term (Verbatim)', type: 'text', required: true, example: 'Headache' },
  { fieldPath: 'reaction_meddra_code', label: 'Reaction MedDRA PT Code', type: 'coded', codedType: 'meddra', example: '10019211' },
  { fieldPath: 'reaction_start_date', label: 'Reaction Start Date', type: 'date', example: '2026-01-15' },
  { fieldPath: 'reaction_end_date', label: 'Reaction End Date', type: 'date' },
  { fieldPath: 'reaction_outcome', label: 'Reaction Outcome', type: 'select', options: [
    { value: '1', label: 'Recovered/Resolved' },
    { value: '2', label: 'Recovering/Resolving' },
    { value: '3', label: 'Not Recovered/Not Resolved' },
    { value: '4', label: 'Recovered with Sequelae' },
    { value: '5', label: 'Fatal' },
    { value: '0', label: 'Unknown' }
  ]},

  // Seriousness
  { fieldPath: 'serious_death', label: 'Serious - Death', type: 'boolean', example: 'Yes/No or 1/0' },
  { fieldPath: 'serious_life_threat', label: 'Serious - Life Threatening', type: 'boolean' },
  { fieldPath: 'serious_hospitalization', label: 'Serious - Hospitalization', type: 'boolean' },
  { fieldPath: 'serious_disability', label: 'Serious - Disability', type: 'boolean' },
  { fieldPath: 'serious_congenital', label: 'Serious - Congenital Anomaly', type: 'boolean' },
  { fieldPath: 'serious_other', label: 'Serious - Other', type: 'boolean' },

  // Product/Drug Information
  { fieldPath: 'product_name', label: 'Product Name', type: 'text', required: true, example: 'Aspirin' },
  { fieldPath: 'drug_characterization', label: 'Drug Role', type: 'select', options: [
    { value: '1', label: 'Suspect' },
    { value: '2', label: 'Concomitant' },
    { value: '3', label: 'Interacting' }
  ]},
  { fieldPath: 'drug_indication', label: 'Indication', type: 'text', example: 'Headache' },
  { fieldPath: 'drug_start_date', label: 'Drug Start Date', type: 'date' },
  { fieldPath: 'drug_end_date', label: 'Drug End Date', type: 'date' },
  { fieldPath: 'drug_dose', label: 'Dose', type: 'text', example: '100 mg' },
  { fieldPath: 'drug_route', label: 'Route of Administration', type: 'text', example: 'Oral' },
  { fieldPath: 'drug_action_taken', label: 'Action Taken', type: 'select', options: [
    { value: '1', label: 'Drug Withdrawn' },
    { value: '2', label: 'Dose Reduced' },
    { value: '3', label: 'Dose Increased' },
    { value: '4', label: 'Dose Not Changed' },
    { value: '0', label: 'Unknown' }
  ]},

  // Reporter Information
  { fieldPath: 'reporter_given_name', label: 'Reporter First Name', type: 'text' },
  { fieldPath: 'reporter_family_name', label: 'Reporter Last Name', type: 'text' },
  { fieldPath: 'reporter_qualification', label: 'Reporter Qualification', type: 'select', options: [
    { value: '1', label: 'Physician' },
    { value: '2', label: 'Pharmacist' },
    { value: '3', label: 'Other Health Professional' },
    { value: '4', label: 'Lawyer' },
    { value: '5', label: 'Consumer' }
  ]},
  { fieldPath: 'reporter_country', label: 'Reporter Country', type: 'text', example: 'US' },

  // Report Information
  { fieldPath: 'receipt_date', label: 'Receipt Date', type: 'date', required: true },
  { fieldPath: 'report_type', label: 'Report Type', type: 'select', options: [
    { value: '1', label: 'Spontaneous' },
    { value: '2', label: 'Literature' },
    { value: '3', label: 'Study' },
    { value: '4', label: 'Other' }
  ]},

  // Narrative
  { fieldPath: 'case_narrative', label: 'Case Narrative', type: 'text' }
];

// Common date formats for parsing
export const COMMON_DATE_FORMATS = [
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY/MM/DD',
  'MM-DD-YYYY',
  'DD-MM-YYYY',
  'YYYYMMDD',
  'M/D/YYYY',
  'D/M/YYYY'
];

// File size limits
export const MAX_FILE_SIZE_MB = 50;
export const MAX_ROWS = 10000;
export const SUPPORTED_FILE_TYPES = ['.csv', '.xlsx', '.xls'];
