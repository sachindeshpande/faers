/**
 * Create Follow-up Dialog
 * Phase 4: Dialog for creating follow-up reports from submitted cases
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Alert,
  Typography,
  Space,
  Spin,
  message
} from 'antd';
import { FileAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { FollowupType } from '../../../shared/types/followup.types';
import { FOLLOWUP_TYPE_LABELS } from '../../../shared/types/followup.types';

const { Text } = Typography;

interface CreateFollowupDialogProps {
  caseId: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: (newCaseId: string) => void;
}

export const CreateFollowupDialog: React.FC<CreateFollowupDialogProps> = ({
  caseId,
  visible,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [canCreate, setCanCreate] = useState<{ allowed: boolean; reason?: string } | null>(null);

  // Check if follow-up can be created
  useEffect(() => {
    if (visible && caseId) {
      checkEligibility();
    }
  }, [visible, caseId]);

  const checkEligibility = async () => {
    setChecking(true);
    try {
      const response = await window.electronAPI.canCreateFollowup(caseId);
      if (response.success) {
        setCanCreate(response.data || null);
      }
    } catch (err) {
      setCanCreate({ allowed: false, reason: 'Failed to check eligibility' });
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await window.electronAPI.createFollowup({
        parentCaseId: caseId,
        followupType: values.followupType,
        followupInfoDate: values.followupInfoDate.format('YYYY-MM-DD'),
        copyAllData: true
      });

      if (response.success && response.data) {
        message.success('Follow-up case created successfully');
        form.resetFields();
        onSuccess(response.data.caseId);
        onClose();
      } else {
        message.error(response.error || 'Failed to create follow-up');
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
    onClose();
  };

  // Follow-up type options
  const followupTypeOptions = (Object.entries(FOLLOWUP_TYPE_LABELS) as [FollowupType, string][]).map(
    ([value, label]) => ({
      value,
      label
    })
  );

  return (
    <Modal
      title={
        <Space>
          <FileAddOutlined />
          Create Follow-up Report
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Create Follow-up"
      okButtonProps={{ disabled: !canCreate?.allowed }}
      width={500}
    >
      {checking ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin tip="Checking eligibility..." />
        </div>
      ) : canCreate && !canCreate.allowed ? (
        <Alert
          message="Cannot Create Follow-up"
          description={canCreate.reason}
          type="warning"
          showIcon
        />
      ) : (
        <>
          <Alert
            message="Follow-up Information"
            description={
              <Text>
                A follow-up report will be created as a new version of case <strong>{caseId}</strong>.
                All data from the original case will be copied, and you can make updates as needed.
              </Text>
            }
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              followupInfoDate: dayjs()
            }}
          >
            <Form.Item
              name="followupType"
              label="Follow-up Type"
              rules={[{ required: true, message: 'Please select a follow-up type' }]}
            >
              <Select
                placeholder="Select follow-up type"
                options={followupTypeOptions}
              />
            </Form.Item>

            <Form.Item
              name="followupInfoDate"
              label="Date Information Received"
              rules={[{ required: true, message: 'Please select the date' }]}
              extra="The date when new information was received that triggered this follow-up"
            >
              <DatePicker
                style={{ width: '100%' }}
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
            </Form.Item>
          </Form>

          <Alert
            message="Due Date"
            description="For expedited follow-ups, the due date is 15 calendar days from the information received date. For non-expedited follow-ups, the due date is 30 calendar days."
            type="warning"
            showIcon
          />
        </>
      )}
    </Modal>
  );
};

export default CreateFollowupDialog;
