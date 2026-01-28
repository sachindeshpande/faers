/**
 * Audit Log Viewer Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Displays the audit trail with filtering, searching, and export capabilities.
 * Implements 21 CFR Part 11 compliance requirements for audit trail viewing.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Typography,
  Row,
  Col,
  Tooltip,
  Drawer,
  Descriptions,
  message,
  Empty,
  Statistic
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined,
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  ClearOutlined
} from '@ant-design/icons';
import type {
  AuditLogEntry,
  AuditLogFilter
} from '../../../shared/types/ipc.types';
import {
  AUDIT_ACTION_LABELS,
  type AuditActionType,
  type AuditEntityType
} from '../../../shared/types/audit.types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Action type colors
const actionTypeColors: Record<string, string> = {
  login: 'green',
  logout: 'default',
  login_failed: 'red',
  session_timeout: 'orange',
  password_change: 'blue',
  password_reset: 'purple',
  password_reset_admin: 'purple',
  user_create: 'cyan',
  user_update: 'blue',
  user_deactivate: 'red',
  user_reactivate: 'green',
  case_create: 'cyan',
  case_update: 'blue',
  case_delete: 'red',
  workflow_transition: 'geekblue',
  case_assign: 'purple',
  case_reassign: 'purple',
  case_approve: 'green',
  case_reject: 'red',
  electronic_signature: 'gold',
  permission_denied: 'red'
};

// Entity type icons
const entityTypeIcons: Record<string, React.ReactNode> = {
  user: <UserOutlined />,
  case: <FileTextOutlined />,
  session: <ClockCircleOutlined />,
  system: <SafetyCertificateOutlined />
};

interface AuditLogViewerProps {
  caseId?: string; // If provided, filter to specific case
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ caseId }) => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<AuditActionType | undefined>();
  const [selectedEntityType, setSelectedEntityType] = useState<AuditEntityType | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  // Statistics
  const [stats, setStats] = useState<{
    totalEntries: number;
    entriesByAction: Record<string, number>;
    signatureCount: number;
  } | null>(null);

  // Fetch audit log
  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const filter: AuditLogFilter = {
        search: searchText || undefined,
        actionType: selectedActionType,
        entityType: selectedEntityType,
        entityId: caseId,
        startDate: dateRange?.[0]?.startOf('day').toISOString(),
        endDate: dateRange?.[1]?.endOf('day').toISOString(),
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize
      };

      const response = await window.electronAPI.getAuditLog(filter);
      if (response.success && response.data) {
        setEntries(response.data.entries);
        setTotal(response.data.total);
      } else {
        message.error(response.error || 'Failed to fetch audit log');
      }
    } catch (error) {
      console.error('Error fetching audit log:', error);
      message.error('Failed to fetch audit log');
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedActionType, selectedEntityType, caseId, dateRange, pagination]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago

      // @ts-expect-error - Custom IPC call not in types
      const response = await window.electronAPI?.getAuditStatistics?.(startDate, endDate);
      if (response?.success && response?.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAuditLog();
    if (!caseId) {
      fetchStatistics();
    }
  }, [fetchAuditLog, fetchStatistics, caseId]);

  // Handle table change
  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination({
      current: newPagination.current || 1,
      pageSize: newPagination.pageSize || 20
    });
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const filter: AuditLogFilter = {
        search: searchText || undefined,
        actionType: selectedActionType,
        entityType: selectedEntityType,
        entityId: caseId,
        startDate: dateRange?.[0]?.startOf('day').toISOString(),
        endDate: dateRange?.[1]?.endOf('day').toISOString()
      };

      const response = await window.electronAPI.exportAuditLog({ filter, format });
      if (response.success && response.data) {
        message.success(`Exported ${response.data.recordCount} records to ${response.data.fileName}`);
      } else {
        if (response.error !== 'Export cancelled') {
          message.error(response.error || 'Export failed');
        }
      }
    } catch (error) {
      console.error('Error exporting audit log:', error);
      message.error('Export failed');
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchText('');
    setSelectedActionType(undefined);
    setSelectedEntityType(undefined);
    setDateRange(null);
    setPagination({ current: 1, pageSize: 20 });
  };

  // View entry details
  const viewEntryDetails = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setDrawerVisible(true);
  };

  // Table columns
  const columns: ColumnsType<AuditLogEntry> = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => (
        <Tooltip title={dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}>
          <Text>{dayjs(timestamp).format('MMM D, YYYY HH:mm')}</Text>
        </Tooltip>
      )
    },
    {
      title: 'User',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username: string) => (
        <Space>
          <UserOutlined />
          <Text>{username || 'System'}</Text>
        </Space>
      )
    },
    {
      title: 'Action',
      dataIndex: 'actionType',
      key: 'actionType',
      width: 180,
      render: (actionType: AuditActionType) => (
        <Tag color={actionTypeColors[actionType] || 'default'}>
          {AUDIT_ACTION_LABELS[actionType] || actionType}
        </Tag>
      )
    },
    {
      title: 'Entity',
      key: 'entity',
      width: 150,
      render: (_: unknown, record: AuditLogEntry) => (
        <Space>
          {entityTypeIcons[record.entityType] || <FileTextOutlined />}
          <Text>
            {record.entityType}
            {record.entityId && `: ${record.entityId.substring(0, 12)}...`}
          </Text>
        </Space>
      )
    },
    {
      title: 'Field',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 120,
      render: (fieldName: string) => fieldName ? <Text code>{fieldName}</Text> : '-'
    },
    {
      title: 'Change',
      key: 'change',
      width: 200,
      render: (_: unknown, record: AuditLogEntry) => {
        if (!record.oldValue && !record.newValue) return '-';
        return (
          <Space direction="vertical" size={0}>
            {record.oldValue && (
              <Text delete type="secondary" style={{ fontSize: 12 }}>
                {record.oldValue.length > 30
                  ? `${record.oldValue.substring(0, 30)}...`
                  : record.oldValue}
              </Text>
            )}
            {record.newValue && (
              <Text style={{ fontSize: 12 }}>
                {record.newValue.length > 30
                  ? `${record.newValue.substring(0, 30)}...`
                  : record.newValue}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: AuditLogEntry) => (
        <Button
          type="link"
          size="small"
          onClick={() => viewEntryDetails(record)}
        >
          Details
        </Button>
      )
    }
  ];

  // Action type options
  const actionTypeOptions = Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({
    value,
    label
  }));

  // Entity type options
  const entityTypeOptions = [
    { value: 'user', label: 'User' },
    { value: 'case', label: 'Case' },
    { value: 'session', label: 'Session' },
    { value: 'comment', label: 'Comment' },
    { value: 'note', label: 'Note' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'system', label: 'System' }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                {caseId ? `Case Audit Trail - ${caseId}` : 'Audit Trail'}
              </Title>
              <Text type="secondary">
                21 CFR Part 11 compliant audit log
              </Text>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport('csv')}
                >
                  Export CSV
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport('json')}
                >
                  Export JSON
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Statistics (only for full view) */}
          {!caseId && stats && (
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Entries (30 days)"
                    value={stats.totalEntries}
                    prefix={<FileTextOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Electronic Signatures"
                    value={stats.signatureCount}
                    prefix={<SafetyCertificateOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Login Events"
                    value={stats.entriesByAction['login'] || 0}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Failed Logins"
                    value={stats.entriesByAction['login_failed'] || 0}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* Filters */}
          <Card size="small" title={<><FilterOutlined /> Filters</>}>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Input
                  placeholder="Search..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onPressEnter={() => fetchAuditLog()}
                  allowClear
                />
              </Col>
              <Col span={5}>
                <Select
                  placeholder="Action Type"
                  style={{ width: '100%' }}
                  value={selectedActionType}
                  onChange={setSelectedActionType}
                  options={actionTypeOptions}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                />
              </Col>
              <Col span={4}>
                <Select
                  placeholder="Entity Type"
                  style={{ width: '100%' }}
                  value={selectedEntityType}
                  onChange={setSelectedEntityType}
                  options={entityTypeOptions}
                  allowClear
                />
              </Col>
              <Col span={6}>
                <RangePicker
                  style={{ width: '100%' }}
                  value={dateRange}
                  onChange={setDateRange}
                />
              </Col>
              <Col span={3}>
                <Space>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={() => {
                      setPagination({ ...pagination, current: 1 });
                      fetchAuditLog();
                    }}
                  >
                    Search
                  </Button>
                  <Button
                    icon={<ClearOutlined />}
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={entries}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              total,
              showSizeChanger: true,
              showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} entries`
            }}
            onChange={handleTableChange}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No audit entries found"
                />
              )
            }}
          />
        </Space>
      </Card>

      {/* Details Drawer */}
      <Drawer
        title="Audit Entry Details"
        placement="right"
        width={500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedEntry && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{selectedEntry.id}</Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {dayjs(selectedEntry.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}
            </Descriptions.Item>
            <Descriptions.Item label="User">
              {selectedEntry.username || 'System'}
            </Descriptions.Item>
            <Descriptions.Item label="User ID">
              {selectedEntry.userId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Session ID">
              {selectedEntry.sessionId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Action">
              <Tag color={actionTypeColors[selectedEntry.actionType] || 'default'}>
                {AUDIT_ACTION_LABELS[selectedEntry.actionType] || selectedEntry.actionType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Entity Type">
              {selectedEntry.entityType}
            </Descriptions.Item>
            <Descriptions.Item label="Entity ID">
              {selectedEntry.entityId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Field Name">
              {selectedEntry.fieldName ? <Text code>{selectedEntry.fieldName}</Text> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Old Value">
              <Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                {selectedEntry.oldValue || '-'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="New Value">
              <Text style={{ whiteSpace: 'pre-wrap' }}>
                {selectedEntry.newValue || '-'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Details">
              {selectedEntry.details ? (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                  {typeof selectedEntry.details === 'string'
                    ? selectedEntry.details
                    : JSON.stringify(JSON.parse(selectedEntry.details), null, 2)}
                </pre>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="IP Address">
              {selectedEntry.ipAddress || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default AuditLogViewer;
