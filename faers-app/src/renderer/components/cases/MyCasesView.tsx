/**
 * My Cases View Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Default landing page showing cases assigned to the current user.
 * Sorted by due date with overdue/due soon indicators.
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Tooltip,
  Row,
  Col,
  Statistic,
  Select,
  Badge
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  RightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMyCases, useWorkflowActions } from '../../stores/workflowStore';
import WorkflowStatusBadge from '../workflow/WorkflowStatusBadge';
import type { CaseListItem } from '../../../shared/types/case.types';
import type { WorkflowStatus } from '../../../shared/types/workflow.types';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

interface MyCasesViewProps {
  onSelectCase: (id: string) => void;
}

const MyCasesView: React.FC<MyCasesViewProps> = ({ onSelectCase }) => {
  const { cases, total, overdue, dueSoon, isLoading } = useMyCases();
  const { fetchMyCases } = useWorkflowActions();

  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | undefined>();

  // Load cases on mount
  useEffect(() => {
    fetchMyCases();
  }, [fetchMyCases]);

  // Handle refresh
  const handleRefresh = () => {
    fetchMyCases();
  };

  // Handle status filter (client-side filtering)
  const handleStatusChange = (value: WorkflowStatus | 'all') => {
    const status = value === 'all' ? undefined : value;
    setStatusFilter(status);
    // Note: Filtering is applied client-side to displayed cases
  };

  // Get due date display with color coding
  const getDueDateDisplay = (dueDate: string | undefined, isOverdue: boolean | undefined) => {
    if (!dueDate) return '-';

    const date = dayjs(dueDate);
    const daysRemaining = date.diff(dayjs(), 'day');

    if (isOverdue || daysRemaining < 0) {
      return (
        <Tooltip title={`Due: ${date.format('MMM D, YYYY')}`}>
          <Tag color="error" icon={<ExclamationCircleOutlined />}>
            Overdue by {Math.abs(daysRemaining)} day{Math.abs(daysRemaining) !== 1 ? 's' : ''}
          </Tag>
        </Tooltip>
      );
    }

    if (daysRemaining <= 3) {
      return (
        <Tooltip title={`Due: ${date.format('MMM D, YYYY')}`}>
          <Tag color="warning" icon={<ClockCircleOutlined />}>
            Due in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
          </Tag>
        </Tooltip>
      );
    }

    if (daysRemaining <= 7) {
      return (
        <Tooltip title={`Due: ${date.format('MMM D, YYYY')}`}>
          <Tag color="blue" icon={<ClockCircleOutlined />}>
            Due in {daysRemaining} days
          </Tag>
        </Tooltip>
      );
    }

    return (
      <Tooltip title={`Due: ${date.format('MMM D, YYYY')}`}>
        <Text type="secondary">{date.format('MMM D, YYYY')}</Text>
      </Tooltip>
    );
  };

  // Table columns
  const columns: ColumnsType<CaseListItem> = [
    {
      title: 'Case ID',
      dataIndex: 'id',
      key: 'id',
      width: 180,
      render: (id: string) => (
        <Text code style={{ fontSize: 12 }}>
          {id}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'workflowStatus',
      key: 'workflowStatus',
      width: 160,
      render: (status: WorkflowStatus) => (
        <WorkflowStatusBadge status={status} showIcon={true} />
      )
    },
    {
      title: 'Patient',
      dataIndex: 'patientInitials',
      key: 'patientInitials',
      width: 100,
      render: (initials: string | undefined) => initials || '-'
    },
    {
      title: 'Product',
      dataIndex: 'productName',
      key: 'productName',
      ellipsis: true,
      render: (name: string | undefined) => name || '-'
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 160,
      sorter: (a: any, b: any) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf();
      },
      defaultSortOrder: 'ascend',
      render: (_: any, record: any) =>
        getDueDateDisplay(record.dueDate, record.isOverdue)
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string | undefined) => {
        if (!priority) return '-';
        const colors: Record<string, string> = {
          urgent: 'red',
          high: 'orange',
          normal: 'blue',
          low: 'default'
        };
        return <Tag color={colors[priority] || 'default'}>{priority}</Tag>;
      }
    },
    {
      title: 'Modified',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(date).fromNow()}
        </Tooltip>
      )
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Button
          type="text"
          icon={<RightOutlined />}
          onClick={() => onSelectCase(record.id)}
        />
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Assigned"
              value={total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overdue"
              value={overdue}
              valueStyle={{ color: overdue > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={overdue > 0 ? <ExclamationCircleOutlined /> : null}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Due Soon"
              value={dueSoon}
              valueStyle={{ color: dueSoon > 0 ? '#faad14' : '#52c41a' }}
              suffix="within 7 days"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="On Track"
              value={total - overdue - dueSoon}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Cases Table */}
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              My Cases
            </Title>
            {overdue > 0 && (
              <Badge count={overdue} style={{ backgroundColor: '#ff4d4f' }}>
                <Tag color="error">Overdue</Tag>
              </Badge>
            )}
          </Space>
        }
        extra={
          <Space>
            <Select
              style={{ width: 180 }}
              value={statusFilter || 'all'}
              onChange={handleStatusChange}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Data Entry Complete', label: 'Data Entry Complete' },
                { value: 'In Medical Review', label: 'In Medical Review' },
                { value: 'In QC Review', label: 'In QC Review' },
                { value: 'Approved', label: 'Approved' }
              ]}
            />
            <Tooltip title="Refresh">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={isLoading}
              />
            </Tooltip>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={cases}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} cases`
          }}
          onRow={(record) => ({
            onClick: () => onSelectCase(record.id),
            style: { cursor: 'pointer' }
          })}
          size="middle"
          locale={{
            emptyText: (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <Text type="secondary">No cases assigned to you</Text>
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
};

export default MyCasesView;
