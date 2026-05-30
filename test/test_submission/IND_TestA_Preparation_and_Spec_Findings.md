# IND ESGNG334 — Test A Preparation & Pre-Run Findings

**Date:** 2026-05-01  
**Status:** Ready to run — one command needed from your terminal  
**Context:** Implements the recommended actions from `IND_ESGNG334_Code_Side_Analysis.md`

---

## Changes Made (already applied to your files)

### 1. `.env` — IND track vars now explicit

Added four new lines to `/faers/test/test_submission/.env`:

```
# Postmarket track (TC-* files)
ESG_CENTER=CDER
ESG_SUBMISSION_TYPE=AERS

# IND / premarket track (IND-* files) — Test A: matched pair CDER_IND + IND
ESG_CENTER_IND=CDER_IND
ESG_SUBMISSION_TYPE_IND=IND

ESG_AUTHORIZING_COMPANY_ID=
```

Previously the script was falling back to its hardcoded default `submission_type="AERS"` for IND files because these vars were absent from `.env`. The default is now `IND` via the explicit env var.

### 2. `submit_batch.py` — Three diagnostic improvements

**a) JWT claim decoder** (fires on every new token fetch, ~40 lines added before `TokenManager`):  
Decodes the JWT header and payload without a network call, logs all fields, and specifically highlights `scope`, `aud`, `roles`, `permissions`, and any claim value containing `IND`/`PREMKT`/`PREMARKET`. This answers the OAuth scope question (§5.1 of the analysis) automatically on the next run.

**b) Verbose credential response logging** (one line added in `submit_one`):
```python
log.info(f"│   Credential response: HTTP {r1.status_code}  body={r1.text[:500]}")
```
This logs the full HTTP status and response body for the credential call regardless of success or failure, making the diff between IND and AERS calls unambiguous in the log.

**c) Token scope echo** (one line added in `TokenManager.get`):
```python
log.info(f"Token scope returned by server: {body.get('scope', '(not in response)')}")
```

---

## Pre-Run Finding: API Spec Does Not Define Valid `submission_type` Values for FAERS

Both the API Specification v1.2 and the API Guide v1.2 PDFs were fully extracted and searched. Key findings:

**`submission_type` field definition (spec §2.2 / §2.3):**
> "The type of submission being made (e.g., 510K, NDA)."  
> Type: string | Required: Yes | Example: "510K"

The spec uses `510K` and `NDA` as the only examples — both are CBER/CDER device/drug approval submission types, not FAERS safety report types. Neither `AERS` nor `IND` appears anywhere in either PDF.

**Guide §3 — FDA Center and Submission Types:**
> "For a list of FDA Center and Submission Types to referenced when populating the Center and Submission type in the 'Generate Submission ID and Temp Credentials' API, please see **Center Submission Types | FDA**"

The guide defers entirely to the external FDA page (`fda.gov/industry/getting-started-esg-nextgen/center-submission-types`), which is blocked by the network egress proxy in this environment.

**Implication for Test A:**  
The spec does not enumerate valid `submission_type` values for the FAERS/ICSR track. The value `AERS` that works for postmarket submissions was established empirically (it works), not from the spec. The value `IND` for the premarket track is the primary hypothesis — it is the most natural pairing for `fda_center=CDER_IND`, mirroring how `AERS` pairs with `CDER`. Test A will confirm or refute this.

**No IND-specific additional credential body fields found:**  
The spec lists the same body schema for both the production and test credential endpoints. There are no conditional-required fields that appear when `submission_type=IND` or `fda_center=CDER_IND`. The body shape being sent is correct.

---

## What to Run

From your terminal, in the `test/test_submission/` directory:

### Step 1 — Test A: single IND file with CDER_IND + IND

```bash
cd test/test_submission
python submit_batch.py --skip-companies --file IND-T01-susar-baseline.xml
```

This will:
1. Fetch an OAuth token and **log the full JWT claims** (scope, aud, roles)
2. Attempt the credential call with `fda_center=CDER_IND, submission_type=IND`
3. Log the **full credential response** (HTTP status + body)
4. If it succeeds: proceed through upload and submit steps

### Step 2 — Interpret the result

| Credential response | Interpretation | Next action |
|---|---|---|
| `ESGNG210` + `core_id` returned | `CDER_IND + IND` works. Code default was wrong. | Apply code fix (see below), resubmit all 7 IND files. |
| `ESGNG334` (same as before) | Matched pair also rejected → enrollment block hypothesis gains strong support. | Run Test B (see below). |
| Different error code | New diagnostic. | Capture and share for re-analysis. |

---

## If Test A Succeeds — Code Fix to Apply

Change one line in `submit_batch.py` (~line 370):

```python
# Before (wrong default — conflates FAERS database name with submission_type field):
submission_type = os.getenv("ESG_SUBMISSION_TYPE_IND", "AERS")

# After (correct):
submission_type = os.getenv("ESG_SUBMISSION_TYPE_IND", "IND")
```

Then resubmit all 7 IND files:
```bash
python submit_batch.py --skip-companies
```

---

## If Test A Returns ESGNG334 — Test B Commands

Keep `ESG_CENTER_IND=CDER_IND`. Try these `ESG_SUBMISSION_TYPE_IND` values one at a time, watch for any change in error code or message:

```bash
# B1
ESG_SUBMISSION_TYPE_IND=IND_SR python submit_batch.py --skip-companies --file IND-T01-susar-baseline.xml

# B2
ESG_SUBMISSION_TYPE_IND=PSR python submit_batch.py --skip-companies --file IND-T01-susar-baseline.xml

# B3
ESG_SUBMISSION_TYPE_IND=INDSR python submit_batch.py --skip-companies --file IND-T01-susar-baseline.xml

# B4
ESG_SUBMISSION_TYPE_IND=IND_SAFETY_REPORT python submit_batch.py --skip-companies --file IND-T01-susar-baseline.xml
```

### If Tests A and B all return identical ESGNG334 — Test C Commands

Keep `ESG_SUBMISSION_TYPE_IND=IND`. Try these `ESG_CENTER_IND` values:

```bash
# C1 — try the enrolled postmarket center with premarket type
ESG_CENTER_IND=CDER python submit_batch.py --skip-companies --file IND-T01-susar-baseline.xml

# C2
ESG_CENTER_IND=CDER_PREMKT python submit_batch.py --skip-companies --file IND-T01-susar-baseline.xml

# C3
ESG_CENTER_IND=CDERIND python submit_batch.py --skip-companies --file IND-T01-susar-baseline.xml
```

---

## What to Capture From the Run

For every variant tested, note:
- Credential request body (`fda_center` + `submission_type` values)
- HTTP status code
- Response body (full `errorCode` + `message`, or `core_id` on success)
- JWT highlights logged (scope, aud, roles, any IND-related claims)

Build this table as you go — it belongs in the helpdesk email if you ultimately need to send it:

| fda_center | submission_type | HTTP | errorCode | message |
|---|---|---|---|---|
| CDER | AERS | 200 | ESGNG210 | ✅ core_id returned |
| CDER | IND | 400 | ESGNG334 | Center and Submission Type validation failed |
| CDER_IND | AERS | 400 | ESGNG334 | Center and Submission Type validation failed |
| CDER_IND | IND | ? | ? | **← Test A** |

---

## JWT Claims — What to Look For

When the run starts, the log will print something like:

```
JWT header : {"alg": "RS256", "typ": "JWT"}
JWT payload: {"iss": "...", "sub": "...", "aud": "...", "scope": "openid profile", ...}
JWT highlights: {"scope": "openid profile", "aud": "..."}
```

**Red flags that indicate OAuth client provisioning issue (not just company enrollment):**
- `scope` contains only `openid profile` with no FAERS/IND/CDER-related scope
- `aud` names a resource server that does not include the IND/premarket endpoint
- `roles` or `permissions` lists only AERS/postmarket grants
- Any claim explicitly lists `CDER` but not `CDER_IND`

If any of these appear, the helpdesk question becomes "does the CDER_IND track require a different OAuth scope or client registration?" rather than "does the company need enrollment?"

---

## Separate Issue: Portal Admin Decline

Regardless of how the API tests resolve, the portal admin decline ("Your test submission was declined. Reason: please email AEMSESUB@fda.hhs.gov mailbox") is a separate layer. Even if Test A unblocks the API path, the portal admin decline may still need a narrower email to AEMSESUB scoped to the portal side only.
