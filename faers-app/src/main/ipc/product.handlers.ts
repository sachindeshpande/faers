/**
 * Product IPC Handlers
 * Phase 4: Product Master for PSR Management
 */

import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { ProductService } from '../services/productService';
import { AuthService } from '../services/authService';
import { IPC_CHANNELS, IPCResponse } from '../../shared/types/ipc.types';
import type {
  Product,
  ProductListItem,
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilter,
  ProductListResponse
} from '../../shared/types/product.types';
import { getCurrentSessionId } from './auth.handlers';

/**
 * Get the current user and permissions from session
 */
function getCurrentAuthContext(): {
  user: { id: string; username: string } | null;
  permissions: string[];
  sessionId: string | null;
} {
  const sessionId = getCurrentSessionId();
  if (!sessionId) {
    return { user: null, permissions: [], sessionId: null };
  }

  try {
    const db = getDatabase();
    const authService = new AuthService(db);
    const validation = authService.validateSession(sessionId);

    if (!validation.valid || !validation.user) {
      return { user: null, permissions: [], sessionId: null };
    }

    return {
      user: {
        id: validation.user.id,
        username: validation.user.username
      },
      permissions: validation.permissions || [],
      sessionId
    };
  } catch {
    return { user: null, permissions: [], sessionId: null };
  }
}

/**
 * Register product IPC handlers
 */
export function registerProductHandlers(): void {
  const db = getDatabase();
  const productService = new ProductService(db);

  /**
   * Get all products with optional filtering
   */
  ipcMain.handle(
    IPC_CHANNELS.PRODUCT_LIST,
    async (_, filter?: ProductFilter): Promise<IPCResponse<ProductListResponse>> => {
      try {
        const result = productService.findAll(filter);
        return { success: true, data: result };
      } catch (error) {
        console.error('Product list error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get products'
        };
      }
    }
  );

  /**
   * Get product by ID
   */
  ipcMain.handle(
    IPC_CHANNELS.PRODUCT_GET,
    async (_, id: number): Promise<IPCResponse<Product>> => {
      try {
        const product = productService.findById(id);
        if (!product) {
          return { success: false, error: 'Product not found' };
        }
        return { success: true, data: product };
      } catch (error) {
        console.error('Product get error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get product'
        };
      }
    }
  );

  /**
   * Create a new product
   */
  ipcMain.handle(
    IPC_CHANNELS.PRODUCT_CREATE,
    async (_, data: CreateProductDTO): Promise<IPCResponse<Product>> => {
      try {
        const { user, sessionId } = getCurrentAuthContext();
        const product = productService.create(
          data,
          user?.id,
          user?.username,
          sessionId || undefined
        );
        return { success: true, data: product };
      } catch (error) {
        console.error('Product create error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create product'
        };
      }
    }
  );

  /**
   * Update a product
   */
  ipcMain.handle(
    IPC_CHANNELS.PRODUCT_UPDATE,
    async (_, request: { id: number; data: UpdateProductDTO }): Promise<IPCResponse<Product>> => {
      try {
        const { user, sessionId } = getCurrentAuthContext();
        const product = productService.update(
          request.id,
          request.data,
          user?.id,
          user?.username,
          sessionId || undefined
        );
        return { success: true, data: product };
      } catch (error) {
        console.error('Product update error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update product'
        };
      }
    }
  );

  /**
   * Delete (deactivate) a product
   */
  ipcMain.handle(
    IPC_CHANNELS.PRODUCT_DELETE,
    async (_, id: number): Promise<IPCResponse<void>> => {
      try {
        const { user, sessionId } = getCurrentAuthContext();
        productService.deactivate(
          id,
          user?.id,
          user?.username,
          sessionId || undefined
        );
        return { success: true };
      } catch (error) {
        console.error('Product delete error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete product'
        };
      }
    }
  );

  /**
   * Search products by name or application number
   */
  ipcMain.handle(
    IPC_CHANNELS.PRODUCT_SEARCH,
    async (_, query: string, limit?: number): Promise<IPCResponse<ProductListItem[]>> => {
      try {
        const products = productService.search(query, limit);
        return { success: true, data: products };
      } catch (error) {
        console.error('Product search error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to search products'
        };
      }
    }
  );
}
