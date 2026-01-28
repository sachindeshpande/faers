/**
 * Notification Center Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Bell icon with dropdown showing user notifications.
 * Includes real-time unread count and notification management.
 */

import React, { useEffect, useState } from 'react';
import {
  Badge,
  Dropdown,
  Button,
  List,
  Typography,
  Space,
  Empty,
  Spin,
  Tooltip
} from 'antd';
import {
  BellOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  UserSwitchOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import {
  useNotifications,
  useNotificationActions
} from '../../stores/notificationStore';
import type { Notification } from '../../../shared/types/ipc.types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

interface NotificationCenterProps {
  onNotificationClick?: (notification: Notification) => void;
}

// Notification type icons
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'assignment':
      return <UserSwitchOutlined style={{ color: '#1890ff' }} />;
    case 'due_date':
      return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    case 'overdue':
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'workflow':
      return <FileTextOutlined style={{ color: '#52c41a' }} />;
    default:
      return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
  }
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onNotificationClick
}) => {
  const { notifications, unreadCount, isLoading } = useNotifications();
  const { fetchNotifications, markAsRead, markAllAsRead, startPolling, stopPolling } =
    useNotificationActions();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Start polling for unread count on mount
  useEffect(() => {
    startPolling(60000); // Poll every minute
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      fetchNotifications(20);
    }
  }, [dropdownOpen, fetchNotifications]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead && notification.id) {
      await markAsRead(notification.id);
    }
    onNotificationClick?.(notification);
    setDropdownOpen(false);
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  // Render notification item
  const renderNotificationItem = (item: Notification) => (
    <List.Item
      key={item.id}
      onClick={() => handleNotificationClick(item)}
      style={{
        cursor: 'pointer',
        padding: '12px 16px',
        background: item.isRead ? 'transparent' : '#e6f7ff',
        borderLeft: item.isRead ? 'none' : '3px solid #1890ff'
      }}
    >
      <List.Item.Meta
        avatar={getNotificationIcon(item.type)}
        title={
          <Space>
            <Text strong={!item.isRead}>{item.title}</Text>
            {!item.isRead && (
              <Badge status="processing" />
            )}
          </Space>
        }
        description={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.message}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {dayjs(item.createdAt).fromNow()}
            </Text>
          </Space>
        }
      />
    </List.Item>
  );

  // Dropdown content
  const dropdownContent = (
    <div
      style={{
        width: 380,
        maxHeight: 480,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Title level={5} style={{ margin: 0 }}>
          Notifications
        </Title>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications"
            style={{ padding: 40 }}
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            renderItem={renderNotificationItem}
            split={false}
          />
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center'
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            Showing {notifications.length} most recent notifications
          </Text>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
    >
      <Tooltip title="Notifications">
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            style={{ width: 40, height: 40 }}
          />
        </Badge>
      </Tooltip>
    </Dropdown>
  );
};

export default NotificationCenter;
