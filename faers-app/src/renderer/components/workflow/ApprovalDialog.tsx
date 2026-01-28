/**
 * Approval Dialog Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Modal dialog for approving cases with optional electronic signature.
 * Used for workflow transitions that require approval (e.g., final approval for FDA submission).
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Alert,
  Typography,
  Space,
  Divider
} from 'antd';
import { CheckCircleOutlined, LockOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

interface ApprovalDialogProps {
  visible: boolean;
  requiresSignature?: boolean;
  onSubmit: (comment: string, signature?: { password: string; meaning: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  visible,
  requiresSignature = false,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setError(null);
    }
  }, [visible, form]);

  const handleSubmit = async (values: {
    comment?: string;
    password?: string;
    meaning?: string;
  }) => {
    setError(null);

    try {
      if (requiresSignature) {
        if (!values.password || !values.meaning) {
          setError('Password and signature meaning are required');
          return;
        }

        await onSubmit(values.comment || '', {
          password: values.password,
          meaning: values.meaning
        });
      } else {
        await onSubmit(values.comment || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  return (
    <Modal
      title={
        <span>
          <CheckCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
          {requiresSignature ? 'Approve with Electronic Signature' : 'Approve Case'}
        </span>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={480}
      destroyOnClose
    >
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
        <Form.Item
          name="comment"
          label="Approval Comments (Optional)"
        >
          <TextArea
            rows={3}
            placeholder="Add any comments about this approval..."
            disabled={isLoading}
          />
        </Form.Item>

        {requiresSignature && (
          <>
            <Divider>Electronic Signature</Divider>

            <Alert
              type="info"
              message="21 CFR Part 11 Compliance"
              description="This action requires electronic signature verification. Your signature indicates approval of this case for FDA submission."
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name="meaning"
              label="Signature Meaning"
              rules={[
                { required: true, message: 'Please select the meaning of your signature' }
              ]}
              initialValue="I have reviewed and approve this case for submission to the FDA"
            >
              <Input.TextArea
                rows={2}
                disabled={isLoading}
                placeholder="Statement of the meaning of this signature"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Confirm Password"
              rules={[
                { required: true, message: 'Please enter your password to sign' }
              ]}
              extra="Enter your login password to confirm your identity"
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </Form.Item>

            <div
              style={{
                padding: 12,
                background: '#f5f5f5',
                borderRadius: 8,
                marginBottom: 16
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                By signing, I certify that all information is accurate and complete.
                This electronic signature is legally binding and equivalent to a handwritten signature
                in accordance with 21 CFR Part 11.
              </Text>
            </div>
          </>
        )}

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              icon={<CheckCircleOutlined />}
            >
              {requiresSignature ? 'Sign & Approve' : 'Approve'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ApprovalDialog;
