/**
 * Import Execution Step Component
 * Shows import progress and results
 */

import React from 'react';
import {
  Card,
  Typography,
  Progress,
  Space,
  Spin,
  Alert,
  Collapse,
  Table,
  Statistic,
  Row,
  Col,
  Tag
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useImportStore } from '../../stores/importStore';

const { Text, Title } = Typography;

export const ImportExecutionStep: React.FC = () => {
  const {
    executionResult,
    isExecuting,
    currentJob
  } = useImportStore();

  if (isExecuting) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
        />
        <div style={{ marginTop: 24 }}>
          <Title level={4}>Importing Cases...</Title>
          <Text type="secondary">
            Please wait while the import is being processed.
          </Text>
          <Progress
            status="active"
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068'
            }}
            style={{ marginTop: 24, maxWidth: 400, margin: '24px auto' }}
          />
        </div>
      </div>
    );
  }

  if (!executionResult) {
    return (
      <Alert
        type="info"
        message="Import not started"
        description="Click 'Start Import' to begin importing cases."
      />
    );
  }

  const {
    totalRows,
    successCount,
    failureCount,
    createdCaseIds,
    errors
  } = executionResult;

  const successRate = totalRows > 0 ? Math.round((successCount / totalRows) * 100) : 0;

  const errorColumns = [
    {
      title: 'Row',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 80,
      render: (row: number) => <Text strong>#{row}</Text>
    },
    {
      title: 'Error',
      dataIndex: 'error',
      key: 'error',
      render: (error: string) => (
        <Text type="danger">
          <CloseCircleOutlined /> {error}
        </Text>
      )
    }
  ];

  return (
    <div>
      {/* Summary */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col>
            <Progress
              type="circle"
              percent={successRate}
              strokeColor={failureCount === 0 ? '#52c41a' : successRate >= 80 ? '#faad14' : '#ff4d4f'}
              width={100}
              format={() => (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold' }}>{successCount}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>imported</div>
                </div>
              )}
            />
          </Col>
          <Col flex={1}>
            <Title level={4} style={{ margin: 0 }}>
              {failureCount === 0 ? (
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  Import Completed Successfully
                </Space>
              ) : (
                <Space>
                  <SyncOutlined style={{ color: '#faad14' }} />
                  Import Completed with Issues
                </Space>
              )}
            </Title>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {successCount} of {totalRows} cases were imported successfully.
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Total Processed"
              value={totalRows}
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Successfully Imported"
              value={successCount}
              valueStyle={{ color: '#52c41a', fontSize: 24 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Failed"
              value={failureCount}
              valueStyle={{ color: failureCount > 0 ? '#ff4d4f' : '#52c41a', fontSize: 24 }}
              prefix={failureCount > 0 ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Created Case IDs */}
      {createdCaseIds && createdCaseIds.length > 0 && (
        <Collapse
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'cases',
              label: (
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text>{createdCaseIds.length} Cases Created</Text>
                </Space>
              ),
              children: (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {createdCaseIds.slice(0, 50).map((caseId, idx) => (
                    <Tag key={idx} color="green">
                      {caseId}
                    </Tag>
                  ))}
                  {createdCaseIds.length > 50 && (
                    <Text type="secondary">
                      +{createdCaseIds.length - 50} more
                    </Text>
                  )}
                </div>
              )
            }
          ]}
        />
      )}

      {/* Errors */}
      {errors && errors.length > 0 && (
        <div>
          <Title level={5}>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Import Errors
          </Title>
          <Table
            dataSource={errors.slice(0, 50)}
            columns={errorColumns}
            rowKey="rowNumber"
            pagination={false}
            size="small"
            scroll={{ y: 200 }}
          />
          {errors.length > 50 && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Showing first 50 of {errors.length} errors
            </Text>
          )}
        </div>
      )}

      {/* Success message */}
      {failureCount === 0 && (
        <Alert
          type="success"
          message="All cases imported successfully"
          description={`${successCount} new cases have been created and are now available in the case list.`}
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};
