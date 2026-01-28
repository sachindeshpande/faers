/**
 * Auth Service Tests
 *
 * Tests for authentication, session management, and password operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './authService';
import type Database from 'better-sqlite3';

// Mock data
const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  password_hash: '$2a$10$mockHashedPassword',
  first_name: 'Test',
  last_name: 'User',
  is_active: 1,
  must_change_password: 0,
  failed_login_attempts: 0,
  locked_until: null,
  last_login_at: null,
  password_changed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: null,
  deactivated_at: null,
  deactivated_by: null
};

const mockSession = {
  id: 'session-123',
  user_id: 'user-123',
  expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  last_activity_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  is_active: 1,
  ip_address: null,
  user_agent: null
};

const mockRole = {
  id: 'role-admin',
  name: 'Administrator',
  description: 'Full access',
  is_system: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Create mock database with realistic query handling
function createMockDb(options: {
  userExists?: boolean;
  userActive?: boolean;
  userLocked?: boolean;
  sessionValid?: boolean;
  failedAttempts?: number;
  mustChangePassword?: boolean;
} = {}): Database.Database {
  const {
    userExists = true,
    userActive = true,
    userLocked = false,
    sessionValid = true,
    failedAttempts = 0,
    mustChangePassword = false
  } = options;

  const user = userExists ? {
    ...mockUser,
    is_active: userActive ? 1 : 0,
    locked_until: userLocked ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null,
    failed_login_attempts: failedAttempts,
    must_change_password: mustChangePassword ? 1 : 0
  } : null;

  const session = sessionValid ? mockSession : null;

  return {
    prepare: vi.fn((sql: string) => {
      // User queries
      if (sql.includes('FROM users') && sql.includes('WHERE')) {
        if (sql.includes('password_hash')) {
          return { get: vi.fn().mockReturnValue(userExists ? { password_hash: mockUser.password_hash } : null) };
        }
        return { get: vi.fn().mockReturnValue(user) };
      }
      if (sql.includes('UPDATE users')) {
        return { run: vi.fn().mockReturnValue({ changes: 1 }) };
      }
      if (sql.includes('INSERT INTO users')) {
        return { run: vi.fn().mockReturnValue({ changes: 1 }) };
      }

      // Session queries
      if (sql.includes('FROM sessions') && sql.includes('WHERE id')) {
        return { get: vi.fn().mockReturnValue(session) };
      }
      if (sql.includes('FROM sessions') && sql.includes('WHERE user_id')) {
        return { all: vi.fn().mockReturnValue(session ? [session] : []) };
      }
      if (sql.includes('INSERT INTO sessions')) {
        return { run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }) };
      }
      if (sql.includes('UPDATE sessions')) {
        return { run: vi.fn().mockReturnValue({ changes: 1 }) };
      }
      if (sql.includes('DELETE FROM sessions')) {
        return { run: vi.fn().mockReturnValue({ changes: 1 }) };
      }

      // Role queries
      if (sql.includes('FROM roles') && sql.includes('WHERE name')) {
        return { get: vi.fn().mockReturnValue(mockRole) };
      }
      if (sql.includes('user_roles') && sql.includes('roles')) {
        return {
          get: vi.fn().mockReturnValue(mockRole),
          all: vi.fn().mockReturnValue([mockRole])
        };
      }

      // Permission queries
      if (sql.includes('permissions')) {
        return { all: vi.fn().mockReturnValue([{ name: '*' }]) };
      }

      // Audit queries
      if (sql.includes('INSERT INTO audit_log')) {
        return { run: vi.fn() };
      }

      // Password history
      if (sql.includes('password_history')) {
        return {
          all: vi.fn().mockReturnValue([]),
          run: vi.fn()
        };
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

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: Database.Database;

  beforeEach(() => {
    mockDb = createMockDb();
    authService = new AuthService(mockDb);
  });

  describe('login', () => {
    it('should throw error for non-existent user', async () => {
      mockDb = createMockDb({ userExists: false });
      authService = new AuthService(mockDb);

      await expect(authService.login('nonexistent', 'password'))
        .rejects.toThrow('Invalid username or password');
    });

    it('should throw error for inactive user', async () => {
      mockDb = createMockDb({ userActive: false });
      authService = new AuthService(mockDb);

      await expect(authService.login('testuser', 'password'))
        .rejects.toThrow('deactivated');
    });

    it('should throw error for locked user', async () => {
      mockDb = createMockDb({ userLocked: true });
      authService = new AuthService(mockDb);

      await expect(authService.login('testuser', 'password'))
        .rejects.toThrow('locked');
    });

    it('should throw error for wrong password', async () => {
      mockDb = createMockDb();
      authService = new AuthService(mockDb);

      // Wrong password will fail bcrypt comparison
      await expect(authService.login('testuser', 'wrongpassword'))
        .rejects.toThrow('Invalid username or password');
    });
  });

  describe('logout', () => {
    it('should not throw with valid session', () => {
      // logout returns void synchronously
      expect(() => authService.logout('session-123')).not.toThrow();
    });

    it('should not throw with invalid session', () => {
      mockDb = createMockDb({ sessionValid: false });
      authService = new AuthService(mockDb);

      expect(() => authService.logout('invalid-session')).not.toThrow();
    });
  });

  describe('validateSession', () => {
    it('should return valid: false for invalid session', () => {
      mockDb = createMockDb({ sessionValid: false });
      authService = new AuthService(mockDb);

      const result = authService.validateSession('invalid-session');

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should return valid: false for session without user', () => {
      mockDb = createMockDb({ userExists: false });
      authService = new AuthService(mockDb);

      const result = authService.validateSession('session-123');

      expect(result.valid).toBe(false);
    });

    it('should return valid: false for inactive user', () => {
      mockDb = createMockDb({ userActive: false });
      authService = new AuthService(mockDb);

      const result = authService.validateSession('session-123');

      expect(result.valid).toBe(false);
    });
  });

  describe('extendSession', () => {
    it('should return null for invalid session', () => {
      mockDb = createMockDb({ sessionValid: false });
      authService = new AuthService(mockDb);

      const result = authService.extendSession('invalid-session');

      expect(result).toBeNull();
    });

    it('should return null when user not found', () => {
      mockDb = createMockDb({ userExists: false });
      authService = new AuthService(mockDb);

      const result = authService.extendSession('session-123');

      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should throw when current password is wrong', async () => {
      // Wrong password will fail bcrypt comparison
      await expect(
        authService.changePassword(
          'user-123',
          'wrongpassword',
          'NewPassword123!@#',
          'session-123'
        )
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw for non-existent user', async () => {
      mockDb = createMockDb({ userExists: false });
      authService = new AuthService(mockDb);

      await expect(
        authService.changePassword(
          'nonexistent',
          'currentpassword',
          'NewPassword123!@#',
          'session-123'
        )
      ).rejects.toThrow('User not found');
    });
  });

  describe('getCurrentUser', () => {
    it('should return null for invalid session', () => {
      mockDb = createMockDb({ sessionValid: false });
      authService = new AuthService(mockDb);

      const user = authService.getCurrentUser('invalid-session');

      expect(user).toBeNull();
    });

    it('should return null when user not found', () => {
      mockDb = createMockDb({ userExists: false });
      authService = new AuthService(mockDb);

      const user = authService.getCurrentUser('session-123');

      expect(user).toBeNull();
    });
  });

  describe('getTimeoutConfig', () => {
    it('should return timeout configuration', () => {
      const config = authService.getTimeoutConfig();

      expect(config.timeoutMinutes).toBe(30);
      expect(config.warningMinutes).toBe(5);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should not throw', () => {
      expect(() => authService.cleanupExpiredSessions()).not.toThrow();
    });
  });
});
