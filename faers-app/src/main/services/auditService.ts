/**
 * Audit Service
 * Handles comprehensive audit logging for 21 CFR Part 11 compliance
 */

import type {
  AuditLogEntry,
  AuditLogFilter,
  AuditLogResult,
  CreateAuditLogEntry,
  AuditActionType,
  AuditEntityType,
  ElectronicSignature,
  CreateElectronicSignature,
  FieldChange
} from '../../shared/types/audit.types';
import crypto from 'crypto';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

interface AuditLogRow {
  id: number;
  timestamp: string;
  user_id: string | null;
  username: string | null;
  session_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  details: string | null;
  ip_address: string | null;
}

interface SignatureRow {
  id: number;
  user_id: string;
  username: string;
  timestamp: string;
  entity_type: string;
  entity_id: string;
  action: string;
  meaning: string;
  record_version: number;
  signature_hash: string;
}

export class AuditService {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Log an audit entry (append-only)
   */
  log(entry: CreateAuditLogEntry): void {
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO audit_log (
        timestamp, user_id, username, session_id, action_type,
        entity_type, entity_id, field_name, old_value, new_value,
        details, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      now,
      entry.userId || null,
      entry.username || null,
      entry.sessionId || null,
      entry.actionType,
      entry.entityType,
      entry.entityId || null,
      entry.fieldName || null,
      entry.oldValue !== undefined ? this.serializeValue(entry.oldValue) : null,
      entry.newValue !== undefined ? this.serializeValue(entry.newValue) : null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null
    );
  }

  /**
   * Log multiple field changes for an entity
   */
  logFieldChanges(
    userId: string,
    username: string,
    sessionId: string | undefined,
    entityType: AuditEntityType,
    entityId: string,
    changes: FieldChange[],
    ipAddress?: string
  ): void {
    for (const change of changes) {
      this.log({
        userId,
        username,
        sessionId,
        actionType: `${entityType}_update` as AuditActionType,
        entityType,
        entityId,
        fieldName: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        ipAddress
      });
    }
  }

  /**
   * Log a workflow transition
   */
  logWorkflowTransition(
    userId: string,
    username: string,
    sessionId: string | undefined,
    caseId: string,
    fromStatus: string,
    toStatus: string,
    comment?: string,
    ipAddress?: string
  ): void {
    this.log({
      userId,
      username,
      sessionId,
      actionType: 'workflow_transition',
      entityType: 'case',
      entityId: caseId,
      oldValue: fromStatus,
      newValue: toStatus,
      details: comment ? { comment } : undefined,
      ipAddress
    });
  }

  /**
   * Create an electronic signature (21 CFR Part 11 compliant)
   */
  createSignature(data: CreateElectronicSignature): ElectronicSignature {
    const now = new Date().toISOString();

    // Create signature hash for integrity verification
    const signatureData = `${data.userId}|${data.entityType}|${data.entityId}|${data.action}|${data.meaning}|${data.recordVersion}|${now}`;
    const signatureHash = crypto.createHash('sha256').update(signatureData).digest('hex');

    const result = this.db.prepare(`
      INSERT INTO electronic_signatures (
        user_id, username, timestamp, entity_type, entity_id,
        action, meaning, record_version, signature_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.userId,
      data.username,
      now,
      data.entityType,
      data.entityId,
      data.action,
      data.meaning,
      data.recordVersion,
      signatureHash
    );

    // Also log the signature as an audit entry
    this.log({
      userId: data.userId,
      username: data.username,
      actionType: 'electronic_signature',
      entityType: data.entityType,
      entityId: data.entityId,
      details: {
        action: data.action,
        meaning: data.meaning,
        recordVersion: data.recordVersion,
        signatureId: result.lastInsertRowid
      }
    });

    return {
      id: result.lastInsertRowid as number,
      userId: data.userId,
      username: data.username,
      timestamp: now,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      meaning: data.meaning,
      recordVersion: data.recordVersion,
      signatureHash
    };
  }

  /**
   * Verify electronic signature integrity
   */
  verifySignature(signatureId: number): boolean {
    const row = this.db.prepare(
      'SELECT * FROM electronic_signatures WHERE id = ?'
    ).get(signatureId) as SignatureRow | undefined;

    if (!row) return false;

    // Recreate hash and compare
    const signatureData = `${row.user_id}|${row.entity_type}|${row.entity_id}|${row.action}|${row.meaning}|${row.record_version}|${row.timestamp}`;
    const expectedHash = crypto.createHash('sha256').update(signatureData).digest('hex');

    return row.signature_hash === expectedHash;
  }

  /**
   * Get signatures for an entity
   */
  getSignaturesForEntity(entityType: string, entityId: string): ElectronicSignature[] {
    const rows = this.db.prepare(`
      SELECT * FROM electronic_signatures
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY timestamp DESC
    `).all(entityType, entityId) as SignatureRow[];

    return rows.map(row => this.mapRowToSignature(row));
  }

  /**
   * Query audit log
   */
  query(filter?: AuditLogFilter): AuditLogResult {
    let whereClause = '1=1';
    const params: (string | number)[] = [];

    if (filter?.startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(filter.startDate);
    }
    if (filter?.endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(filter.endDate);
    }
    if (filter?.userId) {
      whereClause += ' AND user_id = ?';
      params.push(filter.userId);
    }
    if (filter?.actionType) {
      whereClause += ' AND action_type = ?';
      params.push(filter.actionType);
    }
    if (filter?.actionTypes && filter.actionTypes.length > 0) {
      const placeholders = filter.actionTypes.map(() => '?').join(', ');
      whereClause += ` AND action_type IN (${placeholders})`;
      params.push(...filter.actionTypes);
    }
    if (filter?.entityType) {
      whereClause += ' AND entity_type = ?';
      params.push(filter.entityType);
    }
    if (filter?.entityId) {
      whereClause += ' AND entity_id = ?';
      params.push(filter.entityId);
    }
    if (filter?.search) {
      whereClause += ' AND (username LIKE ? OR details LIKE ? OR old_value LIKE ? OR new_value LIKE ?)';
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countRow = this.db.prepare(
      `SELECT COUNT(*) as count FROM audit_log WHERE ${whereClause}`
    ).get(...params) as { count: number };
    const total = countRow.count;

    // Get paginated results
    let query = `SELECT * FROM audit_log WHERE ${whereClause} ORDER BY timestamp DESC`;
    const limit = filter?.limit || 100;
    const offset = filter?.offset || 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const rows = this.db.prepare(query).all(...params) as AuditLogRow[];
    const entries = rows.map(row => this.mapRowToEntry(row));

    return {
      entries,
      total,
      hasMore: offset + entries.length < total
    };
  }

  /**
   * Get audit trail for a specific case
   */
  getCaseAuditTrail(caseId: string): AuditLogEntry[] {
    const rows = this.db.prepare(`
      SELECT * FROM audit_log
      WHERE entity_type = 'case' AND entity_id = ?
      ORDER BY timestamp DESC
    `).all(caseId) as AuditLogRow[];

    return rows.map(row => this.mapRowToEntry(row));
  }

  /**
   * Get audit trail for a specific user
   */
  getUserAuditTrail(userId: string, limit?: number): AuditLogEntry[] {
    let query = `
      SELECT * FROM audit_log
      WHERE user_id = ?
      ORDER BY timestamp DESC
    `;
    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const rows = this.db.prepare(query).all(userId) as AuditLogRow[];
    return rows.map(row => this.mapRowToEntry(row));
  }

  /**
   * Export audit log to CSV format
   */
  exportToCsv(filter?: AuditLogFilter): string {
    const result = this.query({ ...filter, limit: 100000 }); // Get all matching

    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'Username',
      'Session ID',
      'Action Type',
      'Entity Type',
      'Entity ID',
      'Field Name',
      'Old Value',
      'New Value',
      'Details',
      'IP Address'
    ];

    const rows = result.entries.map(entry => [
      entry.id,
      entry.timestamp,
      entry.userId || '',
      entry.username || '',
      entry.sessionId || '',
      entry.actionType,
      entry.entityType,
      entry.entityId || '',
      entry.fieldName || '',
      this.escapeCsvValue(entry.oldValue || ''),
      this.escapeCsvValue(entry.newValue || ''),
      this.escapeCsvValue(entry.details || ''),
      entry.ipAddress || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Get audit statistics for a time period
   */
  getStatistics(startDate: string, endDate: string): {
    totalEntries: number;
    entriesByAction: Record<string, number>;
    entriesByUser: Record<string, number>;
    signatureCount: number;
  } {
    // Total entries
    const totalRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM audit_log
      WHERE timestamp >= ? AND timestamp <= ?
    `).get(startDate, endDate) as { count: number };

    // By action type
    const actionRows = this.db.prepare(`
      SELECT action_type, COUNT(*) as count FROM audit_log
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY action_type
    `).all(startDate, endDate) as Array<{ action_type: string; count: number }>;

    const entriesByAction: Record<string, number> = {};
    for (const row of actionRows) {
      entriesByAction[row.action_type] = row.count;
    }

    // By user
    const userRows = this.db.prepare(`
      SELECT username, COUNT(*) as count FROM audit_log
      WHERE timestamp >= ? AND timestamp <= ? AND username IS NOT NULL
      GROUP BY username
    `).all(startDate, endDate) as Array<{ username: string; count: number }>;

    const entriesByUser: Record<string, number> = {};
    for (const row of userRows) {
      entriesByUser[row.username] = row.count;
    }

    // Signature count
    const sigRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM electronic_signatures
      WHERE timestamp >= ? AND timestamp <= ?
    `).get(startDate, endDate) as { count: number };

    return {
      totalEntries: totalRow.count,
      entriesByAction,
      entriesByUser,
      signatureCount: sigRow.count
    };
  }

  /**
   * Map database row to AuditLogEntry
   */
  private mapRowToEntry(row: AuditLogRow): AuditLogEntry {
    return {
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id || undefined,
      username: row.username || undefined,
      sessionId: row.session_id || undefined,
      actionType: row.action_type as AuditActionType,
      entityType: row.entity_type as AuditEntityType,
      entityId: row.entity_id || undefined,
      fieldName: row.field_name || undefined,
      oldValue: row.old_value || undefined,
      newValue: row.new_value || undefined,
      details: row.details || undefined,
      ipAddress: row.ip_address || undefined
    };
  }

  /**
   * Map database row to ElectronicSignature
   */
  private mapRowToSignature(row: SignatureRow): ElectronicSignature {
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      timestamp: row.timestamp,
      entityType: row.entity_type as AuditEntityType,
      entityId: row.entity_id,
      action: row.action,
      meaning: row.meaning,
      recordVersion: row.record_version,
      signatureHash: row.signature_hash
    };
  }

  /**
   * Serialize value for storage
   */
  private serializeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Escape value for CSV
   */
  private escapeCsvValue(value: string): string {
    return value.replace(/[\n\r]/g, ' ').replace(/"/g, '""');
  }
}
