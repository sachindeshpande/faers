# Review Report — CASE-20260331-QTVA.xml (FAERS/AERS — Test Submission)

**File reviewed:** `CASE-20260331-QTVA.xml`  
**Submission type:** FAERS/AERS — **Test submission** (per user)  
**Primary issue reported previously by ESGNG:** “missing batch sender identifier tag”

---

## Summary

Your updated XML is **closer**, and it **does include** the Batch Sender Identifier (OID `…3.13`) in one location. However, there are two structural issues that can still cause the validator to report the sender identifier as “missing,” depending on the exact XPath the validator uses:

1. **Batch Sender Identifier may not be located at the XPath expected for the message envelope/batch header.**
2. **Batch Receiver Identifier (OID `…3.14`) appears at the top level, but is not present inside a `<receiver>/<device>` block where many validators look for it.**

---

## Findings

### 1) Batch Sender Identifier exists, but may not be at the expected XPath

You have an `<id>` with `root="2.16.840.1.113883.3.989.2.1.3.13"` inside the **sender/device** under the nested `PORR_IN049016UV` structure:

- `<sender …><device …><id root="…3.13" extension="DeepQuence"/></device></sender>`

This is good, but if the ESGNG validator expects the sender identifier at the **outer envelope** XPath (e.g., under the top-level `MCCI_IN200100UV01` sender/receiver), it may not find it.

Additionally, you also have a **top-level** `<id root="…3.13" extension="DeepQuence"/>` directly under the root element. That is unusual for this field and may not satisfy the expected XPath check.

### 2) Batch Receiver Identifier likely not placed where the validator expects

You have a top-level `<id root="…3.14" extension="ZZFDA"/>` (directly under the root element), but inside the **nested** `<receiver>/<device>` you only have:

- `root="…3.12" extension="2"`
- `root="…3.7" extension="CDER"`

If the validator expects the Batch Receiver Identifier at an XPath like:

- `…/receiver/device/id[@root="…3.14"]`

…it will not find it.

---

## Recommended Fix (Minimal Edits)

### A) Add **outer envelope** `<receiver>` and `<sender>` blocks

Under the top-level `<MCCI_IN200100UV01 …>`, add explicit envelope sender/receiver blocks (modeled after your earlier file that successfully produced ACK1):

```xml
<receiver typeCode="RCV">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id root="2.16.840.1.113883.3.989.2.1.3.14" extension="ZZFDA"/>
  </device>
</receiver>

<sender typeCode="SND">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id root="2.16.840.1.113883.3.989.2.1.3.13" extension="YOUR_SENDER_IDENTIFIER"/>
  </device>
</sender>
```

**Important:** For a **test submission**, confirm with ESGNG/FAERS whether the receiver must be the **test receiver identifier** (often `ZZFDATST` in some contexts). If so, replace `ZZFDA` accordingly.

### B) Remove the “floating” top-level batch IDs

After adding envelope `<sender>`/`<receiver>`, remove (or at least avoid relying on) these top-level IDs:

- `<id root="…3.13" extension="DeepQuence"/>`
- `<id root="…3.14" extension="ZZFDA"/>`

Keep `…3.13` and `…3.14` inside the proper `<sender>/<receiver>` blocks.

### C) Populate N.1.3 with a real sender identifier (not just company name)

Right now, the sender identifier `extension="DeepQuence"` is a **name**, not an identifier.

Many FAERS/E2B(R3) validators expect an **actual identifier value** (e.g., DUNS or an FDA-assigned sender identifier). If you do not yet have that value for test, ask ESGNG support what they want you to use in **test** submissions.

---

## Quick XPath Checks You Can Run Locally

These checks mimic the “verify the xpath” instruction from ESGNG support.

### Check for Batch Sender Identifier (N.1.3)

```bash
xmllint --xpath 'string(//*[local-name()="sender"]//*[local-name()="id"][@root="2.16.840.1.113883.3.989.2.1.3.13"]/@extension)' CASE-20260331-QTVA.xml
```

### Check for Batch Receiver Identifier (N.1.4)

```bash
xmllint --xpath 'string(//*[local-name()="receiver"]//*[local-name()="id"][@root="2.16.840.1.113883.3.989.2.1.3.14"]/@extension)' CASE-20260331-QTVA.xml
```

If either command returns an empty string, the validator will interpret the tag as missing (or not located where expected).

---

## Next Steps

1. Add top-level envelope `<sender>` and `<receiver>` blocks as above.
2. Ensure both N.1.3 (sender) and N.1.4 (receiver) are present **inside** those blocks.
3. Replace `YOUR_SENDER_IDENTIFIER` with the correct value expected for your test submission (confirm with ESGNG support if needed).
4. Resubmit as a new submission in USP and monitor Status History for ACKs.
