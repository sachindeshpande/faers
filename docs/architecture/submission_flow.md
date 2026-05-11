# FAERS Submission Flow — Single Diagram

**Purpose:** One mermaid `flowchart` covering the **complete submission lifecycle** — from JSON fixture through FDA ACK3 through retry cycles back to the generator — without splitting v1 / v2 / v3 cycles into separate diagrams. Rejection branches are drawn as back-edges so the visual stays connected.

Companion docs:
- [`test/test_submission/SUBMISSION_CAMPAIGN_REPORT.md`](../../test/test_submission/SUBMISSION_CAMPAIGN_REPORT.md) — campaign-level inventory + run history
- [`test/test_submission/ACK_Issue_Tracker.md`](../../test/test_submission/ACK_Issue_Tracker.md) — every ACK with its disposition
- [`docs/status/2026-05-09_regression_verified_green.md`](../status/2026-05-09_regression_verified_green.md) — current regression state

---

## Flow

```mermaid
flowchart TD
    JSON([JSON fixture<br/>test/golden/&lt;cat&gt;/json/])

    %% ── Headless pipeline ──────────────────────────────────────────────
    JSON --> IMPORT[CaseImportService<br/>importCaseFromJson]
    IMPORT --> READY{markReady<br/>field validation}
    READY -- error --> PATCH_JSON[Patch JSON fixture]
    READY -- ok --> GEN[XMLGeneratorService<br/>generate]
    GEN --> WRITE[Write generated XML]
    WRITE --> ROUTE[Print ESG channel directive<br/>AERS / AERS_PREMKT_CDER]
    ROUTE --> GATES{Pre-submission gates<br/>structural · lint · 5-pass}

    %% Gate outcomes
    GATES -- structural error --> PATCH_GEN[Patch xmlGeneratorService]
    GATES -- lint error --> PATCH_GEN
    GATES -- 5-pass proven_rejected --> RECORD_REJ
    GATES -- ok --> LOG[submissionLogService<br/>recordSubmission]

    %% ── Submission ─────────────────────────────────────────────────────
    LOG --> UPLOAD[Operator: upload via ESG NextGen<br/>AERS or AERS_PREMKT_CDER]
    UPLOAD --> WAIT([Wait for FDA ACK3])
    WAIT --> ACK_PARSE[ackParserService<br/>parseFdaAck]

    %% ── Outcome branch ─────────────────────────────────────────────────
    ACK_PARSE --> OUTCOME{ACK outcome}
    OUTCOME -- "CA+AA / CA+AE" --> ACCEPT[--record-ack<br/>updateAckOutcome]
    OUTCOME -- "CR+AR" --> CLASSIFY{Classify rejection}

    %% Accept branch — golden promotion + policy update
    ACCEPT --> POLICY[Promote value:<br/>FAERS_POLICY / IND_POLICY<br/>→ proven_safe]
    POLICY --> GOLD[Move XML+ACK into<br/>test/golden/&lt;cat&gt;/]
    GOLD --> DONE([Scenario closed — accepted])

    %% Reject branches — every one loops back upstream
    CLASSIFY -- "Wrong channel<br/>(ISSUE-001)" --> REUP[Re-upload via<br/>correct ESG channel]
    REUP --> WAIT
    CLASSIFY -- "Duplicate UUID<br/>(ISSUE-003)" --> REGEN[Regenerate<br/>fresh batch UUID]
    REGEN --> GEN
    CLASSIFY -- "Generator emits wrong value<br/>(GAP-IND-* / GAP-PROD-*)" --> PATCH_GEN
    CLASSIFY -- "JSON has wrong field<br/>(test data drift)" --> PATCH_JSON
    CLASSIFY -- "FDA data-point reject<br/>(C41257, C41258, nullFlavor NI)" --> RECORD_REJ[FAERS_POLICY / IND_POLICY:<br/>record value as proven_rejected]
    CLASSIFY -- "Schema-rejected<br/>(no valid form)" --> CLOSED_REJ([Scenario closed — invalid])

    RECORD_REJ --> DONE_REJ([Scenario closed — data point])

    %% Patches loop back to the upstream stage they need
    PATCH_GEN --> GEN
    PATCH_JSON --> JSON

    %% Audit / regression edge — green CA+AA also feeds the regression suite
    POLICY -.golden refresh.-> REGRESS[Golden regression CI<br/>35 scenarios via JSON,<br/>1 schema-rejected SKIPPED]
    REGRESS -.diff vs golden.-> PATCH_GEN

    classDef ok       fill:#d4f4d4,stroke:#3a9b3a,color:#0a3a0a
    classDef bad      fill:#ffd4d4,stroke:#b03030,color:#3a0a0a
    classDef act      fill:#d4e4f4,stroke:#3a6a9b,color:#0a1a3a
    classDef terminal fill:#f0f0f0,stroke:#666,color:#000,stroke-dasharray: 4 2

    class ACCEPT,POLICY,GOLD ok
    class CLASSIFY,PATCH_GEN,PATCH_JSON,REGEN,REUP,RECORD_REJ bad
    class JSON,IMPORT,READY,GEN,WRITE,ROUTE,GATES,LOG,UPLOAD,WAIT,ACK_PARSE,OUTCOME,REGRESS act
    class DONE,DONE_REJ,CLOSED_REJ terminal
```

---

## Cycle inventory

The diagram contains four distinct cycles. They share the same `GEN` / `JSON` nodes so the picture stays unified.

| # | Cycle | Trigger | Cycle back-edge |
|---|---|---|---|
| 1 | **Gate-fail loop** (pre-portal) | Structural / lint / 5-pass error from local gates | `PATCH_GEN → GEN` (re-emit) |
| 2 | **Generator-gap loop** (post-ACK) | CR+AR with patchable generator cause (e.g. GAP-IND-001..007, GAP-PROD-001/002) | `PATCH_GEN → GEN` (regenerate, fresh UUID, upload again) |
| 3 | **JSON-drift loop** (pre-portal or post-ACK) | markReady error, or post-ACK CR+AR caused by JSON field mismatch | `PATCH_JSON → JSON` |
| 4 | **Channel mismatch loop** (ISSUE-001) | Right XML, wrong portal channel | `REUP → WAIT` (no regen needed — FDA hasn't registered the UUID) |

The two dashed audit edges (`POLICY ⇢ REGRESS ⇢ PATCH_GEN`) represent the CI feedback loop: every promoted golden re-enters the regression suite, and any regression failure triggers a generator patch — closing the system over its own outputs.

## Terminal states

| Node | Meaning |
|---|---|
| `DONE` | CA+AA / CA+AE round-trip complete; value promoted to `proven_safe`; XML+ACK in `test/golden/` |
| `DONE_REJ` | FDA rejected the field value; value recorded as `proven_rejected` in policy; no further submission planned (e.g. TC-A03 race C41257, TC-A04 race C41258) |
| `CLOSED_REJ` | Scenario has no valid XML form under CDER 2.18 (e.g. TC-A06 ethnicity `nullFlavor="NI"` triggers SAX schema error); permanently skipped |

## Where this fits in the codebase

| Diagram node | Implementation |
|---|---|
| `IMPORT` / `READY` | `faers-app/src/main/services/caseImportService.ts`, `validationService.ts` |
| `GEN` / `WRITE` / `ROUTE` | `faers-app/src/main/services/xmlGeneratorService.ts`, `faers-app/src/main/headless/cli.ts` |
| `GATES` | `xmlLintService.ts`, `fivePassValidatorService.ts` + the `faers_xml_lint.py` 60-check |
| `LOG` | `faers-app/src/main/services/submissionLogService.ts` |
| `UPLOAD` | External (ESG NextGen portal / API via `test/test_submission/submit_batch.py`) |
| `ACK_PARSE` | `faers-app/src/main/services/ackParserService.ts` |
| `POLICY` | `faers-app/src/main/services/faersEmpiricalPolicy.ts` (FAERS_POLICY + IND_POLICY) |
| `GOLD` | `test/golden/<category>/{xml,json}/`, `test/golden/manifest.json` |
| `REGRESS` | `test/test_submission/golden_regression_test.py` + `.github/workflows/regression.yml` |
| `PATCH_GEN` / `PATCH_JSON` | Whatever PR closes the gap. Tracked in `docs/gaps/GAP-*.md`. |
