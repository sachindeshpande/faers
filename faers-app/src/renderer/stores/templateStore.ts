/**
 * Template Store
 * Zustand store for case template state management
 */

import { create } from 'zustand';
import type {
  CaseTemplate,
  TemplateListItem,
  TemplateFilter,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ApplyTemplateResult
} from '../../shared/types/template.types';

interface TemplateState {
  // List state
  templates: TemplateListItem[];
  total: number;
  loading: boolean;
  error: string | null;
  filter: TemplateFilter;

  // Current template for detail/edit
  currentTemplate: CaseTemplate | null;
  templateLoading: boolean;

  // Apply template result
  applyResult: ApplyTemplateResult | null;
  applying: boolean;

  // Actions
  loadTemplates: (filter?: TemplateFilter, limit?: number, offset?: number) => Promise<void>;
  loadTemplate: (id: number) => Promise<void>;
  createTemplate: (request: CreateTemplateRequest) => Promise<CaseTemplate | null>;
  updateTemplate: (request: UpdateTemplateRequest) => Promise<CaseTemplate | null>;
  deleteTemplate: (id: number) => Promise<boolean>;
  approveTemplate: (id: number) => Promise<CaseTemplate | null>;
  applyTemplate: (templateId: number) => Promise<ApplyTemplateResult | null>;
  createFromCase: (caseId: string, name: string, description?: string, category?: string) => Promise<CaseTemplate | null>;
  setFilter: (filter: TemplateFilter) => void;
  clearCurrentTemplate: () => void;
  clearApplyResult: () => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  // Initial state
  templates: [],
  total: 0,
  loading: false,
  error: null,
  filter: {},
  currentTemplate: null,
  templateLoading: false,
  applyResult: null,
  applying: false,

  // Load templates list
  loadTemplates: async (filter?: TemplateFilter, limit = 50, offset = 0) => {
    set({ loading: true, error: null });
    try {
      const effectiveFilter = filter ?? get().filter;
      const response = await window.electronAPI.getTemplates(effectiveFilter, limit, offset);
      if (response.success && response.data) {
        set({
          templates: response.data.items,
          total: response.data.total,
          loading: false,
          filter: effectiveFilter
        });
      } else {
        set({ error: response.error || 'Failed to load templates', loading: false });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false });
    }
  },

  // Load single template
  loadTemplate: async (id: number) => {
    set({ templateLoading: true, error: null });
    try {
      const response = await window.electronAPI.getTemplate(id);
      if (response.success && response.data) {
        set({ currentTemplate: response.data, templateLoading: false });
      } else {
        set({ error: response.error || 'Failed to load template', templateLoading: false });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', templateLoading: false });
    }
  },

  // Create template
  createTemplate: async (request: CreateTemplateRequest) => {
    try {
      const response = await window.electronAPI.createTemplate(request);
      if (response.success && response.data) {
        // Refresh list
        get().loadTemplates();
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Update template
  updateTemplate: async (request: UpdateTemplateRequest) => {
    try {
      const response = await window.electronAPI.updateTemplate(request);
      if (response.success && response.data) {
        // Update current template if viewing
        if (get().currentTemplate?.id === request.id) {
          set({ currentTemplate: response.data });
        }
        // Refresh list
        get().loadTemplates();
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Delete template
  deleteTemplate: async (id: number) => {
    try {
      const response = await window.electronAPI.deleteTemplate(id);
      if (response.success) {
        // Refresh list
        get().loadTemplates();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Approve template
  approveTemplate: async (id: number) => {
    try {
      const response = await window.electronAPI.approveTemplate(id);
      if (response.success && response.data) {
        // Update current template if viewing
        if (get().currentTemplate?.id === id) {
          set({ currentTemplate: response.data });
        }
        // Refresh list
        get().loadTemplates();
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Apply template
  applyTemplate: async (templateId: number) => {
    set({ applying: true, applyResult: null, error: null });
    try {
      const response = await window.electronAPI.applyTemplate(templateId);
      if (response.success && response.data) {
        set({ applyResult: response.data, applying: false });
        return response.data;
      } else {
        set({ error: response.error || 'Failed to apply template', applying: false });
        return null;
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', applying: false });
      return null;
    }
  },

  // Create template from case
  createFromCase: async (caseId: string, name: string, description?: string, category?: string) => {
    try {
      const response = await window.electronAPI.createTemplateFromCase(caseId, name, description, category);
      if (response.success && response.data) {
        // Refresh list
        get().loadTemplates();
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Set filter
  setFilter: (filter: TemplateFilter) => {
    set({ filter });
  },

  // Clear current template
  clearCurrentTemplate: () => {
    set({ currentTemplate: null });
  },

  // Clear apply result
  clearApplyResult: () => {
    set({ applyResult: null });
  }
}));
