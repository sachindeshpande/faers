import React, { useState } from 'react';
import { Modal, Form, Select, Input, Alert, message } from 'antd';
import { useINDCaseStore } from '../../stores/indCaseStore';

const { TextArea } = Input;

interface Props {
  caseId: string;
  visible: boolean;
  onClose: () => void;
  onUnblinded?: () => void;
}

const UnblindingDialog: React.FC<Props> = ({ caseId, visible, onClose, onUnblinded }) => {
  const [form] = Form.useForm();
  const { requestUnblinding } = useINDCaseStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    const result = await requestUnblinding({ caseId, requestReason: values.reason, requestJustification: values.justification });
    setLoading(false);
    if (result.success) { message.success('Unblinding request submitted'); form.resetFields(); onClose(); onUnblinded?.(); }
    else message.error(result.error || 'Failed to request unblinding');
  };

  return (
    <Modal title="Request Unblinding" open={visible} onOk={handleSubmit} onCancel={onClose} confirmLoading={loading} okText="Submit Request">
      <Alert type="warning" message="Unblinding is irreversible" description="Unblinding may impact study integrity. Proceed only when medically necessary." showIcon style={{ marginBottom: 16 }} />
      <Form form={form} layout="vertical">
        <Form.Item name="reason" label="Reason for Unblinding" rules={[{ required: true }]}>
          <Select options={[
            { value: 'medical_emergency', label: 'Medical Emergency / Subject Safety' },
            { value: 'serious_unexpected', label: 'Serious Unexpected Event' },
            { value: 'regulatory', label: 'Regulatory Request' },
            { value: 'sponsor_assessment', label: 'Sponsor Safety Assessment' },
            { value: 'study_completion', label: 'Study Completion / Database Lock' },
            { value: 'other', label: 'Other' }
          ]} />
        </Form.Item>
        <Form.Item name="justification" label="Justification" rules={[{ required: true }]}><TextArea rows={4} /></Form.Item>
      </Form>
    </Modal>
  );
};

export default UnblindingDialog;
