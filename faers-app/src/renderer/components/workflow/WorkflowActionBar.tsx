/**
 * Workflow Action Bar Component
 * Phase 3: Multi-User & Workflow Management
 *
 * Displays available workflow actions for a case based on
 * current status and user permissions.
 */

import React, { useEffect, useState } from 'react';
import { Space, Button, Dropdown, message, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  SendOutlined,
  UserSwitchOutlined,
  MoreOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useWorkflowStore, useWorkflowActions, useAvailableActions } from '../../stores/workflowStore';
import { useAuthStore } from '../../stores/authStore';
import type { WorkflowStatus } from '../../../shared/types/workflow.types';
import ApprovalDialog from './ApprovalDialog';
import RejectionDialog from './RejectionDialog';
import AssignmentDialog from './AssignmentDialog';

interface WorkflowActionBarProps {
  caseId: string;
  currentStatus: WorkflowStatus;
  onStatusChange?: (newStatus: WorkflowStatus) => void;
}

const WorkflowActionBar: React.FC<WorkflowActionBarProps> = ({
  caseId,
  currentStatus,
  onStatusChange
}) => {
  const { actions, isLoading } = useAvailableActions();
  const { fetchAvailableActions, transitionWorkflow } = useWorkflowActions();
  const { isTransitioning } = useWorkflowStore();
  const { hasPermission: _hasPermission } = useAuthStore();

  // Dialog states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    toStatus: WorkflowStatus;
    requiresSignature?: boolean;
    requiresAssignment?: boolean;
  } | null>(null);

  // Fetch available actions when case ID changes
  useEffect(() => {
    if (caseId) {
      fetchAvailableActions(caseId);
    }
  }, [caseId, currentStatus, fetchAvailableActions]);

  // Handle action click
  const handleAction = async (action: {
    action: string;
    toStatus?: WorkflowStatus;
    requiresComment?: boolean;
    requiresSignature?: boolean;
    requiresAssignment?: boolean;
  }) => {
    if (!action.toStatus) return;

    // If action requires approval dialog (signature)
    if (action.requiresSignature) {
      setPendingAction({
        toStatus: action.toStatus,
        requiresSignature: true
      });
      setApprovalDialogOpen(true);
      return;
    }

    // If action is a rejection
    if (action.action === 'reject' || action.toStatus === 'Rejected') {
      setPendingAction({ toStatus: action.toStatus });
      setRejectionDialogOpen(true);
      return;
    }

    // If action requires assignment
    if (action.requiresAssignment) {
      setPendingAction({
        toStatus: action.toStatus,
        requiresAssignment: true
      });
      setAssignmentDialogOpen(true);
      return;
    }

    // Simple transition without additional requirements
    const result = await transitionWorkflow({
      caseId,
      toStatus: action.toStatus
    });

    if (result.success) {
      message.success(`Case status updated to ${action.toStatus}`);
      onStatusChange?.(action.toStatus);
    } else {
      message.error(result.error || 'Failed to update case status');
    }
  };

  // Handle approval dialog submit
  const handleApprovalSubmit = async (comment: string, signature?: { password: string; meaning: string }) => {
    if (!pendingAction?.toStatus) return;

    const result = await transitionWorkflow({
      caseId,
      toStatus: pendingAction.toStatus,
      comment,
      signature
    });

    if (result.success) {
      message.success(`Case approved and moved to ${pendingAction.toStatus}`);
      setApprovalDialogOpen(false);
      setPendingAction(null);
      onStatusChange?.(pendingAction.toStatus);
    } else {
      message.error(result.error || 'Failed to approve case');
    }
  };

  // Handle rejection dialog submit
  const handleRejectionSubmit = async (reason: string) => {
    if (!pendingAction?.toStatus) return;

    const result = await transitionWorkflow({
      caseId,
      toStatus: pendingAction.toStatus,
      comment: reason
    });

    if (result.success) {
      message.success('Case has been rejected');
      setRejectionDialogOpen(false);
      setPendingAction(null);
      onStatusChange?.(pendingAction.toStatus);
    } else {
      message.error(result.error || 'Failed to reject case');
    }
  };

  // Handle assignment dialog submit
  const handleAssignmentSubmit = async (assignToUserId: string, comment?: string) => {
    if (!pendingAction?.toStatus) return;

    const result = await transitionWorkflow({
      caseId,
      toStatus: pendingAction.toStatus,
      comment,
      assignTo: assignToUserId
    });

    if (result.success) {
      message.success(`Case assigned and moved to ${pendingAction.toStatus}`);
      setAssignmentDialogOpen(false);
      setPendingAction(null);
      onStatusChange?.(pendingAction.toStatus);
    } else {
      message.error(result.error || 'Failed to assign case');
    }
  };

  // Get icon for action
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve':
        return <CheckOutlined />;
      case 'reject':
        return <CloseOutlined />;
      case 'submit':
        return <SendOutlined />;
      case 'assign':
        return <UserSwitchOutlined />;
      default:
        return <ArrowRightOutlined />;
    }
  };

  // Get button type for action
  const getButtonType = (action: string): 'primary' | 'default' | 'dashed' => {
    switch (action) {
      case 'approve':
        return 'primary';
      case 'reject':
        return 'default';
      default:
        return 'default';
    }
  };

  // Get button danger state
  const isButtonDanger = (action: string): boolean => {
    return action === 'reject';
  };

  if (isLoading) {
    return <Spin size="small" />;
  }

  if (actions.length === 0) {
    return null;
  }

  // Split actions into primary (first 2) and secondary (rest)
  const primaryActions = actions.slice(0, 2);
  const secondaryActions = actions.slice(2);

  const moreMenuItems: MenuProps['items'] = secondaryActions.map((action, index) => ({
    key: index,
    icon: getActionIcon(action.action),
    label: action.label,
    onClick: () => handleAction(action),
    danger: isButtonDanger(action.action)
  }));

  return (
    <>
      <Space>
        {primaryActions.map((action, index) => (
          <Button
            key={index}
            type={getButtonType(action.action)}
            icon={getActionIcon(action.action)}
            danger={isButtonDanger(action.action)}
            loading={isTransitioning}
            onClick={() => handleAction(action)}
          >
            {action.label}
          </Button>
        ))}

        {secondaryActions.length > 0 && (
          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
            <Button icon={<MoreOutlined />}>More Actions</Button>
          </Dropdown>
        )}
      </Space>

      {/* Approval Dialog */}
      <ApprovalDialog
        visible={approvalDialogOpen}
        requiresSignature={pendingAction?.requiresSignature}
        onSubmit={handleApprovalSubmit}
        onCancel={() => {
          setApprovalDialogOpen(false);
          setPendingAction(null);
        }}
        isLoading={isTransitioning}
      />

      {/* Rejection Dialog */}
      <RejectionDialog
        visible={rejectionDialogOpen}
        onSubmit={handleRejectionSubmit}
        onCancel={() => {
          setRejectionDialogOpen(false);
          setPendingAction(null);
        }}
        isLoading={isTransitioning}
      />

      {/* Assignment Dialog */}
      <AssignmentDialog
        visible={assignmentDialogOpen}
        caseId={caseId}
        targetStatus={pendingAction?.toStatus}
        onSubmit={handleAssignmentSubmit}
        onCancel={() => {
          setAssignmentDialogOpen(false);
          setPendingAction(null);
        }}
        isLoading={isTransitioning}
      />
    </>
  );
};

export default WorkflowActionBar;
