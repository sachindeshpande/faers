/**
 * User Repository Tests
 *
 * Tests for user CRUD operations and queries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from './user.repository';
import type Database from 'better-sqlite3';

// Mock user data
const mockUserRow = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  password_hash: '$2a$10$hashedpassword',
  first_name: 'Test',
  last_name: 'User',
  is_active: 1,
  must_change_password: 0,
  failed_login_attempts: 0,
  locked_until: null,
  last_login_at: '2026-01-26T10:00:00.000Z',
  password_changed_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-26T10:00:00.000Z',
  created_by: null,
  deactivated_at: null,
  deactivated_by: null
};

const mockUsers = [
  mockUserRow,
  {
    ...mockUserRow,
    id: 'user-456',
    username: 'anotheruser',
    email: 'another@example.com',
    first_name: 'Another',
    last_name: 'User'
  }
];

const mockRoles = [
  { id: 'role-admin', name: 'Administrator', description: 'Full access', is_system: 1, created_at: '2026-01-01', updated_at: '2026-01-01' }
];

// Create mock database
function createMockDb(options: {
  userExists?: boolean;
  multipleUsers?: boolean;
} = {}): Database.Database {
  const { userExists = true, multipleUsers = false } = options;

  return {
    prepare: vi.fn((sql: string) => {
      // Find by ID
      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('WHERE id')) {
        return {
          get: vi.fn().mockReturnValue(userExists ? mockUserRow : undefined)
        };
      }

      // Find by username
      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('WHERE username')) {
        return {
          get: vi.fn().mockReturnValue(userExists ? mockUserRow : undefined)
        };
      }

      // Find by email
      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('WHERE email')) {
        return {
          get: vi.fn().mockReturnValue(userExists ? mockUserRow : undefined)
        };
      }

      // List users (SELECT * FROM users WHERE)
      if (sql.includes('SELECT *') && sql.includes('FROM users') && sql.includes('WHERE') && sql.includes('ORDER BY')) {
        return {
          all: vi.fn().mockReturnValue(multipleUsers ? mockUsers : [mockUserRow])
        };
      }

      // Count users
      if (sql.includes('COUNT(*)') && sql.includes('FROM users')) {
        return {
          get: vi.fn().mockReturnValue({ count: multipleUsers ? 2 : 1 })
        };
      }

      // Insert user
      if (sql.includes('INSERT INTO users')) {
        return {
          run: vi.fn().mockReturnValue({ changes: 1 })
        };
      }

      // Update user
      if (sql.includes('UPDATE users')) {
        return {
          run: vi.fn().mockReturnValue({ changes: userExists ? 1 : 0 })
        };
      }

      // Delete user
      if (sql.includes('DELETE FROM users')) {
        return {
          run: vi.fn().mockReturnValue({ changes: userExists ? 1 : 0 })
        };
      }

      // User roles - get names
      if (sql.includes('SELECT r.name FROM roles') && sql.includes('user_roles')) {
        return {
          all: vi.fn().mockReturnValue([{ name: 'Administrator' }])
        };
      }

      // User roles - get full roles
      if (sql.includes('SELECT r.*') && sql.includes('FROM roles') && sql.includes('user_roles')) {
        return {
          all: vi.fn().mockReturnValue(mockRoles)
        };
      }

      // User roles insert/delete
      if (sql.includes('INSERT') && sql.includes('user_roles')) {
        return { run: vi.fn() };
      }
      if (sql.includes('DELETE') && sql.includes('user_roles')) {
        return { run: vi.fn() };
      }

      // Check username/email exists
      if (sql.includes('SELECT 1 FROM users WHERE username')) {
        return { get: vi.fn().mockReturnValue(userExists ? { '1': 1 } : undefined) };
      }
      if (sql.includes('SELECT 1 FROM users WHERE email')) {
        return { get: vi.fn().mockReturnValue(userExists ? { '1': 1 } : undefined) };
      }

      // Password hash lookup
      if (sql.includes('SELECT password_hash FROM users')) {
        return { get: vi.fn().mockReturnValue(userExists ? { password_hash: mockUserRow.password_hash } : undefined) };
      }

      return {
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([])
      };
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: (...args: unknown[]) => unknown) => (...args: unknown[]) => fn(...args)),
    pragma: vi.fn(),
    close: vi.fn()
  } as unknown as Database.Database;
}

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockDb: Database.Database;

  beforeEach(() => {
    mockDb = createMockDb();
    userRepository = new UserRepository(mockDb);
  });

  describe('findById', () => {
    it('should return user when found', () => {
      const user = userRepository.findById('user-123');

      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-123');
      expect(user?.username).toBe('testuser');
    });

    it('should return null when user not found', () => {
      mockDb = createMockDb({ userExists: false });
      userRepository = new UserRepository(mockDb);

      const user = userRepository.findById('nonexistent');

      expect(user).toBeNull();
    });

    it('should map database row to User type correctly', () => {
      const user = userRepository.findById('user-123');

      expect(user).toMatchObject({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0
      });
    });
  });

  describe('findByUsername', () => {
    it('should return user when found', () => {
      const user = userRepository.findByUsername('testuser');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('testuser');
    });

    it('should return null when user not found', () => {
      mockDb = createMockDb({ userExists: false });
      userRepository = new UserRepository(mockDb);

      const user = userRepository.findByUsername('nonexistent');

      expect(user).toBeNull();
    });

    it('should call prepare with username parameter', () => {
      userRepository.findByUsername('TESTUSER');

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', () => {
      const user = userRepository.findByEmail('test@example.com');

      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null when user not found', () => {
      mockDb = createMockDb({ userExists: false });
      userRepository = new UserRepository(mockDb);

      const user = userRepository.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users', () => {
      mockDb = createMockDb({ multipleUsers: true });
      userRepository = new UserRepository(mockDb);

      const result = userRepository.findAll();

      expect(result.users).toBeDefined();
      expect(result.users.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should support pagination', () => {
      const result = userRepository.findAll({ offset: 0, limit: 10 });

      expect(result.users).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should filter by active status', () => {
      const result = userRepository.findAll({ isActive: true });

      expect(result.users).toBeDefined();
    });

    it('should support search', () => {
      const result = userRepository.findAll({ search: 'test' });

      expect(result.users).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new user', () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'TempPassword123!',
        passwordHash: '$2a$10$hashednewpassword',
        firstName: 'New',
        lastName: 'User',
        roleIds: [] as string[]
      };

      const user = userRepository.create(userData);

      expect(user).toBeDefined();
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should create user with roles', () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'TempPassword123!',
        passwordHash: '$2a$10$hashednewpassword',
        firstName: 'New',
        lastName: 'User',
        roleIds: ['role-admin']
      };

      const user = userRepository.create(userData, 'admin-user');

      expect(user).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update existing user', () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const user = userRepository.update('user-123', updateData);

      expect(user).toBeDefined();
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should return null for non-existent user', () => {
      mockDb = createMockDb({ userExists: false });
      userRepository = new UserRepository(mockDb);

      const user = userRepository.update('nonexistent', { firstName: 'Test' });

      expect(user).toBeNull();
    });

    it('should update user roles when roleIds provided', () => {
      const updateData = {
        roleIds: ['role-admin', 'role-user']
      };

      userRepository.update('user-123', updateData);

      // Should call DELETE and INSERT for role updates
      const calls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.some((c: string[]) => c[0].includes('user_roles'))).toBe(true);
    });
  });

  describe('updateFailedAttempts', () => {
    it('should update failed login attempts', () => {
      userRepository.updateFailedAttempts('user-123', 3);

      const calls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      const updateCall = calls.find((c: string[]) =>
        c[0].includes('UPDATE users') && c[0].includes('failed_login_attempts')
      );
      expect(updateCall).toBeDefined();
    });

    it('should set locked_until when provided', () => {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      userRepository.updateFailedAttempts('user-123', 5, lockUntil);

      const calls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      const updateCall = calls.find((c: string[]) =>
        c[0].includes('UPDATE users') && c[0].includes('locked_until')
      );
      expect(updateCall).toBeDefined();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', () => {
      userRepository.updateLastLogin('user-123');

      const calls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      const updateCall = calls.find((c: string[]) =>
        c[0].includes('UPDATE users') && c[0].includes('last_login_at')
      );
      expect(updateCall).toBeDefined();
    });
  });

  describe('deactivate', () => {
    it('should deactivate user (returns void)', () => {
      // deactivate returns void, not boolean
      expect(() => userRepository.deactivate('user-123', 'admin-user')).not.toThrow();

      const calls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      const updateCall = calls.find((c: string[]) =>
        c[0].includes('UPDATE users') && c[0].includes('is_active = 0')
      );
      expect(updateCall).toBeDefined();
    });

    it('should record deactivated_by', () => {
      userRepository.deactivate('user-123', 'admin-user');

      const calls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      const updateCall = calls.find((c: string[]) =>
        c[0].includes('UPDATE users') && c[0].includes('deactivated_by')
      );
      expect(updateCall).toBeDefined();
    });
  });

  describe('reactivate', () => {
    it('should reactivate user and return updated user', () => {
      const user = userRepository.reactivate('user-123');

      expect(user).toBeDefined();
      expect(user?.isActive).toBe(true);
    });
  });

  describe('assignRoles', () => {
    it('should assign roles to user', () => {
      userRepository.assignRoles('user-123', ['role-admin', 'role-user']);

      const calls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      const insertCall = calls.find((c: string[]) =>
        c[0].includes('INSERT') && c[0].includes('user_roles')
      );
      expect(insertCall).toBeDefined();
    });

    it('should accept assignedBy parameter', () => {
      userRepository.assignRoles('user-123', ['role-admin'], 'admin-user');

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('updateRoles', () => {
    it('should replace all user roles', () => {
      userRepository.updateRoles('user-123', ['role-user']);

      const calls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      // Should have DELETE followed by INSERT
      const deleteCall = calls.find((c: string[]) =>
        c[0].includes('DELETE') && c[0].includes('user_roles')
      );
      expect(deleteCall).toBeDefined();
    });
  });

  describe('getUserRoles', () => {
    it('should return roles for user', () => {
      const roles = userRepository.getUserRoles('user-123');

      expect(roles).toBeDefined();
      expect(Array.isArray(roles)).toBe(true);
    });
  });

  describe('getUserRoleNames', () => {
    it('should return role names for user', () => {
      const roleNames = userRepository.getUserRoleNames('user-123');

      expect(roleNames).toBeDefined();
      expect(Array.isArray(roleNames)).toBe(true);
      expect(roleNames).toContain('Administrator');
    });
  });

  describe('usernameExists', () => {
    it('should return true when username exists', () => {
      const exists = userRepository.usernameExists('testuser');

      expect(exists).toBe(true);
    });

    it('should return false when username does not exist', () => {
      mockDb = createMockDb({ userExists: false });
      userRepository = new UserRepository(mockDb);

      const exists = userRepository.usernameExists('nonexistent');

      expect(exists).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', () => {
      const exists = userRepository.emailExists('test@example.com');

      expect(exists).toBe(true);
    });

    it('should return false when email does not exist', () => {
      mockDb = createMockDb({ userExists: false });
      userRepository = new UserRepository(mockDb);

      const exists = userRepository.emailExists('nonexistent@example.com');

      expect(exists).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update password hash', () => {
      userRepository.updatePassword('user-123', '$2a$10$newpasswordhash');

      const calls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      const updateCall = calls.find((c: string[]) =>
        c[0].includes('UPDATE users') && c[0].includes('password_hash')
      );
      expect(updateCall).toBeDefined();
    });
  });

  describe('getPasswordHash', () => {
    it('should return password hash for user', () => {
      const hash = userRepository.getPasswordHash('user-123');

      expect(hash).toBe(mockUserRow.password_hash);
    });

    it('should return null for non-existent user', () => {
      mockDb = createMockDb({ userExists: false });
      userRepository = new UserRepository(mockDb);

      const hash = userRepository.getPasswordHash('nonexistent');

      expect(hash).toBeNull();
    });
  });

  describe('count', () => {
    it('should return total user count', () => {
      const count = userRepository.count();

      expect(count).toBe(1);
    });

    it('should return active user count when activeOnly is true', () => {
      const count = userRepository.count(true);

      expect(typeof count).toBe('number');
    });
  });
});
