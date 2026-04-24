# SUSAR / IND Safety Report — Feature Specification
**For:** Claude Code — DeepQuence FAERS submission workflow  
**Document version:** 1.0  
**Date:** 2026-04-24  
**FDA scenario reference:** Reporting Scenarios PDF — Scenario 1 (Premarket IND or IND-Exempt BA/BE study)  
**Reference XML:** `FDA ICSR XML Instances/FAERS2022Scenario3.xml` (premarket IND, 3 drugs)  
**Reference XML:** `FDA ICSR XML Instances/FAERS2022Scenario5-1.xml` (IND-exempt BA/BE, includes G.k.10a.r)  

---

## 1. Overview

A SUSAR (Suspected Unexpected Serious Adverse Reaction) is an IND safety report submitted to CDER under 21 CFR 312.32. It is distinct from a postmarket spontaneous report (Scenario 7) in three ways:

1. It routes to a **different FDA gateway endpoint** (`ZZFDA_PREMKT` instead of `ZZFDA`)
2. It carries **IND-specific data elements** — IND number, study identifiers, drug role (test vs reference)
3. It uses **Type of Report = 2 (Report from study)** instead of 1 (Spontaneous)

The existing postmarket workflow (Scenario 7) must remain unchanged. SUSAR is a **new parallel report type** in the app.

---

## 2. Regulatory Context

| Attribute | Value |
|---|---|
| Regulation | 21 CFR 312.32 |
| Report type name | IND Safety Report / SUSAR |
| Submission deadline — fatal or life-threatening | **7 calendar days** from awareness |
| Submission deadline — other serious unexpected | **15 calendar days** from awareness |
| FDA gateway (test) | `ZZFDA_PREMKT` |
| FDA gateway (production) | `ZZFDA_PREMKT` (production) |
| CDER message receiver | `CDER_IND` |
| Type of report (C.1.3) | `2` — Report from study |
| Study type (C.5.4) | `1` — Clinical trials |

---

## 3. New Data Model Fields

These fields are required for SUSAR and do not exist in the current postmarket case model. Add them to the case data model under a new `indStudy` block.

### 3.1 Case-level fields (new)

| Field | E2B Code | Type | Required | Notes |
|---|---|---|---|---|
| Report type | C.1.3 | Enum | Required | Set to `2` (Report from study) for all SUSARs |
| Sponsor study number | C.5.3 | String | Optional | Internal sponsor protocol number. OID root `.3.5` |
| Study name / title | C.5.2 | String | Optional | Abbreviated trial name |
| Study type | C.5.4 | Enum | Required | `1` = Clinical trials |
| Study registration number | C.5.1.r.1 | String | Optional | e.g. NCT number. OID root `.3.6` |
| IND number where AE occurred | FDA.C.5.5a | String | **Required** | Primary IND number. OID root `2.16.840.1.113883.3.989.5.1.2.2.1.2.1` |
| Cross-referenced IND numbers | FDA.C.5.6.r | String[] | Optional | List of other INDs. OID root `2.16.840.1.113883.3.989.5.1.2.2.1.2.3` |

### 3.2 Drug-level fields (new, per drug)

| Field | E2B Code | Type | Required | Notes |
|---|---|---|---|---|
| Authorisation / application number | G.k.3.1 | String | Optional | IND number for the suspect drug (e.g. `IND123456`). OID root `.3.4` |
| FDA additional drug information | G.k.10a.r | Enum | **Required** for BA/BE studies | `1` = Test drug, `2` = Reference drug. Use `nullFlavor="NA"` for all non-test/reference drugs |

---

## 4. XML Generation Changes

### 4.1 Batch wrapper (MCCI_IN200100UV01)

**Batch receiver — change from postmarket:**
```xml
<!-- POSTMARKET (Scenario 7) -->
<id extension="ZZFDA" root="2.16.840.1.113883.3.989.2.1.3.14"/>
<!-- N.1.4: Batch Receiver Identifier -->

<!-- SUSAR / IND (Scenario 1) -->
<id extension="ZZFDA_PREMKT" root="2.16.840.1.113883.3.989.2.1.3.14"/>
<!-- N.1.4: Batch Receiver Identifier -->
```

### 4.2 Message wrapper (PORR_IN049016UV)

**Message receiver — change from postmarket:**
```xml
<!-- POSTMARKET -->
<id extension="CDER" root="2.16.840.1.113883.3.989.2.1.3.12"/>
<!-- N.2.r.3: Message Receiver Identifier -->

<!-- SUSAR / IND -->
<id extension="CDER_IND" root="2.16.840.1.113883.3.989.2.1.3.12"/>
<!-- N.2.r.3: Message Receiver Identifier -->
```

### 4.3 Type of report (C.1.3)

```xml
<!-- POSTMARKET -->
<value xsi:type="CE" code="1" displayName="Spontaneous report"
       codeSystem="2.16.840.1.113883.3.989.2.1.1.2"/>

<!-- SUSAR / IND -->
<value xsi:type="CE" code="2" displayName="Report from study"
       codeSystem="2.16.840.1.113883.3.989.2.1.1.2"/>
```

### 4.4 researchStudy block (NEW — IND only)

This entire block is absent from postmarket reports. Insert it as the first child of `subjectOf1`, before the existing `controlActEvent/author` block.

```xml
<subjectOf1 typeCode="SBJ">
  <researchStudy classCode="CLNTRL" moodCode="EVN">

    <!-- C.5.3: Sponsor Study Number -->
    <id extension="{sponsorStudyNumber}" root="2.16.840.1.113883.3.989.2.1.3.5"/>

    <!-- C.5.4: Study Type — code=1 Clinical trials -->
    <code code="1" displayName="Clinical trials"
          codeSystem="2.16.840.1.113883.3.989.2.1.1.8" codeSystemVersion="1.0"/>

    <!-- C.5.2: Study Name -->
    <title>{studyName}</title>

    <!-- C.5.1.r.1: Study Registration Number (e.g. NCT number) — omit if not available -->
    <authorization typeCode="AUTH">
      <studyRegistration classCode="ACT" moodCode="EVN">
        <id extension="{studyRegistrationNumber}" root="2.16.840.1.113883.3.989.2.1.3.6"/>
      </studyRegistration>
    </authorization>

    <!-- FDA.C.5.5a: IND Number where AE Occurred — REQUIRED -->
    <authorization typeCode="AUTH">
      <studyRegistration classCode="ACT" moodCode="EVN">
        <id extension="{indNumber}" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.1"/>
      </studyRegistration>
    </authorization>

    <!-- FDA.C.5.6.r: Cross-referenced IND numbers — repeat for each, omit if none -->
    <authorization typeCode="AUTH">
      <studyRegistration classCode="ACT" moodCode="EVN">
        <id extension="{crossRefIndNumber}" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.3"/>
      </studyRegistration>
    </authorization>

  </researchStudy>
</subjectOf1>
```

> **Note:** When `sponsorStudyNumber` or `studyName` are not available, omit those elements entirely rather than using nullFlavor. The IND number (`FDA.C.5.5a`) is the only required field in this block.

### 4.5 Drug authorisation number (G.k.3.1)

For the suspect drug carrying an IND number, add an `approval` block inside the drug's `kindOfProduct`:

```xml
<subjectOf typeCode="SBJ">
  <approval classCode="CNTRCT" moodCode="EVN">
    <!-- G.k.3.1: Authorisation / Application Number -->
    <id extension="{indNumberForDrug}" root="2.16.840.1.113883.3.989.2.1.3.4"/>
    <holder typeCode="HLD">
      <role classCode="HLD">
        <playingOrganization>
          <name>{sponsorOrgName}</name>
        </playingOrganization>
      </role>
    </holder>
  </approval>
</subjectOf>
```

### 4.6 FDA additional drug information G.k.10a.r (BA/BE studies only)

Required for IND-exempt BA/BE studies (Scenario 1 with `CDER_IND_EXEMPT_BA_BE` receiver). Add as an `outboundRelationship2` inside the `substanceAdministration` of each drug:

```xml
<!-- On the TEST drug -->
<outboundRelationship2 typeCode="COMP">
  <observation classCode="OBS" moodCode="EVN">
    <code code="9" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"
          codeSystemVersion="1.1" displayName="FDAAddDrugInformation"/>
    <value xsi:type="CE" code="1" displayName="Test"
           codeSystem="2.16.840.1.113883.3.989.2.1.1.7" codeSystemVersion="1.0"/>
    <!-- G.k.10a.r: FDA Additional Information on Drug (coded) -->
  </observation>
</outboundRelationship2>

<!-- On the REFERENCE drug -->
<outboundRelationship2 typeCode="COMP">
  <observation classCode="OBS" moodCode="EVN">
    <code code="9" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"
          codeSystemVersion="1.1" displayName="FDAAddDrugInformation"/>
    <value xsi:type="CE" code="2" displayName="Reference drug"
           codeSystem="2.16.840.1.113883.3.989.2.1.1.7" codeSystemVersion="1.0"/>
    <!-- G.k.10a.r: FDA Additional Information on Drug (coded) -->
  </observation>
</outboundRelationship2>

<!-- On all other drugs (not test or reference) -->
<outboundRelationship2 typeCode="COMP">
  <observation classCode="OBS" moodCode="EVN">
    <code code="9" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"
          codeSystemVersion="1.1" displayName="FDAAddDrugInformation"/>
    <value xsi:type="CE" nullFlavor="NA"
           codeSystem="2.16.840.1.113883.3.989.2.1.1.7" codeSystemVersion="1.0"/>
    <!-- G.k.10a.r: nullFlavor NA for non-test/reference drugs -->
  </observation>
</outboundRelationship2>
```

> For standard IND reports (not BA/BE), `G.k.10a.r` is **not required**. Only populate it for `CDER_IND_EXEMPT_BA_BE` submissions.

---

## 5. App Code Changes

### 5.1 New report type enum

```typescript
// In caseModel.ts or reportTypes.ts
export enum ReportType {
  POSTMARKET_SPONTANEOUS = 'POSTMARKET_SPONTANEOUS',   // existing Scenario 7
  IND_SAFETY_REPORT      = 'IND_SAFETY_REPORT',        // new — Scenario 1 (SUSAR)
  // Future: SOLICITED, AGGREGATE, etc.
}
```

### 5.2 New data model interface

```typescript
// New interface — add to caseModel.ts
export interface IndStudyInfo {
  indNumber: string;                    // FDA.C.5.5a — REQUIRED
  sponsorStudyNumber?: string;          // C.5.3
  studyName?: string;                   // C.5.2
  studyRegistrationNumber?: string;     // C.5.1.r.1 (e.g. NCT number)
  crossReferencedIndNumbers?: string[]; // FDA.C.5.6.r
}

// Extend FaersCase or equivalent
export interface FaersCase {
  // ... existing fields ...
  reportType: ReportType;               // new — defaults to POSTMARKET_SPONTANEOUS
  indStudy?: IndStudyInfo;              // new — required when reportType = IND_SAFETY_REPORT
}

// Extend drug model
export interface FaersDrug {
  // ... existing fields ...
  indAuthorizationNumber?: string;      // G.k.3.1 — IND number for this drug
  fdaAdditionalDrugInfo?: 'TEST' | 'REFERENCE' | 'NA'; // G.k.10a.r — BA/BE only
}
```

### 5.3 XML generator changes (xmlGeneratorService.ts)

Add a `buildResearchStudyBlock(indStudy: IndStudyInfo): string` function and call it inside `buildSubjectOf1()` when `reportType === IND_SAFETY_REPORT`.

Add a `buildDrugApprovalBlock(drug: FaersDrug): string` function and call it inside the drug `kindOfProduct` builder.

Change batch and message receiver IDs based on `reportType`:

```typescript
const batchReceiverId  = reportType === ReportType.IND_SAFETY_REPORT ? 'ZZFDA_PREMKT' : 'ZZFDA';
const msgReceiverId    = reportType === ReportType.IND_SAFETY_REPORT ? 'CDER_IND'     : 'CDER';
const typeOfReportCode = reportType === ReportType.IND_SAFETY_REPORT ? '2'            : '1';
```

### 5.4 5-pass validator changes (fivePassValidatorService.ts)

**Pass 1 — Element count:** IND reports will have more elements than 296 (Scenario 3 has 486). Do not apply the 296-element check to IND reports. Gate by report type.

**Pass 3 — Business rule codes:** Add IND-specific valid values:
- `C.5.4` Study type: `1` (Clinical trials), `2` (Individual patient use), `3` (Other studies)
- `G.k.10a.r`: `1` (Test), `2` (Reference drug), nullFlavor `NA`
- `C.1.3`: `2` (Report from study) — add to valid values

**Pass 5 — Empirical safety:** All IND field values are UNTESTED until live submissions confirm them. Flag every IND submission as containing untested values until the ZZFDA_PREMKT empirical policy is populated.

### 5.5 faersEmpiricalPolicy.ts changes

Add a new `IND_POLICY` table parallel to `FAERS_POLICY`:

```typescript
export const IND_POLICY = {
  indNumber:        { required: true,  verdict: 'untested' },
  studyType:        { code: '1',       verdict: 'untested' },
  typeOfReport:     { code: '2',       verdict: 'untested' },
  drugRoleTest:     { code: '1',       verdict: 'untested' },
  drugRoleRef:      { code: '2',       verdict: 'untested' },
  batchReceiver:    { value: 'ZZFDA_PREMKT', verdict: 'untested' },
  msgReceiver:      { value: 'CDER_IND',     verdict: 'untested' },
};
// Update after first CA+AA from ZZFDA_PREMKT test submissions
```

### 5.6 ACK parser changes (ackParserService.ts)

No changes required — the ACK3 XML structure is identical for both postmarket and IND submissions. The parser already extracts `typeCode` (CA/CR/AA/AR) and rejection text. Add logic to tag the parsed ACK with the originating report type for empirical policy routing.

### 5.7 UI changes

Add a **Report Type** selector on the case creation screen:
- "Postmarket Spontaneous" (default)
- "IND Safety Report (SUSAR)"

When "IND Safety Report" is selected, show the `IndStudyInfo` form section:
- IND Number (required, validated as numeric string)
- Sponsor Study Number (optional)
- Study Name (optional)
- Study Registration Number e.g. NCT (optional)
- Cross-referenced IND Numbers (optional, repeating)

Per-drug: show a **Drug Role** selector (Test / Reference / Not Applicable) that maps to `G.k.10a.r`.

---

## 6. SR-Number Format for IND Reports

Use the same `SR-{caseId}` pattern as postmarket reports. No separate format is required for IND. Example: `SR-CASE-20260501-WXYZ`.

---

## 7. Test Plan — ZZFDA_PREMKT Submissions

All IND test submissions go to the **ZZFDA_PREMKT** test endpoint (not ZZFDATST). These are separate test environments.

### Phase 1 — Baseline IND (2 submissions required for production approval)

| Test ID | Description | Change from baseline | Target |
|---|---|---|---|
| IND-T01 | Basic SUSAR — 1 suspect IND drug | N.1.4=ZZFDA_PREMKT, CDER_IND, C.1.3=2, C.5.4=1, C.5.5a=IND number | CA+AA |
| IND-T02 | Repeat of IND-T01 with different case ID | Identical structure, new batch UUID | CA+AA |

> Per FDA guidance: two positive ACKs required before production access.

### Phase 2 — Structural variants

| Test ID | Description | Risk |
|---|---|---|
| IND-T03 | SUSAR with cross-referenced IND (FDA.C.5.6.r) | Low |
| IND-T04 | SUSAR with study registration number (NCT) | Low |
| IND-T05 | SUSAR — fatal outcome (7-day report) + `resultsInDeath=true` | Medium |
| IND-T06 | BA/BE study — G.k.10a.r = 1 (Test) + 2 (Reference) | Medium |
| IND-T07 | Follow-up IND report (amendment, version 3) | High |

### JSON example file structure

Create `test_submission/examples/cases/IND-T01-susar-baseline.json` following the existing example format:

```json
{
  "$schema": "faers-case-import-v1",
  "exampleId": "IND-T01-susar-baseline",
  "description": "Baseline SUSAR / IND safety report. N.1.4=ZZFDA_PREMKT, CDER_IND, C.1.3=2 (Report from study), C.5.4=1 (Clinical trials). Single suspect IND drug.",
  "baseline": "Scenario 3 (FAERS2022Scenario3.xml)",
  "reportType": "IND_SAFETY_REPORT",
  "case": {
    "safetyReportId": "SR-CASE-EXAMPLE-INDT01",
    "worldwideCaseId": "SR-CASE-EXAMPLE-INDT01",
    "reportType": "Report from study",
    "initialOrFollowup": "Initial",
    "receiptDate": "2026-03-15",
    "receiveDate": "2026-03-15",
    "expeditedReport": true,
    "localReportTypeCode": 1
  },
  "indStudy": {
    "indNumber": "123456",
    "sponsorStudyNumber": "CT-00-01",
    "studyName": "Phase II Study of Testdrugimab in Rheumatoid Arthritis",
    "studyType": "Clinical trials"
  },
  "patient": {
    "initials": "T.P.",
    "sex": "Male",
    "birthDate": "1970-05-15",
    "ageValue": 55,
    "ageUnit": "Year",
    "weightKg": 82,
    "race": "C41260",
    "ethnicity": "C41222",
    "medicalHistoryText": "None reported"
  },
  "drugs": [
    {
      "name": "Testdrugimab",
      "role": "Suspect",
      "indAuthorizationNumber": "IND123456",
      "actionTaken": 1,
      "dechallenge": 3,
      "rechallenge": 3
    }
  ]
}
```

---

## 8. Empirical Questions to Resolve via Testing

The following are UNTESTED for IND submissions. Resolve by running IND-T01 and IND-T02 first, then the specific tests below:

| Question | Test | Risk |
|---|---|---|
| Is `C.5.3` (sponsor study number) required or truly optional? | Omit in IND-T01, include in IND-T02 | Low |
| Is `C.5.2` (study title) required or truly optional? | Omit in IND-T01, include in IND-T02 | Low |
| Is `G.k.3.1` (IND drug auth number) required for the suspect drug? | Omit in IND-T01 | Medium |
| Does a fatal IND SUSAR require different seriousness fields than postmarket? | IND-T05 | Medium |
| Is race/ethnicity enforcement (C41260/C41222) the same on ZZFDA_PREMKT as on ZZFDA? | Observe IND-T01 ACK | Medium |

---

## 9. Out of Scope for This Spec

The following FDA reporting scenarios are **not** included in this specification and should be addressed in separate specs if needed:

| Scenario | Description |
|---|---|
| Scenario 2 | Solicited reports / Organized Data Collection System |
| Scenario 3 | Aggregate IND report (D.1 = "AGGREGATE") |
| Scenario 4 | IND with cross-referenced INDs only (no other changes) |
| Scenario 6 | Dual submission — IND + NDA/BLA for postmarket study |
| Scenario 8/9 | IND not approved/not marketed anywhere |

---

## 10. Key OIDs Reference

| Field | OID Root |
|---|---|
| IND Number where AE occurred (FDA.C.5.5a) | `2.16.840.1.113883.3.989.5.1.2.2.1.2.1` |
| Cross-referenced IND (FDA.C.5.6.r) | `2.16.840.1.113883.3.989.5.1.2.2.1.2.3` |
| Study Registration Number (C.5.1.r.1) | `2.16.840.1.113883.3.989.2.1.3.6` |
| Sponsor Study Number (C.5.3) | `2.16.840.1.113883.3.989.2.1.3.5` |
| Drug Auth/IND Number (G.k.3.1) | `2.16.840.1.113883.3.989.2.1.3.4` |
| Study Type codeset (C.5.4) | `2.16.840.1.113883.3.989.2.1.1.8` |
| FDA Additional Drug Info codeset (G.k.10a.r) | `2.16.840.1.113883.3.989.2.1.1.7` |
| Batch Receiver Identifier | `2.16.840.1.113883.3.989.2.1.3.14` |
| Message Receiver Identifier | `2.16.840.1.113883.3.989.2.1.3.12` |

---

*End of specification. Reference FAERS2022Scenario3.xml and FAERS2022Scenario5-1.xml for working XML examples of all elements above.*
