/**
 * PSR IPC Handlers
 * Phase 4: Periodic Safety Report Management
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { PSRService } from '../services/psrService';
import type {
  PSRFilter,
  CreatePSRScheduleDTO,
  UpdatePSRScheduleDTO,
  CreatePSRDTO,
  PSRStatus,
  UpdatePSRCasesRequest,
  PSRTransitionRequest
} from '../../shared/types/psr.types';
import { getDatabase } from '../database/connection';
import { AuthService } from '../services/authService';

let psrService: PSRService;

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
function getService(): PSRService {
  if (!psrService) {
    const db = getDatabase();
    psrService = new PSRService(db);
  }
  return psrService;
}

/**
 * Register all PSR IPC handlers
 */
export function registerPSRHandlers(): void {
  // ============================================================
  // Schedule Handlers
  // ============================================================

  // Create schedule
  ipcMain.handle(
    IPC_CHANNELS.PSR_SCHEDULE_CREATE,
    async (_event, data: CreatePSRScheduleDTO) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const schedule = service.createSchedule(
          data,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true, data: schedule };
      } catch (error) {
        console.error('Error creating PSR schedule:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create schedule'
        };
      }
    }
  );

  // Get schedule
  ipcMain.handle(IPC_CHANNELS.PSR_SCHEDULE_GET, async (_event, productId: number) => {
    try {
      const service = getService();
      const schedules = service.getSchedulesByProduct(productId);
      return { success: true, data: schedules };
    } catch (error) {
      console.error('Error getting PSR schedules:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get schedules'
      };
    }
  });

  // Update schedule
  ipcMain.handle(
    IPC_CHANNELS.PSR_SCHEDULE_UPDATE,
    async (_event, id: number, data: UpdatePSRScheduleDTO) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const schedule = service.updateSchedule(
          id,
          data,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true, data: schedule };
      } catch (error) {
        console.error('Error updating PSR schedule:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update schedule'
        };
      }
    }
  );

  // Delete schedule
  ipcMain.handle(IPC_CHANNELS.PSR_SCHEDULE_DELETE, async (_event, id: number) => {
    try {
      const auth = getCurrentAuthContext();
      const service = getService();
      const deleted = service.deleteSchedule(
        id,
        auth.user?.id,
        auth.user?.username,
        auth.sessionId || undefined
      );
      return { success: true, data: deleted };
    } catch (error) {
      console.error('Error deleting PSR schedule:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete schedule'
      };
    }
  });

  // Get next period
  ipcMain.handle(IPC_CHANNELS.PSR_SCHEDULE_GET_NEXT_PERIOD, async (_event, scheduleId: number) => {
    try {
      const service = getService();
      const schedules = service.getActiveSchedules();
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) {
        return { success: false, error: 'Schedule not found' };
      }
      const period = service.getNextPeriod(schedule);
      return { success: true, data: period };
    } catch (error) {
      console.error('Error getting next PSR period:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get next period'
      };
    }
  });

  // ============================================================
  // PSR Handlers
  // ============================================================

  // Create PSR
  ipcMain.handle(IPC_CHANNELS.PSR_CREATE, async (_event, data: CreatePSRDTO) => {
    try {
      const auth = getCurrentAuthContext();
      const service = getService();
      const psr = service.createPSR(
        data,
        auth.user?.id,
        auth.user?.username,
        auth.sessionId || undefined
      );
      return { success: true, data: psr };
    } catch (error) {
      console.error('Error creating PSR:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create PSR'
      };
    }
  });

  // Get PSR
  ipcMain.handle(IPC_CHANNELS.PSR_GET, async (_event, id: number) => {
    try {
      const service = getService();
      const psr = service.getPSR(id);
      if (!psr) {
        return { success: false, error: 'PSR not found' };
      }
      return { success: true, data: psr };
    } catch (error) {
      console.error('Error getting PSR:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get PSR'
      };
    }
  });

  // List PSRs
  ipcMain.handle(
    IPC_CHANNELS.PSR_LIST,
    async (_event, filter?: PSRFilter, limit?: number, offset?: number) => {
      try {
        const service = getService();
        const result = service.listPSRs(filter, limit, offset);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error listing PSRs:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list PSRs'
        };
      }
    }
  );

  // Transition PSR status
  ipcMain.handle(
    IPC_CHANNELS.PSR_TRANSITION,
    async (_event, request: PSRTransitionRequest) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const psr = service.transitionPSR(
          request.psrId,
          request.toStatus,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined,
          request.comment
        );
        return { success: true, data: psr };
      } catch (error) {
        console.error('Error transitioning PSR:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to transition PSR'
        };
      }
    }
  );

  // ============================================================
  // PSR Cases Handlers
  // ============================================================

  // Get PSR cases
  ipcMain.handle(IPC_CHANNELS.PSR_GET_CASES, async (_event, psrId: number) => {
    try {
      const service = getService();
      const cases = service.getPSRCases(psrId);
      return { success: true, data: cases };
    } catch (error) {
      console.error('Error getting PSR cases:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get PSR cases'
      };
    }
  });

  // Get eligible cases for PSR
  ipcMain.handle(IPC_CHANNELS.PSR_GET_ELIGIBLE_CASES, async (_event, psrId: number) => {
    try {
      const service = getService();
      const cases = service.getEligibleCases(psrId);
      return { success: true, data: cases };
    } catch (error) {
      console.error('Error getting eligible cases:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get eligible cases'
      };
    }
  });

  // Update PSR cases
  ipcMain.handle(
    IPC_CHANNELS.PSR_UPDATE_CASES,
    async (_event, request: UpdatePSRCasesRequest) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();

        if (request.includeCases && request.includeCases.length > 0) {
          service.addCasesToPSR(
            request.psrId,
            request.includeCases,
            auth.user?.id,
            auth.user?.username,
            auth.sessionId || undefined
          );
        }

        if (request.excludeCases && request.excludeCases.length > 0) {
          service.excludeCasesFromPSR(
            request.psrId,
            request.excludeCases,
            auth.user?.id,
            auth.user?.username,
            auth.sessionId || undefined
          );
        }

        const psr = service.getPSR(request.psrId);
        return { success: true, data: psr };
      } catch (error) {
        console.error('Error updating PSR cases:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update PSR cases'
        };
      }
    }
  );

  // ============================================================
  // Dashboard Handler
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.PSR_DASHBOARD, async () => {
    try {
      const service = getService();
      const summary = service.getDashboardSummary();
      return { success: true, data: summary };
    } catch (error) {
      console.error('Error getting PSR dashboard:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dashboard'
      };
    }
  });
}
