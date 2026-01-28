/**
 * Report Classification Section
 * Phase 4: Seriousness criteria and expectedness assessment for report type classification
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Checkbox,
  Radio,
  Input,
  Space,
  Typography,
  Alert,
  Spin,
  Divider,
  Tag,
  Tooltip
} from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type {
  SeriousnessCriterion,
  CaseSeriousness,
  ClassificationSuggestion,
  Expectedness
} from '../../../shared/types/classification.types';
import {
  SERIOUSNESS_LABELS,
  ALL_SERIOUSNESS_CRITERIA,
  EXPECTEDNESS_LABELS,
  REPORT_TYPE_LABELS
} from '../../../shared/types/classification.types';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface ReportClassificationSectionProps {
  caseId: string;
  disabled?: boolean;
  onChange?: () => void;
}

export const ReportClassificationSection: React.FC<ReportClassificationSectionProps> = ({
  caseId,
  disabled = false,
  onChange
}) => {
  const [seriousness, setSeriousness] = useState<CaseSeriousness[]>([]);
  const [expectedness, setExpectedness] = useState<Expectedness>('unknown');
  const [expectednessJustification, setExpectednessJustification] = useState('');
  const [suggestion, setSuggestion] = useState<ClassificationSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load classification data
  const loadClassification = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setError(null);

    try {
      // Load seriousness criteria
      const seriousnessResponse = await window.electronAPI.getSeriousness(caseId);
      if (seriousnessResponse.success && seriousnessResponse.data) {
        setSeriousness(seriousnessResponse.data);
      }

      // Load current classification
      const classificationResponse = await window.electronAPI.getReportTypeClassification(caseId);
      if (classificationResponse.success && classificationResponse.data) {
        if (classificationResponse.data.expectedness) {
          setExpectedness(classificationResponse.data.expectedness);
        }
        if (classificationResponse.data.expectednessJustification) {
          setExpectednessJustification(classificationResponse.data.expectednessJustification);
        }
      }

      // Get suggestion
      const suggestionResponse = await window.electronAPI.getReportTypeSuggestion(caseId);
      if (suggestionResponse.success && suggestionResponse.data) {
        setSuggestion(suggestionResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classification');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadClassification();
  }, [loadClassification]);

  // Handle seriousness change
  const handleSeriousnessChange = async (criterion: SeriousnessCriterion, checked: boolean) => {
    if (disabled) return;

    setSaving(true);
    try {
      const response = await window.electronAPI.setSeriousness(caseId, criterion, checked);
      if (response.success && response.data) {
        // Update local state
        setSeriousness((prev) => {
          const existing = prev.find((s) => s.criterion === criterion);
          if (existing) {
            return prev.map((s) => (s.criterion === criterion ? { ...s, isChecked: checked } : s));
          } else {
            return [...prev, { caseId, criterion, isChecked: checked }];
          }
        });

        // Refresh suggestion
        const suggestionResponse = await window.electronAPI.getReportTypeSuggestion(caseId);
        if (suggestionResponse.success && suggestionResponse.data) {
          setSuggestion(suggestionResponse.data);
        }

        onChange?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update seriousness');
    } finally {
      setSaving(false);
    }
  };

  // Handle expectedness change
  const handleExpectednessChange = async (value: Expectedness) => {
    if (disabled) return;

    setExpectedness(value);
    setSaving(true);

    try {
      await window.electronAPI.setExpectedness(caseId, value, expectednessJustification);

      // Refresh suggestion
      const suggestionResponse = await window.electronAPI.getReportTypeSuggestion(caseId);
      if (suggestionResponse.success && suggestionResponse.data) {
        setSuggestion(suggestionResponse.data);
      }

      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expectedness');
    } finally {
      setSaving(false);
    }
  };

  // Handle justification change (debounced save)
  const handleJustificationChange = (value: string) => {
    setExpectednessJustification(value);
  };

  const saveJustification = async () => {
    if (disabled) return;

    setSaving(true);
    try {
      await window.electronAPI.setExpectedness(caseId, expectedness, expectednessJustification);
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save justification');
    } finally {
      setSaving(false);
    }
  };

  // Check if a criterion is checked
  const isCriterionChecked = (criterion: SeriousnessCriterion): boolean => {
    const item = seriousness.find((s) => s.criterion === criterion);
    return item?.isChecked || false;
  };

  // Calculate if case is serious
  const isSerious = seriousness.some((s) => s.isChecked);

  // Get report type color and icon
  const getReportTypeDisplay = () => {
    if (!suggestion) return null;

    const { reportType } = suggestion;
    let color = 'default';
    let icon = <InfoCircleOutlined />;

    switch (reportType) {
      case 'expedited':
        color = 'error';
        icon = <ExclamationCircleOutlined />;
        break;
      case 'non_expedited':
        color = 'success';
        icon = <ClockCircleOutlined />;
        break;
      case 'followup':
        color = 'processing';
        icon = <InfoCircleOutlined />;
        break;
      case 'nullification':
        color = 'warning';
        icon = <ExclamationCircleOutlined />;
        break;
    }

    return (
      <Tag color={color} icon={icon} style={{ fontSize: 14, padding: '4px 12px' }}>
        {REPORT_TYPE_LABELS[reportType]}
      </Tag>
    );
  };

  if (loading) {
    return (
      <Card title="Report Classification" size="small">
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin tip="Loading classification..." />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Report Classification"
      size="small"
      extra={saving && <Spin size="small" />}
    >
      {error && (
        <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />
      )}

      {/* Seriousness Criteria */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginBottom: 12 }}>
          <Tooltip title="Check all criteria that apply to this adverse event">
            Seriousness Criteria
            <InfoCircleOutlined style={{ marginLeft: 8, fontSize: 14, color: '#999' }} />
          </Tooltip>
        </Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          {ALL_SERIOUSNESS_CRITERIA.map((criterion) => (
            <Checkbox
              key={criterion}
              checked={isCriterionChecked(criterion)}
              onChange={(e) => handleSeriousnessChange(criterion, e.target.checked)}
              disabled={disabled}
            >
              {SERIOUSNESS_LABELS[criterion]}
            </Checkbox>
          ))}
        </Space>
        <div style={{ marginTop: 12 }}>
          <Text type={isSerious ? 'danger' : 'secondary'} strong>
            {isSerious ? (
              <>
                <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                This case is classified as SERIOUS
              </>
            ) : (
              <>
                <CheckCircleOutlined style={{ marginRight: 8 }} />
                This case is classified as non-serious
              </>
            )}
          </Text>
        </div>
      </div>

      <Divider />

      {/* Expectedness */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginBottom: 12 }}>
          <Tooltip title="Determine if the adverse event is listed in the current product labeling">
            Expectedness
            <InfoCircleOutlined style={{ marginLeft: 8, fontSize: 14, color: '#999' }} />
          </Tooltip>
        </Title>
        <Radio.Group
          value={expectedness}
          onChange={(e) => handleExpectednessChange(e.target.value)}
          disabled={disabled}
        >
          <Space direction="vertical">
            {(Object.entries(EXPECTEDNESS_LABELS) as [Expectedness, string][]).map(([value, label]) => (
              <Radio key={value} value={value}>
                {label}
              </Radio>
            ))}
          </Space>
        </Radio.Group>

        {(expectedness === 'expected' || expectedness === 'unexpected') && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Justification (required for expectedness determination):
            </Text>
            <TextArea
              value={expectednessJustification}
              onChange={(e) => handleJustificationChange(e.target.value)}
              onBlur={saveJustification}
              placeholder="Enter labeling reference or medical justification..."
              rows={2}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <Divider />

      {/* Classification Suggestion */}
      <div>
        <Title level={5} style={{ marginBottom: 12 }}>Classification Result</Title>
        {suggestion ? (
          <div style={{ background: '#fafafa', padding: 16, borderRadius: 6 }}>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ marginRight: 12 }}>Report Type:</Text>
              {getReportTypeDisplay()}
            </div>
            <Alert
              message={suggestion.rationale}
              type={suggestion.reportType === 'expedited' ? 'warning' : 'info'}
              showIcon
            />
            {suggestion.reportType === 'expedited' && (
              <div style={{ marginTop: 12 }}>
                <Text type="danger">
                  <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                  Due date: 15 calendar days from awareness date
                </Text>
              </div>
            )}
            {suggestion.reportType === 'non_expedited' && (
              <div style={{ marginTop: 12 }}>
                <Text type="success">
                  <ClockCircleOutlined style={{ marginRight: 8 }} />
                  Case will be included in the next Periodic Safety Report (PSR)
                </Text>
              </div>
            )}
          </div>
        ) : (
          <Text type="secondary">Classification will be calculated based on seriousness and expectedness.</Text>
        )}
      </div>
    </Card>
  );
};

export default ReportClassificationSection;
