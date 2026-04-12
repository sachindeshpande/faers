# Comprehensive Summary — FAERS/AERS E2B(R3) XML Fixes (DeepQuence USP Test)

**Objective:** Produce an E2B(R3) HL7 v3 ICSR XML that CDER/FAERS can parse and validate via ESG NextGen (USP), using FDA Scenario XML instances as the canonical structural template.

This document consolidates *all* fixes applied across the iterative versions (v1–v29) based on ACK3 feedback and FDA sample alignment.

---

## 0) Non‑XML prerequisite (account/email)
- **ESGNG account email policy**: registration requires a *company-domain* email (not Gmail).  
  **Fix:** Set up `@deepquence.com` mailbox and used it for ESGNG/USP acknowledgments.

---

## 1) USP routing / Center targeting
- **ACK1 center mismatch (CBER vs CDER)**  
  **Fix:** Adjusted USP submission selections to route correctly:
  - Destination/Center: **CDER**
  - Submission type: **AERS**
  - Test submission: **Yes**  
  Result: ACK1 later indicated delivery to **CDER**.

---

## 2) Batch wrapper (`MCCI_IN200100UV01`) structural fixes

### 2.1 Batch wrapper ordering (strict schema sequencing)
- **Problem:** schema rejects when wrapper elements appear in unexpected order, especially:
  - multiple `<id>` elements before `<creationTime>`
  - wrapper `<receiver>`/`<sender>` placed too early (before payload)
- **Fix:** Aligned wrapper to FDA Scenario structure:
  - Exactly **one** wrapper `<id>` before `<creationTime>`
  - Wrapper child order:
    `id → creationTime → responseModeCode → interactionId → name → PORR_IN049016UV → receiver → sender`
  - Wrapper `<receiver>`/`<sender>` placed **after** `PORR_IN049016UV` (end of wrapper)

### 2.2 Batch number (N.1.2)
- **Problem:** “N.1.2 must be provided” and/or schema ordering conflicts when trying to represent N.1.2 as an extra `<id>` in the header.
- **Fix:** Use wrapper `<id root="…3.22">` as the batch number (Scenario-style) with a **unique** `extension` value per submission (not `"1"`).

### 2.3 Batch receiver identifier (N.1.4)
- **Problem:** “N.1.4 must be provided” vs schema rejecting `<receiver>` if placed before payload.
- **Fix:** Place wrapper `<receiver>` at the **end** of `MCCI_IN200100UV01` and populate:
  - `id root="…3.14" extension="ZZFDATST"` (test routing)

### 2.4 Batch sender identifier (N.1.3)
- **Problem:** “missing batch sender identifier tag” and “verify xpath”.
- **Fix:** Populate wrapper `<sender>` at end of wrapper with:
  - `id root="…3.13" extension="<sender id / DUNS>"`
  - and (optionally) DUNS OID `1.3.6.1.4.1.519.1`

### 2.5 Batch type of messages (N.1.1)
- **Problem:** “N.1.1 must be provided”.
- **Fix:** Add wrapper `<name code="1" codeSystem="…1.1.1"/>` and later align to sample with `displayName="ichicsr"`.

### 2.6 Parsing “no data extracted” hard rejects
- **Problem:** ACK3 “Report not loaded… parsing error… no data extracted” (no actionable business-rule list).
- **Fixes:**
  - Corrected malformed attributes (e.g., stray quote in `ITSVersion="XML_1.0""`)
  - Repaired malformed/missing closing tags (e.g., broken `<receiver>` block)
  - Aligned wrapper `<name>` to include `displayName="ichicsr"`
  - Ensured overall XML is well-formed and sample-aligned before resubmission

---

## 3) PORR message header (`PORR_IN049016UV`) fixes

### 3.1 Message sender identifier (N.2.r.2)
- **Problem:** “N.2.r.2 must be provided”.
- **Fix:** Add in `PORR_IN049016UV/sender/device`:
  - `id root="…3.11" extension="<sender id / DUNS>"`

### 3.2 PORR receiver id normalization
- **Problem:** multiple ids in PORR receiver (mixing CDER + ZZFDATST + numeric ids) caused profile fragility.
- **Fix:** Simplified `PORR_IN049016UV/receiver/device` to **one id**, Scenario-style:
  - `id root="…3.12" extension="CDER"`

### 3.3 Processing codes alignment
- **Fix:** Align to Scenario defaults for stability:
  - `processingCode code="P"`
  - `processingModeCode code="I"` (even for test; testness handled by wrapper receiver `ZZFDATST`)
  - `acceptAckCode code="AL"`

---

## 4) Investigation event (`investigationEvent`) schema fixes

### 4.1 Required header ordering inside `investigationEvent`
- **Problem:** schema error: “effectiveTime found; expected text/statusCode”.
- **Fix:** Ensure ordering:
  `code → text → statusCode → effectiveTime → availabilityTime → …`
- Also aligned code to sample: `PAT_ADV_EVNT`.

### 4.2 Disallowed `<author>` placements
- **Problem:** schema error: “author not allowed here…”.
- **Fix:** Removed invalid `<author>` blocks (especially those placed as direct children of `investigationEvent`).

### 4.3 Subject wrapper fixes (`subject` vs `subject1`)
- **Problem:** schema error involving invalid `<subject typeCode="SBJ">`.
- **Fix:** Use Scenario-style patient placement:
  - `component → adverseEventAssessment → subject1 → primaryRole`

### 4.4 Component placement and sequencing regressions (v27/v28)
Several schema rejects occurred around where `component`, `subjectOf1`, and `subjectOf2` appeared within `investigationEvent`.
- **Fix strategy:** Follow Scenario-style sequencing:
  - Use direct `component typeCode="COMP"` blocks for adverseEventAssessment/patient where allowed
  - Ensure `subjectOf1` reporter blocks are placed in the correct position relative to trailing `subjectOf2` blocks (investigationCharacteristic)
  - When ACK3 required `subjectOf2` at a position, avoid inserting `subjectOf1` there

### 4.5 Well‑formedness repairs (SAXParseException)
- **Problem:** missing closing tags (e.g., `<subjectOf2>` not terminated).
- **Fix:** Added missing closing tags and removed stray unmatched closing tags; re-verified XML parses.

---

## 5) Reaction / Event (MedDRA) observation fixes

### 5.1 `effectiveTime` typing
- **Problem:** “effectiveTime must have no children … type content is empty” when `<low>/<high>` present.
- **Fix:** Add `xsi:type="IVL_TS"` on `effectiveTime` elements with children:
```xml
<effectiveTime xsi:type="IVL_TS">
  <low value="YYYYMMDD"/>
  <high value="YYYYMMDD"/>
</effectiveTime>
```

### 5.2 Reaction coding structure (E.i.2.1b)
- **Problem:** business rule: MedDRA code must be provided; initial structure had MedDRA code in `<code>` where sample expects it in `<value>`.
- **Fix:** Scenario-style reaction observation:
  - `code` identifies the element as a reaction
  - `value` carries MedDRA CE (codeSystem 6.163, version)
  - include observation `id`

### 5.3 Reaction element ordering regression
- **Problem:** schema error: “effectiveTime found; expected value” (or vice versa).
- **Fix:** Set reaction observation child order to:
  `id → code(reaction) → effectiveTime → value(MedDRA)`

---

## 6) FDA regional & business-rule fixes (once parsing succeeded)
After structural fixes, ACK3 began returning long “validated against business rules” lists.
Key additions included:

### 6.1 Patient race & ethnicity (FDA.D.11.r.1 / FDA.D.12)
- **Fix:** Added race and ethnicity observations (Scenario-pattern `subjectOf2`).

### 6.2 Postmarket required intervention (FDA.E.i.3.2h)
- **Fix:** Added/filled “required intervention” fields for suspect drug where mandated.

### 6.3 Patient age conditional (D.7.*)
- **Fix:** Added age group/age-related fields so that D.7.2 is provided when D.7.1.r.1b is absent.

### 6.4 Reporter block completeness (C.3.*)
- **Fix:** Added/filled reporter (primary source) blocks for C.3.1 / C.3.3.* / C.3.4.* elements.

### 6.5 Case metadata fields (C.1.*)
- **Fix:** Added/filled many C.1.* fields (receipt dates, report types, flags) as required by business rules.

---

## 7) Quality controls introduced during iteration

### 7.1 Golden Checklist (regression guardrail)
A practical pre-submit checklist was created and iteratively refined (v1 → v3) to prevent reintroducing recurring schema/order errors.

### 7.2 Linting workflow
A Python lint script was drafted to automatically check key structural rules (wrapper ordering, receiver/sender placement, reaction ordering, IVL_TS typing, etc.) before each submission.

---

## Current status
- The process successfully progressed from:
  - wrapper parsing failures → schema-level field ordering → detailed business-rule validation lists.
- Latest versions focus on:
  - correct `investigationEvent` sequencing for `component` / `subjectOf1` / `subjectOf2`
  - filling remaining mandatory business-rule fields until ACK3 acceptance.

