/**
 * Duplicate Detection Service
 * Business logic for detecting and managing duplicate cases
 */

import { DuplicateRepository } from '../database/repositories/duplicate.repository';
import {
  DEFAULT_DUPLICATE_SETTINGS,
  type DuplicateCandidate,
  type DuplicateListItem,
  type DuplicateFilter,
  type DuplicateStatus,
  type DuplicateResolution,
  type DuplicateCheckResult,
  type MergeCasesRequest,
  type MergeCasesResult,
  type MergedCase,
  type MatchingCriterion,
  type DuplicateCheckSettings
} from '../../shared/types/duplicate.types';

export class DuplicateService {
  private repository: DuplicateRepository;
  private settings: DuplicateCheckSettings;

  constructor(repository: DuplicateRepository, settings?: Partial<DuplicateCheckSettings>) {
    this.repository = repository;
    this.settings = { ...DEFAULT_DUPLICATE_SETTINGS, ...settings };
  }

  // ============ Duplicate Detection ============

  /**
   * Check a case for potential duplicates
   */
  checkForDuplicates(caseId: string, threshold?: number): DuplicateCheckResult {
    const startTime = Date.now();
    const minScore = threshold ?? this.settings.threshold;

    // Get the case's matching data
    const sourceCase = this.repository.getCaseMatchingData(caseId);
    if (!sourceCase) {
      return {
        hasDuplicates: false,
        candidates: [],
        highestScore: 0,
        totalChecked: 0,
        checkDurationMs: Date.now() - startTime
      };
    }

    // Get potential candidates
    const candidates = this.repository.getPotentialCandidates(caseId, this.settings.maxCandidates * 10);
    const matches: DuplicateCandidate[] = [];
    let highestScore = 0;

    for (const candidate of candidates) {
      const result = this.calculateSimilarity(sourceCase, candidate);

      if (result.score >= minScore) {
        // Check if already exists
        const existing = this.repository.findExistingCandidate(caseId, candidate.id);
        if (!existing) {
          // Create new candidate record
          const newCandidate = this.repository.createDuplicateCandidate(
            caseId,
            candidate.id,
            result.score,
            result.criteria
          );
          matches.push(newCandidate);
        } else if (existing.status === 'pending') {
          matches.push(existing);
        }

        if (result.score > highestScore) {
          highestScore = result.score;
        }
      }

      // Limit results
      if (matches.length >= this.settings.maxCandidates) {
        break;
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.similarityScore - a.similarityScore);

    return {
      hasDuplicates: matches.length > 0,
      candidates: matches.slice(0, this.settings.maxCandidates),
      highestScore,
      totalChecked: candidates.length,
      checkDurationMs: Date.now() - startTime
    };
  }

  /**
   * Calculate similarity score between two cases
   */
  private calculateSimilarity(
    case1: CaseMatchingData,
    case2: CaseMatchingData
  ): { score: number; criteria: MatchingCriterion[] } {
    const criteria: MatchingCriterion[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    // Patient identifier check (highest weight)
    if (case1.patientInitials || case1.patientBirthdate) {
      const initMatch = case1.patientInitials?.toLowerCase() === case2.patientInitials?.toLowerCase();
      const dobMatch = case1.patientBirthdate === case2.patientBirthdate;

      const criterion: MatchingCriterion = {
        criterion: 'patient_initials_dob',
        label: 'Patient Initials + DOB',
        weight: 25,
        matched: initMatch && dobMatch,
        value1: `${case1.patientInitials || '-'} / ${case1.patientBirthdate || '-'}`,
        value2: `${case2.patientInitials || '-'} / ${case2.patientBirthdate || '-'}`,
        similarity: initMatch && dobMatch ? 1 : (initMatch || dobMatch ? 0.5 : 0)
      };
      criteria.push(criterion);
      totalWeight += criterion.weight;
      weightedScore += criterion.weight * (criterion.similarity || 0);
    }

    // Patient sex check
    if (case1.patientSex) {
      const matched = case1.patientSex === case2.patientSex;
      const criterion: MatchingCriterion = {
        criterion: 'patient_sex',
        label: 'Patient Sex',
        weight: 5,
        matched,
        value1: case1.patientSex,
        value2: case2.patientSex,
        similarity: matched ? 1 : 0
      };
      criteria.push(criterion);
      totalWeight += criterion.weight;
      weightedScore += criterion.weight * (criterion.similarity || 0);
    }

    // Product name check
    if (case1.products && case1.products.length > 0) {
      const similarity = this.calculateArraySimilarity(
        case1.products || [],
        case2.products || [],
        'fuzzy'
      );
      const criterion: MatchingCriterion = {
        criterion: 'product_name',
        label: 'Product Name',
        weight: 20,
        matched: similarity > 0.8,
        value1: (case1.products || []).join(', '),
        value2: (case2.products || []).join(', '),
        similarity
      };
      criteria.push(criterion);
      totalWeight += criterion.weight;
      weightedScore += criterion.weight * similarity;
    }

    // Reaction term check
    if (case1.reactionTerms && case1.reactionTerms.length > 0) {
      const similarity = this.calculateArraySimilarity(
        case1.reactionTerms || [],
        case2.reactionTerms || [],
        'fuzzy'
      );
      const criterion: MatchingCriterion = {
        criterion: 'reaction_term',
        label: 'Reaction Term',
        weight: 20,
        matched: similarity > 0.8,
        value1: (case1.reactionTerms || []).join(', '),
        value2: (case2.reactionTerms || []).join(', '),
        similarity
      };
      criteria.push(criterion);
      totalWeight += criterion.weight;
      weightedScore += criterion.weight * similarity;
    }

    // Reaction PT code check (more precise)
    if (case1.reactionPtCodes && case1.reactionPtCodes.length > 0) {
      const overlap = case1.reactionPtCodes.filter(c => case2.reactionPtCodes?.includes(c));
      const similarity = case1.reactionPtCodes.length > 0
        ? overlap.length / case1.reactionPtCodes.length
        : 0;
      const criterion: MatchingCriterion = {
        criterion: 'reaction_pt_code',
        label: 'Reaction PT Code',
        weight: 15,
        matched: similarity === 1,
        value1: (case1.reactionPtCodes || []).join(', '),
        value2: (case2.reactionPtCodes || []).join(', '),
        similarity
      };
      criteria.push(criterion);
      totalWeight += criterion.weight;
      weightedScore += criterion.weight * similarity;
    }

    // Receipt date check (within tolerance)
    if (case1.receiptDate && case2.receiptDate) {
      const date1 = new Date(case1.receiptDate);
      const date2 = new Date(case2.receiptDate);
      const daysDiff = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
      const tolerance = this.settings.dateTolerance;
      const similarity = daysDiff <= tolerance ? 1 - (daysDiff / (tolerance * 2)) : 0;
      const criterion: MatchingCriterion = {
        criterion: 'receipt_date',
        label: 'Receipt Date',
        weight: 10,
        matched: daysDiff === 0,
        value1: case1.receiptDate,
        value2: case2.receiptDate,
        similarity: Math.max(0, similarity)
      };
      criteria.push(criterion);
      totalWeight += criterion.weight;
      weightedScore += criterion.weight * Math.max(0, similarity);
    }

    // Reporter check
    if (case1.reporterName) {
      const similarity = this.calculateStringSimilarity(
        case1.reporterName || '',
        case2.reporterName || ''
      );
      const criterion: MatchingCriterion = {
        criterion: 'reporter_name',
        label: 'Reporter Name',
        weight: 5,
        matched: similarity > 0.8,
        value1: case1.reporterName,
        value2: case2.reporterName,
        similarity
      };
      criteria.push(criterion);
      totalWeight += criterion.weight;
      weightedScore += criterion.weight * similarity;
    }

    // Calculate final score
    const finalScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

    return { score: finalScore, criteria };
  }

  /**
   * Calculate similarity between two arrays of strings
   */
  private calculateArraySimilarity(arr1: string[], arr2: string[], matchType: 'exact' | 'fuzzy'): number {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;

    let matches = 0;
    for (const item1 of arr1) {
      for (const item2 of arr2) {
        const similarity = matchType === 'exact'
          ? (item1.toLowerCase() === item2.toLowerCase() ? 1 : 0)
          : this.calculateStringSimilarity(item1, item2);

        if (similarity > 0.8) {
          matches++;
          break;
        }
      }
    }

    return matches / arr1.length;
  }

  /**
   * Calculate Levenshtein-based similarity between two strings
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Simple Levenshtein distance
    const matrix: number[][] = [];

    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - (distance / maxLength);
  }

  // ============ Duplicate Management ============

  /**
   * Get duplicate candidates with filtering
   */
  getDuplicateCandidates(filter?: DuplicateFilter, limit = 50, offset = 0): { items: DuplicateListItem[]; total: number } {
    return this.repository.getDuplicateCandidates(filter, limit, offset);
  }

  /**
   * Get a duplicate candidate by ID
   */
  getDuplicateCandidate(id: number): DuplicateCandidate | null {
    return this.repository.getDuplicateCandidateById(id);
  }

  /**
   * Resolve a duplicate candidate
   */
  resolveDuplicate(
    id: number,
    resolution: DuplicateResolution,
    resolvedBy?: string,
    notes?: string
  ): DuplicateCandidate | null {
    const status: DuplicateStatus = resolution === 'not_duplicate' ? 'dismissed'
      : resolution === 'merged' ? 'merged'
      : 'confirmed';

    return this.repository.resolveDuplicateCandidate(id, status, resolution, resolvedBy, notes);
  }

  /**
   * Get pending duplicates for a case
   */
  getPendingDuplicatesForCase(caseId: string): DuplicateCandidate[] {
    return this.repository.getPendingDuplicatesForCase(caseId);
  }

  /**
   * Get duplicate statistics
   */
  getDuplicateStats(): { pending: number; dismissed: number; confirmed: number; merged: number } {
    return this.repository.getDuplicateStats();
  }

  // ============ Case Merging ============

  /**
   * Merge two cases
   * Note: This is a complex operation that would need to be implemented
   * based on specific business requirements
   */
  mergeCases(request: MergeCasesRequest): MergeCasesResult {
    // Record the merge
    const mergedCase = this.repository.recordMerge(
      request.masterCaseId,
      request.sourceCaseId,
      request.fieldSelections,
      // mergedBy would come from request
    );

    // Find and update the duplicate candidate
    const candidate = this.repository.findExistingCandidate(
      request.masterCaseId,
      request.sourceCaseId
    );

    if (candidate) {
      this.repository.resolveDuplicateCandidate(
        candidate.id,
        'merged',
        'merged',
        undefined,
        request.notes
      );
    }

    return {
      success: true,
      mergedCaseId: request.masterCaseId,
      fieldsFromMaster: request.fieldSelections.filter(f => f.sourceCase === 'case1').length,
      fieldsFromSource: request.fieldSelections.filter(f => f.sourceCase === 'case2').length
    };
  }

  /**
   * Get merge history for a case
   */
  getMergeHistory(caseId: string): MergedCase[] {
    return this.repository.getMergeHistoryForCase(caseId);
  }

  // ============ Settings ============

  /**
   * Update settings
   */
  updateSettings(settings: Partial<DuplicateCheckSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current settings
   */
  getSettings(): DuplicateCheckSettings {
    return { ...this.settings };
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
