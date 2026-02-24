/**
 * BA/BE Service - Phase 6
 */
import { BABERepository } from '../database/repositories/babe.repository';
import type { BABEStudy, BABEStudyListItem, BABEStudyFilter, CreateBABEStudyDTO, UpdateBABEStudyDTO } from '../../shared/types/babe.types';

export class BABEService {
  private repo: BABERepository;
  constructor(repo: BABERepository) { this.repo = repo; }
  findAll(filter?: BABEStudyFilter): BABEStudyListItem[] { return this.repo.findAll(filter); }
  findById(id: number): BABEStudy | null { return this.repo.findById(id); }
  create(data: CreateBABEStudyDTO): BABEStudy { return this.repo.create(data); }
  update(id: number, data: UpdateBABEStudyDTO): BABEStudy { return this.repo.update(id, data); }
  delete(id: number): void { this.repo.delete(id); }
}
