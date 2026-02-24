/**
 * Form FDA 3500A Generator Service - Phase 6
 * Maps case data to Form 3500A sections and generates PDF
 */

import type { Form3500AData, Form3500AProduct, Form3500AOutcomes, Form3500AGenerateResponse, Form3500APreviewData } from '../../shared/types/form3500a.types';
import type { Case, CaseReporter, CaseReaction, CaseDrug } from '../../shared/types/case.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

export class Form3500AGeneratorService {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Generate Form 3500A data from a case
   */
  getPreviewData(caseId: string): Form3500APreviewData {
    const caseData = this.db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId) as any;
    if (!caseData) throw new Error('Case not found');

    const reporters = this.db.prepare('SELECT * FROM case_reporters WHERE case_id = ? ORDER BY sort_order').all(caseId) as any[];
    const reactions = this.db.prepare('SELECT * FROM case_reactions WHERE case_id = ? ORDER BY sort_order').all(caseId) as any[];
    const drugs = this.db.prepare('SELECT * FROM case_drugs WHERE case_id = ? ORDER BY sort_order').all(caseId) as any[];

    const data = this.mapCaseToForm(caseData, reporters, reactions, drugs);
    const missingRequiredFields = this.validateRequiredFields(data);
    const warnings = this.getWarnings(data);

    return { data, missingRequiredFields, warnings };
  }

  /**
   * Generate Form 3500A PDF
   */
  generate(caseId: string, isDraft: boolean = false): Form3500AGenerateResponse {
    const preview = this.getPreviewData(caseId);

    // For now, generate a simple text-based representation
    // Full PDF generation would require a library like pdf-lib or jsPDF
    const pdfPath = ''; // Placeholder - would be actual file path

    return {
      pdfPath,
      validationErrors: preview.missingRequiredFields,
      isDraft
    };
  }

  private mapCaseToForm(caseData: any, reporters: any[], reactions: any[], drugs: any[]): Form3500AData {
    const primaryReporter = reporters.find(r => r.is_primary) || reporters[0];

    // Map outcomes from reactions
    const outcomes: Form3500AOutcomes = {
      death: reactions.some(r => r.serious_death),
      lifeThreatening: reactions.some(r => r.serious_life_threat),
      hospitalization: reactions.some(r => r.serious_hospitalization),
      disability: reactions.some(r => r.serious_disability),
      congenitalAnomaly: reactions.some(r => r.serious_congenital),
      requiredIntervention: false,
      other: reactions.some(r => r.serious_other)
    };

    if (caseData.death_date) outcomes.deathDate = caseData.death_date;

    // Map products
    const products: Form3500AProduct[] = drugs.map(d => ({
      productName: d.product_name,
      dose: d.dosages ? undefined : undefined,
      route: undefined,
      therapyStartDate: d.start_date || undefined,
      therapyEndDate: d.end_date || undefined,
      diagnosisForUse: d.indication || undefined,
      lotNumber: d.lot_number || undefined,
      expirationDate: d.expiration_date || undefined,
      ndcNumber: d.ndc_number || undefined,
      isConcomitant: d.characterization !== 1
    }));

    // Build event description from reactions
    const eventDescription = reactions.map(r => r.reaction_term).join('; ');

    // Get study/IND info for IND cases
    let indNumber: string | undefined;
    let protocolNumber: string | undefined;
    if (caseData.study_id) {
      const study = this.db.prepare('SELECT * FROM studies WHERE id = ?').get(caseData.study_id) as any;
      if (study) {
        protocolNumber = study.protocol_number;
        const ind = this.db.prepare('SELECT ind_number FROM study_inds WHERE study_id = ? AND is_primary = 1').get(study.id) as any;
        if (ind) indNumber = ind.ind_number;
      }
    }

    return {
      patientIdentifier: caseData.patient_initials || undefined,
      patientAge: caseData.patient_age || undefined,
      patientAgeUnit: caseData.patient_age_unit || undefined,
      patientSex: caseData.patient_sex !== null ? (caseData.patient_sex === 1 ? 'Male' : caseData.patient_sex === 2 ? 'Female' : 'Unknown') : undefined,
      patientWeight: caseData.patient_weight || undefined,
      patientWeightUnit: 'kg',

      eventDescription,
      eventOnsetDate: reactions[0]?.start_date || undefined,
      eventReportDate: caseData.receipt_date || undefined,
      outcomes,

      products,

      reporterName: primaryReporter ? `${primaryReporter.given_name || ''} ${primaryReporter.family_name || ''}`.trim() : undefined,
      reporterAddress: primaryReporter?.address || undefined,
      reporterPhone: primaryReporter?.phone || undefined,
      reporterEmail: primaryReporter?.email || undefined,
      reporterOccupation: primaryReporter?.qualification ? this.mapQualification(primaryReporter.qualification) : undefined,
      isHealthProfessional: primaryReporter?.qualification ? primaryReporter.qualification <= 3 : undefined,

      indNumber,
      protocolNumber,
      reportType: caseData.ind_report_type === '7_day' ? '7_day' : caseData.ind_report_type === '15_day' ? '15_day' : undefined,
      dateReceivedFromInvestigator: caseData.date_informed || undefined
    };
  }

  private validateRequiredFields(data: Form3500AData): string[] {
    const missing: string[] = [];
    if (!data.patientIdentifier) missing.push('Patient identifier');
    if (!data.eventDescription) missing.push('Event description');
    if (!data.products || data.products.length === 0) missing.push('At least one suspect product');
    if (!data.reporterName) missing.push('Reporter name');
    return missing;
  }

  private getWarnings(data: Form3500AData): string[] {
    const warnings: string[] = [];
    if (!data.patientAge) warnings.push('Patient age not provided');
    if (!data.patientSex) warnings.push('Patient sex not provided');
    if (!data.eventOnsetDate) warnings.push('Event onset date not provided');
    return warnings;
  }

  private mapQualification(code: number): string {
    switch (code) {
      case 1: return 'Physician';
      case 2: return 'Pharmacist';
      case 3: return 'Other Health Professional';
      case 4: return 'Lawyer';
      case 5: return 'Consumer';
      default: return 'Unknown';
    }
  }
}
