/**
 * BA/BE IPC Handlers - Phase 6
 */
import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { BABERepository } from '../database/repositories/babe.repository';
import { BABEService } from '../services/babeService';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse } from '../../shared/types/ipc.types';

export function registerBABEHandlers(): void {
  const db = getDatabase();
  const service = new BABEService(new BABERepository(db));

  ipcMain.handle(IPC_CHANNELS.BABE_LIST, async (_, filter?: any): Promise<IPCResponse<any>> => {
    try { return { success: true, data: service.findAll(filter) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to list BA/BE studies' }; }
  });
  ipcMain.handle(IPC_CHANNELS.BABE_GET, async (_, id: number): Promise<IPCResponse<any>> => {
    try { const s = service.findById(id); if (!s) return { success: false, error: 'BA/BE study not found' }; return { success: true, data: s }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to get BA/BE study' }; }
  });
  ipcMain.handle(IPC_CHANNELS.BABE_CREATE, async (_, data: any): Promise<IPCResponse<any>> => {
    try { return { success: true, data: service.create(data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to create BA/BE study' }; }
  });
  ipcMain.handle(IPC_CHANNELS.BABE_UPDATE, async (_, id: number, data: any): Promise<IPCResponse<any>> => {
    try { return { success: true, data: service.update(id, data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to update BA/BE study' }; }
  });
  ipcMain.handle(IPC_CHANNELS.BABE_DELETE, async (_, id: number): Promise<IPCResponse<void>> => {
    try { service.delete(id); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to delete BA/BE study' }; }
  });
}
