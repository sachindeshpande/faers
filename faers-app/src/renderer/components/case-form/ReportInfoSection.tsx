/**
 * Report Information Section Component
 *
 * Implements A.1 Report Information fields from E2B(R3):
 * - Safety Report ID
 * - Report Type
 * - Initial/Follow-up
 * - Receipt/Receive Dates
 * - Expedited Report flag
 * - Product (Phase 4: for PSR linking)
 */

import React from 'react';
import { Form, Input, Select, DatePicker, Switch, Card, Row, Col, Divider, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Case } from '../../../shared/types/case.types';
import { ProductSelector } from '../products';

const { Option } = Select;
const { Text } = Typography;

interface ReportInfoSectionProps {
  caseData: Case;
  onChange: (field: string, value: unknown) => void;
  disabled?: boolean;
}

const ReportInfoSection: React.FC<ReportInfoSectionProps> = ({
  caseData,
  onChange,
  disabled = false
}) => {
  return (
    <div className="form-section">
      <Card title="Report Information (A.1)" className="form-card">
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Safety Report ID" required>
              <Input
                value={caseData.safetyReportId || ''}
                onChange={(e) => onChange('safetyReportId', e.target.value)}
                placeholder="Auto-generated if left blank"
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Worldwide Case ID">
              <Input
                value={caseData.worldwideCaseId || ''}
                onChange={(e) => onChange('worldwideCaseId', e.target.value)}
                placeholder="Enter worldwide unique case ID"
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Report Type" required>
              <Select
                value={caseData.reportType}
                onChange={(value) => onChange('reportType', value)}
                placeholder="Select report type"
                disabled={disabled}
              >
                <Option value={1}>Spontaneous</Option>
                <Option value={2}>Report from study</Option>
                <Option value={3}>Other</Option>
                <Option value={4}>Not available to sender</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Initial or Follow-up" required>
              <Select
                value={caseData.initialOrFollowup}
                onChange={(value) => onChange('initialOrFollowup', value)}
                placeholder="Select type"
                disabled={disabled}
              >
                <Option value={1}>Initial</Option>
                <Option value={2}>Follow-up</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Expedited Report">
              <Switch
                checked={caseData.expeditedReport || false}
                onChange={(checked) => onChange('expeditedReport', checked)}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Dates</Divider>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Date Report First Received">
              <DatePicker
                value={caseData.receiptDate ? dayjs(caseData.receiptDate) : null}
                onChange={(date) => onChange('receiptDate', date?.format('YYYY-MM-DD'))}
                style={{ width: '100%' }}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Date Report Most Recently Received">
              <DatePicker
                value={caseData.receiveDate ? dayjs(caseData.receiveDate) : null}
                onChange={(date) => onChange('receiveDate', date?.format('YYYY-MM-DD'))}
                style={{ width: '100%' }}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Additional Documents</Divider>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Additional Documents Available">
              <Switch
                checked={caseData.additionalDocs || false}
                onChange={(checked) => onChange('additionalDocs', checked)}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Product Information (Phase 4)</Divider>

        <Row gutter={24}>
          <Col span={24}>
            <Form.Item
              label="Product"
              tooltip="Select the product for PSR (Periodic Safety Report) aggregation"
            >
              <ProductSelector
                value={caseData.productId}
                onChange={(productId) => onChange('productId', productId)}
                disabled={disabled}
                placeholder="Search and select a product..."
              />
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Linking a case to a product enables it to be included in Periodic Safety Reports (PSR) for that product.
            </Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ReportInfoSection;
