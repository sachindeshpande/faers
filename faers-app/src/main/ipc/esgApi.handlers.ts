/**
 * IPC Handlers for ESG NextGen API Integration (Phase 2B)
 *
 * Handles automated FDA ESG submission, OAuth credential management,
 * acknowledgment polling, and retry logic.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type { IPCResponse } from '../../shared/types/ipc.types';
import type {
  EsgApiSettings,
  TestConnectionResult,
  SubmitToFdaRequest,
  SubmitToFdaResult,
  CheckAcknowledgmentResult,
  PollingStatus,
  PreSubmissionSummary,
  ApiSubmissionAttempt,
  SaveCredentialsRequest,
  SaveEsgSettingsRequest,
  ApiSubmissionProgress
} from '../../shared/types/esgApi.types';

import { CredentialStorageService } from '../services/credentialStorageService';
import { EsgAuthService } from '../services/esgAuthService';
import { EsgSubmissionService } from '../services/esgSubmissionService';
import { EsgPollingService } from '../services/esgPollingService';
import { EsgSubmissionRepository } from '../database/repositories/esgSubmission.repository';
import { MockEsgApiService } from '../services/mockEsgApiService';

/**
 * Service dependencies for ESG API handlers
 */
interface EsgServices {
  credentialStorage: CredentialStorageService;
  authService: EsgAuthService;
  submissionService: EsgSubmissionService;
  pollingService: EsgPollingService;
  esgRepo: EsgSubmissionRepository;
  mockApiService: MockEsgApiService;
}

/**
 * Register ESG API-related IPC handlers
 */
export function registerEsgApiHandlers(services: EsgServices): void {
  const {
    credentialStorage,
    authService,
    submissionService,
    pollingService,
    esgRepo,
    mockApiService
  } = services;

  // ============================================================
  // Connection & Settings
  // ============================================================

  /**
   * Test ESG API connection using current settings
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_TEST_CONNECTION,
    async (): Promise<IPCResponse<TestConnectionResult>> => {
      try {
        const settings = esgRepo.getEsgApiSettings();

        // Use mock API service for Demo mode
        if (settings.environment === 'Demo') {
          const mockResult = await mockApiService.testConnection();
          return {
            success: true,
            data: {
              success: mockResult.success,
              latencyMs: mockResult.latencyMs,
              environment: 'Demo',
              isDemoMode: true
            }
          };
        }

        const result = await authService.testConnection(settings.environment);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error testing ESG API connection:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get ESG API settings (includes credential availability check)
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_GET_SETTINGS,
    async (): Promise<IPCResponse<EsgApiSettings & { hasCredentials: boolean }>> => {
      try {
        const settings = esgRepo.getEsgApiSettings();
        const hasCredentials = credentialStorage.hasCredentials();
        return { success: true, data: { ...settings, hasCredentials } };
      } catch (error) {
        console.error('Error getting ESG API settings:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Save ESG API settings (non-credential fields)
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_SAVE_SETTINGS,
    async (_, data: SaveEsgSettingsRequest): Promise<IPCResponse<void>> => {
      try {
        esgRepo.saveEsgApiSettings(data);
        return { success: true };
      } catch (error) {
        console.error('Error saving ESG API settings:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  // ============================================================
  // Credential Management
  // ============================================================

  /**
   * Save OAuth credentials securely and update settings
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_SAVE_CREDENTIALS,
    async (_, data: SaveCredentialsRequest): Promise<IPCResponse<void>> => {
      try {
        credentialStorage.saveCredentials(data.clientId, data.secretKey);
        esgRepo.saveEsgApiSettings({ clientId: data.clientId, isConfigured: true });
        authService.clearTokenCache();
        return { success: true };
      } catch (error) {
        console.error('Error saving ESG API credentials:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Check if credentials are stored
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_HAS_CREDENTIALS,
    async (): Promise<IPCResponse<boolean>> => {
      try {
        const hasCredentials = credentialStorage.hasCredentials();
        return { success: true, data: hasCredentials };
      } catch (error) {
        console.error('Error checking ESG API credentials:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Clear stored credentials and reset configuration state
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_CLEAR_CREDENTIALS,
    async (): Promise<IPCResponse<void>> => {
      try {
        credentialStorage.clearCredentials();
        authService.clearTokenCache();
        esgRepo.saveEsgApiSettings({ isConfigured: false, clientId: '' });
        return { success: true };
      } catch (error) {
        console.error('Error clearing ESG API credentials:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  // ============================================================
  // Submission Operations
  // ============================================================

  /**
   * Submit a case to FDA via ESG API
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_SUBMIT_CASE,
    async (_, data: SubmitToFdaRequest): Promise<IPCResponse<SubmitToFdaResult>> => {
      console.log('[IPC] ESG_API_SUBMIT_CASE called for caseId:', data.caseId);
      try {
        const settings = esgRepo.getEsgApiSettings();
        const environment = data.environment || settings.environment;
        console.log('[IPC] Submitting with environment:', environment);
        const result = await submissionService.submitCase(data.caseId, environment);
        console.log('[IPC] submissionService.submitCase result:', JSON.stringify(result));
        // Check if the submission actually succeeded (not just didn't throw)
        if (result.success) {
          console.log('[IPC] ESG_API_SUBMIT_CASE returning success');
          return { success: true, data: result };
        } else {
          console.log('[IPC] ESG_API_SUBMIT_CASE returning failure:', result.error);
          return { success: false, error: result.error || 'Submission failed', data: result };
        }
      } catch (error) {
        console.error('[IPC] Error submitting case to FDA ESG:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Retry a failed submission
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_RETRY_SUBMISSION,
    async (_, caseId: string): Promise<IPCResponse<SubmitToFdaResult>> => {
      try {
        const result = await submissionService.retryFailedSubmission(caseId);
        // Check if the retry actually succeeded
        if (result.success) {
          return { success: true, data: result };
        } else {
          return { success: false, error: result.error || 'Retry failed', data: result };
        }
      } catch (error) {
        console.error('Error retrying ESG submission:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Cancel an in-progress submission
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_CANCEL_SUBMISSION,
    async (_, caseId: string): Promise<IPCResponse<void>> => {
      try {
        await submissionService.cancelSubmission(caseId);
        return { success: true };
      } catch (error) {
        console.error('Error cancelling ESG submission:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get current submission progress for a case
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_GET_PROGRESS,
    async (_, caseId: string): Promise<IPCResponse<ApiSubmissionProgress | null>> => {
      try {
        const progress = submissionService.getSubmissionProgress(caseId);
        return { success: true, data: progress };
      } catch (error) {
        console.error('Error getting ESG submission progress:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get pre-submission summary for review before submitting
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_GET_PRE_SUMMARY,
    async (_, caseId: string): Promise<IPCResponse<PreSubmissionSummary>> => {
      try {
        const summary = await submissionService.getPreSubmissionSummary(caseId);
        return { success: true, data: summary ?? undefined };
      } catch (error) {
        console.error('Error getting pre-submission summary:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  // ============================================================
  // Acknowledgment & Polling
  // ============================================================

  /**
   * Check acknowledgment status for a specific case
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_CHECK_ACK,
    async (_, caseId: string): Promise<IPCResponse<CheckAcknowledgmentResult>> => {
      try {
        const result = await pollingService.checkAcknowledgmentForCase(caseId);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error checking ESG acknowledgment:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get all submission attempts for a case
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_GET_ATTEMPTS,
    async (_, caseId: string): Promise<IPCResponse<ApiSubmissionAttempt[]>> => {
      try {
        const attempts = esgRepo.getAttemptsForCase(caseId);
        return { success: true, data: attempts };
      } catch (error) {
        console.error('Error getting ESG submission attempts:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Start acknowledgment polling
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_POLLING_START,
    async (): Promise<IPCResponse<void>> => {
      try {
        pollingService.startPolling();
        return { success: true };
      } catch (error) {
        console.error('Error starting ESG polling:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Stop acknowledgment polling
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_POLLING_STOP,
    async (): Promise<IPCResponse<void>> => {
      try {
        pollingService.stopPolling();
        return { success: true };
      } catch (error) {
        console.error('Error stopping ESG polling:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get current polling status
   */
  ipcMain.handle(
    IPC_CHANNELS.ESG_API_POLLING_STATUS,
    async (): Promise<IPCResponse<PollingStatus>> => {
      try {
        const status = pollingService.getPollingStatus();
        return { success: true, data: status };
      } catch (error) {
        console.error('Error getting ESG polling status:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  console.log('ESG API IPC handlers registered');
}
