/**
 * Follow-up Service
 * Handles business logic for follow-up and nullification reports
 * Phase 4: Follow-Up Reports and Nullification Reports
 */

import type { Database } from 'better-sqlite3';
import { CaseRepository } from '../database/repositories/case.repository';
import { AuditService } from './auditService';
import type {
  FollowupType,
  CaseVersion,
  CaseVersionChain,
  CreateFollowupRequest,
  CreateFollowupResponse,
  CreateNullificationRequest,
  CreateNullificationResponse,
  VersionComparison,
  VersionFieldChange,
  FollowupDueDate
} from '../../shared/types/followup.types';
import type { Case } from '../../shared/types/case.types';

// Fields to compare between versions
const COMPARABLE_FIELDS: Array<{ field: keyof Case; label: string; section: string }> = [
  { field: 'patientInitials', label: 'Patient Initials', section: 'Patient' },
  { field: 'patientBirthdate', label: 'Patient Birth Date', section: 'Patient' },
  { field: 'patientAge', label: 'Patient Age', section: 'Patient' },
  { field: 'patientSex', label: 'Patient Sex', section: 'Patient' },
  { field: 'patientWeight', label: 'Patient Weight', section: 'Patient' },
  { field: 'patientHeight', label: 'Patient Height', section: 'Patient' },
  { field: 'patientDeath', label: 'Death', section: 'Patient' },
  { field: 'deathDate', label: 'Death Date', section: 'Patient' },
  { field: 'caseNarrative', label: 'Case Narrative', section: 'Narrative' },
  { field: 'reporterComments', label: 'Reporter Comments', section: 'Narrative' },
  { field: 'senderComments', label: 'Sender Comments', section: 'Narrative' },
  { field: 'senderDiagnosis', label: 'Sender Diagnosis', section: 'Narrative' },
  { field: 'receiptDate', label: 'Receipt Date', section: 'Report Info' },
  { field: 'receiveDate', label: 'Receive Date', section: 'Report Info' },
  { field: 'isSerious', label: 'Serious', section: 'Classification' },
  { field: 'expectedness', label: 'Expectedness', section: 'Classification' },
  { field: 'reportTypeClassification', label: 'Report Type', section: 'Classification' }
];

export class FollowupService {
  private caseRepo: CaseRepository;
  private auditService: AuditService;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.caseRepo = new CaseRepository(db);
    this.auditService = new AuditService(db);
  }

  /**
   * Create a follow-up report from an existing case
   */
  createFollowup(
    request: CreateFollowupRequest,
    userId?: string,
    username?: string,
    sessionId?: string
  ): CreateFollowupResponse {
    const { parentCaseId, followupType, followupInfoDate } = request;

    // Get the parent case
    const parentCase = this.caseRepo.findById(parentCaseId);
    if (!parentCase) {
      throw new Error('Parent case not found');
    }

    // Calculate next version number
    const nextVersion = this.getNextVersionNumber(parentCaseId);

    // Create a new case as a copy of the parent
    const newCase = this.caseRepo.duplicate(parentCaseId);
    if (!newCase) {
      throw new Error('Failed to create follow-up case');
    }

    // Update with follow-up specific fields
    this.caseRepo.update(newCase.id, {
      parentCaseId,
      caseVersion: nextVersion,
      followupType,
      followupInfoDate,
      reportTypeClassification: 'followup',
      status: 'Draft',
      workflowStatus: 'Draft',
      // Reset submission tracking
      submissionId: undefined,
      lastSubmittedAt: undefined,
      srpConfirmationNumber: undefined,
      fdaCaseNumber: undefined,
      acknowledgmentDate: undefined,
      exportedAt: undefined,
      exportedXmlPath: undefined
    } as any);

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'followup_created',
      entityType: 'case',
      entityId: newCase.id,
      details: {
        parentCaseId,
        version: nextVersion,
        followupType,
        followupInfoDate
      }
    });

    return {
      caseId: newCase.id,
      version: nextVersion,
      followupType,
      parentCaseId
    };
  }

  /**
   * Create a nullification report for an existing case
   */
  createNullification(
    request: CreateNullificationRequest,
    userId?: string,
    username?: string,
    sessionId?: string
  ): CreateNullificationResponse {
    const { originalCaseId, nullificationReason, nullificationReference, notes } = request;

    // Get the original case
    const originalCase = this.caseRepo.findById(originalCaseId);
    if (!originalCase) {
      throw new Error('Original case not found');
    }

    // Check if already nullified
    if ((originalCase as any).isNullified) {
      throw new Error('Case has already been nullified');
    }

    // Create a new case as nullification report
    const nullificationCase = this.caseRepo.duplicate(originalCaseId);
    if (!nullificationCase) {
      throw new Error('Failed to create nullification case');
    }

    const nextVersion = this.getNextVersionNumber(originalCaseId);

    // Update nullification case
    this.caseRepo.update(nullificationCase.id, {
      parentCaseId: originalCaseId,
      caseVersion: nextVersion,
      reportTypeClassification: 'nullification',
      isNullified: true,
      nullificationReasonCode: nullificationReason,
      nullificationReference,
      status: 'Draft',
      workflowStatus: 'Draft'
    } as any);

    // Mark original case as nullified
    this.caseRepo.update(originalCaseId, {
      isNullified: true,
      nullificationReasonCode: nullificationReason,
      nullificationReference
    } as any);

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'nullification_created',
      entityType: 'case',
      entityId: nullificationCase.id,
      details: {
        originalCaseId,
        nullificationReason,
        nullificationReference,
        notes
      }
    });

    return {
      caseId: nullificationCase.id,
      originalCaseId,
      nullificationReason
    };
  }

  /**
   * Get the version chain for a case (all related versions)
   */
  getVersionChain(caseId: string): CaseVersionChain {
    // Find the root case (original, no parent)
    let currentId = caseId;
    let rootCase = this.caseRepo.findById(currentId);

    while (rootCase && (rootCase as any).parentCaseId) {
      currentId = (rootCase as any).parentCaseId;
      rootCase = this.caseRepo.findById(currentId);
    }

    if (!rootCase) {
      throw new Error('Case not found');
    }

    const originalCaseId = rootCase.id;

    // Get all versions in the chain
    const versions = this.getVersionsForCase(originalCaseId);

    // Check if chain is nullified
    const nullifiedVersion = versions.find((v) => v.isNullified);

    return {
      originalCaseId,
      versions,
      totalVersions: versions.length,
      isNullified: !!nullifiedVersion,
      nullifiedAt: nullifiedVersion?.createdAt,
      nullifiedBy: nullifiedVersion?.createdBy,
      nullificationReason: nullifiedVersion?.nullificationReason
    };
  }

  /**
   * Get all versions for a case chain
   */
  private getVersionsForCase(originalCaseId: string): CaseVersion[] {
    const versions: CaseVersion[] = [];

    // Add the original case
    const originalCase = this.caseRepo.findById(originalCaseId);
    if (originalCase) {
      versions.push(this.caseToVersion(originalCase));
    }

    // Find all child cases
    const stmt = this.db.prepare(`
      SELECT id FROM cases
      WHERE parent_case_id = ? OR id IN (
        SELECT id FROM cases WHERE parent_case_id IN (
          SELECT id FROM cases WHERE parent_case_id = ?
        )
      )
      ORDER BY case_version ASC
    `);

    const children = stmt.all(originalCaseId, originalCaseId) as Array<{ id: string }>;

    for (const child of children) {
      const childCase = this.caseRepo.findById(child.id);
      if (childCase) {
        versions.push(this.caseToVersion(childCase));
      }
    }

    // Sort by version
    versions.sort((a, b) => a.version - b.version);

    return versions;
  }

  /**
   * Convert a case to a version record
   */
  private caseToVersion(caseData: Case): CaseVersion {
    return {
      caseId: caseData.id,
      version: (caseData as any).caseVersion || 1,
      parentCaseId: (caseData as any).parentCaseId,
      followupType: (caseData as any).followupType,
      followupInfoDate: (caseData as any).followupInfoDate,
      status: caseData.status,
      workflowStatus: (caseData as any).workflowStatus,
      isNullified: (caseData as any).isNullified,
      nullificationReason: (caseData as any).nullificationReasonCode,
      createdAt: caseData.createdAt,
      createdBy: (caseData as any).createdBy
    };
  }

  /**
   * Compare two versions of a case
   */
  compareVersions(fromCaseId: string, toCaseId: string): VersionComparison {
    const fromCase = this.caseRepo.findById(fromCaseId);
    const toCase = this.caseRepo.findById(toCaseId);

    if (!fromCase || !toCase) {
      throw new Error('One or both cases not found');
    }

    const changes: VersionFieldChange[] = [];

    for (const { field, label, section } of COMPARABLE_FIELDS) {
      const oldValue = fromCase[field];
      const newValue = toCase[field];

      if (oldValue !== newValue) {
        changes.push({
          field,
          label,
          oldValue,
          newValue,
          section
        });
      }
    }

    return {
      fromVersion: (fromCase as any).caseVersion || 1,
      toVersion: (toCase as any).caseVersion || 1,
      fromCaseId,
      toCaseId,
      changes,
      totalChanges: changes.length
    };
  }

  /**
   * Get the next version number for a case chain
   */
  private getNextVersionNumber(parentCaseId: string): number {
    const stmt = this.db.prepare(`
      SELECT MAX(case_version) as max_version
      FROM cases
      WHERE id = ? OR parent_case_id = ?
    `);

    const result = stmt.get(parentCaseId, parentCaseId) as { max_version: number | null };
    return (result.max_version || 1) + 1;
  }

  /**
   * Calculate due date for a follow-up case
   */
  getFollowupDueDate(caseId: string): FollowupDueDate | null {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      return null;
    }

    const followupType = (caseData as any).followupType as FollowupType;
    const isExpedited = (caseData as any).reportTypeClassification === 'expedited' ||
      ((caseData as any).isSerious && (caseData as any).expectedness === 'unexpected');

    // Calculate due date based on info received date
    const infoDate = (caseData as any).followupInfoDate;
    if (!infoDate) {
      return null;
    }

    const infoDateObj = new Date(infoDate);
    const daysToAdd = isExpedited ? 15 : 30; // 15 days for expedited, 30 for non-expedited
    const dueDate = new Date(infoDateObj);
    dueDate.setDate(dueDate.getDate() + daysToAdd);

    const now = new Date();
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      caseId,
      followupType,
      isExpedited,
      dueDate: dueDate.toISOString(),
      daysRemaining,
      isOverdue: daysRemaining < 0
    };
  }

  /**
   * Check if a case can have a follow-up created
   */
  canCreateFollowup(caseId: string): { allowed: boolean; reason?: string } {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      return { allowed: false, reason: 'Case not found' };
    }

    // Cannot create follow-up for nullified cases
    if ((caseData as any).isNullified) {
      return { allowed: false, reason: 'Cannot create follow-up for nullified cases' };
    }

    // Case should be submitted first
    if (caseData.status !== 'Submitted' && caseData.status !== 'Acknowledged') {
      return { allowed: false, reason: 'Case must be submitted before creating a follow-up' };
    }

    return { allowed: true };
  }

  /**
   * Check if a case can be nullified
   */
  canNullify(caseId: string): { allowed: boolean; reason?: string } {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      return { allowed: false, reason: 'Case not found' };
    }

    // Cannot nullify already nullified cases
    if ((caseData as any).isNullified) {
      return { allowed: false, reason: 'Case is already nullified' };
    }

    // Case should be submitted
    if (caseData.status !== 'Submitted' && caseData.status !== 'Acknowledged') {
      return { allowed: false, reason: 'Case must be submitted before nullification' };
    }

    return { allowed: true };
  }
}
