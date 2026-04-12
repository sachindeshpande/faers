# Handoff Packet — DeepQuence FAERS/AERS USP Test Submission Debug (New Session Starter)

**Purpose:** Provide complete context so a new chat session can continue troubleshooting FDA ESG NextGen (ESGNG) / CDER FAERS AERS **TEST** submissions without re-reading the whole history.

**Current date context:** April 2026.  
**Submission method:** USP portal → ESGNG → CDER.

---

## 1) Goal

Submit a **valid E2B(R3) HL7 v3 ICSR XML** (FAERS/AERS) as a **TEST** submission through USP such that CDER:
1) Parses and loads the report (no SAXParseException / “no data extracted”), and  
2) Passes schema validation, then  
3) Passes business-rule validation (2.18 rules) or returns a small, fixable residual list.

---

## 2) Key Known Values / Configuration

### Organization identifiers
- Company: **DeepQuence**
- DUNS used: **334818134**
- Email: corporate domain (required by FDA) `@deepquence.com`

### USP submission selections (working intent)
- Submission Type: **AERS**
- Destination/Center: **CDER**
- Test submission: **Yes**
- File Type: **SINGLE**
- Notes: optional

### Batch routing identifiers
- TEST batch receiver id used: `ZZFDATST` (batch receiver identifier `…3.14`).
- Sample FDA scenario files show `ZZFDA` / `ZZFDA_PREMKT` for production/premarket, but for TEST the workflow used `ZZFDATST` per support guidance.

---

## 3) The Core Problem Pattern (What caused repeated ACK3 rejects)

There were two phases:

### Phase A — Wrapper & schema ordering failures
Frequent rejects like:
- “Invalid content starting with element receiver… expected batchTotalNumber or PORR…”
- “N.1.4 must be provided”
- “creationTime expected”
- “Report not loaded / no data extracted / parsing error”
These were resolved by aligning closely to FDA **Scenario XML instance structure**.

### Phase B — Business rule failures (once parsing succeeded)
ACK3: “Validated against 2.18 business rules” with many “Data value required for tag …” messages.
Fixes then focused on filling C.* / E.* / FDA.* required fields.

---

## 4) FDA Sample Instances (Canonical structure)
Deepak pointed to FDA FAERS E2B(R3) standards page and “item 6” sample instances zip. We uploaded and used:
- `FAERS2022Scenario1.xml` (primary reference)
- Additional scenario files: Scenario 2,3,4,5-1,7,8

Critical takeaway from Scenario1:
- Batch wrapper `MCCI_IN200100UV01` places batch `<receiver>` and `<sender>` **AFTER** the payload `<PORR_IN049016UV>` (end of wrapper).
- Wrapper order: `id → creationTime → responseModeCode → interactionId → name → PORR → receiver → sender`.
- Wrapper `<name>` includes `displayName="ichicsr"`.

---

## 5) “Golden Checklist” (latest version)
We maintain a regression guardrail checklist. Latest is **v3**:
- File: `FAERS_USP_Golden_Checklist_v3.md`

Key rules:
- Wrapper order matches Scenario pattern; receiver/sender at end.
- Exactly one `<id>` before `<creationTime>` in wrapper.
- PORR receiver has exactly one id (`…3.12` = `CDER`).
- PORR `processingModeCode` set to `I` (Scenario-like).
- investigationEvent ordering: `code → text → statusCode → effectiveTime → availabilityTime`.
- Avoid direct `<author>` under investigationEvent.
- Reaction ordering: `id → code(reaction) → effectiveTime (xsi:type=IVL_TS if low/high) → value (MedDRA CE)`.

---

## 6) Linting
We drafted a local Python script `faers_xml_lint.py` (in chat) to automatically check golden checklist rules + common gotchas (IVL_TS typing, ordering, unique batch id, etc.).

---

## 7) Most recent ACK3 issues & current fix direction

### Most recent schema-level issue sequence (v28)
- ACK3 complained XML not valid due to missing closing `</subjectOf2>` (SAXParseException).  
  Fixed in v28.3 by closing the age `subjectOf2` and removing a stray unmatched `</subjectOf2>`.

- Next ACK3 for v28.3 complained `subjectOf1` appeared where `subjectOf2` was expected (schema).  
  Created v29 by moving `subjectOf1` reporter block **before** investigationCharacteristic `subjectOf2` blocks.

### Latest working artifact produced for next submit
- `CASE-20260331-EMJQ_fixed_v29_moveSubjectOf1_beforeInvestigationCharacteristic.xml`

This v29 was generated specifically to address the schema reject about `subjectOf1` placement.

---

## 8) Files created (important artifacts)

### Checklists / summaries
- Golden checklist v3: `FAERS_USP_Golden_Checklist_v3.md`
- ACK3 issues & fixes summary: `ESGNG_ACK3_Issues_and_Fixes_Summary.md`
- Comprehensive fix history: `Comprehensive_XML_Fix_History.md`
- Earlier summaries exist (debug summary / issues list), but these three are the most current.

### XML versions (selected)
- v23.1 patched: `CASE-20260331-EMJQ_fixed_v23_1_patched.xml` (fixed malformed root quote + PORR receiver closure; enabled business-rule validation phase)
- v25: `CASE-20260331-EMJQ_fixed_v25_reactionEffectiveTimeOrder.xml` (reaction effectiveTime/value ordering fix)
- v26: `CASE-20260331-EMJQ_fixed_v26_fillBusinessRuleFields.xml` (added many business-rule fields; later hit schema placement issue)
- v27: `CASE-20260331-EMJQ_fixed_v27_wrapComponentInSubjectOf2.xml` (schema attempt; caused a regression)
- v28: `CASE-20260331-EMJQ_fixed_v28_moveSubjectOf1_afterComponents.xml` (re-sequencing; later found missing close tag)
- v28.3 fixed well-formed: `CASE-20260331-EMJQ_fixed_v28_3_fixWellFormed.xml`
- v29 (current next candidate): `CASE-20260331-EMJQ_fixed_v29_moveSubjectOf1_beforeInvestigationCharacteristic.xml`

### FDA sample XML
- `FAERS2022Scenario1.xml`
- `FAERS2022Scenario2.xml`, `FAERS2022Scenario3.xml`, `FAERS2022Scenario4.xml`, `FAERS2022Scenario5-1.xml`, `FAERS2022Scenario7.xml`, `FAERS2022Scenario8.xml`
- Readme: `XML and ACK Instance - Read Me.txt`

### ACK files (lots)
Many `.ack` files uploaded across iterations; the newest ones relevant to the v28/v29 progression:
- `ci260407222121...ack` (SAXParseException missing </subjectOf2>)
- `ci260407232336...ack` (subjectOf1 vs subjectOf2 expected; drove v29)
(There are many older ack files documenting N.1.1/N.1.2/N.1.4, author, effectiveTime, etc.)

---

## 9) What to do next in the new session

1) Submit **v29** via USP as TEST AERS to CDER.
2) If ACK3 returns:
   - **schema/order** error: adjust node ordering to match Scenario1 structure at the referenced line.
   - **business-rule** list: patch the missing tags (C.1.*, C.3.*, E.i.*, FDA.*) using Scenario1 patterns.
3) Run the golden checklist v3 + lint before each submission to prevent regressions.
4) When an ACK3 says “no data extracted,” treat it as schema/well-formedness: align to Scenario1 and fix malformed tags, not business-rule fields.

---

## 10) Notes on why things were tricky
- CDER validation is very strict about where wrapper receiver/sender appear; placing them before the payload causes schema rejects.
- Some earlier “rules” were overgeneralized from a single ACK3 (e.g., component wrapping). The checklist was corrected to v3 to align to Scenario1.
- Once parsing succeeded, the validator moved to large lists of required fields; those must be filled with plausible test values.

