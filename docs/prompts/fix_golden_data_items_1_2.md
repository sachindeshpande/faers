# Claude Code Prompt — Golden Data Fixes (Items 1 & 2)

**Source:** `test/issues/2026-05-08_golden_regression_open_items.md` §Open Items 1 and 2  
**Type:** Data/config fixes only — no code changes  
**Expected outcome:** Both items close; regression run advances from 29/33 to 31/33 PASS

---

## Context

The golden regression run (`test/test_submission/golden_regression_test.py`) found two scenarios where the curated golden XML and the JSON input file have drifted apart. Neither requires a code change — the generator is correct in both cases. The fix is to bring the test data back into sync.

---

## Item 1 — TC-A05: Regenerate golden XML from current JSON

**Root cause:** The golden XML `test/golden/postmarket/accepted/xml/TC-A05-ethnicity-hispanic.xml` was curated before the generator started emitting an `Indication` (`C41331`) observation block under each `substanceAdministration`. The JSON always carried the indication data; the generator now emits it. The golden is missing one `outboundRelationship2` child per drug block, causing a positional cascade of 33 diffs.

**Fix:** Regenerate the golden XML from the JSON and replace the curated file.

### Steps

**1. Run the headless CLI to generate a fresh XML:**
```bash
cd faers-app
npm run headless -- \
  --out-dir /tmp/tc-a05-regen/ \
  ../test/golden/postmarket/accepted/json/TC-A05-ethnicity-hispanic.json
```

**2. Verify the output passes lint (must be 60/60):**
```bash
python ../test/test_submission/faers_xml_lint.py /tmp/tc-a05-regen/TC-A05-ethnicity-hispanic.xml
```
Stop if any FAIL is reported.

**3. Diff the generated XML against the current golden — confirm the only structural differences are:**
- One extra `outboundRelationship2` block per suspect drug (the new `Indication` observation)
- UUID / timestamp fields (expected on every run)
- Case IDs (`SR-CASE-EXAMPLE-TCA01` → the JSON's value; acceptable)

If any coded value, OID, or element nesting differs beyond these three categories, stop and report — do not replace the golden.

**4. Replace the curated golden:**
```bash
cp /tmp/tc-a05-regen/TC-A05-ethnicity-hispanic.xml \
   test/golden/postmarket/accepted/xml/TC-A05-ethnicity-hispanic.xml
```

**5. Update `manifest.json`** — recompute the SHA256 of the new XML and update the `sha256_xml` field for the `TC-A05-ethnicity-hispanic` entry:
```bash
python3 -c "
import hashlib, json, pathlib
p = pathlib.Path('test/golden/manifest.json')
m = json.loads(p.read_text())
new_sha = hashlib.sha256(
    pathlib.Path('test/golden/postmarket/accepted/xml/TC-A05-ethnicity-hispanic.xml').read_bytes()
).hexdigest()
for e in m:
    if e['scenario'] == 'TC-A05-ethnicity-hispanic':
        e['sha256_xml'] = new_sha
        print(f'Updated sha256_xml → {new_sha}')
p.write_text(json.dumps(m, indent=2))
"
```

**6. Re-run the regression test** and confirm TC-A05 now shows PASS:
```bash
python test/test_submission/golden_regression_test.py --scenario TC-A05-ethnicity-hispanic
```

### Acceptance criteria
- Lint: 60/60 PASS
- Regression test: TC-A05 PASS
- `manifest.json` SHA256 updated

---

## Item 2 — TC-F03: Sync JSON narrative to patched golden

**Root cause:** The golden XML `test/golden/postmarket/accepted/xml/TC-F03-nonexpedited.xml` was manually patched after submission (fix v2) and carries an updated `caseNarrative` text. The JSON was not updated at the same time. The regression diff shows a single text-content mismatch in the `causalityAssessment/value` field.

**Current state:**

| Source | `case.caseNarrative` value |
|---|---|
| Golden XML (patched, FDA-accepted) | `"Variant of 2L8T baseline. TC-F03 fix v2: localCriteriaForExpedited=false, localCriteriaReportType=code 2 (Non-Expedited AE). SR-CASE-20260501-TCF03."` |
| JSON input (stale) | `"Variant of 2L8T baseline. Expedited flag set to false (A.1.9 = 2, non-expedited) for TC-F03. localReportTypeCode omitted."` |

**Fix:** Update the JSON to carry the same narrative as the patched golden. The golden XML is the authoritative artifact (it's the FDA-accepted file); the JSON follows it.

### Steps

**1. Open the JSON:**
```
test/golden/postmarket/accepted/json/TC-F03-nonexpedited.json
```

**2. Find the `case.caseNarrative` field and replace its value with:**
```
"Variant of 2L8T baseline. TC-F03 fix v2: localCriteriaForExpedited=false, localCriteriaReportType=code 2 (Non-Expedited AE). SR-CASE-20260501-TCF03."
```

**3. Verify the JSON is still valid:**
```bash
python3 -c "import json; json.load(open('test/golden/postmarket/accepted/json/TC-F03-nonexpedited.json')); print('valid')"
```

**4. Re-run the regression test and confirm TC-F03 now shows PASS:**
```bash
cd faers-app
python ../test/test_submission/golden_regression_test.py --scenario TC-F03-nonexpedited
```

### Acceptance criteria
- JSON parses as valid JSON
- Regression test: TC-F03 PASS
- No other fields in the JSON were changed

---

## After both items are done

Run the full regression to confirm the count advances:
```bash
cd faers-app
python ../test/test_submission/golden_regression_test.py
```

Expected result: **31/33 PASS** (TC-G01 and IND-T05 remain open; those require code changes — see `docs/prompts/fix_golden_code_items_3_4.md`).
