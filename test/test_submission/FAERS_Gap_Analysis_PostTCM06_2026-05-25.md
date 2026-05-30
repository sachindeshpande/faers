# FAERS E2B(R3) Gap Analysis — Post TC-M05 / TC-M06
**Date:** 2026-05-25  
**Scope:** Gaps remaining after 35 accepted scenarios (TC-M01 through TC-M06)  
**Method:** Systematic cross-reference of all 8 FDA reference scenarios, all submitted XMLs, and linter sections 0–23

---

## CATEGORY A — High-Risk Gaps (Present in FDA Reference Scenarios)

These fields appear in the FDA-supplied Scenario files (ground truth Deepak will compare against).

| # | Field | Description | Scenario | Risk | Suggested TC |
|---|-------|-------------|----------|------|-------------|
| A-1 | E.i.3.1 (code=37) | Term highlighted by reporter | Sc4, Sc5-1/2, Sc6 | **HIGH** | TC-M07 / TC-G05 |
| A-2 | G.k.10a.r (code=9) | FDA Additional Drug Information coded (Test/Reference drug) | Sc5-1/2/3 | **HIGH** | TC-I01 (IND-exempt BA/BE) |
| A-3 | D.1.1.1–4 | Patient medical record numbers (GP, Specialist, Hospital, Investigation) | Sc6 | **HIGH** | TC-E04 |
| A-4 | C.2.r | Multiple primary reporters (Sc6 has 4 subjectOf1 blocks) | Sc6 | **HIGH** | TC-C03 |
| A-5 | C.1.9.1.r | Other case identifiers in previous transmissions (foreign case IDs) | Sc6 | **HIGH** | TC-F05 |
| A-6 | D.7.1.r.6 (code=38) | Family history flag on medical history entry | Sc6 | **HIGH** | TC-M07 / TC-B03 |
| A-7 | G.k.2.5 (code=6) | Investigational product blinded flag | Sc6 | **HIGH** | TC-D07 |
| A-8 | G.k.4.r.11.1/2a | Parent route of administration (maternal case — same scenario as TC-M06) | Sc6 | **HIGH** | TC-M07 |
| A-9 | H.2 | Reporter's comments (author code=3=sourceReporter, distinct from H.4 sender code=1) | Sc6 | **HIGH** | TC-H04 |
| A-10 | C.2.r.5 (code=24) | Medical confirmation by health professional flag | Sc6 | **MEDIUM** | TC-C03 (combine) |
| A-11 | D.10.8.r | Parent's relevant past drug history (substanceAdministration in D.10 PRS role) | Sc6 | **HIGH** | TC-M07 |
| A-12 | G.k.10.r (code=2) | Additional information on drug — free text (distinct from G.k.10.1 specialized product) | Sc6 | **MEDIUM** | TC-M07 |
| A-13 | G.k.9.i.3.2a/b | Time interval from last dose to reaction start (number + unit) | Sc6 | **MEDIUM** | TC-D08 |
| A-14 | G.k.2.4 | Country where drug was obtained | Sc6 | **MEDIUM** | TC-M07 |
| A-15 | D.9.2.r.2 | Reported cause of death — free text companion to D.9.2.r.1b coded field | Sc6 | **MEDIUM** | TC-M07 |

---

## CATEGORY B — Medium-Risk Gaps (ICH Standard, Not Prominently in Scenarios)

| # | Field | Description | Risk | Suggested TC |
|---|-------|-------------|------|-------------|
| B-1 | C.3.1 codes 4, 5 | Reporter qualification: Regional pharmacovigilance center (4), Patient/consumer (5) | **MEDIUM** | TC-C04, TC-C05 |
| B-2 | G.k.9.i.2.r | Causality assessment: source / method / result (triple) — not populated in any accepted TC | **MEDIUM** | TC-D09 |
| B-3 | Aggregate IND (Sc4 pattern) | Aggregate premarket IND with C.5.4 study type + multiple linked cases | **MEDIUM** | TC-I02 |
| B-4 | E.i.1.1a/b | Reaction in native language + language code (non-English) | **MEDIUM** | TC-E05 |
| B-5 | IND-exempt BA/BE | Scenarios 5-1/2/3 — entirely separate submission track not covered | **MEDIUM** | TC-I01 |
| B-6 | F.r.3.1 | Coded lab test result (positive/negative/borderline/normal/abnormal via NCI code) | **MEDIUM** | Add to TC-M07 |
| B-7 | nullFlavor=MSK/ASKU | Masked or asked-but-unknown nullFlavor patterns (only UNK on birthTime tested) | **LOW** | TC-E06 |

---

## CATEGORY C — Linter Gaps (No Value-Set Validation)

Fields the linter currently accepts regardless of code value — only the FDA engine catches errors.

| # | Field | OID | Allowed Values | Linter Section | Priority |
|---|-------|-----|----------------|----------------|----------|
| C-1 | D.2.3 Age group (code=4) | `.3.989.2.1.1.19` | 1=Neonate, 2=Infant, 3=Child, 4=Adolescent, 5=Adult, 6=Elderly | Add Sec 24 | HIGH |
| C-2 | G.k.8 Action taken (C41341) | `.3.26.1.1` | 1=Withdrawn, 2=Dose reduced, 3=Dose increased, 4=Not changed, 5=NA, 6=Unknown | Add Sec 24 | MEDIUM |
| C-3 | C.3.1 Reporter qualification | `.3.989.2.1.1.7` | 1–5 | Sec 11 (OID only) | MEDIUM |
| C-4 | E.i.3.1 code=37 value | `.3.989.2.1.1.19` | CE coded — value type not validated | Add when TC created | MEDIUM |
| C-5 | F.r.3.1 coded lab result | NCI `.3.26.1.1` | NCI codes (C49498=Resolved, etc.) | Add Sec 25 | MEDIUM |
| C-6 | G.k.10.1 product category | NCI `.3.26.1.1` | C94031 → C102835 etc. | No check | LOW |

---

## CATEGORY D — Structural Patterns Not Yet Exercised

| # | Pattern | Description | Risk |
|---|---------|-------------|------|
| D-1 | D.10.8.r drug substanceAdministration | Parent's past drug history within the PRS role block | **HIGH** |
| D-2 | Multiple reactions × multiple drugs (full causality matrix) | G.k.9.i.2.r populated for each drug/reaction pair | **MEDIUM** |
| D-3 | C.1.9.1.r actual foreign case ID extensions | `outboundRelationship/relatedInvestigation/id[@root='.3.989.2.1.3.2']` with real values | **MEDIUM** |
| D-4 | G.k.2.5 blinded=false (open-label) vs blinded=true | Different routing logic | **MEDIUM** |
| D-5 | Aggregate periodic report linking to individual cases | `outboundRelationship` block per linked case | **MEDIUM** |
| D-6 | D.7.1.r.6 family history on existing medical history entries | BL obs code=38 | **HIGH** |

---

## KNOWN DIVERGENCE (Document, Don't Fix)

**TC-M05 autopsy cause encoding vs Scenario6:**  
TC-M05 encodes D.9.4.r as `obs code=33` (`autopsyCauseOfDeath`). Scenario6 encodes the same field as `obs code=8` (`causeOfDeath`) nested inside the autopsy obs (`code=5`). TC-M05 was accepted (CA+AA), so code=33 is valid in FAERS 2.18. This is a known encoding divergence from the reference file — document it but do not change, as our encoding was accepted.

---

## RECOMMENDED NEXT TC — TC-M07

A single "Scenario6 completion" mega case that addresses the highest-priority Category A gaps in one submission:

| Section | Fields |
|---------|--------|
| A-1 | E.i.3.1 termHighlightedByReporter (code=37) |
| A-6 | D.7.1.r.6 family history (code=38) on medical history |
| A-8 | G.k.4.r.11.1/2a parent route of administration |
| A-11 | D.10.8.r parent past drug history (extend TC-M06 case) |
| A-12 | G.k.10.r additional drug info free text (code=2) |
| A-14 | G.k.2.4 country where drug obtained |
| A-15 | D.9.2.r.2 reported cause of death free text |
| B-6 | F.r.3.1 coded lab result (NCI positive/negative code) |

**Plus linter additions:**
- Sec 24: Age group (D.2.3) value-set membership check {1–6}
- Sec 25: F.r.3.1 coded lab result OID/code validation
