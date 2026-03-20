# FDA Electronic Submissions Gateway (ESG) Registration Guide

## Instructions for Setting Up FDA ESG NextGen Account

**Document Purpose:** Step-by-step guide for registering with FDA's Electronic Submissions Gateway to enable ICSR submissions via manual upload (USP) or automated API.

**Last Updated:** January 2025

---

## 1. Overview

### 1.1 What is FDA ESG?

The FDA Electronic Submissions Gateway (ESG) is the FDA's central system for receiving electronic regulatory submissions. For FAERS (adverse event reporting), ESG accepts E2B(R3) XML files and returns acknowledgments.

### 1.2 ESG NextGen

FDA has modernized their gateway to **ESG NextGen**, which offers three submission methods:

| Method                                    | Description                       | Certificate Required? | Best For                             |
| ----------------------------------------- | --------------------------------- | --------------------- | ------------------------------------ |
| **Unified Submission Portal (USP)** | Web-based manual upload           | No                    | Low volume, manual process           |
| **API**                             | REST API for automated submission | No                    | **Recommended for automation** |
| **AS2**                             | Legacy server-to-server protocol  | Yes                   | Existing AS2 infrastructure          |

### 1.3 Recommended Path by Volume

| Submission Volume     | Recommended Method              | Phase    |
| --------------------- | ------------------------------- | -------- |
| Low (1-50/month)      | ESG NextGen USP (manual upload) | Phase 2  |
| Medium (50-500/month) | ESG NextGen API (automated)     | Phase 2B |
| High (500+/month)     | ESG NextGen API (automated)     | Phase 2B |

### 1.4 Important: SRP vs ESG NextGen USP

| Portal                                  | URL                                             | Accepts XML?  | Use For                |
| --------------------------------------- | ----------------------------------------------- | ------------- | ---------------------- |
| **ESG NextGen USP**               | fda.gov/industry/electronic-submissions-gateway | **Yes** | XML file uploads       |
| **Safety Reporting Portal (SRP)** | safetyreporting.hhs.gov                         | **No**  | Manual data entry only |

**If you have an application that generates XML files, use ESG NextGen USP, not SRP.**

---

## 2. Prerequisites

Before starting registration, prepare the following:

| Item                                | Description                                              |
| ----------------------------------- | -------------------------------------------------------- |
| **Company Information**       | Legal company name, address, DUNS number                 |
| **DUNS Number**               | 9-digit Dun & Bradstreet identifier — can be used as sender ID in E2B(R3) submissions (see Step 4a) |
| **Authorized Contact**        | Name, email, phone of person responsible for submissions |
| **Company Email**             | Business email address (not personal)                    |
| **Letter of Non-Repudiation** | Legal document on company letterhead (see Section 4)     |

---

## 3. Step-by-Step Registration Process

### Step 1: Create ESG NextGen Account

**Timeline:** 15-30 minutes

1. Open your browser (Chrome, Firefox, or Edge recommended)
2. Navigate to: **https://www.fda.gov/industry/electronic-submissions-gateway**
3. Click **"Industry USP Log In"**
4. Review and **Accept** the Security Warning
5. Click **"Register now"**
6. Complete the **Create Your Account** form:

   - Email address (business email)
   - First and last name
   - Create password (follow complexity requirements)
   - Company name
   - Phone number
7. Click **"Create Account"**
8. Check your email for account confirmation

   - Subject: "Your ESG NextGen account has been created"
9. Return to login page and enter your credentials
10. Complete **Multi-Factor Authentication (MFA)** setup:

    - Check email for One-Time Passcode (OTP)
    - Enter OTP when prompted
    - You are now authenticated

### Step 2: Complete ESG NextGen Registration Wizard

**Timeline:** 30-60 minutes

After first login, the registration wizard guides you through:

1. **Company Information**

   - Verify/enter company details
   - Enter physical address
   - Enter DUNS number (if applicable)
2. **User Role Assignment**

   - First user becomes "Power User" by default
   - Power Users can manage other users and API credentials
3. **Non-Repudiation Letter Upload**

   - Upload your signed Letter of Non-Repudiation (see Section 4)
   - This is required before you can submit
4. **Review and Submit**

   - Review all information
   - Submit registration for FDA review

### Step 3: FDA Review and Approval

**Timeline:** 1-5 business days

1. FDA Admin reviews your registration
2. You receive email notification of approval status
3. Once approved, your account is activated

### Step 4: Submit Test Submission

**Timeline:** 1-2 hours (after account approval)

New users ("net new" to FDA ESG) must complete a test submission:

1. Log into ESG NextGen
2. Navigate to **Test Submissions**
3. Prepare a test E2B(R3) XML file (see **Step 4a** below)
4. Upload via Unified Submission Portal or API
5. Verify submission receipt
6. Check for acknowledgment in your inbox
7. Once FDA validates your test, you receive production access

### Step 4a: Prepare a Test E2B(R3) XML File

Use the FAERS application to generate a valid test XML file. Follow these steps:

#### 1. Configure Test Routing Identifiers

Before creating your test case, ensure the application is configured with **test** routing identifiers so the XML is routed to FDA's test environment. The application automatically sets the correct routing identifiers based on your settings.

**How to configure in the FAERS application:**

1. Open the application and log in
2. Click the **Settings** gear icon in the toolbar (or navigate to **Settings** in the sidebar)
3. In the Settings dialog, select the **General** tab
4. Under **Submission Environment**, configure the following three options:

   **a. Environment** — Select **Test Mode**
   - This ensures exported XML files are named with a `_TEST` suffix so they are clearly identifiable as test submissions
   - When you are ready for production submissions later, you can switch to **Production** (requires a confirmation checkbox)

   **b. Report Type** — Select **Postmarket** or **Premarket** depending on your submission type
   - **Postmarket** — For standard adverse event reports (sets Batch Receiver to `ZZFDA`)
   - **Premarket** — For IND/clinical trial safety reports (sets Batch Receiver to `ZZFDA_PREMKT`)

   **c. Target Center** — Select **CDER** or **CBER**
   - **CDER** — Center for Drug Evaluation and Research (for drugs)
   - **CBER** — Center for Biologics Evaluation and Research (for biologics)

5. Under **FDA Submission Settings**, configure your sender identification:

   **a. Sender Identifier Type** — Choose how your organization is identified in the E2B(R3) XML:

   - **Sender ID** — Use your FDA-assigned sender identifier. This is assigned during ESG registration or can be confirmed by contacting FDA ESG support (ESGNGsupport@fda.hhs.gov). Enter it in the **Sender ID** field (e.g., `COMPANY123`).
   - **DUNS Number** — Use your organization's 9-digit Dun & Bradstreet DUNS number. This is an accepted alternative per FDA guidance and uses OID `1.3.6.1.4.1.519.1` in the XML. Enter exactly 9 digits in the **DUNS Number** field (e.g., `012345678`).

   > **Which should I use?** If you already have an FDA-assigned sender ID from your ESG registration, use that. If you don't have one yet or prefer to use your DUNS number, FDA accepts DUNS as a valid sender identifier. Most organizations have a DUNS number — you can look yours up at [dnb.com](https://www.dnb.com/duns-number/lookup.html). ICSR batches with non-approved sender identifiers will be rejected by FDA.

   **b. Sender Organization** — Your company's full legal name (e.g., `Acme Pharmaceutical Inc.`)

   **How sender identification appears in the XML:**

   | Identifier Type | XML Field (N.1.3) | OID (root) | Extension |
   |----------------|-------------------|------------|-----------|
   | Sender ID | Batch Sender | `2.16.840.1.113883.3.989.2.1.3.13` | Your Sender ID (e.g., `COMPANY123`) |
   | DUNS Number | Batch Sender | `1.3.6.1.4.1.519.1` | Your 9-digit DUNS (e.g., `012345678`) |

   The selected identifier is also used as the prefix for exported XML filenames (e.g., `COMPANY123_20260319_0001_TEST.xml` or `012345678_20260319_0001_TEST.xml`).

6. Optionally configure **Export Settings**:
   - **Default Export Location** — Click **Browse** to select a folder where exported XML files will be saved
   - **Auto-validate on Export** — Leave enabled (recommended) to automatically validate cases before export
   - **Warn on Export with Warnings** — Leave enabled (recommended) to alert you about non-critical issues

7. Click **Save Settings**

**How these settings map to the XML routing identifiers:**

| Setting | Your Selection | XML Field | Value Written to XML |
|---------|---------------|-----------|---------------------|
| Report Type = Postmarket | + Target Center = CDER | Batch Receiver (N.1.4) | `ZZFDA` |
| | | Message Receiver (N.2.r.3) | `CDER` |
| Report Type = Postmarket | + Target Center = CBER | Batch Receiver (N.1.4) | `ZZFDA` |
| | | Message Receiver (N.2.r.3) | `CBER` |
| Report Type = Premarket | + Target Center = CDER | Batch Receiver (N.1.4) | `ZZFDA_PREMKT` |
| | | Message Receiver (N.2.r.3) | `CDER_IND` |
| Report Type = Premarket | + Target Center = CBER | Batch Receiver (N.1.4) | `ZZFDA_PREMKT` |
| | | Message Receiver (N.2.r.3) | `CBER_IND` |

> **Note:** For test submissions, the routing identifiers in the XML are the same as production. The distinction between test and production is made by FDA based on your account status and submission method — not by the XML content itself. The **Test Mode** setting in the app adds a `_TEST` suffix to filenames as a safeguard.

#### 2. Create a Test Case

1. Click **New Case** (or press Ctrl+N)
2. Fill out the following required sections with sample data:

   **Report Section:**
   - Report type: Initial or Follow-up
   - Seriousness criteria (at minimum, select one)
   - Date of report

   **Reporter Section:**
   - Reporter type (e.g., Physician, Pharmacist, Consumer)
   - Reporter name and contact information (use fictitious data)
   - Reporter country

   **Sender Section:**
   - Sender organization name (your company name)
   - Sender type (e.g., Pharmaceutical Company)
   - Sender contact details

   **Patient Section:**
   - Patient initials or identifier (use fictitious data, e.g., "A.B.")
   - Age or date of birth
   - Sex
   - Weight (optional but recommended)

   **Reactions Section:**
   - At least one adverse reaction term (e.g., "Headache", "Nausea")
   - Reaction start date
   - Reaction outcome (e.g., Recovered, Not Recovered)

   **Drugs Section:**
   - At least one suspect drug name
   - Drug characterization (Suspect, Concomitant, or Interacting)
   - Dosage and route of administration (recommended)
   - Start and stop dates (recommended)

   **Narrative Section:**
   - Free-text case narrative summarizing the adverse event

3. Click **Save** to save the case

**Sample Test Data — Ready to Copy**

Below is a complete set of fictitious data you can use to create a test case. All names, dates, and details are fake and suitable for FDA test submissions.

**Settings (configure once before creating the case):**

| Setting | Test Value |
|---------|-----------|
| Environment | Test Mode |
| Report Type | Postmarket |
| Target Center | CDER |
| Sender Identifier Type | DUNS Number |
| DUNS Number | `000000001` |
| Sender Organization | TestPharma Inc. |

**Report Section:**

| Field | Test Value |
|-------|-----------|
| Report Type | Initial |
| Seriousness | Hospitalization |
| Date of Report | 2026-03-15 |
| Date Received by Sender | 2026-03-16 |
| Country of Occurrence | US - United States |

**Reporter Section:**

| Field | Test Value |
|-------|-----------|
| Reporter Type | Physician |
| First Name | Jane |
| Last Name | Doe |
| Organization | City General Hospital |
| Street Address | 100 Medical Center Drive |
| City | Rockville |
| State | MD |
| Postal Code | 20850 |
| Country | US - United States |
| Phone | 301-555-0100 |
| Email | jane.doe@testcgh.example.com |

**Sender Section:**

| Field | Test Value |
|-------|-----------|
| Sender Type | Pharmaceutical Company |
| Organization | TestPharma Inc. |
| Department | Drug Safety |
| First Name | John |
| Last Name | Smith |
| Street Address | 500 Pharma Boulevard |
| City | Silver Spring |
| State | MD |
| Postal Code | 20993 |
| Country | US - United States |
| Phone | 301-555-0200 |
| Email | drugsafety@testpharma.example.com |

**Patient Section:**

| Field | Test Value |
|-------|-----------|
| Patient Initials | T.P. |
| Date of Birth | 1975-06-15 |
| Age at Time of Reaction | 50 years |
| Sex | Male |
| Weight | 82 kg |

**Reactions Section (add one or more):**

| Field | Reaction 1 | Reaction 2 |
|-------|-----------|-----------|
| Reaction Term (MedDRA PT) | Nausea | Hepatic enzyme increased |
| Start Date | 2026-03-01 | 2026-03-05 |
| End Date | 2026-03-10 | (ongoing) |
| Outcome | Recovered | Not Recovered |
| Seriousness | Not Serious | Hospitalization |

**Drugs Section (add one suspect + one concomitant):**

| Field | Drug 1 (Suspect) | Drug 2 (Concomitant) |
|-------|-----------------|---------------------|
| Drug Name | Testdrugimab | Lisinopril |
| Drug Characterization | Suspect | Concomitant |
| Dose | 200 mg | 10 mg |
| Dose Unit | mg | mg |
| Frequency | Once daily | Once daily |
| Route of Administration | Oral | Oral |
| Start Date | 2026-01-15 | 2024-06-01 |
| Stop Date | 2026-03-10 | (continuing) |
| Indication | Rheumatoid arthritis | Hypertension |
| Action Taken | Drug withdrawn | Dose not changed |

**Narrative Section:**

```
A 50-year-old male patient (initials T.P.) with a history of hypertension was started
on Testdrugimab 200 mg orally once daily on 15-Jan-2026 for rheumatoid arthritis.
Concomitant medication included Lisinopril 10 mg daily for hypertension.

On 01-Mar-2026, the patient developed nausea. On 05-Mar-2026, routine blood work
revealed elevated hepatic enzymes (ALT 3x ULN, AST 2.5x ULN). The patient was
hospitalized on 06-Mar-2026 for monitoring and evaluation. Testdrugimab was
discontinued on 10-Mar-2026. The nausea resolved on 10-Mar-2026. As of the date
of this report, hepatic enzymes remain elevated and the patient is still hospitalized.

The reporter (Dr. Jane Doe) assessed the hepatic enzyme elevation as possibly related
to Testdrugimab and unlikely related to Lisinopril. No other cause has been identified.

This is an initial report. Follow-up information is expected.
```

> **Important:** All names, addresses, organizations, and clinical details above are entirely fictitious and intended solely for test submissions. Do not use real patient data for test cases.

#### 3. Validate the Case

1. After saving, click **Validate** to run E2B(R3) validation rules
2. Review any validation errors or warnings
3. Fix all **Errors** (these will cause FDA rejection)
4. Review **Warnings** (recommended to fix for best acceptance rate)
5. Re-validate until no errors remain

#### 4. Export the XML File

1. Select the validated case from the case list
2. Click **Export XML** or use the submission workflow
3. The application generates an E2B(R3) compliant XML file
4. Choose a save location for the XML file

#### 5. Validate with FDA E2B(R3) Validator (Recommended)

Before uploading to ESG NextGen, validate your XML using the free FDA online validator:

1. Navigate to: **https://faers2-validator.preprod.fda.gov/LSMV/Validator**
2. No account or login is required
3. Upload your exported XML file
4. Review results:
   - **Pass** — XML is valid and ready for submission
   - **Rejections** — Must fix before submitting (will cause NACK from FDA)
   - **Warnings** — Recommended to fix but will not block submission
5. Fix any issues in the FAERS application, re-export, and re-validate

#### 6. Practice with Demo Mode (Optional)

If you want to practice the full submission workflow before connecting to FDA:

1. Navigate to **Settings > Submission > Demo Mode**
2. Enable Demo Mode — this activates a local mock ESG API
3. Select a test scenario (e.g., "Happy Path", "Slow Processing", "Validation Error")
4. Submit your test case through the simulated workflow
5. Observe the ACK progression (ACK1 → ACK2 → ACK3) and familiarize yourself with the process
6. Disable Demo Mode when ready for real FDA submissions

### Step 5: Obtain API Credentials (For Automated Submission)

**Timeline:** 15 minutes

If using the API method for automated submissions:

1. Log into ESG NextGen as Power User
2. Navigate to **API Management**
3. Click **"Generate API Credentials"**
4. System generates:

   - **Client ID**
   - **Secret Key**
5. **IMPORTANT:** Store the Secret Key securely

   - ESG NextGen will NOT display it again
   - Treat it like a password
6. Use these credentials for OAuth authentication in your application

---

## 4. Letter of Non-Repudiation

### 4.1 What Is It?

A legal document required by 21 CFR Part 11 stating that your company:

- Accepts responsibility for electronic submissions
- Will not deny (repudiate) submissions made under your credentials
- Authorizes specific individuals to submit on behalf of the company

### 4.2 Requirements

- Must be on **company letterhead**
- Must be signed by **authorized company official**
- Must list all individuals authorized to submit
- Must reference your ESG NextGen account

### 4.3 Template

Download the official template from:
**https://www.fda.gov/industry/electronic-submissions-gateway/letters-non-repudiation-agreement**

### 4.4 Sample Content

```
[COMPANY LETTERHEAD]

[Date]

Food and Drug Administration
[Appropriate FDA Office]

Subject: Letter of Non-Repudiation Agreement for Electronic Submissions

Dear Sir/Madam:

[Company Name] hereby agrees to the following terms for electronic submissions 
to the Food and Drug Administration via the Electronic Submissions Gateway:

1. We accept full responsibility for all electronic submissions made using 
   our ESG NextGen account credentials.

2. We will not repudiate or deny any submission made using our credentials.

3. The following individuals are authorized to submit on behalf of [Company Name]:
   - [Name], [Title], [Email]
   - [Name], [Title], [Email]

4. We agree to notify FDA promptly if any authorized individual's status changes.

5. We understand that electronic submissions are legally binding.

Sincerely,

[Signature]
[Name]
[Title]
[Company Name]
[Date]
```

---

## 5. API Integration Setup

### 5.1 API Authentication

ESG NextGen API uses **OAuth 2.0** authentication:

1. **Request Access Token**

   ```
   POST /oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=client_credentials
   client_id={your_client_id}
   client_secret={your_secret_key}
   ```
2. **Use Token in Requests**

   ```
   Authorization: Bearer {access_token}
   ```
3. **Token Expiration**

   - Tokens expire after a set period
   - Request new token when expired

### 5.2 Key API Endpoints

| Endpoint              | Purpose                  |
| --------------------- | ------------------------ |
| `/oauth/token`      | Get access token         |
| `/submissions`      | Create new submission    |
| `/submissions/{id}` | Get submission status    |
| `/acknowledgments`  | Retrieve acknowledgments |
| `/companies`        | Get company information  |

### 5.3 Submission Workflow via API

1. **Authenticate** - Get OAuth access token
2. **Create Submission** - POST submission metadata
3. **Upload File** - Upload E2B(R3) XML file
4. **Submit** - Finalize and submit to FDA
5. **Check Status** - Poll for acknowledgment
6. **Retrieve Acknowledgment** - Download ACK/NACK

### 5.4 API Documentation

Full API specification available at:
**https://www.fda.gov/industry/electronic-submissions-gateway-next-generation-esg-nextgen**

Download: *ESG NextGen API Guide for Industry Users*

---

## 6. For Agents, CROs, and Consultants

If submitting on behalf of other companies:

### 6.1 Additional Requirements

1. **Your own Non-Repudiation Letter** for your company
2. **Authorization Letter** from each client company

   - States you are authorized to submit on their behalf
   - Signed by client's authorized official
   - Must be uploaded to ESG NextGen

### 6.2 Authorization Letter Template

Download from:
**https://www.fda.gov/industry/electronic-submissions-gateway/authorization-letter**

---

## 7. Legacy AS2 Setup (Optional)

**Note:** AS2 is considered legacy technology. FDA recommends API for new implementations.

If you must use AS2 (e.g., existing infrastructure):

### 7.1 Additional Requirements

| Requirement            | Description                               |
| ---------------------- | ----------------------------------------- |
| AS2-compliant software | Gateway software supporting AS2 protocol  |
| Digital certificate    | X.509 v3 certificate (see Section 7.2)    |
| Network configuration  | Firewall allowing HTTPS on port 4080      |
| IT support             | Technical expertise for AS2 configuration |

### 7.2 Digital Certificate Requirements

| Specification | Requirement                                     |
| ------------- | ----------------------------------------------- |
| Format        | X.509 version 3                                 |
| Key Length    | 1024, 2048, or 3072 bits                        |
| Validity      | Minimum 1 year, recommended 1-3 years           |
| Fields        | All Issuer and Subject fields must be completed |
| Owner         | Must match ESG account owner name or email      |

### 7.3 Certificate Sources

**Commercial Certificate Authorities:**

- GlobalSign: https://www.globalsign.com/en/fda-esg
- IdenTrust: https://www.identrust.com/partners/food-and-drug-administration-fda-electronic-submissions-gateway-esg
- DigiCert: https://www.digicert.com

**Self-Signed Certificate (using OpenSSL):**

```bash
# Generate private key and certificate
openssl req -x509 -newkey rsa:2048 \
  -keyout private.key \
  -out certificate.crt \
  -days 365 -nodes \
  -subj "/CN=Your Name/O=Your Company/OU=Department/emailAddress=your.email@company.com/C=US"

# Convert to PFX format (required by FDA)
openssl pkcs12 -export \
  -out certificate.pfx \
  -inkey private.key \
  -in certificate.crt
```

### 7.4 AS2 Configuration

Contact ESG Support for:

- FDA's AS2 identifier
- FDA's public certificate
- FDA's AS2 endpoint URLs (test and production)

---

## 8. Timeline Summary

| Step                                  | Estimated Time              |
| ------------------------------------- | --------------------------- |
| Create account                        | 15-30 minutes               |
| Complete registration wizard          | 30-60 minutes               |
| FDA review and approval               | 1-5 business days           |
| Test submission                       | 1-2 hours                   |
| API credential setup                  | 15 minutes                  |
| **Total (API path)**            | **2-7 business days** |
| Additional for AS2: Certificate setup | 1-3 days                    |
| Additional for AS2: AS2 configuration | 1-2 weeks                   |

---

## 9. Testing and Validation

### 9.1 XML Validation (Before Submission)

Before submitting to FDA, validate your XML using the **FDA E2B(R3) Validator**:

| Feature                    | Details                                                 |
| -------------------------- | ------------------------------------------------------- |
| **URL**              | https://faers2-validator.preprod.fda.gov/LSMV/Validator |
| **Account Required** | No                                                      |
| **Cost**             | Free                                                    |
| **File Storage**     | Files are NOT stored by FDA                             |

**How to Use:**

1. Navigate to the validator URL
2. Upload your E2B(R3) XML file
3. Review validation results immediately
4. Fix any **Rejections** (will cause submission failure)
5. Review **Warnings** (recommended to fix)
6. Re-validate until no rejections

### 9.2 ESG NextGen Submission Types

When uploading files to the FDA ESG NextGen portal, you must select a **Submission Type**. The portal supports several types for different FDA programs:

| Submission Type | Full Name | Purpose | Use for FAERS? |
|----------------|-----------|---------|----------------|
| **FAERS** | FDA Adverse Event Reporting System | Individual Case Safety Reports (ICSRs) in E2B(R3) XML format | **Yes — always use this** |
| **VAERS** | Vaccine Adverse Event Reporting System | Vaccine adverse event reports | Only for vaccine-related AEs |
| **ECTD** | Electronic Common Technical Document | NDAs, ANDAs, BLAs, INDs (regulatory applications) | No |
| **EINS** | Establishment Identification Number System | Facility registration and listing | No |
| **REMS** | Risk Evaluation and Mitigation Strategies | REMS assessments and modifications | No |

> **For this application, always select "FAERS" as the submission type** when uploading E2B(R3) XML files to the ESG NextGen portal.

### 9.3 Test Submissions via ESG NextGen

**Important:** There is no separate test environment URL. Test and production use the same portal - the difference is in your XML routing identifiers.

| Environment                       | Batch Receiver (N.1.4) | Message Receiver (N.2.r.3) |
| --------------------------------- | ---------------------- | -------------------------- |
| **Test - Postmarket**       | `ZZFDA`              | CDER or CBER               |
| **Test - Premarket**        | `ZZFDA_PREMKT`       | CDER_IND or CBER_IND       |
| **Production - Postmarket** | `FDA_AERS`           | CDER or CBER               |
| **Production - Premarket**  | (production values)    | CDER_IND or CBER_IND       |

**Test Submission Workflow:**

1. Generate XML with **test routing identifiers** (ZZFDA)
2. Validate using FDA E2B(R3) Validator
3. Log into ESG NextGen USP (same portal as production)
4. Select **FAERS** as the submission type
5. Select **Test Submission**
6. Upload test XML file
7. Receive test acknowledgments (ACK1, ACK2, ACK3 or NACK)
8. Fix any issues and retest
9. Once FDA approves, switch to **production routing identifiers** (FDA_AERS)

### 9.4 Acknowledgment Types

| Type                 | Meaning                                | Timing                   |
| -------------------- | -------------------------------------- | ------------------------ |
| **ACK1 (MDN)** | Message received by ESG                | Immediate                |
| **ACK2**       | Message processed and routed to center | Within hours             |
| **ACK3**       | Validation results from FAERS          | Within 1-2 business days |
| **NACK**       | Rejection with error details           | Varies                   |

### 9.5 Testing Checklist

- [ ] XML validates locally against E2B(R3) XSD schema
- [ ] XML passes FDA E2B(R3) Validator with no rejections
- [ ] Test XML uses test routing identifiers (ZZFDA)
- [ ] Test submission uploaded to ESG NextGen USP
- [ ] ACK1 received
- [ ] ACK2 received
- [ ] ACK3 received with successful validation
- [ ] Notified FDA ready for production (faersesub@fda.hhs.gov)
- [ ] Production routing identifiers configured (FDA_AERS)

---

## 10. Contacts and Resources

### 10.1 FDA Contacts

| Purpose                     | Contact                  |
| --------------------------- | ------------------------ |
| ESG NextGen Support         | ESGNGsupport@fda.hhs.gov |
| CDER Electronic Submissions | esub@fda.hhs.gov         |
| CBER Electronic Submissions | esubprep@fda.hhs.gov     |

### 10.2 Documentation Links

| Document                        | URL                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ESG NextGen Home                | https://www.fda.gov/industry/electronic-submissions-gateway                                                                         |
| USP Guide for Industry          | https://www.fda.gov/media/188809/download                                                                                           |
| API Guide for Industry          | https://www.fda.gov/media/185957/download                                                                                           |
| **FDA E2B(R3) Validator** | https://faers2-validator.preprod.fda.gov/LSMV/Validator                                                                             |
| FAERS Electronic Submissions    | https://www.fda.gov/drugs/fdas-adverse-event-reporting-system-faers/fda-adverse-event-reporting-system-faers-electronic-submissions |
| Non-Repudiation Letters         | https://www.fda.gov/industry/electronic-submissions-gateway/letters-non-repudiation-agreement                                       |
| Digital Certificates            | https://www.fda.gov/industry/electronic-submissions-gateway-next-generation-esg-nextgen/digital-certificates                        |
| FAQ                             | https://www.fda.gov/industry/resources/esg-nextgen-frequently-asked-questions                                                       |

---

## 11. Checklist

### Pre-Registration Checklist

- [ ] Company information gathered
- [ ] Authorized contact identified
- [ ] Business email address available
- [ ] Letter of Non-Repudiation drafted

### Registration Checklist

- [ ] ESG NextGen account created
- [ ] Email verified
- [ ] MFA set up
- [ ] Registration wizard completed
- [ ] Non-Repudiation Letter uploaded
- [ ] FDA approval received

### API Setup Checklist

- [ ] Power User access confirmed
- [ ] API credentials generated
- [ ] Client ID recorded
- [ ] Secret Key stored securely
- [ ] Test submission completed
- [ ] Production access granted

### AS2 Setup Checklist (If Applicable)

- [ ] Digital certificate obtained
- [ ] Certificate uploaded to ESG NextGen
- [ ] AS2 software configured
- [ ] Firewall rules configured (port 4080)
- [ ] FDA AS2 settings received
- [ ] AS2 test submission completed

---

## Revision History

| Version | Date         | Changes         |
| ------- | ------------ | --------------- |
| 1.0     | January 2025 | Initial version |
