/**
 * Export Filename Service - Generates FDA-compliant filenames (Phase 2)
 *
 * Filename format: {SenderID}_{YYYYMMDD}_{SequenceNumber}.xml
 */

import type { DatabaseInstance } from '../database/types';
import { SubmissionRepository } from '../database/repositories/submission.repository';

export interface GeneratedFilename {
  filename: string;
  sequenceNumber: number;
  date: string;
  isTestMode: boolean;
}

export interface FilenameOptions {
  senderId?: string;
  isTestMode?: boolean;
}

export class ExportFilenameService {
  private submissionRepo: SubmissionRepository;
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
    this.submissionRepo = new SubmissionRepository(db);
  }

  /**
   * Generate FDA-compliant filename
   *
   * Format: {Identifier}_{YYYYMMDD}_{SequenceNumber}.xml
   * Test mode: {Identifier}_{YYYYMMDD}_{SequenceNumber}_TEST.xml
   * Identifier is either Sender ID or DUNS number based on settings
   * Example: COMPANY123_20260115_0001.xml or 012345678_20260115_0001_TEST.xml
   */
  generateFilename(options: FilenameOptions = {}): GeneratedFilename {
    const id = options.senderId || this.getEffectiveSenderId();
    const date = this.getCurrentDateString();
    const sequenceNumber = this.submissionRepo.getNextSequenceNumber(date);
    const paddedSequence = String(sequenceNumber).padStart(4, '0');
    const isTestMode = options.isTestMode ?? false;

    // Add _TEST suffix for test mode exports
    const testSuffix = isTestMode ? '_TEST' : '';
    const filename = `${id}_${date}_${paddedSequence}${testSuffix}.xml`;

    return { filename, sequenceNumber, date, isTestMode };
  }

  /**
   * Get the current date in YYYYMMDD format
   */
  private getCurrentDateString(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  /**
   * Get sender ID from settings
   */
  getSenderId(): string {
    const row = this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('senderId') as { value: string } | undefined;

    return row?.value || 'UNKNOWN';
  }

  /**
   * Get sender identifier type from settings ('senderId' or 'duns')
   */
  getSenderIdentifierType(): 'senderId' | 'duns' {
    const row = this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('senderIdentifierType') as { value: string } | undefined;

    return (row?.value as 'senderId' | 'duns') || 'senderId';
  }

  /**
   * Get DUNS number from settings
   */
  getDunsNumber(): string | null {
    const row = this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('dunsNumber') as { value: string } | undefined;

    return row?.value || null;
  }

  /**
   * Get the effective sender identifier value based on configured type
   */
  getEffectiveSenderId(): string {
    const idType = this.getSenderIdentifierType();
    if (idType === 'duns') {
      return this.getDunsNumber() || 'UNKNOWN';
    }
    return this.getSenderId();
  }

  /**
   * Check if sender identification is configured (either Sender ID or DUNS)
   */
  isSenderIdConfigured(): boolean {
    const idType = this.getSenderIdentifierType();
    if (idType === 'duns') {
      const duns = this.getDunsNumber();
      return !!duns && /^\d{9}$/.test(duns);
    }
    const senderId = this.getSenderId();
    return senderId !== 'UNKNOWN' && senderId.trim().length > 0;
  }

  /**
   * Get sender organization from settings
   */
  getSenderOrganization(): string | null {
    const row = this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('senderOrganization') as { value: string } | undefined;

    return row?.value || null;
  }

  /**
   * Get default export path from settings
   */
  getDefaultExportPath(): string | null {
    const row = this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('defaultExportPath') as { value: string } | undefined;

    return row?.value || null;
  }

  /**
   * Get submission environment from settings (Test or Production)
   * Defaults to Test for safety
   */
  getSubmissionEnvironment(): 'Test' | 'Production' {
    const row = this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('submissionEnvironment') as { value: string } | undefined;

    return (row?.value as 'Test' | 'Production') || 'Test';
  }

  /**
   * Get submission report type from settings (Postmarket or Premarket)
   * Defaults to Postmarket (most common)
   */
  getReportType(): 'Postmarket' | 'Premarket' {
    const row = this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('submissionReportType') as { value: string } | undefined;

    return (row?.value as 'Postmarket' | 'Premarket') || 'Postmarket';
  }

  /**
   * Check if currently in test mode
   */
  isTestMode(): boolean {
    return this.getSubmissionEnvironment() === 'Test';
  }

  /**
   * Get target center from settings (CDER or CBER)
   * Defaults to CDER (most common for drug submissions)
   */
  getTargetCenter(): 'CDER' | 'CBER' {
    const row = this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('targetCenter') as { value: string } | undefined;

    return (row?.value as 'CDER' | 'CBER') || 'CDER';
  }

  /**
   * Generate README.txt content for export package
   */
  generateReadmeContent(options: {
    caseId: string;
    filename: string;
    isTestMode: boolean;
    reportType: 'Postmarket' | 'Premarket';
    targetCenter: 'CDER' | 'CBER';
  }): string {
    const exportDate = new Date().toISOString().slice(0, 10);
    const { caseId, filename, isTestMode, reportType, targetCenter } = options;

    if (isTestMode) {
      return `FAERS Export Package
====================
Case ID: ${caseId}
Export Date: ${exportDate}
Submission Mode: TEST
Report Type: ${reportType}
Target Center: ${targetCenter}

THIS IS A TEST SUBMISSION
=========================
When uploading to FDA ESG NextGen USP, select "Test Submission".
Test submissions are validated by FDA but do not enter the live FAERS database.

Next Steps:
1. Validate XML (optional): https://faers2-validator.preprod.fda.gov/LSMV/Validator
2. Log into FDA ESG NextGen: https://www.fda.gov/industry/electronic-submissions-gateway
3. Click "Industry USP Log In"
4. Click "New Submission"
5. Select Submission Type: FAERS
6. Select "Test Submission"
7. Upload the XML file: ${filename}
8. Record the ESG Core ID in your application

Files in this package:
- ${filename} (E2B(R3) XML)
- README.txt (this file)
`;
    } else {
      return `FAERS Export Package
====================
Case ID: ${caseId}
Export Date: ${exportDate}
Submission Mode: PRODUCTION
Report Type: ${reportType}
Target Center: ${targetCenter}

PRODUCTION SUBMISSION
=====================
When uploading to FDA ESG NextGen USP, select "Production Submission".
This will submit to the live FAERS database.

Next Steps:
1. Log into FDA ESG NextGen: https://www.fda.gov/industry/electronic-submissions-gateway
2. Click "Industry USP Log In"
3. Click "New Submission"
4. Select Submission Type: FAERS
5. Select "Production Submission"
6. Upload the XML file: ${filename}
7. Record the ESG Core ID in your application

Files in this package:
- ${filename} (E2B(R3) XML)
- README.txt (this file)
`;
    }
  }
}
