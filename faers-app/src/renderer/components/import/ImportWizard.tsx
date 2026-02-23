/**
 * Import Wizard Component
 * Multi-step wizard for bulk import operations
 */

import React, { useEffect } from 'react';
import { Modal, Steps, Button, Space, Result, Alert } from 'antd';
import {
  UploadOutlined,
  TableOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useImportStore } from '../../stores/importStore';
import { ImportUploadStep } from './ImportUploadStep';
import { ColumnMapper } from './ColumnMapper';
import { ImportValidationStep } from './ImportValidationStep';
import { ImportExecutionStep } from './ImportExecutionStep';

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const stepItems = [
  {
    key: 'upload',
    title: 'Upload File',
    icon: <UploadOutlined />
  },
  {
    key: 'mapping',
    title: 'Map Columns',
    icon: <TableOutlined />
  },
  {
    key: 'validation',
    title: 'Validate',
    icon: <CheckCircleOutlined />
  },
  {
    key: 'execution',
    title: 'Import',
    icon: <PlayCircleOutlined />
  }
];

export const ImportWizard: React.FC<ImportWizardProps> = ({
  open,
  onClose,
  onComplete
}) => {
  const {
    wizardStep,
    setWizardStep,
    currentJob,
    uploadResponse,
    columnMapping,
    validationResult,
    executionResult,
    isUploading,
    isValidating,
    isExecuting,
    isLoading,
    error,
    resetWizard,
    setMapping,
    validateImport,
    executeImport,
    loadSavedMappings
  } = useImportStore();

  // Load saved mappings on mount
  useEffect(() => {
    if (open) {
      loadSavedMappings();
    }
  }, [open, loadSavedMappings]);

  const getCurrentStep = () => {
    switch (wizardStep) {
      case 'upload':
        return 0;
      case 'mapping':
        return 1;
      case 'validation':
        return 2;
      case 'execution':
      case 'complete':
        return 3;
      default:
        return 0;
    }
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const handleComplete = () => {
    resetWizard();
    onComplete?.();
    onClose();
  };

  const handleBack = () => {
    switch (wizardStep) {
      case 'mapping':
        setWizardStep('upload');
        break;
      case 'validation':
        setWizardStep('mapping');
        break;
      case 'execution':
        setWizardStep('validation');
        break;
    }
  };

  const handleNext = async () => {
    if (!currentJob) return;

    switch (wizardStep) {
      case 'mapping':
        // Save the mapping and move to validation
        const mappingSuccess = await setMapping(currentJob.id, columnMapping);
        if (mappingSuccess) {
          await validateImport(currentJob.id);
        }
        break;
      case 'validation':
        // Execute the import
        await executeImport(currentJob.id, {
          skipInvalid: true,
          updateDuplicates: false,
          dryRun: false
        });
        break;
    }
  };

  const canGoBack = () => {
    return wizardStep !== 'upload' && wizardStep !== 'complete' && !isExecuting;
  };

  const canGoNext = () => {
    switch (wizardStep) {
      case 'upload':
        return false; // Upload handles its own navigation
      case 'mapping':
        // At least one column must be mapped
        return columnMapping.some(m => m.targetField && m.targetField.length > 0);
      case 'validation':
        // Can proceed if validation passed or has valid rows
        return validationResult && validationResult.validRows > 0;
      case 'execution':
      case 'complete':
        return false;
      default:
        return false;
    }
  };

  const getNextButtonText = () => {
    switch (wizardStep) {
      case 'mapping':
        return 'Validate';
      case 'validation':
        return 'Start Import';
      default:
        return 'Next';
    }
  };

  const renderStepContent = () => {
    switch (wizardStep) {
      case 'upload':
        return <ImportUploadStep />;
      case 'mapping':
        return <ColumnMapper />;
      case 'validation':
        return <ImportValidationStep />;
      case 'execution':
        return <ImportExecutionStep />;
      case 'complete':
        return (
          <Result
            status={executionResult?.successCount ? 'success' : 'warning'}
            title={executionResult?.successCount ? 'Import Complete' : 'Import Completed with Issues'}
            subTitle={
              executionResult
                ? `Successfully imported ${executionResult.successCount} of ${executionResult.totalRows} rows.`
                : 'Import process completed.'
            }
            extra={[
              <Button key="close" type="primary" onClick={handleComplete}>
                Done
              </Button>
            ]}
          />
        );
      default:
        return null;
    }
  };

  const isProcessing = isUploading || isValidating || isExecuting || isLoading;

  return (
    <Modal
      title="Bulk Import Cases"
      open={open}
      onCancel={handleClose}
      width={900}
      footer={
        wizardStep === 'complete' ? null : (
          <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Space>
              {canGoBack() && (
                <Button onClick={handleBack} disabled={isProcessing}>
                  Back
                </Button>
              )}
              {canGoNext() && (
                <Button
                  type="primary"
                  onClick={handleNext}
                  loading={isValidating || isExecuting}
                  disabled={isProcessing}
                >
                  {getNextButtonText()}
                </Button>
              )}
            </Space>
          </Space>
        )
      }
      destroyOnClose
    >
      <Steps
        current={getCurrentStep()}
        items={stepItems}
        style={{ marginBottom: 24 }}
        size="small"
      />

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {renderStepContent()}
    </Modal>
  );
};
