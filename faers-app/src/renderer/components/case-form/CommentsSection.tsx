/**
 * Comments Section Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Displays and manages case comments for workflow communication.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  List,
  Avatar,
  Input,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Spin,
  Select,
  message
} from 'antd';
import {
  CommentOutlined,
  SendOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import type { CaseComment, AddCommentRequest } from '../../../shared/types/ipc.types';
import type { CommentType } from '../../../shared/types/workflow.types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// Comment type configuration
const COMMENT_TYPE_CONFIG: Record<CommentType, {
  color: string;
  icon: React.ReactNode;
  label: string;
}> = {
  general: {
    color: 'default',
    icon: <CommentOutlined />,
    label: 'General'
  },
  query: {
    color: 'blue',
    icon: <QuestionCircleOutlined />,
    label: 'Query'
  },
  response: {
    color: 'green',
    icon: <CheckCircleOutlined />,
    label: 'Response'
  },
  rejection: {
    color: 'red',
    icon: <CloseCircleOutlined />,
    label: 'Rejection'
  },
  workflow: {
    color: 'purple',
    icon: <SyncOutlined />,
    label: 'Workflow'
  }
};

interface CommentsSectionProps {
  caseId: string;
  readOnly?: boolean;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ caseId, readOnly = false }) => {
  const [comments, setComments] = useState<CaseComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<CommentType>('general');

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    try {
      const response = await window.electronAPI.getComments(caseId);
      if (response.success && response.data) {
        setComments(response.data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  // Initial load
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      message.warning('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const request: AddCommentRequest = {
        caseId,
        commentType,
        content: newComment.trim()
      };

      const response = await window.electronAPI.addComment(request);
      if (response.success && response.data) {
        setComments(prev => [response.data!, ...prev]);
        setNewComment('');
        setCommentType('general');
        message.success('Comment added');
      } else {
        message.error(response.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      message.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Get user initials
  const getUserInitials = (user?: { firstName?: string; lastName?: string; username: string }) => {
    if (!user) return '?';
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  // Get user display name
  const getUserDisplayName = (user?: { firstName?: string; lastName?: string; username: string }) => {
    if (!user) return 'Unknown User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username;
  };

  return (
    <Card
      title={
        <Space>
          <CommentOutlined />
          <span>Comments</span>
          <Tag>{comments.length}</Tag>
        </Space>
      }
      size="small"
    >
      {/* Add Comment Form */}
      {!readOnly && (
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Select
                value={commentType}
                onChange={setCommentType}
                style={{ width: 120 }}
                size="small"
              >
                <Select.Option value="general">
                  <Space>
                    {COMMENT_TYPE_CONFIG.general.icon}
                    General
                  </Space>
                </Select.Option>
                <Select.Option value="query">
                  <Space>
                    {COMMENT_TYPE_CONFIG.query.icon}
                    Query
                  </Space>
                </Select.Option>
                <Select.Option value="response">
                  <Space>
                    {COMMENT_TYPE_CONFIG.response.icon}
                    Response
                  </Space>
                </Select.Option>
              </Select>
            </Space>
            <TextArea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              maxLength={2000}
              showCount
            />
            <div style={{ textAlign: 'right' }}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleAddComment}
                loading={submitting}
                disabled={!newComment.trim()}
              >
                Add Comment
              </Button>
            </div>
          </Space>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : comments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No comments yet"
        />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={comments}
          renderItem={(comment) => {
            const config = COMMENT_TYPE_CONFIG[comment.commentType] || COMMENT_TYPE_CONFIG.general;
            return (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar
                      style={{ backgroundColor: '#1890ff' }}
                      icon={<UserOutlined />}
                    >
                      {getUserInitials(comment.user)}
                    </Avatar>
                  }
                  title={
                    <Space>
                      <Text strong>{getUserDisplayName(comment.user)}</Text>
                      <Tag color={config.color} icon={config.icon}>
                        {config.label}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(comment.createdAt).fromNow()}
                      </Text>
                    </Space>
                  }
                  description={
                    <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                      {comment.content}
                    </Paragraph>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};

export default CommentsSection;
