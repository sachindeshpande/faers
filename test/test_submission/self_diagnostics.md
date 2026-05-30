# ESGNG219 / Companies API 500 — Self-Diagnostic Checklist

**Goal:** Exhaust client-side causes before opening a helpdesk ticket. Steps are ordered cheapest-first.

**Working assumption:** The defect is in our request shape, our response interpretation, or our account configuration on the USP portal — not in the FDA backend.

---

## Tier 1 — Cheap checks (10–20 minutes total)

### 1.1 Re-read the Companies API response schema in the spec
- File: `docs/esg_nextgen_api_specification_v1.2_-_march_2026.pdf`
- Locate the `GET /api/esgng/v1/companies` response definition.
- Confirm whether the field literally named `company_id` represents the submitter company, the user's assigned FDA center, or something else.
- **If the response object also contains a separate field like `center_id`, `fda_center`, or `assigned_center`** — then `company_id: 2 / CDER` may simply mean "you're assigned to CDER; your submitter company info is in a different field we haven't been reading."
- Also check: does the response contain an array (multiple companies) rather than a single object? We may be reading `[0]` when we should look at a different element.

### 1.2 Verify the credential body schema
- Same PDF, locate `POST /api/esgng/v1/credentials/api/test`.
- For each field in our body, confirm: name, type (string vs int), required vs optional, allowed enum values.
- Pay particular attention to `company_id`: the spec may want DUNS, EIN, or a portal-issued code — not a numeric DB id.
- Check whether any field is required that we currently omit.

### 1.3 Confirm the company_id displayed in the USP portal
- Log into the USP portal → User Management / Company profile.
- Look for any numeric or alphanumeric company identifier shown on screen, in URLs, or in account metadata.
- If a value is visible there, that's the value you should be sending — not whatever the (broken) Companies API returned.

### 1.4 Verify the OAuth token works against another endpoint
- The token from `/as/token.oauth2` may be valid but scoped wrong.
- Try the token against the Payload GET (Step 3) endpoint: `GET upload-api-esgng.fda.gov/rest/forms/v1/fileupload/payload`.
- If Step 3 succeeds with the same token: scope is fine; problem is body content. If Step 3 also fails with auth errors: scope/audience is wrong.

---

## Tier 2 — Reproduce and diff against Postman (30–45 minutes)

### 2.1 Capture the exact bytes of the Companies API request from `check_company.py`
Add to the script (or a one-off):

```python
import logging
import http.client
http.client.HTTPConnection.debuglevel = 1
logging.basicConfig(level=logging.DEBUG)
logging.getLogger("requests.packages.urllib3").setLevel(logging.DEBUG)
```

Or, for `requests`:

```python
prep = req.prepare()
print(prep.method, prep.url)
print(prep.headers)
print(prep.body)
```

Capture: full URL (including how `@` is encoded), every header byte, and the response status, headers, and body.

### 2.2 Replay the same request via curl with `-v`
```bash
curl -v "https://external-api-esgng.fda.gov/api/esgng/v1/companies?user_email=sachindeshpande@deepquence.com" \
  -H "accesstoken: <token>" \
  -H "Accept: application/json"
```

Then again with the email URL-encoded:
```bash
curl -v "https://external-api-esgng.fda.gov/api/esgng/v1/companies?user_email=sachindeshpande%40deepquence.com" \
  -H "accesstoken: <token>" \
  -H "Accept: application/json"
```

If one returns 200 and the other 500, you've found it.

### 2.3 Reproduce the original Postman success
- Open Postman history; find the call that returned `{ company_id: 2, company_name: "CDER" }`.
- Postman → "Code → cURL" — copy the exact bytes.
- Diff against the script's bytes (from step 2.1).
- The delta is the bug. Common deltas: header casing, header order, query encoding, presence/absence of `Accept`, `User-Agent`, `Connection`, cookies.

### 2.4 Try common header variants
The spec confirms the credential & payload endpoints use `accesstoken`, but the Companies API may differ. Try one at a time:

```
accesstoken: <token>
Accesstoken: <token>
Authorization: Bearer <token>
Authorization: <token>
X-AccessToken: <token>
```

Also confirm `Content-Type: application/json` is being sent on the credential POST — some frameworks return 500 if it's missing on a JSON body.

---

## Tier 3 — Probe the credential endpoint to localize the failure (20–30 minutes)

ESGNG219 is "Invalid combination." Bisect which field is invalid by sending one degraded variant at a time and watching the error code shift.

| Test | Body change | Expected diagnosis |
|---|---|---|
| Baseline | (current body, ESGNG219) | Reference |
| Drop `company_id` | omit field entirely | If error becomes ESGNG334 → field is required, current value is wrong type/value. If still ESGNG219 → another field is wrong. |
| `company_id: null` | JSON null | Compare with above |
| `company_id` as integer 2 | `"company_id": 2` | If error changes → type mismatch is part of the issue |
| Try EIN as company_id | `"company_id": "33-4818134"` | If accepted → field expects EIN |
| Try DUNS if available | `"company_id": "<duns>"` | If accepted → field expects DUNS |
| Drop `submission_name` | omit | Test required-ness |
| Drop `file_count` | omit | Test required-ness |
| `submission_type: "ICSR"` | known to fail | Sanity check the harness still produces ESGNG334 |

Record the exact `esgngcode` and `esgngdescription` for each. The pattern reveals which field is invalid.

### 3.1 Confirm tokens are fresh per test
Tokens from `/as/token.oauth2` typically expire quickly. If you see auth errors mid-bisect, refresh.

### 3.2 Inspect the OAuth token claims
Decode the JWT (jwt.io or `cut -d. -f2 | base64 -d`) and read:
- `aud` (audience) — should match the resource server you're calling
- `scope` — should include whatever is required for `companies` and `credentials` endpoints
- `exp` — confirm not expired
- `client_id` — matches your `.env`
- Any custom claim like `user_id`, `company_id`, `org_id` — see if it matches what we're sending in the body. Mismatch between token and body claims is a common 219-class error cause.

---

## Tier 4 — Configuration and account-state checks (15–30 minutes)

### 4.1 USP portal account walkthrough
- User Management → confirm: company name, role (Power User), agency status (No), production approval.
- Non-Repudiation Letter status — confirm "Approved" not "Pending."
- Submission types — confirm AERS is enabled for this user.
- Look for any provisioning status that says "Pending" beyond the expected production-approval pending state.

### 4.2 Compare with a known-working teammate (if available)
If anyone else at DeepQuence has API access:
- Have them call Companies API with their email — does it return DeepQuence's real company_id?
- If yes: your user record is the only one mis-provisioned (still a config issue, but on your account).
- If no: shared account-state issue, not user-specific.

### 4.3 Compare against an FDA-published sample
The spec PDF and the API guide PDF (`docs/esg_nextgen_api_guide_v1.2_-_march_2026.pdf`) typically include sample request/response pairs. Diff your bodies against the samples field-by-field and confirm casing, types, and structure match exactly.

### 4.4 Check the API base URLs again
- Token: `external-api-esgng.fda.gov/as/token.oauth2`
- Credential & Companies: `external-api-esgng.fda.gov/api/esgng/v1/...`
- Payload, Upload, Submit: `upload-api-esgng.fda.gov/rest/forms/v1/...`

Confirm we're not accidentally calling Companies on the upload host or vice versa — the hosts are different and a wrong host would explain a 500.

---

## Tier 5 — Code review of `submit_batch.py` and `check_company.py`

### 5.1 Companies API call path in `check_company.py`
Look for:
- Hardcoded vs templated URL — typo in path (`/companies` vs `/company`)
- Query string assembly — `params={...}` vs string concatenation; encoding behavior
- Headers dict — exact spelling and casing
- `requests.get(...)` vs `session.get(...)` — session may inject stale cookies/headers
- Response parsing — do we read `.json()` or `.text`? On a 500 with empty body, `.json()` raises and we may be swallowing the real status

### 5.2 Credential call path in `submit_batch.py`
- Body construction — confirm types of every field as serialized (a Python int will become JSON int; a `"1"` string stays a string)
- `submission_name` derivation — does it strip extension, lowercase, sanitize? Some endpoints reject names with spaces or non-ASCII characters
- `company_id` source — is it being read from `.env` as a string and we should be casting to int?
- Token reuse — is the same token being used across calls minutes apart? If so, refresh token freshness checks

### 5.3 Logging hygiene
Add request/response logging at INFO level for every API call. Include:
- Method, full URL
- Request headers (redact `accesstoken` to first 8 chars + `…`)
- Request body (compact JSON)
- Response status, headers, body
- Round-trip latency

This makes Tier 6 (helpdesk ticket) immediate to write if needed.

---

## Tier 6 — Only if Tiers 1–5 don't resolve

Send the helpdesk email draft (`helpdesk_email_draft.md`). By that point you'll have:
- Exact request/response bytes with timestamps
- A list of bisect tests run and their results
- Confirmation that account state in the portal is correct
- Confidence that the issue isn't a typo, encoding bug, or schema misread on your side

That's enough information for a helpdesk engineer to triage in one read.

---

## Decision tree summary

```
Step 1: Re-read spec for response schema (1.1, 1.2)
    └── Misread? → Fix client → retry → unblocked
Step 2: Find company_id in USP portal (1.3)
    └── Found? → Use that value → retry → unblocked or new error code
Step 3: Diff Postman vs script bytes (2.3)
    └── Found delta? → Fix client → retry → unblocked
Step 4: Bisect credential body fields (Tier 3)
    └── Localizes which field is invalid → fix → unblocked or known-good
Step 5: Decode JWT claims (3.2)
    └── Token mismatch with body → fix client or token request → unblocked
Step 6: Account state walkthrough in portal (4.1)
    └── Provisioning gap visible → fix in portal → unblocked
Step 7: Code review (Tier 5)
    └── Bug in URL/headers/body assembly → fix → unblocked
Step 8: Helpdesk ticket (Tier 6)
    └── Send tightened email with all the above evidence attached
```
