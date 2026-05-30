# FAERS XML Linter — Gap Registry
**Project:** DeepQuence FAERS AERS TEST Submission  
**Last updated:** 2026-05-29  
**Purpose:** Authoritative record of all schema/business-rule gaps identified during TC-M01 through TC-M12. Use this document to update workflow code, add linter sections, and brief reviewers.

---

## How to Read This Document

Each gap has:
- **Status** — `FIXED` (linter section added), `OPEN` (no linter check yet), `BY DESIGN` (known limitation with mitigation)
- **Linter Section** — which section covers it, or `—` if none
- **Severity** — `HIGH` (likely FDA rejection), `MEDIUM` (reviewer flag / silent wrong behaviour), `LOW` (cosmetic)
- **ACK Evidence** — which submission version produced the rejection that exposed this gap

---

## FIXED Gaps (linter section added)

| ID | Field | Description | Linter Section | ACK Evidence |
|----|-------|-------------|----------------|--------------|
| GAP-F01 | XML well-formedness | Malformed XML causes SAX parse exception at FDA gateway | Sec 0 | Multiple early versions |
| GAP-F02 | Root element + schemaLocation | Wrong root or external URL in schemaLocation | Sec 1 | v12–v14 |
| GAP-F03 | MCCI child order | id/creationTime/responseModeCode/interactionId/name/PORR/receiver/sender sequence | Sec 2 | v21–v22 |
| GAP-F04 | Batch UUID non-empty | Empty batch extension = gateway parse fail | Sec 3 | — |
| GAP-F05 | Wrapper name displayName=ichicsr | Wrong type-of-batch code | Sec 4 | — |
| GAP-F06 | PORR receiver = CDER/CDER_IND | Wrong receiver routes message to wrong center | Sec 6 | T06 IND sessions |
| GAP-F07 | investigationEvent child order | author as direct child of investigationEvent → SAX exception | Sec 7 | v35–v36 |
| GAP-F08 | subjectOf1 ordering | Reporter block must follow component+outboundRelationship | Sec 7 | v28–v29 |
| GAP-F09 | Reaction presence + effectiveTime | No reaction = no case; wrong effectiveTime type rejected | Sec 8 | Multiple |
| GAP-F10 | Race/ethnicity observations | Missing C17049/C16564 observations | Sec 9 | — |
| GAP-F11 | Drug indication CE values | code+codeSystem required on indication value | Sec 10 | — |
| GAP-F12 | C.3 reporter block structure | OID .1.7, assignedPerson, name parts, addr, telecom | Sec 11 | v29–v30 |
| GAP-F13 | D.7 medical history | historyText and concomitantTherapy indicator | Sec 12 | — |
| GAP-F14 | ICH report type presence | code=1 investigationCharacteristic | Sec 13 | — |
| GAP-F15 | C.1.7 expedited + reportType | code=23 BL present; reportType in {1,2,6} | Sec 14 | TC-M07 v5 |
| GAP-F16 | Uncoded CE values | CE elements missing code attribute | Sec 15 | — |
| GAP-F17 | Follow-up OID deduplication | Duplicate OID+code in relatedInvestigation → R0026 | Sec 16 | — |
| GAP-F18 | D.10 role[@classCode=PRS] placement | role must be inside player1, not floating | Sec 22 | — |
| GAP-F19 | E.i.7 outcome code value-set | code ∈ {1,2,3,4,5} on OID .1.1.11 | Sec 23 | TC-M07 v5 |
| GAP-F20 | F.r.3.1 interpretationCode order + values | code ∈ {1,2,3,4}; precedes referenceRange | Sec 24 | TC-M07 v5 |
| GAP-F21 | kindOfProduct subjectOf placement | subjectOf inside kindOfProduct → SAX exception | Sec 25 | TC-M07 v2–v3 |
| GAP-F22 | name qualifier on non-person elements | qualifier on TN (device/drug) → cvc-complex-type.3.2.2 | Sec 26 | TC-M08 v1 |
| GAP-F23 | id root — OID or RFC 4122 UUID | Invalid UUID version nibble → "Incorrect Root ID" | Sec 27 | TC-M10 v10 |
| GAP-F24 | Seriousness flags completeness | All 7 flags (codes 34,21,33,35,12,26,7) per reaction; BL-typed | Sec 28 | — (identified 2026-05-29) |
| GAP-F25 | causalityAssessment UUID cross-refs | code=20 productUseReference + code=39 adverseEffectReference must resolve | Sec 29 | — (identified 2026-05-29) |
| GAP-F26 | Drug organizer — dual format | FDA FAERS 2.18 accepts BOTH: (A) legacy code="suspect"/"concomitant" on .1.13, AND (B) code=4 on .1.20 + causalityAssessment code=20. Must not mix. Section 30 updated to accept both. | Sec 30 | TC-M11/M12 (v11 CR+AR → v12 reverts to legacy, which is accepted) |
| GAP-F27 | C.2.r sourceReport unconditional | Section 16 gated on is_followup=True, skipping initial reports | Sec 31 | TC-M07 "Tags Missing: C.2.r" |
| GAP-F28 | H-section author codes | H.3.r=code1/sender, H.4=code1/sender, H.2=code3/sourceReporter | Sec 32 | TC-M09 H.3.r fix |

---

## OPEN Gaps (no linter section yet)

### HIGH Severity — Likely Rejection

| ID | Field | E2B(R3) Tag | Description | Complexity |
|----|-------|------------|-------------|------------|
| GAP-O01 | C.2.r.4 reporter qual value-set | C.2.r.4 | qualification code ∈ {1-5} on OID `.3.989.2.1.1.6`; invalid code → "Element value not allowed" | Low |
| GAP-O02 | C.1.3 ICH report type value | C.1.3 | value CE code ∈ {1,2,3,4} on OID `.3.989.2.1.1.2`; missing value or wrong code rejected | Low |
| GAP-O03 | C.1.4 effectiveTime format | C.1.4 | investigationEvent effectiveTime must have `<low>` child (IVL_TS), not flat `value=""` | Low |
| GAP-O04 | causalityAssessment code=20 value-set | G.k.1 | value CE code ∈ {1=Suspect,2=Concomitant,3=Interacting} on OID `.3.989.2.1.1.13`; any other code rejected | Low |
| GAP-O05 | C.2.r.4 OID inside sourceReport block | C.2.r.4 | `asQualifiedEntity/code` in the SPRT sourceReport block must use OID `.3.989.2.1.1.6` | Medium |
| GAP-O06 | C.1.9 initialReport sender code | C.1.8.2 | `controlActEvent/author/assignedEntity/code[@code="1"]` on OID `.3.989.2.1.1.3` required in initialReport block | Low |

### MEDIUM Severity — Silent Wrong Behaviour / Reviewer Flag

| ID | Field | E2B(R3) Tag | Description | Complexity |
|----|-------|------------|-------------|------------|
| GAP-O07 | E.i.3.1 termHighlighted value-set | E.i.3.1 | code ∈ {1,2,3} on OID `.3.989.2.1.1.10`; code=3="No but SERIOUS" commonly used | Low |
| GAP-O08 | C.1.7 / C.1.7.1 conditional | C.1.7+C.1.7.1 | If C.1.7=false → reportType must be code=2; mismatch violates Business Rule R0027 | Low |
| GAP-O09 | Drug name in kindOfProduct | G.k.2.2 | `kindOfProduct/name` must be present for every drug; missing → G.k.2.2 empty | Low |
| GAP-O10 | G.k.8 Action Taken value-set | G.k.8 | code ∈ {0,1,2,3,4,5,6} on OID `.3.989.2.1.1.15` | Low |
| GAP-O11 | Dechallenge value-set | G.k.9.i | code ∈ {1,2,3,4} on OID `.3.989.2.1.1.16`; 4=NA | Low |
| GAP-O12 | Rechallenge value-set | G.k.9.ii | code ∈ {1,2,3,4} on OID `.3.989.2.1.1.17` | Low |
| GAP-O13 | H.5.r case summary author | H.5.r | author code=2 (reporter) on OID `.3.989.2.1.1.21` | Low |
| GAP-O14 | Drug organizer placement | G.k | drug organizers must be inside `primaryRole/subjectOf2`, not floating | Medium |
| GAP-O15 | processingCode code="P" | N.2.r | `<processingCode code="P"/>` required in PORR block | Low |
| GAP-O16 | acceptAckCode code="AL" | N.2.r | `<acceptAckCode code="AL"/>` required; controls whether gateway sends ACK | Low |
| GAP-O17 | C.1.3 value codeSystem | C.1.3 | value element codeSystem must be `.3.989.2.1.1.2`, not `.3.989.2.1.1.23` (wrong-OID copy) | Low |
| GAP-O18 | causalityAssessment code=39 structure | G.k.9.i.2 | code=39 must have BOTH subject1 (adverseEffect) and subject2 (product); partial block silently fails | Low |
| GAP-O19 | Every drug UUID has code=20 block | G.k.1 | each drug substanceAdministration UUID must have ≥1 interventionCharacterization block | Medium |
| GAP-O20 | causalityAssessment code=20 no subject1 | G.k.1 | code=20 must NOT contain subject1 (only subject2); having both is a schema violation | Low |

### LOW Severity — Format / Completeness

| ID | Field | E2B(R3) Tag | Description | Complexity |
|----|-------|------------|-------------|------------|
| GAP-O21 | Batch creationTime UTC offset | N.1.5 | creationTime value must include UTC offset (YYYYMMDDHHMMSS±HHMM); bare date normalised by gateway but non-compliant | Low |
| GAP-O22 | responseModeCode code="D" | N.1 | content validated (not just presence); all scenarios use D | Low |
| GAP-O23 | interactionId@extension values | N.1/N.2 | wrapper must be "MCCI_IN200100UV01"; PORR must be "PORR_IN049016UV" | Low |
| GAP-O24 | statusCode code="active" | investigationEvent | `<statusCode code="active"/>` must be present; missing causes gateway parse fail | Low |
| GAP-O25 | Patient name (D.1) | D.1 | `player1/name` (initials) must be present | Low |
| GAP-O26 | administrativeGenderCode | D.5 | codeSystem=`1.0.5218`, code ∈ {1=Male, 2=Female, 0=Unknown} | Low |
| GAP-O27 | PORR id extension format | N.2.r.1 | extension should be UUID or controlled string; spaces cause gateway parsing issues | Low |

---

## BY DESIGN Limitations

| ID | Description | Mitigation |
|----|-------------|-----------|
| GAP-D01 | Section 21 XSD validation permanently WARN | Run `bash faers/docs/schema/fetch_schemas.sh` locally to download 4 missing multicacheschemas files (COCT_MT040203UV01.xsd, PORR_IN049006/7/8UV.xsd). Sandbox network allowlist blocks EudraVigilance. Once downloaded, Section 21 activates full II data-type regex + element-order checks. |
| GAP-D02 | PORR_IN049016UV.xsd is an HTML stub (silent mis-download) | Replace by running fetch_schemas.sh locally. Do not re-download in sandbox. |
| GAP-D03 | Section 21, when active, would make Sections 26, 27 partially redundant | Keep Sections 26/27/28-32 regardless — they produce cleaner, field-specific error messages than XSD parse errors. |
| GAP-D04 | No live FDA API validation before submission | By design — sandbox network allowlist blocks ESG NextGen API. Linter is the pre-flight check. |

---

## Gaps Identified by Submission Failure — Chronological

| Submission | Version | ACK | Root Cause | Gap ID | Fix Applied |
|-----------|---------|-----|-----------|--------|-------------|
| TC-M07 | v1–v4 | CR+AR | Tags Missing (C.2.r, F.r.2.1, H.2) | GAP-F27 | Added C.2.r reporter block (TC-M08) |
| TC-M07 | v5 | CR+AR | F.r.3.1 interpretationCode code=5 not in FDA value set | GAP-F20 | Added Sec 24 + fixed to code=1/3/1 |
| TC-M08 | v1 | CR+AR | name qualifier="MODEL" on device name → cvc-complex-type.3.2.2 | GAP-F22 | Added Sec 26 + removed qualifier |
| TC-M09 | — | CA+AA | H.3.r author displayName="primaryReporter" | GAP-F28 | Fixed to "sender" in TC-M09 patch |
| TC-M10 | v10 | CR+AR | Invalid UUID version nibble in substanceAdministration id roots | GAP-F23 | Added Sec 27 + regenerated with uuid4() |
| TC-M11 | v11 | CR+AR | "Incorrect Root ID" for G.k.1/FDA.G.k.1.a (×3) + G.k.9.i.2.r (×1) — substanceAdministration `<id root="uuid"/>` elements require OID-format root, not raw UUID, when using the new code=4 + causalityAssessment code=20/39 format | GAP-F26 (updated) | v12 reverts to legacy format (code="suspect"/"concomitant" on .1.13) which was CA+AA in v9 |
| TC-M12 | v12 | **CA+AA** | Reverted to legacy organizer codes (suspect/concomitant on .1.1.13) — v9 pattern. No substanceAdministration UUIDs, no causalityAssessment code=20/39. Local #807564. | GAP-F26 | Legacy format confirmed working. New format (code=4 + causalityAssessment) requires proper OID for drug ids — deferred. |

---

## Workflow Code Update Checklist

When updating the XML generation workflow code, ensure the following are enforced at generation time (not just linter time):

### Must be generated correctly

- [ ] `uuid.uuid4()` (Python) or equivalent RFC 4122 v4 generator for ALL `<id root>` values that are not registered OIDs. Never hand-craft UUID strings.
- [ ] Drug organizer format — choose ONE and use it consistently throughout the document:
  - **Legacy format** (FDA-confirmed working, v9 CA+AA): `organizer code="suspect"/"concomitant"/"interacting"/"notadministered" codeSystem="2.16.840.1.113883.3.989.2.1.1.13"`. No substanceAdministration `<id>` needed. No causalityAssessment code=20/39.
  - **New format** (E2B(R3) IG-correct, but requires OID-format drug IDs): `organizer code="4" codeSystem="2.16.840.1.113883.3.989.2.1.1.20"`. Each substanceAdministration needs `<id root="..."/>` using a REGISTERED OID (not raw UUID). Each drug needs causalityAssessment code=20. Suspect drugs also need code=39.
  - ⚠️ **KNOWN ISSUE**: Using raw UUID as substanceAdministration `<id root>` with the new format causes "Incorrect Root ID" rejections (G.k.1/FDA.G.k.1.a). The FDA 2.18 engine requires the root to be a valid registered OID (dotted decimal), not a UUID string, for this element. Until the correct sender-specific OID is identified, use the legacy format.
- [ ] All 7 seriousness flags present for every reaction: codes 34, 21, 33, 35, 12, 26 (OID `.3.989.2.1.1.19`) and code 7 (OID `.3.989.5.1.2.2.1.3`). All `xsi:type="BL"`.
- [ ] H.3.r (`observationEvent code=15`): author `code="1"` (sender) on OID `.3.989.2.1.1.21`.
- [ ] H.4 (sender comment, `code=10` inside `adverseEventAssessment`): author `code="1"`.
- [ ] H.2 (reporter comment, `code=10` outside `adverseEventAssessment`): author `code="3"` (sourceReporter).
- [ ] C.2.r sourceReport block always present (initial AND follow-up), with `priorityNumber`, qualification code ∈ {1-5} on OID `.3.989.2.1.1.6`.
- [ ] `processingCode code="P"` and `acceptAckCode code="AL"` in every PORR block.
- [ ] `statusCode code="active"` in investigationEvent.
- [ ] Batch/message `creationTime` with full UTC offset (not bare date).
- [ ] Drug name present in every `kindOfProduct`.
- [ ] Action Taken code ∈ {0,1,2,3,4,5,6} on OID `.3.989.2.1.1.15`.
- [ ] Dechallenge code ∈ {1,2,3,4} on OID `.3.989.2.1.1.16`.
- [ ] Rechallenge code ∈ {1,2,3,4} on OID `.3.989.2.1.1.17`.
- [ ] `termHighlightedByReporter` code ∈ {1,2,3} on OID `.3.989.2.1.1.10`.
- [ ] C.1.7 + C.1.7.1 conditional: if BL=false → reportType code=2.
- [ ] C.1.3 value codeSystem = `.3.989.2.1.1.2` (not the same OID as the code element).
- [ ] `investigationEvent/effectiveTime` must be `xsi:type="IVL_TS"` with `<low value="..."/>`.
- [ ] Patient `<name>` (initials) present in `player1`.
- [ ] `administrativeGenderCode` with codeSystem=`1.0.5218` and code ∈ {0,1,2}.

### Linter always before submission

Run `python3 faers/test/test_submission/faers_xml_lint.py [FILE]` and confirm **0 ❌ FAIL** before calling `submit_batch.py`. A WARN on Section 21 is acceptable until `fetch_schemas.sh` is run locally.

---

## Linter Section Index

| Section | Topic | Status |
|---------|-------|--------|
| 0 | Well-formedness | Active |
| 1 | Root element + schemaLocation | Active |
| 2 | MCCI wrapper child order | Active |
| 3 | Batch UUID non-empty | Active |
| 4 | Wrapper name displayName=ichicsr | Active |
| 5 | Wrapper receiver/sender (ZZFDATST, DUNS) | Active |
| 6 | PORR_IN049016UV presence + receiver=CDER | Active |
| 7 | investigationEvent ordering | Active |
| 8 | Reaction observations (effectiveTime, MedDRA) | Active |
| 9 | Patient race + ethnicity | Active |
| 10 | Drug indication CE values | Active |
| 11 | C.3 reporter block | Active |
| 12 | D.7 medical history | Active |
| 13 | ICH report type (code=1) | Active |
| 14 | C.1.7 expedited + reportType value-set | Active |
| 15 | Uncoded CE values | Active |
| 16 | Follow-up structure + OID dedup | Active (partial — initial report C.2.r now in Sec 31) |
| 17 | FDAAddDrugInformation absent for CDER_IND | Active |
| 18 | C.5.5a IND number test value | Active (IND track only) |
| 19 | Drug IND ↔ C.5.5a cross-consistency | Active (IND track only) |
| 20 | C.5.6.r cross-reported IND (R0026) | Active |
| 21 | XSD schema validation (best-effort) | Degraded — WARN until fetch_schemas.sh run locally |
| 22 | D.10 role[@classCode=PRS] placement | Active |
| 23 | E.i.7 outcome code value-set {1-5} | Active |
| 24 | F.r.3.1 interpretationCode order + value-set {1-4} | Active |
| 25 | kindOfProduct — subjectOf not direct child | Active |
| 26 | name qualifier on non-person elements | Active |
| 27 | id root — OID or RFC 4122 v1-5 UUID | Active |
| 28 | Seriousness flags — all 7 per reaction, BL-typed | Active (added 2026-05-29) |
| 29 | causalityAssessment UUID cross-reference integrity | Active (added 2026-05-29) |
| 30 | Drug organizer code=4 on OID .3.989.2.1.1.20 | Active (added 2026-05-29) |
| 31 | C.2.r sourceReport unconditional presence + structure | Active (added 2026-05-29) |
| 32 | H-section author codes (H.2/H.3.r/H.4) | Active (added 2026-05-29) |
