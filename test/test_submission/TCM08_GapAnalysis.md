# TC-M08 Gap Analysis — FDA FAERS E2B(R3) HL7v3 ICSR XML
## CASE-20260523-MEGA5_v8.xml vs. FDA Scenarios + Business Rules v1.7

**Date:** 2026-05-27  
**Analyst:** DeepQuence FAERS review (automated + cross-reference)  
**Reviewer context:** Submission accepted CA+AA (Local #806624). This report anticipates  
gaps Deepak Nelivigi may identify in the next review cycle.  
**Reference files:**
- `FDA E2B(R3) Core and Regional Data Elements and Business Rules v1.7.xlsx`
- `FAERS2022Scenario1.xml`, `FAERS2022Scenario7.xml`, `FAERS2022Scenario8.xml`
- `TCM07_TagsMissing_GapAnalysis.md`
- `GAP-IND-001-batch-receiver-premkt.md` through `GAP-IND-007-*`

---

## Executive Summary

TC-M08 (`CASE-20260523-MEGA5_v8.xml`) builds correctly on TC-M07 — adding LOINC F.r.2.1 codes
on all three lab tests, interpretationCode on Tests 2+3, and device model/serial. However, a
cluster of structural and field-level gaps remain that will likely be flagged by FDA:

| Priority | Gap ID | Category | Risk |
|----------|--------|----------|------|
| CRITICAL | GAP-S01 | Missing C.2.r as SPRT code=2 outboundRelationship | Rejection |
| CRITICAL | GAP-S02 | Missing separate C.3 Sender subjectOf1 | Rejection |
| CRITICAL | GAP-S03 | Wrong OID for C.2.r.4 Qualification (uses .1.1.7 Sender Type OID) | Rejection |
| HIGH | GAP-S04 | Missing C.2.r.5 priorityNumber | Business rule R0020 violation |
| HIGH | GAP-S05 | G.k.1 drug role via organizer code; no causalityAssessment/interventionCharacterization | Warning W0005 |
| HIGH | GAP-F01 | D.2.2a age observation uses NCIt OID; should be E2B(R3) OID .1.1.19 code=3 | Wrong code system |
| MEDIUM | GAP-F02 | H.2 Reporter's Comments absent (no observationEvent code=10 + author code=3 sourceReporter) | Optional but expected |
| MEDIUM | GAP-H01 | H.2 label comment block uses causalityAssessment, not observationEvent — wrong element | Structural |
| MEDIUM | GAP-V01 | C.1.8.1 localCriteriaReportType uses NCIt OID C54588 instead of E2B(R3) OID | Wrong OID |
| MEDIUM | GAP-V02 | G.k.1 organizer code uses free-text "suspect"/"concomitant" instead of coded value | Wrong approach |
| LOW | GAP-C01 | H.5.r.1b language encoded as XML attribute not coded element | Encoding concern |
| LOW | GAP-V03 | PIVL_TS dosing interval says daily (1d) but narrative says biweekly | Data mismatch |
| LOW | GAP-V04 | D.10.8.r.3 Indication uses NCIt C41331 not E2B(R3) OID | Inconsistent OID |
| INFO | GAP-V05 | Drug substanceAdministration elements have no UUID id — needed for causality cross-ref | Future-proofing |

---

## Section N — Batch / Transmission

TC-M08 is a postmarket spontaneous report. The outer MCCI wrapper contains:
```xml
<id root="2.16.840.1.113883.3.989.2.1.3.14" extension="ZZFDATST"/>
```
This is **correct** for Test + Postmarket.

No gaps identified in Section N for this TC.

**Note for IND tracks:** `GAP-IND-001` documents that the premarket test receiver must be  
`ZZFDATST_PREMKT`, not `ZZFDA_PREMKT`. TC-M08 is postmarket so this does not apply here.

---

## Section C — Administrative

### C.1.1 / C.1.2 — Safety Report IDs

| Element | TC-M08 value | Assessment |
|---------|-------------|------------|
| C.1.1 (root .3.1) | `SR-CASE-20260527-MEGA5v8p2` | OK |
| C.1.2 (root .3.2) | `CASE-20260526-MEGA5v8` | OK |
| C.1.4 (root .3.4) version | `1` | OK — initial report |

**GAP-V06 (INFO):** The C.1.1 extension contains date `20260527` while C.1.2 contains `20260526`.
These are internal ID strings so FDA will not reject them, but they create confusion in the audit
trail. Recommend aligning dates in the IDs.

### C.1.3 — Type of Report

```xml
<value xsi:type="CE" code="1" displayName="Spontaneous report" codeSystem="2.16.840.1.113883.3.989.2.1.1.2"/>
```
Correct.

### C.1.6.1.r — Documents Held by Sender

One reference document with B64-encoded text and a literature reference present. Both use
OID `.1.1.27` correctly. Matches Scenario 1 pattern. No gap.

### C.1.7 / C.1.7.1 — Fulfils Local Criteria

C.1.7 (code=23, BL true) is present.

**GAP-V07 (MEDIUM):** No `C.1.7.1` observationEvent is present for FDA-specific remedial action
taken. For a combination product report (`C.1.12` Combination Product = true), FDA scenarios
(Scenario 7, similar device report) include one or more C.1.7.1 remedial action entries
(`code="C84274"` or `code="C54583"` in NCIt namespace) under component typeCode=COMP.
TC-M08 has the combination product flag set to true but omits C.1.7.1.

**Business rule:** FDA-specific field — not in ICH conformance column. Scenario 7 lines 90–120
shows two `<component typeCode="COMP"><observationEvent><code code="C84274"...displayName=
"Remedial Action"/>` entries. FDA reviewers typically flag absent remedial action for device
combination product reports.

### C.1.8.1 — Local Criteria Report Type

```xml
<code code="C54588" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="localCriteriaReportType"/>
<value xsi:type="CE" code="1" codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.1.1" displayName="15-Day"/>
```

**GAP-V01 (MEDIUM):** The outer `<code>` element uses `C54588` from NCIt OID `.3.26.1.1`.
All FDA reference scenarios use the E2B(R3) coded approach for this element with OID
`.3.989.2.1.1.19` and a numeric code. Specifically, Scenario 1 uses code=`6` (15-Day) or
code=`7` (7-Day) with OID `2.16.840.1.113883.3.989.2.1.1.19`. The NCIt approach may not
validate against the FDA schema.

The value OID `2.16.840.1.113883.3.989.5.1.2.2.1.1.1` is also non-standard — this looks like
a locally invented OID. Check whether FDA XSD accepts this. Scenario 1 uses
`codeSystem="2.16.840.1.113883.3.989.2.1.1.10"` for reportType values.

### C.1.12 — Combination Product Report

```xml
<code code="C156384" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Combination Product Report Indicator"/>
<value xsi:type="BL" value="true"/>
```

The use of NCIt OID `C156384` for this field is an FDA-specific pattern. Scenario 7 confirms
this OID is correct for the combination product indicator. No gap here on the code, but see
GAP-V07 above for the missing C.1.7.1 remedial action.

### C.2.r — Primary Source Reporter

**GAP-S01 (CRITICAL):** TC-M08 does NOT implement the C.2.r reporter as an
`outboundRelationship typeCode="SPRT"` with `code=2 (sourceReport)`. Instead it places reporter
data inside a `<subjectOf1>` element alongside the C.3 Sender section. All FDA reference
scenarios (1, 7, 8) use this required dual-SPRT structure:

```xml
<!-- REQUIRED structure — MISSING in TC-M08 -->
<outboundRelationship typeCode="SPRT">
  <priorityNumber value="1"/>               <!-- C.2.r.5 -->
  <relatedInvestigation classCode="INVSTG" moodCode="EVN">
    <code code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="sourceReport"/>
    <subjectOf2 typeCode="SUBJ">
      <controlActEvent classCode="CACT" moodCode="EVN">
        <author typeCode="AUT">
          <assignedEntity classCode="ASSIGNED">
            <!-- C.2.r.1.1 through C.2.r.2.9 reporter addr/telecom -->
            <assignedPerson classCode="PSN" determinerCode="INSTANCE">
              <asQualifiedEntity classCode="QUAL">
                <!-- C.2.r.4 Qualification OID .1.1.6 -->
                <code code="1" displayName="Physician" codeSystem="2.16.840.1.113883.3.989.2.1.1.6"/>
              </asQualifiedEntity>
            </assignedPerson>
          </assignedEntity>
        </author>
      </controlActEvent>
    </subjectOf2>
  </relatedInvestigation>
</outboundRelationship>
```

TC-M08 instead has:
```xml
<subjectOf1 typeCode="SUBJ">
  <controlActEvent classCode="CACT" moodCode="EVN">
    <author>
      <assignedEntity>
        <!-- Uses OID .1.1.7 (Sender Type) — WRONG context for reporter -->
        <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.7"/>
        <!-- Reporter address/name/telecom stuffed here — wrong location -->
```

**Impact:** FDA cannot parse C.2.r fields — they are in the wrong XML container.

**Business rule:** R0020 — "C.2.r.4 is required when C.2.r.5 = 1 (initial reporter)."
Both C.2.r.4 and C.2.r.5 are structurally absent.

**GAP-S03 (CRITICAL):** TC-M08 uses OID `2.16.840.1.113883.3.989.2.1.1.7` (which is the
**Sender Type** OID, for C.3.1) in the `<code>` element of the reporter's `assignedEntity`.
The correct OID for C.2.r.4 Reporter Qualification is `2.16.840.1.113883.3.989.2.1.1.6`.
These are different value sets; using `.1.7` for a reporter qualification claim will cause
a validation error.

**GAP-S04 (HIGH):** No `<priorityNumber>` element present anywhere in TC-M08.
Business rule R0020 requires C.2.r.5 priorityNumber. FDA scenarios show:
```xml
<priorityNumber value="1"/>
```
inside the SPRT code=2 relatedInvestigation wrapper.

### C.3 — Sender Information

**GAP-S02 (CRITICAL):** TC-M08 has only ONE `<subjectOf1>` element, and it is used for the
C.2.r reporter data (incorrectly as described above). There is no separate `<subjectOf1>`
containing C.3 Sender information with OID `.1.1.7` (C.3.1 Sender Type).

All FDA scenarios maintain a clear separation:
- SPRT code=2 outboundRelationship → C.2.r reporter (qualification OID .1.1.6)
- Separate `<subjectOf1>` → C.3 sender (sender type OID .1.1.7, with organization name,
  address, sender department)

TC-M08 conflates these two sections. FDA XML parsing will fail to find C.3 sender fields.

The correct C.3 `<subjectOf1>` structure (from Scenario 1):
```xml
<subjectOf1 typeCode="SUBJ">
  <controlActEvent classCode="CACT" moodCode="EVN">
    <author typeCode="AUT">
      <assignedEntity classCode="ASSIGNED">
        <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.7" displayName="Pharmaceutical company"/>
        <addr>...</addr>
        <telecom .../>
        <assignedPerson classCode="PSN" determinerCode="INSTANCE">
          <name>...</name>
        </assignedPerson>
        <representedOrganization classCode="ORG" determinerCode="INSTANCE">
          <name>DeepQuence Inc.</name>
        </representedOrganization>
      </assignedEntity>
    </author>
  </controlActEvent>
</subjectOf1>
```

---

## Section D — Patient Characteristics

### D.1 — Patient Initials

Patient name encoded as `<name>B.P.</name>` — correct format.

### D.2 — Age Group / Age

**GAP-F01 (HIGH):** The D.2.2a age observation uses the wrong code system:

```xml
<!-- TC-M08 (WRONG) -->
<code code="C25150" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Age"/>
```

All FDA reference scenarios (1, 7, 8) use the E2B(R3) code:
```xml
<!-- CORRECT per all FDA scenarios -->
<code code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="age"/>
```

The NCIt OID `2.16.840.1.113883.3.26.1.1` with `C25150` is a valid NCI concept code for "Age"
but it is NOT the OID used in the FDA ICSR schema for this observation. The FDA schema expects
`.3.989.2.1.1.19` (the E2B(R3) observation type vocabulary). This will fail XSD validation.

**Note:** D.10.2.2a (parent age) uses `code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"`
which is CORRECT. The inconsistency is only in D.2.2a for the patient.

### D.3 — Body Weight

D.3 uses NCIt OID `C25208` for body weight observation code. Compare to Scenario 1 which uses
E2B(R3) observation code `4` (bodyWeight) with OID `.3.989.2.1.1.19`. This is the same pattern
of NCIt usage vs. E2B(R3) coded values.

**GAP-V08 (MEDIUM):** D.3 body weight observation code should be:
```xml
<code code="4" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="bodyWeight"/>
```
TC-M08 uses NCIt `C25208` — same wrong OID category as GAP-F01.

### D.5 — Onset Age / D.6 — Last Menstrual Period

Not applicable for neonate patient B.P. — correct to omit.

### D.7 — Medical History

Structured `<organizer classCode="CATEGORY" moodCode="EVN">` with code=1 (OID .1.1.20).
No coded condition in D.7 for the neonate (correct — separate from parent D.10.7).

### D.9 — Cause of Death

Not applicable (patient survived). Correct to omit.

### D.10 — Parent Data

D.10 parent section is well-structured:
- D.10.1: Name via `<name>Ms. Sarah P.</name>` in associatedPerson
- D.10.2.1: `<birthTime value="19971115"/>`
- D.10.2.2a: Parent age using CORRECT OID code=3 (`.3.989.2.1.1.19`)
- D.10.3: Last menstrual period using code=22
- D.10.4: Body weight code=7, height code=17 — both using correct OID
- D.10.6: `<administrativeGenderCode code="2">` — correct
- D.10.7.1.r: MedDRA rheumatoid arthritis
- D.10.7.2: Text
- D.10.8.r: Methotrexate past drug

**GAP-V09 (LOW):** D.10.8.r.3 (Indication for Use in parent drug history) uses:
```xml
<code code="C41331" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Indication"/>
```
This is NCIt OID for the observation code. Other fields in D.10 use the E2B(R3) OID
`.3.989.2.1.1.19`. Compare with the similar G.k.7.r indication structure in Scenario 1 which
uses `code="20" codeSystem="2.16.840.1.113883.3.989.2.1.1.18"`. Inconsistent OID usage is a
minor flag but not a rejection risk.

---

## Section E — Reaction / Event

### E.i.1.1a / E.i.1.1b — Reaction MedDRA Term

Both reactions (Thrombocytopenia + Low birth weight) use MedDRA OID `.6.163` correctly.

### E.i.2 — Dates of Onset / Duration

Present and correctly structured with IVL_TS.

### E.i.3.2 — Outcome of Reaction at Time of Report

Present as CE coded values.

**GAP-V10 (LOW):** The seriousness observations for E.i reactions include non-standard
`outboundRelationship2` elements with NCIt OIDs for seriousness and outcome:
```xml
<outboundRelationship2 typeCode="COMP">
  <observation classCode="OBS" moodCode="EVN">
    <code code="C83121" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Seriousness"/>
    ...
  </observation>
</outboundRelationship2>
```
These additional NCIt-coded seriousness/outcome outboundRelationship2 elements are not present
in any FDA reference scenario. The standard boolean seriousness elements (code=34, 21, 33, 35,
12, 26) are already correct. The extra NCIt elements may cause unexpected schema validation
behavior if FDA validates with strict mode.

---

## Section F — Test Results

### F.r.2.1 — LOINC Codes (Test Name Coded)

TC-M08 encodes LOINC codes via `<translation>` inside the `<code>` element:
```xml
<code code="777-3" codeSystem="2.16.840.1.113883.6.1" displayName="Platelets [#/volume]...">
  ...
</code>
```
(Test 1 uses LOINC as the primary code; Tests 2+3 use translation elements.)

**GAP-C01 (MEDIUM):** Scenario 1 and the E2B(R3) IG show that F.r.2.1 is a coded field
(`<code>` element on the observation) using LOINC OID `2.16.840.1.113883.6.1`. The `translation`
approach is non-standard for primary code population. All three LOINC codes should appear as the
primary `<code>` element of the observationEvent, not inside a `<translation>` wrapper.

Tests 2 and 3 in TC-M08 have:
```xml
<code code="LOCAL-BILI-001" codeSystem="2.16.840.1.113883.3.989.2.1.3.16">
  <translation code="1975-2" codeSystem="2.16.840.1.113883.6.1" .../>
</code>
```

The correct approach per FDA Scenario 1 is to use LOINC as the direct code when available:
```xml
<code code="1975-2" codeSystem="2.16.840.1.113883.6.1" displayName="Bilirubin [Mass/volume] in Serum or Plasma"/>
```

### F.r.3.3 — Test Result Unit

Units are encoded in `IVL_PQ` center/@unit or PQ/@unit. This is acceptable — the unit
travels with the value element. No gap.

### F.r.5 — Normal Range (Low / High)

Present on all three tests using `<referenceRange>` with IVL_PQ. No gap.

### F.r.6 — Comments

No F.r.6 free-text comment on any test. This is Optional; no gap unless FDA requests it.

---

## Section G — Drug Information

### G.k.1 — Drug Characterization (Suspect/Concomitant/Interacting)

**GAP-S05 (HIGH):** TC-M08 encodes drug characterization using free-text organizer codes:
```xml
<organizer classCode="CATEGORY" moodCode="EVN">
  <code code="suspect" codeSystem="2.16.840.1.113883.3.989.2.1.1.13"/>
```
and
```xml
<code code="concomitant" codeSystem="2.16.840.1.113883.3.989.2.1.1.13"/>
```

All FDA reference scenarios (1, 7, 8) encode G.k.1 via a **separate causalityAssessment
component** with `interventionCharacterization` code=20, linked to the drug by UUID:

```xml
<!-- From Scenario 1 — required pattern -->
<component typeCode="COMP">
  <causalityAssessment classCode="OBS" moodCode="EVN">
    <code code="20" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="interventionCharacterization"/>
    <value xsi:type="CE" code="1" displayName="Suspect" codeSystem="2.16.840.1.113883.3.989.2.1.1.13"/>
    <subject2 typeCode="SUBJ">
      <productUseReference classCode="SBADM" moodCode="EVN">
        <id root="[drug-UUID]"/>  <!-- matches drug substanceAdministration id -->
      </productUseReference>
    </subject2>
  </causalityAssessment>
</component>
```

TC-M08 uses the organizer `code` attribute approach which does not match the FDA-validated
XML schema pattern. Business rule **W0005** warns when no suspect or interacting drug is present.
Using the wrong structural pattern means FDA's parser may not find ANY suspect drug, triggering W0005.

**GAP-V05 (MEDIUM):** Drug `substanceAdministration` elements in TC-M08 have no `<id>` attribute
with a UUID. The causalityAssessment cross-referencing pattern (as required for G.k.1,
G.k.9.i.2.r, etc.) requires each drug to have a unique ID so assessment elements can reference it.
Without UUIDs on the substanceAdministration elements, the causalityAssessment pattern cannot
be correctly implemented.

### G.k.2.2 — Product Authorization Country

Present for Testdrugimab (US). No gap.

### G.k.3.1 — Suspect Drug Product Authorization Number

```xml
<id root="2.16.840.1.113883.3.989.2.1.3.4" extension="NDA123456"/>
```
This is an E2B(R3)-valid pattern. No gap.

### G.k.4.r — Dosing

Testdrugimab dose present with PIVL_TS dosing interval.

**GAP-V03 (LOW):** The PIVL_TS interval is `<period value="1" unit="d"/>` (daily), but:
1. The narrative (H.1) says "biweekly" (every 2 weeks)
2. G.k.4.r.8 free text says "biweekly"

If the drug is given biweekly, the correct PIVL_TS period should be `<period value="14" unit="d"/>`.
A daily dosing interval is inconsistent with a biweekly regimen. This will generate a
narrative-vs-coded inconsistency warning from an FDA reviewer.

### G.k.5a/b — Cumulative Dose

Present using `outboundRelationship2 typeCode="SUMM"` with code=14 (cumulativeDoseFirstReaction).
Value=21800 mg. Correctly encoded. No gap.

### G.k.6a/b — Gestation at Time of Exposure

Present using code=16 (gestationPeriod) with value 20 weeks. Correctly encoded. No gap.
This is required when the patient is a neonate and drug administered to mother. Condition met
and field present — business rules R0081/R0082 satisfied.

### G.k.7.r — Indication for Use

Present for Testdrugimab using NCIt `C41331`. As noted in GAP-V09, the outer observation code
OID for indication is inconsistent (NCIt vs. E2B(R3) coded). This is a pattern concern, not
a missing field.

### G.k.9.i / G.k.9.ii — Dechallenge / Rechallenge

Both present as `outboundRelationship2 typeCode="COMP"` with codes C49492/C49494. No gap.

**GAP-F03 (MEDIUM):** G.k.9.i.2.r — structured causality assessment (source, method, result)
is absent. TC-M08 has dechallenge/rechallenge coded fields but not the linked causality
assessment fields G.k.9.i.2.r.1 through G.k.9.i.2.r.4. FDA Scenarios 1 and 8 include
`causalityAssessment classCode="OBS"` with:
- code=39 (causality), OID `.3.989.2.1.1.19`
- value CE (causality result)
- methodCode (assessment method)
- author (who assessed)
- subject1 (adverseEffectReference to reaction by UUID)
- subject2 (productUseReference to drug by UUID)

This requires drug UUIDs (see GAP-V05). G.k.9.i.2.r fields are Optional per ICH conformance
but Expected by FDA reviewers when a suspect drug is present and dechallenge is reported.

### G.k.10a / G.k.10.1 — Specialized Product Category (FDA-specific)

**GAP-V11 (HIGH):** TC-M08 has a combination product indicator at C.1.12 (correct), and has
G.k.12.r device component fields, but does NOT include the FDA-specific field
`FDA.G.k.10.1 Specialized Product Category` observation (code=`C156383` or equivalent
specialized product code in NCIt namespace).

Scenario 7 (device malfunction) includes an observation with NCIt code identifying the
product as a combination product or device. Without FDA.G.k.10.1, the combination product
classification may not be recognized at the drug level.

Additionally, `FDA.G.k.10a` (Additional Product Information) may be needed for the
auto-injector device component. Check Scenario 7 for the required structure.

### G.k.12.r — Device Component Fields

TC-M08 includes:
- G.k.12.r.2: Device type (`Testdevice Auto-Injector`)
- G.k.12.r.7.1: Device model number
- G.k.12.r.7.2: Device serial number
- G.k.12.r.7.3: Lot number (`DEVICE-LOT-2025-0084`)

These were added in the TC-M08 update. The OID pattern matches G.k.12.r elements from
Scenario 7. No structural gap on the device fields themselves, but see GAP-V11 for the
missing FDA.G.k.10.1 classification.

---

## Section H — Narrative

### H.1 — Case Narrative

Present as `<text>` on investigationEvent. Correct location. No gap.

### H.2 — Reporter's Comments

**GAP-F02 (MEDIUM):** TC-M08 is missing H.2 Reporter's Comments as a separate
`<observationEvent>` with author code=3 (`sourceReporter`, OID `.3.989.2.1.1.21`).

TC-M08 comment at line 908 labels a block as "H.2: Case Narrative" but implements it as:
```xml
<causalityAssessment classCode="OBS" moodCode="EVN">
  <code code="C53253" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Case Narrative"/>
  <value xsi:type="ED">TC-M08: Maternal/neonatal case...</value>
</causalityAssessment>
```

This is **doubly wrong**:
1. The element is `causalityAssessment`, not `observationEvent`
2. The code uses NCIt `C53253` rather than E2B(R3) code=10 (`comment`, OID `.3.989.2.1.1.19`)
3. The author block (indicating sourceReporter, code=3) is absent

**GAP-H01 (HIGH):** The comment block at lines 908-918 is the wrong XML element type.
A `causalityAssessment` element cannot appear as a direct child of `adverseEventAssessment`
at this position in the FDA schema. It must be `observationEvent` for this use case.

The correct H.2 pattern (from Scenario 7 line 636+):
```xml
<component1 typeCode="COMP">
  <observationEvent classCode="OBS" moodCode="EVN">
    <code code="10" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="comment"/>
    <value xsi:type="ED">Reporter's comments text here.</value>
    <author typeCode="AUT">
      <assignedEntity classCode="ASSIGNED">
        <code code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.21" displayName="sourceReporter"/>
      </assignedEntity>
    </author>
  </observationEvent>
</component1>
```

### H.3.r — Sender's Diagnosis

Present as `<component1><observationEvent code="15">` with author code=1 ("primaryReporter").

**GAP-V12 (LOW):** The H.3.r author uses displayName="primaryReporter" for code=1. The correct
displayName per OID `.3.989.2.1.1.21` value set is "sender" for code=1. The H.4 block
correctly uses displayName="sender" for code=1. This inconsistency within the same OID
vocabulary may cause displayName mismatch warnings.

### H.4 — Sender's Comments

Present as `<component1><observationEvent code="10">` with author code=1 ("sender").
Correct structure. No gap.

### H.5.r — Case Summary and Reporter's Comments

Present as `<observationEvent code="36">` with author code=2 ("reporter").

**GAP-C01 (LOW):** H.5.r.1b language is encoded as `language="ENG"` as an XML attribute on
the `<value>` element:
```xml
<value xsi:type="ED" language="ENG">
```

Per E2B(R3) specification, H.5.r.1b language should be encoded as a separate `<languageCode>`
element or via a `<translation>` child, not as an attribute on the value. The FDA XSD may
reject the `language` attribute. Compare with Scenario 1 H.5.r encoding.

---

## Cross-Section Structural Issues

### Missing UUID Cross-References

**GAP-V05 (MEDIUM):** TC-M08 drug `substanceAdministration` elements have no `<id>` attribute.
The FDA E2B(R3) schema requires drug substanceAdministration elements to carry a root UUID
so that `causalityAssessment` elements (G.k.1 drug role, G.k.9.i.2.r causality) can
reference the drug by ID. Without these IDs:
- G.k.1 via interventionCharacterization cannot cross-reference the drug
- G.k.9.i.2.r causality cross-reference to drug is impossible
- E.i adverse event assessments cannot be linked to specific drugs

Example from Scenario 1:
```xml
<substanceAdministration classCode="SBADM" moodCode="EVN">
  <id root="a1b2c3d4-e5f6-7890-abcd-ef1234567890"/>
  ...
```

### Observation Code OID Consistency

TC-M08 uses a mix of NCIt OIDs (`2.16.840.1.113883.3.26.1.1`) and E2B(R3) coded OIDs
(`.3.989.2.1.1.19`) for observation codes. The pattern should be:
- **Use E2B(R3) coded OID `.3.989.2.1.1.19`** for all standard E2B(R3) observation type codes
  (age, weight, seriousness, etc.)
- **Use NCIt OID `.3.26.1.1`** ONLY for FDA-specific fields not in the E2B(R3) code set
  (C.1.12 combination product indicator, G.k.12.r device codes, C.1.7.1 remedial action)

Affected fields with wrong OID:
- D.2.2a age observation (GAP-F01) — use code=3, OID .3.989.2.1.1.19
- D.3 body weight (GAP-V08) — use code=4, OID .3.989.2.1.1.19
- C.1.8.1 localCriteriaReportType (GAP-V01) — verify correct OID
- D.10.8.r.3 / G.k.7.r indication (GAP-V09) — use E2B(R3) indication code

---

## Prioritized Remediation Plan

### P1 — Blocking / Schema-Level Fixes (Must fix before resubmission)

1. **GAP-S01 + GAP-S02 + GAP-S03 + GAP-S04:** Restructure C.2.r / C.3 sections:
   - Add `outboundRelationship typeCode="SPRT"` with `code=2 (sourceReport)` containing all
     reporter fields, `priorityNumber value="1"`, and `asQualifiedEntity` with OID `.1.1.6`
   - Add separate `<subjectOf1>` for C.3 Sender with OID `.1.1.7` and organization details
   - Remove reporter data from current misplaced `<subjectOf1>`

2. **GAP-F01:** Fix D.2.2a age observation from NCIt to E2B(R3) OID:
   Change `code="C25150" codeSystem="2.16.840.1.113883.3.26.1.1"` to
   `code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"`

3. **GAP-H01:** Fix the H.2 "Case Narrative" block: change from `causalityAssessment` to
   `observationEvent`, change code to `code="10" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"`,
   add `author code="3" displayName="sourceReporter"`

### P2 — High-Risk Structural Changes (Fix before FDA reviewer scrutiny)

4. **GAP-S05 + GAP-V05:** Add UUID `<id>` to each drug `substanceAdministration`.
   Add separate `causalityAssessment/interventionCharacterization` component (code=20) for
   each drug, with `subject2/productUseReference` pointing to drug UUID.
   Remove the organizer `code="suspect"/"concomitant"` approach.

5. **GAP-V07:** Add `C.1.7.1` remedial action observationEvent for combination product report.

6. **GAP-V01:** Verify and fix C.1.8.1 OID — use E2B(R3) OID for localCriteriaReportType.

### P3 — Medium Risk (Reviewer flags, not immediate rejection)

7. **GAP-F02:** Add proper H.2 Reporter's Comments observationEvent with author code=3
8. **GAP-V03:** Fix PIVL_TS period from daily (1d) to biweekly (14d)
9. **GAP-V08:** Fix D.3 body weight observation OID to `.3.989.2.1.1.19` code=4
10. **GAP-C01:** Fix H.5.r.1b language encoding — remove XML attribute, use coded element
11. **GAP-V11:** Add FDA.G.k.10.1 Specialized Product Category for combination product drug

### P4 — Low Risk / Future Cleanup

12. **GAP-V10:** Remove non-standard NCIt-coded seriousness outboundRelationship2 elements
13. **GAP-V12:** Fix H.3.r author displayName from "primaryReporter" to "sender"
14. **GAP-C01 (LOINC):** Move LOINC codes from `translation` to primary `code` element for
    Tests 2+3

---

## Business Rules Quick Reference

| Rule | Requirement | TC-M08 Status |
|------|-------------|---------------|
| R0020 | C.2.r.4 required when C.2.r.5=1; C.2.r.5 required | VIOLATED — missing SPRT code=2; OID wrong |
| R0051 | D.10.6 (sex of parent) required if any D.10 element populated | SATISFIED |
| R0081 | G.k.6a required if neonate and maternal exposure | SATISFIED |
| R0082 | G.k.6b required if G.k.6a populated | SATISFIED |
| R0099 | H.5.r.1b required if H.5.r.1a populated | PARTIAL — XML attribute not coded element |
| R0100 | N.2.r.2 must match N.1.3 batch sender | SATISFIED (both 334818134) |
| W0005 | Warn if no Suspect or Interacting drug found | AT RISK — organizer code not parsed by FDA |

---

## FDA Scenario Pattern Compliance

| Pattern | Scenario(s) | TC-M08 | Gap? |
|---------|------------|--------|------|
| SPRT code=2 for C.2.r | 1, 7, 8 | MISSING | GAP-S01 |
| Separate subjectOf1 for C.3 | 1, 7, 8 | MISSING | GAP-S02 |
| asQualifiedEntity OID .1.1.6 | 1, 7, 8 | MISSING | GAP-S03 |
| priorityNumber for C.2.r.5 | 1, 7, 8 | MISSING | GAP-S04 |
| causalityAssessment code=20 for G.k.1 | 1, 7, 8 | MISSING | GAP-S05 |
| Drug UUID on substanceAdministration | 1, 7, 8 | MISSING | GAP-V05 |
| LOINC as primary code element | 1 | translation only | GAP-C01 |
| H.2 as observationEvent code=10 | 1, 7 | wrong element+OID | GAP-H01 |
| E2B(R3) OID for age observation | 1, 7, 8 | NCIt OID used | GAP-F01 |
| C.1.7.1 remedial action for combo product | 7 | MISSING | GAP-V07 |
| FDA.G.k.10.1 specialized product category | 7 | MISSING | GAP-V11 |
| PIVL_TS biweekly = 14d period | 1 | 1d (wrong) | GAP-V03 |

---

*Report generated: 2026-05-27 | Basis: CASE-20260523-MEGA5_v8.xml vs. FDA Business Rules v1.7
and FDA E2B(R3) ICSR XML Instances (Scenarios 1, 7, 8)*
