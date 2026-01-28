# Phase 5: Enhanced Data Management & Medical Terminology

## Requirements Specification for Claude Code

**Version:** 1.0  
**Phase:** 5 of 12  
**Estimated Duration:** 2-3 months  
**Prerequisites:** Phase 1, Phase 2, Phase 3, and Phase 4 completed

---

## 1. Phase Overview

### 1.1 Objective

Integrate medical coding dictionaries (MedDRA for adverse events, WHO Drug Dictionary for medications), implement intelligent auto-coding with fuzzy matching, add advanced search capabilities, duplicate detection, bulk import functionality, case templates, and a configurable business rule validation engine. This phase transforms the application from basic data entry to intelligent data management.

### 1.2 Success Criteria

- [ ] MedDRA dictionary imported with full 5-level hierarchy
- [ ] WHO Drug Dictionary imported with ATC classification
- [ ] Auto-coding suggests terms as user types (< 200ms response)
- [ ] MedDRA browser allows hierarchical navigation
- [ ] Drug coding links trade names to ingredients
- [ ] Full-text search across all case fields (< 1 second)
- [ ] Advanced search builder with boolean logic
- [ ] Duplicate detection identifies similar cases with similarity scores
- [ ] Bulk import processes CSV/Excel files with mapping
- [ ] Case templates can be created and reused
- [ ] Business rule engine validates with configurable rules

### 1.3 Out of Scope for Phase 5

- Premarketing/IND reports (Phase 6)
- Cosmetics reporting (Phase 7)
- Signal detection analytics (Phase 8)
- External PV database integration (Phase 9)

### 1.4 Dependencies

- **Phase 1-4 Complete**: Core case management, submission, workflow, PSR
- **MedDRA License**: Subscription required from MSSO (free for non-profit)
- **WHO Drug License**: Subscription required from UMC

---

## 2. Background Information

### 2.1 MedDRA (Medical Dictionary for Regulatory Activities)

MedDRA is the international medical terminology standard used for adverse event coding in pharmacovigilance. It is mandated by FDA, EMA, and other regulatory authorities.

#### 2.1.1 MedDRA Hierarchy (5 Levels)

```
┌─────────────────────────────────────────────────────────────┐
│ SOC (System Organ Class) - 27 classes                       │
│ Example: "Nervous system disorders"                         │
├─────────────────────────────────────────────────────────────┤
│ HLGT (High Level Group Term) - ~337 terms                   │
│ Example: "Headaches"                                        │
├─────────────────────────────────────────────────────────────┤
│ HLT (High Level Term) - ~1,700 terms                        │
│ Example: "Headaches NEC"                                    │
├─────────────────────────────────────────────────────────────┤
│ PT (Preferred Term) - ~24,000 terms                         │
│ Example: "Headache" (code: 10019211)                        │
├─────────────────────────────────────────────────────────────┤
│ LLT (Lowest Level Term) - ~85,000 terms                     │
│ Example: "Head pain", "Cephalalgia", "Headache" (synonyms)  │
└─────────────────────────────────────────────────────────────┘
```

#### 2.1.2 MedDRA Key Concepts

| Concept | Description |
|---------|-------------|
| **Multi-axiality** | A PT can belong to multiple SOCs (primary + secondary) |
| **Primary SOC** | The main classification path for a term |
| **Secondary SOC** | Additional classification paths |
| **Current/Non-current** | LLTs can be flagged as non-current (obsolete but retained) |
| **MedDRA Code** | 8-digit numeric identifier for each term |
| **Version** | Released March (major) and September (minor) each year |

#### 2.1.3 MedDRA in E2B(R3)

```xml
<!-- B.2.i.1: Reaction/Event MedDRA Code (PT) -->
<value xsi:type="CE" 
       code="10019211" 
       codeSystem="2.16.840.1.113883.6.163" 
       codeSystemVersion="27.0"
       displayName="Headache"/>

<!-- B.2.i.0: Reaction/Event as Reported (LLT verbatim) -->
<value xsi:type="ST">severe head pain</value>
```

### 2.2 WHO Drug Dictionary (WHODrug Global)

WHODrug is the international reference for medication coding, maintained by the Uppsala Monitoring Centre (UMC).

#### 2.2.1 WHODrug Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Drug Record Number (6 digits)                               │
│ Unique identifier for active ingredient(s)                  │
├─────────────────────────────────────────────────────────────┤
│ Sequence 1 (2 digits)                                       │
│ Distinguishes different ingredient combinations             │
├─────────────────────────────────────────────────────────────┤
│ Sequence 2 (3 digits)                                       │
│ Distinguishes trade names for same ingredient               │
├─────────────────────────────────────────────────────────────┤
│ Full Drug Code: XXXXXX-XX-XXX (11 characters)              │
│ Example: 001234-01-001                                      │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2.2 WHODrug Data Elements

| Element | Description | Example |
|---------|-------------|---------|
| **Drug Name** | Trade/brand name | "Tylenol" |
| **Active Ingredient** | Generic substance | "Paracetamol" |
| **ATC Code** | Anatomical Therapeutic Chemical | "N02BE01" |
| **Pharmaceutical Form** | Dosage form | "Tablet" |
| **Strength** | Concentration | "500 mg" |
| **Country** | Market authorization country | "US" |
| **MAH** | Marketing Authorization Holder | "Johnson & Johnson" |

#### 2.2.3 ATC Classification (5 Levels)

```
Level 1: Anatomical main group (1 letter)
    N = Nervous System

Level 2: Therapeutic subgroup (2 digits)
    N02 = Analgesics

Level 3: Pharmacological subgroup (1 letter)
    N02B = Other analgesics and antipyretics

Level 4: Chemical subgroup (1 letter)
    N02BE = Anilides

Level 5: Chemical substance (2 digits)
    N02BE01 = Paracetamol
```

### 2.3 Duplicate Detection Principles

Duplicate ICSRs are a significant problem in pharmacovigilance:
- Same case reported by patient and healthcare provider
- Same case from literature and spontaneous report
- Same case reported to multiple regulatory authorities

#### 2.3.1 Duplicate Detection Criteria

| Criterion | Weight | Match Type |
|-----------|--------|------------|
| Patient ID (exact) | High | Exact |
| Patient initials | Medium | Exact |
| Date of birth | Medium | Exact |
| Age + Sex | Low | Exact |
| Event date | Medium | Fuzzy (±7 days) |
| Event terms | Medium | Fuzzy (MedDRA PT) |
| Product name | High | Fuzzy |
| Reporter name | Low | Fuzzy |
| Country | Low | Exact |

---

## 3. Functional Requirements

### 3.1 MedDRA Dictionary Management

#### REQ-MEDDRA-001: Dictionary Import
```
As an administrator
I want to import MedDRA dictionary files
So that the system can code adverse events

MedDRA Distribution Files:
- llt.asc: Lowest Level Terms
- pt.asc: Preferred Terms
- hlt.asc: High Level Terms
- hlgt.asc: High Level Group Terms
- soc.asc: System Organ Classes
- hlt_pt.asc: HLT to PT relationships
- hlgt_hlt.asc: HLGT to HLT relationships
- soc_hlgt.asc: SOC to HLGT relationships
- mdhier.asc: Complete hierarchy

Acceptance Criteria:
- Import wizard accepts MedDRA ASCII distribution
- Parse all .asc files and populate database
- Validate file integrity before import
- Support incremental updates (new version)
- Track import date and version
- Import completes within 10 minutes
- Support MedDRA versions 23.0+
```

#### REQ-MEDDRA-002: Version Management
```
As an administrator
I want to manage multiple MedDRA versions
So that historical coding is preserved

Acceptance Criteria:
- Store multiple versions simultaneously
- Set active version for new coding
- Display version used when viewing coded terms
- Migrate terms to new version with mapping
- Flag deprecated/non-current terms
- Version selector in admin settings
```

#### REQ-MEDDRA-003: Hierarchy Browser
```
As a user
I want to browse the MedDRA hierarchy
So that I can find the appropriate term to code

Browser Features:
- Tree view: SOC → HLGT → HLT → PT → LLT
- Expand/collapse nodes
- Search within browser
- Show term details (code, currency, primary SOC)
- Select term and apply to case
- Show multi-axial paths (all SOCs for a PT)

Acceptance Criteria:
- Browse starts from SOC level
- Expandable tree navigation
- Search filters tree in real-time
- Double-click selects term
- Show primary and secondary SOC paths
- Performance: expand node < 100ms
```

#### REQ-MEDDRA-004: Auto-Coding (Reactions)
```
As a user entering a reaction description
I want the system to suggest MedDRA terms
So that I can quickly and accurately code events

Auto-Coding Behavior:
- Trigger after 3+ characters typed
- Search LLT names (current only by default)
- Fuzzy match for typos (Levenshtein distance ≤ 2)
- Display: LLT name → PT name → Primary SOC
- Show MedDRA code
- Rank by relevance (exact match first)
- Maximum 10 suggestions

Acceptance Criteria:
- Suggestions appear within 200ms of typing
- Exact matches appear first
- Fuzzy matches handle common typos
- Selecting LLT auto-populates PT
- Option to browse hierarchy if no match
- Option to enter uncoded (with warning)
```

#### REQ-MEDDRA-005: Multi-Level Coding Storage
```
As the system
I need to store complete MedDRA coding
So that E2B XML can be generated correctly

Stored Fields per Reaction:
- Verbatim text (as reported)
- LLT code and name
- PT code and name
- HLT code and name
- HLGT code and name
- Primary SOC code and name
- Secondary SOC codes (if applicable)
- MedDRA version used

Acceptance Criteria:
- All levels populated when LLT selected
- PT mandatory for E2B submission
- LLT optional but recommended
- Version tracked per coding
- Re-coding preserves history
```

### 3.2 WHO Drug Dictionary Management

#### REQ-WHODRUG-001: Dictionary Import
```
As an administrator
I want to import WHO Drug Dictionary
So that the system can code medications

WHODrug Global Files:
- Drug names (trade names)
- Ingredients (active substances)
- ATC codes
- Pharmaceutical forms
- Manufacturers
- Country availability

Acceptance Criteria:
- Import wizard accepts WHODrug distribution
- Parse all data files
- Build searchable index
- Track version and import date
- Support incremental updates
- Import completes within 15 minutes
```

#### REQ-WHODRUG-002: Drug Auto-Coding
```
As a user entering a drug name
I want the system to suggest coded drugs
So that I can accurately identify the product

Auto-Coding Behavior:
- Trigger after 3+ characters
- Search trade names and ingredients
- Show: Trade Name → Ingredient → ATC → Manufacturer
- Filter by country (optional)
- Fuzzy matching for typos
- Maximum 10 suggestions

Acceptance Criteria:
- Suggestions appear within 200ms
- Search both trade names and ingredients
- Results show complete drug info
- Country filter available
- Selecting drug populates all fields
- Option to enter uncoded drug
```

#### REQ-WHODRUG-003: ATC Browser
```
As a user
I want to browse the ATC hierarchy
So that I can find drugs by therapeutic class

Browser Features:
- Tree view: Level 1 → 2 → 3 → 4 → 5
- Show drugs at Level 5
- Expand/collapse nodes
- Search within browser
- Select drug and apply to case

Acceptance Criteria:
- Browse starts from anatomical group
- Expandable tree navigation
- Search filters tree
- Show all drugs at chemical level
- Select populates case fields
```

#### REQ-WHODRUG-004: Drug Information Display
```
As a user
I want to view complete drug information
So that I can verify the correct product

Display Fields:
- Trade name
- Active ingredient(s)
- ATC code with full path
- Pharmaceutical form
- Strength
- Route of administration
- Manufacturer
- Country of authorization

Acceptance Criteria:
- Drug info card on selection
- All fields displayed
- Combination products show all ingredients
- ATC hierarchy displayed
- Link to browse similar drugs
```

### 3.3 Advanced Search & Filtering

#### REQ-SEARCH-001: Global Full-Text Search
```
As a user
I want to search across all case data
So that I can quickly find relevant cases

Searchable Fields:
- Case ID
- Patient information (name, ID, demographics)
- Narrative text
- Product names
- Reaction terms (verbatim and coded)
- Reporter information
- Comments and notes

Search Features:
- Single search box
- Boolean operators: AND, OR, NOT
- Phrase search: "exact phrase"
- Wildcard: head* matches headache, headaches
- Field-specific: product:aspirin

Acceptance Criteria:
- Search returns results < 1 second
- Results ranked by relevance
- Matched terms highlighted
- Pagination for large result sets
- Export search results
```

#### REQ-SEARCH-002: Advanced Search Builder
```
As a user
I want to build complex search queries
So that I can find cases matching multiple criteria

Search Builder Features:
- Add multiple conditions
- Select field, operator, value
- Boolean logic (AND/OR between conditions)
- Nested condition groups
- Date range pickers
- Numeric comparisons (>, <, =, between)
- Dropdown for coded values (MedDRA, products)

Operators by Field Type:
- Text: contains, equals, starts with, regex
- Date: equals, before, after, between
- Number: equals, greater, less, between
- Coded: equals (from dropdown)
- Boolean: is true, is false

Acceptance Criteria:
- Visual query builder interface
- Add/remove conditions dynamically
- Preview result count before executing
- Save search for later use
- Share saved search with team
```

#### REQ-SEARCH-003: Saved Searches
```
As a user
I want to save frequently used searches
So that I can quickly run them again

Acceptance Criteria:
- Save current search with name/description
- Personal saved searches
- Shared team searches (with permission)
- Quick access from sidebar
- Edit saved search
- Delete saved search
- Run saved search with one click
- Schedule saved search (future phase)
```

#### REQ-SEARCH-004: Search Results Management
```
As a user
I want to work with search results efficiently
So that I can take action on found cases

Result Features:
- Configurable columns
- Sort by any column
- Select multiple results
- Bulk actions on selection:
  - Export to Excel/CSV
  - Assign to user
  - Change status
  - Add to batch
- Quick view case details
- Open case in new tab

Acceptance Criteria:
- Results display within 1 second
- Select all / select none
- Bulk actions apply to selection
- Export includes all fields
- Quick view shows key info
```

### 3.4 Duplicate Detection

#### REQ-DUP-001: Automatic Duplicate Check
```
As a user creating a new case
I want the system to check for duplicates
So that I don't create redundant records

Duplicate Check Triggers:
- On case save (draft or submit)
- On patient info entry (real-time)
- On demand (manual check button)
- During bulk import

Matching Criteria (weighted):
- Patient identifier: High (exact)
- Patient initials + DOB: High (exact)
- Age + Sex + Event date: Medium (fuzzy)
- Product name: Medium (fuzzy)
- Event terms (PT): Medium (fuzzy)
- Reporter country: Low (exact)

Acceptance Criteria:
- Check runs < 2 seconds
- Similarity score calculated (0-100%)
- Threshold configurable (default 70%)
- Top 5 matches displayed
- User can view potential duplicate
- User must acknowledge before proceeding
```

#### REQ-DUP-002: Duplicate Alert Interface
```
As a user
I want to see duplicate details
So that I can decide how to proceed

Alert Display:
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Potential Duplicate Detected                             │
├─────────────────────────────────────────────────────────────┤
│ Similarity: 87%                                             │
│                                                             │
│ Current Case          Potential Match (CASE-2026-0045)     │
│ ─────────────         ─────────────────────────────────    │
│ Patient: J.S.         Patient: J.S.                        │
│ DOB: 1985-03-15       DOB: 1985-03-15                      │
│ Product: DrugX        Product: DrugX 100mg                 │
│ Event: Headache       Event: Head pain                     │
│ Event Date: Jan 20    Event Date: Jan 18 (2 days diff)    │
│ Reporter: Dr. Smith   Reporter: Dr. Smith                  │
│                                                             │
│ Matching Criteria:                                          │
│ ✓ Patient initials    ✓ Date of birth                      │
│ ✓ Product (fuzzy)     ✓ Event date (±7 days)              │
│ ✓ Event term (PT)     ✓ Reporter                          │
│                                                             │
│ [View Full Case]  [Not a Duplicate]  [Mark as Duplicate]   │
│                   [Link as Related]  [Merge Cases]         │
└─────────────────────────────────────────────────────────────┘

Acceptance Criteria:
- Side-by-side comparison
- Matching criteria highlighted
- Similarity score explained
- Multiple action options
- Audit trail of decision
```

#### REQ-DUP-003: Duplicate Resolution
```
As a user
I want to resolve duplicate cases
So that data integrity is maintained

Resolution Options:
1. Not a Duplicate: Dismiss alert, record decision
2. Mark as Duplicate: Flag current case, link to original
3. Link as Related: Same patient, different events
4. Merge Cases: Combine information into single case

Merge Rules:
- Select "master" case (survives)
- Select fields to keep from each case
- Merged case tracks source cases
- Original cases marked as merged
- Audit trail of merge

Acceptance Criteria:
- All resolution options available
- Merge wizard for field selection
- Preview merged result before confirming
- Cannot merge submitted cases (create follow-up instead)
- Audit trail recorded
- Notification to case owners
```

#### REQ-DUP-004: Duplicate Registry
```
As a user
I want to view all duplicate decisions
So that I can review and audit

Registry Features:
- List all duplicate pairs/groups
- Show resolution action
- Filter by status, date, resolver
- Re-evaluate decisions
- Export registry

Acceptance Criteria:
- Searchable duplicate list
- Filter by resolution type
- Show decision audit trail
- Link to both cases
- Re-open dismissed duplicates
```

#### REQ-DUP-005: Batch Duplicate Scan
```
As an administrator
I want to scan existing cases for duplicates
So that historical duplicates can be identified

Batch Scan Features:
- Run on all cases or filtered subset
- Background processing
- Progress indicator
- Results queue for review
- Prioritize by similarity score

Acceptance Criteria:
- Background job execution
- Email notification on completion
- Results sorted by similarity
- Bulk resolution options
- Schedule recurring scan (optional)
```

### 3.5 Case Templates

#### REQ-TEMPLATE-001: Template Creation
```
As a user
I want to create case templates
So that common scenarios can be entered quickly

Template Contents:
- Pre-filled field values
- Default selections (dropdowns, checkboxes)
- Locked fields (cannot be changed)
- Required field overrides
- Workflow assignment

Template Sources:
- Create from scratch
- Create from existing case
- Clone and modify existing template

Acceptance Criteria:
- Template editor with all case fields
- Set defaults for any field
- Lock specific fields
- Mark fields as required
- Preview template
- Save with name and description
```

#### REQ-TEMPLATE-002: Template Library
```
As a user
I want to browse available templates
So that I can find the right one for my case

Library Features:
- List all accessible templates
- Filter by category, owner, department
- Search templates
- Preview template details
- Usage statistics

Template Categories:
- Vaccine reactions
- Medication errors
- Device malfunctions
- Overdose cases
- Special populations (pediatric, pregnant)
- Product-specific templates

Acceptance Criteria:
- Browse templates with thumbnails
- Filter and search
- Preview before use
- Show usage count
- Sort by popularity/recent
```

#### REQ-TEMPLATE-003: Template Application
```
As a user
I want to create a case from a template
So that data entry is faster

Application Behavior:
- Select template from library
- New case created with template data
- Locked fields shown as read-only
- User completes remaining fields
- Template reference tracked on case

Acceptance Criteria:
- One-click case creation from template
- Template data pre-populated
- Clear indication of template source
- Locked fields not editable
- All validation rules apply
```

#### REQ-TEMPLATE-004: Template Governance
```
As an administrator
I want to control template access
So that only approved templates are used

Governance Features:
- Template ownership
- Department-specific templates
- Global templates (all users)
- Template approval workflow
- Version control
- Deprecate templates

Acceptance Criteria:
- Owner can edit/delete own templates
- Admin can promote to global
- Approval required for global templates
- Version history maintained
- Deprecated templates hidden from library
```

### 3.6 Bulk Import

#### REQ-IMPORT-001: File Upload
```
As a user
I want to upload CSV or Excel files
So that I can import multiple cases at once

Supported Formats:
- CSV (comma, semicolon, tab delimited)
- Excel (.xlsx, .xls)
- Maximum file size: 50MB
- Maximum rows: 10,000

Acceptance Criteria:
- Drag-and-drop upload
- File format validation
- Preview first 10 rows
- Detect delimiter automatically
- Handle UTF-8 encoding
- Show row/column count
```

#### REQ-IMPORT-002: Column Mapping
```
As a user
I want to map file columns to case fields
So that data is imported correctly

Mapping Interface:
┌─────────────────────────────────────────────────────────────┐
│ Column Mapping                                              │
├─────────────────────────────────────────────────────────────┤
│ File Column          Case Field              Sample Data    │
│ ─────────────        ──────────              ───────────    │
│ Patient_ID      →    [Patient Identifier ▼]  PT-001        │
│ DOB             →    [Date of Birth ▼]       1985-03-15    │
│ Gender          →    [Sex ▼]                 Male          │
│ Drug_Name       →    [Product Name ▼]        Aspirin       │
│ Adverse_Event   →    [Reaction (verbatim) ▼] Headache      │
│ Event_Date      →    [Event Onset Date ▼]    2026-01-15    │
│ Serious         →    [Is Serious ▼]          Yes           │
│ Column_X        →    [-- Do not import -- ▼] ...           │
│                                                             │
│ [Save Mapping]  [Load Saved Mapping]                       │
└─────────────────────────────────────────────────────────────┘

Acceptance Criteria:
- Auto-detect matching columns
- Manual mapping for all fields
- Skip columns (do not import)
- Save mapping for reuse
- Load previously saved mapping
- Show sample data while mapping
```

#### REQ-IMPORT-003: Data Transformation
```
As a user
I want to transform imported data
So that it matches expected formats

Transformations:
- Date format conversion
- Value mapping (e.g., "M" → "Male")
- Default values for empty cells
- Concatenation (combine columns)
- Splitting (one column to many)
- MedDRA lookup (text to code)
- WHO Drug lookup (text to code)

Acceptance Criteria:
- Define transformations per column
- Preview transformation results
- Auto-detect date formats
- Value mapping table
- MedDRA/WHODrug auto-coding option
```

#### REQ-IMPORT-004: Import Validation
```
As a user
I want to validate data before importing
So that errors are caught early

Validation Steps:
1. Format validation (dates, numbers)
2. Required field check
3. Value range check
4. Duplicate detection (within file and database)
5. MedDRA/WHODrug coding validation
6. Business rule validation

Validation Report:
- Row-by-row status
- Error details with row/column reference
- Warning vs. Error distinction
- Summary counts

Acceptance Criteria:
- Validate before import execution
- Clear error messages
- Link to specific row/column
- Option to download error report
- Import only valid rows option
- Fix and re-validate option
```

#### REQ-IMPORT-005: Import Execution
```
As a user
I want to execute the import
So that cases are created in the system

Import Options:
- Import all valid rows
- Skip rows with errors
- Stop on first error
- Create as draft status
- Assign to specific user/queue

Acceptance Criteria:
- Progress indicator during import
- Background processing for large files
- Email notification on completion
- Import summary report
- Created case IDs listed
- Rollback option (within time limit)
```

#### REQ-IMPORT-006: Import History
```
As a user
I want to view import history
So that I can track and audit imports

History Features:
- List all imports
- Show date, user, file name, row counts
- Download original file
- View created cases
- Re-run import (with same mapping)

Acceptance Criteria:
- Searchable import history
- Filter by date, user, status
- Link to imported cases
- Download original file
- Audit trail
```

### 3.7 Business Rule Validation Engine

#### REQ-VALID-001: Rule Definition
```
As an administrator
I want to define validation rules
So that data quality is enforced

Rule Components:
- Condition: When to apply rule
- Validation: What to check
- Severity: Error, Warning, Info
- Message: User-facing explanation
- Active/Inactive status

Rule Types:
- Required field (conditional)
- Field format (regex)
- Value range (min/max)
- Cross-field validation
- Date logic
- Custom expression

Acceptance Criteria:
- Rule builder interface
- Support all rule types
- Test rule before saving
- Activate/deactivate rules
- Rule versioning
```

#### REQ-VALID-002: Pre-Built Rules
```
As the system
I need pre-built validation rules
So that common errors are caught

Standard Rules:
1. Age consistency: Age matches DOB and event date
2. Date sequence: Start date before end date
3. Death requires death date
4. Serious requires at least one criterion
5. Event onset before/during treatment
6. Reporter contact required for follow-up
7. MedDRA code required for submission
8. Patient age ≤ 150 years
9. Event date not in future
10. Dose value with unit

Acceptance Criteria:
- All standard rules pre-configured
- Rules can be enabled/disabled
- Rules can be customized
- Cannot delete standard rules (only disable)
```

#### REQ-VALID-003: Custom Rules
```
As an administrator
I want to create custom validation rules
So that organization-specific requirements are met

Custom Rule Builder:
- Visual condition builder
- JavaScript expression option
- Reference other fields
- Access coded values (MedDRA, products)
- Test with sample data

Example Custom Rules:
- If product is "DrugX", require liver function tests
- If reporter is healthcare professional, require license number
- If outcome is death, require autopsy indicator

Acceptance Criteria:
- Visual builder for simple rules
- Code editor for complex rules
- Syntax validation
- Test against existing cases
- Version control
```

#### REQ-VALID-004: Validation Execution
```
As a user
I want to see validation results
So that I can fix errors before submission

Validation Display:
┌─────────────────────────────────────────────────────────────┐
│ Validation Results                                          │
├─────────────────────────────────────────────────────────────┤
│ ❌ Errors (2) - Must fix before submission                  │
│   • Patient date of birth is required                       │
│   • Event onset date cannot be after report date            │
│                                                             │
│ ⚠️ Warnings (3) - Review recommended                        │
│   • Patient age (95) is unusually high - please verify      │
│   • No MedDRA code assigned to reaction                     │
│   • Reporter phone number missing                           │
│                                                             │
│ ℹ️ Info (1)                                                  │
│   • Consider adding medical history for context             │
│                                                             │
│ [Fix Errors]  [Acknowledge Warnings]  [Submit Anyway]      │
└─────────────────────────────────────────────────────────────┘

Acceptance Criteria:
- Validate on save, on demand, before submit
- Group by severity
- Click error to jump to field
- Acknowledge warnings to proceed
- Block submission with errors
- Record acknowledged warnings
```

#### REQ-VALID-005: Validation Reports
```
As a manager
I want to view validation statistics
So that I can identify data quality issues

Report Features:
- Most common errors by rule
- Error rate over time
- Errors by user/department
- Cases with unresolved warnings
- Validation rule effectiveness

Acceptance Criteria:
- Dashboard widget for validation stats
- Detailed drill-down reports
- Export to Excel
- Trend visualization
- Filter by date range, user, rule
```

---

## 4. User Interface Requirements

### 4.1 MedDRA Coding Interface

#### REQ-UI-MEDDRA-001: Auto-Complete Input
```
Reaction coding with auto-complete:

┌─────────────────────────────────────────────────────────────┐
│ Reaction/Event                                              │
├─────────────────────────────────────────────────────────────┤
│ As reported: [severe head pain____________]                 │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Suggestions:                                            │ │
│ │ ──────────────────────────────────────────────────────  │ │
│ │ ● Head pain (LLT: 10019231)                            │ │
│ │   → Headache (PT: 10019211)                            │ │
│ │   → Nervous system disorders (SOC)                     │ │
│ │                                                         │ │
│ │ ○ Headache (LLT: 10019211)                             │ │
│ │   → Headache (PT: 10019211)                            │ │
│ │   → Nervous system disorders (SOC)                     │ │
│ │                                                         │ │
│ │ ○ Severe headache (LLT: 10040294)                      │ │
│ │   → Headache (PT: 10019211)                            │ │
│ │   → Nervous system disorders (SOC)                     │ │
│ │                                                         │ │
│ │ [Browse MedDRA] [Enter Uncoded]                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Coded Term: [Not yet coded]                                │
└─────────────────────────────────────────────────────────────┘
```

#### REQ-UI-MEDDRA-002: Hierarchy Browser
```
MedDRA browser modal:

┌─────────────────────────────────────────────────────────────┐
│ Browse MedDRA Dictionary                           [X Close]│
├─────────────────────────────────────────────────────────────┤
│ Search: [headache_________________] 🔍                      │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ▼ Nervous system disorders (SOC: 10029205)             │ │
│ │   ▼ Headaches (HLGT: 10019231)                         │ │
│ │     ▼ Headaches NEC (HLT: 10019233)                    │ │
│ │       ● Headache (PT: 10019211) ← Primary              │ │
│ │         • Head pain (LLT: 10019231) [Current]          │ │
│ │         • Headache (LLT: 10019211) [Current]           │ │
│ │         • Cephalalgia (LLT: 10008164) [Current]        │ │
│ │         • Cephalgia (LLT: 10049471) [Non-current]      │ │
│ │       ○ Headache aggravated (PT: 10019212)             │ │
│ │       ○ Tension headache (PT: 10043269)                │ │
│ │     ▶ Migraine headaches (HLT: 10027599)               │ │
│ │   ▶ Neurological signs and symptoms (HLGT: 10060860)   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Selected: Head pain (LLT) → Headache (PT)                  │
│                                                             │
│                              [Cancel]  [Select Term]       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Drug Coding Interface

#### REQ-UI-DRUG-001: Drug Search
```
Drug coding with auto-complete:

┌─────────────────────────────────────────────────────────────┐
│ Suspect Drug                                                │
├─────────────────────────────────────────────────────────────┤
│ Drug Name: [tylenol_____________________]                   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Matches:                                                │ │
│ │ ──────────────────────────────────────────────────────  │ │
│ │ ● Tylenol (US)                                         │ │
│ │   Paracetamol 500mg Tablet                             │ │
│ │   ATC: N02BE01 - Paracetamol                           │ │
│ │   MAH: Johnson & Johnson                               │ │
│ │                                                         │ │
│ │ ○ Tylenol Extra Strength (US)                          │ │
│ │   Paracetamol 500mg Caplet                             │ │
│ │   ATC: N02BE01 - Paracetamol                           │ │
│ │                                                         │ │
│ │ ○ Tylenol PM (US)                                      │ │
│ │   Paracetamol 500mg + Diphenhydramine 25mg             │ │
│ │   ATC: N02BE51 - Paracetamol combinations              │ │
│ │                                                         │ │
│ │ [Browse ATC] [Enter Uncoded]                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Active Ingredient: [Auto-filled on selection]              │
│ ATC Code: [Auto-filled on selection]                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Search Interface

#### REQ-UI-SEARCH-001: Global Search Bar
```
Global search in header:

┌─────────────────────────────────────────────────────────────┐
│ 🔍 [Search cases, products, events...___________] [Search] │
│                                                             │
│ Quick filters: [All ▼] [My Cases] [Open] [This Week]       │
│                                                             │
│ Recent searches:                                            │
│ • headache AND aspirin                                      │
│ • product:"DrugX" serious:yes                              │
│ • reporter:smith                                            │
└─────────────────────────────────────────────────────────────┘
```

#### REQ-UI-SEARCH-002: Advanced Search Builder
```
Advanced search interface:

┌─────────────────────────────────────────────────────────────┐
│ Advanced Search                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ Condition Group (AND) ─────────────────────────────────┐ │
│ │ [Product Name ▼] [contains ▼] [aspirin________] [−]    │ │
│ │ [Reaction PT ▼]  [equals ▼]   [Headache ▼]      [−]    │ │
│ │ [+ Add Condition]                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Add AND Group]  [+ Add OR Group]                        │
│                                                             │
│ ┌─ Condition Group (OR) ──────────────────────────────────┐ │
│ │ [Seriousness ▼]  [equals ▼]   [Serious ▼]       [−]    │ │
│ │ [Outcome ▼]      [equals ▼]   [Death ▼]         [−]    │ │
│ │ [+ Add Condition]                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Preview: 47 cases match                                     │
│                                                             │
│ [Clear All]  [Save Search]           [Cancel]  [Search]    │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Import Interface

#### REQ-UI-IMPORT-001: Import Wizard
```
Step-by-step import wizard:

Step 1: Upload          Step 2: Map           Step 3: Validate      Step 4: Import
  [●]─────────────────────[○]─────────────────────[○]─────────────────────[○]

┌─────────────────────────────────────────────────────────────┐
│ Step 1: Upload File                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │     📁 Drag and drop your file here                │   │
│  │                                                     │   │
│  │     or [Browse Files]                              │   │
│  │                                                     │   │
│  │     Supported: CSV, XLSX, XLS (max 50MB)           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Recent imports:                                            │
│  • cases_jan_2026.xlsx (Jan 20, 2026)                      │
│  • partner_data.csv (Jan 15, 2026)                         │
│                                                             │
│                                            [Next →]         │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Data Model Updates

### 5.1 MedDRA Tables

```sql
-- MedDRA Version tracking
CREATE TABLE meddra_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(10) NOT NULL UNIQUE,
    release_date DATE,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    llt_count INTEGER,
    pt_count INTEGER,
    imported_by INTEGER REFERENCES users(id)
);

-- System Organ Class (SOC)
CREATE TABLE meddra_soc (
    soc_code INTEGER NOT NULL,
    soc_name VARCHAR(255) NOT NULL,
    soc_abbrev VARCHAR(10),
    version_id INTEGER REFERENCES meddra_versions(id),
    PRIMARY KEY (soc_code, version_id)
);

-- High Level Group Term (HLGT)
CREATE TABLE meddra_hlgt (
    hlgt_code INTEGER NOT NULL,
    hlgt_name VARCHAR(255) NOT NULL,
    version_id INTEGER REFERENCES meddra_versions(id),
    PRIMARY KEY (hlgt_code, version_id)
);

-- HLGT to SOC relationship
CREATE TABLE meddra_hlgt_soc (
    hlgt_code INTEGER NOT NULL,
    soc_code INTEGER NOT NULL,
    version_id INTEGER REFERENCES meddra_versions(id),
    PRIMARY KEY (hlgt_code, soc_code, version_id)
);

-- High Level Term (HLT)
CREATE TABLE meddra_hlt (
    hlt_code INTEGER NOT NULL,
    hlt_name VARCHAR(255) NOT NULL,
    version_id INTEGER REFERENCES meddra_versions(id),
    PRIMARY KEY (hlt_code, version_id)
);

-- HLT to HLGT relationship
CREATE TABLE meddra_hlt_hlgt (
    hlt_code INTEGER NOT NULL,
    hlgt_code INTEGER NOT NULL,
    version_id INTEGER REFERENCES meddra_versions(id),
    PRIMARY KEY (hlt_code, hlgt_code, version_id)
);

-- Preferred Term (PT)
CREATE TABLE meddra_pt (
    pt_code INTEGER NOT NULL,
    pt_name VARCHAR(255) NOT NULL,
    primary_soc_code INTEGER,
    version_id INTEGER REFERENCES meddra_versions(id),
    PRIMARY KEY (pt_code, version_id)
);

-- PT to HLT relationship
CREATE TABLE meddra_pt_hlt (
    pt_code INTEGER NOT NULL,
    hlt_code INTEGER NOT NULL,
    version_id INTEGER REFERENCES meddra_versions(id),
    PRIMARY KEY (pt_code, hlt_code, version_id)
);

-- Lowest Level Term (LLT)
CREATE TABLE meddra_llt (
    llt_code INTEGER NOT NULL,
    llt_name VARCHAR(255) NOT NULL,
    pt_code INTEGER NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    version_id INTEGER REFERENCES meddra_versions(id),
    PRIMARY KEY (llt_code, version_id)
);

-- Full hierarchy view (materialized for performance)
CREATE MATERIALIZED VIEW meddra_hierarchy AS
SELECT 
    llt.llt_code, llt.llt_name, llt.is_current,
    pt.pt_code, pt.pt_name,
    hlt.hlt_code, hlt.hlt_name,
    hlgt.hlgt_code, hlgt.hlgt_name,
    soc.soc_code, soc.soc_name,
    pt.primary_soc_code = soc.soc_code AS is_primary_path,
    llt.version_id
FROM meddra_llt llt
JOIN meddra_pt pt ON llt.pt_code = pt.pt_code AND llt.version_id = pt.version_id
JOIN meddra_pt_hlt pth ON pt.pt_code = pth.pt_code AND pt.version_id = pth.version_id
JOIN meddra_hlt hlt ON pth.hlt_code = hlt.hlt_code AND pth.version_id = hlt.version_id
JOIN meddra_hlt_hlgt hh ON hlt.hlt_code = hh.hlt_code AND hlt.version_id = hh.version_id
JOIN meddra_hlgt hlgt ON hh.hlgt_code = hlgt.hlgt_code AND hh.version_id = hlgt.version_id
JOIN meddra_hlgt_soc hs ON hlgt.hlgt_code = hs.hlgt_code AND hlgt.version_id = hs.version_id
JOIN meddra_soc soc ON hs.soc_code = soc.soc_code AND hs.version_id = soc.version_id;

-- Indexes for search performance
CREATE INDEX idx_meddra_llt_name ON meddra_llt USING gin(to_tsvector('english', llt_name));
CREATE INDEX idx_meddra_pt_name ON meddra_pt USING gin(to_tsvector('english', pt_name));
CREATE INDEX idx_meddra_llt_pt ON meddra_llt(pt_code, version_id);
```

### 5.2 WHO Drug Tables

```sql
-- WHODrug Version tracking
CREATE TABLE whodrug_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    release_date DATE,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    drug_count INTEGER,
    imported_by INTEGER REFERENCES users(id)
);

-- ATC Classification
CREATE TABLE whodrug_atc (
    atc_code VARCHAR(10) NOT NULL,
    atc_level INTEGER NOT NULL, -- 1-5
    atc_name VARCHAR(255) NOT NULL,
    parent_atc_code VARCHAR(10),
    version_id INTEGER REFERENCES whodrug_versions(id),
    PRIMARY KEY (atc_code, version_id)
);

-- Active Ingredients
CREATE TABLE whodrug_ingredients (
    ingredient_id INTEGER NOT NULL,
    ingredient_name VARCHAR(255) NOT NULL,
    cas_number VARCHAR(20),
    version_id INTEGER REFERENCES whodrug_versions(id),
    PRIMARY KEY (ingredient_id, version_id)
);

-- Drug Products (Trade Names)
CREATE TABLE whodrug_products (
    drug_code VARCHAR(15) NOT NULL, -- Full 11-char code
    drug_record_number VARCHAR(6) NOT NULL,
    seq1 VARCHAR(2) NOT NULL,
    seq2 VARCHAR(3) NOT NULL,
    drug_name VARCHAR(255) NOT NULL,
    country_code VARCHAR(3),
    pharmaceutical_form VARCHAR(100),
    strength VARCHAR(100),
    manufacturer VARCHAR(255),
    version_id INTEGER REFERENCES whodrug_versions(id),
    PRIMARY KEY (drug_code, version_id)
);

-- Drug to Ingredient relationship
CREATE TABLE whodrug_product_ingredients (
    drug_code VARCHAR(15) NOT NULL,
    ingredient_id INTEGER NOT NULL,
    version_id INTEGER REFERENCES whodrug_versions(id),
    PRIMARY KEY (drug_code, ingredient_id, version_id)
);

-- Drug to ATC relationship
CREATE TABLE whodrug_product_atc (
    drug_code VARCHAR(15) NOT NULL,
    atc_code VARCHAR(10) NOT NULL,
    is_official BOOLEAN DEFAULT TRUE, -- Official vs UMC-assigned
    version_id INTEGER REFERENCES whodrug_versions(id),
    PRIMARY KEY (drug_code, atc_code, version_id)
);

-- Indexes for search
CREATE INDEX idx_whodrug_name ON whodrug_products USING gin(to_tsvector('english', drug_name));
CREATE INDEX idx_whodrug_ingredient ON whodrug_ingredients USING gin(to_tsvector('english', ingredient_name));
```

### 5.3 Case Coding Storage

```sql
-- Reaction coding (per reaction in case)
ALTER TABLE case_reactions ADD COLUMN verbatim_text TEXT;
ALTER TABLE case_reactions ADD COLUMN llt_code INTEGER;
ALTER TABLE case_reactions ADD COLUMN llt_name VARCHAR(255);
ALTER TABLE case_reactions ADD COLUMN pt_code INTEGER;
ALTER TABLE case_reactions ADD COLUMN pt_name VARCHAR(255);
ALTER TABLE case_reactions ADD COLUMN hlt_code INTEGER;
ALTER TABLE case_reactions ADD COLUMN hlt_name VARCHAR(255);
ALTER TABLE case_reactions ADD COLUMN hlgt_code INTEGER;
ALTER TABLE case_reactions ADD COLUMN hlgt_name VARCHAR(255);
ALTER TABLE case_reactions ADD COLUMN soc_code INTEGER;
ALTER TABLE case_reactions ADD COLUMN soc_name VARCHAR(255);
ALTER TABLE case_reactions ADD COLUMN meddra_version VARCHAR(10);
ALTER TABLE case_reactions ADD COLUMN coded_by INTEGER REFERENCES users(id);
ALTER TABLE case_reactions ADD COLUMN coded_at TIMESTAMP;

-- Drug coding (per drug in case)
ALTER TABLE case_drugs ADD COLUMN verbatim_name TEXT;
ALTER TABLE case_drugs ADD COLUMN whodrug_code VARCHAR(15);
ALTER TABLE case_drugs ADD COLUMN coded_drug_name VARCHAR(255);
ALTER TABLE case_drugs ADD COLUMN ingredient_names TEXT[];
ALTER TABLE case_drugs ADD COLUMN atc_code VARCHAR(10);
ALTER TABLE case_drugs ADD COLUMN atc_name VARCHAR(255);
ALTER TABLE case_drugs ADD COLUMN whodrug_version VARCHAR(20);
ALTER TABLE case_drugs ADD COLUMN coded_by INTEGER REFERENCES users(id);
ALTER TABLE case_drugs ADD COLUMN coded_at TIMESTAMP;
```

### 5.4 Search and Templates

```sql
-- Full-text search index
CREATE INDEX idx_cases_fulltext ON cases 
    USING gin(to_tsvector('english', 
        coalesce(data->>'narrative', '') || ' ' ||
        coalesce(data->>'patient_name', '') || ' ' ||
        coalesce(data->>'reporter_name', '')
    ));

-- Saved searches
CREATE TABLE saved_searches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    query_definition JSONB NOT NULL,
    created_by INTEGER REFERENCES users(id),
    is_shared BOOLEAN DEFAULT FALSE,
    department_id INTEGER REFERENCES departments(id),
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Case templates
CREATE TABLE case_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    template_data JSONB NOT NULL,
    locked_fields TEXT[], -- Array of field paths that cannot be changed
    required_fields TEXT[], -- Additional required fields
    created_by INTEGER REFERENCES users(id),
    department_id INTEGER REFERENCES departments(id),
    is_global BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template usage tracking
CREATE TABLE template_usage (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES case_templates(id),
    case_id TEXT REFERENCES cases(case_id),
    used_by INTEGER REFERENCES users(id),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.5 Duplicate Detection

```sql
-- Duplicate detection results
CREATE TABLE duplicate_candidates (
    id SERIAL PRIMARY KEY,
    case_id_1 TEXT REFERENCES cases(case_id),
    case_id_2 TEXT REFERENCES cases(case_id),
    similarity_score DECIMAL(5,2) NOT NULL,
    matching_criteria JSONB, -- Details of what matched
    status VARCHAR(20) DEFAULT 'pending',
        -- pending, dismissed, confirmed, merged
    resolution VARCHAR(50),
        -- not_duplicate, duplicate, related, merged
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(case_id_1, case_id_2)
);

-- Merged case tracking
CREATE TABLE merged_cases (
    id SERIAL PRIMARY KEY,
    master_case_id TEXT REFERENCES cases(case_id),
    merged_case_id TEXT REFERENCES cases(case_id),
    merged_by INTEGER REFERENCES users(id),
    merged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    field_sources JSONB -- Which fields came from which case
);
```

### 5.6 Validation Rules

```sql
-- Validation rules
CREATE TABLE validation_rules (
    id SERIAL PRIMARY KEY,
    rule_code VARCHAR(50) UNIQUE NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    description TEXT,
    rule_type VARCHAR(20) NOT NULL,
        -- required, format, range, cross_field, custom
    severity VARCHAR(10) NOT NULL DEFAULT 'error',
        -- error, warning, info
    condition_expression TEXT, -- When to apply the rule
    validation_expression TEXT NOT NULL, -- What to validate
    error_message TEXT NOT NULL,
    field_path TEXT, -- Which field(s) this rule applies to
    is_system BOOLEAN DEFAULT FALSE, -- Built-in vs custom
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Validation results (per case validation run)
CREATE TABLE validation_results (
    id SERIAL PRIMARY KEY,
    case_id TEXT REFERENCES cases(case_id),
    rule_id INTEGER REFERENCES validation_rules(id),
    severity VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    field_path TEXT,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Import jobs
CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    row_count INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
        -- pending, mapping, validating, importing, completed, failed
    column_mapping JSONB,
    transformation_rules JSONB,
    validation_summary JSONB,
    imported_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Import job cases (link imported cases to job)
CREATE TABLE import_job_cases (
    import_job_id INTEGER REFERENCES import_jobs(id),
    row_number INTEGER NOT NULL,
    case_id TEXT REFERENCES cases(case_id),
    status VARCHAR(20) NOT NULL, -- success, error, skipped
    errors JSONB,
    PRIMARY KEY (import_job_id, row_number)
);
```

---

## 6. API Endpoints

### 6.1 MedDRA API

```yaml
# MedDRA Dictionary Management
POST /api/v1/admin/meddra/import
  Description: Import MedDRA version
  Body: multipart/form-data with .asc files
  Response: Import job status

GET /api/v1/admin/meddra/versions
  Description: List all MedDRA versions
  Response: Version list with stats

PUT /api/v1/admin/meddra/versions/{id}/activate
  Description: Set active MedDRA version
  Response: Updated version

# MedDRA Search
GET /api/v1/meddra/search
  Description: Search MedDRA terms
  Query: q (search text), type (llt|pt|hlt|hlgt|soc), limit
  Response: Matching terms with hierarchy

GET /api/v1/meddra/autocomplete
  Description: Auto-complete for coding
  Query: q (search text), limit (default 10)
  Response: LLT suggestions with PT and SOC

GET /api/v1/meddra/hierarchy/{code}
  Description: Get full hierarchy for a term
  Query: level (llt|pt|hlt|hlgt|soc)
  Response: Complete hierarchy paths

GET /api/v1/meddra/browse
  Description: Browse hierarchy tree
  Query: parent_code, parent_level
  Response: Child terms
```

### 6.2 WHO Drug API

```yaml
# WHODrug Dictionary Management
POST /api/v1/admin/whodrug/import
  Description: Import WHODrug version
  Body: multipart/form-data with dictionary files
  Response: Import job status

GET /api/v1/admin/whodrug/versions
  Description: List all WHODrug versions
  Response: Version list with stats

# WHODrug Search
GET /api/v1/whodrug/search
  Description: Search drugs
  Query: q (search text), country, limit
  Response: Matching drugs with ingredients and ATC

GET /api/v1/whodrug/autocomplete
  Description: Auto-complete for coding
  Query: q (search text), country, limit (default 10)
  Response: Drug suggestions with details

GET /api/v1/whodrug/atc/browse
  Description: Browse ATC hierarchy
  Query: parent_code
  Response: Child ATC codes and drugs

GET /api/v1/whodrug/{code}
  Description: Get drug details
  Response: Complete drug information
```

### 6.3 Search API

```yaml
GET /api/v1/cases/search
  Description: Full-text search
  Query: q (search text), page, limit
  Response: Matching cases with highlights

POST /api/v1/cases/search/advanced
  Description: Advanced search with query builder
  Body: Query definition JSON
  Response: Matching cases

GET /api/v1/searches
  Description: List saved searches
  Query: shared (boolean)
  Response: Saved search list

POST /api/v1/searches
  Description: Save a search
  Body: name, description, query_definition
  Response: Created saved search

PUT /api/v1/searches/{id}
  Description: Update saved search
  Body: name, description, query_definition
  Response: Updated saved search

DELETE /api/v1/searches/{id}
  Description: Delete saved search
  Response: Success confirmation

POST /api/v1/searches/{id}/execute
  Description: Run a saved search
  Query: page, limit
  Response: Search results
```

### 6.4 Duplicate Detection API

```yaml
POST /api/v1/cases/{id}/check-duplicates
  Description: Check case for duplicates
  Response: List of potential duplicates with scores

GET /api/v1/duplicates
  Description: List all duplicate candidates
  Query: status, min_score, page, limit
  Response: Duplicate candidate list

PUT /api/v1/duplicates/{id}/resolve
  Description: Resolve duplicate candidate
  Body: resolution, notes
  Response: Updated duplicate record

POST /api/v1/duplicates/merge
  Description: Merge two cases
  Body: master_case_id, source_case_id, field_selections
  Response: Merged case

POST /api/v1/admin/duplicates/scan
  Description: Run batch duplicate scan
  Body: filter criteria (optional)
  Response: Scan job status
```

### 6.5 Template API

```yaml
GET /api/v1/templates
  Description: List available templates
  Query: category, global, page, limit
  Response: Template list

POST /api/v1/templates
  Description: Create template
  Body: name, description, category, template_data, locked_fields
  Response: Created template

GET /api/v1/templates/{id}
  Description: Get template details
  Response: Template with data

PUT /api/v1/templates/{id}
  Description: Update template
  Body: Template updates
  Response: Updated template

DELETE /api/v1/templates/{id}
  Description: Delete template
  Response: Success confirmation

POST /api/v1/templates/{id}/apply
  Description: Create case from template
  Response: New case with template data

PUT /api/v1/admin/templates/{id}/approve
  Description: Approve template for global use
  Response: Updated template
```

### 6.6 Import API

```yaml
POST /api/v1/imports/upload
  Description: Upload file for import
  Body: multipart/form-data with file
  Response: Import job with preview

PUT /api/v1/imports/{id}/mapping
  Description: Set column mapping
  Body: Column mapping definition
  Response: Updated import job

POST /api/v1/imports/{id}/validate
  Description: Validate import data
  Response: Validation results per row

POST /api/v1/imports/{id}/execute
  Description: Execute import
  Body: options (skip_errors, default_status)
  Response: Import results

GET /api/v1/imports
  Description: List import history
  Query: page, limit, status
  Response: Import job list

GET /api/v1/imports/{id}
  Description: Get import details
  Response: Import job with results

GET /api/v1/imports/{id}/errors
  Description: Download error report
  Response: CSV file with errors
```

### 6.7 Validation API

```yaml
GET /api/v1/admin/validation-rules
  Description: List all validation rules
  Query: type, severity, active
  Response: Rule list

POST /api/v1/admin/validation-rules
  Description: Create custom rule
  Body: Rule definition
  Response: Created rule

PUT /api/v1/admin/validation-rules/{id}
  Description: Update rule
  Body: Rule updates
  Response: Updated rule

POST /api/v1/admin/validation-rules/{id}/test
  Description: Test rule against sample data
  Body: Sample case data
  Response: Test results

POST /api/v1/cases/{id}/validate
  Description: Validate a case
  Response: Validation results

PUT /api/v1/cases/{id}/validation/{result_id}/acknowledge
  Description: Acknowledge a warning
  Response: Updated validation result
```

---

## 7. Testing Requirements

### 7.1 MedDRA Testing

| Test Case | Expected Result |
|-----------|-----------------|
| Import MedDRA v27.0 | All tables populated, counts match |
| Search "headache" | Returns headache-related LLTs and PTs |
| Fuzzy search "hedache" | Returns "headache" suggestions |
| Browse SOC > HLGT > HLT > PT > LLT | Tree expands correctly |
| Select LLT | PT, HLT, HLGT, SOC auto-populated |
| Multi-axial PT | Shows all SOC paths |
| Non-current LLT | Flagged, excluded from default search |

### 7.2 WHO Drug Testing

| Test Case | Expected Result |
|-----------|-----------------|
| Import WHODrug | All tables populated |
| Search "aspirin" | Returns aspirin products |
| Search by ingredient | Returns products with ingredient |
| Browse ATC | Tree navigation works |
| Select drug | All fields populated |
| Combination product | Shows all ingredients |

### 7.3 Search Testing

| Test Case | Expected Result |
|-----------|-----------------|
| Simple search | Results in < 1 second |
| Boolean AND | Returns cases with all terms |
| Boolean OR | Returns cases with any term |
| Phrase search | Exact phrase match |
| Advanced search with dates | Date range filtering works |
| Save and reload search | Query preserved correctly |
| Export results | Excel file generated |

### 7.4 Duplicate Detection Testing

| Test Case | Expected Result |
|-----------|-----------------|
| Same patient ID | 100% match |
| Similar names + same DOB | High score (>80%) |
| Same product + similar event date | Medium score (>60%) |
| Different patients | Low score (<50%) |
| Resolve as not duplicate | Dismissed, recorded |
| Merge cases | Single case with combined data |

### 7.5 Import Testing

| Test Case | Expected Result |
|-----------|-----------------|
| Upload CSV | Preview displayed |
| Map columns | Mapping saved |
| Validate with errors | Errors reported per row |
| Import valid rows | Cases created |
| MedDRA auto-coding | Terms suggested |
| Large file (1000 rows) | Completes within 5 minutes |

---

## 8. Performance Requirements

| Operation | Target | Maximum |
|-----------|--------|---------|
| MedDRA auto-complete | 100ms | 200ms |
| WHODrug auto-complete | 100ms | 200ms |
| Full-text search | 500ms | 1000ms |
| Advanced search | 1s | 3s |
| Duplicate check | 1s | 2s |
| Import 100 rows | 30s | 60s |
| MedDRA import | 5 min | 10 min |

---

## 9. Acceptance Criteria Summary

### 9.1 Must Have
- [ ] MedDRA dictionary import and search
- [ ] MedDRA auto-coding with fuzzy matching
- [ ] MedDRA hierarchy browser
- [ ] WHO Drug dictionary import and search
- [ ] WHO Drug auto-coding
- [ ] Full-text search across cases
- [ ] Basic duplicate detection
- [ ] CSV import with column mapping
- [ ] Case templates (create and use)

### 9.2 Should Have
- [ ] Advanced search builder
- [ ] Saved searches
- [ ] ATC hierarchy browser
- [ ] Duplicate resolution workflow
- [ ] Excel import support
- [ ] Template governance
- [ ] Business rule validation engine
- [ ] Batch duplicate scan

### 9.3 Nice to Have
- [ ] MedDRA version migration
- [ ] Duplicate merge wizard
- [ ] Custom validation rules
- [ ] Import transformation rules
- [ ] Search result export
- [ ] Validation reports/dashboard

---

## 10. Configuration Options

```yaml
# config/phase5.yaml

meddra:
  default_version: "27.0"
  search_limit: 10
  fuzzy_threshold: 2  # Levenshtein distance
  include_non_current: false
  cache_ttl_hours: 24

whodrug:
  default_version: "2024Q1"
  search_limit: 10
  default_country: "US"
  cache_ttl_hours: 24

search:
  max_results: 1000
  highlight_fragments: 3
  default_page_size: 25
  search_timeout_ms: 3000

duplicates:
  similarity_threshold: 70
  check_on_save: true
  check_on_submit: true
  max_candidates: 5
  date_tolerance_days: 7

import:
  max_file_size_mb: 50
  max_rows: 10000
  supported_formats: ["csv", "xlsx", "xls"]
  default_delimiter: ","
  batch_size: 100

templates:
  require_approval_for_global: true
  max_templates_per_user: 50

validation:
  run_on_save: true
  run_on_submit: true
  block_on_error: true
  allow_warning_acknowledgment: true
```

---

## 11. References

- [MedDRA Website](https://www.meddra.org/) - Official MedDRA documentation
- [MedDRA Introductory Guide](https://admin.meddra.org/sites/default/files/page/documents_insert/intguide_25_0_English.pdf)
- [WHODrug Global](https://who-umc.org/whodrug/whodrug-global/) - Uppsala Monitoring Centre
- [ATC Classification](https://www.who.int/tools/atc-ddd-toolkit/atc-classification) - WHO ATC documentation
- [ICH E2B(R3)](https://www.ich.org/page/e2br3-individual-case-safety-report-icsr-specification-and-related-files) - ICSR Specification
- [FDA E2B(R3) Business Rules](https://www.fda.gov/drugs/fdas-adverse-event-reporting-system-faers/fda-adverse-event-reporting-system-faers-electronic-submissions-e2br3-standards)
- Phase 4 Requirements: `04_Phase4_NonExpedited_PSR.md`

---

## Next Phase

After completing Phase 5, proceed to **Phase 6: Premarketing (IND) Reports** which adds:
- IND safety report support (21 CFR 312.32)
- Clinical trial case management
- Blinding management
- Expectedness against Investigator Brochure
- Form FDA 3500A generation
- IND annual report compilation
