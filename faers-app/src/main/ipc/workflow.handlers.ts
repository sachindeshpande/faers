/**
 * Workflow IPC Handlers
 * Phase 3: Multi-User & Workflow Management
 *
 * Handles workflow-related IPC requests from the renderer process.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type {
  IPCResponse,
  WorkflowTransitionRequest,
  WorkflowTransitionResult,
  AvailableActionsResponse,
  CaseAssignment,
  AssignCaseRequest,
  ReassignCaseRequest,
  CaseComment,
  AddCommentRequest,
  CaseNote,
  AddNoteRequest,
  CaseHistoryEntry,
  MyCasesResponse,
  WorkloadSummary
} from '../../shared/types/ipc.types';
import type { WorkflowStatus, AssignmentPriority } from '../../shared/types/workflow.types';
import { getDatabase } from '../database/connection';
import { getCurrentSessionId } from './auth.handlers';
import { AuthService } from '../services/authService';
import { WorkflowService } from '../services/workflowService';
import { AuditService } from '../services/auditService';

/**
 * Get the current user and permissions from session
 */
function getCurrentAuthContext(): {
  user: { id: string; username: string } | null;
  permissions: string[];
  sessionId: string | null;
} {
  const sessionId = getCurrentSessionId();
  if (!sessionId) {
    return { user: null, permissions: [], sessionId: null };
  }

  try {
    const db = getDatabase();
    const authService = new AuthService(db);
    const validation = authService.validateSession(sessionId);

    if (!validation.valid || !validation.user) {
      return { user: null, permissions: [], sessionId: null };
    }

    return {
      user: {
        id: validation.user.id,
        username: validation.user.username
      },
      permissions: validation.permissions || [],
      sessionId
    };
  } catch {
    return { user: null, permissions: [], sessionId: null };
  }
}

/**
 * Transition workflow status
 */
async function transitionWorkflow(
  request: WorkflowTransitionRequest
): Promise<IPCResponse<WorkflowTransitionResult>> {
  try {
    const { user, permissions, sessionId } = getCurrentAuthContext();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);

    const result = await workflowService.transition(
      request,
      {
        id: user.id,
        username: user.username,
        email: '',
        firstName: '',
        lastName: '',
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        createdAt: '',
        updatedAt: ''
      },
      permissions,
      sessionId || undefined
    );

    if (result.success) {
      return { success: true, data: result };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error transitioning workflow:', error);
    return { success: false, error: 'Failed to transition workflow status' };
  }
}

/**
 * Get available workflow actions for a case
 */
async function getAvailableActions(
  caseId: string
): Promise<IPCResponse<AvailableActionsResponse>> {
  try {
    const { user, permissions } = getCurrentAuthContext();
    if (!user) {
      return { success: true, data: { actions: [] } };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);

    // Get case details
    const caseDetails = workflowService.getCaseWorkflowDetails(caseId);
    if (!caseDetails) {
      return { success: false, error: 'Case not found' };
    }

    // Check if user is assignee or owner
    const assignment = workflowService.getCurrentAssignment(caseId);
    const isAssignee = assignment?.assignedTo === user.id;
    const isOwner = caseDetails.currentOwner === user.id;

    // Get available transitions
    const transitions = workflowService.getAvailableActions(
      caseDetails.workflowStatus,
      permissions,
      isAssignee,
      isOwner
    );

    return {
      success: true,
      data: {
        actions: transitions.map(t => ({
          action: t.to,
          label: t.label,
          toStatus: t.to,
          requiresComment: t.requiresComment,
          requiresSignature: t.requiresSignature,
          requiresAssignment: t.requiresAssignment
        }))
      }
    };
  } catch (error) {
    console.error('Error getting available actions:', error);
    return { success: true, data: { actions: [] } };
  }
}

/**
 * Assign case to user
 */
async function assignCase(
  request: AssignCaseRequest
): Promise<IPCResponse<CaseAssignment>> {
  try {
    const { user, permissions, sessionId } = getCurrentAuthContext();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check permission
    const hasPermission = permissions.includes('*') || permissions.includes('case.assign');
    if (!hasPermission) {
      return { success: false, error: 'Permission denied' };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);
    const auditService = new AuditService(db);

    workflowService.createAssignment(
      request.caseId,
      request.assignToUserId,
      user.id,
      request.dueDate,
      request.priority || 'normal',
      request.notes
    );

    // Log audit
    auditService.log({
      userId: user.id,
      username: user.username,
      sessionId: sessionId || undefined,
      actionType: 'case_assign',
      entityType: 'case',
      entityId: request.caseId,
      details: {
        assignedTo: request.assignToUserId,
        priority: request.priority,
        dueDate: request.dueDate
      }
    });

    const assignment = workflowService.getCurrentAssignment(request.caseId);
    if (!assignment) {
      return { success: false, error: 'Failed to create assignment' };
    }

    return { success: true, data: assignment };
  } catch (error) {
    console.error('Error assigning case:', error);
    return { success: false, error: 'Failed to assign case' };
  }
}

/**
 * Reassign case to different user
 */
async function reassignCase(
  request: ReassignCaseRequest
): Promise<IPCResponse<CaseAssignment>> {
  try {
    const { user, permissions, sessionId } = getCurrentAuthContext();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const hasPermission = permissions.includes('*') || permissions.includes('case.assign');
    if (!hasPermission) {
      return { success: false, error: 'Permission denied' };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);
    const auditService = new AuditService(db);

    // Get current assignment for audit
    const currentAssignment = workflowService.getCurrentAssignment(request.caseId);

    workflowService.createAssignment(
      request.caseId,
      request.newAssigneeId,
      user.id,
      undefined,
      'normal',
      request.reason
    );

    // Log audit
    auditService.log({
      userId: user.id,
      username: user.username,
      sessionId: sessionId || undefined,
      actionType: 'case_reassign',
      entityType: 'case',
      entityId: request.caseId,
      details: {
        previousAssignee: currentAssignment?.assignedTo,
        newAssignee: request.newAssigneeId,
        reason: request.reason
      }
    });

    const assignment = workflowService.getCurrentAssignment(request.caseId);
    if (!assignment) {
      return { success: false, error: 'Failed to reassign case' };
    }

    return { success: true, data: assignment };
  } catch (error) {
    console.error('Error reassigning case:', error);
    return { success: false, error: 'Failed to reassign case' };
  }
}

/**
 * Get assignment history for a case
 */
async function getCaseAssignments(
  caseId: string
): Promise<IPCResponse<CaseAssignment[]>> {
  try {
    const { user } = getCurrentAuthContext();
    if (!user) {
      return { success: true, data: [] };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);

    const assignments = workflowService.getAssignmentHistory(caseId);
    return { success: true, data: assignments };
  } catch (error) {
    console.error('Error getting case assignments:', error);
    return { success: true, data: [] };
  }
}

/**
 * Get cases assigned to current user
 */
async function getMyCases(): Promise<IPCResponse<MyCasesResponse>> {
  try {
    const { user } = getCurrentAuthContext();
    if (!user) {
      return {
        success: true,
        data: { cases: [], total: 0, overdue: 0, dueSoon: 0 }
      };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);

    const myCases = workflowService.getMyCases(user.id);

    // Calculate overdue and due soon counts
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    let overdue = 0;
    let dueSoon = 0;

    for (const c of myCases) {
      if (c.dueDate) {
        const dueDate = new Date(c.dueDate);
        if (dueDate < now) {
          overdue++;
        } else if (dueDate <= threeDaysFromNow) {
          dueSoon++;
        }
      }
    }

    return {
      success: true,
      data: {
        cases: myCases.map(c => ({
          id: c.caseId,
          status: 'Draft' as const, // This will be enriched with actual status
          createdAt: c.assignedAt,
          updatedAt: c.assignedAt,
          workflowStatus: c.workflowStatus,
          dueDate: c.dueDate,
          priority: c.priority
        })),
        total: myCases.length,
        overdue,
        dueSoon
      }
    };
  } catch (error) {
    console.error('Error getting my cases:', error);
    return {
      success: true,
      data: { cases: [], total: 0, overdue: 0, dueSoon: 0 }
    };
  }
}

/**
 * Get workload summary for all users (manager view)
 */
async function getWorkloadSummary(): Promise<IPCResponse<WorkloadSummary>> {
  try {
    const { user, permissions } = getCurrentAuthContext();
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Check permission
    const hasPermission = permissions.includes('*') ||
      permissions.includes('system.reports') ||
      permissions.includes('case.view.all');

    if (!hasPermission) {
      return { success: false, error: 'Permission denied' };
    }

    const db = getDatabase();

    // Get user workloads
    const rows = db.prepare(`
      SELECT
        u.id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(ca.id) as total_cases,
        SUM(CASE WHEN c.due_date < datetime('now') THEN 1 ELSE 0 END) as overdue_cases
      FROM users u
      LEFT JOIN case_assignments ca ON u.id = ca.assigned_to AND ca.is_current = 1
      LEFT JOIN cases c ON ca.case_id = c.id AND c.deleted_at IS NULL
      WHERE u.is_active = 1
      GROUP BY u.id
    `).all() as Array<{
      user_id: string;
      username: string;
      first_name: string | null;
      last_name: string | null;
      total_cases: number;
      overdue_cases: number;
    }>;

    // Get unassigned cases count
    const unassignedRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM cases c
      WHERE c.deleted_at IS NULL
        AND c.workflow_status IN ('Data Entry Complete', 'Medical Review Complete')
        AND NOT EXISTS (
          SELECT 1 FROM case_assignments ca
          WHERE ca.case_id = c.id AND ca.is_current = 1
        )
    `).get() as { count: number } | undefined;

    const users = rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      totalCases: row.total_cases,
      byStatus: {} as Record<WorkflowStatus, number>,
      byPriority: {} as Record<AssignmentPriority, number>,
      overdueCases: row.overdue_cases
    }));

    return {
      success: true,
      data: {
        users,
        unassignedCases: unassignedRow?.count || 0,
        totalOverdue: users.reduce((sum, u) => sum + u.overdueCases, 0)
      }
    };
  } catch (error) {
    console.error('Error getting workload summary:', error);
    return { success: false, error: 'Failed to get workload summary' };
  }
}

/**
 * Add comment to case
 */
async function addComment(
  request: AddCommentRequest
): Promise<IPCResponse<CaseComment>> {
  try {
    const { user, sessionId } = getCurrentAuthContext();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);
    const auditService = new AuditService(db);

    const comment = workflowService.addComment(request, user.id);
    if (!comment) {
      return { success: false, error: 'Failed to add comment' };
    }

    // Log audit
    auditService.log({
      userId: user.id,
      username: user.username,
      sessionId: sessionId || undefined,
      actionType: 'comment_add',
      entityType: 'case',
      entityId: request.caseId,
      details: { commentType: request.commentType }
    });

    return { success: true, data: comment };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error: 'Failed to add comment' };
  }
}

/**
 * Get comments for a case
 */
async function getComments(
  caseId: string
): Promise<IPCResponse<CaseComment[]>> {
  try {
    const { user } = getCurrentAuthContext();
    if (!user) {
      return { success: true, data: [] };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);

    const comments = workflowService.getComments(caseId);
    return { success: true, data: comments };
  } catch (error) {
    console.error('Error getting comments:', error);
    return { success: true, data: [] };
  }
}

/**
 * Add note to case
 */
async function addNote(
  request: AddNoteRequest
): Promise<IPCResponse<CaseNote>> {
  try {
    const { user, sessionId } = getCurrentAuthContext();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);
    const auditService = new AuditService(db);

    const note = workflowService.addNote(request, user.id);
    if (!note) {
      return { success: false, error: 'Failed to add note' };
    }

    // Log audit
    auditService.log({
      userId: user.id,
      username: user.username,
      sessionId: sessionId || undefined,
      actionType: 'note_add',
      entityType: 'case',
      entityId: request.caseId,
      details: { visibility: request.visibility }
    });

    return { success: true, data: note };
  } catch (error) {
    console.error('Error adding note:', error);
    return { success: false, error: 'Failed to add note' };
  }
}

/**
 * Get notes for a case
 */
async function getNotes(
  caseId: string
): Promise<IPCResponse<CaseNote[]>> {
  try {
    const { user } = getCurrentAuthContext();
    if (!user) {
      return { success: true, data: [] };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);

    const notes = workflowService.getNotes(caseId, user.id);
    return { success: true, data: notes };
  } catch (error) {
    console.error('Error getting notes:', error);
    return { success: true, data: [] };
  }
}

/**
 * Resolve a note
 */
async function resolveNote(
  noteId: number
): Promise<IPCResponse<CaseNote>> {
  try {
    const { user, sessionId } = getCurrentAuthContext();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const db = getDatabase();
    const auditService = new AuditService(db);

    // Check if notes table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='case_notes'
    `).get();

    if (!tableExists) {
      return { success: false, error: 'Notes feature not available' };
    }

    // Update the note
    const result = db.prepare(`
      UPDATE case_notes
      SET resolved_at = datetime('now'), resolved_by = ?
      WHERE id = ?
    `).run(user.id, noteId);

    if (result.changes === 0) {
      return { success: false, error: 'Note not found' };
    }

    // Fetch updated note
    const row = db.prepare(`
      SELECT * FROM case_notes WHERE id = ?
    `).get(noteId) as {
      id: number;
      case_id: string;
      user_id: string;
      visibility: string;
      content: string;
      created_at: string;
      resolved_at: string | null;
      resolved_by: string | null;
    };

    // Log audit
    auditService.log({
      userId: user.id,
      username: user.username,
      sessionId: sessionId || undefined,
      actionType: 'note_resolve',
      entityType: 'case',
      entityId: row.case_id,
      details: { noteId }
    });

    return {
      success: true,
      data: {
        id: row.id,
        caseId: row.case_id,
        userId: row.user_id,
        visibility: row.visibility as 'personal' | 'team',
        content: row.content,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at || undefined,
        resolvedBy: row.resolved_by || undefined
      }
    };
  } catch (error) {
    console.error('Error resolving note:', error);
    return { success: false, error: 'Failed to resolve note' };
  }
}

/**
 * Get case history (workflow transitions and activities)
 */
async function getCaseHistory(
  caseId: string
): Promise<IPCResponse<CaseHistoryEntry[]>> {
  try {
    const { user } = getCurrentAuthContext();
    if (!user) {
      return { success: true, data: [] };
    }

    const db = getDatabase();
    const workflowService = new WorkflowService(db);

    const history = workflowService.getCaseHistory(caseId);
    return { success: true, data: history };
  } catch (error) {
    console.error('Error getting case history:', error);
    return { success: true, data: [] };
  }
}

/**
 * Register workflow IPC handlers
 */
export function registerWorkflowHandlers(): void {
  // Workflow transitions
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_TRANSITION, async (_event, request: WorkflowTransitionRequest) => {
    return transitionWorkflow(request);
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW_GET_AVAILABLE_ACTIONS, async (_event, caseId: string) => {
    return getAvailableActions(caseId);
  });

  // Case assignments
  ipcMain.handle(IPC_CHANNELS.CASE_ASSIGN, async (_event, request: AssignCaseRequest) => {
    return assignCase(request);
  });

  ipcMain.handle(IPC_CHANNELS.CASE_REASSIGN, async (_event, request: ReassignCaseRequest) => {
    return reassignCase(request);
  });

  ipcMain.handle(IPC_CHANNELS.CASE_GET_ASSIGNMENTS, async (_event, caseId: string) => {
    return getCaseAssignments(caseId);
  });

  ipcMain.handle(IPC_CHANNELS.CASE_GET_MY_CASES, async () => {
    return getMyCases();
  });

  ipcMain.handle(IPC_CHANNELS.WORKLOAD_GET_SUMMARY, async () => {
    return getWorkloadSummary();
  });

  // Comments
  ipcMain.handle(IPC_CHANNELS.COMMENT_ADD, async (_event, request: AddCommentRequest) => {
    return addComment(request);
  });

  ipcMain.handle(IPC_CHANNELS.COMMENT_LIST, async (_event, caseId: string) => {
    return getComments(caseId);
  });

  // Notes
  ipcMain.handle(IPC_CHANNELS.NOTE_ADD, async (_event, request: AddNoteRequest) => {
    return addNote(request);
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_LIST, async (_event, caseId: string) => {
    return getNotes(caseId);
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_RESOLVE, async (_event, noteId: number) => {
    return resolveNote(noteId);
  });

  // Case history
  ipcMain.handle(IPC_CHANNELS.AUDIT_GET_CASE_HISTORY, async (_event, caseId: string) => {
    return getCaseHistory(caseId);
  });

  console.log('Workflow handlers registered');
}
