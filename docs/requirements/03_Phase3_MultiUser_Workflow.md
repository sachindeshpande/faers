# Phase 3: Multi-User & Workflow Management

## Requirements Specification for Claude Code

**Version:** 1.0  
**Phase:** 3 of 12  
**Estimated Duration:** 2-3 months  
**Prerequisites:** Phase 1 and Phase 2 completed

---

## 1. Phase Overview

### 1.1 Objective

Transform the single-user application into a multi-user system with authentication, role-based access control, and case workflow management. This phase enables teams to collaborate on case processing with proper oversight, approval workflows, and audit trails required for regulatory compliance.

### 1.2 Success Criteria

- [ ] Users can log in with individual accounts
- [ ] Roles control what actions users can perform
- [ ] Cases follow configurable approval workflows
- [ ] Due dates are tracked with notifications
- [ ] Complete audit trail of all user actions
- [ ] Compliance with 21 CFR Part 11 requirements

### 1.3 Out of Scope for Phase 3

- MedDRA auto-coding (Phase 5)
- Drug dictionary integration (Phase 5)
- Batch submissions (Phase 4)
- External system integrations (Phase 5+)
- Advanced analytics (Phase 8)

### 1.4 Dependencies

- **Phase 1 Complete**: Core case management and data model
- **Phase 2 Complete**: Submission tracking and status management

---

## 2. Background Information

### 2.1 Regulatory Context

Pharmacovigilance systems handling safety data must comply with:

- **21 CFR Part 11**: FDA regulations for electronic records and signatures
  - Unique user identification
  - Audit trails
  - Access controls
  - Electronic signatures
  
- **ICH E2B(R3)**: Requires tracking of who created/modified reports

- **GVP Module VI**: EU guidelines for pharmacovigilance data management

### 2.2 Typical Pharmacovigilance Team Roles

| Role | Responsibilities |
|------|------------------|
| **Data Entry Specialist** | Creates cases, enters initial data |
| **Medical Reviewer** | Reviews medical accuracy, adds assessments |
| **QC Reviewer** | Quality check before submission |
| **Regulatory Submitter** | Final approval and submission to authorities |
| **Administrator** | User management, system configuration |
| **Manager** | Oversight, reporting, workload management |

### 2.3 Typical Case Workflow

```
Intake → Data Entry → Medical Review → QC Review → Approval → Submission
```

Each step may involve:
- Assignment to specific user
- Review and modification
- Approval or rejection (return for rework)
- Comments and notes
- Due date tracking

---

## 3. Functional Requirements

### 3.1 User Authentication

#### REQ-AUTH-001: User Login
```
As a user
I want to log in with my credentials
So that I can access the system securely

Acceptance Criteria:
- Login screen with username and password fields
- Secure password transmission and storage
- Login attempt logging (success and failure)
- Account lockout after configurable failed attempts (default: 5)
- Session timeout after inactivity (configurable, default: 30 minutes)
- "Remember me" option for username only (not password)
- Password requirements enforced (see REQ-AUTH-003)
```

#### REQ-AUTH-002: User Logout
```
As a user
I want to log out of the system
So that my session is securely ended

Acceptance Criteria:
- Logout option in menu/toolbar
- Confirmation if unsaved changes exist
- Session terminated on server
- Return to login screen
- Automatic logout on session timeout with warning
```

#### REQ-AUTH-003: Password Policy
```
As the system
I need to enforce password security
So that accounts are protected

Password Requirements (configurable):
- Minimum length: 12 characters
- Must contain: uppercase, lowercase, number, special character
- Cannot match previous N passwords (default: 5)
- Maximum age: 90 days (configurable)
- Cannot contain username

Acceptance Criteria:
- Requirements displayed during password creation/change
- Real-time validation feedback
- Clear error messages for non-compliant passwords
- Password expiration warning (14, 7, 3 days before)
- Forced password change when expired
```

#### REQ-AUTH-004: Password Reset
```
As a user
I want to reset my forgotten password
So that I can regain access to my account

Acceptance Criteria:
- "Forgot Password" link on login screen
- Request reset via email or admin assistance
- Secure reset token with expiration (24 hours)
- Force password change on next login after reset
- Notification of password change to user email
- Audit log entry for password reset
```

#### REQ-AUTH-005: Session Management
```
As the system
I need to manage user sessions
So that security is maintained

Acceptance Criteria:
- Single active session per user (configurable)
- Session timeout after inactivity
- Warning before timeout (5 minutes prior)
- Option to extend session
- Forced logout capability for administrators
- Session information logged (login time, IP, device)
```

### 3.2 User Management

#### REQ-USER-001: Create User Account
```
As an administrator
I want to create user accounts
So that team members can access the system

User Account Fields:
- Username (unique, cannot be changed)
- Email address (unique)
- First name, Last name
- Role assignment (one or more roles)
- Active/Inactive status
- Temporary password (must change on first login)

Acceptance Criteria:
- Only administrators can create users
- Username and email uniqueness enforced
- At least one role must be assigned
- Temporary password generated or set by admin
- Welcome email sent with login instructions
- Audit log entry for user creation
```

#### REQ-USER-002: Edit User Account
```
As an administrator
I want to modify user accounts
So that I can update information and access

Editable Fields:
- Email address
- First name, Last name
- Role assignments
- Active/Inactive status

Acceptance Criteria:
- Only administrators can edit users
- Cannot edit own role (prevents privilege escalation)
- Changes logged in audit trail
- User notified of role changes via email
```

#### REQ-USER-003: Deactivate User Account
```
As an administrator
I want to deactivate user accounts
So that former team members cannot access the system

Acceptance Criteria:
- Deactivate option (not delete - preserves audit history)
- Confirmation required
- Active sessions terminated immediately
- Deactivated users cannot log in
- User's assigned cases reassigned or flagged
- Audit log entry for deactivation
- Option to reactivate later
```

#### REQ-USER-004: User Profile
```
As a user
I want to view and edit my profile
So that my information is current

User Can Edit:
- Email address (with verification)
- Password
- Notification preferences
- Display preferences (timezone, date format)

User Can View (not edit):
- Username
- Assigned roles
- Account creation date
- Last login date

Acceptance Criteria:
- Profile accessible from menu
- Password change requires current password
- Email change requires verification
- Changes logged in audit trail
```

### 3.3 Role-Based Access Control (RBAC)

#### REQ-RBAC-001: Role Definition
```
As an administrator
I want to define roles with specific permissions
So that access is properly controlled

Default Roles:
1. Administrator
   - All permissions
   - User management
   - System configuration
   
2. Manager
   - View all cases
   - Assign cases
   - Run reports
   - Cannot submit to FDA
   
3. Data Entry
   - Create new cases
   - Edit assigned cases
   - Submit for review
   - Cannot approve or submit to FDA
   
4. Medical Reviewer
   - View assigned cases
   - Add medical assessments
   - Approve or reject cases
   - Cannot submit to FDA
   
5. QC Reviewer
   - View assigned cases
   - Perform quality review
   - Approve or reject cases
   - Cannot submit to FDA
   
6. Submitter
   - View approved cases
   - Submit to FDA
   - Record acknowledgments
   
7. Read Only
   - View cases only
   - Cannot edit or submit

Acceptance Criteria:
- Default roles pre-configured
- Administrators can create custom roles
- Roles can be modified (except Administrator)
- Role changes take effect immediately
- Role deletion prevented if users assigned
```

#### REQ-RBAC-002: Permission Types
```
As the system
I need granular permissions
So that access can be precisely controlled

Permission Categories:

Case Permissions:
- case.create: Create new cases
- case.view.own: View own/assigned cases
- case.view.all: View all cases
- case.edit.own: Edit own/assigned cases
- case.edit.all: Edit any case
- case.delete: Delete cases
- case.assign: Assign cases to users

Workflow Permissions:
- workflow.submit_review: Submit case for review
- workflow.approve: Approve cases
- workflow.reject: Reject cases (return for rework)
- workflow.submit_fda: Submit to FDA

User Permissions:
- user.view: View user list
- user.create: Create users
- user.edit: Edit users
- user.deactivate: Deactivate users

System Permissions:
- system.configure: System settings
- system.audit.view: View audit logs
- system.reports: Run reports

Acceptance Criteria:
- Permissions enforced at UI level (hide/disable)
- Permissions enforced at API/service level
- Permission check logged for denied actions
- Administrators have all permissions
```

#### REQ-RBAC-003: Role Assignment
```
As an administrator
I want to assign roles to users
So that they have appropriate access

Acceptance Criteria:
- Users can have multiple roles
- Permissions are cumulative across roles
- Role changes effective immediately
- User notified of role changes
- Role assignment logged in audit trail
```

### 3.4 Case Assignment and Ownership

#### REQ-ASSIGN-001: Case Assignment
```
As a manager
I want to assign cases to team members
So that work is distributed appropriately

Acceptance Criteria:
- Cases can be assigned to any active user
- Assignment includes:
  - Assigned user
  - Assignment date
  - Due date (optional)
  - Priority (optional)
  - Notes (optional)
- Assigned user notified (in-app and/or email)
- Assignment recorded in case history
- Cases can be reassigned at any time
```

#### REQ-ASSIGN-002: Case Ownership
```
As the system
I need to track case ownership
So that responsibilities are clear

Ownership Model:
- Creator: User who created the case
- Current Owner: User currently responsible
- Current Assignee: User assigned for current workflow step

Acceptance Criteria:
- Creator recorded and immutable
- Owner changes with assignment
- Assignment history maintained
- Owner can reassign if permitted
- Unassigned cases visible to managers
```

#### REQ-ASSIGN-003: My Cases View
```
As a user
I want to see cases assigned to me
So that I can focus on my work

Acceptance Criteria:
- "My Cases" view as default landing page
- Shows cases where user is current assignee
- Sorted by due date (most urgent first)
- Filter options (status, priority, overdue)
- Quick actions for common tasks
- Count badges showing case numbers by status
```

#### REQ-ASSIGN-004: Workload View
```
As a manager
I want to see team workload distribution
So that I can balance assignments

Acceptance Criteria:
- View showing all users and their case counts
- Breakdown by status and priority
- Identification of overloaded users
- Identification of unassigned cases
- Quick reassignment from this view
```

### 3.5 Workflow Management

#### REQ-WF-001: Workflow States
```
As the system
I need to manage case workflow states
So that cases follow proper review process

Workflow States:
1. Draft: Initial data entry in progress
2. Data Entry Complete: Ready for review
3. In Medical Review: Assigned to medical reviewer
4. Medical Review Complete: Passed medical review
5. In QC Review: Assigned to QC reviewer
6. QC Complete: Passed QC review
7. Approved: Ready for submission
8. Submitted: Sent to FDA (from Phase 2)
9. Acknowledged: FDA confirmed receipt
10. Rejected: Returned for rework (can occur from multiple states)

Acceptance Criteria:
- Clear status displayed throughout UI
- Status history maintained
- Only valid transitions allowed
- Transition permissions enforced by role
```

#### REQ-WF-002: Workflow Transitions
```
As a user
I want to move cases through workflow
So that they progress toward submission

Transitions and Required Permissions:

Draft → Data Entry Complete
- Permission: workflow.submit_review
- Requires: Validation passes

Data Entry Complete → In Medical Review
- Permission: case.assign
- Requires: Assignment to medical reviewer

In Medical Review → Medical Review Complete
- Permission: workflow.approve
- Requires: User is assigned medical reviewer

In Medical Review → Rejected
- Permission: workflow.reject
- Requires: Rejection reason provided

Medical Review Complete → In QC Review
- Permission: case.assign
- Requires: Assignment to QC reviewer

In QC Review → QC Complete
- Permission: workflow.approve
- Requires: User is assigned QC reviewer

In QC Review → Rejected
- Permission: workflow.reject
- Requires: Rejection reason provided

QC Complete → Approved
- Permission: workflow.approve
- Requires: Final approval confirmation

Approved → Submitted
- Permission: workflow.submit_fda
- Requires: Export/submission completed

Rejected → Draft
- Automatic when assignee starts rework

Acceptance Criteria:
- Transition buttons shown based on current state and permissions
- Required conditions checked before transition
- Comments can be added at each transition
- All transitions logged in audit trail
```

#### REQ-WF-003: Workflow Actions
```
As a reviewer
I want to take action on cases in my queue
So that I can complete my review tasks

Actions:
- Approve: Move case forward in workflow
- Reject: Return case for rework with reason
- Request Info: Ask for additional information
- Reassign: Transfer to another reviewer
- Add Comment: Add note without changing status

Acceptance Criteria:
- Actions available based on role and state
- Rejection requires reason (mandatory comment)
- Request Info notifies case owner
- All actions logged with timestamp and user
```

#### REQ-WF-004: Rejection Handling
```
As a data entry user
I want to see why my case was rejected
So that I can make corrections

Acceptance Criteria:
- Rejection reason displayed prominently
- Rejection history visible (all past rejections)
- Case returns to Draft status
- Assignee can edit and resubmit
- Resubmission follows same workflow
- Rejection count tracked (quality metric)
```

### 3.6 Due Date Management

#### REQ-DUE-001: Due Date Tracking
```
As the system
I need to track case due dates
So that expedited reports are submitted on time

Due Date Types:
- Expedited (15 calendar days from awareness)
- Non-expedited (90 calendar days)
- Custom (user-specified)

Due Date Calculation:
- Based on initial receipt date
- Adjusted for report type and seriousness
- Can be manually overridden with reason

Acceptance Criteria:
- Due date calculated automatically based on case data
- Due date displayed throughout application
- Manual override requires comment
- Override logged in audit trail
```

#### REQ-DUE-002: Due Date Notifications
```
As a user
I want to be notified about upcoming due dates
So that I don't miss submission deadlines

Notification Triggers:
- 7 days before due date
- 3 days before due date
- 1 day before due date
- On due date
- Overdue (daily until resolved)

Notification Methods:
- In-app notification badge/banner
- Email notification (configurable)

Acceptance Criteria:
- Notification preferences configurable per user
- Notifications sent to assigned user
- Manager notified for overdue cases
- Notification history viewable
- Bulk notification for managers (summary)
```

#### REQ-DUE-003: Overdue Handling
```
As a manager
I want visibility into overdue cases
So that I can take corrective action

Acceptance Criteria:
- Overdue cases highlighted in all views
- Overdue count on dashboard
- Overdue report available
- Escalation notification to managers
- Reason required if submitted late
- Late submission tracked as quality metric
```

### 3.7 Comments and Notes

#### REQ-COMMENT-001: Case Comments
```
As a user
I want to add comments to cases
So that I can communicate with the team

Acceptance Criteria:
- Comments can be added at any time
- Comment includes:
  - Text content
  - Timestamp
  - Author
  - Comment type (general, query, response)
- Comments displayed chronologically
- Comments cannot be edited or deleted (audit compliance)
- @mention to notify specific users
- Comments visible to all users with case access
```

#### REQ-COMMENT-002: Internal Notes
```
As a user
I want to add private notes to cases
So that I can record information not for the report

Acceptance Criteria:
- Notes separate from comments
- Notes not included in FDA submission
- Notes can be marked as:
  - Personal (visible only to author)
  - Team (visible to all users)
- Notes include timestamp and author
- Notes cannot be deleted (can be marked resolved)
```

### 3.8 Audit Trail

#### REQ-AUDIT-001: Comprehensive Audit Trail
```
As the system
I need to record all user actions
So that regulatory compliance is maintained

Audited Events:
- User login/logout
- Case creation, modification, deletion
- Field-level changes (old value → new value)
- Status transitions
- Assignments
- Comments and notes
- Workflow actions (approve, reject)
- Submissions
- Report generation
- User management actions
- Configuration changes

Audit Entry Contents:
- Timestamp (UTC)
- User ID and name
- Action type
- Entity affected (case ID, user ID, etc.)
- Details (field changed, old/new values)
- IP address
- Session ID

Acceptance Criteria:
- All audited events captured automatically
- Audit trail is append-only (cannot modify or delete)
- Audit data stored separately from application data
- Retention per regulatory requirements (minimum 10 years)
```

#### REQ-AUDIT-002: Audit Trail Viewing
```
As an administrator or auditor
I want to view the audit trail
So that I can investigate activities

Acceptance Criteria:
- Audit log viewer accessible to authorized users
- Filter by:
  - Date range
  - User
  - Action type
  - Entity (case ID)
- Search within audit entries
- Export to CSV or PDF
- Case-specific audit view (all events for one case)
- User-specific audit view (all events by one user)
```

#### REQ-AUDIT-003: Electronic Signatures (21 CFR Part 11)
```
As the system
I need to support electronic signatures
So that approvals meet regulatory requirements

Signature Requirements:
- Required for: Final approval, FDA submission
- Signature consists of:
  - Username
  - Password (re-authentication)
  - Meaning of signature (e.g., "I approve this case for submission")
  - Timestamp
- Signature linked to specific record version

Acceptance Criteria:
- Re-authentication required for signature
- Meaning of signature displayed and recorded
- Signed records cannot be modified without new signature
- Signature visible in case history
- Signature included in audit trail
```

---

## 4. User Interface Requirements

### 4.1 Authentication Interface

#### REQ-UI-AUTH-001: Login Screen
```
Login screen elements:
- Application logo and name
- Username field
- Password field
- "Remember username" checkbox
- Login button
- "Forgot Password" link
- Error messages for failed login
- Account lockout message when applicable
```

#### REQ-UI-AUTH-002: Session Timeout Warning
```
When session is about to expire:
- Modal dialog warning
- Time remaining countdown
- "Extend Session" button
- "Logout" button
- Auto-logout when timer reaches zero
```

### 4.2 User Management Interface

#### REQ-UI-USER-001: User List
```
User management screen:
- Table of all users
- Columns: Username, Name, Email, Roles, Status, Last Login
- Search and filter
- "Add User" button
- Edit and Deactivate actions per row
- Pagination for large user lists
```

#### REQ-UI-USER-002: User Form
```
User create/edit form:
- Username (create only)
- Email
- First name, Last name
- Role checkboxes or multi-select
- Active/Inactive toggle
- Save and Cancel buttons
- Validation messages
```

### 4.3 Case Workflow Interface

#### REQ-UI-WF-001: Workflow Status Display
```
Case detail view shows:
- Current workflow state prominently
- Progress indicator showing workflow steps
- Available actions as buttons
- Assignment information
- Due date with countdown/overdue indicator
```

#### REQ-UI-WF-002: Action Dialogs
```
When taking workflow action:
- Confirmation dialog
- Required comment field (for reject)
- Optional comment field (for approve)
- Signature fields (for final approval/submission)
- Submit and Cancel buttons
```

#### REQ-UI-WF-003: Case History Panel
```
Case history view shows:
- Timeline of all events
- Status changes with before/after
- Assignments
- Comments and notes
- Workflow actions with comments
- Filter by event type
- Expand/collapse details
```

### 4.4 Dashboard Interface

#### REQ-UI-DASH-001: User Dashboard
```
Default view after login:

My Work section:
- Cases assigned to me (count by status)
- Overdue cases (highlighted)
- Approaching due date (next 7 days)
- Quick links to My Cases, Recently Viewed

Notifications section:
- Unread notifications
- Mark as read option
- Link to full notification list

Quick Actions:
- New Case button
- Recently opened cases
```

#### REQ-UI-DASH-002: Manager Dashboard
```
For users with manager role:

Team Overview:
- Total cases by status
- Overdue cases count
- Unassigned cases count
- Team workload summary

Metrics:
- Cases processed this week/month
- Average time in each workflow state
- Rejection rate

Quick Actions:
- Assign cases
- View team workload
- Run reports
```

### 4.5 Notifications Interface

#### REQ-UI-NOTIF-001: Notification Center
```
Notification features:
- Bell icon with unread count badge
- Dropdown showing recent notifications
- Each notification shows:
  - Icon indicating type
  - Brief message
  - Timestamp
  - Link to related case
- Mark as read (individual and all)
- Link to full notification history
```

---

## 5. Non-Functional Requirements

### 5.1 Security

- Passwords hashed with strong algorithm (bcrypt, Argon2)
- Passwords never logged or displayed
- Secure session management
- HTTPS for all communications (when networked)
- Role-based access enforced at all layers
- Failed login attempts logged and monitored
- Automatic session termination on security events

### 5.2 Performance

| Metric | Requirement |
|--------|-------------|
| Login time | < 2 seconds |
| User list load | < 2 seconds for 100 users |
| Audit log query | < 5 seconds for 10,000 entries |
| Permission check | < 100 milliseconds |

### 5.3 Compliance

- 21 CFR Part 11 compliant audit trail
- Electronic signature capability
- User identification and accountability
- Data integrity controls
- Audit trail retention (configurable, default 10 years)

### 5.4 Scalability

- Support for up to 50 concurrent users (initial)
- Support for up to 100 user accounts
- Database design supports growth

---

## 6. Configuration Requirements

#### REQ-CONFIG-001: System Settings
```
Administrator-configurable settings:

Security:
- Password minimum length
- Password complexity requirements
- Password expiration days
- Failed login lockout threshold
- Session timeout minutes
- Single session enforcement

Workflow:
- Enable/disable workflow states
- Default due date rules
- Notification timing (days before due)

Notifications:
- Email server configuration
- Notification templates
- Enable/disable email notifications
```

---

## 7. Data Migration

#### REQ-MIGRATE-001: Single-User to Multi-User Migration
```
When upgrading from Phase 1/2:
- Create default administrator account
- Migrate existing cases to new schema
- Assign existing cases to admin user
- Preserve all existing audit history
- Set all cases to current workflow state based on status
```

---

## 8. Testing Requirements

### 8.1 Test Scenarios

Authentication:
- Login with valid credentials
- Login with invalid credentials
- Account lockout after failed attempts
- Password change flow
- Password reset flow
- Session timeout behavior

Authorization:
- Access granted for permitted actions
- Access denied for unpermitted actions
- Role changes take effect immediately
- Multiple roles combine permissions

Workflow:
- Complete workflow from draft to acknowledged
- Rejection and rework cycle
- Due date calculation
- Notification triggers
- Assignment and reassignment

Audit:
- All actions logged
- Audit entries cannot be modified
- Audit trail queryable and exportable
- Electronic signature captured

### 8.2 Compliance Testing

- 21 CFR Part 11 checklist verification
- Audit trail completeness
- Electronic signature workflow
- Data integrity verification

---

## 9. Acceptance Criteria Summary

### 9.1 Must Have
- [ ] User authentication (login, logout, password management)
- [ ] Role-based access control with default roles
- [ ] Permission enforcement (UI and service level)
- [ ] Case assignment to users
- [ ] Basic workflow (Draft → Review → Approved → Submitted)
- [ ] Workflow actions (approve, reject)
- [ ] Due date tracking
- [ ] Comprehensive audit trail
- [ ] Electronic signatures for approvals
- [ ] User management (create, edit, deactivate)

### 9.2 Should Have
- [ ] Custom role creation
- [ ] Due date notifications (in-app)
- [ ] Email notifications
- [ ] Manager dashboard with metrics
- [ ] Workload view
- [ ] Session timeout warning
- [ ] Password expiration

### 9.3 Nice to Have
- [ ] @mention in comments
- [ ] Configurable workflow states
- [ ] SSO integration preparation
- [ ] Mobile-responsive design

---

## 10. References

- [21 CFR Part 11](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11) - Electronic Records; Electronic Signatures
- [FDA Guidance for Industry: Part 11](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [ICH E2B(R3) Implementation Guide](https://www.ich.org/page/e2br3-electronic-transmission-individual-case-safety-reports-icsrs-implementation-guide)
- Phase 1 Requirements: `01_Phase1_Core_ICSR_MVP.md`
- Phase 2 Requirements: `02_Phase2_ESG_USP_Submission.md`
- Application Overview: `00_FAERS_Application_Overview.md`

---

## Next Phase

After completing Phase 3, proceed to **Phase 4: Batch Submissions & PSRs** which adds:
- Batch submission of multiple cases
- Periodic Safety Reports (PSURs/PADERs)
- Submission scheduling
- Aggregate reporting
