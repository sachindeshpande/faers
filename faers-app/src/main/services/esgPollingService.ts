/**
 * ESG Polling Service (Phase 2B)
 *
 * Background polling for FDA acknowledgments on submitted cases.
 * Uses recursive setTimeout (not setInterval) to prevent overlapping polls.
 * Automatically transitions case status based on acknowledgment type.
 */

import { BrowserWindow } from 'electron';
import { EsgApiService } from './esgApiService';
import { StatusTransitionService } from './statusTransitionService';
import { CaseRepository, SubmissionRepository } from '../database/repositories';
import type { DatabaseInstance } from '../database/types';
import type {
  EsgApiEnvironment,
  EsgApiSettings,
  EsgAcknowledgmentResponse,
  PollingStatus,
  CheckAcknowledgmentResult
} from '../../shared/types/esgApi.types';
import { DEFAULT_ESG_API_SETTINGS } from '../../shared/types/esgApi.types';

/** IPC channel for broadcasting acknowledgment events to the renderer */
const ACK_RECEIVED_CHANNEL = 'esg:acknowledgment-received';

/** Represents a submitted case awaiting acknowledgment from FDA */
interface SubmittedCaseInfo {
  caseId: string;
  esgSubmissionId: string;
  submittedAt: string;
  environment: EsgApiEnvironment;
}

export class EsgPollingService {
  private caseRepo: CaseRepository;
  private submissionRepo: SubmissionRepository;
  private apiService: EsgApiService;
  private statusService: StatusTransitionService;
  private db: DatabaseInstance;

  private timerId: ReturnType<typeof setTimeout> | null = null;
  private isActive = false;
  private lastPollTime: string | undefined;
  private nextPollTime: string | undefined;
  private pollErrors: string[] = [];

  constructor(
    db: DatabaseInstance,
    apiService: EsgApiService,
    statusService: StatusTransitionService
  ) {
    this.db = db;
    this.caseRepo = new CaseRepository(db);
    this.submissionRepo = new SubmissionRepository(db);
    this.apiService = apiService;
    this.statusService = statusService;
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  /**
   * Start background polling for acknowledgments.
   * No-op if already active or API is not configured.
   */
  startPolling(): void {
    if (this.isActive) return;

    const settings = this.getEsgApiSettings();
    if (!settings.isConfigured) {
      console.log('[ESG Polling] Not starting - API not configured');
      return;
    }

    this.isActive = true;
    console.log(
      `[ESG Polling] Started (interval: ${settings.pollingIntervalMinutes}min)`
    );
    this.scheduleNextPoll();
  }

  /**
   * Stop background polling and cancel any pending timer.
   */
  stopPolling(): void {
    this.isActive = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.nextPollTime = undefined;
    console.log('[ESG Polling] Stopped');
  }

  /**
   * Check if polling is currently active.
   */
  isPolling(): boolean {
    return this.isActive;
  }

  /**
   * Get the current polling status for display in the UI.
   */
  getPollingStatus(): PollingStatus {
    const submittedCases = this.getSubmittedCasesAwaitingAck();
    return {
      isActive: this.isActive,
      casesBeingPolled: submittedCases.length,
      lastPollTime: this.lastPollTime,
      nextPollTime: this.nextPollTime,
      errors: this.pollErrors.length > 0 ? [...this.pollErrors] : undefined
    };
  }

  // ============================================================
  // Manual acknowledgment check
  // ============================================================

  /**
   * Manually check acknowledgment for a specific case.
   * Called from the renderer when the user clicks "Check Now".
   */
  async checkAcknowledgmentForCase(
    caseId: string
  ): Promise<CheckAcknowledgmentResult> {
    try {
      const caseData = this.caseRepo.findById(caseId);
      if (!caseData || !caseData.esgSubmissionId) {
        return {
          caseId,
          hasAcknowledgment: false,
          error: 'No API submission found for this case'
        };
      }

      const settings = this.getEsgApiSettings();
      const ack = await this.apiService.getSubmissionStatus(
        settings.environment,
        caseData.esgSubmissionId
      );

      if (ack) {
        this.processAcknowledgment(caseId, caseData.esgSubmissionId, ack);
        return {
          caseId,
          hasAcknowledgment: true,
          acknowledgment: ack
        };
      }

      return {
        caseId,
        hasAcknowledgment: false
      };
    } catch (error) {
      return {
        caseId,
        hasAcknowledgment: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================
  // Configuration
  // ============================================================

  /**
   * Update the polling interval and restart polling if active.
   */
  setPollingInterval(minutes: number): void {
    this.saveSetting('esg_polling_interval_minutes', String(minutes));
    if (this.isActive) {
      this.stopPolling();
      this.startPolling();
    }
  }

  // ============================================================
  // Internal: Scheduling
  // ============================================================

  /**
   * Schedule the next poll using setTimeout.
   * setTimeout is preferred over setInterval to prevent
   * overlapping polls if a cycle takes longer than the interval.
   */
  private scheduleNextPoll(): void {
    if (!this.isActive) return;

    const settings = this.getEsgApiSettings();
    const intervalMs = settings.pollingIntervalMinutes * 60 * 1000;

    this.nextPollTime = new Date(Date.now() + intervalMs).toISOString();

    this.timerId = setTimeout(async () => {
      await this.pollOnce();
      this.scheduleNextPoll();
    }, intervalMs);
  }

  /**
   * Execute a single poll cycle: query all submitted cases awaiting
   * acknowledgment and check each one via the API.
   */
  private async pollOnce(): Promise<void> {
    this.lastPollTime = new Date().toISOString();
    this.pollErrors = [];

    const submittedCases = this.getSubmittedCasesAwaitingAck();
    if (submittedCases.length === 0) {
      return;
    }

    const settings = this.getEsgApiSettings();
    const timeoutMs = settings.pollingTimeoutHours * 60 * 60 * 1000;

    console.log(
      `[ESG Polling] Checking ${submittedCases.length} submitted case(s)`
    );

    for (const info of submittedCases) {
      // Check if the submission has exceeded the polling timeout
      const submittedAt = new Date(info.submittedAt).getTime();
      if (Date.now() - submittedAt > timeoutMs) {
        const msg = `Case ${info.caseId}: polling timeout exceeded`;
        console.log(`[ESG Polling] ${msg}`);
        this.pollErrors.push(msg);

        // Log timeout event
        this.submissionRepo.addHistoryEntry({
          caseId: info.caseId,
          eventType: 'api_submit_failed',
          details: JSON.stringify({ reason: 'Polling timeout exceeded' }),
          notes: 'Automatic polling timed out waiting for acknowledgment'
        });
        continue;
      }

      try {
        const ack = await this.apiService.getSubmissionStatus(
          info.environment,
          info.esgSubmissionId
        );

        if (ack) {
          console.log(
            `[ESG Polling] Acknowledgment received for case ${info.caseId}: ${ack.acknowledgmentType}`
          );
          this.processAcknowledgment(
            info.caseId,
            info.esgSubmissionId,
            ack
          );
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `[ESG Polling] Error checking case ${info.caseId}:`,
          msg
        );
        this.pollErrors.push(`Case ${info.caseId}: ${msg}`);
      }
    }
  }

  // ============================================================
  // Internal: Acknowledgment processing
  // ============================================================

  /**
   * Process a received acknowledgment:
   *   - Update submission record
   *   - Transition case status
   *   - Update case fields
   *   - Log history event
   *   - Notify renderer
   */
  private processAcknowledgment(
    caseId: string,
    _esgSubmissionId: string,
    ack: EsgAcknowledgmentResponse
  ): void {
    const now = new Date().toISOString();

    // Update the submission record with acknowledgment details
    const latestSubmission = this.submissionRepo.getLatestSubmission(caseId);
    if (latestSubmission?.id) {
      this.submissionRepo.updateSubmissionRecord(latestSubmission.id, {
        acknowledgmentDate: ack.timestamp || now,
        acknowledgmentType: ack.acknowledgmentType === 'NACK' ? 'Rejected' : 'Accepted',
        fdaCaseNumber: ack.fdaCoreId,
        notes: `${ack.acknowledgmentType} received via API polling`
      });
    }

    if (ack.acknowledgmentType === 'NACK') {
      // NACK - submission was rejected by FDA
      const errorSummary =
        ack.errors?.map((e) => e.message).join('; ') || 'Rejected by FDA';

      this.submissionRepo.addHistoryEntry({
        caseId,
        eventType: 'nack_received',
        details: JSON.stringify({
          ackType: ack.acknowledgmentType,
          errors: ack.errors,
          timestamp: ack.timestamp
        }),
        notes: `NACK received: ${errorSummary}`
      });

      this.statusService.transition(caseId, 'Submission Failed', {
        details: {
          ackType: ack.acknowledgmentType,
          errors: ack.errors,
          timestamp: ack.timestamp
        },
        notes: 'NACK received from FDA'
      });

      this.caseRepo.update(caseId, {
        apiLastError: `NACK: ${errorSummary}`
      });
    } else {
      // ACK1, ACK2, ACK3 - all considered positive acknowledgment
      this.submissionRepo.addHistoryEntry({
        caseId,
        eventType: 'ack_received',
        details: JSON.stringify({
          ackType: ack.acknowledgmentType,
          fdaCoreId: ack.fdaCoreId,
          timestamp: ack.timestamp
        }),
        notes: `${ack.acknowledgmentType} received from FDA`
      });

      this.statusService.transition(caseId, 'Acknowledged', {
        details: {
          ackType: ack.acknowledgmentType,
          fdaCoreId: ack.fdaCoreId,
          timestamp: ack.timestamp
        },
        notes: `${ack.acknowledgmentType} received from FDA`
      });

      this.caseRepo.update(caseId, {
        fdaCaseNumber: ack.fdaCoreId,
        acknowledgmentDate: ack.timestamp || now
      });
    }

    // Notify all renderer windows of the acknowledgment
    this.notifyRenderer(caseId, ack);
  }

  /**
   * Send acknowledgment notification to all browser windows
   * so the UI can update in real time.
   */
  private notifyRenderer(
    caseId: string,
    ack: EsgAcknowledgmentResponse
  ): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(ACK_RECEIVED_CHANNEL, { caseId, acknowledgment: ack });
      }
    }
  }

  // ============================================================
  // Database helpers
  // ============================================================

  /**
   * Query cases that are in Submitted status and have an
   * ESG submission ID, meaning they are awaiting acknowledgment.
   */
  private getSubmittedCasesAwaitingAck(): SubmittedCaseInfo[] {
    const settings = this.getEsgApiSettings();

    const rows = this.db
      .prepare(
        `SELECT id, esg_submission_id, last_submitted_at
         FROM cases
         WHERE status = 'Submitted'
           AND esg_submission_id IS NOT NULL
           AND deleted_at IS NULL
         ORDER BY last_submitted_at ASC`
      )
      .all() as Array<{
      id: string;
      esg_submission_id: string;
      last_submitted_at: string;
    }>;

    return rows.map((row) => ({
      caseId: row.id,
      esgSubmissionId: row.esg_submission_id,
      submittedAt: row.last_submitted_at,
      environment: settings.environment
    }));
  }

  /**
   * Read ESG API settings from the application settings table.
   */
  private getEsgApiSettings(): EsgApiSettings {
    const get = (key: string): string | null => {
      const row = this.db
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get(key) as { value: string } | undefined;
      return row?.value ?? null;
    };

    return {
      clientId: get('esg_client_id') || DEFAULT_ESG_API_SETTINGS.clientId,
      environment:
        (get('esg_environment') as EsgApiEnvironment) ||
        DEFAULT_ESG_API_SETTINGS.environment,
      senderCompanyName:
        get('esg_sender_company_name') ||
        DEFAULT_ESG_API_SETTINGS.senderCompanyName,
      senderContactName:
        get('esg_sender_contact_name') ||
        DEFAULT_ESG_API_SETTINGS.senderContactName,
      senderContactEmail:
        get('esg_sender_contact_email') ||
        DEFAULT_ESG_API_SETTINGS.senderContactEmail,
      pollingIntervalMinutes:
        Number(get('esg_polling_interval_minutes')) ||
        DEFAULT_ESG_API_SETTINGS.pollingIntervalMinutes,
      pollingTimeoutHours:
        Number(get('esg_polling_timeout_hours')) ||
        DEFAULT_ESG_API_SETTINGS.pollingTimeoutHours,
      maxAutomaticRetries:
        Number(get('esg_max_automatic_retries')) ??
        DEFAULT_ESG_API_SETTINGS.maxAutomaticRetries,
      maxTotalAttempts:
        Number(get('esg_max_total_attempts')) ||
        DEFAULT_ESG_API_SETTINGS.maxTotalAttempts,
      isConfigured: get('esg_is_configured') === 'true'
    };
  }

  /**
   * Save a single setting value to the settings table.
   */
  private saveSetting(key: string, value: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`
      )
      .run(key, value, now, value, now);
  }
}
