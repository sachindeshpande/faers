/**
 * Preload script - Exposes IPC API to renderer via contextBridge
 *
 * This script runs in a privileged context and safely exposes
 * specific IPC channels to the renderer process.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types/ipc.types';
import type {
  CaseFilterOptions,
  CreateCaseDTO,
  UpdateCaseDTO,
  CaseReporter,
  CaseReaction,
  CaseDrug,
  Case,
  ValidationResult,
  SubmissionRecord,
  SubmissionHistoryEntry,
  DashboardStats
} from '../shared/types/case.types';
import type {
  IPCResponse,
  CaseListResponse,
  Country,
  MedDRATerm,
  SaveDialogOptions,
  OpenDialogOptions,
  ElectronAPI,
  RecordSubmissionRequest,
  RecordAcknowledgmentRequest,
  ExportFdaResponse,
  MarkReadyResponse,
  // Phase 3 types
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  ValidateSessionResponse,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilter,
  UserListResponse,
  WorkflowTransitionRequest,
  WorkflowTransitionResult,
  AvailableActionsResponse,
  AssignCaseRequest,
  ReassignCaseRequest,
  CaseAssignment,
  MyCasesResponse,
  WorkloadSummary,
  AddCommentRequest,
  CaseComment,
  AddNoteRequest,
  CaseNote,
  AuditLogFilter,
  AuditLogResult,
  AuditExportRequest,
  AuditExportResult,
  CaseHistoryEntry,
  NotificationListResponse
} from '../shared/types/ipc.types';
import type { Form3500AImportResult } from '../shared/types/form3500.types';
import type { User, Role, Permission, Session } from '../shared/types/auth.types';
import type {
  Product,
  ProductListItem,
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilter,
  ProductListResponse
} from '../shared/types/product.types';
import type {
  CaseSeriousness,
  CaseClassification,
  ClassificationSuggestion,
  ClassificationUpdate,
  SeriousnessCriterion,
  Expectedness
} from '../shared/types/classification.types';
import type {
  CaseVersionChain,
  CreateFollowupRequest,
  CreateFollowupResponse,
  CreateNullificationRequest,
  CreateNullificationResponse,
  VersionComparison,
  FollowupDueDate
} from '../shared/types/followup.types';
import type {
  SubmissionBatch,
  BatchCase,
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
} from '../shared/types/batch.types';
import type {
  PSRSchedule,
  PSR,
  PSRCase,
  PSRFilter,
  PSRListResponse,
  CreatePSRScheduleDTO,
  UpdatePSRScheduleDTO,
  CreatePSRDTO,
  PSRPeriodCalculation,
  UpdatePSRCasesRequest,
  PSRTransitionRequest,
  PSRDashboardSummary
} from '../shared/types/psr.types';
// Phase 5 imports
import type {
  MedDRAVersion,
  MedDRASearchResult,
  MedDRATreeNode,
  MedDRAHierarchy,
  MedDRACoding,
  MedDRAImportProgress,
  MedDRAImportRequest,
  MedDRASearchOptions,
  MedDRABrowseRequest
} from '../shared/types/meddra.types';
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
} from '../shared/types/whodrug.types';
import type {
  SearchQuery,
  SavedSearch,
  SearchResults,
  SearchableField
} from '../shared/types/search.types';
import type {
  DuplicateFilter,
  DuplicateListItem,
  DuplicateCandidate,
  DuplicateCheckResult,
  DuplicateResolution,
  MergeCasesRequest,
  MergeCasesResult,
  MergedCase,
  DuplicateCheckSettings,
  BatchDuplicateScanRequest,
  BatchDuplicateScanResult
} from '../shared/types/duplicate.types';
import type {
  CaseTemplate,
  TemplateListItem,
  TemplateFilter,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ApplyTemplateResult
} from '../shared/types/template.types';
import type {
  ImportJob,
  ImportJobListItem,
  ColumnMapping,
  ImportValidationSummary,
  ImportExecuteOptions,
  ImportExecuteResult,
  ImportUploadResponse,
  SavedColumnMapping
} from '../shared/types/import.types';
import type {
  ValidationRule,
  ValidationRuleListItem,
  ValidationSummary,
  ValidationRuleFilter,
  CreateValidationRuleRequest,
  UpdateValidationRuleRequest,
  TestRuleRequest,
  TestRuleResult,
  AcknowledgeWarningRequest
} from '../shared/types/validation.types';
import type {
  SaveCredentialsRequest,
  SubmitToFdaRequest,
  SaveEsgSettingsRequest,
  ApiSubmissionProgress,
  DemoModeConfig,
  SetDemoConfigRequest
} from '../shared/types/esgApi.types';
import type { DemoModeStatus } from '../shared/types/ipc.types';

// Create the API object
const electronAPI: ElectronAPI = {
  // Case operations
  getCases: (filters?: CaseFilterOptions): Promise<IPCResponse<CaseListResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_LIST, filters),

  getCase: (id: string, includeRelated?: boolean): Promise<IPCResponse<Case>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_GET, { id, includeRelated }),

  createCase: (data?: CreateCaseDTO): Promise<IPCResponse<Case>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_CREATE, data),

  updateCase: (id: string, data: UpdateCaseDTO): Promise<IPCResponse<Case>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_UPDATE, { id, data }),

  deleteCase: (id: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_DELETE, id),

  duplicateCase: (id: string): Promise<IPCResponse<Case>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_DUPLICATE, id),

  validateCase: (id: string): Promise<IPCResponse<ValidationResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_VALIDATE, id),

  getCaseCount: (): Promise<IPCResponse<number>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_COUNT),

  // Reporter operations
  getReporters: (caseId: string): Promise<IPCResponse<CaseReporter[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORTER_LIST, caseId),

  saveReporter: (reporter: CaseReporter): Promise<IPCResponse<CaseReporter>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORTER_SAVE, reporter),

  deleteReporter: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORTER_DELETE, id),

  // Reaction operations
  getReactions: (caseId: string): Promise<IPCResponse<CaseReaction[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REACTION_LIST, caseId),

  saveReaction: (reaction: CaseReaction): Promise<IPCResponse<CaseReaction>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REACTION_SAVE, reaction),

  deleteReaction: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REACTION_DELETE, id),

  // Drug operations
  getDrugs: (caseId: string): Promise<IPCResponse<CaseDrug[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DRUG_LIST, caseId),

  saveDrug: (drug: CaseDrug): Promise<IPCResponse<CaseDrug>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DRUG_SAVE, drug),

  deleteDrug: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DRUG_DELETE, id),

  // XML operations
  generateXML: (caseId: string): Promise<IPCResponse<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.XML_GENERATE, caseId),

  exportXML: (caseId: string, filePath: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.XML_EXPORT, { caseId, filePath }),

  validateXML: (xml: string): Promise<IPCResponse<ValidationResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.XML_VALIDATE, xml),

  // Database operations
  backupDatabase: (): Promise<IPCResponse<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_BACKUP),

  restoreDatabase: (filePath: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_RESTORE, filePath),

  // Settings operations
  getSetting: (key: string): Promise<IPCResponse<string | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),

  setSetting: (key: string, value: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, { key, value }),

  // Lookup data
  getCountries: (): Promise<IPCResponse<Country[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOOKUP_COUNTRIES),

  searchMedDRA: (query: string): Promise<IPCResponse<MedDRATerm[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOOKUP_MEDDRA, query),

  // File dialogs
  showSaveDialog: (options: SaveDialogOptions): Promise<IPCResponse<string | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE_DIALOG, options),

  showOpenDialog: (options: OpenDialogOptions): Promise<IPCResponse<string[] | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_DIALOG, options),

  // Import operations
  importForm3500: (filePath: string): Promise<IPCResponse<Form3500AImportResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FORM3500, filePath),

  // Phase 2: Submission operations
  recordSubmission: (data: RecordSubmissionRequest): Promise<IPCResponse<SubmissionRecord>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SUBMISSION_RECORD, data),

  recordAcknowledgment: (data: RecordAcknowledgmentRequest): Promise<IPCResponse<SubmissionRecord>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SUBMISSION_ACKNOWLEDGE, data),

  getSubmissionHistory: (caseId: string): Promise<IPCResponse<SubmissionHistoryEntry[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SUBMISSION_GET_HISTORY, caseId),

  getSubmissionRecord: (caseId: string): Promise<IPCResponse<SubmissionRecord | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SUBMISSION_GET_RECORD, caseId),

  // Phase 2: Dashboard
  getDashboardStats: (): Promise<IPCResponse<DashboardStats>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_STATS),

  // Phase 2: FDA Export
  exportXmlFda: (caseId: string, exportPath: string): Promise<IPCResponse<ExportFdaResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.XML_EXPORT_FDA, { caseId, exportPath }),

  // Phase 2: Status transitions
  markCaseReady: (caseId: string): Promise<IPCResponse<MarkReadyResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_MARK_READY, caseId),

  revertCaseToDraft: (caseId: string, reason?: string): Promise<IPCResponse<Case>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_REVERT_TO_DRAFT, { caseId, reason }),

  // ============================================================
  // Phase 3: Authentication
  // ============================================================
  login: (request: LoginRequest): Promise<IPCResponse<LoginResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, request),

  logout: (): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),

  validateSession: (): Promise<IPCResponse<ValidateSessionResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_VALIDATE_SESSION),

  changePassword: (request: ChangePasswordRequest): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, request),

  getCurrentUser: (): Promise<IPCResponse<User | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_CURRENT_USER),

  extendSession: (): Promise<IPCResponse<Session>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_EXTEND_SESSION),

  getSessionTimeoutConfig: (): Promise<IPCResponse<{ timeoutMinutes: number; warningMinutes: number }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_SESSION_CONFIG),

  validatePasswordPolicy: (password: string, username?: string): Promise<IPCResponse<{ valid: boolean; errors: string[] }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_VALIDATE_PASSWORD_POLICY, { password, username }),

  // ============================================================
  // Phase 3: User Management
  // ============================================================
  getUsers: (filter?: UserFilter): Promise<IPCResponse<UserListResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_LIST, filter),

  getUser: (id: string): Promise<IPCResponse<User>> =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_GET, id),

  createUser: (data: CreateUserDTO): Promise<IPCResponse<User>> =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_CREATE, data),

  updateUser: (id: string, data: UpdateUserDTO): Promise<IPCResponse<User>> =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_UPDATE, { id, data }),

  deactivateUser: (id: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_DEACTIVATE, id),

  reactivateUser: (id: string): Promise<IPCResponse<User>> =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_REACTIVATE, id),

  resetUserPassword: (id: string): Promise<IPCResponse<{ temporaryPassword: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_RESET_PASSWORD, id),

  getUserProfile: (): Promise<IPCResponse<User>> =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_GET_PROFILE),

  updateUserProfile: (data: Partial<UpdateUserDTO>): Promise<IPCResponse<User>> =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_UPDATE_PROFILE, data),

  // ============================================================
  // Phase 3: Role Management
  // ============================================================
  getRoles: (): Promise<IPCResponse<Role[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.ROLE_LIST),

  getRole: (id: string): Promise<IPCResponse<Role>> =>
    ipcRenderer.invoke(IPC_CHANNELS.ROLE_GET, id),

  getPermissions: (): Promise<IPCResponse<Permission[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PERMISSION_LIST),

  // ============================================================
  // Phase 3: Workflow
  // ============================================================
  transitionWorkflow: (request: WorkflowTransitionRequest): Promise<IPCResponse<WorkflowTransitionResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_TRANSITION, request),

  getAvailableActions: (caseId: string): Promise<IPCResponse<AvailableActionsResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_GET_AVAILABLE_ACTIONS, caseId),

  // ============================================================
  // Phase 3: Case Assignment
  // ============================================================
  assignCase: (request: AssignCaseRequest): Promise<IPCResponse<CaseAssignment>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_ASSIGN, request),

  reassignCase: (request: ReassignCaseRequest): Promise<IPCResponse<CaseAssignment>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_REASSIGN, request),

  getCaseAssignments: (caseId: string): Promise<IPCResponse<CaseAssignment[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_GET_ASSIGNMENTS, caseId),

  getMyCases: (filter?: CaseFilterOptions): Promise<IPCResponse<MyCasesResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_GET_MY_CASES, filter),

  getWorkloadSummary: (): Promise<IPCResponse<WorkloadSummary>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKLOAD_GET_SUMMARY),

  // ============================================================
  // Phase 3: Comments & Notes
  // ============================================================
  addComment: (request: AddCommentRequest): Promise<IPCResponse<CaseComment>> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMENT_ADD, request),

  getComments: (caseId: string): Promise<IPCResponse<CaseComment[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMMENT_LIST, caseId),

  addNote: (request: AddNoteRequest): Promise<IPCResponse<CaseNote>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_ADD, request),

  getNotes: (caseId: string): Promise<IPCResponse<CaseNote[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_LIST, caseId),

  resolveNote: (noteId: number): Promise<IPCResponse<CaseNote>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_RESOLVE, noteId),

  // ============================================================
  // Phase 3: Audit Trail
  // ============================================================
  getAuditLog: (filter?: AuditLogFilter): Promise<IPCResponse<AuditLogResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUDIT_GET_LOG, filter),

  getCaseAuditHistory: (caseId: string): Promise<IPCResponse<CaseHistoryEntry[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUDIT_GET_CASE_HISTORY, caseId),

  exportAuditLog: (request: AuditExportRequest): Promise<IPCResponse<AuditExportResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUDIT_EXPORT, request),

  // ============================================================
  // Phase 3: Notifications
  // ============================================================
  getNotifications: (limit?: number): Promise<IPCResponse<NotificationListResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_GET, limit),

  markNotificationRead: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_MARK_READ, id),

  getUnreadNotificationCount: (): Promise<IPCResponse<number>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_GET_UNREAD_COUNT),

  // ============================================================
  // Phase 4: Product Management
  // ============================================================
  getProducts: (filter?: ProductFilter): Promise<IPCResponse<ProductListResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_LIST, filter),

  getProduct: (id: number): Promise<IPCResponse<Product>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_GET, id),

  createProduct: (data: CreateProductDTO): Promise<IPCResponse<Product>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_CREATE, data),

  updateProduct: (id: number, data: UpdateProductDTO): Promise<IPCResponse<Product>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_UPDATE, { id, data }),

  deleteProduct: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_DELETE, id),

  searchProducts: (query: string, limit?: number): Promise<IPCResponse<ProductListItem[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_SEARCH, query, limit),

  // ============================================================
  // Phase 4: Report Type Classification
  // ============================================================
  getReportTypeClassification: (caseId: string): Promise<IPCResponse<CaseClassification>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORT_TYPE_GET, caseId),

  getReportTypeSuggestion: (caseId: string): Promise<IPCResponse<ClassificationSuggestion>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORT_TYPE_SUGGEST, caseId),

  classifyReportType: (caseId: string, classification: ClassificationUpdate): Promise<IPCResponse<CaseClassification>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORT_TYPE_CLASSIFY, caseId, classification),

  isReportTypeExpedited: (caseId: string): Promise<IPCResponse<boolean>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORT_TYPE_IS_EXPEDITED, caseId),

  getReportTypeDueDate: (caseId: string, awarenessDate?: string): Promise<IPCResponse<string | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORT_TYPE_GET_DUE_DATE, caseId, awarenessDate),

  getSeriousness: (caseId: string): Promise<IPCResponse<CaseSeriousness[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SERIOUSNESS_GET, caseId),

  setSeriousness: (caseId: string, criterion: SeriousnessCriterion, isChecked: boolean, notes?: string): Promise<IPCResponse<CaseSeriousness>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SERIOUSNESS_SET, caseId, criterion, isChecked, notes),

  setAllSeriousness: (caseId: string, criteria: Array<{ criterion: SeriousnessCriterion; isChecked: boolean; notes?: string }>): Promise<IPCResponse<CaseSeriousness[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SERIOUSNESS_SET_ALL, caseId, criteria),

  setExpectedness: (caseId: string, expectedness: Expectedness, justification?: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPECTEDNESS_SET, caseId, expectedness, justification),

  // ============================================================
  // Phase 4: Follow-up & Nullification
  // ============================================================
  createFollowup: (request: CreateFollowupRequest): Promise<IPCResponse<CreateFollowupResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLLOWUP_CREATE, request),

  getVersionChain: (caseId: string): Promise<IPCResponse<CaseVersionChain>> =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLLOWUP_GET_CHAIN, caseId),

  compareVersions: (fromCaseId: string, toCaseId: string): Promise<IPCResponse<VersionComparison>> =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLLOWUP_COMPARE, fromCaseId, toCaseId),

  getFollowupDueDate: (caseId: string): Promise<IPCResponse<FollowupDueDate | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLLOWUP_GET_DUE_DATE, caseId),

  canCreateFollowup: (caseId: string): Promise<IPCResponse<{ allowed: boolean; reason?: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLLOWUP_CAN_CREATE, caseId),

  createNullification: (request: CreateNullificationRequest): Promise<IPCResponse<CreateNullificationResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NULLIFICATION_CREATE, request),

  canCreateNullification: (caseId: string): Promise<IPCResponse<{ allowed: boolean; reason?: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NULLIFICATION_CAN_CREATE, caseId),

  // ============================================================
  // Phase 4: Batch Submission
  // ============================================================
  createBatch: (request: CreateBatchRequest): Promise<IPCResponse<CreateBatchResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_CREATE, request),

  getBatch: (batchId: number): Promise<IPCResponse<SubmissionBatch>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_GET, batchId),

  getBatches: (filter?: BatchFilter, limit?: number, offset?: number): Promise<IPCResponse<BatchListResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_LIST, filter, limit, offset),

  getBatchCases: (batchId: number): Promise<IPCResponse<BatchCase[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_GET_CASES, batchId),

  validateBatch: (batchId: number): Promise<IPCResponse<BatchValidationResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_VALIDATE, batchId),

  exportBatch: (batchId: number, exportPath: string): Promise<IPCResponse<ExportBatchResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_EXPORT, batchId, exportPath),

  recordBatchSubmission: (request: RecordBatchSubmissionRequest): Promise<IPCResponse<SubmissionBatch>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_SUBMIT, request),

  recordBatchAcknowledgment: (request: RecordBatchAcknowledgmentRequest): Promise<IPCResponse<SubmissionBatch>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_ACKNOWLEDGE, request),

  addCaseToBatch: (batchId: number, caseId: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_ADD_CASE, batchId, caseId),

  removeCaseFromBatch: (batchId: number, caseId: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_REMOVE_CASE, batchId, caseId),

  deleteBatch: (batchId: number): Promise<IPCResponse<boolean>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_DELETE, batchId),

  getEligibleCasesForBatch: (batchType: BatchType): Promise<IPCResponse<BatchCaseEligibility[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_GET_ELIGIBLE_CASES, batchType),

  // ============================================================
  // Phase 4: PSR Management
  // ============================================================
  createPSRSchedule: (data: CreatePSRScheduleDTO): Promise<IPCResponse<PSRSchedule>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_SCHEDULE_CREATE, data),

  getPSRSchedulesByProduct: (productId: number): Promise<IPCResponse<PSRSchedule[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_SCHEDULE_GET, productId),

  updatePSRSchedule: (id: number, data: UpdatePSRScheduleDTO): Promise<IPCResponse<PSRSchedule>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_SCHEDULE_UPDATE, id, data),

  deletePSRSchedule: (id: number): Promise<IPCResponse<boolean>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_SCHEDULE_DELETE, id),

  getNextPSRPeriod: (scheduleId: number): Promise<IPCResponse<PSRPeriodCalculation>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_SCHEDULE_GET_NEXT_PERIOD, scheduleId),

  createPSR: (data: CreatePSRDTO): Promise<IPCResponse<PSR>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_CREATE, data),

  getPSR: (id: number): Promise<IPCResponse<PSR>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_GET, id),

  getPSRs: (filter?: PSRFilter, limit?: number, offset?: number): Promise<IPCResponse<PSRListResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_LIST, filter, limit, offset),

  transitionPSR: (request: PSRTransitionRequest): Promise<IPCResponse<PSR>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_TRANSITION, request),

  getPSRCases: (psrId: number): Promise<IPCResponse<PSRCase[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_GET_CASES, psrId),

  getEligibleCasesForPSR: (psrId: number): Promise<IPCResponse<PSRCase[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_GET_ELIGIBLE_CASES, psrId),

  updatePSRCases: (request: UpdatePSRCasesRequest): Promise<IPCResponse<PSR>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_UPDATE_CASES, request),

  getPSRDashboard: (): Promise<IPCResponse<PSRDashboardSummary>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PSR_DASHBOARD),

  // ============================================================
  // Phase 5: MedDRA Dictionary
  // ============================================================
  meddraVersions: (): Promise<IPCResponse<MedDRAVersion[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_VERSIONS),

  meddraActiveVersion: (): Promise<IPCResponse<MedDRAVersion | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_ACTIVE_VERSION),

  meddraActivateVersion: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_ACTIVATE_VERSION, id),

  meddraDeleteVersion: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_DELETE_VERSION, id),

  meddraImport: (request: MedDRAImportRequest, importedBy?: string): Promise<IPCResponse<MedDRAVersion>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_IMPORT, request, importedBy),

  meddraImportProgress: (): Promise<IPCResponse<MedDRAImportProgress | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_IMPORT_PROGRESS),

  meddraSearch: (options: MedDRASearchOptions): Promise<IPCResponse<MedDRASearchResult[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_SEARCH, options),

  meddraBrowse: (request: MedDRABrowseRequest): Promise<IPCResponse<MedDRATreeNode[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_BROWSE, request),

  meddraHierarchy: (ptCode: number, versionId?: number): Promise<IPCResponse<MedDRAHierarchy[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_HIERARCHY, ptCode, versionId),

  meddraHierarchyLLT: (lltCode: number, versionId?: number): Promise<IPCResponse<MedDRAHierarchy[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_HIERARCHY_LLT, lltCode, versionId),

  meddraCode: (lltCode: number, verbatimText: string, codedBy?: string): Promise<IPCResponse<MedDRACoding | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_CODE, lltCode, verbatimText, codedBy),

  meddraCodePT: (ptCode: number, verbatimText: string, codedBy?: string): Promise<IPCResponse<MedDRACoding | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_CODE_PT, ptCode, verbatimText, codedBy),

  meddraSelectFolder: (): Promise<IPCResponse<{ folderPath: string; filePaths: Record<string, string> } | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDDRA_SELECT_FOLDER),

  // ============================================================
  // Phase 5: WHO Drug Dictionary
  // ============================================================
  whodrugVersions: (): Promise<IPCResponse<WHODrugVersion[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_VERSIONS),

  whodrugActiveVersion: (): Promise<IPCResponse<WHODrugVersion | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_ACTIVE_VERSION),

  whodrugActivateVersion: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_ACTIVATE_VERSION, id),

  whodrugDeleteVersion: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_DELETE_VERSION, id),

  whodrugImport: (request: WHODrugImportRequest, importedBy?: string): Promise<IPCResponse<WHODrugVersion>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_IMPORT, request, importedBy),

  whodrugImportProgress: (): Promise<IPCResponse<WHODrugImportProgress | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_IMPORT_PROGRESS),

  whodrugSearch: (options: WHODrugSearchOptions): Promise<IPCResponse<WHODrugSearchResult[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_SEARCH, options),

  whodrugGetProduct: (drugCode: string, versionId?: number): Promise<IPCResponse<WHODrugProduct | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_GET_PRODUCT, drugCode, versionId),

  whodrugBrowseATC: (request: WHODrugBrowseATCRequest): Promise<IPCResponse<ATCTreeNode[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_BROWSE_ATC, request),

  whodrugProductsByATC: (atcCode: string, versionId?: number, limit?: number): Promise<IPCResponse<WHODrugSearchResult[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_PRODUCTS_BY_ATC, atcCode, versionId, limit),

  whodrugATCHierarchy: (drugCode: string, versionId?: number): Promise<IPCResponse<ATCCode[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_ATC_HIERARCHY, drugCode, versionId),

  whodrugCode: (drugCode: string, verbatimText: string, codedBy?: string): Promise<IPCResponse<WHODrugCoding | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_CODE, drugCode, verbatimText, codedBy),

  whodrugSelectFolder: (): Promise<IPCResponse<{ folderPath: string; filePaths: Record<string, string> } | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.WHODRUG_SELECT_FOLDER),

  // ============================================================
  // Phase 5: Advanced Search
  // ============================================================
  searchCasesFulltext: (query: string, page?: number, pageSize?: number): Promise<IPCResponse<SearchResults>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_FULLTEXT, query, page, pageSize),

  searchCasesAdvanced: (query: SearchQuery, page?: number, pageSize?: number): Promise<IPCResponse<SearchResults>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_ADVANCED, query, page, pageSize),

  saveSearch: (name: string, description: string | undefined, query: SearchQuery, isShared: boolean): Promise<IPCResponse<SavedSearch>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_SAVE, name, description, query, isShared),

  updateSavedSearch: (id: number, updates: Partial<SavedSearch>): Promise<IPCResponse<SavedSearch>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_UPDATE_SAVED, id, updates),

  deleteSavedSearch: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_DELETE_SAVED, id),

  getSavedSearches: (includeShared?: boolean): Promise<IPCResponse<SavedSearch[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_LIST_SAVED, undefined, includeShared),

  executeSavedSearch: (id: number, page?: number, pageSize?: number): Promise<IPCResponse<SearchResults>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_EXECUTE_SAVED, id, page, pageSize),

  getSearchableFields: (): Promise<IPCResponse<SearchableField[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_GET_FIELDS),

  // ============================================================
  // Phase 5: Duplicate Detection
  // ============================================================
  checkDuplicates: (caseId: string, threshold?: number): Promise<IPCResponse<DuplicateCheckResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_CHECK, caseId, threshold),

  getDuplicateCandidates: (filter?: DuplicateFilter, limit?: number, offset?: number): Promise<IPCResponse<{ items: DuplicateListItem[]; total: number }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_GET_CANDIDATES, filter, limit, offset),

  getDuplicateCandidate: (id: number): Promise<IPCResponse<DuplicateCandidate>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_GET_CANDIDATE, id),

  resolveDuplicate: (id: number, resolution: DuplicateResolution, resolvedBy?: string, notes?: string): Promise<IPCResponse<DuplicateCandidate>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_RESOLVE, id, resolution, resolvedBy, notes),

  getPendingDuplicates: (caseId: string): Promise<IPCResponse<DuplicateCandidate[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_GET_PENDING, caseId),

  getDuplicateStats: (): Promise<IPCResponse<{ pending: number; dismissed: number; confirmed: number; merged: number }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_GET_STATS),

  mergeCases: (request: MergeCasesRequest): Promise<IPCResponse<MergeCasesResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_MERGE, request),

  getMergeHistory: (caseId: string): Promise<IPCResponse<MergedCase[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_GET_MERGE_HISTORY, caseId),

  getDuplicateSettings: (): Promise<IPCResponse<DuplicateCheckSettings>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_GET_SETTINGS),

  updateDuplicateSettings: (settings: Partial<DuplicateCheckSettings>): Promise<IPCResponse<DuplicateCheckSettings>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_UPDATE_SETTINGS, settings),

  startBatchDuplicateScan: (request: BatchDuplicateScanRequest): Promise<IPCResponse<{ jobId: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_BATCH_SCAN, request),

  getBatchDuplicateScanStatus: (jobId: string): Promise<IPCResponse<BatchDuplicateScanResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_GET_SCAN_STATUS, jobId),

  // ============================================================
  // Phase 5: Case Templates
  // ============================================================
  createTemplate: (request: CreateTemplateRequest): Promise<IPCResponse<CaseTemplate>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_CREATE, request),

  updateTemplate: (request: UpdateTemplateRequest): Promise<IPCResponse<CaseTemplate>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_UPDATE, request),

  deleteTemplate: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_DELETE, id),

  getTemplate: (id: number): Promise<IPCResponse<CaseTemplate>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_GET, id),

  getTemplates: (filter?: TemplateFilter, limit?: number, offset?: number): Promise<IPCResponse<{ items: TemplateListItem[]; total: number }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_LIST, filter, limit, offset),

  applyTemplate: (templateId: number): Promise<IPCResponse<ApplyTemplateResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_APPLY, templateId),

  approveTemplate: (id: number): Promise<IPCResponse<CaseTemplate>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_APPROVE, id),

  createTemplateFromCase: (caseId: string, name: string, description?: string, category?: string): Promise<IPCResponse<CaseTemplate>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_CREATE_FROM_CASE, caseId, name, description, category),

  // ============================================================
  // Phase 5: Bulk Import
  // ============================================================
  importUpload: (filePath?: string): Promise<IPCResponse<ImportUploadResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_UPLOAD, filePath),

  importSetMapping: (jobId: number, mapping: ColumnMapping[]): Promise<IPCResponse<ImportJob>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_SET_MAPPING, jobId, mapping),

  importValidate: (jobId: number): Promise<IPCResponse<ImportValidationSummary>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_VALIDATE, jobId),

  importExecute: (jobId: number, options: ImportExecuteOptions): Promise<IPCResponse<ImportExecuteResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_EXECUTE, jobId, options),

  importGet: (jobId: number): Promise<IPCResponse<ImportJob>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_GET, jobId),

  importList: (limit?: number, offset?: number): Promise<IPCResponse<{ items: ImportJobListItem[]; total: number }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_LIST, limit, offset),

  importGetErrors: (jobId: number): Promise<IPCResponse<Array<{ rowNumber: number; errors: string[] }>>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_GET_ERRORS, jobId),

  importCancel: (jobId: number): Promise<IPCResponse<boolean>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CANCEL, jobId),

  importSaveMapping: (name: string, description: string | undefined, mapping: ColumnMapping[]): Promise<IPCResponse<SavedColumnMapping>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_SAVE_MAPPING, name, description, mapping),

  importListMappings: (): Promise<IPCResponse<SavedColumnMapping[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_LIST_MAPPINGS),

  importDeleteMapping: (id: number): Promise<IPCResponse<boolean>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_DELETE_MAPPING, id),

  // ============================================================
  // Phase 5: Validation Engine
  // ============================================================
  runValidation: (caseId: string): Promise<IPCResponse<ValidationSummary>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATION_RUN, caseId),

  acknowledgeWarnings: (request: AcknowledgeWarningRequest): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATION_ACKNOWLEDGE, request),

  getValidationResults: (caseId: string): Promise<IPCResponse<ValidationSummary>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATION_GET_RESULTS, caseId),

  getValidationRules: (filter?: ValidationRuleFilter): Promise<IPCResponse<ValidationRuleListItem[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATION_RULES_LIST, filter),

  getValidationRule: (id: number): Promise<IPCResponse<ValidationRule>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATION_RULE_GET, id),

  createValidationRule: (request: CreateValidationRuleRequest, createdBy?: string): Promise<IPCResponse<ValidationRule>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATION_RULE_CREATE, request, createdBy),

  updateValidationRule: (request: UpdateValidationRuleRequest): Promise<IPCResponse<ValidationRule>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATION_RULE_UPDATE, request),

  deleteValidationRule: (id: number): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATION_RULE_DELETE, id),

  testValidationRule: (request: TestRuleRequest): Promise<IPCResponse<TestRuleResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATION_RULE_TEST, request),

  toggleValidationRule: (id: number, isActive: boolean): Promise<IPCResponse<ValidationRule>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATION_RULE_TOGGLE, id, isActive),

  // ============================================================
  // Phase 2B: ESG API Methods
  // ============================================================
  esgTestConnection: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_TEST_CONNECTION),

  esgGetSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_GET_SETTINGS),

  esgSaveSettings: (settings: SaveEsgSettingsRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_SAVE_SETTINGS, settings),

  esgSaveCredentials: (data: SaveCredentialsRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_SAVE_CREDENTIALS, data),

  esgHasCredentials: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_HAS_CREDENTIALS),

  esgClearCredentials: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_CLEAR_CREDENTIALS),

  esgSubmitCase: (data: SubmitToFdaRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_SUBMIT_CASE, data),

  esgRetrySubmission: (caseId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_RETRY_SUBMISSION, caseId),

  esgCancelSubmission: (caseId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_CANCEL_SUBMISSION, caseId),

  esgGetProgress: (caseId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_GET_PROGRESS, caseId),

  esgGetPreSubmissionSummary: (caseId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_GET_PRE_SUMMARY, caseId),

  esgCheckAcknowledgment: (caseId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_CHECK_ACK, caseId),

  esgGetAttempts: (caseId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_GET_ATTEMPTS, caseId),

  esgStartPolling: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_POLLING_START),

  esgStopPolling: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_POLLING_STOP),

  esgGetPollingStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ESG_API_POLLING_STATUS),

  // ESG progress event listener
  onEsgSubmissionProgress: (callback: (progress: ApiSubmissionProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ApiSubmissionProgress) => callback(progress);
    ipcRenderer.on(IPC_CHANNELS.ESG_SUBMISSION_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ESG_SUBMISSION_PROGRESS, handler);
  },

  // ============================================================
  // Phase 2B: Demo Mode
  // ============================================================
  demoGetStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DEMO_GET_STATUS),

  demoActivate: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DEMO_ACTIVATE),

  demoDeactivate: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DEMO_DEACTIVATE),

  demoGetConfig: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DEMO_GET_CONFIG),

  demoSetConfig: (config: SetDemoConfigRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.DEMO_SET_CONFIG, config),

  demoGetSampleCases: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DEMO_GET_SAMPLE_CASES),

  demoCreateSampleCases: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DEMO_CREATE_SAMPLE_CASES),

  demoResetData: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DEMO_RESET_DATA),

  // Demo mode changed event listener
  onDemoModeChanged: (callback: (data: { isActive: boolean; config: DemoModeConfig }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { isActive: boolean; config: DemoModeConfig }) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.DEMO_MODE_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DEMO_MODE_CHANGED, handler);
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
