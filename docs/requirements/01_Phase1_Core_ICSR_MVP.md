# Phase 1: Core ICSR Submission (MVP)

## Requirements Specification for Claude Code

**Version:** 1.0  
**Phase:** 1 of 12  
**Estimated Duration:** 3-4 months  
**Prerequisites:** None (this is the foundation phase)

---

## 1. Phase Overview

### 1.1 Objective

Build the foundational MVP that allows a single user to create Individual Case Safety Reports (ICSRs), enter all required adverse event data, generate compliant E2B(R3) XML files, and save work locally. This phase establishes the core data model and validation engine that all subsequent phases will build upon.

### 1.2 Success Criteria

- [ ] User can create, edit, save, and delete ICSR cases
- [ ] All E2B(R3) required data elements can be captured
- [ ] Valid E2B(R3) XML is generated that passes FDA schema validation
- [ ] Data persists locally between sessions
- [ ] Basic validation prevents submission of incomplete cases
- [ ] Application runs as a desktop application (Electron recommended)

### 1.3 Out of Scope for Phase 1

- Multi-user support (Phase 3)
- FDA ESG submission (Phase 2)
- User authentication (Phase 3)
- Workflow/approval processes (Phase 3)
- MedDRA auto-coding (Phase 5)
- Import/export from external systems (Phase 5)

---

## 2. Functional Requirements

### 2.1 Case Management

#### REQ-CASE-001: Create New Case
```
As a user
I want to create a new ICSR case
So that I can document an adverse event

Acceptance Criteria:
- User clicks "New Case" button
- System generates a unique case ID (format: CASE-YYYYMMDD-XXXX)
- New case opens in edit mode with empty form
- Case is assigned "Draft" status
- Case creation timestamp is recorded
```

#### REQ-CASE-002: Open Existing Case
```
As a user
I want to open a previously saved case
So that I can continue working on it

Acceptance Criteria:
- User sees list of all saved cases
- List shows: Case ID, Status, Patient Initials, Product Name, Created Date, Modified Date
- User can search/filter cases by any column
- Double-click or "Open" button loads case data into form
- Case opens in view mode; user must click "Edit" to modify
```

#### REQ-CASE-003: Save Case
```
As a user
I want to save my case at any time
So that I don't lose my work

Acceptance Criteria:
- "Save" button available at all times during editing
- Save can occur even with incomplete/invalid data
- System shows confirmation message on successful save
- Last modified timestamp is updated
- Auto-save every 5 minutes (configurable)
- Warning if user tries to close with unsaved changes
```

#### REQ-CASE-004: Delete Case
```
As a user
I want to delete a case I no longer need
So that I can keep my case list clean

Acceptance Criteria:
- "Delete" button available for cases in Draft status only
- System prompts for confirmation before deletion
- Deleted cases are soft-deleted (marked as deleted, not physically removed)
- Deleted cases do not appear in normal case list
- Admin recovery possible (future phase)
```

#### REQ-CASE-005: Duplicate Case
```
As a user
I want to duplicate an existing case
So that I can create similar cases quickly (e.g., follow-up reports)

Acceptance Criteria:
- "Duplicate" option available for any case
- Creates new case with new Case ID
- Copies all data from source case
- Clears submission-related fields
- Sets Report Type to "Follow-up" if duplicating submitted case
- Links to original case (Related Case ID)
```

### 2.2 Case Data Entry

#### REQ-DATA-001: Report Information Section
```
Data elements to capture (E2B R3 Section A):

A.1.0.1 - Safety Report ID (auto-generated, editable)
A.1.2   - Report Type (dropdown):
          - 1 = Spontaneous report
          - 2 = Report from study
          - 3 = Other
          - 4 = Not available to sender
A.1.4   - Type of Report (dropdown):
          - 1 = Initial
          - 2 = Follow-up
A.1.5.1 - Initial Receipt Date (date picker, required)
A.1.5.2 - Most Recent Information Date (date picker, required)
A.1.6   - Additional Documents Available (boolean)
A.1.7   - Case Fulfills Local Criteria for Expedited Report (boolean)
A.1.8.1 - Worldwide Unique Case ID (text, optional)
A.1.9   - Other Case Identifiers (repeating group):
          - Source (dropdown)
          - Case ID (text)
A.1.10.1 - Nullification/Amendment (dropdown):
           - 1 = Nullification
           - 2 = Amendment
A.1.10.2 - Nullification/Amendment Reason (text, if A.1.10.1 selected)
A.1.11  - Report Linked to Another Report (repeating):
          - Report ID
          - Link Type
```

#### REQ-DATA-002: Primary Source Section
```
Data elements to capture (E2B R3 Section A.2):

A.2.1.1 - Reporter Title (text)
A.2.1.2 - Reporter Given Name (text)
A.2.1.3 - Reporter Family Name (text)
A.2.1.4 - Reporter Qualification (dropdown, required):
          - 1 = Physician
          - 2 = Pharmacist
          - 3 = Other Health Professional
          - 4 = Lawyer
          - 5 = Consumer or non-health professional
A.2.2   - Reporter Organization (text)
A.2.3   - Reporter Department (text)
A.2.4   - Reporter Address (multiline text)
A.2.5   - Reporter City (text)
A.2.6   - Reporter State/Province (text)
A.2.7   - Reporter Postcode (text)
A.2.8   - Reporter Country (dropdown - ISO 3166-1)
A.2.9   - Reporter Telephone (text)
A.2.10  - Reporter Email (text, email validation)
A.2.r   - Additional Reporters (repeating group of above)
```

#### REQ-DATA-003: Sender Information Section
```
Data elements to capture (E2B R3 Section A.3):

A.3.1.1 - Sender Type (dropdown, required):
          - 1 = Pharmaceutical company
          - 2 = Regulatory authority
          - 3 = Health professional
          - 4 = Regional pharmacovigilance centre
          - 5 = WHO collaborating centre
          - 6 = Other
A.3.1.2 - Sender Organization (text, required)
A.3.1.3 - Sender Department (text)
A.3.1.4 - Sender Given Name (text, required)
A.3.1.5 - Sender Family Name (text, required)
A.3.2   - Sender Address (text)
A.3.3   - Sender City (text)
A.3.4   - Sender State/Province (text)
A.3.5   - Sender Postcode (text)
A.3.6   - Sender Country (dropdown - ISO 3166-1)
A.3.7   - Sender Telephone (text)
A.3.8   - Sender Fax (text)
A.3.9   - Sender Email (text, email validation)
```

#### REQ-DATA-004: Patient Information Section
```
Data elements to capture (E2B R3 Section B.1):

B.1.1   - Patient Initials (text, max 10 chars)
B.1.1.1 - Patient GP Medical Record Number (text)
B.1.1.2 - Patient Specialist Medical Record Number (text)
B.1.1.3 - Patient Hospital Medical Record Number (text)
B.1.1.4 - Patient Investigation Number (text)

B.1.2   - Age Information (one of):
B.1.2.1   - Birth Date (date, partial dates allowed)
B.1.2.2a  - Age at Time of Onset (number)
B.1.2.2b  - Age Unit (dropdown: Year, Month, Week, Day, Hour)
B.1.2.2.1 - Gestation Period (weeks, if applicable)
B.1.2.3   - Patient Age Group (dropdown):
            - 1 = Neonate (< 1 month)
            - 2 = Infant (1 month - 2 years)
            - 3 = Child (2-11 years)
            - 4 = Adolescent (12-17 years)
            - 5 = Adult (18-64 years)
            - 6 = Elderly (≥65 years)

B.1.3   - Body Weight (kg, decimal)
B.1.4   - Height (cm, decimal)
B.1.5   - Sex (dropdown, required):
          - 1 = Male
          - 2 = Female
          - 0 = Unknown

B.1.6   - Last Menstrual Period Date (date, if female)

B.1.7   - Medical History (repeating group):
B.1.7.1   - Disease/Condition (text or MedDRA LLT)
B.1.7.1.1 - MedDRA Version (auto-populated)
B.1.7.2   - Start Date (date)
B.1.7.3   - Continuing (boolean)
B.1.7.4   - End Date (date, if not continuing)
B.1.7.5   - Comments (text)
B.1.7.6   - Family History (boolean)

B.1.8   - Past Drug History (repeating group):
B.1.8.r.1   - Drug Name (text)
B.1.8.r.2   - MPID (optional)
B.1.8.r.3   - Start Date
B.1.8.r.4   - End Date
B.1.8.r.5   - Indication (MedDRA LLT)
B.1.8.r.6   - Reaction (MedDRA LLT)
```

#### REQ-DATA-005: Patient Death Information
```
Data elements (E2B R3 Section B.1.9, if death occurred):

B.1.9.1 - Date of Death (date)
B.1.9.2 - Reported Cause(s) of Death (repeating):
B.1.9.2.1 - Cause (MedDRA LLT)
B.1.9.3 - Autopsy Performed (boolean)
B.1.9.4 - Autopsy Cause(s) of Death (repeating):
B.1.9.4.1 - Cause (MedDRA LLT)
```

#### REQ-DATA-006: Reaction/Event Information
```
Data elements (E2B R3 Section B.2, repeating group for each reaction):

B.2.i.0   - Reaction Assessment Source (dropdown):
            - 1 = Reporter
            - 2 = Sender
B.2.i.1   - Reaction (MedDRA LLT, required for at least one)
B.2.i.1.1 - MedDRA Version (auto-populated)
B.2.i.2   - Reaction in Native Language (text)
B.2.i.3   - Start Date (date)
B.2.i.4   - End Date (date)
B.2.i.5   - Duration (number)
B.2.i.6   - Duration Unit (dropdown: Year, Month, Week, Day, Hour, Minute)

B.2.i.7   - Seriousness (required):
B.2.i.7.1   - Results in Death (boolean)
B.2.i.7.2a  - Life-Threatening (boolean)
B.2.i.7.2b  - Caused/Prolonged Hospitalization (boolean)
B.2.i.7.2c  - Disabling/Incapacitating (boolean)
B.2.i.7.2d  - Congenital Anomaly (boolean)
B.2.i.7.2e  - Other Medically Important (boolean)

B.2.i.8   - Outcome (dropdown):
            - 1 = Recovered/Resolved
            - 2 = Recovering/Resolving
            - 3 = Not recovered/Not resolved
            - 4 = Recovered with sequelae
            - 5 = Fatal
            - 0 = Unknown

B.2.i.9   - Medical Confirmation by HCP (boolean)
```

#### REQ-DATA-007: Drug Information
```
Data elements (E2B R3 Section B.4, repeating group for each drug):

B.4.k.1   - Drug Characterization (dropdown, required):
            - 1 = Suspect
            - 2 = Concomitant
            - 3 = Interacting

B.4.k.2   - Drug Identification:
B.4.k.2.1   - Product Name (text, required)
B.4.k.2.2   - MPID (text, optional)
B.4.k.2.3   - PhPID (text, optional)

B.4.k.3   - Active Substance (repeating):
B.4.k.3.1   - Substance Name (text)
B.4.k.3.2   - Substance Code (text)
B.4.k.3.3   - Strength (number)
B.4.k.3.4   - Strength Unit (text)

B.4.k.4   - Dosage Information:
B.4.k.4.r.1   - Dose (number)
B.4.k.4.r.1a  - Dose (First) (number, for ranges)
B.4.k.4.r.1b  - Dose (Last) (number, for ranges)
B.4.k.4.r.2   - Dose Unit (dropdown - UCUM)
B.4.k.4.r.3   - Number of Units (number)
B.4.k.4.r.4   - Interval Unit (dropdown)
B.4.k.4.r.5   - Interval Definition (dropdown):
                - Cyclical, As necessary, Total, etc.
B.4.k.4.r.6   - Dosage Text (text)
B.4.k.4.r.7   - Pharmaceutical Form (dropdown)
B.4.k.4.r.8   - Route of Administration (dropdown - EDQM)
B.4.k.4.r.9   - Parent Route (dropdown, for pediatric)
B.4.k.4.r.10  - Dosage Information (repeating for complex regimens)

B.4.k.5   - Cumulative Dose (number)
B.4.k.5.1 - Cumulative Dose Unit (text)
B.4.k.5.2 - Cumulative Dose to First Reaction (number)
B.4.k.5.3 - Cumulative Dose to First Reaction Unit (text)

B.4.k.6   - Gestation at Exposure (weeks, if applicable)

B.4.k.7   - Indication (MedDRA LLT)

B.4.k.8   - Start Date (date)
B.4.k.9   - End Date (date)
B.4.k.10  - Duration (number)
B.4.k.10a - Duration Unit (dropdown)

B.4.k.11  - Time to Onset (number)
B.4.k.11a - Time to Onset Unit (dropdown)

B.4.k.12  - Action Taken (dropdown):
            - 1 = Drug withdrawn
            - 2 = Dose reduced
            - 3 = Dose increased
            - 4 = Dose not changed
            - 5 = Unknown
            - 6 = Not applicable

B.4.k.13  - Dechallenge/Rechallenge:
B.4.k.13.1  - Dechallenge Result (dropdown):
              - 1 = Yes (reaction abated)
              - 2 = No (reaction did not abate)
              - 3 = Unknown
              - 4 = Not applicable
B.4.k.13.2  - Rechallenge Result (dropdown):
              - 1 = Yes (reaction recurred)
              - 2 = No (reaction did not recur)
              - 3 = Unknown
              - 4 = Not applicable

B.4.k.14  - Drug-Reaction Assessment (repeating):
B.4.k.14.1  - Assessment Source
B.4.k.14.2  - Assessment Method
B.4.k.14.3  - Assessment Result

B.4.k.15  - Additional Information (text)

B.4.k.16  - Drug-Reaction Matrix (linking drugs to reactions)
```

#### REQ-DATA-008: Narrative Summary
```
Data elements (E2B R3 Section B.5):

B.5.1   - Case Narrative (text, required)
        - Rich text editor with basic formatting
        - Character limit: 20,000
        - Required for all cases
        
B.5.2   - Reporter's Comments (text)
B.5.3   - Sender's Comments (text)
B.5.4   - Sender's Diagnosis (MedDRA LLT)
```

### 2.3 Form Navigation and User Interface

#### REQ-UI-001: Main Application Window
```
Layout:
┌─────────────────────────────────────────────────────────────┐
│  Menu Bar: File | Edit | Case | Tools | Help                │
├─────────────────────────────────────────────────────────────┤
│  Toolbar: [New] [Open] [Save] [Validate] [Export XML]       │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│  Navigation   │          Main Content Area                  │
│  Panel        │                                             │
│               │  (Form sections displayed here)             │
│  □ Report     │                                             │
│  □ Reporter   │                                             │
│  □ Sender     │                                             │
│  □ Patient    │                                             │
│  □ Reactions  │                                             │
│  □ Drugs      │                                             │
│  □ Narrative  │                                             │
│               │                                             │
├───────────────┴─────────────────────────────────────────────┤
│  Status Bar: [Case ID] [Status] [Last Saved] [Validation]   │
└─────────────────────────────────────────────────────────────┘
```

#### REQ-UI-002: Form Section Navigation
```
As a user
I want to navigate between form sections easily
So that I can efficiently complete the case

Acceptance Criteria:
- Left navigation panel shows all sections
- Visual indicator shows which sections have data
- Visual indicator shows sections with validation errors (red)
- Click on section scrolls/switches to that section
- Keyboard shortcuts: Ctrl+1 through Ctrl+7 for sections
- Sections can be collapsed/expanded
```

#### REQ-UI-003: Repeating Groups UI
```
As a user
I want to add multiple items (reactions, drugs, etc.)
So that I can capture all relevant data

Acceptance Criteria:
- "Add" button to create new item in group
- Each item shows in a card/panel format
- "Remove" button to delete item (with confirmation)
- "Duplicate" button to copy item
- Drag-and-drop to reorder items
- Collapse/expand individual items
- Summary header showing key fields when collapsed
```

#### REQ-UI-004: Data Entry Aids
```
Features to implement:
- Date picker with partial date support (YYYY, YYYY-MM, YYYY-MM-DD)
- Dropdown fields with type-ahead search
- Required fields marked with red asterisk (*)
- Tooltip/help text on field hover
- Field-level validation messages
- Copy/paste support for all fields
- Undo/redo support (Ctrl+Z, Ctrl+Y)
- Tab navigation through fields
```

#### REQ-UI-005: Case List View
```
Layout:
┌──────────────────────────────────────────────────────────────┐
│  Search: [_______________] [Status: All ▼] [Date Range ▼]    │
├──────────────────────────────────────────────────────────────┤
│  Case ID      │ Status │ Patient │ Product  │ Created │ Mod  │
├───────────────┼────────┼─────────┼──────────┼─────────┼──────┤
│ CASE-2026...  │ Draft  │ JD      │ DrugA    │ Jan 15  │ Jan 20│
│ CASE-2026...  │ Ready  │ MS      │ DrugB    │ Jan 14  │ Jan 18│
│ ...           │        │         │          │         │       │
├──────────────────────────────────────────────────────────────┤
│  Showing 1-25 of 150 cases    [< Prev] [Page 1 ▼] [Next >]  │
└──────────────────────────────────────────────────────────────┘

Features:
- Sortable columns (click header)
- Resizable columns
- Double-click to open case
- Right-click context menu: Open, Duplicate, Delete, Export
- Multi-select with Shift/Ctrl for bulk operations
```

### 2.4 Validation

#### REQ-VAL-001: Field-Level Validation
```
Validation rules by type:
- Required fields: Cannot be empty/null
- Date fields: Valid date format, logical range
- Email fields: Valid email format
- Number fields: Within specified range
- Text fields: Max length constraints
- Dropdown fields: Value from allowed list

Implementation:
- Validate on field blur (when user leaves field)
- Show inline error message below field
- Highlight field border in red
- Prevent focus loss only for critical errors (optional)
```

#### REQ-VAL-002: Cross-Field Validation
```
Rules to implement:
- If Death = Yes, Death Date is required
- If Death = Yes, at least one seriousness = Death must be checked
- If Hospitalization = Yes, relevant reaction must have this seriousness
- Age OR Birth Date required (one must be provided)
- End Date must be >= Start Date
- Reaction End Date >= Reaction Start Date
- Drug End Date >= Drug Start Date
- At least one reaction required
- At least one suspect drug required
- Narrative cannot be empty
```

#### REQ-VAL-003: E2B(R3) Schema Validation
```
As a user
I want to validate my case against E2B(R3) requirements
So that I know it will be accepted by FDA

Acceptance Criteria:
- "Validate" button runs full validation
- Validation checks all E2B(R3) mandatory fields
- Validation checks E2B(R3) conditional requirements
- Results shown in validation panel:
  - Errors (red): Must fix before submission
  - Warnings (yellow): Should review
  - Info (blue): Suggestions
- Click on validation item navigates to relevant field
- Export validation report as PDF (optional)
```

#### REQ-VAL-004: Validation Rules Summary
```
E2B(R3) Required Fields:
- A.1.2 (Type of Report)
- A.1.4 (Report Type: Initial/Follow-up)
- A.1.5.1 (Initial Receipt Date)
- A.1.5.2 (Most Recent Information Date)
- A.2.1.4 (Reporter Qualification)
- A.3.1.1 (Sender Type)
- A.3.1.2 (Sender Organization)
- A.3.1.4 (Sender Given Name)
- A.3.1.5 (Sender Family Name)
- B.1.5 (Patient Sex)
- B.2.i.1 (At least one Reaction)
- B.2.i.7 (Seriousness for each reaction)
- B.4.k.1 (Drug Characterization for each drug)
- B.4.k.2.1 (Drug Name for each drug)
- B.5.1 (Case Narrative)

Conditional Requirements:
- If B.2.i.7.1 (Death) = Yes → B.1.9.1 (Death Date) recommended
- If A.1.10.1 (Nullification) selected → A.1.10.2 (Reason) required
- If B.1.2.1 (Birth Date) empty → B.1.2.2 (Age) required
```

### 2.5 E2B(R3) XML Generation

#### REQ-XML-001: Generate XML
```
As a user
I want to generate E2B(R3) XML from my case
So that I can submit it to FDA

Acceptance Criteria:
- "Generate XML" or "Export XML" button
- Runs validation first; blocks if critical errors
- Shows warnings but allows XML generation
- Generates XML conforming to ICH E2B(R3) schema
- XML includes FDA regional specifications
- Saves XML file to user-specified location
- Default filename: {CaseID}_{Timestamp}.xml
```

#### REQ-XML-002: XML Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ichicsr lang="en" xmlns="urn:hl7-org:v3">
  <!-- Message Header -->
  <id root="{UUID}" extension="{MessageID}"/>
  <creationTime value="{Timestamp}"/>
  <responseModeCode code="D"/>
  <interactionId root="2.16.840.1.113883.1.6" extension="MCCI_IN200100UV01"/>
  <processingCode code="P"/>
  <processingModeCode code="T"/>
  <acceptAckCode code="AL"/>
  
  <!-- Receiver (FDA) -->
  <receiver typeCode="RCV">
    <device classCode="DEV" determinerCode="INSTANCE">
      <id root="2.16.840.1.113883.3.989.2.1.3.14" extension="FDA-CBER-CDER"/>
    </device>
  </receiver>
  
  <!-- Sender -->
  <sender typeCode="SND">
    <device classCode="DEV" determinerCode="INSTANCE">
      <id root="{SenderOID}" extension="{SenderID}"/>
    </device>
  </sender>
  
  <!-- Control Act -->
  <controlActProcess classCode="CACT" moodCode="EVN">
    <subject typeCode="SUBJ">
      <!-- ICSR Content Here -->
      <investigationEvent classCode="INVSTG" moodCode="EVN">
        <!-- Safety Report Content -->
      </investigationEvent>
    </subject>
  </controlActProcess>
</ichicsr>
```

#### REQ-XML-003: XML Validation
```
As a user
I want to verify my XML is valid
So that FDA will accept my submission

Acceptance Criteria:
- Validate against ICH E2B(R3) XSD schema
- Validate against FDA regional implementation guide
- Show validation errors with line numbers
- Option to view raw XML in editor
- Pretty-print formatting for readability
```

### 2.6 Local Data Persistence

#### REQ-DB-001: Database Selection
```
Technology: SQLite (embedded, file-based)

Rationale:
- No server installation required
- Single file for easy backup
- Cross-platform support
- Sufficient for single-user use
- Easy to migrate to PostgreSQL in Phase 3

Database file location:
- Windows: %APPDATA%/FAERSApp/faers.db
- macOS: ~/Library/Application Support/FAERSApp/faers.db
- Linux: ~/.config/FAERSApp/faers.db
```

#### REQ-DB-002: Core Data Model
```sql
-- Cases table (main ICSR record)
CREATE TABLE cases (
    id              TEXT PRIMARY KEY,           -- CASE-YYYYMMDD-XXXX
    status          TEXT NOT NULL DEFAULT 'Draft',  -- Draft, Ready, Exported
    created_at      DATETIME NOT NULL,
    updated_at      DATETIME NOT NULL,
    deleted_at      DATETIME,                   -- Soft delete
    
    -- Report Information (A.1)
    safety_report_id    TEXT,                   -- A.1.0.1
    report_type         INTEGER,                -- A.1.2
    initial_or_followup INTEGER,                -- A.1.4
    receipt_date        TEXT,                   -- A.1.5.1 (ISO date)
    receive_date        TEXT,                   -- A.1.5.2
    additional_docs     INTEGER,                -- A.1.6
    expedited_report    INTEGER,                -- A.1.7
    worldwide_case_id   TEXT,                   -- A.1.8.1
    nullification_type  INTEGER,                -- A.1.10.1
    nullification_reason TEXT,                  -- A.1.10.2
    
    -- Sender Information (A.3) - typically constant
    sender_type         INTEGER,                -- A.3.1.1
    sender_organization TEXT,                   -- A.3.1.2
    sender_department   TEXT,                   -- A.3.1.3
    sender_given_name   TEXT,                   -- A.3.1.4
    sender_family_name  TEXT,                   -- A.3.1.5
    sender_address      TEXT,
    sender_city         TEXT,
    sender_state        TEXT,
    sender_postcode     TEXT,
    sender_country      TEXT,
    sender_phone        TEXT,
    sender_fax          TEXT,
    sender_email        TEXT,
    
    -- Patient Information (B.1)
    patient_initials    TEXT,                   -- B.1.1
    patient_gp_record   TEXT,                   -- B.1.1.1
    patient_specialist_record TEXT,             -- B.1.1.2
    patient_hospital_record TEXT,               -- B.1.1.3
    patient_investigation TEXT,                 -- B.1.1.4
    patient_birthdate   TEXT,                   -- B.1.2.1
    patient_age         REAL,                   -- B.1.2.2a
    patient_age_unit    TEXT,                   -- B.1.2.2b
    patient_age_group   INTEGER,                -- B.1.2.3
    patient_weight      REAL,                   -- B.1.3
    patient_height      REAL,                   -- B.1.4
    patient_sex         INTEGER,                -- B.1.5
    patient_lmp_date    TEXT,                   -- B.1.6
    
    -- Death Information (B.1.9)
    patient_death       INTEGER DEFAULT 0,      -- Boolean
    death_date          TEXT,                   -- B.1.9.1
    autopsy_performed   INTEGER,                -- B.1.9.3
    
    -- Narrative (B.5)
    case_narrative      TEXT,                   -- B.5.1
    reporter_comments   TEXT,                   -- B.5.2
    sender_comments     TEXT,                   -- B.5.3
    sender_diagnosis    TEXT,                   -- B.5.4
    
    -- Metadata
    version             INTEGER DEFAULT 1,
    exported_at         DATETIME,
    exported_xml_path   TEXT
);

-- Primary Source / Reporters (A.2)
CREATE TABLE case_reporters (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    is_primary      INTEGER DEFAULT 0,          -- Boolean
    title           TEXT,                       -- A.2.1.1
    given_name      TEXT,                       -- A.2.1.2
    family_name     TEXT,                       -- A.2.1.3
    qualification   INTEGER,                    -- A.2.1.4
    organization    TEXT,                       -- A.2.2
    department      TEXT,                       -- A.2.3
    address         TEXT,                       -- A.2.4
    city            TEXT,                       -- A.2.5
    state           TEXT,                       -- A.2.6
    postcode        TEXT,                       -- A.2.7
    country         TEXT,                       -- A.2.8
    phone           TEXT,                       -- A.2.9
    email           TEXT,                       -- A.2.10
    sort_order      INTEGER DEFAULT 0
);

-- Other Case Identifiers (A.1.9)
CREATE TABLE case_identifiers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    source          TEXT,                       -- A.1.9.1
    identifier      TEXT                        -- A.1.9.2
);

-- Related Reports (A.1.11)
CREATE TABLE case_related_reports (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    related_case_id TEXT,                       -- A.1.11.1
    link_type       INTEGER                     -- A.1.11.2
);

-- Medical History (B.1.7)
CREATE TABLE case_medical_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    condition       TEXT,                       -- B.1.7.1
    meddra_code     TEXT,                       -- MedDRA LLT code
    meddra_version  TEXT,                       -- B.1.7.1.1
    start_date      TEXT,                       -- B.1.7.2
    continuing      INTEGER,                    -- B.1.7.3
    end_date        TEXT,                       -- B.1.7.4
    comments        TEXT,                       -- B.1.7.5
    family_history  INTEGER,                    -- B.1.7.6
    sort_order      INTEGER DEFAULT 0
);

-- Past Drug History (B.1.8)
CREATE TABLE case_drug_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    drug_name       TEXT,                       -- B.1.8.r.1
    mpid            TEXT,                       -- B.1.8.r.2
    start_date      TEXT,                       -- B.1.8.r.3
    end_date        TEXT,                       -- B.1.8.r.4
    indication      TEXT,                       -- B.1.8.r.5
    indication_code TEXT,
    reaction        TEXT,                       -- B.1.8.r.6
    reaction_code   TEXT,
    sort_order      INTEGER DEFAULT 0
);

-- Death Causes (B.1.9.2, B.1.9.4)
CREATE TABLE case_death_causes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    cause_type      TEXT,                       -- 'reported' or 'autopsy'
    cause           TEXT,                       -- MedDRA LLT
    meddra_code     TEXT,
    sort_order      INTEGER DEFAULT 0
);

-- Reactions (B.2)
CREATE TABLE case_reactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    assessment_source INTEGER,                  -- B.2.i.0
    reaction_term   TEXT NOT NULL,              -- B.2.i.1
    meddra_code     TEXT,
    meddra_version  TEXT,                       -- B.2.i.1.1
    native_term     TEXT,                       -- B.2.i.2
    start_date      TEXT,                       -- B.2.i.3
    end_date        TEXT,                       -- B.2.i.4
    duration        REAL,                       -- B.2.i.5
    duration_unit   TEXT,                       -- B.2.i.6
    
    -- Seriousness (B.2.i.7)
    serious_death           INTEGER DEFAULT 0,  -- B.2.i.7.1
    serious_life_threat     INTEGER DEFAULT 0,  -- B.2.i.7.2a
    serious_hospitalization INTEGER DEFAULT 0,  -- B.2.i.7.2b
    serious_disability      INTEGER DEFAULT 0,  -- B.2.i.7.2c
    serious_congenital      INTEGER DEFAULT 0,  -- B.2.i.7.2d
    serious_other           INTEGER DEFAULT 0,  -- B.2.i.7.2e
    
    outcome         INTEGER,                    -- B.2.i.8
    medical_confirm INTEGER,                    -- B.2.i.9
    sort_order      INTEGER DEFAULT 0
);

-- Drugs (B.4)
CREATE TABLE case_drugs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    characterization INTEGER NOT NULL,          -- B.4.k.1 (1=Suspect, 2=Concomitant, 3=Interacting)
    product_name    TEXT NOT NULL,              -- B.4.k.2.1
    mpid            TEXT,                       -- B.4.k.2.2
    phpid           TEXT,                       -- B.4.k.2.3
    
    cumulative_dose REAL,                       -- B.4.k.5
    cumulative_unit TEXT,                       -- B.4.k.5.1
    cumulative_first REAL,                      -- B.4.k.5.2
    cumulative_first_unit TEXT,                 -- B.4.k.5.3
    
    gestation_exposure REAL,                    -- B.4.k.6
    indication      TEXT,                       -- B.4.k.7
    indication_code TEXT,
    
    start_date      TEXT,                       -- B.4.k.8
    end_date        TEXT,                       -- B.4.k.9
    duration        REAL,                       -- B.4.k.10
    duration_unit   TEXT,                       -- B.4.k.10a
    
    time_to_onset   REAL,                       -- B.4.k.11
    time_onset_unit TEXT,                       -- B.4.k.11a
    
    action_taken    INTEGER,                    -- B.4.k.12
    dechallenge     INTEGER,                    -- B.4.k.13.1
    rechallenge     INTEGER,                    -- B.4.k.13.2
    additional_info TEXT,                       -- B.4.k.15
    
    sort_order      INTEGER DEFAULT 0
);

-- Drug Active Substances (B.4.k.3)
CREATE TABLE case_drug_substances (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    drug_id         INTEGER NOT NULL REFERENCES case_drugs(id) ON DELETE CASCADE,
    substance_name  TEXT,                       -- B.4.k.3.1
    substance_code  TEXT,                       -- B.4.k.3.2
    strength        REAL,                       -- B.4.k.3.3
    strength_unit   TEXT,                       -- B.4.k.3.4
    sort_order      INTEGER DEFAULT 0
);

-- Drug Dosage Information (B.4.k.4)
CREATE TABLE case_drug_dosages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    drug_id         INTEGER NOT NULL REFERENCES case_drugs(id) ON DELETE CASCADE,
    dose            REAL,                       -- B.4.k.4.r.1
    dose_first      REAL,                       -- B.4.k.4.r.1a
    dose_last       REAL,                       -- B.4.k.4.r.1b
    dose_unit       TEXT,                       -- B.4.k.4.r.2
    num_units       REAL,                       -- B.4.k.4.r.3
    interval_unit   TEXT,                       -- B.4.k.4.r.4
    interval_def    TEXT,                       -- B.4.k.4.r.5
    dosage_text     TEXT,                       -- B.4.k.4.r.6
    pharma_form     TEXT,                       -- B.4.k.4.r.7
    route           TEXT,                       -- B.4.k.4.r.8
    parent_route    TEXT,                       -- B.4.k.4.r.9
    sort_order      INTEGER DEFAULT 0
);

-- Drug-Reaction Matrix (B.4.k.16)
CREATE TABLE case_drug_reaction_matrix (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    drug_id         INTEGER NOT NULL REFERENCES case_drugs(id) ON DELETE CASCADE,
    reaction_id     INTEGER NOT NULL REFERENCES case_reactions(id) ON DELETE CASCADE,
    assessment_source TEXT,                     -- B.4.k.14.1
    assessment_method TEXT,                     -- B.4.k.14.2
    assessment_result TEXT                      -- B.4.k.14.3
);

-- Attachments
CREATE TABLE case_attachments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,
    file_type       TEXT,
    file_size       INTEGER,
    file_path       TEXT,
    description     TEXT,
    created_at      DATETIME NOT NULL
);

-- Application Settings
CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value           TEXT,
    updated_at      DATETIME
);

-- Lookup Tables for Dropdowns
CREATE TABLE lookup_countries (
    code            TEXT PRIMARY KEY,           -- ISO 3166-1 alpha-2
    name            TEXT NOT NULL
);

CREATE TABLE lookup_meddra_terms (
    code            TEXT PRIMARY KEY,           -- LLT code
    term            TEXT NOT NULL,
    pt_code         TEXT,                       -- Preferred Term code
    version         TEXT
);

-- Indexes
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created ON cases(created_at);
CREATE INDEX idx_cases_deleted ON cases(deleted_at);
CREATE INDEX idx_reactions_case ON case_reactions(case_id);
CREATE INDEX idx_drugs_case ON case_drugs(case_id);
```

#### REQ-DB-003: Data Backup
```
As a user
I want to backup my data
So that I don't lose my work

Acceptance Criteria:
- Manual backup: File > Backup Database
- Creates timestamped copy of database file
- Default backup location: Documents/FAERSApp/Backups/
- Auto-backup on application close (configurable)
- Restore from backup option
- Keep last 10 backups (configurable)
```

---

## 3. Non-Functional Requirements

### 3.1 Performance

| Metric | Target |
|--------|--------|
| Application startup | < 3 seconds |
| Case load time | < 1 second |
| Case save time | < 500ms |
| XML generation | < 2 seconds |
| Search results | < 1 second |

### 3.2 Usability

- All actions accessible via keyboard shortcuts
- Consistent UI patterns throughout
- Support for screen readers (accessibility)
- Minimum display resolution: 1280x720
- Works on Windows 10+, macOS 11+, Ubuntu 20.04+

### 3.3 Reliability

- Auto-save prevents data loss
- Graceful handling of unexpected errors
- Application crash recovery (restore unsaved changes)
- Database integrity checks on startup

### 3.4 Security

- Local data encryption at rest (optional, user-configured)
- No data transmission to external servers (Phase 1)
- Secure deletion of temporary files

---

## 4. Technical Implementation Guide

### 4.1 Recommended Technology Stack

```
Application Framework: Electron
├── Frontend: React + TypeScript
│   ├── UI Library: Ant Design or Material-UI
│   ├── State Management: Zustand or Redux Toolkit
│   ├── Forms: React Hook Form + Zod validation
│   └── Rich Text: TipTap or Quill
│
├── Backend (Main Process): Node.js + TypeScript
│   ├── Database: better-sqlite3
│   ├── XML Generation: fast-xml-parser
│   └── Schema Validation: libxmljs2 or xsd-validator
│
└── Build/Tools
    ├── Bundler: Vite or Webpack
    ├── Testing: Vitest, Playwright
    └── Packaging: electron-builder
```

### 4.2 Project Structure

```
faers-app/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts
│   │   ├── database/
│   │   │   ├── connection.ts
│   │   │   ├── migrations/
│   │   │   └── repositories/
│   │   │       ├── case.repository.ts
│   │   │       ├── reaction.repository.ts
│   │   │       └── drug.repository.ts
│   │   ├── services/
│   │   │   ├── case.service.ts
│   │   │   ├── validation.service.ts
│   │   │   └── xml-generator.service.ts
│   │   └── ipc/                 # IPC handlers
│   │       └── case.handlers.ts
│   │
│   ├── renderer/                # Electron renderer (React)
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── DatePicker.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   └── RepeatingGroup.tsx
│   │   │   ├── case-list/
│   │   │   │   └── CaseList.tsx
│   │   │   └── case-form/
│   │   │       ├── CaseForm.tsx
│   │   │       ├── ReportSection.tsx
│   │   │       ├── ReporterSection.tsx
│   │   │       ├── SenderSection.tsx
│   │   │       ├── PatientSection.tsx
│   │   │       ├── ReactionSection.tsx
│   │   │       ├── DrugSection.tsx
│   │   │       └── NarrativeSection.tsx
│   │   ├── hooks/
│   │   │   ├── useCase.ts
│   │   │   └── useValidation.ts
│   │   ├── stores/
│   │   │   └── caseStore.ts
│   │   └── types/
│   │       └── case.types.ts
│   │
│   ├── shared/                  # Shared between main/renderer
│   │   ├── constants/
│   │   │   ├── dropdowns.ts
│   │   │   └── validation-rules.ts
│   │   ├── types/
│   │   │   └── e2b.types.ts
│   │   └── utils/
│   │       └── date.utils.ts
│   │
│   └── e2b/                     # E2B XML generation
│       ├── schema/
│       │   └── ich-icsr-v2.xsd
│       ├── templates/
│       │   └── message.template.ts
│       └── generator.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── resources/                   # Static assets
│   ├── icons/
│   └── data/
│       ├── countries.json
│       └── meddra-sample.json
│
├── package.json
├── tsconfig.json
├── electron-builder.yml
└── README.md
```

### 4.3 Key Implementation Notes

#### Database Access Pattern
```typescript
// repositories/case.repository.ts
import Database from 'better-sqlite3';

export class CaseRepository {
  private db: Database.Database;
  
  constructor(db: Database.Database) {
    this.db = db;
  }
  
  findAll(options: { status?: string; limit?: number; offset?: number }) {
    const { status, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT * FROM cases 
      WHERE deleted_at IS NULL
    `;
    const params: any[] = [];
    
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    return this.db.prepare(query).all(...params);
  }
  
  findById(id: string) {
    return this.db.prepare(`
      SELECT * FROM cases WHERE id = ? AND deleted_at IS NULL
    `).get(id);
  }
  
  create(caseData: CreateCaseDTO) {
    const id = this.generateCaseId();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO cases (id, status, created_at, updated_at, ...)
      VALUES (?, 'Draft', ?, ?, ...)
    `).run(id, now, now, ...);
    
    return this.findById(id);
  }
  
  update(id: string, caseData: UpdateCaseDTO) {
    const now = new Date().toISOString();
    
    this.db.prepare(`
      UPDATE cases SET 
        updated_at = ?,
        ... = ?
      WHERE id = ? AND deleted_at IS NULL
    `).run(now, ..., id);
    
    return this.findById(id);
  }
  
  private generateCaseId(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CASE-${date}-${random}`;
  }
}
```

#### XML Generation Pattern
```typescript
// e2b/generator.ts
import { create } from 'xmlbuilder2';
import type { Case, Reaction, Drug } from '../shared/types/case.types';

export class E2BXmlGenerator {
  generateICSR(caseData: Case): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('ichicsr', {
        lang: 'en',
        xmlns: 'urn:hl7-org:v3'
      });
    
    // Message Header
    this.addMessageHeader(root, caseData);
    
    // Safety Report
    const report = root
      .ele('controlActProcess', { classCode: 'CACT', moodCode: 'EVN' })
      .ele('subject', { typeCode: 'SUBJ' })
      .ele('investigationEvent', { classCode: 'INVSTG', moodCode: 'EVN' });
    
    this.addReportIdentification(report, caseData);
    this.addPrimarySource(report, caseData);
    this.addSender(report, caseData);
    this.addPatient(report, caseData);
    this.addReactions(report, caseData.reactions);
    this.addDrugs(report, caseData.drugs);
    this.addNarrative(report, caseData);
    
    return root.end({ prettyPrint: true });
  }
  
  private addMessageHeader(root: any, caseData: Case) {
    root.ele('id', { 
      root: this.generateUUID(), 
      extension: caseData.safetyReportId 
    });
    root.ele('creationTime', { value: this.formatDateTime(new Date()) });
    // ... more header elements
  }
  
  // ... additional methods
}
```

#### Validation Pattern
```typescript
// services/validation.service.ts
import { z } from 'zod';
import type { Case } from '../shared/types/case.types';

// Zod schemas for validation
const reactionSchema = z.object({
  reactionTerm: z.string().min(1, 'Reaction term is required'),
  seriousness: z.object({
    death: z.boolean(),
    lifeThreatening: z.boolean(),
    hospitalization: z.boolean(),
    disability: z.boolean(),
    congenital: z.boolean(),
    other: z.boolean(),
  }).refine(
    (s) => Object.values(s).some(v => v === true),
    'At least one seriousness criteria must be selected'
  ),
});

const caseSchema = z.object({
  reportType: z.number().min(1).max(4),
  receiptDate: z.string().min(1, 'Receipt date is required'),
  patientSex: z.number().min(0).max(2),
  reactions: z.array(reactionSchema).min(1, 'At least one reaction is required'),
  drugs: z.array(z.object({
    characterization: z.number().min(1).max(3),
    productName: z.string().min(1, 'Drug name is required'),
  })).min(1, 'At least one drug is required'),
  narrative: z.string().min(1, 'Case narrative is required'),
});

export class ValidationService {
  validateCase(caseData: Case): ValidationResult {
    const result = caseSchema.safeParse(caseData);
    
    if (result.success) {
      return { valid: true, errors: [] };
    }
    
    return {
      valid: false,
      errors: result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        severity: 'error',
      })),
    };
  }
  
  validateForExport(caseData: Case): ValidationResult {
    // Additional E2B-specific validations
    const baseValidation = this.validateCase(caseData);
    const e2bErrors = this.validateE2BRequirements(caseData);
    
    return {
      valid: baseValidation.valid && e2bErrors.length === 0,
      errors: [...baseValidation.errors, ...e2bErrors],
    };
  }
}
```

---

## 5. Testing Requirements

### 5.1 Unit Tests

```typescript
// tests/unit/case.service.test.ts
describe('CaseService', () => {
  describe('create', () => {
    it('should generate unique case ID', () => {});
    it('should set status to Draft', () => {});
    it('should set created_at timestamp', () => {});
  });
  
  describe('update', () => {
    it('should update modified fields only', () => {});
    it('should update updated_at timestamp', () => {});
    it('should throw if case not found', () => {});
  });
});

// tests/unit/xml-generator.test.ts
describe('E2BXmlGenerator', () => {
  describe('generateICSR', () => {
    it('should generate valid XML structure', () => {});
    it('should include all required elements', () => {});
    it('should format dates correctly', () => {});
    it('should handle special characters', () => {});
  });
});

// tests/unit/validation.service.test.ts
describe('ValidationService', () => {
  describe('validateCase', () => {
    it('should pass with valid complete case', () => {});
    it('should fail without required fields', () => {});
    it('should validate date formats', () => {});
    it('should validate cross-field rules', () => {});
  });
});
```

### 5.2 Integration Tests

```typescript
// tests/integration/case-workflow.test.ts
describe('Case Workflow', () => {
  it('should create, save, and retrieve case', async () => {});
  it('should update case and preserve history', async () => {});
  it('should soft delete case', async () => {});
  it('should duplicate case with new ID', async () => {});
  it('should generate valid XML for complete case', async () => {});
});
```

### 5.3 E2E Tests

```typescript
// tests/e2e/case-entry.test.ts
describe('Case Entry Flow', () => {
  it('should create new case from menu', async () => {});
  it('should navigate between form sections', async () => {});
  it('should add and remove reactions', async () => {});
  it('should add and remove drugs', async () => {});
  it('should save case and show confirmation', async () => {});
  it('should validate and show errors', async () => {});
  it('should export XML file', async () => {});
});
```

---

## 6. Acceptance Criteria Summary

### 6.1 Must Have (MVP)
- [ ] Create new ICSR case with unique ID
- [ ] Enter all E2B(R3) required data fields
- [ ] Save case to local database
- [ ] Open and edit existing cases
- [ ] Delete draft cases (soft delete)
- [ ] Validate case against E2B(R3) requirements
- [ ] Generate E2B(R3) compliant XML
- [ ] Export XML to file system
- [ ] Navigate between form sections
- [ ] Add/remove repeating items (reactions, drugs)

### 6.2 Should Have
- [ ] Duplicate existing case
- [ ] Search and filter case list
- [ ] Auto-save functionality
- [ ] Keyboard shortcuts
- [ ] Case status tracking (Draft, Ready)
- [ ] Basic MedDRA term entry (manual, no coding)

### 6.3 Nice to Have
- [ ] Rich text editor for narrative
- [ ] Import country codes list
- [ ] Database backup/restore
- [ ] Dark mode support
- [ ] Custom sender defaults

---

## 7. Delivery Milestones

| Milestone | Duration | Deliverables |
|-----------|----------|--------------|
| M1: Foundation | 3 weeks | Project setup, database, basic UI shell |
| M2: Data Entry | 4 weeks | All form sections, repeating groups |
| M3: Validation | 2 weeks | Field and cross-field validation |
| M4: XML Generation | 2 weeks | E2B(R3) XML generator, schema validation |
| M5: Polish | 2 weeks | UX refinements, testing, bug fixes |
| M6: Release | 1 week | Packaging, documentation, deployment |

---

## 8. References

- [ICH E2B(R3) Implementation Guide](https://www.ich.org/page/electronic-submission-individual-case-safety-reports-icsrs)
- [FDA E2B(R3) Regional Implementation Guide](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/fda-regional-implementation-guide-e2br3-electronic-transmission-individual-case-safety-reports-drug)
- [E2B(R3) XML Schema (XSD)](https://www.ich.org/page/e2br3-electronic-transmission-individual-case-safety-reports-icsrs-implementation-guide)
- [MedDRA Terminology](https://www.meddra.org/)

---

## Next Phase

After completing Phase 1, proceed to **Phase 2: ESG Integration & Submission** which adds:
- FDA Electronic Submission Gateway connectivity
- Automated submission to FDA
- Acknowledgment (ACK/NACK) processing
- Submission history and tracking
