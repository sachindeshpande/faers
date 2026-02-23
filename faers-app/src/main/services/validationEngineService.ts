/**
 * Validation Engine Service
 * Business logic for the configurable validation engine (Phase 5)
 */

import { ValidationRepository } from '../database/repositories/validation.repository';
import type {
  ValidationRule,
  ValidationRuleListItem,
  CreateValidationRuleRequest,
  UpdateValidationRuleRequest,
  ValidationResult,
  ValidationSummary,
  ValidationRuleFilter,
  TestRuleRequest,
  TestRuleResult,
  AcknowledgeWarningRequest,
  SYSTEM_VALIDATION_RULES
} from '../../shared/types/validation.types';
import type { Case } from '../../shared/types/case.types';

export class ValidationEngineService {
  constructor(private repository: ValidationRepository) {}

  /**
   * Initialize system rules
   */
  initializeSystemRules(rules: typeof SYSTEM_VALIDATION_RULES): void {
    this.repository.initializeSystemRules(rules);
  }

  /**
   * Get validation rules
   */
  getRules(filter?: ValidationRuleFilter): ValidationRuleListItem[] {
    return this.repository.getRules(filter);
  }

  /**
   * Get a single rule
   */
  getRule(id: number): ValidationRule | null {
    return this.repository.getRule(id);
  }

  /**
   * Create a validation rule
   */
  createRule(request: CreateValidationRuleRequest, createdBy?: string): ValidationRule {
    // Validate the rule code is unique
    const existing = this.repository.getRules({ search: request.ruleCode });
    if (existing.some(r => r.ruleCode === request.ruleCode)) {
      throw new Error(`Rule code ${request.ruleCode} already exists`);
    }

    // Test the expressions are valid
    try {
      this.validateExpressions(request.conditionExpression, request.validationExpression);
    } catch (err) {
      throw new Error(`Invalid expression: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    return this.repository.createRule(request, createdBy);
  }

  /**
   * Update a validation rule
   */
  updateRule(request: UpdateValidationRuleRequest): ValidationRule | null {
    // Test the expressions if they're being updated
    if (request.conditionExpression !== undefined || request.validationExpression !== undefined) {
      const existing = this.repository.getRule(request.id);
      if (!existing) return null;

      const condition = request.conditionExpression ?? existing.conditionExpression;
      const validation = request.validationExpression ?? existing.validationExpression;

      try {
        this.validateExpressions(condition, validation);
      } catch (err) {
        throw new Error(`Invalid expression: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return this.repository.updateRule(request);
  }

  /**
   * Toggle rule active status
   */
  toggleRule(id: number, isActive: boolean): ValidationRule | null {
    return this.repository.toggleRule(id, isActive);
  }

  /**
   * Delete a validation rule
   */
  deleteRule(id: number): boolean {
    return this.repository.deleteRule(id);
  }

  /**
   * Run validation on a case
   */
  runValidation(caseData: Case): ValidationSummary {
    const startTime = Date.now();
    const rules = this.repository.getActiveRules();
    const results: Omit<ValidationResult, 'id'>[] = [];
    const validatedAt = new Date().toISOString();

    // Prepare case data context for expressions
    const context = this.prepareCaseContext(caseData);

    for (const rule of rules) {
      try {
        const result = this.evaluateRule(rule, context);
        if (result) {
          results.push({
            caseId: caseData.id,
            ruleId: rule.id,
            ruleCode: rule.ruleCode,
            ruleName: rule.ruleName,
            severity: rule.severity,
            message: rule.errorMessage,
            fieldPath: rule.fieldPath,
            fieldValue: rule.fieldPath ? this.getFieldValue(context, rule.fieldPath) : undefined,
            isAcknowledged: false,
            validatedAt
          });
        }
      } catch (err) {
        console.error(`Error evaluating rule ${rule.ruleCode}:`, err);
        // Add an error result for failed rule evaluation
        results.push({
          caseId: caseData.id,
          ruleId: rule.id,
          ruleCode: rule.ruleCode,
          ruleName: rule.ruleName,
          severity: 'warning',
          message: `Rule evaluation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          fieldPath: rule.fieldPath,
          isAcknowledged: false,
          validatedAt
        });
      }
    }

    // Save results
    this.repository.saveValidationResults(caseData.id, results);

    const durationMs = Date.now() - startTime;
    const errors = results.filter(r => r.severity === 'error');
    const warnings = results.filter(r => r.severity === 'warning');
    const info = results.filter(r => r.severity === 'info');

    return {
      caseId: caseData.id,
      errors: errors.map((r, i) => ({ ...r, id: i + 1 })),
      warnings: warnings.map((r, i) => ({ ...r, id: errors.length + i + 1 })),
      info: info.map((r, i) => ({ ...r, id: errors.length + warnings.length + i + 1 })),
      errorCount: errors.length,
      warningCount: warnings.length,
      infoCount: info.length,
      isValid: errors.length === 0,
      hasUnacknowledgedWarnings: warnings.some(w => !w.isAcknowledged),
      canSubmit: errors.length === 0 && !warnings.some(w => !w.isAcknowledged),
      validatedAt,
      validationDurationMs: durationMs
    };
  }

  /**
   * Get validation results for a case
   */
  getValidationResults(caseId: string): ValidationSummary {
    const results = this.repository.getValidationResults(caseId);
    const summary = this.repository.getValidationSummary(caseId);

    const errors = results.filter(r => r.severity === 'error');
    const warnings = results.filter(r => r.severity === 'warning');
    const info = results.filter(r => r.severity === 'info');

    const latestValidatedAt = results.length > 0
      ? results.reduce((latest, r) => r.validatedAt > latest ? r.validatedAt : latest, results[0].validatedAt)
      : new Date().toISOString();

    return {
      caseId,
      errors,
      warnings,
      info,
      errorCount: summary.errorCount,
      warningCount: summary.warningCount,
      infoCount: summary.infoCount,
      isValid: summary.errorCount === 0,
      hasUnacknowledgedWarnings: summary.hasUnacknowledgedWarnings,
      canSubmit: summary.errorCount === 0 && !summary.hasUnacknowledgedWarnings,
      validatedAt: latestValidatedAt,
      validationDurationMs: 0
    };
  }

  /**
   * Acknowledge warnings
   */
  acknowledgeWarnings(request: AcknowledgeWarningRequest): void {
    this.repository.acknowledgeWarnings(request.resultIds, undefined, request.notes);
  }

  /**
   * Test a rule against sample data
   */
  testRule(request: TestRuleRequest): TestRuleResult {
    try {
      // Create a mock rule object
      const rule: ValidationRule = {
        ...request.rule,
        id: 0,
        isSystem: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Evaluate the rule
      const triggered = this.evaluateCondition(rule.conditionExpression, request.sampleData);

      if (!triggered) {
        return {
          passed: true,
          triggered: false
        };
      }

      const passed = this.evaluateValidation(rule.validationExpression, request.sampleData);

      return {
        passed,
        triggered: true,
        result: passed ? undefined : {
          caseId: 'test',
          ruleCode: rule.ruleCode,
          ruleName: rule.ruleName,
          severity: rule.severity,
          message: rule.errorMessage,
          fieldPath: rule.fieldPath,
          fieldValue: rule.fieldPath ? request.sampleData[rule.fieldPath] : undefined,
          isAcknowledged: false,
          validatedAt: new Date().toISOString()
        }
      };
    } catch (err) {
      return {
        passed: false,
        triggered: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * Prepare case data for expression evaluation
   */
  private prepareCaseContext(caseData: Case): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    // Flatten case fields
    context.id = caseData.id;
    context.workflow_status = caseData.workflowStatus;
    context.is_serious = caseData.seriousnessDeathContributing ||
      caseData.seriousnessDisabling || caseData.seriousnessHospitalization ||
      caseData.seriousnessLifeThreatening || caseData.seriousnessCongenitalAnomali ||
      caseData.seriousnessOther ? 1 : 0;
    context.serious_death = caseData.seriousnessDeathContributing ? 1 : 0;
    context.serious_life_threat = caseData.seriousnessLifeThreatening ? 1 : 0;
    context.serious_hospitalization = caseData.seriousnessHospitalization ? 1 : 0;
    context.serious_disability = caseData.seriousnessDisabling ? 1 : 0;
    context.serious_congenital = caseData.seriousnessCongenitalAnomali ? 1 : 0;
    context.serious_other = caseData.seriousnessOther ? 1 : 0;
    context.receipt_date = caseData.receiptDate;
    context.initial_or_followup = caseData.initialOrFollowUp;

    // Patient fields
    context.patient_initials = caseData.patientInfo?.initials;
    context.patient_age = caseData.patientInfo?.age;
    context.patient_age_unit = caseData.patientInfo?.ageUnit;
    context.patient_sex = caseData.patientInfo?.sex;
    context.patient_birthdate = caseData.patientInfo?.birthDate;
    context.patient_death = caseData.patientInfo?.death ? 1 : 0;
    context.death_date = caseData.patientInfo?.deathDate;

    // Get first reaction data
    if (caseData.reactions && caseData.reactions.length > 0) {
      const firstReaction = caseData.reactions[0];
      context.reaction_term = firstReaction.reactionMedDRATermNative;
      context.reaction_pt_code = firstReaction.reactionMedDRAPT;
      context.reaction_start_date = firstReaction.reactionStartDate;
      context.reaction_end_date = firstReaction.reactionEndDate;
      context.reaction_outcome = firstReaction.reactionOutcome;
    }

    // Get first drug data
    if (caseData.drugs && caseData.drugs.length > 0) {
      const firstDrug = caseData.drugs[0];
      context.drug_name = firstDrug.medicinalProduct;
      context.drug_start_date = firstDrug.drugStartDate;
      context.drug_stop_date = firstDrug.drugStopDate;
      context.drug_dose = firstDrug.drugDose;
      context.drug_dose_unit = firstDrug.drugDoseUnit;
      context.drug_route = firstDrug.drugAdministrationRoute;
      context.drug_indication = firstDrug.drugIndication;
    }

    // Get first reporter data
    if (caseData.reporters && caseData.reporters.length > 0) {
      const firstReporter = caseData.reporters[0];
      context.reporter_name = `${firstReporter.reporterGivenName || ''} ${firstReporter.reporterFamilyName || ''}`.trim();
      context.reporter_phone = firstReporter.reporterPhone;
      context.reporter_email = firstReporter.reporterEmailAddress;
      context.reporter_qualification = firstReporter.qualification;
      context.reporter_country = firstReporter.reporterCountry;
    }

    return context;
  }

  /**
   * Evaluate a validation rule
   * Returns true if the rule is VIOLATED (validation failed)
   */
  private evaluateRule(rule: ValidationRule, context: Record<string, unknown>): boolean {
    // First check condition
    const conditionMet = this.evaluateCondition(rule.conditionExpression, context);

    if (!conditionMet) {
      return false; // Condition not met, rule not applicable
    }

    // Then check validation (returns false if validation FAILS)
    const validationPassed = this.evaluateValidation(rule.validationExpression, context);

    // Return true if validation failed (rule is violated)
    return !validationPassed;
  }

  /**
   * Evaluate condition expression
   */
  private evaluateCondition(expression: string | undefined, context: Record<string, unknown>): boolean {
    if (!expression || expression.trim() === '' || expression.trim() === 'true') {
      return true;
    }

    return this.evaluateExpression(expression, context);
  }

  /**
   * Evaluate validation expression
   */
  private evaluateValidation(expression: string, context: Record<string, unknown>): boolean {
    return this.evaluateExpression(expression, context);
  }

  /**
   * Evaluate a JavaScript expression with context
   */
  private evaluateExpression(expression: string, context: Record<string, unknown>): boolean {
    try {
      // Create a function with the helper functions and context variables
      const helperFunctions = `
        function calculateAgeFromDOB(dob, referenceDate) {
          if (!dob) return null;
          const birth = new Date(dob);
          const ref = referenceDate ? new Date(referenceDate) : new Date();
          let age = ref.getFullYear() - birth.getFullYear();
          const m = ref.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
            age--;
          }
          return age;
        }
        function isEmpty(value) {
          return value === null || value === undefined || value === '' ||
                 (Array.isArray(value) && value.length === 0);
        }
        function matchesPattern(value, pattern) {
          return new RegExp(pattern).test(value);
        }
        function isValidDate(dateStr) {
          if (!dateStr) return false;
          const date = new Date(dateStr);
          return !isNaN(date.getTime());
        }
      `;

      // Create variable declarations from context
      const varDeclarations = Object.entries(context)
        .map(([key, value]) => {
          if (value === undefined || value === null) {
            return `var ${key} = null;`;
          }
          if (typeof value === 'string') {
            return `var ${key} = ${JSON.stringify(value)};`;
          }
          return `var ${key} = ${JSON.stringify(value)};`;
        })
        .join('\n');

      const fullCode = `
        ${helperFunctions}
        ${varDeclarations}
        return (${expression});
      `;

      // Execute with Function constructor (safer than eval)
      const fn = new Function(fullCode);
      return Boolean(fn());
    } catch (err) {
      console.error('Expression evaluation error:', err);
      throw err;
    }
  }

  /**
   * Validate expressions without executing
   */
  private validateExpressions(condition?: string, validation?: string): void {
    const testContext = { test: true };

    if (condition && condition.trim() !== '' && condition.trim() !== 'true') {
      try {
        this.evaluateExpression(condition, testContext);
      } catch (err) {
        throw new Error(`Invalid condition expression: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    if (validation) {
      try {
        this.evaluateExpression(validation, testContext);
      } catch (err) {
        throw new Error(`Invalid validation expression: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Get field value from context
   */
  private getFieldValue(context: Record<string, unknown>, fieldPath: string): unknown {
    return context[fieldPath];
  }
}
