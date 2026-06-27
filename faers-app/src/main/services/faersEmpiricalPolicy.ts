/**
 * FAERS 2.18 Empirical Value Policy
 *
 * Hard-earned table of which coded values the FDA ZZFDATST validator has
 * actually accepted or rejected, per §6 of CLAUDE_CODE_SESSION_HANDOFF_2L8T.md.
 * Lineage is preserved (v37 golden hand-crafted XML + the app-generated
 * CF97/2GZK/QTXZ/26ZL/2L8T campaign) so when future updates change one of
 * these verdicts we know why the verdict existed in the first place.
 *
 * **Do not extend by spec reading alone.** Only add entries after an ACK3
 * from ZZFDATST confirms a new value is accepted or rejected.
 *
 * Source-of-truth evidence (curated 2026-05-07):
 *   - test/golden/postmarket/accepted/  — 26 confirmed CA+AA pairs
 *   - test/golden/postmarket/rejected/  — 3 confirmed CR+AR pairs
 *                                         (TC-A03/A04/A06 — race + ethnicity)
 *   - test/golden/ind/accepted/         — 7 confirmed CA+AE pairs (IND-T01..T07)
 * Each rejected XML+ACK pair under that tree is the authoritative
 * evidence behind a `proven_rejected` entry below.
 */

export type PolicyVerdict = 'proven_safe' | 'proven_rejected' | 'untested';

export interface PolicyEntry {
  value: string;
  verdict: Exclude<PolicyVerdict, 'untested'>;
  /** Short provenance: which case(s) produced this verdict. */
  evidence: string;
}

export interface FieldPolicy {
  /** Human-readable field label. */
  label: string;
  /** E2B / FAERS tag, e.g. `FDA.D.11.r.1`. */
  tag: string;
  /** Which observation @code maps to this field (for validator pass 3). */
  observationCode: string;
  entries: PolicyEntry[];
  /**
   * Set when a value that looks like it *should* be valid per the spec (e.g.
   * `nullFlavor="NI"`) is actually rejected. The validator uses this to warn
   * loudly when the app tries something untested that looks spec-compliant.
   */
  rejectsNullFlavorNI: boolean;
}

export const FAERS_POLICY: Record<string, FieldPolicy> = {
  race: {
    label: 'Patient Race',
    tag: 'FDA.D.11.r.1',
    observationCode: 'C17049',
    rejectsNullFlavorNI: true,
    entries: [
      // FDA-authoritative value set (fda_e2b_r3_core_regional_data_elements_business_rules_v1.6/v1.7.xlsx row 169):
      //   C16352=African American, C41259=American Indian or Alaska Native,
      //   C41260=Asian, C41219=Native Hawaiian or Other Pacific Islander, C41261=White
      // The ICH E2B(R3) IG (D section) does NOT define D.11 — these are FDA regional elements only.
      { value: 'C41260', verdict: 'proven_safe',     evidence: 'v37, 2L8T ACK3 (Asian)' },
      { value: 'C41261', verdict: 'proven_safe',     evidence: 'TC-A01 golden CA+AA (White)' },
      { value: 'C41259', verdict: 'proven_safe',     evidence: 'TC-A02 golden CA+AA (American Indian or Alaska Native per FDA spec); TC-A03 v2 ci260601150309 CA+AA confirmed 2026-06-01.' },
      { value: 'C41219', verdict: 'proven_safe',     evidence: 'TC-A04 v2 ci260601150313 CA+AA confirmed 2026-06-01 (Native Hawaiian or Other Pacific Islander per FDA spec). test/golden/postmarket/accepted/xml/TC-A04-race-hawaiian.xml' },
      { value: 'C16352', verdict: 'proven_safe',     evidence: 'TC-A02b ci260601175051 CA+AA confirmed 2026-06-01 (African American per FDA spec). test/golden/postmarket/accepted/xml/TC-A02b-race-black-c16352.xml' },
      { value: 'C17998', verdict: 'proven_rejected',  evidence: '26ZL ACK3' },
      { value: 'C41257', verdict: 'proven_rejected',  evidence: 'TC-A03 ci260501170657 — "Element value not allowed for tag FDA.D.11.r.1". NOT in FDA value set (test/golden/postmarket/rejected/TC-A03-race-amerindian.{xml,ack})' },
      { value: 'C41258', verdict: 'proven_rejected',  evidence: 'TC-A04 ci260501170706 — "Element value not allowed for tag FDA.D.11.r.1". NOT in FDA value set (test/golden/postmarket/rejected/TC-A04-race-hawaiian.{xml,ack})' },
      // nullFlavor NI is rejected (QTXZ, 2GZK) — captured structurally above.
    ]
  },
  ethnicity: {
    label: 'Patient Ethnicity',
    tag: 'FDA.D.12',
    observationCode: 'C16564',
    // nullFlavor="NI" on the <value> element triggers SAXParseException:
    // "cvc-type.2: The type definition cannot be abstract for element value."
    // Confirmed CR+AR: TC-A06 ci260501170715 (2026-05-01) —
    // test/golden/postmarket/rejected/TC-A06-ethnicity-ni.{xml,ack}.
    rejectsNullFlavorNI: true,
    entries: [
      { value: 'C41222', verdict: 'proven_safe',    evidence: 'v37, 2L8T ACK3' },
      { value: 'C17998', verdict: 'proven_rejected', evidence: '26ZL ACK3' }
    ]
  },
  medicalHistory: {
    label: 'Medical History Text',
    tag: 'D.7.2',
    observationCode: '18',
    rejectsNullFlavorNI: true,
    entries: [
      { value: 'None reported', verdict: 'proven_safe', evidence: '26ZL, 2L8T, v37 ACK3' }
      // Any actual text should be safe; nullFlavor is structurally rejected.
    ]
  },
  c49489Outcome: {
    label: 'C49489 FAERS Outcome',
    tag: 'E.i.7.FAERS',
    observationCode: 'C49489',
    rejectsNullFlavorNI: false,
    entries: [
      { value: '1', verdict: 'proven_safe', evidence: 'v37, 2L8T ACK3' },
      { value: '6', verdict: 'proven_safe', evidence: 'v37, 2L8T ACK3 (E2B-R2 legacy unknown)' }
    ]
  },
  ichOutcome: {
    label: 'ICH Reaction Outcome',
    tag: 'E.i.7',
    observationCode: '27',
    rejectsNullFlavorNI: false,
    entries: [
      { value: '1', verdict: 'proven_safe', evidence: '2L8T ACK3' },
      { value: '3', verdict: 'proven_safe', evidence: 'v37 ACK3' }
    ]
  }
};

/**
 * Classify a value observed in the generated XML against the empirical policy.
 * - `proven_safe`: seen in a prior CA+AA
 * - `proven_rejected`: seen in a prior CR+AR
 * - `untested`: never confirmed either way — caller should either block or
 *    warn, depending on the field's `rejectsNullFlavorNI` signal.
 */
export function classifyValue(field: FieldPolicy, value: string): PolicyVerdict {
  const entry = field.entries.find((e) => e.value === value);
  return entry ? entry.verdict : 'untested';
}

/** All fields the validator should sweep in pass 3. */
export function allPolicyFields(): FieldPolicy[] {
  return Object.values(FAERS_POLICY);
}

// ────────────────────────────────────────────────────────────────────────────
//  Structural / presence rules confirmed empirically (not coded-value checks)
// ────────────────────────────────────────────────────────────────────────────

/**
 * CDER 2.18 requires ALL five reporter address sub-fields to be present.
 * Confirmed by TC-H02 three-round rejection campaign (2026-05-01):
 *   v1 CR+AR — C.3.4.5 (asLocatedEntity) missing → "Data value required for tag C.3.4.5"
 *   v2 CR+AR — asLocatedEntity outside <assignedPerson> → SAXParseException (element order)
 *   v3 CR+AR — street/city/state/postal absent → "Data value required for C.3.4.1/2/3/4"
 *
 * The generator must ALWAYS emit a reporter address with all five fields:
 *   C.3.4.1  <streetAddressLine>  — in <addr>
 *   C.3.4.2  <city>               — in <addr>
 *   C.3.4.3  <state>              — in <addr>
 *   C.3.4.4  <postalCode>         — in <addr>
 *   C.3.4.5  <asLocatedEntity>    — INSIDE <assignedPerson>, NOT after </assignedPerson>
 *
 * A reporter with only a country code (no street address) is not accepted by FAERS 2.18.
 */
export const REPORTER_ADDRESS_ALL_FIELDS_REQUIRED = true;

// ────────────────────────────────────────────────────────────────────────────
//  IND / SUSAR empirical policy
//
//  GAP-IND-001 (2026-04-27) — first real Premarket ACK3 evidence. IND-T01
//  v2 was rejected (CR+AR) with "File sent with AS2 header 'CDER_IND'
//  must have N.1.4 = 'ZZFDATST_PREMKT'". After fixing the receiver, the
//  v3 round-trip on 2026-04-27 returned CA+AE — `batchReceiver` and
//  `msgReceiver` are now `proven_safe`.
//
//  GAP-IND-002 (2026-04-27) — IND-T01 v3 reached the 2.18 business-rule
//  layer and was rejected (CR+AR) for two premarket rules: `FDA.C.5.6.r`
//  is mandatory whenever `FDA.C.5.5a` is populated, and
//  `FDA.E.i.3.2h requiredIntervention` must carry `nullFlavor="NI"`
//  (boolean values are rejected). After both fixes, IND-T01 v4 round-trip
//  on 2026-04-27 returned CA+AE — both fields are `proven_safe`. Note:
//  C.5.6.r exposes a direct FDA rules contradiction for `CDER_IND` —
//  omitting it causes CR+AR ("mandatory when C.5.5a present"), including
//  it causes CA+AE ("invalid for CDER_IND center"). CA+AE is the best
//  achievable outcome and treated as the proven_safe state.
//
//  Promote remaining rows to `proven_safe` / `proven_rejected` as real
//  ACK3s arrive. See `docs/gaps/GAP-IND-001-batch-receiver-premkt.md`,
//  `docs/gaps/GAP-IND-002-business-rules-c56r-required-intervention.md`,
//  and `docs/gaps/GAP-IND-003-death-observation-element-order.md` for the
//  full incident records, plus §5.5 of SUSAR_IND_Feature_Spec for the
//  promotion protocol.
// ────────────────────────────────────────────────────────────────────────────

export interface IndPolicyEntry {
  /** Value we expect to emit for this field, e.g. `'1'` or `'ZZFDATST_PREMKT'`. */
  value: string;
  verdict: PolicyVerdict;
  evidence?: string;
  /**
   * Per-value verdicts, mirroring `FieldPolicy.entries`. Set when a single
   * field has both a proven_safe and proven_rejected value (e.g. C.5.5a's
   * registry has 123456 proven_safe and 999999 proven_rejected per
   * GAP-IND-007). Used by xmlGeneratorService and Pass 3 of the validator
   * to block emission of proven_rejected values.
   */
  entries?: Array<{ value: string; verdict: Exclude<PolicyVerdict, 'untested'>; evidence: string }>;
}

export const IND_POLICY: Record<string, IndPolicyEntry> = {
  indNumber: {
    value: '123456',
    verdict: 'proven_safe',
    evidence: 'T01–T05/T07 all CA+AE; T06 v32 CA+AE ci260429010301 (GAP-IND-007). Only 123456 is registered in the ZZFDATST_PREMKT test registry.',
    entries: [
      {
        value: '123456',
        verdict: 'proven_safe',
        evidence: 'T01–T05/T07 all CA+AE; T06 v32 CA+AE ci260429010301 (GAP-IND-007)'
      },
      {
        value: '999999',
        verdict: 'proven_rejected',
        evidence: 'T06 v29/v30/v31 CR+AR ci260428181215/ci260428205348/ci260428224649 — "FDA.C.5.5a is invalid for the Center" (GAP-IND-007)'
      }
    ]
  },
  studyType:     { value: '1',              verdict: 'untested' },
  typeOfReport:  { value: '2',              verdict: 'untested' },
  drugRoleTest:  { value: '1',              verdict: 'untested' },
  drugRoleRef:   { value: '2',              verdict: 'untested' },
  drugRoleNa:    { value: 'nullFlavor=NA',  verdict: 'untested' },
  batchReceiver: {
    value: 'ZZFDATST_PREMKT',
    verdict: 'proven_safe',
    evidence: 'IND-T01 v4 ACK3 ci260427204838 CA+AE 2026-04-27 (GAP-IND-001 closed). ZZFDA_PREMKT remains proven_rejected for the Test environment by IND-T01 v2.'
  },
  msgReceiver: {
    value: 'CDER_IND',
    verdict: 'proven_safe',
    evidence: 'IND-T01 v4 ACK3 ci260427204838 CA+AE 2026-04-27 — confirmed correct by ACK sender field'
  },
  crossReportedInd: {
    // OPEN-01 CLOSED (2026-05-09): IND_May7 v5 ACK3 round-trip complete.
    // All 7 CA+AE — C.5.6.r warning persists on every case regardless of OID.
    //
    // The May7 surgery stripped OID …2.1.2.3 from T01/T02/T04-T07 entirely and
    // swapped it to …2.1.2.1 for T03. The warning fired on all 7 identically.
    // Conclusion: the warning is triggered by the PRESENCE of the C.5.6.r
    // cross-reference element, not by the OID value. It is a channel-inherent
    // informational warning for CDER_IND submissions — it cannot be suppressed.
    //
    // Correct expected ACK for IND submissions with cross-referenced IND
    // numbers: CA+AE (never CA+AA). T03 correctly fires two warnings (one
    // per cross-ref element), confirming the repeating-element pattern.
    //
    // OID recommendation: revert to standard generator OID — the OID value
    // has no effect on the warning or acceptance outcome.
    value: 'present (any OID); C.5.6.r warning is channel-inherent — cannot be suppressed',
    verdict: 'proven_safe',
    evidence: 'OPEN-01 closed 2026-05-09: IND_May7 v5 7×CA+AE (ci260507054727/37/46/56/806/815/825). OID-stripped and OID-swapped variants both fired C.5.6.r warning identically. Prior evidence: IND-T01..T07 regen #3 portal CA+AE (ci260430003632..4355). Warning is informational only — no rejection path.'
  },
  requiredIntervention: {
    value: 'nullFlavor="NI"',
    verdict: 'proven_safe',
    evidence: 'IND-T01 v4 ACK3 CA+AE 2026-04-27 (GAP-IND-002) — no rejection on this field after fix; boolean value="false" remains proven_rejected for premarket by IND-T01 v3.'
  }
};
