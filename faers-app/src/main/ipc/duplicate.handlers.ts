/**
 * Duplicate Detection IPC Handlers
 * Handles IPC communication for duplicate detection operations
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { DuplicateService } from '../services/duplicateService';
import type {
  DuplicateFilter,
  DuplicateResolution,
  MergeCasesRequest,
  DuplicateCheckSettings
} from '../../shared/types/duplicate.types';

export function registerDuplicateHandlers(duplicateService: DuplicateService): void {
  // Check case for duplicates
  ipcMain.handle(IPC_CHANNELS.DUPLICATE_CHECK, async (_event, caseId: string, threshold?: number) => {
    try {
      const result = duplicateService.checkForDuplicates(caseId, threshold);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get duplicate candidates list
  ipcMain.handle(
    IPC_CHANNELS.DUPLICATE_GET_CANDIDATES,
    async (_event, filter?: DuplicateFilter, limit?: number, offset?: number) => {
      try {
        const result = duplicateService.getDuplicateCandidates(filter, limit, offset);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error getting duplicate candidates:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Get single duplicate candidate
  ipcMain.handle(IPC_CHANNELS.DUPLICATE_GET_CANDIDATE, async (_event, id: number) => {
    try {
      const result = duplicateService.getDuplicateCandidate(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting duplicate candidate:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Resolve duplicate candidate
  ipcMain.handle(
    IPC_CHANNELS.DUPLICATE_RESOLVE,
    async (_event, id: number, resolution: DuplicateResolution, resolvedBy?: string, notes?: string) => {
      try {
        const result = duplicateService.resolveDuplicate(id, resolution, resolvedBy, notes);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error resolving duplicate:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Get pending duplicates for a case
  ipcMain.handle(IPC_CHANNELS.DUPLICATE_GET_PENDING, async (_event, caseId: string) => {
    try {
      const result = duplicateService.getPendingDuplicatesForCase(caseId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting pending duplicates:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get duplicate statistics
  ipcMain.handle(IPC_CHANNELS.DUPLICATE_GET_STATS, async () => {
    try {
      const stats = duplicateService.getDuplicateStats();
      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting duplicate stats:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Merge cases
  ipcMain.handle(IPC_CHANNELS.DUPLICATE_MERGE, async (_event, request: MergeCasesRequest) => {
    try {
      const result = duplicateService.mergeCases(request);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error merging cases:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get merge history
  ipcMain.handle(IPC_CHANNELS.DUPLICATE_GET_MERGE_HISTORY, async (_event, caseId: string) => {
    try {
      const result = duplicateService.getMergeHistory(caseId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting merge history:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get duplicate detection settings
  ipcMain.handle(IPC_CHANNELS.DUPLICATE_GET_SETTINGS, async () => {
    try {
      const settings = duplicateService.getSettings();
      return { success: true, data: settings };
    } catch (error) {
      console.error('Error getting duplicate settings:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Update duplicate detection settings
  ipcMain.handle(IPC_CHANNELS.DUPLICATE_UPDATE_SETTINGS, async (_event, settings: Partial<DuplicateCheckSettings>) => {
    try {
      duplicateService.updateSettings(settings);
      return { success: true, data: duplicateService.getSettings() };
    } catch (error) {
      console.error('Error updating duplicate settings:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
