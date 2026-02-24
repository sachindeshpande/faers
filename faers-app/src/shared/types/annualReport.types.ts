/**
 * Phase 6: IND Annual Safety Report Types
 */

export interface AnnualReportRequest {
  studyId: number;
  indNumber?: string;
  periodStart: string;
  periodEnd: string;
}

export interface AnnualReportData {
  studyId: number;
  studyTitle: string;
  protocolNumber: string;
  indNumber?: string;
  periodStart: string;
  periodEnd: string;
  totalCases: number;
  seriousUnexpectedCount: number;
  seriousExpectedCount: number;
  nonSeriousCount: number;
  lineListings: AnnualReportLineListing[];
  summaryTabulations: SummaryTabulation[];
  socSummary: SOCSummaryEntry[];
  causalitySummary: CausalitySummaryEntry[];
  outcomeSummary: OutcomeSummaryEntry[];
}

export interface AnnualReportLineListing {
  caseId: string;
  subjectNumber?: string;
  siteName?: string;
  eventTerm: string;
  meddraPtCode?: number;
  seriousness: string;
  causality: string;
  expectedness: string;
  outcome: string;
  onsetDate?: string;
  reportDate?: string;
  indReportType?: string;
  category: 'serious_unexpected' | 'serious_expected' | 'non_serious';
}

export interface SummaryTabulation {
  category: string;
  subcategory: string;
  count: number;
  percentage: number;
}

export interface SOCSummaryEntry {
  socName: string;
  totalCount: number;
  seriousCount: number;
  nonSeriousCount: number;
  terms: Array<{
    ptName: string;
    count: number;
    seriousCount: number;
  }>;
}

export interface CausalitySummaryEntry {
  relationship: string;
  count: number;
  percentage: number;
}

export interface OutcomeSummaryEntry {
  outcome: string;
  count: number;
  percentage: number;
}
