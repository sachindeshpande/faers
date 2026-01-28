/**
 * PSR Store
 * Phase 4: Periodic Safety Report State Management
 */

import { create } from 'zustand';
import type {
  PSRSchedule,
  PSR,
  PSRListItem,
  PSRCase,
  PSRFilter,
  PSRStatus,
  CreatePSRScheduleDTO,
  UpdatePSRScheduleDTO,
  CreatePSRDTO,
  PSRPeriodCalculation,
  UpdatePSRCasesRequest,
  PSRTransitionRequest,
  PSRDashboardSummary
} from '../../shared/types/psr.types';

// ============================================================
// Store State Interface
// ============================================================

interface PSRState {
  // Schedule state
  schedules: PSRSchedule[];
  schedulesLoading: boolean;
  schedulesError: string | null;

  // PSR list state
  psrList: PSRListItem[];
  psrListTotal: number;
  psrListLoading: boolean;
  psrListError: string | null;
  psrListFilter: PSRFilter;

  // PSR detail state
  currentPSR: PSR | null;
  currentPSRLoading: boolean;
  currentPSRError: string | null;

  // PSR cases state
  psrCases: PSRCase[];
  psrCasesLoading: boolean;
  psrCasesError: string | null;

  // Eligible cases state
  eligibleCases: PSRCase[];
  eligibleCasesLoading: boolean;
  eligibleCasesError: string | null;

  // Period calculation state
  nextPeriod: PSRPeriodCalculation | null;
  nextPeriodLoading: boolean;

  // Dashboard state
  dashboard: PSRDashboardSummary | null;
  dashboardLoading: boolean;
  dashboardError: string | null;

  // UI state
  createWizardOpen: boolean;
  selectedProductId: number | null;

  // Actions
  // Schedule actions
  loadSchedules: (productId: number) => Promise<void>;
  createSchedule: (data: CreatePSRScheduleDTO) => Promise<PSRSchedule | null>;
  updateSchedule: (id: number, data: UpdatePSRScheduleDTO) => Promise<PSRSchedule | null>;
  deleteSchedule: (id: number) => Promise<boolean>;
  loadNextPeriod: (scheduleId: number) => Promise<PSRPeriodCalculation | null>;

  // PSR list actions
  loadPSRs: (filter?: PSRFilter, limit?: number, offset?: number) => Promise<void>;
  setFilter: (filter: PSRFilter) => void;
  clearFilter: () => void;

  // PSR detail actions
  loadPSR: (id: number) => Promise<void>;
  createPSR: (data: CreatePSRDTO) => Promise<PSR | null>;
  transitionPSR: (psrId: number, toStatus: PSRStatus, comment?: string) => Promise<PSR | null>;
  clearCurrentPSR: () => void;

  // PSR cases actions
  loadPSRCases: (psrId: number) => Promise<void>;
  loadEligibleCases: (psrId: number) => Promise<void>;
  updatePSRCases: (request: UpdatePSRCasesRequest) => Promise<PSR | null>;

  // Dashboard actions
  loadDashboard: () => Promise<void>;

  // UI actions
  openCreateWizard: (productId?: number) => void;
  closeCreateWizard: () => void;
  setSelectedProduct: (productId: number | null) => void;

  // Reset
  reset: () => void;
}

// ============================================================
// Initial State
// ============================================================

const initialState = {
  schedules: [],
  schedulesLoading: false,
  schedulesError: null,

  psrList: [],
  psrListTotal: 0,
  psrListLoading: false,
  psrListError: null,
  psrListFilter: {},

  currentPSR: null,
  currentPSRLoading: false,
  currentPSRError: null,

  psrCases: [],
  psrCasesLoading: false,
  psrCasesError: null,

  eligibleCases: [],
  eligibleCasesLoading: false,
  eligibleCasesError: null,

  nextPeriod: null,
  nextPeriodLoading: false,

  dashboard: null,
  dashboardLoading: false,
  dashboardError: null,

  createWizardOpen: false,
  selectedProductId: null
};

// ============================================================
// Store Implementation
// ============================================================

export const usePSRStore = create<PSRState>((set, get) => ({
  ...initialState,

  // ============================================================
  // Schedule Actions
  // ============================================================

  loadSchedules: async (productId: number) => {
    set({ schedulesLoading: true, schedulesError: null });
    try {
      const response = await window.electronAPI.getPSRSchedulesByProduct(productId);
      if (response.success && response.data) {
        set({ schedules: response.data, schedulesLoading: false });
      } else {
        set({ schedulesError: response.error || 'Failed to load schedules', schedulesLoading: false });
      }
    } catch (error) {
      set({
        schedulesError: error instanceof Error ? error.message : 'Failed to load schedules',
        schedulesLoading: false
      });
    }
  },

  createSchedule: async (data: CreatePSRScheduleDTO) => {
    try {
      const response = await window.electronAPI.createPSRSchedule(data);
      if (response.success && response.data) {
        // Reload schedules for the product
        get().loadSchedules(data.productId);
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  updateSchedule: async (id: number, data: UpdatePSRScheduleDTO) => {
    try {
      const response = await window.electronAPI.updatePSRSchedule(id, data);
      if (response.success && response.data) {
        // Update in local state
        set(state => ({
          schedules: state.schedules.map(s => s.id === id ? response.data! : s)
        }));
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  deleteSchedule: async (id: number) => {
    try {
      const response = await window.electronAPI.deletePSRSchedule(id);
      if (response.success) {
        // Remove from local state
        set(state => ({
          schedules: state.schedules.filter(s => s.id !== id)
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  loadNextPeriod: async (scheduleId: number) => {
    set({ nextPeriodLoading: true });
    try {
      const response = await window.electronAPI.getNextPSRPeriod(scheduleId);
      if (response.success && response.data) {
        set({ nextPeriod: response.data, nextPeriodLoading: false });
        return response.data;
      }
      set({ nextPeriodLoading: false });
      return null;
    } catch {
      set({ nextPeriodLoading: false });
      return null;
    }
  },

  // ============================================================
  // PSR List Actions
  // ============================================================

  loadPSRs: async (filter?: PSRFilter, limit?: number, offset?: number) => {
    set({ psrListLoading: true, psrListError: null });
    try {
      const effectiveFilter = filter || get().psrListFilter;
      const response = await window.electronAPI.getPSRs(effectiveFilter, limit, offset);
      if (response.success && response.data) {
        set({
          psrList: response.data.psrs,
          psrListTotal: response.data.total,
          psrListLoading: false
        });
      } else {
        set({
          psrListError: response.error || 'Failed to load PSRs',
          psrListLoading: false
        });
      }
    } catch (error) {
      set({
        psrListError: error instanceof Error ? error.message : 'Failed to load PSRs',
        psrListLoading: false
      });
    }
  },

  setFilter: (filter: PSRFilter) => {
    set({ psrListFilter: filter });
    get().loadPSRs(filter);
  },

  clearFilter: () => {
    set({ psrListFilter: {} });
    get().loadPSRs({});
  },

  // ============================================================
  // PSR Detail Actions
  // ============================================================

  loadPSR: async (id: number) => {
    set({ currentPSRLoading: true, currentPSRError: null });
    try {
      const response = await window.electronAPI.getPSR(id);
      if (response.success && response.data) {
        set({ currentPSR: response.data, currentPSRLoading: false });
      } else {
        set({
          currentPSRError: response.error || 'Failed to load PSR',
          currentPSRLoading: false
        });
      }
    } catch (error) {
      set({
        currentPSRError: error instanceof Error ? error.message : 'Failed to load PSR',
        currentPSRLoading: false
      });
    }
  },

  createPSR: async (data: CreatePSRDTO) => {
    try {
      const response = await window.electronAPI.createPSR(data);
      if (response.success && response.data) {
        // Refresh the PSR list
        get().loadPSRs();
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  transitionPSR: async (psrId: number, toStatus: PSRStatus, comment?: string) => {
    try {
      const request: PSRTransitionRequest = { psrId, toStatus, comment };
      const response = await window.electronAPI.transitionPSR(request);
      if (response.success && response.data) {
        // Update current PSR if it matches
        const current = get().currentPSR;
        if (current && current.id === psrId) {
          set({ currentPSR: response.data });
        }
        // Refresh list
        get().loadPSRs();
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  clearCurrentPSR: () => {
    set({ currentPSR: null, currentPSRError: null });
  },

  // ============================================================
  // PSR Cases Actions
  // ============================================================

  loadPSRCases: async (psrId: number) => {
    set({ psrCasesLoading: true, psrCasesError: null });
    try {
      const response = await window.electronAPI.getPSRCases(psrId);
      if (response.success && response.data) {
        set({ psrCases: response.data, psrCasesLoading: false });
      } else {
        set({
          psrCasesError: response.error || 'Failed to load PSR cases',
          psrCasesLoading: false
        });
      }
    } catch (error) {
      set({
        psrCasesError: error instanceof Error ? error.message : 'Failed to load PSR cases',
        psrCasesLoading: false
      });
    }
  },

  loadEligibleCases: async (psrId: number) => {
    set({ eligibleCasesLoading: true, eligibleCasesError: null });
    try {
      const response = await window.electronAPI.getEligibleCasesForPSR(psrId);
      if (response.success && response.data) {
        set({ eligibleCases: response.data, eligibleCasesLoading: false });
      } else {
        set({
          eligibleCasesError: response.error || 'Failed to load eligible cases',
          eligibleCasesLoading: false
        });
      }
    } catch (error) {
      set({
        eligibleCasesError: error instanceof Error ? error.message : 'Failed to load eligible cases',
        eligibleCasesLoading: false
      });
    }
  },

  updatePSRCases: async (request: UpdatePSRCasesRequest) => {
    try {
      const response = await window.electronAPI.updatePSRCases(request);
      if (response.success && response.data) {
        // Refresh cases and PSR
        get().loadPSRCases(request.psrId);
        get().loadPSR(request.psrId);
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  // ============================================================
  // Dashboard Actions
  // ============================================================

  loadDashboard: async () => {
    set({ dashboardLoading: true, dashboardError: null });
    try {
      const response = await window.electronAPI.getPSRDashboard();
      if (response.success && response.data) {
        set({ dashboard: response.data, dashboardLoading: false });
      } else {
        set({
          dashboardError: response.error || 'Failed to load dashboard',
          dashboardLoading: false
        });
      }
    } catch (error) {
      set({
        dashboardError: error instanceof Error ? error.message : 'Failed to load dashboard',
        dashboardLoading: false
      });
    }
  },

  // ============================================================
  // UI Actions
  // ============================================================

  openCreateWizard: (productId?: number) => {
    set({
      createWizardOpen: true,
      selectedProductId: productId || null
    });
  },

  closeCreateWizard: () => {
    set({
      createWizardOpen: false,
      selectedProductId: null,
      nextPeriod: null
    });
  },

  setSelectedProduct: (productId: number | null) => {
    set({ selectedProductId: productId });
    if (productId) {
      get().loadSchedules(productId);
    }
  },

  // ============================================================
  // Reset
  // ============================================================

  reset: () => {
    set(initialState);
  }
}));

// ============================================================
// Selectors
// ============================================================

export const usePSRSchedules = () => usePSRStore(state => ({
  schedules: state.schedules,
  loading: state.schedulesLoading,
  error: state.schedulesError
}));

export const usePSRList = () => usePSRStore(state => ({
  psrs: state.psrList,
  total: state.psrListTotal,
  loading: state.psrListLoading,
  error: state.psrListError,
  filter: state.psrListFilter
}));

export const useCurrentPSR = () => usePSRStore(state => ({
  psr: state.currentPSR,
  loading: state.currentPSRLoading,
  error: state.currentPSRError
}));

export const usePSRCases = () => usePSRStore(state => ({
  cases: state.psrCases,
  loading: state.psrCasesLoading,
  error: state.psrCasesError
}));

export const useEligibleCasesForPSR = () => usePSRStore(state => ({
  cases: state.eligibleCases,
  loading: state.eligibleCasesLoading,
  error: state.eligibleCasesError
}));

export const usePSRDashboard = () => usePSRStore(state => ({
  dashboard: state.dashboard,
  loading: state.dashboardLoading,
  error: state.dashboardError
}));

export const usePSRWizard = () => usePSRStore(state => ({
  isOpen: state.createWizardOpen,
  selectedProductId: state.selectedProductId,
  nextPeriod: state.nextPeriod,
  nextPeriodLoading: state.nextPeriodLoading
}));
