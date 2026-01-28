/**
 * Workflow Store - Zustand state management for workflow and case assignment
 * Phase 3: Multi-User & Workflow Management
 */

import { create } from 'zustand';
import type {
  WorkflowStatus,
  WorkflowTransitionRequest,
  CaseAssignment,
  AssignCaseRequest,
  ReassignCaseRequest,
  CaseComment,
  AddCommentRequest,
  CaseNote,
  AddNoteRequest,
  WorkloadSummary,
  CaseHistoryEntry
} from '../../shared/types/workflow.types';
import type { CaseListItem, CaseFilterOptions } from '../../shared/types/case.types';

interface AvailableAction {
  action: string;
  label: string;
  toStatus?: WorkflowStatus;
  requiresComment?: boolean;
  requiresSignature?: boolean;
  requiresAssignment?: boolean;
}

interface WorkflowState {
  // My Cases state
  myCases: CaseListItem[];
  myCasesTotal: number;
  myCasesOverdue: number;
  myCasesDueSoon: number;
  isMyCasesLoading: boolean;

  // Available actions for current case
  availableActions: AvailableAction[];
  isActionsLoading: boolean;

  // Assignment state
  currentAssignments: CaseAssignment[];
  isAssignmentLoading: boolean;

  // Comments and notes
  comments: CaseComment[];
  notes: CaseNote[];
  isCommentsLoading: boolean;
  isNotesLoading: boolean;

  // Case history
  caseHistory: CaseHistoryEntry[];
  isHistoryLoading: boolean;

  // Workload summary (manager view)
  workloadSummary: WorkloadSummary | null;
  isWorkloadLoading: boolean;

  // General state
  error: string | null;
  isTransitioning: boolean;

  // Actions
  fetchMyCases: (filter?: CaseFilterOptions) => Promise<void>;
  fetchAvailableActions: (caseId: string) => Promise<void>;
  transitionWorkflow: (request: WorkflowTransitionRequest) => Promise<{ success: boolean; error?: string }>;
  assignCase: (request: AssignCaseRequest) => Promise<{ success: boolean; error?: string }>;
  reassignCase: (request: ReassignCaseRequest) => Promise<{ success: boolean; error?: string }>;
  fetchAssignments: (caseId: string) => Promise<void>;
  fetchComments: (caseId: string) => Promise<void>;
  addComment: (request: AddCommentRequest) => Promise<{ success: boolean; error?: string }>;
  fetchNotes: (caseId: string) => Promise<void>;
  addNote: (request: AddNoteRequest) => Promise<{ success: boolean; error?: string }>;
  resolveNote: (noteId: number) => Promise<{ success: boolean; error?: string }>;
  fetchCaseHistory: (caseId: string) => Promise<void>;
  fetchWorkloadSummary: () => Promise<void>;
  clearError: () => void;
  clearCurrentCase: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  myCases: [],
  myCasesTotal: 0,
  myCasesOverdue: 0,
  myCasesDueSoon: 0,
  isMyCasesLoading: false,

  availableActions: [],
  isActionsLoading: false,

  currentAssignments: [],
  isAssignmentLoading: false,

  comments: [],
  notes: [],
  isCommentsLoading: false,
  isNotesLoading: false,

  caseHistory: [],
  isHistoryLoading: false,

  workloadSummary: null,
  isWorkloadLoading: false,

  error: null,
  isTransitioning: false,

  // Actions
  fetchMyCases: async (filter?: CaseFilterOptions) => {
    set({ isMyCasesLoading: true, error: null });

    try {
      const response = await window.electronAPI.getMyCases(filter);

      if (response.success && response.data) {
        set({
          myCases: response.data.cases,
          myCasesTotal: response.data.total,
          myCasesOverdue: response.data.overdue,
          myCasesDueSoon: response.data.dueSoon,
          isMyCasesLoading: false
        });
      } else {
        set({
          isMyCasesLoading: false,
          error: response.error || 'Failed to fetch cases'
        });
      }
    } catch (error) {
      set({
        isMyCasesLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cases'
      });
    }
  },

  fetchAvailableActions: async (caseId: string) => {
    set({ isActionsLoading: true });

    try {
      const response = await window.electronAPI.getAvailableActions(caseId);

      if (response.success && response.data) {
        set({
          availableActions: response.data.actions,
          isActionsLoading: false
        });
      } else {
        set({
          availableActions: [],
          isActionsLoading: false
        });
      }
    } catch {
      set({
        availableActions: [],
        isActionsLoading: false
      });
    }
  },

  transitionWorkflow: async (request: WorkflowTransitionRequest) => {
    set({ isTransitioning: true, error: null });

    try {
      const response = await window.electronAPI.transitionWorkflow(request);

      if (response.success && response.data?.success) {
        set({ isTransitioning: false });
        // Refresh available actions for the case
        get().fetchAvailableActions(request.caseId);
        return { success: true };
      } else {
        const errorMsg = response.data?.error || response.error || 'Workflow transition failed';
        set({
          isTransitioning: false,
          error: errorMsg
        });
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Workflow transition failed';
      set({ isTransitioning: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  assignCase: async (request: AssignCaseRequest) => {
    set({ isAssignmentLoading: true, error: null });

    try {
      const response = await window.electronAPI.assignCase(request);

      if (response.success) {
        set({ isAssignmentLoading: false });
        // Refresh assignments
        get().fetchAssignments(request.caseId);
        return { success: true };
      } else {
        set({
          isAssignmentLoading: false,
          error: response.error || 'Failed to assign case'
        });
        return { success: false, error: response.error || 'Failed to assign case' };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to assign case';
      set({ isAssignmentLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  reassignCase: async (request: ReassignCaseRequest) => {
    set({ isAssignmentLoading: true, error: null });

    try {
      const response = await window.electronAPI.reassignCase(request);

      if (response.success) {
        set({ isAssignmentLoading: false });
        // Refresh assignments
        get().fetchAssignments(request.caseId);
        return { success: true };
      } else {
        set({
          isAssignmentLoading: false,
          error: response.error || 'Failed to reassign case'
        });
        return { success: false, error: response.error || 'Failed to reassign case' };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to reassign case';
      set({ isAssignmentLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  fetchAssignments: async (caseId: string) => {
    set({ isAssignmentLoading: true });

    try {
      const response = await window.electronAPI.getCaseAssignments(caseId);

      if (response.success && response.data) {
        set({
          currentAssignments: response.data,
          isAssignmentLoading: false
        });
      } else {
        set({
          currentAssignments: [],
          isAssignmentLoading: false
        });
      }
    } catch {
      set({
        currentAssignments: [],
        isAssignmentLoading: false
      });
    }
  },

  fetchComments: async (caseId: string) => {
    set({ isCommentsLoading: true });

    try {
      const response = await window.electronAPI.getComments(caseId);

      if (response.success && response.data) {
        set({
          comments: response.data,
          isCommentsLoading: false
        });
      } else {
        set({
          comments: [],
          isCommentsLoading: false
        });
      }
    } catch {
      set({
        comments: [],
        isCommentsLoading: false
      });
    }
  },

  addComment: async (request: AddCommentRequest) => {
    try {
      const response = await window.electronAPI.addComment(request);

      if (response.success) {
        // Refresh comments
        get().fetchComments(request.caseId);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Failed to add comment' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to add comment' };
    }
  },

  fetchNotes: async (caseId: string) => {
    set({ isNotesLoading: true });

    try {
      const response = await window.electronAPI.getNotes(caseId);

      if (response.success && response.data) {
        set({
          notes: response.data,
          isNotesLoading: false
        });
      } else {
        set({
          notes: [],
          isNotesLoading: false
        });
      }
    } catch {
      set({
        notes: [],
        isNotesLoading: false
      });
    }
  },

  addNote: async (request: AddNoteRequest) => {
    try {
      const response = await window.electronAPI.addNote(request);

      if (response.success) {
        // Refresh notes
        get().fetchNotes(request.caseId);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Failed to add note' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to add note' };
    }
  },

  resolveNote: async (noteId: number) => {
    try {
      const response = await window.electronAPI.resolveNote(noteId);

      if (response.success && response.data) {
        // Update note in list
        const notes = get().notes.map((n) =>
          n.id === noteId ? response.data! : n
        );
        set({ notes });
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Failed to resolve note' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to resolve note' };
    }
  },

  fetchCaseHistory: async (caseId: string) => {
    set({ isHistoryLoading: true });

    try {
      const response = await window.electronAPI.getCaseAuditHistory(caseId);

      if (response.success && response.data) {
        set({
          caseHistory: response.data,
          isHistoryLoading: false
        });
      } else {
        set({
          caseHistory: [],
          isHistoryLoading: false
        });
      }
    } catch {
      set({
        caseHistory: [],
        isHistoryLoading: false
      });
    }
  },

  fetchWorkloadSummary: async () => {
    set({ isWorkloadLoading: true });

    try {
      const response = await window.electronAPI.getWorkloadSummary();

      if (response.success && response.data) {
        set({
          workloadSummary: response.data,
          isWorkloadLoading: false
        });
      } else {
        set({
          workloadSummary: null,
          isWorkloadLoading: false
        });
      }
    } catch {
      set({
        workloadSummary: null,
        isWorkloadLoading: false
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  clearCurrentCase: () => {
    set({
      availableActions: [],
      currentAssignments: [],
      comments: [],
      notes: [],
      caseHistory: []
    });
  }
}));

// Selector hooks for cleaner component access
export const useMyCases = () =>
  useWorkflowStore((state) => ({
    cases: state.myCases,
    total: state.myCasesTotal,
    overdue: state.myCasesOverdue,
    dueSoon: state.myCasesDueSoon,
    isLoading: state.isMyCasesLoading
  }));

export const useAvailableActions = () =>
  useWorkflowStore((state) => ({
    actions: state.availableActions,
    isLoading: state.isActionsLoading
  }));

export const useWorkflowActions = () =>
  useWorkflowStore((state) => ({
    fetchMyCases: state.fetchMyCases,
    fetchAvailableActions: state.fetchAvailableActions,
    transitionWorkflow: state.transitionWorkflow,
    assignCase: state.assignCase,
    reassignCase: state.reassignCase,
    fetchAssignments: state.fetchAssignments,
    clearError: state.clearError,
    clearCurrentCase: state.clearCurrentCase
  }));

export const useComments = () =>
  useWorkflowStore((state) => ({
    comments: state.comments,
    isLoading: state.isCommentsLoading,
    fetchComments: state.fetchComments,
    addComment: state.addComment
  }));

export const useNotes = () =>
  useWorkflowStore((state) => ({
    notes: state.notes,
    isLoading: state.isNotesLoading,
    fetchNotes: state.fetchNotes,
    addNote: state.addNote,
    resolveNote: state.resolveNote
  }));

export const useCaseHistory = () =>
  useWorkflowStore((state) => ({
    history: state.caseHistory,
    isLoading: state.isHistoryLoading,
    fetchHistory: state.fetchCaseHistory
  }));

export const useWorkloadSummary = () =>
  useWorkflowStore((state) => ({
    summary: state.workloadSummary,
    isLoading: state.isWorkloadLoading,
    fetch: state.fetchWorkloadSummary
  }));
