/**
 * Case Repository - Database access layer for ICSR cases
 */

import type { DatabaseInstance } from '../types';
import {
  AgeUnit
} from '../../../shared/types/case.types';
import type {
  Case,
  CaseListItem,
  CaseFilterOptions,
  CreateCaseDTO,
  UpdateCaseDTO,
  CaseStatus
} from '../../../shared/types/case.types';

export class CaseRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Generate a unique case ID: CASE-YYYYMMDD-XXXX
   */
  private generateCaseId(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CASE-${date}-${random}`;
  }

  /**
   * Generate a safety report ID based on case ID
   */
  private generateSafetyReportId(caseId: string): string {
    return `SR-${caseId}`;
  }

  /**
   * Get list of cases with optional filtering
   */
  findAll(options: CaseFilterOptions = {}): { cases: CaseListItem[]; total: number } {
    console.log('[CaseRepo.findAll] Called with options:', JSON.stringify(options));
    const { status, search, startDate, endDate, limit = 50, offset = 0 } = options;

    let whereClause = 'WHERE deleted_at IS NULL';
    const params: (string | number)[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (id LIKE ? OR patient_initials LIKE ? OR safety_report_id LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (startDate) {
      whereClause += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND created_at <= ?';
      params.push(endDate);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM cases ${whereClause}`;
    const countResult = this.db.prepare(countQuery).get(...params) as { count: number };
    const total = countResult.count;

    // Get cases with pagination
    const query = `
      SELECT
        c.id,
        c.status,
        c.patient_initials,
        c.created_at,
        c.updated_at,
        (SELECT product_name FROM case_drugs WHERE case_id = c.id AND characterization = 1 LIMIT 1) as product_name
      FROM cases c
      ${whereClause}
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const cases = this.db.prepare(query).all(...params, limit, offset) as Array<{
      id: string;
      status: string;
      patient_initials: string | null;
      created_at: string;
      updated_at: string;
      product_name: string | null;
    }>;

    // Log first few cases for debugging
    console.log('[CaseRepo.findAll] Found', cases.length, 'cases, statuses:',
      cases.slice(0, 5).map(c => `${c.id}:${c.status}`).join(', '));

    return {
      cases: cases.map(row => ({
        id: row.id,
        status: row.status as CaseStatus,
        patientInitials: row.patient_initials || undefined,
        productName: row.product_name || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      total
    };
  }

  /**
   * Get a single case by ID
   */
  findById(id: string): Case | null {
    const query = `
      SELECT * FROM cases
      WHERE id = ? AND deleted_at IS NULL
    `;

    const row = this.db.prepare(query).get(id) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return this.mapRowToCase(row);
  }

  /**
   * Create a new case
   */
  create(data?: CreateCaseDTO): Case {
    const id = this.generateCaseId();
    const now = new Date().toISOString();
    const safetyReportId = data?.safetyReportId || this.generateSafetyReportId(id);

    const stmt = this.db.prepare(`
      INSERT INTO cases (
        id, status, created_at, updated_at,
        safety_report_id, report_type, initial_or_followup,
        patient_death, version
      ) VALUES (?, 'Draft', ?, ?, ?, ?, ?, 0, 1)
    `);

    stmt.run(
      id,
      now,
      now,
      safetyReportId,
      data?.reportType ?? null,
      data?.initialOrFollowup ?? 1 // Default to Initial
    );

    return this.findById(id)!;
  }

  /**
   * Update an existing case
   */
  update(id: string, data: UpdateCaseDTO): Case | null {
    console.log(`[CaseRepo.update] Updating case ${id} with data:`, JSON.stringify(data));

    const existingCase = this.findById(id);
    if (!existingCase) {
      console.log(`[CaseRepo.update] Case not found: ${id}`);
      return null;
    }

    console.log(`[CaseRepo.update] Existing case status: '${existingCase.status}'`);

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    // Build dynamic update query based on provided fields
    const fieldMappings: Record<string, string> = {
      status: 'status',
      safetyReportId: 'safety_report_id',
      reportType: 'report_type',
      initialOrFollowup: 'initial_or_followup',
      receiptDate: 'receipt_date',
      receiveDate: 'receive_date',
      additionalDocs: 'additional_docs',
      expeditedReport: 'expedited_report',
      worldwideCaseId: 'worldwide_case_id',
      nullificationType: 'nullification_type',
      nullificationReason: 'nullification_reason',
      senderType: 'sender_type',
      senderOrganization: 'sender_organization',
      senderDepartment: 'sender_department',
      senderGivenName: 'sender_given_name',
      senderFamilyName: 'sender_family_name',
      senderAddress: 'sender_address',
      senderCity: 'sender_city',
      senderState: 'sender_state',
      senderPostcode: 'sender_postcode',
      senderCountry: 'sender_country',
      senderPhone: 'sender_phone',
      senderFax: 'sender_fax',
      senderEmail: 'sender_email',
      patientInitials: 'patient_initials',
      patientGpRecord: 'patient_gp_record',
      patientSpecialistRecord: 'patient_specialist_record',
      patientHospitalRecord: 'patient_hospital_record',
      patientInvestigation: 'patient_investigation',
      patientBirthdate: 'patient_birthdate',
      patientAge: 'patient_age',
      patientAgeUnit: 'patient_age_unit',
      patientAgeGroup: 'patient_age_group',
      patientWeight: 'patient_weight',
      patientHeight: 'patient_height',
      patientSex: 'patient_sex',
      patientLmpDate: 'patient_lmp_date',
      patientDeath: 'patient_death',
      deathDate: 'death_date',
      autopsyPerformed: 'autopsy_performed',
      caseNarrative: 'case_narrative',
      reporterComments: 'reporter_comments',
      senderComments: 'sender_comments',
      senderDiagnosis: 'sender_diagnosis',
      exportedAt: 'exported_at',
      exportedXmlPath: 'exported_xml_path',
      // Phase 2: Submission tracking fields
      submissionId: 'submission_id',
      lastSubmittedAt: 'last_submitted_at',
      srpConfirmationNumber: 'srp_confirmation_number',
      acknowledgmentDate: 'acknowledgment_date',
      fdaCaseNumber: 'fda_case_number',
      // Phase 2B: ESG API submission fields
      esgSubmissionId: 'esg_submission_id',
      esgCoreId: 'esg_core_id',
      apiAttemptCount: 'api_attempt_count',
      apiLastError: 'api_last_error'
    };

    for (const [key, column] of Object.entries(fieldMappings)) {
      if (key in data) {
        updates.push(`${column} = ?`);
        const value = (data as Record<string, unknown>)[key];
        values.push(value === undefined ? null : (value as string | number | null));
      }
    }

    // Increment version
    updates.push('version = version + 1');

    const query = `UPDATE cases SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
    values.push(id);

    console.log(`[CaseRepo.update] Executing SQL: ${query}`);
    console.log(`[CaseRepo.update] Values:`, values);

    const result = this.db.prepare(query).run(...values);
    console.log(`[CaseRepo.update] SQL result - changes: ${result.changes}`);

    const updatedCase = this.findById(id);
    console.log(`[CaseRepo.update] After update, status: '${updatedCase?.status}'`);

    return updatedCase;
  }

  /**
   * Soft delete a case
   */
  delete(id: string): boolean {
    const now = new Date().toISOString();

    const result = this.db.prepare(`
      UPDATE cases
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL AND status = 'Draft'
    `).run(now, now, id);

    return result.changes > 0;
  }

  /**
   * Duplicate a case
   */
  duplicate(id: string): Case | null {
    const sourceCase = this.findById(id);
    if (!sourceCase) {
      return null;
    }

    const newId = this.generateCaseId();
    const now = new Date().toISOString();
    const safetyReportId = this.generateSafetyReportId(newId);

    // Copy main case data
    const stmt = this.db.prepare(`
      INSERT INTO cases (
        id, status, created_at, updated_at,
        safety_report_id, report_type, initial_or_followup,
        receipt_date, receive_date, additional_docs, expedited_report,
        sender_type, sender_organization, sender_department,
        sender_given_name, sender_family_name, sender_address,
        sender_city, sender_state, sender_postcode, sender_country,
        sender_phone, sender_fax, sender_email,
        patient_initials, patient_gp_record, patient_specialist_record,
        patient_hospital_record, patient_investigation,
        patient_birthdate, patient_age, patient_age_unit, patient_age_group,
        patient_weight, patient_height, patient_sex, patient_lmp_date,
        patient_death, death_date, autopsy_performed,
        case_narrative, reporter_comments, sender_comments, sender_diagnosis,
        version
      )
      SELECT
        ?, 'Draft', ?, ?,
        ?, report_type, 2,  -- Set to Follow-up
        receipt_date, ?, additional_docs, expedited_report,
        sender_type, sender_organization, sender_department,
        sender_given_name, sender_family_name, sender_address,
        sender_city, sender_state, sender_postcode, sender_country,
        sender_phone, sender_fax, sender_email,
        patient_initials, patient_gp_record, patient_specialist_record,
        patient_hospital_record, patient_investigation,
        patient_birthdate, patient_age, patient_age_unit, patient_age_group,
        patient_weight, patient_height, patient_sex, patient_lmp_date,
        patient_death, death_date, autopsy_performed,
        case_narrative, reporter_comments, sender_comments, sender_diagnosis,
        1
      FROM cases WHERE id = ?
    `);

    stmt.run(newId, now, now, safetyReportId, now, id);

    // Copy reporters
    this.db.prepare(`
      INSERT INTO case_reporters (
        case_id, is_primary, title, given_name, family_name,
        qualification, organization, department, address,
        city, state, postcode, country, phone, email, sort_order
      )
      SELECT
        ?, is_primary, title, given_name, family_name,
        qualification, organization, department, address,
        city, state, postcode, country, phone, email, sort_order
      FROM case_reporters WHERE case_id = ?
    `).run(newId, id);

    // Copy reactions
    this.db.prepare(`
      INSERT INTO case_reactions (
        case_id, assessment_source, reaction_term, meddra_code, meddra_version,
        native_term, start_date, end_date, duration, duration_unit,
        serious_death, serious_life_threat, serious_hospitalization,
        serious_disability, serious_congenital, serious_other,
        outcome, medical_confirm, sort_order
      )
      SELECT
        ?, assessment_source, reaction_term, meddra_code, meddra_version,
        native_term, start_date, end_date, duration, duration_unit,
        serious_death, serious_life_threat, serious_hospitalization,
        serious_disability, serious_congenital, serious_other,
        outcome, medical_confirm, sort_order
      FROM case_reactions WHERE case_id = ?
    `).run(newId, id);

    // Copy drugs (and their related substances/dosages)
    const oldDrugs = this.db.prepare(
      'SELECT id FROM case_drugs WHERE case_id = ?'
    ).all(id) as Array<{ id: number }>;

    for (const oldDrug of oldDrugs) {
      const drugResult = this.db.prepare(`
        INSERT INTO case_drugs (
          case_id, characterization, product_name, mpid, phpid,
          cumulative_dose, cumulative_unit, cumulative_first, cumulative_first_unit,
          gestation_exposure, indication, indication_code,
          start_date, end_date, duration, duration_unit,
          time_to_onset, time_onset_unit, action_taken,
          dechallenge, rechallenge, additional_info, sort_order
        )
        SELECT
          ?, characterization, product_name, mpid, phpid,
          cumulative_dose, cumulative_unit, cumulative_first, cumulative_first_unit,
          gestation_exposure, indication, indication_code,
          start_date, end_date, duration, duration_unit,
          time_to_onset, time_onset_unit, action_taken,
          dechallenge, rechallenge, additional_info, sort_order
        FROM case_drugs WHERE id = ?
      `).run(newId, oldDrug.id);

      const newDrugId = drugResult.lastInsertRowid;

      // Copy substances
      this.db.prepare(`
        INSERT INTO case_drug_substances (
          drug_id, substance_name, substance_code, strength, strength_unit, sort_order
        )
        SELECT
          ?, substance_name, substance_code, strength, strength_unit, sort_order
        FROM case_drug_substances WHERE drug_id = ?
      `).run(newDrugId, oldDrug.id);

      // Copy dosages
      this.db.prepare(`
        INSERT INTO case_drug_dosages (
          drug_id, dose, dose_first, dose_last, dose_unit,
          num_units, interval_unit, interval_def, dosage_text,
          pharma_form, route, parent_route, sort_order
        )
        SELECT
          ?, dose, dose_first, dose_last, dose_unit,
          num_units, interval_unit, interval_def, dosage_text,
          pharma_form, route, parent_route, sort_order
        FROM case_drug_dosages WHERE drug_id = ?
      `).run(newDrugId, oldDrug.id);
    }

    // Link to original case
    this.db.prepare(`
      INSERT INTO case_related_reports (case_id, related_case_id, link_type)
      VALUES (?, ?, 1)
    `).run(newId, id);

    return this.findById(newId);
  }

  /**
   * Get total count of non-deleted cases
   */
  count(): number {
    const result = this.db.prepare(
      'SELECT COUNT(*) as count FROM cases WHERE deleted_at IS NULL'
    ).get() as { count: number };
    return result.count;
  }

  /**
   * Map database row to Case object
   */
  private mapRowToCase(row: Record<string, unknown>): Case {
    return {
      id: row.id as string,
      status: row.status as CaseStatus,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      deletedAt: row.deleted_at as string | undefined,

      // Report Information
      safetyReportId: row.safety_report_id as string | undefined,
      reportType: row.report_type as number | undefined,
      initialOrFollowup: row.initial_or_followup as number | undefined,
      receiptDate: row.receipt_date as string | undefined,
      receiveDate: row.receive_date as string | undefined,
      additionalDocs: row.additional_docs === 1,
      expeditedReport: row.expedited_report === 1,
      worldwideCaseId: row.worldwide_case_id as string | undefined,
      nullificationType: row.nullification_type as number | undefined,
      nullificationReason: row.nullification_reason as string | undefined,

      // Sender Information
      senderType: row.sender_type as number | undefined,
      senderOrganization: row.sender_organization as string | undefined,
      senderDepartment: row.sender_department as string | undefined,
      senderGivenName: row.sender_given_name as string | undefined,
      senderFamilyName: row.sender_family_name as string | undefined,
      senderAddress: row.sender_address as string | undefined,
      senderCity: row.sender_city as string | undefined,
      senderState: row.sender_state as string | undefined,
      senderPostcode: row.sender_postcode as string | undefined,
      senderCountry: row.sender_country as string | undefined,
      senderPhone: row.sender_phone as string | undefined,
      senderFax: row.sender_fax as string | undefined,
      senderEmail: row.sender_email as string | undefined,

      // Patient Information
      patientInitials: row.patient_initials as string | undefined,
      patientGpRecord: row.patient_gp_record as string | undefined,
      patientSpecialistRecord: row.patient_specialist_record as string | undefined,
      patientHospitalRecord: row.patient_hospital_record as string | undefined,
      patientInvestigation: row.patient_investigation as string | undefined,
      patientBirthdate: row.patient_birthdate as string | undefined,
      patientAge: row.patient_age as number | undefined,
      patientAgeUnit: row.patient_age_unit as AgeUnit | undefined,
      patientAgeGroup: row.patient_age_group as number | undefined,
      patientWeight: row.patient_weight as number | undefined,
      patientHeight: row.patient_height as number | undefined,
      patientSex: row.patient_sex as number | undefined,
      patientLmpDate: row.patient_lmp_date as string | undefined,

      // Death Information
      patientDeath: row.patient_death === 1,
      deathDate: row.death_date as string | undefined,
      autopsyPerformed: row.autopsy_performed === 1,

      // Narrative
      caseNarrative: row.case_narrative as string | undefined,
      reporterComments: row.reporter_comments as string | undefined,
      senderComments: row.sender_comments as string | undefined,
      senderDiagnosis: row.sender_diagnosis as string | undefined,

      // Metadata
      version: row.version as number,
      exportedAt: row.exported_at as string | undefined,
      exportedXmlPath: row.exported_xml_path as string | undefined,

      // Workflow Status (Phase 3)
      workflowStatus: row.workflow_status as string | undefined,

      // Phase 2: Submission tracking fields
      submissionId: row.submission_id as string | undefined,
      lastSubmittedAt: row.last_submitted_at as string | undefined,
      srpConfirmationNumber: row.srp_confirmation_number as string | undefined,
      acknowledgmentDate: row.acknowledgment_date as string | undefined,
      fdaCaseNumber: row.fda_case_number as string | undefined,

      // Phase 2B: ESG API submission fields
      esgSubmissionId: row.esg_submission_id as string | undefined,
      esgCoreId: row.esg_core_id as string | undefined,
      apiAttemptCount: row.api_attempt_count as number | undefined,
      apiLastError: row.api_last_error as string | undefined
    };
  }
}
