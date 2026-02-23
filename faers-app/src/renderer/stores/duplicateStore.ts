/**
 * Duplicate Detection Store
 * Zustand store for duplicate detection state management
 */

import { create } from 'zustand';
import type {
  DuplicateFilter,
  DuplicateListItem,
  DuplicateCandidate,
  DuplicateCheckResult,
  DuplicateResolution,
  MergeCasesRequest,
  MergeCasesResult,
  MergedCase,
  DuplicateCheckSettings
} from '../../shared/types/duplicate.types';

interface DuplicateState {
  // List state
  candidates: DuplicateListItem[];
  total: number;
  loading: boolean;
  error: string | null;
  filter: DuplicateFilter;

  // Current candidate for detail view
  currentCandidate: DuplicateCandidate | null;
  candidateLoading: boolean;

  // Duplicate check result
  checkResult: DuplicateCheckResult | null;
  checking: boolean;

  // Stats
  stats: { pending: number; dismissed: number; confirmed: number; merged: number } | null;

  // Merge history
  mergeHistory: MergedCase[];
  mergeHistoryLoading: boolean;

  // Settings
  settings: DuplicateCheckSettings | null;

  // Actions
  loadCandidates: (filter?: DuplicateFilter, limit?: number, offset?: number) => Promise<void>;
  loadCandidate: (id: number) => Promise<void>;
  checkForDuplicates: (caseId: string, threshold?: number) => Promise<DuplicateCheckResult | null>;
  resolveDuplicate: (id: number, resolution: DuplicateResolution, resolvedBy?: string, notes?: string) => Promise<boolean>;
  getPendingForCase: (caseId: string) => Promise<DuplicateCandidate[]>;
  loadStats: () => Promise<void>;
  mergeCases: (request: MergeCasesRequest) => Promise<MergeCasesResult | null>;
  loadMergeHistory: (caseId: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<DuplicateCheckSettings>) => Promise<boolean>;
  setFilter: (filter: DuplicateFilter) => void;
  clearCheckResult: () => void;
  clearCurrentCandidate: () => void;
}

export const useDuplicateStore = create<DuplicateState>((set, get) => ({
  // Initial state
  candidates: [],
  total: 0,
  loading: false,
  error: null,
  filter: {},
  currentCandidate: null,
  candidateLoading: false,
  checkResult: null,
  checking: false,
  stats: null,
  mergeHistory: [],
  mergeHistoryLoading: false,
  settings: null,

  // Load candidates list
  loadCandidates: async (filter?: DuplicateFilter, limit = 50, offset = 0) => {
    set({ loading: true, error: null });
    try {
      const effectiveFilter = filter ?? get().filter;
      const response = await window.electronAPI.getDuplicateCandidates(effectiveFilter, limit, offset);
      if (response.success && response.data) {
        set({
          candidates: response.data.items,
          total: response.data.total,
          loading: false,
          filter: effectiveFilter
        });
      } else {
        set({ error: response.error || 'Failed to load candidates', loading: false });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false });
    }
  },

  // Load single candidate details
  loadCandidate: async (id: number) => {
    set({ candidateLoading: true, error: null });
    try {
      const response = await window.electronAPI.getDuplicateCandidate(id);
      if (response.success && response.data) {
        set({ currentCandidate: response.data, candidateLoading: false });
      } else {
        set({ error: response.error || 'Failed to load candidate', candidateLoading: false });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', candidateLoading: false });
    }
  },

  // Check for duplicates
  checkForDuplicates: async (caseId: string, threshold?: number) => {
    set({ checking: true, checkResult: null, error: null });
    try {
      const response = await window.electronAPI.checkDuplicates(caseId, threshold);
      if (response.success && response.data) {
        set({ checkResult: response.data, checking: false });
        return response.data;
      } else {
        set({ error: response.error || 'Failed to check for duplicates', checking: false });
        return null;
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', checking: false });
      return null;
    }
  },

  // Resolve duplicate
  resolveDuplicate: async (id: number, resolution: DuplicateResolution, resolvedBy?: string, notes?: string) => {
    try {
      const response = await window.electronAPI.resolveDuplicate(id, resolution, resolvedBy, notes);
      if (response.success && response.data) {
        // Update candidate in list
        const candidates = get().candidates.map(c =>
          c.id === id ? { ...c, status: response.data!.status, resolution: response.data!.resolution } : c
        );
        set({ candidates });

        // Update current candidate if viewing
        if (get().currentCandidate?.id === id) {
          set({ currentCandidate: response.data });
        }

        // Refresh stats
        get().loadStats();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Get pending duplicates for a case
  getPendingForCase: async (caseId: string) => {
    try {
      const response = await window.electronAPI.getPendingDuplicates(caseId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  // Load stats
  loadStats: async () => {
    try {
      const response = await window.electronAPI.getDuplicateStats();
      if (response.success && response.data) {
        set({ stats: response.data });
      }
    } catch {
      // Silently fail
    }
  },

  // Merge cases
  mergeCases: async (request: MergeCasesRequest) => {
    try {
      const response = await window.electronAPI.mergeCases(request);
      if (response.success && response.data) {
        // Refresh stats
        get().loadStats();
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Load merge history
  loadMergeHistory: async (caseId: string) => {
    set({ mergeHistoryLoading: true });
    try {
      const response = await window.electronAPI.getMergeHistory(caseId);
      if (response.success && response.data) {
        set({ mergeHistory: response.data, mergeHistoryLoading: false });
      } else {
        set({ mergeHistoryLoading: false });
      }
    } catch {
      set({ mergeHistoryLoading: false });
    }
  },

  // Load settings
  loadSettings: async () => {
    try {
      const response = await window.electronAPI.getDuplicateSettings();
      if (response.success && response.data) {
        set({ settings: response.data });
      }
    } catch {
      // Silently fail
    }
  },

  // Update settings
  updateSettings: async (settings: Partial<DuplicateCheckSettings>) => {
    try {
      const response = await window.electronAPI.updateDuplicateSettings(settings);
      if (response.success && response.data) {
        set({ settings: response.data });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Set filter
  setFilter: (filter: DuplicateFilter) => {
    set({ filter });
  },

  // Clear check result
  clearCheckResult: () => {
    set({ checkResult: null });
  },

  // Clear current candidate
  clearCurrentCandidate: () => {
    set({ currentCandidate: null });
  }
}));
