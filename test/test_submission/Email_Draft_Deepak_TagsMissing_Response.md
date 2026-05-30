# Draft Email — Response to Deepak's "Tags Missing" Feedback (Updated 2026-05-29)

**To:** aemsesub@fda.hhs.gov  
**CC:** (add your team as appropriate)  
**Subject:** Re: Post-Market File Tags Missing — Full Scenario Coverage Update (41 Scenarios, 7/9 FDA Scenarios)  
**Attachment:** FAERS_Scenario_Testing_Results_FDA_updated_2026-05-29.xlsx

---

Hi Deepak,

Thank you for your continued feedback. Following your "tags missing" review, we have now completed a comprehensive expansion of our test scenario library and can report 41 scenarios accepted across all five report types (post-market, pre-market IND, periodic/summary, follow-up, and nullification).

**Summary of actions taken since TC-M08:**

**Product data (G.k):** The mega-file series (TC-M07 through TC-M12) includes comprehensive product coverage: dual characterization roles (suspect/concomitant), UNII substance coding, full dosing regimen with lot number, pharmaceutical form (EDQM coded), route of administration (EDQM coded), cumulative dose to first reaction, gestation period at exposure, indication for use (MedDRA coded), combination product flag (C94031/C102835), and drug action taken/dechallenge/rechallenge.

**Device data (G.k.12.r):** TC-M08 and subsequent mega-files include device malfunction (C54026), device problem code (C54451), brand name, common device name, product code (FMF), manufacturer name and address, usage at time of incident, lot number, remedial action, device model number (G.k.12.r.7.2 — "Auto-Injector Pen Model A2"), and device serial number (G.k.12.r.7.3 — "SN-TESTDEV-2025-00841").

**Lab test data (F.r):** All mega-files carry both MedDRA (F.r.2.2) and LOINC (F.r.2.1) codes across three test results. Coded interpretation results (F.r.3.1), reference ranges, and result units are populated throughout.

**Patient data (D):** Full patient profile across all submissions: demographics, age, sex, weight, gestation at birth (D.2.2.1), race (D.2.2a/b), ethnicity, adverse reactions (E.i) with full seriousness matrix (E.i.3.2a–f), outcomes (E.i.7 including code=6 Unknown, confirmed valid per FDA FAERS 2.18), relevant medical history (D.7.1.r) including family history flag, surgical procedures (D.8.r), preexisting conditions (D.9), and parent/mother data (D.10).

**New scenarios completed since TC-M08:**

| File | SR-ID | ACK | Local # | Scenario |
|---|---|---|---|---|
| TC-M12 | SR-CASE-20260529-MEGA5v12 | CA+AA | 807564 | Final comprehensive mega-file (post-market, spontaneous) |
| IND-T08 | SR-CASE-20260530-V1-INDT08 | CA+AA | 807567 | Pre-market IND — spontaneous AE (C.1.3=1) with active IND |
| TC-F05 | SR-CASE-EXAMPLE-TCF05 | CA+AA | 807569 | Solicited ODCS — Individual patient use (C.5.4=2) |

**Current FDA scenario coverage (7 of 9 fully covered):**

| Scenario | Description | Status |
|---|---|---|
| 1 | Post-market spontaneous | ✅ COVERED |
| 2 | Solicited/ODCS (Individual patient use) | ✅ COVERED — TC-F05 |
| 3 | Aggregate/periodic summary | ⏳ Phase 2 (requires D.1=AGGREGATE + C.1.10.r linked cases) |
| 4 | Follow-up to initial report | ✅ COVERED |
| 5 | Pre-market IND spontaneous | ✅ COVERED — IND-T08 |
| 6 | Dual submission (postmarket + IND in same batch) | ⏳ Phase 2 (two-batch workflow from single case record) |
| 7 | Nullification/withdrawal | ✅ COVERED |
| 8 | Literature-sourced report | ✅ COVERED |
| 9 | Non-serious spontaneous | ✅ COVERED |

**Scenarios 3 and 6 — Phase 2 deferral rationale:**

- **Scenario 3 (Aggregate):** Requires `D.1.2=AGGREGATE` report type and linked case cross-references via `C.1.10.r`. Our current generator produces only individual ICSR reports. Aggregate/PSUR generation requires a separate batch construction workflow and is deferred to Phase 2.
- **Scenario 6 (Dual submission):** Requires a single adverse event case to generate two simultaneous reports — one to the post-market FAERS gateway and one to the pre-market IND gateway — within the same batch. This is a multi-gateway orchestration scenario deferred to Phase 2.

Please find the updated test scenario results spreadsheet attached (41 scenarios complete, 7/9 FDA scenarios covered). All submissions are on the ZZFDATST / ZZFDATST_PREMKT test gateways.

We believe all four categories from your original feedback (product, device, lab, patient) are now comprehensively addressed. Please let us know if you see any remaining gaps or have additional guidance before we proceed to production gateway submission.

Thank you,  
[Your Name]  
DeepQuence, Inc.

---
*Internal note: Attach FAERS_Scenario_Testing_Results_FDA_updated_2026-05-29.xlsx*
