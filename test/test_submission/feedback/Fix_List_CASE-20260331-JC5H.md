# Fix List — CASE-20260331-JC5H.xml (FAERS/AERS USP **TEST**)

**File reviewed:** `CASE-20260331-JC5H.xml`  
**Goal:** Prevent “missing batch sender identifier tag” by ensuring the validator’s expected **XPath** finds a populated Batch Sender Identifier.

---

## What’s already correct ✅

- **Test receiver routing (envelope):** `ZZFDATST` is set at Batch Receiver Identifier (OID `…3.14`).  
  Present here:

```xml
<receiver typeCode="RCV">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id root="2.16.840.1.113883.3.989.2.1.3.14" extension="ZZFDATST"/>
  </device>
</receiver>
```

- **Sender identifier value is non-empty** (`334818134`) in both envelope and nested sender blocks (but see issue below).

---

## Issue to fix ❗

### 1) Batch Sender Identifier “tag” may be missing (wrong `root` OID)

Deepak’s message (“missing batch sender identifier tag” / “verify the xpath”) strongly implies their validator looks for the **E2B(R3) Batch Sender Identifier element** using this OID:

- `root="2.16.840.1.113883.3.989.2.1.3.13"`

In the current XML, your sender `id` uses a **different** root OID:

- `root="1.3.6.1.4.1.519.1"` (commonly associated with DUNS identifier type)

So a validator that checks the XPath:

- `//sender//id[@root="2.16.840.1.113883.3.989.2.1.3.13"]/@extension`

…will find **nothing**, and report the tag as “missing,” even though you provided a DUNS value.

---

## Required change (most robust)

Add an additional `<id>` with the **…3.13** root (and keep your DUNS-typed id if you wish).

### A) Envelope sender/device

Current:

```xml
<sender typeCode="SND">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id root="1.3.6.1.4.1.519.1" extension="334818134"/>
  </device>
</sender>
```

Change to:

```xml
<sender typeCode="SND">
  <device classCode="DEV" determinerCode="INSTANCE">
    <!-- Batch Sender Identifier tag expected by many E2B(R3) validators -->
    <id root="2.16.840.1.113883.3.989.2.1.3.13" extension="334818134"/>

    <!-- Optional: keep DUNS-typed representation if your generator expects it -->
    <id root="1.3.6.1.4.1.519.1" extension="334818134"/>
  </device>
</sender>
```

### B) Nested sender/device (inside PORR_IN049016UV)

Current:

```xml
<PORR_IN049016UV>
  ...
  <sender typeCode="SND">
    <device classCode="DEV" determinerCode="INSTANCE">
      <id root="2.16.840.1.113883.3.989.2.1.3.12" extension="1"/>
      <id root="1.3.6.1.4.1.519.1" extension="334818134"/>
    </device>
  </sender>
  ...
</PORR_IN049016UV>
```

Change to:

```xml
<PORR_IN049016UV>
  ...
  <sender typeCode="SND">
    <device classCode="DEV" determinerCode="INSTANCE">
      <id root="2.16.840.1.113883.3.989.2.1.3.12" extension="1"/>

      <!-- Batch Sender Identifier tag expected by many E2B(R3) validators -->
      <id root="2.16.840.1.113883.3.989.2.1.3.13" extension="334818134"/>

      <!-- Optional: keep DUNS-typed representation -->
      <id root="1.3.6.1.4.1.519.1" extension="334818134"/>
    </device>
  </sender>
  ...
</PORR_IN049016UV>
```

---

## XPath checks (to match Deepak’s request)

After the change, these must return a **non-empty** value.

### Batch Sender Identifier present + populated

```bash
xmllint --xpath 'string(//*[local-name()="sender"]//*[local-name()="id"][@root="2.16.840.1.113883.3.989.2.1.3.13"]/@extension)' CASE-20260331-JC5H.xml
```

### Batch Receiver Identifier (test routing)

```bash
xmllint --xpath 'string(//*[local-name()="receiver"]//*[local-name()="id"][@root="2.16.840.1.113883.3.989.2.1.3.14"]/@extension)' CASE-20260331-JC5H.xml
```

Expected output for the receiver check (test): `ZZFDATST`

---

## Optional note to ESGNG support (if needed)

> I populated the sender identifier with DUNS `334818134` and set receiver to `ZZFDATST`. I’m also adding the Batch Sender Identifier element with `root="…3.13"` so your validator’s XPath can resolve it. Please confirm if any additional header identifiers are required for the FAERS/AERS test flow via USP.

