/**
 * Submission History Panel Component (Phase 2)
 *
 * Timeline view of case submission history.
 */

import React from 'react';
import { Timeline, Card, Typography, Tag, Empty, Spin } from 'antd';
import {
  FileAddOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  SendOutlined,
  SafetyCertificateOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  LoadingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { SubmissionHistoryEntry, SubmissionEventType } from '../../../shared/types/case.types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;

interface SubmissionHistoryPanelProps {
  history: SubmissionHistoryEntry[];
  loading?: boolean;
}

const eventConfig: Record<
  SubmissionEventType,
  { icon: React.ReactNode; color: string; label: string }
> = {
  created: {
    icon: <FileAddOutlined />,
    color: 'blue',
    label: 'Case Created'
  },
  marked_ready: {
    icon: <CheckCircleOutlined />,
    color: 'cyan',
    label: 'Marked Ready for Export'
  },
  returned_to_draft: {
    icon: <RollbackOutlined />,
    color: 'orange',
    label: 'Returned to Draft'
  },
  exported: {
    icon: <ExportOutlined />,
    color: 'purple',
    label: 'Exported to XML'
  },
  submitted: {
    icon: <SendOutlined />,
    color: 'geekblue',
    label: 'Submitted to FDA'
  },
  acknowledged: {
    icon: <SafetyCertificateOutlined />,
    color: 'green',
    label: 'FDA Acknowledged'
  },
  rejected: {
    icon: <CloseCircleOutlined />,
    color: 'red',
    label: 'FDA Rejected'
  },
  api_submitting: {
    icon: <LoadingOutlined />,
    color: 'orange',
    label: 'API Submission In Progress'
  },
  api_submit_success: {
    icon: <CheckCircleOutlined />,
    color: 'green',
    label: 'API Submission Successful'
  },
  api_submit_failed: {
    icon: <CloseCircleOutlined />,
    color: 'red',
    label: 'API Submission Failed'
  },
  api_retry: {
    icon: <ReloadOutlined />,
    color: 'orange',
    label: 'API Submission Retry'
  },
  ack_received: {
    icon: <SafetyCertificateOutlined />,
    color: 'green',
    label: 'Acknowledgment Received'
  },
  nack_received: {
    icon: <CloseCircleOutlined />,
    color: 'red',
    label: 'Negative Acknowledgment (NACK)'
  }
};

const SubmissionHistoryPanel: React.FC<SubmissionHistoryPanelProps> = ({
  history,
  loading = false
}) => {
  if (loading) {
    return (
      <Card title="Submission History" size="small">
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card title="Submission History" size="small">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No submission history"
        />
      </Card>
    );
  }

  const parseDetails = (details?: string): Record<string, unknown> | null => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  const renderDetails = (entry: SubmissionHistoryEntry) => {
    const details = parseDetails(entry.details);
    if (!details) return null;

    const items: React.ReactNode[] = [];

    if (details.filename) {
      items.push(
        <div key="filename">
          <Text type="secondary">File: </Text>
          <Text code>{details.filename as string}</Text>
        </div>
      );
    }

    // Show environment for export events
    if (details.submissionEnvironment) {
      const isTest = details.submissionEnvironment === 'Test';
      items.push(
        <div key="environment">
          <Text type="secondary">Environment: </Text>
          <Tag color={isTest ? 'orange' : 'green'}>
            {String(details.submissionEnvironment)}
          </Tag>
          {details.submissionReportType ? (
            <Tag>{String(details.submissionReportType)}</Tag>
          ) : null}
        </div>
      );
    }

    if (details.srpConfirmationNumber) {
      items.push(
        <div key="esg">
          <Text type="secondary">ESG Core ID: </Text>
          <Text strong>{details.srpConfirmationNumber as string}</Text>
        </div>
      );
    }

    if (details.fdaCaseNumber) {
      items.push(
        <div key="fda">
          <Text type="secondary">FDA Case Number: </Text>
          <Text strong>{details.fdaCaseNumber as string}</Text>
        </div>
      );
    }

    if (details.rejectionReason) {
      items.push(
        <div key="reason">
          <Text type="secondary">Reason: </Text>
          <Text type="danger">{details.rejectionReason as string}</Text>
        </div>
      );
    }

    if (details.previousStatus) {
      items.push(
        <div key="prev">
          <Text type="secondary">Previous Status: </Text>
          <Tag>{details.previousStatus as string}</Tag>
        </div>
      );
    }

    // ESG API submission details
    if (details.esgSubmissionId) {
      items.push(
        <div key="esgSubmissionId">
          <Text type="secondary">ESG Submission ID: </Text>
          <Text code>{details.esgSubmissionId as string}</Text>
        </div>
      );
    }

    if (details.esgCoreId) {
      items.push(
        <div key="esgCoreId">
          <Text type="secondary">ESG Core ID: </Text>
          <Text strong>{details.esgCoreId as string}</Text>
        </div>
      );
    }

    if (details.error) {
      items.push(
        <div key="apiError">
          <Text type="secondary">Error: </Text>
          <Text type="danger">{details.error as string}</Text>
        </div>
      );
    }

    if (details.errorCategory) {
      items.push(
        <div key="errorCategory">
          <Text type="secondary">Error Category: </Text>
          <Tag color="red">{details.errorCategory as string}</Tag>
        </div>
      );
    }

    if (details.ackType) {
      const ackColors: Record<string, string> = {
        ACK1: 'processing',
        ACK2: 'success',
        ACK3: 'success',
        NACK: 'error'
      };
      items.push(
        <div key="ackType">
          <Text type="secondary">Acknowledgment: </Text>
          <Tag color={ackColors[details.ackType as string] || 'default'}>
            {details.ackType as string}
          </Tag>
        </div>
      );
    }

    if (details.attemptNumber) {
      items.push(
        <div key="attemptNumber">
          <Text type="secondary">Attempt: </Text>
          <Text>#{details.attemptNumber as number}</Text>
        </div>
      );
    }

    return items.length > 0 ? (
      <div style={{ marginTop: 4 }}>{items}</div>
    ) : null;
  };

  return (
    <Card title="Submission History" size="small">
      <Timeline
        items={history.map((entry) => {
          const config = eventConfig[entry.eventType] || {
            icon: <FileAddOutlined />,
            color: 'gray',
            label: entry.eventType
          };

          return {
            dot: config.icon,
            color: config.color,
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong>{config.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(entry.timestamp).fromNow()}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(entry.timestamp).format('MMM D, YYYY h:mm A')}
                  </Text>
                </div>
                {renderDetails(entry)}
                {entry.notes && (
                  <Paragraph
                    type="secondary"
                    style={{ marginTop: 4, marginBottom: 0, fontSize: 12 }}
                    italic
                  >
                    {entry.notes}
                  </Paragraph>
                )}
              </div>
            )
          };
        })}
      />
    </Card>
  );
};

export default SubmissionHistoryPanel;
