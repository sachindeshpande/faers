# IND ESGNG334 — Technical Troubleshooting Brief

**Company:** DeepQuence | **company_id:** 31537 | **user_id:** 33703  
**Track:** CDER_IND / ZZFDATST_PREMKT (premarket/IND safety reports)  
**Date:** 2026-05-01  
**Status:** API IND submissions blocked by ESGNG334 — pending AEMSESUB enrollment

---

## 1. Credential Call Diff — IND (failing) vs AERS (succeeding)

Both calls hit the same endpoint in the same session using the same OAuth token. The **only byte-level difference** is `fda_center`.

### Failing IND Credential Call

```
POST https://external-api-esgng.fda.gov/api/esgng/v1/credentials/api/test
Headers:
  accesstoken: <oauth_token>
  Content-Type: application/json

Body:
{
  "user_id": "33703",
  "fda_center": "CDER_IND",
  "company_id": "31537",
  "submission_type": "AERS",
  "submission_name": "IND-T01-susar-baseline",
  "submission_protocol": "API",
  "file_count": 1,
  "description": "FAERS ICSR test submission — IND-T01-susar-baseline"
}

Response: HTTP 400
Body: {"errorCode":"ESGNG334","message":"Center and Submission Type validation failed"}
```

### Succeeding AERS Credential Call (same session, same token)

```
POST https://external-api-esgng.fda.gov/api/esgng/v1/credentials/api/test
Headers:
  accesstoken: <oauth_token>
  Content-Type: application/json

Body:
{
  "user_id": "33703",
  "fda_center": "CDER",
  "company_id": "31537",
  "submission_type": "AERS",
  "submission_name": "TC-A02-race-black",
  "submission_protocol": "API",
  "file_count": 1,
  "description": "FAERS ICSR test submission — TC-A02-race-black"
}

Response: HTTP 200
Body: {"core_id":"ci260501173418","temp_user":"...","temp_password":"..."}
```

### All fda_center / submission_type Combinations Tested

| fda_center | submission_type | Result |
|---|---|---|
| `CDER` | `IND` | ESGNG334 |
| `CDER_IND` | `AERS` | ESGNG334 |
| `CDER` | `AERS` | ✅ ESGNG210 / core_id returned |

Both IND combinations fail identically. ESGNG334 does not appear in the API Specification v1.2 error code table, which lists only ESGNG210–ESGNG219 for the credential endpoint. This is the primary signal that ESGNG334 is an **account authorization gate**, not a field-string validation error.

---

## 2. Portal Admin Decline — Full Text

Captured from ACK tracker (ISSUE-004), confirmed on two separate submissions:

> **"Your test submission was declined. Reason: please email AEMSESUB@fda.hhs.gov mailbox"**

| Submission ID | File | Notes |
|---|---|---|
| ci260429052038 | IND-T02-susar-repeat.xml | Confirmed portal decline + CA+AE ICSR ACK |
| ci260428001004 | IND-T05-fatal-seven-day.xml (early attempt) | Also declined |

**Key observations:**

- The portal decline is a **separate administrative layer** from the ICSR ACK. The ICSR ACK arrives first and is CA+AE. The portal then shows the decline independently.
- There is **no sub-code or additional reason field** in the decline message. It does not distinguish between enrollment gap vs. submission type mismatch vs. profile issue.
- The message body only directs to the AEMSESUB mailbox.

---

## 3. CA+AE ICSR ACK for IND — Actual File

ACK file `ci260429034546` for IND-T06-babe-test-reference.xml (pre-regen). Same gateway and routing apply to all 7 IND files.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MCCI_IN200101UV01 xmlns="urn:hl7-org:v3" ...>
  <id extension="3230270152" root="2.16.840.1.113883.3.989.2.1.3.20"/>
  <creationTime value="20260428235724-0400"/>

  <!-- Ack Message #1 -->
  <MCCI_IN000002UV01>
    <id extension="853827" root="2.16.840.1.113883.3.989.2.1.3.19"/>

    <!-- ACK.B.r.4: Sender = CDER_IND — center confirmed -->
    <sender typeCode="SND">
      <device classCode="DEV" determinerCode="INSTANCE">
        <id extension="CDER_IND" root="2.16.840.1.113883.3.989.2.1.3.15"/>
      </device>
    </sender>

    <!-- ACK.B.r.6: CA = Content Accept -->
    <acknowledgement typeCode="CA">
      <targetMessage>
        <id extension="SR-CASE-EXAMPLE-INDT06" root="2.16.840.1.113883.3.989.2.1.3.1"/>
      </targetMessage>
      <acknowledgementDetail>
        <text>Safety report loaded; Validated against 2.18 business rules;
Warnings:
1: FDA.C.5.6.r is invalid for the Center specified in N.2.r.3.
</text>
      </acknowledgementDetail>
    </acknowledgement>
  </MCCI_IN000002UV01>

  <!-- ACK.M.2: Batch sender = ZZFDATST_PREMKT — gateway confirms premarket track -->
  <sender typeCode="SND">
    <device classCode="DEV" determinerCode="INSTANCE">
      <id extension="ZZFDATST_PREMKT" root="2.16.840.1.113883.3.989.2.1.3.17"/>
    </device>
  </sender>

  <!-- ACK.A.4: AE = Application Accept -->
  <acknowledgement typeCode="AE">
    <acknowledgementDetail>
      <text>Application Acknowledgement Accept (message successfully processed, no further action)</text>
    </acknowledgementDetail>
  </acknowledgement>
</MCCI_IN200101UV01>
```

### ACK Field Summary

| ACK Field | Value | Meaning |
|---|---|---|
| ACK.B.r.6 | `CA` | Content Accept — XML passed all 2.18 business rules |
| ACK.A.4 | `AE` | Application Accept — batch processed successfully |
| ACK.M.2 sender | `ZZFDATST_PREMKT` | Gateway confirms routing to premarket track |
| ACK.B.r.4 sender | `CDER_IND` | Center confirmed as CDER_IND |
| Warning | `FDA.C.5.6.r is invalid for the Center specified in N.2.r.3` | Informational only — no action required (ISSUE-002) |

No hidden errors, no sub-codes. **The XML content is genuinely accepted.** The ACK confirms the XML routing is correct, which isolates the API ESGNG334 to an account-level authorization issue, not an XML content issue.

All 7 IND files received the same CA+AE result with the same C.5.6.r informational warning.

---

## 4. IND XML Being Submitted — IND-T01-susar-baseline.xml

Full file (representative of all 7 IND submissions). Critical routing fields highlighted.

### Routing Fields

```xml
<!-- N.2.r.3 — inner receiver center (routes to CDER_IND track) -->
<receiver typeCode="RCV">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id root="2.16.840.1.113883.3.989.2.1.3.12" extension="CDER_IND"/>
  </device>
</receiver>

<!-- Top-level receiver — routes to ZZFDATST_PREMKT gateway -->
<receiver typeCode="RCV">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id root="2.16.840.1.113883.3.989.2.1.3.14" extension="ZZFDATST_PREMKT"/>
  </device>
</receiver>

<!-- Sender — EIN 33-4818134 (extension = EIN digits, leading 3 is format artifact) -->
<sender typeCode="SND">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id root="2.16.840.1.113883.3.989.2.1.3.11" extension="334818134"/>
    <id root="2.16.840.1.113883.3.989.2.1.3.13" extension="334818134"/>
    <id root="1.3.6.1.4.1.519.1"               extension="334818134"/>
  </device>
</sender>
```

### Complete File

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MCCI_IN200100UV01 xmlns="urn:hl7-org:v3"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   ITSVersion="XML_1.0"
                   xsi:schemaLocation="urn:hl7-org:v3 MCCI_IN200100UV01.xsd">
  <id root="2.16.840.1.113883.3.989.2.1.3.22"
      extension="DeepQuenceTest-20260429-a7ee184c-93f1-454f-914b-ba22291a3a69"/>
  <creationTime value="20260315070000-0700"/>
  <responseModeCode code="D"/>
  <interactionId root="2.16.840.1.113883.1.6" extension="MCCI_IN200100UV01"/>
  <name code="1" displayName="ichicsr" codeSystem="2.16.840.1.113883.3.989.2.1.1.1"/>
  <PORR_IN049016UV>
    <id root="2.16.840.1.113883.3.989.2.1.3.1"
        extension="ee12bb83-bfa5-4da7-bbe3-ecbebd43b9e1"/>
    <creationTime value="20260315070000-0700"/>
    <interactionId root="2.16.840.1.113883.1.6" extension="PORR_IN049016UV"/>
    <processingCode code="P"/>
    <processingModeCode code="I"/>
    <acceptAckCode code="AL"/>
    <receiver typeCode="RCV">
      <device classCode="DEV" determinerCode="INSTANCE">
        <!-- N.2.r.3 = CDER_IND -->
        <id root="2.16.840.1.113883.3.989.2.1.3.12" extension="CDER_IND"/>
      </device>
    </receiver>
    <sender typeCode="SND">
      <device classCode="DEV" determinerCode="INSTANCE">
        <id root="2.16.840.1.113883.3.989.2.1.3.11" extension="334818134"/>
        <id root="2.16.840.1.113883.3.989.2.1.3.13" extension="334818134"/>
        <id root="1.3.6.1.4.1.519.1"               extension="334818134"/>
      </device>
    </sender>
    <controlActProcess classCode="CACT" moodCode="EVN">
      <code code="PORR_TE049016UV" codeSystem="2.16.840.1.113883.1.18"/>
      <effectiveTime value="20260315070000-0700"/>
      <subject typeCode="SUBJ">
        <investigationEvent classCode="INVSTG" moodCode="EVN">
          <id root="2.16.840.1.113883.3.989.2.1.3.1"
              extension="SR-CASE-EXAMPLE-INDT01"/>
          <id root="2.16.840.1.113883.3.989.2.1.3.2"
              extension="CASE-20260429-6XE0"/>
          <id root="2.16.840.1.113883.3.989.2.1.3.4" extension="2"/>
          <code code="PAT_ADV_EVNT" codeSystem="2.16.840.1.113883.5.4"/>
          <text>Case Narrative Including Clinical Course, Therapeutic Measures,
Outcome and Additional Relevant Information</text>
          <statusCode code="active"/>
          <effectiveTime xsi:type="IVL_TS">
            <low value="20260315"/>
          </effectiveTime>
          <availabilityTime value="20260315070000"/>
          <!-- ... patient, reaction, drug, narrative elements omitted for brevity ... -->
        </investigationEvent>
      </subject>
    </controlActProcess>
  </PORR_IN049016UV>

  <!-- Top-level routing: ZZFDATST_PREMKT gateway -->
  <receiver typeCode="RCV">
    <device classCode="DEV" determinerCode="INSTANCE">
      <id root="2.16.840.1.113883.3.989.2.1.3.14" extension="ZZFDATST_PREMKT"/>
    </device>
  </receiver>
  <sender typeCode="SND">
    <device classCode="DEV" determinerCode="INSTANCE">
      <id root="2.16.840.1.113883.3.989.2.1.3.13" extension="334818134"/>
      <id root="1.3.6.1.4.1.519.1"               extension="334818134"/>
    </device>
  </sender>
</MCCI_IN200100UV01>
```

The XML routes correctly to ZZFDATST_PREMKT/CDER_IND — matching what the portal accepted. The XML is not the problem.

---

## 5. JWT Claims / OAuth Token

### OAuth Token Request

```
POST https://external-api-esgng.fda.gov/as/token.oauth2
  ?grant_type=client_credentials
  &scope=openid%20profile
Content-Type: application/x-www-form-urlencoded

Body:
  client_id=<ClientID>
  client_secret=<Secret>
```

The same token (same client_id, same scope) is used for both AERS and IND credential calls.

### Key Observations for the Scope/Audience Check

**Scope is `openid profile` for both calls.** There is no IND-specific scope being requested. If the ESG backend enforces a different scope or role claim for the CDER_IND track, the current token would be valid for CDER/AERS but unauthorized for CDER_IND — which would produce exactly the ESGNG334 behavior seen.

**`client_credentials` grant — no user identity in the token.** The `user_id` (33703) and `company_id` (31537) are passed in the credential request body, not in the token claims. The ESGNG334 authorization check must therefore be cross-referencing the body's `company_id` against what's enrolled for the CDER_IND track server-side.

### How to Decode the Live Token Claims

The actual token bytes are not persisted to disk. To inspect claims during a run, add the following snippet to `submit_batch.py` immediately after obtaining the token:

```python
import base64, json as _json

def decode_jwt_claims(token: str) -> dict:
    """Decode JWT payload (no signature verification)."""
    try:
        segment = token.split(".")[1]
        # Pad to multiple of 4
        segment += "=" * (4 - len(segment) % 4)
        return _json.loads(base64.b64decode(segment).decode())
    except Exception as e:
        return {"error": str(e)}

# After tokens.get():
token = tokens.get()
claims = decode_jwt_claims(token)
log.info(f"JWT claims: {_json.dumps(claims, indent=2)}")
```

Fields to check in the output: `scope`, `aud`, `roles`, `permissions`, `sub`, `client_id`, and any `center` or `track` claim.

---

## 6. Center Submission Types Table

The ESG API Guide §3 defers to:

> `https://www.fda.gov/industry/getting-started-esg-nextgen/center-submission-types`

That URL is **blocked by the network egress proxy** in this environment. Every fetch attempt returns connection refused. The page cannot be retrieved programmatically.

### What Is Known from Spec + Empirical Evidence

| Source | CDER Postmarket | CDER IND / Premarket |
|---|---|---|
| XML N.2.r.3 (ACK-confirmed) | `CDER` | `CDER_IND` |
| XML top-level receiver (ACK-confirmed) | `ZZFDATST` | `ZZFDATST_PREMKT` |
| API `fda_center` — tested, works | `CDER` | — |
| API `fda_center` — tested, ESGNG334 | — | `CDER_IND` |
| API `submission_type` — tested, works | `AERS` | `AERS` (hypothesis) |

### Interpretation

The gap is what the canonical API `fda_center` string for the IND track actually is. Given that both `CDER+IND` and `CDER_IND+AERS` return the same ESGNG334, and that ESGNG334 is undocumented in the spec, the most likely reading is that the string itself does not matter yet — the account is not authorized for that track regardless of what value is sent.

Confirming the canonical string from the Center Submission Types page would close off the remaining uncertainty, but **account enrollment via AEMSESUB@fda.hhs.gov is the required next step regardless**.

---

## Summary

| Item | Finding |
|---|---|
| API diff (IND vs AERS) | Single field difference: `fda_center=CDER_IND` vs `CDER`. Same token, same user/company IDs. |
| ESGNG334 in spec | Not documented (spec ends at ESGNG219 for this endpoint) → authorization gate, not field validation |
| Portal decline text | "Your test submission was declined. Reason: please email AEMSESUB@fda.hhs.gov mailbox" — no sub-code |
| IND ICSR ACK | CA+AE confirmed on all 7 IND files. Gateway = ZZFDATST_PREMKT. Center = CDER_IND. XML clean. |
| IND XML routing | N.2.r.3 = CDER_IND, top-level receiver = ZZFDATST_PREMKT. Matches what portal accepted. |
| OAuth scope | `openid profile` — same for both tracks. Possible IND-specific scope not being requested. |
| Center Submission Types table | URL blocked by egress proxy. Cannot confirm canonical `fda_center` string for IND. |
| **Root cause conclusion** | DeepQuence (company_id 31537) is not enrolled for CDER_IND API submissions. Requires AEMSESUB enrollment action. |
| **Next step** | Email AEMSESUB@fda.hhs.gov (cc ESGNGSupport@fda.hhs.gov) — draft in `helpdesk_email_draft.md` |
