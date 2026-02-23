/**
 * Duplicate Check Panel
 * Panel to check a case for potential duplicates
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  List,
  Progress,
  Badge,
  Empty,
  Spin,
  Collapse,
  Tag,
  Alert,
  Slider,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useDuplicateStore } from '../../stores/duplicateStore';
import type { DuplicateCandidate, MatchingCriterion } from '../../../shared/types/duplicate.types';

const { Text, Title } = Typography;
const { Panel } = Collapse;

interface DuplicateCheckPanelProps {
  caseId: string;
  onCandidateClick?: (candidate: DuplicateCandidate) => void;
  compact?: boolean;
}

export const DuplicateCheckPanel: React.FC<DuplicateCheckPanelProps> = ({
  caseId,
  onCandidateClick,
  compact = false
}) => {
  const {
    checkResult,
    checking,
    checkForDuplicates,
    clearCheckResult
  } = useDuplicateStore();

  const [threshold, setThreshold] = useState(70);
  const [showSettings, setShowSettings] = useState(false);

  const handleCheck = async () => {
    await checkForDuplicates(caseId, threshold);
  };

  const handleClear = () => {
    clearCheckResult();
  };

  const renderCriteriaList = (criteria: MatchingCriterion[]) => (
    <div style={{ marginTop: 8 }}>
      {criteria.map(c => (
        <div key={c.criterion} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          {c.matched ? (
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          )}
          <Text style={{ flex: 1 }}>{c.label}</Text>
          <Text type="secondary">
            {c.similarity !== undefined ? `${Math.round(c.similarity * 100)}%` : '-'}
          </Text>
        </div>
      ))}
    </div>
  );

  if (compact) {
    return (
      <Card size="small" title="Duplicate Check">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleCheck}
            loading={checking}
            block
          >
            Check for Duplicates
          </Button>

          {checkResult && (
            <>
              {checkResult.hasDuplicates ? (
                <Alert
                  type="warning"
                  message={`${checkResult.candidates.length} potential duplicate(s) found`}
                  description={`Highest score: ${checkResult.highestScore}%`}
                  showIcon
                  icon={<WarningOutlined />}
                />
              ) : (
                <Alert
                  type="success"
                  message="No duplicates found"
                  showIcon
                />
              )}
            </>
          )}
        </Space>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <SearchOutlined />
          <span>Duplicate Detection</span>
        </Space>
      }
      extra={
        <Tooltip title="Settings">
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => setShowSettings(!showSettings)}
          />
        </Tooltip>
      }
    >
      {/* Settings */}
      {showSettings && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Similarity Threshold
          </Text>
          <Slider
            min={50}
            max={95}
            value={threshold}
            onChange={setThreshold}
            marks={{
              50: '50%',
              70: '70%',
              80: '80%',
              95: '95%'
            }}
          />
        </Card>
      )}

      {/* Check Button */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleCheck}
          loading={checking}
        >
          Check for Duplicates
        </Button>
        {checkResult && (
          <Button onClick={handleClear}>Clear Results</Button>
        )}
      </Space>

      {/* Loading */}
      {checking && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Checking for duplicates...</Text>
          </div>
        </div>
      )}

      {/* Results */}
      {checkResult && !checking && (
        <>
          {/* Summary */}
          <Alert
            type={checkResult.hasDuplicates ? 'warning' : 'success'}
            message={
              checkResult.hasDuplicates
                ? `${checkResult.candidates.length} potential duplicate(s) found`
                : 'No duplicates found'
            }
            description={
              checkResult.hasDuplicates
                ? `Checked ${checkResult.totalChecked} cases in ${checkResult.checkDurationMs}ms. Highest similarity: ${checkResult.highestScore}%`
                : `Checked ${checkResult.totalChecked} cases in ${checkResult.checkDurationMs}ms`
            }
            showIcon
            icon={checkResult.hasDuplicates ? <WarningOutlined /> : <CheckCircleOutlined />}
            style={{ marginBottom: 16 }}
          />

          {/* Candidates List */}
          {checkResult.hasDuplicates && (
            <List
              itemLayout="vertical"
              dataSource={checkResult.candidates}
              renderItem={(candidate) => (
                <List.Item
                  key={candidate.id}
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      onClick={() => onCandidateClick?.(candidate)}
                    >
                      View Details
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Progress
                        type="circle"
                        percent={candidate.similarityScore}
                        size={60}
                        strokeColor={
                          candidate.similarityScore >= 80
                            ? '#f5222d'
                            : candidate.similarityScore >= 60
                            ? '#faad14'
                            : '#52c41a'
                        }
                      />
                    }
                    title={
                      <Space>
                        <Text>Case {candidate.caseId2.substring(0, 8)}...</Text>
                        <Tag color={
                          candidate.similarityScore >= 80 ? 'red' :
                          candidate.similarityScore >= 60 ? 'orange' : 'green'
                        }>
                          {candidate.similarityScore}% match
                        </Tag>
                      </Space>
                    }
                    description={
                      <Collapse ghost>
                        <Panel header="Matching Criteria" key="criteria">
                          {renderCriteriaList(candidate.matchingCriteria)}
                        </Panel>
                      </Collapse>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </>
      )}

      {/* No Check Yet */}
      {!checkResult && !checking && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Click 'Check for Duplicates' to scan for potential duplicate cases"
        />
      )}
    </Card>
  );
};

export default DuplicateCheckPanel;
