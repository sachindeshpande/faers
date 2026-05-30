# FDA ESG NextGen — Center Submission Types

**Source:** https://www.fda.gov/industry/getting-started-esg-nextgen/center-submission-types  
**Content current as of:** 01/12/2026  
**Retrieved:** 2026-05-07

---

## Overview

This page documents which FDA centers support which submission types via the ESG NextGen gateway, along with file size limits, test-environment requirements, and AS2 routing identifiers. Use this as the authoritative reference for selecting `submission_type` and `fda_center` parameters in the ESG NextGen REST API.

---

## Table 1 — Center Submission Types: Availability, Size, and Test Requirements

| Center | Submission Type | Environment | Max File Size | Test Required Before Production |
|---|---|---|---|---|
| CBER | AERS | Both (B) | 0.2 GB | Yes (Y) |
| CBER | AERS Attachments | Both (B) | 0.2 GB | Yes (Y) |
| CBER | AERS_PREMKT_CBER | Both (B) | 0.2 GB | Yes (Y) |
| CBER | BLA | Both (B) | 300 GB | No (N) |
| CBER | BLA Attachments | Both (B) | 300 GB | No (N) |
| CBER | ECTD | Both (B) | 300 GB | No (N) |
| CDER | AERS | Both (B) | 0.2 GB | Yes (Y) |
| CDER | AERS Attachments | Both (B) | 0.2 GB | Yes (Y) |
| CDER | AERS_PREMKT_CDER | Both (B) | 0.2 GB | Yes (Y) |
| CDER | ECTD | Both (B) | 300 GB | No (N) |
| CDER | EIND | Both (B) | 100 GB | No (N) |
| CDER | NDA | Both (B) | 300 GB | No (N) |
| CDRH | AERS | Both (B) | 0.2 GB | Yes (Y) |
| CDRH | AERS Attachments | Both (B) | 0.2 GB | Yes (Y) |
| CDRH | eMDR | Both (B) | 0.2 GB | Yes (Y) |
| CDRH | eMDR Attachments | Both (B) | 0.2 GB | Yes (Y) |
| CDRH | ECTD | Both (B) | 300 GB | No (N) |
| HFP/CFSAN | AERS | Both (B) | 0.2 GB | Yes (Y) |
| HFP/CFSAN | AERS Attachments | Both (B) | 0.2 GB | Yes (Y) |
| CTP | AERS | Both (B) | 0.2 GB | Yes (Y) |
| CTP | AERS Attachments | Both (B) | 0.2 GB | Yes (Y) |
| CVM | AERS | Both (B) | 0.2 GB | Yes (Y) |
| CVM | AERS Attachments | Both (B) | 0.2 GB | Yes (Y) |
| GWTEST | ConnectTest | Both (B) | 0.2 GB | No (N) |
| GWTEST | SizeTest | Test only (T) | varies | No (N) |
| HealthCanada | AERS | Both (B) | 0.2 GB | Yes (Y) |
| OC | ACO | Both (B) | 0.2 GB | Yes (Y) |
| OOPD | AERS | Both (B) | 0.2 GB | Yes (Y) |
| OPQ | AERS | Both (B) | 0.2 GB | Yes (Y) |
| OII | AERS | Both (B) | 0.2 GB | Yes (Y) |

**Environment key:** B = Both (Test and Production); T = Test only

---

## Table 2 — AS2 Routing: USP/API Submission Type → AS2 Submission Type → AS2 Routing ID

| Center | USP/API Submission Type | AS2 Submission Type | AS2 Routing ID |
|---|---|---|---|
| CDER | AERS | AERS | FDA_AERS |
| CDER | AERS_PREMKT_CDER | AERS_PREMKT_CDER | FDA_AERS_PREMKT_CDER |
| CDER | AERS IND | AERS_IND | AERS_IND |
| CDER | AERS_PREMKT | AERS_PREMKT | FDA_AERS_PREMKT |
| CBER | AERS | AERS | FDA_AERS |
| CBER | AERS_PREMKT_CBER | AERS_PREMKT_CBER | FDA_AERS_PREMKT_CBER |
| CDRH | AERS | AERS | FDA_AERS |
| CDRH | eMDR | eMDR | FDA_eMDR |
| HFP/CFSAN | AERS | AERS | FDA_AERS |
| CTP | AERS | AERS | FDA_AERS |
| CVM | AERS | AERS | FDA_AERS |
| OC | ACO | AERS_PSTMKT_OCAC | AERS_PSTMKT_OCAC |
| OOPD | AERS | AERS | FDA_AERS |
| OPQ | AERS | AERS | FDA_AERS |
| OII | AERS | AERS | FDA_AERS |
| HealthCanada | AERS | AERS | FDA_AERS |
| GWTEST | ConnectTest | ConnectTest | GWTEST_ConnectTest |
| GWTEST | SizeTest | SizeTest | GWTEST_SizeTest |

---

## Key Notes for CDER FAERS Submissions

### Postmarket (pharmacovigilance) ICSR
- **API parameter:** `submission_type=AERS`, `fda_center=CDER`
- **AS2 Routing ID:** `FDA_AERS`
- **XML batch receiver:** `N.1.4 = ZZFDATST` (test) / `ZZFDA` (production)
- **XML message receiver:** `N.2.r.3 = CDER`
- **Max file size:** 0.2 GB
- **Test required before production:** YES — must obtain CA+AA ACK in TEST before submitting to PROD

### Premarket / IND SUSAR
- **API parameter:** `submission_type=AERS_PREMKT_CDER`, `fda_center=CDER`
- **AS2 Routing ID:** `FDA_AERS_PREMKT_CDER`
- **XML batch receiver:** `N.1.4 = ZZFDATST` (test) / `ZZFDA` (production)
- **XML message receiver:** `N.2.r.3 = CDER`
- **Max file size:** 0.2 GB
- **Test required before production:** YES
- **Expected ACK (TEST):** CA+AE (accepted with warning) — AE is normal for IND in TEST; does not indicate failure

### AERS IND (distinct from AERS_PREMKT_CDER)
- **API parameter:** `submission_type=AERS_IND`, `fda_center=CDER`
- **AS2 Routing ID:** `AERS_IND` (note: no `FDA_` prefix — distinct from other CDER routes)
- This is a separate routing channel from `AERS_PREMKT_CDER`; do not conflate

### Gateway Test submissions (GWTEST)
- `ConnectTest` — available in both Test and Production; used to verify AS2 connectivity
- `SizeTest` — Test environment only; used to verify large-file transfer capability

---

## TEST vs. PRODUCTION Gateway Endpoints

| Environment | Base URL |
|---|---|
| TEST | `https://external-api-esgng.fda.gov/esg/api/v1/` (ZZFDATST receiver) |
| PRODUCTION | `https://external-api-esgng.fda.gov/esg/api/v1/` (ZZFDA receiver) |

The REST endpoint URL is the same; routing to TEST vs. PROD is controlled by:
1. The `N.1.4` XML field (ZZFDATST vs. ZZFDA)
2. The credentials used (test credentials vs. production credentials)

---

## Implications for This Project

| Scenario Class | submission_type | Expected ACK |
|---|---|---|
| TC-* postmarket (30 scenarios) | `AERS` | CA+AA |
| IND-T* premarket (7 scenarios) | `AERS_PREMKT_CDER` | CA+AE (TEST) |
| TC-A03, TC-A04, TC-A06 (negative refs) | `AERS` | CR+AR (business rule rejection) |
| TC-H02 (excluded) | `AERS` | CR+AR (schema violation) |

The `submit_batch.py` script automatically selects `AERS_PREMKT_CDER` for files matching `IND-*` and `AERS` for all others (lines 377–382 of the script).
