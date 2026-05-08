# Golden Regression Test — Open Items

**Run date:** 2026-05-08
**Generator version:** `2f4e947`
**Source run:** [`test/test_submission/golden_regression_results.md`](../test_submission/golden_regression_results.md)
**Driver:** [`test/test_submission/golden_regression_test.py`](../test_submission/golden_regression_test.py)
**Prompt:** [`docs/prompts/golden_regression_test.md`](../../docs/prompts/golden_regression_test.md)

The regression run produced **29 PASS / 3 SKIPPED / 4 OPEN** out of 36 scenarios. The 4 OPEN items below need disposition before the run becomes 33/33. Per the prompt's rule, none of them are generator regressions — they are golden-vs-JSON drift (3) plus one open scenario already known to the v2 gap analysis.

---

## Open Item 1 — TC-A05-ethnicity-hispanic

**Verdict:** STRUCTURAL DIFF (33 diffs, all in `substanceAdministration` blocks)
**Classification:** Test data mismatch — golden authored before generator started emitting `Indication`
**Severity:** LOW — golden was already CA+AA on FDA. Re-curating fixes it; no generator change needed.

### Evidence

Per-`substanceAdministration` child count:
- Golden: 5 children
- Generated: 6 children — extra `Indication` (C41331) observation under each suspect drug

Resulting positional shift: every subsequent `outboundRelationship2` block is one slot off, so the diff tool reports the entire chain (Action Taken → Dechallenge → Rechallenge) as moved. The block contents themselves are byte-identical.

### Disposition options

| # | Action | Cost | Risk |
|---|--------|------|------|
| A | Regenerate `test/golden/postmarket/accepted/xml/TC-A05-ethnicity-hispanic.xml` from `…/json/TC-A05-ethnicity-hispanic.json` and replace the curated copy. The shape will then match the current generator. | 1 line of headless CLI + manual review of the diff vs the FDA-accepted ACK | Low — the JSON is the source the generator now emits from; the new golden will have one extra block but otherwise be a superset of the FDA-accepted shape |
| B | Strip `indication` from the JSON so the generator skips the Indication observation | Update JSON | Reduces test coverage of the Indication emission path |

**Recommended:** A. Regenerate the golden. The curated tree should reflect what the generator actually emits today.

---

## Open Item 2 — TC-F03-nonexpedited

**Verdict:** STRUCTURAL DIFF (1 diff)
**Classification:** Test data mismatch — case narrative text differs
**Severity:** LOW — text-only mismatch in a free-text narrative field; no XML structure or coded value affected.

### Evidence

```
golden=    "Variant of 2L8T baseline. TC-F03 fix v2: localCriteriaForExpedited=false,
            localCriteriaReportType=code 2 (Non-Expedited AE). SR-CASE-20260501-TCF03."
generated= "Variant of 2L8T baseline. Expedited flag set to false (A.1.9 = 2,
            non-expedited) for TC-F03. localReportTypeCode omitted."
```

The patched golden carries the v2-fix narrative authored after submission; the JSON has the original narrative.

### Disposition options

| # | Action | Cost | Risk |
|---|--------|------|------|
| A | Update `test/golden/postmarket/accepted/json/TC-F03-nonexpedited.json` `case.caseNarrative` to match the patched golden | 1-line JSON edit | None |
| B | Regenerate the golden XML from the JSON — the JSON's narrative becomes the new golden text | Same as Item 1 option A | Same |

**Recommended:** A — JSON-side edit, single field. The golden remains the FDA-accepted artifact.

---

## Open Item 3 — TC-G01-nonserous

**Verdict:** GATE FAILURE — exit 1 from headless CLI before XML write
**Classification:** Open scenario (already documented in [`FAERS_Workflow_XML_Gap_Analysis_v2.docx`](../test_submission/FAERS_Workflow_XML_Gap_Analysis_v2.docx) §6 P01)
**Severity:** MEDIUM — blocks any non-serious case from regenerating from JSON; the curated golden was authored when the validator was looser.

### Evidence

Headless CLI fails at the `[validate]` (markReady) stage:

```
reactions[0].seriousness: Reaction 1: At least one seriousness criterion is required (B.2.i.7);
reactions[1].seriousness: Reaction 2: At least one seriousness criterion is required (B.2.i.7)
```

`validateReporterInformation` in `faers-app/src/main/services/validationService.ts` enforces a "at least one true seriousness criterion" rule that blocks all-false postmarket cases. The TC-G01 scenario specifically exists to test the all-false / non-serious path (A.1.2 = 2). `--no-gate` doesn't help because validation runs before the gate stages.

### Disposition options

| # | Action | Cost | Risk |
|---|--------|------|------|
| A | Relax the validator rule when caseType is postmarket and an explicit overall non-serious flag is set on the case. Probably needs a `case.overallNonSerious: boolean` field added to the JSON + Case type. | ~30 lines + 2 tests | LOW — the validator becomes scenario-aware. Regression risk on existing tests is small (none currently rely on the rule firing for non-serious cases). |
| B | Add a "test case" override flag to the headless CLI (e.g. `--allow-nonserious`) that bypasses B.2.i.7 for golden replay. | ~15 lines | LOW — additive; doesn't change default behaviour. Dev/test affordance only. |
| C | Edit `test/golden/postmarket/accepted/json/TC-G01-nonserous.json` to flip ONE seriousness criterion to `true` so the CLI accepts it. Loses the test's intent. | 1-line JSON edit | HIGH on test coverage — TC-G01 stops testing what it's named for. |

**Recommended:** A. The v2 gap doc already lists this scenario as the open design item; option A formalizes the resolution. Option B is a clean fallback if the validator change feels heavy. Avoid C — it discards the test coverage.

---

## Open Item 4 — IND-T05-fatal-seven-day

**Verdict:** STRUCTURAL DIFF (2 diffs — same field, code + displayName)
**Classification:** Test data mismatch — golden patched per FIX-X05 to comply with CDER 2.18 PREMKT rule
**Severity:** LOW–MEDIUM — content mismatch on FDA.C.1.7.1 codelist; the golden's value is FDA-compliant, the generator's value follows the JSON literally.

### Evidence

```
golden=    code="1" displayName="15-Day"
generated= code="6" displayName="7-Day"
```

The JSON carries `localReportTypeCode: 7`; the generator maps that to `code="6"` (per FIX-IND-004, "7-Day" in the FDA premarket codelist is `6`). The golden was patched per `FAERS_Workflow_XML_Gap_Analysis_v2.docx` FIX-X05: "FDA.C.1.7.1 must be code='1' (15-Day) when C.1.7=true and the report is sent via the PREMKT channel." That rule was applied as a one-off patch on the golden, not coded into the generator.

### Disposition options

| # | Action | Cost | Risk |
|---|--------|------|------|
| A | Wire FIX-X05 into the generator: when caseType is `ind`/`babe` AND the report is PREMKT-routed, force `localCriteriaReportType` to `1` (15-Day) regardless of the JSON's `localReportTypeCode`. | ~10 lines in `xmlGeneratorService.ts` + a unit test | MEDIUM — changes generator behaviour for IND PREMKT. Re-runs of all 7 IND scenarios would need verification; acceptable since they currently match. |
| B | Update the JSON to set `localReportTypeCode: 1` so the JSON path produces the patched golden directly. Loses the original "fatal 7-day SUSAR" semantic at the JSON level (the comment can preserve intent). | 1-line JSON edit | LOW; but the test name is `fatal-seven-day` and the JSON now wouldn't reflect that. |
| C | Regenerate the golden from the JSON (golden becomes `code="6"`). Requires a fresh FDA round-trip to confirm FDA still accepts code 6 on PREMKT — the FIX-X05 patch came from a CR+AR. | One submission cycle | HIGH — could re-trigger the original CR+AR. |

**Recommended:** A — codify FIX-X05 in the generator. The current golden is the post-patch state that FDA accepted; the generator should emit that state from the JSON without manual XML surgery.

---

## Summary

| Item | Recommended action | Code change? |
|---|---|---|
| 1 — TC-A05 | Regenerate golden from JSON | No |
| 2 — TC-F03 | Update JSON narrative to match golden | No |
| 3 — TC-G01 | Add `overallNonSerious` flag + relax validator | Yes (~30 LOC + tests) |
| 4 — IND-T05 | Codify FIX-X05 in generator (force 15-Day for IND PREMKT) | Yes (~10 LOC + test) |

After dispositions land, expected status: **33/33 PASS**.

## Next-step ownership

These four items need a human decision pass; they are not blockers for the campaign (every JSON-backed scenario already has an FDA ACK in the curated golden). When the disposition is decided, the work is small in all four cases.
