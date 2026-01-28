/**
 * PSR Repository
 * Phase 4: Database operations for PSR schedules and PSRs
 */

import type { Database as DatabaseType } from 'better-sqlite3';
import type {
  PSRSchedule,
  PSR,
  PSRListItem,
  PSRCase,
  PSRFormat,
  PSRFrequency,
  PSRStatus,
  PSRFilter,
  CreatePSRScheduleDTO,
  UpdatePSRScheduleDTO,
  CreatePSRDTO
} from '../../../shared/types/psr.types';

// Database row types
interface PSRScheduleRow {
  id: number;
  product_id: number;
  psr_format: string;
  frequency: string;
  dlp_offset_days: number;
  due_offset_days: number;
  start_date: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  product_name?: string;
}

interface PSRRow {
  id: number;
  psr_number: string;
  product_id: number;
  psr_format: string;
  period_start: string;
  period_end: string;
  data_lock_point: string;
  due_date: string;
  status: string;
  descriptive_portion_path: string | null;
  ectd_submission_ref: string | null;
  icsr_batch_id: number | null;
  created_by: string | null;
  created_by_name?: string | null;
  approved_by: string | null;
  approved_by_name?: string | null;
  approved_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  product_name?: string;
  included_count?: number;
  excluded_count?: number;
  pending_count?: number;
}

interface PSRCaseRow {
  psr_id: number;
  case_id: string;
  included: number;
  exclusion_reason: string | null;
  added_at: string;
  added_by: string | null;
  safety_report_id?: string | null;
  patient_initials?: string | null;
  report_type_classification?: string | null;
  workflow_status?: string | null;
  case_created_at?: string | null;
}

export class PSRRepository {
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
  }

  // ============================================================
  // PSR Schedule Methods
  // ============================================================

  /**
   * Create a PSR schedule
   */
  createSchedule(data: CreatePSRScheduleDTO): PSRSchedule {
    const now = new Date().toISOString();

    const result = this.db.prepare(`
      INSERT INTO psr_schedules (
        product_id, psr_format, frequency, dlp_offset_days, due_offset_days,
        start_date, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      data.productId,
      data.psrFormat,
      data.frequency,
      data.dlpOffsetDays || 0,
      data.dueOffsetDays || 30,
      data.startDate || null,
      now,
      now
    );

    return this.findScheduleById(result.lastInsertRowid as number)!;
  }

  /**
   * Update a PSR schedule
   */
  updateSchedule(id: number, data: UpdatePSRScheduleDTO): PSRSchedule | null {
    const existing = this.findScheduleById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.psrFormat !== undefined) {
      updates.push('psr_format = ?');
      params.push(data.psrFormat);
    }
    if (data.frequency !== undefined) {
      updates.push('frequency = ?');
      params.push(data.frequency);
    }
    if (data.dlpOffsetDays !== undefined) {
      updates.push('dlp_offset_days = ?');
      params.push(data.dlpOffsetDays);
    }
    if (data.dueOffsetDays !== undefined) {
      updates.push('due_offset_days = ?');
      params.push(data.dueOffsetDays);
    }
    if (data.startDate !== undefined) {
      updates.push('start_date = ?');
      params.push(data.startDate || null);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      this.db.prepare(`
        UPDATE psr_schedules SET ${updates.join(', ')} WHERE id = ?
      `).run(...params);
    }

    return this.findScheduleById(id);
  }

  /**
   * Find schedule by ID
   */
  findScheduleById(id: number): PSRSchedule | null {
    const row = this.db.prepare(`
      SELECT s.*, p.product_name
      FROM psr_schedules s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.id = ?
    `).get(id) as PSRScheduleRow | undefined;

    if (!row) return null;
    return this.mapRowToSchedule(row);
  }

  /**
   * Find schedules by product
   */
  findSchedulesByProduct(productId: number): PSRSchedule[] {
    const rows = this.db.prepare(`
      SELECT s.*, p.product_name
      FROM psr_schedules s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.product_id = ?
      ORDER BY s.created_at DESC
    `).all(productId) as PSRScheduleRow[];

    return rows.map(row => this.mapRowToSchedule(row));
  }

  /**
   * Find active schedules
   */
  findActiveSchedules(): PSRSchedule[] {
    const rows = this.db.prepare(`
      SELECT s.*, p.product_name
      FROM psr_schedules s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.is_active = 1
      ORDER BY p.product_name, s.psr_format
    `).all() as PSRScheduleRow[];

    return rows.map(row => this.mapRowToSchedule(row));
  }

  /**
   * Delete schedule
   */
  deleteSchedule(id: number): boolean {
    const result = this.db.prepare('DELETE FROM psr_schedules WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // ============================================================
  // PSR Methods
  // ============================================================

  /**
   * Generate PSR number
   */
  generatePSRNumber(productId: number, psrFormat: PSRFormat): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Get count of PSRs for this product this year
    const countResult = this.db.prepare(`
      SELECT COUNT(*) as count FROM psrs
      WHERE product_id = ? AND psr_number LIKE ?
    `).get(productId, `PSR-${productId}-%`) as { count: number };

    const sequence = String(countResult.count + 1).padStart(3, '0');

    return `PSR-${productId}-${year}${month}-${psrFormat}-${sequence}`;
  }

  /**
   * Create a PSR
   */
  createPSR(data: CreatePSRDTO, createdBy?: string): PSR {
    const now = new Date().toISOString();
    const psrNumber = this.generatePSRNumber(data.productId, data.psrFormat);

    // Calculate DLP and due date if not provided
    const periodEnd = new Date(data.periodEnd);
    const dataLockPoint = data.dataLockPoint || data.periodEnd;
    const dueDate = data.dueDate || new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = this.db.prepare(`
      INSERT INTO psrs (
        psr_number, product_id, psr_format, period_start, period_end,
        data_lock_point, due_date, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `).run(
      psrNumber,
      data.productId,
      data.psrFormat,
      data.periodStart,
      data.periodEnd,
      dataLockPoint,
      dueDate,
      createdBy || null,
      now,
      now
    );

    return this.findPSRById(result.lastInsertRowid as number)!;
  }

  /**
   * Find PSR by ID
   */
  findPSRById(id: number): PSR | null {
    const row = this.db.prepare(`
      SELECT psr.*,
             p.product_name,
             cu.first_name || ' ' || cu.last_name as created_by_name,
             au.first_name || ' ' || au.last_name as approved_by_name,
             (SELECT COUNT(*) FROM psr_cases WHERE psr_id = psr.id AND included = 1) as included_count,
             (SELECT COUNT(*) FROM psr_cases WHERE psr_id = psr.id AND included = 0) as excluded_count,
             (SELECT COUNT(*) FROM cases c
              WHERE c.workflow_status IN ('Approved', 'Pending PSR')
              AND c.report_type_classification = 'non_expedited'
              AND c.product_id = psr.product_id
              AND c.created_at >= psr.period_start
              AND c.created_at <= psr.period_end
              AND c.id NOT IN (SELECT case_id FROM psr_cases WHERE psr_id = psr.id)
             ) as pending_count
      FROM psrs psr
      LEFT JOIN products p ON psr.product_id = p.id
      LEFT JOIN users cu ON psr.created_by = cu.id
      LEFT JOIN users au ON psr.approved_by = au.id
      WHERE psr.id = ?
    `).get(id) as PSRRow | undefined;

    if (!row) return null;
    return this.mapRowToPSR(row);
  }

  /**
   * Find PSR by number
   */
  findPSRByNumber(psrNumber: string): PSR | null {
    const row = this.db.prepare(`
      SELECT psr.*, p.product_name,
             cu.first_name || ' ' || cu.last_name as created_by_name,
             au.first_name || ' ' || au.last_name as approved_by_name
      FROM psrs psr
      LEFT JOIN products p ON psr.product_id = p.id
      LEFT JOIN users cu ON psr.created_by = cu.id
      LEFT JOIN users au ON psr.approved_by = au.id
      WHERE psr.psr_number = ?
    `).get(psrNumber) as PSRRow | undefined;

    if (!row) return null;
    return this.mapRowToPSR(row);
  }

  /**
   * List PSRs with filtering
   */
  listPSRs(filter?: PSRFilter, limit = 50, offset = 0): { psrs: PSRListItem[]; total: number } {
    let whereClause = '1=1';
    const params: unknown[] = [];

    if (filter?.productId) {
      whereClause += ' AND psr.product_id = ?';
      params.push(filter.productId);
    }
    if (filter?.psrFormat) {
      whereClause += ' AND psr.psr_format = ?';
      params.push(filter.psrFormat);
    }
    if (filter?.status) {
      whereClause += ' AND psr.status = ?';
      params.push(filter.status);
    }
    if (filter?.fromDate) {
      whereClause += ' AND psr.period_start >= ?';
      params.push(filter.fromDate);
    }
    if (filter?.toDate) {
      whereClause += ' AND psr.period_end <= ?';
      params.push(filter.toDate);
    }
    if (filter?.overdue) {
      whereClause += " AND psr.due_date < date('now') AND psr.status NOT IN ('submitted', 'acknowledged', 'closed')";
    }
    if (filter?.search) {
      whereClause += ' AND (psr.psr_number LIKE ? OR p.product_name LIKE ?)';
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    // Get total
    const countResult = this.db.prepare(`
      SELECT COUNT(*) as count FROM psrs psr
      LEFT JOIN products p ON psr.product_id = p.id
      WHERE ${whereClause}
    `).get(...params) as { count: number };

    // Get PSRs
    const rows = this.db.prepare(`
      SELECT psr.*, p.product_name,
             (SELECT COUNT(*) FROM psr_cases WHERE psr_id = psr.id AND included = 1) as included_count,
             (SELECT COUNT(*) FROM psr_cases WHERE psr_id = psr.id AND included = 0) as excluded_count
      FROM psrs psr
      LEFT JOIN products p ON psr.product_id = p.id
      WHERE ${whereClause}
      ORDER BY psr.due_date ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as (PSRRow & { included_count: number; excluded_count: number })[];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      psrs: rows.map(row => {
        const dueDate = new Date(row.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: row.id,
          psrNumber: row.psr_number,
          productId: row.product_id,
          productName: row.product_name || undefined,
          psrFormat: row.psr_format as PSRFormat,
          periodStart: row.period_start,
          periodEnd: row.period_end,
          dueDate: row.due_date,
          status: row.status as PSRStatus,
          includedCases: row.included_count || 0,
          excludedCases: row.excluded_count || 0,
          daysUntilDue,
          isOverdue: daysUntilDue < 0 && !['submitted', 'acknowledged', 'closed'].includes(row.status)
        };
      }),
      total: countResult.count
    };
  }

  /**
   * Update PSR status
   */
  updatePSRStatus(id: number, status: PSRStatus, approvedBy?: string): void {
    const now = new Date().toISOString();

    if (status === 'approved' && approvedBy) {
      this.db.prepare(`
        UPDATE psrs SET status = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?
      `).run(status, approvedBy, now, now, id);
    } else if (status === 'submitted') {
      this.db.prepare(`
        UPDATE psrs SET status = ?, submitted_at = ?, updated_at = ? WHERE id = ?
      `).run(status, now, now, id);
    } else {
      this.db.prepare(`
        UPDATE psrs SET status = ?, updated_at = ? WHERE id = ?
      `).run(status, now, id);
    }
  }

  /**
   * Link batch to PSR
   */
  linkBatchToPSR(psrId: number, batchId: number): void {
    this.db.prepare(`
      UPDATE psrs SET icsr_batch_id = ?, updated_at = ? WHERE id = ?
    `).run(batchId, new Date().toISOString(), psrId);
  }

  // ============================================================
  // PSR Cases Methods
  // ============================================================

  /**
   * Get cases for a PSR
   */
  getPSRCases(psrId: number): PSRCase[] {
    const rows = this.db.prepare(`
      SELECT pc.*, c.safety_report_id, c.patient_initials,
             c.report_type_classification, c.workflow_status,
             c.created_at as case_created_at
      FROM psr_cases pc
      JOIN cases c ON pc.case_id = c.id
      WHERE pc.psr_id = ?
      ORDER BY c.created_at DESC
    `).all(psrId) as PSRCaseRow[];

    return rows.map(row => this.mapRowToPSRCase(row));
  }

  /**
   * Add case to PSR
   */
  addCaseToPSR(psrId: number, caseId: string, addedBy?: string, included = true): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT OR REPLACE INTO psr_cases (psr_id, case_id, included, added_at, added_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(psrId, caseId, included ? 1 : 0, now, addedBy || null);
  }

  /**
   * Exclude case from PSR
   */
  excludeCaseFromPSR(psrId: number, caseId: string, reason?: string): void {
    this.db.prepare(`
      UPDATE psr_cases SET included = 0, exclusion_reason = ? WHERE psr_id = ? AND case_id = ?
    `).run(reason || null, psrId, caseId);
  }

  /**
   * Include case in PSR
   */
  includeCaseInPSR(psrId: number, caseId: string): void {
    this.db.prepare(`
      UPDATE psr_cases SET included = 1, exclusion_reason = NULL WHERE psr_id = ? AND case_id = ?
    `).run(psrId, caseId);
  }

  /**
   * Remove case from PSR
   */
  removeCaseFromPSR(psrId: number, caseId: string): void {
    this.db.prepare('DELETE FROM psr_cases WHERE psr_id = ? AND case_id = ?').run(psrId, caseId);
  }

  /**
   * Get eligible cases for a PSR period
   */
  getEligibleCasesForPSR(productId: number, periodStart: string, periodEnd: string, psrId?: number): Array<{
    caseId: string;
    safetyReportId?: string;
    patientInitials?: string;
    workflowStatus?: string;
    createdAt: string;
    alreadyInPSR: boolean;
    isIncluded?: boolean;
  }> {
    const rows = this.db.prepare(`
      SELECT c.id as case_id, c.safety_report_id, c.patient_initials,
             c.workflow_status, c.created_at,
             pc.psr_id, pc.included
      FROM cases c
      LEFT JOIN psr_cases pc ON c.id = pc.case_id AND pc.psr_id = ?
      WHERE c.product_id = ?
        AND c.workflow_status IN ('Approved', 'Pending PSR')
        AND c.report_type_classification = 'non_expedited'
        AND c.created_at >= ?
        AND c.created_at <= ?
        AND c.is_nullified = 0
        AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `).all(psrId || -1, productId, periodStart, periodEnd) as Array<{
      case_id: string;
      safety_report_id: string | null;
      patient_initials: string | null;
      workflow_status: string | null;
      created_at: string;
      psr_id: number | null;
      included: number | null;
    }>;

    return rows.map(row => ({
      caseId: row.case_id,
      safetyReportId: row.safety_report_id || undefined,
      patientInitials: row.patient_initials || undefined,
      workflowStatus: row.workflow_status || undefined,
      createdAt: row.created_at,
      alreadyInPSR: row.psr_id !== null,
      isIncluded: row.included === 1
    }));
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private mapRowToSchedule(row: PSRScheduleRow): PSRSchedule {
    return {
      id: row.id,
      productId: row.product_id,
      psrFormat: row.psr_format as PSRFormat,
      frequency: row.frequency as PSRFrequency,
      dlpOffsetDays: row.dlp_offset_days,
      dueOffsetDays: row.due_offset_days,
      startDate: row.start_date || undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      productName: row.product_name
    };
  }

  private mapRowToPSR(row: PSRRow): PSR {
    return {
      id: row.id,
      psrNumber: row.psr_number,
      productId: row.product_id,
      psrFormat: row.psr_format as PSRFormat,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      dataLockPoint: row.data_lock_point,
      dueDate: row.due_date,
      status: row.status as PSRStatus,
      descriptivePortionPath: row.descriptive_portion_path || undefined,
      ectdSubmissionRef: row.ectd_submission_ref || undefined,
      icsrBatchId: row.icsr_batch_id || undefined,
      createdBy: row.created_by || undefined,
      createdByName: row.created_by_name || undefined,
      approvedBy: row.approved_by || undefined,
      approvedByName: row.approved_by_name || undefined,
      approvedAt: row.approved_at || undefined,
      submittedAt: row.submitted_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      productName: row.product_name,
      caseCounts: {
        included: row.included_count || 0,
        excluded: row.excluded_count || 0,
        pending: row.pending_count || 0
      }
    };
  }

  private mapRowToPSRCase(row: PSRCaseRow): PSRCase {
    return {
      psrId: row.psr_id,
      caseId: row.case_id,
      included: row.included === 1,
      exclusionReason: row.exclusion_reason || undefined,
      addedAt: row.added_at,
      addedBy: row.added_by || undefined,
      safetyReportId: row.safety_report_id || undefined,
      patientInitials: row.patient_initials || undefined,
      reportTypeClassification: row.report_type_classification || undefined,
      workflowStatus: row.workflow_status || undefined,
      createdAt: row.case_created_at || undefined
    };
  }
}
