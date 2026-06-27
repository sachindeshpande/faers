# Claude Code — Implementation Brief

**Owner of this brief:** Sachin (DeepQuence)
**Status of upstream work:** Helpdesk email sent to AEMSESUB (awaiting reply). All design and analysis docs in this directory are post-audit and internally consistent. Six concrete implementation tasks remain. They are mostly independent; pick any order.

This brief is self-contained. You do not need to re-read the v1→v37 fix history to do these tasks. The conventions you need are summarized below and exhaustively enforced by `validate_backbone.py`.

---

## Step 0 — Read these files first (in this order)

1. **`CLAUDE.md`** — project memory. The "live-code-wins" rule and the 15 proven v37 conventions are at the top.
2. **`Workflow_App_Change_List_Audit_Response.md`** — your own prior audit. Important context: an earlier draft of the change list inverted the v37 conventions; your audit caught it. Do not re-introduce the inverted rules.
3. **`Workflow_App_Change_List.md`** — the post-audit corrected change list. Notice the "⚠ CORRECTED AFTER AUDIT" header at the top and the sections marked "**CORRECTED**". §7 has the final action list.
4. **`validate_backbone.py`** — the structural gate. Skim it once to understand what the 15 backbone invariants check.
5. **`package/CASE-20260331-EMJQ_fixed_v37_patch.xml`** — the proven-accepted reference XML (ACK `ci260410211359`, CA+AA). This is the ground truth for "what the generator should emit."

You do **not** need to re-read `Comprehensive_XML_Fix_History_UPDATED.md` end-to-end. Its narrative structure (failed hypotheses described before the winning fix) is what poisoned the earlier change list. If you do consult it, treat it as historical context only and tiebreak with the live code.

---

## DO NOT apply these rules (failed hypotheses)

These rules appeared in an earlier draft of the change list. They are the **opposite** of what the proven v37 code does. Applying them would re-introduce the v36 SAX exception and break the working AERS path.

| Wrong rule (from failed hypothesis) | Correct rule (v37 proven) |
|---|---|
| Reporter `author` as direct child of `investigationEvent` | Reporter `author` inside `subjectOf1/controlActEvent` |
| Reporter OID = `.1.1.6` | Reporter OID = `.1.1.7` |
| Second sender `author` block as direct child of `investigationEvent` | No second sender author block; sender identity is in the wrapper `<sender>` |
| `primaryRole classCode="PRS"` at `investigationEvent` | Never use `primaryRole` at that level |
| Flat `representedOrganization` | **Nested** `representedOrganization` (the v37 differentiator) |

If you find a task description anywhere that contradicts the right-hand column, stop and re-read `CLAUDE.md`.

---

## Tasks

Each task lists: scope, files to touch, acceptance criteria, and the exact validation command(s) to run before claiming done. Tasks are independent unless noted.

### T1 — `.env.example` cleanup

**Scope.** Bring `.env.example` into line with the live `.env`. Add explanatory comments documenting the wrong-value traps that previously caused multi-day debugging cycles.

**Files to touch.** `.env.example` only.

**Required changes.**

1. Update `ESG_SUBMISSION_TYPE_IND` to the live value (`AERS_PREMKT_CDER`). Note: this is a placeholder pending AEMSESUB enrollment response; do not assume the spec-style `IND` is correct.
2. Add inline comments for:
   - `ESG_USER_ID=33703` — the leading three digits are the EIN format artifact, not a typo. Original poisoned value was 27478.
   - `ESG_COMPANY_ID=31537` — DeepQuence. Original poisoned value was 2 (CDER's own center record). The submit script will refuse to run with `company_id=2`.
   - `ESG_AUTHORIZING_COMPANY_ID=` (blank) — only set when DeepQuence is acting as an agency.
   - `ESG_SUBMISSION_TYPE_IND` — current value is a placeholder; canonical value depends on AEMSESUB enrollment response.

**Acceptance criteria.**
- `.env.example` parses cleanly when copied to `.env` (no syntax errors).
- All comments above are present.
- No live secrets are committed (this is a template).

**Validate.**
```bash
diff <(grep -v "^#" .env | sort) <(grep -v "^#" .env.example | sort)
```
The set of keys should match (values will differ — that's expected for a template).

---

### T2 — TC-A06 golden manifest entry

**Scope.** The golden regression test currently skips `TC-A06-ethnicity-ni` because there is no JSON input registered in the manifest (`test/golden/manifest.json` in the workflow-app repo, per the regression script's path layout). Add the entry and regenerate the golden XML.

**Files to touch.**
- `test/golden/manifest.json` (or wherever the workflow-app repo holds it)
- `test/golden/<category>/json/TC-A06-ethnicity-ni.json` (new)
- `test/golden/<category>/xml/TC-A06-ethnicity-ni.xml` (new — generated)

**Reference.** The other TC-A0x JSON inputs (race-white, race-black, race-amerindian, race-hawaiian, ethnicity-hispanic) are good templates. Use `ethnicity = "ni"` (Not Hispanic or Latino) and otherwise mirror the structure of an existing race or ethnicity test case.

**Acceptance criteria.**
- `python3 golden_regression_test.py` reports **36 PASS / 0 SKIPPED**.
- The new golden XML passes `validate_backbone.py` with 15/15.

**Validate.**
```bash
python3 golden_regression_test.py
python3 validate_backbone.py test/golden/<category>/xml/TC-A06-ethnicity-ni.xml
# Both must succeed with 0 failures.
```

---

### T3 — Create `FAERS_USP_Golden_Checklist.md`

**Scope.** This document is referenced throughout the project but does not exist in the repo. Create it. **Use the corrected rules from §4.4 of `Workflow_App_Change_List.md`.** Do not use the rules from the pre-audit draft.

**File to create.**
- `FAERS_USP_Golden_Checklist.md` at the repo root (or wherever the project's docs convention places checklists; check existing locations first).

**Required content sections.**

1. **Purpose** — one short paragraph: this document is the human-readable companion to `validate_backbone.py`. When the validator fails, this checklist explains why each rule exists.
2. **The 15 invariants** — one row per BB-01 through BB-15. For each: rule, the historical ACK that proved it (see `CLAUDE.md` proof column), the anti-pattern, and a one-line "why this matters."
3. **Wrapper and routing rules** — wrapper child order, name displayName, batch UUID uniqueness, IND vs postmarket routing fields.
4. **Coded clinical values** — MedDRA OID, codeSystemVersion handling, indication CE rules.
5. **Cross-references** — pointers to `validate_backbone.py`, `faers_xml_lint.py`, `golden_regression_test.py`, and the v37 reference XML.
6. **Out-of-scope / informational only** — list `asLocatedEntity` (neutral), MedDRA version drift (tracked via env var), and `FDA.C.5.6.r` on IND (deferred pending R0026 reconciliation).

**Acceptance criteria.**
- Document is internally consistent with `validate_backbone.py` and `CLAUDE.md`.
- Each invariant has a clear "why" tied to a historical ACK.
- Does **not** include any rule from the failed-hypothesis list above.

**Validate.**
- Manual review against the "DO NOT apply" table at the top of this brief.
- Compare each rule against the corresponding BB-* check in `validate_backbone.py`.

---

### T4 — Wire `validate_backbone.py` into CI

**Scope.** Adopt the YAML in `ci_backbone_check.yml` as a real GitHub Actions workflow (or your CI provider's equivalent) in the workflow-app repo.

**Files to touch.**
- `.github/workflows/backbone.yml` (or merge into an existing workflow file)
- Optionally a pre-commit hook config (`.pre-commit-config.yaml`) — pre-commit-hook for the same script catches regressions on the developer's machine before CI even runs.

**Required behaviour.**
- Runs on every PR that touches `src/xml/**`, `xmlGeneratorService.ts`, `test/golden/**`, or the validator itself.
- Runs on push to `main`.
- Pins `FAERS_MEDDRA_VERSION` to whatever the live generator emits (see T5 — confirm this value before wiring).
- Fails the build on any backbone invariant failure across the regression corpus.
- Uploads the JSON report as an artifact for downstream tooling.
- Includes the optional v37-canonical-reference check (skip if the v37 file is not stored in the repo).

**Acceptance criteria.**
- The workflow runs on a fresh PR and passes.
- Intentionally breaking one v37 convention (e.g., changing OID `.1.7` → `.1.6` in the generator on a throwaway branch) causes the workflow to fail with a clear BB-03 error message.
- The artifact is reachable from the PR Actions tab.

**Validate.**
```bash
# Local dry run before opening the PR
python3 validate_backbone.py --all test/test_submission/regression/xml/
echo "exit code: $?"   # should be 0
```

---

### T5 — MedDRA version reconciliation

**Scope.** The audit response claimed live code uses MedDRA `27.1`. Every XML in `regression/xml/` and the v37 reference XML use `25.0`. Find which is true and align everything.

**Required investigation.**
```bash
# In the workflow-app repo
grep -rn "codeSystemVersion" src/ | grep -i meddra
grep -rn '"27\.1"\|"25\.0"' src/
```

**Three possible outcomes and the right response:**

1. **Live code emits `27.1`, goldens are stale.** Regenerate goldens with the current generator; update `regression/golden_regression_results.md`; keep `FAERS_MEDDRA_VERSION=27.1` in the CI YAML and `validate_backbone.py`'s default.
2. **Live code emits `25.0`, audit was wrong about `27.1`.** Update `validate_backbone.py`'s default to `25.0` and the CI YAML's `FAERS_MEDDRA_VERSION` to `25.0`. Leave goldens alone.
3. **Mixed — code emits 25.0 for some files and 27.1 for others.** This is a real bug. Fix the generator to pick one consistently; regenerate goldens; document the choice in `FAERS_USP_Golden_Checklist.md`.

**Acceptance criteria.**
- A single MedDRA version is in use across live code, goldens, and CI.
- The version is documented in `FAERS_USP_Golden_Checklist.md`.
- `validate_backbone.py --all regression/xml/` passes 15/15 for all files.

---

### T6 — Relocate the v36 superseded XML

**Scope.** `package/CASE-20260331-EMJQ_fixed_v36_patch.xml` is the failed JC5H-pattern attempt (caused the v36 SAX exception). It sits next to the proven v37 reference in `package/`. If anyone runs `submit_batch.py` against `package/` with broad globbing, the v36 file could be picked up.

**Required action.**
- Move it to `package/superseded/CASE-20260331-EMJQ_fixed_v36_patch.xml` (create the subdirectory if needed).
- Add a `README.md` at `package/superseded/README.md` explaining why files there are not submission candidates and naming the v37 winner.

**Acceptance criteria.**
- The v36 file is no longer matched by any glob in `submit_batch.py` (verify by running `discover_pending` in a dry-run).
- `package/superseded/README.md` exists and is clear.

**Validate.**
```bash
python3 submit_batch.py --dry-run | grep -i v36
# Should produce no output.
```

---

## Tasks NOT to do (DEFERRED — do not touch)

These were in earlier drafts but should NOT be implemented until external clarification arrives. Track them in your task system but do not write code.

### D1 — `FDA.C.5.6.r` suppression on IND code path

The IND ACK warns that `FDA.C.5.6.r` is invalid for the IND center. Suppressing it in the generator would seem like the fix — but **regression rule R0026 currently expects it present for IND when C.5.5a is populated.** Changing the generator breaks the regression suite.

**Wait for:** Either an ESGNGSupport reply or an FDA Implementation Guide §5 reading that disambiguates. Then update R0026 first, then the generator, then the goldens. Do nothing until reconciled.

### D2 — Update `ESG_SUBMISSION_TYPE_IND` to a different value

The current value (`AERS_PREMKT_CDER`) is a placeholder. The matched pair `CDER_IND + IND` was tested and returned ESGNG334. The portal channel label `CDER_IND + AERS_PREMKT` also returned ESGNG334. The canonical value is unknown.

**Wait for:** AEMSESUB's enrollment response. The response should either confirm the value or trigger a successful test submission whose request body identifies it.

---

## Verification pipeline (run after any change)

Run these in order. Any failure means: stop and re-investigate before submitting any XML or merging any PR.

```bash
# 1. Backbone invariants — the structural gate
python3 validate_backbone.py --all regression/xml/

# 2. Lint — business rules
for f in regression/xml/*.xml; do python3 faers_xml_lint.py "$f" || break; done

# 3. Golden regression
python3 golden_regression_test.py

# 4. Optional but recommended — XSD schema
for f in regression/xml/*.xml; do xmllint --noout --schema MCCI_IN200100UV01.xsd "$f" || break; done
```

All four should pass cleanly. The regression report should show **36 PASS / 0 SKIPPED** once T2 lands.

---

## Escalation

If during any task you find evidence that contradicts this brief (e.g., the live code actually uses a different OID, or the regression suite asserts something the brief claims is wrong), **stop and surface the contradiction in a comment** rather than implementing it. The earlier change list looked plausible and was wrong; the safest discipline is to flag and ask.

The single most reliable tiebreaker is `validate_backbone.py` run against `package/CASE-20260331-EMJQ_fixed_v37_patch.xml`. If that file passes 14/15 (BB-11 MedDRA is the only acceptable failure pending T5), the conventions in this brief are correct.

---

## Summary

| Task | Risk | Order | Blocked by |
|---|---|---|---|
| T1 — `.env.example` cleanup | Low | Any time | — |
| T2 — TC-A06 golden | Low | Any time | — |
| T3 — Golden checklist doc | Low | Any time | — |
| T4 — CI wiring | Low | After T5 | T5 (need correct MedDRA pin) |
| T5 — MedDRA reconciliation | Low | Soon | — |
| T6 — Relocate v36 XML | Low | Any time | — |
| D1 — IND `FDA.C.5.6.r` | — | DEFERRED | External clarification |
| D2 — `ESG_SUBMISSION_TYPE_IND` canonical value | — | DEFERRED | AEMSESUB response |

Pick any of T1, T2, T3, T5, T6 to start. T4 should wait until T5 closes so the MedDRA pin is correct.

When all six T tasks are done and all four pipeline checks pass cleanly, the AERS code path is fully covered and the IND path is one helpdesk reply away from end-to-end working.
