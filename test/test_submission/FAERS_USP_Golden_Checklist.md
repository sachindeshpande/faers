# FAERS USP Golden Checklist

The human-readable companion to **`validate_backbone.py`**. When the backbone gate
fails, this document explains *why* each rule exists and what it protects against.
Every rule below was paid for by an FDA ACK rejection during the v1→v37 debugging
cycle; the historical ACK that proved each one is cited so no future change
re-derives (or re-inverts) a lesson already learned.

> **Live code wins.** If this checklist ever disagrees with the live
> `xmlGeneratorService.ts`, `faers_xml_lint.py`, or `validate_backbone.py`, the
> live code is authoritative — fix this document, not the code. The proven ground
> truth is `package/CASE-20260331-EMJQ_fixed_v37_patch.xml` (ACK `ci260410211359`,
> full **CA+AA**, 2026-04-10).

---

## 1. The 15 backbone invariants (BB-01 … BB-15)

Each maps 1:1 to a check in `validate_backbone.py`. "Anti-pattern" is the wrong
form that an FDA ACK rejected — do **not** reintroduce it.

| BB | Rule | Anti-pattern (DO NOT) | Proof (ACK) | Why it matters |
|---|---|---|---|---|
| BB-01 | Reporter `author` lives **inside `subjectOf1/controlActEvent`** | `author` as a direct child of `investigationEvent` | v36 `ci260410182936` — SAX exception | A direct-child `author` is not in the CDER PORR schema's allowed content set; the parser aborts the whole message. |
| BB-02 | Reporter block is reachable at `subjectOf1/controlActEvent/author` | Reporter encoded anywhere else | v37 `ci260410211359` (CA+AA) | This is the position the FDA 2.18 engine actually reads C.3 from. |
| BB-03 | Reporter `assignedEntity/code` codeSystem = `2.16.840.1.113883.3.989.2.1.1.7` | OID `…2.1.1.6` | v34 — all 13 C.3 fields rejected | With OID `.1.6` the engine never reads the reporter block; every C.3 field silently drops. |
| BB-04 | **No** `primaryRole classCode="PRS"` anywhere | Using `primaryRole` (copied from `FDA_E2B_R3_Test_ICSR.xml`, a different schema) | v33 `ci260409041409` — SAX exception | The CDER PORR schema rejects `primaryRole`; the FDA R3 sample uses a newer schema FAERS does not validate against. |
| BB-05 | Reporter has **nested** `representedOrganization` (outer `name` = department, inner `assignedEntity/representedOrganization` `name` = company) | Flat `representedOrganization` | v30 `ci260408183906` — C.3.2 rejected | The nesting restoration (from the v29 baseline) was THE differentiator that turned v30→v37 from FAIL to CA+AA. |
| BB-06 | Reporter name uses structured `<prefix>`, `<given>`, `<family>` children | Mixed-content text node in `<name>` | v32 `ci260409003237` — C.3.2 rejected | The engine parses C.3.3.x only from discrete child elements. |
| BB-07 | Reporter `addr` includes `<country>US</country>` | Country only in `asLocatedEntity` | v30 — C.3.4 rejected | C.3.4 country must be in `addr`; the `asLocatedEntity` copy is not read for that field. |
| BB-08 | Reporter has `tel:`, `fax:`, **and** `mailto:` telecoms | Missing fax | v29 — C.3.4.7 rejected | Fax absence triggers a C.3.4.7 rejection even when tel is present. |
| BB-09 | PORR `<sender>` contains **no** `<id>` with root `2.16.840.1.113883.3.989.2.1.3.12` | `.3.12` (the receiver OID) appearing in the sender | v30 — persistent batch-level AR | `.3.12` is the receiver's OID; its presence in the sender breaks batch-level AR parsing. |
| BB-10 | Drug indication `CE` values carry both `@code` **and** `@codeSystem` | `displayName` only | v30 lint warning | Representational strictness; a bare `displayName` is non-conformant. |
| BB-11 | MedDRA `codeSystemVersion` = the project-pinned value (**currently `25.0`**) | Any other / drifting version | v37 corpus baseline | See §3 — version is pinned, not free-floating, so the gate catches accidental drift. |
| BB-12 | Each submission has a **unique** batch UUID in the MCCI `<id>` extension | Reused UUIDs | v28.x→v30 — persistent batch AR | A reused batch UUID causes the gateway to reject as a duplicate batch. |
| BB-13 | Wrapper child order: `id`, `creationTime`, `responseModeCode`, `interactionId`, `name`, `PORR_IN049016UV`, `receiver`, `sender` | Wrapper `receiver`/`sender` **before** `PORR_IN049016UV` | Phase A SAX exceptions | Out-of-order wrapper children abort SAX parsing. |
| BB-14 | Wrapper `<name>/@displayName = "ichicsr"` | Any other value | Schema | FDA pattern requirement. |
| BB-15 | Routing matches the filename track (see §2) | Routing IND to the postmarket gateway or vice-versa | Gateway rejection | A mis-routed file is rejected at the gateway before content validation. |

**`asLocatedEntity` inside `assignedPerson` is NEUTRAL** — present in v29 (PASS) and
v30 (FAIL). Do not add or remove it as a "fix"; it changes nothing. See §4.

---

## 2. Wrapper and routing rules

- **Wrapper child order** — as BB-13 above. Single wrapper `id` before `creationTime`.
- **`<name>/@displayName`** — `"ichicsr"` (BB-14).
- **Batch UUID** — unique per submission (BB-12). Live format:
  `DeepQuenceTest-<YYYYMMDD>-<uuid4>`. The `v<NN>` segment seen in manual
  debugging artifacts is cosmetic; uuid4 alone guarantees uniqueness.
- **Routing by track (BB-15):**

  | Track | `N.2.r.3` (inner PORR receiver) | Top wrapper receiver (test) | Top wrapper receiver (prod) |
  |---|---|---|---|
  | Postmarket (`TC-*`) | `CDER` | `ZZFDATST` | `ZZFDA` |
  | IND / premarket (`IND-*`) | `CDER_IND` | `ZZFDATST_PREMKT` | `ZZFDA_PREMKT` |

  Note the ESG *credential* `fda_center` is a separate layer and is `CDER` for
  both tracks (see `.env` / `Workflow_App_Change_List.md` §1.4); do not conflate
  it with the XML `N.2.r.3` receiver above.

---

## 3. Coded clinical values

- **MedDRA OID** — `2.16.840.1.113883.6.163` on all reaction and indication `CE` values.
- **MedDRA `codeSystemVersion`** — pinned to **`25.0`** (BB-11). This single value is
  used across the live generator (`xmlGeneratorService.ts` `MEDDRA_VERSION`), the
  validator default (`validate_backbone.py` `EXPECTED_MEDDRA_VERSION_DEFAULT`), and
  CI (`ci_backbone_check.yml` `FAERS_MEDDRA_VERSION`). It matches the FDA-accepted
  v37 reference and the entire golden corpus. **Rationale for 25.0:** the only
  CA+AA-accepted submission used 25.0; pinning there keeps the generator, the
  goldens, and the validator in lockstep. To upgrade, bump all three in the same
  change and regenerate the goldens — never one in isolation (an isolated bump is
  exactly what BB-11 exists to catch).
- **Drug indication `CE`** — must carry `@code` and `@codeSystem`, not just
  `@displayName` (BB-10).

---

## 4. Out-of-scope / informational only

These are deliberately **not** backbone failures. Do not "fix" them.

- **`asLocatedEntity`** inside `assignedPerson/representedOrganization` — neutral
  (present in both a PASS and a FAIL ACK). Retained for v29 baseline parity only.
- **MedDRA version drift** — managed via the env var / CLI override
  (`FAERS_MEDDRA_VERSION`, `--meddra-version`), not hard-coded into the checks.
  BB-11 flags drift but the *value* is configurable for a coordinated upgrade.
- **`FDA.C.5.6.r` on IND files** — **DEFERRED.** The IND ACK warns this field is
  invalid for the IND center, but regression rule **R0026** currently expects it
  *present* for IND when C.5.5a is populated. Do not suppress it in the generator
  until that conflict is reconciled (ESGNGSupport / FDA Implementation Guide §5).
  The warning is informational and non-blocking.

---

## 5. Cross-references

| Artifact | Role |
|---|---|
| `validate_backbone.py` | The 15-invariant structural gate this doc explains (BB-01…BB-15). |
| `faers_xml_lint.py` | The 55+ business-rule / structural lint (finer-grained than the backbone). |
| `golden_regression_test.py` | Generates XML from JSON fixtures via the headless CLI and diffs against the curated goldens. |
| `package/CASE-20260331-EMJQ_fixed_v37_patch.xml` | The proven CA+AA reference XML — the structural ground truth. |
| `package/superseded/` | Failed/obsolete attempts (e.g. the v36 SAX-exception file). Never submission candidates. |
| `Workflow_App_Change_List.md` | Post-audit consolidated change list (§4.4 is the source of these rules). |
| `CLAUDE.md` (this directory) | Project memory; the backbone table and the "live-code-wins" rule. |

---

## 6. Rules explicitly EXCLUDED (failed hypotheses — never apply)

A pre-audit draft inverted several rules. They are the **opposite** of the proven
v37 conventions and would re-introduce the v36 SAX exception. They are listed here
so they are never silently reintroduced:

- ❌ Reporter `author` as a **direct child** of `investigationEvent` → correct is **inside `subjectOf1/controlActEvent`** (BB-01).
- ❌ Reporter OID `…2.1.1.6` → correct is `…2.1.1.7` (BB-03).
- ❌ A **second sender `author`** block at `investigationEvent` level → there is none; sender identity lives in the wrapper `<sender>` (v36 SAX exception).
- ❌ **Flat** `representedOrganization` → correct is **nested** (BB-05).
- ❌ `primaryRole classCode="PRS"` → never used (BB-04).
