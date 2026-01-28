/**
 * Seriousness Repository
 * Handles CRUD operations for case seriousness criteria
 * Phase 4: Report Type Classification
 */

import type { Database } from 'better-sqlite3';

// Seriousness criterion types matching FDA requirements
export type SeriousnessCriterion =
  | 'death'
  | 'life_threatening'
  | 'hospitalization'
  | 'disability'
  | 'congenital_anomaly'
  | 'other_medically_important';

export interface CaseSeriousness {
  id?: number;
  caseId: string;
  criterion: SeriousnessCriterion;
  isChecked: boolean;
  notes?: string;
}

export interface SeriousnessRecord {
  id: number;
  case_id: string;
  criterion: string;
  is_checked: number;
  notes: string | null;
}

export class SeriousnessRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Get all seriousness criteria for a case
   */
  findByCaseId(caseId: string): CaseSeriousness[] {
    const stmt = this.db.prepare(`
      SELECT id, case_id, criterion, is_checked, notes
      FROM case_seriousness
      WHERE case_id = ?
      ORDER BY id
    `);

    const rows = stmt.all(caseId) as SeriousnessRecord[];
    return rows.map(this.mapToEntity);
  }

  /**
   * Get a specific criterion for a case
   */
  findByCaseIdAndCriterion(caseId: string, criterion: SeriousnessCriterion): CaseSeriousness | null {
    const stmt = this.db.prepare(`
      SELECT id, case_id, criterion, is_checked, notes
      FROM case_seriousness
      WHERE case_id = ? AND criterion = ?
    `);

    const row = stmt.get(caseId, criterion) as SeriousnessRecord | undefined;
    return row ? this.mapToEntity(row) : null;
  }

  /**
   * Create or update a seriousness criterion
   */
  upsert(caseId: string, criterion: SeriousnessCriterion, isChecked: boolean, notes?: string): CaseSeriousness {
    const existing = this.findByCaseIdAndCriterion(caseId, criterion);

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE case_seriousness
        SET is_checked = ?, notes = ?
        WHERE case_id = ? AND criterion = ?
      `);
      stmt.run(isChecked ? 1 : 0, notes || null, caseId, criterion);
      return { ...existing, isChecked, notes };
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO case_seriousness (case_id, criterion, is_checked, notes)
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(caseId, criterion, isChecked ? 1 : 0, notes || null);
      return {
        id: result.lastInsertRowid as number,
        caseId,
        criterion,
        isChecked,
        notes
      };
    }
  }

  /**
   * Set all seriousness criteria for a case at once
   */
  setAll(caseId: string, criteria: Array<{ criterion: SeriousnessCriterion; isChecked: boolean; notes?: string }>): CaseSeriousness[] {
    // Use a transaction for atomic updates
    const results: CaseSeriousness[] = [];

    for (const c of criteria) {
      results.push(this.upsert(caseId, c.criterion, c.isChecked, c.notes));
    }

    return results;
  }

  /**
   * Delete all seriousness criteria for a case
   */
  deleteByCaseId(caseId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM case_seriousness
      WHERE case_id = ?
    `);

    const result = stmt.run(caseId);
    return result.changes > 0;
  }

  /**
   * Check if any seriousness criterion is checked for a case
   */
  isSerious(caseId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM case_seriousness
      WHERE case_id = ? AND is_checked = 1
    `);

    const row = stmt.get(caseId) as { count: number };
    return row.count > 0;
  }

  /**
   * Get all checked criteria for a case
   */
  getCheckedCriteria(caseId: string): SeriousnessCriterion[] {
    const stmt = this.db.prepare(`
      SELECT criterion
      FROM case_seriousness
      WHERE case_id = ? AND is_checked = 1
      ORDER BY id
    `);

    const rows = stmt.all(caseId) as Array<{ criterion: string }>;
    return rows.map(r => r.criterion as SeriousnessCriterion);
  }

  /**
   * Map database row to entity
   */
  private mapToEntity(row: SeriousnessRecord): CaseSeriousness {
    return {
      id: row.id,
      caseId: row.case_id,
      criterion: row.criterion as SeriousnessCriterion,
      isChecked: row.is_checked === 1,
      notes: row.notes || undefined
    };
  }
}
