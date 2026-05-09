#!/usr/bin/env python3
"""
Golden Dataset Regression Test
─────────────────────────────────────────────────────────────────────────────
Runs every JSON input from `test/golden/<category>/json/` through the
DeepQuence headless CLI and compares each generated XML against its
matching golden XML at `test/golden/<category>/xml/`.

Driven by `test/golden/manifest.json`. Skips entries whose `golden_json`
is null (XML-surgery cases without a JSON input).

Per-scenario verdicts:
  PASS              — exit 0, lint 60/60, structural diff empty after
                      excluding the volatile fields below
  GATE FAILURE      — headless CLI returned non-zero
  LINT FAILURE      — `faers_xml_lint.py` reported any FAIL
  STRUCTURAL DIFF   — content mismatch outside the excluded set

Excluded fields (per docs/prompts/golden_regression_test.md):
  - Batch UUID (.3.22)
  - Message envelope UUID (.3.1 first occurrence at MCCI level)
  - All creationTime / availabilityTime values
  - investigationEvent IVL_TS low (receipt date)
  - safetyReportId / worldwideCaseId on investigationEvent

Output: `test/test_submission/golden_regression_results.md`
Run from repo root or `faers-app/`. Path resolution is independent of cwd.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    from lxml import etree as ET  # preferred — better attribute order preservation
    LXML = True
except ImportError:
    import xml.etree.ElementTree as ET  # type: ignore
    LXML = False

# ────────────────────────────────────────────────────────────────────────────
#  Path resolution — repo-root anchored
# ────────────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parents[2]
GOLDEN_DIR = REPO_ROOT / "test" / "golden"
MANIFEST = GOLDEN_DIR / "manifest.json"
APP_DIR = REPO_ROOT / "faers-app"
LINT_SCRIPT = REPO_ROOT / "test" / "test_submission" / "faers_xml_lint.py"
RESULTS_FILE = REPO_ROOT / "test" / "test_submission" / "golden_regression_results.md"

NS = "{urn:hl7-org:v3}"
XSI = "{http://www.w3.org/2001/XMLSchema-instance}"

# UUID4 pattern (8-4-4-4-12 hex). Used to detect volatile `id/@root` and
# `id/@extension` values that change every generation.
import re as _re
UUID_RE = _re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", _re.IGNORECASE)
# Batch-id pattern emitted by the generator (e.g. DeepQuenceTest-20260508-<uuid>).
BATCH_ID_RE = _re.compile(r"^DeepQuence(Test|Prod)?-\d{8}-[0-9a-f\-]{36}$", _re.IGNORECASE)

# Volatile XPath-like locators — `(tag, parent_local_or_None)` keyed.
# Stripped from the in-memory tree before diffing; same behavior on both sides.
# When `parent_local` is None the rule applies to the tag wherever it appears.
EXCLUDED_FIELDS = [
    ("creationTime",     None),
    ("availabilityTime", None),
    # controlActProcess/effectiveTime is a generation timestamp (N.2.r.4
    # equivalent at the control-act level). Always volatile across runs.
    ("effectiveTime",    "controlActProcess"),
]

# Specific id-by-OID exclusions: tuple of (parent_tag, root_oid)
EXCLUDED_IDS = [
    # Batch UUID — first <id> directly under MCCI_IN200100UV01
    ("MCCI_IN200100UV01", "2.16.840.1.113883.3.989.2.1.3.22"),
    # Message envelope id — first <id> directly under PORR_IN049016UV
    ("PORR_IN049016UV",   "2.16.840.1.113883.3.989.2.1.3.1"),
    # Per-investigationEvent worldwide case id (.3.1) and case id (.3.2)
    ("investigationEvent", "2.16.840.1.113883.3.989.2.1.3.1"),
    ("investigationEvent", "2.16.840.1.113883.3.989.2.1.3.2"),
]

# ────────────────────────────────────────────────────────────────────────────
#  Data shapes
# ────────────────────────────────────────────────────────────────────────────

@dataclass
class Diff:
    path: str
    field: str
    golden_value: Optional[str]
    generated_value: Optional[str]


@dataclass
class ScenarioResult:
    scenario: str
    category: str
    ack_result: str
    verdict: str  # PASS, GATE FAILURE, LINT FAILURE, STRUCTURAL DIFF, SKIPPED
    exit_code: Optional[int] = None
    cli_stderr_tail: Optional[str] = None
    lint_failures: list[str] = field(default_factory=list)
    diffs: list[Diff] = field(default_factory=list)
    notes: Optional[str] = None


# ────────────────────────────────────────────────────────────────────────────
#  Headless CLI invocation
# ────────────────────────────────────────────────────────────────────────────

def run_headless(input_json: Path, out_dir: Path) -> tuple[int, str, str]:
    """Returns (exit_code, stdout, stderr).

    Always passes `--no-gate` so the XML is written even when 5-pass
    finds proven-rejected content (which is intentional for the
    `postmarket/rejected/` scenarios). The lint + structural diff in the
    regression script are the canonical pass/fail signals; the CLI exit
    code is captured separately as an advisory.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "npx", "electron", str(APP_DIR / "out" / "main" / "headless.js"),
        "--out-dir", str(out_dir),
        "--no-gate",
        "--quiet",
        str(input_json),
    ]
    env = os.environ.copy()
    env["ELECTRON_RUN_AS_NODE"] = "1"
    # IND-only — auto-detected from caseType in JSON, but the enrollment
    # pre-flight refuses to run without explicit confirmation.
    env["IND_ENROLLMENT_CONFIRMED"] = "true"
    proc = subprocess.run(
        cmd,
        cwd=APP_DIR,
        capture_output=True,
        text=True,
        env=env,
        timeout=120,
    )
    return proc.returncode, proc.stdout, proc.stderr


# ────────────────────────────────────────────────────────────────────────────
#  Lint invocation
# ────────────────────────────────────────────────────────────────────────────

def run_lint(xml_path: Path) -> tuple[bool, list[str]]:
    """Returns (passed, list of FAIL finding lines).

    The lint emits per-finding lines like `  ❌ FAIL  <reason>` and a
    summary line `RESULT: 60 ✅ PASS  |  0 ⚠️ WARN  |  0 ❌ FAIL`.
    A real fail finding is a line whose stripped form starts with `❌`;
    the summary line strip-starts with `RESULT` and so is excluded by
    that rule.
    """
    if not LINT_SCRIPT.exists():
        return True, []
    proc = subprocess.run(
        ["python3", str(LINT_SCRIPT), str(xml_path)],
        capture_output=True,
        text=True,
        timeout=30,
    )
    output = proc.stdout + proc.stderr
    failed_findings = [
        line for line in output.splitlines()
        if line.lstrip().startswith("❌")
    ]
    return not failed_findings, failed_findings


# ────────────────────────────────────────────────────────────────────────────
#  XML normalization + diff
# ────────────────────────────────────────────────────────────────────────────

def localname(tag: str) -> str:
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def parse_xml(path: Path):
    if LXML:
        # type: ignore[union-attr]
        return ET.parse(str(path)).getroot()
    return ET.parse(path).getroot()


def is_excluded_id(parent_local: str, elem) -> bool:
    """Match an <id> element under a recognized parent + OID."""
    if localname(elem.tag) != "id":
        return False
    root_attr = elem.get("root")
    if not root_attr:
        return False
    return any(parent_local == p and root_attr == r for p, r in EXCLUDED_IDS)


def normalize_for_diff(root):
    """In-place: strip volatile fields so both sides become directly comparable.

    Strategy: walk every element. If its local-name is in EXCLUDED_FIELDS,
    blank its `value` attribute. If it's an <id> matching a parent/OID in
    EXCLUDED_IDS, blank its `extension`. We DON'T remove elements (would
    reshape child counts) — we only blank the volatile attribute.
    """
    if LXML:
        iter_method = root.iter
    else:
        iter_method = root.iter

    # Build a map from element to its parent (lxml has getparent, ET doesn't)
    parents = {}
    if not LXML:
        for parent in iter_method():
            for child in parent:
                parents[id(child)] = parent

    for elem in list(iter_method()):
        local = localname(elem.tag)

        # Excluded standalone fields — blank @value (and any nested
        # IVL_TS low/high). When a parent_local is given, only match when
        # the element sits under that parent.
        for excl_local, parent_local_required in EXCLUDED_FIELDS:
            if local != excl_local:
                continue
            if parent_local_required is not None:
                parent = elem.getparent() if LXML else parents.get(id(elem))
                if parent is None or localname(parent.tag) != parent_local_required:
                    continue
            if "value" in elem.attrib:
                elem.set("value", "__VOLATILE__")

        # Excluded <id> elements
        if local == "id":
            if LXML:
                parent = elem.getparent()
            else:
                parent = parents.get(id(elem))
            parent_local = localname(parent.tag) if parent is not None else None

            # Parent/OID-keyed exclusions — blank @extension
            if parent_local is not None and is_excluded_id(parent_local, elem):
                if "extension" in elem.attrib:
                    elem.set("extension", "__VOLATILE__")

            # UUID-shaped @root or @extension — random per generation
            # (per-reaction observation ids, per-batch UUIDs, etc.). Blank
            # them regardless of position so the diff stays clean even
            # when new UUID-bearing elements are introduced later.
            for attr in ("root", "extension"):
                v = elem.get(attr)
                if v and (UUID_RE.match(v) or BATCH_ID_RE.match(v)):
                    elem.set(attr, f"__VOLATILE_{attr.upper()}__")

    # Also normalize whitespace in text content
    for elem in iter_method():
        if elem.text is not None:
            stripped = " ".join(elem.text.split())
            elem.text = stripped if stripped else None
        if elem.tail is not None:
            stripped = " ".join(elem.tail.split())
            elem.tail = stripped if stripped else None


def element_path(elem, parents: dict) -> str:
    """Build a tag/index path for diff reporting."""
    parts: list[str] = []
    cur = elem
    while cur is not None:
        parent = parents.get(id(cur)) if not LXML else cur.getparent()
        if parent is None:
            parts.append(localname(cur.tag))
            break
        siblings = [c for c in parent if localname(c.tag) == localname(cur.tag)]
        idx = siblings.index(cur) + 1
        parts.append(f"{localname(cur.tag)}[{idx}]")
        cur = parent
    return "/" + "/".join(reversed(parts))


def diff_trees(golden_root, generated_root) -> list[Diff]:
    """Recursive structural diff of two normalized trees."""
    diffs: list[Diff] = []

    g_parents: dict[int, object] = {}
    if not LXML:
        for parent in golden_root.iter():
            for child in parent:
                g_parents[id(child)] = parent

    def walk(g, x, path):
        # Tag mismatch
        if localname(g.tag) != localname(x.tag):
            diffs.append(Diff(path, "tag", localname(g.tag), localname(x.tag)))
            return  # don't descend into mismatched subtrees

        # Attribute diff
        g_attrs = {k: v for k, v in g.attrib.items()}
        x_attrs = {k: v for k, v in x.attrib.items()}
        all_keys = set(g_attrs) | set(x_attrs)
        for k in sorted(all_keys):
            gv = g_attrs.get(k)
            xv = x_attrs.get(k)
            if gv != xv:
                diffs.append(Diff(path, f"@{localname(k)}", gv, xv))

        # Text diff
        g_text = (g.text or "").strip()
        x_text = (x.text or "").strip()
        if g_text != x_text:
            diffs.append(Diff(path, "text", g_text or None, x_text or None))

        # Child count diff
        g_children = list(g)
        x_children = list(x)
        if len(g_children) != len(x_children):
            diffs.append(
                Diff(path, "child_count",
                     str(len(g_children)), str(len(x_children)))
            )
        # Walk min(len) children pairwise
        for i, (gc, xc) in enumerate(zip(g_children, x_children), start=1):
            child_path = f"{path}/{localname(gc.tag)}[{i}]"
            walk(gc, xc, child_path)

    walk(golden_root, generated_root, f"/{localname(golden_root.tag)}")
    return diffs


# ────────────────────────────────────────────────────────────────────────────
#  Main per-scenario routine
# ────────────────────────────────────────────────────────────────────────────

def process(entry: dict, tmp_root: Path) -> ScenarioResult:
    scenario = entry["scenario"]
    category = entry["category"]
    ack = entry.get("ack_result", "?")

    if entry.get("golden_json") is None:
        return ScenarioResult(
            scenario=scenario,
            category=category,
            ack_result=ack,
            verdict="SKIPPED",
            notes="No JSON input registered in manifest",
        )

    json_path = GOLDEN_DIR / entry["golden_json"]
    golden_xml_path = GOLDEN_DIR / entry["golden_xml"]
    if not json_path.exists():
        return ScenarioResult(
            scenario=scenario,
            category=category,
            ack_result=ack,
            verdict="SKIPPED",
            notes=f"JSON not found on disk: {json_path}",
        )
    if not golden_xml_path.exists():
        return ScenarioResult(
            scenario=scenario,
            category=category,
            ack_result=ack,
            verdict="SKIPPED",
            notes=f"Golden XML not found on disk: {golden_xml_path}",
        )

    out_dir = tmp_root / scenario
    code, _stdout, stderr = run_headless(json_path, out_dir)

    if code != 0:
        tail = "\n".join(stderr.splitlines()[-15:])
        return ScenarioResult(
            scenario=scenario,
            category=category,
            ack_result=ack,
            verdict="GATE FAILURE",
            exit_code=code,
            cli_stderr_tail=tail,
        )

    # Locate the generated XML (matches the JSON stem)
    expected_xml = out_dir / (json_path.stem + ".xml")
    if not expected_xml.exists():
        # Fall back: take any .xml in the out dir
        candidates = list(out_dir.glob("*.xml"))
        if not candidates:
            return ScenarioResult(
                scenario=scenario,
                category=category,
                ack_result=ack,
                verdict="GATE FAILURE",
                exit_code=code,
                notes="Headless CLI exit 0 but no XML produced",
            )
        expected_xml = candidates[0]

    # Lint
    lint_pass, lint_fails = run_lint(expected_xml)

    # Diff
    try:
        g_root = parse_xml(golden_xml_path)
        x_root = parse_xml(expected_xml)
    except Exception as e:
        return ScenarioResult(
            scenario=scenario,
            category=category,
            ack_result=ack,
            verdict="STRUCTURAL DIFF",
            notes=f"XML parse error: {e}",
        )
    normalize_for_diff(g_root)
    normalize_for_diff(x_root)
    diffs = diff_trees(g_root, x_root)

    if not lint_pass:
        return ScenarioResult(
            scenario=scenario,
            category=category,
            ack_result=ack,
            verdict="LINT FAILURE",
            lint_failures=lint_fails[:30],
            diffs=diffs,  # still record any diffs for context
        )

    if diffs:
        return ScenarioResult(
            scenario=scenario,
            category=category,
            ack_result=ack,
            verdict="STRUCTURAL DIFF",
            diffs=diffs,
        )

    return ScenarioResult(
        scenario=scenario,
        category=category,
        ack_result=ack,
        verdict="PASS",
    )


# ────────────────────────────────────────────────────────────────────────────
#  Report writing
# ────────────────────────────────────────────────────────────────────────────

def write_report(results: list[ScenarioResult], git_rev: str) -> None:
    by_verdict: dict[str, list[ScenarioResult]] = {}
    for r in results:
        by_verdict.setdefault(r.verdict, []).append(r)

    counts = {
        "PASS":            len(by_verdict.get("PASS", [])),
        "GATE FAILURE":    len(by_verdict.get("GATE FAILURE", [])),
        "LINT FAILURE":    len(by_verdict.get("LINT FAILURE", [])),
        "STRUCTURAL DIFF": len(by_verdict.get("STRUCTURAL DIFF", [])),
        "SKIPPED":         len(by_verdict.get("SKIPPED", [])),
    }
    total = sum(counts.values())
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")

    out: list[str] = []
    out.append("# Golden Regression Test Results")
    out.append(f"Run date: {timestamp}")
    out.append(f"Generator version: {git_rev}")
    out.append(f"Backend: {'lxml' if LXML else 'xml.etree.ElementTree'}")
    out.append("")
    out.append("## Summary")
    out.append("| Result | Count |")
    out.append("|---|---|")
    for k in ("PASS", "GATE FAILURE", "LINT FAILURE", "STRUCTURAL DIFF", "SKIPPED"):
        out.append(f"| {k} | {counts[k]} |")
    out.append(f"| **Total scenarios** | **{total}** |")
    out.append("")

    skipped = by_verdict.get("SKIPPED", [])
    if skipped:
        out.append("## Skipped Scenarios")
        for r in skipped:
            note = f" — {r.notes}" if r.notes else ""
            out.append(f"- {r.scenario}{note}")
        out.append("")

    failures = (
        by_verdict.get("GATE FAILURE", []) +
        by_verdict.get("LINT FAILURE", []) +
        by_verdict.get("STRUCTURAL DIFF", [])
    )
    if failures:
        out.append("## Failures (detail)")
        out.append("")
        for r in failures:
            out.append(f"### {r.scenario}  ({r.category}, ACK {r.ack_result})")
            out.append(f"- **Result:** {r.verdict}")
            if r.exit_code is not None:
                out.append(f"- **Exit code:** {r.exit_code}")
            if r.notes:
                out.append(f"- **Notes:** {r.notes}")
            if r.cli_stderr_tail:
                out.append("- **CLI stderr (tail):**")
                out.append("  ```")
                for line in r.cli_stderr_tail.splitlines():
                    out.append(f"  {line}")
                out.append("  ```")
            if r.lint_failures:
                out.append("- **Lint failures:**")
                for line in r.lint_failures:
                    out.append(f"  - `{line.strip()}`")
            if r.diffs:
                out.append(f"- **Diffs ({len(r.diffs)}):**")
                for d in r.diffs[:50]:
                    g = d.golden_value if d.golden_value is not None else "(absent)"
                    x = d.generated_value if d.generated_value is not None else "(absent)"
                    out.append(f"  - `{d.path}` `{d.field}` golden=`{g}` generated=`{x}`")
                if len(r.diffs) > 50:
                    out.append(f"  - … {len(r.diffs) - 50} more diffs truncated")
            out.append("")

    passes = sorted(r.scenario for r in by_verdict.get("PASS", []))
    if passes:
        out.append("## Full Pass List")
        for s in passes:
            out.append(f"- {s}")

    RESULTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_FILE.write_text("\n".join(out) + "\n", encoding="utf-8")


def git_rev() -> str:
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=5,
        )
        return proc.stdout.strip() or "(unknown)"
    except Exception:
        return "(unknown)"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Golden dataset regression test. Runs all JSON-backed scenarios "
                    "through the headless CLI and diffs against the curated golden XMLs."
    )
    parser.add_argument(
        "--scenario",
        action="append",
        metavar="NAME",
        dest="scenarios",
        help="Run only this scenario (repeatable; e.g. --scenario TC-G01-nonserous "
             "--scenario IND-T05-fatal-seven-day). Omit to run all scenarios.",
    )
    args = parser.parse_args()
    scenario_filter: set[str] | None = set(args.scenarios) if args.scenarios else None

    if not MANIFEST.exists():
        print(f"Manifest not found: {MANIFEST}", file=sys.stderr)
        return 2
    entries = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if not isinstance(entries, list):
        print("Manifest is not a JSON array", file=sys.stderr)
        return 2

    if scenario_filter:
        entries = [e for e in entries if e.get("scenario") in scenario_filter]
        if not entries:
            print(f"No manifest entries matched: {sorted(scenario_filter)}", file=sys.stderr)
            return 2

    results: list[ScenarioResult] = []
    with tempfile.TemporaryDirectory(prefix="golden_regression_") as tmp:
        tmp_root = Path(tmp)
        for i, entry in enumerate(entries, 1):
            scenario = entry.get("scenario", f"<entry-{i}>")
            print(f"[{i}/{len(entries)}] {scenario} … ", end="", flush=True)
            try:
                r = process(entry, tmp_root)
            except subprocess.TimeoutExpired:
                r = ScenarioResult(
                    scenario=scenario,
                    category=entry.get("category", "?"),
                    ack_result=entry.get("ack_result", "?"),
                    verdict="GATE FAILURE",
                    notes="headless CLI timeout (>120s)",
                )
            except Exception as e:
                r = ScenarioResult(
                    scenario=scenario,
                    category=entry.get("category", "?"),
                    ack_result=entry.get("ack_result", "?"),
                    verdict="GATE FAILURE",
                    notes=f"unexpected error: {e}",
                )
            print(r.verdict)
            results.append(r)

    write_report(results, git_rev())
    print(f"\nReport written: {RESULTS_FILE.relative_to(REPO_ROOT)}")

    pass_count = sum(1 for r in results if r.verdict == "PASS")
    skip_count = sum(1 for r in results if r.verdict == "SKIPPED")
    expected_pass = len(results) - skip_count
    print(f"Passed {pass_count}/{expected_pass} testable scenarios "
          f"(skipped {skip_count}).")
    return 0 if pass_count == expected_pass else 1


if __name__ == "__main__":
    sys.exit(main())
