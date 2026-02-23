/**
 * Validation Engine Types
 * Phase 5: Business Rule Validation
 */

// Validation rule types
export type ValidationRuleType =
  | 'required'        // Field is required (conditionally)
  | 'format'          // Field must match format (regex)
  | 'range'           // Value must be in range
  | 'cross_field'     // Validation involving multiple fields
  | 'date_logic'      // Date sequence validation
  | 'custom';         // Custom expression

// Validation severity levels
export type ValidationSeverity = 'error' | 'warning' | 'info';

// Validation rule entity
export interface ValidationRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  description?: string;
  ruleType: ValidationRuleType;
  severity: ValidationSeverity;
  conditionExpression?: string; // When to apply the rule (JS expression)
  validationExpression: string; // What to validate (JS expression)
  errorMessage: string;
  fieldPath?: string; // Primary field this rule applies to
  relatedFields?: string[]; // Other fields involved (for cross-field)
  isSystem: boolean; // Built-in vs custom
  isActive: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// Validation rule list item
export interface ValidationRuleListItem {
  id: number;
  ruleCode: string;
  ruleName: string;
  ruleType: ValidationRuleType;
  severity: ValidationSeverity;
  fieldPath?: string;
  isSystem: boolean;
  isActive: boolean;
}

// Create rule request
export interface CreateValidationRuleRequest {
  ruleCode: string;
  ruleName: string;
  description?: string;
  ruleType: ValidationRuleType;
  severity: ValidationSeverity;
  conditionExpression?: string;
  validationExpression: string;
  errorMessage: string;
  fieldPath?: string;
  relatedFields?: string[];
}

// Update rule request
export interface UpdateValidationRuleRequest {
  id: number;
  ruleName?: string;
  description?: string;
  severity?: ValidationSeverity;
  conditionExpression?: string;
  validationExpression?: string;
  errorMessage?: string;
  isActive?: boolean;
}

// Validation result for a single rule
export interface ValidationResult {
  id?: number;
  caseId: string;
  ruleId?: number;
  ruleCode?: string;
  ruleName?: string;
  severity: ValidationSeverity;
  message: string;
  fieldPath?: string;
  fieldValue?: unknown;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedByName?: string;
  acknowledgedAt?: string;
  validatedAt: string;
}

// Summary of validation run
export interface ValidationSummary {
  caseId: string;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  info: ValidationResult[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  isValid: boolean; // No errors
  hasUnacknowledgedWarnings: boolean;
  canSubmit: boolean; // No errors and no unacknowledged warnings
  validatedAt: string;
  validationDurationMs: number;
}

// Acknowledge warning request
export interface AcknowledgeWarningRequest {
  caseId: string;
  resultIds: number[];
  notes?: string;
}

// Test rule request
export interface TestRuleRequest {
  rule: Omit<ValidationRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isSystem'>;
  sampleData: Record<string, unknown>;
}

// Test rule result
export interface TestRuleResult {
  passed: boolean;
  triggered: boolean; // Was the condition met?
  result?: ValidationResult;
  error?: string; // Expression evaluation error
}

// Rule filter options
export interface ValidationRuleFilter {
  ruleType?: ValidationRuleType;
  severity?: ValidationSeverity;
  fieldPath?: string;
  isSystem?: boolean;
  isActive?: boolean;
  search?: string;
}

// Validation statistics
export interface ValidationStatistics {
  totalRules: number;
  activeRules: number;
  systemRules: number;
  customRules: number;
  rulesByType: Record<ValidationRuleType, number>;
  rulesBySeverity: Record<ValidationSeverity, number>;
  mostTriggeredRules: Array<{
    ruleCode: string;
    ruleName: string;
    triggerCount: number;
  }>;
  validationsByDay: Array<{
    date: string;
    validations: number;
    errors: number;
    warnings: number;
  }>;
}

// Pre-built rule codes
export const SYSTEM_RULE_CODES = {
  AGE_CONSISTENCY: 'SYS-AGE-001',
  DATE_SEQUENCE: 'SYS-DATE-001',
  DEATH_REQUIRES_DATE: 'SYS-DEATH-001',
  SERIOUS_REQUIRES_CRITERION: 'SYS-SERIOUS-001',
  EVENT_DURING_TREATMENT: 'SYS-EVENT-001',
  REPORTER_CONTACT: 'SYS-REPORTER-001',
  MEDDRA_REQUIRED: 'SYS-CODING-001',
  AGE_LIMIT: 'SYS-AGE-002',
  FUTURE_DATE: 'SYS-DATE-002',
  DOSE_UNIT: 'SYS-DOSE-001'
};

// Pre-built validation rules
export const SYSTEM_VALIDATION_RULES: Omit<ValidationRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    ruleCode: 'SYS-AGE-001',
    ruleName: 'Age Consistency',
    description: 'Patient age should be consistent with date of birth and event date',
    ruleType: 'cross_field',
    severity: 'warning',
    conditionExpression: 'patient_birthdate && patient_age',
    validationExpression: 'calculateAgeFromDOB(patient_birthdate, receipt_date) === patient_age || Math.abs(calculateAgeFromDOB(patient_birthdate, receipt_date) - patient_age) <= 1',
    errorMessage: 'Patient age does not match calculated age from date of birth',
    fieldPath: 'patient_age',
    relatedFields: ['patient_birthdate', 'receipt_date'],
    isSystem: true,
    isActive: true
  },
  {
    ruleCode: 'SYS-DATE-001',
    ruleName: 'Date Sequence',
    description: 'Start dates must be before or equal to end dates',
    ruleType: 'date_logic',
    severity: 'error',
    conditionExpression: 'true', // Always check
    validationExpression: '(!reaction_start_date || !reaction_end_date) || new Date(reaction_start_date) <= new Date(reaction_end_date)',
    errorMessage: 'Reaction end date cannot be before start date',
    fieldPath: 'reaction_end_date',
    relatedFields: ['reaction_start_date'],
    isSystem: true,
    isActive: true
  },
  {
    ruleCode: 'SYS-DEATH-001',
    ruleName: 'Death Requires Death Date',
    description: 'If patient death is indicated, death date should be provided',
    ruleType: 'cross_field',
    severity: 'warning',
    conditionExpression: 'patient_death === 1',
    validationExpression: '!!death_date',
    errorMessage: 'Death date is recommended when patient death is indicated',
    fieldPath: 'death_date',
    relatedFields: ['patient_death'],
    isSystem: true,
    isActive: true
  },
  {
    ruleCode: 'SYS-SERIOUS-001',
    ruleName: 'Serious Requires Criterion',
    description: 'If case is marked serious, at least one seriousness criterion must be selected',
    ruleType: 'cross_field',
    severity: 'error',
    conditionExpression: 'is_serious === 1',
    validationExpression: 'serious_death || serious_life_threat || serious_hospitalization || serious_disability || serious_congenital || serious_other',
    errorMessage: 'At least one seriousness criterion must be selected for a serious case',
    fieldPath: 'is_serious',
    relatedFields: ['serious_death', 'serious_life_threat', 'serious_hospitalization', 'serious_disability', 'serious_congenital', 'serious_other'],
    isSystem: true,
    isActive: true
  },
  {
    ruleCode: 'SYS-EVENT-001',
    ruleName: 'Event During Treatment',
    description: 'Reaction onset should be on or after drug start date',
    ruleType: 'date_logic',
    severity: 'warning',
    conditionExpression: 'reaction_start_date && drug_start_date',
    validationExpression: 'new Date(reaction_start_date) >= new Date(drug_start_date)',
    errorMessage: 'Reaction onset date is before drug start date - please verify',
    fieldPath: 'reaction_start_date',
    relatedFields: ['drug_start_date'],
    isSystem: true,
    isActive: true
  },
  {
    ruleCode: 'SYS-REPORTER-001',
    ruleName: 'Reporter Contact Information',
    description: 'Reporter phone or email recommended for follow-up cases',
    ruleType: 'cross_field',
    severity: 'info',
    conditionExpression: 'initial_or_followup === 2', // Follow-up
    validationExpression: '!!reporter_phone || !!reporter_email',
    errorMessage: 'Reporter contact information is recommended for follow-up cases',
    fieldPath: 'reporter_phone',
    relatedFields: ['reporter_email', 'initial_or_followup'],
    isSystem: true,
    isActive: true
  },
  {
    ruleCode: 'SYS-CODING-001',
    ruleName: 'MedDRA Coding Required',
    description: 'Reaction should be coded with MedDRA PT for submission',
    ruleType: 'required',
    severity: 'error',
    conditionExpression: "workflow_status === 'Ready for Export' || workflow_status === 'Approved'",
    validationExpression: '!!reaction_pt_code',
    errorMessage: 'MedDRA coding (PT) is required for submission',
    fieldPath: 'reaction_pt_code',
    isSystem: true,
    isActive: true
  },
  {
    ruleCode: 'SYS-AGE-002',
    ruleName: 'Age Limit',
    description: 'Patient age should not exceed 150 years',
    ruleType: 'range',
    severity: 'warning',
    conditionExpression: "patient_age && patient_age_unit === '801'", // Years
    validationExpression: 'patient_age <= 150',
    errorMessage: 'Patient age exceeds 150 years - please verify',
    fieldPath: 'patient_age',
    isSystem: true,
    isActive: true
  },
  {
    ruleCode: 'SYS-DATE-002',
    ruleName: 'No Future Dates',
    description: 'Event and report dates should not be in the future',
    ruleType: 'date_logic',
    severity: 'error',
    conditionExpression: 'reaction_start_date',
    validationExpression: 'new Date(reaction_start_date) <= new Date()',
    errorMessage: 'Reaction date cannot be in the future',
    fieldPath: 'reaction_start_date',
    isSystem: true,
    isActive: true
  },
  {
    ruleCode: 'SYS-DOSE-001',
    ruleName: 'Dose Requires Unit',
    description: 'If dose value is provided, unit should also be specified',
    ruleType: 'cross_field',
    severity: 'warning',
    conditionExpression: 'drug_dose',
    validationExpression: '!!drug_dose_unit',
    errorMessage: 'Dose unit should be specified when dose value is provided',
    fieldPath: 'drug_dose_unit',
    relatedFields: ['drug_dose'],
    isSystem: true,
    isActive: true
  }
];

// Severity labels
export const VALIDATION_SEVERITY_LABELS: Record<ValidationSeverity, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Information'
};

// Severity colors
export const VALIDATION_SEVERITY_COLORS: Record<ValidationSeverity, string> = {
  error: 'red',
  warning: 'orange',
  info: 'blue'
};

// Rule type labels
export const VALIDATION_RULE_TYPE_LABELS: Record<ValidationRuleType, string> = {
  required: 'Required Field',
  format: 'Format Validation',
  range: 'Range Check',
  cross_field: 'Cross-Field',
  date_logic: 'Date Logic',
  custom: 'Custom Rule'
};

// Helper functions available in expressions
export const VALIDATION_EXPRESSION_HELPERS = `
// Calculate age from DOB
function calculateAgeFromDOB(dob, referenceDate) {
  const birth = new Date(dob);
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Check if value is empty
function isEmpty(value) {
  return value === null || value === undefined || value === '' ||
         (Array.isArray(value) && value.length === 0);
}

// Check if value matches pattern
function matchesPattern(value, pattern) {
  return new RegExp(pattern).test(value);
}

// Check if date is valid
function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}
`;
