/**
 * Import Repository
 * Database access layer for bulk import jobs
 */

import type { DatabaseInstance } from '../types';
import type {
  ImportJob,
  ImportJobListItem,
  ImportStatus,
  ColumnMapping,
  ImportValidationSummary,
  SavedColumnMapping
} from '../../../shared/types/import.types';

export class ImportRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // ============ Import Jobs ============

  /**
   * Create a new import job
   */
  createImportJob(filename: string, filePath: string, fileSize?: number, createdBy?: string): ImportJob {
    const now = new Date().toISOString();

    const query = `
      INSERT INTO import_jobs (
        filename, file_path, file_size, status, imported_count, error_count, warning_count, skipped_count,
        created_by, created_at
      )
      VALUES (?, ?, ?, 'uploaded', 0, 0, 0, 0, ?, ?)
    `;

    const result = this.db.prepare(query).run(
      filename,
      filePath,
      fileSize || null,
      createdBy || null,
      now
    );

    return this.getImportJobById(result.lastInsertRowid as number)!;
  }

  /**
   * Get import job by ID
   */
  getImportJobById(id: number): ImportJob | null {
    const query = `
      SELECT
        ij.id,
        ij.filename,
        ij.file_path as filePath,
        ij.file_size as fileSize,
        ij.row_count as rowCount,
        ij.column_count as columnCount,
        ij.status,
        ij.column_mapping as columnMapping,
        ij.transformation_rules as transformationRules,
        ij.validation_summary as validationSummary,
        ij.imported_count as importedCount,
        ij.error_count as errorCount,
        ij.warning_count as warningCount,
        ij.skipped_count as skippedCount,
        ij.created_by as createdBy,
        u.first_name || ' ' || u.last_name as createdByName,
        ij.started_at as startedAt,
        ij.completed_at as completedAt,
        ij.created_at as createdAt
      FROM import_jobs ij
      LEFT JOIN users u ON ij.created_by = u.id
      WHERE ij.id = ?
    `;

    const result = this.db.prepare(query).get(id) as {
      id: number;
      filename: string;
      filePath: string;
      fileSize?: number;
      rowCount?: number;
      columnCount?: number;
      status: ImportStatus;
      columnMapping?: string;
      transformationRules?: string;
      validationSummary?: string;
      importedCount: number;
      errorCount: number;
      warningCount: number;
      skippedCount: number;
      createdBy?: string;
      createdByName?: string;
      startedAt?: string;
      completedAt?: string;
      createdAt: string;
    } | undefined;

    if (!result) return null;

    return {
      ...result,
      columnMapping: result.columnMapping ? JSON.parse(result.columnMapping) : undefined,
      transformationRules: result.transformationRules ? JSON.parse(result.transformationRules) : undefined,
      validationSummary: result.validationSummary ? JSON.parse(result.validationSummary) : undefined
    };
  }

  /**
   * Get import jobs list
   */
  getImportJobs(limit = 50, offset = 0): { items: ImportJobListItem[]; total: number } {
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM import_jobs`;
    const countResult = this.db.prepare(countQuery).get() as { count: number };

    // Get items
    const query = `
      SELECT
        ij.id,
        ij.filename,
        ij.file_size as fileSize,
        ij.row_count as rowCount,
        ij.status,
        ij.imported_count as importedCount,
        ij.error_count as errorCount,
        u.first_name || ' ' || u.last_name as createdByName,
        ij.created_at as createdAt,
        ij.completed_at as completedAt
      FROM import_jobs ij
      LEFT JOIN users u ON ij.created_by = u.id
      ORDER BY ij.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const items = this.db.prepare(query).all(limit, offset) as ImportJobListItem[];

    return { items, total: countResult.count };
  }

  /**
   * Update import job status
   */
  updateImportJobStatus(id: number, status: ImportStatus, startedAt?: string, completedAt?: string): void {
    const updates: string[] = ['status = ?'];
    const params: (string | number)[] = [status];

    if (startedAt) {
      updates.push('started_at = ?');
      params.push(startedAt);
    }
    if (completedAt) {
      updates.push('completed_at = ?');
      params.push(completedAt);
    }

    params.push(id);

    const query = `UPDATE import_jobs SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...params);
  }

  /**
   * Update import job column mapping
   */
  updateImportJobMapping(id: number, columnMapping: ColumnMapping[], rowCount?: number, columnCount?: number): void {
    const query = `
      UPDATE import_jobs
      SET column_mapping = ?, row_count = ?, column_count = ?, status = 'mapping'
      WHERE id = ?
    `;

    this.db.prepare(query).run(
      JSON.stringify(columnMapping),
      rowCount || null,
      columnCount || null,
      id
    );
  }

  /**
   * Update import job validation results
   */
  updateImportJobValidation(id: number, summary: ImportValidationSummary): void {
    const query = `
      UPDATE import_jobs
      SET validation_summary = ?, status = 'validating', warning_count = ?, error_count = ?
      WHERE id = ?
    `;

    this.db.prepare(query).run(
      JSON.stringify(summary),
      summary.warningRows,
      summary.errorRows,
      id
    );
  }

  /**
   * Update import job counts
   */
  updateImportJobCounts(id: number, importedCount: number, errorCount: number, skippedCount: number): void {
    const query = `
      UPDATE import_jobs
      SET imported_count = ?, error_count = ?, skipped_count = ?
      WHERE id = ?
    `;

    this.db.prepare(query).run(importedCount, errorCount, skippedCount, id);
  }

  // ============ Saved Mappings ============

  /**
   * Save a column mapping
   */
  saveColumnMapping(name: string, description: string | undefined, mapping: ColumnMapping[], createdBy?: string): SavedColumnMapping {
    const now = new Date().toISOString();

    const query = `
      INSERT INTO saved_column_mappings (name, description, mapping, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = this.db.prepare(query).run(
      name,
      description || null,
      JSON.stringify(mapping),
      createdBy || null,
      now,
      now
    );

    return this.getSavedMappingById(result.lastInsertRowid as number)!;
  }

  /**
   * Get saved mapping by ID
   */
  getSavedMappingById(id: number): SavedColumnMapping | null {
    const query = `
      SELECT
        id, name, description,
        mapping, created_by as createdBy,
        created_at as createdAt, updated_at as updatedAt
      FROM saved_column_mappings
      WHERE id = ?
    `;

    const result = this.db.prepare(query).get(id) as {
      id: number;
      name: string;
      description?: string;
      mapping: string;
      createdBy?: string;
      createdAt: string;
      updatedAt: string;
    } | undefined;

    if (!result) return null;

    return {
      ...result,
      mapping: JSON.parse(result.mapping)
    };
  }

  /**
   * Get all saved mappings
   */
  getSavedMappings(): SavedColumnMapping[] {
    const query = `
      SELECT
        id, name, description,
        mapping, created_by as createdBy,
        created_at as createdAt, updated_at as updatedAt
      FROM saved_column_mappings
      ORDER BY name ASC
    `;

    const results = this.db.prepare(query).all() as Array<{
      id: number;
      name: string;
      description?: string;
      mapping: string;
      createdBy?: string;
      createdAt: string;
      updatedAt: string;
    }>;

    return results.map(r => ({
      ...r,
      mapping: JSON.parse(r.mapping)
    }));
  }

  /**
   * Delete a saved mapping
   */
  deleteSavedMapping(id: number): boolean {
    const query = `DELETE FROM saved_column_mappings WHERE id = ?`;
    const result = this.db.prepare(query).run(id);
    return result.changes > 0;
  }
}
