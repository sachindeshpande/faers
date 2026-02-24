/**
 * Investigator Brochure Store - Phase 6
 */
import { create } from 'zustand';
import type { InvestigatorBrochure, IBKnownReaction, IBListItem, CreateIBDTO, CreateIBReactionDTO, ExpectednessLookupResult } from '../../shared/types/ib.types';

interface IBState {
  ibList: IBListItem[];
  selectedIB: InvestigatorBrochure | null;
  reactions: IBKnownReaction[];
  isLoading: boolean;
  error: string | null;

  fetchIBList: (studyId: number) => Promise<void>;
  fetchIB: (id: number) => Promise<void>;
  createIB: (data: CreateIBDTO) => Promise<{ success: boolean; error?: string }>;
  setCurrent: (id: number) => Promise<{ success: boolean; error?: string }>;
  addReaction: (data: CreateIBReactionDTO) => Promise<{ success: boolean; error?: string }>;
  removeReaction: (id: number) => Promise<{ success: boolean; error?: string }>;
  fetchReactions: (ibId: number) => Promise<void>;
  lookupExpectedness: (studyId: number, meddraPtCode: number) => Promise<ExpectednessLookupResult | null>;
  clearError: () => void;
}

export const useIBStore = create<IBState>((set, get) => ({
  ibList: [], selectedIB: null, reactions: [], isLoading: false, error: null,

  fetchIBList: async (studyId) => {
    set({ isLoading: true });
    const result = await window.electronAPI.getIBList(studyId);
    if (result.success && result.data) set({ ibList: result.data });
    set({ isLoading: false });
  },
  fetchIB: async (id) => {
    const result = await window.electronAPI.getIB(id);
    if (result.success && result.data) set({ selectedIB: result.data, reactions: result.data.knownReactions || [] });
  },
  createIB: async (data) => {
    const result = await window.electronAPI.createIB(data);
    if (result.success) { get().fetchIBList(data.studyId); return { success: true }; }
    return { success: false, error: result.error };
  },
  setCurrent: async (id) => {
    const result = await window.electronAPI.setCurrentIB(id);
    if (result.success) { const ib = get().selectedIB; if (ib) get().fetchIBList(ib.studyId); return { success: true }; }
    return { success: false, error: result.error };
  },
  addReaction: async (data) => {
    const result = await window.electronAPI.addIBReaction(data);
    if (result.success) { get().fetchReactions(data.ibId); return { success: true }; }
    return { success: false, error: result.error };
  },
  removeReaction: async (id) => {
    const result = await window.electronAPI.removeIBReaction(id);
    if (result.success) { const ib = get().selectedIB; if (ib?.id) get().fetchReactions(ib.id); return { success: true }; }
    return { success: false, error: result.error };
  },
  fetchReactions: async (ibId) => {
    const result = await window.electronAPI.getIBReactions(ibId);
    if (result.success && result.data) set({ reactions: result.data });
  },
  lookupExpectedness: async (studyId, meddraPtCode) => {
    const result = await window.electronAPI.lookupExpectedness(studyId, meddraPtCode);
    return result.success ? result.data || null : null;
  },
  clearError: () => set({ error: null })
}));
