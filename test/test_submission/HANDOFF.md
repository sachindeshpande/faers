# ESG NextGen API Submission — Handoff Document
**Date:** 2026-05-01 (updated — all IND T02–T07 submitted via API ✅)
**Status:** 27 TC files + ALL 7 IND files submitted via API ✅ | Awaiting FDA ACK3 for all API submissions
**Goal:** Submit all FAERS ICSR XML packages to ZZFDATST / ZZFDATST_PREMKT via ESG NextGen REST API v1.2

---

## Account Details

| Field | Value |
|---|---|
| Company | DeepQuence |
| EIN | 33-4818134 |
| User | Sachin Deshpande |
| Email | sachindeshpande@deepquence.com |
| user_id | **33703** (confirmed via Companies API 2026-05-01) |
| company_id | **31537** (confirmed via Companies API 2026-05-01; company_name=DeepQuence, status=Approved) |
| Agency | No |
| Role | Power User |
| Non-Repudiation Letter | Company-Wide, uploaded 03/18/2026 |
| Approved for All Production Submission Types | Pending (expected — unlocks after all test scenarios pass) |

---

## Current Submission State (as of 2026-05-01 12:45 PT)

### Via API (`submit_batch.py`)
| Track | Files | Status |
|---|---|---|
| Postmarket TC-* (CDER/AERS/ZZFDATST) | 27 files | **SUBMITTED** — ESGNG270 "Upload Received"; awaiting FDA ACK3 |
| IND-T01 (CDER/EIND/ZZFDATST_PREMKT) | 1 file | **SUBMITTED** — core_id ci260501192746, ESGNG270 ✅ |
| IND-T02 (CDER/EIND/ZZFDATST_PREMKT) | 1 file | **SUBMITTED** — core_id ci260501194425.88743033049e429e8ab16706ec5eaf5f ✅ |
| IND-T03 (CDER/EIND/ZZFDATST_PREMKT) | 1 file | **SUBMITTED** — core_id ci260501194434.b35f8c2720864c19b34f8913d7d1360e ✅ |
| IND-T04 (CDER/EIND/ZZFDATST_PREMKT) | 1 file | **SUBMITTED** — core_id ci260501194443.475c3192891a4d99bc40d15122cb74ba ✅ |
| IND-T05 (CDER/EIND/ZZFDATST_PREMKT) | 1 file | **SUBMITTED** — core_id ci260501194452.b2950fe59acd4bf8973bf188b4c1e09a ✅ |
| IND-T06 (CDER/EIND/ZZFDATST_PREMKT) | 1 file | **SUBMITTED** — core_id ci260501194501.128b3aeced0b4e589c40e3e7cbeacfb9 ✅ |
| IND-T07 (CDER/EIND/ZZFDATST_PREMKT) | 1 file | **SUBMITTED** — core_id ci260501194510.8aa46733e0ad4d01afdef96c644194f0 ✅ |

### Via Portal (manual, from ACK_Issue_Tracker.md)
| Track | Cases | Portal ACK | Notes |
|---|---|---|---|
| Postmarket TC-A01/A05/B02/E03 | 4 | **CA+AA** ✅ | Accepted; also in ALREADY_SUBMITTED set |
| IND T01..T07 | 7 | **CA+AE** ✅ | All accepted 2026-04-30 via portal |

---

## Immediate Next Steps

All API submissions are complete. The only remaining action is to **await FDA ACK3** for the IND-T02..T07 API submissions (core_ids above). ACK3 files will arrive in `acks/` via the portal or email. Expected result: CA+AE with the standard C.5.6.r informational warning (same as all portal-submitted IND files).

If ISSUE-004 (portal admin decline for IND submissions) resurfaces — email AEMSESUB@fda.hhs.gov with the core_ids above.

---

## Correct Credential Body Values (FDA-confirmed 2026-05-01)

| Track | fda_center | submission_type | user_id / company_id type |
|---|---|---|---|
| Postmarket (TC-*) | `CDER` | `AERS` | integer |
| IND safety reports (IND-T*) | `CDER` | `EIND` | integer |

**Both tracks use `fda_center=CDER`.** The distinction is `submission_type` only: `AERS` for postmarket, `EIND` (Electronic IND) for premarket safety reports.

`user_id` and `company_id` must be sent as **integers** (no quotes) — confirmed by FDA AEMSESUB helpdesk. The API spec v1.2 incorrectly documents these as `Type: string`; the server requires integer.

Source: FDA AEMSESUB helpdesk response 2026-05-01 + Center Submission Types table at fda.gov/industry/getting-started-esg-nextgen/center-submission-types.

---

## Repository Layout

```
test_submission/
├── submit_batch.py          # Main submission script
├── check_company.py         # Diagnostic: calls Companies API, prints full response
├── .env                     # Live credentials (not in source control)
├── .env.example             # Template showing all required keys
├── HANDOFF.md               # This file
├── SUBMISSION_CAMPAIGN_REPORT.md   # Full portal submission history (postmarket + IND)
├── ACK_Issue_Tracker.md            # Portal ACK outcomes — all 11 initial cases accepted
├── docs/
│   ├── esg_nextgen_api_specification_v1.2_-_march_2026.pdf
│   └── esg_nextgen_api_guide_v1.2_-_march_2026.pdf
└── from_app/
    ├── TC-A02-race-black.xml        ← submitted 2026-05-01
    ├── headless/                    ← 8 TC files (4 submitted, 4 in ALREADY_SUBMITTED)
    ├── round2/                      ← 21 TC files (all submitted)
    └── ind/                         ← 7 IND files (T01 submitted; T02–T07 pending batch)
```

---

## .env Keys Required

```
ClientID=<from USP portal → API Management>
Secret=<from USP portal → API Management>
ESG_USERNAME=sachindeshpande@deepquence.com
ESG_PASSWORD=<USP portal password>
ESG_USER_EMAIL=sachindeshpande@deepquence.com
ESG_USER_ID=33703
ESG_COMPANY_ID=31537
ESG_CENTER=CDER
ESG_SUBMISSION_TYPE=AERS
ESG_CENTER_IND=CDER
ESG_SUBMISSION_TYPE_IND=EIND
ESG_AUTHORIZING_COMPANY_ID=     # leave blank — DeepQuence is not an agency
```

---

## API Architecture (5-Step Workflow)

| Step | Method | Base URL | Endpoint | Auth |
|---|---|---|---|---|
| 1. Token | POST | `external-api-esgng.fda.gov` | `/as/token.oauth2` | client_id + secret (form body) |
| 2. Credential | POST | `external-api-esgng.fda.gov` | `/api/esgng/v1/credentials/api/test` | `accesstoken: <token>` header |
| 3. Payload GET | GET | `upload-api-esgng.fda.gov` | `/rest/forms/v1/fileupload/payload` | `accesstoken: <token>` header |
| 4. File Upload | POST | `upload-api-esgng.fda.gov` | `/rest/forms/v1/fileupload/payload/{payloadID}/file` | `accesstoken: <token>` header + multipart |
| 5. Submit | POST | `upload-api-esgng.fda.gov` | `/rest/forms/v1/fileupload/payload/{payloadID}/submit` | No token — body: username/password/sha256_checksum |

**Critical:** The non-standard header name is `accesstoken` (not `Authorization: Bearer`).

---

## All Fixes Applied to submit_batch.py

| Fix | Detail |
|---|---|
| Auth header | `Authorization: Bearer` → `accesstoken: <token>` everywhere |
| Upload step auth | Added `accesstoken` header to Step 4 multipart upload (spec §2.5) |
| `authorizing_company_id` | Removed for non-agency accounts; only sent when `ESG_AUTHORIZING_COMPANY_ID` set |
| `company_id=2` guard | Logs ERROR and explains the mismatch |
| `company_status` check | Logs WARNING if Companies API returns non-Approved status |
| `--skip-companies` flag | Bypass broken Companies API pre-flight |
| `description` field | Re-added to credential body (required per spec §2.2/§2.3) |
| Payload `data` envelope | Unwrap `{"data": {...}}` before reading payloadId / uploadFileLink |
| Companies API `@` encoding | Build URL string manually (params= encodes @ as %40; FDA server needs literal @) |
| Companies API Content-Type | Removed Content-Type header from GET — sending it returns HTTP 500 |
| `user_id` / `company_id` values | Corrected to 33703 / 31537 (were poisoned by bad Companies API response) |
| `user_id` / `company_id` types | Changed from `str()` to `int()` — FDA server requires integers; spec incorrectly says string |
| IND `fda_center` | `CDER_IND` → `CDER` — both tracks use CDER; confirmed by FDA helpdesk |
| IND `submission_type` | `AERS` / `IND` / `AERS_PREMKT` → `EIND` — confirmed by FDA helpdesk + Center Submission Types table |
| Batch file discovery | Added `FROM_APP.glob("TC-*.xml")` to catch TC-A02 in from_app/ root |
| DRY_RUN log fix | Log entries no longer written during dry runs |
| JWT decode instrumentation | `_log_jwt_claims()` fires on every token fetch — logs scope, aud, roles for diagnostics |
| Credential response logging | Full HTTP status + body logged for every credential call regardless of outcome |

---

## Root Causes That Were Fixed (historical)

| Error | Root Cause | Fix |
|---|---|---|
| Companies API HTTP 500 | `Content-Type: application/json` sent on a GET request | Remove Content-Type from GET |
| Wrong user_id (27478) | Poisoned by bad Companies API response | Correct value: 33703 |
| Wrong company_id (2 = CDER) | Same root cause | Correct value: 31537 |
| ESGNG219 | Wrong user_id + company_id + missing `description` field | All three corrected |
| Payload GET failed (no payloadId) | Response wrapped in `{"data": {...}}` envelope | Unwrap data key |
| IND ESGNG334 | `fda_center=CDER_IND`, wrong `submission_type`, IDs as strings | `fda_center=CDER`, `submission_type=EIND`, IDs as integers |
| TC-A02 not discovered by batch | File in from_app/ root, not in headless/ or round2/ | Add FROM_APP glob |

---

## Known Non-Issues

- **"Approved for All Production Submission Types: Pending"** — normal during test phase
- **Gmail email** (`sachin.gbox@gmail.com`) — only in personal profile, not used in API calls ✅
- **IND ESGNG334** — fully resolved 2026-05-01. Correct values: `fda_center=CDER`, `submission_type=EIND`, integer IDs ✅

---

## Useful Commands

```bash
# Dry run — shows what would be submitted
python submit_batch.py --dry-run

# Submit remaining IND files (T02–T07)
python submit_batch.py --skip-companies

# Submit a single file
python submit_batch.py --skip-companies --file IND-T02-susar-repeat.xml

# Diagnose Companies API
python check_company.py
```
