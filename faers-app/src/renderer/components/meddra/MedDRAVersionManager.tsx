/**
 * MedDRA Version Manager Component
 * Manage imported MedDRA versions
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
  Badge,
  Empty
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { useMedDRAStore } from '../../stores/meddraStore';
import { MedDRAImportWizard } from './MedDRAImportWizard';
import type { MedDRAVersion } from '../../../shared/types/meddra.types';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;
const { confirm } = Modal;

interface MedDRAVersionManagerProps {
  importedBy?: string;
}

export const MedDRAVersionManager: React.FC<MedDRAVersionManagerProps> = ({
  importedBy
}) => {
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  const {
    versions,
    activeVersion,
    versionsLoading,
    loadVersions,
    loadActiveVersion,
    activateVersion,
    deleteVersion
  } = useMedDRAStore();

  useEffect(() => {
    loadVersions();
    loadActiveVersion();
  }, [loadVersions, loadActiveVersion]);

  const handleActivate = async (version: MedDRAVersion) => {
    if (version.isActive) return;

    confirm({
      title: 'Activate MedDRA Version',
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical">
          <Text>
            Are you sure you want to activate MedDRA version {version.version}?
          </Text>
          <Text type="secondary">
            This will be used for all new coding operations.
          </Text>
        </Space>
      ),
      okText: 'Activate',
      cancelText: 'Cancel',
      onOk: async () => {
        const success = await activateVersion(version.id);
        if (success) {
          message.success(`MedDRA version ${version.version} activated`);
        } else {
          message.error('Failed to activate version');
        }
      }
    });
  };

  const handleDelete = async (version: MedDRAVersion) => {
    if (version.isActive) {
      message.warning('Cannot delete the active version');
      return;
    }

    confirm({
      title: 'Delete MedDRA Version',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <Space direction="vertical">
          <Text>
            Are you sure you want to delete MedDRA version {version.version}?
          </Text>
          <Text type="danger">
            This action cannot be undone. All terms in this version will be permanently deleted.
          </Text>
        </Space>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        const success = await deleteVersion(version.id);
        if (success) {
          message.success(`MedDRA version ${version.version} deleted`);
        } else {
          message.error('Failed to delete version');
        }
      }
    });
  };

  const handleImportSuccess = () => {
    loadVersions();
    loadActiveVersion();
  };

  const columns: ColumnsType<MedDRAVersion> = [
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (version: string, record: MedDRAVersion) => (
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
      title: 'Terms',
      key: 'counts',
      render: (_: unknown, record: MedDRAVersion) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            PT: {record.ptCount.toLocaleString()}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            LLT: {record.lltCount.toLocaleString()}
          </Text>
        </Space>
      )
    },
    {
      title: 'Imported By',
      dataIndex: 'importedBy',
      key: 'importedBy',
      render: (name: string | undefined) => name || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: MedDRAVersion) => (
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

  return (
    <>
      <Card
        title={
          <Space>
            <DatabaseOutlined />
            <span>MedDRA Dictionary Versions</span>
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
                <Text>No MedDRA versions imported</Text>
                <Text type="secondary">
                  Import a MedDRA dictionary to enable adverse event coding
                </Text>
              </Space>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setImportWizardOpen(true)}
            >
              Import MedDRA
            </Button>
          </Empty>
        )}
      </Card>

      <MedDRAImportWizard
        open={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        onSuccess={handleImportSuccess}
        importedBy={importedBy}
      />
    </>
  );
};

export default MedDRAVersionManager;
