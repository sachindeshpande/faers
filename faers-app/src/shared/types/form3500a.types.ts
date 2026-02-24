/**
 * Phase 6: Form FDA 3500A Types
 */

export interface Form3500AData {
  // Section A: Patient Information
  patientIdentifier?: string;
  patientAge?: number;
  patientAgeUnit?: string;
  patientSex?: string;
  patientWeight?: number;
  patientWeightUnit?: string;
  patientEthnicity?: string;
  patientRace?: string;

  // Section B: Adverse Event
  eventDescription?: string;
  eventOnsetDate?: string;
  eventReportDate?: string;
  outcomes: Form3500AOutcomes;
  relevantTests?: string;
  medicalHistory?: string;

  // Section C: Suspect Products
  products: Form3500AProduct[];

  // Section E: Initial Reporter
  reporterName?: string;
  reporterAddress?: string;
  reporterPhone?: string;
  reporterEmail?: string;
  reporterOccupation?: string;
  isHealthProfessional?: boolean;

  // Section G: Manufacturer Information
  manufacturerName?: string;
  manufacturerAddress?: string;
  manufacturerPhone?: string;
  indNumber?: string;
  ndaNumber?: string;
  andaNumber?: string;
  protocolNumber?: string;
  reportType?: '7_day' | '15_day' | 'followup' | 'periodic';
  dateReceivedFromInvestigator?: string;
  reportSource?: string;
}

export interface Form3500AOutcomes {
  death: boolean;
  deathDate?: string;
  lifeThreatening: boolean;
  hospitalization: boolean;
  hospitalizationDates?: string;
  disability: boolean;
  congenitalAnomaly: boolean;
  requiredIntervention: boolean;
  other: boolean;
  otherText?: string;
}

export interface Form3500AProduct {
  productName: string;
  dose?: string;
  frequency?: string;
  route?: string;
  therapyStartDate?: string;
  therapyEndDate?: string;
  diagnosisForUse?: string;
  eventAbatedOnStop?: 'yes' | 'no' | 'na' | 'unknown';
  eventReappearedOnRestart?: 'yes' | 'no' | 'na' | 'unknown';
  lotNumber?: string;
  expirationDate?: string;
  ndcNumber?: string;
  isConcomitant?: boolean;
}

export interface Form3500AGenerateRequest {
  caseId: string;
  isDraft?: boolean;
}

export interface Form3500AGenerateResponse {
  pdfPath: string;
  validationErrors: string[];
  isDraft: boolean;
}

export interface Form3500APreviewData {
  data: Form3500AData;
  missingRequiredFields: string[];
  warnings: string[];
}
