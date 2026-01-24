/**
 * Type definitions for FDA Form 3500A data
 * Used for importing MedWatch adverse event reports
 */

/**
 * Raw extracted data from Form 3500A PDF
 */
export interface Form3500AData {
  // Section A - Patient Information
  patient: {
    identifier?: string;
    age?: number;
    ageUnit?: 'Year' | 'Month' | 'Week' | 'Day';
    dateOfBirth?: string;
    sex?: 'Male' | 'Female';
    weight?: number;
    weightUnit?: 'lb' | 'kg';
    ethnicity?: string[];
  };

  // Section B - Adverse Event or Product Problem
  event: {
    type: 'adverse_event' | 'product_problem' | 'both';
    dateOfEvent?: string;
    dateOfReport?: string;
    description?: string;
    labData?: string;
    labDataComments?: string;
    medicalHistory?: string;
    outcomes: {
      death: boolean;
      deathDate?: string;
      lifeThreatening: boolean;
      hospitalization: boolean;
      disability: boolean;
      congenitalAnomaly: boolean;
      otherSerious: boolean;
      requiredIntervention: boolean;
    };
  };

  // Section C - Suspect Products (can have up to 2 in standard form)
  products: Form3500AProduct[];

  // Section D - Suspect Medical Device (not used for drug reports)
  device?: {
    brandName?: string;
    commonName?: string;
    manufacturerName?: string;
    modelNumber?: string;
    lotNumber?: string;
    catalogNumber?: string;
    expirationDate?: string;
    serialNumber?: string;
    udi?: string;
  };

  // Section E - Initial Reporter
  reporter: {
    lastName?: string;
    firstName?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
    email?: string;
    healthProfessional: boolean;
    occupation?: string;
    reporterSentToFda?: boolean;
  };

  // Section G - All Manufacturers
  manufacturer: {
    contactName?: string;
    address?: string;
    phone?: string;
    email?: string;
    reportSource?: string[];
    dateReceived?: string;
    ndaNumber?: string;
    andaNumber?: string;
    indNumber?: string;
    blaNumber?: string;
    pmaNumber?: string;
    adverseEventTerms?: string;
    mfrReportNumber?: string;
  };

  // Metadata
  mfrReportNumber?: string;
  ufImporterReportNumber?: string;
}

/**
 * Product information from Section C
 */
export interface Form3500AProduct {
  productName?: string;
  strength?: string;
  strengthUnit?: string;
  ndcNumber?: string;
  manufacturerName?: string;
  lotNumber?: string;
  dose?: string;
  doseUnit?: string;
  frequency?: string;
  route?: string;
  therapyStartDate?: string;
  therapyEndDate?: string;
  doseReducedDate?: string;
  duration?: string;
  durationUnit?: string;
  indication?: string;
  productType?: string;
  expirationDate?: string;
  eventAbatedOnStop?: 'Yes' | 'No' | 'DoesntApply';
  eventReappearedOnReintro?: 'Yes' | 'No' | 'DoesntApply';
  /** True if this is a concomitant medication (not a suspect product) */
  isConcomitant?: boolean;
}

/**
 * Result of importing a Form 3500A
 */
export interface Form3500AImportResult {
  success: boolean;
  caseId?: string;
  warnings: string[];
  errors: string[];
}

/**
 * PDF field names mapping to Form3500AData paths
 * These are the actual field names used in FDA Form 3500A PDF
 */
export const FORM_3500A_FIELD_NAMES = {
  // Header
  mfrReportNumber: 'Mfr report #',
  ufImporterReportNumber: 'UF/Importer Report #',

  // Section A - Patient
  patientIdentifier: 'A1',
  patientAge: 'A2',
  patientAgeYears: 'A2_Years',
  patientAgeMonths: 'A2_Months',
  patientAgeWeeks: 'A2_Weeks',
  patientAgeDays: 'A2_Days',
  patientDOB: 'A2_DOB',
  patientSexMale: 'A3_Male',
  patientSexFemale: 'A3_Female',
  patientWeight: 'A4',
  patientWeightLb: 'A4_lb',
  patientWeightKg: 'A4_kg',

  // Section B - Event
  eventTypeAdverse: 'B1_AdverseEvent',
  eventTypeProblem: 'B1_ProductProblem',
  outcomeDeath: 'B2_Death',
  outcomeDeathDate: 'B2_DeathDate',
  outcomeLifeThreat: 'B2_LifeThreatening',
  outcomeHospital: 'B2_Hospitalization',
  outcomeDisability: 'B2_Disability',
  outcomeCongenital: 'B2_Congenital',
  outcomeOther: 'B2_OtherSerious',
  outcomeIntervention: 'B2_Intervention',
  eventDate: 'B3',
  reportDate: 'B4',
  eventDescription: 'B5',

  // Section C - Products (Product 1)
  product1Name: 'C1_Name_1',
  product1Strength: 'C1_Strength_1',
  product1Unit: 'C1_Unit_1',
  product1NDC: 'C1_NDC_1',
  product1Manufacturer: 'C1_Mfr_1',
  product1Lot: 'C1_Lot_1',
  product1Dose: 'C2_Dose_1',
  product1DoseUnit: 'C2_Unit_1',
  product1Frequency: 'C2_Freq_1',
  product1Route: 'C2_Route_1',
  product1StartDate: 'C3_Start_1',
  product1EndDate: 'C3_End_1',
  product1Indication: 'C4_1',
  product1Dechallenge: 'C7_1',
  product1Rechallenge: 'C8_1',

  // Section E - Reporter
  reporterLastName: 'E1_LastName',
  reporterFirstName: 'E1_FirstName',
  reporterAddress: 'E1_Address',
  reporterCity: 'E1_City',
  reporterState: 'E1_State',
  reporterZip: 'E1_Zip',
  reporterCountry: 'E1_Country',
  reporterPhone: 'E1_Phone',
  reporterEmail: 'E1_Email',
  reporterHealthProf: 'E2_HealthProf',
  reporterOccupation: 'E3',

  // Section G - Manufacturer
  mfrContactName: 'G1_Name',
  mfrAddress: 'G1_Address',
  mfrEmail: 'G1_Email',
  mfrPhone: 'G1_Phone',
  mfrNDA: 'G4_NDA',
  mfrAETerm: 'G7',
  mfrReportNum: 'G8'
} as const;
