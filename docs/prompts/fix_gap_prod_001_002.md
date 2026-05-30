# Claude Code Prompt — Fix GAP-PROD-001 and GAP-PROD-002

**Purpose:** Wire `studyReport` and `combinationProduct` through the DB/import layer so the two
XML-surgery-only golden scenarios (TC-F02, TC-F04) become JSON-driven and regression-tested.

**Prerequisites:** Regression at 33/33 PASS (commit `189da36`). No code changes from prior sessions
are in flight.

**Risk:** LOW for GAP-PROD-002 (generator already coded, only DB wiring). LOW-MEDIUM for
GAP-PROD-001 (one generator line changes, all 33 existing scenarios use `value="false"` today so
no regression surface if the default is preserved).

---

## Background

Both TC-F02 and TC-F04 were accepted CA+AA by FDA but submitted via XML surgery (no JSON
driver). They are SKIPPED in the regression suite. To regression-test them, each needs:

1. A DB column (migration)
2. A `fieldMappings` entry and `mapRowToCase` mapping in `case.repository.ts`
3. A `Case` interface field (if missing)
4. A `CaseImportCaseSchema` Zod field
5. A `buildUpdateDto` wire-through in `caseImportService.ts`
6. (GAP-PROD-001 only) One generator change
7. A new JSON input file in `test/golden/postmarket/accepted/json/`
8. A new manifest entry in `test/golden/manifest.json`

The generator XML-emission code is **already present** for TC-F04. TC-F02 needs a one-line
generator change. No other generator logic is touched.

---

## GAP-PROD-002 — TC-F04: `studyReport` (ICH report type 2 postmarket)

### What exists today

- `CaseData.studyReport?: boolean` — already in `src/shared/types/case.types.ts` line 453
- Generator lines 679 + 916–922 (`src/main/services/xmlGeneratorService.ts`) — already branch on
  `caseData.studyReport === true` and emit the minimal `researchStudy` block with C.5.4
- **Missing:** `study_report` column in DB, `fieldMappings`, `mapRowToCase`, Zod schema, import wiring

### Step 1 — DB migration (`src/main/database/connection.ts`)

Find the last numbered migration block (currently `026_overall_non_serious`). Add immediately after:

```typescript
// Migration 027: studyReport flag for postmarket "Report from study" (TC-F04)
const migration027Exists = database.prepare('SELECT 1 FROM migrations WHERE name = ?').get('027_study_report');
if (!migration027Exists) {
  const cols027 = database.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>;
  if (!cols027.map(c => c.name).includes('study_report')) {
    database.exec('ALTER TABLE cases ADD COLUMN study_report INTEGER DEFAULT 0');
  }
  database.prepare('INSERT INTO migrations (name) VALUES (?)').run('027_study_report');
}
```

### Step 2 — `fieldMappings` (`src/main/database/repositories/case.repository.ts`)

In the `fieldMappings` object (around line 214, near `expeditedReport: 'expedited_report'`), add:

```typescript
studyReport: 'study_report',
```

### Step 3 — `mapRowToCase` (`src/main/database/repositories/case.repository.ts`)

In `mapRowToCase()` (around line 511, near `expeditedReport: row.expedited_report === 1`), add:

```typescript
studyReport: row.study_report === 1 || undefined,
```

(Use `=== 1 || undefined` rather than bare `=== 1` so `false` is not emitted for rows where the
column is NULL — keeps `studyReport` optional/absent for normal postmarket cases.)

### Step 4 — Zod schema (`src/shared/types/caseImport.types.ts`)

In `CaseImportCaseSchema` (around line 59, near `overallNonSerious: z.boolean().optional()`), add:

```typescript
/**
 * Postmarket "Report from study" (C.1.3 = 2). When true, the generator emits
 * ICH ReportType code=2 and the minimal C.5.4 researchStudy block.
 * CDER 2.18 requires C.5.4 when C.1.3=2: confirmed CR+AR without it (TC-F04 v1
 * ci260501170904); CA+AA with it (TC-F04 v2 ci260501225657).
 */
studyReport: z.boolean().optional(),
```

### Step 5 — Import wire-through (`src/main/services/caseImportService.ts`)

In `buildUpdateDto` (the function that maps `doc.case.*` fields onto the DB update DTO), find the
block that handles `overallNonSerious` or `expeditedReport` and add alongside:

```typescript
if (doc.case.studyReport !== undefined) update.studyReport = doc.case.studyReport;
```

### Step 6 — JSON input file

Create `test/golden/postmarket/accepted/json/TC-F04-ich-rpttype-2.json`.

Base it on the nearest accepted postmarket JSON (e.g. `TC-F01-followup-v3.json` minus the
follow-up fields), with these case-level overrides:

```json
{
  "case": {
    "safetyReportId": "TC-F04-ich-rpttype-2",
    "studyReport": true,
    "reportType": 1,
    "initialOrFollowup": 1,
    "expeditedReport": true
    // ... all other required fields from the 2L8T baseline
  }
  // reporters, drugs, reactions identical to baseline
}
```

**Acceptance gate for the JSON:** Run the headless CLI on it and confirm the output XML contains:
- `<value xsi:type="CE" code="2" displayName="Report from study" …/>` (ICH ReportType = 2)
- A `<researchStudy …>` block with `<code code="1" displayName="Clinical trials" …/>`
- Lint score 60/60

### Step 7 — Manifest entry (`test/golden/manifest.json`)

After generating the XML in step 6, compute its SHA-256 and add an entry:

```json
{
  "scenario": "TC-F04-ich-rpttype-2",
  "category": "postmarket/accepted",
  "golden_xml": "test/golden/postmarket/accepted/xml/TC-F04-ich-rpttype-2.xml",
  "golden_json": "test/golden/postmarket/accepted/json/TC-F04-ich-rpttype-2.json",
  "golden_ack": "test/golden/postmarket/accepted/xml/TC-F04-ich-rpttype-2.ack",
  "sha256_xml": "<computed SHA-256 of the new XML>"
}
```

Copy the generated XML to `test/golden/postmarket/accepted/xml/TC-F04-ich-rpttype-2.xml` and
copy the existing ACK (`acks/ci260501225657` or whichever file holds the v2 ACK) to
`test/golden/postmarket/accepted/xml/TC-F04-ich-rpttype-2.ack`.

### Step 8 — Verify

```bash
# Single-scenario regression
cd faers-app
python ../test/test_submission/golden_regression_test.py --scenario TC-F04-ich-rpttype-2

# Full regression — must stay 34 PASS (33 → 34 because TC-F04 moves from SKIPPED to PASS)
python ../test/test_submission/golden_regression_test.py

# SQLite sanity check
sqlite3 ~/.faers-headless/faers.db \
  "SELECT id, study_report FROM cases WHERE id LIKE '%TCF04%' LIMIT 3;"
```

Expected: `34 PASS / 0 GATE FAILURE / 0 LINT FAILURE / 0 STRUCTURAL DIFF / 2 SKIPPED`
(TC-A06 and TC-F02 remain SKIPPED until GAP-PROD-001 is also closed; TC-F04 moves from SKIPPED to PASS.)

---

## GAP-PROD-001 — TC-F02: `combinationProduct` (combination product indicator)

### What exists today

- Generator line 565 (`xmlGeneratorService.ts`): `<value xsi:type="BL" value="false"/>` — **hardcoded**
- `combinationProduct` does not exist in `CaseData`, `Case`, DB schema, or import schema

### Step 1 — DB migration (`src/main/database/connection.ts`)

Add immediately after migration 027 (from GAP-PROD-002 above):

```typescript
// Migration 028: combinationProduct flag for combination product reports (TC-F02)
const migration028Exists = database.prepare('SELECT 1 FROM migrations WHERE name = ?').get('028_combination_product');
if (!migration028Exists) {
  const cols028 = database.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>;
  if (!cols028.map(c => c.name).includes('combination_product')) {
    database.exec('ALTER TABLE cases ADD COLUMN combination_product INTEGER DEFAULT 0');
  }
  database.prepare('INSERT INTO migrations (name) VALUES (?)').run('028_combination_product');
}
```

### Step 2 — `Case` interface (`src/shared/types/case.types.ts`)

Find `additionalDocs?: boolean` (around line 447). Add alongside:

```typescript
combinationProduct?: boolean;
```

### Step 3 — `fieldMappings` (`src/main/database/repositories/case.repository.ts`)

Add alongside `additionalDocs: 'additional_docs'`:

```typescript
combinationProduct: 'combination_product',
```

### Step 4 — `mapRowToCase` (`src/main/database/repositories/case.repository.ts`)

Add alongside `additionalDocs: row.additional_docs === 1`:

```typescript
combinationProduct: row.combination_product === 1 || undefined,
```

### Step 5 — Zod schema (`src/shared/types/caseImport.types.ts`)

In `CaseImportCaseSchema`, add near `additionalDocs`:

```typescript
/**
 * Combination product report indicator (C156384). When true, the generator
 * emits BL value="true" for the C156384 observation.
 * TC-F02 golden CA+AA (ci260501170846) is the empirical evidence.
 */
combinationProduct: z.boolean().optional(),
```

### Step 6 — Import wire-through (`src/main/services/caseImportService.ts`)

In `buildUpdateDto`, add alongside `additionalDocs`:

```typescript
if (doc.case.combinationProduct !== undefined) update.combinationProduct = doc.case.combinationProduct;
```

### Step 7 — Generator change (`src/main/services/xmlGeneratorService.ts`)

Find line ~561–567 (the Combination Product Report Indicator block). Change:

```typescript
// BEFORE
lines.push('              <value xsi:type="BL" value="false"/>');

// AFTER
const comboProd = caseData.combinationProduct === true;
lines.push(`              <value xsi:type="BL" value="${comboProd}"/>`);
```

**Critical:** The default (`combinationProduct` absent or `false`) must still emit `value="false"`.
All 33 existing passing scenarios rely on the existing `false` emission. Confirm with a full
regression run before adding TC-F02 to the manifest.

### Step 8 — JSON input file

Create `test/golden/postmarket/accepted/json/TC-F02-comboproduct.json` with:

```json
{
  "case": {
    "safetyReportId": "TC-F02-comboproduct",
    "combinationProduct": true,
    "reportType": 1,
    "initialOrFollowup": 1,
    "expeditedReport": true
    // ... all other required fields from the 2L8T baseline
  }
}
```

**Acceptance gate for the JSON:** Confirm the output XML contains:
- `<value xsi:type="BL" value="true"/>` inside the C156384 `observationEvent`
- Lint score 60/60
- Direct diff against `test/golden/postmarket/accepted/xml/TC-F02-comboproduct.xml` MATCH (after normalization)

### Step 9 — Manifest entry (`test/golden/manifest.json`)

```json
{
  "scenario": "TC-F02-comboproduct",
  "category": "postmarket/accepted",
  "golden_xml": "test/golden/postmarket/accepted/xml/TC-F02-comboproduct.xml",
  "golden_json": "test/golden/postmarket/accepted/json/TC-F02-comboproduct.json",
  "golden_ack": "test/golden/postmarket/accepted/xml/TC-F02-comboproduct.ack",
  "sha256_xml": "<computed SHA-256>"
}
```

Copy the generated XML to the golden path and the existing ACK (`ci260501170846`) to the `.ack` path.

### Step 10 — Verify

```bash
# Run full regression BEFORE adding to manifest (confirms no regression on existing 33)
python ../test/test_submission/golden_regression_test.py
# Expected: 33 PASS / 0 GATE FAILURE / 2 SKIPPED (TC-A06 + TC-F02 still SKIPPED)

# After adding to manifest:
python ../test/test_submission/golden_regression_test.py --scenario TC-F02-comboproduct
# Expected: 1 PASS / 1 SKIPPED (TC-A06 is the only remaining skip)

# Full suite after manifest update:
python ../test/test_submission/golden_regression_test.py
# Expected: 35 PASS / 0 GATE FAILURE / 1 SKIPPED (only TC-A06 remains)
```

---

## Sequencing

Do GAP-PROD-002 first (zero generator risk), then GAP-PROD-001. Each has its own migration
number so they can be committed independently.

| Order | Gap | Migrations | Generator change | Risk |
|---|---|---|---|---|
| 1 | GAP-PROD-002 (studyReport / TC-F04) | 027 | None | Minimal |
| 2 | GAP-PROD-001 (combinationProduct / TC-F02) | 028 | 1 line | Low |

After both: regression should report **35 PASS / 0 GATE FAILURE / 1 SKIPPED** (TC-A06 is the only
remaining skip — it is a schema-rejected scenario with no valid XML form, so it can never be
JSON-driven).

---

## Acceptance for closing both gaps

| Check | Expected |
|---|---|
| `python3 test/test_submission/golden_regression_test.py` | Exit 0; **35 PASS / 1 SKIPPED** |
| Lint on TC-F02 and TC-F04 generated XMLs | 60/60 PASS |
| `test/golden/manifest.json` | Two new entries (TC-F02, TC-F04) with correct SHA-256 |
| TC-F02 XML: C156384 value | `value="true"` |
| TC-F04 XML: ICH ReportType | `code="2"` + `researchStudy` block with `code="1"` |
| All 33 pre-existing scenarios | Still PASS (regression must not regress) |
