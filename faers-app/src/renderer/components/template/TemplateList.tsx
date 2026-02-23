/**
 * Template List Component
 * Displays list of case templates with filtering
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  Select,
  Input,
  Typography,
  Tooltip,
  Modal,
  message,
  Badge
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useTemplateStore } from '../../stores/templateStore';
import type { TemplateListItem, TemplateCategory, TemplateFilter } from '../../../shared/types/template.types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text } = Typography;
const { confirm } = Modal;

interface TemplateListProps {
  onCreateNew?: () => void;
  onEdit?: (id: number) => void;
  onView?: (id: number) => void;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  vaccine: 'Vaccine',
  medication_error: 'Medication Error',
  device_malfunction: 'Device Malfunction',
  overdose: 'Overdose',
  pediatric: 'Pediatric',
  pregnancy: 'Pregnancy',
  product_specific: 'Product Specific',
  other: 'Other'
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  vaccine: 'blue',
  medication_error: 'orange',
  device_malfunction: 'red',
  overdose: 'volcano',
  pediatric: 'cyan',
  pregnancy: 'magenta',
  product_specific: 'purple',
  other: 'default'
};

export const TemplateList: React.FC<TemplateListProps> = ({
  onCreateNew,
  onEdit,
  onView
}) => {
  const {
    templates,
    total,
    loading,
    filter,
    loadTemplates,
    deleteTemplate,
    approveTemplate,
    setFilter
  } = useTemplateStore();

  const [localFilter, setLocalFilter] = useState<TemplateFilter>(filter);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  useEffect(() => {
    loadTemplates(undefined, pagination.pageSize, 0);
  }, [loadTemplates, pagination.pageSize]);

  const handleSearch = () => {
    setFilter(localFilter);
    setPagination({ ...pagination, current: 1 });
    loadTemplates(localFilter, pagination.pageSize, 0);
  };

  const handleTableChange = (newPagination: { current?: number; pageSize?: number }) => {
    const current = newPagination.current || 1;
    const pageSize = newPagination.pageSize || 20;
    setPagination({ current, pageSize });
    loadTemplates(filter, pageSize, (current - 1) * pageSize);
  };

  const handleDelete = (template: TemplateListItem) => {
    confirm({
      title: 'Delete Template',
      content: `Are you sure you want to delete template "${template.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        const success = await deleteTemplate(template.id);
        if (success) {
          message.success('Template deleted');
        } else {
          message.error('Failed to delete template');
        }
      }
    });
  };

  const handleApprove = async (template: TemplateListItem) => {
    const result = await approveTemplate(template.id);
    if (result) {
      message.success('Template approved');
    } else {
      message.error('Failed to approve template');
    }
  };

  const columns: ColumnsType<TemplateListItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TemplateListItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {record.description}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category: TemplateCategory | undefined) =>
        category ? (
          <Tag color={CATEGORY_COLORS[category]}>{CATEGORY_LABELS[category]}</Tag>
        ) : (
          '-'
        )
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: unknown, record: TemplateListItem) => (
        <Space>
          {record.isApproved && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Approved
            </Tag>
          )}
          {record.isGlobal && <Tag color="blue">Global</Tag>}
        </Space>
      )
    },
    {
      title: 'Usage',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 80,
      align: 'center',
      sorter: (a: TemplateListItem, b: TemplateListItem) => a.usageCount - b.usageCount,
      render: (count: number) => (
        <Badge count={count} showZero color={count > 0 ? 'blue' : 'default'} />
      )
    },
    {
      title: 'Created By',
      dataIndex: 'createdByName',
      key: 'createdByName',
      width: 120,
      render: (name: string | undefined) => name || '-'
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 100,
      render: (date: string) => dayjs(date).format('MM/DD/YYYY')
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: TemplateListItem) => (
        <Space>
          <Tooltip title="View">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onView?.(record.id)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit?.(record.id)}
            />
          </Tooltip>
          {!record.isApproved && (
            <Tooltip title="Approve">
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Card
      title="Case Templates"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateNew}>
          New Template
        </Button>
      }
    >
      {/* Filters */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Search templates..."
          prefix={<SearchOutlined />}
          value={localFilter.search || ''}
          onChange={(e) => setLocalFilter({ ...localFilter, search: e.target.value })}
          style={{ width: 200 }}
          onPressEnter={handleSearch}
        />
        <Select
          placeholder="Category"
          value={localFilter.category}
          onChange={(value) => setLocalFilter({ ...localFilter, category: value })}
          style={{ width: 160 }}
          allowClear
        >
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Select.Option key={key} value={key}>
              {label}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Approval Status"
          value={
            localFilter.isApproved === true
              ? 'approved'
              : localFilter.isApproved === false
              ? 'pending'
              : undefined
          }
          onChange={(value) =>
            setLocalFilter({
              ...localFilter,
              isApproved: value === 'approved' ? true : value === 'pending' ? false : undefined
            })
          }
          style={{ width: 140 }}
          allowClear
        >
          <Select.Option value="approved">Approved</Select.Option>
          <Select.Option value="pending">Pending</Select.Option>
        </Select>
        <Button type="primary" onClick={handleSearch}>
          Search
        </Button>
      </Space>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} templates`
        }}
        onChange={handleTableChange}
      />
    </Card>
  );
};

export default TemplateList;
