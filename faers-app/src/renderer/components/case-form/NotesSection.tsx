/**
 * Notes Section Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Displays and manages case notes (personal and team visibility).
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
  Radio,
  Tooltip,
  Popconfirm,
  message
} from 'antd';
import {
  FileTextOutlined,
  SendOutlined,
  UserOutlined,
  TeamOutlined,
  LockOutlined,
  CheckOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { CaseNote, AddNoteRequest } from '../../../shared/types/ipc.types';
import type { NoteVisibility } from '../../../shared/types/workflow.types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// Visibility configuration
const VISIBILITY_CONFIG: Record<NoteVisibility, {
  color: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}> = {
  personal: {
    color: 'default',
    icon: <LockOutlined />,
    label: 'Personal',
    description: 'Only visible to you'
  },
  team: {
    color: 'blue',
    icon: <TeamOutlined />,
    label: 'Team',
    description: 'Visible to all team members'
  }
};

interface NotesSectionProps {
  caseId: string;
  readOnly?: boolean;
}

const NotesSection: React.FC<NotesSectionProps> = ({ caseId, readOnly = false }) => {
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [visibility, setVisibility] = useState<NoteVisibility>('personal');
  const [showResolved, setShowResolved] = useState(false);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    try {
      const response = await window.electronAPI.getNotes(caseId);
      if (response.success && response.data) {
        setNotes(response.data);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  // Initial load
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Add note
  const handleAddNote = async () => {
    if (!newNote.trim()) {
      message.warning('Please enter a note');
      return;
    }

    setSubmitting(true);
    try {
      const request: AddNoteRequest = {
        caseId,
        visibility,
        content: newNote.trim()
      };

      const response = await window.electronAPI.addNote(request);
      if (response.success && response.data) {
        setNotes(prev => [response.data!, ...prev]);
        setNewNote('');
        message.success('Note added');
      } else {
        message.error(response.error || 'Failed to add note');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      message.error('Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve note
  const handleResolveNote = async (noteId: number) => {
    try {
      const response = await window.electronAPI.resolveNote(noteId);
      if (response.success && response.data) {
        setNotes(prev =>
          prev.map(n => n.id === noteId ? response.data! : n)
        );
        message.success('Note marked as resolved');
      } else {
        message.error(response.error || 'Failed to resolve note');
      }
    } catch (error) {
      console.error('Error resolving note:', error);
      message.error('Failed to resolve note');
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

  // Filter notes
  const filteredNotes = showResolved
    ? notes
    : notes.filter(n => !n.resolvedAt);

  // Count unresolved
  const unresolvedCount = notes.filter(n => !n.resolvedAt).length;

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          <span>Notes</span>
          <Tag>{unresolvedCount}</Tag>
          {notes.some(n => n.resolvedAt) && (
            <Button
              type="link"
              size="small"
              onClick={() => setShowResolved(!showResolved)}
            >
              {showResolved ? 'Hide Resolved' : 'Show Resolved'}
            </Button>
          )}
        </Space>
      }
      size="small"
    >
      {/* Add Note Form */}
      {!readOnly && (
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio.Group
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              size="small"
            >
              <Tooltip title={VISIBILITY_CONFIG.personal.description}>
                <Radio.Button value="personal">
                  <Space>
                    {VISIBILITY_CONFIG.personal.icon}
                    Personal
                  </Space>
                </Radio.Button>
              </Tooltip>
              <Tooltip title={VISIBILITY_CONFIG.team.description}>
                <Radio.Button value="team">
                  <Space>
                    {VISIBILITY_CONFIG.team.icon}
                    Team
                  </Space>
                </Radio.Button>
              </Tooltip>
            </Radio.Group>
            <TextArea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              maxLength={2000}
              showCount
            />
            <div style={{ textAlign: 'right' }}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleAddNote}
                loading={submitting}
                disabled={!newNote.trim()}
              >
                Add Note
              </Button>
            </div>
          </Space>
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : filteredNotes.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={showResolved ? 'No notes' : 'No unresolved notes'}
        />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={filteredNotes}
          renderItem={(note) => {
            const config = VISIBILITY_CONFIG[note.visibility] || VISIBILITY_CONFIG.personal;
            const isResolved = !!note.resolvedAt;

            return (
              <List.Item
                style={{
                  opacity: isResolved ? 0.6 : 1,
                  background: isResolved ? '#f5f5f5' : 'transparent',
                  padding: '8px 12px',
                  borderRadius: 4,
                  marginBottom: 8
                }}
                actions={
                  !readOnly && !isResolved
                    ? [
                        <Popconfirm
                          key="resolve"
                          title="Mark as resolved?"
                          description="This will mark the note as resolved."
                          onConfirm={() => handleResolveNote(note.id!)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button
                            type="link"
                            size="small"
                            icon={<CheckOutlined />}
                          >
                            Resolve
                          </Button>
                        </Popconfirm>
                      ]
                    : undefined
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      style={{
                        backgroundColor: isResolved ? '#52c41a' : '#1890ff'
                      }}
                      icon={isResolved ? <CheckCircleOutlined /> : <UserOutlined />}
                    >
                      {!isResolved && getUserInitials(note.user)}
                    </Avatar>
                  }
                  title={
                    <Space>
                      <Text strong style={{ textDecoration: isResolved ? 'line-through' : 'none' }}>
                        {getUserDisplayName(note.user)}
                      </Text>
                      <Tooltip title={config.description}>
                        <Tag color={config.color} icon={config.icon}>
                          {config.label}
                        </Tag>
                      </Tooltip>
                      {isResolved && (
                        <Tag color="success" icon={<CheckCircleOutlined />}>
                          Resolved
                        </Tag>
                      )}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(note.createdAt).fromNow()}
                      </Text>
                    </Space>
                  }
                  description={
                    <div>
                      <Paragraph
                        style={{
                          marginBottom: 0,
                          whiteSpace: 'pre-wrap',
                          textDecoration: isResolved ? 'line-through' : 'none'
                        }}
                      >
                        {note.content}
                      </Paragraph>
                      {isResolved && note.resolvedAt && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Resolved {dayjs(note.resolvedAt).fromNow()}
                        </Text>
                      )}
                    </div>
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

export default NotesSection;
