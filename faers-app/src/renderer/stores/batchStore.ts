/**
 * Batch Store
 * Phase 4: State management for batch submissions
 */

import { create } from 'zustand';
import type {
  SubmissionBatch,
  BatchCase,
  BatchListItem,
  BatchType,
  BatchFilter,
  BatchValidationResult,
  ExportBatchResponse,
  BatchCaseEligibility
} from '../../shared/types/batch.types';

// ============================================================
// State Interface
// ============================================================

interface BatchState {
  // Batch list
  batches: BatchListItem[];
  totalBatches: number;
  isLoadingBatches: boolean;
  batchFilter: BatchFilter;

  // Current batch detail
  currentBatch: SubmissionBatch | null;
  currentBatchCases: BatchCase[];
  isLoadingBatch: boolean;

  // Batch creation
  isCreating: boolean;
  eligibleCases: BatchCaseEligibility[];
  isLoadingEligibleCases: boolean;

  // Validation
  isValidating: boolean;
  validationResult: BatchValidationResult | null;

  // Export
  isExporting: boolean;
  exportResult: ExportBatchResponse | null;

  // Error handling
  error: string | null;

  // Actions
  loadBatches: (filter?: BatchFilter, limit?: number, offset?: number) => Promise<void>;
  loadBatch: (batchId: number) => Promise<void>;
  loadBatchCases: (batchId: number) => Promise<void>;
  loadEligibleCases: (batchType: BatchType) => Promise<void>;
  createBatch: (batchType: BatchType, caseIds: string[], notes?: string, submissionMode?: 'test' | 'production') => Promise<SubmissionBatch | null>;
  validateBatch: (batchId: number) => Promise<BatchValidationResult | null>;
  exportBatch: (batchId: number, exportPath: string) => Promise<ExportBatchResponse | null>;
  recordSubmission: (batchId: number, esgCoreId: string, submissionDate: string, notes?: string) => Promise<SubmissionBatch | null>;
  recordAcknowledgment: (batchId: number, ackType: 'accepted' | 'rejected' | 'partial', ackDate: string, details?: string, notes?: string) => Promise<SubmissionBatch | null>;
  addCaseToBatch: (batchId: number, caseId: string) => Promise<boolean>;
  removeCaseFromBatch: (batchId: number, caseId: string) => Promise<boolean>;
  deleteBatch: (batchId: number) => Promise<boolean>;
  setFilter: (filter: BatchFilter) => void;
  clearCurrentBatch: () => void;
  clearError: () => void;
}

// ============================================================
// Store Implementation
// ============================================================

export const useBatchStore = create<BatchState>((set, get) => ({
  // Initial state
  batches: [],
  totalBatches: 0,
  isLoadingBatches: false,
  batchFilter: {},

  currentBatch: null,
  currentBatchCases: [],
  isLoadingBatch: false,

  isCreating: false,
  eligibleCases: [],
  isLoadingEligibleCases: false,

  isValidating: false,
  validationResult: null,

  isExporting: false,
  exportResult: null,

  error: null,

  // Actions
  loadBatches: async (filter?: BatchFilter, limit = 50, offset = 0) => {
    set({ isLoadingBatches: true, error: null });
    try {
      const filterToUse = filter ?? get().batchFilter;
      const response = await window.electronAPI.getBatches(filterToUse, limit, offset);
      if (response.success && response.data) {
        set({
          batches: response.data.batches,
          totalBatches: response.data.total,
          batchFilter: filterToUse,
          isLoadingBatches: false
        });
      } else {
        set({ error: response.error || 'Failed to load batches', isLoadingBatches: false });
      }
    } catch (error) {
      set({ error: 'Failed to load batches', isLoadingBatches: false });
    }
  },

  loadBatch: async (batchId: number) => {
    set({ isLoadingBatch: true, error: null });
    try {
      const response = await window.electronAPI.getBatch(batchId);
      if (response.success && response.data) {
        set({ currentBatch: response.data, isLoadingBatch: false });
        // Also load cases
        await get().loadBatchCases(batchId);
      } else {
        set({ error: response.error || 'Failed to load batch', isLoadingBatch: false });
      }
    } catch (error) {
      set({ error: 'Failed to load batch', isLoadingBatch: false });
    }
  },

  loadBatchCases: async (batchId: number) => {
    try {
      const response = await window.electronAPI.getBatchCases(batchId);
      if (response.success && response.data) {
        set({ currentBatchCases: response.data });
      }
    } catch (error) {
      console.error('Failed to load batch cases:', error);
    }
  },

  loadEligibleCases: async (batchType: BatchType) => {
    set({ isLoadingEligibleCases: true, error: null });
    try {
      const response = await window.electronAPI.getEligibleCasesForBatch(batchType);
      if (response.success && response.data) {
        set({ eligibleCases: response.data, isLoadingEligibleCases: false });
      } else {
        set({ error: response.error || 'Failed to load eligible cases', isLoadingEligibleCases: false });
      }
    } catch (error) {
      set({ error: 'Failed to load eligible cases', isLoadingEligibleCases: false });
    }
  },

  createBatch: async (batchType, caseIds, notes, submissionMode) => {
    set({ isCreating: true, error: null });
    try {
      const response = await window.electronAPI.createBatch({
        batchType,
        caseIds,
        notes,
        submissionMode
      });
      if (response.success && response.data) {
        set({ isCreating: false });
        // Refresh batch list
        await get().loadBatches();
        return response.data.batch;
      } else {
        set({ error: response.error || 'Failed to create batch', isCreating: false });
        return null;
      }
    } catch (error) {
      set({ error: 'Failed to create batch', isCreating: false });
      return null;
    }
  },

  validateBatch: async (batchId: number) => {
    set({ isValidating: true, error: null, validationResult: null });
    try {
      const response = await window.electronAPI.validateBatch(batchId);
      if (response.success && response.data) {
        set({ validationResult: response.data, isValidating: false });
        // Refresh batch details
        await get().loadBatch(batchId);
        return response.data;
      } else {
        set({ error: response.error || 'Failed to validate batch', isValidating: false });
        return null;
      }
    } catch (error) {
      set({ error: 'Failed to validate batch', isValidating: false });
      return null;
    }
  },

  exportBatch: async (batchId: number, exportPath: string) => {
    set({ isExporting: true, error: null, exportResult: null });
    try {
      const response = await window.electronAPI.exportBatch(batchId, exportPath);
      if (response.success && response.data) {
        set({ exportResult: response.data, isExporting: false });
        // Refresh batch details
        await get().loadBatch(batchId);
        return response.data;
      } else {
        set({ error: response.error || 'Failed to export batch', isExporting: false });
        return null;
      }
    } catch (error) {
      set({ error: 'Failed to export batch', isExporting: false });
      return null;
    }
  },

  recordSubmission: async (batchId, esgCoreId, submissionDate, notes) => {
    set({ error: null });
    try {
      const response = await window.electronAPI.recordBatchSubmission({
        batchId,
        esgCoreId,
        submissionDate,
        notes
      });
      if (response.success && response.data) {
        set({ currentBatch: response.data });
        await get().loadBatches();
        return response.data;
      } else {
        set({ error: response.error || 'Failed to record submission' });
        return null;
      }
    } catch (error) {
      set({ error: 'Failed to record submission' });
      return null;
    }
  },

  recordAcknowledgment: async (batchId, ackType, ackDate, details, notes) => {
    set({ error: null });
    try {
      const response = await window.electronAPI.recordBatchAcknowledgment({
        batchId,
        ackType,
        acknowledgmentDate: ackDate,
        ackDetails: details,
        notes
      });
      if (response.success && response.data) {
        set({ currentBatch: response.data });
        await get().loadBatches();
        return response.data;
      } else {
        set({ error: response.error || 'Failed to record acknowledgment' });
        return null;
      }
    } catch (error) {
      set({ error: 'Failed to record acknowledgment' });
      return null;
    }
  },

  addCaseToBatch: async (batchId, caseId) => {
    try {
      const response = await window.electronAPI.addCaseToBatch(batchId, caseId);
      if (response.success) {
        await get().loadBatch(batchId);
        return true;
      } else {
        set({ error: response.error || 'Failed to add case to batch' });
        return false;
      }
    } catch (error) {
      set({ error: 'Failed to add case to batch' });
      return false;
    }
  },

  removeCaseFromBatch: async (batchId, caseId) => {
    try {
      const response = await window.electronAPI.removeCaseFromBatch(batchId, caseId);
      if (response.success) {
        await get().loadBatch(batchId);
        return true;
      } else {
        set({ error: response.error || 'Failed to remove case from batch' });
        return false;
      }
    } catch (error) {
      set({ error: 'Failed to remove case from batch' });
      return false;
    }
  },

  deleteBatch: async (batchId: number) => {
    try {
      const response = await window.electronAPI.deleteBatch(batchId);
      if (response.success) {
        set({ currentBatch: null, currentBatchCases: [] });
        await get().loadBatches();
        return true;
      } else {
        set({ error: response.error || 'Failed to delete batch' });
        return false;
      }
    } catch (error) {
      set({ error: 'Failed to delete batch' });
      return false;
    }
  },

  setFilter: (filter: BatchFilter) => {
    set({ batchFilter: filter });
  },

  clearCurrentBatch: () => {
    set({
      currentBatch: null,
      currentBatchCases: [],
      validationResult: null,
      exportResult: null
    });
  },

  clearError: () => {
    set({ error: null });
  }
}));

// ============================================================
// Selector Hooks
// ============================================================

export const useBatchList = () => useBatchStore((state) => ({
  batches: state.batches,
  total: state.totalBatches,
  isLoading: state.isLoadingBatches,
  filter: state.batchFilter,
  loadBatches: state.loadBatches,
  setFilter: state.setFilter
}));

export const useBatchDetail = () => useBatchStore((state) => ({
  batch: state.currentBatch,
  cases: state.currentBatchCases,
  isLoading: state.isLoadingBatch,
  loadBatch: state.loadBatch,
  clearBatch: state.clearCurrentBatch
}));

export const useBatchCreation = () => useBatchStore((state) => ({
  isCreating: state.isCreating,
  eligibleCases: state.eligibleCases,
  isLoadingEligibleCases: state.isLoadingEligibleCases,
  loadEligibleCases: state.loadEligibleCases,
  createBatch: state.createBatch
}));

export const useBatchValidation = () => useBatchStore((state) => ({
  isValidating: state.isValidating,
  validationResult: state.validationResult,
  validateBatch: state.validateBatch
}));

export const useBatchExport = () => useBatchStore((state) => ({
  isExporting: state.isExporting,
  exportResult: state.exportResult,
  exportBatch: state.exportBatch
}));

export const useBatchSubmission = () => useBatchStore((state) => ({
  recordSubmission: state.recordSubmission,
  recordAcknowledgment: state.recordAcknowledgment
}));
