#!/usr/bin/env python3
"""
FAERS / AERS USP E2B(R3) XML Lint + Golden Checklist
DeepQuence — updated 2026-04-28 (IND T06 root-cause session)

Usage:  python3 faers_xml_lint.py path/to/CASE-XXXXX.xml
Exit:   0 = all pass/warn   |   1 = one or more FAIL

SECTIONS 18–19 added 2026-04-28 (GAP-IND-007):
  Sec 6:   PORR receiver now accepts 'CDER' (postmarket) OR 'CDER_IND' (IND track)
  Sec 18:  C.5.5a must be '123456' for ZZFDATST_PREMKT test environment.
           Root cause of T06 triple-rejection: IND number '999999' is not registered
           in the FDA test IND registry.  The error "FDA.C.5.5a is invalid for the
           Center" is a CONTENT/REGISTRY rejection, not a schema or structure issue.
           Evidence: T06 v29/v30/v31 all CR+AR; T01–T05/T07 all CA+AE with 123456.
  Sec 19:  C.5.5a numeric value must match the drug approval IND (after stripping
           the 'IND' prefix) — internal cross-consistency check.

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
    # ZZFDATST = postmarket test gateway; ZZFDATST_PREMKT = premarket/IND test gateway
    chk("Wrapper receiver = ZZFDATST or ZZFDATST_PREMKT (TEST routing)",
        any(e in ("ZZFDATST", "ZZFDATST_PREMKT") for _,e in w_rcv_ids),
        f"found: {w_rcv_ids}")
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
        chk("PORR receiver: extension is 'CDER' (postmarket) or 'CDER_IND' (premarket/IND)",
            len(p_rcv)==1 and p_rcv[0][1] in ("CDER", "CDER_IND"), f"found: {p_rcv}")
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

        # Fatal-case conditional checks (GAP-IND-004)
        # If any reaction has resultsInDeath=true, patient block must have:
        #   (a) <deceasedTime> on player1
        #   (b) an autopsy observation (code="5") as a subjectOf2
        death_obs = [
            o for o in root.iter(Q("observation"))
            if ga(qn(o,"code"),"code") == "34"   # resultsInDeath
        ]
        any_fatal = any(
            ga(qn(o,"value"),"value") == "true"
            for o in death_obs
        )
        if any_fatal:
            player1 = next(
                (e for e in pr_invsbj.iter(Q("player1")) if ga(e,"classCode")=="PSN"), None)
            has_deceased_time = (
                player1 is not None and
                player1.find(Q("deceasedTime")) is not None
            )
            chk("D.9.1 deceasedTime present on player1 when resultsInDeath=true [GAP-IND-004]",
                has_deceased_time,
                "missing <deceasedTime> on player1 — required for fatal pre-market ICSRs")

            autopsy_obs = [
                o for o in pr_invsbj.iter(Q("observation"))
                if ga(qn(o,"code"),"code") == "5"  # autopsy (D.9.3)
            ]
            chk("D.9.3 autopsy observation (code=5) present when resultsInDeath=true [GAP-IND-004]",
                len(autopsy_obs) > 0,
                "missing autopsy subjectOf2 — required when Date of Death is present")

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
        # FIX-P01 (2026-05-01): generator now emits code='2' for non-expedited
        # cases (CDER 2.18 rule: when C.1.7=false, FDA.C.1.7.1 must be
        # "Non Expedited AE / Periodic"). Accept '2' alongside the expedited
        # codes '1' (15-Day) and '6' (7-Day). '7' remains out of the codelist.
        chk("C.1.7 reportType code is 1 (15-Day), 2 (Non-Expedited), or 6 (7-Day) [FDA codelist — GAP-IND-004 + FIX-P01]",
            rt_code in ("1","2","6"),
            f"code={rt_code!r} — expected '1' (15-Day), '2' (Non-Expedited AE), or '6' (7-Day); '7' is not in the FDA codelist")

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

    # ── 16. Follow-up report structure (GAP-IND-005) ────────────────────────
    print("\n[ SECTION 16: Follow-up report structure ]")
    # Detect follow-up by version id extension >= 3.
    # NOTE: the followUpReport outboundRelationship was removed per GAP-IND-005 because
    # code="2" on OID .1.22 collides with sourceReport code="2".  Follow-up is now
    # identified solely by investigationEvent/id[@root='.3.4'] extension >= 3.
    all_rel_inv = [
        ri for or_ in root.iter(Q("outboundRelationship"))
        for ri in or_.iter(Q("relatedInvestigation"))
    ]
    rel_inv_codes = [ga(qn(ri,"code"),"displayName") or ga(qn(ri,"code"),"code") or ""
                     for ri in all_rel_inv]
    _ie_for_ver = root.find(f".//{Q('investigationEvent')}")
    _ver_id = None
    if _ie_for_ver is not None:
        for _vid in _ie_for_ver.findall(Q("id")):
            if ga(_vid, "root") == "2.16.840.1.113883.3.989.2.1.3.4":
                _ver_id = _vid
                break
    _ver_ext = int(ga(_ver_id, "extension") or 0)
    is_followup = _ver_ext >= 3

    if is_followup:
        # C.1.8.2: must have an initialReport outboundRelationship (First Sender)
        has_initial_report = "initialReport" in rel_inv_codes
        chk("Follow-up: initialReport outboundRelationship present (C.1.8.2) [GAP-IND-005]",
            has_initial_report,
            "missing outboundRelationship/relatedInvestigation/code='initialReport' — required for follow-ups")

        # C.2.r.5: must have a sourceReport outboundRelationship with priorityNumber
        has_source_report = "sourceReport" in rel_inv_codes
        chk("Follow-up: sourceReport outboundRelationship present (C.2.r.5) [GAP-IND-005]",
            has_source_report,
            "missing outboundRelationship/relatedInvestigation/code='sourceReport' — required for follow-ups")

        if has_source_report:
            # C.2.r.5: priorityNumber value="1" on the sourceReport outboundRelationship
            source_or = next(
                (or_ for or_ in root.iter(Q("outboundRelationship"))
                 for ri in or_.iter(Q("relatedInvestigation"))
                 if (ga(qn(ri,"code"),"displayName") or ga(qn(ri,"code"),"code")) == "sourceReport"),
                None
            )
            has_priority = (
                source_or is not None and
                source_or.find(Q("priorityNumber")) is not None and
                ga(source_or.find(Q("priorityNumber")), "value") == "1"
            )
            chk("Follow-up: priorityNumber value='1' on sourceReport (C.2.r.5) [GAP-IND-005]",
                has_priority,
                "missing <priorityNumber value='1'> on sourceReport outboundRelationship")

            # FDA.C.2.r.2.8: reporter email must be present in the sourceReport block
            source_telecoms = []
            if source_or is not None:
                source_telecoms = [
                    ga(t,"value") or "" for t in source_or.iter(Q("telecom"))
                ]
            has_email = any(t.startswith("mailto:") for t in source_telecoms)
            chk("Follow-up: reporter email (mailto:) in sourceReport (FDA.C.2.r.2.8) [GAP-IND-005]",
                has_email,
                f"no mailto: telecom in sourceReport block — telecoms found: {source_telecoms}")
    else:
        chk("Initial report (no follow-up checks required)", True)

    # OID+code uniqueness: no two relatedInvestigation/code elements in outboundRelationship
    # may share the same (codeSystem, code) pair — would cause FDA validator to read the wrong block
    from collections import Counter as _Counter
    # Clark notation {ns}tag is valid in ElementTree XPath without a namespace dict
    _all_orb = root.findall(f".//{Q('outboundRelationship')}")
    _oid_code_pairs = []
    for _orb in _all_orb:
        for _ri in _orb.findall(Q('relatedInvestigation')):
            _c = _ri.find(Q('code'))
            if _c is not None:
                _oid_code_pairs.append((ga(_c,'codeSystem'), ga(_c,'code')))
    _dupes = [p for p, cnt in _Counter(_oid_code_pairs).items() if cnt > 1]
    chk("No duplicate OID+code in outboundRelationship/relatedInvestigation/code [GAP-IND-005]",
        len(_dupes) == 0,
        f"duplicate OID+code pairs: {_dupes}")

    # ── 17. FDAAddDrugInformation absent for CDER_IND (GAP-IND-006) ─────────
    print("\n[ SECTION 17: FDAAddDrugInformation absent for CDER_IND (GAP-IND-006) ]")
    # Detect whether the PORR receiver is CDER_IND (same logic as Section 6).
    PORR_RECV_OID = "2.16.840.1.113883.3.989.2.1.3.12"
    _porr_for_s17 = qn(root, "PORR_IN049016UV")
    _porr_rcv_exts = [
        ga(i, "extension")
        for r in qna(_porr_for_s17, "receiver")
        for d in qna(r, "device")
        for i in qna(d, "id")
        if ga(i, "root") == PORR_RECV_OID
    ]
    is_cder_ind = any(e == "CDER_IND" for e in _porr_rcv_exts)
    if is_cder_ind:
        # FDAAddDrugInformation: observation with code="9" on OID .3.989.2.1.1.19
        FDA_ADD_DRUG_OID = "2.16.840.1.113883.3.989.2.1.1.19"
        fda_add_drug_obs = [
            o for o in root.iter(Q("observation"))
            if ga(qn(o, "code"), "code") == "9"
            and ga(qn(o, "code"), "codeSystem") == FDA_ADD_DRUG_OID
        ]
        chk(
            "GAP-IND-006: FDAAddDrugInformation (code=9, OID .3.989.2.1.1.19) absent for CDER_IND",
            len(fda_add_drug_obs) == 0,
            f"found {len(fda_add_drug_obs)} FDAAddDrugInformation observation(s) — "
            "FDA.C.5.5a is invalid for CDER_IND center (N.2.r.3); field must be omitted for IND submissions"
        )
    else:
        chk("GAP-IND-006: FDAAddDrugInformation check skipped (receiver is not CDER_IND)", True,
            f"PORR receiver extensions found: {_porr_rcv_exts}")

    # ── 18. C.5.5a registered test IND value (GAP-IND-007) ─────────────────
    print("\n[ SECTION 18: C.5.5a IND number — registered test value (GAP-IND-007) ]")
    # ROOT CAUSE discovered 2026-04-28:
    # The FDA ZZFDATST_PREMKT test gateway validates C.5.5a against a registry of
    # registered test INDs.  The only confirmed registered test IND is "123456".
    # T06 used "999999" — not registered — and rejected with "FDA.C.5.5a is invalid
    # for the Center specified in N.2.r.3" across three consecutive submissions (v29,
    # v30, v31) even though every structural element was correct.  All other IND test
    # cases (T01–T05, T07) use "123456" and receive CA+AE.
    # FDA reference Scenario 3 (FAERS2022Scenario3.xml) also uses "123456".
    # RULE: for any new IND test submission, C.5.5a MUST be "123456" unless this test
    # is specifically probing a different registered IND.
    KNOWN_TEST_IND = "123456"
    C55A_OID  = "2.16.840.1.113883.3.989.5.1.2.2.1.2.1"
    c55a_regs = [
        sr for sr in root.findall(f".//{Q('studyRegistration')}")
        if ga(sr.find(Q("id")), "root") == C55A_OID
    ]
    if is_cder_ind:
        if c55a_regs:
            for sr in c55a_regs:
                id_el = sr.find(Q("id"))
                val   = ga(id_el, "extension")
                _detail_18 = (
                    "" if val == KNOWN_TEST_IND else
                    f"C.5.5a='{val}' is NOT the confirmed registered test IND. "
                    f"ONLY '{KNOWN_TEST_IND}' is proven to pass ZZFDATST registry validation. "
                    "Evidence: T06 v29/v30/v31 all CR+AR with 999999 ('FDA.C.5.5a is invalid "
                    "for the Center'); T01–T05/T07 all CA+AE with 123456."
                )
                chk(
                    f"GAP-IND-007: C.5.5a='{val}' is the registered ZZFDATST test IND ('{KNOWN_TEST_IND}')",
                    val == KNOWN_TEST_IND,
                    _detail_18
                )
        else:
            warn("GAP-IND-007: No C.5.5a studyRegistration found for CDER_IND submission — "
                 "expected OID 2.16.840.1.113883.3.989.5.1.2.2.1.2.1")
    else:
        chk("GAP-IND-007: C.5.5a registry check skipped (not a CDER_IND submission)", True)

    # ── 19. Drug IND approval ↔ C.5.5a cross-consistency (GAP-IND-007) ──────
    print("\n[ SECTION 19: Drug IND approval ↔ C.5.5a cross-consistency ]")
    # The numeric part of each drug's asManufacturedProduct/approval/id[@root='.3.4']
    # extension (stripping any "IND" prefix) should match C.5.5a.
    # Evidence: T01 drug=IND123456 → strip → 123456 == C.5.5a=123456 ✓
    #           T06 drug=IND999999 → strip → 999999 == C.5.5a=999999 ✓ (consistent, but 999999 unregistered)
    # A mismatch here means the submission is internally inconsistent regardless of registry.
    DRUG_APPROVAL_OID = "2.16.840.1.113883.3.989.2.1.3.4"
    drug_ind_numerics = set()
    for _appr in root.iter(Q("approval")):
        _aid = _appr.find(Q("id"))
        if _aid is not None and ga(_aid, "root") == DRUG_APPROVAL_OID:
            ext = ga(_aid, "extension") or ""
            # Strip "IND" prefix (case-insensitive)
            numeric = ext[3:] if ext.upper().startswith("IND") else ext
            if numeric:
                drug_ind_numerics.add(numeric)
    if c55a_regs and drug_ind_numerics:
        c55a_vals = {ga(sr.find(Q("id")), "extension") for sr in c55a_regs}
        overlap   = c55a_vals & drug_ind_numerics
        _detail_19 = (
            "" if len(overlap) > 0 else
            f"C.5.5a={sorted(c55a_vals)}  drug approval INDs (numeric)={sorted(drug_ind_numerics)}  "
            "No overlap — C.5.5a must equal the numeric part of the primary suspect drug's IND approval"
        )
        chk(
            "C.5.5a matches at least one drug approval IND (numeric part after 'IND' prefix strip)",
            len(overlap) > 0,
            _detail_19
        )
    elif c55a_regs and not drug_ind_numerics:
        warn("C.5.5a present but no drug approval IND block found — "
             "cannot verify cross-consistency; ensure suspect drug has approval/id with root "
             "2.16.840.1.113883.3.989.2.1.3.4")
    else:
        chk("C.5.5a / drug IND cross-consistency: no C.5.5a present, skip", True)

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
