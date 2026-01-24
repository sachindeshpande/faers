/**
 * Narrative Section Component
 *
 * Implements B.5 Narrative fields from E2B(R3):
 * - Case Narrative
 * - Reporter Comments
 * - Sender Comments
 * - Sender Diagnosis
 */

import React from 'react';
import { Form, Input, Card, Row, Col, Divider, Typography } from 'antd';
import type { Case } from '../../../shared/types/case.types';

const { TextArea } = Input;
const { Text } = Typography;

interface NarrativeSectionProps {
  caseData: Case;
  onChange: (field: string, value: unknown) => void;
  disabled?: boolean;
}

const NarrativeSection: React.FC<NarrativeSectionProps> = ({
  caseData,
  onChange,
  disabled = false
}) => {
  // Calculate character counts
  const narrativeCount = caseData.caseNarrative?.length || 0;
  const maxNarrativeChars = 20000;

  return (
    <div className="form-section">
      <Card title="Narrative Summary (B.5)" className="form-card">
        <Form.Item
          label={
            <span>
              Case Narrative{' '}
              <Text type="secondary">
                ({narrativeCount}/{maxNarrativeChars} characters)
              </Text>
            </span>
          }
        >
          <TextArea
            value={caseData.caseNarrative || ''}
            onChange={(e) => onChange('caseNarrative', e.target.value)}
            rows={12}
            maxLength={maxNarrativeChars}
            placeholder="Provide a comprehensive narrative summary of the case including:
- Description of the adverse event(s)
- Relevant medical history
- Drug exposure details
- Timeline of events
- Any relevant test results
- Actions taken and outcome"
            disabled={disabled}
            showCount
          />
        </Form.Item>

        <Divider orientation="left">Additional Comments</Divider>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Reporter's Comments">
              <TextArea
                value={caseData.reporterComments || ''}
                onChange={(e) => onChange('reporterComments', e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Comments from the primary source/reporter"
                disabled={disabled}
                showCount
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Sender's Comments">
              <TextArea
                value={caseData.senderComments || ''}
                onChange={(e) => onChange('senderComments', e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Sender's analysis and assessment"
                disabled={disabled}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Diagnosis</Divider>

        <Form.Item label="Sender's Diagnosis">
          <TextArea
            value={caseData.senderDiagnosis || ''}
            onChange={(e) => onChange('senderDiagnosis', e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Sender's diagnosis or assessment of the case"
            disabled={disabled}
            showCount
          />
        </Form.Item>
      </Card>
    </div>
  );
};

export default NarrativeSection;
