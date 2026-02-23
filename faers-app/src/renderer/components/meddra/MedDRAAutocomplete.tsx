/**
 * MedDRA Autocomplete Component
 * Search and select MedDRA terms with autocomplete
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AutoComplete, Input, Typography, Space, Tag, Spin, Empty } from 'antd';
import { SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useMedDRAStore } from '../../stores/meddraStore';
import type { MedDRASearchResult, MedDRACoding } from '../../../shared/types/meddra.types';
import debounce from 'lodash/debounce';

const { Text } = Typography;

interface MedDRAAutocompleteProps {
  value?: MedDRACoding;
  onChange?: (coding: MedDRACoding | null) => void;
  verbatimText?: string;
  placeholder?: string;
  disabled?: boolean;
  codedBy?: string;
  style?: React.CSSProperties;
}

export const MedDRAAutocomplete: React.FC<MedDRAAutocompleteProps> = ({
  value,
  onChange,
  verbatimText = '',
  placeholder = 'Search MedDRA terms...',
  disabled = false,
  codedBy,
  style
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [options, setOptions] = useState<Array<{ value: string; label: React.ReactNode; result: MedDRASearchResult }>>([]);

  const { searchResults, searchLoading, search, clearSearch, createCoding, activeVersion, loadActiveVersion } = useMedDRAStore();

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
        search({ query, limit: 20 });
      } else {
        clearSearch();
      }
    }, 300),
    [search, clearSearch]
  );

  // Update options when search results change
  useEffect(() => {
    const newOptions = searchResults.map(result => ({
      value: `${result.lltCode}`,
      label: (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Space>
            <Text strong>{result.lltName}</Text>
            {!result.isCurrent && <Tag color="warning">Non-current</Tag>}
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            PT: {result.ptName} | SOC: {result.socName}
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

  const handleSelect = async (_value: string, option: { result: MedDRASearchResult }) => {
    const selectedResult = option.result;
    const text = verbatimText || searchValue || selectedResult.lltName;

    // Create full coding with hierarchy
    const coding = await createCoding(selectedResult.lltCode, text, codedBy);

    if (coding) {
      setSearchValue(coding.lltName);
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
          value={value.ptName}
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
            PT: {value.ptCode} | SOC: {value.socName} | v{value.meddraVersion}
          </Text>
        </div>
      </div>
    );
  }

  if (!activeVersion) {
    return (
      <Input
        placeholder="No MedDRA version available"
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
          <Empty description="No terms found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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

export default MedDRAAutocomplete;
