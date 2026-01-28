/**
 * Batch IPC Handlers
 * Phase 4: Batch Submission
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { BatchService } from '../services/batchService';
import type {
  CreateBatchRequest,
  BatchFilter,
  BatchType,
  RecordBatchSubmissionRequest,
  RecordBatchAcknowledgmentRequest
} from '../../shared/types/batch.types';
import { getDatabase } from '../database/connection';
import { AuthService } from '../services/authService';

let batchService: BatchService;

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
function getService(): BatchService {
  if (!batchService) {
    const db = getDatabase();
    batchService = new BatchService(db);
  }
  return batchService;
}

/**
 * Register all batch IPC handlers
 */
export function registerBatchHandlers(): void {
  // Create a batch
  ipcMain.handle(
    IPC_CHANNELS.BATCH_CREATE,
    async (_event, request: CreateBatchRequest) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const result = service.createBatch(
          request.batchType,
          request.caseIds,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined,
          request.notes,
          request.submissionMode
        );
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating batch:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create batch'
        };
      }
    }
  );

  // Get batch by ID
  ipcMain.handle(IPC_CHANNELS.BATCH_GET, async (_event, batchId: number) => {
    try {
      const service = getService();
      const batch = service.getBatch(batchId);
      if (!batch) {
        return { success: false, error: 'Batch not found' };
      }
      return { success: true, data: batch };
    } catch (error) {
      console.error('Error getting batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get batch'
      };
    }
  });

  // List batches
  ipcMain.handle(
    IPC_CHANNELS.BATCH_LIST,
    async (_event, filter?: BatchFilter, limit?: number, offset?: number) => {
      try {
        const service = getService();
        const result = service.listBatches(filter, limit, offset);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error listing batches:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list batches'
        };
      }
    }
  );

  // Get cases in a batch
  ipcMain.handle(IPC_CHANNELS.BATCH_GET_CASES, async (_event, batchId: number) => {
    try {
      const service = getService();
      const cases = service.getBatchCases(batchId);
      return { success: true, data: cases };
    } catch (error) {
      console.error('Error getting batch cases:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get batch cases'
      };
    }
  });

  // Validate batch
  ipcMain.handle(IPC_CHANNELS.BATCH_VALIDATE, async (_event, batchId: number) => {
    try {
      const auth = getCurrentAuthContext();
      const service = getService();
      const result = service.validateBatch(
        batchId,
        auth.user?.id,
        auth.user?.username,
        auth.sessionId || undefined
      );
      return { success: true, data: result };
    } catch (error) {
      console.error('Error validating batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate batch'
      };
    }
  });

  // Export batch
  ipcMain.handle(
    IPC_CHANNELS.BATCH_EXPORT,
    async (_event, batchId: number, exportPath: string) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const result = service.exportBatch(
          batchId,
          exportPath,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true, data: result };
      } catch (error) {
        console.error('Error exporting batch:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export batch'
        };
      }
    }
  );

  // Record batch submission
  ipcMain.handle(
    IPC_CHANNELS.BATCH_SUBMIT,
    async (_event, request: RecordBatchSubmissionRequest) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const result = service.recordSubmission(
          request.batchId,
          request.esgCoreId,
          request.submissionDate,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined,
          request.notes
        );
        return { success: true, data: result };
      } catch (error) {
        console.error('Error recording batch submission:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to record submission'
        };
      }
    }
  );

  // Record batch acknowledgment
  ipcMain.handle(
    IPC_CHANNELS.BATCH_ACKNOWLEDGE,
    async (_event, request: RecordBatchAcknowledgmentRequest) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        const result = service.recordAcknowledgment(
          request.batchId,
          request.ackType,
          request.acknowledgmentDate,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined,
          request.ackDetails,
          request.notes
        );
        return { success: true, data: result };
      } catch (error) {
        console.error('Error recording batch acknowledgment:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to record acknowledgment'
        };
      }
    }
  );

  // Add case to batch
  ipcMain.handle(
    IPC_CHANNELS.BATCH_ADD_CASE,
    async (_event, batchId: number, caseId: string) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        service.addCaseToBatch(
          batchId,
          caseId,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true };
      } catch (error) {
        console.error('Error adding case to batch:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to add case to batch'
        };
      }
    }
  );

  // Remove case from batch
  ipcMain.handle(
    IPC_CHANNELS.BATCH_REMOVE_CASE,
    async (_event, batchId: number, caseId: string) => {
      try {
        const auth = getCurrentAuthContext();
        const service = getService();
        service.removeCaseFromBatch(
          batchId,
          caseId,
          auth.user?.id,
          auth.user?.username,
          auth.sessionId || undefined
        );
        return { success: true };
      } catch (error) {
        console.error('Error removing case from batch:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to remove case from batch'
        };
      }
    }
  );

  // Delete batch
  ipcMain.handle(IPC_CHANNELS.BATCH_DELETE, async (_event, batchId: number) => {
    try {
      const auth = getCurrentAuthContext();
      const service = getService();
      const deleted = service.deleteBatch(
        batchId,
        auth.user?.id,
        auth.user?.username,
        auth.sessionId || undefined
      );
      return { success: true, data: deleted };
    } catch (error) {
      console.error('Error deleting batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete batch'
      };
    }
  });

  // Get eligible cases for batch type
  ipcMain.handle(
    IPC_CHANNELS.BATCH_GET_ELIGIBLE_CASES,
    async (_event, batchType: BatchType) => {
      try {
        const service = getService();
        const cases = service.getEligibleCases(batchType);
        return { success: true, data: cases };
      } catch (error) {
        console.error('Error getting eligible cases:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get eligible cases'
        };
      }
    }
  );
}
