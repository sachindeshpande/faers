/**
 * Submission Progress Dialog (Phase 2B)
 *
 * Shows real-time progress of API submission to FDA.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Steps, Typography, Alert, Button, Space, Result, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import type { ApiSubmissionProgress } from '../../../shared/types/esgApi.types';
import { useEsgApiStore } from '../../stores/esgApiStore';

const { Text, Paragraph } = Typography;

const STEP_KEYS = ['authenticating', 'creating_submission', 'uploading_xml', 'finalizing'] as const;
const STEP_TITLES = ['Authenticating', 'Creating Submission', 'Uploading XML', 'Finalizing'];

const SubmissionProgressDialog: React.FC = () => {
  const {
    showProgressDialog: visible,
    submitDialogCaseId: caseId,
    closeProgressDialog,
    retrySubmission
  } = useEsgApiStore();
  const [progress, setProgress] = useState<ApiSubmissionProgress | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (visible && caseId) {
      setElapsedSeconds(0);
      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

      // Listen for progress updates
      cleanupRef.current = window.electronAPI.onEsgSubmissionProgress((p: ApiSubmissionProgress) => {
        if (p.caseId === caseId) {
          setProgress(p);
          if (p.currentStep === 'complete' || p.currentStep === 'failed') {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }
        }
      });
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [visible, caseId]);

  const isComplete = progress?.currentStep === 'complete';
  const isFailed = progress?.currentStep === 'failed';
  const isDone = isComplete || isFailed;

  const getCurrentStepIndex = (): number => {
    if (!progress) return 0;
    if (isComplete) return STEP_KEYS.length;
    const idx = STEP_KEYS.indexOf(progress.currentStep as typeof STEP_KEYS[number]);
    return idx >= 0 ? idx : 0;
  };

  const getStepStatus = (index: number): 'finish' | 'process' | 'wait' | 'error' => {
    const current = getCurrentStepIndex();
    if (isFailed && index === current) return 'error';
    if (index < current) return 'finish';
    if (index === current && !isDone) return 'process';
    if (isComplete) return 'finish';
    return 'wait';
  };

  const formatElapsed = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      title="Submitting to FDA ESG"
      open={visible}
      closable={isDone}
      maskClosable={false}
      keyboard={false}
      footer={isDone ? (
        <Space>
          {isFailed && caseId && (
            <Button onClick={async () => {
              try {
                const result = await retrySubmission(caseId);
                if (result?.success) {
                  message.success('Retry succeeded');
                } else {
                  message.error(result?.error || 'Retry failed');
                }
              } catch (error) {
                message.error('Failed to retry submission');
              }
            }}>Retry</Button>
          )}
          <Button type="primary" onClick={closeProgressDialog}>Close</Button>
        </Space>
      ) : null}
      width={520}
      destroyOnClose
    >
      <Steps
        direction="vertical"
        size="small"
        current={getCurrentStepIndex()}
        style={{ marginBottom: 24 }}
        items={STEP_TITLES.map((title, index) => ({
          title,
          status: getStepStatus(index),
          icon: getStepStatus(index) === 'process' ? <LoadingOutlined /> : undefined
        }))}
      />

      {!isDone && (
        <Text type="secondary">Elapsed: {formatElapsed(elapsedSeconds)}</Text>
      )}

      {isComplete && progress && (
        <Result
          status="success"
          title="Submission Successful"
          subTitle={
            <>
              <Paragraph>
                ESG Core ID: <Text strong copyable>{progress.esgSubmissionId || 'N/A'}</Text>
              </Paragraph>
              <Paragraph type="secondary">
                The system will automatically check for FDA acknowledgment.
              </Paragraph>
            </>
          }
          style={{ padding: '16px 0' }}
        />
      )}

      {isFailed && progress && (
        <Alert
          type="error"
          showIcon
          message="Submission Failed"
          description={
            <>
              <Paragraph>{progress.error || 'An unknown error occurred'}</Paragraph>
              {progress.errorCategory && (
                <Text type="secondary">Error category: {progress.errorCategory}</Text>
              )}
            </>
          }
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};

export default SubmissionProgressDialog;
