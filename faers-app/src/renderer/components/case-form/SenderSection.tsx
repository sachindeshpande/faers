/**
 * Sender Section Component
 *
 * Implements A.3 Sender Information fields from E2B(R3):
 * - Sender type
 * - Organization details
 * - Contact information
 */

import React from 'react';
import { Form, Input, Select, Card, Row, Col, Divider } from 'antd';
import type { Case } from '../../../shared/types/case.types';

const { Option } = Select;

interface SenderSectionProps {
  caseData: Case;
  onChange: (field: string, value: unknown) => void;
  disabled?: boolean;
}

const SenderSection: React.FC<SenderSectionProps> = ({
  caseData,
  onChange,
  disabled = false
}) => {
  return (
    <div className="form-section">
      <Card title="Sender Information (A.3)" className="form-card">
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Sender Type" required>
              <Select
                value={caseData.senderType}
                onChange={(value) => onChange('senderType', value)}
                placeholder="Select sender type"
                disabled={disabled}
              >
                <Option value={1}>Pharmaceutical Company</Option>
                <Option value={2}>Regulatory Authority</Option>
                <Option value={3}>Health Professional</Option>
                <Option value={4}>Regional Pharmacovigilance Centre</Option>
                <Option value={5}>WHO Collaborating Centre</Option>
                <Option value={6}>Other</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Sender's Organization" required>
              <Input
                value={caseData.senderOrganization || ''}
                onChange={(e) => onChange('senderOrganization', e.target.value)}
                placeholder="Organization name"
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Department">
              <Input
                value={caseData.senderDepartment || ''}
                onChange={(e) => onChange('senderDepartment', e.target.value)}
                placeholder="Department name"
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Contact Person</Divider>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Given Name">
              <Input
                value={caseData.senderGivenName || ''}
                onChange={(e) => onChange('senderGivenName', e.target.value)}
                placeholder="First name"
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Family Name">
              <Input
                value={caseData.senderFamilyName || ''}
                onChange={(e) => onChange('senderFamilyName', e.target.value)}
                placeholder="Last name"
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Address</Divider>

        <Row gutter={24}>
          <Col span={24}>
            <Form.Item label="Street Address">
              <Input
                value={caseData.senderAddress || ''}
                onChange={(e) => onChange('senderAddress', e.target.value)}
                placeholder="Street address"
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="City">
              <Input
                value={caseData.senderCity || ''}
                onChange={(e) => onChange('senderCity', e.target.value)}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="State/Province">
              <Input
                value={caseData.senderState || ''}
                onChange={(e) => onChange('senderState', e.target.value)}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Postal Code">
              <Input
                value={caseData.senderPostcode || ''}
                onChange={(e) => onChange('senderPostcode', e.target.value)}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Country" required>
              <Input
                value={caseData.senderCountry || ''}
                onChange={(e) => onChange('senderCountry', e.target.value)}
                placeholder="ISO 3166-1 alpha-2 code (e.g., US)"
                maxLength={2}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Contact Details</Divider>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Phone">
              <Input
                value={caseData.senderPhone || ''}
                onChange={(e) => onChange('senderPhone', e.target.value)}
                placeholder="+1-555-555-5555"
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Fax">
              <Input
                value={caseData.senderFax || ''}
                onChange={(e) => onChange('senderFax', e.target.value)}
                placeholder="+1-555-555-5556"
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Email" required>
              <Input
                value={caseData.senderEmail || ''}
                onChange={(e) => onChange('senderEmail', e.target.value)}
                placeholder="sender@organization.com"
                type="email"
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SenderSection;
