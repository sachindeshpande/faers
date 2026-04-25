# Case Import JSON Examples

Pre-filled JSON documents that can be imported into the DeepQuence FAERS app to seed a new Draft case. Each example maps to a scenario from `test/test_submission/FAERS_Test_Case_Catalog.md` — use them to drive the catalog from the UI (or, soon, from the CLI) without manually filling in every field.

## How to use

**From the UI (today):** toolbar → **Import JSON** → pick a file → the app creates a Draft with the fields populated and navigates to it. The Save button is highlighted as a "review and confirm" cue; the record is already in the DB.

**From the headless CLI:** `npm run headless -- path/to/example.json [more.json...]` runs the full import → validate → generate → gate → write XML pipeline against an ephemeral SQLite DB. Output XML lands at `<outDir>/<input-base>.xml`. Auto-routes `caseType: 'ind'` / `'babe'` cases via Premarket receivers; postmarket cases go through ZZFDATST. See `src/main/headless/cli.ts` and `--help` for full flags.

**From code:** `src/main/services/caseImportService.ts::CaseImportService.importCaseFromJson(...)`. Accepts a file path, inline JSON text, or a parsed object and returns `{ success, caseId, errors?, warnings? }`.

## Schema

Machine-validated against `src/shared/types/caseImport.types.ts` (zod). Human-friendly field names, enums accept either the name (`"Male"`) or the numeric code (`1`). Unknown top-level keys are rejected. All fields at every level are optional unless flagged — a minimal `{}` JSON creates a bare Draft.

Required (where present):
- `reactions[].term` — non-empty string.
- `drugs[].productName` — non-empty string.

Identifier behaviour:
- `case.safetyReportId` is honoured if provided; otherwise the server generates `SR-<caseId>`.
- `caseId` itself is always generated server-side (`CASE-YYYYMMDD-XXXX`). Re-importing the same JSON produces a fresh case.

## The examples

### Postmarket (Scenario 7) — proven against ZZFDATST

| File | Test-catalog ID | What it exercises |
|---|---|---|
| `2L8T-baseline.json` | — | Proven-accepted 2L8T baseline; start here. |
| `TC-A01-race-white.json` | TC-A01 | `patient.race = "C41261"` (White). |
| `TC-A02-race-black.json` | TC-A02 | `patient.race = "C41259"` (catalog's code for Black or African American). |
| `TC-A05-ethnicity-hispanic.json` | TC-A05 | `patient.ethnicity = "C17459"` (Hispanic or Latino). |
| `TC-B02-medhistory-narrative.json` | TC-B02 | Rich narrative `medicalHistoryText`. |
| `TC-C02-reporter-qual-3.json` | TC-C02 | `reporter.qualification = "OtherHealthProfessional"`. |
| `TC-D01-action-dose-reduced.json` | TC-D01 | Suspect drug `actionTakenCode = 2`. |
| `TC-D05-two-suspect-drugs.json` | TC-D05 | Two suspect drugs + one concomitant. |
| `TC-E03-patient-female.json` | TC-E03 | `patient.sex = "Female"`. |
| `TC-G04-fatal-outcome.json` | TC-G04 | Reaction `outcomeCode = 5` + `patient.death = true`. |

Each TC variant is a **minimal patch over `2L8T-baseline.json`** — the reporter, drugs, and reactions match 2L8T unless the test specifically changes them. That preserves the test catalog's §2 isolation rule: one untested field per submission.

### Premarket — IND / SUSAR (no live ACK3 yet — every value is `IND_POLICY.untested`)

All seven IND examples set `case.caseType = "ind"` (or `"babe"` for T06), which auto-routes via `ZZFDA_PREMKT` / `CDER_IND` and emits the `<researchStudy>` block per [`SUSAR_IND_Feature_Spec.md`](../../../../docs/requirements/SUSAR_IND_Feature_Spec.md). Run order: T01 → T02 (FDA's two-positive-ACK rule), then T03/T04 (low-risk variants), then T05/T06/T07 (higher risk).

| File | Test-catalog ID | What it exercises |
|---|---|---|
| `IND-T01-susar-baseline.json` | IND-T01 | Baseline SUSAR — single suspect IND drug, 15-day timeline, full study block. |
| `IND-T02-susar-repeat.json` | IND-T02 | Identical structure to T01 with a different case ID — for the FDA two-positive-ACK requirement. |
| `IND-T03-cross-ref-ind.json` | IND-T03 | Adds `indStudy.crossReferencedIndNumbers` (FDA.C.5.6.r repeating). |
| `IND-T04-no-study-registration.json` | IND-T04 | Omits `studyRegistrationNumber` (NCT) — verifies C.5.1.r.1 is truly optional. |
| `IND-T05-fatal-seven-day.json` | IND-T05 | Fatal hepatic failure → `seriousness.death = true`, `outcomeCode = 5`. `indReportType` is intentionally omitted to exercise the auto-derivation to `7_day`. |
| `IND-T06-babe-test-reference.json` | IND-T06 | `caseType: "babe"` with the required Test + Reference drug pair plus a concomitant `NA` — triggers the BA/BE G.k.10a.r enforcement rule. |
| `IND-T07-followup-report.json` | IND-T07 | `initialOrFollowup: "FollowUp"` — auto-derives the C.1.9 version to `"3"`. |

## Adding a new example

1. Copy the closest existing example.
2. Change only what the scenario requires.
3. Update the `exampleId` + `description`.
4. Run `npx vitest run src/main/services/caseImportService.test.ts` — the happy-path test validates the schema against a representative fixture.
5. Add a row to the table above.
