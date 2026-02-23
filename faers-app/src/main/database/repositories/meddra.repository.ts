/**
 * MedDRA Repository - Database access layer for MedDRA dictionary
 */

import type { DatabaseInstance } from '../types';
import type {
  MedDRAVersion,
  MedDRASOC,
  MedDRAHLGT,
  MedDRAHLT,
  MedDRAPT,
  MedDRALLT,
  MedDRAHierarchy,
  MedDRASearchResult,
  MedDRASearchOptions,
  MedDRABrowseRequest,
  MedDRATreeNode
} from '../../../shared/types/meddra.types';

export class MedDRARepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // ============ Version Management ============

  /**
   * Get all MedDRA versions
   */
  getAllVersions(): MedDRAVersion[] {
    const query = `
      SELECT
        id,
        version,
        release_date as releaseDate,
        import_date as importDate,
        is_active as isActive,
        llt_count as lltCount,
        pt_count as ptCount,
        imported_by as importedBy
      FROM meddra_versions
      ORDER BY version DESC
    `;
    return this.db.prepare(query).all() as MedDRAVersion[];
  }

  /**
   * Get active MedDRA version
   */
  getActiveVersion(): MedDRAVersion | null {
    const query = `
      SELECT
        id,
        version,
        release_date as releaseDate,
        import_date as importDate,
        is_active as isActive,
        llt_count as lltCount,
        pt_count as ptCount,
        imported_by as importedBy
      FROM meddra_versions
      WHERE is_active = 1
      LIMIT 1
    `;
    return (this.db.prepare(query).get() as MedDRAVersion) || null;
  }

  /**
   * Get version by ID
   */
  getVersionById(id: number): MedDRAVersion | null {
    const query = `
      SELECT
        id,
        version,
        release_date as releaseDate,
        import_date as importDate,
        is_active as isActive,
        llt_count as lltCount,
        pt_count as ptCount,
        imported_by as importedBy
      FROM meddra_versions
      WHERE id = ?
    `;
    return (this.db.prepare(query).get(id) as MedDRAVersion) || null;
  }

  /**
   * Create a new MedDRA version
   */
  createVersion(version: string, releaseDate?: string, importedBy?: string): number {
    const query = `
      INSERT INTO meddra_versions (version, release_date, import_date, is_active, llt_count, pt_count, imported_by)
      VALUES (?, ?, datetime('now'), 0, 0, 0, ?)
    `;
    const result = this.db.prepare(query).run(version, releaseDate || null, importedBy || null);
    return result.lastInsertRowid as number;
  }

  /**
   * Activate a MedDRA version (deactivates others)
   */
  activateVersion(id: number): void {
    this.db.exec('UPDATE meddra_versions SET is_active = 0');
    this.db.prepare('UPDATE meddra_versions SET is_active = 1 WHERE id = ?').run(id);
  }

  /**
   * Update version counts after import
   */
  updateVersionCounts(id: number, lltCount: number, ptCount: number): void {
    this.db.prepare('UPDATE meddra_versions SET llt_count = ?, pt_count = ? WHERE id = ?')
      .run(lltCount, ptCount, id);
  }

  /**
   * Delete a MedDRA version and its data
   */
  deleteVersion(id: number): void {
    // Delete in order to respect foreign keys
    this.db.prepare('DELETE FROM meddra_soc_hlgt WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM meddra_hlgt_hlt WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM meddra_hlt_pt WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM meddra_llt WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM meddra_pt WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM meddra_hlt WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM meddra_hlgt WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM meddra_soc WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM meddra_versions WHERE id = ?').run(id);
  }

  // ============ Bulk Import ============

  /**
   * Bulk insert SOC terms
   */
  bulkInsertSOC(versionId: number, records: Array<{ socCode: number; socName: string; socAbbrev?: string }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO meddra_soc (version_id, soc_code, soc_name, soc_abbrev)
      VALUES (?, ?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.socCode, r.socName, r.socAbbrev || null);
      }
    });
    insertMany(records);
  }

  /**
   * Bulk insert HLGT terms
   */
  bulkInsertHLGT(versionId: number, records: Array<{ hlgtCode: number; hlgtName: string }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO meddra_hlgt (version_id, hlgt_code, hlgt_name)
      VALUES (?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.hlgtCode, r.hlgtName);
      }
    });
    insertMany(records);
  }

  /**
   * Bulk insert HLT terms
   */
  bulkInsertHLT(versionId: number, records: Array<{ hltCode: number; hltName: string }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO meddra_hlt (version_id, hlt_code, hlt_name)
      VALUES (?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.hltCode, r.hltName);
      }
    });
    insertMany(records);
  }

  /**
   * Bulk insert PT terms
   */
  bulkInsertPT(versionId: number, records: Array<{ ptCode: number; ptName: string; primarySocCode?: number }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO meddra_pt (version_id, pt_code, pt_name, primary_soc_code)
      VALUES (?, ?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.ptCode, r.ptName, r.primarySocCode || null);
      }
    });
    insertMany(records);
  }

  /**
   * Bulk insert LLT terms
   */
  bulkInsertLLT(versionId: number, records: Array<{ lltCode: number; lltName: string; ptCode: number; isCurrent: boolean }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO meddra_llt (version_id, llt_code, llt_name, pt_code, is_current)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.lltCode, r.lltName, r.ptCode, r.isCurrent ? 1 : 0);
      }
    });
    insertMany(records);
  }

  /**
   * Bulk insert SOC-HLGT relationships
   */
  bulkInsertSOCHLGT(versionId: number, records: Array<{ socCode: number; hlgtCode: number }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO meddra_soc_hlgt (version_id, soc_code, hlgt_code)
      VALUES (?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.socCode, r.hlgtCode);
      }
    });
    insertMany(records);
  }

  /**
   * Bulk insert HLGT-HLT relationships
   */
  bulkInsertHLGTHLT(versionId: number, records: Array<{ hlgtCode: number; hltCode: number }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO meddra_hlgt_hlt (version_id, hlgt_code, hlt_code)
      VALUES (?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.hlgtCode, r.hltCode);
      }
    });
    insertMany(records);
  }

  /**
   * Bulk insert HLT-PT relationships
   */
  bulkInsertHLTPT(versionId: number, records: Array<{ hltCode: number; ptCode: number }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO meddra_hlt_pt (version_id, hlt_code, pt_code)
      VALUES (?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.hltCode, r.ptCode);
      }
    });
    insertMany(records);
  }

  // ============ Search ============

  /**
   * Search MedDRA terms by text (LLT and PT)
   */
  search(options: MedDRASearchOptions): MedDRASearchResult[] {
    const { query, limit = 20, includeNonCurrent = false, versionId } = options;

    // Get the version to use
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) {
        return [];
      }
      targetVersionId = activeVersion.id;
    }

    const searchPattern = `%${query}%`;
    const currentClause = includeNonCurrent ? '' : 'AND l.is_current = 1';

    // Search LLT names with fuzzy matching
    const searchQuery = `
      SELECT DISTINCT
        l.llt_code as lltCode,
        l.llt_name as lltName,
        l.pt_code as ptCode,
        p.pt_name as ptName,
        p.primary_soc_code as socCode,
        s.soc_name as socName,
        l.is_current as isCurrent,
        CASE
          WHEN LOWER(l.llt_name) = LOWER(?) THEN 100
          WHEN LOWER(l.llt_name) LIKE LOWER(?) THEN 90
          WHEN LOWER(l.llt_name) LIKE LOWER(?) THEN 80
          ELSE 70
        END as matchScore
      FROM meddra_llt l
      JOIN meddra_pt p ON l.version_id = p.version_id AND l.pt_code = p.pt_code
      LEFT JOIN meddra_soc s ON p.version_id = s.version_id AND p.primary_soc_code = s.soc_code
      WHERE l.version_id = ?
        AND (LOWER(l.llt_name) LIKE LOWER(?) OR LOWER(p.pt_name) LIKE LOWER(?))
        ${currentClause}
      ORDER BY matchScore DESC, l.llt_name ASC
      LIMIT ?
    `;

    const exactMatch = query;
    const startsWithPattern = `${query}%`;

    return this.db.prepare(searchQuery).all(
      exactMatch,
      startsWithPattern,
      searchPattern,
      targetVersionId,
      searchPattern,
      searchPattern,
      limit
    ) as MedDRASearchResult[];
  }

  /**
   * Get PT by code
   */
  getPTByCode(ptCode: number, versionId?: number): MedDRAPT | null {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return null;
      targetVersionId = activeVersion.id;
    }

    const query = `
      SELECT pt_code as ptCode, pt_name as ptName, primary_soc_code as primarySocCode
      FROM meddra_pt
      WHERE version_id = ? AND pt_code = ?
    `;
    return (this.db.prepare(query).get(targetVersionId, ptCode) as MedDRAPT) || null;
  }

  /**
   * Get LLT by code
   */
  getLLTByCode(lltCode: number, versionId?: number): MedDRALLT | null {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return null;
      targetVersionId = activeVersion.id;
    }

    const query = `
      SELECT llt_code as lltCode, llt_name as lltName, pt_code as ptCode, is_current as isCurrent
      FROM meddra_llt
      WHERE version_id = ? AND llt_code = ?
    `;
    return (this.db.prepare(query).get(targetVersionId, lltCode) as MedDRALLT) || null;
  }

  // ============ Hierarchy Browsing ============

  /**
   * Get all SOC terms for hierarchy root
   */
  getAllSOC(versionId?: number): MedDRASOC[] {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    const query = `
      SELECT soc_code as socCode, soc_name as socName, soc_abbrev as socAbbrev
      FROM meddra_soc
      WHERE version_id = ?
      ORDER BY soc_name
    `;
    return this.db.prepare(query).all(targetVersionId) as MedDRASOC[];
  }

  /**
   * Get HLGTs under a SOC
   */
  getHLGTsForSOC(socCode: number, versionId?: number): MedDRAHLGT[] {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    const query = `
      SELECT DISTINCT h.hlgt_code as hlgtCode, h.hlgt_name as hlgtName
      FROM meddra_hlgt h
      JOIN meddra_soc_hlgt sh ON h.version_id = sh.version_id AND h.hlgt_code = sh.hlgt_code
      WHERE h.version_id = ? AND sh.soc_code = ?
      ORDER BY h.hlgt_name
    `;
    return this.db.prepare(query).all(targetVersionId, socCode) as MedDRAHLGT[];
  }

  /**
   * Get HLTs under an HLGT
   */
  getHLTsForHLGT(hlgtCode: number, versionId?: number): MedDRAHLT[] {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    const query = `
      SELECT DISTINCT h.hlt_code as hltCode, h.hlt_name as hltName
      FROM meddra_hlt h
      JOIN meddra_hlgt_hlt hh ON h.version_id = hh.version_id AND h.hlt_code = hh.hlt_code
      WHERE h.version_id = ? AND hh.hlgt_code = ?
      ORDER BY h.hlt_name
    `;
    return this.db.prepare(query).all(targetVersionId, hlgtCode) as MedDRAHLT[];
  }

  /**
   * Get PTs under an HLT
   */
  getPTsForHLT(hltCode: number, versionId?: number): MedDRAPT[] {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    const query = `
      SELECT DISTINCT p.pt_code as ptCode, p.pt_name as ptName, p.primary_soc_code as primarySocCode
      FROM meddra_pt p
      JOIN meddra_hlt_pt hp ON p.version_id = hp.version_id AND p.pt_code = hp.pt_code
      WHERE p.version_id = ? AND hp.hlt_code = ?
      ORDER BY p.pt_name
    `;
    return this.db.prepare(query).all(targetVersionId, hltCode) as MedDRAPT[];
  }

  /**
   * Get LLTs under a PT
   */
  getLLTsForPT(ptCode: number, versionId?: number): MedDRALLT[] {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    const query = `
      SELECT llt_code as lltCode, llt_name as lltName, pt_code as ptCode, is_current as isCurrent
      FROM meddra_llt
      WHERE version_id = ? AND pt_code = ?
      ORDER BY llt_name
    `;
    return this.db.prepare(query).all(targetVersionId, ptCode) as MedDRALLT[];
  }

  /**
   * Get tree children for hierarchy browser
   */
  getTreeChildren(request: MedDRABrowseRequest): MedDRATreeNode[] {
    const { parentCode, parentLevel, versionId } = request;

    // If no parent, return SOC level
    if (!parentCode || !parentLevel) {
      const socs = this.getAllSOC(versionId);
      return socs.map(soc => ({
        key: `soc-${soc.socCode}`,
        title: soc.socName,
        code: soc.socCode,
        level: 'soc' as const,
        isLeaf: false
      }));
    }

    switch (parentLevel) {
      case 'soc': {
        const hlgts = this.getHLGTsForSOC(parentCode, versionId);
        return hlgts.map(h => ({
          key: `hlgt-${h.hlgtCode}`,
          title: h.hlgtName,
          code: h.hlgtCode,
          level: 'hlgt' as const,
          isLeaf: false
        }));
      }
      case 'hlgt': {
        const hlts = this.getHLTsForHLGT(parentCode, versionId);
        return hlts.map(h => ({
          key: `hlt-${h.hltCode}`,
          title: h.hltName,
          code: h.hltCode,
          level: 'hlt' as const,
          isLeaf: false
        }));
      }
      case 'hlt': {
        const pts = this.getPTsForHLT(parentCode, versionId);
        return pts.map(p => ({
          key: `pt-${p.ptCode}`,
          title: p.ptName,
          code: p.ptCode,
          level: 'pt' as const,
          isLeaf: false
        }));
      }
      case 'pt': {
        const llts = this.getLLTsForPT(parentCode, versionId);
        return llts.map(l => ({
          key: `llt-${l.lltCode}`,
          title: l.lltName,
          code: l.lltCode,
          level: 'llt' as const,
          isLeaf: true,
          isCurrent: l.isCurrent
        }));
      }
      default:
        return [];
    }
  }

  /**
   * Get full hierarchy for a PT code
   */
  getHierarchyForPT(ptCode: number, versionId?: number): MedDRAHierarchy[] {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    // Get PT info
    const pt = this.getPTByCode(ptCode, targetVersionId);
    if (!pt) return [];

    // Get all paths through the hierarchy
    const query = `
      SELECT DISTINCT
        s.soc_code as socCode,
        s.soc_name as socName,
        s.soc_abbrev as socAbbrev,
        hlgt.hlgt_code as hlgtCode,
        hlgt.hlgt_name as hlgtName,
        hlt.hlt_code as hltCode,
        hlt.hlt_name as hltName,
        CASE WHEN s.soc_code = p.primary_soc_code THEN 1 ELSE 0 END as isPrimaryPath
      FROM meddra_pt p
      JOIN meddra_hlt_pt hp ON p.version_id = hp.version_id AND p.pt_code = hp.pt_code
      JOIN meddra_hlt hlt ON hp.version_id = hlt.version_id AND hp.hlt_code = hlt.hlt_code
      JOIN meddra_hlgt_hlt hh ON hlt.version_id = hh.version_id AND hlt.hlt_code = hh.hlt_code
      JOIN meddra_hlgt hlgt ON hh.version_id = hlgt.version_id AND hh.hlgt_code = hlgt.hlgt_code
      JOIN meddra_soc_hlgt sh ON hlgt.version_id = sh.version_id AND hlgt.hlgt_code = sh.hlgt_code
      JOIN meddra_soc s ON sh.version_id = s.version_id AND sh.soc_code = s.soc_code
      WHERE p.version_id = ? AND p.pt_code = ?
      ORDER BY isPrimaryPath DESC, s.soc_name
    `;

    const paths = this.db.prepare(query).all(targetVersionId, ptCode) as Array<{
      socCode: number;
      socName: string;
      socAbbrev?: string;
      hlgtCode: number;
      hlgtName: string;
      hltCode: number;
      hltName: string;
      isPrimaryPath: number;
    }>;

    // Get one LLT as example (the PT itself is typically also an LLT)
    const lltQuery = `
      SELECT llt_code as lltCode, llt_name as lltName, pt_code as ptCode, is_current as isCurrent
      FROM meddra_llt
      WHERE version_id = ? AND pt_code = ? AND llt_code = pt_code
      LIMIT 1
    `;
    const llt = (this.db.prepare(lltQuery).get(targetVersionId, ptCode) as MedDRALLT) || {
      lltCode: ptCode,
      lltName: pt.ptName,
      ptCode: ptCode,
      isCurrent: true
    };

    return paths.map(path => ({
      llt,
      pt,
      hlt: { hltCode: path.hltCode, hltName: path.hltName },
      hlgt: { hlgtCode: path.hlgtCode, hlgtName: path.hlgtName },
      soc: { socCode: path.socCode, socName: path.socName, socAbbrev: path.socAbbrev },
      isPrimaryPath: path.isPrimaryPath === 1
    }));
  }

  /**
   * Get full hierarchy for an LLT code
   */
  getHierarchyForLLT(lltCode: number, versionId?: number): MedDRAHierarchy[] {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    const llt = this.getLLTByCode(lltCode, targetVersionId);
    if (!llt) return [];

    const hierarchies = this.getHierarchyForPT(llt.ptCode, targetVersionId);
    // Replace the LLT in each hierarchy
    return hierarchies.map(h => ({ ...h, llt }));
  }
}
