import React, { useEffect, useState } from 'react';
import { Card, Select, Descriptions, Tag, Button, Radio, DatePicker, Input, Space } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useStudyStore } from '../../stores/studyStore';
import UnblindingDialog from './UnblindingDialog';
import type { Case } from '../../../shared/types/case.types';

interface Props {
  caseData: Case;
  onUpdate: (data: Partial<Case>) => void;
}

const INDCaseHeader: React.FC<Props> = ({ caseData, onUpdate }) => {
  const { studies, fetchStudies, selectedStudy, fetchStudy } = useStudyStore();
  const [showUnblind, setShowUnblind] = useState(false);

  useEffect(() => { fetchStudies(); }, []);
  useEffect(() => { if (caseData.studyId) fetchStudy(caseData.studyId); }, [caseData.studyId]);

  const primaryInd = selectedStudy?.inds?.find(i => i.isPrimary);

  return (
    <Card title="IND Safety Report" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <label>Study:</label>
          <Select style={{ width: '100%' }} value={caseData.studyId} onChange={(v) => onUpdate({ studyId: v })}
            placeholder="Select study" options={studies.map(s => ({ value: s.id, label: `${s.studyId}: ${s.studyTitle}` }))} />
        </div>

        {selectedStudy && (
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="IND Number">{primaryInd?.indNumber || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Center">{primaryInd?.center || 'N/A'}</Descriptions.Item>
          </Descriptions>
        )}

        {selectedStudy?.sites && (
          <div>
            <label>Site:</label>
            <Select style={{ width: '100%' }} value={caseData.siteId} onChange={(v) => onUpdate({ siteId: v })}
              placeholder="Select site" options={selectedStudy.sites.map(s => ({ value: s.id, label: `${s.siteNumber} - ${s.siteName}` }))} />
          </div>
        )}

        <div>
          <label>Subject Number:</label>
          <Input value={caseData.subjectNumber || ''} onChange={(e) => onUpdate({ subjectNumber: e.target.value })} placeholder="Subject/randomization ID" />
        </div>

        <Card size="small" title={<><LockOutlined /> Blinding Status</>}>
          <Radio.Group value={caseData.isBlinded ? 'yes' : 'no'} onChange={(e) => onUpdate({ isBlinded: e.target.value === 'yes' })}>
            <Radio value="yes">Blinded</Radio>
            <Radio value="no">Unblinded</Radio>
          </Radio.Group>
          {caseData.isBlinded && <div style={{ marginTop: 8 }}><Button size="small" danger onClick={() => setShowUnblind(true)}>Request Unblinding</Button></div>}
          {!caseData.isBlinded && caseData.treatmentArm && <div style={{ marginTop: 8 }}>Treatment Arm: <Tag>{caseData.treatmentArm}</Tag></div>}
        </Card>

        <div>
          <label>Date Informed of Event:</label>
          <Input type="date" value={caseData.dateInformed || ''} onChange={(e) => onUpdate({ dateInformed: e.target.value })} />
        </div>
      </Space>

      <UnblindingDialog caseId={caseData.id} visible={showUnblind} onClose={() => setShowUnblind(false)} />
    </Card>
  );
};

export default INDCaseHeader;
