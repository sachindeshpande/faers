/**
 * Phase 6: Investigator Notification Types
 */

export type InvestigatorNotificationType = 'susar_alert' | 'ib_update' | 'safety_finding';

export interface InvestigatorNotification {
  id?: number;
  notificationType: InvestigatorNotificationType;
  studyId: number;
  caseId?: string;
  notificationDate: string;
  subjectLine: string;
  content?: string;
  attachmentPath?: string;
  createdBy?: number;
  createdAt?: string;
  // Related
  distributions?: NotificationDistribution[];
}

export interface NotificationDistribution {
  id?: number;
  notificationId: number;
  siteId: number;
  recipientName?: string;
  recipientEmail?: string;
  sentDate?: string;
  acknowledgedDate?: string;
  acknowledgedBy?: string;
}

export interface InvestigatorNotificationListItem {
  id: number;
  notificationType: InvestigatorNotificationType;
  studyId: number;
  caseId?: string;
  notificationDate: string;
  subjectLine: string;
  distributionCount?: number;
  acknowledgedCount?: number;
}

export interface InvestigatorNotificationFilter {
  studyId?: number;
  notificationType?: InvestigatorNotificationType;
  search?: string;
}

export interface CreateInvestigatorNotificationDTO {
  notificationType: InvestigatorNotificationType;
  studyId: number;
  caseId?: string;
  notificationDate: string;
  subjectLine: string;
  content?: string;
  attachmentPath?: string;
  siteIds?: number[];
}

export interface CreateDistributionDTO {
  notificationId: number;
  siteId: number;
  recipientName?: string;
  recipientEmail?: string;
}
