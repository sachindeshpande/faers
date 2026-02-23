/**
 * MedDRA IPC Handlers
 * Handles IPC communication for MedDRA dictionary operations
 */

import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { MedDRAService } from '../services/meddraService';
import type {
  MedDRASearchOptions,
  MedDRABrowseRequest,
  MedDRAImportRequest
} from '../../shared/types/meddra.types';

export function registerMedDRAHandlers(meddraService: MedDRAService): void {
  // Get all MedDRA versions
  ipcMain.handle(IPC_CHANNELS.MEDDRA_VERSIONS, async () => {
    try {
      return { success: true, data: meddraService.getAllVersions() };
    } catch (error) {
      console.error('Error getting MedDRA versions:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get active MedDRA version
  ipcMain.handle(IPC_CHANNELS.MEDDRA_ACTIVE_VERSION, async () => {
    try {
      return { success: true, data: meddraService.getActiveVersion() };
    } catch (error) {
      console.error('Error getting active MedDRA version:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Activate a MedDRA version
  ipcMain.handle(IPC_CHANNELS.MEDDRA_ACTIVATE_VERSION, async (_event, id: number) => {
    try {
      meddraService.activateVersion(id);
      return { success: true };
    } catch (error) {
      console.error('Error activating MedDRA version:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Delete a MedDRA version
  ipcMain.handle(IPC_CHANNELS.MEDDRA_DELETE_VERSION, async (_event, id: number) => {
    try {
      meddraService.deleteVersion(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting MedDRA version:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Import MedDRA dictionary
  ipcMain.handle(IPC_CHANNELS.MEDDRA_IMPORT, async (_event, request: MedDRAImportRequest, importedBy?: string) => {
    try {
      const version = await meddraService.importMedDRA(request, importedBy);
      return { success: true, data: version };
    } catch (error) {
      console.error('Error importing MedDRA:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get import progress
  ipcMain.handle(IPC_CHANNELS.MEDDRA_IMPORT_PROGRESS, async () => {
    try {
      return { success: true, data: meddraService.getImportProgress() };
    } catch (error) {
      console.error('Error getting import progress:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Search MedDRA terms
  ipcMain.handle(IPC_CHANNELS.MEDDRA_SEARCH, async (_event, options: MedDRASearchOptions) => {
    try {
      const results = meddraService.search(options);
      return { success: true, data: results };
    } catch (error) {
      console.error('Error searching MedDRA:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Browse hierarchy (get children)
  ipcMain.handle(IPC_CHANNELS.MEDDRA_BROWSE, async (_event, request: MedDRABrowseRequest) => {
    try {
      const children = meddraService.getTreeChildren(request);
      return { success: true, data: children };
    } catch (error) {
      console.error('Error browsing MedDRA:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get hierarchy for PT
  ipcMain.handle(IPC_CHANNELS.MEDDRA_HIERARCHY, async (_event, ptCode: number, versionId?: number) => {
    try {
      const hierarchy = meddraService.getHierarchyForPT(ptCode, versionId);
      return { success: true, data: hierarchy };
    } catch (error) {
      console.error('Error getting hierarchy:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get hierarchy for LLT
  ipcMain.handle(IPC_CHANNELS.MEDDRA_HIERARCHY_LLT, async (_event, lltCode: number, versionId?: number) => {
    try {
      const hierarchy = meddraService.getHierarchyForLLT(lltCode, versionId);
      return { success: true, data: hierarchy };
    } catch (error) {
      console.error('Error getting LLT hierarchy:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Create coding from LLT
  ipcMain.handle(IPC_CHANNELS.MEDDRA_CODE, async (_event, lltCode: number, verbatimText: string, codedBy?: string) => {
    try {
      const coding = meddraService.createCoding(lltCode, verbatimText, codedBy);
      return { success: true, data: coding };
    } catch (error) {
      console.error('Error creating coding:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Create coding from PT
  ipcMain.handle(IPC_CHANNELS.MEDDRA_CODE_PT, async (_event, ptCode: number, verbatimText: string, codedBy?: string) => {
    try {
      const coding = meddraService.createCodingFromPT(ptCode, verbatimText, codedBy);
      return { success: true, data: coding };
    } catch (error) {
      console.error('Error creating PT coding:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Select MedDRA folder (file dialog)
  ipcMain.handle(IPC_CHANNELS.MEDDRA_SELECT_FOLDER, async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select MedDRA ASCII Distribution Folder'
      });

      if (result.canceled || !result.filePaths[0]) {
        return { success: true, data: null };
      }

      const folderPath = result.filePaths[0];

      // Check for required files
      const requiredFiles = ['llt.asc', 'pt.asc', 'hlt.asc', 'hlgt.asc', 'soc.asc', 'hlt_pt.asc', 'hlgt_hlt.asc', 'soc_hlgt.asc'];
      const missingFiles: string[] = [];
      const foundPaths: Record<string, string> = {};

      // Look in both root and MedAscii subfolder
      const searchPaths = [folderPath];
      const medAsciiPath = `${folderPath}/MedAscii`;
      const fs = await import('fs');
      if (fs.existsSync(medAsciiPath)) {
        searchPaths.push(medAsciiPath);
      }

      for (const file of requiredFiles) {
        let found = false;
        for (const searchPath of searchPaths) {
          const filePath = `${searchPath}/${file}`;
          if (fs.existsSync(filePath)) {
            const key = file.replace('.asc', '');
            foundPaths[key] = filePath;
            found = true;
            break;
          }
        }
        if (!found) {
          missingFiles.push(file);
        }
      }

      if (missingFiles.length > 0) {
        return {
          success: false,
          error: `Missing required files: ${missingFiles.join(', ')}`
        };
      }

      return {
        success: true,
        data: {
          folderPath,
          filePaths: {
            llt: foundPaths['llt'],
            pt: foundPaths['pt'],
            hlt: foundPaths['hlt'],
            hlgt: foundPaths['hlgt'],
            soc: foundPaths['soc'],
            hlt_pt: foundPaths['hlt_pt'],
            hlgt_hlt: foundPaths['hlgt_hlt'],
            soc_hlgt: foundPaths['soc_hlgt']
          }
        }
      };
    } catch (error) {
      console.error('Error selecting folder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
