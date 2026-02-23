/**
 * Duplicate Detail Component
 * Shows detailed comparison of two potentially duplicate cases
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Button,
  Progress,
  Descriptions,
  Table,
  Spin,
  Alert,
  Divider
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LinkOutlined,
  MergeOutlined,
  RollbackOutlined
} from '@ant-design/icons';
import { useDuplicateStore } from '../../stores/duplicateStore';
import type { DuplicateCandidate, MatchingCriterion, DuplicateStatus } from '../../../shared/types/duplicate.types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface DuplicateDetailProps {
  candidateId: number;
  onResolve?: (id: number) => void;
  onMerge?: (id: number) => void;
  onBack?: () => void;
}

const STATUS_COLORS: Record<DuplicateStatus, string> = {
  pending: 'orange',
  dismissed: 'default',
  confirmed: 'red',
  merged: 'blue'
};

const STATUS_LABELS: Record<DuplicateStatus, string> = {
  pending: 'Pending Review',
  dismissed: 'Dismissed',
  confirmed: 'Confirmed Duplicate',
  merged: 'Merged'
};

export const DuplicateDetail: React.FC<DuplicateDetailProps> = ({
  candidateId,
  onResolve,
  onMerge,
  onBack
}) => {
  const {
    currentCandidate,
    candidateLoading,
    error,
    loadCandidate,
    clearCurrentCandidate
  } = useDuplicateStore();

  const [case1Data, setCase1Data] = useState<{ safetyReportId?: string; patientInitials?: string } | null>(null);
  const [case2Data, setCase2Data] = useState<{ safetyReportId?: string; patientInitials?: string } | null>(null);

  useEffect(() => {
    loadCandidate(candidateId);
    return () => clearCurrentCandidate();
  }, [candidateId, loadCandidate, clearCurrentCandidate]);

  // Load case details when candidate loads
  useEffect(() => {
    if (currentCandidate) {
      // Load case details from API (simplified for now)
      window.electronAPI.getCase(currentCandidate.caseId1).then(response => {
        if (response.success && response.data) {
          setCase1Data({
            safetyReportId: response.data.safetyReportId,
            patientInitials: response.data.patientInitials
          });
        }
      });
      window.electronAPI.getCase(currentCandidate.caseId2).then(response => {
        if (response.success && response.data) {
          setCase2Data({
            safetyReportId: response.data.safetyReportId,
            patientInitials: response.data.patientInitials
          });
        }
      });
    }
  }, [currentCandidate]);

  if (candidateLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Loading duplicate details...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !currentCandidate) {
    return (
      <Card>
        <Alert
          type="error"
          message="Error Loading Details"
          description={error || 'Candidate not found'}
          action={
            onBack && (
              <Button onClick={onBack} icon={<RollbackOutlined />}>
                Back to List
              </Button>
            )
          }
        />
      </Card>
    );
  }

  const criteriaColumns: ColumnsType<MatchingCriterion> = [
    {
      title: 'Criterion',
      dataIndex: 'label',
      key: 'label',
      width: 180
    },
    {
      title: 'Case 1 Value',
      dataIndex: 'value1',
      key: 'value1',
      render: (value: unknown) => (
        <Text style={{ maxWidth: 200 }} ellipsis>
          {value !== undefined && value !== null ? String(value) : '-'}
        </Text>
      )
    },
    {
      title: 'Case 2 Value',
      dataIndex: 'value2',
      key: 'value2',
      render: (value: unknown) => (
        <Text style={{ maxWidth: 200 }} ellipsis>
          {value !== undefined && value !== null ? String(value) : '-'}
        </Text>
      )
    },
    {
      title: 'Match',
      dataIndex: 'matched',
      key: 'matched',
      width: 80,
      align: 'center',
      render: (matched: boolean) =>
        matched ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
        )
    },
    {
      title: 'Similarity',
      dataIndex: 'similarity',
      key: 'similarity',
      width: 100,
      render: (similarity: number | undefined) =>
        similarity !== undefined ? (
          <Progress
            percent={Math.round(similarity * 100)}
            size="small"
            status={similarity >= 0.8 ? 'success' : similarity >= 0.5 ? 'normal' : 'exception'}
          />
        ) : (
          '-'
        )
    },
    {
      title: 'Weight',
      dataIndex: 'weight',
      key: 'weight',
      width: 80,
      render: (weight: number) => `${weight}%`
    }
  ];

  return (
    <Card
      title={
        <Space>
          <LinkOutlined />
          <span>Duplicate Candidate Details</span>
          <Tag color={STATUS_COLORS[currentCandidate.status]}>
            {STATUS_LABELS[currentCandidate.status]}
          </Tag>
        </Space>
      }
      extra={
        <Space>
          {onBack && (
            <Button icon={<RollbackOutlined />} onClick={onBack}>
              Back
            </Button>
          )}
          {currentCandidate.status === 'pending' && (
            <>
              <Button onClick={() => onResolve?.(currentCandidate.id)}>
                Resolve
              </Button>
              <Button
                type="primary"
                icon={<MergeOutlined />}
                onClick={() => onMerge?.(currentCandidate.id)}
              >
                Merge Cases
              </Button>
            </>
          )}
        </Space>
      }
    >
      {/* Similarity Score */}
      <Row justify="center" style={{ marginBottom: 24 }}>
        <Col>
          <Progress
            type="circle"
            percent={currentCandidate.similarityScore}
            format={(percent) => `${percent}%`}
            strokeColor={
              currentCandidate.similarityScore >= 80
                ? '#f5222d'
                : currentCandidate.similarityScore >= 60
                ? '#faad14'
                : '#52c41a'
            }
            size={120}
          />
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Text strong>Similarity Score</Text>
          </div>
        </Col>
      </Row>

      {/* Case Comparison */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card size="small" title="Case 1">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Case ID">
                {currentCandidate.caseId1.substring(0, 8)}...
              </Descriptions.Item>
              <Descriptions.Item label="Safety Report ID">
                {case1Data?.safetyReportId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Patient Initials">
                {case1Data?.patientInitials || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Case 2">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Case ID">
                {currentCandidate.caseId2.substring(0, 8)}...
              </Descriptions.Item>
              <Descriptions.Item label="Safety Report ID">
                {case2Data?.safetyReportId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Patient Initials">
                {case2Data?.patientInitials || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Divider orientation="left">Matching Criteria</Divider>

      {/* Criteria Table */}
      <Table
        columns={criteriaColumns}
        dataSource={currentCandidate.matchingCriteria}
        rowKey="criterion"
        pagination={false}
        size="small"
      />

      {/* Resolution Details */}
      {currentCandidate.status !== 'pending' && (
        <>
          <Divider orientation="left">Resolution</Divider>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Resolution">
              <Tag color={STATUS_COLORS[currentCandidate.status]}>
                {currentCandidate.resolution || currentCandidate.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Resolved By">
              {currentCandidate.resolvedByName || currentCandidate.resolvedBy || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Resolved At">
              {currentCandidate.resolvedAt
                ? dayjs(currentCandidate.resolvedAt).format('MM/DD/YYYY HH:mm')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Notes">
              {currentCandidate.resolutionNotes || '-'}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      {/* Detection Info */}
      <Divider orientation="left">Detection Info</Divider>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Detected At">
          {dayjs(currentCandidate.detectedAt).format('MM/DD/YYYY HH:mm')}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default DuplicateDetail;
