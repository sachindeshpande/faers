/**
 * Auth Store Tests
 *
 * Tests for authentication state management with Zustand.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './authStore';
import type { User, Session } from '../../shared/types/auth.types';

// Mock electronAPI
const mockElectronAPI = {
  login: vi.fn(),
  logout: vi.fn(),
  validateSession: vi.fn(),
  changePassword: vi.fn(),
  extendSession: vi.fn(),
  getSessionTimeoutConfig: vi.fn(),
  validatePasswordPolicy: vi.fn()
};

// Setup window.electronAPI mock
beforeEach(() => {
  (global as unknown as { window: { electronAPI: typeof mockElectronAPI } }).window = {
    electronAPI: mockElectronAPI
  };

  // Mock getSessionTimeoutConfig to return default values
  mockElectronAPI.getSessionTimeoutConfig.mockResolvedValue({
    success: true,
    data: { timeoutMinutes: 30, warningMinutes: 5 }
  });

  // Reset store state before each test
  useAuthStore.setState({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    permissions: [],
    error: null,
    mustChangePassword: false,
    isChangingPassword: false,
    passwordChangeError: null,
    sessionTimeoutMinutes: 30,
    sessionWarningMinutes: 5,
    showSessionWarning: false,
    lastActivityTime: Date.now(),
    rememberedUsername: null
  });

  // Reset all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

const mockUser: User = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  mustChangePassword: false,
  failedLoginAttempts: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockSession: Session = {
  id: 'session-123',
  userId: 'user-123',
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  lastActivityAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  isActive: true
};

describe('authStore', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.permissions).toEqual([]);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockElectronAPI.login.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          session: mockSession,
          permissions: ['case.create', 'case.view.own']
        }
      });

      const { login } = useAuthStore.getState();
      // login takes a LoginRequest object
      const result = await login({ username: 'testuser', password: 'password123' });

      expect(result).toBe(true);
      expect(mockElectronAPI.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123'
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.permissions).toContain('case.create');
    });

    it('should handle login failure', async () => {
      mockElectronAPI.login.mockResolvedValue({
        success: false,
        error: 'Invalid username or password'
      });

      const { login } = useAuthStore.getState();
      const result = await login({ username: 'testuser', password: 'wrongpassword' });

      expect(result).toBe(false);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.error).toBe('Invalid username or password');
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockElectronAPI.login.mockReturnValue(loginPromise);

      const { login } = useAuthStore.getState();
      const loginTask = login({ username: 'testuser', password: 'password123' });

      // Check loading state is true during login
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveLogin!({
        success: true,
        data: { user: mockUser, session: mockSession, permissions: [] }
      });
      await loginTask;

      // Check loading state is false after login
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle account lockout', async () => {
      mockElectronAPI.login.mockResolvedValue({
        success: false,
        error: 'Account is locked. Try again in 25 minutes.'
      });

      const { login } = useAuthStore.getState();
      const result = await login({ username: 'testuser', password: 'wrongpassword' });

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toContain('locked');
    });

    it('should remember username when rememberUsername is true', async () => {
      mockElectronAPI.login.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          session: mockSession,
          permissions: []
        }
      });

      const { login } = useAuthStore.getState();
      await login({ username: 'testuser', password: 'password123', rememberUsername: true });

      const state = useAuthStore.getState();
      expect(state.rememberedUsername).toBe('testuser');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // First, set up authenticated state
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
        permissions: ['case.create']
      });

      mockElectronAPI.logout.mockResolvedValue({ success: true });

      const { logout } = useAuthStore.getState();
      await logout();

      expect(mockElectronAPI.logout).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.permissions).toEqual([]);
    });

    it('should clear state even if API call fails', async () => {
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      });

      mockElectronAPI.logout.mockRejectedValue(new Error('Network error'));

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('should restore session if valid', async () => {
      mockElectronAPI.validateSession.mockResolvedValue({
        success: true,
        data: {
          valid: true,
          user: mockUser,
          session: mockSession,
          permissions: ['case.view.all']
        }
      });

      const { validateSession } = useAuthStore.getState();
      const result = await validateSession();

      expect(result).toBe(true);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
    });

    it('should clear state if session is invalid', async () => {
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      });

      mockElectronAPI.validateSession.mockResolvedValue({
        success: true,
        data: { valid: false }
      });

      const { validateSession } = useAuthStore.getState();
      const result = await validateSession();

      expect(result).toBe(false);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      });

      mockElectronAPI.changePassword.mockResolvedValue({ success: true });

      const { changePassword } = useAuthStore.getState();
      // changePassword takes a ChangePasswordRequest object
      const result = await changePassword({
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!@#'
      });

      expect(result).toBe(true);
      expect(mockElectronAPI.changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!@#'
      });
    });

    it('should return false for invalid current password', async () => {
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      });

      mockElectronAPI.changePassword.mockResolvedValue({
        success: false,
        error: 'Current password is incorrect'
      });

      const { changePassword } = useAuthStore.getState();
      const result = await changePassword({
        currentPassword: 'wrongPassword',
        newPassword: 'NewPassword123!@#'
      });

      expect(result).toBe(false);
      expect(useAuthStore.getState().passwordChangeError).toBe('Current password is incorrect');
    });
  });

  describe('extendSession', () => {
    it('should extend session', async () => {
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      });

      const newSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      };

      mockElectronAPI.extendSession.mockResolvedValue({
        success: true,
        data: newSession
      });

      const { extendSession } = useAuthStore.getState();
      const result = await extendSession();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.session).toEqual(newSession);
      expect(state.showSessionWarning).toBe(false);
    });
  });

  describe('permissions', () => {
    it('should check single permission correctly', () => {
      useAuthStore.setState({
        permissions: ['case.create', 'case.view.own', 'workflow.submit_review']
      });

      const { hasPermission } = useAuthStore.getState();

      expect(hasPermission('case.create')).toBe(true);
      expect(hasPermission('case.delete')).toBe(false);
    });

    it('should handle wildcard permission', () => {
      useAuthStore.setState({
        permissions: ['*']
      });

      const { hasPermission } = useAuthStore.getState();

      expect(hasPermission('case.create')).toBe(true);
      expect(hasPermission('user.manage')).toBe(true);
      expect(hasPermission('any.permission')).toBe(true);
    });

    it('should check any permission correctly', () => {
      useAuthStore.setState({
        permissions: ['case.create', 'case.view.own']
      });

      const { hasAnyPermission } = useAuthStore.getState();

      expect(hasAnyPermission(['case.create', 'case.delete'])).toBe(true);
      expect(hasAnyPermission(['case.delete', 'user.manage'])).toBe(false);
    });

    it('should check all permissions correctly', () => {
      useAuthStore.setState({
        permissions: ['case.create', 'case.view.own', 'case.edit.own']
      });

      const { hasAllPermissions } = useAuthStore.getState();

      expect(hasAllPermissions(['case.create', 'case.view.own'])).toBe(true);
      expect(hasAllPermissions(['case.create', 'case.delete'])).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should clear error on successful login', async () => {
      useAuthStore.setState({ error: 'Previous error' });

      mockElectronAPI.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, session: mockSession, permissions: [] }
      });

      const { login } = useAuthStore.getState();
      await login({ username: 'testuser', password: 'password123' });

      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should set error on failed login', async () => {
      mockElectronAPI.login.mockResolvedValue({
        success: false,
        error: 'Login failed'
      });

      const { login } = useAuthStore.getState();
      await login({ username: 'testuser', password: 'wrongpassword' });

      expect(useAuthStore.getState().error).toBe('Login failed');
    });

    it('should have clearError action', () => {
      useAuthStore.setState({ error: 'Some error', passwordChangeError: 'Password error' });

      const { clearError } = useAuthStore.getState();
      clearError();

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
      expect(state.passwordChangeError).toBeNull();
    });
  });

  describe('session warning', () => {
    it('should set show session warning', () => {
      const { setShowSessionWarning } = useAuthStore.getState();
      setShowSessionWarning(true);

      expect(useAuthStore.getState().showSessionWarning).toBe(true);

      setShowSessionWarning(false);
      expect(useAuthStore.getState().showSessionWarning).toBe(false);
    });
  });

  describe('activity tracking', () => {
    it('should update last activity time', () => {
      const before = Date.now();

      const { updateActivity } = useAuthStore.getState();
      updateActivity();

      const state = useAuthStore.getState();
      expect(state.lastActivityTime).toBeGreaterThanOrEqual(before);
      expect(state.showSessionWarning).toBe(false);
    });
  });

  describe('validatePasswordPolicy', () => {
    it('should validate password policy', async () => {
      mockElectronAPI.validatePasswordPolicy.mockResolvedValue({
        success: true,
        data: { valid: true, errors: [] }
      });

      const { validatePasswordPolicy } = useAuthStore.getState();
      const result = await validatePasswordPolicy('StrongPassword123!@#');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for weak password', async () => {
      mockElectronAPI.validatePasswordPolicy.mockResolvedValue({
        success: true,
        data: { valid: false, errors: ['Password must be at least 12 characters'] }
      });

      const { validatePasswordPolicy } = useAuthStore.getState();
      const result = await validatePasswordPolicy('weak');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
