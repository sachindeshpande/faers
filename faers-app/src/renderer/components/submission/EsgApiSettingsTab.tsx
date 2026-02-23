/**
 * ESG API Settings Tab (Phase 2B)
 *
 * Settings form for ESG NextGen API configuration.
 * Includes credentials, sender info, polling, and retry settings.
 * Supports Demo Mode for testing and demonstrations.
 */

import React, { useState, useEffect } from 'react';
import {
  Form, Input, Button, Radio, InputNumber, Divider, Alert, Space, Badge, message, Spin,
  Typography, Modal
} from 'antd';
import {
  ApiOutlined, CheckCircleOutlined, CloseCircleOutlined,
  DeleteOutlined, SafetyOutlined, ExperimentOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { EsgApiSettings, TestConnectionResult, SaveEsgSettingsRequest, EsgApiEnvironment } from '../../../shared/types/esgApi.types';
import { DEMO_CREDENTIALS } from '../../../shared/types/esgApi.types';

const { Text } = Typography;

interface EsgApiSettingsTabProps {
  // No props needed - component manages its own state via electronAPI
}

const EsgApiSettingsTab: React.FC<EsgApiSettingsTabProps> = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [, setSettings] = useState<EsgApiSettings | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [previousEnv, setPreviousEnv] = useState<EsgApiEnvironment>('Test');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Handle environment change
  const handleEnvironmentChange = (newEnv: EsgApiEnvironment) => {
    if (newEnv === 'Demo') {
      // Switching TO Demo mode
      if (previousEnv !== 'Demo') {
        // Show confirmation if switching from real environment
        Modal.confirm({
          title: 'Enable Demo Mode?',
          content: (
            <>
              <p>Demo mode uses simulated data and does not connect to real FDA systems.</p>
              <p>This is useful for testing, training, and demonstrations.</p>
            </>
          ),
          okText: 'Enable Demo Mode',
          cancelText: 'Cancel',
          onOk: async () => {
            setIsDemoMode(true);
            setPreviousEnv(newEnv);
            form.setFieldsValue({
              environment: 'Demo',
              clientId: DEMO_CREDENTIALS.clientId,
              senderCompanyName: DEMO_CREDENTIALS.senderCompanyName,
              senderContactName: DEMO_CREDENTIALS.senderContactName,
              senderContactEmail: DEMO_CREDENTIALS.senderContactEmail
            });
            setHasCredentials(true); // Demo mode has built-in credentials
            setTestResult(null);
            // Auto-save settings when switching to Demo mode
            try {
              await window.electronAPI.esgSaveSettings({
                environment: 'Demo',
                senderCompanyName: DEMO_CREDENTIALS.senderCompanyName,
                senderContactName: DEMO_CREDENTIALS.senderContactName,
                senderContactEmail: DEMO_CREDENTIALS.senderContactEmail
              });
              message.success('Demo mode enabled');
            } catch (error) {
              console.error('Failed to save Demo mode settings:', error);
            }
          },
          onCancel: () => {
            // Revert to previous environment
            form.setFieldValue('environment', previousEnv);
          }
        });
        return; // Don't update form yet - wait for confirmation
      }
    } else if (previousEnv === 'Demo') {
      // Switching FROM Demo mode to real environment
      Modal.confirm({
        title: 'Leave Demo Mode?',
        content: (
          <>
            <p>You are switching to {newEnv} environment.</p>
            <p>You will need to enter real API credentials to submit to FDA.</p>
          </>
        ),
        okText: 'Continue',
        cancelText: 'Stay in Demo',
        onOk: async () => {
          setIsDemoMode(false);
          setPreviousEnv(newEnv);
          form.setFieldsValue({
            environment: newEnv,
            clientId: '',
            senderCompanyName: '',
            senderContactName: '',
            senderContactEmail: ''
          });
          setHasCredentials(false);
          setTestResult(null);
          // Auto-save settings when leaving Demo mode
          try {
            await window.electronAPI.esgSaveSettings({
              environment: newEnv,
              senderCompanyName: '',
              senderContactName: '',
              senderContactEmail: ''
            });
            message.info(`Switched to ${newEnv} environment`);
          } catch (error) {
            console.error('Failed to save settings:', error);
          }
        },
        onCancel: () => {
          form.setFieldValue('environment', 'Demo');
        }
      });
      return;
    }

    // Normal environment switch (Test <-> Production)
    setPreviousEnv(newEnv);
    setTestResult(null);
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [settingsResult, credResult] = await Promise.all([
        window.electronAPI.esgGetSettings(),
        window.electronAPI.esgHasCredentials()
      ]);
      if (settingsResult.success && settingsResult.data) {
        setSettings(settingsResult.data);
        const env = settingsResult.data.environment || 'Test';
        const isDemo = env === 'Demo';
        setIsDemoMode(isDemo);
        setPreviousEnv(env);

        if (isDemo) {
          // Demo mode - use demo credentials
          form.setFieldsValue({
            clientId: DEMO_CREDENTIALS.clientId,
            environment: 'Demo',
            senderCompanyName: DEMO_CREDENTIALS.senderCompanyName,
            senderContactName: DEMO_CREDENTIALS.senderContactName,
            senderContactEmail: DEMO_CREDENTIALS.senderContactEmail,
            pollingIntervalMinutes: settingsResult.data.pollingIntervalMinutes || 5,
            pollingTimeoutHours: settingsResult.data.pollingTimeoutHours || 48,
            maxAutomaticRetries: settingsResult.data.maxAutomaticRetries || 3,
            maxTotalAttempts: settingsResult.data.maxTotalAttempts || 5
          });
          setHasCredentials(true); // Demo always has credentials
        } else {
          form.setFieldsValue({
            clientId: settingsResult.data.clientId || '',
            environment: env,
            senderCompanyName: settingsResult.data.senderCompanyName || '',
            senderContactName: settingsResult.data.senderContactName || '',
            senderContactEmail: settingsResult.data.senderContactEmail || '',
            pollingIntervalMinutes: settingsResult.data.pollingIntervalMinutes || 5,
            pollingTimeoutHours: settingsResult.data.pollingTimeoutHours || 48,
            maxAutomaticRetries: settingsResult.data.maxAutomaticRetries || 3,
            maxTotalAttempts: settingsResult.data.maxTotalAttempts || 5
          });
          if (credResult.success) {
            setHasCredentials(!!credResult.data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load ESG settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    try {
      const values = await form.validateFields(['clientId', 'secretKey']);
      if (!values.clientId || !values.secretKey) {
        message.warning('Both Client ID and Secret Key are required');
        return;
      }
      setSaving(true);
      const result = await window.electronAPI.esgSaveCredentials({
        clientId: values.clientId,
        secretKey: values.secretKey
      });
      if (result.success) {
        setHasCredentials(true);
        form.setFieldValue('secretKey', '');
        message.success('Credentials saved securely');
        setTestResult(null);
      } else {
        message.error(result.error || 'Failed to save credentials');
      }
    } catch (error) {
      // validation error - ignore
    } finally {
      setSaving(false);
    }
  };

  const handleClearCredentials = async () => {
    const result = await window.electronAPI.esgClearCredentials();
    if (result.success) {
      setHasCredentials(false);
      setTestResult(null);
      form.setFieldsValue({ clientId: '', secretKey: '' });
      message.info('Credentials cleared');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.electronAPI.esgTestConnection();
      if (result.success && result.data) {
        setTestResult(result.data);
        if (result.data.success) {
          message.success(`Connection successful (${result.data.latencyMs}ms)`);
        } else {
          message.error(result.data.error || 'Connection failed');
        }
      } else {
        message.error(result.error || 'Test failed');
      }
    } catch (error) {
      message.error('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const settingsData: SaveEsgSettingsRequest = {
        environment: values.environment,
        senderCompanyName: values.senderCompanyName,
        senderContactName: values.senderContactName,
        senderContactEmail: values.senderContactEmail,
        pollingIntervalMinutes: values.pollingIntervalMinutes,
        pollingTimeoutHours: values.pollingTimeoutHours,
        maxAutomaticRetries: values.maxAutomaticRetries,
        maxTotalAttempts: values.maxTotalAttempts
      };
      const result = await window.electronAPI.esgSaveSettings(settingsData);
      if (result.success) {
        message.success('API settings saved');
      } else {
        message.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      // validation error
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spin tip="Loading settings..." style={{ display: 'block', margin: '40px auto' }} />;
  }

  return (
    <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
      <Divider orientation="left">
        <SafetyOutlined /> API Credentials
      </Divider>

      <Form.Item
        name="environment"
        label="API Environment"
      >
        <Radio.Group onChange={(e) => handleEnvironmentChange(e.target.value)}>
          <Radio.Button value="Test">Test</Radio.Button>
          <Radio.Button value="Production">Production</Radio.Button>
          <Radio.Button value="Demo">
            <ExperimentOutlined style={{ marginRight: 4 }} />
            Demo
          </Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item noStyle shouldUpdate>
        {() => {
          const env = form.getFieldValue('environment');
          if (env === 'Demo') {
            return (
              <Alert
                type="info"
                showIcon
                icon={<ExperimentOutlined />}
                message="Demo Mode Active"
                description={
                  <>
                    <p style={{ marginBottom: 8 }}>
                      Demo mode simulates FDA submission without connecting to real systems.
                      No data will be sent to FDA.
                    </p>
                    <Text type="secondary">
                      Use this mode for testing, training, and demonstrations.
                      Demo credentials are automatically configured.
                    </Text>
                  </>
                }
                style={{ marginBottom: 16, backgroundColor: '#f3e8ff', borderColor: '#a855f7' }}
              />
            );
          }
          return env === 'Production' ? (
            <Alert
              type="warning"
              showIcon
              message="Production Environment"
              description="API submissions will go to the live FDA system."
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message="Test Environment"
              description="API submissions will go to the FDA test system for validation."
              style={{ marginBottom: 16 }}
            />
          );
        }}
      </Form.Item>

      {isDemoMode ? (
        <>
          <Form.Item
            name="clientId"
            label="Client ID"
          >
            <Input
              disabled
              style={{ backgroundColor: '#f5f5f5' }}
            />
          </Form.Item>

          <Form.Item
            label="Secret Key"
            extra="Demo mode uses built-in mock credentials"
          >
            <Input.Password
              value="demo-secret-not-real"
              disabled
              style={{ backgroundColor: '#f5f5f5' }}
            />
          </Form.Item>

          <Space style={{ marginBottom: 16 }}>
            <Button
              icon={<ApiOutlined />}
              onClick={handleTestConnection}
              loading={testing}
            >
              Test Demo Connection
            </Button>
          </Space>

          <div style={{ marginBottom: 16 }}>
            <Badge
              status="processing"
              color="#a855f7"
              text="Demo credentials active"
            />
          </div>
        </>
      ) : (
        <>
          <Form.Item
            name="clientId"
            label="Client ID"
            rules={[{ required: true, message: 'Client ID is required' }]}
          >
            <Input placeholder="Enter ESG NextGen Client ID" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="secretKey"
            label="Secret Key"
            extra={hasCredentials ? 'Credentials are stored securely. Enter a new key to update.' : 'Enter your ESG NextGen secret key'}
          >
            <Input.Password
              placeholder={hasCredentials ? '(stored securely)' : 'Enter ESG NextGen Secret Key'}
              autoComplete="new-password"
            />
          </Form.Item>

          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              onClick={handleSaveCredentials}
              loading={saving}
            >
              Save Credentials
            </Button>
            <Button
              icon={<ApiOutlined />}
              onClick={handleTestConnection}
              loading={testing}
              disabled={!hasCredentials}
            >
              Test Connection
            </Button>
            {hasCredentials && (
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={handleClearCredentials}
              >
                Clear Credentials
              </Button>
            )}
          </Space>

          {hasCredentials && (
            <div style={{ marginBottom: 16 }}>
              <Badge
                status={hasCredentials ? 'success' : 'default'}
                text={hasCredentials ? 'Credentials stored' : 'No credentials'}
              />
            </div>
          )}
        </>
      )}

      {testResult && (
        <Alert
          type={testResult.success ? 'success' : 'error'}
          showIcon
          icon={testResult.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          message={testResult.success ? 'Connection Successful' : 'Connection Failed'}
          description={testResult.success
            ? `Connected to ${testResult.environment} environment${testResult.isDemoMode ? ' (Demo)' : ''} (${testResult.latencyMs}ms)`
            : testResult.error
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Divider orientation="left">Sender Information</Divider>

      {isDemoMode && (
        <Alert
          type="info"
          showIcon
          message="Demo sender information is pre-configured"
          style={{ marginBottom: 16 }}
        />
      )}

      <Form.Item
        name="senderCompanyName"
        label="Company Name"
        rules={isDemoMode ? [] : [{ required: true, message: 'Company name is required' }]}
      >
        <Input
          placeholder="e.g., Acme Pharmaceutical Inc."
          disabled={isDemoMode}
          style={isDemoMode ? { backgroundColor: '#f5f5f5' } : undefined}
        />
      </Form.Item>

      <Form.Item
        name="senderContactName"
        label="Contact Name"
        rules={isDemoMode ? [] : [{ required: true, message: 'Contact name is required' }]}
      >
        <Input
          placeholder="e.g., John Smith"
          disabled={isDemoMode}
          style={isDemoMode ? { backgroundColor: '#f5f5f5' } : undefined}
        />
      </Form.Item>

      <Form.Item
        name="senderContactEmail"
        label="Contact Email"
        rules={isDemoMode ? [] : [
          { required: true, message: 'Contact email is required' },
          { type: 'email', message: 'Please enter a valid email' }
        ]}
      >
        <Input
          placeholder="e.g., safety@acmepharma.com"
          disabled={isDemoMode}
          style={isDemoMode ? { backgroundColor: '#f5f5f5' } : undefined}
        />
      </Form.Item>

      <Divider orientation="left">Polling Configuration</Divider>

      <Form.Item
        name="pollingIntervalMinutes"
        label="Polling Interval (minutes)"
        extra="How often to check for FDA acknowledgments"
        rules={[{ required: true }]}
      >
        <InputNumber min={1} max={60} />
      </Form.Item>

      <Form.Item
        name="pollingTimeoutHours"
        label="Polling Timeout (hours)"
        extra="Stop polling after this many hours without acknowledgment"
        rules={[{ required: true }]}
      >
        <InputNumber min={1} max={168} />
      </Form.Item>

      <Divider orientation="left">Retry Configuration</Divider>

      <Form.Item
        name="maxAutomaticRetries"
        label="Max Automatic Retries"
        extra="Number of automatic retries for transient errors"
        rules={[{ required: true }]}
      >
        <InputNumber min={0} max={10} />
      </Form.Item>

      <Form.Item
        name="maxTotalAttempts"
        label="Max Total Attempts"
        extra="Maximum total submission attempts before requiring return to Draft"
        rules={[{ required: true }]}
      >
        <InputNumber min={1} max={10} />
      </Form.Item>

      <Button
        type="primary"
        onClick={handleSaveSettings}
        loading={saving}
        style={{ marginTop: 8 }}
      >
        Save API Settings
      </Button>
    </Form>
  );
};

export default EsgApiSettingsTab;
