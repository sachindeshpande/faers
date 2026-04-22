# FAERS ESG NextGen Submission — Session Handoff

> **State as of 2026-04-21 (plus in-app validator work).**
> - 2L8T received **CA+AA** — first accepted app-generated submission. ACK: `acks/ci260421211040.39a4bea3542d4f6081340d5c03a105f3.ack`.
> - The 5-pass validator and ACK parser are now implemented in the app (`src/main/services/fivePassValidatorService.ts`, `ackParserService.ts`, `faersEmpiricalPolicy.ts`) with UI surface (`FivePassValidatorPanel` + `ImportAckDialog`) and gate both the file-export and ESG API submission paths.
> - **Primary authoritative handoff is `CLAUDE_CODE_SESSION_HANDOFF_2L8T.md`** — read that first. This file is kept as the legacy troubleshooting narrative.

## Project Instructions

I am continuing a troubleshooting session for an FDA ESG NextGen / CDER FAERS AERS TEST submission. Please read this handoff document in full before proceeding. The next step is to review the latest ACK3 that I will upload.

## Who / What

- **Submitter:** Sachin Deshpande (sachin.gbox@gmail.com), company DeepQuence
- **Sender ID (DUNS):** 334818134
- **Test environment:** ZZFDATST (CDER FAERS AERS TEST)
- **Format:** E2B(R3) HL7 v3 ICSR XML, validated against FAERS 2.18 business rules
- **Application:** DeepQuence builds an app that generates FAERS submission packages. We are testing app-generated output against the ZZFDATST environment.

## Golden Reference

**v37** (`package/CASE-20260331-EMJQ_fixed_v37_patch.xml`) is the ONLY submission that achieved **CA+AA** (Case Accept + Application Accept). It is the canonical baseline for all comparisons. Key values:

- Race: `C41260` "Asian" (codeSystem `2.16.840.1.113883.3.26.1.1`)
- Ethnicity: `C41222` "Not Hispanic or Latino" (same codeSystem)
- Med history (D.7.2): `"History of hypertension treated with lisinopril."`
- otherCaseIds BL: `nullFlavor="NI"` (proven safe)
- Reporter: Mr Sachin Deshpande, 123 Test St, Sunnyvale CA 94085, DeepQuence
- Nested representedOrganization (outer=Drug Safety, inner=DeepQuence) — critical for C.3.2
- asLocatedEntity present with code=US
- Reaction 1 (Nausea): outcome code=3, C49489 code=1, hospitalization=true, otherMedImportant=true
- Reaction 2 (Hepatic enzyme increased): outcome code=3, C49489 code=6, hospitalization=true, otherMedImportant=true
- Drug blocks: Testdrugimab (suspect) + Lisinopril (concomitant), both Dechallenge=3, Rechallenge=3

## Submission History and Rejection Trend

| Submission | ACK3 Result | Rejections | Key Fix Applied |
|---|---|---|---|
| v1–v36 (EMJQ) | Various schema/parse errors | SAX exceptions, C.3.2, missing fields | Iterative structural fixes |
| **v37 (EMJQ)** | **CA+AA** | **None** | Nested org, correct subjectOf1 position |
| CF97 (app) | CR+AR | E.i.7 "Element value not allowed" | — |
| 2GZK (app) | CR+AR | D.7.2 + FDA.D.11.r.1 | Fixed C49489 code=6 (solved CF97's E.i.7) |
| QTXZ (app) | CR+AR | D.7.2 + FDA.D.11.r.1 | Same as 2GZK — nullFlavor issue persisted |
| 26ZL (app) | CR+AR | FDA.D.11.r.1 + FDA.D.12 | Fixed D.7.2 with "None reported" (worked!), but used C17998 for race/ethnicity (rejected) |
| **2L8T (app)** | **CA+AA** | **None** | Fixed race=C41260, ethnicity=C41222 (matching v37) |

## Empirical Value Policy (hard-won evidence)

| Field | nullFlavor="NI" | C17998 "Unknown" | Actual Code | Evidence |
|---|---|---|---|---|
| Race (C17049 / FDA.D.11.r.1) | **REJECTED** | **REJECTED** | **ACCEPTED** (C41260) | NI→QTXZ reject, C17998→26ZL reject, C41260→v37 accept |
| Ethnicity (C16564 / FDA.D.12) | Untested (masked) | **REJECTED** | **ACCEPTED** (C41222) | C17998→26ZL reject, C41222→v37 accept |
| Med History (code=18 / D.7.2) | **REJECTED** | N/A | **ACCEPTED** (text) | NI→QTXZ reject, "None reported"→26ZL accept |
| otherCaseIds BL | **ACCEPTED** | N/A | N/A | NI→v37 accept |

## ACK Terminology

- **ACK1** = ESG upload receipt (immediate)
- **ACK2** = ESG-to-CDER delivery confirmation
- **ACK3** = CDER business rule validation result (the one that matters)
- **CR** = Case Reject, **AR** = Application Reject
- **CA** = Case Accept, **AA** = Application Accept

## 5-Pass Validation Methodology

We use a 5-pass validation before any submission. **As of the v37→2L8T cycle these passes are implemented in `src/main/services/fivePassValidatorService.ts` and run automatically in the file-export and ESG API submission paths.** A manual check is still possible via the Python lint (`faers_xml_lint.py`) or the IPC handler `esg:fivePassValidate` (preload: `esgFivePassValidate(caseId)`).

1. **Pass 1 — Element-Presence Structural Diff:** Verify identical element count (296) and indexed paths vs v37.
2. **Pass 2 — CE Attribute Completeness:** All CE-type values must have codeSystem (and codeSystemVersion where required). HL7 CS elements (`statusCode`, `responseModeCode`, etc.) are exempt.
3. **Pass 3 — Business-Rule Code Validity:** All coded values must fall within FAERS 2.18 restricted value sets. Values are classified against `faersEmpiricalPolicy.ts` (race, ethnicity, med history, C49489 outcome, ICH outcome).
4. **Pass 4 — Full Value-Level Diff vs v37:** Enumerate every attribute and text difference. Categorize as UUID/batch (expected), case ID (expected), timestamp (expected), reporter (expected), or content (needs review).
5. **Pass 5 — Empirical Safety Check (critical):** For each content divergence from v37, classify as:
   - **PROVEN SAFE** — confirmed in a prior CA+AA submission
   - **PROVEN REJECTED** — confirmed in a prior CR+AR submission
   - **UNTESTED** — never tested in any submission
   - **Rule:** Never combine multiple untested changes in one submission. If multiple untested values are present, flag as blocking.

## Pre-Submission Validation of 2L8T

2L8T passed all 5 passes. Key findings:

- **Passes 1–3:** All PASS. Structure matches v37, CE attributes complete, all codes valid.
- **Pass 4:** 26 differences total — 10 expected (UUIDs, case IDs, timestamps), 11 reporter identity (expected for different reporter), 5 clinical content.
- **Pass 5:** The 5 clinical content diffs were:
  1. Med history "None reported" → PROVEN SAFE (26ZL)
  2. Reaction 1 outcome code=1 (vs v37's code=3) → within valid set, LOW RISK
  3. Reaction 1 hospitalization false (vs v37's true) → BL toggle, LOW RISK
  4. Reaction 2 otherMedicallyImportant false (vs v37's true) → BL toggle, LOW RISK
  5. Reporter uses Dr Jane Doe / City General Hospital instead of Mr Sachin Deshpande / DeepQuence → expected per-case variation, nested org structure preserved

Seriousness criteria are internally consistent for both reactions. C83121 matches the corresponding BL=true criterion in each case.

## What To Do Next

**2L8T outcome is known — CA+AA.** This section is historical; for current next steps see §13 of `CLAUDE_CODE_SESSION_HANDOFF_2L8T.md`. Briefly: run the `FAERS_Test_Case_Catalog.md` matrix (start with TC-A01) to promote UNTESTED values to PROVEN, expanding the in-app empirical policy table (`faersEmpiricalPolicy.ts`).

When new ACKs arrive:
1. Drop them into `acks/` (keep FDA filename).
2. Use the app's **Import ACK** toolbar button (or run `ackParserService.parseFdaAck(xml)`) to extract the verdict + rejection tags.
3. If rejected, map each tag to the empirical policy — errors under `FDA.D.11.r.1`, `FDA.D.12`, `D.7.2`, `C.3.x` each have known playbooks (see §6 of the 2L8T handoff).
4. Update `FAERS_POLICY` in `faersEmpiricalPolicy.ts` with the new evidence; the next validator run picks it up automatically.

## Key Files

- `package/CASE-20260331-EMJQ_fixed_v37_patch.xml` — Golden reference (CA+AA)
- `from_app/CASE-20260421-2L8T.xml` — Latest app-generated submission (ACK3 pending)
- `from_app/CASE-20260413-26ZL.xml` — Previous submission (CR+AR: race+ethnicity rejected)
- `from_app/CASE-20260413-QTXZ.xml` — Earlier submission (CR+AR: D.7.2+race rejected)
- `gap_report/` — Gap report generator scripts (Node.js + docx-js)
- `FAERS_Gap_Report_26ZL.docx` — Most recent gap report

## Critical Lessons Learned

1. **Never trust general knowledge over empirical evidence.** C17998 "Unknown" seemed reasonable for race/ethnicity but was rejected. Only use values confirmed in a prior CA+AA.
2. **Never bundle multiple untested changes.** 26ZL bundled C17998 for race AND ethnicity AND "None reported" for med history. Only one untested change survived (med history). The other two were rejected, and we couldn't tell which was the problem without the empirical policy.
3. **The FAERS 2.18 validator is stricter than the E2B(R3) spec.** Fields like race and ethnicity reject nullFlavor and "Unknown" codes even though the spec allows them.
4. **Reporter structure matters more than content.** The nested representedOrganization pattern is critical for C.3.2 — but the actual names/addresses are flexible.
5. **Pass 5 exists because of past failures.** We approved submissions that looked valid but used untested values. Pass 5 forces explicit classification of every divergence.

## Do NOT

- Do not restart from first principles unless the evidence forces it.
- Do not assume any value is safe just because it's in the E2B spec — check the empirical policy table.
- Do not approve a submission with PROVEN REJECTED values.
- Do not approve a submission with more than one UNTESTED value change without flagging it.
