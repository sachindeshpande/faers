/**
 * PSR List Component
 * Phase 4: Displays list of Periodic Safety Reports
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Card,
  Typography,
  DatePicker,
  Row,
  Col,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { usePSRStore, usePSRList } from '../../stores/psrStore';
import type {
  PSRListItem,
  PSRStatus,
  PSRFormat,
  PSRFilter
} from '../../../shared/types/psr.types';
import {
  PSR_STATUS_LABELS,
  PSR_STATUS_COLORS,
  PSR_FORMAT_LABELS
} from '../../../shared/types/psr.types';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface PSRListProps {
  onViewPSR?: (psrId: number) => void;
  onCreatePSR?: () => void;
}

export const PSRList: React.FC<PSRListProps> = ({ onViewPSR, onCreatePSR }) => {
  const { psrs, total, loading, filter } = usePSRList();
  const { loadPSRs, setFilter, clearFilter, openCreateWizard } = usePSRStore();

  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [localFilter, setLocalFilter] = useState<PSRFilter>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    loadPSRs(filter, pageSize, (currentPage - 1) * pageSize);
  }, [currentPage, pageSize]);

  const handleSearch = () => {
    const newFilter = { ...localFilter, search: searchText };
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchText('');
    setLocalFilter({});
    clearFilter();
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof PSRFilter, value: unknown) => {
    setLocalFilter(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const newFilter = { ...localFilter, search: searchText };
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleCreatePSR = () => {
    if (onCreatePSR) {
      onCreatePSR();
    } else {
      openCreateWizard();
    }
  };

  const columns: ColumnsType<PSRListItem> = [
    {
      title: 'PSR Number',
      dataIndex: 'psrNumber',
      key: 'psrNumber',
      width: 150,
      render: (text) => (
        <Space>
          <FileTextOutlined />
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: 'Product',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
      ellipsis: true
    },
    {
      title: 'Format',
      dataIndex: 'psrFormat',
      key: 'psrFormat',
      width: 100,
      render: (format: PSRFormat) => (
        <Tag>{PSR_FORMAT_LABELS[format]}</Tag>
      )
    },
    {
      title: 'Period',
      key: 'period',
      width: 200,
      render: (_, record) => (
        <Space>
          <CalendarOutlined />
          {dayjs(record.periodStart).format('MMM D, YYYY')} - {dayjs(record.periodEnd).format('MMM D, YYYY')}
        </Space>
      )
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => {
        const dueDate = dayjs(date);
        const isOverdue = dueDate.isBefore(dayjs(), 'day');
        const isDueSoon = dueDate.diff(dayjs(), 'day') <= 7 && !isOverdue;
        return (
          <Tooltip title={isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : ''}>
            <span style={{ color: isOverdue ? '#ff4d4f' : isDueSoon ? '#faad14' : undefined }}>
              {dueDate.format('MMM D, YYYY')}
            </span>
          </Tooltip>
        );
      },
      sorter: (a, b) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix()
    },
    {
      title: 'Cases',
      key: 'cases',
      width: 100,
      render: (_, record) => (
        <Space>
          <Tag color="blue">{record.includedCaseCount} included</Tag>
          {record.excludedCaseCount > 0 && (
            <Tag color="default">{record.excludedCaseCount} excluded</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: PSRStatus) => (
        <Tag color={PSR_STATUS_COLORS[status]}>{PSR_STATUS_LABELS[status]}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => onViewPSR?.(record.id)}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div className="psr-list">
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>Periodic Safety Reports</Title>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => loadPSRs(filter, pageSize, (currentPage - 1) * pageSize)}
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreatePSR}
                >
                  Create PSR
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Search and Filter Bar */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col flex="auto">
              <Input.Search
                placeholder="Search by PSR number or product..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onSearch={handleSearch}
                prefix={<SearchOutlined />}
                allowClear
                enterButton
              />
            </Col>
            <Col>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
                type={showFilters ? 'primary' : 'default'}
              >
                Filters
              </Button>
            </Col>
          </Row>

          {showFilters && (
            <Card size="small" style={{ marginTop: 16 }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <label style={{ display: 'block', marginBottom: 4 }}>Status</label>
                  <Select
                    placeholder="Any status"
                    value={localFilter.status}
                    onChange={value => handleFilterChange('status', value)}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {Object.entries(PSR_STATUS_LABELS).map(([key, label]) => (
                      <Select.Option key={key} value={key}>{label}</Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <label style={{ display: 'block', marginBottom: 4 }}>Format</label>
                  <Select
                    placeholder="Any format"
                    value={localFilter.psrFormat}
                    onChange={value => handleFilterChange('psrFormat', value)}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {Object.entries(PSR_FORMAT_LABELS).map(([key, label]) => (
                      <Select.Option key={key} value={key}>{label}</Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <label style={{ display: 'block', marginBottom: 4 }}>Due Date Range</label>
                  <RangePicker
                    style={{ width: '100%' }}
                    onChange={(dates) => {
                      if (dates) {
                        handleFilterChange('dueDateFrom', dates[0]?.format('YYYY-MM-DD'));
                        handleFilterChange('dueDateTo', dates[1]?.format('YYYY-MM-DD'));
                      } else {
                        handleFilterChange('dueDateFrom', undefined);
                        handleFilterChange('dueDateTo', undefined);
                      }
                    }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <label style={{ display: 'block', marginBottom: 4 }}>&nbsp;</label>
                  <Space>
                    <Button type="primary" onClick={applyFilters}>
                      Apply
                    </Button>
                    <Button onClick={handleClearFilters}>
                      Clear
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          )}
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={psrs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} PSRs`,
            onChange: (page, size) => {
              setCurrentPage(page);
              if (size !== pageSize) {
                setPageSize(size);
              }
            }
          }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default PSRList;
