/**
 * Workflow and Case Assignment Types
 * Phase 3: Multi-User & Workflow Management
 */

import { User } from './auth.types';
// Import WorkflowStatus from case.types to avoid duplicate definition
import { WorkflowStatus, DueDateType } from './case.types';

// Re-export for convenience
export type { WorkflowStatus, DueDateType };

// Status display configuration
export const WORKFLOW_STATUS_CONFIG: Record<WorkflowStatus, {
  color: string;
  label: string;
  description: string;
}> = {
  'Draft': {
    color: 'default',
    label: 'Draft',
    description: 'Initial data entry in progress'
  },
  'Data Entry Complete': {
    color: 'blue',
    label: 'Data Entry Complete',
    description: 'Ready for medical review'
  },
  'In Medical Review': {
    color: 'processing',
    label: 'In Medical Review',
    description: 'Under medical review'
  },
  'Medical Review Complete': {
    color: 'cyan',
    label: 'Medical Review Complete',
    description: 'Passed medical review, awaiting QC'
  },
  'In QC Review': {
    color: 'processing',
    label: 'In QC Review',
    description: 'Under quality control review'
  },
  'QC Complete': {
    color: 'geekblue',
    label: 'QC Complete',
    description: 'Passed QC, awaiting approval'
  },
  'Approved': {
    color: 'green',
    label: 'Approved',
    description: 'Ready for submission'
  },
  'Pending PSR': {
    color: 'orange',
    label: 'Pending PSR',
    description: 'Non-expedited case awaiting inclusion in PSR'
  },
  'Included in PSR': {
    color: 'cyan',
    label: 'Included in PSR',
    description: 'Case linked to a Periodic Safety Report'
  },
  'Submitted': {
    color: 'purple',
    label: 'Submitted',
    description: 'Sent to FDA'
  },
  'Acknowledged': {
    color: 'success',
    label: 'Acknowledged',
    description: 'FDA confirmed receipt'
  },
  'Rejected': {
    color: 'error',
    label: 'Rejected',
    description: 'Returned for rework'
  }
};

// ============================================================
// Workflow Transition Types
// ============================================================

export interface WorkflowTransition {
  from: WorkflowStatus;
  to: WorkflowStatus;
  requiredPermission: string;
  requiresAssignment?: boolean;
  requiresComment?: boolean;
  requiresSignature?: boolean;
  label: string;
}

// Define valid workflow transitions
export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  {
    from: 'Draft',
    to: 'Data Entry Complete',
    requiredPermission: 'workflow.submit_review',
    label: 'Submit for Review'
  },
  {
    from: 'Data Entry Complete',
    to: 'In Medical Review',
    requiredPermission: 'case.assign',
    requiresAssignment: true,
    label: 'Assign to Medical Review'
  },
  {
    from: 'In Medical Review',
    to: 'Medical Review Complete',
    requiredPermission: 'workflow.approve',
    label: 'Complete Medical Review'
  },
  {
    from: 'In Medical Review',
    to: 'Rejected',
    requiredPermission: 'workflow.reject',
    requiresComment: true,
    label: 'Reject'
  },
  {
    from: 'Medical Review Complete',
    to: 'In QC Review',
    requiredPermission: 'case.assign',
    requiresAssignment: true,
    label: 'Assign to QC Review'
  },
  {
    from: 'In QC Review',
    to: 'QC Complete',
    requiredPermission: 'workflow.approve',
    label: 'Complete QC Review'
  },
  {
    from: 'In QC Review',
    to: 'Rejected',
    requiredPermission: 'workflow.reject',
    requiresComment: true,
    label: 'Reject'
  },
  {
    from: 'QC Complete',
    to: 'Approved',
    requiredPermission: 'workflow.approve',
    requiresSignature: true,
    label: 'Approve for Submission'
  },
  {
    from: 'Approved',
    to: 'Submitted',
    requiredPermission: 'workflow.submit_fda',
    label: 'Submit to FDA'
  },
  {
    from: 'Submitted',
    to: 'Acknowledged',
    requiredPermission: 'workflow.submit_fda',
    label: 'Record Acknowledgment'
  },
  {
    from: 'Rejected',
    to: 'Draft',
    requiredPermission: 'case.edit.own',
    label: 'Start Rework'
  }
];

// ============================================================
// Case Assignment Types
// ============================================================

export type AssignmentPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CaseAssignment {
  id?: number;
  caseId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
  priority: AssignmentPriority;
  notes?: string;
  isCurrent: boolean;
  // Populated fields
  assigneeUser?: User;
  assignerUser?: User;
}

export interface AssignCaseRequest {
  caseId: string;
  assignToUserId: string;
  dueDate?: string;
  priority?: AssignmentPriority;
  notes?: string;
}

export interface ReassignCaseRequest {
  caseId: string;
  newAssigneeId: string;
  reason: string;
}

// ============================================================
// Workflow Action Types
// ============================================================

export type WorkflowActionType =
  | 'approve'
  | 'reject'
  | 'request_info'
  | 'reassign'
  | 'comment';

export interface WorkflowAction {
  action: WorkflowActionType;
  caseId: string;
  toStatus?: WorkflowStatus;
  comment?: string;
  assignTo?: string;
  signature?: ElectronicSignatureInput;
}

export interface ElectronicSignatureInput {
  password: string;
  meaning: string;
}

export interface WorkflowTransitionRequest {
  caseId: string;
  toStatus: WorkflowStatus;
  comment?: string;
  assignTo?: string;
  signature?: ElectronicSignatureInput;
}

export interface WorkflowTransitionResult {
  success: boolean;
  case?: {
    id: string;
    workflowStatus: WorkflowStatus;
  };
  error?: string;
}

// ============================================================
// Case Comment Types
// ============================================================

export type CommentType = 'general' | 'query' | 'response' | 'rejection' | 'workflow';

export interface CaseComment {
  id?: number;
  caseId: string;
  userId: string;
  commentType: CommentType;
  content: string;
  createdAt: string;
  mentions?: string[]; // User IDs mentioned with @
  // Populated field
  user?: User;
}

export interface AddCommentRequest {
  caseId: string;
  commentType: CommentType;
  content: string;
  mentions?: string[];
}

// ============================================================
// Case Note Types (Internal Notes)
// ============================================================

export type NoteVisibility = 'personal' | 'team';

export interface CaseNote {
  id?: number;
  caseId: string;
  userId: string;
  visibility: NoteVisibility;
  content: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  // Populated field
  user?: User;
}

export interface AddNoteRequest {
  caseId: string;
  visibility: NoteVisibility;
  content: string;
}

// ============================================================
// Due Date Types
// ============================================================

export interface DueDateInfo {
  dueDate: string;
  dueDateType: DueDateType;
  daysRemaining: number;
  isOverdue: boolean;
}

// Due date calculation rules
export const DUE_DATE_RULES = {
  expedited: 15, // 15 calendar days for expedited reports
  non_expedited: 90, // 90 calendar days for non-expedited
} as const;

// ============================================================
// Workload Types (Manager View)
// ============================================================

export interface UserWorkload {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  totalCases: number;
  byStatus: Record<WorkflowStatus, number>;
  byPriority: Record<AssignmentPriority, number>;
  overdueCases: number;
}

export interface WorkloadSummary {
  users: UserWorkload[];
  unassignedCases: number;
  totalOverdue: number;
}

// ============================================================
// Case History Entry Types
// ============================================================

export interface CaseHistoryEntry {
  id: number;
  caseId: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  fromStatus?: WorkflowStatus;
  toStatus?: WorkflowStatus;
  comment?: string;
  details?: string;
}
