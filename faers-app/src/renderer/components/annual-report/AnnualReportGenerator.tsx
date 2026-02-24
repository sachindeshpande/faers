import React, { useState } from 'react';
import { Card, Form, Select, DatePicker, Button, Table, Descriptions, Statistic, Row, Col, Tag, Space, message } from 'antd';
import { useAnnualReportStore } from '../../stores/annualReportStore';
import { useStudyStore } from '../../stores/studyStore';
import type { AnnualReportLineListing } from '../../../shared/types/annualReport.types';

const AnnualReportGenerator: React.FC = () => {
  const { studies, fetchStudies } = useStudyStore();
  const { reportData, isLoading, generateReport } = useAnnualReportStore();
  const [form] = Form.useForm();

  React.useEffect(() => { fetchStudies(); }, []);

  const handleGenerate = async (values: any) => {
    await generateReport({ studyId: values.studyId, periodStart: values.periodStart, periodEnd: values.periodEnd });
  };

  const columns = [
    { title: 'Case ID', dataIndex: 'caseId', key: 'caseId', width: 120 },
    { title: 'Subject', dataIndex: 'subjectNumber', key: 'subjectNumber' },
    { title: 'Event', dataIndex: 'eventTerm', key: 'eventTerm', ellipsis: true },
    { title: 'Seriousness', dataIndex: 'seriousness', key: 'seriousness' },
    { title: 'Causality', dataIndex: 'causality', key: 'causality' },
    { title: 'Expectedness', dataIndex: 'expectedness', key: 'expectedness' },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (c: string) => (
      <Tag color={c === 'serious_unexpected' ? 'red' : c === 'serious_expected' ? 'orange' : 'blue'}>{c.replace(/_/g, ' ')}</Tag>
    )}
  ];

  return (
    <div>
      <Card title="IND Annual Safety Report Generator" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleGenerate}>
          <Form.Item name="studyId" label="Study" rules={[{ required: true }]}>
            <Select style={{ width: 300 }} options={studies.map(s => ({ value: s.id, label: `${s.studyId}: ${s.studyTitle}` }))} />
          </Form.Item>
          <Form.Item name="periodStart" label="Period Start" rules={[{ required: true }]}><input type="date" /></Form.Item>
          <Form.Item name="periodEnd" label="Period End" rules={[{ required: true }]}><input type="date" /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" loading={isLoading}>Generate Report</Button></Form.Item>
        </Form>
      </Card>

      {reportData && (
        <>
          <Card title={`Annual Report: ${reportData.protocolNumber}`} style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}><Statistic title="Total Cases" value={reportData.totalCases} /></Col>
              <Col span={6}><Statistic title="Serious Unexpected" value={reportData.seriousUnexpectedCount} valueStyle={{ color: '#cf1322' }} /></Col>
              <Col span={6}><Statistic title="Serious Expected" value={reportData.seriousExpectedCount} valueStyle={{ color: '#faad14' }} /></Col>
              <Col span={6}><Statistic title="Non-Serious" value={reportData.nonSeriousCount} valueStyle={{ color: '#3f8600' }} /></Col>
            </Row>
          </Card>

          <Card title="Case Line Listing">
            <Table columns={columns} dataSource={reportData.lineListings} rowKey="caseId" size="small" pagination={{ pageSize: 50 }} />
          </Card>
        </>
      )}
    </div>
  );
};

export default AnnualReportGenerator;
