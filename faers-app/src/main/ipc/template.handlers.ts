/**
 * Template IPC Handlers
 * Handles IPC communication for case template operations
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { TemplateService } from '../services/templateService';
import type {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateFilter
} from '../../shared/types/template.types';
import type { Case } from '../../shared/types/case.types';

export function registerTemplateHandlers(templateService: TemplateService): void {
  // Get templates list
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_LIST,
    async (_event, filter?: TemplateFilter, limit?: number, offset?: number) => {
      try {
        const result = templateService.getTemplates(filter, limit, offset);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error getting templates:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Get single template
  ipcMain.handle(IPC_CHANNELS.TEMPLATE_GET, async (_event, id: number) => {
    try {
      const result = templateService.getTemplate(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting template:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Create template
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_CREATE,
    async (_event, request: CreateTemplateRequest) => {
      try {
        const result = templateService.createTemplate(request);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating template:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Update template
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_UPDATE,
    async (_event, request: UpdateTemplateRequest) => {
      try {
        const result = templateService.updateTemplate(request);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error updating template:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Delete template
  ipcMain.handle(IPC_CHANNELS.TEMPLATE_DELETE, async (_event, id: number) => {
    try {
      const result = templateService.deleteTemplate(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error deleting template:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Apply template (get template data for new case)
  ipcMain.handle(IPC_CHANNELS.TEMPLATE_APPLY, async (_event, templateId: number) => {
    try {
      const result = templateService.applyTemplate(templateId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error applying template:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Approve template
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_APPROVE,
    async (_event, id: number, approvedBy?: string) => {
      try {
        const result = templateService.approveTemplate(id, approvedBy || '');
        return { success: true, data: result };
      } catch (error) {
        console.error('Error approving template:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Create template from existing case
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_CREATE_FROM_CASE,
    async (
      _event,
      caseData: Case,
      name: string,
      description?: string,
      category?: string,
      createdBy?: string
    ) => {
      try {
        const result = templateService.createTemplateFromCase(
          caseData,
          name,
          description,
          category,
          createdBy
        );
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating template from case:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );
}
