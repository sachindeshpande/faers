/**
 * Validation Service
 *
 * Implements E2B(R3) compliance validation for ICSR cases.
 * Includes field-level, cross-field, and schema validation.
 */

import type { DatabaseInstance } from '../database/types';
import {
  CaseRepository,
  ReactionRepository,
  DrugRepository,
  ReporterRepository
} from '../database/repositories';
import type {
  Case,
  CaseReaction,
  CaseDrug,
  CaseReporter,
  ValidationError,
  ValidationResult
} from '../../shared/types/case.types';

export class ValidationService {
  private caseRepo: CaseRepository;
  private reactionRepo: ReactionRepository;
  private drugRepo: DrugRepository;
  private reporterRepo: ReporterRepository;

  constructor(db: DatabaseInstance) {
    this.caseRepo = new CaseRepository(db);
    this.reactionRepo = new ReactionRepository(db);
    this.drugRepo = new DrugRepository(db);
    this.reporterRepo = new ReporterRepository(db);
  }

  /**
   * Validate a case against E2B(R3) requirements
   */
  validate(caseId: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Load case with all related data
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      return {
        valid: false,
        errors: [{ field: 'case', message: `Case not found: ${caseId}`, severity: 'error' }]
      };
    }

    const reporters = this.reporterRepo.findByCaseId(caseId);
    const reactions = this.reactionRepo.findByCaseId(caseId);
    const drugs = this.drugRepo.findByCaseId(caseId);

    // Run all validation checks
    this.validateReportInformation(caseData, errors);
    this.validateReporterInformation(reporters, errors);
    this.validateSenderInformation(caseData, errors);
    this.validatePatientInformation(caseData, errors);
    this.validateReactions(reactions, caseData, errors);
    this.validateDrugs(drugs, errors);
    this.validateNarrative(caseData, errors);
    this.validateCrossFieldRules(caseData, reactions, errors);

    // Determine overall validity (no errors)
    const hasErrors = errors.some(e => e.severity === 'error');

    return {
      valid: !hasErrors,
      errors
    };
  }

  /**
   * Validate Report Information (A.1)
   */
  private validateReportInformation(caseData: Case, errors: ValidationError[]): void {
    // A.1.2 - Report Type (required)
    if (!caseData.reportType) {
      errors.push({
        field: 'reportType',
        message: 'Report Type is required (A.1.2)',
        severity: 'error'
      });
    }

    // A.1.4 - Initial/Follow-up (required)
    if (!caseData.initialOrFollowup) {
      errors.push({
        field: 'initialOrFollowup',
        message: 'Report Classification (Initial/Follow-up) is required (A.1.4)',
        severity: 'error'
      });
    }

    // A.1.5.1 - Initial Receipt Date (required)
    if (!caseData.receiptDate) {
      errors.push({
        field: 'receiptDate',
        message: 'Initial Receipt Date is required (A.1.5.1)',
        severity: 'error'
      });
    }

    // A.1.5.2 - Most Recent Information Date (required)
    if (!caseData.receiveDate) {
      errors.push({
        field: 'receiveDate',
        message: 'Most Recent Information Date is required (A.1.5.2)',
        severity: 'error'
      });
    }

    // Date validation: receiveDate should be >= receiptDate
    if (caseData.receiptDate && caseData.receiveDate) {
      if (caseData.receiveDate < caseData.receiptDate) {
        errors.push({
          field: 'receiveDate',
          message: 'Most Recent Information Date must be on or after Initial Receipt Date',
          severity: 'error'
        });
      }
    }

    // A.1.10 - Nullification reason required if nullification type is set
    if (caseData.nullificationType && !caseData.nullificationReason) {
      errors.push({
        field: 'nullificationReason',
        message: 'Nullification/Amendment reason is required when type is specified (A.1.10.2)',
        severity: 'error'
      });
    }
  }

  /**
   * Validate Reporter Information (A.2)
   */
  private validateReporterInformation(reporters: CaseReporter[], errors: ValidationError[]): void {
    // At least one reporter is recommended
    if (reporters.length === 0) {
      errors.push({
        field: 'reporters',
        message: 'At least one reporter is recommended (A.2)',
        severity: 'warning'
      });
      return;
    }

    // Check primary reporter
    const primaryReporter = reporters.find(r => r.isPrimary);
    if (!primaryReporter) {
      errors.push({
        field: 'reporters',
        message: 'A primary reporter should be designated',
        severity: 'warning'
      });
    }

    // A.2.1.4 - Reporter Qualification (required for primary)
    reporters.forEach((reporter, index) => {
      if (reporter.isPrimary && !reporter.qualification) {
        errors.push({
          field: `reporters[${index}].qualification`,
          message: 'Reporter Qualification is required for primary reporter (A.2.1.4)',
          severity: 'error'
        });
      }

      // Email validation
      if (reporter.email && !this.isValidEmail(reporter.email)) {
        errors.push({
          field: `reporters[${index}].email`,
          message: 'Invalid email format for reporter',
          severity: 'warning'
        });
      }
    });
  }

  /**
   * Validate Sender Information (A.3)
   */
  private validateSenderInformation(caseData: Case, errors: ValidationError[]): void {
    // A.3.1.1 - Sender Type (required)
    if (!caseData.senderType) {
      errors.push({
        field: 'senderType',
        message: 'Sender Type is required (A.3.1.1)',
        severity: 'error'
      });
    }

    // A.3.1.2 - Sender Organization (required)
    if (!caseData.senderOrganization) {
      errors.push({
        field: 'senderOrganization',
        message: 'Sender Organization is required (A.3.1.2)',
        severity: 'error'
      });
    }

    // A.3.1.4 - Sender Given Name (required)
    if (!caseData.senderGivenName) {
      errors.push({
        field: 'senderGivenName',
        message: 'Sender Given Name is required (A.3.1.4)',
        severity: 'error'
      });
    }

    // A.3.1.5 - Sender Family Name (required)
    if (!caseData.senderFamilyName) {
      errors.push({
        field: 'senderFamilyName',
        message: 'Sender Family Name is required (A.3.1.5)',
        severity: 'error'
      });
    }

    // Email validation
    if (caseData.senderEmail && !this.isValidEmail(caseData.senderEmail)) {
      errors.push({
        field: 'senderEmail',
        message: 'Invalid email format for sender',
        severity: 'warning'
      });
    }
  }

  /**
   * Validate Patient Information (B.1)
   */
  private validatePatientInformation(caseData: Case, errors: ValidationError[]): void {
    // B.1.5 - Patient Sex (required)
    if (caseData.patientSex === undefined || caseData.patientSex === null) {
      errors.push({
        field: 'patientSex',
        message: 'Patient Sex is required (B.1.5)',
        severity: 'error'
      });
    }

    // B.1.2 - Either Birth Date OR Age is required
    const hasAge = caseData.patientAge !== undefined && caseData.patientAge !== null;
    const hasBirthdate = !!caseData.patientBirthdate;
    const hasAgeGroup = caseData.patientAgeGroup !== undefined && caseData.patientAgeGroup !== null;

    if (!hasAge && !hasBirthdate && !hasAgeGroup) {
      errors.push({
        field: 'patientAge',
        message: 'Either Patient Birth Date, Age, or Age Group is required (B.1.2)',
        severity: 'error'
      });
    }

    // Weight validation (reasonable range)
    if (caseData.patientWeight !== undefined && caseData.patientWeight !== null) {
      if (caseData.patientWeight < 0 || caseData.patientWeight > 500) {
        errors.push({
          field: 'patientWeight',
          message: 'Patient weight seems outside normal range (0-500 kg)',
          severity: 'warning'
        });
      }
    }

    // Height validation (reasonable range)
    if (caseData.patientHeight !== undefined && caseData.patientHeight !== null) {
      if (caseData.patientHeight < 0 || caseData.patientHeight > 300) {
        errors.push({
          field: 'patientHeight',
          message: 'Patient height seems outside normal range (0-300 cm)',
          severity: 'warning'
        });
      }
    }

    // Age validation (reasonable range)
    if (hasAge && caseData.patientAge !== undefined) {
      const maxAge = caseData.patientAgeUnit === 'Year' ? 150 :
                     caseData.patientAgeUnit === 'Month' ? 1800 :
                     caseData.patientAgeUnit === 'Week' ? 7800 :
                     caseData.patientAgeUnit === 'Day' ? 55000 : 150;
      if (caseData.patientAge < 0 || caseData.patientAge > maxAge) {
        errors.push({
          field: 'patientAge',
          message: `Patient age seems outside normal range`,
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Validate Reactions (B.2)
   */
  private validateReactions(reactions: CaseReaction[], _caseData: Case, errors: ValidationError[]): void {
    // At least one reaction is required
    if (reactions.length === 0) {
      errors.push({
        field: 'reactions',
        message: 'At least one reaction is required (B.2)',
        severity: 'error'
      });
      return;
    }

    reactions.forEach((reaction, index) => {
      // B.2.i.1 - Reaction Term (required)
      if (!reaction.reactionTerm) {
        errors.push({
          field: `reactions[${index}].reactionTerm`,
          message: `Reaction ${index + 1}: Reaction Term is required (B.2.i.1)`,
          severity: 'error'
        });
      }

      // B.2.i.7 - At least one seriousness criterion required
      const hasSeriousness = reaction.seriousDeath ||
                            reaction.seriousLifeThreat ||
                            reaction.seriousHospitalization ||
                            reaction.seriousDisability ||
                            reaction.seriousCongenital ||
                            reaction.seriousOther;

      if (!hasSeriousness) {
        errors.push({
          field: `reactions[${index}].seriousness`,
          message: `Reaction ${index + 1}: At least one seriousness criterion is required (B.2.i.7)`,
          severity: 'error'
        });
      }

      // Date validation: endDate >= startDate
      if (reaction.startDate && reaction.endDate) {
        if (reaction.endDate < reaction.startDate) {
          errors.push({
            field: `reactions[${index}].endDate`,
            message: `Reaction ${index + 1}: End Date must be on or after Start Date`,
            severity: 'error'
          });
        }
      }

      // If death seriousness, outcome should be fatal
      if (reaction.seriousDeath && reaction.outcome !== 5) {
        errors.push({
          field: `reactions[${index}].outcome`,
          message: `Reaction ${index + 1}: Outcome should be "Fatal" when "Results in Death" is checked`,
          severity: 'warning'
        });
      }
    });
  }

  /**
   * Validate Drugs (B.4)
   */
  private validateDrugs(drugs: CaseDrug[], errors: ValidationError[]): void {
    // At least one drug is required
    if (drugs.length === 0) {
      errors.push({
        field: 'drugs',
        message: 'At least one drug is required (B.4)',
        severity: 'error'
      });
      return;
    }

    // At least one suspect drug is required
    const hasSuspectDrug = drugs.some(d => d.characterization === 1);
    if (!hasSuspectDrug) {
      errors.push({
        field: 'drugs',
        message: 'At least one Suspect drug is required (characterization = Suspect)',
        severity: 'error'
      });
    }

    drugs.forEach((drug, index) => {
      // B.4.k.1 - Drug Characterization (required)
      if (!drug.characterization) {
        errors.push({
          field: `drugs[${index}].characterization`,
          message: `Drug ${index + 1}: Drug Characterization is required (B.4.k.1)`,
          severity: 'error'
        });
      }

      // B.4.k.2.1 - Product Name (required)
      if (!drug.productName) {
        errors.push({
          field: `drugs[${index}].productName`,
          message: `Drug ${index + 1}: Product Name is required (B.4.k.2.1)`,
          severity: 'error'
        });
      }

      // Date validation: endDate >= startDate
      if (drug.startDate && drug.endDate) {
        if (drug.endDate < drug.startDate) {
          errors.push({
            field: `drugs[${index}].endDate`,
            message: `Drug ${index + 1}: End Date must be on or after Start Date`,
            severity: 'error'
          });
        }
      }

      // Indication recommended for suspect drugs
      if (drug.characterization === 1 && !drug.indication) {
        errors.push({
          field: `drugs[${index}].indication`,
          message: `Drug ${index + 1}: Indication is recommended for suspect drugs`,
          severity: 'info'
        });
      }
    });
  }

  /**
   * Validate Narrative (B.5)
   */
  private validateNarrative(caseData: Case, errors: ValidationError[]): void {
    // B.5.1 - Case Narrative (required)
    if (!caseData.caseNarrative || caseData.caseNarrative.trim().length === 0) {
      errors.push({
        field: 'caseNarrative',
        message: 'Case Narrative is required (B.5.1)',
        severity: 'error'
      });
    } else {
      // Check minimum length
      if (caseData.caseNarrative.trim().length < 50) {
        errors.push({
          field: 'caseNarrative',
          message: 'Case Narrative should be more descriptive (minimum 50 characters recommended)',
          severity: 'warning'
        });
      }

      // Check maximum length
      if (caseData.caseNarrative.length > 20000) {
        errors.push({
          field: 'caseNarrative',
          message: 'Case Narrative exceeds maximum length (20,000 characters)',
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validate Cross-Field Rules
   */
  private validateCrossFieldRules(caseData: Case, reactions: CaseReaction[], errors: ValidationError[]): void {
    // If patient death is indicated
    if (caseData.patientDeath) {
      // Death date should be provided
      if (!caseData.deathDate) {
        errors.push({
          field: 'deathDate',
          message: 'Death Date should be provided when patient death is indicated (B.1.9.1)',
          severity: 'warning'
        });
      }

      // At least one reaction should have "Results in Death" seriousness
      const hasDeathReaction = reactions.some(r => r.seriousDeath);
      if (!hasDeathReaction) {
        errors.push({
          field: 'reactions',
          message: 'At least one reaction should have "Results in Death" seriousness when patient death is indicated',
          severity: 'warning'
        });
      }
    }

    // If any reaction has "Results in Death", patient death should be indicated
    const hasDeathReaction = reactions.some(r => r.seriousDeath);
    if (hasDeathReaction && !caseData.patientDeath) {
      errors.push({
        field: 'patientDeath',
        message: 'Patient Death should be indicated when a reaction "Results in Death"',
        severity: 'warning'
      });
    }

    // Follow-up reports should have a related case
    if (caseData.initialOrFollowup === 2 && !caseData.worldwideCaseId) {
      errors.push({
        field: 'worldwideCaseId',
        message: 'Follow-up reports should reference the original case ID',
        severity: 'info'
      });
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
