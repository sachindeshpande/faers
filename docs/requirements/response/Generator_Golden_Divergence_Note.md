# Generator ↔ Golden Divergence Note

**Date:** 2026-06-26
**Question answered:** Does the current generator output match the curated golden XMLs?
**Answer:** **No.** The full golden regression reports **0/35 PASS — all STRUCTURAL DIFF** (1 skipped: TC-A06, no JSON input). The harness runs cleanly (the lxml comment-node crash is fixed), so these are real content differences, not tooling errors.

## Match status

| Result | Count |
|---|---|
| PASS | 0 |
| STRUCTURAL DIFF | 35 |
| GATE FAILURE | 0 |
| LINT FAILURE | 0 |
| SKIPPED | 1 (TC-A06) |

Example magnitude: TC-A01-race-white alone has **41** structural diffs.

## Root cause (troubleshot)

**Stale goldens from an intentional, FDA-validated format upgrade — NOT a generator regression** — with one unvalidated exception. There are two layers:

### Layer 1 — Validated drug-format upgrade (accepted 2026-06-02, ACK `ci260602192744`)

The generator was deliberately migrated to the FDA FAERS 2.18 "Business Rules v1.7 ICSR XPath" drug representation. Source: `xmlGeneratorService.ts:1352-1358`:

> *"Drug organizer — new format per Business Rules v1.7 ICSR XPath sheet. code="4" on OID …1.20 is required for G.k product XPaths to resolve in FDA FAERS 2.18. Legacy format (code="suspect"/"concomitant" on …1.13) was accepted by the gateway but caused XPath resolution failures. G.k.1 drug role is now expressed via causalityAssessment code=20. Confirmed CA+AA: TC-XP01 ci260602192744."*

This upgrade:
- Changes the drug organizer code `suspect/concomitant` (`…1.13`) → **`code="4"` (`…1.20`)**.
- Moves drug role into **`causalityAssessment code="20"`** (`buildDrugCausalityBlocks`, ~line 1540).
- Adds the drug-reaction matrix **`causalityAssessment code="39"`** (G.k.9.i).
- MedDRA-codes the indication observation (`…6.163` + `codeSystemVersion`).

**Evidence it is correct, not a bug:** the ACK `acks/ACK3/Jun2/ci260602192744.*.ack` exists, and the golden **`TC-XP01-new-organizer-format.xml`** is itself in this new format and was accepted. The other ~34 goldens (and the April v37 reference) predate this upgrade and still encode the OLD format — which is exactly why they show STRUCTURAL DIFF. The corpus is internally inconsistent: only TC-XP01 was regenerated.

### Layer 2 — Unvalidated additions (post-June, NO acceptance yet)

`routeCode` (G.k.4.r) and `doseQuantity` (G.k.4) — from commit `862ffa4` — are emitted by the generator but are **absent even from the newest accepted golden (TC-XP01)**. They have **not** been proven FDA-acceptable.

| Structure | April v37 ref | June golden (TC-XP01, accepted) | Generator now |
|---|---|---|---|
| organizer `code="4"/…1.20` | ✗ | ✓ | ✓ |
| causality `code="20"` / `code="39"` | ✗ | ✓ | ✓ |
| `routeCode` / `doseQuantity` | ✗ | **✗** | **✓ (unvalidated)** |

So Layer 1 divergence = stale goldens (safe to regenerate); Layer 2 = genuinely unproven content that should be validated before being baked into goldens.

## What did NOT cause it

- **The MedDRA 25.0 pin is not responsible.** It only changed the *value* `27.1 → 25.0`; the structural diffs are independent. 25.0 actually *improves* alignment, since the goldens use 25.0.
- **The backbone gate is unaffected.** `validate_backbone.py` checks structural *invariants* on each XML independently (BB-01…BB-15), not equality against the goldens. It passes **15/15** on the corpus and the v37 reference, so the CI gate (`.github/workflows/backbone.yml`) is green. Golden *equality* is a separate, currently-failing concern.

## Resolution (decided 2026-06-27)

**Layer 2 — DONE (code fixed).** `routeCode`/`doseQuantity` were confirmed structurally non-conformant (route codeSystem `…1.14` vs the FDA EDQM set `0.4.0.127.0.16.1.1.2.6`; `doseQuantity/<center>` vs the direct `value`/`unit` form) and absent from every accepted golden. They are now **suppressed** in `xmlGeneratorService.ts` behind a documented, reversible flag `EMIT_GK4_ROUTE_DOSE = false`. Re-enable only after fixing both structures AND obtaining an ACK. (`asManufacturedProduct` / G.k.3.1 was reviewed and **kept** — it is present in accepted goldens IND-T01…T08, TC-A03, TC-A04, so it is a validated, conditionally-emitted structure.)

**Layer 1 — HELD for ACK-backed migration (user decision).** The ~34 old-format goldens will **not** be regenerated locally. They remain the original FDA-accepted captures (each tied to a real old-format ACK). Converting them to the new format would turn them into unproven generator snapshots; instead they will be migrated only when each case is re-submitted in the new format and a real ACK is captured. Consequence: `golden_regression_test.py` is expected to report STRUCTURAL DIFF for old-format cases until then — that is the intended state, not a defect.

### When you do the ACK-backed migration later
1. Re-submit the old-format scenarios in the new (June `ci260602192744`) format; capture ACKs.
2. Update each migrated golden + its `manifest.json` `sha256_xml` (no `--update` flag exists in the harness — do it per file).
3. Register the TC-A06 JSON input (task T2) → target **36 PASS / 0 SKIPPED**.
4. Note the supersession: the April v37 reference is superseded **for the drug-organizer section** by `ci260602192744`; the reporter/wrapper/routing backbone (BB-01…BB-15) is unchanged and still proven by v37.

Until then, rely on the backbone gate (`validate_backbone.py`, 15/15) for structural correctness in CI; golden equality is knowingly deferred.

## How to reproduce

```bash
cd test/test_submission
npm --prefix ../../faers-app run build:headless   # rebuild headless bundle from current source
python3 golden_regression_test.py                 # generated vs curated goldens
git checkout -- regression/                        # restore committed corpus (the run regenerates it)
```
