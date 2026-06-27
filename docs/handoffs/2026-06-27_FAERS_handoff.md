# FAERS Session Handoff — 2026-06-27

Purpose: let a new session continue without losing context. Read this top-to-bottom,
then the linked docs. The single most important rule for this project is below.

---

## 0. The one rule that has bitten every prior session

**When a narrative document (fix history, change list, audit) contradicts the live
code, the LIVE CODE WINS.** The proven ground truth is the FDA-accepted reference XML,
not prose. A prior session encoded a *failed* v35/v36 hypothesis as a recommendation;
an audit caught it before damage. Don't repeat it. Authoritative order:

1. `faers-app/src/main/services/xmlGeneratorService.ts` (the generator)
2. `test/test_submission/validate_backbone.py` (15 structural invariants, BB-01…BB-15)
3. `test/test_submission/faers_xml_lint.py` (55+ business-rule checks)
4. Proven reference XMLs (see §6) — and the **ACKs** in `test/test_submission/acks/`
5. Then narrative docs

Full project memory: **`test/test_submission/CLAUDE.md`** (read it — has the BB table with ACK proofs).

---

## 1. Repo / git state

- Repo: `/Users/sachindeshpande/Projects/RegAI/workspace/faers`
- Branch: **`main`** @ `82a37d5`, in sync with `origin/main`. Working tree clean.
- Everything is merged to main and pushed. `faers_gaps` branch was merged (fast-forward) and **deleted** (local + remote).
- Two commits authored this session:
  - `5111e06` — focused task work: MedDRA 25.0 pin, backbone CI, golden checklist, `.env.example`, harness comment-node fix, v36 relocation (8 files).
  - `82a37d5` — "commit everything": the rest of the working tree (generator/import WIP, ACK captures, docs, scenario XMLs, analysis notes — 463 files).

### Git gotcha (will recur)
This repo accumulates **stale 0-byte `.git/*.lock` files** (originally from a crashed May 29 process). If any git op fails with "cannot lock ref / File exists", run:
```bash
find .git -name "*.lock" -delete
```
That is safe here — they are orphaned, not live.

---

## 2. What this session did (chronological)

1. **Audited `Workflow_App_Change_List.md`** against live code. Found most of it already implemented and that it had **inverted** the proven v37 reporter-author rules (the failed v35/v36 hypothesis). Wrote `docs/requirements/response/Workflow_App_Change_List_Audit_Response.md`; the change list was then corrected (`⚠ CORRECTED AFTER AUDIT` header).
2. **Executed the implementation brief** `test/test_submission/CLAUDE_CODE_INSTRUCTIONS.md` (tasks T1–T6, D1–D2). Status in §3.
3. **Troubleshot the generator↔golden divergence** to root cause. Wrote `docs/requirements/response/Generator_Golden_Divergence_Note.md`.
4. **Fixed a regression-harness bug** and **suppressed non-conformant route/dose** in the generator (decisions in §4).
5. Merged to main, deleted the feature branch.

---

## 3. Task status (from CLAUDE_CODE_INSTRUCTIONS.md)

| Task | Status | Notes |
|---|---|---|
| **T1** `.env.example` cleanup | ✅ Done | Fixed `ESG_SUBMISSION_TYPE_IND=EIND` → `AERS_PREMKT_CDER`; added wrong-value-trap comments. EIND routes to the wrong FDA system (per `submit_batch.py:627`). |
| **T2** TC-A06 golden (36 PASS) | ⛔ Deferred | Blocked by the golden divergence (§5). TC-A06 still `json_src: null` in `test/golden/manifest.json`. |
| **T3** `FAERS_USP_Golden_Checklist.md` | ✅ Done | Created in `test/test_submission/`. BB-01…BB-15 with ACK proofs + failed-hypothesis exclusions + MedDRA 25.0 rationale. |
| **T4** Backbone CI | ✅ Done (backbone-only) | `.github/workflows/backbone.yml`. Runs `validate_backbone.py` over the committed corpus + v37 reference. The `golden_regression_test.py` gate is intentionally **omitted** (would be red, §5). |
| **T5** MedDRA reconciliation | ✅ Done → **25.0** | See §4. |
| **T6** Relocate v36 XML | ✅ Done | `package/CASE-…_v36_patch.xml` → `package/superseded/` + README. (Note: `submit_batch.py` never globbed `package/`, so the original "risk" didn't exist — relocation is hygiene.) |
| **(A)** Harness comment-node bug | ✅ Fixed | `golden_regression_test.py:parse_xml` now parses with `remove_comments=True, remove_pis=True`. The generator emits `<!-- G.k.x -->` comments; lxml comment nodes crashed `localname()`. |
| **D1** Suppress `FDA.C.5.6.r` on IND | ⏸ Deferred | Conflicts with regression rule **R0026** (expects it present for IND when C.5.5a populated). Reconcile with ESGNGSupport / FDA IG §5 first. Warning is informational/non-blocking. |
| **D2** `ESG_SUBMISSION_TYPE_IND` canonical value | ⏸ Deferred | Unknown until **AEMSESUB enrollment**. `AERS_PREMKT_CDER` is a placeholder; spec-style `IND` was tested and rejected (ESGNG334). |

---

## 4. Key decisions made this session (and why)

### MedDRA pinned to **25.0** (T5)
- Live generator emitted `27.1`; the FDA-accepted April v37 reference, the June-accepted TC-XP01, and the whole golden corpus use `25.0`.
- User chose **pin to 25.0** (match what FDA actually accepted), not migrate goldens to 27.1.
- Changed in 3 places — keep them in lockstep on any future bump:
  - `faers-app/src/main/services/xmlGeneratorService.ts:88` — `const MEDDRA_VERSION = '25.0'`
  - `test/test_submission/validate_backbone.py` — `EXPECTED_MEDDRA_VERSION_DEFAULT = "25.0"`
  - `test/test_submission/ci_backbone_check.yml` and `.github/workflows/backbone.yml` — `FAERS_MEDDRA_VERSION: "25.0"`

### route/dose **suppressed** (not "fixed forward")
- `routeCode`/`doseQuantity` (commit `862ffa4`, G.k.4) were **structurally non-conformant** with every FDA E2B(R3) reference and absent from ALL accepted goldens:
  - route codeSystem `2.16.840.1.113883.3.989.2.1.1.14` → FDA refs use EDQM `0.4.0.127.0.16.1.1.2.6` + `displayName` + `codeSystemVersion`.
  - `doseQuantity/<center>` → FDA refs use the direct `<doseQuantity value="…" unit="…"/>`.
- User chose "fix the code to match the golden data sets" → suppressed behind a flag:
  `faers-app/src/main/services/xmlGeneratorService.ts:1390` — `const EMIT_GK4_ROUTE_DOSE = false`.
- `getRouteCode` stays referenced inside the guarded block (no unused-symbol error).
- **`asManufacturedProduct` (G.k.3.1) was reviewed and KEPT** — it appears in accepted goldens (IND-T01…T08, TC-A03, TC-A04), so it is validated and conditionally correct.

### Goldens **held for ACK-backed migration** (not regenerated)
- User chose NOT to regenerate the ~34 old-format goldens. They stay as original FDA-accepted captures (each tied to a real ACK). Regenerating would turn them into unproven generator snapshots.

---

## 5. The generator↔golden divergence (READ THIS before touching goldens)

Full analysis: **`docs/requirements/response/Generator_Golden_Divergence_Note.md`**.

- `golden_regression_test.py` reports **0/35 PASS, all STRUCTURAL DIFF** (1 skipped: TC-A06). **This is expected, not a defect.**
- **Root cause = stale goldens, NOT a regression.** The generator was intentionally upgraded to the FDA FAERS 2.18 / Business Rules v1.7 drug representation:
  - drug organizer code `suspect/concomitant` (`…1.13`) → `code="4"` (`…1.20`)
  - drug role moved to `causalityAssessment code="20"`; drug-reaction matrix `code="39"` added
  - This new format **is FDA-accepted**: ACK **`ci260602192744`** (2026-06-02), and the golden `TC-XP01-new-organizer-format.xml` is in it.
- The other ~34 goldens (TC-A01 etc.) + the April v37 reference predate the upgrade and are still **old format** → hence the diffs. The corpus is internally inconsistent (only TC-XP01 was migrated).
- The April v37 reference is **superseded for the drug-organizer section** by `ci260602192744`. The reporter/wrapper/routing backbone (BB-01…BB-15) is unchanged and still proven by v37.

---

## 6. Outstanding work / next steps (priority order)

1. **ACK-backed golden migration** (clears T2 and turns regression green):
   - Re-submit the old-format scenarios in the new format; capture ACKs.
   - Update each migrated golden XML + its `sha256_xml` in `test/golden/manifest.json` (there is **no `--update` flag** in the harness — do it per file).
   - Register the TC-A06 JSON input → target **36 PASS / 0 SKIPPED**.
2. **Fix route/dose to FDA E2B(R3) structure**, then flip `EMIT_GK4_ROUTE_DOSE=true` and validate via submission (ACK):
   - routeCode: codeSystem `0.4.0.127.0.16.1.1.2.6` + `displayName` + `codeSystemVersion`.
   - doseQuantity: `<doseQuantity value="…" unit="…"/>` (drop `<center>`).
3. **D1**: reconcile `FDA.C.5.6.r` on IND vs regression rule R0026 (external clarification).
4. **D2 / IND track**: `AERS_PREMKT_CDER` is a placeholder pending **AEMSESUB enrollment** (account-side, not code). Helpdesk email drafted in `test/test_submission/helpdesk_email_draft.md`. Decode IND OAuth scope once enrolled.
5. **Finalize the generator WIP refactor** (it spans `xmlGeneratorService.ts`, `caseImportService.ts`, `case.types.ts`, etc.) — it is committed but in-progress.

---

## 7. How to run things (verified working this session)

```bash
# Backbone gate (the green one). 15/15 expected.
python3 test/test_submission/validate_backbone.py --all test/test_submission/regression/xml/
python3 test/test_submission/validate_backbone.py test/test_submission/package/CASE-20260331-EMJQ_fixed_v37_patch.xml

# Rebuild the headless generator bundle AFTER editing xmlGeneratorService.ts
# (regression/headless run the BUNDLE, not the .ts source):
npm --prefix faers-app run build:headless        # -> faers-app/out/main/headless.js

# Generate one case via the headless CLI:
ELECTRON_RUN_AS_NODE=1 IND_ENROLLMENT_CONFIRMED=true \
  npx --prefix faers-app electron faers-app/out/main/headless.js \
  --out-dir /tmp/out --no-gate --quiet <input>.json

# Full golden regression (generated vs curated goldens). Currently STRUCTURAL DIFF by design.
python3 test/test_submission/golden_regression_test.py
git checkout -- test/test_submission/regression/   # restore: an unfiltered run WIPES+regenerates regression/xml/
```

Gotchas: `timeout` is not on macOS; `golden_regression_test.py` invokes Electron per scenario (slow). Lint via `python3 test/test_submission/faers_xml_lint.py <xml>`.

---

## 8. Key files index

| File | What |
|---|---|
| `test/test_submission/CLAUDE.md` | Project memory; BB-01…BB-15 table with ACK proofs; track status; anti-patterns |
| `test/test_submission/CLAUDE_CODE_INSTRUCTIONS.md` | The implementation brief (T1–T6, D1–D2) |
| `test/test_submission/Workflow_App_Change_List.md` | Post-audit corrected consolidated change list |
| `docs/requirements/response/Workflow_App_Change_List_Audit_Response.md` | The audit that caught the inverted rules |
| `docs/requirements/response/Generator_Golden_Divergence_Note.md` | Full divergence root-cause analysis + migration plan |
| `test/test_submission/FAERS_USP_Golden_Checklist.md` | Human-readable companion to the backbone gate |
| `faers-app/src/main/services/xmlGeneratorService.ts` | The XML generator (MedDRA @88, route/dose flag @1390) |
| `test/test_submission/validate_backbone.py` | 15 backbone invariants (the CI gate) |
| `test/test_submission/golden_regression_test.py` | Golden regression (comment-node fix applied) |
| `test/test_submission/faers_xml_lint.py` | 55+ lint checks |
| `.github/workflows/backbone.yml` | Backbone CI (backbone-only by design) |
| `test/test_submission/package/CASE-20260331-EMJQ_fixed_v37_patch.xml` | April v37 reference (ACK ci260410211359; superseded for drug section) |
| `test/golden/postmarket/accepted/xml/TC-XP01-new-organizer-format.xml` | New-format reference (ACK ci260602192744) |
| `test/test_submission/acks/ACK3/Jun2/ci260602192744.*.ack` | The new-format acceptance ACK |
| `test/golden/manifest.json` | Golden manifest (scenario → xml/ack/json + sha256) |
| `test/test_submission/helpdesk_email_draft.md` | AEMSESUB IND enrollment request (ready to send) |

---

## 9. Track status snapshot

- **AERS / CDER postmarket**: ✅ resolved (27 successful submissions; v37 + new June format both proven). `submission_type=AERS`, `fda_center=CDER`.
- **IND / CDER_IND premarket**: ⛔ blocked on AEMSESUB enrollment (account-side). API returns ESGNG334 for every field combination. JWT carries no center claims. Don't try to "fix" in code.
- **Backbone gate**: ✅ 15/15 in CI on main.
- **Golden regression**: 🔴 STRUCTURAL DIFF (intentional, pending ACK-backed migration).
