# Phase 6: Premarketing (IND) Safety Reports

## Requirements Specification for Claude Code

**Version:** 1.0  
**Phase:** 6 of 12  
**Estimated Duration:** 2 months  
**Prerequisites:** Phase 1, Phase 2, Phase 3, and Phase 4 completed (Phase 5 optional but recommended)

---

## 1. Phase Overview

### 1.1 Objective

Add support for premarketing safety reports including Investigational New Drug (IND) safety reports per 21 CFR 312.32 and IND-exempt bioavailability/bioequivalence (BA/BE) study reports. This phase enables sponsors to manage clinical trial safety data, track blinded/unblinded cases, assess causality and expectedness against the Investigator Brochure, generate Form FDA 3500A, and submit electronically via E2B(R3) XML.

### 1.2 Success Criteria

- [ ] IND safety reports can be created with all required fields
- [ ] Study/protocol configuration with sites and investigators
- [ ] Blinding status tracked with unblinding workflow
- [ ] Expectedness assessment against Investigator Brochure
- [ ] Causality assessment (investigator and sponsor)
- [ ] 7-day and 15-day expedited timelines enforced
- [ ] IND-exempt BA/BE study reports supported
- [ ] Form FDA 3500A PDF generation
- [ ] E2B(R3) XML generation with IND-specific elements
- [ ] IND Annual Safety Report data aggregation
- [ ] Protocol deviation tracking linked to cases

### 1.3 Out of Scope for Phase 6

- Cosmetics reporting (Phase 7)
- Signal detection analytics (Phase 8)
- External PV database integration (Phase 9)
- Development Safety Update Report (DSUR) generation
- Electronic IRB submission

### 1.4 Dependencies

- **Phase 1-4 Complete**: Core case management, submission, workflow, PSR
- **Phase 5 Recommended**: MedDRA/WHO Drug coding enhances IND reporting
- **Active IND**: IND number must be registered with FDA

---

## 2. Background Information

### 2.1 Regulatory Framework (21 CFR 312.32)

IND safety reporting requirements apply to sponsors of clinical studies conducted under an IND application.

#### 2.1.1 Key Definitions

| Term | Definition (21 CFR 312.32(a)) |
|------|------------------------------|
| **Adverse Event (AE)** | Any untoward medical occurrence associated with drug use, whether or not considered drug related |
| **Serious AE/SAE** | Results in death, is life-threatening, requires hospitalization, causes disability, congenital anomaly, or other medically important event |
| **Suspected Adverse Reaction** | AE where there is reasonable possibility the drug caused the event (evidence of causal relationship) |
| **Unexpected** | Not listed in Investigator Brochure, or not at specificity/severity observed |
| **Life-threatening** | Places subject at immediate risk of death (not hypothetical) |

#### 2.1.2 Reporting Requirements

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    IND SAFETY REPORTING DECISION TREE                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                         Adverse Event Occurs
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
              Is it Serious?                  Not Serious
                    │                               │
          ┌────────┴────────┐                      ▼
          ▼                 ▼              Collect in Annual
    Yes, Serious      No, Not Serious         Report Only
          │
          ▼
    Is there evidence
    of causal relationship?
          │
    ┌─────┴─────┐
    ▼           ▼
   Yes         No
    │           │
    ▼           ▼
  Suspected   Adverse Event
  Adverse     (not suspected)
  Reaction    Report per protocol
    │
    ▼
Is it Unexpected?
(not in IB at specificity/severity)
    │
    ┌─────┴─────┐
    ▼           ▼
   Yes         No
    │           │
    ▼           ▼
  SUSAR     Expected SAR
  Report    Report in
  to FDA    Annual Report
    │
    ▼
Is it Fatal or
Life-threatening?
    │
    ┌─────┴─────┐
    ▼           ▼
   Yes         No
    │           │
    ▼           ▼
  7-Day      15-Day
  Report     Report
```

#### 2.1.3 Reporting Timelines

| Report Type | Timeline | Submission Method |
|-------------|----------|-------------------|
| **Fatal/Life-threatening SUSAR** | 7 calendar days | E2B(R3) XML or Form 3500A |
| **Other Serious Unexpected SAR** | 15 calendar days | E2B(R3) XML or Form 3500A |
| **Follow-up to 7-day report** | 15 calendar days from initial | E2B(R3) XML or Form 3500A |
| **Non-serious / Expected SAEs** | IND Annual Report | Aggregate summary |
| **Safety Report Follow-up** | 15 calendar days from new info | E2B(R3) XML or Form 3500A |

### 2.2 E2B(R3) IND-Specific Requirements

#### 2.2.1 Routing Identifiers for IND Reports

| Field | Value |
|-------|-------|
| **Batch Receiver (N.1.4)** | ZZFDA_PREMKT |
| **Message Receiver - CDER (N.2.r.3)** | CDER_IND |
| **Message Receiver - CBER (N.2.r.3)** | CBER_IND |

#### 2.2.2 IND-Specific Data Elements

```xml
<!-- A.1.6: IND Number -->
<outboundRelationship2 typeCode="REFR">
  <relatedInvestigation classCode="INVSTG">
    <id root="2.16.840.1.113883.3.989.2.1.3.3" extension="123456"/>
    <!-- IND number format: 6 digits -->
  </relatedInvestigation>
</outboundRelationship2>

<!-- A.2.3.3: Study Registration (Protocol/Study ID) -->
<outboundRelationship2 typeCode="CAUS">
  <observation classCode="OBS" moodCode="EVN">
    <code code="C.5.4" codeSystem="2.16.840.1.113883.3.989.2.1.1.19"/>
    <value xsi:type="ST">Protocol ABC-123</value>
  </observation>
</outboundRelationship2>

<!-- C.5.4: Study Type Where Reaction Was Observed -->
<value xsi:type="CE" code="1" codeSystem="2.16.840.1.113883.3.989.2.1.3.12"/>
<!-- 1=Clinical trials, 2=Individual patient use, 3=Other studies -->

<!-- FDA.C.1.7.1: Type of Report (IND-specific) -->
<observation>
  <code code="FDA.C.1.7.1" codeSystem="2.16.840.1.113883.3.989.2.1.1.5"/>
  <value xsi:type="CE" code="6" codeSystem="2.16.840.1.113883.3.989.2.1.1.5"/>
  <!-- 5=15-day, 6=7-day, 7=IND Annual Report, 8=BA/BE -->
</observation>
```

### 2.3 IND-Exempt BA/BE Studies

Bioavailability/Bioequivalence studies may be exempt from IND requirements under 21 CFR 320.31(d)(3) but still require safety reporting:

| Aspect | Requirement |
|--------|-------------|
| **Scope** | BA/BE studies supporting ANDAs |
| **What to Report** | Serious adverse events |
| **Timeline** | 15 calendar days |
| **Method (until Apr 2026)** | Form FDA 3500A to ogd-premarketsafetyreports@fda.hhs.gov |
| **Method (after Apr 2026)** | E2B(R3) XML via ESG (mandatory) |
| **Message Receiver** | CDER_IND_EXEMPT_BA_BE |

### 2.4 Form FDA 3500A Structure

The MedWatch 3500A form for mandatory reporting includes:

| Section | Content |
|---------|---------|
| **A. Patient Information** | Demographics, weight, age, ethnicity |
| **B. Adverse Event** | Event description, dates, outcomes, seriousness |
| **C. Suspect Product(s)** | Drug name, dose, dates, indication |
| **D. Suspect Medical Device** | (Not applicable for drug IND) |
| **E. Initial Reporter** | Name, address, occupation |
| **F. For Use by Manufacturers** | Report type, dates |
| **G. Manufacturer Information** | Contact, IND/NDA number, report source |
| **H. Device Manufacturers Only** | (Not applicable for drug IND) |

---

## 3. Functional Requirements

### 3.1 Study and Protocol Management

#### REQ-STUDY-001: Study Configuration
```
As an administrator
I want to configure clinical studies
So that IND cases can be properly linked and tracked

Study Fields:
- Study ID (internal)
- Protocol number
- Study title
- IND number(s) - can have multiple
- Sponsor name
- Phase (1, 1/2, 2, 2/3, 3, 3b, 4)
- Study design (randomized, open-label, etc.)
- Therapeutic area
- Indication
- Investigational product(s)
- Study status (planned, enrolling, active, completed, terminated)
- First patient first visit (FPFV) date
- Last patient last visit (LPLV) date
- Investigator Brochure version
- Target enrollment

Acceptance Criteria:
- Study CRUD operations
- Multiple INDs per study supported
- Study linked to cases
- Study status tracked
- IB version tracked for expectedness
```

#### REQ-STUDY-002: Study Site Management
```
As an administrator
I want to manage study sites
So that cases can be linked to sites and investigators

Site Fields:
- Site number
- Site name
- Institution name
- Principal Investigator name
- Sub-investigators
- Address (street, city, state, country)
- Phone, fax, email
- IRB name and approval date
- Site status (active, closed, suspended)
- First patient enrolled date
- Country

Acceptance Criteria:
- Sites linked to studies
- Multiple investigators per site
- Site can be in multiple studies
- Site status tracked
- Address includes country for foreign sites
```

#### REQ-STUDY-003: Investigator Brochure Reference
```
As an administrator
I want to manage Investigator Brochure versions
So that expectedness can be assessed against current IB

IB Fields:
- IB version number
- Effective date
- Document file (PDF upload)
- Known adverse reactions list
  - MedDRA PT code
  - Severity documented
  - Frequency documented
- Change summary from previous version

Acceptance Criteria:
- Multiple IB versions per study
- Known reactions list for expectedness lookup
- IB effective date determines which version to use
- Link to uploaded PDF document
- Track changes between versions
```

### 3.2 IND Case Management

#### REQ-IND-001: IND Case Type
```
As a user
I want to create IND safety reports
So that clinical trial adverse events are properly documented

Case Type: IND Safety Report

Additional Fields (beyond standard ICSR):
- Study/Protocol selection
- IND number (auto-populated from study)
- Site selection
- Subject number (randomization ID)
- Is subject blinded? (Yes/No)
- Treatment arm (if unblinded)
- Study day of event onset
- Date of first dose
- Date of last dose
- Date informed of event

Acceptance Criteria:
- IND case type selectable
- All IND-specific fields captured
- Link to configured study
- Site selection from study sites
- Subject number tracked
- Blinding status captured
```

#### REQ-IND-002: Causality Assessment
```
As a user
I want to document causality assessments
So that the relationship between drug and event is characterized

Causality Categories:
- Related (definite causal relationship)
- Probably related (likely causal)
- Possibly related (could be causal)
- Unlikely related (doubtful causal)
- Not related (no causal relationship)
- Not assessable (insufficient information)

Assessment Sources:
1. Investigator assessment (required)
2. Sponsor assessment (required)
3. Independent assessor (optional)

Assessment Factors:
- Temporal relationship
- Dechallenge/rechallenge results
- Alternative explanations
- Biological plausibility
- Dose-response relationship

Acceptance Criteria:
- Both investigator and sponsor assessment required
- Assessment categories standardized
- Justification text captured
- If assessments differ, explanation required
- Date of each assessment tracked
```

#### REQ-IND-003: Expectedness Assessment
```
As a user
I want to assess whether an event is expected
So that correct reporting requirements are applied

Expectedness Determination:
- Is event listed in current IB? (Yes/No)
- If listed, is severity as documented? (Yes/No)
- If listed, is frequency as documented? (Yes/No)
- Reference IB section/page

Expectedness Result:
- Expected: Listed in IB at observed specificity/severity
- Unexpected: Not listed OR listed but more severe/specific

Acceptance Criteria:
- Compare reaction against IB known reactions
- Suggest expected/unexpected based on IB lookup
- User confirms or overrides assessment
- Justification required for unexpected determination
- IB version used for assessment tracked
```

#### REQ-IND-004: IND Reporting Timeline Calculation
```
As a user
I want the system to calculate due dates
So that regulatory timelines are met

Timeline Rules:
- Day 0 = Date sponsor informed of event
- Fatal/life-threatening SUSAR: 7 calendar days
- Other SUSAR: 15 calendar days
- Follow-up to 7-day: 15 calendar days from initial report
- Follow-up to 15-day: 15 calendar days from new info

SUSAR Criteria (all must be true):
- Serious (meets seriousness criteria)
- Unexpected (per IB)
- Suspected adverse reaction (evidence of causality)

Acceptance Criteria:
- Due date auto-calculated
- 7-day vs 15-day determined by life-threatening status
- Due date displayed prominently
- Overdue reports highlighted
- Non-SUSAR reports tracked for annual report
```

### 3.3 Blinding Management

#### REQ-BLIND-001: Blinded Case Handling
```
As a user
I want to manage blinded cases
So that treatment assignment is protected when appropriate

Blinded Case Rules:
- Treatment arm hidden/masked
- Subject number visible
- Event details fully captured
- Causality may be limited by blinding

Blinded Data Display:
- Treatment shows as "Blinded"
- Dose may show as "As per protocol"
- Product name shows investigational product name

Acceptance Criteria:
- Blinded indicator on case
- Treatment arm hidden when blinded
- All other data captured normally
- Blinded cases can be reported
- Blinding status included in XML when blinded
```

#### REQ-BLIND-002: Unblinding Workflow
```
As a user
I want to unblind a case when appropriate
So that treatment information can be assessed and reported

Unblinding Triggers:
- Serious unexpected event requiring treatment knowledge
- Medical emergency
- Sponsor safety assessment
- Regulatory request
- Study completion/database lock

Unblinding Process:
1. Request unblinding with reason
2. Approval required (if configured)
3. Treatment assignment revealed
4. Unblinding date/time recorded
5. Unblinding reason documented
6. Case updated with treatment info

Acceptance Criteria:
- Unblinding request workflow
- Approval requirement configurable
- Unblinding reason captured
- Date/time of unblinding recorded
- Who unblinded tracked
- Treatment arm populated after unblinding
- Audit trail of unblinding
```

#### REQ-BLIND-003: Unblinded Case Update
```
As a user
I want to update a case after unblinding
So that complete information is submitted to FDA

Post-Unblinding Updates:
- Treatment arm revealed
- Actual dose information
- Re-assess causality with full information
- Update expectedness if needed
- Determine if follow-up report needed

Acceptance Criteria:
- Treatment information editable after unblinding
- Causality re-assessment prompted
- Follow-up report created if changes material
- Original blinded report linked to follow-up
```

### 3.4 IND-Exempt BA/BE Studies

#### REQ-BABE-001: BA/BE Study Configuration
```
As an administrator
I want to configure BA/BE studies
So that safety reports can be properly tracked

BA/BE Study Fields:
- Protocol number
- Study design (crossover, parallel, replicate)
- Test product (generic)
- Reference product (brand)
- Active ingredient
- Dosage form
- Strength
- Population (healthy volunteers / patients)
- Sponsor name
- Pre-ANDA number (if assigned)

Acceptance Criteria:
- BA/BE study type distinct from IND
- No IND number required
- Test and reference products tracked
- Pre-ANDA number optional
```

#### REQ-BABE-002: BA/BE Safety Report
```
As a user
I want to create BA/BE safety reports
So that serious events from BA/BE studies are reported

BA/BE Report Fields:
- Study/protocol selection
- Subject number
- Test or reference product
- Event details (same as ICSR)
- Seriousness criteria
- Causality assessment

Acceptance Criteria:
- BA/BE case type selectable
- Link to configured BA/BE study
- Simplified compared to IND (no blinding)
- 15-day timeline for all serious events
- Submission to OGD (or ESG after Apr 2026)
```

### 3.5 Form FDA 3500A Generation

#### REQ-3500A-001: PDF Form Generation
```
As a user
I want to generate Form FDA 3500A
So that I can submit via non-electronic methods if needed

Form Sections to Populate:
A. Patient Information
   - Initials or identifier
   - Age, sex, weight
   - Ethnicity, race
   
B. Adverse Event or Product Problem
   - Event description
   - Date of event
   - Date of report
   - Outcomes (death, hospitalization, etc.)
   - Relevant tests/lab data
   - Medical history
   
C. Suspect Product(s)
   - Product name
   - Dose, frequency, route
   - Therapy dates
   - Diagnosis for use
   - Event abated on stop?
   - Event reappear on restart?
   - Concomitant products
   
E. Initial Reporter
   - Name and contact info
   - Health professional? (Yes/No)
   - Occupation
   
G. Manufacturer Information
   - Contact information
   - IND/NDA/ANDA number
   - Protocol number
   - Report type (7-day, 15-day, follow-up)
   - Date received from investigator
   - Report source

Acceptance Criteria:
- Generate fillable PDF
- All case data mapped to form fields
- Form validates required fields
- Date formatting correct (dd-mmm-yyyy)
- Narrative fits in available space (truncate with continuation)
- Attachment support for long narratives
```

#### REQ-3500A-002: 3500A Form Preview
```
As a user
I want to preview the 3500A form before finalizing
So that I can verify data accuracy

Preview Features:
- View populated PDF in browser
- Highlight empty required fields
- Side-by-side comparison with case data
- Edit case and regenerate
- Download draft watermarked PDF

Acceptance Criteria:
- Preview renders in browser
- Required fields highlighted if empty
- Comparison view available
- Edits trigger regeneration
- Draft watermark on preview
```

### 3.6 E2B(R3) IND XML Generation

#### REQ-XML-IND-001: IND-Specific XML Elements
```
As the system
I need to generate E2B(R3) XML with IND elements
So that electronic submissions are properly routed

IND-Specific Elements:
- Batch Receiver: ZZFDA_PREMKT
- Message Receiver: CDER_IND or CBER_IND
- IND Number (A.1.6)
- Protocol Number (A.2.3.3)
- Study Type = Clinical Trial (C.5.4)
- Report Type: 7-day (6) or 15-day (5)
- Blinding status
- Causality assessments

Acceptance Criteria:
- Routing IDs correct for IND
- IND number in correct format (6 digits)
- Protocol number included
- Report type indicates 7-day vs 15-day
- Blinding status included
- Both causality assessments included
- Validates against FDA schema
```

#### REQ-XML-IND-002: BA/BE XML Generation
```
As the system
I need to generate E2B(R3) XML for BA/BE studies
So that electronic submissions are properly routed

BA/BE-Specific Elements:
- Batch Receiver: ZZFDA_PREMKT
- Message Receiver: CDER_IND_EXEMPT_BA_BE
- Pre-ANDA number (if available)
- Protocol number
- Report Type: BA/BE (8)

Acceptance Criteria:
- Routing to correct BA/BE queue
- Pre-ANDA number if assigned
- Report type indicates BA/BE
- Validates against FDA schema
```

### 3.7 IND Annual Safety Report

#### REQ-ANNUAL-001: Annual Report Data Collection
```
As a user
I want to aggregate safety data for the annual report
So that IND annual report requirements are met

Annual Report Data:
- All SAEs in reporting period
- Line listing of ICSRs by category:
  - Serious unexpected (submitted as 7/15-day)
  - Serious expected
  - Non-serious events
- Summary tabulations:
  - By system organ class
  - By preferred term
  - By seriousness criteria
  - By causality
  - By outcome
- Narrative summary of safety findings
- IB update recommendations

Acceptance Criteria:
- Date range selection for annual period
- All relevant cases aggregated
- Categorization by report type
- Summary statistics calculated
- Export to Excel for inclusion in annual report
- Filter by study/IND
```

#### REQ-ANNUAL-002: Annual Report Generation
```
As a user
I want to generate annual report content
So that I can prepare the IND annual report

Generated Content:
- Case line listing table
- Summary tabulations (formatted)
- Event frequency tables
- Narrative template with auto-populated stats

Acceptance Criteria:
- Line listing exportable to Excel
- Summary tables formatted
- Narrative template with placeholders
- Review and approval workflow
- Track submission to FDA
```

### 3.8 Protocol Deviation Tracking

#### REQ-DEVIATION-001: Deviation Recording
```
As a user
I want to record protocol deviations
So that deviations related to safety events are documented

Deviation Fields:
- Deviation ID
- Deviation date
- Subject number
- Site
- Deviation category:
  - Inclusion/exclusion criteria
  - Informed consent
  - Prohibited medication
  - Dose modification
  - Visit schedule
  - Specimen collection
  - Other
- Description
- Impact on subject safety
- Impact on data integrity
- Corrective action taken
- Reported to IRB? (date)
- Reported to sponsor? (date)

Acceptance Criteria:
- Deviation recorded independently
- Can link deviation to safety case
- Multiple deviations per case supported
- IRB notification tracked
- Deviation history searchable
```

#### REQ-DEVIATION-002: Deviation-Case Linking
```
As a user
I want to link deviations to safety cases
So that related information is connected

Linking Features:
- Link existing deviation to case
- Create new deviation from case
- View linked deviations on case
- View linked cases on deviation
- Include deviation in narrative

Acceptance Criteria:
- Many-to-many relationship supported
- Linked deviations visible on case
- Deviation info can be included in narrative
- Deviation summary in XML if relevant
```

### 3.9 Investigator Notification

#### REQ-NOTIFY-001: Investigator Safety Notification
```
As a sponsor
I want to notify investigators of safety findings
So that 21 CFR 312.32(c)(1)(iv) requirements are met

Notification Triggers:
- SUSAR reported to FDA
- IB update with new safety information
- Important safety findings

Notification Content:
- Event summary
- Product information
- Action required (if any)
- Updated IB (if applicable)

Acceptance Criteria:
- Generate investigator notification letter
- Track distribution to all sites
- Document receipt acknowledgment
- Template-based notifications
- IRB copy indicator
```

---

## 4. User Interface Requirements

### 4.1 Study Configuration Interface

#### REQ-UI-STUDY-001: Study Setup
```
Study configuration screen:

┌─────────────────────────────────────────────────────────────┐
│ Study Configuration                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Protocol Number: [ABC-001-2026_______________]             │
│ Study Title: [Phase 2 Study of Drug X in Diabetes___]      │
│                                                             │
│ IND Number(s):                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [123456] - CDER  [Remove]                              │ │
│ │ [+ Add IND]                                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Phase: [Phase 2 ▼]    Design: [Randomized, Double-Blind ▼] │
│                                                             │
│ Sponsor: [Acme Pharmaceuticals_____________]               │
│ Therapeutic Area: [Endocrinology ▼]                        │
│ Indication: [Type 2 Diabetes Mellitus_______]              │
│                                                             │
│ Investigational Product(s):                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Drug X 100mg Tablet                         [Remove]   │ │
│ │ Drug X 200mg Tablet                         [Remove]   │ │
│ │ [+ Add Product]                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Status: [Active ▼]                                         │
│ FPFV Date: [2026-01-15]    Target Enrollment: [500]        │
│                                                             │
│ Current IB Version: v5.0 (2025-12-01)  [Manage IB]        │
│                                                             │
│        [Cancel]  [Save Study]                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 IND Case Entry Interface

#### REQ-UI-IND-001: IND Case Header
```
IND case header section:

┌─────────────────────────────────────────────────────────────┐
│ IND Safety Report                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Study: [ABC-001-2026: Phase 2 Study of Drug X ▼]           │
│                                                             │
│ IND: 123456 (auto)    Center: CDER (auto)                  │
│                                                             │
│ Site: [Site 101 - Johns Hopkins ▼]                         │
│ Principal Investigator: Dr. Jane Smith (auto)              │
│                                                             │
│ Subject Number: [SUBJ-2026-0042_____]                      │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Blinding Status                                      │ │
│ │                                                         │ │
│ │ Is subject blinded? ● Yes  ○ No                        │ │
│ │                                                         │ │
│ │ Treatment Arm: [Blinded - Not Available]               │ │
│ │                                                         │ │
│ │ [Request Unblinding]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Date Informed of Event: [2026-01-20] 📅                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Causality Assessment Interface

#### REQ-UI-CAUSALITY-001: Dual Causality Entry
```
Causality assessment section:

┌─────────────────────────────────────────────────────────────┐
│ Causality Assessment                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ INVESTIGATOR ASSESSMENT                                     │
│ ─────────────────────────────────────────────────────────  │
│ Relationship to Study Drug:                                 │
│ ○ Related  ○ Probably Related  ● Possibly Related          │
│ ○ Unlikely Related  ○ Not Related  ○ Not Assessable        │
│                                                             │
│ Assessment Date: [2026-01-22]                              │
│ Assessor: Dr. Jane Smith (Investigator)                    │
│                                                             │
│ Justification:                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Temporal relationship present. Event occurred 3 days   │ │
│ │ after dose increase. No clear alternative etiology.    │ │
│ │ Rechallenge not performed.                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ─────────────────────────────────────────────────────────  │
│ SPONSOR ASSESSMENT                                          │
│ ─────────────────────────────────────────────────────────  │
│ Relationship to Study Drug:                                 │
│ ○ Related  ● Probably Related  ○ Possibly Related          │
│ ○ Unlikely Related  ○ Not Related  ○ Not Assessable        │
│                                                             │
│ Assessment Date: [2026-01-23]                              │
│ Assessor: [Dr. Medical Monitor ▼]                          │
│                                                             │
│ Justification:                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Agree with investigator temporal relationship. Similar │ │
│ │ events seen in other subjects. Biological plausibility │ │
│ │ based on mechanism of action. Upgrading to Probably.   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ⚠️ Assessments differ - explanation required               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Sponsor upgraded based on aggregate safety data showing│ │
│ │ pattern across multiple subjects.                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Expectedness Assessment Interface

#### REQ-UI-EXPECT-001: IB Lookup
```
Expectedness assessment section:

┌─────────────────────────────────────────────────────────────┐
│ Expectedness Assessment                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Reaction: Hepatic enzyme increased (PT: 10019678)          │
│ Severity Reported: Grade 3 (Severe)                        │
│                                                             │
│ Reference IB: Version 5.0 (Effective: 2025-12-01)         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ IB Lookup Result                                        │ │
│ │                                                         │ │
│ │ ✓ Event IS listed in IB (Section 5.3.2, Page 42)       │ │
│ │                                                         │ │
│ │ IB Entry:                                               │ │
│ │ • Term: Hepatic enzyme increased                        │ │
│ │ • Documented Severity: Grade 1-2 (Mild to Moderate)    │ │
│ │ • Documented Frequency: Common (5-10%)                 │ │
│ │                                                         │ │
│ │ ⚠️ Severity exceeds IB documentation                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Is event at specificity/severity documented in IB?         │
│ ○ Yes, as documented  ● No, more severe than documented   │
│                                                             │
│ DETERMINATION: ● UNEXPECTED                                 │
│                ○ Expected                                   │
│                                                             │
│ Justification:                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Grade 3 severity not documented in IB which only lists │ │
│ │ Grade 1-2. Therefore unexpected per 21 CFR 312.32(a).  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Report Classification Interface

#### REQ-UI-CLASS-001: SUSAR Determination
```
Report classification summary:

┌─────────────────────────────────────────────────────────────┐
│ Report Classification                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ CRITERIA CHECKLIST                                          │
│ ─────────────────────────────────────────────────────────  │
│ [✓] Serious (hospitalization, life-threatening, etc.)      │
│ [✓] Suspected Adverse Reaction (evidence of causality)     │
│ [✓] Unexpected (not in IB at severity observed)            │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🚨 This is a SUSAR (Suspected Unexpected Serious        │ │
│ │    Adverse Reaction)                                    │ │
│ │                                                         │ │
│ │    Expedited reporting to FDA is REQUIRED              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ TIMELINE DETERMINATION                                      │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ Is event fatal or life-threatening?                        │
│ ● Yes - Life-threatening                                   │
│ ○ No                                                       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⏰ 7-DAY REPORT REQUIRED                                │ │
│ │                                                         │ │
│ │ Date Informed: January 20, 2026                        │ │
│ │ Due Date: January 27, 2026                             │ │
│ │ Days Remaining: 5                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Report Type: ● 7-Day IND Safety Report                     │
│              ○ 15-Day IND Safety Report                    │
│              ○ Follow-up Report                            │
│              ○ Annual Report Only                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.6 Unblinding Interface

#### REQ-UI-UNBLIND-001: Unblinding Request
```
Unblinding request dialog:

┌─────────────────────────────────────────────────────────────┐
│ Request Unblinding                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Case: IND-2026-001234                                       │
│ Subject: SUBJ-2026-0042                                     │
│ Study: ABC-001-2026                                         │
│                                                             │
│ Current Status: BLINDED                                     │
│                                                             │
│ ⚠️ Unblinding is irreversible and may impact study         │
│    integrity. Proceed only when medically necessary.       │
│                                                             │
│ Reason for Unblinding:                                      │
│ ● Medical emergency / subject safety                       │
│ ○ Serious unexpected event requiring treatment knowledge   │
│ ○ Regulatory request                                        │
│ ○ Sponsor safety assessment                                 │
│ ○ Study completion / database lock                         │
│ ○ Other: [________________________]                        │
│                                                             │
│ Justification:                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Subject experiencing Grade 4 hepatotoxicity requiring  │ │
│ │ immediate medical intervention. Treatment knowledge    │ │
│ │ needed for appropriate management.                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Requestor: Dr. Jane Smith (Investigator)                   │
│ Date/Time: 2026-01-22 14:35 UTC                            │
│                                                             │
│              [Cancel]  [Submit Unblinding Request]         │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Data Model Updates

### 5.1 Study and Site Tables

```sql
-- Clinical studies
CREATE TABLE studies (
    id SERIAL PRIMARY KEY,
    study_id VARCHAR(50) UNIQUE NOT NULL, -- Internal ID
    protocol_number VARCHAR(100) NOT NULL,
    study_title VARCHAR(500) NOT NULL,
    sponsor_name VARCHAR(255),
    phase VARCHAR(20), -- Phase 1, 1/2, 2, 2/3, 3, 3b, 4
    study_design VARCHAR(100),
    therapeutic_area VARCHAR(100),
    indication TEXT,
    target_enrollment INTEGER,
    status VARCHAR(20) DEFAULT 'planned',
        -- planned, enrolling, active, completed, terminated
    fpfv_date DATE, -- First patient first visit
    lplv_date DATE, -- Last patient last visit
    is_blinded BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Study IND numbers (many-to-many)
CREATE TABLE study_inds (
    id SERIAL PRIMARY KEY,
    study_id INTEGER REFERENCES studies(id),
    ind_number VARCHAR(10) NOT NULL, -- 6-digit IND
    center VARCHAR(10) NOT NULL, -- CDER, CBER
    is_primary BOOLEAN DEFAULT FALSE,
    UNIQUE(study_id, ind_number)
);

-- Study sites
CREATE TABLE study_sites (
    id SERIAL PRIMARY KEY,
    study_id INTEGER REFERENCES studies(id),
    site_number VARCHAR(20) NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    institution_name VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    fax VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
        -- pending, active, suspended, closed
    first_enrollment_date DATE,
    irb_name VARCHAR(255),
    irb_approval_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(study_id, site_number)
);

-- Site investigators
CREATE TABLE site_investigators (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES study_sites(id),
    investigator_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- PI, Sub-I, Study Coordinator
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investigational products
CREATE TABLE study_products (
    id SERIAL PRIMARY KEY,
    study_id INTEGER REFERENCES studies(id),
    product_name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255),
    dosage_form VARCHAR(100),
    strength VARCHAR(100),
    route VARCHAR(50),
    is_investigational BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investigator Brochure versions
CREATE TABLE investigator_brochures (
    id SERIAL PRIMARY KEY,
    study_id INTEGER REFERENCES studies(id),
    version_number VARCHAR(20) NOT NULL,
    effective_date DATE NOT NULL,
    document_path TEXT,
    change_summary TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(study_id, version_number)
);

-- IB known adverse reactions (for expectedness lookup)
CREATE TABLE ib_known_reactions (
    id SERIAL PRIMARY KEY,
    ib_id INTEGER REFERENCES investigator_brochures(id),
    meddra_pt_code INTEGER NOT NULL,
    meddra_pt_name VARCHAR(255) NOT NULL,
    documented_severity VARCHAR(50), -- Mild, Moderate, Severe, Grade 1-4
    documented_frequency VARCHAR(50), -- Common, Uncommon, Rare, etc.
    ib_section VARCHAR(50),
    ib_page VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 IND Case Extensions

```sql
-- IND-specific case fields
ALTER TABLE cases ADD COLUMN case_type VARCHAR(20) DEFAULT 'postmarket';
    -- postmarket, ind, babe
ALTER TABLE cases ADD COLUMN study_id INTEGER REFERENCES studies(id);
ALTER TABLE cases ADD COLUMN site_id INTEGER REFERENCES study_sites(id);
ALTER TABLE cases ADD COLUMN subject_number VARCHAR(50);
ALTER TABLE cases ADD COLUMN is_blinded BOOLEAN DEFAULT FALSE;
ALTER TABLE cases ADD COLUMN treatment_arm VARCHAR(100);
ALTER TABLE cases ADD COLUMN study_day_onset INTEGER;
ALTER TABLE cases ADD COLUMN first_dose_date DATE;
ALTER TABLE cases ADD COLUMN last_dose_date DATE;
ALTER TABLE cases ADD COLUMN date_informed DATE; -- Date sponsor informed

-- Expectedness assessment
ALTER TABLE cases ADD COLUMN is_expected BOOLEAN;
ALTER TABLE cases ADD COLUMN expectedness_ib_version VARCHAR(20);
ALTER TABLE cases ADD COLUMN expectedness_ib_section VARCHAR(50);
ALTER TABLE cases ADD COLUMN expectedness_justification TEXT;

-- Report type for IND
ALTER TABLE cases ADD COLUMN ind_report_type VARCHAR(20);
    -- 7_day, 15_day, followup_7day, followup_15day, annual_only

-- Causality assessments
CREATE TABLE case_causality (
    id SERIAL PRIMARY KEY,
    case_id TEXT REFERENCES cases(case_id),
    assessor_type VARCHAR(20) NOT NULL, -- investigator, sponsor, independent
    assessor_name VARCHAR(255),
    assessment_date DATE NOT NULL,
    relationship VARCHAR(50) NOT NULL,
        -- related, probably_related, possibly_related, 
        -- unlikely_related, not_related, not_assessable
    justification TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unblinding records
CREATE TABLE case_unblinding (
    id SERIAL PRIMARY KEY,
    case_id TEXT REFERENCES cases(case_id),
    request_date TIMESTAMP NOT NULL,
    request_reason VARCHAR(50) NOT NULL,
        -- medical_emergency, serious_unexpected, regulatory,
        -- sponsor_assessment, study_completion, other
    request_justification TEXT,
    requested_by INTEGER REFERENCES users(id),
    approval_required BOOLEAN DEFAULT TRUE,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    unblinding_date TIMESTAMP,
    treatment_arm_revealed VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.3 BA/BE Study Tables

```sql
-- BA/BE studies
CREATE TABLE babe_studies (
    id SERIAL PRIMARY KEY,
    protocol_number VARCHAR(100) NOT NULL,
    study_design VARCHAR(50), -- crossover, parallel, replicate
    test_product_name VARCHAR(255) NOT NULL,
    test_product_manufacturer VARCHAR(255),
    reference_product_name VARCHAR(255) NOT NULL,
    reference_product_manufacturer VARCHAR(255),
    active_ingredient VARCHAR(255),
    dosage_form VARCHAR(100),
    strength VARCHAR(100),
    population VARCHAR(50), -- healthy_volunteers, patients
    sponsor_name VARCHAR(255),
    pre_anda_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.4 Protocol Deviations

```sql
-- Protocol deviations
CREATE TABLE protocol_deviations (
    id SERIAL PRIMARY KEY,
    deviation_id VARCHAR(50) UNIQUE NOT NULL,
    study_id INTEGER REFERENCES studies(id),
    site_id INTEGER REFERENCES study_sites(id),
    subject_number VARCHAR(50),
    deviation_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
        -- inclusion_exclusion, informed_consent, prohibited_med,
        -- dose_modification, visit_schedule, specimen, other
    description TEXT NOT NULL,
    impact_on_safety TEXT,
    impact_on_data TEXT,
    corrective_action TEXT,
    reported_to_irb BOOLEAN DEFAULT FALSE,
    irb_report_date DATE,
    reported_to_sponsor BOOLEAN DEFAULT FALSE,
    sponsor_report_date DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deviation-case link
CREATE TABLE deviation_cases (
    deviation_id INTEGER REFERENCES protocol_deviations(id),
    case_id TEXT REFERENCES cases(case_id),
    PRIMARY KEY (deviation_id, case_id)
);
```

### 5.5 Investigator Notifications

```sql
-- Investigator safety notifications
CREATE TABLE investigator_notifications (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
        -- susar_alert, ib_update, safety_finding
    study_id INTEGER REFERENCES studies(id),
    case_id TEXT REFERENCES cases(case_id),
    notification_date DATE NOT NULL,
    subject_line VARCHAR(255),
    content TEXT,
    attachment_path TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification distribution
CREATE TABLE notification_distribution (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES investigator_notifications(id),
    site_id INTEGER REFERENCES study_sites(id),
    recipient_name VARCHAR(255),
    recipient_email VARCHAR(255),
    sent_date TIMESTAMP,
    acknowledged_date TIMESTAMP,
    acknowledged_by VARCHAR(255)
);
```

---

## 6. API Endpoints

### 6.1 Study Management API

```yaml
# Studies
GET /api/v1/studies
  Description: List all studies
  Query: status, phase, therapeutic_area
  Response: Study list

POST /api/v1/studies
  Description: Create study
  Body: Study fields
  Response: Created study

GET /api/v1/studies/{id}
  Description: Get study details with sites, products, IB
  Response: Complete study object

PUT /api/v1/studies/{id}
  Description: Update study
  Body: Study updates
  Response: Updated study

# Study Sites
GET /api/v1/studies/{id}/sites
  Description: List sites for study
  Response: Site list with investigators

POST /api/v1/studies/{id}/sites
  Description: Add site to study
  Body: Site fields
  Response: Created site

# Investigator Brochure
GET /api/v1/studies/{id}/ib
  Description: List IB versions
  Response: IB version list

POST /api/v1/studies/{id}/ib
  Description: Add IB version
  Body: IB fields and file
  Response: Created IB version

GET /api/v1/studies/{id}/ib/{version}/reactions
  Description: Get known reactions for IB version
  Response: Reaction list for expectedness lookup
```

### 6.2 IND Case API

```yaml
POST /api/v1/cases/ind
  Description: Create IND safety report
  Body: IND case fields
  Response: Created case

GET /api/v1/cases/{id}/causality
  Description: Get causality assessments
  Response: Investigator and sponsor assessments

POST /api/v1/cases/{id}/causality
  Description: Add/update causality assessment
  Body: Assessment fields
  Response: Updated assessments

POST /api/v1/cases/{id}/expectedness
  Description: Assess expectedness
  Body: Expectedness determination
  Response: Expectedness result

POST /api/v1/cases/{id}/unblind
  Description: Request unblinding
  Body: Reason, justification
  Response: Unblinding request

PUT /api/v1/cases/{id}/unblind/{request_id}/approve
  Description: Approve unblinding request
  Body: Approval details
  Response: Unblinding completed
```

### 6.3 Form 3500A API

```yaml
POST /api/v1/cases/{id}/form-3500a
  Description: Generate Form FDA 3500A
  Response: PDF file path

GET /api/v1/cases/{id}/form-3500a/preview
  Description: Preview form before generation
  Response: Preview data with validation

GET /api/v1/cases/{id}/form-3500a/download
  Description: Download generated PDF
  Response: PDF file
```

### 6.4 Annual Report API

```yaml
POST /api/v1/studies/{id}/annual-report/generate
  Description: Generate annual report data
  Body: 
    period_start: date
    period_end: date
  Response: Report data and statistics

GET /api/v1/studies/{id}/annual-report/cases
  Description: Get cases for annual report
  Query: period_start, period_end
  Response: Case list with categorization

GET /api/v1/studies/{id}/annual-report/export
  Description: Export annual report tables
  Query: period_start, period_end
  Response: Excel file
```

### 6.5 Protocol Deviation API

```yaml
GET /api/v1/studies/{id}/deviations
  Description: List deviations for study
  Query: category, site, subject
  Response: Deviation list

POST /api/v1/studies/{id}/deviations
  Description: Create deviation
  Body: Deviation fields
  Response: Created deviation

POST /api/v1/cases/{id}/deviations/link
  Description: Link deviation to case
  Body: deviation_id
  Response: Linked deviation

GET /api/v1/cases/{id}/deviations
  Description: Get deviations linked to case
  Response: Linked deviation list
```

---

## 7. Testing Requirements

### 7.1 IND Case Testing

| Test Case | Expected Result |
|-----------|-----------------|
| Create IND case | All IND fields captured |
| Select study | IND auto-populated from study |
| Select site | Investigator info populated |
| Blinded case creation | Treatment arm hidden |
| Causality entry | Both assessments required |
| Expectedness lookup | IB reaction matched |
| SUSAR determination | 7-day or 15-day calculated |
| Due date calculation | Correct based on timeline |

### 7.2 Blinding Testing

| Test Case | Expected Result |
|-----------|-----------------|
| Blinded case display | Treatment arm shows "Blinded" |
| Unblinding request | Request recorded with reason |
| Unblinding approval | Treatment arm revealed |
| Post-unblind update | Causality re-assessment prompted |

### 7.3 XML Testing

| Test Case | Expected Result |
|-----------|-----------------|
| IND XML routing | ZZFDA_PREMKT batch receiver |
| IND number in XML | A.1.6 populated correctly |
| Report type 7-day | FDA.C.1.7.1 = 6 |
| Report type 15-day | FDA.C.1.7.1 = 5 |
| BA/BE routing | CDER_IND_EXEMPT_BA_BE receiver |

### 7.4 Form 3500A Testing

| Test Case | Expected Result |
|-----------|-----------------|
| Generate PDF | All fields populated |
| Required fields | Validated before generation |
| Date formatting | dd-mmm-yyyy format |
| Long narrative | Continuation page used |
| Preview function | Editable before final |

---

## 8. Acceptance Criteria Summary

### 8.1 Must Have
- [ ] IND case type with all required fields
- [ ] Study/protocol configuration
- [ ] Site and investigator management
- [ ] Causality assessment (investigator + sponsor)
- [ ] Expectedness assessment with IB reference
- [ ] 7-day and 15-day timeline calculation
- [ ] Blinded case handling
- [ ] Unblinding workflow
- [ ] Form FDA 3500A generation
- [ ] E2B(R3) XML with IND routing
- [ ] BA/BE study support

### 8.2 Should Have
- [ ] IB known reactions database for lookup
- [ ] Protocol deviation tracking
- [ ] Annual report data aggregation
- [ ] Investigator notification generation
- [ ] SUSAR auto-classification

### 8.3 Nice to Have
- [ ] IB document comparison
- [ ] Investigator notification tracking
- [ ] IRB submission tracking
- [ ] Deviation-case linking
- [ ] Annual report narrative generation

---

## 9. Configuration Options

```yaml
# config/phase6.yaml

ind:
  require_both_causality_assessments: true
  require_expectedness_justification: true
  require_unblinding_approval: true
  default_center: CDER  # or CBER
  
timeline:
  fatal_life_threatening_days: 7
  other_susar_days: 15
  followup_days: 15
  
blinding:
  allow_self_unblinding: false
  unblinding_approvers: ["medical_monitor", "safety_lead"]
  
form_3500a:
  company_name: "Acme Pharmaceuticals"
  company_address: "123 Main St, Boston, MA 02101"
  company_phone: "(555) 123-4567"
  
annual_report:
  default_period_months: 12
  include_expected_sae: true
  include_non_serious: false
```

---

## 10. References

- [21 CFR 312.32](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-312/subpart-B/section-312.32) - IND Safety Reporting
- [21 CFR 320.31](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-320/subpart-B/section-320.31) - BA/BE Study Requirements
- [FDA Guidance: IND Safety Reports](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/providing-regulatory-submissions-electronic-format-ind-safety-reports) - Electronic Submission Format
- [FDA E2B(R3) IND Technical Conformance Guide](https://www.fda.gov/drugs/fdas-adverse-event-reporting-system-faers/fda-adverse-event-reporting-system-faers-electronic-submissions-e2br3-standards)
- [Form FDA 3500A](https://www.fda.gov/safety/medwatch-forms-fda-safety-reporting) - Mandatory Reporting Form
- [ICH E2A](https://database.ich.org/sites/default/files/E2A_Guideline.pdf) - Clinical Safety Data Management
- [ICH E6(R2)](https://database.ich.org/sites/default/files/E6_R2_Addendum.pdf) - Good Clinical Practice
- Phase 5 Requirements: `05_Phase5_DataManagement_Terminology.md`

---

## Next Phase

After completing Phase 6, proceed to **Phase 7: Cosmetics & Multi-Regulatory** which adds:
- MoCRA compliance for cosmetics adverse event reporting
- E2B(R2) format for cosmetics (required by FDA)
- Support for EudraVigilance (EU) submissions
- Multi-regulatory submission management
