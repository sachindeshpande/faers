/**
 * Rejection Dialog Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Modal dialog for rejecting cases with required reason.
 * Used when a reviewer needs to send a case back for corrections.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Alert,
  Space,
  Select
} from 'antd';
import { CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface RejectionDialogProps {
  visible: boolean;
  onSubmit: (reason: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Common rejection reasons for quick selection
const COMMON_REJECTION_REASONS = [
  'Missing required information',
  'Incorrect patient data',
  'Drug information incomplete',
  'Reaction description unclear',
  'Reporter information missing',
  'Dates are inconsistent',
  'Narrative needs clarification',
  'MedDRA coding incorrect',
  'Other (specify in comments)'
];

const RejectionDialog: React.FC<RejectionDialogProps> = ({
  visible,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | undefined>();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setError(null);
      setSelectedReason(undefined);
    }
  }, [visible, form]);

  // Handle quick reason selection
  const handleReasonSelect = (value: string) => {
    setSelectedReason(value);
    if (value !== 'Other (specify in comments)') {
      form.setFieldsValue({ reason: value });
    } else {
      form.setFieldsValue({ reason: '' });
    }
  };

  const handleSubmit = async (values: { reason: string }) => {
    setError(null);

    if (!values.reason || values.reason.trim().length < 10) {
      setError('Please provide a detailed reason for rejection (at least 10 characters)');
      return;
    }

    try {
      await onSubmit(values.reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  return (
    <Modal
      title={
        <span>
          <CloseCircleOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
          Reject Case
        </span>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Alert
        type="warning"
        icon={<WarningOutlined />}
        message="This will return the case to Draft status"
        description="The case will be sent back to the data entry user for corrections. Please provide a clear reason to help them address the issues."
        showIcon
        style={{ marginBottom: 24 }}
      />

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item label="Quick Selection (Optional)">
          <Select
            placeholder="Select a common rejection reason..."
            allowClear
            value={selectedReason}
            onChange={handleReasonSelect}
            disabled={isLoading}
          >
            {COMMON_REJECTION_REASONS.map((reason) => (
              <Select.Option key={reason} value={reason}>
                {reason}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="reason"
          label="Rejection Reason"
          rules={[
            { required: true, message: 'Please provide a reason for rejection' },
            { min: 10, message: 'Please provide more details (at least 10 characters)' }
          ]}
          extra="Be specific about what needs to be corrected"
        >
          <TextArea
            rows={4}
            placeholder="Explain what issues were found and what corrections are needed..."
            disabled={isLoading}
            maxLength={2000}
            showCount
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="primary"
              danger
              htmlType="submit"
              loading={isLoading}
              icon={<CloseCircleOutlined />}
            >
              Reject Case
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RejectionDialog;
