/**
 * Form 3500A IPC Handlers - Phase 6
 */
import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { Form3500AGeneratorService } from '../services/form3500aGeneratorService';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse } from '../../shared/types/ipc.types';
import type { Form3500AGenerateRequest, Form3500AGenerateResponse, Form3500APreviewData } from '../../shared/types/form3500a.types';

export function registerForm3500AHandlers(): void {
  const db = getDatabase();
  const service = new Form3500AGeneratorService(db);

  ipcMain.handle(IPC_CHANNELS.FORM_3500A_GENERATE, async (_, data: Form3500AGenerateRequest): Promise<IPCResponse<Form3500AGenerateResponse>> => {
    try { return { success: true, data: service.generate(data.caseId, data.isDraft) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to generate Form 3500A' }; }
  });

  ipcMain.handle(IPC_CHANNELS.FORM_3500A_PREVIEW, async (_, caseId: string): Promise<IPCResponse<Form3500APreviewData>> => {
    try { return { success: true, data: service.getPreviewData(caseId) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to preview Form 3500A' }; }
  });
}
