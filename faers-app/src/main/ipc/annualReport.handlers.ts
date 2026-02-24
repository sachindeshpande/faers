/**
 * Annual Report IPC Handlers - Phase 6
 */
import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { AnnualReportService } from '../services/annualReportService';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse } from '../../shared/types/ipc.types';
import type { AnnualReportRequest, AnnualReportData } from '../../shared/types/annualReport.types';

export function registerAnnualReportHandlers(): void {
  const db = getDatabase();
  const service = new AnnualReportService(db);

  ipcMain.handle(IPC_CHANNELS.ANNUAL_REPORT_GENERATE, async (_, data: AnnualReportRequest): Promise<IPCResponse<AnnualReportData>> => {
    try { return { success: true, data: service.generate(data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to generate annual report' }; }
  });

  ipcMain.handle(IPC_CHANNELS.ANNUAL_REPORT_EXPORT, async (_, data: AnnualReportRequest, exportPath: string): Promise<IPCResponse<string>> => {
    try {
      const report = service.generate(data);
      // For now, return JSON representation; full Excel export would require exceljs
      return { success: true, data: JSON.stringify(report, null, 2) };
    }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to export annual report' }; }
  });
}
