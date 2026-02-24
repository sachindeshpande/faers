/**
 * IND Case IPC Handlers - Phase 6
 */

import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { INDCaseRepository } from '../database/repositories/indCase.repository';
import { IBRepository } from '../database/repositories/ib.repository';
import { INDCaseService } from '../services/indCaseService';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse } from '../../shared/types/ipc.types';
import type {
  CausalityAssessment, UnblindingRecord, SUSARDetermination,
  DualCausalityCheck, ExpectednessAssessmentData,
  CreateCausalityDTO, UnblindingRequest, UnblindingApproval
} from '../../shared/types/indCase.types';

export function registerINDCaseHandlers(): void {
  const db = getDatabase();
  const indRepo = new INDCaseRepository(db);
  const ibRepo = new IBRepository(db);
  const service = new INDCaseService(indRepo, ibRepo);

  ipcMain.handle(IPC_CHANNELS.IND_CASE_GET_CAUSALITY, async (_, caseId: string): Promise<IPCResponse<CausalityAssessment[]>> => {
    try { return { success: true, data: service.getCausalityAssessments(caseId) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to get causality' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IND_CASE_SAVE_CAUSALITY, async (_, data: CreateCausalityDTO): Promise<IPCResponse<CausalityAssessment>> => {
    try { return { success: true, data: service.saveCausalityAssessment(data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to save causality' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IND_CASE_DELETE_CAUSALITY, async (_, id: number): Promise<IPCResponse<void>> => {
    try { service.deleteCausalityAssessment(id); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to delete causality' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IND_CASE_GET_DUAL_CAUSALITY, async (_, caseId: string): Promise<IPCResponse<DualCausalityCheck>> => {
    try { return { success: true, data: service.getDualCausality(caseId) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to get dual causality' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IND_CASE_ASSESS_EXPECTEDNESS, async (_, caseId: string, meddraPtCode: number, reportedSeverity?: string): Promise<IPCResponse<ExpectednessAssessmentData>> => {
    try { return { success: true, data: service.assessExpectedness(caseId, meddraPtCode, reportedSeverity) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to assess expectedness' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IND_CASE_GET_SUSAR, async (_, caseId: string): Promise<IPCResponse<SUSARDetermination>> => {
    try { return { success: true, data: service.getSUSARDetermination(caseId) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to get SUSAR determination' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IND_CASE_REQUEST_UNBLINDING, async (_, data: UnblindingRequest): Promise<IPCResponse<UnblindingRecord>> => {
    try { return { success: true, data: service.requestUnblinding(data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to request unblinding' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IND_CASE_APPROVE_UNBLINDING, async (_, data: UnblindingApproval): Promise<IPCResponse<UnblindingRecord>> => {
    try { return { success: true, data: service.approveUnblinding(data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to approve unblinding' }; }
  });

  ipcMain.handle(IPC_CHANNELS.IND_CASE_GET_UNBLINDING, async (_, caseId: string): Promise<IPCResponse<UnblindingRecord[]>> => {
    try { return { success: true, data: service.getUnblindingRecords(caseId) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to get unblinding records' }; }
  });
}
