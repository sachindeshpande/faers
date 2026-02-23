/**
 * Duplicate Repository
 * Database access layer for duplicate detection
 */

import type { DatabaseInstance } from '../types';
import type {
  DuplicateCandidate,
  DuplicateListItem,
  DuplicateFilter,
  DuplicateStatus,
  DuplicateResolution,
  MergedCase,
  MergeFieldSelection,
  MatchingCriterion
} from '../../../shared/types/duplicate.types';

export class DuplicateRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // ============ Duplicate Candidates ============

  /**
   * Get all duplicate candidates with optional filtering
   */
  getDuplicateCandidates(filter?: DuplicateFilter, limit = 50, offset = 0): { items: DuplicateListItem[]; total: number } {
    let whereClause = '1=1';
    const params: (string | number)[] = [];

    if (filter) {
      if (filter.status) {
        whereClause += ' AND dc.status = ?';
        params.push(filter.status);
      }
      if (filter.resolution) {
        whereClause += ' AND dc.resolution = ?';
        params.push(filter.resolution);
      }
      if (filter.minScore !== undefined) {
        whereClause += ' AND dc.similarity_score >= ?';
        params.push(filter.minScore);
      }
      if (filter.maxScore !== undefined) {
        whereClause += ' AND dc.similarity_score <= ?';
        params.push(filter.maxScore);
      }
      if (filter.fromDate) {
        whereClause += ' AND dc.detected_at >= ?';
        params.push(filter.fromDate);
      }
      if (filter.toDate) {
        whereClause += ' AND dc.detected_at <= ?';
        params.push(filter.toDate);
      }
      if (filter.caseId) {
        whereClause += ' AND (dc.case_id_1 = ? OR dc.case_id_2 = ?)';
        params.push(filter.caseId, filter.caseId);
      }
      if (filter.resolvedBy) {
        whereClause += ' AND dc.resolved_by = ?';
        params.push(filter.resolvedBy);
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM duplicate_candidates dc WHERE ${whereClause}`;
    const countResult = this.db.prepare(countQuery).get(...params) as { count: number };

    // Get items with case details
    const query = `
      SELECT
        dc.id,
        dc.case_id_1 as caseId1,
        dc.case_id_2 as caseId2,
        c1.safety_report_id as case1SafetyReportId,
        c2.safety_report_id as case2SafetyReportId,
        c1.patient_initials as case1PatientInitials,
        c2.patient_initials as case2PatientInitials,
        dc.similarity_score as similarityScore,
        dc.status,
        dc.resolution,
        u.first_name || ' ' || u.last_name as resolvedByName,
        dc.detected_at as detectedAt,
        dc.resolved_at as resolvedAt
      FROM duplicate_candidates dc
      LEFT JOIN cases c1 ON dc.case_id_1 = c1.id
      LEFT JOIN cases c2 ON dc.case_id_2 = c2.id
      LEFT JOIN users u ON dc.resolved_by = u.id
      WHERE ${whereClause}
      ORDER BY dc.detected_at DESC
      LIMIT ? OFFSET ?
    `;

    const items = this.db.prepare(query).all(...params, limit, offset) as DuplicateListItem[];

    return { items, total: countResult.count };
  }

  /**
   * Get a duplicate candidate by ID with full details
   */
  getDuplicateCandidateById(id: number): DuplicateCandidate | null {
    const query = `
      SELECT
        id,
        case_id_1 as caseId1,
        case_id_2 as caseId2,
        similarity_score as similarityScore,
        matching_criteria as matchingCriteria,
        status,
        resolution,
        resolved_by as resolvedBy,
        resolution_notes as resolutionNotes,
        detected_at as detectedAt,
        resolved_at as resolvedAt
      FROM duplicate_candidates
      WHERE id = ?
    `;

    const result = this.db.prepare(query).get(id) as {
      id: number;
      caseId1: string;
      caseId2: string;
      similarityScore: number;
      matchingCriteria: string;
      status: DuplicateStatus;
      resolution?: DuplicateResolution;
      resolvedBy?: string;
      resolutionNotes?: string;
      detectedAt: string;
      resolvedAt?: string;
    } | undefined;

    if (!result) return null;

    return {
      ...result,
      matchingCriteria: JSON.parse(result.matchingCriteria || '[]')
    };
  }

  /**
   * Find existing duplicate candidate between two cases
   */
  findExistingCandidate(caseId1: string, caseId2: string): DuplicateCandidate | null {
    const query = `
      SELECT
        id,
        case_id_1 as caseId1,
        case_id_2 as caseId2,
        similarity_score as similarityScore,
        matching_criteria as matchingCriteria,
        status,
        resolution,
        resolved_by as resolvedBy,
        resolution_notes as resolutionNotes,
        detected_at as detectedAt,
        resolved_at as resolvedAt
      FROM duplicate_candidates
      WHERE (case_id_1 = ? AND case_id_2 = ?) OR (case_id_1 = ? AND case_id_2 = ?)
    `;

    const result = this.db.prepare(query).get(caseId1, caseId2, caseId2, caseId1) as {
      id: number;
      caseId1: string;
      caseId2: string;
      similarityScore: number;
      matchingCriteria: string;
      status: DuplicateStatus;
      resolution?: DuplicateResolution;
      resolvedBy?: string;
      resolutionNotes?: string;
      detectedAt: string;
      resolvedAt?: string;
    } | undefined;

    if (!result) return null;

    return {
      ...result,
      matchingCriteria: JSON.parse(result.matchingCriteria || '[]')
    };
  }

  /**
   * Create a duplicate candidate record
   */
  createDuplicateCandidate(
    caseId1: string,
    caseId2: string,
    similarityScore: number,
    matchingCriteria: MatchingCriterion[]
  ): DuplicateCandidate {
    const now = new Date().toISOString();

    const query = `
      INSERT INTO duplicate_candidates (case_id_1, case_id_2, similarity_score, matching_criteria, status, detected_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `;

    const result = this.db.prepare(query).run(
      caseId1,
      caseId2,
      similarityScore,
      JSON.stringify(matchingCriteria),
      now
    );

    return this.getDuplicateCandidateById(result.lastInsertRowid as number)!;
  }

  /**
   * Update duplicate candidate status/resolution
   */
  resolveDuplicateCandidate(
    id: number,
    status: DuplicateStatus,
    resolution?: DuplicateResolution,
    resolvedBy?: string,
    resolutionNotes?: string
  ): DuplicateCandidate | null {
    const now = new Date().toISOString();

    const query = `
      UPDATE duplicate_candidates
      SET status = ?, resolution = ?, resolved_by = ?, resolution_notes = ?, resolved_at = ?
      WHERE id = ?
    `;

    this.db.prepare(query).run(
      status,
      resolution || null,
      resolvedBy || null,
      resolutionNotes || null,
      now,
      id
    );

    return this.getDuplicateCandidateById(id);
  }

  /**
   * Get pending duplicates for a case
   */
  getPendingDuplicatesForCase(caseId: string): DuplicateCandidate[] {
    const query = `
      SELECT
        id,
        case_id_1 as caseId1,
        case_id_2 as caseId2,
        similarity_score as similarityScore,
        matching_criteria as matchingCriteria,
        status,
        detected_at as detectedAt
      FROM duplicate_candidates
      WHERE (case_id_1 = ? OR case_id_2 = ?) AND status = 'pending'
      ORDER BY similarity_score DESC
    `;

    const results = this.db.prepare(query).all(caseId, caseId) as Array<{
      id: number;
      caseId1: string;
      caseId2: string;
      similarityScore: number;
      matchingCriteria: string;
      status: DuplicateStatus;
      detectedAt: string;
    }>;

    return results.map(r => ({
      ...r,
      matchingCriteria: JSON.parse(r.matchingCriteria || '[]')
    }));
  }

  /**
   * Get duplicate statistics
   */
  getDuplicateStats(): { pending: number; dismissed: number; confirmed: number; merged: number } {
    const query = `
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) as dismissed,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'merged' THEN 1 ELSE 0 END) as merged
      FROM duplicate_candidates
    `;

    const result = this.db.prepare(query).get() as {
      pending: number;
      dismissed: number;
      confirmed: number;
      merged: number;
    };

    return {
      pending: result.pending || 0,
      dismissed: result.dismissed || 0,
      confirmed: result.confirmed || 0,
      merged: result.merged || 0
    };
  }

  // ============ Merged Cases ============

  /**
   * Record a case merge
   */
  recordMerge(
    masterCaseId: string,
    mergedCaseId: string,
    fieldSources: MergeFieldSelection[],
    mergedBy?: string
  ): MergedCase {
    const now = new Date().toISOString();

    const query = `
      INSERT INTO merged_cases (master_case_id, merged_case_id, merged_by, merged_at, field_sources)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = this.db.prepare(query).run(
      masterCaseId,
      mergedCaseId,
      mergedBy || null,
      now,
      JSON.stringify(fieldSources)
    );

    return this.getMergedCaseById(result.lastInsertRowid as number)!;
  }

  /**
   * Get merged case record by ID
   */
  getMergedCaseById(id: number): MergedCase | null {
    const query = `
      SELECT
        mc.id,
        mc.master_case_id as masterCaseId,
        mc.merged_case_id as mergedCaseId,
        mc.merged_by as mergedBy,
        u.first_name || ' ' || u.last_name as mergedByName,
        mc.merged_at as mergedAt,
        mc.field_sources as fieldSources
      FROM merged_cases mc
      LEFT JOIN users u ON mc.merged_by = u.id
      WHERE mc.id = ?
    `;

    const result = this.db.prepare(query).get(id) as {
      id: number;
      masterCaseId: string;
      mergedCaseId: string;
      mergedBy?: string;
      mergedByName?: string;
      mergedAt: string;
      fieldSources: string;
    } | undefined;

    if (!result) return null;

    return {
      ...result,
      fieldSources: JSON.parse(result.fieldSources || '[]')
    };
  }

  /**
   * Get merge history for a case
   */
  getMergeHistoryForCase(caseId: string): MergedCase[] {
    const query = `
      SELECT
        mc.id,
        mc.master_case_id as masterCaseId,
        mc.merged_case_id as mergedCaseId,
        mc.merged_by as mergedBy,
        u.first_name || ' ' || u.last_name as mergedByName,
        mc.merged_at as mergedAt,
        mc.field_sources as fieldSources
      FROM merged_cases mc
      LEFT JOIN users u ON mc.merged_by = u.id
      WHERE mc.master_case_id = ? OR mc.merged_case_id = ?
      ORDER BY mc.merged_at DESC
    `;

    const results = this.db.prepare(query).all(caseId, caseId) as Array<{
      id: number;
      masterCaseId: string;
      mergedCaseId: string;
      mergedBy?: string;
      mergedByName?: string;
      mergedAt: string;
      fieldSources: string;
    }>;

    return results.map(r => ({
      ...r,
      fieldSources: JSON.parse(r.fieldSources || '[]')
    }));
  }

  // ============ Duplicate Detection Data ============

  /**
   * Get case data needed for duplicate matching
   */
  getCaseMatchingData(caseId: string): CaseMatchingData | null {
    const caseQuery = `
      SELECT
        id,
        safety_report_id as safetyReportId,
        worldwide_case_id as worldwideCaseId,
        patient_initials as patientInitials,
        patient_birthdate as patientBirthdate,
        patient_sex as patientSex,
        patient_age as patientAge,
        receipt_date as receiptDate
      FROM cases
      WHERE id = ? AND deleted_at IS NULL
    `;

    const caseData = this.db.prepare(caseQuery).get(caseId) as CaseMatchingData | undefined;
    if (!caseData) return null;

    // Get products
    const productsQuery = `
      SELECT product_name as productName, characterization
      FROM case_drugs
      WHERE case_id = ?
      ORDER BY characterization ASC
    `;
    const products = this.db.prepare(productsQuery).all(caseId) as Array<{ productName: string; characterization: number }>;
    caseData.products = products.filter(p => p.characterization === 1).map(p => p.productName);

    // Get reactions
    const reactionsQuery = `
      SELECT reaction_term as reactionTerm, pt_code as ptCode, pt_name as ptName
      FROM case_reactions
      WHERE case_id = ?
    `;
    const reactions = this.db.prepare(reactionsQuery).all(caseId) as Array<{ reactionTerm: string; ptCode?: number; ptName?: string }>;
    caseData.reactionTerms = reactions.map(r => r.reactionTerm);
    caseData.reactionPtCodes = reactions.filter(r => r.ptCode).map(r => r.ptCode!);

    // Get primary reporter
    const reporterQuery = `
      SELECT
        given_name || ' ' || family_name as reporterName,
        organization as reporterOrg
      FROM case_reporters
      WHERE case_id = ? AND is_primary = 1
      LIMIT 1
    `;
    const reporter = this.db.prepare(reporterQuery).get(caseId) as { reporterName?: string; reporterOrg?: string } | undefined;
    if (reporter) {
      caseData.reporterName = reporter.reporterName;
      caseData.reporterOrg = reporter.reporterOrg;
    }

    return caseData;
  }

  /**
   * Get potential duplicate candidates (cases to check against)
   */
  getPotentialCandidates(excludeCaseId: string, limit = 100): CaseMatchingData[] {
    // Get cases from the last 6 months that haven't been checked already
    const query = `
      SELECT
        c.id,
        c.safety_report_id as safetyReportId,
        c.worldwide_case_id as worldwideCaseId,
        c.patient_initials as patientInitials,
        c.patient_birthdate as patientBirthdate,
        c.patient_sex as patientSex,
        c.patient_age as patientAge,
        c.receipt_date as receiptDate
      FROM cases c
      WHERE c.id != ?
        AND c.deleted_at IS NULL
        AND c.created_at >= date('now', '-6 months')
        AND NOT EXISTS (
          SELECT 1 FROM duplicate_candidates dc
          WHERE (dc.case_id_1 = c.id AND dc.case_id_2 = ?)
             OR (dc.case_id_1 = ? AND dc.case_id_2 = c.id)
        )
      ORDER BY c.created_at DESC
      LIMIT ?
    `;

    const cases = this.db.prepare(query).all(excludeCaseId, excludeCaseId, excludeCaseId, limit) as CaseMatchingData[];

    // Enrich with products and reactions
    for (const caseData of cases) {
      const productsQuery = `
        SELECT product_name as productName, characterization
        FROM case_drugs
        WHERE case_id = ?
      `;
      const products = this.db.prepare(productsQuery).all(caseData.id) as Array<{ productName: string; characterization: number }>;
      caseData.products = products.filter(p => p.characterization === 1).map(p => p.productName);

      const reactionsQuery = `
        SELECT reaction_term as reactionTerm, pt_code as ptCode
        FROM case_reactions
        WHERE case_id = ?
      `;
      const reactions = this.db.prepare(reactionsQuery).all(caseData.id) as Array<{ reactionTerm: string; ptCode?: number }>;
      caseData.reactionTerms = reactions.map(r => r.reactionTerm);
      caseData.reactionPtCodes = reactions.filter(r => r.ptCode).map(r => r.ptCode!);
    }

    return cases;
  }
}

// Type for case matching data
interface CaseMatchingData {
  id: string;
  safetyReportId?: string;
  worldwideCaseId?: string;
  patientInitials?: string;
  patientBirthdate?: string;
  patientSex?: string;
  patientAge?: number;
  receiptDate?: string;
  products?: string[];
  reactionTerms?: string[];
  reactionPtCodes?: number[];
  reporterName?: string;
  reporterOrg?: string;
}
