/**
 * Reporter Repository - Database access layer for case reporters
 */

import type { DatabaseInstance } from '../types';
import type { CaseReporter, ReporterQualification } from '../../../shared/types/case.types';

export class ReporterRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Get all reporters for a case
   */
  findByCaseId(caseId: string): CaseReporter[] {
    const rows = this.db.prepare(`
      SELECT * FROM case_reporters
      WHERE case_id = ?
      ORDER BY is_primary DESC, sort_order ASC
    `).all(caseId) as Record<string, unknown>[];

    return rows.map(row => this.mapRowToReporter(row));
  }

  /**
   * Get a single reporter by ID
   */
  findById(id: number): CaseReporter | null {
    const row = this.db.prepare(
      'SELECT * FROM case_reporters WHERE id = ?'
    ).get(id) as Record<string, unknown> | undefined;

    return row ? this.mapRowToReporter(row) : null;
  }

  /**
   * Create a new reporter
   */
  create(reporter: Omit<CaseReporter, 'id'>): CaseReporter {
    const stmt = this.db.prepare(`
      INSERT INTO case_reporters (
        case_id, is_primary, title, given_name, family_name,
        qualification, organization, department, address,
        city, state, postcode, country, phone, email, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      reporter.caseId,
      reporter.isPrimary ? 1 : 0,
      reporter.title ?? null,
      reporter.givenName ?? null,
      reporter.familyName ?? null,
      reporter.qualification ?? null,
      reporter.organization ?? null,
      reporter.department ?? null,
      reporter.address ?? null,
      reporter.city ?? null,
      reporter.state ?? null,
      reporter.postcode ?? null,
      reporter.country ?? null,
      reporter.phone ?? null,
      reporter.email ?? null,
      reporter.sortOrder
    );

    return this.findById(Number(result.lastInsertRowid))!;
  }

  /**
   * Update an existing reporter
   */
  update(id: number, reporter: Partial<CaseReporter>): CaseReporter | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const stmt = this.db.prepare(`
      UPDATE case_reporters SET
        is_primary = ?,
        title = ?,
        given_name = ?,
        family_name = ?,
        qualification = ?,
        organization = ?,
        department = ?,
        address = ?,
        city = ?,
        state = ?,
        postcode = ?,
        country = ?,
        phone = ?,
        email = ?,
        sort_order = ?
      WHERE id = ?
    `);

    stmt.run(
      (reporter.isPrimary ?? existing.isPrimary) ? 1 : 0,
      reporter.title ?? existing.title ?? null,
      reporter.givenName ?? existing.givenName ?? null,
      reporter.familyName ?? existing.familyName ?? null,
      reporter.qualification ?? existing.qualification ?? null,
      reporter.organization ?? existing.organization ?? null,
      reporter.department ?? existing.department ?? null,
      reporter.address ?? existing.address ?? null,
      reporter.city ?? existing.city ?? null,
      reporter.state ?? existing.state ?? null,
      reporter.postcode ?? existing.postcode ?? null,
      reporter.country ?? existing.country ?? null,
      reporter.phone ?? existing.phone ?? null,
      reporter.email ?? existing.email ?? null,
      reporter.sortOrder ?? existing.sortOrder,
      id
    );

    return this.findById(id);
  }

  /**
   * Save a reporter (create or update)
   */
  save(reporter: CaseReporter): CaseReporter {
    if (reporter.id) {
      return this.update(reporter.id, reporter) ?? this.create(reporter);
    }
    return this.create(reporter);
  }

  /**
   * Delete a reporter
   */
  delete(id: number): boolean {
    const result = this.db.prepare(
      'DELETE FROM case_reporters WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  /**
   * Set a reporter as primary (and unset others)
   */
  setPrimary(caseId: string, reporterId: number): void {
    const transaction = this.db.transaction(() => {
      // Unset all primaries for this case
      this.db.prepare(
        'UPDATE case_reporters SET is_primary = 0 WHERE case_id = ?'
      ).run(caseId);

      // Set the specified reporter as primary
      this.db.prepare(
        'UPDATE case_reporters SET is_primary = 1 WHERE id = ? AND case_id = ?'
      ).run(reporterId, caseId);
    });

    transaction();
  }

  /**
   * Map database row to CaseReporter object
   */
  private mapRowToReporter(row: Record<string, unknown>): CaseReporter {
    return {
      id: row.id as number,
      caseId: row.case_id as string,
      isPrimary: row.is_primary === 1,
      title: row.title as string | undefined,
      givenName: row.given_name as string | undefined,
      familyName: row.family_name as string | undefined,
      qualification: row.qualification as ReporterQualification | undefined,
      organization: row.organization as string | undefined,
      department: row.department as string | undefined,
      address: row.address as string | undefined,
      city: row.city as string | undefined,
      state: row.state as string | undefined,
      postcode: row.postcode as string | undefined,
      country: row.country as string | undefined,
      phone: row.phone as string | undefined,
      email: row.email as string | undefined,
      sortOrder: row.sort_order as number
    };
  }
}
