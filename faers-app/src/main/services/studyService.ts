/**
 * Study Service - Phase 6
 */

import { StudyRepository } from '../database/repositories/study.repository';
import type {
  Study, StudyListItem, StudySite, SiteInvestigator, StudyProduct, StudyInd,
  StudyFilter, CreateStudyDTO, UpdateStudyDTO
} from '../../shared/types/study.types';

export class StudyService {
  private repo: StudyRepository;

  constructor(repo: StudyRepository) {
    this.repo = repo;
  }

  findAll(filter?: StudyFilter): StudyListItem[] { return this.repo.findAll(filter); }
  findById(id: number): Study | null { return this.repo.findById(id); }
  create(data: CreateStudyDTO): Study { return this.repo.create(data); }
  update(id: number, data: UpdateStudyDTO): Study { return this.repo.update(id, data); }
  delete(id: number): void { this.repo.delete(id); }

  getSites(studyId: number): StudySite[] { return this.repo.getSites(studyId); }
  createSite(site: Omit<StudySite, 'id' | 'createdAt' | 'investigators'>): StudySite { return this.repo.createSite(site); }
  updateSite(id: number, data: Partial<StudySite>): StudySite { return this.repo.updateSite(id, data); }
  deleteSite(id: number): void { this.repo.deleteSite(id); }

  addInvestigator(inv: Omit<SiteInvestigator, 'id' | 'createdAt'>): SiteInvestigator { return this.repo.addInvestigator(inv); }
  removeInvestigator(id: number): void { this.repo.removeInvestigator(id); }

  addProduct(prod: Omit<StudyProduct, 'id' | 'createdAt'>): StudyProduct { return this.repo.addProduct(prod); }
  removeProduct(id: number): void { this.repo.removeProduct(id); }

  addInd(ind: Omit<StudyInd, 'id'>): StudyInd { return this.repo.addInd(ind); }
  removeInd(id: number): void { this.repo.removeInd(id); }
}
