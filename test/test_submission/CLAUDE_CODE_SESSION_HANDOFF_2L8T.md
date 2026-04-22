# Claude Code Session Handoff — DeepQuence FAERS Submission Workflow

**Purpose:** Give a new Claude Code session everything needed to continue building the DeepQuence FAERS XML generation and validation workflow.

**Date:** April 21, 2026 (ACK3 + app pipeline); last doc revision reflects the in-app validator stack landed after 2L8T was accepted.
**Status: APP-GENERATED SUBMISSION ACCEPTED — 2L8T achieved CA+AA. The 5-pass validator, ACK parser, and UI panels are now wired into the app.**

---

## 1) Where We Are

The DeepQuence application now produces FAERS-compliant E2B(R3) ICSR XML that passes the CDER FAERS 2.18 business-rule validation pipeline. This was confirmed on April 21, 2026, when `CASE-20260421-2L8T.xml` (generated entirely by the app) received CA+AA from the ZZFDATST test environment.

The project had two phases:

- **Phase 1 (v1–v37):** Hand-crafted a valid XML file through 37 iterations. v37 (`package/CASE-20260331-EMJQ_fixed_v37_patch.xml`) was the first CA+AA. This became the golden reference.
- **Phase 2 (CF97–2L8T):** Got the app to produce output matching v37's structure. Five app-generated submissions were tested: CF97 (rejected), 2GZK (rejected), QTXZ (rejected), 26ZL (rejected), 2L8T (accepted).

---

## 2) Stable Configuration

| Item | Value |
|------|-------|
| Company | DeepQuence |
| DUNS | 334818134 |
| Email domain | @deepquence.com |
| Submission Type | AERS |
| Destination | CDER |
| Test submission | Yes |
| File Type | SINGLE |
| TEST batch receiver | ZZFDATST |
| PORR receiver | CDER |
| Format | E2B(R3) HL7 v3 ICSR XML |
| Validation engine | FAERS 2.18 business rules |

---

## 3) Golden Reference Files (do not modify)

- `package/CASE-20260331-EMJQ_fixed_v37_patch.xml` — the first accepted XML (v37, CA+AA)
- `from_app/CASE-20260421-2L8T.xml` — the first app-generated accepted XML (CA+AA)
- `acks/ci260410211359.1842efd7d3d24e7cbd5a9703e90bdebc.ack` — v37 acceptance ACK
- `acks/ci260421211040.39a4bea3542d4f6081340d5c03a105f3.ack` — 2L8T acceptance ACK
- `FAERS_Workflow_Engineering_Report.docx` — original engineering specification (v1–v37)
- `FAERS_Final_Summary_Report.docx` — complete project summary including Phase 2

---

## 4) App-Generated Submission History

| Submission | Date | ACK3 Result | Rejections | Fix Applied |
|---|---|---|---|---|
| CF97 | 04/12 | CR+AR | E.i.7 | First app submission |
| 2GZK | 04/13 | CR+AR | D.7.2, FDA.D.11.r.1 | Fixed C49489 code=6 (solved E.i.7) |
| QTXZ | 04/13 | CR+AR | D.7.2, FDA.D.11.r.1 | Same root cause as 2GZK (nullFlavor) |
| 26ZL | 04/13 | CR+AR | FDA.D.11.r.1, FDA.D.12 | Fixed D.7.2 with text; used C17998 (rejected) |
| **2L8T** | **04/21** | **CA+AA** | **None** | **Race=C41260, Ethnicity=C41222 (v37 match)** |

---

## 5) What the App Had to Fix (cumulative from CF97 to 2L8T)

### Fix 1: C49489 Outcome Code (solved CF97's E.i.7)
Reaction 2 (Hepatic enzyme increased) must use `code="6"` (E2B-R2 legacy "unknown") in the C49489 observation. The app was using a standard outcome code that wasn't in the FAERS-specific allowed set.

### Fix 2: Medical History Text (solved 2GZK/QTXZ's D.7.2)
The observation with `code="18"` (D.7.2) must have actual text content. `nullFlavor="NI"` is rejected. The app now uses `"None reported"` when no history is available.

### Fix 3: Patient Race Code (solved 2GZK/QTXZ/26ZL's FDA.D.11.r.1)
The observation with `code="C17049"` (Race) must use an actual NCI race code. Both `nullFlavor="NI"` and `C17998` ("Unknown") are rejected. The app must map to real codes like `C41260` ("Asian").

### Fix 4: Patient Ethnicity Code (solved 26ZL's FDA.D.12)
The observation with `code="C16564"` (Ethnicity) must use an actual NCI ethnicity code. `C17998` ("Unknown") is rejected. The app must use real codes like `C41222` ("Not Hispanic or Latino").

### Fix 5: Nested representedOrganization (inherited from v37)
The reporter block must have a nested org structure: outer `representedOrganization` (department) containing `assignedEntity` containing inner `representedOrganization` (company). A flat single-level structure causes C.3.2 rejection.

---

## 6) Empirical Value Policy

These are the ONLY reliable facts about what the FAERS 2.18 validator accepts or rejects. Do not rely on specification interpretation — only on observed ACK3 results.

### Race (C17049 / FDA.D.11.r.1)
| Value | Result | Evidence |
|---|---|---|
| `nullFlavor="NI"` | **REJECTED** | QTXZ, 2GZK ACK3 |
| `C17998` "Unknown" | **REJECTED** | 26ZL ACK3 |
| `C41260` "Asian" | **ACCEPTED** | v37, 2L8T ACK3 |

### Ethnicity (C16564 / FDA.D.12)
| Value | Result | Evidence |
|---|---|---|
| `nullFlavor="NI"` | Untested (masked by D.7.2/D.11.r.1) | — |
| `C17998` "Unknown" | **REJECTED** | 26ZL ACK3 |
| `C41222` "Not Hispanic or Latino" | **ACCEPTED** | v37, 2L8T ACK3 |

### Medical History Text (code=18 / D.7.2)
| Value | Result | Evidence |
|---|---|---|
| `nullFlavor="NI"` | **REJECTED** | QTXZ, 2GZK ACK3 |
| Actual text (e.g., "None reported") | **ACCEPTED** | 26ZL, 2L8T, v37 ACK3 |

### otherCaseIds BL
| Value | Result | Evidence |
|---|---|---|
| `nullFlavor="NI"` | **ACCEPTED** | v37, all app submissions |

### Outcome Code (code=27 / E.i.7)
| Value | Result | Evidence |
|---|---|---|
| `code="1"` (recovered/resolved) | **ACCEPTED** | 2L8T ACK3 |
| `code="3"` (not recovered/ongoing) | **ACCEPTED** | v37 ACK3 |
| Codes 1–5 | Expected safe (standard E2B values) | — |

### C49489 FAERS Outcome
| Value | Result | Evidence |
|---|---|---|
| `code="1"` | **ACCEPTED** | v37, 2L8T ACK3 |
| `code="6"` (E2B-R2 legacy unknown) | **ACCEPTED** | v37, 2L8T ACK3 |

### Seriousness BL Criteria (codes 34, 21, 33, 35, 12, 26, 7)
Both `true` and `false` are accepted for all criteria. Confirmed across v37 (multiple true) and 2L8T (different true/false combinations).

---

## 7) Critical Structural Requirements

### 7.1 XML Element Order in `investigationEvent`
```
id, id, id, code, text, statusCode, effectiveTime, availabilityTime,
component (patient+reactions+drugs),
component (case narrative),
component (additionalDocumentsAvailable),
component (localCriteriaForExpedited),
component (localCriteriaReportType),
component (combinationProductReportIndicator),
outboundRelationship (initialReport/relatedInvestigation),
subjectOf1 (reporter block),
subjectOf2 (ICH ReportType),
subjectOf2 (otherCaseIds)
```

### 7.2 Reporter Block (`subjectOf1/controlActEvent/author`)
```xml
<subjectOf1 typeCode="SUBJ">
  <controlActEvent classCode="CACT" moodCode="EVN">
    <author typeCode="AUT">
      <assignedEntity classCode="ASSIGNED">
        <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.7"/>
        <addr>
          <streetAddressLine>...</streetAddressLine>
          <city>...</city>
          <state>...</state>
          <postalCode>...</postalCode>
          <country>US</country>
        </addr>
        <telecom value="tel:..."/>
        <telecom value="fax:..."/>
        <telecom value="mailto:..."/>
        <assignedPerson classCode="PSN" determinerCode="INSTANCE">
          <name>
            <prefix>...</prefix>
            <given>...</given>
            <family>...</family>
          </name>
          <asLocatedEntity classCode="LOCE">
            <location classCode="COUNTRY" determinerCode="INSTANCE">
              <code code="US" codeSystem="1.0.3166.1.2.2"/>
            </location>
          </asLocatedEntity>
        </assignedPerson>
        <!-- NESTED org structure (critical for C.3.2) -->
        <representedOrganization classCode="ORG" determinerCode="INSTANCE">
          <name>Drug Safety</name>  <!-- outer = department -->
          <assignedEntity classCode="ASSIGNED">
            <representedOrganization classCode="ORG" determinerCode="INSTANCE">
              <name>Company Name</name>  <!-- inner = company -->
            </representedOrganization>
          </assignedEntity>
        </representedOrganization>
      </assignedEntity>
    </author>
  </controlActEvent>
</subjectOf1>
```

**DO NOT use `<author>` as a direct child of `<investigationEvent>`.** The CDER PORR schema rejects it.

**DO NOT use OID `.1.6`** in this block. Use `.1.7` (sender type). The FDA engine reads C.3 from `.1.7`.

**DO NOT flatten the representedOrganization.** The nested structure is the only confirmed fix for C.3.2.

### 7.3 Sender/Receiver OIDs
```
Inner PORR:
  receiver: root=".3.12" extension="CDER"
  sender:   root=".3.11" extension="334818134"
            root=".3.13" extension="334818134"
            root="1.3.6.1.4.1.519.1" extension="334818134"

Outer wrapper:
  receiver: root=".3.14" extension="ZZFDATST"
  sender:   root=".3.13" extension="334818134"
            root="1.3.6.1.4.1.519.1" extension="334818134"
```

### 7.4 Reaction Block Requirements
Each reaction (observation code=29) must contain exactly:
- 7 seriousness BL criteria: codes 34 (death), 21 (lifeThreatening), 33 (hospitalization), 35 (disability), 12 (congenitalAnomaly), 26 (otherMedicallyImportant), 7 (requiredIntervention)
- Outcome: code=27 with CE value from OID `.1.1.11` (codes 1–5)
- C83121 Seriousness: CE value matching the BL=true criterion
- C49489 Outcome: CE value from OID `.1.1.11` (codes 1–6, where 6 = E2B-R2 legacy)
- At least one seriousness criterion must be `true`
- C83121 code must be consistent with which criterion is `true`

---

## 8) 5-Pass Pre-Submission Validation Methodology

These five passes are now automated in the app (see `src/main/services/fivePassValidatorService.ts`) and enforced on both submission paths — the file-export handler (`submission.handlers.ts::XML_EXPORT_FDA`) and the direct ESG API handler (`esgSubmissionService.ts`). Passes 1/4/5 depend on the v37 golden XML; when the test tree isn't shipped (e.g. packaged production build), those passes skip cleanly and the gate only enforces passes 2/3.

### Pass 1: Element-Presence Structural Diff
Verify the XML has exactly 296 elements with the same indexed paths as v37.

### Pass 2: CE Attribute Completeness
All CE-type value elements must have `codeSystem` (and `codeSystemVersion` where required). HL7 CS elements (`statusCode`, `responseModeCode`, `processingCode`, `processingModeCode`, `acceptAckCode`, etc.) are exempt — their code values draw from a fixed HL7 enumeration.

### Pass 3: Business-Rule Code Validity
All coded values must be within FAERS 2.18 restricted value sets. Values are checked against the empirical policy table in `src/main/services/faersEmpiricalPolicy.ts`, which codifies §6 of this handoff (race C41260 accepted / C17998 rejected / nullFlavor NI rejected, etc.).

### Pass 4: Full Value-Level Diff vs v37
Enumerate every attribute/text difference. Categorize as: UUID/batch (expected), case ID (expected), timestamp (expected), reporter (expected), or content (review needed).

### Pass 5: Empirical Safety Check
For each content divergence from v37:
- **PROVEN SAFE** — confirmed in a prior CA+AA (v37 or 2L8T)
- **PROVEN REJECTED** — confirmed in a prior CR+AR
- **UNTESTED** — never tested
- **Rule: Never combine multiple untested changes in one submission.**

### Renderer surface
`src/renderer/components/submission/FivePassValidatorPanel.tsx` renders the five passes as a traffic-light strip plus collapsible findings. It's embedded in `SubmitToFdaDialog` (disables the Submit button on any error), and reachable standalone via the IPC channel `esg:fivePassValidate` (preload method `esgFivePassValidate(caseId)`).

---

## 9) Values Proven Safe by 2L8T

2L8T diverged from v37 in these ways and was still accepted, so these are now PROVEN SAFE:

- Outcome `code="1"` ("recovered/resolved") in `code=27` observation (v37 used `code="3"`)
- `code=33` (hospitalization) = `false` on a reaction (v37 had `true`)
- `code=26` (otherMedicallyImportant) = `false` on a reaction (v37 had `true`)
- Different reporter identity (name, address, org, telecom all different from v37)
- Medical history text `"None reported"` (re-confirmed; first proven in 26ZL)

---

## 10) Key Lessons (do not forget these)

1. **Never trust spec over empirical evidence.** `nullFlavor="NI"` and `C17998` look valid per E2B spec but FAERS rejects them for race and ethnicity.
2. **Never bundle multiple untested changes.** 26ZL failed because it changed three values at once.
3. **The validator reports rejections sequentially.** Fixing one rejection can unmask another (ethnicity was hidden behind D.7.2/D.11.r.1).
4. **Reporter content is flexible; structure is not.** Different names/addresses are fine, but the nested org structure is mandatory.
5. **Maintain v37 as the golden reference.** All validation compares against it.

---

## 11) File Layout

```
test_submission/
├── package/                          # Hand-crafted XML iterations
│   ├── CASE-20260331-EMJQ_fixed_v37_patch.xml   # GOLDEN REFERENCE (CA+AA)
│   └── ... (v1–v36 history)
├── from_app/                         # App-generated submissions
│   ├── CASE-20260421-2L8T.xml        # ACCEPTED (CA+AA)
│   ├── CASE-20260413-26ZL.xml        # CR+AR (race+ethnicity)
│   ├── CASE-20260413-QTXZ.xml        # CR+AR (D.7.2+race)
│   ├── CASE-20260413-2GZK.xml        # CR+AR (D.7.2+race)
│   └── CASE-20260412-CF97.xml        # CR+AR (E.i.7)
├── acks/                             # All ACK responses
│   ├── ci260421211040...f3.ack       # 2L8T CA+AA
│   └── ci260410211359...bc.ack       # v37 CA+AA
├── feedback/                         # Gap reports and handoffs
│   ├── FAERS_Gap_Report_*.docx       # Per-submission gap analysis
│   ├── New_Session_Handoff_FAERS_Debug_UPDATED.md
│   └── Comprehensive_XML_Fix_History_UPDATED.md
├── docs/                             # FDA reference documents
├── faers_xml_lint.py                 # 55-check lint script
├── FAERS_Workflow_Engineering_Report.docx  # Engineering spec (v1–v37)
├── FAERS_Final_Summary_Report.docx   # Complete project summary
├── CLAUDE_CODE_FAERS_WORKFLOW_PROMPT.md    # Original Claude Code prompt
└── SESSION_HANDOFF.md                # Cowork session handoff
```

---

## 12) Definition of Done

The workflow is complete when:
1. The app generates XML that passes all 55 lint checks
2. The app generates XML that passes the 5-pass validation against v37
3. A newly generated XML file, submitted to FDA ESG NextGen TEST, receives CA+AA
4. The app handles edge cases (unknown race/ethnicity, empty medical history) using proven-safe values instead of nullFlavor or C17998

---

## 13) Recommended Next Steps

### Completed since 2L8T
- ✅ **5-pass validation integrated in-app.** `fivePassValidatorService.ts` + `faersEmpiricalPolicy.ts` run on both submission paths. 7 unit tests exercise the real v37 golden XML + the five `from_app/` submissions.
- ✅ **ACK3 parser integrated.** `ackParserService.ts` parses the raw HL7 MCCI_IN200101UV01 envelope into `{ messageCode: CA|CR, batchCode: AA|AR, rejections: [{ tag, index, message }], targetMessageId, ... }`. 4 unit tests exercise the real ACK fixtures in `acks/`.
- ✅ **UI surface.** `FivePassValidatorPanel` (embedded in `SubmitToFdaDialog`) + `ImportAckDialog` (toolbar entry). 16 component tests exercise both.

### Still open
- **Run the test-case catalog (§1–§7 of `FAERS_Test_Case_Catalog.md`).** This is now the highest-value activity: each test submission (start with TC-A01 "Race White") promotes one value from UNTESTED → PROVEN and expands the in-app empirical policy.
- **Expand race/ethnicity coverage.** TC-A01 through TC-A05 exercise the untested race/ethnicity NCI codes. As each is accepted, add it to `FAERS_POLICY.race.entries` / `.ethnicity.entries` with the case ID as evidence.
- **Follow-up reports (report type code=2).** TC-F01 in the catalog. App does not yet generate `investigationEvent/id[root='.3.4'] extension="3"` + follow-up report type code — needs generator work.
- **Additional drug configurations.** TC-D01 through TC-D06 cover ActionTaken, Dechallenge, and the two-suspect-drugs structural variant.
- **Additional seriousness categories (death, life-threatening).** TC-G04 pairs fatal outcome with resultsInDeath=true; structurally novel.
- **Production transition.** ZZFDATST → ZZFDA receiver switch + FDA production approval. Do not attempt before the catalog is exhausted in TEST.

### Internal tidy-up (found while wiring the validator)
- Three pre-existing test failures unrelated to this stack: `workflowService.test.ts` (permission-denied vs invalid-transition assertions), `authStore.test.ts` (zustand persist broken under jsdom), `xmlGeneratorService.integration.test.ts` (better-sqlite3 native bindings; runs under `test:integration` electron runner, not plain vitest).
- `@testing-library/jest-dom/vitest` is defined in `src/test/react-setup.ts` but not loaded by `vitest.config.ts::setupFiles`. New `.test.tsx` files import it directly; wiring it into the config is optional cleanup.
