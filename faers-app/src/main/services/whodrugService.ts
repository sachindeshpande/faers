/**
 * WHO Drug Service
 * Handles WHO Drug dictionary import, search, and ATC browsing operations
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { WHODrugRepository } from '../database/repositories/whodrug.repository';
import type {
  WHODrugVersion,
  WHODrugProduct,
  WHODrugSearchResult,
  WHODrugSearchOptions,
  WHODrugBrowseATCRequest,
  ATCCode,
  ATCTreeNode,
  WHODrugImportRequest,
  WHODrugImportProgress,
  WHODrugCoding
} from '../../shared/types/whodrug.types';

export class WHODrugService {
  private repository: WHODrugRepository;
  private importProgress: WHODrugImportProgress | null = null;

  constructor(repository: WHODrugRepository) {
    this.repository = repository;
  }

  // ============ Version Management ============

  /**
   * Get all WHO Drug versions
   */
  getAllVersions(): WHODrugVersion[] {
    return this.repository.getAllVersions();
  }

  /**
   * Get active WHO Drug version
   */
  getActiveVersion(): WHODrugVersion | null {
    return this.repository.getActiveVersion();
  }

  /**
   * Activate a WHO Drug version
   */
  activateVersion(id: number): void {
    const version = this.repository.getVersionById(id);
    if (!version) {
      throw new Error(`WHO Drug version ${id} not found`);
    }
    this.repository.activateVersion(id);
  }

  /**
   * Delete a WHO Drug version
   */
  deleteVersion(id: number): void {
    const version = this.repository.getVersionById(id);
    if (!version) {
      throw new Error(`WHO Drug version ${id} not found`);
    }
    if (version.isActive) {
      throw new Error('Cannot delete the active WHO Drug version');
    }
    this.repository.deleteVersion(id);
  }

  // ============ Import ============

  /**
   * Get current import progress
   */
  getImportProgress(): WHODrugImportProgress | null {
    return this.importProgress;
  }

  /**
   * Import WHO Drug dictionary from files
   * WHO Drug Global comes in various formats. This supports a common delimited format.
   */
  async importWHODrug(request: WHODrugImportRequest, importedBy?: string): Promise<WHODrugVersion> {
    const { version, releaseDate, filePaths } = request;

    // Initialize progress
    this.importProgress = {
      status: 'pending',
      filesProcessed: 0,
      totalFiles: 4,
      recordsImported: 0
    };

    try {
      // Validate required files exist
      const requiredFiles = ['atc', 'ingredients', 'products'];
      for (const file of requiredFiles) {
        if (!filePaths[file] || !fs.existsSync(filePaths[file])) {
          throw new Error(`Required file not found: ${file}`);
        }
      }

      // Create version record
      const versionId = this.repository.createVersion(version, releaseDate, importedBy);

      this.importProgress.status = 'parsing';

      // Import ATC codes
      this.importProgress.currentFile = 'ATC codes';
      const atcRecords = await this.parseATCFile(filePaths.atc);
      this.repository.bulkInsertATC(versionId, atcRecords);
      this.importProgress.filesProcessed = 1;
      this.importProgress.recordsImported += atcRecords.length;

      // Import ingredients
      this.importProgress.currentFile = 'Ingredients';
      const ingredientRecords = await this.parseIngredientsFile(filePaths.ingredients);
      this.repository.bulkInsertIngredients(versionId, ingredientRecords);
      this.importProgress.filesProcessed = 2;
      this.importProgress.recordsImported += ingredientRecords.length;

      this.importProgress.status = 'importing';

      // Import products
      this.importProgress.currentFile = 'Products';
      const productRecords = await this.parseProductsFile(filePaths.products);
      this.repository.bulkInsertProducts(versionId, productRecords);
      this.importProgress.filesProcessed = 3;
      this.importProgress.recordsImported += productRecords.length;

      // Import product-ingredient relationships if available
      if (filePaths.product_ingredients && fs.existsSync(filePaths.product_ingredients)) {
        this.importProgress.currentFile = 'Product-Ingredient relationships';
        const piRecords = await this.parseProductIngredientsFile(filePaths.product_ingredients);
        this.repository.bulkInsertProductIngredients(versionId, piRecords);
        this.importProgress.filesProcessed = 4;
        this.importProgress.recordsImported += piRecords.length;
      }

      // Update counts
      this.repository.updateVersionCounts(versionId, productRecords.length, ingredientRecords.length);

      // Mark as completed
      this.importProgress.status = 'completed';

      const newVersion = this.repository.getVersionById(versionId);
      if (!newVersion) {
        throw new Error('Failed to retrieve created version');
      }

      return newVersion;
    } catch (error) {
      this.importProgress.status = 'failed';
      this.importProgress.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  // ============ File Parsing ============

  /**
   * Parse ATC file
   * Expected format: atc_code|atc_name|level|parent_code
   */
  private async parseATCFile(filePath: string): Promise<Array<{ atcCode: string; atcName: string; level: number; parentCode?: string }>> {
    const records: Array<{ atcCode: string; atcName: string; level: number; parentCode?: string }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isFirstLine = true;
    for await (const line of rl) {
      // Skip header line
      if (isFirstLine) {
        isFirstLine = false;
        if (line.toLowerCase().includes('atc_code') || line.toLowerCase().includes('code')) {
          continue;
        }
      }

      const parts = line.split('|');
      if (parts.length >= 2 && parts[0]) {
        const atcCode = parts[0].trim();
        const level = this.getATCLevel(atcCode);
        const parentCode = this.getATCParent(atcCode);

        records.push({
          atcCode,
          atcName: parts[1]?.trim() || atcCode,
          level,
          parentCode: parentCode || undefined
        });
      }
    }
    return records;
  }

  /**
   * Determine ATC level from code
   * Level 1: A (1 char)
   * Level 2: A01 (3 chars)
   * Level 3: A01A (4 chars)
   * Level 4: A01AA (5 chars)
   * Level 5: A01AA01 (7 chars)
   */
  private getATCLevel(code: string): number {
    if (!code) return 0;
    const len = code.length;
    if (len === 1) return 1;
    if (len === 3) return 2;
    if (len === 4) return 3;
    if (len === 5) return 4;
    if (len >= 7) return 5;
    return 0;
  }

  /**
   * Get parent ATC code
   */
  private getATCParent(code: string): string | null {
    if (!code) return null;
    const len = code.length;
    if (len === 1) return null;
    if (len === 3) return code.substring(0, 1);
    if (len === 4) return code.substring(0, 3);
    if (len === 5) return code.substring(0, 4);
    if (len >= 7) return code.substring(0, 5);
    return null;
  }

  /**
   * Parse ingredients file
   * Expected format: ingredient_id|name
   */
  private async parseIngredientsFile(filePath: string): Promise<Array<{ ingredientId: string; name: string }>> {
    const records: Array<{ ingredientId: string; name: string }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isFirstLine = true;
    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        if (line.toLowerCase().includes('ingredient') || line.toLowerCase().includes('id')) {
          continue;
        }
      }

      const parts = line.split('|');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        records.push({
          ingredientId: parts[0].trim(),
          name: parts[1].trim()
        });
      }
    }
    return records;
  }

  /**
   * Parse products file
   * Expected format: drug_code|drug_name|drug_name_english|country_code|company|atc_code|formulation|marketing_status
   */
  private async parseProductsFile(filePath: string): Promise<Array<{
    drugCode: string;
    drugName: string;
    drugNameEnglish?: string;
    countryCode?: string;
    company?: string;
    atcCode?: string;
    formulation?: string;
    marketingStatus?: string;
  }>> {
    const records: Array<{
      drugCode: string;
      drugName: string;
      drugNameEnglish?: string;
      countryCode?: string;
      company?: string;
      atcCode?: string;
      formulation?: string;
      marketingStatus?: string;
    }> = [];

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isFirstLine = true;
    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        if (line.toLowerCase().includes('drug_code') || line.toLowerCase().includes('code')) {
          continue;
        }
      }

      const parts = line.split('|');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        records.push({
          drugCode: parts[0].trim(),
          drugName: parts[1].trim(),
          drugNameEnglish: parts[2]?.trim() || undefined,
          countryCode: parts[3]?.trim() || undefined,
          company: parts[4]?.trim() || undefined,
          atcCode: parts[5]?.trim() || undefined,
          formulation: parts[6]?.trim() || undefined,
          marketingStatus: parts[7]?.trim() || undefined
        });
      }
    }
    return records;
  }

  /**
   * Parse product-ingredients file
   * Expected format: drug_code|ingredient_id|strength
   */
  private async parseProductIngredientsFile(filePath: string): Promise<Array<{ drugCode: string; ingredientId: string; strength?: string }>> {
    const records: Array<{ drugCode: string; ingredientId: string; strength?: string }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isFirstLine = true;
    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        if (line.toLowerCase().includes('drug_code') || line.toLowerCase().includes('code')) {
          continue;
        }
      }

      const parts = line.split('|');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        records.push({
          drugCode: parts[0].trim(),
          ingredientId: parts[1].trim(),
          strength: parts[2]?.trim() || undefined
        });
      }
    }
    return records;
  }

  // ============ Search ============

  /**
   * Search WHO Drug products
   */
  search(options: WHODrugSearchOptions): WHODrugSearchResult[] {
    if (!options.query || options.query.length < 2) {
      return [];
    }
    return this.repository.search(options);
  }

  /**
   * Get product details by drug code
   */
  getProductByCode(drugCode: string, versionId?: number): WHODrugProduct | null {
    return this.repository.getProductByCode(drugCode, versionId);
  }

  // ============ ATC Browsing ============

  /**
   * Get ATC tree children for hierarchy browser
   */
  getATCTreeChildren(request: WHODrugBrowseATCRequest): ATCTreeNode[] {
    return this.repository.getATCTreeChildren(request);
  }

  /**
   * Get products by ATC code
   */
  getProductsByATC(atcCode: string, versionId?: number, limit = 50): WHODrugSearchResult[] {
    return this.repository.getProductsByATC(atcCode, versionId, limit);
  }

  /**
   * Get ATC hierarchy for a drug
   */
  getATCHierarchy(drugCode: string, versionId?: number): ATCCode[] {
    return this.repository.getATCHierarchy(drugCode, versionId);
  }

  // ============ Coding ============

  /**
   * Create a WHO Drug coding object from a selected product
   */
  createCoding(drugCode: string, verbatimText: string, codedBy?: string): WHODrugCoding | null {
    const activeVersion = this.getActiveVersion();
    if (!activeVersion) {
      throw new Error('No active WHO Drug version');
    }

    const product = this.repository.getProductByCode(drugCode);
    if (!product) {
      return null;
    }

    const atcHierarchy = this.repository.getATCHierarchy(drugCode);

    return {
      verbatimText,
      drugCode: product.drugCode,
      drugName: product.drugName,
      drugNameEnglish: product.drugNameEnglish,
      atcCode: product.atcCode,
      atcName: product.atcName,
      atcHierarchy: atcHierarchy.map(a => ({
        code: a.atcCode,
        name: a.atcName,
        level: a.level
      })),
      ingredients: product.ingredients,
      countryCode: product.countryCode,
      formulation: product.formulation,
      whodrugVersion: activeVersion.version,
      codedBy,
      codedAt: new Date().toISOString()
    };
  }
}
