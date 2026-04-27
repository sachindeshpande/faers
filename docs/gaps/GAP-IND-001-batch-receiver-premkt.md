# GAP-IND-001 — IND/SUSAR Batch Receiver Wrong for Test Environment

**Status:** Open  
**Severity:** Blocking — submissions to `AERS_PREMKT_CDER` are rejected at the envelope level  
**Discovered:** 2026-04-27  
**Evidence:** ACK3 from FDA for IND-T01-susar-baseline.xml (`ci260424234208.f081c35005514e17a71c92b97f305d94.ack`)  

---

## 1. Problem Statement

When a case is exported via `submissionReportType = 'Premarket'` and `submissionEnvironment = 'Test'`,
the XML batch wrapper contains:

```xml
<id root="2.16.840.1.113883.3.989.2.1.3.14" extension="ZZFDA_PREMKT"/>
```

FDA's ESG NextGen gateway rejected this with:

```
File sent with AS2 header "CDER_IND" must have
  N.1.4 = "ZZFDATST_PREMKT"
  N.2.r.3 = "CDER_IND"
```

ACK codes: **CR** (Case Reject) + **AR** (Application Reject — "re-send the entire transaction").

The app emitted `ZZFDA_PREMKT` because `BATCH_RECEIVERS.Test.Premarket` was set to that value.
The correct test-environment value is `ZZFDATST_PREMKT`.

---

## 2. Root Cause

The FDA gateway identifier scheme follows the same `_TST` suffix convention for both pathways:

| Env        | Postmarket      | Premarket           |
|------------|-----------------|---------------------|
| **Test**   | `ZZFDATST`      | `ZZFDATST_PREMKT`   |
| **Production** | `ZZFDA`     | `ZZFDA_PREMKT`      |

In the postmarket path this was understood correctly — `BATCH_RECEIVERS.Test.Postmarket = 'ZZFDATST'`.
For premarket, the mistaken assumption was that test and production share the same value
(`ZZFDA_PREMKT`). They do not. The ACK3 explicitly names the required test value.

Note: `N.2.r.3 = 'CDER_IND'` (the inner PORR message receiver) was already correct and
requires no change.

---

## 3. Files to Change

### 3.1 `faers-app/src/shared/types/case.types.ts`

This is the **single source of truth**. All XML generation paths (`xmlGeneratorService`,
`batchService`, `submission.handlers`) consume `BATCH_RECEIVERS` via import — fixing this
one constant fixes all of them.

**Change the comment block and the Test.Premarket value:**

```typescript
// BEFORE (lines ~666–681):
// Batch receiver identifiers for FDA ESG. Test and Production use the same
// premarket value; the test/production split happens at the network endpoint
// level, not in the receiver ID. Confirmed by the IND SUSAR gap analysis
// (test/test_submission/IND-SUSAR-XML-Gap-Analysis.docx, Apr 2026): the
// `ZZFDATST_PREMKT` identifier we briefly used in this codebase is not
// recognised by any FDA gateway. Postmarket follows the standard `_TST`
// suffix convention because that path has a real test variant.
export const BATCH_RECEIVERS: Record<SubmissionEnvironment, Record<SubmissionReportType, string>> = {
  Test: {
    Postmarket: 'ZZFDATST',
    Premarket: 'ZZFDA_PREMKT'      // ← WRONG
  },
  Production: {
    Postmarket: 'ZZFDA',
    Premarket: 'ZZFDA_PREMKT'
  }
};
```

```typescript
// AFTER:
// Batch receiver identifiers (N.1.4) for the FDA ESG NextGen gateway.
// The test/production split follows the same `_TST` suffix convention for
// both pathways. Confirmed by ACK3 on IND-T01 (2026-04-27, GAP-IND-001):
// FDA explicitly requires N.1.4 = "ZZFDATST_PREMKT" when submitting via
// AS2 header "CDER_IND" in the test environment.
export const BATCH_RECEIVERS: Record<SubmissionEnvironment, Record<SubmissionReportType, string>> = {
  Test: {
    Postmarket: 'ZZFDATST',
    Premarket: 'ZZFDATST_PREMKT'   // ← FIXED
  },
  Production: {
    Postmarket: 'ZZFDA',
    Premarket: 'ZZFDA_PREMKT'
  }
};
```

### 3.2 `faers-app/src/main/services/faersEmpiricalPolicy.ts`

Update the `IND_POLICY` entry for `batchReceiver` and the section comment.

```typescript
// BEFORE (lines ~113–138):
//  Every IND field starts as `untested` — the app has never successfully
//  round-tripped a ZZFDA_PREMKT submission, so there is no evidence yet that
//  any specific value is accepted or rejected. ...
export const IND_POLICY: Record<string, IndPolicyEntry> = {
  ...
  batchReceiver: { value: 'ZZFDA_PREMKT',   verdict: 'untested' },
  msgReceiver:   { value: 'CDER_IND',        verdict: 'untested' }
};
```

```typescript
// AFTER:
//  IND fields start as `untested`. GAP-IND-001 (2026-04-27) provides the
//  first real ACK3 evidence: ZZFDA_PREMKT is rejected in Test environment;
//  ZZFDATST_PREMKT is required. batchReceiver is promoted to proven_rejected
//  for the old value and untested for the correct new value.
//  CDER_IND was confirmed correct by the same ACK (no rejection for N.2.r.3).
export const IND_POLICY: Record<string, IndPolicyEntry> = {
  ...
  batchReceiver: { value: 'ZZFDATST_PREMKT', verdict: 'untested',
                   evidence: 'ZZFDA_PREMKT proven_rejected by IND-T01 ACK3 2026-04-27 (GAP-IND-001)' },
  msgReceiver:   { value: 'CDER_IND',        verdict: 'untested' }
};
```

---

## 4. Call Sites — No Direct Changes Needed

These files all resolve the batch receiver via `BATCH_RECEIVERS[environment][reportType]`.
Fixing the constant in `case.types.ts` is sufficient — no edits required here:

| File | Line | Pattern |
|------|------|---------|
| `src/main/services/xmlGeneratorService.ts` | ~144 | `BATCH_RECEIVERS[environment][reportType]` |
| `src/main/services/batchService.ts` | ~332 | `BATCH_RECEIVERS[submissionEnvironment][reportType]` |
| `src/main/ipc/submission.handlers.ts` | ~257 | `BATCH_RECEIVERS[environment][repType]` |

Verify after the fix that all three emit `ZZFDATST_PREMKT` for `Test + Premarket` by grepping
the generated XML or running the integration test.

---

## 5. SettingsDialog UI Copy

`src/renderer/components/submission/SettingsDialog.tsx` line ~232 contains help text:

```
Postmarket uses ZZFDA routing, Premarket uses ZZFDA_PREMKT
```

Update to:

```
Postmarket uses ZZFDA routing (test: ZZFDATST). Premarket uses ZZFDA_PREMKT (test: ZZFDATST_PREMKT).
```

---

## 6. Regenerate Test Packages After Fix

After applying the code fix, regenerate all three IND test packages — FDA's AR reject
requires a full re-send with a new batch UUID and new transmission timestamp:

- `IND-T01-susar-baseline.xml`
- `IND-T02-susar-repeat.xml`
- `IND-T05-fatal-seven-day.xml`

Do **not** reuse the old packages — the batch UUIDs from the rejected submissions are
already on record at the gateway.

---

## 7. Verification

After regenerating, confirm in the new XML:

```xml
<!-- Correct for Test + Premarket -->
<id root="2.16.840.1.113883.3.989.2.1.3.14" extension="ZZFDATST_PREMKT"/>

<!-- Correct inner PORR receiver — unchanged -->
<id root="2.16.840.1.113883.3.989.2.1.3.12" extension="CDER_IND"/>

<!-- Correct version for initial reports — unchanged -->
<id root="2.16.840.1.113883.3.989.2.1.3.4" extension="2"/>
```

Submit IND-T01 first. A successful round-trip (CA + AA) closes this gap and promotes
`IND_POLICY.batchReceiver` to `proven_safe`.

---

## 8. Gateway Identifier Reference (Updated)

| Environment | Postmarket N.1.4 | Premarket N.1.4   | Inner receiver N.2.r.3 |
|-------------|------------------|-------------------|------------------------|
| Test        | `ZZFDATST`       | `ZZFDATST_PREMKT` | `CDER_IND`             |
| Production  | `ZZFDA`          | `ZZFDA_PREMKT`    | `CDER_IND`             |

Source: FDA ACK3 for IND-T01 submission, 2026-04-27.
Postmarket test value (`ZZFDATST`) empirically confirmed by postmarket golden v37 (CA+AA).
Premarket test value (`ZZFDATST_PREMKT`) required by FDA error message in IND-T01 ACK3.
Premarket production value (`ZZFDA_PREMKT`) inferred — not yet empirically confirmed.
