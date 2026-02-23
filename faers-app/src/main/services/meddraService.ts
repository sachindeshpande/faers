/**
 * MedDRA Service
 * Handles MedDRA dictionary import, search, and hierarchy operations
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { MedDRARepository } from '../database/repositories/meddra.repository';
import type {
  MedDRAVersion,
  MedDRASearchResult,
  MedDRASearchOptions,
  MedDRABrowseRequest,
  MedDRATreeNode,
  MedDRAHierarchy,
  MedDRAImportRequest,
  MedDRAImportProgress,
  MedDRACoding
} from '../../shared/types/meddra.types';

export class MedDRAService {
  private repository: MedDRARepository;
  private importProgress: MedDRAImportProgress | null = null;

  constructor(repository: MedDRARepository) {
    this.repository = repository;
  }

  // ============ Version Management ============

  /**
   * Get all MedDRA versions
   */
  getAllVersions(): MedDRAVersion[] {
    return this.repository.getAllVersions();
  }

  /**
   * Get active MedDRA version
   */
  getActiveVersion(): MedDRAVersion | null {
    return this.repository.getActiveVersion();
  }

  /**
   * Activate a MedDRA version
   */
  activateVersion(id: number): void {
    const version = this.repository.getVersionById(id);
    if (!version) {
      throw new Error(`MedDRA version ${id} not found`);
    }
    this.repository.activateVersion(id);
  }

  /**
   * Delete a MedDRA version
   */
  deleteVersion(id: number): void {
    const version = this.repository.getVersionById(id);
    if (!version) {
      throw new Error(`MedDRA version ${id} not found`);
    }
    if (version.isActive) {
      throw new Error('Cannot delete the active MedDRA version');
    }
    this.repository.deleteVersion(id);
  }

  // ============ Import ============

  /**
   * Get current import progress
   */
  getImportProgress(): MedDRAImportProgress | null {
    return this.importProgress;
  }

  /**
   * Import MedDRA dictionary from ASCII files
   */
  async importMedDRA(request: MedDRAImportRequest, importedBy?: string): Promise<MedDRAVersion> {
    const { version, releaseDate, filePaths } = request;

    // Initialize progress
    this.importProgress = {
      status: 'pending',
      filesProcessed: 0,
      totalFiles: 8,
      recordsImported: 0
    };

    try {
      // Validate all files exist
      for (const [key, filePath] of Object.entries(filePaths)) {
        if (key === 'mdhier' && !filePath) continue; // mdhier is optional
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
      }

      // Create version record
      const versionId = this.repository.createVersion(version, releaseDate, importedBy);

      this.importProgress.status = 'parsing';

      // Import SOC
      this.importProgress.currentFile = 'soc.asc';
      const socRecords = await this.parseSOCFile(filePaths.soc);
      this.repository.bulkInsertSOC(versionId, socRecords);
      this.importProgress.filesProcessed = 1;
      this.importProgress.recordsImported += socRecords.length;

      // Import HLGT
      this.importProgress.currentFile = 'hlgt.asc';
      const hlgtRecords = await this.parseHLGTFile(filePaths.hlgt);
      this.repository.bulkInsertHLGT(versionId, hlgtRecords);
      this.importProgress.filesProcessed = 2;
      this.importProgress.recordsImported += hlgtRecords.length;

      // Import HLT
      this.importProgress.currentFile = 'hlt.asc';
      const hltRecords = await this.parseHLTFile(filePaths.hlt);
      this.repository.bulkInsertHLT(versionId, hltRecords);
      this.importProgress.filesProcessed = 3;
      this.importProgress.recordsImported += hltRecords.length;

      // Import PT
      this.importProgress.currentFile = 'pt.asc';
      const ptRecords = await this.parsePTFile(filePaths.pt);
      this.repository.bulkInsertPT(versionId, ptRecords);
      this.importProgress.filesProcessed = 4;
      this.importProgress.recordsImported += ptRecords.length;

      // Import LLT
      this.importProgress.currentFile = 'llt.asc';
      const lltRecords = await this.parseLLTFile(filePaths.llt);
      this.repository.bulkInsertLLT(versionId, lltRecords);
      this.importProgress.filesProcessed = 5;
      this.importProgress.recordsImported += lltRecords.length;

      this.importProgress.status = 'importing';

      // Import relationships
      this.importProgress.currentFile = 'soc_hlgt.asc';
      const socHlgtRecords = await this.parseSOCHLGTFile(filePaths.soc_hlgt);
      this.repository.bulkInsertSOCHLGT(versionId, socHlgtRecords);
      this.importProgress.filesProcessed = 6;
      this.importProgress.recordsImported += socHlgtRecords.length;

      this.importProgress.currentFile = 'hlgt_hlt.asc';
      const hlgtHltRecords = await this.parseHLGTHLTFile(filePaths.hlgt_hlt);
      this.repository.bulkInsertHLGTHLT(versionId, hlgtHltRecords);
      this.importProgress.filesProcessed = 7;
      this.importProgress.recordsImported += hlgtHltRecords.length;

      this.importProgress.currentFile = 'hlt_pt.asc';
      const hltPtRecords = await this.parseHLTPTFile(filePaths.hlt_pt);
      this.repository.bulkInsertHLTPT(versionId, hltPtRecords);
      this.importProgress.filesProcessed = 8;
      this.importProgress.recordsImported += hltPtRecords.length;

      // Update counts
      this.repository.updateVersionCounts(versionId, lltRecords.length, ptRecords.length);

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
   * Parse SOC file (soc.asc)
   * Format: soc_code$soc_name$soc_abbrev$soc_whoart_code$soc_harts_code$soc_costart_sym$soc_icd9_code$soc_icd9cm_code$soc_icd10_code$soc_jart_code$
   */
  private async parseSOCFile(filePath: string): Promise<Array<{ socCode: number; socName: string; socAbbrev?: string }>> {
    const records: Array<{ socCode: number; socName: string; socAbbrev?: string }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      const parts = line.split('$');
      if (parts.length >= 3 && parts[0]) {
        records.push({
          socCode: parseInt(parts[0], 10),
          socName: parts[1] || '',
          socAbbrev: parts[2] || undefined
        });
      }
    }
    return records;
  }

  /**
   * Parse HLGT file (hlgt.asc)
   * Format: hlgt_code$hlgt_name$hlgt_whoart_code$hlgt_harts_code$hlgt_costart_sym$hlgt_icd9_code$hlgt_icd9cm_code$hlgt_icd10_code$hlgt_jart_code$
   */
  private async parseHLGTFile(filePath: string): Promise<Array<{ hlgtCode: number; hlgtName: string }>> {
    const records: Array<{ hlgtCode: number; hlgtName: string }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      const parts = line.split('$');
      if (parts.length >= 2 && parts[0]) {
        records.push({
          hlgtCode: parseInt(parts[0], 10),
          hlgtName: parts[1] || ''
        });
      }
    }
    return records;
  }

  /**
   * Parse HLT file (hlt.asc)
   * Format: hlt_code$hlt_name$hlt_whoart_code$hlt_harts_code$hlt_costart_sym$hlt_icd9_code$hlt_icd9cm_code$hlt_icd10_code$hlt_jart_code$
   */
  private async parseHLTFile(filePath: string): Promise<Array<{ hltCode: number; hltName: string }>> {
    const records: Array<{ hltCode: number; hltName: string }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      const parts = line.split('$');
      if (parts.length >= 2 && parts[0]) {
        records.push({
          hltCode: parseInt(parts[0], 10),
          hltName: parts[1] || ''
        });
      }
    }
    return records;
  }

  /**
   * Parse PT file (pt.asc)
   * Format: pt_code$pt_name$null_field$pt_soc_code$pt_whoart_code$pt_harts_code$pt_costart_sym$pt_icd9_code$pt_icd9cm_code$pt_icd10_code$pt_jart_code$
   */
  private async parsePTFile(filePath: string): Promise<Array<{ ptCode: number; ptName: string; primarySocCode?: number }>> {
    const records: Array<{ ptCode: number; ptName: string; primarySocCode?: number }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      const parts = line.split('$');
      if (parts.length >= 4 && parts[0]) {
        records.push({
          ptCode: parseInt(parts[0], 10),
          ptName: parts[1] || '',
          primarySocCode: parts[3] ? parseInt(parts[3], 10) : undefined
        });
      }
    }
    return records;
  }

  /**
   * Parse LLT file (llt.asc)
   * Format: llt_code$llt_name$pt_code$llt_whoart_code$llt_harts_code$llt_costart_sym$llt_icd9_code$llt_icd9cm_code$llt_icd10_code$llt_currency$llt_jart_code$
   */
  private async parseLLTFile(filePath: string): Promise<Array<{ lltCode: number; lltName: string; ptCode: number; isCurrent: boolean }>> {
    const records: Array<{ lltCode: number; lltName: string; ptCode: number; isCurrent: boolean }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      const parts = line.split('$');
      if (parts.length >= 10 && parts[0] && parts[2]) {
        records.push({
          lltCode: parseInt(parts[0], 10),
          lltName: parts[1] || '',
          ptCode: parseInt(parts[2], 10),
          isCurrent: parts[9] === 'Y'
        });
      }
    }
    return records;
  }

  /**
   * Parse SOC-HLGT relationship file (soc_hlgt.asc)
   * Format: soc_code$hlgt_code$
   */
  private async parseSOCHLGTFile(filePath: string): Promise<Array<{ socCode: number; hlgtCode: number }>> {
    const records: Array<{ socCode: number; hlgtCode: number }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      const parts = line.split('$');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        records.push({
          socCode: parseInt(parts[0], 10),
          hlgtCode: parseInt(parts[1], 10)
        });
      }
    }
    return records;
  }

  /**
   * Parse HLGT-HLT relationship file (hlgt_hlt.asc)
   * Format: hlgt_code$hlt_code$
   */
  private async parseHLGTHLTFile(filePath: string): Promise<Array<{ hlgtCode: number; hltCode: number }>> {
    const records: Array<{ hlgtCode: number; hltCode: number }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      const parts = line.split('$');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        records.push({
          hlgtCode: parseInt(parts[0], 10),
          hltCode: parseInt(parts[1], 10)
        });
      }
    }
    return records;
  }

  /**
   * Parse HLT-PT relationship file (hlt_pt.asc)
   * Format: hlt_code$pt_code$
   */
  private async parseHLTPTFile(filePath: string): Promise<Array<{ hltCode: number; ptCode: number }>> {
    const records: Array<{ hltCode: number; ptCode: number }> = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      const parts = line.split('$');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        records.push({
          hltCode: parseInt(parts[0], 10),
          ptCode: parseInt(parts[1], 10)
        });
      }
    }
    return records;
  }

  // ============ Search ============

  /**
   * Search MedDRA terms
   */
  search(options: MedDRASearchOptions): MedDRASearchResult[] {
    if (!options.query || options.query.length < 2) {
      return [];
    }
    return this.repository.search(options);
  }

  // ============ Hierarchy Browsing ============

  /**
   * Get tree children for hierarchy browser
   */
  getTreeChildren(request: MedDRABrowseRequest): MedDRATreeNode[] {
    return this.repository.getTreeChildren(request);
  }

  /**
   * Get full hierarchy for a PT code
   */
  getHierarchyForPT(ptCode: number, versionId?: number): MedDRAHierarchy[] {
    return this.repository.getHierarchyForPT(ptCode, versionId);
  }

  /**
   * Get full hierarchy for an LLT code
   */
  getHierarchyForLLT(lltCode: number, versionId?: number): MedDRAHierarchy[] {
    return this.repository.getHierarchyForLLT(lltCode, versionId);
  }

  // ============ Coding ============

  /**
   * Create a MedDRA coding object from a selected term
   */
  createCoding(lltCode: number, verbatimText: string, codedBy?: string): MedDRACoding | null {
    const activeVersion = this.getActiveVersion();
    if (!activeVersion) {
      throw new Error('No active MedDRA version');
    }

    const hierarchies = this.repository.getHierarchyForLLT(lltCode);
    if (hierarchies.length === 0) {
      return null;
    }

    // Use primary path
    const primary = hierarchies.find(h => h.isPrimaryPath) || hierarchies[0];

    return {
      verbatimText,
      lltCode: primary.llt.lltCode,
      lltName: primary.llt.lltName,
      ptCode: primary.pt.ptCode,
      ptName: primary.pt.ptName,
      hltCode: primary.hlt.hltCode,
      hltName: primary.hlt.hltName,
      hlgtCode: primary.hlgt.hlgtCode,
      hlgtName: primary.hlgt.hlgtName,
      socCode: primary.soc.socCode,
      socName: primary.soc.socName,
      meddraVersion: activeVersion.version,
      codedBy,
      codedAt: new Date().toISOString()
    };
  }

  /**
   * Create a MedDRA coding object from a PT code
   */
  createCodingFromPT(ptCode: number, verbatimText: string, codedBy?: string): MedDRACoding | null {
    const activeVersion = this.getActiveVersion();
    if (!activeVersion) {
      throw new Error('No active MedDRA version');
    }

    const hierarchies = this.repository.getHierarchyForPT(ptCode);
    if (hierarchies.length === 0) {
      return null;
    }

    // Use primary path
    const primary = hierarchies.find(h => h.isPrimaryPath) || hierarchies[0];

    return {
      verbatimText,
      ptCode: primary.pt.ptCode,
      ptName: primary.pt.ptName,
      hltCode: primary.hlt.hltCode,
      hltName: primary.hlt.hltName,
      hlgtCode: primary.hlgt.hlgtCode,
      hlgtName: primary.hlgt.hlgtName,
      socCode: primary.soc.socCode,
      socName: primary.soc.socName,
      meddraVersion: activeVersion.version,
      codedBy,
      codedAt: new Date().toISOString()
    };
  }
}
