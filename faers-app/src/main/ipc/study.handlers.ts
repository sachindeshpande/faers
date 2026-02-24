/**
 * Study IPC Handlers - Phase 6
 */

import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { StudyRepository } from '../database/repositories/study.repository';
import { StudyService } from '../services/studyService';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse } from '../../shared/types/ipc.types';
import type {
  Study, StudyListItem, StudySite, SiteInvestigator, StudyProduct, StudyInd,
  StudyFilter, CreateStudyDTO, UpdateStudyDTO
} from '../../shared/types/study.types';

export function registerStudyHandlers(): void {
  const db = getDatabase();
  const repo = new StudyRepository(db);
  const service = new StudyService(repo);

  ipcMain.handle(IPC_CHANNELS.STUDY_LIST, async (_, filter?: StudyFilter): Promise<IPCResponse<StudyListItem[]>> => {
    try { return { success: true, data: service.findAll(filter) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to list studies' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_GET, async (_, id: number): Promise<IPCResponse<Study>> => {
    try {
      const study = service.findById(id);
      if (!study) return { success: false, error: 'Study not found' };
      return { success: true, data: study };
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to get study' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_CREATE, async (_, data: CreateStudyDTO): Promise<IPCResponse<Study>> => {
    try { return { success: true, data: service.create(data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to create study' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_UPDATE, async (_, id: number, data: UpdateStudyDTO): Promise<IPCResponse<Study>> => {
    try { return { success: true, data: service.update(id, data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to update study' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_DELETE, async (_, id: number): Promise<IPCResponse<void>> => {
    try { service.delete(id); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to delete study' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_SITE_LIST, async (_, studyId: number): Promise<IPCResponse<StudySite[]>> => {
    try { return { success: true, data: service.getSites(studyId) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to list sites' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_SITE_CREATE, async (_, site: any): Promise<IPCResponse<StudySite>> => {
    try { return { success: true, data: service.createSite(site) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to create site' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_SITE_UPDATE, async (_, id: number, data: any): Promise<IPCResponse<StudySite>> => {
    try { return { success: true, data: service.updateSite(id, data) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to update site' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_SITE_DELETE, async (_, id: number): Promise<IPCResponse<void>> => {
    try { service.deleteSite(id); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to delete site' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_INVESTIGATOR_ADD, async (_, inv: any): Promise<IPCResponse<SiteInvestigator>> => {
    try { return { success: true, data: service.addInvestigator(inv) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to add investigator' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_INVESTIGATOR_REMOVE, async (_, id: number): Promise<IPCResponse<void>> => {
    try { service.removeInvestigator(id); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to remove investigator' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_PRODUCT_ADD, async (_, prod: any): Promise<IPCResponse<StudyProduct>> => {
    try { return { success: true, data: service.addProduct(prod) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to add product' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_PRODUCT_REMOVE, async (_, id: number): Promise<IPCResponse<void>> => {
    try { service.removeProduct(id); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to remove product' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_IND_ADD, async (_, ind: any): Promise<IPCResponse<StudyInd>> => {
    try { return { success: true, data: service.addInd(ind) }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to add IND' }; }
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_IND_REMOVE, async (_, id: number): Promise<IPCResponse<void>> => {
    try { service.removeInd(id); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to remove IND' }; }
  });
}
