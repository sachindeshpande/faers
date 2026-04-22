/**
 * Import ACK Dialog
 *
 * Lets a user drop a raw FDA ACK XML file (or paste XML inline), parse it
 * via the ackParserService IPC, and see the layered CA/CR + AA/AR verdict
 * plus structured rejection tags.
 *
 * This is a read-only operation — the dialog deliberately does NOT write
 * back to any case record. The goal is diagnostics + policy feedback. If
 * the caller wants to tie the result to a case, they can do so outside
 * (wire an onResult callback to write the target message ID back).
 */

import React, { useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Empty,
  Input,
  List,
  Modal,
  Space,
  Tabs,
  Tag,
  Typography,
  message
} from 'antd';
import { FileTextOutlined, FolderOpenOutlined } from '@ant-design/icons';
import type { ParsedAck } from '../../../shared/types/faersValidation.types';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
  onResult?: (parsed: ParsedAck) => void;
}

const ImportAckDialog: React.FC<Props> = ({ open, onClose, onResult }) => {
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pastedXml, setPastedXml] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedAck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPastedXml('');
    setFilePath(null);
    setParsed(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickFile = async () => {
    const resp = await window.electronAPI.showOpenDialog({
      title: 'Select FDA ACK file',
      filters: [
        { name: 'ACK files', extensions: ['ack', 'xml'] },
        { name: 'All files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    if (resp.success && resp.data && resp.data.length > 0) {
      setFilePath(resp.data[0]);
      setParsed(null);
      setError(null);
    }
  };

  const parse = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: { xml?: string; filePath?: string } =
        inputMode === 'file' ? { filePath: filePath ?? undefined } : { xml: pastedXml };

      if (!payload.xml && !payload.filePath) {
        setError('Provide either a file or paste XML before parsing.');
        setLoading(false);
        return;
      }

      const resp = await window.electronAPI.esgParseAck(payload);
      if (resp.success && resp.data) {
        setParsed(resp.data);
        onResult?.(resp.data);
        if (!resp.data.parsed) {
          message.warning(resp.data.parseError || 'Parser could not interpret this ACK');
        } else if (resp.data.overall === 'accepted') {
          message.success('ACK parsed — submission was ACCEPTED');
        } else if (resp.data.overall === 'rejected') {
          message.error(`ACK parsed — submission was REJECTED (${resp.data.rejections.length} field(s))`);
        } else {
          message.info('ACK parsed — outcome unclear, check details');
        }
      } else {
        setError(resp.error || 'Parse failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Import FDA Acknowledgment"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="close" onClick={handleClose}>
          Close
        </Button>,
        <Button key="parse" type="primary" onClick={parse} loading={loading}>
          Parse ACK
        </Button>
      ]}
      width={720}
      destroyOnClose
    >
      <Tabs
        activeKey={inputMode}
        onChange={(k) => {
          setInputMode(k as 'file' | 'paste');
          setParsed(null);
          setError(null);
        }}
        items={[
          {
            key: 'file',
            label: (
              <Space>
                <FolderOpenOutlined />
                From file
              </Space>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                  Select a raw ACK XML file from the ESG mailbox (typically a{' '}
                  <Text code>.ack</Text> file).
                </Paragraph>
                <Space>
                  <Button icon={<FolderOpenOutlined />} onClick={pickFile}>
                    Choose file…
                  </Button>
                  {filePath && <Text copyable={{ text: filePath }}>{filePath}</Text>}
                </Space>
              </Space>
            )
          },
          {
            key: 'paste',
            label: (
              <Space>
                <FileTextOutlined />
                Paste XML
              </Space>
            ),
            children: (
              <TextArea
                rows={10}
                value={pastedXml}
                onChange={(e) => setPastedXml(e.target.value)}
                placeholder="Paste the raw MCCI_IN200101UV01 ACK envelope here…"
                spellCheck={false}
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12 }}
              />
            )
          }
        ]}
      />

      {error && (
        <>
          <Divider />
          <Alert type="error" showIcon message="Parse failed" description={error} />
        </>
      )}

      {parsed && (
        <>
          <Divider />
          <AckResultView parsed={parsed} />
        </>
      )}
    </Modal>
  );
};

const AckResultView: React.FC<{ parsed: ParsedAck }> = ({ parsed }) => {
  if (!parsed.parsed) {
    return <Alert type="warning" showIcon message="Unparseable" description={parsed.parseError || 'The ACK was not understood.'} />;
  }

  const overallColor =
    parsed.overall === 'accepted' ? 'success' : parsed.overall === 'rejected' ? 'error' : 'warning';
  const overallMsg =
    parsed.overall === 'accepted'
      ? 'ACCEPTED — CA + AA received'
      : parsed.overall === 'rejected'
        ? 'REJECTED'
        : 'UNCLEAR';

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Alert
        type={overallColor}
        showIcon
        message={overallMsg}
        description={overallCommentary(parsed)}
      />
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Inner message ack">
          <AckCodeTag code={parsed.messageCode} innerLayer />
          {parsed.messageDetail && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {parsed.messageDetail}
            </Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Outer batch ack">
          <AckCodeTag code={parsed.batchCode} innerLayer={false} />
          {parsed.batchDetail && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {parsed.batchDetail}
            </Text>
          )}
        </Descriptions.Item>
        {parsed.targetMessageId && (
          <Descriptions.Item label="Target case (SR.ID)">
            <Text copyable>{parsed.targetMessageId}</Text>
          </Descriptions.Item>
        )}
        {parsed.targetBatchId && (
          <Descriptions.Item label="Target batch">
            <Text copyable>{parsed.targetBatchId}</Text>
          </Descriptions.Item>
        )}
        {parsed.creationTime && (
          <Descriptions.Item label="Creation time">{parsed.creationTime}</Descriptions.Item>
        )}
        {parsed.localReportNumber && (
          <Descriptions.Item label="FDA local report #">{parsed.localReportNumber}</Descriptions.Item>
        )}
      </Descriptions>

      {parsed.rejections.length > 0 && (
        <>
          <Text strong>Rejections ({parsed.rejections.length})</Text>
          <List
            size="small"
            bordered
            dataSource={parsed.rejections}
            renderItem={(r) => (
              <List.Item>
                <Space align="start">
                  <Tag color="red">#{r.index}</Tag>
                  {r.tag ? <Tag color="volcano">{r.tag}</Tag> : null}
                  <Text>{r.message}</Text>
                </Space>
              </List.Item>
            )}
          />
        </>
      )}

      {parsed.rejections.length === 0 && parsed.overall === 'rejected' && (
        <Empty description="Rejected but no structured rejections found — check raw detail text" />
      )}
    </Space>
  );
};

const AckCodeTag: React.FC<{ code: string | null; innerLayer: boolean }> = ({ code, innerLayer }) => {
  if (!code) return <Tag>absent</Tag>;
  const positive = code === 'CA' || code === 'AA';
  const labels: Record<string, string> = {
    CA: 'CA — Commit Accept',
    CR: 'CR — Commit Reject',
    AA: 'AA — Accept',
    AR: 'AR — Reject'
  };
  return (
    <Tag color={positive ? 'green' : 'red'}>
      {labels[code] || code}
      {innerLayer ? ' (ICSR)' : ' (Batch)'}
    </Tag>
  );
};

function overallCommentary(parsed: ParsedAck): string {
  if (parsed.overall === 'accepted') {
    return 'Both the inner ICSR message and outer batch were accepted by FAERS 2.18. The case is loaded.';
  }
  if (parsed.messageCode === 'CR' && parsed.batchCode === 'AR') {
    return 'Both layers rejected. The inner detail lists the failed field tags — map each to the empirical policy to decide a fix.';
  }
  if (parsed.messageCode === 'CR') {
    return 'The FAERS message validation rejected this ICSR. See rejection list for specific field tags.';
  }
  if (parsed.batchCode === 'AR') {
    return 'The batch was rejected at the transport/envelope layer. Usually a parsing or structural issue rather than a business-rule failure.';
  }
  return 'The ACK was parsed but the verdict is ambiguous. Inspect the raw envelope for details.';
}

export default ImportAckDialog;
