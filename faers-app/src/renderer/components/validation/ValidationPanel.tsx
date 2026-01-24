/**
 * Validation Results Panel Component
 *
 * Displays validation results with errors, warnings, and info messages.
 * Allows clicking on items to navigate to the relevant field.
 */

import React from 'react';
import { Alert, List, Typography, Badge, Space, Button, Empty } from 'antd';
import {
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { ValidationError, ValidationResult } from '../../../shared/types/case.types';

const { Text } = Typography;

interface ValidationPanelProps {
  result: ValidationResult | null;
  onClose: () => void;
  onNavigateToField?: (field: string) => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  result,
  onClose,
  onNavigateToField
}) => {
  if (!result) {
    return null;
  }

  const errors = result.errors.filter(e => e.severity === 'error');
  const warnings = result.errors.filter(e => e.severity === 'warning');
  const infos = result.errors.filter(e => e.severity === 'info');

  const getIcon = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return null;
    }
  };

  const getSectionFromField = (field: string): string => {
    if (field.startsWith('report') || field === 'receiptDate' || field === 'receiveDate' ||
        field === 'initialOrFollowup' || field === 'nullification') {
      return 'Report Information';
    }
    if (field.startsWith('reporter') || field === 'reporters') {
      return 'Reporter';
    }
    if (field.startsWith('sender')) {
      return 'Sender';
    }
    if (field.startsWith('patient') || field === 'deathDate' || field === 'patientDeath') {
      return 'Patient';
    }
    if (field.startsWith('reaction') || field === 'reactions') {
      return 'Reactions';
    }
    if (field.startsWith('drug') || field === 'drugs') {
      return 'Drugs';
    }
    if (field.startsWith('narrative') || field === 'caseNarrative') {
      return 'Narrative';
    }
    return 'General';
  };

  const handleItemClick = (field: string) => {
    if (onNavigateToField) {
      onNavigateToField(field);
    }
  };

  const renderValidationItem = (item: ValidationError) => (
    <List.Item
      style={{ cursor: onNavigateToField ? 'pointer' : 'default', padding: '8px 12px' }}
      onClick={() => handleItemClick(item.field)}
    >
      <Space>
        {getIcon(item.severity)}
        <div>
          <Text strong style={{ fontSize: 12 }}>{getSectionFromField(item.field)}</Text>
          <br />
          <Text style={{ fontSize: 13 }}>{item.message}</Text>
        </div>
      </Space>
    </List.Item>
  );

  return (
    <div className="validation-panel">
      <div className="validation-panel-header">
        <Space>
          {result.valid ? (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
          )}
          <Text strong>
            {result.valid ? 'Validation Passed' : 'Validation Issues Found'}
          </Text>
        </Space>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          size="small"
        />
      </div>

      <div className="validation-panel-summary">
        <Space size="large">
          <Badge count={errors.length} showZero color="#ff4d4f">
            <Text type="secondary">Errors</Text>
          </Badge>
          <Badge count={warnings.length} showZero color="#faad14">
            <Text type="secondary">Warnings</Text>
          </Badge>
          <Badge count={infos.length} showZero color="#1890ff">
            <Text type="secondary">Info</Text>
          </Badge>
        </Space>
      </div>

      <div className="validation-panel-content">
        {result.errors.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No validation issues found"
          />
        ) : (
          <>
            {errors.length > 0 && (
              <div className="validation-section">
                <Alert
                  message={`${errors.length} Error${errors.length > 1 ? 's' : ''} - Must fix before export`}
                  type="error"
                  showIcon
                  style={{ marginBottom: 8 }}
                />
                <List
                  size="small"
                  dataSource={errors}
                  renderItem={renderValidationItem}
                  style={{ background: '#fff2f0', borderRadius: 4 }}
                />
              </div>
            )}

            {warnings.length > 0 && (
              <div className="validation-section">
                <Alert
                  message={`${warnings.length} Warning${warnings.length > 1 ? 's' : ''} - Should review`}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 8 }}
                />
                <List
                  size="small"
                  dataSource={warnings}
                  renderItem={renderValidationItem}
                  style={{ background: '#fffbe6', borderRadius: 4 }}
                />
              </div>
            )}

            {infos.length > 0 && (
              <div className="validation-section">
                <Alert
                  message={`${infos.length} Suggestion${infos.length > 1 ? 's' : ''}`}
                  type="info"
                  showIcon
                  style={{ marginBottom: 8 }}
                />
                <List
                  size="small"
                  dataSource={infos}
                  renderItem={renderValidationItem}
                  style={{ background: '#e6f7ff', borderRadius: 4 }}
                />
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .validation-panel {
          border: 1px solid #d9d9d9;
          border-radius: 8px;
          background: #fff;
          margin: 16px;
          max-height: 400px;
          display: flex;
          flex-direction: column;
        }
        .validation-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        .validation-panel-summary {
          padding: 12px 16px;
          background: #fafafa;
          border-bottom: 1px solid #f0f0f0;
        }
        .validation-panel-content {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
        }
        .validation-section {
          margin-bottom: 16px;
        }
        .validation-section:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default ValidationPanel;
