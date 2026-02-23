/**
 * WHO Drug Autocomplete Component
 * Search and select WHO Drug products with autocomplete
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AutoComplete, Input, Typography, Space, Tag, Spin, Empty } from 'antd';
import { SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useWHODrugStore } from '../../stores/whodrugStore';
import type { WHODrugSearchResult, WHODrugCoding } from '../../../shared/types/whodrug.types';
import debounce from 'lodash/debounce';

const { Text } = Typography;

interface WHODrugAutocompleteProps {
  value?: WHODrugCoding;
  onChange?: (coding: WHODrugCoding | null) => void;
  verbatimText?: string;
  placeholder?: string;
  disabled?: boolean;
  codedBy?: string;
  countryCode?: string;
  style?: React.CSSProperties;
}

export const WHODrugAutocomplete: React.FC<WHODrugAutocompleteProps> = ({
  value,
  onChange,
  verbatimText = '',
  placeholder = 'Search drug products...',
  disabled = false,
  codedBy,
  countryCode,
  style
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [options, setOptions] = useState<Array<{ value: string; label: React.ReactNode; result: WHODrugSearchResult }>>([]);

  const { searchResults, searchLoading, search, clearSearch, createCoding, activeVersion, loadActiveVersion } = useWHODrugStore();

  // Load active version on mount
  useEffect(() => {
    if (!activeVersion) {
      loadActiveVersion();
    }
  }, [activeVersion, loadActiveVersion]);

  // Update search value when verbatim text changes
  useEffect(() => {
    if (verbatimText && !value) {
      setSearchValue(verbatimText);
    }
  }, [verbatimText, value]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.length >= 2) {
        search({ query, limit: 20, countryCode });
      } else {
        clearSearch();
      }
    }, 300),
    [search, clearSearch, countryCode]
  );

  // Update options when search results change
  useEffect(() => {
    const newOptions = searchResults.map(result => ({
      value: result.drugCode,
      label: (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Space>
            <Text strong>{result.drugName}</Text>
            {result.countryCode && <Tag style={{ fontSize: 10 }}>{result.countryCode}</Tag>}
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {result.atcCode && `ATC: ${result.atcCode} | `}
            {result.company || 'Unknown manufacturer'}
          </Text>
        </Space>
      ),
      result
    }));
    setOptions(newOptions);
  }, [searchResults]);

  const handleSearch = (query: string) => {
    setSearchValue(query);
    debouncedSearch(query);
  };

  const handleSelect = async (_value: string, option: { result: WHODrugSearchResult }) => {
    const selectedResult = option.result;
    const text = verbatimText || searchValue || selectedResult.drugName;

    // Create full coding
    const coding = await createCoding(selectedResult.drugCode, text, codedBy);

    if (coding) {
      setSearchValue(coding.drugName);
      onChange?.(coding);
    }
  };

  const handleClear = () => {
    setSearchValue('');
    clearSearch();
    onChange?.(null);
  };

  // Display current coded value
  if (value) {
    return (
      <div style={{ ...style, position: 'relative' }}>
        <Input
          value={value.drugName}
          disabled={disabled}
          suffix={
            <Space>
              <Tag color="green">
                <CheckCircleOutlined /> Coded
              </Tag>
              {!disabled && (
                <Text
                  type="secondary"
                  style={{ cursor: 'pointer', fontSize: '12px' }}
                  onClick={handleClear}
                >
                  Clear
                </Text>
              )}
            </Space>
          }
          style={{ ...style }}
        />
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Code: {value.drugCode} | ATC: {value.atcCode || 'N/A'} | v{value.whodrugVersion}
          </Text>
        </div>
      </div>
    );
  }

  if (!activeVersion) {
    return (
      <Input
        placeholder="No WHO Drug version available"
        disabled
        style={style}
        prefix={<SearchOutlined style={{ color: '#d9d9d9' }} />}
      />
    );
  }

  return (
    <AutoComplete
      value={searchValue}
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      disabled={disabled}
      style={{ width: '100%', ...style }}
      notFoundContent={
        searchLoading ? (
          <Spin size="small" />
        ) : searchValue.length >= 2 ? (
          <Empty description="No products found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : null
      }
    >
      <Input
        placeholder={placeholder}
        prefix={<SearchOutlined />}
        suffix={searchLoading && <Spin size="small" />}
        allowClear
      />
    </AutoComplete>
  );
};

export default WHODrugAutocomplete;
