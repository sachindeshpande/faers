# Session Handoff — 2026-04-25

**Branch state:** `main` at `26df8f0` (pushed). Branches `headless_mode` and `ind-support` are merged but still on `origin` — can be deleted.
**Last live FDA submission:** none yet for IND. Postmarket baseline is 2L8T (CA+AA, 2026-04-21).

---

## 1. What this project is — orient yourself first

DeepQuence is an Electron desktop app that generates FDA E2B(R3) ICSR XML and submits it to the ESG NextGen gateway. The `faers-app/` directory is the Electron app; everything under `test/test_submission/` is the empirical evidence trail (real FDA ACKs, hand-crafted golden XMLs from the 37-iteration v37 debugging campaign, and now app-generated submissions).

**The single most important thing to internalise:** the FAERS 2.18 validator at FDA accepts or rejects submissions based on rules that are *not* fully documented in the E2B(R3) spec. The only reliable source of truth for what's accepted is real ACK3 evidence. The codebase encodes this in two empirical-policy tables (`FAERS_POLICY` for postmarket, `IND_POLICY` for IND), each row labelled `proven_safe` / `proven_rejected` / `untested` with the case ID as evidence. When you see "untested" in this codebase it's not a TODO — it's a regulatory truth statement. Promotions happen only after live ACK3s come back.

For deeper context read **`test/test_submission/CLAUDE_CODE_SESSION_HANDOFF_2L8T.md`** — that's the postmarket-equivalent handoff written after the 2L8T CA+AA. Read this current document second.

---

## 2. What this session delivered

In rough commit order on `main`:

| Commit | Scope |
|---|---|
| `64feb77` (in PR #1) | JSON case import path + 10 postmarket example JSONs (TC-A01..G04) |
| `165a448` (in PR #1) | Headless CLI runner — `npm run headless -- file.json` runs the full import → validate → generate → gate → export pipeline against an ephemeral SQLite DB; fixes a pre-existing `validateXmlStructure` bug along the way |
| `a52b8d5` (in PR #1) | Golden reference XMLs `test/golden/CASE-20260421-2L8T.xml` and `CASE-20260422-RSJK.xml` |
| `cca4103` (in PR #1) | Moved example JSONs under `test/test_submission/examples/cases/` |
| **`fb4cbaa` — PR #1 merged** | All of the above lands on main |
| `6af7c3c` (in PR #2) | SUSAR / IND Safety Report support per `docs/requirements/SUSAR_IND_Feature_Spec.md` — researchStudy block, drug approval block, G.k.10a.r emission, IND import schema, IND_POLICY table, IND-T01 example, migration 025 |
| `57ba9d7` (in PR #2) | Auto-infer `--report-type Premarket` from `case.caseType` in headless CLI |
| `3ae1904` (in PR #2) | Pass 3 IND structural checks (C.1.3=2, C.5.4=1, G.k.10a.r ∈ {1, 2, NA}) + ACK parser `reportContext` tagging |
| `017fd92` (in PR #2) | Six more IND example JSONs (T02..T07) + BA/BE G.k.10a.r drug-pair enforcement + 7/15-day timeline auto-derivation |
| **`35e6006` — PR #2 merged** | All IND work lands on main |
| `26df8f0` | Gap-analysis fixes: `ZZFDATST_PREMKT` → `ZZFDA_PREMKT`, C.1.9 version derivation switched from SQLite row-version to E2B report-version semantic |

---

## 3. Live system state

### Branches
- `main` — at `26df8f0` (in sync with origin). All work in this session is here.
- `headless_mode` — merged via PR #1. Still on origin. **Safe to delete** (`git push origin --delete headless_mode` and `git branch -d headless_mode`).
- `ind-support` — merged via PR #2. Still on origin. **Safe to delete** same way.

### Tests
`287 passed | 27 failed` on `npx vitest run`. The 27 failures are in three pre-existing files that were broken before this session ever started:
- `src/main/services/workflowService.test.ts` — assertion mismatch (Permission denied vs Invalid transition)
- `src/renderer/stores/authStore.test.ts` — zustand persist middleware misconfig under jsdom
- `src/main/services/xmlGeneratorService.integration.test.ts` — needs `test:integration` runner (Electron Node) for `better-sqlite3` native bindings

None of these are caused by this session's work. Don't try to fix them as part of any IND-related task.

### IND XML packages ready for manual submission
Sitting at `test/test_submission/from_app/ind/`. **History:** v3 was rejected by GAP-IND-001 (`ZZFDA_PREMKT` for Test); v4 was rejected by GAP-IND-002 (missing `FDA.C.5.6.r`, boolean on `FDA.E.i.3.2h`); **v5 of IND-T01 returned CA+AE on 2026-04-27** — case loaded successfully with a single AE warning that exposes a documented FDA rules contradiction for `FDA.C.5.6.r` on `CDER_IND` (mandatory if absent → CR+AR; "invalid for center" if present → CA+AE). v5 of IND-T05 (fatal/7-day) hit GAP-IND-003 (schema parse error: `effectiveTime` after `value` in the death observation). v6 carries the GAP-IND-003 fix and is awaiting the next round-trip for the remaining cases:
- `IND-T01-susar-baseline.xml` — **submitted, CA+AE confirmed (v5 = v6, no body change)**
- `IND-T02-susar-repeat.xml` — second case for the FDA "two consecutive positive ACKs" rule
- `IND-T05-fatal-seven-day.xml` — fatal hepatic failure, 7-day expedited; v6 fixes death observation order
- `IND-T07-followup-report.xml` — follow-up amendment, version=3

These are **not committed** — same convention as postmarket `from_app/` outputs (only `test/golden/` is tracked). Regeneratable any time via `npm run headless`.

### Empirical policy state
- `FAERS_POLICY` (postmarket): race C41260 / ethnicity C41222 / med-history "None reported" / outcomes 1+3+6 are `proven_safe`. C17998 race+ethnicity is `proven_rejected`. Source of truth: `src/main/services/faersEmpiricalPolicy.ts`.
- `IND_POLICY`: `batchReceiver` (`ZZFDATST_PREMKT`), `msgReceiver` (`CDER_IND`), `crossReportedInd` (present, OID `.2.3`), and `requiredIntervention` (`nullFlavor="NI"`) are `proven_safe` — IND-T01 v4 ACK3 `ci260427204838` came back CA+AE on 2026-04-27. Remaining rows (indNumber, studyType, typeOfReport, drugRoleTest/Ref/Na) are still `untested`. The IND validator skips Passes 1/4/5 and the headless CLI skips the postmarket Python lint for IND/BA-BE cases until an IND-specific reference exists.

---

## 4. The pivotal next step (not a code task)

**Submit `test/test_submission/from_app/ind/IND-T01-susar-baseline.xml` to FDA via `https://esgng.fda.gov`** (Center=CDER, Submission Type=IND/Premarket). Wait for ACK3. **This is the single most valuable activity** the codebase is currently waiting on. Without it, every downstream IND code task hits diminishing returns.

When the ACK3 arrives, drop it in `test/test_submission/acks/` keeping the FDA filename. Then come back and tell whichever Claude session is alive whether it was CA+AA or CR+AR.

**On CA+AA:**
1. Save the submitted XML to `test/golden/IND-T01-CA+AA.xml`.
2. Promote the relevant entries in `IND_POLICY` from `untested` → `proven_safe` with the case ID as evidence. Specifically: `indNumber`, `studyType`, `typeOfReport`, `batchReceiver`, `msgReceiver` are confirmed by *any* CA+AA. If T01 has C41260 race / C41222 ethnicity (it does) and they survived FAERS 2.18 on the Premarket gateway, those become `proven_safe` for IND too.
3. Submit IND-T02 same day for the FDA two-positive-ACK rule.
4. Once both T01 and T02 are CA+AA, un-skip Passes 1/4/5 for IND in `fivePassValidatorService.ts` (`indSkip` ternary) — the IND golden now exists, so the v37 diff is replaceable with an IND-vs-IND diff. Update the validator to load the IND golden when `caseType === 'ind'`.
5. Submit T05 (fatal/7-day) and T07 (follow-up) as second-wave probes.

**On CR+AR:**
1. Use the **Import ACK** toolbar dialog in the running app (`npm run dev`) or call `esgParseAck({ filePath, caseId: 'IND-T01-...' })` via IPC. Either way you'll get a `ParsedAck` with the structured rejection list.
2. Map each `rejection.tag` to the field in the source JSON / generator. The rejection format is the same FAERS 2.18 shape we mapped for postmarket — `C.3.4.3`, `FDA.D.11.r.1`, etc.
3. Patch the generator or the example, regenerate, repeat. This is the same loop that took postmarket v1 → 2L8T (5 iterations); IND should be cleaner because we've front-loaded the spec compliance.
4. Update `IND_POLICY` entries to `proven_rejected` with the case ID as evidence.

---

## 5. Open code tasks (none blocking the FDA submission)

These are queued but deliberately deferred until the FDA submission outcome is known. Don't do them speculatively.

### Cleanup chores
- Delete the stale `headless_mode` and `ind-support` branches from origin and locally.
- The `.DS_Store` modifications, `playwright-report/`, `test-results/`, root `node_modules/`, the various uncommitted `.xlsx` files in `test/test_submission/`, and the new ACK file `ci260423000420.…ack` are all hanging around. None are blockers; clean up at your discretion.
- Doc sweep — these still reference `ZZFDATST_PREMKT`:
  - `docs/user/FAERS_Test_Submission_Setup_Guide.md`
  - `test/test_submission/README_Test_Submission_Instructions.md`
  - Possibly more — `grep -r ZZFDATST_PREMKT docs/ test/` will find them. The codebase itself is clean.

### Bigger features deferred per the spec
- **IND-specific lint catalogue.** Right now the headless CLI skips the Python 55-check `faers_xml_lint.py` for IND/BA-BE cases because the script hard-codes the postmarket receiver set. A parallel `faers_ind_lint.py` (or an `--ind` mode) would restore that gate. Only meaningful after T01 has confirmed an accepted IND shape.
- **SUSAR workflow integration.** `indCaseService.ts` already models causality assessment, dual causality, expectedness vs IB, and unblinding. None of this is reachable from the import or export path today. When you want SUSAR determination to gate Submit-to-FDA (vs being user-driven in the GUI), this is meaningful work.
- **UI surface (spec §5.7).** Report Type selector + IND form section + per-drug Drug Role dropdown. Deliberately deferred — headless is the primary path.
- **IND examples T03, T04, T06.** Cross-referenced INDs, NCT-less, and BA/BE. Worth doing only after T01/T02 prove the baseline shape works.
- **ACK auto-routing via `reportContext`.** The parser now accepts `reportContext`, and the IPC handler resolves it from a `caseId`. Polling and submission flows still need to stamp it; that wires in once IND submissions become routine.

---

## 6. Architecture quick-reference

If this is your first time reading this codebase, three documents will pay back the time:

1. **`test/test_submission/CLAUDE_CODE_SESSION_HANDOFF_2L8T.md`** — the postmarket story, which is the foundation everything else builds on. Read §6 (empirical value policy) and §7 (structural requirements) at minimum.
2. **`docs/requirements/SUSAR_IND_Feature_Spec.md`** — the spec the IND work implements. §3 (data model), §4 (XML changes), §7 (test plan) are the core.
3. **`docs/architecture/04_Implementation_Status.md`** — a top-down map of every service, repo, IPC channel, and DB table.

### Service layout

```
faers-app/src/main/
├── database/
│   ├── connection.ts           ← migrations live here as inline blocks (1–25)
│   └── repositories/
│       ├── case.repository.ts  ← Case ↔ DB; recently extended for indStudy + Phase-6 IND fields
│       └── drug.repository.ts  ← extended for indAuthorizationNumber + fdaAdditionalDrugInfo
├── services/
│   ├── xmlGeneratorService.ts        ← THE generator. Single entry point.
│   ├── caseImportService.ts          ← JSON DSL → DB. zod-validated.
│   ├── validationService.ts          ← markReady gate; field-level E2B checks
│   ├── xmlLintService.ts             ← wraps faers_xml_lint.py (Python)
│   ├── fivePassValidatorService.ts   ← P1 element diff, P2 CE completeness,
│   │                                   P3 business rules + IND structural,
│   │                                   P4 value diff vs golden, P5 empirical
│   ├── faersEmpiricalPolicy.ts       ← FAERS_POLICY + IND_POLICY tables
│   ├── ackParserService.ts           ← FDA HL7 ACK → ParsedAck
│   ├── statusTransitionService.ts    ← Draft → Ready → Exported workflow
│   └── indCaseService.ts             ← Phase-6 SUSAR workflow (NOT in import/export path yet)
├── headless/cli.ts                  ← npm run headless entry
└── ipc/                              ← Electron main ↔ renderer bridge
```

### Headless CLI flow per file
`import → markReady (validate) → generate → write XML → structural → lint (skipped IND) → 5-pass → markExported`

### IND vs postmarket dispatch
The single switch is `case.caseType` in (`'postmarket'` | `'ind'` | `'babe'`). Postmarket is default. Setting `caseType: 'ind'` in JSON triggers:
- C.1.3 = `2` (Report from study) instead of `1` (Spontaneous)
- `<researchStudy>` block emitted under `primaryRole/subjectOf1`
- `BATCH_RECEIVERS.Test.Premarket = 'ZZFDATST_PREMKT'`, `BATCH_RECEIVERS.Production.Premarket = 'ZZFDA_PREMKT'` (the `_TST` suffix convention applies to Premarket too — confirmed by FDA ACK3 on 2026-04-27, GAP-IND-001)
- `MESSAGE_RECEIVERS.Premarket.{CDER,CBER}` → `'CDER_IND'` / `'CBER_IND'`
- 5-pass Passes 1/4/5 skip (no IND golden yet)
- 5-pass Pass 3 adds IND structural checks
- 55-check Python lint skipped (postmarket-only catalogue)
- Headless CLI auto-routes to `--report-type Premarket` even with no flag

`caseType: 'babe'` does the same as `'ind'` plus enforces the G.k.10a.r drug-pair rule (exactly one TEST + one REFERENCE drug, others `'NA'`).

---

## 7. Gotchas

- **`caseType` and `Case.version` are different things.** `Case.version` is a SQLite row-counter that increments on every UPDATE. The E2B C.1.9 version is a regulatory report-version (2 = initial, 3+ = follow-up). The generator now uses `caseVersion ?? (initialOrFollowup === FollowUp ? 3 : 2)` — never `caseData.version`. If you see code reading `caseData.version` for any E2B-emitted field, that's a bug.
- **The Python lint hard-codes postmarket receivers.** `test/test_submission/faers_xml_lint.py` will reject any IND XML because `ZZFDA_PREMKT` and `CDER_IND` aren't in its allowlist. The headless CLI explicitly skips it for IND/BA-BE; don't try to make it work without an IND-specific catalogue.
- **Receiver IDs follow the same `_TST` convention for both pathways.** Test/Postmarket = `ZZFDATST`, Test/Premarket = `ZZFDATST_PREMKT`, Production/Postmarket = `ZZFDA`, Production/Premarket = `ZZFDA_PREMKT`. An earlier pre-submission gap analysis (`IND-SUSAR-XML-Gap-Analysis.docx`, Apr 24 2026) claimed Test and Production share `ZZFDA_PREMKT`; that claim is empirically wrong — the IND-T01 ACK3 on 2026-04-27 (GAP-IND-001) returned CR+AR with the explicit message *"File sent with AS2 header 'CDER_IND' must have N.1.4 = 'ZZFDATST_PREMKT'"*. Lesson: don't change empirical-policy values on the basis of a non-empirical gap analysis. Wait for the ACK3.
- **The 55-check Python lint and the in-app 5-pass validator are different things.** The 55-check is structural / spec-correctness (counts elements, checks attribute order, etc.). The 5-pass is empirical / has-FDA-accepted-this-value. Both must pass for postmarket. For IND, only the 5-pass runs (and only Passes 2/3, since 1/4/5 need a golden).
- **The 2L8T golden has only 3 IDs in its PORR sender block** (`.3.11`, `.3.13`, `1.3.6.1.4.1.519.1`). The April 24 gap analysis claimed there's a fourth `.3.12 extension="1"` to add — there isn't. Don't add it.
- **`ParsedAck.reportContext` is set by the caller, not the parser.** The ACK XML doesn't carry it. The IPC handler resolves it via priority: explicit `reportContext` → derive from `caseId` via case repo → undefined.
- **`indReportType` derivation has a warning channel.** When the JSON omits it for an IND case, the importer auto-derives `7_day` (fatal/life-threatening) or `15_day` and pushes a warning into `result.warnings`. Don't treat all warnings as drift in tests — the fixture-driven test filters by `21 CFR 312.32` substring.
- **Premarket cases need both `FDA.C.5.6.r` (cross-reported IND) and `FDA.E.i.3.2h requiredIntervention` as nullFlavor=NI.** Both are 2.18 business-rule rejections caught by IND-T01 ACK3 on 2026-04-27 (GAP-IND-002). C.5.6.r is now enforced by ValidationService (errors when `indStudy.indNumber` is set but `crossReferencedIndNumbers` is empty). The requiredIntervention NI is conditional on `submissionReportType === 'Premarket'` — postmarket still emits the boolean, per v37 lint parity. The `CDER_IND` center has a documented rules contradiction: omitting C.5.6.r causes CR+AR ("mandatory when C.5.5a present") while including it causes CA+AE ("invalid for CDER_IND"). CA+AE is the best achievable outcome and is treated as `proven_safe`.
- **HL7 v3 `observation` requires `effectiveTime` BEFORE `value`.** The death observation (B.1.9, code C28554) emitted them in the wrong order, causing a SAX schema parse error (`cvc-complex-type.2.4.a`) on IND-T05 ACK3 on 2026-04-27 (GAP-IND-003). This rule applies to every `observation` in the doc; the reaction observation already gets it right because the IVL_TS effectiveTime block precedes the MedDRA CE value.
- **Fatal premarket cases need three things.** Caught by IND-T05 ACK4/ACK5 on 2026-04-27 (GAP-IND-004): (1) `FDA.C.1.7.1` 7-Day report must use `code="6"` — `code="7"` is not in the FDA premarket codelist; (2) `D.9.1 deceasedTime` must sit on `player1` next to `birthTime` (the C28554 observation's `effectiveTime` does NOT satisfy D.9.1); (3) `D.9.3` autopsy observation (code `5` on OID `.989.2.1.1.19`) is required whenever D.9.1 is present, with a default boolean of `false` when not captured by the case.

---

## 8. Resuming context

If a new session asks "what should I do next?", the honest answer (assuming no FDA ACK3 has come back yet) is:

1. **Wait for the live submission.** Don't speculatively build IND lint, IND golden, or polling integration until the first ACK3 lands.
2. While waiting, the cleanup tasks in §5 are useful and uncontroversial. The doc sweep specifically is small and worth doing.
3. If the user has an ACK3, jump straight to §4 (the CA+AA or CR+AR branch). That's the work that actually moves the codebase forward.

If the user says "I want to add a new feature" or "fix a bug not on this list" — read **`docs/requirements/SUSAR_IND_Feature_Spec.md`** if it's IND-related, or the relevant phase doc otherwise. Don't trust your training data over the empirical policy table when there's a conflict; trust the code.
