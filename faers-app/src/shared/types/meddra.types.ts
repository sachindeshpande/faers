/**
 * MedDRA Dictionary Types
 * Phase 5: Medical Terminology Integration
 */

// MedDRA version information
export interface MedDRAVersion {
  id: number;
  version: string;
  releaseDate?: string;
  importDate: string;
  isActive: boolean;
  lltCount: number;
  ptCount: number;
  importedBy?: string;
}

// System Organ Class (SOC) - Level 1 (top)
export interface MedDRASOC {
  socCode: number;
  socName: string;
  socAbbrev?: string;
}

// High Level Group Term (HLGT) - Level 2
export interface MedDRAHLGT {
  hlgtCode: number;
  hlgtName: string;
}

// High Level Term (HLT) - Level 3
export interface MedDRAHLT {
  hltCode: number;
  hltName: string;
}

// Preferred Term (PT) - Level 4
export interface MedDRAPT {
  ptCode: number;
  ptName: string;
  primarySocCode?: number;
}

// Lowest Level Term (LLT) - Level 5 (bottom)
export interface MedDRALLT {
  lltCode: number;
  lltName: string;
  ptCode: number;
  isCurrent: boolean;
}

// Full hierarchy for a term
export interface MedDRAHierarchy {
  llt: MedDRALLT;
  pt: MedDRAPT;
  hlt: MedDRAHLT;
  hlgt: MedDRAHLGT;
  soc: MedDRASOC;
  isPrimaryPath: boolean;
}

// Search result from MedDRA autocomplete
export interface MedDRASearchResult {
  lltCode: number;
  lltName: string;
  ptCode: number;
  ptName: string;
  socCode: number;
  socName: string;
  isCurrent: boolean;
  matchScore: number;
}

// Coding applied to a case reaction
export interface MedDRACoding {
  verbatimText: string;
  lltCode?: number;
  lltName?: string;
  ptCode: number;
  ptName: string;
  hltCode?: number;
  hltName?: string;
  hlgtCode?: number;
  hlgtName?: string;
  socCode: number;
  socName: string;
  meddraVersion: string;
  codedBy?: string;
  codedAt?: string;
}

// Tree node for hierarchy browser
export interface MedDRATreeNode {
  key: string;
  title: string;
  code: number;
  level: 'soc' | 'hlgt' | 'hlt' | 'pt' | 'llt';
  isLeaf?: boolean;
  isCurrent?: boolean;
  isPrimary?: boolean;
  children?: MedDRATreeNode[];
}

// Import progress tracking
export interface MedDRAImportProgress {
  status: 'pending' | 'parsing' | 'importing' | 'indexing' | 'completed' | 'failed';
  currentFile?: string;
  filesProcessed: number;
  totalFiles: number;
  recordsImported: number;
  totalRecords?: number;
  error?: string;
}

// Import request
export interface MedDRAImportRequest {
  version: string;
  releaseDate?: string;
  filePaths: {
    llt: string;
    pt: string;
    hlt: string;
    hlgt: string;
    soc: string;
    hlt_pt: string;
    hlgt_hlt: string;
    soc_hlgt: string;
    mdhier?: string;
  };
}

// Search options
export interface MedDRASearchOptions {
  query: string;
  limit?: number;
  includeNonCurrent?: boolean;
  versionId?: number;
  fuzzyThreshold?: number;
}

// Browse request
export interface MedDRABrowseRequest {
  parentCode?: number;
  parentLevel?: 'soc' | 'hlgt' | 'hlt' | 'pt';
  versionId?: number;
}

// Labels for MedDRA levels
export const MEDDRA_LEVEL_LABELS: Record<string, string> = {
  soc: 'System Organ Class (SOC)',
  hlgt: 'High Level Group Term (HLGT)',
  hlt: 'High Level Term (HLT)',
  pt: 'Preferred Term (PT)',
  llt: 'Lowest Level Term (LLT)'
};

// MedDRA code system OID for E2B(R3)
export const MEDDRA_CODE_SYSTEM = '2.16.840.1.113883.6.163';
