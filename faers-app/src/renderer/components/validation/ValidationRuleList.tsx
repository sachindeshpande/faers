/**
 * Validation Rule List Component
 * Displays and manages validation rules
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Switch,
  Popconfirm,
  Input,
  Select,
  Tooltip,
  Badge,
  Modal,
  Form,
  message
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  LockOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useValidationStore } from '../../stores/validationStore';
import type {
  ValidationRuleListItem,
  ValidationRuleType,
  ValidationSeverity,
  CreateValidationRuleRequest
} from '../../../shared/types/validation.types';

const { Title, Text } = Typography;
const { Search } = Input;

const RULE_TYPE_LABELS: Record<ValidationRuleType, string> = {
  required: 'Required Field',
  format: 'Format Validation',
  range: 'Range Check',
  cross_field: 'Cross-Field',
  date_logic: 'Date Logic',
  custom: 'Custom Rule'
};

const SEVERITY_COLORS: Record<ValidationSeverity, string> = {
  error: 'red',
  warning: 'orange',
  info: 'blue'
};

interface ValidationRuleListProps {
  onEditRule?: (ruleId: number) => void;
  onTestRule?: (ruleId: number) => void;
}

export const ValidationRuleList: React.FC<ValidationRuleListProps> = ({
  onEditRule,
  onTestRule
}) => {
  const {
    rules,
    ruleFilter,
    isLoading,
    loadRules,
    toggleRule,
    deleteRule,
    setRuleFilter,
    createRule
  } = useValidationStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleToggle = async (id: number, checked: boolean) => {
    const result = await toggleRule(id, checked);
    if (result) {
      message.success(`Rule ${checked ? 'enabled' : 'disabled'}`);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await deleteRule(id);
    if (result) {
      message.success('Rule deleted');
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const request: CreateValidationRuleRequest = {
        ruleCode: values.ruleCode,
        ruleName: values.ruleName,
        description: values.description,
        ruleType: values.ruleType,
        severity: values.severity,
        conditionExpression: values.conditionExpression,
        validationExpression: values.validationExpression,
        errorMessage: values.errorMessage,
        fieldPath: values.fieldPath,
        relatedFields: values.relatedFields
          ? values.relatedFields.split(',').map((f: string) => f.trim())
          : undefined
      };

      const result = await createRule(request);
      if (result) {
        message.success('Rule created');
        setCreateModalOpen(false);
        form.resetFields();
      }
    } catch (err) {
      // Form validation failed
    }
  };

  const handleSearch = (value: string) => {
    setRuleFilter({ ...ruleFilter, search: value });
    loadRules({ ...ruleFilter, search: value });
  };

  const handleTypeFilter = (value: ValidationRuleType | undefined) => {
    setRuleFilter({ ...ruleFilter, ruleType: value });
    loadRules({ ...ruleFilter, ruleType: value });
  };

  const handleSeverityFilter = (value: ValidationSeverity | undefined) => {
    setRuleFilter({ ...ruleFilter, severity: value });
    loadRules({ ...ruleFilter, severity: value });
  };

  const columns: ColumnsType<ValidationRuleListItem> = [
    {
      title: 'Code',
      dataIndex: 'ruleCode',
      key: 'ruleCode',
      width: 140,
      render: (code: string, record) => (
        <Space>
          {record.isSystem && (
            <Tooltip title="System Rule">
              <LockOutlined style={{ color: '#999' }} />
            </Tooltip>
          )}
          <Text strong>{code}</Text>
        </Space>
      )
    },
    {
      title: 'Name',
      dataIndex: 'ruleName',
      key: 'ruleName',
      ellipsis: true
    },
    {
      title: 'Type',
      dataIndex: 'ruleType',
      key: 'ruleType',
      width: 130,
      render: (type: ValidationRuleType) => (
        <Tag>{RULE_TYPE_LABELS[type]}</Tag>
      )
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: ValidationSeverity) => (
        <Tag color={SEVERITY_COLORS[severity]}>
          {severity.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Field',
      dataIndex: 'fieldPath',
      key: 'fieldPath',
      width: 140,
      ellipsis: true,
      render: (field: string) => field || '-'
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleToggle(record.id, checked)}
          size="small"
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record) => (
        <Space size="small">
          {onTestRule && (
            <Tooltip title="Test Rule">
              <Button
                type="text"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => onTestRule(record.id)}
              />
            </Tooltip>
          )}
          {!record.isSystem && onEditRule && (
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEditRule(record.id)}
              />
            </Tooltip>
          )}
          {!record.isSystem && (
            <Tooltip title="Delete">
              <Popconfirm
                title="Delete this rule?"
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const systemCount = rules.filter(r => r.isSystem).length;
  const customCount = rules.filter(r => !r.isSystem).length;
  const activeCount = rules.filter(r => r.isActive).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Validation Rules</Title>
        <Space>
          <Badge count={activeCount} style={{ backgroundColor: '#52c41a' }}>
            <Text type="secondary">Active</Text>
          </Badge>
          <Text type="secondary">|</Text>
          <Text type="secondary">{systemCount} System</Text>
          <Text type="secondary">|</Text>
          <Text type="secondary">{customCount} Custom</Text>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Search
          placeholder="Search rules..."
          allowClear
          onSearch={handleSearch}
          style={{ width: 250 }}
        />
        <Select
          placeholder="Rule Type"
          allowClear
          style={{ width: 150 }}
          onChange={handleTypeFilter}
          options={Object.entries(RULE_TYPE_LABELS).map(([value, label]) => ({
            value,
            label
          }))}
        />
        <Select
          placeholder="Severity"
          allowClear
          style={{ width: 120 }}
          onChange={handleSeverityFilter}
          options={[
            { value: 'error', label: 'Error' },
            { value: 'warning', label: 'Warning' },
            { value: 'info', label: 'Info' }
          ]}
        />
        <div style={{ flex: 1 }} />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => loadRules()}
          loading={isLoading}
        >
          Refresh
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          New Rule
        </Button>
      </div>

      <Table
        dataSource={rules}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
      />

      {/* Create Rule Modal */}
      <Modal
        title="Create Validation Rule"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="ruleCode"
            label="Rule Code"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="e.g., CUSTOM-AGE-001" />
          </Form.Item>
          <Form.Item
            name="ruleName"
            label="Rule Name"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="e.g., Age Consistency Check" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
          <Form.Item
            name="ruleType"
            label="Rule Type"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Select
              options={Object.entries(RULE_TYPE_LABELS).map(([value, label]) => ({
                value,
                label
              }))}
            />
          </Form.Item>
          <Form.Item
            name="severity"
            label="Severity"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Select
              options={[
                { value: 'error', label: 'Error' },
                { value: 'warning', label: 'Warning' },
                { value: 'info', label: 'Info' }
              ]}
            />
          </Form.Item>
          <Form.Item name="fieldPath" label="Primary Field">
            <Input placeholder="e.g., patient_age" />
          </Form.Item>
          <Form.Item name="relatedFields" label="Related Fields">
            <Input placeholder="Comma-separated, e.g., patient_birthdate, receipt_date" />
          </Form.Item>
          <Form.Item name="conditionExpression" label="Condition Expression">
            <Input.TextArea
              rows={2}
              placeholder="When to apply this rule, e.g., patient_age !== null"
            />
          </Form.Item>
          <Form.Item
            name="validationExpression"
            label="Validation Expression"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="Validation logic, e.g., patient_age <= 150"
            />
          </Form.Item>
          <Form.Item
            name="errorMessage"
            label="Error Message"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Message shown when validation fails" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
