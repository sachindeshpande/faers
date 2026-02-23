/**
 * Demo Mode Banner Component
 *
 * Displays a persistent, highly visible banner when Demo mode is active.
 * The banner indicates that no data will be sent to FDA and uses a distinct
 * color (purple) to differentiate from Test (blue) and Production (red) modes.
 */

import React, { useState, useEffect } from 'react';
import { Alert, Space, Typography, Button, Tooltip } from 'antd';
import {
  ExperimentOutlined,
  InfoCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { EsgApiEnvironment, DemoScenario, DemoSpeed } from '../../../shared/types/esgApi.types';
import { DEMO_SCENARIO_LABELS, DEMO_SPEED_LABELS } from '../../../shared/types/esgApi.types';

const { Text } = Typography;

interface DemoModeBannerProps {
  environment: EsgApiEnvironment;
  scenario?: DemoScenario;
  speed?: DemoSpeed;
  onConfigureClick?: () => void;
}

const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  environment,
  scenario = 'happy_path',
  speed = 'realtime',
  onConfigureClick
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(environment === 'Demo');
  }, [environment]);

  if (!visible) {
    return null;
  }

  const scenarioLabel = DEMO_SCENARIO_LABELS[scenario]?.split(' - ')[0] || 'Happy Path';
  const speedLabel = DEMO_SPEED_LABELS[speed]?.split(' - ')[0] || 'Real-time';

  return (
    <Alert
      type="info"
      banner
      showIcon
      icon={<ExperimentOutlined style={{ fontSize: 18 }} />}
      style={{
        backgroundColor: '#553C9A',
        borderColor: '#553C9A',
        color: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderRadius: 0,
        padding: '8px 16px'
      }}
      message={
        <Space size="large" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Text strong style={{ color: '#ffffff', fontSize: 14 }}>
              DEMO MODE
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
              No data will be sent to FDA
            </Text>
          </Space>
          <Space size="middle">
            <Tooltip title={DEMO_SCENARIO_LABELS[scenario]}>
              <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                <InfoCircleOutlined style={{ marginRight: 4 }} />
                Scenario: {scenarioLabel}
              </Text>
            </Tooltip>
            <Tooltip title={DEMO_SPEED_LABELS[speed]}>
              <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                Speed: {speedLabel}
              </Text>
            </Tooltip>
            {onConfigureClick && (
              <Button
                type="link"
                size="small"
                icon={<SettingOutlined />}
                onClick={onConfigureClick}
                style={{ color: '#ffffff' }}
              >
                Configure
              </Button>
            )}
          </Space>
        </Space>
      }
    />
  );
};

export default DemoModeBanner;
