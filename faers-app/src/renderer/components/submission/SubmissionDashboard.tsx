/**
 * Submission Dashboard Component (Phase 2)
 *
 * Dashboard with status cards, needs-attention list, and activity feed.
 */

import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  Typography,
  Empty,
  Spin,
  Badge,
  Button
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  SendOutlined,
  SafetyCertificateOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type {
  DashboardStats,
  CaseStatus,
  NeedsAttentionItem
} from '../../../shared/types/case.types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

interface SubmissionDashboardProps {
  stats: DashboardStats | null;
  loading?: boolean;
  onStatusClick?: (status: CaseStatus) => void;
  onCaseClick?: (caseId: string) => void;
}

const statusConfig: Record<
  CaseStatus,
  { icon: React.ReactNode; color: string }
> = {
  Draft: { icon: <FileTextOutlined />, color: '#1890ff' },
  'Ready for Export': { icon: <CheckCircleOutlined />, color: '#13c2c2' },
  Exported: { icon: <ExportOutlined />, color: '#722ed1' },
  Submitting: { icon: <SendOutlined />, color: '#fa8c16' },
  Submitted: { icon: <SendOutlined />, color: '#2f54eb' },
  Acknowledged: { icon: <SafetyCertificateOutlined />, color: '#52c41a' },
  'Submission Failed': { icon: <CloseCircleOutlined />, color: '#ff4d4f' },
  Rejected: { icon: <CloseCircleOutlined />, color: '#f5222d' }
};

const attentionReasonLabels: Record<NeedsAttentionItem['reason'], string> = {
  exported_not_submitted: 'Exported but not submitted',
  submitted_no_ack: 'Awaiting FDA acknowledgment',
  rejected: 'Rejected by FDA',
  submission_failed: 'API submission failed',
  awaiting_ack_timeout: 'Acknowledgment polling timed out'
};

const SubmissionDashboard: React.FC<SubmissionDashboardProps> = ({
  stats,
  loading = false,
  onStatusClick,
  onCaseClick
}) => {
  if (loading || !stats) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const statuses: CaseStatus[] = [
    'Draft',
    'Ready for Export',
    'Exported',
    'Submitting',
    'Submitted',
    'Acknowledged',
    'Submission Failed',
    'Rejected'
  ];

  return (
    <div style={{ padding: 16 }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        Submission Dashboard
      </Title>

      {/* Status Cards */}
      <Row gutter={[16, 16]}>
        {statuses.map((status) => {
          const config = statusConfig[status];
          const count = stats.statusCounts[status] || 0;

          return (
            <Col xs={12} sm={8} md={4} key={status}>
              <Card
                hoverable
                onClick={() => onStatusClick?.(status)}
                bodyStyle={{ padding: 16 }}
              >
                <Statistic
                  title={status}
                  value={count}
                  prefix={config.icon}
                  valueStyle={{ color: config.color }}
                />
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* Needs Attention */}
        <Col xs={24} md={12}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                Needs Attention
                {stats.needsAttention.length > 0 && (
                  <Badge
                    count={stats.needsAttention.length}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </span>
            }
            bodyStyle={{ maxHeight: 400, overflow: 'auto' }}
          >
            {stats.needsAttention.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="All cases are up to date"
              />
            ) : (
              <List
                dataSource={stats.needsAttention}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        size="small"
                        key="open"
                        onClick={() => onCaseClick?.(item.caseId)}
                      >
                        Open
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <ClockCircleOutlined
                          style={{
                            fontSize: 20,
                            color:
                              item.reason === 'rejected'
                                ? '#f5222d'
                                : '#faad14'
                          }}
                        />
                      }
                      title={
                        <span>
                          <Text code>{item.caseId}</Text>
                          {item.reason === 'rejected' && (
                            <Tag color="red" style={{ marginLeft: 8 }}>
                              Rejected
                            </Tag>
                          )}
                        </span>
                      }
                      description={
                        <span>
                          {attentionReasonLabels[item.reason]}
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            ({item.daysSinceEvent} days ago)
                          </Text>
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} md={12}>
          <Card
            title={
              <span>
                <ClockCircleOutlined style={{ marginRight: 8 }} />
                Recent Activity
              </span>
            }
            bodyStyle={{ maxHeight: 400, overflow: 'auto' }}
          >
            {stats.recentActivity.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No recent activity"
              />
            ) : (
              <List
                dataSource={stats.recentActivity}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span>
                          <Text
                            code
                            style={{ cursor: 'pointer' }}
                            onClick={() => onCaseClick?.(item.caseId)}
                          >
                            {item.caseId}
                          </Text>
                        </span>
                      }
                      description={
                        <span>
                          {item.description}
                          <Text
                            type="secondary"
                            style={{ marginLeft: 8, fontSize: 12 }}
                          >
                            {dayjs(item.timestamp).fromNow()}
                          </Text>
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SubmissionDashboard;
