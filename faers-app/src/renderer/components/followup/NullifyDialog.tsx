/**
 * Nullify Dialog
 * Phase 4: Dialog for creating nullification reports to void submitted cases
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Alert,
  Typography,
  Space,
  Spin,
  message
} from 'antd';
import { StopOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { NullificationReason } from '../../../shared/types/followup.types';
import { NULLIFICATION_REASON_LABELS } from '../../../shared/types/followup.types';

const { Text } = Typography;
const { TextArea } = Input;

interface NullifyDialogProps {
  caseId: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: (nullificationCaseId: string) => void;
}

export const NullifyDialog: React.FC<NullifyDialogProps> = ({
  caseId,
  visible,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [canNullify, setCanNullify] = useState<{ allowed: boolean; reason?: string } | null>(null);
  const [selectedReason, setSelectedReason] = useState<NullificationReason | null>(null);

  // Check if nullification can be created
  useEffect(() => {
    if (visible && caseId) {
      checkEligibility();
    }
  }, [visible, caseId]);

  const checkEligibility = async () => {
    setChecking(true);
    try {
      const response = await window.electronAPI.canCreateNullification(caseId);
      if (response.success) {
        setCanNullify(response.data || null);
      }
    } catch (err) {
      setCanNullify({ allowed: false, reason: 'Failed to check eligibility' });
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await window.electronAPI.createNullification({
        originalCaseId: caseId,
        nullificationReason: values.nullificationReason,
        nullificationReference: values.nullificationReference,
        notes: values.notes
      });

      if (response.success && response.data) {
        message.success('Nullification report created successfully');
        form.resetFields();
        onSuccess(response.data.caseId);
        onClose();
      } else {
        message.error(response.error || 'Failed to create nullification');
      }
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedReason(null);
    onClose();
  };

  const handleReasonChange = (value: NullificationReason) => {
    setSelectedReason(value);
  };

  // Nullification reason options
  const reasonOptions = (Object.entries(NULLIFICATION_REASON_LABELS) as [NullificationReason, string][]).map(
    ([value, label]) => ({
      value,
      label
    })
  );

  return (
    <Modal
      title={
        <Space>
          <StopOutlined style={{ color: '#ff4d4f' }} />
          Nullify Case
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Create Nullification Report"
      okButtonProps={{
        disabled: !canNullify?.allowed,
        danger: true
      }}
      width={500}
    >
      {checking ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin tip="Checking eligibility..." />
        </div>
      ) : canNullify && !canNullify.allowed ? (
        <Alert
          message="Cannot Nullify Case"
          description={canNullify.reason}
          type="warning"
          showIcon
        />
      ) : (
        <>
          <Alert
            message={
              <Space>
                <ExclamationCircleOutlined />
                <Text strong>Warning: This action cannot be undone</Text>
              </Space>
            }
            description={
              <Text>
                Creating a nullification report will void case <strong>{caseId}</strong> and mark it as invalid.
                A new case will be created specifically for the nullification submission to FDA.
              </Text>
            }
            type="error"
            showIcon={false}
            style={{ marginBottom: 24 }}
          />

          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              name="nullificationReason"
              label="Reason for Nullification"
              rules={[{ required: true, message: 'Please select a reason' }]}
            >
              <Select
                placeholder="Select reason"
                options={reasonOptions}
                onChange={handleReasonChange}
              />
            </Form.Item>

            {selectedReason === 'duplicate' && (
              <Form.Item
                name="nullificationReference"
                label="Duplicate Case Reference"
                rules={[{ required: true, message: 'Please enter the duplicate case ID' }]}
                extra="Enter the Case ID of the duplicate case"
              >
                <Input placeholder="Enter duplicate case ID" />
              </Form.Item>
            )}

            <Form.Item
              name="notes"
              label="Additional Notes"
              extra="Optional notes explaining the nullification"
            >
              <TextArea
                rows={3}
                placeholder="Enter any additional notes..."
              />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default NullifyDialog;
