/**
 * Reaction Repository - Database access layer for case reactions
 */

import type { DatabaseInstance } from '../types';
import type { CaseReaction } from '../../../shared/types/case.types';

export class ReactionRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Get all reactions for a case
   */
  findByCaseId(caseId: string): CaseReaction[] {
    const rows = this.db.prepare(`
      SELECT * FROM case_reactions
      WHERE case_id = ?
      ORDER BY sort_order ASC
    `).all(caseId) as Record<string, unknown>[];

    return rows.map(row => this.mapRowToReaction(row));
  }

  /**
   * Get a single reaction by ID
   */
  findById(id: number): CaseReaction | null {
    const row = this.db.prepare(
      'SELECT * FROM case_reactions WHERE id = ?'
    ).get(id) as Record<string, unknown> | undefined;

    return row ? this.mapRowToReaction(row) : null;
  }

  /**
   * Create a new reaction
   */
  create(reaction: Omit<CaseReaction, 'id'>): CaseReaction {
    const stmt = this.db.prepare(`
      INSERT INTO case_reactions (
        case_id, assessment_source, reaction_term, meddra_code, meddra_version,
        native_term, start_date, end_date, duration, duration_unit,
        serious_death, serious_life_threat, serious_hospitalization,
        serious_disability, serious_congenital, serious_other,
        outcome, medical_confirm, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      reaction.caseId,
      reaction.assessmentSource ?? null,
      reaction.reactionTerm,
      reaction.meddraCode ?? null,
      reaction.meddraVersion ?? null,
      reaction.nativeTerm ?? null,
      reaction.startDate ?? null,
      reaction.endDate ?? null,
      reaction.duration ?? null,
      reaction.durationUnit ?? null,
      reaction.seriousDeath ? 1 : 0,
      reaction.seriousLifeThreat ? 1 : 0,
      reaction.seriousHospitalization ? 1 : 0,
      reaction.seriousDisability ? 1 : 0,
      reaction.seriousCongenital ? 1 : 0,
      reaction.seriousOther ? 1 : 0,
      reaction.outcome ?? null,
      reaction.medicalConfirm ? 1 : 0,
      reaction.sortOrder
    );

    return this.findById(Number(result.lastInsertRowid))!;
  }

  /**
   * Update an existing reaction
   */
  update(id: number, reaction: Partial<CaseReaction>): CaseReaction | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const stmt = this.db.prepare(`
      UPDATE case_reactions SET
        assessment_source = ?,
        reaction_term = ?,
        meddra_code = ?,
        meddra_version = ?,
        native_term = ?,
        start_date = ?,
        end_date = ?,
        duration = ?,
        duration_unit = ?,
        serious_death = ?,
        serious_life_threat = ?,
        serious_hospitalization = ?,
        serious_disability = ?,
        serious_congenital = ?,
        serious_other = ?,
        outcome = ?,
        medical_confirm = ?,
        sort_order = ?
      WHERE id = ?
    `);

    stmt.run(
      reaction.assessmentSource ?? existing.assessmentSource ?? null,
      reaction.reactionTerm ?? existing.reactionTerm,
      reaction.meddraCode ?? existing.meddraCode ?? null,
      reaction.meddraVersion ?? existing.meddraVersion ?? null,
      reaction.nativeTerm ?? existing.nativeTerm ?? null,
      reaction.startDate ?? existing.startDate ?? null,
      reaction.endDate ?? existing.endDate ?? null,
      reaction.duration ?? existing.duration ?? null,
      reaction.durationUnit ?? existing.durationUnit ?? null,
      (reaction.seriousDeath ?? existing.seriousDeath) ? 1 : 0,
      (reaction.seriousLifeThreat ?? existing.seriousLifeThreat) ? 1 : 0,
      (reaction.seriousHospitalization ?? existing.seriousHospitalization) ? 1 : 0,
      (reaction.seriousDisability ?? existing.seriousDisability) ? 1 : 0,
      (reaction.seriousCongenital ?? existing.seriousCongenital) ? 1 : 0,
      (reaction.seriousOther ?? existing.seriousOther) ? 1 : 0,
      reaction.outcome ?? existing.outcome ?? null,
      (reaction.medicalConfirm ?? existing.medicalConfirm) ? 1 : 0,
      reaction.sortOrder ?? existing.sortOrder,
      id
    );

    return this.findById(id);
  }

  /**
   * Save a reaction (create or update)
   */
  save(reaction: CaseReaction): CaseReaction {
    if (reaction.id) {
      return this.update(reaction.id, reaction) ?? this.create(reaction);
    }
    return this.create(reaction);
  }

  /**
   * Delete a reaction
   */
  delete(id: number): boolean {
    const result = this.db.prepare(
      'DELETE FROM case_reactions WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  /**
   * Reorder reactions
   */
  reorder(caseId: string, orderedIds: number[]): void {
    const stmt = this.db.prepare(
      'UPDATE case_reactions SET sort_order = ? WHERE id = ? AND case_id = ?'
    );

    const transaction = this.db.transaction(() => {
      orderedIds.forEach((id, index) => {
        stmt.run(index, id, caseId);
      });
    });

    transaction();
  }

  /**
   * Map database row to CaseReaction object
   */
  private mapRowToReaction(row: Record<string, unknown>): CaseReaction {
    return {
      id: row.id as number,
      caseId: row.case_id as string,
      assessmentSource: row.assessment_source as number | undefined,
      reactionTerm: row.reaction_term as string,
      meddraCode: row.meddra_code as string | undefined,
      meddraVersion: row.meddra_version as string | undefined,
      nativeTerm: row.native_term as string | undefined,
      startDate: row.start_date as string | undefined,
      endDate: row.end_date as string | undefined,
      duration: row.duration as number | undefined,
      durationUnit: row.duration_unit as string | undefined,
      seriousDeath: row.serious_death === 1,
      seriousLifeThreat: row.serious_life_threat === 1,
      seriousHospitalization: row.serious_hospitalization === 1,
      seriousDisability: row.serious_disability === 1,
      seriousCongenital: row.serious_congenital === 1,
      seriousOther: row.serious_other === 1,
      outcome: row.outcome as number | undefined,
      medicalConfirm: row.medical_confirm === 1,
      sortOrder: row.sort_order as number
    };
  }
}
