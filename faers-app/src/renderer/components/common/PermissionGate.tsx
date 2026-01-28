/**
 * Permission Gate Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Conditionally renders children based on user permissions.
 * Provides declarative permission-based access control in the UI.
 */

import React from 'react';
import { useAuthStore } from '../../stores/authStore';

interface PermissionGateProps {
  /** Single permission required */
  permission?: string;
  /** Multiple permissions - user must have ANY of these */
  anyPermission?: string[];
  /** Multiple permissions - user must have ALL of these */
  allPermissions?: string[];
  /** Content to render if permission check passes */
  children: React.ReactNode;
  /** Optional content to render if permission check fails */
  fallback?: React.ReactNode;
}

/**
 * Permission Gate - Renders children only if user has required permissions
 *
 * Usage examples:
 *
 * // Single permission
 * <PermissionGate permission="case.create">
 *   <Button>New Case</Button>
 * </PermissionGate>
 *
 * // Any of multiple permissions
 * <PermissionGate anyPermission={["case.edit.own", "case.edit.all"]}>
 *   <Button>Edit Case</Button>
 * </PermissionGate>
 *
 * // All of multiple permissions
 * <PermissionGate allPermissions={["case.view.all", "workflow.approve"]}>
 *   <AdminPanel />
 * </PermissionGate>
 *
 * // With fallback
 * <PermissionGate permission="system.audit.view" fallback={<Text>Access Denied</Text>}>
 *   <AuditLogViewer />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  anyPermission,
  allPermissions,
  children,
  fallback = null
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuthStore();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAnyPermission(anyPermission);
  } else if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAllPermissions(allPermissions);
  } else {
    // No permission specified - allow access
    hasAccess = true;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Hook to check permissions imperatively
 * Useful when you need permission checks outside of JSX
 *
 * Usage:
 * const { canCreate, canEdit, canDelete } = usePermissions();
 */
export const usePermissions = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissions } = useAuthStore();

  return {
    // Permission check functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Common permission checks
    canCreateCase: hasPermission('case.create'),
    canViewOwnCases: hasPermission('case.view.own'),
    canViewAllCases: hasPermission('case.view.all'),
    canEditOwnCases: hasPermission('case.edit.own'),
    canEditAllCases: hasPermission('case.edit.all'),
    canDeleteCases: hasPermission('case.delete'),
    canAssignCases: hasPermission('case.assign'),

    // Workflow permissions
    canSubmitForReview: hasPermission('workflow.submit_review'),
    canApprove: hasPermission('workflow.approve'),
    canReject: hasPermission('workflow.reject'),
    canSubmitToFDA: hasPermission('workflow.submit_fda'),

    // User management permissions
    canViewUsers: hasPermission('user.view'),
    canCreateUsers: hasPermission('user.create'),
    canEditUsers: hasPermission('user.edit'),
    canDeactivateUsers: hasPermission('user.deactivate'),

    // System permissions
    canConfigure: hasPermission('system.configure'),
    canViewAuditLog: hasPermission('system.audit.view'),
    canViewReports: hasPermission('system.reports'),

    // Admin check (has wildcard permission)
    isAdmin: permissions.includes('*'),

    // Raw permissions array
    permissions
  };
};

/**
 * Higher-Order Component for permission-based access control
 * Useful for wrapping entire pages or complex components
 *
 * Usage:
 * const ProtectedPage = withPermission('admin.access')(AdminPage);
 */
export function withPermission<P extends object>(
  permission: string,
  FallbackComponent?: React.ComponentType
) {
  return function WithPermissionWrapper(
    WrappedComponent: React.ComponentType<P>
  ): React.FC<P> {
    const ComponentWithPermission: React.FC<P> = (props) => {
      const { hasPermission } = useAuthStore();

      if (hasPermission(permission)) {
        return <WrappedComponent {...props} />;
      }

      if (FallbackComponent) {
        return <FallbackComponent />;
      }

      return null;
    };

    ComponentWithPermission.displayName = `WithPermission(${
      WrappedComponent.displayName || WrappedComponent.name || 'Component'
    })`;

    return ComponentWithPermission;
  };
}

export default PermissionGate;
