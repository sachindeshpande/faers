# Claude Code Prompt — Golden Dataset Regression Test

**Purpose:** Run every JSON input file from the golden dataset through the DeepQuence headless CLI and verify that the generated XML is structurally and clinically equivalent to the corresponding golden XML package.

---

## Context

You are working in the `faers-app/` directory of the DeepQuence FAERS E2B(R3) ICSR generator. The project has a golden test dataset at `test/golden/` containing 36 accepted/rejected FDA submissions. 33 of these scenarios have a corresponding JSON input file (the headless CLI input that produces the XML). The goal of this task is to run those 33 JSON files through the headless CLI and confirm the generator still produces output that matches the golden XML.

**Key files and directories:**

| Path | Description |
|---|---|
| `test/golden/manifest.json` | Machine-readable index: 36 entries with `scenario`, `category`, `ack_result`, `golden_xml`, `golden_ack`, `golden_json` (null for 3 missing) |
| `test/golden/*/xml/*.xml` | Golden XML packages (submitted to FDA and acknowledged) |
| `test/golden/*/json/*.json` | Headless CLI inputs that generated those XMLs |
| `faers-app/` | The Electron app; all `npm run` commands run from here |
| `test/test_submission/faers_xml_lint.py` | 60-check structural linter |

**Headless CLI invocation** (run from `faers-app/`):
```bash
npm run headless -- --out-dir <output_dir> <path_to_input.json>
```
- Builds `out/main/headless.js` via esbuild, then runs it under `ELECTRON_RUN_AS_NODE=1 electron`
- Writes `<scenario-stem>.xml` to `--out-dir`
- Add `--report` to also write a `.report.json` with structured gate results
- IND cases are auto-detected from `case.caseType = "ind"` in the JSON and route to `ZZFDATST_PREMKT` automatically; no extra flag needed
- Exit code 0 = all gates passed; non-zero = at least one gate failed

---

## Task

### Step 1 — Confirm environment

Verify the headless CLI builds and runs before processing any JSON:
```bash
cd faers-app
npm run build:headless
```
If the build fails, stop and report the error — do not proceed.

### Step 2 — Write the regression test script

Create `test/test_submission/golden_regression_test.py` with the following behavior:

**2a. Load the manifest** from `test/golden/manifest.json`. Skip any entry where `golden_json` is `null` (the 3 scenarios with no input JSON: TC-F02-comboproduct, TC-F04-ich-rpttype-2, TC-A06-ethnicity-ni). Log skipped scenarios clearly.

**2b. For each entry with a JSON**, run the headless CLI:
```bash
npm run headless -- --out-dir <temp_output_dir> \
    test/golden/<category>/json/<scenario>.json
```
Use a unique temp output directory per run (e.g. `tmp/golden_regression/<scenario>/`). Capture stdout, stderr, and exit code. A non-zero exit code is a **GATE FAILURE** — record it and continue to the next scenario; do not compare XMLs.

**2c. Compare generated XML vs golden XML** using a normalized structural diff:

The following fields are expected to differ on every run and must be **excluded from comparison**:

| XPath / field | Reason |
|---|---|
| `MCCI_IN200100UV01/id[@root="...3.22"]/@extension` | Batch UUID — fresh on every run |
| `PORR_IN049016UV/id[@root="...3.1"]/@extension` | Message envelope UUID |
| `//creationTime/@value` | Timestamp |
| `//effectiveTime[@xsi:type="IVL_TS"]/low/@value` at the `investigationEvent` level | Report receipt date (from JSON input) — may differ from golden's patched value |
| `//availabilityTime/@value` | Timestamp |
| `investigationEvent/id[@root="...3.1"]/@extension` | N.1.1 safetyReportId — JSON inputs may use original IDs (SR-CASE-EXAMPLE-TCA01) vs golden's fresh IDs (SR-CASE-20260507-TCA01) |
| `investigationEvent/id[@root="...3.2"]/@extension` | N.2.r.2 worldwideCaseId — same reason |

Everything **not** in the above list must match exactly between the generated XML and the golden XML. This includes:

- All coded values (race, ethnicity, reaction MedDRA codes, drug names, action taken, dechallenge, rechallenge, outcome codes)
- All element names, nesting depth, and ordering
- All OID values
- Reporter block structure (nested `representedOrganization`, `asLocatedEntity`, address fields)
- All `BL`, `CE`, `ED`, `PQ` value types and their attributes
- The `ZZFDATST` / `ZZFDATST_PREMKT` batch receiver value
- The `CDER` / `CDER_IND` message receiver value

**Comparison algorithm:**
1. Parse both XMLs with `lxml.etree` (or `xml.etree.ElementTree` if lxml unavailable)
2. Normalize whitespace in text nodes (strip, collapse internal runs)
3. Remove / blank out the excluded fields listed above before comparison
4. Perform a recursive element-by-element diff: tag, attributes, text, tail, child count, child order
5. Collect all differences into a structured list: `{path, field, golden_value, generated_value}`

**2d. Also run the 60-check lint** on every generated XML:
```bash
python test/test_submission/faers_xml_lint.py <generated_xml_path>
```
A lint failure (any `FAIL` in the output) is a **LINT FAILURE** — record separately from structural diff failures.

### Step 3 — Run the script

```bash
cd faers-app
python ../test/test_submission/golden_regression_test.py
```

### Step 4 — Produce a results report

After all 33 scenarios are processed, write `test/test_submission/regression/golden_regression_results.md` with this structure:

```
# Golden Regression Test Results
Run date: <timestamp>
Generator version: <git describe --tags or git rev-parse --short HEAD from faers-app>

## Summary
| Result | Count |
|---|---|
| PASS (generated XML matches golden) | N |
| GATE FAILURE (headless CLI non-zero exit) | N |
| LINT FAILURE (faers_xml_lint.py FAIL) | N |
| STRUCTURAL DIFF (content mismatch) | N |
| SKIPPED (no JSON input) | 3 |
| **Total scenarios** | **36** |

## Skipped Scenarios
- TC-F02-comboproduct (no JSON)
- TC-F04-ich-rpttype-2 (no JSON)
- TC-A06-ethnicity-ni (no JSON)

## Failures (detail)

### <scenario-name>
- **Result:** GATE FAILURE / LINT FAILURE / STRUCTURAL DIFF
- **Exit code:** N  (for gate failures)
- **Lint output:** <relevant lines>  (for lint failures)
- **Diffs:**  (for structural diffs)
  - `<xpath>`: golden=`<value>` generated=`<value>`
  - ...

## Full Pass List
<list of all PASS scenarios>
```

---

## Acceptance Criteria

The run is considered **FULLY PASSING** when:
- All 33 JSON-backed scenarios produce exit code 0 from the headless CLI
- All 33 generated XMLs score 60/60 on the lint
- All 33 generated XMLs match their golden counterparts on every field outside the excluded list

If any scenario fails, do **not** patch the generator speculatively. Instead:
1. Examine the diff carefully
2. Classify each failure as one of:
   - **Regression** — the generator changed behavior for a value that was previously correct
   - **New policy drift** — the generator is emitting an untested value not in `faersEmpiricalPolicy.ts`
   - **Test data mismatch** — the JSON input's case IDs or patched fields genuinely differ from the golden XML (expected and acceptable)
3. Report the classification alongside the diff in the results file
4. Only fix regressions. New policy drift and test data mismatches should be flagged for review, not silently corrected.

---

## Notes

- The headless CLI requires the Electron binary. Run this on macOS (not in a Linux sandbox). The `npm run headless` script handles the `ELECTRON_RUN_AS_NODE=1 electron` invocation automatically via `package.json`.
- The 3 missing JSON scenarios (TC-F02, TC-F04, TC-A06) cannot be regression-tested this way. They are documented in `test/golden/README.md`.
- For IND scenarios (IND-T01 through IND-T07), the generated XML will use `ZZFDATST_PREMKT` as the batch receiver and `CDER_IND` as the message receiver. The lint check skips the postmarket receiver validation for these automatically.
- The golden XMLs for TC-A01, TC-B02, and TC-E03 use patched case IDs (SR-CASE-20260507-TCA01, etc.) because the original JSON IDs were blocked by prior FAERS registration. The case ID fields are in the excluded list, so this will not cause a false failure.
- `faersEmpiricalPolicy.ts` is the single source of truth for value classifications. If a diff surfaces a value not in that table, update the table (with the correct `untested` classification) before deciding whether to fix the generator.
