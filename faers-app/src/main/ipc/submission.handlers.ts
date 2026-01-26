/**
 * IPC Handlers for Submission operations (Phase 2)
 */

import { ipcMain } from 'electron';
import * as fs from 'fs';
import { join } from 'path';
import { getDatabase } from '../database/connection';
import { CaseRepository, SubmissionRepository } from '../database/repositories';
import { StatusTransitionService } from '../services/statusTransitionService';
import { ExportFilenameService } from '../services/exportFilenameService';
import { XMLGeneratorService } from '../services/xmlGeneratorService';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse } from '../../shared/types/ipc.types';
import type {
  SubmissionRecord,
  SubmissionHistoryEntry,
  Case,
  DashboardStats,
  SubmissionEnvironment,
  SubmissionReportType
} from '../../shared/types/case.types';
import { BATCH_RECEIVERS } from '../../shared/types/case.types';
import type {
  RecordSubmissionRequest,
  RecordAcknowledgmentRequest,
  ExportFdaResponse,
  MarkReadyResponse
} from '../../shared/types/ipc.types';

/**
 * Register submission-related IPC handlers
 */
export function registerSubmissionHandlers(): void {
  const db = getDatabase();
  const caseRepo = new CaseRepository(db);
  const submissionRepo = new SubmissionRepository(db);
  const statusService = new StatusTransitionService(db);
  const filenameService = new ExportFilenameService(db);
  const xmlService = new XMLGeneratorService(db);

  // ============================================================
  // Submission Recording
  // ============================================================

  /**
   * Record FDA ESG NextGen USP submission
   */
  ipcMain.handle(
    IPC_CHANNELS.SUBMISSION_RECORD,
    async (_, data: RecordSubmissionRequest): Promise<IPCResponse<SubmissionRecord>> => {
      try {
        // Create submission record
        const record = submissionRepo.createSubmissionRecord({
          caseId: data.caseId,
          srpConfirmationNumber: data.srpConfirmationNumber,
          submissionDate: data.submissionDate,
          notes: data.notes
        });

        // Update case status
        const result = statusService.markSubmitted(data.caseId, {
          srpConfirmationNumber: data.srpConfirmationNumber,
          submissionDate: data.submissionDate,
          notes: data.notes
        });

        if (!result.success) {
          return { success: false, error: result.error };
        }

        // Update case with submission info
        caseRepo.update(data.caseId, {
          submissionId: record.id,
          lastSubmittedAt: data.submissionDate,
          srpConfirmationNumber: data.srpConfirmationNumber
        });

        return { success: true, data: record };
      } catch (error) {
        console.error('Error recording submission:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Record FDA acknowledgment
   */
  ipcMain.handle(
    IPC_CHANNELS.SUBMISSION_ACKNOWLEDGE,
    async (_, data: RecordAcknowledgmentRequest): Promise<IPCResponse<SubmissionRecord>> => {
      try {
        // Get current submission record
        const latestSubmission = submissionRepo.getLatestSubmission(data.caseId);
        if (!latestSubmission) {
          return { success: false, error: 'No submission record found for this case' };
        }

        // Update submission record
        const updatedRecord = submissionRepo.updateSubmissionRecord(latestSubmission.id!, {
          acknowledgmentDate: data.acknowledgmentDate,
          acknowledgmentType: data.acknowledgmentType,
          fdaCaseNumber: data.fdaCaseNumber,
          rejectionReason: data.rejectionReason,
          notes: data.notes
        });

        // Transition status based on acknowledgment type
        let result;
        if (data.acknowledgmentType === 'Accepted') {
          result = statusService.markAcknowledged(data.caseId, {
            fdaCaseNumber: data.fdaCaseNumber || '',
            acknowledgmentDate: data.acknowledgmentDate,
            notes: data.notes
          });
        } else {
          result = statusService.markRejected(data.caseId, {
            rejectionReason: data.rejectionReason || '',
            acknowledgmentDate: data.acknowledgmentDate,
            notes: data.notes
          });
        }

        if (!result.success) {
          return { success: false, error: result.error };
        }

        // Update case with acknowledgment info
        caseRepo.update(data.caseId, {
          acknowledgmentDate: data.acknowledgmentDate,
          fdaCaseNumber: data.fdaCaseNumber
        });

        return { success: true, data: updatedRecord! };
      } catch (error) {
        console.error('Error recording acknowledgment:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get submission history for a case
   */
  ipcMain.handle(
    IPC_CHANNELS.SUBMISSION_GET_HISTORY,
    async (_, caseId: string): Promise<IPCResponse<SubmissionHistoryEntry[]>> => {
      try {
        const history = submissionRepo.getHistoryByCaseId(caseId);
        return { success: true, data: history };
      } catch (error) {
        console.error('Error getting submission history:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get latest submission record for a case
   */
  ipcMain.handle(
    IPC_CHANNELS.SUBMISSION_GET_RECORD,
    async (_, caseId: string): Promise<IPCResponse<SubmissionRecord | null>> => {
      try {
        const record = submissionRepo.getLatestSubmission(caseId);
        return { success: true, data: record };
      } catch (error) {
        console.error('Error getting submission record:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  // ============================================================
  // Dashboard
  // ============================================================

  /**
   * Get dashboard statistics
   */
  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD_GET_STATS,
    async (): Promise<IPCResponse<DashboardStats>> => {
      try {
        const statusCounts = submissionRepo.getStatusCounts();
        const needsAttention = submissionRepo.getCasesNeedingAttention();
        const recentActivity = submissionRepo.getRecentActivity(20);
        const totalCases = caseRepo.count();

        return {
          success: true,
          data: {
            totalCases,
            statusCounts,
            needsAttention,
            recentActivity
          }
        };
      } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  // ============================================================
  // FDA Export
  // ============================================================

  /**
   * Export with FDA-compliant filename
   * Supports Test and Production environments with appropriate batch receivers
   */
  ipcMain.handle(
    IPC_CHANNELS.XML_EXPORT_FDA,
    async (
      _,
      { caseId, exportPath, submissionEnvironment, submissionReportType }: {
        caseId: string;
        exportPath: string;
        submissionEnvironment?: SubmissionEnvironment;
        submissionReportType?: SubmissionReportType;
      }
    ): Promise<IPCResponse<ExportFdaResponse>> => {
      try {
        // Check if sender ID is configured
        if (!filenameService.isSenderIdConfigured()) {
          return {
            success: false,
            error: 'Sender ID not configured. Please configure in Settings.'
          };
        }

        // Use provided environment settings or get from app settings
        const environment = submissionEnvironment || filenameService.getSubmissionEnvironment();
        const repType = submissionReportType || filenameService.getReportType();
        const isTestMode = environment === 'Test';
        // Note: Batch receiver is the same for Test and Production when using USP
        const batchReceiver = BATCH_RECEIVERS[repType];

        // Generate XML with environment-specific batch receiver
        const xmlResult = xmlService.generate(caseId, {
          submissionEnvironment: environment,
          submissionReportType: repType
        });
        if (!xmlResult.success || !xmlResult.xml) {
          return {
            success: false,
            error: xmlResult.errors?.join('; ') || 'Failed to generate XML'
          };
        }

        // Generate FDA-compliant filename (with _TEST suffix for test mode)
        const { filename, sequenceNumber } = filenameService.generateFilename({
          isTestMode
        });
        const filePath = join(exportPath, filename);
        const targetCenter = filenameService.getTargetCenter();

        // Write XML to file
        fs.writeFileSync(filePath, xmlResult.xml, 'utf-8');

        // Generate and write README.txt
        const readmeContent = filenameService.generateReadmeContent({
          caseId,
          filename,
          isTestMode,
          reportType: repType,
          targetCenter
        });
        const readmePath = join(exportPath, 'README.txt');
        fs.writeFileSync(readmePath, readmeContent, 'utf-8');

        // Transition to Exported status and log history
        const transitionResult = statusService.markExported(caseId, {
          filename,
          filePath,
          submissionEnvironment: environment,
          submissionReportType: repType
        });

        if (!transitionResult.success) {
          // Clean up the file if transition failed
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return { success: false, error: transitionResult.error };
        }

        // Update case with export info
        caseRepo.update(caseId, {
          status: 'Exported',
          exportedAt: new Date().toISOString(),
          exportedXmlPath: filePath
        });

        return {
          success: true,
          data: {
            filename,
            filePath,
            sequenceNumber,
            submissionEnvironment: environment,
            submissionReportType: repType,
            batchReceiver,
            isTestMode
          }
        };
      } catch (error) {
        console.error('Error exporting with FDA filename:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  // ============================================================
  // Status Transitions
  // ============================================================

  /**
   * Mark case as ready for export
   */
  ipcMain.handle(
    IPC_CHANNELS.CASE_MARK_READY,
    async (_, caseId: string): Promise<IPCResponse<MarkReadyResponse>> => {
      try {
        const result = statusService.markReady(caseId);

        if (!result.success) {
          return {
            success: false,
            error: result.error,
            data: { validationResult: result.validationResult }
          };
        }

        return {
          success: true,
          data: { case: result.case }
        };
      } catch (error) {
        console.error('Error marking case ready:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Revert case to draft status
   */
  ipcMain.handle(
    IPC_CHANNELS.CASE_REVERT_TO_DRAFT,
    async (
      _,
      { caseId, reason }: { caseId: string; reason?: string }
    ): Promise<IPCResponse<Case>> => {
      try {
        const result = statusService.revertToDraft(caseId, reason);

        if (!result.success) {
          return { success: false, error: result.error };
        }

        return { success: true, data: result.case };
      } catch (error) {
        console.error('Error reverting to draft:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  console.log('Submission IPC handlers registered');
}
