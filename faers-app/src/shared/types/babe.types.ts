/**
 * Phase 6: BA/BE Study Types
 */

export type BABEStudyDesign = 'crossover' | 'parallel' | 'replicate';
export type BABEPopulation = 'healthy_volunteers' | 'patients';
export type BABEStatus = 'planned' | 'active' | 'completed' | 'terminated';

export interface BABEStudy {
  id?: number;
  protocolNumber: string;
  studyDesign?: BABEStudyDesign;
  testProductName: string;
  testProductManufacturer?: string;
  referenceProductName: string;
  referenceProductManufacturer?: string;
  activeIngredient?: string;
  dosageForm?: string;
  strength?: string;
  population?: BABEPopulation;
  sponsorName?: string;
  preAndaNumber?: string;
  status: BABEStatus;
  createdAt?: string;
}

export interface BABEStudyListItem {
  id: number;
  protocolNumber: string;
  testProductName: string;
  referenceProductName: string;
  activeIngredient?: string;
  sponsorName?: string;
  status: BABEStatus;
}

export interface BABEStudyFilter {
  status?: BABEStatus;
  search?: string;
}

export interface CreateBABEStudyDTO {
  protocolNumber: string;
  studyDesign?: BABEStudyDesign;
  testProductName: string;
  testProductManufacturer?: string;
  referenceProductName: string;
  referenceProductManufacturer?: string;
  activeIngredient?: string;
  dosageForm?: string;
  strength?: string;
  population?: BABEPopulation;
  sponsorName?: string;
  preAndaNumber?: string;
}

export type UpdateBABEStudyDTO = Partial<Omit<BABEStudy, 'id' | 'createdAt'>>;
