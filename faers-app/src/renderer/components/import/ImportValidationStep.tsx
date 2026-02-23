/**
 * Import Validation Step Component
 * Displays validation results before import execution
 */

import React, { useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Progress,
  Table,
  Tag,
  Alert,
  Collapse,
  Spin,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useImportStore } from '../../stores/importStore';

const { Text, Title } = Typography;
const { Panel } = Collapse;

export const ImportValidationStep: React.FC = () => {
  const {
    validationResult,
    isValidating,
    currentJob,
    errors,
    loadErrors
  } = useImportStore();

  // Load errors if there are any
  useEffect(() => {
    if (currentJob && validationResult && validationResult.invalidRows > 0) {
      loadErrors(currentJob.id);
    }
  }, [currentJob, validationResult, loadErrors]);

  if (isValidating) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>Validating import data...</Text>
        </div>
      </div>
    );
  }

  if (!validationResult) {
    return (
      <Alert
        type="warning"
        message="No validation results available"
        description="Please go back and complete the column mapping."
      />
    );
  }

  const { totalRows, validRows, invalidRows, warnings } = validationResult;
  const successRate = totalRows > 0 ? Math.round((validRows / totalRows) * 100) : 0;

  const getStatusColor = () => {
    if (invalidRows === 0) return '#52c41a';
    if (successRate >= 80) return '#faad14';
    return '#ff4d4f';
  };

  const errorColumns = [
    {
      title: 'Row',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 80,
      render: (row: number) => <Text strong>#{row}</Text>
    },
    {
      title: 'Errors',
      dataIndex: 'errors',
      key: 'errors',
      render: (errs: string[]) => (
        <Space direction="vertical" size={2}>
          {errs.map((err, idx) => (
            <Text key={idx} type="danger">
              <CloseCircleOutlined /> {err}
            </Text>
          ))}
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Rows"
              value={totalRows}
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Valid Rows"
              value={validRows}
              valueStyle={{ color: '#52c41a', fontSize: 24 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Invalid Rows"
              value={invalidRows}
              valueStyle={{ color: invalidRows > 0 ? '#ff4d4f' : '#52c41a', fontSize: 24 }}
              prefix={invalidRows > 0 ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Warnings"
              value={warnings.length}
              valueStyle={{ color: warnings.length > 0 ? '#faad14' : '#52c41a', fontSize: 24 }}
              prefix={warnings.length > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Progress indicator */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Progress
            type="circle"
            percent={successRate}
            strokeColor={getStatusColor()}
            width={80}
          />
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Validation {invalidRows === 0 ? 'Passed' : 'Complete'}
            </Title>
            <Text type="secondary">
              {validRows} of {totalRows} rows passed validation
            </Text>
            {invalidRows > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="warning">
                  <ExclamationCircleOutlined /> {invalidRows} rows will be skipped during import
                </Text>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Collapse
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'warnings',
              label: (
                <Space>
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <Text>{warnings.length} Warnings</Text>
                </Space>
              ),
              children: (
                <Space direction="vertical" size={4}>
                  {warnings.map((warning, idx) => (
                    <Text key={idx} type="warning">
                      <WarningOutlined /> {warning}
                    </Text>
                  ))}
                </Space>
              )
            }
          ]}
        />
      )}

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div>
          <Title level={5}>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Validation Errors
          </Title>
          <Table
            dataSource={errors.slice(0, 50)}
            columns={errorColumns}
            rowKey="rowNumber"
            pagination={false}
            size="small"
            scroll={{ y: 250 }}
          />
          {errors.length > 50 && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Showing first 50 of {errors.length} errors
            </Text>
          )}
        </div>
      )}

      {/* Ready to import message */}
      {validRows > 0 && (
        <Alert
          type={invalidRows === 0 ? 'success' : 'info'}
          message={
            invalidRows === 0
              ? 'All rows are valid and ready for import'
              : `${validRows} valid rows are ready for import`
          }
          description={
            invalidRows > 0
              ? `${invalidRows} invalid rows will be skipped. Click "Start Import" to proceed with valid rows.`
              : 'Click "Start Import" to begin the import process.'
          }
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      {validRows === 0 && (
        <Alert
          type="error"
          message="No valid rows to import"
          description="Please fix the validation errors and try again. You may need to go back and adjust your column mapping."
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};
