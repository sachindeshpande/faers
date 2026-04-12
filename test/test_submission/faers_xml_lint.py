#!/usr/bin/env python3
"""
FAERS / AERS USP E2B(R3) XML Lint + Golden Checklist
DeepQuence — updated through v37

Usage:  python3 faers_xml_lint.py path/to/CASE-XXXXX.xml
Exit:   0 = all pass/warn   |   1 = one or more FAIL

CRITICAL SCHEMA FINDING (v36 ACK ci260410182936):
  CDER PORR schema does NOT allow <author> as a direct child of
  <investigationEvent>. Valid content elements are ONLY:
    reference, component, outboundRelationship, subjectOf1, subjectOf2
  v35/v36 attempted to place author as direct child (based on JC5H);
  both produced SAX parse exceptions. JC5H uses a different schema.

v37 CORRECT PATTERN — confirmed by v29–v32 schema-valid ACKs:
  Reporter block: subjectOf1/controlActEvent/author[@typeCode="AUT"]
  OID .3.989.2.1.1.7 = sender type value set
  (FDA 2.18 engine reads C.3 from this OID in this container)

C.3.2 ROOT CAUSE (v29 vs v30 evidence):
  v29 (C.3.2 PASS): nested representedOrganization + asLocatedEntity in assignedPerson
  v30 (C.3.2 FAIL): flat org, no asLocatedEntity
  v37 restores both v29 structural elements.

Field mappings:
  C.3.1  = assignedEntity/code[@codeSystem=".1.7"]/@code
  C.3.2  = assignedEntity/assignedPerson/name/given
  C.3.3.2 = assignedPerson/name/prefix
  C.3.3.3 = assignedPerson/name/given  (same element as C.3.2)
  C.3.3.1 = assignedPerson/name/family
  C.3.3.5 = assignedEntity/representedOrganization/name
  C.3.4.6 = assignedEntity/addr/country
  C.3.4.7 = assignedEntity/telecom[starts-with(@value,'tel:')]
  C.3.4.8 = assignedEntity/telecom[starts-with(@value,'fax:')]
"""
import sys, re
import xml.etree.ElementTree as ET
from pathlib import Path

NS  = "urn:hl7-org:v3"
XSI = "http://www.w3.org/2001/XMLSchema-instance"
NSD = {"hl7": NS}

def Q(tag):       return f"{{{NS}}}{tag}"
def qn(el, tag):  return el.find(f"hl7:{tag}", NSD) if el is not None else None
def qna(el, tag): return el.findall(f"hl7:{tag}", NSD) if el is not None else []
def ga(el, attr): return el.get(attr) if el is not None else None

_results = []
PASS, FAIL, WARN = "PASS", "FAIL", "WARN"

def chk(label, ok, detail=""):
    tag, sym = (PASS,"✅") if ok else (FAIL,"❌")
    _results.append((tag, label, detail))
    print(f"  {sym} {tag}  {label}" + (f"\n         → {detail}" if detail else ""))
    return ok

def warn(label, detail=""):
    _results.append((WARN, label, detail))
    print(f"  ⚠️  WARN  {label}" + (f"\n         → {detail}" if detail else ""))

def info(label, val=""):
    print(f"  ℹ️  INFO  {label}" + (f": {val}" if val else ""))


def run(xml_path):
    global _results
    _results = []
    path = Path(xml_path)
    print(f"\n{'='*72}")
    print(f"  FAERS XML LINT — {path.name}")
    print(f"{'='*72}\n")

    # ── 0. Well-formedness ──────────────────────────────────────────────────
    print("[ SECTION 0: Well-formedness ]")
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        chk("XML is well-formed", True)
    except ET.ParseError as e:
        chk("XML is well-formed", False, str(e))
        print("\n  Cannot continue.\n")
        return False
    raw = path.read_text(encoding="utf-8")

    # ── 1. Root element + schemaLocation ────────────────────────────────────
    print("\n[ SECTION 1: Root element and schemaLocation ]")
    chk("Root is MCCI_IN200100UV01", root.tag == Q("MCCI_IN200100UV01"), f"got {root.tag}")
    sl = root.get(f"{{{XSI}}}schemaLocation", "")
    chk("schemaLocation: no external URL",       "http" not in sl, f"{sl!r}")
    chk("schemaLocation: no CVM schema reference","cvm"  not in sl.lower(), f"{sl!r}")

    # ── 2. MCCI wrapper child order ─────────────────────────────────────────
    print("\n[ SECTION 2: MCCI wrapper child order ]")
    children = [c.tag.replace(f"{{{NS}}}", "") for c in root]
    EXP = ["id","creationTime","responseModeCode","interactionId",
           "name","PORR_IN049016UV","receiver","sender"]
    def ordered(seq, exp):
        idxs = [seq.index(e) if e in seq else -1 for e in exp]
        return all(idxs[i] <= idxs[i+1] or idxs[i+1]==-1 for i in range(len(idxs)-1))
    chk("Child order: id→creationTime→responseModeCode→interactionId→name→PORR→receiver→sender",
        ordered(children, EXP), f"actual: {children}")
    pi = children.index("PORR_IN049016UV") if "PORR_IN049016UV" in children else -1
    ri = children.index("receiver")        if "receiver"        in children else -1
    si = children.index("sender")          if "sender"          in children else -1
    chk("Wrapper receiver+sender AFTER PORR_IN049016UV",
        pi!=-1 and ri>pi and si>pi, f"PORR@{pi} rcv@{ri} snd@{si}")
    ii = children.index("id")           if "id"           in children else -1
    ci = children.index("creationTime") if "creationTime" in children else -1
    chk("Single wrapper <id> before <creationTime>", ii!=-1 and ci!=-1 and ii<ci)

    # ── 3. Batch UUID ────────────────────────────────────────────────────────
    print("\n[ SECTION 3: Batch UUID ]")
    mcci_id  = qn(root, "id")
    uuid_val = ga(mcci_id, "extension")
    chk("Batch UUID extension is non-empty", bool(uuid_val), f"extension={uuid_val!r}")
    info("Batch UUID (must be unique per submission)", uuid_val or "(empty)")

    # ── 4. Wrapper <name> ────────────────────────────────────────────────────
    print("\n[ SECTION 4: Wrapper <name> ]")
    wname = qn(root, "name")
    chk("Wrapper <name> displayName='ichicsr'",
        ga(wname,"displayName")=="ichicsr", f"got {ga(wname,'displayName')!r}")

    # ── 5. Wrapper receiver / sender ─────────────────────────────────────────
    print("\n[ SECTION 5: Wrapper receiver / sender ]")
    w_rcv_ids = [(ga(i,"root"),ga(i,"extension"))
                 for r in qna(root,"receiver")
                 for d in qna(r,"device") for i in qna(d,"id")]
    chk("Wrapper receiver = ZZFDATST (TEST routing)",
        any(e=="ZZFDATST" for _,e in w_rcv_ids), f"found: {w_rcv_ids}")
    w_snd_ids = [(ga(i,"root"),ga(i,"extension"))
                 for s in qna(root,"sender")
                 for d in qna(s,"device") for i in qna(d,"id")]
    chk("Wrapper sender contains DUNS 334818134",
        any(e=="334818134" for _,e in w_snd_ids), f"found: {w_snd_ids}")

    # ── 6. PORR ──────────────────────────────────────────────────────────────
    print("\n[ SECTION 6: PORR_IN049016UV ]")
    porr = qn(root, "PORR_IN049016UV")
    if not chk("PORR_IN049016UV present", porr is not None):
        warn("Skipping PORR sub-checks")
    else:
        pmc = qn(porr, "processingModeCode")
        chk("PORR processingModeCode='I'", ga(pmc,"code")=="I", f"code={ga(pmc,'code')!r}")
        RECV_OID = "2.16.840.1.113883.3.989.2.1.3.12"
        p_rcv = [(ga(i,"root"),ga(i,"extension"))
                 for r in qna(porr,"receiver")
                 for d in qna(r,"device") for i in qna(d,"id")]
        chk("PORR receiver: single id extension='CDER'",
            len(p_rcv)==1 and p_rcv[0][1]=="CDER", f"found: {p_rcv}")
        p_snd = [(ga(i,"root"),ga(i,"extension"))
                 for s in qna(porr,"sender")
                 for d in qna(s,"device") for i in qna(d,"id")]
        bad = [(r,e) for r,e in p_snd if r==RECV_OID]
        chk("PORR sender does NOT use receiver OID (.3.12)", len(bad)==0,
            f"bad ids: {bad}" if bad else "")

    # ── 7. investigationEvent ordering ──────────────────────────────────────
    print("\n[ SECTION 7: investigationEvent ordering ]")
    inv = root.find(f".//{Q('investigationEvent')}")
    if inv is None:
        warn("investigationEvent not found — skipping")
    else:
        ic = [c.tag.replace(f"{{{NS}}}","") for c in inv]
        # v37: 'author' is NOT a header element — CDER PORR schema forbids it as
        # a direct child of investigationEvent (confirmed by v36 SAX exception).
        # Header = id, code, text, statusCode, effectiveTime, availabilityTime only.
        pfx_tags  = {"id","code","text","statusCode","effectiveTime","availabilityTime"}
        cnt_tags  = {"component","outboundRelationship","subjectOf1","subjectOf2","reference"}
        pfx_end   = max((i for i,t in enumerate(ic) if t in pfx_tags),  default=-1)
        cnt_start = min((i for i,t in enumerate(ic) if t in cnt_tags), default=999)
        chk("Header elements precede content elements in investigationEvent",
            pfx_end < cnt_start or cnt_start==999,
            f"last-header@{pfx_end} first-content@{cnt_start}")

        # CRITICAL (v36 lesson): <author> must NOT be a direct child of investigationEvent
        # CDER PORR schema only allows: reference, component, outboundRelationship,
        # subjectOf1, subjectOf2 at content positions. v36 SAX exception confirmed.
        direct_authors = [ch for ch in inv if ch.tag == Q("author")]
        chk("No <author> as direct child of investigationEvent (CDER PORR schema constraint)",
            len(direct_authors) == 0,
            f"found {len(direct_authors)} direct author child(ren) — will cause SAX parse exception")

        # v37: reporter must be in subjectOf1/controlActEvent/author (schema-valid path)
        SENDER_OID = "2.16.840.1.113883.3.989.2.1.1.7"
        subj1_els = [ch for ch in inv if ch.tag == Q("subjectOf1")]
        reporter_in_subj1 = any(
            ga(ae.find(f".//{Q('code')}"), "codeSystem") == SENDER_OID
            for s1 in subj1_els
            for cae in s1.iter(Q("controlActEvent"))
            for ae in cae.iter(Q("assignedEntity"))
        )
        chk("Reporter in subjectOf1/controlActEvent/author with OID .1.7 (schema-valid)",
            reporter_in_subj1,
            "subjectOf1 with OID .1.7 not found under investigationEvent")

        # Content element order: component/outboundRelationship before subjectOf1,
        # subjectOf1 before subjectOf2 (investigationCharacteristic)
        comp_idxs  = [i for i,t in enumerate(ic) if t=="component"]
        or_idxs    = [i for i,t in enumerate(ic) if t=="outboundRelationship"]
        s1_idxs    = [i for i,t in enumerate(ic) if t=="subjectOf1"]
        s2_idxs    = [i for i,t in enumerate(ic) if t=="subjectOf2"]
        last_comp  = max(comp_idxs,  default=-1)
        last_or    = max(or_idxs,    default=-1)
        first_s1   = min(s1_idxs,    default=999)
        first_s2   = min(s2_idxs,    default=999)
        chk("subjectOf1 (reporter) comes after component + outboundRelationship",
            first_s1 > max(last_comp, last_or),
            f"last-comp@{last_comp} last-outboundRel@{last_or} first-subjectOf1@{first_s1}")
        if s1_idxs and s2_idxs:
            chk("subjectOf1 (reporter) comes before subjectOf2 (investigationCharacteristic)",
                first_s1 < first_s2,
                f"first-subjectOf1@{first_s1} first-subjectOf2@{first_s2}")

    # ── 8. Reaction observations ─────────────────────────────────────────────
    print("\n[ SECTION 8: Reaction observations ]")
    reactions = [o for o in root.iter(Q("observation")) if ga(qn(o,"code"),"code")=="29"]
    chk("At least one reaction (code=29)", len(reactions)>0, f"found {len(reactions)}")
    for i, rxn in enumerate(reactions, 1):
        rc    = [c.tag.replace(f"{{{NS}}}","") for c in rxn]
        et_i  = rc.index("effectiveTime") if "effectiveTime" in rc else -1
        val_i = rc.index("value")         if "value"         in rc else -1
        chk(f"Reaction {i}: effectiveTime before value",
            et_i!=-1 and val_i!=-1 and et_i<val_i, f"et@{et_i} val@{val_i}")
        val = qn(rxn,"value")
        meddra_ok = (val is not None and
                     ga(val,"codeSystem")=="2.16.840.1.113883.6.163" and
                     ga(val,"code") is not None)
        chk(f"Reaction {i}: MedDRA code+codeSystem on value", meddra_ok,
            f"code={ga(val,'code')!r} cs={ga(val,'codeSystem')!r}" if val is not None else "no <value>")
        eff = qn(rxn,"effectiveTime")
        if eff is not None and (qn(eff,"low") is not None or qn(eff,"high") is not None):
            chk(f"Reaction {i}: effectiveTime xsi:type=IVL_TS when low/high present",
                ga(eff, f"{{{XSI}}}type")=="IVL_TS",
                f"xsi:type={ga(eff,f'{{{XSI}}}type')!r}")

    # ── 9. Patient demographics ──────────────────────────────────────────────
    print("\n[ SECTION 9: Patient demographics ]")
    # Patient is in primaryRole classCode="INVSBJ" (NOT classCode="PRS" which is the reporter)
    pr_invsbj = next(
        (e for e in root.iter(Q("primaryRole")) if ga(e,"classCode")=="INVSBJ"), None)
    if pr_invsbj is None:
        warn("primaryRole classCode=INVSBJ (patient) not found — skipping")
    else:
        obs_codes = {ga(qn(o,"code"),"code") for o in pr_invsbj.iter(Q("observation"))}
        chk("Race observation (C17049)",    "C17049" in obs_codes)
        chk("Ethnicity observation (C16564)","C16564" in obs_codes)

    # ── 10. Drug indication coding ───────────────────────────────────────────
    print("\n[ SECTION 10: Drug indication CE values ]")
    ind_obs = [o for o in root.iter(Q("observation")) if ga(qn(o,"code"),"code")=="C41331"]
    chk("At least one indication observation", len(ind_obs)>0, f"found {len(ind_obs)}")
    for i, obs in enumerate(ind_obs, 1):
        val = qn(obs,"value")
        dn  = ga(val,"displayName") or "?"
        chk(f"Indication {i} ({dn!r}): code+codeSystem present",
            val is not None and bool(ga(val,"code")) and bool(ga(val,"codeSystem")),
            f"code={ga(val,'code')!r} cs={ga(val,'codeSystem')!r}" if val is not None else "no <value>")

    # ── 11. Reporter block C.3 (v37+: subjectOf1/controlActEvent/author OID .1.7) ──
    print("\n[ SECTION 11: Reporter block (C.3) ]")
    # v37: reporter is in subjectOf1/controlActEvent/author with OID .3.989.2.1.1.7
    # (NOT as a direct child of investigationEvent — that causes a SAX parse exception)
    REPORTER_OID  = "2.16.840.1.113883.3.989.2.1.1.7"   # sender type value set — engine reads C.3 from here
    inv2 = root.find(f".//{Q('investigationEvent')}")
    reporter_auth = None
    assigned      = None
    if inv2 is not None:
        for s1 in inv2.findall(Q("subjectOf1")):
            for cae in s1.iter(Q("controlActEvent")):
                for auth in cae.findall(Q("author")):
                    ae = auth.find(Q("assignedEntity"))
                    if ae is not None:
                        rc_test = qn(ae, "code")
                        if ga(rc_test, "codeSystem") == REPORTER_OID:
                            reporter_auth = auth
                            assigned = ae
                            break
                if reporter_auth: break
            if reporter_auth: break
    if not chk("Reporter author found in subjectOf1/controlActEvent/author with OID .1.7",
               reporter_auth is not None,
               "Check: subjectOf1 present? OID = 2.16.840.1.113883.3.989.2.1.1.7?"):
        warn("Skipping C.3 checks")
    else:
        rc = qn(assigned, "code")
        chk("C.3.1 qualification OID = .3.989.2.1.1.7 (FDA engine reads C.3 from this)",
            rc is not None and ga(rc,"codeSystem")==REPORTER_OID,
            f"code={ga(rc,'code')!r} codeSystem={ga(rc,'codeSystem')!r}")
        chk("C.3.1 qualification code present",
            rc is not None and bool(ga(rc,"code")),
            f"code={ga(rc,'code')!r}")
        ap = qn(assigned, "assignedPerson")
        if not chk("assignedPerson present in reporter author", ap is not None):
            warn("Skipping name sub-checks")
        else:
            nm = qn(ap, "name")
            if not chk("assignedPerson/name present", nm is not None):
                warn("Skipping name element checks")
            else:
                given_els  = qna(nm, "given")
                prefix_els = qna(nm, "prefix")
                family_els = qna(nm, "family")
                given_texts  = [e.text or "" for e in given_els]
                prefix_texts = [e.text or "" for e in prefix_els]
                family_texts = [e.text or "" for e in family_els]
                chk("C.3.2+C.3.3.3 given name: <given> child in assignedPerson/name",
                    len(given_els) > 0 and any(t.strip() for t in given_texts),
                    f"given: {given_texts}")
                chk("C.3.3.2 title: <prefix> child in assignedPerson/name",
                    len(prefix_els) > 0 and any(t.strip() for t in prefix_texts),
                    f"prefix: {prefix_texts}")
                chk("Family name: <family> child in assignedPerson/name",
                    len(family_els) > 0 and any(t.strip() for t in family_texts),
                    f"family: {family_texts}")
            # asLocatedEntity in assignedPerson: present in BOTH v29 (C.3.2 pass) and v30 (C.3.2 fail).
            # It is a NEUTRAL factor — not the C.3.2 differentiator. The nested org structure is
            # the only confirmed differentiator. This check simply confirms the element is present
            # (as it was in v29, the baseline) but its presence/absence does NOT explain C.3.2.
            loc_entity = ap.find(Q("asLocatedEntity")) if ap is not None else None
            chk("C.3 asLocatedEntity present in assignedPerson (neutral — present in both v29 and v30)",
                loc_entity is not None,
                "asLocatedEntity absent — note: this is a neutral factor (present in both v29 C.3.2-pass AND v30 C.3.2-fail)")
        addr = qn(assigned, "addr")
        chk("Reporter addr present under assignedEntity", addr is not None)
        if addr is not None:
            country_el = qn(addr, "country")
            chk("C.3.4.6 country: <country> in assignedEntity/addr",
                country_el is not None and bool((country_el.text or "").strip()),
                f"country={country_el.text!r}" if country_el is not None else "missing")
        telecoms = [ga(t,"value") or "" for t in qna(assigned,"telecom")]
        chk("C.3.4.7 telephone (tel:)", any(t.startswith("tel:") for t in telecoms),
            f"telecoms: {telecoms}")
        chk("C.3.4.8 fax (fax:)",       any(t.startswith("fax:") for t in telecoms),
            f"telecoms: {telecoms}")
        # v37 RESTORE: nested representedOrganization (outer=dept, inner=company)
        outer_org      = qn(assigned, "representedOrganization")
        outer_org_name = qn(outer_org, "name") if outer_org is not None else None
        inner_org      = assigned.find(f".//{Q('representedOrganization')}/{Q('assignedEntity')}/{Q('representedOrganization')}")
        inner_org_name = qn(inner_org, "name") if inner_org is not None else None
        chk("Reporter outer representedOrganization with name (C.3.3.5 dept/unit)",
            outer_org is not None and outer_org_name is not None and
            bool((outer_org_name.text or "").strip()),
            "outer representedOrganization missing or no name")
        chk("Reporter nested representedOrganization present (v29 C.3.2-pass structural pattern)",
            inner_org is not None and inner_org_name is not None and
            bool((inner_org_name.text or "").strip()),
            "nested inner representedOrganization missing — was present in v29 when C.3.2 passed")

    # ── 12. D.7 medical history ──────────────────────────────────────────────
    print("\n[ SECTION 12: D.7 medical history ]")
    d72 = [o for o in root.iter(Q("observation")) if ga(qn(o,"code"),"code")=="18"]
    chk("D.7.2 historyAndConcurrentConditionText present", len(d72)>0, f"found {len(d72)}")
    d73 = [o for o in root.iter(Q("observation")) if ga(qn(o,"code"),"code")=="11"]
    chk("D.7.3 concomitantTherapy indicator present",      len(d73)>0, f"found {len(d73)}")

    # ── 13. ICH report type ──────────────────────────────────────────────────
    print("\n[ SECTION 13: ICH report type ]")
    ich = [e for e in root.iter(Q("investigationCharacteristic"))
           if ga(qn(e,"code"),"code")=="1"]
    chk("ICH ReportType investigationCharacteristic (code=1)", len(ich)>0)

    # ── 14. C.1.7 Local criteria for expedited reporting (FDA Reg. IG §4.2.1) ─
    print("\n[ SECTION 14: C.1.7 Local criteria for expedited reporting ]")
    # localCriteriaForExpedited (code=23) — required per FDA Regional IG §4.2.1
    lcx_obs = [o for o in root.iter(Q("observationEvent"))
               if ga(qn(o,"code"),"code")=="23"]
    chk("C.1.7 localCriteriaForExpedited (code=23) present",
        len(lcx_obs)>0, f"found {len(lcx_obs)}")
    if lcx_obs:
        val = qn(lcx_obs[0],"value")
        chk("C.1.7 localCriteriaForExpedited has BL value",
            val is not None and ga(val,f"{{{XSI}}}type")=="BL" and ga(val,"value") in ("true","false"),
            f"type={ga(val,f'{{{XSI}}}type')!r} value={ga(val,'value')!r}" if val is not None else "no <value>")
    # localCriteriaReportType (C54588) — present when expedited=true
    lcrt_obs = [o for o in root.iter(Q("observationEvent"))
                if ga(qn(o,"code"),"code")=="C54588"]
    chk("C.1.7 localCriteriaReportType (C54588) present",
        len(lcrt_obs)>0, f"found {len(lcrt_obs)}")
    if lcrt_obs:
        val = qn(lcrt_obs[0],"value")
        rt_code = ga(val,"code") if val is not None else None
        chk("C.1.7 reportType code is 1 (15-Day) or 7 (7-Day)",
            rt_code in ("1","7"),
            f"code={rt_code!r}")

    # ── 15. Uncoded CE values (warnings) ────────────────────────────────────
    print("\n[ SECTION 15: Uncoded CE values ]")
    uncoded = []
    for obs in root.iter(Q("observation")):
        val = qn(obs,"value")
        if val is not None and ga(val,f"{{{XSI}}}type")=="CE":
            if not ga(val,"code") and not ga(val,"codeSystem") and not ga(val,"nullFlavor"):
                oc  = qn(obs,"code")
                ctx = ga(oc,"displayName") or ga(oc,"code") or "?"
                dn  = ga(val,"displayName") or "(no displayName)"
                uncoded.append(f"{ctx}: {dn!r}")
    if uncoded:
        for u in uncoded:
            warn(f"CE with displayName only (no code/codeSystem/nullFlavor): {u}")
    else:
        chk("No uncoded CE values", True)

    # ── Summary ──────────────────────────────────────────────────────────────
    fails  = [r for r in _results if r[0]==FAIL]
    warns  = [r for r in _results if r[0]==WARN]
    passes = [r for r in _results if r[0]==PASS]
    print(f"\n{'='*72}")
    print(f"  RESULT: {len(passes)} ✅ PASS  |  {len(warns)} ⚠️  WARN  |  {len(fails)} ❌ FAIL")
    print(f"{'='*72}")
    if fails:
        print("\n  FAILURES:")
        for _,label,detail in fails:
            print(f"    ❌  {label}")
            if detail: print(f"        {detail}")
    if warns:
        print("\n  WARNINGS:")
        for _,label,detail in warns:
            print(f"    ⚠️   {label}")
            if detail: print(f"        {detail}")
    print()
    return len(fails)==0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 faers_xml_lint.py <xml_file>")
        sys.exit(1)
    sys.exit(0 if run(sys.argv[1]) else 1)
