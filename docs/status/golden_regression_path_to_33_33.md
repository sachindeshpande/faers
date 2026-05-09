# Status — Path to 33/33 on the Golden Regression Test

**Date:** 2026-05-08
**Status:** ✅ **REACHED** — regression run reports **33/33 PASS / 3 SKIPPED / 0 OPEN** at commit-pending. All four open items closed (Items 3+4 in commit `7e01aab`, Items 1+2 via the TC-A05/TC-G01 golden regenerations + JSON syncs in commits `9cf75f1` and the current commit). [`docs/gaps/GAP-GOLDEN-001`](../gaps/GAP-GOLDEN-001-tc-a05-tc-g01-curation-drift.md) closed.

---

**Snapshot at original write:** post-`5f58f4d` (items 3+4 committed; items 1+2 + TC-G01 residual drift open)
**Source prompts:**
- [`docs/prompts/fix_golden_data_items_1_2.md`](../prompts/fix_golden_data_items_1_2.md)
- [`docs/prompts/fix_golden_code_items_3_4.md`](../prompts/fix_golden_code_items_3_4.md)
**Issue tracker:** [`test/issues/2026-05-08_golden_regression_open_items.md`](../../test/issues/2026-05-08_golden_regression_open_items.md)
**Last regression run:** [`test/test_submission/regression/golden_regression_results.md`](../../test/test_submission/regression/golden_regression_results.md)

---

## Where the campaign stands

Latest regression run: **31 PASS / 2 OPEN / 3 SKIPPED**.

- Item 4 (IND-T05): clean PASS
- Item 3 (TC-G01): validator unblocked + JSON synced + C83121 emission added for non-serious — residual 1 diff (golden has internal per-reaction inconsistency that no generator-derivable input can reproduce; needs golden regen OR per-reaction JSON override schema)
- Item 2 (TC-F03): JSON narrative synced — PASS
- Item 1 (TC-A05): unchanged — needs golden regeneration (golden missing `<effectiveTime>` substanceAdministration child that every other passing golden has)

| Bucket | Count | Status |
|---|---|---|
| PASS | 29 | Stable; will remain PASS after all 4 items close (script verifies on every run) |
| Items 1–2 (data) | 2 | **Not started** — prompted in `fix_golden_data_items_1_2.md`, expected to take <30 minutes total |
| Items 3–4 (code) | 2 | **Not started** — prompted in `fix_golden_code_items_3_4.md`, expected to take ~40 LOC + tests |
| SKIPPED (no JSON) | 3 | TC-A06 / TC-F02 / TC-F04 — XML-surgery cases, intentionally outside the JSON-driven regression path |

---

## Per-item status

### Item 1 — TC-A05-ethnicity-hispanic (data: regenerate golden)

| Field | Value |
|---|---|
| Status | **Not started** |
| Type | Data refresh; no code change |
| Touches | `test/golden/postmarket/accepted/xml/TC-A05-ethnicity-hispanic.xml` (overwrite) + `test/golden/manifest.json` (`sha256_xml` field) |
| Estimated effort | ~5 minutes (one headless CLI run, one diff sanity-check, one SHA256 update) |
| Verification on disk | Current golden has 5 children per `substanceAdministration`; current generator emits 6 (extra `Indication` block). Confirmed in `golden_regression_results.md`. |
| Prompt steps to execute | `fix_golden_data_items_1_2.md` §1 steps 1–6 |
| Acceptance gate | Lint 60/60 + regression test PASS for TC-A05 |

### Item 2 — TC-F03-nonexpedited (data: sync JSON narrative)

| Field | Value |
|---|---|
| Status | **Not started** |
| Type | Data refresh; no code change |
| Touches | `test/golden/postmarket/accepted/json/TC-F03-nonexpedited.json` (one string replacement in `case.caseNarrative`) |
| Estimated effort | <2 minutes |
| Verification on disk | Confirmed: golden carries the patched v2 narrative (`"TC-F03 fix v2: localCriteriaForExpedited=false…"`); JSON carries the original (`"Expedited flag set to false (A.1.9 = 2)…"`). Single-text-field diff. |
| Prompt steps to execute | `fix_golden_data_items_1_2.md` §2 steps 1–4 |
| Acceptance gate | JSON parses + regression test PASS for TC-F03 |

### Item 3 — TC-G01-nonserous (code: validator non-serious flag)

| Field | Value |
|---|---|
| Status | **DONE — prompt scope** (validator relax + JSON flag); **OPEN — residual test-data drift** |
| Type | Code change — 5 small edits across 4 files + 2 new tests |
| Touches | `faers-app/src/main/services/validationService.ts` (relax B.2.i.7), `…/services/caseImportService.ts` (wire mapping), `…/shared/types/case.types.ts` (add `overallNonSerious`), `…/services/validationService.test.ts` (2 new tests), `test/golden/postmarket/accepted/json/TC-G01-nonserous.json` (set `overallNonSerious: true`) |
| Estimated effort | ~30 LOC + 2 tests |
| Pre-existing risk | Loosens validation behind an explicit opt-in; no existing test currently asserts the rule fires for non-serious cases. Spot-checked when this was last reviewed in [`test/issues/2026-05-08_golden_regression_open_items.md`](../../test/issues/2026-05-08_golden_regression_open_items.md). |
| Prompt steps to execute | `fix_golden_code_items_3_4.md` §Item 3 steps 1–6 |
| Acceptance gate | Headless CLI exit 0 for TC-G01 + lint 60/60 + 2 new validator tests pass + regression test PASS for TC-G01 + full vitest suite no new failures |

### Item 4 — IND-T05-fatal-seven-day (code: codify FIX-X05)

| Field | Value |
|---|---|
| Status | ✅ **DONE** — IND-T05 PASS, IND-T01..T07 all still PASS, regression test green |
| Type | Code change — single-branch edit in the generator + one test |
| Touches | `faers-app/src/main/services/xmlGeneratorService.ts` (~10 LOC near `reportTypeCode` derivation) + a generator test |
| Estimated effort | ~10 LOC + 1 test |
| Pre-existing risk | Forces 15-Day on IND/PREMKT regardless of `localReportTypeCode`. The other 6 IND scenarios all set `localReportTypeCode: 1`, so the new branch is unreached for them — they're expected to remain PASS. |
| Prompt steps to execute | `fix_golden_code_items_3_4.md` §Item 4 steps 1–4 |
| Acceptance gate | Regression test PASS for IND-T05 + IND-T01..T07 all still PASS + new generator test passes |

---

## Sequencing & prerequisites

The two prompts are independent of each other but the data-prompt explicitly states the code-prompt depends on it:

```
fix_golden_data_items_1_2.md  →  31/33 PASS
fix_golden_code_items_3_4.md  →  33/33 PASS  (depends on above)
```

The dependency is loose — the code prompt's pre-requisite line says "31/33 baseline" but the items don't actually share files. Either order works; both-in-one-commit is also fine.

**Recommended order (lowest churn):**

1. Item 2 (TC-F03 narrative) — pure JSON edit, smallest diff
2. Item 1 (TC-A05 regen) — single XML overwrite + manifest SHA update
3. Item 4 (IND-T05 FIX-X05) — single function edit, no schema changes
4. Item 3 (TC-G01 validator) — touches 4 files; merge last so other items don't bring rebase noise

---

## Tooling gap — RESOLVED

~~Both prompts call `python test/test_submission/golden_regression_test.py --scenario <name>` to verify a single item without re-running the full 36-scenario suite. **The script does not currently support `--scenario`.** It iterates the entire manifest unconditionally.~~

**The `--scenario` flag was added** to `test/test_submission/golden_regression_test.py` using `argparse` (option A). The flag is repeatable so multiple scenarios can be verified in a single run:

```bash
# single scenario
python test/test_submission/golden_regression_test.py --scenario TC-G01-nonserous

# multiple scenarios (e.g. verify all IND neighbours are unaffected)
python test/test_submission/golden_regression_test.py \
  --scenario IND-T01-susar-baseline \
  --scenario IND-T02-susar-repeat \
  --scenario IND-T03-cross-ref-ind \
  --scenario IND-T04-no-study-registration \
  --scenario IND-T06-babe-test-reference \
  --scenario IND-T07-followup-report
```

The full suite (all scenarios) still runs when `--scenario` is omitted.

---

## Acceptance for closing this status

After all 4 items + the optional `--scenario` flag:

| Check | Expected |
|---|---|
| `python3 test/test_submission/golden_regression_test.py` | Exit 0; 33/33 PASS / 3 SKIPPED / 0 OPEN |
| `npm test -- --run` (in `faers-app/`) | No new failures vs the 27 pre-existing (`workflowService`, `integration`, `authStore`) |
| `test/golden/manifest.json` | TC-A05 SHA256 updated |
| `test/issues/2026-05-08_golden_regression_open_items.md` | Mark all 4 items as ✅ resolved (or supersede with a new ✅ status doc here) |

Once 33/33 lands, [§3.2 of the findings report](../../test/issues/2026-05-08_findings_and_next_steps.md) becomes the next-step gate: wire the regression script into CI as a pre-merge check.

---

## Risk register

Two risks worth flagging while the prompts are open:

1. **TC-G01 validator change is the only one with regression surface.** The other three items only touch the failing scenario or its data. Item 3 changes shared validator code that runs for every case import. The recommended order (Item 3 last) lets the other PASS counts stabilize first.
2. **No FDA round-trip is needed for any of these items.** All four scenarios already have FDA-accepted golden ACKs. Closing them is purely a generator-vs-golden alignment exercise; it does not require submitting anything new.

The OPEN-01 v5 ACK round-trip (the 7 IND files submitted on 2026-05-07 with C.5.6.r OID stripped/swapped) is a separate, parallel item — also not blocked by these four. Status of that round-trip will land in a separate doc once the ACKs return.
