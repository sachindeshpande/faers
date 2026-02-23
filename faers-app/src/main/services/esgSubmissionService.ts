/**
 * ESG Submission Service (Phase 2B)
 *
 * Orchestrates the full API submission workflow with retry logic.
 * Steps: Authenticate -> Generate XML -> Create Submission ->
 *        Upload XML -> Finalize -> Update Status
 *
 * Emits real-time progress events to the renderer via BrowserWindow.
 * Supports Demo Mode for testing and demonstrations without real API calls.
 */

import { BrowserWindow } from 'electron';
import { EsgApiService, EsgApiError } from './esgApiService';
import { MockEsgApiService, MockApiError } from './mockEsgApiService';
import { XMLGeneratorService } from './xmlGeneratorService';
import { StatusTransitionService } from './statusTransitionService';
import {
  CaseRepository,
  ReactionRepository,
  DrugRepository,
  SubmissionRepository
} from '../database/repositories';
import type { DatabaseInstance } from '../database/types';
import type {
  EsgApiEnvironment,
  EsgApiSettings,
  EsgErrorCategory,
  ApiSubmissionStep,
  ApiSubmissionProgress,
  SubmitToFdaResult,
  PreSubmissionSummary,
  DemoScenario,
  DemoSpeed
} from '../../shared/types/esgApi.types';
import {
  DEFAULT_ESG_API_SETTINGS,
  RETRYABLE_ERROR_CATEGORIES,
  DEMO_CREDENTIALS
} from '../../shared/types/esgApi.types';

/** IPC channel for real-time submission progress updates */
const PROGRESS_CHANNEL = 'esg:submission-progress';

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY_MS = 1_000;

/** Maximum backoff delay cap (ms) */
const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Tracks the live state of an in-progress submission so
 * it can be cancelled from the renderer.
 */
interface ActiveSubmissionContext {
  cancelled: boolean;
}

export class EsgSubmissionService {
  private caseRepo: CaseRepository;
  private reactionRepo: ReactionRepository;
  private drugRepo: DrugRepository;
  private submissionRepo: SubmissionRepository;
  private apiService: EsgApiService;
  private mockApiService: MockEsgApiService;
  private xmlService: XMLGeneratorService;
  private statusService: StatusTransitionService;
  private db: DatabaseInstance;

  /**
   * Map of caseId -> active submission context.
   * Prevents duplicate concurrent submissions and supports cancellation.
   */
  private activeSubmissions: Map<string, ActiveSubmissionContext> = new Map();

  /**
   * Map of caseId -> latest submission progress snapshot.
   * Updated each time emitProgress is called; cleared on completion/failure.
   */
  private activeProgress: Map<string, ApiSubmissionProgress> = new Map();

  constructor(
    db: DatabaseInstance,
    apiService: EsgApiService,
    xmlService: XMLGeneratorService,
    statusService: StatusTransitionService
  ) {
    this.db = db;
    this.caseRepo = new CaseRepository(db);
    this.reactionRepo = new ReactionRepository(db);
    this.drugRepo = new DrugRepository(db);
    this.submissionRepo = new SubmissionRepository(db);
    this.apiService = apiService;
    this.mockApiService = new MockEsgApiService();
    this.xmlService = xmlService;
    this.statusService = statusService;
  }

  /**
   * Get the mock API service for external access (e.g., configuration)
   */
  getMockApiService(): MockEsgApiService {
    return this.mockApiService;
  }

  /**
   * Check if an environment is Demo mode
   */
  private isDemoMode(environment: EsgApiEnvironment): boolean {
    return environment === 'Demo';
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * Submit a case to FDA via the ESG NextGen API.
   *
   * Manages the full lifecycle: status transition, XML generation,
   * API calls, retry logic, and result recording.
   *
   * In Demo mode, uses the mock API service instead of real FDA APIs.
   */
  async submitCase(
    caseId: string,
    environment: EsgApiEnvironment,
    demoScenario?: DemoScenario,
    demoSpeed?: DemoSpeed
  ): Promise<SubmitToFdaResult> {
    // Guard against duplicate concurrent submissions for the same case
    if (this.activeSubmissions.has(caseId)) {
      return {
        success: false,
        caseId,
        error: 'Submission already in progress for this case',
        attemptNumber: 0
      };
    }

    const context: ActiveSubmissionContext = { cancelled: false };
    this.activeSubmissions.set(caseId, context);

    try {
      // Get current case status for debugging
      const currentCase = this.caseRepo.findById(caseId);
      console.log(`[ESG Submit] Starting submission for case ${caseId}, current status: '${currentCase?.status}'`);

      // If case is in Draft status, validate before submission
      if (currentCase?.status === 'Draft') {
        console.log(`[ESG Submit] Case is in Draft - validating before submission...`);
        const validation = this.statusService.canExport(caseId);
        if (!validation.canExport) {
          console.log(`[ESG Submit] Validation failed - cannot submit`);
          const errorCount = validation.validation.errors.filter(e => e.severity === 'error').length;
          return {
            success: false,
            caseId,
            error: `Validation failed with ${errorCount} error(s). Please fix errors before submitting.`,
            attemptNumber: 0
          };
        }
        console.log(`[ESG Submit] Validation passed`);
      }

      // Transition case to Submitting
      console.log(`[ESG Submit] Attempting transition to 'Submitting'...`);
      const transResult = this.statusService.transition(caseId, 'Submitting', {
        details: { environment, method: 'api' }
      });
      console.log(`[ESG Submit] Transition result: success=${transResult.success}, error=${transResult.error}`);

      if (!transResult.success) {
        console.log(`[ESG Submit] First transition FAILED, returning error`);
        return {
          success: false,
          caseId,
          error: transResult.error || 'Cannot transition to Submitting status',
          attemptNumber: 0
        };
      }
      console.log(`[ESG Submit] First transition succeeded, case now in 'Submitting' status`);

      // Load settings for retry configuration
      const settings = this.getEsgApiSettings();
      const maxRetries = settings.maxAutomaticRetries;
      const maxTotal = settings.maxTotalAttempts;

      // Check total historical attempt count
      const priorAttemptCount = this.getAttemptCount(caseId);
      if (priorAttemptCount >= maxTotal) {
        this.statusService.transition(caseId, 'Submission Failed', {
          details: { reason: 'Max total attempts exceeded' }
        });
        return {
          success: false,
          caseId,
          error: `Maximum total attempts (${maxTotal}) exceeded. Please return to Draft and retry.`,
          attemptNumber: priorAttemptCount
        };
      }

      const attemptNumber = priorAttemptCount + 1;

      // Configure mock API service for Demo mode
      if (this.isDemoMode(environment)) {
        if (demoScenario) {
          this.mockApiService.updateConfig({ scenario: demoScenario });
        }
        if (demoSpeed) {
          this.mockApiService.updateConfig({ speed: demoSpeed });
        }
      }

      return await this.executeSubmissionWithRetry(
        caseId,
        environment,
        settings,
        attemptNumber,
        maxRetries,
        context,
        demoScenario
      );
    } finally {
      this.activeSubmissions.delete(caseId);
    }
  }

  /**
   * Retry a previously failed submission.
   * Reads the configured environment from settings.
   */
  async retryFailedSubmission(caseId: string): Promise<SubmitToFdaResult> {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData || caseData.status !== 'Submission Failed') {
      return {
        success: false,
        caseId,
        error: 'Case is not in Submission Failed status',
        attemptNumber: 0
      };
    }

    const settings = this.getEsgApiSettings();
    return this.submitCase(caseId, settings.environment);
  }

  /**
   * Build a pre-submission summary for the confirmation dialog
   * displayed to the user before they trigger the API submission.
   */
  getPreSubmissionSummary(caseId: string): PreSubmissionSummary | null {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) return null;

    const settings = this.getEsgApiSettings();
    const reactions = this.reactionRepo.findByCaseId(caseId);
    const drugs = this.drugRepo.findByCaseId(caseId);

    return {
      caseId,
      safetyReportId: caseData.safetyReportId,
      patientInitials: caseData.patientInitials,
      primaryReaction:
        reactions.length > 0 ? reactions[0].reactionTerm : undefined,
      primaryDrug:
        drugs.length > 0 ? drugs[0].productName : undefined,
      environment: settings.environment,
      isTestMode: settings.environment === 'Test',
      isDemoMode: settings.environment === 'Demo',
      validationPassed: true, // Case is already in Ready for Export / Exported
      warningCount: 0
    };
  }

  /**
   * Cancel an in-progress API submission.
   * The cancellation is cooperative -- checked between retry attempts
   * and before each API call step.
   */
  cancelSubmission(caseId: string): void {
    const context = this.activeSubmissions.get(caseId);
    if (context) {
      context.cancelled = true;
    }
  }

  /**
   * Check whether a case currently has an active submission in progress.
   */
  isSubmissionActive(caseId: string): boolean {
    return this.activeSubmissions.has(caseId);
  }

  /**
   * Get the latest progress snapshot for an active submission.
   * Returns null if no submission is in progress for the given case.
   */
  getSubmissionProgress(caseId: string): ApiSubmissionProgress | null {
    return this.activeProgress.get(caseId) || null;
  }

  // ============================================================
  // Internal: Retry-aware submission execution
  // ============================================================

  /**
   * Execute the full submission pipeline with automatic retry
   * for transient (retryable) error categories.
   * Routes to mock API service when in Demo mode.
   */
  private async executeSubmissionWithRetry(
    caseId: string,
    environment: EsgApiEnvironment,
    settings: EsgApiSettings,
    attemptNumber: number,
    maxRetries: number,
    context: ActiveSubmissionContext,
    demoScenario?: DemoScenario
  ): Promise<SubmitToFdaResult> {
    const isDemoMode = this.isDemoMode(environment);
    const startedAt = new Date().toISOString();

    // Record the submission attempt in the submission_history table
    this.submissionRepo.addHistoryEntry({
      caseId,
      eventType: 'api_submitting',
      details: JSON.stringify({ attemptNumber, environment })
    });

    let retryCount = 0;

    while (retryCount <= maxRetries) {
      // Check for user-initiated cancellation
      if (context.cancelled) {
        this.submissionRepo.addHistoryEntry({
          caseId,
          eventType: 'api_submit_failed',
          details: JSON.stringify({
            reason: 'Cancelled by user',
            attemptNumber,
            retryCount
          })
        });
        this.statusService.transition(caseId, 'Submission Failed', {
          details: { reason: 'Cancelled by user' }
        });
        return {
          success: false,
          caseId,
          error: 'Submission cancelled',
          attemptNumber
        };
      }

      try {
        // Step 1: Authenticate (token is cached automatically)
        this.emitProgress(caseId, 'authenticating', 0, startedAt, undefined, undefined, undefined, isDemoMode, demoScenario);

        // In Demo mode, simulate authentication
        if (isDemoMode) {
          await this.mockApiService.authenticate();
        }

        // Step 2: Generate E2B(R3) XML
        const xmlResult = this.xmlService.generate(caseId);
        if (!xmlResult.success || !xmlResult.xml) {
          throw new EsgApiError(
            xmlResult.errors?.join('; ') || 'Failed to generate XML',
            'validation'
          );
        }

        // Step 3: Create submission record on ESG (or mock)
        this.emitProgress(caseId, 'creating_submission', 1, startedAt, undefined, undefined, undefined, isDemoMode, demoScenario);

        let submissionId: string;
        if (isDemoMode) {
          const createResult = await this.mockApiService.createSubmission(
            {
              submissionType: 'ICSR',
              environment: 'Demo',
              senderCompanyName: DEMO_CREDENTIALS.senderCompanyName,
              senderContactName: DEMO_CREDENTIALS.senderContactName,
              senderContactEmail: DEMO_CREDENTIALS.senderContactEmail
            },
            demoScenario
          );
          submissionId = createResult.submissionId;
        } else {
          const createResult = await this.apiService.createSubmission({
            submissionType: 'ICSR',
            environment: environment as Exclude<EsgApiEnvironment, 'Demo'>,
            senderCompanyName: settings.senderCompanyName,
            senderContactName: settings.senderContactName,
            senderContactEmail: settings.senderContactEmail
          });
          submissionId = createResult.submissionId;
        }

        // Step 4: Upload XML
        this.emitProgress(
          caseId,
          'uploading_xml',
          2,
          startedAt,
          submissionId,
          undefined,
          undefined,
          isDemoMode,
          demoScenario
        );
        const filename = `${caseId}_E2B_R3.xml`;

        if (isDemoMode) {
          await this.mockApiService.uploadXml(submissionId, xmlResult.xml, filename);
        } else {
          await this.apiService.uploadXml(
            environment as Exclude<EsgApiEnvironment, 'Demo'>,
            submissionId,
            xmlResult.xml,
            filename
          );
        }

        // Step 5: Finalize
        this.emitProgress(caseId, 'finalizing', 3, startedAt, submissionId, undefined, undefined, isDemoMode, demoScenario);

        let esgCoreId: string;
        if (isDemoMode) {
          const finalizeResult = await this.mockApiService.finalizeSubmission(submissionId);
          esgCoreId = finalizeResult.esgCoreId;
        } else {
          const finalizeResult = await this.apiService.finalizeSubmission(
            environment as Exclude<EsgApiEnvironment, 'Demo'>,
            submissionId
          );
          esgCoreId = finalizeResult.esgCoreId;
        }

        // -- Success --
        const now = new Date().toISOString();
        const demoNote = isDemoMode ? ' [DEMO MODE]' : '';

        // Update case record with API submission details
        this.caseRepo.update(caseId, {
          esgSubmissionId: submissionId,
          esgCoreId: esgCoreId,
          lastSubmittedAt: now,
          srpConfirmationNumber: esgCoreId,
          apiAttemptCount: attemptNumber
        });

        // Create a submission record for tracking
        this.submissionRepo.createSubmissionRecord({
          caseId,
          srpConfirmationNumber: esgCoreId,
          submissionDate: now,
          notes: `API submission (attempt ${attemptNumber}), ESG Core ID: ${esgCoreId}${demoNote}`
        });

        // Log success event
        this.submissionRepo.addHistoryEntry({
          caseId,
          eventType: 'api_submit_success',
          details: JSON.stringify({
            esgSubmissionId: submissionId,
            esgCoreId: esgCoreId,
            environment,
            attemptNumber,
            isDemoMode
          })
        });

        // Transition to Submitted
        const submitTransResult = this.statusService.transition(caseId, 'Submitted', {
          details: {
            esgSubmissionId: submissionId,
            esgCoreId: esgCoreId,
            environment,
            method: 'api',
            attemptNumber,
            isDemoMode
          }
        });
        if (!submitTransResult.success) {
          console.error('[ESG Submit] Failed to transition to Submitted:', submitTransResult.error);
        }

        this.emitProgress(
          caseId,
          'complete',
          4,
          startedAt,
          submissionId,
          undefined,
          undefined,
          isDemoMode,
          demoScenario
        );

        return {
          success: true,
          caseId,
          esgCoreId: esgCoreId,
          esgSubmissionId: submissionId,
          attemptNumber,
          isDemoMode,
          demoScenario
        };
      } catch (error) {
        const isEsgError = error instanceof EsgApiError;
        const isMockError = error instanceof MockApiError;
        const category: EsgErrorCategory = isEsgError
          ? error.category
          : isMockError
            ? error.category
            : 'unknown';
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        console.error(
          `[ESG Submit] Attempt ${attemptNumber} retry ${retryCount} failed${isDemoMode ? ' [DEMO]' : ''}:`,
          errorMessage
        );

        // Determine if this error category is retryable
        const isRetryable = RETRYABLE_ERROR_CATEGORIES.includes(category);
        if (isRetryable && retryCount < maxRetries) {
          retryCount++;
          const delay = this.calculateBackoffDelay(retryCount);
          console.log(
            `[ESG Submit] Retrying in ${delay}ms (retry ${retryCount}/${maxRetries})`
          );

          this.submissionRepo.addHistoryEntry({
            caseId,
            eventType: 'api_retry',
            details: JSON.stringify({
              retryCount,
              errorCategory: category,
              error: errorMessage,
              delayMs: delay
            })
          });

          await this.delay(delay);
          continue;
        }

        // Non-retryable or retries exhausted: record failure
        this.caseRepo.update(caseId, {
          apiLastError: errorMessage,
          apiAttemptCount: attemptNumber
        });

        this.submissionRepo.addHistoryEntry({
          caseId,
          eventType: 'api_submit_failed',
          details: JSON.stringify({
            error: errorMessage,
            errorCategory: category,
            attemptNumber,
            retryCount
          })
        });

        this.statusService.transition(caseId, 'Submission Failed', {
          details: {
            error: errorMessage,
            errorCategory: category,
            attemptNumber,
            retryCount
          }
        });

        this.emitProgress(
          caseId,
          'failed',
          0,
          startedAt,
          undefined,
          errorMessage,
          category,
          isDemoMode,
          demoScenario
        );

        return {
          success: false,
          caseId,
          error: errorMessage,
          errorCategory: category,
          attemptNumber,
          isDemoMode,
          demoScenario
        };
      }
    }

    // Should not be reached, but handle gracefully
    return {
      success: false,
      caseId,
      error: 'Unexpected submission flow termination',
      attemptNumber
    };
  }

  // ============================================================
  // Helpers
  // ============================================================

  /**
   * Calculate exponential backoff delay with jitter.
   */
  private calculateBackoffDelay(retryNumber: number): number {
    const exponentialDelay =
      BASE_RETRY_DELAY_MS * Math.pow(2, retryNumber - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
  }

  /**
   * Promise-based delay helper.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Emit submission progress to all renderer browser windows.
   */
  private emitProgress(
    caseId: string,
    step: ApiSubmissionStep,
    stepsCompleted: number,
    startedAt: string,
    esgSubmissionId?: string,
    error?: string,
    errorCategory?: EsgErrorCategory,
    isDemoMode?: boolean,
    demoScenario?: DemoScenario
  ): void {
    const progress: ApiSubmissionProgress = {
      caseId,
      currentStep: step,
      stepDescription: this.getStepDescription(step, isDemoMode),
      stepsCompleted,
      totalSteps: 4,
      startedAt,
      elapsedMs: Date.now() - new Date(startedAt).getTime(),
      esgSubmissionId,
      error,
      errorCategory,
      isDemoMode,
      demoScenario
    };

    // Store the latest progress snapshot for on-demand queries
    if (step === 'complete' || step === 'failed') {
      this.activeProgress.delete(caseId);
    } else {
      this.activeProgress.set(caseId, progress);
    }

    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(PROGRESS_CHANNEL, progress);
      }
    }
  }

  /**
   * Human-readable labels for each submission step.
   */
  private getStepDescription(step: ApiSubmissionStep, isDemoMode?: boolean): string {
    const suffix = isDemoMode ? ' (Demo)' : '';
    const descriptions: Record<ApiSubmissionStep, string> = {
      authenticating: `Authenticating with FDA ESG${suffix}...`,
      creating_submission: `Creating submission record${suffix}...`,
      uploading_xml: `Uploading E2B(R3) XML${suffix}...`,
      finalizing: `Finalizing submission${suffix}...`,
      checking_status: `Checking submission status${suffix}...`,
      complete: `Submission complete${suffix}`,
      failed: `Submission failed${suffix}`
    };
    return descriptions[step];
  }

  /**
   * Read ESG API settings from the application settings table.
   * Returns defaults for any missing values.
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
   * Count the number of previous API submission attempts for a case
   * by querying the submission_history table.
   */
  private getAttemptCount(caseId: string): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM submission_history
         WHERE case_id = ? AND event_type = 'api_submitting'`
      )
      .get(caseId) as { count: number } | undefined;
    return row?.count ?? 0;
  }
}
