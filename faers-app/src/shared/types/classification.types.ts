/**
 * Report Classification Types
 * Phase 4: Report Type Classification (Expedited vs Non-Expedited)
 */

// Report type classification
export type ReportTypeClassification = 'expedited' | 'non_expedited' | 'followup' | 'nullification';

// Expedited criteria (15-day, periodic, etc.)
export type ExpeditedCriteria = '15_day' | 'periodic' | 'remedial' | 'malfunction';

// Expectedness determination
export type Expectedness = 'expected' | 'unexpected' | 'unknown';

// Seriousness criterion types matching FDA requirements
export type SeriousnessCriterion =
  | 'death'
  | 'life_threatening'
  | 'hospitalization'
  | 'disability'
  | 'congenital_anomaly'
  | 'other_medically_important';

// Case seriousness record
export interface CaseSeriousness {
  id?: number;
  caseId: string;
  criterion: SeriousnessCriterion;
  isChecked: boolean;
  notes?: string;
}

// Classification suggestion from the system
export interface ClassificationSuggestion {
  reportType: ReportTypeClassification;
  isSerious: boolean;
  expectedness: Expectedness;
  expeditedCriteria?: ExpeditedCriteria;
  rationale: string;
  checkedCriteria: SeriousnessCriterion[];
  canOverride: boolean;
}

// Classification update request
export interface ClassificationUpdate {
  reportTypeClassification: ReportTypeClassification;
  expeditedCriteria?: ExpeditedCriteria;
  isSerious: boolean;
  expectedness: Expectedness;
  expectednessJustification?: string;
}

// Full classification response
export interface CaseClassification {
  caseId: string;
  reportTypeClassification?: ReportTypeClassification;
  expeditedCriteria?: ExpeditedCriteria;
  isSerious: boolean;
  expectedness?: Expectedness;
  expectednessJustification?: string;
  seriousnessCriteria: CaseSeriousness[];
}

// Labels for seriousness criteria (FDA terms)
export const SERIOUSNESS_LABELS: Record<SeriousnessCriterion, string> = {
  death: 'Results in death',
  life_threatening: 'Life-threatening',
  hospitalization: 'Requires or prolongs hospitalization',
  disability: 'Results in persistent or significant disability/incapacity',
  congenital_anomaly: 'Congenital anomaly/birth defect',
  other_medically_important: 'Other medically important condition'
};

// All seriousness criteria in order
export const ALL_SERIOUSNESS_CRITERIA: SeriousnessCriterion[] = [
  'death',
  'life_threatening',
  'hospitalization',
  'disability',
  'congenital_anomaly',
  'other_medically_important'
];

// Expectedness labels
export const EXPECTEDNESS_LABELS: Record<Expectedness, string> = {
  expected: 'Expected (Listed in labeling)',
  unexpected: 'Unexpected (Not listed in labeling)',
  unknown: 'Unknown / Not determined'
};

// Report type labels
export const REPORT_TYPE_LABELS: Record<ReportTypeClassification, string> = {
  expedited: 'Expedited (15-Day)',
  non_expedited: 'Non-Expedited (PSR)',
  followup: 'Follow-Up Report',
  nullification: 'Nullification Report'
};
