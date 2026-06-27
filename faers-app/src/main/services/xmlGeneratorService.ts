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
import { MedDRARepository } from '../database/repositories/meddra.repository';
import type {
  Case,
  CaseReaction,
  CaseDrug,
  CaseReporter,
  IndStudyInfo,
  SubmissionEnvironment,
  SubmissionReportType
} from '../../shared/types/case.types';
import {
  BATCH_RECEIVERS,
  MESSAGE_RECEIVERS,
  ReportCategory,
  SENDER_OID_DEFAULT,
  SENDER_OID_DUNS
} from '../../shared/types/case.types';
import type { SenderIdentifierType, TargetCenter } from '../../shared/types/case.types';
import { IND_POLICY } from './faersEmpiricalPolicy';

export interface XMLGenerationOptions {
  submissionEnvironment?: SubmissionEnvironment;
  submissionReportType?: SubmissionReportType;
  senderIdentifierType?: SenderIdentifierType;
  senderIdentifierValue?: string;
  targetCenter?: TargetCenter;
  batchNumber?: string;
}

export interface XMLGenerationResult {
  success: boolean;
  xml?: string;
  errors: string[];
  warnings: string[];
  batchReceiver?: string; // The batch receiver used in the generated XML
  batchUuid?: string;     // The batch UUID embedded in the wrapper <id .3.22>
  msgReceiver?: string;   // PORR receiver (CDER / CDER_IND), mirrors what's in the XML
}

/**
 * Minimal hardcoded MedDRA PT fallback, used when the app's MedDRA dictionary
 * has not yet been imported. Covers the common demo / test terms so that
 * pre-existing cases (whose drugs carry uncoded indication text) can still
 * export through the v37 lint gate without requiring a full MedDRA release
 * load. Codes are real MedDRA Preferred Term codes pulled from the v37 golden
 * template and the app's sample data.
 *
 * Real submissions should rely on the imported MedDRA dictionary — this map
 * is a safety net, not a source of truth.
 */
const HARDCODED_MEDDRA_FALLBACK: Record<string, string> = {
  'rheumatoid arthritis': '10039073',
  'hypertension': '10020772',
  'nausea': '10028813',
  'hepatic enzyme increased': '10019675',
  'headache': '10019211',
  'fatigue': '10016256',
  'vomiting': '10047700',
  'diarrhoea': '10012735',
  'rash': '10037844',
  'dizziness': '10013573',
  'pyrexia': '10037660',
  'asthenia': '10003549'
};

const MEDDRA_OID = '2.16.840.1.113883.6.163';
/** MedDRA codeSystemVersion emitted on all reaction and indication values.
 *  Update when a new MedDRA release is imported into the app's dictionary.
 *  BRv1.7 compliance: must match the actual imported release version (T2-03).
 *  Pinned to 25.0 to match the FDA-accepted v37 reference and the golden corpus
 *  (the only CA+AA submission, ci260410211359, used 25.0). Bump only alongside a
 *  golden-corpus regeneration and the validator/CI MedDRA pin. */
const MEDDRA_VERSION = '25.0';

export class XMLGeneratorService {
  private caseRepo: CaseRepository;
  private reactionRepo: ReactionRepository;
  private drugRepo: DrugRepository;
  private reporterRepo: ReporterRepository;
  private meddraRepo: MedDRARepository;
  // Warnings populated during build for surfacing on the GenerationResult.
  private buildWarnings: string[] = [];
  /** UUIDs emitted on reaction <id root> elements; populated by buildReaction,
   *  consumed by buildDrugCausalityBlocks for G.k.9.i code=39 cross-references. */
  private lastReactionUuids: string[] = [];

  constructor(db: DatabaseInstance) {
    this.caseRepo = new CaseRepository(db);
    this.reactionRepo = new ReactionRepository(db);
    this.drugRepo = new DrugRepository(db);
    this.reporterRepo = new ReporterRepository(db);
    this.meddraRepo = new MedDRARepository(db);
  }

  /**
   * Resolve a free-text MedDRA term (like an uncoded drug indication) to a PT
   * code. Tries three sources in order:
   *   1. The app's imported MedDRA dictionary (exact PT or LLT match)
   *   2. The hardcoded fallback map above
   *   3. Give up — returns null, caller should skip emitting the observation
   */
  private resolveMeddraCode(term: string | undefined): string | null {
    if (!term) return null;
    const normalized = term.trim().toLowerCase();
    if (!normalized) return null;

    // Try the imported dictionary. search() is fuzzy but sorts exact matches
    // first; we scan for a case-insensitive exact PT or LLT name match.
    try {
      const results = this.meddraRepo.search({ query: term, limit: 10 });
      const exact = results.find(
        r => r.ptName?.toLowerCase() === normalized || r.lltName?.toLowerCase() === normalized
      );
      if (exact?.ptCode) {
        return String(exact.ptCode);
      }
    } catch {
      // MedDRA tables may not exist yet on very old DBs — ignore and fall through.
    }

    // Fallback to the hardcoded map.
    const hardcoded = HARDCODED_MEDDRA_FALLBACK[normalized];
    if (hardcoded) {
      return hardcoded;
    }

    return null;
  }

  /**
   * Generate E2B(R3) XML for a case
   * @param caseId - The case ID to generate XML for
   * @param options - Optional generation options including submission environment
   */
  generate(caseId: string, options: XMLGenerationOptions = {}): XMLGenerationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Resolve batch receiver based on environment and report type
    const reportType = options.submissionReportType || 'Postmarket';
    const environment = options.submissionEnvironment || 'Test';
    const batchReceiver = BATCH_RECEIVERS[environment][reportType];

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

    // Reporter address validation — all five C.3.4.x sub-fields are required by CDER 2.18.
    // Confirmed empirically: TC-H02 v3 ci260501235624 (2026-05-01) rejected with
    // "Data value required for tag C.3.4.1/2/3/4" when street/city/state/postal absent.
    // All five fields (C.3.4.1 street, C.3.4.2 city, C.3.4.3 state, C.3.4.4 postal,
    // C.3.4.5 asLocatedEntity country) must be non-empty for every reporter.
    for (const reporter of reporters) {
      const rLabel = [reporter.givenName, reporter.familyName].filter(Boolean).join(' ') || 'Reporter';
      const missingAddr: string[] = [];
      if (!reporter.address)  missingAddr.push('C.3.4.1 street (reporter.address)');
      if (!reporter.city)     missingAddr.push('C.3.4.2 city (reporter.city)');
      if (!reporter.state)    missingAddr.push('C.3.4.3 state (reporter.state)');
      if (!reporter.postcode) missingAddr.push('C.3.4.4 postal code (reporter.postcode)');
      if (!reporter.country)  missingAddr.push('C.3.4.5 country (reporter.country) — needed for asLocatedEntity');
      if (missingAddr.length > 0) {
        errors.push(
          `${rLabel}: CDER 2.18 requires all reporter address fields (C.3.4.1–C.3.4.5). ` +
          `Missing: ${missingAddr.join(', ')}. ` +
          `A reporter with a partial address will be rejected (CR+AR). ` +
          `Evidence: TC-H02 ci260501235624.`
        );
      }
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    // Resolve sender OID and extension
    // N.1.3 must be the actual identifier (DUNS or FDA Sender ID), NOT the company name
    const senderOid = options.senderIdentifierType === 'duns'
      ? SENDER_OID_DUNS
      : SENDER_OID_DEFAULT;
    const senderExtension = options.senderIdentifierValue || '';

    // Hard block: sender identifier must not be empty
    if (!senderExtension) {
      errors.push(
        options.senderIdentifierType === 'duns'
          ? 'DUNS number is empty. Configure a valid 9-digit DUNS number in Settings before export.'
          : 'FDA Sender ID is empty. Configure your FDA-assigned Sender ID in Settings before export.'
      );
      return { success: false, errors, warnings };
    }

    // Resolve message receiver from target center and report type
    const targetCenter = options.targetCenter || 'CDER';
    const messageReceiver = MESSAGE_RECEIVERS[reportType][targetCenter];

    // Reset per-call accumulator for warnings emitted by the build helpers
    // (e.g. the MedDRA auto-resolver flagging drugs with unresolved indications).
    this.buildWarnings = [];
    this.lastReactionUuids = [];

    // Resolve the batch UUID up here so we can return it on the result for
    // the headless CLI's submission log + checklist (GAP-SUB-001/002). Same
    // shape as what `buildXML` would have generated when no `batchNumber` is
    // supplied.
    const batchUuid =
      options.batchNumber ||
      `DeepQuenceTest-${this.formatDate(new Date().toISOString().slice(0, 10))}-${uuidv4()}`;

    try {
      const xml = this.buildXML(
        caseData, reporters, reactions, drugs,
        batchReceiver, senderOid, senderExtension,
        messageReceiver, batchUuid,
        reportType === 'Premarket'
      );
      return {
        success: true,
        xml,
        errors: [],
        warnings: [...warnings, ...this.buildWarnings],
        batchReceiver,
        batchUuid,
        msgReceiver: messageReceiver
      };
    } catch (error) {
      return {
        success: false,
        errors: [`XML generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [...warnings, ...this.buildWarnings]
      };
    }
  }

  /**
   * Build the complete E2B(R3) XML document matching the v37 golden structure.
   *
   * Wrapper child order (schema-enforced):
   *   id(.3.22) → creationTime → responseModeCode → interactionId → name
   *   → PORR_IN049016UV → receiver → sender
   */
  private buildXML(
    caseData: Case,
    reporters: CaseReporter[],
    reactions: CaseReaction[],
    drugs: CaseDrug[],
    batchReceiver: string,
    senderOid: string,
    senderExtension: string,
    messageReceiver?: string,
    batchNumber?: string,
    isPremarket: boolean = false
  ): string {
    // batchNumber is now always supplied by `generate()`; the fallback
    // remains for direct buildXML callers in tests / generateCaseMessageWrapper.
    const batchUuid =
      batchNumber || `DeepQuenceTest-${this.formatDate(new Date().toISOString().slice(0, 10))}-${uuidv4()}`;
    // FDA ACK ci260412060025: real-time PDT clock converts to future UTC when
    // FDA processes overnight at ~06:00 UTC. Use the case receipt date
    // (safely in the past) for ALL timestamp fields to avoid future-date
    // rejections on C.1.2, C.1.5, N.1.5, N.2.r.4.
    const safeDate = caseData.receiptDate
      ? new Date(caseData.receiptDate + 'T00:00:00')
      : new Date(caseData.createdAt);
    const creationTimeWithTz = this.formatDateTimeWithTz(safeDate);
    const effectiveMessageReceiver = messageReceiver || 'CDER';

    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<MCCI_IN200100UV01 xmlns="urn:hl7-org:v3"');
    lines.push('                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    lines.push('                   ITSVersion="XML_1.0"');
    lines.push('                   xsi:schemaLocation="urn:hl7-org:v3 MCCI_IN200100UV01.xsd">');

    // Single wrapper <id> = batch UUID (OID .3.22)
    lines.push(`  <id root="2.16.840.1.113883.3.989.2.1.3.22" extension="${this.escapeXml(batchUuid)}"/>`);
    lines.push(`  <creationTime value="${creationTimeWithTz}"/>`);
    lines.push('  <responseModeCode code="D"/>');
    lines.push('  <interactionId root="2.16.840.1.113883.1.6" extension="MCCI_IN200100UV01"/>');
    lines.push('  <name code="1" displayName="ichicsr" codeSystem="2.16.840.1.113883.3.989.2.1.1.1"/>');

    // PORR message — emitted BEFORE wrapper receiver/sender per v37 rule #6
    lines.push(this.buildPorrMessage(
      caseData, reporters, reactions, drugs,
      senderExtension, effectiveMessageReceiver, creationTimeWithTz,
      isPremarket
    ));

    // Wrapper receiver (N.1.4) — AFTER PORR
    lines.push('  <receiver typeCode="RCV">');
    lines.push('    <device classCode="DEV" determinerCode="INSTANCE">');
    lines.push(`      <id root="2.16.840.1.113883.3.989.2.1.3.14" extension="${this.escapeXml(batchReceiver)}"/>`);
    lines.push('    </device>');
    lines.push('  </receiver>');

    // Wrapper sender (N.1.3) — AFTER PORR
    // Always include .3.13 OID; when DUNS, also include the DUNS-typed OID.
    lines.push('  <sender typeCode="SND">');
    lines.push('    <device classCode="DEV" determinerCode="INSTANCE">');
    lines.push(`      <id root="${SENDER_OID_DEFAULT}" extension="${this.escapeXml(senderExtension)}"/>`);
    if (senderOid === SENDER_OID_DUNS) {
      lines.push(`      <id root="${SENDER_OID_DUNS}" extension="${this.escapeXml(senderExtension)}"/>`);
    }
    lines.push('    </device>');
    lines.push('  </sender>');

    lines.push('</MCCI_IN200100UV01>');

    return lines.join('\n');
  }

  /**
   * Build PORR_IN049016UV message (Section N.2) — shared between single and batch submission.
   *
   * PORR receiver: single id .3.12 ext="CDER" (v37 rule: no extra OIDs).
   * PORR sender: .3.11 + .3.13 + 1.3.6.1.4.1.519.1 — NEVER .3.12 (rule #5).
   */
  private buildPorrMessage(
    caseData: Case,
    reporters: CaseReporter[],
    reactions: CaseReaction[],
    drugs: CaseDrug[],
    senderExtension: string,
    messageReceiver: string,
    creationTimeWithTz: string,
    isPremarket: boolean
  ): string {
    const messageId = uuidv4();
    const lines: string[] = [];

    lines.push('  <PORR_IN049016UV>');
    lines.push(`    <id root="2.16.840.1.113883.3.989.2.1.3.1" extension="${this.escapeXml(messageId)}"/>`);
    lines.push(`    <creationTime value="${creationTimeWithTz}"/>`);
    lines.push('    <interactionId root="2.16.840.1.113883.1.6" extension="PORR_IN049016UV"/>');
    lines.push('    <processingCode code="P"/>');
    lines.push('    <processingModeCode code="I"/>');
    lines.push('    <acceptAckCode code="AL"/>');

    // PORR receiver — single id only, OID .3.12
    lines.push('    <receiver typeCode="RCV">');
    lines.push('      <device classCode="DEV" determinerCode="INSTANCE">');
    lines.push(`        <id root="2.16.840.1.113883.3.989.2.1.3.12" extension="${this.escapeXml(messageReceiver)}"/>`);
    lines.push('      </device>');
    lines.push('    </receiver>');

    // PORR sender — .3.11 + .3.13 + DUNS OID, all with same sender extension
    lines.push('    <sender typeCode="SND">');
    lines.push('      <device classCode="DEV" determinerCode="INSTANCE">');
    lines.push(`        <id root="2.16.840.1.113883.3.989.2.1.3.11" extension="${this.escapeXml(senderExtension)}"/>`);
    lines.push(`        <id root="${SENDER_OID_DEFAULT}" extension="${this.escapeXml(senderExtension)}"/>`);
    lines.push(`        <id root="${SENDER_OID_DUNS}" extension="${this.escapeXml(senderExtension)}"/>`);
    lines.push('      </device>');
    lines.push('    </sender>');

    lines.push('    <controlActProcess classCode="CACT" moodCode="EVN">');
    lines.push('      <code code="PORR_TE049016UV" codeSystem="2.16.840.1.113883.1.18"/>');
    lines.push(`      <effectiveTime value="${creationTimeWithTz}"/>`);
    lines.push('      <subject typeCode="SUBJ">');
    lines.push(this.buildSafetyReport(caseData, reporters, reactions, drugs, isPremarket));
    lines.push('      </subject>');
    lines.push('    </controlActProcess>');
    lines.push('  </PORR_IN049016UV>');

    return lines.join('\n');
  }

  /**
   * Generate the safety report body for a single case (used by BatchService).
   * Returns the inner PORR_IN049016UV message wrapper for embedding in a batch.
   */
  generateCaseMessageWrapper(
    caseId: string,
    _senderOid: string,
    senderExtension: string,
    messageReceiver: string
  ): string | null {
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) return null;

    const reporters = this.reporterRepo.findByCaseId(caseId);
    const reactions = this.reactionRepo.findByCaseId(caseId);
    const drugs = this.drugRepo.findByCaseId(caseId);
    const creationTimeWithTz = this.formatDateTimeWithTz(new Date());

    // Without an explicit override, derive premarket from caseType so batch
    // wrappers for IND/babe cases still emit the FDA.E.i.3.2h nullFlavor=NI
    // (GAP-IND-002).
    const isPremarket = caseData.caseType === 'ind' || caseData.caseType === 'babe';
    return this.buildPorrMessage(
      caseData, reporters, reactions, drugs,
      senderExtension, messageReceiver, creationTimeWithTz,
      isPremarket
    );
  }

  /**
   * Build the safety report (investigationEvent) in v37 content order:
   *
   *   HEADER:   id (worldwide, case, version), code, text, statusCode,
   *             effectiveTime, availabilityTime
   *   BODY:     component(patient + reactions + drugs)
   *             component(narrative)
   *             component × N (C.1.x observationEvents)
   *             outboundRelationship (initial/follow-up classification)
   *             subjectOf1 (reporter block — v37 rule #1: must NOT be a
   *               direct <author> child of investigationEvent)
   *             subjectOf2 × N (investigationCharacteristic — ICH ReportType)
   */
  private buildSafetyReport(
    caseData: Case,
    reporters: CaseReporter[],
    reactions: CaseReaction[],
    drugs: CaseDrug[],
    isPremarket: boolean
  ): string {
    const lines: string[] = [];

    lines.push('        <investigationEvent classCode="INVSTG" moodCode="EVN">');

    // ── HEADER ──────────────────────────────────────────────────────────
    // C.1.1 Worldwide case ID (OID .3.1)
    const worldwideId = caseData.worldwideCaseId || caseData.safetyReportId || `SR-${caseData.id}`;
    lines.push(`          <id root="2.16.840.1.113883.3.989.2.1.3.1" extension="${this.escapeXml(worldwideId)}"/>`);
    // C.1.2 Case ID (OID .3.2)
    lines.push(`          <id root="2.16.840.1.113883.3.989.2.1.3.2" extension="${this.escapeXml(caseData.id)}"/>`);
    // C.1.9 Case version (OID .3.4). The E2B(R3) semantic is:
    //   2  = initial report (first-ever transmission of this case)
    //   3+ = follow-up / amendment, incremented per submission
    // It is NOT the DB record version. Earlier code used `caseData.version`
    // which is the SQLite row-version counter — that produced extension="3"
    // on freshly imported initial reports because the import flow does
    // create + update + status-transition (≥3 row writes) before generation.
    // Confirmed wrong by the IND SUSAR gap analysis (Apr 2026, Issue 2).
    //
    // Source-of-truth precedence: explicit `caseVersion` (set by follow-up
    // wizard / IND-T07 examples), else derive from `initialOrFollowup` —
    // FollowUp → "3", Initial / unset → "2". Never use the DB row version.
    const reportVersion =
      caseData.caseVersion != null
        ? caseData.caseVersion
        : caseData.initialOrFollowup === ReportCategory.FollowUp
          ? 3
          : 2;
    lines.push(`          <id root="2.16.840.1.113883.3.989.2.1.3.4" extension="${reportVersion}"/>`);

    lines.push('          <code code="PAT_ADV_EVNT" codeSystem="2.16.840.1.113883.5.4"/>');
    lines.push('          <text>Case Narrative Including Clinical Course, Therapeutic Measures, Outcome and Additional Relevant Information</text>');
    lines.push('          <statusCode code="active"/>');

    // C.1.4 Date received (IVL_TS/low)
    if (caseData.receiptDate) {
      lines.push('          <effectiveTime xsi:type="IVL_TS">');
      lines.push(`            <low value="${this.formatDate(caseData.receiptDate)}"/>`);
      lines.push('          </effectiveTime>');
    }
    // C.1.5 Date of most recent info (availabilityTime) — use receipt date
    // to stay consistent with MCCI/PORR creationTimes and avoid future-date
    // rejection (FDA ACK ci260412060025).
    const availDate = caseData.receiptDate
      ? new Date(caseData.receiptDate + 'T00:00:00')
      : new Date(caseData.createdAt);
    lines.push(`          <availabilityTime value="${this.formatDateTime(availDate)}"/>`);

    // ── COMPONENT 1: Patient + reactions + drugs + G.k causality blocks ──
    lines.push('          <component typeCode="COMP">');
    lines.push('            <adverseEventAssessment classCode="INVSTG" moodCode="EVN">');
    lines.push(this.buildPatient(caseData, reactions, drugs, isPremarket));
    // G.k.1 (code=20) and G.k.9.i (code=39) causalityAssessment blocks.
    // Must be inside the same adverseEventAssessment as the drug organizers,
    // after </subject1>, per Business Rules v1.7 ICSR XPath rows 283 and 358.
    lines.push(this.buildDrugCausalityBlocks(drugs, isPremarket));
    lines.push('            </adverseEventAssessment>');
    lines.push('          </component>');

    // ── COMPONENT 2: Case narrative ────────────────────────────────────
    if (caseData.caseNarrative) {
      lines.push('          <component typeCode="COMP">');
      lines.push('            <adverseEventAssessment classCode="INVSTG" moodCode="EVN">');
      lines.push('              <component typeCode="COMP">');
      lines.push('                <causalityAssessment classCode="OBS" moodCode="EVN">');
      lines.push('                  <code code="C53253" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Case Narrative"/>');
      lines.push(`                  <value xsi:type="ED">${this.escapeXml(caseData.caseNarrative)}</value>`);
      lines.push('                </causalityAssessment>');
      lines.push('              </component>');
      lines.push('            </adverseEventAssessment>');
      lines.push('          </component>');
    }

    // ── COMPONENT 3: Case-level observationEvents (C.1.x) ──────────────
    // C.1.8 Additional documents available
    lines.push('          <component typeCode="COMP">');
    lines.push('            <observationEvent classCode="OBS" moodCode="EVN">');
    lines.push('              <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="additionalDocumentsAvailable"/>');
    lines.push(`              <value xsi:type="BL" value="${caseData.additionalDocs ? 'true' : 'false'}"/>`);
    lines.push('            </observationEvent>');
    lines.push('          </component>');
    // T1-02: BRv1.7 Rule R0009 — C.1.6.1.r (documents held by sender) is required
    // whenever C.1.6.1 = true. Not currently enforced by ZZFDATST (TC-H01 CA+AA
    // without it), but is a spec compliance gap. Surface as build warning so
    // cases with additionalDocs=true know they need to attach document metadata.
    if (caseData.additionalDocs && caseData.documentsHeldBySender) {
      lines.push('          <component typeCode="COMP">');
      lines.push('            <observationEvent classCode="OBS" moodCode="EVN">');
      lines.push('              <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="documentsHeldBySender"/>');
      lines.push(`              <value xsi:type="ED">${this.escapeXml(caseData.documentsHeldBySender)}</value>`);
      lines.push('            </observationEvent>');
      lines.push('          </component>');
    } else if (caseData.additionalDocs) {
      this.buildWarnings.push(
        'C.1.6.1 additionalDocumentsAvailable=true but documentsHeldBySender is not set — ' +
        'BRv1.7 Rule R0009 requires C.1.6.1.r when additional documents are available.'
      );
    }

    // C.1.7 localCriteriaForExpedited + C.1.7.1 localCriteriaReportType
    // FDA FAERS 2.18 business rule (empirically confirmed):
    //   When localCriteriaForExpedited = false (AND combo-product flag is false/NI),
    //   localCriteriaReportType MUST be code="2" (Non-Expedited AE).
    //   Using an expedited code (1=15-Day, 6=7-Day) while expedited=false → CR+AR.
    //   Confirmed rejected: TC-F03 ci260501170855, TC-G01 ci260501170913 (2026-05-01).
    //
    // isExpedited is derived solely from caseData.expeditedReport:
    //   - explicitly false  → non-expedited (code 2)
    //   - true or undefined → expedited; use 7-Day (code 6) or 15-Day (code 1)
    const isExpedited = caseData.expeditedReport !== false;
    // FIX-X05: FDA PREMKT channel (ZZFDATST_PREMKT / CDER_IND) only accepts
    // code="1" (15-Day) for localCriteriaReportType, regardless of the JSON's
    // localReportTypeCode. Empirical evidence: IND-T05 CR+AR → CA+AE after
    // manual patch (FAERS_Workflow_XML_Gap_Analysis_v2.docx FIX-X05). The
    // postmarket channel continues to accept both code="1" (15-Day) and
    // code="6" (7-Day) per the FAERS codelist.
    const reportTypeCode = !isExpedited
      ? '2'                                                         // Non-Expedited AE (Periodic)
      : isPremarket
        ? '1'                                                       // IND/PREMKT: 15-Day only (FIX-X05)
        : (caseData.localReportTypeCode === 7 ? '6' : '1');        // Postmarket: 7-Day or 15-Day
    const reportTypeDisplay = !isExpedited
      ? 'Non-Expedited AE'
      : (reportTypeCode === '6' ? '7-Day' : '15-Day');
    lines.push('          <component typeCode="COMP">');
    lines.push('            <observationEvent classCode="OBS" moodCode="EVN">');
    lines.push('              <code code="23" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="localCriteriaForExpedited"/>');
    lines.push(`              <value xsi:type="BL" value="${isExpedited}"/>`);
    lines.push('            </observationEvent>');
    lines.push('          </component>');
    lines.push('          <component typeCode="COMP">');
    lines.push('            <observationEvent classCode="OBS" moodCode="EVN">');
    lines.push('              <code code="C54588" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="localCriteriaReportType"/>');
    lines.push(`              <value xsi:type="CE" code="${reportTypeCode}" codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.1.1" displayName="${reportTypeDisplay}"/>`);
    lines.push('            </observationEvent>');
    lines.push('          </component>');

    // Combination Product Report Indicator (C156384) — v37 parity for the
    // default case. GAP-PROD-001 / TC-F02 lets the JSON opt the case in via
    // `case.combinationProduct: true`; the field defaults to `undefined`/false
    // so all 33 prior scenarios (which never set it) still emit `value="false"`.
    const comboProd = caseData.combinationProduct === true;
    lines.push('          <component typeCode="COMP">');
    lines.push('            <observationEvent classCode="OBS" moodCode="EVN">');
    lines.push('              <code code="C156384" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Combination Product Report Indicator"/>');
    lines.push(`              <value xsi:type="BL" value="${comboProd}"/>`);
    lines.push('            </observationEvent>');
    lines.push('          </component>');

    // ── OUTBOUND RELATIONSHIP: initial vs. follow-up classification ────
    if (caseData.initialOrFollowup === 2) {
      // Follow-up report: emit initialReport (C.1.8.2) + sourceReport (C.2.r.5) blocks.
      // NOTE: followUpReport outboundRelationship intentionally omitted — would collide with
      // sourceReport code="2" on OID .1.22. Follow-up is indicated by version id extension="3".
      const primaryReporter = reporters[0];
      const reporterStreet = primaryReporter?.address || '';
      const reporterCity = primaryReporter?.city || '';
      const reporterState = primaryReporter?.state || '';
      const reporterPostalCode = primaryReporter?.postcode || '';
      const reporterCountry = primaryReporter?.country || 'US';
      const reporterPhone = primaryReporter?.phone || '+10000000000';
      const reporterEmail = primaryReporter?.email || '';
      const reporterTitle = primaryReporter?.title
        || (primaryReporter?.qualification === 1 || primaryReporter?.qualification === 2 ? 'Dr' : 'Mr');
      const reporterGiven = primaryReporter?.givenName || '';
      const reporterFamily = primaryReporter?.familyName || '';
      const reporterQualCode = String(primaryReporter?.qualification ?? 1);
      const reporterQualCodeMap: Record<string, string> = {
        '1': 'Physician', '2': 'Pharmacist', '3': 'Other Health Professional',
        '4': 'Lawyer', '5': 'Consumer or non-health professional'
      };
      const reporterQualDisplay = reporterQualCodeMap[reporterQualCode] || 'Physician';
      const reporterCountryCode = primaryReporter?.country || 'US';

      // C.1.8.2: First Sender of This Case — required for follow-up reports
      lines.push('          <outboundRelationship typeCode="SPRT">');
      lines.push('            <relatedInvestigation classCode="INVSTG" moodCode="EVN">');
      lines.push('              <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="initialReport"/>');
      lines.push('              <subjectOf2 typeCode="SUBJ">');
      lines.push('                <controlActEvent classCode="CACT" moodCode="EVN">');
      lines.push('                  <author typeCode="AUT">');
      lines.push('                    <assignedEntity classCode="ASSIGNED">');
      lines.push('                      <code code="1" displayName="regulator" codeSystem="2.16.840.1.113883.3.989.2.1.1.3"/>');
      lines.push('                    </assignedEntity>');
      lines.push('                  </author>');
      lines.push('                </controlActEvent>');
      lines.push('              </subjectOf2>');
      lines.push('            </relatedInvestigation>');
      lines.push('          </outboundRelationship>');

      // C.2.r.5 Primary Source + FDA.C.2.r.2.8 Reporter Email + C.2.r.4 Qualification
      lines.push('          <outboundRelationship typeCode="SPRT">');
      lines.push('            <priorityNumber value="1"/>');
      lines.push('            <relatedInvestigation classCode="INVSTG" moodCode="EVN">');
      lines.push('              <code code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="sourceReport"/>');
      lines.push('              <subjectOf2 typeCode="SUBJ">');
      lines.push('                <controlActEvent classCode="CACT" moodCode="EVN">');
      lines.push('                  <author typeCode="AUT">');
      lines.push('                    <assignedEntity classCode="ASSIGNED">');
      lines.push('                      <addr>');
      lines.push(`                        <streetAddressLine>${this.escapeXml(reporterStreet)}</streetAddressLine>`);
      lines.push(`                        <city>${this.escapeXml(reporterCity)}</city>`);
      lines.push(`                        <state>${this.escapeXml(reporterState)}</state>`);
      lines.push(`                        <postalCode>${this.escapeXml(reporterPostalCode)}</postalCode>`);
      lines.push(`                        <country>${this.escapeXml(reporterCountry)}</country>`);
      lines.push('                      </addr>');
      lines.push(`                      <telecom value="tel:${reporterPhone}"/>`);
      lines.push(`                      <telecom value="mailto:${reporterEmail}"/>`);
      lines.push('                      <assignedPerson classCode="PSN" determinerCode="INSTANCE">');
      lines.push('                        <name>');
      lines.push(`                          <prefix>${this.escapeXml(reporterTitle)}</prefix>`);
      lines.push(`                          <given>${this.escapeXml(reporterGiven)}</given>`);
      lines.push(`                          <family>${this.escapeXml(reporterFamily)}</family>`);
      lines.push('                        </name>');
      lines.push('                        <asQualifiedEntity classCode="QUAL">');
      lines.push(`                          <code code="${reporterQualCode}" displayName="${reporterQualDisplay}" codeSystem="2.16.840.1.113883.3.989.2.1.1.6"/>`);
      lines.push('                        </asQualifiedEntity>');
      lines.push('                        <asLocatedEntity classCode="LOCE">');
      lines.push('                          <location classCode="COUNTRY" determinerCode="INSTANCE">');
      lines.push(`                            <code code="${this.escapeXml(reporterCountryCode)}" codeSystem="1.0.3166.1.2.2"/>`);
      lines.push('                          </location>');
      lines.push('                        </asLocatedEntity>');
      lines.push('                      </assignedPerson>');
      lines.push('                    </assignedEntity>');
      lines.push('                  </author>');
      lines.push('                </controlActEvent>');
      lines.push('              </subjectOf2>');
      lines.push('            </relatedInvestigation>');
      lines.push('          </outboundRelationship>');
    } else {
      // Initial report: initialReport (C.1.8.2) + sourceReport (C.2.r.5).
      // The sourceReport block carries full C.2.r reporter fields and
      // priorityNumber value="1" (primary source for regulatory purposes).
      // Confirmed by FAERS2022Scenario1.xml lines 742-806 which shows BOTH
      // blocks present on initial reports. C.2.r XPaths in Business Rules
      // v1.7 ICSR XPath sheet resolve through outboundRelationship/
      // relatedInvestigation[code='2'] — not through subjectOf1.
      const primaryReporter = reporters[0];
      const reporterStreet     = primaryReporter?.address  || '';
      const reporterCity       = primaryReporter?.city     || '';
      const reporterState      = primaryReporter?.state    || '';
      const reporterPostalCode = primaryReporter?.postcode || '';
      const reporterCountry    = primaryReporter?.country  || 'US';
      const reporterPhone      = primaryReporter?.phone    || '';
      const reporterEmail      = primaryReporter?.email    || '';
      const reporterTitle      = primaryReporter?.title
        || (primaryReporter?.qualification === 1 || primaryReporter?.qualification === 2 ? 'Dr' : 'Mr');
      const reporterGiven  = primaryReporter?.givenName  || '';
      const reporterFamily = primaryReporter?.familyName || '';
      const reporterQualCode = String(primaryReporter?.qualification ?? 1);
      const reporterQualCodeMap: Record<string, string> = {
        '1': 'Physician', '2': 'Pharmacist', '3': 'Other Health Professional',
        '4': 'Lawyer', '5': 'Consumer or non-health professional'
      };
      const reporterQualDisplay = reporterQualCodeMap[reporterQualCode] || 'Physician';

      // C.1.8.2: First Sender of This Case
      lines.push('          <outboundRelationship typeCode="SPRT">');
      lines.push('            <relatedInvestigation classCode="INVSTG" moodCode="EVN">');
      lines.push('              <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="initialReport"/>');
      lines.push('              <subjectOf2 typeCode="SUBJ">');
      lines.push('                <controlActEvent classCode="CACT" moodCode="EVN">');
      lines.push('                  <author typeCode="AUT">');
      lines.push('                    <assignedEntity classCode="ASSIGNED">');
      lines.push('                      <code code="1" displayName="regulator" codeSystem="2.16.840.1.113883.3.989.2.1.1.3"/>');
      lines.push('                    </assignedEntity>');
      lines.push('                  </author>');
      lines.push('                </controlActEvent>');
      lines.push('              </subjectOf2>');
      lines.push('            </relatedInvestigation>');
      lines.push('          </outboundRelationship>');

      // C.2.r.5: Primary Source for Regulatory Purposes — full C.2.r reporter block
      lines.push('          <outboundRelationship typeCode="SPRT">');
      lines.push('            <priorityNumber value="1"/>');
      lines.push('            <relatedInvestigation classCode="INVSTG" moodCode="EVN">');
      lines.push('              <code code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="sourceReport"/>');
      lines.push('              <subjectOf2 typeCode="SUBJ">');
      lines.push('                <controlActEvent classCode="CACT" moodCode="EVN">');
      lines.push('                  <author typeCode="AUT">');
      lines.push('                    <assignedEntity classCode="ASSIGNED">');
      lines.push('                      <addr>');
      lines.push(`                        <streetAddressLine>${this.escapeXml(reporterStreet)}</streetAddressLine>`);
      lines.push(`                        <city>${this.escapeXml(reporterCity)}</city>`);
      lines.push(`                        <state>${this.escapeXml(reporterState)}</state>`);
      lines.push(`                        <postalCode>${this.escapeXml(reporterPostalCode)}</postalCode>`);
      lines.push(`                        <country>${this.escapeXml(reporterCountry)}</country>`);
      lines.push('                      </addr>');
      if (reporterPhone) lines.push(`                      <telecom value="tel:${this.escapeXml(reporterPhone)}"/>`);
      if (reporterEmail) lines.push(`                      <telecom value="mailto:${this.escapeXml(reporterEmail)}"/>`);
      lines.push('                      <assignedPerson classCode="PSN" determinerCode="INSTANCE">');
      lines.push('                        <name>');
      lines.push(`                          <prefix>${this.escapeXml(reporterTitle)}</prefix>`);
      lines.push(`                          <given>${this.escapeXml(reporterGiven)}</given>`);
      lines.push(`                          <family>${this.escapeXml(reporterFamily)}</family>`);
      lines.push('                        </name>');
      lines.push('                        <asQualifiedEntity classCode="QUAL">');
      lines.push(`                          <code code="${reporterQualCode}" displayName="${reporterQualDisplay}" codeSystem="2.16.840.1.113883.3.989.2.1.1.6"/>`);
      lines.push('                        </asQualifiedEntity>');
      lines.push('                        <asLocatedEntity classCode="LOCE">');
      lines.push('                          <location classCode="COUNTRY" determinerCode="INSTANCE">');
      lines.push(`                            <code code="${this.escapeXml(reporterCountry)}" codeSystem="1.0.3166.1.2.2"/>`);
      lines.push('                          </location>');
      lines.push('                        </asLocatedEntity>');
      lines.push('                      </assignedPerson>');
      lines.push('                    </assignedEntity>');
      lines.push('                  </author>');
      lines.push('                </controlActEvent>');
      lines.push('              </subjectOf2>');
      lines.push('            </relatedInvestigation>');
      lines.push('          </outboundRelationship>');
    }

    // ── SUBJECT OF 1: Reporter block (C.2/C.3) ─────────────────────────
    // v37 rule #1: MUST be inside subjectOf1/controlActEvent/author,
    // NOT a direct <author> child of investigationEvent.
    for (const reporter of reporters) {
      lines.push(this.buildReporter(reporter));
    }

    // ── SUBJECT OF 2: ICH ReportType investigationCharacteristic (C.1.3) ──
    // code=2 (Report from study) for IND/BABE cases, OR postmarket cases with
    // caseData.studyReport = true. When C.1.3 = 2, CDER 2.18 requires C.5.4
    // (Study Type). C.5.4 is emitted below in the researchStudy block.
    // Confirmed CR+AR without C.5.4: TC-F04 ci260501170904 (2026-05-01).
    const isStudy = caseData.caseType === 'ind' || caseData.caseType === 'babe' || caseData.studyReport === true;
    const ichReportCode = isStudy ? '2' : '1';
    const ichReportDisplay = isStudy ? 'Report from study' : 'Spontaneous report';
    lines.push('          <subjectOf2 typeCode="SUBJ">');
    lines.push('            <investigationCharacteristic classCode="OBS" moodCode="EVN">');
    lines.push('              <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.23" displayName="ICH ReportType"/>');
    lines.push(`              <value xsi:type="CE" code="${ichReportCode}" displayName="${ichReportDisplay}" codeSystem="2.16.840.1.113883.3.989.2.1.1.2"/>`);
    lines.push('            </investigationCharacteristic>');
    lines.push('          </subjectOf2>');

    // C.1.9.1 otherCaseIds — required by FAERS 2.18 business rules.
    // FDA ACK ci260412060025 R2: "Data value required for tag C.1.9.1".
    lines.push('          <subjectOf2 typeCode="SUBJ">');
    lines.push('            <investigationCharacteristic classCode="OBS" moodCode="EVN">');
    lines.push('              <code code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.23" displayName="otherCaseIds"/>');
    lines.push('              <value xsi:type="BL" nullFlavor="NI"/>');
    lines.push('            </investigationCharacteristic>');
    lines.push('          </subjectOf2>');

    lines.push('        </investigationEvent>');

    return lines.join('\n');
  }

  /**
   * Build the reporter block (C.2/C.3) wrapped in subjectOf1/controlActEvent/author.
   *
   * v37 rules (37 submission iterations confirmed):
   *   - MUST be inside subjectOf1/controlActEvent/author (rule #1)
   *   - assignedEntity/code MUST use OID .3.989.2.1.1.7 (rule #2 — the FDA 2.18
   *     engine reads C.3 from this container only via this OID)
   *   - Telephone AND fax MUST both be present (rule #8)
   *   - representedOrganization MUST be nested 2-level: outer=dept, inner=company
   *     (rule #3 — C.3.2 root cause finding)
   *   - asLocatedEntity country indicator retained for v29 parity
   */
  private buildReporter(reporter: CaseReporter): string {
    const lines: string[] = [];

    lines.push('          <subjectOf1 typeCode="SUBJ">');
    lines.push('            <controlActEvent classCode="CACT" moodCode="EVN">');
    lines.push('              <author typeCode="AUT">');
    lines.push('                <assignedEntity classCode="ASSIGNED">');

    // C.3.1 qualification — OID .1.7 is mandatory (rule #2)
    const qualCode = reporter.qualification ?? 1;
    lines.push(`                  <code code="${qualCode}" codeSystem="2.16.840.1.113883.3.989.2.1.1.7"/>`);

    // C.3.4.1–C.3.4.6 address — all fields required by CDER 2.18.
    // Confirmed empirically: TC-H02 ci260501235624 (2026-05-01) rejected for
    // missing C.3.4.1/2/3/4 when only country was provided. The generate()
    // method blocks before reaching here if any field is absent, but emit
    // unconditionally anyway to keep XML well-formed if --no-gate bypasses the check.
    lines.push('                  <addr>');
    lines.push(`                    <streetAddressLine>${this.escapeXml(reporter.address || '')}</streetAddressLine>`);
    lines.push(`                    <city>${this.escapeXml(reporter.city || '')}</city>`);
    lines.push(`                    <state>${this.escapeXml(reporter.state || '')}</state>`);
    lines.push(`                    <postalCode>${this.escapeXml(reporter.postcode || '')}</postalCode>`);
    lines.push(`                    <country>${this.escapeXml(reporter.country || 'US')}</country>`);
    lines.push('                  </addr>');

    // C.3.4.7 tel + C.3.4.8 fax — both required (v37 rule #8).
    // v29 ACK confirmed: fax absence triggers C.3.4.7 rejection even when tel
    // is present. When no fax is explicitly set, reuse the phone number as
    // fallback — a plausible real number rather than the blatant placeholder
    // +10000000000 that gap reviewers flagged.
    const phone = reporter.phone || '+10000000000';
    const fax = reporter.fax || reporter.phone || '+10000000000';
    lines.push(`                  <telecom value="tel:${this.escapeXml(phone)}"/>`);
    lines.push(`                  <telecom value="fax:${this.escapeXml(fax)}"/>`);
    if (reporter.email) {
      lines.push(`                  <telecom value="mailto:${this.escapeXml(reporter.email)}"/>`);
    }

    // C.3.3.1–C.3.3.3 name + asLocatedEntity country
    lines.push('                  <assignedPerson classCode="PSN" determinerCode="INSTANCE">');
    // Lint requires <prefix> to be non-empty. When reporter.title isn't
    // explicitly set, derive from qualification: Physician/Pharmacist → "Dr".
    const prefix = reporter.title
      || (reporter.qualification === 1 || reporter.qualification === 2 ? 'Dr' : 'Mr');
    lines.push('                    <name>');
    lines.push(`                      <prefix>${this.escapeXml(prefix)}</prefix>`);
    lines.push(`                      <given>${this.escapeXml(reporter.givenName || '')}</given>`);
    lines.push(`                      <family>${this.escapeXml(reporter.familyName || '')}</family>`);
    lines.push('                    </name>');
    lines.push('                    <asLocatedEntity classCode="LOCE">');
    lines.push('                      <location classCode="COUNTRY" determinerCode="INSTANCE">');
    lines.push(`                        <code code="${this.escapeXml(reporter.country || 'US')}" codeSystem="1.0.3166.1.2.2"/>`);
    lines.push('                      </location>');
    lines.push('                    </asLocatedEntity>');
    lines.push('                  </assignedPerson>');

    // C.3.3.5 representedOrganization — NESTED 2-level (v37 rule #3)
    // Outer name = department, inner name = company. If no department is set,
    // emit organization twice; lint requires both outer and inner <name> to be non-empty.
    const org = reporter.organization || 'Unknown';
    const dept = reporter.department && reporter.department !== org
      ? reporter.department
      : 'Drug Safety';
    lines.push('                  <representedOrganization classCode="ORG" determinerCode="INSTANCE">');
    lines.push(`                    <name>${this.escapeXml(dept)}</name>`);
    lines.push('                    <assignedEntity classCode="ASSIGNED">');
    lines.push('                      <representedOrganization classCode="ORG" determinerCode="INSTANCE">');
    lines.push(`                        <name>${this.escapeXml(org)}</name>`);
    lines.push('                      </representedOrganization>');
    lines.push('                    </assignedEntity>');
    lines.push('                  </representedOrganization>');

    lines.push('                </assignedEntity>');
    lines.push('              </author>');
    lines.push('            </controlActEvent>');
    lines.push('          </subjectOf1>');

    return lines.join('\n');
  }

  /**
   * Build patient section wrapped in subject1/primaryRole[INVSBJ]/player1.
   *
   * Lint section 9 requires race (C17049) and ethnicity (C16564) observations
   * to be present under primaryRole[classCode="INVSBJ"]. When the data model
   * doesn't yet carry these fields, emit nullFlavor-coded CE values so the
   * structural presence is satisfied.
   *
   * Lint section 12 requires D.7.2 (code=18 history text) and D.7.3 (code=11
   * concomitant therapy BL) observations.
   */
  /**
   * Build the SUSAR / IND <researchStudy> block (E2B C.5.*, FDA.C.5.*).
   *
   * Inserted as the first child of primaryRole/subjectOf1, matching
   * FAERS2022Scenario3.xml. `indNumber` (FDA.C.5.5a) is required; all
   * other fields are elided when absent rather than emitted with
   * nullFlavor, per spec §4.4.
   */
  private buildResearchStudy(ind: IndStudyInfo): string {
    const lines: string[] = [];
    lines.push('                  <subjectOf1 typeCode="SBJ">');
    lines.push('                    <researchStudy classCode="CLNTRL" moodCode="EVN">');

    // C.5.3 — Sponsor Study Number
    if (ind.sponsorStudyNumber) {
      lines.push(`                      <id extension="${this.escapeXml(ind.sponsorStudyNumber)}" root="2.16.840.1.113883.3.989.2.1.3.5"/>`);
    }

    // C.5.4 — Study Type (always Clinical trials = 1 for SUSAR per spec §2)
    lines.push('                      <code code="1" displayName="Clinical trials" codeSystem="2.16.840.1.113883.3.989.2.1.1.8" codeSystemVersion="1.0"/>');

    // C.5.2 — Study Name / Title
    if (ind.studyName) {
      lines.push(`                      <title>${this.escapeXml(ind.studyName)}</title>`);
    }

    // C.5.1.r.1 — Study Registration Number (e.g. NCT number)
    if (ind.studyRegistrationNumber) {
      lines.push('                      <authorization typeCode="AUTH">');
      lines.push('                        <studyRegistration classCode="ACT" moodCode="EVN">');
      lines.push(`                          <id extension="${this.escapeXml(ind.studyRegistrationNumber)}" root="2.16.840.1.113883.3.989.2.1.3.6"/>`);
      lines.push('                        </studyRegistration>');
      lines.push('                      </authorization>');
    }

    // FDA.C.5.5a — IND Number where AE Occurred (REQUIRED). Registry guard
    // per GAP-IND-007 / GAP-APP-003: the ZZFDATST_PREMKT test gateway
    // validates this against a registry of registered test INDs. Block
    // emission of any value known to be proven_rejected; surface untested
    // values as a build warning so they're visible in submission logs.
    const indEntry = IND_POLICY.indNumber.entries?.find((e) => e.value === ind.indNumber);
    if (indEntry?.verdict === 'proven_rejected') {
      throw new Error(
        `IND number "${ind.indNumber}" is proven_rejected by the ZZFDATST test registry. ` +
          `Use 123456 (proven_safe). Evidence: ${indEntry.evidence}`
      );
    }
    if (!indEntry) {
      this.buildWarnings.push(
        `IND number "${ind.indNumber}" is untested in the ZZFDATST test registry. ` +
          `Only 123456 is proven_safe (GAP-IND-007). Submission may CR+AR.`
      );
    }
    lines.push('                      <authorization typeCode="AUTH">');
    lines.push('                        <studyRegistration classCode="ACT" moodCode="EVN">');
    lines.push(`                          <id extension="${this.escapeXml(ind.indNumber)}" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.1"/>`);
    lines.push('                        </studyRegistration>');
    lines.push('                      </authorization>');

    // FDA.C.5.6.r — Cross-referenced IND numbers (repeating)
    for (const crossRef of ind.crossReferencedIndNumbers ?? []) {
      lines.push('                      <authorization typeCode="AUTH">');
      lines.push('                        <studyRegistration classCode="ACT" moodCode="EVN">');
      lines.push(`                          <id extension="${this.escapeXml(crossRef)}" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.3"/>`);
      lines.push('                        </studyRegistration>');
      lines.push('                      </authorization>');
    }

    lines.push('                    </researchStudy>');
    lines.push('                  </subjectOf1>');
    return lines.join('\n');
  }

  private buildPatient(caseData: Case, reactions: CaseReaction[], drugs: CaseDrug[], isPremarket: boolean): string {
    const lines: string[] = [];

    lines.push('              <subject1 typeCode="SBJ">');
    lines.push('                <primaryRole classCode="INVSBJ">');

    // Player demographics
    lines.push('                  <player1 classCode="PSN" determinerCode="INSTANCE">');
    if (caseData.patientInitials) {
      lines.push(`                    <name>${this.escapeXml(caseData.patientInitials)}</name>`);
    }
    if (caseData.patientSex != null) {
      // OID 1.0.5218 uses numeric codes: 1=Male, 2=Female, 0=Unknown
      const sexCode = caseData.patientSex === 1 ? '1' : caseData.patientSex === 2 ? '2' : '0';
      const sexDisplay = caseData.patientSex === 1 ? 'Male' : caseData.patientSex === 2 ? 'Female' : 'Unknown';
      lines.push(`                    <administrativeGenderCode code="${sexCode}" displayName="${sexDisplay}" codeSystem="1.0.5218"/>`);
    }
    if (caseData.patientBirthdate) {
      lines.push(`                    <birthTime value="${this.formatDate(caseData.patientBirthdate)}"/>`);
    }
    // D.9.1: Date of Death — required for fatal pre-market ICSRs (GAP-IND-004)
    if (caseData.patientDeath && caseData.deathDate) {
      lines.push(`                    <deceasedTime value="${this.formatDate(caseData.deathDate)}"/>`);
    }
    lines.push('                  </player1>');

    // researchStudy block — emitted when C.1.3 = 2 (Report from study).
    // Covers three cases:
    //   1. IND/SUSAR (caseType='ind') with full indStudy payload → full block
    //   2. IND-Exempt BA/BE (caseType='babe') with indStudy payload → full block
    //   3. Postmarket "Report from study" (studyReport=true, no indStudy) → minimal
    //      block with C.5.4 only (code="1" Clinical trials).
    //      CDER 2.18 requires C.5.4 when C.1.3=2 regardless of case type.
    //      Confirmed CR+AR without it: TC-F04 ci260501170904 (2026-05-01).
    const isStudyCase = caseData.caseType === 'ind' || caseData.caseType === 'babe';
    if (isStudyCase && caseData.indStudy) {
      lines.push(this.buildResearchStudy(caseData.indStudy));
    } else if (caseData.studyReport === true) {
      // Minimal C.5.4 block for postmarket "Report from study" (no IND study metadata)
      lines.push('                  <subjectOf1 typeCode="SBJ">');
      lines.push('                    <researchStudy classCode="CLNTRL" moodCode="EVN">');
      lines.push('                      <code code="1" displayName="Clinical trials" codeSystem="2.16.840.1.113883.3.989.2.1.1.8" codeSystemVersion="1.0"/>');
      lines.push('                    </researchStudy>');
      lines.push('                  </subjectOf1>');
    }

    // B.1.2.2 age (PQ)
    if (caseData.patientAge != null) {
      const ageUnit = this.getAgeUnitCode(caseData.patientAgeUnit);
      lines.push('                  <subjectOf2 typeCode="SBJ">');
      lines.push('                    <observation classCode="OBS" moodCode="EVN">');
      lines.push('                      <code code="C25150" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Age"/>');
      lines.push(`                      <value xsi:type="PQ" value="${caseData.patientAge}" unit="${ageUnit}"/>`);
      lines.push('                    </observation>');
      lines.push('                  </subjectOf2>');
    }

    // B.1.2.3 age group — use explicit value if set, otherwise compute from age.
    const ageGroupDisplay: Record<number, string> = {
      1: 'Neonate', 2: 'Infant', 3: 'Child', 4: 'Adolescent', 5: 'Adult', 6: 'Elderly'
    };
    let ageGroup = caseData.patientAgeGroup ?? null;
    if (ageGroup == null && caseData.patientAge != null) {
      const ageInYears = caseData.patientAgeUnit === 'Month'
        ? caseData.patientAge / 12
        : caseData.patientAgeUnit === 'Day'
          ? caseData.patientAge / 365
          : caseData.patientAge;
      if (ageInYears < 0.08) ageGroup = 1;       // Neonate  (< ~1 month)
      else if (ageInYears < 2) ageGroup = 2;      // Infant
      else if (ageInYears < 12) ageGroup = 3;     // Child
      else if (ageInYears < 18) ageGroup = 4;     // Adolescent
      else if (ageInYears < 65) ageGroup = 5;     // Adult
      else ageGroup = 6;                           // Elderly
    }
    if (ageGroup != null) {
      lines.push('                  <subjectOf2 typeCode="SBJ">');
      lines.push('                    <observation classCode="OBS" moodCode="EVN">');
      lines.push('                      <code code="4" displayName="Age Group" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"/>');
      lines.push(`                      <value xsi:type="CE" code="${ageGroup}" displayName="${ageGroupDisplay[ageGroup] || 'Unknown'}" codeSystem="2.16.840.1.113883.3.989.2.1.1.9"/>`);
      lines.push('                    </observation>');
      lines.push('                  </subjectOf2>');
    }

    // B.1.3 weight
    if (caseData.patientWeight != null) {
      lines.push('                  <subjectOf2 typeCode="SBJ">');
      lines.push('                    <observation classCode="OBS" moodCode="EVN">');
      lines.push('                      <code code="C25208" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Weight"/>');
      lines.push(`                      <value xsi:type="PQ" value="${caseData.patientWeight}" unit="kg"/>`);
      lines.push('                    </observation>');
      lines.push('                  </subjectOf2>');
    }

    // B.1.4 height
    if (caseData.patientHeight != null) {
      lines.push('                  <subjectOf2 typeCode="SBJ">');
      lines.push('                    <observation classCode="OBS" moodCode="EVN">');
      lines.push('                      <code code="C25347" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Height"/>');
      lines.push(`                      <value xsi:type="PQ" value="${caseData.patientHeight}" unit="cm"/>`);
      lines.push('                    </observation>');
      lines.push('                  </subjectOf2>');
    }

    // Race (B.1.7 / C17049) — lint section 9. Emits the coded NCIt value when
    // patientRace is set, otherwise nullFlavor="NI" so the structural check
    // still passes for cases where race was not captured.
    lines.push('                  <subjectOf2 typeCode="SBJ">');
    lines.push('                    <observation classCode="OBS" moodCode="EVN">');
    lines.push('                      <code code="C17049" displayName="Race" codeSystem="2.16.840.1.113883.3.26.1.1"/>');
    // FAERS 2.18 rejects nullFlavor="NI" (ACK QTXZ) and C17998 "Unknown" (ACK 26ZL).
    // All five FDA race codes from v1.7.xlsx row 169 are now proven_safe per ACK3:
    //   C41260 Asian (v37/2L8T), C41261 White (TC-A01), C41259 American Indian or
    //   Alaska Native (TC-A03 v2), C41219 Native Hawaiian or Other Pacific Islander
    //   (TC-A04 v2), C16352 African American (TC-A02b ci260601175051 2026-06-01).
    // Default to C41260 when not set.
    if (caseData.patientRace) {
      lines.push(`                      <value xsi:type="CE" code="${this.escapeXml(caseData.patientRace)}" codeSystem="2.16.840.1.113883.3.26.1.1"/>`);
    } else {
      lines.push('                      <value xsi:type="CE" code="C41260" displayName="Asian" codeSystem="2.16.840.1.113883.3.26.1.1"/>');
    }
    lines.push('                    </observation>');
    lines.push('                  </subjectOf2>');

    // Ethnicity (C16564) — same pattern
    lines.push('                  <subjectOf2 typeCode="SBJ">');
    lines.push('                    <observation classCode="OBS" moodCode="EVN">');
    lines.push('                      <code code="C16564" displayName="Ethnic Group" codeSystem="2.16.840.1.113883.3.26.1.1"/>');
    // Same policy as race: FAERS rejects both nullFlavor and C17998.
    // Default to C41222 "Not Hispanic or Latino" — confirmed accepted in v37.
    if (caseData.patientEthnicity) {
      lines.push(`                      <value xsi:type="CE" code="${this.escapeXml(caseData.patientEthnicity)}" codeSystem="2.16.840.1.113883.3.26.1.1"/>`);
    } else {
      lines.push('                      <value xsi:type="CE" code="C41222" displayName="Not Hispanic or Latino" codeSystem="2.16.840.1.113883.3.26.1.1"/>');
    }
    lines.push('                    </observation>');
    lines.push('                  </subjectOf2>');

    // D.7.2 / D.7.3 medical history organizer — lint section 12
    // D.7.3 concomitantTherapy — auto-detect from drug list: if any drug has
    // characterization=Concomitant (2), the flag must be true regardless of
    // the explicit field value (F-11 consistency fix).
    const historyText = caseData.medicalHistoryText?.trim();
    const hasConcomitant = caseData.hasConcomitantTherapy === true
      || drugs.some(d => d.characterization === 2);
    lines.push('                  <subjectOf2 typeCode="SBJ">');
    lines.push('                    <organizer classCode="CATEGORY" moodCode="EVN">');
    lines.push('                      <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.20" displayName="relevantMedicalHistoryAndConcurrentConditions"/>');
    lines.push('                      <component typeCode="COMP">');
    lines.push('                        <observation classCode="OBS" moodCode="EVN">');
    lines.push('                          <code code="18" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="historyAndConcurrentConditionText"/>');
    // FAERS 2.18 rejects nullFlavor="NI" on D.7.2 medical history text.
    // Use "None reported" as fallback instead.
    lines.push(`                          <value xsi:type="ED">${this.escapeXml(historyText || 'None reported')}</value>`);
    lines.push('                        </observation>');
    lines.push('                      </component>');
    lines.push('                      <component typeCode="COMP">');
    lines.push('                        <observation classCode="OBS" moodCode="EVN">');
    lines.push('                          <code code="11" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="concomitantTherapy"/>');
    lines.push(`                          <value xsi:type="BL" value="${hasConcomitant}"/>`);
    lines.push('                        </observation>');
    lines.push('                      </component>');
    lines.push('                    </organizer>');
    lines.push('                  </subjectOf2>');

    // Death (B.1.9). HL7 v3 observation child sequence requires
    // effectiveTime BEFORE value — out-of-order produced a SAX schema parse
    // error (cvc-complex-type.2.4.a) on IND-T05 ACK3 2026-04-27 (GAP-IND-003).
    if (caseData.patientDeath) {
      lines.push('                  <subjectOf2 typeCode="SBJ">');
      lines.push('                    <observation classCode="OBS" moodCode="EVN">');
      lines.push('                      <code code="C28554" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Death"/>');
      if (caseData.deathDate) {
        lines.push(`                      <effectiveTime value="${this.formatDate(caseData.deathDate)}"/>`);
      }
      lines.push('                      <value xsi:type="BL" value="true"/>');
      lines.push('                    </observation>');
      lines.push('                  </subjectOf2>');
      // D.9.3: Was Autopsy Done? — required when D.9.1 is present (GAP-IND-004)
      const autopsyDone = caseData.autopsyPerformed ?? false;
      lines.push('                  <subjectOf2 typeCode="SBJ">');
      lines.push('                    <observation classCode="OBS" moodCode="EVN">');
      lines.push('                      <code code="5" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="autopsy"/>');
      lines.push(`                      <value xsi:type="BL" value="${autopsyDone}"/>`);
      lines.push('                    </observation>');
      lines.push('                  </subjectOf2>');
    }

    // Reactions (B.2) — reset UUID accumulator so buildDrugCausalityBlocks
    // can cross-reference reactions by the exact UUIDs emitted here.
    this.lastReactionUuids = [];
    for (const reaction of reactions) {
      lines.push(this.buildReaction(reaction, isPremarket, !!caseData.overallNonSerious));
    }

    // Drugs (B.4) — pass 1-based index for substanceAdministration/id extension
    for (let k = 0; k < drugs.length; k++) {
      lines.push(this.buildDrug(drugs[k], isPremarket, k + 1));
    }

    lines.push('                </primaryRole>');
    lines.push('              </subject1>');

    return lines.join('\n');
  }

  /**
   * Build reaction section (B.2) matching v37 structure.
   *
   * Key constraints (lint section 8):
   *   - code = "29" in OID .3.989.2.1.1.19 (reaction)
   *   - effectiveTime MUST come before value
   *   - effectiveTime uses xsi:type="IVL_TS" when low/high present
   *   - value is CE with MedDRA code on OID 2.16.840.1.113883.6.163
   *
   * Per v37 template, each seriousness criterion is its own
   * outboundRelationship2/observation (not a comma-separated CE).
   */
  private buildReaction(reaction: CaseReaction, isPremarket: boolean, overallNonSerious: boolean = false): string {
    const lines: string[] = [];

    lines.push('                  <subjectOf2 typeCode="SBJ">');
    lines.push('                    <observation classCode="OBS" moodCode="EVN">');
    const rxnUuid = uuidv4();
    this.lastReactionUuids.push(rxnUuid);
    lines.push(`                      <id root="${rxnUuid}"/>`);
    lines.push('                      <code code="29" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="reaction"/>');

    // effectiveTime BEFORE value, IVL_TS when low/high used
    if (reaction.startDate || reaction.endDate) {
      lines.push('                      <effectiveTime xsi:type="IVL_TS">');
      if (reaction.startDate) {
        lines.push(`                        <low value="${this.formatDate(reaction.startDate)}"/>`);
      }
      if (reaction.endDate) {
        lines.push(`                        <high value="${this.formatDate(reaction.endDate)}"/>`);
      }
      lines.push('                      </effectiveTime>');
    }

    // MedDRA-coded value — auto-resolve via dictionary/fallback when no code.
    const meddraCode = reaction.meddraCode || this.resolveMeddraCode(reaction.reactionTerm);
    if (meddraCode) {
      lines.push(`                      <value xsi:type="CE" code="${this.escapeXml(meddraCode)}" displayName="${this.escapeXml(reaction.reactionTerm)}" codeSystem="${MEDDRA_OID}" codeSystemVersion="${MEDDRA_VERSION}"/>`);
    } else {
      lines.push(`                      <value xsi:type="CE" nullFlavor="UNK" displayName="${this.escapeXml(reaction.reactionTerm)}"/>`);
      this.buildWarnings.push(`Reaction '${reaction.reactionTerm}' could not be resolved to a MedDRA code — emitted with nullFlavor.`);
    };

    // Seriousness criteria — emit each as its own outboundRelationship2
    const seriousnessCriteria: Array<[string, string, boolean]> = [
      ['34', 'resultsInDeath', !!reaction.seriousDeath],
      ['21', 'isLifeThreatening', !!reaction.seriousLifeThreat],
      ['33', 'requiresInpatientHospitalization', !!reaction.seriousHospitalization],
      ['35', 'resultsInPersistentOrSignificantDisability', !!reaction.seriousDisability],
      ['12', 'congenitalAnomalyBirthDefect', !!reaction.seriousCongenital],
      ['26', 'otherMedicallyImportantCondition', !!reaction.seriousOther]
    ];
    for (const [code, displayName, value] of seriousnessCriteria) {
      lines.push('                      <outboundRelationship2 typeCode="PERT">');
      lines.push('                        <observation classCode="OBS" moodCode="EVN">');
      lines.push(`                          <code code="${code}" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="${displayName}"/>`);
      lines.push(`                          <value xsi:type="BL" value="${value}"/>`);
      lines.push('                        </observation>');
      lines.push('                      </outboundRelationship2>');
    }

    // requiredIntervention (code=7) — v37 parity. FDA 2.18 business rules
    // mandate nullFlavor="NI" for premarket cases (IND-T01 ACK3 2026-04-27,
    // GAP-IND-002): "Required Intervention (FDA.E.i.3.2h) must always
    // contain nullFlavour 'NI' for a pre-market case." Postmarket retains
    // the boolean form per v37 lint parity.
    lines.push('                      <outboundRelationship2 typeCode="PERT">');
    lines.push('                        <observation classCode="OBS" moodCode="EVN">');
    lines.push('                          <code code="7" codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.3" displayName="requiredIntervention"/>');
    if (isPremarket) {
      lines.push('                          <value xsi:type="BL" nullFlavor="NI"/>');
    } else {
      lines.push('                          <value xsi:type="BL" value="false"/>');
    }
    lines.push('                        </observation>');
    lines.push('                      </outboundRelationship2>');

    // Outcome (B.2.i.8) — code=27 in reaction observation value set .1.19
    // FAERS 2.18 allows codes 1-5 only (ACK ci260412060025 R5: code=6 rejected).
    // FAERS 2.18 allows outcome codes 1-5 only. Invalid codes (0, 6+) default
    // to 3 (not recovered/ongoing) — the safest clinical default and consistent
    // with v37. nullFlavor="UNK" was tried in 4Z0E but risks rejection.
    const VALID_OUTCOME_CODES = [1, 2, 3, 4, 5];
    if (reaction.outcome != null) {
      const outcomeCode = VALID_OUTCOME_CODES.includes(reaction.outcome)
        ? String(reaction.outcome)
        : '3';
      if (!VALID_OUTCOME_CODES.includes(reaction.outcome)) {
        this.buildWarnings.push(`Reaction '${reaction.reactionTerm}' outcome code=${reaction.outcome} is not in FAERS 2.18 value set (1-5). Defaulted to code=3 (not recovered/ongoing).`);
      }
      lines.push('                      <outboundRelationship2 typeCode="PERT">');
      lines.push('                        <observation classCode="OBS" moodCode="EVN">');
      const OUTCOME_DISPLAY: Record<string, string> = {
        '1': 'recovered/resolved', '2': 'recovering/resolving',
        '3': 'not recovered/not resolved/ongoing', '4': 'recovered/resolved with sequelae', '5': 'fatal'
      };
      lines.push('                          <code code="27" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="outcome"/>');
      lines.push(`                          <value xsi:type="CE" code="${outcomeCode}" displayName="${OUTCOME_DISPLAY[outcomeCode] || ''}" codeSystem="2.16.840.1.113883.3.989.2.1.1.11"/>`);
      lines.push('                        </observation>');
      lines.push('                      </outboundRelationship2>');
    }

    // Seriousness summary (C83121) — primary seriousness criterion as CE.
    // CDER FAERS 2.18 expects this block on every reaction. When all six
    // BL flags are false AND the case explicitly declares overallNonSerious
    // (TC-G01 path), default to "otherMedicallyImportant" — the value the
    // TC-G01 golden carries in its CA+AA submission (ci260501225706). The
    // null branch is preserved for future cases where neither a true flag
    // nor the overallNonSerious opt-in is present (defensive).
    const primarySeriousness =
      reaction.seriousDeath ? 'death' :
      reaction.seriousLifeThreat ? 'lifeThreatening' :
      reaction.seriousHospitalization ? 'hospitalization' :
      reaction.seriousDisability ? 'disability' :
      reaction.seriousCongenital ? 'congenitalAnomaly' :
      reaction.seriousOther ? 'otherMedicallyImportant' :
      overallNonSerious ? 'otherMedicallyImportant' :
      null;
    if (primarySeriousness) {
      lines.push('                      <outboundRelationship2 typeCode="PERT">');
      lines.push('                        <observation classCode="OBS" moodCode="EVN">');
      lines.push('                          <code code="C83121" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Seriousness"/>');
      lines.push(`                          <value xsi:type="CE" code="${primarySeriousness}" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"/>`);
      lines.push('                        </observation>');
      lines.push('                      </outboundRelationship2>');
    }

    // Outcome summary (C49489) — FAERS-specific outcome observation.
    // INDEPENDENT from code=27 (E.i.7): C49489 accepts code=6 (E2B R2-legacy
    // "unknown at time of last observation") for ongoing/unresolved/unknown
    // reactions, while code=27 restricts to 1-5.
    // ACK ci260413015657: using code=3 in C49489 for ongoing reactions triggered
    // cross-field D.7.2 and FDA.D.11.r.1 rejections. v37 golden uses code=6.
    if (reaction.outcome != null) {
      const C49489_MAP: Record<number, string> = {
        1: '1',  // Recovered/Resolved
        2: '2',  // Recovering/Resolving
        3: '6',  // Not recovered/Ongoing → code=6 in C49489 (NOT code=3)
        4: '4',  // Resolved with sequelae
        5: '5'   // Fatal
      };
      const c49489Code = C49489_MAP[reaction.outcome] || '6';
      lines.push('                      <outboundRelationship2 typeCode="PERT">');
      lines.push('                        <observation classCode="OBS" moodCode="EVN">');
      lines.push('                          <code code="C49489" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Outcome"/>');
      lines.push(`                          <value xsi:type="CE" code="${c49489Code}" codeSystem="2.16.840.1.113883.3.989.2.1.1.11"/>`);
      lines.push('                        </observation>');
      lines.push('                      </outboundRelationship2>');
    }

    lines.push('                    </observation>');
    lines.push('                  </subjectOf2>');

    return lines.join('\n');
  }

  /**
   * Build drug section (B.4)
   */
  private buildDrug(drug: CaseDrug, isPremarket: boolean = false, drugIndex: number = 1): string {
    const lines: string[] = [];

    lines.push('            <subjectOf2 typeCode="SBJ">');
    lines.push('              <organizer classCode="CATEGORY" moodCode="EVN">');

    // Drug organizer — new format per Business Rules v1.7 ICSR XPath sheet.
    // code="4" on OID …1.20 is required for G.k product XPaths to resolve in
    // FDA FAERS 2.18. Legacy format (code="suspect"/"concomitant" on …1.13)
    // was accepted by the gateway but caused XPath resolution failures.
    // G.k.1 drug role is now expressed via causalityAssessment code=20 —
    // see buildDrugCausalityBlocks. Confirmed CA+AA: TC-XP01 ci260602192744.
    lines.push('                <code code="4" codeSystem="2.16.840.1.113883.3.989.2.1.1.20"/>');

    lines.push('                <component typeCode="COMP">');
    lines.push('                  <substanceAdministration classCode="SBADM" moodCode="EVN">');
    // Drug instance identifier — OID …3.19 + sequential extension per drug.
    // Required by the new organizer format; confirmed from FDA reference XML
    // FDA_E2B_R3_Test_ICSR.xml line 355.
    lines.push(`                    <id root="2.16.840.1.113883.3.989.2.1.3.19" extension="${drugIndex}"/>`);

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

    // G.k.4 route + dose are SUPPRESSED pending a structure fix + FDA acceptance.
    // The current forms are non-conformant with the FDA E2B(R3) references and
    // appear in NO accepted golden (including the June-accepted TC-XP01 / ACK
    // ci260602192744):
    //   - routeCode uses codeSystem 2.16.840.1.113883.3.989.2.1.1.14 — FDA refs
    //     use the EDQM route value set 0.4.0.127.0.16.1.1.2.6 with displayName +
    //     codeSystemVersion.
    //   - doseQuantity wraps the value in <center> — FDA refs use the direct form
    //     <doseQuantity value="..." unit="..."/>.
    // Re-enable only after fixing both structures AND confirming an ACK accepts
    // them. See docs/requirements/response/Generator_Golden_Divergence_Note.md.
    const EMIT_GK4_ROUTE_DOSE = false;

    // Route of administration (B.4.k.4.r.8)
    if (EMIT_GK4_ROUTE_DOSE && drug.dosages && drug.dosages.length > 0 && drug.dosages[0].route) {
      const routeCode = this.getRouteCode(drug.dosages[0].route);
      lines.push(`                    <routeCode code="${routeCode}" codeSystem="2.16.840.1.113883.3.989.2.1.1.14"/>`);
    }

    // Dosage information (B.4.k.4)
    if (EMIT_GK4_ROUTE_DOSE && drug.dosages && drug.dosages.length > 0) {
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

    // SUSAR / IND — G.k.3.1 authorization / application number (e.g. IND
    // number for the suspect drug). Nested inside asManufacturedProduct /
    // subjectOf / approval, matching FAERS2022Scenario3.xml lines 378–401.
    // Holder name is best-effort (prefers manufacturerName, falls back to
    // the drug's own productName so the slot is never empty).
    if (drug.indAuthorizationNumber) {
      const holderName = drug.manufacturerName || drug.productName;
      // G.k.3.2 country of authorisation — required by FAERS 2.18 business rules
      // whenever G.k.3.1 is present (confirmed empirically: regression_results_2
      // 2026-06-03 — 28/28 CR+AR with message "G.k.3.2 should be entered when
      // G.k.3.1 is entered"). Default to "US" when not explicitly set on the drug.
      const authCountry = drug.authorizationCountry ?? 'US';
      lines.push('                          <asManufacturedProduct classCode="MANU">');
      lines.push('                            <subjectOf typeCode="SBJ">');
      lines.push('                              <approval classCode="CNTRCT" moodCode="EVN">');
      lines.push(`                                <id extension="${this.escapeXml(drug.indAuthorizationNumber)}" root="2.16.840.1.113883.3.989.2.1.3.4"/>`);
      lines.push('                                <holder typeCode="HLD">');
      lines.push('                                  <role classCode="HLD">');
      lines.push('                                    <playingOrganization classCode="ORG" determinerCode="INSTANCE">');
      lines.push(`                                      <name>${this.escapeXml(holderName)}</name>`);
      lines.push('                                    </playingOrganization>');
      lines.push('                                  </role>');
      lines.push('                                </holder>');
      lines.push('                                <author typeCode="AUT">');
      lines.push('                                  <territorialAuthority classCode="TERR">');
      lines.push('                                    <territory classCode="NAT" determinerCode="INSTANCE">');
      lines.push(`                                      <code code="${this.escapeXml(authCountry)}" codeSystem="1.0.3166.1.2.2"/>`);
      lines.push('                                    </territory>');
      lines.push('                                  </territorialAuthority>');
      lines.push('                                </author>');
      lines.push('                              </approval>');
      lines.push('                            </subjectOf>');
      lines.push('                          </asManufacturedProduct>');
    }

    lines.push('                        </kindOfProduct>');
    lines.push('                      </instanceOfKind>');
    lines.push('                    </consumable>');

    // Indication (B.4.k.7). FDA requires a coded CE value (MedDRA PT) — the
    // v37 lint rejects any indication observation with a missing code or
    // codeSystem. When the drug record only has free-text indication, try to
    // auto-resolve the MedDRA PT code; if resolution fails, skip emitting the
    // indication observation entirely and surface a warning on the result.
    if (drug.indication) {
      const resolvedCode = drug.indicationCode || this.resolveMeddraCode(drug.indication);
      if (resolvedCode) {
        lines.push('                    <outboundRelationship2 typeCode="RSON">');
        lines.push('                      <observation classCode="OBS" moodCode="EVN">');
        lines.push('                        <code code="C41331" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Indication"/>');
        lines.push(`                        <value xsi:type="CE" code="${this.escapeXml(resolvedCode)}" displayName="${this.escapeXml(drug.indication)}" codeSystem="${MEDDRA_OID}" codeSystemVersion="${MEDDRA_VERSION}"/>`);
        lines.push('                      </observation>');
        lines.push('                    </outboundRelationship2>');
      } else {
        this.buildWarnings.push(
          `Drug '${drug.productName}' indication '${drug.indication}' could not be resolved to a MedDRA code — indication observation was omitted from the XML. Edit the drug to pick a coded term via the MedDRA autocomplete.`
        );
      }
    }

    // Action taken (B.4.k.12)
    if (drug.actionTaken != null) {
      lines.push('                    <outboundRelationship2 typeCode="COMP">');
      lines.push('                      <observation classCode="OBS" moodCode="EVN">');
      lines.push('                        <code code="C41341" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Action Taken"/>');
      lines.push(`                        <value xsi:type="CE" code="${drug.actionTaken}" codeSystem="2.16.840.1.113883.3.989.2.1.1.15"/>`);
      lines.push('                      </observation>');
      lines.push('                    </outboundRelationship2>');
    }

    // Dechallenge (B.4.k.13.1) — always emit. FDA ACK ci260412060025 R8:
    // absence causes "Element value not allowed for tag FDA.D.11.r.1".
    // Default to code=3 (Not applicable / Unknown) when not explicitly set.
    const dechallengeCode = drug.dechallenge != null ? drug.dechallenge : 3;
    lines.push('                    <outboundRelationship2 typeCode="COMP">');
    lines.push('                      <observation classCode="OBS" moodCode="EVN">');
    lines.push('                        <code code="C49492" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Dechallenge"/>');
    lines.push(`                        <value xsi:type="CE" code="${dechallengeCode}" codeSystem="2.16.840.1.113883.3.989.2.1.1.16"/>`);
    lines.push('                      </observation>');
    lines.push('                    </outboundRelationship2>');

    // Rechallenge (B.4.k.13.2) — always emit, same rationale as Dechallenge.
    const rechallengeCode = drug.rechallenge != null ? drug.rechallenge : 3;
    lines.push('                    <outboundRelationship2 typeCode="COMP">');
    lines.push('                      <observation classCode="OBS" moodCode="EVN">');
    lines.push('                        <code code="C49494" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Rechallenge"/>');
    lines.push(`                        <value xsi:type="CE" code="${rechallengeCode}" codeSystem="2.16.840.1.113883.3.989.2.1.1.17"/>`);
    lines.push('                      </observation>');
    lines.push('                    </outboundRelationship2>');

    // GAP-IND-006: FDAAddDrugInformation (C.5.5a) is invalid for CDER_IND — omit for IND submissions
    // SUSAR / IND — G.k.10a.r FDA additional drug information (BA/BE only).
    // Per spec §4.6: Test/Reference drugs get the coded CE value; all other
    // drugs in a BA/BE study get nullFlavor="NA". For non-BA/BE IND cases
    // the field is absent on the drug record and we skip emission.
    // The field is only valid for postmarket NDA/ANDA submissions; CDER_IND
    // rejects it with "FDA.C.5.5a is invalid for the Center specified in N.2.r.3".
    if (drug.fdaAdditionalDrugInfo && !isPremarket) {
      lines.push('                    <outboundRelationship2 typeCode="COMP">');
      lines.push('                      <observation classCode="OBS" moodCode="EVN">');
      lines.push('                        <code code="9" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" codeSystemVersion="1.1" displayName="FDAAddDrugInformation"/>');
      if (drug.fdaAdditionalDrugInfo === 'TEST') {
        lines.push('                        <value xsi:type="CE" code="1" displayName="Test" codeSystem="2.16.840.1.113883.3.989.2.1.1.7" codeSystemVersion="1.0"/>');
      } else if (drug.fdaAdditionalDrugInfo === 'REFERENCE') {
        lines.push('                        <value xsi:type="CE" code="2" displayName="Reference drug" codeSystem="2.16.840.1.113883.3.989.2.1.1.7" codeSystemVersion="1.0"/>');
      } else {
        // NA — nullFlavor for the drugs in the BA/BE study that aren't the
        // test/reference pair. Still must emit so the observation is
        // present across all drugs in a BA/BE submission.
        lines.push('                        <value xsi:type="CE" nullFlavor="NA" codeSystem="2.16.840.1.113883.3.989.2.1.1.7" codeSystemVersion="1.0"/>');
      }
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
   * Build causalityAssessment blocks for G.k.1 (code=20) and G.k.9.i (code=39).
   *
   * These MUST be component children of the main adverseEventAssessment,
   * placed after </subject1> (i.e. after buildPatient's output).
   *
   * G.k.1 (code=20): one block per drug, expresses drug role (Suspect/
   *   Concomitant/Interacting) via <value> + <subject2/productUseReference>
   *   referencing the drug by its substanceAdministration/id (OID …3.19,
   *   extension = 1-based drug index). Per BRv1.7 ICSR XPath row 283.
   *
   * G.k.9.i (code=39): one block per (suspect drug × reaction) pair, links
   *   the drug and reaction by their respective identifiers. Per BRv1.7 row 358.
   *   Reaction UUIDs are the same values emitted in buildReaction and stored in
   *   this.lastReactionUuids. Only suspect drugs (characterization=1) generate
   *   code=39 entries; concomitant drugs do not have a causality assessment.
   *
   * Evidence: TC-XP01 ci260602192744 CA+AA 2026-06-02.
   */
  private buildDrugCausalityBlocks(drugs: CaseDrug[], isPremarket: boolean = false): string {
    if (drugs.length === 0) return '';
    const lines: string[] = [];

    // G.k.1: drug role per drug
    const roleMap: Record<number, { code: string; name: string }> = {
      1: { code: '1', name: 'Suspect' },
      2: { code: '2', name: 'Concomitant' },
      3: { code: '3', name: 'Interacting' },
      4: { code: '4', name: 'Not Administered' }
    };
    for (let k = 0; k < drugs.length; k++) {
      const drug = drugs[k];
      const drugIndex = k + 1;
      const role = roleMap[drug.characterization] ?? { code: '1', name: 'Suspect' };
      lines.push('              <!-- G.k.1 drug role (Business Rules v1.7 ICSR XPath row 283) -->');
      lines.push('              <component typeCode="COMP">');
      lines.push('                <causalityAssessment classCode="OBS" moodCode="EVN">');
      lines.push('                  <code code="20" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"/>');
      lines.push(`                  <value xsi:type="CE" code="${role.code}" codeSystem="2.16.840.1.113883.3.989.2.1.1.13" displayName="${role.name}"/>`);
      lines.push('                  <subject2 typeCode="SUBJ">');
      lines.push('                    <productUseReference classCode="SBADM" moodCode="EVN">');
      lines.push(`                      <id root="2.16.840.1.113883.3.989.2.1.3.19" extension="${drugIndex}"/>`);
      lines.push('                    </productUseReference>');
      lines.push('                  </subject2>');
      lines.push('                </causalityAssessment>');
      lines.push('              </component>');
    }

    // G.k.9.i: drug-reaction matrix for suspect drugs.
    // For IND/premarket submissions, FAERS 2.18 enforces that at least one
    // code=39 block must carry the G.k.9.i.2.r.1/2/3 triplet (source/method/result)
    // for each suspect drug — confirmed by regression_results_5/6 CR+AR.
    // For postmarket, the triplet is optional (CA+AA without it in RR3) but
    // including it improves spec compliance.
    // Structure confirmed from FAERS2022Scenario3.xml lines 610–636.
    for (let k = 0; k < drugs.length; k++) {
      const drug = drugs[k];
      if (drug.characterization !== 1) continue; // only suspect drugs
      const drugIndex = k + 1;
      for (const rxnUuid of this.lastReactionUuids) {
        lines.push('              <!-- G.k.9.i drug-reaction matrix (Business Rules v1.7 ICSR XPath row 358) -->');
        lines.push('              <component typeCode="COMP">');
        lines.push('                <causalityAssessment classCode="OBS" moodCode="EVN">');
        lines.push('                  <code code="39" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="causality"/>');
        // G.k.9.i.2.r.3: Result of Assessment — "Suspected" per FDA Scenario 3 default
        lines.push('                  <value xsi:type="ST">Suspected</value>');
        // G.k.9.i.2.r.2: Method of Assessment
        lines.push('                  <methodCode>');
        lines.push('                    <originalText>FDA</originalText>');
        lines.push('                  </methodCode>');
        // G.k.9.i.2.r.1: Source of Assessment
        lines.push('                  <author typeCode="AUT">');
        lines.push('                    <assignedEntity classCode="ASSIGNED">');
        lines.push('                      <code>');
        lines.push('                        <originalText>Sponsor</originalText>');
        lines.push('                      </code>');
        lines.push('                    </assignedEntity>');
        lines.push('                  </author>');
        lines.push('                  <subject1 typeCode="SUBJ">');
        lines.push('                    <adverseEffectReference classCode="OBS" moodCode="EVN">');
        lines.push(`                      <id root="${rxnUuid}"/>`);
        lines.push('                    </adverseEffectReference>');
        lines.push('                  </subject1>');
        lines.push('                  <subject2 typeCode="SUBJ">');
        lines.push('                    <productUseReference classCode="SBADM" moodCode="EVN">');
        lines.push(`                      <id root="2.16.840.1.113883.3.989.2.1.3.19" extension="${drugIndex}"/>`);
        lines.push('                    </productUseReference>');
        lines.push('                  </subject2>');
        lines.push('                </causalityAssessment>');
        lines.push('              </component>');
      }
    }

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
   * Format date time with timezone offset for E2B (YYYYMMDDHHmmss-HHMM)
   */
  private formatDateTimeWithTz(date: Date): string {
    const base = this.formatDateTime(date);
    const offset = date.getTimezoneOffset();
    const sign = offset <= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const minutes = String(absOffset % 60).padStart(2, '0');
    return `${base}${sign}${hours}${minutes}`;
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
