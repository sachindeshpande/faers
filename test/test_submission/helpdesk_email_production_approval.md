# Production Approval Request — Email to Deepak Nelivigi

**To:** aemsesub@fda.hhs.gov
**From:** sachindeshpande@deepquence.com
**Subject:** RE: Mega File Complete — Production Access Request (DeepQuence, company_id 31537)
**Attachment:** FAERS_Scenario_Testing_Results_FDA_updated_2026-05-12.xlsx

---

Dear Deepak,

Thank you for confirming that a mega file with all E2B(R3) tags populated is required. We have now completed and submitted the mega file to ZZFDATST and received CA+AA. Please find the updated scenario testing results spreadsheet attached for your review.

## Summary

All 31 postmarket ICSR scenarios are now complete, including the mega file. In addition, we tested 7 premarket IND safety report scenarios.

| Category | Scenarios | Accepted | CR+AR (Data Points) | Pending |
|---|---|---|---|---|
| Postmarket ICSR (ZZFDATST / CDER) | 31 | 27 CA+AA | 4 | 0 |
| Premarket IND (ZZFDATST_PREMKT / CDER_IND) | 7 | 7 CA+AE | 0 | 0 |

The 4 CR+AR results are intentional data points confirming which coded values are rejected by CDER FAERS 2.18. We do not plan to submit these values in production.

## Mega File — Scenario 6 (TC-M01)

The mega file was submitted on May 12, 2026 and accepted with CA+AA (core ID: ci260512175821). The file was generated from our PV system and covers the following optional E2B(R3) element groups:

- **Drug authorization (G.k.3):** NDA authorization number with holder name and country of authorization
- **Drug dosing detail (G.k.4.r):** Route of administration (oral, NCI thesaurus coded), dose quantity (200 mg), pharmaceutical form (tablet, NCI coded), lot number
- **Drug ingredient (G.k.2.3.r):** Active ingredient with substance code (UNII), quantity (numerator/denominator), and ingredient substance name
- **Case documents (C.1.6.1):** B64-encoded document attachment (case summary)
- **Literature reference (C.4.r):** Bibliographic reference with free-text citation
- **Case structure:** 2 suspect drugs + 1 concomitant drug, 2 MedDRA-coded reactions, 3 MedDRA-coded indications, full reporter block with all 5 mandatory C.3.4 address sub-fields, race and ethnicity observations, D.7 medical history

## Coverage Against FDA AEMS Reference Scenarios

| FDA Reference Scenario | Coverage in Our System |
|---|---|
| Scenario 1 — Postmarket drug, no combination product, AE | Covered — baseline plus 26 field-variation scenarios (Groups A-H), all CA+AA |
| Scenario 2 — Postmarket, combination product, AE + Malfunction | Covered — TC-F02 (combination product indicator = true), CA+AA, core ID ci260501170846 |
| Scenario 3 — Premarket IND safety report | Covered — IND-T01 through IND-T07, all CA+AE, ZZFDATST_PREMKT / CDER_IND |
| Scenario 5-1/5-2/5-3 — IND-exempt BABE study reports | Covered — IND-T06 (BABE test reference), CA+AE, core ID ci260507054815 |
| Scenario 6 — Mega file (all optional E2B(R3) tags) | Covered — TC-M01, CA+AA, core ID ci260512175821, submitted May 12 2026 |

All scenarios were generated from our PV system (not from the FDA reference XML files) and submitted via the ESG NextGen API.

## Key Technical Findings

- Race codes C41257 (American Indian or Alaska Native) and C41258 (Native Hawaiian) are not accepted by CDER FAERS 2.18 — confirmed CR+AR.
- Patient ethnicity with nullFlavor=NI is a schema-level rejection — confirmed CR+AR.
- All five C.3.4 reporter address sub-fields (street, city, state, postal code, country) are mandatory — a reporter with country only is rejected. Confirmed over a three-round submission campaign.
- All 7 IND/premarket scenarios accepted (CA+AE). The C.5.6.r informational warning appears on all IND submissions and is expected behavior for the CDER_IND channel.

## Account Details

| Field | Value |
|---|---|
| Company | DeepQuence |
| EIN | 33-4818134 |
| Contact | Sachin Deshpande, CEO |
| Email | sachindeshpande@deepquence.com |
| company_id | 31537 |
| user_id | 33703 |
| Non-Repudiation Letter | Company-Wide, uploaded 03/18/2026 |

We are requesting production access (ZZFDA / CDER channel) for postmarket ICSR submissions. Please let us know if you need any additional information before granting approval.

Thank you again for your guidance throughout this process.

Best regards,
Sachin Deshpande
CEO, DeepQuence
sachindeshpande@deepquence.com
