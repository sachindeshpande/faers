/**
 * Patient Information Section Component
 *
 * Implements B.1 Patient Information fields from E2B(R3):
 * - Patient Initials
 * - Age information
 * - Weight/Height
 * - Sex
 * - Death information
 */

import React from 'react';
import { Form, Input, Select, DatePicker, InputNumber, Switch, Card, Row, Col, Divider } from 'antd';
import dayjs from 'dayjs';
import type { Case } from '../../../shared/types/case.types';

const { Option } = Select;

interface PatientSectionProps {
  caseData: Case;
  onChange: (field: string, value: unknown) => void;
  disabled?: boolean;
}

const PatientSection: React.FC<PatientSectionProps> = ({
  caseData,
  onChange,
  disabled = false
}) => {
  return (
    <div className="form-section">
      <Card title="Patient Information (B.1)" className="form-card">
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Patient Initials">
              <Input
                value={caseData.patientInitials || ''}
                onChange={(e) => onChange('patientInitials', e.target.value.toUpperCase())}
                placeholder="e.g., JDS"
                maxLength={10}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Date of Birth">
              <DatePicker
                value={caseData.patientBirthdate ? dayjs(caseData.patientBirthdate) : null}
                onChange={(date) => onChange('patientBirthdate', date?.format('YYYY-MM-DD'))}
                style={{ width: '100%' }}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Sex" required>
              <Select
                value={caseData.patientSex}
                onChange={(value) => onChange('patientSex', value)}
                placeholder="Select sex"
                disabled={disabled}
              >
                <Option value={1}>Male</Option>
                <Option value={2}>Female</Option>
                <Option value={0}>Unknown</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Age Information</Divider>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Age at Time of Onset">
              <InputNumber
                value={caseData.patientAge || undefined}
                onChange={(value) => onChange('patientAge', value)}
                min={0}
                max={150}
                style={{ width: '100%' }}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Age Unit">
              <Select
                value={caseData.patientAgeUnit || undefined}
                onChange={(value) => onChange('patientAgeUnit', value)}
                placeholder="Select unit"
                disabled={disabled}
              >
                <Option value="800">Decade</Option>
                <Option value="801">Year</Option>
                <Option value="802">Month</Option>
                <Option value="803">Week</Option>
                <Option value="804">Day</Option>
                <Option value="805">Hour</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Age Group">
              <Select
                value={caseData.patientAgeGroup || undefined}
                onChange={(value) => onChange('patientAgeGroup', value)}
                placeholder="Select age group"
                disabled={disabled}
              >
                <Option value={1}>Neonate (0-27 days)</Option>
                <Option value={2}>Infant (28 days - 23 months)</Option>
                <Option value={3}>Child (2-11 years)</Option>
                <Option value={4}>Adolescent (12-17 years)</Option>
                <Option value={5}>Adult (18-64 years)</Option>
                <Option value={6}>Elderly (65+ years)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Physical Characteristics</Divider>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Weight (kg)">
              <InputNumber
                value={caseData.patientWeight || undefined}
                onChange={(value) => onChange('patientWeight', value)}
                min={0}
                max={500}
                precision={1}
                style={{ width: '100%' }}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Height (cm)">
              <InputNumber
                value={caseData.patientHeight || undefined}
                onChange={(value) => onChange('patientHeight', value)}
                min={0}
                max={300}
                precision={0}
                style={{ width: '100%' }}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Last Menstrual Period">
              <DatePicker
                value={caseData.patientLmpDate ? dayjs(caseData.patientLmpDate) : null}
                onChange={(date) => onChange('patientLmpDate', date?.format('YYYY-MM-DD'))}
                style={{ width: '100%' }}
                disabled={disabled || caseData.patientSex !== 2}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Medical Records</Divider>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="GP Medical Record Number">
              <Input
                value={caseData.patientGpRecord || ''}
                onChange={(e) => onChange('patientGpRecord', e.target.value)}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Specialist Record Number">
              <Input
                value={caseData.patientSpecialistRecord || ''}
                onChange={(e) => onChange('patientSpecialistRecord', e.target.value)}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Hospital Record Number">
              <Input
                value={caseData.patientHospitalRecord || ''}
                onChange={(e) => onChange('patientHospitalRecord', e.target.value)}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Investigation Number">
              <Input
                value={caseData.patientInvestigation || ''}
                onChange={(e) => onChange('patientInvestigation', e.target.value)}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Death Information</Divider>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Patient Died">
              <Switch
                checked={caseData.patientDeath || false}
                onChange={(checked) => onChange('patientDeath', checked)}
                disabled={disabled}
              />
            </Form.Item>
          </Col>
          {caseData.patientDeath && (
            <>
              <Col span={8}>
                <Form.Item label="Date of Death">
                  <DatePicker
                    value={caseData.deathDate ? dayjs(caseData.deathDate) : null}
                    onChange={(date) => onChange('deathDate', date?.format('YYYY-MM-DD'))}
                    style={{ width: '100%' }}
                    disabled={disabled}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Autopsy Performed">
                  <Switch
                    checked={caseData.autopsyPerformed || false}
                    onChange={(checked) => onChange('autopsyPerformed', checked)}
                    disabled={disabled}
                  />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
      </Card>
    </div>
  );
};

export default PatientSection;
