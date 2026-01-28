/**
 * ProductSelector Component
 * Phase 4: Product Master for PSR Management
 *
 * Autocomplete dropdown for selecting a product.
 * Used in case forms to link cases to products.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AutoComplete, Input, Space, Tag, Spin, Button } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProductListItem } from '../../../shared/types/product.types';
import { useProductSearch, useProductModal } from '../../stores/productStore';
import { debounce } from 'lodash';

interface ProductSelectorProps {
  value?: number;
  onChange?: (productId: number | undefined, product?: ProductListItem) => void;
  disabled?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
  showAddButton?: boolean;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Search for a product...',
  style,
  allowClear = true,
  showAddButton = true
}) => {
  const { searchResults, isSearching, searchProducts, clearSearchResults } = useProductSearch();
  const { openFormModal } = useProductModal();

  const [inputValue, setInputValue] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query && query.trim().length >= 2) {
        searchProducts(query, 10);
      } else {
        clearSearchResults();
      }
    }, 300),
    []
  );

  // Load selected product info when value changes
  useEffect(() => {
    if (value && !selectedProduct) {
      // Try to find in search results first
      const found = searchResults.find(p => p.id === value);
      if (found) {
        setSelectedProduct(found);
        setInputValue(formatProductLabel(found));
      } else {
        // Fetch the product info
        window.electronAPI.getProduct(value).then(response => {
          if (response.success && response.data) {
            const product = response.data as ProductListItem;
            setSelectedProduct(product);
            setInputValue(formatProductLabel(product));
          }
        });
      }
    } else if (!value) {
      setSelectedProduct(null);
      setInputValue('');
    }
  }, [value]);

  // Format product label for display
  const formatProductLabel = (product: ProductListItem): string => {
    let label = product.productName;
    if (product.applicationNumber) {
      label += ` (${product.applicationType || 'App'} ${product.applicationNumber})`;
    }
    return label;
  };

  // Handle search input change
  const handleSearch = (searchText: string) => {
    setInputValue(searchText);
    debouncedSearch(searchText);
  };

  // Handle selection
  const handleSelect = (_productId: string, option: { product: ProductListItem }) => {
    const product = option.product;
    setSelectedProduct(product);
    setInputValue(formatProductLabel(product));
    clearSearchResults();
    onChange?.(product.id, product);
  };

  // Handle clear
  const handleClear = () => {
    setInputValue('');
    setSelectedProduct(null);
    clearSearchResults();
    onChange?.(undefined);
  };

  // Handle add new product
  const handleAddProduct = () => {
    openFormModal();
  };

  // Map search results to autocomplete options
  const options = searchResults.map(product => ({
    value: product.id.toString(),
    product,
    label: (
      <Space direction="vertical" size={0} style={{ width: '100%' }}>
        <div style={{ fontWeight: 500 }}>{product.productName}</div>
        <Space size="small">
          {product.applicationType && (
            <Tag color="blue" style={{ fontSize: 11 }}>{product.applicationType}</Tag>
          )}
          {product.applicationNumber && (
            <span style={{ fontSize: 12, color: '#666' }}>
              #{product.applicationNumber}
            </span>
          )}
          {product.activeIngredient && (
            <span style={{ fontSize: 12, color: '#999' }}>
              {product.activeIngredient}
            </span>
          )}
        </Space>
      </Space>
    )
  }));

  return (
    <Space.Compact style={{ width: '100%', ...style }}>
      <AutoComplete
        value={inputValue}
        options={options}
        onSearch={handleSearch}
        onSelect={handleSelect}
        onClear={handleClear}
        disabled={disabled}
        style={{ flex: 1 }}
        allowClear={allowClear}
        notFoundContent={
          isSearching ? (
            <Spin size="small" />
          ) : inputValue && inputValue.length >= 2 ? (
            <span>No products found</span>
          ) : (
            <span>Type at least 2 characters to search</span>
          )
        }
      >
        <Input
          placeholder={placeholder}
          prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          suffix={isSearching ? <Spin size="small" /> : null}
        />
      </AutoComplete>
      {showAddButton && !disabled && (
        <Button
          icon={<PlusOutlined />}
          onClick={handleAddProduct}
          title="Add new product"
        />
      )}
    </Space.Compact>
  );
};

export default ProductSelector;
