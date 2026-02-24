import React, { useEffect } from 'react';
import { Form, Input, Select, DatePicker, Button, Card, Space, Switch, message } from 'antd';
import { useDeviationStore } from '../../stores/deviationStore';
import { useStudyStore } from '../../stores/studyStore';

interface Props { deviationId?: number; studyId?: number; onSaved?: () => void; onCancel?: () => void; }

const DeviationForm: React.FC<Props> = ({ deviationId, studyId, onSaved, onCancel }) => {
  const [form] = Form.useForm();
  const { selectedDeviation, fetchDeviation, createDeviation, updateDeviation } = useDeviationStore();

  useEffect(() => { if (deviationId) fetchDeviation(deviationId); }, [deviationId]);
  useEffect(() => { if (selectedDeviation && deviationId) form.setFieldsValue(selectedDeviation); }, [selectedDeviation]);

  const handleSubmit = async (values: any) => {
    const data = { ...values, studyId: values.studyId || studyId };
    const result = deviationId ? await updateDeviation(deviationId, data) : await createDeviation(data);
    if (result.success) { message.success('Saved'); onSaved?.(); } else message.error(result.error);
  };

  return (
    <Card title={deviationId ? 'Edit Deviation' : 'New Protocol Deviation'}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ studyId }}>
        <Form.Item name="deviationId" label="Deviation ID" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="deviationDate" label="Deviation Date" rules={[{ required: true }]}><Input type="date" /></Form.Item>
        <Form.Item name="subjectNumber" label="Subject Number"><Input /></Form.Item>
        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
          <Select options={[
            { value: 'inclusion_exclusion', label: 'Inclusion/Exclusion Criteria' },
            { value: 'informed_consent', label: 'Informed Consent' },
            { value: 'prohibited_med', label: 'Prohibited Medication' },
            { value: 'dose_modification', label: 'Dose Modification' },
            { value: 'visit_schedule', label: 'Visit Schedule' },
            { value: 'specimen', label: 'Specimen Collection' },
            { value: 'other', label: 'Other' }
          ]} />
        </Form.Item>
        <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="impactOnSafety" label="Impact on Subject Safety"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="impactOnData" label="Impact on Data Integrity"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="correctiveAction" label="Corrective Action"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="reportedToIrb" label="Reported to IRB" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item name="reportedToSponsor" label="Reported to Sponsor" valuePropName="checked"><Switch /></Form.Item>
        <Space><Button type="primary" htmlType="submit">Save</Button>{onCancel && <Button onClick={onCancel}>Cancel</Button>}</Space>
      </Form>
    </Card>
  );
};

export default DeviationForm;
