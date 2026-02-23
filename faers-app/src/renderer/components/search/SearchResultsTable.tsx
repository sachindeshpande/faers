/**
 * Search Results Table Component
 * Displays search results with pagination
 */

import React from 'react';
import { Table, Tag, Typography, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SearchResults } from '../../../shared/types/search.types';
import type { CaseListItem } from '../../../shared/types/case.types';
import dayjs from 'dayjs';

const { Text } = Typography;

interface SearchResultsTableProps {
  results: SearchResults;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSelectCase?: (caseId: string) => void;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Draft':
      return 'default';
    case 'Ready for Export':
      return 'blue';
    case 'Exported':
      return 'cyan';
    case 'Submitted':
      return 'orange';
    case 'Acknowledged':
      return 'green';
    default:
      return 'default';
  }
};

const getWorkflowStatusColor = (status?: string): string => {
  switch (status) {
    case 'Draft':
      return 'default';
    case 'Under Review':
      return 'processing';
    case 'Approved':
      return 'success';
    case 'Rejected':
      return 'error';
    case 'Pending PSR':
      return 'warning';
    case 'Included in PSR':
      return 'purple';
    default:
      return 'default';
  }
};

export const SearchResultsTable: React.FC<SearchResultsTableProps> = ({
  results,
  currentPage,
  pageSize,
  onPageChange,
  onSelectCase
}) => {
  const columns: ColumnsType<CaseListItem> = [
    {
      title: 'Case ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
      render: (id: string) => (
        <Tooltip title={id}>
          <Text
            strong
            style={{ cursor: onSelectCase ? 'pointer' : 'default', color: '#1890ff' }}
            onClick={() => onSelectCase?.(id)}
          >
            {id.substring(0, 8)}...
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'Patient',
      dataIndex: 'patient_initials',
      key: 'patient',
      width: 100,
      render: (initials: string) => initials || '-'
    },
    {
      title: 'Product',
      dataIndex: 'product_name',
      key: 'product',
      width: 200,
      ellipsis: true,
      render: (productName: string) => (
        <Tooltip title={productName}>
          {productName || '-'}
        </Tooltip>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      )
    },
    {
      title: 'Workflow',
      dataIndex: 'workflow_status',
      key: 'workflow_status',
      width: 120,
      render: (status: string) => (
        status ? <Tag color={getWorkflowStatusColor(status)}>{status}</Tag> : '-'
      )
    },
    {
      title: 'Assignee',
      dataIndex: 'current_assignee',
      key: 'current_assignee',
      width: 120,
      ellipsis: true,
      render: (assignee: string) => assignee || '-'
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(date).format('YYYY-MM-DD')}
        </Tooltip>
      )
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 120,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(date).format('YYYY-MM-DD')}
        </Tooltip>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={results.cases}
      rowKey="id"
      size="small"
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: results.total,
        showSizeChanger: false,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} cases`,
        onChange: onPageChange
      }}
      scroll={{ x: 1000 }}
      onRow={(record) => ({
        onClick: () => onSelectCase?.(record.id),
        style: { cursor: onSelectCase ? 'pointer' : 'default' }
      })}
    />
  );
};
