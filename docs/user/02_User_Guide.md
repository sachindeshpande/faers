# FAERS Submission Application - User Guide

**Version:** 3.0
**Applies to:** Phase 4 (Non-Expedited Reports, Follow-Ups & Periodic Safety Reports)
**Last Updated:** January 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Logging In](#3-logging-in)
4. [Application Overview](#4-application-overview)
5. [Working with Cases](#5-working-with-cases)
6. [Workflow Management](#6-workflow-management)
7. [Comments and Notes](#7-comments-and-notes)
8. [Data Entry Guide](#8-data-entry-guide)
9. [Validation](#9-validation)
10. [Exporting XML](#10-exporting-xml)
11. [Notifications](#11-notifications)
12. [Audit Trail](#12-audit-trail)
13. [User Management (Administrators)](#13-user-management-administrators)
14. [Data Management](#14-data-management)
15. [User Account Management](#15-user-account-management)
16. [Report Type Classification](#16-report-type-classification)
17. [Product Management](#17-product-management)
18. [Follow-Up and Nullification Reports](#18-follow-up-and-nullification-reports)
19. [Batch Submission](#19-batch-submission)
20. [Periodic Safety Reports (PSR)](#20-periodic-safety-reports-psr)
21. [Keyboard Shortcuts](#21-keyboard-shortcuts)
22. [Troubleshooting](#22-troubleshooting)
23. [Glossary](#23-glossary)

---

## 1. Introduction

### 1.1 Purpose

The FAERS Submission Application is a desktop tool designed to help pharmaceutical and biotech companies create, manage, and export Individual Case Safety Reports (ICSRs) for submission to the FDA's Adverse Event Reporting System (FAERS).

### 1.2 Who Should Use This Application

- **Safety Officers** responsible for adverse event reporting
- **Pharmacovigilance Specialists** managing drug safety data
- **Regulatory Affairs Professionals** preparing FDA submissions
- **Clinical Safety Associates** documenting adverse events
- **Medical Reviewers** reviewing and approving cases
- **QC Reviewers** performing quality control
- **Administrators** managing users and system configuration

### 1.3 What This Application Does

- Creates structured ICSR cases following FDA E2B(R3) requirements
- Captures all required adverse event information
- Validates data before submission
- Generates compliant E2B(R3) XML files for FDA submission
- Stores cases locally for ongoing management
- **Supports multi-user authentication and access control**
- **Tracks audit history for 21 CFR Part 11 compliance**

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
2. A default administrator account is created (see Section 3.2)
3. You'll see the login screen
4. Log in with your credentials to access the application

### 2.4 Data Storage Location

Your data is stored locally in:

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\FAERSApp\faers.db` |
| macOS | `~/Library/Application Support/FAERSApp/faers.db` |
| Linux | `~/.config/FAERSApp/faers.db` |

---

## 3. Logging In

### 3.1 Login Screen

When you start the application, you'll see the login screen:

```
┌────────────────────────────────────┐
│                                    │
│     FAERS Submission App           │
│     Sign in to continue            │
│                                    │
│     ┌──────────────────────┐       │
│     │ Username             │       │
│     └──────────────────────┘       │
│                                    │
│     ┌──────────────────────┐       │
│     │ Password             │       │
│     └──────────────────────┘       │
│                                    │
│     ☐ Remember username            │
│                                    │
│     [       Sign In       ]        │
│                                    │
└────────────────────────────────────┘
```

### 3.2 Default Administrator Account

On first launch, a default administrator account is created:

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `Admin@123456` |

**Important**: Change this password immediately after first login!

### 3.3 Logging In

1. Enter your username
2. Enter your password
3. Optionally check "Remember username" to save your username for next time
4. Click **Sign In**

### 3.4 Failed Login Attempts

For security, accounts are locked after 5 failed login attempts:

- You'll see a message indicating how many attempts remain
- After 5 failures, the account is locked for 30 minutes
- Contact your administrator if you need immediate access

### 3.5 First-Time Password Change

If your password was set by an administrator or has expired, you'll be required to change it before accessing the application:

1. Enter your current password
2. Enter a new password meeting the policy requirements
3. Confirm your new password
4. Click **Change Password**

### 3.6 Password Requirements

Passwords must meet the following requirements:

- At least 12 characters long
- Contains at least one uppercase letter (A-Z)
- Contains at least one lowercase letter (a-z)
- Contains at least one number (0-9)
- Contains at least one special character (!@#$%^&*)
- Cannot reuse the last 5 passwords

### 3.7 Session Timeout

For security, your session will expire after 30 minutes of inactivity:

- A warning dialog appears 5 minutes before timeout
- Click **Continue Session** to extend your session
- If you don't respond, you'll be automatically logged out
- Your unsaved work is preserved - log back in to continue

### 3.8 Logging Out

To log out:

1. Click your username in the toolbar (top right)
2. Select **Logout** from the dropdown menu

---

## 4. Application Overview

### 4.1 Main Window Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  FAERS App  [New][Open][Import][Save][Validate][Export][Settings][User ▼]│ ← Toolbar
├───────────────┬─────────────────────────────────────────────────────┤
│               │                                                     │
│  □ Dashboard  │                                                     │
│  □ Case List  │          Main Content Area                          │
│  ─────────────│                                                     │
│  □ Report     │     (Dashboard, Case List, or Form Sections)        │
│  □ Reporter   │                                                     │
│  □ Sender     │                                                     │
│  □ Patient    │                                                     │
│  □ Reactions  │                                                     │
│  □ Drugs      │                                                     │
│  □ Narrative  │                                                     │
│               │                                                     │
├───────────────┴─────────────────────────────────────────────────────┤
│  Case: CASE-20260123-AB12 │ Draft │ Env: Test │ Last Saved: 10:30   │ ← Status Bar
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Toolbar Buttons

| Button | Description |
|--------|-------------|
| **New** | Create a new ICSR case |
| **Open** | Return to the case list |
| **Import 3500** | Import a Form 3500A PDF |
| **Save** | Save the current case |
| **Validate** | Check the case for errors |
| **Export XML** | Generate E2B(R3) XML file |
| **Settings** | Open application settings |
| **User Menu** | Access profile, change password, logout |

### 4.3 User Menu

Click your username in the top-right corner to access:

| Option | Description |
|--------|-------------|
| **Profile** | Displays your name |
| **Change Password** | Open password change dialog |
| **Logout** | Sign out of the application |

### 4.4 Navigation Panel

The left sidebar provides navigation between:

**Main Views:**
- **Dashboard** - Overview of cases and submission status
- **My Cases** - Cases assigned to you (default landing page)
- **Case List** - View and manage all cases
- **Notifications** - View alerts and updates
- **Audit Log** - System audit trail (Administrators/Managers only)
- **User Management** - Manage users and roles (Administrators only)

**Case Form Sections** (when a case is open):
- **Report** - Report identification and type
- **Reporter** - Primary source/reporter information
- **Sender** - Your organization's information
- **Patient** - Patient demographics and history
- **Reactions** - Adverse events/reactions
- **Drugs** - Suspect and concomitant medications
- **Narrative** - Case summary
- **Comments** - Workflow comments and discussions
- **Notes** - Personal and team notes

### 4.5 Status Bar

The bottom status bar shows:
- Current Case ID
- Case Status (Draft, Ready, Exported, Submitted, Acknowledged)
- Environment indicator (Test or Production)
- Last saved timestamp

---

## 5. Working with Cases

### 5.1 Creating a New Case

**Method 1: Toolbar**
1. Click the **New** button in the toolbar
2. A new case is created with a unique ID (format: `CASE-YYYYMMDD-XXXX`)
3. The case opens in the Report section

**Method 2: Menu**
1. Go to **File > New Case** or press `Ctrl+N` (Windows/Linux) or `Cmd+N` (macOS)

**Method 3: Case List**
1. Navigate to the Case List
2. Click the **New Case** button

### 5.2 Opening an Existing Case

1. Navigate to the **Case List** (click "Open" in toolbar or select "Case List" in sidebar)
2. Find your case using:
   - **Search box**: Search by Case ID or patient initials
   - **Status filter**: Filter by Draft, Ready, or Exported
   - **Column sorting**: Click column headers to sort
3. **Double-click** the case to open it, or right-click and select "Open"

### 5.3 Saving a Case

Cases can be saved at any time, even with incomplete data:

- Click **Save** in the toolbar
- Press `Ctrl+S` (Windows/Linux) or `Cmd+S` (macOS)
- The status bar shows "Last Saved" timestamp when successful

**Auto-Save**: The application automatically saves your work every 5 minutes.

**Unsaved Changes**: A yellow dot (●) in the status bar indicates unsaved changes.

### 5.4 Case Workflow Status

Cases progress through a defined workflow with these statuses:

| Status | Description |
|--------|-------------|
| **Draft** | Case is being created/edited by Data Entry. |
| **Data Entry Complete** | Data entry finished, ready for medical review. |
| **In Medical Review** | Assigned to Medical Reviewer for clinical assessment. |
| **Medical Review Complete** | Medical review finished, ready for QC. |
| **In QC Review** | Assigned to QC Reviewer for quality check. |
| **QC Complete** | QC review finished, ready for final approval. |
| **Approved** | Case approved for submission to FDA. |
| **Submitted** | Case has been submitted to FDA via ESG NextGen USP. |
| **Acknowledged** | FDA has acknowledged receipt of the submission. |
| **Rejected** | Returned by reviewer (requires correction and resubmission). |

**Note:** See [Section 6: Workflow Management](#6-workflow-management) for details on workflow transitions.

### 5.5 Duplicating a Case

Use duplication to create follow-up reports or similar cases:

1. In the Case List, right-click the case you want to copy
2. Select **Duplicate**
3. A new case is created with:
   - New unique Case ID
   - All data copied from the original
   - Report Type set to "Follow-up"
   - Link to the original case

### 5.6 Deleting a Case

Only **Draft** cases can be deleted:

1. In the Case List, right-click the case
2. Select **Delete**
3. Confirm the deletion in the dialog

**Note**: Deleted cases are soft-deleted and can be recovered by an administrator.

---

## 6. Workflow Management

The application implements a structured workflow to ensure cases are properly reviewed and approved before submission to the FDA.

### 6.1 Workflow Overview

Cases progress through a series of review stages:

```
Draft → Data Entry Complete → In Medical Review → Medical Review Complete
      → In QC Review → QC Complete → Approved → Submitted → Acknowledged
                    ↓                       ↓
              (Rejected - returns to Draft)
```

### 6.2 Workflow States

| State | Who Can Transition | Next Actions |
|-------|-------------------|--------------|
| **Draft** | Data Entry | Submit for Review |
| **Data Entry Complete** | Manager | Assign to Medical Reviewer |
| **In Medical Review** | Medical Reviewer | Approve or Reject |
| **Medical Review Complete** | Manager | Assign to QC Reviewer |
| **In QC Review** | QC Reviewer | Approve or Reject |
| **QC Complete** | Manager | Final Approval |
| **Approved** | Submitter | Submit to FDA |
| **Submitted** | Submitter | Record Acknowledgment |
| **Acknowledged** | - | Case complete |
| **Rejected** | Data Entry | Fix issues, resubmit |

### 6.3 Workflow Actions

Available actions depend on your role and the case status:

**Data Entry Users:**
- **Submit for Review** - Send completed case for medical review

**Medical Reviewers:**
- **Approve** - Approve the case (requires electronic signature)
- **Reject** - Return the case with comments for correction

**QC Reviewers:**
- **Approve** - Approve the case (requires electronic signature)
- **Reject** - Return the case with comments for correction

**Managers:**
- **Assign Case** - Assign a case to a reviewer
- **Reassign Case** - Transfer assignment to another user

**Submitters:**
- **Submit to FDA** - Submit approved case (requires electronic signature)
- **Record Acknowledgment** - Record FDA acknowledgment

### 6.4 Performing Workflow Actions

1. Open the case you want to act on
2. Look for the **Workflow Actions** bar at the top of the case form
3. Available actions are displayed based on your permissions and the case status
4. Click the action button (e.g., "Approve", "Reject", "Submit for Review")
5. Complete any required dialogs:
   - **Approval**: Requires entering your password for electronic signature
   - **Rejection**: Requires entering a reason for rejection
   - **Submit for Review**: Optionally add comments

### 6.5 Case Assignment

Managers can assign cases to specific users for review:

**Assigning a Case:**
1. Open the case or select it from the Case List
2. Click **Assign** in the Workflow Actions bar
3. Select the user from the dropdown
4. Optionally set:
   - **Priority**: Normal, High, or Urgent
   - **Due Date**: When the review should be completed
   - **Notes**: Instructions for the assignee
5. Click **Assign**

**Reassigning a Case:**
1. Click **Reassign** in the Workflow Actions bar
2. Select the new assignee
3. Enter a reason for reassignment
4. Click **Reassign**

### 6.6 My Cases View

The "My Cases" view shows cases assigned to you:

- Cases are sorted by due date (most urgent first)
- Overdue cases are highlighted in red
- Click any case to open it
- Filter by status or priority

**Workload Summary:**
- View your current case count by status
- See upcoming due dates
- Track overdue cases

### 6.7 Due Dates

Due dates are calculated based on report type:

| Report Type | Due Date |
|-------------|----------|
| **Expedited** | 15 calendar days from receipt |
| **Non-Expedited** | 90 calendar days from receipt |

**Due Date Alerts:**
- Cases approaching due date are flagged
- Overdue cases appear in red
- Notifications are sent at 7, 3, and 1 day before due date

### 6.8 Electronic Signatures

Certain workflow actions require electronic signatures for 21 CFR Part 11 compliance:

- **Medical Review Approval**
- **QC Review Approval**
- **Final Case Approval**
- **FDA Submission**

**Signing a Record:**
1. Perform the action (e.g., click "Approve")
2. The signature dialog appears
3. Review the signature meaning (e.g., "I have reviewed this case and certify it is accurate")
4. Enter your password to authenticate
5. Click **Sign**

Electronic signatures are recorded in the audit trail with:
- User identity
- Timestamp
- Action performed
- Signature meaning

---

## 7. Comments and Notes

### 7.1 Comments

Comments are used for workflow communication and are visible to all users who can view the case.

**Comment Types:**

| Type | Description |
|------|-------------|
| **General** | General discussion about the case |
| **Query** | Question requiring response |
| **Response** | Answer to a query |
| **Rejection** | Reason for rejection (auto-created) |
| **Workflow** | System-generated workflow comments |

**Adding a Comment:**
1. Open the case and navigate to the **Comments** section
2. Select the comment type from the dropdown
3. Enter your comment text
4. Click **Add Comment**

**Viewing Comments:**
- Comments are displayed chronologically
- Each comment shows the author, type, and timestamp
- Comments cannot be edited or deleted after creation (audit requirement)

### 7.2 Notes

Notes are personal or team observations that may not need to be part of the official case record.

**Note Visibility:**

| Visibility | Who Can See |
|------------|-------------|
| **Personal** | Only you can see the note |
| **Team** | All users with access to the case can see |

**Adding a Note:**
1. Open the case and navigate to the **Notes** section
2. Select visibility (Personal or Team)
3. Enter your note text
4. Click **Add Note**

**Resolving Notes:**
- Notes can be marked as "resolved" when addressed
- Click the checkmark icon next to a note to resolve it
- Resolved notes are shown with strikethrough text

---

## 8. Data Entry Guide

### 8.1 Report Information Section

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

### 8.2 Reporter (Primary Source) Section

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

### 8.3 Sender Information Section

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
- Configure default sender information in Settings

### 8.4 Patient Information Section

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

### 8.5 Reactions Section

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
| Results in Death | The reaction caused or contributed to death |
| Life-Threatening | Patient was at risk of death at the time |
| Hospitalization | Required or prolonged hospitalization |
| Disability | Resulted in significant incapacity |
| Congenital Anomaly | Caused birth defect in offspring |
| Other Medically Important | Other significant medical event |

**At least one seriousness criterion must be selected for each reaction.**

### 8.6 Drugs Section

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

### 8.7 Narrative Section

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

## 9. Validation

### 9.1 Running Validation

Before exporting XML, validate your case:

1. Click **Validate** in the toolbar, or press `Ctrl+Shift+V`
2. The validation panel appears showing results

### 9.2 Validation Results

Results are categorized as:

| Level | Icon | Description |
|-------|------|-------------|
| **Error** | Red | Must be fixed before export |
| **Warning** | Yellow | Should be reviewed |
| **Info** | Blue | Suggestions for improvement |

### 9.3 Common Validation Errors

| Error | Solution |
|-------|----------|
| "Receipt date is required" | Enter the date you first received the report |
| "At least one reaction is required" | Add at least one adverse reaction |
| "At least one suspect drug is required" | Add at least one drug with "Suspect" characterization |
| "Seriousness criteria required" | Select at least one seriousness checkbox for each reaction |
| "Case narrative is required" | Enter a narrative summary |
| "Patient sex is required" | Select Male, Female, or Unknown |

### 9.4 Navigating to Errors

Click on any validation message to navigate directly to the field that needs attention.

---

## 10. Exporting XML

### 10.1 Generating XML

Once your case passes validation:

1. Click **Export XML** in the toolbar, or press `Ctrl+E`
2. If there are validation errors, you'll be prompted to fix them first
3. Choose a save location for the XML file
4. The file is saved with FDA-compliant naming format

### 10.2 XML File Contents

The generated XML follows the ICH E2B(R3) standard and includes:

- Message header with sender/receiver information
- Safety report identification
- Patient information
- Reaction details with MedDRA coding
- Drug information
- Narrative summary

### 10.3 After Export

- The case status changes to "Exported"
- The export timestamp is recorded
- The case can be submitted to FDA

### 10.4 Submitting to FDA

To submit your XML via FDA ESG NextGen USP:

1. Log in to the FDA Electronic Submission Gateway
2. Select "USP" (Universal Safety Portal)
3. Choose "Test Submission" for testing or "Production" for real submissions
4. Upload your XML file
5. Record the SRP Confirmation Number in the application
6. Monitor for acknowledgment

---

## 11. Notifications

The application provides a notification system to keep you informed about case assignments, workflow changes, and due date reminders.

### 11.1 Notification Center

Access the Notification Center by clicking the bell icon in the toolbar. A badge shows the count of unread notifications.

### 11.2 Notification Types

| Type | Description |
|------|-------------|
| **Case Assigned** | A case has been assigned to you |
| **Case Reassigned** | A case has been reassigned to another user |
| **Workflow Changed** | Case status has changed |
| **Review Requested** | Your review is requested on a case |
| **Case Approved** | A case you submitted has been approved |
| **Case Rejected** | A case you submitted has been rejected |
| **Due Date Warning** | A case is approaching its due date |
| **Overdue Alert** | A case has passed its due date |
| **Comment Added** | Someone commented on your case |

### 11.3 Managing Notifications

**Viewing Notifications:**
1. Click the bell icon in the toolbar
2. A dropdown shows recent notifications
3. Click a notification to navigate to the related case

**Marking as Read:**
- Click a notification to automatically mark it as read
- Click "Mark All Read" to clear all unread notifications

**Notification Preferences:**
Administrators can configure notification settings in system preferences.

---

## 12. Audit Trail

The application maintains a comprehensive audit trail for 21 CFR Part 11 compliance.

### 12.1 What is Logged

All significant actions are recorded:

| Action Type | Examples |
|-------------|----------|
| **User Authentication** | Login, logout, failed login attempts |
| **Case Operations** | Create, update, delete, duplicate |
| **Field Changes** | Individual field modifications with old/new values |
| **Workflow Transitions** | Status changes, approvals, rejections |
| **Electronic Signatures** | Signature events with meaning |
| **Exports** | XML generation, audit log exports |
| **User Management** | User creation, role changes, password resets |

### 12.2 Viewing the Audit Log

Administrators and Managers can access the audit log:

1. Navigate to **Audit Log** in the left sidebar
2. Use filters to narrow results:
   - **Date Range**: Start and end dates
   - **User**: Filter by specific user
   - **Action Type**: Filter by action category
   - **Entity Type**: Filter by case, user, or system
   - **Case ID**: Filter by specific case

### 12.3 Audit Log Columns

| Column | Description |
|--------|-------------|
| **Timestamp** | Date and time of action (UTC) |
| **User** | User who performed the action |
| **Action** | Type of action performed |
| **Entity** | Type and ID of affected entity |
| **Field** | Field name (for field changes) |
| **Old Value** | Previous value (for changes) |
| **New Value** | New value (for changes) |
| **Details** | Additional context |

### 12.4 Case Audit History

To view the audit trail for a specific case:

1. Open the case
2. Click the **History** tab or button
3. View all changes made to the case chronologically

### 12.5 Exporting Audit Logs

To export the audit log for compliance reporting:

1. Navigate to the Audit Log
2. Apply any desired filters
3. Click **Export**
4. Choose format:
   - **CSV**: Spreadsheet-compatible format
   - **JSON**: Machine-readable format
5. Choose save location
6. The export action is itself logged

### 12.6 Audit Trail Integrity

The audit log is append-only:
- Entries cannot be modified or deleted
- Timestamps are recorded in UTC
- User identity is captured at time of action
- Database integrity is protected

---

## 13. User Management (Administrators)

Administrators can manage users and their access through the User Management section.

### 13.1 Accessing User Management

1. Navigate to **User Management** in the left sidebar
2. Only users with Administrator role can access this section

### 13.2 Viewing Users

The user list shows:
- Username
- Full name
- Email
- Role
- Status (Active/Inactive)
- Last login date

Use the search box and filters to find specific users.

### 13.3 Creating a New User

1. Click **New User**
2. Enter required information:
   - **Username**: Unique login identifier
   - **Email**: User's email address
   - **First Name / Last Name**: User's full name
   - **Role**: Select appropriate role
3. Click **Create**
4. A temporary password is generated and displayed
5. Share the temporary password with the user securely
6. The user must change their password on first login

### 13.4 Editing a User

1. Click the user in the list
2. Click **Edit**
3. Modify user information:
   - First Name / Last Name
   - Email
   - Role
4. Click **Save**

**Note:** Usernames cannot be changed after creation.

### 13.5 Deactivating a User

To remove a user's access without deleting their account:

1. Select the user
2. Click **Deactivate**
3. Confirm the action

Deactivated users:
- Cannot log in
- Retain their audit history
- Can be reactivated later

### 13.6 Reactivating a User

1. Show inactive users using the status filter
2. Select the deactivated user
3. Click **Reactivate**

### 13.7 Resetting a User's Password

If a user forgets their password:

1. Select the user
2. Click **Reset Password**
3. A new temporary password is generated
4. Share the temporary password securely
5. The user must change their password on next login

### 13.8 User Roles

| Role | Permissions |
|------|-------------|
| **Administrator** | Full system access, user management, audit access |
| **Manager** | View all cases, assign work, run reports, view audit log |
| **Data Entry** | Create/edit own cases, submit for review |
| **Medical Reviewer** | Review assigned cases, approve/reject |
| **QC Reviewer** | QC review assigned cases, approve/reject |
| **Submitter** | Submit approved cases to FDA |
| **Read Only** | View all cases (no editing) |

---

## 14. Data Management

### 14.1 Backing Up Your Data

Regular backups protect against data loss:

1. Go to **File > Backup Database**
2. A backup file is created in: `Documents/FAERSApp/Backups/`
3. Filename format: `faers-backup-{timestamp}.db`

**Recommendation**: Back up before major updates or weekly.

### 14.2 Restoring from Backup

To restore from a backup:

1. Go to **File > Restore from Backup**
2. Select the backup file
3. Confirm the restoration

**Warning**: Restoring replaces all current data with the backup.

### 14.3 Automatic Backups

The application creates automatic backups:
- When closing the application (configurable)
- The last 10 backups are retained

---

## 15. User Account Management

### 15.1 Changing Your Password

To change your password:

1. Click your username in the toolbar
2. Select **Change Password**
3. Enter your current password
4. Enter your new password (must meet policy requirements)
5. Confirm your new password
6. Click **Change Password**

### 15.2 Password Policy

All passwords must meet these requirements:

| Requirement | Description |
|-------------|-------------|
| Minimum Length | 12 characters |
| Uppercase | At least one uppercase letter (A-Z) |
| Lowercase | At least one lowercase letter (a-z) |
| Number | At least one digit (0-9) |
| Special Character | At least one special character (!@#$%^&*) |
| History | Cannot reuse last 5 passwords |
| Expiration | Passwords expire after 90 days |

### 15.3 Account Lockout

For security, accounts are automatically locked after 5 failed login attempts:

- Lockout duration: 30 minutes
- Contact your administrator for immediate unlock

### 15.4 Session Security

- Sessions automatically expire after 30 minutes of inactivity
- A warning dialog appears 5 minutes before expiration
- Click **Continue Session** to extend your session
- Only one session per user is allowed (logging in elsewhere logs you out)

### 15.5 User Roles

The application supports different user roles with specific permissions:

| Role | Description |
|------|-------------|
| **Administrator** | Full access to all features including user management |
| **Manager** | Can view all cases, assign work, run reports |
| **Data Entry** | Can create and edit own cases, submit for review |
| **Medical Reviewer** | Can review and approve/reject cases |
| **QC Reviewer** | Can perform quality control review |
| **Submitter** | Can submit approved cases to FDA |
| **Read Only** | Can view all cases but cannot make changes |

Contact your administrator to request role changes.

---

## 16. Report Type Classification

Phase 4 introduces automatic classification of reports as Expedited or Non-Expedited based on FDA reporting requirements.

### 16.1 Understanding Report Types

| Report Type | Criteria | Reporting Timeline |
|-------------|----------|-------------------|
| **Expedited** | Serious AND Unexpected | 15 calendar days |
| **Non-Expedited** | Non-Serious OR (Serious AND Expected) | Periodic (PSR) |

### 16.2 Seriousness Criteria

A case is considered **Serious** if any of these criteria are met:

| Criterion | Description |
|-----------|-------------|
| **Results in Death** | The reaction caused or contributed to death |
| **Life-Threatening** | Patient was at risk of death at the time of the event |
| **Hospitalization** | Required or prolonged inpatient hospitalization |
| **Disability** | Resulted in persistent or significant incapacity |
| **Congenital Anomaly** | Caused a birth defect in offspring |
| **Other Medically Important** | Other significant medical event requiring intervention |

### 16.3 Expectedness

A reaction is considered **Expected** if it is listed in the approved product labeling. **Unexpected** reactions are those not listed in the labeling or that are more severe than described.

### 16.4 Classification Workflow

1. Open a case and navigate to the **Report Classification** section
2. Select the seriousness criteria that apply
3. Indicate the expectedness of each reaction
4. The system will suggest the appropriate report type
5. You can override the suggestion with justification if needed

### 16.5 Report Classification Section

The Report Classification Section displays:
- Seriousness checkboxes for each criterion
- Expectedness selection (Expected/Unexpected/Unknown)
- Auto-calculated classification (Expedited or Non-Expedited)
- Override option with required justification field

---

## 17. Product Management

Products are managed centrally to support PSR (Periodic Safety Report) scheduling and case aggregation.

### 17.1 Accessing Product Management

1. Navigate to **Products** in the left sidebar
2. Only users with Administrator or Manager role can create/edit products

### 17.2 Product Information

Each product record contains:

| Field | Description | Required |
|-------|-------------|----------|
| **Product Name** | Brand or trade name | Yes |
| **Active Ingredient** | Generic name of active substance | No |
| **Application Type** | NDA, BLA, or ANDA | No |
| **Application Number** | FDA application number | No |
| **US Approval Date** | Date of FDA approval | No |
| **Marketing Status** | Approved, Withdrawn, or Pending | Yes |
| **Company Name** | Marketing authorization holder | No |

### 17.3 Creating a Product

1. Click **New Product** in the Products view
2. Enter the product information
3. Click **Save**

### 17.4 Configuring PSR Schedules

Products can have one or more PSR schedules configured:

1. Open a product
2. Navigate to the **PSR Schedule** tab
3. Click **Add Schedule**
4. Configure:
   - **Format**: PADER, PSUR, or PBRER
   - **Frequency**: Quarterly, Semi-Annual, Annual, or Biennial
   - **Start Date**: When the first period begins (defaults to approval date)
   - **DLP Offset**: Days before period end for Data Lock Point
   - **Due Offset**: Days after period end for submission due date
5. Click **Save**

### 17.5 Linking Cases to Products

Cases are linked to products through the **Product** field in the case form:

1. Open a case
2. In the Report section, select the product from the dropdown
3. This enables the case to be included in PSRs for that product

---

## 18. Follow-Up and Nullification Reports

Phase 4 supports creating follow-up reports and nullifying previously submitted cases.

### 18.1 Follow-Up Reports

Follow-up reports provide additional information about previously submitted cases.

**Creating a Follow-Up:**

1. Open the original submitted case
2. Click **Create Follow-Up** in the Actions menu
3. Select the follow-up type:
   - **Additional Information** - New info received about the case
   - **Outcome Update** - Patient outcome has changed
   - **Correction** - Correcting errors in original submission
   - **FDA Response** - Responding to FDA query
   - **Upgrade to Serious** - Case now meets seriousness criteria
   - **Downgrade** - Removing seriousness designation
4. Enter the date information was received
5. Click **Create**

A new case is created with:
- All original data copied
- Link to parent case (parent_case_id)
- Incremented version number
- Follow-up type recorded
- Due date calculated (15 days for expedited follow-ups)

### 18.2 Version Timeline

View the complete history of a case and its follow-ups:

1. Open any case in a version chain
2. Click **Version History** in the Actions menu
3. The timeline shows:
   - All versions of the case
   - Status of each version
   - Follow-up type and info date
   - Submission status

### 18.3 Nullification Reports

Nullification reports void previously submitted cases that should not have been submitted.

**When to Nullify:**

| Reason | Description |
|--------|-------------|
| **Duplicate** | Same case was submitted multiple times |
| **Error** | Case was submitted in error |
| **Not an AE** | Event is not actually an adverse event |
| **Wrong Product** | Case involves a different product |
| **Consent Withdrawn** | Patient withdrew consent for reporting |

**Creating a Nullification:**

1. Open the submitted case to nullify
2. Click **Nullify** in the Actions menu
3. Select the nullification reason
4. If duplicate, enter the reference to the correct case
5. Click **Confirm Nullification**

The nullification report:
- Creates a new case version marked as nullified
- Contains the nullification reason
- Must be submitted to FDA to void the original

---

## 19. Batch Submission

Batch submission allows multiple cases to be bundled into a single E2B(R3) XML file for submission.

### 19.1 Batch Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Expedited** | Individual serious, unexpected cases | 15-day reports |
| **Non-Expedited** | Non-expedited cases for periodic reporting | General submissions |
| **PSR** | Cases included in a Periodic Safety Report | Bundled with PSR |

### 19.2 Creating a Batch

1. Navigate to **Batches** in the sidebar
2. Click **New Batch**
3. Follow the wizard steps:

**Step 1: Select Batch Type**
- Choose Expedited, Non-Expedited, or PSR
- For PSR batches, select the PSR to associate

**Step 2: Select Cases**
- Filter cases by status, date range, product
- Select cases to include using checkboxes
- Only approved cases can be added to batches

**Step 3: Validate**
- All selected cases are validated
- Review any validation errors
- Cases with errors must be fixed or removed

**Step 4: Create Batch**
- Review the batch summary
- Click **Create Batch**
- Batch is created with status "Created"

### 19.3 Batch Status Workflow

| Status | Description | Next Actions |
|--------|-------------|--------------|
| **Created** | Batch created, ready for validation | Validate |
| **Validated** | All cases pass validation | Export XML |
| **Exported** | XML file generated | Submit to FDA |
| **Submitted** | Sent to FDA ESG | Wait for ACK |
| **Acknowledged** | FDA acknowledged receipt | Close |
| **Failed** | Submission failed | Review, resubmit |

### 19.4 Exporting Batch XML

1. Open the batch
2. Click **Export XML**
3. Choose save location
4. The XML contains all cases in E2B(R3) format

**Batch XML Structure:**
- Single root element with batch header
- Multiple `<subject>` elements (one per case)
- Common sender/receiver information

### 19.5 Batch List View

The Batch List displays:
- Batch number
- Type (Expedited/Non-Expedited/PSR)
- Case count
- Status
- Created date
- Submitted date

Filter batches by:
- Status
- Type
- Date range
- Search by batch number

---

## 20. Periodic Safety Reports (PSR)

Periodic Safety Reports aggregate non-expedited cases for a defined reporting period.

### 20.1 PSR Formats

| Format | Full Name | Use Case |
|--------|-----------|----------|
| **PADER** | Post-Approval Adverse Drug Experience Report | US NDA/BLA products |
| **PSUR** | Periodic Safety Update Report | International harmonized format |
| **PBRER** | Periodic Benefit-Risk Evaluation Report | EU-style comprehensive report |

### 20.2 PSR Dashboard

Access the PSR Dashboard from the sidebar to view:

**Summary Statistics:**
- Overdue PSRs (highlighted in red)
- Due This Week
- In Progress (Draft/Under Review)
- Pending Cases (awaiting PSR assignment)

**Upcoming Deadlines:**
- Table of upcoming PSRs sorted by due date
- Color-coded due dates:
  - Red: Overdue
  - Yellow: Due within 7 days
  - Blue: Due within 30 days
  - Green: More than 30 days

**Status Overview:**
- Visual breakdown of PSRs by status
- Progress bars showing distribution

**Recent Activity:**
- Timeline of recent PSR actions
- Shows creation, transitions, submissions

### 20.3 PSR Status Workflow

| Status | Description | Next Actions |
|--------|-------------|--------------|
| **Scheduled** | Upcoming, not yet started | Start (move to Draft) |
| **Draft** | In preparation | Submit for Review |
| **Under Review** | Being reviewed | Approve or Return to Draft |
| **Approved** | Ready for submission | Submit to FDA |
| **Submitted** | Sent to FDA | Record Acknowledgment |
| **Acknowledged** | FDA confirmed receipt | Close |
| **Closed** | Period complete | None |

### 20.4 Creating a PSR

**Using the Wizard:**

1. Click **Create PSR** in the PSR Dashboard
2. Follow the wizard steps:

**Step 1: Select Product**
- Choose the product from dropdown
- Select the PSR schedule to use
- View the next period dates (auto-calculated)

**Step 2: Review Cases**
- See eligible cases for the period
- Cases are automatically aggregated based on:
  - Product match
  - Receipt date within period
  - Non-expedited classification
  - Approved status
- Review case count

**Step 3: Confirm**
- Review PSR summary
- Verify dates and case count
- Click **Create PSR**

**Step 4: Complete**
- PSR is created with status "Draft"
- PSR number assigned (format: PSR-PRODUCT-YYYY-NNN)
- Navigate to PSR detail to manage cases

### 20.5 Managing PSR Cases

**Included Cases Tab:**
- View all cases currently in the PSR
- Remove cases with exclusion reason

**Excluded Cases Tab:**
- View cases removed from the PSR
- Each shows exclusion reason
- Can re-include if needed

**Add Cases Tab:**
- Load eligible cases not yet in PSR
- Select cases to add
- Bulk add functionality

### 20.6 PSR Case Eligibility

Cases are eligible for a PSR if:
- Linked to the same product
- Receipt date falls within the PSR period
- Classification is Non-Expedited
- Workflow status is Approved or higher
- Not already included in another PSR

### 20.7 PSR Period Calculation

Periods are calculated based on schedule configuration:

| Frequency | Period Length |
|-----------|---------------|
| Quarterly | 3 months |
| Semi-Annual | 6 months |
| Annual | 12 months |
| Biennial | 24 months |

**Key Dates:**
- **Period Start**: Day after previous period end (or schedule start date)
- **Period End**: Start + frequency duration
- **Data Lock Point**: Period End - DLP Offset days
- **Due Date**: Period End + Due Offset days

### 20.8 PSR List View

View all PSRs with:
- PSR Number
- Product
- Format (PADER/PSUR/PBRER)
- Period (start - end)
- Due Date
- Status
- Case Count

**Filters:**
- Status
- Format
- Due date range
- Product
- Search by PSR number

### 20.9 Submitting a PSR

1. Ensure all cases are finalized
2. Transition PSR to "Approved"
3. Click **Generate Batch** to create submission batch
4. Export the batch XML
5. Submit via FDA ESG
6. Record acknowledgment when received
7. Close the PSR

---

## 21. Keyboard Shortcuts

### 21.1 General Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| New Case | `Ctrl+N` | `Cmd+N` |
| Save | `Ctrl+S` | `Cmd+S` |
| Validate | `Ctrl+Shift+V` | `Cmd+Shift+V` |
| Export XML | `Ctrl+E` | `Cmd+E` |
| Undo | `Ctrl+Z` | `Cmd+Z` |
| Redo | `Ctrl+Y` | `Cmd+Shift+Z` |

### 16.2 Navigation Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Report Section | `Ctrl+1` | `Cmd+1` |
| Reporter Section | `Ctrl+2` | `Cmd+2` |
| Sender Section | `Ctrl+3` | `Cmd+3` |
| Patient Section | `Ctrl+4` | `Cmd+4` |
| Reactions Section | `Ctrl+5` | `Cmd+5` |
| Drugs Section | `Ctrl+6` | `Cmd+6` |
| Narrative Section | `Ctrl+7` | `Cmd+7` |

### 16.3 Form Navigation

| Action | Shortcut |
|--------|----------|
| Next Field | `Tab` |
| Previous Field | `Shift+Tab` |
| Open Dropdown | `Space` or `Enter` |
| Select Date | `Enter` (in date picker) |

---

## 22. Troubleshooting

### 22.1 Login Issues

**Cannot log in with correct password:**
- Ensure Caps Lock is not on
- Check if account is locked (wait 30 minutes or contact admin)
- Try the "Remember username" option to avoid typos

**Account locked:**
- Wait 30 minutes for automatic unlock
- Contact your administrator for immediate unlock

### 22.2 Session Expired

**Session expired while working:**
- Your data is automatically saved before session expiry
- Log back in to continue where you left off
- Consider extending your session when the warning appears

### 22.3 Application Won't Start

**Symptoms**: Application fails to launch or crashes immediately.

**Solutions**:
1. Ensure your system meets minimum requirements
2. Try reinstalling the application
3. Check if antivirus is blocking the application
4. Delete the database file and restart (warning: loses all data)

### 22.4 Data Not Saving

**Symptoms**: Changes are lost after closing.

**Solutions**:
1. Check for disk space on your system drive
2. Ensure you have write permissions to the data directory
3. Click Save manually before closing
4. Check for "unsaved changes" indicator

### 22.5 Validation Always Fails

**Symptoms**: Cannot export XML due to persistent errors.

**Solutions**:
1. Review each error message carefully
2. Ensure all required fields are filled
3. Check date formats are correct
4. Verify at least one reaction and one suspect drug exist

### 22.6 XML Export Errors

**Symptoms**: XML generation fails or produces invalid file.

**Solutions**:
1. Run validation first and fix all errors
2. Ensure narrative doesn't contain special characters that need escaping
3. Check that all dates are in valid format
4. Try exporting to a different location

### 22.7 Performance Issues

**Symptoms**: Application is slow or unresponsive.

**Solutions**:
1. Close other applications to free memory
2. If case list is large, use filters to reduce displayed cases
3. Consider archiving old exported cases
4. Restart the application

### 22.8 Getting Help

If you continue to experience issues:

1. Check the application logs (Help > View Logs)
2. Note the exact error message
3. Document steps to reproduce the issue
4. Contact your IT support or the application vendor

---

## 23. Glossary

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
| **RBAC** | Role-Based Access Control |
| **Rechallenge** | Restarting a drug to see if adverse event recurs |
| **Serious AE** | Event resulting in death, hospitalization, disability, etc. |
| **Session** | Active login period; expires after inactivity |
| **Spontaneous Report** | Voluntary report from healthcare provider or consumer |
| **SRP** | Safety Reporting Portal |
| **Suspect Drug** | Medication believed to have caused the adverse event |
| **USP** | Universal Safety Portal (FDA's new submission system) |
| **21 CFR Part 11** | FDA regulation for electronic records and signatures |
| **Assignee** | User assigned to work on a case |
| **Audit Trail** | Chronological record of all system activities |
| **Batch Submission** | Multiple ICSRs bundled into a single XML file for submission |
| **Data Entry Complete** | Workflow state indicating data entry is finished |
| **Data Lock Point (DLP)** | Date after which no new data is added to a PSR period |
| **Electronic Signature** | Digital authentication for regulatory compliance |
| **Expedited Report** | Serious and unexpected AE requiring 15-day reporting |
| **Follow-Up Report** | Additional information about a previously submitted case |
| **Medical Review** | Clinical assessment of an adverse event case |
| **Non-Expedited Report** | AE not meeting expedited criteria, reported periodically |
| **Nullification** | Report that voids a previously submitted case |
| **PADER** | Post-Approval Adverse Drug Experience Report |
| **PBRER** | Periodic Benefit-Risk Evaluation Report |
| **PSR** | Periodic Safety Report - aggregates non-expedited cases |
| **PSUR** | Periodic Safety Update Report |
| **QC Review** | Quality control review before submission |
| **Workflow** | Defined sequence of states a case progresses through |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial release for Phase 1 MVP |
| 1.1 | January 2026 | Phase 2: Added FDA ESG NextGen USP submission workflow |
| 2.0 | January 2026 | Phase 3: Added multi-user authentication, RBAC, session management |
| 2.1 | January 2026 | Phase 3: Added workflow management, comments/notes, notifications, audit trail, user management documentation |
| 3.0 | January 2026 | Phase 4: Added report type classification, product management, follow-up/nullification reports, batch submission, PSR management with dashboard, creation wizard, and scheduling |

---

## Contact & Support

For technical support or feedback, please contact your system administrator or the application support team.

**Default Administrator Credentials** (change immediately after first login):
- Username: `admin`
- Password: `Admin@123456`

**FDA Resources**:
- [FAERS Electronic Submissions](https://www.fda.gov/drugs/fdas-adverse-event-reporting-system-faers/fda-adverse-event-reporting-system-faers-electronic-submissions)
- [E2B(R3) Implementation Guide](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/fda-regional-implementation-guide-e2br3)
- [FDA ESG NextGen](https://www.fda.gov/industry/electronic-submissions-gateway)
