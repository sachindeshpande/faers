Subject: TC-M07 Accepted (CA+AA) — Scenario6 Completion Fields + Linter Improvements (Sec 24/25)

Deepak,

TC-M07 (CASE-20260523-MEGA5_v6.xml) was accepted by ZZFDATST with CA+AA this morning. Local Report #805986. This brings the postmarket ZZFDATST score to 28 CA+AA / 4 CR+AR out of 32 scenarios (36 total including 8 IND).

**What TC-M07 tested**

TC-M07 extended TC-M06's accepted maternal/neonatal case (Local #805925) with six Scenario6 completion fields that had not yet been exercised:

| Stage | E2B Field | Value |
|---|---|---|
| E.i.3.1 | termHighlightedByReporter | code=1 (Yes) on R1; code=3 (No,Serious) on R2 |
| D.7.1.r.6 | familyHistory | true — maternal RA history |
| G.k.4.r.11 | parentRouteOfAdministration | C38299 (Subcutaneous, EDQM) |
| G.k.2.4 | countryOfObtaining | US |
| D.10.8.r | parentPastDrugHistory | mother's prior immunosuppressant |
| F.r.3.1 | interpretationCode (coded lab result) | code=1 (Positive) |

**CR+AR on v5 — F.r.3.1 value-set error**

v5 used `code="5"` (Abnormal) for F.r.3.1. The gateway rejected it with:

> "Safety report not loaded; Validated against 2.18 business rules; Rejections: 1: Element value not allowed for tag F.r.3.1."

The FDA Business Rules v1.7 Excel (now integrated into the project) confirms the allowed set is `{1=Positive, 2=Negative, 3=Borderline, 4=Inconclusive}` — code 5 does not exist in the spec.

v6 used `code="1"` (Positive) and was accepted immediately.

**Linter improvements applied this session**

*Section 24 — F.r.3.1 allowed code set*: Corrected from the assumed `{1–5}` to the spec-compliant `{1,2,3,4}`. The linter now explicitly names each allowed code and cites Business Rules v1.7 as its source. Any future use of code=5 will FAIL pre-submission.

*Section 25 — `subjectOf` inside `kindOfProduct`*: The previous check only fired when BOTH `<subjectOf>` AND `<part>` were siblings inside `<kindOfProduct>`. TC-M06 v3 had `<subjectOf>` next to `<ingredient>` (no `<part>`) and the check emitted "check skipped." The rewrite makes any `<subjectOf>` as a direct child of `<kindOfProduct>` an unconditional FAIL, regardless of what other siblings are present. Retroactively applied: v3 now correctly FAILs with a pointer to the Scenario6 XML reference.

**Note on E.i.3.2 = false**

The FDA Validator tool (faers-validator.fda.gov) flagged 12 rejections for `E.i.3.2a–f = false` values inherited from TC-M06 v3. Business Rules v1.7 specifies only `true` or `nullFlavor="NI"` are allowed. However, TC-M06 v3 and TC-M07 v6 were both accepted CA+AA by the gateway with `false` present. The validator and the gateway do not share the same enforcement engine. Correcting `false → nullFlavor="NI"` in the base XML is a spec-compliance fix (not a blocking issue) and is queued as a separate task.

**Files updated**
- `CASE-20260523-MEGA5_v6.xml` — accepted submission (78 PASS, 0 FAIL)
- `faers_xml_lint.py` — Sections 24 and 25 corrected
- `FAERS_Scenario_Testing_Results_FDA_updated_2026-05-26.xlsx` — TC-M07 row added, totals updated to 32 scenarios / 28 CA+AA

Sachin
