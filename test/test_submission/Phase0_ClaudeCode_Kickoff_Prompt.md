# Phase 0 — Claude Code Kickoff Prompt

> Paste the block below into Claude Code, opened at the root of the **new platform repository**
> (with the design documents placed in `/docs`). It is a plan-first prompt: Claude Code will read
> context, propose a plan and scaffold for your approval, and only then write code.

---

You are the lead engineer starting **Phase 0** of the AI-Leveraged FDA Regulatory Submission
Platform (a JV between a technology company and Universal Regulatory). This is an **independent,
standalone project** — its own repository, git history, and quality system, with **no dependency on
or imports from** any other project (including the FAERS test-submission / workflow-app codebase).
Work carefully and do not write any code until I approve your plan.

## 1. Load context first

Read these before doing anything else and tell me you have:

- `CLAUDE.md` (repo root) — the governing conventions and guardrails.
- `/docs/SRS_FDA_Submission_Platform.docx` — requirements (modules A–I, FR/NFR IDs).
- `/docs/Architecture_Specification_FDA_Submission_Platform.docx` — services, data, integration, deployment.
- `/docs/Phase0_Build_Kickoff.docx` — what's buildable now, contract-first strategy, Sprint 0 backlog.
- `/docs/Parallelization_Map.docx` — what to build now vs. prototype vs. hold.

## 2. Objective for Phase 0

Transmit **E2B(R3) ICSRs** to the FDA Adverse Event Monitoring System (AEMS) via the **ESG NextGen
API** — automated submission, status polling, and acknowledgement reconciliation. We are starting
**before ESG credentials arrive**, so build **contract-first against the published ESG NextGen API
specification plus a mock gateway**. Live access must become a configuration swap, not a rewrite.

## 3. Hard constraints (do not violate)

- **No live ESG access yet** — build against the spec + a local mock ESG server.
- **Tier discipline (Parallelization Map):** build only the green-light foundations + Mod D
  (submission), Mod F core (minimal orchestration/UI), and Mod H core (records/audit). Do **not**
  build Authoring (A), Knowledge (E), full Workflow (F), or Client Portal (I). Treat eCTD publishing
  (B), validator (C), and AI features (G) as **out of scope** for now.
- **Human-in-the-loop:** nothing auto-finalizes or auto-transmits a submission.
- **Immutable audit:** every state transition writes to an append-only audit record (Part 11).
- **No real patient/PHI data** — synthetic E2B(R3) cases only.
- **Secrets** via a secret manager/KMS, never in code or config.
- **Validated SDLC:** version control, peer review, and requirement traceability (reference FR-*/NFR-*
  IDs in commits and test names). Conformance tests should double as OQ evidence.

## 4. What I want from you, in this order

1. **Confirm understanding** in a few sentences and list any assumptions or gaps you see.
2. **Propose the tech stack.** This is a standalone repo with no dependency on any other project;
   TypeScript/Node is the default — confirm or argue for an alternative. If any existing eCTD/XML
   logic is worth reusing, port it in as clean library code rather than importing from another repo.
3. **Propose the repository skeleton** matching the architecture (services, libs, mocks, tests, infra,
   ui) and a local `docker compose` that runs the mock ESG server + database for offline development.
4. **Propose a Sprint 0 plan** mapped to the kickoff backlog, sequenced as thin vertical slices.
5. **Stop and wait for my approval.** Do not create files yet.

## 5. First implementation task (only after I approve)

Implement **Sprint 0, Story 1**: repository scaffold, CI pipeline (lint + unit + integration-vs-mock),
and the local compose with the mock ESG server and database — with a trivial end-to-end smoke test
proving the harness runs. Keep the commit small, traceable, and reviewable.

## 6. Definition of done for Story 1

- Repo builds and CI is green.
- `docker compose up` starts the mock ESG server and the database locally.
- A smoke test exercises the harness end to end.
- A short README explains how to run it.
- Changes are on a feature branch with a PR description referencing the relevant requirement IDs.

Begin with steps 1–5. Remember: plan first, wait for approval, then build only Story 1.
