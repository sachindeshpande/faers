/**
 * Import Store
 * Zustand store for bulk import state management
 */

import { create } from 'zustand';
import type {
  ImportJob,
  ImportJobListItem,
  ColumnMapping,
  ImportValidationSummary,
  ImportExecuteOptions,
  ImportExecuteResult,
  ImportUploadResponse,
  SavedColumnMapping
} from '../../shared/types/import.types';

// Import wizard step
export type ImportWizardStep = 'upload' | 'mapping' | 'validation' | 'execution' | 'complete';

interface ImportState {
  // Current import job
  currentJob: ImportJob | null;
  uploadResponse: ImportUploadResponse | null;

  // Wizard state
  wizardStep: ImportWizardStep;

  // Column mapping
  columnMapping: ColumnMapping[];
  savedMappings: SavedColumnMapping[];
  selectedMappingId: number | null;

  // Validation state
  validationResult: ImportValidationSummary | null;
  isValidating: boolean;

  // Execution state
  executionResult: ImportExecuteResult | null;
  isExecuting: boolean;

  // Job list
  jobs: ImportJobListItem[];
  jobsTotal: number;

  // Errors
  errors: Array<{ rowNumber: number; errors: string[] }>;

  // Loading states
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;

  // Actions
  setCurrentJob: (job: ImportJob | null) => void;
  setUploadResponse: (response: ImportUploadResponse | null) => void;
  setWizardStep: (step: ImportWizardStep) => void;
  setColumnMapping: (mapping: ColumnMapping[]) => void;
  updateColumnMapping: (index: number, update: Partial<ColumnMapping>) => void;
  setSavedMappings: (mappings: SavedColumnMapping[]) => void;
  setSelectedMappingId: (id: number | null) => void;
  setValidationResult: (result: ImportValidationSummary | null) => void;
  setIsValidating: (isValidating: boolean) => void;
  setExecutionResult: (result: ImportExecuteResult | null) => void;
  setIsExecuting: (isExecuting: boolean) => void;
  setJobs: (jobs: ImportJobListItem[], total: number) => void;
  setErrors: (errors: Array<{ rowNumber: number; errors: string[] }>) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsUploading: (isUploading: boolean) => void;
  setError: (error: string | null) => void;
  resetWizard: () => void;

  // Async actions
  uploadFile: (filePath?: string) => Promise<ImportUploadResponse | null>;
  setMapping: (jobId: number, mapping: ColumnMapping[]) => Promise<boolean>;
  validateImport: (jobId: number) => Promise<ImportValidationSummary | null>;
  executeImport: (jobId: number, options: ImportExecuteOptions) => Promise<ImportExecuteResult | null>;
  loadJob: (jobId: number) => Promise<ImportJob | null>;
  loadJobs: (limit?: number, offset?: number) => Promise<void>;
  loadErrors: (jobId: number) => Promise<void>;
  cancelImport: (jobId: number) => Promise<boolean>;
  loadSavedMappings: () => Promise<void>;
  saveMapping: (name: string, description?: string) => Promise<SavedColumnMapping | null>;
  deleteMapping: (id: number) => Promise<boolean>;
  applyMapping: (mappingId: number) => void;
}

export const useImportStore = create<ImportState>((set, get) => ({
  // Initial state
  currentJob: null,
  uploadResponse: null,
  wizardStep: 'upload',
  columnMapping: [],
  savedMappings: [],
  selectedMappingId: null,
  validationResult: null,
  isValidating: false,
  executionResult: null,
  isExecuting: false,
  jobs: [],
  jobsTotal: 0,
  errors: [],
  isLoading: false,
  isUploading: false,
  error: null,

  // Simple setters
  setCurrentJob: (job) => set({ currentJob: job }),
  setUploadResponse: (response) => set({ uploadResponse: response }),
  setWizardStep: (step) => set({ wizardStep: step }),
  setColumnMapping: (mapping) => set({ columnMapping: mapping }),
  updateColumnMapping: (index, update) => {
    const { columnMapping } = get();
    const newMapping = [...columnMapping];
    if (newMapping[index]) {
      newMapping[index] = { ...newMapping[index], ...update };
      set({ columnMapping: newMapping });
    }
  },
  setSavedMappings: (mappings) => set({ savedMappings: mappings }),
  setSelectedMappingId: (id) => set({ selectedMappingId: id }),
  setValidationResult: (result) => set({ validationResult: result }),
  setIsValidating: (isValidating) => set({ isValidating }),
  setExecutionResult: (result) => set({ executionResult: result }),
  setIsExecuting: (isExecuting) => set({ isExecuting }),
  setJobs: (jobs, total) => set({ jobs, jobsTotal: total }),
  setErrors: (errors) => set({ errors }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsUploading: (isUploading) => set({ isUploading }),
  setError: (error) => set({ error }),

  resetWizard: () => set({
    currentJob: null,
    uploadResponse: null,
    wizardStep: 'upload',
    columnMapping: [],
    selectedMappingId: null,
    validationResult: null,
    executionResult: null,
    errors: [],
    error: null
  }),

  // Async actions
  uploadFile: async (filePath) => {
    set({ isUploading: true, error: null });
    try {
      const result = await window.electronAPI.importUpload(filePath);
      if (result.success && result.data) {
        const uploadResponse = result.data;

        // Initialize column mapping from source columns
        const initialMapping: ColumnMapping[] = uploadResponse.sourceColumns.map(col => ({
          sourceColumn: col,
          targetField: '',
          transformation: undefined,
          defaultValue: undefined
        }));

        set({
          uploadResponse,
          columnMapping: initialMapping,
          wizardStep: 'mapping',
          isUploading: false
        });

        // Load the job
        const jobResult = await window.electronAPI.importGet(uploadResponse.jobId);
        if (jobResult.success && jobResult.data) {
          set({ currentJob: jobResult.data });
        }

        return uploadResponse;
      } else {
        set({ error: result.error || 'Upload failed', isUploading: false });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Upload failed';
      set({ error, isUploading: false });
      return null;
    }
  },

  setMapping: async (jobId, mapping) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.importSetMapping(jobId, mapping);
      if (result.success && result.data) {
        set({ currentJob: result.data, columnMapping: mapping, isLoading: false });
        return true;
      } else {
        set({ error: result.error || 'Failed to set mapping', isLoading: false });
        return false;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to set mapping';
      set({ error, isLoading: false });
      return false;
    }
  },

  validateImport: async (jobId) => {
    set({ isValidating: true, error: null, validationResult: null });
    try {
      const result = await window.electronAPI.importValidate(jobId);
      if (result.success && result.data) {
        set({
          validationResult: result.data,
          wizardStep: 'validation',
          isValidating: false
        });
        return result.data;
      } else {
        set({ error: result.error || 'Validation failed', isValidating: false });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Validation failed';
      set({ error, isValidating: false });
      return null;
    }
  },

  executeImport: async (jobId, options) => {
    set({ isExecuting: true, error: null, executionResult: null, wizardStep: 'execution' });
    try {
      const result = await window.electronAPI.importExecute(jobId, options);
      if (result.success && result.data) {
        set({
          executionResult: result.data,
          wizardStep: 'complete',
          isExecuting: false
        });
        return result.data;
      } else {
        set({ error: result.error || 'Execution failed', isExecuting: false });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Execution failed';
      set({ error, isExecuting: false });
      return null;
    }
  },

  loadJob: async (jobId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.importGet(jobId);
      if (result.success && result.data) {
        const job = result.data;
        set({
          currentJob: job,
          columnMapping: job.columnMapping || [],
          isLoading: false
        });
        return job;
      } else {
        set({ error: result.error || 'Failed to load job', isLoading: false });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load job';
      set({ error, isLoading: false });
      return null;
    }
  },

  loadJobs: async (limit = 20, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.importList(limit, offset);
      if (result.success && result.data) {
        set({
          jobs: result.data.items,
          jobsTotal: result.data.total,
          isLoading: false
        });
      } else {
        set({ error: result.error || 'Failed to load jobs', isLoading: false });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load jobs';
      set({ error, isLoading: false });
    }
  },

  loadErrors: async (jobId) => {
    try {
      const result = await window.electronAPI.importGetErrors(jobId);
      if (result.success && result.data) {
        set({ errors: result.data });
      }
    } catch (err) {
      console.error('Failed to load import errors:', err);
    }
  },

  cancelImport: async (jobId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.importCancel(jobId);
      if (result.success) {
        set({ isLoading: false });
        // Reload jobs list
        get().loadJobs();
        return true;
      } else {
        set({ error: result.error || 'Failed to cancel import', isLoading: false });
        return false;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to cancel import';
      set({ error, isLoading: false });
      return false;
    }
  },

  loadSavedMappings: async () => {
    try {
      const result = await window.electronAPI.importListMappings();
      if (result.success && result.data) {
        set({ savedMappings: result.data });
      }
    } catch (err) {
      console.error('Failed to load saved mappings:', err);
    }
  },

  saveMapping: async (name, description) => {
    const { columnMapping } = get();
    try {
      const result = await window.electronAPI.importSaveMapping(name, description, columnMapping);
      if (result.success && result.data) {
        // Refresh saved mappings
        get().loadSavedMappings();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to save mapping:', err);
      return null;
    }
  },

  deleteMapping: async (id) => {
    try {
      const result = await window.electronAPI.importDeleteMapping(id);
      if (result.success) {
        // Refresh saved mappings
        get().loadSavedMappings();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete mapping:', err);
      return false;
    }
  },

  applyMapping: (mappingId) => {
    const { savedMappings, uploadResponse } = get();
    const mapping = savedMappings.find(m => m.id === mappingId);
    if (mapping && uploadResponse) {
      // Apply saved mapping to current source columns
      const newMapping: ColumnMapping[] = uploadResponse.sourceColumns.map(sourceCol => {
        const savedCol = mapping.mapping.find(m => m.sourceColumn === sourceCol);
        return savedCol || {
          sourceColumn: sourceCol,
          targetField: '',
          transformation: undefined,
          defaultValue: undefined
        };
      });
      set({ columnMapping: newMapping, selectedMappingId: mappingId });
    }
  }
}));
