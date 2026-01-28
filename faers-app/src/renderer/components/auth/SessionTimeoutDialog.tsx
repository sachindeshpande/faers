/**
 * Session Timeout Dialog Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Warning dialog shown when session is about to expire.
 * Allows user to extend their session or logout.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Typography, Button, Space, Progress } from 'antd';
import { ClockCircleOutlined, ReloadOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuthStore, useSessionState, useAuthActions } from '../../stores/authStore';

const { Text, Title } = Typography;

interface SessionTimeoutDialogProps {
  onLogout?: () => void;
}

const SessionTimeoutDialog: React.FC<SessionTimeoutDialogProps> = ({ onLogout }) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExtending, setIsExtending] = useState(false);

  const {
    session,
    sessionWarningMinutes,
    showSessionWarning,
    setShowSessionWarning,
    extendSession
  } = useSessionState();

  const { logout } = useAuthActions();
  const { isAuthenticated } = useAuthStore();

  // Calculate time remaining until session expires
  const calculateTimeRemaining = useCallback(() => {
    if (!session?.expiresAt) return 0;
    const expiresAt = new Date(session.expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expiresAt - now) / 1000));
  }, [session?.expiresAt]);

  // Update countdown timer
  useEffect(() => {
    if (!showSessionWarning || !isAuthenticated) return;

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Auto-logout when timer reaches 0
      if (remaining <= 0) {
        handleLogout();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [showSessionWarning, isAuthenticated, calculateTimeRemaining]);

  // Check if session is about to expire
  useEffect(() => {
    if (!isAuthenticated || !session?.expiresAt) return;

    const checkSession = () => {
      const remaining = calculateTimeRemaining();
      const warningThreshold = sessionWarningMinutes * 60;

      if (remaining <= warningThreshold && remaining > 0 && !showSessionWarning) {
        setShowSessionWarning(true);
      }
    };

    // Check every 10 seconds
    checkSession();
    const interval = setInterval(checkSession, 10000);

    return () => clearInterval(interval);
  }, [
    isAuthenticated,
    session?.expiresAt,
    sessionWarningMinutes,
    showSessionWarning,
    setShowSessionWarning,
    calculateTimeRemaining
  ]);

  const handleExtend = async () => {
    setIsExtending(true);
    const success = await extendSession();
    setIsExtending(false);

    if (success) {
      setShowSessionWarning(false);
    }
  };

  const handleLogout = async () => {
    setShowSessionWarning(false);
    await logout();
    onLogout?.();
  };

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage (inverse - full when time runs out)
  const warningThresholdSeconds = sessionWarningMinutes * 60;
  const progressPercent = Math.max(
    0,
    Math.min(100, ((warningThresholdSeconds - timeRemaining) / warningThresholdSeconds) * 100)
  );

  return (
    <Modal
      title={
        <span style={{ color: '#faad14' }}>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          Session Expiring Soon
        </span>
      }
      open={showSessionWarning && isAuthenticated}
      footer={null}
      closable={false}
      maskClosable={false}
      keyboard={false}
      width={400}
      centered
    >
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <Title level={1} style={{ marginBottom: 8, color: timeRemaining < 60 ? '#ff4d4f' : '#faad14' }}>
          {formatTime(timeRemaining)}
        </Title>
        <Text type="secondary">
          Your session will expire soon due to inactivity
        </Text>

        <Progress
          percent={progressPercent}
          showInfo={false}
          strokeColor={{
            '0%': '#faad14',
            '100%': '#ff4d4f'
          }}
          style={{ marginTop: 24, marginBottom: 24 }}
        />

        <Text style={{ display: 'block', marginBottom: 24 }}>
          Click &quot;Continue Session&quot; to stay logged in, or your session will automatically end.
        </Text>

        <Space size="middle">
          <Button
            type="primary"
            size="large"
            icon={<ReloadOutlined />}
            loading={isExtending}
            onClick={handleExtend}
          >
            Continue Session
          </Button>
          <Button
            size="large"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            disabled={isExtending}
          >
            Logout
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default SessionTimeoutDialog;
