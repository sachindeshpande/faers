/**
 * Search Types
 * Phase 5: Advanced Search & Filtering
 */

import type { CaseListItem } from './case.types';

// Search operators for conditions
export type SearchOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'greater_equal'
  | 'less_than'
  | 'less_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'
  | 'is_true'
  | 'is_false';

// Single search condition
export interface SearchCondition {
  id: string; // Unique ID for UI management
  field: string;
  operator: SearchOperator;
  value: unknown;
  value2?: unknown; // For 'between' operator
}

// Group of conditions with logic
export interface SearchConditionGroup {
  id: string; // Unique ID for UI management
  logic: 'AND' | 'OR';
  conditions: (SearchCondition | SearchConditionGroup)[];
}

// Complete search query
export interface SearchQuery {
  text?: string; // Full-text search
  conditions?: SearchConditionGroup;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Saved search entity
export interface SavedSearch {
  id: number;
  name: string;
  description?: string;
  query: SearchQuery;
  createdBy?: string;
  createdByName?: string;
  isShared: boolean;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Search results with pagination
export interface SearchResults {
  cases: CaseListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Searchable field definition
export interface SearchableField {
  fieldPath: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'boolean' | 'coded';
  operators: SearchOperator[];
  options?: Array<{ value: string; label: string }>;
  codedType?: 'meddra' | 'whodrug' | 'country';
}

// Field definitions for search builder
export const SEARCHABLE_FIELDS: SearchableField[] = [
  // Case identifiers
  { fieldPath: 'id', label: 'Case ID', type: 'text', operators: ['equals', 'contains', 'starts_with'] },
  { fieldPath: 'safety_report_id', label: 'Safety Report ID', type: 'text', operators: ['equals', 'contains', 'starts_with'] },
  { fieldPath: 'worldwide_case_id', label: 'Worldwide Case ID', type: 'text', operators: ['equals', 'contains'] },

  // Status
  {
    fieldPath: 'status',
    label: 'Status',
    type: 'select',
    operators: ['equals', 'not_equals', 'in'],
    options: [
      { value: 'Draft', label: 'Draft' },
      { value: 'Ready for Export', label: 'Ready for Export' },
      { value: 'Exported', label: 'Exported' },
      { value: 'Submitted', label: 'Submitted' },
      { value: 'Acknowledged', label: 'Acknowledged' }
    ]
  },
  {
    fieldPath: 'workflow_status',
    label: 'Workflow Status',
    type: 'select',
    operators: ['equals', 'not_equals', 'in'],
    options: [
      { value: 'Draft', label: 'Draft' },
      { value: 'Under Review', label: 'Under Review' },
      { value: 'Approved', label: 'Approved' },
      { value: 'Rejected', label: 'Rejected' }
    ]
  },

  // Patient
  { fieldPath: 'patient_initials', label: 'Patient Initials', type: 'text', operators: ['equals', 'contains'] },
  { fieldPath: 'patient_sex', label: 'Patient Sex', type: 'select', operators: ['equals', 'not_equals'], options: [
    { value: '1', label: 'Male' },
    { value: '2', label: 'Female' },
    { value: '0', label: 'Unknown' }
  ]},
  { fieldPath: 'patient_age', label: 'Patient Age', type: 'number', operators: ['equals', 'greater_than', 'less_than', 'between'] },
  { fieldPath: 'patient_birthdate', label: 'Patient DOB', type: 'date', operators: ['equals', 'greater_than', 'less_than', 'between'] },

  // Products
  { fieldPath: 'product_name', label: 'Product Name', type: 'text', operators: ['contains', 'equals', 'starts_with'] },
  { fieldPath: 'drug_characterization', label: 'Drug Role', type: 'select', operators: ['equals'], options: [
    { value: '1', label: 'Suspect' },
    { value: '2', label: 'Concomitant' },
    { value: '3', label: 'Interacting' }
  ]},

  // Reactions
  { fieldPath: 'reaction_term', label: 'Reaction Term', type: 'text', operators: ['contains', 'equals'] },
  { fieldPath: 'reaction_pt_code', label: 'Reaction PT Code', type: 'coded', operators: ['equals', 'in'], codedType: 'meddra' },
  { fieldPath: 'reaction_soc', label: 'Reaction SOC', type: 'coded', operators: ['equals'], codedType: 'meddra' },

  // Seriousness
  { fieldPath: 'is_serious', label: 'Is Serious', type: 'boolean', operators: ['is_true', 'is_false'] },
  { fieldPath: 'serious_death', label: 'Serious - Death', type: 'boolean', operators: ['is_true', 'is_false'] },
  { fieldPath: 'serious_life_threat', label: 'Serious - Life Threatening', type: 'boolean', operators: ['is_true', 'is_false'] },
  { fieldPath: 'serious_hospitalization', label: 'Serious - Hospitalization', type: 'boolean', operators: ['is_true', 'is_false'] },

  // Report type
  { fieldPath: 'report_type_classification', label: 'Report Type', type: 'select', operators: ['equals', 'not_equals'], options: [
    { value: 'expedited', label: 'Expedited' },
    { value: 'non_expedited', label: 'Non-Expedited' },
    { value: 'followup', label: 'Follow-Up' },
    { value: 'nullification', label: 'Nullification' }
  ]},

  // Dates
  { fieldPath: 'created_at', label: 'Created Date', type: 'date', operators: ['equals', 'greater_than', 'less_than', 'between'] },
  { fieldPath: 'updated_at', label: 'Updated Date', type: 'date', operators: ['equals', 'greater_than', 'less_than', 'between'] },
  { fieldPath: 'receipt_date', label: 'Receipt Date', type: 'date', operators: ['equals', 'greater_than', 'less_than', 'between'] },
  { fieldPath: 'due_date', label: 'Due Date', type: 'date', operators: ['equals', 'greater_than', 'less_than', 'between', 'is_null', 'is_not_null'] },

  // Reporter
  { fieldPath: 'reporter_name', label: 'Reporter Name', type: 'text', operators: ['contains', 'equals'] },
  { fieldPath: 'reporter_country', label: 'Reporter Country', type: 'coded', operators: ['equals', 'in'], codedType: 'country' },

  // Narrative
  { fieldPath: 'case_narrative', label: 'Narrative', type: 'text', operators: ['contains'] },

  // Assignments
  { fieldPath: 'current_assignee', label: 'Assigned To', type: 'text', operators: ['equals', 'is_null', 'is_not_null'] },
  { fieldPath: 'created_by', label: 'Created By', type: 'text', operators: ['equals'] }
];

// Operator labels for display
export const OPERATOR_LABELS: Record<SearchOperator, string> = {
  contains: 'contains',
  not_contains: 'does not contain',
  equals: 'equals',
  not_equals: 'does not equal',
  starts_with: 'starts with',
  ends_with: 'ends with',
  greater_than: 'is greater than',
  greater_equal: 'is greater than or equal to',
  less_than: 'is less than',
  less_equal: 'is less than or equal to',
  between: 'is between',
  in: 'is one of',
  not_in: 'is not one of',
  is_null: 'is empty',
  is_not_null: 'is not empty',
  is_true: 'is true',
  is_false: 'is false'
};

// Create a new unique ID for conditions/groups
export function generateConditionId(): string {
  return `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create an empty condition
export function createEmptyCondition(): SearchCondition {
  return {
    id: generateConditionId(),
    field: '',
    operator: 'contains',
    value: ''
  };
}

// Create an empty condition group
export function createEmptyConditionGroup(logic: 'AND' | 'OR' = 'AND'): SearchConditionGroup {
  return {
    id: generateConditionId(),
    logic,
    conditions: [createEmptyCondition()]
  };
}
