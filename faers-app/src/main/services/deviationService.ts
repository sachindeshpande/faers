/**
 * Deviation Service - Phase 6
 */
import { DeviationRepository } from '../database/repositories/deviation.repository';
import type { ProtocolDeviation, DeviationListItem, DeviationFilter, CreateDeviationDTO, UpdateDeviationDTO } from '../../shared/types/deviation.types';

export class DeviationService {
  private repo: DeviationRepository;
  constructor(repo: DeviationRepository) { this.repo = repo; }
  findAll(filter?: DeviationFilter): DeviationListItem[] { return this.repo.findAll(filter); }
  findById(id: number): ProtocolDeviation | null { return this.repo.findById(id); }
  create(data: CreateDeviationDTO): ProtocolDeviation { return this.repo.create(data); }
  update(id: number, data: UpdateDeviationDTO): ProtocolDeviation { return this.repo.update(id, data); }
  delete(id: number): void { this.repo.delete(id); }
  linkCase(deviationId: number, caseId: string): void { this.repo.linkCase(deviationId, caseId); }
  unlinkCase(deviationId: number, caseId: string): void { this.repo.unlinkCase(deviationId, caseId); }
  getByCase(caseId: string): DeviationListItem[] { return this.repo.getByCase(caseId); }
}
