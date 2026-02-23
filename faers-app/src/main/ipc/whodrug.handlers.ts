/**
 * WHO Drug IPC Handlers
 * Handles IPC communication for WHO Drug dictionary operations
 */

import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { WHODrugService } from '../services/whodrugService';
import type {
  WHODrugSearchOptions,
  WHODrugBrowseATCRequest,
  WHODrugImportRequest
} from '../../shared/types/whodrug.types';

export function registerWHODrugHandlers(whodrugService: WHODrugService): void {
  // Get all WHO Drug versions
  ipcMain.handle(IPC_CHANNELS.WHODRUG_VERSIONS, async () => {
    try {
      return { success: true, data: whodrugService.getAllVersions() };
    } catch (error) {
      console.error('Error getting WHO Drug versions:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get active WHO Drug version
  ipcMain.handle(IPC_CHANNELS.WHODRUG_ACTIVE_VERSION, async () => {
    try {
      return { success: true, data: whodrugService.getActiveVersion() };
    } catch (error) {
      console.error('Error getting active WHO Drug version:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Activate a WHO Drug version
  ipcMain.handle(IPC_CHANNELS.WHODRUG_ACTIVATE_VERSION, async (_event, id: number) => {
    try {
      whodrugService.activateVersion(id);
      return { success: true };
    } catch (error) {
      console.error('Error activating WHO Drug version:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Delete a WHO Drug version
  ipcMain.handle(IPC_CHANNELS.WHODRUG_DELETE_VERSION, async (_event, id: number) => {
    try {
      whodrugService.deleteVersion(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting WHO Drug version:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Import WHO Drug dictionary
  ipcMain.handle(IPC_CHANNELS.WHODRUG_IMPORT, async (_event, request: WHODrugImportRequest, importedBy?: string) => {
    try {
      const version = await whodrugService.importWHODrug(request, importedBy);
      return { success: true, data: version };
    } catch (error) {
      console.error('Error importing WHO Drug:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get import progress
  ipcMain.handle(IPC_CHANNELS.WHODRUG_IMPORT_PROGRESS, async () => {
    try {
      return { success: true, data: whodrugService.getImportProgress() };
    } catch (error) {
      console.error('Error getting import progress:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Search WHO Drug products
  ipcMain.handle(IPC_CHANNELS.WHODRUG_SEARCH, async (_event, options: WHODrugSearchOptions) => {
    try {
      const results = whodrugService.search(options);
      return { success: true, data: results };
    } catch (error) {
      console.error('Error searching WHO Drug:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get product details
  ipcMain.handle(IPC_CHANNELS.WHODRUG_GET_PRODUCT, async (_event, drugCode: string, versionId?: number) => {
    try {
      const product = whodrugService.getProductByCode(drugCode, versionId);
      return { success: true, data: product };
    } catch (error) {
      console.error('Error getting product:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Browse ATC (get children)
  ipcMain.handle(IPC_CHANNELS.WHODRUG_BROWSE_ATC, async (_event, request: WHODrugBrowseATCRequest) => {
    try {
      const children = whodrugService.getATCTreeChildren(request);
      return { success: true, data: children };
    } catch (error) {
      console.error('Error browsing ATC:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get products by ATC code
  ipcMain.handle(IPC_CHANNELS.WHODRUG_PRODUCTS_BY_ATC, async (_event, atcCode: string, versionId?: number, limit?: number) => {
    try {
      const products = whodrugService.getProductsByATC(atcCode, versionId, limit);
      return { success: true, data: products };
    } catch (error) {
      console.error('Error getting products by ATC:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get ATC hierarchy for a drug
  ipcMain.handle(IPC_CHANNELS.WHODRUG_ATC_HIERARCHY, async (_event, drugCode: string, versionId?: number) => {
    try {
      const hierarchy = whodrugService.getATCHierarchy(drugCode, versionId);
      return { success: true, data: hierarchy };
    } catch (error) {
      console.error('Error getting ATC hierarchy:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Create coding from drug code
  ipcMain.handle(IPC_CHANNELS.WHODRUG_CODE, async (_event, drugCode: string, verbatimText: string, codedBy?: string) => {
    try {
      const coding = whodrugService.createCoding(drugCode, verbatimText, codedBy);
      return { success: true, data: coding };
    } catch (error) {
      console.error('Error creating coding:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Select WHO Drug folder (file dialog)
  ipcMain.handle(IPC_CHANNELS.WHODRUG_SELECT_FOLDER, async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select WHO Drug Dictionary Folder'
      });

      if (result.canceled || !result.filePaths[0]) {
        return { success: true, data: null };
      }

      const folderPath = result.filePaths[0];
      const fs = await import('fs');

      // Look for common WHO Drug file patterns
      const searchFiles = (dir: string, pattern: RegExp): string | null => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (pattern.test(file.toLowerCase())) {
            return `${dir}/${file}`;
          }
        }
        return null;
      };

      // Try to find files
      const foundPaths: Record<string, string> = {};
      const missingFiles: string[] = [];

      // ATC file
      const atcFile = searchFiles(folderPath, /atc|anatomical/i);
      if (atcFile) {
        foundPaths['atc'] = atcFile;
      } else {
        missingFiles.push('ATC file');
      }

      // Ingredients file
      const ingredientsFile = searchFiles(folderPath, /ingredient|substance/i);
      if (ingredientsFile) {
        foundPaths['ingredients'] = ingredientsFile;
      } else {
        missingFiles.push('Ingredients file');
      }

      // Products file
      const productsFile = searchFiles(folderPath, /product|drug|medicinal/i);
      if (productsFile) {
        foundPaths['products'] = productsFile;
      } else {
        missingFiles.push('Products file');
      }

      // Product-ingredients file (optional)
      const piFile = searchFiles(folderPath, /product.*ingredient|drug.*ingredient|composition/i);
      if (piFile) {
        foundPaths['product_ingredients'] = piFile;
      }

      if (missingFiles.length > 0) {
        return {
          success: false,
          error: `Could not find required files: ${missingFiles.join(', ')}. Please ensure the folder contains ATC, Ingredients, and Products files.`
        };
      }

      return {
        success: true,
        data: {
          folderPath,
          filePaths: foundPaths
        }
      };
    } catch (error) {
      console.error('Error selecting folder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
