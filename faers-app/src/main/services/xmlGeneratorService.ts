/**
 * E2B(R3) XML Generator Service
 *
 * Generates ICH E2B(R3) compliant XML for ICSR submissions to FDA.
 * Reference: ICH E2B(R3) Implementation Guide
 */

import { v4 as uuidv4 } from 'uuid';
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
  SubmissionEnvironment,
  SubmissionReportType
} from '../../shared/types/case.types';
import { BATCH_RECEIVERS } from '../../shared/types/case.types';

export interface XMLGenerationOptions {
  submissionEnvironment?: SubmissionEnvironment;
  submissionReportType?: SubmissionReportType;
}

export interface XMLGenerationResult {
  success: boolean;
  xml?: string;
  errors: string[];
  warnings: string[];
  batchReceiver?: string; // The batch receiver used in the generated XML
}

export class XMLGeneratorService {
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
   * Generate E2B(R3) XML for a case
   * @param caseId - The case ID to generate XML for
   * @param options - Optional generation options including submission environment
   */
  generate(caseId: string, options: XMLGenerationOptions = {}): XMLGenerationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Default to Postmarket if not specified
    // Note: Batch receiver is the same for Test and Production when using USP
    const reportType = options.submissionReportType || 'Postmarket';
    const batchReceiver = BATCH_RECEIVERS[reportType];

    // Load case with all related data
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      return { success: false, errors: [`Case not found: ${caseId}`], warnings: [] };
    }

    const reporters = this.reporterRepo.findByCaseId(caseId);
    const reactions = this.reactionRepo.findByCaseId(caseId);
    const drugs = this.drugRepo.findByCaseId(caseId);

    // Basic validation
    if (reactions.length === 0) {
      errors.push('At least one reaction is required');
    }
    if (drugs.length === 0) {
      errors.push('At least one drug is required');
    }
    if (!caseData.caseNarrative) {
      errors.push('Case narrative is required');
    }

    // Warnings for recommended fields
    if (!caseData.receiptDate) {
      warnings.push('Receipt date is recommended');
    }
    if (reporters.length === 0) {
      warnings.push('At least one reporter is recommended');
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    try {
      const xml = this.buildXML(caseData, reporters, reactions, drugs, batchReceiver);
      return { success: true, xml, errors: [], warnings, batchReceiver };
    } catch (error) {
      return {
        success: false,
        errors: [`XML generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Build the complete E2B(R3) XML document
   */
  private buildXML(
    caseData: Case,
    reporters: CaseReporter[],
    reactions: CaseReaction[],
    drugs: CaseDrug[],
    batchReceiver: string
  ): string {
    const messageId = uuidv4();
    const creationTime = this.formatDateTime(new Date());

    const lines: string[] = [];

    // XML Declaration
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');

    // Root element with namespaces
    lines.push('<ichicsr lang="en" xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">');

    // Message Header (includes Batch Receiver N.1.4)
    lines.push(this.buildMessageHeader(messageId, creationTime, caseData, batchReceiver));

    // Control Act with Safety Report
    lines.push('  <controlActProcess classCode="CACT" moodCode="EVN">');
    lines.push('    <code code="MCCI_TE100100UV01" codeSystem="2.16.840.1.113883.1.18"/>');
    lines.push('    <subject typeCode="SUBJ">');

    // Investigation Event (Safety Report)
    lines.push(this.buildSafetyReport(caseData, reporters, reactions, drugs));

    lines.push('    </subject>');
    lines.push('  </controlActProcess>');
    lines.push('</ichicsr>');

    return lines.join('\n');
  }

  /**
   * Build message header section
   * @param batchReceiver - The batch receiver identifier (N.1.4): ZZFDA for postmarket, ZZFDA_PREMKT for premarket
   */
  private buildMessageHeader(messageId: string, creationTime: string, caseData: Case, batchReceiver: string): string {
    const lines: string[] = [];

    // Message ID
    lines.push(`  <id root="2.16.840.1.113883.3.989.2.1.3.1" extension="${this.escapeXml(messageId)}"/>`);

    // Creation time
    lines.push(`  <creationTime value="${creationTime}"/>`);

    // Interaction ID
    lines.push('  <responseModeCode code="D"/>');
    lines.push('  <interactionId root="2.16.840.1.113883.1.6" extension="MCCI_IN200100UV01"/>');
    lines.push('  <processingCode code="P"/>');
    lines.push('  <processingModeCode code="T"/>');
    lines.push('  <acceptAckCode code="AL"/>');

    // Receiver (FDA) with Batch Receiver (N.1.4)
    // Uses routing identifier based on report type (same for Test and Production):
    // - Postmarket: ZZFDA
    // - Premarket: ZZFDA_PREMKT
    // The distinction between test/production is made in FDA ESG NextGen USP portal, not in XML
    lines.push('  <receiver typeCode="RCV">');
    lines.push('    <device classCode="DEV" determinerCode="INSTANCE">');
    lines.push(`      <id root="2.16.840.1.113883.3.989.2.1.3.14" extension="${this.escapeXml(batchReceiver)}"/>`);
    lines.push('    </device>');
    lines.push('  </receiver>');

    // Sender
    lines.push('  <sender typeCode="SND">');
    lines.push('    <device classCode="DEV" determinerCode="INSTANCE">');
    const senderOrg = caseData.senderOrganization || 'Unknown';
    lines.push(`      <id root="2.16.840.1.113883.3.989.2.1.3.13" extension="${this.escapeXml(senderOrg)}"/>`);
    lines.push('    </device>');
    lines.push('  </sender>');

    return lines.join('\n');
  }

  /**
   * Build the safety report (investigationEvent)
   */
  private buildSafetyReport(
    caseData: Case,
    reporters: CaseReporter[],
    reactions: CaseReaction[],
    drugs: CaseDrug[]
  ): string {
    const lines: string[] = [];

    lines.push('      <investigationEvent classCode="INVSTG" moodCode="EVN">');

    // Safety Report ID (A.1.0.1)
    const safetyReportId = caseData.safetyReportId || caseData.id;
    lines.push(`        <id root="2.16.840.1.113883.3.989.2.1.3.1" extension="${this.escapeXml(safetyReportId)}"/>`);

    // Safety Report Version
    lines.push(`        <id root="2.16.840.1.113883.3.989.2.1.3.4" extension="${caseData.version}"/>`);

    // Report Type (A.1.2)
    if (caseData.reportType) {
      lines.push(`        <code code="${caseData.reportType}" codeSystem="2.16.840.1.113883.3.989.2.1.1.2"/>`);
    }

    // Receipt Date (A.1.5.1)
    if (caseData.receiptDate) {
      lines.push('        <effectiveTime>');
      lines.push(`          <low value="${this.formatDate(caseData.receiptDate)}"/>`);
      lines.push('        </effectiveTime>');
    }

    // Availability (A.1.6)
    lines.push(`        <availabilityTime value="${this.formatDateTime(new Date())}"/>`);

    // Primary Source (Reporters - A.2)
    for (const reporter of reporters) {
      lines.push(this.buildReporter(reporter));
    }

    // Sender (A.3)
    lines.push(this.buildSender(caseData));

    // Patient (B.1)
    lines.push(this.buildPatient(caseData, reactions, drugs));

    // Case Narrative (B.5.1)
    if (caseData.caseNarrative) {
      lines.push('        <component typeCode="COMP">');
      lines.push('          <adverseEventAssessment classCode="INVSTG" moodCode="EVN">');
      lines.push('            <component typeCode="COMP">');
      lines.push('              <causalityAssessment classCode="OBS" moodCode="EVN">');
      lines.push('                <code code="C53253" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Case Narrative"/>');
      lines.push('                <value xsi:type="ED">');
      lines.push(`                  ${this.escapeXml(caseData.caseNarrative)}`);
      lines.push('                </value>');
      lines.push('              </causalityAssessment>');
      lines.push('            </component>');
      lines.push('          </adverseEventAssessment>');
      lines.push('        </component>');
    }

    lines.push('      </investigationEvent>');

    return lines.join('\n');
  }

  /**
   * Build reporter (primary source) section (A.2)
   */
  private buildReporter(reporter: CaseReporter): string {
    const lines: string[] = [];

    lines.push('        <author typeCode="AUT">');
    lines.push('          <assignedEntity classCode="ASSIGNED">');

    // Reporter qualification (A.2.1.4)
    if (reporter.qualification) {
      lines.push(`          <code code="${reporter.qualification}" codeSystem="2.16.840.1.113883.3.989.2.1.1.6"/>`);
    }

    // Reporter address
    if (reporter.address || reporter.city || reporter.state || reporter.postcode || reporter.country) {
      lines.push('          <addr>');
      if (reporter.address) {
        lines.push(`            <streetAddressLine>${this.escapeXml(reporter.address)}</streetAddressLine>`);
      }
      if (reporter.city) {
        lines.push(`            <city>${this.escapeXml(reporter.city)}</city>`);
      }
      if (reporter.state) {
        lines.push(`            <state>${this.escapeXml(reporter.state)}</state>`);
      }
      if (reporter.postcode) {
        lines.push(`            <postalCode>${this.escapeXml(reporter.postcode)}</postalCode>`);
      }
      if (reporter.country) {
        lines.push(`            <country>${this.escapeXml(reporter.country)}</country>`);
      }
      lines.push('          </addr>');
    }

    // Reporter telecom
    if (reporter.phone) {
      lines.push(`          <telecom value="tel:${this.escapeXml(reporter.phone)}"/>`);
    }
    if (reporter.email) {
      lines.push(`          <telecom value="mailto:${this.escapeXml(reporter.email)}"/>`);
    }

    // Reporter name
    lines.push('          <assignedPerson classCode="PSN" determinerCode="INSTANCE">');
    lines.push('            <name>');
    if (reporter.title) {
      lines.push(`              <prefix>${this.escapeXml(reporter.title)}</prefix>`);
    }
    if (reporter.givenName) {
      lines.push(`              <given>${this.escapeXml(reporter.givenName)}</given>`);
    }
    if (reporter.familyName) {
      lines.push(`              <family>${this.escapeXml(reporter.familyName)}</family>`);
    }
    lines.push('            </name>');
    lines.push('          </assignedPerson>');

    // Reporter organization
    if (reporter.organization) {
      lines.push('          <representedOrganization classCode="ORG" determinerCode="INSTANCE">');
      lines.push(`            <name>${this.escapeXml(reporter.organization)}</name>`);
      lines.push('          </representedOrganization>');
    }

    lines.push('          </assignedEntity>');
    lines.push('        </author>');

    return lines.join('\n');
  }

  /**
   * Build sender section (A.3)
   */
  private buildSender(caseData: Case): string {
    const lines: string[] = [];

    lines.push('        <author typeCode="AUT">');
    lines.push('          <assignedEntity classCode="ASSIGNED">');

    // Sender type (A.3.1.1)
    if (caseData.senderType) {
      lines.push(`          <code code="${caseData.senderType}" codeSystem="2.16.840.1.113883.3.989.2.1.1.7"/>`);
    }

    // Sender address
    if (caseData.senderAddress || caseData.senderCity || caseData.senderState) {
      lines.push('          <addr>');
      if (caseData.senderAddress) {
        lines.push(`            <streetAddressLine>${this.escapeXml(caseData.senderAddress)}</streetAddressLine>`);
      }
      if (caseData.senderCity) {
        lines.push(`            <city>${this.escapeXml(caseData.senderCity)}</city>`);
      }
      if (caseData.senderState) {
        lines.push(`            <state>${this.escapeXml(caseData.senderState)}</state>`);
      }
      if (caseData.senderPostcode) {
        lines.push(`            <postalCode>${this.escapeXml(caseData.senderPostcode)}</postalCode>`);
      }
      if (caseData.senderCountry) {
        lines.push(`            <country>${this.escapeXml(caseData.senderCountry)}</country>`);
      }
      lines.push('          </addr>');
    }

    // Sender telecom
    if (caseData.senderPhone) {
      lines.push(`          <telecom value="tel:${this.escapeXml(caseData.senderPhone)}"/>`);
    }
    if (caseData.senderEmail) {
      lines.push(`          <telecom value="mailto:${this.escapeXml(caseData.senderEmail)}"/>`);
    }

    // Sender name
    lines.push('          <assignedPerson classCode="PSN" determinerCode="INSTANCE">');
    lines.push('            <name>');
    if (caseData.senderGivenName) {
      lines.push(`              <given>${this.escapeXml(caseData.senderGivenName)}</given>`);
    }
    if (caseData.senderFamilyName) {
      lines.push(`              <family>${this.escapeXml(caseData.senderFamilyName)}</family>`);
    }
    lines.push('            </name>');
    lines.push('          </assignedPerson>');

    // Sender organization
    if (caseData.senderOrganization) {
      lines.push('          <representedOrganization classCode="ORG" determinerCode="INSTANCE">');
      lines.push(`            <name>${this.escapeXml(caseData.senderOrganization)}</name>`);
      if (caseData.senderDepartment) {
        lines.push('            <assignedEntity classCode="ASSIGNED">');
        lines.push('              <representedOrganization classCode="ORG" determinerCode="INSTANCE">');
        lines.push(`                <name>${this.escapeXml(caseData.senderDepartment)}</name>`);
        lines.push('              </representedOrganization>');
        lines.push('            </assignedEntity>');
      }
      lines.push('          </representedOrganization>');
    }

    lines.push('          </assignedEntity>');
    lines.push('        </author>');

    return lines.join('\n');
  }

  /**
   * Build patient section (B.1) with reactions and drugs
   */
  private buildPatient(caseData: Case, reactions: CaseReaction[], drugs: CaseDrug[]): string {
    const lines: string[] = [];

    lines.push('        <subject typeCode="SBJ">');
    lines.push('          <primaryRole classCode="INVSBJ">');

    // Patient identification
    lines.push('            <player1 classCode="PSN" determinerCode="INSTANCE">');

    // Patient name/initials (B.1.1)
    if (caseData.patientInitials) {
      lines.push('              <name>');
      lines.push(`                <given>${this.escapeXml(caseData.patientInitials)}</given>`);
      lines.push('              </name>');
    }

    // Patient sex (B.1.5)
    if (caseData.patientSex !== undefined) {
      const sexCode = caseData.patientSex === 1 ? 'M' : caseData.patientSex === 2 ? 'F' : 'UN';
      lines.push(`              <administrativeGenderCode code="${sexCode}" codeSystem="2.16.840.1.113883.5.1"/>`);
    }

    // Patient birth date (B.1.2.1)
    if (caseData.patientBirthdate) {
      lines.push(`              <birthTime value="${this.formatDate(caseData.patientBirthdate)}"/>`);
    }

    lines.push('            </player1>');

    // Patient age (B.1.2.2)
    if (caseData.patientAge !== undefined) {
      lines.push('            <subjectOf2 typeCode="SBJ">');
      lines.push('              <observation classCode="OBS" moodCode="EVN">');
      lines.push('                <code code="C25150" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Age"/>');
      const ageUnit = this.getAgeUnitCode(caseData.patientAgeUnit);
      lines.push(`                <value xsi:type="PQ" value="${caseData.patientAge}" unit="${ageUnit}"/>`);
      lines.push('              </observation>');
      lines.push('            </subjectOf2>');
    }

    // Patient weight (B.1.3)
    if (caseData.patientWeight !== undefined) {
      lines.push('            <subjectOf2 typeCode="SBJ">');
      lines.push('              <observation classCode="OBS" moodCode="EVN">');
      lines.push('                <code code="C25208" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Weight"/>');
      lines.push(`                <value xsi:type="PQ" value="${caseData.patientWeight}" unit="kg"/>`);
      lines.push('              </observation>');
      lines.push('            </subjectOf2>');
    }

    // Patient height (B.1.4)
    if (caseData.patientHeight !== undefined) {
      lines.push('            <subjectOf2 typeCode="SBJ">');
      lines.push('              <observation classCode="OBS" moodCode="EVN">');
      lines.push('                <code code="C25347" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Height"/>');
      lines.push(`                <value xsi:type="PQ" value="${caseData.patientHeight}" unit="cm"/>`);
      lines.push('              </observation>');
      lines.push('            </subjectOf2>');
    }

    // Death information (B.1.9)
    if (caseData.patientDeath) {
      lines.push('            <subjectOf2 typeCode="SBJ">');
      lines.push('              <observation classCode="OBS" moodCode="EVN">');
      lines.push('                <code code="C28554" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Death"/>');
      lines.push('                <value xsi:type="BL" value="true"/>');
      if (caseData.deathDate) {
        lines.push(`                <effectiveTime value="${this.formatDate(caseData.deathDate)}"/>`);
      }
      lines.push('              </observation>');
      lines.push('            </subjectOf2>');
    }

    // Reactions (B.2)
    for (const reaction of reactions) {
      lines.push(this.buildReaction(reaction));
    }

    // Drugs (B.4)
    for (const drug of drugs) {
      lines.push(this.buildDrug(drug));
    }

    lines.push('          </primaryRole>');
    lines.push('        </subject>');

    return lines.join('\n');
  }

  /**
   * Build reaction section (B.2)
   */
  private buildReaction(reaction: CaseReaction): string {
    const lines: string[] = [];

    lines.push('            <subjectOf2 typeCode="SBJ">');
    lines.push('              <observation classCode="OBS" moodCode="EVN">');

    // Reaction/Event MedDRA term (B.2.i.1)
    if (reaction.meddraCode) {
      lines.push(`                <code code="${this.escapeXml(reaction.meddraCode)}" codeSystem="2.16.840.1.113883.6.163" displayName="${this.escapeXml(reaction.reactionTerm)}"/>`);
    } else {
      lines.push(`                <code displayName="${this.escapeXml(reaction.reactionTerm)}"/>`);
    }

    // Reaction dates (B.2.i.3, B.2.i.4)
    if (reaction.startDate || reaction.endDate) {
      lines.push('                <effectiveTime>');
      if (reaction.startDate) {
        lines.push(`                  <low value="${this.formatDate(reaction.startDate)}"/>`);
      }
      if (reaction.endDate) {
        lines.push(`                  <high value="${this.formatDate(reaction.endDate)}"/>`);
      }
      lines.push('                </effectiveTime>');
    }

    // Seriousness criteria (B.2.i.7)
    lines.push('                <outboundRelationship2 typeCode="PERT">');
    lines.push('                  <observation classCode="OBS" moodCode="EVN">');
    lines.push('                    <code code="C83121" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Seriousness"/>');

    // Build seriousness flags
    const seriousnessFlags: string[] = [];
    if (reaction.seriousDeath) seriousnessFlags.push('death');
    if (reaction.seriousLifeThreat) seriousnessFlags.push('lifeThreatening');
    if (reaction.seriousHospitalization) seriousnessFlags.push('hospitalization');
    if (reaction.seriousDisability) seriousnessFlags.push('disability');
    if (reaction.seriousCongenital) seriousnessFlags.push('congenitalAnomaly');
    if (reaction.seriousOther) seriousnessFlags.push('otherMedicallyImportant');

    if (seriousnessFlags.length > 0) {
      lines.push(`                    <value xsi:type="CE" code="${seriousnessFlags.join(',')}" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"/>`);
    }

    lines.push('                  </observation>');
    lines.push('                </outboundRelationship2>');

    // Outcome (B.2.i.8)
    if (reaction.outcome !== undefined) {
      lines.push('                <outboundRelationship2 typeCode="PERT">');
      lines.push('                  <observation classCode="OBS" moodCode="EVN">');
      lines.push('                    <code code="C49489" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Outcome"/>');
      lines.push(`                    <value xsi:type="CE" code="${reaction.outcome}" codeSystem="2.16.840.1.113883.3.989.2.1.1.11"/>`);
      lines.push('                  </observation>');
      lines.push('                </outboundRelationship2>');
    }

    lines.push('              </observation>');
    lines.push('            </subjectOf2>');

    return lines.join('\n');
  }

  /**
   * Build drug section (B.4)
   */
  private buildDrug(drug: CaseDrug): string {
    const lines: string[] = [];

    lines.push('            <subjectOf2 typeCode="SBJ">');
    lines.push('              <organizer classCode="CATEGORY" moodCode="EVN">');

    // Drug characterization (B.4.k.1)
    const charCode = drug.characterization === 1 ? 'suspect' : drug.characterization === 2 ? 'concomitant' : 'interacting';
    lines.push(`                <code code="${charCode}" codeSystem="2.16.840.1.113883.3.989.2.1.1.13"/>`);

    lines.push('                <component typeCode="COMP">');
    lines.push('                  <substanceAdministration classCode="SBADM" moodCode="EVN">');

    // Drug dates (B.4.k.8, B.4.k.9)
    if (drug.startDate || drug.endDate) {
      lines.push('                    <effectiveTime xsi:type="IVL_TS">');
      if (drug.startDate) {
        lines.push(`                      <low value="${this.formatDate(drug.startDate)}"/>`);
      }
      if (drug.endDate) {
        lines.push(`                      <high value="${this.formatDate(drug.endDate)}"/>`);
      }
      lines.push('                    </effectiveTime>');
    }

    // Route of administration (B.4.k.4.r.8)
    if (drug.dosages && drug.dosages.length > 0 && drug.dosages[0].route) {
      const routeCode = this.getRouteCode(drug.dosages[0].route);
      lines.push(`                    <routeCode code="${routeCode}" codeSystem="2.16.840.1.113883.3.989.2.1.1.14"/>`);
    }

    // Dosage information (B.4.k.4)
    if (drug.dosages && drug.dosages.length > 0) {
      const dosage = drug.dosages[0];
      if (dosage.dose !== undefined || dosage.doseUnit) {
        lines.push('                    <doseQuantity>');
        if (dosage.dose !== undefined) {
          const unit = dosage.doseUnit || 'unit';
          lines.push(`                      <center value="${dosage.dose}" unit="${this.escapeXml(unit)}"/>`);
        }
        lines.push('                    </doseQuantity>');
      }
    }

    // Consumable (product name)
    lines.push('                    <consumable typeCode="CSM">');
    lines.push('                      <instanceOfKind classCode="INST">');
    lines.push('                        <kindOfProduct classCode="MMAT" determinerCode="KIND">');

    // MPID (B.4.k.2.2)
    if (drug.mpid) {
      lines.push(`                          <code code="${this.escapeXml(drug.mpid)}" codeSystem="2.16.840.1.113883.3.989.2.1.3.5"/>`);
    }

    // Product name (B.4.k.2.1)
    lines.push(`                          <name>${this.escapeXml(drug.productName)}</name>`);

    lines.push('                        </kindOfProduct>');
    lines.push('                      </instanceOfKind>');
    lines.push('                    </consumable>');

    // Indication (B.4.k.7)
    if (drug.indication) {
      lines.push('                    <outboundRelationship2 typeCode="RSON">');
      lines.push('                      <observation classCode="OBS" moodCode="EVN">');
      lines.push('                        <code code="C41331" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Indication"/>');
      if (drug.indicationCode) {
        lines.push(`                        <value xsi:type="CE" code="${this.escapeXml(drug.indicationCode)}" codeSystem="2.16.840.1.113883.6.163" displayName="${this.escapeXml(drug.indication)}"/>`);
      } else {
        lines.push(`                        <value xsi:type="CE" displayName="${this.escapeXml(drug.indication)}"/>`);
      }
      lines.push('                      </observation>');
      lines.push('                    </outboundRelationship2>');
    }

    // Action taken (B.4.k.12)
    if (drug.actionTaken !== undefined) {
      lines.push('                    <outboundRelationship2 typeCode="COMP">');
      lines.push('                      <observation classCode="OBS" moodCode="EVN">');
      lines.push('                        <code code="C41341" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Action Taken"/>');
      lines.push(`                        <value xsi:type="CE" code="${drug.actionTaken}" codeSystem="2.16.840.1.113883.3.989.2.1.1.15"/>`);
      lines.push('                      </observation>');
      lines.push('                    </outboundRelationship2>');
    }

    // Dechallenge (B.4.k.13.1)
    if (drug.dechallenge !== undefined) {
      lines.push('                    <outboundRelationship2 typeCode="COMP">');
      lines.push('                      <observation classCode="OBS" moodCode="EVN">');
      lines.push('                        <code code="C49492" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Dechallenge"/>');
      lines.push(`                        <value xsi:type="CE" code="${drug.dechallenge}" codeSystem="2.16.840.1.113883.3.989.2.1.1.16"/>`);
      lines.push('                      </observation>');
      lines.push('                    </outboundRelationship2>');
    }

    // Rechallenge (B.4.k.13.2)
    if (drug.rechallenge !== undefined) {
      lines.push('                    <outboundRelationship2 typeCode="COMP">');
      lines.push('                      <observation classCode="OBS" moodCode="EVN">');
      lines.push('                        <code code="C49494" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Rechallenge"/>');
      lines.push(`                        <value xsi:type="CE" code="${drug.rechallenge}" codeSystem="2.16.840.1.113883.3.989.2.1.1.17"/>`);
      lines.push('                      </observation>');
      lines.push('                    </outboundRelationship2>');
    }

    lines.push('                  </substanceAdministration>');
    lines.push('                </component>');
    lines.push('              </organizer>');
    lines.push('            </subjectOf2>');

    return lines.join('\n');
  }

  /**
   * Format date to E2B format (YYYYMMDD)
   */
  private formatDate(date: string): string {
    // Assume date is in ISO format (YYYY-MM-DD)
    return date.replace(/-/g, '');
  }

  /**
   * Format date time to E2B format (YYYYMMDDHHmmss)
   */
  private formatDateTime(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  }

  /**
   * Get UCUM code for age unit
   */
  private getAgeUnitCode(unit?: string): string {
    switch (unit) {
      case 'Year': return 'a';
      case 'Month': return 'mo';
      case 'Week': return 'wk';
      case 'Day': return 'd';
      case 'Hour': return 'h';
      default: return 'a'; // Default to years
    }
  }

  /**
   * Get route of administration code
   */
  private getRouteCode(route: string): string {
    const routeMap: Record<string, string> = {
      'Oral': 'C38288',
      'Intravenous': 'C38276',
      'Intramuscular': 'C38273',
      'Subcutaneous': 'C38299',
      'Topical': 'C38304',
      'Inhalation': 'C38216',
      'Transdermal': 'C38305',
      'Rectal': 'C38295',
      'Other': 'C38290'
    };
    return routeMap[route] || 'C38290';
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
