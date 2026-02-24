/**
 * BA/BE Store - Phase 6
 */
import { create } from 'zustand';
import type { BABEStudy, BABEStudyListItem, BABEStudyFilter, CreateBABEStudyDTO, UpdateBABEStudyDTO } from '../../shared/types/babe.types';

interface BABEState {
  studies: BABEStudyListItem[];
  selectedStudy: BABEStudy | null;
  isLoading: boolean;
  error: string | null;
  filter: BABEStudyFilter;

  fetchStudies: (filter?: BABEStudyFilter) => Promise<void>;
  fetchStudy: (id: number) => Promise<void>;
  createStudy: (data: CreateBABEStudyDTO) => Promise<{ success: boolean; error?: string }>;
  updateStudy: (id: number, data: UpdateBABEStudyDTO) => Promise<{ success: boolean; error?: string }>;
  deleteStudy: (id: number) => Promise<{ success: boolean; error?: string }>;
  setFilter: (filter: Partial<BABEStudyFilter>) => void;
  clearError: () => void;
}

export const useBABEStore = create<BABEState>((set, get) => ({
  studies: [], selectedStudy: null, isLoading: false, error: null, filter: {},

  fetchStudies: async (filter) => {
    set({ isLoading: true });
    const result = await window.electronAPI.getBABEStudies(filter || get().filter);
    if (result.success && result.data) set({ studies: result.data });
    set({ isLoading: false });
  },
  fetchStudy: async (id) => {
    const result = await window.electronAPI.getBABEStudy(id);
    if (result.success && result.data) set({ selectedStudy: result.data });
  },
  createStudy: async (data) => {
    const result = await window.electronAPI.createBABEStudy(data);
    if (result.success) { get().fetchStudies(); return { success: true }; }
    return { success: false, error: result.error };
  },
  updateStudy: async (id, data) => {
    const result = await window.electronAPI.updateBABEStudy(id, data);
    if (result.success) { get().fetchStudies(); return { success: true }; }
    return { success: false, error: result.error };
  },
  deleteStudy: async (id) => {
    const result = await window.electronAPI.deleteBABEStudy(id);
    if (result.success) { get().fetchStudies(); return { success: true }; }
    return { success: false, error: result.error };
  },
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  clearError: () => set({ error: null })
}));
