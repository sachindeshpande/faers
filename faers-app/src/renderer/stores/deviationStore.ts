/**
 * Deviation Store - Phase 6
 */
import { create } from 'zustand';
import type { ProtocolDeviation, DeviationListItem, DeviationFilter, CreateDeviationDTO, UpdateDeviationDTO } from '../../shared/types/deviation.types';

interface DeviationState {
  deviations: DeviationListItem[];
  selectedDeviation: ProtocolDeviation | null;
  caseDeviations: DeviationListItem[];
  isLoading: boolean;
  error: string | null;
  filter: DeviationFilter;

  fetchDeviations: (filter?: DeviationFilter) => Promise<void>;
  fetchDeviation: (id: number) => Promise<void>;
  createDeviation: (data: CreateDeviationDTO) => Promise<{ success: boolean; error?: string }>;
  updateDeviation: (id: number, data: UpdateDeviationDTO) => Promise<{ success: boolean; error?: string }>;
  deleteDeviation: (id: number) => Promise<{ success: boolean; error?: string }>;
  linkCase: (deviationId: number, caseId: string) => Promise<{ success: boolean; error?: string }>;
  unlinkCase: (deviationId: number, caseId: string) => Promise<{ success: boolean; error?: string }>;
  fetchByCase: (caseId: string) => Promise<void>;
  setFilter: (filter: Partial<DeviationFilter>) => void;
  clearError: () => void;
}

export const useDeviationStore = create<DeviationState>((set, get) => ({
  deviations: [], selectedDeviation: null, caseDeviations: [], isLoading: false, error: null, filter: {},

  fetchDeviations: async (filter) => {
    set({ isLoading: true });
    const result = await window.electronAPI.getDeviations(filter || get().filter);
    if (result.success && result.data) set({ deviations: result.data });
    set({ isLoading: false });
  },
  fetchDeviation: async (id) => {
    const result = await window.electronAPI.getDeviation(id);
    if (result.success && result.data) set({ selectedDeviation: result.data });
  },
  createDeviation: async (data) => {
    const result = await window.electronAPI.createDeviation(data);
    if (result.success) { get().fetchDeviations(); return { success: true }; }
    return { success: false, error: result.error };
  },
  updateDeviation: async (id, data) => {
    const result = await window.electronAPI.updateDeviation(id, data);
    if (result.success) { get().fetchDeviations(); return { success: true }; }
    return { success: false, error: result.error };
  },
  deleteDeviation: async (id) => {
    const result = await window.electronAPI.deleteDeviation(id);
    if (result.success) { get().fetchDeviations(); return { success: true }; }
    return { success: false, error: result.error };
  },
  linkCase: async (deviationId, caseId) => {
    const result = await window.electronAPI.linkDeviationToCase(deviationId, caseId);
    if (result.success) return { success: true };
    return { success: false, error: result.error };
  },
  unlinkCase: async (deviationId, caseId) => {
    const result = await window.electronAPI.unlinkDeviationFromCase(deviationId, caseId);
    if (result.success) return { success: true };
    return { success: false, error: result.error };
  },
  fetchByCase: async (caseId) => {
    const result = await window.electronAPI.getDeviationsByCase(caseId);
    if (result.success && result.data) set({ caseDeviations: result.data });
  },
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  clearError: () => set({ error: null })
}));
