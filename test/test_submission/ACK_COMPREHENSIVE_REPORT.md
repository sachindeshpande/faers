# FAERS ESG NextGen — Comprehensive ACK Report
**Generated:** 2026-05-01 (last updated 2026-05-02)  
**Company:** DeepQuence (company_id 31537, user_id 33703, EIN 33-4818134)  
**Environment:** TEST | Gateways: ZZFDATST (postmarket) / ZZFDATST_PREMKT (IND/premarket)

---

## Summary

| Category | Total Sent | ✅ Accepted | ❌ Rejected | ⏳ ACK3 Pending |
|---|---|---|---|---|
| TC Postmarket (API, May 1 — Batch 1) | 27 | 19 CA+AA | 8 CR+AR | 0 |
| TC Postmarket (API, May 1 — Batch 2 v2 resubmit) | 3 | 2 CA+AA | 0 | 1 (TC-G01) |
| TC Postmarket (API, May 1 — Batch 2 TC-H02 v3) | 1 | 0 | 1 CR+AR (scenario invalid per FAERS 2.18) | 0 |
| TC Postmarket (Portal, Apr 23 + Apr 29) | 5 | 5 CA+AA | 0 | 0 |
| IND/Premarket (API, May 1) | 7 | 0 | 0 | 7 (ACK1+ACK2 ✅, ACK3 pending) |
| IND/Premarket (Portal, Apr 29–30) | 9 | 9 CA+AE | 0 | 0 |
| EMJQ dev iterations (Portal, Mar–Apr) | 38 | 3 CA+AA | 35 CR+AR | 0 |
| Unknown/duplicate submissions | 2 | 0 | 2 CR+AR | 0 |
| **TOTAL** | **92** | **38** | **46** | **8** |

**Net unique cases accepted (no duplicates):**
- 19 TC postmarket API CA+AA (Batch 1)
- 2 TC postmarket API CA+AA (Batch 2: F03, F04 fixes confirmed)
- 5 TC postmarket portal CA+AA (A01, A02-corrected, A05, B02, E03)
- 9 IND portal CA+AE (7 Apr 29–30 + 2 Apr 29 early INDT06 attempts)
- 7 IND API pending ACK3
- 4 proven-rejected data points (A03, A04, A06, H02 — empirical findings, no resubmit)
- TC-G01 v2 ACK3 still pending

---

## Section 1 — TC Postmarket: API Batch (May 1, 2026)

**Submitted via:** `submit_batch.py --skip-companies`  
**Submission window:** 17:04–17:34 UTC (10:04–10:34 AM PT)  
**Channel:** CDER / AERS / ZZFDATST  
**ACK3 folder:** `acks/ACK3/May1/`  
**ACK1:** Confirmed via email (sachindeshpande@deepquence.com, ~12:05–12:35 PM ET)  
**ACK2:** Confirmed indirectly — ACK3s exist for all 27 files, proving CDER received and processed each submission. ACK2 emails may be in spam at deepquence.com.

### Accepted — CA+AA (19 files)

| File | Core ID | Case ID | Result |
|---|---|---|---|
| TC-A02-race-black.xml | ci260501173418 | SR-CASE-EXAMPLE-TCA02 | ✅ CA+AA |
| TC-B01-medhistory-empty.xml | ci260501170724 | SR-CASE-EXAMPLE-TCB01 | ✅ CA+AA |
| TC-C01-reporter-qual-2.xml | ci260501170734 | SR-CASE-EXAMPLE-TCC01 | ✅ CA+AA |
| TC-C02-reporter-qual-3.xml | ci260501170544 | SR-CASE-EXAMPLE-TCC02 | ✅ CA+AA |
| TC-D01-action-dose-reduced.xml | ci260501170553 | SR-CASE-EXAMPLE-TCD01 | ✅ CA+AA |
| TC-D02-actiontaken-3.xml | ci260501170743 | SR-CASE-EXAMPLE-TCD02 | ✅ CA+AA |
| TC-D03-actiontaken-5.xml | ci260501170752 | SR-CASE-EXAMPLE-TCD03 | ✅ CA+AA |
| TC-D04-dechallenge-1.xml | ci260501170801 | SR-CASE-EXAMPLE-TCD04 | ✅ CA+AA |
| TC-D05-two-suspect-drugs.xml | ci260501170602 | SR-CASE-EXAMPLE-TCD05 | ✅ CA+AA |
| TC-D06-concom-actiontaken-6.xml | ci260501170810 | SR-CASE-EXAMPLE-TCD06 | ✅ CA+AA |
| TC-E01-weight-absent.xml | ci260501170819 | SR-CASE-EXAMPLE-TCE01 | ✅ CA+AA |
| TC-E02-age-nullflavor.xml | ci260501170828 | SR-CASE-EXAMPLE-TCE02 | ✅ CA+AA |
| TC-F01-followup-v3.xml | ci260501170837 | SR-CASE-EXAMPLE-TCF01 | ✅ CA+AA |
| TC-F02-comboproduct.xml | ci260501170846 | SR-CASE-EXAMPLE-TCF02 | ✅ CA+AA |
| TC-G02-outcome-recovering.xml | ci260501170922 | SR-CASE-EXAMPLE-TCG02 | ✅ CA+AA |
| TC-G03-outcome-sequelae.xml | ci260501170931 | SR-CASE-EXAMPLE-TCG03 | ✅ CA+AA |
| TC-G04-fatal-outcome.xml | ci260501170611 | SR-CASE-EXAMPLE-TCG04 | ✅ CA+AA |
| TC-H01-addldocs-true.xml | ci260501170940 | SR-CASE-EXAMPLE-TCH01 | ✅ CA+AA |
| TC-H03-orgname-changed.xml | ci260501170958 | SR-CASE-EXAMPLE-TCH03 | ✅ CA+AA |

### Rejected — CR+AR (8 files)

#### TC-A01-race-white.xml — DUPLICATE (not a content failure)
| Field | Value |
|---|---|
| Core ID | ci260501170454 |
| Case ID | SR-CASE-EXAMPLE-TCA01 |
| Result | ❌ CR+AR |
| FDA Error | `Case Rejected as Message No and Sender Combination already Exists.` |
| Root Cause | TC-A01 was already accepted via portal on 2026-04-29 (ci260429225353 — CA+AA). The API batch used the same case ID, triggering ISSUE-003 duplicate detection. |
| Action | **None needed.** The portal CA+AA (ci260429225353) is the definitive acceptance. TC-A01 scenario is complete. |

#### TC-A03-race-amerindian.xml — PROVEN REJECTED (data point collected)
| Field | Value |
|---|---|
| Core ID | ci260501170657 |
| Case ID | SR-CASE-EXAMPLE-TCA03 |
| Result | ❌ CR+AR |
| FDA Error | `Safety report not loaded; Validated against 2.18 business rules; Rejections: 1: Element value not allowed for tag FDA.D.11.r.1.` |
| Root Cause | Race code C41257 (American Indian or Alaska Native) is not accepted by FAERS 2.18 business rules for field FDA.D.11.r.1. |
| Action | **No resubmission.** The rejection is the data point for this test scenario. Update `faersEmpiricalPolicy.ts`: mark C41257 as `proven_rejected` for FDA.D.11.r.1. |

#### TC-A04-race-hawaiian.xml — PROVEN REJECTED (data point collected)
| Field | Value |
|---|---|
| Core ID | ci260501170706 |
| Case ID | SR-CASE-EXAMPLE-TCA04 |
| Result | ❌ CR+AR |
| FDA Error | `Safety report not loaded; Validated against 2.18 business rules; Rejections: 1: Element value not allowed for tag FDA.D.11.r.1.` |
| Root Cause | Race code C41258 (Native Hawaiian or Other Pacific Islander) is not accepted by FAERS 2.18 for FDA.D.11.r.1. |
| Action | **No resubmission.** Mark C41258 as `proven_rejected`. Same data-collection outcome as TC-A03. |

#### TC-A06-ethnicity-ni.xml — PROVEN REJECTED (schema error)
| Field | Value |
|---|---|
| Core ID | ci260501170715 |
| Case ID | SR-CASE-EXAMPLE-TCA06 |
| Result | ❌ CR+AR |
| FDA Error | `org.xml.sax.SAXParseException; lineNumber: 81; columnNumber: 47; cvc-type.2: The type definition cannot be abstract for element value.` |
| Root Cause | Using `nullFlavor="NI"` on the ethnicity observation `<value>` element triggers a schema abstract-type error. The `value` element's xsi:type cannot be the abstract base — the parser rejects the file before business-rule validation. |
| Action | **No resubmission.** Ethnicity nullFlavor is definitively not supported. Update `faersEmpiricalPolicy.ts`: mark ethnicity `nullFlavor=NI` as `schema_rejected`. |

#### TC-F03-nonexpedited.xml — PATCHED + RESUBMITTED ⏳
| Field | Value |
|---|---|
| Core ID (v1, rejected) | ci260501170855 |
| Core ID (v2, pending ACK3) | ci260501225648 |
| Case ID (v2) | SR-CASE-20260501-TCF03 |
| v1 Result | ❌ CR+AR |
| FDA Error | `If Combination Product Report Flag (FDA.C.1.12) is False or NI and Locally Expedited (C.1.7) is False or NI, value in Local Criteria Report Type (FDA.C.1.7.1) must be Non Expedited AE (Periodic).` |
| Root Cause | When expedited flag (C.1.7) is set to false/NI, FDA 2.18 requires `FDA.C.1.7.1` to carry "Non Expedited AE (Periodic)" (code=2). The generator was incorrectly hard-coding code=1 (15-Day) regardless of expedited flag. |
| Fix Applied | `localCriteriaReportType code="1"` → `code="2" displayName="Non-Expedited AE"`. New batch UUID + case ID. Generator bug fixed in xmlGeneratorService.ts. |
| v2 Status | ⏳ ACK3 pending (submitted 2026-05-01 15:56 UTC) |

#### TC-F04-ich-rpttype-2.xml — PATCHED + RESUBMITTED ⏳
| Field | Value |
|---|---|
| Core ID (v1, rejected) | ci260501170904 |
| Core ID (v2, pending ACK3) | ci260501225657 |
| Case ID (v2) | SR-CASE-20260501-TCF04 |
| v1 Result | ❌ CR+AR |
| FDA Errors | `(1) C.5.4 must be provided when C.1.3 = 2 and N.2.r.3 = "CDER".` `(2) Study Type Where Reaction(s)/Event(s) Were Observed — C.5.4/A.2.3.3 must be provided when Type of report (C.1.3/A.1.4) = 2 (Report from studies).` |
| Root Cause | File sets ICH Report Type `C.1.3 = 2` (Report from study) but omits `C.5.4` Study Type — which CDER mandates as a co-prerequisite. The generator never emitted `researchStudy` for postmarket "from study" cases. |
| Fix Applied | Added minimal `<researchStudy classCode="CLNTRL" moodCode="EVN"><code code="1" displayName="Clinical trials" …/>` block. Added `studyReport?: boolean` field to `case.types.ts`. Generator fixed in `xmlGeneratorService.ts`. |
| v2 Status | ⏳ ACK3 pending (submitted 2026-05-01 15:56 UTC) |

#### TC-G01-nonserous.xml — PATCHED + RESUBMITTED ⏳
| Field | Value |
|---|---|
| Core ID (v1, rejected) | ci260501170913 |
| Core ID (v2, pending ACK3) | ci260501225706 |
| Case ID (v2) | SR-CASE-20260501-TCG01 |
| v1 Result | ❌ CR+AR |
| FDA Error | `If Combination Product Report Flag (FDA.C.1.12) is False or NI and Locally Expedited (C.1.7) is False or NI, value in Local Criteria Report Type (FDA.C.1.7.1) must be Non Expedited AE (Periodic).` |
| Root Cause | Same root cause as TC-F03. All seriousness BL flags false → non-expedited case → FDA.C.1.7.1 must be code=2, not code=1. Generator bug: isExpedited was always true due to circular logic on reportTypeCode. |
| Fix Applied | Same generator fix as TC-F03: `localCriteriaReportType code="1"` → `code="2" displayName="Non-Expedited AE"`. New batch UUID + case ID. |
| v2 Status | ⏳ ACK3 pending (submitted 2026-05-01 15:57 UTC) |

#### TC-H02-nolocation.xml — PROVEN REJECTED (business rule data point collected)
| Field | Value |
|---|---|
| Core ID (v1, rejected) | ci260501170949 |
| Core ID (v2, rejected) | ci260501225715 |
| Core ID (v3, rejected) | ci260501235624 |
| v1 FDA Error | `Data value required for tag C.3.4.5.` — asLocatedEntity missing |
| v2 FDA Error | `SAXParseException` — asLocatedEntity placed outside `<assignedPerson>` (schema order violation) |
| v3 FDA Error | `Data value required for tag C.3.4.1 / C.3.4.2 / C.3.4.3 / C.3.4.4` — street, city, state, postal code all required |
| Final Finding | **CDER 2.18 mandates all five reporter address sub-fields (C.3.4.1–C.3.4.5).** A reporter with country-only is not supported. All of street (C.3.4.1), city (C.3.4.2), state/province (C.3.4.3), postal code (C.3.4.4), and country via asLocatedEntity (C.3.4.5) are required. |
| Action | **No resubmission.** TC-H02 scenario (reporter with no street-level address) is definitively not valid under FAERS 2.18. The generator must always emit a complete reporter address. Update `faersEmpiricalPolicy.ts`: mark C.3.4.1–C.3.4.4 as `required_by_cder_2_18`. |

### v2/v3 Resubmissions — ACK3 Results

| File | Core ID | Fix Applied | ACK3 | Finding |
|---|---|---|---|---|
| TC-F03-nonexpedited.xml | ci260501225648 (v2) | C.1.7.1 code `1`→`2` (Non-Expedited AE) | ✅ **CA+AA** | Generator bug confirmed fixed |
| TC-F04-ich-rpttype-2.xml | ci260501225657 (v2) | Added C.5.4 `researchStudy` block | ✅ **CA+AA** | C.5.4 required when C.1.3=2; fix confirmed |
| TC-G01-nonserous.xml | ci260501225706 (v2) | C.1.7.1 code `1`→`2` (Non-Expedited AE) | ⏳ **Pending** | — |
| TC-H02-nolocation.xml | ci260501235624 (v3) | Workflow-generated, country-only addr | ❌ **CR+AR** | FAERS 2.18 requires ALL C.3.4.1–C.3.4.5; partial address rejected. Scenario invalid — no resubmit. |

---

## Section 2 — TC Postmarket: Portal Submissions (April 29, 2026)

**Channel:** ZZFDATST (corrected from CDER_IND — see ISSUE-001)  
**All 4 accepted CA+AA with no warnings.**

| File | Core ID | Case ID | Result |
|---|---|---|---|
| TC-A01-race-white.xml (regen #4) | ci260429225353 | SR-CASE-EXAMPLE-TCA01 | ✅ CA+AA |
| TC-A05-ethnicity-hispanic.xml (regen #4) | ci260429225534 | SR-CASE-EXAMPLE-TCA05 | ✅ CA+AA |
| TC-B02-medhistory-narrative.xml (regen #4) | ci260429225614 | SR-CASE-EXAMPLE-TCB02 | ✅ CA+AA |
| TC-E03-patient-female.xml (regen #4) | ci260429225656 | SR-CASE-EXAMPLE-TCE03 | ✅ CA+AA |

*Note: Each of these had an earlier failed submission via the wrong CDER_IND channel (ISSUE-001). Those were superseded by regenerated files submitted via the correct ZZFDATST channel.*

---

## Section 3 — IND/Premarket: API Batch (May 1, 2026)

**Submitted via:** `submit_batch.py --skip-companies`  
**Submission window:** 19:27–19:45 UTC (12:27–12:45 PM PT)  
**Channel:** CDER / EIND / ZZFDATST_PREMKT  
**ACK1:** Confirmed — all 7 files confirmed in `acks/ACK1_ACK2/ACK1_ACK2_List1.pdf`  
**ACK2:** Confirmed for IND-T05, T06, T07 visible in `acks/ACK1_ACK2/ACK2/`. ACK1+ACK2 chain for T01–T04 confirmed via list PDF. Delivery to CDER within 1–3 minutes of submission.  
**ACK3:** ⏳ **Pending.** Expected result: CA+AE with standard C.5.6.r informational warning (same as all portal-submitted IND files).

| File | Core ID | Submitted | ACK1 | ACK2 | ACK3 |
|---|---|---|---|---|---|
| IND-T01-susar-baseline.xml | ci260501192746 | 19:27 UTC | ✅ | ✅ | ⏳ |
| IND-T02-susar-repeat.xml | ci260501194425 | 19:44 UTC | ✅ | ✅ | ⏳ |
| IND-T03-cross-ref-ind.xml | ci260501194434 | 19:44 UTC | ✅ | ✅ | ⏳ |
| IND-T04-no-study-registration.xml | ci260501194443 | 19:44 UTC | ✅ | ✅ | ⏳ |
| IND-T05-fatal-seven-day.xml | ci260501194452 | 19:44 UTC | ✅ | ✅ | ⏳ |
| IND-T06-babe-test-reference.xml | ci260501194501 | 19:45 UTC | ✅ | ✅ | ⏳ |
| IND-T07-followup-report.xml | ci260501194510 | 19:45 UTC | ✅ | ✅ | ⏳ |

---

## Section 4 — IND/Premarket: Portal Submissions (April 29–30, 2026)

**Channel:** ZZFDATST_PREMKT / CDER_IND  
**All accepted CA+AE with C.5.6.r informational warning only (no action required).**

### Early IND-T06 attempts (April 29, pre-fix)

Two early IND-T06 portal submissions on 2026-04-29 via the CDER_IND channel before the receiver was corrected. Both returned CA+AE — the C.5.6.r warning applies regardless of channel.

| Core ID | Case ID | Result | Notes |
|---|---|---|---|
| ci260429010301 | SR-CASE-EXAMPLE-INDT06 | ✅ CA+AE ⚠️ | C.5.6.r warning; early attempt before v3 regen |
| ci260429034546 | SR-CASE-EXAMPLE-INDT06 | ✅ CA+AE ⚠️ | C.5.6.r warning; same case ID — duplicate submission, both accepted |

### Full regen batch (April 29–30)

| File | Core ID | Case ID | Result | Warning |
|---|---|---|---|---|
| IND-T01-susar-baseline.xml (regen #3) | ci260430003632 | SR-CASE-EXAMPLE-INDT01 | ✅ CA+AE ⚠️ | C.5.6.r (informational) |
| IND-T02-susar-repeat.xml (regen #3) | ci260430003735 | SR-CASE-EXAMPLE-INDT02 | ✅ CA+AE ⚠️ | C.5.6.r (informational) |
| IND-T03-cross-ref-ind.xml (regen #3) | ci260430003832 | SR-CASE-EXAMPLE-INDT03 | ✅ CA+AE ⚠️ | Two C.5.6.r warnings (one per cross-ref element) |
| IND-T04-no-study-registration.xml (regen #3) | ci260430003937 | SR-CASE-EXAMPLE-INDT04 | ✅ CA+AE ⚠️ | C.5.6.r (informational) — C.5.1.r.1 (NCT) confirmed optional |
| IND-T05-fatal-seven-day.xml (regen #3) | ci260430004212 | SR-CASE-EXAMPLE-INDT05 | ✅ CA+AE ⚠️ | C.5.6.r (informational) |
| IND-T06-babe-test-reference.xml (regen #3) | ci260430004305 | SR-CASE-EXAMPLE-INDT06 | ✅ CA+AE ⚠️ | C.5.6.r (informational) |
| IND-T07-followup-report.xml (regen #3) | ci260430004355 | SR-CASE-EXAMPLE-INDT07 | ✅ CA+AE ⚠️ | C.5.6.r (informational) |

**C.5.6.r note:** FDA's CDER_IND center does not use the C.5.6.r cross-referenced IND element. FDA issues this warning proactively on all IND submissions regardless of whether the field is present. It is informational only — CA+AE is still granted. Expect on all future IND submissions.

---

## Section 5 — EMJQ Development Iterations + Early Portal Tests (March–April 2026)

**Purpose:** Developing the foundational EMJQ ICSR XML from scratch; early app-generated validation  
**ACK3 folder:** `acks/ACK3/Previous/`  
**Total:** 38 EMJQ iterations + 1 TC-A05 early portal test = 39 submissions → 3 CA+AA, 36 CR+AR

### Accepted
| Core ID | Case ID | Result | Notes |
|---|---|---|---|
| ci260410211359 | SR-CASE-20260331-EMJQ | ✅ CA+AA | v37 — first clean acceptance; golden reference |
| ci260421211040 | SR-CASE-20260421-2L8T | ✅ CA+AA | First app-generated file; confirms headless CLI output is valid |
| ci260423000420 | SR-CASE-EXAMPLE-TCA05 | ✅ CA+AA | TC-A05 (ethnicity Hispanic C41222) early portal test — accepted April 23 |

### Rejection Pattern (v1–v36)
All 36 rejected iterations of SR-CASE-20260331-EMJQ fell into one of three categories:

1. **Header/batch-level XML validation failures (v1–v5, various):** Missing or malformed N.1.x / N.2.r.x batch envelope fields. `Invalid XML: N.1.1/N.1.2/N.1.4/N.2.r.2 must be provided.`

2. **SAXParseException — schema constraint violations (v6–v28):** Element sequencing errors, wrong namespace declarations, cvc-complex-type and cvc-elt violations throughout the E2B(R3) HL7 structure. Each SAX error pointed to a specific line/column in the XML.

3. **FAERS 2.18 business rule violations (v29–v36):** Schema-valid XML rejected by FDA's business rules. Issues included missing mandatory coded values, incorrect CE attribute combinations, and field co-dependency violations.

*The full rejection history for each version is preserved in `acks/ACK3/Previous/` for audit purposes.*

---

## Section 6 — Other Portal Submissions (Historical)

### TC-A05 Early Portal Accept (April 23, 2026)
| Core ID | Case ID | Result |
|---|---|---|
| ci260423000420 | SR-CASE-EXAMPLE-TCA05 | ✅ CA+AA |

*This was the first TC portal acceptance before the April 29 batch. The same case ID was later re-submitted (ci260429225534) also as CA+AA.*

### IND-T06 Early Portal Submissions (April 29, 2026)
| Core ID | Case ID | Result |
|---|---|---|
| ci260429010301 | SR-CASE-EXAMPLE-INDT06 | ✅ CA+AE ⚠️ C.5.6.r |
| ci260429034546 | SR-CASE-EXAMPLE-INDT06 | ✅ CA+AE ⚠️ C.5.6.r |

*Two pre-regen portal submissions of IND-T06 — both accepted. The regen #3 version (ci260430004305) is the canonical accepted submission.*

---

## Section 7 — Unknown/Out-of-Band Submission

### ci260501051644 — Duplicate (05:16 UTC, May 1)
| Field | Value |
|---|---|
| Core ID | ci260501051644 |
| Case ID | SR-CASE-EXAMPLE-TCA01 |
| Result | ❌ CR+AR |
| Error | `Case Rejected as Message No and Sender Combination already Exists.` |
| Source | **Not in `submission_log.json`** — submitted directly from the Electron app, not via `submit_batch.py`. Submitted at 05:16 UTC (1:16 AM PT), hours before the main batch. |
| Action | None. TC-A01 (SR-CASE-EXAMPLE-TCA01) was already accepted via portal. This was an erroneous extra submission. |

---

## Section 8 — Previously Rejected / Superseded Portal Submissions (April 29)

These all failed due to **ISSUE-001** (wrong channel: CDER_IND used instead of ZZFDATST) and were superseded by regen #4 files submitted via the correct channel.

| Core ID | Case ID | Error |
|---|---|---|
| ci260429050800 | SR-CASE-EXAMPLE-TCA01 | CDER_IND channel mismatch |
| ci260429050943 | SR-CASE-EXAMPLE-TCA05 | CDER_IND channel mismatch |
| ci260429051614 | SR-CASE-EXAMPLE-TCA05 | Duplicate Message ID (ISSUE-003) |
| ci260429051745 | SR-CASE-EXAMPLE-TCB02 | CDER_IND channel mismatch |
| ci260429051846 | SR-CASE-EXAMPLE-TCE03 | CDER_IND channel mismatch |

---

## Section 9 — ACK1 / ACK2 Status Summary

| Track | ACK1 | ACK2 | Source |
|---|---|---|---|
| TC Postmarket (API, May 1) | ✅ Confirmed (~12:05–12:35 PM ET) | ✅ Confirmed indirectly (ACK3 exists for all 27) | ACK1: email PDF; ACK2: inferred from ACK3 presence |
| IND (API, May 1) | ✅ Confirmed (ACK1_ACK2_List1.pdf) | ✅ Confirmed (T05/T06/T07 in ACK2 PDF; T01–T04 in list PDF) | Both: email PDFs |
| TC Postmarket (Portal, Apr 29) | ✅ Portal receipt | ✅ Portal delivery | Portal dashboard |
| IND (Portal, Apr 29–30) | ✅ Portal receipt | ✅ Portal delivery | Portal dashboard |

**TC ACK2 email note:** ACK2 emails for the TC postmarket API batch are not visible in the ACK2 PDF (which only covers IND files). However, since ACK3 files exist for all 27 TC submissions, CDER definitively received and processed them. Check spam folder at sachindeshpande@deepquence.com for the missing ACK2 emails if needed for records.

---

## Section 10 — Test Campaign Status vs. Production Approval

| Scenario | File | Core ID (definitive) | ACK1 | ACK2 | ACK3 | Notes |
|---|---|---|---|---|---|---|
| TC-A01 Race White | TC-A01-race-white.xml | ci260429225353 (portal) | ✅ Portal | ✅ Portal | ✅ CA+AA | Complete — portal acceptance definitive; API resubmit was dup |
| TC-A02 Race Black | TC-A02-race-black.xml | ci260501173418 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-A03 Race Am. Indian | TC-A03-race-amerindian.xml | ci260501170657 | ✅ Email | ✅ Inferred | ❌ CR+AR — C41257 not allowed | Data point collected; no resubmit |
| TC-A04 Race Hawaiian | TC-A04-race-hawaiian.xml | ci260501170706 | ✅ Email | ✅ Inferred | ❌ CR+AR — C41258 not allowed | Data point collected; no resubmit |
| TC-A05 Ethnicity Hispanic | TC-A05-ethnicity-hispanic.xml | ci260429225534 (portal) | ✅ Portal | ✅ Portal | ✅ CA+AA | Complete |
| TC-A06 Ethnicity NI | TC-A06-ethnicity-ni.xml | ci260501170715 | ✅ Email | ✅ Inferred | ❌ CR+AR — nullFlavor abstract type | Data point collected; no resubmit |
| TC-B01 Med History Empty | TC-B01-medhistory-empty.xml | ci260501170724 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-B02 Med History Narrative | TC-B02-medhistory-narrative.xml | ci260429225614 (portal) | ✅ Portal | ✅ Portal | ✅ CA+AA | Complete |
| TC-C01 Reporter Qual 2 | TC-C01-reporter-qual-2.xml | ci260501170734 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-C02 Reporter Qual 3 | TC-C02-reporter-qual-3.xml | ci260501170544 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-D01 Action Dose Reduced | TC-D01-action-dose-reduced.xml | ci260501170553 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-D02 Action Taken 3 | TC-D02-actiontaken-3.xml | ci260501170743 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-D03 Action Taken 5 | TC-D03-actiontaken-5.xml | ci260501170752 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-D04 Dechallenge 1 | TC-D04-dechallenge-1.xml | ci260501170801 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-D05 Two Suspect Drugs | TC-D05-two-suspect-drugs.xml | ci260501170602 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-D06 Concom Action 6 | TC-D06-concom-actiontaken-6.xml | ci260501170810 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-E01 Weight Absent | TC-E01-weight-absent.xml | ci260501170819 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-E02 Age NullFlavor | TC-E02-age-nullflavor.xml | ci260501170828 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-E03 Patient Female | TC-E03-patient-female.xml | ci260429225656 (portal) | ✅ Portal | ✅ Portal | ✅ CA+AA | Complete |
| TC-F01 Followup v3 | TC-F01-followup-v3.xml | ci260501170837 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-F02 Combo Product | TC-F02-comboproduct.xml | ci260501170846 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-F03 Non-Expedited | TC-F03-nonexpedited.xml | ci260501170855 | ✅ Email | ✅ Inferred | ❌ CR+AR — FDA.C.1.7.1 missing | **Fix & resubmit required** |
| TC-F04 ICH Report Type 2 | TC-F04-ich-rpttype-2.xml | ci260501170904 | ✅ Email | ✅ Inferred | ❌ CR+AR — C.5.4 missing | **Fix & resubmit required** |
| TC-G01 Non-Serious | TC-G01-nonserous.xml | ci260501170913 | ✅ Email | ✅ Inferred | ❌ CR+AR — FDA.C.1.7.1 missing | **Fix & resubmit required** |
| TC-G02 Outcome Recovering | TC-G02-outcome-recovering.xml | ci260501170922 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-G03 Outcome Sequelae | TC-G03-outcome-sequelae.xml | ci260501170931 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-G04 Fatal Outcome | TC-G04-fatal-outcome.xml | ci260501170611 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-H01 Additional Docs True | TC-H01-addldocs-true.xml | ci260501170940 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| TC-H02 No Location | TC-H02-nolocation.xml | ci260501170949 | ✅ Email | ✅ Inferred | ❌ CR+AR — C.3.4.5 required | **Fix & resubmit required** |
| TC-H03 Org Name Changed | TC-H03-orgname-changed.xml | ci260501170958 | ✅ Email | ✅ Inferred | ✅ CA+AA | Complete |
| IND-T01 SUSAR Baseline | IND-T01-susar-baseline.xml | ci260430003632 (portal) / ci260501192746 (API) | ✅ Email PDF | ✅ Email PDF | ✅ CA+AE ⚠️ (portal) / ⏳ API pending | Complete (portal) |
| IND-T02 SUSAR Repeat | IND-T02-susar-repeat.xml | ci260430003735 (portal) / ci260501194425 (API) | ✅ Email PDF | ✅ Email PDF | ✅ CA+AE ⚠️ (portal) / ⏳ API pending | Complete (portal) |
| IND-T03 Cross-ref IND | IND-T03-cross-ref-ind.xml | ci260430003832 (portal) / ci260501194434 (API) | ✅ Email PDF | ✅ Email PDF | ✅ CA+AE ⚠️ (portal) / ⏳ API pending | Complete (portal) |
| IND-T04 No Study Reg | IND-T04-no-study-registration.xml | ci260430003937 (portal) / ci260501194443 (API) | ✅ Email PDF | ✅ Email PDF | ✅ CA+AE ⚠️ (portal) / ⏳ API pending | Complete (portal) |
| IND-T05 Fatal 7-day | IND-T05-fatal-seven-day.xml | ci260430004212 (portal) / ci260501194452 (API) | ✅ Email PDF | ✅ Email PDF | ✅ CA+AE ⚠️ (portal) / ⏳ API pending | Complete (portal) |
| IND-T06 BABE Reference | IND-T06-babe-test-reference.xml | ci260430004305 (portal) / ci260501194501 (API) | ✅ Email PDF | ✅ Email PDF | ✅ CA+AE ⚠️ (portal) / ⏳ API pending | Complete (portal) |
| IND-T07 Followup Report | IND-T07-followup-report.xml | ci260430004355 (portal) / ci260501194510 (API) | ✅ Email PDF | ✅ Email PDF | ✅ CA+AE ⚠️ (portal) / ⏳ API pending | Complete (portal) |

**ACK2 "Inferred" note:** ACK2 emails for the May 1 TC API batch were not captured in the ACK2 email PDF (which only covers IND files). ACK2 is marked Inferred because ACK3 files exist for all 27 TC submissions — CDER cannot issue an ACK3 without first receiving the file via ACK2 delivery. The data reached FDA; the emails may be in spam.

---

## Section 11 — Immediate Next Actions

### Priority 1 — Fix and Resubmit (4 TC files)
These require XML changes, regeneration with new batch UUID + case ID, and resubmission via the AERS/ZZFDATST channel:

1. **TC-F03-nonexpedited.xml** — Add `FDA.C.1.7.1 = "Non Expedited AE (Periodic)"` when `C.1.7 = false`
2. **TC-G01-nonserous.xml** — Add `FDA.C.1.7.1 = "Non Expedited AE (Periodic)"` + set all seriousness BL flags to false
3. **TC-F04-ich-rpttype-2.xml** — Add `C.5.4` (Study Type) element when `C.1.3 = 2`
4. **TC-H02-nolocation.xml** — Determine and add `C.3.4.5` value (reporter address country), or redesign the "no location" test approach

### Priority 2 — Code Update
- Update `faersEmpiricalPolicy.ts`: mark C41257 and C41258 as `proven_rejected` for `FDA.D.11.r.1`; mark ethnicity `nullFlavor=NI` as `schema_rejected`

### Priority 3 — Await
- IND-T01..T07 API ACK3s (core_ids ci260501192746 through ci260501194510) — expected CA+AE with C.5.6.r warning

### Priority 4 — Records
- Check spam at sachindeshpande@deepquence.com for TC postmarket ACK2 emails
- Update `FAERS_Test_Case_Catalog.md` with current ACK3 results
- Update `ACK_Issue_Tracker.md` with today's TC API results

---

*Report generated from: `acks/ACK3/May1/` (28 files), `acks/ACK3/Previous/` (40 files), `submission_log.json`, `ACK1_ACK2_List1.pdf`, `ACK1/Private Email Printout.pdf`, `ACK2/Private Email Printout.pdf`, `ACK_Issue_Tracker.md`*
