#!/usr/bin/env python3
"""
validate_backbone.py — Backbone Invariant Check for FAERS ICSR XML

Asserts the proven v37 structural conventions independently of any golden XML.
Catches the class of bug where the generator and the goldens drift together
in a way the regression test would miss.

Each invariant is one XPath assertion + a human-readable rationale, tied to
a specific historical ACK that proved it. If you ever want to relax one,
read the rationale first.

Usage:
    python validate_backbone.py path/to/case.xml
    python validate_backbone.py file1.xml file2.xml ...
    python validate_backbone.py --all regression/xml/        # all *.xml in dir
    python validate_backbone.py --verbose case.xml           # show evidence on PASS too
    python validate_backbone.py --json case.xml              # machine-readable output

Exit codes:
    0 — every file passed every invariant
    1 — at least one invariant failed
    2 — usage or environment error (no XML provided, lxml missing, etc.)

Designed to run in milliseconds per file. Safe as a per-commit gate.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

try:
    from lxml import etree as ET
except ImportError:
    sys.stderr.write(
        "ERROR: lxml is required. Install with: pip install lxml\n"
    )
    sys.exit(2)


# ─── Constants ────────────────────────────────────────────────────────────────

NS = {"v3": "urn:hl7-org:v3"}

MEDDRA_OID = "2.16.840.1.113883.6.163"
REPORTER_CODESYSTEM = "2.16.840.1.113883.3.989.2.1.1.7"   # v37 proven OID
PORR_RECEIVER_OID   = "2.16.840.1.113883.3.989.2.1.3.12"  # receiver OID — must NOT be in sender

# Default expected MedDRA version. Overridable via --meddra-version on the CLI or
# the FAERS_MEDDRA_VERSION env var (read in main()). Bump the default when the
# project upgrades MedDRA so the constant tracks the live generator.
EXPECTED_MEDDRA_VERSION_DEFAULT = "25.0"
EXPECTED_MEDDRA_VERSION = EXPECTED_MEDDRA_VERSION_DEFAULT  # mutated by main()


# ─── Plumbing ─────────────────────────────────────────────────────────────────

@dataclass
class InvariantResult:
    invariant_id: str
    name: str
    passed: bool
    evidence: str
    rationale: str

@dataclass
class FileResult:
    path: str
    parsed: bool
    parse_error: str = ""
    results: list[InvariantResult] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return self.parsed and all(r.passed for r in self.results)


def _local(tag: str) -> str:
    """Strip namespace from an lxml tag."""
    return tag.split("}", 1)[1] if "}" in tag else tag


def _xpath(tree, expr: str):
    return tree.xpath(expr, namespaces=NS)


def _count(tree, expr: str) -> int:
    return int(tree.xpath(f"count({expr})", namespaces=NS))


# ─── Invariants ───────────────────────────────────────────────────────────────
#
# Each invariant takes (tree, filename) and returns (passed: bool, evidence: str).
# `tree` is an lxml ElementTree. `filename` is provided so invariants can
# branch on IND-* vs TC-* file naming.

def inv_01(tree, _fn):
    """No <author> as direct child of <investigationEvent>."""
    n = _count(tree, "//v3:investigationEvent/v3:author")
    if n == 0:
        return True, "0 direct-child <author> under investigationEvent"
    return False, f"FOUND {n} direct-child <author> — would re-introduce v36 SAX exception"


def inv_02(tree, _fn):
    """Reporter <author> lives in subjectOf1/controlActEvent."""
    n = _count(tree, '//v3:subjectOf1/v3:controlActEvent/v3:author[@typeCode="AUT"]')
    if n >= 1:
        return True, f"{n} reporter <author> in subjectOf1/controlActEvent"
    return False, "0 reporter <author> in subjectOf1/controlActEvent — FDA 2.18 engine won't find C.3 fields"


def inv_03(tree, _fn):
    """Reporter assignedEntity/code codeSystem == .1.1.7."""
    codes = _xpath(
        tree,
        "//v3:subjectOf1/v3:controlActEvent/v3:author"
        "/v3:assignedEntity/v3:code/@codeSystem"
    )
    if not codes:
        return False, "no reporter assignedEntity/code/@codeSystem"
    bad = [c for c in codes if c != REPORTER_CODESYSTEM]
    if bad:
        return False, f"found codeSystem {bad!r}, expected {REPORTER_CODESYSTEM!r}"
    return True, f"reporter codeSystem == {REPORTER_CODESYSTEM}"


def inv_04(tree, _fn):
    """No primaryRole[@classCode='PRS'] anywhere."""
    n = _count(tree, '//v3:primaryRole[@classCode="PRS"]')
    if n == 0:
        return True, "0 primaryRole[@classCode='PRS']"
    return False, f"FOUND {n} primaryRole[@classCode='PRS'] — would re-introduce v33 SAX exception"


def inv_05(tree, _fn):
    """Nested representedOrganization is present in the reporter author block."""
    n = _count(
        tree,
        "//v3:subjectOf1/v3:controlActEvent/v3:author/v3:assignedEntity"
        "/v3:representedOrganization/v3:assignedEntity/v3:representedOrganization"
    )
    if n >= 1:
        return True, f"{n} nested representedOrganization block(s)"
    return False, "0 nested representedOrganization — would re-introduce v30 C.3.2 regression"


def inv_06(tree, _fn):
    """name uses structured <given> and <family> children, not mixed-content text."""
    given = _count(tree, "//v3:assignedPerson/v3:name/v3:given")
    family = _count(tree, "//v3:assignedPerson/v3:name/v3:family")
    if given >= 1 and family >= 1:
        return True, f"given={given}, family={family}"
    return False, f"missing structured name children: given={given}, family={family}"


def inv_07(tree, _fn):
    """addr includes <country>."""
    n = _count(tree, "//v3:assignedEntity/v3:addr/v3:country")
    if n >= 1:
        return True, f"{n} <country> element(s) in <addr>"
    return False, "0 <country> in <addr>"


def inv_08(tree, _fn):
    """Reporter telecoms include tel:, fax:, and mailto: prefixes."""
    vals = _xpath(tree, "//v3:assignedEntity/v3:telecom/@value")
    has_tel    = any(v.startswith("tel:")    for v in vals)
    has_fax    = any(v.startswith("fax:")    for v in vals)
    has_mailto = any(v.startswith("mailto:") for v in vals)
    if has_tel and has_fax and has_mailto:
        return True, "tel + fax + mailto all present"
    missing = [
        name for name, ok in
        [("tel", has_tel), ("fax", has_fax), ("mailto", has_mailto)]
        if not ok
    ]
    return False, f"missing telecom prefix(es): {missing}"


def inv_09(tree, _fn):
    """PORR sender contains no id with root .3.12 (the receiver OID)."""
    n = _count(
        tree,
        f'//v3:PORR_IN049016UV/v3:sender//v3:id[@root="{PORR_RECEIVER_OID}"]'
    )
    if n == 0:
        return True, "PORR sender free of receiver OID .3.12"
    return False, f"FOUND {n} id(s) with root .3.12 in PORR sender — caused batch-level AR"


def inv_10(tree, _fn):
    """Every MedDRA-coded <value> has both @code and @codeSystem."""
    vals = _xpath(tree, f'//v3:value[@codeSystem="{MEDDRA_OID}"]')
    bad = [v for v in vals if not v.get("code")]
    if not bad:
        return True, f"{len(vals)} MedDRA-coded value(s); all have @code"
    return False, f"{len(bad)} MedDRA value(s) missing @code"


def inv_11(tree, _fn):
    """MedDRA codeSystemVersion matches EXPECTED_MEDDRA_VERSION."""
    versions = set(_xpath(
        tree, f'//v3:value[@codeSystem="{MEDDRA_OID}"]/@codeSystemVersion'
    ))
    if not versions:
        return True, "no MedDRA-coded values (vacuous pass)"
    if versions == {EXPECTED_MEDDRA_VERSION}:
        return True, f"all MedDRA codeSystemVersion == {EXPECTED_MEDDRA_VERSION}"
    return False, (
        f"MedDRA codeSystemVersion(s) = {versions}, "
        f"expected {{{EXPECTED_MEDDRA_VERSION}}}"
    )


def inv_12(tree, _fn):
    """Batch UUID extension is present and non-trivially long."""
    ids = _xpath(tree, "/v3:MCCI_IN200100UV01/v3:id/@extension")
    if not ids:
        return False, "no MCCI batch <id> @extension"
    if not ids[0]:
        return False, "MCCI batch <id> @extension is empty"
    if len(ids[0]) < 16:
        return False, f"batch UUID @extension too short: {ids[0]!r}"
    return True, f"batch UUID present: {ids[0]}"


def inv_13(tree, _fn):
    """Wrapper child order: id, creationTime, responseModeCode, interactionId,
    name, PORR_IN049016UV, receiver, sender."""
    root = tree.getroot()
    if _local(root.tag) != "MCCI_IN200100UV01":
        return False, f"root is {_local(root.tag)}, expected MCCI_IN200100UV01"
    expected = [
        "id", "creationTime", "responseModeCode", "interactionId",
        "name", "PORR_IN049016UV", "receiver", "sender",
    ]
    rank = {name: i for i, name in enumerate(expected)}
    children = [_local(c.tag) for c in root if isinstance(c.tag, str)]
    relevant = [c for c in children if c in rank]
    last = -1
    for c in relevant:
        if rank[c] < last:
            return False, f"out-of-order wrapper child: <{c}> follows a later element"
        last = rank[c]
    return True, f"wrapper child order OK: {relevant}"


def inv_14(tree, _fn):
    """Wrapper <name>/@displayName == 'ichicsr'."""
    vals = _xpath(tree, "/v3:MCCI_IN200100UV01/v3:name/@displayName")
    if not vals:
        return False, "no wrapper <name>/@displayName"
    if "ichicsr" not in vals:
        return False, f"wrapper <name>/@displayName = {vals!r}, expected 'ichicsr'"
    return True, "wrapper <name>/@displayName == 'ichicsr'"


def inv_15(tree, filename):
    """Routing: IND files → CDER_IND / ZZFDATST_PREMKT; TC files → CDER / ZZFDATST."""
    is_ind = Path(filename).name.startswith("IND-")
    inner = _xpath(
        tree,
        "//v3:PORR_IN049016UV/v3:receiver/v3:device/v3:id/@extension"
    )
    top = _xpath(
        tree,
        "/v3:MCCI_IN200100UV01/v3:receiver/v3:device/v3:id/@extension"
    )
    if is_ind:
        if "CDER_IND" not in inner:
            return False, f"IND file: PORR receiver = {inner}, expected to include CDER_IND"
        # Top receiver may be ZZFDATST_PREMKT (test) or ZZFDA_PREMKT (prod)
        if not any("PREMKT" in t for t in top):
            return False, f"IND file: top receiver = {top}, expected *_PREMKT"
        return True, f"IND routing: PORR={inner}, top={top}"
    else:
        if "CDER" not in inner:
            return False, f"postmarket file: PORR receiver = {inner}, expected to include CDER"
        if not any(t.startswith("ZZFDA") for t in top):
            return False, f"postmarket file: top receiver = {top}, expected ZZFDA*"
        return True, f"postmarket routing: PORR={inner}, top={top}"


# ─── Invariant registry ───────────────────────────────────────────────────────

INVARIANTS: list[tuple[str, str, str, Callable]] = [
    ("BB-01", "no_author_direct_child",
     "Reporter <author> must NOT be a direct child of <investigationEvent> — v36 SAX exception",
     inv_01),
    ("BB-02", "reporter_in_subjectof1",
     "Reporter <author> must live in subjectOf1/controlActEvent — FDA 2.18 engine path",
     inv_02),
    ("BB-03", "reporter_oid_1_7",
     "Reporter assignedEntity/code codeSystem must be .1.1.7 — v37 proven",
     inv_03),
    ("BB-04", "no_primaryrole_prs",
     "primaryRole[@classCode='PRS'] is rejected by CDER PORR schema — v33 SAX exception",
     inv_04),
    ("BB-05", "nested_represented_org",
     "Nested representedOrganization is the v37 differentiator vs. v30 C.3.2 failure",
     inv_05),
    ("BB-06", "structured_name_children",
     "name uses <prefix>/<given>/<family> children, not mixed-content text",
     inv_06),
    ("BB-07", "country_in_addr",
     "addr includes <country>",
     inv_07),
    ("BB-08", "telecoms_present",
     "Reporter telecoms include tel:, fax:, and mailto:",
     inv_08),
    ("BB-09", "porr_sender_no_312",
     "PORR sender free of receiver OID .3.12 — caused batch-level AR",
     inv_09),
    ("BB-10", "indication_ce_coded",
     "MedDRA-coded <value> elements have both @code and @codeSystem",
     inv_10),
    ("BB-11", "meddra_version",
     f"MedDRA codeSystemVersion is the expected current value ({EXPECTED_MEDDRA_VERSION})",
     inv_11),
    ("BB-12", "batch_uuid_present",
     "Batch UUID @extension is present and non-trivial",
     inv_12),
    ("BB-13", "wrapper_child_order",
     "Wrapper child order matches schema sequence",
     inv_13),
    ("BB-14", "name_displayname_ichicsr",
     "Wrapper <name>/@displayName == 'ichicsr'",
     inv_14),
    ("BB-15", "routing_by_filename",
     "Routing fields match track inferred from filename (IND-* vs TC-*)",
     inv_15),
]


# ─── Runner ───────────────────────────────────────────────────────────────────

def check_file(path: Path) -> FileResult:
    fr = FileResult(path=str(path), parsed=False)
    try:
        tree = ET.parse(str(path))
    except Exception as e:  # noqa: BLE001
        fr.parse_error = f"{type(e).__name__}: {e}"
        return fr
    fr.parsed = True
    for inv_id, name, rationale, fn in INVARIANTS:
        try:
            passed, evidence = fn(tree, str(path))
        except Exception as e:  # noqa: BLE001
            passed, evidence = False, f"invariant raised {type(e).__name__}: {e}"
        fr.results.append(InvariantResult(
            invariant_id=inv_id,
            name=name,
            passed=passed,
            evidence=evidence,
            rationale=rationale,
        ))
    return fr


def gather_files(args) -> list[Path]:
    paths: list[Path] = []
    for arg in args.paths:
        p = Path(arg)
        if args.all and p.is_dir():
            paths.extend(sorted(p.glob("**/*.xml")))
        elif p.is_file():
            paths.append(p)
        elif p.is_dir():
            paths.extend(sorted(p.glob("*.xml")))
        else:
            sys.stderr.write(f"WARNING: {arg} does not exist\n")
    return paths


def render_text(file_results: list[FileResult], verbose: bool) -> int:
    total_failures = 0
    for fr in file_results:
        header = f"── {fr.path}"
        print(header)
        if not fr.parsed:
            print(f"   PARSE ERROR: {fr.parse_error}")
            total_failures += 1
            continue
        file_fail_count = 0
        for r in fr.results:
            status = "PASS" if r.passed else "FAIL"
            line = f"   [{status}] {r.invariant_id} {r.name}"
            if not r.passed:
                line += f"  →  {r.evidence}"
                file_fail_count += 1
            elif verbose:
                line += f"  ({r.evidence})"
            print(line)
        summary = f"   summary: {len(fr.results) - file_fail_count}/{len(fr.results)} passed"
        if file_fail_count:
            summary += f"  ❌ {file_fail_count} FAIL"
        print(summary)
        total_failures += file_fail_count
    print()
    print(f"Total: {len(file_results)} file(s), {total_failures} invariant failure(s)")
    return 0 if total_failures == 0 else 1


def render_json(file_results: list[FileResult]) -> int:
    out = {
        "files": [
            {
                "path": fr.path,
                "parsed": fr.parsed,
                "parse_error": fr.parse_error or None,
                "passed": fr.passed,
                "invariants": [
                    {
                        "id": r.invariant_id,
                        "name": r.name,
                        "passed": r.passed,
                        "evidence": r.evidence,
                        "rationale": r.rationale,
                    }
                    for r in fr.results
                ],
            }
            for fr in file_results
        ],
    }
    print(json.dumps(out, indent=2))
    return 0 if all(fr.passed for fr in file_results) else 1


def main() -> int:
    import os
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("paths", nargs="+",
                        help="XML files (or directories with --all)")
    parser.add_argument("--all", action="store_true",
                        help="Recursively scan **/*.xml under each directory")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Show evidence on PASS too")
    parser.add_argument("--json", action="store_true",
                        help="Output machine-readable JSON")
    parser.add_argument(
        "--meddra-version",
        default=os.environ.get(
            "FAERS_MEDDRA_VERSION", EXPECTED_MEDDRA_VERSION_DEFAULT
        ),
        help=("Expected MedDRA codeSystemVersion for BB-11. "
              f"Defaults to FAERS_MEDDRA_VERSION env or "
              f"{EXPECTED_MEDDRA_VERSION_DEFAULT}."),
    )
    args = parser.parse_args()

    # Apply runtime overrides
    global EXPECTED_MEDDRA_VERSION
    EXPECTED_MEDDRA_VERSION = args.meddra_version

    files = gather_files(args)
    if not files:
        sys.stderr.write("ERROR: no XML files found\n")
        return 2

    results = [check_file(f) for f in files]
    if args.json:
        return render_json(results)
    return render_text(results, verbose=args.verbose)


if __name__ == "__main__":
    sys.exit(main())
