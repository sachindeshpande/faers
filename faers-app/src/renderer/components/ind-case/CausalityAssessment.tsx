import React, { useEffect } from 'react';
import { Card, Form, Select, Input, DatePicker, Button, Space, Alert, Descriptions, Tag, message } from 'antd';
import { useINDCaseStore } from '../../stores/indCaseStore';
import type { CreateCausalityDTO, AssessorType, CausalityRelationship } from '../../../shared/types/indCase.types';

const { TextArea } = Input;

interface Props {
  caseId: string;
}

const relationshipOptions = [
  { value: 'related', label: 'Related' },
  { value: 'probably_related', label: 'Probably Related' },
  { value: 'possibly_related', label: 'Possibly Related' },
  { value: 'unlikely_related', label: 'Unlikely Related' },
  { value: 'not_related', label: 'Not Related' },
  { value: 'not_assessable', label: 'Not Assessable' }
];

const CausalityAssessmentPanel: React.FC<Props> = ({ caseId }) => {
  const [invForm] = Form.useForm();
  const [sponsorForm] = Form.useForm();
  const { causalityAssessments, dualCausality, fetchCausality, fetchDualCausality, saveCausality } = useINDCaseStore();

  useEffect(() => { fetchCausality(caseId); fetchDualCausality(caseId); }, [caseId]);

  useEffect(() => {
    const inv = causalityAssessments.find(a => a.assessorType === 'investigator');
    const sponsor = causalityAssessments.find(a => a.assessorType === 'sponsor');
    if (inv) invForm.setFieldsValue({ relationship: inv.relationship, assessorName: inv.assessorName, justification: inv.justification });
    if (sponsor) sponsorForm.setFieldsValue({ relationship: sponsor.relationship, assessorName: sponsor.assessorName, justification: sponsor.justification });
  }, [causalityAssessments]);

  const handleSave = async (assessorType: AssessorType, values: any) => {
    const data: CreateCausalityDTO = { caseId, assessorType, assessorName: values.assessorName, assessmentDate: new Date().toISOString().split('T')[0], relationship: values.relationship, justification: values.justification };
    const result = await saveCausality(data);
    if (result.success) message.success(`${assessorType} assessment saved`);
    else message.error(result.error);
  };

  return (
    <div>
      <Card title="Investigator Assessment" size="small" style={{ marginBottom: 16 }}>
        <Form form={invForm} layout="vertical" onFinish={(v) => handleSave('investigator', v)}>
          <Form.Item name="assessorName" label="Assessor Name"><Input placeholder="Investigator name" /></Form.Item>
          <Form.Item name="relationship" label="Relationship to Study Drug" rules={[{ required: true }]}>
            <Select options={relationshipOptions} placeholder="Select relationship" />
          </Form.Item>
          <Form.Item name="justification" label="Justification"><TextArea rows={3} /></Form.Item>
          <Button type="primary" htmlType="submit" size="small">Save Investigator Assessment</Button>
        </Form>
      </Card>

      <Card title="Sponsor Assessment" size="small" style={{ marginBottom: 16 }}>
        <Form form={sponsorForm} layout="vertical" onFinish={(v) => handleSave('sponsor', v)}>
          <Form.Item name="assessorName" label="Assessor Name"><Input placeholder="Sponsor medical monitor" /></Form.Item>
          <Form.Item name="relationship" label="Relationship to Study Drug" rules={[{ required: true }]}>
            <Select options={relationshipOptions} placeholder="Select relationship" />
          </Form.Item>
          <Form.Item name="justification" label="Justification"><TextArea rows={3} /></Form.Item>
          <Button type="primary" htmlType="submit" size="small">Save Sponsor Assessment</Button>
        </Form>
      </Card>

      {dualCausality?.assessmentsDiffer && (
        <Alert type="warning" message="Assessments Differ" description="Investigator and sponsor assessments differ. An explanation is required." showIcon style={{ marginBottom: 16 }} />
      )}
    </div>
  );
};

export default CausalityAssessmentPanel;
