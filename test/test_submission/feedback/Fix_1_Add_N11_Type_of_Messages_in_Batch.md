# Fix #1 – Add N.1.1 (Type of Messages in Batch)

## Issue  
ACK3 returned:

> **Invalid XML: N.1.1 must be provided**

This means the required **N.1.1 – Type of Messages in Batch** element is missing from the HL7 batch wrapper (`MCCI_IN200100UV01`).

---

## What N.1.1 Represents

N.1.1 = **Type of Messages in Batch**

In the HL7 E2B(R3) wrapper, this is represented by a `<name>` element at the **batch envelope level**.

OID (codeSystem):  
`2.16.840.1.113883.3.989.2.1.1.1`

---

## Required XML Element

Add the following element inside the root envelope (`MCCI_IN200100UV01`), near the other header fields (typically after `<interactionId>`):

```xml
<name code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.1"/>
```

---

## Placement Example (Correct Location)

```xml
<MCCI_IN200100UV01 xmlns="urn:hl7-org:v3" ...>

  <id root="..." extension="..."/>
  <creationTime value="..."/>

  <interactionId root="2.16.840.1.113883.1.6" extension="MCCI_IN200100UV01"/>

  <!-- ADD THIS -->
  <name code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.1"/>

  <processingCode code="P"/>
  ...
```

---

## Important Notes

- Only one N.1.1 `<name>` element should appear in the batch wrapper.
- Do not place it inside `PORR_IN049016UV`.
- Ensure it is at the **envelope level**, not nested deeper.

---

## After Applying Fix

- Save updated XML
- Submit as a **new USP test submission**
- Monitor for new ACK1 → ACK3
