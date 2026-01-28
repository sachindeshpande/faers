/**
 * Authentication and User Management Types
 * Phase 3: Multi-User & Workflow Management
 */

// ============================================================
// User Types
// ============================================================

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordChangedAt?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  roles?: Role[];
}

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  roles: string[]; // Role names
}

// ============================================================
// Role & Permission Types
// ============================================================

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: PermissionCategory;
}

export type PermissionCategory = 'case' | 'workflow' | 'user' | 'system';

// Permission constants
export const PERMISSIONS = {
  // Case permissions
  CASE_CREATE: 'case.create',
  CASE_VIEW_OWN: 'case.view.own',
  CASE_VIEW_ALL: 'case.view.all',
  CASE_EDIT_OWN: 'case.edit.own',
  CASE_EDIT_ALL: 'case.edit.all',
  CASE_DELETE: 'case.delete',
  CASE_ASSIGN: 'case.assign',

  // Workflow permissions
  WORKFLOW_SUBMIT_REVIEW: 'workflow.submit_review',
  WORKFLOW_APPROVE: 'workflow.approve',
  WORKFLOW_REJECT: 'workflow.reject',
  WORKFLOW_SUBMIT_FDA: 'workflow.submit_fda',

  // User permissions
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DEACTIVATE: 'user.deactivate',

  // System permissions
  SYSTEM_CONFIGURE: 'system.configure',
  SYSTEM_AUDIT_VIEW: 'system.audit.view',
  SYSTEM_REPORTS: 'system.reports',
} as const;

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Default role IDs
export const ROLE_IDS = {
  ADMINISTRATOR: 'admin',
  MANAGER: 'manager',
  DATA_ENTRY: 'data_entry',
  MEDICAL_REVIEWER: 'medical_reviewer',
  QC_REVIEWER: 'qc_reviewer',
  SUBMITTER: 'submitter',
  READ_ONLY: 'read_only',
} as const;

// ============================================================
// Session Types
// ============================================================

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

// ============================================================
// Authentication DTOs
// ============================================================

export interface LoginRequest {
  username: string;
  password: string;
  rememberUsername?: boolean;
}

export interface LoginResponse {
  user: User;
  session: Session;
  permissions: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  userId: string;
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
}

// ============================================================
// User Management DTOs
// ============================================================

export interface CreateUserDTO {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleIds: string[];
}

export interface UpdateUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleIds?: string[];
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface UserFilter {
  search?: string;
  isActive?: boolean;
  roleId?: string;
  limit?: number;
  offset?: number;
}

// ============================================================
// Password Policy
// ============================================================

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  preventReuseCount: number;
  maxAgeDays: number;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  preventReuseCount: 5,
  maxAgeDays: 90,
};

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================
// Auth State (for renderer)
// ============================================================

export interface AuthState {
  user: User | null;
  session: Session | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================================
// Security Configuration
// ============================================================

export interface SecurityConfig {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  sessionWarningMinutes: number;
  enforcePasswordPolicy: boolean;
  singleSessionPerUser: boolean;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  sessionTimeoutMinutes: 30,
  sessionWarningMinutes: 5,
  enforcePasswordPolicy: true,
  singleSessionPerUser: true,
};
