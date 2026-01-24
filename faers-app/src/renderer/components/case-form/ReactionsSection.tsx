/**
 * Reactions Section Component
 *
 * Implements B.2 Reaction(s)/Event(s) fields from E2B(R3):
 * - Reaction term (MedDRA)
 * - Seriousness criteria
 * - Outcome
 * - Duration
 */

import React, { useState } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Card,
  Row,
  Col,
  Button,
  Table,
  Modal,
  Space,
  Divider,
  Popconfirm,
  Checkbox,
  Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CaseReaction } from '../../../shared/types/case.types';

const { Option } = Select;

interface ReactionsSectionProps {
  reactions: CaseReaction[];
  onAdd: (reaction: Partial<CaseReaction>) => void;
  onUpdate: (id: number, reaction: Partial<CaseReaction>) => void;
  onDelete: (id: number) => void;
  disabled?: boolean;
}

const emptyReaction: Partial<CaseReaction> = {
  reactionTerm: '',
  meddraCode: '',
  startDate: undefined,
  endDate: undefined,
  outcome: undefined,
  seriousDeath: false,
  seriousLifeThreat: false,
  seriousHospitalization: false,
  seriousDisability: false,
  seriousCongenital: false,
  seriousOther: false
};

const ReactionsSection: React.FC<ReactionsSectionProps> = ({
  reactions,
  onAdd,
  onUpdate,
  onDelete,
  disabled = false
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReaction, setEditingReaction] = useState<Partial<CaseReaction> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleAdd = () => {
    setEditingReaction({ ...emptyReaction });
    setEditingId(null);
    setModalVisible(true);
  };

  const handleEdit = (reaction: CaseReaction) => {
    setEditingReaction({ ...reaction });
    setEditingId(reaction.id ?? null);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!editingReaction || !editingReaction.reactionTerm) return;

    if (editingId) {
      onUpdate(editingId, editingReaction);
    } else {
      onAdd(editingReaction);
    }
    setModalVisible(false);
    setEditingReaction(null);
    setEditingId(null);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingReaction(null);
    setEditingId(null);
  };

  const updateField = (field: string, value: unknown) => {
    if (editingReaction) {
      setEditingReaction({ ...editingReaction, [field]: value });
    }
  };

  const isSerious = (reaction: CaseReaction) => {
    return (
      reaction.seriousDeath ||
      reaction.seriousLifeThreat ||
      reaction.seriousHospitalization ||
      reaction.seriousDisability ||
      reaction.seriousCongenital ||
      reaction.seriousOther
    );
  };

  const getSeriousnessTags = (reaction: CaseReaction) => {
    const tags: React.ReactNode[] = [];
    if (reaction.seriousDeath) tags.push(<Tag key="death" color="red">Death</Tag>);
    if (reaction.seriousLifeThreat) tags.push(<Tag key="life" color="orange">Life-threatening</Tag>);
    if (reaction.seriousHospitalization) tags.push(<Tag key="hosp" color="blue">Hospitalization</Tag>);
    if (reaction.seriousDisability) tags.push(<Tag key="disab" color="purple">Disability</Tag>);
    if (reaction.seriousCongenital) tags.push(<Tag key="cong" color="magenta">Congenital</Tag>);
    if (reaction.seriousOther) tags.push(<Tag key="other" color="cyan">Other Serious</Tag>);
    return tags.length > 0 ? tags : <Tag color="green">Non-serious</Tag>;
  };

  const getOutcomeText = (outcome: number | undefined) => {
    const outcomes: Record<number, string> = {
      1: 'Recovered/resolved',
      2: 'Recovering/resolving',
      3: 'Not recovered/not resolved',
      4: 'Recovered with sequelae',
      5: 'Fatal',
      6: 'Unknown'
    };
    return outcome ? outcomes[outcome] || '-' : '-';
  };

  const columns = [
    {
      title: 'Reaction Term',
      dataIndex: 'reactionTerm',
      key: 'reactionTerm',
      render: (text: string, record: CaseReaction) => (
        <Space>
          {isSerious(record) && <WarningOutlined style={{ color: '#ff4d4f' }} />}
          {text}
        </Space>
      )
    },
    {
      title: 'MedDRA Code',
      dataIndex: 'meddraCode',
      key: 'meddraCode',
      width: 120
    },
    {
      title: 'Seriousness',
      key: 'seriousness',
      width: 250,
      render: (_: unknown, record: CaseReaction) => getSeriousnessTags(record)
    },
    {
      title: 'Outcome',
      dataIndex: 'outcome',
      key: 'outcome',
      width: 150,
      render: (outcome: number) => getOutcomeText(outcome)
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: CaseReaction) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={disabled}
          />
          <Popconfirm
            title="Delete this reaction?"
            onConfirm={() => record.id !== undefined && onDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={disabled}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="form-section">
      <Card
        title="Reaction(s) / Event(s) (B.2)"
        className="form-card"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={disabled}
          >
            Add Reaction
          </Button>
        }
      >
        <Table
          dataSource={reactions}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No reactions added. Click "Add Reaction" to add a reaction/event.' }}
        />
      </Card>

      <Modal
        title={editingId ? 'Edit Reaction' : 'Add Reaction'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        width={800}
        okText="Save"
        okButtonProps={{ disabled: !editingReaction?.reactionTerm }}
      >
        {editingReaction && (
          <Form layout="vertical">
            <Row gutter={24}>
              <Col span={16}>
                <Form.Item label="Reaction Term (MedDRA Preferred Term)" required>
                  <Input
                    value={editingReaction.reactionTerm || ''}
                    onChange={(e) => updateField('reactionTerm', e.target.value)}
                    placeholder="Enter the reaction/adverse event term"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="MedDRA Code (LLT)">
                  <Input
                    value={editingReaction.meddraCode || ''}
                    onChange={(e) => updateField('meddraCode', e.target.value)}
                    placeholder="e.g., 10019211"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={24}>
                <Form.Item label="Native/Verbatim Term (as reported)">
                  <Input
                    value={editingReaction.nativeTerm || ''}
                    onChange={(e) => updateField('nativeTerm', e.target.value)}
                    placeholder="Original term as reported by the reporter"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Dates & Duration</Divider>

            <Row gutter={24}>
              <Col span={8}>
                <Form.Item label="Start Date">
                  <DatePicker
                    value={editingReaction.startDate ? dayjs(editingReaction.startDate) : null}
                    onChange={(date) => updateField('startDate', date?.format('YYYY-MM-DD'))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="End Date">
                  <DatePicker
                    value={editingReaction.endDate ? dayjs(editingReaction.endDate) : null}
                    onChange={(date) => updateField('endDate', date?.format('YYYY-MM-DD'))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="Duration">
                  <InputNumber
                    value={editingReaction.duration || undefined}
                    onChange={(value) => updateField('duration', value)}
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="Unit">
                  <Select
                    value={editingReaction.durationUnit || undefined}
                    onChange={(value) => updateField('durationUnit', value)}
                    placeholder="Unit"
                  >
                    <Option value="801">Year</Option>
                    <Option value="802">Month</Option>
                    <Option value="803">Week</Option>
                    <Option value="804">Day</Option>
                    <Option value="805">Hour</Option>
                    <Option value="806">Minute</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Seriousness Criteria</Divider>

            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Checkbox
                  checked={editingReaction.seriousDeath || false}
                  onChange={(e) => updateField('seriousDeath', e.target.checked)}
                >
                  Results in Death
                </Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox
                  checked={editingReaction.seriousLifeThreat || false}
                  onChange={(e) => updateField('seriousLifeThreat', e.target.checked)}
                >
                  Life-threatening
                </Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox
                  checked={editingReaction.seriousHospitalization || false}
                  onChange={(e) => updateField('seriousHospitalization', e.target.checked)}
                >
                  Requires Hospitalization
                </Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox
                  checked={editingReaction.seriousDisability || false}
                  onChange={(e) => updateField('seriousDisability', e.target.checked)}
                >
                  Persistent Disability
                </Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox
                  checked={editingReaction.seriousCongenital || false}
                  onChange={(e) => updateField('seriousCongenital', e.target.checked)}
                >
                  Congenital Anomaly
                </Checkbox>
              </Col>
              <Col span={8}>
                <Checkbox
                  checked={editingReaction.seriousOther || false}
                  onChange={(e) => updateField('seriousOther', e.target.checked)}
                >
                  Other Medically Important
                </Checkbox>
              </Col>
            </Row>

            <Divider orientation="left">Outcome</Divider>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="Outcome of Reaction">
                  <Select
                    value={editingReaction.outcome || undefined}
                    onChange={(value) => updateField('outcome', value)}
                    placeholder="Select outcome"
                    allowClear
                  >
                    <Option value={1}>Recovered/resolved</Option>
                    <Option value={2}>Recovering/resolving</Option>
                    <Option value={3}>Not recovered/not resolved</Option>
                    <Option value={4}>Recovered/resolved with sequelae</Option>
                    <Option value={5}>Fatal</Option>
                    <Option value={6}>Unknown</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Medical Confirmation">
                  <Select
                    value={editingReaction.medicalConfirm || undefined}
                    onChange={(value) => updateField('medicalConfirm', value)}
                    placeholder="Select"
                    allowClear
                  >
                    <Option value={1}>Yes</Option>
                    <Option value={2}>No</Option>
                    <Option value={3}>Unknown</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ReactionsSection;
