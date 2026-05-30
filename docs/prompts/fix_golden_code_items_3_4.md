# Claude Code Prompt — Generator & Validator Code Fixes (Items 3 & 4)

**Source:** `test/issues/2026-05-08_golden_regression_open_items.md` §Open Items 3 and 4  
**Type:** Code changes — two independent fixes, can be done in either order  
**Expected outcome:** Both items close; regression run reaches 33/33 PASS  
**Pre-requisite:** Items 1 & 2 from `docs/prompts/fix_golden_data_items_1_2.md` should already be done (31/33 PASS baseline)

---

## Item 3 — TC-G01: Allow non-serious cases through the validator

**File:** `faers-app/src/main/database/connection.ts` (new migration 026)  
**File:** `faers-app/src/shared/types/caseImport.types.ts` (Zod schema)  
**File:** `faers-app/src/shared/types/case.types.ts` (`Case` interface)  
**File:** `faers-app/src/main/database/repositories/case.repository.ts` (fieldMappings + mapRowToCase)  
**File:** `faers-app/src/main/services/caseImportService.ts` (buildUpdateDto)  
**File:** `faers-app/src/main/services/validationService.ts` (B.2.i.7 relaxation)  
**Tests:** `faers-app/src/main/services/validationService.test.ts` (add 2 tests)

> **NOTE — supersedes the Item 3 section originally drafted without the DB layer.**
> The validator reads from SQLite via `caseRepo.findById()`, not from the raw JSON directly.
> Without a DB migration and a `mapRowToCase` mapping, `caseData.overallNonSerious` is
> always `undefined` at validation time and the B.2.i.7 fix silently has no effect.
> All six steps below are required for the field to flow JSON → SQLite → validator.

### Problem

`ValidationService.validateReactions()` enforces rule B.2.i.7 ("at least one seriousness criterion is required") unconditionally at line ~453 of `validationService.ts`:

```typescript
const hasSeriousness = reaction.seriousDeath ||
                      reaction.seriousLifeThreat ||
                      reaction.seriousHospitalization ||
                      reaction.seriousDisability ||
                      reaction.seriousCongenital ||
                      reaction.seriousOther;

if (!hasSeriousness) {
  errors.push({
    field: `reactions[${index}].seriousness`,
    message: `Reaction ${index + 1}: At least one seriousness criterion is required (B.2.i.7)`,
    severity: 'error'
  });
}
```

This blocks TC-G01 (non-serious adverse event, A.1.2 = 2) because all six seriousness BL fields are intentionally `false`. The TC-G01 golden XML (`test/golden/postmarket/accepted/xml/TC-G01-nonserous.xml`) was accepted by FDA with all seriousness criteria false — the rule should only fire when the case does not explicitly declare itself non-serious.

The validator receives a `Case` object (the DB entity returned by `caseRepo.findById()`), not a raw `CaseData` / JSON object. The `Case` type lives in `src/shared/types/case.types.ts`; `CaseData` is a separate interface used only by the XML generator. Changes must be made to `Case`, not `CaseData`.

### Fix — 10 steps in dependency order

**Step 1 — Add DB migration 026** in `faers-app/src/main/database/connection.ts`.

Locate the block that ends with:
```typescript
    console.log('Migration 025 applied successfully.');
  }
```

Immediately after that closing brace, add:

```typescript
  // Migration 026: overallNonSerious flag for non-serious cases (TC-G01)
  const migration026Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('026_overall_non_serious');

  if (!migration026Exists) {
    console.log('Applying migration 026: Adding overall_non_serious to cases...');
    const cols026 = database.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>;
    if (!cols026.map(c => c.name).includes('overall_non_serious')) {
      database.exec('ALTER TABLE cases ADD COLUMN overall_non_serious INTEGER DEFAULT 0');
    }
    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('026_overall_non_serious');
    console.log('Migration 026 applied successfully.');
  }
```

**Step 2 — Add `overallNonSerious` to the Zod import schema** in
`faers-app/src/shared/types/caseImport.types.ts`.

Find the `case` object schema (the block containing `expeditedReport: z.boolean().optional()`).
Add the new field directly after `expeditedReport`:

```typescript
    expeditedReport: z.boolean().optional(),
    /** When true, suppresses B.2.i.7 seriousness-criteria validation.
     *  Set to true for A.1.2 = 2 (non-serious) cases.
     *  Empirical evidence: TC-G01 golden (CA+AA, ci260501225706).
     */
    overallNonSerious: z.boolean().optional(),
```

**Step 3 — Add `overallNonSerious` to the `Case` interface** in
`faers-app/src/shared/types/case.types.ts`.

Find `isSerious?: boolean;` (line ~530, in the Phase 4 Report Type Classification section).
Add the new field directly below it:

```typescript
  isSerious?: boolean;
  /**
   * When true, the case is classified as non-serious (A.1.2 = 2) and
   * all seriousness criteria BL fields are intentionally false.
   * Suppresses the B.2.i.7 "at least one criterion required" validation error.
   * Empirical evidence: TC-G01 golden XML (CA+AA, ci260501225706).
   */
  overallNonSerious?: boolean;
```

**Step 4 — Add `overallNonSerious` to `fieldMappings`** in
`faers-app/src/main/database/repositories/case.repository.ts`.

Find the `fieldMappings` object (look for `expeditedReport: 'expedited_report'`).
Add the new mapping. A good place is directly after `expeditedReport`:

```typescript
      expeditedReport: 'expedited_report',
      overallNonSerious: 'overall_non_serious',
```

This ensures that any caller using `caseRepo.update(id, { overallNonSerious: true })` will
write to the correct column.

**Step 5 — Add `overallNonSerious` to `mapRowToCase()`** in the same file
(`case.repository.ts`).

Find the line `expeditedReport: row.expedited_report === 1,` (line ~511) and add directly below it:

```typescript
      expeditedReport: row.expedited_report === 1,
      overallNonSerious: row.overall_non_serious === 1,
```

**Step 6 — Wire `overallNonSerious` in `caseImportService.ts`**

Find the `buildUpdateDto` function (look for `if (doc.case.expeditedReport !== undefined)`).
Add the new field immediately after the `expeditedReport` line:

```typescript
    if (doc.case.expeditedReport !== undefined) update.expeditedReport = doc.case.expeditedReport;
    if (doc.case.overallNonSerious !== undefined) update.overallNonSerious = doc.case.overallNonSerious;
```

**Step 7 — Relax the B.2.i.7 check** in `validationService.ts`.

First, confirm the `validateReactions` signature at line ~432:
```typescript
private validateReactions(reactions: CaseReaction[], _caseData: Case, errors: ValidationError[])
```
The `_caseData` parameter is already there but unused (underscore prefix). Remove the underscore:
```typescript
private validateReactions(reactions: CaseReaction[], caseData: Case, errors: ValidationError[])
```

Then find the B.2.i.7 `if (!hasSeriousness)` block (~line 461) and replace:

```typescript
if (!hasSeriousness) {
  errors.push({
    field: `reactions[${index}].seriousness`,
    message: `Reaction ${index + 1}: At least one seriousness criterion is required (B.2.i.7)`,
    severity: 'error'
  });
}
```

With:

```typescript
// B.2.i.7 is suppressed when the case explicitly declares itself non-serious
// (overallNonSerious = true). The non-serious path is empirically accepted by
// CDER FAERS 2.18 — see TC-G01 golden (CA+AA ci260501225706).
if (!hasSeriousness && !caseData.overallNonSerious) {
  errors.push({
    field: `reactions[${index}].seriousness`,
    message: `Reaction ${index + 1}: At least one seriousness criterion is required (B.2.i.7)`,
    severity: 'error'
  });
}
```

**Step 8 — Update `test/golden/postmarket/accepted/json/TC-G01-nonserous.json`**

Add `overallNonSerious` to the `case` block (next to `expeditedReport`):

```json
"overallNonSerious": true
```

**Step 9 — Add two tests** to `validationService.test.ts`:

```typescript
it('passes B.2.i.7 when overallNonSerious is true and all criteria are false', () => {
  const caseData = buildValidCase({
    overallNonSerious: true,
    reactions: [{
      reactionTerm: 'Nausea',
      seriousDeath: false,
      seriousLifeThreat: false,
      seriousHospitalization: false,
      seriousDisability: false,
      seriousCongenital: false,
      seriousOther: false,
    }],
  });
  const errors = validationService.validate(caseData);
  expect(errors.filter(e => e.field.includes('seriousness'))).toHaveLength(0);
});

it('fires B.2.i.7 when overallNonSerious is false/absent and all criteria are false', () => {
  const caseData = buildValidCase({
    reactions: [{
      reactionTerm: 'Nausea',
      seriousDeath: false, seriousLifeThreat: false, seriousHospitalization: false,
      seriousDisability: false, seriousCongenital: false, seriousOther: false,
    }],
  });
  const errors = validationService.validate(caseData);
  expect(errors.some(e => e.field.includes('seriousness'))).toBe(true);
});
```

**Step 10 — Run regression for TC-G01:**

```bash
cd faers-app
npm run headless -- \
  --out-dir /tmp/tc-g01-test/ \
  ../test/golden/postmarket/accepted/json/TC-G01-nonserous.json
python ../test/test_submission/faers_xml_lint.py /tmp/tc-g01-test/TC-G01-nonserous.xml
python ../test/test_submission/golden_regression_test.py --scenario TC-G01-nonserous
```

### Acceptance criteria
- Headless CLI exits 0 for TC-G01
- Lint: 60/60 PASS
- Regression test: TC-G01 PASS
- The two new `validationService` tests pass
- No existing passing tests break (`npx vitest run src/main/services/validationService.test.ts`)

### Sanity check — confirm the field flows end-to-end

After the headless CLI run succeeds, query the DB to confirm the column was written:
```bash
sqlite3 ~/.faers-headless/faers.db \
  "SELECT id, overall_non_serious FROM cases WHERE id LIKE '%TCG01%' LIMIT 3;"
```
Expected: `overall_non_serious = 1` for any TC-G01 row.
If the column is `0`, the `buildUpdateDto` wiring in Step 6 is missing or the JSON field name is wrong.

---

## Item 4 — IND-T05: Enforce 15-Day code for IND PREMKT (FIX-X05)

**File:** `faers-app/src/main/services/xmlGeneratorService.ts`  
**Tests:** add one test covering the PREMKT override  

### Problem

The generator computes `reportTypeCode` at line ~536 of `xmlGeneratorService.ts`:

```typescript
const reportTypeCode = !isExpedited
  ? '2'                                                   // Non-Expedited AE (Periodic)
  : (caseData.localReportTypeCode === 7 ? '6' : '1');    // 7-Day or 15-Day
```

`isPremarket` is already derived two lines earlier:
```typescript
const isPremarket = caseData.caseType === 'ind' || caseData.caseType === 'babe';
```

When `isPremarket` is true, the FDA PREMKT channel (ZZFDATST_PREMKT / CDER_IND) only accepts `code="1"` (15-Day) for `localCriteriaReportType`. Using `code="6"` (7-Day) on the PREMKT channel produces CR+AR — confirmed in the TC-G01 and IND-T05 submission history, and documented as FIX-X05 in `FAERS_Workflow_XML_Gap_Analysis_v2.docx`. The fix was applied as manual XML surgery on the IND-T05 golden but was never coded into the generator.

### Fix

**Step 1 — Update the `reportTypeCode` derivation** in `xmlGeneratorService.ts` at line ~536:

Replace:
```typescript
const reportTypeCode = !isExpedited
  ? '2'                                                   // Non-Expedited AE (Periodic)
  : (caseData.localReportTypeCode === 7 ? '6' : '1');    // 7-Day or 15-Day
const reportTypeDisplay = !isExpedited
  ? 'Non-Expedited AE'
  : (reportTypeCode === '6' ? '7-Day' : '15-Day');
```

With:
```typescript
// FDA PREMKT channel (ZZFDATST_PREMKT / CDER_IND) only accepts code="1" (15-Day)
// for localCriteriaReportType, regardless of the JSON's localReportTypeCode.
// Empirical evidence: IND-T05 CR+AR → CA+AE after manual patch (FIX-X05,
// FAERS_Workflow_XML_Gap_Analysis_v2.docx). The postmarket channel continues to
// accept both code="1" (15-Day) and code="6" (7-Day).
const reportTypeCode = !isExpedited
  ? '2'                                                         // Non-Expedited AE (Periodic)
  : isPremarket
    ? '1'                                                       // IND/PREMKT: 15-Day only (FIX-X05)
    : (caseData.localReportTypeCode === 7 ? '6' : '1');        // Postmarket: 7-Day or 15-Day
const reportTypeDisplay = !isExpedited
  ? 'Non-Expedited AE'
  : (reportTypeCode === '6' ? '7-Day' : '15-Day');
```

No other files need changing. `isPremarket` is already in scope at this line.

**Step 2 — Add one test** to `xmlGeneratorService.test.ts` (or the integration test suite):

```typescript
it('forces localCriteriaReportType to 1 (15-Day) for IND PREMKT regardless of localReportTypeCode', async () => {
  const xml = await generateXml({
    ...baseIndCase,
    caseType: 'ind',
    expeditedReport: true,
    localReportTypeCode: 7,   // would produce code="6" on postmarket
  });
  expect(xml).toContain('code="1"');          // FIX-X05: forced to 15-Day
  expect(xml).not.toContain('code="6"');
});
```

**Step 3 — Verify the other 6 IND scenarios are unaffected:**
```bash
cd faers-app
python ../test/test_submission/golden_regression_test.py \
  --scenario IND-T01-susar-baseline \
  --scenario IND-T02-susar-repeat \
  --scenario IND-T03-cross-ref-ind \
  --scenario IND-T04-no-study-registration \
  --scenario IND-T06-babe-test-reference \
  --scenario IND-T07-followup-report
```

All 6 should remain PASS. (They all use `localReportTypeCode: 1`, so the new branch is not reached.)

**Step 4 — Run regression for IND-T05:**
```bash
python ../test/test_submission/golden_regression_test.py --scenario IND-T05-fatal-seven-day
```

### Acceptance criteria
- Regression test: IND-T05 PASS
- Regression test: IND-T01 through IND-T07 all still PASS
- The new generator test passes
- No existing passing tests break (`npx vitest run`)

---

## Final verification

After both items 3 and 4 are done, run the full regression suite:

```bash
cd faers-app
python ../test/test_submission/golden_regression_test.py
```

Expected result: **33/33 PASS | 3 SKIPPED | 0 OPEN**

If any scenario that was previously PASS is now FAIL, treat it as a regression introduced by this change — revert and investigate before proceeding.

After a clean 33/33, the regression script is ready to be added as a CI pre-merge gate per `test/issues/2026-05-08_findings_and_next_steps.md` §3.2.
