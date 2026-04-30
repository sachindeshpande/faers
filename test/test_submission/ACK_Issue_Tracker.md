# FAERS ESG Test Submission — ACK Issue Tracker

**Last updated:** 2026-04-30 (ci260430004355 — IND-T07 regen #3 CA+AE — **ALL 11 CASES ACCEPTED** ✅)  
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

| Package | Case ID | ACK File | Result | Rejection / Warning | Potential Fix | Status |
|---|---|---|---|---|---|---|
| TC-A01-race-white.xml | SR-CASE-EXAMPLE-TCA01 | ci260429050800 | ❌ CR+AR | Submitted via CDER_IND — channel mismatch (ISSUE-001) | Regenerated (regen #4) + submitted via AERS | Superseded |
| TC-A01-race-white.xml *(regen #4, UUID …d1665431b0f0)* | SR-CASE-EXAMPLE-TCA01 | ci260429225353 | ✅ **CA+AA** | "Report Loaded Successfully" — **no warnings** | — | ✅ Accepted |
| TC-A05-ethnicity-hispanic.xml | SR-CASE-EXAMPLE-TCA05 | ci260429050943 (CDER_IND channel) | ❌ CR+AR | CDER_IND channel mismatch (ISSUE-001) | Regenerated (regen #4) + submitted via AERS | Superseded |
| TC-A05-ethnicity-hispanic.xml *(same batch 134c8711)* | SR-CASE-EXAMPLE-TCA05 | ci260429051614 (ZZFDATST channel) | ❌ CR+AR | Duplicate Message ID (ISSUE-003) | Regenerated (regen #4) + submitted via AERS | Superseded |
| TC-A05-ethnicity-hispanic.xml *(regen #4, UUID …605bd78f8bd6)* | SR-CASE-EXAMPLE-TCA05 | ci260429225534 | ✅ **CA+AA** | "Report Loaded Successfully" — **no warnings** | — | ✅ Accepted |
| TC-E03-patient-female.xml | SR-CASE-EXAMPLE-TCE03 | ci260429051846 | ❌ CR+AR | CDER_IND channel mismatch (ISSUE-001) | Regenerated (regen #4) + submitted via AERS | Superseded |
| TC-E03-patient-female.xml *(regen #4, UUID …5c06943de804)* | SR-CASE-EXAMPLE-TCE03 | ci260429225656 | ✅ **CA+AA** | "Report Loaded Successfully" — **no warnings** | — | ✅ Accepted |
| TC-B02-medhistory-narrative.xml | SR-CASE-EXAMPLE-TCB02 | ci260429051745 | ❌ CR+AR | CDER_IND channel mismatch (ISSUE-001) | Regenerated (regen #4) + submitted via AERS | Superseded |
| TC-B02-medhistory-narrative.xml *(regen #4, UUID …86a0a3097a90)* | SR-CASE-EXAMPLE-TCB02 | ci260429225614 | ✅ **CA+AA** | "Report Loaded Successfully" — **no warnings** | — | ✅ Accepted |

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

## Summary Counts

| Category | Unique Cases | ✅ Accepted (final) | ❌ Superseded/Duplicate events | ⏳ Pending |
|---|---|---|---|---|
| Postmarket (TC-*) | 4 | 4 (CA+AA, no warnings) | 5 (wrong channel × 4 + duplicate × 1) | 0 |
| IND/Premarket (IND-T*) | 7 | 7 (CA+AE, C.5.6.r warning only) | 2 (early T05 rejection + T04 duplicate) | 0 |
| **Total** | **11** | **11** | **7** | **0** |
