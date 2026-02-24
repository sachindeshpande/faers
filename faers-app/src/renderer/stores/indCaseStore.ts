/**
 * IND Case Store - Phase 6
 */
import { create } from 'zustand';
import type { CausalityAssessment, UnblindingRecord, SUSARDetermination, DualCausalityCheck, ExpectednessAssessmentData, CreateCausalityDTO, UnblindingRequest, UnblindingApproval } from '../../shared/types/indCase.types';

interface INDCaseState {
  causalityAssessments: CausalityAssessment[];
  dualCausality: DualCausalityCheck | null;
  susarDetermination: SUSARDetermination | null;
  expectednessData: ExpectednessAssessmentData | null;
  unblindingRecords: UnblindingRecord[];
  isLoading: boolean;
  error: string | null;

  fetchCausality: (caseId: string) => Promise<void>;
  saveCausality: (data: CreateCausalityDTO) => Promise<{ success: boolean; error?: string }>;
  deleteCausality: (id: number, caseId: string) => Promise<{ success: boolean; error?: string }>;
  fetchDualCausality: (caseId: string) => Promise<void>;
  assessExpectedness: (caseId: string, meddraPtCode: number, reportedSeverity?: string) => Promise<void>;
  fetchSUSAR: (caseId: string) => Promise<void>;
  requestUnblinding: (data: UnblindingRequest) => Promise<{ success: boolean; error?: string }>;
  approveUnblinding: (data: UnblindingApproval) => Promise<{ success: boolean; error?: string }>;
  fetchUnblinding: (caseId: string) => Promise<void>;
  clearError: () => void;
}

export const useINDCaseStore = create<INDCaseState>((set, get) => ({
  causalityAssessments: [], dualCausality: null, susarDetermination: null,
  expectednessData: null, unblindingRecords: [], isLoading: false, error: null,

  fetchCausality: async (caseId) => {
    const result = await window.electronAPI.getCausalityAssessments(caseId);
    if (result.success && result.data) set({ causalityAssessments: result.data });
  },
  saveCausality: async (data) => {
    const result = await window.electronAPI.saveCausalityAssessment(data);
    if (result.success) { get().fetchCausality(data.caseId); get().fetchDualCausality(data.caseId); get().fetchSUSAR(data.caseId); return { success: true }; }
    return { success: false, error: result.error };
  },
  deleteCausality: async (id, caseId) => {
    const result = await window.electronAPI.deleteCausalityAssessment(id);
    if (result.success) { get().fetchCausality(caseId); return { success: true }; }
    return { success: false, error: result.error };
  },
  fetchDualCausality: async (caseId) => {
    const result = await window.electronAPI.getDualCausality(caseId);
    if (result.success && result.data) set({ dualCausality: result.data });
  },
  assessExpectedness: async (caseId, meddraPtCode, reportedSeverity) => {
    const result = await window.electronAPI.assessExpectedness(caseId, meddraPtCode, reportedSeverity);
    if (result.success && result.data) set({ expectednessData: result.data });
  },
  fetchSUSAR: async (caseId) => {
    const result = await window.electronAPI.getSUSARDetermination(caseId);
    if (result.success && result.data) set({ susarDetermination: result.data });
  },
  requestUnblinding: async (data) => {
    const result = await window.electronAPI.requestUnblinding(data);
    if (result.success) { get().fetchUnblinding(data.caseId); return { success: true }; }
    return { success: false, error: result.error };
  },
  approveUnblinding: async (data) => {
    const result = await window.electronAPI.approveUnblinding(data);
    if (result.success) { return { success: true }; }
    return { success: false, error: result.error };
  },
  fetchUnblinding: async (caseId) => {
    const result = await window.electronAPI.getUnblindingRecords(caseId);
    if (result.success && result.data) set({ unblindingRecords: result.data });
  },
  clearError: () => set({ error: null })
}));
