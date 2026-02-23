/**
 * WHO Drug Store
 * Zustand store for WHO Drug dictionary state management
 */

import { create } from 'zustand';
import type {
  WHODrugVersion,
  WHODrugSearchResult,
  WHODrugProduct,
  WHODrugCoding,
  ATCCode,
  ATCTreeNode,
  WHODrugImportProgress,
  WHODrugSearchOptions,
  WHODrugBrowseATCRequest
} from '../../shared/types/whodrug.types';

interface WHODrugState {
  // Versions
  versions: WHODrugVersion[];
  activeVersion: WHODrugVersion | null;
  versionsLoading: boolean;

  // Search
  searchResults: WHODrugSearchResult[];
  searchLoading: boolean;
  searchQuery: string;

  // ATC browser
  atcTreeData: ATCTreeNode[];
  expandedKeys: string[];
  selectedProduct: WHODrugProduct | null;
  atcHierarchy: ATCCode[];
  browseLoading: boolean;

  // Import
  importing: boolean;
  importProgress: WHODrugImportProgress | null;

  // Actions
  loadVersions: () => Promise<void>;
  loadActiveVersion: () => Promise<void>;
  activateVersion: (id: number) => Promise<boolean>;
  deleteVersion: (id: number) => Promise<boolean>;

  search: (options: WHODrugSearchOptions) => Promise<void>;
  clearSearch: () => void;

  loadATCChildren: (request: WHODrugBrowseATCRequest) => Promise<ATCTreeNode[]>;
  setExpandedKeys: (keys: string[]) => void;
  loadProductDetails: (drugCode: string) => Promise<WHODrugProduct | null>;
  loadATCHierarchy: (drugCode: string) => Promise<ATCCode[]>;
  loadProductsByATC: (atcCode: string, limit?: number) => Promise<WHODrugSearchResult[]>;
  clearSelection: () => void;

  selectFolder: () => Promise<{ folderPath: string; filePaths: Record<string, string> } | null>;
  startImport: (version: string, releaseDate: string | undefined, filePaths: Record<string, string>, importedBy?: string) => Promise<WHODrugVersion | null>;
  getImportProgress: () => Promise<WHODrugImportProgress | null>;

  createCoding: (drugCode: string, verbatimText: string, codedBy?: string) => Promise<WHODrugCoding | null>;
}

export const useWHODrugStore = create<WHODrugState>((set, get) => ({
  // Initial state
  versions: [],
  activeVersion: null,
  versionsLoading: false,
  searchResults: [],
  searchLoading: false,
  searchQuery: '',
  atcTreeData: [],
  expandedKeys: [],
  selectedProduct: null,
  atcHierarchy: [],
  browseLoading: false,
  importing: false,
  importProgress: null,

  // Version management
  loadVersions: async () => {
    set({ versionsLoading: true });
    try {
      const result = await window.electronAPI.whodrugVersions();
      if (result.success && result.data) {
        set({ versions: result.data });
      }
    } catch (error) {
      console.error('Failed to load WHO Drug versions:', error);
    } finally {
      set({ versionsLoading: false });
    }
  },

  loadActiveVersion: async () => {
    try {
      const result = await window.electronAPI.whodrugActiveVersion();
      if (result.success) {
        set({ activeVersion: result.data || null });
      }
    } catch (error) {
      console.error('Failed to load active WHO Drug version:', error);
    }
  },

  activateVersion: async (id: number) => {
    try {
      const result = await window.electronAPI.whodrugActivateVersion(id);
      if (result.success) {
        await get().loadVersions();
        await get().loadActiveVersion();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to activate WHO Drug version:', error);
      return false;
    }
  },

  deleteVersion: async (id: number) => {
    try {
      const result = await window.electronAPI.whodrugDeleteVersion(id);
      if (result.success) {
        await get().loadVersions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete WHO Drug version:', error);
      return false;
    }
  },

  // Search
  search: async (options: WHODrugSearchOptions) => {
    set({ searchLoading: true, searchQuery: options.query });
    try {
      const result = await window.electronAPI.whodrugSearch(options);
      if (result.success && result.data) {
        set({ searchResults: result.data });
      } else {
        set({ searchResults: [] });
      }
    } catch (error) {
      console.error('Failed to search WHO Drug:', error);
      set({ searchResults: [] });
    } finally {
      set({ searchLoading: false });
    }
  },

  clearSearch: () => {
    set({ searchResults: [], searchQuery: '' });
  },

  // ATC browsing
  loadATCChildren: async (request: WHODrugBrowseATCRequest) => {
    set({ browseLoading: true });
    try {
      const result = await window.electronAPI.whodrugBrowseATC(request);
      if (result.success && result.data) {
        if (!request.parentCode) {
          set({ atcTreeData: result.data });
        }
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to load ATC children:', error);
      return [];
    } finally {
      set({ browseLoading: false });
    }
  },

  setExpandedKeys: (keys: string[]) => {
    set({ expandedKeys: keys });
  },

  loadProductDetails: async (drugCode: string) => {
    try {
      const result = await window.electronAPI.whodrugGetProduct(drugCode);
      if (result.success && result.data) {
        set({ selectedProduct: result.data });
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to load product details:', error);
      return null;
    }
  },

  loadATCHierarchy: async (drugCode: string) => {
    try {
      const result = await window.electronAPI.whodrugATCHierarchy(drugCode);
      if (result.success && result.data) {
        set({ atcHierarchy: result.data });
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to load ATC hierarchy:', error);
      return [];
    }
  },

  loadProductsByATC: async (atcCode: string, limit = 50) => {
    try {
      const result = await window.electronAPI.whodrugProductsByATC(atcCode, undefined, limit);
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to load products by ATC:', error);
      return [];
    }
  },

  clearSelection: () => {
    set({ selectedProduct: null, atcHierarchy: [] });
  },

  // Import
  selectFolder: async () => {
    try {
      const result = await window.electronAPI.whodrugSelectFolder();
      if (result.success && result.data) {
        return result.data;
      }
      if (!result.success && result.error) {
        throw new Error(result.error);
      }
      return null;
    } catch (error) {
      console.error('Failed to select folder:', error);
      throw error;
    }
  },

  startImport: async (version: string, releaseDate: string | undefined, filePaths: Record<string, string>, importedBy?: string) => {
    set({ importing: true, importProgress: { status: 'pending', filesProcessed: 0, totalFiles: 4, recordsImported: 0 } });
    try {
      const result = await window.electronAPI.whodrugImport(
        { version, releaseDate, filePaths: filePaths as any },
        importedBy
      );
      if (result.success && result.data) {
        await get().loadVersions();
        await get().loadActiveVersion();
        set({ importing: false, importProgress: { status: 'completed', filesProcessed: 4, totalFiles: 4, recordsImported: 0 } });
        return result.data;
      }
      set({ importing: false, importProgress: { status: 'failed', filesProcessed: 0, totalFiles: 4, recordsImported: 0, error: result.error } });
      return null;
    } catch (error) {
      console.error('Failed to import WHO Drug:', error);
      set({ importing: false, importProgress: { status: 'failed', filesProcessed: 0, totalFiles: 4, recordsImported: 0, error: error instanceof Error ? error.message : 'Unknown error' } });
      return null;
    }
  },

  getImportProgress: async () => {
    try {
      const result = await window.electronAPI.whodrugImportProgress();
      if (result.success) {
        set({ importProgress: result.data || null });
        return result.data || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get import progress:', error);
      return null;
    }
  },

  // Coding
  createCoding: async (drugCode: string, verbatimText: string, codedBy?: string) => {
    try {
      const result = await window.electronAPI.whodrugCode(drugCode, verbatimText, codedBy);
      if (result.success) {
        return result.data || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to create coding:', error);
      return null;
    }
  }
}));
