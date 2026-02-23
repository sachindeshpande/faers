/**
 * WHO Drug Repository - Database access layer for WHO Drug dictionary
 */

import type { DatabaseInstance } from '../types';
import type {
  WHODrugVersion,
  WHODrugProduct,
  WHODrugIngredient,
  WHODrugSearchResult,
  WHODrugSearchOptions,
  WHODrugBrowseATCRequest,
  ATCCode,
  ATCTreeNode
} from '../../../shared/types/whodrug.types';

export class WHODrugRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // ============ Version Management ============

  /**
   * Get all WHO Drug versions
   */
  getAllVersions(): WHODrugVersion[] {
    const query = `
      SELECT
        id,
        version,
        release_date as releaseDate,
        import_date as importDate,
        is_active as isActive,
        product_count as productCount,
        ingredient_count as ingredientCount,
        imported_by as importedBy
      FROM whodrug_versions
      ORDER BY version DESC
    `;
    return this.db.prepare(query).all() as WHODrugVersion[];
  }

  /**
   * Get active WHO Drug version
   */
  getActiveVersion(): WHODrugVersion | null {
    const query = `
      SELECT
        id,
        version,
        release_date as releaseDate,
        import_date as importDate,
        is_active as isActive,
        product_count as productCount,
        ingredient_count as ingredientCount,
        imported_by as importedBy
      FROM whodrug_versions
      WHERE is_active = 1
      LIMIT 1
    `;
    return (this.db.prepare(query).get() as WHODrugVersion) || null;
  }

  /**
   * Get version by ID
   */
  getVersionById(id: number): WHODrugVersion | null {
    const query = `
      SELECT
        id,
        version,
        release_date as releaseDate,
        import_date as importDate,
        is_active as isActive,
        product_count as productCount,
        ingredient_count as ingredientCount,
        imported_by as importedBy
      FROM whodrug_versions
      WHERE id = ?
    `;
    return (this.db.prepare(query).get(id) as WHODrugVersion) || null;
  }

  /**
   * Create a new WHO Drug version
   */
  createVersion(version: string, releaseDate?: string, importedBy?: string): number {
    const query = `
      INSERT INTO whodrug_versions (version, release_date, import_date, is_active, product_count, ingredient_count, imported_by)
      VALUES (?, ?, datetime('now'), 0, 0, 0, ?)
    `;
    const result = this.db.prepare(query).run(version, releaseDate || null, importedBy || null);
    return result.lastInsertRowid as number;
  }

  /**
   * Activate a WHO Drug version (deactivates others)
   */
  activateVersion(id: number): void {
    this.db.exec('UPDATE whodrug_versions SET is_active = 0');
    this.db.prepare('UPDATE whodrug_versions SET is_active = 1 WHERE id = ?').run(id);
  }

  /**
   * Update version counts after import
   */
  updateVersionCounts(id: number, productCount: number, ingredientCount: number): void {
    this.db.prepare('UPDATE whodrug_versions SET product_count = ?, ingredient_count = ? WHERE id = ?')
      .run(productCount, ingredientCount, id);
  }

  /**
   * Delete a WHO Drug version and its data
   */
  deleteVersion(id: number): void {
    // Delete in order to respect foreign keys
    this.db.prepare('DELETE FROM whodrug_product_ingredients WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM whodrug_products WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM whodrug_ingredients WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM whodrug_atc WHERE version_id = ?').run(id);
    this.db.prepare('DELETE FROM whodrug_versions WHERE id = ?').run(id);
  }

  // ============ Bulk Import ============

  /**
   * Bulk insert ATC codes
   */
  bulkInsertATC(versionId: number, records: Array<{ atcCode: string; atcName: string; level: number; parentCode?: string }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO whodrug_atc (version_id, atc_code, atc_name, level, parent_code)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.atcCode, r.atcName, r.level, r.parentCode || null);
      }
    });
    insertMany(records);
  }

  /**
   * Bulk insert ingredients
   */
  bulkInsertIngredients(versionId: number, records: Array<{ ingredientId: string; name: string }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO whodrug_ingredients (version_id, ingredient_id, name)
      VALUES (?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.ingredientId, r.name);
      }
    });
    insertMany(records);
  }

  /**
   * Bulk insert products
   */
  bulkInsertProducts(versionId: number, records: Array<{
    drugCode: string;
    drugName: string;
    drugNameEnglish?: string;
    countryCode?: string;
    company?: string;
    atcCode?: string;
    formulation?: string;
    marketingStatus?: string;
  }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO whodrug_products (version_id, drug_code, drug_name, drug_name_english, country_code, company, atc_code, formulation, marketing_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(
          versionId,
          r.drugCode,
          r.drugName,
          r.drugNameEnglish || null,
          r.countryCode || null,
          r.company || null,
          r.atcCode || null,
          r.formulation || null,
          r.marketingStatus || null
        );
      }
    });
    insertMany(records);
  }

  /**
   * Bulk insert product-ingredient relationships
   */
  bulkInsertProductIngredients(versionId: number, records: Array<{ drugCode: string; ingredientId: string; strength?: string }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO whodrug_product_ingredients (version_id, drug_code, ingredient_id, strength)
      VALUES (?, ?, ?, ?)
    `);
    const insertMany = this.db.transaction((records: typeof records) => {
      for (const r of records) {
        stmt.run(versionId, r.drugCode, r.ingredientId, r.strength || null);
      }
    });
    insertMany(records);
  }

  // ============ Search ============

  /**
   * Search WHO Drug products by text
   */
  search(options: WHODrugSearchOptions): WHODrugSearchResult[] {
    const { query, limit = 20, countryCode, versionId } = options;

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
    let countryClause = '';
    const params: (string | number)[] = [];

    params.push(query); // exact match
    params.push(`${query}%`); // starts with
    params.push(searchPattern); // contains
    params.push(targetVersionId);
    params.push(searchPattern);
    params.push(searchPattern);

    if (countryCode) {
      countryClause = 'AND p.country_code = ?';
      params.push(countryCode);
    }

    params.push(limit);

    // Search products
    const searchQuery = `
      SELECT DISTINCT
        p.drug_code as drugCode,
        p.drug_name as drugName,
        p.drug_name_english as drugNameEnglish,
        p.country_code as countryCode,
        p.company,
        p.atc_code as atcCode,
        a.atc_name as atcName,
        p.formulation,
        CASE
          WHEN LOWER(p.drug_name) = LOWER(?) THEN 100
          WHEN LOWER(p.drug_name) LIKE LOWER(?) THEN 90
          WHEN LOWER(p.drug_name) LIKE LOWER(?) THEN 80
          ELSE 70
        END as matchScore
      FROM whodrug_products p
      LEFT JOIN whodrug_atc a ON p.version_id = a.version_id AND p.atc_code = a.atc_code
      WHERE p.version_id = ?
        AND (LOWER(p.drug_name) LIKE LOWER(?) OR LOWER(p.drug_name_english) LIKE LOWER(?))
        ${countryClause}
      ORDER BY matchScore DESC, p.drug_name ASC
      LIMIT ?
    `;

    return this.db.prepare(searchQuery).all(...params) as WHODrugSearchResult[];
  }

  /**
   * Get product by drug code
   */
  getProductByCode(drugCode: string, versionId?: number): WHODrugProduct | null {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return null;
      targetVersionId = activeVersion.id;
    }

    const query = `
      SELECT
        p.drug_code as drugCode,
        p.drug_name as drugName,
        p.drug_name_english as drugNameEnglish,
        p.country_code as countryCode,
        p.company,
        p.atc_code as atcCode,
        a.atc_name as atcName,
        p.formulation,
        p.marketing_status as marketingStatus
      FROM whodrug_products p
      LEFT JOIN whodrug_atc a ON p.version_id = a.version_id AND p.atc_code = a.atc_code
      WHERE p.version_id = ? AND p.drug_code = ?
    `;

    const product = this.db.prepare(query).get(targetVersionId, drugCode) as WHODrugProduct | undefined;
    if (!product) return null;

    // Get ingredients
    const ingredientQuery = `
      SELECT
        i.ingredient_id as ingredientId,
        i.name,
        pi.strength
      FROM whodrug_product_ingredients pi
      JOIN whodrug_ingredients i ON pi.version_id = i.version_id AND pi.ingredient_id = i.ingredient_id
      WHERE pi.version_id = ? AND pi.drug_code = ?
    `;

    const ingredients = this.db.prepare(ingredientQuery).all(targetVersionId, drugCode) as WHODrugIngredient[];
    product.ingredients = ingredients;

    return product;
  }

  // ============ ATC Browsing ============

  /**
   * Get ATC codes at a specific level or under a parent
   */
  getATCCodes(request: WHODrugBrowseATCRequest): ATCCode[] {
    const { parentCode, level, versionId } = request;

    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    let query: string;
    const params: (string | number)[] = [targetVersionId];

    if (parentCode) {
      // Get children of parent
      query = `
        SELECT atc_code as atcCode, atc_name as atcName, level, parent_code as parentCode
        FROM whodrug_atc
        WHERE version_id = ? AND parent_code = ?
        ORDER BY atc_code
      `;
      params.push(parentCode);
    } else if (level !== undefined) {
      // Get all at specific level
      query = `
        SELECT atc_code as atcCode, atc_name as atcName, level, parent_code as parentCode
        FROM whodrug_atc
        WHERE version_id = ? AND level = ?
        ORDER BY atc_code
      `;
      params.push(level);
    } else {
      // Get level 1 (root)
      query = `
        SELECT atc_code as atcCode, atc_name as atcName, level, parent_code as parentCode
        FROM whodrug_atc
        WHERE version_id = ? AND level = 1
        ORDER BY atc_code
      `;
    }

    return this.db.prepare(query).all(...params) as ATCCode[];
  }

  /**
   * Get ATC tree for hierarchy browser
   */
  getATCTreeChildren(request: WHODrugBrowseATCRequest): ATCTreeNode[] {
    const codes = this.getATCCodes(request);

    return codes.map(code => ({
      key: `atc-${code.atcCode}`,
      title: `${code.atcCode} - ${code.atcName}`,
      code: code.atcCode,
      name: code.atcName,
      level: code.level,
      isLeaf: code.level >= 5,
      children: undefined
    }));
  }

  /**
   * Get products by ATC code
   */
  getProductsByATC(atcCode: string, versionId?: number, limit = 50): WHODrugSearchResult[] {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    // Match ATC code or any children (prefix match)
    const atcPattern = `${atcCode}%`;

    const query = `
      SELECT DISTINCT
        p.drug_code as drugCode,
        p.drug_name as drugName,
        p.drug_name_english as drugNameEnglish,
        p.country_code as countryCode,
        p.company,
        p.atc_code as atcCode,
        a.atc_name as atcName,
        p.formulation,
        100 as matchScore
      FROM whodrug_products p
      LEFT JOIN whodrug_atc a ON p.version_id = a.version_id AND p.atc_code = a.atc_code
      WHERE p.version_id = ? AND p.atc_code LIKE ?
      ORDER BY p.drug_name
      LIMIT ?
    `;

    return this.db.prepare(query).all(targetVersionId, atcPattern, limit) as WHODrugSearchResult[];
  }

  /**
   * Get ATC hierarchy for a drug code
   */
  getATCHierarchy(drugCode: string, versionId?: number): ATCCode[] {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    // Get the product's ATC code
    const productQuery = `
      SELECT atc_code FROM whodrug_products
      WHERE version_id = ? AND drug_code = ?
    `;
    const product = this.db.prepare(productQuery).get(targetVersionId, drugCode) as { atc_code: string } | undefined;

    if (!product || !product.atc_code) return [];

    // Build hierarchy by walking up the tree
    const hierarchy: ATCCode[] = [];
    let currentCode: string | null = product.atc_code;

    while (currentCode) {
      const atcQuery = `
        SELECT atc_code as atcCode, atc_name as atcName, level, parent_code as parentCode
        FROM whodrug_atc
        WHERE version_id = ? AND atc_code = ?
      `;
      const atc = this.db.prepare(atcQuery).get(targetVersionId, currentCode) as ATCCode | undefined;

      if (atc) {
        hierarchy.unshift(atc); // Add to beginning to get top-down order
        currentCode = atc.parentCode || null;
      } else {
        break;
      }
    }

    return hierarchy;
  }

  /**
   * Search ingredients
   */
  searchIngredients(query: string, versionId?: number, limit = 20): WHODrugIngredient[] {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const activeVersion = this.getActiveVersion();
      if (!activeVersion) return [];
      targetVersionId = activeVersion.id;
    }

    const searchPattern = `%${query}%`;

    const searchQuery = `
      SELECT ingredient_id as ingredientId, name
      FROM whodrug_ingredients
      WHERE version_id = ? AND LOWER(name) LIKE LOWER(?)
      ORDER BY name
      LIMIT ?
    `;

    return this.db.prepare(searchQuery).all(targetVersionId, searchPattern, limit) as WHODrugIngredient[];
  }
}
