**To:** Deepak Nelivigi  
**From:** Sachin  
**Subject:** FAERS ESG Test Update — TC-M05 & TC-M06 Accepted (Device Data, Parent/Neonatal Case)  

---

Hi Deepak,

Following up on your feedback about missing product, device, lab test, and patient data tags — we have completed two additional Mega test cases that address those gaps. Both have been accepted by the FAERS AERS TEST gateway (ZZFDATST) today.

**TC-M05 — CA+AA (Local #890069)**  
Built on TC-M04, this case adds five previously missing optional sections:

- **FDA.G.k.12.r** — Device data: malfunction flag, device problem code (NCI C54451), device usage (C54595), remedial action (C54594), lot number
- **G.k.10.1** — Specialised product subcategory (Type 2 prefilled device, NCI C102835)
- **G.k.7.r** — Drug indication via `inboundRelationship` (Rheumatoid arthritis, MedDRA 10039073)
- **H.4** — Sender's comments (free-text narrative from the sender)
- **D.9.4.r** — Autopsy-determined cause of death (Hepatic failure, MedDRA 10019663)

**TC-M06 — CA+AA (Local #805925)**  
A redesigned maternal/neonatal case that adds:

- **D.10** — Parent/mother data block: identity, age (28y), LMP, weight, height, medical history (Rheumatoid arthritis, continuing=true). Encoded as `role[@classCode="PRS"]` inside `player1`, confirmed against FDA's own Scenario6 reference file.
- **G.k.6a/b** — Gestation period at drug exposure (20 weeks), placed on the suspect drug's `substanceAdministration`
- **D.2.2.1a/b** — Patient gestation at time of birth (34 weeks premature), placed on the patient block

The case architecture: the mother (Sarah P.) received the suspect drug during pregnancy; the neonate (B.P., born 5 March 2026, 1.95 kg, 44 cm) experienced neonatal thrombocytopenia (hospitalisation) and low birth weight (recovering).

**Linter improvements:** TC-M06 required three submission attempts. Each rejection exposed a gap in our pre-submission validator, which we have now permanently closed:

| Version | Rejection | Root Cause | Linter Section Added |
|---------|-----------|------------|----------------------|
| v1 | SAX parse (schema ordering) | `role[@classCode="PRS"]` placed outside `player1` | Sec 22 — D.10 structural placement |
| v2 | E.i.7 business rule | `code="6"` (Unknown) used instead of `code="2"` (recovering/resolving) | Sec 23 — outcome value-set membership |
| v3 | ✅ CA+AA | — | — |

The updated FAERS Scenario Testing Results spreadsheet is attached — 35 scenarios complete, including TC-M01 through TC-M06.

Please let us know if there are any remaining gaps you would like us to address.

Best regards,  
Sachin
