/**
 * BA/BE Study Repository - Phase 6
 */

import type { BABEStudy, BABEStudyListItem, BABEStudyFilter, CreateBABEStudyDTO, UpdateBABEStudyDTO } from '../../../shared/types/babe.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

export class BABERepository {
  private db: DatabaseInstance;
  constructor(db: DatabaseInstance) { this.db = db; }

  create(data: CreateBABEStudyDTO): BABEStudy {
    const result = this.db.prepare(`
      INSERT INTO babe_studies (protocol_number, study_design, test_product_name, test_product_manufacturer,
        reference_product_name, reference_product_manufacturer, active_ingredient, dosage_form, strength,
        population, sponsor_name, pre_anda_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(data.protocolNumber, data.studyDesign || null, data.testProductName, data.testProductManufacturer || null,
      data.referenceProductName, data.referenceProductManufacturer || null, data.activeIngredient || null,
      data.dosageForm || null, data.strength || null, data.population || null, data.sponsorName || null, data.preAndaNumber || null);
    return this.findById(result.lastInsertRowid as number)!;
  }

  findById(id: number): BABEStudy | null {
    const r = this.db.prepare('SELECT * FROM babe_studies WHERE id = ?').get(id) as any;
    if (!r) return null;
    return this.mapRow(r);
  }

  findAll(filter?: BABEStudyFilter): BABEStudyListItem[] {
    let where = '1=1';
    const params: any[] = [];
    if (filter?.status) { where += ' AND status = ?'; params.push(filter.status); }
    if (filter?.search) { where += ' AND (protocol_number LIKE ? OR test_product_name LIKE ? OR reference_product_name LIKE ?)'; const s = `%${filter.search}%`; params.push(s, s, s); }
    const rows = this.db.prepare(`SELECT * FROM babe_studies WHERE ${where} ORDER BY created_at DESC`).all(...params) as any[];
    return rows.map(r => ({ id: r.id, protocolNumber: r.protocol_number, testProductName: r.test_product_name, referenceProductName: r.reference_product_name, activeIngredient: r.active_ingredient || undefined, sponsorName: r.sponsor_name || undefined, status: r.status }));
  }

  update(id: number, data: UpdateBABEStudyDTO): BABEStudy {
    const sets: string[] = [];
    const params: any[] = [];
    if (data.protocolNumber !== undefined) { sets.push('protocol_number = ?'); params.push(data.protocolNumber); }
    if (data.studyDesign !== undefined) { sets.push('study_design = ?'); params.push(data.studyDesign); }
    if (data.testProductName !== undefined) { sets.push('test_product_name = ?'); params.push(data.testProductName); }
    if (data.referenceProductName !== undefined) { sets.push('reference_product_name = ?'); params.push(data.referenceProductName); }
    if (data.activeIngredient !== undefined) { sets.push('active_ingredient = ?'); params.push(data.activeIngredient); }
    if (data.sponsorName !== undefined) { sets.push('sponsor_name = ?'); params.push(data.sponsorName); }
    if (data.status !== undefined) { sets.push('status = ?'); params.push(data.status); }
    if (data.preAndaNumber !== undefined) { sets.push('pre_anda_number = ?'); params.push(data.preAndaNumber); }
    if (sets.length > 0) { params.push(id); this.db.prepare(`UPDATE babe_studies SET ${sets.join(', ')} WHERE id = ?`).run(...params); }
    return this.findById(id)!;
  }

  delete(id: number): void { this.db.prepare('DELETE FROM babe_studies WHERE id = ?').run(id); }

  private mapRow(r: any): BABEStudy {
    return { id: r.id, protocolNumber: r.protocol_number, studyDesign: r.study_design || undefined, testProductName: r.test_product_name, testProductManufacturer: r.test_product_manufacturer || undefined, referenceProductName: r.reference_product_name, referenceProductManufacturer: r.reference_product_manufacturer || undefined, activeIngredient: r.active_ingredient || undefined, dosageForm: r.dosage_form || undefined, strength: r.strength || undefined, population: r.population || undefined, sponsorName: r.sponsor_name || undefined, preAndaNumber: r.pre_anda_number || undefined, status: r.status, createdAt: r.created_at };
  }
}
