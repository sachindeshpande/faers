/**
 * Authentication IPC Handlers
 * Phase 3: Multi-User & Workflow Management
 */

import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { AuthService, ensureDefaultAdmin } from '../services/authService';
import { UserRepository } from '../database/repositories/user.repository';
import { RoleRepository } from '../database/repositories/role.repository';
import { PasswordService } from '../services/passwordService';
import { AuditService } from '../services/auditService';
import { IPC_CHANNELS, IPCResponse } from '../../shared/types/ipc.types';
import type {
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilter,
  User,
  UserListItem,
  Role,
  Permission,
  Session
} from '../../shared/types/auth.types';

// Store current session ID for context
let currentSessionId: string | null = null;

/**
 * Get current session ID
 */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

/**
 * Set current session ID
 */
export function setCurrentSessionId(sessionId: string | null): void {
  currentSessionId = sessionId;
}

/**
 * Register authentication IPC handlers
 */
export function registerAuthHandlers(): void {
  const db = getDatabase();
  const authService = new AuthService(db);
  const userRepo = new UserRepository(db);
  const roleRepo = new RoleRepository(db);
  const passwordService = new PasswordService(db);
  const auditService = new AuditService(db);

  // Ensure default admin exists - run synchronously to ensure admin is available
  ensureDefaultAdmin(db)
    .then(() => {
      console.log('Default admin check completed successfully');
    })
    .catch((error) => {
      console.error('Failed to ensure default admin:', error);
    });

  // ============================================================
  // Authentication Handlers
  // ============================================================

  /**
   * Login
   */
  ipcMain.handle(
    IPC_CHANNELS.AUTH_LOGIN,
    async (_, request: LoginRequest): Promise<IPCResponse<LoginResponse>> => {
      try {
        const result = await authService.login(
          request.username,
          request.password
        );

        // Store session ID
        setCurrentSessionId(result.session.id);

        return { success: true, data: result };
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Login failed'
        };
      }
    }
  );

  /**
   * Logout
   */
  ipcMain.handle(
    IPC_CHANNELS.AUTH_LOGOUT,
    async (): Promise<IPCResponse<void>> => {
      try {
        if (currentSessionId) {
          authService.logout(currentSessionId);
          setCurrentSessionId(null);
        }
        return { success: true };
      } catch (error) {
        console.error('Logout error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Logout failed'
        };
      }
    }
  );

  /**
   * Validate session
   */
  ipcMain.handle(
    IPC_CHANNELS.AUTH_VALIDATE_SESSION,
    async (): Promise<IPCResponse<{
      valid: boolean;
      session?: Session;
      user?: User;
      permissions?: string[];
    }>> => {
      try {
        if (!currentSessionId) {
          return { success: true, data: { valid: false } };
        }

        const result = authService.validateSession(currentSessionId);
        return { success: true, data: result };
      } catch (error) {
        console.error('Session validation error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Session validation failed'
        };
      }
    }
  );

  /**
   * Change password
   */
  ipcMain.handle(
    IPC_CHANNELS.AUTH_CHANGE_PASSWORD,
    async (_, request: ChangePasswordRequest): Promise<IPCResponse<void>> => {
      try {
        if (!currentSessionId) {
          return { success: false, error: 'Not authenticated' };
        }

        const validation = authService.validateSession(currentSessionId);
        if (!validation.valid || !validation.user) {
          return { success: false, error: 'Invalid session' };
        }

        await authService.changePassword(
          validation.user.id,
          request.currentPassword,
          request.newPassword,
          currentSessionId
        );

        return { success: true };
      } catch (error) {
        console.error('Change password error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Password change failed'
        };
      }
    }
  );

  /**
   * Get current user
   */
  ipcMain.handle(
    IPC_CHANNELS.AUTH_GET_CURRENT_USER,
    async (): Promise<IPCResponse<User | null>> => {
      try {
        if (!currentSessionId) {
          return { success: true, data: null };
        }

        const user = authService.getCurrentUser(currentSessionId);
        return { success: true, data: user };
      } catch (error) {
        console.error('Get current user error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get current user'
        };
      }
    }
  );

  /**
   * Extend session
   */
  ipcMain.handle(
    IPC_CHANNELS.AUTH_EXTEND_SESSION,
    async (): Promise<IPCResponse<Session>> => {
      try {
        if (!currentSessionId) {
          return { success: false, error: 'Not authenticated' };
        }

        const session = authService.extendSession(currentSessionId);
        if (!session) {
          return { success: false, error: 'Failed to extend session' };
        }

        return { success: true, data: session };
      } catch (error) {
        console.error('Extend session error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to extend session'
        };
      }
    }
  );

  /**
   * Get session timeout configuration
   */
  ipcMain.handle(
    IPC_CHANNELS.AUTH_GET_SESSION_CONFIG,
    async (): Promise<IPCResponse<{ timeoutMinutes: number; warningMinutes: number }>> => {
      try {
        const config = authService.getTimeoutConfig();
        return { success: true, data: config };
      } catch (error) {
        console.error('Get session config error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get session config'
        };
      }
    }
  );

  /**
   * Validate password against policy
   */
  ipcMain.handle(
    IPC_CHANNELS.AUTH_VALIDATE_PASSWORD_POLICY,
    async (_, { password, username }: { password: string; username?: string }): Promise<IPCResponse<{ valid: boolean; errors: string[] }>> => {
      try {
        const result = passwordService.validatePolicy(password, username);
        return { success: true, data: result };
      } catch (error) {
        console.error('Validate password error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to validate password'
        };
      }
    }
  );

  // ============================================================
  // User Management Handlers
  // ============================================================

  /**
   * Get users list
   */
  ipcMain.handle(
    IPC_CHANNELS.USER_LIST,
    async (_, filter?: UserFilter): Promise<IPCResponse<{ users: UserListItem[]; total: number }>> => {
      try {
        // Check permission
        if (!checkPermission('user.view')) {
          return { success: false, error: 'Permission denied' };
        }

        const result = userRepo.findAll(filter);
        return { success: true, data: result };
      } catch (error) {
        console.error('Get users error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get users'
        };
      }
    }
  );

  /**
   * Get user by ID
   */
  ipcMain.handle(
    IPC_CHANNELS.USER_GET,
    async (_, id: string): Promise<IPCResponse<User>> => {
      try {
        // Check permission (can view own profile or have user.view permission)
        const currentUser = getCurrentUser();
        if (!currentUser) {
          return { success: false, error: 'Not authenticated' };
        }

        if (currentUser.id !== id && !checkPermission('user.view')) {
          return { success: false, error: 'Permission denied' };
        }

        const user = userRepo.findById(id);
        if (!user) {
          return { success: false, error: 'User not found' };
        }

        return { success: true, data: user };
      } catch (error) {
        console.error('Get user error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get user'
        };
      }
    }
  );

  /**
   * Create user
   */
  ipcMain.handle(
    IPC_CHANNELS.USER_CREATE,
    async (_, data: CreateUserDTO): Promise<IPCResponse<User>> => {
      try {
        // Check permission
        if (!checkPermission('user.create')) {
          return { success: false, error: 'Permission denied' };
        }

        const currentUser = getCurrentUser();
        if (!currentUser) {
          return { success: false, error: 'Not authenticated' };
        }

        // Validate unique username
        if (userRepo.usernameExists(data.username)) {
          return { success: false, error: 'Username already exists' };
        }

        // Validate unique email
        if (userRepo.emailExists(data.email)) {
          return { success: false, error: 'Email already exists' };
        }

        // Validate password
        const passwordValidation = passwordService.validatePolicy(data.password, data.username);
        if (!passwordValidation.valid) {
          return { success: false, error: passwordValidation.errors.join('. ') };
        }

        // Hash password
        const passwordHash = await passwordService.hash(data.password);

        // Create user
        const user = userRepo.create(
          { ...data, passwordHash },
          currentUser.id
        );

        // Log audit
        auditService.log({
          userId: currentUser.id,
          username: currentUser.username,
          sessionId: currentSessionId || undefined,
          actionType: 'user_create',
          entityType: 'user',
          entityId: user.id,
          details: { username: user.username, email: user.email }
        });

        return { success: true, data: user };
      } catch (error) {
        console.error('Create user error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create user'
        };
      }
    }
  );

  /**
   * Update user
   */
  ipcMain.handle(
    IPC_CHANNELS.USER_UPDATE,
    async (_, { id, data }: { id: string; data: UpdateUserDTO }): Promise<IPCResponse<User>> => {
      try {
        // Check permission
        if (!checkPermission('user.edit')) {
          return { success: false, error: 'Permission denied' };
        }

        const currentUser = getCurrentUser();
        if (!currentUser) {
          return { success: false, error: 'Not authenticated' };
        }

        // Cannot edit own roles (prevent privilege escalation)
        if (currentUser.id === id && data.roleIds !== undefined) {
          return { success: false, error: 'Cannot modify your own roles' };
        }

        // Validate unique email if changing
        if (data.email && userRepo.emailExists(data.email, id)) {
          return { success: false, error: 'Email already exists' };
        }

        const user = userRepo.update(id, data);
        if (!user) {
          return { success: false, error: 'User not found' };
        }

        // Log audit
        auditService.log({
          userId: currentUser.id,
          username: currentUser.username,
          sessionId: currentSessionId || undefined,
          actionType: 'user_update',
          entityType: 'user',
          entityId: id,
          details: { changes: data }
        });

        return { success: true, data: user };
      } catch (error) {
        console.error('Update user error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update user'
        };
      }
    }
  );

  /**
   * Deactivate user
   */
  ipcMain.handle(
    IPC_CHANNELS.USER_DEACTIVATE,
    async (_, id: string): Promise<IPCResponse<void>> => {
      try {
        // Check permission
        if (!checkPermission('user.deactivate')) {
          return { success: false, error: 'Permission denied' };
        }

        const currentUser = getCurrentUser();
        if (!currentUser) {
          return { success: false, error: 'Not authenticated' };
        }

        // Cannot deactivate self
        if (currentUser.id === id) {
          return { success: false, error: 'Cannot deactivate your own account' };
        }

        const user = userRepo.findById(id);
        if (!user) {
          return { success: false, error: 'User not found' };
        }

        userRepo.deactivate(id, currentUser.id);

        // Log audit
        auditService.log({
          userId: currentUser.id,
          username: currentUser.username,
          sessionId: currentSessionId || undefined,
          actionType: 'user_deactivate',
          entityType: 'user',
          entityId: id,
          details: { username: user.username }
        });

        return { success: true };
      } catch (error) {
        console.error('Deactivate user error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to deactivate user'
        };
      }
    }
  );

  /**
   * Reactivate user
   */
  ipcMain.handle(
    IPC_CHANNELS.USER_REACTIVATE,
    async (_, id: string): Promise<IPCResponse<User>> => {
      try {
        // Check permission
        if (!checkPermission('user.edit')) {
          return { success: false, error: 'Permission denied' };
        }

        const currentUser = getCurrentUser();
        if (!currentUser) {
          return { success: false, error: 'Not authenticated' };
        }

        const user = userRepo.reactivate(id);
        if (!user) {
          return { success: false, error: 'User not found' };
        }

        // Log audit
        auditService.log({
          userId: currentUser.id,
          username: currentUser.username,
          sessionId: currentSessionId || undefined,
          actionType: 'user_reactivate',
          entityType: 'user',
          entityId: id,
          details: { username: user.username }
        });

        return { success: true, data: user };
      } catch (error) {
        console.error('Reactivate user error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to reactivate user'
        };
      }
    }
  );

  /**
   * Reset user password (admin)
   */
  ipcMain.handle(
    IPC_CHANNELS.USER_RESET_PASSWORD,
    async (_, id: string): Promise<IPCResponse<{ temporaryPassword: string }>> => {
      try {
        // Check permission
        if (!checkPermission('user.edit')) {
          return { success: false, error: 'Permission denied' };
        }

        const currentUser = getCurrentUser();
        if (!currentUser) {
          return { success: false, error: 'Not authenticated' };
        }

        const temporaryPassword = await authService.resetPassword(
          id,
          currentUser.id,
          currentSessionId || undefined
        );

        return { success: true, data: { temporaryPassword } };
      } catch (error) {
        console.error('Reset password error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to reset password'
        };
      }
    }
  );

  /**
   * Get user profile (current user)
   */
  ipcMain.handle(
    IPC_CHANNELS.USER_GET_PROFILE,
    async (): Promise<IPCResponse<User>> => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          return { success: false, error: 'Not authenticated' };
        }

        return { success: true, data: currentUser };
      } catch (error) {
        console.error('Get profile error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get profile'
        };
      }
    }
  );

  /**
   * Update user profile (current user)
   */
  ipcMain.handle(
    IPC_CHANNELS.USER_UPDATE_PROFILE,
    async (_, data: Partial<UpdateUserDTO>): Promise<IPCResponse<User>> => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          return { success: false, error: 'Not authenticated' };
        }

        // Cannot change roles via profile update
        const { roleIds, isActive, ...allowedUpdates } = data;

        // Validate unique email if changing
        if (allowedUpdates.email && userRepo.emailExists(allowedUpdates.email, currentUser.id)) {
          return { success: false, error: 'Email already exists' };
        }

        const user = userRepo.update(currentUser.id, allowedUpdates);
        if (!user) {
          return { success: false, error: 'Failed to update profile' };
        }

        // Log audit
        auditService.log({
          userId: currentUser.id,
          username: currentUser.username,
          sessionId: currentSessionId || undefined,
          actionType: 'user_update',
          entityType: 'user',
          entityId: currentUser.id,
          details: { changes: allowedUpdates, selfUpdate: true }
        });

        return { success: true, data: user };
      } catch (error) {
        console.error('Update profile error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update profile'
        };
      }
    }
  );

  // ============================================================
  // Role Management Handlers
  // ============================================================

  /**
   * Get all roles
   */
  ipcMain.handle(
    IPC_CHANNELS.ROLE_LIST,
    async (): Promise<IPCResponse<Role[]>> => {
      try {
        const roles = roleRepo.findAll();
        return { success: true, data: roles };
      } catch (error) {
        console.error('Get roles error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get roles'
        };
      }
    }
  );

  /**
   * Get role by ID
   */
  ipcMain.handle(
    IPC_CHANNELS.ROLE_GET,
    async (_, id: string): Promise<IPCResponse<Role>> => {
      try {
        const role = roleRepo.findById(id);
        if (!role) {
          return { success: false, error: 'Role not found' };
        }
        return { success: true, data: role };
      } catch (error) {
        console.error('Get role error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get role'
        };
      }
    }
  );

  /**
   * Get all permissions
   */
  ipcMain.handle(
    IPC_CHANNELS.PERMISSION_LIST,
    async (): Promise<IPCResponse<Permission[]>> => {
      try {
        const permissions = roleRepo.getAllPermissions();
        return { success: true, data: permissions };
      } catch (error) {
        console.error('Get permissions error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get permissions'
        };
      }
    }
  );

  // ============================================================
  // Helper Functions
  // ============================================================

  /**
   * Get current user from session
   */
  function getCurrentUser(): User | null {
    if (!currentSessionId) return null;
    return authService.getCurrentUser(currentSessionId);
  }

  /**
   * Check if current user has permission
   */
  function checkPermission(permission: string): boolean {
    if (!currentSessionId) return false;
    const validation = authService.validateSession(currentSessionId);
    if (!validation.valid || !validation.permissions) return false;

    // Admin has all permissions
    if (validation.permissions.includes('*')) return true;

    return validation.permissions.includes(permission);
  }
}
