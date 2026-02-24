/**
 * Deviation IPC Handlers - Phase 6
 */
import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { DeviationRepository } from '../database/repositories/deviation.repository';
import { DeviationService } from '../services/deviationService';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse } from '../../shared/types/ipc.types';

export function registerDeviationHandlers(): void {
  const db = getDatabase();
  const service = new DeviationService(new DeviationRepository(db));

  ipcMain.handle(IPC_CHANNELS.DEVIATION_LIST, async (_, filter?: any): Promise<IPCResponse<any>> => {
    try { return { success: true, data: service.findAll(filter) }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.DEVIATION_GET, async (_, id: number): Promise<IPCResponse<any>> => {
    try { const d = service.findById(id); if (!d) return { success: false, error: 'Not found' }; return { success: true, data: d }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.DEVIATION_CREATE, async (_, data: any): Promise<IPCResponse<any>> => {
    try { return { success: true, data: service.create(data) }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.DEVIATION_UPDATE, async (_, id: number, data: any): Promise<IPCResponse<any>> => {
    try { return { success: true, data: service.update(id, data) }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.DEVIATION_DELETE, async (_, id: number): Promise<IPCResponse<void>> => {
    try { service.delete(id); return { success: true }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.DEVIATION_LINK_CASE, async (_, deviationId: number, caseId: string): Promise<IPCResponse<void>> => {
    try { service.linkCase(deviationId, caseId); return { success: true }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.DEVIATION_UNLINK_CASE, async (_, deviationId: number, caseId: string): Promise<IPCResponse<void>> => {
    try { service.unlinkCase(deviationId, caseId); return { success: true }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.DEVIATION_GET_BY_CASE, async (_, caseId: string): Promise<IPCResponse<any>> => {
    try { return { success: true, data: service.getByCase(caseId) }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
}
