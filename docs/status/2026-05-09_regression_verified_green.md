# Status — Regression Verified Green

**Date:** 2026-05-09
**HEAD commit:** `189da36` ("Persist generated XMLs to test/test_submission/regression/xml/")
**State:** ✅ **33/33 PASS**, verified two independent ways. CI gate live and green on the latest 4 runs.

---

## 1. Verification (two paths, both green)

| Path | Tooling | Verdict | Source |
|---|---|---|---|
| **JSON-driven regression** | `python3 test/test_submission/golden_regression_test.py` (HEAD `189da36`) | **33 PASS / 0 GATE FAILURE / 0 LINT FAILURE / 0 STRUCTURAL DIFF / 3 SKIPPED** | [`test/test_submission/regression/golden_regression_results.md`](../../test/test_submission/regression/golden_regression_results.md) |
| **Direct file comparison** | `docs/prompts/verify_regression_xml_vs_golden.md` (canonicalisation + `c14n` after normalization) | **33 MATCH / 0 DIFF / 0 MISSING** | Run output (this session, 2026-05-09 04:25 UTC) |

The JSON-driven path proves the **generator + JSON** combination still produces the curated golden output. The direct path proves the **committed regression XMLs on disk** still match the curated golden. They agree, and they re-verify after every commit via CI.

---

## 2. CI gate status

`.github/workflows/regression.yml` runs on every `pull_request` and every `push` to `main`. Last 4 runs (most recent first):

| Run | Trigger | Duration | Outcome |
|---|---|---|---|
| `25591523543` | push `189da36` | 51 s | ✅ success — 33/33 PASS |
| `25591334338` | push `3fac393` | 59 s | ✅ success — 33/33 PASS |
| `25591095361` | push `907d489` | 56 s | ✅ success — 33/33 PASS |
| `25591058557` | push `8ec7397` | 38 s | ✅ (workflow added; only 1 scenario tracked at the time — exposed the un-tracked golden tree) |

Cold-start average: ~50 s. Pipeline (Node 20 → Python 3.11 + lxml → `npm ci` → `build:headless` → regression script). Artifact `golden-regression-results` (full `test/test_submission/regression/` directory) uploaded with 30-day retention, regardless of pass/fail.

Soft warning: GitHub deprecates Node 20 in actions on 2026-09-16. The workflow will need an actions-major bump before then; not blocking today.

---

## 3. Curated reference set (`test/golden/`)

Snapshot of the authoritative XML+ACK pairs:

| Path | Files | Notes |
|---|---|---|
| `postmarket/accepted/xml/` | 52 | 26 XMLs + 26 ACKs |
| `postmarket/accepted/json/` | 24 | One JSON per scenario (TC-F02 + TC-F04 omitted — XML-surgery only) |
| `postmarket/rejected/xml/` | 6 | 3 XMLs + 3 ACKs (TC-A03/A04/A06) |
| `postmarket/rejected/json/` | 2 | TC-A03 + TC-A04 (TC-A06 omitted — XML-surgery) |
| `ind/accepted/xml/` | 14 | 7 XMLs + 7 ACKs (IND-T01..T07) |
| `ind/accepted/json/` | 7 | One per IND scenario |
| `manifest.json` | 1 | Drives `golden_regression_test.py`; SHAs verify XML integrity |

36 total scenarios. 33 are JSON-driven and run through the regression test on every commit; 3 are XML-surgery cases (TC-A06, TC-F02, TC-F04) intentionally skipped.

---

## 4. Regression artifacts (`test/test_submission/regression/`)

Persisted on every full run; auto-cleaned to prevent staleness:

| Path | Files | Behaviour |
|---|---|---|
| `golden_regression_results.md` | 1 | Pass/fail report. Stale `*.md` siblings removed on every run. |
| `xml/<scenario>.xml` | 33 | One generated XML per JSON-driven scenario. Wiped at the start of every unfiltered run; preserved per-scenario on `--scenario X` runs. |

Each XML is committed (~904 KB total). The volatile UUID/timestamp churn per run is the same pattern already established by `test/test_submission/from_app/`. Reviewers can inspect the post-fix XML directly without re-running the generator.

---

## 5. Closed items (this session)

| Stream | Closed |
|---|---|
| `fix_golden_data_items_1_2.md` | Item 2 (TC-F03 narrative sync, commit `9cf75f1`); Item 1 (TC-A05 golden regen, commit `4419b33`) |
| `fix_golden_code_items_3_4.md` | Item 3 (`overallNonSerious` validator + JSON sync + C83121 emission, commits `7e01aab` / `9cf75f1`); Item 4 (FIX-X05 codified in generator, commit `7e01aab`) |
| `GAP-GOLDEN-001` | Closed `4419b33` — TC-A05 + TC-G01 goldens regenerated, manifest SHAs updated |
| Regression script tooling | `--scenario` filter (commit pre-`5f58f4d`); auto-clean stale `*.md` (commit `3fac393`); persist XMLs to `regression/xml/` + auto-clean stale (commit `189da36`) |
| CI integration | `.github/workflows/regression.yml` (commits `8ec7397` + `907d489` for the un-tracked golden tree fix) |
| Direct-comparison verification | `docs/prompts/verify_regression_xml_vs_golden.md` ran clean on `189da36` |

---

## 6. Open items (out of this milestone)

These remain intentionally deferred; nothing blocks the green state above.

| Item | Source | Priority |
|---|---|---|
| **OPEN-01 — IND v5 ACK round-trip** | The 7 IND files committed in `00d4234` were submitted on 2026-05-07 with `FDA.C.5.6.r` OID stripped (T01/T02/T04–T07) or swapped to `…2.1.2.1` (T03). When ACKs land, drop them in `test/golden/ind/accepted/xml/` and use `--record-ack` to update the submission log. If 7 × CA+AE without the C.5.6.r warning → promote `IND_POLICY.crossReportedInd` to `proven_safe` on the new emission state. | External / pending FDA |
| **GAP-APP-005 — `TestCaseGeneratorService`** | Automate what `test/golden/` curates by hand. Larger scope (new service + IPC + UI). | Deferred |
| **GAP-APP-006 — `ackParser.suggestPolicyUpdate`** | Recommends `IND_POLICY` / `FAERS_POLICY` updates from incoming ACKs. Pairs with the Import-ACK UI. | Deferred |
| **GAP-APP-004 follow-up — IND Pass 1 noise** | Production IND/babe submissions hit Pass-1 element-diff noise vs the IND-T01 golden when the case structurally diverges (T03 multi cross-ref, T04 no NCT, T05 fatal extras, T06 BA/BE pair, T07 follow-up). The regression script already bypasses with `--no-gate`; production needs P1 downgrade-to-warning or invariant-only diff scope. | Medium |
| **Pre-existing test-suite failures** | 27 failures in `workflowService` / `xmlGeneratorService.integration` / `authStore` predate this work; CI doesn't run them. | Low — no merge impact |

---

## 7. Risk register

| Risk | Mitigation |
|---|---|
| Generator change drifts from current golden output | CI gate fails on every commit that breaks it. The 30-day `golden-regression-results` artifact preserves the diff for triage. |
| Reorganisation of `test/golden/` paths breaks the script | Two scripts depend on the layout: `golden_regression_test.py` and the snippet in `docs/prompts/verify_regression_xml_vs_golden.md`. Keep the layout stable, or update both in the same change. |
| Stale generated XMLs in `regression/xml/` | Auto-cleaned at the start of every unfiltered run. Per-scenario filtered runs intentionally preserve siblings. |
| GitHub Actions Node-20 deprecation (2026-06 → 2026-09) | Bump action majors before the deadline. Currently informational. |
| Goldens have internal artefacts (e.g., per-reaction Seriousness variance previously seen on TC-G01) | Already mitigated by closing GAP-GOLDEN-001 — current goldens are JSON-derivable and reproducible byte-equivalent on every regression run. |

---

## 8. What changed about how we work

A short list of permanent capabilities this session added — useful for any future contributor reading this status doc cold:

- **`test/golden/` is the canonical reference set** — 36 manually-curated XML+ACK pairs, machine-driven by `manifest.json`. Cited from `IND_POLICY` / `FAERS_POLICY` evidence, the IND golden resolver, and `ackParserService.test.ts`.
- **`test/test_submission/regression/`** holds the latest-run report and one generated XML per scenario, both auto-cleaned to prevent stale results.
- **`golden_regression_test.py`** supports `--scenario X [--scenario Y …]` for fast targeted reruns; the full unfiltered run wipes the XML output dir; both modes write a fresh report.
- **`.github/workflows/regression.yml`** gates every PR + main push and uploads the entire `regression/` directory as an artifact.
- **`docs/prompts/verify_regression_xml_vs_golden.md`** provides a no-Electron sanity check: direct file comparison after normalization, used after any golden regen or as a CI-independent spot check.
- **Promotion convention** is documented in `SUBMISSION_CAMPAIGN_REPORT.md §1.5`: never regen a golden speculatively; only promote after a confirmed CA+AE/CA+AA round-trip with FDA.

---

**Bottom line:** the campaign reached a green steady state. Future generator changes are gated by CI; future golden updates are guarded by the promotion convention; and a fresh contributor can read this doc + the linked artifacts without ambiguity about the system's current state.
