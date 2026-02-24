/**
 * Investigator Notification Service - Phase 6
 */
import { InvestigatorNotificationRepository } from '../database/repositories/investigatorNotification.repository';
import type { InvestigatorNotification, NotificationDistribution, InvestigatorNotificationListItem, InvestigatorNotificationFilter, CreateInvestigatorNotificationDTO, CreateDistributionDTO } from '../../shared/types/investigatorNotification.types';

export class InvestigatorNotificationService {
  private repo: InvestigatorNotificationRepository;
  constructor(repo: InvestigatorNotificationRepository) { this.repo = repo; }
  findAll(filter?: InvestigatorNotificationFilter): InvestigatorNotificationListItem[] { return this.repo.findAll(filter); }
  findById(id: number): InvestigatorNotification | null { return this.repo.findById(id); }
  create(data: CreateInvestigatorNotificationDTO): InvestigatorNotification { return this.repo.create(data); }
  addDistribution(data: CreateDistributionDTO): NotificationDistribution { return this.repo.addDistribution(data); }
  markSent(distributionId: number): void { this.repo.markSent(distributionId); }
  markAcknowledged(distributionId: number, acknowledgedBy: string): void { this.repo.markAcknowledged(distributionId, acknowledgedBy); }
}
