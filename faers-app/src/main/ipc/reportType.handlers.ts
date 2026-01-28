/**
 * Report Type IPC Handlers
 * Phase 4: Report Type Classification (Expedited vs Non-Expedited)
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { ReportTypeService, type ClassificationUpdate, type Expectedness } from '../services/reportTypeService';
import type { SeriousnessCriterion } from '../database/repositories/seriousness.repository';
import { getDatabase } from '../database/connection';
import { AuthService } from '../services/authService';

let reportTypeService: ReportTypeService;

/**
 * Get current auth context from session
 */
function getCurrentAuthContext(): {
  user: { id: string; username: string } | null;
  permissions: string[];
  sessionId: string | null;
} {
  const sessionId = getCurrentSessionId();
  if (!sessionId) {
    return { user: null, permissions: [], sessionId: null };
  }

  try {
    const db = getDatabase();
    const authService = new AuthService(db);
    const session = authService.validateSession(sessionId);
    if (!session) {
      return { user: null, permissions: [], sessionId };
    }

    return {
      user: session.user ? { id: session.user.id, username: session.user.username } : null,
      permissions: session.permissions || [],
      sessionId
    };
  } catch {
    return { user: null, permissions: [], sessionId };
  }
}

let currentSessionId: string | null = null;

export function setCurrentSessionId(sessionId: string | null): void {
  currentSessionId = sessionId;
}

export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

/**
 * Initialize service
 */
function getService(): ReportTypeService {
  if (!reportTypeService) {
    const db = getDatabase();
    reportTypeService = new ReportTypeService(db);
  }
  return reportTypeService;
}

/**
 * Register all report type IPC handlers
 */
export function registerReportTypeHandlers(): void {
  // Get classification for a case
  ipcMain.handle(IPC_CHANNELS.REPORT_TYPE_GET, async (_event, caseId: string) => {
    try {
      const service = getService();
      const classification = service.getClassification(caseId);

      if (!classification) {
        return { success: false, error: 'Case not found' };
      }

      return { success: true, data: classification };
    } catch (error) {
      console.error('Error getting classification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get classification'
      };
    }
  });

  // Get classification suggestion
  ipcMain.handle(IPC_CHANNELS.REPORT_TYPE_SUGGEST, async (_event, caseId: string) => {
    try {
      const service = getService();
      const suggestion = service.suggest(caseId);
      return { success: true, data: suggestion };
    } catch (error) {
      console.error('Error getting classification suggestion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get suggestion'
      };
    }
  });

  // Apply classification to a case
  ipcMain.handle(
    IPC_CHANNELS.REPORT_TYPE_CLASSIFY,
    async (_event, caseId: string, classification: ClassificationUpdate) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const result = service.classify(
          caseId,
          classification,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true, data: result };
      } catch (error) {
        console.error('Error classifying case:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to classify case'
        };
      }
    }
  );

  // Get seriousness criteria for a case
  ipcMain.handle(IPC_CHANNELS.SERIOUSNESS_GET, async (_event, caseId: string) => {
    try {
      const service = getService();
      const criteria = service.getSeriousness(caseId);
      return { success: true, data: criteria };
    } catch (error) {
      console.error('Error getting seriousness:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get seriousness'
      };
    }
  });

  // Set a single seriousness criterion
  ipcMain.handle(
    IPC_CHANNELS.SERIOUSNESS_SET,
    async (
      _event,
      caseId: string,
      criterion: SeriousnessCriterion,
      isChecked: boolean,
      notes?: string
    ) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const result = service.setSeriousnessCriterion(
          caseId,
          criterion,
          isChecked,
          notes,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true, data: result };
      } catch (error) {
        console.error('Error setting seriousness:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set seriousness'
        };
      }
    }
  );

  // Set all seriousness criteria at once
  ipcMain.handle(
    IPC_CHANNELS.SERIOUSNESS_SET_ALL,
    async (
      _event,
      caseId: string,
      criteria: Array<{ criterion: SeriousnessCriterion; isChecked: boolean; notes?: string }>
    ) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const results = service.setAllSeriousness(
          caseId,
          criteria,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true, data: results };
      } catch (error) {
        console.error('Error setting all seriousness:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set seriousness'
        };
      }
    }
  );

  // Set expectedness for a case
  ipcMain.handle(
    IPC_CHANNELS.EXPECTEDNESS_SET,
    async (
      _event,
      caseId: string,
      expectedness: Expectedness,
      justification?: string
    ) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        service.setExpectedness(
          caseId,
          expectedness,
          justification,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true };
      } catch (error) {
        console.error('Error setting expectedness:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set expectedness'
        };
      }
    }
  );

  // Check if a case is expedited
  ipcMain.handle(IPC_CHANNELS.REPORT_TYPE_IS_EXPEDITED, async (_event, caseId: string) => {
    try {
      const service = getService();
      const isExpedited = service.isExpedited(caseId);
      return { success: true, data: isExpedited };
    } catch (error) {
      console.error('Error checking expedited status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check expedited status'
      };
    }
  });

  // Get due date for a case
  ipcMain.handle(
    IPC_CHANNELS.REPORT_TYPE_GET_DUE_DATE,
    async (_event, caseId: string, awarenessDate?: string) => {
      try {
        const service = getService();
        const date = awarenessDate ? new Date(awarenessDate) : new Date();
        const dueDate = service.getDueDate(caseId, date);
        return { success: true, data: dueDate?.toISOString() || null };
      } catch (error) {
        console.error('Error getting due date:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get due date'
        };
      }
    }
  );
}
