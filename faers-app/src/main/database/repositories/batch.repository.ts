/**
 * Batch Repository
 * Phase 4: Database operations for submission batches
 */

import type { Database as DatabaseType } from 'better-sqlite3';
import type {
  SubmissionBatch,
  BatchCase,
  BatchListItem,
  BatchType,
  BatchStatus,
  BatchFilter
} from '../../../shared/types/batch.types';

// Database row type
interface BatchRow {
  id: number;
  batch_number: string;
  batch_type: string;
  case_count: number;
  valid_case_count: number;
  invalid_case_count: number;
  xml_filename: string | null;
  xml_file_path: string | null;
  status: string;
  submission_mode: string | null;
  esg_core_id: string | null;
  submitted_at: string | null;
  acknowledged_at: string | null;
  ack_type: string | null;
  ack_details: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

interface BatchCaseRow {
  batch_id: number;
  case_id: string;
  validation_status: string;
  validation_errors: string | null;
  added_at: string;
  safety_report_id?: string | null;
  patient_initials?: string | null;
  report_type?: string | null;
  workflow_status?: string | null;
}

export class BatchRepository {
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
  }

  /**
   * Generate next batch number
   */
  generateBatchNumber(batchType: BatchType): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Get count of batches for today
    const countResult = this.db.prepare(`
      SELECT COUNT(*) as count FROM submission_batches
      WHERE batch_number LIKE ?
    `).get(`BATCH-${datePrefix}-%`) as { count: number };

    const sequence = String(countResult.count + 1).padStart(3, '0');
    const typePrefix = batchType.substring(0, 3).toUpperCase();

    return `BATCH-${datePrefix}-${typePrefix}-${sequence}`;
  }

  /**
   * Create a new batch
   */
  create(
    batchType: BatchType,
    caseIds: string[],
    createdBy?: string,
    notes?: string,
    submissionMode?: 'test' | 'production'
  ): SubmissionBatch {
    const now = new Date().toISOString();
    const batchNumber = this.generateBatchNumber(batchType);

    // Insert batch
    const result = this.db.prepare(`
      INSERT INTO submission_batches (
        batch_number, batch_type, case_count, status,
        submission_mode, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, 'created', ?, ?, ?, ?, ?)
    `).run(
      batchNumber,
      batchType,
      caseIds.length,
      submissionMode || null,
      notes || null,
      createdBy || null,
      now,
      now
    );

    const batchId = result.lastInsertRowid as number;

    // Add cases to batch
    const insertCase = this.db.prepare(`
      INSERT INTO batch_cases (batch_id, case_id, validation_status, added_at)
      VALUES (?, ?, 'pending', ?)
    `);

    for (const caseId of caseIds) {
      insertCase.run(batchId, caseId, now);
    }

    return this.findById(batchId)!;
  }

  /**
   * Find batch by ID
   */
  findById(id: number): SubmissionBatch | null {
    const row = this.db.prepare(`
      SELECT b.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM submission_batches b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
    `).get(id) as BatchRow | undefined;

    if (!row) return null;
    return this.mapRowToBatch(row);
  }

  /**
   * Find batch by batch number
   */
  findByBatchNumber(batchNumber: string): SubmissionBatch | null {
    const row = this.db.prepare(`
      SELECT b.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM submission_batches b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.batch_number = ?
    `).get(batchNumber) as BatchRow | undefined;

    if (!row) return null;
    return this.mapRowToBatch(row);
  }

  /**
   * List batches with filtering
   */
  list(filter?: BatchFilter, limit = 50, offset = 0): { batches: BatchListItem[]; total: number } {
    let whereClause = '1=1';
    const params: unknown[] = [];

    if (filter?.batchType) {
      whereClause += ' AND b.batch_type = ?';
      params.push(filter.batchType);
    }

    if (filter?.status) {
      whereClause += ' AND b.status = ?';
      params.push(filter.status);
    }

    if (filter?.submissionMode) {
      whereClause += ' AND b.submission_mode = ?';
      params.push(filter.submissionMode);
    }

    if (filter?.fromDate) {
      whereClause += ' AND b.created_at >= ?';
      params.push(filter.fromDate);
    }

    if (filter?.toDate) {
      whereClause += ' AND b.created_at <= ?';
      params.push(filter.toDate);
    }

    if (filter?.createdBy) {
      whereClause += ' AND b.created_by = ?';
      params.push(filter.createdBy);
    }

    if (filter?.search) {
      whereClause += ' AND b.batch_number LIKE ?';
      params.push(`%${filter.search}%`);
    }

    // Get total count
    const countResult = this.db.prepare(`
      SELECT COUNT(*) as count FROM submission_batches b
      WHERE ${whereClause}
    `).get(...params) as { count: number };

    // Get batches
    const rows = this.db.prepare(`
      SELECT b.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM submission_batches b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as BatchRow[];

    return {
      batches: rows.map(row => this.mapRowToListItem(row)),
      total: countResult.count
    };
  }

  /**
   * Get cases in a batch
   */
  getBatchCases(batchId: number): BatchCase[] {
    const rows = this.db.prepare(`
      SELECT bc.*, c.safety_report_id, c.patient_initials,
             c.report_type_classification as report_type, c.workflow_status
      FROM batch_cases bc
      JOIN cases c ON bc.case_id = c.id
      WHERE bc.batch_id = ?
      ORDER BY bc.added_at
    `).all(batchId) as BatchCaseRow[];

    return rows.map(row => this.mapRowToBatchCase(row));
  }

  /**
   * Update case validation status in batch
   */
  updateCaseValidation(
    batchId: number,
    caseId: string,
    validationStatus: 'pending' | 'valid' | 'invalid',
    errors?: string[]
  ): void {
    this.db.prepare(`
      UPDATE batch_cases
      SET validation_status = ?, validation_errors = ?
      WHERE batch_id = ? AND case_id = ?
    `).run(
      validationStatus,
      errors ? JSON.stringify(errors) : null,
      batchId,
      caseId
    );
  }

  /**
   * Update batch validation counts
   */
  updateValidationCounts(batchId: number): void {
    const counts = this.db.prepare(`
      SELECT
        SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) as valid_count,
        SUM(CASE WHEN validation_status = 'invalid' THEN 1 ELSE 0 END) as invalid_count
      FROM batch_cases
      WHERE batch_id = ?
    `).get(batchId) as { valid_count: number; invalid_count: number };

    this.db.prepare(`
      UPDATE submission_batches
      SET valid_case_count = ?, invalid_case_count = ?, updated_at = ?
      WHERE id = ?
    `).run(counts.valid_count, counts.invalid_count, new Date().toISOString(), batchId);
  }

  /**
   * Update batch status
   */
  updateStatus(batchId: number, status: BatchStatus): void {
    this.db.prepare(`
      UPDATE submission_batches
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(status, new Date().toISOString(), batchId);
  }

  /**
   * Update batch XML info
   */
  updateXmlInfo(batchId: number, filename: string, filePath: string): void {
    this.db.prepare(`
      UPDATE submission_batches
      SET xml_filename = ?, xml_file_path = ?, status = 'exported', updated_at = ?
      WHERE id = ?
    `).run(filename, filePath, new Date().toISOString(), batchId);
  }

  /**
   * Record batch submission
   */
  recordSubmission(batchId: number, esgCoreId: string, submittedAt: string): void {
    this.db.prepare(`
      UPDATE submission_batches
      SET esg_core_id = ?, submitted_at = ?, status = 'submitted', updated_at = ?
      WHERE id = ?
    `).run(esgCoreId, submittedAt, new Date().toISOString(), batchId);
  }

  /**
   * Record batch acknowledgment
   */
  recordAcknowledgment(
    batchId: number,
    ackType: 'accepted' | 'rejected' | 'partial',
    acknowledgedAt: string,
    ackDetails?: string
  ): void {
    const status = ackType === 'rejected' ? 'rejected' : 'acknowledged';
    this.db.prepare(`
      UPDATE submission_batches
      SET ack_type = ?, acknowledged_at = ?, ack_details = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(ackType, acknowledgedAt, ackDetails || null, status, new Date().toISOString(), batchId);
  }

  /**
   * Add case to existing batch
   */
  addCase(batchId: number, caseId: string): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT OR IGNORE INTO batch_cases (batch_id, case_id, validation_status, added_at)
      VALUES (?, ?, 'pending', ?)
    `).run(batchId, caseId, now);

    // Update case count
    this.db.prepare(`
      UPDATE submission_batches
      SET case_count = (SELECT COUNT(*) FROM batch_cases WHERE batch_id = ?), updated_at = ?
      WHERE id = ?
    `).run(batchId, now, batchId);
  }

  /**
   * Remove case from batch
   */
  removeCase(batchId: number, caseId: string): void {
    this.db.prepare(`
      DELETE FROM batch_cases WHERE batch_id = ? AND case_id = ?
    `).run(batchId, caseId);

    // Update case count
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE submission_batches
      SET case_count = (SELECT COUNT(*) FROM batch_cases WHERE batch_id = ?), updated_at = ?
      WHERE id = ?
    `).run(batchId, now, batchId);
  }

  /**
   * Check if case is already in an active batch
   */
  isCaseInActiveBatch(caseId: string): { inBatch: boolean; batchId?: number; batchNumber?: string } {
    const row = this.db.prepare(`
      SELECT b.id, b.batch_number
      FROM batch_cases bc
      JOIN submission_batches b ON bc.batch_id = b.id
      WHERE bc.case_id = ? AND b.status NOT IN ('acknowledged', 'rejected', 'failed')
    `).get(caseId) as { id: number; batch_number: string } | undefined;

    if (row) {
      return { inBatch: true, batchId: row.id, batchNumber: row.batch_number };
    }
    return { inBatch: false };
  }

  /**
   * Delete a batch (only if status is 'created')
   */
  delete(batchId: number): boolean {
    const batch = this.findById(batchId);
    if (!batch || batch.status !== 'created') {
      return false;
    }

    this.db.prepare('DELETE FROM batch_cases WHERE batch_id = ?').run(batchId);
    this.db.prepare('DELETE FROM submission_batches WHERE id = ?').run(batchId);
    return true;
  }

  /**
   * Get eligible cases for batch type
   */
  getEligibleCases(batchType: BatchType): Array<{
    caseId: string;
    safetyReportId?: string;
    patientInitials?: string;
    reportTypeClassification?: string;
    workflowStatus?: string;
    alreadyInBatch: boolean;
    existingBatchId?: number;
  }> {
    // Determine eligible workflow status based on batch type
    let workflowStatusCondition: string;
    let reportTypeCondition = '';

    if (batchType === 'expedited') {
      workflowStatusCondition = "c.workflow_status = 'Approved'";
      reportTypeCondition = "AND c.report_type_classification = 'expedited'";
    } else if (batchType === 'non_expedited') {
      workflowStatusCondition = "c.workflow_status IN ('Approved', 'Pending PSR')";
      reportTypeCondition = "AND c.report_type_classification = 'non_expedited'";
    } else if (batchType === 'followup') {
      workflowStatusCondition = "c.workflow_status = 'Approved'";
      reportTypeCondition = "AND c.followup_type IS NOT NULL";
    } else {
      workflowStatusCondition = "c.workflow_status IN ('Approved', 'Pending PSR')";
    }

    const rows = this.db.prepare(`
      SELECT
        c.id as case_id,
        c.safety_report_id,
        c.patient_initials,
        c.report_type_classification,
        c.workflow_status,
        bc.batch_id as existing_batch_id
      FROM cases c
      LEFT JOIN batch_cases bc ON c.id = bc.case_id
      LEFT JOIN submission_batches b ON bc.batch_id = b.id
        AND b.status NOT IN ('acknowledged', 'rejected', 'failed')
      WHERE ${workflowStatusCondition} ${reportTypeCondition}
        AND c.is_nullified = 0
        AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `).all() as Array<{
      case_id: string;
      safety_report_id: string | null;
      patient_initials: string | null;
      report_type_classification: string | null;
      workflow_status: string | null;
      existing_batch_id: number | null;
    }>;

    return rows.map(row => ({
      caseId: row.case_id,
      safetyReportId: row.safety_report_id || undefined,
      patientInitials: row.patient_initials || undefined,
      reportTypeClassification: row.report_type_classification || undefined,
      workflowStatus: row.workflow_status || undefined,
      alreadyInBatch: row.existing_batch_id !== null,
      existingBatchId: row.existing_batch_id || undefined
    }));
  }

  private mapRowToBatch(row: BatchRow): SubmissionBatch {
    return {
      id: row.id,
      batchNumber: row.batch_number,
      batchType: row.batch_type as BatchType,
      caseCount: row.case_count,
      validCaseCount: row.valid_case_count,
      invalidCaseCount: row.invalid_case_count,
      xmlFilename: row.xml_filename || undefined,
      xmlFilePath: row.xml_file_path || undefined,
      status: row.status as BatchStatus,
      submissionMode: row.submission_mode as 'test' | 'production' | undefined,
      esgCoreId: row.esg_core_id || undefined,
      submittedAt: row.submitted_at || undefined,
      acknowledgedAt: row.acknowledged_at || undefined,
      ackType: row.ack_type as 'accepted' | 'rejected' | 'partial' | undefined,
      ackDetails: row.ack_details || undefined,
      createdBy: row.created_by || undefined,
      createdByName: row.created_by_name || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      notes: row.notes || undefined
    };
  }

  private mapRowToListItem(row: BatchRow): BatchListItem {
    return {
      id: row.id,
      batchNumber: row.batch_number,
      batchType: row.batch_type as BatchType,
      caseCount: row.case_count,
      validCaseCount: row.valid_case_count || 0,
      invalidCaseCount: row.invalid_case_count || 0,
      status: row.status as BatchStatus,
      submissionMode: row.submission_mode as 'test' | 'production' | undefined,
      createdByName: row.created_by_name || undefined,
      createdAt: row.created_at,
      submittedAt: row.submitted_at || undefined,
      acknowledgedAt: row.acknowledged_at || undefined
    };
  }

  private mapRowToBatchCase(row: BatchCaseRow): BatchCase {
    return {
      batchId: row.batch_id,
      caseId: row.case_id,
      validationStatus: row.validation_status as 'pending' | 'valid' | 'invalid',
      validationErrors: row.validation_errors ? JSON.parse(row.validation_errors) : undefined,
      addedAt: row.added_at,
      safetyReportId: row.safety_report_id || undefined,
      patientInitials: row.patient_initials || undefined,
      reportType: row.report_type || undefined,
      workflowStatus: row.workflow_status || undefined
    };
  }
}
