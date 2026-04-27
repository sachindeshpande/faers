# GAP-IND-002 — Two Business Rule Violations in Premarket IND/SUSAR XML

**Status:** Open  
**Severity:** Blocking — case is CR (Case Reject) + AR (Application Reject)  
**Discovered:** 2026-04-27  
**Evidence:** ACK3 for IND-T01 (`ci260427183154.d320904e4d5f43f7820a340ea4339048.ack`)  
**Gateway routing:** Confirmed correct (`ZZFDATST_PREMKT` in ACK batch sender — GAP-IND-001 closed)  

---

## Context

The second IND-T01 submission reached the correct FDA gateway and was validated by the
2.18 business rules engine. Gateway routing is now resolved. However, FDA returned two
business rule rejections:

```
1: IND number of cross reported IND (FDA.C.5.6.r) is mandatory when
   IND Number where AE Occurred (FDA.C.5.5a) is not empty.

2: Required Intervention (FDA.E.i.3.2h) must always contain
   nullFlavour "NI" for a pre-market case
```

---

## Issue A — FDA.C.5.6.r (Cross-Reported IND Number) Missing

### What FDA requires

When `FDA.C.5.5a` (IND Number where AE Occurred) is populated, the field
`FDA.C.5.6.r` (IND Number of Cross Reported IND) is **mandatory**. It is a repeating
field — there must be at least one entry.

### What the XML currently has

```xml
<!-- FDA.C.5.5a present ✓ -->
<authorization typeCode="AUTH">
  <studyRegistration classCode="ACT" moodCode="EVN">
    <id extension="123456" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.1"/>
  </studyRegistration>
</authorization>

<!-- FDA.C.5.6.r absent ✗ — causes rejection -->
```

### What the XML must have

Add one or more `authorization` blocks with OID `2.16.840.1.113883.3.989.5.1.2.2.1.2.3`
immediately after the C.5.5a block, inside the same `researchStudy` element:

```xml
<!-- FDA.C.5.5a: IND Number where AE Occurred -->
<authorization typeCode="AUTH">
  <studyRegistration classCode="ACT" moodCode="EVN">
    <id extension="123456" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.3"/>
    <!-- FDA.C.5.6.r: IND number of cross reported IND -->
  </studyRegistration>
</authorization>
```

Reference: `test/test_submission/FDA ICSR XML Instances/FAERS2022Scenario3.xml` lines 99–110.
FDA Scenario 3 shows two cross-reported entries (`222222`, `333333`) in addition to the
main IND (`123456`). The OID for C.5.6.r is `.2.3`; the OID for C.5.5a is `.2.1`.

### Code change — data model

File: `faers-app/src/shared/types/indCase.types.ts`

Add a `crossReportedIndNumbers` field to the `IndStudyInfo` type (or equivalent study
interface). This is a string array — one entry per cross-reported IND:

```typescript
// Before
export interface IndStudyInfo {
  indNumber: string;           // FDA.C.5.5a
  studyNumber?: string;        // C.5.3
  // ...
}

// After
export interface IndStudyInfo {
  indNumber: string;            // FDA.C.5.5a — IND where AE occurred
  crossReportedIndNumbers: string[];  // FDA.C.5.6.r — mandatory when indNumber present
  studyNumber?: string;         // C.5.3
  // ...
}
```

### Code change — XML generator

File: `faers-app/src/main/services/xmlGeneratorService.ts`  
Function: the `researchStudy` block builder (~line 669, the `buildResearchStudy` method or
equivalent)

After emitting the C.5.5a authorization block, iterate `crossReportedIndNumbers` and emit
one block per entry:

```typescript
// C.5.5a — IND where AE occurred (already present)
lines.push(`<authorization typeCode="AUTH">`);
lines.push(`  <studyRegistration classCode="ACT" moodCode="EVN">`);
lines.push(`    <id extension="${indNumber}" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.1"/>`);
lines.push(`  </studyRegistration>`);
lines.push(`</authorization>`);

// FDA.C.5.6.r — cross-reported IND(s) — mandatory when C.5.5a is present
for (const crossInd of indStudy.crossReportedIndNumbers ?? []) {
  lines.push(`<authorization typeCode="AUTH">`);
  lines.push(`  <studyRegistration classCode="ACT" moodCode="EVN">`);
  lines.push(`    <id extension="${this.escapeXml(crossInd)}" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.3"/>`);
  lines.push(`  </studyRegistration>`);
  lines.push(`</authorization>`);
}
```

### Validation rule to add

File: `faers-app/src/main/services/validationService.ts`

Add a premarket-specific business rule: if `indStudy.indNumber` is non-empty and
`indStudy.crossReportedIndNumbers` is empty or absent, emit an error:

```
FDA.C.5.6.r: At least one cross-reported IND number is required when FDA.C.5.5a
(IND Number where AE Occurred) is populated.
```

### Test case update

For all existing IND test JSON files, add a `crossReportedIndNumbers` array. Use a
distinct placeholder value to distinguish from the main IND:

```json
"indStudy": {
  "indNumber": "123456",
  "crossReportedIndNumbers": ["654321"],
  ...
}
```

---

## Issue B — FDA.E.i.3.2h (Required Intervention) Must Be `nullFlavor="NI"` for Premarket

### What FDA requires

`FDA.E.i.3.2h` (`requiredIntervention`) is a FDA-specific seriousness indicator that has
**no meaningful value in a premarket context**. FDA's 2.18 business rules mandate that it
must always carry `nullFlavor="NI"` (Not Implemented / Not Applicable) for any premarket
case. A boolean value (`true`/`false`) is rejected.

### What the XML currently has

```xml
<!-- Wrong for premarket -->
<outboundRelationship2 typeCode="PERT">
  <observation classCode="OBS" moodCode="EVN">
    <code code="7" codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.3"
          displayName="requiredIntervention"/>
    <value xsi:type="BL" value="false"/>
  </observation>
</outboundRelationship2>
```

### What the XML must have

```xml
<!-- Correct for premarket -->
<outboundRelationship2 typeCode="PERT">
  <observation classCode="OBS" moodCode="EVN">
    <code code="7" codeSystem="2.16.840.1.113883.3.989.5.1.2.2.1.3"
          displayName="requiredIntervention"/>
    <value xsi:type="BL" nullFlavor="NI"/>
  </observation>
</outboundRelationship2>
```

Reference: `test/test_submission/FDA ICSR XML Instances/FAERS2022Scenario3.xml` lines
257–261 (both drug blocks show identical `nullFlavor="NI"` pattern).

### Code change — XML generator

File: `faers-app/src/main/services/xmlGeneratorService.ts`  
Location: the reaction seriousness block, where `requiredIntervention` (code `7`) is emitted.

Change the value emission to be conditional on submission type:

```typescript
// Before — emits a boolean regardless of submission type
const requiredInterventionValue = reaction.requiredIntervention ? 'true' : 'false';
lines.push(`<value xsi:type="BL" value="${requiredInterventionValue}"/>`);

// After — nullFlavor NI for premarket, boolean for postmarket
if (isPremarket) {
  lines.push(`<value xsi:type="BL" nullFlavor="NI"/>`);
} else {
  const requiredInterventionValue = reaction.requiredIntervention ? 'true' : 'false';
  lines.push(`<value xsi:type="BL" value="${requiredInterventionValue}"/>`);
}
```

Where `isPremarket` is derived from `options.submissionReportType === 'Premarket'`, already
available in the generator's scope.

---

## Scope Note — Other Seriousness Boolean Fields

FDA Scenario 3 uses `nullFlavor="NI"` for ALL E.i.3.2 seriousness fields
(`resultsInDeath`, `isLifeThreatening`, `requiresInpatientHospitalization`, etc.), not just
`requiredIntervention`. However, the 2.18 business rules only **rejected** field E.i.3.2h
in this submission. Do not change the other seriousness booleans preemptively — let the
ACK from the next submission confirm whether they also need `nullFlavor="NI"` before
modifying them. This avoids over-fixing against unconfirmed rules.

---

## OID Reference for C.5 Fields

| FDA Field | OID | Purpose |
|-----------|-----|---------|
| `C.5.3` | `2.16.840.1.113883.3.989.2.1.3.5` | Sponsor Study Number |
| `C.5.1.r.1` | `2.16.840.1.113883.3.989.2.1.3.6` | Study Registration Number (NCT etc.) |
| `FDA.C.5.5a` | `2.16.840.1.113883.3.989.5.1.2.2.1.2.1` | IND Number where AE occurred |
| `FDA.C.5.6.r` | `2.16.840.1.113883.3.989.5.1.2.2.1.2.3` | Cross-reported IND number (repeating) |

---

## Empirical Policy Update

After the next successful CA+AA on `ZZFDATST_PREMKT`, update `IND_POLICY` in
`faers-app/src/main/services/faersEmpiricalPolicy.ts`:

```typescript
// Add new entries:
crossReportedInd:      { value: '<required — same OID .2.3>',   verdict: 'untested' },
requiredIntervention:  { value: 'nullFlavor="NI"',               verdict: 'untested' },

// Promote on CA+AA:
batchReceiver:         { value: 'ZZFDATST_PREMKT', verdict: 'proven_safe',
                         evidence: 'IND-T01 ACK3 CA+AA ZZFDATST_PREMKT 2026-04-27' },
```

---

## Verification Checklist for Next Submission

After applying both fixes and regenerating the XML, confirm:

```xml
<!-- C.5.6.r present, OID ends in .2.3 -->
<id extension="654321" root="2.16.840.1.113883.3.989.5.1.2.2.1.2.3"/>

<!-- requiredIntervention uses nullFlavor, not boolean -->
<value xsi:type="BL" nullFlavor="NI"/>
```

Submit IND-T01 first. A CR-free ACK (CA + AA) closes this gap and proves both values
on `ZZFDATST_PREMKT`.
