/**
 * Import List Component
 * Displays a list of import jobs with their status
 */

import React, { useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useImportStore } from '../../stores/importStore';
import type { ImportJobListItem, ImportStatus } from '../../../shared/types/import.types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface ImportListProps {
  onNewImport?: () => void;
  onViewJob?: (jobId: number) => void;
}

const statusConfig: Record<ImportStatus, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: 'default', icon: <ClockCircleOutlined />, label: 'Pending' },
  mapping: { color: 'processing', icon: <SyncOutlined spin />, label: 'Mapping' },
  validating: { color: 'processing', icon: <SyncOutlined spin />, label: 'Validating' },
  validated: { color: 'cyan', icon: <CheckCircleOutlined />, label: 'Validated' },
  importing: { color: 'processing', icon: <SyncOutlined spin />, label: 'Importing' },
  completed: { color: 'success', icon: <CheckCircleOutlined />, label: 'Completed' },
  failed: { color: 'error', icon: <CloseCircleOutlined />, label: 'Failed' },
  cancelled: { color: 'warning', icon: <ExclamationCircleOutlined />, label: 'Cancelled' }
};

export const ImportList: React.FC<ImportListProps> = ({
  onNewImport,
  onViewJob
}) => {
  const {
    jobs,
    jobsTotal,
    isLoading,
    loadJobs,
    cancelImport
  } = useImportStore();

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRefresh = () => {
    loadJobs();
  };

  const handleCancel = async (jobId: number) => {
    await cancelImport(jobId);
  };

  const columns: ColumnsType<ImportJobListItem> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id: number) => <Text strong>#{id}</Text>
    },
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
      render: (filename: string) => (
        <Tooltip title={filename}>
          <Text>{filename}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ImportStatus) => {
        const config = statusConfig[status];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      }
    },
    {
      title: 'Rows',
      key: 'rows',
      width: 80,
      render: (_: unknown, record: ImportJobListItem) => (
        <Text>{record.rowCount || '-'}</Text>
      )
    },
    {
      title: 'Valid / Invalid',
      key: 'validation',
      width: 120,
      render: (_: unknown, record: ImportJobListItem) => {
        if (record.validRows === undefined && record.invalidRows === undefined) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Space size={4}>
            <Text type="success">{record.validRows || 0}</Text>
            <Text type="secondary">/</Text>
            <Text type={record.invalidRows ? 'danger' : 'success'}>
              {record.invalidRows || 0}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Success / Failed',
      key: 'result',
      width: 120,
      render: (_: unknown, record: ImportJobListItem) => {
        if (record.successCount === undefined && record.failureCount === undefined) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Space size={4}>
            <Text type="success">{record.successCount || 0}</Text>
            <Text type="secondary">/</Text>
            <Text type={record.failureCount ? 'danger' : 'success'}>
              {record.failureCount || 0}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          <Text type="secondary">{dayjs(date).fromNow()}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: ImportJobListItem) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onViewJob?.(record.id)}
            />
          </Tooltip>
          {['pending', 'mapping', 'validating', 'validated', 'importing'].includes(record.status) && (
            <Tooltip title="Cancel">
              <Popconfirm
                title="Cancel this import?"
                description="This action cannot be undone."
                onConfirm={() => handleCancel(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<StopOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Import History</Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={isLoading}
          >
            Refresh
          </Button>
          {onNewImport && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onNewImport}
            >
              New Import
            </Button>
          )}
        </Space>
      </div>

      <Table
        dataSource={jobs}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          total: jobsTotal,
          pageSize: 20,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} imports`
        }}
        size="small"
      />
    </div>
  );
};
