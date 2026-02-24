import React, { useEffect } from 'react';
import { Card, Descriptions, Tag, Alert, Space } from 'antd';
import { useINDCaseStore } from '../../stores/indCaseStore';

interface Props {
  caseId: string;
}

const SUSARClassification: React.FC<Props> = ({ caseId }) => {
  const { susarDetermination, fetchSUSAR } = useINDCaseStore();

  useEffect(() => { fetchSUSAR(caseId); }, [caseId]);

  if (!susarDetermination) return null;

  const { isSerious, isUnexpected, isSuspectedReaction, isSUSAR, isFatalOrLifeThreatening, reportType, dueDate, daysRemaining } = susarDetermination;

  return (
    <Card title="Report Classification" size="small">
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Serious">{isSerious ? <Tag color="red">Yes</Tag> : <Tag>No</Tag>}</Descriptions.Item>
        <Descriptions.Item label="Suspected Adverse Reaction">{isSuspectedReaction ? <Tag color="orange">Yes</Tag> : <Tag>No</Tag>}</Descriptions.Item>
        <Descriptions.Item label="Unexpected">{isUnexpected ? <Tag color="orange">Yes</Tag> : <Tag>No</Tag>}</Descriptions.Item>
      </Descriptions>

      {isSUSAR ? (
        <Alert type="error" message="SUSAR - Expedited Reporting Required" description={
          <Space direction="vertical">
            <span>This is a Suspected Unexpected Serious Adverse Reaction</span>
            <span>{isFatalOrLifeThreatening ? '7-Day Report Required (Fatal/Life-Threatening)' : '15-Day Report Required'}</span>
            <span>Due Date: {dueDate} ({daysRemaining > 0 ? `${daysRemaining} days remaining` : <Tag color="red">OVERDUE</Tag>})</span>
          </Space>
        } showIcon style={{ marginTop: 16 }} />
      ) : (
        <Alert type="info" message="Not a SUSAR" description="This case does not meet SUSAR criteria. Include in Annual Report." showIcon style={{ marginTop: 16 }} />
      )}

      <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
        <Descriptions.Item label="Report Type">
          <Tag color={reportType === '7_day' ? 'red' : reportType === '15_day' ? 'orange' : 'blue'}>
            {reportType === '7_day' ? '7-Day IND Safety Report' : reportType === '15_day' ? '15-Day IND Safety Report' : 'Annual Report Only'}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default SUSARClassification;
