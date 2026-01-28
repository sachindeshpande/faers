/**
 * Password Service Tests
 *
 * Tests for password hashing, validation, and policy enforcement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordService } from './passwordService';
import type Database from 'better-sqlite3';

// Create a mock database
function createMockDb(): Database.Database {
  const passwordHistory: Array<{ password_hash: string }> = [];

  return {
    prepare: vi.fn((sql: string) => {
      if (sql.includes('SELECT password_hash FROM password_history')) {
        return {
          all: vi.fn().mockReturnValue(passwordHistory)
        };
      }
      if (sql.includes('INSERT INTO password_history')) {
        return {
          run: vi.fn((_userId: string, hash: string) => {
            passwordHistory.push({ password_hash: hash });
            return { changes: 1 };
          })
        };
      }
      if (sql.includes('DELETE FROM password_history')) {
        return {
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

describe('PasswordService', () => {
  let passwordService: PasswordService;
  let mockDb: Database.Database;

  beforeEach(() => {
    mockDb = createMockDb();
    passwordService = new PasswordService(mockDb);
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt hash prefix
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await passwordService.hash(password);
      const hash2 = await passwordService.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify('WrongPassword123!', hash);

      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await passwordService.hash('TestPassword123!');
      const isValid = await passwordService.verify('', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('validatePolicy', () => {
    it('should accept valid password meeting all requirements', () => {
      const result = passwordService.validatePolicy('ValidPass123!@#');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 12 characters', () => {
      const result = passwordService.validatePolicy('Short1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = passwordService.validatePolicy('lowercase123!@#');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = passwordService.validatePolicy('UPPERCASE123!@#');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = passwordService.validatePolicy('NoNumbers!@#abc');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = passwordService.validatePolicy('NoSpecial12345');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject password containing username', () => {
      const result = passwordService.validatePolicy('johndoe123!@#A', 'johndoe');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password cannot contain your username');
    });

    it('should return multiple errors for multiple violations', () => {
      const result = passwordService.validatePolicy('short');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('checkHistory', () => {
    it('should allow new password not in history', async () => {
      const isReused = await passwordService.checkHistory('user-123', 'NewPassword123!@#');

      expect(isReused).toBe(false);
    });
  });

  describe('addToHistory', () => {
    it('should add password hash to history', async () => {
      const hash = await passwordService.hash('TestPassword123!');

      // addToHistory is synchronous, should not throw
      expect(() => passwordService.addToHistory('user-123', hash)).not.toThrow();
    });
  });

  describe('generateTemporaryPassword', () => {
    it('should generate a valid temporary password', () => {
      const tempPassword = passwordService.generateTemporaryPassword();

      expect(tempPassword).toBeDefined();
      expect(tempPassword.length).toBeGreaterThanOrEqual(16);

      // Should pass policy validation
      const result = passwordService.validatePolicy(tempPassword);
      expect(result.valid).toBe(true);
    });

    it('should generate different passwords each time', () => {
      const password1 = passwordService.generateTemporaryPassword();
      const password2 = passwordService.generateTemporaryPassword();

      expect(password1).not.toBe(password2);
    });
  });
});
