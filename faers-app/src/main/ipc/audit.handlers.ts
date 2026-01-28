/**
 * Audit Trail IPC Handlers
 * Phase 3: Multi-User & Workflow Management
 *
 * Handles audit log queries and exports for 21 CFR Part 11 compliance.
 */

import { ipcMain, dialog, app } from 'electron';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type {
  IPCResponse,
  AuditLogFilter,
  AuditLogResult,
  AuditExportRequest,
  AuditExportResult
} from '../../shared/types/ipc.types';
import { getDatabase } from '../database/connection';
import { getCurrentSessionId } from './auth.handlers';
import { AuthService } from '../services/authService';
import { AuditService } from '../services/auditService';

/**
 * Get the current user from session
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
    const validation = authService.validateSession(sessionId);

    if (!validation.valid || !validation.user) {
      return { user: null, permissions: [], sessionId: null };
    }

    return {
      user: {
        id: validation.user.id,
        username: validation.user.username
      },
      permissions: validation.permissions || [],
      sessionId
    };
  } catch {
    return { user: null, permissions: [], sessionId: null };
  }
}

/**
 * Check if audit_log table exists
 */
function auditTableExists(): boolean {
  try {
    const db = getDatabase();
    const result = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'
    `).get();
    return !!result;
  } catch {
    return false;
  }
}

/**
 * Get audit log with filtering
 */
async function getAuditLog(
  filter?: AuditLogFilter
): Promise<IPCResponse<AuditLogResult>> {
  try {
    const { user, permissions } = getCurrentAuthContext();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check permission - only admins and managers can view full audit log
    const hasPermission = permissions.includes('*') ||
      permissions.includes('system.audit') ||
      permissions.includes('system.reports');

    if (!hasPermission) {
      return { success: false, error: 'Permission denied' };
    }

    if (!auditTableExists()) {
      return {
        success: true,
        data: { entries: [], total: 0, hasMore: false }
      };
    }

    const db = getDatabase();
    const auditService = new AuditService(db);

    const result = auditService.query(filter);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting audit log:', error);
    return { success: false, error: 'Failed to get audit log' };
  }
}

/**
 * Export audit log to file
 */
async function exportAuditLog(
  request: AuditExportRequest
): Promise<IPCResponse<AuditExportResult>> {
  try {
    const { user, permissions, sessionId } = getCurrentAuthContext();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check permission
    const hasPermission = permissions.includes('*') ||
      permissions.includes('system.audit') ||
      permissions.includes('system.reports');

    if (!hasPermission) {
      return { success: false, error: 'Permission denied' };
    }

    if (!auditTableExists()) {
      return { success: false, error: 'Audit log not available' };
    }

    const db = getDatabase();
    const auditService = new AuditService(db);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let extension: string;
    switch (request.format) {
      case 'csv':
        extension = 'csv';
        break;
      case 'json':
        extension = 'json';
        break;
      case 'pdf':
        extension = 'pdf';
        break;
      default:
        extension = 'csv';
    }
    const fileName = `audit_log_${timestamp}.${extension}`;

    // Show save dialog
    const result = await dialog.showSaveDialog({
      title: 'Export Audit Log',
      defaultPath: join(app.getPath('documents'), fileName),
      filters: [
        { name: extension.toUpperCase(), extensions: [extension] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    let content: string;
    let recordCount: number;

    if (request.format === 'csv') {
      content = auditService.exportToCsv(request.filter);
      recordCount = content.split('\n').length - 1; // Minus header row
    } else if (request.format === 'json') {
      const auditResult = auditService.query({ ...request.filter, limit: 100000 });
      content = JSON.stringify(auditResult.entries, null, 2);
      recordCount = auditResult.entries.length;
    } else {
      // PDF not implemented yet - export as CSV
      content = auditService.exportToCsv(request.filter);
      recordCount = content.split('\n').length - 1;
    }

    // Write file
    writeFileSync(result.filePath, content, 'utf-8');

    // Log the export action
    auditService.log({
      userId: user.id,
      username: user.username,
      sessionId: sessionId || undefined,
      actionType: 'case_export',
      entityType: 'system',
      details: {
        exportType: 'audit_log',
        format: request.format,
        recordCount,
        filePath: result.filePath
      }
    });

    return {
      success: true,
      data: {
        filePath: result.filePath,
        fileName,
        recordCount
      }
    };
  } catch (error) {
    console.error('Error exporting audit log:', error);
    return { success: false, error: 'Failed to export audit log' };
  }
}

/**
 * Get audit statistics
 */
async function getAuditStatistics(
  startDate: string,
  endDate: string
): Promise<IPCResponse<{
  totalEntries: number;
  entriesByAction: Record<string, number>;
  entriesByUser: Record<string, number>;
  signatureCount: number;
}>> {
  try {
    const { user, permissions } = getCurrentAuthContext();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const hasPermission = permissions.includes('*') ||
      permissions.includes('system.audit') ||
      permissions.includes('system.reports');

    if (!hasPermission) {
      return { success: false, error: 'Permission denied' };
    }

    if (!auditTableExists()) {
      return {
        success: true,
        data: {
          totalEntries: 0,
          entriesByAction: {},
          entriesByUser: {},
          signatureCount: 0
        }
      };
    }

    const db = getDatabase();
    const auditService = new AuditService(db);

    const stats = auditService.getStatistics(startDate, endDate);
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting audit statistics:', error);
    return { success: false, error: 'Failed to get audit statistics' };
  }
}

/**
 * Get electronic signatures for an entity
 */
async function getSignatures(
  entityType: string,
  entityId: string
): Promise<IPCResponse<Array<{
  id: number;
  userId: string;
  username: string;
  timestamp: string;
  action: string;
  meaning: string;
}>>> {
  try {
    const { user } = getCurrentAuthContext();
    if (!user) {
      return { success: true, data: [] };
    }

    if (!auditTableExists()) {
      return { success: true, data: [] };
    }

    const db = getDatabase();
    const auditService = new AuditService(db);

    const signatures = auditService.getSignaturesForEntity(entityType, entityId);
    return {
      success: true,
      data: signatures.map(s => ({
        id: s.id,
        userId: s.userId,
        username: s.username,
        timestamp: s.timestamp,
        action: s.action,
        meaning: s.meaning
      }))
    };
  } catch (error) {
    console.error('Error getting signatures:', error);
    return { success: true, data: [] };
  }
}

/**
 * Register audit IPC handlers
 */
export function registerAuditHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.AUDIT_GET_LOG, async (_event, filter?: AuditLogFilter) => {
    return getAuditLog(filter);
  });

  ipcMain.handle(IPC_CHANNELS.AUDIT_EXPORT, async (_event, request: AuditExportRequest) => {
    return exportAuditLog(request);
  });

  // Additional handlers not in IPC_CHANNELS but useful
  ipcMain.handle('audit:getStatistics', async (_event, startDate: string, endDate: string) => {
    return getAuditStatistics(startDate, endDate);
  });

  ipcMain.handle('audit:getSignatures', async (_event, entityType: string, entityId: string) => {
    return getSignatures(entityType, entityId);
  });

  console.log('Audit handlers registered');
}
