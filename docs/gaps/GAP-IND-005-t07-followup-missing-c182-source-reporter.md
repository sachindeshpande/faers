# GAP-IND-005 — T07 Follow-up Report: Missing C.1.8.2 + sourceReport/C.2.r.5 + Reporter Email

**Status:** Open — ACK2 reduced to 2 rejections; C.1.8.2 cleared; C.2.r.4 identified as additional required field  
**Severity:** Blocking — CR+AR  
**Discovered:** 2026-04-28  
**Evidence:** ACK1 for IND-T07 (`ci260428030132.3cd4ba5835a24b82a144cdffe7b7cd19.ack`)  
**Affects:** IND-T07 (follow-up report) and any future follow-up SUSAR submission

---

## Rejections

```
1: Data value required for tag C.1.8.2.
2: Reporter's Email (FDA.C.2.r.2.8) is mandatory and must be in the format of
   telecom value='mailto:email@address.com' or telecom nullflavor='NASK' value='mailto'
3: C.2.r.5 must be primary for one reporter.
```

All three are absent from initial reports (T01/T02/T05 got CA+AE without them). The FDA
2.18 validator enforces these rules **only for follow-up reports (version ≥ 3)**.

---

## Root Cause

For follow-up reports, the FDA validator requires two additional `outboundRelationship`
blocks that are not needed (or not enforced) for initial reports:

### Block 1 — `initialReport` with C.1.8.2 (First Sender)

The follow-up must declare who first sent this case (C.1.8.2). This is encoded as a
`relatedInvestigation` with `code="initialReport"` containing a sender-type `code`.

The generator correctly emits a `followUpReport` outboundRelationship but omits the
companion `initialReport` block. FDA 2.18 requires both for follow-ups.

### Block 2 — `sourceReport` with `priorityNumber` + Reporter (C.2.r.5 + C.2.r.2.8)

C.2.r.5 "Primary Source for Regulatory Purposes" is encoded as `<priorityNumber value="1"/>`
on the `outboundRelationship` that wraps a `relatedInvestigation/code="sourceReport"`.
The reporter details (address, email, name, qualification) live inside that same block.

The generator puts the reporter in `subjectOf1` (the sender block), which works for
initial reports. For follow-up reports, FDA additionally requires the separate
`sourceReport` reporter block with `priorityNumber`. The email in `subjectOf1` does NOT
satisfy the FDA.C.2.r.2.8 requirement for follow-ups — it must also appear in the
`sourceReport` block.

---

## Reference

Confirmed from `FAERS2022Scenario3.xml` (lines 785–846):

```xml
<!-- Block 1: C.1.8.2 First Sender -->
<outboundRelationship typeCode="SPRT">
  <relatedInvestigation classCode="INVSTG" moodCode="EVN">
    <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="initialReport"/>
    <subjectOf2 typeCode="SUBJ">
      <controlActEvent classCode="CACT" moodCode="EVN">
        <author typeCode="AUT">
          <assignedEntity classCode="ASSIGNED">
            <code code="1" displayName="regulator" codeSystem="2.16.840.1.113883.3.989.2.1.1.3"/>
            <!-- C.1.8.2: First Sender of This Case -->
          </assignedEntity>
        </author>
      </controlActEvent>
    </subjectOf2>
  </relatedInvestigation>
</outboundRelationship>

<!-- Block 2: C.2.r.5 Primary Source + C.2.r.2.8 Reporter Email -->
<outboundRelationship typeCode="SPRT">
  <priorityNumber value="1"/>
  <!-- C.2.r.5: Primary Source for Regulatory Purposes #1 -->
  <relatedInvestigation classCode="INVSTG" moodCode="EVN">
    <code code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="sourceReport"/>
    <subjectOf2 typeCode="SUBJ">
      <controlActEvent classCode="CACT" moodCode="EVN">
        <author typeCode="AUT">
          <assignedEntity classCode="ASSIGNED">
            <addr>...</addr>
            <telecom value="tel:..."/>
            <telecom value="mailto:reporter@example.com"/>
            <!-- FDA.C.2.r.2.8: Reporter's Email -->
            <assignedPerson classCode="PSN" determinerCode="INSTANCE">
              <name>...</name>
              <asLocatedEntity classCode="LOCE">...</asLocatedEntity>
            </assignedPerson>
          </assignedEntity>
        </author>
      </controlActEvent>
    </subjectOf2>
  </relatedInvestigation>
</outboundRelationship>

<!-- Block 3: followUpReport marker (already present in T07) -->
<outboundRelationship typeCode="SPRT">
  <relatedInvestigation classCode="INVSTG" moodCode="EVN">
    <code code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="followUpReport"/>
    ...
  </relatedInvestigation>
</outboundRelationship>
```

---

## Fix — XML Patch for T07

Insert the two missing `outboundRelationship` blocks **before** the existing
`followUpReport` outboundRelationship. The `subjectOf1` sender block (C.3.x) remains
unchanged.

---

## Code Change — xmlGeneratorService.ts

File: `faers-app/src/main/services/xmlGeneratorService.ts`  
Location: the section that builds `outboundRelationship` for follow-up reports.

The generator must detect `isFollowUp` (i.e. `caseData.initialOrFollowup === 2` or
version ≥ 3) and emit the two additional blocks before the `followUpReport` block:

```typescript
if (isFollowUp) {
  // C.1.8.2: First Sender of This Case — required for follow-up reports
  lines.push('          <outboundRelationship typeCode="SPRT">');
  lines.push('            <relatedInvestigation classCode="INVSTG" moodCode="EVN">');
  lines.push('              <code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="initialReport"/>');
  lines.push('              <subjectOf2 typeCode="SUBJ">');
  lines.push('                <controlActEvent classCode="CACT" moodCode="EVN">');
  lines.push('                  <author typeCode="AUT">');
  lines.push('                    <assignedEntity classCode="ASSIGNED">');
  lines.push('                      <code code="1" displayName="regulator" codeSystem="2.16.840.1.113883.3.989.2.1.1.3"/>');
  lines.push('                      <!-- C.1.8.2: First Sender of This Case -->');
  lines.push('                    </assignedEntity>');
  lines.push('                  </author>');
  lines.push('                </controlActEvent>');
  lines.push('              </subjectOf2>');
  lines.push('            </relatedInvestigation>');
  lines.push('          </outboundRelationship>');

  // C.2.r.5 Primary Source + FDA.C.2.r.2.8 Reporter Email — required for follow-up reports
  lines.push('          <outboundRelationship typeCode="SPRT">');
  lines.push('            <priorityNumber value="1"/>');
  lines.push('            <!-- C.2.r.5: Primary Source for Regulatory Purposes #1 -->');
  lines.push('            <relatedInvestigation classCode="INVSTG" moodCode="EVN">');
  lines.push('              <code code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.22" displayName="sourceReport"/>');
  lines.push('              <subjectOf2 typeCode="SUBJ">');
  lines.push('                <controlActEvent classCode="CACT" moodCode="EVN">');
  lines.push('                  <author typeCode="AUT">');
  lines.push('                    <assignedEntity classCode="ASSIGNED">');
  // Address
  lines.push('                      <addr>');
  lines.push(`                        <streetAddressLine>${escapeXml(reporterStreet)}</streetAddressLine>`);
  lines.push(`                        <city>${escapeXml(reporterCity)}</city>`);
  lines.push(`                        <state>${escapeXml(reporterState)}</state>`);
  lines.push(`                        <postalCode>${escapeXml(reporterPostalCode)}</postalCode>`);
  lines.push(`                        <country>${escapeXml(reporterCountry)}</country>`);
  lines.push('                      </addr>');
  // Phone + Email (FDA.C.2.r.2.8 — must be mailto: format)
  if (reporterPhone) {
    lines.push(`                      <telecom value="tel:${reporterPhone}"/>`);
  }
  lines.push(`                      <telecom value="mailto:${reporterEmail}"/>`);
  lines.push('                      <!-- FDA.C.2.r.2.8: Reporter\'s Email #1 -->');
  // Person
  lines.push('                      <assignedPerson classCode="PSN" determinerCode="INSTANCE">');
  lines.push('                        <name>');
  if (reporterTitle) lines.push(`                          <prefix>${escapeXml(reporterTitle)}</prefix>`);
  if (reporterGiven) lines.push(`                          <given>${escapeXml(reporterGiven)}</given>`);
  if (reporterFamily) lines.push(`                          <family>${escapeXml(reporterFamily)}</family>`);
  lines.push('                        </name>');
  lines.push('                        <asLocatedEntity classCode="LOCE">');
  lines.push('                          <location classCode="COUNTRY" determinerCode="INSTANCE">');
  lines.push(`                            <code code="${reporterCountryCode}" codeSystem="1.0.3166.1.2.2"/>`);
  lines.push('                          </location>');
  lines.push('                        </asLocatedEntity>');
  lines.push('                      </assignedPerson>');
  lines.push('                    </assignedEntity>');
  lines.push('                  </author>');
  lines.push('                </controlActEvent>');
  lines.push('              </subjectOf2>');
  lines.push('            </relatedInvestigation>');
  lines.push('          </outboundRelationship>');
}
// Then emit the existing followUpReport outboundRelationship
```

The reporter fields (`reporterStreet`, `reporterEmail`, etc.) should be sourced from the
same case data used to populate the `subjectOf1` sender block — in T07 these are the
same person (Dr. Jane Doe, jane.doe@example.com).

---

## Scope

This pattern applies to **all follow-up IND safety reports**. The `initialOrFollowup === 2`
flag is the trigger. The `sourceReport` block must duplicate the reporter's contact
details (especially email) from the `subjectOf1` block.

---

## Verification

After the fix, the generated XML must have three sequential `outboundRelationship` blocks:
1. `relatedInvestigation/code="initialReport"` with `code="1" regulator` (C.1.8.2)
2. `outboundRelationship/priorityNumber value="1"` + `relatedInvestigation/code="sourceReport"` with reporter + email (C.2.r.5 + C.2.r.2.8)
3. `relatedInvestigation/code="followUpReport"` (already present)

Expected result after resubmit: CA+AE.
