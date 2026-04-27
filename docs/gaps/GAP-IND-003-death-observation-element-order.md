# GAP-IND-003 — Death Observation Element Order (C28554) Schema Violation

**Status:** Open  
**Severity:** Blocking — CR+AR schema parse error  
**Discovered:** 2026-04-27  
**Evidence:** ACK3 for IND-T05 (`ci260427223649.edcd913f73ee440e9bf06b971b6d384a.ack`)  
**Affects:** IND-T05 (fatal/7-day report) and any future fatal SUSAR case  

---

## Error

```
org.xml.sax.SAXParseException; lineNumber: 127; columnNumber: 56;
cvc-complex-type.2.4.a: Invalid content was found starting with element
'{"urn:hl7-org:v3":effectiveTime}'. One of '{"urn:hl7-org:v3":value,
"urn:hl7-org:v3":interpretationCode, ...' is expected.
```

FDA's schema validator hit `effectiveTime` at line 127 when it expected `value`.
The HL7 v3 `observation` element has a strict child element sequence — `effectiveTime`
must precede `value`. The generator emits them in the wrong order for the death
observation block.

---

## Root Cause

The death observation in IND-T05 (lines 123–129 of the generated XML):

```xml
<!-- WRONG — effectiveTime after value -->
<subjectOf2 typeCode="SBJ">
  <observation classCode="OBS" moodCode="EVN">
    <code code="C28554" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Death"/>
    <value xsi:type="BL" value="true"/>
    <effectiveTime value="20260312"/>     ← schema violation: must come before value
  </observation>
</subjectOf2>
```

HL7 v3 `observation` sequence (relevant excerpt):
1. `id`
2. `code`
3. `effectiveTime`   ← required before value
4. `value`
5. `interpretationCode`
6. `outboundRelationship2`

---

## Fix

Swap the order of `effectiveTime` and `value` in the death observation:

```xml
<!-- CORRECT -->
<subjectOf2 typeCode="SBJ">
  <observation classCode="OBS" moodCode="EVN">
    <code code="C28554" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Death"/>
    <effectiveTime value="20260312"/>     ← effectiveTime first
    <value xsi:type="BL" value="true"/>  ← value second
  </observation>
</subjectOf2>
```

---

## Code Change

File: `faers-app/src/main/services/xmlGeneratorService.ts`  
Location: the fatal/death observation builder — the block that emits the `C28554`
(Death) observation when `resultsInDeath === true`.

Find the section that builds this observation and ensure `effectiveTime` is emitted
immediately after `<code .../>` and before `<value .../>`:

```typescript
// Death observation (C28554) — only emitted for fatal cases
lines.push(`<subjectOf2 typeCode="SBJ">`);
lines.push(`  <observation classCode="OBS" moodCode="EVN">`);
lines.push(`    <code code="C28554" codeSystem="2.16.840.1.113883.3.26.1.1" displayName="Death"/>`);
// effectiveTime MUST come before value per HL7 v3 schema
if (deathDate) {
  lines.push(`    <effectiveTime value="${deathDate}"/>`);   // ← move before value
}
lines.push(`    <value xsi:type="BL" value="true"/>`);       // ← value after effectiveTime
lines.push(`  </observation>`);
lines.push(`</subjectOf2>`);
```

---

## Scope

This ordering rule applies to **all** `observation` elements in E2B(R3) XML —
`effectiveTime` always precedes `value`. Check the generator for any other observation
blocks that emit `effectiveTime` after `value`. The most likely other candidate is the
reaction onset/resolution `effectiveTime` on the main reaction observation, but that
block uses `xsi:type="IVL_TS"` with `<low>`/`<high>` children and typically appears
before the reaction `value`, so it may already be correct.

---

## Verification

After the fix, confirm the generated XML has:

```xml
<code code="C28554" .../>
<effectiveTime value="YYYYMMDD"/>   ← before value
<value xsi:type="BL" value="true"/> ← after effectiveTime
```

Resubmit IND-T05 with a new batch UUID. Expected result: CA+AE (same C.5.6.r warning
as T01 and T02).
