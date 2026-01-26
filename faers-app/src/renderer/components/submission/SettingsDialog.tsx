/**
 * Settings Dialog Component (Phase 2)
 *
 * Modal dialog to configure application settings.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Switch,
  Button,
  message,
  Divider,
  Typography,
  Radio,
  Alert,
  Checkbox
} from 'antd';
import { FolderOpenOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { RadioChangeEvent } from 'antd';
import type { AppSettings, SubmissionEnvironment } from '../../../shared/types/case.types';

const { Text } = Typography;

interface SettingsDialogProps {
  visible: boolean;
  settings: AppSettings;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
  onCancel: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  visible,
  settings,
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showProductionConfirm, setShowProductionConfirm] = useState(false);
  const [productionConfirmed, setProductionConfirmed] = useState(false);
  const [pendingEnvironment, setPendingEnvironment] = useState<SubmissionEnvironment | null>(null);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        senderId: settings.senderId || '',
        senderOrganization: settings.senderOrganization || '',
        defaultExportPath: settings.defaultExportPath || '',
        autoValidateOnExport: settings.autoValidateOnExport ?? true,
        warnOnExportWithWarnings: settings.warnOnExportWithWarnings ?? true,
        submissionEnvironment: settings.submissionEnvironment || 'Test',
        submissionReportType: settings.submissionReportType || 'Postmarket',
        targetCenter: settings.targetCenter || 'CDER'
      });
      setProductionConfirmed(settings.productionModeConfirmed ?? false);
    }
  }, [visible, settings, form]);

  // Handle environment change - show confirmation if switching to Production
  const handleEnvironmentChange = (e: RadioChangeEvent) => {
    const newEnvironment = e.target.value as SubmissionEnvironment;
    if (newEnvironment === 'Production' && !settings.productionModeConfirmed) {
      setPendingEnvironment(newEnvironment);
      setShowProductionConfirm(true);
      // Reset the form value back to Test until confirmed
      form.setFieldValue('submissionEnvironment', 'Test');
    } else {
      form.setFieldValue('submissionEnvironment', newEnvironment);
    }
  };

  // Confirm production mode
  const handleConfirmProduction = () => {
    if (productionConfirmed && pendingEnvironment) {
      form.setFieldValue('submissionEnvironment', pendingEnvironment);
      setShowProductionConfirm(false);
      setPendingEnvironment(null);
    }
  };

  // Cancel production mode switch
  const handleCancelProduction = () => {
    setShowProductionConfirm(false);
    setPendingEnvironment(null);
    setProductionConfirmed(false);
    form.setFieldValue('submissionEnvironment', 'Test');
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Determine if production mode was confirmed
      const isProduction = values.submissionEnvironment === 'Production';
      const wasProductionConfirmed = isProduction ? true : settings.productionModeConfirmed;

      await onSave({
        senderId: values.senderId,
        senderOrganization: values.senderOrganization,
        defaultExportPath: values.defaultExportPath,
        autoValidateOnExport: values.autoValidateOnExport,
        warnOnExportWithWarnings: values.warnOnExportWithWarnings,
        submissionEnvironment: values.submissionEnvironment,
        submissionReportType: values.submissionReportType,
        targetCenter: values.targetCenter,
        productionModeConfirmed: wasProductionConfirmed
      });

      message.success('Settings saved successfully');
      onCancel();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Select Default Export Folder',
        properties: ['openDirectory']
      });

      if (result.success && result.data && result.data.length > 0) {
        form.setFieldValue('defaultExportPath', result.data[0]);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  return (
    <>
      <Modal
        title="Settings"
        open={visible}
        onOk={handleOk}
        onCancel={onCancel}
        confirmLoading={loading}
        okText="Save Settings"
        width={550}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Divider orientation="left">Submission Environment</Divider>

          <Form.Item
            name="submissionEnvironment"
            label="Environment"
          >
            <Radio.Group onChange={handleEnvironmentChange}>
              <Radio.Button value="Test">Test Mode</Radio.Button>
              <Radio.Button value="Production">Production</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {() => {
              const env = form.getFieldValue('submissionEnvironment');
              return env === 'Test' ? (
                <Alert
                  type="info"
                  showIcon
                  message="Test Mode"
                  description="Submissions go to FDA test environment for validation. Files will be named with _TEST suffix."
                  style={{ marginBottom: 16 }}
                />
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="Production Mode"
                  description="Submissions go to the live FDA FAERS database. Use only after successful test submissions."
                  style={{ marginBottom: 16 }}
                />
              );
            }}
          </Form.Item>

          <Form.Item
            name="submissionReportType"
            label="Report Type"
          >
            <Radio.Group>
              <Radio.Button value="Postmarket">Postmarket</Radio.Button>
              <Radio.Button value="Premarket">Premarket</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Text type="secondary" style={{ display: 'block', marginTop: -8, marginBottom: 16 }}>
            Postmarket uses ZZFDA routing, Premarket uses ZZFDA_PREMKT
          </Text>

          <Form.Item
            name="targetCenter"
            label="Target Center"
          >
            <Radio.Group>
              <Radio.Button value="CDER">CDER</Radio.Button>
              <Radio.Button value="CBER">CBER</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Text type="secondary" style={{ display: 'block', marginTop: -8, marginBottom: 16 }}>
            FDA center to receive the submission (drugs: CDER, biologics: CBER)
          </Text>

          <Divider orientation="left">FDA Submission Settings</Divider>

          <Form.Item
            name="senderId"
            label="Sender ID"
            rules={[
              { required: true, message: 'Sender ID is required for FDA export' }
            ]}
            extra="Your organization's FDA sender identifier (used in XML filenames)"
          >
            <Input placeholder="e.g., COMPANY123" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="senderOrganization"
            label="Sender Organization"
            extra="Organization name for report header"
          >
            <Input placeholder="e.g., Acme Pharmaceutical Inc." />
          </Form.Item>

          <Divider orientation="left">Export Settings</Divider>

          <Form.Item name="defaultExportPath" label="Default Export Location">
            <Input.Group compact>
              <Form.Item name="defaultExportPath" noStyle>
                <Input
                  style={{ width: 'calc(100% - 100px)' }}
                  placeholder="Select a folder"
                  readOnly
                />
              </Form.Item>
              <Button
                icon={<FolderOpenOutlined />}
                onClick={handleSelectFolder}
                style={{ width: 100 }}
              >
                Browse
              </Button>
            </Input.Group>
          </Form.Item>

          <Form.Item
            name="autoValidateOnExport"
            label="Auto-validate on Export"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Text type="secondary" style={{ display: 'block', marginTop: -16, marginBottom: 16 }}>
            Automatically run validation before exporting
          </Text>

          <Form.Item
            name="warnOnExportWithWarnings"
            label="Warn on Export with Warnings"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Text type="secondary" style={{ display: 'block', marginTop: -16 }}>
            Show confirmation dialog when exporting cases with warnings
          </Text>
        </Form>
      </Modal>

      {/* Production Mode Confirmation Modal */}
      <Modal
        title={
          <span>
            <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Switch to Production Mode
          </span>
        }
        open={showProductionConfirm}
        onOk={handleConfirmProduction}
        onCancel={handleCancelProduction}
        okText="Confirm"
        okButtonProps={{ disabled: !productionConfirmed, danger: true }}
        cancelText="Cancel"
        width={500}
      >
        <Alert
          type="warning"
          showIcon
          message="You are switching to PRODUCTION mode"
          description={
            <div>
              <p style={{ marginBottom: 12 }}>
                Exports will generate XML for submission to the live FDA FAERS database.
              </p>
              <p style={{ marginBottom: 12 }}>Make sure you have:</p>
              <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li>Successfully completed test submissions</li>
                <li>Received FDA approval for production access</li>
                <li>Verified your sender configuration</li>
              </ul>
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <Checkbox
          checked={productionConfirmed}
          onChange={(e) => setProductionConfirmed(e.target.checked)}
        >
          I understand this will submit to the live FDA system
        </Checkbox>
      </Modal>
    </>
  );
};

export default SettingsDialog;
