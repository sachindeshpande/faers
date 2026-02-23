/**
 * Validation Results Panel Component
 * Displays validation results for a case
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Alert,
  Collapse,
  Table,
  Spin,
  Checkbox,
  Modal,
  Input,
  message,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useValidationStore } from '../../stores/validationStore';
import type { ValidationResult as ValidationResultItem, ValidationSeverity } from '../../../shared/types/validation.types';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SEVERITY_ICONS: Record<ValidationSeverity, React.ReactNode> = {
  error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  warning: <WarningOutlined style={{ color: '#faad14' }} />,
  info: <InfoCircleOutlined style={{ color: '#1890ff' }} />
};

const SEVERITY_COLORS: Record<ValidationSeverity, string> = {
  error: 'red',
  warning: 'orange',
  info: 'blue'
};

interface ValidationResultsPanelProps {
  caseId: string;
  autoValidate?: boolean;
  onValidationComplete?: (isValid: boolean, canSubmit: boolean) => void;
}

export const ValidationResultsPanel: React.FC<ValidationResultsPanelProps> = ({
  caseId,
  autoValidate = false,
  onValidationComplete
}) => {
  const {
    currentValidation,
    isValidating,
    runValidation,
    getValidationResults,
    acknowledgeWarnings,
    error
  } = useValidationStore();

  const [selectedWarnings, setSelectedWarnings] = useState<number[]>([]);
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [ackNotes, setAckNotes] = useState('');

  useEffect(() => {
    if (autoValidate && caseId) {
      runValidation(caseId);
    } else if (caseId) {
      getValidationResults(caseId);
    }
  }, [caseId, autoValidate, runValidation, getValidationResults]);

  useEffect(() => {
    if (currentValidation && onValidationComplete) {
      onValidationComplete(currentValidation.isValid, currentValidation.canSubmit);
    }
  }, [currentValidation, onValidationComplete]);

  const handleRevalidate = async () => {
    const result = await runValidation(caseId);
    if (result) {
      message.success('Validation completed');
    }
  };

  const handleAcknowledge = async () => {
    if (selectedWarnings.length === 0) return;

    const success = await acknowledgeWarnings(caseId, selectedWarnings, ackNotes);
    if (success) {
      message.success('Warnings acknowledged');
      setSelectedWarnings([]);
      setAckModalOpen(false);
      setAckNotes('');
    }
  };

  const handleSelectWarning = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedWarnings([...selectedWarnings, id]);
    } else {
      setSelectedWarnings(selectedWarnings.filter(w => w !== id));
    }
  };

  const handleSelectAllWarnings = (checked: boolean) => {
    if (checked && currentValidation) {
      const unackIds = currentValidation.warnings
        .filter(w => !w.isAcknowledged && w.id)
        .map(w => w.id!);
      setSelectedWarnings(unackIds);
    } else {
      setSelectedWarnings([]);
    }
  };

  if (isValidating) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Validating case...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Validation Error"
        description={error}
        showIcon
      />
    );
  }

  if (!currentValidation) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text type="secondary">No validation results available</Text>
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRevalidate}
            >
              Run Validation
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const { errors, warnings, info, errorCount, warningCount, infoCount, isValid, canSubmit, validatedAt } = currentValidation;
  const unacknowledgedWarnings = warnings.filter(w => !w.isAcknowledged);

  const resultColumns = [
    {
      title: '',
      key: 'severity',
      width: 40,
      render: (_: unknown, record: ValidationResultItem) => SEVERITY_ICONS[record.severity]
    },
    {
      title: 'Rule',
      dataIndex: 'ruleCode',
      key: 'ruleCode',
      width: 140,
      render: (code: string, record: ValidationResultItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{code}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.ruleName}</Text>
        </Space>
      )
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      render: (msg: string) => msg
    },
    {
      title: 'Field',
      dataIndex: 'fieldPath',
      key: 'fieldPath',
      width: 140,
      render: (field: string) => field || '-'
    }
  ];

  const warningColumns = [
    ...resultColumns,
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: unknown, record: ValidationResultItem) => (
        record.isAcknowledged ? (
          <Tag color="green">Acknowledged</Tag>
        ) : (
          <Checkbox
            checked={selectedWarnings.includes(record.id!)}
            onChange={(e) => handleSelectWarning(record.id!, e.target.checked)}
          />
        )
      )
    }
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="large">
            {isValid ? (
              <Space>
                <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                <div>
                  <Title level={5} style={{ margin: 0, color: '#52c41a' }}>
                    Validation Passed
                  </Title>
                  <Text type="secondary">No errors found</Text>
                </div>
              </Space>
            ) : (
              <Space>
                <CloseCircleOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
                <div>
                  <Title level={5} style={{ margin: 0, color: '#ff4d4f' }}>
                    Validation Failed
                  </Title>
                  <Text type="secondary">{errorCount} error(s) found</Text>
                </div>
              </Space>
            )}
          </Space>

          <Row gutter={24}>
            <Col>
              <Statistic
                title="Errors"
                value={errorCount}
                valueStyle={{ color: errorCount > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col>
              <Statistic
                title="Warnings"
                value={warningCount}
                valueStyle={{ color: warningCount > 0 ? '#faad14' : '#52c41a' }}
                prefix={<WarningOutlined />}
              />
            </Col>
            <Col>
              <Statistic
                title="Info"
                value={infoCount}
                valueStyle={{ color: '#1890ff' }}
                prefix={<InfoCircleOutlined />}
              />
            </Col>
          </Row>

          <Button
            icon={<ReloadOutlined />}
            onClick={handleRevalidate}
          >
            Revalidate
          </Button>
        </div>

        {!canSubmit && (
          <Alert
            type={!isValid ? 'error' : 'warning'}
            message={!isValid ? 'Cannot Submit' : 'Acknowledge Warnings Required'}
            description={
              !isValid
                ? 'Please fix all validation errors before submitting.'
                : `You have ${unacknowledgedWarnings.length} unacknowledged warning(s). Please review and acknowledge them before submitting.`
            }
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {errorCount > 0 && (
        <Collapse
          defaultActiveKey={['errors']}
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'errors',
              label: (
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  <Text strong>Errors ({errorCount})</Text>
                </Space>
              ),
              children: (
                <Table
                  dataSource={errors}
                  columns={resultColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              )
            }
          ]}
        />
      )}

      {warningCount > 0 && (
        <Collapse
          defaultActiveKey={unacknowledgedWarnings.length > 0 ? ['warnings'] : undefined}
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'warnings',
              label: (
                <Space>
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <Text strong>Warnings ({warningCount})</Text>
                  {unacknowledgedWarnings.length > 0 && (
                    <Tag color="orange">{unacknowledgedWarnings.length} unacknowledged</Tag>
                  )}
                </Space>
              ),
              children: (
                <div>
                  {unacknowledgedWarnings.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Space>
                        <Checkbox
                          checked={selectedWarnings.length === unacknowledgedWarnings.length}
                          indeterminate={selectedWarnings.length > 0 && selectedWarnings.length < unacknowledgedWarnings.length}
                          onChange={(e) => handleSelectAllWarnings(e.target.checked)}
                        >
                          Select All
                        </Checkbox>
                        <Button
                          type="primary"
                          size="small"
                          disabled={selectedWarnings.length === 0}
                          onClick={() => setAckModalOpen(true)}
                        >
                          Acknowledge Selected ({selectedWarnings.length})
                        </Button>
                      </Space>
                    </div>
                  )}
                  <Table
                    dataSource={warnings}
                    columns={warningColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </div>
              )
            }
          ]}
        />
      )}

      {infoCount > 0 && (
        <Collapse
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'info',
              label: (
                <Space>
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  <Text strong>Information ({infoCount})</Text>
                </Space>
              ),
              children: (
                <Table
                  dataSource={info}
                  columns={resultColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              )
            }
          ]}
        />
      )}

      <Text type="secondary" style={{ fontSize: 12 }}>
        Last validated: {new Date(validatedAt).toLocaleString()}
      </Text>

      {/* Acknowledge Modal */}
      <Modal
        title="Acknowledge Warnings"
        open={ackModalOpen}
        onOk={handleAcknowledge}
        onCancel={() => {
          setAckModalOpen(false);
          setAckNotes('');
        }}
      >
        <Text>
          You are about to acknowledge {selectedWarnings.length} warning(s). This indicates you have reviewed these warnings and understand their implications.
        </Text>
        <div style={{ marginTop: 16 }}>
          <Text>Notes (optional):</Text>
          <TextArea
            value={ackNotes}
            onChange={(e) => setAckNotes(e.target.value)}
            rows={3}
            placeholder="Enter any notes about why these warnings are being acknowledged..."
          />
        </div>
      </Modal>
    </div>
  );
};
