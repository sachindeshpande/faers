/**
 * Study Store - Phase 6
 */
import { create } from 'zustand';
import type { Study, StudyListItem, StudyFilter, CreateStudyDTO, UpdateStudyDTO } from '../../shared/types/study.types';

interface StudyState {
  studies: StudyListItem[];
  selectedStudy: Study | null;
  isLoading: boolean;
  error: string | null;
  filter: StudyFilter;

  fetchStudies: (filter?: StudyFilter) => Promise<void>;
  fetchStudy: (id: number) => Promise<Study | null>;
  createStudy: (data: CreateStudyDTO) => Promise<{ success: boolean; error?: string }>;
  updateStudy: (id: number, data: UpdateStudyDTO) => Promise<{ success: boolean; error?: string }>;
  deleteStudy: (id: number) => Promise<{ success: boolean; error?: string }>;
  setFilter: (filter: Partial<StudyFilter>) => void;
  clearSelectedStudy: () => void;
  clearError: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  studies: [],
  selectedStudy: null,
  isLoading: false,
  error: null,
  filter: {},

  fetchStudies: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.getStudies(filter || get().filter);
      if (result.success && result.data) set({ studies: result.data });
      else set({ error: result.error || 'Failed to fetch studies' });
    } catch (e) { set({ error: e instanceof Error ? e.message : 'Unknown error' }); }
    finally { set({ isLoading: false }); }
  },

  fetchStudy: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.getStudy(id);
      if (result.success && result.data) { set({ selectedStudy: result.data }); return result.data; }
      set({ error: result.error || 'Study not found' }); return null;
    } catch (e) { set({ error: e instanceof Error ? e.message : 'Unknown error' }); return null; }
    finally { set({ isLoading: false }); }
  },

  createStudy: async (data) => {
    try {
      const result = await window.electronAPI.createStudy(data);
      if (result.success) { get().fetchStudies(); return { success: true }; }
      return { success: false, error: result.error };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }; }
  },

  updateStudy: async (id, data) => {
    try {
      const result = await window.electronAPI.updateStudy(id, data);
      if (result.success) { get().fetchStudies(); if (get().selectedStudy?.id === id) get().fetchStudy(id); return { success: true }; }
      return { success: false, error: result.error };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }; }
  },

  deleteStudy: async (id) => {
    try {
      const result = await window.electronAPI.deleteStudy(id);
      if (result.success) { get().fetchStudies(); return { success: true }; }
      return { success: false, error: result.error };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }; }
  },

  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  clearSelectedStudy: () => set({ selectedStudy: null }),
  clearError: () => set({ error: null })
}));
