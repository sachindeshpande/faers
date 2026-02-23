/**
 * Import IPC Handlers
 * Handles IPC communication for bulk import operations
 */

import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { ImportService } from '../services/importService';
import type {
  ColumnMapping,
  ImportExecuteOptions
} from '../../shared/types/import.types';

export function registerImportHandlers(importService: ImportService): void {
  // Upload file
  ipcMain.handle(IPC_CHANNELS.IMPORT_UPLOAD, async (_event, filePath?: string) => {
    try {
      // If no path provided, show file dialog
      let actualPath = filePath;
      if (!actualPath) {
        const result = await dialog.showOpenDialog({
          title: 'Select Import File',
          filters: [
            { name: 'CSV Files', extensions: ['csv'] },
            { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: 'No file selected' };
        }

        actualPath = result.filePaths[0];
      }

      const response = importService.uploadFile(actualPath);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error uploading import file:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Set column mapping
  ipcMain.handle(
    IPC_CHANNELS.IMPORT_SET_MAPPING,
    async (_event, jobId: number, mapping: ColumnMapping[]) => {
      try {
        const result = importService.setMapping(jobId, mapping);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error setting import mapping:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Validate import
  ipcMain.handle(IPC_CHANNELS.IMPORT_VALIDATE, async (_event, jobId: number) => {
    try {
      const result = importService.validateImport(jobId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error validating import:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Execute import
  ipcMain.handle(
    IPC_CHANNELS.IMPORT_EXECUTE,
    async (_event, jobId: number, options: ImportExecuteOptions) => {
      try {
        const result = importService.executeImport(jobId, options);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error executing import:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Get import job
  ipcMain.handle(IPC_CHANNELS.IMPORT_GET, async (_event, jobId: number) => {
    try {
      const result = importService.getImportJob(jobId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting import job:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // List import jobs
  ipcMain.handle(
    IPC_CHANNELS.IMPORT_LIST,
    async (_event, limit?: number, offset?: number) => {
      try {
        const result = importService.getImportJobs(limit, offset);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error listing import jobs:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Get import errors
  ipcMain.handle(IPC_CHANNELS.IMPORT_GET_ERRORS, async (_event, jobId: number) => {
    try {
      const result = importService.getImportErrors(jobId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting import errors:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Cancel import
  ipcMain.handle(IPC_CHANNELS.IMPORT_CANCEL, async (_event, jobId: number) => {
    try {
      const result = importService.cancelImport(jobId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error cancelling import:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Save column mapping
  ipcMain.handle(
    IPC_CHANNELS.IMPORT_SAVE_MAPPING,
    async (_event, name: string, description: string | undefined, mapping: ColumnMapping[]) => {
      try {
        const result = importService.saveColumnMapping(name, description, mapping);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error saving column mapping:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // List saved mappings
  ipcMain.handle(IPC_CHANNELS.IMPORT_LIST_MAPPINGS, async () => {
    try {
      const result = importService.getSavedMappings();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error listing saved mappings:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Delete saved mapping
  ipcMain.handle(IPC_CHANNELS.IMPORT_DELETE_MAPPING, async (_event, id: number) => {
    try {
      const result = importService.deleteSavedMapping(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error deleting saved mapping:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
