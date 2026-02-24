/**
 * Phase 6: Investigator Brochure Types
 */

export interface InvestigatorBrochure {
  id?: number;
  studyId: number;
  versionNumber: string;
  effectiveDate: string;
  documentPath?: string;
  changeSummary?: string;
  isCurrent: boolean;
  createdBy?: number;
  createdAt?: string;
  // Related
  knownReactions?: IBKnownReaction[];
}

export interface IBKnownReaction {
  id?: number;
  ibId: number;
  meddraPtCode: number;
  meddraPtName: string;
  documentedSeverity?: string;
  documentedFrequency?: string;
  ibSection?: string;
  ibPage?: string;
  notes?: string;
  createdAt?: string;
}

export interface IBListItem {
  id: number;
  studyId: number;
  versionNumber: string;
  effectiveDate: string;
  isCurrent: boolean;
  reactionCount?: number;
}

export interface CreateIBDTO {
  studyId: number;
  versionNumber: string;
  effectiveDate: string;
  documentPath?: string;
  changeSummary?: string;
  isCurrent?: boolean;
}

export interface CreateIBReactionDTO {
  ibId: number;
  meddraPtCode: number;
  meddraPtName: string;
  documentedSeverity?: string;
  documentedFrequency?: string;
  ibSection?: string;
  ibPage?: string;
  notes?: string;
}

export interface ExpectednessLookupResult {
  isListed: boolean;
  reaction?: IBKnownReaction;
  ibVersion: string;
  ibEffectiveDate: string;
}
