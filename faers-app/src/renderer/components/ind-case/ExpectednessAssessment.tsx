import React from 'react';
import { Card, Descriptions, Tag, Alert, Radio, Input, Form, Button, Space, message } from 'antd';
import { useINDCaseStore } from '../../stores/indCaseStore';

const { TextArea } = Input;

interface Props {
  caseId: string;
  onUpdate: (data: { isExpected?: boolean; expectednessJustification?: string }) => void;
}

const ExpectednessAssessment: React.FC<Props> = ({ caseId, onUpdate }) => {
  const { expectednessData, assessExpectedness } = useINDCaseStore();

  const handleLookup = async (meddraPtCode: number, severity?: string) => {
    await assessExpectedness(caseId, meddraPtCode, severity);
  };

  return (
    <Card title="Expectedness Assessment" size="small">
      {expectednessData ? (
        <div>
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Reaction">{expectednessData.reactionTerm}</Descriptions.Item>
            <Descriptions.Item label="Listed in IB">{expectednessData.isListed ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>}</Descriptions.Item>
            {expectednessData.isListed && <>
              <Descriptions.Item label="IB Version">{expectednessData.ibVersion}</Descriptions.Item>
              <Descriptions.Item label="IB Section">{expectednessData.ibSection || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Documented Severity">{expectednessData.documentedSeverity || 'N/A'}</Descriptions.Item>
              {expectednessData.severityExceeds && <Descriptions.Item label="Severity"><Tag color="red">Exceeds IB documentation</Tag></Descriptions.Item>}
            </>}
          </Descriptions>

          <div style={{ marginTop: 16 }}>
            <strong>Determination: </strong>
            <Tag color={expectednessData.determination === 'unexpected' ? 'red' : 'green'}>
              {expectednessData.determination === 'unexpected' ? 'UNEXPECTED' : 'Expected'}
            </Tag>
          </div>

          <div style={{ marginTop: 8 }}>
            <Radio.Group value={expectednessData.determination === 'expected'} onChange={(e) => onUpdate({ isExpected: e.target.value })}>
              <Radio value={true}>Expected</Radio>
              <Radio value={false}>Unexpected</Radio>
            </Radio.Group>
          </div>

          <div style={{ marginTop: 8 }}>
            <label>Justification:</label>
            <TextArea rows={2} defaultValue={expectednessData.justification} onBlur={(e) => onUpdate({ expectednessJustification: e.target.value })} />
          </div>
        </div>
      ) : (
        <Alert type="info" message="Select a reaction and click 'Assess Expectedness' to look up against the Investigator Brochure." />
      )}
    </Card>
  );
};

export default ExpectednessAssessment;
