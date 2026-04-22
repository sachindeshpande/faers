# FAERS/AERS E2B(R3) XML — Issues Encountered & Fixes Applied (USP Test)

**Project:** DeepQuence — FAERS/AERS test submissions via FDA ESG NextGen (USP)  
**Timeframe:** March 2026  
**Purpose of this document:** Capture *every XML issue we hit so far*, the *exact fix*, and *where it was applied*, so the work can be resumed in a new session without losing context.

---

## Executive Summary

We iteratively corrected an E2B(R3) HL7 XML ICSR submission based on **ACK3 Center validation** responses from FDA (primarily CDER). Each iteration fixed one required element or schema-ordering issue, then resubmitted as a new USP test submission.

Most issues fell into two categories:

1) **Required header fields missing or blank** (N.* elements)  
2) **Schema ordering constraints** in the HL7 batch wrapper (`MCCI_IN200100UV01`)

---

## Legend / Key Concepts

- **Envelope / batch wrapper:** `<MCCI_IN200100UV01 ...>` (HL7 batch wrapper)
- **Message container:** `<PORR_IN049016UV>` (HL7 message)
- **Batch routing IDs:**
  - `ZZFDA` = production
  - `ZZFDATST` = test
- **ACK1:** ESG received the upload and indicates which Center it will deliver to.
- **ACK3:** Center (CDER/CBER) validation response; main driver for fixes.

---

## Issue 0 — (Non-XML) Email Policy Blocking Account Setup

**Symptom:** ESGNG registration denied because registration used a public email domain (Gmail).  
**Fix:** Use a company-domain mailbox (`@deepquence.com`) via Namecheap Private Email or Google Workspace.  
**Outcome:** Able to receive ESG acknowledgements (ACK1/ACK3) at corporate domain.

---

## Issue 1 — Batch Sender Identifier tag “missing” (or blank)

**Symptoms:**
- Rejection message: “missing batch sender identifier tag”
- Follow-up guidance: “Please check if the tag is populated by verifying the xpath.”

**Root cause:**
- The E2B batch sender identifier element existed but was blank (`extension=""`), OR it used an unexpected OID/root that the validator’s XPath did not recognize.

**Fix applied:**
- Ensure `N.1.3` **exists and is populated**:
  - Include `id` with **root** `2.16.840.1.113883.3.989.2.1.3.13`
  - Use a non-empty value (DUNS accepted) in the `extension`

**Implementation note:**
- We also included the DUNS OID `1.3.6.1.4.1.519.1` as an additional identifier representation.

**Example (envelope sender/device):**
```xml
<sender typeCode="SND">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id root="2.16.840.1.113883.3.989.2.1.3.13" extension="334818134"/>
    <id root="1.3.6.1.4.1.519.1" extension="334818134"/>
  </device>
</sender>
```

---

## Issue 2 — Wrong routing ID for TEST vs PROD

**Symptom:** ESG ACKs indicating the wrong environment/routing, and support clarified routing IDs.

**Fix applied:**
- Set the envelope receiver batch routing ID to **TEST**:
```xml
<id root="2.16.840.1.113883.3.989.2.1.3.14" extension="ZZFDATST"/>
```

**Note:** Support confirmed routing table:
- TEST postmarket uses **ZZFDATST**
- PROD postmarket uses **ZZFDA**

---

## Issue 3 — N.1.1 missing (“Type of Messages in Batch”)

**ACK3 symptom:**
- “Invalid XML: N.1.1 must be provided.”

**Fix applied:**
Add envelope-level N.1.1 as `<name .../>`:
```xml
<name code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.1"/>
```

---

## Issue 4 — N.2.r.2 missing (“Message Sender Identifier”)

**ACK3 symptom:**
- “Invalid XML: N.2.r.2 must be provided.”

**Fix applied:**
Add message-level sender identifier (OID `…3.11`) under `PORR_IN049016UV/sender/device`:
```xml
<id root="2.16.840.1.113883.3.989.2.1.3.11" extension="334818134"/>
```

**Placement:** inside `PORR_IN049016UV > sender > device`

---

## Issue 5 — Envelope schema ordering error with multiple `<id>` before `<creationTime>`

**ACK3 symptom (schema):**
- “Invalid content was found starting with element ‘...:id’. One of ‘...:creationTime’ is expected.”

**Root cause:**
- The HL7 batch wrapper schema expects `<creationTime>` after the first `<id>` and did not accept a second `<id>` before `<creationTime>` (in the profile CDER is enforcing).

**Fix attempt:**
- Temporarily remove envelope batch number `<id root="…3.22" .../>` to satisfy ordering.

**Outcome:**
- This resolved the ordering error but triggered N.1.2 missing (see next issue).

---

## Issue 6 — N.1.2 required (“Batch Number”) and schema expects `batchTotalNumber`

**ACK3 symptoms:**
1) “Invalid XML: N.1.2 must be provided.”
2) Schema error indicating it expected one of:
   `batchComment`, `transmissionQuantity`, **`batchTotalNumber`**, or message payload — but encountered `processingCode`.

**Root cause:**
- CDER’s schema/profile wants the batch-level count/number represented using **HL7 elements** like `batchTotalNumber` (not as a second `<id>` in the header sequence).

**Fix applied (current best approach):**
Add envelope-level:
```xml
<batchTotalNumber value="1"/>
```

**Placement:**
- After the envelope header blocks (`sender`/`receiver`) and before `<PORR_IN049016UV>`.

**Current “best candidate” file produced:**
`CASE-20260331-EMJQ_fixed_N2r2_withBatchTotalNumber.xml`

---

## Issue 7 — Center mismatch (CBER vs CDER)

**Symptom:**
- ACK1/ACK3 indicated delivery to **CBER** even though the XML contained CDER markers.

**Fix applied:**
- Ensure USP submission selection uses **Destination/Center = CDER** and Submission Type = AERS, Test = Yes.

**Outcome:**
- Later ACK1 indicated “Next Step: Submission to be delivered to CDER.”

---

## Known Remaining XML Quality Concerns (not yet validated by ACK3)

These have *not* been raised by ACK3 yet, but are potential next failures:

- Use of literal strings like `value="null"` in structured fields (e.g., height, dechallenge/rechallenge). Some validators require omission rather than the literal “null”.
- Duplication of certain identifiers (multiple `…3.1` IDs at different levels). Might be okay but could trigger “expected at XPath” rules in some profiles.
- Whether nested receiver/device should also include `…3.14` or other routing IDs (profile-dependent).

---

## Final: Current Best Candidate XML to Submit Next

**File:** `CASE-20260331-EMJQ_fixed_N2r2_withBatchTotalNumber.xml`

Includes:
- `ZZFDATST` at envelope receiver (`…3.14`)
- Batch sender ID (`…3.13`) populated with DUNS
- N.1.1 `<name .../>`
- Message sender identifier (`…3.11`) in PORR sender/device
- `batchTotalNumber value="1"` to satisfy N.1.2 requirements without breaking schema ordering

---

## Appendix — Typical XPath Checks Used During Debug

**Batch sender identifier present (…3.13):**
```bash
xmllint --xpath 'string(//*[local-name()="sender"]//*[local-name()="id"][@root="2.16.840.1.113883.3.989.2.1.3.13"]/@extension)' file.xml
```

**Message sender identifier present (…3.11):**
```bash
xmllint --xpath 'string(//*[local-name()="PORR_IN049016UV"]//*[local-name()="sender"]//*[local-name()="id"][@root="2.16.840.1.113883.3.989.2.1.3.11"]/@extension)' file.xml
```

**Batch receiver routing id (…3.14):**
```bash
xmllint --xpath 'string(//*[local-name()="receiver"]//*[local-name()="id"][@root="2.16.840.1.113883.3.989.2.1.3.14"]/@extension)' file.xml
```

