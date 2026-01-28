/**
 * User Repository
 * Handles database operations for users and user-role assignments
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  UserListItem,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilter,
  Role
} from '../../../shared/types/auth.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  is_active: number;
  must_change_password: number;
  password_changed_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
}

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system: number;
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Create a new user
   */
  create(data: CreateUserDTO & { passwordHash: string }, createdBy?: string): User {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO users (
        id, username, email, password_hash, first_name, last_name,
        is_active, must_change_password, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.username.toLowerCase(),
      data.email.toLowerCase(),
      data.passwordHash,
      data.firstName,
      data.lastName,
      now,
      now,
      createdBy || null
    );

    // Assign roles
    if (data.roleIds && data.roleIds.length > 0) {
      this.assignRoles(id, data.roleIds, createdBy);
    }

    return this.findById(id)!;
  }

  /**
   * Find user by ID
   */
  findById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    if (!row) return null;
    return this.mapRowToUser(row, true);
  }

  /**
   * Find user by username
   */
  findByUsername(username: string): User | null {
    const row = this.db.prepare(
      'SELECT * FROM users WHERE username = ?'
    ).get(username.toLowerCase()) as UserRow | undefined;
    if (!row) return null;
    return this.mapRowToUser(row, true);
  }

  /**
   * Find user by email
   */
  findByEmail(email: string): User | null {
    const row = this.db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).get(email.toLowerCase()) as UserRow | undefined;
    if (!row) return null;
    return this.mapRowToUser(row, true);
  }

  /**
   * Get all users with optional filtering
   */
  findAll(filter?: UserFilter): { users: UserListItem[]; total: number } {
    let whereClause = '1=1';
    const params: (string | number)[] = [];

    if (filter?.isActive !== undefined) {
      whereClause += ' AND is_active = ?';
      params.push(filter.isActive ? 1 : 0);
    }

    if (filter?.search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countRow = this.db.prepare(
      `SELECT COUNT(*) as count FROM users WHERE ${whereClause}`
    ).get(...params) as { count: number };
    const total = countRow.count;

    // Get paginated results
    let query = `SELECT * FROM users WHERE ${whereClause} ORDER BY username`;
    if (filter?.limit) {
      query += ` LIMIT ${filter.limit}`;
      if (filter?.offset) {
        query += ` OFFSET ${filter.offset}`;
      }
    }

    const rows = this.db.prepare(query).all(...params) as UserRow[];

    const users: UserListItem[] = rows.map(row => {
      const roles = this.getUserRoleNames(row.id);
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        isActive: row.is_active === 1,
        lastLoginAt: row.last_login_at || undefined,
        createdAt: row.created_at,
        roles
      };
    });

    return { users, total };
  }

  /**
   * Update user
   */
  update(id: string, data: UpdateUserDTO): User | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email.toLowerCase());
    }
    if (data.firstName !== undefined) {
      updates.push('first_name = ?');
      params.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push('last_name = ?');
      params.push(data.lastName);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.mustChangePassword !== undefined) {
      updates.push('must_change_password = ?');
      params.push(data.mustChangePassword ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      this.db.prepare(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
      ).run(...params);
    }

    // Update roles if provided
    if (data.roleIds !== undefined) {
      this.updateRoles(id, data.roleIds);
    }

    return this.findById(id);
  }

  /**
   * Update password hash
   */
  updatePassword(id: string, passwordHash: string): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE users SET
        password_hash = ?,
        password_changed_at = ?,
        must_change_password = 0,
        updated_at = ?
      WHERE id = ?
    `).run(passwordHash, now, now, id);
  }

  /**
   * Set must change password flag
   */
  setMustChangePassword(id: string, mustChange: boolean): void {
    this.db.prepare(
      'UPDATE users SET must_change_password = ?, updated_at = ? WHERE id = ?'
    ).run(mustChange ? 1 : 0, new Date().toISOString(), id);
  }

  /**
   * Update failed login attempts
   */
  updateFailedAttempts(id: string, attempts: number, lockedUntil?: string): void {
    this.db.prepare(`
      UPDATE users SET
        failed_login_attempts = ?,
        locked_until = ?,
        updated_at = ?
      WHERE id = ?
    `).run(attempts, lockedUntil || null, new Date().toISOString(), id);
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin(id: string): void {
    const now = new Date().toISOString();
    this.db.prepare(
      'UPDATE users SET last_login_at = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?'
    ).run(now, now, id);
  }

  /**
   * Deactivate user
   */
  deactivate(id: string, deactivatedBy: string): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE users SET
        is_active = 0,
        deactivated_at = ?,
        deactivated_by = ?,
        updated_at = ?
      WHERE id = ?
    `).run(now, deactivatedBy, now, id);
  }

  /**
   * Reactivate user
   */
  reactivate(id: string): User | null {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE users SET
        is_active = 1,
        deactivated_at = NULL,
        deactivated_by = NULL,
        updated_at = ?
      WHERE id = ?
    `).run(now, id);
    return this.findById(id);
  }

  /**
   * Get user's password hash
   */
  getPasswordHash(id: string): string | null {
    const row = this.db.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).get(id) as { password_hash: string } | undefined;
    return row?.password_hash || null;
  }

  /**
   * Assign roles to user
   */
  assignRoles(userId: string, roleIds: string[], assignedBy?: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at, assigned_by)
      VALUES (?, ?, ?, ?)
    `);

    for (const roleId of roleIds) {
      stmt.run(userId, roleId, now, assignedBy || null);
    }
  }

  /**
   * Update user roles (replace all)
   */
  updateRoles(userId: string, roleIds: string[], assignedBy?: string): void {
    // Remove all existing roles
    this.db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId);

    // Assign new roles
    if (roleIds.length > 0) {
      this.assignRoles(userId, roleIds, assignedBy);
    }
  }

  /**
   * Get role names for user
   */
  getUserRoleNames(userId: string): string[] {
    const rows = this.db.prepare(`
      SELECT r.name FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
      ORDER BY r.name
    `).all(userId) as Array<{ name: string }>;
    return rows.map(r => r.name);
  }

  /**
   * Get roles for user
   */
  getUserRoles(userId: string): Role[] {
    const rows = this.db.prepare(`
      SELECT r.* FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
      ORDER BY r.name
    `).all(userId) as RoleRow[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      isSystem: row.is_system === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Check if username exists
   */
  usernameExists(username: string, excludeId?: string): boolean {
    const query = excludeId
      ? 'SELECT 1 FROM users WHERE username = ? AND id != ?'
      : 'SELECT 1 FROM users WHERE username = ?';
    const params = excludeId ? [username.toLowerCase(), excludeId] : [username.toLowerCase()];
    return !!this.db.prepare(query).get(...params);
  }

  /**
   * Check if email exists
   */
  emailExists(email: string, excludeId?: string): boolean {
    const query = excludeId
      ? 'SELECT 1 FROM users WHERE email = ? AND id != ?'
      : 'SELECT 1 FROM users WHERE email = ?';
    const params = excludeId ? [email.toLowerCase(), excludeId] : [email.toLowerCase()];
    return !!this.db.prepare(query).get(...params);
  }

  /**
   * Get user count
   */
  count(activeOnly?: boolean): number {
    const query = activeOnly
      ? 'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
      : 'SELECT COUNT(*) as count FROM users';
    const row = this.db.prepare(query).get() as { count: number };
    return row.count;
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: UserRow, includeRoles: boolean = false): User {
    const user: User = {
      id: row.id,
      username: row.username,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      isActive: row.is_active === 1,
      mustChangePassword: row.must_change_password === 1,
      passwordChangedAt: row.password_changed_at || undefined,
      failedLoginAttempts: row.failed_login_attempts,
      lockedUntil: row.locked_until || undefined,
      lastLoginAt: row.last_login_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by || undefined,
      deactivatedAt: row.deactivated_at || undefined,
      deactivatedBy: row.deactivated_by || undefined
    };

    if (includeRoles) {
      user.roles = this.getUserRoles(row.id);
    }

    return user;
  }
}
