/**
 * WHO Drug Dictionary Types
 * Phase 5: Medical Terminology Integration
 */

// WHO Drug version information
export interface WHODrugVersion {
  id: number;
  version: string;
  releaseDate?: string;
  importDate: string;
  isActive: boolean;
  drugCount: number;
  importedBy?: string;
}

// ATC Classification (5 levels)
export interface WHODrugATC {
  atcCode: string;
  atcLevel: number; // 1-5
  atcName: string;
  parentAtcCode?: string;
}

// Active Ingredient
export interface WHODrugIngredient {
  ingredientId: number;
  ingredientName: string;
  casNumber?: string;
}

// Drug Product (Trade Name)
export interface WHODrugProduct {
  drugCode: string; // Full 11-char code: XXXXXX-XX-XXX
  drugRecordNumber: string; // 6 digits
  seq1: string; // 2 digits
  seq2: string; // 3 digits
  drugName: string;
  countryCode?: string;
  pharmaceuticalForm?: string;
  strength?: string;
  manufacturer?: string;
  ingredients?: WHODrugIngredient[];
  atcCodes?: WHODrugATC[];
}

// Search result from WHO Drug autocomplete
export interface WHODrugSearchResult {
  drugCode: string;
  drugName: string;
  ingredientNames: string[];
  atcCode?: string;
  atcName?: string;
  manufacturer?: string;
  countryCode?: string;
  pharmaceuticalForm?: string;
  strength?: string;
  matchScore: number;
}

// Coding applied to a case drug
export interface WHODrugCoding {
  verbatimName: string;
  whodrugCode?: string;
  codedDrugName?: string;
  ingredientNames?: string; // JSON array as string
  atcCode?: string;
  atcName?: string;
  whodrugVersion?: string;
  codedBy?: string;
  codedAt?: string;
}

// Tree node for ATC hierarchy browser
export interface ATCTreeNode {
  key: string;
  title: string;
  code: string;
  level: number; // 1-5
  isLeaf?: boolean;
  children?: ATCTreeNode[];
  drugCount?: number;
}

// Import progress tracking
export interface WHODrugImportProgress {
  status: 'pending' | 'parsing' | 'importing' | 'indexing' | 'completed' | 'failed';
  currentFile?: string;
  filesProcessed: number;
  totalFiles: number;
  recordsImported: number;
  totalRecords?: number;
  error?: string;
}

// Import request
export interface WHODrugImportRequest {
  version: string;
  releaseDate?: string;
  filePaths: {
    products: string;
    ingredients: string;
    atc: string;
    productIngredients?: string;
    productAtc?: string;
  };
}

// Search options
export interface WHODrugSearchOptions {
  query: string;
  limit?: number;
  countryCode?: string;
  versionId?: number;
  searchIngredients?: boolean;
  fuzzyThreshold?: number;
}

// Browse ATC request
export interface WHODrugBrowseATCRequest {
  parentCode?: string;
  versionId?: number;
  includeDrugs?: boolean;
}

// Labels for ATC levels
export const ATC_LEVEL_LABELS: Record<number, string> = {
  1: 'Anatomical Main Group',
  2: 'Therapeutic Subgroup',
  3: 'Pharmacological Subgroup',
  4: 'Chemical Subgroup',
  5: 'Chemical Substance'
};

// Common country codes for filtering
export const COMMON_COUNTRY_CODES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' }
];
