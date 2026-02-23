/**
 * Validation Repository
 * Database operations for validation rules and results
 */

import type Database from 'better-sqlite3';
import type {
  ValidationRule,
  ValidationRuleListItem,
  CreateValidationRuleRequest,
  UpdateValidationRuleRequest,
  ValidationResult,
  ValidationSummary,
  ValidationRuleFilter,
  SYSTEM_VALIDATION_RULES
} from '../../../shared/types/validation.types';

export class ValidationRepository {
  constructor(private db: Database.Database) {}

  /**
   * Initialize system validation rules
   */
  initializeSystemRules(systemRules: typeof SYSTEM_VALIDATION_RULES): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO validation_rules (
        rule_code, rule_name, description, rule_type, severity,
        condition_expression, validation_expression, error_message,
        field_path, related_fields, is_system, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const insertMany = this.db.transaction((rules: typeof SYSTEM_VALIDATION_RULES) => {
      for (const rule of rules) {
        stmt.run(
          rule.ruleCode,
          rule.ruleName,
          rule.description || null,
          rule.ruleType,
          rule.severity,
          rule.conditionExpression || null,
          rule.validationExpression,
          rule.errorMessage,
          rule.fieldPath || null,
          rule.relatedFields ? JSON.stringify(rule.relatedFields) : null,
          rule.isSystem ? 1 : 0,
          rule.isActive ? 1 : 0
        );
      }
    });

    insertMany(systemRules);
  }

  /**
   * Get all validation rules
   */
  getRules(filter?: ValidationRuleFilter): ValidationRuleListItem[] {
    let sql = `
      SELECT
        id, rule_code, rule_name, rule_type, severity,
        field_path, is_system, is_active
      FROM validation_rules
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filter?.ruleType) {
      sql += ' AND rule_type = ?';
      params.push(filter.ruleType);
    }
    if (filter?.severity) {
      sql += ' AND severity = ?';
      params.push(filter.severity);
    }
    if (filter?.fieldPath) {
      sql += ' AND field_path = ?';
      params.push(filter.fieldPath);
    }
    if (filter?.isSystem !== undefined) {
      sql += ' AND is_system = ?';
      params.push(filter.isSystem ? 1 : 0);
    }
    if (filter?.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(filter.isActive ? 1 : 0);
    }
    if (filter?.search) {
      sql += ' AND (rule_code LIKE ? OR rule_name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY is_system DESC, rule_code ASC';

    const rows = this.db.prepare(sql).all(...params) as {
      id: number;
      rule_code: string;
      rule_name: string;
      rule_type: string;
      severity: string;
      field_path: string | null;
      is_system: number;
      is_active: number;
    }[];

    return rows.map(row => ({
      id: row.id,
      ruleCode: row.rule_code,
      ruleName: row.rule_name,
      ruleType: row.rule_type as ValidationRuleListItem['ruleType'],
      severity: row.severity as ValidationRuleListItem['severity'],
      fieldPath: row.field_path || undefined,
      isSystem: row.is_system === 1,
      isActive: row.is_active === 1
    }));
  }

  /**
   * Get active rules
   */
  getActiveRules(): ValidationRule[] {
    const rows = this.db.prepare(`
      SELECT * FROM validation_rules WHERE is_active = 1 ORDER BY rule_code
    `).all() as {
      id: number;
      rule_code: string;
      rule_name: string;
      description: string | null;
      rule_type: string;
      severity: string;
      condition_expression: string | null;
      validation_expression: string;
      error_message: string;
      field_path: string | null;
      related_fields: string | null;
      is_system: number;
      is_active: number;
      created_by: string | null;
      created_at: string;
      updated_at: string;
    }[];

    return rows.map(row => this.mapRuleRow(row));
  }

  /**
   * Get a single validation rule
   */
  getRule(id: number): ValidationRule | null {
    const row = this.db.prepare(`SELECT * FROM validation_rules WHERE id = ?`).get(id) as {
      id: number;
      rule_code: string;
      rule_name: string;
      description: string | null;
      rule_type: string;
      severity: string;
      condition_expression: string | null;
      validation_expression: string;
      error_message: string;
      field_path: string | null;
      related_fields: string | null;
      is_system: number;
      is_active: number;
      created_by: string | null;
      created_at: string;
      updated_at: string;
    } | undefined;

    return row ? this.mapRuleRow(row) : null;
  }

  /**
   * Create a validation rule
   */
  createRule(request: CreateValidationRuleRequest, createdBy?: string): ValidationRule {
    const result = this.db.prepare(`
      INSERT INTO validation_rules (
        rule_code, rule_name, description, rule_type, severity,
        condition_expression, validation_expression, error_message,
        field_path, related_fields, is_system, is_active,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, datetime('now'), datetime('now'))
    `).run(
      request.ruleCode,
      request.ruleName,
      request.description || null,
      request.ruleType,
      request.severity,
      request.conditionExpression || null,
      request.validationExpression,
      request.errorMessage,
      request.fieldPath || null,
      request.relatedFields ? JSON.stringify(request.relatedFields) : null,
      createdBy || null
    );

    return this.getRule(result.lastInsertRowid as number)!;
  }

  /**
   * Update a validation rule
   */
  updateRule(request: UpdateValidationRuleRequest): ValidationRule | null {
    const existing = this.getRule(request.id);
    if (!existing || existing.isSystem) {
      return null; // Cannot update system rules
    }

    const updates: string[] = ['updated_at = datetime(\'now\')'];
    const params: (string | number | null)[] = [];

    if (request.ruleName !== undefined) {
      updates.push('rule_name = ?');
      params.push(request.ruleName);
    }
    if (request.description !== undefined) {
      updates.push('description = ?');
      params.push(request.description || null);
    }
    if (request.severity !== undefined) {
      updates.push('severity = ?');
      params.push(request.severity);
    }
    if (request.conditionExpression !== undefined) {
      updates.push('condition_expression = ?');
      params.push(request.conditionExpression || null);
    }
    if (request.validationExpression !== undefined) {
      updates.push('validation_expression = ?');
      params.push(request.validationExpression);
    }
    if (request.errorMessage !== undefined) {
      updates.push('error_message = ?');
      params.push(request.errorMessage);
    }
    if (request.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(request.isActive ? 1 : 0);
    }

    params.push(request.id);

    this.db.prepare(`UPDATE validation_rules SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return this.getRule(request.id);
  }

  /**
   * Toggle rule active status
   */
  toggleRule(id: number, isActive: boolean): ValidationRule | null {
    this.db.prepare(`
      UPDATE validation_rules
      SET is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(isActive ? 1 : 0, id);

    return this.getRule(id);
  }

  /**
   * Delete a validation rule (custom only)
   */
  deleteRule(id: number): boolean {
    const existing = this.getRule(id);
    if (!existing || existing.isSystem) {
      return false;
    }

    this.db.prepare('DELETE FROM validation_rules WHERE id = ? AND is_system = 0').run(id);
    return true;
  }

  /**
   * Save validation results
   */
  saveValidationResults(caseId: string, results: Omit<ValidationResult, 'id'>[]): void {
    // Clear previous results
    this.db.prepare('DELETE FROM validation_results WHERE case_id = ?').run(caseId);

    if (results.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO validation_results (
        case_id, rule_id, rule_code, rule_name, severity,
        message, field_path, field_value,
        is_acknowledged, validated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    const insertMany = this.db.transaction((items: Omit<ValidationResult, 'id'>[]) => {
      for (const result of items) {
        stmt.run(
          result.caseId,
          result.ruleId || null,
          result.ruleCode || null,
          result.ruleName || null,
          result.severity,
          result.message,
          result.fieldPath || null,
          result.fieldValue !== undefined ? JSON.stringify(result.fieldValue) : null,
          result.validatedAt
        );
      }
    });

    insertMany(results);
  }

  /**
   * Get validation results for a case
   */
  getValidationResults(caseId: string): ValidationResult[] {
    const rows = this.db.prepare(`
      SELECT
        vr.*,
        u.full_name as acknowledged_by_name
      FROM validation_results vr
      LEFT JOIN users u ON vr.acknowledged_by = u.id
      WHERE vr.case_id = ?
      ORDER BY
        CASE vr.severity WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
        vr.id
    `).all(caseId) as {
      id: number;
      case_id: string;
      rule_id: number | null;
      rule_code: string | null;
      rule_name: string | null;
      severity: string;
      message: string;
      field_path: string | null;
      field_value: string | null;
      is_acknowledged: number;
      acknowledged_by: string | null;
      acknowledged_by_name: string | null;
      acknowledged_at: string | null;
      validated_at: string;
    }[];

    return rows.map(row => ({
      id: row.id,
      caseId: row.case_id,
      ruleId: row.rule_id || undefined,
      ruleCode: row.rule_code || undefined,
      ruleName: row.rule_name || undefined,
      severity: row.severity as ValidationResult['severity'],
      message: row.message,
      fieldPath: row.field_path || undefined,
      fieldValue: row.field_value ? JSON.parse(row.field_value) : undefined,
      isAcknowledged: row.is_acknowledged === 1,
      acknowledgedBy: row.acknowledged_by || undefined,
      acknowledgedByName: row.acknowledged_by_name || undefined,
      acknowledgedAt: row.acknowledged_at || undefined,
      validatedAt: row.validated_at
    }));
  }

  /**
   * Acknowledge warnings
   */
  acknowledgeWarnings(resultIds: number[], acknowledgedBy?: string, notes?: string): void {
    const stmt = this.db.prepare(`
      UPDATE validation_results
      SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime('now')
      WHERE id = ? AND severity = 'warning'
    `);

    const acknowledgeMany = this.db.transaction((ids: number[]) => {
      for (const id of ids) {
        stmt.run(acknowledgedBy || null, id);
      }
    });

    acknowledgeMany(resultIds);
  }

  /**
   * Check if case has unacknowledged warnings
   */
  hasUnacknowledgedWarnings(caseId: string): boolean {
    const row = this.db.prepare(`
      SELECT COUNT(*) as count FROM validation_results
      WHERE case_id = ? AND severity = 'warning' AND is_acknowledged = 0
    `).get(caseId) as { count: number };

    return row.count > 0;
  }

  /**
   * Get validation summary for a case
   */
  getValidationSummary(caseId: string): Pick<ValidationSummary, 'errorCount' | 'warningCount' | 'infoCount' | 'hasUnacknowledgedWarnings'> {
    const row = this.db.prepare(`
      SELECT
        SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info_count,
        SUM(CASE WHEN severity = 'warning' AND is_acknowledged = 0 THEN 1 ELSE 0 END) as unack_warnings
      FROM validation_results
      WHERE case_id = ?
    `).get(caseId) as {
      error_count: number;
      warning_count: number;
      info_count: number;
      unack_warnings: number;
    };

    return {
      errorCount: row?.error_count || 0,
      warningCount: row?.warning_count || 0,
      infoCount: row?.info_count || 0,
      hasUnacknowledgedWarnings: (row?.unack_warnings || 0) > 0
    };
  }

  private mapRuleRow(row: {
    id: number;
    rule_code: string;
    rule_name: string;
    description: string | null;
    rule_type: string;
    severity: string;
    condition_expression: string | null;
    validation_expression: string;
    error_message: string;
    field_path: string | null;
    related_fields: string | null;
    is_system: number;
    is_active: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }): ValidationRule {
    return {
      id: row.id,
      ruleCode: row.rule_code,
      ruleName: row.rule_name,
      description: row.description || undefined,
      ruleType: row.rule_type as ValidationRule['ruleType'],
      severity: row.severity as ValidationRule['severity'],
      conditionExpression: row.condition_expression || undefined,
      validationExpression: row.validation_expression,
      errorMessage: row.error_message,
      fieldPath: row.field_path || undefined,
      relatedFields: row.related_fields ? JSON.parse(row.related_fields) : undefined,
      isSystem: row.is_system === 1,
      isActive: row.is_active === 1,
      createdBy: row.created_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
