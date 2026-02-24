/**
 * IND Case Service - Phase 6
 * SUSAR determination, timeline calculation, dual causality, expectedness, unblinding
 */

import { INDCaseRepository } from '../database/repositories/indCase.repository';
import { IBRepository } from '../database/repositories/ib.repository';
import type {
  CausalityAssessment, UnblindingRecord, SUSARDetermination,
  DualCausalityCheck, ExpectednessAssessmentData,
  CreateCausalityDTO, UnblindingRequest, UnblindingApproval,
  CausalityRelationship
} from '../../shared/types/indCase.types';

export class INDCaseService {
  private indRepo: INDCaseRepository;
  private ibRepo: IBRepository;

  constructor(indRepo: INDCaseRepository, ibRepo: IBRepository) {
    this.indRepo = indRepo;
    this.ibRepo = ibRepo;
  }

  getCausalityAssessments(caseId: string): CausalityAssessment[] {
    return this.indRepo.getCausalityAssessments(caseId);
  }

  saveCausalityAssessment(data: CreateCausalityDTO): CausalityAssessment {
    return this.indRepo.saveCausalityAssessment(data);
  }

  deleteCausalityAssessment(id: number): void {
    this.indRepo.deleteCausalityAssessment(id);
  }

  getDualCausality(caseId: string): DualCausalityCheck {
    const assessments = this.indRepo.getCausalityAssessments(caseId);
    const investigator = assessments.find(a => a.assessorType === 'investigator');
    const sponsor = assessments.find(a => a.assessorType === 'sponsor');

    const assessmentsDiffer = !!(investigator && sponsor && investigator.relationship !== sponsor.relationship);

    // A reaction is "suspected" if either investigator or sponsor considers it at least possibly related
    const causalRelationships: CausalityRelationship[] = ['related', 'probably_related', 'possibly_related'];
    const overallCausal = !!(
      (investigator && causalRelationships.includes(investigator.relationship)) ||
      (sponsor && causalRelationships.includes(sponsor.relationship))
    );

    return {
      investigatorAssessment: investigator,
      sponsorAssessment: sponsor,
      assessmentsDiffer,
      overallCausalRelationship: overallCausal
    };
  }

  assessExpectedness(caseId: string, meddraPtCode: number, reportedSeverity?: string): ExpectednessAssessmentData {
    const caseFields = this.indRepo.getCaseINDFields(caseId);
    if (!caseFields?.study_id) {
      return {
        reactionTerm: '', meddraPtCode, isListed: false,
        severityExceeds: false, determination: 'unexpected',
        justification: 'No study linked to case'
      };
    }

    const lookup = this.ibRepo.lookupExpectedness(caseFields.study_id, meddraPtCode);

    let severityExceeds = false;
    if (lookup.isListed && lookup.reaction && reportedSeverity && lookup.reaction.documentedSeverity) {
      const severityOrder = ['mild', 'moderate', 'severe', 'grade 1', 'grade 2', 'grade 3', 'grade 4'];
      const reportedIdx = severityOrder.findIndex(s => reportedSeverity.toLowerCase().includes(s));
      const documentedIdx = severityOrder.findIndex(s => (lookup.reaction!.documentedSeverity || '').toLowerCase().includes(s));
      severityExceeds = reportedIdx > documentedIdx && documentedIdx >= 0;
    }

    const determination = (!lookup.isListed || severityExceeds) ? 'unexpected' : 'expected';

    return {
      reactionTerm: lookup.reaction?.meddraPtName || '',
      meddraPtCode,
      isListed: lookup.isListed,
      ibVersion: lookup.ibVersion,
      ibSection: lookup.reaction?.ibSection,
      ibPage: lookup.reaction?.ibPage,
      documentedSeverity: lookup.reaction?.documentedSeverity,
      reportedSeverity,
      severityExceeds,
      determination,
      justification: determination === 'unexpected'
        ? (severityExceeds
          ? `Severity exceeds IB documentation (reported: ${reportedSeverity}, documented: ${lookup.reaction?.documentedSeverity})`
          : 'Event not listed in current Investigator Brochure')
        : 'Event listed in IB at observed specificity/severity'
    };
  }

  getSUSARDetermination(caseId: string): SUSARDetermination {
    const caseFields = this.indRepo.getCaseINDFields(caseId);
    const isSerious = this.indRepo.isCaseSerious(caseId);
    const isFatalOrLifeThreatening = this.indRepo.isCaseFatalOrLifeThreatening(caseId);
    const dualCausality = this.getDualCausality(caseId);

    const isUnexpected = caseFields?.is_expected === 0;
    const isSuspectedReaction = dualCausality.overallCausalRelationship;
    const isSUSAR = isSerious && isUnexpected && isSuspectedReaction;

    let reportType: any = 'annual_only';
    if (isSUSAR) {
      reportType = isFatalOrLifeThreatening ? '7_day' : '15_day';
    }

    // Calculate due date
    const dateInformed = caseFields?.date_informed || new Date().toISOString().split('T')[0];
    const informedDate = new Date(dateInformed);
    const days = reportType === '7_day' ? 7 : reportType === '15_day' ? 15 : 365;
    const dueDate = new Date(informedDate);
    dueDate.setDate(dueDate.getDate() + days);

    const today = new Date();
    const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isSerious,
      isUnexpected,
      isSuspectedReaction,
      isSUSAR,
      isFatalOrLifeThreatening,
      reportType,
      dueDate: dueDate.toISOString().split('T')[0],
      daysRemaining,
      dateInformed
    };
  }

  requestUnblinding(data: UnblindingRequest): UnblindingRecord {
    return this.indRepo.requestUnblinding(data);
  }

  approveUnblinding(data: UnblindingApproval): UnblindingRecord {
    return this.indRepo.approveUnblinding(data);
  }

  getUnblindingRecords(caseId: string): UnblindingRecord[] {
    return this.indRepo.getUnblindingRecords(caseId);
  }
}
