/**
 * Template Repository
 * Database access layer for case templates
 */

import type { DatabaseInstance } from '../types';
import type {
  CaseTemplate,
  TemplateListItem,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateFilter,
  TemplateUsage
} from '../../../shared/types/template.types';

export class TemplateRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // ============ Template CRUD ============

  /**
   * Get templates with optional filtering
   */
  getTemplates(filter?: TemplateFilter, limit = 50, offset = 0): { items: TemplateListItem[]; total: number } {
    let whereClause = 'is_active = 1';
    const params: (string | number)[] = [];

    if (filter) {
      if (filter.category) {
        whereClause += ' AND category = ?';
        params.push(filter.category);
      }
      if (filter.isGlobal !== undefined) {
        whereClause += ' AND is_global = ?';
        params.push(filter.isGlobal ? 1 : 0);
      }
      if (filter.isApproved !== undefined) {
        whereClause += ' AND is_approved = ?';
        params.push(filter.isApproved ? 1 : 0);
      }
      if (filter.createdBy) {
        whereClause += ' AND created_by = ?';
        params.push(filter.createdBy);
      }
      if (filter.search) {
        whereClause += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${filter.search}%`, `%${filter.search}%`);
      }
      if (filter.isActive !== undefined) {
        whereClause = whereClause.replace('is_active = 1', `is_active = ${filter.isActive ? 1 : 0}`);
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM case_templates WHERE ${whereClause}`;
    const countResult = this.db.prepare(countQuery).get(...params) as { count: number };

    // Get items
    const query = `
      SELECT
        t.id,
        t.name,
        t.description,
        t.category,
        t.created_by as createdBy,
        u.first_name || ' ' || u.last_name as createdByName,
        t.is_global as isGlobal,
        t.is_approved as isApproved,
        t.usage_count as usageCount,
        t.updated_at as updatedAt
      FROM case_templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE ${whereClause}
      ORDER BY t.usage_count DESC, t.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const items = this.db.prepare(query).all(...params, limit, offset) as Array<{
      id: number;
      name: string;
      description?: string;
      category?: string;
      createdBy?: string;
      createdByName?: string;
      isGlobal: number;
      isApproved: number;
      usageCount: number;
      updatedAt: string;
    }>;

    return {
      items: items.map(item => ({
        ...item,
        isGlobal: Boolean(item.isGlobal),
        isApproved: Boolean(item.isApproved)
      })),
      total: countResult.count
    };
  }

  /**
   * Get a template by ID
   */
  getTemplateById(id: number): CaseTemplate | null {
    const query = `
      SELECT
        t.id,
        t.name,
        t.description,
        t.category,
        t.template_data as templateData,
        t.locked_fields as lockedFields,
        t.required_fields as requiredFields,
        t.created_by as createdBy,
        uc.first_name || ' ' || uc.last_name as createdByName,
        t.is_global as isGlobal,
        t.is_approved as isApproved,
        t.approved_by as approvedBy,
        ua.first_name || ' ' || ua.last_name as approvedByName,
        t.approved_at as approvedAt,
        t.usage_count as usageCount,
        t.version,
        t.is_active as isActive,
        t.created_at as createdAt,
        t.updated_at as updatedAt
      FROM case_templates t
      LEFT JOIN users uc ON t.created_by = uc.id
      LEFT JOIN users ua ON t.approved_by = ua.id
      WHERE t.id = ?
    `;

    const result = this.db.prepare(query).get(id) as {
      id: number;
      name: string;
      description?: string;
      category?: string;
      templateData: string;
      lockedFields?: string;
      requiredFields?: string;
      createdBy?: string;
      createdByName?: string;
      isGlobal: number;
      isApproved: number;
      approvedBy?: string;
      approvedByName?: string;
      approvedAt?: string;
      usageCount: number;
      version: number;
      isActive: number;
      createdAt: string;
      updatedAt: string;
    } | undefined;

    if (!result) return null;

    return {
      ...result,
      templateData: JSON.parse(result.templateData || '{}'),
      lockedFields: result.lockedFields ? JSON.parse(result.lockedFields) : undefined,
      requiredFields: result.requiredFields ? JSON.parse(result.requiredFields) : undefined,
      isGlobal: Boolean(result.isGlobal),
      isApproved: Boolean(result.isApproved),
      isActive: Boolean(result.isActive)
    };
  }

  /**
   * Create a new template
   */
  createTemplate(request: CreateTemplateRequest, createdBy?: string): CaseTemplate {
    const now = new Date().toISOString();

    const query = `
      INSERT INTO case_templates (
        name, description, category, template_data, locked_fields, required_fields,
        created_by, is_global, is_approved, usage_count, version, is_active,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, 1, ?, ?)
    `;

    const result = this.db.prepare(query).run(
      request.name,
      request.description || null,
      request.category || null,
      JSON.stringify(request.templateData),
      request.lockedFields ? JSON.stringify(request.lockedFields) : null,
      request.requiredFields ? JSON.stringify(request.requiredFields) : null,
      createdBy || null,
      request.isGlobal ? 1 : 0,
      now,
      now
    );

    return this.getTemplateById(result.lastInsertRowid as number)!;
  }

  /**
   * Update a template
   */
  updateTemplate(request: UpdateTemplateRequest): CaseTemplate | null {
    const existing = this.getTemplateById(request.id);
    if (!existing) return null;

    const now = new Date().toISOString();

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (request.name !== undefined) {
      updates.push('name = ?');
      params.push(request.name);
    }
    if (request.description !== undefined) {
      updates.push('description = ?');
      params.push(request.description || null);
    }
    if (request.category !== undefined) {
      updates.push('category = ?');
      params.push(request.category || null);
    }
    if (request.templateData !== undefined) {
      updates.push('template_data = ?');
      params.push(JSON.stringify(request.templateData));
    }
    if (request.lockedFields !== undefined) {
      updates.push('locked_fields = ?');
      params.push(request.lockedFields ? JSON.stringify(request.lockedFields) : null);
    }
    if (request.requiredFields !== undefined) {
      updates.push('required_fields = ?');
      params.push(request.requiredFields ? JSON.stringify(request.requiredFields) : null);
    }
    if (request.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(request.isActive ? 1 : 0);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    updates.push('version = version + 1');
    params.push(now);
    params.push(request.id);

    const query = `UPDATE case_templates SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...params);

    return this.getTemplateById(request.id);
  }

  /**
   * Delete (deactivate) a template
   */
  deleteTemplate(id: number): boolean {
    const query = `UPDATE case_templates SET is_active = 0, updated_at = ? WHERE id = ?`;
    const result = this.db.prepare(query).run(new Date().toISOString(), id);
    return result.changes > 0;
  }

  /**
   * Approve a template
   */
  approveTemplate(id: number, approvedBy: string): CaseTemplate | null {
    const now = new Date().toISOString();

    const query = `
      UPDATE case_templates
      SET is_approved = 1, approved_by = ?, approved_at = ?, updated_at = ?
      WHERE id = ?
    `;

    this.db.prepare(query).run(approvedBy, now, now, id);
    return this.getTemplateById(id);
  }

  /**
   * Increment usage count
   */
  incrementUsageCount(id: number): void {
    const query = `UPDATE case_templates SET usage_count = usage_count + 1 WHERE id = ?`;
    this.db.prepare(query).run(id);
  }

  // ============ Template Usage ============

  /**
   * Record template usage
   */
  recordUsage(templateId: number, caseId: string, usedBy?: string): TemplateUsage {
    const now = new Date().toISOString();

    const query = `
      INSERT INTO template_usage (template_id, case_id, used_by, used_at)
      VALUES (?, ?, ?, ?)
    `;

    const result = this.db.prepare(query).run(templateId, caseId, usedBy || null, now);

    // Also increment usage count
    this.incrementUsageCount(templateId);

    return this.getUsageById(result.lastInsertRowid as number)!;
  }

  /**
   * Get usage by ID
   */
  getUsageById(id: number): TemplateUsage | null {
    const query = `
      SELECT
        tu.id,
        tu.template_id as templateId,
        tu.case_id as caseId,
        tu.used_by as usedBy,
        u.first_name || ' ' || u.last_name as usedByName,
        tu.used_at as usedAt
      FROM template_usage tu
      LEFT JOIN users u ON tu.used_by = u.id
      WHERE tu.id = ?
    `;

    return this.db.prepare(query).get(id) as TemplateUsage | null;
  }

  /**
   * Get usage history for a template
   */
  getUsageHistory(templateId: number, limit = 50, offset = 0): TemplateUsage[] {
    const query = `
      SELECT
        tu.id,
        tu.template_id as templateId,
        tu.case_id as caseId,
        tu.used_by as usedBy,
        u.first_name || ' ' || u.last_name as usedByName,
        tu.used_at as usedAt
      FROM template_usage tu
      LEFT JOIN users u ON tu.used_by = u.id
      WHERE tu.template_id = ?
      ORDER BY tu.used_at DESC
      LIMIT ? OFFSET ?
    `;

    return this.db.prepare(query).all(templateId, limit, offset) as TemplateUsage[];
  }
}
