/**
 * BatchDetail Component
 * Phase 4: View and manage a single batch
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Spin,
  Alert,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Divider,
  Progress,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  SendOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useBatchDetail, useBatchValidation, useBatchExport, useBatchSubmission, useBatchStore } from '../../stores/batchStore';
import type { BatchCase, BatchStatus } from '../../../shared/types/batch.types';
import {
  BATCH_TYPE_LABELS,
  BATCH_STATUS_LABELS,
  BATCH_STATUS_COLORS
} from '../../../shared/types/batch.types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface BatchDetailProps {
  batchId: number;
  onBack: () => void;
}

const BatchDetail: React.FC<BatchDetailProps> = ({ batchId, onBack }) => {
  const { batch, cases, isLoading, loadBatch, clearBatch } = useBatchDetail();
  const { isValidating, validationResult, validateBatch } = useBatchValidation();
  const { isExporting, exportBatch } = useBatchExport();
  const { recordSubmission, recordAcknowledgment } = useBatchSubmission();
  const deleteBatch = useBatchStore((state) => state.deleteBatch);

  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [submissionForm] = Form.useForm();
  const [ackForm] = Form.useForm();

  useEffect(() => {
    loadBatch(batchId);
    return () => clearBatch();
  }, [batchId]);

  const handleValidate = async () => {
    const result = await validateBatch(batchId);
    if (result) {
      if (result.isValid) {
        message.success('All cases validated successfully');
      } else {
        message.warning(`${result.invalidCases} of ${result.totalCases} cases have validation errors`);
      }
    }
  };

  const handleExport = async () => {
    const dialogResult = await window.electronAPI.showSaveDialog({
      title: 'Export Batch XML',
      defaultPath: `batch-${batch?.batchNumber}.xml`,
      filters: [{ name: 'XML Files', extensions: ['xml'] }]
    });

    if (dialogResult.success && dialogResult.data) {
      const dirPath = dialogResult.data.substring(0, dialogResult.data.lastIndexOf('/'));
      const result = await exportBatch(batchId, dirPath);
      if (result) {
        message.success(`Batch exported to ${result.filename}`);
      }
    }
  };

  const handleRecordSubmission = async (values: { esgCoreId: string; submissionDate: dayjs.Dayjs; notes?: string }) => {
    const result = await recordSubmission(
      batchId,
      values.esgCoreId,
      values.submissionDate.toISOString(),
      values.notes
    );
    if (result) {
      message.success('Submission recorded');
      setSubmissionModalOpen(false);
      submissionForm.resetFields();
    }
  };

  const handleRecordAcknowledgment = async (values: { ackType: 'accepted' | 'rejected' | 'partial'; acknowledgmentDate: dayjs.Dayjs; details?: string; notes?: string }) => {
    const result = await recordAcknowledgment(
      batchId,
      values.ackType,
      values.acknowledgmentDate.toISOString(),
      values.details,
      values.notes
    );
    if (result) {
      message.success('Acknowledgment recorded');
      setAckModalOpen(false);
      ackForm.resetFields();
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Batch',
      content: 'Are you sure you want to delete this batch? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        const success = await deleteBatch(batchId);
        if (success) {
          message.success('Batch deleted');
          onBack();
        }
      }
    });
  };

  const caseColumns: ColumnsType<BatchCase> = [
    {
      title: 'Case ID',
      dataIndex: 'caseId',
      key: 'caseId',
      width: 120,
      ellipsis: true
    },
    {
      title: 'Safety Report ID',
      dataIndex: 'safetyReportId',
      key: 'safetyReportId',
      width: 180
    },
    {
      title: 'Patient',
      dataIndex: 'patientInitials',
      key: 'patientInitials',
      width: 100
    },
    {
      title: 'Workflow Status',
      dataIndex: 'workflowStatus',
      key: 'workflowStatus',
      width: 140
    },
    {
      title: 'Validation',
      dataIndex: 'validationStatus',
      key: 'validationStatus',
      width: 120,
      render: (status: 'pending' | 'valid' | 'invalid') => {
        if (status === 'valid') {
          return <Tag color="green" icon={<CheckCircleOutlined />}>Valid</Tag>;
        } else if (status === 'invalid') {
          return <Tag color="red" icon={<CloseCircleOutlined />}>Invalid</Tag>;
        }
        return <Tag>Pending</Tag>;
      }
    },
    {
      title: 'Errors',
      dataIndex: 'validationErrors',
      key: 'validationErrors',
      render: (errors?: string[]) => (
        errors && errors.length > 0 ? (
          <Text type="danger" style={{ fontSize: 12 }}>
            {errors.join(', ')}
          </Text>
        ) : '-'
      )
    }
  ];

  const getStatusActions = (status: BatchStatus) => {
    const actions: React.ReactNode[] = [];

    if (status === 'created' || status === 'validation_failed') {
      actions.push(
        <Button
          key="validate"
          icon={<CheckCircleOutlined />}
          onClick={handleValidate}
          loading={isValidating}
        >
          Validate
        </Button>
      );
    }

    if (status === 'validated') {
      actions.push(
        <Button
          key="export"
          type="primary"
          icon={<ExportOutlined />}
          onClick={handleExport}
          loading={isExporting}
        >
          Export XML
        </Button>
      );
    }

    if (status === 'exported') {
      actions.push(
        <Button
          key="record-submission"
          type="primary"
          icon={<SendOutlined />}
          onClick={() => setSubmissionModalOpen(true)}
        >
          Record Submission
        </Button>
      );
    }

    if (status === 'submitted') {
      actions.push(
        <Button
          key="record-ack"
          type="primary"
          icon={<FileTextOutlined />}
          onClick={() => setAckModalOpen(true)}
        >
          Record Acknowledgment
        </Button>
      );
    }

    if (status === 'created') {
      actions.push(
        <Button
          key="delete"
          danger
          icon={<DeleteOutlined />}
          onClick={handleDelete}
        >
          Delete
        </Button>
      );
    }

    return actions;
  };

  if (isLoading || !batch) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  const validCount = cases.filter(c => c.validationStatus === 'valid').length;
  const invalidCount = cases.filter(c => c.validationStatus === 'invalid').length;
  const pendingCount = cases.filter(c => c.validationStatus === 'pending').length;

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
              <Title level={4} style={{ margin: 0 }}>{batch.batchNumber}</Title>
              <Tag color={BATCH_STATUS_COLORS[batch.status]}>
                {BATCH_STATUS_LABELS[batch.status]}
              </Tag>
            </Space>
            <Space>{getStatusActions(batch.status)}</Space>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <Descriptions column={3}>
            <Descriptions.Item label="Batch Type">
              {BATCH_TYPE_LABELS[batch.batchType]}
            </Descriptions.Item>
            <Descriptions.Item label="Case Count">
              {batch.caseCount}
            </Descriptions.Item>
            <Descriptions.Item label="Submission Mode">
              {batch.submissionMode ? (
                <Tag color={batch.submissionMode === 'production' ? 'blue' : 'orange'}>
                  {batch.submissionMode === 'production' ? 'Production' : 'Test'}
                </Tag>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {dayjs(batch.createdAt).format('MMM D, YYYY h:mm A')}
            </Descriptions.Item>
            <Descriptions.Item label="Created By">
              {batch.createdByName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="ESG Core ID">
              {batch.esgCoreId || '-'}
            </Descriptions.Item>
            {batch.submittedAt && (
              <Descriptions.Item label="Submitted">
                {dayjs(batch.submittedAt).format('MMM D, YYYY h:mm A')}
              </Descriptions.Item>
            )}
            {batch.acknowledgedAt && (
              <Descriptions.Item label="Acknowledged">
                {dayjs(batch.acknowledgedAt).format('MMM D, YYYY h:mm A')}
              </Descriptions.Item>
            )}
            {batch.ackType && (
              <Descriptions.Item label="Acknowledgment">
                <Tag color={batch.ackType === 'accepted' ? 'green' : batch.ackType === 'rejected' ? 'red' : 'orange'}>
                  {batch.ackType.charAt(0).toUpperCase() + batch.ackType.slice(1)}
                </Tag>
              </Descriptions.Item>
            )}
          </Descriptions>

          {batch.xmlFilePath && (
            <Alert
              message="XML Exported"
              description={`File: ${batch.xmlFilename}`}
              type="success"
              showIcon
            />
          )}

          {batch.notes && (
            <div>
              <Text strong>Notes:</Text>
              <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{batch.notes}</div>
            </div>
          )}
        </Space>
      </Card>

      {validationResult && (
        <Card title="Validation Results" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Progress
                type="circle"
                percent={Math.round((validationResult.validCases / validationResult.totalCases) * 100)}
                status={validationResult.isValid ? 'success' : 'exception'}
                size={80}
              />
              <div>
                <div><Tag color="green">{validationResult.validCases} valid</Tag></div>
                <div><Tag color="red">{validationResult.invalidCases} invalid</Tag></div>
              </div>
            </div>
            {!validationResult.isValid && (
              <Alert
                message="Validation Failed"
                description="Some cases have errors. Please fix the errors and validate again."
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
              />
            )}
          </Space>
        </Card>
      )}

      <Card title={`Cases (${cases.length})`}>
        {cases.length > 0 && (
          <Space style={{ marginBottom: 16 }}>
            <Tag color="green">{validCount} valid</Tag>
            <Tag color="red">{invalidCount} invalid</Tag>
            <Tag>{pendingCount} pending</Tag>
          </Space>
        )}
        <Table
          columns={caseColumns}
          dataSource={cases}
          rowKey="caseId"
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </Card>

      {/* Record Submission Modal */}
      <Modal
        title="Record Submission"
        open={submissionModalOpen}
        onCancel={() => setSubmissionModalOpen(false)}
        footer={null}
      >
        <Form
          form={submissionForm}
          layout="vertical"
          onFinish={handleRecordSubmission}
          initialValues={{ submissionDate: dayjs() }}
        >
          <Form.Item
            name="esgCoreId"
            label="ESG Core ID"
            rules={[{ required: true, message: 'ESG Core ID is required' }]}
          >
            <Input placeholder="Enter ESG Core ID from submission confirmation" />
          </Form.Item>
          <Form.Item
            name="submissionDate"
            label="Submission Date"
            rules={[{ required: true, message: 'Submission date is required' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Optional notes" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setSubmissionModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Record Submission</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Record Acknowledgment Modal */}
      <Modal
        title="Record Acknowledgment"
        open={ackModalOpen}
        onCancel={() => setAckModalOpen(false)}
        footer={null}
      >
        <Form
          form={ackForm}
          layout="vertical"
          onFinish={handleRecordAcknowledgment}
          initialValues={{ acknowledgmentDate: dayjs(), ackType: 'accepted' }}
        >
          <Form.Item
            name="ackType"
            label="Acknowledgment Type"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="accepted">Accepted</Select.Option>
              <Select.Option value="rejected">Rejected</Select.Option>
              <Select.Option value="partial">Partial (Some accepted)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="acknowledgmentDate"
            label="Acknowledgment Date"
            rules={[{ required: true, message: 'Acknowledgment date is required' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="details" label="Details">
            <Input.TextArea rows={3} placeholder="FDA acknowledgment details" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setAckModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Record Acknowledgment</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BatchDetail;
