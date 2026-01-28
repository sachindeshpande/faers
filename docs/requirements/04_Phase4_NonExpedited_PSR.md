# Phase 4: Non-Expedited Reports, Follow-Ups & Periodic Safety Reports

## Requirements Specification for Claude Code

**Version:** 1.0  
**Phase:** 4 of 12  
**Estimated Duration:** 2-3 months  
**Prerequisites:** Phase 1, Phase 2, and Phase 3 completed

---

## 1. Phase Overview

### 1.1 Objective

Extend the application to support the complete postmarketing safety reporting lifecycle including non-expedited (periodic) ICSRs, follow-up reports for existing cases, batch submissions, and Periodic Safety Report (PSR) management. This phase completes FDA postmarketing compliance capabilities for marketed drug products.

### 1.2 Success Criteria

- [ ] Non-expedited cases can be created with appropriate workflow
- [ ] Follow-up reports link to and version original cases
- [ ] Multiple cases can be submitted in a single batch
- [ ] PSR schedules can be configured per product
- [ ] PSR automatically aggregates non-expedited cases for a period
- [ ] PSR descriptive portion can be generated from templates
- [ ] Both PSR components (ICSRs + narrative) tracked together
- [ ] Nullification reports can be created for duplicates/errors

### 1.3 Out of Scope for Phase 4

- MedDRA auto-coding (Phase 5)
- Drug dictionary integration (Phase 5)
- Duplicate detection (Phase 5)
- Premarketing/IND reports (Phase 6)
- Cosmetics reporting (Phase 7)
- Advanced analytics (Phase 8)

### 1.4 Dependencies

- **Phase 1 Complete**: Core case management and E2B(R3) XML generation
- **Phase 2 Complete**: FDA submission via ESG NextGen USP
- **Phase 3 Complete**: Multi-user workflow and approvals

---

## 2. Background Information

### 2.1 Regulatory Context

FDA postmarketing safety reporting requirements (21 CFR 314.80 and 600.80):

| Report Type | Criteria | Timeline | Submission Method |
|-------------|----------|----------|-------------------|
| **15-Day Expedited** | Serious, unexpected | 15 calendar days | Individual ICSR |
| **15-Day Follow-up** | New info on expedited | 15 calendar days | Individual ICSR |
| **Non-Expedited** | Non-serious OR expected serious | With PSR | Batch with PSR |
| **PSR (PADER/PBRER)** | Aggregate safety summary | Quarterly/Annual | eCTD + ICSR batch |

### 2.2 Report Type Classification

```
                    ┌─────────────────┐
                    │  Adverse Event  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
        ┌─────┴─────┐                 ┌─────┴─────┐
        │  Serious  │                 │Non-Serious│
        └─────┬─────┘                 └─────┬─────┘
              │                             │
    ┌─────────┴─────────┐                   │
    │                   │                   │
┌───┴────┐        ┌─────┴────┐        ┌─────┴─────┐
│Unexpected│      │ Expected │        │Non-Expedited│
└───┬────┘        └────┬─────┘        └─────┬─────┘
    │                  │                    │
┌───┴────┐        ┌────┴─────┐        ┌─────┴─────┐
│15-Day  │        │Non-Expedited│     │  Include  │
│Expedited│       │(with PSR)  │      │  in PSR   │
└────────┘        └──────────┘        └───────────┘
```

### 2.3 Periodic Safety Report (PSR) Types

FDA accepts multiple PSR formats:

| Format | Full Name | Frequency | Content |
|--------|-----------|-----------|---------|
| **PADER** | Periodic Adverse Drug Experience Report | Quarterly (Yr 1-3), Annual (after) | US-specific format |
| **PSUR** | Periodic Safety Update Report | Per ICH E2C | ICH format (with FDA waiver) |
| **PBRER** | Periodic Benefit-Risk Evaluation Report | Per ICH E2C(R2) | ICH format (with FDA waiver) |

### 2.4 PSR Submission Components

A complete PSR submission includes:

1. **Descriptive Portion** (via eCTD)
   - Executive summary
   - Safety data analysis
   - Benefit-risk assessment
   - Submitted as PDF in eCTD Module 5

2. **ICSR Line Listing** (via E2B)
   - All non-expedited ICSRs for the period
   - Submitted as batch E2B(R3) XML via ESG
   - Must be submitted on same day as descriptive portion

### 2.5 E2B(R3) Report Type Values

The XML element C.1.7 (Report Type) indicates report classification:

| Value | Meaning | Use Case |
|-------|---------|----------|
| `1` | Spontaneous report | Standard expedited reports |
| `2` | Report from study | Clinical trial reports (Phase 6) |
| `3` | Other | Special circumstances |
| `4` | Not available | Unknown source |

The XML element FDA.C.1.8.1 (Local Criteria for Expedited Report) indicates:

| Value | Meaning |
|-------|---------|
| `1` | 15-Day Expedited |
| `2` | Periodic (Non-Expedited) |
| `4` | Remedial action |
| `5` | Malfunction without AE |

---

## 3. Functional Requirements

### 3.1 Report Type Selection

#### REQ-TYPE-001: Case Report Type
```
As a user
I want to classify a case as expedited or non-expedited
So that it follows the appropriate workflow and submission path

Report Types:
- Expedited (15-Day): Serious AND unexpected
- Non-Expedited (Periodic): Non-serious OR expected serious
- Follow-Up: Additional information for existing case
- Nullification: Withdraw/void a previously submitted case

Acceptance Criteria:
- Report type selection during case creation
- System suggests type based on seriousness/expectedness
- User can override suggested type with justification
- Type affects workflow, due dates, and submission path
- Type stored and included in XML (FDA.C.1.8.1)
```

#### REQ-TYPE-002: Seriousness Assessment
```
As a user
I want to document seriousness criteria
So that report type can be properly determined

Seriousness Criteria (E2B B.2.i.7):
- Results in death
- Is life-threatening
- Requires hospitalization or prolongs existing hospitalization
- Results in persistent or significant disability/incapacity
- Is a congenital anomaly/birth defect
- Other medically important condition

Acceptance Criteria:
- Checkbox for each seriousness criterion
- At least one checked = Serious case
- None checked = Non-serious case
- Seriousness affects report type suggestion
- Seriousness included in XML
```

#### REQ-TYPE-003: Expectedness Assessment
```
As a user
I want to document whether an event was expected
So that expedited reporting requirements are properly determined

Expectedness Fields:
- Expected per labeling? (Yes/No)
- Reference document (label section, IB reference)
- Justification for unexpected determination

Acceptance Criteria:
- Expectedness selection for each reaction
- If Serious + Unexpected = Suggest Expedited
- If Serious + Expected = Suggest Non-Expedited
- Expectedness justification captured
- Link to reference label/document (optional)
```

### 3.2 Non-Expedited Case Management

#### REQ-NONEXP-001: Non-Expedited Case Creation
```
As a user
I want to create non-expedited cases
So that they can be included in the next PSR

Acceptance Criteria:
- Same case form as expedited (Phase 1)
- Report type set to "Non-Expedited"
- No individual due date (tied to PSR schedule)
- Status shows "Pending PSR" after approval
- Case linked to product for PSR aggregation
- XML element FDA.C.1.8.1 set to "2" (Periodic)
```

#### REQ-NONEXP-002: Non-Expedited Workflow
```
As a user
I want non-expedited cases to follow simplified workflow
So that they are processed efficiently for PSR inclusion

Workflow States:
- Draft
- Ready for Review
- Under Review
- Approved
- Pending PSR (waiting for next PSR)
- Included in PSR (linked to specific PSR)
- Submitted (with PSR)
- Acknowledged

Acceptance Criteria:
- Approved cases automatically move to "Pending PSR"
- Cases stay in "Pending PSR" until PSR is created
- PSR creation moves cases to "Included in PSR"
- PSR submission moves cases to "Submitted"
- Individual submission not allowed for non-expedited
```

#### REQ-NONEXP-003: Non-Expedited Due Date
```
As a user
I want to see when non-expedited cases will be submitted
So that I can plan work accordingly

Acceptance Criteria:
- Non-expedited cases show "Next PSR Due" date
- Due date derived from product's PSR schedule
- Dashboard shows cases pending for upcoming PSR
- Warning when PSR deadline approaching with unprocessed cases
```

### 3.3 Follow-Up Reports

#### REQ-FU-001: Create Follow-Up Report
```
As a user
I want to create a follow-up report for an existing case
So that I can submit new information to FDA

Acceptance Criteria:
- "Create Follow-Up" action on submitted cases
- New case created linked to original
- Original case data copied to follow-up
- Follow-up number auto-incremented (FU1, FU2, etc.)
- Original case ID referenced in XML (C.1.9.1)
- Case version incremented
- Same submission type as original (expedited/non-expedited)
```

#### REQ-FU-002: Follow-Up Data Pre-Population
```
As a user
I want follow-up reports pre-populated with original data
So that I only need to add/modify changed information

Pre-Populated Fields:
- All patient information
- All product information
- All reaction information
- Reporter information
- Original narrative

Acceptance Criteria:
- All fields from original case copied
- User can modify any field
- System tracks which fields changed
- Narrative section for "additional information"
- Follow-up reason captured (see REQ-FU-003)
```

#### REQ-FU-003: Follow-Up Type
```
As a user
I want to specify the reason for the follow-up
So that FDA understands the purpose of the update

Follow-Up Types:
- Additional information received
- Outcome update (patient status changed)
- Correction to original report
- Response to FDA query
- Upgrade to serious
- Downgrade from serious

Acceptance Criteria:
- Follow-up type selection required
- Type included in XML (C.1.11.1)
- Type affects workflow (corrections may need re-review)
- History shows follow-up type
```

#### REQ-FU-004: Follow-Up Due Date
```
As a user
I want follow-up reports to have appropriate due dates
So that regulatory timelines are met

Due Date Rules:
- Expedited follow-up: 15 calendar days from receipt of new info
- Non-expedited follow-up: With next PSR
- Correction: As soon as practicable

Acceptance Criteria:
- Due date calculated based on follow-up type
- Receipt date of new information captured
- Due date displayed prominently
- Overdue follow-ups highlighted
```

#### REQ-FU-005: Case Version History
```
As a user
I want to view all versions of a case
So that I can track the complete case history

Acceptance Criteria:
- Case detail shows version timeline
- All versions accessible from timeline
- Version comparison (diff view) available
- Highlight changes between versions
- Current version clearly indicated
- Each version shows submission status
```

### 3.4 Nullification Reports

#### REQ-NULL-001: Create Nullification Report
```
As a user
I want to nullify a previously submitted case
So that FDA knows to disregard it

Nullification Reasons:
- Duplicate of another case
- Submitted in error
- Not a valid adverse event
- Wrong product
- Patient consent withdrawn

Acceptance Criteria:
- "Nullify Case" action on submitted cases
- Reason selection required
- Reference to replacement case (if duplicate)
- Creates new submission with nullification flag
- Original case status changed to "Nullified"
- XML element C.1.11.1 set appropriately
```

#### REQ-NULL-002: Nullification Workflow
```
As a user
I want nullifications to be reviewed before submission
So that cases aren't incorrectly voided

Acceptance Criteria:
- Nullification requires approval (like other submissions)
- QC review of nullification reason
- Medical review if clinical judgment involved
- Audit trail of nullification decision
- Cannot un-nullify after FDA submission
```

### 3.5 Batch Submission

#### REQ-BATCH-001: Create Submission Batch
```
As a user
I want to submit multiple cases in a single batch
So that submission is efficient for high volumes

Acceptance Criteria:
- Select multiple cases for batch submission
- Cases must be same type (all expedited or all non-expedited)
- Cases must be approved and ready for submission
- Batch assigned unique batch ID
- Single XML file contains multiple ICSRs
- Batch limit: 100 cases per submission (configurable)
```

#### REQ-BATCH-002: Batch Validation
```
As a user
I want batches validated before submission
So that I don't submit invalid data

Validation Steps:
1. Each case individually validated
2. Batch-level validation (no duplicates, consistent metadata)
3. XML schema validation for entire batch
4. File size check (under FDA limit)

Acceptance Criteria:
- Validation runs before batch creation
- Cases with errors excluded from batch
- Validation report shows status of each case
- User can fix errors and re-validate
- Only valid cases included in final batch
```

#### REQ-BATCH-003: Batch Submission Tracking
```
As a user
I want to track batch submissions
So that I know the status of all cases in the batch

Acceptance Criteria:
- Batch has single submission status
- All cases in batch linked to batch record
- Acknowledgment applies to entire batch
- Individual case statuses updated from batch status
- Batch history shows all included cases
- Failed batch can be retried
```

#### REQ-BATCH-004: Batch XML Generation
```
As the system
I need to generate valid batch E2B(R3) XML
So that multiple ICSRs are submitted correctly

XML Structure:
- Single MCCI_IN200100UV01 message
- Multiple PORR_IN049016UV subjects (one per ICSR)
- Common batch header information
- Individual case data per subject

Acceptance Criteria:
- Batch XML validates against FDA schema
- Each ICSR has unique message ID within batch
- Batch receiver ID correct (ZZFDA or ZZFDA_PREMKT)
- File naming: {SenderID}_{Date}_{BatchSeq}.xml
- XML size under 100MB (FDA limit)
```

### 3.6 Periodic Safety Report (PSR) Management

#### REQ-PSR-001: Product PSR Configuration
```
As an administrator
I want to configure PSR schedules per product
So that periodic reporting deadlines are tracked

Configuration Fields:
- Product name (linked to product master)
- NDA/BLA/ANDA number
- US approval date (IBD - International Birth Date)
- PSR format: PADER / PSUR / PBRER
- Reporting frequency: Quarterly / Semi-Annual / Annual
- Data Lock Point (DLP) offset: Days before period end
- Submission due: Days after period end

Acceptance Criteria:
- PSR schedule configurable per product
- Default schedule: Quarterly years 1-3, Annual after
- Calendar shows upcoming PSR deadlines
- Automatic calculation of reporting periods
- Support for multiple products
```

#### REQ-PSR-002: PSR Schedule Calculation
```
As the system
I need to calculate PSR reporting periods
So that deadlines are accurately tracked

Calculation Rules:
- Period start: Day after previous period end (or approval date)
- Period end: Based on frequency from approval date
- DLP (Data Lock Point): Period end minus offset (usually 0)
- Submission due: Period end plus due days (usually 30-90)

Example (Quarterly, 30-day due):
- US Approval: January 15, 2026
- Q1 Period: Jan 15 - Apr 14, 2026
- Q1 DLP: April 14, 2026
- Q1 Due: May 14, 2026

Acceptance Criteria:
- Periods calculated automatically
- Support for different frequencies
- Handle partial first period
- Configurable DLP and due date offsets
- Visual calendar of PSR schedule
```

#### REQ-PSR-003: Create PSR
```
As a user
I want to create a PSR for a reporting period
So that I can compile and submit periodic safety data

PSR Creation:
1. Select product
2. Select reporting period (or auto-detect next due)
3. System identifies eligible non-expedited cases
4. Create PSR record
5. Link cases to PSR

Acceptance Criteria:
- PSR wizard guides through creation
- System shows cases pending for period
- User can include/exclude cases with justification
- PSR assigned unique identifier
- Cases moved to "Included in PSR" status
- PSR status: Draft → Under Review → Approved → Submitted
```

#### REQ-PSR-004: PSR Case Aggregation
```
As a user
I want to see all cases included in a PSR
So that I can review completeness

Aggregation Criteria:
- Product matches PSR product
- Case type is Non-Expedited
- Receipt date within reporting period
- Status is "Approved" or "Pending PSR"
- Not already included in another PSR

Acceptance Criteria:
- Automatic identification of eligible cases
- List view of all cases for PSR
- Filter by: included, excluded, pending approval
- Bulk approve pending cases
- Add/remove cases with audit trail
- Count summary by seriousness, outcome, etc.
```

#### REQ-PSR-005: PSR Descriptive Portion
```
As a user
I want to generate the PSR narrative document
So that I can submit the descriptive portion via eCTD

PADER Sections (21 CFR 314.80):
1. Narrative summary
2. ICS line listing reference
3. Summary tabulation of serious events
4. Analysis of 15-day reports since last PSR
5. Labeling changes (if any)
6. Status of post-marketing commitments

Acceptance Criteria:
- Template-based document generation
- Auto-population of case counts and statistics
- Rich text editor for narrative sections
- Support for tables and charts
- Export to PDF for eCTD submission
- Version control for drafts
```

#### REQ-PSR-006: PSR Line Listing
```
As a user
I want to generate a line listing of cases
So that it can be included in the PSR

Line Listing Contents (per case):
- Case ID
- Receipt date
- Patient age/sex
- Product name and dose
- Event terms (MedDRA PT)
- Event onset date
- Outcome
- Seriousness criteria
- Causality assessment

Acceptance Criteria:
- Auto-generated from included cases
- Sortable and filterable
- Export to Excel/CSV
- Include in PSR document as appendix
- Summary statistics calculated
```

#### REQ-PSR-007: PSR Submission
```
As a user
I want to submit both PSR components
So that I meet FDA requirements

Submission Components:
1. Descriptive Portion → eCTD (external process)
2. ICSR Batch → ESG NextGen (via application)

Acceptance Criteria:
- Track both components in single PSR record
- Generate ICSR batch XML for all included cases
- Record eCTD submission reference
- Record ESG submission confirmation
- Both must be submitted on same day
- PSR status updated when both submitted
- Acknowledgment tracking for ICSR batch
```

#### REQ-PSR-008: PSR Dashboard
```
As a user
I want to see PSR status overview
So that I can manage periodic reporting workload

Dashboard Elements:
- Upcoming PSR deadlines (next 90 days)
- PSRs in progress (draft, under review)
- Overdue PSRs (past due date)
- Cases pending for each upcoming PSR
- PSR submission history

Acceptance Criteria:
- Dashboard widget for PSR status
- Click-through to PSR details
- Warning indicators for approaching deadlines
- Red highlight for overdue
- Quick action to create upcoming PSR
```

### 3.7 Product Management

#### REQ-PROD-001: Product Master
```
As an administrator
I want to manage a product list
So that cases and PSRs can be linked to products

Product Fields:
- Product name
- Active ingredient(s)
- NDA/BLA/ANDA number
- US approval date
- Marketing status (approved, withdrawn)
- Company name (MAH)
- Product type (drug, biologic)

Acceptance Criteria:
- Product CRUD operations
- Product selection when creating cases
- Product linked to PSR schedule
- Product list searchable
- Support for multiple products
```

#### REQ-PROD-002: Product-Case Linking
```
As a user
I want cases linked to products
So that PSR aggregation works correctly

Acceptance Criteria:
- Product selection required for suspect drugs
- Multiple products per case supported
- Primary suspect product identified
- Product determines PSR assignment
- Product change requires re-evaluation of PSR
```

---

## 4. User Interface Requirements

### 4.1 Report Type Selection Interface

#### REQ-UI-TYPE-001: Case Type Selection
```
During case creation, show report type selection:

┌─────────────────────────────────────────────────┐
│ Report Classification                           │
├─────────────────────────────────────────────────┤
│                                                 │
│ Seriousness: ● Serious  ○ Non-Serious          │
│                                                 │
│ If Serious, select criteria:                    │
│ [✓] Results in death                           │
│ [ ] Is life-threatening                        │
│ [✓] Requires/prolongs hospitalization          │
│ [ ] Persistent disability                       │
│ [ ] Congenital anomaly                         │
│ [ ] Other medically important                  │
│                                                 │
│ Expectedness: ○ Expected  ● Unexpected         │
│ Reference: [Product Label Section 6.1____]     │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ ⚡ Suggested: 15-Day Expedited Report       │ │
│ │    Reason: Serious AND Unexpected           │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Report Type: ● Expedited (15-Day)              │
│              ○ Non-Expedited (Periodic)        │
│              ○ Override: [____________]        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4.2 Follow-Up Interface

#### REQ-UI-FU-001: Create Follow-Up Dialog
```
When creating follow-up from existing case:

┌─────────────────────────────────────────────────┐
│ Create Follow-Up Report                         │
├─────────────────────────────────────────────────┤
│                                                 │
│ Original Case: CASE-2026-001234                │
│ Original Submission: January 15, 2026          │
│ Current Version: 1 (Initial)                   │
│                                                 │
│ Follow-Up Type:                                │
│ ● Additional information received              │
│ ○ Outcome update                               │
│ ○ Correction to original                       │
│ ○ Response to FDA query                        │
│ ○ Upgrade to serious                           │
│                                                 │
│ Date New Information Received:                 │
│ [January 25, 2026    ] 📅                      │
│                                                 │
│ Due Date: February 9, 2026 (15 days)           │
│                                                 │
│ Summary of New Information:                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ Patient outcome updated - recovered with    │ │
│ │ sequelae. Lab results now available.        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│        [Cancel]  [Create Follow-Up]            │
└─────────────────────────────────────────────────┘
```

#### REQ-UI-FU-002: Version History Timeline
```
In case detail view, show version history:

┌─────────────────────────────────────────────────┐
│ Case History: CASE-2026-001234                  │
├─────────────────────────────────────────────────┤
│                                                 │
│ ──●── Version 3 (Current) - Follow-Up 2        │
│   │   Feb 10, 2026 - Outcome Update            │
│   │   Status: Draft                            │
│   │   [View] [Edit]                            │
│   │                                            │
│ ──●── Version 2 - Follow-Up 1                  │
│   │   Jan 25, 2026 - Additional Information    │
│   │   Status: Acknowledged (ACK3)              │
│   │   [View] [Compare to V1]                   │
│   │                                            │
│ ──●── Version 1 - Initial Report               │
│       Jan 10, 2026                             │
│       Status: Acknowledged (ACK3)              │
│       [View]                                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4.3 Batch Submission Interface

#### REQ-UI-BATCH-001: Batch Creation
```
Batch submission interface:

┌─────────────────────────────────────────────────┐
│ Create Submission Batch                         │
├─────────────────────────────────────────────────┤
│                                                 │
│ Batch Type: ● Expedited  ○ Non-Expedited       │
│                                                 │
│ Select Cases for Batch:                        │
│ ┌─────────────────────────────────────────────┐ │
│ │[✓] CASE-2026-001234  Ready  ProductA  Exp  │ │
│ │[✓] CASE-2026-001235  Ready  ProductA  Exp  │ │
│ │[✓] CASE-2026-001236  Ready  ProductB  Exp  │ │
│ │[ ] CASE-2026-001237  Error  ProductA  Exp  │ │
│ │    ⚠️ Validation error - missing DOB        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Selected: 3 cases                              │
│ Excluded: 1 case (validation errors)           │
│                                                 │
│ [Select All Valid]  [Clear Selection]          │
│                                                 │
│ Batch Name: [Expedited_Batch_20260125___]      │
│                                                 │
│        [Cancel]  [Validate Batch]  [Create]    │
└─────────────────────────────────────────────────┘
```

### 4.4 PSR Management Interface

#### REQ-UI-PSR-001: PSR Dashboard Widget
```
Dashboard widget for PSR status:

┌─────────────────────────────────────────────────┐
│ 📊 Periodic Safety Reports                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ UPCOMING                                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ ProductA Q1 2026                            │ │
│ │ Due: Feb 14, 2026 (19 days)                 │ │
│ │ Cases pending: 23                           │ │
│ │ [Create PSR]                                │ │
│ ├─────────────────────────────────────────────┤ │
│ │ ProductB Q1 2026                            │ │
│ │ Due: Mar 1, 2026 (34 days)                  │ │
│ │ Cases pending: 8                            │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ IN PROGRESS                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ ProductC Q4 2025                            │ │
│ │ Status: Under Review                        │ │
│ │ Cases: 45                                   │ │
│ │ [View]                                      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ⚠️ OVERDUE: 0                                   │
│                                                 │
│ [View All PSRs]  [PSR Calendar]                │
└─────────────────────────────────────────────────┘
```

#### REQ-UI-PSR-002: PSR Creation Wizard
```
Step 1 of 4: Select Product and Period

┌─────────────────────────────────────────────────┐
│ Create Periodic Safety Report          Step 1/4 │
├─────────────────────────────────────────────────┤
│                                                 │
│ Product: [ProductA - NDA 123456 ▼]             │
│                                                 │
│ PSR Format: PADER (as configured)              │
│                                                 │
│ Reporting Period:                              │
│ ● Q1 2026 (Jan 15 - Apr 14, 2026)             │
│   Due: May 14, 2026                            │
│   Eligible cases: 23                           │
│                                                 │
│ ○ Custom Period:                               │
│   From: [__________] To: [__________]          │
│                                                 │
│ Data Lock Point: April 14, 2026                │
│                                                 │
│        [Cancel]  [Next: Review Cases →]        │
└─────────────────────────────────────────────────┘
```

#### REQ-UI-PSR-003: PSR Case Review
```
Step 2 of 4: Review and Select Cases

┌─────────────────────────────────────────────────┐
│ Create Periodic Safety Report          Step 2/4 │
├─────────────────────────────────────────────────┤
│                                                 │
│ Cases for Q1 2026 (Jan 15 - Apr 14, 2026)      │
│                                                 │
│ Filter: [All ▼]  Search: [___________] 🔍      │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Include │ Case ID        │ Recv Date │ Ser │ │
│ │─────────┼────────────────┼───────────┼─────│ │
│ │  [✓]    │ CASE-2026-0045 │ Jan 20    │ Yes │ │
│ │  [✓]    │ CASE-2026-0046 │ Jan 22    │ No  │ │
│ │  [✓]    │ CASE-2026-0051 │ Feb 03    │ Yes │ │
│ │  [ ]    │ CASE-2026-0052 │ Feb 05    │ No  │ │
│ │         │ ⚠️ Pending approval               │ │
│ │  [✓]    │ CASE-2026-0060 │ Mar 15    │ No  │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Summary:                                        │
│ • Included: 22 cases                           │
│ • Excluded: 1 case (pending approval)          │
│ • Serious: 8 | Non-Serious: 14                 │
│                                                 │
│    [← Back]  [Next: Generate Document →]       │
└─────────────────────────────────────────────────┘
```

---

## 5. Data Model Updates

### 5.1 New Tables

```sql
-- Report type and classification
ALTER TABLE cases ADD COLUMN report_type VARCHAR(20) DEFAULT 'expedited';
  -- Values: 'expedited', 'non_expedited', 'followup', 'nullification'
ALTER TABLE cases ADD COLUMN expedited_criteria VARCHAR(20);
  -- Values: '15_day', 'periodic', 'remedial', 'malfunction'
ALTER TABLE cases ADD COLUMN is_serious BOOLEAN DEFAULT FALSE;
ALTER TABLE cases ADD COLUMN expectedness VARCHAR(20);
  -- Values: 'expected', 'unexpected', 'unknown'
ALTER TABLE cases ADD COLUMN expectedness_justification TEXT;

-- Follow-up tracking
ALTER TABLE cases ADD COLUMN parent_case_id TEXT REFERENCES cases(case_id);
ALTER TABLE cases ADD COLUMN case_version INTEGER DEFAULT 1;
ALTER TABLE cases ADD COLUMN followup_type VARCHAR(50);
  -- Values: 'additional_info', 'outcome_update', 'correction', 
  --         'fda_response', 'upgrade_serious', 'downgrade'
ALTER TABLE cases ADD COLUMN followup_info_date DATE;

-- Nullification
ALTER TABLE cases ADD COLUMN is_nullified BOOLEAN DEFAULT FALSE;
ALTER TABLE cases ADD COLUMN nullification_reason VARCHAR(50);
ALTER TABLE cases ADD COLUMN nullification_reference TEXT;

-- Product master
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255),
    application_type VARCHAR(10), -- NDA, BLA, ANDA
    application_number VARCHAR(20),
    us_approval_date DATE,
    marketing_status VARCHAR(20) DEFAULT 'approved',
    company_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PSR schedule configuration
CREATE TABLE psr_schedules (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    psr_format VARCHAR(20) NOT NULL, -- PADER, PSUR, PBRER
    frequency VARCHAR(20) NOT NULL, -- quarterly, semi_annual, annual
    dlp_offset_days INTEGER DEFAULT 0,
    due_offset_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PSR records
CREATE TABLE psrs (
    id SERIAL PRIMARY KEY,
    psr_number VARCHAR(50) UNIQUE NOT NULL,
    product_id INTEGER REFERENCES products(id),
    psr_format VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    data_lock_point DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'draft',
      -- draft, under_review, approved, submitted, acknowledged
    descriptive_portion_path TEXT,
    ectd_submission_ref VARCHAR(100),
    icsr_batch_id INTEGER REFERENCES submission_batches(id),
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PSR-Case link
CREATE TABLE psr_cases (
    psr_id INTEGER REFERENCES psrs(id),
    case_id TEXT REFERENCES cases(case_id),
    included BOOLEAN DEFAULT TRUE,
    exclusion_reason TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER REFERENCES users(id),
    PRIMARY KEY (psr_id, case_id)
);

-- Submission batches
CREATE TABLE submission_batches (
    id SERIAL PRIMARY KEY,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    batch_type VARCHAR(20) NOT NULL, -- expedited, non_expedited, psr
    case_count INTEGER NOT NULL,
    xml_filename VARCHAR(255),
    xml_file_path TEXT,
    status VARCHAR(30) DEFAULT 'created',
      -- created, validated, exported, submitted, acknowledged, failed
    submission_mode VARCHAR(20), -- test, production
    esg_core_id VARCHAR(100),
    submitted_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    ack_type VARCHAR(10), -- ACK1, ACK2, ACK3, NACK
    ack_details TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batch-Case link
CREATE TABLE batch_cases (
    batch_id INTEGER REFERENCES submission_batches(id),
    case_id TEXT REFERENCES cases(case_id),
    case_status VARCHAR(30),
    validation_status VARCHAR(20),
    validation_errors TEXT,
    PRIMARY KEY (batch_id, case_id)
);

-- Seriousness criteria (normalized)
CREATE TABLE case_seriousness (
    id SERIAL PRIMARY KEY,
    case_id TEXT REFERENCES cases(case_id),
    criterion VARCHAR(50) NOT NULL,
      -- death, life_threatening, hospitalization, disability,
      -- congenital_anomaly, other_medically_important
    is_checked BOOLEAN DEFAULT FALSE,
    notes TEXT,
    UNIQUE(case_id, criterion)
);
```

### 5.2 Indexes

```sql
-- Performance indexes
CREATE INDEX idx_cases_report_type ON cases(report_type);
CREATE INDEX idx_cases_parent ON cases(parent_case_id);
CREATE INDEX idx_cases_product ON cases((data->>'product_id'));
CREATE INDEX idx_psrs_product ON psrs(product_id);
CREATE INDEX idx_psrs_status ON psrs(status);
CREATE INDEX idx_psrs_due_date ON psrs(due_date);
CREATE INDEX idx_batches_status ON submission_batches(status);
```

---

## 6. API Endpoints

### 6.1 Report Type API

```yaml
POST /api/v1/cases/{id}/classify
  Description: Set or update case classification
  Body:
    report_type: expedited | non_expedited
    is_serious: boolean
    seriousness_criteria: string[]
    expectedness: expected | unexpected | unknown
    expectedness_justification: string
  Response: Updated case object

GET /api/v1/cases/{id}/classification
  Description: Get case classification details
  Response: Classification object with suggested type
```

### 6.2 Follow-Up API

```yaml
POST /api/v1/cases/{id}/followup
  Description: Create follow-up report for existing case
  Body:
    followup_type: additional_info | outcome_update | correction | ...
    followup_info_date: date
    summary: string
  Response: New follow-up case object

GET /api/v1/cases/{id}/versions
  Description: Get all versions of a case
  Response: Array of case versions with status

GET /api/v1/cases/{id}/compare/{version1}/{version2}
  Description: Compare two versions of a case
  Response: Diff object showing changes
```

### 6.3 Nullification API

```yaml
POST /api/v1/cases/{id}/nullify
  Description: Create nullification for submitted case
  Body:
    reason: duplicate | error | not_ae | wrong_product | consent_withdrawn
    reference_case_id: string (if duplicate)
    justification: string
  Response: Nullification case object
```

### 6.4 Batch API

```yaml
POST /api/v1/batches
  Description: Create submission batch
  Body:
    batch_type: expedited | non_expedited | psr
    case_ids: string[]
    batch_name: string (optional)
  Response: Batch object with validation results

GET /api/v1/batches
  Description: List all batches
  Query: status, type, from_date, to_date
  Response: Paginated batch list

GET /api/v1/batches/{id}
  Description: Get batch details
  Response: Batch with included cases

POST /api/v1/batches/{id}/validate
  Description: Validate batch before submission
  Response: Validation results per case

POST /api/v1/batches/{id}/export
  Description: Generate batch XML
  Response: Batch with XML file path

POST /api/v1/batches/{id}/submit
  Description: Record batch submission to FDA
  Body:
    esg_core_id: string
    submission_date: date
  Response: Updated batch
```

### 6.5 PSR API

```yaml
GET /api/v1/products
  Description: List all products
  Response: Product list

POST /api/v1/products
  Description: Create product
  Body: Product fields
  Response: Created product

GET /api/v1/products/{id}/psr-schedule
  Description: Get PSR schedule for product
  Response: Schedule with upcoming periods

POST /api/v1/products/{id}/psr-schedule
  Description: Configure PSR schedule
  Body:
    psr_format: PADER | PSUR | PBRER
    frequency: quarterly | semi_annual | annual
    dlp_offset_days: number
    due_offset_days: number
  Response: Updated schedule

GET /api/v1/psrs
  Description: List all PSRs
  Query: product_id, status, due_from, due_to
  Response: Paginated PSR list

POST /api/v1/psrs
  Description: Create PSR
  Body:
    product_id: number
    period_start: date
    period_end: date
  Response: Created PSR with eligible cases

GET /api/v1/psrs/{id}
  Description: Get PSR details
  Response: PSR with cases and status

PUT /api/v1/psrs/{id}/cases
  Description: Update cases included in PSR
  Body:
    include: string[] (case IDs to include)
    exclude: string[] (case IDs to exclude)
    exclusion_reasons: object
  Response: Updated PSR

POST /api/v1/psrs/{id}/generate-document
  Description: Generate PSR descriptive portion
  Body:
    template_id: number (optional)
  Response: Document path

POST /api/v1/psrs/{id}/submit
  Description: Record PSR submission
  Body:
    ectd_submission_ref: string
    icsr_batch_id: number
  Response: Updated PSR
```

---

## 7. XML Generation Updates

### 7.1 Report Type Elements

```xml
<!-- FDA.C.1.8.1: Local Criteria for Expedited Report -->
<observation>
  <code code="FDA.C.1.8.1" codeSystem="2.16.840.1.113883.3.989.2.1.1.5"/>
  <value xsi:type="CE" code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.5">
    <!-- 1=15-Day Expedited, 2=Periodic, 4=Remedial, 5=Malfunction -->
  </value>
</observation>

<!-- C.1.7: Report Type -->
<code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.3.6"/>
<!-- 1=Spontaneous, 2=Study, 3=Other, 4=Not available -->
```

### 7.2 Follow-Up Elements

```xml
<!-- C.1.9.1: Other Case Identifiers - Link to original -->
<outboundRelationship2 typeCode="SPRT">
  <relatedInvestigation>
    <id root="2.16.840.1.113883.3.989.2.1.3.1" 
        extension="US-ACME-2026-001234"/>
    <!-- Original case safety report unique identifier -->
  </relatedInvestigation>
</outboundRelationship2>

<!-- C.1.11.1: Report Nullification/Amendment -->
<code code="1" codeSystem="2.16.840.1.113883.3.989.2.1.3.5"/>
<!-- 1=Nullification, 2=Amendment -->
```

### 7.3 Batch XML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MCCI_IN200100UV01 xmlns="urn:hl7-org:v3" 
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <!-- Single batch header -->
  <id root="2.16.840.1.113883.3.989.2.1.3.22" extension="BATCH-2026-001"/>
  <creationTime value="20260125120000"/>
  
  <receiver typeCode="RCV">
    <device>
      <id root="2.16.840.1.113883.3.989.2.1.3.14" extension="ZZFDA"/>
    </device>
  </receiver>
  
  <sender typeCode="SND">
    <device>
      <id root="1.3.6.1.4.1.519.1" extension="123456789"/>
    </device>
  </sender>
  
  <controlActProcess>
    <!-- Multiple subjects, one per ICSR -->
    <subject typeCode="SUBJ">
      <!-- ICSR 1 -->
      <investigationEvent>
        <!-- Full ICSR content -->
      </investigationEvent>
    </subject>
    
    <subject typeCode="SUBJ">
      <!-- ICSR 2 -->
      <investigationEvent>
        <!-- Full ICSR content -->
      </investigationEvent>
    </subject>
    
    <!-- Additional ICSRs... -->
  </controlActProcess>
</MCCI_IN200100UV01>
```

---

## 8. Testing Requirements

### 8.1 Test Scenarios

**Report Type:**
- Create expedited case (serious + unexpected)
- Create non-expedited case (non-serious)
- Create non-expedited case (serious + expected)
- System suggests correct report type
- Override report type with justification

**Follow-Up:**
- Create follow-up for submitted case
- Pre-population of original data
- Version number incrementation
- Follow-up due date calculation
- View version history
- Compare versions

**Nullification:**
- Nullify duplicate case
- Nullify case submitted in error
- Nullification workflow approval
- XML contains nullification flag

**Batch:**
- Create batch with multiple cases
- Validation excludes invalid cases
- Batch XML generation
- Batch submission tracking
- Batch acknowledgment processing

**PSR:**
- Configure PSR schedule
- Period calculation accuracy
- Case aggregation for period
- Include/exclude cases
- Generate descriptive portion
- Track both submission components
- PSR workflow approval

### 8.2 FDA Compatibility

- Non-expedited XML has FDA.C.1.8.1 = "2"
- Follow-up XML references original case
- Nullification XML has proper flags
- Batch XML validates against schema
- Batch file under size limits

---

## 9. Acceptance Criteria Summary

### 9.1 Must Have
- [ ] Report type selection (expedited/non-expedited)
- [ ] Seriousness and expectedness assessment
- [ ] Non-expedited case workflow
- [ ] Follow-up report creation linked to original
- [ ] Case version tracking and history
- [ ] Batch submission for multiple cases
- [ ] Batch XML generation
- [ ] Product master management
- [ ] PSR schedule configuration
- [ ] PSR case aggregation
- [ ] PSR status tracking

### 9.2 Should Have
- [ ] Report type suggestion based on criteria
- [ ] Version comparison (diff view)
- [ ] Nullification reports
- [ ] PSR descriptive portion generation
- [ ] PSR dashboard with deadlines
- [ ] Batch validation before submission

### 9.3 Nice to Have
- [ ] PSR document templates (PADER/PBRER)
- [ ] Line listing export to Excel
- [ ] Automatic PSR creation reminders
- [ ] Statistics and charts in PSR document

---

## 10. Configuration Options

```yaml
# config/phase4.yaml

report_types:
  default: expedited
  allow_override: true
  require_justification_for_override: true

follow_up:
  copy_all_fields: true
  require_summary: true
  expedited_due_days: 15
  
nullification:
  require_approval: true
  require_justification: true

batch:
  max_cases_per_batch: 100
  max_file_size_mb: 100
  validate_before_create: true

psr:
  default_format: PADER
  default_frequency: quarterly
  default_dlp_offset: 0
  default_due_offset: 30
  reminder_days: [30, 14, 7]
```

---

## 11. References

- [21 CFR 314.80](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-314/subpart-B/section-314.80) - Postmarketing Reporting of Adverse Drug Experiences
- [21 CFR 600.80](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-F/part-600/subpart-D/section-600.80) - Postmarketing Reporting of Adverse Experiences (Biologics)
- [ICH E2C(R2)](https://database.ich.org/sites/default/files/E2C_R2_Guideline.pdf) - Periodic Benefit-Risk Evaluation Report
- [FDA PADER Guidance](https://www.fda.gov/media/85520/download) - Providing Postmarketing Periodic Safety Reports
- [FDA E2B(R3) Business Rules](https://www.fda.gov/drugs/fdas-adverse-event-reporting-system-faers/fda-adverse-event-reporting-system-faers-electronic-submissions-e2br3-standards) - Core and Regional Data Elements
- Phase 3 Requirements: `03_Phase3_MultiUser_Workflow.md`
- Phase 2 Requirements: `02_Phase2_ESG_USP_Submission.md`

---

## Next Phase

After completing Phase 4, proceed to **Phase 5: Enhanced Data Management** which adds:
- MedDRA dictionary integration and auto-coding
- WHO Drug dictionary integration
- Duplicate detection
- Advanced search capabilities
- Bulk import from CSV/Excel
- Case templates
