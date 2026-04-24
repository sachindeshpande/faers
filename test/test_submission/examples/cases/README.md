# Case Import JSON Examples

Pre-filled JSON documents that can be imported into the DeepQuence FAERS app to seed a new Draft case. Each example maps to a scenario from `test/test_submission/FAERS_Test_Case_Catalog.md` — use them to drive the catalog from the UI (or, soon, from the CLI) without manually filling in every field.

## How to use

**From the UI (today):** toolbar → **Import JSON** → pick a file → the app creates a Draft with the fields populated and navigates to it. The Save button is highlighted as a "review and confirm" cue; the record is already in the DB.

**From code / CLI (when the headless entry point lands):** the backing service is `src/main/services/caseImportService.ts::CaseImportService.importCaseFromJson(...)`. It accepts either a file path, inline JSON text, or a parsed object and returns `{ success, caseId, errors?, warnings? }`.

## Schema

Machine-validated against `src/shared/types/caseImport.types.ts` (zod). Human-friendly field names, enums accept either the name (`"Male"`) or the numeric code (`1`). Unknown top-level keys are rejected. All fields at every level are optional unless flagged — a minimal `{}` JSON creates a bare Draft.

Required (where present):
- `reactions[].term` — non-empty string.
- `drugs[].productName` — non-empty string.

Identifier behaviour:
- `case.safetyReportId` is honoured if provided; otherwise the server generates `SR-<caseId>`.
- `caseId` itself is always generated server-side (`CASE-YYYYMMDD-XXXX`). Re-importing the same JSON produces a fresh case.

## The examples

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

## Adding a new example

1. Copy the closest existing example.
2. Change only what the scenario requires.
3. Update the `exampleId` + `description`.
4. Run `npx vitest run src/main/services/caseImportService.test.ts` — the happy-path test validates the schema against a representative fixture.
5. Add a row to the table above.
