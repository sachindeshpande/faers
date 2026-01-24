/**
 * Reporter Section Component
 *
 * Implements A.2 Primary Source fields from E2B(R3):
 * - Reporter name and contact
 * - Qualification
 * - Organization
 */

import React, { useState } from 'react';
import {
  Form,
  Input,
  Select,
  Card,
  Row,
  Col,
  Button,
  Table,
  Modal,
  Space,
  Divider,
  Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import type { CaseReporter, ReporterQualification } from '../../../shared/types/case.types';

const { Option } = Select;

interface ReporterSectionProps {
  reporters: CaseReporter[];
  onAdd: (reporter: Partial<CaseReporter>) => void;
  onUpdate: (id: number, reporter: Partial<CaseReporter>) => void;
  onDelete: (id: number) => void;
  disabled?: boolean;
}

const emptyReporter: Partial<CaseReporter> = {
  isPrimary: false,
  title: '',
  givenName: '',
  familyName: '',
  qualification: undefined,
  organization: '',
  department: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: ''
};

const ReporterSection: React.FC<ReporterSectionProps> = ({
  reporters,
  onAdd,
  onUpdate,
  onDelete,
  disabled = false
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReporter, setEditingReporter] = useState<Partial<CaseReporter> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleAdd = () => {
    // Check if this should be primary (first reporter)
    const shouldBePrimary = reporters.length === 0;
    setEditingReporter({ ...emptyReporter, isPrimary: shouldBePrimary });
    setEditingId(null);
    setModalVisible(true);
  };

  const handleEdit = (reporter: CaseReporter) => {
    setEditingReporter({ ...reporter });
    setEditingId(reporter.id ?? null);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!editingReporter) return;

    if (editingId) {
      onUpdate(editingId, editingReporter);
    } else {
      onAdd(editingReporter);
    }
    setModalVisible(false);
    setEditingReporter(null);
    setEditingId(null);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingReporter(null);
    setEditingId(null);
  };

  const updateField = (field: string, value: unknown) => {
    if (editingReporter) {
      setEditingReporter({ ...editingReporter, [field]: value });
    }
  };

  const getQualificationText = (qual: ReporterQualification | undefined) => {
    const quals: Record<number, string> = {
      1: 'Physician',
      2: 'Pharmacist',
      3: 'Other Health Professional',
      4: 'Lawyer',
      5: 'Consumer'
    };
    return qual ? quals[qual] || 'Unknown' : '-';
  };

  const columns = [
    {
      title: '',
      dataIndex: 'isPrimary',
      key: 'isPrimary',
      width: 40,
      render: (isPrimary: boolean) => (
        isPrimary ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} />
      )
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, record: CaseReporter) => {
        const parts = [record.title, record.givenName, record.familyName].filter(Boolean);
        return parts.join(' ') || '-';
      }
    },
    {
      title: 'Qualification',
      dataIndex: 'qualification',
      key: 'qualification',
      width: 150,
      render: (qual: ReporterQualification) => getQualificationText(qual)
    },
    {
      title: 'Organization',
      dataIndex: 'organization',
      key: 'organization',
      ellipsis: true
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: CaseReporter) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={disabled}
          />
          <Popconfirm
            title="Delete this reporter?"
            onConfirm={() => record.id !== undefined && onDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={disabled || record.isPrimary}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="form-section">
      <Card
        title="Primary Source / Reporter(s) (A.2)"
        className="form-card"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={disabled}
          >
            Add Reporter
          </Button>
        }
      >
        <Table
          dataSource={reporters}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No reporters added. Click "Add Reporter" to add a primary source.' }}
        />
      </Card>

      <Modal
        title={editingId ? 'Edit Reporter' : 'Add Reporter'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        width={800}
        okText="Save"
      >
        {editingReporter && (
          <Form layout="vertical">
            <Row gutter={24}>
              <Col span={6}>
                <Form.Item label="Title">
                  <Select
                    value={editingReporter.title || undefined}
                    onChange={(value) => updateField('title', value)}
                    placeholder="Title"
                    allowClear
                  >
                    <Option value="Dr.">Dr.</Option>
                    <Option value="Mr.">Mr.</Option>
                    <Option value="Mrs.">Mrs.</Option>
                    <Option value="Ms.">Ms.</Option>
                    <Option value="Prof.">Prof.</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item label="Given Name">
                  <Input
                    value={editingReporter.givenName || ''}
                    onChange={(e) => updateField('givenName', e.target.value)}
                    placeholder="First name"
                  />
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item label="Family Name">
                  <Input
                    value={editingReporter.familyName || ''}
                    onChange={(e) => updateField('familyName', e.target.value)}
                    placeholder="Last name"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="Qualification">
                  <Select
                    value={editingReporter.qualification || undefined}
                    onChange={(value) => updateField('qualification', value)}
                    placeholder="Select qualification"
                    allowClear
                  >
                    <Option value={1}>Physician</Option>
                    <Option value={2}>Pharmacist</Option>
                    <Option value={3}>Other Health Professional</Option>
                    <Option value={4}>Lawyer</Option>
                    <Option value={5}>Consumer or Non-Health Professional</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Primary Reporter">
                  <Select
                    value={editingReporter.isPrimary ? 'yes' : 'no'}
                    onChange={(value) => updateField('isPrimary', value === 'yes')}
                  >
                    <Option value="yes">Yes - Primary Source</Option>
                    <Option value="no">No - Secondary Source</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Organization</Divider>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="Organization">
                  <Input
                    value={editingReporter.organization || ''}
                    onChange={(e) => updateField('organization', e.target.value)}
                    placeholder="Organization name"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Department">
                  <Input
                    value={editingReporter.department || ''}
                    onChange={(e) => updateField('department', e.target.value)}
                    placeholder="Department"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Contact Information</Divider>

            <Row gutter={24}>
              <Col span={24}>
                <Form.Item label="Address">
                  <Input
                    value={editingReporter.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Street address"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={8}>
                <Form.Item label="City">
                  <Input
                    value={editingReporter.city || ''}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="State/Province">
                  <Input
                    value={editingReporter.state || ''}
                    onChange={(e) => updateField('state', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Country">
                  <Input
                    value={editingReporter.country || ''}
                    onChange={(e) => updateField('country', e.target.value)}
                    placeholder="ISO country code"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="Phone">
                  <Input
                    value={editingReporter.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Email">
                  <Input
                    value={editingReporter.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    type="email"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ReporterSection;
