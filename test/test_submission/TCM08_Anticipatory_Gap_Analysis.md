# TC-M08 Anticipatory Gap Analysis — What Deepak May Flag Next
**File:** CASE-20260523-MEGA5_v8.xml (TC-M08)  
**Status:** Accepted CA+AA, Local #806624  
**Analysis date:** 2026-05-27  
**Method:** Cross-reference vs. FDA Business Rules v1.7 + FDA ICSR Scenarios 1, 7, 8 + direct XML inspection  
**Verification note:** All claims are Python-verified against the actual XML bytes. Severity is calibrated against the CA+AA acceptance — TC-M08 was accepted, so structural issues that survived parsing are flagged as "reviewer concern" not "rejection risk" unless an exact parallel is known to cause CR+AR.

---

## Priority Summary

| ID | Section | Finding | Verified | Severity | Rejection Risk |
|----|---------|---------|----------|----------|----------------|
| GAP-S01 | C.2.r | Missing SPRT code=2 (sourceReport) — reporter qualification not in correct block | ✅ Yes | HIGH | Low (accepted despite this) |
| GAP-S05 | G.k.1 | Drug characterization via `organizer code='suspect'` instead of `causalityAssessment code=20` | ✅ Yes | HIGH | Low (accepted despite this) |
| GAP-V05 | G.k | No UUID on substanceAdministration elements — causality cross-reference impossible | ✅ Yes | HIGH | Low (accepted despite this) |
| GAP-H01 | H.2 | "H.2 Case Narrative" block is `causalityAssessment` with NCIt code; should be `observationEvent code=10` + author | ✅ Yes | MEDIUM | Low |
| GAP-F01 | D.2.2a | Age observation uses NCIt C25150/OID .3.26.1.1; should be code=3 OID .3.989.2.1.1.19 | ✅ Yes | MEDIUM | Low |
| GAP-V08 | D.3 | Body weight uses NCIt C25208/OID .3.26.1.1; should be code=4 OID .3.989.2.1.1.19 | ✅ Yes | MEDIUM | Low |
| GAP-V07 | C.1.7.1 | Combination product (C.1.12=true) present but no C.1.7.1 remedial action entry | ✅ Yes | MEDIUM | Reviewer flag |
| GAP-V01 | C.1.8.1 | localCriteriaReportType outer code uses NCIt C54588; inner value OID is non-standard | ✅ Yes | MEDIUM | Low |
| GAP-V03 | G.k.4.r | PIVL_TS period=1d but narrative says "biweekly" — data inconsistency | ✅ Yes | MEDIUM | Reviewer flag |
| GAP-F03 | G.k.9.i | G.k.9.i.2.r causality assessment fields absent (source, method, result) | ✅ Yes | LOW | No |
| GAP-C01 | F.r.2.1 | Tests 2+3 use LOINC inside `<translation>`; LOINC should be primary `<code>` element | ✅ Yes | LOW | No |
| GAP-V10 | E.i | Extra NCIt-coded `outboundRelationship2` seriousness/outcome elements not in any scenario | ✅ Yes | LOW | No |
| GAP-V03b | G.k.2.3 | Indication, ActionTaken use NCIt OIDs (C41331, C41341) vs. E2B(R3) OIDs — inconsistent | ✅ Yes | LOW | No |

---

## Detailed Findings

### GAP-S01 — Missing C.2.r Reporter as SPRT code=2 (sourceReport)

**What TC-M08 has:**
```xml
<!-- Only one outboundRelationship SPRT, code=1 (initialReport) -->
<outboundRelationship typeCode="SPRT">
  <relatedInvestigation classCode="INVSTG" moodCode="EVN">
    <code code="1" codeSystem="...1.1.22" displayName="initialReport"/>
    <subjectOf2>
      <controlActEvent>
        <author>
          <assignedEntity>
            <code code="1" sys="...1.1.3" display="regulator"/>
            <!-- Reporter name/addr here but under code=1, not code=2 -->
```

**What all FDA scenarios (1, 7, 8) require:** TWO SPRT blocks:

```xml
<!-- SPRT code=1 (initialReport/regulator) — TC-M08 has this correctly -->
<outboundRelationship typeCode="SPRT">
  <relatedInvestigation>
    <code code="1" codeSystem="...1.1.22"/>
    <subjectOf2>
      <controlActEvent>
        <author><assignedEntity>
          <code code="1" sys="...1.1.3" displayName="regulator"/>
        </assignedEntity></author>
      </controlActEvent>
    </subjectOf2>
  </relatedInvestigation>
</outboundRelationship>

<!-- SPRT code=2 (sourceReport) — MISSING in TC-M08 -->
<outboundRelationship typeCode="SPRT">
  <priorityNumber value="1"/>  <!-- C.2.r.5 -->
  <relatedInvestigation>
    <code code="2" codeSystem="...1.1.22" displayName="sourceReport"/>
    <subjectOf2>
      <controlActEvent>
        <author><assignedEntity>
          <!-- C.2.r.1.1–2.9: reporter name, address, telecom -->
          <assignedPerson>
            <asQualifiedEntity>
              <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.6"
                    displayName="Physician"/>  <!-- C.2.r.4 Qualification -->
            </asQualifiedEntity>
          </assignedPerson>
        </assignedEntity></author>
      </controlActEvent>
    </subjectOf2>
  </relatedInvestigation>
</outboundRelationship>
```

**Impact:** FDA cannot extract C.2.r.4 (Reporter Qualification) or C.2.r.5 (Primary Source). Business rule R0020 requires C.2.r.4 when C.2.r.5=1. TC-M08 was accepted CA+AA so FDA's gateway may not hard-reject this — but Deepak can flag it as "reporter qualification fields missing."

**Note:** TC-M08's `<subjectOf1>` correctly encodes C.3 Sender with OID `.1.1.7` (Pharmaceutical company code=1). C.3 is fine. The gap is specifically C.2.r.

---

### GAP-S05 — G.k.1 Drug Characterization via organizer instead of causalityAssessment

**What TC-M08 has:**
```xml
<organizer classCode="CATEGORY" moodCode="EVN">
  <code code="suspect" codeSystem="2.16.840.1.113883.3.989.2.1.1.13"/>
  <!-- drugs nested inside organizer -->
```

**What all FDA scenarios (1, 7, 8) use:**
```xml
<component typeCode="COMP">
  <causalityAssessment classCode="OBS" moodCode="EVN">
    <code code="20" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"
          displayName="interventionCharacterization"/>
    <value xsi:type="CE" code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.13"
           displayName="Suspect"/>
    <subject2 typeCode="SUBJ">
      <productUseReference classCode="SBADM" moodCode="EVN">
        <id root="[drug-UUID]"/>
      </productUseReference>
    </subject2>
  </causalityAssessment>
</component>
```

**Impact:** FDA's parser may not identify the suspect drug via the organizer pattern. Business rule W0005 warns when no suspect/interacting drug is identified. TC-M08 was accepted, suggesting the FDA gateway either reads the organizer pattern or doesn't enforce W0005 as a hard block. However, this is a structural deviation from every FDA reference scenario and Deepak could flag it.

---

### GAP-V05 — No UUID on substanceAdministration Elements

**What TC-M08 has:**
```xml
<substanceAdministration classCode="SBADM" moodCode="EVN">
  <!-- no <id> element -->
```

**What FDA scenarios require:**
```xml
<substanceAdministration classCode="SBADM" moodCode="EVN">
  <id root="68d6f5ce-3b3b-45c7-92dd-69e06730c3a9"/>
```

**Impact:** Without UUIDs, `causalityAssessment` elements cannot cross-reference specific drugs. All drug-reaction causality linkage (G.k.9.i.2.r) is structurally impossible. This is an ongoing limitation. TC-M08 accepted despite this. Adding UUIDs is a prerequisite before implementing GAP-S05 correctly.

---

### GAP-H01 — H.2 Comment Block Uses Wrong Element and OID

**What TC-M08 has (labelled as "H.2"):**
```xml
<causalityAssessment classCode="OBS" moodCode="EVN">
  <code code="C53253" codeSystem="2.16.840.1.113883.3.26.1.1"
        displayName="Case Narrative"/>
  <value xsi:type="ED">TC-M08: Maternal/neonatal case...</value>
```

Issues with this:
1. Element is `causalityAssessment`, not `observationEvent`
2. Code is NCIt `C53253`; H.2 requires E2B code=10 (`comment`, OID `.3.989.2.1.1.19`)
3. No `author` block with `code=3` (sourceReporter, OID `.3.989.2.1.1.21`)

**Correct H.2 pattern (from Scenario 7):**
```xml
<component1 typeCode="COMP">
  <observationEvent classCode="OBS" moodCode="EVN">
    <code code="10" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="comment"/>
    <value xsi:type="ED">Reporter's comments text.</value>
    <author typeCode="AUT">
      <assignedEntity classCode="ASSIGNED">
        <code code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.21"
              displayName="sourceReporter"/>
      </assignedEntity>
    </author>
  </observationEvent>
</component1>
```

Note: H.4 (Sender's Comments) in TC-M08 is correctly encoded as `observationEvent code=10` with author `code=1 displayName="sender"`. Only H.2 is wrong.

---

### GAP-F01 — D.2.2a/D.3 Age and Weight Use NCIt OID Instead of E2B(R3) OID

**TC-M08 (wrong):**
```xml
<code code="C25150" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Age"/>
<code code="C25208" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Weight"/>
```

**All FDA scenarios (correct):**
```xml
<code code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="age"/>
<code code="4" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="bodyWeight"/>
```

**Irony:** TC-M08's D.10.2.2a (parent age) and D.10.4 (parent weight/height) use the CORRECT E2B(R3) OID with codes 3, 4, 7, 17. Only the patient's own D.2.2a and D.3 are wrong. This is an internal inconsistency within the same file that Deepak will likely catch.

Additional NCIt OIDs found where E2B OIDs are expected:
- `C17049` (Race) — used instead of E2B coded race value
- `C16564` (Ethnic Group) — used instead of E2B coded ethnicity

---

### GAP-V07 — C.1.7.1 Remedial Action Absent for Combination Product

TC-M08 has `C.1.12 Combination Product = true` but no C.1.7.1 remedial action observationEvent. FDA Scenario 7 (device combination product) includes remedial action entries under `component typeCode="COMP"`:

```xml
<component typeCode="COMP">
  <observationEvent classCode="OBS" moodCode="EVN">
    <code code="C84274" codeSystem="2.16.840.1.113883.3.26.1.1"
          displayName="Remedial Action"/>
    <value xsi:type="CE" code="..." displayName="Notification"/>
  </observationEvent>
</component>
```

TC-M08 has `G.k.12.r.11.r Remedial Action Initiated` inside the device block (code=C54594), but C.1.7.1 is a separate case-level field. Both are expected when a device combination product is involved.

---

### GAP-V03 — PIVL_TS Dosing Interval Says 1 Day, Narrative Says Biweekly

TC-M08 has:
```xml
<comp xsi:type="PIVL_TS">
  <period value="1" unit="d"/>
</comp>
```

But the H.1 narrative, G.k.4.r.8 free text, and the clinical scenario all describe the drug as given **biweekly** (every 14 days). Correct PIVL_TS should be `<period value="14" unit="d"/>`. This is a data content inconsistency — the coded interval contradicts the narrative on every read.

---

### GAP-C01 — Tests 2+3 LOINC in `<translation>` Instead of Primary `<code>`

Test 1 correctly uses LOINC as the primary `<code>` element:
```xml
<code code="777-3" codeSystem="2.16.840.1.113883.6.1" displayName="Platelets..."/>
```

Tests 2 and 3 use a local code as primary and LOINC inside `<translation>`:
```xml
<code code="LOCAL-BILI-001" codeSystem="2.16.840.1.113883.3.989.2.1.3.16">
  <translation code="1975-2" codeSystem="2.16.840.1.113883.6.1" .../>
</code>
```

The E2B(R3) IG and Scenario 1 use LOINC as the primary code when available. The translation approach works but is non-standard for F.r.2.1. Tests 2+3 should be updated to match Test 1's pattern.

---

### GAP-V01 — C.1.8.1 localCriteriaReportType Uses Non-Standard OID

TC-M08 outer code:
```xml
<code code="C54588" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="localCriteriaReportType"/>
<value xsi:type="CE" code="1" codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.1.1" displayName="15-Day"/>
```

The inner value OID `2.16.840.1.113883.3.989.5.1.2.2.1.1.1` appears to be a non-standard or locally invented OID. FDA scenarios use `2.16.840.1.113883.3.989.2.1.1.10` for this field's value. The outer code using NCIt `C54588` for the observation type is a parallel to the age/weight NCIt-vs-E2B inconsistency.

---

### GAP-V10 — Extra NCIt-Coded Seriousness/Outcome outboundRelationship2 Elements

TC-M08 includes non-standard extra outboundRelationship2 elements on each reaction:
```xml
<outboundRelationship2 typeCode="COMP">
  <observation classCode="OBS" moodCode="EVN">
    <code code="C83121" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Seriousness"/>
    ...
  </observation>
</outboundRelationship2>
```

These are additional NCIt-coded overlays on top of the standard boolean seriousness elements (code=34/21/33/35/12/26). None of the FDA reference scenarios include these extra elements. They may be ignored or may cause schema validation warnings in strict mode.

---

## Root Cause Pattern: NCIt vs. E2B(R3) OID Confusion

TC-M08 has a systematic OID confusion: it uses NCIt OIDs (`2.16.840.1.113883.3.26.1.1`) for many fields where E2B(R3) coded OIDs (e.g., `2.16.840.1.113883.3.989.2.1.1.19`) are required by the FDA scenarios. The rule is:

| When to use NCIt OID | When to use E2B(R3) OID |
|---------------------|------------------------|
| FDA-specific fields not in ICH spec: C.1.12 (combination product), G.k.12.r device codes, C.1.7.1 remedial action, race/ethnicity (C17049/C16564) | All standard E2B(R3) observation types: age (code=3), weight (code=4), seriousness criteria (code=21, 34, etc.), comment (code=10), senderDiagnosis (code=15), gestationPeriod (code=16), cumulativeDose (code=14) |

Fields where TC-M08 uses NCIt OID but should use E2B(R3) OID:
- D.2.2a age: C25150 → code=3
- D.3 weight: C25208 → code=4  
- C.1.8.1 type: C54588 → verify E2B(R3) equivalent
- H.2 comment: C53253 → code=10

Fields where TC-M08 correctly uses NCIt OID:
- C.1.12 combination product: C156384 ✅
- G.k.12.r device codes: C54026, C54451, C54594, C54592 ✅
- G.k.10.1 specialized product: C94031 ✅

---

## Recommended Next Test Case: TC-M09

Based on this analysis, TC-M09 should address the highest-value gaps. Suggested minimum patch set:

**P1 — High value, mechanical fixes:**
1. Add SPRT code=2 (sourceReport) block with C.2.r reporter qualification OID `.1.1.6`, reporter name, and `priorityNumber value="1"`
2. Fix D.2.2a age observation: `C25150 → code=3, OID .3.989.2.1.1.19`
3. Fix D.3 weight observation: `C25208 → code=4, OID .3.989.2.1.1.19`
4. Fix PIVL_TS period: `value="1" unit="d" → value="14" unit="d"` (biweekly)
5. Fix H.2 block: `causalityAssessment + C53253 → observationEvent + code=10 + author code=3`
6. Fix F.r.2.1 Tests 2+3: promote LOINC from `<translation>` to primary `<code>`

**P2 — Structural improvements:**
7. Add UUID `<id>` to each `substanceAdministration`
8. Add `causalityAssessment code=20 (interventionCharacterization)` for each drug, referencing drug by UUID, replacing organizer approach
9. Add C.1.7.1 remedial action observationEvent for combination product

**P3 — Cleanup:**
10. Remove extra NCIt-coded seriousness outboundRelationship2 elements
11. Fix H.3.r author displayName from "primaryReporter" to "sender"
12. Verify C.1.8.1 value OID
