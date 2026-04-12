# FAERS/AERS Test Submission — Required XML Changes (ESGNG)

**Target file:** `CASE-20260331-EU4K.xml`  
**Context:** USP **Test submission**; ESGNG rejection/feedback: “missing batch sender identifier tag” and “verify the xpath.”

---

## 1) Populate the Batch Sender Identifier (N.1.3)

### What to change
Your file currently contains the Batch Sender Identifier element (OID `2.16.840.1.113883.3.989.2.1.3.13`) **but the value is empty** (`extension=""`) in **two places**:

- **Envelope sender**:  
  `/MCCI_IN200100UV01/sender/device/id[@root="...3.13"]/@extension`

- **Nested PORR sender**:  
  `/MCCI_IN200100UV01/PORR_IN049016UV/sender/device/id[@root="...3.13"]/@extension`

Most validators treat an empty `extension=""` as “missing,” which matches Deepak’s message.

### Edit required (do this in both places)
Replace:

```xml
<id root="2.16.840.1.113883.3.989.2.1.3.13" extension=""/>
```

with:

```xml
<id root="2.16.840.1.113883.3.989.2.1.3.13" extension="YOUR_SENDER_IDENTIFIER"/>
```

**What to use for `YOUR_SENDER_IDENTIFIER`:**
- Prefer a true organization identifier expected by FAERS/ESGNG (often DUNS or an FDA/FAERS-assigned sender ID).
- If you don’t have the production sender ID yet, ask ESGNG support what they want for **test**.

---

## 2) Confirm Batch Receiver Identifier for TEST: `ZZFDATST` vs `ZZFDA`

Your envelope receiver currently has:

```xml
<id root="2.16.840.1.113883.3.989.2.1.3.14" extension="ZZFDA"/>
```

For many FAERS test flows, the receiver identifier is `ZZFDATST` (test) rather than `ZZFDA` (production).

### Action
- **Ask ESGNG/Deepak to confirm** what the receiver identifier should be for **AERS test submissions via USP**.
- If they confirm test receiver is required, change:

```xml
extension="ZZFDA"
```

to:

```xml
extension="ZZFDATST"
```

---

## 3) Run XPath checks (what Deepak is asking for)

Use these checks to prove the tag exists *and* is populated (non-empty).

### Envelope sender check (must return non-empty)
```bash
xmllint --xpath 'string(//*[local-name()="MCCI_IN200100UV01"]/*[local-name()="sender"]//*[local-name()="id"][@root="2.16.840.1.113883.3.989.2.1.3.13"]/@extension)' CASE-20260331-EU4K.xml
```

### Nested PORR sender check (must return non-empty)
```bash
xmllint --xpath 'string(//*[local-name()="PORR_IN049016UV"]//*[local-name()="sender"]//*[local-name()="id"][@root="2.16.840.1.113883.3.989.2.1.3.13"]/@extension)' CASE-20260331-EU4K.xml
```

### Receiver check (should return `ZZFDA` or `ZZFDATST` depending on test routing)
```bash
xmllint --xpath 'string(//*[local-name()="MCCI_IN200100UV01"]/*[local-name()="receiver"]//*[local-name()="id"][@root="2.16.840.1.113883.3.989.2.1.3.14"]/@extension)' CASE-20260331-EU4K.xml
```

---

## 4) Resubmission note

After updating the XML, resubmit as a **new** USP submission (new Core ID / ACK trail). ACK1 does not “resume” a prior attempt.

---

## Optional: short message to Deepak

> Hi Deepak — I verified the Batch Sender Identifier (OID root `…3.13`) exists at both the envelope sender and the PORR sender paths, but the `extension` value is currently blank (`extension=""`). I will populate it with the required sender identifier and resubmit.  
> For the FAERS/AERS **test** flow via USP, can you confirm whether the receiver should be `ZZFDA` or `ZZFDATST`?

