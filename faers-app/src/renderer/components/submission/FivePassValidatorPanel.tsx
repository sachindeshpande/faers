/**
 * 5-Pass Empirical Validator Panel
 *
 * Shows a row of traffic lights — one per pass of runFivePassValidation —
 * plus a collapsible list of findings grouped by severity. Used in two
 * contexts:
 *
 *   1. Embedded in SubmitToFdaDialog so the user sees why the app is (or
 *      isn't) about to let a submission through the pre-submission gate.
 *   2. Standalone via a case action menu item for "Run validator" so users
 *      can inspect the result without starting a submission.
 *
 * Calls the ESG_FIVE_PASS_VALIDATE IPC handler which re-generates the XML
 * in the main process and runs the validator — no XML is passed across the
 * IPC boundary.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  List,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  MinusCircleFilled,
  ReloadOutlined,
  WarningFilled
} from '@ant-design/icons';
import type {
  FivePassResult,
  ValidatorFinding,
  PassSummary
} from '../../../shared/types/faersValidation.types';

const { Text } = Typography;

interface PassMeta {
  key: keyof FivePassResult['passes'];
  id: 1 | 2 | 3 | 4 | 5;
  label: string;
  title: string;
}

const PASS_META: PassMeta[] = [
  {
    key: 'p1_elementDiff',
    id: 1,
    label: 'P1',
    title: 'Element-presence diff vs v37'
  },
  {
    key: 'p2_ceCompleteness',
    id: 2,
    label: 'P2',
    title: 'CE attribute completeness (@codeSystem present)'
  },
  {
    key: 'p3_businessRules',
    id: 3,
    label: 'P3',
    title: 'Business-rule code validity (empirical policy)'
  },
  {
    key: 'p4_valueDiff',
    id: 4,
    label: 'P4',
    title: 'Value-level diff vs v37 (categorized)'
  },
  {
    key: 'p5_empiricalSafety',
    id: 5,
    label: 'P5',
    title: 'Empirical safety classification of divergences'
  }
];

interface Props {
  caseId: string | null;
  /** Compact mode renders just the traffic-light strip without the findings list. */
  compact?: boolean;
  /** Parent-controlled callback fired after each run so the wrapping dialog can toggle submit. */
  onResult?: (result: FivePassResult | null) => void;
}

const FivePassValidatorPanel: React.FC<Props> = ({ caseId, compact, onResult }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FivePassResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await window.electronAPI.esgFivePassValidate(caseId);
      if (resp.success && resp.data) {
        setResult(resp.data);
        onResult?.(resp.data);
      } else {
        setError(resp.error || 'Validator returned no result');
        setResult(null);
        onResult?.(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
      onResult?.(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setResult(null);
    setError(null);
    if (caseId) {
      void run();
    }
    // run is stable for a given caseId; we intentionally only re-run when the
    // case changes or the user clicks the refresh button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  if (loading && !result) {
    return <Spin tip="Running 5-pass validator..." style={{ display: 'block', margin: '16px auto' }} />;
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="Validator failed"
        description={error}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={run}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!result) {
    return <Empty description="No validator result yet" />;
  }

  if (!result.ran) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Validator did not run"
        description={result.skipReason || 'Unknown reason'}
      />
    );
  }

  const TrafficLights = (
    <Space size="small" wrap>
      {PASS_META.map((meta) => (
        <PassLight key={meta.key} meta={meta} summary={result.passes[meta.key]} />
      ))}
      <SafetySummary safety={result.safety} />
    </Space>
  );

  if (compact) {
    return TrafficLights;
  }

  const grouped = groupFindings(result.findings);

  return (
    <Card
      size="small"
      title={<Space>5-Pass Validator {overallBadge(result)}</Space>}
      extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={run} loading={loading}>
          Re-run
        </Button>
      }
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {TrafficLights}
        {grouped.error.length > 0 && (
          <FindingsSection title={`Errors (${grouped.error.length})`} findings={grouped.error} color="red" />
        )}
        {grouped.warning.length > 0 && (
          <FindingsSection
            title={`Warnings (${grouped.warning.length})`}
            findings={grouped.warning}
            color="orange"
          />
        )}
        {grouped.info.length > 0 && (
          <FindingsSection
            title={`Info (${grouped.info.length})`}
            findings={grouped.info}
            color="blue"
          />
        )}
        {grouped.error.length === 0 &&
          grouped.warning.length === 0 &&
          grouped.info.length === 0 && (
            <Alert type="success" showIcon message="All passes clean — no findings." />
          )}
      </Space>
    </Card>
  );
};

/** Overall pass/fail badge shown next to the card title. */
function overallBadge(result: FivePassResult): React.ReactNode {
  if (result.pass) {
    return <Tag color="green" icon={<CheckCircleFilled />}>PASS</Tag>;
  }
  return <Tag color="red" icon={<CloseCircleFilled />}>FAIL</Tag>;
}

const PassLight: React.FC<{ meta: PassMeta; summary: PassSummary }> = ({ meta, summary }) => {
  let color = 'default';
  let Icon: React.ReactNode = <MinusCircleFilled style={{ color: '#8c8c8c' }} />;
  let tooltip = meta.title;

  if (!summary.ran) {
    tooltip += ` — skipped: ${summary.skipReason || 'unknown'}`;
  } else if (summary.errors > 0) {
    color = 'red';
    Icon = <CloseCircleFilled style={{ color: '#ff4d4f' }} />;
    tooltip += ` — ${summary.errors} error(s)`;
    if (summary.warnings > 0) tooltip += `, ${summary.warnings} warning(s)`;
  } else if (summary.warnings > 0) {
    color = 'orange';
    Icon = <WarningFilled style={{ color: '#faad14' }} />;
    tooltip += ` — ${summary.warnings} warning(s)`;
  } else {
    color = 'green';
    Icon = <CheckCircleFilled style={{ color: '#52c41a' }} />;
    tooltip += ' — clean';
  }

  return (
    <Tooltip title={tooltip}>
      <Tag color={color} style={{ cursor: 'help' }}>
        <Space size={4}>
          {Icon}
          {meta.label}
        </Space>
      </Tag>
    </Tooltip>
  );
};

const SafetySummary: React.FC<{ safety: FivePassResult['safety'] }> = ({ safety }) => {
  const total = safety.proven_safe + safety.proven_rejected + safety.untested;
  if (total === 0) return null;
  const tooltip = `Content divergences vs v37: ${safety.proven_safe} proven-safe, ${safety.proven_rejected} proven-rejected, ${safety.untested} untested`;
  return (
    <Tooltip title={tooltip}>
      <Tag color={safety.proven_rejected > 0 ? 'red' : safety.untested > 0 ? 'orange' : 'green'}>
        Safety: ✓{safety.proven_safe} ✗{safety.proven_rejected} ?{safety.untested}
      </Tag>
    </Tooltip>
  );
};

const FindingsSection: React.FC<{
  title: string;
  findings: ValidatorFinding[];
  color: string;
}> = ({ title, findings, color }) => (
  <Collapse
    size="small"
    items={[
      {
        key: '1',
        label: <Text style={{ color }}>{title}</Text>,
        children: (
          <List
            size="small"
            dataSource={findings}
            renderItem={(f) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Space size="small" wrap>
                    <Tag>P{f.pass}</Tag>
                    <Text strong>{f.label}</Text>
                  </Space>
                  {f.detail && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {f.detail}
                      </Text>
                    </div>
                  )}
                  {f.path && (
                    <div style={{ marginTop: 2 }}>
                      <Text code style={{ fontSize: 11 }}>
                        {f.path}
                      </Text>
                    </div>
                  )}
                </div>
              </List.Item>
            )}
          />
        )
      }
    ]}
  />
);

function groupFindings(findings: ValidatorFinding[]): Record<'error' | 'warning' | 'info', ValidatorFinding[]> {
  const grouped: Record<'error' | 'warning' | 'info', ValidatorFinding[]> = {
    error: [],
    warning: [],
    info: []
  };
  for (const f of findings) grouped[f.severity].push(f);
  return grouped;
}

export default FivePassValidatorPanel;
