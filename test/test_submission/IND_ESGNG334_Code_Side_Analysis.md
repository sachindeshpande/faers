# IND ESGNG334 — Code-Side Analysis & Recommendations

**Author's stance:** The brief in `IND_Troubleshooting_Technical_Brief.md` concludes the failure is an account enrollment gap requiring AEMSESUB intervention. This document argues there is a likely **code-side cause** that should be ruled out first, identifies it concretely, and provides a sequenced test plan to confirm or eliminate it before the helpdesk email goes out.

**Date:** 2026-05-01
**Subject:** API credential endpoint returns ESGNG334 for IND files
**Prior context:** All postmarket AERS/CDER submissions succeed (27 files). All 7 IND XMLs were accepted CA+AE through the portal. Portal also shows separate admin decline.

---

## 1. The logical gap in the brief

The brief's evidence table lists three fda_center / submission_type combinations:

| fda_center | submission_type | Result |
|---|---|---|
| `CDER` | `IND` | ESGNG334 |
| `CDER_IND` | `AERS` | ESGNG334 |
| `CDER_IND` | `IND` | **Untested** — brief: "expected to also fail" |

Both tested combinations are **mismatched pairs** — postmarket center with premarket type, and premarket center with postmarket type. The error message reads literally:

> "Center and Submission Type validation failed"

That is exactly what a combination validator would say for a mismatched pair. The brief uses two failed *mismatch* tests to conclude that the *matched* combination would also fail. That inference is not supported by the data. The matched combination `CDER_IND + IND` is the one cell that has not been tested, and it is the most likely cell to actually succeed.

## 2. Where the bug appears to be

`submit_batch.py`, lines 327–333:

```python
if filename.startswith("IND-"):
    submission_type = os.getenv("ESG_SUBMISSION_TYPE_IND", "AERS")
    fda_center      = os.getenv("ESG_CENTER_IND", "CDER_IND")
else:
    submission_type = os.getenv("ESG_SUBMISSION_TYPE", "AERS")
    fda_center      = os.getenv("ESG_CENTER", "CDER")
```

The default `submission_type` for IND files is hardcoded to `"AERS"`. The justification in the comment block immediately above is:

> "submission_type remains 'AERS' for IND ICSRs — they go to FAERS regardless of track."

This conflates two things:

- **FAERS** is the destination database. It does receive both postmarket and premarket ICSRs.
- **`submission_type`** is the FDA Center Submission Type API field. It distinguishes AERS (postmarket) from IND (premarket) as separate values, regardless of which database the report ultimately lands in.

This is the same family of mistake documented in the prior `ESG_NextGen_Error_Fix_Report.docx`:

- Default `Content-Type: application/json` was added to a GET request → 500
- Default `company_id=2` was assumed correct from a poisoned response → ESGNG219
- Default `description` field was removed assuming optional → ESGNG219
- **Default `submission_type=AERS` for IND files assumes FAERS routing equals AERS submission_type → ESGNG334**

Pattern: a plausible-sounding hypothesis was baked into the code without confirming against the spec or the Center Submission Types reference.

## 3. Why ESGNG334 is not necessarily an authorization gate

The brief makes three claims supporting the enrollment-block reading. Each is weaker than presented.

**Claim A — "ESGNG334 is undocumented in the spec table 210–219, therefore it is an authorization layer."**
The spec lists field-level validation errors. ESGNG334's literal name is "Center and Submission Type validation failed" — the most parsimonious reading is that it is a *combination* validator running after individual field validation, i.e., "you sent a valid fda_center value and a valid submission_type value, but the pair is not legal." That is combinatorial validation, not authorization.

**Claim B — "Both tested combinations return ESGNG334 → must be an account-level block."**
Both tested combinations are *invalid pairs*. ESGNG334 firing on both is fully consistent with combination validation. To distinguish authorization from validation, you have to test a combination that is *expected to be valid*. The brief did not.

**Claim C — "Portal admin decline confirms it is enrollment."**
The portal admin decline and the API ESGNG334 happen at different points in the pipeline:

- API ESGNG334: fires at Step 1 (credential creation), *before* any XML is uploaded
- Portal admin decline: appears *after* the XML is fully uploaded and CA+AE-accepted by the gateway

Different layers can have different causes. The brief's §2 also notes the portal decline contains "no sub-code or additional reason field" — meaning the actual cause is unknown. Treating it as a confirmed enrollment block, then using that to interpret the API error, double-counts a single uncertain signal.

## 4. Pre-helpdesk test plan

Three cheap tests, ten minutes of work. Run in order; stop as soon as any test resolves the issue.

### Test A — the untested matched combination (highest priority)

Set in `.env`:
```
ESG_SUBMISSION_TYPE_IND=IND
ESG_CENTER_IND=CDER_IND
```

Run a single IND file:
```
python submit_batch.py --file IND-T01-susar-baseline.xml
```

**Expected outcomes:**

| Result | Interpretation |
|---|---|
| ESGNG210 / core_id returned | Code default was wrong. Issue resolved. Update default in code, document the fix. Do not send helpdesk email. |
| ESGNG334 (same as before) | Matched combo also rejected. Move to Test B. |
| Different error code or message | New diagnostic information. Capture and re-evaluate. |

### Test B — alternative submission_type strings

If Test A returns ESGNG334, try these `ESG_SUBMISSION_TYPE_IND` values one at a time, keeping `ESG_CENTER_IND=CDER_IND`:

- `IND_SR`
- `IND_SAFETY_REPORT`
- `INDSR`
- `PSR` (Premarket Safety Report)
- `IND_SAFETY`
- `INDSAFETY`

Watch for any change in the error code, message, or HTTP status. Even a *different* error from one of these is informative — it would mean the field is being parsed but not yet matching.

### Test C — fda_center variants

If Tests A and B don't resolve, try these `ESG_CENTER_IND` values with `ESG_SUBMISSION_TYPE_IND=IND`:

- `CDER` (the postmarket center the account is enrolled for, paired with type=IND)
- `CDER_PREMKT`
- `CDER_PMKT`
- `CDERIND` (no underscore)

If A, B, and C all return identical ESGNG334 with no message variation, that is much stronger evidence for the enrollment-block hypothesis than the brief's current data.

### What success looks like at each test

Capture the credential request body, response status, response body, and `core_id` (if any) for every variant. Build a small results table — that data should also go into the helpdesk email if you ultimately need to send it, because it shows the helpdesk you have already eliminated the obvious client-side variants.

## 5. Other code-side checks worth a glance

These are lower-priority but cheap to verify if Tests A–C don't move the needle.

### 5.1 OAuth scope

`submit_batch.py` line 195:
```python
"scope": "openid profile",
```

Same scope is used for both AERS and IND. The brief itself flags this as a possible issue. Decode the JWT (snippet provided in the brief §5) and check:

- `aud` (audience) — does it cover the IND track resource server?
- `scope` — any IND-specific scope present or absent?
- `roles` / `permissions` / custom claims — anything mentioning `IND`, `PREMKT`, `safety_report`, etc.?
- Any `center` or `track` claim — does it list both CDER and CDER_IND, or only CDER?

If the JWT contains a center or scope claim that names only CDER, that would be a strong signal that the OAuth client is provisioned only for postmarket — which is genuinely an enrollment-class issue, but specific to the OAuth client rather than the company record.

### 5.2 description field

Currently:
```python
"description": f"FAERS ICSR test submission — {submission_name}"
```

The em-dash (`—`) is non-ASCII. Some validators reject it on certain endpoints. AERS works with this exact string, so it is unlikely to be the cause, but if everything else is exhausted, try:

- ASCII-only: `f"FAERS ICSR test submission - {submission_name}"`
- Shorter: `submission_name`
- More IND-specific: `f"IND safety report - {submission_name}"`

### 5.3 submission_protocol

Always `"API"`. If exhausted other variants, try `"REST"`, `"API_PREMKT"`, or `"API_TEST"`.

### 5.4 Endpoint URL

Currently both AERS and IND use:
```
POST {AUTH_BASE}/api/esgng/v1/credentials/api/test
```

Less likely, but check whether the spec mentions a separate test endpoint for premarket (e.g., `/credentials/api/test_premkt`). If not in the spec, this is unlikely to be the issue — but worth a quick grep of the API spec PDF.

### 5.5 Possible missing IND-specific fields

The credential body for IND may require additional fields the AERS body does not — e.g., `study_id`, `ind_number`, `protocol_id`, or `nct_number`. Worth scanning the spec for any conditional-required field that triggers when `submission_type=IND` or `fda_center=CDER_IND`. The current code sends an identical body shape for both tracks; if IND requires an extra field, ESGNG334 could be the validator's way of saying so.

## 6. Decision tree

```
Test A: CDER_IND + IND
├── Success (ESGNG210)  → Fix default in code → Done. No helpdesk email.
└── ESGNG334
    └── Test B: alternative submission_type strings
        ├── Any variant succeeds → Update code default → Done.
        ├── Different error returned → Re-analyze → Possibly send refined helpdesk question.
        └── All identical ESGNG334
            └── Test C: alternative fda_center strings
                ├── Any variant succeeds → Update code default → Done.
                ├── Different error returned → Re-analyze.
                └── All identical ESGNG334
                    └── Decode JWT claims (§5.1)
                        ├── Scope/role gap visible → Helpdesk: OAuth client provisioning, not company enrollment
                        └── No scope gap visible → Helpdesk email as currently drafted, but include the full A/B/C results table as evidence of client-side elimination
```

## 7. Concrete code change to apply if Test A succeeds

If Test A passes, change `submit_batch.py` to default the IND `submission_type` to `IND` rather than `AERS`:

```python
# Before:
if filename.startswith("IND-"):
    submission_type = os.getenv("ESG_SUBMISSION_TYPE_IND", "AERS")
    fda_center      = os.getenv("ESG_CENTER_IND", "CDER_IND")

# After:
if filename.startswith("IND-"):
    submission_type = os.getenv("ESG_SUBMISSION_TYPE_IND", "IND")
    fda_center      = os.getenv("ESG_CENTER_IND", "CDER_IND")
```

Update the comment block above to reflect the corrected reasoning:

> The `submission_type` field is the FDA Center Submission Type, not the destination database. AERS and IND are distinct submission_type values even though both ultimately route to the FAERS database. Postmarket → CDER + AERS. Premarket → CDER_IND + IND.

Also extend the prior fix report (`ESG_NextGen_Error_Fix_Report.docx`) with this entry under §2 (resolved client-side issues) once confirmed.

## 8. What does NOT change regardless of test outcome

The portal admin decline ("please email AEMSESUB@fda.hhs.gov") is a separate signal. Even if Tests A–C unblock the API path, the portal admin decline may still need an email to AEMSESUB. But that email becomes scoped narrowly to the portal-side issue, not to the API ESGNG334. The current draft conflates the two.

## 9. Recommended sequence of actions

1. Run Test A. (5 minutes.)
2. If Test A passes: apply the code fix in §7, retest all 7 IND files, document the resolution.
3. If Test A fails: run Tests B and C; record results.
4. Decode JWT claims regardless of A/B/C outcome — useful evidence either way.
5. Only after A/B/C and JWT inspection are documented, decide whether to send the helpdesk email.
6. If helpdesk email is sent, attach the A/B/C results table and JWT findings as proof of client-side elimination. Reframe the API question as "possibly OAuth client scope gap, possibly company enrollment" rather than asserting one cause.
7. Send a separate, narrower question to AEMSESUB about the portal admin decline only.

## 10. Headline

The current investigation has tested two combinations that the API was always going to reject as invalid pairs, then concluded the reason for rejection was account enrollment. The cell most likely to actually be valid (`CDER_IND + IND`) was never tested. Try it before sending the helpdesk email.
