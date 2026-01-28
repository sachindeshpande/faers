/**
 * Auth Store - Zustand state management for authentication
 * Phase 3: Multi-User & Workflow Management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  Session,
  LoginRequest,
  ChangePasswordRequest,
  PasswordValidationResult
} from '../../shared/types/auth.types';

interface AuthState {
  // Auth state
  user: User | null;
  session: Session | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Session management
  sessionTimeoutMinutes: number;
  sessionWarningMinutes: number;
  showSessionWarning: boolean;
  lastActivityTime: number;

  // Password change
  mustChangePassword: boolean;
  isChangingPassword: boolean;
  passwordChangeError: string | null;

  // Remembered username
  rememberedUsername: string | null;

  // Actions
  login: (request: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  extendSession: () => Promise<boolean>;
  changePassword: (request: ChangePasswordRequest) => Promise<boolean>;
  validatePasswordPolicy: (password: string) => Promise<PasswordValidationResult>;
  updateActivity: () => void;
  setShowSessionWarning: (show: boolean) => void;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: true, // Start with loading while validating existing session
      error: null,

      sessionTimeoutMinutes: 30,
      sessionWarningMinutes: 5,
      showSessionWarning: false,
      lastActivityTime: Date.now(),

      mustChangePassword: false,
      isChangingPassword: false,
      passwordChangeError: null,

      rememberedUsername: null,

      // Actions
      login: async (request: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await window.electronAPI.login(request);

          if (response.success && response.data) {
            const { user, session, permissions } = response.data;

            // Get timeout config
            let timeoutConfig = { timeoutMinutes: 30, warningMinutes: 5 };
            try {
              const configResponse = await window.electronAPI.getSessionTimeoutConfig();
              if (configResponse.success && configResponse.data) {
                timeoutConfig = configResponse.data;
              }
            } catch {
              // Use defaults
            }

            set({
              user,
              session,
              permissions,
              isAuthenticated: true,
              isLoading: false,
              mustChangePassword: user.mustChangePassword,
              sessionTimeoutMinutes: timeoutConfig.timeoutMinutes,
              sessionWarningMinutes: timeoutConfig.warningMinutes,
              lastActivityTime: Date.now(),
              rememberedUsername: request.rememberUsername ? request.username : null
            });

            return true;
          } else {
            set({
              isLoading: false,
              error: response.error || 'Login failed'
            });
            return false;
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed'
          });
          return false;
        }
      },

      logout: async () => {
        try {
          await window.electronAPI.logout();
        } catch {
          // Continue with local logout even if API fails
        }

        set({
          user: null,
          session: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
          error: null,
          mustChangePassword: false,
          showSessionWarning: false
        });
      },

      validateSession: async () => {
        try {
          const response = await window.electronAPI.validateSession();

          if (response.success && response.data?.valid) {
            const { user, session, permissions } = response.data;

            // Get timeout config
            let timeoutConfig = { timeoutMinutes: 30, warningMinutes: 5 };
            try {
              const configResponse = await window.electronAPI.getSessionTimeoutConfig();
              if (configResponse.success && configResponse.data) {
                timeoutConfig = configResponse.data;
              }
            } catch {
              // Use defaults
            }

            set({
              user: user || null,
              session: session || null,
              permissions: permissions || [],
              isAuthenticated: true,
              isLoading: false,
              mustChangePassword: user?.mustChangePassword || false,
              sessionTimeoutMinutes: timeoutConfig.timeoutMinutes,
              sessionWarningMinutes: timeoutConfig.warningMinutes,
              lastActivityTime: Date.now()
            });

            return true;
          } else {
            set({
              user: null,
              session: null,
              permissions: [],
              isAuthenticated: false,
              isLoading: false
            });
            return false;
          }
        } catch {
          set({
            user: null,
            session: null,
            permissions: [],
            isAuthenticated: false,
            isLoading: false
          });
          return false;
        }
      },

      extendSession: async () => {
        try {
          const response = await window.electronAPI.extendSession();

          if (response.success && response.data) {
            set({
              session: response.data,
              showSessionWarning: false,
              lastActivityTime: Date.now()
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      changePassword: async (request: ChangePasswordRequest) => {
        set({ isChangingPassword: true, passwordChangeError: null });

        try {
          const response = await window.electronAPI.changePassword(request);

          if (response.success) {
            // Update user state to clear mustChangePassword
            const user = get().user;
            if (user) {
              set({
                user: { ...user, mustChangePassword: false },
                mustChangePassword: false,
                isChangingPassword: false
              });
            }
            return true;
          } else {
            set({
              isChangingPassword: false,
              passwordChangeError: response.error || 'Password change failed'
            });
            return false;
          }
        } catch (error) {
          set({
            isChangingPassword: false,
            passwordChangeError: error instanceof Error ? error.message : 'Password change failed'
          });
          return false;
        }
      },

      validatePasswordPolicy: async (password: string) => {
        try {
          const response = await window.electronAPI.validatePasswordPolicy(
            password,
            get().user?.username
          );

          if (response.success && response.data) {
            return response.data;
          }
          return { valid: false, errors: ['Failed to validate password'] };
        } catch {
          return { valid: false, errors: ['Failed to validate password'] };
        }
      },

      updateActivity: () => {
        set({ lastActivityTime: Date.now(), showSessionWarning: false });
      },

      setShowSessionWarning: (show: boolean) => {
        set({ showSessionWarning: show });
      },

      clearError: () => {
        set({ error: null, passwordChangeError: null });
      },

      hasPermission: (permission: string) => {
        const { permissions } = get();
        // Admin has all permissions (represented by '*')
        if (permissions.includes('*')) return true;
        return permissions.includes(permission);
      },

      hasAnyPermission: (requiredPermissions: string[]) => {
        const { permissions } = get();
        if (permissions.includes('*')) return true;
        return requiredPermissions.some((p) => permissions.includes(p));
      },

      hasAllPermissions: (requiredPermissions: string[]) => {
        const { permissions } = get();
        if (permissions.includes('*')) return true;
        return requiredPermissions.every((p) => permissions.includes(p));
      }
    }),
    {
      name: 'faers-auth',
      partialize: (state) => ({
        // Only persist remembered username
        rememberedUsername: state.rememberedUsername
      })
    }
  )
);

// Selector hooks for cleaner component access
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const usePermissions = () => useAuthStore((state) => state.permissions);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useMustChangePassword = () => useAuthStore((state) => state.mustChangePassword);

export const useAuthActions = () =>
  useAuthStore((state) => ({
    login: state.login,
    logout: state.logout,
    validateSession: state.validateSession,
    extendSession: state.extendSession,
    changePassword: state.changePassword,
    validatePasswordPolicy: state.validatePasswordPolicy,
    updateActivity: state.updateActivity,
    clearError: state.clearError,
    hasPermission: state.hasPermission,
    hasAnyPermission: state.hasAnyPermission,
    hasAllPermissions: state.hasAllPermissions
  }));

export const useSessionState = () =>
  useAuthStore((state) => ({
    session: state.session,
    sessionTimeoutMinutes: state.sessionTimeoutMinutes,
    sessionWarningMinutes: state.sessionWarningMinutes,
    showSessionWarning: state.showSessionWarning,
    lastActivityTime: state.lastActivityTime,
    setShowSessionWarning: state.setShowSessionWarning,
    extendSession: state.extendSession
  }));

export const usePasswordChangeState = () =>
  useAuthStore((state) => ({
    isChangingPassword: state.isChangingPassword,
    passwordChangeError: state.passwordChangeError,
    changePassword: state.changePassword,
    validatePasswordPolicy: state.validatePasswordPolicy
  }));
