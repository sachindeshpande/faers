/**
 * Duplicate Resolution Dialog
 * Modal for resolving duplicate candidates
 */

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Typography,
  Space,
  Alert,
  message
} from 'antd';
import { useDuplicateStore } from '../../stores/duplicateStore';
import { useAuthStore } from '../../stores/authStore';
import type { DuplicateResolution, DuplicateCandidate } from '../../../shared/types/duplicate.types';

const { Text } = Typography;
const { TextArea } = Input;

interface DuplicateResolutionDialogProps {
  open: boolean;
  candidate: DuplicateCandidate | null;
  onClose: () => void;
  onResolved?: () => void;
}

const RESOLUTION_OPTIONS: Array<{ value: DuplicateResolution; label: string; description: string }> = [
  {
    value: 'not_duplicate',
    label: 'Not a Duplicate',
    description: 'Cases are different and should remain separate'
  },
  {
    value: 'duplicate',
    label: 'Confirm as Duplicate',
    description: 'Cases are duplicates but keep both linked'
  },
  {
    value: 'related',
    label: 'Related Case',
    description: 'Same patient, different adverse events'
  }
];

export const DuplicateResolutionDialog: React.FC<DuplicateResolutionDialogProps> = ({
  open,
  candidate,
  onClose,
  onResolved
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { resolveDuplicate } = useDuplicateStore();
  const { currentUser } = useAuthStore();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (!candidate) return;

      const success = await resolveDuplicate(
        candidate.id,
        values.resolution,
        currentUser?.id,
        values.notes
      );

      if (success) {
        message.success('Duplicate resolved successfully');
        form.resetFields();
        onResolved?.();
        onClose();
      } else {
        message.error('Failed to resolve duplicate');
      }
    } catch {
      // Validation error
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  if (!candidate) return null;

  return (
    <Modal
      title="Resolve Duplicate"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Resolve"
      width={600}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert
          type="info"
          message={`Resolving duplicate between cases ${candidate.caseId1.substring(0, 8)}... and ${candidate.caseId2.substring(0, 8)}...`}
          description={`Similarity Score: ${candidate.similarityScore}%`}
        />

        <Form form={form} layout="vertical">
          <Form.Item
            name="resolution"
            label="Resolution"
            rules={[{ required: true, message: 'Please select a resolution' }]}
          >
            <Select placeholder="Select resolution">
              {RESOLUTION_OPTIONS.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  <Space direction="vertical" size={0}>
                    <Text strong>{option.label}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {option.description}
                    </Text>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Resolution Notes"
          >
            <TextArea
              rows={4}
              placeholder="Enter any notes about this resolution..."
            />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
};

export default DuplicateResolutionDialog;
