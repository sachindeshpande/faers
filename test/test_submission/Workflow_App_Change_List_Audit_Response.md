# Workflow_App_Change_List Audit — Response

I've now verified the key issue firsthand. Before touching anything, I need to surface a significant problem, because following the change list literally would reverse proven-working code.

## What I found

I audited the current repo against all of `Workflow_App_Change_List.md`. The headline: **most of it is already implemented**, and in several places the code has actually moved *past* the doc. But a few of the doc's instructions **directly contradict the proven v36/v37 code and the lint**, and applying them would regress the working AERS path.

**Already done (no action needed):**
- `submit_batch.py` (§1): all 12 API-client items are in place — `accesstoken` header, `client_credentials`/`openid profile`, no Content-Type on GETs, literal `@`, `data`-envelope unwrap, TEST/PROD path split, success codes, `description` field, conditional `authorizing_company_id`, `from_app/` glob, re-submission gating.
- `xmlGeneratorService.ts` (§2): structured `<prefix>/<given>/<family>`, `<country>US</country>`, tel/fax/mailto, indication CE with `code`+`codeSystem`, MedDRA OID+version (now **27.1**, doc said 25.0), no `primaryRole PRS`, PORR sender free of `.3.12`, CDER_IND / ZZFDATST_PREMKT routing.
- `.env`: `ESG_USER_ID=33703`, `ESG_COMPANY_ID=31537`, `ESG_AUTHORIZING_COMPANY_ID=` blank — all correct.

**⚠️ Doc contradicts the proven code — I do NOT recommend applying these:**

The change list §2.3 / §4.2 / §4.4 says the reporter `author` must be a **direct child of `investigationEvent`** with OID **`.1.6`**, plus a second sender-author block. But the actual code (`xmlGeneratorService.ts:817-824`) and the lint (`faers_xml_lint.py:190-209`) deliberately do the **opposite**, with explicit evidence:

> `faers_xml_lint.py:190` — *"CRITICAL (v36 lesson): `<author>` must NOT be a direct child of investigationEvent … v36 SAX exception confirmed."*
> `xmlGeneratorService.ts` — reporter is inside `subjectOf1/controlActEvent/author` with OID `.1.7`.

The doc's own §7 says the AERS path is "proven (27 successful submissions, full CA+AA on v37)" — and that was achieved with the `subjectOf1` + `.1.7` structure. So §2.3 row 1 / §4.4 rules 1-5 appear to be a **stale pre-v36 hypothesis the project later reversed**. Applying them would re-introduce the v36 SAX exception.

**Genuinely outstanding, but each has a caveat:**
- **§2.6/§4.3 — suppress `FDA.C.5.6.r` on IND path.** Real (code emits it unconditionally for IND), but the regression test rule **R0026 currently *expects* it present for IND** when C.5.5a is populated — so this conflicts with the test suite too.
- **§3 — `.env.example`** still has outdated `ESG_SUBMISSION_TYPE_IND=EIND` and lacks the explanatory comments. (Note: live `.env`/code now use `AERS_PREMKT_CDER`, not `IND` as the doc wanted — code moved past the doc.)
- **§4.1 — TC-A06** golden has `json_src: null` (needs a JSON input + golden regen).
- **§4.4 — `FAERS_USP_Golden_Checklist.md`** doesn't exist (would be a new file).
- **§2.5 — batch UUID** lacks the `v<NN>` segment (cosmetic; uniqueness already guaranteed by uuid4).

My read: this change list was written for an *upstream* app and is largely a historical record that's now stale relative to this repo. Blindly executing it would do net harm.

How would you like to proceed?

---

## Options presented

### Question 1 — Author rules

**The doc's reporter-author rules (direct-child of investigationEvent, OID .1.6) directly contradict the proven v36/v37 code + lint (subjectOf1, OID .1.7). How should I handle these?**

- **Skip — trust v37 code:** Leave the proven subjectOf1/.1.7 structure as-is. Do NOT apply §2.3/§4.2/§4.4 author-placement rules. (Recommended — applying them re-introduces the v36 SAX exception.)
- **Apply doc anyway:** Change reporter author to direct-child + OID .1.6 + add sender author block as the doc instructs. Risk: regresses the working AERS path.
- **Investigate deeper first:** Dig into git history / ACK records to definitively confirm which convention is current before deciding.

### Question 2 — Outstanding items

**Which of the genuinely-outstanding, non-contradictory items should I implement now?** (multi-select)

- **.env.example fixes:** Update outdated ESG_SUBMISSION_TYPE_IND=EIND and add the explanatory comments (EIN leading 3, company_id=2 wrong, IND enrollment prerequisite). Low risk.
- **FDA.C.5.6.r IND suppression:** Suppress FDA.C.5.6.r on the IND XML path. NOTE: conflicts with regression rule R0026 which expects it present for IND — I'd need to reconcile that too.
- **TC-A06 golden entry:** Add a JSON input for TC-A06 and regenerate its golden XML so regression reports 36 PASS / 0 SKIPPED.
- **Create Golden Checklist:** Create FAERS_USP_Golden_Checklist.md with the §4.4 rules — but using the ACTUAL proven conventions, not the doc's stale inverted ones.
