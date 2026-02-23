/**
 * MedDRA Import Wizard Component
 * Step-by-step wizard for importing MedDRA ASCII distribution
 */

import React, { useState } from 'react';
import {
  Modal,
  Steps,
  Button,
  Form,
  Input,
  DatePicker,
  Space,
  Progress,
  Result,
  Alert,
  Typography,
  List
} from 'antd';
import { FolderOpenOutlined, CheckCircleOutlined, LoadingOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useMedDRAStore } from '../../stores/meddraStore';
import type { MedDRAImportProgress } from '../../../shared/types/meddra.types';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface MedDRAImportWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  importedBy?: string;
}

interface FormValues {
  version: string;
  releaseDate?: dayjs.Dayjs;
}

export const MedDRAImportWizard: React.FC<MedDRAImportWizardProps> = ({
  open,
  onClose,
  onSuccess,
  importedBy
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm<FormValues>();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [filePaths, setFilePaths] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importComplete, setImportComplete] = useState(false);

  const { selectFolder, startImport, importing, importProgress } = useMedDRAStore();

  const handleSelectFolder = async () => {
    try {
      setError(null);
      const result = await selectFolder();
      if (result) {
        setSelectedFolder(result.folderPath);
        setFilePaths(result.filePaths);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select folder');
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      // Validate form
      try {
        await form.validateFields();
        setCurrentStep(1);
      } catch {
        return;
      }
    } else if (currentStep === 1) {
      // Validate folder selection
      if (!filePaths) {
        setError('Please select a MedDRA folder');
        return;
      }
      setCurrentStep(2);
      // Start import
      await handleImport();
    }
  };

  const handleImport = async () => {
    if (!filePaths) return;

    const values = form.getFieldsValue();
    const releaseDate = values.releaseDate?.format('YYYY-MM-DD');

    setError(null);
    setImportComplete(false);

    try {
      const version = await startImport(
        values.version,
        releaseDate,
        filePaths,
        importedBy
      );

      if (version) {
        setImportComplete(true);
        onSuccess?.();
      } else {
        setError('Import failed. Check the console for details.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const handleClose = () => {
    if (!importing) {
      setCurrentStep(0);
      setSelectedFolder(null);
      setFilePaths(null);
      setError(null);
      setImportComplete(false);
      form.resetFields();
      onClose();
    }
  };

  const getProgressPercent = (progress: MedDRAImportProgress | null): number => {
    if (!progress) return 0;
    return Math.round((progress.filesProcessed / progress.totalFiles) * 100);
  };

  const getProgressStatus = (progress: MedDRAImportProgress | null): 'active' | 'success' | 'exception' => {
    if (!progress) return 'active';
    if (progress.status === 'completed') return 'success';
    if (progress.status === 'failed') return 'exception';
    return 'active';
  };

  const steps = [
    {
      title: 'Version Info',
      content: (
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="version"
            label="MedDRA Version"
            rules={[
              { required: true, message: 'Please enter the MedDRA version' },
              { pattern: /^\d+\.\d+$/, message: 'Version should be in format X.X (e.g., 26.1)' }
            ]}
          >
            <Input placeholder="e.g., 26.1" style={{ width: 200 }} />
          </Form.Item>

          <Form.Item name="releaseDate" label="Release Date (Optional)">
            <DatePicker style={{ width: 200 }} />
          </Form.Item>

          <Alert
            type="info"
            message="MedDRA License Required"
            description="You must have a valid MedDRA license to download and use the MedDRA dictionary. The ASCII distribution files can be obtained from the MedDRA MSSO."
            style={{ marginTop: 16 }}
          />
        </Form>
      )
    },
    {
      title: 'Select Files',
      content: (
        <div style={{ marginTop: 24 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text>Select the folder containing the MedDRA ASCII distribution files.</Text>
              <br />
              <Text type="secondary">
                The folder should contain the following files: llt.asc, pt.asc, hlt.asc, hlgt.asc, soc.asc, and relationship files.
              </Text>
            </div>

            <Button
              icon={<FolderOpenOutlined />}
              onClick={handleSelectFolder}
              size="large"
            >
              Select MedDRA Folder
            </Button>

            {selectedFolder && (
              <Alert
                type="success"
                message="Folder Selected"
                description={
                  <Space direction="vertical" size={4}>
                    <Text>{selectedFolder}</Text>
                    {filePaths && (
                      <List
                        size="small"
                        dataSource={Object.entries(filePaths)}
                        renderItem={([key, path]) => (
                          <List.Item style={{ padding: '4px 0' }}>
                            <Space>
                              <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              <Text code>{key}.asc</Text>
                              <Text type="secondary" ellipsis style={{ maxWidth: 300 }}>
                                {path.split('/').pop()}
                              </Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    )}
                  </Space>
                }
              />
            )}

            {error && (
              <Alert type="error" message={error} showIcon />
            )}
          </Space>
        </div>
      )
    },
    {
      title: 'Import',
      content: (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          {importComplete ? (
            <Result
              status="success"
              title="Import Complete"
              subTitle={`MedDRA version ${form.getFieldValue('version')} has been imported successfully.`}
            />
          ) : importing ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Title level={4}>Importing MedDRA Dictionary...</Title>

              <Progress
                percent={getProgressPercent(importProgress)}
                status={getProgressStatus(importProgress)}
                strokeWidth={12}
              />

              {importProgress && (
                <Space direction="vertical" size={4}>
                  <Text>
                    {importProgress.status === 'parsing' && 'Parsing files...'}
                    {importProgress.status === 'importing' && 'Importing relationships...'}
                    {importProgress.status === 'indexing' && 'Building indexes...'}
                  </Text>
                  {importProgress.currentFile && (
                    <Text type="secondary">
                      Processing: {importProgress.currentFile}
                    </Text>
                  )}
                  <Text type="secondary">
                    Files: {importProgress.filesProcessed} / {importProgress.totalFiles}
                  </Text>
                  <Text type="secondary">
                    Records imported: {importProgress.recordsImported.toLocaleString()}
                  </Text>
                </Space>
              )}

              <Alert
                type="warning"
                message="Please do not close this window during import"
                showIcon
              />
            </Space>
          ) : error ? (
            <Result
              status="error"
              title="Import Failed"
              subTitle={error}
              extra={
                <Button onClick={() => setCurrentStep(1)}>
                  Go Back
                </Button>
              }
            />
          ) : (
            <Space direction="vertical" size="large">
              <LoadingOutlined style={{ fontSize: 48 }} />
              <Text>Starting import...</Text>
            </Space>
          )}
        </div>
      )
    }
  ];

  return (
    <Modal
      title="Import MedDRA Dictionary"
      open={open}
      onCancel={handleClose}
      width={700}
      footer={
        currentStep < 2 ? (
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(currentStep - 1)}>
                Back
              </Button>
            )}
            <Button
              type="primary"
              onClick={handleNext}
              disabled={currentStep === 1 && !filePaths}
            >
              {currentStep === 1 ? 'Start Import' : 'Next'}
            </Button>
          </Space>
        ) : (
          <Button
            type="primary"
            onClick={handleClose}
            disabled={importing}
          >
            {importComplete ? 'Done' : 'Close'}
          </Button>
        )
      }
      closable={!importing}
      maskClosable={!importing}
    >
      <Steps current={currentStep} items={steps.map(s => ({ title: s.title }))} />
      {steps[currentStep].content}
    </Modal>
  );
};

export default MedDRAImportWizard;
