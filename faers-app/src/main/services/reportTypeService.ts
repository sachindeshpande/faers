/**
 * Report Type Service
 * Handles report type classification logic (Expedited vs Non-Expedited)
 * Phase 4: Non-Expedited Reports, Follow-Ups & Periodic Safety Reports
 */

import type { Database } from 'better-sqlite3';
import { SeriousnessRepository, type SeriousnessCriterion, type CaseSeriousness } from '../database/repositories/seriousness.repository';
import { CaseRepository } from '../database/repositories/case.repository';
import { AuditService } from './auditService';

// Report type classification
export type ReportTypeClassification = 'expedited' | 'non_expedited' | 'followup' | 'nullification';

// Expedited criteria (15-day, periodic, etc.)
export type ExpeditedCriteria = '15_day' | 'periodic' | 'remedial' | 'malfunction';

// Expectedness determination
export type Expectedness = 'expected' | 'unexpected' | 'unknown';

// Classification suggestion from the system
export interface ClassificationSuggestion {
  reportType: ReportTypeClassification;
  isSerious: boolean;
  expectedness: Expectedness;
  expeditedCriteria?: ExpeditedCriteria;
  rationale: string;
  checkedCriteria: SeriousnessCriterion[];
  canOverride: boolean;
}

// Classification update request
export interface ClassificationUpdate {
  reportTypeClassification: ReportTypeClassification;
  expeditedCriteria?: ExpeditedCriteria;
  isSerious: boolean;
  expectedness: Expectedness;
  expectednessJustification?: string;
}

// Full classification response
export interface CaseClassification {
  caseId: string;
  reportTypeClassification?: ReportTypeClassification;
  expeditedCriteria?: ExpeditedCriteria;
  isSerious: boolean;
  expectedness?: Expectedness;
  expectednessJustification?: string;
  seriousnessCriteria: CaseSeriousness[];
}

// Labels for seriousness criteria (FDA terms)
export const SERIOUSNESS_LABELS: Record<SeriousnessCriterion, string> = {
  death: 'Results in death',
  life_threatening: 'Life-threatening',
  hospitalization: 'Requires or prolongs hospitalization',
  disability: 'Results in persistent or significant disability/incapacity',
  congenital_anomaly: 'Congenital anomaly/birth defect',
  other_medically_important: 'Other medically important condition'
};

// All seriousness criteria in order
export const ALL_SERIOUSNESS_CRITERIA: SeriousnessCriterion[] = [
  'death',
  'life_threatening',
  'hospitalization',
  'disability',
  'congenital_anomaly',
  'other_medically_important'
];

export class ReportTypeService {
  private seriousnessRepo: SeriousnessRepository;
  private caseRepo: CaseRepository;
  private auditService: AuditService;

  constructor(db: Database) {
    this.seriousnessRepo = new SeriousnessRepository(db);
    this.caseRepo = new CaseRepository(db);
    this.auditService = new AuditService(db);
  }

  /**
   * Get the current classification for a case
   */
  getClassification(caseId: string): CaseClassification | null {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      return null;
    }

    const seriousnessCriteria = this.seriousnessRepo.findByCaseId(caseId);

    return {
      caseId,
      reportTypeClassification: (caseData as any).reportTypeClassification,
      expeditedCriteria: (caseData as any).expeditedCriteria,
      isSerious: (caseData as any).isSerious === 1 || (caseData as any).isSerious === true,
      expectedness: (caseData as any).expectedness,
      expectednessJustification: (caseData as any).expectednessJustification,
      seriousnessCriteria
    };
  }

  /**
   * Get seriousness criteria for a case
   */
  getSeriousness(caseId: string): CaseSeriousness[] {
    return this.seriousnessRepo.findByCaseId(caseId);
  }

  /**
   * Set a single seriousness criterion
   */
  setSeriousnessCriterion(
    caseId: string,
    criterion: SeriousnessCriterion,
    isChecked: boolean,
    notes?: string,
    userId?: string,
    username?: string,
    sessionId?: string
  ): CaseSeriousness {
    const result = this.seriousnessRepo.upsert(caseId, criterion, isChecked, notes);

    // Update isSerious flag on the case
    const isSerious = this.seriousnessRepo.isSerious(caseId);
    this.updateCaseSerious(caseId, isSerious);

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'seriousness_updated',
      entityType: 'case',
      entityId: caseId,
      details: { criterion, isChecked, notes, isSerious }
    });

    return result;
  }

  /**
   * Set all seriousness criteria for a case
   */
  setAllSeriousness(
    caseId: string,
    criteria: Array<{ criterion: SeriousnessCriterion; isChecked: boolean; notes?: string }>,
    userId?: string,
    username?: string,
    sessionId?: string
  ): CaseSeriousness[] {
    const results = this.seriousnessRepo.setAll(caseId, criteria);

    // Update isSerious flag on the case
    const isSerious = this.seriousnessRepo.isSerious(caseId);
    this.updateCaseSerious(caseId, isSerious);

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'seriousness_updated',
      entityType: 'case',
      entityId: caseId,
      details: { criteria, isSerious }
    });

    return results;
  }

  /**
   * Generate a classification suggestion based on current data
   */
  suggest(caseId: string): ClassificationSuggestion {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error('Case not found');
    }

    const checkedCriteria = this.seriousnessRepo.getCheckedCriteria(caseId);
    const isSerious = checkedCriteria.length > 0;
    const expectedness: Expectedness = (caseData as any).expectedness || 'unknown';

    // Determine report type based on seriousness and expectedness
    let reportType: ReportTypeClassification;
    let expeditedCriteria: ExpeditedCriteria | undefined;
    let rationale: string;

    if (isSerious && expectedness === 'unexpected') {
      // Serious + Unexpected = Expedited (15-day rule)
      reportType = 'expedited';
      expeditedCriteria = '15_day';
      rationale = 'Serious adverse event that is unexpected requires expedited reporting within 15 calendar days.';
    } else if (isSerious && expectedness === 'expected') {
      // Serious + Expected = Non-expedited (periodic reporting)
      reportType = 'non_expedited';
      rationale = 'Serious but expected adverse event is eligible for periodic safety reporting (PSR).';
    } else if (!isSerious) {
      // Non-serious = Non-expedited
      reportType = 'non_expedited';
      rationale = 'Non-serious adverse event is eligible for periodic safety reporting (PSR).';
    } else {
      // Unknown expectedness with serious = needs determination
      reportType = 'expedited'; // Default to expedited until expectedness determined
      expeditedCriteria = '15_day';
      rationale = 'Serious adverse event with undetermined expectedness - treating as expedited until expectedness is assessed.';
    }

    // Check if this is a follow-up case
    if ((caseData as any).parentCaseId) {
      reportType = 'followup';
      rationale = 'This is a follow-up report to a previously submitted case.';
    }

    // Check if this is a nullification
    if ((caseData as any).isNullified) {
      reportType = 'nullification';
      rationale = 'This is a nullification report to void a previously submitted case.';
    }

    return {
      reportType,
      isSerious,
      expectedness,
      expeditedCriteria,
      rationale,
      checkedCriteria,
      canOverride: true
    };
  }

  /**
   * Apply classification to a case
   */
  classify(
    caseId: string,
    classification: ClassificationUpdate,
    userId?: string,
    username?: string,
    sessionId?: string
  ): CaseClassification {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error('Case not found');
    }

    // Update classification fields on the case
    this.caseRepo.update(caseId, {
      reportTypeClassification: classification.reportTypeClassification,
      expeditedCriteria: classification.expeditedCriteria,
      isSerious: classification.isSerious,
      expectedness: classification.expectedness,
      expectednessJustification: classification.expectednessJustification
    } as any);

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'report_type_classified',
      entityType: 'case',
      entityId: caseId,
      details: { ...classification }
    });

    // Return updated classification
    return this.getClassification(caseId)!;
  }

  /**
   * Set expectedness for a case
   */
  setExpectedness(
    caseId: string,
    expectedness: Expectedness,
    justification?: string,
    userId?: string,
    username?: string,
    sessionId?: string
  ): void {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error('Case not found');
    }

    this.caseRepo.update(caseId, {
      expectedness,
      expectednessJustification: justification
    } as any);

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'expectedness_updated',
      entityType: 'case',
      entityId: caseId,
      details: { expectedness, justification }
    });
  }

  /**
   * Helper to update isSerious flag on case
   */
  private updateCaseSerious(caseId: string, isSerious: boolean): void {
    this.caseRepo.update(caseId, { isSerious } as any);
  }

  /**
   * Check if a case qualifies for expedited reporting
   */
  isExpedited(caseId: string): boolean {
    const classification = this.getClassification(caseId);
    if (!classification) {
      return false;
    }

    // Expedited if:
    // 1. Explicitly classified as expedited, OR
    // 2. Serious + Unexpected
    if (classification.reportTypeClassification === 'expedited') {
      return true;
    }

    return classification.isSerious && classification.expectedness === 'unexpected';
  }

  /**
   * Get due date based on report type
   * - Expedited: 15 calendar days from awareness date
   * - Non-expedited: Next PSR due date (handled elsewhere)
   */
  getDueDate(caseId: string, awarenessDate: Date = new Date()): Date | null {
    if (this.isExpedited(caseId)) {
      const dueDate = new Date(awarenessDate);
      dueDate.setDate(dueDate.getDate() + 15);
      return dueDate;
    }

    // Non-expedited cases are tied to PSR schedule - return null here
    return null;
  }
}
