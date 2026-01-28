/**
 * Workflow Status Badge Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Displays workflow status with appropriate color coding.
 * Used throughout the application to show case status.
 */

import React from 'react';
import { Tag, Tooltip } from 'antd';
import {
  EditOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SendOutlined,
  CheckSquareOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileAddOutlined
} from '@ant-design/icons';
import type { WorkflowStatus } from '../../../shared/types/workflow.types';
import { WORKFLOW_STATUS_CONFIG } from '../../../shared/types/workflow.types';

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
  showIcon?: boolean;
  showTooltip?: boolean;
  size?: 'small' | 'default';
}

// Map status to icons
const STATUS_ICONS: Record<WorkflowStatus, React.ReactNode> = {
  'Draft': <EditOutlined />,
  'Data Entry Complete': <CheckCircleOutlined />,
  'In Medical Review': <SyncOutlined spin />,
  'Medical Review Complete': <CheckCircleOutlined />,
  'In QC Review': <SyncOutlined spin />,
  'QC Complete': <CheckCircleOutlined />,
  'Approved': <CheckSquareOutlined />,
  'Pending PSR': <ClockCircleOutlined />,
  'Included in PSR': <FileAddOutlined />,
  'Submitted': <SendOutlined />,
  'Acknowledged': <CheckSquareOutlined />,
  'Rejected': <CloseCircleOutlined />
};

// Map config colors to Ant Design Tag presets
const getTagColor = (status: WorkflowStatus): string => {
  const config = WORKFLOW_STATUS_CONFIG[status];
  if (!config) return 'default';

  // Map our color names to Ant Design tag colors
  switch (config.color) {
    case 'default':
      return 'default';
    case 'blue':
      return 'blue';
    case 'processing':
      return 'processing';
    case 'cyan':
      return 'cyan';
    case 'geekblue':
      return 'geekblue';
    case 'green':
      return 'green';
    case 'orange':
      return 'orange';
    case 'purple':
      return 'purple';
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({
  status,
  showIcon = true,
  showTooltip = true,
  size = 'default'
}) => {
  const config = WORKFLOW_STATUS_CONFIG[status];

  if (!config) {
    return <Tag>{status}</Tag>;
  }

  const tagContent = (
    <Tag
      color={getTagColor(status)}
      icon={showIcon ? STATUS_ICONS[status] : undefined}
      style={size === 'small' ? { fontSize: 11, padding: '0 4px' } : undefined}
    >
      {config.label}
    </Tag>
  );

  if (showTooltip) {
    return (
      <Tooltip title={config.description}>
        {tagContent}
      </Tooltip>
    );
  }

  return tagContent;
};

/**
 * Compact version for use in tables and lists
 */
export const WorkflowStatusTag: React.FC<{ status: WorkflowStatus }> = ({ status }) => (
  <WorkflowStatusBadge status={status} showIcon={false} showTooltip={true} size="small" />
);

/**
 * Full version with icon for detailed views
 */
export const WorkflowStatusFull: React.FC<{ status: WorkflowStatus }> = ({ status }) => (
  <WorkflowStatusBadge status={status} showIcon={true} showTooltip={true} />
);

export default WorkflowStatusBadge;
