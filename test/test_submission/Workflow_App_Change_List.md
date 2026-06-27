# Workflow Application — Consolidated Change List

> **⚠ CORRECTED AFTER AUDIT (post-`Workflow_App_Change_List_Audit_Response.md`).** An earlier revision of this document encoded the v35/v36 **failed hypothesis** (reporter `author` as direct child of `investigationEvent` with OID `.1.6`, plus a second sender author block) as if it were the winning convention. It is not. The proven v37 structure is the **opposite**: reporter `author` lives inside `subjectOf1/controlActEvent` with OID `.1.7`, and the actual v37 differentiator (vs. v30–v32 which used the same container and OID) was the **restoration of the nested `representedOrganization` from v29**. The live `xmlGeneratorService.ts` and `faers_xml_lint.py` already implement the correct convention. Sections §1.4, §2.3, §2.4, §2.5, §2.6, §3, §4.2, §4.3, and §4.4 have been rewritten below to match the proven code. **Applying the earlier text would have re-introduced the v36 SAX exception.**

**Scope:** Everything the upstream DeepQuence workflow application (XML generator + ESG submission client) needs to absorb from the FAERS test phase troubleshooting. Covers code, defaults, content rules, and golden dataset updates.

**Time horizon covered:** XML versions v1 through v37 (resolved with full CA+AA acceptance on 2026-04-10), plus the ESG NextGen API integration work documented in `ESG_NextGen_Error_Fix_Report.docx` and `IND_Troubleshooting_Technical_Brief.md` (current as of 2026-05-01).

**Live-code anchor.** When in doubt, the live code wins over the narrative in any fix-history document. The audit cross-referenced the live `xmlGeneratorService.ts`, `faers_xml_lint.py`, `submit_batch.py`, and `.env` against this doc; entries below are flagged as **Already implemented**, **Action needed**, **Deferred**, or **Cosmetic** based on that comparison.

---

## 1. ESG NextGen API client — code-side fixes

All of these were proven by ACK or response evidence during the AERS/CDER work. The workflow application's API client must implement them.

### 1.1 Authentication header

| Aspect | Required value | Why |
|---|---|---|
| Header name | `accesstoken` (lowercase, single token, no prefix) | Spec is non-standard — `Authorization: Bearer` returns 401 |
| Applies to | All authenticated endpoints including Step 4 multipart upload | Spec §2.5 requires it on upload; earlier omission caused upload failures |
| OAuth grant | `client_credentials` with form-body `client_id` + `client_secret`, URL-param `grant_type` + `scope` | Per spec curl examples |
| Scope | `openid profile` (postmarket); IND scope **unknown** — investigate when enrollment is granted | JWT inspection shows no center claims; if a CDER_IND scope exists it must be added at that point |

### 1.2 HTTP-layer correctness

| Issue | Fix | Symptom if not applied |
|---|---|---|
| `Content-Type: application/json` on GET requests | **Do not send** on Companies API GET (and likely other GETs) | HTTP 500 with empty body from FDA server |
| `@` in email query parameter | Build URL manually with **literal `@`**, do not use `requests.params={}` (which percent-encodes to `%40`) | HTTP 500 / 400 on Companies API |
| Response envelope parsing | Unwrap top-level `data` key before reading `payloadId`, `uploadFileLink`, `submitFormLink` | `RuntimeError: missing payloadId` despite valid response |
| TEST vs PROD endpoint paths | Distinct paths: `/credentials/api/test` vs `/credentials/api` — never share one constant | Cross-environment contamination |
| HTTP success codes | Accept `200`, `201` on credential; `200`, `201`, `204` on upload; `200`, `201`, `202` on submit | Spec allows variation across steps |

### 1.3 Credential request body — required field set

The complete required body shape (proven by ESGNG219 root-causing):

```json
{
  "user_id":             "<account user_id, string>",
  "fda_center":          "CDER | CDER_IND",
  "company_id":          "<account company_id, string>",
  "submission_type":     "AERS | IND",
  "submission_name":     "<filename without .xml>",
  "submission_protocol": "API",
  "file_count":          1,
  "description":         "<free-text description, required>"
}
```

| Field | Notes |
|---|---|
| `description` | **Required, no default** per spec §2.2/§2.3. Earlier code removed it assuming optional → ESGNG219. Always include. |
| `authorizing_company_id` | Include **only** when the company is a registered agency (CRO/consultant). For DeepQuence (Agency: No), **omit**. |
| `user_id` and `company_id` | Must be the real submitter values, not values copied from a poisoned Companies API response (CDER's own record was returned as `company_id=2` under the bad request shape). |
| `submission_name` | Use filename without `.xml`. Hyphens and alphanumeric are accepted. |

### 1.4 IND vs postmarket routing — code defaults

**Status: Already implemented; doc was stale.** Audit confirmed the live code/`.env` now use:

```
ESG_SUBMISSION_TYPE_IND=AERS_PREMKT_CDER
ESG_CENTER_IND=CDER                          # live value; submit_batch.py:391 default is also "CDER"
```

> **Note — two different `CDER_IND` layers.** The ESG *credential* `fda_center` env (`ESG_CENTER_IND`) is `CDER`, not `CDER_IND`. This is distinct from the *XML* inner PORR receiver (`N.2.r.3`), which routes IND to `CDER_IND` (see §2.6 and `case.types.ts` `MESSAGE_RECEIVERS`). Whether the credential `fda_center` should also be `CDER_IND` is unresolved and, like the `submission_type` token, cannot be confirmed until AEMSESUB enrollment is granted. Do not "fix" the `.env` to `CDER_IND` on assumption.

The `AERS_PREMKT_CDER` token is what the live code/`.env` uses today — the doc's earlier "should be `IND`" prescription was a guess against the spec that turned out to be wrong empirically (the matched-pair test `CDER_IND + IND` returns ESGNG334 just like every other IND-track combination, per the updated helpdesk email). Until AEMSESUB enrollment is granted, every IND-track combination fails identically and we cannot determine the canonical token from the API response. **Action:** leave the live code as-is; revisit the value only after enrollment, when the helpdesk reply or a successful submission identifies the correct canonical string. Document this uncertainty in the inline code comment.

### 1.5 File discovery

The current discover function searches three subdirectories. Add the top-level `from_app/` directory so files placed at the root are not missed (TC-A02 regression):

```python
candidates = (
    sorted(HEADLESS.glob("TC-*.xml")) +
    sorted(IND.glob("IND-*.xml"))     +
    sorted(ROUND2.glob("TC-*.xml"))   +
    sorted(FROM_APP.glob("TC-*.xml"))     # catches files at root of from_app/
)
```

### 1.6 Re-submission gating

The current `already_logged` function re-submits files with status in `("ERROR", "PENDING_RETRY", "DRY_RUN", "")`. Preserve this — it was deliberate. Document the intent in a comment so a future cleanup pass doesn't simplify it back to "skip if any log entry exists."

### 1.7 Logging hygiene (carry forward what worked)

- INFO-level logging of credential request body (with secrets redacted) — invaluable for diagnosing ESGNG219/334.
- INFO-level logging of `core_id`, `payloadId`, response status, and (short) response body at each step.
- File logging (`submit_batch.log`) alongside stdout — kept the diagnostic trail recoverable.

---

## 2. XML generator — content rules learned through v37

These are content/representation rules the workflow application's XML generator must enforce. Each one was discovered by an ACK rejection.

### 2.1 Wrapper structure (resolved in Phase A, v1–v23)

| Rule | Why |
|---|---|
| Root: `MCCI_IN200100UV01` | Schema |
| Wrapper child order: `id`, `creationTime`, `responseModeCode`, `interactionId`, `name`, `PORR_IN049016UV`, wrapper `receiver`, wrapper `sender` | Schema |
| Wrapper `receiver` / `sender` **after** `PORR_IN049016UV`, not before | Earlier inversion caused SAX parse errors |
| `<name>` uses `displayName="ichicsr"` | FDA pattern |
| Single wrapper `id` before `creationTime` | Duplicate or misplaced caused "creationTime expected" errors |

### 2.2 PORR routing (resolved in Phase A)

| Rule | Why |
|---|---|
| PORR receiver: single `<id>` with `extension="CDER"` (postmarket) or `extension="CDER_IND"` (IND) | Multiple ids confused validator |
| PORR `processingModeCode="I"` | Required for ICSR |
| PORR sender must **not** contain any `id` with root OID `.3.989.2.1.3.12` | `.3.12` is the receiver OID; presence in sender triggered batch-level AR parsing error |

### 2.3 `investigationEvent` ordering and content (Phase B) — CORRECTED

**Status: Already implemented in `xmlGeneratorService.ts` and enforced by `faers_xml_lint.py`.** This table is the corrected version that matches the proven v37 conventions. The earlier revision encoded the v35/v36 hypothesis that v37 explicitly reverted.

| Rule | Why |
|---|---|
| Reporter `author typeCode="AUT"` MUST be **inside `subjectOf1/controlActEvent`**, NOT a direct child of `investigationEvent` | v36 SAX exception confirmed `author` is invalid as a direct child of `investigationEvent`; the schema error message explicitly lists `subjectOf1` as the valid position. v37 restored the `subjectOf1` container and was ACCEPTED (CA+AA). |
| Reporter `author`'s `assignedEntity/code` OID is `2.16.840.1.113883.3.989.2.1.1.7` (sender type value set) | This is what v30, v31, v32, and v37 all used. Earlier doc said `.1.6` based on misread of fix history; live code uses `.1.7` and is proven by v37 ACK. |
| The v37 differentiator vs. v30–v32 is the **nested `representedOrganization` structure** (outer name = department, e.g. "Drug Safety"; inner `assignedEntity/representedOrganization` name = company, e.g. "DeepQuence"). The flat structure used in v30 produced C.3.2 rejection; the nested structure restored from v29 in v37 was accepted. | Sole confirmed structural differentiator per v37 root-cause analysis. |
| Do **not** use `primaryRole classCode="PRS"` at `investigationEvent` level | v33 SAX exception; CDER PORR schema rejects |
| Do **not** place a second sender `author` block as a direct child of `investigationEvent` | The v36 "JC5H-pattern" addition of a second sender author at the header level caused the SAX exception; v37 removed it |
| Reporter name encoded as separate child elements: `<prefix>`, `<given>`, `<family>` inside `assignedPerson/name` | C.3.2 → given, C.3.3.2 → prefix, C.3.3.1 → family, C.3.3.3 → given (same element) |
| Reporter `addr` must include `<country>US</country>` | C.3.4.x |
| Reporter must include `tel:`, `fax:`, `mailto:` telecoms | C.3.4.7 / C.3.4.8 |
| `asLocatedEntity` inside `assignedPerson` is **neutral** (present in both v29 PASS and v30 FAIL); v37 retained it for v29 baseline alignment | Documented as neutral; either form acceptable |
| Reaction observation ordering: `effectiveTime` before `value` | Schema sequence |
| `IVL_TS` typing on `effectiveTime` when `low`/`high` present | Schema |

### 2.4 Coded clinical values

| Rule | Why |
|---|---|
| Drug indication `CE` values must include both `code` and `codeSystem`, not only `displayName` | Representational strictness; bare `displayName` triggered v30 warning |
| MedDRA codes use `codeSystem="2.16.840.1.113883.6.163"`, `codeSystemVersion="27.1"` (live code value; doc previously said 25.0 in error) | FDA-published value set; keep in sync with the FDA-published MedDRA release the live code targets |
| Reaction MedDRA codes required (Phase A regional blocker) | FDA business rule |
| Race and ethnicity required (Phase A regional blockers) | FDA business rule |

### 2.5 Batch-level requirements

| Rule | Why |
|---|---|
| Each submission must have a **unique batch UUID** in the MCCI `<id>` extension. The live code uses `DeepQuenceTest-<YYYYMMDD>-<uuid4>` (no `v<NN>` segment); the `v<NN>` token was cosmetic during manual debugging and is **not required for uniqueness** because uuid4 already guarantees it | Reused UUIDs caused persistent batch-level AR; uuid4 alone is sufficient |
| `xsi:schemaLocation` value is not enforced by the engine; keep as local reference (`MCCI_IN200100UV01.xsd`) | CVM/veterinary URL caused warnings |
| Sender `<device>` uses EIN-derived ID `334818134` under OIDs `.3.11`, `.3.13`, `1.3.6.1.4.1.519.1` (with `.3.11` only in PORR sender, `.3.13` in both) | Spec/format |

### 2.6 IND-specific routing fields

| Rule | Why |
|---|---|
| `N.2.r.3` (inner PORR receiver) `extension="CDER_IND"` for IND filings | Gateway routing |
| Top-level wrapper receiver `extension="ZZFDATST_PREMKT"` for IND on test gateway (will be `ZZFDA_PREMKT` for production) | Gateway routing |
| `FDA.C.5.6.r` on IND files — **DEFERRED, do not act unilaterally** | The IND ACK carries an informational-only warning that this field is invalid for the IND center. Suppressing it in the IND generator path conflicts with **regression rule R0026**, which currently expects `FDA.C.5.6.r` to be present for IND when C.5.5a is populated. Resolve the discrepancy first (either by clarifying with ESGNGSupport / FDA Implementation Guide §5, or by updating R0026) before changing the generator. The warning is non-blocking so this is not urgent. |

### 2.7 Required business-rule content (collected through v30+)

| Field | Notes |
|---|---|
| `C.3.4.7` (sender fax) | Required when other telecoms present |
| `D.7.x` organizer | Required when medical history populated; include `D.7.2` free-text and `D.7.3` concomitant therapy indicator |
| `C.1.7` expedited reporting fields | code=23 BL true, C54588 code=1 ("15-Day") |
| Reporter qualification `code="1"` (Physician) under `asQualifiedEntity/code` codeSystem `.1.1.6` | Confirmed via JC5H |

---

## 3. Configuration / `.env` updates

**Status:** The live `.env` is correct. The only outstanding action is updating `.env.example`, which still carries the outdated `ESG_SUBMISSION_TYPE_IND=EIND` value and lacks the explanatory comments.

Current live `.env` (audit-confirmed):
```
ESG_USER_ID=33703                                # corrected from 27478 (poisoned)
ESG_COMPANY_ID=31537                             # corrected from 2 (CDER's center)
ESG_USER_EMAIL=sachindeshpande@deepquence.com
ESG_USERNAME=sachindeshpande@deepquence.com
ESG_CENTER=CDER
ESG_SUBMISSION_TYPE=AERS
ESG_CENTER_IND=CDER                              # live value (NOT CDER_IND); see §1.4 note on the two CDER_IND layers
ESG_SUBMISSION_TYPE_IND=AERS_PREMKT_CDER         # current best guess; canonical value pending AEMSESUB
ESG_AUTHORIZING_COMPANY_ID=                       # blank — DeepQuence is not an agency
```

`.env.example` should be brought into alignment and should carry these comments:

- The leading `3` on `EIN 334818134` is a format artifact required by the EIN/DUNS field, not a typo.
- `ESG_COMPANY_ID=2` is a known wrong value (CDER's own record) and should never appear; the script already detects and refuses this.
- IND enrollment with AEMSESUB is a prerequisite separate from the OAuth client; until enrolled, IND submissions will return ESGNG334 regardless of which submission_type/center string is sent.
- The canonical `ESG_SUBMISSION_TYPE_IND` value is unknown until enrollment is granted. `AERS_PREMKT_CDER` is the current placeholder; update once a successful submission or helpdesk reply confirms the right token. Do **not** assume the spec-style `IND` is correct — that combo was tested and rejected.

---

## 4. Golden dataset updates

The golden regression test (`golden_regression_test.py`, results in `regression/golden_regression_results.md`) currently reports 35 PASS / 0 FAIL / 1 SKIPPED. Healthy, but with two follow-ups.

### 4.1 Manifest fix — TC-A06 currently SKIPPED

Result file says: `TC-A06-ethnicity-ni — No JSON input registered in manifest`.

Action: add the JSON input for TC-A06 to `test/golden/manifest.json` and regenerate its golden XML. Confirm the next regression run reports 36 PASS / 0 SKIPPED.

### 4.2 Golden XML verification — CORRECTED

The golden XMLs under `test/golden/<category>/xml/` should reflect the **proven v37 reporter structure** (which is the OPPOSITE of what this section previously claimed):

| Wrong pattern (must NOT appear) | v37 PROVEN pattern (correct) |
|---|---|
| Reporter `author` as a direct child of `investigationEvent` | Reporter `author` **inside `subjectOf1/controlActEvent`** |
| Reporter `assignedEntity/code` OID `.1.6` | OID **`.1.7`** (what v30, v31, v32, and v37 all used) |
| Two `author` blocks (reporter + sender at investigationEvent level) | Single reporter `author` in `subjectOf1` (sender is encoded elsewhere via the wrapper `<sender>` block) |
| Flat `representedOrganization` (v30 pattern, C.3.2 rejected) | **Nested `representedOrganization`** (v29/v37 pattern; outer name = department, inner name = company) |
| `primaryRole classCode="PRS"` | Never present (v33 SAX exception) |
| Indication CE with `displayName` only | Indication CE with `code` + `codeSystem` |
| Reporter `<name>` mixed-content text node | Structured `<prefix>/<given>/<family>` children |

Action: spot-check at least one postmarket and one IND golden XML against this corrected list. The regression test currently passes 35/35 against the live `xmlGeneratorService.ts`, so if the generator emits the proven v37 patterns the goldens are already aligned; this is a verification step, not a presumed gap.

### 4.3 IND golden XMLs — `FDA.C.5.6.r` is DEFERRED

The earlier instruction to suppress `FDA.C.5.6.r` in the IND generator path is on hold. Regression rule **R0026** currently expects this field present for IND when C.5.5a is populated, so suppressing it in the generator would break the regression suite. The ACK warning is informational and non-blocking, so the current state is acceptable. **Action:** reconcile the conflict before changing either side — either confirm with ESGNGSupport / Implementation Guide §5 that the field is forbidden on the IND center (in which case update R0026 and then the generator) or accept the informational warning as expected (in which case leave both alone).

### 4.4 Golden checklist — CORRECTED RULES

`FAERS_USP_Golden_Checklist.md` does not exist in the repo (audit confirmed). Creating it is in scope; the rules below are the corrected set that match the proven v37 conventions and the live lint. **Do not use the earlier version of this section — it inverted rules 1–4.**

1. Reporter `author typeCode="AUT"` MUST be inside `subjectOf1/controlActEvent`. Do NOT place it as a direct child of `investigationEvent` (causes v36-style SAX exception).
2. Reporter `assignedEntity/code` codeSystem MUST be `2.16.840.1.113883.3.989.2.1.1.7`. (OID `.1.6` was the v34/v35/v36 hypothesis; it failed.)
3. Reporter `representedOrganization` MUST be **nested** (outer name = department such as "Drug Safety"; inner `assignedEntity/representedOrganization` name = company "DeepQuence"). The flat structure correlates with C.3.2 rejection (v30); the nested structure was the sole confirmed v37 differentiator vs. v30–v32.
4. Do NOT use `primaryRole classCode="PRS"` at `investigationEvent` level — v33 SAX exception.
5. Do NOT place a second sender `author` block as a direct child of `investigationEvent` — v36 SAX exception. The sender identity is carried in the wrapper `<sender>` block.
6. Field mappings: C.3.2 + C.3.3.3 → `assignedPerson/name/given`; C.3.3.2 → `assignedPerson/name/prefix`; C.3.3.1 → `assignedPerson/name/family`.
7. Reporter name uses **structured child elements** (`<prefix>`, `<given>`, `<family>`), NOT a mixed-content text node.
8. Reporter `addr` must include `<country>US</country>`; reporter must include `tel:`, `fax:`, and `mailto:` telecoms.
9. Each submission must have a unique batch UUID in the MCCI `<id>` extension. The live format is `DeepQuenceTest-<YYYYMMDD>-<uuid4>`; the `v<NN>` segment is cosmetic.
10. PORR sender must NOT contain any `id` with root OID `2.16.840.1.113883.3.989.2.1.3.12` (that OID is the receiver's, and presence in sender caused batch-level AR).
11. Drug indication `CE` values must include `code` and `codeSystem`, not just `displayName`. Use MedDRA codeSystem `2.16.840.1.113883.6.163` with `codeSystemVersion="27.1"` (live code value).
12. `xsi:schemaLocation` value is not enforced by the engine; use local reference `MCCI_IN200100UV01.xsd`.
13. For IND submissions: `N.2.r.3` = `CDER_IND`, top-level wrapper receiver = `ZZFDATST_PREMKT` on the test gateway.
14. Flag any `CE` value with `displayName` only and no `code`/`codeSystem` in clinically important sections (existing checklist gap noted in §6 of the fix history).
15. Flag suspicious entity structures in the sender / reporter block (e.g., unexpected nested `assignedEntity` inside `representedOrganization`).

**Removed from the earlier draft (because they were the failed-hypothesis rules):**
- ❌ "Reporter author must be a direct child of `investigationEvent`" — actually the opposite is true
- ❌ "Reporter OID must be `.1.6`" — actually `.1.7` is the proven OID
- ❌ "Sender author block must be a direct child of `investigationEvent`" — caused v36 SAX exception
- ❌ "For IND, do not include FDA.C.5.6.r" — deferred pending R0026 reconciliation (see §4.3)

### 4.5 Golden lint script (`faers_xml_lint.py`) confirmations

**CORRECTED — earlier text described the failed-hypothesis (direct-child) positioning.** The live `faers_xml_lint.py` (Sections 7 and 11) actually enforces the proven v37 convention:
- **`No <author> as direct child of investigationEvent`** (Section 7, ~line 194) — a direct-child `author` is the v36 SAX-exception pattern and is rejected.
- **Reporter author MUST be in `subjectOf1/controlActEvent/author` with OID `.1.7`** (Section 7, ~line 207; Section 11, ~line 331).
- `subjectOf1` (reporter) comes after `component` + `outboundRelationship`, and before `subjectOf2` (Section 7, ~lines 221-227).
- Nested vs flat `representedOrganization` check (Section 11) — nested is the v37 pattern.
- `asLocatedEntity` / C.3 name+addr+telecom presence checks (Section 11).

There is **no** "sender author at direct-child position" check, and there should not be — that pattern caused the v36 SAX exception.

Action: confirm these checks are present in the version of `faers_xml_lint.py` shipped with the workflow application (not just the one in `test_submission/`). Note `faers-app` ships only a thin wrapper (`xmlLintService.ts`) that shells out to the `test_submission/` copy, so there is a single source of truth today; if the workflow app ever vendors its own copy, sync it.

### 4.6 Regression test enhancement (optional)

Currently the regression compares generated XML against golden XML with a fixed exclusion list (batch UUID, message envelope UUID, creationTime/availabilityTime, IVL_TS low, safetyReportId, worldwideCaseId). Consider adding:
- An optional ACK-replay layer: for each generated XML, compare against the most recent successful production-equivalent ACK to catch any regressed business-rule field. This would have caught the v34 13-C.3-field regression at PR time, before submission.
- ~~IND-specific check: assert `FDA.C.5.6.r` is absent in IND output XMLs.~~ **Removed — DEFERRED.** This contradicts regression rule R0026, which currently expects `FDA.C.5.6.r` present for IND when C.5.5a is populated. Do not add this assertion until the §4.3 reconciliation is resolved.

---

## 5. Outstanding (not a code or data fix)

These items are tracked here so they're not lost; they don't go in a PR.

| Item | Owner | Status |
|---|---|---|
| AEMSESUB enrollment for CDER_IND / ZZFDATST_PREMKT API track | FDA helpdesk | Email drafted in `helpdesk_email_draft.md` — ready to send |
| Verify portal admin decline shares root cause with API ESGNG334 | FDA helpdesk | Listed as Q3 in helpdesk email |
| Center Submission Types canonical string table | FDA helpdesk | URL blocked by network egress proxy; request reference values via email |
| Decode IND OAuth token claims once enrollment is granted | DeepQuence | Snippet provided in brief §5 — run after enrollment in case a CDER_IND-specific scope is added |
| Production submission approval | USP portal | "Pending — All Production Submission Types" — normal during test phase; will flip after test completion |

---

## 6. Workflow application packaging — suggested PR breakdown

**CORRECTED — the original table listed PRs for changes that are already implemented or that encode the failed hypothesis.** Most of §1–§3 is already live (see §7); the table below reflects only the genuinely-outstanding work. PRs 2, 3, and 4 from the earlier draft have been struck because they prescribed the wrong values/rules.

| PR | Scope | Risk | Test |
|---|---|---|---|
| 1 | ~~API client fixes~~ — **Already implemented** in `submit_batch.py` (all of §1). No PR. | — | — |
| 2 | ~~IND defaults `ESG_SUBMISSION_TYPE_IND=IND`~~ — **Do NOT.** Live value is `AERS_PREMKT_CDER`; the spec-style `IND` was tested and rejected (ESGNG334). Canonical token pending AEMSESUB. | — | — |
| 3 | ~~XML generator: direct-child author, OID `.1.6`, two author blocks~~ — **Do NOT.** This is the v36 failed hypothesis; live code uses the proven `subjectOf1`/`.1.7`/nested-org convention (§2.3). Applying it re-introduces the v36 SAX exception. | — | — |
| 4 | ~~IND XML: suppress `FDA.C.5.6.r`~~ — **DEFERRED.** Conflicts with regression rule R0026; reconcile per §2.6/§4.3 first. | — | — |
| A | `.env.example`: update outdated `ESG_SUBMISSION_TYPE_IND=EIND` → `AERS_PREMKT_CDER`, align `ESG_CENTER_IND=CDER`, add the four explanatory comments (§3) | Low | Diff review; no behavior change |
| B | Golden dataset: TC-A06 manifest JSON input + golden XML regeneration (§4.1) | Low | Regression must report 36 PASS / 0 SKIPPED |
| C | Create `FAERS_USP_Golden_Checklist.md` with the **corrected** §4.4 rules | Documentation only | N/A |
| D | File discovery `FROM_APP.glob` addition — **already implemented** (`submit_batch.py:155`); verify only | Low | Place a file at top of `from_app/` and confirm picked up |

---

## 7. Summary — CORRECTED

The audit revealed that the live repo has already absorbed most of the lessons in this document. The corrected net-action list is small:

**Truly outstanding (action needed):**
1. **`.env.example`** — update outdated `ESG_SUBMISSION_TYPE_IND=EIND` and add the four explanatory comments (§3). Low risk.
2. **TC-A06 golden** — add a JSON input to the manifest and regenerate its golden XML so the regression reports 36 PASS / 0 SKIPPED (§4.1). Low risk.
3. **Create `FAERS_USP_Golden_Checklist.md`** with the corrected rules in §4.4 (not the earlier inverted rules).
4. **AEMSESUB enrollment** — out of code's hands; helpdesk email is drafted in `helpdesk_email_draft.md`.

**Deferred pending external clarification:**
5. **`FDA.C.5.6.r` on IND path** — conflicts with regression rule R0026; reconcile with ESGNGSupport / Implementation Guide §5 before changing anything (§2.6, §4.3).
6. **Canonical `ESG_SUBMISSION_TYPE_IND` value** — cannot be determined until AEMSESUB grants enrollment; current `AERS_PREMKT_CDER` placeholder is reasonable.

**Cosmetic, not required:**
7. Batch UUID format includes `v<NN>` segment in this doc but uuid4 already guarantees uniqueness (§2.5). No action.

**Already implemented (no action needed):**
- All §1 API client fixes
- All §2.1, §2.2, §2.3 (corrected), §2.4, §2.5, §2.7 XML generator rules
- All §3 live `.env` values (only `.env.example` needs work)

**Do NOT apply:**
- The earlier draft's "direct child of investigationEvent + OID `.1.6` + second sender author" rule set. Live code uses the opposite (and proven) convention; the earlier rules would re-introduce the v36 SAX exception.

Once the IND enrollment is granted by AEMSESUB, the same code path that handles AERS should handle IND, **modulo confirming the canonical `submission_type` token from the first successful IND credential response** (since `IND` was rejected, `AERS_PREMKT_CDER` is a placeholder, and the canonical string is unknown).
