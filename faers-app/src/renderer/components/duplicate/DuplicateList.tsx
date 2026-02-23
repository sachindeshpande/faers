/**
 * Duplicate List Component
 * Displays list of duplicate candidates with filtering
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  Select,
  DatePicker,
  InputNumber,
  Typography,
  Tooltip,
  Row,
  Col,
  Statistic,
  Badge
} from 'antd';
import {
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useDuplicateStore } from '../../stores/duplicateStore';
import type {
  DuplicateListItem,
  DuplicateStatus,
  DuplicateFilter
} from '../../../shared/types/duplicate.types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface DuplicateListProps {
  onViewCandidate?: (id: number) => void;
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
  confirmed: 'Confirmed',
  merged: 'Merged'
};

export const DuplicateList: React.FC<DuplicateListProps> = ({ onViewCandidate }) => {
  const {
    candidates,
    total,
    loading,
    stats,
    filter,
    loadCandidates,
    loadStats,
    setFilter
  } = useDuplicateStore();

  const [showFilters, setShowFilters] = useState(false);
  const [localFilter, setLocalFilter] = useState<DuplicateFilter>(filter);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  useEffect(() => {
    loadCandidates(undefined, pagination.pageSize, 0);
    loadStats();
  }, [loadCandidates, loadStats, pagination.pageSize]);

  const handleRefresh = () => {
    loadCandidates(localFilter, pagination.pageSize, (pagination.current - 1) * pagination.pageSize);
    loadStats();
  };

  const handleApplyFilter = () => {
    setFilter(localFilter);
    setPagination({ ...pagination, current: 1 });
    loadCandidates(localFilter, pagination.pageSize, 0);
  };

  const handleClearFilter = () => {
    const emptyFilter: DuplicateFilter = {};
    setLocalFilter(emptyFilter);
    setFilter(emptyFilter);
    setPagination({ ...pagination, current: 1 });
    loadCandidates(emptyFilter, pagination.pageSize, 0);
  };

  const handleTableChange = (newPagination: { current?: number; pageSize?: number }) => {
    const current = newPagination.current || 1;
    const pageSize = newPagination.pageSize || 20;
    setPagination({ current, pageSize });
    loadCandidates(filter, pageSize, (current - 1) * pageSize);
  };

  const columns: ColumnsType<DuplicateListItem> = [
    {
      title: 'Case 1',
      key: 'case1',
      render: (_: unknown, record: DuplicateListItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.case1SafetyReportId || record.caseId1.substring(0, 8)}</Text>
          {record.case1PatientInitials && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.case1PatientInitials}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Case 2',
      key: 'case2',
      render: (_: unknown, record: DuplicateListItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.case2SafetyReportId || record.caseId2.substring(0, 8)}</Text>
          {record.case2PatientInitials && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.case2PatientInitials}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Similarity',
      dataIndex: 'similarityScore',
      key: 'similarityScore',
      width: 100,
      sorter: (a: DuplicateListItem, b: DuplicateListItem) => a.similarityScore - b.similarityScore,
      render: (score: number) => (
        <Badge
          count={`${score}%`}
          style={{
            backgroundColor: score >= 80 ? '#f5222d' : score >= 60 ? '#faad14' : '#52c41a'
          }}
        />
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Dismissed', value: 'dismissed' },
        { text: 'Confirmed', value: 'confirmed' },
        { text: 'Merged', value: 'merged' }
      ],
      render: (status: DuplicateStatus) => (
        <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>
      )
    },
    {
      title: 'Detected',
      dataIndex: 'detectedAt',
      key: 'detectedAt',
      width: 100,
      render: (date: string) => dayjs(date).format('MM/DD/YYYY')
    },
    {
      title: 'Resolved By',
      dataIndex: 'resolvedByName',
      key: 'resolvedByName',
      width: 120,
      render: (name: string | undefined) => name || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: DuplicateListItem) => (
        <Tooltip title="View Details">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => onViewCandidate?.(record.id)}
          />
        </Tooltip>
      )
    }
  ];

  return (
    <Card
      title="Duplicate Candidates"
      extra={
        <Space>
          <Button
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
        </Space>
      }
    >
      {/* Stats */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic
              title="Pending"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Confirmed"
              value={stats.confirmed}
              valueStyle={{ color: '#f5222d' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Merged"
              value={stats.merged}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Dismissed"
              value={stats.dismissed}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Col>
        </Row>
      )}

      {/* Filters */}
      {showFilters && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Status
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder="All statuses"
                value={localFilter.status}
                onChange={(value) => setLocalFilter({ ...localFilter, status: value })}
                allowClear
              >
                <Select.Option value="pending">Pending</Select.Option>
                <Select.Option value="dismissed">Dismissed</Select.Option>
                <Select.Option value="confirmed">Confirmed</Select.Option>
                <Select.Option value="merged">Merged</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Min Score
              </Text>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                min={0}
                max={100}
                value={localFilter.minScore}
                onChange={(value) => setLocalFilter({ ...localFilter, minScore: value ?? undefined })}
              />
            </Col>
            <Col span={6}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Max Score
              </Text>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="100"
                min={0}
                max={100}
                value={localFilter.maxScore}
                onChange={(value) => setLocalFilter({ ...localFilter, maxScore: value ?? undefined })}
              />
            </Col>
            <Col span={6}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Date Range
              </Text>
              <RangePicker
                style={{ width: '100%' }}
                value={
                  localFilter.fromDate && localFilter.toDate
                    ? [dayjs(localFilter.fromDate), dayjs(localFilter.toDate)]
                    : undefined
                }
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setLocalFilter({
                      ...localFilter,
                      fromDate: dates[0].format('YYYY-MM-DD'),
                      toDate: dates[1].format('YYYY-MM-DD')
                    });
                  } else {
                    setLocalFilter({
                      ...localFilter,
                      fromDate: undefined,
                      toDate: undefined
                    });
                  }
                }}
              />
            </Col>
          </Row>
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleApplyFilter}>
              Apply Filters
            </Button>
            <Button icon={<ClearOutlined />} onClick={handleClearFilter}>
              Clear
            </Button>
          </Space>
        </Card>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={candidates}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} candidates`
        }}
        onChange={handleTableChange}
      />
    </Card>
  );
};

export default DuplicateList;
