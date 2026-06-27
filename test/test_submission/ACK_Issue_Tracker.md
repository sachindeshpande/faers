# FAERS ESG Test Submission — ACK Issue Tracker

**Last updated:** 2026-06-01 (TC-A02b v2 ci260601175051 CA+AA — **all 5 FDA race codes now proven_safe**. **30/30 postmarket scenarios accepted**; 1 scenario invalid by design (H02). IND 7/7 accepted.)  
**Gateway:** ZZFDATST (postmarket) / ZZFDATST_PREMKT (premarket/IND)  
**Environment:** TEST

---

## Legend

| Code | Meaning |
|---|---|
| CA | Content Accept — report loaded and validated |
| CR | Content Reject — report rejected by business rules |
| AE | Application Accept — batch processed successfully |
| AR | Application Reject — batch rejected before processing |
| ⚠️ | Accepted with warnings |
| ✅ | Clean accept (CA+AE, no warnings) or warning-only (no action needed) |
| ❌ | Rejected (CR and/or AR) — action required |
| ⏳ | Submitted, ACK pending |

---

## Postmarket Cases (ZZFDATST / CDER channel)

### Portal submissions — April 23 + 29

| Package | Case ID | ACK File | Result | Rejection / Warning | Potential Fix | Status |
|---|---|---|---|---|---|---|
| TC-A01-race-white.xml | SR-CASE-EXAMPLE-TCA01 | ci260429050800 | ❌ CR+AR | Submitted via CDER_IND — channel mismatch (ISSUE-001) | Regenerated (regen #4) + submitted via AERS | Superseded |
| TC-A01-race-white.xml *(regen #4, UUID …d1665431b0f0)* | SR-CASE-EXAMPLE-TCA01 | ci260429225353 | ✅ **CA+AA** | No warnings | — | ✅ Accepted |
| TC-A05-ethnicity-hispanic.xml | SR-CASE-EXAMPLE-TCA05 | ci260429050943 (CDER_IND channel) | ❌ CR+AR | CDER_IND channel mismatch (ISSUE-001) | Regenerated (regen #4) + submitted via AERS | Superseded |
| TC-A05-ethnicity-hispanic.xml *(same batch 134c8711)* | SR-CASE-EXAMPLE-TCA05 | ci260429051614 (ZZFDATST channel) | ❌ CR+AR | Duplicate Message ID (ISSUE-003) | Regenerated (regen #4) + submitted via AERS | Superseded |
| TC-A05-ethnicity-hispanic.xml *(regen #4, UUID …605bd78f8bd6)* | SR-CASE-EXAMPLE-TCA05 | ci260429225534 | ✅ **CA+AA** | No warnings | — | ✅ Accepted |
| TC-E03-patient-female.xml | SR-CASE-EXAMPLE-TCE03 | ci260429051846 | ❌ CR+AR | CDER_IND channel mismatch (ISSUE-001) | Regenerated (regen #4) + submitted via AERS | Superseded |
| TC-E03-patient-female.xml *(regen #4, UUID …5c06943de804)* | SR-CASE-EXAMPLE-TCE03 | ci260429225656 | ✅ **CA+AA** | No warnings | — | ✅ Accepted |
| TC-B02-medhistory-narrative.xml | SR-CASE-EXAMPLE-TCB02 | ci260429051745 | ❌ CR+AR | CDER_IND channel mismatch (ISSUE-001) | Regenerated (regen #4) + submitted via AERS | Superseded |
| TC-B02-medhistory-narrative.xml *(regen #4, UUID …86a0a3097a90)* | SR-CASE-EXAMPLE-TCB02 | ci260429225614 | ✅ **CA+AA** | No warnings | — | ✅ Accepted |

### API Batch 1 — May 1 (17:04–17:34 UTC)

| Package | Case ID | ACK File | Result | Notes | Status |
|---|---|---|---|---|---|
| TC-A01-race-white.xml | SR-CASE-EXAMPLE-TCA01 | ci260501170454 | ❌ CR+AR | Duplicate — already accepted ci260429225353. **No action needed.** | Superseded by portal CA+AA |
| TC-A02-race-black.xml | SR-CASE-EXAMPLE-TCA02 | ci260501173418 | ✅ **CA+AA** | Race C41259 proven accepted | ✅ Accepted |
| TC-A02b-race-black-c16352.xml *(v1)* | SR-CASE-EXAMPLE-TCA02B | ci260601163938 | ❌ CR+AR | "Case Rejected as Message No and Sender Combination already Exists" — batch ID `DeepQuenceTest-20260429-907ad7e3` and worldwide case ID `CASE-20260429-GF9N` carried forward from TC-A02 golden XML (accepted Apr 29). Both IDs must be unique per submission. | Fixed in v2 |
| TC-A02b-race-black-c16352.xml *(v2, fresh IDs)* | SR-CASE-EXAMPLE-TCA02B | ci260601175051 | ✅ **CA+AA** | "Report Loaded Successfully" — C16352 (African American) proven accepted. All 5 FDA race codes now proven_safe. | ✅ Accepted |
| TC-A03-race-amerindian.xml | SR-CASE-EXAMPLE-TCA03 | ci260501170657 | ❌ **CR+AR** | `Element value not allowed for tag FDA.D.11.r.1` — C41257 NOT in FDA value set (see ISSUE-009) | Patched v2 → CA+AA |
| TC-A03-race-amerindian.xml *(v2, C41259 fix)* | SR-CASE-EXAMPLE-TCA03 | ci260601150309 | ✅ **CA+AA** | "Report Loaded Successfully" — C41259 (American Indian or Alaska Native) proven accepted | ✅ Accepted |
| TC-A04-race-hawaiian.xml | SR-CASE-EXAMPLE-TCA04 | ci260501170706 | ❌ **CR+AR** | `Element value not allowed for tag FDA.D.11.r.1` — C41258 NOT in FDA value set (see ISSUE-009) | Patched v2 → CA+AA |
| TC-A04-race-hawaiian.xml *(v2, C41219 fix)* | SR-CASE-EXAMPLE-TCA04 | ci260601150313 | ✅ **CA+AA** | "Report Loaded Successfully" — C41219 (Native Hawaiian or Other Pacific Islander) proven accepted | ✅ Accepted |
| TC-A06-ethnicity-ni.xml | SR-CASE-EXAMPLE-TCA06 | ci260501170715 | ❌ **CR+AR** | `SAXParseException: cvc-type.2 abstract type` — nullFlavor schema-rejected | Patched: added `xsi:type="CE"` to `<value nullFlavor="NI"/>` |
| TC-A06-ethnicity-ni.xml *(v2, xsi:type="CE" fix)* | SR-CASE-EXAMPLE-TCA06 | ci260601050356 | ✅ **CA+AA** | "Report Loaded Successfully" — ethnicity nullFlavor=NI with xsi:type="CE" accepted | ✅ Accepted |
| TC-B01-medhistory-empty.xml | SR-CASE-EXAMPLE-TCB01 | ci260501170724 | ✅ **CA+AA** | Empty ED accepted | ✅ Accepted |
| TC-C01-reporter-qual-2.xml | SR-CASE-EXAMPLE-TCC01 | ci260501170734 | ✅ **CA+AA** | Reporter code=2 accepted | ✅ Accepted |
| TC-C02-reporter-qual-3.xml | SR-CASE-EXAMPLE-TCC02 | ci260501170544 | ✅ **CA+AA** | Reporter code=3 accepted | ✅ Accepted |
| TC-D01-action-dose-reduced.xml | SR-CASE-EXAMPLE-TCD01 | ci260501170553 | ✅ **CA+AA** | ActionTaken code=2 accepted | ✅ Accepted |
| TC-D02-actiontaken-3.xml | SR-CASE-EXAMPLE-TCD02 | ci260501170743 | ✅ **CA+AA** | ActionTaken code=3 accepted | ✅ Accepted |
| TC-D03-actiontaken-5.xml | SR-CASE-EXAMPLE-TCD03 | ci260501170752 | ✅ **CA+AA** | ActionTaken code=5 accepted | ✅ Accepted |
| TC-D04-dechallenge-1.xml | SR-CASE-EXAMPLE-TCD04 | ci260501170801 | ✅ **CA+AA** | Dechallenge code=1 accepted | ✅ Accepted |
| TC-D05-two-suspect-drugs.xml | SR-CASE-EXAMPLE-TCD05 | ci260501170602 | ✅ **CA+AA** | 2 suspect drugs accepted | ✅ Accepted |
| TC-D06-concom-actiontaken-6.xml | SR-CASE-EXAMPLE-TCD06 | ci260501170810 | ✅ **CA+AA** | ActionTaken code=6 accepted | ✅ Accepted |
| TC-E01-weight-absent.xml | SR-CASE-EXAMPLE-TCE01 | ci260501170819 | ✅ **CA+AA** | Weight optional, omission accepted | ✅ Accepted |
| TC-E02-age-nullflavor.xml | SR-CASE-EXAMPLE-TCE02 | ci260501170828 | ✅ **CA+AA** | birthTime nullFlavor=UNK accepted | ✅ Accepted |
| TC-F01-followup-v3.xml | SR-CASE-EXAMPLE-TCF01 | ci260501170837 | ✅ **CA+AA** | Follow-up version=3 accepted | ✅ Accepted |
| TC-F02-comboproduct.xml | SR-CASE-EXAMPLE-TCF02 | ci260501170846 | ✅ **CA+AA** | Combination product=true accepted | ✅ Accepted |
| TC-F03-nonexpedited.xml (v1) | SR-CASE-EXAMPLE-TCF03 | ci260501170855 | ❌ **CR+AR** | C.1.7.1 must be code=2 when expedited=false — **ISSUE-006** | Patched + resubmitted as v2 |
| TC-F04-ich-rpttype-2.xml (v1) | SR-CASE-EXAMPLE-TCF04 | ci260501170904 | ❌ **CR+AR** | C.5.4 researchStudy required when C.1.3=2 — **ISSUE-007** | Patched + resubmitted as v2 |
| TC-G01-nonserous.xml (v1) | SR-CASE-EXAMPLE-TCG01 | ci260501170913 | ❌ **CR+AR** | Same ISSUE-006 (C.1.7.1 code=1 when non-expedited) | Patched + resubmitted as v2 |
| TC-G02-outcome-recovering.xml | SR-CASE-EXAMPLE-TCG02 | ci260501170922 | ✅ **CA+AA** | Outcome code=2 accepted | ✅ Accepted |
| TC-G03-outcome-sequelae.xml | SR-CASE-EXAMPLE-TCG03 | ci260501170931 | ✅ **CA+AA** | Outcome code=4 accepted | ✅ Accepted |
| TC-G04-fatal-outcome.xml | SR-CASE-EXAMPLE-TCG04 | ci260501170611 | ✅ **CA+AA** | Outcome code=5 + resultsInDeath + death date accepted | ✅ Accepted |
| TC-H01-addldocs-true.xml | SR-CASE-EXAMPLE-TCH01 | ci260501170940 | ✅ **CA+AA** | additionalDocumentsAvailable=true accepted | ✅ Accepted |
| TC-H02-nolocation.xml (v1) | SR-CASE-EXAMPLE-TCH02 | ci260501170949 | ❌ **CR+AR** | C.3.4.5 missing — **ISSUE-008** | Patched (three rounds — see §H02) |
| TC-H03-orgname-changed.xml | SR-CASE-EXAMPLE-TCH03 | ci260501170958 | ✅ **CA+AA** | Reporter org name is free-text | ✅ Accepted |

### API Batch 2 / v2 Resubmissions — May 1 (22:56–23:57 UTC)

| Package | Case ID | ACK File | Result | Notes | Status |
|---|---|---|---|---|---|
| TC-F03-nonexpedited.xml (v2) | SR-CASE-20260501-TCF03 | ci260501225648 | ✅ **CA+AA** | C.1.7.1 code=2 fix confirmed | ✅ Accepted |
| TC-F04-ich-rpttype-2.xml (v2) | SR-CASE-20260501-TCF04 | ci260501225657 | ✅ **CA+AA** | C.5.4 researchStudy fix confirmed | ✅ Accepted |
| TC-H02-nolocation.xml (v2) | SR-CASE-20260501-TCH02V2 | ci260501225715 | ❌ **CR+AR** | SAXParseException — asLocatedEntity placed outside assignedPerson | Regenerated via headless workflow |
| TC-G01-nonserous.xml (v2) | SR-CASE-20260501-TCG01 | ci260501225706 | ✅ **CA+AA** | "Report Loaded Successfully" — C.1.7.1 code=2 fix confirmed. ACK timestamp 20260501190437-0400. Duplicate rejection in Jun 1 regression batch confirms prior load. | ✅ Accepted |
| TC-H02-nolocation.xml (v3) | SR-CASE-EXAMPLE-TCH02 | ci260501235624 | ❌ **CR+AR** | C.3.4.1/2/3/4 all required — CDER mandates full address. **Scenario invalid, no resubmit.** | ❌ Scenario closed |

---

## IND / Premarket Cases (ZZFDATST_PREMKT / CDER_IND channel)

| Package | Case ID | ACK File | Result | Warning | Notes | Status |
|---|---|---|---|---|---|---|
| IND-T01-susar-baseline.xml *(pre-regen)* | SR-CASE-EXAMPLE-INDT01 | ci260429044441 | ✅ CA+AE ⚠️ | C.5.6.r boilerplate — no action | — | Accepted |
| IND-T01-susar-baseline.xml *(regen #3, UUID …ba22291a3a69)* | SR-CASE-EXAMPLE-INDT01 | ci260430003632 | ✅ CA+AE ⚠️ | C.5.6.r boilerplate — no action | Local msg 769811 | ✅ Accepted |
| IND-T02-susar-repeat.xml *(pre-regen)* | SR-CASE-EXAMPLE-INDT02 | ci260429052038 | ✅ CA+AE ⚠️ + ⚠️ Portal decline | C.5.6.r boilerplate; portal admin decline (ISSUE-004) | Email AEMSESUB@fda.hhs.gov | ICSR accepted; portal action required |
| IND-T02-susar-repeat.xml *(regen #3, UUID …91394994482f)* | SR-CASE-EXAMPLE-INDT02 | ci260430003735 | ✅ CA+AE ⚠️ | C.5.6.r boilerplate — no action | Two-positive-ACK rule confirmed on regen #3 files | ✅ Accepted |
| IND-T03-cross-ref-ind.xml *(regen #3, UUID …d4c58a35100b)* | SR-CASE-EXAMPLE-INDT03 | ci260430003832 | ✅ CA+AE ⚠️ | Two C.5.6.r warnings (one per cross-ref element) — no action | Dual warning confirms C.5.6.r repeating pattern accepted; local msg 769813 | ✅ Accepted |
| IND-T04-no-study-registration.xml *(regen #3, UUID …e5c54af1583e)* | SR-CASE-EXAMPLE-INDT04 | ci260430003937 | ✅ CA+AE ⚠️ | C.5.6.r boilerplate — no action | **C.5.1.r.1 (NCT) confirmed optional** — omitting study registration number accepted by FDA | ✅ Accepted |
| IND-T04-no-study-registration.xml *(duplicate submit, same UUID …e5c54af1583e)* | SR-CASE-EXAMPLE-INDT04 | ci260430004110 | ❌ CR+AR | Duplicate Message ID (ISSUE-003) — same UUID re-submitted after CA+AE | No action — original CA+AE (ci260430003937) is definitive | Superseded |
| IND-T05-fatal-seven-day.xml *(early attempt)* | SR-CASE-EXAMPLE-INDT05 | ci260428001004 | ❌ CR+AR | "Date of Death D.9.1 has a value — Was Autopsy Done? D.9.3 must contain a value" (ISSUE-005) | Fixed in app before 04-29 resubmission | ✅ Superseded — closed |
| IND-T05-fatal-seven-day.xml | SR-CASE-EXAMPLE-INDT05 | ci260429044612 | ✅ CA+AE ⚠️ | `FDA.C.5.6.r is invalid for the Center specified in N.2.r.3` | Pre-regen; validates fatal case + 7-day auto-derivation | Accepted |
| IND-T05-fatal-seven-day.xml *(regen #3, UUID …e0705be0f194)* | SR-CASE-EXAMPLE-INDT05 | ci260430004212 | ✅ CA+AE ⚠️ | C.5.6.r boilerplate — no action | Fatal case + D.9.3 autopsy fix confirmed through regen #3; local msg 769815 | ✅ Accepted |
| IND-T06-babe-test-reference.xml | SR-CASE-EXAMPLE-INDT06 | ci260429034546 | ✅ CA+AE ⚠️ | `FDA.C.5.6.r is invalid for the Center specified in N.2.r.3` | Pre-regen; C.5.5a=123456 registry fix confirmed. C.5.6.r warning expected (cross-ref field present in T06) | Accepted |
| IND-T06-babe-test-reference.xml *(regen #3, UUID …9832bb8e68f2)* | SR-CASE-EXAMPLE-INDT06 | ci260430004305 | ✅ CA+AE ⚠️ | C.5.6.r boilerplate — no action | C.5.5a=123456 fix confirmed through regen #3; local msg 769817 | ✅ Accepted |
| IND-T07-followup-report.xml *(regen #3, UUID …efb3fcbdd36b)* | SR-CASE-EXAMPLE-INDT07 | ci260430004355 | ✅ CA+AE ⚠️ | C.5.6.r boilerplate — no action | Follow-up report + C.1.9 version auto-derivation confirmed by FDA; local msg 769816 | ✅ Accepted |
| IND-T01 *(IND_May7 v5, UUID …99d4ab11f9fa)* | SR-CASE-20260506-V3-INDT01 | ci260507054727 | ✅ CA+AE ⚠️ | C.5.6.r warning — **channel-inherent, OID-independent** | OPEN-01 CLOSED 2026-05-09: warning fires regardless of OID | ✅ Accepted |
| IND-T02 *(IND_May7 v5, UUID …291d6a0daf34)* | SR-CASE-20260506-V3-INDT02 | ci260507054737 | ✅ CA+AE ⚠️ | C.5.6.r warning — channel-inherent | Confirms OID strip made no difference | ✅ Accepted |
| IND-T03 *(IND_May7 v5, UUID …7ad0e5ff1328)* | SR-CASE-20260506-V3-INDT03 | ci260507054746 | ✅ CA+AE ⚠️⚠️ | Two C.5.6.r warnings — OID swap …2.1.2.3→…2.1.2.1 made no difference | Warning triggered by element presence, not OID | ✅ Accepted |
| IND-T04 *(IND_May7 v5, UUID …0e7579e4d578)* | SR-CASE-20260506-V3-INDT04 | ci260507054756 | ✅ CA+AE ⚠️ | C.5.6.r warning — channel-inherent | Consistent with all others | ✅ Accepted |
| IND-T05 *(IND_May7 v5, UUID …de9f5d5ee8a8)* | SR-CASE-20260506-V3-INDT05 | ci260507054806 | ✅ CA+AE ⚠️ | C.5.6.r warning — channel-inherent | Consistent | ✅ Accepted |
| IND-T06 *(IND_May7 v5, UUID …f61e56edeb3f)* | SR-CASE-20260506-V3-INDT06 | ci260507054815 | ✅ CA+AE ⚠️ | C.5.6.r warning — channel-inherent | Consistent | ✅ Accepted |
| IND-T07 *(IND_May7 v5, UUID …3ecdb40e968a)* | SR-CASE-20260506-V3-INDT07 | ci260507054825 | ✅ CA+AE ⚠️ | C.5.6.r warning — channel-inherent | Consistent | ✅ Accepted |

### Regression Batch — May 31 (ZZFDATST_PREMKT / CDER_IND channel)

All 7 IND-T0x files rejected. Root causes: (1) case IDs `SR-CASE-20260506-V3-INDTxx` matched prior accepted May 7 submissions → duplicate rejection; (2) C.5.6.r element with OID `.2.3` was missing from generator output → R0026 rejection.

**Fix applied:** Added `<authorization>` block with `nullFlavor="NA"` OID `.2.3` to T01/T02/T04–T07; T03 cross-ref OIDs already correct. Case IDs changed to `SR-CASE-2026R2-INDTxx`.

### June 1 Batch — R0026 + xsi:type="CE" Fixes (ZZFDATST_PREMKT / CDER_IND channel)

| Package | Case ID | ACK File | Result | Warning | Notes | Status |
|---|---|---|---|---|---|---|
| IND-T01-susar-baseline.xml *(R0026 fix, SR-CASE-2026R2)* | SR-CASE-2026R2-INDT01 | ci260601050250 | ✅ **CA+AA** | None | "Report Loaded Successfully" — C.5.6.r nullFlavor=NA confirmed accepted | ✅ Accepted |
| IND-T02-susar-repeat.xml *(R0026 fix)* | SR-CASE-2026R2-INDT02 | ci260601050300 | ✅ **CA+AA** | None | "Report Loaded Successfully" | ✅ Accepted |
| IND-T03-cross-ref-ind.xml *(R0026 fix)* | SR-CASE-2026R2-INDT03 | ci260601050309 | ✅ **CA+AE** ⚠️⚠️ | Two C.5.6.r channel-inherent warnings | "Safety report loaded" with warnings — dual C.5.6.r warning expected for two cross-ref INDs; AE (not AR) confirms batch accepted | ✅ Accepted |
| IND-T04-no-study-registration.xml *(R0026 fix)* | SR-CASE-2026R2-INDT04 | ci260601050319 | ✅ **CA+AA** | None | "Report Loaded Successfully" | ✅ Accepted |
| IND-T05-fatal-seven-day.xml *(R0026 fix)* | SR-CASE-2026R2-INDT05 | ci260601050328 | ✅ **CA+AA** | None | "Report Loaded Successfully" | ✅ Accepted |
| IND-T06-babe-test-reference.xml *(R0026 fix)* | SR-CASE-2026R2-INDT06 | ci260601050338 | ✅ **CA+AA** | None | "Report Loaded Successfully" | ✅ Accepted |
| IND-T07-followup-report.xml *(R0026 fix)* | SR-CASE-2026R2-INDT07 | ci260601050347 | ✅ **CA+AA** | None | "Report Loaded Successfully" | ✅ Accepted |

---

## Recurring Issues

### ISSUE-001 — Wrong AS2 Channel for Postmarket Cases
**Affected:** TC-A01, TC-A05, TC-E03 (expected), TC-B02 (expected)  
**Error:** `File sent with AS2 header "CDER_IND" must have N.1.4 = "ZZFDATST_PREMKT" and N.2.r.3 = "CDER_IND"`  
**Root cause:** Postmarket XML files generated by the headless CLI (which correctly sets `ZZFDATST`/`CDER`) were uploaded through the ESG portal's **CDER_IND premarket channel** instead of the ZZFDATST postmarket channel. Likely a portal channel selection error after the IND sprint.  
**Fix:** No XML changes. In the ESG portal, select the **ZZFDATST** channel before uploading postmarket TC files.  
**Prevention:** Verify portal channel selector before each batch upload — ZZFDATST for postmarket (Scenario 7 / TC-*), ZZFDATST_PREMKT for IND/SUSAR (IND-T*).

### ISSUE-003 — Duplicate Message ID After Rejected Submission
**Affected:** TC-A05 (confirmed); TC-A01, TC-E03, TC-B02 at risk if re-submitted without regenerating  
**Error:** `Case Rejected as Message No and Sender Combination already Exists`  
**Root cause:** TC-A05 (`SR-CASE-EXAMPLE-TCA05`) was first submitted via the wrong CDER_IND channel (rejected — ci260429050943). When re-submitted through the correct ZZFDATST channel using the **same XML file** (same batch UUID `134c8711`, same `SR-CASE-EXAMPLE-TCA05` message ID), FDA's database detected the message ID + sender combination as already registered from the first attempt — even though that attempt was rejected.  
**Fix:** Regenerate the XML via the headless CLI (`npm run headless -- TC-A05-ethnicity-hispanic.json --out-dir ...`). This produces a new batch UUID and a fresh case ID (e.g. `CASE-YYYYMMDD-XXXX`), bypassing duplicate detection. Submit the fresh file via ZZFDATST.  
**Prevention:** Never re-submit the same XML file after a CR/AR. Always regenerate to get a fresh case ID and batch UUID.

### ISSUE-004 — ESG Portal-Level Administrative Decline (IND submissions)
**Affected:** ci260429052038 (IND-T02 — confirmed); ci260428001004 (IND-T05 early attempt — also declined)  
**Portal message:** "Your test submission was declined. Reason: please email AEMSESUB@fda.hhs.gov mailbox"  
**Root cause:** This is an **administrative/account-management layer** independent of the ICSR ACK. The CA+AE ICSR ACK confirms the XML content is technically correct. The portal decline indicates an account enrollment or authorization issue specific to IND submissions — possibly a missing pre-submission registration step, a DUNS number mismatch, or a required Letter of Authorization for IND test access.  
**Important distinction:** CA+AE ICSR ACKs for T01, T02, T05, T06 remain technically valid. This is a portal account issue, not an XML content issue.  
**Fix:** Email **AEMSESUB@fda.hhs.gov** referencing the affected submission IDs. Cc ESGNGSupport@fda.hhs.gov. Ask what enrollment or authorization step is required for IND test submissions on the ZZFDATST_PREMKT channel.  
**Prevention:** Complete IND account enrollment/authorization before submitting IND cases.

### ISSUE-006 — `FDA.C.1.7.1` Must Be Code=2 When Expedited Flag Is False (Closed)
**Affected:** TC-F03 v1 (ci260501170855), TC-G01 v1 (ci260501170913)  
**Error:** `If Combination Product Report Flag (FDA.C.1.12) is False or NI and Locally Expedited (C.1.7) is False or NI, value in Local Criteria Report Type (FDA.C.1.7.1) must be Non Expedited AE (Periodic).`  
**Root cause:** Generator hard-coded `localCriteriaReportType code="1"` (15-Day) regardless of whether the case was expedited. When `C.1.7=false`, FDA requires `C.1.7.1=code=2` (Non-Expedited AE Periodic).  
**Fix:** Generator patched in `xmlGeneratorService.ts` to emit `code="2" displayName="Non-Expedited AE"` when `isExpedited=false`.  
**Status:** ✅ Closed — TC-F03 v2 CA+AA (ci260501225648). TC-G01 v2 pending ACK3.

### ISSUE-007 — `C.5.4 researchStudy` Required When ICH Report Type = 2 (Closed)
**Affected:** TC-F04 v1 (ci260501170904)  
**Error:** `(1) C.5.4 must be provided when C.1.3 = 2 and N.2.r.3 = "CDER". (2) Study Type Where Reaction(s)/Event(s) Were Observed — C.5.4/A.2.3.3 must be provided when Type of report (C.1.3/A.1.4) = 2 (Report from studies).`  
**Root cause:** ICH Report Type `C.1.3=2` (Report from study) requires a co-present `C.5.4` Study Type block. The generator never emitted `researchStudy` for postmarket "from study" cases.  
**Fix:** Added minimal `<researchStudy classCode="CLNTRL" moodCode="EVN"><code code="1" displayName="Clinical trials" …/>` block. Added `studyReport?: boolean` field to `case.types.ts`.  
**Status:** ✅ Closed — TC-F04 v2 CA+AA (ci260501225657).

### ISSUE-008 — CDER 2.18 Requires All Five Reporter Address Fields C.3.4.1–C.3.4.5 (Closed — Scenario Invalid)
**Affected:** TC-H02 — three rounds: v1 ci260501170949, v2 ci260501225715, v3 ci260501235624  
**v1 Error:** `Data value required for tag C.3.4.5.` — asLocatedEntity missing entirely  
**v2 Error:** `SAXParseException: Invalid content was found starting with element '{urn:hl7-org:v3}asLocatedEntity'. One of '{urn:hl7-org:v3}representedOrganization' is expected.` — asLocatedEntity placed outside `<assignedPerson>` (schema element order violation)  
**v3 Error:** `Data value required for tag C.3.4.1 / C.3.4.2 / C.3.4.3 / C.3.4.4` — street, city, state, postal code all absent  
**Root cause:** CDER 2.18 requires ALL five reporter address sub-fields. A reporter with country-only (no street, city, state, or postal code) is not accepted. This is stricter than the E2B(R3) spec which treats most address fields as optional.  
**Fix:** Generator updated with: (1) validation error block in `generate()` that blocks submission if any C.3.4.1–C.3.4.4 is absent; (2) unconditional emission in `buildReporter()` so all five fields are always written. `faersEmpiricalPolicy.ts` updated with `REPORTER_ADDRESS_ALL_FIELDS_REQUIRED = true`.  
**Status:** ✅ Closed — scenario definitively not supported by FAERS 2.18. No resubmission.

### ISSUE-009 — TC-A03/TC-A04 Race Codes C41257/C41258 Not in FDA Value Set (Patched)
**Affected:** TC-A03 (ci260501170657), TC-A04 (ci260501170706)  
**Error:** `Element value not allowed for tag FDA.D.11.r.1`  
**Root cause:** The FDA-authoritative value set for race (tag `FDA.D.11.r.1`) is defined in `fda_e2b_r3_core_regional_data_elements_business_rules_v1.6/v1.7.xlsx`, row 169. The only allowed codes are:  
- `C16352` = African American  
- `C41259` = American Indian or Alaska Native  
- `C41260` = Asian  
- `C41219` = Native Hawaiian or Other Pacific Islander  
- `C41261` = White  
- nullFlavor: UNK, MSK, OTH, NA  

TC-A03 used `C41257` and TC-A04 used `C41258` — neither code appears in the FDA value set. These codes come from the NCI Thesaurus but are NOT the NCI codes that FDA chose for their restricted value set. This is not a platform gap — it is a test-case construction error (wrong NCI codes selected).  
**Important:** The ICH E2B(R3) IG does not define D.11 at all — race is an FDA regional extension only.  
**App enum status:** The `PatientRace` enum in `case.types.ts` is correct: `AmericanIndianOrAlaskaNative = 'C41259'`, `NativeHawaiianOrPacificIslander = 'C41219'` — both match the FDA value set.  
**Fix:** TC-A03 v2: `C41257 → C41259`. TC-A04 v2: `C41258 → C41219`. Files updated in `from_app/round2/` and promoted to `test/golden/postmarket/accepted/xml/`. Linter: 129 ✅ 0 ❌ both.  
**Status:** ✅ Closed — TC-A03 v2 ci260601150309 CA+AA; TC-A04 v2 ci260601150313 CA+AA (2026-06-01). TC-A02b v2 ci260601175051 CA+AA (2026-06-01) closes C16352 coverage. **All 5 FDA race codes proven_safe** as of 2026-06-01. Policy entries promoted in `faersEmpiricalPolicy.ts`.

### ISSUE-005 — Missing Autopsy Field When Date of Death Is Present (Historical — Closed)
**Affected:** IND-T05 early attempt (ci260428001004) — superseded by successful resubmission ci260429044612  
**Error:** `Since the element Date of Death - D.9.1/B.1.9.1b has a value, the element Was Autopsy Done? - D.9.3/B.1.9.3 must contain a value`  
**Root cause:** Fatal case XML emitted `dateOfDeath` (D.9.1) but omitted `autopsyDone` (D.9.3). FDA business rule 2.18 requires both to be present together.  
**Fix:** App was updated to include D.9.3 when `patient.death = true`. Confirmed resolved: T05 resubmission on 04-29 received CA+AE.  
**Status:** ✅ Closed.

### ISSUE-002 — C.5.6.r Informational Warning on All IND Submissions
**Affected:** T01, T05, T06 (all IND cases accepted so far)  
**Warning:** `FDA.C.5.6.r is invalid for the Center specified in N.2.r.3`  
**Root cause:** FDA's CDER_IND center does not use the C.5.6.r cross-referenced IND element. FDA issues this warning proactively even when the field is absent (T01, T05). When present (T06), it is a valid structural warning.  
**Fix:** No action needed. This is informational — CA+AE is still granted.  
**Prevention:** None required; expect this warning on all future IND submissions.

---

## Summary Counts (as of 2026-06-01)

| Category | Unique Scenarios | ✅ Accepted (final) | ❌ Proven Rejected / Scenario Invalid | ⏳ Pending |
|---|---|---|---|---|
| Postmarket (TC-*) — portal Apr 23+29 | 4 | 4 CA+AA (A01, A05, B02, E03) | 0 | 0 |
| Postmarket (TC-*) — API May 1 Batch 1 | 27 submitted (19 unique new) | 19 CA+AA | 4 CR+AR (A03, A04 → wrong NCI codes, not platform gap; A06 patched; A01 → duplicate) + 3 CR+AR patched | 0 |
| Postmarket (TC-*) — API May 1 Batch 2 (v2 resubmits) | 4 | 2 CA+AA (F03, F04) | 1 scenario invalid (H02 v3) | 1 (G01 v2) |
| Postmarket (TC-*) — Jun 1 A06 fix | 1 | 1 CA+AA (A06 xsi:type="CE" fix) | 0 | 0 |
| IND/Premarket (IND-T*) — portal Apr 29–30 | 7 | 7 CA+AE | 0 | 0 |
| IND/Premarket (IND-T*) — API May 1 | 7 (re-submission of same 7) | 7 CA+AE confirmed via May 7 v5 | 0 | 0 |
| IND/Premarket (IND-T*) — Jun 1 R0026 fix | 7 | 7 CA+AA/AE (SR-CASE-2026R2-INDTxx) | 0 | 0 |
| **Postmarket total unique scenarios** | **30** | **29** (A03 v2 + A04 v2 confirmed 2026-06-01) | **1** scenario invalid (H02 — CDER requires full street address; no resubmit) | **0** |
| **IND total unique scenarios** | **7** | **7 ✅ API confirmed CA** | **0** | **0** |
