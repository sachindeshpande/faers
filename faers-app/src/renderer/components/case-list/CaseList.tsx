/**
 * Case List Component
 *
 * Implements REQ-UI-005:
 * - Searchable/filterable list of cases
 * - Columns: Case ID, Status, Patient, Product, Created, Modified
 * - Sortable columns
 * - Double-click to open
 * - Context menu for actions
 * - Pagination
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Select,
  Button,
  Space,
  Dropdown,
  Modal,
  Typography,
  Tag,
  Tooltip,
  message
} from 'antd';
import type { MenuProps, TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useCaseList, useCaseActions } from '../../stores/caseStore';
import type { CaseListItem, CaseStatus } from '../../../shared/types/case.types';

dayjs.extend(relativeTime);

const { Search } = Input;
const { Text } = Typography;

interface CaseListProps {
  onSelectCase: (id: string) => void;
}

const CaseList: React.FC<CaseListProps> = ({ onSelectCase }) => {
  const { cases, totalCases, isLoading, filters } = useCaseList();
  const { fetchCases, createCase, deleteCase, duplicateCase } = useCaseActions();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);

  // Fetch cases when filters change
  useEffect(() => {
    fetchCases();
  }, []);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    fetchCases({ search: value, offset: 0 });
  };

  // Handle status filter
  const handleStatusChange = (value: CaseStatus | 'all') => {
    const status = value === 'all' ? undefined : value;
    setStatusFilter(status);
    fetchCases({ status, offset: 0 });
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchCases();
  };

  // Handle new case
  const handleNewCase = async () => {
    const newCase = await createCase();
    if (newCase) {
      onSelectCase(newCase.id);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (id: string) => {
    const duplicated = await duplicateCase(id);
    if (duplicated) {
      onSelectCase(duplicated.id);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (id: string) => {
    setCaseToDelete(id);
    setDeleteModalOpen(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (caseToDelete) {
      await deleteCase(caseToDelete);
      setDeleteModalOpen(false);
      setCaseToDelete(null);
      setSelectedRowKeys([]); // Clear selection after delete
    }
  };

  // Handle bulk delete of selected cases
  const handleBulkDelete = () => {
    // Get selected cases that are Draft status (only Draft can be deleted)
    const selectedCases = cases.filter(c => selectedRowKeys.includes(c.id));
    const draftCases = selectedCases.filter(c => c.status === 'Draft');

    if (draftCases.length === 0) {
      message.warning('No Draft cases selected. Only Draft cases can be deleted.');
      return;
    }

    if (draftCases.length < selectedCases.length) {
      message.info(`${selectedCases.length - draftCases.length} non-Draft case(s) will be skipped.`);
    }

    // For simplicity, delete one at a time (first Draft case)
    setCaseToDelete(draftCases[0].id);
    setDeleteModalOpen(true);
  };

  // Check if any selected cases can be deleted
  const canDeleteSelected = () => {
    if (selectedRowKeys.length === 0) return false;
    const selectedCases = cases.filter(c => selectedRowKeys.includes(c.id));
    return selectedCases.some(c => c.status === 'Draft');
  };

  // Handle pagination
  const handleTableChange: TableProps<CaseListItem>['onChange'] = (
    pagination,
    _filters,
    _sorter
  ) => {
    const offset = ((pagination.current || 1) - 1) * (pagination.pageSize || 50);
    fetchCases({ offset, limit: pagination.pageSize });
  };

  // Handle export XML
  const handleExportXML = async (id: string) => {
    try {
      // Show save dialog
      const dialogResult = await window.electronAPI.showSaveDialog({
        title: 'Export E2B(R3) XML',
        defaultPath: `${id}.xml`,
        filters: [{ name: 'XML Files', extensions: ['xml'] }]
      });

      if (!dialogResult.success || !dialogResult.data) {
        return; // User cancelled
      }

      const filePath = dialogResult.data;

      // Export XML
      const exportResult = await window.electronAPI.exportXML(id, filePath);

      if (exportResult.success) {
        message.success(`XML exported successfully to ${filePath}`);
        fetchCases(); // Refresh to show updated status
      } else {
        message.error(`Export failed: ${exportResult.error}`);
      }
    } catch (error) {
      message.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Context menu items
  const getContextMenuItems = (record: CaseListItem): MenuProps['items'] => [
    {
      key: 'open',
      label: 'Open',
      onClick: () => onSelectCase(record.id)
    },
    {
      key: 'duplicate',
      label: 'Duplicate',
      icon: <CopyOutlined />,
      onClick: () => handleDuplicate(record.id)
    },
    {
      type: 'divider'
    },
    {
      key: 'export',
      label: 'Export XML',
      icon: <ExportOutlined />,
      onClick: () => handleExportXML(record.id)
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      disabled: record.status !== 'Draft',
      onClick: () => handleDeleteClick(record.id)
    }
  ];

  // Status tag colors
  const getStatusTag = (status: CaseStatus) => {
    switch (status) {
      case 'Draft':
        return <Tag color="blue">{status}</Tag>;
      case 'Ready':
        return <Tag color="green">{status}</Tag>;
      case 'Exported':
        return <Tag color="orange">{status}</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Table columns
  const columns: ColumnsType<CaseListItem> = [
    {
      title: 'Case ID',
      dataIndex: 'id',
      key: 'id',
      width: 180,
      sorter: (a, b) => a.id.localeCompare(b.id),
      render: (id: string) => (
        <Text code style={{ fontSize: 12 }}>
          {id}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (status: CaseStatus) => getStatusTag(status)
    },
    {
      title: 'Patient',
      dataIndex: 'patientInitials',
      key: 'patientInitials',
      width: 100,
      render: (initials: string | undefined) => initials || '-'
    },
    {
      title: 'Product',
      dataIndex: 'productName',
      key: 'productName',
      ellipsis: true,
      render: (name: string | undefined) => name || '-'
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(date).format('MMM D, YYYY')}
        </Tooltip>
      )
    },
    {
      title: 'Modified',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      defaultSortOrder: 'descend',
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(date).fromNow()}
        </Tooltip>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={record.status === 'Draft' ? 'Delete case' : 'Only Draft cases can be deleted'}>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={record.status !== 'Draft'}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(record.id);
              }}
            />
          </Tooltip>
          <Dropdown
            menu={{ items: getContextMenuItems(record) }}
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </Space>
      )
    }
  ];

  return (
    <div className="case-list-container">
      {/* Header with filters */}
      <div className="case-list-header">
        <div className="case-list-filters">
          <Search
            placeholder="Search cases..."
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
          />

          <Select
            style={{ width: 140 }}
            value={statusFilter || 'all'}
            onChange={handleStatusChange}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Ready', label: 'Ready' },
              { value: 'Exported', label: 'Exported' }
            ]}
          />

          <Space style={{ marginLeft: 'auto' }}>
            {selectedRowKeys.length > 0 && (
              <Tooltip title="Only Draft cases can be deleted">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBulkDelete}
                  disabled={!canDeleteSelected()}
                >
                  Delete Selected
                </Button>
              </Tooltip>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={isLoading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleNewCase}
            >
              New Case
            </Button>
          </Space>
        </div>
      </div>

      {/* Table */}
      <div className="case-list-content">
        <Table
          columns={columns}
          dataSource={cases}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
            pageSize: filters.limit || 50,
            total: totalCases,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} cases`,
            pageSizeOptions: ['25', '50', '100']
          }}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: (e) => {
              // Don't open case if clicking on checkbox or action buttons
              const target = e.target as HTMLElement;
              if (target.closest('.ant-checkbox-wrapper') || target.closest('.ant-btn')) {
                return;
              }
              onSelectCase(record.id);
            },
            onDoubleClick: () => onSelectCase(record.id),
            style: { cursor: 'pointer' }
          })}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          size="middle"
          scroll={{ y: 'calc(100vh - 320px)' }}
        />
      </div>

      {/* Footer */}
      <div className="case-list-footer">
        <Text type="secondary">
          {selectedRowKeys.length > 0
            ? `${selectedRowKeys.length} case(s) selected`
            : `${totalCases} total cases`}
        </Text>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        title="Delete Case"
        open={deleteModalOpen}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete case {caseToDelete}?</p>
        <p>This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default CaseList;
