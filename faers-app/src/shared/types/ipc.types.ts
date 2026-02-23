/**
 * IPC Channel definitions and types for Electron main/renderer communication
 */

import type {
  Case,
  CaseListItem,
  CaseFilterOptions,
  CreateCaseDTO,
  UpdateCaseDTO,
  ValidationResult,
  CaseReporter,
  CaseReaction,
  CaseDrug,
  SubmissionHistoryEntry,
  SubmissionRecord,
  DashboardStats,
  AcknowledgmentType,
  SubmissionEnvironment,
  SubmissionReportType
} from './case.types';
import type { Form3500AImportResult } from './form3500.types';
import type {
  Product,
  ProductListItem,
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilter,
  ProductListResponse
} from './product.types';
import type {
  ReportTypeClassification,
  ExpeditedCriteria,
  Expectedness,
  SeriousnessCriterion,
  CaseSeriousness,
  CaseClassification,
  ClassificationSuggestion,
  ClassificationUpdate
} from './classification.types';
import type {
  FollowupType,
  NullificationReason,
  CaseVersion,
  CaseVersionChain,
  CreateFollowupRequest,
  CreateFollowupResponse,
  CreateNullificationRequest,
  CreateNullificationResponse,
  VersionComparison,
  FollowupDueDate
} from './followup.types';
import type {
  SubmissionBatch,
  BatchCase,
  BatchListItem,
  BatchType,
  BatchFilter,
  BatchListResponse,
  CreateBatchRequest,
  CreateBatchResponse,
  BatchValidationResult,
  ExportBatchResponse,
  RecordBatchSubmissionRequest,
  RecordBatchAcknowledgmentRequest,
  BatchCaseEligibility
} from './batch.types';
import type {
  PSRSchedule,
  PSR,
  PSRListItem,
  PSRCase,
  PSRFormat,
  PSRFilter,
  PSRListResponse,
  CreatePSRScheduleDTO,
  UpdatePSRScheduleDTO,
  CreatePSRDTO,
  PSRPeriodCalculation,
  UpdatePSRCasesRequest,
  PSRTransitionRequest,
  PSRDashboardSummary
} from './psr.types';

// Phase 3 imports
import type {
  User,
  UserListItem,
  Role,
  Permission,
  Session,
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilter,
  PasswordValidationResult
} from './auth.types';
import type {
  WorkflowStatus,
  WorkflowTransitionRequest,
  WorkflowTransitionResult,
  CaseAssignment,
  AssignCaseRequest,
  ReassignCaseRequest,
  CaseComment,
  AddCommentRequest,
  CaseNote,
  AddNoteRequest,
  WorkloadSummary,
  CaseHistoryEntry
} from './workflow.types';
import type {
  AuditLogEntry,
  AuditLogFilter,
  AuditLogResult,
  AuditExportRequest,
  AuditExportResult
} from './audit.types';

// Phase 5 imports
import type {
  MedDRAVersion,
  MedDRASearchResult,
  MedDRAHierarchy,
  MedDRACoding,
  MedDRATreeNode,
  MedDRAImportProgress,
  MedDRAImportRequest,
  MedDRASearchOptions,
  MedDRABrowseRequest
} from './meddra.types';
import type {
  WHODrugVersion,
  WHODrugSearchResult,
  WHODrugProduct,
  WHODrugCoding,
  ATCCode,
  ATCTreeNode,
  WHODrugImportProgress,
  WHODrugImportRequest,
  WHODrugSearchOptions,
  WHODrugBrowseATCRequest
} from './whodrug.types';
import type {
  SearchQuery,
  SavedSearch,
  SearchResults,
  SearchableField
} from './search.types';
import type {
  DuplicateCandidate,
  DuplicateCheckResult,
  DuplicateFilter,
  DuplicateListItem,
  MergeCasesRequest,
  MergeCasesResult,
  DuplicateResolution,
  BatchDuplicateScanRequest,
  BatchDuplicateScanResult,
  MergedCase,
  DuplicateCheckSettings
} from './duplicate.types';
import type {
  CaseTemplate,
  TemplateListItem,
  TemplateFilter,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ApplyTemplateResult
} from './template.types';
import type {
  ImportJob,
  ImportJobListItem,
  ImportUploadResponse,
  ColumnMapping,
  ImportValidationSummary,
  ImportExecuteOptions,
  ImportExecuteResult,
  SavedColumnMapping
} from './import.types';
import type {
  ValidationRule,
  ValidationRuleListItem,
  ValidationSummary,
  CreateValidationRuleRequest,
  UpdateValidationRuleRequest,
  TestRuleRequest,
  TestRuleResult,
  ValidationRuleFilter,
  AcknowledgeWarningRequest
} from './validation.types';
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
  ApiSubmissionProgress,
  DemoModeConfig,
  DemoScenario,
  DemoSpeed,
  DemoSampleCase,
  ResetDemoDataResult,
  SetDemoConfigRequest
} from './esgApi.types';

// IPC Channel names
export const IPC_CHANNELS = {
  // Case operations
  CASE_LIST: 'case:list',
  CASE_GET: 'case:get',
  CASE_CREATE: 'case:create',
  CASE_UPDATE: 'case:update',
  CASE_DELETE: 'case:delete',
  CASE_DUPLICATE: 'case:duplicate',
  CASE_VALIDATE: 'case:validate',
  CASE_COUNT: 'case:count',

  // Reporter operations
  REPORTER_LIST: 'reporter:list',
  REPORTER_SAVE: 'reporter:save',
  REPORTER_DELETE: 'reporter:delete',

  // Reaction operations
  REACTION_LIST: 'reaction:list',
  REACTION_SAVE: 'reaction:save',
  REACTION_DELETE: 'reaction:delete',

  // Drug operations
  DRUG_LIST: 'drug:list',
  DRUG_SAVE: 'drug:save',
  DRUG_DELETE: 'drug:delete',

  // XML operations
  XML_GENERATE: 'xml:generate',
  XML_EXPORT: 'xml:export',
  XML_VALIDATE: 'xml:validate',

  // Database operations
  DB_BACKUP: 'db:backup',
  DB_RESTORE: 'db:restore',

  // Settings operations
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Lookup data
  LOOKUP_COUNTRIES: 'lookup:countries',
  LOOKUP_MEDDRA: 'lookup:meddra',

  // File operations
  FILE_SAVE_DIALOG: 'file:saveDialog',
  FILE_OPEN_DIALOG: 'file:openDialog',

  // Import operations
  IMPORT_FORM3500: 'import:form3500',

  // Phase 2: Submission operations
  SUBMISSION_RECORD: 'submission:record',
  SUBMISSION_ACKNOWLEDGE: 'submission:acknowledge',
  SUBMISSION_GET_HISTORY: 'submission:history',
  SUBMISSION_GET_RECORD: 'submission:getRecord',

  // Phase 2: Dashboard operations
  DASHBOARD_GET_STATS: 'dashboard:stats',

  // Phase 2: FDA Export
  XML_EXPORT_FDA: 'xml:exportFda',

  // Phase 2: Status transitions
  CASE_MARK_READY: 'case:markReady',
  CASE_REVERT_TO_DRAFT: 'case:revertToDraft',

  // ============================================================
  // Phase 3: Authentication
  // ============================================================
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_VALIDATE_SESSION: 'auth:validateSession',
  AUTH_CHANGE_PASSWORD: 'auth:changePassword',
  AUTH_GET_CURRENT_USER: 'auth:getCurrentUser',
  AUTH_EXTEND_SESSION: 'auth:extendSession',
  AUTH_GET_SESSION_CONFIG: 'auth:getSessionConfig',
  AUTH_VALIDATE_PASSWORD_POLICY: 'auth:validatePasswordPolicy',

  // ============================================================
  // Phase 3: User Management
  // ============================================================
  USER_LIST: 'user:list',
  USER_GET: 'user:get',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DEACTIVATE: 'user:deactivate',
  USER_REACTIVATE: 'user:reactivate',
  USER_RESET_PASSWORD: 'user:resetPassword',
  USER_GET_PROFILE: 'user:getProfile',
  USER_UPDATE_PROFILE: 'user:updateProfile',

  // ============================================================
  // Phase 3: Role Management
  // ============================================================
  ROLE_LIST: 'role:list',
  ROLE_GET: 'role:get',
  PERMISSION_LIST: 'permission:list',

  // ============================================================
  // Phase 3: Workflow
  // ============================================================
  WORKFLOW_TRANSITION: 'workflow:transition',
  WORKFLOW_GET_AVAILABLE_ACTIONS: 'workflow:getAvailableActions',

  // ============================================================
  // Phase 3: Case Assignment
  // ============================================================
  CASE_ASSIGN: 'case:assign',
  CASE_REASSIGN: 'case:reassign',
  CASE_GET_ASSIGNMENTS: 'case:getAssignments',
  CASE_GET_MY_CASES: 'case:getMyCases',
  WORKLOAD_GET_SUMMARY: 'workload:getSummary',

  // ============================================================
  // Phase 3: Comments & Notes
  // ============================================================
  COMMENT_ADD: 'comment:add',
  COMMENT_LIST: 'comment:list',
  NOTE_ADD: 'note:add',
  NOTE_LIST: 'note:list',
  NOTE_RESOLVE: 'note:resolve',

  // ============================================================
  // Phase 3: Audit Trail
  // ============================================================
  AUDIT_GET_LOG: 'audit:getLog',
  AUDIT_GET_CASE_HISTORY: 'audit:getCaseHistory',
  AUDIT_EXPORT: 'audit:export',

  // ============================================================
  // Phase 3: Notifications
  // ============================================================
  NOTIFICATION_GET: 'notification:get',
  NOTIFICATION_MARK_READ: 'notification:markRead',
  NOTIFICATION_GET_UNREAD_COUNT: 'notification:getUnreadCount',

  // ============================================================
  // Phase 4: Product Management
  // ============================================================
  PRODUCT_LIST: 'product:list',
  PRODUCT_GET: 'product:get',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_SEARCH: 'product:search',

  // ============================================================
  // Phase 4: Report Type Classification
  // ============================================================
  REPORT_TYPE_GET: 'reportType:get',
  REPORT_TYPE_SUGGEST: 'reportType:suggest',
  REPORT_TYPE_CLASSIFY: 'reportType:classify',
  REPORT_TYPE_IS_EXPEDITED: 'reportType:isExpedited',
  REPORT_TYPE_GET_DUE_DATE: 'reportType:getDueDate',
  SERIOUSNESS_GET: 'seriousness:get',
  SERIOUSNESS_SET: 'seriousness:set',
  SERIOUSNESS_SET_ALL: 'seriousness:setAll',
  EXPECTEDNESS_SET: 'expectedness:set',

  // ============================================================
  // Phase 4: Follow-up & Nullification
  // ============================================================
  FOLLOWUP_CREATE: 'followup:create',
  FOLLOWUP_GET_CHAIN: 'followup:getChain',
  FOLLOWUP_COMPARE: 'followup:compare',
  FOLLOWUP_GET_DUE_DATE: 'followup:getDueDate',
  FOLLOWUP_CAN_CREATE: 'followup:canCreate',
  NULLIFICATION_CREATE: 'nullification:create',
  NULLIFICATION_CAN_CREATE: 'nullification:canCreate',

  // ============================================================
  // Phase 4: Batch Submission
  // ============================================================
  BATCH_CREATE: 'batch:create',
  BATCH_GET: 'batch:get',
  BATCH_LIST: 'batch:list',
  BATCH_GET_CASES: 'batch:getCases',
  BATCH_VALIDATE: 'batch:validate',
  BATCH_EXPORT: 'batch:export',
  BATCH_SUBMIT: 'batch:submit',
  BATCH_ACKNOWLEDGE: 'batch:acknowledge',
  BATCH_ADD_CASE: 'batch:addCase',
  BATCH_REMOVE_CASE: 'batch:removeCase',
  BATCH_DELETE: 'batch:delete',
  BATCH_GET_ELIGIBLE_CASES: 'batch:getEligibleCases',

  // ============================================================
  // Phase 4: PSR Management
  // ============================================================
  PSR_SCHEDULE_CREATE: 'psr:scheduleCreate',
  PSR_SCHEDULE_GET: 'psr:scheduleGet',
  PSR_SCHEDULE_UPDATE: 'psr:scheduleUpdate',
  PSR_SCHEDULE_DELETE: 'psr:scheduleDelete',
  PSR_SCHEDULE_GET_NEXT_PERIOD: 'psr:scheduleGetNextPeriod',
  PSR_CREATE: 'psr:create',
  PSR_GET: 'psr:get',
  PSR_LIST: 'psr:list',
  PSR_TRANSITION: 'psr:transition',
  PSR_GET_CASES: 'psr:getCases',
  PSR_GET_ELIGIBLE_CASES: 'psr:getEligibleCases',
  PSR_UPDATE_CASES: 'psr:updateCases',
  PSR_DASHBOARD: 'psr:dashboard',

  // ============================================================
  // Phase 5: MedDRA Dictionary
  // ============================================================
  MEDDRA_VERSIONS: 'meddra:versions',
  MEDDRA_ACTIVE_VERSION: 'meddra:activeVersion',
  MEDDRA_ACTIVATE_VERSION: 'meddra:activateVersion',
  MEDDRA_DELETE_VERSION: 'meddra:deleteVersion',
  MEDDRA_IMPORT: 'meddra:import',
  MEDDRA_IMPORT_PROGRESS: 'meddra:importProgress',
  MEDDRA_SEARCH: 'meddra:search',
  MEDDRA_BROWSE: 'meddra:browse',
  MEDDRA_HIERARCHY: 'meddra:hierarchy',
  MEDDRA_HIERARCHY_LLT: 'meddra:hierarchyLlt',
  MEDDRA_CODE: 'meddra:code',
  MEDDRA_CODE_PT: 'meddra:codePt',
  MEDDRA_SELECT_FOLDER: 'meddra:selectFolder',

  // ============================================================
  // Phase 5: WHO Drug Dictionary
  // ============================================================
  WHODRUG_VERSIONS: 'whodrug:versions',
  WHODRUG_ACTIVE_VERSION: 'whodrug:activeVersion',
  WHODRUG_ACTIVATE_VERSION: 'whodrug:activateVersion',
  WHODRUG_DELETE_VERSION: 'whodrug:deleteVersion',
  WHODRUG_IMPORT: 'whodrug:import',
  WHODRUG_IMPORT_PROGRESS: 'whodrug:importProgress',
  WHODRUG_SEARCH: 'whodrug:search',
  WHODRUG_GET_PRODUCT: 'whodrug:getProduct',
  WHODRUG_BROWSE_ATC: 'whodrug:browseAtc',
  WHODRUG_PRODUCTS_BY_ATC: 'whodrug:productsByAtc',
  WHODRUG_ATC_HIERARCHY: 'whodrug:atcHierarchy',
  WHODRUG_CODE: 'whodrug:code',
  WHODRUG_SELECT_FOLDER: 'whodrug:selectFolder',

  // ============================================================
  // Phase 5: Advanced Search
  // ============================================================
  SEARCH_FULLTEXT: 'search:fulltext',
  SEARCH_ADVANCED: 'search:advanced',
  SEARCH_SAVE: 'search:save',
  SEARCH_UPDATE_SAVED: 'search:updateSaved',
  SEARCH_DELETE_SAVED: 'search:deleteSaved',
  SEARCH_LIST_SAVED: 'search:listSaved',
  SEARCH_EXECUTE_SAVED: 'search:executeSaved',
  SEARCH_GET_FIELDS: 'search:getFields',

  // ============================================================
  // Phase 5: Duplicate Detection
  // ============================================================
  DUPLICATE_CHECK: 'duplicate:check',
  DUPLICATE_GET_CANDIDATES: 'duplicate:getCandidates',
  DUPLICATE_GET_CANDIDATE: 'duplicate:getCandidate',
  DUPLICATE_RESOLVE: 'duplicate:resolve',
  DUPLICATE_GET_PENDING: 'duplicate:getPending',
  DUPLICATE_GET_STATS: 'duplicate:getStats',
  DUPLICATE_MERGE: 'duplicate:merge',
  DUPLICATE_GET_MERGE_HISTORY: 'duplicate:getMergeHistory',
  DUPLICATE_GET_SETTINGS: 'duplicate:getSettings',
  DUPLICATE_UPDATE_SETTINGS: 'duplicate:updateSettings',
  DUPLICATE_BATCH_SCAN: 'duplicate:batchScan',
  DUPLICATE_GET_SCAN_STATUS: 'duplicate:getScanStatus',

  // ============================================================
  // Phase 5: Case Templates
  // ============================================================
  TEMPLATE_CREATE: 'template:create',
  TEMPLATE_UPDATE: 'template:update',
  TEMPLATE_DELETE: 'template:delete',
  TEMPLATE_GET: 'template:get',
  TEMPLATE_LIST: 'template:list',
  TEMPLATE_APPLY: 'template:apply',
  TEMPLATE_APPROVE: 'template:approve',
  TEMPLATE_CREATE_FROM_CASE: 'template:createFromCase',

  // ============================================================
  // Phase 5: Bulk Import
  // ============================================================
  IMPORT_UPLOAD: 'import:upload',
  IMPORT_SET_MAPPING: 'import:setMapping',
  IMPORT_VALIDATE: 'import:validate',
  IMPORT_EXECUTE: 'import:execute',
  IMPORT_GET: 'import:get',
  IMPORT_LIST: 'import:list',
  IMPORT_GET_ERRORS: 'import:getErrors',
  IMPORT_CANCEL: 'import:cancel',
  IMPORT_SAVE_MAPPING: 'import:saveMapping',
  IMPORT_LIST_MAPPINGS: 'import:listMappings',
  IMPORT_DELETE_MAPPING: 'import:deleteMapping',

  // ============================================================
  // Phase 5: Validation Engine
  // ============================================================
  VALIDATION_RUN: 'validation:run',
  VALIDATION_ACKNOWLEDGE: 'validation:acknowledge',
  VALIDATION_GET_RESULTS: 'validation:getResults',
  VALIDATION_RULES_LIST: 'validation:rulesList',
  VALIDATION_RULE_GET: 'validation:ruleGet',
  VALIDATION_RULE_CREATE: 'validation:ruleCreate',
  VALIDATION_RULE_UPDATE: 'validation:ruleUpdate',
  VALIDATION_RULE_DELETE: 'validation:ruleDelete',
  VALIDATION_RULE_TEST: 'validation:ruleTest',
  VALIDATION_RULE_TOGGLE: 'validation:ruleToggle',

  // ============================================================
  // Phase 2B: ESG NextGen API Integration
  // ============================================================
  ESG_API_TEST_CONNECTION: 'esg:testConnection',
  ESG_API_GET_SETTINGS: 'esg:getSettings',
  ESG_API_SAVE_SETTINGS: 'esg:saveSettings',
  ESG_API_SAVE_CREDENTIALS: 'esg:saveCredentials',
  ESG_API_HAS_CREDENTIALS: 'esg:hasCredentials',
  ESG_API_CLEAR_CREDENTIALS: 'esg:clearCredentials',
  ESG_API_SUBMIT_CASE: 'esg:submitCase',
  ESG_API_RETRY_SUBMISSION: 'esg:retrySubmission',
  ESG_API_CANCEL_SUBMISSION: 'esg:cancelSubmission',
  ESG_API_GET_PROGRESS: 'esg:getProgress',
  ESG_API_GET_PRE_SUMMARY: 'esg:getPreSubmissionSummary',
  ESG_API_CHECK_ACK: 'esg:checkAcknowledgment',
  ESG_API_GET_ATTEMPTS: 'esg:getAttempts',
  ESG_API_POLLING_START: 'esg:pollingStart',
  ESG_API_POLLING_STOP: 'esg:pollingStop',
  ESG_API_POLLING_STATUS: 'esg:pollingStatus',
  // Event channel (main -> renderer push)
  ESG_SUBMISSION_PROGRESS: 'esg:submission-progress',

  // ============================================================
  // Phase 2B: Demo Mode
  // ============================================================
  DEMO_GET_STATUS: 'demo:getStatus',
  DEMO_ACTIVATE: 'demo:activate',
  DEMO_DEACTIVATE: 'demo:deactivate',
  DEMO_GET_CONFIG: 'demo:getConfig',
  DEMO_SET_CONFIG: 'demo:setConfig',
  DEMO_GET_SAMPLE_CASES: 'demo:getSampleCases',
  DEMO_CREATE_SAMPLE_CASES: 'demo:createSampleCases',
  DEMO_RESET_DATA: 'demo:resetData',
  // Event channel (main -> renderer push)
  DEMO_MODE_CHANGED: 'demo:mode-changed'
} as const;

// Type for channel names
export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

// IPC Request/Response types
export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Case operations
export interface CaseListRequest {
  filters?: CaseFilterOptions;
}

export interface CaseListResponse {
  cases: CaseListItem[];
  total: number;
}

export interface CaseGetRequest {
  id: string;
  includeRelated?: boolean;
}

export interface CaseCreateRequest {
  data?: CreateCaseDTO;
}

export interface CaseUpdateRequest {
  id: string;
  data: UpdateCaseDTO;
}

export interface CaseDeleteRequest {
  id: string;
}

export interface CaseDuplicateRequest {
  id: string;
}

export interface CaseValidateRequest {
  id: string;
}

// Reporter operations
export interface ReporterListRequest {
  caseId: string;
}

export interface ReporterSaveRequest {
  reporter: CaseReporter;
}

export interface ReporterDeleteRequest {
  id: number;
}

// Reaction operations
export interface ReactionListRequest {
  caseId: string;
}

export interface ReactionSaveRequest {
  reaction: CaseReaction;
}

export interface ReactionDeleteRequest {
  id: number;
}

// Drug operations
export interface DrugListRequest {
  caseId: string;
}

export interface DrugSaveRequest {
  drug: CaseDrug;
}

export interface DrugDeleteRequest {
  id: number;
}

// XML operations
export interface XMLGenerateRequest {
  caseId: string;
}

export interface XMLExportRequest {
  caseId: string;
  filePath: string;
}

export interface XMLValidateRequest {
  xml: string;
}

// Settings
export interface SettingsGetRequest {
  key: string;
}

export interface SettingsSetRequest {
  key: string;
  value: string;
}

// Lookup data
export interface Country {
  code: string;
  name: string;
}

export interface MedDRATerm {
  code: string;
  term: string;
  ptCode?: string;
  version?: string;
}

// File dialog options
export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

// ============================================================
// Phase 2: Submission Request/Response Types
// ============================================================

// Record FDA ESG NextGen USP submission
export interface RecordSubmissionRequest {
  caseId: string;
  srpConfirmationNumber: string;
  submissionDate: string;
  notes?: string;
}

// Record FDA acknowledgment
export interface RecordAcknowledgmentRequest {
  caseId: string;
  acknowledgmentType: AcknowledgmentType;
  acknowledgmentDate: string;
  fdaCaseNumber?: string; // Required if Accepted
  rejectionReason?: string; // Required if Rejected
  notes?: string;
}

// Export with FDA filename
export interface ExportFdaRequest {
  caseId: string;
  exportPath: string;
  submissionEnvironment?: SubmissionEnvironment;
  submissionReportType?: SubmissionReportType;
}

export interface ExportFdaResponse {
  filename: string;
  filePath: string;
  sequenceNumber: number;
  submissionEnvironment: SubmissionEnvironment;
  submissionReportType: SubmissionReportType;
  batchReceiver: string;
  isTestMode: boolean;
}

// Revert to draft
export interface RevertToDraftRequest {
  caseId: string;
  reason?: string;
}

// Mark ready result (includes validation if failed)
export interface MarkReadyResponse {
  case?: Case;
  validationResult?: ValidationResult;
}

// ============================================================
// Phase 3: Authentication Request/Response Types
// ============================================================

// Re-export auth types for convenience
export type {
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  User,
  UserListItem,
  Role,
  Permission,
  Session
};

// Validate session response
export interface ValidateSessionResponse {
  valid: boolean;
  session?: Session;
  user?: User;
  permissions?: string[];
}

// Reset password response
export interface ResetPasswordResponse {
  temporaryPassword: string;
}

// ============================================================
// Phase 3: User Management Request/Response Types
// ============================================================

export type { CreateUserDTO, UpdateUserDTO, UserFilter };

export interface UserListResponse {
  users: UserListItem[];
  total: number;
}

// ============================================================
// Phase 3: Workflow Request/Response Types
// ============================================================

export type {
  WorkflowStatus,
  WorkflowTransitionRequest,
  WorkflowTransitionResult,
  CaseAssignment,
  AssignCaseRequest,
  ReassignCaseRequest,
  CaseComment,
  AddCommentRequest,
  CaseNote,
  AddNoteRequest,
  WorkloadSummary,
  CaseHistoryEntry
};

// Available actions response
export interface AvailableActionsResponse {
  actions: Array<{
    action: string;
    label: string;
    toStatus?: WorkflowStatus;
    requiresComment?: boolean;
    requiresSignature?: boolean;
    requiresAssignment?: boolean;
  }>;
}

// My cases response
export interface MyCasesResponse {
  cases: CaseListItem[];
  total: number;
  overdue: number;
  dueSoon: number;
}

// ============================================================
// Phase 3: Audit Request/Response Types
// ============================================================

export type {
  AuditLogEntry,
  AuditLogFilter,
  AuditLogResult,
  AuditExportRequest,
  AuditExportResult
};

// ============================================================
// Phase 4: Classification Types (re-export for convenience)
// ============================================================

export type {
  ReportTypeClassification,
  ExpeditedCriteria,
  Expectedness,
  SeriousnessCriterion,
  CaseSeriousness,
  CaseClassification,
  ClassificationSuggestion,
  ClassificationUpdate
};

// ============================================================
// Phase 4: Follow-up Types (re-export for convenience)
// ============================================================

export type {
  FollowupType,
  NullificationReason,
  CaseVersion,
  CaseVersionChain,
  CreateFollowupRequest,
  CreateFollowupResponse,
  CreateNullificationRequest,
  CreateNullificationResponse,
  VersionComparison,
  FollowupDueDate
};

// ============================================================
// Phase 4: Batch Types (re-export for convenience)
// ============================================================

export type {
  SubmissionBatch,
  BatchCase,
  BatchListItem,
  BatchType,
  BatchFilter,
  BatchListResponse,
  CreateBatchRequest,
  CreateBatchResponse,
  BatchValidationResult,
  ExportBatchResponse,
  RecordBatchSubmissionRequest,
  RecordBatchAcknowledgmentRequest,
  BatchCaseEligibility
};

// ============================================================
// Phase 4: PSR Types (re-export for convenience)
// ============================================================

export type {
  PSRSchedule,
  PSR,
  PSRListItem,
  PSRCase,
  PSRFormat,
  PSRFilter,
  PSRListResponse,
  CreatePSRScheduleDTO,
  UpdatePSRScheduleDTO,
  CreatePSRDTO,
  PSRPeriodCalculation,
  UpdatePSRCasesRequest,
  PSRTransitionRequest,
  PSRDashboardSummary
};

// ============================================================
// Phase 3: Notification Types
// ============================================================

export interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

// ============================================================
// Phase 5: MedDRA Types (re-export for convenience)
// ============================================================

export type {
  MedDRAVersion,
  MedDRASearchResult,
  MedDRAHierarchy,
  MedDRACoding,
  MedDRATreeNode,
  MedDRAImportProgress,
  MedDRAImportRequest,
  MedDRASearchOptions,
  MedDRABrowseRequest
};

// ============================================================
// Phase 5: WHO Drug Types (re-export for convenience)
// ============================================================

export type {
  WHODrugVersion,
  WHODrugSearchResult,
  WHODrugProduct,
  WHODrugCoding,
  ATCTreeNode,
  WHODrugImportProgress,
  WHODrugImportRequest,
  WHODrugSearchOptions,
  WHODrugBrowseATCRequest
};

// ============================================================
// Phase 5: Search Types (re-export for convenience)
// ============================================================

export type {
  SearchQuery,
  SavedSearch,
  SearchResults,
  SearchableField
};

// ============================================================
// Phase 5: Duplicate Types (re-export for convenience)
// ============================================================

export type {
  DuplicateCandidate,
  DuplicateCheckResult,
  DuplicateFilter,
  DuplicateListItem,
  MergeCasesRequest,
  MergeCasesResult,
  DuplicateResolution,
  BatchDuplicateScanRequest,
  BatchDuplicateScanResult,
  MergedCase,
  DuplicateCheckSettings
};

// ============================================================
// Phase 5: Template Types (re-export for convenience)
// ============================================================

export type {
  CaseTemplate,
  TemplateListItem,
  TemplateFilter,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ApplyTemplateResult
};

// ============================================================
// Phase 5: Import Types (re-export for convenience)
// ============================================================

export type {
  ImportJob,
  ImportJobListItem,
  ImportUploadResponse,
  ColumnMapping,
  ImportValidationSummary,
  ImportExecuteOptions,
  ImportExecuteResult,
  SavedColumnMapping
};

// ============================================================
// Phase 5: Validation Types (re-export for convenience)
// ============================================================

export type {
  ValidationRule,
  ValidationRuleListItem,
  ValidationSummary,
  CreateValidationRuleRequest,
  UpdateValidationRuleRequest,
  TestRuleRequest,
  TestRuleResult,
  ValidationRuleFilter,
  AcknowledgeWarningRequest
};

// ============================================================
// Phase 2B: ESG API Types (re-export for convenience)
// ============================================================

export type {
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
  ApiSubmissionProgress,
  DemoModeConfig,
  DemoScenario,
  DemoSpeed,
  DemoSampleCase,
  ResetDemoDataResult,
  SetDemoConfigRequest
} from './esgApi.types';

// Demo mode status response
export interface DemoModeStatus {
  isActive: boolean;
  scenario: DemoScenario;
  speed: DemoSpeed;
  sampleCasesAvailable: number;
  mockSubmissionsCount: number;
}

// Exposed API interface for renderer
export interface ElectronAPI {
  // Case operations
  getCases: (filters?: CaseFilterOptions) => Promise<IPCResponse<CaseListResponse>>;
  getCase: (id: string, includeRelated?: boolean) => Promise<IPCResponse<Case>>;
  createCase: (data?: CreateCaseDTO) => Promise<IPCResponse<Case>>;
  updateCase: (id: string, data: UpdateCaseDTO) => Promise<IPCResponse<Case>>;
  deleteCase: (id: string) => Promise<IPCResponse<void>>;
  duplicateCase: (id: string) => Promise<IPCResponse<Case>>;
  validateCase: (id: string) => Promise<IPCResponse<ValidationResult>>;
  getCaseCount: () => Promise<IPCResponse<number>>;

  // Reporter operations
  getReporters: (caseId: string) => Promise<IPCResponse<CaseReporter[]>>;
  saveReporter: (reporter: CaseReporter) => Promise<IPCResponse<CaseReporter>>;
  deleteReporter: (id: number) => Promise<IPCResponse<void>>;

  // Reaction operations
  getReactions: (caseId: string) => Promise<IPCResponse<CaseReaction[]>>;
  saveReaction: (reaction: CaseReaction) => Promise<IPCResponse<CaseReaction>>;
  deleteReaction: (id: number) => Promise<IPCResponse<void>>;

  // Drug operations
  getDrugs: (caseId: string) => Promise<IPCResponse<CaseDrug[]>>;
  saveDrug: (drug: CaseDrug) => Promise<IPCResponse<CaseDrug>>;
  deleteDrug: (id: number) => Promise<IPCResponse<void>>;

  // XML operations
  generateXML: (caseId: string) => Promise<IPCResponse<string>>;
  exportXML: (caseId: string, filePath: string) => Promise<IPCResponse<void>>;
  validateXML: (xml: string) => Promise<IPCResponse<ValidationResult>>;

  // Database operations
  backupDatabase: () => Promise<IPCResponse<string>>;
  restoreDatabase: (filePath: string) => Promise<IPCResponse<void>>;

  // Settings operations
  getSetting: (key: string) => Promise<IPCResponse<string | null>>;
  setSetting: (key: string, value: string) => Promise<IPCResponse<void>>;

  // Lookup data
  getCountries: () => Promise<IPCResponse<Country[]>>;
  searchMedDRA: (query: string) => Promise<IPCResponse<MedDRATerm[]>>;

  // File dialogs
  showSaveDialog: (options: SaveDialogOptions) => Promise<IPCResponse<string | null>>;
  showOpenDialog: (options: OpenDialogOptions) => Promise<IPCResponse<string[] | null>>;

  // Import operations
  importForm3500: (filePath: string) => Promise<IPCResponse<Form3500AImportResult>>;

  // Phase 2: Submission operations
  recordSubmission: (data: RecordSubmissionRequest) => Promise<IPCResponse<SubmissionRecord>>;
  recordAcknowledgment: (data: RecordAcknowledgmentRequest) => Promise<IPCResponse<SubmissionRecord>>;
  getSubmissionHistory: (caseId: string) => Promise<IPCResponse<SubmissionHistoryEntry[]>>;
  getSubmissionRecord: (caseId: string) => Promise<IPCResponse<SubmissionRecord | null>>;

  // Phase 2: Dashboard
  getDashboardStats: () => Promise<IPCResponse<DashboardStats>>;

  // Phase 2: FDA Export
  exportXmlFda: (caseId: string, exportPath: string) => Promise<IPCResponse<ExportFdaResponse>>;

  // Phase 2: Status transitions
  markCaseReady: (caseId: string) => Promise<IPCResponse<MarkReadyResponse>>;
  revertCaseToDraft: (caseId: string, reason?: string) => Promise<IPCResponse<Case>>;

  // ============================================================
  // Phase 3: Authentication
  // ============================================================
  login: (request: LoginRequest) => Promise<IPCResponse<LoginResponse>>;
  logout: () => Promise<IPCResponse<void>>;
  validateSession: () => Promise<IPCResponse<ValidateSessionResponse>>;
  changePassword: (request: ChangePasswordRequest) => Promise<IPCResponse<void>>;
  getCurrentUser: () => Promise<IPCResponse<User | null>>;
  extendSession: () => Promise<IPCResponse<Session>>;
  getSessionTimeoutConfig: () => Promise<IPCResponse<{ timeoutMinutes: number; warningMinutes: number }>>;
  validatePasswordPolicy: (password: string, username?: string) => Promise<IPCResponse<PasswordValidationResult>>;

  // ============================================================
  // Phase 3: User Management
  // ============================================================
  getUsers: (filter?: UserFilter) => Promise<IPCResponse<UserListResponse>>;
  getUser: (id: string) => Promise<IPCResponse<User>>;
  createUser: (data: CreateUserDTO) => Promise<IPCResponse<User>>;
  updateUser: (id: string, data: UpdateUserDTO) => Promise<IPCResponse<User>>;
  deactivateUser: (id: string) => Promise<IPCResponse<void>>;
  reactivateUser: (id: string) => Promise<IPCResponse<User>>;
  resetUserPassword: (id: string) => Promise<IPCResponse<ResetPasswordResponse>>;
  getUserProfile: () => Promise<IPCResponse<User>>;
  updateUserProfile: (data: Partial<UpdateUserDTO>) => Promise<IPCResponse<User>>;

  // ============================================================
  // Phase 3: Role Management
  // ============================================================
  getRoles: () => Promise<IPCResponse<Role[]>>;
  getRole: (id: string) => Promise<IPCResponse<Role>>;
  getPermissions: () => Promise<IPCResponse<Permission[]>>;

  // ============================================================
  // Phase 3: Workflow
  // ============================================================
  transitionWorkflow: (request: WorkflowTransitionRequest) => Promise<IPCResponse<WorkflowTransitionResult>>;
  getAvailableActions: (caseId: string) => Promise<IPCResponse<AvailableActionsResponse>>;

  // ============================================================
  // Phase 3: Case Assignment
  // ============================================================
  assignCase: (request: AssignCaseRequest) => Promise<IPCResponse<CaseAssignment>>;
  reassignCase: (request: ReassignCaseRequest) => Promise<IPCResponse<CaseAssignment>>;
  getCaseAssignments: (caseId: string) => Promise<IPCResponse<CaseAssignment[]>>;
  getMyCases: (filter?: CaseFilterOptions) => Promise<IPCResponse<MyCasesResponse>>;
  getWorkloadSummary: () => Promise<IPCResponse<WorkloadSummary>>;

  // ============================================================
  // Phase 3: Comments & Notes
  // ============================================================
  addComment: (request: AddCommentRequest) => Promise<IPCResponse<CaseComment>>;
  getComments: (caseId: string) => Promise<IPCResponse<CaseComment[]>>;
  addNote: (request: AddNoteRequest) => Promise<IPCResponse<CaseNote>>;
  getNotes: (caseId: string) => Promise<IPCResponse<CaseNote[]>>;
  resolveNote: (noteId: number) => Promise<IPCResponse<CaseNote>>;

  // ============================================================
  // Phase 3: Audit Trail
  // ============================================================
  getAuditLog: (filter?: AuditLogFilter) => Promise<IPCResponse<AuditLogResult>>;
  getCaseAuditHistory: (caseId: string) => Promise<IPCResponse<CaseHistoryEntry[]>>;
  exportAuditLog: (request: AuditExportRequest) => Promise<IPCResponse<AuditExportResult>>;

  // ============================================================
  // Phase 3: Notifications
  // ============================================================
  getNotifications: (limit?: number) => Promise<IPCResponse<NotificationListResponse>>;
  markNotificationRead: (id: number) => Promise<IPCResponse<void>>;
  getUnreadNotificationCount: () => Promise<IPCResponse<number>>;

  // ============================================================
  // Phase 4: Product Management
  // ============================================================
  getProducts: (filter?: ProductFilter) => Promise<IPCResponse<ProductListResponse>>;
  getProduct: (id: number) => Promise<IPCResponse<Product>>;
  createProduct: (data: CreateProductDTO) => Promise<IPCResponse<Product>>;
  updateProduct: (id: number, data: UpdateProductDTO) => Promise<IPCResponse<Product>>;
  deleteProduct: (id: number) => Promise<IPCResponse<void>>;
  searchProducts: (query: string, limit?: number) => Promise<IPCResponse<ProductListItem[]>>;

  // ============================================================
  // Phase 4: Report Type Classification
  // ============================================================
  getReportTypeClassification: (caseId: string) => Promise<IPCResponse<CaseClassification>>;
  getReportTypeSuggestion: (caseId: string) => Promise<IPCResponse<ClassificationSuggestion>>;
  classifyReportType: (caseId: string, classification: ClassificationUpdate) => Promise<IPCResponse<CaseClassification>>;
  isReportTypeExpedited: (caseId: string) => Promise<IPCResponse<boolean>>;
  getReportTypeDueDate: (caseId: string, awarenessDate?: string) => Promise<IPCResponse<string | null>>;
  getSeriousness: (caseId: string) => Promise<IPCResponse<CaseSeriousness[]>>;
  setSeriousness: (caseId: string, criterion: SeriousnessCriterion, isChecked: boolean, notes?: string) => Promise<IPCResponse<CaseSeriousness>>;
  setAllSeriousness: (caseId: string, criteria: Array<{ criterion: SeriousnessCriterion; isChecked: boolean; notes?: string }>) => Promise<IPCResponse<CaseSeriousness[]>>;
  setExpectedness: (caseId: string, expectedness: Expectedness, justification?: string) => Promise<IPCResponse<void>>;

  // ============================================================
  // Phase 4: Follow-up & Nullification
  // ============================================================
  createFollowup: (request: CreateFollowupRequest) => Promise<IPCResponse<CreateFollowupResponse>>;
  getVersionChain: (caseId: string) => Promise<IPCResponse<CaseVersionChain>>;
  compareVersions: (fromCaseId: string, toCaseId: string) => Promise<IPCResponse<VersionComparison>>;
  getFollowupDueDate: (caseId: string) => Promise<IPCResponse<FollowupDueDate | null>>;
  canCreateFollowup: (caseId: string) => Promise<IPCResponse<{ allowed: boolean; reason?: string }>>;
  createNullification: (request: CreateNullificationRequest) => Promise<IPCResponse<CreateNullificationResponse>>;
  canCreateNullification: (caseId: string) => Promise<IPCResponse<{ allowed: boolean; reason?: string }>>;

  // ============================================================
  // Phase 4: Batch Submission
  // ============================================================
  createBatch: (request: CreateBatchRequest) => Promise<IPCResponse<CreateBatchResponse>>;
  getBatch: (batchId: number) => Promise<IPCResponse<SubmissionBatch>>;
  getBatches: (filter?: BatchFilter, limit?: number, offset?: number) => Promise<IPCResponse<BatchListResponse>>;
  getBatchCases: (batchId: number) => Promise<IPCResponse<BatchCase[]>>;
  validateBatch: (batchId: number) => Promise<IPCResponse<BatchValidationResult>>;
  exportBatch: (batchId: number, exportPath: string) => Promise<IPCResponse<ExportBatchResponse>>;
  recordBatchSubmission: (request: RecordBatchSubmissionRequest) => Promise<IPCResponse<SubmissionBatch>>;
  recordBatchAcknowledgment: (request: RecordBatchAcknowledgmentRequest) => Promise<IPCResponse<SubmissionBatch>>;
  addCaseToBatch: (batchId: number, caseId: string) => Promise<IPCResponse<void>>;
  removeCaseFromBatch: (batchId: number, caseId: string) => Promise<IPCResponse<void>>;
  deleteBatch: (batchId: number) => Promise<IPCResponse<boolean>>;
  getEligibleCasesForBatch: (batchType: BatchType) => Promise<IPCResponse<BatchCaseEligibility[]>>;

  // ============================================================
  // Phase 4: PSR Management
  // ============================================================
  createPSRSchedule: (data: CreatePSRScheduleDTO) => Promise<IPCResponse<PSRSchedule>>;
  getPSRSchedulesByProduct: (productId: number) => Promise<IPCResponse<PSRSchedule[]>>;
  updatePSRSchedule: (id: number, data: UpdatePSRScheduleDTO) => Promise<IPCResponse<PSRSchedule>>;
  deletePSRSchedule: (id: number) => Promise<IPCResponse<boolean>>;
  getNextPSRPeriod: (scheduleId: number) => Promise<IPCResponse<PSRPeriodCalculation>>;
  createPSR: (data: CreatePSRDTO) => Promise<IPCResponse<PSR>>;
  getPSR: (id: number) => Promise<IPCResponse<PSR>>;
  getPSRs: (filter?: PSRFilter, limit?: number, offset?: number) => Promise<IPCResponse<PSRListResponse>>;
  transitionPSR: (request: PSRTransitionRequest) => Promise<IPCResponse<PSR>>;
  getPSRCases: (psrId: number) => Promise<IPCResponse<PSRCase[]>>;
  getEligibleCasesForPSR: (psrId: number) => Promise<IPCResponse<PSRCase[]>>;
  updatePSRCases: (request: UpdatePSRCasesRequest) => Promise<IPCResponse<PSR>>;
  getPSRDashboard: () => Promise<IPCResponse<PSRDashboardSummary>>;

  // ============================================================
  // Phase 5: MedDRA Dictionary
  // ============================================================
  meddraVersions: () => Promise<IPCResponse<MedDRAVersion[]>>;
  meddraActiveVersion: () => Promise<IPCResponse<MedDRAVersion | null>>;
  meddraActivateVersion: (id: number) => Promise<IPCResponse<void>>;
  meddraDeleteVersion: (id: number) => Promise<IPCResponse<void>>;
  meddraImport: (request: MedDRAImportRequest, importedBy?: string) => Promise<IPCResponse<MedDRAVersion>>;
  meddraImportProgress: () => Promise<IPCResponse<MedDRAImportProgress | null>>;
  meddraSearch: (options: MedDRASearchOptions) => Promise<IPCResponse<MedDRASearchResult[]>>;
  meddraBrowse: (request: MedDRABrowseRequest) => Promise<IPCResponse<MedDRATreeNode[]>>;
  meddraHierarchy: (ptCode: number, versionId?: number) => Promise<IPCResponse<MedDRAHierarchy[]>>;
  meddraHierarchyLLT: (lltCode: number, versionId?: number) => Promise<IPCResponse<MedDRAHierarchy[]>>;
  meddraCode: (lltCode: number, verbatimText: string, codedBy?: string) => Promise<IPCResponse<MedDRACoding | null>>;
  meddraCodePT: (ptCode: number, verbatimText: string, codedBy?: string) => Promise<IPCResponse<MedDRACoding | null>>;
  meddraSelectFolder: () => Promise<IPCResponse<{ folderPath: string; filePaths: Record<string, string> } | null>>;

  // ============================================================
  // Phase 5: WHO Drug Dictionary
  // ============================================================
  whodrugVersions: () => Promise<IPCResponse<WHODrugVersion[]>>;
  whodrugActiveVersion: () => Promise<IPCResponse<WHODrugVersion | null>>;
  whodrugActivateVersion: (id: number) => Promise<IPCResponse<void>>;
  whodrugDeleteVersion: (id: number) => Promise<IPCResponse<void>>;
  whodrugImport: (request: WHODrugImportRequest, importedBy?: string) => Promise<IPCResponse<WHODrugVersion>>;
  whodrugImportProgress: () => Promise<IPCResponse<WHODrugImportProgress | null>>;
  whodrugSearch: (options: WHODrugSearchOptions) => Promise<IPCResponse<WHODrugSearchResult[]>>;
  whodrugGetProduct: (drugCode: string, versionId?: number) => Promise<IPCResponse<WHODrugProduct | null>>;
  whodrugBrowseATC: (request: WHODrugBrowseATCRequest) => Promise<IPCResponse<ATCTreeNode[]>>;
  whodrugProductsByATC: (atcCode: string, versionId?: number, limit?: number) => Promise<IPCResponse<WHODrugSearchResult[]>>;
  whodrugATCHierarchy: (drugCode: string, versionId?: number) => Promise<IPCResponse<ATCCode[]>>;
  whodrugCode: (drugCode: string, verbatimText: string, codedBy?: string) => Promise<IPCResponse<WHODrugCoding | null>>;
  whodrugSelectFolder: () => Promise<IPCResponse<{ folderPath: string; filePaths: Record<string, string> } | null>>;

  // ============================================================
  // Phase 5: Advanced Search
  // ============================================================
  searchCasesFulltext: (query: string, page?: number, pageSize?: number) => Promise<IPCResponse<SearchResults>>;
  searchCasesAdvanced: (query: SearchQuery, page?: number, pageSize?: number) => Promise<IPCResponse<SearchResults>>;
  saveSearch: (name: string, description: string | undefined, query: SearchQuery, isShared: boolean) => Promise<IPCResponse<SavedSearch>>;
  updateSavedSearch: (id: number, updates: Partial<SavedSearch>) => Promise<IPCResponse<SavedSearch>>;
  deleteSavedSearch: (id: number) => Promise<IPCResponse<void>>;
  getSavedSearches: (includeShared?: boolean) => Promise<IPCResponse<SavedSearch[]>>;
  executeSavedSearch: (id: number, page?: number, pageSize?: number) => Promise<IPCResponse<SearchResults>>;
  getSearchableFields: () => Promise<IPCResponse<SearchableField[]>>;

  // ============================================================
  // Phase 5: Duplicate Detection
  // ============================================================
  checkDuplicates: (caseId: string, threshold?: number) => Promise<IPCResponse<DuplicateCheckResult>>;
  getDuplicateCandidates: (filter?: DuplicateFilter, limit?: number, offset?: number) => Promise<IPCResponse<{ items: DuplicateListItem[]; total: number }>>;
  getDuplicateCandidate: (id: number) => Promise<IPCResponse<DuplicateCandidate>>;
  resolveDuplicate: (id: number, resolution: DuplicateResolution, resolvedBy?: string, notes?: string) => Promise<IPCResponse<DuplicateCandidate>>;
  getPendingDuplicates: (caseId: string) => Promise<IPCResponse<DuplicateCandidate[]>>;
  getDuplicateStats: () => Promise<IPCResponse<{ pending: number; dismissed: number; confirmed: number; merged: number }>>;
  mergeCases: (request: MergeCasesRequest) => Promise<IPCResponse<MergeCasesResult>>;
  getMergeHistory: (caseId: string) => Promise<IPCResponse<MergedCase[]>>;
  getDuplicateSettings: () => Promise<IPCResponse<DuplicateCheckSettings>>;
  updateDuplicateSettings: (settings: Partial<DuplicateCheckSettings>) => Promise<IPCResponse<DuplicateCheckSettings>>;
  startBatchDuplicateScan: (request: BatchDuplicateScanRequest) => Promise<IPCResponse<{ jobId: string }>>;
  getBatchDuplicateScanStatus: (jobId: string) => Promise<IPCResponse<BatchDuplicateScanResult>>;

  // ============================================================
  // Phase 5: Case Templates
  // ============================================================
  createTemplate: (request: CreateTemplateRequest) => Promise<IPCResponse<CaseTemplate>>;
  updateTemplate: (request: UpdateTemplateRequest) => Promise<IPCResponse<CaseTemplate>>;
  deleteTemplate: (id: number) => Promise<IPCResponse<void>>;
  getTemplate: (id: number) => Promise<IPCResponse<CaseTemplate>>;
  getTemplates: (filter?: TemplateFilter, limit?: number, offset?: number) => Promise<IPCResponse<{ items: TemplateListItem[]; total: number }>>;
  applyTemplate: (templateId: number) => Promise<IPCResponse<ApplyTemplateResult>>;
  approveTemplate: (id: number) => Promise<IPCResponse<CaseTemplate>>;
  createTemplateFromCase: (caseId: string, name: string, description?: string, category?: string) => Promise<IPCResponse<CaseTemplate>>;

  // ============================================================
  // Phase 5: Bulk Import
  // ============================================================
  uploadImportFile: (filePath: string) => Promise<IPCResponse<ImportUploadResponse>>;
  setImportMapping: (jobId: number, mapping: ColumnMapping[]) => Promise<IPCResponse<ImportJob>>;
  validateImport: (jobId: number) => Promise<IPCResponse<ImportValidationSummary>>;
  executeImport: (jobId: number, options: ImportExecuteOptions) => Promise<IPCResponse<ImportExecuteResult>>;
  getImportJob: (jobId: number) => Promise<IPCResponse<ImportJob>>;
  getImportJobs: (limit?: number, offset?: number) => Promise<IPCResponse<{ items: ImportJobListItem[]; total: number }>>;
  getImportErrors: (jobId: number) => Promise<IPCResponse<{ rowNumber: number; errors: string[] }[]>>;
  cancelImport: (jobId: number) => Promise<IPCResponse<void>>;
  saveColumnMapping: (name: string, description: string | undefined, mapping: ColumnMapping[]) => Promise<IPCResponse<SavedColumnMapping>>;
  getSavedColumnMappings: () => Promise<IPCResponse<SavedColumnMapping[]>>;
  deleteColumnMapping: (id: number) => Promise<IPCResponse<void>>;

  // ============================================================
  // Phase 5: Validation Engine
  // ============================================================
  runValidation: (caseId: string) => Promise<IPCResponse<ValidationSummary>>;
  acknowledgeWarnings: (request: AcknowledgeWarningRequest) => Promise<IPCResponse<void>>;
  getValidationResults: (caseId: string) => Promise<IPCResponse<ValidationSummary>>;
  getValidationRules: (filter?: ValidationRuleFilter) => Promise<IPCResponse<ValidationRuleListItem[]>>;
  getValidationRule: (id: number) => Promise<IPCResponse<ValidationRule>>;
  createValidationRule: (request: CreateValidationRuleRequest) => Promise<IPCResponse<ValidationRule>>;
  updateValidationRule: (request: UpdateValidationRuleRequest) => Promise<IPCResponse<ValidationRule>>;
  deleteValidationRule: (id: number) => Promise<IPCResponse<void>>;
  testValidationRule: (request: TestRuleRequest) => Promise<IPCResponse<TestRuleResult>>;
  toggleValidationRule: (id: number, isActive: boolean) => Promise<IPCResponse<ValidationRule>>;

  // ============================================================
  // Phase 2B: ESG NextGen API
  // ============================================================
  esgTestConnection: () => Promise<IPCResponse<TestConnectionResult>>;
  esgGetSettings: () => Promise<IPCResponse<EsgApiSettings>>;
  esgSaveSettings: (settings: SaveEsgSettingsRequest) => Promise<IPCResponse<void>>;
  esgSaveCredentials: (data: SaveCredentialsRequest) => Promise<IPCResponse<void>>;
  esgHasCredentials: () => Promise<IPCResponse<boolean>>;
  esgClearCredentials: () => Promise<IPCResponse<void>>;
  esgSubmitCase: (data: SubmitToFdaRequest) => Promise<IPCResponse<SubmitToFdaResult>>;
  esgRetrySubmission: (caseId: string) => Promise<IPCResponse<SubmitToFdaResult>>;
  esgCancelSubmission: (caseId: string) => Promise<IPCResponse<void>>;
  esgGetProgress: (caseId: string) => Promise<IPCResponse<ApiSubmissionProgress | null>>;
  esgGetPreSubmissionSummary: (caseId: string) => Promise<IPCResponse<PreSubmissionSummary>>;
  esgCheckAcknowledgment: (caseId: string) => Promise<IPCResponse<CheckAcknowledgmentResult>>;
  esgGetAttempts: (caseId: string) => Promise<IPCResponse<ApiSubmissionAttempt[]>>;
  esgStartPolling: () => Promise<IPCResponse<void>>;
  esgStopPolling: () => Promise<IPCResponse<void>>;
  esgGetPollingStatus: () => Promise<IPCResponse<PollingStatus>>;
  onEsgSubmissionProgress: (callback: (progress: ApiSubmissionProgress) => void) => () => void;

  // ============================================================
  // Phase 2B: Demo Mode
  // ============================================================
  demoGetStatus: () => Promise<IPCResponse<DemoModeStatus>>;
  demoActivate: () => Promise<IPCResponse<void>>;
  demoDeactivate: () => Promise<IPCResponse<void>>;
  demoGetConfig: () => Promise<IPCResponse<DemoModeConfig>>;
  demoSetConfig: (config: SetDemoConfigRequest) => Promise<IPCResponse<void>>;
  demoGetSampleCases: () => Promise<IPCResponse<DemoSampleCase[]>>;
  demoCreateSampleCases: () => Promise<IPCResponse<{ created: number; errors: string[] }>>;
  demoResetData: () => Promise<IPCResponse<ResetDemoDataResult>>;
  onDemoModeChanged: (callback: (data: { isActive: boolean; config: DemoModeConfig }) => void) => () => void;
}

// Declare the electronAPI on the window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
