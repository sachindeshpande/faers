/**
 * Product Types - Phase 4: Product Master for PSR Management
 */

// Application type for NDA/BLA/ANDA
export type ApplicationType = 'NDA' | 'BLA' | 'ANDA';

// Marketing status
export type MarketingStatus = 'approved' | 'withdrawn' | 'pending';

/**
 * Product entity - represents a drug product in the system
 */
export interface Product {
  id: number;
  productName: string;
  activeIngredient?: string;
  applicationType?: ApplicationType;
  applicationNumber?: string;
  usApprovalDate?: string;
  marketingStatus: MarketingStatus;
  companyName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Product list item for table display
 */
export interface ProductListItem {
  id: number;
  productName: string;
  activeIngredient?: string;
  applicationType?: ApplicationType;
  applicationNumber?: string;
  usApprovalDate?: string;
  marketingStatus: MarketingStatus;
  companyName?: string;
  isActive: boolean;
  // Computed fields for display
  caseCount?: number;
  nextPsrDueDate?: string;
}

/**
 * DTO for creating a new product
 */
export interface CreateProductDTO {
  productName: string;
  activeIngredient?: string;
  applicationType?: ApplicationType;
  applicationNumber?: string;
  usApprovalDate?: string;
  marketingStatus?: MarketingStatus;
  companyName?: string;
}

/**
 * DTO for updating a product
 */
export interface UpdateProductDTO {
  productName?: string;
  activeIngredient?: string;
  applicationType?: ApplicationType;
  applicationNumber?: string;
  usApprovalDate?: string;
  marketingStatus?: MarketingStatus;
  companyName?: string;
  isActive?: boolean;
}

/**
 * Product filter options for list queries
 */
export interface ProductFilter {
  search?: string;
  applicationType?: ApplicationType;
  marketingStatus?: MarketingStatus;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Product list response
 */
export interface ProductListResponse {
  products: ProductListItem[];
  total: number;
}
