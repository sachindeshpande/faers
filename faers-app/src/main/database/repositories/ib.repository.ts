/**
 * Investigator Brochure Repository - Phase 6
 */

import type {
  InvestigatorBrochure, IBKnownReaction, IBListItem,
  CreateIBDTO, CreateIBReactionDTO, ExpectednessLookupResult
} from '../../../shared/types/ib.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

export class IBRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  create(data: CreateIBDTO): InvestigatorBrochure {
    if (data.isCurrent) {
      this.db.prepare('UPDATE investigator_brochures SET is_current = 0 WHERE study_id = ?').run(data.studyId);
    }
    const result = this.db.prepare(`
      INSERT INTO investigator_brochures (study_id, version_number, effective_date, document_path, change_summary, is_current)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.studyId, data.versionNumber, data.effectiveDate, data.documentPath || null, data.changeSummary || null, data.isCurrent ? 1 : 0);
    return this.findById(result.lastInsertRowid as number)!;
  }

  findById(id: number): InvestigatorBrochure | null {
    const row = this.db.prepare('SELECT * FROM investigator_brochures WHERE id = ?').get(id) as any;
    if (!row) return null;
    const ib = this.mapRow(row);
    ib.knownReactions = this.getReactions(id);
    return ib;
  }

  findByStudy(studyId: number): IBListItem[] {
    const rows = this.db.prepare(`
      SELECT ib.*, (SELECT COUNT(*) FROM ib_known_reactions WHERE ib_id = ib.id) as reaction_count
      FROM investigator_brochures ib WHERE ib.study_id = ? ORDER BY ib.effective_date DESC
    `).all(studyId) as any[];
    return rows.map(r => ({
      id: r.id, studyId: r.study_id, versionNumber: r.version_number,
      effectiveDate: r.effective_date, isCurrent: r.is_current === 1, reactionCount: r.reaction_count
    }));
  }

  setCurrent(id: number): void {
    const ib = this.db.prepare('SELECT study_id FROM investigator_brochures WHERE id = ?').get(id) as any;
    if (!ib) throw new Error('IB not found');
    this.db.prepare('UPDATE investigator_brochures SET is_current = 0 WHERE study_id = ?').run(ib.study_id);
    this.db.prepare('UPDATE investigator_brochures SET is_current = 1 WHERE id = ?').run(id);
  }

  update(id: number, data: Partial<InvestigatorBrochure>): InvestigatorBrochure {
    const sets: string[] = [];
    const params: any[] = [];
    if (data.versionNumber !== undefined) { sets.push('version_number = ?'); params.push(data.versionNumber); }
    if (data.effectiveDate !== undefined) { sets.push('effective_date = ?'); params.push(data.effectiveDate); }
    if (data.documentPath !== undefined) { sets.push('document_path = ?'); params.push(data.documentPath); }
    if (data.changeSummary !== undefined) { sets.push('change_summary = ?'); params.push(data.changeSummary); }
    if (sets.length > 0) {
      params.push(id);
      this.db.prepare(`UPDATE investigator_brochures SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
    return this.findById(id)!;
  }

  // Reactions
  getReactions(ibId: number): IBKnownReaction[] {
    const rows = this.db.prepare('SELECT * FROM ib_known_reactions WHERE ib_id = ? ORDER BY meddra_pt_name').all(ibId) as any[];
    return rows.map(r => ({
      id: r.id, ibId: r.ib_id, meddraPtCode: r.meddra_pt_code, meddraPtName: r.meddra_pt_name,
      documentedSeverity: r.documented_severity || undefined, documentedFrequency: r.documented_frequency || undefined,
      ibSection: r.ib_section || undefined, ibPage: r.ib_page || undefined,
      notes: r.notes || undefined, createdAt: r.created_at
    }));
  }

  addReaction(data: CreateIBReactionDTO): IBKnownReaction {
    const result = this.db.prepare(`
      INSERT INTO ib_known_reactions (ib_id, meddra_pt_code, meddra_pt_name, documented_severity, documented_frequency, ib_section, ib_page, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.ibId, data.meddraPtCode, data.meddraPtName, data.documentedSeverity || null, data.documentedFrequency || null, data.ibSection || null, data.ibPage || null, data.notes || null);
    const row = this.db.prepare('SELECT * FROM ib_known_reactions WHERE id = ?').get(result.lastInsertRowid) as any;
    return { id: row.id, ibId: row.ib_id, meddraPtCode: row.meddra_pt_code, meddraPtName: row.meddra_pt_name, documentedSeverity: row.documented_severity || undefined, documentedFrequency: row.documented_frequency || undefined, ibSection: row.ib_section || undefined, ibPage: row.ib_page || undefined, notes: row.notes || undefined, createdAt: row.created_at };
  }

  removeReaction(id: number): void {
    this.db.prepare('DELETE FROM ib_known_reactions WHERE id = ?').run(id);
  }

  lookupExpectedness(studyId: number, meddraPtCode: number): ExpectednessLookupResult {
    const ib = this.db.prepare(
      'SELECT * FROM investigator_brochures WHERE study_id = ? AND is_current = 1'
    ).get(studyId) as any;
    if (!ib) return { isListed: false, ibVersion: 'N/A', ibEffectiveDate: 'N/A' };

    const reaction = this.db.prepare(
      'SELECT * FROM ib_known_reactions WHERE ib_id = ? AND meddra_pt_code = ?'
    ).get(ib.id, meddraPtCode) as any;

    return {
      isListed: !!reaction,
      reaction: reaction ? {
        id: reaction.id, ibId: reaction.ib_id, meddraPtCode: reaction.meddra_pt_code,
        meddraPtName: reaction.meddra_pt_name, documentedSeverity: reaction.documented_severity || undefined,
        documentedFrequency: reaction.documented_frequency || undefined,
        ibSection: reaction.ib_section || undefined, ibPage: reaction.ib_page || undefined,
        notes: reaction.notes || undefined, createdAt: reaction.created_at
      } : undefined,
      ibVersion: ib.version_number,
      ibEffectiveDate: ib.effective_date
    };
  }

  private mapRow(row: any): InvestigatorBrochure {
    return {
      id: row.id, studyId: row.study_id, versionNumber: row.version_number,
      effectiveDate: row.effective_date, documentPath: row.document_path || undefined,
      changeSummary: row.change_summary || undefined, isCurrent: row.is_current === 1,
      createdBy: row.created_by || undefined, createdAt: row.created_at
    };
  }
}
