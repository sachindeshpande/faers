# Mega File XML Package — Required Fixes for Workflow Code

**Document purpose:** Codify every schema/business-rule fix discovered during the TC-M01 through TC-M04 manual submission campaigns. Each fix was confirmed empirically by an FDA ZZFDATST ACK3 response. All fixes must be applied to the XML generation workflow before app-generated mega files are submitted.

**Reference accepted files:**
- TC-M01 accepted: `CASE-EXAMPLE-TCD05` (ci260512175821, CA+AA)
- TC-M02 accepted: `CASE-20260513-MEGA-IND` (ci260515025404, CA+AE)
- TC-M03 accepted: `CASE-20260518-MEGA_v6` (ci260519222153, CA+AA, Local #882474)
- TC-M04 accepted: `CASE-20260519-MEGA2_v5` (ci260525042934, CA+AA, Local #890060)

---

## TC-M01 — Postmarket Mega File (all optional drug/authorization/attachment elements)

**Campaign:** 2 submissions. v1 rejected (SAX). v2 accepted CA+AA.

### Fix M01-1: Drug Authorization `classCode` — `REG` → `CNTRCT`

**ACK error (ci260512171238):**
```
org.xml.sax.SAXParseException; lineNumber: 291; columnNumber: 72;
cvc-enumeration-valid: Value 'REG' is not facet-valid with respect to
enumeration '[CNTRCT, FCNTRCT, COV]'.
```

**Root cause:** The drug authorization approval element (`G.k.2.3.r`) was generated with `classCode="REG"`. The FAERS E2B(R3) schema's enumeration for the approval/authorization act only permits `CNTRCT`, `FCNTRCT`, or `COV`.

**Required fix:** Wherever the workflow generates a drug authorization block (G.k.2.3.r), the `classCode` attribute must be set to `CNTRCT` (contract/authorization), not `REG` (regulatory approval).

**Before (incorrect):**
```xml
<approval classCode="REG" moodCode="EVN">
```

**After (correct):**
```xml
<approval classCode="CNTRCT" moodCode="EVN">
```

---

## TC-M02 — Premarket IND Mega File (all optional IND elements)

**Campaign:** ~7 submissions. Multiple SAX rejections. Accepted CA+AE (ci260515025404).

### Fix M02-1: Literature Reference — `<id>` must not appear before `<code>` in the `document` element

**ACK error (ci260513180628):**
```
org.xml.sax.SAXParseException; lineNumber: 44; columnNumber: 49;
cvc-complex-type.2.4.a: Invalid content was found starting with element
'{"urn:hl7-org:v3":id}'. One of '{"urn:hl7-org:v3":realmCode,
"urn:hl7-org:v3":typeId, "urn:hl7-org:v3":templateId, "urn:hl7-org:v3":code,
"urn:hl7-org:v3":title, "urn:hl7-org:v3":text,
"urn:hl7-org:v3":bibliographicDesignationText,
"urn:hl7-org:v3":participation}' is expected.
```

**Root cause:** The literature reference `document` element (C.4.r) had `<id>` placed before `<code>`. The schema requires `<code>` or `<title>` as the first meaningful child — `<id>` is not a valid first child of the `document` element in this context.

**Required fix:** Remove or relocate the `<id>` element from the literature reference `document` block. The correct structure uses only `<code>`, `<title>`, `<text>`, `<bibliographicDesignationText>`, and `<participation>`. Do not emit `<id>` inside `<document>` for literature references.

**Correct structure:**
```xml
<reference typeCode="REFR">
  <document classCode="DOC" moodCode="EVN">
    <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.26"/>
    <bibliographicDesignationText>Author et al. Journal 2026;1:1-10.</bibliographicDesignationText>
  </document>
</reference>
```

### Fix M02-2: Drug Dosing — `<effectiveTime>` must not appear after `<doseQuantity>` in `substanceAdministration`

**ACK error (ci260514021202):**
```
org.xml.sax.SAXParseException; lineNumber: 203; columnNumber: 83;
cvc-complex-type.2.4.a: Invalid content was found starting with element
'{"urn:hl7-org:v3":effectiveTime}'. One of '{"urn:hl7-org:v3":rateQuantity,
"urn:hl7-org:v3":doseCheckQuantity, "urn:hl7-org:v3":maxDoseQuantity,
"urn:hl7-org:v3":administrationUnitCode, "urn:hl7-org:v3":consumable, ...'
is expected.
```

**Root cause:** Inside a `substanceAdministration` element (G.k.4.r dosing repeat), the workflow was emitting `<effectiveTime>` after `<doseQuantity>`. The schema requires `<effectiveTime>` to appear *before* `<doseQuantity>`.

**Required fix:** Enforce this child-element order within every `substanceAdministration` dosing block:

```
substanceAdministration child order:
  1. effectiveTime      (G.k.4.r.1a / G.k.4.r.2 — start/end or period)
  2. routeCode          (G.k.4.r.10.1 — optional)
  3. doseQuantity       (G.k.4.r.5a/b — optional)
  4. rateQuantity       (optional)
  5. administrationUnitCode  (G.k.4.r.7 — optional)
  6. consumable         (drug name reference)
  7. outboundRelationship1/2  (additional dosing flags)
```

**Before (incorrect — effectiveTime after doseQuantity):**
```xml
<substanceAdministration classCode="SBADM" moodCode="EVN">
  <doseQuantity value="200" unit="mg"/>
  <effectiveTime xsi:type="IVL_TS">
    <low value="20260115"/>
  </effectiveTime>
  <consumable .../>
</substanceAdministration>
```

**After (correct):**
```xml
<substanceAdministration classCode="SBADM" moodCode="EVN">
  <effectiveTime xsi:type="IVL_TS">
    <low value="20260115"/>
  </effectiveTime>
  <doseQuantity value="200" unit="mg"/>
  <consumable .../>
</substanceAdministration>
```

---

## TC-M03 — Postmarket Mega File v2 (dual reactions, full seriousness matrix, optional patient/drug sections)

**Campaign:** 6 submissions (v1–v6). Multiple SAX rejections (v1–v5). Accepted CA+AA on v6 (ci260519222153).

### Fix M03-1: Lab Result Section (F.r) — `<effectiveTime>` element order inside `observationEvent`

**ACK error (ci260518195206, MEGA v1):**
```
org.xml.sax.SAXParseException; lineNumber: 370; columnNumber: 60;
cvc-complex-type.2.4.a: Invalid content was found starting with element
'{"urn:hl7-org:v3":effectiveTime}'. One of '{"urn:hl7-org:v3":realmCode,
"urn:hl7-org:v3":typeId, "urn:hl7-org:v3":templateId,
"urn:hl7-org:v3":id, "urn:hl7-org:v3":code}' is expected.
```

**Root cause:** Inside the F.r lab test observation block, `<effectiveTime>` (the test date) was placed before `<code>`. Schema requires `<code>` to precede `<effectiveTime>`.

**Required fix:** Lab result `observation` elements must follow this child order:

```
F.r observation child order:
  1. id            (optional UUID)
  2. code          (F.r.2.1 — test name MedDRA code)
  3. effectiveTime (F.r.1 — test date)
  4. value         (F.r.3.1/3.2 — result value/unit or qualifier)
  5. interpretationCode   (F.r.7 — normal/abnormal flag)
  6. referenceRange       (F.r.5/6 — normal range, optional)
```

### Fix M03-2: Lab Result `interpretationCode` — element order inside `observationRange`

**ACK error (ci260518215619, MEGA v2):**
```
org.xml.sax.SAXParseException; lineNumber: 382; columnNumber: 97;
cvc-complex-type.2.4.a: Invalid content was found starting with element
'{"urn:hl7-org:v3":interpretationCode}'. One of '{"urn:hl7-org:v3":realmCode,
"urn:hl7-org:v3":typeId, "urn:hl7-org:v3":templateId,
"urn:hl7-org:v3":value}' is expected.
```

**Root cause:** Inside a `referenceRange/observationRange` block (F.r normal range), `<interpretationCode>` was emitted before `<value>`. Schema requires `<value>` first.

**Required fix:** Within `referenceRange/observationRange`, emit `<value>` (the range interval) before `<interpretationCode>`:

```xml
<referenceRange typeCode="REFV">
  <observationRange classCode="OBS" moodCode="EVN.CRT">
    <value xsi:type="IVL_PQ">
      <low value="7" unit="U/L"/>
      <high value="40" unit="U/L"/>
    </value>
    <interpretationCode code="N" codeSystem="2.16.840.1.113883.5.83"/>
  </observationRange>
</referenceRange>
```

### Fix M03-3: Dosing `effectiveTime` — remove `<width>` element

**ACK error (ci260519020917, MEGA v3):**
```
org.xml.sax.SAXParseException; lineNumber: 515; columnNumber: 63;
cvc-complex-type.2.4.d: Invalid content was found starting with element
'width'. No child element is expected at this point.
```

**Root cause:** A dosing `effectiveTime` element (G.k.4.r.2 — dosing period) contained a `<width>` child. `<width>` is not a valid sub-element in this context.

**Required fix:** Dosing `effectiveTime` must use only `<low>` / `<high>` / `<period>` sub-elements. Do not emit `<width>` inside dosing-related `effectiveTime`.

**Before (incorrect):**
```xml
<effectiveTime xsi:type="IVL_TS">
  <low value="20260115"/>
  <high value="20260305"/>
  <width value="49" unit="d"/>   <!-- REMOVE THIS -->
</effectiveTime>
```

**After (correct):**
```xml
<effectiveTime xsi:type="IVL_TS">
  <low value="20260115"/>
  <high value="20260305"/>
</effectiveTime>
```

### Fix M03-4: Narrative Text (H.5.r) — language code must be ISO 639-2 alpha-3 (`ENG`), not ISO 639-1 alpha-2 (`en`)

**Root cause:** The narrative `text` element for H.5.r (case narrative or sender's comment) used `language="en"` (2-letter ISO 639-1 code). The FAERS schema requires the 3-letter ISO 639-2 code.

**Required fix:** Set `language="ENG"` (uppercase alpha-3) on all narrative text elements.

**Before (incorrect):**
```xml
<text language="en">Patient narrative...</text>
```

**After (correct):**
```xml
<text language="ENG">Patient narrative...</text>
```

---

## TC-M04 — Comprehensive Postmarket Mega File v3 (lab results, combination product, full seriousness matrix)

**Campaign:** 5 versions. v1 submitted (SAX reject). v2 pre-validated via FDA web validator (14 rejections, not submitted). v3 submitted (9 business-rule rejections). v4 built but not submitted (pre-flight caught issue). v5 submitted CA+AA (ci260525042934).

### Fix M04-1: Medical History Comment (D.7.1.r.5) — use `inboundRelationship`, not `outboundRelationship2`

**ACK error (ci260520044936, MEGA2 v1):**
```
org.xml.sax.SAXParseException; lineNumber: 149; columnNumber: 64;
cvc-complex-type.2.4.a: Invalid content was found starting with element
'{"urn:hl7-org:v3":outboundRelationship2}'. One of
'{"urn:hl7-org:v3":inboundRelationship}' is expected.
```

**Root cause:** The D.7.1.r.5 (comment on medical history entry) was encoded as an `outboundRelationship2` element nested inside a medical history `observation`. The schema only permits `inboundRelationship` at that position.

**Required fix option A (preferred):** Omit D.7.1.r.5 entirely when no comment is needed. The field is optional and its absence does not cause a rejection.

**Required fix option B:** If D.7.1.r.5 must be populated, encode it as an `inboundRelationship` element (not `outboundRelationship2`). Verify against the schema that the nested relationship type and classCode are correct for this context.

**Before (incorrect):**
```xml
<observation classCode="OBS" moodCode="EVN">
  <!-- D.7.1.r fields -->
  <outboundRelationship2 typeCode="PERT">   <!-- WRONG -->
    <observation classCode="OBS" moodCode="EVN">
      <code code="D.7.1.r.5" .../>
      <value xsi:type="ST">Comment text</value>
    </observation>
  </outboundRelationship2>
</observation>
```

**After (correct — omit or use inboundRelationship):**
```xml
<observation classCode="OBS" moodCode="EVN">
  <!-- D.7.1.r fields — no outboundRelationship2 here -->
</observation>
```

### Fix M04-2: Seriousness Criteria (E.i.3.2a–f) — all six must be present for every reaction, false criteria use `BL value="false"` (not omitted, not nullFlavor)

**ACK error (ci260525033444, MEGA2 v3) — 9 business-rule violations:**
```
Safety report not loaded; Validated against 2.18 business rules;
Rejections:
1: Data value required for tag E.i.3.2b.
2: Data value required for tag E.i.3.2e.
3: Data value required for tag E.i.3.2c.
4: Data value required for tag E.i.3.2a.
5: Data value required for tag E.i.3.2d.
6: Data value required for tag E.i.3.2f.
7: Data value required for tag E.i.3.2e.
8: Data value required for tag E.i.3.2f.
9: Data value required for tag E.i.3.2d.
```

**Root cause:** An earlier attempt (MEGA2 v3) removed the `BL value="false"` seriousness criteria elements after they were flagged by the FDA web validator at `faers-validator.fda.gov`. Removing the elements caused the FAERS 2.18 ESG engine to report "Data value required" for all absent criteria. The two validation systems have directly contradictory rules on this point:

| Validator | Rule for false seriousness criteria |
|---|---|
| FDA web validator (faers-validator.fda.gov) | `BL value="false"` is NOT allowed — omit the element |
| FAERS 2.18 ESG production engine (ZZFDATST) | Element MUST be present; absence = "Data value required" |

**The ESG production engine governs acceptance. Always follow the ESG rule.**

**Required fix:** For every reaction (`observation` with `code="29"` displayName="reaction"), emit all six seriousness criteria as `outboundRelationship2` elements, regardless of whether they are true or false. False criteria use `value="false"`.

The six codes and their E2B(R3) field labels:

| code | displayName | E2B label |
|---|---|---|
| `34` | `resultsInDeath` | E.i.3.2a |
| `21` | `isLifeThreatening` | E.i.3.2b |
| `33` | `requiresInpatientHospitalization` | E.i.3.2c |
| `35` | `resultsInPersistentOrSignificantDisability` | E.i.3.2d |
| `12` | `congenitalAnomalyBirthDefect` | E.i.3.2e |
| `26` | `otherMedicallyImportantCondition` | E.i.3.2f |

**Correct pattern (accepted by ESG) — example for a non-fatal reaction where no criterion applies:**
```xml
<outboundRelationship2 typeCode="PERT">
  <observation classCode="OBS" moodCode="EVN">
    <code code="34" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="resultsInDeath"/>
    <value xsi:type="BL" value="false"/>
  </observation>
</outboundRelationship2>
<outboundRelationship2 typeCode="PERT">
  <observation classCode="OBS" moodCode="EVN">
    <code code="21" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="isLifeThreatening"/>
    <value xsi:type="BL" value="false"/>
  </observation>
</outboundRelationship2>
<outboundRelationship2 typeCode="PERT">
  <observation classCode="OBS" moodCode="EVN">
    <code code="33" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="requiresInpatientHospitalization"/>
    <value xsi:type="BL" value="false"/>
  </observation>
</outboundRelationship2>
<outboundRelationship2 typeCode="PERT">
  <observation classCode="OBS" moodCode="EVN">
    <code code="35" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="resultsInPersistentOrSignificantDisability"/>
    <value xsi:type="BL" value="false"/>
  </observation>
</outboundRelationship2>
<outboundRelationship2 typeCode="PERT">
  <observation classCode="OBS" moodCode="EVN">
    <code code="12" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="congenitalAnomalyBirthDefect"/>
    <value xsi:type="BL" value="false"/>
  </observation>
</outboundRelationship2>
<outboundRelationship2 typeCode="PERT">
  <observation classCode="OBS" moodCode="EVN">
    <code code="26" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="otherMedicallyImportantCondition"/>
    <value xsi:type="BL" value="false"/>
  </observation>
</outboundRelationship2>
```

### Fix M04-3: Required Intervention (FDA.E.i.3.2h, code=7) — use `BL value="false"`, not `nullFlavor="NI"`

**Root cause (caught during pre-flight, MEGA2 v4):** When an intervention was not required, the workflow was generating `nullFlavor="NI"` for the `requiredIntervention` observation (code=7, codeSystem `2.16.840.1.113883.3.989.5.1.2.2.1.3`). All accepted golden files (TC-G01, TC-G04, TC-M03) consistently use `BL value="false"` for this field when intervention did not occur.

> **Note:** The FDA web validator at `faers-validator.fda.gov` also flags `BL value="false"` as invalid for `requiredIntervention` — this is another instance where the web validator and ESG production engine disagree. Always follow the ESG pattern.

**Required fix:** Emit `requiredIntervention` with `BL value="false"` when intervention did not occur or is not applicable. Do not use `nullFlavor="NI"`.

**Before (incorrect):**
```xml
<outboundRelationship2 typeCode="PERT">
  <observation classCode="OBS" moodCode="EVN">
    <code code="7" codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.3" displayName="requiredIntervention"/>
    <value xsi:type="BL" nullFlavor="NI"/>   <!-- WRONG -->
  </observation>
</outboundRelationship2>
```

**After (correct):**
```xml
<outboundRelationship2 typeCode="PERT">
  <observation classCode="OBS" moodCode="EVN">
    <code code="7" codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.3" displayName="requiredIntervention"/>
    <value xsi:type="BL" value="false"/>
  </observation>
</outboundRelationship2>
```

---

## Summary Table

| Fix ID | Test Case | Category | Field / Section | Rule |
|---|---|---|---|---|
| M01-1 | TC-M01 | Schema | G.k.2.3.r drug authorization | `classCode="CNTRCT"` not `"REG"` |
| M02-1 | TC-M02 | Schema | C.4.r literature reference | No `<id>` inside `<document>`; use `code`/`bibliographicDesignationText` |
| M02-2 | TC-M02 | Schema | G.k.4.r dosing | `<effectiveTime>` must precede `<doseQuantity>` in `substanceAdministration` |
| M03-1 | TC-M03 | Schema | F.r lab test | `<code>` must precede `<effectiveTime>` in lab `observation` |
| M03-2 | TC-M03 | Schema | F.r lab range | `<value>` must precede `<interpretationCode>` in `observationRange` |
| M03-3 | TC-M03 | Schema | G.k.4.r dosing | No `<width>` inside dosing `effectiveTime`; use only `<low>`/`<high>` |
| M03-4 | TC-M03 | Business rule | H.5.r narrative | `language="ENG"` (ISO 639-2 alpha-3), not `language="en"` |
| M04-1 | TC-M04 | Schema | D.7.1.r.5 medical history comment | No `outboundRelationship2` inside medical history `observation`; only `inboundRelationship` allowed |
| M04-2 | TC-M04 | Business rule | E.i.3.2a–f seriousness criteria | All 6 criteria required per reaction; false criteria use `BL value="false"`, never omitted |
| M04-3 | TC-M04 | Business rule | FDA.E.i.3.2h requiredIntervention | When not applicable, use `BL value="false"`, not `nullFlavor="NI"` |

---

## Critical ESG vs. Web Validator Discrepancies

Two FAERS validation systems give contradictory guidance on seriousness criteria. **The ESG production engine (ACK3) is authoritative.** The web validator (`faers-validator.fda.gov`) can be used for a first-pass structural check, but its rulings on BL boolean fields must not be used to override the empirically confirmed ESG behavior.

| Field | Web Validator says | ESG Production says | Follow |
|---|---|---|---|
| E.i.3.2a–f false criteria | Omit element (BL=false not allowed) | Element required; absence = "Data value required" | **ESG — keep `BL value="false"`** |
| FDA.E.i.3.2h requiredIntervention (when N/A) | Use `nullFlavor="NI"` | `BL value="false"` (all accepted golden files) | **ESG — use `BL value="false"`** |

---

## Accepted Golden File References

The following files have been confirmed CA+AA and serve as ground-truth encoding templates for the workflow:

| File | SafetyReportID | Local # | What it covers |
|---|---|---|---|
| `golden/postmarket/accepted/xml/TC-G01-nonserous.xml` | — | — | Non-serious reaction with all 6 seriousness criteria = false |
| `golden/postmarket/accepted/xml/TC-G04-fatal-outcome.xml` | — | — | Fatal reaction with mixed true/false seriousness criteria |
| `from_app/CASE-20260518-MEGA_v6.xml` | SR-CASE-20260518-MEGA | 882474 | Full mega file with dual reactions + optional sections |
| `from_app/CASE-20260519-MEGA2_v5.xml` | SR-CASE-20260519-MEGA2 | 890060 | Full mega file with lab results, combination product, dual reactions |

When in doubt, compare generated output element-by-element against these files before submitting.
