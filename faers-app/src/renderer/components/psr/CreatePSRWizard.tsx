/**
 * Create PSR Wizard Component
 * Phase 4: Step-by-step wizard for creating a Periodic Safety Report
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Button,
  Form,
  Select,
  DatePicker,
  Typography,
  Card,
  Row,
  Col,
  Space,
  Table,
  Alert,
  Statistic,
  Divider,
  Tag,
  message,
  Spin,
  Result
} from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { usePSRStore, usePSRWizard, usePSRSchedules } from '../../stores/psrStore';
import type {
  PSRSchedule,
  CreatePSRDTO,
  PSRCase
} from '../../../shared/types/psr.types';
import {
  PSR_FORMAT_LABELS,
  PSR_FREQUENCY_LABELS
} from '../../../shared/types/psr.types';

const { Title, Text, Paragraph } = Typography;

interface CreatePSRWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (psrId: number) => void;
}

interface ProductOption {
  id: number;
  productName: string;
  activeIngredient?: string;
}

export const CreatePSRWizard: React.FC<CreatePSRWizardProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const { isOpen, selectedProductId, nextPeriod, nextPeriodLoading } = usePSRWizard();
  const { schedules, loading: schedulesLoading } = usePSRSchedules();
  const {
    loadSchedules,
    loadNextPeriod,
    createPSR,
    setSelectedProduct,
    closeCreateWizard
  } = usePSRStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [createdPSR, setCreatedPSR] = useState<{ id: number; psrNumber: string } | null>(null);

  // Products list (simplified - would normally come from product store)
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Selected schedule
  const [selectedSchedule, setSelectedSchedule] = useState<PSRSchedule | null>(null);

  // Cases preview
  const [casesPreview, setCasesPreview] = useState<PSRCase[]>([]);

  useEffect(() => {
    if (visible) {
      loadProducts();
      setCurrentStep(0);
      setCreatedPSR(null);
      form.resetFields();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedProductId) {
      loadSchedules(selectedProductId);
    }
  }, [selectedProductId, loadSchedules]);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await window.electronAPI.getProducts({});
      if (response.success && response.data) {
        setProducts(response.data.products.map(p => ({
          id: p.id,
          productName: p.productName,
          activeIngredient: p.activeIngredient
        })));
      }
    } catch {
      // Handle error silently
    } finally {
      setProductsLoading(false);
    }
  };

  const handleProductChange = (productId: number) => {
    setSelectedProduct(productId);
    setSelectedSchedule(null);
    form.setFieldsValue({ scheduleId: undefined });
  };

  const handleScheduleChange = async (scheduleId: number) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    setSelectedSchedule(schedule || null);
    if (schedule) {
      await loadNextPeriod(scheduleId);
    }
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['productId', 'scheduleId']);
        // Load cases preview for next step
        loadCasesPreview();
      }
      setCurrentStep(currentStep + 1);
    } catch {
      // Validation failed
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const loadCasesPreview = async () => {
    // This would normally fetch eligible cases based on the selected period
    // For now, we'll show an empty preview
    setCasesPreview([]);
  };

  const handleCreate = async () => {
    if (!selectedProductId || !selectedSchedule || !nextPeriod) return;

    setCreating(true);
    try {
      const data: CreatePSRDTO = {
        productId: selectedProductId,
        scheduleId: selectedSchedule.id,
        psrFormat: selectedSchedule.psrFormat,
        periodStart: nextPeriod.periodStart,
        periodEnd: nextPeriod.periodEnd,
        dataLockPoint: nextPeriod.dataLockPoint,
        dueDate: nextPeriod.dueDate
      };

      const result = await createPSR(data);
      if (result) {
        setCreatedPSR({ id: result.id, psrNumber: result.psrNumber });
        setCurrentStep(3);
        message.success('PSR created successfully');
      } else {
        message.error('Failed to create PSR');
      }
    } catch {
      message.error('Failed to create PSR');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    closeCreateWizard();
    onClose();
    if (createdPSR) {
      onSuccess?.(createdPSR.id);
    }
  };

  const caseColumns: ColumnsType<PSRCase> = [
    {
      title: 'Case ID',
      dataIndex: 'caseId',
      key: 'caseId',
      width: 150
    },
    {
      title: 'Safety Report ID',
      dataIndex: 'safetyReportId',
      key: 'safetyReportId',
      width: 150
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
      width: 120
    },
    {
      title: 'Date',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '-'
    }
  ];

  const steps = [
    {
      title: 'Select Product',
      icon: <FileTextOutlined />,
      content: (
        <div style={{ padding: '20px 0' }}>
          <Form form={form} layout="vertical">
            <Form.Item
              name="productId"
              label="Product"
              rules={[{ required: true, message: 'Please select a product' }]}
            >
              <Select
                placeholder="Select a product"
                loading={productsLoading}
                onChange={handleProductChange}
                showSearch
                optionFilterProp="children"
                style={{ width: '100%' }}
              >
                {products.map(p => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.productName} {p.activeIngredient && `(${p.activeIngredient})`}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {selectedProductId && (
              <Form.Item
                name="scheduleId"
                label="PSR Schedule"
                rules={[{ required: true, message: 'Please select a schedule' }]}
              >
                <Select
                  placeholder="Select a schedule"
                  loading={schedulesLoading}
                  onChange={handleScheduleChange}
                  style={{ width: '100%' }}
                >
                  {schedules.filter(s => s.isActive).map(s => (
                    <Select.Option key={s.id} value={s.id}>
                      {PSR_FORMAT_LABELS[s.psrFormat]} - {PSR_FREQUENCY_LABELS[s.frequency]}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {selectedSchedule && nextPeriod && (
              <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
                <Title level={5}><CalendarOutlined /> Next Period</Title>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="Period Start"
                      value={dayjs(nextPeriod.periodStart).format('MMM D, YYYY')}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Period End"
                      value={dayjs(nextPeriod.periodEnd).format('MMM D, YYYY')}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Due Date"
                      value={dayjs(nextPeriod.dueDate).format('MMM D, YYYY')}
                    />
                  </Col>
                </Row>
                <Divider style={{ margin: '12px 0' }} />
                <Row gutter={16}>
                  <Col span={12}>
                    <Text type="secondary">Data Lock Point:</Text>{' '}
                    <Text strong>{dayjs(nextPeriod.dataLockPoint).format('MMM D, YYYY')}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Period Number:</Text>{' '}
                    <Text strong>{nextPeriod.periodNumber}</Text>
                  </Col>
                </Row>
              </Card>
            )}

            {nextPeriodLoading && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin tip="Calculating next period..." />
              </div>
            )}
          </Form>
        </div>
      )
    },
    {
      title: 'Review Cases',
      icon: <TeamOutlined />,
      content: (
        <div style={{ padding: '20px 0' }}>
          <Alert
            message="Case Aggregation"
            description="The following cases will be automatically included in this PSR based on the reporting period. You can modify the case list after the PSR is created."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {nextPeriod && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Period"
                    value={`${dayjs(nextPeriod.periodStart).format('MMM D')} - ${dayjs(nextPeriod.periodEnd).format('MMM D, YYYY')}`}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Eligible Cases"
                    value={casesPreview.length}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Format"
                    value={selectedSchedule ? PSR_FORMAT_LABELS[selectedSchedule.psrFormat] : '-'}
                  />
                </Col>
              </Row>
            </Card>
          )}

          <Table
            columns={caseColumns}
            dataSource={casesPreview}
            rowKey="caseId"
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'No cases found for this period. Cases will be aggregated after creation.' }}
          />
        </div>
      )
    },
    {
      title: 'Confirm',
      icon: <CalendarOutlined />,
      content: (
        <div style={{ padding: '20px 0' }}>
          <Card>
            <Title level={4}>PSR Summary</Title>
            <Paragraph>
              Please review the following details before creating the PSR:
            </Paragraph>

            <Divider />

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Product:</Text>
                <br />
                <Text strong>
                  {products.find(p => p.id === selectedProductId)?.productName || '-'}
                </Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Format:</Text>
                <br />
                <Tag color="blue">
                  {selectedSchedule ? PSR_FORMAT_LABELS[selectedSchedule.psrFormat] : '-'}
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">Period:</Text>
                <br />
                <Text strong>
                  {nextPeriod
                    ? `${dayjs(nextPeriod.periodStart).format('MMM D, YYYY')} - ${dayjs(nextPeriod.periodEnd).format('MMM D, YYYY')}`
                    : '-'}
                </Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Data Lock Point:</Text>
                <br />
                <Text strong>
                  {nextPeriod ? dayjs(nextPeriod.dataLockPoint).format('MMM D, YYYY') : '-'}
                </Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Due Date:</Text>
                <br />
                <Text strong style={{ color: '#ff4d4f' }}>
                  {nextPeriod ? dayjs(nextPeriod.dueDate).format('MMM D, YYYY') : '-'}
                </Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Eligible Cases:</Text>
                <br />
                <Text strong>{casesPreview.length}</Text>
              </Col>
            </Row>

            <Divider />

            <Alert
              message="Ready to Create"
              description="Click 'Create PSR' to create the Periodic Safety Report. You can add cases and transition the status after creation."
              type="success"
              showIcon
            />
          </Card>
        </div>
      )
    },
    {
      title: 'Complete',
      icon: <CheckCircleOutlined />,
      content: (
        <div style={{ padding: '20px 0' }}>
          <Result
            status="success"
            title="PSR Created Successfully"
            subTitle={`PSR Number: ${createdPSR?.psrNumber || ''}`}
            extra={[
              <Button type="primary" key="view" onClick={handleClose}>
                View PSR
              </Button>,
              <Button key="close" onClick={handleClose}>
                Close
              </Button>
            ]}
          />
        </div>
      )
    }
  ];

  return (
    <Modal
      title="Create Periodic Safety Report"
      open={visible || isOpen}
      onCancel={handleClose}
      width={800}
      footer={
        currentStep < 3 ? (
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>Previous</Button>
            )}
            {currentStep < 2 && (
              <Button
                type="primary"
                onClick={handleNext}
                disabled={currentStep === 0 && (!selectedProductId || !selectedSchedule)}
              >
                Next
              </Button>
            )}
            {currentStep === 2 && (
              <Button
                type="primary"
                onClick={handleCreate}
                loading={creating}
              >
                Create PSR
              </Button>
            )}
            <Button onClick={handleClose}>Cancel</Button>
          </Space>
        ) : null
      }
    >
      <Steps current={currentStep} items={steps.map(s => ({ title: s.title, icon: s.icon }))} />
      {steps[currentStep].content}
    </Modal>
  );
};

export default CreatePSRWizard;
