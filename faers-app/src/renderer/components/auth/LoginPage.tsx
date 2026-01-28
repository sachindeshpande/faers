/**
 * Login Page Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Entry point for user authentication.
 */

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Checkbox, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import type { LoginRequest } from '../../../shared/types/auth.types';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const [rememberUsername, setRememberUsername] = useState(false);

  const {
    isLoading,
    error,
    rememberedUsername,
    login,
    clearError
  } = useAuthStore();

  // Pre-fill remembered username
  useEffect(() => {
    if (rememberedUsername) {
      form.setFieldValue('username', rememberedUsername);
      setRememberUsername(true);
    }
  }, [rememberedUsername, form]);

  // Clear error when component unmounts or form changes
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (values: { username: string; password: string }) => {
    const request: LoginRequest = {
      username: values.username,
      password: values.password,
      rememberUsername
    };

    await login(request);
  };

  return (
    <div
      data-testid="login-form"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          borderRadius: 12
        }}
        bodyStyle={{ padding: 40 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            FAERS Submission App
          </Title>
          <Text type="secondary">
            Sign in to continue
          </Text>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={clearError}
            style={{ marginBottom: 24 }}
            data-testid="login-error"
          />
        )}

        <Form
          form={form}
          name="login"
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Please enter your username' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Username"
              size="large"
              autoComplete="username"
              disabled={isLoading}
              data-testid="username-input"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter your password' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Password"
              size="large"
              autoComplete="current-password"
              disabled={isLoading}
              data-testid="password-input"
            />
          </Form.Item>

          <Form.Item>
            <Checkbox
              checked={rememberUsername}
              onChange={(e) => setRememberUsername(e.target.checked)}
              disabled={isLoading}
              data-testid="remember-username"
            >
              Remember username
            </Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isLoading}
              icon={<LoginOutlined />}
              block
              data-testid="login-button"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              FDA Adverse Event Reporting System
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              E2B(R3) Electronic Submission
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
