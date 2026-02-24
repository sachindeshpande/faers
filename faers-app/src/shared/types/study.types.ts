/**
 * Phase 6: Study and Protocol Management Types
 */

export type StudyPhase = '1' | '1/2' | '2' | '2/3' | '3' | '3b' | '4';
export type StudyDesign = 'randomized' | 'open_label' | 'double_blind' | 'single_blind' | 'crossover' | 'parallel' | 'other';
export type StudyStatus = 'planned' | 'enrolling' | 'active' | 'completed' | 'terminated';
export type SiteStatus = 'pending' | 'active' | 'suspended' | 'closed';
export type InvestigatorRole = 'PI' | 'Sub-I' | 'Study Coordinator';

export interface Study {
  id?: number;
  studyId: string;
  protocolNumber: string;
  studyTitle: string;
  sponsorName?: string;
  phase?: StudyPhase;
  studyDesign?: StudyDesign;
  therapeuticArea?: string;
  indication?: string;
  targetEnrollment?: number;
  status: StudyStatus;
  fpfvDate?: string;
  lplvDate?: string;
  isBlinded: boolean;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Related data
  inds?: StudyInd[];
  sites?: StudySite[];
  products?: StudyProduct[];
  currentIB?: InvestigatorBrochureSummary;
}

export interface StudyInd {
  id?: number;
  studyId: number;
  indNumber: string;
  center: 'CDER' | 'CBER';
  isPrimary: boolean;
}

export interface StudySite {
  id?: number;
  studyId: number;
  siteNumber: string;
  siteName: string;
  institutionName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  fax?: string;
  email?: string;
  status: SiteStatus;
  firstEnrollmentDate?: string;
  irbName?: string;
  irbApprovalDate?: string;
  createdAt?: string;
  // Related
  investigators?: SiteInvestigator[];
}

export interface SiteInvestigator {
  id?: number;
  siteId: number;
  investigatorName: string;
  role: InvestigatorRole;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  createdAt?: string;
}

export interface StudyProduct {
  id?: number;
  studyId: number;
  productName: string;
  activeIngredient?: string;
  dosageForm?: string;
  strength?: string;
  route?: string;
  isInvestigational: boolean;
  createdAt?: string;
}

// Summary for display in study list
export interface InvestigatorBrochureSummary {
  versionNumber: string;
  effectiveDate: string;
}

export interface StudyListItem {
  id: number;
  studyId: string;
  protocolNumber: string;
  studyTitle: string;
  sponsorName?: string;
  phase?: StudyPhase;
  status: StudyStatus;
  isBlinded: boolean;
  siteCount?: number;
  indCount?: number;
}

export interface StudyFilter {
  status?: StudyStatus;
  phase?: StudyPhase;
  search?: string;
}

export interface CreateStudyDTO {
  studyId: string;
  protocolNumber: string;
  studyTitle: string;
  sponsorName?: string;
  phase?: StudyPhase;
  studyDesign?: StudyDesign;
  therapeuticArea?: string;
  indication?: string;
  targetEnrollment?: number;
  isBlinded?: boolean;
  fpfvDate?: string;
}

export type UpdateStudyDTO = Partial<Omit<Study, 'id' | 'createdAt' | 'createdBy'>>;
