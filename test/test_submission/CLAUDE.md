# CLAUDE.md — DeepQuence FAERS Test Submission Project Memory

This file is for Claude (and Claude Code) sessions working in this directory. Read it first. It captures the hard-won, proven conventions of this project so you don't re-derive them — and so you don't re-invert them, which has happened before.

---

## The single most important rule

**When a narrative document (fix history, change list, audit report) contradicts the live code, the live code wins.**

This project has a long fix history (`feedback/Comprehensive_XML_Fix_History_UPDATED.md`) that describes the v34→v37 debugging cycle. The narrative is correct, but it is easy to misread the section structure — multiple subsections describe *failed hypotheses* (v34, v35, v36) before v37 documents the actual fix. A previous Claude session encoded the failed v35/v36 hypothesis as a recommendation. A Claude Code audit caught it before any code changed. **Don't repeat the mistake.**

Authoritative sources, in order:

1. The live `xmlGeneratorService.ts` (the generator)
2. The live `faers_xml_lint.py` (the rule enforcer)
3. The live `validate_backbone.py` (the structural gate)
4. The proven v37 reference XML: `package/CASE-20260331-EMJQ_fixed_v37_patch.xml` (ACK `ci260410211359` — full CA+AA)
5. The golden corpus in `regression/xml/` (35 files, all PASS as of the last regression run)
6. **Then** the narrative documents

If the narrative says X and the live code does Y, Y is right.

---

## The v37 backbone conventions (PROVEN, do not invert)

These are the structural rules that produced a CA+AA-accepted submission on 2026-04-10. They are enforced by `validate_backbone.py`. Each is a hard-won lesson; the historical ACK that proved it is in parentheses.

| # | Rule | Anti-pattern (DO NOT do) | Proof |
|---|---|---|---|
| 1 | Reporter `author` lives inside `subjectOf1/controlActEvent` | Author as direct child of `investigationEvent` | v36 ACK `ci260410182936` — SAX exception |
| 2 | Reporter `assignedEntity/code` codeSystem = `2.16.840.1.113883.3.989.2.1.1.7` | OID `.1.1.6` | v34 ACK — all 13 C.3 fields rejected (engine never read the block) |
| 3 | Reporter has **nested** `representedOrganization` (outer name = department, inner `assignedEntity/representedOrganization` name = company) | Flat `representedOrganization` | v30 ACK `ci260408183906` — C.3.2 rejected; v37 restoration of nesting was THE differentiator that fixed it |
| 4 | No `primaryRole classCode="PRS"` anywhere | Using `primaryRole` (taken from `FDA_E2B_R3_Test_ICSR.xml` which uses a different schema) | v33 ACK `ci260409041409` — SAX exception |
| 5 | One reporter `author` only; no second sender `author` block as a direct child of `investigationEvent` | Adding sender author at investigationEvent level "per JC5H reference" | v36 ACK — SAX exception |
| 6 | Reporter name uses structured `<prefix>`, `<given>`, `<family>` children | Mixed-content text node in `<name>` | v32 ACK `ci260409003237` — C.3.2 still rejected |
| 7 | `addr` includes `<country>US</country>` | Country in `asLocatedEntity` only | v30 ACK — C.3.4 rejected |
| 8 | Reporter has `tel:`, `fax:`, and `mailto:` telecoms | Missing fax | v29 ACK — C.3.4.7 rejected |
| 9 | PORR `<sender>` contains NO `<id>` with root `2.16.840.1.113883.3.989.2.1.3.12` | `.3.12` OID (which is the receiver OID) in sender | v30 ACK — persistent batch-level AR |
| 10 | Drug indication `CE` values have both `@code` AND `@codeSystem` | `displayName` only | v30 lint warning; representational strictness |
| 11 | Wrapper child order: `id`, `creationTime`, `responseModeCode`, `interactionId`, `name`, `PORR_IN049016UV`, `receiver`, `sender` | Wrapper receiver/sender BEFORE `PORR_IN049016UV` | Phase A SAX exceptions |
| 12 | Wrapper `<name>/@displayName = "ichicsr"` | Any other value | Schema |
| 13 | Each submission has a unique batch UUID in MCCI `<id>` extension | Reused UUIDs | v28.x → v30 persistent batch AR |
| 14 | IND files route: `N.2.r.3 = CDER_IND`, top wrapper receiver = `ZZFDATST_PREMKT` (test) or `ZZFDA_PREMKT` (prod) | Routing IND to postmarket gateway | Gateway rejection |
| 15 | Postmarket files route: `N.2.r.3 = CDER`, top wrapper receiver = `ZZFDATST` (test) or `ZZFDA` (prod) | Routing AERS to premarket gateway | Gateway rejection |

**`asLocatedEntity` inside `assignedPerson` is neutral** — present in v29 (PASS) and v30 (FAIL). Don't add or remove it as a "fix"; it makes no difference.

---

## Current track status (as of 2026-05-01)

| Track | Status | Notes |
|---|---|---|
| AERS/CDER (postmarket) | ✅ Resolved | 27 successful API submissions. v37 winning structure proven. `submission_type=AERS`, `fda_center=CDER`. |
| IND/CDER_IND (premarket) | ⛔ Blocked on AEMSESUB enrollment | Portal CA+AE but admin-declined; API returns ESGNG334 for every combination tested including the matched pair `CDER_IND + IND` and the portal channel label `CDER_IND + AERS_PREMKT`. JWT carries no center-specific claims. Helpdesk email drafted in `helpdesk_email_draft.md`. **The blocker is account-side, not code-side.** Don't try to "fix" this in code. |

The canonical `submission_type` for the IND track is currently unknown. `ESG_SUBMISSION_TYPE_IND=AERS_PREMKT_CDER` is a placeholder; update only after a successful IND credential response identifies the right token.

---

## Key files map

### Generator + submitter
- `submit_batch.py` — ESG NextGen API client (Steps 1–5: token → credential → payload → upload → submit)
- `xmlGeneratorService.ts` (in the workflow-app repo, not here) — XML generator
- `.env` — runtime credentials and routing values (live, do not commit)
- `.env.example` — template (needs cleanup per Workflow_App_Change_List.md §3)

### Validators (cheapest → most expensive)
- `faers_xml_lint.py` — business-rule and structural lint, 55+ checks
- `validate_backbone.py` — 15 structural backbone invariants (the "did we re-invert the v37 lessons?" gate)
- `golden_regression_test.py` — generates XMLs from JSON fixtures, diffs against goldens with a fixed exclusion list
- XSD validation: `xmllint --schema MCCI_IN200100UV01.xsd` (not currently in CI)

### Authoritative references
- `package/CASE-20260331-EMJQ_fixed_v37_patch.xml` — the proven-accepted XML. v36 in the same directory is the FAILED JC5H-pattern attempt; do not submit it.
- `acks/ci260410211359.1842efd7d3d24e7cbd5a9703e90bdebc.ack` — the CA+AA ACK that closed v37
- `regression/xml/` — golden corpus, 35 files, all PASS 14/15 backbone (BB-11 MedDRA version pending reconciliation)
- `regression/golden_regression_results.md` — current regression results

### Process / handoff documents
- `Workflow_App_Change_List.md` — consolidated change list, **post-audit corrected version**. Read the corrected header.
- `Workflow_App_Change_List_Audit_Response.md` — the Claude Code audit that caught the v36-hypothesis mistake
- `IND_Troubleshooting_Technical_Brief.md` — the IND ESGNG334 investigation
- `ESG_NextGen_Error_Fix_Report.docx` — the historical fix report for the ESGNG219 round (resolved)
- `feedback/Comprehensive_XML_Fix_History_UPDATED.md` — full v1→v37 narrative. **Read carefully**; the structure describes failed hypotheses before the winning fix.
- `helpdesk_email_draft.md` — AEMSESUB enrollment request, ready to send

---

## Standard validation pipeline (run before any submission)

```bash
# 1. Lint
python3 faers_xml_lint.py path/to/case.xml

# 2. Backbone invariants (sub-second)
python3 validate_backbone.py path/to/case.xml

# 3. Golden regression (full corpus)
python3 golden_regression_test.py

# 4. XSD schema validation (optional but recommended)
xmllint --schema MCCI_IN200100UV01.xsd path/to/case.xml
```

If all four pass and the XML hasn't been submitted before, it's ready. If any layer fails, **do not submit** until you understand why.

---

## Anti-patterns observed in past sessions

1. **Taking the FDA reference sample `FDA_E2B_R3_Test_ICSR.xml` as canonical** — it uses a different (newer) schema than CDER FAERS validates against. Its `primaryRole classCode="PRS"` pattern is rejected by CDER PORR. Use `package/CASE-20260331-EMJQ_fixed_v37_patch.xml` instead.
2. **Taking the FAERS2022 scenario files as containing only postmarket conventions** — they're a useful reference but not normative.
3. **Conflating FAERS (the destination database) with AERS (a submission_type value)** — both AERS and IND submissions go to FAERS; that doesn't make `submission_type=AERS` correct for IND filings.
4. **Inferring rules from a "matched pair must work because the mismatched pairs failed" argument** — the four-cell test grid revealed that none of the IND combinations work (it's enrollment), so this inference is not load-bearing. But the inference itself is invalid even when it happens to be correct.
5. **Encoding rules from the "Why this approach failed" sections of the fix history as if they were the winning approach.** This is the live-code-wins rule in action.

---

## Quick "did I just invert v37?" check

Before recommending any change to the reporter/author block:

```bash
# Generate a sample XML, then:
python3 validate_backbone.py path/to/generated.xml

# If BB-01, BB-02, BB-03, BB-04, BB-05, or BB-06 fails — stop and re-read this file.
```

The backbone gate exists specifically to catch this class of mistake before it consumes another debugging cycle.

---

## Open follow-ups (live, update as resolved)

| Item | Owner | Status |
|---|---|---|
| AEMSESUB enrollment for IND track | FDA helpdesk | Email ready in `helpdesk_email_draft.md` — needs to be sent |
| MedDRA version reconciliation (corpus 25.0 vs audit-claimed 27.1) | DeepQuence | `grep -rn "codeSystemVersion" src/` in workflow-app repo |
| Wire `validate_backbone.py` into CI | Claude Code | YAML snippet ready in `ci_backbone_check.yml` |
| `.env.example` cleanup | Claude Code | Per change list §3 |
| TC-A06 golden manifest entry | Claude Code | Per change list §4.1 |
| Create `FAERS_USP_Golden_Checklist.md` with corrected rules | Claude Code | Per change list §4.4 (use corrected rules, not pre-audit rules) |
| Reconcile `FDA.C.5.6.r` on IND vs regression rule R0026 | Pending external clarification | Defer |
| Remove or relocate v36 superseded XML from `package/` | DeepQuence | Risk of accidental re-submission |
