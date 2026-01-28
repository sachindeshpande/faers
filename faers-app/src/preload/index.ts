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
    ipcRenderer.invoke(IPC_CHANNELS.PSR_DASHBOARD)
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
