/**
 * Submission Store - Zustand state management for submission tracking (Phase 2)
 */

import { create } from 'zustand';
import type {
  SubmissionRecord,
  SubmissionHistoryEntry,
  DashboardStats
} from '../../shared/types/case.types';
import type {
  RecordSubmissionRequest,
  RecordAcknowledgmentRequest
} from '../../shared/types/ipc.types';

interface SubmissionState {
  // Current case submission data
  currentSubmission: SubmissionRecord | null;
  submissionHistory: SubmissionHistoryEntry[];
  isLoadingSubmission: boolean;

  // Dashboard
  dashboardStats: DashboardStats | null;
  isLoadingDashboard: boolean;

  // Dialog states
  showRecordSubmissionDialog: boolean;
  showRecordAcknowledgmentDialog: boolean;
  dialogCaseId: string | null;

  // Actions
  fetchSubmissionHistory: (caseId: string) => Promise<void>;
  fetchSubmissionRecord: (caseId: string) => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  recordSubmission: (data: RecordSubmissionRequest) => Promise<boolean>;
  recordAcknowledgment: (data: RecordAcknowledgmentRequest) => Promise<boolean>;
  markCaseReady: (caseId: string) => Promise<{ success: boolean; error?: string }>;
  revertCaseToDraft: (caseId: string, reason?: string) => Promise<boolean>;
  openRecordSubmissionDialog: (caseId: string) => void;
  openRecordAcknowledgmentDialog: (caseId: string) => void;
  closeDialogs: () => void;
  clearSubmissionData: () => void;
}

export const useSubmissionStore = create<SubmissionState>((set, get) => ({
  // Initial state
  currentSubmission: null,
  submissionHistory: [],
  isLoadingSubmission: false,
  dashboardStats: null,
  isLoadingDashboard: false,
  showRecordSubmissionDialog: false,
  showRecordAcknowledgmentDialog: false,
  dialogCaseId: null,

  // Actions
  fetchSubmissionHistory: async (caseId: string) => {
    set({ isLoadingSubmission: true });
    try {
      const response = await window.electronAPI.getSubmissionHistory(caseId);
      if (response.success && response.data) {
        set({ submissionHistory: response.data, isLoadingSubmission: false });
      } else {
        set({ isLoadingSubmission: false });
      }
    } catch (error) {
      console.error('Error fetching submission history:', error);
      set({ isLoadingSubmission: false });
    }
  },

  fetchSubmissionRecord: async (caseId: string) => {
    try {
      const response = await window.electronAPI.getSubmissionRecord(caseId);
      if (response.success) {
        set({ currentSubmission: response.data || null });
      }
    } catch (error) {
      console.error('Error fetching submission record:', error);
    }
  },

  fetchDashboardStats: async () => {
    set({ isLoadingDashboard: true });
    try {
      const response = await window.electronAPI.getDashboardStats();
      if (response.success && response.data) {
        set({ dashboardStats: response.data, isLoadingDashboard: false });
      } else {
        set({ isLoadingDashboard: false });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      set({ isLoadingDashboard: false });
    }
  },

  recordSubmission: async (data: RecordSubmissionRequest) => {
    try {
      const response = await window.electronAPI.recordSubmission(data);
      if (response.success) {
        // Refresh dashboard stats
        get().fetchDashboardStats();
        // Refresh history for the case
        get().fetchSubmissionHistory(data.caseId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error recording submission:', error);
      return false;
    }
  },

  recordAcknowledgment: async (data: RecordAcknowledgmentRequest) => {
    try {
      const response = await window.electronAPI.recordAcknowledgment(data);
      if (response.success) {
        // Refresh dashboard stats
        get().fetchDashboardStats();
        // Refresh history for the case
        get().fetchSubmissionHistory(data.caseId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error recording acknowledgment:', error);
      return false;
    }
  },

  markCaseReady: async (caseId: string) => {
    try {
      const response = await window.electronAPI.markCaseReady(caseId);
      if (response.success) {
        // Refresh dashboard stats
        get().fetchDashboardStats();
        return { success: true };
      }
      return {
        success: false,
        error: response.error || 'Failed to mark case ready'
      };
    } catch (error) {
      console.error('Error marking case ready:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  revertCaseToDraft: async (caseId: string, reason?: string) => {
    try {
      const response = await window.electronAPI.revertCaseToDraft(caseId, reason);
      if (response.success) {
        // Refresh dashboard stats
        get().fetchDashboardStats();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error reverting to draft:', error);
      return false;
    }
  },

  openRecordSubmissionDialog: (caseId: string) => {
    set({ showRecordSubmissionDialog: true, dialogCaseId: caseId });
  },

  openRecordAcknowledgmentDialog: (caseId: string) => {
    set({ showRecordAcknowledgmentDialog: true, dialogCaseId: caseId });
  },

  closeDialogs: () => {
    set({
      showRecordSubmissionDialog: false,
      showRecordAcknowledgmentDialog: false,
      dialogCaseId: null
    });
  },

  clearSubmissionData: () => {
    set({
      currentSubmission: null,
      submissionHistory: []
    });
  }
}));

// Selector hooks for common use cases
export const useSubmissionHistory = () =>
  useSubmissionStore((state) => ({
    history: state.submissionHistory,
    loading: state.isLoadingSubmission,
    fetch: state.fetchSubmissionHistory
  }));

export const useDashboard = () =>
  useSubmissionStore((state) => ({
    stats: state.dashboardStats,
    loading: state.isLoadingDashboard,
    fetch: state.fetchDashboardStats
  }));

export const useSubmissionDialogs = () =>
  useSubmissionStore((state) => ({
    showSubmission: state.showRecordSubmissionDialog,
    showAcknowledgment: state.showRecordAcknowledgmentDialog,
    caseId: state.dialogCaseId,
    openSubmission: state.openRecordSubmissionDialog,
    openAcknowledgment: state.openRecordAcknowledgmentDialog,
    close: state.closeDialogs
  }));
