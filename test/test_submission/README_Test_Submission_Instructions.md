# FAERS E2B(R3) Test Submission Guide

**Status (2026-04-21):** App-generated submissions are accepted end-to-end (CA+AA) by ZZFDATST. Further work focuses on expanding the empirical value policy (which race/ethnicity codes, outcome codes, etc. the FAERS 2.18 validator accepts) via the test catalog.

## Start here

Before reading this document, read these in order:

1. **`CLAUDE_CODE_SESSION_HANDOFF_2L8T.md`** — authoritative state of the project, including the empirical value policy table and the five critical structural fixes earned from v1–2L8T.
2. **`FAERS_Test_Case_Catalog.md`** — the 23-test matrix (Groups A–H) for promoting values from UNTESTED → PROVEN ACCEPTED/REJECTED. Has a ranked recommended submission order in §5.
3. This README, for FDA ESG account setup and the mechanics of getting a file onto the gateway.

---

## Reference files

| File | Role |
|---|---|
| `package/CASE-20260331-EMJQ_fixed_v37_patch.xml` | Golden reference — first CA+AA. **Never modify.** |
| `from_app/CASE-20260421-2L8T.xml` | Current baseline — first app-generated CA+AA. Use as the starting point for new test cases. |
| `acks/ci260410211359.*.ack` | v37 acceptance ACK (CA+AA). |
| `acks/ci260421211040.*.ack` | 2L8T acceptance ACK (CA+AA). |
| `FDA_E2B_R3_Test_ICSR.xml` | Generic FDA sample. Not used as a baseline; kept for reference. |
| `faers_xml_lint.py` | 55-check pre-submission lint (required zero FAIL before any submission). |

---

## Empirical value policy — do not violate

The FAERS 2.18 validator applies business rules beyond the E2B spec. The only reliable source of truth for what ZZFDATST will accept is the history of actual ACK3 responses. These values are known-rejected and must not appear in any submission:

| Field | Tag | Proven-rejected | Use instead |
|---|---|---|---|
| Patient race | `FDA.D.11.r.1` | `nullFlavor="NI"`, `C17998` "Unknown" | `C41260` "Asian" (proven) or another real NCI race code |
| Patient ethnicity | `FDA.D.12` | `C17998` "Unknown" | `C41222` "Not Hispanic or Latino" (proven) |
| Medical history | `D.7.2` | `nullFlavor="NI"` | Actual text such as `"None reported"` (proven) |
| Reporter OID | `C.3.x` | OID `.1.6` (causes whole C.3 block to be silently skipped) | OID `.1.7` with `code="1"` |
| Reporter org structure | `C.3.2` | Flat single-level `representedOrganization` | Nested two-level: outer dept → `assignedEntity` → inner company |

See §6 of the session handoff for full provenance and §3 of the test catalog for the complete table.

---

## Pre-submission gates

Every submission must clear all three gates in this order:

1. **`python3 faers_xml_lint.py <file>` — zero FAIL.** 55 checks distilled from v1–v37. Lives in this directory.
2. **In-app 5-pass validator — zero errors.** `src/main/services/fivePassValidatorService.ts`. Enforces empirical policy (blocks `C17998`, `nullFlavor="NI"` on D.7.2, etc.) and diffs against v37. Also exposed over IPC as `esgFivePassValidate(caseId)`.
3. **In-app v37 lint gate — zero FAIL.** The same `faers_xml_lint.py` run inside the Electron app via `xmlLintService.ts`. Gates both the file-export path and the direct ESG API submission path.

For the external FDA E2B(R3) validator (separate tool provided by FDA), see the References section below. It is optional because the three gates above catch the same issues plus the empirically-proven-rejected ones that the FDA validator does not.

---

## Prerequisites

1. **FDA ESG NextGen test account.** Register at the [ESG NextGen portal](https://www.fda.gov/industry/electronic-submissions-gateway-next-generation-esg-nextgen); contact `ESGNGSupport@fda.hhs.gov` for account setup.
2. **FDA-approved sender identifier.** DeepQuence's DUNS is `334818134`; this is already embedded throughout v37 and 2L8T in OIDs `.3.11`, `.3.13`, and `1.3.6.1.4.1.519.1`. If submitting as a different sender, replace in all three OIDs consistently.
3. **Submission method.** Pick one:
    - **USP (Unified Submission Portal)** — web upload, recommended for one-off tests.
    - **AS2 Gateway** — system-to-system, automated.
    - **REST API (ESG NextGen)** — used by the app's automated path.

---

## Generating a test submission

Start from `from_app/CASE-20260421-2L8T.xml` (the current baseline). For each test case, apply exactly **one** untested change per the catalog's §2 isolation rule; rotate the three always-expected fields:

- Case ID: `CASE-YYYYMMDD-XXXX` (XXXX random alphanumeric, SR-number is `SR-` + case ID)
- Batch UUID: `DeepQuenceTest-YYYYMMDD-<uuid>` (globally unique — never `TEST-BATCH-2026-NNN` or similar; conventions matter for the archived ACKs to match up)
- `creationTime` / `availabilityTime`: current time

Never combine multiple untested changes in a single submission — when ZZFDATST rejects, the only way to isolate the cause is one-change-at-a-time.

---

## Target environment values

The repo is configured for the **ZZFDATST (test) environment**:

| Parameter | Test (current) | Production |
|---|---|---|
| Batch receiver (N.1.4) | `ZZFDATST` | `ZZFDA` |
| Message receiver (N.2.r.3) | `CDER` | `CDER` |
| Submission type | `AERS` | `AERS` |
| Report type | SINGLE | SINGLE |

For premarket (IND / SUSAR) submissions, change the batch receiver to `ZZFDATST_PREMKT` for Test or `ZZFDA_PREMKT` for Production, and the inner message receiver to `CDER_IND` / `CBER_IND`. The codebase exposes this through `caseType: 'ind'` in the import JSON, which auto-routes via `BATCH_RECEIVERS.{Test,Production}.Premarket`. Confirmed by FDA ACK3 on IND-T01 (2026-04-27, GAP-IND-001) — both pathways share the `_TST` test-environment suffix convention.

---

## Submission process

### Option 1: USP (web upload, recommended for ad-hoc tests)

1. Log in to ESG NextGen USP: `https://esgng.fda.gov`
2. Select **Send Document**
3. Choose **Center: CDER**
4. Choose **Submission Type: FAERS — Drug and Biologic ICSRs**
5. Upload the XML, select signing certificate, enter password, **Send**

### Option 2: AS2 Gateway

Configure the AS2 client with `AS2-To: ZZFDATST` and the ZZFDATST encryption certificate (or send unencrypted to the test endpoint). Sign with the sender private key and transmit.

### Option 3: REST API (what the app uses)

1. OAuth authentication against the ESG NextGen token endpoint
2. `POST /submissions` to create a submission record
3. Upload XML payload
4. Finalize

---

## Expected acknowledgments

Each submission produces a layered ACK sequence. The FAERS ACK3 is what actually tells you whether the case was loaded; both the inner and outer layers must be positive.

| ACK | Timing | Content |
|---|---|---|
| ACK1 | Immediate | AS2 / HTTP delivery receipt |
| ACK2 | Minutes | Unpacking and routing to center |
| ACK3 | Hours–days | FAERS 2.18 business-rule validation result |

### ACK3 structure

ACK3 is an HL7 v3 `MCCI_IN200101UV01` envelope carrying two independent acknowledgment codes:

| Layer | Element | Accept | Reject |
|---|---|---|---|
| Inner (ICSR message) | `MCCI_IN000002UV01/acknowledgement/@typeCode` | `CA` | `CR` |
| Outer (batch) | `MCCI_IN200101UV01/acknowledgement/@typeCode` | `AA` | `AR` |

Only **CA + AA** is a true acceptance. On rejection, the inner `acknowledgementDetail/text` lists numbered rejections in the shape `"1: Data value required for tag X"` — extract the field tags and map back to the empirical policy.

The app's ACK parser (`src/main/services/ackParserService.ts`, exposed over IPC as `esgParseAck({ xml, filePath })`) does this extraction automatically. Real fixture ACKs are committed under `acks/` for reference.

### Archiving an ACK

After any submission, copy the ACK to `acks/` (keep the FDA filename — it encodes the date and SHA). Update the empirical value policy table in `CLAUDE_CODE_SESSION_HANDOFF_2L8T.md` §6 with the ACK's verdict. This is how the test matrix converges.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `FDA.D.11.r.1` rejection | Race used `nullFlavor="NI"` or `C17998` | Switch to `C41260` or another proven NCI race code |
| `FDA.D.12` rejection | Ethnicity used `C17998` | Switch to `C41222` |
| `D.7.2` rejection | Medical history used `nullFlavor="NI"` | Use actual text (`"None reported"` is proven safe) |
| `C.3.2` rejection with missing data tags | Flat reporter org or OID `.1.6` used | Nest `representedOrganization`; use OID `.1.7` with `code="1"` |
| `E.i.7` rejection on Reaction 2 | C49489 outcome used a non-FAERS code | Use `code="6"` (E2B-R2 legacy "unknown") or `code="1"` |
| "Batch number already used" | Batch UUID reused | Regenerate with the `DeepQuenceTest-YYYYMMDD-<uuid>` convention |
| Sender identifier not approved | DUNS not registered with FDA | Contact `faersesub@fda.hhs.gov` |
| Invalid MedDRA term | MedDRA dictionary stale | Use LLT/PT codes from the current MedDRA version in the app's dictionary |

### Support contacts

- ESG Support: `ESGNGSupport@fda.hhs.gov`
- FAERS E-Sub: `faersesub@fda.hhs.gov`
- Testing questions: `eprompt@fda.hhs.gov`

---

## References

- [FDA E2B(R3) Implementation Guide](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/e2br3-electronic-transmission-individual-case-safety-reports-implementation-guide-data-elements-and)
- [FDA E2B(R3) Core Data Elements and Business Rules](https://www.fda.gov/drugs/electronic-regulatory-submission-and-review/fda-e2br3-core-data-elements-and-business-rules)
- [FDA ESG NextGen Documentation](https://www.fda.gov/industry/electronic-submissions-gateway-next-generation-esg-nextgen)
- [ICH E2B(R3) Specifications](https://ich.org/page/e2br3-individual-case-safety-report-icsr-specification-and-related-files)

---

**Production warning.** Never submit to `ZZFDA` (production) until (1) the test-case catalog is exhausted, (2) the receiver is switched from `ZZFDATST` → `ZZFDA`, and (3) FDA has approved the sender for production submissions.
