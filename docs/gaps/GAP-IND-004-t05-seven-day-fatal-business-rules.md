# GAP-IND-004 — T05 Business Rule Rejections: C.1.7.1 Wrong Code + D.9.1 Missing Date of Death + D.9.3 Missing Autopsy

**Status:** Open  
**Severity:** Blocking — CR+AR (business rule rejections)  
**Discovered:** 2026-04-27  
**Evidence:** ACK4 (`ci260427231626`) — 4 rejections; ACK5 (`ci260428001004`) — 1 rejection  
**Affects:** IND-T05 (fatal/7-day report) and any future fatal SUSAR case  

---

## Background

GAP-IND-003 (element ordering) was resolved — the SAXParseException is gone.
The latest ACK now reaches FDA business rule validation and returns four rejections:

```
1: If Locally Expedited (C.1.7) is set to yes and Type of Report (C.1.3) is 2 or 1
   then Local Criteria Report Type (FDA.C.1.7.1) must be 7-Day or 15-Day.
2: For pre-market ICSR's If Results in Death (E.i.3.2a) is true then Date of Death
   must be provided.
3: FDA.C.1.7.1 must have Observation Code Value of 1 or 6 when C.1.7 = true
   and C.1.3 = 1 or 2.
4: Element value not allowed for tag FDA.C.1.7.1.
```

Rejections 1, 3, and 4 all trace to the same root cause (wrong codelist value).
Rejection 2 is an independent issue (missing D.9.1 Date of Death on patient).

---

## Issue A: FDA.C.1.7.1 Wrong Code ("7" is not in the premarket codelist)

### Root Cause

The XML generator uses code `"7"` for a 7-Day report:

```xml
<!-- WRONG — code="7" does not exist in FDA premarket codelist -->
<observationEvent classCode="OBS" moodCode="EVN">
  <code code="C54588" codeSystem="2.16.840.1.113883.3.26.1.1"
        displayName="localCriteriaReportType"/>
  <value xsi:type="CE" code="7"
         codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.1.1"
         displayName="7-Day"/>
</observationEvent>
```

FDA's premarket codelist for `localCriteriaReportType` (OID 2.16.840.1.113883.3.989.5.1.2.2.1.1.1):

| Code | Label   | Use                       |
|------|---------|---------------------------|
| `1`  | 15-Day  | 15-day IND safety report  |
| `6`  | 7-Day   | 7-day IND safety report   |

Code `"7"` does not exist. Code `"6"` is the correct value for a 7-Day report.
Rejections 3 and 4 are both triggered by this invalid code value; fixing it to `"6"` resolves all three (rejections 1, 3, 4).

### Fix

```xml
<!-- CORRECT — code="6" for 7-Day premarket report -->
<observationEvent classCode="OBS" moodCode="EVN">
  <code code="C54588" codeSystem="2.16.840.1.113883.3.26.1.1"
        displayName="localCriteriaReportType"/>
  <value xsi:type="CE" code="6"
         codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.1.1"
         displayName="7-Day"/>
</observationEvent>
```

### Code Change

File: `faers-app/src/main/services/xmlGeneratorService.ts`  
Location: the block that emits `localCriteriaReportType` for expedited IND reports.

Find the switch/map that converts `localCriteriaReportType` to a code value and correct
the 7-Day mapping:

```typescript
// localCriteriaReportType — FDA premarket codelist
// OID 2.16.840.1.113883.3.989.5.1.2.2.1.1.1
const LOCAL_CRITERIA_REPORT_TYPE_CODES: Record<string, string> = {
  '15-Day': '1',
  '7-Day':  '6',   // ← NOT '7' — FDA premarket codelist code for 7-Day is 6
};
```

---

## Issue B: D.9.1 Date of Death Not Encoded in Patient Demographics

### Root Cause

For pre-market fatal ICSRs, FDA business rule 2 requires Date of Death (D.9.1) to be
present in the **patient demographics block** as `<deceasedTime>` on `player1`.

The current XML only encodes death date as `<effectiveTime>` on the C28554 death
seriousness observation. FDA's validator does NOT count this as satisfying D.9.1 —
it requires the explicit `<deceasedTime>` element on the patient.

Current (missing `deceasedTime`):
```xml
<player1 classCode="PSN" determinerCode="INSTANCE">
  <name>T.P.</name>
  <administrativeGenderCode code="1" displayName="Male" codeSystem="1.0.5218"/>
  <birthTime value="19700515"/>
  <!-- deceasedTime MISSING — causes rejection 2 -->
</player1>
```

C28554 observation (this does NOT satisfy D.9.1 per FDA validator):
```xml
<observation classCode="OBS" moodCode="EVN">
  <code code="C28554" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Death"/>
  <effectiveTime value="20260312"/>
  <value xsi:type="BL" value="true"/>
</observation>
```

### Confirmed Pattern

FAERS2022Scenario6.xml (the canonical FDA fatal-case reference), line ~24002:

```xml
<player1 classCode="PSN" determinerCode="INSTANCE">
  <name>...</name>
  <administrativeGenderCode .../>
  <birthTime value="..."/>
  <deceasedTime value="20090101"/>
  <!-- D.9.1: Date of Death -->
</player1>
```

`<deceasedTime>` is a sibling of `<birthTime>` on `player1`, inside `primaryRole`.

### Fix

Add `<deceasedTime>` immediately after `<birthTime>` on `player1` when the case is
fatal and a death date is available:

```xml
<!-- CORRECT — deceasedTime on player1 -->
<player1 classCode="PSN" determinerCode="INSTANCE">
  <name>T.P.</name>
  <administrativeGenderCode code="1" displayName="Male" codeSystem="1.0.5218"/>
  <birthTime value="19700515"/>
  <deceasedTime value="20260312"/>   <!-- D.9.1: Date of Death -->
</player1>
```

The `<effectiveTime value="20260312"/>` on the C28554 observation should **remain** —
it documents the death date in the seriousness section. The `deceasedTime` on `player1`
is a separate, additional requirement for the demographics block.

### Code Change

File: `faers-app/src/main/services/xmlGeneratorService.ts`  
Location: the `player1` (patient demographics) builder.

Find the section that emits `birthTime` and add a conditional `deceasedTime` after it:

```typescript
// Patient demographics — player1
lines.push(`<player1 classCode="PSN" determinerCode="INSTANCE">`);
lines.push(`  <name>${patientInitials}</name>`);
lines.push(`  <administrativeGenderCode code="${genderCode}" displayName="${genderDisplay}" codeSystem="1.0.5218"/>`);
if (birthDate) {
  lines.push(`  <birthTime value="${birthDate}"/>`);
}
// D.9.1: Date of Death — required for fatal pre-market ICSRs
if (resultsInDeath && deathDate) {
  lines.push(`  <deceasedTime value="${deathDate}"/>`);   // ← add this block
}
lines.push(`</player1>`);
```

---

---

## Issue C: D.9.3 Was Autopsy Done? — Required When D.9.1 Is Present

### Root Cause

FDA business rule: when Date of Death (D.9.1) has a value, Was Autopsy Done? (D.9.3) must also have a value. This is a conditional field — triggered by the presence of `deceasedTime`. The T05 XML had no autopsy observation at all.

**Evidence:** ACK5 (`ci260428001004`) — sole remaining rejection after Issues A and B were fixed:
```
Since the element Date of Death - D.9.1/B.1.9.1b has a value, the element
Was Autopsy Done? - D.9.3/B.1.9.3 must contain a value.
```

### Fix

Add a D.9.3 `autopsy` observation as a `subjectOf2` on `primaryRole`, immediately after the C28554 death observation:

```xml
<!-- D.9.3: Was Autopsy Done? — required when D.9.1 is present -->
<subjectOf2 typeCode="SBJ">
  <observation classCode="OBS" moodCode="EVN">
    <code code="5" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="autopsy"/>
    <value xsi:type="BL" value="false"/>
    <!-- D.9.3: Was Autopsy Done? -->
  </observation>
</subjectOf2>
```

Use `value="true"` if autopsy was performed (which then allows/requires D.9.4.r autopsy-determined causes of death). Use `value="false"` if no autopsy was done. Confirmed pattern from `FAERS2022Scenario6.xml` line 24609.

### Code Change

File: `faers-app/src/main/services/xmlGeneratorService.ts`  
Location: the fatal case patient demographics / subjectOf2 builder.

Whenever `resultsInDeath === true`, emit the autopsy observation after the C28554 block:

```typescript
// D.9.3: Was Autopsy Done? — required whenever D.9.1 (Date of Death) is present
if (resultsInDeath) {
  const autopsyDone = caseData.autopsyDone ?? false;   // default false if not captured
  lines.push(`<subjectOf2 typeCode="SBJ">`);
  lines.push(`  <observation classCode="OBS" moodCode="EVN">`);
  lines.push(`    <code code="5" codeSystem="2.16.840.1.113883.3.989.2.1.1.19" displayName="autopsy"/>`);
  lines.push(`    <value xsi:type="BL" value="${autopsyDone}"/>`);
  lines.push(`    <!-- D.9.3: Was Autopsy Done? -->`);
  lines.push(`  </observation>`);
  lines.push(`</subjectOf2>`);
}
```

---

## Codelist Reference (for faersEmpiricalPolicy.ts)

After the fixes produce CA+AE, update `IND_POLICY`:

```typescript
localCriteriaReportType7Day: {
  value: 'code="6" (not "7")',
  verdict: 'proven_safe',
  evidence: 'IND-T05 CA+AE YYYYMMDD — FDA premarket 7-Day = code 6'
},
dateOfDeathDeceasedTime: {
  value: 'deceasedTime on player1',
  verdict: 'proven_safe',
  evidence: 'IND-T05 CA+AE YYYYMMDD — required for fatal pre-market ICSRs'
},
```

---

## Scope

Both fixes apply to **all fatal IND safety reports** (current and future):

- `localCriteriaReportType` 7-Day must always use `code="6"` in the FDA premarket codelist
- `deceasedTime` must always be added to `player1` whenever `resultsInDeath=true`
  and a death date is known

---

## Verification

After applying both fixes, the generated XML must have:

```xml
<!-- In player1 -->
<birthTime value="YYYYMMDD"/>
<deceasedTime value="YYYYMMDD"/>   ← present

<!-- In localCriteriaReportType observationEvent -->
<value xsi:type="CE" code="6" ... displayName="7-Day"/>   ← code="6" not "7"
```

Resubmit IND-T05 with a new batch UUID. Expected result: CA+AE (same C.5.6.r warning
as T01 and T02).
