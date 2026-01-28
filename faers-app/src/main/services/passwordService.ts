/**
 * Password Service
 * Handles password hashing, validation, and policy enforcement
 */

import bcrypt from 'bcryptjs';
import type {
  PasswordPolicy,
  PasswordValidationResult
} from '../../shared/types/auth.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

const SALT_ROUNDS = 12;

// Default password policy
const defaultPolicy: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  preventReuseCount: 5,
  maxAgeDays: 90
};

export class PasswordService {
  private db: DatabaseInstance;
  private policy: PasswordPolicy;

  constructor(db: DatabaseInstance, policy?: PasswordPolicy) {
    this.db = db;
    this.policy = policy || defaultPolicy;
  }

  /**
   * Hash a password using bcrypt
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password against policy
   */
  validatePolicy(password: string, username?: string): PasswordValidationResult {
    const errors: string[] = [];

    // Length check
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    }

    // Uppercase check
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Lowercase check
    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Number check
    if (this.policy.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Special character check
    if (this.policy.requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Cannot contain username
    if (username && password.toLowerCase().includes(username.toLowerCase())) {
      errors.push('Password cannot contain your username');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if password was previously used
   */
  async checkHistory(userId: string, newPassword: string): Promise<boolean> {
    // Get recent password hashes
    const rows = this.db.prepare(`
      SELECT password_hash FROM password_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, this.policy.preventReuseCount) as Array<{ password_hash: string }>;

    // Also get current password
    const current = this.db.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).get(userId) as { password_hash: string } | undefined;

    if (current) {
      rows.unshift({ password_hash: current.password_hash });
    }

    // Check against each historical hash
    for (const row of rows) {
      if (await bcrypt.compare(newPassword, row.password_hash)) {
        return true; // Password was used before
      }
    }

    return false;
  }

  /**
   * Add password to history
   */
  addToHistory(userId: string, passwordHash: string): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO password_history (user_id, password_hash, created_at)
      VALUES (?, ?, ?)
    `).run(userId, passwordHash, now);

    // Cleanup old history (keep only preventReuseCount + 1 entries)
    this.db.prepare(`
      DELETE FROM password_history
      WHERE user_id = ? AND id NOT IN (
        SELECT id FROM password_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
    `).run(userId, userId, this.policy.preventReuseCount + 1);
  }

  /**
   * Check if password is expired
   */
  isExpired(passwordChangedAt: string | null): boolean {
    if (!passwordChangedAt) return true;

    const changedDate = new Date(passwordChangedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - changedDate.getTime()) / (1000 * 60 * 60 * 24));

    return diffDays >= this.policy.maxAgeDays;
  }

  /**
   * Get days until password expires
   */
  getDaysUntilExpiration(passwordChangedAt: string | null): number {
    if (!passwordChangedAt) return 0;

    const changedDate = new Date(passwordChangedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - changedDate.getTime()) / (1000 * 60 * 60 * 24));

    return Math.max(0, this.policy.maxAgeDays - diffDays);
  }

  /**
   * Generate a random temporary password
   */
  generateTemporaryPassword(): string {
    const length = Math.max(16, this.policy.minLength);
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const all = uppercase + lowercase + numbers + special;

    let password = '';

    // Ensure at least one of each required type
    if (this.policy.requireUppercase) {
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    if (this.policy.requireLowercase) {
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    if (this.policy.requireNumber) {
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }
    if (this.policy.requireSpecial) {
      password += special[Math.floor(Math.random() * special.length)];
    }

    // Fill remaining length with random characters
    while (password.length < length) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Get the current password policy
   */
  getPolicy(): PasswordPolicy {
    return { ...this.policy };
  }

  /**
   * Get password requirements as human-readable strings
   */
  getRequirements(): string[] {
    const requirements: string[] = [];

    requirements.push(`At least ${this.policy.minLength} characters`);

    if (this.policy.requireUppercase) {
      requirements.push('At least one uppercase letter (A-Z)');
    }
    if (this.policy.requireLowercase) {
      requirements.push('At least one lowercase letter (a-z)');
    }
    if (this.policy.requireNumber) {
      requirements.push('At least one number (0-9)');
    }
    if (this.policy.requireSpecial) {
      requirements.push('At least one special character (!@#$%^&*...)');
    }
    if (this.policy.preventReuseCount > 0) {
      requirements.push(`Cannot reuse last ${this.policy.preventReuseCount} passwords`);
    }

    return requirements;
  }
}
