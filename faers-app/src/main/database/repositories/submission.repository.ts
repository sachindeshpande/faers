/**
 * Submission Repository - Database access layer for submission tracking (Phase 2)
 */

import type { DatabaseInstance } from '../types';
import type {
  SubmissionRecord,
  SubmissionHistoryEntry,
  SubmissionEventType,
  CaseStatus,
  NeedsAttentionItem,
  RecentActivityItem
} from '../../../shared/types/case.types';

export class SubmissionRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // ============================================================
  // Submission Records
  // ============================================================

  /**
   * Create a new submission record
   */
  createSubmissionRecord(
    record: Omit<SubmissionRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): SubmissionRecord {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO submission_records (
        case_id, srp_confirmation_number, submission_date,
        acknowledgment_date, acknowledgment_type, fda_case_number,
        rejection_reason, exported_filename, exported_file_path,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      record.caseId,
      record.srpConfirmationNumber || null,
      record.submissionDate || null,
      record.acknowledgmentDate || null,
      record.acknowledgmentType || null,
      record.fdaCaseNumber || null,
      record.rejectionReason || null,
      record.exportedFilename || null,
      record.exportedFilePath || null,
      record.notes || null,
      now,
      now
    );

    return this.findSubmissionById(result.lastInsertRowid as number)!;
  }

  /**
   * Update an existing submission record
   */
  updateSubmissionRecord(
    id: number,
    updates: Partial<SubmissionRecord>
  ): SubmissionRecord | null {
    const fieldMap: Record<string, string> = {
      srpConfirmationNumber: 'srp_confirmation_number',
      submissionDate: 'submission_date',
      acknowledgmentDate: 'acknowledgment_date',
      acknowledgmentType: 'acknowledgment_type',
      fdaCaseNumber: 'fda_case_number',
      rejectionReason: 'rejection_reason',
      exportedFilename: 'exported_filename',
      exportedFilePath: 'exported_file_path',
      notes: 'notes'
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = ?`);
        values.push(value ?? null);
      }
    }

    if (setClauses.length === 0) {
      return this.findSubmissionById(id);
    }

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const query = `UPDATE submission_records SET ${setClauses.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values);

    return this.findSubmissionById(id);
  }

  /**
   * Find submission record by ID
   */
  findSubmissionById(id: number): SubmissionRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM submission_records WHERE id = ?'
    ).get(id);

    return row ? this.mapRowToSubmissionRecord(row) : null;
  }

  /**
   * Find all submission records for a case
   */
  findSubmissionsByCaseId(caseId: string): SubmissionRecord[] {
    const rows = this.db.prepare(
      'SELECT * FROM submission_records WHERE case_id = ? ORDER BY created_at DESC'
    ).all(caseId);

    return rows.map((row: unknown) => this.mapRowToSubmissionRecord(row));
  }

  /**
   * Get the latest submission record for a case
   */
  getLatestSubmission(caseId: string): SubmissionRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM submission_records WHERE case_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(caseId);

    return row ? this.mapRowToSubmissionRecord(row) : null;
  }

  // ============================================================
  // Submission History
  // ============================================================

  /**
   * Add a history entry for a case
   */
  addHistoryEntry(
    entry: Omit<SubmissionHistoryEntry, 'id' | 'timestamp'>
  ): SubmissionHistoryEntry {
    const timestamp = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO submission_history (case_id, event_type, timestamp, details, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entry.caseId,
      entry.eventType,
      timestamp,
      entry.details || null,
      entry.notes || null,
      entry.userId || null
    );

    return {
      id: result.lastInsertRowid as number,
      caseId: entry.caseId,
      eventType: entry.eventType,
      timestamp,
      details: entry.details,
      notes: entry.notes,
      userId: entry.userId
    };
  }

  /**
   * Get history entries for a case
   */
  getHistoryByCaseId(caseId: string): SubmissionHistoryEntry[] {
    const rows = this.db.prepare(`
      SELECT * FROM submission_history
      WHERE case_id = ?
      ORDER BY timestamp DESC
    `).all(caseId);

    return rows.map((row: unknown) => this.mapRowToHistoryEntry(row));
  }

  // ============================================================
  // Export Sequence
  // ============================================================

  /**
   * Get the next sequence number for a given date
   */
  getNextSequenceNumber(date: string): number {
    const row = this.db.prepare(
      'SELECT last_sequence FROM export_sequences WHERE date = ?'
    ).get(date) as { last_sequence: number } | undefined;

    const nextSequence = (row?.last_sequence || 0) + 1;

    this.db.prepare(`
      INSERT INTO export_sequences (date, last_sequence)
      VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET last_sequence = ?
    `).run(date, nextSequence, nextSequence);

    return nextSequence;
  }

  // ============================================================
  // Dashboard Queries
  // ============================================================

  /**
   * Get count of cases by status
   */
  getStatusCounts(): Record<CaseStatus, number> {
    const rows = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM cases
      WHERE deleted_at IS NULL
      GROUP BY status
    `).all() as Array<{ status: string; count: number }>;

    // Initialize all statuses to 0
    const counts: Record<string, number> = {
      Draft: 0,
      'Ready for Export': 0,
      Exported: 0,
      Submitted: 0,
      Acknowledged: 0,
      Rejected: 0
    };

    for (const row of rows) {
      if (row.status in counts) {
        counts[row.status] = row.count;
      }
    }

    return counts as Record<CaseStatus, number>;
  }

  /**
   * Get cases that need attention
   */
  getCasesNeedingAttention(): NeedsAttentionItem[] {
    const results: NeedsAttentionItem[] = [];
    const now = new Date();

    // Exported but not submitted (> 24 hours)
    const exportedNotSubmitted = this.db.prepare(`
      SELECT id, exported_at FROM cases
      WHERE status = 'Exported'
      AND deleted_at IS NULL
      AND exported_at IS NOT NULL
      AND datetime(exported_at) < datetime('now', '-24 hours')
    `).all() as Array<{ id: string; exported_at: string }>;

    for (const row of exportedNotSubmitted) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(row.exported_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      results.push({
        caseId: row.id,
        reason: 'exported_not_submitted',
        daysSinceEvent: daysSince,
        lastEventDate: row.exported_at
      });
    }

    // Submitted but no acknowledgment (> 7 days)
    const submittedNoAck = this.db.prepare(`
      SELECT id, last_submitted_at FROM cases
      WHERE status = 'Submitted'
      AND deleted_at IS NULL
      AND last_submitted_at IS NOT NULL
      AND datetime(last_submitted_at) < datetime('now', '-7 days')
    `).all() as Array<{ id: string; last_submitted_at: string }>;

    for (const row of submittedNoAck) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(row.last_submitted_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      results.push({
        caseId: row.id,
        reason: 'submitted_no_ack',
        daysSinceEvent: daysSince,
        lastEventDate: row.last_submitted_at
      });
    }

    // Rejected cases
    const rejected = this.db.prepare(`
      SELECT id, updated_at FROM cases
      WHERE status = 'Rejected'
      AND deleted_at IS NULL
    `).all() as Array<{ id: string; updated_at: string }>;

    for (const row of rejected) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(row.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      results.push({
        caseId: row.id,
        reason: 'rejected',
        daysSinceEvent: daysSince,
        lastEventDate: row.updated_at
      });
    }

    return results;
  }

  /**
   * Get recent submission activity
   */
  getRecentActivity(limit: number = 20): RecentActivityItem[] {
    const rows = this.db.prepare(`
      SELECT case_id, event_type, timestamp, details
      FROM submission_history
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as Array<{
      case_id: string;
      event_type: string;
      timestamp: string;
      details: string | null;
    }>;

    return rows.map((row) => ({
      caseId: row.case_id,
      eventType: row.event_type as SubmissionEventType,
      timestamp: row.timestamp,
      description: this.formatEventDescription(
        row.event_type as SubmissionEventType,
        row.details
      )
    }));
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private mapRowToSubmissionRecord(row: unknown): SubmissionRecord {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as number,
      caseId: r.case_id as string,
      srpConfirmationNumber: r.srp_confirmation_number as string | undefined,
      submissionDate: r.submission_date as string | undefined,
      acknowledgmentDate: r.acknowledgment_date as string | undefined,
      acknowledgmentType: r.acknowledgment_type as 'Accepted' | 'Rejected' | undefined,
      fdaCaseNumber: r.fda_case_number as string | undefined,
      rejectionReason: r.rejection_reason as string | undefined,
      exportedFilename: r.exported_filename as string | undefined,
      exportedFilePath: r.exported_file_path as string | undefined,
      notes: r.notes as string | undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string
    };
  }

  private mapRowToHistoryEntry(row: unknown): SubmissionHistoryEntry {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as number,
      caseId: r.case_id as string,
      eventType: r.event_type as SubmissionEventType,
      timestamp: r.timestamp as string,
      details: r.details as string | undefined,
      notes: r.notes as string | undefined,
      userId: r.user_id as string | undefined
    };
  }

  private formatEventDescription(
    eventType: SubmissionEventType,
    details: string | null
  ): string {
    const descriptions: Record<SubmissionEventType, string> = {
      created: 'Case created',
      marked_ready: 'Marked ready for export',
      returned_to_draft: 'Returned to draft',
      exported: 'Exported to XML',
      submitted: 'Submitted to FDA',
      acknowledged: 'FDA acknowledged submission',
      rejected: 'FDA rejected submission'
    };

    let description = descriptions[eventType] || eventType;

    if (details) {
      try {
        const parsed = JSON.parse(details);
        if (parsed.filename) {
          description += ` (${parsed.filename})`;
        }
        if (parsed.srpConfirmationNumber) {
          description += ` - ESG Core ID: ${parsed.srpConfirmationNumber}`;
        }
        if (parsed.fdaCaseNumber) {
          description += ` - FDA Case: ${parsed.fdaCaseNumber}`;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return description;
  }
}
