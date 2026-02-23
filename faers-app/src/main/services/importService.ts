/**
 * Import Service
 * Business logic for bulk import operations
 */

import * as fs from 'fs';
import * as path from 'path';
import { ImportRepository } from '../database/repositories/import.repository';
import type {
  ImportJob,
  ImportJobListItem,
  ColumnMapping,
  ImportValidationSummary,
  ImportValidationError,
  ImportUploadResponse,
  FilePreview,
  ImportExecuteOptions,
  ImportExecuteResult,
  SavedColumnMapping
} from '../../shared/types/import.types';

export class ImportService {
  private repository: ImportRepository;

  constructor(repository: ImportRepository) {
    this.repository = repository;
  }

  // ============ File Upload ============

  /**
   * Upload and parse a file for import
   */
  uploadFile(filePath: string, createdBy?: string): ImportUploadResponse {
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();

    // Validate file type
    if (!['.csv', '.xlsx', '.xls'].includes(extension)) {
      throw new Error(`Unsupported file type: ${extension}. Supported types: CSV, XLSX, XLS`);
    }

    // Parse file preview
    const preview = this.parseFilePreview(filePath, extension);

    // Create import job
    const job = this.repository.createImportJob(filename, filePath, stats.size, createdBy);

    // Update with row/column counts
    this.repository.updateImportJobMapping(
      job.id,
      [],
      preview.totalRows,
      preview.columns.length
    );

    return {
      jobId: job.id,
      filename,
      fileSize: stats.size,
      preview
    };
  }

  /**
   * Parse file preview (first 10 rows)
   */
  private parseFilePreview(filePath: string, extension: string): FilePreview {
    if (extension === '.csv') {
      return this.parseCSVPreview(filePath);
    } else {
      // For Excel files, we'd need xlsx library
      // For now, return a placeholder
      throw new Error('Excel file support not yet implemented. Please use CSV files.');
    }
  }

  /**
   * Parse CSV file preview
   */
  private parseCSVPreview(filePath: string): FilePreview {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      throw new Error('File is empty');
    }

    // Detect delimiter
    const firstLine = lines[0];
    const delimiter = this.detectDelimiter(firstLine);

    // Parse header
    const columns = this.parseCSVLine(firstLine, delimiter);

    // Parse preview rows (up to 10)
    const rows: Record<string, unknown>[] = [];
    const previewCount = Math.min(lines.length - 1, 10);

    for (let i = 1; i <= previewCount; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);
      const row: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        row[col] = values[idx] || '';
      });
      rows.push(row);
    }

    return {
      columns,
      rows,
      totalRows: lines.length - 1,
      delimiter,
      encoding: 'utf-8'
    };
  }

  /**
   * Detect CSV delimiter
   */
  private detectDelimiter(line: string): string {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let detected = ',';

    for (const d of delimiters) {
      const count = (line.match(new RegExp(d, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        detected = d;
      }
    }

    return detected;
  }

  /**
   * Parse a CSV line respecting quotes
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  // ============ Mapping ============

  /**
   * Set column mapping for an import job
   */
  setMapping(jobId: number, mapping: ColumnMapping[]): ImportJob | null {
    const job = this.repository.getImportJobById(jobId);
    if (!job) return null;

    this.repository.updateImportJobMapping(jobId, mapping, job.rowCount, job.columnCount);
    return this.repository.getImportJobById(jobId);
  }

  // ============ Validation ============

  /**
   * Validate an import job
   */
  validateImport(jobId: number): ImportValidationSummary {
    const job = this.repository.getImportJobById(jobId);
    if (!job) {
      throw new Error('Import job not found');
    }

    if (!job.columnMapping || job.columnMapping.length === 0) {
      throw new Error('Column mapping not configured');
    }

    this.repository.updateImportJobStatus(jobId, 'validating');

    // Parse full file and validate
    const errors: ImportValidationError[] = [];
    let validRows = 0;
    let warningRows = 0;
    let errorRows = 0;

    try {
      const extension = path.extname(job.filePath).toLowerCase();

      if (extension === '.csv') {
        const content = fs.readFileSync(job.filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        const delimiter = this.detectDelimiter(lines[0]);
        const columns = this.parseCSVLine(lines[0], delimiter);

        for (let i = 1; i < lines.length; i++) {
          const values = this.parseCSVLine(lines[i], delimiter);
          const rowErrors = this.validateRow(i + 1, columns, values, job.columnMapping);

          if (rowErrors.some(e => e.severity === 'error')) {
            errorRows++;
          } else if (rowErrors.some(e => e.severity === 'warning')) {
            warningRows++;
          } else {
            validRows++;
          }

          errors.push(...rowErrors);
        }
      }
    } catch (err) {
      errors.push({
        rowNumber: 0,
        errorType: 'other',
        message: err instanceof Error ? err.message : 'Unknown validation error',
        severity: 'error'
      });
      errorRows = job.rowCount || 0;
    }

    const summary: ImportValidationSummary = {
      totalRows: job.rowCount || 0,
      validRows,
      warningRows,
      errorRows,
      errors: errors.slice(0, 100) // Limit stored errors
    };

    this.repository.updateImportJobValidation(jobId, summary);

    return summary;
  }

  /**
   * Validate a single row
   */
  private validateRow(
    rowNumber: number,
    columns: string[],
    values: string[],
    mapping: ColumnMapping[]
  ): ImportValidationError[] {
    const errors: ImportValidationError[] = [];

    for (const map of mapping) {
      if (!map.caseField) continue;

      const columnIndex = columns.indexOf(map.fileColumn);
      const value = columnIndex >= 0 ? values[columnIndex] : undefined;

      // Check required fields
      if (this.isRequiredField(map.caseField) && (!value || value.trim() === '')) {
        errors.push({
          rowNumber,
          columnName: map.fileColumn,
          fieldPath: map.caseField,
          errorType: 'required',
          message: `Required field "${map.caseField}" is empty`,
          severity: 'error'
        });
      }

      // Check date format
      if (map.dateFormat && value) {
        if (!this.isValidDate(value, map.dateFormat)) {
          errors.push({
            rowNumber,
            columnName: map.fileColumn,
            fieldPath: map.caseField,
            errorType: 'format',
            message: `Invalid date format. Expected: ${map.dateFormat}`,
            value,
            severity: 'error'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Check if a field is required
   */
  private isRequiredField(fieldPath: string): boolean {
    const required = ['reaction_term', 'product_name', 'receipt_date'];
    return required.includes(fieldPath);
  }

  /**
   * Check if a value is a valid date
   */
  private isValidDate(value: string, format: string): boolean {
    // Basic date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$|^\d{2}-\d{2}-\d{4}$/;
    return dateRegex.test(value);
  }

  // ============ Execute Import ============

  /**
   * Execute the import
   */
  executeImport(jobId: number, options: ImportExecuteOptions): ImportExecuteResult {
    const job = this.repository.getImportJobById(jobId);
    if (!job) {
      return {
        success: false,
        jobId,
        importedCount: 0,
        errorCount: 0,
        skippedCount: 0,
        caseIds: [],
        errors: [{ rowNumber: 0, errorType: 'other', message: 'Import job not found', severity: 'error' }]
      };
    }

    this.repository.updateImportJobStatus(jobId, 'importing', new Date().toISOString());

    // TODO: Implement actual case creation from rows
    // This is a simplified version

    const result: ImportExecuteResult = {
      success: true,
      jobId,
      importedCount: 0,
      errorCount: 0,
      skippedCount: 0,
      caseIds: []
    };

    try {
      // For now, mark as completed
      this.repository.updateImportJobStatus(jobId, 'completed', undefined, new Date().toISOString());
      this.repository.updateImportJobCounts(jobId, result.importedCount, result.errorCount, result.skippedCount);
    } catch (err) {
      this.repository.updateImportJobStatus(jobId, 'failed');
      result.success = false;
      result.errors = [{
        rowNumber: 0,
        errorType: 'other',
        message: err instanceof Error ? err.message : 'Unknown error',
        severity: 'error'
      }];
    }

    return result;
  }

  // ============ Job Management ============

  /**
   * Get import job by ID
   */
  getImportJob(id: number): ImportJob | null {
    return this.repository.getImportJobById(id);
  }

  /**
   * Get import jobs list
   */
  getImportJobs(limit?: number, offset?: number): { items: ImportJobListItem[]; total: number } {
    return this.repository.getImportJobs(limit, offset);
  }

  /**
   * Cancel an import job
   */
  cancelImport(jobId: number): boolean {
    const job = this.repository.getImportJobById(jobId);
    if (!job) return false;

    if (['completed', 'cancelled', 'failed'].includes(job.status)) {
      return false;
    }

    this.repository.updateImportJobStatus(jobId, 'cancelled');
    return true;
  }

  /**
   * Get errors for an import job
   */
  getImportErrors(jobId: number): { rowNumber: number; errors: string[] }[] {
    const job = this.repository.getImportJobById(jobId);
    if (!job || !job.validationSummary) return [];

    const grouped: Record<number, string[]> = {};
    for (const error of job.validationSummary.errors) {
      if (!grouped[error.rowNumber]) {
        grouped[error.rowNumber] = [];
      }
      grouped[error.rowNumber].push(error.message);
    }

    return Object.entries(grouped).map(([rowNum, errors]) => ({
      rowNumber: parseInt(rowNum),
      errors
    }));
  }

  // ============ Saved Mappings ============

  /**
   * Save a column mapping
   */
  saveColumnMapping(name: string, description: string | undefined, mapping: ColumnMapping[], createdBy?: string): SavedColumnMapping {
    return this.repository.saveColumnMapping(name, description, mapping, createdBy);
  }

  /**
   * Get saved mappings
   */
  getSavedMappings(): SavedColumnMapping[] {
    return this.repository.getSavedMappings();
  }

  /**
   * Delete a saved mapping
   */
  deleteSavedMapping(id: number): boolean {
    return this.repository.deleteSavedMapping(id);
  }
}
