/**
 * Phase 6: IND Case Types - Causality, Expectedness, Unblinding, SUSAR
 */

export type CaseType = 'postmarket' | 'ind' | 'babe';

export type CausalityRelationship =
  | 'related'
  | 'probably_related'
  | 'possibly_related'
  | 'unlikely_related'
  | 'not_related'
  | 'not_assessable';

export type AssessorType = 'investigator' | 'sponsor' | 'independent';

export type UnblindingReason =
  | 'medical_emergency'
  | 'serious_unexpected'
  | 'regulatory'
  | 'sponsor_assessment'
  | 'study_completion'
  | 'other';

export type INDReportType = '7_day' | '15_day' | 'followup_7day' | 'followup_15day' | 'annual_only';

export interface CausalityAssessment {
  id?: number;
  caseId: string;
  assessorType: AssessorType;
  assessorName?: string;
  assessmentDate: string;
  relationship: CausalityRelationship;
  justification?: string;
  createdBy?: number;
  createdAt?: string;
}

export interface UnblindingRecord {
  id?: number;
  caseId: string;
  requestDate: string;
  requestReason: UnblindingReason;
  requestJustification?: string;
  requestedBy?: number;
  requestedByName?: string;
  approvalRequired: boolean;
  approvedBy?: number;
  approvedByName?: string;
  approvedAt?: string;
  unblindingDate?: string;
  treatmentArmRevealed?: string;
  createdAt?: string;
}

export interface SUSARDetermination {
  isSerious: boolean;
  isUnexpected: boolean;
  isSuspectedReaction: boolean;
  isSUSAR: boolean;
  isFatalOrLifeThreatening: boolean;
  reportType: INDReportType;
  dueDate: string;
  daysRemaining: number;
  dateInformed: string;
}

export interface DualCausalityCheck {
  investigatorAssessment?: CausalityAssessment;
  sponsorAssessment?: CausalityAssessment;
  assessmentsDiffer: boolean;
  differenceExplanation?: string;
  overallCausalRelationship: boolean;
}

export interface ExpectednessAssessmentData {
  reactionTerm: string;
  meddraPtCode?: number;
  isListed: boolean;
  ibVersion?: string;
  ibSection?: string;
  ibPage?: string;
  documentedSeverity?: string;
  reportedSeverity?: string;
  severityExceeds: boolean;
  determination: 'expected' | 'unexpected';
  justification: string;
}

export interface CreateCausalityDTO {
  caseId: string;
  assessorType: AssessorType;
  assessorName?: string;
  assessmentDate: string;
  relationship: CausalityRelationship;
  justification?: string;
}

export interface UnblindingRequest {
  caseId: string;
  requestReason: UnblindingReason;
  requestJustification: string;
}

export interface UnblindingApproval {
  unblindingId: number;
  treatmentArmRevealed: string;
}
