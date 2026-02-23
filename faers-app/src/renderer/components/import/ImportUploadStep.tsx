/**
 * Import Upload Step Component
 * File upload step in the import wizard
 */

import React from 'react';
import { Upload, Typography, Space, Card, Spin } from 'antd';
import { InboxOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import { useImportStore } from '../../stores/importStore';

const { Dragger } = Upload;
const { Text, Title } = Typography;

export const ImportUploadStep: React.FC = () => {
  const { isUploading, uploadFile, uploadResponse } = useImportStore();

  const handleUpload = async () => {
    // Use the file dialog (no file path = show dialog)
    await uploadFile();
  };

  if (isUploading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>Processing file...</Text>
        </div>
      </div>
    );
  }

  if (uploadResponse) {
    return (
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5}>File Uploaded Successfully</Title>
          <Text>
            <strong>File:</strong> {uploadResponse.filename}
          </Text>
          <Text>
            <strong>Rows:</strong> {uploadResponse.rowCount} rows detected
          </Text>
          <Text>
            <strong>Columns:</strong> {uploadResponse.sourceColumns.length} columns found
          </Text>
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Preview columns:</Text>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {uploadResponse.sourceColumns.slice(0, 10).map((col, idx) => (
                <span
                  key={idx}
                  style={{
                    background: '#f0f0f0',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 12
                  }}
                >
                  {col}
                </span>
              ))}
              {uploadResponse.sourceColumns.length > 10 && (
                <span style={{ color: '#999', fontSize: 12 }}>
                  +{uploadResponse.sourceColumns.length - 10} more
                </span>
              )}
            </div>
          </div>
        </Space>
      </Card>
    );
  }

  return (
    <div>
      <Dragger
        accept=".csv,.xlsx,.xls"
        showUploadList={false}
        beforeUpload={() => false}
        onClick={handleUpload}
        style={{ padding: '40px 0' }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag file to this area to upload
        </p>
        <p className="ant-upload-hint">
          Support for CSV and Excel files (.csv, .xlsx, .xls)
        </p>
      </Dragger>

      <div style={{ marginTop: 24 }}>
        <Title level={5}>Supported File Formats</Title>
        <Space direction="vertical" size="small">
          <Space>
            <FileTextOutlined style={{ color: '#52c41a' }} />
            <Text>CSV (Comma-Separated Values) - Auto-detects delimiter</Text>
          </Space>
          <Space>
            <FileExcelOutlined style={{ color: '#1890ff' }} />
            <Text>Excel (.xlsx, .xls) - First sheet will be imported</Text>
          </Space>
        </Space>
      </div>

      <div style={{ marginTop: 24 }}>
        <Title level={5}>Requirements</Title>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <Text type="secondary">First row must contain column headers</Text>
          </li>
          <li>
            <Text type="secondary">Each row represents one case</Text>
          </li>
          <li>
            <Text type="secondary">Patient initials or age is recommended for each case</Text>
          </li>
          <li>
            <Text type="secondary">At least one reaction description per case</Text>
          </li>
        </ul>
      </div>
    </div>
  );
};
