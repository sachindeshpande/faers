/**
 * Product Repository
 * Handles database operations for products
 */

import type {
  Product,
  ProductListItem,
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilter
} from '../../../shared/types/product.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

interface ProductRow {
  id: number;
  product_name: string;
  active_ingredient: string | null;
  application_type: string | null;
  application_number: string | null;
  us_approval_date: string | null;
  marketing_status: string;
  company_name: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class ProductRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Create a new product
   */
  create(data: CreateProductDTO): Product {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO products (
        product_name, active_ingredient, application_type, application_number,
        us_approval_date, marketing_status, company_name, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const result = stmt.run(
      data.productName,
      data.activeIngredient || null,
      data.applicationType || null,
      data.applicationNumber || null,
      data.usApprovalDate || null,
      data.marketingStatus || 'approved',
      data.companyName || null,
      now,
      now
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * Find product by ID
   */
  findById(id: number): Product | null {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
    if (!row) return null;
    return this.mapRowToProduct(row);
  }

  /**
   * Find product by application number
   */
  findByApplicationNumber(applicationNumber: string): Product | null {
    const row = this.db.prepare(
      'SELECT * FROM products WHERE application_number = ?'
    ).get(applicationNumber) as ProductRow | undefined;
    if (!row) return null;
    return this.mapRowToProduct(row);
  }

  /**
   * Get all products with optional filtering
   */
  findAll(filter?: ProductFilter): { products: ProductListItem[]; total: number } {
    let whereClause = '1=1';
    const params: (string | number)[] = [];

    if (filter?.isActive !== undefined) {
      whereClause += ' AND is_active = ?';
      params.push(filter.isActive ? 1 : 0);
    }

    if (filter?.applicationType) {
      whereClause += ' AND application_type = ?';
      params.push(filter.applicationType);
    }

    if (filter?.marketingStatus) {
      whereClause += ' AND marketing_status = ?';
      params.push(filter.marketingStatus);
    }

    if (filter?.search) {
      whereClause += ' AND (product_name LIKE ? OR application_number LIKE ? OR active_ingredient LIKE ? OR company_name LIKE ?)';
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countRow = this.db.prepare(
      `SELECT COUNT(*) as count FROM products WHERE ${whereClause}`
    ).get(...params) as { count: number };
    const total = countRow.count;

    // Get paginated results
    let query = `SELECT * FROM products WHERE ${whereClause} ORDER BY product_name`;
    if (filter?.limit) {
      query += ` LIMIT ${filter.limit}`;
      if (filter?.offset) {
        query += ` OFFSET ${filter.offset}`;
      }
    }

    const rows = this.db.prepare(query).all(...params) as ProductRow[];
    const products = rows.map(row => this.mapRowToProductListItem(row));

    return { products, total };
  }

  /**
   * Update a product
   */
  update(id: number, data: UpdateProductDTO): Product | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const params: (string | number | null)[] = [now];

    if (data.productName !== undefined) {
      updates.push('product_name = ?');
      params.push(data.productName);
    }
    if (data.activeIngredient !== undefined) {
      updates.push('active_ingredient = ?');
      params.push(data.activeIngredient || null);
    }
    if (data.applicationType !== undefined) {
      updates.push('application_type = ?');
      params.push(data.applicationType || null);
    }
    if (data.applicationNumber !== undefined) {
      updates.push('application_number = ?');
      params.push(data.applicationNumber || null);
    }
    if (data.usApprovalDate !== undefined) {
      updates.push('us_approval_date = ?');
      params.push(data.usApprovalDate || null);
    }
    if (data.marketingStatus !== undefined) {
      updates.push('marketing_status = ?');
      params.push(data.marketingStatus);
    }
    if (data.companyName !== undefined) {
      updates.push('company_name = ?');
      params.push(data.companyName || null);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }

    params.push(id);

    const stmt = this.db.prepare(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...params);

    return this.findById(id);
  }

  /**
   * Soft delete a product (sets is_active to 0)
   */
  softDelete(id: number): boolean {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      'UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?'
    );
    const result = stmt.run(now, id);
    return result.changes > 0;
  }

  /**
   * Hard delete a product (only if no cases are linked)
   */
  delete(id: number): boolean {
    // Check if any cases are linked to this product
    const caseCount = this.db.prepare(
      'SELECT COUNT(*) as count FROM cases WHERE product_id = ?'
    ).get(id) as { count: number };

    if (caseCount.count > 0) {
      throw new Error('Cannot delete product with linked cases. Use soft delete instead.');
    }

    const stmt = this.db.prepare('DELETE FROM products WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Search products by name or application number
   */
  search(query: string, limit: number = 20): ProductListItem[] {
    const searchTerm = `%${query}%`;
    const rows = this.db.prepare(`
      SELECT * FROM products
      WHERE is_active = 1
        AND (product_name LIKE ? OR application_number LIKE ? OR active_ingredient LIKE ?)
      ORDER BY product_name
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, limit) as ProductRow[];

    return rows.map(row => this.mapRowToProductListItem(row));
  }

  /**
   * Get count of cases linked to a product
   */
  getCaseCount(productId: number): number {
    const result = this.db.prepare(
      'SELECT COUNT(*) as count FROM cases WHERE product_id = ? AND deleted_at IS NULL'
    ).get(productId) as { count: number };
    return result.count;
  }

  /**
   * Map database row to Product entity
   */
  private mapRowToProduct(row: ProductRow): Product {
    return {
      id: row.id,
      productName: row.product_name,
      activeIngredient: row.active_ingredient || undefined,
      applicationType: row.application_type as Product['applicationType'],
      applicationNumber: row.application_number || undefined,
      usApprovalDate: row.us_approval_date || undefined,
      marketingStatus: row.marketing_status as Product['marketingStatus'],
      companyName: row.company_name || undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map database row to ProductListItem
   */
  private mapRowToProductListItem(row: ProductRow): ProductListItem {
    return {
      id: row.id,
      productName: row.product_name,
      activeIngredient: row.active_ingredient || undefined,
      applicationType: row.application_type as ProductListItem['applicationType'],
      applicationNumber: row.application_number || undefined,
      usApprovalDate: row.us_approval_date || undefined,
      marketingStatus: row.marketing_status as ProductListItem['marketingStatus'],
      companyName: row.company_name || undefined,
      isActive: row.is_active === 1,
      caseCount: this.getCaseCount(row.id)
    };
  }
}
