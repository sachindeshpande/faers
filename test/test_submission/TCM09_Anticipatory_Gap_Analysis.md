# TC-M09 Anticipatory Gap Analysis
**File:** CASE-20260523-MEGA5_v9.xml  
**SR-ID:** SR-CASE-20260527-MEGA5v9  
**Local Case:** #806787  
**Submission Status:** Accepted CA+AA  
**Analysis Date:** 2026-05-27  
**Analyst:** Claude Sonnet 4.6 (automated programmatic + manual review)  
**Purpose:** Identify every remaining gap Deepak Nelivigi may flag in next review cycle

---

## Severity Calibration

Because TC-M09 was accepted CA+AA, all issues that survived to acceptance are by definition not automatic rejections. Severity is assigned based on:
- **High (Rejection Risk)**: Schema violation or business rule that was previously flagged with CR+AR for this specific issue. None confirmed for TC-M09.
- **Medium (Reviewer Concern)**: Structural deviation from all FDA reference scenarios; would appear in a detailed review comment letter.
- **Low (Minor Concern)**: Encoding inconsistency or missing optional field; likely to appear as a comment but not a formal deficiency.
- **Very Low (Cosmetic)**: Informational or display-only issue; unlikely to appear in any review.

---

## Executive Summary Table

| ID | Section | Finding | Severity | Rejection Risk |
|----|---------|---------|----------|----------------|
| GAP-S05 | G.k.1 | Drug characterization via `organizer code='suspect'` instead of `causalityAssessment code=20` as used in all 6 FDA reference scenarios | Medium | No — accepted CA+AA; reviewer concern for TCM10 |
| GAP-V05 | G.k | No UUID (`id root`) on main `substanceAdministration` elements — required for `causalityAssessment/subject2/productUseReference` cross-reference | Medium | No — but blocks correct GAP-S05 fix |
| GAP-F03 | G.k.9 | `causalitySource` (code=39) absent for both suspect drugs — present 4 times in Scenario6 | Medium | No — reviewer concern |
| GAP-V10 | E.i | Extra NCIt-coded seriousness/outcome blocks (C83121, C49489) use free-text codes in E2B OID `.19` value — non-standard | Medium | No — survives CA+AA but structurally wrong |
| NEW-GAP-02 | E.i | Same NCIt C83121 blocks: `value code="requiresInpatientHospitalization"` and `"otherMedicallyImportant"` using E2B OID `.19` — that OID's values are numeric only | Low | No |
| GAP-V07 | C.1.7.1 | Remedial action field absent despite `C.1.12=true` (combination product) | Low | No |
| GAP-V12 | H.3.r | H.3.r author code=1 displayName=`"primaryReporter"` — code 1 in OID `.21` means `"sender"`, display mismatch | Low | No |
| NEW-GAP-03 | Header | XML comment still says `TC-M08-v8` (copy-paste error from prior version) | Very Low | No |
| NEW-GAP-01 | N.2.r | PORR `sender` block has 3 IDs (OIDs `.3.11`, `.3.13`, `1.3.6.1.4.1.519.1`) — FDA scenarios show only `.3.11` | Very Low | No |
| GAP-V01 | C.1.8.1 | NCIt `C54588` used for `localCriteriaReportType` code element — CONFIRMED matches Scenario6 pattern | Closed — Not a gap | N/A |
| GAP-V11 | G.k.10.1 | FDA Specialized Product Category C94031 present and correctly encoded | Closed — Not a gap | N/A |

---

## Previously Fixed — Confirmed Not Present (do not re-flag)

The following six fixes from TC-M08 to TC-M09 are verified as fully applied:

1. **D.2.2a age OID**: `code=3 codeSystem=2.16.840.1.113883.3.989.2.1.1.19` — VERIFIED CORRECT
2. **D.3 weight OID**: `code=4 codeSystem=2.16.840.1.113883.3.989.2.1.1.19` — VERIFIED CORRECT
3. **PIVL_TS period**: `<period value="14" unit="d"/>` — VERIFIED CORRECT
4. **H.2 block**: `observationEvent code=10` at `investigationEvent/component` level with `author code=3 sourceReporter` — VERIFIED CORRECT
5. **F.r Tests 2+3 LOINC**: Promoted to primary code element with MedDRA as `<translation>` — VERIFIED CORRECT (LOINC `1975-2` and `8339-4` as primary codes)
6. **C.2.r SPRT code=2**: Present with `priorityNumber=1`, `asQualifiedEntity OID .1.1.6`, full name/addr/telecom — VERIFIED CORRECT

---

## Section-by-Section Detailed Findings

### Section 1: N-Batch Header (N.1.x / N.2.r.x)

**Finding: Extra sender IDs in PORR block (NEW-GAP-01)**

TC-M09 PORR `sender` element contains three `id` elements:
```xml
<id root="2.16.840.1.113883.3.989.2.1.3.11" extension="334818134"/>  <!-- N.2.r.2 standard -->
<id root="2.16.840.1.113883.3.989.2.1.3.13" extension="334818134"/>  <!-- extra -->
<id root="1.3.6.1.4.1.519.1" extension="334818134"/>                 <!-- extra - DEA/NPI-like -->
```

All FDA reference scenarios (S1, S6, S7) use only the `.3.11` OID for N.2.r.2. The `.3.13` OID is defined as the "Receiver Routing ID" in the E2B IG. Its placement on the sender is non-standard. The `1.3.6.1.4.1.519.1` OID does not appear in any FDA scenario. Since CA+AA was granted this is unlikely to be raised, but it is structurally inconsistent.

**Risk: Very Low**

**Finding: XML version comment references TC-M08 (NEW-GAP-03)**

Line 3 of the XML comment block reads:
```xml
<!-- TC-M08-v8: LOINC Lab Fix ...  -->
```

This is a copy-paste artifact from the previous version. The SR-ID and file name are correct (TC-M09 / v9), but the inline comment is misleading and could confuse a human reviewer auditing the file.

**Risk: Very Low — cosmetic**

---

### Section 2: C.1 Report Header Fields

**C.2.r completeness (CONFIRMED COMPLETE)**

The C.2.r block (SPRT code=2, `sourceReport`) is fully populated:
- `priorityNumber value="1"` — present
- Full name (`prefix`, `given`, `family`) — present
- Address (street, city, state, postal, country) — present
- Three `telecom` elements (tel, fax, email) — present
- `representedOrganization` — present
- `asQualifiedEntity code=1 codeSystem=.1.1.6` (Physician) — present

No gap here.

**C.1.7.1 Remedial Action — GAP-V07 (CONFIRMED STILL PRESENT)**

TC-M09 has `C.1.12=true` (`C156384`, combination product indicator) and `C.1.7=true` (`code=23`, localCriteriaForExpedited). The FDA business rules specify that when C.1.12 is `true`, `C.1.7.1` (the local expedited criteria report type code) must be present. TC-M09 does include a `C.1.8.1` / `localCriteriaReportType` element (NCIt C54588, value code=1 "15-Day"), which addresses the more basic typing. However, no separate `remedialAction` element is encoded. The distinction between C.1.7.1 and the remedial action field may have been the original concern. Since no rejection occurred, risk remains low.

**Risk: Low**

**C.1.8.1 OID — GAP-V01 (CLOSED — NOT A GAP)**

TC-M09 uses `code code="C54588" codeSystem="2.16.840.1.113883.3.26.1.1"` for the `localCriteriaReportType` element. Python verification confirms Scenario6 (the mega reference file) uses exactly the same pattern. This is therefore the correct FDA-accepted encoding.

```
CONFIRMED: C54588 in NCIt OID for localCriteriaReportType = standard pattern per S6.
```

---

### Section 3: D — Patient Data

**D.6.r Race/Ethnicity OIDs (CONFIRMED CORRECT)**

TC-M09 uses:
- Race: `code="C17049" codeSystem="2.16.840.1.113883.3.26.1.1"` with value `code="C41260"` (Asian)
- Ethnicity: `code="C16564" codeSystem="2.16.840.1.113883.3.26.1.1"` with value `code="C41222"` (Not Hispanic or Latino)

Scenario1 and Scenario7 use exactly this same pattern. This is correct.

**D.7.1.r Medical History Structure (CONFIRMED ADEQUATE)**

The neonate's medical history organizer contains:
- MedDRA-coded observation for "Premature baby" (10036585, version 25.0) with `effectiveTime/low` start date and `continuing=false`
- MedDRA-coded observation for maternal "Rheumatoid arthritis" (10039073) as family history with `familyHistory=true` and `continuing=true`
- Free text (code=18)
- Concomitant therapy flag (code=11)

Required sub-fields D.7.1.r.1a/b (MedDRA version + code), D.7.1.r.2 (start date), D.7.1.r.3 (continuing) are all present for each structured entry. No structural gap detected.

**D.8.r Surgical Procedures**

No D.8.r element present. Per the XML comment, this is intentional ("neonate has no prior drug history"). No gap; absence is clinically appropriate for a neonate.

**D.10 Parent Data (CONFIRMED ADEQUATE)**

The D.10 section uses the `role classCode="PRN"` pattern matching Scenario6 exactly:
- D.10.1 parent name — present
- D.10.2.1 birth date — present (birthTime value="19971115")
- D.10.2.2a age — present (code=3, 28 years)
- D.10.3 LMP date — present (code=22)
- D.10.4 body weight — present (code=7, 62 kg)
- D.10.4 height — present (code=17, 165 cm)
- D.10.6 sex — encoded as `administrativeGenderCode code="2"` in `associatedPerson` — this matches Scenario6 pattern exactly. Scenario6 does NOT use a separate code=6 observation for parent sex.
- D.10.7.1.r medical history — present (RA, MedDRA coded)
- D.10.7.2 free text — present
- D.10.8.r past drug history (Methotrexate) — present with UNII code and indication

No gaps detected in D.10 section.

---

### Section 4: E.i — Adverse Events / Reactions

**E.i.1.2 Term Highlighted by Reporter (CONFIRMED CORRECT)**

Both reaction observations use `code=37 codeSystem=.19` with values from OID `.10`:
- Reaction 1 (Neonatal thrombocytopenia): `code="1"` (Yes, highlighted by the reporter) — correct
- Reaction 2 (Low birth weight baby): `code="3"` (No, not highlighted by the reporter, but SERIOUS) — correct

Values 1, 2, 3, 4 are all valid for this value set.

**E.i Extra NCIt Seriousness/Outcome Blocks — GAP-V10 + NEW-GAP-02 (CONFIRMED STILL PRESENT)**

Each reaction has two extra `outboundRelationship2 typeCode="PERT"` elements beyond the standard E2B fields:

```xml
<code code="C83121" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Seriousness"/>
<value xsi:type="CE" code="requiresInpatientHospitalization" 
       codeSystem="2.16.840.1.113883.3.989.2.1.1.19"/>
```

```xml
<code code="C49489" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Outcome"/>
<value xsi:type="CE" code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.11"/>
```

Two compounding issues:

1. **GAP-V10**: These extra NCIt-coded seriousness/outcome blocks are not present in any FDA reference scenario (S1 through S8). They are redundant with the already-present E2B-coded fields (codes 34, 21, 33, 35, 12, 26, 27) and introduce schema ambiguity.

2. **NEW-GAP-02**: The C83121 block's `value code="requiresInpatientHospitalization"` and `"otherMedicallyImportant"` use free-text string codes within `codeSystem="2.16.840.1.113883.3.989.2.1.1.19"` — this is the E2B numeric observation code OID. The allowed values in `.19` are numeric integers (1, 2, 3, etc.). String codes are schema-invalid in this OID. The correct numeric code for "requiresInpatientHospitalization" in E2B is `33` (which is already present as a separate proper element).

**Recommendation for TCM10**: Remove C83121 and C49489 blocks entirely. All required seriousness and outcome data is already correctly encoded using E2B numeric codes.

**Risk: Medium (structural non-conformance)**

---

### Section 5: F.r — Lab Tests

**F.r LOINC Promotion (CONFIRMED FIXED)**

- Test 1 (Platelet count): MedDRA primary `code="10035528"` with `<translation code="777-3" codeSystem=".6.1"/>` — mixed mode (MedDRA primary, LOINC secondary). Acceptable per E2B(R3) flexibility.
- Test 2 (Bilirubin): LOINC primary `code="1975-2"` with MedDRA `<translation>` — FIXED and correct.
- Test 3 (Birth weight): LOINC primary `code="8339-4"` with MedDRA `<translation>` — FIXED and correct.

No gaps.

---

### Section 6: G.k — Drug Information

**GAP-S05: G.k.1 Drug Characterization Encoding (CONFIRMED STILL PRESENT)**

This is the most significant structural gap remaining in TC-M09.

**TC-M09 approach:**
```xml
<organizer classCode="CATEGORY" moodCode="EVN">
  <code code="suspect" codeSystem="2.16.840.1.113883.3.989.2.1.1.13"/>
  <component><substanceAdministration ...>...</substanceAdministration></component>
</organizer>
```

**FDA reference approach (ALL scenarios S1, S2, S3, S4, S5, S6, S7, S8):**
```xml
<organizer classCode="CATEGORY" moodCode="EVN">
  <code code="4" codeSystem="2.16.840.1.113883.3.989.2.1.1.20" displayName="drugInformation"/>
  <component><substanceAdministration classCode="SBADM" moodCode="EVN">
    <id root="68d6f5ce-3b3b-45c7-92dd-69e06730c3a9"/>  <!-- UUID for cross-reference -->
    ...
  </substanceAdministration></component>
</organizer>
...
<!-- At adverseEventAssessment level: -->
<causalityAssessment classCode="OBS" moodCode="EVN">
  <code code="20" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="interventionCharacterization"/>
  <value xsi:type="CE" code="1" displayName="Suspect" codeSystem="2.16.840.1.113883.3.989.2.1.1.13"/>
  <subject2 typeCode="SUBJ">
    <productUseReference classCode="SBADM" moodCode="EVN">
      <id root="68d6f5ce-3b3b-45c7-92dd-69e06730c3a9"/>  <!-- links back to drug -->
    </productUseReference>
  </subject2>
</causalityAssessment>
```

This pattern was confirmed across Scenario1 (3 drugs), Scenario6 (6 drugs, maternal/neonatal), and Scenario7 (2 drugs with device component). The organizer `code="suspect"` approach does not appear in any FDA-published scenario.

**Python Evidence:**
```
TC-M09 drug organizer codes: ['suspect', 'suspect', 'concomitant', 'concomitant']
S6 drug organizer: code=4 (drugInformation)
S7 drug organizer: code=4 (drugInformation)
causalityAssessment elements in TC-M09: 0
Scenario7 causalityAssessment blocks: 3
Scenario6 causalityAssessment blocks: 6
```

**Risk: Medium — Reviewer Concern.** This survived CA+AA, meaning FDA's acceptance system does not block on this. However, Deepak is a detail-oriented reviewer and this is the most consistently non-standard structural choice in the file. Expect a comment-only finding (not rejection) if flagged.

**GAP-V05: No UUID on substanceAdministration (CONFIRMED STILL PRESENT)**

Directly linked to GAP-S05. TC-M09 has 6 `substanceAdministration` elements, none with an `id` attribute. Without UUIDs, the `causalityAssessment/subject2/productUseReference` linkage cannot be constructed.

**Python Evidence:**
```
Total substanceAdministration opens: 6
substanceAdministration followed by <id: 0
```

Note: Scenario7 also has no UUIDs on its substanceAdministration elements in the PORR sender block — this is because they use the organizer `code=4` approach with a separate `<id>` child element (not an attribute). The fix for GAP-S05 naturally resolves GAP-V05.

**G.k.2.3.r Active Substance Coding OID (CONFIRMED CORRECT)**

All substances use `codeSystem="2.16.840.1.113883.4.9"` (FDA UNII / SRS OID). Scenario7 uses the same OID. Correct.

**G.k.4.r.9/10 Dose Form and Route OIDs (CONFIRMED CORRECT)**

- Route: `codeSystem="0.4.0.127.0.16.1.1.2.6"` — matches Scenario7 (EDQM route OID). Correct.
- Dose form: `codeSystem="0.4.0.127.0.16.1.1.2.1"` — matches Scenario7 (EDQM dose form OID). Correct.
- EDQM codes used: C38299 (Subcutaneous), C38288 (Oral), C42967 (Injection), C42988 (Device). All plausible EDQM codes.

**GAP-F03: G.k.9.i.2.r / causalitySource absent (CONFIRMED STILL PRESENT)**

Scenario6 has 4 `causalityAssessment` blocks with `code=39 codeSystem=.19 displayName="causalitySource"` linking to specific substanceAdministration UUIDs. TC-M09 has zero such blocks.

The `causalitySource` (code=39) captures who performed the causality assessment (MAH, regulatory authority, reporter). This is a commonly expected field for pharmaceutical company submissions. Its absence combined with GAP-S05 means TC-M09 has no machine-readable causality assessment structure at all.

**Python Evidence:**
```
S6 causalitySource (code=39) references: 4
TC-M09 causalitySource (code=39) references: 0
```

**Risk: Medium — the fix for GAP-S05 also enables the fix for GAP-F03.**

**G.k Drug 4 (Auto-Injector as Concomitant): Structural Note**

TC-M09 encodes the Testdevice Auto-Injector as a fourth drug (concomitant), distinct from its role as a device component of Drug 1. This is an unusual pattern — the device component is already encoded under Drug 1's `part/partProduct` hierarchy. Listing it again as a standalone concomitant drug may be interpreted as double-counting. No FDA scenario shows this exact pattern. Low risk but potentially confusing.

---

### Section 7: H — Narrative and Sender Information

**H.2 Reporter Comments Placement (CONFIRMED CORRECT)**

The H.2 block uses `investigationEvent/component/observationEvent code=10 author code=3 (sourceReporter)`. Position analysis confirms it appears after `adverseEventAssessment` at the `investigationEvent` level — which is the correct structural location per E2B(R3) and matches the TC-M08 fix.

Note: Scenario6's H.2 blocks appear before `adverseEventAssessment` close tag (within nested structures), but this is because S6 uses a single massive nested structure. The key correctness criterion is the `author code=3 (sourceReporter)` which is present.

**H.3.r Sender Diagnosis — GAP-V12 (CONFIRMED STILL PRESENT)**

The H.3.r block encodes:
```xml
<observationEvent classCode="OBS" moodCode="EVN">
  <code code="15" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="senderDiagnosis"/>
  <value .../>
  <author typeCode="AUT">
    <assignedEntity classCode="ASSIGNED">
      <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.21" displayName="primaryReporter"/>
    </assignedEntity>
  </author>
</observationEvent>
```

In OID `2.16.840.1.113883.3.989.2.1.1.21` (reporter type):
- Code `1` = `sender` (pharmaceutical company)
- Code `2` = `reporter` (primary reporter/individual)
- Code `3` = `sourceReporter`

The `displayName="primaryReporter"` is an incorrect display label for code `1` which should read `"sender"`. The numeric code `1` is correct for the H.3.r sender diagnosis (it is the sender/MAH providing the diagnosis). Only the `displayName` is wrong.

The H.4 comment block (code=10, second component1) correctly uses `displayName="sender"` for code `1`. The H.3.r block should match this.

**Python Evidence:**
```
All reporter type codes found:
  code=3, displayName="sourceReporter"  (H.2 — correct)
  code=1, displayName="primaryReporter" (H.3.r — WRONG displayName)
  code=1, displayName="sender"          (H.4 — correct)
  code=3, displayName="sourceReporter"  (C.2.r — correct)
  code=2, displayName="reporter"        (H.5.r — correct)
```

**Risk: Low — numeric code is correct; display mismatch is cosmetic but detectable by reviewer.**

**H.3.r Completeness (CONFIRMED ADEQUATE)**

H.3.r has MedDRA-coded value (code=10049715, Neonatal thrombocytopenia, version 25.0) and author. The element is inside `adverseEventAssessment/component1` as required. No structural gaps beyond GAP-V12.

**H.4 Sender Comments (CONFIRMED CORRECT)**

Present in `adverseEventAssessment/component1` with `code=10 (comment)` and `author code=1 (sender)`. Complete.

**H.5.r Case Summary (CONFIRMED CORRECT)**

Present at `investigationEvent/component/observationEvent code=36` with `language="ENG"` and `author code=2 (reporter)`. Complete.

---

### Section 8: OID Audit

**OIDs in TC-M09 not found in FDA reference scenarios S1 and S7:**

| OID | Usage | Assessment |
|-----|-------|-----------|
| `2.16.840.1.113883.3.989.2.1.1.12` | F.r interpretationCode (test result coded) | Present in S6 (mega file) — acceptable |
| `2.16.840.1.113883.3.989.2.1.1.16` | G.k.9.i dechallenge value set | Standard E2B OID — correct |
| `2.16.840.1.113883.3.989.2.1.1.17` | G.k.9.ii rechallenge value set / G.k.7.r offLabel | Standard E2B OID — correct |
| `2.16.840.1.113883.3.989.2.1.1.27` | C.1.6.1.r document type | Standard E2B OID — correct |
| `2.16.840.1.113883.5.111` | Role code PRN (parent role) | HL7 RoleCode — correct |
| `2.16.840.1.113883.5.83` | F.r referenceRange interpretationCode (L/H) | HL7 ObservationInterpretation — correct |
| `2.16.840.1.113883.6.1` | LOINC OID (F.r lab tests) | Standard LOINC OID — correct |
| `4550c0a9-...` and `ab8100bd-...` | E.i reaction `id root` (UUID format used as OID) | These are UUIDs used as `root` on `<id>` elements, not OIDs — this is correct HL7v3 usage |
| `1.3.6.1.4.1.519.1` | PORR sender extra ID | Not in any scenario — unknown purpose |

No OID violations found beyond what is already noted.

---

## Python Verification Evidence

```python
# Evidence run date: 2026-05-27
# Script: programmatic analysis of CASE-20260523-MEGA5_v9.xml

# GAP-S05 confirmation:
causalityAssessment elements in TC-M09: 0
Scenario6 causalityAssessment blocks: 6
Scenario7 causalityAssessment blocks: 3
TC-M09 drug organizer: ['suspect', 'suspect', 'concomitant', 'concomitant']
S6 drug organizer: code=4 (drugInformation)

# GAP-V05 confirmation:
Total substanceAdministration opens: 6
substanceAdministration followed by <id: 0

# GAP-F03 confirmation:
S6 causalitySource (code=39) references: 4
TC-M09 causalitySource (code=39) references: 0

# GAP-V10 + NEW-GAP-02 confirmation:
NCIt C83121 Seriousness elements: 2
NCIt C49489 Outcome elements: 2
C83121 in FDA scenarios S1+S7: 0
C83121 value codes: ['requiresInpatientHospitalization', 'otherMedicallyImportant']
   (text strings used with numeric-only OID 2.16.840.1.113883.3.989.2.1.1.19)

# GAP-V12 confirmation:
H.3.r author: code=1, displayName="primaryReporter" (should be "sender")
H.4 author: code=1, displayName="sender" (correct)

# GAP-V01 CLOSED:
S6 C.1.8.1 uses: code="C54588" codeSystem="2.16.840.1.113883.3.26.1.1"
TC-M09 C.1.8.1 uses: code="C54588" codeSystem="2.16.840.1.113883.3.26.1.1"
-- Same pattern -- NOT a gap

# Race/Ethnicity OIDs CORRECT:
TC-M09: C17049/C16564 with NCIt OID 2.16.840.1.113883.3.26.1.1
Scenario1: Same OID pattern -- MATCHES

# D.7.1.r structure ADEQUATE:
MedDRA coded entries with codeSystemVersion: ['25.0', '25.0']
Continuing observations: 2

# G.k.4.r.9/10 OIDs CORRECT:
routeCode OID: 0.4.0.127.0.16.1.1.2.6 (matches S7)
formCode OID: 0.4.0.127.0.16.1.1.2.1 (matches S7)

# G.k.2.3.r UNII OID CORRECT:
Substance coded with UNII OID 2.16.840.1.113883.4.9: present (matches S7)
```

---

## TC-M10 Prioritized Remediation List

The following changes are recommended for TC-M10, ordered by priority:

### Priority 1 — Structural Fixes (Most Impactful)

**1a. GAP-S05 + GAP-V05: Migrate to `causalityAssessment code=20` structure**

This is the single most impactful fix, resolving both GAP-S05 and GAP-V05:

1. Change all four drug organizers from `code="suspect"/"concomitant" codeSystem=".1.13"` to `code="4" codeSystem=".1.20" displayName="drugInformation"`
2. Add `<id root="[UUID]"/>` as first child of each main `substanceAdministration` element
3. Add `causalityAssessment classCode="OBS" moodCode="EVN"` elements at `adverseEventAssessment` level with:
   - `code=20 codeSystem=.19 displayName="interventionCharacterization"`
   - `value code=1 (Suspect)` or `code=2 (Concomitant)` from OID `.13`
   - `subject2/productUseReference` with matching UUID

Example for Drug 1 (Testdrugimab, suspect):
```xml
<causalityAssessment classCode="OBS" moodCode="EVN">
  <code code="20" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" 
        displayName="interventionCharacterization"/>
  <value xsi:type="CE" code="1" displayName="Suspect" 
         codeSystem="2.16.840.1.113883.3.989.2.1.1.13"/>
  <subject2 typeCode="SUBJ">
    <productUseReference classCode="SBADM" moodCode="EVN">
      <id root="[same UUID as substanceAdministration]"/>
    </productUseReference>
  </subject2>
</causalityAssessment>
```

**1b. GAP-F03: Add `causalitySource` (code=39) blocks**

After adding the `causalityAssessment code=20` blocks, add corresponding `causalityAssessment code=39` blocks for each suspect drug to specify the causality assessment source (typically code=1 for MAH assessment):
```xml
<causalityAssessment classCode="OBS" moodCode="EVN">
  <code code="39" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" 
        displayName="causalitySource"/>
  <value xsi:type="CE" code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.25"/>
  <subject2 typeCode="SUBJ">
    <productUseReference classCode="SBADM" moodCode="EVN">
      <id root="[same UUID as Drug 1 substanceAdministration]"/>
    </productUseReference>
  </subject2>
</causalityAssessment>
```

### Priority 2 — Data Corrections (Medium Impact)

**2a. GAP-V10 + NEW-GAP-02: Remove NCIt seriousness/outcome extra blocks**

Remove all four extra `outboundRelationship2 typeCode="PERT"` blocks using C83121 and C49489 codes. The E2B-coded seriousness fields (codes 34, 21, 33, 35, 12, 26, 27) and outcome (code 27) are already correctly encoded and complete. The NCIt blocks are redundant, non-standard, and use invalid string codes in a numeric value set.

**2b. GAP-V12: Fix H.3.r author displayName**

Change:
```xml
<code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.21" displayName="primaryReporter"/>
```
To:
```xml
<code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.21" displayName="sender"/>
```

### Priority 3 — Low-Impact Cleanups

**3a. GAP-V07: Assess C.1.7.1 remedial action requirement**

Confirm with regulatory affairs whether the combination product classification (`C.1.12=true`) triggers a conditional requirement for a `remedialAction` field under the FDA regional data elements. If yes, add the appropriate coded value.

**3b. NEW-GAP-01: Remove extra PORR sender IDs**

Consider removing the `.3.13` and `1.3.6.1.4.1.519.1` IDs from the PORR sender block to match the single-ID pattern of all FDA scenarios. This avoids any ambiguity about sender identity.

**3c. NEW-GAP-03: Update XML comment header**

Change `TC-M08-v8` comment to `TC-M09-v9` in the opening comment block.

**3d. Drug 4 / Auto-Injector as concomitant**

Consider whether the Testdevice Auto-Injector should be listed as a standalone concomitant drug in addition to its role as a device component under Drug 1. This may cause a reviewer to question the double-representation. If the auto-injector is only relevant as a component, remove the standalone concomitant entry.

---

## Known Gap Status Summary

| Gap ID | Status | Evidence |
|--------|--------|---------|
| GAP-S05 | CONFIRMED STILL PRESENT | 0 causalityAssessment blocks; organizer code="suspect" — no FDA scenario uses this |
| GAP-V05 | CONFIRMED STILL PRESENT | 0 substanceAdministration elements have id attribute |
| GAP-V07 | CONFIRMED STILL PRESENT | No C.1.7.1 remedial action; C.1.12=true present |
| GAP-F03 | CONFIRMED STILL PRESENT | 0 causalitySource (code=39); S6 has 4 |
| GAP-V10 | CONFIRMED STILL PRESENT | 2x C83121, 2x C49489 extra blocks; absent from all FDA scenarios |
| GAP-V12 | CONFIRMED STILL PRESENT | H.3.r displayName="primaryReporter" should be "sender" |
| GAP-V01 | CLOSED — NOT A GAP | S6 uses same C54588 NCIt code for localCriteriaReportType |
| GAP-V11 | CLOSED — NOT A GAP | C94031 present and correctly encoded under asManufacturedProduct |
| NEW-GAP-01 | NEW | Extra PORR sender IDs; very low risk |
| NEW-GAP-02 | NEW | Text codes in numeric-only E2B OID .19 in NCIt blocks |
| NEW-GAP-03 | NEW | Comment header still reads TC-M08-v8 |

---

*End of TCM09 Anticipatory Gap Analysis*
