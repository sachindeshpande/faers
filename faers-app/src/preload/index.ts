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
  MarkReadyResponse
} from '../shared/types/ipc.types';
import type { Form3500AImportResult } from '../shared/types/form3500.types';

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
    ipcRenderer.invoke(IPC_CHANNELS.CASE_REVERT_TO_DRAFT, { caseId, reason })
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
