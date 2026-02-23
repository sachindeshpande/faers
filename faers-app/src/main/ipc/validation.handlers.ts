/**
 * Validation IPC Handlers
 * Handles IPC communication for validation engine operations
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { ValidationEngineService } from '../services/validationEngineService';
import { CaseRepository } from '../database/repositories/case.repository';
import type Database from 'better-sqlite3';
import type {
  ValidationRuleFilter,
  CreateValidationRuleRequest,
  UpdateValidationRuleRequest,
  TestRuleRequest,
  AcknowledgeWarningRequest
} from '../../shared/types/validation.types';

export function registerValidationHandlers(
  validationService: ValidationEngineService,
  db: Database.Database
): void {
  const caseRepo = new CaseRepository(db);

  // Run validation on a case
  ipcMain.handle(IPC_CHANNELS.VALIDATION_RUN, async (_event, caseId: string) => {
    try {
      // Load case data
      const caseData = caseRepo.findById(caseId);
      if (!caseData) {
        return { success: false, error: `Case not found: ${caseId}` };
      }

      const result = validationService.runValidation(caseData);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error running validation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Acknowledge warnings
  ipcMain.handle(
    IPC_CHANNELS.VALIDATION_ACKNOWLEDGE,
    async (_event, request: AcknowledgeWarningRequest) => {
      try {
        validationService.acknowledgeWarnings(request);
        return { success: true, data: undefined };
      } catch (error) {
        console.error('Error acknowledging warnings:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Get validation results
  ipcMain.handle(IPC_CHANNELS.VALIDATION_GET_RESULTS, async (_event, caseId: string) => {
    try {
      const result = validationService.getValidationResults(caseId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting validation results:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // List validation rules
  ipcMain.handle(
    IPC_CHANNELS.VALIDATION_RULES_LIST,
    async (_event, filter?: ValidationRuleFilter) => {
      try {
        const result = validationService.getRules(filter);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error listing validation rules:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Get a single validation rule
  ipcMain.handle(IPC_CHANNELS.VALIDATION_RULE_GET, async (_event, id: number) => {
    try {
      const result = validationService.getRule(id);
      if (!result) {
        return { success: false, error: 'Rule not found' };
      }
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting validation rule:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Create a validation rule
  ipcMain.handle(
    IPC_CHANNELS.VALIDATION_RULE_CREATE,
    async (_event, request: CreateValidationRuleRequest, createdBy?: string) => {
      try {
        const result = validationService.createRule(request, createdBy);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating validation rule:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Update a validation rule
  ipcMain.handle(
    IPC_CHANNELS.VALIDATION_RULE_UPDATE,
    async (_event, request: UpdateValidationRuleRequest) => {
      try {
        const result = validationService.updateRule(request);
        if (!result) {
          return { success: false, error: 'Failed to update rule' };
        }
        return { success: true, data: result };
      } catch (error) {
        console.error('Error updating validation rule:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Delete a validation rule
  ipcMain.handle(IPC_CHANNELS.VALIDATION_RULE_DELETE, async (_event, id: number) => {
    try {
      const result = validationService.deleteRule(id);
      if (!result) {
        return { success: false, error: 'Cannot delete system rule or rule not found' };
      }
      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error deleting validation rule:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Test a validation rule
  ipcMain.handle(
    IPC_CHANNELS.VALIDATION_RULE_TEST,
    async (_event, request: TestRuleRequest) => {
      try {
        const result = validationService.testRule(request);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error testing validation rule:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Toggle rule active status
  ipcMain.handle(
    IPC_CHANNELS.VALIDATION_RULE_TOGGLE,
    async (_event, id: number, isActive: boolean) => {
      try {
        const result = validationService.toggleRule(id, isActive);
        if (!result) {
          return { success: false, error: 'Rule not found' };
        }
        return { success: true, data: result };
      } catch (error) {
        console.error('Error toggling validation rule:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );
}
