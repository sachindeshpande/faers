/**
 * Drugs Information Section Component
 *
 * Implements B.4 Drug Information fields from E2B(R3):
 * - Drug characterization (Suspect, Concomitant, Interacting)
 * - Product name
 * - Dosage information
 * - Action taken
 */

import React, { useState, useMemo } from 'react';
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
  Tag,
  Typography
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CaseDrug, CaseDrugDosage, DrugCharacterization } from '../../../shared/types/case.types';
import type { WHODrugCoding } from '../../../shared/types/whodrug.types';
import { WHODrugAutocomplete } from '../whodrug/WHODrugAutocomplete';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface DrugsSectionProps {
  drugs: CaseDrug[];
  onAdd: (drug: Partial<CaseDrug>) => void;
  onUpdate: (id: number, drug: Partial<CaseDrug>) => void;
  onDelete: (id: number) => void;
  disabled?: boolean;
}

const emptyDrug: Partial<CaseDrug> = {
  characterization: 1,
  productName: '',
  indication: '',
  startDate: undefined,
  endDate: undefined,
  actionTaken: undefined,
  dechallenge: undefined,
  rechallenge: undefined
};

const DrugsSection: React.FC<DrugsSectionProps> = ({
  drugs,
  onAdd,
  onUpdate,
  onDelete,
  disabled = false
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Partial<CaseDrug> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Convert drug to WHODrugCoding for autocomplete
  const currentCoding: WHODrugCoding | undefined = useMemo(() => {
    if (!editingDrug?.whodrugCode || !editingDrug?.productName) {
      return undefined;
    }
    return {
      verbatimName: editingDrug.verbatimName || '',
      whodrugCode: editingDrug.whodrugCode,
      codedDrugName: editingDrug.productName,
      atcCode: editingDrug.atcCode,
      atcName: editingDrug.atcName,
      whodrugVersion: editingDrug.whodrugVersion
    };
  }, [editingDrug?.whodrugCode, editingDrug?.productName, editingDrug?.verbatimName, editingDrug?.atcCode, editingDrug?.atcName, editingDrug?.whodrugVersion]);

  // Handle WHO Drug coding selection
  const handleWHODrugCodingChange = (coding: WHODrugCoding | null) => {
    if (coding) {
      setEditingDrug(prev => ({
        ...prev,
        productName: coding.codedDrugName || coding.verbatimName,
        whodrugCode: coding.whodrugCode,
        whodrugVersion: coding.whodrugVersion,
        atcCode: coding.atcCode,
        atcName: coding.atcName,
        verbatimName: coding.verbatimName || prev?.verbatimName
      }));
    } else {
      setEditingDrug(prev => ({
        ...prev,
        productName: '',
        whodrugCode: undefined,
        whodrugVersion: undefined,
        atcCode: undefined,
        atcName: undefined
      }));
    }
  };

  const handleAdd = () => {
    setEditingDrug({ ...emptyDrug });
    setEditingId(null);
    setModalVisible(true);
  };

  const handleEdit = (drug: CaseDrug) => {
    setEditingDrug({ ...drug });
    setEditingId(drug.id ?? null);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!editingDrug || !editingDrug.productName) return;

    if (editingId) {
      onUpdate(editingId, editingDrug);
    } else {
      onAdd(editingDrug);
    }
    setModalVisible(false);
    setEditingDrug(null);
    setEditingId(null);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingDrug(null);
    setEditingId(null);
  };

  const updateField = (field: string, value: unknown) => {
    if (editingDrug) {
      setEditingDrug({ ...editingDrug, [field]: value });
    }
  };

  const updateDosageField = (field: keyof CaseDrugDosage, value: unknown) => {
    if (editingDrug) {
      const existingDosage = editingDrug.dosages?.[0] || { sortOrder: 1 };
      const updatedDosage = { ...existingDosage, [field]: value };
      setEditingDrug({ ...editingDrug, dosages: [updatedDosage as CaseDrugDosage] });
    }
  };

  const getDosageField = <K extends keyof CaseDrugDosage>(field: K): CaseDrugDosage[K] | undefined => {
    return editingDrug?.dosages?.[0]?.[field];
  };

  const getCharacterizationTag = (char: DrugCharacterization) => {
    switch (char) {
      case 1:
        return <Tag color="red">Suspect</Tag>;
      case 2:
        return <Tag color="blue">Concomitant</Tag>;
      case 3:
        return <Tag color="orange">Interacting</Tag>;
      default:
        return <Tag>Unknown</Tag>;
    }
  };

  const columns = [
    {
      title: 'Role',
      dataIndex: 'characterization',
      key: 'characterization',
      width: 120,
      render: (char: DrugCharacterization) => getCharacterizationTag(char)
    },
    {
      title: 'Product Name',
      dataIndex: 'productName',
      key: 'productName'
    },
    {
      title: 'Indication',
      dataIndex: 'indication',
      key: 'indication',
      ellipsis: true
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120
    },
    {
      title: 'Action',
      dataIndex: 'actionTaken',
      key: 'actionTaken',
      width: 150,
      render: (action: number) => {
        const actions: Record<number, string> = {
          1: 'Withdrawn',
          2: 'Dose reduced',
          3: 'Dose increased',
          4: 'Dose not changed',
          5: 'Unknown',
          6: 'Not applicable'
        };
        return actions[action] || '-';
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: CaseDrug) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={disabled}
          />
          <Popconfirm
            title="Delete this drug?"
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
        title="Drug Information (B.4)"
        className="form-card"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={disabled}
          >
            Add Drug
          </Button>
        }
      >
        <Table
          dataSource={drugs}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No drugs added. Click "Add Drug" to add a drug.' }}
        />
      </Card>

      <Modal
        title={editingId ? 'Edit Drug' : 'Add Drug'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        width={800}
        okText="Save"
        okButtonProps={{ disabled: !editingDrug?.productName }}
      >
        {editingDrug && (
          <Form layout="vertical">
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="Drug Characterization" required>
                  <Select
                    value={editingDrug.characterization}
                    onChange={(value) => updateField('characterization', value)}
                  >
                    <Option value={1}>Suspect Drug</Option>
                    <Option value={2}>Concomitant Drug</Option>
                    <Option value={3}>Interacting Drug</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Verbatim Name (as reported)">
                  <Input
                    value={editingDrug.verbatimName || ''}
                    onChange={(e) => updateField('verbatimName', e.target.value)}
                    placeholder="Original drug name as reported"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={24}>
                <Form.Item
                  label="Product Name (WHO Drug Coded)"
                  required
                  tooltip="Search for WHO Drug terms to auto-code the product"
                >
                  <WHODrugAutocomplete
                    value={currentCoding}
                    onChange={handleWHODrugCodingChange}
                    verbatimText={editingDrug.verbatimName || ''}
                    placeholder="Type to search WHO Drug dictionary..."
                    disabled={disabled}
                  />
                </Form.Item>
              </Col>
            </Row>

            {editingDrug.whodrugCode && (
              <Row style={{ marginBottom: 16 }}>
                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Coded: <Text strong>{editingDrug.productName}</Text>
                    {' '}(Code: {editingDrug.whodrugCode})
                    {editingDrug.atcCode && ` | ATC: ${editingDrug.atcCode}`}
                    {editingDrug.whodrugVersion && ` | v${editingDrug.whodrugVersion}`}
                  </Text>
                </Col>
              </Row>
            )}

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="MPID (Medicinal Product ID)">
                  <Input
                    value={editingDrug.mpid || ''}
                    onChange={(e) => updateField('mpid', e.target.value)}
                    placeholder="Enter MPID if known"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Indication for Use">
                  <Input
                    value={editingDrug.indication || ''}
                    onChange={(e) => updateField('indication', e.target.value)}
                    placeholder="Why was this drug prescribed?"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Dates</Divider>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="Start Date">
                  <DatePicker
                    value={editingDrug.startDate ? dayjs(editingDrug.startDate) : null}
                    onChange={(date) => updateField('startDate', date?.format('YYYY-MM-DD'))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="End Date">
                  <DatePicker
                    value={editingDrug.endDate ? dayjs(editingDrug.endDate) : null}
                    onChange={(date) => updateField('endDate', date?.format('YYYY-MM-DD'))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Administration Dosage</Divider>

            <Row gutter={24}>
              <Col span={6}>
                <Form.Item label="Dose">
                  <InputNumber
                    value={getDosageField('dose')}
                    onChange={(value) => updateDosageField('dose', value)}
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="e.g., 1"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Dose Unit">
                  <Input
                    value={getDosageField('doseUnit') || ''}
                    onChange={(e) => updateDosageField('doseUnit', e.target.value)}
                    placeholder="e.g., tablet, mg"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Frequency">
                  <Input
                    value={getDosageField('dosageText') || ''}
                    onChange={(e) => updateDosageField('dosageText', e.target.value)}
                    placeholder="e.g., BID, once daily"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Route">
                  <Select
                    value={getDosageField('route')}
                    onChange={(value) => updateDosageField('route', value)}
                    placeholder="Select route"
                    allowClear
                  >
                    <Option value="Oral">Oral</Option>
                    <Option value="Intravenous">Intravenous</Option>
                    <Option value="Intramuscular">Intramuscular</Option>
                    <Option value="Subcutaneous">Subcutaneous</Option>
                    <Option value="Topical">Topical</Option>
                    <Option value="Inhalation">Inhalation</Option>
                    <Option value="Transdermal">Transdermal</Option>
                    <Option value="Rectal">Rectal</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Cumulative Dosage</Divider>

            <Row gutter={24}>
              <Col span={8}>
                <Form.Item label="Cumulative Dose">
                  <InputNumber
                    value={editingDrug.cumulativeDose || undefined}
                    onChange={(value) => updateField('cumulativeDose', value)}
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Cumulative Unit">
                  <Select
                    value={editingDrug.cumulativeUnit || undefined}
                    onChange={(value) => updateField('cumulativeUnit', value)}
                    placeholder="Select unit"
                    allowClear
                  >
                    <Option value="mg">mg</Option>
                    <Option value="g">g</Option>
                    <Option value="mcg">mcg</Option>
                    <Option value="mL">mL</Option>
                    <Option value="IU">IU</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Time to Onset (days)">
                  <InputNumber
                    value={editingDrug.timeToOnset || undefined}
                    onChange={(value) => updateField('timeToOnset', value)}
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Action & Response</Divider>

            <Row gutter={24}>
              <Col span={8}>
                <Form.Item label="Action Taken with Drug">
                  <Select
                    value={editingDrug.actionTaken || undefined}
                    onChange={(value) => updateField('actionTaken', value)}
                    placeholder="Select action"
                    allowClear
                  >
                    <Option value={1}>Drug withdrawn</Option>
                    <Option value={2}>Dose reduced</Option>
                    <Option value={3}>Dose increased</Option>
                    <Option value={4}>Dose not changed</Option>
                    <Option value={5}>Unknown</Option>
                    <Option value={6}>Not applicable</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Dechallenge">
                  <Select
                    value={editingDrug.dechallenge || undefined}
                    onChange={(value) => updateField('dechallenge', value)}
                    placeholder="Select result"
                    allowClear
                  >
                    <Option value={1}>Yes, reaction abated</Option>
                    <Option value={2}>Yes, reaction did not abate</Option>
                    <Option value={3}>No, reaction did not abate</Option>
                    <Option value={4}>Unknown</Option>
                    <Option value={5}>Not applicable</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Rechallenge">
                  <Select
                    value={editingDrug.rechallenge || undefined}
                    onChange={(value) => updateField('rechallenge', value)}
                    placeholder="Select result"
                    allowClear
                  >
                    <Option value={1}>Yes, reaction recurred</Option>
                    <Option value={2}>Yes, reaction did not recur</Option>
                    <Option value={3}>No</Option>
                    <Option value={4}>Unknown</Option>
                    <Option value={5}>Not applicable</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Product Details (Source Document)</Divider>

            <Row gutter={24}>
              <Col span={8}>
                <Form.Item label="NDC Number">
                  <Input
                    value={editingDrug.ndcNumber || ''}
                    onChange={(e) => updateField('ndcNumber', e.target.value)}
                    placeholder="National Drug Code"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Manufacturer">
                  <Input
                    value={editingDrug.manufacturerName || ''}
                    onChange={(e) => updateField('manufacturerName', e.target.value)}
                    placeholder="Drug manufacturer"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Lot Number">
                  <Input
                    value={editingDrug.lotNumber || ''}
                    onChange={(e) => updateField('lotNumber', e.target.value)}
                    placeholder="Product lot number"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={8}>
                <Form.Item label="Expiration Date">
                  <DatePicker
                    value={editingDrug.expirationDate ? dayjs(editingDrug.expirationDate) : null}
                    onChange={(date) => updateField('expirationDate', date?.format('YYYY-MM-DD'))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Additional Information">
              <TextArea
                value={editingDrug.additionalInfo || ''}
                onChange={(e) => updateField('additionalInfo', e.target.value)}
                rows={3}
                placeholder="Any additional information about this drug"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default DrugsSection;
