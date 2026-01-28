/**
 * Role Repository
 * Handles database operations for roles and permissions
 */

import type { Role, Permission } from '../../../shared/types/auth.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system: number;
  created_at: string;
  updated_at: string;
}

interface PermissionRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

export class RoleRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Find role by ID
   */
  findById(id: string): Role | null {
    const row = this.db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as RoleRow | undefined;
    if (!row) return null;
    return this.mapRowToRole(row, true);
  }

  /**
   * Find role by name
   */
  findByName(name: string): Role | null {
    const row = this.db.prepare(
      'SELECT * FROM roles WHERE name = ?'
    ).get(name) as RoleRow | undefined;
    if (!row) return null;
    return this.mapRowToRole(row, true);
  }

  /**
   * Get all roles
   */
  findAll(): Role[] {
    const rows = this.db.prepare(
      'SELECT * FROM roles ORDER BY name'
    ).all() as RoleRow[];
    return rows.map(row => this.mapRowToRole(row, true));
  }

  /**
   * Get permissions for a role
   */
  getRolePermissions(roleId: string): Permission[] {
    const rows = this.db.prepare(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.category, p.name
    `).all(roleId) as PermissionRow[];

    return rows.map(row => this.mapRowToPermission(row));
  }

  /**
   * Get all permissions
   */
  getAllPermissions(): Permission[] {
    const rows = this.db.prepare(
      'SELECT * FROM permissions ORDER BY category, name'
    ).all() as PermissionRow[];
    return rows.map(row => this.mapRowToPermission(row));
  }

  /**
   * Get permission by ID
   */
  getPermissionById(id: string): Permission | null {
    const row = this.db.prepare(
      'SELECT * FROM permissions WHERE id = ?'
    ).get(id) as PermissionRow | undefined;
    if (!row) return null;
    return this.mapRowToPermission(row);
  }

  /**
   * Get all permission IDs for a user (across all roles)
   */
  getUserPermissionIds(userId: string): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT p.id FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId) as Array<{ id: string }>;
    return rows.map(r => r.id);
  }

  /**
   * Get all permission names for a user (across all roles)
   */
  getUserPermissionNames(userId: string): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT p.name FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId) as Array<{ name: string }>;
    return rows.map(r => r.name);
  }

  /**
   * Check if user has a specific permission
   */
  userHasPermission(userId: string, permissionName: string): boolean {
    // Check if user has admin role (has all permissions)
    const hasAdmin = this.db.prepare(`
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? AND r.id = 'admin'
    `).get(userId);

    if (hasAdmin) return true;

    // Check specific permission
    const row = this.db.prepare(`
      SELECT 1 FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ? AND p.name = ?
    `).get(userId, permissionName);

    return !!row;
  }

  /**
   * Check if user has any of the specified permissions
   */
  userHasAnyPermission(userId: string, permissionNames: string[]): boolean {
    // Check if user has admin role
    const hasAdmin = this.db.prepare(`
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? AND r.id = 'admin'
    `).get(userId);

    if (hasAdmin) return true;

    // Check specific permissions
    const placeholders = permissionNames.map(() => '?').join(', ');
    const row = this.db.prepare(`
      SELECT 1 FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ? AND p.name IN (${placeholders})
    `).get(userId, ...permissionNames);

    return !!row;
  }

  /**
   * Check if user is admin
   */
  isUserAdmin(userId: string): boolean {
    const row = this.db.prepare(`
      SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = 'admin'
    `).get(userId);
    return !!row;
  }

  /**
   * Get users with a specific role
   */
  getUsersWithRole(roleId: string): string[] {
    const rows = this.db.prepare(`
      SELECT user_id FROM user_roles WHERE role_id = ?
    `).all(roleId) as Array<{ user_id: string }>;
    return rows.map(r => r.user_id);
  }

  /**
   * Map database row to Role object
   */
  private mapRowToRole(row: RoleRow, includePermissions: boolean = false): Role {
    const role: Role = {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      isSystem: row.is_system === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    if (includePermissions) {
      role.permissions = this.getRolePermissions(row.id);
    }

    return role;
  }

  /**
   * Map database row to Permission object
   */
  private mapRowToPermission(row: PermissionRow): Permission {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      category: row.category as Permission['category']
    };
  }
}
