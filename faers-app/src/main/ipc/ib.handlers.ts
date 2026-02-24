/**
 * Investigator Brochure IPC Handlers - Phase 6
 */

import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { IBRepository } from '../database/repositories/ib.repository';
import { IBService } from '../services/ibService';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse } from '../../shared/types/ipc.types';
import type {
  InvestigatorBrochure, IBKnownReaction, IBListItem,
  CreateIBDTO, CreateIBReactionDTO, ExpectednessLookupResult
} from '../../shared/types/ib.types';

export function registerIBHandlers(): void {
  const db = getDatabase();
  const repo = new IBRepository(db);
  const service = new IBService(repo);

  ipcMain.handle(IPC_CHANNELS.IB_LIST, async (_, studyId: number): Promise<IPCResponse<IBListItem[]>> => {
    try { return { success: true, data: service.findByStudy(studyId) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to list IBs' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IB_GET, async (_, id: number): Promise<IPCResponse<InvestigatorBrochure>> => {
    try {
      const ib = service.findById(id);
      if (!ib) return { success: false, error: 'IB not found' };
      return { success: true, data: ib };
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to get IB' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IB_CREATE, async (_, data: CreateIBDTO): Promise<IPCResponse<InvestigatorBrochure>> => {
    try { return { success: true, data: service.create(data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to create IB' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IB_UPDATE, async (_, id: number, data: any): Promise<IPCResponse<InvestigatorBrochure>> => {
    try { return { success: true, data: service.update(id, data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to update IB' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IB_SET_CURRENT, async (_, id: number): Promise<IPCResponse<void>> => {
    try { service.setCurrent(id); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to set current IB' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IB_ADD_REACTION, async (_, data: CreateIBReactionDTO): Promise<IPCResponse<IBKnownReaction>> => {
    try { return { success: true, data: service.addReaction(data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to add reaction' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IB_REMOVE_REACTION, async (_, id: number): Promise<IPCResponse<void>> => {
    try { service.removeReaction(id); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to remove reaction' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IB_GET_REACTIONS, async (_, ibId: number): Promise<IPCResponse<IBKnownReaction[]>> => {
    try { return { success: true, data: service.getReactions(ibId) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to get reactions' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IB_LOOKUP_EXPECTEDNESS, async (_, studyId: number, meddraPtCode: number): Promise<IPCResponse<ExpectednessLookupResult>> => {
    try { return { success: true, data: service.lookupExpectedness(studyId, meddraPtCode) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to lookup expectedness' }; }
  });
}
