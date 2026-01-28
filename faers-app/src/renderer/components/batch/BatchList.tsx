/**
 * BatchList Component
 * Phase 4: Display list of submission batches
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Typography,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useBatchList } from '../../stores/batchStore';
import type { BatchListItem, BatchType, BatchStatus } from '../../../shared/types/batch.types';
import {
  BATCH_TYPE_LABELS,
  BATCH_STATUS_LABELS,
  BATCH_STATUS_COLORS
} from '../../../shared/types/batch.types';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface BatchListProps {
  onCreateBatch?: () => void;
  onSelectBatch?: (batchId: number) => void;
}

const BatchList: React.FC<BatchListProps> = ({ onCreateBatch, onSelectBatch }) => {
  const { batches, total, isLoading, filter, loadBatches, setFilter } = useBatchList();
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState(filter.search || '');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  useEffect(() => {
    loadBatches(filter, pagination.pageSize, (pagination.current - 1) * pagination.pageSize);
  }, []);

  const handleSearch = () => {
    const newFilter = { ...filter, search: searchText || undefined };
    setFilter(newFilter);
    loadBatches(newFilter, pagination.pageSize, 0);
    setPagination({ ...pagination, current: 1 });
  };

  const handleFilterChange = (key: string, value: unknown) => {
    const newFilter = { ...filter, [key]: value || undefined };
    setFilter(newFilter);
    loadBatches(newFilter, pagination.pageSize, 0);
    setPagination({ ...pagination, current: 1 });
  };

  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    const newFilter = {
      ...filter,
      fromDate: dates?.[0]?.toISOString() || undefined,
      toDate: dates?.[1]?.toISOString() || undefined
    };
    setFilter(newFilter);
    loadBatches(newFilter, pagination.pageSize, 0);
    setPagination({ ...pagination, current: 1 });
  };

  const handleTableChange = (paginationConfig: { current?: number; pageSize?: number }) => {
    const newPagination = {
      current: paginationConfig.current || 1,
      pageSize: paginationConfig.pageSize || 20
    };
    setPagination(newPagination);
    loadBatches(filter, newPagination.pageSize, (newPagination.current - 1) * newPagination.pageSize);
  };

  const columns: ColumnsType<BatchListItem> = [
    {
      title: 'Batch Number',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 220,
      render: (text: string, record: BatchListItem) => (
        <a onClick={() => onSelectBatch?.(record.id)}>{text}</a>
      )
    },
    {
      title: 'Type',
      dataIndex: 'batchType',
      key: 'batchType',
      width: 150,
      render: (type: BatchType) => BATCH_TYPE_LABELS[type]
    },
    {
      title: 'Cases',
      key: 'cases',
      width: 120,
      render: (_: unknown, record: BatchListItem) => (
        <Space>
          <span>{record.caseCount}</span>
          {record.validCaseCount > 0 && (
            <Tag color="green">{record.validCaseCount} valid</Tag>
          )}
          {record.invalidCaseCount > 0 && (
            <Tag color="red">{record.invalidCaseCount} invalid</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: BatchStatus) => (
        <Tag color={BATCH_STATUS_COLORS[status]}>
          {BATCH_STATUS_LABELS[status]}
        </Tag>
      )
    },
    {
      title: 'Mode',
      dataIndex: 'submissionMode',
      key: 'submissionMode',
      width: 100,
      render: (mode?: 'test' | 'production') => (
        mode ? (
          <Tag color={mode === 'production' ? 'blue' : 'orange'}>
            {mode === 'production' ? 'Production' : 'Test'}
          </Tag>
        ) : null
      )
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('MMM D, YYYY h:mm A')
    },
    {
      title: 'Created By',
      dataIndex: 'createdByName',
      key: 'createdByName',
      width: 150,
      ellipsis: true
    },
    {
      title: 'Submitted',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 150,
      render: (date?: string) => date ? dayjs(date).format('MMM D, YYYY') : '-'
    }
  ];

  return (
    <Card>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Submission Batches</Title>
        </Col>
        <Col>
          <Space>
            <Input
              placeholder="Search batches..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 250 }}
              prefix={<SearchOutlined />}
              allowClear
            />
            <Button onClick={handleSearch}>Search</Button>
            <Tooltip title={showFilters ? 'Hide Filters' : 'Show Filters'}>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
                type={showFilters ? 'primary' : 'default'}
              />
            </Tooltip>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadBatches(filter, pagination.pageSize, (pagination.current - 1) * pagination.pageSize)}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onCreateBatch}
            >
              Create Batch
            </Button>
          </Space>
        </Col>
      </Row>

      {showFilters && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              placeholder="Batch Type"
              style={{ width: '100%' }}
              allowClear
              value={filter.batchType}
              onChange={(value) => handleFilterChange('batchType', value)}
            >
              {Object.entries(BATCH_TYPE_LABELS).map(([key, label]) => (
                <Select.Option key={key} value={key}>{label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              allowClear
              value={filter.status}
              onChange={(value) => handleFilterChange('status', value)}
            >
              {Object.entries(BATCH_STATUS_LABELS).map(([key, label]) => (
                <Select.Option key={key} value={key}>{label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Submission Mode"
              style={{ width: '100%' }}
              allowClear
              value={filter.submissionMode}
              onChange={(value) => handleFilterChange('submissionMode', value)}
            >
              <Select.Option value="test">Test</Select.Option>
              <Select.Option value="production">Production</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={handleDateRangeChange}
              value={[
                filter.fromDate ? dayjs(filter.fromDate) : null,
                filter.toDate ? dayjs(filter.toDate) : null
              ]}
            />
          </Col>
        </Row>
      )}

      <Table
        columns={columns}
        dataSource={batches}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} batches`
        }}
        onChange={handleTableChange}
        size="middle"
        scroll={{ x: 1200 }}
        onRow={(record) => ({
          onClick: () => onSelectBatch?.(record.id),
          style: { cursor: 'pointer' }
        })}
      />
    </Card>
  );
};

export default BatchList;
