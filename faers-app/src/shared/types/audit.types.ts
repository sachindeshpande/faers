/**
 * Audit Trail and Electronic Signature Types
 * Phase 3: Multi-User & Workflow Management
 *
 * Implements 21 CFR Part 11 compliance requirements:
 * - Comprehensive audit trail (append-only)
 * - Field-level change tracking
 * - Electronic signatures with meaning
 * - Timestamped records (UTC)
 */

// ============================================================
// Audit Action Types
// ============================================================

export type AuditActionType =
  // Authentication actions
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'session_timeout'
  | 'session_extended'
  // Password actions
  | 'password_change'
  | 'password_reset'
  | 'password_reset_admin'
  // User management actions
  | 'user_create'
  | 'user_update'
  | 'user_deactivate'
  | 'user_reactivate'
  | 'role_assign'
  | 'role_remove'
  // Case actions
  | 'case_create'
  | 'case_update'
  | 'case_delete'
  | 'case_view'
  | 'case_export'
  // Workflow actions
  | 'workflow_transition'
  | 'case_assign'
  | 'case_reassign'
  | 'case_approve'
  | 'case_reject'
  // Comment/Note actions
  | 'comment_add'
  | 'note_add'
  | 'note_resolve'
  // Signature actions
  | 'electronic_signature'
  // Submission actions
  | 'submission_record'
  | 'acknowledgment_record'
  // Phase 4: Product actions
  | 'product_created'
  | 'product_updated'
  | 'product_deactivated'
  | 'product_reactivated'
  // Phase 4: Classification actions
  | 'seriousness_updated'
  | 'expectedness_updated'
  | 'report_type_classified'
  // Phase 4: Follow-up actions
  | 'followup_created'
  | 'nullification_created'
  // Phase 4: Batch actions
  | 'batch_created'
  | 'batch_validated'
  | 'batch_exported'
  | 'batch_submitted'
  | 'batch_acknowledged'
  | 'batch_case_added'
  | 'batch_case_removed'
  | 'batch_deleted'
  // Phase 4: PSR actions
  | 'psr_schedule_created'
  | 'psr_schedule_updated'
  | 'psr_schedule_deleted'
  | 'psr_created'
  | 'psr_transitioned'
  | 'psr_case_added'
  | 'psr_case_excluded'
  // System actions
  | 'config_change'
  | 'permission_denied';

// Entity types that can be audited
export type AuditEntityType =
  | 'user'
  | 'role'
  | 'case'
  | 'session'
  | 'comment'
  | 'note'
  | 'assignment'
  | 'submission'
  | 'system'
  // Phase 4
  | 'product'
  | 'batch'
  | 'psr'
  | 'psr_schedule';

// ============================================================
// Audit Log Entry
// ============================================================

export interface AuditLogEntry {
  id: number;
  timestamp: string; // UTC ISO string
  userId?: string;
  username?: string;
  sessionId?: string;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  details?: string; // JSON string for additional context
  ipAddress?: string;
}

export interface CreateAuditLogEntry {
  userId?: string;
  username?: string;
  sessionId?: string;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId?: string;
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

// ============================================================
// Audit Log Filtering
// ============================================================

export interface AuditLogFilter {
  startDate?: string;
  endDate?: string;
  userId?: string;
  actionType?: AuditActionType;
  actionTypes?: AuditActionType[];
  entityType?: AuditEntityType;
  entityId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResult {
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

// ============================================================
// Electronic Signature Types (21 CFR Part 11)
// ============================================================

export interface ElectronicSignature {
  id: number;
  userId: string;
  username: string;
  timestamp: string; // UTC ISO string
  entityType: AuditEntityType;
  entityId: string;
  action: string; // e.g., 'approve_for_submission'
  meaning: string; // e.g., 'I approve this case for submission to FDA'
  recordVersion: number;
  signatureHash: string; // Hash of signed data for integrity
}

export interface CreateElectronicSignature {
  userId: string;
  username: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  meaning: string;
  recordVersion: number;
}

// Predefined signature meanings
export const SIGNATURE_MEANINGS = {
  APPROVE_SUBMISSION: 'I approve this case for submission to the FDA. I have reviewed the data and confirm it is accurate and complete.',
  APPROVE_QC: 'I have completed the quality control review and approve this case to proceed.',
  APPROVE_MEDICAL: 'I have completed the medical review and approve this case to proceed.',
  CONFIRM_SUBMISSION: 'I confirm that this case has been submitted to the FDA.',
} as const;

// ============================================================
// Field Change Tracking
// ============================================================

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface EntityChangeSet {
  entityType: AuditEntityType;
  entityId: string;
  changes: FieldChange[];
}

// ============================================================
// Audit Export Types
// ============================================================

export type AuditExportFormat = 'csv' | 'pdf' | 'json';

export interface AuditExportRequest {
  filter: AuditLogFilter;
  format: AuditExportFormat;
}

export interface AuditExportResult {
  filePath: string;
  fileName: string;
  recordCount: number;
}

// ============================================================
// Audit Trail View Types (for UI)
// ============================================================

export interface AuditTimelineEntry {
  id: number;
  timestamp: string;
  user: {
    id?: string;
    username?: string;
    fullName?: string;
  };
  action: {
    type: AuditActionType;
    label: string;
    description: string;
  };
  entity: {
    type: AuditEntityType;
    id?: string;
    label?: string;
  };
  changes?: FieldChange[];
  signature?: {
    meaning: string;
    timestamp: string;
  };
}

// Action labels for display
export const AUDIT_ACTION_LABELS: Record<AuditActionType, string> = {
  login: 'User Login',
  logout: 'User Logout',
  login_failed: 'Failed Login Attempt',
  session_timeout: 'Session Timeout',
  session_extended: 'Session Extended',
  password_change: 'Password Changed',
  password_reset: 'Password Reset',
  password_reset_admin: 'Password Reset by Admin',
  user_create: 'User Created',
  user_update: 'User Updated',
  user_deactivate: 'User Deactivated',
  user_reactivate: 'User Reactivated',
  role_assign: 'Role Assigned',
  role_remove: 'Role Removed',
  case_create: 'Case Created',
  case_update: 'Case Updated',
  case_delete: 'Case Deleted',
  case_view: 'Case Viewed',
  case_export: 'Case Exported',
  workflow_transition: 'Workflow Status Changed',
  case_assign: 'Case Assigned',
  case_reassign: 'Case Reassigned',
  case_approve: 'Case Approved',
  case_reject: 'Case Rejected',
  comment_add: 'Comment Added',
  note_add: 'Note Added',
  note_resolve: 'Note Resolved',
  electronic_signature: 'Electronic Signature',
  submission_record: 'Submission Recorded',
  acknowledgment_record: 'Acknowledgment Recorded',
  // Phase 4
  product_created: 'Product Created',
  product_updated: 'Product Updated',
  product_deactivated: 'Product Deactivated',
  product_reactivated: 'Product Reactivated',
  seriousness_updated: 'Seriousness Updated',
  expectedness_updated: 'Expectedness Updated',
  report_type_classified: 'Report Type Classified',
  followup_created: 'Follow-up Created',
  nullification_created: 'Nullification Created',
  // Batch
  batch_created: 'Batch Created',
  batch_validated: 'Batch Validated',
  batch_exported: 'Batch Exported',
  batch_submitted: 'Batch Submitted',
  batch_acknowledged: 'Batch Acknowledged',
  batch_case_added: 'Case Added to Batch',
  batch_case_removed: 'Case Removed from Batch',
  batch_deleted: 'Batch Deleted',
  // PSR
  psr_schedule_created: 'PSR Schedule Created',
  psr_schedule_updated: 'PSR Schedule Updated',
  psr_schedule_deleted: 'PSR Schedule Deleted',
  psr_created: 'PSR Created',
  psr_transitioned: 'PSR Status Changed',
  psr_case_added: 'Case Added to PSR',
  psr_case_excluded: 'Case Excluded from PSR',
  // System
  config_change: 'Configuration Changed',
  permission_denied: 'Permission Denied',
};

// ============================================================
// Compliance Report Types
// ============================================================

export interface ComplianceReport {
  generatedAt: string;
  generatedBy: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalAuditEntries: number;
    uniqueUsers: number;
    loginAttempts: number;
    failedLogins: number;
    caseChanges: number;
    workflowTransitions: number;
    electronicSignatures: number;
  };
  flaggedItems: {
    multipleFailedLogins: Array<{ userId: string; username: string; count: number }>;
    afterHoursActivity: AuditLogEntry[];
    unusualPatterns: string[];
  };
}
