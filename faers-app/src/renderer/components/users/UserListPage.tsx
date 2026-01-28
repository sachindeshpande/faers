/**
 * User List Page Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Displays a list of users with filtering, search, and management actions.
 * Admin-only page for user administration.
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Dropdown,
  Modal,
  Select,
  message,
  Typography,
  Card,
  Row,
  Col,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  MoreOutlined,
  EditOutlined,
  LockOutlined,
  UserDeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { useUserStore, useUsers, useRoles, useUserLoading, useUserActions } from '../../stores/userStore';
import { PermissionGate } from '../common/PermissionGate';
import UserFormDialog from './UserFormDialog';
import type { UserListItem } from '../../../shared/types/auth.types';

const { Title, Text } = Typography;
const { Search } = Input;

const UserListPage: React.FC = () => {
  const users = useUsers();
  const roles = useRoles();
  const isLoading = useUserLoading();
  const {
    fetchUsers,
    fetchRoles,
    deactivateUser,
    reactivateUser,
    resetUserPassword,
    setFilter,
    openFormModal,
    closeFormModal
  } = useUserActions();

  const { isFormModalOpen, editingUserId, filter, totalUsers } = useUserStore();

  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();

  // Load users and roles on mount
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilter({ search: value || undefined });
  };

  // Handle role filter
  const handleRoleFilter = (roleId: string | undefined) => {
    setSelectedRole(roleId);
    setFilter({ roleId });
  };

  // Handle active filter
  const handleActiveFilter = (isActive: boolean | undefined) => {
    setActiveFilter(isActive);
    setFilter({ isActive });
  };

  // Handle deactivate user
  const handleDeactivate = async (userId: string, username: string) => {
    Modal.confirm({
      title: 'Deactivate User',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to deactivate user "${username}"? They will no longer be able to log in.`,
      okText: 'Deactivate',
      okType: 'danger',
      onOk: async () => {
        const result = await deactivateUser(userId);
        if (result.success) {
          message.success(`User "${username}" has been deactivated`);
        } else {
          message.error(result.error || 'Failed to deactivate user');
        }
      }
    });
  };

  // Handle reactivate user
  const handleReactivate = async (userId: string, username: string) => {
    const result = await reactivateUser(userId);
    if (result.success) {
      message.success(`User "${username}" has been reactivated`);
    } else {
      message.error(result.error || 'Failed to reactivate user');
    }
  };

  // Handle reset password
  const handleResetPassword = async (userId: string, username: string) => {
    Modal.confirm({
      title: 'Reset Password',
      icon: <LockOutlined />,
      content: `Reset password for user "${username}"? A new temporary password will be generated.`,
      okText: 'Reset Password',
      onOk: async () => {
        const result = await resetUserPassword(userId);
        if (result.success && result.temporaryPassword) {
          Modal.success({
            title: 'Password Reset Successful',
            content: (
              <div>
                <p>The temporary password for &quot;{username}&quot; is:</p>
                <Text code copyable style={{ fontSize: 16 }}>
                  {result.temporaryPassword}
                </Text>
                <p style={{ marginTop: 16, color: '#666' }}>
                  Please share this password securely with the user.
                  They will be required to change it on next login.
                </p>
              </div>
            )
          });
        } else {
          message.error(result.error || 'Failed to reset password');
        }
      }
    });
  };

  // Action menu items for each user row
  const getActionMenuItems = (record: UserListItem): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit User',
        onClick: () => openFormModal(record.id)
      },
      {
        key: 'reset-password',
        icon: <LockOutlined />,
        label: 'Reset Password',
        onClick: () => handleResetPassword(record.id, record.username)
      },
      {
        type: 'divider'
      }
    ];

    if (record.isActive) {
      items.push({
        key: 'deactivate',
        icon: <UserDeleteOutlined />,
        label: 'Deactivate',
        danger: true,
        onClick: () => handleDeactivate(record.id, record.username)
      });
    } else {
      items.push({
        key: 'reactivate',
        icon: <CheckCircleOutlined />,
        label: 'Reactivate',
        onClick: () => handleReactivate(record.id, record.username)
      });
    }

    return items;
  };

  // Table columns
  const columns: ColumnsType<UserListItem> = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
      render: (username: string, record) => (
        <Space>
          <span>{username}</span>
          {!record.isActive && <Tag color="red">Inactive</Tag>}
        </Space>
      )
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => `${record.firstName} ${record.lastName}`.trim() || '-',
      sorter: (a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => (
        <Space wrap>
          {roles.map((role) => (
            <Tag key={role} color="blue">
              {role}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: string | undefined) =>
        date ? new Date(date).toLocaleString() : 'Never',
      sorter: (a, b) => {
        if (!a.lastLoginAt) return 1;
        if (!b.lastLoginAt) return -1;
        return new Date(a.lastLoginAt).getTime() - new Date(b.lastLoginAt).getTime();
      }
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              User Management
            </Title>
            <Text type="secondary">
              {totalUsers} user{totalUsers !== 1 ? 's' : ''} total
            </Text>
          </Col>
          <Col>
            <PermissionGate permission="user.create">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openFormModal()}
              >
                Add User
              </Button>
            </PermissionGate>
          </Col>
        </Row>

        {/* Filters */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Search
              placeholder="Search users by name, username, or email..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              style={{ maxWidth: 400 }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Filter by role"
              allowClear
              style={{ width: 180 }}
              value={selectedRole}
              onChange={handleRoleFilter}
            >
              {roles.map((role) => (
                <Select.Option key={role.id} value={role.id}>
                  {role.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 120 }}
              value={activeFilter}
              onChange={handleActiveFilter}
            >
              <Select.Option value={true}>Active</Select.Option>
              <Select.Option value={false}>Inactive</Select.Option>
            </Select>
          </Col>
          <Col>
            <Tooltip title="Refresh">
              <Button icon={<ReloadOutlined />} onClick={() => fetchUsers()} />
            </Tooltip>
          </Col>
        </Row>

        {/* User Table */}
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          pagination={{
            total: totalUsers,
            pageSize: filter.limit || 50,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`
          }}
          size="middle"
        />
      </Card>

      {/* User Form Modal */}
      <UserFormDialog
        visible={isFormModalOpen}
        userId={editingUserId}
        onClose={closeFormModal}
        onSuccess={() => {
          closeFormModal();
          fetchUsers();
        }}
      />
    </div>
  );
};

export default UserListPage;
