/**
 * PSR Service
 * Phase 4: Business logic for PSR scheduling and management
 */

import type { Database as DatabaseType } from 'better-sqlite3';
import { PSRRepository } from '../database/repositories/psr.repository';
import { AuditService } from './auditService';
import type {
  PSRSchedule,
  PSR,
  PSRListItem,
  PSRCase,
  PSRFormat,
  PSRFrequency,
  PSRStatus,
  PSRFilter,
  CreatePSRScheduleDTO,
  UpdatePSRScheduleDTO,
  CreatePSRDTO,
  PSRPeriodCalculation,
  UpcomingPSRDeadline,
  PSRDashboardSummary
} from '../../shared/types/psr.types';
import { PSR_FREQUENCY_MONTHS } from '../../shared/types/psr.types';

export class PSRService {
  private psrRepo: PSRRepository;
  private auditService: AuditService;
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
    this.psrRepo = new PSRRepository(db);
    this.auditService = new AuditService(db);
  }

  // ============================================================
  // Schedule Management
  // ============================================================

  /**
   * Create a PSR schedule for a product
   */
  createSchedule(
    data: CreatePSRScheduleDTO,
    userId?: string,
    username?: string,
    sessionId?: string
  ): PSRSchedule {
    const schedule = this.psrRepo.createSchedule(data);

    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'config_change',
      entityType: 'product',
      entityId: String(data.productId),
      details: {
        action: 'psr_schedule_created',
        scheduleId: schedule.id,
        psrFormat: data.psrFormat,
        frequency: data.frequency
      }
    });

    return schedule;
  }

  /**
   * Update a PSR schedule
   */
  updateSchedule(
    id: number,
    data: UpdatePSRScheduleDTO,
    userId?: string,
    username?: string,
    sessionId?: string
  ): PSRSchedule | null {
    const existing = this.psrRepo.findScheduleById(id);
    if (!existing) return null;

    const updated = this.psrRepo.updateSchedule(id, data);

    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'config_change',
      entityType: 'product',
      entityId: String(existing.productId),
      details: {
        action: 'psr_schedule_updated',
        scheduleId: id,
        changes: data
      }
    });

    return updated;
  }

  /**
   * Get schedules for a product
   */
  getSchedulesByProduct(productId: number): PSRSchedule[] {
    return this.psrRepo.findSchedulesByProduct(productId);
  }

  /**
   * Get all active schedules
   */
  getActiveSchedules(): PSRSchedule[] {
    return this.psrRepo.findActiveSchedules();
  }

  /**
   * Delete a schedule
   */
  deleteSchedule(id: number, userId?: string, username?: string, sessionId?: string): boolean {
    const schedule = this.psrRepo.findScheduleById(id);
    if (!schedule) return false;

    const deleted = this.psrRepo.deleteSchedule(id);

    if (deleted) {
      this.auditService.log({
        userId,
        username,
        sessionId,
        actionType: 'config_change',
        entityType: 'product',
        entityId: String(schedule.productId),
        details: {
          action: 'psr_schedule_deleted',
          scheduleId: id
        }
      });
    }

    return deleted;
  }

  // ============================================================
  // Period Calculation
  // ============================================================

  /**
   * Calculate PSR period dates
   */
  calculatePeriod(
    startDate: string,
    frequency: PSRFrequency,
    periodNumber: number,
    dlpOffsetDays: number,
    dueOffsetDays: number
  ): PSRPeriodCalculation {
    const months = PSR_FREQUENCY_MONTHS[frequency];
    const start = new Date(startDate);

    // Calculate period start (skip previous periods)
    const periodStart = new Date(start);
    periodStart.setMonth(periodStart.getMonth() + (months * (periodNumber - 1)));

    // Calculate period end
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + months);
    periodEnd.setDate(periodEnd.getDate() - 1); // Last day of period

    // Calculate DLP (data lock point)
    const dlp = new Date(periodEnd);
    dlp.setDate(dlp.getDate() - dlpOffsetDays);

    // Calculate due date
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + dueOffsetDays);

    return {
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      dataLockPoint: dlp.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      periodNumber
    };
  }

  /**
   * Get next period for a schedule
   */
  getNextPeriod(schedule: PSRSchedule): PSRPeriodCalculation {
    // Find the last PSR for this product and format
    const lastPSR = this.db.prepare(`
      SELECT MAX(period_end) as last_period_end
      FROM psrs
      WHERE product_id = ? AND psr_format = ?
    `).get(schedule.productId, schedule.psrFormat) as { last_period_end: string | null };

    let periodNumber = 1;
    let startDate = schedule.startDate;

    if (lastPSR?.last_period_end) {
      // Calculate next period after last one
      const lastEnd = new Date(lastPSR.last_period_end);
      lastEnd.setDate(lastEnd.getDate() + 1);
      startDate = lastEnd.toISOString().split('T')[0];

      // Count existing PSRs
      const countResult = this.db.prepare(`
        SELECT COUNT(*) as count FROM psrs
        WHERE product_id = ? AND psr_format = ?
      `).get(schedule.productId, schedule.psrFormat) as { count: number };
      periodNumber = countResult.count + 1;
    } else if (!startDate) {
      // Use product approval date or today
      const product = this.db.prepare(`
        SELECT us_approval_date FROM products WHERE id = ?
      `).get(schedule.productId) as { us_approval_date: string | null };
      startDate = product?.us_approval_date || new Date().toISOString().split('T')[0];
    }

    return this.calculatePeriod(
      startDate!,
      schedule.frequency,
      periodNumber,
      schedule.dlpOffsetDays,
      schedule.dueOffsetDays
    );
  }

  // ============================================================
  // PSR Management
  // ============================================================

  /**
   * Create a new PSR
   */
  createPSR(
    data: CreatePSRDTO,
    userId?: string,
    username?: string,
    sessionId?: string
  ): PSR {
    const psr = this.psrRepo.createPSR(data, userId);

    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'case_create', // Reusing case_create action type
      entityType: 'product',
      entityId: String(data.productId),
      details: {
        action: 'psr_created',
        psrId: psr.id,
        psrNumber: psr.psrNumber,
        psrFormat: data.psrFormat,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd
      }
    });

    return psr;
  }

  /**
   * Get PSR by ID
   */
  getPSR(id: number): PSR | null {
    return this.psrRepo.findPSRById(id);
  }

  /**
   * List PSRs
   */
  listPSRs(filter?: PSRFilter, limit = 50, offset = 0): { psrs: PSRListItem[]; total: number } {
    return this.psrRepo.listPSRs(filter, limit, offset);
  }

  /**
   * Transition PSR status
   */
  transitionPSR(
    psrId: number,
    toStatus: PSRStatus,
    userId?: string,
    username?: string,
    sessionId?: string,
    comment?: string
  ): PSR | null {
    const psr = this.psrRepo.findPSRById(psrId);
    if (!psr) return null;

    // Validate transition
    const validTransitions: Record<PSRStatus, PSRStatus[]> = {
      scheduled: ['draft'],
      draft: ['under_review', 'closed'],
      under_review: ['approved', 'draft'],
      approved: ['submitted', 'draft'],
      submitted: ['acknowledged', 'approved'],
      acknowledged: ['closed'],
      closed: []
    };

    if (!validTransitions[psr.status]?.includes(toStatus)) {
      throw new Error(`Cannot transition from ${psr.status} to ${toStatus}`);
    }

    this.psrRepo.updatePSRStatus(psrId, toStatus, toStatus === 'approved' ? userId : undefined);

    // Update cases if submitted
    if (toStatus === 'submitted') {
      const cases = this.psrRepo.getPSRCases(psrId);
      for (const c of cases) {
        if (c.included) {
          this.db.prepare(`
            UPDATE cases SET workflow_status = 'Included in PSR', updated_at = ? WHERE id = ?
          `).run(new Date().toISOString(), c.caseId);
        }
      }
    }

    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'workflow_transition',
      entityType: 'product',
      entityId: String(psr.productId),
      details: {
        action: 'psr_status_changed',
        psrId,
        psrNumber: psr.psrNumber,
        fromStatus: psr.status,
        toStatus,
        comment
      }
    });

    return this.psrRepo.findPSRById(psrId);
  }

  // ============================================================
  // PSR Cases Management
  // ============================================================

  /**
   * Get cases for a PSR
   */
  getPSRCases(psrId: number): PSRCase[] {
    return this.psrRepo.getPSRCases(psrId);
  }

  /**
   * Add cases to PSR
   */
  addCasesToPSR(
    psrId: number,
    caseIds: string[],
    userId?: string,
    username?: string,
    sessionId?: string
  ): void {
    for (const caseId of caseIds) {
      this.psrRepo.addCaseToPSR(psrId, caseId, userId, true);
    }

    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'case_update',
      entityType: 'product',
      details: {
        action: 'psr_cases_added',
        psrId,
        caseIds
      }
    });
  }

  /**
   * Exclude cases from PSR
   */
  excludeCasesFromPSR(
    psrId: number,
    exclusions: Array<{ caseId: string; reason?: string }>,
    userId?: string,
    username?: string,
    sessionId?: string
  ): void {
    for (const { caseId, reason } of exclusions) {
      this.psrRepo.excludeCaseFromPSR(psrId, caseId, reason);
    }

    this.auditService.log({
      userId,
      username,
      sessionId,
      actionType: 'case_update',
      entityType: 'product',
      details: {
        action: 'psr_cases_excluded',
        psrId,
        exclusions
      }
    });
  }

  /**
   * Get eligible cases for a PSR
   */
  getEligibleCases(psrId: number): Array<{
    caseId: string;
    safetyReportId?: string;
    patientInitials?: string;
    workflowStatus?: string;
    createdAt: string;
    alreadyInPSR: boolean;
    isIncluded?: boolean;
  }> {
    const psr = this.psrRepo.findPSRById(psrId);
    if (!psr) return [];

    return this.psrRepo.getEligibleCasesForPSR(
      psr.productId,
      psr.periodStart,
      psr.periodEnd,
      psrId
    );
  }

  // ============================================================
  // Dashboard
  // ============================================================

  /**
   * Get dashboard summary
   */
  getDashboardSummary(): PSRDashboardSummary {
    const today = new Date();
    const upcomingDate = new Date(today);
    upcomingDate.setDate(upcomingDate.getDate() + 90);

    // Get upcoming deadlines (next 90 days)
    const upcoming = this.psrRepo.listPSRs({
      fromDate: today.toISOString().split('T')[0],
      toDate: upcomingDate.toISOString().split('T')[0]
    }, 10, 0);

    // Get overdue PSRs
    const overdue = this.psrRepo.listPSRs({ overdue: true }, 10, 0);

    // Get PSRs in progress
    const inProgress = this.db.prepare(`
      SELECT psr.*, p.product_name,
             (SELECT COUNT(*) FROM psr_cases WHERE psr_id = psr.id AND included = 1) as included_count,
             (SELECT COUNT(*) FROM psr_cases WHERE psr_id = psr.id AND included = 0) as excluded_count
      FROM psrs psr
      LEFT JOIN products p ON psr.product_id = p.id
      WHERE psr.status IN ('draft', 'under_review')
      ORDER BY psr.due_date ASC
      LIMIT 10
    `).all() as Array<{
      id: number;
      psr_number: string;
      product_id: number;
      product_name: string;
      psr_format: string;
      period_start: string;
      period_end: string;
      due_date: string;
      status: string;
      included_count: number;
      excluded_count: number;
    }>;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const psrsInProgress: PSRListItem[] = inProgress.map(row => {
      const dueDate = new Date(row.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: row.id,
        psrNumber: row.psr_number,
        productId: row.product_id,
        productName: row.product_name,
        psrFormat: row.psr_format as PSRFormat,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        dueDate: row.due_date,
        status: row.status as PSRStatus,
        includedCases: row.included_count,
        excludedCases: row.excluded_count,
        daysUntilDue,
        isOverdue: daysUntilDue < 0
      };
    });

    // Count totals
    const scheduled = this.db.prepare(`
      SELECT COUNT(*) as count FROM psrs WHERE status = 'scheduled'
    `).get() as { count: number };

    const overdueCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM psrs
      WHERE due_date < date('now') AND status NOT IN ('submitted', 'acknowledged', 'closed')
    `).get() as { count: number };

    // Map upcoming to UpcomingPSRDeadline
    const upcomingDeadlines: UpcomingPSRDeadline[] = upcoming.psrs.map(psr => ({
      psrId: psr.id,
      psrNumber: psr.psrNumber,
      productId: psr.productId,
      productName: psr.productName,
      psrFormat: psr.psrFormat,
      periodStart: psr.periodStart,
      periodEnd: psr.periodEnd,
      dueDate: psr.dueDate,
      status: psr.status,
      daysUntilDue: psr.daysUntilDue,
      casesIncluded: psr.includedCases,
      casesPending: 0 // Would need additional query
    }));

    return {
      upcomingDeadlines,
      overduePSRs: overdue.psrs,
      psrsInProgress,
      totalScheduled: scheduled.count,
      totalOverdue: overdueCount.count
    };
  }
}
