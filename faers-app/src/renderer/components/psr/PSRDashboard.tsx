/**
 * PSR Dashboard Component
 * Phase 4: Periodic Safety Report Dashboard with upcoming deadlines and status overview
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  Alert,
  Button,
  Progress,
  Timeline,
  Spin,
  Empty
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  RightOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { usePSRStore, usePSRDashboard } from '../../stores/psrStore';
import type { PSRListItem, PSRStatus } from '../../../shared/types/psr.types';
import {
  PSR_STATUS_LABELS,
  PSR_STATUS_COLORS,
  PSR_FORMAT_LABELS
} from '../../../shared/types/psr.types';

const { Title, Text } = Typography;

interface PSRDashboardProps {
  onViewPSR?: (psrId: number) => void;
  onCreatePSR?: () => void;
  onViewAllPSRs?: () => void;
}

export const PSRDashboard: React.FC<PSRDashboardProps> = ({
  onViewPSR,
  onCreatePSR,
  onViewAllPSRs
}) => {
  const { dashboard, loading, error } = usePSRDashboard();
  const { loadDashboard, openCreateWizard } = usePSRStore();

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = () => {
    loadDashboard();
  };

  const handleCreatePSR = () => {
    if (onCreatePSR) {
      onCreatePSR();
    } else {
      openCreateWizard();
    }
  };

  const getDaysUntilDue = (dueDate: string): number => {
    return dayjs(dueDate).diff(dayjs(), 'day');
  };

  const getDueDateColor = (daysUntilDue: number): string => {
    if (daysUntilDue < 0) return '#ff4d4f'; // Overdue - red
    if (daysUntilDue <= 7) return '#faad14'; // Due within a week - yellow
    if (daysUntilDue <= 30) return '#1890ff'; // Due within a month - blue
    return '#52c41a'; // More than a month - green
  };

  const upcomingColumns: ColumnsType<PSRListItem> = [
    {
      title: 'PSR',
      key: 'psr',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.psrNumber}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.productName}
          </Text>
        </Space>
      )
    },
    {
      title: 'Format',
      dataIndex: 'psrFormat',
      key: 'psrFormat',
      width: 100,
      render: (format) => <Tag>{PSR_FORMAT_LABELS[format]}</Tag>
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 130,
      render: (date: string) => {
        const daysUntil = getDaysUntilDue(date);
        const color = getDueDateColor(daysUntil);
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ color }}>{dayjs(date).format('MMM D, YYYY')}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {daysUntil < 0
                ? `${Math.abs(daysUntil)} days overdue`
                : daysUntil === 0
                ? 'Due today'
                : `${daysUntil} days left`}
            </Text>
          </Space>
        );
      },
      sorter: (a, b) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix()
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: PSRStatus) => (
        <Tag color={PSR_STATUS_COLORS[status]}>{PSR_STATUS_LABELS[status]}</Tag>
      )
    },
    {
      title: 'Cases',
      key: 'cases',
      width: 80,
      render: (_, record) => (
        <Text>{record.includedCaseCount}</Text>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<RightOutlined />}
          onClick={() => onViewPSR?.(record.id)}
        />
      )
    }
  ];

  if (loading && !dashboard) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error loading dashboard"
        description={error}
        type="error"
        showIcon
        action={
          <Button onClick={handleRefresh}>Retry</Button>
        }
      />
    );
  }

  const totalActive = dashboard?.statusCounts
    ? Object.values(dashboard.statusCounts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="psr-dashboard">
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              <CalendarOutlined /> PSR Dashboard
            </Title>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePSR}>
                Create PSR
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue PSRs"
              value={dashboard?.overduePSRs?.length || 0}
              valueStyle={{ color: (dashboard?.overduePSRs?.length || 0) > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Due This Week"
              value={dashboard?.dueThisWeek?.length || 0}
              valueStyle={{ color: (dashboard?.dueThisWeek?.length || 0) > 0 ? '#faad14' : undefined }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={(dashboard?.statusCounts?.draft || 0) + (dashboard?.statusCounts?.under_review || 0)}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Cases"
              value={dashboard?.casesAwaitingPSR || 0}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts for urgent items */}
      {(dashboard?.overduePSRs?.length || 0) > 0 && (
        <Alert
          message={`${dashboard?.overduePSRs?.length} PSR(s) are overdue!`}
          description="Please review and submit overdue reports as soon as possible."
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
          action={
            <Button
              size="small"
              danger
              onClick={() => dashboard?.overduePSRs?.[0] && onViewPSR?.(dashboard.overduePSRs[0].id)}
            >
              View Overdue
            </Button>
          }
        />
      )}

      {/* Main Content */}
      <Row gutter={16}>
        {/* Upcoming PSRs Table */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <CalendarOutlined />
                <span>Upcoming PSR Deadlines</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={onViewAllPSRs}>
                View All <RightOutlined />
              </Button>
            }
          >
            {dashboard?.upcomingDeadlines && dashboard.upcomingDeadlines.length > 0 ? (
              <Table
                columns={upcomingColumns}
                dataSource={dashboard.upcomingDeadlines}
                rowKey="id"
                size="small"
                pagination={false}
                rowClassName={(record) => {
                  const daysUntil = getDaysUntilDue(record.dueDate);
                  if (daysUntil < 0) return 'row-overdue';
                  if (daysUntil <= 7) return 'row-due-soon';
                  return '';
                }}
              />
            ) : (
              <Empty description="No upcoming PSR deadlines" />
            )}
          </Card>
        </Col>

        {/* Status Breakdown */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>PSR Status Overview</span>
              </Space>
            }
          >
            {dashboard?.statusCounts && totalActive > 0 ? (
              <div>
                {Object.entries(dashboard.statusCounts).map(([status, count]) => {
                  if (count === 0) return null;
                  const percentage = Math.round((count / totalActive) * 100);
                  return (
                    <div key={status} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Tag color={PSR_STATUS_COLORS[status as PSRStatus]}>
                          {PSR_STATUS_LABELS[status as PSRStatus]}
                        </Tag>
                        <Text>{count}</Text>
                      </div>
                      <Progress
                        percent={percentage}
                        showInfo={false}
                        strokeColor={
                          status === 'draft' ? '#1890ff' :
                          status === 'under_review' ? '#faad14' :
                          status === 'approved' ? '#52c41a' :
                          status === 'submitted' ? '#13c2c2' :
                          '#d9d9d9'
                        }
                        size="small"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty description="No active PSRs" />
            )}
          </Card>

          {/* Recent Activity Timeline */}
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>Recent Activity</span>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            {dashboard?.recentActivity && dashboard.recentActivity.length > 0 ? (
              <Timeline
                items={dashboard.recentActivity.slice(0, 5).map((activity, index) => ({
                  key: index,
                  color: activity.type === 'created' ? 'green' :
                         activity.type === 'submitted' ? 'blue' :
                         activity.type === 'approved' ? 'green' :
                         'gray',
                  children: (
                    <div>
                      <Text strong>{activity.psrNumber}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {activity.description}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(activity.timestamp).fromNow()}
                      </Text>
                    </div>
                  )
                }))}
              />
            ) : (
              <Empty description="No recent activity" />
            )}
          </Card>
        </Col>
      </Row>

      <style>{`
        .row-overdue {
          background-color: #fff1f0 !important;
        }
        .row-due-soon {
          background-color: #fffbe6 !important;
        }
      `}</style>
    </div>
  );
};

export default PSRDashboard;
