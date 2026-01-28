/**
 * Assignment Dialog Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Modal dialog for assigning or reassigning cases to users.
 * Used when workflow transitions require case assignment.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Alert,
  Typography,
  Space,
  Select,
  Spin
} from 'antd';
import { UserSwitchOutlined } from '@ant-design/icons';
import type { WorkflowStatus } from '../../../shared/types/workflow.types';
import type { UserListItem } from '../../../shared/types/auth.types';

const { Text } = Typography;
const { TextArea } = Input;

interface AssignmentDialogProps {
  visible: boolean;
  caseId: string;
  targetStatus?: WorkflowStatus;
  onSubmit: (assignToUserId: string, comment?: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
  visible,
  caseId: _caseId,
  targetStatus,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load available users when dialog opens
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setError(null);
      loadUsers();
    }
  }, [visible, form]);

  // Load users that can be assigned to
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get users with appropriate roles for the target status
      const response = await window.electronAPI.getUsers({ isActive: true });
      if (response.success && response.data) {
        setUsers(response.data.users);
      }
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Get role hint based on target status
  const getRoleHint = (): string => {
    switch (targetStatus) {
      case 'In Medical Review':
        return 'Select a user with Medical Reviewer role';
      case 'In QC Review':
        return 'Select a user with QC Reviewer role';
      default:
        return 'Select a user to assign this case to';
    }
  };

  const handleSubmit = async (values: {
    assignTo: string;
    comment?: string;
  }) => {
    setError(null);

    if (!values.assignTo) {
      setError('Please select a user to assign the case to');
      return;
    }

    try {
      await onSubmit(values.assignTo, values.comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    }
  };

  return (
    <Modal
      title={
        <span>
          <UserSwitchOutlined style={{ marginRight: 8 }} />
          Assign Case
        </span>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={480}
      destroyOnClose
    >
      {targetStatus && (
        <Alert
          type="info"
          message={`Case will move to: ${targetStatus}`}
          style={{ marginBottom: 16 }}
        />
      )}

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="assignTo"
          label="Assign To"
          rules={[{ required: true, message: 'Please select a user' }]}
          extra={getRoleHint()}
        >
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="small" />
              <Text type="secondary" style={{ marginLeft: 8 }}>Loading users...</Text>
            </div>
          ) : (
            <Select
              placeholder="Select a user..."
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              disabled={isLoading}
            >
              {users.map((user) => (
                <Select.Option
                  key={user.id}
                  value={user.id}
                  label={`${user.firstName} ${user.lastName} (${user.username})`}
                >
                  <div>
                    <strong>{user.firstName} {user.lastName}</strong>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      @{user.username}
                    </Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Roles: {user.roles.join(', ')}
                    </Text>
                  </div>
                </Select.Option>
              ))}
            </Select>
          )}
        </Form.Item>

        <Form.Item
          name="comment"
          label="Assignment Notes (Optional)"
        >
          <TextArea
            rows={3}
            placeholder="Add any notes about this assignment..."
            disabled={isLoading}
            maxLength={500}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              icon={<UserSwitchOutlined />}
            >
              Assign Case
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignmentDialog;
