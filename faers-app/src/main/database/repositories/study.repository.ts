/**
 * Study Repository - Phase 6
 * Database operations for studies, sites, investigators, products, INDs
 */

import type {
  Study,
  StudyListItem,
  StudySite,
  SiteInvestigator,
  StudyProduct,
  StudyInd,
  StudyFilter,
  CreateStudyDTO,
  UpdateStudyDTO
} from '../../../shared/types/study.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

interface StudyRow {
  id: number;
  study_id: string;
  protocol_number: string;
  study_title: string;
  sponsor_name: string | null;
  phase: string | null;
  study_design: string | null;
  therapeutic_area: string | null;
  indication: string | null;
  target_enrollment: number | null;
  status: string;
  fpfv_date: string | null;
  lplv_date: string | null;
  is_blinded: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export class StudyRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  create(data: CreateStudyDTO): Study {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO studies (study_id, protocol_number, study_title, sponsor_name, phase,
        study_design, therapeutic_area, indication, target_enrollment, is_blinded,
        fpfv_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?)
    `);

    const result = stmt.run(
      data.studyId, data.protocolNumber, data.studyTitle,
      data.sponsorName || null, data.phase || null,
      data.studyDesign || null, data.therapeuticArea || null,
      data.indication || null, data.targetEnrollment || null,
      data.isBlinded ? 1 : 0, data.fpfvDate || null, now, now
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  findById(id: number): Study | null {
    const row = this.db.prepare('SELECT * FROM studies WHERE id = ?').get(id) as StudyRow | undefined;
    if (!row) return null;
    const study = this.mapRowToStudy(row);
    study.inds = this.getInds(id);
    study.sites = this.getSites(id);
    study.products = this.getProducts(id);
    // Get current IB summary
    const ibRow = this.db.prepare(
      'SELECT version_number, effective_date FROM investigator_brochures WHERE study_id = ? AND is_current = 1'
    ).get(id) as { version_number: string; effective_date: string } | undefined;
    if (ibRow) {
      study.currentIB = { versionNumber: ibRow.version_number, effectiveDate: ibRow.effective_date };
    }
    return study;
  }

  findAll(filter?: StudyFilter): StudyListItem[] {
    let where = '1=1';
    const params: (string | number)[] = [];
    if (filter?.status) { where += ' AND status = ?'; params.push(filter.status); }
    if (filter?.phase) { where += ' AND phase = ?'; params.push(filter.phase); }
    if (filter?.search) {
      where += ' AND (study_id LIKE ? OR protocol_number LIKE ? OR study_title LIKE ?)';
      const s = `%${filter.search}%`;
      params.push(s, s, s);
    }

    const rows = this.db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM study_sites WHERE study_id = s.id) as site_count,
        (SELECT COUNT(*) FROM study_inds WHERE study_id = s.id) as ind_count
      FROM studies s WHERE ${where} ORDER BY s.updated_at DESC
    `).all(...params) as (StudyRow & { site_count: number; ind_count: number })[];

    return rows.map(r => ({
      id: r.id,
      studyId: r.study_id,
      protocolNumber: r.protocol_number,
      studyTitle: r.study_title,
      sponsorName: r.sponsor_name || undefined,
      phase: r.phase as any,
      status: r.status as any,
      isBlinded: r.is_blinded === 1,
      siteCount: r.site_count,
      indCount: r.ind_count
    }));
  }

  update(id: number, data: UpdateStudyDTO): Study {
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (data.protocolNumber !== undefined) { sets.push('protocol_number = ?'); params.push(data.protocolNumber); }
    if (data.studyTitle !== undefined) { sets.push('study_title = ?'); params.push(data.studyTitle); }
    if (data.sponsorName !== undefined) { sets.push('sponsor_name = ?'); params.push(data.sponsorName); }
    if (data.phase !== undefined) { sets.push('phase = ?'); params.push(data.phase); }
    if (data.studyDesign !== undefined) { sets.push('study_design = ?'); params.push(data.studyDesign); }
    if (data.therapeuticArea !== undefined) { sets.push('therapeutic_area = ?'); params.push(data.therapeuticArea); }
    if (data.indication !== undefined) { sets.push('indication = ?'); params.push(data.indication); }
    if (data.targetEnrollment !== undefined) { sets.push('target_enrollment = ?'); params.push(data.targetEnrollment); }
    if (data.status !== undefined) { sets.push('status = ?'); params.push(data.status); }
    if (data.isBlinded !== undefined) { sets.push('is_blinded = ?'); params.push(data.isBlinded ? 1 : 0); }
    if (data.fpfvDate !== undefined) { sets.push('fpfv_date = ?'); params.push(data.fpfvDate); }
    if (data.lplvDate !== undefined) { sets.push('lplv_date = ?'); params.push(data.lplvDate); }

    params.push(id);
    this.db.prepare(`UPDATE studies SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id)!;
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM studies WHERE id = ?').run(id);
  }

  // Sites
  getSites(studyId: number): StudySite[] {
    const rows = this.db.prepare('SELECT * FROM study_sites WHERE study_id = ? ORDER BY site_number').all(studyId) as any[];
    return rows.map(r => {
      const site: StudySite = {
        id: r.id, studyId: r.study_id, siteNumber: r.site_number,
        siteName: r.site_name, institutionName: r.institution_name || undefined,
        addressLine1: r.address_line1 || undefined, addressLine2: r.address_line2 || undefined,
        city: r.city || undefined, state: r.state || undefined,
        postalCode: r.postal_code || undefined, country: r.country,
        phone: r.phone || undefined, fax: r.fax || undefined, email: r.email || undefined,
        status: r.status, firstEnrollmentDate: r.first_enrollment_date || undefined,
        irbName: r.irb_name || undefined, irbApprovalDate: r.irb_approval_date || undefined,
        createdAt: r.created_at
      };
      site.investigators = this.getInvestigators(r.id);
      return site;
    });
  }

  createSite(site: Omit<StudySite, 'id' | 'createdAt' | 'investigators'>): StudySite {
    const stmt = this.db.prepare(`
      INSERT INTO study_sites (study_id, site_number, site_name, institution_name,
        address_line1, address_line2, city, state, postal_code, country,
        phone, fax, email, status, first_enrollment_date, irb_name, irb_approval_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      site.studyId, site.siteNumber, site.siteName, site.institutionName || null,
      site.addressLine1 || null, site.addressLine2 || null, site.city || null,
      site.state || null, site.postalCode || null, site.country,
      site.phone || null, site.fax || null, site.email || null,
      site.status || 'active', site.firstEnrollmentDate || null,
      site.irbName || null, site.irbApprovalDate || null
    );
    const row = this.db.prepare('SELECT * FROM study_sites WHERE id = ?').get(result.lastInsertRowid) as any;
    return { ...site, id: row.id, createdAt: row.created_at, investigators: [] };
  }

  updateSite(id: number, data: Partial<StudySite>): StudySite {
    const sets: string[] = [];
    const params: any[] = [];
    if (data.siteName !== undefined) { sets.push('site_name = ?'); params.push(data.siteName); }
    if (data.institutionName !== undefined) { sets.push('institution_name = ?'); params.push(data.institutionName); }
    if (data.city !== undefined) { sets.push('city = ?'); params.push(data.city); }
    if (data.state !== undefined) { sets.push('state = ?'); params.push(data.state); }
    if (data.country !== undefined) { sets.push('country = ?'); params.push(data.country); }
    if (data.phone !== undefined) { sets.push('phone = ?'); params.push(data.phone); }
    if (data.email !== undefined) { sets.push('email = ?'); params.push(data.email); }
    if (data.status !== undefined) { sets.push('status = ?'); params.push(data.status); }
    if (data.irbName !== undefined) { sets.push('irb_name = ?'); params.push(data.irbName); }
    if (data.irbApprovalDate !== undefined) { sets.push('irb_approval_date = ?'); params.push(data.irbApprovalDate); }
    if (sets.length > 0) {
      params.push(id);
      this.db.prepare(`UPDATE study_sites SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
    const row = this.db.prepare('SELECT * FROM study_sites WHERE id = ?').get(id) as any;
    const site = this.getSites(row.study_id).find(s => s.id === id)!;
    return site;
  }

  deleteSite(id: number): void {
    this.db.prepare('DELETE FROM study_sites WHERE id = ?').run(id);
  }

  // Investigators
  getInvestigators(siteId: number): SiteInvestigator[] {
    const rows = this.db.prepare('SELECT * FROM site_investigators WHERE site_id = ?').all(siteId) as any[];
    return rows.map(r => ({
      id: r.id, siteId: r.site_id, investigatorName: r.investigator_name,
      role: r.role, email: r.email || undefined, phone: r.phone || undefined,
      isPrimary: r.is_primary === 1, createdAt: r.created_at
    }));
  }

  addInvestigator(inv: Omit<SiteInvestigator, 'id' | 'createdAt'>): SiteInvestigator {
    const result = this.db.prepare(`
      INSERT INTO site_investigators (site_id, investigator_name, role, email, phone, is_primary)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(inv.siteId, inv.investigatorName, inv.role, inv.email || null, inv.phone || null, inv.isPrimary ? 1 : 0);
    const row = this.db.prepare('SELECT * FROM site_investigators WHERE id = ?').get(result.lastInsertRowid) as any;
    return { id: row.id, siteId: row.site_id, investigatorName: row.investigator_name, role: row.role, email: row.email || undefined, phone: row.phone || undefined, isPrimary: row.is_primary === 1, createdAt: row.created_at };
  }

  removeInvestigator(id: number): void {
    this.db.prepare('DELETE FROM site_investigators WHERE id = ?').run(id);
  }

  // Products
  getProducts(studyId: number): StudyProduct[] {
    const rows = this.db.prepare('SELECT * FROM study_products WHERE study_id = ?').all(studyId) as any[];
    return rows.map(r => ({
      id: r.id, studyId: r.study_id, productName: r.product_name,
      activeIngredient: r.active_ingredient || undefined, dosageForm: r.dosage_form || undefined,
      strength: r.strength || undefined, route: r.route || undefined,
      isInvestigational: r.is_investigational === 1, createdAt: r.created_at
    }));
  }

  addProduct(prod: Omit<StudyProduct, 'id' | 'createdAt'>): StudyProduct {
    const result = this.db.prepare(`
      INSERT INTO study_products (study_id, product_name, active_ingredient, dosage_form, strength, route, is_investigational)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(prod.studyId, prod.productName, prod.activeIngredient || null, prod.dosageForm || null, prod.strength || null, prod.route || null, prod.isInvestigational ? 1 : 0);
    const row = this.db.prepare('SELECT * FROM study_products WHERE id = ?').get(result.lastInsertRowid) as any;
    return { id: row.id, studyId: row.study_id, productName: row.product_name, activeIngredient: row.active_ingredient || undefined, dosageForm: row.dosage_form || undefined, strength: row.strength || undefined, route: row.route || undefined, isInvestigational: row.is_investigational === 1, createdAt: row.created_at };
  }

  removeProduct(id: number): void {
    this.db.prepare('DELETE FROM study_products WHERE id = ?').run(id);
  }

  // INDs
  getInds(studyId: number): StudyInd[] {
    const rows = this.db.prepare('SELECT * FROM study_inds WHERE study_id = ?').all(studyId) as any[];
    return rows.map(r => ({ id: r.id, studyId: r.study_id, indNumber: r.ind_number, center: r.center, isPrimary: r.is_primary === 1 }));
  }

  addInd(ind: Omit<StudyInd, 'id'>): StudyInd {
    const result = this.db.prepare(`
      INSERT INTO study_inds (study_id, ind_number, center, is_primary)
      VALUES (?, ?, ?, ?)
    `).run(ind.studyId, ind.indNumber, ind.center, ind.isPrimary ? 1 : 0);
    return { id: result.lastInsertRowid as number, ...ind };
  }

  removeInd(id: number): void {
    this.db.prepare('DELETE FROM study_inds WHERE id = ?').run(id);
  }

  private mapRowToStudy(row: StudyRow): Study {
    return {
      id: row.id, studyId: row.study_id, protocolNumber: row.protocol_number,
      studyTitle: row.study_title, sponsorName: row.sponsor_name || undefined,
      phase: row.phase as any, studyDesign: row.study_design as any,
      therapeuticArea: row.therapeutic_area || undefined, indication: row.indication || undefined,
      targetEnrollment: row.target_enrollment || undefined,
      status: row.status as any, fpfvDate: row.fpfv_date || undefined,
      lplvDate: row.lplv_date || undefined, isBlinded: row.is_blinded === 1,
      createdBy: row.created_by || undefined, createdAt: row.created_at, updatedAt: row.updated_at
    };
  }
}
