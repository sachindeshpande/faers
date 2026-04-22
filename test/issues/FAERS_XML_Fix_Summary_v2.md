# FAERS/AERS E2B(R3) XML — Issue & Fix Summary
**File reviewed:** `CASE-20260331-EMJQ_fixed_N2r2_withBatchTotalNumber.xml`  
**Fixed output:** `CASE-20260331-EMJQ_fixed_v2.xml`  
**Review date:** 2026-03-31  
**Submission target:** FDA ESG NextGen → CDER via USP (TEST)

---

## Session History: Issues Fixed in Prior Iterations

These were resolved before the current file was produced and are confirmed present/correct in both files.

| # | Issue | Fix Applied |
|---|---|---|
| H-1 | Corporate email required for ESGNG registration | Used Namecheap Private Email on deepquence.com domain |
| H-2 | Batch sender identifier tag missing | Populated `...3.13` OID with DUNS `334818134` as extension |
| H-3 | Wrong routing — submissions going to CBER instead of CDER | Changed receiver to `ZZFDATST` (test routing ID for CDER) |
| H-4 | N.1.1 missing — "must be provided" ACK3 error | Added `<name code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.1"/>` at envelope level |
| H-5 | N.2.r.2 missing — message sender identifier not present | Added `<id root="...3.11" extension="334818134"/>` in `PORR_IN049016UV/sender/device` |
| H-6 | N.1.2 / batch number schema ordering conflict | Replaced second `<id>` approach with `<batchTotalNumber value="1"/>` in correct position |

---

## Current File Review: Issues Found and Fixed

### 🔴 Fix 1 — `processingCode` = `"P"` (Production) on Both Envelope and PORR

**Risk:** High — likely ACK3 rejection  
**Location:** `MCCI_IN200100UV01/processingCode` and `PORR_IN049016UV/processingCode`

**Problem:**  
Both the envelope and message wrapper had `processingCode code="P"` (Production). For test submissions, this must be `"T"`. Note that `processingModeCode code="T"` (which was already set correctly) is a *different* field — transmission mode — and does not substitute for `processingCode`.

**Before:**
```xml
<processingCode code="P"/>
```

**After:**
```xml
<processingCode code="T"/>
```

Applied at both `MCCI_IN200100UV01` level and `PORR_IN049016UV` level.

---

### 🔴 Fix 2 — Reaction `<code>` Elements Missing MedDRA Code and codeSystem

**Risk:** High — likely ACK3 rejection  
**Location:** Both adverse event `<observation>` elements inside `<primaryRole>`  
**E2B(R3) field:** E.i.2.1b

**Problem:**  
Both reaction observations used only a `displayName` attribute with no `code` or `codeSystem`. FDA CDER validation requires MedDRA LLT codes with the MedDRA OID (`2.16.840.1.113883.6.163`).

**Before:**
```xml
<code displayName="Nausea"/>
<code displayName="Hepatic enzyme increased"/>
```

**After:**
```xml
<code code="10028813" codeSystem="2.16.840.1.113883.6.163" displayName="Nausea"/>
<code code="10019675" codeSystem="2.16.840.1.113883.6.163" displayName="Hepatic enzyme increased"/>
```

| Reaction | MedDRA LLT Code | Term |
|---|---|---|
| Nausea | 10028813 | Nausea (LLT) |
| Hepatic enzyme increased | 10019675 | Hepatic enzyme increased (LLT) |

---

### 🔴 Fix 3 — Height Value = `"null"` (Invalid Physical Quantity)

**Risk:** High — business rule failure  
**Location:** `<subjectOf2>` Height observation inside `<primaryRole>`

**Problem:**  
The height observation used the literal string `"null"` as a PQ (physical quantity) value, which is not valid XML Schema or E2B business rule compliant. A PQ value must be a real number.

**Before:**
```xml
<subjectOf2 typeCode="SBJ">
  <observation classCode="OBS" moodCode="EVN">
    <code code="C25347" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Height"/>
    <value xsi:type="PQ" value="null" unit="cm"/>
  </observation>
</subjectOf2>
```

**After:**  
The entire `<subjectOf2>` block for Height was **removed**. When a patient's height is unknown, the correct approach per E2B(R3) guidance is to omit the element rather than submit an invalid placeholder.

---

### 🔴 Fix 4 — Dechallenge/Rechallenge `code="null"` (Invalid Coded Value)

**Risk:** High — business rule failure  
**Location:** All four Dechallenge and Rechallenge `<value>` elements (suspect drug + concomitant drug)

**Problem:**  
The string `"null"` was used as a coded value for Dechallenge (OID `...1.16`) and Rechallenge (OID `...1.17`). These are FDA-defined codelists and `"null"` is not a valid entry. The validator will reject any coded CE value that does not match the codelist.

**Before:**
```xml
<value xsi:type="CE" code="null" codeSystem="2.16.840.1.113883.3.989.2.1.1.16"/>
<value xsi:type="CE" code="null" codeSystem="2.16.840.1.113883.3.989.2.1.1.17"/>
```

**After:**  
Replaced with `code="3"` (Unknown) for both Dechallenge and Rechallenge on both the suspect drug (Testdrugimab) and the concomitant drug (Lisinopril):

```xml
<value xsi:type="CE" code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.16"/>
<value xsi:type="CE" code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.17"/>
```

**Codelist reference (FDA E2B(R3) codelists):**

| Code | Meaning |
|---|---|
| 1 | Yes — effect abated after dose reduction or discontinuation |
| 2 | No — effect did not abate |
| 3 | Unknown |
| 4 | Not applicable |

---

### 🟡 Fix 5 — Missing C.1.8.1 Local Case Safety Report ID

**Risk:** Medium — may cause validation warning; recommended by FDA guidance  
**Location:** `investigationEvent` ID list

**Problem:**  
The `investigationEvent` had the worldwide unique case safety report ID (`...3.1`) and report type (`...3.4`), but was missing the **sender's local case ID** (`...3.2`, E2B field C.1.8.1). FDA guidance recommends this be populated.

**Before:** (only these two IDs present)
```xml
<id root="2.16.840.1.113883.3.989.2.1.3.1" extension="SR-CASE-20260331-EMJQ"/>
<id root="2.16.840.1.113883.3.989.2.1.3.4" extension="2"/>
```

**After:**
```xml
<id root="2.16.840.1.113883.3.989.2.1.3.1" extension="SR-CASE-20260331-EMJQ"/>
<id root="2.16.840.1.113883.3.989.2.1.3.2" extension="CASE-20260331-EMJQ"/>
<id root="2.16.840.1.113883.3.989.2.1.3.4" extension="2"/>
```

---

### 🟡 Fix 6 — Redundant `...3.13` (Batch Sender OID) and DUNS OID in PORR Message-Level Sender

**Risk:** Medium — redundancy may confuse validator; cleanup recommended  
**Location:** `PORR_IN049016UV/sender/device`

**Problem:**  
The message-level sender block contained four `<id>` elements, including `...3.13` (batch sender identifier OID) and the DUNS OID (`1.3.6.1.4.1.519.1`). These belong at the **envelope level** (`MCCI_IN200100UV01/sender`), not at the message level. The PORR sender should only identify the message sender (`...3.11`) and optionally the device instance (`...3.12`).

**Before:**
```xml
<sender typeCode="SND">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id root="2.16.840.1.113883.3.989.2.1.3.12" extension="1"/>
    <id root="2.16.840.1.113883.3.989.2.1.3.11" extension="334818134"/>
    <id root="2.16.840.1.113883.3.989.2.1.3.13" extension="334818134"/>  <!-- batch OID — wrong level -->
    <id root="1.3.6.1.4.1.519.1" extension="334818134"/>               <!-- DUNS — wrong level -->
  </device>
</sender>
```

**After:**
```xml
<sender typeCode="SND">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id root="2.16.840.1.113883.3.989.2.1.3.12" extension="1"/>
    <id root="2.16.840.1.113883.3.989.2.1.3.11" extension="334818134"/>
  </device>
</sender>
```

---

## Confirmed Correct — No Changes Needed

| Element | Status | Notes |
|---|---|---|
| XML well-formedness | ✅ | Passes `xmllint --noout` |
| N.1.1 `<name code="1" .../>` in envelope | ✅ | Present, correct OID |
| N.2.r.2 `...3.11` in PORR sender | ✅ | Present |
| `batchTotalNumber value="1"` | ✅ | Correct position after envelope `<sender>` |
| Receiver `ZZFDATST` | ✅ | Correct test routing ID |
| CDER routing `...3.7 extension="CDER"` | ✅ | Present in PORR receiver |
| Envelope batch sender `...3.13` + DUNS OID | ✅ | Correctly placed at envelope level |
| `acceptAckCode code="AL"` | ✅ | Both envelope and PORR |
| `investigationEvent` worldwide case ID (`...3.1`) | ✅ | Present |
| Case narrative (`<causalityAssessment>`) | ✅ | Properly structured with ED value |
| Patient demographics (age, weight, gender, DOB) | ✅ | Valid PQ/coded values |
| Suspect and concomitant drug structure | ✅ | Correctly wrapped in organizer with role codes |

---

## OID Reference Quick Sheet

| OID Suffix | Meaning |
|---|---|
| `...3.1` | Worldwide unique case safety report ID |
| `...3.2` | Sender's local case ID (C.1.8.1) |
| `...3.4` | Report type |
| `...3.7` | Receiving center identifier (e.g., CDER) |
| `...3.11` | Message sender identifier (N.2.r.2) |
| `...3.12` | Device instance number |
| `...3.13` | Batch sender identifier (N.2.r.1) |
| `...3.14` | Receiver / routing ID (e.g., ZZFDATST) |
| `2.16.840.1.113883.6.163` | MedDRA OID (for reaction codes) |
| `1.3.6.1.4.1.519.1` | DUNS number OID |

---

## Next Steps

1. Submit `CASE-20260331-EMJQ_fixed_v2.xml` via USP as a new TEST AERS submission (same USP settings as before).
2. Examine the next ACK3. With processingCode and MedDRA codes now correct, the most likely remaining issues would be in business rule validation of specific E2B fields deeper in the ICSR payload.
3. If ACK3 returns errors on the `<n>` element (person/org names), consider switching to the full `<name>` tag as an alternative — both are technically valid HL7 aliases but some FDA schema versions prefer `<name>`.
