/**
 * Authentication Service
 * Handles user authentication, session management, and password operations
 */

import type {
  User,
  Session,
  LoginResponse,
  SecurityConfig
} from '../../shared/types/auth.types';
import { UserRepository } from '../database/repositories/user.repository';
import { SessionRepository } from '../database/repositories/session.repository';
import { RoleRepository } from '../database/repositories/role.repository';
import { PasswordService } from './passwordService';
import { AuditService } from './auditService';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

// Default security configuration
const defaultSecurityConfig: SecurityConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  sessionTimeoutMinutes: 30,
  sessionWarningMinutes: 5,
  enforcePasswordPolicy: true,
  singleSessionPerUser: true
};

// In-memory session store (for quick validation without DB hit)
const activeSessions = new Map<string, { userId: string; expiresAt: Date }>();

export class AuthService {
  private userRepo: UserRepository;
  private sessionRepo: SessionRepository;
  private roleRepo: RoleRepository;
  private passwordService: PasswordService;
  private auditService: AuditService;
  private config: SecurityConfig;

  constructor(db: DatabaseInstance, config?: SecurityConfig) {
    this.userRepo = new UserRepository(db);
    this.sessionRepo = new SessionRepository(db);
    this.roleRepo = new RoleRepository(db);
    this.passwordService = new PasswordService(db);
    this.auditService = new AuditService(db);
    this.config = config || defaultSecurityConfig;
  }

  /**
   * Authenticate user and create session
   */
  async login(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    // Find user by username
    const user = this.userRepo.findByUsername(username);

    if (!user) {
      // Log failed attempt with unknown user
      this.auditService.log({
        actionType: 'login_failed',
        entityType: 'session',
        details: { username, reason: 'User not found' },
        ipAddress
      });
      throw new Error('Invalid username or password');
    }

    // Check if account is active
    if (!user.isActive) {
      this.auditService.log({
        userId: user.id,
        username: user.username,
        actionType: 'login_failed',
        entityType: 'session',
        details: { reason: 'Account deactivated' },
        ipAddress
      });
      throw new Error('Account is deactivated. Please contact your administrator.');
    }

    // Check if account is locked
    if (user.lockedUntil) {
      const lockExpires = new Date(user.lockedUntil);
      if (lockExpires > new Date()) {
        const minutesRemaining = Math.ceil((lockExpires.getTime() - Date.now()) / 60000);
        this.auditService.log({
          userId: user.id,
          username: user.username,
          actionType: 'login_failed',
          entityType: 'session',
          details: { reason: 'Account locked', lockExpiresAt: user.lockedUntil },
          ipAddress
        });
        throw new Error(`Account is locked. Please try again in ${minutesRemaining} minutes.`);
      }
    }

    // Verify password
    const passwordHash = this.userRepo.getPasswordHash(user.id);
    if (!passwordHash) {
      throw new Error('Invalid username or password');
    }

    const isValidPassword = await this.passwordService.verify(password, passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1;
      let lockedUntil: string | undefined;

      if (newAttempts >= this.config.maxFailedAttempts) {
        // Lock account
        const lockTime = new Date();
        lockTime.setMinutes(lockTime.getMinutes() + this.config.lockoutDurationMinutes);
        lockedUntil = lockTime.toISOString();
      }

      this.userRepo.updateFailedAttempts(user.id, newAttempts, lockedUntil);

      this.auditService.log({
        userId: user.id,
        username: user.username,
        actionType: 'login_failed',
        entityType: 'session',
        details: {
          reason: 'Invalid password',
          failedAttempts: newAttempts,
          locked: !!lockedUntil
        },
        ipAddress
      });

      if (lockedUntil) {
        throw new Error(`Account locked due to too many failed attempts. Try again in ${this.config.lockoutDurationMinutes} minutes.`);
      }

      const remaining = this.config.maxFailedAttempts - newAttempts;
      throw new Error(`Invalid username or password. ${remaining} attempts remaining.`);
    }

    // Invalidate existing sessions if single session mode
    if (this.config.singleSessionPerUser) {
      this.sessionRepo.invalidateAllForUser(user.id);
      // Clear from in-memory cache
      for (const [sessionId, data] of activeSessions.entries()) {
        if (data.userId === user.id) {
          activeSessions.delete(sessionId);
        }
      }
    }

    // Create new session
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.config.sessionTimeoutMinutes);

    const session = this.sessionRepo.create(
      user.id,
      expiresAt.toISOString(),
      ipAddress,
      userAgent
    );

    // Update in-memory cache
    activeSessions.set(session.id, {
      userId: user.id,
      expiresAt: new Date(session.expiresAt)
    });

    // Update last login
    this.userRepo.updateLastLogin(user.id);

    // Get user permissions
    const permissions = this.roleRepo.getUserPermissionNames(user.id);

    // Check if user is admin (has all permissions)
    if (this.roleRepo.isUserAdmin(user.id)) {
      // Add wildcard to indicate admin
      if (!permissions.includes('*')) {
        permissions.push('*');
      }
    }

    // Log successful login
    this.auditService.log({
      userId: user.id,
      username: user.username,
      sessionId: session.id,
      actionType: 'login',
      entityType: 'session',
      entityId: session.id,
      ipAddress
    });

    // Get fresh user data
    const freshUser = this.userRepo.findById(user.id)!;

    return {
      user: freshUser,
      session,
      permissions
    };
  }

  /**
   * Logout and invalidate session
   */
  logout(sessionId: string): void {
    const session = this.sessionRepo.findById(sessionId);
    if (session) {
      this.sessionRepo.invalidate(sessionId);
      activeSessions.delete(sessionId);

      this.auditService.log({
        userId: session.userId,
        sessionId,
        actionType: 'logout',
        entityType: 'session',
        entityId: sessionId
      });
    }
  }

  /**
   * Validate session and return user if valid
   */
  validateSession(sessionId: string): {
    valid: boolean;
    session?: Session;
    user?: User;
    permissions?: string[];
  } {
    // Quick check in memory
    const cached = activeSessions.get(sessionId);
    if (cached && cached.expiresAt < new Date()) {
      activeSessions.delete(sessionId);
      return { valid: false };
    }

    // Check database
    const session = this.sessionRepo.findById(sessionId);
    if (!session || !session.isActive) {
      activeSessions.delete(sessionId);
      return { valid: false };
    }

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      this.sessionRepo.invalidate(sessionId);
      activeSessions.delete(sessionId);
      return { valid: false };
    }

    // Get user
    const user = this.userRepo.findById(session.userId);
    if (!user || !user.isActive) {
      this.sessionRepo.invalidate(sessionId);
      activeSessions.delete(sessionId);
      return { valid: false };
    }

    // Update activity timestamp
    this.sessionRepo.updateActivity(sessionId);

    // Update in-memory cache
    activeSessions.set(sessionId, {
      userId: user.id,
      expiresAt: new Date(session.expiresAt)
    });

    // Get permissions
    const permissions = this.roleRepo.getUserPermissionNames(user.id);
    if (this.roleRepo.isUserAdmin(user.id) && !permissions.includes('*')) {
      permissions.push('*');
    }

    return {
      valid: true,
      session,
      user,
      permissions
    };
  }

  /**
   * Extend session expiration
   */
  extendSession(sessionId: string): Session | null {
    const validation = this.validateSession(sessionId);
    if (!validation.valid || !validation.session) {
      return null;
    }

    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + this.config.sessionTimeoutMinutes);

    const session = this.sessionRepo.extendSession(sessionId, newExpiresAt.toISOString());

    if (session) {
      // Update in-memory cache
      activeSessions.set(sessionId, {
        userId: session.userId,
        expiresAt: new Date(session.expiresAt)
      });

      this.auditService.log({
        userId: session.userId,
        sessionId,
        actionType: 'session_extended',
        entityType: 'session',
        entityId: sessionId
      });
    }

    return session;
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    sessionId?: string
  ): Promise<void> {
    const user = this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const currentHash = this.userRepo.getPasswordHash(userId);
    if (!currentHash) {
      throw new Error('User not found');
    }

    const isValid = await this.passwordService.verify(currentPassword, currentHash);
    if (!isValid) {
      this.auditService.log({
        userId,
        username: user.username,
        sessionId,
        actionType: 'password_change',
        entityType: 'user',
        entityId: userId,
        details: { success: false, reason: 'Invalid current password' }
      });
      throw new Error('Current password is incorrect');
    }

    // Validate new password against policy
    const validation = this.passwordService.validatePolicy(newPassword, user.username);
    if (!validation.valid) {
      throw new Error(validation.errors.join('. '));
    }

    // Check password history
    const wasUsed = await this.passwordService.checkHistory(userId, newPassword);
    if (wasUsed) {
      throw new Error('Cannot reuse a recent password. Please choose a different password.');
    }

    // Hash and save new password
    const newHash = await this.passwordService.hash(newPassword);

    // Add current password to history before updating
    this.passwordService.addToHistory(userId, currentHash);

    // Update password
    this.userRepo.updatePassword(userId, newHash);

    // Log password change
    this.auditService.log({
      userId,
      username: user.username,
      sessionId,
      actionType: 'password_change',
      entityType: 'user',
      entityId: userId,
      details: { success: true }
    });
  }

  /**
   * Admin reset password for user
   */
  async resetPassword(
    userId: string,
    adminUserId: string,
    sessionId?: string
  ): Promise<string> {
    const user = this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const adminUser = this.userRepo.findById(adminUserId);
    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    // Generate temporary password
    const tempPassword = this.passwordService.generateTemporaryPassword();
    const hash = await this.passwordService.hash(tempPassword);

    // Get current hash for history
    const currentHash = this.userRepo.getPasswordHash(userId);
    if (currentHash) {
      this.passwordService.addToHistory(userId, currentHash);
    }

    // Update password and require change
    this.userRepo.updatePassword(userId, hash);
    this.userRepo.setMustChangePassword(userId, true);

    // Log password reset
    this.auditService.log({
      userId: adminUserId,
      username: adminUser.username,
      sessionId,
      actionType: 'password_reset_admin',
      entityType: 'user',
      entityId: userId,
      details: { targetUser: user.username }
    });

    return tempPassword;
  }

  /**
   * Get current user from session
   */
  getCurrentUser(sessionId: string): User | null {
    const validation = this.validateSession(sessionId);
    if (!validation.valid || !validation.user) {
      return null;
    }
    return validation.user;
  }

  /**
   * Get session timeout configuration
   */
  getTimeoutConfig(): { timeoutMinutes: number; warningMinutes: number } {
    return {
      timeoutMinutes: this.config.sessionTimeoutMinutes,
      warningMinutes: this.config.sessionWarningMinutes
    };
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    // Clear from in-memory cache
    const now = new Date();
    for (const [sessionId, data] of activeSessions.entries()) {
      if (data.expiresAt < now) {
        activeSessions.delete(sessionId);
      }
    }

    // Clean up database
    return this.sessionRepo.cleanupExpired();
  }
}

// Export a function to create a default admin user if none exists
export async function ensureDefaultAdmin(db: DatabaseInstance): Promise<void> {
  const userRepo = new UserRepository(db);
  const passwordService = new PasswordService(db);
  const roleRepo = new RoleRepository(db);

  const defaultUsername = 'admin';
  const defaultPassword = 'Admin@123456';

  // First, check if user with username 'admin' exists
  const existingAdmin = userRepo.findByUsername(defaultUsername);

  if (existingAdmin) {
    console.log('Admin user already exists, verifying role assignment...');

    // Ensure admin has the admin role
    const hasAdminRole = roleRepo.isUserAdmin(existingAdmin.id);
    if (!hasAdminRole) {
      console.log('Admin user missing admin role, assigning...');
      userRepo.assignRoles(existingAdmin.id, ['admin']);
      console.log('Admin role assigned successfully');
    }

    return;
  }

  // Check if any admin user exists (by role)
  const adminUsers = roleRepo.getUsersWithRole('admin');

  if (adminUsers.length === 0) {
    console.log('No admin user found. Creating default admin user...');

    try {
      // Create default admin
      const passwordHash = await passwordService.hash(defaultPassword);

      const admin = userRepo.create({
        username: defaultUsername,
        email: 'admin@localhost',
        firstName: 'System',
        lastName: 'Administrator',
        password: defaultPassword,
        passwordHash,
        roleIds: ['admin']
      });

      // In test mode, don't require password change to simplify E2E tests
      const isTestMode = process.env.NODE_ENV === 'test';
      if (isTestMode) {
        userRepo.update(admin.id, { mustChangePassword: false });
      }

      console.log(`Default admin user created: username="${admin.username}"`);
      if (!isTestMode) {
        console.log('IMPORTANT: Change the default password after first login!');
      }

      // Verify the admin was created correctly
      const verifyAdmin = userRepo.findByUsername(defaultUsername);
      if (!verifyAdmin) {
        throw new Error('Failed to verify admin user creation');
      }

      const verifyRole = roleRepo.isUserAdmin(verifyAdmin.id);
      if (!verifyRole) {
        throw new Error('Failed to verify admin role assignment');
      }

      console.log('Default admin user verified successfully');
    } catch (error) {
      console.error('Error creating default admin:', error);
      throw error;
    }
  } else {
    console.log(`Found ${adminUsers.length} user(s) with admin role`);
  }
}
