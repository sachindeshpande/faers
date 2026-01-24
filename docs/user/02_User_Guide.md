# FAERS Submission Application - User Guide

**Version:** 1.0
**Applies to:** Phase 1 (Core ICSR Submission MVP)
**Last Updated:** January 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Application Overview](#3-application-overview)
4. [Working with Cases](#4-working-with-cases)
5. [Data Entry Guide](#5-data-entry-guide)
6. [Validation](#6-validation)
7. [Exporting XML](#7-exporting-xml)
8. [Data Management](#8-data-management)
9. [Keyboard Shortcuts](#9-keyboard-shortcuts)
10. [Troubleshooting](#10-troubleshooting)
11. [Glossary](#11-glossary)

---

## 1. Introduction

### 1.1 Purpose

The FAERS Submission Application is a desktop tool designed to help pharmaceutical and biotech companies create, manage, and export Individual Case Safety Reports (ICSRs) for submission to the FDA's Adverse Event Reporting System (FAERS).

### 1.2 Who Should Use This Application

- **Safety Officers** responsible for adverse event reporting
- **Pharmacovigilance Specialists** managing drug safety data
- **Regulatory Affairs Professionals** preparing FDA submissions
- **Clinical Safety Associates** documenting adverse events

### 1.3 What This Application Does

- Creates structured ICSR cases following FDA E2B(R3) requirements
- Captures all required adverse event information
- Validates data before submission
- Generates compliant E2B(R3) XML files for FDA submission
- Stores cases locally for ongoing management

### 1.4 Regulatory Context

The FDA requires pharmaceutical companies to report adverse events electronically using the E2B(R3) standard. Key reporting timelines include:

| Report Type | Timeline |
|-------------|----------|
| **Expedited Reports** (serious, unexpected) | 15 calendar days |
| **Non-Expedited Reports** | Periodic (quarterly/annually) |

---

## 2. Getting Started

### 2.1 System Requirements

| Component | Requirement |
|-----------|-------------|
| Operating System | Windows 10+, macOS 11+, or Ubuntu 20.04+ |
| Display | Minimum 1280 x 720 resolution |
| Storage | 500 MB available space |
| Memory | 4 GB RAM minimum |

### 2.2 Installation

1. Download the installer for your operating system
2. Run the installer and follow the on-screen prompts
3. Launch the application from your Start Menu (Windows), Applications folder (macOS), or application menu (Linux)

### 2.3 First Launch

When you first launch the application:

1. The database will be automatically initialized
2. Country lookup data will be loaded
3. You'll see the main application window with an empty case list

### 2.4 Data Storage Location

Your data is stored locally in:

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\FAERSApp\faers.db` |
| macOS | `~/Library/Application Support/FAERSApp/faers.db` |
| Linux | `~/.config/FAERSApp/faers.db` |

---

## 3. Application Overview

### 3.1 Main Window Layout

```
┌─────────────────────────────────────────────────────────────┐
│  FAERS App    [New] [Open] [Save] [Validate] [Export XML]   │  ← Toolbar
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│  □ Case List  │                                             │
│  ─────────────│          Main Content Area                  │
│  □ Report     │                                             │
│  □ Reporter   │     (Case List or Form Sections)            │
│  □ Sender     │                                             │
│  □ Patient    │                                             │
│  □ Reactions  │                                             │
│  □ Drugs      │                                             │
│  □ Narrative  │                                             │
│               │                                             │
├───────────────┴─────────────────────────────────────────────┤
│  Case: CASE-20260123-AB12  │ Draft │ Last Saved: 10:30 AM   │  ← Status Bar
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Toolbar Buttons

| Button | Description |
|--------|-------------|
| **New** | Create a new ICSR case |
| **Open** | Return to the case list |
| **Save** | Save the current case |
| **Validate** | Check the case for errors |
| **Export XML** | Generate E2B(R3) XML file |

### 3.3 Navigation Panel

The left sidebar provides navigation between:

- **Case List** - View and manage all cases
- **Report** - Report identification and type
- **Reporter** - Primary source/reporter information
- **Sender** - Your organization's information
- **Patient** - Patient demographics and history
- **Reactions** - Adverse events/reactions
- **Drugs** - Suspect and concomitant medications
- **Narrative** - Case summary and comments

### 3.4 Status Bar

The bottom status bar shows:
- Current Case ID
- Case Status (Draft, Ready, Exported)
- Unsaved changes indicator
- Last saved timestamp

---

## 4. Working with Cases

### 4.1 Creating a New Case

**Method 1: Toolbar**
1. Click the **New** button in the toolbar
2. A new case is created with a unique ID (format: `CASE-YYYYMMDD-XXXX`)
3. The case opens in the Report section

**Method 2: Menu**
1. Go to **File > New Case** or press `Ctrl+N` (Windows/Linux) or `Cmd+N` (macOS)

**Method 3: Case List**
1. Navigate to the Case List
2. Click the **New Case** button

### 4.2 Opening an Existing Case

1. Navigate to the **Case List** (click "Open" in toolbar or select "Case List" in sidebar)
2. Find your case using:
   - **Search box**: Search by Case ID or patient initials
   - **Status filter**: Filter by Draft, Ready, or Exported
   - **Column sorting**: Click column headers to sort
3. **Double-click** the case to open it, or right-click and select "Open"

### 4.3 Saving a Case

Cases can be saved at any time, even with incomplete data:

- Click **Save** in the toolbar
- Press `Ctrl+S` (Windows/Linux) or `Cmd+S` (macOS)
- The status bar shows "Last Saved" timestamp when successful

**Auto-Save**: The application automatically saves your work every 5 minutes.

**Unsaved Changes**: A yellow dot (●) in the status bar indicates unsaved changes.

### 4.4 Case Status

| Status | Description |
|--------|-------------|
| **Draft** | Case is being created/edited. Can be modified or deleted. |
| **Ready** | Case has passed validation. Ready for XML export. |
| **Exported** | XML has been generated. Case is locked for reference. |

### 4.5 Duplicating a Case

Use duplication to create follow-up reports or similar cases:

1. In the Case List, right-click the case you want to copy
2. Select **Duplicate**
3. A new case is created with:
   - New unique Case ID
   - All data copied from the original
   - Report Type set to "Follow-up"
   - Link to the original case

### 4.6 Deleting a Case

Only **Draft** cases can be deleted:

1. In the Case List, right-click the case
2. Select **Delete**
3. Confirm the deletion in the dialog

**Note**: Deleted cases are soft-deleted and can be recovered by an administrator in future versions.

---

## 5. Data Entry Guide

### 5.1 Report Information Section

This section captures administrative information about the report.

| Field | Description | Required |
|-------|-------------|----------|
| Safety Report ID | Unique identifier (auto-generated) | Yes |
| Report Type | Spontaneous, Study, Other, Not Available | Yes |
| Initial/Follow-up | Whether this is an initial or follow-up report | Yes |
| Receipt Date | Date you first received the information | Yes |
| Most Recent Info Date | Date of most recent information | Yes |
| Expedited Report | Check if this meets expedited reporting criteria | No |
| Additional Documents | Check if supporting documents are available | No |

**Tips:**
- For spontaneous reports from healthcare providers, select "Spontaneous report"
- For adverse events from clinical trials, select "Report from study"

### 5.2 Reporter (Primary Source) Section

Information about who reported the adverse event.

| Field | Description | Required |
|-------|-------------|----------|
| Qualification | Physician, Pharmacist, Other HCP, Lawyer, Consumer | Yes |
| Given Name | Reporter's first name | No |
| Family Name | Reporter's last name | No |
| Organization | Hospital, clinic, or company name | No |
| Country | Reporter's country (dropdown) | No |
| Email | Contact email (validated format) | No |
| Phone | Contact phone number | No |

**Tips:**
- At minimum, capture the reporter's qualification
- For follow-up, having contact information is valuable
- You can add multiple reporters if the report came from several sources

### 5.3 Sender Information Section

Your organization's information (the company submitting to FDA).

| Field | Description | Required |
|-------|-------------|----------|
| Sender Type | Pharmaceutical company, Regulatory authority, etc. | Yes |
| Organization | Your company name | Yes |
| Given Name | Sender contact's first name | Yes |
| Family Name | Sender contact's last name | Yes |
| Address, City, Country | Your organization's address | No |
| Email | Contact email for FDA queries | No |

**Tips:**
- This information is typically the same for all your cases
- Future versions will allow setting default sender information

### 5.4 Patient Information Section

Demographics and medical history of the patient who experienced the adverse event.

#### Basic Information

| Field | Description | Required |
|-------|-------------|----------|
| Patient Initials | Anonymized identifier (e.g., "JD") | Conditional |
| Sex | Male, Female, Unknown | Yes |
| Age at Onset | Age when reaction occurred | Conditional* |
| Birth Date | Patient's date of birth | Conditional* |
| Weight | Body weight in kg | No |
| Height | Height in cm | No |

*Either Age or Birth Date must be provided.

#### Age Entry Options

You can enter patient age in several ways:
- **Exact birth date**: If known
- **Age with unit**: e.g., "45 Years" or "6 Months"
- **Age group**: Neonate, Infant, Child, Adolescent, Adult, Elderly

#### Medical History

Click **Add** to record relevant medical conditions:

| Field | Description |
|-------|-------------|
| Condition | Disease or condition name |
| Start Date | When condition began |
| Continuing | Is condition still present? |
| End Date | When condition resolved (if applicable) |
| Family History | Is this a family history item? |

#### Death Information

If the patient died:

1. Check the **Patient Died** checkbox
2. Enter the **Date of Death**
3. Add **Reported Cause(s) of Death**
4. Indicate if **Autopsy** was performed
5. Add **Autopsy Findings** if applicable

### 5.5 Reactions Section

Document each adverse event/reaction the patient experienced.

**Adding a Reaction:**
1. Click **Add Reaction**
2. Enter the reaction details

| Field | Description | Required |
|-------|-------------|----------|
| Reaction Term | Adverse event description (MedDRA term preferred) | Yes |
| Start Date | When reaction began | No |
| End Date | When reaction resolved | No |
| Duration | How long the reaction lasted | No |
| Outcome | Recovered, Recovering, Not Recovered, Fatal, Unknown | No |

#### Seriousness Criteria

For each reaction, indicate if it meets any seriousness criteria:

| Criterion | Description |
|-----------|-------------|
| ☐ Results in Death | The reaction caused or contributed to death |
| ☐ Life-Threatening | Patient was at risk of death at the time |
| ☐ Hospitalization | Required or prolonged hospitalization |
| ☐ Disability | Resulted in significant incapacity |
| ☐ Congenital Anomaly | Caused birth defect in offspring |
| ☐ Other Medically Important | Other significant medical event |

**At least one seriousness criterion must be selected for each reaction.**

### 5.6 Drugs Section

Document all relevant medications.

**Adding a Drug:**
1. Click **Add Drug**
2. Select the drug characterization
3. Enter drug details

#### Drug Characterization

| Type | Description |
|------|-------------|
| **Suspect** | Medication suspected of causing the reaction |
| **Concomitant** | Other medications being taken |
| **Interacting** | Medications that may have interacted |

**At least one Suspect drug is required.**

#### Drug Information

| Field | Description | Required |
|-------|-------------|----------|
| Product Name | Brand or generic name | Yes |
| Indication | Why the patient was taking this drug | No |
| Dosage | Amount and frequency | No |
| Route | How administered (oral, IV, etc.) | No |
| Start Date | When patient started taking | No |
| End Date | When patient stopped taking | No |
| Action Taken | Withdrawn, dose reduced, unchanged, etc. | No |

#### Dechallenge/Rechallenge

Important for causality assessment:

| Field | Options |
|-------|---------|
| Dechallenge | Did reaction abate when drug was stopped? Yes/No/Unknown/N/A |
| Rechallenge | Did reaction recur when drug was restarted? Yes/No/Unknown/N/A |

### 5.7 Narrative Section

The free-text summary of the case.

| Field | Description | Required |
|-------|-------------|----------|
| Case Narrative | Complete description of the case | Yes |
| Reporter's Comments | Additional comments from the reporter | No |
| Sender's Comments | Your organization's assessment | No |
| Sender's Diagnosis | Your medical assessment | No |

#### Writing an Effective Narrative

A good narrative should include:

1. **Patient description**: Age, sex, relevant medical history
2. **Drug exposure**: What medications, dosages, duration
3. **Event description**: What happened, when, severity
4. **Treatment**: What was done to treat the reaction
5. **Outcome**: How the patient recovered or current status
6. **Reporter's assessment**: Their opinion on causality

**Example:**
> A 65-year-old male with a history of hypertension and diabetes was started on Drug X 100mg daily for atrial fibrillation. Approximately 2 weeks after starting treatment, the patient developed a generalized skin rash with pruritus. Drug X was discontinued, and the rash resolved within 5 days without additional treatment. The patient has recovered without sequelae. The reporting physician considers the reaction probably related to Drug X.

---

## 6. Validation

### 6.1 Running Validation

Before exporting XML, validate your case:

1. Click **Validate** in the toolbar, or press `Ctrl+Shift+V`
2. The validation panel appears showing results

### 6.2 Validation Results

Results are categorized as:

| Level | Icon | Description |
|-------|------|-------------|
| **Error** | 🔴 | Must be fixed before export |
| **Warning** | 🟡 | Should be reviewed |
| **Info** | 🔵 | Suggestions for improvement |

### 6.3 Common Validation Errors

| Error | Solution |
|-------|----------|
| "Receipt date is required" | Enter the date you first received the report |
| "At least one reaction is required" | Add at least one adverse reaction |
| "At least one suspect drug is required" | Add at least one drug with "Suspect" characterization |
| "Seriousness criteria required" | Select at least one seriousness checkbox for each reaction |
| "Case narrative is required" | Enter a narrative summary |
| "Patient sex is required" | Select Male, Female, or Unknown |

### 6.4 Navigating to Errors

Click on any validation message to navigate directly to the field that needs attention.

---

## 7. Exporting XML

### 7.1 Generating XML

Once your case passes validation:

1. Click **Export XML** in the toolbar, or press `Ctrl+E`
2. If there are validation errors, you'll be prompted to fix them first
3. Choose a save location for the XML file
4. The file is saved with format: `{CaseID}_{Timestamp}.xml`

### 7.2 XML File Contents

The generated XML follows the ICH E2B(R3) standard and includes:

- Message header with sender/receiver information
- Safety report identification
- Patient information
- Reaction details with MedDRA coding
- Drug information
- Narrative summary

### 7.3 After Export

- The case status changes to "Exported"
- The export timestamp is recorded
- The case becomes read-only (create a follow-up for updates)

### 7.4 Submitting to FDA

**Note**: Phase 1 generates XML files for manual submission. Direct FDA gateway submission will be available in Phase 2.

To submit your XML:
1. Log in to the FDA Electronic Submission Gateway (ESG)
2. Upload your XML file
3. Monitor for acknowledgment (ACK) or rejection (NACK)

---

## 8. Data Management

### 8.1 Backing Up Your Data

Regular backups protect against data loss:

1. Go to **File > Backup Database**
2. A backup file is created in: `Documents/FAERSApp/Backups/`
3. Filename format: `faers-backup-{timestamp}.db`

**Recommendation**: Back up before major updates or weekly.

### 8.2 Restoring from Backup

To restore from a backup:

1. Go to **File > Restore from Backup**
2. Select the backup file
3. Confirm the restoration

**Warning**: Restoring replaces all current data with the backup.

### 8.3 Automatic Backups

The application creates automatic backups:
- When closing the application (configurable)
- The last 10 backups are retained

---

## 9. Keyboard Shortcuts

### 9.1 General Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| New Case | `Ctrl+N` | `Cmd+N` |
| Save | `Ctrl+S` | `Cmd+S` |
| Validate | `Ctrl+Shift+V` | `Cmd+Shift+V` |
| Export XML | `Ctrl+E` | `Cmd+E` |
| Undo | `Ctrl+Z` | `Cmd+Z` |
| Redo | `Ctrl+Y` | `Cmd+Shift+Z` |

### 9.2 Navigation Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Report Section | `Ctrl+1` | `Cmd+1` |
| Reporter Section | `Ctrl+2` | `Cmd+2` |
| Sender Section | `Ctrl+3` | `Cmd+3` |
| Patient Section | `Ctrl+4` | `Cmd+4` |
| Reactions Section | `Ctrl+5` | `Cmd+5` |
| Drugs Section | `Ctrl+6` | `Cmd+6` |
| Narrative Section | `Ctrl+7` | `Cmd+7` |

### 9.3 Form Navigation

| Action | Shortcut |
|--------|----------|
| Next Field | `Tab` |
| Previous Field | `Shift+Tab` |
| Open Dropdown | `Space` or `Enter` |
| Select Date | `Enter` (in date picker) |

---

## 10. Troubleshooting

### 10.1 Application Won't Start

**Symptoms**: Application fails to launch or crashes immediately.

**Solutions**:
1. Ensure your system meets minimum requirements
2. Try reinstalling the application
3. Check if antivirus is blocking the application
4. Delete the database file and restart (warning: loses all data)

### 10.2 Data Not Saving

**Symptoms**: Changes are lost after closing.

**Solutions**:
1. Check for disk space on your system drive
2. Ensure you have write permissions to the data directory
3. Click Save manually before closing
4. Check for "unsaved changes" indicator

### 10.3 Validation Always Fails

**Symptoms**: Cannot export XML due to persistent errors.

**Solutions**:
1. Review each error message carefully
2. Ensure all required fields are filled
3. Check date formats are correct
4. Verify at least one reaction and one suspect drug exist

### 10.4 XML Export Errors

**Symptoms**: XML generation fails or produces invalid file.

**Solutions**:
1. Run validation first and fix all errors
2. Ensure narrative doesn't contain special characters that need escaping
3. Check that all dates are in valid format
4. Try exporting to a different location

### 10.5 Performance Issues

**Symptoms**: Application is slow or unresponsive.

**Solutions**:
1. Close other applications to free memory
2. If case list is large, use filters to reduce displayed cases
3. Consider archiving old exported cases
4. Restart the application

### 10.6 Getting Help

If you continue to experience issues:

1. Check the application logs (Help > View Logs)
2. Note the exact error message
3. Document steps to reproduce the issue
4. Contact your IT support or the application vendor

---

## 11. Glossary

| Term | Definition |
|------|------------|
| **ACK** | Acknowledgment - FDA confirmation of successful submission |
| **Adverse Event (AE)** | Undesirable medical occurrence during drug treatment |
| **Concomitant Drug** | Medication taken alongside the suspect drug |
| **Dechallenge** | Stopping a drug to see if adverse event resolves |
| **E2B(R3)** | ICH standard format for electronic ICSR transmission |
| **ESG** | FDA Electronic Submission Gateway |
| **Expedited Report** | Report due within 15 days (serious, unexpected events) |
| **FAERS** | FDA Adverse Event Reporting System |
| **HCP** | Healthcare Professional |
| **ICSR** | Individual Case Safety Report |
| **MedDRA** | Medical Dictionary for Regulatory Activities (coding system) |
| **NACK** | Negative Acknowledgment - FDA rejection of submission |
| **Pharmacovigilance** | Science of detecting and preventing adverse drug effects |
| **Rechallenge** | Restarting a drug to see if adverse event recurs |
| **Serious AE** | Event resulting in death, hospitalization, disability, etc. |
| **Spontaneous Report** | Voluntary report from healthcare provider or consumer |
| **Suspect Drug** | Medication believed to have caused the adverse event |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial release for Phase 1 MVP |

---

## Contact & Support

For technical support or feedback, please contact your system administrator or the application support team.

**FDA Resources**:
- [FAERS Electronic Submissions](https://www.fda.gov/drugs/fdas-adverse-event-reporting-system-faers/fda-adverse-event-reporting-system-faers-electronic-submissions)
- [E2B(R3) Implementation Guide](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/fda-regional-implementation-guide-e2br3)
