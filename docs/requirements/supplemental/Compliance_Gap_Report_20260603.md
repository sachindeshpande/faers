# FDA E2B(R3) Proactive Compliance Gap Report
**Date:** 2026-06-03  
**Sources reviewed:** FDA Regional Implementation Guide (Aug 2024) · ICH E2B(R3) IG · Electronic Submission of IND Safety Reports · Business Rules v1.7 (all sheets) · FAERS2022 Scenario XMLs 1–7  
**Against:** `xmlGeneratorService.ts` current implementation

---

## Tier 1 — SUBMISSION-BLOCKING (causes CR+AR if triggered)

| # | Field / Rule | Source | What spec requires | What generator does | Fix |
|---|---|---|---|---|---|
| T1-01 | **C.2.r.5 Primary Source flag** | BRv1.7 | Exactly one reporter must carry `C.2.r.5 = 1` (Primary Source for Regulatory Purposes) | Never emitted; no `isPrimarySource` field on reporter | Add `isPrimarySource: boolean` to `CaseReporter`; emit observation per reporter; validate exactly one = true |
| T1-02 | **C.1.6.1.r.1 conditional** | BRv1.7 Rule R0009 | If `C.1.6.1 = true` (additional documents available), must populate `C.1.6.1.r.1` (documents held by sender) | `C.1.6.1` emitted but `C.1.6.1.r.1` never emitted | Add `documentsHeldBySender?: string` to `Case`; emit conditional block |
| T1-03 | **G.k.3.2 with G.k.3.1** | BRv1.7 + empirical | Country of Authorisation required whenever Authorization Number present | **Fixed 2026-06-03** — emitting `<author><territorialAuthority>` block defaulting to "US" | ✅ Done — add `authorizationCountry` to JSON fixtures for non-US |
| T1-04 | **G.k.9.i.2.r triplet for IND** | Empirical (RR5) | When `causalityAssessment code=39` present in PREMKT, must include `.2.r.1/.2/.3` (source/method/result) | **Fixed 2026-06-03** — `code=39` suppressed for `isPremarket=true` | ✅ Done |
| T1-05 | **N.1.4 / N.2.r.3 routing pair** | FDA Regional Guide | Postmarket: `ZZFDA` + `CDER`; IND: `ZZFDA_PREMKT` + `CDER_IND`; BABE: `ZZFDA_PREMKT` + `CDER_IND_EXEMPT_BA_BE` | Derived independently with no cross-validation | Add cross-field validator; enforce valid pairs |
| T1-06 | **C.1.3=2 requires C.5.4** | BRv1.7 | Study type mandatory when report type = Study | No pre-flight check | Add pre-generation validation |

---

## Tier 2 — DATA QUALITY / BUSINESS RULE VIOLATIONS (not necessarily blocking today but spec non-compliant)

| # | Field / Rule | Source | What spec requires | What generator does | Fix |
|---|---|---|---|---|---|
| T2-01 | **C.3.1 Sender Type** | BRv1.7 | Organizational category (1=Pharma, 7=Consumer); distinct from reporter credential | Uses `reporter.qualification` (physician/pharmacist code) — wrong field | Add `Case.senderType`; emit separate from reporter qualification |
| T2-02 | **N.2.r.1 = C.1.1 identity** | BRv1.7 | Message identifier must equal case safety report ID | UUID generated for message; `worldwideCaseId` used for case — may differ | Enforce equality at generation time |
| T2-03 | **MedDRA version hardcoded** | BRv1.7 | `codeSystemVersion` must match imported MedDRA release | `"25.0"` hardcoded in all reaction emissions | Query MedDRA repo for actual version; use dynamic value |
| T2-04 | **G.k.3.1 prefix format** | FDA Regional Guide | Prefix required: `NDA`/`ANDA`/`BLA` + number; unapproved Rx = `000000`; unapproved OTC = `999999` | Emits raw authorization number from drug record | Add prefix validation/formatting; document mapping |
| T2-05 | **C.1.9.1 follow-up linkage** | BRv1.7 | `false` explicitly forbidden; must be `true` with prior IDs or `nullFlavor="NI"` | Always hardcoded `nullFlavor="NI"` — correct for initial reports, but no support for `true` + prior ID list | Add `priorCaseIds` to `Case` model for follow-up reports |
| T2-06 | **F.r Test Results section** | BRv1.7 / Scenario 6 | Repeating structured lab results (`F.r.1` through `F.r.7`) | Not emitted by default generator path (covered in mega-file XMLs only) | Add `CaseTestResult` model; wire into main generator |
| T2-07 | **D.7.1.r Structured medical history** | BRv1.7 | Repeating coded medical history observations (MedDRA + date) | Only narrative text `D.7.2` and concomitant flag `D.7.3` emitted | Add `CaseMedicalHistoryItem`; emit structured observations |
| T2-08 | **FDA.D.12 ethnicity cardinality** | FDA Regional Guide | Maximum ONE ethnicity observation per patient | Not validated; UI could allow multiple | Add max-1 validation on ethnicity observations |
| T2-09 | **D.1 patient name null flavor rules** | FDA Regional Guide | Privacy=`MSK`; unknown=`NI`/`ASKU`; malfunction-only=`NA`; aggregate=`AGGREGATE` | No conditional logic; plain name always emitted | Add decision tree based on report context |

---

## Tier 3 — MISSING OPTIONAL SECTIONS (spec-compliant optional but gaps vs FDA scenarios)

| # | Field / Section | Source | FDA Scenario has | Generator | Notes |
|---|---|---|---|---|---|
| T3-01 | **G.k.2.3.r Ingredient / UNII** | Scenario 1/2/6 | `<ingredient classCode="ACTI">` with substance name + UNII code + strength | Only in mega-file path; not in baseline generator | Add to standard `buildDrug` when data available |
| T3-02 | **G.k.12.r Device component hierarchy** | Scenario 2/7 | `<part classCode="PART"><partProduct classCode="DEV">` with malfunction, problem codes, brand name | Only in mega-file path | Confirm TC-M series coverage; wire into baseline generator for combo products |
| T3-03 | **H.2 Reporter comments** | Scenario 6 | `H.2` reporter narrative in `causalityAssessment` | Not emitted | Low priority; add as optional field |
| T3-04 | **H.4 Sender comments** | Scenario 6 | `H.4` sender narrative | Not emitted in baseline cases | Wire `case.senderComments` if populated |
| T3-05 | **E.i.1.1a Native language reaction** | FDA Regional Guide | Non-English reaction text in native language field | Not emitted | Low priority for US submissions |
| T3-06 | **C.1.11.x Amendment / nullification** | BRv1.7 | Required for nullification reports | Not implemented | Add report amendment model |
| T3-07 | **Age code system** | Scenario 1 | Uses ICH code `code="3"` on OID `…1.1.19` for age | Uses NCI `C25150` on `…3.26.1.1` | Both accepted empirically; verify against business rules |

---

## Tier 4 — IND-SPECIFIC GAPS (premarket channel)

| # | Field / Rule | Source | What's required | Status |
|---|---|---|---|---|
| T4-01 | **G.k.9.i suppression** | Empirical (RR5) + FDA guidance | FDA guidance silent on whether code=39 must be suppressed or populated | **Suppressed** (isPremarket=true) — empirically correct, guidance ambiguous |
| T4-02 | **7-day vs 15-day IND timing** | IND Safety Reports guidance | 21 CFR 312.32(c)(1) governs; guidance defers to separate CFR document | Not implemented | Obtain CFR rules; add timing logic |
| T4-03 | **IND aggregate reports** | IND guidance §2.1.7.1 | Aggregate ICSRs require structured drug characterisation, source, assessment result | Not in scope (Phase 2) | Track as Phase 2 requirement |
| T4-04 | **Follow-up case ID continuity** | IND guidance §2.1.6 | Follow-up must use identical case ID as initial; no attachment re-submission | Case ID preserved in JSON fixtures | Validate at submit time; add attachment de-dup |

---

## What is already confirmed correct (empirically proven CA+AA)

- New drug organizer format: `code=4` on OID `…1.20` ✅
- `substanceAdministration/id` root `…3.19` with sequential extension ✅
- G.k.1 via `causalityAssessment code=20` ✅
- G.k.3.2 country of authorisation (defaults to `US`) ✅
- G.k.9.i via `causalityAssessment code=39` — postmarket only ✅
- All 5 FDA race codes proven safe (C41260/C41261/C41259/C41219/C16352) ✅
- Race codes C17998/C41257/C41258 blocked ✅
- Ethnicity `nullFlavor=NI` blocked ✅
- Reporter address all 5 sub-fields required ✅
- `C.5.6.r` warning channel-inherent for CDER_IND (CA+AE is correct) ✅
- `requiredIntervention nullFlavor="NI"` for premarket ✅
- G.k.3.2 required whenever G.k.3.1 present ✅

---

## Recommended fix order

**Do now (before production approval):**
1. T1-01 — C.2.r.5 primary source flag
2. T1-02 — C.1.6.1.r.1 conditional
3. T2-01 — C.3.1 sender type field
4. T2-03 — Dynamic MedDRA version

**Do before first production submission:**
5. T1-05 — N.1.4/N.2.r.3 routing cross-validation
6. T2-04 — G.k.3.1 prefix format enforcement
7. T2-06 — F.r test results in baseline path
8. T2-07 — D.7.1.r structured medical history

**Phase 2 roadmap:**
9. T2-05 — Follow-up prior case ID linkage
10. T3-06 — Amendment/nullification support
11. T4-02 — IND 7-day vs 15-day timing
12. T4-03 — IND aggregate reports
