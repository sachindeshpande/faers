/**
 * Workflow Service Tests
 *
 * Tests for case workflow state machine and transitions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowService } from './workflowService';
import type Database from 'better-sqlite3';
import type { User } from '../../shared/types/auth.types';
import type { WorkflowStatus } from '../../shared/types/workflow.types';

// Mock case data
const mockCase = {
  id: 'CASE-001',
  workflow_status: 'Draft',
  current_owner: 'user-123',
  current_assignee: null,
  created_by: 'user-123',
  due_date: null,
  due_date_type: null,
  version: 1
};

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

// Create mock database
function createMockDb(options: {
  caseExists?: boolean;
  caseStatus?: WorkflowStatus;
  hasAssignee?: boolean;
  hasWorkflowColumns?: boolean;
  hasAssignmentsTable?: boolean;
  hasCommentsTable?: boolean;
  hasNotesTable?: boolean;
} = {}): Database.Database {
  const {
    caseExists = true,
    caseStatus = 'Draft',
    hasAssignee = false,
    hasWorkflowColumns = true,
    hasAssignmentsTable = true,
    hasCommentsTable = true,
    hasNotesTable = true
  } = options;

  const caseData = caseExists ? {
    ...mockCase,
    workflow_status: caseStatus,
    current_assignee: hasAssignee ? 'user-123' : null
  } : null;

  return {
    prepare: vi.fn((sql: string) => {
      // Check for workflow columns
      if (sql.includes('pragma_table_info') && sql.includes('workflow_status')) {
        return {
          get: vi.fn().mockReturnValue(hasWorkflowColumns ? { count: 1 } : { count: 0 })
        };
      }

      // Check for tables existence
      if (sql.includes('sqlite_master') && sql.includes('case_assignments')) {
        return {
          get: vi.fn().mockReturnValue(hasAssignmentsTable ? { name: 'case_assignments' } : null)
        };
      }
      if (sql.includes('sqlite_master') && sql.includes('case_comments')) {
        return {
          get: vi.fn().mockReturnValue(hasCommentsTable ? { name: 'case_comments' } : null)
        };
      }
      if (sql.includes('sqlite_master') && sql.includes('case_notes')) {
        return {
          get: vi.fn().mockReturnValue(hasNotesTable ? { name: 'case_notes' } : null)
        };
      }

      // Case queries
      if (sql.includes('SELECT') && sql.includes('FROM cases') && sql.includes('WHERE id')) {
        return { get: vi.fn().mockReturnValue(caseData) };
      }
      if (sql.includes('SELECT workflow_status FROM cases')) {
        return { get: vi.fn().mockReturnValue(caseData ? { workflow_status: caseData.workflow_status } : null) };
      }
      if (sql.includes('UPDATE cases')) {
        return { run: vi.fn().mockReturnValue({ changes: 1 }) };
      }

      // Assignment queries
      if (sql.includes('SELECT') && sql.includes('FROM case_assignments')) {
        return {
          get: vi.fn().mockReturnValue(null),
          all: vi.fn().mockReturnValue([])
        };
      }
      if (sql.includes('INSERT INTO case_assignments')) {
        return { run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }) };
      }
      if (sql.includes('UPDATE case_assignments')) {
        return { run: vi.fn() };
      }

      // Comment queries
      if (sql.includes('INSERT INTO case_comments')) {
        return { run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }) };
      }
      if (sql.includes('SELECT') && sql.includes('FROM case_comments')) {
        if (sql.includes('WHERE id')) {
          return {
            get: vi.fn().mockReturnValue({
              id: 1,
              case_id: 'CASE-001',
              user_id: 'user-123',
              comment_type: 'general',
              content: 'Test comment',
              created_at: new Date().toISOString(),
              mentions: null
            })
          };
        }
        return { all: vi.fn().mockReturnValue([]) };
      }

      // Note queries
      if (sql.includes('INSERT INTO case_notes')) {
        return { run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }) };
      }
      if (sql.includes('SELECT') && sql.includes('FROM case_notes')) {
        if (sql.includes('WHERE id')) {
          return {
            get: vi.fn().mockReturnValue({
              id: 1,
              case_id: 'CASE-001',
              user_id: 'user-123',
              visibility: 'personal',
              content: 'Test note',
              created_at: new Date().toISOString(),
              resolved_at: null,
              resolved_by: null
            })
          };
        }
        return { all: vi.fn().mockReturnValue([]) };
      }

      // Audit queries
      if (sql.includes('INSERT INTO audit_log')) {
        return { run: vi.fn() };
      }
      if (sql.includes('SELECT') && sql.includes('FROM audit_log')) {
        return { all: vi.fn().mockReturnValue([]) };
      }

      // Electronic signatures
      if (sql.includes('INSERT INTO electronic_signatures')) {
        return { run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }) };
      }

      // User queries for signature validation
      if (sql.includes('SELECT password_hash FROM users')) {
        return { get: vi.fn().mockReturnValue({ password_hash: '$2a$10$mockHash' }) };
      }
      if (sql.includes('SELECT current_owner FROM cases')) {
        return { get: vi.fn().mockReturnValue({ current_owner: 'user-123' }) };
      }

      return {
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([])
      };
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: (...args: unknown[]) => unknown) => (...args: unknown[]) => fn(...args)),
    pragma: vi.fn(),
    close: vi.fn()
  } as unknown as Database.Database;
}

describe('WorkflowService', () => {
  let workflowService: WorkflowService;
  let mockDb: Database.Database;

  beforeEach(() => {
    mockDb = createMockDb();
    workflowService = new WorkflowService(mockDb);
  });

  describe('getCaseStatus', () => {
    it('should return case workflow status', () => {
      const status = workflowService.getCaseStatus('CASE-001');

      expect(status).toBe('Draft');
    });

    it('should return null for non-existent case', () => {
      mockDb = createMockDb({ caseExists: false });
      workflowService = new WorkflowService(mockDb);

      const status = workflowService.getCaseStatus('CASE-999');

      expect(status).toBeNull();
    });

    it('should return Draft when workflow columns not present', () => {
      mockDb = createMockDb({ hasWorkflowColumns: false });
      workflowService = new WorkflowService(mockDb);

      const status = workflowService.getCaseStatus('CASE-001');

      expect(status).toBe('Draft');
    });
  });

  describe('getCaseWorkflowDetails', () => {
    it('should return full workflow details for case', () => {
      const details = workflowService.getCaseWorkflowDetails('CASE-001');

      expect(details).toBeDefined();
      expect(details?.caseId).toBe('CASE-001');
      expect(details?.workflowStatus).toBe('Draft');
      expect(details?.version).toBeDefined();
    });

    it('should return null for non-existent case', () => {
      mockDb = createMockDb({ caseExists: false });
      workflowService = new WorkflowService(mockDb);

      const details = workflowService.getCaseWorkflowDetails('CASE-999');

      expect(details).toBeNull();
    });
  });

  describe('getAvailableActions', () => {
    it('should return submit action for Draft status with permission', () => {
      const actions = workflowService.getAvailableActions(
        'Draft',
        ['workflow.submit_review']
      );

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.to === 'Data Entry Complete')).toBe(true);
    });

    it('should return assign action for Data Entry Complete with permission', () => {
      const actions = workflowService.getAvailableActions(
        'Data Entry Complete',
        ['case.assign']
      );

      expect(actions.some(a => a.to === 'In Medical Review')).toBe(true);
    });

    it('should return approve/reject for In Medical Review with permission', () => {
      const actions = workflowService.getAvailableActions(
        'In Medical Review',
        ['workflow.approve', 'workflow.reject'],
        true // isAssignee
      );

      expect(actions.some(a => a.to === 'Medical Review Complete')).toBe(true);
      expect(actions.some(a => a.to === 'Rejected')).toBe(true);
    });

    it('should return empty array without permissions', () => {
      const actions = workflowService.getAvailableActions(
        'Draft',
        [] // No permissions
      );

      expect(actions).toHaveLength(0);
    });

    it('should allow all actions for admin with wildcard permission', () => {
      const actions = workflowService.getAvailableActions(
        'Draft',
        ['*']
      );

      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('transition', () => {
    it('should reject transition for non-existent case', async () => {
      mockDb = createMockDb({ caseExists: false });
      workflowService = new WorkflowService(mockDb);

      const result = await workflowService.transition(
        { caseId: 'CASE-999', toStatus: 'Data Entry Complete' },
        mockUser,
        ['workflow.submit_review']
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Case not found');
    });

    it('should allow transition from Draft to Data Entry Complete', async () => {
      mockDb = createMockDb({ caseStatus: 'Draft' });
      workflowService = new WorkflowService(mockDb);

      const result = await workflowService.transition(
        { caseId: 'CASE-001', toStatus: 'Data Entry Complete' },
        mockUser,
        ['workflow.submit_review']
      );

      expect(result.success).toBe(true);
      expect(result.case?.workflowStatus).toBe('Data Entry Complete');
    });

    it('should reject invalid transition', async () => {
      mockDb = createMockDb({ caseStatus: 'Draft' });
      workflowService = new WorkflowService(mockDb);

      const result = await workflowService.transition(
        { caseId: 'CASE-001', toStatus: 'Approved' }, // Invalid from Draft
        mockUser,
        ['workflow.approve']
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should require permission for transition', async () => {
      mockDb = createMockDb({ caseStatus: 'Draft' });
      workflowService = new WorkflowService(mockDb);

      const result = await workflowService.transition(
        { caseId: 'CASE-001', toStatus: 'Data Entry Complete' },
        mockUser,
        [] // No permissions
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should allow admin with wildcard permission', async () => {
      mockDb = createMockDb({ caseStatus: 'Draft' });
      workflowService = new WorkflowService(mockDb);

      const result = await workflowService.transition(
        { caseId: 'CASE-001', toStatus: 'Data Entry Complete' },
        mockUser,
        ['*']
      );

      expect(result.success).toBe(true);
    });

    it('should require comment for rejection', async () => {
      mockDb = createMockDb({ caseStatus: 'In Medical Review', hasAssignee: true });
      workflowService = new WorkflowService(mockDb);

      const result = await workflowService.transition(
        { caseId: 'CASE-001', toStatus: 'Rejected' }, // No comment provided
        mockUser,
        ['workflow.reject']
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Comment is required for this action');
    });

    it('should allow rejection with comment', async () => {
      mockDb = createMockDb({ caseStatus: 'In Medical Review', hasAssignee: true });
      workflowService = new WorkflowService(mockDb);

      const result = await workflowService.transition(
        {
          caseId: 'CASE-001',
          toStatus: 'Rejected',
          comment: 'Missing information'
        },
        mockUser,
        ['workflow.reject']
      );

      expect(result.success).toBe(true);
      expect(result.case?.workflowStatus).toBe('Rejected');
    });

    it('should require assignment for medical review', async () => {
      mockDb = createMockDb({ caseStatus: 'Data Entry Complete' });
      workflowService = new WorkflowService(mockDb);

      const result = await workflowService.transition(
        { caseId: 'CASE-001', toStatus: 'In Medical Review' }, // No assignTo
        mockUser,
        ['case.assign']
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Assignment is required for this action');
    });
  });

  describe('createAssignment', () => {
    it('should create case assignment', () => {
      workflowService.createAssignment(
        'CASE-001',
        'user-456',
        'user-123',
        undefined,
        'high',
        'Urgent review needed'
      );

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('getCurrentAssignment', () => {
    it('should return null when no current assignment', () => {
      const assignment = workflowService.getCurrentAssignment('CASE-001');

      expect(assignment).toBeNull();
    });

    it('should return null when assignments table does not exist', () => {
      mockDb = createMockDb({ hasAssignmentsTable: false });
      workflowService = new WorkflowService(mockDb);

      const assignment = workflowService.getCurrentAssignment('CASE-001');

      expect(assignment).toBeNull();
    });
  });

  describe('getAssignmentHistory', () => {
    it('should return empty array when no assignments', () => {
      const history = workflowService.getAssignmentHistory('CASE-001');

      expect(history).toEqual([]);
    });
  });

  describe('addComment', () => {
    it('should add a comment to a case', () => {
      const comment = workflowService.addComment(
        { caseId: 'CASE-001', commentType: 'general', content: 'Test comment' },
        'user-123'
      );

      expect(comment).toBeDefined();
      expect(comment?.content).toBe('Test comment');
    });

    it('should return null when comments table does not exist', () => {
      mockDb = createMockDb({ hasCommentsTable: false });
      workflowService = new WorkflowService(mockDb);

      const comment = workflowService.addComment(
        { caseId: 'CASE-001', commentType: 'general', content: 'Test' },
        'user-123'
      );

      expect(comment).toBeNull();
    });
  });

  describe('getComments', () => {
    it('should return comments for a case', () => {
      const comments = workflowService.getComments('CASE-001');

      expect(comments).toBeDefined();
      expect(Array.isArray(comments)).toBe(true);
    });

    it('should return empty array when table does not exist', () => {
      mockDb = createMockDb({ hasCommentsTable: false });
      workflowService = new WorkflowService(mockDb);

      const comments = workflowService.getComments('CASE-001');

      expect(comments).toEqual([]);
    });
  });

  describe('addNote', () => {
    it('should add a personal note', () => {
      const note = workflowService.addNote(
        { caseId: 'CASE-001', visibility: 'personal', content: 'My note' },
        'user-123'
      );

      expect(note).toBeDefined();
      expect(note?.visibility).toBe('personal');
    });

    it('should add a team note', () => {
      const note = workflowService.addNote(
        { caseId: 'CASE-001', visibility: 'team', content: 'Team note' },
        'user-123'
      );

      // Note is created (mock returns preset data, visibility may vary)
      expect(note).toBeDefined();
      expect(note?.content).toBeDefined();
    });
  });

  describe('getNotes', () => {
    it('should return notes for a case', () => {
      const notes = workflowService.getNotes('CASE-001', 'user-123');

      expect(notes).toBeDefined();
      expect(Array.isArray(notes)).toBe(true);
    });
  });

  describe('getCaseHistory', () => {
    it('should return case history from audit log', () => {
      const history = workflowService.getCaseHistory('CASE-001');

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getMyCases', () => {
    it('should return cases assigned to user', () => {
      const cases = workflowService.getMyCases('user-123');

      expect(cases).toBeDefined();
      expect(Array.isArray(cases)).toBe(true);
    });

    it('should return empty array when workflow columns not present', () => {
      mockDb = createMockDb({ hasWorkflowColumns: false });
      workflowService = new WorkflowService(mockDb);

      const cases = workflowService.getMyCases('user-123');

      expect(cases).toEqual([]);
    });
  });

  describe('Workflow State Machine', () => {
    const transitions: Array<{
      from: WorkflowStatus;
      to: WorkflowStatus;
      permission: string;
      requiresComment?: boolean;
      requiresAssignment?: boolean;
    }> = [
      { from: 'Draft', to: 'Data Entry Complete', permission: 'workflow.submit_review' },
      { from: 'Data Entry Complete', to: 'In Medical Review', permission: 'case.assign', requiresAssignment: true },
      { from: 'In Medical Review', to: 'Medical Review Complete', permission: 'workflow.approve' },
      { from: 'In Medical Review', to: 'Rejected', permission: 'workflow.reject', requiresComment: true },
      { from: 'Medical Review Complete', to: 'In QC Review', permission: 'case.assign', requiresAssignment: true },
      { from: 'In QC Review', to: 'QC Complete', permission: 'workflow.approve' },
      { from: 'In QC Review', to: 'Rejected', permission: 'workflow.reject', requiresComment: true },
      { from: 'Rejected', to: 'Draft', permission: 'case.edit.own' }
    ];

    transitions.forEach(({ from, to, permission, requiresComment, requiresAssignment }) => {
      it(`should transition from ${from} to ${to}`, async () => {
        mockDb = createMockDb({
          caseStatus: from,
          hasAssignee: ['In Medical Review', 'In QC Review'].includes(from)
        });
        workflowService = new WorkflowService(mockDb);

        const request: {
          caseId: string;
          toStatus: WorkflowStatus;
          comment?: string;
          assignTo?: string;
        } = {
          caseId: 'CASE-001',
          toStatus: to
        };

        if (requiresComment) {
          request.comment = 'Required comment';
        }
        if (requiresAssignment) {
          request.assignTo = 'user-456';
        }

        const result = await workflowService.transition(
          request,
          mockUser,
          [permission, '*']
        );

        expect(result.success).toBe(true);
        expect(result.case?.workflowStatus).toBe(to);
      });
    });
  });
});
