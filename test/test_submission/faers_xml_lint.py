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
    # Only adverse event reactions: code=29 observations that are direct children of
    # subjectOf2 under primaryRole — not D.8.r past-drug-reaction obs (in outboundRelationship2/CAUS)
    reactions = [o for o in root.iter(Q("observation"))
                 if ga(qn(o,"code"),"code")=="29"
                 and ga(qn(o,"code"),"codeSystem")=="2.16.840.1.113883.3.989.2.1.1.19"
                 and qn(o,"effectiveTime") is not None]
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

    # ── 20. C.5.6.r mandatory when C.5.5a is populated (R0026) ──────────────
    print("\n[ SECTION 20: C.5.6.r — cross-reported IND (Business Rule R0026) ]")
    # Business Rules v1.7 R0026: "If C.5.5a is populated, C.5.6.r is required.
    # Use nullFlavor=NA if there are no other cross-reported INDs."
    # C.5.6.r XPath OID: 2.16.840.1.113883.3.989.5.1.2.2.1.2.3  (DISTINCT from C.5.5a OID .2.1)
    # Evidence: v5–v8 all CR+AR for missing/wrong-OID C.5.6.r; golden IND-T03 uses .2.3
    C56R_OID = "2.16.840.1.113883.3.989.5.1.2.2.1.2.3"
    if is_cder_ind:
        c56r_entries = []
        for el in root.iter(Q("id")):
            if ga(el, "root") == C56R_OID:
                val = ga(el, "extension") or ga(el, "nullFlavor") or "(empty)"
                c56r_entries.append(val)

        if c55a_vals:
            # C.5.5a is present → C.5.6.r is mandatory
            if not c56r_entries:
                chk(
                    "R0026: C.5.6.r is mandatory when C.5.5a is populated but no "
                    f"studyRegistration with OID {C56R_OID} found. "
                    "Add authorization/studyRegistration with that OID, or use nullFlavor='NA' "
                    "if no cross-reported INDs exist.",
                    False
                )
            else:
                chk(
                    f"R0026: C.5.6.r present — {len(c56r_entries)} entry/entries: {c56r_entries}",
                    True
                )
        else:
            # No C.5.5a → R0026 not triggered
            chk("R0026: C.5.5a absent — C.5.6.r not required", True)
    else:
        # R0109: C.5.6.r must NOT be present for postmarket
        c56r_present = any(ga(el, "root") == C56R_OID for el in root.iter(Q("id")))
        chk(
            "R0109: Non-CDER_IND submission — C.5.6.r must be absent",
            not c56r_present
        )

    # ── 21. XSD schema validation (best-effort via lxml) ────────────────────
    print("\n[ SECTION 21: XSD schema validation (best-effort) ]")
    # Why best-effort: the FDA schema set downloaded to faers/docs/schema/ is
    # incomplete — PORR_IN049016UV.xsd, PORR_MT049016UV.xsd, and
    # MCCI_IN200101UV01.xsd were returned as HTML redirect pages by fda.gov and
    # cannot be parsed as XSD.  The MCCI_IN200100UV01.xsd entry point is valid
    # but its include chain cannot resolve, so XMLSchemaParseError is expected.
    # When the full schema IS loadable, this section catches child-ordering
    # violations (like the D.10 bug: role outside player1) that ET.parse()
    # accepts silently because they are schema errors, not well-formedness errors.
    _XSD_ROOT = Path(xml_path).parent.parent.parent / "faers/docs/schema/multicacheschemas/MCCI_IN200100UV01.xsd"
    # Also try relative to the script's own directory tree
    _XSD_CANDIDATES = [
        _XSD_ROOT,
        Path(__file__).parent.parent / "faers/docs/schema/multicacheschemas/MCCI_IN200100UV01.xsd",
        Path("/sessions/tender-vigilant-gates/mnt/faers/docs/schema/multicacheschemas/MCCI_IN200100UV01.xsd"),
    ]
    _xsd_file = next((p for p in _XSD_CANDIDATES if p.exists()), None)
    try:
        from lxml import etree as _lxml_etree
        if _xsd_file is None:
            warn("XSD schema file not found — full schema validation skipped",
                 "expected MCCI_IN200100UV01.xsd; run from test_submission directory")
        else:
            try:
                _xsd_doc = _lxml_etree.parse(str(_xsd_file))
                _schema  = _lxml_etree.XMLSchema(_xsd_doc)
                _lxml_tree = _lxml_etree.parse(xml_path)
                _xsd_valid = _schema.validate(_lxml_tree)
                _xsd_errors = list(_schema.error_log)
                _top3 = "; ".join(f"L{e.line}:{e.message[:80]}" for e in _xsd_errors[:3])
                chk(f"XSD schema-valid (0 errors)", _xsd_valid, _top3 or "")
            except _lxml_etree.XMLSchemaParseError as xpe:
                # Expected when the include chain has HTML redirect files
                warn("XSD schema load failed — include chain incomplete (some .xsd files "
                     "are FDA HTML redirects); targeted structural checks in Sec 22 compensate",
                     str(xpe)[:160])
    except ImportError:
        warn("lxml not installed — XSD validation skipped", "pip install lxml")

    # ── 22. D.10 structural placement — role[@classCode='PRS'] inside player1 ─
    print("\n[ SECTION 22: D.10 parent/mother — role[@classCode='PRS'] placement ]")
    # ROOT CAUSE of TC-M06 v1 CR+AR (2026-05-25):
    #   role[@classCode='PRS'] was placed as a direct child of <primaryRole>
    #   at line 688.  The FDA SAX parser rejected with:
    #     cvc-complex-type.2.4.a: Invalid content was found starting with
    #     element 'role'. One of 'subjectOf2' is expected.
    #   FAERS2022Scenario6.xml confirms: role[@classCode='PRS'] must be the
    #   LAST child of <player1 classCode="PSN">, not a sibling of player1.
    #   ET.parse() accepts both positions (well-formed either way); only
    #   lxml.getparent() can detect the ordering violation pre-submission.
    try:
        from lxml import etree as _lxml_etree
        _lt = _lxml_etree.parse(xml_path)
        _lr = _lt.getroot()
        _NS = "urn:hl7-org:v3"
        _prs_roles = _lr.findall(f'.//{{{_NS}}}role[@classCode="PRS"]')
        if not _prs_roles:
            info("D.10: No role[@classCode='PRS'] in document — D.10 parent block omitted (OK if not required)")
        else:
            for _i, _role_el in enumerate(_prs_roles, 1):
                _parent_el  = _role_el.getparent()
                _parent_tag = _parent_el.tag.split("}")[-1] if _parent_el is not None else "None"
                _grandp_el  = _parent_el.getparent() if _parent_el is not None else None
                _grandp_tag = _grandp_el.tag.split("}")[-1] if _grandp_el is not None else "None"
                _ok = _parent_tag == "player1"
                chk(
                    f"D.10 role[{_i}][@classCode='PRS'] is direct child of <player1> "
                    f"(grandparent=<{_grandp_tag}>)",
                    _ok,
                    f"found as child of <{_parent_tag}> — "
                    "must be inside <player1 classCode='PSN'>; "
                    "placing it as child of <primaryRole> causes SAX parse rejection "
                    "(cvc-complex-type.2.4.a: 'subjectOf2' expected)"
                    if not _ok else ""
                )
                if _ok:
                    # Also verify it is the last child of player1 (Scenario6 pattern)
                    _p1_children = list(_parent_el)
                    _is_last = _p1_children[-1] is _role_el
                    chk(
                        f"D.10 role[{_i}] is last child of <player1> (Scenario6 ordering)",
                        _is_last,
                        f"role is child #{_p1_children.index(_role_el)+1} of {len(_p1_children)}; "
                        "Scenario6 places it after all asIdentifiedEntity elements"
                        if not _is_last else ""
                    )
    except Exception as _e22:
        warn("D.10 structural check error", str(_e22))

    # ── 23. E.i.7 outcome value-set membership ──────────────────────────────
    print("\n[ SECTION 23: E.i.7 outcome code — value-set membership ]")
    # ROOT CAUSE of TC-M06 v2 CR+AR (2026-05-25):
    #   R2 outcome was set code="6" displayName="recovering/resolving".
    #   In the FDA FAERS value set (OID 2.16.840.1.113883.3.989.2.1.1.11):
    #     1 = recovered/resolved
    #     2 = recovering/resolving      ← correct code for that concept
    #     3 = not recovered/not resolved/ongoing
    #     4 = recovered/resolved with sequelae
    #     5 = fatal
    #     6 = unknown                   ← NOT "recovering/resolving"
    #   FAERS 2.18 validates the code value, not the displayName.
    #   The linter had no value-set check, so a wrong code with a correct
    #   displayName silently passed all 22 prior checks.
    #   Two outcome fields share this value set in each reaction block:
    #     (a) code="27" / OID .3.989.2.1.1.19  — the canonical E.i.7 field
    #     (b) code="C49489" / OID .3.26.1.1     — companion NCI Outcome field
    #   Both must carry the same valid code from the allowed set {1,2,3,4,5,6}.
    #   Note: FDA FAERS 2.18 business rules REJECT code=6 for E.i.7 (Unknown
    #   is not a permitted outcome value). Allowed: {1, 2, 3, 4, 5}.
    OUTCOME_OID    = "2.16.840.1.113883.3.989.2.1.1.11"
    OUTCOME_CODE_27_OID = "2.16.840.1.113883.3.989.2.1.1.19"
    ALLOWED_OUTCOME_CODES = {"1", "2", "3", "4", "5", "6"}  # 6=Unknown — valid per ICH E2B(R3); TC-F04 CA+AA confirmed
    OUTCOME_LABELS = {"1":"recovered/resolved", "2":"recovering/resolving",
                      "3":"not recovered/not resolved", "4":"recovered with sequelae",
                      "5":"fatal", "6":"unknown"}

    # Find all outcome observations (code=27, OID .3.989.2.1.1.19)
    _outcome_obs = [
        o for o in root.iter(Q("observation"))
        if ga(qn(o, "code"), "code") == "27"
        and ga(qn(o, "code"), "codeSystem") == OUTCOME_CODE_27_OID
    ]
    if not _outcome_obs:
        warn("E.i.7: No outcome observations (code=27) found")
    else:
        for _i, _obs in enumerate(_outcome_obs, 1):
            _val = qn(_obs, "value")
            _code = ga(_val, "code") if _val is not None else None
            _cs   = ga(_val, "codeSystem") if _val is not None else None
            _dname = ga(_val, "displayName") if _val is not None else None
            _cs_ok = _cs == OUTCOME_OID
            _code_ok = _code in ALLOWED_OUTCOME_CODES
            _detail = (f"code={_code!r} ({OUTCOME_LABELS.get(_code,'?')}) "
                       f"codeSystem={_cs!r} displayName={_dname!r}")
            chk(f"E.i.7 reaction[{_i}]: outcome codeSystem is FAERS value set OID",
                _cs_ok,
                f"got {_cs!r}; expected {OUTCOME_OID!r}" if not _cs_ok else "")
            chk(f"E.i.7 reaction[{_i}]: outcome code in allowed set {{1,2,3,4,5,6}}",
                _code_ok,
                f"{_detail} — code must be in {1,2,3,4,5,6} — see OUTCOME_LABELS for mapping"
                if not _code_ok else f"code={_code!r} ({OUTCOME_LABELS.get(_code,'?')})")

    # Also check the companion C49489 Outcome field (same value set, same rules)
    _c49489_obs = [
        o for o in root.iter(Q("observation"))
        if ga(qn(o, "code"), "code") == "C49489"
    ]
    for _i, _obs in enumerate(_c49489_obs, 1):
        _val = qn(_obs, "value")
        _code = ga(_val, "code") if _val is not None else None
        _cs   = ga(_val, "codeSystem") if _val is not None else None
        _code_ok = _code in ALLOWED_OUTCOME_CODES
        chk(f"C49489 companion outcome[{_i}]: code in allowed set {{1,2,3,4,5,6}}",
            _code_ok,
            f"code={_code!r} ({OUTCOME_LABELS.get(_code,'?')}) — must match E.i.7 and be in {{1,2,3,4,5}}"
            if not _code_ok else f"code={_code!r} ({OUTCOME_LABELS.get(_code,'?')})")

    # ── 24. F.r.3.1 interpretationCode position — must precede referenceRange ─
    print("\n[ SECTION 24: F.r.3.1 interpretationCode — element order in observation ]")
    # ROOT CAUSE of TC-M07 v1 CR+AR (2026-05-26):
    #   interpretationCode was inserted AFTER the referenceRange blocks.
    #   HL7 v3 observation element order requires interpretationCode to appear
    #   BEFORE referenceRange, outboundRelationship1/2, inboundRelationship.
    #   The FDA SAX parser rejected:
    #     cvc-complex-type.2.4.a: Invalid content found starting with
    #     'interpretationCode'. One of 'referenceRange, outboundRelationship1,
    #     outboundRelationship2, inboundRelationship' is expected.
    #   Fix: place interpretationCode immediately after </value>, before <referenceRange>.
    FR31_OID = "2.16.840.1.113883.3.989.2.1.1.12"
    _fr31_obs = [
        o for o in root.iter(Q("observation"))
        if any(
            ga(ch, "codeSystem") == FR31_OID
            for ch in o
            if ch.tag == Q("interpretationCode")
        )
    ]
    if not _fr31_obs:
        info("F.r.3.1: No interpretationCode with OID .3.989.2.1.1.12 — field omitted (optional)")
    else:
        for _i, _obs in enumerate(_fr31_obs, 1):
            _children = list(_obs)
            _tags = [ch.tag.split("}")[-1] for ch in _children]
            _interp_indices = [j for j,t in enumerate(_tags) if t == "interpretationCode"
                               and ga(_children[j], "codeSystem") == FR31_OID]
            _refrange_indices = [j for j,t in enumerate(_tags) if t == "referenceRange"]
            _ob1_indices = [j for j,t in enumerate(_tags) if t in ("outboundRelationship1","outboundRelationship2","inboundRelationship")]
            for _ii_pos in _interp_indices:
                _before_refrange = all(_ii_pos < r for r in _refrange_indices) if _refrange_indices else True
                _before_outbound = all(_ii_pos < r for r in _ob1_indices) if _ob1_indices else True
                _ok = _before_refrange and _before_outbound
                chk(
                    f"F.r.3.1 obs[{_i}]: interpretationCode precedes referenceRange/outboundRelationship",
                    _ok,
                    f"interpretationCode at position {_ii_pos}; "
                    f"referenceRange positions={_refrange_indices}; "
                    f"outbound positions={_ob1_indices} — "
                    "must place interpretationCode BEFORE referenceRange (HL7v3 obs element order)"
                    if not _ok else
                    f"pos={_ii_pos} refrange={_refrange_indices} outbound={_ob1_indices[:3]}"
                )
                _ic_code = ga(_children[_ii_pos], "code")
                _ic_disp = ga(_children[_ii_pos], "displayName")
                # Source: FDA E2B(R3) Core and Regional Data Elements and
                # Business Rules v1.7, sheet 'ICSR Data Elements', row F.r.3.1.
                # Allowed codes: 1=Positive, 2=Negative, 3=Borderline, 4=Inconclusive.
                # Code 5 (Abnormal) does NOT exist in the spec and was rejected
                # by FDA FAERS 2.18 business rules (TC-M07 v5 ACK, 2026-05-26).
                ALLOWED_FR31 = {"1","2","3","4"}
                FR31_LABELS  = {"1":"Positive","2":"Negative","3":"Borderline","4":"Inconclusive"}
                _ic_ok = _ic_code in ALLOWED_FR31
                chk(
                    f"F.r.3.1 obs[{_i}]: interpretationCode value in {{1,2,3,4}}",
                    _ic_ok,
                    f"code={_ic_code!r} ({_ic_disp}) — FDA Business Rules v1.7 only allows "
                    "1=Positive, 2=Negative, 3=Borderline, 4=Inconclusive; "
                    "code 5 does not exist and is rejected as 'Element value not allowed' (TC-M07 v5 ACK)"
                    if not _ic_ok else f"code={_ic_code!r} ({FR31_LABELS.get(_ic_code,'?')})"
                )

    # ── 25. kindOfProduct — subjectOf must NOT appear as direct child ─────────
    print("\n[ SECTION 25: kindOfProduct — subjectOf must not be a direct child ]")
    # ROOT CAUSE of TC-M07 v2+v3 CR+AR (2026-05-26):
    #   G.k.2.4 <subjectOf> was placed inside <kindOfProduct> (v2: after <part>;
    #   v3: after <ingredient>).  The HL7 v3 content model for kindOfProduct
    #   allows only: asManufacturedProduct, ingredient, asContent,
    #   asPartOfAssembly, part — <subjectOf> is NEVER valid there.
    #   Correct location: child of <instanceOfKind>, AFTER </kindOfProduct>.
    #   Reference: FAERS2022Scenario6.xml lines 25123-25139.
    #
    #   Previous bug in this check: it only fired when BOTH subjectOf AND part
    #   were siblings, so v3 (subjectOf next to ingredient, no part) slipped
    #   through with "check skipped".  Fixed: now any subjectOf as direct child
    #   of kindOfProduct is an unconditional FAIL, regardless of what other
    #   siblings are present.
    try:
        from lxml import etree as _lxml_etree
        _lt25 = _lxml_etree.parse(xml_path)
        _lr25 = _lt25.getroot()
        _NS25 = "urn:hl7-org:v3"

        _kop_els = _lr25.findall(f'.//{{{_NS25}}}kindOfProduct')
        _found_any = bool(_kop_els)
        for _kop in _kop_els:
            # Resolve a display name for the drug
            _drug_name = ""
            _name_el = _kop.find(f'{{{_NS25}}}name')
            if _name_el is None:
                _parent = _kop.getparent() if hasattr(_kop, 'getparent') else None
                if _parent is not None:
                    _name_el = _parent.find(f'{{{_NS25}}}name')
            if _name_el is not None and _name_el.text:
                _drug_name = f" (drug: {_name_el.text.strip()[:30]})"

            _bad = [ch for ch in _kop
                    if isinstance(ch.tag, str)
                    and ch.tag.split("}")[-1] == "subjectOf"]
            chk(
                f"kindOfProduct{_drug_name}: no <subjectOf> as direct child",
                len(_bad) == 0,
                f"Found {len(_bad)} <subjectOf> element(s) directly inside "
                "<kindOfProduct>. G.k.2.4 <subjectOf> must be a child of "
                "<instanceOfKind> placed AFTER </kindOfProduct>, not inside it. "
                "This causes SAX cvc-complex-type.2.4.a at FDA. "
                "See FAERS2022Scenario6.xml lines 25123-25139."
                if _bad else
                "no subjectOf inside kindOfProduct"
            )
        if not _found_any:
            info("kindOfProduct check: no <kindOfProduct> elements found — check skipped")
    except Exception as _e25:
        warn("kindOfProduct direct-child check error", str(_e25))

    # ── 26. Attribute validity — qualifier on non-person <name> elements ──────
    print("\n[ SECTION 26: qualifier attribute on non-person <name> elements ]")
    # ROOT CAUSE of TC-M08 v1 CR+AR (2026-05-27):
    #   <name qualifier="MODEL">Auto-Injector Pen Model A2</name> was added to
    #   a device (partProduct/kindOfProduct) <name> element.  The FDA SAX parser
    #   rejected with:
    #     cvc-complex-type.3.2.2: Attribute 'qualifier' is not allowed to appear
    #     in element 'name'.  (Line 609, col 59)
    #
    #   Root cause of linter miss: Section 21 XSD validation is degraded because
    #   all coreschemas/*.xsd files are HTML redirect stubs from the FDA website.
    #   The qualifier constraint lives in DataTypes-base.xsd (TN data type) and
    #   was never reached.  Sections 22-25 are structural checks only.
    #
    #   In HL7v3:
    #     - Person <name> uses EN (Entity Name) → ENXP parts support qualifier
    #     - Device/drug/organisation <name> uses TN (Trivial Name) or ST → NO qualifier
    #   Person name containers: player1[@classCode='PSN'], assignedPerson,
    #     associatedPerson, guardianPerson.
    #   Non-person containers: kindOfProduct, partProduct, manufacturerOrganization,
    #     representedOrganization, ingredientSubstance, and all device/material elements.
    #
    #   This check scans every <name> element with a qualifier attribute and
    #   fails if the parent is not a recognised person-type container.
    PERSON_CONTAINERS = {
        "player1", "assignedPerson", "associatedPerson", "guardianPerson",
        "livingSubject", "patient",
    }
    try:
        from lxml import etree as _lxml_etree
        _lt26 = _lxml_etree.parse(xml_path)
        _lr26 = _lt26.getroot()
        _NS26 = "urn:hl7-org:v3"
        _named_els = _lr26.findall(f'.//{{{_NS26}}}name[@qualifier]')
        if not _named_els:
            chk("No <name qualifier='...'> on non-person elements", True,
                "no name elements with qualifier attribute found")
        else:
            for _ne in _named_els:
                _parent26 = _ne.getparent()
                _ptag = _parent26.tag.split("}")[-1] if _parent26 is not None else "None"
                _is_person = _ptag in PERSON_CONTAINERS
                _qual_val  = _ne.get("qualifier", "")
                chk(
                    f"<name qualifier='{_qual_val}'> inside <{_ptag}> — "
                    "qualifier only allowed on person (EN) name elements",
                    _is_person,
                    f"<{_ptag}> is not a person container — device/drug/org <name> uses "
                    "TN data type which has no qualifier attribute. "
                    "Remove qualifier or use a separate element (e.g. comment). "
                    "Causes cvc-complex-type.3.2.2 SAX rejection at FDA gateway."
                    if not _is_person else
                    f"parent <{_ptag}> is a recognised person container — qualifier valid"
                )
    except Exception as _e26:
        warn("Section 26 qualifier check error", str(_e26))

    # ── 27. <id root> format — OID or valid RFC 4122 UUID ────────────────────
    print("\n[ SECTION 27: <id root> format — OID or valid RFC 4122 UUID ]")
    # ROOT CAUSE of TC-M10 v10 CR+AR (2026-05-29):
    #   Four hand-crafted UUID values were used as substanceAdministration id roots
    #   and as causalityAssessment productUseReference id roots.  They had invalid
    #   version nibbles (7, 8, None) and/or invalid variant bits, failing RFC 4122.
    #   The FDA FAERS 2.18 business rules engine validates the root attribute format
    #   on all <id> elements that carry cross-reference UUIDs (G.k.1, G.k.9.i.2.r).
    #   Error returned: "G.k.1/FDA.G.k.1.a: Incorrect Root ID."
    #
    #   Root cause of linter miss: Section 21 XSD validation is permanently degraded
    #   (HTML redirect stubs from FDA), so the II.root regex check never runs.
    #   No other section called uuid.UUID() on root values.
    #
    #   Valid root values in HL7v3 II data type (ISO 21090):
    #     OID  — matches /[0-2](\.[1-9]\d*)+/  (dotted positive-integer arcs)
    #     UUID — matches /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/
    #   Anything else (e.g. arbitrary strings, version-6/7/8 UUIDs) is rejected.
    import re as _re27, uuid as _uuid27
    _OID_RE   = _re27.compile(r'^[0-2](\.[1-9]\d*)+$')
    # RFC 4122 §4.1: version nibble must be 1-5; variant bits must be 10xxxxxx (8-b hex)
    _UUID_RE  = _re27.compile(
        r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}'
        r'-[1-5][0-9a-fA-F]{3}'           # version nibble 1-5
        r'-[89aAbB][0-9a-fA-F]{3}'        # variant bits 10xxxxxx
        r'-[0-9a-fA-F]{12}$',
        _re27.IGNORECASE
    )
    # Well-known FAERS OID roots that are exempt from OID dot-count check
    _KNOWN_ROOTS = {
        "2.16.840.1.113883.3.989.2.1.3.1",   # SR message number
        "2.16.840.1.113883.3.989.2.1.3.2",   # related case id
        "2.16.840.1.113883.3.989.2.1.3.3",   # linked report
        "2.16.840.1.113883.3.989.2.1.3.4",   # approval/NDA
        "2.16.840.1.113883.3.989.2.1.3.11",  # sender
        "2.16.840.1.113883.3.989.2.1.3.12",  # receiver
        "2.16.840.1.113883.3.989.2.1.3.13",  # DUNS OID
        "2.16.840.1.113883.3.989.2.1.3.14",  # ZZFDATST
        "2.16.840.1.113883.3.989.2.1.3.16",  # ACK receiver
        "2.16.840.1.113883.3.989.2.1.3.17",  # ACK sender
        "2.16.840.1.113883.3.989.2.1.3.18",  # ACK receiver 2
        "2.16.840.1.113883.3.989.2.1.3.19",  # ACK report id
        "2.16.840.1.113883.3.989.2.1.3.20",  # ACK batch
        "2.16.840.1.113883.3.989.2.1.3.21",  # ACK local msg
        "2.16.840.1.113883.3.989.2.1.3.22",  # batch number
        "1.3.6.1.4.1.519.1",                 # DUNS
        "2.16.840.1.113883.4.9",             # UNII
        "2.16.840.1.113883.6.69",            # NDC
    }
    try:
        from lxml import etree as _lxml27
        _lt27 = _lxml27.parse(xml_path)
        _lr27 = _lt27.getroot()
        _NS27 = "urn:hl7-org:v3"
        _id_els = _lr27.findall(f'.//{{{_NS27}}}id[@root]')
        _bad_roots = []
        for _el in _id_els:
            _r = _el.get("root", "")
            if not _r:
                continue
            if _r in _KNOWN_ROOTS:
                continue
            _is_oid  = bool(_OID_RE.match(_r))
            _is_uuid = bool(_UUID_RE.match(_r))
            if not (_is_oid or _is_uuid):
                _parent_tag = _el.getparent().tag.split("}")[-1] if _el.getparent() is not None else "?"
                _ext = _el.get("extension", "")
                _bad_roots.append(
                    f"root={_r!r} (parent=<{_parent_tag}>"
                    + (f" ext={_ext!r}" if _ext else "")
                    + f") — not a valid OID or RFC 4122 v1-5 UUID"
                )
        _n_checked = len(_id_els)
        chk(
            f"All <id root> values are valid OIDs or RFC 4122 v1-5 UUIDs ({_n_checked} checked)",
            len(_bad_roots) == 0,
            "; ".join(_bad_roots[:5]) or "all valid"
            if _bad_roots else f"all {_n_checked} root values are valid OIDs or UUIDs"
        )
        if _bad_roots:
            for _br in _bad_roots:
                warn("Invalid <id root> — will cause 'Incorrect Root ID' rejection at FDA FAERS 2.18", _br)
    except ImportError:
        warn("lxml not installed — Section 27 UUID/OID check skipped", "pip install lxml")
    except Exception as _e27:
        warn("Section 27 id-root check error", str(_e27))

    # ── 28. Seriousness flags — all 7 required per reaction ──────────────────
    print("\n[ SECTION 28: Seriousness flags — all 7 required per reaction (E.i.3.2) ]")
    # Reference: FDA FAERS 2.18 Business Rules; E2B(R3) ICH guideline E2B(R3)
    # Each reaction observation (code=29) must contain ALL of the following
    # outboundRelationship2 sub-observations.  A missing flag is an "Element
    # Required" rejection. An incorrectly typed value is a "Value not allowed"
    # rejection.  This section was identified as the largest "false safety" gap
    # in the linter — Section 8 only checked effectiveTime and MedDRA code, so
    # a reaction could be missing all seriousness flags and still PASS.
    #
    # Required codes + OIDs:
    #   34  resultsInDeath                  OID .3.989.2.1.1.19
    #   21  isLifeThreatening               OID .3.989.2.1.1.19
    #   33  requiresInpatientHospitalization OID .3.989.2.1.1.19
    #   35  resultsInPersistentOrSignificantDisability OID .3.989.2.1.1.19
    #   12  congenitalAnomalyBirthDefect    OID .3.989.2.1.1.19
    #   26  otherMedicallyImportantCondition OID .3.989.2.1.1.19
    #    7  requiredIntervention            OID .3.989.5.1.2.2.1.3  (FDA-specific)
    #
    # Each value must be xsi:type="BL" with value="true" or value="false"
    # (or nullFlavor="NI" when unknown).
    _SER_FLAGS = [
        ("34",  "2.16.840.1.113883.3.989.2.1.1.19", "resultsInDeath"),
        ("21",  "2.16.840.1.113883.3.989.2.1.1.19", "isLifeThreatening"),
        ("33",  "2.16.840.1.113883.3.989.2.1.1.19", "requiresInpatientHospitalization"),
        ("35",  "2.16.840.1.113883.3.989.2.1.1.19", "resultsInPersistentOrSignificantDisability"),
        ("12",  "2.16.840.1.113883.3.989.2.1.1.19", "congenitalAnomalyBirthDefect"),
        ("26",  "2.16.840.1.113883.3.989.2.1.1.19", "otherMedicallyImportantCondition"),
        ("7",   "2.16.840.1.113883.3.989.5.1.2.2.1.3", "requiredIntervention"),
    ]
    try:
        _reactions28 = root.findall(
            f'.//{{{NS}}}observation[@classCode="OBS"][@moodCode="EVN"]'
        )
        _rxn_obs = [r for r in _reactions28
                    if r.find(f'{{{NS}}}code[@code="29"]') is not None]
        if not _rxn_obs:
            warn("Section 28: No reaction observations (code=29) found — seriousness check skipped")
        for _ri, _rxn in enumerate(_rxn_obs, 1):
            _rxn_code = _rxn.find(f'{{{NS}}}code')
            _rxn_mdr = ga(_rxn_code, "displayName") or ga(_rxn_code, "code") or f"reaction[{_ri}]"
            # Collect all outboundRelationship2 child observations
            _ser_obs = {}
            for _ob2 in _rxn.findall(f'{{{NS}}}outboundRelationship2'):
                _obs_el = _ob2.find(f'{{{NS}}}observation')
                if _obs_el is None:
                    continue
                _c = _obs_el.find(f'{{{NS}}}code')
                if _c is None:
                    continue
                _key = (ga(_c, "code"), ga(_c, "codeSystem"))
                _ser_obs[_key] = _obs_el
            for (_fc, _foid, _fname) in _SER_FLAGS:
                _found = _ser_obs.get((_fc, _foid))
                _present = _found is not None
                chk(
                    f"E.i.3.2 rxn[{_ri}] ({_rxn_mdr}): {_fname} (code={_fc}) present",
                    _present,
                    f"Missing outboundRelationship2/observation[code={_fc} codeSystem={_foid}]. "
                    "All 7 seriousness flags are mandatory per FDA FAERS 2.18 Business Rules."
                    if not _present else f"present"
                )
                if _present:
                    _val_el = _found.find(f'{{{NS}}}value')
                    if _val_el is None:
                        chk(
                            f"E.i.3.2 rxn[{_ri}] ({_rxn_mdr}): {_fname} value present",
                            False,
                            f"<value> element missing inside seriousness observation code={_fc}"
                        )
                    else:
                        _vtype = _val_el.get(f'{{{XSI}}}type', '')
                        _vval  = _val_el.get('value', '')
                        _vnull = _val_el.get('nullFlavor', '')
                        _ok_val = (
                            'BL' in _vtype and (_vval in ('true','false') or _vnull)
                        )
                        chk(
                            f"E.i.3.2 rxn[{_ri}] ({_rxn_mdr}): {_fname} value is BL true/false",
                            _ok_val,
                            f"xsi:type={_vtype!r} value={_vval!r} nullFlavor={_vnull!r} — "
                            "must be xsi:type='BL' with value='true' or value='false' "
                            "(or nullFlavor='NI')"
                            if not _ok_val else f"BL value={_vval!r}"
                        )
    except Exception as _e28:
        warn("Section 28 seriousness-flags check error", str(_e28))

    # ── 29. causalityAssessment UUID cross-reference integrity ────────────────
    print("\n[ SECTION 29: causalityAssessment UUID cross-reference integrity ]")
    # ROOT CAUSE PREVENTION:
    #   TC-M10 v10 CR+AR was caused by invalid UUID format (fixed by Section 27).
    #   This section prevents the NEXT class of failure: a *valid* UUID that simply
    #   does not match any real drug or reaction in the document.  Such a mismatch
    #   would produce exactly the same "Incorrect Root ID" FDA rejection but would
    #   pass Section 27 because the UUID format is valid.
    #
    #   DUAL-FORMAT NOTE (TC-M12 learning):
    #   FDA FAERS 2.18 accepts TWO drug organizer formats:
    #     (A) NEW: organizer code=4 on .3.989.2.1.1.20 + causalityAssessment code=20/39
    #              Drug role declared via causalityAssessment code=20 (interventionCharacterization)
    #              substanceAdministration must have <id root="uuid"/> for cross-reference
    #     (B) LEGACY: organizer code="suspect"/"concomitant" on .3.989.2.1.1.13
    #              Drug role declared in organizer/code itself; no causalityAssessment code=20/39
    #              NO substanceAdministration/id needed
    #   Section 29 only runs the UUID cross-reference checks when format (A) is detected.
    #   When format (B) is in use, causalityAssessment code=20/39 blocks are absent and
    #   there is nothing to cross-reference; skip silently.
    #
    #   Cross-reference rules (format A only):
    #     code=20 (interventionCharacterization):
    #       subject2/productUseReference/id[@root] must match
    #       a substanceAdministration/id[@root] inside a drug organizer (code=4 on .1.20)
    #     code=39 (causality):
    #       subject2/productUseReference/id[@root] must match a drug UUID (as above)
    #       subject1/adverseEffectReference/id[@root] must match a reaction
    #       observation[code=29]/id[@root]
    #
    #   Additional check (format A only):
    #     Every drug substanceAdministration UUID must have AT LEAST ONE corresponding
    #     code=20 block, otherwise the drug role is never declared.
    try:
        from lxml import etree as _lxml29
        _lt29 = _lxml29.parse(xml_path)
        _lr29 = _lt29.getroot()
        _NS29 = "urn:hl7-org:v3"

        # Detect format: look for causalityAssessment code=20 blocks
        _ca20_blocks = [
            _ca for _ca in _lr29.findall(f'.//{{{_NS29}}}causalityAssessment[@classCode="OBS"][@moodCode="EVN"]')
            if _ca.find(f'{{{_NS29}}}code[@code="20"]') is not None
        ]
        _using_new_format = len(_ca20_blocks) > 0

        if not _using_new_format:
            info("Drug organizer format", "LEGACY (organizer string codes on .1.1.13) — "
                 "Section 29 UUID cross-reference checks skipped (N/A for legacy format)")
        else:
            info("Drug organizer format", "NEW (code=4 on .1.1.20 + causalityAssessment code=20/39) — "
                 "running UUID cross-reference checks")

            # Collect all drug substanceAdministration UUIDs
            # (inside organizer[code=4 on OID .1.20]/component/substanceAdministration)
            _drug_uuids = set()
            _drug_sa_info = {}  # uuid → drug name
            for _org in _lr29.findall(f'.//{{{_NS29}}}organizer[@classCode="CATEGORY"][@moodCode="EVN"]'):
                _oc = _org.find(f'{{{_NS29}}}code[@code="4"]')
                if _oc is None:
                    continue
                _ocs = _oc.get("codeSystem","")
                if "989.2.1.1.20" not in _ocs:
                    continue
                for _sa in _org.findall(f'.//{{{_NS29}}}substanceAdministration'):
                    _sa_id = _sa.find(f'{{{_NS29}}}id')
                    if _sa_id is not None:
                        _u = _sa_id.get("root","")
                        if _u:
                            _drug_uuids.add(_u)
                            # Try to find drug name
                            _nm = _sa.find(f'.//{{{_NS29}}}kindOfProduct/{{{_NS29}}}name')
                            _drug_sa_info[_u] = _nm.text.strip() if (_nm is not None and _nm.text) else "?"

            # Collect all reaction observation UUIDs (observation[code=29]/id)
            _rxn_uuids = set()
            for _obs in _lr29.findall(f'.//{{{_NS29}}}observation[@classCode="OBS"][@moodCode="EVN"]'):
                _oc29 = _obs.find(f'{{{_NS29}}}code[@code="29"]')
                if _oc29 is None:
                    continue
                _oid29 = _obs.find(f'{{{_NS29}}}id')
                if _oid29 is not None:
                    _u = _oid29.get("root","")
                    if _u:
                        _rxn_uuids.add(_u)

            info(f"Drug UUIDs found", f"{len(_drug_uuids)}: {sorted(_drug_uuids)}")
            info(f"Reaction UUIDs found", f"{len(_rxn_uuids)}: {sorted(_rxn_uuids)}")

            # Validate code=20 productUseReference cross-refs
            _ca20_drug_refs = []
            for _ca in _ca20_blocks:
                _s2 = _ca.find(f'{{{_NS29}}}subject2/{{{_NS29}}}productUseReference/{{{_NS29}}}id')
                _ref = _s2.get("root","") if _s2 is not None else ""
                _ca20_drug_refs.append(_ref)
                _match = _ref in _drug_uuids
                chk(
                    f"CA code=20 productUseReference root={_ref[:18]}... resolves to a known drug UUID",
                    _match,
                    f"UUID {_ref!r} does not match any substanceAdministration/id root. "
                    f"Known drug UUIDs: {sorted(_drug_uuids)}"
                    if not _match else f"matches drug '{_drug_sa_info.get(_ref,'?')}'"
                )

            # Check every drug UUID has at least one code=20 block
            _covered = set(_ca20_drug_refs)
            for _du in sorted(_drug_uuids):
                chk(
                    f"Drug UUID {_du[:18]}... ({_drug_sa_info.get(_du,'?')}) has ≥1 code=20 causalityAssessment",
                    _du in _covered,
                    f"No interventionCharacterization (code=20) block references this drug. "
                    "Drug role (Suspect/Concomitant) will be unknown to FDA engine."
                    if _du not in _covered else "referenced in code=20 block"
                )

            # Validate code=39 cross-refs (drug + reaction)
            for _ca39 in _lr29.findall(f'.//{{{_NS29}}}causalityAssessment[@classCode="OBS"][@moodCode="EVN"]'):
                _cc39 = _ca39.find(f'{{{_NS29}}}code[@code="39"]')
                if _cc39 is None:
                    continue
                _s2_39 = _ca39.find(f'{{{_NS29}}}subject2/{{{_NS29}}}productUseReference/{{{_NS29}}}id')
                _s1_39 = _ca39.find(f'{{{_NS29}}}subject1/{{{_NS29}}}adverseEffectReference/{{{_NS29}}}id')
                _drug_ref39 = _s2_39.get("root","") if _s2_39 is not None else ""
                _rxn_ref39  = _s1_39.get("root","") if _s1_39 is not None else ""
                chk(
                    f"CA code=39 subject2 (drug) root={_drug_ref39[:18]}... resolves to a known drug UUID",
                    _drug_ref39 in _drug_uuids,
                    f"UUID {_drug_ref39!r} does not match any drug. Known: {sorted(_drug_uuids)}"
                    if _drug_ref39 not in _drug_uuids else
                    f"matches drug '{_drug_sa_info.get(_drug_ref39,'?')}'"
                )
                chk(
                    f"CA code=39 subject1 (reaction) root={_rxn_ref39[:18]}... resolves to a known reaction UUID",
                    bool(_rxn_ref39) and _rxn_ref39 in _rxn_uuids,
                    f"UUID {_rxn_ref39!r} does not match any reaction observation. "
                    f"Known rxn UUIDs: {sorted(_rxn_uuids)}"
                    if not (bool(_rxn_ref39) and _rxn_ref39 in _rxn_uuids) else
                    "resolves to a reaction observation"
                )
                chk(
                    f"CA code=39 has both subject1 (adverseEffect) and subject2 (product)",
                    bool(_s2_39 is not None and _s1_39 is not None),
                    "code=39 causality block is missing subject1 (adverseEffectReference) "
                    "and/or subject2 (productUseReference) — both are required"
                    if not (_s2_39 is not None and _s1_39 is not None) else "both subjects present"
                )

    except ImportError:
        warn("lxml not installed — Section 29 cross-reference check skipped", "pip install lxml")
    except Exception as _e29:
        warn("Section 29 causalityAssessment cross-ref check error", str(_e29))

    # ── 30. Drug organizer structure — dual-format validation ────────────────
    print("\n[ SECTION 30: Drug organizer structure — legacy or new format ]")
    # FDA FAERS 2.18 DUAL-FORMAT EVIDENCE (TC-M12 learning):
    #   LEGACY format: organizer code="suspect"/"concomitant"/"interacting"/"notadministered"
    #                  codeSystem="2.16.840.1.113883.3.989.2.1.1.13"
    #                  → Drug role declared in organizer code itself
    #                  → Accepted by FDA FAERS 2.18 (TC-M09 / v9 CA+AA confirmed)
    #   NEW format:    organizer code="4" codeSystem="2.16.840.1.113883.3.989.2.1.1.20"
    #                  + causalityAssessment code=20 (interventionCharacterization)
    #                  → Drug role declared via causalityAssessment, not organizer
    #                  → substanceAdministration must have <id root="uuid"/> for cross-ref
    #                  → Correct per E2B(R3) IG but requires valid OID root for drug IDs
    #   BOTH patterns are accepted.  What is INVALID: mixing without cross-reference,
    #   or using a codeSystem that doesn't match either expected OID.
    _DRUG_INFO_OID   = "2.16.840.1.113883.3.989.2.1.1.20"
    _LEGACY_ROLE_OID = "2.16.840.1.113883.3.989.2.1.1.13"
    _VALID_LEGACY_CODES = {"suspect", "concomitant", "interacting", "notadministered"}
    try:
        _all_orgs30 = root.findall(
            f'.//{{{NS}}}organizer[@classCode="CATEGORY"][@moodCode="EVN"]'
        )
        _legacy_found = []    # list of valid string-code organizers
        _legacy_bad   = []    # string-code organizers with unrecognised code values
        _new_format_count = 0
        for _org30 in _all_orgs30:
            _oc30 = _org30.find(f'{{{NS}}}code')
            if _oc30 is None:
                continue
            _c30  = ga(_oc30, "code")
            _cs30 = ga(_oc30, "codeSystem") or ""
            if _LEGACY_ROLE_OID in _cs30:
                if _c30 in _VALID_LEGACY_CODES:
                    _legacy_found.append(f"code={_c30!r}")
                else:
                    _legacy_bad.append(f"code={_c30!r} codeSystem={_cs30!r}")
            if _DRUG_INFO_OID in _cs30 and _c30 == "4":
                _new_format_count += 1

        _has_legacy = len(_legacy_found) > 0
        _has_new    = _new_format_count > 0

        # At least one of the two valid formats must be present
        chk(
            "Drug organizer: at least one valid format present (legacy .1.13 string codes OR new code=4 on .1.1.20)",
            _has_legacy or _has_new,
            "No valid drug organizer found. Expect either organizer code='suspect'/'concomitant' "
            f"codeSystem='.3.989.2.1.1.13' OR organizer code='4' codeSystem='.3.989.2.1.1.20'. "
            f"legacy={_legacy_found}, new={_new_format_count}"
            if not (_has_legacy or _has_new) else
            f"legacy format: {_legacy_found or 'none'}; new format count: {_new_format_count}"
        )

        # Must not mix formats in the same document (ambiguous drug role resolution)
        chk(
            "Drug organizer: formats not mixed (no simultaneous legacy + new format)",
            not (_has_legacy and _has_new),
            f"MIXED FORMAT: found {len(_legacy_found)} legacy organizer(s) AND "
            f"{_new_format_count} code=4 organizer(s). Use one format consistently."
            if _has_legacy and _has_new else
            f"single format: {'legacy' if _has_legacy else 'new (code=4)'}"
        )

        # If legacy format, all string codes must be from the valid set
        if _legacy_bad:
            chk(
                "Legacy drug organizer codes are valid values (suspect/concomitant/interacting/notadministered)",
                False,
                f"Unrecognised legacy code value(s): {_legacy_bad}. "
                f"Valid values: {sorted(_VALID_LEGACY_CODES)}"
            )
        elif _has_legacy:
            chk(
                "Legacy drug organizer codes are valid values (suspect/concomitant/interacting/notadministered)",
                True, f"All {len(_legacy_found)} legacy organizer(s) have valid codes: {_legacy_found}"
            )

        if _has_new:
            info("New-format drug organizers", f"{_new_format_count} organizer(s) with code=4 on .3.989.2.1.1.20")
        if _has_legacy:
            info("Legacy-format drug organizers", f"{len(_legacy_found)} organizer(s) with string role codes on .3.989.2.1.1.13")

    except Exception as _e30:
        warn("Section 30 drug organizer check error", str(_e30))

    # ── 31. C.2.r sourceReport block — unconditional presence check ───────────
    print("\n[ SECTION 31: C.2.r sourceReport (SPRT code=2) — unconditional presence ]")
    # BUG FIX in linter:
    #   Section 16 gates all sourceReport checks behind is_followup=True.
    #   Initial reports (version extension = "1") got a blind PASS:
    #   "Initial report (no follow-up checks required)".
    #   This was wrong — C.2.r sourceReport is required for ALL submissions,
    #   not just follow-ups.  An initial report without sourceReport passes the
    #   linter but is rejected by FDA FAERS 2.18 with "Tags Missing: C.2.r".
    #
    #   Required structure:
    #     investigationEvent/outboundRelationship[@typeCode="SPRT"]
    #       /relatedInvestigation/code[@code="2"][@codeSystem=".3.989.2.1.1.22"]
    #   With inside it:
    #     subjectOf2/controlActEvent/author/assignedEntity
    #       /assignedPerson/asQualifiedEntity/code[@codeSystem=".3.989.2.1.1.6"]
    #     priorityNumber[@value]  (C.2.r sequence number)
    _SPRT_OID = "2.16.840.1.113883.3.989.2.1.1.22"
    _QUAL_OID = "2.16.840.1.113883.3.989.2.1.1.6"
    _QUAL_CODES = {"1","2","3","4","5"}  # physician, pharmacist, other HCP, lawyer, consumer
    _QUAL_LABELS = {
        "1":"Physician","2":"Pharmacist","3":"Other HCP","4":"Lawyer","5":"Consumer/non-HCP"
    }
    try:
        _ie31 = root.find(f'.//{{{NS}}}investigationEvent')
        _sprt_any    = []   # ALL outboundRelationship[@typeCode="SPRT"] blocks (any code)
        _sprt_blocks = []   # Only code=2 (sourceReport / C.2.r) blocks — for detail checks
        if _ie31 is not None:
            for _ob31 in _ie31.findall(f'{{{NS}}}outboundRelationship[@typeCode="SPRT"]'):
                _ri31 = _ob31.find(f'{{{NS}}}relatedInvestigation')
                if _ri31 is None:
                    continue
                _rc31 = _ri31.find(f'{{{NS}}}code')
                _sprt_any.append(_ob31)
                if ga(_rc31,"code") == "2" and _SPRT_OID in (ga(_rc31,"codeSystem") or ""):
                    _sprt_blocks.append(_ob31)
        # Empirical evidence: 27 older golden files have only SPRT code=1 (initialReport)
        # and all received CA+AA.  The TC-M07 rejection was because NO SPRT block existed.
        # Requirement: at least ONE SPRT block (code=1 initialReport OR code=2 sourceReport).
        _sprt_codes_found = []
        for _ob31a in _sprt_any:
            _ri31a = _ob31a.find(f'{{{NS}}}relatedInvestigation')
            _rc31a = _ri31a.find(f'{{{NS}}}code') if _ri31a is not None else None
            _c31a  = ga(_rc31a, "code") if _rc31a is not None else "?"
            _sprt_codes_found.append(_c31a)
        chk(
            "At least one SPRT outboundRelationship (initialReport code=1 or sourceReport code=2) present",
            len(_sprt_any) > 0,
            f"No outboundRelationship[@typeCode='SPRT'] found under investigationEvent. "
            f"At least one SPRT block (code=1 initialReport or code=2 sourceReport) is required. "
            "Absence causes 'Tags Missing: C.2.r / C.1.9' rejection."
            if not _sprt_any else
            f"found {len(_sprt_any)} SPRT block(s) with code(s)={_sprt_codes_found}"
        )
        # Detail checks for C.2.r sourceReport (code=2) blocks — only when present
        for _si, _sprt31 in enumerate(_sprt_blocks, 1):
            _pn31 = _sprt31.find(f'{{{NS}}}priorityNumber')
            chk(
                f"C.2.r[{_si}] priorityNumber present",
                _pn31 is not None and ga(_pn31,"value") is not None,
                "priorityNumber element or value attribute missing — required for C.2.r sequence"
                if not (_pn31 is not None and ga(_pn31,"value") is not None)
                else f"value={ga(_pn31,'value')!r}"
            )
            _ri31 = _sprt31.find(f'{{{NS}}}relatedInvestigation')
            _aq31 = _ri31.find(
                f'.//{{{NS}}}asQualifiedEntity/{{{NS}}}code'
            ) if _ri31 is not None else None
            if _aq31 is None:
                chk(
                    f"C.2.r[{_si}] reporter qualification (asQualifiedEntity/code) present",
                    False,
                    f"asQualifiedEntity/code not found inside C.2.r sourceReport block. "
                    f"C.2.r.4 reporter qualification is required."
                )
            else:
                _qcs = ga(_aq31,"codeSystem") or ""
                _qc  = ga(_aq31,"code") or ""
                chk(
                    f"C.2.r[{_si}] qualification codeSystem = .3.989.2.1.1.6",
                    _QUAL_OID in _qcs,
                    f"codeSystem={_qcs!r} — expected OID containing '.3.989.2.1.1.6'"
                    if _QUAL_OID not in _qcs else f"OID correct ({_qcs})"
                )
                chk(
                    f"C.2.r[{_si}] qualification code ∈ {{1=Physician,2=Pharmacist,"
                    "3=Other HCP,4=Lawyer,5=Consumer}}",
                    _qc in _QUAL_CODES,
                    f"code={_qc!r} not in valid set {{1,2,3,4,5}}. "
                    "Invalid qualification code causes 'Element value not allowed' rejection."
                    if _qc not in _QUAL_CODES else
                    f"code={_qc!r} ({_QUAL_LABELS.get(_qc,'?')})"
                )
    except Exception as _e31:
        warn("Section 31 C.2.r sourceReport check error", str(_e31))

    # ── 32. H-section author codes (H.2, H.3.r, H.4, H.5.r) ──────────────────
    print("\n[ SECTION 32: H-section author codes ]")
    # ROOT CAUSE of TC-M09 H.3.r fix:
    #   H.3.r senderDiagnosis had author displayName="primaryReporter" (code=1 is sender,
    #   not primary reporter — code=3 is sourceReporter).  This was a misattribution.
    #   Fixed in TC-M09 → TC-M10 patch.  This section prevents regression.
    #
    #   Required author codes (OID 2.16.840.1.113883.3.989.2.1.1.21):
    #     H.2  reporter comment:         observationEvent code=10, author code=3 (sourceReporter)
    #                                    (inside adverseEventAssessment as component1)
    #     H.3.r senderDiagnosis:         observationEvent code=15, author code=1 (sender)
    #     H.4  sender comment:           observationEvent code=10, author code=1 (sender)
    #                                    (inside adverseEventAssessment as component1)
    #     H.5.r case summary (reporter): observationEvent code=10, author code=2 (reporter)
    #                                    (outside adverseEventAssessment)
    #   Note: H.2 (reporter comment) uses observationEvent code=10 OUTSIDE adverseEventAssessment.
    #   H.4 (sender comment) uses the same code=10 INSIDE adverseEventAssessment (component1).
    #   Both use the same element name and code — distinguished only by their container.
    #
    # Note on displayName: FDA engine validates the code value, not displayName.
    # displayName is informational only.  The code must be correct.
    _AUTHOR_OID = "2.16.840.1.113883.3.989.2.1.1.21"
    _AUTHOR_LABELS = {"1":"sender","2":"reporter","3":"sourceReporter"}
    _EXPECTED_AUTHOR = {
        "15": "1",   # H.3.r senderDiagnosis → sender
    }
    try:
        # Find adverseEventAssessment container
        _aea32 = root.find(f'.//{{{NS}}}adverseEventAssessment')

        # H.3.r: observationEvent code=15 inside adverseEventAssessment
        if _aea32 is not None:
            for _comp1 in _aea32.findall(f'{{{NS}}}component1'):
                _oe32 = _comp1.find(f'{{{NS}}}observationEvent')
                if _oe32 is None:
                    continue
                _oc32 = _oe32.find(f'{{{NS}}}code')
                _ocode = ga(_oc32,"code")
                _auth32 = _oe32.find(f'.//{{{NS}}}assignedEntity/{{{NS}}}code')
                _acode = ga(_auth32,"code") or ""
                _acs   = ga(_auth32,"codeSystem") or ""
                if _ocode == "15":  # H.3.r senderDiagnosis
                    chk(
                        "H.3.r senderDiagnosis (code=15): author codeSystem=.3.989.2.1.1.21",
                        _AUTHOR_OID in _acs,
                        f"author codeSystem={_acs!r} — expected OID '.3.989.2.1.1.21'"
                        if _AUTHOR_OID not in _acs else f"OID correct"
                    )
                    chk(
                        "H.3.r senderDiagnosis (code=15): author must be code=1 (sender)",
                        _acode == "1",
                        f"author code={_acode!r} ({_AUTHOR_LABELS.get(_acode,'?')}) — "
                        "must be code='1' (sender). Using code='3' (sourceReporter) misattributes "
                        "the diagnosis to the reporter instead of the sender."
                        if _acode != "1" else f"code='1' (sender) ✓"
                    )
                elif _ocode == "10":  # H.4 sender comment inside adverseEventAssessment
                    chk(
                        "H.4 sender comment (code=10 in adverseEventAssessment): author must be code=1 (sender)",
                        _acode == "1",
                        f"author code={_acode!r} — must be '1' (sender). "
                        "H.4 sender comments inside adverseEventAssessment must be attributed to the sender."
                        if _acode != "1" else f"code='1' (sender) ✓"
                    )

        # H.2 reporter comment: observationEvent code=10 OUTSIDE adverseEventAssessment
        # (direct component child of PORR investigationEvent, not inside adverseEventAssessment)
        _ie32 = root.find(f'.//{{{NS}}}investigationEvent')
        if _ie32 is not None:
            for _comp32 in _ie32.findall(f'{{{NS}}}component'):
                _oe32b = _comp32.find(f'{{{NS}}}observationEvent')
                if _oe32b is None:
                    continue
                _oc32b = _oe32b.find(f'{{{NS}}}code')
                if ga(_oc32b,"code") != "10":
                    continue
                _auth32b = _oe32b.find(f'.//{{{NS}}}assignedEntity/{{{NS}}}code')
                _acode32b = ga(_auth32b,"code") or ""
                _acs32b   = ga(_auth32b,"codeSystem") or ""
                chk(
                    "H.2 reporter comment (code=10 outside adverseEventAssessment): "
                    "author must be code=3 (sourceReporter)",
                    _acode32b == "3",
                    f"author code={_acode32b!r} ({_AUTHOR_LABELS.get(_acode32b,'?')}) — "
                    "must be '3' (sourceReporter). H.2 is the reporter's own comment."
                    if _acode32b != "3" else f"code='3' (sourceReporter) ✓"
                )

    except Exception as _e32:
        warn("Section 32 H-section author check error", str(_e32))

    # ── 33. C.1.3 ICH report type value code + codeSystem ────────────────────
    print("\n[ SECTION 33: C.1.3 value code {1,2,3,4} + codeSystem (GAP-O02, GAP-O17) ]")
    _C13_VAL_CODES = {"1","2","3","4"}
    _C13_VAL_OID   = "2.16.840.1.113883.3.989.2.1.1.2"
    _C13_LABELS    = {"1":"Spontaneous","2":"Report from study","3":"Other","4":"Not available"}
    try:
        _c13_ic = None
        for _obs in root.findall(f'.//{{{NS}}}investigationCharacteristic[@classCode="OBS"][@moodCode="EVN"]'):
            _ic_code = _obs.find(f'{{{NS}}}code')
            if ga(_ic_code,"code") == "1" and "1.1.23" in (ga(_ic_code,"codeSystem") or ""):
                _c13_ic = _obs
                break
        if _c13_ic is None:
            warn("Section 33","ICH report type investigationCharacteristic (code=1 on .1.1.23) not found — skipping C.1.3 value checks")
        else:
            _c13_val = _c13_ic.find(f'{{{NS}}}value')
            chk(
                "C.1.3 (ICH report type) value element present",
                _c13_val is not None,
                "No <value> element in ICH report type investigationCharacteristic"
                if _c13_val is None else "present"
            )
            if _c13_val is not None:
                _c13_code = ga(_c13_val,"code") or ""
                _c13_cs   = ga(_c13_val,"codeSystem") or ""
                chk(
                    "C.1.3 value code ∈ {1=Spontaneous,2=Study,3=Other,4=NA} on OID .3.989.2.1.1.2",
                    _c13_code in _C13_VAL_CODES,
                    f"code={_c13_code!r} not in valid set {{1,2,3,4}}" if _c13_code not in _C13_VAL_CODES
                    else f"code={_c13_code!r} ({_C13_LABELS.get(_c13_code,'?')})"
                )
                chk(
                    "C.1.3 value codeSystem = .3.989.2.1.1.2 (not .3.989.2.1.1.23)",
                    _C13_VAL_OID in _c13_cs,
                    f"codeSystem={_c13_cs!r} — expected '.3.989.2.1.1.2'. "
                    "Using .3.989.2.1.1.23 (the outer code OID) on the value is a copy-paste error."
                    if _C13_VAL_OID not in _c13_cs else f"OID correct ({_c13_cs})"
                )
    except Exception as _e33:
        warn("Section 33 C.1.3 value check error",str(_e33))

    # ── 34. C.1.4 effectiveTime IVL_TS + low element ─────────────────────────
    print("\n[ SECTION 34: C.1.4 investigationEvent effectiveTime (IVL_TS + low) (GAP-O03) ]")
    try:
        _ie34 = root.find(f'.//{{{NS}}}investigationEvent')
        _et34 = _ie34.find(f'{{{NS}}}effectiveTime') if _ie34 is not None else None
        chk(
            "C.1.4 investigationEvent effectiveTime present",
            _et34 is not None,
            "No <effectiveTime> in investigationEvent" if _et34 is None else "present"
        )
        if _et34 is not None:
            _XSI = "http://www.w3.org/2001/XMLSchema-instance"
            _et_type = ga(_et34,f"{{{_XSI}}}type") or ""
            _et_low  = _et34.find(f'{{{NS}}}low')
            chk(
                "C.1.4 effectiveTime xsi:type=IVL_TS",
                "IVL_TS" in _et_type,
                f"xsi:type={_et_type!r} — must be 'IVL_TS'. A flat value= without IVL_TS "
                "type is rejected by FDA FAERS 2.18."
                if "IVL_TS" not in _et_type else "xsi:type=IVL_TS ✓"
            )
            chk(
                "C.1.4 effectiveTime has <low value=> child (onset date)",
                _et_low is not None and ga(_et_low,"value") is not None,
                "Missing <low value='YYYYMMDD'/> inside effectiveTime IVL_TS"
                if not (_et_low is not None and ga(_et_low,"value") is not None)
                else f"low={ga(_et_low,'value')!r} ✓"
            )
    except Exception as _e34:
        warn("Section 34 C.1.4 effectiveTime check error",str(_e34))

    # ── 35. C.1.9 initialReport first-sender code ─────────────────────────────
    print("\n[ SECTION 35: C.1.9 initialReport first-sender (author code=1 on .3.989.2.1.1.3) (GAP-O06) ]")
    _SENDER_OID_35 = "2.16.840.1.113883.3.989.2.1.1.3"
    try:
        _ie35 = root.find(f'.//{{{NS}}}investigationEvent')
        _init_blocks_35 = []
        if _ie35 is not None:
            for _ob35 in _ie35.findall(f'{{{NS}}}outboundRelationship[@typeCode="SPRT"]'):
                _ri35 = _ob35.find(f'{{{NS}}}relatedInvestigation')
                if _ri35 is None:
                    continue
                _rc35 = _ri35.find(f'{{{NS}}}code')
                if ga(_rc35,"code") == "1" and "1.1.22" in (ga(_rc35,"codeSystem") or ""):
                    _init_blocks_35.append((_ob35, _ri35))
        chk(
            "C.1.9 initialReport outboundRelationship[SPRT code=1] present",
            len(_init_blocks_35) > 0,
            "No outboundRelationship[@typeCode='SPRT']/relatedInvestigation/code[@code='1'] "
            "found. C.1.9 initial-report first-sender block is required for all submissions."
            if not _init_blocks_35 else f"found {len(_init_blocks_35)} initialReport block(s)"
        )
        for _si35, (_ob35, _ri35) in enumerate(_init_blocks_35, 1):
            _auth35 = _ri35.find(f'.//{{{NS}}}assignedEntity/{{{NS}}}code')
            chk(
                f"C.1.9[{_si35}] first-sender assignedEntity/code present",
                _auth35 is not None,
                "assignedEntity/code not found inside initialReport subjectOf2/controlActEvent/author"
                if _auth35 is None else "present"
            )
            if _auth35 is not None:
                _ac35  = ga(_auth35,"code") or ""
                _acs35 = ga(_auth35,"codeSystem") or ""
                chk(
                    f"C.1.9[{_si35}] first-sender code=1 (regulator) on OID .3.989.2.1.1.3",
                    _ac35 == "1" and _SENDER_OID_35 in _acs35,
                    f"code={_ac35!r} codeSystem={_acs35!r} — expected code='1' on OID '.3.989.2.1.1.3'"
                    if not (_ac35 == "1" and _SENDER_OID_35 in _acs35) else "code='1' (regulator) ✓"
                )
    except Exception as _e35:
        warn("Section 35 C.1.9 initialReport check error",str(_e35))

    # ── 36-38. G.k.8 action taken + G.k.9.i/ii dechallenge/rechallenge ───────
    print("\n[ SECTION 36-38: G.k.8 action taken + G.k.9.i dechallenge + G.k.9.ii rechallenge "
          "(GAP-O10,O11,O12) ]")
    _GK_ACT_CODES  = {"0","1","2","3","4","5","6"}
    _GK_ACT_LABELS = {"0":"Unknown","1":"Drug withdrawn","2":"Dose reduced","3":"Dose increased",
                      "4":"Dose not changed","5":"Not applicable","6":"Unknown"}
    _GK_DC_CODES   = {"1","2","3","4"}
    _GK_DC_LABELS  = {"1":"Pos dechallenge","2":"No","3":"Unknown","4":"N/A"}
    _GK_RC_CODES   = {"1","2","3","4"}
    _GK_RC_LABELS  = {"1":"Pos rechallenge","2":"No","3":"Unknown","4":"N/A"}
    try:
        _act_obs = [
            _o for _o in root.findall(f'.//{{{NS}}}observation[@classCode="OBS"][@moodCode="EVN"]')
            if ga(_o.find(f'{{{NS}}}code'),"code") == "C41341"
            and "3.26.1.1" in (ga(_o.find(f'{{{NS}}}code'),"codeSystem") or "")
        ]
        _dc_obs = [
            _o for _o in root.findall(f'.//{{{NS}}}observation[@classCode="OBS"][@moodCode="EVN"]')
            if ga(_o.find(f'{{{NS}}}code'),"code") == "C49492"
        ]
        _rc_obs = [
            _o for _o in root.findall(f'.//{{{NS}}}observation[@classCode="OBS"][@moodCode="EVN"]')
            if ga(_o.find(f'{{{NS}}}code'),"code") == "C49494"
        ]
        if not _act_obs:
            info("Section 36: G.k.8 action taken","no action-taken observations found (optional field)")
        for _i36, _obs36 in enumerate(_act_obs, 1):
            _v36  = _obs36.find(f'{{{NS}}}value')
            _vc36 = ga(_v36,"code") or ""
            _vcs36= ga(_v36,"codeSystem") or ""
            chk(
                f"G.k.8[{_i36}] action taken code ∈ {{0-6}} on OID .3.989.2.1.1.15",
                _vc36 in _GK_ACT_CODES and "1.1.15" in _vcs36,
                f"code={_vc36!r} codeSystem={_vcs36!r} — expected code in {{0-6}} on OID '.3.989.2.1.1.15'"
                if not (_vc36 in _GK_ACT_CODES and "1.1.15" in _vcs36)
                else f"code={_vc36!r} ({_GK_ACT_LABELS.get(_vc36,'?')})"
            )
        if not _dc_obs:
            info("Section 37: G.k.9.i dechallenge","no dechallenge observations found (optional field)")
        for _i37, _obs37 in enumerate(_dc_obs, 1):
            _v37  = _obs37.find(f'{{{NS}}}value')
            _vc37 = ga(_v37,"code") or ""
            _vcs37= ga(_v37,"codeSystem") or ""
            chk(
                f"G.k.9.i[{_i37}] dechallenge code ∈ {{1-4}} on OID .3.989.2.1.1.16",
                _vc37 in _GK_DC_CODES and "1.1.16" in _vcs37,
                f"code={_vc37!r} codeSystem={_vcs37!r} — expected code in {{1,2,3,4}} on OID '.3.989.2.1.1.16'"
                if not (_vc37 in _GK_DC_CODES and "1.1.16" in _vcs37)
                else f"code={_vc37!r} ({_GK_DC_LABELS.get(_vc37,'?')})"
            )
        if not _rc_obs:
            info("Section 38: G.k.9.ii rechallenge","no rechallenge observations found (optional field)")
        for _i38, _obs38 in enumerate(_rc_obs, 1):
            _v38  = _obs38.find(f'{{{NS}}}value')
            _vc38 = ga(_v38,"code") or ""
            _vcs38= ga(_v38,"codeSystem") or ""
            chk(
                f"G.k.9.ii[{_i38}] rechallenge code ∈ {{1-4}} on OID .3.989.2.1.1.17",
                _vc38 in _GK_RC_CODES and "1.1.17" in _vcs38,
                f"code={_vc38!r} codeSystem={_vcs38!r} — expected code in {{1,2,3,4}} on OID '.3.989.2.1.1.17'"
                if not (_vc38 in _GK_RC_CODES and "1.1.17" in _vcs38)
                else f"code={_vc38!r} ({_GK_RC_LABELS.get(_vc38,'?')})"
            )
    except Exception as _e36:
        warn("Section 36-38 G.k.8/G.k.9 value-set check error",str(_e36))

    # ── 39. E.i.3.1 termHighlighted value-set ────────────────────────────────
    print("\n[ SECTION 39: E.i.3.1 termHighlighted by reporter (code=37 on .1.1.19) (GAP-O07) ]")
    _TH_VAL_OID  = "2.16.840.1.113883.3.989.2.1.1.10"
    _TH_CODES    = {"1","2","3"}
    _TH_LABELS   = {"1":"Yes, highlighted","2":"No","3":"No but SERIOUS"}
    try:
        _th_obs = [
            _o for _o in root.findall(f'.//{{{NS}}}observation[@classCode="OBS"][@moodCode="EVN"]')
            if ga(_o.find(f'{{{NS}}}code'),"code") == "37"
            and "1.1.19" in (ga(_o.find(f'{{{NS}}}code'),"codeSystem") or "")
        ]
        if not _th_obs:
            info("Section 39: E.i.3.1 termHighlighted","no termHighlighted observations found (optional field)")
        for _i39, _obs39 in enumerate(_th_obs, 1):
            _v39  = _obs39.find(f'{{{NS}}}value')
            _vc39 = ga(_v39,"code") or ""
            _vcs39= ga(_v39,"codeSystem") or ""
            chk(
                f"E.i.3.1[{_i39}] termHighlighted code ∈ {{1=Yes,2=No,3=No but SERIOUS}} on OID .3.989.2.1.1.10",
                _vc39 in _TH_CODES and _TH_VAL_OID in _vcs39,
                f"code={_vc39!r} codeSystem={_vcs39!r} — expected code in {{1,2,3}} on OID '.3.989.2.1.1.10'"
                if not (_vc39 in _TH_CODES and _TH_VAL_OID in _vcs39)
                else f"code={_vc39!r} ({_TH_LABELS.get(_vc39,'?')})"
            )
    except Exception as _e39:
        warn("Section 39 termHighlighted check error",str(_e39))

    # ── 40. statusCode code="active" in investigationEvent ───────────────────
    print("\n[ SECTION 40: investigationEvent statusCode code=active (GAP-O24) ]")
    try:
        _ie40  = root.find(f'.//{{{NS}}}investigationEvent')
        _sc40  = _ie40.find(f'{{{NS}}}statusCode') if _ie40 is not None else None
        chk(
            "investigationEvent/statusCode[@code='active'] present",
            _sc40 is not None and ga(_sc40,"code") == "active",
            "statusCode missing or code!='active' — absence causes gateway parse failure"
            if not (_sc40 is not None and ga(_sc40,"code") == "active") else "code='active' ✓"
        )
    except Exception as _e40:
        warn("Section 40 statusCode check error",str(_e40))

    # ── 41. PORR processingCode="P" + acceptAckCode="AL" ─────────────────────
    print("\n[ SECTION 41: PORR processingCode=P + acceptAckCode=AL (GAP-O15, GAP-O16) ]")
    try:
        _pc41  = root.find(f'.//{{{NS}}}processingCode')
        _aac41 = root.find(f'.//{{{NS}}}acceptAckCode')
        chk(
            "PORR processingCode present and code='P'",
            _pc41 is not None and ga(_pc41,"code") == "P",
            "processingCode missing or code!='P' — required in every PORR block"
            if not (_pc41 is not None and ga(_pc41,"code") == "P") else "code='P' ✓"
        )
        chk(
            "PORR acceptAckCode present and code='AL'",
            _aac41 is not None and ga(_aac41,"code") == "AL",
            "acceptAckCode missing or code!='AL' — controls whether gateway sends ACK; "
            "wrong value may suppress ACK delivery"
            if not (_aac41 is not None and ga(_aac41,"code") == "AL") else "code='AL' ✓"
        )
    except Exception as _e41:
        warn("Section 41 processingCode/acceptAckCode check error",str(_e41))

    # ── 42. creationTime UTC offset format ────────────────────────────────────
    print("\n[ SECTION 42: creationTime UTC offset (YYYYMMDDHHMMSS±HHMM required) (GAP-O21) ]")
    _UTC_PAT = re.compile(r'\d{14}[+-]\d{4}$')
    try:
        _ct_els = root.findall(f'.//{{{NS}}}creationTime')
        _ct_root = root.find(f'{{{NS}}}creationTime')
        if _ct_root is not None and _ct_root not in _ct_els:
            _ct_els = [_ct_root] + _ct_els
        if not _ct_els:
            warn("Section 42","no creationTime elements found")
        for _i42, _ct42 in enumerate(_ct_els, 1):
            _ctv = ga(_ct42,"value") or ""
            chk(
                f"creationTime[{_i42}] includes UTC offset (YYYYMMDDHHMMSS±HHMM)",
                bool(_UTC_PAT.match(_ctv)),
                f"value={_ctv!r} — must be 14 digits + UTC offset (e.g. '20260101120000-0500'). "
                "Bare date or timestamp without offset is non-compliant."
                if not _UTC_PAT.match(_ctv) else f"value={_ctv!r} ✓"
            )
    except Exception as _e42:
        warn("Section 42 creationTime format check error",str(_e42))

    # ── 43-44. responseModeCode + interactionId extension values ──────────────
    print("\n[ SECTION 43-44: responseModeCode=D + interactionId extensions (GAP-O22, GAP-O23) ]")
    try:
        _rmc43 = root.find(f'{{{NS}}}responseModeCode') or root.find(f'.//{{{NS}}}responseModeCode')
        chk(
            "responseModeCode present and code='D'",
            _rmc43 is not None and ga(_rmc43,"code") == "D",
            "responseModeCode missing or code!='D'" if not (_rmc43 is not None and ga(_rmc43,"code") == "D")
            else "code='D' ✓"
        )
        _wiid43 = root.find(f'{{{NS}}}interactionId')
        chk(
            "Wrapper interactionId extension='MCCI_IN200100UV01'",
            _wiid43 is not None and ga(_wiid43,"extension") == "MCCI_IN200100UV01",
            f"extension={ga(_wiid43,'extension')!r} — expected 'MCCI_IN200100UV01'"
            if not (_wiid43 is not None and ga(_wiid43,"extension") == "MCCI_IN200100UV01")
            else "extension='MCCI_IN200100UV01' ✓"
        )
        _porr_iid43 = None
        for _iid43 in root.findall(f'.//{{{NS}}}interactionId'):
            if "PORR" in (ga(_iid43,"extension") or ""):
                _porr_iid43 = _iid43
                break
        _pext43 = ga(_porr_iid43,"extension") if _porr_iid43 is not None else None
        _pext43_disp = repr(_pext43) if _pext43 is not None else "NOT FOUND"
        chk(
            "PORR interactionId extension='PORR_IN049016UV'",
            _porr_iid43 is not None and _pext43 == "PORR_IN049016UV",
            f"PORR interactionId extension={_pext43_disp} — expected 'PORR_IN049016UV'"
            if not (_porr_iid43 is not None and _pext43 == "PORR_IN049016UV")
            else "extension='PORR_IN049016UV' ✓"
        )
    except Exception as _e43:
        warn("Section 43-44 responseModeCode/interactionId check error",str(_e43))

    # ── 45-46. Patient name (D.1) + administrativeGenderCode (D.5) ───────────
    print("\n[ SECTION 45-46: Patient name (D.1) + administrativeGenderCode (D.5) (GAP-O25, GAP-O26) ]")
    _GENDER_OID_46   = "1.0.5218"
    _GENDER_CODES_46 = {"0","1","2"}
    _GENDER_LABELS_46 = {"0":"Unknown","1":"Male","2":"Female"}
    try:
        _player45 = root.find(f'.//{{{NS}}}player1')
        _pname45  = _player45.find(f'{{{NS}}}name') if _player45 is not None else None
        chk(
            "Patient name (D.1) present in player1/name",
            _pname45 is not None and (_pname45.text or "").strip() != "",
            "player1/name absent or empty — D.1 patient initials/identifier required"
            if not (_pname45 is not None and (_pname45.text or "").strip() != "")
            else f"name={(_pname45.text or '').strip()!r} ✓"
        )
        _agc46 = root.find(f'.//{{{NS}}}administrativeGenderCode')
        chk(
            "administrativeGenderCode (D.5) present",
            _agc46 is not None,
            "administrativeGenderCode missing — D.5 patient sex is required"
            if _agc46 is None else "present"
        )
        if _agc46 is not None:
            _gc46  = ga(_agc46,"code") or ""
            _gcs46 = ga(_agc46,"codeSystem") or ""
            chk(
                "administrativeGenderCode code ∈ {0=Unknown,1=Male,2=Female} on codeSystem 1.0.5218",
                _gc46 in _GENDER_CODES_46 and _GENDER_OID_46 in _gcs46,
                f"code={_gc46!r} codeSystem={_gcs46!r} — expected code in {{0,1,2}} on codeSystem '1.0.5218'"
                if not (_gc46 in _GENDER_CODES_46 and _GENDER_OID_46 in _gcs46)
                else f"code={_gc46!r} ({_GENDER_LABELS_46.get(_gc46,'?')}) ✓"
            )
    except Exception as _e45:
        warn("Section 45-46 patient name/gender check error",str(_e45))

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
