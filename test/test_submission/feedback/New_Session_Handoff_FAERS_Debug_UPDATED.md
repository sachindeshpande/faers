# Handoff Packet — DeepQuence FAERS/AERS USP TEST Submission Debug (Updated)

**Purpose:** Give a new chat session everything needed to continue troubleshooting FDA ESG NextGen / CDER FAERS AERS **TEST** submissions without re-reading prior history.

**Current date context:** April 10, 2026  
**Submission path:** USP portal → ESGNG → CDER  
**Status: ✅ SUBMISSION ACCEPTED — v37 fully accepted, Case CA + Batch AA**  
**Final XML:** `CASE-20260331-EMJQ_fixed_v37_patch.xml`  
**Final ACK:** `ci260410211359.1842efd7d3d24e7cbd5a9703e90bdebc.ack`

---

## 1) Goal

Submit a **valid E2B(R3) HL7 v3 ICSR XML** as a **TEST** AERS submission through USP such that CDER:
1. Parses and loads the report,
2. Passes schema validation,
3. Passes business-rule validation with no blocking rejects.

---

## 2) Stable configuration

### Organization identifiers
- Company: **DeepQuence**
- DUNS: **334818134**
- Email domain: `@deepquence.com`

### USP submission selections
- Submission Type: **AERS**
- Destination/Center: **CDER**
- Test submission: **Yes**
- File Type: **SINGLE**

### Batch routing identifiers
- TEST batch receiver id: `ZZFDATST`
- PORR receiver/device id: `CDER`

---

## 3) Critical structural knowledge (hard-won)

### CDER PORR schema constraint — `<author>` placement (v36 ACK confirmed)

The CDER PORR schema **does NOT allow `<author>` as a direct child of `<investigationEvent>`**.

The valid content model at that position is ONLY:
```
reference, component, outboundRelationship, subjectOf1, subjectOf2
```

v35 and v36 both placed `<author>` directly under `<investigationEvent>` (based on JC5H reference). Both caused a hard SAX parse exception:
```
cvc-complex-type.2.4.a: Invalid content was found starting with element
'{"urn:hl7-org:v3":author}'. One of '{"urn:hl7-org:v3":reference,
"urn:hl7-org:v3":component, "urn:hl7-org:v3":outboundRelationship,
"urn:hl7-org:v3":subjectOf1, "urn:hl7-org:v3":subjectOf2}' is expected.
```

**JC5H reference is NOT valid for CDER PORR.** JC5H has no `xsi:schemaLocation` and uses a different schema. Do not use it as a structural reference.

### Correct reporter + sender block location (v37)

The reporter block (C.3) goes in:
```
investigationEvent/subjectOf1/controlActEvent/author[@typeCode="AUT"]
```

with OID **`.3.989.2.1.1.7`** (sender type value set — this is the OID the FDA 2.18 engine uses to read C.3 from this container path). Confirmed by v29–v32 which had no schema exceptions and progressively resolved C.3 fields.

Note: The OID seems counter-intuitive (`.1.7` = sender type), but the evidence is clear:
- OID `.1.7` in `subjectOf1/controlActEvent` → engine reads C.3 fields ✅ (v29–v32 behavior)
- OID `.1.6` in `subjectOf1/controlActEvent` → engine skips entire block → ALL 13 C.3 fail ❌ (v34 confirmed)

### C.3.2 structural requirements (v29 vs v30 machine comparison)

C.3.2 (reporter first name) passed **only in v29** and failed in every version v30–v36.

A machine comparison of v29 and v30 reporter blocks confirmed the following:

| Element | v29 (C.3.2 PASS) | v30 (C.3.2 FAIL) |
|---|---|---|
| `asLocatedEntity` in `assignedPerson` | **PRESENT** | **PRESENT** |
| `representedOrganization` structure | **NESTED** (outer + inner) | **FLAT** (one level) |
| fax: telecom | absent | present |
| `<country>` in addr | absent | absent |

**Critical finding:** `asLocatedEntity` is present in **both** v29 and v30. It is a **neutral factor** — it does NOT explain C.3.2 passing or failing. The sole confirmed structural difference is the **nested vs. flat `representedOrganization`**.

**v29 (C.3.2 PASS) — nested org:**
```xml
<representedOrganization classCode="ORG" determinerCode="INSTANCE">
  <name>Regulatory</name>                          ← outer = department
  <assignedEntity classCode="ASSIGNED">
    <representedOrganization classCode="ORG" determinerCode="INSTANCE">
      <name>DeepQuence</name>                      ← inner = company
    </representedOrganization>
  </assignedEntity>
</representedOrganization>
```

**v30 (C.3.2 FAIL) — flat org:**
```xml
<representedOrganization classCode="ORG" determinerCode="INSTANCE">
  <name>DeepQuence</name>
</representedOrganization>
```

v37 restores the nested org structure (outer="Drug Safety", inner="DeepQuence"). The `asLocatedEntity` is also retained as a neutral element matching the v29 baseline.

**Remaining unknowns in v37 vs v29:**
- Outer org name changed: "Regulatory" → "Drug Safety" (content only, very low risk)
- `<country>US</country>` added to addr (not in v29 or v30 — low risk, untested element)

### `subjectOf1` position within `investigationEvent`

The `subjectOf1` (reporter) block must be positioned:
- **AFTER** all `<component>` and `<outboundRelationship>` children
- **BEFORE** `<subjectOf2>` (investigationCharacteristic) children

This matches v29's position and is confirmed by the CDER schema content model.

### OID distinction (critical)
- `2.16.840.1.113883.3.989.2.1.1.6` = **reporter qualification** value set (Physician, etc.)
- `2.16.840.1.113883.3.989.2.1.1.7` = **sender type** value set — use THIS OID in the `subjectOf1/controlActEvent/author` block. The FDA 2.18 engine reads C.3 from this OID in this location.

### Field mappings (confirmed by ACK regression testing)
- C.3.1  → `assignedEntity/code[@codeSystem=".1.7"]/@code`
- C.3.2  → `assignedEntity/assignedPerson/name/given`
- C.3.3.1 → `assignedEntity/assignedPerson/name/family`
- C.3.3.2 → `assignedEntity/assignedPerson/name/prefix`
- C.3.3.3 → `assignedEntity/assignedPerson/name/given` (same as C.3.2)
- C.3.3.5 → `assignedEntity/representedOrganization/name`
- C.3.4.x → `assignedEntity/addr` (streetAddressLine, city, state, postalCode, country)
- C.3.4.6 → `assignedEntity/addr/country`
- C.3.4.7 → `assignedEntity/telecom[@value starts with "tel:"]`
- C.3.4.8 → `assignedEntity/telecom[@value starts with "fax:"]`

---

## 4) Version history (most recent first)

### v37 ← ✅ ACCEPTED (Case CA + Batch AA)
File: `CASE-20260331-EMJQ_fixed_v37_patch.xml`  
UUID: `DeepQuenceTest-20260410-v37-b5c6d7e8-1a2b-4c3d-8e9f-0a1b2c3d4e5f`  
ACK: `ci260410211359.1842efd7d3d24e7cbd5a9703e90bdebc.ack`  
Local report number: `837098`

Fixes that achieved acceptance:
1. Removed `<author>` direct children of `<investigationEvent>` (v35/v36 approach) — CDER PORR schema rejects them.
2. Restored `subjectOf1/controlActEvent/author` with OID `.1.7` (schema-valid path for reporter).
3. Restored **nested `representedOrganization`** (outer="Drug Safety", inner="DeepQuence") — the sole confirmed structural fix for C.3.2.
4. Retained `asLocatedEntity` in `assignedPerson` (neutral factor — present in both v29 and v30).
5. Retained all content from v30+: country in addr, fax: telecom, structured name, MedDRA codes, C.1.7 expedited fields.

Lint: **55 ✅ PASS | 0 WARN | 0 FAIL**

**ACK result:**
- Case: `typeCode="CA"` — "Report Loaded Successfully" ✅
- Batch: `typeCode="AA"` — "Application Acknowledgement Accept" ✅

---

### v36 — SUPERSEDED (schema exception)
File: `CASE-20260331-EMJQ_fixed_v36_patch.xml`  
UUID: `DeepQuenceTest-20260410-v36-a9c2e5b1-7d4f-4a8e-b3c6-0f1d2e3a4b5c`

ACK (`ci260410182936`): SAX parse exception at line 71 — `author` is NOT valid as a direct child of `investigationEvent`. Batch AR.

---

### v35 — SUPERSEDED (schema exception, not submitted)
UUID: `DeepQuenceTest-20260410-v35-f3a7d841-2b6e-4c9f-a0d5-8e1b3c7f2a96`  
Same issue as v36 — reporter `author` placed as direct child of `investigationEvent`.

---

### v34
UUID: `DeepQuenceTest-20260409-v34-e7b2c095-1f4a-4d3e-a6c8-7d9f2b5e1a04`

ACK (`ci260410020531`): Schema-valid ✅. But ALL 13 C.3 fields "Data value required". Root cause: OID changed from `.1.7` → `.1.6` in `subjectOf1/controlActEvent/author`. The engine cannot find the reporter block with OID `.1.6` in that container.

---

### v33 — SCHEMA-INVALID
ACK (`ci260409041409`): SAX parse exception at line 429 — `primaryRole classCode="PRS"` rejected by CDER PORR schema.

---

### v32
ACK (`ci260409003237`): C.3.2 + C.3.3.3 rejected. OID `.1.7` (wrong) — reporter never found.

---

### v31
ACK (`ci260408193318`): C.3.2 + C.3.3.2 rejected. OID `.1.7` (wrong).

---

### v30
ACK (`ci260408183906`): C.3.2 rejected. OID `.1.7` (wrong). First clean business-rule ACK. All C.3 except C.3.2 passing with this OID in `subjectOf1/controlActEvent`.

---

### v29
ACK (`ci260408055227`): C.3.2 PASSED ✅. C.3.4.7 (telephone format) and D.7.2 (medical history) failed. **The only version where C.3.2 passed.** Had nested `representedOrganization` and `asLocatedEntity` in `assignedPerson`. OID `.1.7` in `subjectOf1/controlActEvent`.

---

## 5) Most recent ACK

File: `ci260410182936.58ad1e9e4bc24bccaae50e46b68049d2.ack` (v36 response)

**Case-level (typeCode="CR"):**
- Target: `SR-CASE-20260331-EMJQ` ✅ confirmed v36 received
- Schema exception — hard parse failure, NO fields extracted
- ACK receiver/sender extensions: EMPTY (hard parse failure before metadata)

**Batch-level (typeCode="AR"):**
- Batch UUID: `DeepQuenceTest-20260410-v36-...` ✅ confirmed
- "Application Acknowledgment Reject (parsing error, no data extracted, re-send the entire transaction)"
- Downstream consequence of case-level schema failure.

### Full ACK progression

| ACK | Submission | Case rejects | Batch | Key learning |
|---|---|---|---|---|
| ci260407232336 | v28.x | SAX parse exception | AR | Schema order |
| ci260408055227 | v29 | C.3.4.7, D.7.2 | AR | C.3.2 PASSED here (nested org + asLocatedEntity) |
| ci260408183906 | v30 | C.3.2 | AR | C.3.2 broke when org flattened + asLocatedEntity removed |
| ci260408193318 | v31 | C.3.2 + C.3.3.2 | AR | C.3.3.2=`name/prefix` confirmed |
| ci260409003237 | v32 | C.3.2 + C.3.3.3 | AR | C.3.3.3=`name/given` confirmed |
| ci260409041409 | v33 | SAX: `primaryRole` invalid | AR | CDER schema ≠ FDA reference schema |
| ci260410020531 | v34 | All 13 C.3 fields missing | AR | OID `.1.6` in `subjectOf1` = engine skips block |
| ci260410182936 | v36 | SAX: `author` invalid as direct child | AR | CDER schema forbids `author` at `investigationEvent` level |
| ci260410211359 | **v37** | **none — CA** ✅ | **AA** ✅ | **ACCEPTED — nested org restored; report loaded successfully** |

---

## 6) Validation assets

- Lint: `python3 faers_xml_lint.py package/CASE-XXXX.xml`
- Lint checks (v37): 55 checks — wrapper order, PORR routing, no-direct-author constraint, subjectOf1/controlActEvent reporter, asLocatedEntity check, nested org check, OID, name structure, addr/country, tel+fax, indication codes, reactions, demographics, C.1.7 expedited fields

---

## 7) Submission outcome

**v37 was fully accepted on April 10, 2026.**

- Case `SR-CASE-20260331-EMJQ` → **CA** ("Report Loaded Successfully")
- Batch `DeepQuenceTest-20260410-v37-b5c6d7e8-...` → **AA** ("Application Acknowledgement Accept")
- Local report number assigned: **837098**
- Zero rejections at any level.

### If submitting a follow-up or amended report in the future
1. Use `CASE-20260331-EMJQ_fixed_v37_patch.xml` as the baseline template.
2. Increment the version id (`<id root=".3.4" extension="..."/>`) for amendments.
3. Change the batch UUID to a new unique value.
4. Update `creationTime` and `availabilityTime`.
5. Run `python3 faers_xml_lint.py` before every submission.
6. The nested `representedOrganization` structure in `subjectOf1/controlActEvent/author` is required — do not flatten it.

---

## 8) Files to load in a new session

1. `New_Session_Handoff_FAERS_Debug_UPDATED.md`
2. `Comprehensive_XML_Fix_History_UPDATED.md`
3. `CASE-20260331-EMJQ_fixed_v37_patch.xml`
4. Newest ACK file

---

## 9) Best new-session prompt

> I am continuing a troubleshooting session for an FDA ESG NextGen / CDER FAERS AERS TEST submission. Please read the attached updated handoff, comprehensive fix history, current XML candidate, and latest ACK. The current best candidate is `CASE-20260331-EMJQ_fixed_v37_patch.xml`. Please do the following in order: (1) summarize the current state, (2) validate the XML against the golden checklist and identify anything the checklist may miss, (3) analyze the latest ACK in the context of the XML, (4) propose the smallest safe next patch version only if needed, and (5) clearly separate schema/order issues, business-rule issues, and representation/content issues. Please do not restart from first principles unless the evidence forces it.
