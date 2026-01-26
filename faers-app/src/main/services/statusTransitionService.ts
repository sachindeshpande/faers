/**
 * Status Transition Service - Manages case status transitions (Phase 2)
 *
 * Validates status transitions and logs history events.
 */

import type { DatabaseInstance } from '../database/types';
import { CaseRepository, SubmissionRepository } from '../database/repositories';
import { ValidationService } from './validationService';
import type {
  Case,
  CaseStatus,
  SubmissionEventType,
  ValidationResult
} from '../../shared/types/case.types';

export interface TransitionResult {
  success: boolean;
  case?: Case;
  validationResult?: ValidationResult;
  error?: string;
}

export interface TransitionOptions {
  notes?: string;
  details?: Record<string, unknown>;
  skipValidation?: boolean;
}

export class StatusTransitionService {
  private caseRepo: CaseRepository;
  private submissionRepo: SubmissionRepository;
  private validationService: ValidationService;

  constructor(db: DatabaseInstance) {
    this.caseRepo = new CaseRepository(db);
    this.submissionRepo = new SubmissionRepository(db);
    this.validationService = new ValidationService(db);
  }

  // Valid status transitions
  private readonly validTransitions: Record<CaseStatus, CaseStatus[]> = {
    Draft: ['Ready for Export'],
    'Ready for Export': ['Exported', 'Draft'],
    Exported: ['Submitted', 'Draft'],
    Submitted: ['Acknowledged', 'Rejected'],
    Acknowledged: [], // Terminal state
    Rejected: ['Draft']
  };

  /**
   * Check if a transition is valid
   */
  isValidTransition(fromStatus: CaseStatus, toStatus: CaseStatus): boolean {
    return this.validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * Get allowed transitions from a given status
   */
  getAllowedTransitions(status: CaseStatus): CaseStatus[] {
    return this.validTransitions[status] || [];
  }

  /**
   * Validate and perform status transition
   */
  transition(
    caseId: string,
    toStatus: CaseStatus,
    options?: TransitionOptions
  ): TransitionResult {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      return { success: false, error: `Case not found: ${caseId}` };
    }

    const fromStatus = caseData.status;

    // Check if transition is valid
    if (!this.isValidTransition(fromStatus, toStatus)) {
      return {
        success: false,
        error: `Invalid transition from '${fromStatus}' to '${toStatus}'`
      };
    }

    // Validate if transitioning to Ready for Export
    if (toStatus === 'Ready for Export' && !options?.skipValidation) {
      const validation = this.validationService.validate(caseId);
      if (!validation.valid) {
        return {
          success: false,
          validationResult: validation,
          error: 'Validation failed. Fix errors before marking ready for export.'
        };
      }
    }

    // Update status
    const updatedCase = this.caseRepo.update(caseId, { status: toStatus });

    // Log history event
    const eventType = this.getEventType(fromStatus, toStatus);
    this.submissionRepo.addHistoryEntry({
      caseId,
      eventType,
      details: options?.details ? JSON.stringify(options.details) : undefined,
      notes: options?.notes
    });

    return { success: true, case: updatedCase! };
  }

  /**
   * Map status transition to event type
   */
  private getEventType(
    _fromStatus: CaseStatus,
    toStatus: CaseStatus
  ): SubmissionEventType {
    if (toStatus === 'Draft') {
      return 'returned_to_draft';
    }

    const mapping: Record<CaseStatus, SubmissionEventType> = {
      Draft: 'created',
      'Ready for Export': 'marked_ready',
      Exported: 'exported',
      Submitted: 'submitted',
      Acknowledged: 'acknowledged',
      Rejected: 'rejected'
    };

    return mapping[toStatus];
  }

  /**
   * Mark case as ready for export (with validation)
   */
  markReady(caseId: string): TransitionResult {
    const validation = this.validationService.validate(caseId);

    if (!validation.valid) {
      return {
        success: false,
        validationResult: validation,
        error: 'Case has validation errors'
      };
    }

    return this.transition(caseId, 'Ready for Export');
  }

  /**
   * Mark case as exported
   */
  markExported(
    caseId: string,
    exportDetails: {
      filename: string;
      filePath: string;
      submissionEnvironment?: string;
      submissionReportType?: string;
    }
  ): TransitionResult {
    return this.transition(caseId, 'Exported', {
      details: {
        filename: exportDetails.filename,
        filePath: exportDetails.filePath,
        submissionEnvironment: exportDetails.submissionEnvironment,
        submissionReportType: exportDetails.submissionReportType
      }
    });
  }

  /**
   * Mark case as submitted to FDA ESG NextGen USP
   */
  markSubmitted(
    caseId: string,
    submissionDetails: {
      srpConfirmationNumber: string;
      submissionDate: string;
      notes?: string;
    }
  ): TransitionResult {
    return this.transition(caseId, 'Submitted', {
      details: {
        srpConfirmationNumber: submissionDetails.srpConfirmationNumber,
        submissionDate: submissionDetails.submissionDate
      },
      notes: submissionDetails.notes
    });
  }

  /**
   * Mark case as acknowledged by FDA
   */
  markAcknowledged(
    caseId: string,
    ackDetails: {
      fdaCaseNumber: string;
      acknowledgmentDate: string;
      notes?: string;
    }
  ): TransitionResult {
    return this.transition(caseId, 'Acknowledged', {
      details: {
        fdaCaseNumber: ackDetails.fdaCaseNumber,
        acknowledgmentDate: ackDetails.acknowledgmentDate
      },
      notes: ackDetails.notes
    });
  }

  /**
   * Mark case as rejected by FDA
   */
  markRejected(
    caseId: string,
    rejectDetails: {
      rejectionReason: string;
      acknowledgmentDate: string;
      notes?: string;
    }
  ): TransitionResult {
    return this.transition(caseId, 'Rejected', {
      details: {
        rejectionReason: rejectDetails.rejectionReason,
        acknowledgmentDate: rejectDetails.acknowledgmentDate
      },
      notes: rejectDetails.notes
    });
  }

  /**
   * Revert case to draft status
   */
  revertToDraft(caseId: string, reason?: string): TransitionResult {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      return { success: false, error: `Case not found: ${caseId}` };
    }

    // Check if revert is allowed
    const allowedForRevert: CaseStatus[] = [
      'Ready for Export',
      'Exported',
      'Rejected'
    ];
    if (!allowedForRevert.includes(caseData.status)) {
      return {
        success: false,
        error: `Cannot revert from '${caseData.status}' to Draft`
      };
    }

    return this.transition(caseId, 'Draft', {
      notes: reason,
      details: { previousStatus: caseData.status }
    });
  }

  /**
   * Check if case can be exported (warnings OK, errors block)
   */
  canExport(caseId: string): {
    canExport: boolean;
    hasWarnings: boolean;
    validation: ValidationResult;
  } {
    const validation = this.validationService.validate(caseId);
    const hasErrors = validation.errors.some((e) => e.severity === 'error');
    const hasWarnings = validation.errors.some((e) => e.severity === 'warning');

    return {
      canExport: !hasErrors,
      hasWarnings,
      validation
    };
  }
}
