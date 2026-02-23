# Screenshot Capture Guide for FAERS User Guide

**Version:** 1.1
**Date:** January 2026
**Purpose:** This guide provides instructions for capturing all screenshots referenced in the User Guide.

---

## Overview

The User Guide (`02_User_Guide.md`) contains placeholders for 31 screenshots. This document provides:
- Exact filename for each screenshot
- Description of what to capture
- Step-by-step setup instructions
- Sample data to use for consistency

## General Guidelines

### Screenshot Settings
- **Resolution:** 1920x1080 or higher
- **Format:** PNG (for clarity)
- **Tool:** Use OS built-in tools or a dedicated screenshot tool
  - Windows: Snipping Tool or Win+Shift+S
  - macOS: Cmd+Shift+4 or Screenshot app
- **Annotations:** Avoid adding annotations to raw screenshots; use callouts in documentation instead

### Preparation
1. Use a clean test database with sample data
2. Ensure consistent window size (1400x900 recommended for app window)
3. Use a user account with Administrator role to access all features
4. Disable any browser extensions that might affect appearance

### Directory Structure
Save all screenshots to: `docs/user/images/`

---

## Screenshot List

### Section 3: Logging In

#### 3.1 - login-screen.png
**File:** `images/login-screen.png`
**Figure:** 3.1 - Login Screen

**Setup:**
1. Launch the application (or log out if already logged in)
2. The login screen should appear

**Capture:**
- The login screen showing:
  - Application title/logo
  - Username input field
  - Password input field (empty or with placeholder)
  - "Remember username" checkbox
  - Sign In button
  - Clean background

---

### Section 4: Application Overview

#### 4.1 - main-window.png
**File:** `images/main-window.png`
**Figure:** 4.1 - Main Application Window

**Setup:**
1. Log in to the application
2. Navigate to the Case List or Dashboard
3. Ensure the window shows all main UI components

**Capture:**
- Full application window showing:
  - Toolbar at top with buttons (New, Open, Save, Validate, Export, Settings)
  - User menu in top-right corner
  - Navigation sidebar on left (Dashboard, Case List, form sections)
  - Main content area (Dashboard or Case List)
  - Status bar at bottom

---

### Section 5: Working with Cases

#### 5.1 - new-case-button.png
**File:** `images/new-case-button.png`
**Figure:** 5.1 - Creating a New Case from Toolbar

**Setup:**
1. Log in to the application
2. Navigate to Case List or Dashboard
3. Ensure the toolbar is visible

**Capture:**
- Toolbar section showing:
  - New Case button (highlighted or with pointer nearby)
  - Other toolbar buttons for context
  - Clean capture focused on the New button

---

#### 5.2 - case-list.png
**File:** `images/case-list.png`
**Figure:** 5.2 - Case List View

**Setup:**
1. Create 5-10 sample cases with various statuses
2. Navigate to Case List

**Capture:**
- Case List view showing:
  - Search box at top
  - Status filter/tabs
  - Table with columns: Case ID, Patient, Status, Receipt Date, etc.
  - Several rows of case data
  - Pagination or scroll indicator if many cases

---

### Section 8: Data Entry Guide - Case Form Sections

#### 8.1 - case-form-report.png
**File:** `images/case-form-report.png`
**Figure:** 8.1 - Report Information Section

**Setup:**
1. Open an existing case or create a new one
2. Navigate to the Report section

**Capture:**
- Report Information section showing:
  - Safety Report ID field (auto-generated)
  - Report Type dropdown
  - Initial/Follow-up selector
  - Receipt Date picker
  - Most Recent Info Date picker
  - Expedited Report checkbox
  - Additional Documents checkbox

---

#### 8.2 - case-form-reporter.png
**File:** `images/case-form-reporter.png`
**Figure:** 8.2 - Reporter (Primary Source) Section

**Setup:**
1. Open a case
2. Navigate to the Reporter section

**Capture:**
- Reporter section showing:
  - Qualification dropdown
  - Given Name and Family Name fields
  - Organization field
  - Country dropdown
  - Email and Phone fields
  - Add Reporter button (if multiple reporters supported)

---

#### 8.3 - case-form-sender.png
**File:** `images/case-form-sender.png`
**Figure:** 8.3 - Sender Information Section

**Setup:**
1. Open a case
2. Navigate to the Sender section

**Capture:**
- Sender section showing:
  - Sender Type dropdown
  - Organization field
  - Contact Name fields (Given/Family)
  - Address fields
  - Country dropdown
  - Email field

---

#### 8.4 - case-form-patient.png
**File:** `images/case-form-patient.png`
**Figure:** 8.4 - Patient Information Section

**Setup:**
1. Open a case
2. Navigate to the Patient section
3. Fill in some sample patient data

**Capture:**
- Patient section showing:
  - Patient Initials field
  - Sex selector
  - Age/Birth Date fields
  - Weight and Height fields
  - Medical History section with Add button
  - Death Information section (collapsed or expanded)

---

#### 8.5 - case-form-reactions.png
**File:** `images/case-form-reactions.png`
**Figure:** 8.5 - Reactions Section

**Setup:**
1. Open a case
2. Navigate to the Reactions section
3. Add 1-2 sample reactions

**Capture:**
- Reactions section showing:
  - Add Reaction button
  - Table/list of reactions with columns:
    - Reaction Term
    - MedDRA Code
    - Start/End Date
    - Outcome
    - Seriousness indicators
  - Edit/Delete action buttons

---

#### 8.6 - case-form-drugs.png
**File:** `images/case-form-drugs.png`
**Figure:** 8.6 - Drugs Section

**Setup:**
1. Open a case
2. Navigate to the Drugs section
3. Add 1-2 sample drugs (1 Suspect, 1 Concomitant)

**Capture:**
- Drugs section showing:
  - Add Drug button
  - Table/list of drugs with columns:
    - Product Name
    - Characterization (Suspect/Concomitant tag)
    - Indication
    - Dosage
    - Dates
  - Edit/Delete action buttons

---

#### 8.7 - case-form-narrative.png
**File:** `images/case-form-narrative.png`
**Figure:** 8.7 - Narrative Section

**Setup:**
1. Open a case
2. Navigate to the Narrative section
3. Enter some sample narrative text

**Capture:**
- Narrative section showing:
  - Case Narrative text area (with sample text)
  - Reporter's Comments field
  - Sender's Comments field
  - Sender's Diagnosis field
  - Character count (if shown)

---

### Section 21: MedDRA Coding

#### 21.1 - settings-dictionaries-tab.png
**File:** `images/settings-dictionaries-tab.png`
**Figure:** 21.1 - Settings Dialog - Dictionaries Tab

**Setup:**
1. Click Settings in the toolbar
2. Click on the Dictionaries tab

**Capture:**
- Settings dialog showing:
  - General and Dictionaries tabs
  - Dictionaries tab selected
  - MedDRA Dictionary Versions card with:
    - Version table (or empty state with Import button)
    - Import New Version button
    - Active version indicator
  - WHO Drug Dictionary Versions card below

---

#### 21.2 - meddra-import-wizard.png
**File:** `images/meddra-import-wizard.png`
**Figure:** 21.2 - MedDRA Dictionary Import Wizard

**Setup:**
1. Navigate to Settings > Dictionaries > MedDRA
2. Click "Import New Version"
3. Follow the wizard to step 2 or 3

**Capture:**
- Import wizard showing:
  - Steps indicator (Version Info → Select Files → Import)
  - Version number input field
  - Release date picker
  - File selection area or folder browser
  - Progress bar (if on import step)

---

#### 21.3 - meddra-autocomplete.png
**File:** `images/meddra-autocomplete.png`
**Figure:** 21.3 - MedDRA Auto-complete Suggestions

**Setup:**
1. Open a case and go to Reactions section
2. Click Add Reaction or edit an existing reaction
3. Type "headache" in the MedDRA Coded Term field

**Capture:**
- Autocomplete dropdown showing:
  - Search input with typed text
  - Multiple suggestion rows
  - Each row showing: LLT name → PT name → SOC
  - Highlighted/selected suggestion

---

#### 21.4 - meddra-browser.png
**File:** `images/meddra-browser.png`
**Figure:** 21.4 - MedDRA Hierarchy Browser

**Setup:**
1. Open a case and go to Reactions section
2. Click Add Reaction or edit an existing reaction
3. Click the "Browse" button next to the MedDRA field

**Capture:**
- MedDRA Browser modal showing:
  - Search box at top
  - Tree view with expandable hierarchy
  - SOC level expanded to show HLGT → HLT → PT → LLT
  - A term selected/highlighted
  - Apply/Cancel buttons

---

### Section 22: WHO Drug Coding

#### 22.1 - whodrug-import.png
**File:** `images/whodrug-import.png`
**Figure:** 22.1 - WHO Drug Dictionary Import

**Setup:**
1. Navigate to Settings > Dictionaries > WHO Drug
2. Click "Import New Version"

**Capture:**
- WHO Drug Version Manager showing:
  - List of imported versions (or empty state)
  - Import New Version button
  - Active version indicator

---

#### 22.2 - whodrug-autocomplete.png
**File:** `images/whodrug-autocomplete.png`
**Figure:** 22.2 - WHO Drug Auto-complete Suggestions

**Setup:**
1. Open a case and go to Drugs section
2. Click Add Drug or edit an existing drug
3. Type "aspirin" in the Product Name field

**Capture:**
- Autocomplete dropdown showing:
  - Search input with typed text
  - Multiple drug suggestions
  - Each row showing: Trade Name → Ingredient → ATC Code
  - Highlighted/selected suggestion

---

#### 22.3 - atc-browser.png
**File:** `images/atc-browser.png`
**Figure:** 22.3 - ATC Classification Browser

**Setup:**
1. Open WHO Drug browser if available
2. Navigate to ATC hierarchy view

**Capture:**
- ATC hierarchy showing:
  - All 5 levels of classification
  - Anatomical group → Therapeutic → Pharmacological → Chemical → Substance
  - Drugs listed under classifications

---

### Section 23: Advanced Search

#### 23.1 - advanced-search-builder.png
**File:** `images/advanced-search-builder.png`
**Figure:** 23.1 - Search Query Builder

**Setup:**
1. Navigate to Cases list
2. Click "Advanced Search"
3. Build a multi-criteria search

**Capture:**
- Query builder showing:
  - Multiple search criteria rows
  - Field selector dropdown
  - Operator dropdown (equals, contains, between, etc.)
  - Value input field
  - AND/OR logic selectors
  - Add/Remove row buttons
  - Save search button

**Sample Query:**
- Field: "Seriousness" = "Serious"
- AND Field: "Event Date" between "2024-01-01" and "2024-12-31"
- AND Field: "Workflow Status" = "Draft"

---

#### 23.2 - saved-searches.png
**File:** `images/saved-searches.png`
**Figure:** 23.2 - Saved Searches Panel

**Setup:**
1. Save a few searches from the Advanced Search builder
2. Navigate to the sidebar or saved searches panel

**Capture:**
- Saved searches panel showing:
  - List of saved search queries
  - Search names and descriptions
  - Quick-run buttons
  - Edit/Delete options

---

### Section 24: Duplicate Detection

#### 24.1 - duplicate-alert.png
**File:** `images/duplicate-alert.png`
**Figure:** 24.1 - Duplicate Detection Alert

**Setup:**
1. Create test cases with similar data (same patient name, dates)
2. Open a case that triggers duplicate detection

**Capture:**
- Duplicate alert showing:
  - Warning banner or modal
  - Similarity score/percentage
  - Side-by-side comparison preview
  - Matching criteria breakdown
  - Action buttons (Not a Duplicate, Mark as Duplicate, etc.)

---

#### 24.2 - merge-wizard.png
**File:** `images/merge-wizard.png`
**Figure:** 24.2 - Case Merge Wizard

**Setup:**
1. Identify a duplicate pair
2. Click "Merge Cases" option

**Capture:**
- Merge wizard showing:
  - Two cases displayed in parallel
  - Field-by-field selection (choose Case A or Case B value)
  - Merged preview
  - Confirm merge button

---

#### 24.3 - duplicate-registry.png
**File:** `images/duplicate-registry.png`
**Figure:** 24.3 - Duplicate Registry

**Setup:**
1. Process several duplicate decisions
2. Navigate to Admin > Duplicate Registry

**Capture:**
- Registry list showing:
  - All duplicate pairs ever identified
  - Resolution status (Merged, Dismissed, Pending)
  - Decision date and user
  - Filter controls
  - Re-open option for dismissed pairs

---

### Section 25: Case Templates

#### 25.1 - template-library.png
**File:** `images/template-library.png`
**Figure:** 25.1 - Template Library

**Setup:**
1. Create several templates in different categories
2. Navigate to New Case from Template

**Capture:**
- Template library showing:
  - Category tabs or filters (Vaccine, Medication Error, etc.)
  - Template cards/list with names and descriptions
  - Preview option
  - Use Template button
  - Search/filter functionality

---

#### 25.2 - template-form.png
**File:** `images/template-form.png`
**Figure:** 25.2 - Template Creation Form

**Setup:**
1. Navigate to Settings > Templates > New Template
2. Fill in some template configuration

**Capture:**
- Template creation form showing:
  - Template name field
  - Category selector
  - Description field
  - Default values section with form fields
  - Lock field checkbox per field
  - Required field override checkboxes
  - Save/Cancel buttons

---

### Section 26: Bulk Import

#### 26.1 - import-step1-upload.png
**File:** `images/import-step1-upload.png`
**Figure:** 26.1 - Import Wizard - File Upload

**Setup:**
1. Navigate to Admin > Import Cases
2. Start the import wizard
3. Upload a sample CSV file

**Capture:**
- Step 1 showing:
  - File drop zone
  - Browse button
  - File info (name, size, rows detected)
  - Data preview table (first 10 rows)
  - Delimiter/encoding auto-detection info
  - Next button

---

#### 26.2 - import-step2-mapping.png
**File:** `images/import-step2-mapping.png`
**Figure:** 26.2 - Import Wizard - Column Mapping

**Setup:**
1. Proceed to Step 2 of import wizard
2. Some columns should be auto-mapped
3. Manually map additional columns

**Capture:**
- Step 2 showing:
  - Source columns list (from file)
  - Target field dropdowns
  - Auto-mapped fields indicated
  - Skip column option
  - Sample values preview
  - Save Mapping button
  - Back/Next buttons

---

#### 26.3 - import-step3-validate.png
**File:** `images/import-step3-validate.png`
**Figure:** 26.3 - Import Wizard - Validation Results

**Setup:**
1. Proceed to Step 3 of import wizard
2. Include some rows with errors and warnings in test data

**Capture:**
- Step 3 showing:
  - Summary stats (total rows, valid, errors, warnings)
  - Row-by-row validation results
  - Error messages in red
  - Warning messages in yellow
  - Valid rows in green
  - Download Error Report button
  - Back/Next buttons

---

#### 26.4 - import-step4-progress.png
**File:** `images/import-step4-progress.png`
**Figure:** 26.4 - Import Wizard - Import Progress

**Setup:**
1. Proceed to Step 4 and start import
2. Capture during progress or at completion

**Capture:**
- Step 4 showing:
  - Import options (selected)
  - Progress bar (50% or complete)
  - Current row indicator
  - Running totals (imported, skipped, failed)
  - Completion summary (if done)
  - View Imported Cases button (if done)
  - Close button

---

### Section 27: Validation Rules

#### 27.1 - validation-panel.png
**File:** `images/validation-panel.png`
**Figure:** 27.1 - Validation Panel

**Setup:**
1. Create a case with validation errors and warnings
2. Click Validate or attempt to save

**Capture:**
- Validation panel showing:
  - Error section (expanded) with 2-3 errors
  - Warning section with 2-3 warnings
  - Info section (collapsed or with 1 item)
  - Color coding (red, orange, blue)
  - Expand/collapse controls
  - Click-to-navigate functionality hint
  - Acknowledge button for warnings

---

#### 27.2 - validation-rule-form.png
**File:** `images/validation-rule-form.png`
**Figure:** 27.2 - Custom Validation Rule Configuration

**Setup:**
1. Navigate to Settings > Validation Rules
2. Click New Rule or edit existing
3. Fill in rule configuration

**Capture:**
- Rule configuration form showing:
  - Rule code and name fields
  - Rule type dropdown (required, format, range, cross-field, custom)
  - Severity selector (error, warning, info)
  - Condition builder (when to apply)
  - Validation expression field
  - Error message template
  - Test button
  - Activate/Deactivate toggle
  - Save/Cancel buttons

---

## Sample Test Data

### MedDRA Terms to Use
- Headache (PT: 10019211)
- Nausea (PT: 10028813)
- Dizziness (PT: 10013573)
- Fatigue (PT: 10016256)
- Rash (PT: 10037844)

### WHO Drug Entries to Use
- Aspirin (multiple formulations)
- Ibuprofen 400mg tablets
- Amoxicillin 500mg capsules
- Lisinopril 10mg tablets

### Case Data for Duplicates
Create two cases with:
- Patient: John Smith
- DOB: 1965-03-15
- Event Date: 2024-06-20
- Reaction: Headache
- Drug: Aspirin

Vary slightly for second case:
- Patient: John A. Smith (same DOB)
- Event Date: 2024-06-20
- Same reaction and drug

### CSV Import Sample
Create a CSV file with columns:
```
Patient_ID,First_Name,Last_Name,DOB,Event_Date,Reaction,Drug_Name,Reporter_Name
P001,Jane,Doe,1980-05-12,2024-07-15,Nausea,Ibuprofen,Dr. Brown
P002,Bob,Wilson,1975-11-30,2024-07-16,Headache,Aspirin,Dr. Green
P003,Alice,Johnson,INVALID_DATE,2024-07-17,Dizziness,Amoxicillin,Dr. White
```

---

## Checklist

Use this checklist to track screenshot capture progress:

### Basic Operations (Sections 3-8)
- [ ] login-screen.png
- [ ] main-window.png
- [ ] new-case-button.png
- [ ] case-list.png
- [ ] case-form-report.png
- [ ] case-form-reporter.png
- [ ] case-form-sender.png
- [ ] case-form-patient.png
- [ ] case-form-reactions.png
- [ ] case-form-drugs.png
- [ ] case-form-narrative.png

### Settings & Dictionaries (Section 21)
- [ ] settings-dictionaries-tab.png
- [ ] meddra-import-wizard.png
- [ ] meddra-autocomplete.png
- [ ] meddra-browser.png

### WHO Drug Coding (Section 22)
- [ ] whodrug-import.png
- [ ] whodrug-autocomplete.png
- [ ] atc-browser.png

### Advanced Search (Section 23)
- [ ] advanced-search-builder.png
- [ ] saved-searches.png

### Duplicate Detection (Section 24)
- [ ] duplicate-alert.png
- [ ] merge-wizard.png
- [ ] duplicate-registry.png

### Case Templates (Section 25)
- [ ] template-library.png
- [ ] template-form.png

### Bulk Import (Section 26)
- [ ] import-step1-upload.png
- [ ] import-step2-mapping.png
- [ ] import-step3-validate.png
- [ ] import-step4-progress.png

### Validation Rules (Section 27)
- [ ] validation-panel.png
- [ ] validation-rule-form.png

**Total: 31 screenshots**

---

## Post-Capture Steps

1. **Review:** Ensure all screenshots are clear and readable
2. **Resize:** Optimize file size if needed (keep under 500KB per image)
3. **Naming:** Verify filenames match exactly as listed above
4. **Location:** Place all files in `docs/user/images/` directory
5. **Test:** Render the User Guide markdown to verify images display correctly
6. **Commit:** Add screenshots to version control with descriptive commit message

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | - | Initial guide for Phase 5 screenshots |
| 1.1 | January 2026 | - | Added basic operation screenshots (login, main window, case list, case form sections) |
