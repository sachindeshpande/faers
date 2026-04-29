# GAP-IND-007 — C.5.5a Rejected: IND Number Not in ZZFDATST Test Registry

**Status:** ✅ CLOSED — CA+AE confirmed with v32 (ACK ci260429010301, 2026-04-28)  
**Severity:** Blocking — CR+AR across all submissions with unregistered IND  
**Discovered:** 2026-04-28  
**Affected test case:** IND-T06-babe-test-reference  
**Evidence (rejections):** ci260428181215 (v29), ci260428205348 (v30), ci260428224649 (v31)  
**All three ACKs returned:** `typeCode="CR"` + `typeCode="AR"` + "FDA.C.5.5a is invalid for the Center specified in N.2.r.3"

---

## Root Cause

The FDA ZZFDATST_PREMKT test gateway validates the content of `FDA.C.5.5a`
(IND Number where AE Occurred) against a **registry of registered test INDs**.
The number `999999` is not registered in this test environment.

T06 was the only test case in the IND suite that used a non-standard IND number.
Every other case (T01–T05, T07) and FDA's own reference Scenario 3 use `123456`.

| Case | C.5.5a value | Drug approval IND | ACK result |
|------|-------------|-------------------|------------|
| T01  | 123456 | IND123456 | CA+AE ✓ |
| T02  | 123456 | IND123456 | CA+AE ✓ |
| T03  | 123456 | IND123456 | CA+AE ✓ |
| T04  | 123456 | IND123456 | CA+AE ✓ |
| T05  | 123456 | IND123456 | CA+AE ✓ |
| **T06 v29–v31** | **999999** | **IND999999** | **CR+AR ✗** |
| T07  | 123456 | IND123456 | CA+AE ✓ |
| Scenario 3 (FDA ref) | 123456 | IND123456 | (reference) |

---

## What Made This Hard to Diagnose

Three consecutive patch submissions were applied based on wrong structural hypotheses:

| Version | Hypothesis | Change made | Result |
|---------|-----------|-------------|--------|
| v29 (original) | — | — | CR+AR: C.5.5a invalid |
| v30 | FDAAddDrugInformation (code=9) blocks C.5.5a | Removed code=9 observations | CR+AR: identical |
| v31 | Suspect drug without IND approval invalidates C.5.5a | Changed reference drug organizer suspect→concomitant | CR+AR: identical |
| **v32** | **IND number not in test registry** | **Changed 999999→123456, IND999999→IND123456** | **✅ CA+AE CONFIRMED (ci260429010301)** |

The error message "FDA.C.5.5a is **invalid** for the Center" (not "missing" or "mandatory") is
the key wording — it means the field value fails content validation, not structural validation.

---

## Validation Rules Added (faers_xml_lint.py)

### Section 6 fix
PORR receiver check now accepts both `"CDER"` (postmarket) and `"CDER_IND"` (IND track).
The original check for `"CDER"` only was failing silently on all IND submissions.

### Section 18 — GAP-IND-007 (new)
**FAIL** if `is_cder_ind` AND C.5.5a extension ≠ `"123456"`:
```
C.5.5a='{val}' is NOT the confirmed registered test IND.
ONLY '123456' is proven to pass ZZFDATST registry validation.
Evidence: T06 v29/v30/v31 all CR+AR with 999999; T01–T05/T07 all CA+AE with 123456.
```

### Section 19 — IND cross-consistency (new)
**FAIL** if C.5.5a is present but its numeric value does not match any drug approval
IND (after stripping the "IND" prefix). Catches internal inconsistencies where the
study registration IND and the drug block IND diverge.

---

## Fix Applied to T06

**File:** `test/test_submission/from_app/ind/IND-T06-babe-test-reference.xml`

```xml
<!-- BEFORE (v31) -->
<id extension="999999" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.1"/>  <!-- C.5.5a -->
<id extension="IND999999" root="2.16.840.1.113883.3.989.2.1.3.4"/>      <!-- drug IND -->

<!-- AFTER (v32) -->
<id extension="123456" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.1"/>  <!-- C.5.5a -->
<id extension="IND123456" root="2.16.840.1.113883.3.989.2.1.3.4"/>      <!-- drug IND -->
```

C.5.6.r also updated from `888888` → `654321` for consistency with T01/T04 (though
C.5.6.r only generates a warning, not a rejection, for CDER_IND).

Batch UUID rotated to `cd8bab73-a232-4312-b29c-92b58ded37ae`.

---

## Design Rule Going Forward

**When writing a new IND test case, always use IND number `123456` for C.5.5a
and `IND123456` for the drug approval block, unless the test specifically probes
a different registered IND.** Do not invent new IND numbers (e.g. 999999, 888888)
for test submissions — the test gateway registry is not publicly documented and
non-standard values will reject.

---

## OID Reference (C.5.5a family)

| FDA Field | OID | Notes |
|-----------|-----|-------|
| `FDA.C.5.5a` | `2.16.840.1.113883.3.989.5.1.2.2.1.2.1` | IND where AE occurred — registry-validated |
| `FDA.C.5.6.r` | `2.16.840.1.113883.3.989.5.1.2.2.1.2.3` | Cross-reported IND — mandatory when C.5.5a present but itself "invalid for CDER_IND" (GAP-IND-002 contradiction) |
| Drug approval IND | `2.16.840.1.113883.3.989.2.1.3.4` | asManufacturedProduct/approval/id — must match C.5.5a numerically |
