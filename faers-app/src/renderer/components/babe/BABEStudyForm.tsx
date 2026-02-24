import React, { useEffect } from 'react';
import { Form, Input, Select, Button, Card, Space, message } from 'antd';
import { useBABEStore } from '../../stores/babeStore';
import type { CreateBABEStudyDTO } from '../../../shared/types/babe.types';

interface Props { studyId?: number; onSaved?: () => void; onCancel?: () => void; }

const BABEStudyForm: React.FC<Props> = ({ studyId, onSaved, onCancel }) => {
  const [form] = Form.useForm();
  const { selectedStudy, fetchStudy, createStudy, updateStudy } = useBABEStore();

  useEffect(() => { if (studyId) fetchStudy(studyId); }, [studyId]);
  useEffect(() => { if (selectedStudy && studyId) form.setFieldsValue(selectedStudy); }, [selectedStudy]);

  const handleSubmit = async (values: any) => {
    const result = studyId ? await updateStudy(studyId, values) : await createStudy(values as CreateBABEStudyDTO);
    if (result.success) { message.success('Saved'); onSaved?.(); } else message.error(result.error);
  };

  return (
    <Card title={studyId ? 'Edit BA/BE Study' : 'New BA/BE Study'}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="protocolNumber" label="Protocol Number" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="studyDesign" label="Study Design">
          <Select options={[{ value: 'crossover', label: 'Crossover' }, { value: 'parallel', label: 'Parallel' }, { value: 'replicate', label: 'Replicate' }]} />
        </Form.Item>
        <Form.Item name="testProductName" label="Test Product" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="referenceProductName" label="Reference Product" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="activeIngredient" label="Active Ingredient"><Input /></Form.Item>
        <Form.Item name="dosageForm" label="Dosage Form"><Input /></Form.Item>
        <Form.Item name="strength" label="Strength"><Input /></Form.Item>
        <Form.Item name="population" label="Population">
          <Select options={[{ value: 'healthy_volunteers', label: 'Healthy Volunteers' }, { value: 'patients', label: 'Patients' }]} />
        </Form.Item>
        <Form.Item name="sponsorName" label="Sponsor"><Input /></Form.Item>
        <Form.Item name="preAndaNumber" label="Pre-ANDA Number"><Input /></Form.Item>
        <Space><Button type="primary" htmlType="submit">Save</Button>{onCancel && <Button onClick={onCancel}>Cancel</Button>}</Space>
      </Form>
    </Card>
  );
};

export default BABEStudyForm;
