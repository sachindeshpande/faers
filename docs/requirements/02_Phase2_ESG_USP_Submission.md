# Phase 2: FDA Submission via ESG NextGen USP

## Requirements Specification for Claude Code

**Version:** 2.0  
**Phase:** 2 of 12  
**Estimated Duration:** 4-6 weeks  
**Prerequisites:** Phase 1 (Core ICSR MVP) completed

---

## 1. Phase Overview

### 1.1 Objective

Enable users to submit ICSRs to FDA through the ESG NextGen Unified Submission Portal (USP) by generating properly formatted XML export packages and tracking submission status. This phase provides a production-ready submission capability without requiring API integration, suitable for low-to-medium volume submissions where users manually upload XML files via the FDA web portal.

### 1.2 Success Criteria

- [ ] Users can generate FDA-ready XML export packages
- [ ] Export packages meet FDA formatting requirements
- [ ] Users can track which cases have been submitted
- [ ] Users can record FDA acknowledgment information
- [ ] Submission history is maintained for each case
- [ ] Dashboard shows submission status overview

### 1.3 Out of Scope for Phase 2

- Automated API transmission to ESG (Phase 2B)
- Automated acknowledgment retrieval (Phase 2B)
- Multi-user support (Phase 3)
- Batch submission of multiple cases (Phase 4)
- User authentication (Phase 3)

### 1.4 Dependencies

- **Phase 1 Complete**: Case management, data entry, validation, and XML generation
- **FDA ESG NextGen Account**: User must have ESG NextGen account (free registration)

---

## 2. Background Information

### 2.1 FDA ESG NextGen Unified Submission Portal (USP)

The ESG NextGen Unified Submission Portal is FDA's web-based interface for manually uploading electronic submissions. Key characteristics:

- Free to use, requires ESG NextGen account registration
- Accepts E2B(R3) XML file uploads
- Provides acknowledgment receipts (ACK1, ACK2, ACK3 or NACK)
- Suitable for low-to-medium volume submissions
- No API integration required
- Available at: https://www.fda.gov/industry/electronic-submissions-gateway → "Industry USP Log In"

**Important:** The Safety Reporting Portal (SRP) at safetyreporting.hhs.gov is a different system for manual data entry and does NOT accept XML file uploads.

### 2.2 Submission Workflow with ESG NextGen USP

1. User completes and validates case in application
2. User exports XML package from application
3. User logs into FDA ESG NextGen USP website
4. User uploads XML file through USP interface
5. FDA validates and provides acknowledgment
6. User records acknowledgment in application

### 2.3 Why USP Before API Integration?

| Aspect | ESG NextGen USP | ESG NextGen API |
|--------|-----------------|-----------------|
| Setup complexity | Simple (web account) | Moderate (API credentials, OAuth) |
| Cost | Free | Free |
| Volume suitability | Low to medium | Medium to high |
| Automation | Manual upload | Fully automated |
| Time to production | Days | Weeks |

### 2.4 Testing Your XML Before Submission

Before submitting to FDA, validate your XML using:

1. **FDA E2B(R3) Validator** (recommended first step)
   - URL: https://faers2-validator.preprod.fda.gov/LSMV/Validator
   - Upload XML, get instant validation results
   - No account required
   - Files are not stored

2. **ESG NextGen Test Submission**
   - Use same ESG NextGen portal
   - Use test routing identifiers in your XML:
     - Batch Receiver (N.1.4): `ZZFDA` (postmarket) or `ZZFDA_PREMKT` (premarket)
   - Receive test acknowledgments
   - Once FDA approves test, switch to production routing

---

## 3. Functional Requirements

### 3.1 Export Package Generation

#### REQ-EXP-001: Generate FDA Export Package
```
As a user
I want to generate an export package for FDA ESG NextGen USP
So that I can submit my case through the portal

Acceptance Criteria:
- "Export for FDA" action available for validated cases
- System validates case before allowing export
- If validation fails, show errors and prevent export
- If validation passes, generate export package containing:
  - E2B(R3) XML file (from Phase 1)
  - Properly formatted filename per FDA conventions
- User selects save location
- Package saved to selected location
- Case marked as "Exported" with timestamp
```

#### REQ-EXP-002: FDA Filename Convention
```
As the system
I need to name export files per FDA requirements
So that FDA can process them correctly

Filename Format:
- Pattern: {SenderID}_{Date}_{SequenceNumber}.xml
- Example: COMPANY123_20260115_001.xml

Acceptance Criteria:
- Sender ID configurable in settings
- Date in YYYYMMDD format
- Sequence number auto-incremented per day
- Filename shown to user before export
- User can override filename if needed
```

#### REQ-EXP-003: Export Package Contents
```
As the system
I need to generate a complete export package
So that the user has everything needed for FDA submission

Package Contents:
- E2B(R3) XML file (validated against schema)
- README.txt with:
  - Case ID
  - Export timestamp
  - Brief submission instructions
  - Link to FDA ESG NextGen portal

Acceptance Criteria:
- All files in a single folder or ZIP (user choice)
- XML passes schema validation before export
- README provides clear next steps
```

#### REQ-EXP-004: Re-export Capability
```
As a user
I want to re-export a case if needed
So that I can handle resubmissions or corrections

Acceptance Criteria:
- Previously exported cases can be exported again
- System warns that case was previously exported
- Each export recorded in submission history
- New export gets new sequence number
```

#### REQ-EXP-005: Test vs Production Export Mode
```
As a user
I want to choose between Test and Production export modes
So that I can validate my XML with FDA before submitting production data

Background:
For ESG NextGen USP (web upload), the same XML routing identifiers are used 
for both test and production submissions. The test vs production distinction 
is made when you select "Test Submission" or "Production Submission" in the 
USP portal during upload.

However, our application should still track whether an export is INTENDED 
for test or production, to help users manage their workflow.

Routing Identifiers (same for test and production via USP):
| Report Type | Batch Receiver (N.1.4) | Message Receiver (N.2.r.3) |
|-------------|------------------------|---------------------------|
| Postmarket  | ZZFDA                  | CDER or CBER              |
| Premarket   | ZZFDA_PREMKT           | CDER_IND or CBER_IND      |

Acceptance Criteria:
- Setting to select intended environment: Test or Production
- Setting accessible from:
  - Application settings/preferences
  - Export dialog (with ability to change)

Test Mode:
- Export marked as "For Test Submission"
- Clear visual indicator in UI showing "TEST MODE" (e.g., banner, badge, color)
- Export filename includes "_TEST" suffix (e.g., COMPANY123_20260115_001_TEST.xml)
- README.txt clearly states "THIS IS A TEST SUBMISSION - Select 'Test Submission' in USP"
- Dashboard/case list indicates test exports differently

Production Mode:
- Export marked as "For Production Submission"
- No test indicators in filename or UI
- First-time production export shows warning confirmation:
  "You are about to export for PRODUCTION submission to FDA. 
   When uploading to USP, select 'Production Submission'.
   This will be submitted to the live FAERS database. Continue?"
- Requires explicit confirmation checkbox

Default Behavior:
- New installations default to Test mode for safety
- Changing to Production mode requires confirmation
- Current mode clearly visible at all times

Submission History:
- Each export records whether it was Test or Production
- History clearly distinguishes test vs production exports
```

#### REQ-EXP-006: Premarket vs Postmarket Selection
```
As a user
I want to indicate if my submission is premarket or postmarket
So that the correct routing identifiers are used

Acceptance Criteria:
- Setting to select report type: Premarket or Postmarket
- Affects routing identifiers:
  - Postmarket Test: ZZFDA
  - Postmarket Production: FDA_AERS
  - Premarket Test: ZZFDA_PREMKT
  - Premarket Production: (appropriate premarket identifier)
- Setting can be configured globally or per-case
- Default to Postmarket (most common use case)
```

### 3.2 Case Status Management

#### REQ-STAT-001: Extended Case Status
```
As the system
I need to track submission-related case statuses
So that users know where each case is in the process

New Status Values (extending Phase 1):
- Draft: Case in progress (from Phase 1)
- Ready for Export: Validated and ready to export
- Exported: XML generated and ready for USP upload
- Submitted: User confirms uploaded to USP
- Acknowledged: FDA acknowledgment recorded
- Rejected: FDA rejected submission (needs correction)

Status Transitions:
- Draft → Ready for Export: When validation passes
- Ready for Export → Exported: When XML exported
- Ready for Export → Draft: If user needs to edit
- Exported → Submitted: When user confirms USP upload
- Exported → Draft: If user needs to edit before upload
- Submitted → Acknowledged: When user records FDA ACK
- Submitted → Rejected: When FDA rejects (NACK)
- Rejected → Draft: For correction and resubmission
```

#### REQ-STAT-002: Mark Ready for Export
```
As a user
I want to mark a case as ready for export
So that I can prepare cases for submission

Acceptance Criteria:
- "Mark Ready" action available for Draft cases
- System runs full validation before allowing
- If validation fails, show errors and prevent status change
- If validation passes, change status to "Ready for Export"
- Case becomes read-only (must return to Draft to edit)
```

#### REQ-STAT-003: Record Submission Confirmation
```
As a user
I want to record that I uploaded a case to FDA
So that I can track what has been submitted

Acceptance Criteria:
- "Mark as Submitted" action for Exported cases
- User enters:
  - Submission date (defaults to today)
  - ESG confirmation/Core ID (if available)
  - Notes (optional)
- Status changes to "Submitted"
- Submission timestamp recorded
```

#### REQ-STAT-004: Record FDA Acknowledgment
```
As a user
I want to record FDA's response to my submission
So that I have a complete audit trail

Acceptance Criteria:
- "Record Acknowledgment" action for Submitted cases
- User can record:
  - Acknowledgment type (Accepted/Rejected)
  - FDA Case Number (if provided)
  - Acknowledgment date
  - Notes or error details (for rejections)
- For Accepted: Status changes to "Acknowledged"
- For Rejected: Status changes to "Rejected"
- All details stored in submission history
```

#### REQ-STAT-005: Return to Draft
```
As a user
I want to return a case to Draft status
So that I can make corrections

Acceptance Criteria:
- Available for: Ready for Export, Exported, Rejected
- User confirms the action
- Case returns to Draft and becomes editable
- Previous submission history preserved
- Must re-validate before next export
```

### 3.3 Submission History

#### REQ-HIST-001: Submission History Log
```
As a user
I want to view the complete submission history for a case
So that I can track all submission activity

History Events Recorded:
- Case created
- Marked ready for export
- Returned to draft
- Exported (with filename and timestamp)
- Marked as submitted (with ESG confirmation)
- Acknowledgment recorded (with FDA response)
- Any status change

For Each Event:
- Timestamp
- Event type
- Details (filename, confirmation number, etc.)
- Notes

Acceptance Criteria:
- History tab in case detail view
- Chronological list of all events
- Read-only (cannot be modified)
- Export history to PDF or text file
```

#### REQ-HIST-002: Submission Dashboard
```
As a user
I want an overview of all submission activity
So that I can monitor my workload

Dashboard Shows:
- Cases by status (counts):
  - Draft
  - Ready for Export
  - Exported (awaiting upload)
  - Submitted (awaiting acknowledgment)
  - Acknowledged
  - Rejected (needs attention)
- Cases needing attention:
  - Exported but not submitted (> 24 hours)
  - Submitted but no acknowledgment (> 7 days)
  - Rejected cases
- Recent activity feed (last 10 events)

Acceptance Criteria:
- Dashboard accessible from main navigation
- Click on any count to filter case list
- Refresh to update counts
- Activity feed shows timestamp and case ID
```

#### REQ-HIST-003: Case List Enhancements
```
As a user
I want to see submission information in the case list
So that I can quickly identify status

Acceptance Criteria:
- New columns:
  - Submission Status
  - Export Date
  - Submission Date
  - Acknowledgment Date
- Filter by submission status
- Filter "Needs Attention" (exported not submitted, etc.)
- Sort by any submission column
```

### 3.4 Settings and Configuration

#### REQ-SET-001: Sender Configuration
```
As a user
I want to configure my sender information
So that exports use correct identification

Settings:
- Sender ID (used in filename)
- Sender Organization Name
- Sender Contact Information
- Default values for E2B sender section (A.3)

Acceptance Criteria:
- Settings accessible from menu
- Sender ID required before first export
- Settings saved and persisted
- Default sender info auto-populates new cases
```

#### REQ-SET-002: Export Preferences
```
As a user
I want to configure export preferences
So that exports work the way I need

Settings:
- Default export location
- Export format (folder or ZIP)
- Include README file (yes/no)
- Auto-open export folder after export

Acceptance Criteria:
- Settings accessible from menu
- Settings saved and persisted
- Defaults applied to all exports
```

#### REQ-SET-003: Submission Environment Configuration
```
As a user
I want to configure my submission environment
So that I can test before going to production

Settings:
- Submission Environment: Test / Production
- Report Type: Postmarket / Premarket
- Target Center: CDER / CBER

Environment Effects on XML:
| Report Type | Batch Receiver (N.1.4) | Message Receiver (N.2.r.3) |
|-------------|------------------------|---------------------------|
| Postmarket  | ZZFDA                  | CDER or CBER              |
| Premarket   | ZZFDA_PREMKT           | CDER_IND or CBER_IND      |

Note: For ESG NextGen USP (web upload), the same routing identifiers 
are used for test and production. The test vs production distinction 
is made when selecting submission type in the USP portal.

For AS2 submissions only:
- Test: AS2-To header = ZZFDATST
- Production: AS2-To header = ZZFDA

Acceptance Criteria:
- Settings accessible from menu
- Default to Postmarket, CDER on new installation
- Current settings clearly visible throughout app
- Settings recorded with each export in history
```

### 3.5 ESG NextGen USP Guidance

#### REQ-GUIDE-001: USP Instructions
```
As a user
I want guidance on using FDA ESG NextGen USP
So that I can complete my submissions

Acceptance Criteria:
- Help section with USP instructions:
  - How to register for FDA ESG NextGen account
  - How to log into ESG NextGen USP
  - How to upload XML files
  - How to check submission status
  - How to retrieve acknowledgments
- Link to FDA ESG NextGen portal
- Link to FDA ESG NextGen user guide
- Tips for common issues
```

#### REQ-GUIDE-002: Export Wizard (Optional)
```
As a user
I want step-by-step guidance when exporting
So that I don't miss any steps

Wizard Steps:
1. Validate case (show results)
2. Generate export package
3. Display submission instructions
4. Confirm export complete

Acceptance Criteria:
- Optional wizard mode (can be disabled)
- Can skip to direct export if preferred
- Checklist of steps shown
- Links to ESG NextGen USP at appropriate step
```

---

## 4. User Interface Requirements

### 4.1 Export Interface

#### REQ-UI-EXP-001: Export Action
```
For cases in appropriate status, provide:
- "Export for FDA" button (Ready for Export cases)
- Clear indication of case status
- Current environment indicator (Test/Production)
- Validation summary before export
- Export progress indicator
- Success confirmation with file location
```

#### REQ-UI-EXP-002: Export Confirmation
```
After successful export, show:
- Success message
- Environment indicator (TEST or PRODUCTION)
- File location (with "Open Folder" option)
- Next steps reminder:
  - Log into FDA ESG NextGen USP
  - Upload the XML file
  - Record confirmation in this application
- Button to "Mark as Submitted" (for later)

For TEST exports, additionally show:
- Reminder: "This is a TEST export. Upload to FDA for validation only."
- Link to FDA E2B(R3) Validator for pre-submission check
```

### 4.2 Test/Production Mode Interface

#### REQ-UI-MODE-001: Environment Indicator
```
Display current submission environment prominently:

Test Mode:
- Banner or badge showing "TEST MODE" 
- Use distinct color (e.g., orange or yellow)
- Visible on main screen, export dialog, and dashboard

Production Mode:
- Subtle indicator showing "Production"
- Normal color scheme
- No distracting warnings once confirmed
```

#### REQ-UI-MODE-002: Environment Selection
```
In Settings, provide environment selection:
- Radio buttons or toggle: Test / Production
- Current selection clearly highlighted
- Description of each mode:
  - Test: "Submissions go to FDA test environment for validation"
  - Production: "Submissions go to live FAERS database"
- "Save" requires confirmation when switching to Production
```

#### REQ-UI-MODE-003: Production Mode Confirmation
```
When switching to Production mode OR first production export:
- Modal dialog with warning:
  "You are switching to PRODUCTION mode.
   
   Exports will generate XML for submission to the live FDA FAERS database.
   
   Make sure you have:
   ✓ Successfully completed test submissions
   ✓ Received FDA approval for production access
   ✓ Verified your sender configuration
   
   [ ] I understand this will submit to the live FDA system"
   
- Checkbox must be checked to enable "Confirm" button
- "Cancel" returns to Test mode
```

#### REQ-UI-MODE-004: Export Dialog Environment Display
```
Export dialog shows:
- Current environment (Test/Production) prominently
- Option to change environment before export
- If Production: reminder this goes to live system
- If Test: note about test routing identifiers
```

### 4.3 Status Recording Interface

#### REQ-UI-STAT-001: Submission Recording Dialog
```
When marking case as submitted:
- Date field (defaults to today)
- ESG Core ID / confirmation number field
- Notes field (optional)
- Save and Cancel buttons
```

#### REQ-UI-STAT-002: Acknowledgment Recording Dialog
```
When recording FDA acknowledgment:
- Acknowledgment type: Accepted / Rejected
- FDA Case Number field (for accepted)
- Acknowledgment date field
- Error details field (for rejected)
- Notes field
- Save and Cancel buttons
```

### 4.3 Dashboard Interface

#### REQ-UI-DASH-001: Submission Dashboard
```
Dashboard layout:
- Status summary cards with counts
- "Needs Attention" section highlighting issues
- Recent activity feed
- Quick action buttons (New Case, View All Cases)

All counts clickable to navigate to filtered case list
```

### 4.4 History Interface

#### REQ-UI-HIST-001: Submission History Panel
```
In case detail view:
- History tab showing all events
- Each event shows: timestamp, type, details
- Most recent events first
- Export history button
```

---

## 5. Validation Requirements

#### REQ-VAL-001: Pre-Export Validation
```
Before allowing export:
- Run all Phase 1 validations
- Run E2B(R3) compliance validation
- Run FDA-specific validation rules
- Display results with errors/warnings
- Block export if critical errors exist
- Allow export with warnings (user confirmation)
```

#### REQ-VAL-002: FDA-Specific Validation
```
Additional FDA validation rules:
- Verify sender ID is configured
- Verify all FDA-required fields present
- Check for FDA-specific formatting requirements
- Validate against FDA regional implementation guide
```

---

## 6. Audit Requirements

#### REQ-AUDIT-001: Export Audit Trail
```
Record all export-related activities:
- Export attempts (success and failure)
- Status changes
- Submission recordings
- Acknowledgment recordings

Each record includes:
- Timestamp
- Action taken
- Case ID
- Details (filename, confirmation numbers, etc.)

Audit trail is append-only and cannot be modified
```

---

## 7. Testing Requirements

### 7.1 Test Scenarios

- Export case with all required fields
- Export case with optional fields
- Attempt export with validation errors (should block)
- Export with warnings (should prompt)
- Re-export previously exported case
- Record submission confirmation
- Record acceptance acknowledgment
- Record rejection acknowledgment
- Return rejected case to draft and resubmit
- Dashboard counts accuracy
- History log completeness
- Filename generation with sequence numbers
- **Test mode export generates correct routing (ZZFDA)**
- **Production mode export generates correct routing (FDA_AERS)**
- **Switching from Test to Production requires confirmation**
- **Test exports include _TEST in filename**
- **Environment indicator visible in UI**

### 7.2 FDA Compatibility Testing

- Verify XML validates against FDA schema
- Verify filename follows FDA conventions
- Use FDA E2B(R3) Validator: https://faers2-validator.preprod.fda.gov/LSMV/Validator
- Test upload to FDA ESG NextGen USP (test environment)
- **Verify test XML has Batch Receiver = ZZFDA**
- **Verify production XML has Batch Receiver = FDA_AERS**

---

## 8. Acceptance Criteria Summary

### 8.1 Must Have
- [ ] Generate FDA-compliant XML export package
- [ ] Proper FDA filename conventions
- [ ] Pre-export validation with error/warning display
- [ ] Extended case status tracking
- [ ] Record submission confirmation
- [ ] Record FDA acknowledgment (accept/reject)
- [ ] Submission history log per case
- [ ] Return to draft for corrections
- [ ] **Test/Production environment selection**
- [ ] **Correct routing identifiers per environment (ZZFDA vs FDA_AERS)**
- [ ] **Visual indicator of current environment**
- [ ] **Production mode confirmation before first use**

### 8.2 Should Have
- [ ] Submission dashboard with status overview
- [ ] Case list columns for submission info
- [ ] Needs attention highlighting
- [ ] Export to ZIP option
- [ ] README with instructions in export
- [ ] Sender defaults configuration
- [ ] **Premarket/Postmarket selection**
- [ ] **Test filename suffix (_TEST)**

### 8.3 Nice to Have
- [ ] Export wizard with step-by-step guidance
- [ ] ESG NextGen USP instructions/help section
- [ ] Export history to PDF
- [ ] Bulk export multiple cases

---

## 9. References

- [FDA ESG NextGen Portal](https://www.fda.gov/industry/electronic-submissions-gateway)
- [FDA ESG NextGen USP User Guide](https://www.fda.gov/media/188809/download)
- [FDA E2B(R3) Validator](https://faers2-validator.preprod.fda.gov/LSMV/Validator)
- [FDA E2B(R3) Regional Implementation Guide](https://www.fda.gov/regulatory-information/search-fda-guidance-documents)
- FDA ESG Registration Guide: `FDA_ESG_Registration_Guide.md`
- Phase 1 Requirements: `01_Phase1_Core_ICSR_MVP.md`
- Application Overview: `00_FAERS_Application_Overview.md`

---

## Next Phase

After completing Phase 2, you have two paths:

**Path A: Phase 2B (ESG API Integration)** - If ready for automated high-volume submissions
- ESG NextGen API integration
- Automated transmission to FDA
- Automated acknowledgment retrieval

**Path B: Phase 3 (Multi-User & Workflow)** - If USP meets current volume needs
- User authentication
- Role-based access control
- Case review and approval workflows

Recommended: Proceed to Phase 3 and defer Phase 2B until volume justifies automation.
