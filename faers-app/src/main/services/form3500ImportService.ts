/**
 * Form 3500A Import Service
 *
 * Orchestrates the import of FDA MedWatch Form 3500A PDFs into the application.
 * Parses the PDF, maps the data, creates a case with related entities.
 */

import type { DatabaseInstance } from '../database/types';
import {
  CaseRepository,
  DrugRepository,
  ReactionRepository,
  ReporterRepository
} from '../database/repositories';
import { Form3500AParser } from '../pdf/form3500Parser';
import { Form3500AMapper } from './form3500Mapper';
import type { Form3500AImportResult } from '../../shared/types/form3500.types';
import type { CaseDrug, CaseReaction, CaseReporter } from '../../shared/types/case.types';

/**
 * Service for importing Form 3500A PDFs
 */
export class Form3500ImportService {
  private caseRepo: CaseRepository;
  private drugRepo: DrugRepository;
  private reactionRepo: ReactionRepository;
  private reporterRepo: ReporterRepository;
  private parser: Form3500AParser;
  private mapper: Form3500AMapper;

  constructor(db: DatabaseInstance) {
    this.caseRepo = new CaseRepository(db);
    this.drugRepo = new DrugRepository(db);
    this.reactionRepo = new ReactionRepository(db);
    this.reporterRepo = new ReporterRepository(db);
    this.parser = new Form3500AParser();
    this.mapper = new Form3500AMapper();
  }

  /**
   * Import a Form 3500A PDF file and create a new case
   * @param filePath Path to the PDF file
   * @returns Import result with case ID, warnings, and errors
   */
  async import(filePath: string): Promise<Form3500AImportResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Step 1: Parse the PDF
      console.log(`Parsing Form 3500A PDF: ${filePath}`);
      const formData = await this.parser.parse(filePath);

      // Step 2: Map the data to application types
      console.log('Mapping Form 3500A data to E2B(R3) format');
      const mappedData = this.mapper.map(formData);
      warnings.push(...mappedData.warnings);

      // Step 3: Create the case
      console.log('Creating new case');
      const newCase = this.caseRepo.create({
        reportType: mappedData.caseData.reportType,
        initialOrFollowup: mappedData.caseData.initialOrFollowup
      });

      // Step 4: Update case with mapped data
      console.log(`Updating case ${newCase.id} with form data`);
      this.caseRepo.update(newCase.id, mappedData.caseData);

      // Step 5: Save related entities
      await this.saveRelatedEntities(
        newCase.id,
        mappedData.drugs,
        mappedData.reactions,
        mappedData.reporters,
        warnings
      );

      console.log(`Form 3500A import completed successfully. Case ID: ${newCase.id}`);

      return {
        success: true,
        caseId: newCase.id,
        warnings,
        errors
      };
    } catch (error) {
      console.error('Form 3500A import error:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error occurred');

      return {
        success: false,
        warnings,
        errors
      };
    }
  }

  /**
   * Save related entities (drugs, reactions, reporters) for a case
   */
  private async saveRelatedEntities(
    caseId: string,
    drugs: Partial<CaseDrug>[],
    reactions: Partial<CaseReaction>[],
    reporters: Partial<CaseReporter>[],
    warnings: string[]
  ): Promise<void> {
    // Save reporters
    for (const reporter of reporters) {
      try {
        const reporterToSave = {
          ...reporter,
          caseId
        } as CaseReporter;
        this.reporterRepo.save(reporterToSave);
        console.log(`Saved reporter: ${reporter.givenName} ${reporter.familyName}`);
      } catch (error) {
        warnings.push(`Failed to save reporter: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Save drugs
    for (const drug of drugs) {
      try {
        const drugToSave = {
          ...drug,
          caseId
        } as CaseDrug;
        this.drugRepo.save(drugToSave);
        console.log(`Saved drug: ${drug.productName}`);
      } catch (error) {
        warnings.push(`Failed to save drug: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Save reactions
    for (const reaction of reactions) {
      try {
        const reactionToSave = {
          ...reaction,
          caseId
        } as CaseReaction;
        this.reactionRepo.save(reactionToSave);
        console.log(`Saved reaction: ${reaction.reactionTerm}`);
      } catch (error) {
        warnings.push(`Failed to save reaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Validate that a file is a valid Form 3500A PDF before importing
   * @param filePath Path to the PDF file
   * @returns True if valid, false otherwise
   */
  async validateFile(filePath: string): Promise<{ valid: boolean; message: string }> {
    try {
      // Check file extension
      if (!filePath.toLowerCase().endsWith('.pdf')) {
        return { valid: false, message: 'File must be a PDF' };
      }

      // Try to parse the PDF to verify it's a valid Form 3500A
      const formData = await this.parser.parse(filePath);

      // Check if we got any meaningful data
      const hasPatient = formData.patient.identifier || formData.patient.age;
      const hasEvent = formData.event.description || formData.event.outcomes.death ||
                      formData.event.outcomes.lifeThreatening || formData.event.outcomes.hospitalization;
      const hasProduct = formData.products.length > 0 && formData.products.some(p => p.productName);
      const hasReporter = formData.reporter.lastName || formData.reporter.firstName;

      if (!hasPatient && !hasEvent && !hasProduct && !hasReporter) {
        return {
          valid: false,
          message: 'PDF does not appear to contain Form 3500A data. Please check that the file is a completed FDA MedWatch Form 3500A.'
        };
      }

      return { valid: true, message: 'File is a valid Form 3500A PDF' };
    } catch (error) {
      return {
        valid: false,
        message: `Unable to read PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export default Form3500ImportService;
