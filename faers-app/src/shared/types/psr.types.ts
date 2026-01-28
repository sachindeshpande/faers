/**
 * PSR (Periodic Safety Report) Types
 * Phase 4: PSR Scheduling and Management
 */

// PSR format types
export type PSRFormat = 'PADER' | 'PSUR' | 'PBRER';

// PSR frequency types
export type PSRFrequency = 'quarterly' | 'semi_annual' | 'annual' | 'biennial';

// PSR status values
export type PSRStatus =
  | 'scheduled'     // Upcoming, not yet started
  | 'draft'         // In preparation
  | 'under_review'  // Under review
  | 'approved'      // Approved for submission
  | 'submitted'     // Submitted to FDA
  | 'acknowledged'  // Acknowledgment received
  | 'closed';       // Period closed

// Labels for PSR formats
export const PSR_FORMAT_LABELS: Record<PSRFormat, string> = {
  PADER: 'PADER (Post-Approval Adverse Drug Experience Report)',
  PSUR: 'PSUR (Periodic Safety Update Report)',
  PBRER: 'PBRER (Periodic Benefit-Risk Evaluation Report)'
};

// Labels for frequencies
export const PSR_FREQUENCY_LABELS: Record<PSRFrequency, string> = {
  quarterly: 'Quarterly (every 3 months)',
  semi_annual: 'Semi-Annual (every 6 months)',
  annual: 'Annual (every 12 months)',
  biennial: 'Biennial (every 24 months)'
};

// Frequency in months
export const PSR_FREQUENCY_MONTHS: Record<PSRFrequency, number> = {
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
  biennial: 24
};

// Labels for PSR statuses
export const PSR_STATUS_LABELS: Record<PSRStatus, string> = {
  scheduled: 'Scheduled',
  draft: 'Draft',
  under_review: 'Under Review',
  approved: 'Approved',
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  closed: 'Closed'
};

// Status colors for UI
export const PSR_STATUS_COLORS: Record<PSRStatus, string> = {
  scheduled: 'default',
  draft: 'processing',
  under_review: 'orange',
  approved: 'success',
  submitted: 'blue',
  acknowledged: 'green',
  closed: 'default'
};

// Valid status transitions
export const PSR_STATUS_TRANSITIONS: Record<PSRStatus, PSRStatus[]> = {
  scheduled: ['draft'],
  draft: ['under_review'],
  under_review: ['draft', 'approved'],
  approved: ['under_review', 'submitted'],
  submitted: ['acknowledged'],
  acknowledged: ['closed'],
  closed: []
};

// PSR Schedule configuration
export interface PSRSchedule {
  id: number;
  productId: number;
  psrFormat: PSRFormat;
  frequency: PSRFrequency;
  dlpOffsetDays: number;    // Days before period end for data lock point
  dueOffsetDays: number;    // Days after period end for due date
  startDate?: string;       // Start date for first period
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  productName?: string;
}

// PSR record
export interface PSR {
  id: number;
  psrNumber: string;
  productId: number;
  psrFormat: PSRFormat;
  periodStart: string;
  periodEnd: string;
  dataLockPoint: string;
  dueDate: string;
  status: PSRStatus;
  descriptivePortionPath?: string;
  ectdSubmissionRef?: string;
  icsrBatchId?: number;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  productName?: string;
  caseCounts?: {
    included: number;
    excluded: number;
    pending: number;
  };
}

// PSR list item (for table display)
export interface PSRListItem {
  id: number;
  psrNumber: string;
  productId: number;
  productName?: string;
  psrFormat: PSRFormat;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: PSRStatus;
  includedCaseCount: number;
  excludedCaseCount: number;
  daysUntilDue?: number;
  isOverdue?: boolean;
}

// PSR case record
export interface PSRCase {
  psrId: number;
  caseId: string;
  included: boolean;
  exclusionReason?: string;
  addedAt: string;
  addedBy?: string;
  // Joined case fields
  safetyReportId?: string;
  patientInitials?: string;
  reportType?: string;
  reportTypeClassification?: string;
  workflowStatus?: string;
  receiptDate?: string;
  createdAt?: string;
}

// Create/Update PSR Schedule DTO
export interface CreatePSRScheduleDTO {
  productId: number;
  psrFormat: PSRFormat;
  frequency: PSRFrequency;
  dlpOffsetDays?: number;
  dueOffsetDays?: number;
  startDate?: string;
}

export interface UpdatePSRScheduleDTO {
  psrFormat?: PSRFormat;
  frequency?: PSRFrequency;
  dlpOffsetDays?: number;
  dueOffsetDays?: number;
  startDate?: string;
  isActive?: boolean;
}

// Create PSR DTO
export interface CreatePSRDTO {
  productId: number;
  scheduleId?: number;
  psrFormat: PSRFormat;
  periodStart: string;
  periodEnd: string;
  dataLockPoint?: string;
  dueDate?: string;
}

// Filter options for PSR list
export interface PSRFilter {
  productId?: number;
  psrFormat?: PSRFormat;
  status?: PSRStatus;
  fromDate?: string;
  toDate?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  overdue?: boolean;
  search?: string;
}

// PSR list response
export interface PSRListResponse {
  psrs: PSRListItem[];
  total: number;
}

// Upcoming PSR deadline
export interface UpcomingPSRDeadline {
  psrId: number;
  psrNumber: string;
  productId: number;
  productName?: string;
  psrFormat: PSRFormat;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: PSRStatus;
  daysUntilDue: number;
  casesIncluded: number;
  casesPending: number;
}

// PSR Dashboard summary
export interface PSRDashboardSummary {
  upcomingDeadlines: PSRListItem[];
  overduePSRs: PSRListItem[];
  dueThisWeek: PSRListItem[];
  psrsInProgress: PSRListItem[];
  statusCounts: Record<string, number>;
  casesAwaitingPSR: number;
  totalScheduled: number;
  totalOverdue: number;
  recentActivity?: Array<{
    psrNumber: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

// Period calculation result
export interface PSRPeriodCalculation {
  periodStart: string;
  periodEnd: string;
  dataLockPoint: string;
  dueDate: string;
  periodNumber: number;
}

// Update PSR cases request
export interface UpdatePSRCasesRequest {
  psrId: number;
  includeCases?: string[];
  excludeCases?: Array<{ caseId: string; reason?: string }>;
}

// PSR workflow transition request
export interface PSRTransitionRequest {
  psrId: number;
  toStatus: PSRStatus;
  comment?: string;
}
