/**
 * PSR Detail Component
 * Phase 4: View and manage a specific Periodic Safety Report
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Tabs,
  Modal,
  Input,
  Alert,
  Tooltip,
  message,
  Popconfirm,
  Spin
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  MinusOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { usePSRStore, useCurrentPSR, usePSRCases, useEligibleCasesForPSR } from '../../stores/psrStore';
import type { PSRStatus, PSRCase } from '../../../shared/types/psr.types';
import {
  PSR_STATUS_LABELS,
  PSR_STATUS_COLORS,
  PSR_FORMAT_LABELS,
  PSR_STATUS_TRANSITIONS
} from '../../../shared/types/psr.types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface PSRDetailProps {
  psrId: number;
  onBack?: () => void;
}

export const PSRDetail: React.FC<PSRDetailProps> = ({ psrId, onBack }) => {
  const { psr, loading, error } = useCurrentPSR();
  const { cases, loading: casesLoading } = usePSRCases();
  const { cases: eligibleCases, loading: eligibleLoading } = useEligibleCasesForPSR();
  const {
    loadPSR,
    loadPSRCases,
    loadEligibleCases,
    transitionPSR,
    updatePSRCases,
    clearCurrentPSR
  } = usePSRStore();

  const [activeTab, setActiveTab] = useState('details');
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<PSRStatus | null>(null);
  const [transitionComment, setTransitionComment] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  useEffect(() => {
    loadPSR(psrId);
    loadPSRCases(psrId);
    return () => {
      clearCurrentPSR();
    };
  }, [psrId]);

  const handleTransition = async () => {
    if (!targetStatus) return;
    setTransitioning(true);
    try {
      const result = await transitionPSR(psrId, targetStatus, transitionComment);
      if (result) {
        message.success(`PSR status changed to ${PSR_STATUS_LABELS[targetStatus]}`);
        setTransitionModalOpen(false);
        setTransitionComment('');
        setTargetStatus(null);
      } else {
        message.error('Failed to update PSR status');
      }
    } catch {
      message.error('Failed to update PSR status');
    } finally {
      setTransitioning(false);
    }
  };

  const openTransitionModal = (status: PSRStatus) => {
    setTargetStatus(status);
    setTransitionModalOpen(true);
  };

  const handleAddCases = async () => {
    if (selectedCases.length === 0) return;
    const result = await updatePSRCases({
      psrId,
      includeCases: selectedCases
    });
    if (result) {
      message.success(`${selectedCases.length} case(s) added to PSR`);
      setSelectedCases([]);
      loadPSRCases(psrId);
    } else {
      message.error('Failed to add cases');
    }
  };

  const handleExcludeCases = async (caseIds: string[]) => {
    const result = await updatePSRCases({
      psrId,
      excludeCases: caseIds
    });
    if (result) {
      message.success(`${caseIds.length} case(s) excluded from PSR`);
      loadPSRCases(psrId);
    } else {
      message.error('Failed to exclude cases');
    }
  };

  const handleLoadEligible = () => {
    loadEligibleCases(psrId);
  };

  const getAvailableTransitions = (): PSRStatus[] => {
    if (!psr) return [];
    return PSR_STATUS_TRANSITIONS[psr.status] || [];
  };

  const includedCases = cases.filter(c => c.included);
  const excludedCases = cases.filter(c => !c.included);

  const caseColumns: ColumnsType<PSRCase> = [
    {
      title: 'Case ID',
      dataIndex: 'caseId',
      key: 'caseId',
      width: 120
    },
    {
      title: 'Safety Report ID',
      dataIndex: 'safetyReportId',
      key: 'safetyReportId',
      width: 140
    },
    {
      title: 'Patient',
      dataIndex: 'patientInitials',
      key: 'patientInitials',
      width: 100
    },
    {
      title: 'Report Type',
      dataIndex: 'reportType',
      key: 'reportType',
      width: 130
    },
    {
      title: 'Receipt Date',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '-'
    },
    {
      title: 'Status',
      dataIndex: 'workflowStatus',
      key: 'workflowStatus',
      width: 120
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title={record.included ? 'Exclude this case from PSR?' : 'Include this case in PSR?'}
          onConfirm={() =>
            record.included
              ? handleExcludeCases([record.caseId])
              : handleAddCases()
          }
        >
          <Button
            type="link"
            size="small"
            icon={record.included ? <MinusOutlined /> : <PlusOutlined />}
            danger={record.included}
          >
            {record.included ? 'Exclude' : 'Include'}
          </Button>
        </Popconfirm>
      )
    }
  ];

  const eligibleColumns: ColumnsType<PSRCase> = [
    {
      title: 'Case ID',
      dataIndex: 'caseId',
      key: 'caseId',
      width: 120
    },
    {
      title: 'Safety Report ID',
      dataIndex: 'safetyReportId',
      key: 'safetyReportId',
      width: 140
    },
    {
      title: 'Patient',
      dataIndex: 'patientInitials',
      key: 'patientInitials',
      width: 100
    },
    {
      title: 'Report Type',
      dataIndex: 'reportType',
      key: 'reportType',
      width: 130
    },
    {
      title: 'Receipt Date',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '-'
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="Loading PSR..." />
      </div>
    );
  }

  if (error || !psr) {
    return (
      <Alert
        message="Error"
        description={error || 'PSR not found'}
        type="error"
        showIcon
        action={
          <Button onClick={onBack}>Go Back</Button>
        }
      />
    );
  }

  const isOverdue = dayjs(psr.dueDate).isBefore(dayjs(), 'day') && psr.status !== 'submitted' && psr.status !== 'acknowledged';
  const availableTransitions = getAvailableTransitions();

  return (
    <div className="psr-detail">
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
                Back
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                <FileTextOutlined /> {psr.psrNumber}
              </Title>
              <Tag color={PSR_STATUS_COLORS[psr.status]} style={{ fontSize: 14 }}>
                {PSR_STATUS_LABELS[psr.status]}
              </Tag>
              {isOverdue && (
                <Tag color="red" icon={<ExclamationCircleOutlined />}>
                  Overdue
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              {availableTransitions.map(status => (
                <Button
                  key={status}
                  type={status === 'approved' || status === 'submitted' ? 'primary' : 'default'}
                  icon={
                    status === 'approved' ? <CheckCircleOutlined /> :
                    status === 'submitted' ? <SendOutlined /> :
                    <EditOutlined />
                  }
                  onClick={() => openTransitionModal(status)}
                >
                  {PSR_STATUS_LABELS[status]}
                </Button>
              ))}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane
          tab={<span><FileTextOutlined /> Details</span>}
          key="details"
        >
          <Row gutter={16}>
            <Col span={16}>
              <Card title="PSR Information">
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="PSR Number">{psr.psrNumber}</Descriptions.Item>
                  <Descriptions.Item label="Format">
                    <Tag>{PSR_FORMAT_LABELS[psr.psrFormat]}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Product">{psr.productName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={PSR_STATUS_COLORS[psr.status]}>
                      {PSR_STATUS_LABELS[psr.status]}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Period Start">
                    {dayjs(psr.periodStart).format('MMMM D, YYYY')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Period End">
                    {dayjs(psr.periodEnd).format('MMMM D, YYYY')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Data Lock Point">
                    {dayjs(psr.dataLockPoint).format('MMMM D, YYYY')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Due Date">
                    <Text type={isOverdue ? 'danger' : undefined} strong>
                      {dayjs(psr.dueDate).format('MMMM D, YYYY')}
                    </Text>
                  </Descriptions.Item>
                  {psr.approvedBy && (
                    <Descriptions.Item label="Approved By">{psr.approvedByName || psr.approvedBy}</Descriptions.Item>
                  )}
                  {psr.approvedAt && (
                    <Descriptions.Item label="Approved At">
                      {dayjs(psr.approvedAt).format('MMMM D, YYYY HH:mm')}
                    </Descriptions.Item>
                  )}
                  {psr.submittedAt && (
                    <Descriptions.Item label="Submitted At">
                      {dayjs(psr.submittedAt).format('MMMM D, YYYY HH:mm')}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Created At">
                    {dayjs(psr.createdAt).format('MMMM D, YYYY HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Created By">{psr.createdByName || psr.createdBy || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Case Summary">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic
                      title="Included Cases"
                      value={psr.caseCounts?.included || includedCases.length}
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Excluded Cases"
                      value={psr.caseCounts?.excluded || excludedCases.length}
                      valueStyle={{ color: '#999' }}
                    />
                  </Col>
                </Row>

                {psr.icsrBatchId && (
                  <>
                    <hr style={{ margin: '16px 0' }} />
                    <Text type="secondary">ICSR Batch ID:</Text>
                    <br />
                    <Text strong>{psr.icsrBatchId}</Text>
                  </>
                )}
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={<span><TeamOutlined /> Included Cases ({includedCases.length})</span>}
          key="included"
        >
          <Card>
            <Table
              columns={caseColumns}
              dataSource={includedCases}
              rowKey="caseId"
              loading={casesLoading}
              size="small"
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={<span><CloseCircleOutlined /> Excluded Cases ({excludedCases.length})</span>}
          key="excluded"
        >
          <Card>
            {excludedCases.length > 0 ? (
              <Table
                columns={caseColumns}
                dataSource={excludedCases}
                rowKey="caseId"
                loading={casesLoading}
                size="small"
                pagination={{ pageSize: 20 }}
              />
            ) : (
              <Alert
                message="No Excluded Cases"
                description="No cases have been excluded from this PSR."
                type="info"
                showIcon
              />
            )}
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={<span><PlusOutlined /> Add Cases</span>}
          key="add"
        >
          <Card>
            <Alert
              message="Add Eligible Cases"
              description="Select cases that are eligible for this PSR period and add them to the report."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button onClick={handleLoadEligible} loading={eligibleLoading}>
                  Load Eligible Cases
                </Button>
                {selectedCases.length > 0 && (
                  <Button type="primary" onClick={handleAddCases}>
                    Add {selectedCases.length} Selected Case(s)
                  </Button>
                )}
              </Space>
            </div>
            <Table
              columns={eligibleColumns}
              dataSource={eligibleCases}
              rowKey="caseId"
              loading={eligibleLoading}
              size="small"
              rowSelection={{
                selectedRowKeys: selectedCases,
                onChange: (keys) => setSelectedCases(keys as string[])
              }}
              pagination={{ pageSize: 20 }}
              locale={{ emptyText: 'Click "Load Eligible Cases" to find cases for this period' }}
            />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={<span><HistoryOutlined /> History</span>}
          key="history"
        >
          <Card>
            <Alert
              message="Audit Trail"
              description="View the complete audit trail for this PSR in the Audit Log section."
              type="info"
              showIcon
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>

      {/* Transition Modal */}
      <Modal
        title={`Change Status to ${targetStatus ? PSR_STATUS_LABELS[targetStatus] : ''}`}
        open={transitionModalOpen}
        onCancel={() => {
          setTransitionModalOpen(false);
          setTransitionComment('');
          setTargetStatus(null);
        }}
        onOk={handleTransition}
        confirmLoading={transitioning}
        okText="Confirm"
      >
        <Paragraph>
          Are you sure you want to change the PSR status to{' '}
          <Tag color={targetStatus ? PSR_STATUS_COLORS[targetStatus] : undefined}>
            {targetStatus ? PSR_STATUS_LABELS[targetStatus] : ''}
          </Tag>
          ?
        </Paragraph>
        <TextArea
          placeholder="Add a comment (optional)"
          value={transitionComment}
          onChange={e => setTransitionComment(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  );
};

export default PSRDetail;
