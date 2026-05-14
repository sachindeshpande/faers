# Session Handoff — 2026-05-13

**HEAD commit:** `96db9ac` (last green CI run)
**Branch:** `main`
**Regression state:** **35/35 PASS / 1 SKIPPED** — the 1 skip is TC-A06 (`nullFlavor="NI"` triggers SAX schema rejection — no valid XML form exists for that scenario)
**CI gate:** ✅ live and green on the last 5+ runs at `.github/workflows/regression.yml`

You are picking up after a session that drove the regression suite from 0 ⇒ 35/35 PASS, wired the curated `test/golden/` reference set into the codebase, and built a CI pre-merge gate. **Read §1 first**, then jump to §5 ("Resuming context") for the decision tree on what to do next.

---

## 1. Where the project is, in one paragraph

The campaign is **fully automated and gated**. Every JSON in `test/golden/<category>/json/` reproduces its matching FDA-accepted XML in `test/golden/<category>/xml/` byte-equivalently after normalization. Every PR + push to `main` runs the regression suite via GitHub Actions in ~50 s. The 36 curated scenarios split into 26 postmarket/accepted + 3 postmarket/rejected (TC-A03/A04/A06 are data-point rejections recorded as `proven_rejected` in `FAERS_POLICY`) + 7 IND/accepted. Only TC-A06 is non-testable (schema-rejected). Generator changes that break any of the 35 fail CI before merge; uncommitted in-flight work is described in §3.

## 2. What this session shipped (last → first)

| Commit | Headline |
|---|---|
| `96db9ac` | Single mermaid `flowchart` covering the full submission lifecycle with all retry cycles wired together — [`docs/architecture/submission_flow.md`](../architecture/submission_flow.md) |
| `4b5daf2` | CI step name bumped to "35 scenarios" |
| `5d76624` | **GAP-PROD-001/002**: wired `studyReport` + `combinationProduct` through DB/import/generator → TC-F02 + TC-F04 now JSON-driven; **35/35 PASS / 1 SKIPPED** |
| `5ebac22` | [`docs/status/2026-05-09_regression_verified_green.md`](../status/2026-05-09_regression_verified_green.md) — holistic snapshot of the green state |
| `189da36` | Persist generated XMLs to `test/test_submission/regression/xml/` + auto-clean stale |
| `3fac393` | Relocated regression results into `test/test_submission/regression/` |
| `907d489` | Added the full 104-file `test/golden/` tree to git (it was on disk but untracked) |
| `8ec7397` | First CI pre-merge gate workflow |
| `4419b33` | **GAP-GOLDEN-001 closed**: TC-A05 + TC-G01 goldens regenerated from JSON → 33/33 PASS |
| `6e7b588` | [`docs/gaps/GAP-GOLDEN-001-tc-a05-tc-g01-curation-drift.md`](../gaps/GAP-GOLDEN-001-tc-a05-tc-g01-curation-drift.md) — diagnostic trail |
| `9cf75f1` | Closed TC-F03 narrative + TC-G01 JSON sync + C83121 emission for non-serious |
| `7e01aab` | **Items 3+4**: `overallNonSerious` validator opt-out + FIX-X05 codified in generator |

Anchors: each commit message has a detailed body. `git show <sha>` for context.

## 3. Uncommitted in-flight work (live in the working tree)

There are deliberate uncommitted edits a previous step authored but did not commit. **Do not revert them.** Each captures real new information the next session needs to land into a commit.

### 3.a `faers-app/src/main/services/faersEmpiricalPolicy.ts` — IND_POLICY.crossReportedInd

**OPEN-01 is now CLOSED.** The IND_May7 v5 batch (commit `00d4234`) submitted with OID `…2.1.2.3` stripped (T01/T02/T04-T07) or swapped to `…2.1.2.1` (T03) round-tripped **7 × CA+AE on 2026-05-09**. The FDA.C.5.6.r warning fired on **every** case regardless of OID. The diff updates the policy:

- `value` → `present (any OID); C.5.6.r warning is channel-inherent — cannot be suppressed`
- `verdict` → `proven_safe` (was `untested`)
- `evidence` → 7 ACK file IDs: ci260507054727/37/46/56/806/815/825 plus the prior regen #3 portal evidence

**Implication:** the OID swap was a no-op. T03's two cross-references should revert to the standard generator OID. The warning is informational only — `CA+AE` is the *expected* terminal state for any IND submission carrying C.5.6.r. Update `SUBMISSION_CAMPAIGN_REPORT.md` §1.5 promotion convention to reflect this.

### 3.b `test/test_submission/ACK_Issue_Tracker.md`

Modified — full inventory of every ACK across the campaign. Should be committed alongside the policy update so the evidence trail in `crossReportedInd.evidence` matches what's in the tracker.

### 3.c `test/test_submission/FAERS_Test_Case_Catalog.md`

Modified — touched but not inspected this session. Read the diff before committing.

### 3.d Deleted `test/test_submission/acks/ci2603*.ack` files (~50 files)

These are bulk deletions of old March/April flat-layout ACKs. The curated truth is now under `test/golden/<cat>/xml/<scenario>.ack` (per the campaign report §1.5). Confirm the deletions are deliberate (they appear to be — the curated tree is the source of truth) and then commit them in a cleanup PR. Don't restore.

### How to commit the OPEN-01 closure

```bash
git diff faers-app/src/main/services/faersEmpiricalPolicy.ts | less   # review
git add faers-app/src/main/services/faersEmpiricalPolicy.ts \
        test/test_submission/ACK_Issue_Tracker.md \
        test/test_submission/FAERS_Test_Case_Catalog.md
# Commit message template:
# OPEN-01 CLOSED: C.5.6.r warning is channel-inherent on CDER_IND
# 7 × CA+AE on IND_May7 v5 confirmed the warning fires regardless of
# OID (.2.1.2.3 stripped or .2.1.2.1 swapped — both fire identically).
# crossReportedInd promoted to proven_safe; expected ACK on any IND
# with C.5.6.r is CA+AE.
```

## 4. Canonical pointers (read these to ramp)

| Purpose | File |
|---|---|
| **Where are we now (holistic)** | [`docs/status/2026-05-09_regression_verified_green.md`](../status/2026-05-09_regression_verified_green.md) |
| **Single-diagram submission flow** | [`docs/architecture/submission_flow.md`](../architecture/submission_flow.md) |
| **Campaign-level inventory + history** | [`test/test_submission/SUBMISSION_CAMPAIGN_REPORT.md`](../../test/test_submission/SUBMISSION_CAMPAIGN_REPORT.md) |
| **Every ACK with disposition** | [`test/test_submission/ACK_Issue_Tracker.md`](../../test/test_submission/ACK_Issue_Tracker.md) (note: has in-flight edits) |
| **Path-to-33-then-35 journey** | [`docs/status/golden_regression_path_to_33_33.md`](../status/golden_regression_path_to_33_33.md) |
| **Per-gap diagnostic** | [`docs/gaps/GAP-IND-001`…`GAP-IND-007`](../gaps/), [`GAP-GOLDEN-001`](../gaps/GAP-GOLDEN-001-tc-a05-tc-g01-curation-drift.md) |
| **Empirical policy table** | `faers-app/src/main/services/faersEmpiricalPolicy.ts` (FAERS_POLICY + IND_POLICY) |
| **Regression script** | `test/test_submission/golden_regression_test.py` (supports `--scenario <name>` and full-run wipe of `regression/xml/`) |
| **Latest regression report** | [`test/test_submission/regression/golden_regression_results.md`](../../test/test_submission/regression/golden_regression_results.md) |

## 5. Resuming context — decision tree

Pick the branch that matches the user's first message:

### A. "What's next?" / "Status?" — point at green state

Tell them:
- HEAD is green: 35/35 PASS / 1 SKIPPED, CI gated
- The single open code item is task #55 (deferred GAP-APP-005/006 — `TestCaseGeneratorService` + `ackParser.suggestPolicyUpdate` — larger scope, separate session)
- Plus the in-flight policy/tracker commit from §3 above
- Suggest: commit §3, then either GAP-APP-005 (largest leverage) or sit idle until a new ACK / new gap doc arrives

### B. A new gap doc lands at `docs/gaps/GAP-*.md`

Follow the established pattern:
1. Read the gap doc end-to-end
2. Verify its claims against current code with `grep` (line numbers in gap docs drift)
3. Present a tight review summarizing what aligns + any discrepancies; ask before executing
4. Execute in the recommended order; commit after each major change
5. Re-run regression — must stay 35+/35+
6. Update the policy table with new `proven_safe` / `proven_rejected` evidence if an FDA round-trip closed a gap

### C. A new ACK lands in `test/test_submission/acks/`

Use the CLI workflow:
```bash
ELECTRON_RUN_AS_NODE=1 npx electron faers-app/out/main/headless.js \
  --record-ack <batchUuid> --ack-id <ackId> --outcome 'CA+AE'  # or CR+AR etc.
```
Then:
- If CA+AA/AE on a previously-unproved value → promote to `proven_safe` in `FAERS_POLICY`/`IND_POLICY`, move XML+ACK pair into `test/golden/<cat>/xml/`, update `manifest.json` SHA, run regression
- If CR+AR → diagnose (classify per `submission_flow.md` cycle table), open a `GAP-*` doc, then fix

### D. User asks to add a new test case

Use the existing JSON pattern:
1. Author `test/golden/<cat>/json/<NAME>.json` (copy from a TC-A01 baseline)
2. Build headless: `cd faers-app && npm run build:headless`
3. Generate the XML: `ELECTRON_RUN_AS_NODE=1 IND_ENROLLMENT_CONFIRMED=true npx electron out/main/headless.js --no-gate --out-dir /tmp/regen <path>.json`
4. Lint: `python3 test/test_submission/faers_xml_lint.py /tmp/regen/<NAME>.xml` — must be 60/60
5. Submit to FDA via portal; wait for ACK; record outcome
6. **Only after CA+AA** move the XML + ACK into `test/golden/<cat>/xml/` and add a manifest entry with fresh SHA
7. Run full regression — should be `N+1` PASS / 1 SKIPPED

### E. The regression CI fails on someone's PR

```bash
# Local reproduction:
cd faers-app && npm run build:headless && cd ..
python3 test/test_submission/golden_regression_test.py --scenario <failing>
# Inspect the report:
cat test/test_submission/regression/golden_regression_results.md
```
Classify per the prompt at `docs/prompts/golden_regression_test.md` §"What a DIFF means":
- Regression → fix the generator
- New policy drift → record in policy table + run a fresh FDA round-trip before promoting
- Test data mismatch → sync JSON or regenerate golden (the latter requires fresh FDA evidence)

### F. User asks for a new docx review / Word doc

Use the extraction recipe that worked all session:
```bash
python3 -c "
import zipfile
from xml.etree import ElementTree as ET
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile('<path>.docx') as z:
    with z.open('word/document.xml') as f:
        tree = ET.parse(f)
out = []
for p in tree.getroot().iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
    text = ''.join(t.text or '' for t in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'))
    style = p.find('w:pPr/w:pStyle', ns)
    sv = style.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if style is not None else ''
    out.append(f'\n## [{sv}] {text}' if sv.startswith('Heading') else text)
print('\n'.join(out))
"
```

## 6. Gotchas (high-cost surprises)

1. **`test/test_submission/regression/` auto-cleans `xml/` on every unfiltered full run.** Don't commit edits to those files directly — they'll be overwritten the next time CI runs. Always change the JSON or the generator; the regression XML follows.
2. **`--no-gate` doesn't bypass `markReady` (pre-write field validation).** It only bypasses post-write gates (structural/lint/5-pass). TC-G01's `overallNonSerious` flag is the canonical opt-out for B.2.i.7; don't add new `--no-validate`-style flags speculatively.
3. **The headless CLI uses an ephemeral SQLite under `mkdtempSync`**, not `~/.faers-headless/faers.db`. That latter path is only the **submission log** (`submissionLogService.ts`). Don't conflate them.
4. **`IND_ENROLLMENT_CONFIRMED=true`** is required to run any IND/babe case through the headless CLI. The flag exists to prevent IND submissions before the operator confirms the FDA AEMSESUB enrollment is in place.
5. **CI artifact upload is the canonical record for "did the latest commit pass?"** — the committed `test/test_submission/regression/golden_regression_results.md` may lag one commit behind (it's snapshot at last local run). Use the GitHub Actions artifact for definitive answers.
6. **`overall_non_serious` was added via the simpler inline `ALTER TABLE` pattern, not via the numbered migration framework.** Migrations 026 + 027 (studyReport, combinationProduct) followed the canonical pattern. Future fields should pick whichever pattern matches the surrounding code; both work.
7. **Stale comments in `IND_POLICY` evidence strings.** When you promote a value, also update the `evidence` field to cite the new ACK file IDs. The current `crossReportedInd` diff is the model — point at the OPEN-01 closure ACKs.
8. **The mermaid flow doc at `docs/architecture/submission_flow.md`** is the single authoritative picture. If you change the workflow, update the diagram in the same PR. CI doesn't validate it.

## 7. Tooling cheat-sheet

| Action | Command |
|---|---|
| Run full regression (35 scenarios) | `python3 test/test_submission/golden_regression_test.py` |
| Run single scenario | `python3 test/test_submission/golden_regression_test.py --scenario TC-G01-nonserous` |
| Build headless CLI | `cd faers-app && npm run build:headless` |
| Generate one XML from JSON | `ELECTRON_RUN_AS_NODE=1 IND_ENROLLMENT_CONFIRMED=true npx electron out/main/headless.js --no-gate --out-dir /tmp/x <path>.json` |
| Lint a generated XML | `python3 test/test_submission/faers_xml_lint.py /tmp/x/<file>.xml` |
| Direct golden vs regression comparison (no CLI) | See script in [`docs/prompts/verify_regression_xml_vs_golden.md`](../prompts/verify_regression_xml_vs_golden.md) |
| Watch latest CI run | `gh run watch $(gh run list --workflow=regression.yml --limit 1 --json databaseId -q '.[0].databaseId')` |
| Record an ACK outcome | `ELECTRON_RUN_AS_NODE=1 npx electron faers-app/out/main/headless.js --record-ack <uuid> --ack-id <id> --outcome 'CA+AE'` |

## 8. Open items (tracked)

| ID | Title | Status |
|---|---|---|
| #55 | GAP-APP-005 (TestCaseGeneratorService) + GAP-APP-006 (ackParser.suggestPolicyUpdate) | Deferred — separate session, larger scope (new service + IPC + UI surface for 005; parser logic + Import-ACK UI for 006) |
| — | GAP-APP-004 follow-up: IND Pass 1 noise | Production submissions still surface false-positive structural diffs against IND-T01 for divergent IND/babe cases. Regression bypasses with `--no-gate`. Fix: downgrade IND P1 to warnings OR scope diff to invariant structure. |
| — | Pre-existing 27 vitest failures | `workflowService.test.ts` / `xmlGeneratorService.integration.test.ts` / `authStore.test.ts`. Not gated by CI. Low priority. |
| — | Node 20 actions deprecation | GitHub will force Node 24 on 2026-06-02. Bump action majors before then. |
| — | In-flight uncommitted work | See §3 — commit `faersEmpiricalPolicy.ts` + `ACK_Issue_Tracker.md` + the `acks/` cleanup as the next move. |

## 9. Tone / working style notes for the new agent

- The user prefers **tight, scannable responses**. Tables over prose. Short status reports. One-line commit summaries up top of every detailed message.
- **Auto mode is the default.** When the user gives a "Yes" / "Lets go with your recommendation", proceed without further confirmation. They redirect via course-correction when they want.
- **Prompts are detailed and self-contained.** When the user pastes a `docs/prompts/*.md`, expect file paths + line numbers + acceptance criteria + verification commands inside. Honor the structure; verify against current code before executing; flag discrepancies.
- **Empirical first.** Never extend `FAERS_POLICY` / `IND_POLICY` by spec reading alone. Only after a confirmed FDA ACK3. The `evidence` field is load-bearing — populate it with the ACK file ID.
- **Don't regenerate goldens speculatively.** Promotion convention: only after a confirmed CA+AA/AE round-trip. Internal generator changes should match the golden, not the other way around. (Exception: GAP-GOLDEN-001 pattern — where the golden itself was the outlier vs every other passing golden.)
- **CI is the gate.** Every commit to `main` should leave it green. If a commit will go red intentionally, flag it clearly in the commit message and ask before pushing.

---

**TL;DR for the very-fresh agent:** `git log -1`, then read [`docs/status/2026-05-09_regression_verified_green.md`](../status/2026-05-09_regression_verified_green.md), then [`docs/architecture/submission_flow.md`](../architecture/submission_flow.md). You'll be oriented in 5 minutes.
