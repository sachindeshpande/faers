/**
 * IND Case Repository - Phase 6
 * Causality assessments, unblinding records, IND case queries
 */

import type {
  CausalityAssessment, UnblindingRecord, CreateCausalityDTO,
  UnblindingRequest, UnblindingApproval
} from '../../../shared/types/indCase.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

export class INDCaseRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // Causality Assessments
  getCausalityAssessments(caseId: string): CausalityAssessment[] {
    const rows = this.db.prepare(
      'SELECT * FROM case_causality WHERE case_id = ? ORDER BY assessment_date'
    ).all(caseId) as any[];
    return rows.map(this.mapCausalityRow);
  }

  saveCausalityAssessment(data: CreateCausalityDTO): CausalityAssessment {
    // Check if assessment of this type already exists
    const existing = this.db.prepare(
      'SELECT id FROM case_causality WHERE case_id = ? AND assessor_type = ?'
    ).get(data.caseId, data.assessorType) as any;

    if (existing) {
      this.db.prepare(`
        UPDATE case_causality SET assessor_name = ?, assessment_date = ?, relationship = ?, justification = ?
        WHERE id = ?
      `).run(data.assessorName || null, data.assessmentDate, data.relationship, data.justification || null, existing.id);
      return this.mapCausalityRow(this.db.prepare('SELECT * FROM case_causality WHERE id = ?').get(existing.id));
    }

    const result = this.db.prepare(`
      INSERT INTO case_causality (case_id, assessor_type, assessor_name, assessment_date, relationship, justification)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.caseId, data.assessorType, data.assessorName || null, data.assessmentDate, data.relationship, data.justification || null);
    return this.mapCausalityRow(this.db.prepare('SELECT * FROM case_causality WHERE id = ?').get(result.lastInsertRowid));
  }

  deleteCausalityAssessment(id: number): void {
    this.db.prepare('DELETE FROM case_causality WHERE id = ?').run(id);
  }

  // Unblinding
  getUnblindingRecords(caseId: string): UnblindingRecord[] {
    const rows = this.db.prepare(
      'SELECT * FROM case_unblinding WHERE case_id = ? ORDER BY request_date DESC'
    ).all(caseId) as any[];
    return rows.map(this.mapUnblindingRow);
  }

  requestUnblinding(data: UnblindingRequest): UnblindingRecord {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO case_unblinding (case_id, request_date, request_reason, request_justification, approval_required)
      VALUES (?, ?, ?, ?, 1)
    `).run(data.caseId, now, data.requestReason, data.requestJustification);
    return this.mapUnblindingRow(this.db.prepare('SELECT * FROM case_unblinding WHERE id = ?').get(result.lastInsertRowid));
  }

  approveUnblinding(data: UnblindingApproval): UnblindingRecord {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE case_unblinding SET approved_at = ?, unblinding_date = ?, treatment_arm_revealed = ?
      WHERE id = ?
    `).run(now, now, data.treatmentArmRevealed, data.unblindingId);

    // Update the case to unblinded with treatment arm
    const record = this.db.prepare('SELECT case_id FROM case_unblinding WHERE id = ?').get(data.unblindingId) as any;
    if (record) {
      this.db.prepare(`
        UPDATE cases SET is_blinded = 0, treatment_arm = ? WHERE id = ?
      `).run(data.treatmentArmRevealed, record.case_id);
    }

    return this.mapUnblindingRow(this.db.prepare('SELECT * FROM case_unblinding WHERE id = ?').get(data.unblindingId));
  }

  // Check if case is serious (has seriousness criteria)
  isCaseSerious(caseId: string): boolean {
    const reactions = this.db.prepare(
      'SELECT serious_death, serious_life_threat, serious_hospitalization, serious_disability, serious_congenital, serious_other FROM case_reactions WHERE case_id = ?'
    ).all(caseId) as any[];
    return reactions.some(r =>
      r.serious_death || r.serious_life_threat || r.serious_hospitalization ||
      r.serious_disability || r.serious_congenital || r.serious_other
    );
  }

  isCaseFatalOrLifeThreatening(caseId: string): boolean {
    const reactions = this.db.prepare(
      'SELECT serious_death, serious_life_threat FROM case_reactions WHERE case_id = ?'
    ).all(caseId) as any[];
    return reactions.some(r => r.serious_death || r.serious_life_threat);
  }

  getCaseINDFields(caseId: string): any {
    return this.db.prepare(
      'SELECT case_type, study_id, site_id, subject_number, is_blinded, treatment_arm, date_informed, is_expected, ind_report_type FROM cases WHERE id = ?'
    ).get(caseId);
  }

  private mapCausalityRow(row: any): CausalityAssessment {
    return {
      id: row.id, caseId: row.case_id, assessorType: row.assessor_type,
      assessorName: row.assessor_name || undefined, assessmentDate: row.assessment_date,
      relationship: row.relationship, justification: row.justification || undefined,
      createdBy: row.created_by || undefined, createdAt: row.created_at
    };
  }

  private mapUnblindingRow(row: any): UnblindingRecord {
    return {
      id: row.id, caseId: row.case_id, requestDate: row.request_date,
      requestReason: row.request_reason, requestJustification: row.request_justification || undefined,
      requestedBy: row.requested_by || undefined, approvalRequired: row.approval_required === 1,
      approvedBy: row.approved_by || undefined, approvedAt: row.approved_at || undefined,
      unblindingDate: row.unblinding_date || undefined,
      treatmentArmRevealed: row.treatment_arm_revealed || undefined, createdAt: row.created_at
    };
  }
}
