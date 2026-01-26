# Phase 2B: ESG NextGen API Integration

## Requirements Specification for Claude Code

**Version:** 2.0  
**Phase:** 2B of 12 (Optional, implement when ready for automated submission)  
**Estimated Duration:** 4-6 weeks  
**Prerequisites:** Phase 1 and Phase 2 completed, FDA ESG NextGen account obtained

---

## 1. Phase Overview

### 1.1 Objective

Extend the application to enable direct automated electronic submission of ICSRs to the FDA through the ESG NextGen API. This phase replaces the manual SRP upload workflow (Phase 2) with automated API-based transmission, acknowledgment retrieval, and retry capabilities.

### 1.2 Why ESG NextGen API (Not AS2)

| Aspect | AS2 (Legacy) | ESG NextGen API (Recommended) |
|--------|--------------|-------------------------------|
| FDA Status | "Legacy technology" | Recommended modernization path |
| Certificates | Required (complex setup) | Not required |
| Infrastructure | AS2 gateway software needed | Standard HTTPS REST calls |
| Implementation | Complex protocol | Simple REST API |
| Maintenance | Certificate renewals, AS2 software | Standard API maintenance |

FDA explicitly recommends the API approach for new implementations.

### 1.3 Success Criteria

- [ ] Application can authenticate with FDA ESG NextGen API
- [ ] Users can submit cases directly to FDA with one click
- [ ] System automatically retrieves FDA acknowledgments (ACK/NACK)
- [ ] Failed submissions can be retried automatically
- [ ] API credentials are securely stored
- [ ] Seamless upgrade path from Phase 2 SRP workflow

### 1.4 Out of Scope for Phase 2B

- Multi-user support and workflow approval (Phase 3)
- Batch submission of multiple cases (Phase 4)
- Periodic Safety Reports (PSRs) (Phase 4)
- User authentication/login (Phase 3)
- AS2 protocol support (legacy, not recommended)

### 1.5 Dependencies

- **Phase 1 Complete**: Core case management, data entry, validation, XML generation
- **Phase 2 Complete**: Status tracking, submission history, dashboard (reused)
- **FDA ESG NextGen Account**: Registered and approved (see FDA_ESG_Registration_Guide.md)
- **API Credentials**: Client ID and Secret Key from ESG NextGen

### 1.6 When to Implement Phase 2B

Implement this phase when:
- Submission volume makes manual SRP upload inefficient
- FDA ESG NextGen account has been obtained
- API credentials have been generated
- Organization wants automated submission capability

---

## 2. Background Information

### 2.1 FDA ESG NextGen API

The ESG NextGen API is FDA's modern REST API for electronic submissions:

- Standard HTTPS REST endpoints
- OAuth 2.0 authentication
- JSON metadata with XML file upload
- Asynchronous acknowledgment retrieval
- No digital certificates required

### 2.2 API Environments

| Environment | Purpose | Base URL |
|-------------|---------|----------|
| **Test** | Development and validation | https://api.esg-test.fda.gov |
| **Production** | Live submissions | https://api.esg.fda.gov |

### 2.3 API Authentication

ESG NextGen uses OAuth 2.0 Client Credentials flow:

1. Application sends Client ID + Secret Key
2. API returns access token
3. Access token used for subsequent requests
4. Token expires after set period (refresh as needed)

### 2.4 Submission Flow

```
1. Authenticate → Get OAuth access token
2. Create Submission → Initialize submission with metadata
3. Upload File → Upload E2B(R3) XML
4. Submit → Finalize and send to FDA
5. Poll Status → Check for acknowledgment
6. Retrieve ACK → Download acknowledgment details
```

### 2.5 Acknowledgment Types

| Type | Meaning |
|------|---------|
| **ACK1** | Message received and syntactically valid |
| **ACK2** | Message processed and accepted |
| **ACK3** | Message loaded into FAERS database |
| **NACK** | Message rejected with error details |

---

## 3. Functional Requirements

### 3.1 API Configuration

#### REQ-API-001: API Credential Setup
```
As a user
I want to configure my ESG NextGen API credentials
So that the application can submit to FDA on my behalf

Acceptance Criteria:
- Settings screen allows entry of API credentials:
  - Client ID
  - Secret Key (masked input)
- User can select environment (Test or Production)
- Credentials stored securely (encrypted)
- "Test Connection" verifies credentials work
- Clear error message if credentials invalid
```

#### REQ-API-002: Credential Security
```
As the system
I need to protect API credentials
So that they cannot be compromised

Acceptance Criteria:
- Secret Key never stored in plain text
- Use OS-level secure storage where available
- Secret Key never logged or displayed after entry
- Credentials encrypted at rest
- Clear credentials from memory after use
```

#### REQ-API-003: Sender Configuration
```
As a user
I want to configure sender information
So that submissions are properly identified

Acceptance Criteria:
- Configure sender details used in submissions:
  - Company name
  - Contact name
  - Contact email
- Settings saved and persisted
- Used as defaults for all submissions
```

### 3.2 Authentication

#### REQ-AUTH-001: OAuth Authentication
```
As the system
I need to authenticate with FDA ESG NextGen API
So that I can make authorized API calls

Acceptance Criteria:
- Request OAuth access token using Client Credentials flow
- Handle token expiration and refresh
- Retry authentication on token errors
- Log authentication events (success/failure, no credentials logged)
- Cache valid token to avoid unnecessary auth requests
```

#### REQ-AUTH-002: Connection Testing
```
As a user
I want to test my API connection
So that I can verify setup before submitting

Acceptance Criteria:
- "Test Connection" button in settings
- Attempts authentication with configured credentials
- On success: Display "Connection successful" message
- On failure: Display specific error (invalid credentials, network error, etc.)
- Test does not create any submissions
```

### 3.3 Submission Workflow

#### REQ-SUB-001: Extended Case Status
```
Extend case status to support API submission workflow:

New/Modified Status Values:
- Ready for Submission (from Phase 2)
- Submitting: API submission in progress
- Submitted: Successfully sent, awaiting acknowledgment
- Acknowledged: FDA confirmed receipt (ACK received)
- Submission Failed: API error or NACK received

Status Transitions:
- Ready for Submission → Submitting: When user initiates submission
- Submitting → Submitted: When API confirms receipt
- Submitting → Submission Failed: When API returns error
- Submitted → Acknowledged: When ACK retrieved
- Submitted → Submission Failed: When NACK retrieved
- Submission Failed → Ready for Submission: When user retries
```

#### REQ-SUB-002: Submit Case via API
```
As a user
I want to submit a case to FDA via the API
So that I can automate the submission process

Acceptance Criteria:
- "Submit to FDA" action available for "Ready for Submission" cases
- Pre-submission confirmation dialog shows:
  - Case summary
  - Target environment (Test/Production) with warning for Production
  - Confirmation checkbox
- On confirmation:
  1. Authenticate with API
  2. Create submission record
  3. Upload E2B(R3) XML file
  4. Finalize submission
  5. Update status to "Submitted"
  6. Record submission ID/Core ID from FDA
- Display progress during submission
- On success: Show success message with FDA reference ID
- On failure: Show error details with suggested action
```

#### REQ-SUB-003: Submission Progress
```
As a user
I want to see submission progress
So that I know what's happening

Acceptance Criteria:
- Progress dialog during submission showing:
  - Current step (Authenticating, Creating submission, Uploading, Finalizing)
  - Progress indicator
  - Elapsed time
- Steps update in real-time
- Cancel option (if supported by API)
- Final result displayed before closing
```

### 3.4 Acknowledgment Retrieval

#### REQ-ACK-001: Poll for Acknowledgments
```
As the system
I need to check for FDA acknowledgments
So that submission status is updated

Acceptance Criteria:
- Background process polls API for acknowledgments
- Configurable polling interval (default: 5 minutes)
- Only poll when cases are in "Submitted" status
- Stop polling for a case after timeout (default: 48 hours)
- Parse acknowledgment response:
  - Type (ACK1, ACK2, ACK3, NACK)
  - FDA Core ID
  - Timestamp
  - Error details (for NACK)
- Update case status based on acknowledgment
- Store full acknowledgment for audit
```

#### REQ-ACK-002: Manual Acknowledgment Check
```
As a user
I want to manually check for acknowledgments
So that I don't have to wait for automatic polling

Acceptance Criteria:
- "Check for Acknowledgment" button for submitted cases
- Immediately queries API for acknowledgment
- Updates case status if acknowledgment found
- Displays result to user
```

#### REQ-ACK-003: Acknowledgment Display
```
As a user
I want to view acknowledgment details
So that I can verify FDA received my submission

Acceptance Criteria:
- Acknowledgment details displayed in case view:
  - Acknowledgment type and timestamp
  - FDA Core ID / Message ID
  - Status description
- For NACK: Display error code, message, affected elements
- Option to view raw acknowledgment data
- Option to export acknowledgment as PDF
```

### 3.5 Error Handling and Retry

#### REQ-ERR-001: API Error Handling
```
As the system
I need to handle API errors gracefully
So that users understand what went wrong

Error Categories:

Authentication Errors:
- Invalid credentials
- Expired token
- Action: Re-authenticate or prompt user to check credentials

Network Errors:
- Connection timeout
- Connection refused
- DNS resolution failure
- Action: Retry with backoff, then notify user

API Errors:
- Rate limiting (429)
- Server error (5xx)
- Action: Retry with backoff

Validation Errors:
- Invalid XML
- Missing required fields
- Action: Display details, require user correction

Acceptance Criteria:
- Categorize errors appropriately
- Display user-friendly error messages
- Log technical details for debugging
- Suggest corrective action based on error type
```

#### REQ-ERR-002: Automatic Retry
```
As the system
I need to automatically retry transient failures
So that temporary issues don't require user intervention

Acceptance Criteria:
- Automatically retry on transient errors (network, rate limit, server errors)
- Exponential backoff between retries (e.g., 1s, 2s, 4s, 8s)
- Maximum retry attempts (configurable, default: 3)
- Log each retry attempt
- After max retries, mark as failed and notify user
```

#### REQ-ERR-003: Manual Retry
```
As a user
I want to retry a failed submission
So that I can recover from errors

Acceptance Criteria:
- "Retry" action for cases in "Submission Failed" status
- Show previous error details before retry
- Show retry attempt count
- Follow same submission flow
- After configurable max total attempts, require return to Draft
```

### 3.6 Submission History

#### REQ-HIST-001: API Submission History
```
As a user
I want to view API submission history
So that I can track all submission activity

Acceptance Criteria:
- History includes all API interactions:
  - Submission attempts (with FDA reference ID)
  - Acknowledgment retrievals
  - Errors and retries
- Each entry shows:
  - Timestamp
  - Event type
  - Status/result
  - FDA reference IDs
  - Error details (if applicable)
- History is immutable
- Export option (PDF, CSV)
```

#### REQ-HIST-002: Dashboard Updates
```
As a user
I want the dashboard to reflect API submission status
So that I can monitor submissions at a glance

Acceptance Criteria:
- Dashboard shows:
  - Cases pending submission
  - Cases awaiting acknowledgment
  - Recent acknowledgments
  - Failed submissions needing attention
- Real-time updates when acknowledgments received
- Click to navigate to relevant cases
```

### 3.7 Fallback to Manual Submission

#### REQ-FALL-001: SRP Export Fallback
```
As a user
I want to fall back to manual SRP submission if API fails
So that I can still submit even if there are API issues

Acceptance Criteria:
- "Export for SRP" option remains available
- Can export even if API submission failed
- Clear indication this is manual fallback
- Phase 2 manual workflow still fully functional
```

---

## 4. User Interface Requirements

### 4.1 API Settings Screen

#### REQ-UI-API-001: Settings Interface
```
API Settings screen includes:

Credentials Section:
- Environment selector (Test / Production)
- Client ID field
- Secret Key field (masked, with show/hide toggle)
- "Test Connection" button
- Connection status indicator

Sender Section:
- Company name
- Contact name
- Contact email

Polling Section:
- Polling interval (minutes)
- Polling timeout (hours)
- Maximum retry attempts

Actions:
- Save button
- Cancel button
- Clear credentials button (with confirmation)
```

### 4.2 Submission Interface

#### REQ-UI-SUB-001: Submit Button and Confirmation
```
For Ready for Submission cases:
- "Submit to FDA" button (prominent)
- "Export for SRP" button (secondary, fallback option)

Confirmation dialog:
- Case summary
- Environment with warning for Production
- Confirmation checkbox
- Submit and Cancel buttons
```

#### REQ-UI-SUB-002: Submission Progress Dialog
```
During submission:
- Modal dialog with progress steps:
  ✓ Authenticating with FDA
  ✓ Creating submission
  ● Uploading case data...
  ○ Finalizing submission
- Progress bar or spinner
- Elapsed time
- Cancel button (if cancellation supported)
```

#### REQ-UI-SUB-003: Result Display
```
After submission:

Success:
- Success icon and message
- FDA Core ID / reference number
- "System will check for acknowledgment automatically"
- OK button

Failure:
- Error icon and message
- Error details
- Suggested action
- Retry and Close buttons
```

### 4.3 Acknowledgment Display

#### REQ-UI-ACK-001: Acknowledgment Panel
```
In case detail view, Submission tab shows:

For Submitted cases (awaiting ACK):
- "Awaiting FDA Acknowledgment"
- Submission date and FDA reference ID
- "Check Now" button
- Last checked timestamp

For Acknowledged cases:
- Acknowledgment type (ACK1/2/3)
- FDA Core ID
- Acknowledgment timestamp
- View details link
- Export button

For Failed (NACK) cases:
- Error code and message
- Affected elements (if specified)
- "Return to Draft" button
- "Retry" button
```

---

## 5. Security Requirements

#### REQ-SEC-001: Credential Storage
```
As the system
I need to store API credentials securely

Acceptance Criteria:
- Use OS secure storage (Keychain, Credential Manager, etc.)
- Fallback: AES-256 encryption with machine-derived key
- Never store credentials in plain text
- Never log credentials
- Clear from memory after use
```

#### REQ-SEC-002: Secure Communication
```
As the system
I need to ensure secure API communication

Acceptance Criteria:
- All API calls over HTTPS (TLS 1.2+)
- Validate FDA server certificate
- No credentials in URLs
- Sensitive data excluded from logs
```

---

## 6. Audit Requirements

#### REQ-AUDIT-001: API Audit Trail
```
As the system
I need to log all API interactions

Audit Events:
- Authentication attempts (success/failure)
- Submission attempts (with reference IDs)
- Acknowledgment retrievals
- Errors and retries
- Configuration changes

Audit Entry Contents:
- Timestamp (UTC)
- Event type
- Case ID (where applicable)
- FDA reference ID (where applicable)
- Result (success/failure)
- Error details (if applicable)

Requirements:
- Append-only (immutable)
- Exclude credentials from logs
- Retain per regulatory requirements
```

---

## 7. Configuration Requirements

#### REQ-CONFIG-001: Configurable Settings
```
User-configurable settings:

API Settings:
- Environment (Test/Production)
- Client ID
- Secret Key

Polling Settings:
- Polling interval (default: 5 minutes, range: 1-60)
- Polling timeout (default: 48 hours, range: 1-168)

Retry Settings:
- Maximum automatic retries (default: 3, range: 0-10)
- Maximum total attempts before requiring reset (default: 5)

Sender Settings:
- Company name
- Contact name
- Contact email
```

---

## 8. Testing Requirements

### 8.1 Test Scenarios

- Successful authentication
- Authentication with invalid credentials
- Token refresh on expiration
- Successful submission end-to-end
- Submission with network failure (retry behavior)
- Submission with validation error
- Acknowledgment polling and retrieval
- NACK handling
- Manual acknowledgment check
- Fallback to SRP export
- Configuration persistence

### 8.2 FDA Test Environment

- All development and testing against FDA ESG Test environment
- Production environment only after thorough testing
- Test all acknowledgment types (ACK1, ACK2, ACK3, NACK)

---

## 9. Acceptance Criteria Summary

### 9.1 Must Have
- [ ] API credential configuration and secure storage
- [ ] OAuth authentication with token management
- [ ] Submit case via API with progress display
- [ ] Automatic acknowledgment polling
- [ ] Manual acknowledgment check
- [ ] Error categorization and user-friendly messages
- [ ] Automatic retry for transient errors
- [ ] Manual retry for failed submissions
- [ ] Submission history with API details
- [ ] Fallback to SRP export

### 9.2 Should Have
- [ ] Connection test functionality
- [ ] Dashboard updates for API submissions
- [ ] NACK error detail display
- [ ] Export acknowledgment as PDF
- [ ] Configurable polling and retry settings

### 9.3 Nice to Have
- [ ] Submission queue for offline support
- [ ] Email notifications for acknowledgments
- [ ] API usage statistics

---

## 10. References

- [FDA ESG NextGen](https://www.fda.gov/industry/electronic-submissions-gateway)
- [ESG NextGen API Guide](https://www.fda.gov/media/185957/download)
- [ESG NextGen FAQ](https://www.fda.gov/industry/resources/esg-nextgen-frequently-asked-questions)
- FDA ESG Registration Guide: `FDA_ESG_Registration_Guide.md`
- Phase 1 Requirements: `01_Phase1_Core_ICSR_MVP.md`
- Phase 2 Requirements: `02_Phase2_SRP_Submission.md`
- Application Overview: `00_FAERS_Application_Overview.md`

---

## Next Phase

After completing Phase 2B, proceed to **Phase 3: Multi-User & Workflow Management** which adds:
- User authentication and authorization
- Role-based access control
- Case review and approval workflows
- Due date tracking and notifications
