# Comprehensive Gap Analysis — Deepak's Email vs Current XML Package
**Date:** 2026-05-26  
**Package at time of review:** 36 test cases (32 postmarket, 8 IND premarket), FAERS_Scenario_Testing_Results_FDA_updated_2026-05-26.xlsx

---

## What Deepak Asked For

**Email 1 — April 24, 2026 (6:03 AM):**
> "We declined the production approval request and not the xml file. We saw many neg acks from production approval request. **Please send all the scenario testing results in an excel and we will review them before approving production access.**"

**Email 2 — April 24, 2026 (2:33 PM):**
> "Please see the below link. **Please also test the scenarios posted.** Note: the xml files are for reference only. **Please generate the same scenarios in your PV system and send them via gateway.**"
> Link: https://www.fda.gov/drugs/fda-adverse-event-monitoring-system-aems/fda-adverse-event-monitoring-system-aems-e2br3-standards

The FDA page's "Resources For You" links to the **E2B(R3) Reporting Scenarios PDF** (9 numbered scenarios). These are the scenarios Deepak expects to see tested.

---

## The 9 FDA Scenarios — Coverage Map

| # | FDA Scenario | Key Discriminators | Coverage | Evidence | Status |
|---|---|---|---|---|---|
| 1 | Premarket IND or BA/BE study | ZZFDA_PREMKT / CDER_IND, C.1.3=2, C.5.4=1, C.5.5a, FDA.G.k.10a* | IND-T01 through T07, TC-M02 | Multiple CA+AE ACKs | ✅ Covered (see Note A) |
| 2 | Solicited / Organized Data Collection | ZZFDA / CDER, C.1.3=2, C.5.4=2 or 3 | TC-F04 has C.5.4=1 — WRONG study type | ci260501225657 (CA+AA but C.5.4=1) | ⚠️ Partial — wrong C.5.4 |
| 3 | Premarket AGGREGATE report | ZZFDA_PREMKT, D.1=AGGREGATE, C.1.10.r linked cases | Not tested | — | ❌ Gap |
| 4 | Premarket cross-referenced INDs | FDA.C.5.6.r with list of INDs | IND-T03, TC-M02 | CA+AE ACKs | ✅ Covered |
| 5 | Premarket spontaneous (IND not marketed in US) | ZZFDA_PREMKT / CDER_IND, **C.1.3=1 (Spontaneous)** | All IND tests use C.1.3=2 | — | ❌ Gap |
| 6 | Dual submission — IND + NDA/BLA (postmarket study) | Two separate batches: ZZFDA_PREMKT AND ZZFDA for same case | Not tested | — | ❌ Gap |
| 7 | Standard postmarket spontaneous | ZZFDA / CDER, C.1.3=1, C.5.5a=empty | TC-A01 through TC-M07 (27 CA+AA + 4 documented CR+AR) | Multiple ACKs | ✅ Comprehensively covered |
| 8 | Premarket IND not marketed globally, AE outside US | ZZFDA_PREMKT, C.1.3=2, C.5.4=1, C.5.5a | IND-T01–T07 (same fields as Scenario 1) | CA+AE ACKs | ✅ Covered |
| 9 | Premarket cross-ref INDs, AE outside US | ZZFDA_PREMKT, FDA.C.5.6.r + C.5.5a parent | IND-T03 | CA+AE ACK | ✅ Covered |

**Score: 5/9 fully covered, 1/9 partial, 3/9 gap**

---

## Gap Details

### GAP 1: Scenario 2 — Solicited / ODCS (C.5.4 wrong value) [MINOR]

**What's required:** ZZFDA/CDER channel, C.1.3=2 (Report from study), **C.5.4=2 (Individual patient use) or C.5.4=3 (Other studies)**

**What we have:** TC-F04 (ICH report type — Report from study) uses C.5.4=1 (Clinical trials). This tests C.1.3=2 correctly but on the wrong study-type bucket for Scenario 2. C.5.4=1 on the postmarket channel aligns with Scenario 6 (Report 2 of the dual submission), not Scenario 2.

**Impact for production approval:** Medium — Deepak may notice that we haven't specifically demonstrated the solicited-report / registry pathway (C.5.4=2 "Individual patient use" is the most common category for registry and EPR-sourced expedited reports in commercial postmarket pharmacovigilance).

**Fix:** Add TC-F05 — same base as TC-F04 but with C.5.4=2 (Individual patient use). One JSON field change in the generator.

---

### GAP 2: Scenario 3 — Premarket AGGREGATE Report [MAJOR]

**What's required:** ZZFDA_PREMKT/CDER_IND, D.1=AGGREGATE, C.1.10.r = list of linked individual case IDs.

**What we have:** None. This has never been tested.

**Complexity:** High. An aggregate report requires previously submitted individual cases to exist in the system (for C.1.10.r to reference them). The D.1 patient name field is set to the literal string "AGGREGATE" rather than an actual patient identifier. This is an unusual ICSR variant that the generator likely does not support today.

**Impact for production approval:** Medium–High. Aggregate reporting is part of IND safety reporting obligations (e.g., NDA annual reports, IND SUSARs in aggregate). However, for a PV application focused on expedited individual case reporting, Deepak may accept a note explaining this is out of scope for Phase 1.

**Recommended approach:** Add a note to the spreadsheet explaining this scenario is deferred to Phase 2 (aggregate/periodic reporting module). Flag explicitly.

---

### GAP 3: Scenario 5 — Premarket Spontaneous IND (C.1.3=1 on PREMKT Channel) [MEDIUM]

**What's required:** ZZFDA_PREMKT/CDER_IND, **C.1.3=1 (Spontaneous)**, C.5.5a=IND Number. This applies when the drug has an IND but the AE was not from a study (spontaneous while in development, marketed outside US).

**What we have:** All 7 IND golden tests (IND-T01 through T07) + TC-M02 use C.1.3=2 (Report from study). No IND test exercises C.1.3=1 on the premarket channel.

**Impact for production approval:** Medium. C.1.3=1 on PREMKT is the correct path for certain expedited IND reports where the AE occurred outside a formal study context. Deepak's team may want to see this is handled.

**Fix:** Add IND-T08 — variant of IND-T01 baseline with C.1.3=1 (Spontaneous). One JSON field change if the generator supports it.

---

### GAP 4: Scenario 6 — Dual Submission (IND + NDA/BLA) [MAJOR]

**What's required:** Same case submitted TWICE — Report 1 to ZZFDA_PREMKT/CDER_IND (C.1.3=2, C.5.4=1, C.5.5a=IND) and Report 2 to ZZFDA/CDER (C.1.3=2, C.5.4=1) as a coordinated dual filing.

**What we have:** Nothing. We've submitted to PREMKT and to ZZFDA separately but never as a coordinated dual-submission for the same underlying case.

**Complexity:** High. This is an operational workflow issue (the PV system needs to generate two separate XML batches from one case record) not just an XML content issue. Both reports should share the same patient/case narrative but differ in the channel metadata.

**Impact for production approval:** High if the sponsor's drug is marketed (has both an IND for extensions AND an approved NDA/BLA). For a sponsor with only an IND, this may not apply. However, Deepak listed it as one of the 9 scenarios.

**Recommended approach:** Flag as "In Scope for Phase 2 — Dual Submission Workflow" in the spreadsheet. This requires generator-level changes beyond XML content.

---

## Note A: Scenario 1 Sub-Issues

Two sub-issues noted but not blocking (gateway accepted without complaint):

**A1. FDA.G.k.10a (BA/BE drug role) — not emitted in XML**
- IND-T06 JSON has `fdaAdditionalDrugInfo: "TEST"` / `"REFERENCE"` / `"NA"` but the generator does not appear to emit the corresponding XML element `FDA.G.k.10a`.
- The IND-T06 ACK (CA+AE) shows no warning for missing FDA.G.k.10a — gateway does not enforce it.
- Status: Low priority. Document in spreadsheet as "FDA.G.k.10a not emitted; gateway accepts".

**A2. IND-T06 uses CDER_IND instead of CDER_IND_EXEMPT_BA_BE**
- Scenario 1 lists `CDER_IND_EXEMPT_BA_BE` as the correct N.2.r.3 value for BA/BE studies.
- IND-T06 routed to `CDER_IND` (same as the IND clinical trial tests) and was accepted CA+AE.
- Status: Low priority routing variant — document as known. If Deepak wants CDER_IND_EXEMPT_BA_BE explicitly tested, add IND-T08.

---

## Spreadsheet Gaps

**Gap 5: No FDA Scenario mapping tab**
The current `FAERS_Scenario_Testing_Results_FDA_updated_2026-05-26.xlsx` organizes by DeepQuence TC IDs. Deepak's team will need to map our 36 TCs to his 9 scenarios. A "FDA Scenario Coverage" tab is needed.

**Gap 6: Excel has not been sent**
The April 24 directive said to send the Excel for production approval review. The most recent version (2026-05-26, now with TC-M07) has not yet been sent. This is the primary blocking item for production approval.

---

## Known Content Issues (Not Blocking)

| Issue | Field | Current State | Spec Says | Gateway Behavior | Priority |
|---|---|---|---|---|---|
| E.i.3.2 = false | E.i.3.2a–f | false in TC-M01–M07 base | true or nullFlavor="NI" | Accepted (CA+AA/AE) | Low — correctness only |
| FDA.G.k.10a not emitted | IND-T06 | Not in XML | Should be 1/2/NA for BA/BE | No warning in ACK | Low |
| IND-T06 N.2.r.3 | IND-T06 | CDER_IND | CDER_IND_EXEMPT_BA_BE for BA/BE | Accepted CA+AE | Low |

---

## Priority Action List

| Priority | Action | Effort | Blocks Production? |
|---|---|---|---|
| 🔴 CRITICAL | Send FAERS_Scenario_Testing_Results_FDA_updated_2026-05-26.xlsx to Deepak (aemsesub@fda.hhs.gov) | Immediate | YES |
| 🔴 CRITICAL | Add FDA Scenario Coverage tab to Excel before sending | 30 min | YES |
| 🟠 HIGH | TC-F05: Solicited/ODCS — C.5.4=2 on postmarket channel (close Scenario 2 gap) | 1 session | Likely reviewed |
| 🟠 HIGH | IND-T08: Premarket spontaneous IND — C.1.3=1 on PREMKT channel (close Scenario 5 gap) | 1 session | Likely reviewed |
| 🟡 MEDIUM | Scenario 3 (Aggregate) — Document as Phase 2 scope in spreadsheet | 30 min | No (with justification) |
| 🟡 MEDIUM | Scenario 6 (Dual submission) — Document as Phase 2 scope in spreadsheet | 30 min | No (with justification) |
| 🟢 LOW | Fix E.i.3.2 false → nullFlavor="NI" in base XML | 1 session | No |
| 🟢 LOW | IND-T06: Switch N.2.r.3 to CDER_IND_EXEMPT_BA_BE | 1 session | No |

---

## Bottom Line

**To satisfy Deepak's explicit directive and unblock production approval:**

1. Add FDA Scenario Coverage mapping tab to the Excel (maps our 36 TCs to his 9 scenarios with honest gap annotations for Scenarios 2, 3, 5, 6).
2. Send the Excel to aemsesub@fda.hhs.gov immediately.
3. Build TC-F05 (C.5.4=2) and IND-T08 (C.1.3=1/PREMKT) to close the two testable gaps.
4. Document Scenarios 3 and 6 as Phase 2 / workflow-level features with a written justification that they require aggregate report module and dual-batch workflow respectively.

The 27 CA+AA postmarket results + 8 CA+AE IND results are strong. The gap is not in volume but in scenario type coverage — specifically 2 missing routing variants (Scenario 2 and 5) and 2 complex workflow scenarios (3 and 6) that need either a test or a documented deferral.
