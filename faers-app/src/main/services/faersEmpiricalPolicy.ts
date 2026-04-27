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
      { value: 'C41260', verdict: 'proven_safe', evidence: 'v37, 2L8T ACK3' },
      { value: 'C17998', verdict: 'proven_rejected', evidence: '26ZL ACK3' },
      // nullFlavor NI is rejected (QTXZ, 2GZK) — captured structurally above.
    ]
  },
  ethnicity: {
    label: 'Patient Ethnicity',
    tag: 'FDA.D.12',
    observationCode: 'C16564',
    rejectsNullFlavorNI: false, // untested directly for this field
    entries: [
      { value: 'C41222', verdict: 'proven_safe', evidence: 'v37, 2L8T ACK3' },
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
//  IND / SUSAR empirical policy
//
//  GAP-IND-001 (2026-04-27) provided the first real ACK3 evidence on the
//  Premarket pathway. The IND-T01 submission was rejected (CR + AR) with
//  the FDA error "File sent with AS2 header 'CDER_IND' must have
//  N.1.4 = 'ZZFDATST_PREMKT'". That promotes `batchReceiver` from
//  `untested` to a known wrong value (recorded as the rejection evidence
//  on the entry itself) and leaves the new correct value `ZZFDATST_PREMKT`
//  awaiting confirmation from the next round-trip. CDER_IND drew no
//  rejection in the same ACK so msgReceiver stays untested-but-uncontested.
//
//  Promote remaining rows to `proven_safe` / `proven_rejected` as real
//  ACK3s arrive. See `docs/gaps/GAP-IND-001-batch-receiver-premkt.md`
//  for the full incident record and §5.5 of SUSAR_IND_Feature_Spec for
//  the promotion protocol.
// ────────────────────────────────────────────────────────────────────────────

export interface IndPolicyEntry {
  /** Value we expect to emit for this field, e.g. `'1'` or `'ZZFDATST_PREMKT'`. */
  value: string;
  verdict: PolicyVerdict;
  evidence?: string;
}

export const IND_POLICY: Record<string, IndPolicyEntry> = {
  indNumber:     { value: '<required>',     verdict: 'untested' },
  studyType:     { value: '1',              verdict: 'untested' },
  typeOfReport:  { value: '2',              verdict: 'untested' },
  drugRoleTest:  { value: '1',              verdict: 'untested' },
  drugRoleRef:   { value: '2',              verdict: 'untested' },
  drugRoleNa:    { value: 'nullFlavor=NA',  verdict: 'untested' },
  batchReceiver: {
    value: 'ZZFDATST_PREMKT',
    verdict: 'untested',
    evidence: 'ZZFDA_PREMKT proven_rejected by IND-T01 ACK3 2026-04-27 (GAP-IND-001); ZZFDATST_PREMKT is the FDA-required value for Test environment and awaits its own round-trip confirmation'
  },
  msgReceiver:   { value: 'CDER_IND',       verdict: 'untested' }
};
