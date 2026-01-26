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

| Method | Description | Certificate Required? | Best For |
|--------|-------------|----------------------|----------|
| **Unified Submission Portal (USP)** | Web-based manual upload | No | Low volume, manual process |
| **API** | REST API for automated submission | No | **Recommended for automation** |
| **AS2** | Legacy server-to-server protocol | Yes | Existing AS2 infrastructure |

### 1.3 Recommended Path by Volume

| Submission Volume | Recommended Method | Phase |
|-------------------|-------------------|-------|
| Low (1-50/month) | ESG NextGen USP (manual upload) | Phase 2 |
| Medium (50-500/month) | ESG NextGen API (automated) | Phase 2B |
| High (500+/month) | ESG NextGen API (automated) | Phase 2B |

### 1.4 Important: SRP vs ESG NextGen USP

| Portal | URL | Accepts XML? | Use For |
|--------|-----|--------------|---------|
| **ESG NextGen USP** | fda.gov/industry/electronic-submissions-gateway | **Yes** | XML file uploads |
| **Safety Reporting Portal (SRP)** | safetyreporting.hhs.gov | **No** | Manual data entry only |

**If you have an application that generates XML files, use ESG NextGen USP, not SRP.**

---

## 2. Prerequisites

Before starting registration, prepare the following:

| Item | Description |
|------|-------------|
| **Company Information** | Legal company name, address, DUNS number (if applicable) |
| **Authorized Contact** | Name, email, phone of person responsible for submissions |
| **Company Email** | Business email address (not personal) |
| **Letter of Non-Repudiation** | Legal document on company letterhead (see Section 4) |

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

3. Prepare a test E2B(R3) XML file

4. Upload via Unified Submission Portal or API

5. Verify submission receipt

6. Check for acknowledgment in your inbox

7. Once FDA validates your test, you receive production access

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

| Endpoint | Purpose |
|----------|---------|
| `/oauth/token` | Get access token |
| `/submissions` | Create new submission |
| `/submissions/{id}` | Get submission status |
| `/acknowledgments` | Retrieve acknowledgments |
| `/companies` | Get company information |

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

| Requirement | Description |
|-------------|-------------|
| AS2-compliant software | Gateway software supporting AS2 protocol |
| Digital certificate | X.509 v3 certificate (see Section 7.2) |
| Network configuration | Firewall allowing HTTPS on port 4080 |
| IT support | Technical expertise for AS2 configuration |

### 7.2 Digital Certificate Requirements

| Specification | Requirement |
|---------------|-------------|
| Format | X.509 version 3 |
| Key Length | 1024, 2048, or 3072 bits |
| Validity | Minimum 1 year, recommended 1-3 years |
| Fields | All Issuer and Subject fields must be completed |
| Owner | Must match ESG account owner name or email |

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

| Step | Estimated Time |
|------|----------------|
| Create account | 15-30 minutes |
| Complete registration wizard | 30-60 minutes |
| FDA review and approval | 1-5 business days |
| Test submission | 1-2 hours |
| API credential setup | 15 minutes |
| **Total (API path)** | **2-7 business days** |
| Additional for AS2: Certificate setup | 1-3 days |
| Additional for AS2: AS2 configuration | 1-2 weeks |

---

## 9. Testing and Validation

### 9.1 XML Validation (Before Submission)

Before submitting to FDA, validate your XML using the **FDA E2B(R3) Validator**:

| Feature | Details |
|---------|---------|
| **URL** | https://faers2-validator.preprod.fda.gov/LSMV/Validator |
| **Account Required** | No |
| **Cost** | Free |
| **File Storage** | Files are NOT stored by FDA |

**How to Use:**
1. Navigate to the validator URL
2. Upload your E2B(R3) XML file
3. Review validation results immediately
4. Fix any **Rejections** (will cause submission failure)
5. Review **Warnings** (recommended to fix)
6. Re-validate until no rejections

### 9.2 Test Submissions via ESG NextGen

**Important:** There is no separate test environment URL. Test and production use the same portal - the difference is in your XML routing identifiers.

| Environment | Batch Receiver (N.1.4) | Message Receiver (N.2.r.3) |
|-------------|------------------------|---------------------------|
| **Test - Postmarket** | `ZZFDA` | CDER or CBER |
| **Test - Premarket** | `ZZFDA_PREMKT` | CDER_IND or CBER_IND |
| **Production - Postmarket** | `FDA_AERS` | CDER or CBER |
| **Production - Premarket** | (production values) | CDER_IND or CBER_IND |

**Test Submission Workflow:**
1. Generate XML with **test routing identifiers** (ZZFDA)
2. Validate using FDA E2B(R3) Validator
3. Log into ESG NextGen USP (same portal as production)
4. Upload test XML file
5. Receive test acknowledgments (ACK1, ACK2, ACK3 or NACK)
6. Fix any issues and retest
7. Once FDA approves, switch to **production routing identifiers** (FDA_AERS)

### 9.3 Acknowledgment Types

| Type | Meaning | Timing |
|------|---------|--------|
| **ACK1 (MDN)** | Message received by ESG | Immediate |
| **ACK2** | Message processed and routed to center | Within hours |
| **ACK3** | Validation results from FAERS | Within 1-2 business days |
| **NACK** | Rejection with error details | Varies |

### 9.4 Testing Checklist

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

| Purpose | Contact |
|---------|---------|
| ESG NextGen Support | ESGNGsupport@fda.hhs.gov |
| CDER Electronic Submissions | esub@fda.hhs.gov |
| CBER Electronic Submissions | esubprep@fda.hhs.gov |

### 10.2 Documentation Links

| Document | URL |
|----------|-----|
| ESG NextGen Home | https://www.fda.gov/industry/electronic-submissions-gateway |
| USP Guide for Industry | https://www.fda.gov/media/188809/download |
| API Guide for Industry | https://www.fda.gov/media/185957/download |
| **FDA E2B(R3) Validator** | https://faers2-validator.preprod.fda.gov/LSMV/Validator |
| FAERS Electronic Submissions | https://www.fda.gov/drugs/fdas-adverse-event-reporting-system-faers/fda-adverse-event-reporting-system-faers-electronic-submissions |
| Non-Repudiation Letters | https://www.fda.gov/industry/electronic-submissions-gateway/letters-non-repudiation-agreement |
| Digital Certificates | https://www.fda.gov/industry/electronic-submissions-gateway-next-generation-esg-nextgen/digital-certificates |
| FAQ | https://www.fda.gov/industry/resources/esg-nextgen-frequently-asked-questions |

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

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2025 | Initial version |
