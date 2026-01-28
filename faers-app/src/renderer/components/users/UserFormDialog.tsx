/**
 * User Form Dialog Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Modal dialog for creating and editing users.
 * Includes role assignment and password generation.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Alert,
  Typography,
  Space,
  Divider,
  message
} from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import { useUserStore, useRoles, useUserActions } from '../../stores/userStore';
import type { CreateUserDTO, UpdateUserDTO } from '../../../shared/types/auth.types';

const { Text } = Typography;

interface UserFormDialogProps {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Generate a random secure password
const generatePassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill remaining characters
  for (let i = 4; i < 14; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

const UserFormDialog: React.FC<UserFormDialogProps> = ({
  visible,
  userId,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const roles = useRoles();
  const { selectedUser, isLoading, error } = useUserStore();
  const { createUser, updateUser, fetchUser, fetchRoles, clearError } = useUserActions();

  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const isEditing = !!userId;

  // Load roles and user data
  useEffect(() => {
    if (visible) {
      fetchRoles();
      clearError();

      if (userId) {
        fetchUser(userId);
      } else {
        // Reset form for new user
        form.resetFields();
        // Generate initial password for new user
        setGeneratedPassword(generatePassword());
      }
    }
  }, [visible, userId, fetchRoles, fetchUser, clearError, form]);

  // Populate form when editing
  useEffect(() => {
    if (selectedUser && isEditing) {
      form.setFieldsValue({
        username: selectedUser.username,
        email: selectedUser.email,
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        roleIds: selectedUser.roles?.map((r) => r.id) || []
      });
    }
  }, [selectedUser, isEditing, form]);

  // Handle form submission
  const handleSubmit = async (values: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roleIds: string[];
  }) => {
    if (isEditing && userId) {
      const updateData: UpdateUserDTO = {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        roleIds: values.roleIds
      };

      const result = await updateUser(userId, updateData);
      if (result.success) {
        message.success('User updated successfully');
        onSuccess();
      }
    } else {
      if (!generatedPassword) {
        message.error('Password not generated');
        return;
      }

      const createData: CreateUserDTO = {
        username: values.username,
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        password: generatedPassword,
        roleIds: values.roleIds
      };

      const result = await createUser(createData);
      if (result.success) {
        // Show the generated password to admin
        Modal.success({
          title: 'User Created Successfully',
          content: (
            <div>
              <p>User &quot;{values.username}&quot; has been created.</p>
              <Divider />
              <p><strong>Temporary Password:</strong></p>
              <Text code copyable style={{ fontSize: 16 }}>
                {generatedPassword}
              </Text>
              <p style={{ marginTop: 16, color: '#666' }}>
                Please share this password securely with the user.
                They will be required to change it on first login.
              </p>
            </div>
          ),
          okText: 'Done'
        });
        onSuccess();
      }
    }
  };

  // Handle regenerate password
  const handleRegeneratePassword = () => {
    setGeneratedPassword(generatePassword());
  };

  const handleCancel = () => {
    form.resetFields();
    setGeneratedPassword(null);
    clearError();
    onClose();
  };

  return (
    <Modal
      title={
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          {isEditing ? 'Edit User' : 'Create New User'}
        </span>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={520}
      destroyOnClose
    >
      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={clearError}
          style={{ marginBottom: 24 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="username"
          label="Username"
          rules={[
            { required: true, message: 'Please enter a username' },
            { min: 3, message: 'Username must be at least 3 characters' },
            { max: 50, message: 'Username cannot exceed 50 characters' },
            {
              pattern: /^[a-zA-Z0-9_]+$/,
              message: 'Username can only contain letters, numbers, and underscores'
            }
          ]}
        >
          <Input
            prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Enter username"
            disabled={isEditing || isLoading}
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: 'Please enter an email address' },
            { type: 'email', message: 'Please enter a valid email address' }
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Enter email address"
            disabled={isLoading}
          />
        </Form.Item>

        <Space style={{ width: '100%' }} size={16}>
          <Form.Item
            name="firstName"
            label="First Name"
            style={{ flex: 1, marginBottom: 16 }}
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="First name" disabled={isLoading} />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Last Name"
            style={{ flex: 1, marginBottom: 16 }}
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Last name" disabled={isLoading} />
          </Form.Item>
        </Space>

        <Form.Item
          name="roleIds"
          label="Roles"
          rules={[{ required: true, message: 'Please select at least one role' }]}
        >
          <Select
            mode="multiple"
            placeholder="Select roles"
            disabled={isLoading}
            optionFilterProp="children"
          >
            {roles.map((role) => (
              <Select.Option key={role.id} value={role.id}>
                {role.name}
                {role.description && (
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    - {role.description}
                  </Text>
                )}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Password section - only for new users */}
        {!isEditing && (
          <div style={{ marginBottom: 24 }}>
            <Divider>Initial Password</Divider>
            <div
              style={{
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 8,
                textAlign: 'center'
              }}
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Generated temporary password:
              </Text>
              <Text code copyable style={{ fontSize: 18 }}>
                {generatedPassword}
              </Text>
              <div style={{ marginTop: 12 }}>
                <Button size="small" onClick={handleRegeneratePassword}>
                  Regenerate Password
                </Button>
              </div>
              <Text
                type="secondary"
                style={{ display: 'block', marginTop: 12, fontSize: 12 }}
              >
                User will be required to change this password on first login.
              </Text>
            </div>
          </div>
        )}

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              {isEditing ? 'Update User' : 'Create User'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserFormDialog;
