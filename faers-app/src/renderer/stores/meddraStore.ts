/**
 * MedDRA Store
 * Zustand store for MedDRA dictionary state management
 */

import { create } from 'zustand';
import type {
  MedDRAVersion,
  MedDRASearchResult,
  MedDRATreeNode,
  MedDRAHierarchy,
  MedDRAImportProgress,
  MedDRASearchOptions,
  MedDRABrowseRequest,
  MedDRACoding
} from '../../shared/types/meddra.types';

interface MedDRAState {
  // Versions
  versions: MedDRAVersion[];
  activeVersion: MedDRAVersion | null;
  versionsLoading: boolean;

  // Search
  searchResults: MedDRASearchResult[];
  searchLoading: boolean;
  searchQuery: string;

  // Hierarchy browser
  treeData: MedDRATreeNode[];
  expandedKeys: string[];
  selectedHierarchy: MedDRAHierarchy[] | null;
  browseLoading: boolean;

  // Import
  importing: boolean;
  importProgress: MedDRAImportProgress | null;

  // Actions
  loadVersions: () => Promise<void>;
  loadActiveVersion: () => Promise<void>;
  activateVersion: (id: number) => Promise<boolean>;
  deleteVersion: (id: number) => Promise<boolean>;

  search: (options: MedDRASearchOptions) => Promise<void>;
  clearSearch: () => void;

  loadTreeChildren: (request: MedDRABrowseRequest) => Promise<MedDRATreeNode[]>;
  setExpandedKeys: (keys: string[]) => void;
  loadHierarchy: (ptCode: number) => Promise<MedDRAHierarchy[]>;
  loadHierarchyForLLT: (lltCode: number) => Promise<MedDRAHierarchy[]>;
  clearHierarchy: () => void;

  selectFolder: () => Promise<{ folderPath: string; filePaths: Record<string, string> } | null>;
  startImport: (version: string, releaseDate: string | undefined, filePaths: Record<string, string>, importedBy?: string) => Promise<MedDRAVersion | null>;
  getImportProgress: () => Promise<MedDRAImportProgress | null>;

  createCoding: (lltCode: number, verbatimText: string, codedBy?: string) => Promise<MedDRACoding | null>;
  createCodingFromPT: (ptCode: number, verbatimText: string, codedBy?: string) => Promise<MedDRACoding | null>;
}

export const useMedDRAStore = create<MedDRAState>((set, get) => ({
  // Initial state
  versions: [],
  activeVersion: null,
  versionsLoading: false,
  searchResults: [],
  searchLoading: false,
  searchQuery: '',
  treeData: [],
  expandedKeys: [],
  selectedHierarchy: null,
  browseLoading: false,
  importing: false,
  importProgress: null,

  // Version management
  loadVersions: async () => {
    set({ versionsLoading: true });
    try {
      const result = await window.electronAPI.meddraVersions();
      if (result.success && result.data) {
        set({ versions: result.data });
      }
    } catch (error) {
      console.error('Failed to load MedDRA versions:', error);
    } finally {
      set({ versionsLoading: false });
    }
  },

  loadActiveVersion: async () => {
    try {
      const result = await window.electronAPI.meddraActiveVersion();
      if (result.success) {
        set({ activeVersion: result.data || null });
      }
    } catch (error) {
      console.error('Failed to load active MedDRA version:', error);
    }
  },

  activateVersion: async (id: number) => {
    try {
      const result = await window.electronAPI.meddraActivateVersion(id);
      if (result.success) {
        // Reload versions and active version
        await get().loadVersions();
        await get().loadActiveVersion();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to activate MedDRA version:', error);
      return false;
    }
  },

  deleteVersion: async (id: number) => {
    try {
      const result = await window.electronAPI.meddraDeleteVersion(id);
      if (result.success) {
        await get().loadVersions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete MedDRA version:', error);
      return false;
    }
  },

  // Search
  search: async (options: MedDRASearchOptions) => {
    set({ searchLoading: true, searchQuery: options.query });
    try {
      const result = await window.electronAPI.meddraSearch(options);
      if (result.success && result.data) {
        set({ searchResults: result.data });
      } else {
        set({ searchResults: [] });
      }
    } catch (error) {
      console.error('Failed to search MedDRA:', error);
      set({ searchResults: [] });
    } finally {
      set({ searchLoading: false });
    }
  },

  clearSearch: () => {
    set({ searchResults: [], searchQuery: '' });
  },

  // Hierarchy browsing
  loadTreeChildren: async (request: MedDRABrowseRequest) => {
    set({ browseLoading: true });
    try {
      const result = await window.electronAPI.meddraBrowse(request);
      if (result.success && result.data) {
        // If root level, set tree data
        if (!request.parentCode) {
          set({ treeData: result.data });
        }
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to load tree children:', error);
      return [];
    } finally {
      set({ browseLoading: false });
    }
  },

  setExpandedKeys: (keys: string[]) => {
    set({ expandedKeys: keys });
  },

  loadHierarchy: async (ptCode: number) => {
    try {
      const result = await window.electronAPI.meddraHierarchy(ptCode);
      if (result.success && result.data) {
        set({ selectedHierarchy: result.data });
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to load hierarchy:', error);
      return [];
    }
  },

  loadHierarchyForLLT: async (lltCode: number) => {
    try {
      const result = await window.electronAPI.meddraHierarchyLLT(lltCode);
      if (result.success && result.data) {
        set({ selectedHierarchy: result.data });
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to load LLT hierarchy:', error);
      return [];
    }
  },

  clearHierarchy: () => {
    set({ selectedHierarchy: null });
  },

  // Import
  selectFolder: async () => {
    try {
      const result = await window.electronAPI.meddraSelectFolder();
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
    set({ importing: true, importProgress: { status: 'pending', filesProcessed: 0, totalFiles: 8, recordsImported: 0 } });
    try {
      const result = await window.electronAPI.meddraImport(
        { version, releaseDate, filePaths: filePaths as any },
        importedBy
      );
      if (result.success && result.data) {
        await get().loadVersions();
        await get().loadActiveVersion();
        set({ importing: false, importProgress: { status: 'completed', filesProcessed: 8, totalFiles: 8, recordsImported: 0 } });
        return result.data;
      }
      set({ importing: false, importProgress: { status: 'failed', filesProcessed: 0, totalFiles: 8, recordsImported: 0, error: result.error } });
      return null;
    } catch (error) {
      console.error('Failed to import MedDRA:', error);
      set({ importing: false, importProgress: { status: 'failed', filesProcessed: 0, totalFiles: 8, recordsImported: 0, error: error instanceof Error ? error.message : 'Unknown error' } });
      return null;
    }
  },

  getImportProgress: async () => {
    try {
      const result = await window.electronAPI.meddraImportProgress();
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
  createCoding: async (lltCode: number, verbatimText: string, codedBy?: string) => {
    try {
      const result = await window.electronAPI.meddraCode(lltCode, verbatimText, codedBy);
      if (result.success) {
        return result.data || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to create coding:', error);
      return null;
    }
  },

  createCodingFromPT: async (ptCode: number, verbatimText: string, codedBy?: string) => {
    try {
      const result = await window.electronAPI.meddraCodePT(ptCode, verbatimText, codedBy);
      if (result.success) {
        return result.data || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to create PT coding:', error);
      return null;
    }
  }
}));
