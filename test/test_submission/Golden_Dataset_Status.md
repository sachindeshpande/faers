# FAERS Test Submission — Golden Dataset Status
**Date:** 2026-05-07  
**Coverage:** All 37 test scenarios (30 postmarket TC-\* + 7 premarket IND-T\*)  
**Goal:** One FDA-acknowledged XML package per scenario, SHA256-verified on disk, for use as the reference corpus in automated workflow validation.

---

## Summary

| Category | Count | Status |
|---|---|---|
| Postmarket accepted (positive golden) | 22 | ✅ Complete |
| Postmarket rejected (negative golden) | 3 | ✅ Complete |
| IND/premarket accepted | 7 | ✅ Complete |
| TC-G01 v2 — pending ACK retrieval | 1 | ⏳ Action needed |
| Fresh submission needed (A01, B02, E03) | 3 | ⏳ Action needed |
| Excluded (invalid scenario) | 1 | — TC-H02 |
| **Total** | **37** | **32 of 36 actionable complete** |

---

## Section 1 — Postmarket: Positive Golden References (CA+AA)

All 22 files are **SHA256-verified** (on-disk hash matches submission_log.json). All have ACK3 typeCode CA+AA.

| Test Case | What It Covers | Core-ID | XML File | ACK File |
|---|---|---|---|---|
| TC-A02 | Race = Black | `ci260501173418.2f4965e887c8411698dcfd27f9f7c0bc` | `from_app/round2/TC-A02-race-black.xml` | `ACK3/May1/Batch1/ci260501173418...ack` |
| TC-A05 | Ethnicity = Hispanic | `ci260423000420.11877ea00b49402fa8e367227c112eca` | `golden/CASE-20260422-RSJK.xml` | `ACK3/Previous/ci260423000420...ack` |
| TC-B01 | Medical history = empty | `ci260501170724.8602650394d44a0f9dda95b60f432b57` | `from_app/round2/TC-B01-medhistory-empty.xml` | `ACK3/May1/Batch1/ci260501170724...ack` |
| TC-C01 | Reporter qualification = 2 | `ci260501170734.239f3823f97f4eb89242ec75cc2ccf47` | `from_app/round2/TC-C01-reporter-qual-2.xml` | `ACK3/May1/Batch1/ci260501170734...ack` |
| TC-C02 | Reporter qualification = 3 | `ci260501170544.eb13b6b23098495fac264b08247efeb2` | `from_app/headless/TC-C02-reporter-qual-3.xml` | `ACK3/May1/Batch1/ci260501170544...ack` |
| TC-D01 | Action taken = dose reduced | `ci260501170553.407b534a8c8646e9890cdcdd28554e83` | `from_app/headless/TC-D01-action-dose-reduced.xml` | `ACK3/May1/Batch1/ci260501170553...ack` |
| TC-D02 | Action taken = 3 (withdrawn) | `ci260501170743.317a308ddd4d4e1692aa9b34f89ba78a` | `from_app/round2/TC-D02-actiontaken-3.xml` | `ACK3/May1/Batch1/ci260501170743...ack` |
| TC-D03 | Action taken = 5 (not applicable) | `ci260501170752.a4d2539af77241fc86641f4b1125674f` | `from_app/round2/TC-D03-actiontaken-5.xml` | `ACK3/May1/Batch1/ci260501170752...ack` |
| TC-D04 | Dechallenge = 1 (yes) | `ci260501170801.df6b4779666c4e38b23fcbf09d9efc4c` | `from_app/round2/TC-D04-dechallenge-1.xml` | `ACK3/May1/Batch1/ci260501170801...ack` |
| TC-D05 | Two suspect drugs | `ci260501170602.2123b84d221f4071b6d86dea5eb933cc` | `from_app/headless/TC-D05-two-suspect-drugs.xml` | `ACK3/May1/Batch1/ci260501170602...ack` |
| TC-D06 | Concomitant drug, action taken = 6 | `ci260501170810.c6d07948de5c4d07aa7e0c0509607070` | `from_app/round2/TC-D06-concom-actiontaken-6.xml` | `ACK3/May1/Batch1/ci260501170810...ack` |
| TC-E01 | Weight absent (null flavor) | `ci260501170819.da2348d12ac1421ba0a562f734db3851` | `from_app/round2/TC-E01-weight-absent.xml` | `ACK3/May1/Batch1/ci260501170819...ack` |
| TC-E02 | Age with null flavor | `ci260501170828.841147b2493d4b2f94b7ccb5669acec3` | `from_app/round2/TC-E02-age-nullflavor.xml` | `ACK3/May1/Batch1/ci260501170828...ack` |
| TC-F01 | Follow-up v3 | `ci260501170837.1fd56d3801ee45a9aa62ac4ee92c6788` | `from_app/round2/TC-F01-followup-v3.xml` | `ACK3/May1/Batch1/ci260501170837...ack` |
| TC-F02 | Combination product | `ci260501170846.4693050d5f174bcdbd25c26f7f872c54` | `from_app/round2/TC-F02-comboproduct.xml` | `ACK3/May1/Batch1/ci260501170846...ack` |
| TC-F03 | Non-expedited report | `ci260501225648.eb7dbc4f30cd45929119741f524910d8` | `from_app/round2/TC-F03-nonexpedited.xml` | `ACK3/May1/Batch2/ci260501225648...ack` |
| TC-F04 | ICH report type = 2 | `ci260501225657.bdd26c9a43f64f808dacb7718a202198` | `from_app/round2/TC-F04-ich-rpttype-2.xml` | `ACK3/May1/Batch2/ci260501225657...ack` |
| TC-G02 | Outcome = recovering | `ci260501170922.21d0cdbf8b114742b96c0cf09222ff61` | `from_app/round2/TC-G02-outcome-recovering.xml` | `ACK3/May1/Batch1/ci260501170922...ack` |
| TC-G03 | Outcome = sequelae | `ci260501170931.0aefb3497b6541bab1da7cb4a6d26653` | `from_app/round2/TC-G03-outcome-sequelae.xml` | `ACK3/May1/Batch1/ci260501170931...ack` |
| TC-G04 | Fatal outcome | `ci260501170611.bb9d6033c77d46788e6c0fe33c2247c5` | `from_app/headless/TC-G04-fatal-outcome.xml` | `ACK3/May1/Batch1/ci260501170611...ack` |
| TC-H01 | Additional documents = true | `ci260501170940.a90cee22e2844d4995ba75d71eec5142` | `from_app/round2/TC-H01-addldocs-true.xml` | `ACK3/May1/Batch1/ci260501170940...ack` |
| TC-H03 | Organization name changed | `ci260501170958.f9d56f18af6f4306a49ebe497405f12d` | `from_app/round2/TC-H03-orgname-changed.xml` | `ACK3/May1/Batch1/ci260501170958...ack` |

---

## Section 2 — Postmarket: Negative Golden References (CR+AR)

These three scenarios test values that CDER FAERS 2.18 business rules **reject**. On-disk files are SHA256-verified. The rejections are stable and repeatable.

| Test Case | What It Tests | Core-ID | Rejection Reason | XML File |
|---|---|---|---|---|
| TC-A03 | Race = C41259 (American Indian) | `ci260501170657.1dfcd2bf85f4481f90748224627fef03` | Race code not in FAERS allowed list | `from_app/round2/TC-A03-race-amerindian.xml` |
| TC-A04 | Race = C41260 (Native Hawaiian) | `ci260501170706.15777c4a41aa43e19d81709ded86f1eb` | Race code not in FAERS allowed list | `from_app/round2/TC-A04-race-hawaiian.xml` |
| TC-A06 | Ethnicity = C17649 (Not Reported) | `ci260501170715.7beed508b6244fd19b35ccefb2ce6059` | Ethnicity code not in FAERS allowed list | `from_app/round2/TC-A06-ethnicity-ni.xml` |

---

## Section 3 — IND/Premarket: Positive Golden References (CA+AE)

All 7 IND-T\* files are **SHA256-verified**. Accepted with typeCode CA+AE (warning-level, not error). The AE warnings on T03 are for FDA.C.5.6.r (OID clash with postmarket FAERS report number), deferred per OPEN-01.

| Test Case | What It Covers | Core-ID | XML File | ACK File |
|---|---|---|---|---|
| IND-T01 | SUSAR baseline (postmarket-style body) | `ci260507054727.392c2406978f4a92bbb542d677e228aa` | `from_app/ind/IND-T01-susar-baseline.xml` | `ACK3/IND_May6/ci260507054727...ack` |
| IND-T02 | SUSAR repeat / follow-up | `ci260507054737.edc470647efa476c85834a16c972696a` | `from_app/ind/IND-T02-susar-repeat.xml` | `ACK3/IND_May6/ci260507054737...ack` |
| IND-T03 | Cross-reference to IND number | `ci260507054746.50f8473e5aa242ee80ccf3c943e0ed44` | `from_app/ind/IND-T03-cross-ref-ind.xml` | `ACK3/IND_May6/ci260507054746...ack` |
| IND-T04 | No study registration | `ci260507054756.dc1e6eddc447411481f0ec8b75072cf9` | `from_app/ind/IND-T04-no-study-registration.xml` | `ACK3/IND_May6/ci260507054756...ack` |
| IND-T05 | Fatal SUSAR, 7-day rule | `ci260507054806.188de655b7ba4536bce4dd344ea51376` | `from_app/ind/IND-T05-fatal-seven-day.xml` | `ACK3/IND_May6/ci260507054806...ack` |
| IND-T06 | BABE/reference product test | `ci260507054815.723b0f48995a4b8ba967219a0d8f33fe` | `from_app/ind/IND-T06-babe-test-reference.xml` | `ACK3/IND_May6/ci260507054815...ack` |
| IND-T07 | Follow-up report (amendment) | `ci260507054825.f9208bd002e745fe98131049c4a10270` | `from_app/ind/IND-T07-followup-report.xml` | `ACK3/IND_May6/ci260507054825...ack` |

---

## Section 4 — Action Items (3 scenarios need fresh submission)

### 4a. TC-G01 v2 — Retrieve Pending ACK

TC-G01 v2 (`TC-G01-nonserous.xml`, non-serious report scenario) was submitted May 1 and received "Upload Received" status. The ACK has not been downloaded. The on-disk file is **SHA256-verified** against the submission log.

```
Core-ID:   ci260501225706.94c8c512f4124e0082be2aae84dc05ee
Submitted: 2026-05-01T22:57:09Z
SHA256:    62ff0f9e22cf793c1f19cb303d86298f0acb545e9fa46df4cb814d4ab66fa3ea
```

**Steps:**
1. Log into the ESG portal → Submission History → search `ci260501225706`
2. Download the ACK3 XML and save to `acks/ACK3/May1/Batch2/ci260501225706.94c8c512f4124e0082be2aae84dc05ee.ack`
3. Save to `acks/ACK3/May7/ci260501225706.94c8c512f4124e0082be2aae84dc05ee.ack`
4. If CA+AA → TC-G01 is complete (no regeneration needed)
5. If CR+AR → regenerate using the steps in Section 4b (use `SR-CASE-20260507-TCG01`)

---

### 4b. TC-A01, TC-B02, TC-E03 — Submit Fresh XMLs

**Root cause:** The original case IDs were registered in FAERS via portal submission on April 29. "Message No and Sender Combination already Exists" rejects any reuse of `SR-CASE-EXAMPLE-TCA01` / `SR-CASE-EXAMPLE-TCB02` / `SR-CASE-EXAMPLE-TCE03`.

**Solution:** Fresh XMLs have been prepared with new unique message IDs:

| Scenario | New SR case ID | New case ID | Fresh XML ready |
|---|---|---|---|
| TC-A01 (Race = White) | `SR-CASE-20260507-TCA01` | `CASE-20260507-TCA1` | `from_app/headless/TC-A01-race-white-fresh.xml` |
| TC-B02 (Med history narrative) | `SR-CASE-20260507-TCB02` | `CASE-20260507-TCB2` | `from_app/headless/TC-B02-medhistory-narrative-fresh.xml` |
| TC-E03 (Patient sex = Female) | `SR-CASE-20260507-TCE03` | `CASE-20260507-TCE3` | `from_app/headless/TC-E03-patient-female-fresh.xml` |

All 3 fresh XMLs pass **60/60 lint checks** (faers_xml_lint.py).

**Submission commands** (run from `test_submission/`):
```bash
python submit_batch.py --file TC-A01-race-white-fresh.xml
python submit_batch.py --file TC-B02-medhistory-narrative-fresh.xml
python submit_batch.py --file TC-E03-patient-female-fresh.xml
```

**Post-submission:**
1. Note the core_ids returned in submission_log.json
2. Download ACK3 files to `acks/ACK3/May7/` (named `{core_id}.ack` per the standard convention)
3. Verify typeCode CA+AA at both message and batch levels
4. Copy confirmed XMLs to `golden/` folder

---

## Section 5 — Excluded Scenario

**TC-H02** (country-only reporter, no location) is **definitionally invalid** under CDER 2.18. It has received CR+AR on every attempt (3 submissions). This scenario is formally excluded from the golden dataset. The rejection XML (`TC-H02-nolocation.xml`) and its ACK (`ci260501235624...ack`) serve as documentation of the exclusion reason.

---

## Section 6 — Open Items

| ID | Issue | Risk | Status |
|---|---|---|---|
| OPEN-01 | FDA.C.5.6.r warning on IND-T03 (and minor variants on T01/T02) | LOW (CA+AE accepted) | Deferred — fix is a one-line OID change in faersEmpiricalPolicy.ts |
| OPEN-02 | TC-G01 v2 ACK retrieval | LOW (file SHA-verified) | Manual step — see Section 4a |
| OPEN-03 | TC-A01/B02/E03 fresh submissions | MEDIUM (needed to complete golden set) | Fresh XMLs ready — submit per Section 4b |

---

## Section 7 — Verification Checklist for Newly Accepted Golden XMLs

When adding a newly-accepted file to the golden set, verify all 5 gates:

- [ ] lint: `python faers_xml_lint.py <file>` → 0 FAIL
- [ ] ACK typeCode at message level = CA
- [ ] ACK typeCode at batch level = AA (or AE for IND)
- [ ] SHA256 of on-disk file matches `submission_log.json` entry
- [ ] Copy file to `golden/` folder with descriptive name (e.g. `golden/CASE-20260507-TCA01.xml`)
- [ ] Update `ACK_Issue_Tracker.md` and `FAERS_Test_Case_Catalog.md`
