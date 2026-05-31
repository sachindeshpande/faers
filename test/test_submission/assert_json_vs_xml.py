#!/usr/bin/env python3
"""
assert_json_vs_xml.py — Validate that a generated E2B(R3) XML reflects
the discriminating fields from the source JSON that drove it.

Usage:
    python3 assert_json_vs_xml.py <input.json> <generated.xml>

Exit:
    0  all assertions pass
    1  one or more assertions fail
    2  file not found / parse error

Strategy:
    For each testable field in the JSON, derive the expected value and verify
    it appears at the correct location in the generated XML.

    We do NOT compare against a golden XML — that avoids the transient-field
    problem (timestamps, UUIDs, batch IDs change every run). The source JSON
    is the ground truth; the XML is the evidence.

    Fields checked:
        patient.sex           → administrativeGenderCode/@code {1=Male,2=Female,0=Unknown}
        patient.race          → observation[C17049]/value/@code
        patient.ethnicity     → observation[C16564]/value/@code
        patient.ageValue      → observation[C25150]/value/@value (numeric)
        patient.weightKg      → observation[C25208]/value/@value (numeric)
        reactions[*].meddraCode → reaction observation value/@code
        drugs[*].productName  → kindOfProduct/name text
        drugs[*].role         → organizer code (suspect/concomitant)
        case.reportType       → investigationCharacteristic code=1 value/@code {1,2,3,4}
        case.expeditedReport  → expedited observation BL/@value {true,false}
        case.combinationProduct → C156384 observation BL/@value {true,false}
        routing (caseType=ind) → receiver id/@extension CDER_IND vs CDER
"""

import json
import sys
import re
from pathlib import Path
import xml.etree.ElementTree as ET

NS = "urn:hl7-org:v3"
NCI = "2.16.840.1.113883.3.26.1.1"

PASS = "PASS"
FAIL = "FAIL"
SKIP = "SKIP"

_results: list[tuple[str, str, str]] = []  # (verdict, label, detail)


def _chk(label: str, ok: bool, detail: str = ""):
    verdict = PASS if ok else FAIL
    sym = "✅" if ok else "❌"
    _results.append((verdict, label, detail))
    print(f"  {sym} {verdict}  {label}" + (f"\n         → {detail}" if detail else ""))
    return ok


def _skip(label: str, reason: str = ""):
    _results.append((SKIP, label, reason))
    print(f"  ⏭️  SKIP  {label}" + (f": {reason}" if reason else ""))


def _find_all(root: ET.Element, tag: str) -> list[ET.Element]:
    return root.findall(f".//{{{NS}}}{tag}")


def _ga(el: ET.Element | None, attr: str) -> str | None:
    if el is None:
        return None
    return el.get(attr)


def _text(el: ET.Element | None) -> str:
    if el is None:
        return ""
    return (el.text or "").strip()


# ── Sex mapping ──────────────────────────────────────────────────────────────

SEX_MAP = {"Male": "1", "Female": "2", "Unknown": "0", "male": "1", "female": "2"}

# ── Report type mapping ──────────────────────────────────────────────────────

REPORT_TYPE_MAP = {
    "Spontaneous": "1",
    "Study": "2",
    "Other": "3",
    "NotAvailable": "4",
    1: "1", 2: "2", 3: "3", 4: "4",
}

# ── Drug role mapping ────────────────────────────────────────────────────────

ROLE_MAP = {
    "Suspect": "suspect",
    "Concomitant": "concomitant",
    "Interacting": "interacting",
}

# Route of administration → EDQM/NCI code (mirrors xmlGeneratorService.getRouteCode)
ROUTE_CODE_MAP = {
    "Oral": "C38288",
    "Intravenous": "C38276",
    "Intramuscular": "C38273",
    "Subcutaneous": "C38299",
    "Topical": "C38304",
    "Inhalation": "C38216",
    "Transdermal": "C38305",
    "Rectal": "C38295",
    "Other": "C38290",
}


def run(json_path: str, xml_path: str) -> int:
    # ── Load files ───────────────────────────────────────────────────────────
    try:
        with open(json_path) as f:
            j = json.load(f)
    except Exception as e:
        print(f"ERROR: cannot read JSON {json_path}: {e}", file=sys.stderr)
        return 2

    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except Exception as e:
        print(f"ERROR: cannot parse XML {xml_path}: {e}", file=sys.stderr)
        return 2

    example_id = j.get("exampleId", Path(json_path).stem)
    print(f"\n{'='*60}")
    print(f"  assert_json_vs_xml: {example_id}")
    print(f"  JSON: {json_path}")
    print(f"  XML:  {xml_path}")
    print(f"{'='*60}")

    case     = j.get("case", {})
    patient  = j.get("patient", {})
    drugs    = j.get("drugs", [])
    reactions = j.get("reactions", [])
    ind_study = j.get("indStudy", {})

    # ── 1. Patient sex ───────────────────────────────────────────────────────
    print("\n[ Patient demographics ]")
    sex_json = patient.get("sex")
    if sex_json is not None:
        expected_code = SEX_MAP.get(sex_json, "?")
        gender_els = _find_all(root, "administrativeGenderCode")
        found_codes = [_ga(el, "code") for el in gender_els]
        _chk(
            f"patient.sex={sex_json!r} → administrativeGenderCode code={expected_code!r}",
            expected_code in found_codes,
            f"found codes: {found_codes}" if found_codes else "administrativeGenderCode not found"
        )
    else:
        _skip("patient.sex", "not in JSON")

    # ── 2. Patient race ──────────────────────────────────────────────────────
    race_code = patient.get("race")
    if race_code:
        # Find observation with C17049 (Race)
        race_obs = None
        for obs in _find_all(root, "observation"):
            code_el = obs.find(f"{{{NS}}}code")
            if _ga(code_el, "code") == "C17049":
                race_obs = obs
                break
        if race_obs is not None:
            val_el = race_obs.find(f"{{{NS}}}value")
            found = _ga(val_el, "code")
            _chk(
                f"patient.race → observation[C17049]/value code={race_code!r}",
                found == race_code,
                f"found {found!r}" if found else "value element not found"
            )
        else:
            _chk(
                f"patient.race → observation[C17049] present",
                False,
                "Race observation (C17049) not found in XML"
            )

    # ── 3. Patient ethnicity ─────────────────────────────────────────────────
    eth_code = patient.get("ethnicity")
    if eth_code:
        eth_obs = None
        for obs in _find_all(root, "observation"):
            code_el = obs.find(f"{{{NS}}}code")
            if _ga(code_el, "code") == "C16564":
                eth_obs = obs
                break
        if eth_obs is not None:
            val_el = eth_obs.find(f"{{{NS}}}value")
            found = _ga(val_el, "code")
            _chk(
                f"patient.ethnicity → observation[C16564]/value code={eth_code!r}",
                found == eth_code,
                f"found {found!r}" if found else "value element not found"
            )
        else:
            _chk(
                f"patient.ethnicity → observation[C16564] present",
                False,
                "Ethnicity observation (C16564) not found in XML"
            )

    # ── 4. Patient age ───────────────────────────────────────────────────────
    age_val = patient.get("ageValue")
    if age_val is not None:
        age_obs = None
        for obs in _find_all(root, "observation"):
            code_el = obs.find(f"{{{NS}}}code")
            if _ga(code_el, "code") == "C25150":
                age_obs = obs
                break
        if age_obs is not None:
            val_el = age_obs.find(f"{{{NS}}}value")
            found = _ga(val_el, "value")
            try:
                found_num = float(found) if found else None
            except ValueError:
                found_num = None
            _chk(
                f"patient.ageValue={age_val} → observation[C25150]/value/@value",
                found_num is not None and abs(found_num - float(age_val)) < 0.01,
                f"found {found!r}"
            )

    # ── 5. Patient weight ────────────────────────────────────────────────────
    weight_kg = patient.get("weightKg")
    if weight_kg is not None:
        wt_obs = None
        for obs in _find_all(root, "observation"):
            code_el = obs.find(f"{{{NS}}}code")
            if _ga(code_el, "code") == "C25208":
                wt_obs = obs
                break
        if wt_obs is not None:
            val_el = wt_obs.find(f"{{{NS}}}value")
            found = _ga(val_el, "value")
            try:
                found_num = float(found) if found else None
            except ValueError:
                found_num = None
            _chk(
                f"patient.weightKg={weight_kg} → observation[C25208]/value/@value",
                found_num is not None and abs(found_num - float(weight_kg)) < 0.01,
                f"found {found!r}"
            )

    # ── 5b. Autopsy (D.9.3) ─────────────────────────────────────────────────
    autopsy_val = patient.get("autopsyPerformed")
    if patient.get("death") and autopsy_val is not None:
        expected_bl = "true" if autopsy_val else "false"
        autopsy_obs = None
        for obs in _find_all(root, "observation"):
            code_el = obs.find(f"{{{NS}}}code")
            if _ga(code_el, "code") == "5" and _ga(code_el, "codeSystem") == "2.16.840.1.113883.3.989.2.1.1.19":
                autopsy_obs = obs
                break
        if autopsy_obs is not None:
            val_el = autopsy_obs.find(f"{{{NS}}}value")
            found_bl = _ga(val_el, "value")
            _chk(
                f"patient.autopsyPerformed={autopsy_val} → observation[code=5]/value/@value={expected_bl!r}",
                found_bl == expected_bl,
                f"found {found_bl!r}"
            )
        else:
            _chk("patient.autopsyPerformed → observation[code=5] present", False, "not found in XML")

    # ── 6. Reactions: MedDRA codes ───────────────────────────────────────────
    print("\n[ Reactions ]")
    # Collect all value codes with SNOMED/NCI codeSystem that look like MedDRA (8 digits)
    xml_codes_in_xml = set()
    for val_el in _find_all(root, "value"):
        code = _ga(val_el, "code")
        if code and re.match(r'^\d{8}$', code):
            xml_codes_in_xml.add(code)

    for i, rxn in enumerate(reactions):
        meddra = rxn.get("meddraCode")
        term   = rxn.get("term", f"reaction[{i}]")
        if meddra:
            _chk(
                f"reactions[{i}] ({term!r}) meddraCode={meddra!r} present in XML",
                meddra in xml_codes_in_xml,
                f"8-digit codes found: {sorted(xml_codes_in_xml)}"
            )

    # ── 7. Drugs: product names and roles ────────────────────────────────────
    print("\n[ Drugs ]")
    # Collect all name text nodes in the XML
    xml_names = set()
    for name_el in _find_all(root, "name"):
        t = _text(name_el)
        if t:
            xml_names.add(t)

    # Collect organizer code values (suspect/concomitant/interacting)
    xml_org_codes: set[str] = set()
    for org_el in _find_all(root, "organizer"):
        code_el = org_el.find(f"{{{NS}}}code")
        code = _ga(code_el, "code")
        if code:
            xml_org_codes.add(code.lower())

    # Collect routeCode codes, doseQuantity center values, and approval id extensions
    # from the XML for bulk lookup.
    xml_route_codes: set[str] = set()
    for rc in _find_all(root, "routeCode"):
        code = _ga(rc, "code")
        if code:
            xml_route_codes.add(code)

    xml_dose_values: set[str] = set()
    for ctr in _find_all(root, "center"):
        v = _ga(ctr, "value")
        if v:
            xml_dose_values.add(v)

    xml_approval_ids: set[str] = set()
    for approval in _find_all(root, "approval"):
        id_el = approval.find(f"{{{NS}}}id")
        ext = _ga(id_el, "extension")
        if ext:
            xml_approval_ids.add(ext)

    for i, drug in enumerate(drugs):
        name = drug.get("productName")
        role = drug.get("role")
        dose_val = drug.get("doseValue")
        dose_unit = drug.get("doseUnit")
        route = drug.get("route")
        auth_num = drug.get("authorizationNumber") or drug.get("indAuthorizationNumber")

        if name:
            _chk(
                f"drugs[{i}] productName={name!r} present in XML names",
                name in xml_names,
                f"names found: {sorted(xml_names)}"
            )
        if role:
            expected_role = ROLE_MAP.get(role, role.lower())
            _chk(
                f"drugs[{i}] role={role!r} (organizer code={expected_role!r}) present",
                expected_role in xml_org_codes,
                f"organizer codes found: {sorted(xml_org_codes)}"
            )
        if dose_val is not None:
            expected_dose = str(int(dose_val)) if float(dose_val) == int(dose_val) else str(dose_val)
            _chk(
                f"drugs[{i}] doseValue={dose_val} → doseQuantity/center/@value",
                expected_dose in xml_dose_values or str(dose_val) in xml_dose_values,
                f"center values found: {sorted(xml_dose_values)}"
            )
        if route:
            expected_rc = ROUTE_CODE_MAP.get(route, "C38290")
            _chk(
                f"drugs[{i}] route={route!r} → routeCode code={expected_rc!r}",
                expected_rc in xml_route_codes,
                f"routeCode codes found: {sorted(xml_route_codes)}"
            )
        if auth_num:
            _chk(
                f"drugs[{i}] authorizationNumber={auth_num!r} → approval/id/@extension",
                auth_num in xml_approval_ids,
                f"approval id extensions found: {sorted(xml_approval_ids)}"
            )

    # ── 8. ICH Report Type (C.1.3) ───────────────────────────────────────────
    print("\n[ Case metadata ]")
    report_type = case.get("reportType")
    if report_type:
        expected_rt = REPORT_TYPE_MAP.get(report_type, "?")
        # Find investigationCharacteristic with code=1 (ICH ReportType)
        ich_rt_obs = None
        for obs in _find_all(root, "investigationCharacteristic"):
            code_el = obs.find(f"{{{NS}}}code")
            if _ga(code_el, "code") == "1" and "989.2.1.1.23" in (_ga(code_el, "codeSystem") or ""):
                ich_rt_obs = obs
                break
        if ich_rt_obs is not None:
            val_el = ich_rt_obs.find(f"{{{NS}}}value")
            found = _ga(val_el, "code")
            _chk(
                f"case.reportType={report_type!r} → C.1.3 value code={expected_rt!r}",
                found == expected_rt,
                f"found code={found!r}"
            )
        else:
            _chk(
                f"case.reportType → C.1.3 investigationCharacteristic present",
                False,
                "ICH ReportType observation (code=1 on .1.1.23) not found"
            )

    # ── 9. Expedited flag ────────────────────────────────────────────────────
    expedited = case.get("expeditedReport")
    if expedited is not None:
        exp_str = "true" if expedited else "false"
        # Find localCriteriaForExpedited observationEvent (code=23) — Section 14 pattern
        found_exp = None
        for obs in _find_all(root, "observationEvent"):
            code_el = obs.find(f"{{{NS}}}code")
            if _ga(code_el, "code") == "23":
                val_el = obs.find(f"{{{NS}}}value")
                found_exp = _ga(val_el, "value")
                break
        _chk(
            f"case.expeditedReport={expedited} → localCriteriaForExpedited (code=23) BL value={exp_str!r}",
            found_exp == exp_str,
            f"found {found_exp!r}" if found_exp is not None else "observationEvent code=23 not found"
        )

    # ── 10. Combination product flag ─────────────────────────────────────────
    combo = case.get("combinationProduct")
    if combo is not None:
        combo_str = "true" if combo else "false"
        # C156384 may be in observationEvent or observation depending on generator version
        found_combo = None
        for tag in ("observationEvent", "observation"):
            for obs in _find_all(root, tag):
                code_el = obs.find(f"{{{NS}}}code")
                if _ga(code_el, "code") == "C156384":
                    val_el = obs.find(f"{{{NS}}}value")
                    found_combo = _ga(val_el, "value")
                    break
            if found_combo is not None:
                break
        _chk(
            f"case.combinationProduct={combo} → C156384 BL value={combo_str!r}",
            found_combo == combo_str,
            f"found {found_combo!r}" if found_combo else "C156384 observation not found"
        )

    # ── 11. IND routing: caseType=ind → receiver CDER_IND ───────────────────
    case_type = case.get("caseType")
    if case_type == "ind":
        # Find the message receiver (N.2.r.3 device id extension = CDER_IND*)
        found_rcvr = None
        for dev in _find_all(root, "device"):
            id_el = dev.find(f"{{{NS}}}id")
            ext = _ga(id_el, "extension")
            if ext and "CDER_IND" in ext:
                found_rcvr = ext
                break
        _chk(
            f"case.caseType=ind → message receiver contains CDER_IND",
            found_rcvr is not None,
            f"found receiver id extension: {found_rcvr!r}" if found_rcvr else "no CDER_IND receiver found"
        )
        # IND number from indStudy
        ind_num = ind_study.get("indNumber")
        if ind_num:
            xml_text = ET.tostring(root, encoding="unicode")
            _chk(
                f"indStudy.indNumber={ind_num!r} present somewhere in XML",
                ind_num in xml_text,
                "not found in XML text"
            )
    elif case_type is None and case.get("reportType") != "Study":
        # Postmarket: receiver should be CDER (not CDER_IND)
        found_cder = False
        for dev in _find_all(root, "device"):
            id_el = dev.find(f"{{{NS}}}id")
            ext = _ga(id_el, "extension")
            if ext == "CDER":
                found_cder = True
                break
        _chk(
            "postmarket receiver = CDER (not CDER_IND)",
            found_cder,
            "found CDER" if found_cder else "CDER device receiver not found in XML"
        )

    # ── Summary ──────────────────────────────────────────────────────────────
    passes = [r for r in _results if r[0] == PASS]
    fails  = [r for r in _results if r[0] == FAIL]
    skips  = [r for r in _results if r[0] == SKIP]

    print(f"\n{'='*60}")
    print(f"  RESULT: {len(passes)} ✅ PASS  |  {len(skips)} ⏭️ SKIP  |  {len(fails)} ❌ FAIL")
    if fails:
        print("\n  FAILURES:")
        for _, label, detail in fails:
            print(f"    ❌  {label}")
            if detail:
                print(f"        → {detail}")
    print(f"{'='*60}")

    return 1 if fails else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 assert_json_vs_xml.py <input.json> <generated.xml>", file=sys.stderr)
        sys.exit(2)
    sys.exit(run(sys.argv[1], sys.argv[2]))
