# FAERS E2B(R3) Golden Test Dataset

This directory contains the canonical reference corpus for validating the DeepQuence FAERS ICSR XML generator. Every file here has been submitted to the FDA ESG NextGen TEST gateway (ZZFDATST / CDER) and received a confirmed acknowledgement. The XML and ACK are kept side-by-side so a validation run can compare generated output against a known-good baseline **and** assert that the same output would receive the same ACK result.

---

## Directory Layout

```
golden/
├── README.md
├── manifest.json                    ← machine-readable index (SHA256, core_id, ack_result, paths per scenario)
├── postmarket/
│   ├── accepted/                    ← 26 scenarios · FDA ACK typeCode CA+AA
│   │   ├── xml/                     ← submitted XMLs + ACK3 acknowledgements (always present)
│   │   │   ├── TC-A01-race-white.xml
│   │   │   ├── TC-A01-race-white.ack
│   │   │   └── ...
│   │   └── json/                    ← headless CLI inputs (24 of 26; see §Missing JSON note)
│   │       ├── TC-A01-race-white.json
│   │       └── ...
│   └── rejected/                    ← 3 scenarios · FDA ACK typeCode CR+AR  (negative golden refs)
│       ├── xml/
│       │   ├── TC-A03-race-amerindian.xml
│       │   ├── TC-A03-race-amerindian.ack
│       │   └── ...
│       └── json/                    ← 2 of 3 have JSON (TC-A06 missing)
│           ├── TC-A03-race-amerindian.json
│           └── ...
└── ind/
    └── accepted/                    ← 7 scenarios · FDA ACK typeCode CA+AE
        ├── xml/
        │   ├── IND-T01-susar-baseline.xml
        │   ├── IND-T01-susar-baseline.ack
        │   └── ...
        └── json/                    ← all 7 IND scenarios have JSON inputs
            ├── IND-T01-susar-baseline.json
            └── ...
```

Each scenario has up to three files sharing the same stem, split across two subfolders:

| Subfolder | Extension | Contents | Always present |
|---|---|---|---|
| `xml/` | `.xml` | E2B(R3) ICSR batch — the exact file submitted to FDA | Yes |
| `xml/` | `.ack` | FDA ESG NextGen ACK3 acknowledgement | Yes |
| `json/` | `.json` | Headless CLI input that generated the `.xml` | 33 of 36 (see below) |

The `.xml` and `.ack` files live together in `xml/` because they are an inseparable submission-evidence pair — the ACK references the batch UUID inside the XML. The `.json` inputs are kept in `json/` for clean separation between the generator input layer and the FDA submission evidence layer.

The `json_src` field in `manifest.json` records the original source path within `test_submission/examples/cases/` (relative to `test_submission/`). `golden_xml`, `golden_ack`, and `golden_json` give the in-dataset paths (relative to `golden/`).

### Missing JSON Input Files (3 scenarios)

Three scenarios were submitted without a tracked headless JSON — they were either generated via a different path or the JSON was not committed alongside the XML:

| Scenario | Category | Reason |
|---|---|---|
| `TC-F02-comboproduct` | postmarket/accepted | XML generated via app GUI path; no headless JSON saved |
| `TC-F04-ich-rpttype-2` | postmarket/accepted | XML generated via app GUI path; no headless JSON saved |
| `TC-A06-ethnicity-ni` | postmarket/rejected | Negative-reference XML; rejection confirmed without a separate JSON |

To regenerate the missing JSONs, inspect the corresponding `.xml` files and reverse-engineer the DeepQuence case import schema (`caseImportService.ts`), or reconstruct manually using the `TC-A05-ethnicity-hispanic.json` (for A06) and the `TC-F01-followup-v3.json` (for F02/F04) as the closest structural peers.

---

## Postmarket — Accepted (26 scenarios)

Submitted via ESG NextGen REST API (`submission_type=AERS`, `fda_center=CDER`) to ZZFDATST. ACK typeCode: **CA** at message level, **AA** at batch level.

| File stem | What it tests | Core-ID |
|---|---|---|
| `TC-A01-race-white` | Race = C41261 (White) — PROVEN SAFE | `ci260508041215.9fd2bfa59eb642568bc07fc78f182898` |
| `TC-A02-race-black` | Race = C16352 (Black or African American) | `ci260501173418.2f4965e887c8411698dcfd27f9f7c0bc` |
| `TC-A05-ethnicity-hispanic` | Ethnicity = C17459 (Hispanic or Latino) | `ci260423000420.11877ea00b49402fa8e367227c112eca` |
| `TC-B01-medhistory-empty` | Medical history section absent | `ci260501170724.8602650394d44a0f9dda95b60f432b57` |
| `TC-B02-medhistory-narrative` | Medical history as free-text narrative | `ci260508041220.f4fee9e6d02a4a2b8547417b334c7786` |
| `TC-C01-reporter-qual-2` | Reporter qualification = 2 (Pharmacist) | `ci260501170734.239f3823f97f4eb89242ec75cc2ccf47` |
| `TC-C02-reporter-qual-3` | Reporter qualification = 3 (Other health professional) | `ci260501170544.eb13b6b23098495fac264b08247efeb2` |
| `TC-D01-action-dose-reduced` | Drug action taken = dose reduced | `ci260501170553.407b534a8c8646e9890cdcdd28554e83` |
| `TC-D02-actiontaken-3` | Drug action taken = 3 (drug withdrawn) | `ci260501170743.317a308ddd4d4e1692aa9b34f89ba78a` |
| `TC-D03-actiontaken-5` | Drug action taken = 5 (not applicable) | `ci260501170752.a4d2539af77241fc86641f4b1125674f` |
| `TC-D04-dechallenge-1` | Dechallenge = 1 (yes, reaction abated) | `ci260501170801.df6b4779666c4e38b23fcbf09d9efc4c` |
| `TC-D05-two-suspect-drugs` | Two simultaneous suspect drugs | `ci260501170602.2123b84d221f4071b6d86dea5eb933cc` |
| `TC-D06-concom-actiontaken-6` | Concomitant drug with action taken = 6 | `ci260501170810.c6d07948de5c4d07aa7e0c0509607070` |
| `TC-E01-weight-absent` | Patient weight absent (no null flavor) | `ci260501170819.da2348d12ac1421ba0a562f734db3851` |
| `TC-E02-age-nullflavor` | Patient age with MSK null flavor | `ci260501170828.841147b2493d4b2f94b7ccb5669acec3` |
| `TC-E03-patient-female` | Patient sex = Female | `ci260508041224.bd0c4c72950448f49a75332c1d6868a3` |
| `TC-F01-followup-v3` | Follow-up report, version 3 | `ci260501170837.1fd56d3801ee45a9aa62ac4ee92c6788` |
| `TC-F02-comboproduct` | Combination product (drug + device) | `ci260501170846.4693050d5f174bcdbd25c26f7f872c54` |
| `TC-F03-nonexpedited` | Non-expedited report (15-day rule not triggered) | `ci260501225648.eb7dbc4f30cd45929119741f524910d8` |
| `TC-F04-ich-rpttype-2` | ICH E2B report type = 2 | `ci260501225657.bdd26c9a43f64f808dacb7718a202198` |
| `TC-G01-nonserous` | Non-serious adverse event | `ci260501225706.94c8c512f4124e0082be2aae84dc05ee` |
| `TC-G02-outcome-recovering` | Reaction outcome = recovering/resolving | `ci260501170922.21d0cdbf8b114742b96c0cf09222ff61` |
| `TC-G03-outcome-sequelae` | Reaction outcome = recovered with sequelae | `ci260501170931.0aefb3497b6541bab1da7cb4a6d26653` |
| `TC-G04-fatal-outcome` | Fatal outcome, cause of death reported | `ci260501170611.bb9d6033c77d46788e6c0fe33c2247c5` |
| `TC-H01-addldocs-true` | Additional documents flag = true | `ci260501170940.a90cee22e2844d4995ba75d71eec5142` |
| `TC-H03-orgname-changed` | Organization name changed since initial report | `ci260501170958.f9d56f18af6f4306a49ebe497405f12d` |

---

## Postmarket — Rejected (3 scenarios, negative golden references)

These scenarios use field values that CDER FAERS 2.18 business rules permanently reject. They are included so a validation suite can assert that the generator **does not** produce these values for the relevant fields. ACK typeCode: **CR** at message level, **AR** at batch level.

| File stem | Rejection reason | Empirical policy note |
|---|---|---|
| `TC-A03-race-amerindian` | Race = C41259 (American Indian or Alaska Native) — not in FAERS allowed list | Do NOT emit C41259 for postmarket race |
| `TC-A04-race-hawaiian` | Race = C41260 (Native Hawaiian or Other Pacific Islander) — not in FAERS allowed list | Do NOT emit C41260 for postmarket race |
| `TC-A06-ethnicity-ni` | Ethnicity = C17649 (Not Reported) — not in FAERS allowed list | Do NOT emit C17649 for postmarket ethnicity |

---

## IND/Premarket — Accepted (7 scenarios)

Submitted via ESG NextGen REST API (`submission_type=AERS_PREMKT_CDER`, `fda_center=CDER`) to ZZFDATST. Routing to CDER IND track is controlled by the AS2 envelope; the XML itself uses `N.1.4=ZZFDATST` and `N.2.r.3=CDER` (same as postmarket). ACK typeCode: **CA** at message level, **AE** at batch level (warning-level acceptance).

| File stem | What it tests | Core-ID | FAERS Local ACK# |
|---|---|---|---|
| `IND-T01-susar-baseline` | SUSAR baseline — postmarket-style body under IND routing | `ci260507054727.392c2406978f4a92bbb542d677e228aa` | 774209 |
| `IND-T02-susar-repeat` | SUSAR repeat / follow-up amendment | `ci260507054737.edc470647efa476c85834a16c972696a` | 774210 |
| `IND-T03-cross-ref-ind` | Cross-reference to IND number (C.5.5a) | `ci260507054746.50f8473e5aa242ee80ccf3c943e0ed44` | 774211 |
| `IND-T04-no-study-registration` | No study registration number present | `ci260507054756.dc1e6eddc447411481f0ec8b75072cf9` | 774212 |
| `IND-T05-fatal-seven-day` | Fatal SUSAR — 7-day expedited reporting rule | `ci260507054806.188de655b7ba4536bce4dd344ea51376` | 774213 |
| `IND-T06-babe-test-reference` | BABE/reference product submission | `ci260507054815.723b0f48995a4b8ba967219a0d8f33fe` | 774214 |
| `IND-T07-followup-report` | Follow-up amendment to a prior IND SUSAR | `ci260507054825.f9208bd002e745fe98131049c4a10270` | 774215 |

> **Note on CA+AE vs CA+AA:** IND ACKs carry typeCode AE (Warning) rather than AA (Accept) at the batch level. This is normal for CDER IND SUSAR submissions in the TEST environment and does not indicate an error. The warning text reads: *"Safety report loaded; Validated against 2.18 business rules; …"*

---

## Excluded Scenario

**TC-H02** (country-only reporter, no city/state location) received CR+AR on all three independent submission attempts. This scenario is definitionally unsupported by CDER FAERS 2.18 (`asLocatedEntity` element required by schema when reporter location is present). It is excluded from the golden dataset.

---

## manifest.json

The `manifest.json` at the root of this directory is a machine-readable index with one entry per scenario:

```json
{
  "scenario": "TC-A01-race-white",
  "category": "postmarket/accepted",
  "ack_result": "CA+AA",
  "core_id": "ci260508041215.9fd2bfa59eb642568bc07fc78f182898",
  "sha256_xml": "abc123...",
  "xml_src": "from_app/headless/TC-A01-race-white-fresh.xml",
  "ack_src": "May7/ci260508041215.9fd2bfa59eb642568bc07fc78f182898.ack"
}
```

Fields:

| Field | Description |
|---|---|
| `scenario` | Canonical stem name (matches `.xml` / `.ack` / `.json` filenames) |
| `category` | Category subdirectory within `golden/` (e.g. `postmarket/accepted`) |
| `ack_result` | Expected FDA ACK outcome: `CA+AA`, `CA+AE`, or `CR+AR` |
| `core_id` | ESG NextGen submission core ID — full `ci{timestamp}.{uuid}` format |
| `sha256_xml` | SHA256 of the XML at the time of submission (matches `submission_log.json`) |
| `xml_src` | Original source path of the XML relative to `test_submission/` |
| `ack_src` | ACK source path relative to `test_submission/acks/ACK3/` |
| `json_src` | Original headless CLI input path relative to `test_submission/`; `null` if not available |
| `golden_xml` | In-dataset path to the XML, relative to `golden/` (always `{category}/xml/{scenario}.xml`) |
| `golden_ack` | In-dataset path to the ACK, relative to `golden/` (always `{category}/xml/{scenario}.ack`) |
| `golden_json` | In-dataset path to the JSON, relative to `golden/` (`{category}/json/{scenario}.json` or `null`) |

---

## How to Use This Dataset

### Regression testing (XML content)

```python
import hashlib, json, pathlib

manifest = json.load(open('golden/manifest.json'))
for entry in manifest:
    if entry['ack_result'] != 'CA+AA':
        continue
    golden_xml = pathlib.Path('golden') / entry['golden_xml']   # e.g. postmarket/accepted/xml/TC-A01-race-white.xml
    generated_xml = run_generator(entry['scenario'])             # your code here
    # Compare field by field or SHA256 if generator is deterministic
    assert_xml_structurally_equivalent(golden_xml, generated_xml)
```

### ACK result assertion

```python
for entry in manifest:
    ack_file = pathlib.Path('golden') / entry['golden_ack']   # e.g. postmarket/accepted/xml/TC-A01-race-white.ack
    expected = entry['ack_result']
    # Parse the .ack XML and assert typeCode matches expected
    assert parse_ack_result(ack_file) == expected
```

### Round-trip validation (JSON → XML → ACK)

The `.json` files are the headless CLI inputs used to generate the corresponding `.xml`. You can use them to assert that the generator produces bit-equivalent output for known-accepted cases:

```python
import subprocess, pathlib, json

manifest = json.load(open('golden/manifest.json'))
for entry in manifest:
    if entry['json_src'] is None:
        continue   # no JSON available for this scenario
    if entry['ack_result'] != 'CA+AA':
        continue   # only validate positive cases end-to-end

    json_path = pathlib.Path('test_submission') / entry['json_src']
    golden_xml = pathlib.Path('golden') / entry['golden_xml']

    # Generate XML from the input JSON using the headless CLI
    result = subprocess.run(
        ['npm', 'run', 'headless', '--', str(json_path)],
        capture_output=True, text=True
    )
    generated_xml = find_generated_xml(result)   # your extraction logic here

    assert_xml_structurally_equivalent(golden_xml, generated_xml)
```

For negative cases (CR+AR), run the generator against the `.json` and assert that the output contains the expected rejected field value — the assertion is that the generator *can* produce the value, and the ACK record confirms it was properly rejected.

### Linting before comparison

All golden XMLs pass the `faers_xml_lint.py` 60-check suite. Run the lint on any generated XML before comparing against a golden file:

```bash
python test/test_submission/faers_xml_lint.py <generated.xml>
# Must report: 0 FAIL before comparison is meaningful

# Or lint against a golden XML directly:
python test/test_submission/faers_xml_lint.py golden/postmarket/accepted/xml/TC-A01-race-white.xml
```

---

## Submission Environment

| Parameter | Value |
|---|---|
| Gateway | ZZFDATST (FDA TEST — not PROD) |
| Postmarket endpoint | `submission_type=AERS`, `fda_center=CDER` |
| IND endpoint | `submission_type=AERS_PREMKT_CDER`, `fda_center=CDER` |
| XML batch receiver | `N.1.4 = ZZFDATST` |
| XML message receiver | `N.2.r.3 = CDER` (postmarket and IND alike) |
| E2B standard | ICH E2B(R3) / HL7 v3 |
| CDER business rules | FAERS 2.18 |
| Sender DUNS | 334818134 |

---

## Open Items

| ID | Description | Impact on golden dataset |
|---|---|---|
| OPEN-01 | FDA.C.5.6.r OID warning on IND submissions (OID `2.16.840.1.113883.3.989.5.1.2.2.1.2.3` is postmarket-only). Fix is one line in `faersEmpiricalPolicy.ts`. | None — IND files are CA+AE (accepted). Fix will upgrade AE→AA. |

---

*Dataset assembled: 2026-05-08. Total: 36 scenarios (26 postmarket accepted + 3 postmarket rejected + 7 IND accepted). TC-H02 excluded.*
