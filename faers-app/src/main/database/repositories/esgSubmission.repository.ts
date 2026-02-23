/**
 * ESG Submission Repository - Database access layer for ESG API submission tracking (Phase 2B)
 *
 * Handles persistence for API submission attempts, ESG API settings,
 * and dashboard queries related to automated FDA ESG NextGen submissions.
 */

import type { DatabaseInstance } from '../types';
import type {
  ApiSubmissionAttempt,
  EsgApiSettings,
  SaveEsgSettingsRequest
} from '../../../shared/types/esgApi.types';
import { DEFAULT_ESG_API_SETTINGS } from '../../../shared/types/esgApi.types';

export class EsgSubmissionRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // ============================================================
  // Submission Attempts
  // ============================================================

  /**
   * Create a new API submission attempt record
   */
  createAttempt(attempt: Omit<ApiSubmissionAttempt, 'id'>): ApiSubmissionAttempt {
    const stmt = this.db.prepare(`
      INSERT INTO api_submission_attempts (
        case_id, attempt_number, esg_submission_id, esg_core_id,
        environment, status, started_at, completed_at,
        error, error_category, http_status_code,
        ack_type, ack_timestamp, ack_fda_core_id, ack_errors,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      attempt.caseId,
      attempt.attemptNumber,
      attempt.esgSubmissionId || null,
      attempt.esgCoreId || null,
      attempt.environment,
      attempt.status,
      attempt.startedAt,
      attempt.completedAt || null,
      attempt.error || null,
      attempt.errorCategory || null,
      attempt.httpStatusCode || null,
      attempt.ackType || null,
      attempt.ackTimestamp || null,
      attempt.ackFdaCoreId || null,
      attempt.ackErrors || null,
      attempt.createdAt,
      attempt.updatedAt
    );

    return {
      id: result.lastInsertRowid as number,
      ...attempt
    };
  }

  /**
   * Update an existing API submission attempt
   */
  updateAttempt(id: number, updates: Partial<ApiSubmissionAttempt>): void {
    const fieldMap: Record<string, string> = {
      caseId: 'case_id',
      attemptNumber: 'attempt_number',
      esgSubmissionId: 'esg_submission_id',
      esgCoreId: 'esg_core_id',
      environment: 'environment',
      status: 'status',
      startedAt: 'started_at',
      completedAt: 'completed_at',
      error: 'error',
      errorCategory: 'error_category',
      httpStatusCode: 'http_status_code',
      ackType: 'ack_type',
      ackTimestamp: 'ack_timestamp',
      ackFdaCoreId: 'ack_fda_core_id',
      ackErrors: 'ack_errors'
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
      return;
    }

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const query = `UPDATE api_submission_attempts SET ${setClauses.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values);
  }

  /**
   * Get all submission attempts for a specific case
   */
  getAttemptsForCase(caseId: string): ApiSubmissionAttempt[] {
    const rows = this.db.prepare(
      'SELECT * FROM api_submission_attempts WHERE case_id = ? ORDER BY attempt_number DESC'
    ).all(caseId);

    return rows.map((row: unknown) => this.mapRowToAttempt(row));
  }

  /**
   * Get the latest (most recent) submission attempt for a case
   */
  getLatestAttempt(caseId: string): ApiSubmissionAttempt | null {
    const row = this.db.prepare(
      'SELECT * FROM api_submission_attempts WHERE case_id = ? ORDER BY attempt_number DESC LIMIT 1'
    ).get(caseId);

    return row ? this.mapRowToAttempt(row) : null;
  }

  /**
   * Get all currently active (in-progress or retrying) submission attempts
   */
  getActiveAttempts(): ApiSubmissionAttempt[] {
    const rows = this.db.prepare(
      `SELECT * FROM api_submission_attempts
       WHERE status IN ('in_progress', 'retrying')
       ORDER BY started_at DESC`
    ).all();

    return rows.map((row: unknown) => this.mapRowToAttempt(row));
  }

  // ============================================================
  // ESG API Settings
  // ============================================================

  /**
   * Retrieve ESG API settings from the settings table.
   * Each setting is stored as a separate row with key prefixed by 'esg_api_'.
   */
  getEsgApiSettings(): EsgApiSettings {
    const rows = this.db.prepare(
      "SELECT key, value FROM settings WHERE key LIKE 'esg_api_%'"
    ).all() as Array<{ key: string; value: string }>;

    // Build a map of stored settings
    const stored: Record<string, string> = {};
    for (const row of rows) {
      // Strip the 'esg_api_' prefix to get the setting name
      const settingName = row.key.replace('esg_api_', '');
      stored[settingName] = row.value;
    }

    // Merge stored values over defaults
    return {
      clientId: stored.clientId ?? DEFAULT_ESG_API_SETTINGS.clientId,
      environment: (stored.environment as EsgApiSettings['environment']) ?? DEFAULT_ESG_API_SETTINGS.environment,
      senderCompanyName: stored.senderCompanyName ?? DEFAULT_ESG_API_SETTINGS.senderCompanyName,
      senderContactName: stored.senderContactName ?? DEFAULT_ESG_API_SETTINGS.senderContactName,
      senderContactEmail: stored.senderContactEmail ?? DEFAULT_ESG_API_SETTINGS.senderContactEmail,
      pollingIntervalMinutes: stored.pollingIntervalMinutes
        ? parseInt(stored.pollingIntervalMinutes, 10)
        : DEFAULT_ESG_API_SETTINGS.pollingIntervalMinutes,
      pollingTimeoutHours: stored.pollingTimeoutHours
        ? parseInt(stored.pollingTimeoutHours, 10)
        : DEFAULT_ESG_API_SETTINGS.pollingTimeoutHours,
      maxAutomaticRetries: stored.maxAutomaticRetries
        ? parseInt(stored.maxAutomaticRetries, 10)
        : DEFAULT_ESG_API_SETTINGS.maxAutomaticRetries,
      maxTotalAttempts: stored.maxTotalAttempts
        ? parseInt(stored.maxTotalAttempts, 10)
        : DEFAULT_ESG_API_SETTINGS.maxTotalAttempts,
      isConfigured: stored.isConfigured === 'true',
      lastConnectionTest: stored.lastConnectionTest || undefined,
      lastConnectionResult: (stored.lastConnectionResult as EsgApiSettings['lastConnectionResult']) || undefined
    };
  }

  /**
   * Save ESG API settings to the settings table.
   * Each setting is stored as a separate row with key prefixed by 'esg_api_'.
   */
  saveEsgApiSettings(settings: Partial<SaveEsgSettingsRequest>): void {
    const now = new Date().toISOString();

    const upsertStmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `);

    const saveTransaction = this.db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined) {
          const dbKey = `esg_api_${key}`;
          const dbValue = String(value);
          upsertStmt.run(dbKey, dbValue, now, dbValue, now);
        }
      }
    });

    saveTransaction();
  }

  // ============================================================
  // Dashboard Queries
  // ============================================================

  /**
   * Get submitted cases that are awaiting acknowledgment.
   * These are attempts with status='success' and no ack_type set yet.
   */
  getSubmittedCasesAwaitingAck(): ApiSubmissionAttempt[] {
    const rows = this.db.prepare(`
      SELECT * FROM api_submission_attempts
      WHERE status = 'success'
        AND ack_type IS NULL
      ORDER BY completed_at DESC
    `).all();

    return rows.map((row: unknown) => this.mapRowToAttempt(row));
  }

  /**
   * Get all failed submission attempts (most recent per case)
   */
  getFailedSubmissions(): ApiSubmissionAttempt[] {
    const rows = this.db.prepare(`
      SELECT a.* FROM api_submission_attempts a
      INNER JOIN (
        SELECT case_id, MAX(attempt_number) as max_attempt
        FROM api_submission_attempts
        WHERE status = 'failed'
        GROUP BY case_id
      ) latest ON a.case_id = latest.case_id AND a.attempt_number = latest.max_attempt
      WHERE a.status = 'failed'
      ORDER BY a.updated_at DESC
    `).all();

    return rows.map((row: unknown) => this.mapRowToAttempt(row));
  }

  /**
   * Get recent acknowledgments, ordered by timestamp descending
   */
  getRecentAcknowledgments(limit: number = 20): ApiSubmissionAttempt[] {
    const rows = this.db.prepare(`
      SELECT * FROM api_submission_attempts
      WHERE ack_type IS NOT NULL
      ORDER BY ack_timestamp DESC
      LIMIT ?
    `).all(limit);

    return rows.map((row: unknown) => this.mapRowToAttempt(row));
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private mapRowToAttempt(row: unknown): ApiSubmissionAttempt {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as number,
      caseId: r.case_id as string,
      attemptNumber: r.attempt_number as number,
      esgSubmissionId: r.esg_submission_id as string | undefined,
      esgCoreId: r.esg_core_id as string | undefined,
      environment: r.environment as ApiSubmissionAttempt['environment'],
      status: r.status as ApiSubmissionAttempt['status'],
      startedAt: r.started_at as string,
      completedAt: r.completed_at as string | undefined,
      error: r.error as string | undefined,
      errorCategory: r.error_category as ApiSubmissionAttempt['errorCategory'],
      httpStatusCode: r.http_status_code as number | undefined,
      ackType: r.ack_type as ApiSubmissionAttempt['ackType'],
      ackTimestamp: r.ack_timestamp as string | undefined,
      ackFdaCoreId: r.ack_fda_core_id as string | undefined,
      ackErrors: r.ack_errors as string | undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string
    };
  }
}
