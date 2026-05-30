# Production Coverage Gap Analysis

**Date:** 2026-05-09  
**Regression state:** ✅ 33/33 PASS / 3 SKIPPED / 0 GATE FAILURE (CI green, commit `189da36`)  
**Catalog baseline:** `FAERS_Test_Case_Catalog.md` (last updated 2026-05-02)  
**Golden dataset:** 36 scenarios curated, 33 JSON-backed, 3 XML-surgery-only  

---

## 1. Summary

The campaign has confirmed FDA acceptance for 32 of 37 defined scenarios. The generator regression suite covers 33 of those 36 golden scenarios automatically. Three scenarios have goldens but no JSON drivers (TC-A06, TC-F02, TC-F04), and one (TC-H02) is permanently excluded as scenario-invalid. The only **blocking gap for production readiness** is a stale catalog entry (TC-G01 still marked "ACK3 PENDING" when it is in fact CA+AA). Two structural gaps (TC-F02, TC-F04) affect production users who need combination-product or study-type postmarket submissions; these have XML-surgery workarounds but no generator-backed JSON paths.

---

## 2. Scenario Coverage Matrix

### 2A — Postmarket Scenarios (30 total)

| Scenario | Catalog Status | Golden | In Regression | Gap / Action |
|---|---|---|---|---|
| TC-A01 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-A02 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-A03 | ❌ PROVEN REJECTED | ✅ | ✅ PASS | None — rejected scenarios intentionally have goldens (CR+AR) |
| TC-A04 | ❌ PROVEN REJECTED | ✅ | ✅ PASS | None |
| TC-A05 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-A06 | ❌ PROVEN REJECTED (schema) | ✅ | ⏭️ SKIPPED | No JSON driver needed — schema rejection has no valid XML form to generate |
| TC-B01 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-B02 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-C01 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-C02 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-D01 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-D02 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-D03 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-D04 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-D05 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-D06 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-E01 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-E02 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-E03 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-F01 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-F02 | ✅ CA+AA | ✅ | ⏭️ SKIPPED | **GAP-PROD-001**: combination product — no JSON driver; XML-surgery only |
| TC-F03 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-F04 | ✅ CA+AA | ✅ | ⏭️ SKIPPED | **GAP-PROD-002**: ICH type 2 postmarket — no JSON driver; XML-surgery only |
| TC-G01 | ⏳ **STALE** (catalog) | ✅ CA+AA | ✅ PASS | **ACTION-001**: update catalog + policy table — ACK ci260501225706 already in golden |
| TC-G02 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-G03 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-G04 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-H01 | ✅ CA+AA | ✅ | ✅ PASS | None |
| TC-H02 | ❌ SCENARIO INVALID | ✗ (not in manifest) | ✗ not in regression | **Permanent exclusion** — 3-round CR+AR; no valid XML form exists |
| TC-H03 | ✅ CA+AA | ✅ | ✅ PASS | None |

**Postmarket totals:** 25 accepted (CA+AA), 4 proven-rejected (A03, A04, A06, H02-invalid), 1 stale (G01 — actually resolved).

### 2B — IND/Premarket Scenarios (7 total)

| Scenario | Portal ACK (regen #3) | Golden | In Regression | Gap / Action |
|---|---|---|---|---|
| IND-T01 | ✅ CA+AE ci260430003632 | ✅ | ✅ PASS | OPEN-01: API batch ACK3 pending |
| IND-T02 | ✅ CA+AE ci260430003735 | ✅ | ✅ PASS | OPEN-01: API batch ACK3 pending |
| IND-T03 | ✅ CA+AE ci260430003832 | ✅ | ✅ PASS | OPEN-01: API batch ACK3 pending (C.5.6.r swapped to `…2.1.2.1`) |
| IND-T04 | ✅ CA+AE ci260430003937 | ✅ | ✅ PASS | OPEN-01: API batch ACK3 pending |
| IND-T05 | ✅ CA+AE ci260430004212 | ✅ | ✅ PASS | OPEN-01: API batch ACK3 pending |
| IND-T06 | ✅ CA+AE ci260430004305 | ✅ | ✅ PASS | OPEN-01: API batch ACK3 pending |
| IND-T07 | ✅ CA+AE ci260430004355 | ✅ | ✅ PASS | OPEN-01: API batch ACK3 pending |

**IND totals:** 7/7 accepted CA+AE (portal). 7 additional API submissions (2026-05-01) with C.5.6.r OID stripped/swapped still awaiting ACK3.

---

## 3. Open Items

### ACTION-001 — Update TC-G01 in catalog and empirical policy table (BLOCKING)

**Priority:** High — this creates a false impression of a pending item when it is resolved.

The catalog's §2 summary table shows `⏳ ACK3 PENDING` for TC-G01 and its §3 empirical policy row for "Reaction seriousness (all BL false)" shows `⏳ TC-G01 v2 pending ACK3`. Both are stale.

**Evidence of resolution:**
- `test/golden/postmarket/accepted/xml/TC-G01-nonserous.ack` contains `typeCode="CA"` + `typeCode="AA"`
- ACK reference `ci260501225706` matches the catalog's "v2 submitted May 1 22:57 UTC"
- Regression: TC-G01-nonserous PASS on every CI run since commit `189da36`

**Changes needed in `FAERS_Test_Case_Catalog.md`:**

1. §2 summary table row for TC-G01:
   - Change: `⏳ ACK3 PENDING | ci260501225706 (v2) | v1 CR+AR…; v2 submitted May 1 22:57 UTC`
   - To: `✅ ACCEPTED | ci260501225706 (v2) | CA+AA — all BL flags false accepted; non-serious seriousness block confirmed`

2. §2 footer count: change `24 accepted … 1 pending (G01)` → `25 accepted … 0 pending`

3. §3 empirical policy row "Reaction seriousness (all BL false)":
   - Change: `— | — | ⏳ TC-G01 v2 pending ACK3`
   - To: `— | All BL false (no serious criterion) | **TC-G01(all-false→accept)**`

4. End-of-catalog note: change `Pending ACK3: 1 (TC-G01 v2)` → `Pending ACK3: 0` and update combined coverage from `32/37` → `33/37`.

---

### GAP-PROD-001 — TC-F02 combination product: no JSON generator path

**Priority:** Medium — affects production users who submit combination-product reports.

TC-F02 (`combinationProductIndicator=true`) was accepted CA+AA on ci260501170846. The golden XML exists and the policy value `C156384=true` is proven. However the generator has no JSON input path for this scenario — it was submitted via XML surgery and the scenario is SKIPPED in the regression suite.

**Production impact:** Any FAERS user submitting a case involving a combination product (device + drug, or biologic + device) cannot use the JSON-driven workflow — they must hand-edit the XML.

**Options:**
- A: Add a `combinationProductIndicator` field to the JSON schema and wire it through the generator. Add TC-F02 to the JSON-driven regression set (moves from SKIPPED to PASS). Estimated effort: ~20 LOC in generator + 1 JSON file update.
- B: Document TC-F02 as a permanently XML-surgery-only scenario with explicit rationale (low frequency, low risk of error in the single field). Leave SKIPPED.

**Recommended:** Option A — the field is a single boolean toggle. The generator already emits the parent element for the combination product block; the indicator is a child boolean. Low implementation risk.

---

### GAP-PROD-002 — TC-F04 ICH report type 2 postmarket: no JSON generator path

**Priority:** Medium — affects production users submitting study/IND-originated postmarket reports.

TC-F04 (`C.1.3=2`, postmarket study report) was accepted CA+AA on ci260501225657 (v2). The golden XML exists, but the scenario is SKIPPED. The v1 submission (CR+AR) was missing the `researchStudy` block required when `C.1.3=2`.

**Note:** The IND channel does handle `C.1.3=2` via JSON (all 7 IND-T* scenarios use it). The gap is specifically the postmarket channel's `researchStudy` emission when `C.1.3=2` is set on a FAERS (not IND) case.

**Production impact:** Production postmarket submissions from clinical trial spontaneous reports require `C.1.3=2`. Without a generator JSON path, these require XML surgery and bypass the regression safety net.

**Options:**
- A: Expose `reportType` (C.1.3) as a JSON field for postmarket cases and wire the `researchStudy` emission when `reportType=2`. Add TC-F04 to the JSON-driven regression set.
- B: Document as XML-surgery-only with the explicit finding: "postmarket C.1.3=2 requires a manually specified `researchStudy` block; the IND generator path handles this automatically for IND submissions."

**Recommended:** Option A — the postmarket generator should support the same `reportType` field already in the IND schema. Ensure parity and eliminate the manual surgery requirement.

---

### OPEN-01 — IND v5 API batch ACK3 pending

**Priority:** External dependency — no code change needed until ACKs arrive.

Seven IND packages were submitted via API on 2026-05-01 (T01/T02/T04/T05/T06/T07 with C.5.6.r OID stripped; T03 with OID swapped to `…2.1.2.1`). ACK3 responses have not yet arrived as of 2026-05-09.

**When ACKs arrive:**
1. Record via `--record-ack` subcommand and archive to `test/golden/ind/accepted/xml/`
2. If 7× CA+AE without C.5.6.r warning → promote `IND_POLICY.crossReportedInd` from `untested` to `proven_safe` on the new OID-stripped emission state
3. Update `IND_POLICY.crossReportedInd` documentation in `faersEmpiricalPolicy.ts`

---

### DEFERRED — TC-H02 permanently excluded

TC-H02 (reporter with country-only address) completed a 3-round CR+AR campaign. CDER 2.18 mandates all five C.3.4.1–C.3.4.5 address components. There is no valid XML form for this scenario. It remains permanently excluded from the manifest, the regression suite, and any future production submission.

**No action required.** The generator correctly rejects cases missing required address fields via the 5-pass validator.

---

## 4. Production Readiness Assessment

| Domain | Status | Blocker? |
|---|---|---|
| Postmarket core fields (race, ethnicity, sex, age, weight) | ✅ All proven — regression green | No |
| Postmarket drug fields (action taken, dechallenge, multi-drug) | ✅ All proven — regression green | No |
| Postmarket reaction fields (outcome, seriousness) | ✅ All proven — **TC-G01 catalog stale, not a real gap** | No |
| Postmarket report type (follow-up, non-expedited) | ✅ Proven CA+AA | No |
| Combination product indicator (TC-F02) | ✅ Proven CA+AA — **no JSON driver** | Medium |
| ICH report type 2 postmarket (TC-F04) | ✅ Proven CA+AA — **no JSON driver** | Medium |
| IND/SUSAR structure (T01–T07) | ✅ CA+AE portal — API batch pending | No (parallel) |
| Empirical policy table accuracy | ⚠️ TC-G01 row stale | **Catalog update only** |
| CI regression gate | ✅ Green (33/33 PASS, 4 consecutive runs) | No |
| Generator produces lint-clean XML | ✅ 60/60 on all JSON-driven scenarios | No |

**Conclusion:** The generator and regression suite are production-ready for the full catalog of standard case types. Two medium-priority gaps (GAP-PROD-001 and GAP-PROD-002) affect niche submission types (combination products, postmarket study reports) and have functional XML-surgery workarounds. The only required action before declaring the catalog final is ACTION-001 (TC-G01 catalog update), which is a documentation fix, not a code change.

---

## 5. Recommended Action Order

1. **ACTION-001** (now): Update `FAERS_Test_Case_Catalog.md` — TC-G01 row, §2 footer count, §3 empirical policy row, end-of-catalog note. ~10 min, no code change, closes the last stale catalog state.

2. **GAP-PROD-001** (next sprint): Add `combinationProductIndicator` JSON field → generator wiring → TC-F02 regression scenario. Removes the combination-product XML-surgery requirement for production users.

3. **GAP-PROD-002** (next sprint): Expose `reportType` on postmarket JSON schema → `researchStudy` block emission → TC-F04 regression scenario. Eliminates the postmarket study-type XML-surgery requirement.

4. **OPEN-01** (external): When IND v5 API ACK3s arrive, record, promote `crossReportedInd` policy, and close.

---

*Generated 2026-05-09. Derived from regression state at commit `189da36`, `FAERS_Test_Case_Catalog.md` (2026-05-02), and `test/golden/` curated set.*
