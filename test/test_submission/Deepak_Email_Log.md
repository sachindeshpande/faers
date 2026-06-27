# Email Correspondence with Deepak Nelivigi (FDA / AEMSESUB)

**Deepak Nelivigi** — aemsesub@fda.hhs.gov — FDA CDER FAERS submission reviewer  
**Sachin Deshpande** — sachindeshpande@deepquence.com — CEO, DeepQuence (company_id 31537)

---

## Overview

| # | Date | Direction | Subject / Topic | Status |
|---|---|---|---|---|
| 1 | Apr 24, 2026 (6:03 AM) | ← Inbound from Deepak | Production approval declined — Excel required | Received |
| 2 | Apr 24, 2026 (2:33 PM) | ← Inbound from Deepak | FDA 9 reporting scenarios — please test and submit | Received |
| 3 | Apr 24, 2026 | ← Inbound from Deepak | "Tags missing" on post-market file | Received |
| 4 | Late Apr 2026 | → Outbound to Deepak | IND API enrollment issue (ESGNG334) | Sent |
| 5 | ~May 12, 2026 | → Outbound to Deepak | Production access request — mega file complete (TC-M01) | Sent |
| 6 | ~May 15, 2026 | → Outbound to Deepak | Mega file core IDs (TC-M01 + TC-M02) | Sent |
| 7 | ~May 25, 2026 | → Outbound to Deepak | TC-M03 + TC-M04 accepted | Sent |
| 8 | Late May 2026 | → Outbound to Deepak | TC-M05 + TC-M06 accepted | Sent |
| 9 | ~May 26, 2026 | → Outbound to Deepak | TC-M07 accepted | Sent |
| 10 | May 29, 2026 | → Outbound to Deepak | Full scenario coverage update (41 scenarios, 7/9 FDA) | **Draft — not yet sent** |

---

## Message 1 — Inbound from Deepak
**Date:** April 24, 2026, 6:03 AM  
**From:** Deepak Nelivigi \<aemsesub@fda.hhs.gov\>  
**To:** Sachin Deshpande \<sachindeshpande@deepquence.com\>

> "We declined the production approval request and not the xml file. We saw many neg acks from production approval request. Please send all the scenario testing results in an excel and we will review them before approving production access."

**Key action required:** Submit a comprehensive scenario testing results Excel before production access can be reviewed.

---

## Message 2 — Inbound from Deepak
**Date:** April 24, 2026, 2:33 PM  
**From:** Deepak Nelivigi \<aemsesub@fda.hhs.gov\>  
**To:** Sachin Deshpande \<sachindeshpande@deepquence.com\>

> "Please see the below link. Please also test the scenarios posted. Note: the xml files are for reference only. Please generate the same scenarios in your PV system and send them via gateway."
>
> *(Link: FDA AEMS E2B(R3) Reporting Scenarios PDF — 9 numbered scenarios)*

**Key action required:** Test and submit all 9 FDA AEMS E2B(R3) reference scenarios from the DeepQuence PV system via the gateway (not using FDA's reference XML files directly).

---

## Message 3 — Inbound from Deepak (Separate Feedback)
**Date:** ~April 24, 2026  
**From:** Deepak Nelivigi \<aemsesub@fda.hhs.gov\>  
**To:** Sachin Deshpande \<sachindeshpande@deepquence.com\>

> "The post-market file has many tags missing. Lot of product, device, lab test data, patient data is missing."

**Key action required:** Produce a comprehensive "mega file" populating all optional E2B(R3) product, device, lab test, and patient data tags.

---

## Message 4 — Outbound to Deepak (AEMSESUB Helpdesk)
**Date:** Late April 2026  
**To:** aemsesub@fda.hhs.gov / ESGNGSupport@fda.hhs.gov  
**From:** sachindeshpande@deepquence.com  
**Subject:** IND ICSR API submission enrollment — ESGNG334 on credential step + portal admin decline (DeepQuence, company_id 31537)

**Summary:** Reported two blocking issues with IND ICSR submission via the REST API and portal:

- **Issue 1 — Portal admin decline:** IND test submissions via ZZFDATST_PREMKT receive CA+AE ACK (XML technically correct) but the portal also shows an administrative decline with message "please email AEMSESUB@fda.hhs.gov." Affected submissions: ci260429052038 (IND-T02), ci260428001004 (IND-T05).

- **Issue 2 — API ESGNG334 error:** The REST API credential endpoint returns HTTP 400 / ESGNG334 ("Center and Submission Type validation failed") for every IND combination tested, including the correctly matched pair (CDER_IND + IND). Postmarket CDER/AERS succeeds in the same session with the same OAuth token.

| fda_center | submission_type | Result |
|---|---|---|
| CDER | AERS | ✅ ESGNG210 — works |
| CDER_IND | IND | ESGNG334 — fails |
| CDER | IND | ESGNG334 — fails |
| CDER_IND | AERS | ESGNG334 — fails |
| CDER_IND | AERS_PREMKT | ESGNG334 — fails |

**Questions asked:**
1. What enrollment step is required for company_id 31537 to submit IND ICSRs via the ZZFDATST_PREMKT / CDER_IND REST API track?
2. What are the correct `fda_center` and `submission_type` values for IND ICSR submissions?
3. Are Issues 1 and 2 the same enrollment gap or separate account-configuration issues?

---

## Message 5 — Outbound to Deepak
**Date:** ~May 12, 2026  
**To:** aemsesub@fda.hhs.gov  
**From:** sachindeshpande@deepquence.com  
**Subject:** RE: Mega File Complete — Production Access Request (DeepQuence, company_id 31537)  
**Attachment:** FAERS_Scenario_Testing_Results_FDA_updated_2026-05-12.xlsx

**Summary:** Notified Deepak that the mega file (TC-M01) was submitted and accepted CA+AA (core ID: ci260512175821, May 12, 2026), and formally requested production access.

**Scenario scorecard at time of sending:**

| Category | Scenarios | Accepted |
|---|---|---|
| Postmarket ICSR (ZZFDATST / CDER) | 31 | 27 CA+AA, 4 CR+AR (intentional data points) |
| Premarket IND (ZZFDATST_PREMKT / CDER_IND) | 7 | 7 CA+AE |

**Mega file coverage (TC-M01):** Drug authorization (G.k.3), drug dosing detail (G.k.4.r) with route/dose/form/lot, drug ingredient with UNII substance code (G.k.2.3.r), B64 document attachment (C.1.6.1), literature reference (C.4.r), full reporter address (all 5 C.3.4 sub-fields), race and ethnicity observations.

**Key technical findings shared:**
- Race codes C41257 and C41258 are rejected by CDER FAERS 2.18 (CR+AR confirmed)
- Ethnicity nullFlavor=NI is a schema-level rejection (CR+AR confirmed)
- All 5 C.3.4 reporter address sub-fields are mandatory (confirmed over three-round campaign)
- C.5.6.r informational warning on all IND submissions is expected behavior for CDER_IND channel

---

## Message 6 — Outbound to Deepak
**Date:** ~May 15, 2026  
**To:** aemsesub@fda.hhs.gov  
**From:** sachindeshpande@deepquence.com  
**Subject:** RE: Mega File Core IDs — Production Access Request (DeepQuence, company_id 31537)  
**Attachment:** FAERS_Scenario_Testing_Results_FDA_updated_2026-05-15.xlsx

**Summary:** Provided full core IDs for both mega files as requested.

| File | Channel | Result | Date | safetyReportID | Core ID |
|---|---|---|---|---|---|
| TC-M01 (Postmarket Mega) | ZZFDATST / CDER | CA+AA | May 12, 2026 | SR-CASE-EXAMPLE-TCD05 | ci260512175821.68c4fc01235a4fd7b5935ac815415552 |
| TC-M02 (Premarket IND Mega) | ZZFDATST_PREMKT / CDER_IND | CA+AE | May 15, 2026 | SR-CASE-20260513-MEGA-IND | ci260515025404.a952dd3be6654a21a71d954aa0b2e57c |

TC-M02 covers all optional IND elements including route, dose, pharmaceutical form, lot number, active ingredient (UNII), IND authorization number (C.5.5a = 123456), C.5.6.r cross-referenced IND, B64 document attachment, and literature reference. W0012 informational warning appears on ACK as expected.

**Account details provided:**

| Field | Value |
|---|---|
| Company | DeepQuence |
| EIN | 33-4818134 |
| Contact | Sachin Deshpande, CEO |
| company_id | 31537 |
| user_id | 33703 |
| Non-Repudiation Letter | Company-Wide, uploaded 03/18/2026 |

Production access (ZZFDA / CDER) formally requested.

---

## Message 7 — Outbound to Deepak
**Date:** ~May 25, 2026  
**To:** aemsesub@fda.hhs.gov  
**From:** sachindeshpande@deepquence.com  
**Subject:** RE: Mega File Campaign Update — TC-M03 and TC-M04 Accepted (DeepQuence, company_id 31537)  
**Attachment:** FAERS_Scenario_Testing_Results_FDA_updated_2026-05-25.xlsx

**Summary:** Both additional postmarket mega files accepted, completing the comprehensive optional E2B(R3) section coverage.

| Test Case | Coverage | Result | Local # | Core ID |
|---|---|---|---|---|
| TC-M03 | Dual-reaction E.i.3.2 seriousness matrix (codes 34/21/33/35/12/26 per reaction); dual-suspect dosing; D.7.1.r, D.8.r, D.9, G.k.4.r, G.k.5, H.3.r, H.5.r | CA+AA | 882474 | ci260519222153.35169b836c834e598c9300839f897264 |
| TC-M04 | Quantitative lab results (F.r: ALT 850 U/L, AST 760 U/L with reference ranges); combination product flag (C156384 = true); full seriousness matrix | CA+AA | 890060 | ci260525042934.a4d960cd52da48a1abd717167fedae09 |

**Key finding flagged to Deepak:** E.i.3.2a–f and requiredIntervention must be present for all reactions carrying a seriousness indicator, with `BL value="false"` when not applicable — omitting them causes a "Data value required" rejection. However, the FDA web validator at faers-validator.fda.gov flags `BL value="false"` as invalid. Noted as an inconsistency between the two validation systems.

Updated scenario count: 33 scenarios.

---

## Message 8 — Outbound to Deepak
**Date:** Late May 2026  
**To:** Deepak Nelivigi  
**From:** Sachin Deshpande  
**Subject:** FAERS ESG Test Update — TC-M05 & TC-M06 Accepted (Device Data, Parent/Neonatal Case)

**Summary:** Two additional mega test cases accepted, addressing Deepak's "tags missing" feedback on device and patient data.

**TC-M05 — CA+AA (Local #890069):**
- FDA.G.k.12.r device data: malfunction flag, device problem code (NCI C54451), device usage (C54595), remedial action (C54594), lot number
- G.k.10.1 specialised product subcategory (Type 2 prefilled device, NCI C102835)
- G.k.7.r drug indication via inboundRelationship (Rheumatoid arthritis, MedDRA 10039073)
- H.4 sender's comments (free-text narrative)
- D.9.4.r autopsy-determined cause of death (Hepatic failure, MedDRA 10019663)

**TC-M06 — CA+AA (Local #805925):**
- D.10 full parent/mother data block: identity, age (28y), LMP, weight, height, D.10.7.r medical history (RA, continuing=true). Encoded as `role[@classCode="PRS"]` inside `player1`, confirmed against FDA Scenario6 reference file.
- G.k.6a/b gestation period at drug exposure (20 weeks)
- D.2.2.1a/b patient gestation at birth (34 weeks, premature)

TC-M06 required 3 submission attempts. Each rejection exposed and permanently closed a linter gap:

| Version | Rejection | Root Cause | Linter Section Added |
|---|---|---|---|
| v1 | SAX parse (schema ordering) | `role[@classCode="PRS"]` placed outside `player1` | Sec 22 — D.10 structural placement |
| v2 | E.i.7 business rule | `code="6"` (Unknown) used instead of `code="2"` (recovering) | Sec 23 — outcome value-set membership |
| v3 | ✅ CA+AA | — | — |

Updated scenario count: 35 scenarios.

---

## Message 9 — Outbound to Deepak
**Date:** ~May 26, 2026  
**To:** Deepak Nelivigi  
**From:** Sachin Deshpande  
**Subject:** TC-M07 Accepted (CA+AA) — Scenario6 Completion Fields + Linter Improvements (Sec 24/25)

**Summary:** TC-M07 accepted CA+AA (Local #805986), extending the maternal/neonatal base case (TC-M06) with six additional Scenario6 completion fields.

**New fields tested:**

| E2B Field | Value Tested |
|---|---|
| E.i.3.1 termHighlightedByReporter | code=1 (Yes) on R1; code=3 (No, Serious) on R2 |
| D.7.1.r.6 familyHistory | true — maternal RA history |
| G.k.4.r.11 parentRouteOfAdministration | C38299 (Subcutaneous, EDQM) |
| G.k.2.4 countryOfObtaining | US |
| D.10.8.r parentPastDrugHistory | mother's prior immunosuppressant |
| F.r.3.1 interpretationCode | code=1 (Positive) |

**CR+AR on v5 (fixed in v6):** v5 used `code="5"` (Abnormal) for F.r.3.1. Gateway rejected: "Element value not allowed for tag F.r.3.1." FDA Business Rules v1.7 confirms allowed set is `{1=Positive, 2=Negative, 3=Borderline, 4=Inconclusive}` — code 5 does not exist.

**Linter improvements:**
- Section 24: F.r.3.1 allowed code set corrected to {1,2,3,4} per Business Rules v1.7
- Section 25: `<subjectOf>` inside `<kindOfProduct>` — unconditional FAIL regardless of sibling elements

Updated postmarket score: 28 CA+AA / 4 CR+AR out of 32 postmarket scenarios (36 total including 8 IND).

---

## Message 10 — Outbound to Deepak (DRAFT — Not Yet Sent)
**Date:** May 29, 2026  
**To:** aemsesub@fda.hhs.gov  
**From:** sachindeshpande@deepquence.com  
**Subject:** Re: Post-Market File Tags Missing — Full Scenario Coverage Update (41 Scenarios, 7/9 FDA Scenarios)  
**Attachment:** FAERS_Scenario_Testing_Results_FDA_updated_2026-05-29.xlsx

**Summary:** Comprehensive response to Deepak's April 24 "tags missing" feedback. Reports 41 scenarios accepted across all five report types.

**Tags-missing gaps — all four categories closed:**

| Deepak's Category | Status | Evidence |
|---|---|---|
| Product data (G.k) | ✅ Fully covered | Dual roles, UNII, dose form, route, lot, cumulative dose, gestation at exposure, indication, dechallenge/rechallenge, combination product flag |
| Device data (G.k.12.r) | ✅ Fully covered | 14 fields: malfunction, problem code, brand/common name, product code, manufacturer+address, usage, lot, remedial action, model number, serial number |
| Lab test data (F.r) | ✅ Fully covered | 3 tests: MedDRA + LOINC codes, numeric/text results, reference ranges, interpretationCode on all 3 |
| Patient data (D) | ✅ Fully covered | Full D.1–D.10.8.r: demographics, medical history, past drugs, outcome, parent/fetal data |

**New scenarios completed since TC-M08:**

| File | ACK | Local # | Scenario |
|---|---|---|---|
| TC-M12 | CA+AA | 807564 | Final comprehensive mega-file (post-market, spontaneous) |
| IND-T08 | CA+AA | 807567 | Pre-market IND — spontaneous AE (C.1.3=1) |
| TC-F05 | CA+AA | 807569 | Solicited ODCS — Individual patient use (C.5.4=2) |

**FDA 9-scenario coverage (7/9 fully covered):**

| # | FDA Scenario | Status |
|---|---|---|
| 1 | Post-market spontaneous | ✅ Covered |
| 2 | Solicited/ODCS (Individual patient use) | ✅ Covered — TC-F05 |
| 3 | Aggregate/periodic summary | ⏳ Phase 2 — requires AGGREGATE report type module |
| 4 | Follow-up to initial report | ✅ Covered |
| 5 | Pre-market IND spontaneous | ✅ Covered — IND-T08 |
| 6 | Dual submission (postmarket + IND in same batch) | ⏳ Phase 2 — requires multi-gateway orchestration |
| 7 | Nullification/withdrawal | ✅ Covered |
| 8 | Literature-sourced report | ✅ Covered |
| 9 | Non-serious spontaneous | ✅ Covered |

**Scenarios 3 and 6 deferred to Phase 2** — Scenario 3 requires a separate aggregate/PSUR batch construction workflow; Scenario 6 requires multi-gateway routing from a single case record. Neither is a blocking gap for individual ICSR production submission.

> ⚠️ **Action pending:** This email draft is ready to send. The attached Excel must be included. This is the primary remaining step before Deepak can complete the production approval review.

---

## Current Status

| Topic | Status |
|---|---|
| Production approval (ZZFDA / CDER postmarket) | Pending — Message 10 draft not yet sent |
| Tags-missing feedback (product/device/lab/patient) | ✅ Fully addressed |
| FDA 9-scenario coverage | 7/9 covered; 2 deferred to Phase 2 |
| IND API enrollment (ESGNG334) | Status unknown — awaiting Deepak/helpdesk response |
| Total test submissions accepted | 41 CA+AA/CA+AE, 4 intentional CR+AR data points |
