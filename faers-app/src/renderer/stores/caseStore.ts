/**
 * Case Store - Zustand state management for ICSR cases
 */

import { create } from 'zustand';
import type {
  Case,
  CaseListItem,
  CaseFilterOptions,
  CreateCaseDTO,
  UpdateCaseDTO
} from '../../shared/types/case.types';

interface CaseState {
  // Case list
  cases: CaseListItem[];
  totalCases: number;
  isLoadingList: boolean;
  listError: string | null;
  filters: CaseFilterOptions;

  // Current case
  currentCase: Case | null;
  isLoadingCase: boolean;
  caseError: string | null;
  isDirty: boolean;

  // UI state
  activeSection: string;
  isCreating: boolean;
  isSaving: boolean;

  // Actions
  fetchCases: (filters?: CaseFilterOptions) => Promise<void>;
  fetchCase: (id: string) => Promise<void>;
  createCase: (data?: CreateCaseDTO) => Promise<Case | null>;
  updateCase: (data: UpdateCaseDTO) => Promise<void>;
  deleteCase: (id: string) => Promise<boolean>;
  duplicateCase: (id: string) => Promise<Case | null>;
  setFilters: (filters: CaseFilterOptions) => void;
  setActiveSection: (section: string) => void;
  setDirty: (dirty: boolean) => void;
  clearCurrentCase: () => void;
  updateCurrentCaseField: <K extends keyof Case>(field: K, value: Case[K]) => void;
}

export const useCaseStore = create<CaseState>((set, get) => ({
  // Initial state
  cases: [],
  totalCases: 0,
  isLoadingList: false,
  listError: null,
  filters: { limit: 50, offset: 0 },

  currentCase: null,
  isLoadingCase: false,
  caseError: null,
  isDirty: false,

  activeSection: 'report',
  isCreating: false,
  isSaving: false,

  // Actions
  fetchCases: async (filters?: CaseFilterOptions) => {
    const mergedFilters = { ...get().filters, ...filters };
    console.log('[CaseStore] fetchCases called with filters:', JSON.stringify(mergedFilters));
    set({ isLoadingList: true, listError: null, filters: mergedFilters });

    try {
      const response = await window.electronAPI.getCases(mergedFilters);
      console.log('[CaseStore] getCases response success:', response.success);

      if (response.success && response.data) {
        console.log('[CaseStore] Received', response.data.cases.length, 'cases');
        // Log first few cases with their statuses
        response.data.cases.slice(0, 3).forEach(c => {
          console.log(`[CaseStore] Case ${c.id}: status='${c.status}'`);
        });
        set({
          cases: response.data.cases,
          totalCases: response.data.total,
          isLoadingList: false
        });
      } else {
        console.log('[CaseStore] fetchCases failed:', response.error);
        set({
          listError: response.error || 'Failed to fetch cases',
          isLoadingList: false
        });
      }
    } catch (error) {
      console.error('[CaseStore] fetchCases exception:', error);
      set({
        listError: error instanceof Error ? error.message : 'Unknown error',
        isLoadingList: false
      });
    }
  },

  fetchCase: async (id: string) => {
    console.log('[CaseStore] fetchCase called for id:', id);
    set({ isLoadingCase: true, caseError: null });

    try {
      const response = await window.electronAPI.getCase(id, true);
      console.log('[CaseStore] getCase response success:', response.success);

      if (response.success && response.data) {
        console.log('[CaseStore] Loaded case status:', response.data.status, 'workflowStatus:', response.data.workflowStatus);
        set({
          currentCase: response.data,
          isLoadingCase: false,
          isDirty: false
        });
      } else {
        set({
          caseError: response.error || 'Failed to fetch case',
          isLoadingCase: false
        });
      }
    } catch (error) {
      set({
        caseError: error instanceof Error ? error.message : 'Unknown error',
        isLoadingCase: false
      });
    }
  },

  createCase: async (data?: CreateCaseDTO) => {
    set({ isCreating: true, caseError: null });

    try {
      const response = await window.electronAPI.createCase(data);

      if (response.success && response.data) {
        set({
          currentCase: response.data,
          isCreating: false,
          isDirty: false
        });
        // Refresh case list
        get().fetchCases();
        return response.data;
      } else {
        set({
          caseError: response.error || 'Failed to create case',
          isCreating: false
        });
        return null;
      }
    } catch (error) {
      set({
        caseError: error instanceof Error ? error.message : 'Unknown error',
        isCreating: false
      });
      return null;
    }
  },

  updateCase: async (data: UpdateCaseDTO) => {
    const currentCase = get().currentCase;
    if (!currentCase) return;

    set({ isSaving: true, caseError: null });

    try {
      const response = await window.electronAPI.updateCase(currentCase.id, data);

      if (response.success && response.data) {
        set({
          currentCase: response.data,
          isSaving: false,
          isDirty: false
        });
        // Refresh case list
        get().fetchCases();
      } else {
        set({
          caseError: response.error || 'Failed to update case',
          isSaving: false
        });
      }
    } catch (error) {
      set({
        caseError: error instanceof Error ? error.message : 'Unknown error',
        isSaving: false
      });
    }
  },

  deleteCase: async (id: string) => {
    try {
      const response = await window.electronAPI.deleteCase(id);

      if (response.success) {
        // Clear current case if it was deleted
        if (get().currentCase?.id === id) {
          set({ currentCase: null, isDirty: false });
        }
        // Refresh case list
        get().fetchCases();
        return true;
      } else {
        set({ caseError: response.error || 'Failed to delete case' });
        return false;
      }
    } catch (error) {
      set({
        caseError: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  },

  duplicateCase: async (id: string) => {
    set({ isCreating: true, caseError: null });

    try {
      const response = await window.electronAPI.duplicateCase(id);

      if (response.success && response.data) {
        set({
          currentCase: response.data,
          isCreating: false,
          isDirty: false
        });
        // Refresh case list
        get().fetchCases();
        return response.data;
      } else {
        set({
          caseError: response.error || 'Failed to duplicate case',
          isCreating: false
        });
        return null;
      }
    } catch (error) {
      set({
        caseError: error instanceof Error ? error.message : 'Unknown error',
        isCreating: false
      });
      return null;
    }
  },

  setFilters: (filters: CaseFilterOptions) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  setActiveSection: (section: string) => {
    set({ activeSection: section });
  },

  setDirty: (dirty: boolean) => {
    set({ isDirty: dirty });
  },

  clearCurrentCase: () => {
    set({ currentCase: null, isDirty: false, caseError: null });
  },

  updateCurrentCaseField: <K extends keyof Case>(field: K, value: Case[K]) => {
    const currentCase = get().currentCase;
    if (!currentCase) return;

    set({
      currentCase: { ...currentCase, [field]: value },
      isDirty: true
    });
  }
}));

// Selector hooks
export const useCaseList = () => useCaseStore((state) => ({
  cases: state.cases,
  totalCases: state.totalCases,
  isLoading: state.isLoadingList,
  error: state.listError,
  filters: state.filters
}));

export const useCurrentCase = () => useCaseStore((state) => ({
  case: state.currentCase,
  isLoading: state.isLoadingCase,
  error: state.caseError,
  isDirty: state.isDirty,
  isSaving: state.isSaving
}));

export const useCaseActions = () => useCaseStore((state) => ({
  fetchCases: state.fetchCases,
  fetchCase: state.fetchCase,
  createCase: state.createCase,
  updateCase: state.updateCase,
  deleteCase: state.deleteCase,
  duplicateCase: state.duplicateCase,
  setFilters: state.setFilters,
  clearCurrentCase: state.clearCurrentCase,
  updateCurrentCaseField: state.updateCurrentCaseField
}));
