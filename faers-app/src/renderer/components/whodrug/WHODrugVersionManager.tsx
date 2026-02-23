/**
 * WHO Drug Version Manager Component
 * Manage imported WHO Drug versions
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Typography,
  Tooltip,
  Empty,
  Steps,
  Form,
  Input,
  DatePicker,
  Progress,
  Result,
  Alert
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  FolderOpenOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useWHODrugStore } from '../../stores/whodrugStore';
import type { WHODrugVersion, WHODrugImportProgress } from '../../../shared/types/whodrug.types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text } = Typography;
const { confirm } = Modal;

interface WHODrugVersionManagerProps {
  importedBy?: string;
}

interface FormValues {
  version: string;
  releaseDate?: dayjs.Dayjs;
}

export const WHODrugVersionManager: React.FC<WHODrugVersionManagerProps> = ({
  importedBy
}) => {
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm<FormValues>();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [filePaths, setFilePaths] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importComplete, setImportComplete] = useState(false);

  const {
    versions,
    activeVersion,
    versionsLoading,
    importing,
    importProgress,
    loadVersions,
    loadActiveVersion,
    activateVersion,
    deleteVersion,
    selectFolder,
    startImport
  } = useWHODrugStore();

  useEffect(() => {
    loadVersions();
    loadActiveVersion();
  }, [loadVersions, loadActiveVersion]);

  const handleActivate = async (version: WHODrugVersion) => {
    if (version.isActive) return;

    confirm({
      title: 'Activate WHO Drug Version',
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical">
          <Text>
            Are you sure you want to activate WHO Drug version {version.version}?
          </Text>
          <Text type="secondary">
            This will be used for all new drug coding operations.
          </Text>
        </Space>
      ),
      okText: 'Activate',
      cancelText: 'Cancel',
      onOk: async () => {
        const success = await activateVersion(version.id);
        if (success) {
          message.success(`WHO Drug version ${version.version} activated`);
        } else {
          message.error('Failed to activate version');
        }
      }
    });
  };

  const handleDelete = async (version: WHODrugVersion) => {
    if (version.isActive) {
      message.warning('Cannot delete the active version');
      return;
    }

    confirm({
      title: 'Delete WHO Drug Version',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <Space direction="vertical">
          <Text>
            Are you sure you want to delete WHO Drug version {version.version}?
          </Text>
          <Text type="danger">
            This action cannot be undone. All products in this version will be permanently deleted.
          </Text>
        </Space>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        const success = await deleteVersion(version.id);
        if (success) {
          message.success(`WHO Drug version ${version.version} deleted`);
        } else {
          message.error('Failed to delete version');
        }
      }
    });
  };

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
      try {
        await form.validateFields();
        setCurrentStep(1);
      } catch {
        return;
      }
    } else if (currentStep === 1) {
      if (!filePaths) {
        setError('Please select a WHO Drug folder');
        return;
      }
      setCurrentStep(2);
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
      } else {
        setError('Import failed. Check the console for details.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const handleCloseWizard = () => {
    if (!importing) {
      setCurrentStep(0);
      setSelectedFolder(null);
      setFilePaths(null);
      setError(null);
      setImportComplete(false);
      form.resetFields();
      setImportWizardOpen(false);
    }
  };

  const getProgressPercent = (progress: WHODrugImportProgress | null): number => {
    if (!progress) return 0;
    return Math.round((progress.filesProcessed / progress.totalFiles) * 100);
  };

  const columns: ColumnsType<WHODrugVersion> = [
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (version: string, record: WHODrugVersion) => (
        <Space>
          <Text strong>{version}</Text>
          {record.isActive && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Active
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Release Date',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      render: (date: string | undefined) =>
        date ? new Date(date).toLocaleDateString() : '-'
    },
    {
      title: 'Import Date',
      dataIndex: 'importDate',
      key: 'importDate',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Records',
      key: 'counts',
      render: (_: unknown, record: WHODrugVersion) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Products: {record.productCount.toLocaleString()}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Ingredients: {record.ingredientCount.toLocaleString()}
          </Text>
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: WHODrugVersion) => (
        <Space>
          {!record.isActive && (
            <Tooltip title="Activate this version">
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => handleActivate(record)}
              >
                Activate
              </Button>
            </Tooltip>
          )}
          <Tooltip title={record.isActive ? 'Cannot delete active version' : 'Delete this version'}>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              disabled={record.isActive}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const steps = [
    { title: 'Version Info' },
    { title: 'Select Files' },
    { title: 'Import' }
  ];

  return (
    <>
      <Card
        title={
          <Space>
            <DatabaseOutlined />
            <span>WHO Drug Dictionary Versions</span>
            {activeVersion && (
              <Tag color="blue">Active: v{activeVersion.version}</Tag>
            )}
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setImportWizardOpen(true)}
          >
            Import New Version
          </Button>
        }
      >
        {versions.length > 0 ? (
          <Table
            columns={columns}
            dataSource={versions}
            rowKey="id"
            loading={versionsLoading}
            pagination={false}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text>No WHO Drug versions imported</Text>
                <Text type="secondary">
                  Import a WHO Drug dictionary to enable drug coding
                </Text>
              </Space>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setImportWizardOpen(true)}
            >
              Import WHO Drug
            </Button>
          </Empty>
        )}
      </Card>

      {/* Import Wizard Modal */}
      <Modal
        title="Import WHO Drug Dictionary"
        open={importWizardOpen}
        onCancel={handleCloseWizard}
        width={700}
        footer={
          currentStep < 2 ? (
            <Space>
              <Button onClick={handleCloseWizard}>Cancel</Button>
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
              onClick={handleCloseWizard}
              disabled={importing}
            >
              {importComplete ? 'Done' : 'Close'}
            </Button>
          )
        }
        closable={!importing}
        maskClosable={!importing}
      >
        <Steps current={currentStep} items={steps} />

        {/* Step 1: Version Info */}
        {currentStep === 0 && (
          <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
            <Form.Item
              name="version"
              label="WHO Drug Version"
              rules={[{ required: true, message: 'Please enter the version' }]}
            >
              <Input placeholder="e.g., 2024Q1" style={{ width: 200 }} />
            </Form.Item>

            <Form.Item name="releaseDate" label="Release Date (Optional)">
              <DatePicker style={{ width: 200 }} />
            </Form.Item>

            <Alert
              type="info"
              message="WHO Drug License Required"
              description="You must have a valid WHO Drug subscription to download and use the dictionary. Files should be in pipe-delimited format."
              style={{ marginTop: 16 }}
            />
          </Form>
        )}

        {/* Step 2: Select Files */}
        {currentStep === 1 && (
          <div style={{ marginTop: 24 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Text>
                Select the folder containing the WHO Drug distribution files.
              </Text>

              <Button
                icon={<FolderOpenOutlined />}
                onClick={handleSelectFolder}
                size="large"
              >
                Select WHO Drug Folder
              </Button>

              {selectedFolder && (
                <Alert
                  type="success"
                  message="Folder Selected"
                  description={
                    <Space direction="vertical" size={4}>
                      <Text>{selectedFolder}</Text>
                      {filePaths && Object.keys(filePaths).map(key => (
                        <div key={key}>
                          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                          <Text code>{key}</Text>
                        </div>
                      ))}
                    </Space>
                  }
                />
              )}

              {error && <Alert type="error" message={error} showIcon />}
            </Space>
          </div>
        )}

        {/* Step 3: Import */}
        {currentStep === 2 && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            {importComplete ? (
              <Result
                status="success"
                title="Import Complete"
                subTitle={`WHO Drug version ${form.getFieldValue('version')} has been imported successfully.`}
              />
            ) : importing ? (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Progress
                  percent={getProgressPercent(importProgress)}
                  status={importProgress?.status === 'failed' ? 'exception' : 'active'}
                  strokeWidth={12}
                />
                {importProgress && (
                  <Text type="secondary">
                    {importProgress.currentFile && `Processing: ${importProgress.currentFile}`}
                  </Text>
                )}
              </Space>
            ) : error ? (
              <Result
                status="error"
                title="Import Failed"
                subTitle={error}
              />
            ) : (
              <LoadingOutlined style={{ fontSize: 48 }} />
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default WHODrugVersionManager;
