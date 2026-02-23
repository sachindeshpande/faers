/**
 * Acknowledgment Display Component (Phase 2B)
 *
 * Displays FDA acknowledgment details for a case.
 */

import React from 'react';
import { Card, Tag, Descriptions, Button, Space, Typography, Alert, Collapse, List } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ApiSubmissionAttempt, EsgAckType, EsgAckError } from '../../../shared/types/esgApi.types';
import { ESG_ACK_LABELS, ESG_ACK_COLORS } from '../../../shared/types/esgApi.types';

const { Text } = Typography;

interface AcknowledgmentDisplayProps {
  attempt: ApiSubmissionAttempt | null;
  onCheckNow?: () => void;
  onExportPdf?: () => void;
  loading?: boolean;
}

const AcknowledgmentDisplay: React.FC<AcknowledgmentDisplayProps> = ({
  attempt,
  onCheckNow,
  onExportPdf,
  loading
}) => {
  if (!attempt) {
    return (
      <Alert
        type="info"
        message="No submission data available"
        description="This case has not been submitted via the API."
      />
    );
  }

  const hasAck = !!attempt.ackType;
  const isNack = attempt.ackType === 'NACK';
  const ackErrors: EsgAckError[] = attempt.ackErrors ? JSON.parse(attempt.ackErrors) : [];

  // Awaiting acknowledgment
  if (!hasAck && attempt.status === 'success') {
    return (
      <Card size="small" title="Awaiting FDA Acknowledgment">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Submission Date">{attempt.startedAt}</Descriptions.Item>
          <Descriptions.Item label="ESG Submission ID">
            <Text copyable>{attempt.esgSubmissionId || 'N/A'}</Text>
          </Descriptions.Item>
          {attempt.esgCoreId && (
            <Descriptions.Item label="ESG Core ID">
              <Text copyable>{attempt.esgCoreId}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>
        <Space style={{ marginTop: 12 }}>
          {onCheckNow && (
            <Button
              icon={<ReloadOutlined />}
              onClick={onCheckNow}
              loading={loading}
              size="small"
            >
              Check Now
            </Button>
          )}
        </Space>
      </Card>
    );
  }

  // Acknowledged
  if (hasAck && !isNack) {
    return (
      <Card size="small" title="FDA Acknowledgment Received">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Acknowledgment Type">
            <Tag color={ESG_ACK_COLORS[attempt.ackType as EsgAckType]}>
              {ESG_ACK_LABELS[attempt.ackType as EsgAckType] || attempt.ackType}
            </Tag>
          </Descriptions.Item>
          {attempt.ackFdaCoreId && (
            <Descriptions.Item label="FDA Core ID">
              <Text strong copyable>{attempt.ackFdaCoreId}</Text>
            </Descriptions.Item>
          )}
          {attempt.ackTimestamp && (
            <Descriptions.Item label="Acknowledgment Date">
              {new Date(attempt.ackTimestamp).toLocaleString()}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Environment">
            <Tag color={attempt.environment === 'Test' ? 'blue' : 'red'}>
              {attempt.environment}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
        {onExportPdf && (
          <Button
            icon={<DownloadOutlined />}
            onClick={onExportPdf}
            size="small"
            style={{ marginTop: 12 }}
          >
            Export as PDF
          </Button>
        )}
      </Card>
    );
  }

  // NACK received
  if (isNack) {
    return (
      <Card size="small" title="FDA Rejection (NACK)">
        <Alert
          type="error"
          showIcon
          message="Submission Rejected by FDA"
          style={{ marginBottom: 12 }}
        />
        <Descriptions column={1} size="small">
          {attempt.ackTimestamp && (
            <Descriptions.Item label="Rejection Date">
              {new Date(attempt.ackTimestamp).toLocaleString()}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="ESG Submission ID">
            <Text copyable>{attempt.esgSubmissionId || 'N/A'}</Text>
          </Descriptions.Item>
        </Descriptions>
        {ackErrors.length > 0 && (
          <Collapse
            size="small"
            style={{ marginTop: 12 }}
            items={[{
              key: '1',
              label: `Error Details (${ackErrors.length})`,
              children: (
                <List
                  size="small"
                  dataSource={ackErrors}
                  renderItem={(err) => (
                    <List.Item>
                      <div>
                        <Tag color={err.severity === 'error' ? 'red' : 'orange'}>
                          {err.code}
                        </Tag>
                        <Text>{err.message}</Text>
                        {err.field && (
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                            Field: {err.field}
                          </Text>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              )
            }]}
          />
        )}
      </Card>
    );
  }

  // Failed submission (no ack)
  return (
    <Card size="small" title="Submission Status">
      <Alert
        type="error"
        showIcon
        message="Submission Failed"
        description={attempt.error || 'Unknown error'}
        style={{ marginBottom: 12 }}
      />
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Attempt">{attempt.attemptNumber}</Descriptions.Item>
        {attempt.errorCategory && (
          <Descriptions.Item label="Error Category">
            <Tag>{attempt.errorCategory}</Tag>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
};

export default AcknowledgmentDisplay;
