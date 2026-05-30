# FAERS ZZFDATST Test Case Catalog
**For:** Claude Code — DeepQuence FAERS submission workflow  
**Baseline:** CASE-20260421-2L8T (`CA+AA`, ACK `ci260421211040`, April 21 2026)  
**Golden reference:** `package/CASE-20260331-EMJQ_fixed_v37_patch.xml` (`CA+AA`, ACK `ci260410211359`, April 10 2026)  
**Target environment:** ZZFDATST (CDER FAERS AERS TEST)  
**Last updated:** 2026-05-09 — TC-G01 promoted to ACCEPTED (CA+AA ci260501225706; golden confirmed). All 30 postmarket TC scenarios completed: 26 CA+AA, 4 proven-rejected, 0 pending.

---

## 1. Purpose

This catalog specifies test submissions to promote values from **UNTESTED** to **PROVEN ACCEPTED** or **PROVEN REJECTED** in the DeepQuence empirical value policy. Each test case is an isolated, minimal patch on the 2L8T baseline that changes exactly one business-logic field.

The empirical policy is the only reliable guide for this submission environment. General E2B(R3) spec compliance is necessary but not sufficient — the CDER FAERS 2.18 validator applies additional business rules that differ from the spec and can only be confirmed by live ACK3 responses.

---

## 2. Submission Status Summary (as of 2026-05-09)

All 30 postmarket TC scenarios have now been attempted. **26 accepted (CA+AA), 4 proven-rejected data points, 0 pending.**

| Test ID | Description | Status | ACK (decisive) | Result |
|---------|-------------|--------|----------------|--------|
| TC-A01 | Race — White (`C41261`) | ✅ ACCEPTED | ci260429225353 | CA+AA (portal Apr 29) |
| TC-A02 | Race — Black or African American (`C41259`) | ✅ ACCEPTED | ci260501173418 | CA+AA (API May 1) |
| TC-A03 | Race — American Indian or Alaska Native (`C41257`) | ❌ PROVEN REJECTED | ci260501170657 | `Element value not allowed for tag FDA.D.11.r.1` — C41257 not in CDER 2.18 allowed set |
| TC-A04 | Race — Native Hawaiian or Other Pacific Islander (`C41258`) | ❌ PROVEN REJECTED | ci260501170706 | `Element value not allowed for tag FDA.D.11.r.1` — C41258 not in CDER 2.18 allowed set |
| TC-A05 | Ethnicity — Hispanic or Latino (`C17459`) | ✅ ACCEPTED | ci260429225534 | CA+AA (portal Apr 29) |
| TC-A06 | Ethnicity — nullFlavor NI | ❌ PROVEN REJECTED (schema) | ci260501170715 | `SAXParseException: cvc-type.2: type definition cannot be abstract for element value` — schema-level rejection before business rules |
| TC-B01 | Med History — empty `<value xsi:type="ED"/>` | ✅ ACCEPTED | ci260501170724 | CA+AA (API May 1) |
| TC-B02 | Med History — structured narrative text | ✅ ACCEPTED | ci260429225614 | CA+AA (portal Apr 29) |
| TC-C01 | Reporter qualification — code 2 | ✅ ACCEPTED | ci260501170734 | CA+AA (API May 1) |
| TC-C02 | Reporter qualification — code 3 | ✅ ACCEPTED | ci260501170544 | CA+AA (API May 1) |
| TC-D01 | ActionTaken — code 2 (dose reduced) | ✅ ACCEPTED | ci260501170553 | CA+AA (API May 1) |
| TC-D02 | ActionTaken — code 3 (dose increased) | ✅ ACCEPTED | ci260501170743 | CA+AA (API May 1) |
| TC-D03 | ActionTaken — code 5 (not applicable) | ✅ ACCEPTED | ci260501170752 | CA+AA (API May 1) |
| TC-D04 | Dechallenge — code 1 (yes) | ✅ ACCEPTED | ci260501170801 | CA+AA (API May 1) |
| TC-D05 | Two suspect drugs | ✅ ACCEPTED | ci260501170602 | CA+AA (API May 1) |
| TC-D06 | Concomitant drug — ActionTaken code 6 (unknown) | ✅ ACCEPTED | ci260501170810 | CA+AA (API May 1) |
| TC-E01 | Patient weight — absent | ✅ ACCEPTED | ci260501170819 | CA+AA (API May 1) — weight is optional |
| TC-E02 | Patient age — nullFlavor on birthTime | ✅ ACCEPTED | ci260501170828 | CA+AA (API May 1) |
| TC-E03 | Patient sex — Female (`code=2`) | ✅ ACCEPTED | ci260429225656 | CA+AA (portal Apr 29) |
| TC-F01 | Follow-up / amendment (version 3) | ✅ ACCEPTED | ci260501170837 | CA+AA (API May 1) |
| TC-F02 | Combination product indicator — true | ✅ ACCEPTED | ci260501170846 | CA+AA (API May 1) |
| TC-F03 | Local expedited criteria — false | ✅ ACCEPTED | ci260501225648 (v2) | CA+AA (API May 1) — v1 CR+AR for C.1.7.1 code; fix: code `1`→`2` (Non-Expedited AE) |
| TC-F04 | ICH report type — code 2 (study) | ✅ ACCEPTED | ci260501225657 (v2) | CA+AA (API May 1) — v1 CR+AR for missing C.5.4; fix: added `researchStudy` block |
| TC-G01 | Serious reaction — all seriousness BL flags false | ✅ ACCEPTED | ci260501225706 (v2) | CA+AA — all BL flags false accepted; non-serious seriousness block confirmed (golden regenerated 2026-05-08) |
| TC-G02 | Reaction outcome — code 2 (recovering) | ✅ ACCEPTED | ci260501170922 | CA+AA (API May 1) |
| TC-G03 | Reaction outcome — code 4 (recovered with sequelae) | ✅ ACCEPTED | ci260501170931 | CA+AA (API May 1) |
| TC-G04 | Reaction outcome — code 5 (fatal) | ✅ ACCEPTED | ci260501170611 | CA+AA (API May 1) |
| TC-H01 | Additional documents available — true | ✅ ACCEPTED | ci260501170940 | CA+AA (API May 1) |
| TC-H02 | Reporter with country-only address (no street) | ❌ SCENARIO INVALID | ci260501235624 (v3 final) | Three-round CR+AR campaign: CDER 2.18 mandates ALL C.3.4.1–C.3.4.5; no resubmit |
| TC-H03 | Outer org name changed | ✅ ACCEPTED | ci260501170958 | CA+AA (API May 1) |

**Coverage: 26 / 30 accepted, 4 proven rejected (A03, A04, A06, H02-scenario-invalid), 0 pending. All 30 scenarios attempted.**

> For IND/premarket coverage, see **§8** — all 7 IND cases (T01–T07) accepted CA+AE on regen #3 portal (2026-04-29/30) and confirmed again on IND_May7 v5 API batch (2026-05-07, ACK3 received 2026-05-09). Key finding: the C.5.6.r warning is channel-inherent and cannot be suppressed — CA+AE is the correct expected result for all IND submissions with cross-references. IND-T05 confirmed fatal case + D.9.3 autopsy rule; IND-T07 confirmed follow-up report (C.1.9 version=3); IND-T04 confirmed C.5.1.r.1 (NCT) is optional.

---

## 3. Core Rules for Test Generation

1. **One untested change per submission.** Never change two UNTESTED fields simultaneously. If a rejection arrives, you cannot isolate the cause.
2. **All other fields must match the 2L8T baseline exactly**, except the three always-expected updates: batch UUID (must be globally unique), `creationTime`, and `availabilityTime`.
3. **Case ID format:** `CASE-YYYYMMDD-XXXX` where XXXX is a random 4-character alphanumeric suffix. SR-number is `SR-` prepended.
4. **Batch UUID format:** `DeepQuenceTest-YYYYMMDD-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (globally unique, never reused).
5. **Clear all three pre-submission gates before submitting** — zero FAIL / zero errors in each:
    1. `python3 faers_xml_lint.py <file>` — 55-check catalogue.
    2. **In-app 5-pass validator** (`src/main/services/fivePassValidatorService.ts`, also the IPC channel `esg:fivePassValidate` / preload `esgFivePassValidate(caseId)`) — enforces the empirical value policy in `faersEmpiricalPolicy.ts`.
    3. **In-app v37 lint gate** (`xmlLintService.ts`) — runs the same Python lint inside Electron. The file-export handler and the ESG API handler both fail the submission on any error from the 5-pass validator or the lint gate.
6. **Archive the ACK3** to `acks/` (keep the FDA filename). Use the app's **Import ACK** toolbar button (or `ackParserService.parseFdaAck()`) to extract the inner CA/CR, outer AA/AR, and structured rejection tags. Update `faersEmpiricalPolicy.FAERS_POLICY` with the new verdict, then update §3 of this catalog.

---

## 3. Empirical Value Policy (Baseline State — April 21 2026)

This table is the ground truth. Do not change a field marked REJECTED without a specific rationale.

| Field | REJECTED values | ACCEPTED values | Evidence |
|-------|----------------|-----------------|----------|
| Race `C17049` / `FDA.D.11.r.1` | `nullFlavor="NI"`, `C17998`, **`C41257`** (AmericanIndian), **`C41258`** (Hawaiian) | **`C41260`** "Asian", **`C41261`** "White", **`C41259`** "Black" | QTXZ(NI→reject), 26ZL(C17998→reject), v37+2L8T(C41260→accept), **TC-A01(C41261→accept)**, **TC-A02(C41259→accept)**, **TC-A03(C41257→reject)**, **TC-A04(C41258→reject)** |
| Ethnicity `C16564` / `FDA.D.12` | `C17998`, **`nullFlavor="NI"` (schema-rejected)** | **`C41222`** "Not Hispanic or Latino", **`C17459`** "Hispanic or Latino" | 26ZL(C17998→reject), v37+2L8T(C41222→accept), **TC-A05(C17459→accept)**, **TC-A06(NI→SAXParseException)** |
| Med history `code=18` / `D.7.2` | `nullFlavor="NI"` | **`"None reported"`** (text), free-text narrative, **empty `<value xsi:type="ED"/>`** | QTXZ(NI→reject), 26ZL+2L8T("None reported"→accept), v37(narrative→accept), **TC-B02(structured narrative→accept)**, **TC-B01(empty ED→accept)** |
| Patient sex / `D.2` | — | **`code="1"`** (Male), **`code="2"`** (Female) | v37+2L8T(code=1→accept), **TC-E03(code=2→accept)** |
| Patient weight / `D.6` | — | Present (PQ value=82 kg), **absent** | 2L8T(present→accept), **TC-E01(absent→accept — field is optional)** |
| Patient birthTime / `D.3` | — | Explicit date, **`nullFlavor="UNK"`** | 2L8T(explicit→accept), **TC-E02(nullFlavor UNK→accept)** |
| otherCaseIds BL | — | **`nullFlavor="NI"`** | v37+2L8T(NI→accept) |
| Reaction outcome `code=27` | — | **`1`** (recovered), **`2`** (recovering), **`3`** (ongoing), **`4`** (with sequelae), **`5`** (fatal) | 2L8T(code=1→accept), v37(code=3→accept), **TC-G02(code=2→accept)**, **TC-G03(code=4→accept)**, **TC-G04(code=5→accept)** |
| Reaction seriousness (all BL false) | — | All BL false (no serious criterion) | **TC-G01(all-false→accept, ci260501225706)** |
| Reaction hospitalization BL | — | **`true`**, **`false`** | v37(true→accept), 2L8T(false→accept) |
| Reaction otherMedImportant BL | — | **`true`**, **`false`** | v37(true→accept), 2L8T(false→accept) |
| Reaction C49489 Outcome | — | **`1`** (recovered), **`6`** (unknown) | v37(6→accept via Reaction 2), 2L8T(1→accept via Reaction 1) |
| Reporter qualification OID `.1.7` | — | **`code=1`**, **`code=2`**, **`code=3`** | v37+2L8T(code=1→accept), **TC-C01(code=2→accept)**, **TC-C02(code=3→accept)** |
| Drug ActionTaken OID `.1.15` | — | **`1`** (withdrawn), **`2`** (reduced), **`3`** (increased), **`4`** (unchanged), **`5`** (N/A), **`6`** (unknown) | 2L8T(1→accept, 4→accept), **TC-D01(2→accept)**, **TC-D02(3→accept)**, **TC-D03(5→accept)**, **TC-D06(6→accept)** |
| Drug Dechallenge OID `.1.16` | — | **`1`** (yes), **`3`** (N/A) | 2L8T(3→accept), **TC-D04(1→accept)** |
| Multi-suspect drugs | — | **2 suspect drugs + 1 concomitant** | **TC-D05(2 suspects→accept)** |
| Local expedited flag `C.1.7` | — | **`true`** (15-day), **`false`** → `C.1.7.1 code=2` required | 2L8T(true→accept), **TC-F03(false→accept when code=2 Non-Expedited AE)** |
| ICH report type `C.1.3` | — | **`1`** (spontaneous), **`2`** (from study + C.5.4 required) | 2L8T(1→accept), **TC-F04(2→accept when C.5.4 `researchStudy` block present)** |
| Follow-up / version `C.1.9` | — | **`extension="2"`** (initial), **`extension="3"`** (follow-up) | v37+2L8T(2→accept), **TC-F01(3→accept)** |
| Combination product flag `C156384` | — | **`false`**, **`true`** | 2L8T(false→accept), **TC-F02(true→accept)** |
| Additional documents flag `C.1.6.1` | — | **`false`**, **`true`** | 2L8T(false→accept), **TC-H01(true→accept)** |
| Reporter org outer name | — | **`"Drug Safety"`**, **`"Pharmacovigilance"`** | v37+2L8T("Drug Safety"→accept), **TC-H03("Pharmacovigilance"→accept — field is free-text)** |
| Reporter address (C.3.4.1–C.3.4.5) | Country-only (no street/city/state/postal) | **All five fields required** | **TC-H02 3-round rejection — C.3.4.1/2/3/4/5 all mandatory in CDER 2.18** |
| Org structure | flat single-level | **nested 2-level** | v30-v36(flat→C.3.2 fail), v37+2L8T(nested→accept) |

---

## 4. Test Case Catalog

Test cases are grouped by domain and ordered from lowest to highest risk within each group. Submit one at a time. Record the ACK3 result before proceeding to the next.

---

### GROUP A — Race / Ethnicity (FDA.D.11.r.1 / FDA.D.12)

These are the highest-value tests since the race/ethnicity fields have the richest rejection history.

---

#### TC-A01: Race — White

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-A01 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260429225353, regen #4, UUID …d1665431b0f0 |
| **E2B field** | FDA.D.11.r.1 |
| **FAERS rule** | `C17049` observation value |
| **Baseline** | `C41260` "Asian" |
| **Test value** | `C41261` "White" |
| **Risk** | Low — same codeSystem, same structure; only code changes |
| **Hypothesis** | Other specific race codes from `2.16.840.1.113883.3.26.1.1` are accepted |

**XML change** (replace the race `subjectOf2` observation value):
```xml
<!-- BEFORE -->
<value xsi:type="CE" code="C41260" displayName="Asian" codeSystem="2.16.840.1.113883.3.26.1.1"/>

<!-- AFTER -->
<value xsi:type="CE" code="C41261" displayName="White" codeSystem="2.16.840.1.113883.3.26.1.1"/>
```

**Accept criteria:** `typeCode="CA"` + `typeCode="AA"` → promotes `C41261` to PROVEN ACCEPTED.  
**Reject criteria:** Any rejection → `C41261` is PROVEN REJECTED; do not use it in production workflow.

---

#### TC-A02: Race — Black or African American

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-A02 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501173418 (API May 1) |
| **E2B field** | FDA.D.11.r.1 |
| **Baseline** | `C41260` "Asian" |
| **Test value** | `C41259` "Black or African American" |
| **Risk** | Low |
| **Dependency** | Submit after TC-A01 to maintain isolation |

**XML change:**
```xml
<value xsi:type="CE" code="C41259" displayName="Black or African American" codeSystem="2.16.840.1.113883.3.26.1.1"/>
```

---

#### TC-A03: Race — American Indian or Alaska Native

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-A03 |
| **Status** | ❌ **PROVEN REJECTED** — ACK ci260501170657 (API May 1). `Element value not allowed for tag FDA.D.11.r.1`. C41257 is not in the CDER 2.18 allowed set for race. **No resubmission.** |
| **E2B field** | FDA.D.11.r.1 |
| **Baseline** | `C41260` "Asian" |
| **Test value** | `C41257` "American Indian or Alaska Native" |
| **Risk** | Low |

**XML change:**
```xml
<value xsi:type="CE" code="C41257" displayName="American Indian or Alaska Native" codeSystem="2.16.840.1.113883.3.26.1.1"/>
```

---

#### TC-A04: Race — Native Hawaiian or Other Pacific Islander

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-A04 |
| **Status** | ❌ **PROVEN REJECTED** — ACK ci260501170706 (API May 1). `Element value not allowed for tag FDA.D.11.r.1`. C41258 is not in the CDER 2.18 allowed set for race. **No resubmission.** |
| **E2B field** | FDA.D.11.r.1 |
| **Baseline** | `C41260` "Asian" |
| **Test value** | `C41258` "Native Hawaiian or Other Pacific Islander" |
| **Risk** | Low |

**XML change:**
```xml
<value xsi:type="CE" code="C41258" displayName="Native Hawaiian or Other Pacific Islander" codeSystem="2.16.840.1.113883.3.26.1.1"/>
```

---

#### TC-A05: Ethnicity — Hispanic or Latino

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-A05 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260429225534, regen #4, UUID …605bd78f8bd6 |
| **E2B field** | FDA.D.12 |
| **FAERS rule** | `C16564` observation value |
| **Baseline** | `C41222` "Not Hispanic or Latino" |
| **Test value** | `C17459` "Hispanic or Latino" |
| **Risk** | Low — symmetric complement of the proven accepted value |

**XML change:**
```xml
<!-- BEFORE -->
<value xsi:type="CE" code="C41222" displayName="Not Hispanic or Latino" codeSystem="2.16.840.1.113883.3.26.1.1"/>

<!-- AFTER -->
<value xsi:type="CE" code="C17459" displayName="Hispanic or Latino" codeSystem="2.16.840.1.113883.3.26.1.1"/>
```

---

#### TC-A06: Ethnicity — nullFlavor NI  ⚠️ CAUTION

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-A06 |
| **Status** | ❌ **PROVEN REJECTED (schema-level)** — ACK ci260501170715 (API May 1). `SAXParseException: cvc-type.2: The type definition cannot be abstract for element value.` The abstract-type schema error fires before CDER business rules are reached. `nullFlavor="NI"` is categorically unsupported for the ethnicity `<value>` element. **No resubmission.** |
| **E2B field** | FDA.D.12 |
| **Baseline** | `C41222` |
| **Test value** | `nullFlavor="NI"` (no code attribute) |
| **Risk** | **Medium** — race nullFlavor was REJECTED (QTXZ); ethnicity nullFlavor was never tested independently |
| **Note** | Confirmed schema-rejected by TC-A06 ci260501170715. Never use nullFlavor on the ethnicity value element. |

**XML change:**
```xml
<!-- BEFORE -->
<value xsi:type="CE" code="C41222" displayName="Not Hispanic or Latino" codeSystem="2.16.840.1.113883.3.26.1.1"/>

<!-- AFTER -->
<value xsi:type="BL" nullFlavor="NI"/>
```

---

### GROUP B — Med History Representation (D.7.2)

---

#### TC-B01: Med History — Empty String / Blank Text

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-B01 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170724 (API May 1). Empty `<value xsi:type="ED"/>` accepted — med history is optional in CDER 2.18. |
| **E2B field** | D.7.2 |
| **Baseline** | `"None reported"` |
| **Test value** | Empty `<value xsi:type="ED"/>` |
| **Risk** | **Medium** — spec allows empty ED; validator behavior unknown |

**XML change:**
```xml
<!-- BEFORE -->
<value xsi:type="ED">None reported</value>

<!-- AFTER -->
<value xsi:type="ED"/>
```

---

#### TC-B02: Med History — Structured narrative text

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-B02 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260429225614, regen #4, UUID …86a0a3097a90 |
| **E2B field** | D.7.2 |
| **Baseline** | `"None reported"` |
| **Test value** | `"Hypertension (ongoing, controlled with Lisinopril 10mg daily)."` |
| **Risk** | Low — v37 used a full narrative and was accepted; this tests that any non-null, non-NI text is accepted |

**XML change:**
```xml
<value xsi:type="ED">Hypertension (ongoing, controlled with Lisinopril 10mg daily).</value>
```

---

### GROUP C — Reporter Qualification (C.3.1)

These tests probe the OID `.1.7` sender-type value set, which is separate from the reporter qualification value set (OID `.1.6`). Do not use OID `.1.6` — it causes the entire C.3 block to be silently skipped (confirmed: v34 rejection).

---

#### TC-C01: Reporter qualification — code 2

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-C01 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170734 (API May 1). Code=2 (Regulatory authority) accepted by CDER 2.18. |
| **E2B field** | C.3.1 |
| **FAERS rule** | `assignedEntity/code` in `subjectOf1/controlActEvent/author`, OID `.1.7` |
| **Baseline** | `code="1"` |
| **Test value** | `code="2"` |
| **Risk** | **Medium** — the OID `.1.7` value set meaning of code=2 is unconfirmed; could be "consumer", "other healthcare professional", or similar |

**XML change:**
```xml
<!-- BEFORE -->
<code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.7"/>

<!-- AFTER -->
<code code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.7"/>
```

**Note:** If this is rejected with a C.3.1 error, try `code="3"` in TC-C02. The FDA 2.18 ICSR Implementation Guide lists the following for OID `.1.7`: 1=Pharmaceutical company, 2=Regulatory authority, 3=Health professional, 4=Regional pharmacovigilance center, 5=WHO collaborating center for international drug monitoring, 6=Other, 7=Consumer/non-health professional.

---

#### TC-C02: Reporter qualification — code 3 (Health professional)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-C02 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170544 (API May 1). Code=3 (Health professional) accepted. |
| **E2B field** | C.3.1 |
| **Baseline** | `code="1"` |
| **Test value** | `code="3"` |
| **Risk** | Low — code=3 "Health professional" is semantically appropriate for a physician reporter |
| **Dependency** | Submit after TC-C01 |

**XML change:**
```xml
<code code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.7"/>
```

---

### GROUP D — Drug Fields

---

#### TC-D01: ActionTaken — code 2 (dose reduced)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-D01 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170553 (API May 1). |
| **E2B field** | G.k.8 Action taken |
| **FAERS rule** | `C41341` observation value, OID `.1.1.15` |
| **Baseline** | Suspect drug: `code="1"` (drug withdrawn); Concomitant: `code="4"` (dose not changed) |
| **Test value** | Suspect drug: `code="2"` (dose reduced) |
| **Risk** | Low — code=2 is a standard valid action-taken value |

**XML change** (Testdrugimab substanceAdministration only):
```xml
<!-- BEFORE -->
<value xsi:type="CE" code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.15"/>

<!-- AFTER -->
<value xsi:type="CE" code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.15"/>
```

---

#### TC-D02: ActionTaken — code 3 (dose increased)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-D02 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170743 (API May 1). |
| **E2B field** | G.k.8 |
| **Baseline** | Suspect: `code="1"` |
| **Test value** | Suspect: `code="3"` |
| **Risk** | Low |

---

#### TC-D03: ActionTaken — code 5 (not applicable)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-D03 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170752 (API May 1). |
| **E2B field** | G.k.8 |
| **Baseline** | Suspect: `code="1"` |
| **Test value** | Suspect: `code="5"` |
| **Risk** | Low |

---

#### TC-D04: Dechallenge — code 1 (yes)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-D04 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170801 (API May 1). |
| **E2B field** | G.k.9.i.3.1b Dechallenge |
| **FAERS rule** | `C49492` observation value, OID `.1.1.16` |
| **Baseline** | `code="3"` (not applicable / not done) |
| **Test value** | `code="1"` (yes — reaction abated after drug withdrawal) |
| **Risk** | Low |

**XML change** (suspect drug only):
```xml
<!-- BEFORE -->
<value xsi:type="CE" code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.16"/>

<!-- AFTER -->
<value xsi:type="CE" code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.16"/>
```

---

#### TC-D05: Two suspect drugs

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-D05 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170602 (API May 1). Two suspect drugs accepted; multiple drug blocks confirmed valid. |
| **E2B field** | G.k Drug information (multiple) |
| **Baseline** | 1 suspect + 1 concomitant |
| **Test value** | 2 suspect + 1 concomitant |
| **Risk** | **Medium** — adds a second `<subjectOf2 typeCode="SBJ"><organizer code="suspect">` block; element count will increase and deviate from the 296-element baseline |
| **Note** | This test will NOT match the 296-element structural baseline. Lint script element-count check must be updated or bypassed for this test. |

**XML change:** Duplicate the suspect drug `subjectOf2` block and change the drug name (e.g., `Methotrexate`) and indication. Keep both blocks inside `primaryRole`.

---

#### TC-D06: Concomitant drug — ActionTaken code 6 (unknown)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-D06 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170810 (API May 1). Code=6 (unknown) accepted for concomitant drug action. |
| **E2B field** | G.k.8 |
| **Baseline** | Concomitant Lisinopril: `code="4"` |
| **Test value** | `code="6"` (unknown) |
| **Risk** | Low |

---

### GROUP E — Patient Demographics

---

#### TC-E01: Patient weight — absent (no weight subjectOf2)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-E01 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170819 (API May 1). Patient weight is optional in CDER 2.18; omitting the entire weight `subjectOf2` block is accepted. |
| **E2B field** | D.6 |
| **Baseline** | `<observation C25208>` PQ value=82 kg present |
| **Test value** | Remove the entire weight `subjectOf2` block |
| **Risk** | **Medium** — element count drops to 293; may trigger a missing-required-field rejection |

**XML change:** Remove the following block entirely:
```xml
<subjectOf2 typeCode="SBJ">
  <observation classCode="OBS" moodCode="EVN">
    <code code="C25208" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Weight"/>
    <value xsi:type="PQ" value="82" unit="kg"/>
  </observation>
</subjectOf2>
```

---

#### TC-E02: Patient age — nullFlavor on birthTime

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-E02 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170828 (API May 1). `birthTime nullFlavor="UNK"` accepted when explicit age observation (50y) is present. |
| **E2B field** | D.3 Birthdate |
| **Baseline** | `<birthTime value="19750615"/>` |
| **Test value** | `<birthTime nullFlavor="UNK"/>` |
| **Risk** | Medium — age is calculable from the explicit age observation (50y); validator may accept the derived age and ignore the missing birthdate |

**XML change:**
```xml
<!-- BEFORE -->
<birthTime value="19750615"/>

<!-- AFTER -->
<birthTime nullFlavor="UNK"/>
```

---

#### TC-E03: Patient sex — Female

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-E03 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260429225656, regen #4, UUID …5c06943de804 |
| **E2B field** | D.2 |
| **Baseline** | `code="1"` (Male) |
| **Test value** | `code="2"` (Female) |
| **Risk** | Low — sex is a factual field, no consistency rules expected |

**XML change:**
```xml
<!-- BEFORE -->
<administrativeGenderCode code="1" displayName="Male" codeSystem="1.0.5218"/>

<!-- AFTER -->
<administrativeGenderCode code="2" displayName="Female" codeSystem="1.0.5218"/>
```

---

### GROUP F — Case-Level Fields

---

#### TC-F01: Follow-up / amendment (version 3)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-F01 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170837 (API May 1). Follow-up report (`extension="3"`) targeting the 2L8T baseline case accepted on the postmarket channel. |
| **E2B field** | C.1.9 Case version |
| **Baseline** | `id[@root='.3.4'] extension="2"` (initial report) |
| **Test value** | `extension="3"` |
| **Risk** | **High** — a follow-up requires the same `C.1.1` SR-number as a prior accepted case. Must reference a case that already received CA. Use `SR-CASE-20260421-2L8T` as the target. |
| **Dependency** | Must use the 2L8T case IDs (`SR-CASE-20260421-2L8T`). Do not change the case ID roots, only bump version to 3. |

**XML change:**
```xml
<!-- BEFORE -->
<id root="2.16.840.1.113883.3.989.2.1.3.4" extension="2"/>

<!-- AFTER -->
<id root="2.16.840.1.113883.3.989.2.1.3.4" extension="3"/>
```

Also update `outboundRelationship/relatedInvestigation/code` to reflect follow-up type:
```xml
<!-- BEFORE (initial report) -->
<code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="initialReport"/>

<!-- AFTER (follow-up) -->
<code code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="followUpReport"/>
```

---

#### TC-F02: Combination product indicator — true

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-F02 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170846 (API May 1). Setting `combinationProductReport=true` accepted with no additional required fields triggered. |
| **E2B field** | C156384 |
| **Baseline** | `<value xsi:type="BL" value="false"/>` |
| **Test value** | `value="true"` |
| **Risk** | Low — this is a BL flag; combination product cases may require additional fields but the BL toggle itself should be safe |

**XML change:**
```xml
<!-- BEFORE -->
<observationEvent classCode="OBS" moodCode="EVN">
  <code code="C156384" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Combination Product Report Indicator"/>
  <value xsi:type="BL" value="false"/>
</observationEvent>

<!-- AFTER -->
<observationEvent classCode="OBS" moodCode="EVN">
  <code code="C156384" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Combination Product Report Indicator"/>
  <value xsi:type="BL" value="true"/>
</observationEvent>
```

---

#### TC-F03: Local expedited criteria — false (non-expedited)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-F03 |
| **Status** | ✅ **ACCEPTED** (v2) — CA+AA, no warnings. ACK ci260501225648. v1 CR+AR (ci260501170855): FDA requires `FDA.C.1.7.1 = Non Expedited AE (Periodic)` when `C.1.7=false`. Fix: `localCriteriaReportType code="1"→code="2" displayName="Non-Expedited AE"`. v2 accepted. **Generator bug fixed in xmlGeneratorService.ts.** |
| **E2B field** | C.1.7 |
| **Baseline** | `localCriteriaForExpedited value="true"` + `localCriteriaReportType code="1"` (15-Day) |
| **Test value** | `localCriteriaForExpedited value="false"` + `localCriteriaReportType code="2"` (Non-Expedited AE) |
| **Risk** | **Medium** — validator may require localCriteriaReportType to be absent when expedited=false, or may require it to be present with a specific code. Both behaviors are untested. |

**XML change:**
```xml
<!-- BEFORE -->
<observationEvent classCode="OBS" moodCode="EVN">
  <code code="23" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="localCriteriaForExpedited"/>
  <value xsi:type="BL" value="true"/>
</observationEvent>
<observationEvent classCode="OBS" moodCode="EVN">
  <code code="C54588" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="localCriteriaReportType"/>
  <value xsi:type="CE" code="1" codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.1.1" displayName="15-Day"/>
</observationEvent>

<!-- AFTER — set expedited=false, remove report type -->
<observationEvent classCode="OBS" moodCode="EVN">
  <code code="23" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="localCriteriaForExpedited"/>
  <value xsi:type="BL" value="false"/>
</observationEvent>
```

Note: removing the `localCriteriaReportType` block drops element count by 3. If the validator rejects for missing field, add it back with `nullFlavor="NI"` on the value.

---

#### TC-F04: ICH report type — code 2 (study)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-F04 |
| **Status** | ✅ **ACCEPTED** (v2) — CA+AA, no warnings. ACK ci260501225657. v1 CR+AR (ci260501170904): FDA requires `C.5.4 researchStudy` when `C.1.3=2`. Fix: Added minimal `<researchStudy classCode="CLNTRL" moodCode="EVN"><code code="1" displayName="Clinical trials"/>` block. **Generator fixed in xmlGeneratorService.ts.** |
| **E2B field** | N.1.1 / ICH report type |
| **FAERS rule** | `investigationCharacteristic[code=1]` value |
| **Baseline** | `code="1"` (Spontaneous report) |
| **Test value** | `code="2"` (Report from study) + required `C.5.4 researchStudy` block |
| **Risk** | **High** — report type 2 may require additional study-specific fields (protocol number, etc.) that are absent in the current XML. Likely to reject if those fields are missing. |

**XML change:**
```xml
<!-- BEFORE -->
<value xsi:type="CE" code="1" displayName="Spontaneous report" codeSystem="2.16.840.1.113883.3.989.2.1.1.2"/>

<!-- AFTER -->
<value xsi:type="CE" code="2" displayName="Report from study" codeSystem="2.16.840.1.113883.3.989.2.1.1.2"/>
```

---

### GROUP G — Reaction Seriousness Combinations

These tests validate whether the CDER 2.18 validator cross-checks seriousness criteria against outcome codes.

---

#### TC-G01: Serious reaction — all BL flags false (no seriousness criterion true)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-G01 |
| **Status** | ✅ **ACCEPTED** — CA+AA, ACK ci260501225706 (v2, API May 1). v1 CR+AR (ci260501170913): `FDA.C.1.7.1` bug — same fix as TC-F03 (code=2 Non-Expedited AE). v2 confirmed CA+AA. Golden regenerated 2026-05-08 (both reactions emit `otherMedicallyImportant` seriousness summary — internally consistent). |
| **E2B field** | E.i.3.1–E.i.3.6 seriousness criteria |
| **Baseline** | Reaction 1: otherMedImportant=true. Reaction 2: hospitalization=true |
| **Test value** | All 6 seriousness BL flags set to false for Reaction 1 (remove serious classification) |
| **Risk** | **Medium** — a non-serious reaction has no `C83121` seriousness value. Must also remove the `C83121` outboundRelationship block. Element count drops by 3. |

**XML change:** For Reaction 1, set all 6 BL flags (resultsInDeath, isLifeThreatening, requiresInpatientHospitalization, resultsInPersistentOrSignificantDisability, congenitalAnomalyBirthDefect, otherMedicallyImportantCondition) to `false`, and remove the `C83121` observation block entirely.

---

#### TC-G02: Reaction outcome — code 2 (recovering / resolving)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-G02 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170922 (API May 1). Outcome code=2 (recovering/resolving) accepted. |
| **E2B field** | E.i.7 outcome |
| **Baseline** | Reaction 1: `code="1"` (recovered), Reaction 2: `code="3"` (ongoing) |
| **Test value** | Reaction 1: `code="2"` (recovering/resolving) |
| **Risk** | Low |

**XML change:**
```xml
<value xsi:type="CE" code="2" displayName="recovering/resolving" codeSystem="2.16.840.1.113883.3.989.2.1.1.11"/>
```

---

#### TC-G03: Reaction outcome — code 4 (recovered with sequelae)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-G03 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170931 (API May 1). Outcome code=4 (recovered with sequelae) accepted. |
| **E2B field** | E.i.7 |
| **Baseline** | Reaction 1: `code="1"` |
| **Test value** | `code="4"` |
| **Risk** | Low |

---

#### TC-G04: Reaction outcome — code 5 (fatal)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-G04 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170611 (API May 1). Fatal outcome (`code=5`) with `resultsInDeath=true` and patient death date present accepted on postmarket channel. Confirms IND-T05 finding applies equally to postmarket. |
| **E2B field** | E.i.7 |
| **Baseline** | `code="1"` |
| **Test value** | `code="5"` + `resultsInDeath=true` + patient death date |
| **Risk** | **Medium** — a fatal outcome may require `resultsInDeath=true` and potentially a patient death date. Without those, the validator may reject for internal inconsistency. |

If submitting TC-G04, also set `resultsInDeath=true` for that reaction and add a death date observation if required. This makes it a two-field change — acceptable since the changes are logically coupled (fatal outcome must pair with death flag).

---

### GROUP H — Structural Variants  ⚠️ HIGH RISK

These tests deviate from the confirmed element structure. They are valuable but carry higher risk of SAX exceptions.

---

#### TC-H01: Additional documents available — true

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-H01 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170940 (API May 1). `additionalDocumentsAvailable=true` accepted; no additional document reference blocks required. |
| **E2B field** | C.1.6.1 |
| **Baseline** | `code="1"` BL `value="false"` |
| **Test value** | `value="true"` |
| **Risk** | Low — BL toggle, no structural change |

---

#### TC-H02: Reporter with country-only address (no street-level fields)

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-H02 |
| **Status** | ❌ **SCENARIO INVALID** — Three-round CR+AR campaign (ci260501170949, ci260501225715, ci260501235624) confirms: **CDER 2.18 mandates ALL five reporter address sub-fields (C.3.4.1–C.3.4.5).** A reporter with country-only is categorically not supported. **No resubmission.** |
| **E2B field** | C.3.4.1–C.3.4.5 |
| **Finding** | All of `streetAddressLine` (C.3.4.1), `city` (C.3.4.2), `state` (C.3.4.3), `postalCode` (C.3.4.4), and `asLocatedEntity` country (C.3.4.5) are required. The generator now enforces this via a validation error if any field is absent. |
| **Original test intent** | Remove `asLocatedEntity` block entirely — redesigned into "country-only reporter" to test the minimum address requirement |

---

#### TC-H03: Outer org name changed

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-H03 |
| **Status** | ✅ **ACCEPTED** — CA+AA, no warnings. ACK ci260501170958 (API May 1). Reporter outer org name `"Pharmacovigilance"` accepted — confirms the field is free-text, not a required literal. |
| **E2B field** | C.3.3.5 Reporter organisation |
| **Baseline** | Outer org name: `"Drug Safety"` |
| **Test value** | Outer org name: `"Pharmacovigilance"` |
| **Risk** | **Medium** — the outer org name "Drug Safety" has been present in every CA+AA submission. Its role is unclear (department label vs. required literal). |

---

## 5. Recommended Submission Order

Submit in this order to maximise learning rate while minimising risk:

1. TC-A01 (Race White) — quick win, low risk
2. TC-A02 (Race Black) — follow on
3. TC-A05 (Ethnicity Hispanic) — symmetric to proven accepted
4. TC-E03 (Sex Female) — trivial field change
5. TC-B02 (Med history structured text) — extends proven-safe free text
6. TC-D01 (ActionTaken code 2) — common clinical scenario
7. TC-D04 (Dechallenge code 1) — common clinical scenario
8. TC-G02 (Outcome recovering) — fills outcome code gap
9. TC-G03 (Outcome with sequelae) — fills outcome code gap
10. TC-C01 (Reporter qual code 2) — medium risk, important for app
11. TC-C02 (Reporter qual code 3) — follow on
12. TC-F01 (Follow-up report v3) — important workflow; do after a few CA+AAs
13. TC-A06 (Ethnicity NI) — expected to reject; confirms policy
14. TC-A03, TC-A04 (remaining race codes)
15. TC-D05 (Two suspect drugs) — structural change, submit last in group
16. TC-H01, TC-H02, TC-H03 — structural risk, submit after all others

---

## 6. Code Generation Guidance for Claude Code

When generating a test submission XML:

```python
# Pseudo-code for test case generation
def generate_test_xml(test_case_id, baseline_xml_path, changes):
    """
    baseline_xml_path: 'from_app/CASE-20260421-2L8T.xml'
    changes: dict of xpath -> new_value
    Returns: path to new XML file
    """
    import uuid, datetime
    
    # Always-required updates
    new_case_suffix = generate_random_4char_alphanum()
    new_date = datetime.date.today().strftime('%Y%m%d')
    new_uuid = str(uuid.uuid4())
    
    case_id = f"CASE-{new_date}-{new_case_suffix}"
    sr_id = f"SR-{case_id}"
    batch_id = f"DeepQuenceTest-{new_date}-{new_uuid}"
    creation_ts = datetime.datetime.now().strftime('%Y%m%d%H%M%S') + '-0700'
    
    # Apply changes dict on top of baseline
    # Write to: f"from_app/{case_id}_{test_case_id}.xml"
    # Run lint: assert lint_passes(output_path)
    
    return output_path
```

**Pre-submission gates:** run all three in this order — (1) `python3 faers_xml_lint.py <output_path>`, (2) in-app 5-pass validator (via `esgFivePassValidate(caseId)` IPC), (3) the same Python lint re-run inside Electron via `xmlLintService.lintE2bXml(xml)`. Gates 2 and 3 already run automatically in the submission code path (`submission.handlers.ts::XML_EXPORT_FDA` and `esgSubmissionService.ts`); the Python lint is kept as a sanity check for ad-hoc XML generation outside the app.

**ACK archiving:** After receiving ACK3, copy to `acks/` keeping the FDA filename. Open the **Import ACK** dialog (toolbar) and parse — or call `ackParserService.parseFdaAck(xml)` directly. Update `FAERS_POLICY` in `faersEmpiricalPolicy.ts` with the new evidence, then update §3 of this catalog and the empirical policy table in `CLAUDE_CODE_SESSION_HANDOFF_2L8T.md`.

---

## 7. Policy Table Update Protocol

After each ACK3:

1. **Update the in-app policy** (`src/main/services/faersEmpiricalPolicy.ts`). This is the source of truth enforced by the pre-submission validator.
    ```ts
    // Example: adding a new proven-safe race code after TC-A01 was accepted.
    race: {
      // ...
      entries: [
        { value: 'C41260', verdict: 'proven_safe', evidence: 'v37, 2L8T ACK3' },
        { value: 'C41261', verdict: 'proven_safe', evidence: 'TC-A01 CA+AA CASE-YYYYMMDD-XXXX' },
        { value: 'C17998', verdict: 'proven_rejected', evidence: '26ZL ACK3' },
      ]
    }
    ```
2. **Update §3 of this catalog** (the baseline table).
3. **Update §6 of `CLAUDE_CODE_SESSION_HANDOFF_2L8T.md`** with the new evidence.
4. **Re-run the 5-pass validator tests** (`npx vitest run src/main/services/fivePassValidatorService.test.ts`) to confirm the new policy doesn't break existing fixtures.

If a value is rejected, add it with `verdict: 'proven_rejected'` and the case ID as evidence. The validator will now block any future submission that tries to reuse it.

---

---

## 8. IND / Premarket Test Cases (ZZFDATST_PREMKT / CDER_IND channel)

All 7 IND test cases have been confirmed accepted CA+AE across two independent submission rounds:

- **Regen #3 portal** (2026-04-29/30): 7 × CA+AE via AERS_PREMKT_CDER portal
- **IND_May7 v5 API batch** (2026-05-07, ACK3 received 2026-05-09): 7 × CA+AE via `submit_batch.py` with C.5.6.r OID surgery applied

**OPEN-01 CLOSED (2026-05-09):** The May7 batch tested whether stripping OID `…2.1.2.3` from the cross-reference element (T01/T02/T04–T07) or swapping it to `…2.1.2.1` (T03) would suppress the C.5.6.r warning. It did not — the warning fires on all 7 identically regardless of OID. **Conclusion: the C.5.6.r warning is channel-inherent (triggered by presence of the cross-reference element, not by OID value) and cannot be suppressed. CA+AE is the correct and final expected ACK for all IND submissions carrying cross-referenced IND numbers.** `IND_POLICY.crossReportedInd` promoted to `proven_safe`.

| Test ID | Description | ACK regen #3 (portal) | ACK May7 v5 (API) | Result | Key Finding |
|---------|-------------|----------------------|-------------------|--------|-------------|
| IND-T01 | SUSAR baseline | ci260430003632 | ci260507054727 | ✅ CA+AE ⚠️ | Baseline IND/SUSAR structure confirmed; C.5.6.r warning channel-inherent; local msg 769811 |
| IND-T02 | SUSAR repeat submission | ci260430003735 | ci260507054737 | ✅ CA+AE ⚠️ | Repeat SUSAR accepted; two-positive-ACK rule confirmed; local msg 769812 |
| IND-T03 | Cross-reference IND numbers (`FDA.C.5.6.r` ×2) | ci260430003832 | ci260507054746 | ✅ CA+AE ⚠️⚠️ | **Two C.5.6.r warnings** (one per cross-ref); OID swap made no difference — warning is element-presence-driven; local msg 769813 |
| IND-T04 | No study registration number (`C.5.1.r.1` absent) | ci260430003937 | ci260507054756 | ✅ CA+AE ⚠️ | **C.5.1.r.1 (NCT number) confirmed optional**; local msg 769814 |
| IND-T05 | Fatal case + 7-day reporting | ci260430004212 | ci260507054806 | ✅ CA+AE ⚠️ | **Fatal outcome + D.9.3 autopsy co-dependency confirmed** (business rule 2.18); 7-day auto-derivation validated; local msg 769815 |
| IND-T06 | BABE test reference (`C.5.5a=123456`) | ci260430004305 | ci260507054815 | ✅ CA+AE ⚠️ | Registry reference `C.5.5a=123456` confirmed; local msg 769817 |
| IND-T07 | Follow-up report (`C.1.9` version=3) | ci260430004355 | ci260507054825 | ✅ CA+AE ⚠️ | **Follow-up report structure confirmed** — `C.1.9 extension="3"` + `relatedInvestigation` accepted; local msg 769816 |

### What the IND results prove for the postmarket policy

| Finding | Postmarket implication | Action needed |
|---------|----------------------|---------------|
| Fatal outcome + D.9.3 autopsy required (T05) | Same business rule 2.18 applies on postmarket channel — D.9.1 and D.9.3 must both be present | ✅ **TC-G04 confirmed CA+AA** (ci260501170611) — fatal reaction outcome `code=5` accepted on postmarket channel |
| Follow-up report C.1.9 version=3 accepted (T07) | Follow-up mechanism works end-to-end | ✅ **TC-F01 confirmed CA+AA** (ci260501170837) — follow-up version=3 accepted on postmarket channel |
| C.5.1.r.1 (NCT) optional (T04) | IND-only field; no postmarket equivalent | No postmarket action needed |
| C.5.6.r cross-reference accepted (T03) | IND-only field; no postmarket equivalent | No postmarket action needed |
| SUSAR repeat accepted (T02) | Confirms duplicate detection does not fire on same case ID with new UUID | Reinforces ISSUE-003 prevention rule |

### IND channel notes

- **Portal admin decline (ISSUE-004):** All 7 IND cases received valid CA+AE ICSR ACKs. However, early submissions for T02 and T05 received separate ESG portal administrative decline emails (independent of the XML ACK). This is an account enrollment issue — email **AEMSESUB@fda.hhs.gov** to resolve. The XML content is confirmed correct.
- **C.5.6.r boilerplate warning:** Present on all CDER_IND submissions. Informational only; no action required. **Confirmed channel-inherent (OPEN-01, 2026-05-09):** stripping the OID or swapping it to `…2.1.2.1` made no difference — the warning fires on the presence of the cross-reference element, not the OID value.
- **Local message numbers assigned:** 769811 (T01), 769812 (T02), 769813 (T03), 769814 (T04), 769815 (T05), 769817 (T06), 769816 (T07).
- **IND_May7 v5 API batch core IDs:** ci260507054727 (T01), ci260507054737 (T02), ci260507054746 (T03), ci260507054756 (T04), ci260507054806 (T05), ci260507054815 (T06), ci260507054825 (T07). ACK3 files archived at `test/test_submission/acks/ACK3/May7/`.

---

*End of catalog. Total postmarket test cases defined: 30. All 30 completed. Accepted: 26 (TC-A01, TC-A02, TC-A05, TC-B01, TC-B02, TC-C01, TC-C02, TC-D01–D06, TC-E01–E03, TC-F01–F04, TC-G01–G04, TC-H01, TC-H03). Proven rejected: 4 (TC-A03, TC-A04, TC-A06, TC-H02-scenario-invalid). Pending ACK3: 0. IND test cases defined: 7. All 7 accepted CA+AE — confirmed on regen #3 portal (2026-04-29/30) and IND_May7 v5 API batch (2026-05-07, ACK3 received 2026-05-09). Combined confirmed coverage: 37/37 scenarios attempted; 33/37 accepted (26 postmarket CA+AA + 7 IND CA+AE); 4 proven rejected. Regression suite: 35/36 PASS, 1 permanent skip (TC-A06 schema rejection). [Catalog last updated 2026-05-09 — TC-G01 promoted to ACCEPTED; OPEN-01 closed; all pending items resolved.]*
