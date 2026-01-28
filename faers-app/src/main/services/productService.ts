/**
 * Product Service
 * Handles business logic for product management
 */

import type {
  Product,
  ProductListItem,
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilter,
  ProductListResponse
} from '../../shared/types/product.types';
import { ProductRepository } from '../database/repositories/product.repository';
import { AuditService } from './auditService';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

export class ProductService {
  private productRepo: ProductRepository;
  private auditService: AuditService;

  constructor(db: DatabaseInstance) {
    this.productRepo = new ProductRepository(db);
    this.auditService = new AuditService(db);
  }

  /**
   * Create a new product
   */
  create(
    data: CreateProductDTO,
    userId?: string,
    username?: string,
    sessionId?: string
  ): Product {
    // Validate required fields
    if (!data.productName || data.productName.trim() === '') {
      throw new Error('Product name is required');
    }

    // Check for duplicate application number if provided
    if (data.applicationNumber) {
      const existing = this.productRepo.findByApplicationNumber(data.applicationNumber);
      if (existing) {
        throw new Error(`A product with application number ${data.applicationNumber} already exists`);
      }
    }

    const product = this.productRepo.create(data);

    // Audit log
    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'product_created',
      entityType: 'product',
      entityId: product.id.toString(),
      details: {
        productName: product.productName,
        applicationNumber: product.applicationNumber
      }
    });

    return product;
  }

  /**
   * Get product by ID
   */
  findById(id: number): Product | null {
    return this.productRepo.findById(id);
  }

  /**
   * Get product by application number
   */
  findByApplicationNumber(applicationNumber: string): Product | null {
    return this.productRepo.findByApplicationNumber(applicationNumber);
  }

  /**
   * Get all products with optional filtering
   */
  findAll(filter?: ProductFilter): ProductListResponse {
    return this.productRepo.findAll(filter);
  }

  /**
   * Update a product
   */
  update(
    id: number,
    data: UpdateProductDTO,
    userId?: string,
    username?: string,
    sessionId?: string
  ): Product {
    const existing = this.productRepo.findById(id);
    if (!existing) {
      throw new Error('Product not found');
    }

    // Check for duplicate application number if changing
    if (data.applicationNumber && data.applicationNumber !== existing.applicationNumber) {
      const duplicate = this.productRepo.findByApplicationNumber(data.applicationNumber);
      if (duplicate) {
        throw new Error(`A product with application number ${data.applicationNumber} already exists`);
      }
    }

    const updated = this.productRepo.update(id, data);
    if (!updated) {
      throw new Error('Failed to update product');
    }

    // Audit log - track field changes
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const [key, value] of Object.entries(data)) {
      const existingValue = existing[key as keyof Product];
      if (existingValue !== value) {
        changes[key] = { old: existingValue, new: value };
      }
    }

    if (Object.keys(changes).length > 0) {
      this.auditService.log({
        userId,
        username,
        sessionId,
        actionType: 'product_updated',
        entityType: 'product',
        entityId: id.toString(),
        details: { changes }
      });
    }

    return updated;
  }

  /**
   * Soft delete a product (deactivate)
   */
  deactivate(
    id: number,
    userId?: string,
    username?: string,
    sessionId?: string
  ): boolean {
    const existing = this.productRepo.findById(id);
    if (!existing) {
      throw new Error('Product not found');
    }

    const success = this.productRepo.softDelete(id);

    if (success) {
      this.auditService.log({
        userId,
        username,
        sessionId,
        actionType: 'product_deactivated',
        entityType: 'product',
        entityId: id.toString(),
        details: { productName: existing.productName }
      });
    }

    return success;
  }

  /**
   * Reactivate a product
   */
  reactivate(
    id: number,
    userId?: string,
    username?: string,
    sessionId?: string
  ): Product {
    const existing = this.productRepo.findById(id);
    if (!existing) {
      throw new Error('Product not found');
    }

    const updated = this.productRepo.update(id, { isActive: true });
    if (!updated) {
      throw new Error('Failed to reactivate product');
    }

    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'product_reactivated',
      entityType: 'product',
      entityId: id.toString(),
      details: { productName: existing.productName }
    });

    return updated;
  }

  /**
   * Search products by name or application number
   */
  search(query: string, limit: number = 20): ProductListItem[] {
    return this.productRepo.search(query, limit);
  }

  /**
   * Get count of cases linked to a product
   */
  getCaseCount(productId: number): number {
    return this.productRepo.getCaseCount(productId);
  }

  /**
   * Check if a product has any linked cases
   */
  hasCases(productId: number): boolean {
    return this.getCaseCount(productId) > 0;
  }
}
