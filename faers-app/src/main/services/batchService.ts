/**
 * Batch Service
 * Phase 4: Business logic for batch submissions
 */

import type { Database as DatabaseType } from 'better-sqlite3';
import { BatchRepository } from '../database/repositories/batch.repository';
import { CaseRepository } from '../database/repositories/case.repository';
import { ValidationService } from './validationService';
import { AuditService } from './auditService';
import { ExportFilenameService } from './exportFilenameService';
import { SENDER_OID_DEFAULT, SENDER_OID_DUNS, BATCH_RECEIVERS, MESSAGE_RECEIVERS } from '../../shared/types/case.types';
import type {
  SubmissionBatch,
  BatchCase,
  BatchListItem,
  BatchType,
  BatchFilter,
  BatchValidationResult,
  BatchCaseValidationResult,
  BatchCaseEligibility
} from '../../shared/types/batch.types';
import type { ValidationResult } from '../../shared/types/case.types';

export class BatchService {
  private batchRepo: BatchRepository;
  private caseRepo: CaseRepository;
  private validationService: ValidationService;
  private auditService: AuditService;
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
    this.batchRepo = new BatchRepository(db);
    this.caseRepo = new CaseRepository(db);
    this.validationService = new ValidationService(db);
    this.auditService = new AuditService(db);
  }

  /**
   * Create a new batch
   */
  createBatch(
    batchType: BatchType,
    caseIds: string[],
    userId?: string,
    username?: string,
    sessionId?: string,
    notes?: string,
    submissionMode?: 'test' | 'production'
  ): { batch: SubmissionBatch; cases: BatchCase[] } {
    if (caseIds.length === 0) {
      throw new Error('At least one case is required to create a batch');
    }

    // Validate cases exist and are eligible
    for (const caseId of caseIds) {
      const caseData = this.caseRepo.findById(caseId);
      if (!caseData) {
        throw new Error(`Case not found: ${caseId}`);
      }

      // Check if already in an active batch
      const batchStatus = this.batchRepo.isCaseInActiveBatch(caseId);
      if (batchStatus.inBatch) {
        throw new Error(`Case ${caseId} is already in batch ${batchStatus.batchNumber}`);
      }
    }

    // Create the batch
    const batch = this.batchRepo.create(batchType, caseIds, userId, notes, submissionMode);
    const cases = this.batchRepo.getBatchCases(batch.id);

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'batch_created',
      entityType: 'batch',
      entityId: String(batch.id),
      details: {
        batchNumber: batch.batchNumber,
        batchType,
        caseCount: caseIds.length,
        caseIds
      }
    });

    return { batch, cases };
  }

  /**
   * Get batch by ID
   */
  getBatch(batchId: number): SubmissionBatch | null {
    return this.batchRepo.findById(batchId);
  }

  /**
   * Get batch by batch number
   */
  getBatchByNumber(batchNumber: string): SubmissionBatch | null {
    return this.batchRepo.findByBatchNumber(batchNumber);
  }

  /**
   * List batches
   */
  listBatches(filter?: BatchFilter, limit = 50, offset = 0): { batches: BatchListItem[]; total: number } {
    return this.batchRepo.list(filter, limit, offset);
  }

  /**
   * Get cases in a batch
   */
  getBatchCases(batchId: number): BatchCase[] {
    return this.batchRepo.getBatchCases(batchId);
  }

  /**
   * Validate all cases in a batch
   */
  validateBatch(
    batchId: number,
    userId?: string,
    username?: string,
    sessionId?: string
  ): BatchValidationResult {
    const batch = this.batchRepo.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    if (!['created', 'validated', 'validation_failed'].includes(batch.status)) {
      throw new Error(`Cannot validate batch in status: ${batch.status}`);
    }

    // Update batch status to validating
    this.batchRepo.updateStatus(batchId, 'validating');

    const cases = this.batchRepo.getBatchCases(batchId);
    const caseResults: BatchCaseValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const batchCase of cases) {
      const caseData = this.caseRepo.findById(batchCase.caseId);
      if (!caseData) {
        caseResults.push({
          caseId: batchCase.caseId,
          safetyReportId: batchCase.safetyReportId,
          isValid: false,
          errors: ['Case not found'],
          warnings: []
        });
        invalidCount++;
        this.batchRepo.updateCaseValidation(batchId, batchCase.caseId, 'invalid', ['Case not found']);
        continue;
      }

      const validationResult: ValidationResult = this.validationService.validate(batchCase.caseId);

      if (validationResult.valid) {
        validCount++;
        this.batchRepo.updateCaseValidation(batchId, batchCase.caseId, 'valid');
        caseResults.push({
          caseId: batchCase.caseId,
          safetyReportId: caseData.safetyReportId,
          isValid: true,
          errors: [],
          warnings: validationResult.errors.filter(e => e.severity === 'warning').map(e => e.message)
        });
      } else {
        invalidCount++;
        const errors = validationResult.errors.filter(e => e.severity === 'error').map(e => e.message);
        this.batchRepo.updateCaseValidation(batchId, batchCase.caseId, 'invalid', errors);
        caseResults.push({
          caseId: batchCase.caseId,
          safetyReportId: caseData.safetyReportId,
          isValid: false,
          errors,
          warnings: validationResult.errors.filter(e => e.severity === 'warning').map(e => e.message)
        });
      }
    }

    // Update batch counts and status
    this.batchRepo.updateValidationCounts(batchId);
    const isValid = invalidCount === 0;
    this.batchRepo.updateStatus(batchId, isValid ? 'validated' : 'validation_failed');

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'batch_validated',
      entityType: 'batch',
      entityId: String(batchId),
      details: {
        batchNumber: batch.batchNumber,
        totalCases: cases.length,
        validCases: validCount,
        invalidCases: invalidCount,
        isValid
      }
    });

    return {
      batchId,
      totalCases: cases.length,
      validCases: validCount,
      invalidCases: invalidCount,
      caseResults,
      isValid
    };
  }

  /**
   * Export batch to XML
   */
  exportBatch(
    batchId: number,
    exportPath: string,
    userId?: string,
    username?: string,
    sessionId?: string
  ): { filename: string; filePath: string; caseCount: number; xmlSize: number } {
    const batch = this.batchRepo.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status !== 'validated') {
      throw new Error('Batch must be validated before export');
    }

    // Update status to exporting
    this.batchRepo.updateStatus(batchId, 'exporting');

    try {
      const cases = this.batchRepo.getBatchCases(batchId);
      const validCases = cases.filter(c => c.validationStatus === 'valid');

      if (validCases.length === 0) {
        throw new Error('No valid cases to export');
      }

      // Generate batch XML
      const xml = this.generateBatchXml(batch, validCases);

      // Validate XML envelope structure before writing
      const structuralValidation = ValidationService.validateXmlStructure(xml);
      if (!structuralValidation.valid) {
        const structErrors = structuralValidation.errors
          .filter(e => e.severity === 'error')
          .map(e => e.message);
        throw new Error(`XML structural validation failed: ${structErrors.join('; ')}`);
      }

      // Generate filename
      const date = new Date();
      const timestamp = date.toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `BATCH-${batch.batchNumber}-${timestamp}.xml`;
      const filePath = `${exportPath}/${filename}`;

      // Write file using fs
      const fs = require('fs');
      fs.writeFileSync(filePath, xml, 'utf8');

      const stats = fs.statSync(filePath);
      const xmlSize = stats.size;

      // Update batch with XML info
      this.batchRepo.updateXmlInfo(batchId, filename, filePath);

      // Audit log
      this.auditService.log({
        userId,
        username,
        sessionId,
        actionType: 'batch_exported',
        entityType: 'batch',
        entityId: String(batchId),
        details: {
          batchNumber: batch.batchNumber,
          filename,
          caseCount: validCases.length,
          xmlSize
        }
      });

      return {
        filename,
        filePath,
        caseCount: validCases.length,
        xmlSize
      };
    } catch (error) {
      this.batchRepo.updateStatus(batchId, 'validation_failed');
      throw error;
    }
  }

  /**
   * Generate batch XML for multiple ICSRs using proper E2B(R3) two-level structure:
   * Level 1: MCCI_IN200100UV01 (Batch Wrapper, Section N.1) with <id> elements
   * Level 2: PORR_IN049016UV (Message Wrapper, Section N.2) per case with <receiver>/<sender>
   */
  private generateBatchXml(batch: SubmissionBatch, cases: BatchCase[]): string {
    // Import XML generator service dynamically to avoid circular dependencies
    const { XMLGeneratorService } = require('./xmlGeneratorService');
    const xmlService = new XMLGeneratorService(this.db);

    const now = new Date();
    const creationTime = this.formatDateTimeWithTz(now);

    // Resolve sender identifier from settings
    const filenameService = new ExportFilenameService(this.db);
    const idType = filenameService.getSenderIdentifierType();
    const senderOid = idType === 'duns' ? SENDER_OID_DUNS : SENDER_OID_DEFAULT;
    // N.1.3 must be the actual identifier (DUNS or FDA Sender ID), NOT the company name
    const senderExtension = idType === 'duns'
      ? (filenameService.getDunsNumber() || '')
      : (filenameService.getSenderId() || '');

    // Resolve batch receiver and message receiver
    const reportType = filenameService.getReportType();
    const targetCenter = filenameService.getTargetCenter();
    const submissionEnvironment = filenameService.getSubmissionEnvironment();
    const batchReceiver = BATCH_RECEIVERS[submissionEnvironment][reportType];
    const messageReceiver = MESSAGE_RECEIVERS[reportType][targetCenter];

    // ============================================
    // BATCH WRAPPER (Section N.1)
    // ============================================
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MCCI_IN200100UV01 xmlns="urn:hl7-org:v3"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   ITSVersion="XML_1.0">

  <!-- N.1.1 Type of Messages in Batch (id representation) -->
  <id root="2.16.840.1.113883.3.989.2.1.3.22" extension="1"/>
  <!-- N.1.2 Batch Number -->
  <id root="2.16.840.1.113883.3.989.2.1.3.1" extension="${this.escapeXml(batch.batchNumber)}"/>
  <!-- N.1.5 Date of Batch Transmission -->
  <creationTime value="${creationTime}"/>

  <responseModeCode code="D"/>
  <interactionId root="2.16.840.1.113883.1.6" extension="MCCI_IN200100UV01"/>
  <!-- N.1.1 Type of Messages in Batch (name representation - required by ACK3 validator) -->
  <name code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.1"/>
  <processingCode code="P"/>
  <processingModeCode code="T"/>
  <acceptAckCode code="AL"/>

  <!-- N.1.4 Batch Receiver Identifier -->
  <receiver typeCode="RCV">
    <device classCode="DEV" determinerCode="INSTANCE">
      <id root="2.16.840.1.113883.3.989.2.1.3.14" extension="${this.escapeXml(batchReceiver)}"/>
    </device>
  </receiver>

  <!-- N.1.3 Batch Sender Identifier -->
  <sender typeCode="SND">
    <device classCode="DEV" determinerCode="INSTANCE">
      <id root="${SENDER_OID_DEFAULT}" extension="${this.escapeXml(senderExtension)}"/>${senderOid === SENDER_OID_DUNS ? `
      <id root="${SENDER_OID_DUNS}" extension="${this.escapeXml(senderExtension)}"/>` : ''}
    </device>
  </sender>`;

    // Add each case as a separate PORR_IN049016UV message wrapper
    for (const batchCase of cases) {
      const caseMessageXml = xmlService.generateCaseMessageWrapper(
        batchCase.caseId,
        senderOid,
        senderExtension,
        messageReceiver
      );
      if (caseMessageXml) {
        xml += '\n' + caseMessageXml;
      }
    }

    xml += `
</MCCI_IN200100UV01>`;

    return xml;
  }

  /**
   * Format date time with timezone offset for E2B
   */
  private formatDateTimeWithTz(date: Date): string {
    const base = date.toISOString().replace(/[-:T]/g, '').substring(0, 14);
    const offset = date.getTimezoneOffset();
    const sign = offset <= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const minutes = String(absOffset % 60).padStart(2, '0');
    return `${base}${sign}${hours}${minutes}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Record batch submission to FDA ESG
   */
  recordSubmission(
    batchId: number,
    esgCoreId: string,
    submissionDate: string,
    userId?: string,
    username?: string,
    sessionId?: string,
    notes?: string
  ): SubmissionBatch {
    const batch = this.batchRepo.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status !== 'exported') {
      throw new Error('Batch must be exported before recording submission');
    }

    this.batchRepo.recordSubmission(batchId, esgCoreId, submissionDate);

    // Update notes if provided
    if (notes) {
      this.db.prepare(`
        UPDATE submission_batches SET notes = ? WHERE id = ?
      `).run(notes, batchId);
    }

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'batch_submitted',
      entityType: 'batch',
      entityId: String(batchId),
      details: {
        batchNumber: batch.batchNumber,
        esgCoreId,
        submissionDate
      }
    });

    return this.batchRepo.findById(batchId)!;
  }

  /**
   * Record batch acknowledgment from FDA
   */
  recordAcknowledgment(
    batchId: number,
    ackType: 'accepted' | 'rejected' | 'partial',
    acknowledgmentDate: string,
    userId?: string,
    username?: string,
    sessionId?: string,
    ackDetails?: string,
    notes?: string
  ): SubmissionBatch {
    const batch = this.batchRepo.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status !== 'submitted') {
      throw new Error('Batch must be submitted before recording acknowledgment');
    }

    this.batchRepo.recordAcknowledgment(batchId, ackType, acknowledgmentDate, ackDetails);

    // Update cases workflow status based on acknowledgment
    const cases = this.batchRepo.getBatchCases(batchId);
    for (const batchCase of cases) {
      if (ackType === 'accepted') {
        // Update case workflow status to Submitted
        this.db.prepare(`
          UPDATE cases SET workflow_status = 'Submitted', updated_at = ? WHERE id = ?
        `).run(new Date().toISOString(), batchCase.caseId);
      }
    }

    // Update notes if provided
    if (notes) {
      this.db.prepare(`
        UPDATE submission_batches SET notes = COALESCE(notes || '\n', '') || ? WHERE id = ?
      `).run(notes, batchId);
    }

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'batch_acknowledged',
      entityType: 'batch',
      entityId: String(batchId),
      details: {
        batchNumber: batch.batchNumber,
        ackType,
        acknowledgmentDate,
        ackDetails
      }
    });

    return this.batchRepo.findById(batchId)!;
  }

  /**
   * Add case to batch
   */
  addCaseToBatch(
    batchId: number,
    caseId: string,
    userId?: string,
    username?: string,
    sessionId?: string
  ): void {
    const batch = this.batchRepo.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status !== 'created') {
      throw new Error('Can only add cases to batches in created status');
    }

    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error('Case not found');
    }

    const batchStatus = this.batchRepo.isCaseInActiveBatch(caseId);
    if (batchStatus.inBatch) {
      throw new Error(`Case is already in batch ${batchStatus.batchNumber}`);
    }

    this.batchRepo.addCase(batchId, caseId);

    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'batch_case_added',
      entityType: 'batch',
      entityId: String(batchId),
      details: { caseId }
    });
  }

  /**
   * Remove case from batch
   */
  removeCaseFromBatch(
    batchId: number,
    caseId: string,
    userId?: string,
    username?: string,
    sessionId?: string
  ): void {
    const batch = this.batchRepo.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status !== 'created') {
      throw new Error('Can only remove cases from batches in created status');
    }

    this.batchRepo.removeCase(batchId, caseId);

    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'batch_case_removed',
      entityType: 'batch',
      entityId: String(batchId),
      details: { caseId }
    });
  }

  /**
   * Delete batch
   */
  deleteBatch(
    batchId: number,
    userId?: string,
    username?: string,
    sessionId?: string
  ): boolean {
    const batch = this.batchRepo.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    const deleted = this.batchRepo.delete(batchId);

    if (deleted) {
      this.auditService.log({
        userId,
        username,
        sessionId,
        actionType: 'batch_deleted',
        entityType: 'batch',
        entityId: String(batchId),
        details: { batchNumber: batch.batchNumber }
      });
    }

    return deleted;
  }

  /**
   * Get eligible cases for a batch type
   */
  getEligibleCases(batchType: BatchType): BatchCaseEligibility[] {
    const cases = this.batchRepo.getEligibleCases(batchType);

    return cases.map(c => ({
      caseId: c.caseId,
      safetyReportId: c.safetyReportId,
      patientInitials: c.patientInitials,
      reportTypeClassification: c.reportTypeClassification,
      workflowStatus: c.workflowStatus,
      isEligible: !c.alreadyInBatch,
      eligibilityReason: c.alreadyInBatch ? 'Already in a batch' : undefined,
      alreadyInBatch: c.alreadyInBatch,
      existingBatchId: c.existingBatchId
    }));
  }
}
