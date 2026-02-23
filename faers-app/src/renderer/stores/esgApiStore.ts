/**
 * ESG API Store (Phase 2B)
 *
 * Zustand store for ESG API state management.
 */

import { create } from 'zustand';
import type {
  EsgApiSettings,
  TestConnectionResult,
  SubmitToFdaResult,
  CheckAcknowledgmentResult,
  PollingStatus,
  PreSubmissionSummary,
  ApiSubmissionAttempt,
  ApiSubmissionProgress,
  SaveEsgSettingsRequest
} from '../../shared/types/esgApi.types';
import { useSubmissionStore } from './submissionStore';
import { useCaseStore } from './caseStore';

interface EsgApiState {
  // Settings
  esgSettings: EsgApiSettings | null;
  isLoadingSettings: boolean;

  // Connection test
  isTestingConnection: boolean;
  connectionTestResult: TestConnectionResult | null;

  // Submission
  isSubmitting: boolean;
  submissionProgress: ApiSubmissionProgress | null;
  lastSubmitResult: SubmitToFdaResult | null;
  preSubmissionSummary: PreSubmissionSummary | null;

  // Dialogs
  showSubmitDialog: boolean;
  showProgressDialog: boolean;
  submitDialogCaseId: string | null;

  // Polling
  pollingStatus: PollingStatus | null;

  // Attempts
  submissionAttempts: ApiSubmissionAttempt[];

  // Actions
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: SaveEsgSettingsRequest) => Promise<boolean>;
  saveCredentials: (clientId: string, secretKey: string) => Promise<boolean>;
  clearCredentials: () => Promise<boolean>;
  testConnection: () => Promise<TestConnectionResult | null>;
  submitToFda: (caseId: string) => Promise<SubmitToFdaResult | null>;
  retrySubmission: (caseId: string) => Promise<SubmitToFdaResult | null>;
  checkAcknowledgment: (caseId: string) => Promise<CheckAcknowledgmentResult | null>;
  fetchSubmissionAttempts: (caseId: string) => Promise<void>;
  fetchPollingStatus: () => Promise<void>;
  startPolling: () => Promise<void>;
  stopPolling: () => Promise<void>;
  getPreSubmissionSummary: (caseId: string) => Promise<void>;
  openSubmitDialog: (caseId: string) => void;
  closeSubmitDialog: () => void;
  openProgressDialog: () => void;
  closeProgressDialog: () => void;
  setSubmissionProgress: (progress: ApiSubmissionProgress | null) => void;
}

export const useEsgApiStore = create<EsgApiState>((set, get) => ({
  // Initial state
  esgSettings: null,
  isLoadingSettings: false,
  isTestingConnection: false,
  connectionTestResult: null,
  isSubmitting: false,
  submissionProgress: null,
  lastSubmitResult: null,
  preSubmissionSummary: null,
  showSubmitDialog: false,
  showProgressDialog: false,
  submitDialogCaseId: null,
  pollingStatus: null,
  submissionAttempts: [],

  // Actions
  fetchSettings: async () => {
    set({ isLoadingSettings: true });
    try {
      const result = await window.electronAPI.esgGetSettings();
      if (result.success && result.data) {
        set({ esgSettings: result.data });
      }
    } finally {
      set({ isLoadingSettings: false });
    }
  },

  saveSettings: async (settings: SaveEsgSettingsRequest) => {
    const result = await window.electronAPI.esgSaveSettings(settings);
    if (result.success) {
      await get().fetchSettings();
    }
    return result.success;
  },

  saveCredentials: async (clientId: string, secretKey: string) => {
    const result = await window.electronAPI.esgSaveCredentials({ clientId, secretKey });
    if (result.success) {
      await get().fetchSettings();
    }
    return result.success;
  },

  clearCredentials: async () => {
    const result = await window.electronAPI.esgClearCredentials();
    if (result.success) {
      await get().fetchSettings();
      set({ connectionTestResult: null });
    }
    return result.success;
  },

  testConnection: async () => {
    set({ isTestingConnection: true, connectionTestResult: null });
    try {
      const result = await window.electronAPI.esgTestConnection();
      if (result.success && result.data) {
        set({ connectionTestResult: result.data });
        return result.data;
      }
      return null;
    } finally {
      set({ isTestingConnection: false });
    }
  },

  submitToFda: async (caseId: string) => {
    console.log('[ESG Store] submitToFda called for case:', caseId);
    set({ isSubmitting: true, lastSubmitResult: null, submissionProgress: null });
    try {
      const result = await window.electronAPI.esgSubmitCase({ caseId });
      console.log('[ESG Store] esgSubmitCase IPC result:', JSON.stringify(result));
      if (result.success && result.data) {
        set({ lastSubmitResult: result.data });
        console.log('[ESG Store] Submission data.success:', result.data.success);
        // Refresh all UI data after submission
        console.log('[ESG Store] Refreshing dashboard stats...');
        await useSubmissionStore.getState().fetchDashboardStats();
        console.log('[ESG Store] Refreshing current case...');
        await useCaseStore.getState().fetchCase(caseId);
        console.log('[ESG Store] Refreshing case list...');
        await useCaseStore.getState().fetchCases();
        console.log('[ESG Store] All refreshes complete');
        return result.data;
      }
      console.log('[ESG Store] IPC result.success was false or no data');
      return null;
    } finally {
      set({ isSubmitting: false });
    }
  },

  retrySubmission: async (caseId: string) => {
    set({ isSubmitting: true, lastSubmitResult: null, submissionProgress: null });
    try {
      const result = await window.electronAPI.esgRetrySubmission(caseId);
      if (result.success && result.data) {
        set({ lastSubmitResult: result.data });
        // Refresh all UI data after retry
        await useSubmissionStore.getState().fetchDashboardStats();
        await useCaseStore.getState().fetchCase(caseId);  // Refresh current case
        await useCaseStore.getState().fetchCases();       // Refresh case list
        return result.data;
      }
      return null;
    } finally {
      set({ isSubmitting: false });
    }
  },

  checkAcknowledgment: async (caseId: string) => {
    const result = await window.electronAPI.esgCheckAcknowledgment(caseId);
    if (result.success && result.data) {
      // Refresh all UI data as acknowledgment may change case status
      await useSubmissionStore.getState().fetchDashboardStats();
      await useCaseStore.getState().fetchCase(caseId);  // Refresh current case
      await useCaseStore.getState().fetchCases();       // Refresh case list
      return result.data;
    }
    return null;
  },

  fetchSubmissionAttempts: async (caseId: string) => {
    const result = await window.electronAPI.esgGetAttempts(caseId);
    if (result.success && result.data) {
      set({ submissionAttempts: result.data });
    }
  },

  fetchPollingStatus: async () => {
    const result = await window.electronAPI.esgGetPollingStatus();
    if (result.success && result.data) {
      set({ pollingStatus: result.data });
    }
  },

  startPolling: async () => {
    await window.electronAPI.esgStartPolling();
    await get().fetchPollingStatus();
  },

  stopPolling: async () => {
    await window.electronAPI.esgStopPolling();
    await get().fetchPollingStatus();
  },

  getPreSubmissionSummary: async (caseId: string) => {
    const result = await window.electronAPI.esgGetPreSubmissionSummary(caseId);
    if (result.success && result.data) {
      set({ preSubmissionSummary: result.data });
    }
  },

  openSubmitDialog: (caseId: string) => set({ showSubmitDialog: true, submitDialogCaseId: caseId }),
  closeSubmitDialog: () => set({ showSubmitDialog: false }), // Keep submitDialogCaseId for progress dialog
  openProgressDialog: () => set({ showProgressDialog: true }),
  closeProgressDialog: () => set({ showProgressDialog: false, submissionProgress: null, submitDialogCaseId: null }),
  setSubmissionProgress: (progress) => set({ submissionProgress: progress })
}));
