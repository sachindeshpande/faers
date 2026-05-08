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
import { ExportFilenameService } from './exportFilenameService';
import type {
  Case,
  CaseReaction,
  CaseDrug,
  CaseReporter,
  ValidationError,
  ValidationResult
} from '../../shared/types/case.types';

export class ValidationService {
  private db: DatabaseInstance;
  private caseRepo: CaseRepository;
  private reactionRepo: ReactionRepository;
  private drugRepo: DrugRepository;
  private reporterRepo: ReporterRepository;

  constructor(db: DatabaseInstance) {
    this.db = db;
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
    this.validateSubmissionEnvelope(errors);
    this.validateReportInformation(caseData, errors);
    this.validateReporterInformation(reporters, errors);
    this.validateSenderInformation(caseData, errors);
    this.validatePatientInformation(caseData, errors);
    this.validateReactions(reactions, caseData, errors);
    this.validateDrugs(drugs, caseData, errors);
    this.validateNarrative(caseData, errors);
    this.validateCrossFieldRules(caseData, reactions, errors);
    this.validatePremarketFields(caseData, errors);

    // Determine overall validity (no errors)
    const hasErrors = errors.some(e => e.severity === 'error');

    return {
      valid: !hasErrors,
      errors
    };
  }

  /**
   * Validate Submission Envelope (N.1 Batch Header)
   * Checks that the required sender identification and submission configuration
   * are in place for generating a valid E2B(R3) XML envelope.
   */
  private validateSubmissionEnvelope(errors: ValidationError[]): void {
    try {
      const filenameService = new ExportFilenameService(this.db);

      // N.1.3 - Batch Sender Identifier must be configured
      if (!filenameService.isSenderIdConfigured()) {
        const idType = filenameService.getSenderIdentifierType();
        if (idType === 'duns') {
          const duns = filenameService.getDunsNumber();
          if (!duns) {
            errors.push({
              field: 'dunsNumber',
              message: 'DUNS number is required for batch sender identification (N.1.3). Configure it in Settings.',
              severity: 'error'
            });
          } else if (!/^\d{9}$/.test(duns)) {
            errors.push({
              field: 'dunsNumber',
              message: `DUNS number must be exactly 9 digits (N.1.3). Current value "${duns}" is invalid.`,
              severity: 'error'
            });
          }
        } else {
          errors.push({
            field: 'senderId',
            message: 'FDA Sender ID is required for batch sender identification (N.1.3). Configure it in Settings.',
            severity: 'error'
          });
        }
      }

      // Verify submission report type is configured (affects N.1.4 batch receiver)
      const reportType = filenameService.getReportType();
      if (!reportType) {
        errors.push({
          field: 'submissionReportType',
          message: 'Submission report type (Postmarket/Premarket) must be configured for batch receiver routing (N.1.4).',
          severity: 'error'
        });
      }
    } catch {
      // If settings table doesn't exist yet, warn but don't block
      errors.push({
        field: 'submissionSettings',
        message: 'Submission settings not configured. Configure Sender ID/DUNS and report type in Settings before export.',
        severity: 'warning'
      });
    }
  }

  /**
   * Validate Report Information (A.1)
   */
  private validateReportInformation(caseData: Case, errors: ValidationError[]): void {
    // A.1.0.1 - Safety Report Unique Identifier (required)
    if (!caseData.safetyReportId) {
      errors.push({
        field: 'safetyReportId',
        message: 'Safety Report Unique Identifier is required (A.1.0.1). The internal case ID will be used as fallback but may cause FDA rejection.',
        severity: 'warning'
      });
    } else {
      // Warn if it looks like a bare UUID (internal DB id, not FDA-formatted)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(caseData.safetyReportId)) {
        errors.push({
          field: 'safetyReportId',
          message: 'Safety Report ID appears to be a system UUID. FDA expects a formatted identifier (e.g., US-COMPANYNAME-YYYY-NNNNN) (A.1.0.1)',
          severity: 'warning'
        });
      }
    }

    // A.1.8.1 - Worldwide Unique Case Identification Number (required for all reports)
    if (!caseData.worldwideCaseId) {
      errors.push({
        field: 'worldwideCaseId',
        message: 'Worldwide Unique Case Identification Number is required (A.1.8.1)',
        severity: 'warning'
      });
    }

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

    // Date format validation
    this.validateDateFormat(caseData.receiptDate, 'receiptDate', 'Initial Receipt Date', errors);
    this.validateDateFormat(caseData.receiveDate, 'receiveDate', 'Most Recent Information Date', errors);
    this.validateDateFormat(caseData.deathDate, 'deathDate', 'Death Date', errors);
    this.validateDateFormat(caseData.patientBirthdate, 'patientBirthdate', 'Patient Birth Date', errors);

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

    // A.2.1.3.6 - Reporter Country (required for primary reporter)
    if (primaryReporter && !primaryReporter.country) {
      errors.push({
        field: 'reporters[primary].country',
        message: 'Reporter Country is required for the primary reporter (A.2.1.3.6)',
        severity: 'error'
      });
    }

    // C.3.4.1–C.3.4.5 — CDER 2.18 requires ALL five reporter address sub-fields
    // when ANY of them is populated, not country-only. TC-H02 three-round
    // rejection campaign (2026-05-01, ACK ci260501235624) confirmed:
    //   v1 CR+AR — asLocatedEntity missing → "Data value required for tag C.3.4.5"
    //   v2 CR+AR — asLocatedEntity outside <assignedPerson> → SAXParseException
    //   v3 CR+AR — street/city/state/postal absent → "Data value required for C.3.4.1/2/3/4"
    // See REPORTER_ADDRESS_ALL_FIELDS_REQUIRED in faersEmpiricalPolicy.ts.
    if (primaryReporter) {
      const requiredAddrFields: Array<[keyof CaseReporter, string, string]> = [
        ['address',  'C.3.4.1', 'Reporter Street Address'],
        ['city',     'C.3.4.2', 'Reporter City'],
        ['state',    'C.3.4.3', 'Reporter State'],
        ['postcode', 'C.3.4.4', 'Reporter Postal Code']
      ];
      for (const [field, tag, label] of requiredAddrFields) {
        if (!primaryReporter[field]) {
          errors.push({
            field: `reporters[primary].${String(field)}`,
            message: `${label} is required for the primary reporter (${tag}) — CDER 2.18 rejects country-only reporters`,
            severity: 'error'
          });
        }
      }
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
    // B.1.5 - Patient Sex (required, must be valid E2B code: 1=Male, 2=Female)
    if (caseData.patientSex === undefined || caseData.patientSex === null) {
      errors.push({
        field: 'patientSex',
        message: 'Patient Sex is required (B.1.5)',
        severity: 'error'
      });
    } else if (![1, 2].includes(caseData.patientSex)) {
      errors.push({
        field: 'patientSex',
        message: `Patient Sex must be 1 (Male) or 2 (Female) (B.1.5). Current value: ${caseData.patientSex}`,
        severity: 'warning'
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

      // E.i.7 - Outcome required for serious reactions
      if (hasSeriousness && (reaction.outcome === undefined || reaction.outcome === null)) {
        errors.push({
          field: `reactions[${index}].outcome`,
          message: `Reaction ${index + 1}: Outcome is required for serious reactions (E.i.7)`,
          severity: 'error'
        });
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
  private validateDrugs(drugs: CaseDrug[], caseData: Case, errors: ValidationError[]): void {
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

    // ── BA/BE G.k.10a.r enforcement (SUSAR spec §4.6) ──────────────────
    // For IND-Exempt BA/BE submissions every drug must carry a role and
    // the study must contain exactly one TEST + one REFERENCE. Remaining
    // drugs (if any) must be marked NA so the G.k.10a.r slot is never
    // absent. Spec §4.6: non-BA/BE IND cases are exempt from this rule,
    // so gate on caseType === 'babe' rather than 'ind'.
    if (caseData.caseType === 'babe') {
      drugs.forEach((d, index) => {
        if (!d.fdaAdditionalDrugInfo) {
          errors.push({
            field: `drugs[${index}].fdaAdditionalDrugInfo`,
            message: `Drug ${index + 1}: fdaAdditionalDrugInfo is required for BA/BE cases (G.k.10a.r) — one of "TEST", "REFERENCE", or "NA"`,
            severity: 'error'
          });
        }
      });
      const testCount = drugs.filter((d) => d.fdaAdditionalDrugInfo === 'TEST').length;
      const refCount = drugs.filter((d) => d.fdaAdditionalDrugInfo === 'REFERENCE').length;
      if (testCount !== 1) {
        errors.push({
          field: 'drugs',
          message: `BA/BE case must contain exactly one TEST drug (G.k.10a.r=1); found ${testCount}`,
          severity: 'error'
        });
      }
      if (refCount !== 1) {
        errors.push({
          field: 'drugs',
          message: `BA/BE case must contain exactly one REFERENCE drug (G.k.10a.r=2); found ${refCount}`,
          severity: 'error'
        });
      }
    }

    drugs.forEach((drug, index) => {
      // B.4.k.1 - Drug Characterization (required, must be 1=Suspect, 2=Concomitant, 3=Interacting)
      if (drug.characterization === undefined || drug.characterization === null) {
        errors.push({
          field: `drugs[${index}].characterization`,
          message: `Drug ${index + 1}: Drug Characterization is required (B.4.k.1)`,
          severity: 'error'
        });
      } else if (![1, 2, 3].includes(drug.characterization)) {
        errors.push({
          field: `drugs[${index}].characterization`,
          message: `Drug ${index + 1}: Drug Characterization must be 1 (Suspect), 2 (Concomitant), or 3 (Interacting) (B.4.k.1). Got: ${drug.characterization}`,
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
   * Validate Premarket/IND-specific fields
   * Only runs when caseType === 'ind'
   */
  private validatePremarketFields(caseData: Case, errors: ValidationError[]): void {
    // FDA.C.5.6.r is mandatory for any study case (ind or babe) once C.5.5a
    // is populated. Per FDA 2.18 business rule confirmed by IND-T01 ACK3
    // 2026-04-27 (GAP-IND-002): "IND number of cross reported IND
    // (FDA.C.5.6.r) is mandatory when IND Number where AE Occurred
    // (FDA.C.5.5a) is not empty."
    if ((caseData.caseType === 'ind' || caseData.caseType === 'babe')
        && caseData.indStudy?.indNumber) {
      const crossRefs = caseData.indStudy.crossReferencedIndNumbers ?? [];
      if (crossRefs.length === 0) {
        errors.push({
          field: 'indStudy.crossReferencedIndNumbers',
          message: 'FDA.C.5.6.r: At least one cross-referenced IND number is required when FDA.C.5.5a (IND Number where AE Occurred) is populated',
          severity: 'error'
        });
      }
    }

    if (caseData.caseType !== 'ind') return;

    if (!caseData.indReportType) {
      errors.push({
        field: 'indReportType',
        message: 'IND Report Type is required for premarket/IND cases (7-day, 15-day, follow-up, annual)',
        severity: 'error'
      });
    }

    if (!caseData.studyId) {
      errors.push({
        field: 'studyId',
        message: 'Study ID is required for IND cases',
        severity: 'error'
      });
    }

    if (!caseData.subjectNumber) {
      errors.push({
        field: 'subjectNumber',
        message: 'Subject Number is required for IND cases',
        severity: 'error'
      });
    }

    // Date of awareness is critical for IND timelines
    if (!caseData.dateInformed) {
      errors.push({
        field: 'dateInformed',
        message: 'Date Sponsor Informed is required for IND reporting timeline compliance',
        severity: 'error'
      });
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

  /**
   * Check if a date string is a valid ISO date (YYYY-MM-DD) that parses correctly
   */
  private isValidIsoDate(dateStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  }

  /**
   * Validate that a date field, if present, is in the expected ISO format.
   * Returns true if the date is valid or absent; pushes an error if malformed.
   */
  private validateDateFormat(value: string | undefined | null, fieldName: string, label: string, errors: ValidationError[]): void {
    if (!value) return;
    if (!this.isValidIsoDate(value)) {
      errors.push({
        field: fieldName,
        message: `${label} must be a valid date in YYYY-MM-DD format (got "${value}")`,
        severity: 'error'
      });
    }
  }

  /**
   * Validate generated XML structure against E2B(R3) envelope requirements.
   * This catches structural issues that field-level validation cannot detect.
   */
  static validateXmlStructure(xml: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Must use MCCI_IN200100UV01 batch wrapper (not <ichicsr>)
    if (!xml.includes('<MCCI_IN200100UV01')) {
      errors.push({
        field: 'xmlStructure',
        message: 'XML must use MCCI_IN200100UV01 batch wrapper element (not <ichicsr>)',
        severity: 'error'
      });
    }

    // N.1.1 - Type of Messages in Batch (must be <name> element with codeSystem)
    if (!xml.includes('codeSystem="2.16.840.1.113883.3.989.2.1.1.1"')) {
      errors.push({
        field: 'N.1.1',
        message: 'Missing N.1.1 Type of Messages in Batch. Required: <name code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.1"/>',
        severity: 'error'
      });
    }

    // Batch level must have <sender> and <receiver> blocks *outside* the
    // inner PORR_IN049016UV message wrapper. Our generator emits them AFTER
    // </PORR_IN049016UV> (matches the accepted v37 + 2L8T submissions), so
    // we scan both the prefix and the suffix — the XML slice between
    // <PORR_IN049016UV> and </PORR_IN049016UV> is the only region excluded.
    const porrOpen = xml.indexOf('<PORR_IN049016UV>');
    const porrCloseTag = '</PORR_IN049016UV>';
    const porrClose = xml.indexOf(porrCloseTag);
    const batchSection =
      porrOpen >= 0 && porrClose >= 0
        ? xml.substring(0, porrOpen) + xml.substring(porrClose + porrCloseTag.length)
        : xml;

    // N.1.3 - Batch Sender Identifier inside <sender>/<device>/<id>
    if (!batchSection.includes('<sender typeCode="SND">')) {
      errors.push({
        field: 'N.1.3',
        message: 'Batch wrapper missing <sender> block. N.1.3 sender identifier must be inside <sender>/<device>/<id>.',
        severity: 'error'
      });
    } else {
      const hasSenderOidDefault = batchSection.includes('root="2.16.840.1.113883.3.989.2.1.3.13"');
      const hasSenderOidDuns = batchSection.includes('root="1.3.6.1.4.1.519.1"');
      if (!hasSenderOidDefault && !hasSenderOidDuns) {
        errors.push({
          field: 'N.1.3',
          message: 'Batch sender identifier (N.1.3) must include sender OID with FDA Sender ID or DUNS number.',
          severity: 'error'
        });
      }
    }

    // N.1.4 - Batch Receiver Identifier inside <receiver>/<device>/<id>
    if (!batchSection.includes('<receiver typeCode="RCV">')) {
      errors.push({
        field: 'N.1.4',
        message: 'Batch wrapper missing <receiver> block. N.1.4 receiver identifier must be inside <receiver>/<device>/<id>.',
        severity: 'error'
      });
    } else if (!batchSection.includes('root="2.16.840.1.113883.3.989.2.1.3.14"')) {
      errors.push({
        field: 'N.1.4',
        message: 'Missing batch receiver identifier OID (N.1.4, OID 2.16.840.1.113883.3.989.2.1.3.14)',
        severity: 'error'
      });
    }

    // Must have PORR_IN049016UV message wrapper
    if (!xml.includes('<PORR_IN049016UV>')) {
      errors.push({
        field: 'xmlStructure',
        message: 'XML must contain PORR_IN049016UV message wrapper (Section N.2). The two-level batch/message structure is required.',
        severity: 'error'
      });
    }

    // Message wrapper must have receiver and sender
    if (xml.includes('<PORR_IN049016UV>')) {
      const messageSection = xml.substring(xml.indexOf('<PORR_IN049016UV>'));
      if (!messageSection.includes('<receiver typeCode="RCV">')) {
        errors.push({
          field: 'N.2.r',
          message: 'Message wrapper missing receiver element (N.2.r)',
          severity: 'error'
        });
      }
      if (!messageSection.includes('<sender typeCode="SND">')) {
        errors.push({
          field: 'N.2.r',
          message: 'Message wrapper missing sender element (N.2.r)',
          severity: 'error'
        });
      }
    }

    // Must contain at least one safety report
    if (!xml.includes('<investigationEvent')) {
      errors.push({
        field: 'safetyReport',
        message: 'XML must contain at least one safety report (investigationEvent)',
        severity: 'error'
      });
    }

    const hasErrors = errors.some(e => e.severity === 'error');
    return { valid: !hasErrors, errors };
  }
}
