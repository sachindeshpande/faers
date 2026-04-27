# FAERS Application - Implementation Status

**Last Updated:** April 25, 2026
**Phase:** 5 (Enhanced Data Management) + Phase 2B (ESG NextGen API) + Empirical Validator Stack + **JSON Import / Headless CLI** + **SUSAR / IND Safety Reports (E2B emission)**
**Status:** All phases above are code-complete. Postmarket has live ZZFDATST evidence (v37 + 2L8T = CA+AA). IND has its first live ACK3 — IND-T01 was rejected (CR+AR) on 2026-04-27 with a wrong-receiver error (GAP-IND-001), now fixed; the next round-trip is pending. `IND_POLICY` entries remain `untested` apart from the rejected `ZZFDA_PREMKT` value recorded as evidence.

> The most current narrative for "where the project is right now" lives in **[`docs/handoffs/2026-04-25_session_handoff.md`](../handoffs/2026-04-25_session_handoff.md)**. This file is the architectural map; that file is the operational pickup point.

---

## Quick Start for Continuing Development

```bash
cd faers-app
npm install
npm run dev
```

**Key Commands:**
- `npm run dev` - Start development server
- `npm run typecheck` - Check TypeScript types
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm test` - Run unit tests
- `npm run test:e2e` - Run E2E tests with Playwright

---

## 1. Project Overview

The FAERS Submission Application is an Electron desktop app for creating FDA Individual Case Safety Reports (ICSRs) in E2B(R3) XML format, with multi-user support, workflow management, and comprehensive periodic safety report (PSR) capabilities.

### Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron 28.x |
| Build Tool | electron-vite 2.x |
| UI Framework | React 18.x + Ant Design 5.x |
| State Management | Zustand 4.x |
| Database | SQLite (better-sqlite3 9.x) |
| PDF Parsing | pdf-lib |
| Language | TypeScript 5.3 (strict mode) |
| Testing | Vitest + Playwright |

---

## 2. Implementation Status by Phase

### 2.1 Phase 1: Core ICSR MVP ✓ Complete

| Feature | Status | Key Files |
|---------|--------|-----------|
| **Case CRUD** | Complete | `CaseRepository`, `case.handlers.ts` |
| **Case List UI** | Complete | `CaseList.tsx` |
| **Case Form Sections** | Complete | 7 sections: Report, Reporter, Sender, Patient, Reactions, Drugs, Narrative |
| **E2B(R3) Validation** | Complete | `ValidationService` |
| **E2B(R3) XML Export** | Complete | `XMLGeneratorService` |
| **Form 3500A Import** | Complete | `Form3500ImportService` |
| **Navigation Indicators** | Complete | Green checkmark/Red X |
| **Database Migrations** | Complete | Auto-migration on startup |

### 2.2 Phase 2: FDA ESG NextGen USP ✓ Complete

| Feature | Status | Key Files |
|---------|--------|-----------|
| **ESG Configuration** | Complete | Settings UI |
| **XML Submission** | Complete | `submissionService.ts` |
| **ACK Processing** | Complete | `acknowledgmentService.ts` |
| **Submission Tracking** | Complete | Submission status UI |

### 2.2B Phase 2B: ESG NextGen API Integration ✓ Complete

| Feature | Status | Key Files |
|---------|--------|-----------|
| **Secure Credential Storage** | Complete | `credentialStorageService.ts` (safeStorage + AES-256 fallback) |
| **OAuth 2.0 Authentication** | Complete | `esgAuthService.ts` (Client Credentials flow, token caching) |
| **ESG API Client** | Complete | `esgApiService.ts` (HTTPS, 30s timeout, error categorization) |
| **Submission Orchestration** | Complete | `esgSubmissionService.ts` (validate → XML → submit → finalize) |
| **Retry Logic** | Complete | Exponential backoff with jitter (1s → 30s cap) |
| **Acknowledgment Polling** | Complete | `esgPollingService.ts` (recursive setTimeout, configurable interval) |
| **Progress Tracking** | Complete | Real-time updates via `BrowserWindow.webContents.send()` |
| **API Settings UI** | Complete | `EsgApiSettingsTab.tsx` (credentials, sender info, polling config) |
| **Submit to FDA Dialog** | Complete | `SubmitToFdaDialog.tsx` (pre-submission confirmation) |
| **Submission Progress** | Complete | `SubmissionProgressDialog.tsx` (live step indicators) |
| **Acknowledgment Display** | Complete | `AcknowledgmentDisplay.tsx` (ACK1/2/3/NACK, FDA Core ID) |
| **Polling Status Indicator** | Complete | `PollingStatusIndicator.tsx` (badge in dashboard) |
| **New Workflow Statuses** | Complete | `Submitting`, `Submission Failed` statuses |
| **IPC Channels** | Complete | 17 new channels for ESG API operations |
| **Database Migration** | Complete | Migration 020: `api_submission_attempts` table |

### 2.2D FAERS Empirical Validator Stack ✓ Complete (post-2L8T)

Hard-earned from the CF97 → 2GZK → QTXZ → 26ZL → 2L8T submission campaign against ZZFDATST. Gates both submission paths (file export + ESG API) on empirical policy violations the FDA E2B spec alone does not catch.

| Feature | Status | Key Files |
|---------|--------|-----------|
| **Empirical Value Policy** | Complete | `faersEmpiricalPolicy.ts` — codifies race / ethnicity / med-history / C49489 / ICH outcome verdicts with provenance (v37, 2L8T, 26ZL, etc.) |
| **5-Pass Pre-Submission Validator** | Complete | `fivePassValidatorService.ts` — P1 element diff, P2 CE completeness, P3 business-rule codes, P4 value diff, P5 empirical safety |
| **Golden v37 Reference Resolution** | Complete | `resolveGoldenV37Path()` mirrors the lint-script lookup; passes 1/4/5 skip cleanly when the test tree isn't shipped |
| **ACK3 Parser** | Complete | `ackParserService.ts` — parses HL7 MCCI_IN200101UV01 envelopes; extracts inner CA/CR, outer AA/AR, rejection tags (`C.3.4.3`, `FDA.D.11.r.1`, etc.) |
| **Shared Types** | Complete | `faersValidation.types.ts` — `ParsedAck`, `FivePassResult`, `ValidatorFinding`, etc. (single source of truth across main/renderer) |
| **File-Export Gate** | Complete | `submission.handlers.ts::XML_EXPORT_FDA` runs lint + 5-pass before writing the XML |
| **ESG API Gate** | Complete | `esgSubmissionService.ts::executeSubmissionWithRetry` runs lint + 5-pass before any bytes leave for FDA (skipped in Demo mode) |
| **IPC Channels** | Complete | `esg:parseAck`, `esg:fivePassValidate` (preload: `esgParseAck`, `esgFivePassValidate`) |
| **5-Pass Validator Panel** | Complete | `FivePassValidatorPanel.tsx` — traffic-light strip + collapsible findings; embedded in `SubmitToFdaDialog`, disables Submit on errors |
| **Import ACK Dialog** | Complete | `ImportAckDialog.tsx` — file picker / paste tabs → parsed verdict + rejection list; toolbar entry in `App.tsx` |
| **Fixture-Driven Tests** | Complete | 11 service tests (real ACKs + 5 `from_app/` XMLs) + 16 component tests (rendering + mocked IPC) |

### 2.2E JSON Case Import + Headless CLI ✓ Complete (Apr 2026)

Skips the GUI for cases that come from automated tooling or test catalogs. The same import pipeline drives both the GUI's "Import JSON" toolbar action and the standalone `npm run headless` entry point.

| Feature | Status | Key Files |
|---------|--------|-----------|
| **Human-friendly JSON DSL** | Complete | `src/shared/types/caseImport.types.ts` — zod schema; ~200 fields across `case`, `patient`, `sender`, `reporter`, `reactions`, `drugs`, `indStudy` |
| **Import service** | Complete | `caseImportService.ts` — parses JSON / file / object, validates, populates Case + reporter + reactions + drugs in a single transaction |
| **GUI Import JSON dialog** | Complete | `src/renderer/components/submission/ImportJsonDialog.tsx` (toolbar action); creates a Draft, navigates to the case form |
| **Headless CLI** | Complete | `src/main/headless/cli.ts` (esbuild-bundled, runs under `ELECTRON_RUN_AS_NODE`); `npm run headless -- file.json` runs the full pipeline against an ephemeral SQLite DB |
| **Auto-routing** | Complete | `--report-type` defaults from `case.caseType`: `'ind'` / `'babe'` → Premarket, otherwise Postmarket. Mismatch warns. |
| **Per-case lint/validator skip** | Complete | IND/BA-BE cases skip the postmarket Python 55-check and 5-pass Passes 1/4/5 (no IND golden yet) |
| **10 postmarket example JSONs** | Complete | `test/test_submission/examples/cases/2L8T-baseline.json` + 9 TC variants exercising race/ethnicity/medhistory/reporter/drug/sex/outcome scenarios |
| **Fixture-driven tests** | Complete | Schema validation + import-and-render tests run on every shipped example |

### 2.2F SUSAR / IND Safety Report (E2B Emission) ✓ Complete (Apr 2026)

Implements the scope of [`docs/requirements/SUSAR_IND_Feature_Spec.md`](../requirements/SUSAR_IND_Feature_Spec.md) end-to-end through the headless pipeline. Switch is `case.caseType` (`'postmarket'` | `'ind'` | `'babe'`).

| Feature | Status | Key Files |
|---------|--------|-----------|
| **C.1.3 = 2 (Report from study)** | Complete | `xmlGeneratorService.ts` switches based on `caseType` |
| **`<researchStudy>` block** | Complete | Emitted under `primaryRole/subjectOf1` with C.5.3 sponsor study, C.5.4 study type, C.5.2 title, C.5.1.r.1 NCT, FDA.C.5.5a IND number, repeating FDA.C.5.6.r cross-refs |
| **G.k.3.1 drug approval** | Complete | `<asManufacturedProduct>/subjectOf/approval>` block per suspect IND drug |
| **G.k.10a.r FDAAddDrugInformation** | Complete | TEST / REFERENCE / nullFlavor=NA emission; required for `caseType: 'babe'` (BA/BE drug-pair enforced) |
| **Premarket routing** | Complete | `BATCH_RECEIVERS.Test.Premarket = 'ZZFDATST_PREMKT'`, `Production.Premarket = 'ZZFDA_PREMKT'` (FDA ACK3 confirmed 2026-04-27, GAP-IND-001); `MESSAGE_RECEIVERS.Premarket.{CDER,CBER}` = `'CDER_IND'` / `'CBER_IND'` |
| **`IND_POLICY` empirical table** | Complete (all `untested`) | `faersEmpiricalPolicy.ts` — promotes to `proven_safe`/`proven_rejected` only after live ZZFDA_PREMKT ACK3s |
| **Pass 3 IND structural checks** | Complete | C.1.3=2, C.5.4=1, G.k.10a.r ∈ {1, 2, NA} verified per case |
| **ACK parser report-context** | Complete | `ParsedAck.reportContext` (postmarket / ind / babe) supplied by caller, derives from `caseId` via case repo when not explicit |
| **7- vs 15-day timeline derivation** | Complete | Importer auto-picks `indReportType` from reaction seriousness when omitted |
| **DB migration 025** | Complete | 5 new columns on `cases` (ind_number, sponsor_study_number, study_name, study_registration_number, ind_cross_ref_numbers JSON) + 2 on `case_drugs` |
| **7 IND example JSONs** | Complete | T01 baseline, T02 repeat, T03 cross-ref, T04 NCT-less, T05 fatal/7-day, T06 BA/BE pair, T07 follow-up |
| **First live submission** | **Pending** | Manual upload via `https://esgng.fda.gov` — see `docs/handoffs/2026-04-25_session_handoff.md` §4 |

### 2.2C Demo Mode Enhancement ✓ Complete

| Feature | Status | Key Files |
|---------|--------|-----------|
| **Mock API Service** | Complete | `mockEsgApiService.ts` (simulates all ESG endpoints locally) |
| **Demo Mode Service** | Complete | `demoModeService.ts` (activation, sample cases, data isolation) |
| **Demo Environment Option** | Complete | "Demo" added to Test/Production in `EsgApiSettingsTab.tsx` |
| **Demo Mode Banner** | Complete | `DemoModeBanner.tsx` (purple persistent banner) |
| **Scenario Selection** | Complete | 6 scenarios: Happy Path, Slow Processing, Validation Error, etc. |
| **Speed Controls** | Complete | Real-time, Fast (10x), Instant options |
| **Auto-Configure Credentials** | Complete | Pre-populated demo credentials when Demo selected |
| **ACK Progression Simulation** | Complete | ACK1 → ACK2 → ACK3 with configurable timing |
| **NACK Simulation** | Complete | Realistic error codes and details |
| **Sample Demo Cases** | Complete | 5 pre-configured cases for demonstration |
| **Demo Data Isolation** | Complete | Separate storage, reset capability |
| **IPC Channels** | Complete | 9 new channels for demo mode operations |
| **Type Definitions** | Complete | `DemoScenario`, `DemoSpeed`, `DemoModeConfig`, etc. |

### 2.3 Phase 3: Multi-User & Workflow ✓ Complete

| Feature | Status | Key Files |
|---------|--------|-----------|
| **User Authentication** | Complete | `authService.ts`, `authStore.ts` |
| **Role-Based Access** | Complete | 7 roles with permissions |
| **Session Management** | Complete | 30-min timeout, warnings |
| **Workflow States** | Complete | 10 states with transitions |
| **Case Assignment** | Complete | `workflowService.ts` |
| **Comments & Notes** | Complete | `CommentsSection.tsx`, `NotesSection.tsx` |
| **Notifications** | Complete | `notificationStore.ts` |
| **Audit Trail** | Complete | `auditService.ts`, 21 CFR Part 11 |

### 2.4 Phase 4: Non-Expedited & PSR ✓ Complete

| Feature | Status | Key Files |
|---------|--------|-----------|
| **Product Management** | Complete | `product.repository.ts`, `productStore.ts` |
| **Report Classification** | Complete | `ReportClassificationSection.tsx` |
| **Seriousness Criteria** | Complete | `seriousness.repository.ts` |
| **Follow-up Reports** | Complete | `followupService.ts` |
| **Nullification Reports** | Complete | `NullifyDialog.tsx` |
| **Batch Submission** | Complete | `batchService.ts`, `BatchSubmissionWizard.tsx` |
| **PSR Scheduling** | Complete | `psr.repository.ts`, `PSRScheduleConfig.tsx` |
| **PSR Creation** | Complete | `psrService.ts`, `CreatePSRWizard.tsx` |
| **PSR Dashboard** | Complete | `PSRDashboard.tsx` |
| **PSR Case Management** | Complete | `PSRDetail.tsx` |
| **Extended Workflow** | Complete | Pending PSR, Included in PSR states |

### 2.5 Phase 5: Enhanced Data Management & Terminology ✓ Complete

| Feature | Status | Key Files |
|---------|--------|-----------|
| **MedDRA Dictionary** | Complete | `meddra.repository.ts`, `meddraService.ts` |
| **MedDRA Browser** | Complete | `MedDRABrowser.tsx`, `MedDRAAutocomplete.tsx` |
| **MedDRA Hierarchy** | Complete | 5-level hierarchy (SOC→HLGT→HLT→PT→LLT) |
| **WHO Drug Dictionary** | Complete | `whodrug.repository.ts`, `whodrugService.ts` |
| **WHO Drug Browser** | Complete | `WHODrugBrowser.tsx`, `WHODrugAutocomplete.tsx` |
| **ATC Classification** | Complete | 5-level ATC code hierarchy |
| **Advanced Search** | Complete | `searchService.ts`, `AdvancedSearchBuilder.tsx` |
| **Full-Text Search** | Complete | SQLite FTS5 with search indexes |
| **Saved Searches** | Complete | `savedSearchStore.ts` |
| **Duplicate Detection** | Complete | `duplicateService.ts`, `duplicate.repository.ts` |
| **Duplicate Resolution** | Complete | `DuplicateAlert.tsx`, `DuplicateRegistry.tsx` |
| **Case Merge** | Complete | `MergeCasesWizard.tsx` |
| **Case Templates** | Complete | `templateService.ts`, `template.repository.ts` |
| **Template Library** | Complete | `TemplateLibrary.tsx`, `TemplateEditor.tsx` |
| **Bulk Import** | Complete | `importService.ts`, `import.repository.ts` |
| **Import Wizard** | Complete | `ImportWizard.tsx`, `ColumnMapper.tsx` |
| **CSV/Excel Support** | Complete | Delimiter detection, column mapping |
| **Validation Engine** | Complete | `validationEngineService.ts`, `validation.repository.ts` |
| **Custom Rules** | Complete | JavaScript expression evaluation |
| **Validation Results** | Complete | `ValidationResultsPanel.tsx`, `ValidationRuleList.tsx` |

---

## 3. Project Structure

```
faers-app/
├── src/
│   ├── main/                          # Electron main process
│   │   ├── index.ts                   # App entry, window creation
│   │   ├── database/
│   │   │   ├── connection.ts          # SQLite init, migrations (001-020)
│   │   │   ├── repositories/
│   │   │   │   ├── case.repository.ts
│   │   │   │   ├── drug.repository.ts
│   │   │   │   ├── reaction.repository.ts
│   │   │   │   ├── reporter.repository.ts
│   │   │   │   ├── user.repository.ts       # Phase 3
│   │   │   │   ├── role.repository.ts       # Phase 3
│   │   │   │   ├── session.repository.ts    # Phase 3
│   │   │   │   ├── psr.repository.ts        # Phase 4
│   │   │   │   ├── meddra.repository.ts     # Phase 5
│   │   │   │   ├── whodrug.repository.ts    # Phase 5
│   │   │   │   ├── search.repository.ts     # Phase 5
│   │   │   │   ├── duplicate.repository.ts  # Phase 5
│   │   │   │   ├── template.repository.ts   # Phase 5
│   │   │   │   ├── import.repository.ts     # Phase 5
│   │   │   │   ├── validation.repository.ts # Phase 5
│   │   │   │   └── esgSubmission.repository.ts # Phase 2B
│   │   │   └── types.ts
│   │   ├── ipc/
│   │   │   ├── case.handlers.ts
│   │   │   ├── auth.handlers.ts         # Phase 3
│   │   │   ├── workflow.handlers.ts     # Phase 3
│   │   │   ├── audit.handlers.ts        # Phase 3
│   │   │   ├── notification.handlers.ts # Phase 3
│   │   │   ├── psr.handlers.ts          # Phase 4
│   │   │   ├── meddra.handlers.ts       # Phase 5
│   │   │   ├── whodrug.handlers.ts      # Phase 5
│   │   │   ├── search.handlers.ts       # Phase 5
│   │   │   ├── duplicate.handlers.ts    # Phase 5
│   │   │   ├── template.handlers.ts     # Phase 5
│   │   │   ├── import.handlers.ts       # Phase 5
│   │   │   ├── validation.handlers.ts   # Phase 5
│   │   │   └── esgApi.handlers.ts       # Phase 2B
│   │   ├── services/
│   │   │   ├── validationService.ts
│   │   │   ├── xmlGeneratorService.ts
│   │   │   ├── form3500ImportService.ts
│   │   │   ├── authService.ts           # Phase 3
│   │   │   ├── passwordService.ts       # Phase 3
│   │   │   ├── workflowService.ts       # Phase 3
│   │   │   ├── auditService.ts          # Phase 3
│   │   │   ├── psrService.ts            # Phase 4
│   │   │   ├── meddraService.ts         # Phase 5
│   │   │   ├── whodrugService.ts        # Phase 5
│   │   │   ├── searchService.ts         # Phase 5
│   │   │   ├── duplicateService.ts      # Phase 5
│   │   │   ├── templateService.ts       # Phase 5
│   │   │   ├── importService.ts         # Phase 5
│   │   │   ├── validationEngineService.ts # Phase 5
│   │   │   ├── credentialStorageService.ts # Phase 2B
│   │   │   ├── esgAuthService.ts          # Phase 2B
│   │   │   ├── esgApiService.ts           # Phase 2B
│   │   │   ├── esgSubmissionService.ts    # Phase 2B (gated by lint + 5-pass)
│   │   │   ├── esgPollingService.ts       # Phase 2B
│   │   │   ├── statusTransitionService.ts # Phase 2B (extended)
│   │   │   ├── xmlLintService.ts          # Post-2L8T: wraps faers_xml_lint.py
│   │   │   ├── fivePassValidatorService.ts # Post-2L8T: empirical validator
│   │   │   ├── faersEmpiricalPolicy.ts    # Post-2L8T: codified policy table (FAERS_POLICY + IND_POLICY)
│   │   │   ├── ackParserService.ts        # Post-2L8T: HL7 ACK parser (reportContext aware)
│   │   │   ├── caseImportService.ts       # Apr 2026: JSON DSL → Case (zod-validated)
│   │   │   └── indCaseService.ts          # Phase 6: SUSAR workflow (causality, expectedness, unblinding) — NOT yet wired into import/export
│   │   ├── headless/                      # Apr 2026: standalone CLI entry
│   │   │   └── cli.ts                     # `npm run headless -- file.json`; esbuild-bundled, runs under ELECTRON_RUN_AS_NODE
│   │   └── pdf/
│   │       └── form3500Parser.ts
│   │
│   ├── renderer/                        # React frontend
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── stores/
│   │   │   ├── caseStore.ts
│   │   │   ├── authStore.ts             # Phase 3
│   │   │   ├── userStore.ts             # Phase 3
│   │   │   ├── workflowStore.ts         # Phase 3
│   │   │   ├── notificationStore.ts     # Phase 3
│   │   │   ├── psrStore.ts              # Phase 4
│   │   │   ├── meddraStore.ts           # Phase 5
│   │   │   ├── whodrugStore.ts          # Phase 5
│   │   │   ├── searchStore.ts           # Phase 5
│   │   │   ├── duplicateStore.ts        # Phase 5
│   │   │   ├── templateStore.ts         # Phase 5
│   │   │   ├── importStore.ts           # Phase 5
│   │   │   ├── validationStore.ts       # Phase 5
│   │   │   └── esgApiStore.ts           # Phase 2B
│   │   └── components/
│   │       ├── case-list/
│   │       │   └── CaseList.tsx
│   │       ├── case-form/
│   │       │   ├── index.ts
│   │       │   ├── ReportInfoSection.tsx
│   │       │   ├── ReporterSection.tsx
│   │       │   ├── SenderSection.tsx
│   │       │   ├── PatientSection.tsx
│   │       │   ├── ReactionsSection.tsx
│   │       │   ├── DrugsSection.tsx
│   │       │   ├── NarrativeSection.tsx
│   │       │   ├── CommentsSection.tsx      # Phase 3
│   │       │   └── NotesSection.tsx         # Phase 3
│   │       ├── auth/                        # Phase 3
│   │       │   ├── LoginForm.tsx
│   │       │   └── ChangePasswordDialog.tsx
│   │       ├── workflow/                    # Phase 3
│   │       │   ├── WorkflowActions.tsx
│   │       │   └── CaseAssignment.tsx
│   │       ├── users/                       # Phase 3
│   │       │   ├── UserList.tsx
│   │       │   └── UserForm.tsx
│   │       ├── audit/                       # Phase 3
│   │       │   └── AuditLog.tsx
│   │       ├── notifications/               # Phase 3
│   │       │   └── NotificationCenter.tsx
│   │       ├── psr/                         # Phase 4
│   │       │   ├── index.ts
│   │       │   ├── PSRDashboard.tsx
│   │       │   ├── PSRList.tsx
│   │       │   ├── PSRDetail.tsx
│   │       │   ├── CreatePSRWizard.tsx
│   │       │   └── PSRScheduleConfig.tsx
│   │       ├── meddra/                      # Phase 5
│   │       │   ├── index.ts
│   │       │   ├── MedDRABrowser.tsx
│   │       │   ├── MedDRAAutocomplete.tsx
│   │       │   └── MedDRAImport.tsx
│   │       ├── whodrug/                     # Phase 5
│   │       │   ├── index.ts
│   │       │   ├── WHODrugBrowser.tsx
│   │       │   ├── WHODrugAutocomplete.tsx
│   │       │   └── WHODrugImport.tsx
│   │       ├── search/                      # Phase 5
│   │       │   ├── index.ts
│   │       │   ├── AdvancedSearchBuilder.tsx
│   │       │   ├── SearchResults.tsx
│   │       │   └── SavedSearches.tsx
│   │       ├── duplicates/                  # Phase 5
│   │       │   ├── index.ts
│   │       │   ├── DuplicateAlert.tsx
│   │       │   ├── DuplicateRegistry.tsx
│   │       │   └── MergeCasesWizard.tsx
│   │       ├── templates/                   # Phase 5
│   │       │   ├── index.ts
│   │       │   ├── TemplateLibrary.tsx
│   │       │   └── TemplateEditor.tsx
│   │       ├── import/                      # Phase 5
│   │       │   ├── index.ts
│   │       │   ├── ImportWizard.tsx
│   │       │   ├── ImportUploadStep.tsx
│   │       │   ├── ColumnMapper.tsx
│   │       │   ├── ImportValidationStep.tsx
│   │       │   ├── ImportExecutionStep.tsx
│   │       │   └── ImportList.tsx
│   │       ├── validation/                  # Phase 5
│   │       │   ├── index.ts
│   │       │   ├── ValidationRuleList.tsx
│   │       │   └── ValidationResultsPanel.tsx
│   │       └── submission/                  # Phase 2B (extended)
│   │           ├── EsgApiSettingsTab.tsx
│   │           ├── SubmitToFdaDialog.tsx    # embeds FivePassValidatorPanel
│   │           ├── SubmissionProgressDialog.tsx
│   │           ├── AcknowledgmentDisplay.tsx
│   │           ├── PollingStatusIndicator.tsx
│   │           ├── FivePassValidatorPanel.tsx # Post-2L8T
│   │           └── ImportAckDialog.tsx        # Post-2L8T
│   │
│   ├── shared/                          # Shared between processes
│   │   └── types/
│   │       ├── case.types.ts
│   │       ├── ipc.types.ts
│   │       ├── form3500.types.ts
│   │       ├── auth.types.ts            # Phase 3
│   │       ├── workflow.types.ts        # Phase 3
│   │       ├── audit.types.ts           # Phase 3
│   │       ├── psr.types.ts             # Phase 4
│   │       ├── meddra.types.ts          # Phase 5
│   │       ├── whodrug.types.ts         # Phase 5
│   │       ├── search.types.ts          # Phase 5
│   │       ├── duplicate.types.ts       # Phase 5
│   │       ├── template.types.ts        # Phase 5
│   │       ├── import.types.ts          # Phase 5
│   │       ├── validation.types.ts      # Phase 5
│   │       ├── esgApi.types.ts          # Phase 2B
│   │       └── faersValidation.types.ts # Post-2L8T: ParsedAck, FivePassResult, …
│   │
│   ├── preload/
│   │   └── index.ts                     # contextBridge API exposure
│   │
│   └── test/                            # Test utilities
│       └── setup.ts
│
├── e2e/                                 # Playwright E2E tests
│   └── *.spec.ts
│
├── docs/
│   ├── requirements/
│   │   ├── 01_Phase1_Core_ICSR_MVP.md
│   │   ├── 02_Phase2_ESG_Submission.md
│   │   ├── 03_Phase3_MultiUser_Workflow.md
│   │   └── 04_Phase4_NonExpedited_PSR.md
│   ├── architecture/
│   │   ├── 03_Architecture_Design.md
│   │   └── 04_Implementation_Status.md
│   └── user/
│       └── 02_User_Guide.md
│
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 4. Database Schema

### 4.1 Core Tables (Phases 1-2)

| Table | Description |
|-------|-------------|
| `cases` | Main case records with all E2B fields |
| `case_drugs` | Medications linked to cases |
| `case_drug_dosages` | Dosage information for drugs |
| `case_drug_substances` | Active ingredients |
| `case_reactions` | Adverse events |
| `case_reporters` | Primary sources |
| `lookup_countries` | ISO country codes |
| `settings` | Application settings |
| `migrations` | Applied database migrations |

### 4.2 Phase 3 Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with hashed passwords |
| `roles` | Role definitions (Admin, Manager, etc.) |
| `user_sessions` | Active session tracking |
| `audit_log` | Complete audit trail |
| `case_comments` | Workflow comments |
| `case_notes` | Personal/team notes |
| `notifications` | User notifications |

### 4.3 Phase 4 Tables

| Table | Description |
|-------|-------------|
| `products` | Product master with approval info |
| `psr_schedules` | PSR schedule configurations |
| `psrs` | Periodic Safety Reports |
| `psr_cases` | Cases linked to PSRs |
| `submission_batches` | Batch submission records |
| `batch_cases` | Cases in batches |
| `case_seriousness` | Seriousness criteria per case |

**Phase 4 Case Table Extensions:**
- `report_type_classification` - expedited/non_expedited
- `is_serious` - boolean
- `expectedness` - expected/unexpected/unknown
- `parent_case_id` - for follow-ups
- `case_version` - version number
- `followup_type` - type of follow-up
- `is_nullified` - nullification flag
- `product_id` - link to products table

### 4.4 Phase 5 Tables

| Table | Description |
|-------|-------------|
| `meddra_versions` | MedDRA dictionary version tracking |
| `meddra_soc` | System Organ Class terms |
| `meddra_hlgt` | High Level Group Terms |
| `meddra_hlt` | High Level Terms |
| `meddra_pt` | Preferred Terms |
| `meddra_llt` | Lowest Level Terms |
| `meddra_hierarchy` | Complete hierarchy relationships |
| `whodrug_versions` | WHO Drug dictionary version tracking |
| `whodrug_products` | Drug trade names |
| `whodrug_ingredients` | Active ingredients |
| `whodrug_atc` | ATC classification codes |
| `saved_searches` | User saved search queries |
| `case_search_history` | Recent search history |
| `duplicate_candidates` | Detected duplicate pairs |
| `merged_cases` | Merged case tracking |
| `case_templates` | Reusable case templates |
| `template_usage` | Template usage tracking |
| `import_jobs` | Bulk import job records |
| `import_job_rows` | Individual row import results |
| `saved_column_mappings` | Reusable column mappings |
| `validation_rules` | Configurable validation rules |
| `validation_results` | Per-case validation results |

**Phase 5 Case Table Extensions:**
- `llt_code`, `llt_name` - MedDRA LLT coding
- `pt_code`, `pt_name` - MedDRA PT coding
- `soc_code`, `soc_name` - MedDRA SOC coding
- `meddra_version` - Version used for coding
- `whodrug_code` - WHO Drug code for drugs
- `atc_code` - ATC classification code

### 4.5 Phase 2B Tables

| Table | Description |
|-------|-------------|
| `api_submission_attempts` | API submission attempt records |

**Phase 2B Case Table Extensions:**
- `esg_submission_id` - ESG NextGen submission ID
- `esg_core_id` - ESG Core ID returned on submission
- `api_submission_started_at` - When API submission started
- `api_last_error` - Last API submission error
- `api_attempt_count` - Number of API submission attempts

**api_submission_attempts Fields:**
- `id`, `case_id`, `attempt_number`
- `esg_submission_id`, `esg_core_id`
- `environment` (Test/Production)
- `status` (in_progress/success/failed)
- `started_at`, `completed_at`
- `error`, `error_category`, `http_status_code`
- `ack_type` (ACK1/ACK2/ACK3/NACK)
- `ack_timestamp`, `ack_fda_core_id`, `ack_errors`

---

## 5. Key Type Definitions

### 5.1 PSR Types (`src/shared/types/psr.types.ts`)

```typescript
export type PSRFormat = 'PADER' | 'PSUR' | 'PBRER';
export type PSRFrequency = 'quarterly' | 'semi_annual' | 'annual' | 'biennial';
export type PSRStatus =
  | 'scheduled' | 'draft' | 'under_review'
  | 'approved' | 'submitted' | 'acknowledged' | 'closed';

export interface PSRSchedule {
  id: number;
  productId: number;
  psrFormat: PSRFormat;
  frequency: PSRFrequency;
  dlpOffsetDays: number;
  dueOffsetDays: number;
  startDate?: string;
  isActive: boolean;
}

export interface PSR {
  id: number;
  psrNumber: string;
  productId: number;
  psrFormat: PSRFormat;
  periodStart: string;
  periodEnd: string;
  dataLockPoint: string;
  dueDate: string;
  status: PSRStatus;
  caseCounts?: { included: number; excluded: number; pending: number };
}

export interface PSRDashboardSummary {
  upcomingDeadlines: PSRListItem[];
  overduePSRs: PSRListItem[];
  dueThisWeek: PSRListItem[];
  psrsInProgress: PSRListItem[];
  statusCounts: Record<string, number>;
  casesAwaitingPSR: number;
}
```

### 5.2 Extended Case Type

```typescript
interface Case {
  // ... existing fields ...

  // Phase 4: Report Classification
  reportTypeClassification?: 'expedited' | 'non_expedited';
  isSerious?: boolean;
  expectedness?: 'expected' | 'unexpected' | 'unknown';
  expectednessJustification?: string;

  // Phase 4: Follow-up
  parentCaseId?: string;
  caseVersion?: number;
  followupType?: FollowupType;
  followupInfoDate?: string;

  // Phase 4: Nullification
  isNullified?: boolean;
  nullificationReason?: NullificationReason;

  // Phase 4: Product link
  productId?: number;
}
```

### 5.3 Extended Workflow Status

```typescript
type WorkflowStatus =
  | 'Draft'
  | 'Data Entry Complete'
  | 'In Medical Review'
  | 'Medical Review Complete'
  | 'In QC Review'
  | 'QC Complete'
  | 'Approved'
  | 'Pending PSR'        // Phase 4: Non-expedited awaiting PSR
  | 'Included in PSR'    // Phase 4: Added to a PSR
  | 'Submitted'
  | 'Acknowledged'
  | 'Rejected';
```

---

## 6. Service Layer Details

### 6.1 Phase 4 Services

**PSRService** (`src/main/services/psrService.ts`)
- `create(data)` - Create new PSR
- `transition(id, status, comment)` - Status transitions
- `addCases(psrId, caseIds)` - Include cases
- `excludeCases(psrId, cases)` - Exclude with reason
- `getEligibleCases(psrId)` - Find eligible cases
- `getDashboard()` - Dashboard summary
- `getNextPeriod(scheduleId)` - Calculate next period dates

**Period Calculation Logic:**
```typescript
function calculateNextPeriod(schedule: PSRSchedule): PSRPeriodCalculation {
  const frequencyMonths = PSR_FREQUENCY_MONTHS[schedule.frequency];
  const periodStart = lastPeriodEnd || schedule.startDate || approvalDate;
  const periodEnd = addMonths(periodStart, frequencyMonths);
  const dataLockPoint = subDays(periodEnd, schedule.dlpOffsetDays);
  const dueDate = addDays(periodEnd, schedule.dueOffsetDays);
  return { periodStart, periodEnd, dataLockPoint, dueDate };
}
```

### 6.2 PSR Status Transitions

| From | To | Allowed |
|------|----|----|
| scheduled | draft | ✓ |
| draft | under_review | ✓ |
| under_review | draft, approved | ✓ |
| approved | under_review, submitted | ✓ |
| submitted | acknowledged | ✓ |
| acknowledged | closed | ✓ |
| closed | (none) | - |

---

## 7. IPC Channels

### 7.1 Phase 4 Channels

```typescript
// Product operations
PRODUCT_LIST: 'product:list',
PRODUCT_GET: 'product:get',
PRODUCT_CREATE: 'product:create',
PRODUCT_UPDATE: 'product:update',
PRODUCT_DELETE: 'product:delete',

// PSR operations
PSR_SCHEDULE_LIST: 'psr:getSchedulesByProduct',
PSR_SCHEDULE_CREATE: 'psr:createSchedule',
PSR_SCHEDULE_UPDATE: 'psr:updateSchedule',
PSR_SCHEDULE_DELETE: 'psr:deleteSchedule',
PSR_NEXT_PERIOD: 'psr:getNextPeriod',
PSR_CREATE: 'psr:create',
PSR_GET: 'psr:get',
PSR_LIST: 'psr:list',
PSR_TRANSITION: 'psr:transition',
PSR_CASES: 'psr:getCases',
PSR_ELIGIBLE_CASES: 'psr:getEligibleCases',
PSR_UPDATE_CASES: 'psr:updateCases',
PSR_DASHBOARD: 'psr:getDashboard',
```

### 7.2 Phase 2B Channels (ESG NextGen API)

```typescript
// Credential management
ESG_SAVE_CREDENTIALS:     'esg:saveCredentials',
ESG_HAS_CREDENTIALS:      'esg:hasCredentials',
ESG_CLEAR_CREDENTIALS:    'esg:clearCredentials',

// Settings management
ESG_GET_SETTINGS:         'esg:getSettings',
ESG_SAVE_SETTINGS:        'esg:saveSettings',
ESG_TEST_CONNECTION:      'esg:testConnection',

// Submission operations
ESG_SUBMIT_CASE:          'esg:submitCase',
ESG_RETRY_SUBMISSION:     'esg:retrySubmission',
ESG_CANCEL_SUBMISSION:    'esg:cancelSubmission',
ESG_GET_PROGRESS:         'esg:getProgress',
ESG_GET_PRE_SUMMARY:      'esg:getPreSubmissionSummary',
ESG_GET_ATTEMPTS:         'esg:getAttempts',

// Acknowledgment polling
ESG_CHECK_ACK:            'esg:checkAcknowledgment',
ESG_POLLING_START:        'esg:pollingStart',
ESG_POLLING_STOP:         'esg:pollingStop',
ESG_POLLING_STATUS:       'esg:pollingStatus',

// Event channel (main → renderer push)
ESG_SUBMISSION_PROGRESS:  'esg:submission-progress',
```

---

## 8. Testing

### 8.1 Unit Tests

Run with: `npm test`

| Test File | Coverage |
|-----------|----------|
| `authService.test.ts` | Authentication logic |
| `passwordService.test.ts` | Password hashing/validation |
| `validationService.test.ts` | E2B validation rules |
| `workflowService.test.ts` | Workflow transitions |
| `auditService.test.ts` | Audit logging |
| `user.repository.test.ts` | User CRUD |
| `authStore.test.ts` | Auth state management |

### 8.2 E2E Tests

Run with: `npm run test:e2e`

Located in `e2e/` directory, testing:
- Login/logout flows
- Case creation and editing
- Workflow transitions
- PSR creation and management

---

## 9. Known Limitations

- MedDRA/WHO Drug dictionary data files must be obtained separately (licensed)
- Batch size limited to 100 cases per submission
- Signal detection analytics not yet implemented
- External PV database integration not yet available

---

## 10. Next Steps

### 10.1 Live FDA submissions (the actual blocker)

The codebase is ready to submit IND-T01. Without a live ZZFDA_PREMKT ACK3, no further IND code work pays back — every `IND_POLICY` entry is `untested` and Passes 1/4/5 of the validator are skipped because there's no IND golden XML to diff against.

See **[`docs/handoffs/2026-04-25_session_handoff.md`](../handoffs/2026-04-25_session_handoff.md)** §4 for the explicit submit-and-respond workflow on both CA+AA and CR+AR outcomes.

### 10.2 Phase-6 IND items already shipped

These were originally listed as Phase 6 deliverables; checking off what landed in the SUSAR/IND work (§2.2F above).

| Originally listed | Status |
|---|---|
| IND safety report support (21 CFR 312.32) | ✓ E2B emission complete (researchStudy, drug approval, G.k.10a.r); 7- vs 15-day timeline auto-derives from seriousness |
| Clinical trial case management (study ID, subject number, blinding) | ✓ DB columns + Case interface fields wired in via Phase 6 schema; IND import schema exposes them |
| Blinding management | Schema exists (`Case.isBlinded`, `treatmentArm`); not yet enforced or surfaced in UI |
| BA/BE study support | ✓ `caseType: 'babe'` enforces the G.k.10a.r drug-pair rule (exactly one TEST + one REFERENCE) |
| Follow-up IND reports | ✓ E2B C.1.9 version derives from `initialOrFollowup`; IND-T07 example exercises it |

### 10.3 Phase-6 IND items still open

| Item | Notes |
|---|---|
| **IND-specific Python lint catalogue** | `faers_xml_lint.py` hard-codes postmarket receivers; the headless CLI skips it for IND/BA-BE today. A parallel `faers_ind_lint.py` (or `--ind` mode) would restore that gate. Only meaningful after T01 confirms the accepted shape. |
| **IND golden XML + un-skip Passes 1/4/5** | Once ZZFDA_PREMKT returns CA+AA on T01, save the submitted XML to `test/golden/` and switch the 5-pass validator to use it as the IND diff target. |
| **SUSAR workflow integration** | `indCaseService.ts` models causality, dual causality, expectedness vs IB, and unblinding. None of it is reachable from the import/export pipeline. Wire-up needed when SUSAR determination should gate Submit-to-FDA. |
| **Form FDA 3500A generation** | Bidirectional with `Form3500ImportService` — the import path is built (PDF → Case); export path (Case → PDF) is not. |
| **IND annual report compilation** | Roll up multiple SUSARs over a reporting period. |
| **UI for IND fields** (spec §5.7) | Report Type selector + IndStudyInfo form + per-drug Drug Role dropdown. Deferred — headless is the primary path. |

### 10.4 Reporting & Analytics (Phase 8 — not started)

1. **Dashboards**
   - Case volume trends
   - Submission metrics
   - User activity reports

2. **Signal Detection**
   - Statistical analysis support
   - Disproportionality analysis

### 10.2 Reporting & Analytics (Phase 8)

1. **Dashboards**
   - Case volume trends
   - Submission metrics
   - User activity reports

2. **Signal Detection**
   - Statistical analysis support
   - Disproportionality analysis

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude Code | Initial Phase 1 implementation status |
| 2.0 | January 2026 | Claude Code | Phase 3: Multi-user, workflow, audit trail |
| 3.0 | January 2026 | Claude Code | Phase 4: Products, report classification, follow-ups, nullification, batch submission, PSR management with dashboard, creation wizard, scheduling, case aggregation |
| 4.0 | January 2026 | Claude Code | Phase 5: MedDRA dictionary integration, WHO Drug dictionary, advanced search and filtering, duplicate detection and resolution, case templates, bulk import wizard, configurable validation engine |
| 5.0 | January 2026 | Claude Code | Phase 2B: ESG NextGen API integration - automated FDA submission via REST API, OAuth 2.0 authentication, secure credential storage, real-time progress tracking, acknowledgment polling, retry logic with exponential backoff |
