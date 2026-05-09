# Golden Regression Test Results
Run date: 2026-05-09T00:22:58+00:00
Generator version: 5f58f4d
Backend: lxml

## Summary
| Result | Count |
|---|---|
| PASS | 30 |
| GATE FAILURE | 0 |
| LINT FAILURE | 0 |
| STRUCTURAL DIFF | 3 |
| SKIPPED | 3 |
| **Total scenarios** | **36** |

## Skipped Scenarios
- TC-A06-ethnicity-ni — No JSON input registered in manifest
- TC-F02-comboproduct — No JSON input registered in manifest
- TC-F04-ich-rpttype-2 — No JSON input registered in manifest

## Failures (detail)

### TC-A05-ethnicity-hispanic  (postmarket/accepted, ACK CA+AA)
- **Result:** STRUCTURAL DIFF
- **Diffs (33):**
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]` `child_count` golden=`5` generated=`6`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/consumable[1]` `tag` golden=`consumable` generated=`effectiveTime`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[2]` `tag` golden=`outboundRelationship2` generated=`consumable`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]` `@typeCode` golden=`COMP` generated=`RSON`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/code[1]` `@code` golden=`C41341` generated=`C41331`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/code[1]` `@displayName` golden=`Action Taken` generated=`Indication`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/value[2]` `@code` golden=`1` generated=`10039073`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/value[2]` `@codeSystem` golden=`2.16.840.1.113883.3.989.2.1.1.15` generated=`2.16.840.1.113883.6.163`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/value[2]` `@codeSystemVersion` golden=`(absent)` generated=`25.0`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/value[2]` `@displayName` golden=`(absent)` generated=`Rheumatoid arthritis`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[4]/observation[1]/code[1]` `@code` golden=`C49492` generated=`C41341`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[4]/observation[1]/code[1]` `@displayName` golden=`Dechallenge` generated=`Action Taken`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[4]/observation[1]/value[2]` `@code` golden=`3` generated=`1`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[4]/observation[1]/value[2]` `@codeSystem` golden=`2.16.840.1.113883.3.989.2.1.1.16` generated=`2.16.840.1.113883.3.989.2.1.1.15`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[5]/observation[1]/code[1]` `@code` golden=`C49494` generated=`C49492`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[5]/observation[1]/code[1]` `@displayName` golden=`Rechallenge` generated=`Dechallenge`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[10]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[5]/observation[1]/value[2]` `@codeSystem` golden=`2.16.840.1.113883.3.989.2.1.1.17` generated=`2.16.840.1.113883.3.989.2.1.1.16`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]` `child_count` golden=`5` generated=`6`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/consumable[1]` `tag` golden=`consumable` generated=`effectiveTime`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[2]` `tag` golden=`outboundRelationship2` generated=`consumable`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]` `@typeCode` golden=`COMP` generated=`RSON`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/code[1]` `@code` golden=`C41341` generated=`C41331`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/code[1]` `@displayName` golden=`Action Taken` generated=`Indication`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/value[2]` `@code` golden=`4` generated=`10020772`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/value[2]` `@codeSystem` golden=`2.16.840.1.113883.3.989.2.1.1.15` generated=`2.16.840.1.113883.6.163`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/value[2]` `@codeSystemVersion` golden=`(absent)` generated=`25.0`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[3]/observation[1]/value[2]` `@displayName` golden=`(absent)` generated=`Hypertension`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[4]/observation[1]/code[1]` `@code` golden=`C49492` generated=`C41341`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[4]/observation[1]/code[1]` `@displayName` golden=`Dechallenge` generated=`Action Taken`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[4]/observation[1]/value[2]` `@codeSystem` golden=`2.16.840.1.113883.3.989.2.1.1.16` generated=`2.16.840.1.113883.3.989.2.1.1.15`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[5]/observation[1]/code[1]` `@code` golden=`C49494` generated=`C49492`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[5]/observation[1]/code[1]` `@displayName` golden=`Rechallenge` generated=`Dechallenge`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[11]/organizer[1]/component[2]/substanceAdministration[1]/outboundRelationship2[5]/observation[1]/value[2]` `@codeSystem` golden=`2.16.840.1.113883.3.989.2.1.1.17` generated=`2.16.840.1.113883.3.989.2.1.1.16`

### TC-F03-nonexpedited  (postmarket/accepted, ACK CA+AA)
- **Result:** STRUCTURAL DIFF
- **Diffs (1):**
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[10]/adverseEventAssessment[1]/component[1]/causalityAssessment[1]/value[2]` `text` golden=`Variant of 2L8T baseline. TC-F03 fix v2: localCriteriaForExpedited=false, localCriteriaReportType=code 2 (Non-Expedited AE). SR-CASE-20260501-TCF03.` generated=`Variant of 2L8T baseline. Expedited flag set to false (A.1.9 = 2, non-expedited) for TC-F03. localReportTypeCode omitted.`

### TC-G01-nonserous  (postmarket/accepted, ACK CA+AA)
- **Result:** STRUCTURAL DIFF
- **Diffs (16):**
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/player1[1]/birthTime[3]` `@value` golden=`19700515` generated=`19750615`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[2]/observation[1]/value[2]` `@value` golden=`55` generated=`50`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[8]/observation[1]` `child_count` golden=`14` generated=`13`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[8]/observation[1]/outboundRelationship2[13]/observation[1]/code[1]` `@code` golden=`C83121` generated=`C49489`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[8]/observation[1]/outboundRelationship2[13]/observation[1]/code[1]` `@displayName` golden=`Seriousness` generated=`Outcome`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[8]/observation[1]/outboundRelationship2[13]/observation[1]/value[2]` `@code` golden=`otherMedicallyImportant` generated=`1`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[8]/observation[1]/outboundRelationship2[13]/observation[1]/value[2]` `@codeSystem` golden=`2.16.840.1.113883.3.989.2.1.1.19` generated=`2.16.840.1.113883.3.989.2.1.1.11`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[9]/observation[1]` `child_count` golden=`14` generated=`13`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[9]/observation[1]/outboundRelationship2[13]/observation[1]/code[1]` `@code` golden=`C83121` generated=`C49489`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[9]/observation[1]/outboundRelationship2[13]/observation[1]/code[1]` `@displayName` golden=`Seriousness` generated=`Outcome`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[9]/observation[1]/outboundRelationship2[13]/observation[1]/value[2]` `@code` golden=`hospitalization` generated=`6`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[9]/adverseEventAssessment[1]/subject1[1]/primaryRole[1]/subjectOf2[9]/observation[1]/outboundRelationship2[13]/observation[1]/value[2]` `@codeSystem` golden=`2.16.840.1.113883.3.989.2.1.1.19` generated=`2.16.840.1.113883.3.989.2.1.1.11`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[10]/adverseEventAssessment[1]/component[1]/causalityAssessment[1]/value[2]` `text` golden=`Patient experienced an adverse event approximately 60 days after initiation of Testdrugimab therapy for rheumatoid arthritis. Nausea resolved within 48 hours. No hospitalization required. Concomitant therapy with lisinopril continued without modification.` generated=`Variant of 2L8T baseline. All seriousness criteria set to false on both reactions (non-serious case) for TC-G01.`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[12]/observationEvent[1]/value[2]` `@value` golden=`false` generated=`true`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[13]/observationEvent[1]/value[2]` `@code` golden=`2` generated=`1`
  - `/MCCI_IN200100UV01/PORR_IN049016UV[6]/controlActProcess[9]/subject[3]/investigationEvent[1]/component[13]/observationEvent[1]/value[2]` `@displayName` golden=`Non-Expedited AE` generated=`15-Day`

## Full Pass List
- IND-T01-susar-baseline
- IND-T02-susar-repeat
- IND-T03-cross-ref-ind
- IND-T04-no-study-registration
- IND-T05-fatal-seven-day
- IND-T06-babe-test-reference
- IND-T07-followup-report
- TC-A01-race-white
- TC-A02-race-black
- TC-A03-race-amerindian
- TC-A04-race-hawaiian
- TC-B01-medhistory-empty
- TC-B02-medhistory-narrative
- TC-C01-reporter-qual-2
- TC-C02-reporter-qual-3
- TC-D01-action-dose-reduced
- TC-D02-actiontaken-3
- TC-D03-actiontaken-5
- TC-D04-dechallenge-1
- TC-D05-two-suspect-drugs
- TC-D06-concom-actiontaken-6
- TC-E01-weight-absent
- TC-E02-age-nullflavor
- TC-E03-patient-female
- TC-F01-followup-v3
- TC-G02-outcome-recovering
- TC-G03-outcome-sequelae
- TC-G04-fatal-outcome
- TC-H01-addldocs-true
- TC-H03-orgname-changed
