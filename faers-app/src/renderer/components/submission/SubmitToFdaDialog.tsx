/**
 * Submit to FDA Dialog (Phase 2B)
 *
 * Confirmation dialog shown before API submission to FDA.
 * Supports Demo mode with scenario and speed selection.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Descriptions, Alert, Checkbox, Spin, Tag, Select, Space, Typography, Divider, message } from 'antd';
import { ExclamationCircleOutlined, CheckCircleOutlined, ExperimentOutlined } from '@ant-design/icons';
import type { PreSubmissionSummary, DemoScenario, DemoSpeed } from '../../../shared/types/esgApi.types';
import { DEMO_SCENARIO_LABELS, DEMO_SPEED_LABELS } from '../../../shared/types/esgApi.types';
import { useEsgApiStore } from '../../stores/esgApiStore';

const { Text } = Typography;

const scenarioOptions = Object.entries(DEMO_SCENARIO_LABELS).map(([value, label]) => ({
  value,
  label
}));

const speedOptions = Object.entries(DEMO_SPEED_LABELS).map(([value, label]) => ({
  value,
  label
}));

const SubmitToFdaDialog: React.FC = () => {
  const {
    showSubmitDialog: visible,
    submitDialogCaseId: caseId,
    closeSubmitDialog,
    submitToFda,
    openProgressDialog
  } = useEsgApiStore();
  const [summary, setSummary] = useState<PreSubmissionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [demoScenario, setDemoScenario] = useState<DemoScenario>('happy_path');
  const [demoSpeed, setDemoSpeed] = useState<DemoSpeed>('realtime');

  useEffect(() => {
    if (visible && caseId) {
      loadSummary(caseId);
      setConfirmed(false);
      setDemoScenario('happy_path');
      setDemoSpeed('realtime');
    }
  }, [visible, caseId]);

  const handleSubmit = async () => {
    console.log('[SubmitToFdaDialog] handleSubmit called, caseId:', caseId);
    if (!caseId) {
      console.log('[SubmitToFdaDialog] No caseId, returning');
      return;
    }

    console.log('[SubmitToFdaDialog] Closing dialog and opening progress...');
    closeSubmitDialog();
    openProgressDialog();

    try {
      console.log('[SubmitToFdaDialog] Calling submitToFda...');
      const result = await submitToFda(caseId);
      console.log('[SubmitToFdaDialog] submitToFda result:', JSON.stringify(result));
      if (result?.success) {
        message.success('Case submitted successfully');
      } else {
        message.error(result?.error || 'Submission failed');
      }
    } catch (error) {
      console.error('[SubmitToFdaDialog] Submission error:', error);
      message.error('Failed to submit case to FDA');
    }
  };

  const loadSummary = async (id: string) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.esgGetPreSubmissionSummary(id);
      if (result.success && result.data) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Failed to load pre-submission summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDemoMode = summary?.isDemoMode;

  return (
    <Modal
      title={
        <Space>
          {isDemoMode && <ExperimentOutlined style={{ color: '#553C9A' }} />}
          {isDemoMode ? 'Demo Submission' : 'Submit Case to FDA'}
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={closeSubmitDialog}
      okText={isDemoMode ? 'Start Demo Submission' : 'Submit to FDA'}
      okButtonProps={{
        disabled: !confirmed,
        danger: summary?.environment === 'Production',
        style: isDemoMode ? { backgroundColor: '#553C9A', borderColor: '#553C9A' } : undefined
      }}
      width={550}
      destroyOnClose
    >
      {loading ? (
        <Spin tip="Loading case summary..." style={{ display: 'block', margin: '40px auto' }} />
      ) : summary ? (
        <>
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Case ID">{summary.caseId}</Descriptions.Item>
            {summary.safetyReportId && (
              <Descriptions.Item label="Safety Report ID">{summary.safetyReportId}</Descriptions.Item>
            )}
            {summary.patientInitials && (
              <Descriptions.Item label="Patient">{summary.patientInitials}</Descriptions.Item>
            )}
            {summary.primaryDrug && (
              <Descriptions.Item label="Primary Drug">{summary.primaryDrug}</Descriptions.Item>
            )}
            {summary.primaryReaction && (
              <Descriptions.Item label="Primary Reaction">{summary.primaryReaction}</Descriptions.Item>
            )}
            <Descriptions.Item label="Environment">
              <Tag color={isDemoMode ? 'purple' : summary.isTestMode ? 'blue' : 'red'}>
                {isDemoMode && <ExperimentOutlined style={{ marginRight: 4 }} />}
                {summary.environment}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Validation">
              {summary.validationPassed ? (
                <span><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} /> Passed</span>
              ) : (
                <span><ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 4 }} /> {summary.warningCount} warning(s)</span>
              )}
            </Descriptions.Item>
          </Descriptions>

          {isDemoMode ? (
            <>
              <Alert
                type="info"
                showIcon
                icon={<ExperimentOutlined />}
                message="Demo Mode Submission"
                description="This is a simulated submission. No data will be sent to FDA. Use this for testing and demonstrations."
                style={{ marginBottom: 16, backgroundColor: '#f3e8ff', borderColor: '#a855f7' }}
              />

              <Divider orientation="left" style={{ marginTop: 8, marginBottom: 16 }}>
                <Text type="secondary">Demo Options</Text>
              </Divider>

              <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
                <div>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>Scenario:</Text>
                  <Select
                    value={demoScenario}
                    onChange={setDemoScenario}
                    options={scenarioOptions}
                    style={{ width: '100%' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    Select a scenario to simulate different outcomes
                  </Text>
                </div>

                <div>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>Speed:</Text>
                  <Select
                    value={demoSpeed}
                    onChange={setDemoSpeed}
                    options={speedOptions}
                    style={{ width: '100%' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    Adjust simulation speed for demonstrations
                  </Text>
                </div>
              </Space>
            </>
          ) : summary.environment === 'Production' ? (
            <Alert
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              message="PRODUCTION SUBMISSION"
              description="This will submit the case to the live FDA FAERS system. This action cannot be undone."
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message="Test Submission"
              description="This will submit to the FDA test environment for validation purposes."
              style={{ marginBottom: 16 }}
            />
          )}

          <Checkbox
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          >
            {isDemoMode
              ? 'I understand this is a demo submission'
              : 'I confirm this case is ready for submission to FDA'
            }
          </Checkbox>
        </>
      ) : (
        <Alert type="error" message="Failed to load case summary" />
      )}
    </Modal>
  );
};

export default SubmitToFdaDialog;
