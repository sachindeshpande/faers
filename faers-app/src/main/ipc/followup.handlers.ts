/**
 * Follow-up IPC Handlers
 * Phase 4: Follow-Up Reports and Nullification Reports
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { FollowupService } from '../services/followupService';
import type {
  CreateFollowupRequest,
  CreateNullificationRequest
} from '../../shared/types/followup.types';
import { getDatabase } from '../database/connection';
import { AuthService } from '../services/authService';

let followupService: FollowupService;

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
function getService(): FollowupService {
  if (!followupService) {
    const db = getDatabase();
    followupService = new FollowupService(db);
  }
  return followupService;
}

/**
 * Register all follow-up IPC handlers
 */
export function registerFollowupHandlers(): void {
  // Create a follow-up case
  ipcMain.handle(
    IPC_CHANNELS.FOLLOWUP_CREATE,
    async (_event, request: CreateFollowupRequest) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const result = service.createFollowup(
          request,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating follow-up:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create follow-up'
        };
      }
    }
  );

  // Get version chain for a case
  ipcMain.handle(IPC_CHANNELS.FOLLOWUP_GET_CHAIN, async (_event, caseId: string) => {
    try {
      const service = getService();
      const chain = service.getVersionChain(caseId);
      return { success: true, data: chain };
    } catch (error) {
      console.error('Error getting version chain:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version chain'
      };
    }
  });

  // Compare two versions
  ipcMain.handle(
    IPC_CHANNELS.FOLLOWUP_COMPARE,
    async (_event, fromCaseId: string, toCaseId: string) => {
      try {
        const service = getService();
        const comparison = service.compareVersions(fromCaseId, toCaseId);
        return { success: true, data: comparison };
      } catch (error) {
        console.error('Error comparing versions:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to compare versions'
        };
      }
    }
  );

  // Create a nullification report
  ipcMain.handle(
    IPC_CHANNELS.NULLIFICATION_CREATE,
    async (_event, request: CreateNullificationRequest) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const result = service.createNullification(
          request,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating nullification:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create nullification'
        };
      }
    }
  );

  // Get follow-up due date
  ipcMain.handle(IPC_CHANNELS.FOLLOWUP_GET_DUE_DATE, async (_event, caseId: string) => {
    try {
      const service = getService();
      const dueDate = service.getFollowupDueDate(caseId);
      return { success: true, data: dueDate };
    } catch (error) {
      console.error('Error getting follow-up due date:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get due date'
      };
    }
  });

  // Check if follow-up can be created
  ipcMain.handle(IPC_CHANNELS.FOLLOWUP_CAN_CREATE, async (_event, caseId: string) => {
    try {
      const service = getService();
      const result = service.canCreateFollowup(caseId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error checking follow-up eligibility:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check eligibility'
      };
    }
  });

  // Check if case can be nullified
  ipcMain.handle(IPC_CHANNELS.NULLIFICATION_CAN_CREATE, async (_event, caseId: string) => {
    try {
      const service = getService();
      const result = service.canNullify(caseId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error checking nullification eligibility:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check eligibility'
      };
    }
  });
}
