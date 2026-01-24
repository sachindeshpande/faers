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
  CaseDrug
} from './case.types';
import type { Form3500AImportResult } from './form3500.types';

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
  IMPORT_FORM3500: 'import:form3500'
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
}

// Declare the electronAPI on the window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
