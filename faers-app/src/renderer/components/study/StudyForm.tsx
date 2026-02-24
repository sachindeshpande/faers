import React, { useEffect } from 'react';
import { Form, Input, Select, InputNumber, DatePicker, Switch, Button, Card, Divider, List, Tag, Space, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useStudyStore } from '../../stores/studyStore';
import type { Study, CreateStudyDTO } from '../../../shared/types/study.types';

interface StudyFormProps {
  studyId?: number;
  onSaved?: () => void;
  onCancel?: () => void;
}

const StudyForm: React.FC<StudyFormProps> = ({ studyId, onSaved, onCancel }) => {
  const [form] = Form.useForm();
  const { selectedStudy, fetchStudy, createStudy, updateStudy } = useStudyStore();

  useEffect(() => {
    if (studyId) fetchStudy(studyId);
  }, [studyId]);

  useEffect(() => {
    if (selectedStudy && studyId) {
      form.setFieldsValue({
        studyId: selectedStudy.studyId,
        protocolNumber: selectedStudy.protocolNumber,
        studyTitle: selectedStudy.studyTitle,
        sponsorName: selectedStudy.sponsorName,
        phase: selectedStudy.phase,
        studyDesign: selectedStudy.studyDesign,
        therapeuticArea: selectedStudy.therapeuticArea,
        indication: selectedStudy.indication,
        targetEnrollment: selectedStudy.targetEnrollment,
        isBlinded: selectedStudy.isBlinded,
        status: selectedStudy.status
      });
    }
  }, [selectedStudy]);

  const handleSubmit = async (values: any) => {
    const result = studyId
      ? await updateStudy(studyId, values)
      : await createStudy(values as CreateStudyDTO);
    if (result.success) { message.success(studyId ? 'Study updated' : 'Study created'); onSaved?.(); }
    else message.error(result.error || 'Failed to save study');
  };

  return (
    <Card title={studyId ? 'Edit Study' : 'New Study'}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="studyId" label="Study ID" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="protocolNumber" label="Protocol Number" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="studyTitle" label="Study Title" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="sponsorName" label="Sponsor"><Input /></Form.Item>
        <Form.Item name="phase" label="Phase">
          <Select options={[{ value: '1', label: 'Phase 1' }, { value: '1/2', label: 'Phase 1/2' }, { value: '2', label: 'Phase 2' }, { value: '2/3', label: 'Phase 2/3' }, { value: '3', label: 'Phase 3' }, { value: '3b', label: 'Phase 3b' }, { value: '4', label: 'Phase 4' }]} />
        </Form.Item>
        <Form.Item name="studyDesign" label="Study Design">
          <Select options={[{ value: 'randomized', label: 'Randomized' }, { value: 'open_label', label: 'Open Label' }, { value: 'double_blind', label: 'Double Blind' }, { value: 'single_blind', label: 'Single Blind' }]} />
        </Form.Item>
        <Form.Item name="therapeuticArea" label="Therapeutic Area"><Input /></Form.Item>
        <Form.Item name="indication" label="Indication"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="targetEnrollment" label="Target Enrollment"><InputNumber min={0} /></Form.Item>
        <Form.Item name="isBlinded" label="Blinded Study" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item name="status" label="Status">
          <Select options={[{ value: 'planned', label: 'Planned' }, { value: 'enrolling', label: 'Enrolling' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'terminated', label: 'Terminated' }]} />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">Save Study</Button>
          {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        </Space>
      </Form>
    </Card>
  );
};

export default StudyForm;
