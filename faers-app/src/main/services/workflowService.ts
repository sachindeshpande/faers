/**
 * Workflow Service
 * Phase 3: Multi-User & Workflow Management
 *
 * Implements the workflow state machine for case processing.
 * Handles transitions, validation, and authorization.
 */

import type {
  WorkflowStatus,
  WorkflowTransitionRequest,
  WorkflowTransitionResult,
  WorkflowTransition,
  CaseAssignment,
  CaseComment,
  CaseNote,
  AddCommentRequest,
  AddNoteRequest,
  CaseHistoryEntry,
  AssignmentPriority
} from '../../shared/types/workflow.types';
import type { User } from '../../shared/types/auth.types';
import { AuditService } from './auditService';
import { createNotification } from '../ipc/notification.handlers';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

interface CaseRow {
  id: string;
  workflow_status: string;
  current_owner: string | null;
  current_assignee: string | null;
  created_by: string | null;
  due_date: string | null;
  due_date_type: string | null;
  version: number;
}

interface AssignmentRow {
  id: number;
  case_id: string;
  assigned_to: string;
  assigned_by: string;
  assigned_at: string;
  due_date: string | null;
  priority: string;
  notes: string | null;
  is_current: number;
}

interface CommentRow {
  id: number;
  case_id: string;
  user_id: string;
  comment_type: string;
  content: string;
  created_at: string;
  mentions: string | null;
}

interface NoteRow {
  id: number;
  case_id: string;
  user_id: string;
  visibility: string;
  content: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface UserRow {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
}

// Define valid workflow transitions
const WORKFLOW_TRANSITIONS_MAP: WorkflowTransition[] = [
  {
    from: 'Draft',
    to: 'Data Entry Complete',
    requiredPermission: 'case.edit.own',  // Any user who can edit cases can submit for review
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

export class WorkflowService {
  private db: DatabaseInstance;
  private auditService: AuditService;

  constructor(db: DatabaseInstance) {
    this.db = db;
    this.auditService = new AuditService(db);
  }

  /**
   * Check if cases table has workflow columns
   */
  private hasWorkflowColumns(): boolean {
    try {
      const result = this.db.prepare(`
        SELECT COUNT(*) as count FROM pragma_table_info('cases')
        WHERE name = 'workflow_status'
      `).get() as { count: number };
      return result.count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get current case workflow status
   */
  getCaseStatus(caseId: string): WorkflowStatus | null {
    if (!this.hasWorkflowColumns()) {
      // Fallback: return 'Draft' status
      return 'Draft';
    }

    const row = this.db.prepare(`
      SELECT workflow_status FROM cases WHERE id = ? AND deleted_at IS NULL
    `).get(caseId) as { workflow_status: string } | undefined;

    return row?.workflow_status as WorkflowStatus || null;
  }

  /**
   * Get case with workflow details
   */
  getCaseWorkflowDetails(caseId: string): {
    caseId: string;
    workflowStatus: WorkflowStatus;
    currentOwner?: string;
    currentAssignee?: string;
    dueDate?: string;
    dueDateType?: string;
    version: number;
  } | null {
    if (!this.hasWorkflowColumns()) {
      const basicRow = this.db.prepare(`
        SELECT id, version FROM cases WHERE id = ? AND deleted_at IS NULL
      `).get(caseId) as { id: string; version: number } | undefined;

      if (!basicRow) return null;

      return {
        caseId: basicRow.id,
        workflowStatus: 'Draft',
        version: basicRow.version
      };
    }

    const row = this.db.prepare(`
      SELECT id, workflow_status, current_owner, current_assignee,
             due_date, due_date_type, version
      FROM cases WHERE id = ? AND deleted_at IS NULL
    `).get(caseId) as CaseRow | undefined;

    if (!row) return null;

    return {
      caseId: row.id,
      workflowStatus: (row.workflow_status || 'Draft') as WorkflowStatus,
      currentOwner: row.current_owner || undefined,
      currentAssignee: row.current_assignee || undefined,
      dueDate: row.due_date || undefined,
      dueDateType: row.due_date_type || undefined,
      version: row.version
    };
  }

  /**
   * Get available actions for a case based on status and permissions
   */
  getAvailableActions(
    currentStatus: WorkflowStatus,
    userPermissions: string[],
    isAssignee: boolean = false,
    isOwner: boolean = false
  ): WorkflowTransition[] {
    console.log(`[WorkflowService] getAvailableActions: currentStatus='${currentStatus}', permissions=${userPermissions.length}`);

    const hasPermission = (perm: string) =>
      userPermissions.includes('*') || userPermissions.includes(perm);

    const result = WORKFLOW_TRANSITIONS_MAP.filter(transition => {
      // Must match current status
      if (transition.from !== currentStatus) {
        return false;
      }

      // Must have required permission
      if (!hasPermission(transition.requiredPermission)) {
        console.log(`[WorkflowService] Transition '${transition.label}' blocked: missing permission '${transition.requiredPermission}'`);
        return false;
      }

      // For review completion, user must be the assignee
      if (transition.from === 'In Medical Review' || transition.from === 'In QC Review') {
        if (transition.to !== 'Rejected' && !isAssignee && !hasPermission('case.view.all')) {
          console.log(`[WorkflowService] Transition '${transition.label}' blocked: not assignee`);
          return false;
        }
      }

      // For rework from rejected, user must be owner or have edit permission
      if (transition.from === 'Rejected' && !isOwner && !hasPermission('case.edit.all')) {
        console.log(`[WorkflowService] Transition '${transition.label}' blocked: not owner`);
        return false;
      }

      console.log(`[WorkflowService] Transition '${transition.label}' allowed`);
      return true;
    });

    console.log(`[WorkflowService] Returning ${result.length} available actions`);
    return result;
  }

  /**
   * Transition case to new status
   */
  async transition(
    request: WorkflowTransitionRequest,
    user: User,
    userPermissions: string[],
    sessionId?: string
  ): Promise<WorkflowTransitionResult> {
    const { caseId, toStatus, comment, assignTo, signature } = request;

    console.log(`[WorkflowService] transition: caseId=${caseId}, toStatus='${toStatus}'`);

    // Get current case details
    const caseDetails = this.getCaseWorkflowDetails(caseId);
    if (!caseDetails) {
      console.log(`[WorkflowService] Case not found: ${caseId}`);
      return { success: false, error: 'Case not found' };
    }

    const fromStatus = caseDetails.workflowStatus;
    console.log(`[WorkflowService] Current workflowStatus='${fromStatus}'`);

    // Find matching transition
    const transition = WORKFLOW_TRANSITIONS_MAP.find(
      t => t.from === fromStatus && t.to === toStatus
    );

    if (!transition) {
      return {
        success: false,
        error: `Invalid transition from ${fromStatus} to ${toStatus}`
      };
    }

    // Check permission
    const hasPermission =
      userPermissions.includes('*') ||
      userPermissions.includes(transition.requiredPermission);

    if (!hasPermission) {
      this.auditService.log({
        userId: user.id,
        username: user.username,
        sessionId,
        actionType: 'permission_denied',
        entityType: 'case',
        entityId: caseId,
        details: {
          action: 'workflow_transition',
          requiredPermission: transition.requiredPermission,
          fromStatus,
          toStatus
        }
      });
      return { success: false, error: 'Permission denied' };
    }

    // Check if comment is required
    if (transition.requiresComment && !comment) {
      return { success: false, error: 'Comment is required for this action' };
    }

    // Check if assignment is required
    if (transition.requiresAssignment && !assignTo) {
      return { success: false, error: 'Assignment is required for this action' };
    }

    // Check if signature is required
    if (transition.requiresSignature && !signature) {
      return { success: false, error: 'Electronic signature is required for this action' };
    }

    // Validate signature if provided
    if (signature) {
      // Re-authenticate user with password
      const isValidSignature = await this.validateSignature(user.id, signature.password);
      if (!isValidSignature) {
        return { success: false, error: 'Invalid signature - password verification failed' };
      }

      // Create electronic signature record
      this.auditService.createSignature({
        userId: user.id,
        username: user.username,
        entityType: 'case',
        entityId: caseId,
        action: `workflow_${toStatus.toLowerCase().replace(/\s+/g, '_')}`,
        meaning: signature.meaning,
        recordVersion: caseDetails.version
      });
    }

    // Perform the transition
    try {
      if (this.hasWorkflowColumns()) {
        const updates: string[] = ['workflow_status = ?', "updated_at = datetime('now')"];
        const values: (string | null)[] = [toStatus];

        // Handle assignment
        if (assignTo) {
          updates.push('current_assignee = ?');
          values.push(assignTo);

          // Create assignment record
          this.createAssignment(caseId, assignTo, user.id);
        }

        // Clear assignee if transitioning to a non-review status
        if (!['In Medical Review', 'In QC Review'].includes(toStatus) && !assignTo) {
          updates.push('current_assignee = NULL');
        }

        // Increment rejection count if being rejected
        if (toStatus === 'Rejected') {
          updates.push('rejection_count = COALESCE(rejection_count, 0) + 1');
        }

        values.push(caseId);

        const sql = `UPDATE cases SET ${updates.join(', ')} WHERE id = ?`;
        console.log(`[WorkflowService] Executing SQL: ${sql}`);
        console.log(`[WorkflowService] Values: ${values.join(', ')}`);

        const result = this.db.prepare(sql).run(...values);
        console.log(`[WorkflowService] Update result: changes=${result.changes}`);
      } else {
        console.log(`[WorkflowService] Warning: workflow columns not found in cases table`);
      }

      // Add workflow comment if provided
      if (comment) {
        this.addComment({
          caseId,
          commentType: toStatus === 'Rejected' ? 'rejection' : 'workflow',
          content: comment
        }, user.id);
      }

      // Log audit trail
      this.auditService.logWorkflowTransition(
        user.id,
        user.username,
        sessionId,
        caseId,
        fromStatus,
        toStatus,
        comment
      );

      // Send notifications
      this.sendTransitionNotifications(caseId, fromStatus, toStatus, user, assignTo);

      return {
        success: true,
        case: {
          id: caseId,
          workflowStatus: toStatus
        }
      };
    } catch (error) {
      console.error('Workflow transition error:', error);
      return {
        success: false,
        error: `Failed to transition case: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate user signature (re-authenticate with password)
   */
  private async validateSignature(userId: string, password: string): Promise<boolean> {
    try {
      // Get user's password hash
      const row = this.db.prepare(
        'SELECT password_hash FROM users WHERE id = ?'
      ).get(userId) as { password_hash: string } | undefined;

      if (!row) return false;

      // Use bcryptjs to verify
      const bcrypt = await import('bcryptjs');
      return bcrypt.compareSync(password, row.password_hash);
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Send notifications for workflow transitions
   */
  private sendTransitionNotifications(
    caseId: string,
    _fromStatus: WorkflowStatus,
    toStatus: WorkflowStatus,
    actor: User,
    assigneeId?: string
  ): void {
    // Get case owner
    let ownerId: string | undefined;
    if (this.hasWorkflowColumns()) {
      const row = this.db.prepare(
        'SELECT current_owner FROM cases WHERE id = ?'
      ).get(caseId) as { current_owner: string } | undefined;
      ownerId = row?.current_owner;
    }

    // Notify assignee of new assignment
    if (assigneeId && assigneeId !== actor.id) {
      createNotification(
        assigneeId,
        'assignment',
        'Case Assigned',
        `Case ${caseId} has been assigned to you for ${toStatus === 'In Medical Review' ? 'medical' : 'QC'} review`,
        'case',
        caseId
      );
    }

    // Notify owner of rejections
    if (toStatus === 'Rejected' && ownerId && ownerId !== actor.id) {
      createNotification(
        ownerId,
        'workflow',
        'Case Rejected',
        `Case ${caseId} has been rejected and returned for rework`,
        'case',
        caseId
      );
    }

    // Notify owner of approvals
    if (toStatus === 'Approved' && ownerId && ownerId !== actor.id) {
      createNotification(
        ownerId,
        'workflow',
        'Case Approved',
        `Case ${caseId} has been approved for FDA submission`,
        'case',
        caseId
      );
    }
  }

  /**
   * Create a case assignment
   */
  createAssignment(
    caseId: string,
    assignedTo: string,
    assignedBy: string,
    dueDate?: string,
    priority: AssignmentPriority = 'normal',
    notes?: string
  ): void {
    // Check if case_assignments table exists
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='case_assignments'
    `).get();

    if (!tableExists) return;

    // Mark any existing assignments as not current
    this.db.prepare(`
      UPDATE case_assignments SET is_current = 0
      WHERE case_id = ? AND is_current = 1
    `).run(caseId);

    // Create new assignment
    this.db.prepare(`
      INSERT INTO case_assignments (case_id, assigned_to, assigned_by, assigned_at, due_date, priority, notes, is_current)
      VALUES (?, ?, ?, datetime('now'), ?, ?, ?, 1)
    `).run(caseId, assignedTo, assignedBy, dueDate || null, priority, notes || null);
  }

  /**
   * Get current assignment for a case
   */
  getCurrentAssignment(caseId: string): CaseAssignment | null {
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='case_assignments'
    `).get();

    if (!tableExists) return null;

    const row = this.db.prepare(`
      SELECT ca.*, u.username, u.first_name, u.last_name
      FROM case_assignments ca
      LEFT JOIN users u ON ca.assigned_to = u.id
      WHERE ca.case_id = ? AND ca.is_current = 1
    `).get(caseId) as (AssignmentRow & Partial<UserRow>) | undefined;

    if (!row) return null;

    return {
      id: row.id,
      caseId: row.case_id,
      assignedTo: row.assigned_to,
      assignedBy: row.assigned_by,
      assignedAt: row.assigned_at,
      dueDate: row.due_date || undefined,
      priority: row.priority as AssignmentPriority,
      notes: row.notes || undefined,
      isCurrent: row.is_current === 1,
      assigneeUser: row.username ? {
        id: row.assigned_to,
        username: row.username,
        email: '',
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        createdAt: '',
        updatedAt: ''
      } : undefined
    };
  }

  /**
   * Get assignment history for a case
   */
  getAssignmentHistory(caseId: string): CaseAssignment[] {
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='case_assignments'
    `).get();

    if (!tableExists) return [];

    const rows = this.db.prepare(`
      SELECT ca.*, u.username, u.first_name, u.last_name
      FROM case_assignments ca
      LEFT JOIN users u ON ca.assigned_to = u.id
      WHERE ca.case_id = ?
      ORDER BY ca.assigned_at DESC
    `).all(caseId) as (AssignmentRow & Partial<UserRow>)[];

    return rows.map(row => ({
      id: row.id,
      caseId: row.case_id,
      assignedTo: row.assigned_to,
      assignedBy: row.assigned_by,
      assignedAt: row.assigned_at,
      dueDate: row.due_date || undefined,
      priority: row.priority as AssignmentPriority,
      notes: row.notes || undefined,
      isCurrent: row.is_current === 1,
      assigneeUser: row.username ? {
        id: row.assigned_to,
        username: row.username,
        email: '',
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        createdAt: '',
        updatedAt: ''
      } : undefined
    }));
  }

  /**
   * Add a comment to a case
   */
  addComment(request: AddCommentRequest, userId: string): CaseComment | null {
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='case_comments'
    `).get();

    if (!tableExists) return null;

    const result = this.db.prepare(`
      INSERT INTO case_comments (case_id, user_id, comment_type, content, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(request.caseId, userId, request.commentType, request.content);

    if (result.changes === 0) return null;

    // Fetch the created comment
    const row = this.db.prepare(`
      SELECT * FROM case_comments WHERE id = ?
    `).get(result.lastInsertRowid) as CommentRow;

    return {
      id: row.id,
      caseId: row.case_id,
      userId: row.user_id,
      commentType: row.comment_type as CaseComment['commentType'],
      content: row.content,
      createdAt: row.created_at,
      mentions: row.mentions ? JSON.parse(row.mentions) : undefined
    };
  }

  /**
   * Get comments for a case
   */
  getComments(caseId: string): CaseComment[] {
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='case_comments'
    `).get();

    if (!tableExists) return [];

    const rows = this.db.prepare(`
      SELECT cc.*, u.username, u.first_name, u.last_name
      FROM case_comments cc
      LEFT JOIN users u ON cc.user_id = u.id
      WHERE cc.case_id = ?
      ORDER BY cc.created_at DESC
    `).all(caseId) as (CommentRow & Partial<UserRow>)[];

    return rows.map(row => ({
      id: row.id,
      caseId: row.case_id,
      userId: row.user_id,
      commentType: row.comment_type as CaseComment['commentType'],
      content: row.content,
      createdAt: row.created_at,
      mentions: row.mentions ? JSON.parse(row.mentions) : undefined,
      user: row.username ? {
        id: row.user_id,
        username: row.username,
        email: '',
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        createdAt: '',
        updatedAt: ''
      } : undefined
    }));
  }

  /**
   * Add a note to a case
   */
  addNote(request: AddNoteRequest, userId: string): CaseNote | null {
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='case_notes'
    `).get();

    if (!tableExists) return null;

    const result = this.db.prepare(`
      INSERT INTO case_notes (case_id, user_id, visibility, content, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(request.caseId, userId, request.visibility, request.content);

    if (result.changes === 0) return null;

    const row = this.db.prepare(`
      SELECT * FROM case_notes WHERE id = ?
    `).get(result.lastInsertRowid) as NoteRow;

    return {
      id: row.id,
      caseId: row.case_id,
      userId: row.user_id,
      visibility: row.visibility as CaseNote['visibility'],
      content: row.content,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at || undefined,
      resolvedBy: row.resolved_by || undefined
    };
  }

  /**
   * Get notes for a case
   */
  getNotes(caseId: string, userId: string): CaseNote[] {
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='case_notes'
    `).get();

    if (!tableExists) return [];

    const rows = this.db.prepare(`
      SELECT cn.*, u.username, u.first_name, u.last_name
      FROM case_notes cn
      LEFT JOIN users u ON cn.user_id = u.id
      WHERE cn.case_id = ?
        AND (cn.visibility = 'team' OR cn.user_id = ?)
      ORDER BY cn.created_at DESC
    `).all(caseId, userId) as (NoteRow & Partial<UserRow>)[];

    return rows.map(row => ({
      id: row.id,
      caseId: row.case_id,
      userId: row.user_id,
      visibility: row.visibility as CaseNote['visibility'],
      content: row.content,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at || undefined,
      resolvedBy: row.resolved_by || undefined,
      user: row.username ? {
        id: row.user_id,
        username: row.username,
        email: '',
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        createdAt: '',
        updatedAt: ''
      } : undefined
    }));
  }

  /**
   * Get case history (workflow transitions and activities)
   */
  getCaseHistory(caseId: string): CaseHistoryEntry[] {
    // Query audit log for case-related entries
    const rows = this.db.prepare(`
      SELECT id, timestamp, user_id, username, action_type,
             old_value, new_value, details
      FROM audit_log
      WHERE entity_type = 'case' AND entity_id = ?
      ORDER BY timestamp DESC
    `).all(caseId) as Array<{
      id: number;
      timestamp: string;
      user_id: string | null;
      username: string | null;
      action_type: string;
      old_value: string | null;
      new_value: string | null;
      details: string | null;
    }>;

    return rows.map(row => ({
      id: row.id,
      caseId,
      timestamp: row.timestamp,
      userId: row.user_id || '',
      username: row.username || 'System',
      action: row.action_type,
      fromStatus: row.old_value as WorkflowStatus | undefined,
      toStatus: row.new_value as WorkflowStatus | undefined,
      comment: row.details ? JSON.parse(row.details)?.comment : undefined,
      details: row.details || undefined
    }));
  }

  /**
   * Get cases assigned to a user
   */
  getMyCases(userId: string, limit: number = 50): Array<{
    caseId: string;
    workflowStatus: WorkflowStatus;
    dueDate?: string;
    priority: AssignmentPriority;
    assignedAt: string;
  }> {
    if (!this.hasWorkflowColumns()) {
      return [];
    }

    const rows = this.db.prepare(`
      SELECT c.id, c.workflow_status, c.due_date, ca.priority, ca.assigned_at
      FROM cases c
      INNER JOIN case_assignments ca ON c.id = ca.case_id AND ca.is_current = 1
      WHERE ca.assigned_to = ? AND c.deleted_at IS NULL
      ORDER BY
        CASE WHEN c.due_date IS NOT NULL AND c.due_date < datetime('now') THEN 0 ELSE 1 END,
        c.due_date ASC,
        CASE ca.priority
          WHEN 'urgent' THEN 0
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
        END
      LIMIT ?
    `).all(userId, limit) as Array<{
      id: string;
      workflow_status: string;
      due_date: string | null;
      priority: string;
      assigned_at: string;
    }>;

    return rows.map(row => ({
      caseId: row.id,
      workflowStatus: (row.workflow_status || 'Draft') as WorkflowStatus,
      dueDate: row.due_date || undefined,
      priority: row.priority as AssignmentPriority,
      assignedAt: row.assigned_at
    }));
  }
}
