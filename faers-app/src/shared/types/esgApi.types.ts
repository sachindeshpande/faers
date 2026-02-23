/**
 * Phase 2B: ESG NextGen API Integration Types
 *
 * Type definitions for automated FDA ESG NextGen API submission,
 * OAuth 2.0 authentication, acknowledgment polling, and retry logic.
 * Includes Demo Mode types for testing and demonstrations.
 */

// ============================================================
// API Environment & Endpoints
// ============================================================

export type EsgApiEnvironment = 'Test' | 'Production' | 'Demo';

export const ESG_API_BASE_URLS: Record<Exclude<EsgApiEnvironment, 'Demo'>, string> = {
  Test: 'https://api-test.fda.gov/esg/v1',
  Production: 'https://api.fda.gov/esg/v1'
};

export const ESG_OAUTH_URLS: Record<Exclude<EsgApiEnvironment, 'Demo'>, string> = {
  Test: 'https://api-test.fda.gov/esg/oauth2/token',
  Production: 'https://api.fda.gov/esg/oauth2/token'
};

// ============================================================
// Demo Mode Types
// ============================================================

export type DemoScenario =
  | 'happy_path'
  | 'slow_processing'
  | 'validation_error'
  | 'business_rule_error'
  | 'network_error'
  | 'rate_limited';

export const DEMO_SCENARIO_LABELS: Record<DemoScenario, string> = {
  happy_path: 'Happy Path - Standard successful submission',
  slow_processing: 'Slow Processing - Delayed acknowledgments',
  validation_error: 'Validation Error - XML validation failure (NACK at ACK2)',
  business_rule_error: 'Business Rule Error - Semantic validation failure (NACK at ACK3)',
  network_error: 'Network Error - Simulated connectivity issue (retry flow)',
  rate_limited: 'Rate Limited - 429 response simulation (backoff and retry)'
};

export type DemoSpeed = 'realtime' | 'fast' | 'instant';

export const DEMO_SPEED_LABELS: Record<DemoSpeed, string> = {
  realtime: 'Real-time - Normal timing delays',
  fast: 'Fast - 10x faster for quick demos',
  instant: 'Instant - No delays for rapid testing'
};

export interface DemoModeConfig {
  enabled: boolean;
  scenario: DemoScenario;
  speed: DemoSpeed;
  ack1DelayMs: number;
  ack2DelayMs: number;
  ack3DelayMs: number;
}

export const DEFAULT_DEMO_CONFIG: DemoModeConfig = {
  enabled: false,
  scenario: 'happy_path',
  speed: 'realtime',
  ack1DelayMs: 5000,
  ack2DelayMs: 10000,
  ack3DelayMs: 15000
};

export const DEMO_TIMING_MULTIPLIERS: Record<DemoSpeed, number> = {
  realtime: 1,
  fast: 0.1,
  instant: 0.001
};

// Pre-configured demo credentials (clearly fake, not real)
export const DEMO_CREDENTIALS = {
  clientId: 'DEMO-CLIENT-001',
  secretKey: 'demo-secret-not-real',
  environment: 'Demo' as const,
  senderCompanyName: 'Demo Company Inc.',
  senderContactName: 'Demo User',
  senderContactEmail: 'demo@example.com'
};

// Sample NACK error codes for demo scenarios
export const DEMO_NACK_ERRORS: Record<string, { code: string; description: string; field?: string; remediation: string }> = {
  E001: {
    code: 'E001',
    description: 'XML Schema Validation Error',
    remediation: 'Check XML structure against E2B(R3) schema'
  },
  E002: {
    code: 'E002',
    description: 'Missing Required Element',
    field: 'primarysource',
    remediation: 'Ensure all required elements are present'
  },
  'BR-001': {
    code: 'BR-001',
    description: 'Invalid MedDRA Term',
    field: 'reaction/reactionmeddraversionllt',
    remediation: 'Use valid MedDRA LLT code from current version'
  },
  'BR-042': {
    code: 'BR-042',
    description: 'Duplicate Safety Report',
    remediation: 'Check if this report was previously submitted'
  },
  'BR-105': {
    code: 'BR-105',
    description: 'Invalid Date Sequence',
    field: 'patient/drug/drugstartdate',
    remediation: 'Drug start date cannot be after reaction onset date'
  }
};

// ============================================================
// OAuth 2.0 Types
// ============================================================

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string; // 'Bearer'
  expires_in: number; // seconds
  scope?: string;
}

export interface CachedOAuthToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number; // Unix timestamp in ms
  environment: EsgApiEnvironment;
}

// ============================================================
// Credential & Settings Types
// ============================================================

export interface EsgApiCredentials {
  clientId: string;
  secretKey: string;
}

export interface EsgApiSettings {
  // Credential metadata (secret stored separately via safeStorage)
  clientId: string;
  environment: EsgApiEnvironment;

  // Sender information
  senderCompanyName: string;
  senderContactName: string;
  senderContactEmail: string;

  // Polling settings
  pollingIntervalMinutes: number; // default 5, range 1-60
  pollingTimeoutHours: number; // default 48, range 1-168

  // Retry settings
  maxAutomaticRetries: number; // default 3, range 0-10
  maxTotalAttempts: number; // default 5

  // Connection status
  isConfigured: boolean;
  lastConnectionTest?: string; // ISO timestamp
  lastConnectionResult?: 'success' | 'failure';

  // Demo mode settings
  demoConfig?: DemoModeConfig;
}

export const DEFAULT_ESG_API_SETTINGS: EsgApiSettings = {
  clientId: '',
  environment: 'Test',
  senderCompanyName: '',
  senderContactName: '',
  senderContactEmail: '',
  pollingIntervalMinutes: 5,
  pollingTimeoutHours: 48,
  maxAutomaticRetries: 3,
  maxTotalAttempts: 5,
  isConfigured: false,
  demoConfig: DEFAULT_DEMO_CONFIG
};

// ============================================================
// Submission Step & Progress Types
// ============================================================

export type ApiSubmissionStep =
  | 'authenticating'
  | 'creating_submission'
  | 'uploading_xml'
  | 'finalizing'
  | 'checking_status'
  | 'complete'
  | 'failed';

export const API_SUBMISSION_STEP_LABELS: Record<ApiSubmissionStep, string> = {
  authenticating: 'Authenticating with FDA ESG',
  creating_submission: 'Creating Submission',
  uploading_xml: 'Uploading E2B(R3) XML',
  finalizing: 'Finalizing Submission',
  checking_status: 'Checking Status',
  complete: 'Submission Complete',
  failed: 'Submission Failed'
};

export interface ApiSubmissionProgress {
  caseId: string;
  currentStep: ApiSubmissionStep;
  stepDescription: string;
  stepsCompleted: number;
  totalSteps: number;
  startedAt: string; // ISO timestamp
  elapsedMs: number;
  esgSubmissionId?: string;
  error?: string;
  errorCategory?: EsgErrorCategory;
  // Demo mode info
  isDemoMode?: boolean;
  demoScenario?: DemoScenario;
}

// ============================================================
// ESG API Request/Response Types
// ============================================================

export interface EsgCreateSubmissionRequest {
  submissionType: 'ICSR';
  environment: EsgApiEnvironment;
  senderCompanyName: string;
  senderContactName: string;
  senderContactEmail: string;
}

export interface EsgCreateSubmissionResponse {
  submissionId: string;
  status: string;
  createdAt: string;
}

export interface EsgUploadResponse {
  fileId: string;
  filename: string;
  size: number;
  status: string;
}

export interface EsgFinalizeResponse {
  submissionId: string;
  status: string;
  esgCoreId: string;
}

// ============================================================
// Acknowledgment Types
// ============================================================

export type EsgAckType = 'ACK1' | 'ACK2' | 'ACK3' | 'NACK';

export const ESG_ACK_LABELS: Record<EsgAckType, string> = {
  ACK1: 'ACK1 - Syntactically Valid',
  ACK2: 'ACK2 - Processed & Accepted',
  ACK3: 'ACK3 - Loaded in FAERS DB',
  NACK: 'NACK - Rejected'
};

export const ESG_ACK_COLORS: Record<EsgAckType, string> = {
  ACK1: 'processing',
  ACK2: 'success',
  ACK3: 'success',
  NACK: 'error'
};

export interface EsgAcknowledgmentResponse {
  submissionId: string;
  acknowledgmentType: EsgAckType;
  fdaCoreId?: string;
  timestamp: string;
  details?: string;
  errors?: EsgAckError[];
}

export interface EsgAckError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

// ============================================================
// Error Handling Types
// ============================================================

export type EsgErrorCategory =
  | 'authentication'
  | 'network'
  | 'rate_limit'
  | 'server_error'
  | 'validation'
  | 'unknown';

export const ESG_ERROR_CATEGORY_LABELS: Record<EsgErrorCategory, string> = {
  authentication: 'Authentication Error',
  network: 'Network Error',
  rate_limit: 'Rate Limit Exceeded',
  server_error: 'Server Error',
  validation: 'Validation Error',
  unknown: 'Unknown Error'
};

export const RETRYABLE_ERROR_CATEGORIES: EsgErrorCategory[] = [
  'network',
  'rate_limit',
  'server_error'
];

// ============================================================
// API Submission Attempt Record (DB)
// ============================================================

export interface ApiSubmissionAttempt {
  id?: number;
  caseId: string;
  attemptNumber: number;
  esgSubmissionId?: string;
  esgCoreId?: string;
  environment: EsgApiEnvironment;
  status: 'in_progress' | 'success' | 'failed' | 'retrying';
  startedAt: string;
  completedAt?: string;
  error?: string;
  errorCategory?: EsgErrorCategory;
  httpStatusCode?: number;
  // Acknowledgment info
  ackType?: EsgAckType;
  ackTimestamp?: string;
  ackFdaCoreId?: string;
  ackErrors?: string; // JSON string of EsgAckError[]
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// IPC Request/Response Types
// ============================================================

export interface SubmitToFdaRequest {
  caseId: string;
  environment?: EsgApiEnvironment;
  // Demo mode options
  demoScenario?: DemoScenario;
  demoSpeed?: DemoSpeed;
}

export interface SubmitToFdaResult {
  success: boolean;
  caseId: string;
  esgCoreId?: string;
  esgSubmissionId?: string;
  error?: string;
  errorCategory?: EsgErrorCategory;
  attemptNumber: number;
  // Demo mode info
  isDemoMode?: boolean;
  demoScenario?: DemoScenario;
}

export interface CheckAcknowledgmentRequest {
  caseId: string;
}

export interface CheckAcknowledgmentResult {
  caseId: string;
  hasAcknowledgment: boolean;
  acknowledgment?: EsgAcknowledgmentResponse;
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  environment: EsgApiEnvironment;
  latencyMs: number;
  error?: string;
  tokenValid?: boolean;
  isDemoMode?: boolean;
}

export interface PollingStatus {
  isActive: boolean;
  casesBeingPolled: number;
  lastPollTime?: string;
  nextPollTime?: string;
  errors?: string[];
}

export interface PreSubmissionSummary {
  caseId: string;
  safetyReportId?: string;
  patientInitials?: string;
  primaryReaction?: string;
  primaryDrug?: string;
  environment: EsgApiEnvironment;
  isTestMode: boolean;
  isDemoMode: boolean;
  validationPassed: boolean;
  warningCount: number;
}

// ============================================================
// Save Credentials Request
// ============================================================

export interface SaveCredentialsRequest {
  clientId: string;
  secretKey: string;
}

export interface SaveEsgSettingsRequest {
  clientId?: string;
  environment?: EsgApiEnvironment;
  senderCompanyName?: string;
  senderContactName?: string;
  senderContactEmail?: string;
  pollingIntervalMinutes?: number;
  pollingTimeoutHours?: number;
  maxAutomaticRetries?: number;
  maxTotalAttempts?: number;
  isConfigured?: boolean;
  demoConfig?: Partial<DemoModeConfig>;
}

// ============================================================
// Demo Mode IPC Types
// ============================================================

export interface SetDemoConfigRequest {
  scenario?: DemoScenario;
  speed?: DemoSpeed;
  ack1DelayMs?: number;
  ack2DelayMs?: number;
  ack3DelayMs?: number;
}

export interface ResetDemoDataResult {
  success: boolean;
  casesReset: number;
  submissionsCleared: number;
  error?: string;
}

export interface DemoSampleCase {
  id: string;
  name: string;
  description: string;
  scenario: string;
  patientInitials: string;
  primaryDrug: string;
  primaryReaction: string;
}

export const DEMO_SAMPLE_CASES: DemoSampleCase[] = [
  {
    id: 'demo-case-001',
    name: 'Complete Expedited Case',
    description: 'Serious, unexpected adverse event requiring expedited reporting',
    scenario: 'Expedited (serious/unexpected)',
    patientInitials: 'J.D.',
    primaryDrug: 'DEMODREX (demosubstance)',
    primaryReaction: 'Anaphylactic reaction'
  },
  {
    id: 'demo-case-002',
    name: 'Non-Expedited Periodic Case',
    description: 'Known adverse event for periodic safety reporting',
    scenario: 'Non-expedited (periodic)',
    patientInitials: 'M.S.',
    primaryDrug: 'SAMPLECIN (sampleactum)',
    primaryReaction: 'Headache'
  },
  {
    id: 'demo-case-003',
    name: 'Follow-up Report',
    description: 'Follow-up to previously submitted case with additional information',
    scenario: 'Follow-up report',
    patientInitials: 'A.B.',
    primaryDrug: 'TESTINOL (testinolum)',
    primaryReaction: 'Rash generalised'
  },
  {
    id: 'demo-case-004',
    name: 'Multiple Drugs/Reactions',
    description: 'Complex case with multiple concomitant drugs and reactions',
    scenario: 'Multiple drugs/reactions',
    patientInitials: 'R.K.',
    primaryDrug: 'POLYPHARM A + POLYPHARM B',
    primaryReaction: 'Drug interaction, Hepatotoxicity'
  },
  {
    id: 'demo-case-005',
    name: 'Minimal Valid Case',
    description: 'Case with only required fields populated',
    scenario: 'Minimal required fields',
    patientInitials: 'X.Y.',
    primaryDrug: 'MINIDRUG (miniactum)',
    primaryReaction: 'Adverse event'
  }
];
