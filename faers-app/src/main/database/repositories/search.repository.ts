/**
 * Search Repository - Database access layer for advanced search
 */

import type { DatabaseInstance } from '../types';
import type {
  SearchQuery,
  SearchCondition,
  SearchConditionGroup,
  SearchResults,
  SavedSearch,
  SearchOperator
} from '../../../shared/types/search.types';
import type { CaseListItem } from '../../../shared/types/case.types';

export class SearchRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // ============ Saved Searches ============

  /**
   * Get all saved searches for a user
   */
  getSavedSearches(userId?: string, includeShared = true): SavedSearch[] {
    let query = `
      SELECT
        id,
        name,
        description,
        query_definition as queryDefinition,
        is_shared as isShared,
        created_by as createdBy,
        usage_count as usageCount,
        last_used_at as lastUsedAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM saved_searches
      WHERE 1=1
    `;

    const params: (string | number)[] = [];

    if (userId) {
      if (includeShared) {
        query += ' AND (created_by = ? OR is_shared = 1)';
      } else {
        query += ' AND created_by = ?';
      }
      params.push(userId);
    } else if (!includeShared) {
      query += ' AND is_shared = 1';
    }

    query += ' ORDER BY updated_at DESC';

    const results = this.db.prepare(query).all(...params) as Array<{
      id: number;
      name: string;
      description?: string;
      queryDefinition: string;
      isShared: number;
      createdBy?: string;
      usageCount: number;
      lastUsedAt?: string;
      createdAt: string;
      updatedAt: string;
    }>;

    return results.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      query: JSON.parse(r.queryDefinition),
      isShared: r.isShared === 1,
      createdBy: r.createdBy,
      executionCount: r.usageCount,
      lastExecutedAt: r.lastUsedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  /**
   * Get a saved search by ID
   */
  getSavedSearchById(id: number): SavedSearch | null {
    const query = `
      SELECT
        id,
        name,
        description,
        query_definition as queryDefinition,
        is_shared as isShared,
        created_by as createdBy,
        usage_count as usageCount,
        last_used_at as lastUsedAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM saved_searches
      WHERE id = ?
    `;

    const result = this.db.prepare(query).get(id) as {
      id: number;
      name: string;
      description?: string;
      queryDefinition: string;
      isShared: number;
      createdBy?: string;
      usageCount: number;
      lastUsedAt?: string;
      createdAt: string;
      updatedAt: string;
    } | undefined;

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      query: JSON.parse(result.queryDefinition),
      isShared: result.isShared === 1,
      createdBy: result.createdBy,
      executionCount: result.usageCount,
      lastExecutedAt: result.lastUsedAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    };
  }

  /**
   * Create a saved search
   */
  createSavedSearch(
    name: string,
    description: string | undefined,
    query: SearchQuery,
    isShared: boolean,
    createdBy?: string
  ): SavedSearch {
    const now = new Date().toISOString();
    const insertQuery = `
      INSERT INTO saved_searches (name, description, query_definition, is_shared, created_by, usage_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `;

    const result = this.db.prepare(insertQuery).run(
      name,
      description || null,
      JSON.stringify(query),
      isShared ? 1 : 0,
      createdBy || null,
      now,
      now
    );

    return this.getSavedSearchById(result.lastInsertRowid as number)!;
  }

  /**
   * Update a saved search
   */
  updateSavedSearch(id: number, updates: Partial<SavedSearch>): SavedSearch | null {
    const setClauses: string[] = [];
    const params: (string | number)[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      params.push(updates.description || '');
    }
    if (updates.query !== undefined) {
      setClauses.push('query_definition = ?');
      params.push(JSON.stringify(updates.query));
    }
    if (updates.isShared !== undefined) {
      setClauses.push('is_shared = ?');
      params.push(updates.isShared ? 1 : 0);
    }

    if (setClauses.length === 0) {
      return this.getSavedSearchById(id);
    }

    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const query = `UPDATE saved_searches SET ${setClauses.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...params);

    return this.getSavedSearchById(id);
  }

  /**
   * Delete a saved search
   */
  deleteSavedSearch(id: number): void {
    this.db.prepare('DELETE FROM saved_searches WHERE id = ?').run(id);
  }

  /**
   * Increment execution count for a saved search
   */
  incrementExecutionCount(id: number): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE saved_searches
      SET usage_count = usage_count + 1, last_used_at = ?
      WHERE id = ?
    `).run(now, id);
  }

  // ============ Search Execution ============

  /**
   * Execute a fulltext search
   */
  searchFulltext(query: string, page = 1, pageSize = 25): SearchResults {
    const offset = (page - 1) * pageSize;
    const searchPattern = `%${query}%`;

    // Search across multiple fields
    const searchQuery = `
      SELECT
        c.id,
        c.status,
        c.patient_initials,
        c.created_at,
        c.updated_at,
        (SELECT product_name FROM case_drugs WHERE case_id = c.id AND characterization = 1 LIMIT 1) as product_name,
        c.workflow_status,
        c.created_by,
        c.current_assignee
      FROM cases c
      WHERE c.deleted_at IS NULL
        AND (
          c.id LIKE ?
          OR c.safety_report_id LIKE ?
          OR c.patient_initials LIKE ?
          OR c.worldwide_case_id LIKE ?
          OR c.sender_organization LIKE ?
          OR EXISTS (SELECT 1 FROM case_drugs WHERE case_id = c.id AND product_name LIKE ?)
          OR EXISTS (SELECT 1 FROM case_reactions WHERE case_id = c.id AND (reaction_term LIKE ? OR meddra_pt_name LIKE ?))
          OR EXISTS (SELECT 1 FROM case_reporters WHERE case_id = c.id AND (given_name LIKE ? OR family_name LIKE ? OR organization LIKE ?))
        )
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const cases = this.db.prepare(searchQuery).all(
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
      pageSize, offset
    ) as CaseListItem[];

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM cases c
      WHERE c.deleted_at IS NULL
        AND (
          c.id LIKE ?
          OR c.safety_report_id LIKE ?
          OR c.patient_initials LIKE ?
          OR c.worldwide_case_id LIKE ?
          OR c.sender_organization LIKE ?
          OR EXISTS (SELECT 1 FROM case_drugs WHERE case_id = c.id AND product_name LIKE ?)
          OR EXISTS (SELECT 1 FROM case_reactions WHERE case_id = c.id AND (reaction_term LIKE ? OR meddra_pt_name LIKE ?))
          OR EXISTS (SELECT 1 FROM case_reporters WHERE case_id = c.id AND (given_name LIKE ? OR family_name LIKE ? OR organization LIKE ?))
        )
    `;

    const countResult = this.db.prepare(countQuery).get(
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern
    ) as { count: number };

    return {
      cases,
      total: countResult.count,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.count / pageSize)
    };
  }

  /**
   * Execute an advanced search query
   */
  searchAdvanced(query: SearchQuery, page = 1, pageSize = 25): SearchResults {
    const offset = (page - 1) * pageSize;

    // Build WHERE clause from conditions
    const { whereClause, params } = this.buildWhereClause(query);

    const searchQuery = `
      SELECT
        c.id,
        c.status,
        c.patient_initials,
        c.created_at,
        c.updated_at,
        (SELECT product_name FROM case_drugs WHERE case_id = c.id AND characterization = 1 LIMIT 1) as product_name,
        c.workflow_status,
        c.created_by,
        c.current_assignee
      FROM cases c
      WHERE c.deleted_at IS NULL
        ${whereClause ? `AND (${whereClause})` : ''}
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const cases = this.db.prepare(searchQuery).all(...params, pageSize, offset) as CaseListItem[];

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM cases c
      WHERE c.deleted_at IS NULL
        ${whereClause ? `AND (${whereClause})` : ''}
    `;

    const countResult = this.db.prepare(countQuery).get(...params) as { count: number };

    return {
      cases,
      total: countResult.count,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.count / pageSize)
    };
  }

  /**
   * Build WHERE clause from search query
   */
  private buildWhereClause(query: SearchQuery): { whereClause: string; params: (string | number)[] } {
    if (!query.conditions || query.conditions.conditions.length === 0) {
      return { whereClause: '', params: [] };
    }

    // Build from the root condition group
    return this.buildGroupClause(query.conditions);
  }

  /**
   * Build clause for a condition group
   */
  private buildGroupClause(group: SearchConditionGroup): { clause: string; params: (string | number)[] } {
    const params: (string | number)[] = [];
    const parts: string[] = [];

    for (const item of group.conditions) {
      if ('conditions' in item) {
        // It's a nested group
        const nested = this.buildGroupClause(item as SearchConditionGroup);
        if (nested.clause) {
          parts.push(`(${nested.clause})`);
          params.push(...nested.params);
        }
      } else {
        // It's a condition
        const condResult = this.buildConditionClause(item as SearchCondition);
        if (condResult.clause) {
          parts.push(condResult.clause);
          params.push(...condResult.params);
        }
      }
    }

    const operator = group.logic === 'OR' ? ' OR ' : ' AND ';
    return {
      clause: parts.join(operator),
      params
    };
  }

  /**
   * Build clause for a single condition
   */
  private buildConditionClause(condition: SearchCondition): { clause: string; params: (string | number)[] } {
    const { field, operator, value } = condition;
    const params: (string | number)[] = [];

    // Map field to actual column
    const columnInfo = this.getFieldColumn(field);
    if (!columnInfo) {
      return { clause: '', params: [] };
    }

    const { column, table, isSubquery } = columnInfo;

    let clause = '';

    if (isSubquery && table) {
      // Handle fields in related tables
      clause = this.buildSubqueryClause(table, column, operator, value, params);
    } else {
      // Handle direct case fields
      clause = this.buildDirectClause(`c.${column}`, operator, value, params);
    }

    return { clause, params };
  }

  /**
   * Build clause for subquery (related tables)
   */
  private buildSubqueryClause(
    table: string,
    column: string,
    operator: SearchOperator,
    value: unknown,
    params: (string | number)[]
  ): string {
    const innerClause = this.buildDirectClause(column, operator, value, params);

    if (operator === 'is_empty' || operator === 'is_not_empty') {
      const existsOp = operator === 'is_empty' ? 'NOT EXISTS' : 'EXISTS';
      return `${existsOp} (SELECT 1 FROM ${table} WHERE case_id = c.id)`;
    }

    return `EXISTS (SELECT 1 FROM ${table} WHERE case_id = c.id AND ${innerClause})`;
  }

  /**
   * Build direct comparison clause
   */
  private buildDirectClause(
    column: string,
    operator: SearchOperator,
    value: unknown,
    params: (string | number)[]
  ): string {
    switch (operator) {
      case 'equals':
        params.push(value as string | number);
        return `${column} = ?`;

      case 'not_equals':
        params.push(value as string | number);
        return `${column} != ?`;

      case 'contains':
        params.push(`%${value}%`);
        return `${column} LIKE ?`;

      case 'not_contains':
        params.push(`%${value}%`);
        return `${column} NOT LIKE ?`;

      case 'starts_with':
        params.push(`${value}%`);
        return `${column} LIKE ?`;

      case 'ends_with':
        params.push(`%${value}`);
        return `${column} LIKE ?`;

      case 'greater_than':
        params.push(value as number);
        return `${column} > ?`;

      case 'less_than':
        params.push(value as number);
        return `${column} < ?`;

      case 'greater_than_or_equals':
        params.push(value as number);
        return `${column} >= ?`;

      case 'less_than_or_equals':
        params.push(value as number);
        return `${column} <= ?`;

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          params.push(value[0] as string | number);
          params.push(value[1] as string | number);
          return `${column} BETWEEN ? AND ?`;
        }
        return '1=1';

      case 'in':
        if (Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(', ');
          params.push(...(value as (string | number)[]));
          return `${column} IN (${placeholders})`;
        }
        return '1=1';

      case 'not_in':
        if (Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(', ');
          params.push(...(value as (string | number)[]));
          return `${column} NOT IN (${placeholders})`;
        }
        return '1=1';

      case 'is_empty':
        return `(${column} IS NULL OR ${column} = '')`;

      case 'is_not_empty':
        return `(${column} IS NOT NULL AND ${column} != '')`;

      case 'before':
        params.push(value as string);
        return `${column} < ?`;

      case 'after':
        params.push(value as string);
        return `${column} > ?`;

      case 'on_or_before':
        params.push(value as string);
        return `${column} <= ?`;

      case 'on_or_after':
        params.push(value as string);
        return `${column} >= ?`;

      default:
        return '1=1';
    }
  }

  /**
   * Get column mapping for a field
   */
  private getFieldColumn(field: string): { column: string; table?: string; isSubquery: boolean } | null {
    const fieldMap: Record<string, { column: string; table?: string; isSubquery: boolean }> = {
      // Case fields
      case_id: { column: 'id', isSubquery: false },
      status: { column: 'status', isSubquery: false },
      workflow_status: { column: 'workflow_status', isSubquery: false },
      created_at: { column: 'created_at', isSubquery: false },
      updated_at: { column: 'updated_at', isSubquery: false },
      receipt_date: { column: 'receipt_date', isSubquery: false },
      report_type: { column: 'report_type', isSubquery: false },
      is_serious: { column: 'is_serious', isSubquery: false },
      sender_organization: { column: 'sender_organization', isSubquery: false },
      sender_country: { column: 'sender_country', isSubquery: false },
      current_assignee: { column: 'current_assignee', isSubquery: false },

      // Patient fields
      patient_initials: { column: 'patient_initials', isSubquery: false },
      patient_age: { column: 'patient_age', isSubquery: false },
      patient_sex: { column: 'patient_sex', isSubquery: false },
      patient_weight: { column: 'patient_weight', isSubquery: false },

      // Drug fields
      product_name: { column: 'product_name', table: 'case_drugs', isSubquery: true },
      drug_characterization: { column: 'characterization', table: 'case_drugs', isSubquery: true },
      indication: { column: 'indication_term', table: 'case_drugs', isSubquery: true },

      // Reaction fields
      reaction_term: { column: 'reaction_term', table: 'case_reactions', isSubquery: true },
      reaction_meddra_pt: { column: 'meddra_pt_name', table: 'case_reactions', isSubquery: true },
      reaction_meddra_code: { column: 'meddra_pt_code', table: 'case_reactions', isSubquery: true },
      reaction_outcome: { column: 'outcome', table: 'case_reactions', isSubquery: true },

      // Reporter fields
      reporter_qualification: { column: 'qualification', table: 'case_reporters', isSubquery: true },
      reporter_country: { column: 'country_code', table: 'case_reporters', isSubquery: true },

      // Seriousness
      serious_death: { column: 'serious_death', isSubquery: false },
      serious_life_threat: { column: 'serious_life_threat', isSubquery: false },
      serious_hospitalization: { column: 'serious_hospitalization', isSubquery: false },
      serious_disability: { column: 'serious_disability', isSubquery: false },
      serious_congenital: { column: 'serious_congenital', isSubquery: false },
      serious_other: { column: 'serious_other', isSubquery: false }
    };

    return fieldMap[field] || null;
  }
}
