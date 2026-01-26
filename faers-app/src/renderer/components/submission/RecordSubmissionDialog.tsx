/**
 * Record Submission Dialog Component (Phase 2)
 *
 * Modal dialog to record FDA ESG NextGen USP submission details.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import type { RecordSubmissionRequest } from '../../../shared/types/ipc.types';

const { TextArea } = Input;

interface RecordSubmissionDialogProps {
  visible: boolean;
  caseId: string | null;
  onSubmit: (data: RecordSubmissionRequest) => Promise<boolean>;
  onCancel: () => void;
}

const RecordSubmissionDialog: React.FC<RecordSubmissionDialogProps> = ({
  visible,
  caseId,
  onSubmit,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        submissionDate: dayjs()
      });
    }
  }, [visible, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: RecordSubmissionRequest = {
        caseId: caseId!,
        srpConfirmationNumber: values.srpConfirmationNumber,
        submissionDate: values.submissionDate.format('YYYY-MM-DD'),
        notes: values.notes
      };

      const success = await onSubmit(data);
      if (success) {
        message.success('Submission recorded successfully');
        onCancel();
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Record FDA Submission"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Record Submission"
      width={500}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="srpConfirmationNumber"
          label="ESG Core ID"
          rules={[
            { required: true, message: 'Please enter the ESG Core ID' }
          ]}
          extra="Enter the confirmation ID received from FDA ESG NextGen Unified Submission Portal"
        >
          <Input placeholder="e.g., ESG-2026-12345" />
        </Form.Item>

        <Form.Item
          name="submissionDate"
          label="Submission Date"
          rules={[{ required: true, message: 'Please select the submission date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea rows={3} placeholder="Optional notes about the submission" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RecordSubmissionDialog;
