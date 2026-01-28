/**
 * CreateBatchWizard Component
 * Phase 4: Multi-step wizard for creating submission batches
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Button,
  Space,
  Select,
  Table,
  Input,
  Radio,
  Typography,
  Alert,
  Spin,
  Tag,
  Result
} from 'antd';
import {
  FileAddOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useBatchCreation } from '../../stores/batchStore';
import type { BatchType, BatchCaseEligibility } from '../../../shared/types/batch.types';
import { BATCH_TYPE_LABELS } from '../../../shared/types/batch.types';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CreateBatchWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (batchId: number) => void;
  defaultBatchType?: BatchType;
}

const CreateBatchWizard: React.FC<CreateBatchWizardProps> = ({
  open,
  onClose,
  onSuccess,
  defaultBatchType
}) => {
  const {
    isCreating,
    eligibleCases,
    isLoadingEligibleCases,
    loadEligibleCases,
    createBatch
  } = useBatchCreation();

  const [currentStep, setCurrentStep] = useState(0);
  const [batchType, setBatchType] = useState<BatchType>(defaultBatchType || 'expedited');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [submissionMode, setSubmissionMode] = useState<'test' | 'production'>('test');
  const [notes, setNotes] = useState('');
  const [createdBatchId, setCreatedBatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setBatchType(defaultBatchType || 'expedited');
      setSelectedCaseIds([]);
      setSubmissionMode('test');
      setNotes('');
      setCreatedBatchId(null);
      setError(null);
    }
  }, [open, defaultBatchType]);

  // Load eligible cases when batch type changes
  useEffect(() => {
    if (open && currentStep === 1) {
      loadEligibleCases(batchType);
    }
  }, [batchType, currentStep, open]);

  const handleCreate = async () => {
    setError(null);
    const result = await createBatch(batchType, selectedCaseIds, notes || undefined, submissionMode);
    if (result) {
      setCreatedBatchId(result.id);
      setCurrentStep(3);
    } else {
      setError('Failed to create batch. Please try again.');
    }
  };

  const caseColumns: ColumnsType<BatchCaseEligibility> = [
    {
      title: 'Safety Report ID',
      dataIndex: 'safetyReportId',
      key: 'safetyReportId',
      width: 180,
      render: (id?: string) => id || '-'
    },
    {
      title: 'Patient',
      dataIndex: 'patientInitials',
      key: 'patientInitials',
      width: 100,
      render: (initials?: string) => initials || '-'
    },
    {
      title: 'Classification',
      dataIndex: 'reportTypeClassification',
      key: 'reportTypeClassification',
      width: 130,
      render: (type?: string) => (
        type ? (
          <Tag color={type === 'expedited' ? 'red' : 'blue'}>
            {type === 'expedited' ? 'Expedited' : 'Non-Expedited'}
          </Tag>
        ) : '-'
      )
    },
    {
      title: 'Workflow Status',
      dataIndex: 'workflowStatus',
      key: 'workflowStatus',
      width: 140
    },
    {
      title: 'Eligible',
      key: 'eligible',
      width: 100,
      render: (_: unknown, record: BatchCaseEligibility) => (
        record.isEligible ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>Eligible</Tag>
        ) : (
          <Tag color="orange" icon={<ExclamationCircleOutlined />}>
            {record.eligibilityReason || 'Not eligible'}
          </Tag>
        )
      )
    }
  ];

  const eligibleCasesForSelection = eligibleCases.filter(c => c.isEligible);
  const selectedCount = selectedCaseIds.length;

  const steps = [
    {
      title: 'Batch Type',
      content: (
        <div style={{ padding: '20px 0' }}>
          <Title level={5}>Select Batch Type</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Choose the type of reports to include in this batch submission.
          </Text>
          <Select
            value={batchType}
            onChange={setBatchType}
            style={{ width: 300 }}
            size="large"
          >
            {Object.entries(BATCH_TYPE_LABELS).map(([key, label]) => (
              <Select.Option key={key} value={key}>{label}</Select.Option>
            ))}
          </Select>
        </div>
      )
    },
    {
      title: 'Select Cases',
      content: (
        <div style={{ padding: '20px 0' }}>
          <Title level={5}>Select Cases for Batch</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Select the cases to include in this batch. Only eligible cases can be selected.
          </Text>
          {selectedCount > 0 && (
            <Alert
              message={`${selectedCount} case${selectedCount > 1 ? 's' : ''} selected`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Spin spinning={isLoadingEligibleCases}>
            <Table
              columns={caseColumns}
              dataSource={eligibleCases}
              rowKey="caseId"
              rowSelection={{
                selectedRowKeys: selectedCaseIds,
                onChange: (keys) => setSelectedCaseIds(keys as string[]),
                getCheckboxProps: (record) => ({
                  disabled: !record.isEligible
                })
              }}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ y: 300 }}
            />
          </Spin>
          {eligibleCasesForSelection.length === 0 && !isLoadingEligibleCases && (
            <Alert
              message="No eligible cases found"
              description="There are no cases that can be added to this batch type. Cases must be in the appropriate workflow status and classification."
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      )
    },
    {
      title: 'Review',
      content: (
        <div style={{ padding: '20px 0' }}>
          <Title level={5}>Review Batch Details</Title>

          <div style={{ marginBottom: 24 }}>
            <Text strong>Batch Type: </Text>
            <Text>{BATCH_TYPE_LABELS[batchType]}</Text>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Text strong>Cases Selected: </Text>
            <Text>{selectedCount}</Text>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Text strong>Submission Mode:</Text>
            <div style={{ marginTop: 8 }}>
              <Radio.Group
                value={submissionMode}
                onChange={(e) => setSubmissionMode(e.target.value)}
              >
                <Radio.Button value="test">
                  Test Mode
                </Radio.Button>
                <Radio.Button value="production">
                  Production Mode
                </Radio.Button>
              </Radio.Group>
            </div>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {submissionMode === 'test'
                ? 'Test mode - for validation only, not submitted to FDA production'
                : 'Production mode - will be submitted to FDA production system'}
            </Text>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Text strong>Notes (optional):</Text>
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this batch..."
              rows={3}
              style={{ marginTop: 8 }}
            />
          </div>

          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      )
    },
    {
      title: 'Complete',
      content: (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          {createdBatchId ? (
            <Result
              status="success"
              title="Batch Created Successfully!"
              subTitle={`Your batch has been created with ${selectedCount} case${selectedCount > 1 ? 's' : ''}.`}
              extra={[
                <Button
                  type="primary"
                  key="view"
                  onClick={() => onSuccess(createdBatchId)}
                >
                  View Batch
                </Button>,
                <Button key="close" onClick={onClose}>
                  Close
                </Button>
              ]}
            />
          ) : (
            <Spin size="large" tip="Creating batch..." />
          )}
        </div>
      )
    }
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return selectedCaseIds.length > 0;
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      handleCreate();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FileAddOutlined />
          Create Submission Batch
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={
        currentStep < 3 ? (
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(currentStep - 1)}>
                Previous
              </Button>
            )}
            <Button
              type="primary"
              onClick={handleNext}
              disabled={!canProceed()}
              loading={isCreating}
            >
              {currentStep === 2 ? 'Create Batch' : 'Next'}
            </Button>
          </Space>
        ) : null
      }
      maskClosable={false}
    >
      <Steps
        current={currentStep}
        items={steps.map((s) => ({ title: s.title }))}
        style={{ marginBottom: 24 }}
      />
      {steps[currentStep].content}
    </Modal>
  );
};

export default CreateBatchWizard;
