/**
 * Phase 6: Protocol Deviation Types
 */

export type DeviationCategory =
  | 'inclusion_exclusion'
  | 'informed_consent'
  | 'prohibited_med'
  | 'dose_modification'
  | 'visit_schedule'
  | 'specimen'
  | 'other';

export interface ProtocolDeviation {
  id?: number;
  deviationId: string;
  studyId: number;
  siteId?: number;
  subjectNumber?: string;
  deviationDate: string;
  category: DeviationCategory;
  description: string;
  impactOnSafety?: string;
  impactOnData?: string;
  correctiveAction?: string;
  reportedToIrb: boolean;
  irbReportDate?: string;
  reportedToSponsor: boolean;
  sponsorReportDate?: string;
  createdBy?: number;
  createdAt?: string;
  // Related
  linkedCaseIds?: string[];
}

export interface DeviationCase {
  deviationId: number;
  caseId: string;
}

export interface DeviationListItem {
  id: number;
  deviationId: string;
  studyId: number;
  subjectNumber?: string;
  deviationDate: string;
  category: DeviationCategory;
  description: string;
  linkedCaseCount?: number;
}

export interface DeviationFilter {
  studyId?: number;
  siteId?: number;
  category?: DeviationCategory;
  subjectNumber?: string;
  search?: string;
}

export interface CreateDeviationDTO {
  deviationId: string;
  studyId: number;
  siteId?: number;
  subjectNumber?: string;
  deviationDate: string;
  category: DeviationCategory;
  description: string;
  impactOnSafety?: string;
  impactOnData?: string;
  correctiveAction?: string;
}

export type UpdateDeviationDTO = Partial<Omit<ProtocolDeviation, 'id' | 'createdAt' | 'createdBy'>>;
