/**
 * PSR Schedule Configuration Component
 * Phase 4: Configure PSR schedules for a product
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Select,
  InputNumber,
  DatePicker,
  Button,
  Space,
  Table,
  Popconfirm,
  Typography,
  Alert,
  Switch,
  message,
  Empty
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { usePSRStore, usePSRSchedules } from '../../stores/psrStore';
import type {
  PSRSchedule,
  PSRFormat,
  PSRFrequency,
  CreatePSRScheduleDTO,
  UpdatePSRScheduleDTO
} from '../../../shared/types/psr.types';
import {
  PSR_FORMAT_LABELS,
  PSR_FREQUENCY_LABELS
} from '../../../shared/types/psr.types';

const { Title, Text } = Typography;

interface PSRScheduleConfigProps {
  productId: number;
  productName?: string;
  onScheduleChange?: () => void;
}

interface ScheduleFormValues {
  psrFormat: PSRFormat;
  frequency: PSRFrequency;
  startDate?: dayjs.Dayjs;
  dlpOffsetDays: number;
  dueOffsetDays: number;
  isActive: boolean;
}

export const PSRScheduleConfig: React.FC<PSRScheduleConfigProps> = ({
  productId,
  productName,
  onScheduleChange
}) => {
  const { schedules, loading, error } = usePSRSchedules();
  const { loadSchedules, createSchedule, updateSchedule, deleteSchedule, loadNextPeriod } = usePSRStore();

  const [form] = Form.useForm<ScheduleFormValues>();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedules(productId);
  }, [productId, loadSchedules]);

  const handleAdd = async (values: ScheduleFormValues) => {
    setSaving(true);
    try {
      const data: CreatePSRScheduleDTO = {
        productId,
        psrFormat: values.psrFormat,
        frequency: values.frequency,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        dlpOffsetDays: values.dlpOffsetDays,
        dueOffsetDays: values.dueOffsetDays,
        isActive: values.isActive
      };
      const result = await createSchedule(data);
      if (result) {
        message.success('Schedule created successfully');
        setShowAddForm(false);
        form.resetFields();
        onScheduleChange?.();
      } else {
        message.error('Failed to create schedule');
      }
    } catch {
      message.error('Failed to create schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number, values: Partial<ScheduleFormValues>) => {
    setSaving(true);
    try {
      const data: UpdatePSRScheduleDTO = {
        psrFormat: values.psrFormat,
        frequency: values.frequency,
        startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : undefined,
        dlpOffsetDays: values.dlpOffsetDays,
        dueOffsetDays: values.dueOffsetDays,
        isActive: values.isActive
      };
      const result = await updateSchedule(id, data);
      if (result) {
        message.success('Schedule updated successfully');
        setEditingId(null);
        onScheduleChange?.();
      } else {
        message.error('Failed to update schedule');
      }
    } catch {
      message.error('Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const success = await deleteSchedule(id);
    if (success) {
      message.success('Schedule deleted successfully');
      onScheduleChange?.();
    } else {
      message.error('Failed to delete schedule');
    }
  };

  const handleViewNextPeriod = async (scheduleId: number) => {
    const period = await loadNextPeriod(scheduleId);
    if (period) {
      message.info(
        `Next period: ${dayjs(period.periodStart).format('MMM D, YYYY')} - ${dayjs(period.periodEnd).format('MMM D, YYYY')}, Due: ${dayjs(period.dueDate).format('MMM D, YYYY')}`
      );
    }
  };

  const columns: ColumnsType<PSRSchedule> = [
    {
      title: 'Format',
      dataIndex: 'psrFormat',
      key: 'psrFormat',
      width: 120,
      render: (format: PSRFormat) => PSR_FORMAT_LABELS[format]
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency',
      width: 120,
      render: (freq: PSRFrequency) => PSR_FREQUENCY_LABELS[freq]
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date: string | undefined) => date ? dayjs(date).format('MMM D, YYYY') : 'From Approval'
    },
    {
      title: 'DLP Offset',
      dataIndex: 'dlpOffsetDays',
      key: 'dlpOffsetDays',
      width: 100,
      render: (days: number) => `${days} days`
    },
    {
      title: 'Due Offset',
      dataIndex: 'dueOffsetDays',
      key: 'dueOffsetDays',
      width: 100,
      render: (days: number) => `${days} days`
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (active: boolean, record) => (
        <Switch
          checked={active}
          onChange={(checked) => handleUpdate(record.id, { isActive: checked })}
          size="small"
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<CalendarOutlined />}
            onClick={() => handleViewNextPeriod(record.id)}
          >
            Next
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingId(record.id);
              form.setFieldsValue({
                psrFormat: record.psrFormat,
                frequency: record.frequency,
                startDate: record.startDate ? dayjs(record.startDate) : undefined,
                dlpOffsetDays: record.dlpOffsetDays,
                dueOffsetDays: record.dueOffsetDays,
                isActive: record.isActive
              });
            }}
          />
          <Popconfirm
            title="Delete this schedule?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const initialValues: ScheduleFormValues = {
    psrFormat: 'PADER',
    frequency: 'quarterly',
    dlpOffsetDays: 0,
    dueOffsetDays: 30,
    isActive: true
  };

  return (
    <Card size="small" title={<Space><CalendarOutlined /><span>PSR Schedule Configuration</span></Space>}>
      {productName && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Configure periodic safety report schedules for {productName}
        </Text>
      )}

      {error && (
        <Alert message={error} type="error" style={{ marginBottom: 16 }} />
      )}

      {/* Schedule List */}
      {schedules.length > 0 ? (
        <Table
          columns={columns}
          dataSource={schedules}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          style={{ marginBottom: 16 }}
        />
      ) : !showAddForm ? (
        <Empty
          description="No PSR schedules configured"
          style={{ marginBottom: 16 }}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowAddForm(true)}
          >
            Add Schedule
          </Button>
        </Empty>
      ) : null}

      {/* Edit Form (inline) */}
      {editingId !== null && (
        <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
          <Title level={5}>Edit Schedule</Title>
          <Form
            form={form}
            layout="inline"
            onFinish={(values) => handleUpdate(editingId, values)}
          >
            <Form.Item name="psrFormat" label="Format">
              <Select style={{ width: 120 }}>
                {Object.entries(PSR_FORMAT_LABELS).map(([key, label]) => (
                  <Select.Option key={key} value={key}>{label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="frequency" label="Frequency">
              <Select style={{ width: 130 }}>
                {Object.entries(PSR_FREQUENCY_LABELS).map(([key, label]) => (
                  <Select.Option key={key} value={key}>{label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="dlpOffsetDays" label="DLP Offset">
              <InputNumber min={0} max={90} addonAfter="days" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="dueOffsetDays" label="Due Offset">
              <InputNumber min={0} max={180} addonAfter="days" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                >
                  Save
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setEditingId(null);
                    form.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Add Form */}
      {showAddForm && (
        <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
          <Title level={5}>Add New Schedule</Title>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAdd}
            initialValues={initialValues}
          >
            <Space wrap align="start">
              <Form.Item
                name="psrFormat"
                label="Report Format"
                rules={[{ required: true }]}
              >
                <Select style={{ width: 150 }}>
                  {Object.entries(PSR_FORMAT_LABELS).map(([key, label]) => (
                    <Select.Option key={key} value={key}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="frequency"
                label="Frequency"
                rules={[{ required: true }]}
              >
                <Select style={{ width: 150 }}>
                  {Object.entries(PSR_FREQUENCY_LABELS).map(([key, label]) => (
                    <Select.Option key={key} value={key}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="startDate" label="Start Date">
                <DatePicker placeholder="From approval date" />
              </Form.Item>

              <Form.Item
                name="dlpOffsetDays"
                label="DLP Offset (days)"
                tooltip="Days before period end for data lock point"
              >
                <InputNumber min={0} max={90} style={{ width: 100 }} />
              </Form.Item>

              <Form.Item
                name="dueOffsetDays"
                label="Due Offset (days)"
                tooltip="Days after period end for submission due date"
              >
                <InputNumber min={0} max={180} style={{ width: 100 }} />
              </Form.Item>

              <Form.Item name="isActive" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Space>

            <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                  loading={saving}
                >
                  Add Schedule
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setShowAddForm(false);
                    form.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Add Button (when there are schedules) */}
      {schedules.length > 0 && !showAddForm && editingId === null && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            setShowAddForm(true);
          }}
          block
        >
          Add Another Schedule
        </Button>
      )}
    </Card>
  );
};

export default PSRScheduleConfig;
