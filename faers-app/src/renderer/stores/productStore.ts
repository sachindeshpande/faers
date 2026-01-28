/**
 * Product Store - Zustand state management for product administration
 * Phase 4: Non-Expedited Reports, Follow-Ups & Periodic Safety Reports
 */

import { create } from 'zustand';
import type {
  Product,
  ProductListItem,
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilter
} from '../../shared/types/product.types';

interface ProductState {
  // Product list state
  products: ProductListItem[];
  totalProducts: number;
  selectedProduct: Product | null;
  isLoading: boolean;
  error: string | null;

  // Filter state
  filter: ProductFilter;

  // Modal state
  isFormModalOpen: boolean;
  editingProductId: number | null;

  // Search state (for autocomplete)
  searchResults: ProductListItem[];
  isSearching: boolean;

  // Actions
  fetchProducts: (filter?: ProductFilter) => Promise<void>;
  fetchProduct: (id: number) => Promise<Product | null>;
  createProduct: (data: CreateProductDTO) => Promise<{ success: boolean; error?: string; product?: Product }>;
  updateProduct: (id: number, data: UpdateProductDTO) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: number) => Promise<{ success: boolean; error?: string }>;
  searchProducts: (query: string, limit?: number) => Promise<void>;
  setFilter: (filter: Partial<ProductFilter>) => void;
  clearFilter: () => void;
  openFormModal: (productId?: number) => void;
  closeFormModal: () => void;
  clearError: () => void;
  clearSelectedProduct: () => void;
  clearSearchResults: () => void;
}

const defaultFilter: ProductFilter = {
  search: undefined,
  applicationType: undefined,
  marketingStatus: undefined,
  isActive: true, // Default to showing only active products
  limit: 50,
  offset: 0
};

export const useProductStore = create<ProductState>((set, get) => ({
  // Initial state
  products: [],
  totalProducts: 0,
  selectedProduct: null,
  isLoading: false,
  error: null,
  filter: { ...defaultFilter },
  isFormModalOpen: false,
  editingProductId: null,
  searchResults: [],
  isSearching: false,

  // Actions
  fetchProducts: async (filter?: ProductFilter) => {
    set({ isLoading: true, error: null });

    try {
      const activeFilter = filter || get().filter;
      const response = await window.electronAPI.getProducts(activeFilter);

      if (response.success && response.data) {
        set({
          products: response.data.products,
          totalProducts: response.data.total,
          isLoading: false,
          filter: activeFilter
        });
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to fetch products'
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products'
      });
    }
  },

  fetchProduct: async (id: number) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.getProduct(id);

      if (response.success && response.data) {
        set({ selectedProduct: response.data, isLoading: false });
        return response.data;
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to fetch product'
        });
        return null;
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product'
      });
      return null;
    }
  },

  createProduct: async (data: CreateProductDTO) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.createProduct(data);

      if (response.success && response.data) {
        // Refresh the list
        await get().fetchProducts();
        set({ isLoading: false });
        return { success: true, product: response.data };
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to create product'
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  updateProduct: async (id: number, data: UpdateProductDTO) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.updateProduct(id, data);

      if (response.success) {
        // Refresh the list and update selected if same
        await get().fetchProducts();
        if (get().selectedProduct?.id === id) {
          await get().fetchProduct(id);
        }
        set({ isLoading: false });
        return { success: true };
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to update product'
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update product';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  deleteProduct: async (id: number) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.deleteProduct(id);

      if (response.success) {
        // Refresh the list
        await get().fetchProducts();
        // Clear selected if same
        if (get().selectedProduct?.id === id) {
          set({ selectedProduct: null });
        }
        set({ isLoading: false });
        return { success: true };
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to delete product'
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete product';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  searchProducts: async (query: string, limit: number = 20) => {
    if (!query || query.trim().length < 2) {
      set({ searchResults: [] });
      return;
    }

    set({ isSearching: true });

    try {
      const response = await window.electronAPI.searchProducts(query, limit);

      if (response.success && response.data) {
        set({ searchResults: response.data, isSearching: false });
      } else {
        set({ searchResults: [], isSearching: false });
      }
    } catch (error) {
      set({ searchResults: [], isSearching: false });
    }
  },

  setFilter: (filter: Partial<ProductFilter>) => {
    const currentFilter = get().filter;
    const newFilter = { ...currentFilter, ...filter, offset: 0 }; // Reset offset when filter changes
    set({ filter: newFilter });
    get().fetchProducts(newFilter);
  },

  clearFilter: () => {
    set({ filter: { ...defaultFilter } });
    get().fetchProducts(defaultFilter);
  },

  openFormModal: (productId?: number) => {
    set({
      isFormModalOpen: true,
      editingProductId: productId || null
    });
    if (productId) {
      get().fetchProduct(productId);
    } else {
      set({ selectedProduct: null });
    }
  },

  closeFormModal: () => {
    set({
      isFormModalOpen: false,
      editingProductId: null,
      selectedProduct: null
    });
  },

  clearError: () => {
    set({ error: null });
  },

  clearSelectedProduct: () => {
    set({ selectedProduct: null });
  },

  clearSearchResults: () => {
    set({ searchResults: [] });
  }
}));

// Selector hooks for granular subscriptions
export const useProducts = () => useProductStore((state) => ({
  products: state.products,
  totalProducts: state.totalProducts,
  isLoading: state.isLoading,
  error: state.error,
  filter: state.filter
}));

export const useSelectedProduct = () => useProductStore((state) => ({
  product: state.selectedProduct,
  isLoading: state.isLoading
}));

export const useProductActions = () => useProductStore((state) => ({
  fetchProducts: state.fetchProducts,
  fetchProduct: state.fetchProduct,
  createProduct: state.createProduct,
  updateProduct: state.updateProduct,
  deleteProduct: state.deleteProduct,
  searchProducts: state.searchProducts,
  setFilter: state.setFilter,
  clearFilter: state.clearFilter,
  openFormModal: state.openFormModal,
  closeFormModal: state.closeFormModal,
  clearError: state.clearError,
  clearSelectedProduct: state.clearSelectedProduct,
  clearSearchResults: state.clearSearchResults
}));

export const useProductModal = () => useProductStore((state) => ({
  isOpen: state.isFormModalOpen,
  editingProductId: state.editingProductId,
  openFormModal: state.openFormModal,
  closeFormModal: state.closeFormModal
}));

export const useProductSearch = () => useProductStore((state) => ({
  searchResults: state.searchResults,
  isSearching: state.isSearching,
  searchProducts: state.searchProducts,
  clearSearchResults: state.clearSearchResults
}));
