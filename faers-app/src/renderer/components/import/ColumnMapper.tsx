/**
 * Column Mapper Component
 * Maps source columns to target fields for import
 */

import React, { useState } from 'react';
import {
  Table,
  Select,
  Input,
  Button,
  Space,
  Typography,
  Dropdown,
  Modal,
  Form,
  Tag,
  Tooltip
} from 'antd';
import {
  SaveOutlined,
  DownOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useImportStore } from '../../stores/importStore';
import type { ColumnMapping, ColumnTransformation } from '../../../shared/types/import.types';

const { Text } = Typography;

// Available target fields for case import
const TARGET_FIELDS = [
  // Basic case info
  { value: 'patientInitials', label: 'Patient Initials', category: 'Patient', required: false },
  { value: 'patientAge', label: 'Patient Age', category: 'Patient', required: false },
  { value: 'patientAgeUnit', label: 'Patient Age Unit', category: 'Patient', required: false },
  { value: 'patientSex', label: 'Patient Sex', category: 'Patient', required: false },
  { value: 'patientWeight', label: 'Patient Weight', category: 'Patient', required: false },
  { value: 'patientHeight', label: 'Patient Height', category: 'Patient', required: false },
  { value: 'patientDob', label: 'Date of Birth', category: 'Patient', required: false },

  // Event info
  { value: 'eventDescription', label: 'Event Description', category: 'Event', required: true },
  { value: 'eventDate', label: 'Event Date', category: 'Event', required: false },
  { value: 'eventOutcome', label: 'Event Outcome', category: 'Event', required: false },
  { value: 'receiveDate', label: 'Receive Date', category: 'Event', required: true },

  // Seriousness
  { value: 'seriousDeath', label: 'Death', category: 'Seriousness', required: false },
  { value: 'seriousLifeThreatening', label: 'Life-Threatening', category: 'Seriousness', required: false },
  { value: 'seriousHospitalization', label: 'Hospitalization', category: 'Seriousness', required: false },
  { value: 'seriousDisability', label: 'Disability', category: 'Seriousness', required: false },
  { value: 'seriousCongenitalAnomaly', label: 'Congenital Anomaly', category: 'Seriousness', required: false },
  { value: 'seriousMedicallyImportant', label: 'Medically Important', category: 'Seriousness', required: false },

  // Drug info
  { value: 'drugName', label: 'Drug Name', category: 'Drug', required: false },
  { value: 'drugRole', label: 'Drug Role', category: 'Drug', required: false },
  { value: 'drugDosage', label: 'Drug Dosage', category: 'Drug', required: false },
  { value: 'drugRoute', label: 'Administration Route', category: 'Drug', required: false },
  { value: 'drugStartDate', label: 'Drug Start Date', category: 'Drug', required: false },
  { value: 'drugStopDate', label: 'Drug Stop Date', category: 'Drug', required: false },
  { value: 'drugIndication', label: 'Drug Indication', category: 'Drug', required: false },

  // Reaction info
  { value: 'reactionTerm', label: 'Reaction Term', category: 'Reaction', required: false },
  { value: 'reactionStartDate', label: 'Reaction Start Date', category: 'Reaction', required: false },
  { value: 'reactionEndDate', label: 'Reaction End Date', category: 'Reaction', required: false },
  { value: 'reactionOutcome', label: 'Reaction Outcome', category: 'Reaction', required: false },

  // Reporter info
  { value: 'reporterName', label: 'Reporter Name', category: 'Reporter', required: false },
  { value: 'reporterQualification', label: 'Reporter Qualification', category: 'Reporter', required: false },
  { value: 'reporterCountry', label: 'Reporter Country', category: 'Reporter', required: false },
  { value: 'reporterOrganization', label: 'Reporter Organization', category: 'Reporter', required: false },

  // Additional
  { value: 'narrativeSummary', label: 'Narrative Summary', category: 'Additional', required: false },
  { value: 'reporterComments', label: 'Reporter Comments', category: 'Additional', required: false },
  { value: 'companyNumb', label: 'Company Case Number', category: 'Additional', required: false }
];

// Group fields by category
const fieldsByCategory = TARGET_FIELDS.reduce((acc, field) => {
  if (!acc[field.category]) {
    acc[field.category] = [];
  }
  acc[field.category].push(field);
  return acc;
}, {} as Record<string, typeof TARGET_FIELDS>);

// Transformation options
const TRANSFORMATIONS: { value: ColumnTransformation; label: string }[] = [
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'trim', label: 'Trim whitespace' },
  { value: 'date_us', label: 'Parse US date (MM/DD/YYYY)' },
  { value: 'date_eu', label: 'Parse EU date (DD/MM/YYYY)' },
  { value: 'date_iso', label: 'Parse ISO date (YYYY-MM-DD)' },
  { value: 'number', label: 'Parse as number' },
  { value: 'boolean_yn', label: 'Y/N to boolean' },
  { value: 'boolean_10', label: '1/0 to boolean' }
];

export const ColumnMapper: React.FC = () => {
  const {
    uploadResponse,
    columnMapping,
    updateColumnMapping,
    savedMappings,
    selectedMappingId,
    applyMapping,
    saveMapping,
    deleteMapping
  } = useImportStore();

  const [saveMappingModalOpen, setSaveMappingModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Count mapped fields
  const mappedCount = columnMapping.filter(m => m.targetField && m.targetField.length > 0).length;
  const requiredFields = TARGET_FIELDS.filter(f => f.required);
  const mappedRequired = requiredFields.filter(f =>
    columnMapping.some(m => m.targetField === f.value)
  );

  const handleSaveMapping = async () => {
    try {
      const values = await form.validateFields();
      await saveMapping(values.name, values.description);
      setSaveMappingModalOpen(false);
      form.resetFields();
    } catch (err) {
      // Form validation failed
    }
  };

  const handleDeleteMapping = async (id: number) => {
    Modal.confirm({
      title: 'Delete Saved Mapping',
      content: 'Are you sure you want to delete this saved mapping?',
      onOk: () => deleteMapping(id)
    });
  };

  const columns = [
    {
      title: 'Source Column',
      dataIndex: 'sourceColumn',
      key: 'sourceColumn',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Target Field',
      dataIndex: 'targetField',
      key: 'targetField',
      width: 250,
      render: (_: string, record: ColumnMapping, index: number) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select target field"
          allowClear
          value={record.targetField || undefined}
          onChange={(value) => updateColumnMapping(index, { targetField: value || '' })}
          showSearch
          optionFilterProp="label"
        >
          {Object.entries(fieldsByCategory).map(([category, fields]) => (
            <Select.OptGroup key={category} label={category}>
              {fields.map(field => (
                <Select.Option
                  key={field.value}
                  value={field.value}
                  label={field.label}
                  disabled={columnMapping.some(
                    (m, i) => i !== index && m.targetField === field.value
                  )}
                >
                  <Space>
                    {field.label}
                    {field.required && <Tag color="red" style={{ fontSize: 10 }}>Required</Tag>}
                  </Space>
                </Select.Option>
              ))}
            </Select.OptGroup>
          ))}
        </Select>
      )
    },
    {
      title: 'Transformation',
      dataIndex: 'transformation',
      key: 'transformation',
      width: 180,
      render: (_: string, record: ColumnMapping, index: number) => (
        <Select
          style={{ width: '100%' }}
          placeholder="None"
          allowClear
          value={record.transformation || undefined}
          onChange={(value) => updateColumnMapping(index, { transformation: value })}
          disabled={!record.targetField}
        >
          {TRANSFORMATIONS.map(t => (
            <Select.Option key={t.value} value={t.value}>
              {t.label}
            </Select.Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Default Value',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      width: 150,
      render: (_: string, record: ColumnMapping, index: number) => (
        <Input
          placeholder="Optional"
          value={record.defaultValue || ''}
          onChange={(e) => updateColumnMapping(index, { defaultValue: e.target.value || undefined })}
          disabled={!record.targetField}
        />
      )
    }
  ];

  const savedMappingItems = savedMappings.map(mapping => ({
    key: String(mapping.id),
    label: (
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <span>{mapping.name}</span>
        <DeleteOutlined
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteMapping(mapping.id);
          }}
          style={{ color: '#ff4d4f' }}
        />
      </Space>
    ),
    onClick: () => applyMapping(mapping.id)
  }));

  return (
    <div>
      {/* Mapping status */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Text>
            Mapped: <strong>{mappedCount}</strong> of {columnMapping.length} columns
          </Text>
          {mappedRequired.length < requiredFields.length ? (
            <Tooltip title={`Missing: ${requiredFields.filter(f => !mappedRequired.includes(f)).map(f => f.label).join(', ')}`}>
              <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                {requiredFields.length - mappedRequired.length} required fields missing
              </Tag>
            </Tooltip>
          ) : (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              All required fields mapped
            </Tag>
          )}
        </Space>

        <Space>
          {savedMappings.length > 0 && (
            <Dropdown
              menu={{ items: savedMappingItems }}
              trigger={['click']}
            >
              <Button>
                Load Saved Mapping <DownOutlined />
              </Button>
            </Dropdown>
          )}
          <Button
            icon={<SaveOutlined />}
            onClick={() => setSaveMappingModalOpen(true)}
            disabled={mappedCount === 0}
          >
            Save Mapping
          </Button>
        </Space>
      </div>

      {/* Mapping table */}
      <Table
        dataSource={columnMapping}
        columns={columns}
        rowKey="sourceColumn"
        pagination={false}
        scroll={{ y: 400 }}
        size="small"
      />

      {/* Preview */}
      {uploadResponse && uploadResponse.previewRows && uploadResponse.previewRows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            Preview: First row values
          </Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {columnMapping.slice(0, 5).map((mapping, idx) => (
              <div
                key={idx}
                style={{
                  background: '#f5f5f5',
                  padding: 8,
                  borderRadius: 4,
                  minWidth: 150
                }}
              >
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {mapping.sourceColumn}
                </Text>
                <div>
                  <Text ellipsis style={{ maxWidth: 150 }}>
                    {uploadResponse.previewRows[0]?.[mapping.sourceColumn] || '-'}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Mapping Modal */}
      <Modal
        title="Save Column Mapping"
        open={saveMappingModalOpen}
        onOk={handleSaveMapping}
        onCancel={() => {
          setSaveMappingModalOpen(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Mapping Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Standard CSV Import" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea
              placeholder="Optional description"
              rows={2}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
