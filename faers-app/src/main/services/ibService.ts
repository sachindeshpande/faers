/**
 * Investigator Brochure Service - Phase 6
 */

import { IBRepository } from '../database/repositories/ib.repository';
import type {
  InvestigatorBrochure, IBKnownReaction, IBListItem,
  CreateIBDTO, CreateIBReactionDTO, ExpectednessLookupResult
} from '../../shared/types/ib.types';

export class IBService {
  private repo: IBRepository;

  constructor(repo: IBRepository) {
    this.repo = repo;
  }

  findById(id: number): InvestigatorBrochure | null { return this.repo.findById(id); }
  findByStudy(studyId: number): IBListItem[] { return this.repo.findByStudy(studyId); }
  create(data: CreateIBDTO): InvestigatorBrochure { return this.repo.create(data); }
  update(id: number, data: Partial<InvestigatorBrochure>): InvestigatorBrochure { return this.repo.update(id, data); }
  setCurrent(id: number): void { this.repo.setCurrent(id); }

  getReactions(ibId: number): IBKnownReaction[] { return this.repo.getReactions(ibId); }
  addReaction(data: CreateIBReactionDTO): IBKnownReaction { return this.repo.addReaction(data); }
  removeReaction(id: number): void { this.repo.removeReaction(id); }

  lookupExpectedness(studyId: number, meddraPtCode: number): ExpectednessLookupResult {
    return this.repo.lookupExpectedness(studyId, meddraPtCode);
  }
}
