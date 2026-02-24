/**
 * Annual Report Store - Phase 6
 */
import { create } from 'zustand';
import type { AnnualReportRequest, AnnualReportData } from '../../shared/types/annualReport.types';

interface AnnualReportState {
  reportData: AnnualReportData | null;
  isLoading: boolean;
  error: string | null;

  generateReport: (request: AnnualReportRequest) => Promise<void>;
  exportReport: (request: AnnualReportRequest, exportPath: string) => Promise<{ success: boolean; error?: string }>;
  clearReport: () => void;
  clearError: () => void;
}

export const useAnnualReportStore = create<AnnualReportState>((set) => ({
  reportData: null, isLoading: false, error: null,

  generateReport: async (request) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.generateAnnualReport(request);
      if (result.success && result.data) set({ reportData: result.data });
      else set({ error: result.error || 'Failed to generate report' });
    } catch (e) { set({ error: e instanceof Error ? e.message : 'Unknown error' }); }
    finally { set({ isLoading: false }); }
  },
  exportReport: async (request, exportPath) => {
    const result = await window.electronAPI.exportAnnualReport(request, exportPath);
    if (result.success) return { success: true };
    return { success: false, error: result.error };
  },
  clearReport: () => set({ reportData: null }),
  clearError: () => set({ error: null })
}));
