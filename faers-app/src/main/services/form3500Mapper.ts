/**
 * Form 3500A Field Mapper
 *
 * Maps extracted Form 3500A PDF data to E2B(R3) Case, Drug, Reaction, and Reporter types.
 */

import type { Form3500AData, Form3500AProduct } from '../../shared/types/form3500.types';
import type {
  UpdateCaseDTO,
  CaseDrug,
  CaseDrugDosage,
  CaseReaction,
  CaseReporter
} from '../../shared/types/case.types';
import {
  PatientSex,
  AgeUnit,
  ReporterQualification,
  DrugCharacterization,
  ChallengeResult,
  ReactionOutcome,
  ReportType,
  ReportCategory,
  SenderType
} from '../../shared/types/case.types';

/**
 * Result of mapping Form 3500A data
 */
export interface MappedForm3500AData {
  caseData: UpdateCaseDTO;
  drugs: Partial<CaseDrug>[];
  reactions: Partial<CaseReaction>[];
  reporters: Partial<CaseReporter>[];
  warnings: string[];
}

/**
 * Maps FDA Form 3500A data to E2B(R3) format
 */
export class Form3500AMapper {
  /**
   * Map all Form 3500A data to application types
   */
  map(formData: Form3500AData): MappedForm3500AData {
    const warnings: string[] = [];

    return {
      caseData: this.mapCaseData(formData, warnings),
      drugs: this.mapDrugs(formData, warnings),
      reactions: this.mapReactions(formData, warnings),
      reporters: this.mapReporters(formData, warnings),
      warnings
    };
  }

  /**
   * Map Form 3500A data to Case fields
   */
  private mapCaseData(formData: Form3500AData, warnings: string[]): UpdateCaseDTO {
    const { patient, event, manufacturer } = formData;

    // Parse the receipt date first (we'll reuse it)
    const receiptDate = this.parseDate(event.dateOfReport, warnings) ||
                        this.parseDate(manufacturer.dateReceived, warnings) ||
                        new Date().toISOString().split('T')[0]; // Fallback to today

    // Parse sender name from manufacturer contact
    const senderNames = this.parseSenderName(manufacturer.contactName);

    const caseData: UpdateCaseDTO = {
      // Report info - default to Spontaneous for Form 3500
      reportType: ReportType.Spontaneous,
      initialOrFollowup: ReportCategory.Initial,
      receiptDate,
      receiveDate: receiptDate, // E2B requires both dates; use same value

      // Sender info from manufacturer section
      senderType: SenderType.PharmaceuticalCompany,
      senderOrganization: manufacturer.contactName || 'Unknown Organization',
      senderGivenName: senderNames.givenName,
      senderFamilyName: senderNames.familyName,
      senderAddress: manufacturer.address,
      senderPhone: manufacturer.phone,
      senderEmail: manufacturer.email,

      // Case identification
      worldwideCaseId: manufacturer.mfrReportNumber || formData.mfrReportNumber,

      // Patient info
      patientInitials: patient.identifier ? this.extractInitials(patient.identifier) : undefined,
      patientAge: patient.age,
      patientAgeUnit: this.mapAgeUnit(patient.ageUnit),
      patientBirthdate: this.parseDate(patient.dateOfBirth, warnings),
      patientSex: this.mapSex(patient.sex),
      patientWeight: this.convertWeight(patient.weight, patient.weightUnit),

      // Death info
      patientDeath: event.outcomes.death,
      deathDate: this.parseDate(event.outcomes.deathDate, warnings),

      // Narrative
      caseNarrative: this.buildNarrative(formData, warnings)
    };

    return this.removeUndefined(caseData);
  }

  /**
   * Map Form 3500A products to CaseDrug array
   */
  private mapDrugs(formData: Form3500AData, warnings: string[]): Partial<CaseDrug>[] {
    return formData.products.map((product, index) => this.mapProduct(product, index, warnings));
  }

  /**
   * Map a single Form 3500A product to CaseDrug
   */
  private mapProduct(product: Form3500AProduct, index: number, warnings: string[]): Partial<CaseDrug> {
    const drug: Partial<CaseDrug> = {
      // Concomitant medications use Concomitant characterization
      characterization: product.isConcomitant ? DrugCharacterization.Concomitant : DrugCharacterization.Suspect,
      productName: product.productName || 'Unknown Product',
      indication: product.indication,
      startDate: this.parseDate(product.therapyStartDate, warnings),
      endDate: this.parseDate(product.therapyEndDate, warnings),
      dechallenge: this.mapChallengeResult(product.eventAbatedOnStop),
      rechallenge: this.mapChallengeResult(product.eventReappearedOnReintro),
      sortOrder: index + 1,

      // Source document fields (not part of E2B R3)
      ndcNumber: product.ndcNumber,
      manufacturerName: product.manufacturerName,
      lotNumber: product.lotNumber,
      expirationDate: this.parseDate(product.expirationDate, warnings)
    };

    // Create dosage record if we have dosage information
    if (product.dose || product.doseUnit || product.frequency || product.route) {
      const dosage: Partial<CaseDrugDosage> = {
        dose: product.dose ? parseFloat(product.dose) || undefined : undefined,
        doseUnit: product.doseUnit,
        route: product.route,
        // Store frequency in dosageText since E2B doesn't have a dedicated frequency field
        dosageText: this.buildDosageText(product),
        sortOrder: 1
      };

      drug.dosages = [this.removeUndefined(dosage) as CaseDrugDosage];
    }

    // If we have duration info
    if (product.duration) {
      drug.duration = parseInt(product.duration, 10) || undefined;
      drug.durationUnit = product.durationUnit;
    }

    return this.removeUndefined(drug);
  }

  /**
   * Map Form 3500A event data to CaseReaction array
   */
  private mapReactions(formData: Form3500AData, warnings: string[]): Partial<CaseReaction>[] {
    const { event, manufacturer } = formData;
    const reactions: Partial<CaseReaction>[] = [];

    // Create reaction from adverse event terms if available
    const aeTerm = manufacturer.adverseEventTerms || event.description;

    if (aeTerm) {
      // Split multiple AE terms if comma-separated
      const terms = aeTerm.split(',').map(t => t.trim()).filter(t => t.length > 0);

      terms.forEach((term, index) => {
        // Check if any seriousness criterion is set
        const hasSeriousness = event.outcomes.death ||
                               event.outcomes.lifeThreatening ||
                               event.outcomes.hospitalization ||
                               event.outcomes.disability ||
                               event.outcomes.congenitalAnomaly ||
                               event.outcomes.otherSerious;

        const reaction: Partial<CaseReaction> = {
          reactionTerm: term,
          startDate: this.parseDate(event.dateOfEvent, warnings),
          seriousDeath: event.outcomes.death,
          seriousLifeThreat: event.outcomes.lifeThreatening,
          seriousHospitalization: event.outcomes.hospitalization,
          seriousDisability: event.outcomes.disability,
          seriousCongenital: event.outcomes.congenitalAnomaly,
          // Default to "Other Serious" if no seriousness criteria specified
          seriousOther: event.outcomes.otherSerious || !hasSeriousness,
          outcome: event.outcomes.death ? ReactionOutcome.Fatal : ReactionOutcome.Unknown,
          sortOrder: index + 1
        };

        reactions.push(this.removeUndefined(reaction));
      });
    } else {
      // Create a placeholder reaction if we have event description
      if (event.description) {
        // Check if any seriousness criterion is set
        const hasSeriousness = event.outcomes.death ||
                               event.outcomes.lifeThreatening ||
                               event.outcomes.hospitalization ||
                               event.outcomes.disability ||
                               event.outcomes.congenitalAnomaly ||
                               event.outcomes.otherSerious;

        const reaction: Partial<CaseReaction> = {
          reactionTerm: 'See narrative for event description',
          nativeTerm: event.description,
          startDate: this.parseDate(event.dateOfEvent, warnings),
          seriousDeath: event.outcomes.death,
          seriousLifeThreat: event.outcomes.lifeThreatening,
          seriousHospitalization: event.outcomes.hospitalization,
          seriousDisability: event.outcomes.disability,
          seriousCongenital: event.outcomes.congenitalAnomaly,
          // Default to "Other Serious" if no seriousness criteria specified
          seriousOther: event.outcomes.otherSerious || !hasSeriousness,
          outcome: event.outcomes.death ? ReactionOutcome.Fatal : ReactionOutcome.Unknown,
          sortOrder: 1
        };

        reactions.push(this.removeUndefined(reaction));
      } else {
        warnings.push('No adverse event term or description found in form');
      }
    }

    return reactions;
  }

  /**
   * Map Form 3500A reporter data to CaseReporter array
   */
  private mapReporters(formData: Form3500AData, warnings: string[]): Partial<CaseReporter>[] {
    const { reporter } = formData;
    const reporters: Partial<CaseReporter>[] = [];

    // Only create reporter if we have at least a name
    if (reporter.lastName || reporter.firstName) {
      const caseReporter: Partial<CaseReporter> = {
        isPrimary: true,
        givenName: reporter.firstName,
        familyName: reporter.lastName,
        qualification: this.mapQualification(reporter.healthProfessional, reporter.occupation),
        organization: reporter.occupation,
        address: reporter.address,
        city: reporter.city,
        state: reporter.state,
        postcode: reporter.zipCode,
        country: reporter.country || 'US',
        phone: reporter.phone,
        email: reporter.email,
        sortOrder: 1
      };

      reporters.push(this.removeUndefined(caseReporter));
    } else {
      warnings.push('No reporter information found in form');
    }

    return reporters;
  }

  /**
   * Build narrative text from event description and lab data
   */
  private buildNarrative(formData: Form3500AData, _warnings: string[]): string {
    const parts: string[] = [];
    const { event, patient } = formData;

    // Add event description
    if (event.description) {
      parts.push(event.description);
    }

    // Add lab data if available
    if (event.labData) {
      parts.push(`\n\nLab Data: ${event.labData}`);
    }

    if (event.labDataComments) {
      parts.push(`\nLab Comments: ${event.labDataComments}`);
    }

    // Add medical history if available
    if (event.medicalHistory) {
      parts.push(`\n\nMedical History: ${event.medicalHistory}`);
    }

    // Add ethnicity if available
    if (patient.ethnicity && patient.ethnicity.length > 0) {
      parts.push(`\n\nEthnicity: ${patient.ethnicity.join(', ')}`);
    }

    return parts.join('').trim();
  }

  /**
   * Build dosage text from product fields
   */
  private buildDosageText(product: Form3500AProduct): string | undefined {
    const parts: string[] = [];

    if (product.dose && product.doseUnit) {
      parts.push(`${product.dose} ${product.doseUnit}`);
    } else if (product.dose) {
      parts.push(product.dose);
    }

    if (product.frequency) {
      parts.push(product.frequency);
    }

    if (product.route) {
      parts.push(`via ${product.route}`);
    }

    if (product.strength && product.strengthUnit) {
      if (parts.length > 0) {
        parts.push(`(strength: ${product.strength} ${product.strengthUnit})`);
      } else {
        parts.push(`${product.strength} ${product.strengthUnit}`);
      }
    }

    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  /**
   * Map sex value to PatientSex enum
   */
  private mapSex(sex?: 'Male' | 'Female'): PatientSex | undefined {
    switch (sex) {
      case 'Male':
        return PatientSex.Male;
      case 'Female':
        return PatientSex.Female;
      default:
        return undefined;
    }
  }

  /**
   * Map age unit to AgeUnit enum
   */
  private mapAgeUnit(unit?: 'Year' | 'Month' | 'Week' | 'Day'): AgeUnit | undefined {
    switch (unit) {
      case 'Year':
        return AgeUnit.Year;
      case 'Month':
        return AgeUnit.Month;
      case 'Week':
        return AgeUnit.Week;
      case 'Day':
        return AgeUnit.Day;
      default:
        return undefined;
    }
  }

  /**
   * Map reporter qualification
   */
  private mapQualification(
    healthProfessional: boolean,
    occupation?: string
  ): ReporterQualification {
    if (!healthProfessional) {
      return ReporterQualification.Consumer;
    }

    const occ = (occupation || '').toLowerCase();

    if (occ.includes('physician') || occ.includes('doctor') || occ.includes('md')) {
      return ReporterQualification.Physician;
    }

    if (occ.includes('pharmacist')) {
      return ReporterQualification.Pharmacist;
    }

    if (occ.includes('lawyer') || occ.includes('attorney')) {
      return ReporterQualification.Lawyer;
    }

    return ReporterQualification.OtherHealthProfessional;
  }

  /**
   * Map dechallenge/rechallenge result
   */
  private mapChallengeResult(value?: 'Yes' | 'No' | 'DoesntApply'): ChallengeResult | undefined {
    switch (value) {
      case 'Yes':
        return ChallengeResult.Yes;
      case 'No':
        return ChallengeResult.No;
      case 'DoesntApply':
        return ChallengeResult.NotApplicable;
      default:
        return undefined;
    }
  }

  /**
   * Convert weight to kg (E2B standard)
   */
  private convertWeight(weight?: number, unit?: 'lb' | 'kg'): number | undefined {
    if (!weight) return undefined;

    if (unit === 'lb') {
      // Convert pounds to kg
      return Math.round(weight * 0.453592 * 10) / 10;
    }

    return weight;
  }

  /**
   * Parse date string to ISO format
   * Handles formats like "01-Jan-2026", "01Jan2026", "01/01/2026", "2026-01-01", "12-12-2025"
   */
  private parseDate(dateStr?: string, warnings?: string[]): string | undefined {
    if (!dateStr) return undefined;

    try {
      // Try parsing different formats
      const trimmed = dateStr.trim();

      // Handle special non-date values
      if (/^(ongoing|current|present|continuing|unknown|n\/a|na|none)$/i.test(trimmed)) {
        return undefined; // Not a parseable date, skip without warning
      }

      // Already ISO format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }

      // DD-Mon-YYYY (01-Jan-2026)
      const monthMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      if (monthMatch) {
        const [, day, month, year] = monthMatch;
        const monthNum = this.monthToNumber(month);
        if (monthNum) {
          return `${year}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      // DDMonYYYY without separators (01Jan2026)
      const noSepMatch = trimmed.match(/^(\d{1,2})([A-Za-z]{3})(\d{4})$/);
      if (noSepMatch) {
        const [, day, month, year] = noSepMatch;
        const monthNum = this.monthToNumber(month);
        if (monthNum) {
          return `${year}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      // MM-DD-YYYY or DD-MM-YYYY with dashes (12-12-2025, 12-25-2025)
      const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (dashMatch) {
        const [, part1, part2, year] = dashMatch;
        // Assume MM-DD-YYYY format (US standard for FDA forms)
        const month = part1.padStart(2, '0');
        const day = part2.padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      // MM/DD/YYYY with slashes
      const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) {
        const [, month, day, year] = slashMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }

      // YYYYMMDD
      if (/^\d{8}$/.test(trimmed)) {
        return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
      }

      // Try parsing as a Date object as fallback
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }

      warnings?.push(`Unable to parse date: ${dateStr}`);
      return undefined;
    } catch (error) {
      warnings?.push(`Date parsing error for "${dateStr}": ${error}`);
      return undefined;
    }
  }

  /**
   * Convert month abbreviation to number
   */
  private monthToNumber(month: string): number | undefined {
    const months: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };

    return months[month.toLowerCase()];
  }

  /**
   * Parse sender name from contact name string
   * Handles formats like "John Smith", "Smith, John", or just "John"
   */
  private parseSenderName(contactName?: string): { givenName: string; familyName: string } {
    if (!contactName || contactName.trim().length === 0) {
      return { givenName: 'Unknown', familyName: 'Sender' };
    }

    const trimmed = contactName.trim();

    // Check for "Last, First" format
    if (trimmed.includes(',')) {
      const [last, first] = trimmed.split(',').map(s => s.trim());
      return {
        givenName: first || 'Unknown',
        familyName: last || 'Sender'
      };
    }

    // Check for "First Last" format
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return {
        givenName: parts[0],
        familyName: parts.slice(1).join(' ')
      };
    }

    // Single name - use as family name
    return {
      givenName: 'Unknown',
      familyName: parts[0] || 'Sender'
    };
  }

  /**
   * Extract initials from patient identifier
   */
  private extractInitials(identifier: string): string {
    // If identifier looks like initials already (2-4 uppercase letters)
    if (/^[A-Z]{2,4}$/.test(identifier)) {
      return identifier;
    }

    // Try to extract letters only (first 4)
    const letters = identifier.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4);
    return letters || identifier.slice(0, 4).toUpperCase();
  }

  /**
   * Remove undefined values from object and convert booleans to 0/1 for SQLite
   */
  private removeUndefined<T extends object>(obj: T): T {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, typeof v === 'boolean' ? (v ? 1 : 0) : v])
    ) as T;
  }
}

export default Form3500AMapper;
