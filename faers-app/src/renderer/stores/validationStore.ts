/**
 * Validation Store
 * Zustand store for validation engine state management
 */

import { create } from 'zustand';
import type {
  ValidationRule,
  ValidationRuleListItem,
  ValidationSummary,
  ValidationRuleFilter,
  CreateValidationRuleRequest,
  UpdateValidationRuleRequest,
  TestRuleRequest,
  TestRuleResult
} from '../../shared/types/validation.types';

interface ValidationState {
  // Rules
  rules: ValidationRuleListItem[];
  currentRule: ValidationRule | null;
  ruleFilter: ValidationRuleFilter;

  // Validation results
  currentValidation: ValidationSummary | null;
  validatingCaseId: string | null;

  // Test results
  testResult: TestRuleResult | null;

  // Loading states
  isLoading: boolean;
  isValidating: boolean;
  isTesting: boolean;
  error: string | null;

  // Actions
  setRules: (rules: ValidationRuleListItem[]) => void;
  setCurrentRule: (rule: ValidationRule | null) => void;
  setRuleFilter: (filter: ValidationRuleFilter) => void;
  setCurrentValidation: (validation: ValidationSummary | null) => void;
  setTestResult: (result: TestRuleResult | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsValidating: (isValidating: boolean) => void;
  setIsTesting: (isTesting: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions
  loadRules: (filter?: ValidationRuleFilter) => Promise<void>;
  loadRule: (id: number) => Promise<ValidationRule | null>;
  createRule: (request: CreateValidationRuleRequest) => Promise<ValidationRule | null>;
  updateRule: (request: UpdateValidationRuleRequest) => Promise<ValidationRule | null>;
  deleteRule: (id: number) => Promise<boolean>;
  toggleRule: (id: number, isActive: boolean) => Promise<ValidationRule | null>;
  runValidation: (caseId: string) => Promise<ValidationSummary | null>;
  getValidationResults: (caseId: string) => Promise<ValidationSummary | null>;
  acknowledgeWarnings: (caseId: string, resultIds: number[], notes?: string) => Promise<boolean>;
  testRule: (request: TestRuleRequest) => Promise<TestRuleResult | null>;
}

export const useValidationStore = create<ValidationState>((set, get) => ({
  // Initial state
  rules: [],
  currentRule: null,
  ruleFilter: {},
  currentValidation: null,
  validatingCaseId: null,
  testResult: null,
  isLoading: false,
  isValidating: false,
  isTesting: false,
  error: null,

  // Simple setters
  setRules: (rules) => set({ rules }),
  setCurrentRule: (rule) => set({ currentRule: rule }),
  setRuleFilter: (filter) => set({ ruleFilter: filter }),
  setCurrentValidation: (validation) => set({ currentValidation: validation }),
  setTestResult: (result) => set({ testResult: result }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsValidating: (isValidating) => set({ isValidating }),
  setIsTesting: (isTesting) => set({ isTesting }),
  setError: (error) => set({ error }),

  // Async actions
  loadRules: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.getValidationRules(filter || get().ruleFilter);
      if (result.success && result.data) {
        set({ rules: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Failed to load rules', isLoading: false });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load rules';
      set({ error, isLoading: false });
    }
  },

  loadRule: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.getValidationRule(id);
      if (result.success && result.data) {
        set({ currentRule: result.data, isLoading: false });
        return result.data;
      } else {
        set({ error: result.error || 'Failed to load rule', isLoading: false });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load rule';
      set({ error, isLoading: false });
      return null;
    }
  },

  createRule: async (request) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.createValidationRule(request);
      if (result.success && result.data) {
        set({ isLoading: false });
        // Reload rules list
        get().loadRules();
        return result.data;
      } else {
        set({ error: result.error || 'Failed to create rule', isLoading: false });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create rule';
      set({ error, isLoading: false });
      return null;
    }
  },

  updateRule: async (request) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.updateValidationRule(request);
      if (result.success && result.data) {
        set({ currentRule: result.data, isLoading: false });
        // Reload rules list
        get().loadRules();
        return result.data;
      } else {
        set({ error: result.error || 'Failed to update rule', isLoading: false });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update rule';
      set({ error, isLoading: false });
      return null;
    }
  },

  deleteRule: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.deleteValidationRule(id);
      if (result.success) {
        set({ isLoading: false });
        // Reload rules list
        get().loadRules();
        return true;
      } else {
        set({ error: result.error || 'Failed to delete rule', isLoading: false });
        return false;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete rule';
      set({ error, isLoading: false });
      return false;
    }
  },

  toggleRule: async (id, isActive) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.toggleValidationRule(id, isActive);
      if (result.success && result.data) {
        set({ isLoading: false });
        // Reload rules list
        get().loadRules();
        return result.data;
      } else {
        set({ error: result.error || 'Failed to toggle rule', isLoading: false });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to toggle rule';
      set({ error, isLoading: false });
      return null;
    }
  },

  runValidation: async (caseId) => {
    set({ isValidating: true, validatingCaseId: caseId, error: null });
    try {
      const result = await window.electronAPI.runValidation(caseId);
      if (result.success && result.data) {
        set({ currentValidation: result.data, isValidating: false, validatingCaseId: null });
        return result.data;
      } else {
        set({ error: result.error || 'Validation failed', isValidating: false, validatingCaseId: null });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Validation failed';
      set({ error, isValidating: false, validatingCaseId: null });
      return null;
    }
  },

  getValidationResults: async (caseId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.getValidationResults(caseId);
      if (result.success && result.data) {
        set({ currentValidation: result.data, isLoading: false });
        return result.data;
      } else {
        set({ error: result.error || 'Failed to get results', isLoading: false });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to get results';
      set({ error, isLoading: false });
      return null;
    }
  },

  acknowledgeWarnings: async (caseId, resultIds, notes) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.acknowledgeWarnings({
        caseId,
        resultIds,
        notes
      });
      if (result.success) {
        set({ isLoading: false });
        // Reload validation results
        get().getValidationResults(caseId);
        return true;
      } else {
        set({ error: result.error || 'Failed to acknowledge', isLoading: false });
        return false;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to acknowledge';
      set({ error, isLoading: false });
      return false;
    }
  },

  testRule: async (request) => {
    set({ isTesting: true, error: null, testResult: null });
    try {
      const result = await window.electronAPI.testValidationRule(request);
      if (result.success && result.data) {
        set({ testResult: result.data, isTesting: false });
        return result.data;
      } else {
        set({ error: result.error || 'Test failed', isTesting: false });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Test failed';
      set({ error, isTesting: false });
      return null;
    }
  }
}));
