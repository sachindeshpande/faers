/**
 * Mock ESG API Service (Phase 2B - Demo Mode)
 *
 * Simulates FDA ESG NextGen REST API for testing and demonstrations.
 * Runs locally without any network connectivity.
 * Supports configurable scenarios, timing, and acknowledgment progression.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DemoScenario,
  DemoSpeed,
  DemoModeConfig,
  EsgCreateSubmissionRequest,
  EsgCreateSubmissionResponse,
  EsgUploadResponse,
  EsgFinalizeResponse,
  EsgAcknowledgmentResponse,
  EsgAckType,
  EsgAckError,
  DEMO_TIMING_MULTIPLIERS
} from '../../shared/types/esgApi.types';
import {
  DEFAULT_DEMO_CONFIG,
  DEMO_NACK_ERRORS
} from '../../shared/types/esgApi.types';

// Default timing for API operations (in ms)
const DEFAULT_OPERATION_TIMING = {
  authentication: 500,
  createSubmission: 800,
  uploadXml: 1500,
  finalize: 1000,
  getStatus: 300
};

interface MockSubmissionRecord {
  submissionId: string;
  esgCoreId: string;
  status: 'created' | 'uploaded' | 'finalized' | 'processing' | 'complete' | 'rejected';
  createdAt: Date;
  finalizedAt?: Date;
  scenario: DemoScenario;
  currentAck?: EsgAckType;
  ackHistory: { type: EsgAckType; timestamp: Date }[];
  fdaCoreId?: string;
  nackErrors?: EsgAckError[];
  retryCount: number;
}

export class MockEsgApiService {
  private config: DemoModeConfig;
  private submissions: Map<string, MockSubmissionRecord> = new Map();
  private tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();
  private ackProgressionTimers: Map<string, NodeJS.Timeout[]> = new Map();

  constructor(config?: Partial<DemoModeConfig>) {
    this.config = { ...DEFAULT_DEMO_CONFIG, ...config };
  }

  /**
   * Update demo configuration
   */
  updateConfig(config: Partial<DemoModeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current demo configuration
   */
  getConfig(): DemoModeConfig {
    return { ...this.config };
  }

  /**
   * Get timing multiplier based on current speed setting
   */
  private getTimingMultiplier(): number {
    const multipliers: Record<DemoSpeed, number> = {
      realtime: 1,
      fast: 0.1,
      instant: 0.001
    };
    return multipliers[this.config.speed];
  }

  /**
   * Apply timing multiplier to a delay
   */
  private getAdjustedDelay(baseDelayMs: number): number {
    return Math.max(1, Math.floor(baseDelayMs * this.getTimingMultiplier()));
  }

  /**
   * Delay helper that respects speed settings
   */
  private async delay(baseMs: number): Promise<void> {
    const adjusted = this.getAdjustedDelay(baseMs);
    return new Promise(resolve => setTimeout(resolve, adjusted));
  }

  /**
   * Simulate OAuth authentication
   */
  async authenticate(): Promise<{ accessToken: string; expiresIn: number }> {
    await this.delay(DEFAULT_OPERATION_TIMING.authentication);

    // Check for network error scenario
    if (this.config.scenario === 'network_error') {
      // First call fails, subsequent calls succeed (simulates retry)
      const retryKey = 'auth_retry';
      const existing = this.tokenCache.get(retryKey);
      if (!existing || existing.expiresAt < Date.now()) {
        // First attempt fails
        this.tokenCache.set(retryKey, { token: 'retry', expiresAt: Date.now() + 10000 });
        throw new MockApiError('Network connection failed (simulated)', 'network');
      }
    }

    // Generate demo token
    const token = `demo-token-${uuidv4()}`;
    const expiresIn = 3600; // 1 hour

    this.tokenCache.set('current', {
      token,
      expiresAt: Date.now() + expiresIn * 1000
    });

    return { accessToken: token, expiresIn };
  }

  /**
   * Simulate connection test
   */
  async testConnection(): Promise<{ success: boolean; latencyMs: number }> {
    const startTime = Date.now();
    await this.delay(DEFAULT_OPERATION_TIMING.authentication);
    return {
      success: true,
      latencyMs: Date.now() - startTime
    };
  }

  /**
   * Simulate creating a new submission
   */
  async createSubmission(
    _request: EsgCreateSubmissionRequest,
    scenario?: DemoScenario
  ): Promise<EsgCreateSubmissionResponse> {
    await this.delay(DEFAULT_OPERATION_TIMING.createSubmission);

    const activeScenario = scenario || this.config.scenario;

    // Check for rate limit scenario
    if (activeScenario === 'rate_limited') {
      const retryKey = 'rate_limit_retry';
      const existing = this.tokenCache.get(retryKey);
      if (!existing || existing.expiresAt < Date.now()) {
        this.tokenCache.set(retryKey, { token: 'retry', expiresAt: Date.now() + 5000 });
        throw new MockApiError('Rate limit exceeded. Please retry after 5 seconds.', 'rate_limit', 429);
      }
    }

    const timestamp = Date.now();
    const submissionId = `DEMO-SUB-${timestamp}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const record: MockSubmissionRecord = {
      submissionId,
      esgCoreId: '', // Set on finalize
      status: 'created',
      createdAt: new Date(),
      scenario: activeScenario,
      ackHistory: [],
      retryCount: 0
    };

    this.submissions.set(submissionId, record);

    return {
      submissionId,
      status: 'CREATED',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Simulate uploading XML content
   */
  async uploadXml(
    submissionId: string,
    xmlContent: string,
    filename: string
  ): Promise<EsgUploadResponse> {
    await this.delay(DEFAULT_OPERATION_TIMING.uploadXml);

    const record = this.submissions.get(submissionId);
    if (!record) {
      throw new MockApiError(`Submission ${submissionId} not found`, 'validation', 404);
    }

    // Basic XML validation (just check well-formedness)
    if (!xmlContent.trim().startsWith('<?xml') && !xmlContent.trim().startsWith('<ich')) {
      throw new MockApiError('Invalid XML format', 'validation', 400);
    }

    record.status = 'uploaded';
    this.submissions.set(submissionId, record);

    return {
      fileId: `DEMO-FILE-${Date.now()}`,
      filename,
      size: xmlContent.length,
      status: 'UPLOADED'
    };
  }

  /**
   * Simulate finalizing a submission
   */
  async finalizeSubmission(submissionId: string): Promise<EsgFinalizeResponse> {
    await this.delay(DEFAULT_OPERATION_TIMING.finalize);

    const record = this.submissions.get(submissionId);
    if (!record) {
      throw new MockApiError(`Submission ${submissionId} not found`, 'validation', 404);
    }

    if (record.status !== 'uploaded') {
      throw new MockApiError(
        `Cannot finalize submission in status: ${record.status}`,
        'validation',
        400
      );
    }

    const esgCoreId = `DEMO-CORE-${uuidv4()}`;
    record.esgCoreId = esgCoreId;
    record.status = 'finalized';
    record.finalizedAt = new Date();
    this.submissions.set(submissionId, record);

    // Start the acknowledgment progression based on scenario
    this.startAckProgression(submissionId);

    return {
      submissionId,
      status: 'FINALIZED',
      esgCoreId
    };
  }

  /**
   * Get submission status/acknowledgment
   */
  async getSubmissionStatus(submissionId: string): Promise<EsgAcknowledgmentResponse | null> {
    await this.delay(DEFAULT_OPERATION_TIMING.getStatus);

    const record = this.submissions.get(submissionId);
    if (!record) {
      throw new MockApiError(`Submission ${submissionId} not found`, 'validation', 404);
    }

    if (!record.currentAck) {
      return null; // No acknowledgment yet
    }

    return this.buildAckResponse(record);
  }

  /**
   * Check acknowledgment by ESG Core ID
   */
  async checkAcknowledgment(esgCoreId: string): Promise<EsgAcknowledgmentResponse | null> {
    await this.delay(DEFAULT_OPERATION_TIMING.getStatus);

    // Find submission by core ID
    let record: MockSubmissionRecord | undefined;
    for (const [, rec] of this.submissions) {
      if (rec.esgCoreId === esgCoreId) {
        record = rec;
        break;
      }
    }

    if (!record) {
      return null; // Not found = no ack yet
    }

    if (!record.currentAck) {
      return null;
    }

    return this.buildAckResponse(record);
  }

  /**
   * Build acknowledgment response from record
   */
  private buildAckResponse(record: MockSubmissionRecord): EsgAcknowledgmentResponse {
    const latestAck = record.ackHistory[record.ackHistory.length - 1];

    return {
      submissionId: record.submissionId,
      acknowledgmentType: record.currentAck!,
      fdaCoreId: record.fdaCoreId,
      timestamp: latestAck?.timestamp.toISOString() || new Date().toISOString(),
      details: this.getAckDescription(record.currentAck!),
      errors: record.nackErrors
    };
  }

  /**
   * Get description for acknowledgment type
   */
  private getAckDescription(ackType: EsgAckType): string {
    const descriptions: Record<EsgAckType, string> = {
      ACK1: 'Submission received by gateway',
      ACK2: 'XML validated - syntactically correct',
      ACK3: 'Submission accepted and loaded into FAERS database',
      NACK: 'Submission rejected - see error details'
    };
    return descriptions[ackType];
  }

  /**
   * Start acknowledgment progression based on scenario
   */
  private startAckProgression(submissionId: string): void {
    const record = this.submissions.get(submissionId);
    if (!record) return;

    // Clear any existing timers for this submission
    this.clearAckTimers(submissionId);

    const timers: NodeJS.Timeout[] = [];
    const scenario = record.scenario;

    // Get adjusted delays
    const ack1Delay = this.getAdjustedDelay(this.config.ack1DelayMs);
    const ack2Delay = this.getAdjustedDelay(this.config.ack2DelayMs);
    const ack3Delay = this.getAdjustedDelay(this.config.ack3DelayMs);

    // Apply slow processing multiplier if needed
    const slowMultiplier = scenario === 'slow_processing' ? 3 : 1;

    // ACK1 - always happens first
    timers.push(
      setTimeout(() => {
        this.setAck(submissionId, 'ACK1');
      }, ack1Delay * slowMultiplier)
    );

    // ACK2 or NACK (validation error)
    if (scenario === 'validation_error') {
      timers.push(
        setTimeout(() => {
          this.setNack(submissionId, ['E001', 'E002']);
        }, (ack1Delay + ack2Delay) * slowMultiplier)
      );
    } else {
      timers.push(
        setTimeout(() => {
          this.setAck(submissionId, 'ACK2');
        }, (ack1Delay + ack2Delay) * slowMultiplier)
      );

      // ACK3 or NACK (business rule error)
      if (scenario === 'business_rule_error') {
        timers.push(
          setTimeout(() => {
            this.setNack(submissionId, ['BR-001', 'BR-042']);
          }, (ack1Delay + ack2Delay + ack3Delay) * slowMultiplier)
        );
      } else {
        timers.push(
          setTimeout(() => {
            this.setAck(submissionId, 'ACK3');
            // Generate FDA Core ID on ACK3
            const rec = this.submissions.get(submissionId);
            if (rec) {
              const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              rec.fdaCoreId = `DEMO-FDA-${dateStr}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
              rec.status = 'complete';
              this.submissions.set(submissionId, rec);
            }
          }, (ack1Delay + ack2Delay + ack3Delay) * slowMultiplier)
        );
      }
    }

    this.ackProgressionTimers.set(submissionId, timers);
  }

  /**
   * Set acknowledgment for a submission
   */
  private setAck(submissionId: string, ackType: EsgAckType): void {
    const record = this.submissions.get(submissionId);
    if (!record) return;

    record.currentAck = ackType;
    record.ackHistory.push({ type: ackType, timestamp: new Date() });
    this.submissions.set(submissionId, record);
  }

  /**
   * Set NACK with error codes
   */
  private setNack(submissionId: string, errorCodes: string[]): void {
    const record = this.submissions.get(submissionId);
    if (!record) return;

    record.currentAck = 'NACK';
    record.status = 'rejected';
    record.ackHistory.push({ type: 'NACK', timestamp: new Date() });
    record.nackErrors = errorCodes.map(code => {
      const errorDef = DEMO_NACK_ERRORS[code] || {
        code,
        description: 'Unknown error',
        remediation: 'Contact support'
      };
      return {
        code: errorDef.code,
        message: errorDef.description,
        field: errorDef.field,
        severity: 'error' as const
      };
    });
    this.submissions.set(submissionId, record);
  }

  /**
   * Clear acknowledgment timers for a submission
   */
  private clearAckTimers(submissionId: string): void {
    const timers = this.ackProgressionTimers.get(submissionId);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      this.ackProgressionTimers.delete(submissionId);
    }
  }

  /**
   * Get all mock submissions (for debugging/testing)
   */
  getSubmissions(): MockSubmissionRecord[] {
    return Array.from(this.submissions.values());
  }

  /**
   * Get a specific submission record
   */
  getSubmission(submissionId: string): MockSubmissionRecord | undefined {
    return this.submissions.get(submissionId);
  }

  /**
   * Reset all demo data
   */
  reset(): { submissionsCleared: number } {
    const count = this.submissions.size;

    // Clear all timers
    for (const submissionId of this.submissions.keys()) {
      this.clearAckTimers(submissionId);
    }

    this.submissions.clear();
    this.tokenCache.clear();

    return { submissionsCleared: count };
  }

  /**
   * Clean up resources (call on shutdown)
   */
  cleanup(): void {
    for (const submissionId of this.submissions.keys()) {
      this.clearAckTimers(submissionId);
    }
  }
}

/**
 * Mock API Error class (mirrors EsgApiError)
 */
export class MockApiError extends Error {
  readonly category: 'authentication' | 'network' | 'rate_limit' | 'server_error' | 'validation' | 'unknown';
  readonly httpStatus?: number;

  constructor(
    message: string,
    category: 'authentication' | 'network' | 'rate_limit' | 'server_error' | 'validation' | 'unknown',
    httpStatus?: number
  ) {
    super(message);
    this.name = 'MockApiError';
    this.category = category;
    this.httpStatus = httpStatus;
  }
}
