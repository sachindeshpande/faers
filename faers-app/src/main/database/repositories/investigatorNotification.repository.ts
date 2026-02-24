/**
 * Investigator Notification Repository - Phase 6
 */
import type { InvestigatorNotification, NotificationDistribution, InvestigatorNotificationListItem, InvestigatorNotificationFilter, CreateInvestigatorNotificationDTO, CreateDistributionDTO } from '../../../shared/types/investigatorNotification.types';
type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

export class InvestigatorNotificationRepository {
  private db: DatabaseInstance;
  constructor(db: DatabaseInstance) { this.db = db; }

  create(data: CreateInvestigatorNotificationDTO): InvestigatorNotification {
    const result = this.db.prepare(`
      INSERT INTO investigator_notifications (notification_type, study_id, case_id, notification_date, subject_line, content, attachment_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.notificationType, data.studyId, data.caseId || null, data.notificationDate, data.subjectLine, data.content || null, data.attachmentPath || null);
    const id = result.lastInsertRowid as number;
    // Auto-create distributions for specified sites
    if (data.siteIds && data.siteIds.length > 0) {
      const stmt = this.db.prepare('INSERT INTO notification_distribution (notification_id, site_id) VALUES (?, ?)');
      for (const siteId of data.siteIds) { stmt.run(id, siteId); }
    }
    return this.findById(id)!;
  }

  findById(id: number): InvestigatorNotification | null {
    const r = this.db.prepare('SELECT * FROM investigator_notifications WHERE id = ?').get(id) as any;
    if (!r) return null;
    const dists = this.db.prepare('SELECT * FROM notification_distribution WHERE notification_id = ?').all(id) as any[];
    return {
      id: r.id, notificationType: r.notification_type, studyId: r.study_id, caseId: r.case_id || undefined,
      notificationDate: r.notification_date, subjectLine: r.subject_line, content: r.content || undefined,
      attachmentPath: r.attachment_path || undefined, createdBy: r.created_by || undefined, createdAt: r.created_at,
      distributions: dists.map(d => ({ id: d.id, notificationId: d.notification_id, siteId: d.site_id, recipientName: d.recipient_name || undefined, recipientEmail: d.recipient_email || undefined, sentDate: d.sent_date || undefined, acknowledgedDate: d.acknowledged_date || undefined, acknowledgedBy: d.acknowledged_by || undefined }))
    };
  }

  findAll(filter?: InvestigatorNotificationFilter): InvestigatorNotificationListItem[] {
    let where = '1=1';
    const params: any[] = [];
    if (filter?.studyId) { where += ' AND study_id = ?'; params.push(filter.studyId); }
    if (filter?.notificationType) { where += ' AND notification_type = ?'; params.push(filter.notificationType); }
    if (filter?.search) { where += ' AND (subject_line LIKE ? OR content LIKE ?)'; const s = `%${filter.search}%`; params.push(s, s); }
    const rows = this.db.prepare(`
      SELECT n.*,
        (SELECT COUNT(*) FROM notification_distribution WHERE notification_id = n.id) as dist_count,
        (SELECT COUNT(*) FROM notification_distribution WHERE notification_id = n.id AND acknowledged_date IS NOT NULL) as ack_count
      FROM investigator_notifications n WHERE ${where} ORDER BY n.notification_date DESC
    `).all(...params) as any[];
    return rows.map(r => ({ id: r.id, notificationType: r.notification_type, studyId: r.study_id, caseId: r.case_id || undefined, notificationDate: r.notification_date, subjectLine: r.subject_line, distributionCount: r.dist_count, acknowledgedCount: r.ack_count }));
  }

  addDistribution(data: CreateDistributionDTO): NotificationDistribution {
    const result = this.db.prepare('INSERT INTO notification_distribution (notification_id, site_id, recipient_name, recipient_email) VALUES (?, ?, ?, ?)').run(data.notificationId, data.siteId, data.recipientName || null, data.recipientEmail || null);
    const r = this.db.prepare('SELECT * FROM notification_distribution WHERE id = ?').get(result.lastInsertRowid) as any;
    return { id: r.id, notificationId: r.notification_id, siteId: r.site_id, recipientName: r.recipient_name || undefined, recipientEmail: r.recipient_email || undefined, sentDate: r.sent_date || undefined, acknowledgedDate: r.acknowledged_date || undefined, acknowledgedBy: r.acknowledged_by || undefined };
  }

  markSent(distributionId: number): void {
    this.db.prepare('UPDATE notification_distribution SET sent_date = ? WHERE id = ?').run(new Date().toISOString(), distributionId);
  }

  markAcknowledged(distributionId: number, acknowledgedBy: string): void {
    this.db.prepare('UPDATE notification_distribution SET acknowledged_date = ?, acknowledged_by = ? WHERE id = ?').run(new Date().toISOString(), acknowledgedBy, distributionId);
  }
}
