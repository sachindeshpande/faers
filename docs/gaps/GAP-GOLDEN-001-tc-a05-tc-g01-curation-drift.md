# GAP-GOLDEN-001 — TC-A05 + TC-G01 Golden Curation Drift

**Status:** Open — golden regeneration required
**Severity:** LOW — both XMLs are FDA-accepted (CA+AA); the drift is between the *curated* golden and what the *generator* now produces from the corresponding JSON. Production submissions are not affected.
**Discovered:** 2026-05-08 (golden regression run; commits `158206a` → `9cf75f1`)
**Affects:**
- `test/golden/postmarket/accepted/xml/TC-A05-ethnicity-hispanic.xml`
- `test/golden/postmarket/accepted/xml/TC-G01-nonserous.xml`
**Impact:** 2 of 33 regression scenarios stay STRUCTURAL DIFF until the golden XMLs are refreshed. The campaign run reports 31/33 PASS rather than 33/33.
**Source-of-truth report:** [`test/test_submission/golden_regression_results.md`](../../test/test_submission/golden_regression_results.md)

---

## 1. Why this is a gap

The `test/golden/` tree is the canonical reference set against which the generator's XML output is diffed. When the curated golden and the JSON-driven generator output diverge on content (outside the documented volatile-field exclusion list), one of three things is true:

1. The generator has a regression — fix the generator
2. The JSON has drifted from the golden — sync the JSON
3. **The golden has drifted from the generator** — refresh the golden

The two cases below are category 3. Both XMLs were curated from earlier app versions or hand-edited submissions; the generator has since been brought into line with the empirical behaviour the goldens themselves represent (ZZFDATST CA+AA), but the goldens were never refreshed against the current generator. The result is a closed gap in code paired with an open gap in test data.

---

## 2. Case A — TC-A05-ethnicity-hispanic

### 2.1 Symptom

The regression diff against the curated golden reports 33 differences inside every `<substanceAdministration>` block, all rooted in a single structural mismatch:

| Block | Children in TC-A05 golden | Children in every other golden + the generator |
|---|---|---|
| `substanceAdministration[0]` (Suspect drug) | `consumable, outboundRelationship2 ×4` (5 total) | `effectiveTime, consumable, outboundRelationship2 ×4` (6 total) |
| `substanceAdministration[1]` (Concomitant drug) | (same 5-child shape) | (same 6-child shape) |

The 4 `outboundRelationship2` children are correctly present in both — they just shift index by 1, producing 33 reported diffs across the two drug blocks.

### 2.2 Root cause

The generator emits an `<effectiveTime>` first child of `<substanceAdministration>` whenever the JSON drug carries `startDate` and/or `endDate`. Verified across passing scenarios:

| Scenario | JSON drug `startDate`/`endDate` | Golden has `effectiveTime` child? |
|---|---|---|
| TC-A01 (PASS) | Suspect: `2026-01-15` → `2026-03-10`; Concomitant: `2025-06-01` | ✅ yes |
| TC-A05 (FAIL) | **Identical to TC-A01** | ❌ no — only TC-A05 omits it |

TC-A05's golden was authored from a source — presumably an earlier generator version or a hand-edited XML — that didn't emit the `effectiveTime` block. Every other golden in `test/golden/postmarket/accepted/xml/` does emit it.

This is not a content disagreement with FDA — TC-A05 was accepted CA+AA. It's a curation artifact: the curator captured one version of the XML for TC-A05 and a slightly later version for everyone else.

### 2.3 Confirming evidence

```
$ python3 - <<'PY'
from lxml import etree
g = etree.parse('test/golden/postmarket/accepted/xml/TC-A05-ethnicity-hispanic.xml').getroot()
for sa in g.iter('{urn:hl7-org:v3}substanceAdministration'):
    print([c.tag.split('}')[-1] for c in sa])
    break
PY
['consumable', 'outboundRelationship2', 'outboundRelationship2', 'outboundRelationship2', 'outboundRelationship2']

$ python3 - <<'PY'
... same query against TC-A01 golden ...
PY
['effectiveTime', 'consumable', 'outboundRelationship2', 'outboundRelationship2', 'outboundRelationship2', 'outboundRelationship2']
```

### 2.4 Resolution path

Regenerate the golden from the JSON:

```bash
cd faers-app
npm run build:headless
ELECTRON_RUN_AS_NODE=1 IND_ENROLLMENT_CONFIRMED=true \
  npx electron out/main/headless.js --quiet --no-gate \
  --out-dir /tmp/tc-a05-regen \
  ../test/golden/postmarket/accepted/json/TC-A05-ethnicity-hispanic.json

# Confirm the only structural difference vs the current golden is the
# expected extra effectiveTime block (and volatile UUIDs/timestamps):
diff <(xmllint --format test/golden/postmarket/accepted/xml/TC-A05-ethnicity-hispanic.xml) \
     <(xmllint --format /tmp/tc-a05-regen/TC-A05-ethnicity-hispanic.xml)

# Sanity: lint must score 60/60.
python3 test/test_submission/faers_xml_lint.py /tmp/tc-a05-regen/TC-A05-ethnicity-hispanic.xml

# Replace + update SHA in manifest:
cp /tmp/tc-a05-regen/TC-A05-ethnicity-hispanic.xml \
   test/golden/postmarket/accepted/xml/TC-A05-ethnicity-hispanic.xml
python3 -c "
import hashlib, json, pathlib
p = pathlib.Path('test/golden/manifest.json')
m = json.loads(p.read_text())
new_sha = hashlib.sha256(pathlib.Path('test/golden/postmarket/accepted/xml/TC-A05-ethnicity-hispanic.xml').read_bytes()).hexdigest()
for e in m:
    if e['scenario'] == 'TC-A05-ethnicity-hispanic':
        e['sha256_xml'] = new_sha
p.write_text(json.dumps(m, indent=2))
"
```

Risk: LOW. The new golden differs from the current one only in the `effectiveTime` insertion, which the JSON already carries and which every other accepted XML in the set emits. No FDA round-trip needed; both shapes are empirically accepted.

This is what the prompt at [`docs/prompts/fix_golden_data_items_1_2.md`](../prompts/fix_golden_data_items_1_2.md) §1 already specifies. **The work is already prompted; this gap doc records *why* it's necessary.**

---

## 3. Case B — TC-G01-nonserous

### 3.1 Symptom

After commit `9cf75f1` (which synced the JSON to the golden's birthDate/age/narrative/expeditedReport and added C83121 emission for non-serious cases), TC-G01 reduced from 16 diffs to a single residual diff:

```
/MCCI_IN200100UV01/.../subjectOf2[9]/observation[1]/outboundRelationship2[13]/observation[1]/value[2]
  @code  golden=`hospitalization`  generated=`otherMedicallyImportant`
```

This is the C83121 "Seriousness" summary observation on the **second** reaction.

### 3.2 Root cause

The TC-G01 JSON has two reactions with **identical** seriousness state:

```json
"reactions": [
  { "term": "Nausea",                    "seriousness": { /* all 6 flags false */ } },
  { "term": "Hepatic enzyme increased",  "seriousness": { /* all 6 flags false */ } }
]
```

The golden's two C83121 blocks carry **different** values:

| Reaction | All 6 BL fields | Golden's C83121 `value@code` |
|---|---|---|
| 0 — Nausea | all false | `otherMedicallyImportant` |
| 1 — Hepatic enzyme increased | all false | `hospitalization` |

But the golden's reaction[1] BL `requiresInpatientHospitalization` is itself `false`. So the golden's "Seriousness summary = hospitalization" contradicts the per-criterion BL flag in the same reaction. **The golden is internally inconsistent.**

The generator, given identical all-false BL state on both reactions, derives the same fallback for both (`otherMedicallyImportant` per the new non-serious default added in `9cf75f1`). It cannot produce two different values from identical inputs without either:

- (i) an unambiguous JSON field expressing the per-reaction "primary seriousness criterion", or
- (ii) a different golden whose two reactions actually carry different BL flag combinations

### 3.3 Why option (i) is unattractive

Adding a `reaction.primarySeriousness` schema field to support a single edge-case golden is excess scope for the value. The C83121 block's purpose is to summarize the primary criterion that drove the seriousness judgment — when **no** criterion is true (non-serious), the value is necessarily a fallback sentinel. The golden's per-reaction variance has no semantic anchor in the JSON.

### 3.4 Why option (ii) is the right resolution

The TC-G01 golden is FDA-accepted (CA+AA, ci260501225706) but its internal inconsistency in the C83121 block does not reflect any FDA requirement we can verify. Regenerating the golden from the current JSON produces an internally-consistent XML (both reactions have identical Seriousness summaries), which is also what FDA's content rules expect — the BL flags and the C83121 summary should agree per reaction.

### 3.5 Resolution path

Regenerate the golden using the same procedure as TC-A05:

```bash
ELECTRON_RUN_AS_NODE=1 IND_ENROLLMENT_CONFIRMED=true \
  npx electron out/main/headless.js --quiet --no-gate \
  --out-dir /tmp/tc-g01-regen \
  ../test/golden/postmarket/accepted/json/TC-G01-nonserous.json

# Lint should be 60/60:
python3 test/test_submission/faers_xml_lint.py /tmp/tc-g01-regen/TC-G01-nonserous.xml

# Replace + update SHA:
cp /tmp/tc-g01-regen/TC-G01-nonserous.xml \
   test/golden/postmarket/accepted/xml/TC-G01-nonserous.xml
# (same SHA-update Python snippet as in §2.4)
```

Risk: LOW. The new golden will have:
- Both reactions emitting `Seriousness = otherMedicallyImportant` (the JSON-derivable fallback)
- All other content identical to the current golden (since the JSON was already synced to the golden's birthDate/age/narrative/expeditedReport in commit `9cf75f1`)

The current TC-G01 golden was hand-curated; the regenerated one will be JSON-derivable. After regen, every regression run will reproduce it byte-equivalent (within the volatile-field envelope).

---

## 4. Why both goldens were not refreshed at curation time

When the `test/golden/` tree was assembled, the curator captured each XML as-submitted to FDA. The campaign predates this version of the generator: `effectiveTime` emission on `substanceAdministration` and the C83121 default-on-non-serious behaviour both landed in commits between original submission and golden curation. The submitted XMLs (which the goldens preserve) reflect older generator state; the current generator output reflects post-fix state. Both shapes are FDA-accepted; only one matches the current generator.

This pattern will recur whenever the generator gains a new emission that's accepted by FDA but not present in earlier submitted XMLs. The standard remediation is golden regeneration after the change clears its FDA round-trip — captured in the campaign report's [§1.5 promotion convention](../../test/test_submission/SUBMISSION_CAMPAIGN_REPORT.md).

---

## 5. Acceptance for closing this gap

After both regenerations:

| Check | Expected |
|---|---|
| `python3 test/test_submission/golden_regression_test.py` | Exit 0; **33/33 PASS** / 3 SKIPPED / 0 OPEN |
| `test/golden/manifest.json` `sha256_xml` | Updated for TC-A05 and TC-G01 |
| Lint score on each new golden | 60/60 PASS |

Once 33/33 lands, this gap doc can move to a "✅ CLOSED" status block at the top and the path-to-33/33 status doc can be retired.

---

## 6. Out of scope

- **TC-A06 / TC-F02 / TC-F04** — these have no JSON inputs (XML-surgery cases) and remain SKIPPED in the regression. They are not part of this gap.
- **Generator changes** — the generator is correct in both cases; do not patch it. The fix is data-side regeneration.
- **FDA round-trip** — neither regeneration changes any field FDA validates beyond what was already accepted (CA+AA on the original submissions). No new submission is required.
