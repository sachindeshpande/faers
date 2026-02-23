/**
 * Saved Search List Component
 * Displays and manages saved searches
 */

import React, { useState } from 'react';
import {
  List,
  Button,
  Modal,
  Form,
  Input,
  Checkbox,
  Space,
  Typography,
  Tooltip,
  Popconfirm,
  Empty,
  Spin,
  Tag,
  message
} from 'antd';
import {
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ShareAltOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useSearchStore } from '../../stores/searchStore';
import type { SavedSearch } from '../../../shared/types/search.types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;

interface SaveSearchModalProps {
  open: boolean;
  onClose: () => void;
  editingSearch?: SavedSearch | null;
}

const SaveSearchModal: React.FC<SaveSearchModalProps> = ({
  open,
  onClose,
  editingSearch
}) => {
  const [form] = Form.useForm();
  const { saveSearch, updateSavedSearch } = useSearchStore();
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      if (editingSearch) {
        form.setFieldsValue({
          name: editingSearch.name,
          description: editingSearch.description,
          isShared: editingSearch.isShared
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editingSearch, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingSearch) {
        await updateSavedSearch(editingSearch.id, {
          name: values.name,
          description: values.description,
          isShared: values.isShared
        });
        message.success('Search updated');
      } else {
        const result = await saveSearch(
          values.name,
          values.description,
          values.isShared
        );
        if (result) {
          message.success('Search saved');
        } else {
          message.error('Failed to save search');
        }
      }

      onClose();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editingSearch ? 'Edit Saved Search' : 'Save Current Search'}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={saving}
      okText={editingSearch ? 'Update' : 'Save'}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Search Name"
          rules={[{ required: true, message: 'Please enter a name' }]}
        >
          <Input placeholder="e.g., Serious cardiac cases this month" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea
            rows={3}
            placeholder="Optional description of what this search finds"
          />
        </Form.Item>

        <Form.Item
          name="isShared"
          valuePropName="checked"
        >
          <Checkbox>
            <Space>
              <ShareAltOutlined />
              Share this search with other users
            </Space>
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const SavedSearchList: React.FC = () => {
  const {
    savedSearches,
    isLoadingSavedSearches,
    selectedSavedSearch,
    executeSavedSearch,
    deleteSavedSearch,
    loadSavedSearches,
    advancedQuery
  } = useSearchStore();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);

  const handleExecute = (search: SavedSearch) => {
    executeSavedSearch(search);
  };

  const handleEdit = (search: SavedSearch) => {
    setEditingSearch(search);
    setSaveModalOpen(true);
  };

  const handleDelete = async (search: SavedSearch) => {
    await deleteSavedSearch(search.id);
    message.success('Search deleted');
  };

  const handleSaveNew = () => {
    setEditingSearch(null);
    setSaveModalOpen(true);
  };

  const handleModalClose = () => {
    setSaveModalOpen(false);
    setEditingSearch(null);
  };

  const hasConditions = advancedQuery.conditions && advancedQuery.conditions.conditions.length > 0;

  if (isLoadingSavedSearches) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin tip="Loading saved searches..." />
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSaveNew}
          disabled={!hasConditions}
        >
          Save Current Search
        </Button>
        <Button onClick={() => loadSavedSearches()}>
          Refresh
        </Button>
      </Space>

      {!hasConditions && (
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Build a search query in the "Advanced Search" tab before saving.
        </Paragraph>
      )}

      {savedSearches.length === 0 ? (
        <Empty description="No saved searches yet" />
      ) : (
        <List
          dataSource={savedSearches}
          renderItem={(search) => (
            <List.Item
              key={search.id}
              style={{
                backgroundColor:
                  selectedSavedSearch?.id === search.id ? '#e6f7ff' : undefined,
                padding: '12px 16px',
                borderRadius: 4,
                marginBottom: 8,
                border: '1px solid #f0f0f0'
              }}
              actions={[
                <Tooltip title="Run search" key="run">
                  <Button
                    type="text"
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleExecute(search)}
                  />
                </Tooltip>,
                <Tooltip title="Edit" key="edit">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(search)}
                  />
                </Tooltip>,
                <Popconfirm
                  key="delete"
                  title="Delete this saved search?"
                  onConfirm={() => handleDelete(search)}
                  okText="Delete"
                  cancelText="Cancel"
                >
                  <Tooltip title="Delete">
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{search.name}</Text>
                    {search.isShared && (
                      <Tag icon={<ShareAltOutlined />} color="blue">
                        Shared
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    {search.description && (
                      <Text type="secondary">{search.description}</Text>
                    )}
                    <Space size="large">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <UserOutlined /> {search.createdByName || 'Unknown'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Used {search.executionCount} times
                      </Text>
                      {search.lastExecutedAt && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Last run {dayjs(search.lastExecutedAt).fromNow()}
                        </Text>
                      )}
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}

      <SaveSearchModal
        open={saveModalOpen}
        onClose={handleModalClose}
        editingSearch={editingSearch}
      />
    </div>
  );
};
