#!/usr/bin/env python3
"""
Build CASE-20260519-MEGA2_v1.xml from CASE-20260518-MEGA_v6.xml
using lxml for proper namespace-aware XML manipulation.
"""

import copy
import shutil
from lxml import etree

SRC = "/sessions/tender-vigilant-gates/mnt/faers/test/test_submission/package/CASE-20260518-MEGA_v6.xml"
OUT_PACKAGE  = "/sessions/tender-vigilant-gates/mnt/faers/test/test_submission/package/CASE-20260519-MEGA2_v1.xml"
OUT_FROM_APP = "/sessions/tender-vigilant-gates/mnt/faers/test/test_submission/from_app/CASE-20260519-MEGA2_v1.xml"
OUT_TEST_SUB = "/sessions/tender-vigilant-gates/mnt/test_submission/CASE-20260519-MEGA2_v1.xml"

NS  = "urn:hl7-org:v3"
XSI = "http://www.w3.org/2001/XMLSchema-instance"
NS_MAP = {"hl7": NS, "xsi": XSI}

def Q(tag):
    return f"{{{NS}}}{tag}"

def XQ(tag):
    return f"{{{XSI}}}{tag}"

def make_el(tag, attrib=None, text=None, ns=NS):
    el = etree.Element(f"{{{ns}}}{tag}", nsmap={None: ns, "xsi": XSI})
    if attrib:
        for k, v in attrib.items():
            el.set(k, v)
    if text is not None:
        el.text = text
    return el

def sub(parent, tag, attrib=None, text=None):
    el = etree.SubElement(parent, Q(tag))
    if attrib:
        for k, v in attrib.items():
            el.set(k, v)
    if text is not None:
        el.text = text
    return el

# ── Parse source ──────────────────────────────────────────────────────────────
parser = etree.XMLParser(remove_comments=False)
tree = etree.parse(SRC, parser)
root = tree.getroot()

# ── 1. Identity changes ────────────────────────────────────────────────────────

# Batch UUID (root id on MCCI)
mcci_id = root.find(Q("id"))
mcci_id.set("extension", "DeepQuenceTest-20260519-TCM04-b1174c31-82f9-5861-9b7d-4395b3ce9e18")

# MCCI creationTime
root.find(Q("creationTime")).set("value", "20260519000000-0500")

# PORR
porr = root.find(Q("PORR_IN049016UV"))
porr.find(Q("creationTime")).set("value", "20260519000000-0500")

cap = porr.find(f".//{Q('controlActProcess')}")
cap.find(Q("effectiveTime")).set("value", "20260519000000-0500")

inv = cap.find(f".//{Q('investigationEvent')}")

# SR safety report id (.3.1)
for id_el in inv.findall(Q("id")):
    root_oid = id_el.get("root", "")
    ext = id_el.get("extension", "")
    if root_oid == "2.16.840.1.113883.3.989.2.1.3.1":
        id_el.set("extension", "SR-CASE-20260519-MEGA2")
    elif root_oid == "2.16.840.1.113883.3.989.2.1.3.2":
        id_el.set("extension", "CASE-20260519-MEGA2")
    # version number (.3.4) stays "1"

# availabilityTime
avail = inv.find(Q("availabilityTime"))
if avail is not None:
    avail.set("value", "20260519000000-0500")

# Update the comment on line 3 (TC-M03 → TC-M04)
for child in root.iter():
    if not isinstance(child.tag, str):  # comment node
        if child.text and "TC-M03" in child.text:
            child.text = child.text.replace("TC-M03", "TC-M04")

print("✓ Identity changes applied")

# ── 2. D.4 Height — add after Weight observation ──────────────────────────────
# Find primaryRole classCode=INVSBJ
primary_role = next(
    e for e in root.iter(Q("primaryRole")) if e.get("classCode") == "INVSBJ"
)

# Find Weight subjectOf2 (C25208)
weight_subj = None
for subj in primary_role.findall(Q("subjectOf2")):
    obs = subj.find(Q("observation"))
    if obs is not None:
        code_el = obs.find(Q("code"))
        if code_el is not None and code_el.get("code") == "C25208":
            weight_subj = subj
            break

if weight_subj is None:
    raise RuntimeError("Could not find Weight (C25208) subjectOf2")

# Build height subjectOf2
height_subj = etree.Element(Q("subjectOf2"))
height_subj.set("typeCode", "SBJ")
height_obs = etree.SubElement(height_subj, Q("observation"))
height_obs.set("classCode", "OBS")
height_obs.set("moodCode", "EVN")
h_code = etree.SubElement(height_obs, Q("code"))
h_code.set("code", "17")
h_code.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.19")
h_code.set("displayName", "height")
h_val = etree.SubElement(height_obs, Q("value"))
h_val.set(XQ("type"), "PQ")
h_val.set("value", "178")
h_val.set("unit", "cm")

# Insert AFTER weight_subj
weight_idx = list(primary_role).index(weight_subj)
primary_role.insert(weight_idx + 1, height_subj)
print("✓ D.4 Height added")

# ── 3. D.7.1.r.5 Comments on Hypertension history observation ────────────────
# Find the Hypertension observation (code 10020772 in medical history organizer)
htn_obs = None
for org in primary_role.findall(Q("subjectOf2")):
    org_el = org.find(Q("organizer"))
    if org_el is not None:
        code_el = org_el.find(Q("code"))
        if code_el is not None and code_el.get("code") == "1" and \
           code_el.get("codeSystem") == "2.16.840.1.113883.3.989.2.1.1.20":
            # This is the medical history organizer
            for comp in org_el.findall(Q("component")):
                obs = comp.find(Q("observation"))
                if obs is not None:
                    c = obs.find(Q("code"))
                    if c is not None and c.get("code") == "10020772":
                        htn_obs = obs
                        break

if htn_obs is None:
    raise RuntimeError("Could not find Hypertension (10020772) observation")

# Add D.7.1.r.5 comment outboundRelationship2 after inboundRelationship
comment_or2 = etree.SubElement(htn_obs, Q("outboundRelationship2"))
comment_or2.set("typeCode", "PERT")
comment_inner = etree.SubElement(comment_or2, Q("observation"))
comment_inner.set("classCode", "OBS")
comment_inner.set("moodCode", "EVN")
c_code = etree.SubElement(comment_inner, Q("code"))
c_code.set("code", "10")
c_code.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.19")
c_code.set("displayName", "comment")
c_val = etree.SubElement(comment_inner, Q("value"))
c_val.set(XQ("type"), "ED")
c_val.text = "Well-controlled on Lisinopril 10mg daily."
print("✓ D.7.1.r.5 comment on Hypertension added")

# ── 4. E.i.9 Country where reaction occurred — both reactions ─────────────────
# Reactions: observations with code=29 + codeSystem .3.989.2.1.1.19 + effectiveTime
reactions = [
    o for o in primary_role.iter(Q("observation"))
    if (o.find(Q("code")) is not None and
        o.find(Q("code")).get("code") == "29" and
        o.find(Q("code")).get("codeSystem") == "2.16.840.1.113883.3.989.2.1.1.19" and
        o.find(Q("effectiveTime")) is not None)
]

print(f"  Found {len(reactions)} reaction observations")

def make_location_el():
    """Build E.i.9 location element."""
    loc = etree.Element(Q("location"))
    loc.set("typeCode", "LOC")
    loce = etree.SubElement(loc, Q("locatedEntity"))
    loce.set("classCode", "LOCE")
    locp = etree.SubElement(loce, Q("locatedPlace"))
    locp.set("classCode", "COUNTRY")
    locp.set("determinerCode", "INSTANCE")
    lcode = etree.SubElement(locp, Q("code"))
    lcode.set("code", "US")
    lcode.set("codeSystem", "1.0.3166.1.2.2")
    return loc

for rxn in reactions:
    children = list(rxn)
    # Find position of value element to insert location after it
    val_idx = next((i for i, c in enumerate(children) if c.tag == Q("value")), None)
    if val_idx is not None:
        rxn.insert(val_idx + 1, make_location_el())
    else:
        # insert before first outboundRelationship2
        or2_idx = next((i for i, c in enumerate(children) if c.tag == Q("outboundRelationship2")), len(children))
        rxn.insert(or2_idx, make_location_el())

print("✓ E.i.9 Country (US) added to both reactions")

# ── 5. E.i.1.2 Reaction verbatim for translation — Reaction 1 (Nausea) ────────
# Reaction 1 = Nausea (value code 10028813)
rxn1 = next(
    o for o in reactions
    if o.find(Q("value")) is not None and o.find(Q("value")).get("code") == "10028813"
)

# Build the verbatim outboundRelationship2
verbatim_or2 = etree.Element(Q("outboundRelationship2"))
verbatim_or2.set("typeCode", "PERT")
verbatim_inner = etree.SubElement(verbatim_or2, Q("observation"))
verbatim_inner.set("classCode", "OBS")
verbatim_inner.set("moodCode", "EVN")
v_code = etree.SubElement(verbatim_inner, Q("code"))
v_code.set("code", "30")
v_code.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.19")
v_code.set("displayName", "reactionForTranslation")
v_val = etree.SubElement(verbatim_inner, Q("value"))
v_val.set(XQ("type"), "ED")
v_val.text = "Nausea and vomiting as reported"

# Insert as first outboundRelationship2 in rxn1 (after location if present)
children_rxn1 = list(rxn1)
first_or2_idx = next(
    (i for i, c in enumerate(children_rxn1) if c.tag == Q("outboundRelationship2")),
    len(children_rxn1)
)
rxn1.insert(first_or2_idx, verbatim_or2)
print("✓ E.i.1.2 Reaction verbatim for translation added to Reaction 1")

# ── 6. Lab test additions ──────────────────────────────────────────────────────
# Find the testResults organizer (code=3)
test_org = None
for subj in primary_role.findall(Q("subjectOf2")):
    org = subj.find(Q("organizer"))
    if org is not None:
        c = org.find(Q("code"))
        if c is not None and c.get("code") == "3" and \
           c.get("codeSystem") == "2.16.840.1.113883.3.989.2.1.1.20":
            test_org = org
            break

if test_org is None:
    raise RuntimeError("Could not find testResults organizer (code=3)")

# Get the 3 existing lab test observations
lab_components = test_org.findall(Q("component"))
print(f"  Found {len(lab_components)} existing lab components")

# Map: code -> component
alt_comp = next(c for c in lab_components
                if c.find(f"{Q('observation')}/{Q('code')}") is not None and
                c.find(f"{Q('observation')}/{Q('code')}").get("code") == "10001551")
ast_comp = next(c for c in lab_components
                if c.find(f"{Q('observation')}/{Q('code')}") is not None and
                c.find(f"{Q('observation')}/{Q('code')}").get("code") == "10003481")
bili_comp = next(c for c in lab_components
                 if c.find(f"{Q('observation')}/{Q('code')}") is not None and
                 c.find(f"{Q('observation')}/{Q('code')}").get("code") == "10005364")

# F.r.2.1: Add originalText to each lab test code
alt_obs = alt_comp.find(Q("observation"))
alt_code = alt_obs.find(Q("code"))
alt_orig = etree.SubElement(alt_code, Q("originalText"))
alt_orig.text = "ALT (Alanine Aminotransferase)"

ast_obs = ast_comp.find(Q("observation"))
ast_code = ast_obs.find(Q("code"))
ast_orig = etree.SubElement(ast_code, Q("originalText"))
ast_orig.text = "AST (Aspartate Aminotransferase)"

bili_obs = bili_comp.find(Q("observation"))
bili_code = bili_obs.find(Q("code"))
bili_orig = etree.SubElement(bili_code, Q("originalText"))
bili_orig.text = "Total Bilirubin"

print("✓ F.r.2.1 free text test names added to all 3 lab tests")

# F.r.6 Comments on ALT test
alt_comment_or2 = etree.SubElement(alt_obs, Q("outboundRelationship2"))
alt_comment_or2.set("typeCode", "PERT")
alt_comment_inner = etree.SubElement(alt_comment_or2, Q("observation"))
alt_comment_inner.set("classCode", "OBS")
alt_comment_inner.set("moodCode", "EVN")
alt_c_code = etree.SubElement(alt_comment_inner, Q("code"))
alt_c_code.set("code", "10")
alt_c_code.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.19")
alt_c_code.set("displayName", "comment")
alt_c_val = etree.SubElement(alt_comment_inner, Q("value"))
alt_c_val.set(XQ("type"), "ED")
alt_c_val.text = "Result markedly elevated; repeat testing confirmed on 2026-03-10."
print("✓ F.r.6 Comment on ALT test added")

# F.r.7 More Information Available on ALT test
alt_more_or2 = etree.SubElement(alt_obs, Q("outboundRelationship2"))
alt_more_or2.set("typeCode", "REFR")
alt_more_inner = etree.SubElement(alt_more_or2, Q("observation"))
alt_more_inner.set("classCode", "OBS")
alt_more_inner.set("moodCode", "EVN")
alt_m_code = etree.SubElement(alt_more_inner, Q("code"))
alt_m_code.set("code", "25")
alt_m_code.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.19")
alt_m_code.set("displayName", "moreInformationAvailable")
alt_m_val = etree.SubElement(alt_more_inner, Q("value"))
alt_m_val.set(XQ("type"), "BL")
alt_m_val.set("value", "true")
print("✓ F.r.7 More Information Available on ALT test added")

# 4th qualitative lab test (HIV screening)
hiv_comp = etree.SubElement(test_org, Q("component"))
hiv_comp.set("typeCode", "COMP")
hiv_obs = etree.SubElement(hiv_comp, Q("observation"))
hiv_obs.set("classCode", "OBS")
hiv_obs.set("moodCode", "EVN")
hiv_code = etree.SubElement(hiv_obs, Q("code"))
hiv_code.set("code", "10019836")
hiv_code.set("codeSystem", "2.16.840.1.113883.6.163")
hiv_code.set("codeSystemVersion", "25.0")
hiv_code.set("displayName", "HIV test negative")
hiv_orig = etree.SubElement(hiv_code, Q("originalText"))
hiv_orig.text = "HIV-1/2 Antibody Screen"
hiv_eff = etree.SubElement(hiv_obs, Q("effectiveTime"))
hiv_eff.set("value", "20260308")
hiv_interp = etree.SubElement(hiv_obs, Q("interpretationCode"))
hiv_interp.set("code", "2")
hiv_interp.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.12")
hiv_interp.set("displayName", "Negative")
print("✓ 4th lab test (HIV screening, qualitative negative) added")

# ── 7. Product data — Testdrugimab ────────────────────────────────────────────
# Find Testdrugimab suspect substanceAdministration (the main SA, code="suspect")
testdrug_subj = None
for subj in primary_role.findall(Q("subjectOf2")):
    org = subj.find(Q("organizer"))
    if org is not None:
        c = org.find(Q("code"))
        if c is not None and c.get("code") == "suspect":
            # check it's Testdrugimab by looking at kindOfProduct/name
            name_el = org.find(f".//{Q('kindOfProduct')}/{Q('name')}")
            if name_el is not None and "Testdrugimab" in (name_el.text or ""):
                testdrug_subj = subj
                break

if testdrug_subj is None:
    raise RuntimeError("Could not find Testdrugimab suspect subjectOf2")

testdrug_org = testdrug_subj.find(Q("organizer"))
testdrug_sa = testdrug_org.find(f"{Q('component')}/{Q('substanceAdministration')}")

# G.k.2.4 Country where drug obtained — add performer to dosing sub-SA
dosing_or2 = testdrug_sa.find(f"{Q('outboundRelationship2')}[@typeCode='COMP']/{Q('substanceAdministration')}")
if dosing_or2 is None:
    # Try finding it differently
    for or2 in testdrug_sa.findall(Q("outboundRelationship2")):
        if or2.get("typeCode") == "COMP":
            inner_sa = or2.find(Q("substanceAdministration"))
            if inner_sa is not None and inner_sa.find(Q("effectiveTime")) is not None:
                dosing_or2 = inner_sa
                break

if dosing_or2 is None:
    raise RuntimeError("Could not find Testdrugimab dosing sub-SA")

# Add performer after doseQuantity
dose_qty = dosing_or2.find(Q("doseQuantity"))
if dose_qty is None:
    raise RuntimeError("doseQuantity not found in dosing sub-SA")
dose_idx = list(dosing_or2).index(dose_qty)

performer_el = etree.Element(Q("performer"))
performer_el.set("typeCode", "PRF")
assigned_entity = etree.SubElement(performer_el, Q("assignedEntity"))
assigned_entity.set("classCode", "ASSIGNED")
repr_org = etree.SubElement(assigned_entity, Q("representedOrganization"))
repr_org.set("classCode", "ORG")
repr_org.set("determinerCode", "INSTANCE")
addr_el = etree.SubElement(repr_org, Q("addr"))
country_el = etree.SubElement(addr_el, Q("country"))
country_el.text = "US"
dosing_or2.insert(dose_idx + 1, performer_el)
print("✓ G.k.2.4 Country where drug obtained added to Testdrugimab dosing sub-SA")

# G.k.4.r.6a/6b Duration — add third COMP to SXPR_TS
sxpr_ts = dosing_or2.find(Q("effectiveTime"))
if sxpr_ts is None or sxpr_ts.get(XQ("type")) != "SXPR_TS":
    raise RuntimeError("SXPR_TS not found in dosing sub-SA effectiveTime")

duration_comp = etree.SubElement(sxpr_ts, Q("comp"))
duration_comp.set(XQ("type"), "IVL_TS")
width_el = etree.SubElement(duration_comp, Q("width"))
width_el.set("value", "55")
width_el.set("unit", "d")
print("✓ G.k.4.r.6a/6b Duration (55 days) added to Testdrugimab SXPR_TS")

# G.k.10.r Additional Information (coded) — Off-label use
# Find G.k.5 cumulative dose observation (typeCode=SUMM)
gk5_or2 = next(
    (or2 for or2 in testdrug_sa.findall(Q("outboundRelationship2"))
     if or2.get("typeCode") == "SUMM"),
    None
)
if gk5_or2 is None:
    raise RuntimeError("Could not find G.k.5 cumulative dose observation (typeCode=SUMM)")

gk5_idx = list(testdrug_sa).index(gk5_or2)

# G.k.10.r
gk10_or2 = etree.Element(Q("outboundRelationship2"))
gk10_or2.set("typeCode", "REFR")
gk10_inner = etree.SubElement(gk10_or2, Q("observation"))
gk10_inner.set("classCode", "OBS")
gk10_inner.set("moodCode", "EVN")
gk10_code = etree.SubElement(gk10_inner, Q("code"))
gk10_code.set("code", "9")
gk10_code.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.19")
gk10_code.set("displayName", "codedDrugInformation")
gk10_val = etree.SubElement(gk10_inner, Q("value"))
gk10_val.set(XQ("type"), "CE")
gk10_val.set("code", "11")
gk10_val.set("displayName", "Off label use")
gk10_val.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.17")
testdrug_sa.insert(gk5_idx + 1, gk10_or2)
print("✓ G.k.10.r Additional Information on Drug (coded) added — Off-label use")

# G.k.11 Additional Information on Drug (free text)
gk11_or2 = etree.Element(Q("outboundRelationship2"))
gk11_or2.set("typeCode", "REFR")
gk11_inner = etree.SubElement(gk11_or2, Q("observation"))
gk11_inner.set("classCode", "OBS")
gk11_inner.set("moodCode", "EVN")
gk11_code = etree.SubElement(gk11_inner, Q("code"))
gk11_code.set("code", "2")
gk11_code.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.19")
gk11_code.set("displayName", "additionalInformation")
gk11_val = etree.SubElement(gk11_inner, Q("value"))
gk11_val.set(XQ("type"), "ST")
gk11_val.text = ("Testdrugimab was prescribed for rheumatoid arthritis under compassionate use protocol; "
                 "NDA approval was for moderate-to-severe plaque psoriasis.")
# Insert after G.k.10.r
gk10_idx = list(testdrug_sa).index(gk10_or2)
testdrug_sa.insert(gk10_idx + 1, gk11_or2)
print("✓ G.k.11 Additional Information on Drug (free text) added")

# ── 8. Methotrexate improvements ──────────────────────────────────────────────
# Find Methotrexate suspect substanceAdministration
mtx_subj = None
for subj in primary_role.findall(Q("subjectOf2")):
    org = subj.find(Q("organizer"))
    if org is not None:
        c = org.find(Q("code"))
        if c is not None and c.get("code") == "suspect":
            name_el = org.find(f".//{Q('kindOfProduct')}/{Q('name')}")
            if name_el is not None and name_el.text == "Methotrexate":
                mtx_subj = subj
                break

if mtx_subj is None:
    raise RuntimeError("Could not find Methotrexate suspect subjectOf2")

mtx_org = mtx_subj.find(Q("organizer"))
mtx_sa = mtx_org.find(f"{Q('component')}/{Q('substanceAdministration')}")

# Add routeCode and doseQuantity before consumable
consumable = mtx_sa.find(Q("consumable"))
if consumable is None:
    raise RuntimeError("consumable not found in Methotrexate SA")
consumable_idx = list(mtx_sa).index(consumable)

route_el = etree.Element(Q("routeCode"))
route_el.set("code", "C38288")
route_el.set("displayName", "Oral")
route_el.set("codeSystem", "0.4.0.127.0.16.1.1.2.6")
route_el.set("codeSystemVersion", "2014.10.30")
route_orig = etree.SubElement(route_el, Q("originalText"))
route_orig.text = "Oral tablet"

dose_el = etree.Element(Q("doseQuantity"))
dose_el.set("value", "15")
dose_el.set("unit", "mg")

mtx_sa.insert(consumable_idx, dose_el)
mtx_sa.insert(consumable_idx, route_el)
print("✓ Methotrexate routeCode (Oral) and doseQuantity (15mg) added")

# Add lot number to Methotrexate instanceOfKind
mtx_iok = mtx_sa.find(f"{Q('consumable')}/{Q('instanceOfKind')}")
if mtx_iok is None:
    raise RuntimeError("instanceOfKind not found in Methotrexate consumable")

# Insert productInstanceInstance before kindOfProduct
mtx_kop = mtx_iok.find(Q("kindOfProduct"))
if mtx_kop is None:
    raise RuntimeError("kindOfProduct not found in Methotrexate instanceOfKind")
kop_idx = list(mtx_iok).index(mtx_kop)

mtx_pii = etree.Element(Q("productInstanceInstance"))
mtx_pii.set("classCode", "MMAT")
mtx_pii.set("determinerCode", "INSTANCE")
mtx_lot = etree.SubElement(mtx_pii, Q("lotNumberText"))
mtx_lot.text = "MTX-2025-0892"
mtx_iok.insert(kop_idx, mtx_pii)
print("✓ Methotrexate lot number added (G.k.4.r.8)")

# Add ingredient to Methotrexate kindOfProduct (G.k.2.3.r)
mtx_ingr = etree.SubElement(mtx_kop, Q("ingredient"))
mtx_ingr.set("classCode", "ACTI")
mtx_qty = etree.SubElement(mtx_ingr, Q("quantity"))
mtx_num = etree.SubElement(mtx_qty, Q("numerator"))
mtx_num.set("value", "15")
mtx_num.set("unit", "mg")
mtx_den = etree.SubElement(mtx_qty, Q("denominator"))
mtx_den.set("value", "1")
mtx_den.set("unit", "1")
mtx_is = etree.SubElement(mtx_ingr, Q("ingredientSubstance"))
mtx_is.set("classCode", "MMAT")
mtx_is.set("determinerCode", "KIND")
mtx_is_code = etree.SubElement(mtx_is, Q("code"))
mtx_is_code.set("code", "YL5FZ2Y5U1")
mtx_is_code.set("codeSystem", "2.16.840.1.113883.4.9")
mtx_is_name = etree.SubElement(mtx_is, Q("name"))
mtx_is_name.text = "Methotrexate"
print("✓ Methotrexate ingredient/substance (G.k.2.3.r) added")

# ── 9. Device data ─────────────────────────────────────────────────────────────

# C.1.12 Combination Product = true  (change from false to true)
# Find observationEvent with code C156384
combo_obs = next(
    (e for e in root.iter(Q("observationEvent"))
     if e.find(Q("code")) is not None and
     e.find(Q("code")).get("code") == "C156384"),
    None
)
if combo_obs is None:
    raise RuntimeError("Could not find C156384 Combination Product observationEvent")
combo_val = combo_obs.find(Q("value"))
combo_val.set("value", "true")
print("✓ C.1.12 Combination Product changed to true")

# Add 4th G.k product entry for device (Testdevice Auto-Injector) as concomitant
# Insert after Lisinopril subjectOf2 (3rd drug), before H.3.r sender diagnosis
# Find Lisinopril concomitant subjectOf2
lisi_subj = None
for subj in primary_role.findall(Q("subjectOf2")):
    org = subj.find(Q("organizer"))
    if org is not None:
        c = org.find(Q("code"))
        if c is not None and c.get("code") == "concomitant":
            name_el = org.find(f".//{Q('kindOfProduct')}/{Q('name')}")
            if name_el is not None and name_el.text == "Lisinopril":
                lisi_subj = subj
                break

if lisi_subj is None:
    raise RuntimeError("Could not find Lisinopril concomitant subjectOf2")

lisi_idx = list(primary_role).index(lisi_subj)

# Build device subjectOf2
dev_subj = etree.Element(Q("subjectOf2"))
dev_subj.set("typeCode", "SBJ")
dev_org = etree.SubElement(dev_subj, Q("organizer"))
dev_org.set("classCode", "CATEGORY")
dev_org.set("moodCode", "EVN")
dev_org_code = etree.SubElement(dev_org, Q("code"))
dev_org_code.set("code", "concomitant")
dev_org_code.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.13")

dev_comp = etree.SubElement(dev_org, Q("component"))
dev_comp.set("typeCode", "COMP")
dev_sa = etree.SubElement(dev_comp, Q("substanceAdministration"))
dev_sa.set("classCode", "SBADM")
dev_sa.set("moodCode", "EVN")

dev_eff = etree.SubElement(dev_sa, Q("effectiveTime"))
dev_eff.set(XQ("type"), "IVL_TS")
dev_low = etree.SubElement(dev_eff, Q("low"))
dev_low.set("value", "20260115")
dev_high = etree.SubElement(dev_eff, Q("high"))
dev_high.set("value", "20260310")

dev_consumable = etree.SubElement(dev_sa, Q("consumable"))
dev_consumable.set("typeCode", "CSM")
dev_iok = etree.SubElement(dev_consumable, Q("instanceOfKind"))
dev_iok.set("classCode", "INST")

dev_pii = etree.SubElement(dev_iok, Q("productInstanceInstance"))
dev_pii.set("classCode", "MMAT")
dev_pii.set("determinerCode", "INSTANCE")
dev_lot = etree.SubElement(dev_pii, Q("lotNumberText"))
dev_lot.text = "DEVICE-LOT-2025-0084"

dev_kop = etree.SubElement(dev_iok, Q("kindOfProduct"))
dev_kop.set("classCode", "MMAT")
dev_kop.set("determinerCode", "KIND")
dev_name = etree.SubElement(dev_kop, Q("name"))
dev_name.text = "Testdevice Auto-Injector"
dev_form = etree.SubElement(dev_kop, Q("formCode"))
dev_form.set("code", "C42988")
dev_form.set("displayName", "Device")
dev_form.set("codeSystem", "0.4.0.127.0.16.1.1.2.1")
dev_form.set("codeSystemVersion", "2014.10.30")
dev_form_orig = etree.SubElement(dev_form, Q("originalText"))
dev_form_orig.text = "Auto-injector delivery device"

dev_action_or2 = etree.SubElement(dev_sa, Q("outboundRelationship2"))
dev_action_or2.set("typeCode", "COMP")
dev_action_obs = etree.SubElement(dev_action_or2, Q("observation"))
dev_action_obs.set("classCode", "OBS")
dev_action_obs.set("moodCode", "EVN")
dev_action_code = etree.SubElement(dev_action_obs, Q("code"))
dev_action_code.set("code", "C41341")
dev_action_code.set("codeSystem", "2.16.840.1.113883.3.26.1.1")
dev_action_code.set("displayName", "Action Taken")
dev_action_val = etree.SubElement(dev_action_obs, Q("value"))
dev_action_val.set(XQ("type"), "CE")
dev_action_val.set("code", "1")
dev_action_val.set("codeSystem", "2.16.840.1.113883.3.989.2.1.1.15")

# Insert after Lisinopril
primary_role.insert(lisi_idx + 1, dev_subj)
print("✓ G.k Device (Testdevice Auto-Injector) added as 4th product entry")

# ── 10. Update TC comment ──────────────────────────────────────────────────────
# Update narrative text to reflect new case ID
text_el = inv.find(Q("text"))
if text_el is not None and text_el.text:
    text_el.text = text_el.text  # keep as-is (narrative stays the same patient)

# ── 11. Serialize ─────────────────────────────────────────────────────────────
# Use etree.tostring with xml_declaration
xml_bytes = etree.tostring(
    root,
    xml_declaration=True,
    encoding="UTF-8",
    pretty_print=True
)
xml_str = xml_bytes.decode("utf-8")

with open(OUT_PACKAGE, "w", encoding="utf-8") as f:
    f.write(xml_str)

shutil.copy2(OUT_PACKAGE, OUT_FROM_APP)
shutil.copy2(OUT_PACKAGE, OUT_TEST_SUB)

print(f"\n✓ Written to {OUT_PACKAGE}")
print(f"✓ Copied to  {OUT_FROM_APP}")
print(f"✓ Copied to  {OUT_TEST_SUB}")
