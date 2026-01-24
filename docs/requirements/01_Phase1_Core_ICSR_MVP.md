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
- [ ] Application runs as a desktop application

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
- User can initiate case creation from the application
- System generates a unique case ID
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
- User can see a list of all saved cases
- List displays key information: Case ID, Status, Patient Initials, Product Name, Created Date, Modified Date
- User can search and filter the case list
- User can open a case to view or edit it
```

#### REQ-CASE-003: Save Case
```
As a user
I want to save my case at any time
So that I don't lose my work

Acceptance Criteria:
- User can save at any time during editing
- Save works even with incomplete or invalid data
- System confirms successful save
- Last modified timestamp is updated
- Auto-save functionality (configurable interval, default 5 minutes)
- Warning if user tries to close with unsaved changes
```

#### REQ-CASE-004: Delete Case
```
As a user
I want to delete a case I no longer need
So that I can keep my case list organized

Acceptance Criteria:
- Delete is available for cases in Draft status only
- System prompts for confirmation before deletion
- Deleted cases are soft-deleted (recoverable)
- Deleted cases do not appear in normal case list
```

#### REQ-CASE-005: Duplicate Case
```
As a user
I want to duplicate an existing case
So that I can create similar cases quickly (e.g., follow-up reports)

Acceptance Criteria:
- User can duplicate any case
- Creates new case with new unique ID
- Copies all data from source case
- Sets Report Type appropriately for follow-up
- Links to original case as related case
```

### 2.2 Data Entry - E2B(R3) Sections

The application must capture all data elements defined in the ICH E2B(R3) standard. The following sections describe the data requirements organized by E2B section.

#### REQ-DATA-001: Report Information (E2B Section A.1)
```
As a user
I want to enter report identification information
So that the case can be properly identified

Data Elements:
- Safety Report ID (unique identifier)
- Report Type (spontaneous, study, other, not available)
- Report Classification (initial or follow-up)
- Initial Receipt Date (required)
- Most Recent Information Date (required)
- Additional Documents Available flag
- Expedited Report flag
- Worldwide Unique Case ID (optional)
- Other Case Identifiers (repeating: source + identifier)
- Nullification/Amendment indicator and reason
- Related Report links (repeating)

Acceptance Criteria:
- All fields can be entered and saved
- Date fields accept valid dates
- Dropdown fields show appropriate options
- Repeating groups can add/remove entries
```

#### REQ-DATA-002: Primary Source / Reporter Information (E2B Section A.2)
```
As a user
I want to enter information about who reported the adverse event
So that the source is properly documented

Data Elements:
- Reporter Title
- Reporter Given Name
- Reporter Family Name
- Reporter Qualification (required: physician, pharmacist, other HCP, lawyer, consumer)
- Reporter Organization
- Reporter Department
- Reporter Address, City, State, Postcode, Country
- Reporter Telephone
- Reporter Email
- Additional Reporters (repeating group with same fields)

Acceptance Criteria:
- Primary reporter information can be entered
- Additional reporters can be added/removed
- Qualification is required (dropdown selection)
- Email validation for email fields
- Country selection from standard list (ISO 3166)
```

#### REQ-DATA-003: Sender Information (E2B Section A.3)
```
As a user
I want to enter sender (submitting organization) information
So that FDA knows who is submitting

Data Elements:
- Sender Type (required: pharma company, regulatory authority, HCP, etc.)
- Sender Organization (required)
- Sender Department
- Sender Given Name (required)
- Sender Family Name (required)
- Sender Address, City, State, Postcode, Country
- Sender Telephone, Fax, Email

Acceptance Criteria:
- All required fields enforced
- Option to save as defaults for future cases
- Country selection from standard list
```

#### REQ-DATA-004: Patient Information (E2B Section B.1)
```
As a user
I want to enter patient demographic information
So that the affected individual is documented

Data Elements:
- Patient Initials
- Medical Record Numbers (GP, Specialist, Hospital, Investigation)
- Age Information (one of):
  - Birth Date (partial dates allowed: YYYY, YYYY-MM, or YYYY-MM-DD)
  - Age at Time of Onset + Age Unit (year, month, week, day, hour)
  - Age Group (neonate, infant, child, adolescent, adult, elderly)
- Body Weight (kg)
- Height (cm)
- Sex (required: male, female, unknown)
- Last Menstrual Period Date (if applicable)
- Medical History (repeating group):
  - Disease/Condition
  - MedDRA code (manual entry for Phase 1)
  - Start Date, End Date, Continuing flag
  - Comments
  - Family History flag
- Past Drug History (repeating group):
  - Drug Name
  - Start Date, End Date
  - Indication
  - Reaction (if known)

Acceptance Criteria:
- Sex is required
- Either Birth Date OR Age is required
- Partial dates supported for birth date
- Medical history and drug history support multiple entries
```

#### REQ-DATA-005: Patient Death Information (E2B Section B.1.9)
```
As a user
I want to record death information if the patient died
So that fatal outcomes are properly documented

Data Elements:
- Date of Death
- Reported Cause(s) of Death (repeating, MedDRA terms)
- Autopsy Performed flag
- Autopsy-Determined Cause(s) of Death (repeating, MedDRA terms)

Acceptance Criteria:
- Death section only shown/required if death is indicated
- Multiple causes of death can be entered
- MedDRA terms entered as text (auto-coding in Phase 5)
```

#### REQ-DATA-006: Reaction/Event Information (E2B Section B.2)
```
As a user
I want to enter the adverse reactions experienced
So that the safety events are documented

Data Elements (for each reaction):
- Reaction Assessment Source (reporter or sender)
- Reaction Term (required, MedDRA LLT - text entry for Phase 1)
- Reaction in Native Language (original reporter term)
- Reaction Start Date
- Reaction End Date
- Duration and Duration Unit
- Seriousness Criteria (checkboxes, at least one required):
  - Results in Death
  - Life-Threatening
  - Caused/Prolonged Hospitalization
  - Disabling/Incapacitating
  - Congenital Anomaly/Birth Defect
  - Other Medically Important Condition
- Outcome (recovered, recovering, not recovered, recovered with sequelae, fatal, unknown)
- Medical Confirmation by Healthcare Professional flag

Acceptance Criteria:
- At least one reaction is required per case
- Reaction term is required for each reaction
- At least one seriousness criterion must be selected
- Multiple reactions can be added/removed
- If "Results in Death" selected, outcome should be "Fatal"
```

#### REQ-DATA-007: Drug Information (E2B Section B.4)
```
As a user
I want to enter information about suspected and concomitant drugs
So that the medications involved are documented

Data Elements (for each drug):
- Drug Characterization (required: suspect, concomitant, interacting)
- Product Name (required)
- Medicinal Product Identifier (MPID, optional)
- Pharmaceutical Product Identifier (PhPID, optional)
- Active Substances (repeating):
  - Substance Name
  - Substance Code
  - Strength and Unit
- Dosage Information (repeating for complex regimens):
  - Dose amount (single value or range)
  - Dose Unit
  - Number of Units per Interval
  - Interval Unit
  - Dosage Text (free text description)
  - Pharmaceutical Form
  - Route of Administration
- Cumulative Dose and Unit
- Gestation Period at Exposure (if applicable)
- Indication for Use (MedDRA term)
- Drug Start Date and End Date
- Duration of Treatment
- Time to Onset of Reaction
- Action Taken with Drug (withdrawn, dose reduced, dose increased, unchanged, unknown, N/A)
- Dechallenge Result (reaction abated, did not abate, unknown, N/A)
- Rechallenge Result (reaction recurred, did not recur, unknown, N/A)
- Additional Drug Information (free text)

Acceptance Criteria:
- At least one suspect drug is required per case
- Drug characterization and product name are required
- Multiple drugs can be added/removed
- Multiple dosage regimens per drug supported
- Route of administration from standard list
```

#### REQ-DATA-008: Case Narrative (E2B Section B.5)
```
As a user
I want to enter a narrative summary of the case
So that the case is described in context

Data Elements:
- Case Narrative (required, free text, up to 20,000 characters)
- Reporter's Comments (optional)
- Sender's Comments (optional)
- Sender's Diagnosis (MedDRA term, optional)

Acceptance Criteria:
- Case narrative is required
- Rich text or plain text entry supported
- Character count displayed
```

### 2.3 User Interface

#### REQ-UI-001: Main Application Layout
```
As a user
I want an intuitive application layout
So that I can work efficiently

Acceptance Criteria:
- Main window with menu bar, toolbar, and content area
- Menu bar with standard menus (File, Edit, Case, Tools, Help)
- Toolbar with common actions (New, Open, Save, Validate, Export XML)
- Navigation panel showing form sections
- Main content area for case list or case form
- Status bar showing case ID, status, and save state
```

#### REQ-UI-002: Form Section Navigation
```
As a user
I want to navigate between form sections easily
So that I can efficiently complete the case

Acceptance Criteria:
- Navigation panel lists all E2B sections
- Visual indicator shows sections with data entered
- Visual indicator shows sections with validation errors
- Click navigation to jump to any section
- Keyboard shortcuts for section navigation
- Sections can be collapsed/expanded
```

#### REQ-UI-003: Repeating Groups Interface
```
As a user
I want to add multiple items in repeating sections
So that I can capture all relevant information

Acceptance Criteria:
- "Add" button to create new entries
- Each entry displayed in a card or expandable panel
- "Remove" button with confirmation
- "Duplicate" option for similar entries
- Reorder capability (drag-drop or move buttons)
- Collapse/expand individual entries
- Summary shown when collapsed
```

#### REQ-UI-004: Data Entry Aids
```
As a user
I want helpful features when entering data
So that data entry is efficient and accurate

Acceptance Criteria:
- Date picker supporting partial dates (YYYY, YYYY-MM, YYYY-MM-DD)
- Dropdown fields with type-ahead search
- Required fields clearly marked
- Tooltip/help text on field hover or focus
- Field-level validation messages
- Undo/redo support
- Tab navigation through fields
```

#### REQ-UI-005: Case List View
```
As a user
I want to view and manage my cases in a list
So that I can find and organize my work

Acceptance Criteria:
- Table view with sortable columns
- Columns: Case ID, Status, Patient Initials, Product Name, Created Date, Modified Date
- Search/filter functionality
- Pagination for large numbers of cases
- Double-click or button to open case
- Right-click context menu for common actions
- Multi-select for bulk operations (future)
```

### 2.4 Validation

#### REQ-VAL-001: Field-Level Validation
```
As the system
I need to validate individual fields
So that data quality is maintained

Acceptance Criteria:
- Required fields cannot be empty when submitting
- Date fields accept only valid dates
- Email fields validate email format
- Numeric fields validate ranges where applicable
- Text fields enforce maximum lengths
- Dropdown fields accept only valid options
- Validation runs on field blur or form submission
- Inline error messages displayed near field
```

#### REQ-VAL-002: Cross-Field Validation
```
As the system
I need to validate related fields together
So that data is logically consistent

Validation Rules:
- If Death seriousness = Yes, Death Date should be provided
- If Death seriousness = Yes, at least one reaction must have "Death" seriousness
- End Date must be >= Start Date (for all date ranges)
- Either Birth Date OR Age must be provided
- At least one Reaction is required
- At least one Suspect Drug is required
- Case Narrative is required

Acceptance Criteria:
- Cross-field validation runs on save or explicit validate action
- Clear error messages indicate which fields need attention
- Navigation to problematic fields from error list
```

#### REQ-VAL-003: E2B(R3) Compliance Validation
```
As a user
I want to validate my case against E2B(R3) requirements
So that I know it will be accepted by FDA

Acceptance Criteria:
- "Validate" action checks all E2B(R3) mandatory fields
- Validation checks E2B(R3) conditional requirements
- Results categorized as:
  - Errors: Must fix (blocks XML generation)
  - Warnings: Should review (allows XML generation)
  - Info: Suggestions for improvement
- Validation results panel with clickable navigation to issues
- Option to validate anytime, automatically validates before XML export
```

#### REQ-VAL-004: Required Fields Summary
```
The following E2B(R3) fields are always required:
- Report Type (A.1.2)
- Initial/Follow-up indicator (A.1.4)
- Initial Receipt Date (A.1.5.1)
- Most Recent Information Date (A.1.5.2)
- Reporter Qualification (A.2.1.4)
- Sender Type (A.3.1.1)
- Sender Organization (A.3.1.2)
- Sender Given Name (A.3.1.4)
- Sender Family Name (A.3.1.5)
- Patient Sex (B.1.5)
- At least one Reaction with term and seriousness (B.2)
- At least one Drug with characterization and name (B.4)
- Case Narrative (B.5.1)
```

### 2.5 XML Generation

#### REQ-XML-001: Generate E2B(R3) XML
```
As a user
I want to generate E2B(R3) XML from my case
So that I can submit it to FDA

Acceptance Criteria:
- "Export XML" or "Generate XML" action available
- Validation runs before generation; blocks if critical errors
- Warnings shown but allow generation to proceed
- XML conforms to ICH E2B(R3) schema
- XML includes FDA regional specifications
- User selects save location and filename
- Default filename includes Case ID and timestamp
```

#### REQ-XML-002: XML Validation
```
As a user
I want to verify my XML is valid
So that FDA will accept it

Acceptance Criteria:
- Generated XML validates against E2B(R3) XSD schema
- Validation errors displayed with details
- Option to view raw XML
- XML formatted for readability (pretty print)
```

### 2.6 Data Persistence

#### REQ-DB-001: Local Data Storage
```
As the system
I need to store case data locally
So that data persists between sessions

Acceptance Criteria:
- All case data saved to local database
- Database stored in appropriate user data directory per OS
- Database supports all E2B(R3) data elements
- Relationships maintained (case → reactions, case → drugs, etc.)
- Soft delete for recoverable deletion
- Data integrity maintained (referential integrity)
```

#### REQ-DB-002: Data Backup
```
As a user
I want to backup my data
So that I don't lose my work

Acceptance Criteria:
- Manual backup option (File menu)
- Backup creates copy of database with timestamp
- Configurable backup location
- Auto-backup on application close (optional)
- Restore from backup option
- Backup retention policy (keep last N backups)
```

---

## 3. Non-Functional Requirements

### 3.1 Performance

| Metric | Requirement |
|--------|-------------|
| Application startup | < 5 seconds |
| Case load time | < 2 seconds |
| Case save time | < 1 second |
| XML generation | < 3 seconds |
| Search/filter response | < 2 seconds |

### 3.2 Usability

- Consistent UI patterns throughout application
- All actions accessible via keyboard shortcuts
- Support for screen readers (accessibility)
- Clear error messages with guidance
- Intuitive navigation

### 3.3 Compatibility

- Windows 10 and later
- macOS 11 (Big Sur) and later
- Ubuntu 20.04 LTS and later
- Minimum display resolution: 1280x720

### 3.4 Reliability

- Auto-save prevents data loss
- Graceful error handling (no crashes on bad input)
- Recovery of unsaved changes after unexpected shutdown
- Database integrity verification on startup

### 3.5 Security

- Local data can be encrypted at rest (optional user setting)
- No transmission of data to external servers in Phase 1
- Secure deletion of temporary files

---

## 4. Reference Information

### 4.1 E2B(R3) Standard

The application must support the ICH E2B(R3) standard for Individual Case Safety Reports. Key references:

- ICH E2B(R3) Implementation Guide
- FDA Regional Implementation Guide for E2B(R3)
- E2B(R3) XML Schema (XSD)

### 4.2 Code Lists and Terminologies

The application should support these standard code lists:

- ISO 3166-1: Country codes
- MedDRA: Medical terminology (manual entry in Phase 1, auto-coding in Phase 5)
- UCUM: Units of measure
- EDQM: Routes of administration, pharmaceutical forms

### 4.3 Date Formats

- Internal storage: ISO 8601 (YYYY-MM-DD)
- Partial dates: YYYY, YYYY-MM, or YYYY-MM-DD
- Display format: User-friendly, locale-appropriate

---

## 5. Testing Requirements

### 5.1 Test Scenarios

- Create new case with all required fields
- Create case with all optional fields populated
- Save incomplete case and resume editing
- Validation of required fields
- Validation of cross-field rules
- XML generation for valid case
- XML schema validation
- Search and filter case list
- Delete and recover case
- Duplicate case functionality
- Multiple reactions and drugs per case
- Partial date handling
- Character limits in text fields

### 5.2 Test Data

- Sample cases representing different scenarios:
  - Minimal case (required fields only)
  - Complete case (all fields populated)
  - Serious case with hospitalization
  - Fatal case with death information
  - Case with multiple reactions and drugs
  - Follow-up report linked to initial

---

## 6. Acceptance Criteria Summary

### 7.1 Must Have
- [ ] Create, edit, save, delete ICSR cases
- [ ] All E2B(R3) required data elements captured
- [ ] Repeating groups for reporters, reactions, drugs
- [ ] Field-level and cross-field validation
- [ ] E2B(R3) XML generation
- [ ] XML schema validation
- [ ] Local data persistence
- [ ] Case list with search/filter

### 7.2 Should Have
- [ ] Duplicate case functionality
- [ ] Auto-save
- [ ] Keyboard shortcuts
- [ ] Data backup/restore
- [ ] Partial date support
- [ ] Undo/redo

### 7.3 Nice to Have
- [ ] Dark mode
- [ ] Customizable UI layout
- [ ] Export case list to CSV
- [ ] Print case summary

---

## 7. References

- [ICH E2B(R3) Implementation Guide](https://www.ich.org/page/e2br3-electronic-transmission-individual-case-safety-reports-icsrs-implementation-guide)
- [FDA E2B(R3) Regional Implementation Guide](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/fda-regional-implementation-guide-e2br3-electronic-transmission-individual-case-safety-reports-drug)
- [MedDRA Terminology](https://www.meddra.org/)
- Application Overview: `00_FAERS_Application_Overview.md`

---

## Next Phase

After completing Phase 1, proceed to **Phase 2: SRP Submission** which adds:
- FDA Safety Reporting Portal export packages
- Submission status tracking
- Acknowledgment recording
- Submission history and dashboard
