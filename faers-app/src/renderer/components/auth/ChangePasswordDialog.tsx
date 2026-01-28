/**
 * Change Password Dialog Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Modal dialog for changing user password.
 * Can be used for both forced password change and voluntary change.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Alert, Typography, Progress, Space } from 'antd';
import { LockOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import type { ChangePasswordRequest, PasswordValidationResult } from '../../../shared/types/auth.types';

const { Text, Title } = Typography;

interface ChangePasswordDialogProps {
  visible: boolean;
  forced?: boolean; // If true, user cannot cancel
  onClose?: () => void;
  onSuccess?: () => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score: 25, label: 'Weak', color: '#ff4d4f' };
  if (score <= 4) return { score: 50, label: 'Fair', color: '#faad14' };
  if (score <= 5) return { score: 75, label: 'Good', color: '#1890ff' };
  return { score: 100, label: 'Strong', color: '#52c41a' };
};

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  visible,
  forced = false,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [newPassword, setNewPassword] = useState('');
  const [validation, setValidation] = useState<PasswordValidationResult | null>(null);

  const {
    user,
    isChangingPassword,
    passwordChangeError,
    changePassword,
    validatePasswordPolicy,
    clearError
  } = useAuthStore();

  // Validate password as user types
  useEffect(() => {
    if (!newPassword) {
      setValidation(null);
      return;
    }

    const validateTimer = setTimeout(async () => {
      const result = await validatePasswordPolicy(newPassword);
      setValidation(result);
    }, 300); // Debounce validation

    return () => clearTimeout(validateTimer);
  }, [newPassword, validatePasswordPolicy]);

  // Clear form and errors when dialog opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setNewPassword('');
      setValidation(null);
      clearError();
    }
  }, [visible, form, clearError]);

  const handleSubmit = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (values.newPassword !== values.confirmPassword) {
      form.setFields([
        { name: 'confirmPassword', errors: ['Passwords do not match'] }
      ]);
      return;
    }

    const request: ChangePasswordRequest = {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword
    };

    const success = await changePassword(request);
    if (success) {
      onSuccess?.();
      if (!forced) {
        onClose?.();
      }
    }
  };

  const handleCancel = () => {
    if (!forced) {
      onClose?.();
    }
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <Modal
      title={
        <span>
          <LockOutlined style={{ marginRight: 8 }} />
          {forced ? 'Password Change Required' : 'Change Password'}
        </span>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      closable={!forced}
      maskClosable={!forced}
      keyboard={!forced}
      width={480}
      destroyOnClose
    >
      {forced && (
        <Alert
          type="warning"
          message="Your password must be changed before continuing"
          description={
            user?.mustChangePassword
              ? 'Your password has expired or was reset by an administrator.'
              : 'You must change your password for security reasons.'
          }
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {passwordChangeError && (
        <Alert
          type="error"
          message={passwordChangeError}
          showIcon
          closable
          onClose={clearError}
          style={{ marginBottom: 24 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="currentPassword"
          label="Current Password"
          rules={[
            { required: true, message: 'Please enter your current password' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Enter current password"
            disabled={isChangingPassword}
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter a new password' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Enter new password"
            disabled={isChangingPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Form.Item>

        {/* Password strength indicator */}
        {newPassword && (
          <div style={{ marginTop: -16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Progress
                percent={strength.score}
                steps={4}
                strokeColor={strength.color}
                showInfo={false}
                style={{ flex: 1 }}
              />
              <Text style={{ color: strength.color, fontSize: 12, minWidth: 60 }}>
                {strength.label}
              </Text>
            </div>
          </div>
        )}

        {/* Password policy validation results */}
        {validation && !validation.valid && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              Password requirements:
            </Text>
            <Space direction="vertical" size={2}>
              {validation.errors.map((error, index) => (
                <Text key={index} type="danger" style={{ fontSize: 12 }}>
                  <CloseCircleOutlined style={{ marginRight: 4 }} />
                  {error}
                </Text>
              ))}
            </Space>
          </div>
        )}

        {validation?.valid && (
          <div style={{ marginBottom: 16 }}>
            <Text type="success" style={{ fontSize: 12 }}>
              <CheckCircleOutlined style={{ marginRight: 4 }} />
              Password meets all requirements
            </Text>
          </div>
        )}

        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your new password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              }
            })
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Confirm new password"
            disabled={isChangingPassword}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            {!forced && (
              <Button onClick={handleCancel} disabled={isChangingPassword}>
                Cancel
              </Button>
            )}
            <Button
              type="primary"
              htmlType="submit"
              loading={isChangingPassword}
              disabled={validation !== null && !validation.valid}
            >
              {isChangingPassword ? 'Changing Password...' : 'Change Password'}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <Title level={5} style={{ marginBottom: 8, fontSize: 12 }}>
          Password Requirements
        </Title>
        <Text type="secondary" style={{ fontSize: 11 }}>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            <li>At least 12 characters long</li>
            <li>Contains uppercase letter (A-Z)</li>
            <li>Contains lowercase letter (a-z)</li>
            <li>Contains number (0-9)</li>
            <li>Contains special character (!@#$%^&*)</li>
            <li>Cannot reuse last 5 passwords</li>
          </ul>
        </Text>
      </div>
    </Modal>
  );
};

export default ChangePasswordDialog;
