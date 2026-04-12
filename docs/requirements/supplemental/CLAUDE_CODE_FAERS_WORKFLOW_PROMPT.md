# Claude Code Prompt: DeepQuence FAERS Submission Workflow

## Task

Read `FAERS_Workflow_Engineering_Report.docx` (located in this folder) in full before
doing anything else. That document is the authoritative engineering record of the
DeepQuence FDA FAERS submission process, built from 37 submission iterations and
confirmed ACK responses from the CDER validation engine.

Using the report as your specification, implement the DeepQuence FAERS XML generation
and validation workflow. The report contains everything you need: the correct XML
structure, all field mappings, the full OID reference, the 55-check lint script
catalogue, the hard constraint rules with their ACK evidence, the ACK interpretation
guide, and a future submission checklist.

## Golden Reference Files (do not modify)

- `FAERS_Workflow_Engineering_Report.docx` — primary specification (read this first)
- `package/CASE-20260331-EMJQ_fixed_v37_patch.xml` — the accepted XML (Case CA + Batch AA)
- `acks/ci260410211359.1842efd7d3d24e7cbd5a9703e90bdebc.ack` — the acceptance ACK

## Definition of Done

The workflow is complete when a newly generated XML file, built from the patterns in the
report, passes all lint checks and can be submitted to FDA ESG NextGen TEST to receive
a Case CA + Batch AA response.
