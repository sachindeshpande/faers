/**
 * Session Repository
 * Handles database operations for user sessions
 */

import { v4 as uuidv4 } from 'uuid';
import type { Session } from '../../../shared/types/auth.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

interface SessionRow {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_activity_at: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: number;
}

export class SessionRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Create a new session
   */
  create(
    userId: string,
    expiresAt: string,
    ipAddress?: string,
    userAgent?: string
  ): Session {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO sessions (
        id, user_id, created_at, expires_at, last_activity_at,
        ip_address, user_agent, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, userId, now, expiresAt, now, ipAddress || null, userAgent || null);

    return this.findById(id)!;
  }

  /**
   * Find session by ID
   */
  findById(id: string): Session | null {
    const row = this.db.prepare(
      'SELECT * FROM sessions WHERE id = ?'
    ).get(id) as SessionRow | undefined;
    if (!row) return null;
    return this.mapRowToSession(row);
  }

  /**
   * Find active session for user
   */
  findActiveByUserId(userId: string): Session | null {
    const row = this.db.prepare(`
      SELECT * FROM sessions
      WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId) as SessionRow | undefined;
    if (!row) return null;
    return this.mapRowToSession(row);
  }

  /**
   * Get all active sessions for a user
   */
  findAllActiveByUserId(userId: string): Session[] {
    const rows = this.db.prepare(`
      SELECT * FROM sessions
      WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
      ORDER BY created_at DESC
    `).all(userId) as SessionRow[];
    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(id: string): void {
    this.db.prepare(`
      UPDATE sessions SET last_activity_at = ? WHERE id = ?
    `).run(new Date().toISOString(), id);
  }

  /**
   * Extend session expiration
   */
  extendSession(id: string, newExpiresAt: string): Session | null {
    this.db.prepare(`
      UPDATE sessions SET expires_at = ?, last_activity_at = ? WHERE id = ?
    `).run(newExpiresAt, new Date().toISOString(), id);
    return this.findById(id);
  }

  /**
   * Invalidate session (logout)
   */
  invalidate(id: string): void {
    this.db.prepare('UPDATE sessions SET is_active = 0 WHERE id = ?').run(id);
  }

  /**
   * Invalidate all sessions for a user
   */
  invalidateAllForUser(userId: string): void {
    this.db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ?').run(userId);
  }

  /**
   * Check if session is valid (active and not expired)
   */
  isValid(id: string): boolean {
    const row = this.db.prepare(`
      SELECT 1 FROM sessions
      WHERE id = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(id);
    return !!row;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpired(): number {
    const result = this.db.prepare(`
      DELETE FROM sessions WHERE expires_at < datetime('now')
    `).run();
    return result.changes;
  }

  /**
   * Get session count for user
   */
  countActiveForUser(userId: string): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) as count FROM sessions
      WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(userId) as { count: number };
    return row.count;
  }

  /**
   * Map database row to Session object
   */
  private mapRowToSession(row: SessionRow): Session {
    return {
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastActivityAt: row.last_activity_at,
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      isActive: row.is_active === 1
    };
  }
}
