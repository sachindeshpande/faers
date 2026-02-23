/**
 * Polling Status Indicator (Phase 2B)
 *
 * Small badge showing the current state of acknowledgment polling.
 */

import React, { useState, useEffect } from 'react';
import { Badge, Tooltip, Typography } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import type { PollingStatus } from '../../../shared/types/esgApi.types';

const { Text } = Typography;

interface PollingStatusIndicatorProps {
  style?: React.CSSProperties;
}

const PollingStatusIndicator: React.FC<PollingStatusIndicatorProps> = ({ style }) => {
  const [status, setStatus] = useState<PollingStatus | null>(null);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const result = await window.electronAPI.esgGetPollingStatus();
      if (result.success && result.data) {
        setStatus(result.data);
      }
    } catch {
      // ignore
    }
  };

  if (!status) return null;

  const tooltipContent = (
    <div>
      <div>Status: {status.isActive ? 'Active' : 'Inactive'}</div>
      {status.casesBeingPolled > 0 && (
        <div>Cases being polled: {status.casesBeingPolled}</div>
      )}
      {status.lastPollTime && (
        <div>Last checked: {new Date(status.lastPollTime).toLocaleTimeString()}</div>
      )}
      {status.nextPollTime && (
        <div>Next check: {new Date(status.nextPollTime).toLocaleTimeString()}</div>
      )}
      {status.errors && status.errors.length > 0 && (
        <div style={{ color: '#ff4d4f' }}>Errors: {status.errors.length}</div>
      )}
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="bottom">
      <span style={{ cursor: 'default', ...style }}>
        <Badge
          status={status.isActive ? 'processing' : 'default'}
          text={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {status.isActive && <SyncOutlined spin style={{ marginRight: 4, fontSize: 10 }} />}
              ACK Polling {status.isActive ? 'Active' : 'Inactive'}
              {status.casesBeingPolled > 0 && ` (${status.casesBeingPolled})`}
            </Text>
          }
        />
      </span>
    </Tooltip>
  );
};

export default PollingStatusIndicator;
