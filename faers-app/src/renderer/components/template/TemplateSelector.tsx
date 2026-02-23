/**
 * Template Selector Component
 * Allows selecting a template when creating a new case
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  List,
  Card,
  Tag,
  Space,
  Typography,
  Input,
  Empty,
  Spin,
  Badge,
  Button
} from 'antd';
import {
  FileTextOutlined,
  SearchOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useTemplateStore } from '../../stores/templateStore';
import type { TemplateListItem, TemplateCategory } from '../../../shared/types/template.types';

const { Text, Paragraph } = Typography;

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: number) => void;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  vaccine: 'Vaccine',
  medication_error: 'Medication Error',
  device_malfunction: 'Device Malfunction',
  overdose: 'Overdose',
  pediatric: 'Pediatric',
  pregnancy: 'Pregnancy',
  product_specific: 'Product Specific',
  other: 'Other'
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  vaccine: 'blue',
  medication_error: 'orange',
  device_malfunction: 'red',
  overdose: 'volcano',
  pediatric: 'cyan',
  pregnancy: 'magenta',
  product_specific: 'purple',
  other: 'default'
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onClose,
  onSelect
}) => {
  const { templates, total, loading, loadTemplates } = useTemplateStore();
  const [searchText, setSearchText] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      // Load only approved templates
      loadTemplates({ isApproved: true, isActive: true }, 50, 0);
    }
  }, [open, loadTemplates]);

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (t.description?.toLowerCase().includes(searchText.toLowerCase()) ?? false)
  );

  const handleSelect = (template: TemplateListItem) => {
    setSelectedId(template.id);
  };

  const handleConfirm = () => {
    if (selectedId) {
      onSelect(selectedId);
      setSelectedId(null);
      setSearchText('');
    }
  };

  const handleCancel = () => {
    setSelectedId(null);
    setSearchText('');
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>Select Case Template</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="blank" onClick={() => { onSelect(0); handleCancel(); }}>
          Start Blank
        </Button>,
        <Button
          key="select"
          type="primary"
          disabled={!selectedId}
          onClick={handleConfirm}
        >
          Use Template
        </Button>
      ]}
    >
      {/* Search */}
      <Input
        placeholder="Search templates..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {/* Template List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            searchText
              ? 'No templates found matching your search'
              : 'No approved templates available'
          }
        />
      ) : (
        <List
          grid={{ gutter: 16, column: 2 }}
          dataSource={filteredTemplates}
          renderItem={(template) => (
            <List.Item>
              <Card
                size="small"
                hoverable
                onClick={() => handleSelect(template)}
                style={{
                  border:
                    selectedId === template.id
                      ? '2px solid #1890ff'
                      : '1px solid #f0f0f0'
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space>
                    <Text strong>{template.name}</Text>
                    {selectedId === template.id && (
                      <CheckCircleOutlined style={{ color: '#1890ff' }} />
                    )}
                  </Space>

                  {template.description && (
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ fontSize: 12, marginBottom: 8 }}
                    >
                      {template.description}
                    </Paragraph>
                  )}

                  <Space wrap>
                    {template.category && (
                      <Tag color={CATEGORY_COLORS[template.category]} style={{ margin: 0 }}>
                        {CATEGORY_LABELS[template.category]}
                      </Tag>
                    )}
                    <Badge
                      count={template.usageCount}
                      showZero
                      style={{ backgroundColor: '#52c41a' }}
                    />
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      )}

      {!loading && total > filteredTemplates.length && (
        <Text type="secondary" style={{ display: 'block', marginTop: 16, textAlign: 'center' }}>
          Showing {filteredTemplates.length} of {total} templates
        </Text>
      )}
    </Modal>
  );
};

export default TemplateSelector;
