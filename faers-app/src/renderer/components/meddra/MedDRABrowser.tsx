/**
 * MedDRA Browser Component
 * Tree-based hierarchy browser for MedDRA dictionary
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Tree, Input, Card, Spin, Space, Tag, Typography, Descriptions, Button, Empty } from 'antd';
import { SearchOutlined, PartitionOutlined, CheckOutlined } from '@ant-design/icons';
import { useMedDRAStore } from '../../stores/meddraStore';
import type { MedDRATreeNode, MedDRAHierarchy, MedDRACoding } from '../../../shared/types/meddra.types';
import { MEDDRA_LEVEL_LABELS } from '../../../shared/types/meddra.types';
import debounce from 'lodash/debounce';

const { Text, Title } = Typography;
const { Search } = Input;

interface MedDRABrowserProps {
  onSelect?: (coding: MedDRACoding) => void;
  selectable?: boolean;
  verbatimText?: string;
  codedBy?: string;
  height?: number | string;
}

export const MedDRABrowser: React.FC<MedDRABrowserProps> = ({
  onSelect,
  selectable = true,
  verbatimText = '',
  codedBy,
  height = 500
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedNode, setSelectedNode] = useState<MedDRATreeNode | null>(null);
  const [loadedTreeData, setLoadedTreeData] = useState<MedDRATreeNode[]>([]);

  const {
    treeData,
    expandedKeys,
    selectedHierarchy,
    browseLoading,
    searchResults,
    searchLoading,
    activeVersion,
    loadTreeChildren,
    setExpandedKeys,
    loadHierarchy,
    loadHierarchyForLLT,
    clearHierarchy,
    search,
    clearSearch,
    loadActiveVersion,
    createCoding
  } = useMedDRAStore();

  // Load active version and root nodes on mount
  useEffect(() => {
    if (!activeVersion) {
      loadActiveVersion();
    }
  }, [activeVersion, loadActiveVersion]);

  useEffect(() => {
    if (activeVersion) {
      loadTreeChildren({});
    }
  }, [activeVersion, loadTreeChildren]);

  useEffect(() => {
    setLoadedTreeData(treeData);
  }, [treeData]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.length >= 2) {
        search({ query, limit: 50 });
      } else {
        clearSearch();
      }
    }, 300),
    [search, clearSearch]
  );

  const handleSearch = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  // Load children on expand
  const handleLoadData = async (node: MedDRATreeNode): Promise<void> => {
    if (node.isLeaf || node.children) {
      return;
    }

    const children = await loadTreeChildren({
      parentCode: node.code,
      parentLevel: node.level
    });

    // Update tree data with children
    setLoadedTreeData(prevData => {
      const updateTreeNode = (nodes: MedDRATreeNode[]): MedDRATreeNode[] => {
        return nodes.map(n => {
          if (n.key === node.key) {
            return { ...n, children };
          }
          if (n.children) {
            return { ...n, children: updateTreeNode(n.children) };
          }
          return n;
        });
      };
      return updateTreeNode(prevData);
    });
  };

  const handleExpand = (keys: React.Key[]) => {
    setExpandedKeys(keys as string[]);
  };

  const handleNodeSelect = async (
    _keys: React.Key[],
    info: { node: MedDRATreeNode }
  ) => {
    const node = info.node;
    setSelectedNode(node);

    // Load hierarchy for the selected node
    if (node.level === 'pt') {
      await loadHierarchy(node.code);
    } else if (node.level === 'llt') {
      await loadHierarchyForLLT(node.code);
    } else {
      clearHierarchy();
    }
  };

  const handleSelectTerm = async () => {
    if (!selectedNode || !selectedHierarchy || selectedHierarchy.length === 0) {
      return;
    }

    const text = verbatimText || selectedNode.title;
    let coding: MedDRACoding | null = null;

    if (selectedNode.level === 'llt') {
      coding = await createCoding(selectedNode.code, text, codedBy);
    } else if (selectedNode.level === 'pt') {
      // For PT, create coding using the PT code directly
      const hierarchy = selectedHierarchy.find(h => h.isPrimaryPath) || selectedHierarchy[0];
      coding = {
        verbatimText: text,
        ptCode: hierarchy.pt.ptCode,
        ptName: hierarchy.pt.ptName,
        hltCode: hierarchy.hlt.hltCode,
        hltName: hierarchy.hlt.hltName,
        hlgtCode: hierarchy.hlgt.hlgtCode,
        hlgtName: hierarchy.hlgt.hlgtName,
        socCode: hierarchy.soc.socCode,
        socName: hierarchy.soc.socName,
        meddraVersion: activeVersion?.version || '',
        codedBy,
        codedAt: new Date().toISOString()
      };
    }

    if (coding && onSelect) {
      onSelect(coding);
    }
  };

  // Render search results
  const handleSearchResultClick = async (result: { lltCode: number; ptCode: number }) => {
    await loadHierarchyForLLT(result.lltCode);
    setSelectedNode({
      key: `llt-${result.lltCode}`,
      title: '',
      code: result.lltCode,
      level: 'llt',
      isLeaf: true
    });
  };

  const getLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      soc: 'purple',
      hlgt: 'blue',
      hlt: 'cyan',
      pt: 'green',
      llt: 'gold'
    };
    return colors[level] || 'default';
  };

  if (!activeVersion) {
    return (
      <Card>
        <Empty description="No MedDRA version available. Please import a MedDRA dictionary." />
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Left: Tree Browser */}
      <Card
        title={
          <Space>
            <PartitionOutlined />
            <span>MedDRA Hierarchy</span>
            <Tag color="blue">v{activeVersion.version}</Tag>
          </Space>
        }
        style={{ flex: 1, minWidth: 400 }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Search
            placeholder="Search terms..."
            value={searchValue}
            onChange={e => handleSearch(e.target.value)}
            loading={searchLoading}
            allowClear
          />
        </div>

        {/* Search Results */}
        {searchValue.length >= 2 && (
          <div style={{ maxHeight: 200, overflow: 'auto', borderBottom: '1px solid #f0f0f0' }}>
            {searchLoading ? (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <Spin size="small" />
              </div>
            ) : searchResults.length > 0 ? (
              <div style={{ padding: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, padding: '0 8px' }}>
                  {searchResults.length} results found
                </Text>
                {searchResults.slice(0, 20).map(result => (
                  <div
                    key={result.lltCode}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderRadius: 4,
                      marginTop: 4
                    }}
                    className="hover-bg"
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <Space direction="vertical" size={0}>
                      <Space>
                        <Text strong>{result.lltName}</Text>
                        {!result.isCurrent && <Tag color="warning" style={{ fontSize: 10 }}>NC</Tag>}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        PT: {result.ptName}
                      </Text>
                    </Space>
                  </div>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No results" style={{ padding: 16 }} />
            )}
          </div>
        )}

        {/* Tree */}
        <div style={{ height, overflow: 'auto' }}>
          {browseLoading && loadedTreeData.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Spin />
            </div>
          ) : (
            <Tree<MedDRATreeNode>
              treeData={loadedTreeData}
              loadData={handleLoadData}
              expandedKeys={expandedKeys}
              onExpand={handleExpand}
              onSelect={handleNodeSelect as any}
              showLine
              style={{ padding: 12 }}
              titleRender={(node) => (
                <Space size={4}>
                  <Tag color={getLevelColor(node.level)} style={{ fontSize: 10, lineHeight: '14px', margin: 0 }}>
                    {node.level.toUpperCase()}
                  </Tag>
                  <Text style={{ fontSize: 13 }}>
                    {node.title}
                  </Text>
                  {node.isCurrent === false && (
                    <Tag color="warning" style={{ fontSize: 9, lineHeight: '12px', margin: 0 }}>NC</Tag>
                  )}
                </Space>
              )}
            />
          )}
        </div>
      </Card>

      {/* Right: Hierarchy Details */}
      <Card
        title="Term Details"
        style={{ width: 400 }}
        extra={
          selectable && selectedHierarchy && selectedHierarchy.length > 0 && (
            <Button type="primary" icon={<CheckOutlined />} onClick={handleSelectTerm}>
              Select Term
            </Button>
          )
        }
      >
        {selectedHierarchy && selectedHierarchy.length > 0 ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {selectedHierarchy.map((hierarchy, index) => (
              <div key={index}>
                {selectedHierarchy.length > 1 && (
                  <Tag color={hierarchy.isPrimaryPath ? 'green' : 'default'} style={{ marginBottom: 8 }}>
                    {hierarchy.isPrimaryPath ? 'Primary Path' : `Path ${index + 1}`}
                  </Tag>
                )}
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item
                    label={<Tag color="purple">SOC</Tag>}
                    labelStyle={{ width: 80 }}
                  >
                    <Text strong>{hierarchy.soc.socName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {hierarchy.soc.socCode}
                    </Text>
                  </Descriptions.Item>

                  <Descriptions.Item label={<Tag color="blue">HLGT</Tag>}>
                    {hierarchy.hlgt.hlgtName}
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {hierarchy.hlgt.hlgtCode}
                    </Text>
                  </Descriptions.Item>

                  <Descriptions.Item label={<Tag color="cyan">HLT</Tag>}>
                    {hierarchy.hlt.hltName}
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {hierarchy.hlt.hltCode}
                    </Text>
                  </Descriptions.Item>

                  <Descriptions.Item label={<Tag color="green">PT</Tag>}>
                    <Text strong>{hierarchy.pt.ptName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {hierarchy.pt.ptCode}
                    </Text>
                  </Descriptions.Item>

                  <Descriptions.Item label={<Tag color="gold">LLT</Tag>}>
                    {hierarchy.llt.lltName}
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {hierarchy.llt.lltCode}
                      {!hierarchy.llt.isCurrent && (
                        <Tag color="warning" style={{ marginLeft: 8, fontSize: 10 }}>
                          Non-current
                        </Tag>
                      )}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            ))}
          </Space>
        ) : (
          <Empty description="Select a PT or LLT term to view its hierarchy" />
        )}
      </Card>
    </div>
  );
};

export default MedDRABrowser;
