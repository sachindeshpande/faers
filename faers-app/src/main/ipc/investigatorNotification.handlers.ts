/**
 * Investigator Notification IPC Handlers - Phase 6
 */
import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { InvestigatorNotificationRepository } from '../database/repositories/investigatorNotification.repository';
import { InvestigatorNotificationService } from '../services/investigatorNotificationService';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse } from '../../shared/types/ipc.types';

export function registerInvestigatorNotificationHandlers(): void {
  const db = getDatabase();
  const service = new InvestigatorNotificationService(new InvestigatorNotificationRepository(db));

  ipcMain.handle(IPC_CHANNELS.INV_NOTIFICATION_LIST, async (_, filter?: any): Promise<IPCResponse<any>> => {
    try { return { success: true, data: service.findAll(filter) }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.INV_NOTIFICATION_GET, async (_, id: number): Promise<IPCResponse<any>> => {
    try { const n = service.findById(id); if (!n) return { success: false, error: 'Not found' }; return { success: true, data: n }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.INV_NOTIFICATION_CREATE, async (_, data: any): Promise<IPCResponse<any>> => {
    try { return { success: true, data: service.create(data) }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.INV_NOTIFICATION_ADD_DISTRIBUTION, async (_, data: any): Promise<IPCResponse<any>> => {
    try { return { success: true, data: service.addDistribution(data) }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.INV_NOTIFICATION_MARK_SENT, async (_, distributionId: number): Promise<IPCResponse<void>> => {
    try { service.markSent(distributionId); return { success: true }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
  ipcMain.handle(IPC_CHANNELS.INV_NOTIFICATION_MARK_ACKNOWLEDGED, async (_, distributionId: number, acknowledgedBy: string): Promise<IPCResponse<void>> => {
    try { service.markAcknowledged(distributionId, acknowledgedBy); return { success: true }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed' }; }
  });
}
