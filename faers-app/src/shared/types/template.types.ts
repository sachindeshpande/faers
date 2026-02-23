/**
 * Case Template Types
 * Phase 5: Case Templates
 */

// Template categories
export type TemplateCategory =
  | 'vaccine'
  | 'medication_error'
  | 'device_malfunction'
  | 'overdose'
  | 'pediatric'
  | 'pregnancy'
  | 'product_specific'
  | 'other';

// Full template entity
export interface CaseTemplate {
  id: number;
  name: string;
  description?: string;
  category?: TemplateCategory;
  templateData: Record<string, unknown>;
  lockedFields?: string[];
  requiredFields?: string[];
  createdBy?: string;
  createdByName?: string;
  isGlobal: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  usageCount: number;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Template list item (summary)
export interface TemplateListItem {
  id: number;
  name: string;
  description?: string;
  category?: TemplateCategory;
  createdBy?: string;
  createdByName?: string;
  isGlobal: boolean;
  isApproved: boolean;
  usageCount: number;
  updatedAt: string;
}

// Create template request
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category?: TemplateCategory;
  templateData: Record<string, unknown>;
  lockedFields?: string[];
  requiredFields?: string[];
  isGlobal?: boolean;
}

// Update template request
export interface UpdateTemplateRequest {
  id: number;
  name?: string;
  description?: string;
  category?: TemplateCategory;
  templateData?: Record<string, unknown>;
  lockedFields?: string[];
  requiredFields?: string[];
  isActive?: boolean;
}

// Template usage record
export interface TemplateUsage {
  id: number;
  templateId: number;
  caseId: string;
  usedBy?: string;
  usedByName?: string;
  usedAt: string;
}

// Template filter options
export interface TemplateFilter {
  category?: TemplateCategory;
  isGlobal?: boolean;
  isApproved?: boolean;
  createdBy?: string;
  search?: string;
  isActive?: boolean;
}

// Field lock configuration
export interface TemplateLockConfig {
  fieldPath: string;
  fieldLabel: string;
  isLocked: boolean;
  isRequired: boolean;
}

// Apply template result
export interface ApplyTemplateResult {
  success: boolean;
  caseId?: string;
  templateId: number;
  templateName: string;
  fieldsApplied: number;
  lockedFields: string[];
  error?: string;
}

// Category labels
export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  vaccine: 'Vaccine Reactions',
  medication_error: 'Medication Errors',
  device_malfunction: 'Device Malfunctions',
  overdose: 'Overdose Cases',
  pediatric: 'Pediatric',
  pregnancy: 'Pregnancy',
  product_specific: 'Product Specific',
  other: 'Other'
};

// Category icons (Ant Design icon names)
export const TEMPLATE_CATEGORY_ICONS: Record<TemplateCategory, string> = {
  vaccine: 'MedicineBoxOutlined',
  medication_error: 'ExclamationCircleOutlined',
  device_malfunction: 'ToolOutlined',
  overdose: 'WarningOutlined',
  pediatric: 'SmileOutlined',
  pregnancy: 'HeartOutlined',
  product_specific: 'InboxOutlined',
  other: 'FileOutlined'
};

// Template field sections (for editor grouping)
export const TEMPLATE_FIELD_SECTIONS = [
  {
    key: 'report',
    label: 'Report Information',
    fields: [
      'report_type',
      'initial_or_followup',
      'expedited_report',
      'report_type_classification'
    ]
  },
  {
    key: 'patient',
    label: 'Patient Information',
    fields: [
      'patient_age_group',
      'patient_sex'
    ]
  },
  {
    key: 'product',
    label: 'Product/Drug',
    fields: [
      'drug_characterization',
      'product_name',
      'indication'
    ]
  },
  {
    key: 'reaction',
    label: 'Reaction',
    fields: [
      'reaction_term',
      'serious_death',
      'serious_life_threat',
      'serious_hospitalization',
      'serious_disability',
      'serious_congenital',
      'serious_other'
    ]
  },
  {
    key: 'sender',
    label: 'Sender Information',
    fields: [
      'sender_type',
      'sender_organization',
      'sender_country'
    ]
  }
];

// Default template data structure
export const DEFAULT_TEMPLATE_DATA: Record<string, unknown> = {
  // Report Information
  report_type: null,
  initial_or_followup: 1, // Initial
  expedited_report: null,
  report_type_classification: 'expedited',

  // Patient
  patient_age_group: null,
  patient_sex: null,

  // Product defaults (will be arrays in actual case)
  drug_characterization: null,

  // Reaction defaults
  serious_death: 0,
  serious_life_threat: 0,
  serious_hospitalization: 0,
  serious_disability: 0,
  serious_congenital: 0,
  serious_other: 0,

  // Sender defaults
  sender_type: null
};

// Create template from case - fields to exclude
export const EXCLUDED_TEMPLATE_FIELDS = [
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'version',
  'safety_report_id',
  'worldwide_case_id',
  'exported_at',
  'exported_xml_path',
  'submission_id',
  'last_submitted_at',
  'srp_confirmation_number',
  'fda_case_number',
  'acknowledgment_date',
  'workflow_status',
  'created_by',
  'current_owner',
  'current_assignee',
  'due_date',
  'rejection_count',
  'last_rejection_reason',
  'parent_case_id',
  'case_version',
  'is_nullified'
];
