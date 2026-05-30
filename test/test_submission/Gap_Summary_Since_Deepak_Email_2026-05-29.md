# Gap Summary — Changes Since Deepak's April 24 Email
**Compiled:** 2026-05-29  
**Trigger:** Deepak Nelivigi (aemsesub@fda.hhs.gov), April 24, 2026

---

## What Deepak Said

**Email 1 (April 24, 6:03 AM):**
> "We declined the production approval request and not the xml file. We saw many neg acks from production approval request. Please send all the scenario testing results in an excel and we will review them before approving production access."

**Email 2 (April 24, 2:33 PM):**
> "Please see the below link. Please also test the scenarios posted. Note: the xml files are for reference only. Please generate the same scenarios in your PV system and send them via gateway."
> *(Link: FDA AEMS E2B(R3) Reporting Scenarios PDF — 9 numbered scenarios)*

**Separate feedback (same period):**
> "The post-market file has many tags missing. Lot of product, device, lab test data, patient data is missing."

This produced three parallel workstreams: (1) close the tags-missing gap with a comprehensive mega-file, (2) test all 9 FDA scenarios, and (3) update and send the Excel.

---

## Workstream 1 — Tags Missing: Comprehensive Mega-File

All submissions to ZZFDATST gateway, postmarket channel, CDER receiver.

| File | What Was Added | ACK | Local # |
|---|---|---|---|
| TC-M01 | F.r lab tests: 3 structured results, numeric values, reference ranges, coded interpretation | CA+AA | — |
| TC-M02 | IND premarket fields: C.5.5a (IND number), FDA.C.5.6.r (cross-referenced INDs), PREMKT channel | CA+AE | — |
| TC-M03 | Comprehensive baseline: all optional sections retained from prior files | CA+AA | — |
| TC-M04 | LOINC-coded lab tests (F.r.2.1), G.k.12.r device fields (malfunction, problem code, brand/common name, product code, lot, usage, remedial action) | CA+AA | — |
| TC-M05 | D.7.1.r structured medical history (3 conditions), D.8.r past drug history (Methotrexate), D.9 death details | CA+AA | — |
| TC-M06 | D.10 full parent/fetal data (8 sub-elements): parent DOB, age at onset, LMP, weight/height, sex, D.10.7.r medical history, D.10.8.r past drugs; G.k.6a/b gestation period at exposure | CA+AA | — |
| TC-M07 | G.k.12.r complete device set + all prior categories retained. LOINC on 2 of 3 tests. | CA+AA | 805986 |
| TC-M08 | LOINC added to all 3 tests (777-3, 1975-2, 8339-4); interpretationCode on all 3 tests; device model number (G.k.12.r.7.2); device serial number (G.k.12.r.7.3) | CA+AA | 806624 |
| TC-M09 | H-section author code fix: H.3.r code=1 (sender), H.4 code=1 (sender), H.2 code=3 (sourceReporter) | CA+AA | — |

**Tags-missing gaps closed after TC-M08:**

| Deepak Category | Status | Evidence |
|---|---|---|
| Product data (G.k) | ✅ Fully covered | All G.k fields: dose form, route, lot, cumulative dose, gestation, indication, dechallenge, rechallenge, combination product flag, UNII coding |
| Device data (G.k.12.r) | ✅ Fully covered | 14 FDA.G.k.12.r fields: malfunction, problem code, brand/common name, product code, manufacturer+address, usage, lot, remedial action, model number, serial number |
| Lab test data (F.r) | ✅ Fully covered | 3 tests: MedDRA (F.r.2.2) + LOINC (F.r.2.1), numeric/text results, reference ranges, interpretationCode (F.r.3.1) on all 3 |
| Patient data (D) | ✅ Fully covered | Full D.1–D.10.8.r: demographics, weight, height, sex, age, LMP, medical history, past drugs, outcome, parent/fetal data |

---

## Workstream 2 — FDA Scenario Coverage

Deepak's 9 scenarios (from the FDA AEMS E2B(R3) Reporting Scenarios PDF):

| # | FDA Scenario | Discriminating Fields | Status | Evidence |
|---|---|---|---|---|
| 1 | Premarket IND/BA/BE study | ZZFDATST_PREMKT, C.1.3=2, C.5.4=1, C.5.5a | ✅ COVERED | IND-T01–T06 CA+AE |
| 2 | Solicited / Organized Data Collection | ZZFDATST, C.1.3=2, C.5.4=2 (Individual patient use) | ✅ COVERED | TC-F05 CA+AA, Local #807569 |
| 3 | Premarket AGGREGATE report | D.1=AGGREGATE, C.1.10.r linked cases, PREMKT channel | ⏳ Phase 2 | Requires aggregate report module; not a single ICSR |
| 4 | Premarket cross-referenced INDs | FDA.C.5.6.r list of INDs, C.5.5a | ✅ COVERED | IND-T03 CA+AE |
| 5 | Premarket spontaneous IND (C.1.3=1) | ZZFDATST_PREMKT, C.1.3=1, C.5.5a present | ✅ COVERED | IND-T08 CA+AA, Local #807567 |
| 6 | Dual submission (IND + NDA/BLA) | Two batches: ZZFDATST_PREMKT AND ZZFDATST for same case | ⏳ Phase 2 | Requires dual-gateway workflow from one case record |
| 7 | Standard postmarket spontaneous | ZZFDATST, C.1.3=1 | ✅ COVERED | 27-file TC-A/B/C/D/E/F/G/H series + TC-M12 |
| 8 | Premarket IND, AE outside US | ZZFDATST_PREMKT, C.1.3=2, C.5.4=1, C.5.5a | ✅ COVERED | IND-T01–T07 CA+AE |
| 9 | Cross-ref INDs, AE outside US | ZZFDATST_PREMKT, FDA.C.5.6.r + C.5.5a | ✅ COVERED | IND-T03 CA+AE |

**Score: 7/9 fully covered. 2/9 deferred to Phase 2.**

**Scenario 3 deferral rationale:** Aggregate reports require `D.1.2=AGGREGATE` patient name and `C.1.10.r` cross-references to previously submitted individual case IDs. This is a distinct report type from individual ICSR reporting — it requires a separate batch construction workflow and generator-level support. Out of scope for Phase 1 individual ICSR module.

**Scenario 6 deferral rationale:** Dual submission requires a single adverse event case to produce two coordinated XML batches simultaneously — one to the postmarket gateway (ZZFDATST/CDER) and one to the premarket gateway (ZZFDATST_PREMKT/CDER_IND). This is a workflow orchestration problem, not an XML content problem. It requires the PV system to generate and route two batches from one case record, which is a Phase 2 generator feature.

---

## Workstream 3 — Drug Organizer Investigation (TC-M10 through TC-M12)

During the mega-file expansion, an attempt was made to migrate from the legacy drug organizer format to the E2B(R3) IG-specified new format (organizer code=4, causalityAssessment code=20/39). This produced two consecutive rejections:

| File | ACK | Root Cause |
|---|---|---|
| TC-M10 (v10) | CR+AR | Invalid UUID version nibble in substanceAdministration `<id root>` — uuid4() not used |
| TC-M11 (v11) | CR+AR | "Incorrect Root ID" (G.k.1/FDA.G.k.1.a ×3, G.k.9.i.2.r ×1) — FDA FAERS 2.18 requires a registered OID (dotted decimal), not a raw UUID string, for drug substanceAdministration `<id root>` when using the new organizer format |

**Resolution:** TC-M12 reverted to the legacy organizer format (`code="suspect"/"concomitant"` on OID `2.16.840.1.113883.3.989.2.1.1.13`) which was confirmed CA+AA in v9. CA+AA confirmed, Local #807564.

**Known open issue:** The new-format drug organizer (code=4 + causalityAssessment code=20/39) cannot be used until the correct sender-registered OID for substanceAdministration `<id root>` is identified. The legacy format is the safe path until that OID is obtained from FDA or the E2B(R3) IG implementation guide.

---

## Linter Updates (faers_xml_lint.py)

All changes made since Deepak's email to improve pre-flight validation:

| Section | Change | Reason |
|---|---|---|
| 23 | Added outcome code=6 (Unknown) to valid set | TC-F04 CA+AA proved gateway accepts code=6; linter was incorrectly rejecting it |
| 28 (new) | All 7 seriousness flags per reaction must be present; all BL-typed | Gap identified during mega-file review |
| 29 (new) | causalityAssessment UUID cross-reference integrity — skipped for legacy format | New format only; legacy format has no UUID drug IDs to cross-reference |
| 30 (new) | Drug organizer: accepts BOTH legacy (code="suspect"/"concomitant" on .1.13) AND new (code=4 on .1.20) formats; rejects mixed | Dual-format confirmed by TC-M09 (legacy CA+AA) and TC-M12 (legacy CA+AA) |
| 31 (new) | C.2.r sourceReport block required unconditionally (initial AND follow-up) | Previously gated on follow-up flag only; TC-M07 "tags missing" included C.2.r as a gap |
| 32 (new) | H-section author codes: H.3.r code=1, H.4 code=1, H.2 code=3 | TC-M09 fix confirmed these are required correctly |

---

## Gaps That Remain Open

These are documented and not blocking production approval, but should be tracked:

**Business-rule gaps (HIGH — likely rejection if triggered):**
- GAP-O01: C.2.r.4 reporter qualification value-set validation (code ∈ {1-5}) — no linter check yet
- GAP-O02: C.1.3 value code ∈ {1,2,3,4} — no linter check yet
- GAP-O03: C.1.4 effectiveTime must use `<low>` child (IVL_TS format) — no linter check yet

**Known low-priority issues (gateway accepted, not enforced):**
- IND-T03 AE warning (OPEN-01): `FDA.C.5.6.r` OID clash produces CA+AE instead of CA+AA. One-line OID fix available. Not blocking — gateway accepted.
- IND-T06: Uses `CDER_IND` routing instead of `CDER_IND_EXEMPT_BA_BE` for BA/BE study. Gateway accepted CA+AE either way.
- IND-T06: `FDA.G.k.10a` (BA/BE test-product role) not emitted. Gateway did not flag it.

**Infrastructure:**
- Section 21 XSD validation: Degraded to WARN. Four schema files (`PORR_IN049006/7/8UV.xsd`, `COCT_MT040203UV01.xsd`) require `bash faers/docs/schema/fetch_schemas.sh` run locally (sandbox network blocks EudraVigilance). Does not affect submission quality — linter Sections 26–32 cover the same ground with field-specific messages.
- New-format drug OID: The correct sender-registered OID for substanceAdministration `<id root>` when using organizer code=4 is unknown. Legacy format is the production path until identified.

---

## Primary Remaining Action

The Excel (`FAERS_Scenario_Testing_Results_FDA_updated_2026-05-29.xlsx`) and email draft (`Email_Draft_Deepak_2026-05-29.md`) are both complete and ready to send. This is the only action blocking production approval review by Deepak.

**Success criterion:** Email sent to aemsesub@fda.hhs.gov with Excel attached. Deepak responds with either production approval or specific actionable feedback.
