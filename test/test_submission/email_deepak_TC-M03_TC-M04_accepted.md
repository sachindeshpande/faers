# Email to Deepak — TC-M03 + TC-M04 Accepted (Mega File Campaign Complete)

**To:** aemsesub@fda.hhs.gov
**From:** sachindeshpande@deepquence.com
**Subject:** RE: Mega File Campaign Update — TC-M03 and TC-M04 Accepted (DeepQuence, company_id 31537)
**Attachment:** FAERS_Scenario_Testing_Results_FDA_updated_2026-05-25.xlsx

---

Dear Deepak,

I wanted to share a quick update: we have now received CA+AA acceptances for both additional postmarket mega files (TC-M03 and TC-M04), completing our comprehensive optional E2B(R3) section coverage.

## TC-M03 — Dual-Reaction Seriousness Matrix Mega File

| Field | Value |
|---|---|
| Channel | ZZFDATST / CDER |
| Result | **CA+AA** |
| Acceptance Date | May 19, 2026 |
| safetyReportID | SR-CASE-20260518-MEGA |
| Local Report # | 882474 |
| Core ID | ci260519222153.35169b836c834e598c9300839f897264 |

This case covers two simultaneous reactions (Nausea resolved; Hepatic failure fatal) with the full 6-criterion E.i.3.2 seriousness matrix (codes 34/21/33/35/12/26) encoded per reaction, dual-suspect dosing, and optional sections D.7.1.r, D.8.r, D.9, G.k.4.r, G.k.5, H.3.r, and H.5.r.

## TC-M04 — Comprehensive Postmarket Mega File (Lab Results + Combination Product)

| Field | Value |
|---|---|
| Channel | ZZFDATST / CDER |
| Result | **CA+AA** |
| Acceptance Date | May 25, 2026 |
| safetyReportID | SR-CASE-20260519-MEGA2 |
| Local Report # | 890060 |
| Core ID | ci260525042934.a4d960cd52da48a1abd717167fedae09 |

This case adds quantitative lab results (F.r: ALT 850 U/L, AST 760 U/L with reference ranges), combination product flag (C156384 = true), and the same full seriousness matrix and optional sections as TC-M03.

---

## Summary: Mega File Campaign (TC-M01 through TC-M04)

| Test Case | Coverage | Result | Local # |
|---|---|---|---|
| TC-M01 | All optional drug/authorization/attachment elements | CA+AA | — |
| TC-M02 | Premarket IND mega (C.5.5a, C.5.6.r, IND authorization) | CA+AE | — |
| TC-M03 | Dual-reaction E.i.3.2 seriousness matrix + optional patient sections | CA+AA | 882474 |
| TC-M04 | Lab results (F.r), combination product, dual-reaction seriousness | CA+AA | 890060 |

The updated scenario testing results (now 33 scenarios, all mega files included) are attached.

---

One finding worth noting from this campaign: the E2B(R3) seriousness criteria (E.i.3.2a–f) and requiredIntervention (FDA.E.i.3.2h) must be present for all reactions that carry a seriousness indicator, with `BL value="false"` when a criterion does not apply — omitting the elements causes a "Data value required" rejection by the FAERS 2.18 business rules, even though the FDA web validator at faers-validator.fda.gov flags `BL value="false"` as invalid for these fields. We wanted to flag this apparent inconsistency between the two validation systems in case it is useful for your documentation.

Please let us know if you need anything further in support of the production access review.

Best regards,
Sachin Deshpande
CEO, DeepQuence
sachindeshpande@deepquence.com
