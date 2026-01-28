/**
 * Case Version Timeline
 * Phase 4: Timeline showing version history of a case (original + follow-ups)
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Timeline,
  Tag,
  Typography,
  Spin,
  Alert,
  Button,
  Space,
  Empty
} from 'antd';
import {
  FileTextOutlined,
  BranchesOutlined,
  StopOutlined,
  HistoryOutlined,
  SwapOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CaseVersionChain, CaseVersion } from '../../../shared/types/followup.types';
import { FOLLOWUP_TYPE_LABELS } from '../../../shared/types/followup.types';

const { Text } = Typography;

interface CaseVersionTimelineProps {
  caseId: string;
  onVersionSelect?: (caseId: string) => void;
  onCompareVersions?: (fromCaseId: string, toCaseId: string) => void;
}

export const CaseVersionTimeline: React.FC<CaseVersionTimelineProps> = ({
  caseId,
  onVersionSelect,
  onCompareVersions
}) => {
  const [chain, setChain] = useState<CaseVersionChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  useEffect(() => {
    if (caseId) {
      loadVersionChain();
    }
  }, [caseId]);

  const loadVersionChain = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await window.electronAPI.getVersionChain(caseId);
      if (response.success && response.data) {
        setChain(response.data);
      } else {
        setError(response.error || 'Failed to load version history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = (versionCaseId: string) => {
    if (onVersionSelect) {
      onVersionSelect(versionCaseId);
    }
  };

  const toggleVersionSelection = (versionCaseId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionCaseId)) {
        return prev.filter((id) => id !== versionCaseId);
      }
      // Only allow 2 selections
      if (prev.length >= 2) {
        return [prev[1], versionCaseId];
      }
      return [...prev, versionCaseId];
    });
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2 && onCompareVersions) {
      onCompareVersions(selectedVersions[0], selectedVersions[1]);
    }
  };

  const getVersionIcon = (version: CaseVersion) => {
    if (version.isNullified) {
      return <StopOutlined style={{ color: '#ff4d4f' }} />;
    }
    if (version.followupType) {
      return <BranchesOutlined style={{ color: '#1890ff' }} />;
    }
    return <FileTextOutlined style={{ color: '#52c41a' }} />;
  };

  const getVersionColor = (version: CaseVersion): string => {
    if (version.isNullified) return 'red';
    if (version.followupType) return 'blue';
    return 'green';
  };

  const getStatusTag = (version: CaseVersion) => {
    let color = 'default';
    switch (version.status) {
      case 'Submitted':
        color = 'blue';
        break;
      case 'Acknowledged':
        color = 'green';
        break;
      case 'Rejected':
        color = 'red';
        break;
      case 'Draft':
        color = 'default';
        break;
    }
    return <Tag color={color}>{version.status}</Tag>;
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MMM D, YYYY h:mm A');
  };

  if (loading) {
    return (
      <Card title="Version History" size="small">
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin tip="Loading version history..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Version History" size="small">
        <Alert message={error} type="error" showIcon />
      </Card>
    );
  }

  if (!chain || chain.versions.length === 0) {
    return (
      <Card title="Version History" size="small">
        <Empty description="No version history available" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <HistoryOutlined />
          Version History
        </Space>
      }
      size="small"
      extra={
        onCompareVersions && chain.versions.length > 1 && (
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={handleCompare}
            disabled={selectedVersions.length !== 2}
          >
            Compare Selected
          </Button>
        )
      }
    >
      {chain.isNullified && (
        <Alert
          message="Case Nullified"
          description={`This case was nullified${chain.nullifiedAt ? ` on ${formatDate(chain.nullifiedAt)}` : ''}`}
          type="error"
          showIcon
          icon={<StopOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Total versions: {chain.totalVersions} | Original case: {chain.originalCaseId}
        </Text>
      </div>

      <Timeline
        items={chain.versions.map((version) => ({
          color: getVersionColor(version),
          dot: getVersionIcon(version),
          children: (
            <div
              style={{
                padding: '8px 12px',
                background: selectedVersions.includes(version.caseId) ? '#e6f7ff' : '#fafafa',
                borderRadius: 6,
                border: selectedVersions.includes(version.caseId) ? '1px solid #1890ff' : '1px solid transparent',
                cursor: onCompareVersions ? 'pointer' : 'default'
              }}
              onClick={() => onCompareVersions && toggleVersionSelection(version.caseId)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Text strong>Version {version.version}</Text>
                  {getStatusTag(version)}
                  {version.isNullified && <Tag color="error">NULLIFIED</Tag>}
                  {version.followupType && (
                    <Tag color="blue">{FOLLOWUP_TYPE_LABELS[version.followupType]}</Tag>
                  )}
                </Space>
                {onVersionSelect && (
                  <Button
                    size="small"
                    type="link"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVersionClick(version.caseId);
                    }}
                  >
                    View
                  </Button>
                )}
              </div>

              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {version.caseId}
                </Text>
              </div>

              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Created: {formatDate(version.createdAt)}
                  {version.createdByName && ` by ${version.createdByName}`}
                </Text>
              </div>

              {version.followupInfoDate && (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Info received: {dayjs(version.followupInfoDate).format('MMM D, YYYY')}
                  </Text>
                </div>
              )}
            </div>
          )
        }))}
      />

      {onCompareVersions && chain.versions.length > 1 && (
        <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
          Click on two versions to compare changes
        </Text>
      )}
    </Card>
  );
};

export default CaseVersionTimeline;
