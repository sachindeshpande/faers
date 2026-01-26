/**
 * Record Acknowledgment Dialog Component (Phase 2)
 *
 * Modal dialog to record FDA acknowledgment details.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Radio, message } from 'antd';
import dayjs from 'dayjs';
import type { RecordAcknowledgmentRequest } from '../../../shared/types/ipc.types';
import type { AcknowledgmentType } from '../../../shared/types/case.types';

const { TextArea } = Input;

interface RecordAcknowledgmentDialogProps {
  visible: boolean;
  caseId: string | null;
  onSubmit: (data: RecordAcknowledgmentRequest) => Promise<boolean>;
  onCancel: () => void;
}

const RecordAcknowledgmentDialog: React.FC<RecordAcknowledgmentDialogProps> = ({
  visible,
  caseId,
  onSubmit,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [ackType, setAckType] = useState<AcknowledgmentType>('Accepted');

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        acknowledgmentType: 'Accepted',
        acknowledgmentDate: dayjs()
      });
      setAckType('Accepted');
    }
  }, [visible, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: RecordAcknowledgmentRequest = {
        caseId: caseId!,
        acknowledgmentType: values.acknowledgmentType,
        acknowledgmentDate: values.acknowledgmentDate.format('YYYY-MM-DD'),
        fdaCaseNumber: values.fdaCaseNumber,
        rejectionReason: values.rejectionReason,
        notes: values.notes
      };

      const success = await onSubmit(data);
      if (success) {
        message.success(
          data.acknowledgmentType === 'Accepted'
            ? 'Acknowledgment recorded successfully'
            : 'Rejection recorded successfully'
        );
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
      title="Record FDA Acknowledgment"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Record Acknowledgment"
      width={500}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="acknowledgmentType"
          label="Acknowledgment Type"
          rules={[{ required: true }]}
        >
          <Radio.Group onChange={(e) => setAckType(e.target.value)}>
            <Radio value="Accepted">Accepted</Radio>
            <Radio value="Rejected">Rejected</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="acknowledgmentDate"
          label="Acknowledgment Date"
          rules={[{ required: true, message: 'Please select the acknowledgment date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        {ackType === 'Accepted' && (
          <Form.Item
            name="fdaCaseNumber"
            label="FDA Case Number"
            rules={[
              { required: true, message: 'Please enter the FDA case number' }
            ]}
            extra="The case number assigned by FDA"
          >
            <Input placeholder="e.g., FDA-2026-001234" />
          </Form.Item>
        )}

        {ackType === 'Rejected' && (
          <Form.Item
            name="rejectionReason"
            label="Rejection Reason"
            rules={[
              { required: true, message: 'Please enter the rejection reason' }
            ]}
            extra="Enter the reason provided by FDA for rejection"
          >
            <TextArea rows={3} placeholder="Describe the reason for rejection" />
          </Form.Item>
        )}

        <Form.Item name="notes" label="Notes">
          <TextArea rows={3} placeholder="Optional notes about the acknowledgment" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RecordAcknowledgmentDialog;
