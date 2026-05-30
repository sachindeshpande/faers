# AEMSESUB / ESGNG Helpdesk Email — IND API Enrollment

**To:** AEMSESUB@fda.hhs.gov  
**Cc:** ESGNGSupport@fda.hhs.gov  
**From:** sachindeshpande@deepquence.com  
**Subject:** IND ICSR API submission enrollment — ESGNG334 on credential step + portal admin decline (DeepQuence, company_id 31537)

---

Hello,

We are submitting IND safety reports (IND ICSRs) to FAERS in the test phase via both the ESG NextGen portal and the REST API. We have successfully submitted 27 postmarket AERS/CDER cases via the API, but all IND submissions are blocked at the credential creation step (ESGNG334). The portal also shows an administrative decline for IND submissions. We have exhausted client-side explanations and believe we need an enrollment or authorization step for the CDER_IND / ZZFDATST_PREMKT track.

## Account

| Field | Value |
|---|---|
| Company | DeepQuence |
| EIN | 33-4818134 |
| User | Sachin Deshpande |
| Email | sachindeshpande@deepquence.com |
| user_id | 33703 |
| company_id | 31537 |
| Agency | No |
| Non-Repudiation Letter | Company-Wide, uploaded 03/18/2026 |
| Production approval | Pending (expected during test phase) |

## Issue 1 — Portal admin decline for IND test submissions

When submitting IND ICSRs via the ESG portal's ZZFDATST_PREMKT channel, the ICSR ACK confirms Content Accept + Application Accept (CA+AE), but the portal also shows an administrative decline:

> "Your test submission was declined. Reason: please email AEMSESUB@fda.hhs.gov"

Affected submission IDs: ci260429052038 (IND-T02), ci260428001004 (IND-T05 early attempt).

The CA+AE ACK confirms the XML is technically correct and routes properly to ZZFDATST_PREMKT / CDER_IND. We understand this to be an account-level enrollment issue on the portal side.

## Issue 2 — API credential endpoint returns ESGNG334 for every IND combination tested

The REST API credential call returns ESGNG334 for all four center/type combinations we tested, including the matched pair:

```
POST https://external-api-esgng.fda.gov/api/esgng/v1/credentials/api/test
Headers:
  accesstoken: <valid token>
  Content-Type: application/json
```

| fda_center | submission_type | Result | Notes |
|---|---|---|---|
| `CDER` | `AERS` | ✅ ESGNG210 / core_id returned | Postmarket — works |
| `CDER` | `IND` | ESGNG334 | Mismatched pair |
| `CDER_IND` | `AERS` | ESGNG334 | Mismatched pair |
| `CDER_IND` | `IND` | ESGNG334 | Matched pair — also fails |
| `CDER_IND` | `AERS_PREMKT` | ESGNG334 | Portal UI channel label — also fails |

All four IND combinations return identical HTTP 400 / ESGNG334 "Center and Submission Type validation failed".

## What we have ruled out on the client side

We verified the following before writing to you:

**XML routing is correct.** All 7 IND XML files were accepted CA+AE via the portal (ZZFDATST_PREMKT). The XML N.2.r.3 field is `CDER_IND` and the top-level receiver is `ZZFDATST_PREMKT` in all files. XML content is not the issue.

**OAuth token is valid and used for both tracks.** The postmarket AERS submissions succeed in the same session using the same token. The token JWT payload contains:

```json
{"scope": "openid profile", "client_id": "dc-s1fdydl4b0h1i6bwpw3d1u2er", "exp": 1777667521}
```

The token carries no center-specific claims, no `aud`, and no `roles`. Since the same token grants access for `CDER/AERS` but not for any `CDER_IND` combination, the failure cannot be explained by token content — it must be a server-side authorization check on the `company_id` + `fda_center` combination.

**ESGNG334 is not documented in the API Specification v1.2** error code table (which lists ESGNG210–ESGNG219 for the credential endpoint), further indicating it is an account-authorization gate, not a field-string validation error.

**Every combination involving `CDER_IND` returns ESGNG334**, including the matched pair (`CDER_IND + IND`) and the portal UI's own channel label (`CDER_IND + AERS_PREMKT`). This rules out any field-value mismatch and confirms the block is on the `CDER_IND` center regardless of `submission_type`.

## Questions

1. What enrollment or account configuration step is required for DeepQuence (company_id 31537, user_id 33703) to submit IND ICSRs via the ZZFDATST_PREMKT / CDER_IND track via the REST API?

2. What are the correct `fda_center` and `submission_type` string values for IND safety reports in the credential API body? The API Guide §3 references the Center Submission Types table at fda.gov/industry/getting-started-esg-nextgen/center-submission-types but does not reproduce it — please confirm the exact tokens for the FAERS IND ICSR track.

3. Is the portal admin decline (Issue 1) the same enrollment gap as the API ESGNG334 (Issue 2), or are these separate account-configuration issues requiring separate steps?

## What we can provide

Full verbose logs with timestamps, request/response headers, credential request body, and response body for any of the combinations above. We can re-run on demand at any timestamp you specify.

Thank you for your assistance.

Sachin Deshpande  
DeepQuence  
sachindeshpande@deepquence.com
