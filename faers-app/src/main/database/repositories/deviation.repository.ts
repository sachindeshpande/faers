/**
 * Protocol Deviation Repository - Phase 6
 */
import type { ProtocolDeviation, DeviationListItem, DeviationFilter, CreateDeviationDTO, UpdateDeviationDTO } from '../../../shared/types/deviation.types';
type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

export class DeviationRepository {
  private db: DatabaseInstance;
  constructor(db: DatabaseInstance) { this.db = db; }

  create(data: CreateDeviationDTO): ProtocolDeviation {
    const result = this.db.prepare(`
      INSERT INTO protocol_deviations (deviation_id, study_id, site_id, subject_number, deviation_date, category, description, impact_on_safety, impact_on_data, corrective_action)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.deviationId, data.studyId, data.siteId || null, data.subjectNumber || null, data.deviationDate, data.category, data.description, data.impactOnSafety || null, data.impactOnData || null, data.correctiveAction || null);
    return this.findById(result.lastInsertRowid as number)!;
  }

  findById(id: number): ProtocolDeviation | null {
    const r = this.db.prepare('SELECT * FROM protocol_deviations WHERE id = ?').get(id) as any;
    if (!r) return null;
    const linked = this.db.prepare('SELECT case_id FROM deviation_cases WHERE deviation_id = ?').all(id) as any[];
    return { id: r.id, deviationId: r.deviation_id, studyId: r.study_id, siteId: r.site_id || undefined, subjectNumber: r.subject_number || undefined, deviationDate: r.deviation_date, category: r.category, description: r.description, impactOnSafety: r.impact_on_safety || undefined, impactOnData: r.impact_on_data || undefined, correctiveAction: r.corrective_action || undefined, reportedToIrb: r.reported_to_irb === 1, irbReportDate: r.irb_report_date || undefined, reportedToSponsor: r.reported_to_sponsor === 1, sponsorReportDate: r.sponsor_report_date || undefined, createdBy: r.created_by || undefined, createdAt: r.created_at, linkedCaseIds: linked.map(l => l.case_id) };
  }

  findAll(filter?: DeviationFilter): DeviationListItem[] {
    let where = '1=1';
    const params: any[] = [];
    if (filter?.studyId) { where += ' AND study_id = ?'; params.push(filter.studyId); }
    if (filter?.siteId) { where += ' AND site_id = ?'; params.push(filter.siteId); }
    if (filter?.category) { where += ' AND category = ?'; params.push(filter.category); }
    if (filter?.subjectNumber) { where += ' AND subject_number = ?'; params.push(filter.subjectNumber); }
    if (filter?.search) { where += ' AND (deviation_id LIKE ? OR description LIKE ?)'; const s = `%${filter.search}%`; params.push(s, s); }
    const rows = this.db.prepare(`SELECT pd.*, (SELECT COUNT(*) FROM deviation_cases WHERE deviation_id = pd.id) as linked_case_count FROM protocol_deviations pd WHERE ${where} ORDER BY pd.deviation_date DESC`).all(...params) as any[];
    return rows.map(r => ({ id: r.id, deviationId: r.deviation_id, studyId: r.study_id, subjectNumber: r.subject_number || undefined, deviationDate: r.deviation_date, category: r.category, description: r.description, linkedCaseCount: r.linked_case_count }));
  }

  update(id: number, data: UpdateDeviationDTO): ProtocolDeviation {
    const sets: string[] = [];
    const params: any[] = [];
    if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
    if (data.impactOnSafety !== undefined) { sets.push('impact_on_safety = ?'); params.push(data.impactOnSafety); }
    if (data.impactOnData !== undefined) { sets.push('impact_on_data = ?'); params.push(data.impactOnData); }
    if (data.correctiveAction !== undefined) { sets.push('corrective_action = ?'); params.push(data.correctiveAction); }
    if (data.reportedToIrb !== undefined) { sets.push('reported_to_irb = ?'); params.push(data.reportedToIrb ? 1 : 0); }
    if (data.irbReportDate !== undefined) { sets.push('irb_report_date = ?'); params.push(data.irbReportDate); }
    if (data.reportedToSponsor !== undefined) { sets.push('reported_to_sponsor = ?'); params.push(data.reportedToSponsor ? 1 : 0); }
    if (data.sponsorReportDate !== undefined) { sets.push('sponsor_report_date = ?'); params.push(data.sponsorReportDate); }
    if (sets.length > 0) { params.push(id); this.db.prepare(`UPDATE protocol_deviations SET ${sets.join(', ')} WHERE id = ?`).run(...params); }
    return this.findById(id)!;
  }

  delete(id: number): void { this.db.prepare('DELETE FROM protocol_deviations WHERE id = ?').run(id); }

  linkCase(deviationId: number, caseId: string): void {
    this.db.prepare('INSERT OR IGNORE INTO deviation_cases (deviation_id, case_id) VALUES (?, ?)').run(deviationId, caseId);
  }

  unlinkCase(deviationId: number, caseId: string): void {
    this.db.prepare('DELETE FROM deviation_cases WHERE deviation_id = ? AND case_id = ?').run(deviationId, caseId);
  }

  getByCase(caseId: string): DeviationListItem[] {
    const rows = this.db.prepare(`
      SELECT pd.*, (SELECT COUNT(*) FROM deviation_cases WHERE deviation_id = pd.id) as linked_case_count
      FROM protocol_deviations pd
      INNER JOIN deviation_cases dc ON dc.deviation_id = pd.id
      WHERE dc.case_id = ?
      ORDER BY pd.deviation_date DESC
    `).all(caseId) as any[];
    return rows.map(r => ({ id: r.id, deviationId: r.deviation_id, studyId: r.study_id, subjectNumber: r.subject_number || undefined, deviationDate: r.deviation_date, category: r.category, description: r.description, linkedCaseCount: r.linked_case_count }));
  }
}
