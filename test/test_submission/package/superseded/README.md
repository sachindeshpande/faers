# Superseded XML — DO NOT SUBMIT

Files in this directory are **failed or obsolete** submission attempts kept for
historical reference only. They are **not** submission candidates.

## Why these are here

The proven, FDA-accepted reference is:

> `../CASE-20260331-EMJQ_fixed_v37_patch.xml` — ACK `ci260410211359`, full **CA+AA** (2026-04-10).

That is the only EMJQ case XML that should ever be used as the structural
ground truth or submitted.

## Contents

| File | Why it is superseded |
|---|---|
| `CASE-20260331-EMJQ_fixed_v36_patch.xml` | The failed **JC5H-pattern** attempt. It added a second sender `author` block as a direct child of `investigationEvent` and moved the reporter author out of `subjectOf1`. This caused a **SAX exception** (v36 ACK `ci260410182936`). v37 reverted both changes — reporter `author` back inside `subjectOf1/controlActEvent`, OID `.1.7`, nested `representedOrganization` — and was accepted. Applying anything from v36 re-introduces the v36 SAX exception. See `CLAUDE.md` backbone invariants BB-01/BB-02/BB-05. |

## Note on submission tooling

`submit_batch.py` discovers candidates only under `from_app/` (and its
`headless/`, `ind/`, `round2/` subdirectories) — it never globs `package/`.
So files here are not picked up by the batch submitter today. This directory
exists to prevent accidental **manual** submission of a superseded file and to
keep the proven v37 reference unambiguous.
