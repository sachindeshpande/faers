/**
 * Search Panel Component
 * Main search interface with fulltext and advanced search tabs
 */

import React, { useEffect, useState } from 'react';
import {
  Input,
  Button,
  Tabs,
  Space,
  Card,
  Empty,
  Spin,
  Alert
} from 'antd';
import { SearchOutlined, FilterOutlined, StarOutlined } from '@ant-design/icons';
import { useSearchStore } from '../../stores/searchStore';
import { AdvancedSearchBuilder } from './AdvancedSearchBuilder';
import { SearchResultsTable } from './SearchResultsTable';
import { SavedSearchList } from './SavedSearchList';

const { Search } = Input;

interface SearchPanelProps {
  onSelectCase?: (caseId: string) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onSelectCase }) => {
  const [activeTab, setActiveTab] = useState('fulltext');

  const {
    searchQuery,
    results,
    isSearching,
    error,
    currentPage,
    pageSize,
    searchFulltext,
    searchAdvanced,
    clearSearch,
    setPage,
    loadSearchableFields,
    loadSavedSearches
  } = useSearchStore();

  // Load searchable fields and saved searches on mount
  useEffect(() => {
    loadSearchableFields();
    loadSavedSearches();
  }, [loadSearchableFields, loadSavedSearches]);

  const handleFulltextSearch = (value: string) => {
    if (value.trim()) {
      searchFulltext(value);
    }
  };

  const handleAdvancedSearch = () => {
    searchAdvanced();
  };

  const handlePageChange = (page: number) => {
    setPage(page);
    if (activeTab === 'fulltext' && searchQuery) {
      searchFulltext(searchQuery, page);
    } else if (activeTab === 'advanced') {
      searchAdvanced(undefined, page);
    }
  };

  const handleClear = () => {
    clearSearch();
  };

  const tabItems = [
    {
      key: 'fulltext',
      label: (
        <span>
          <SearchOutlined />
          Quick Search
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Search
            placeholder="Search cases by ID, patient, product, reaction..."
            allowClear
            enterButton="Search"
            size="large"
            value={searchQuery}
            onChange={(e) => useSearchStore.getState().setSearchQuery(e.target.value)}
            onSearch={handleFulltextSearch}
            style={{ maxWidth: 600 }}
          />
          <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
            Searches across case ID, safety report ID, patient initials, product names, reaction terms, and reporter information.
          </div>
        </div>
      )
    },
    {
      key: 'advanced',
      label: (
        <span>
          <FilterOutlined />
          Advanced Search
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <AdvancedSearchBuilder />
          <Space style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleAdvancedSearch}
              loading={isSearching}
            >
              Search
            </Button>
            <Button onClick={handleClear}>Clear</Button>
          </Space>
        </div>
      )
    },
    {
      key: 'saved',
      label: (
        <span>
          <StarOutlined />
          Saved Searches
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <SavedSearchList />
        </div>
      )
    }
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* Error display */}
      {error && (
        <Alert
          message="Search Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Results */}
      <Card
        title={
          results
            ? `Search Results (${results.total} cases found)`
            : 'Search Results'
        }
        size="small"
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, overflow: 'auto', padding: 0 }}
      >
        {isSearching ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Spin size="large" tip="Searching..." />
          </div>
        ) : results ? (
          <SearchResultsTable
            results={results}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onSelectCase={onSelectCase}
          />
        ) : (
          <Empty
            description="Enter a search query to find cases"
            style={{ padding: 48 }}
          />
        )}
      </Card>
    </div>
  );
};
