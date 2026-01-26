# FAERS Test Submission Setup Guide

## Step-by-Step Instructions for Setting Up FDA FAERS Test Submissions

**Document Purpose:** Complete guide for organizations setting up test submissions to FDA FAERS using the E2B(R3) standard via ESG NextGen.

**Last Updated:** January 2025

---

## 1. Overview

### 1.1 What This Guide Covers

This guide walks you through the complete process of:
1. Registering for an FDA ESG NextGen account
2. Validating your XML files before submission
3. Submitting test ICSRs to FDA
4. Understanding acknowledgments
5. Transitioning to production submissions

### 1.2 Prerequisites

Before starting, ensure you have:

| Item | Description |
|------|-------------|
| E2B(R3) XML capability | Application that generates E2B(R3) compliant XML |
| Company information | Legal name, address, DUNS number (recommended) |
| Authorized representative | Person authorized to submit on behalf of company |
| Business email | Corporate email address (not personal) |

### 1.3 Timeline Overview

| Step | Estimated Time |
|------|----------------|
| ESG NextGen account registration | 15-30 minutes |
| FDA account review and approval | 1-5 business days |
| XML validation (self-service) | 1-2 hours |
| Test submission and acknowledgment | 1-3 business days |
| Production approval | 1-5 business days |
| **Total** | **1-2 weeks** |

---

## 2. Step 1: Validate Your XML (Before Account Setup)

**You can validate your XML files before even creating an account.**

### 2.1 Use FDA E2B(R3) Validator

| Feature | Details |
|---------|---------|
| **URL** | https://faers2-validator.preprod.fda.gov/LSMV/Validator |
| **Account Required** | No |
| **Cost** | Free |
| **File Storage** | Files are NOT stored by FDA |

**How to Use:**

1. Navigate to the validator URL
2. Click "Choose File" and select your E2B(R3) XML file
3. Click "Validate"
4. Review results:
   - **Rejections**: Must be fixed (will cause submission failure)
   - **Warnings**: Should be reviewed (won't cause failure)
5. Fix any rejections in your source system
6. Re-validate until no rejections remain

**Tip:** Validate multiple test files to ensure your system consistently generates compliant XML.

---

## 3. Step 2: Register for ESG NextGen Account

### 3.1 Create Your Account

1. **Navigate to ESG NextGen Portal:**
   - URL: https://www.fda.gov/industry/electronic-submissions-gateway
   - Click **"Industry USP Log In"**

2. **Accept Security Warning** and review terms

3. **Click "Register now"**

4. **Complete Registration Form:**
   - Email address (business email required)
   - First and last name
   - Password (follow complexity requirements)
   - Company name (legal name)
   - Phone number

5. **Click "Create Account"**

6. **Verify Email:**
   - Check inbox for "Your ESG NextGen account has been created"
   - Click verification link

7. **Set Up Multi-Factor Authentication (MFA):**
   - Log in with your credentials
   - Check email for One-Time Passcode (OTP)
   - Enter OTP when prompted

### 3.2 Complete Registration Wizard

After first login, complete the registration wizard:

1. **Company Information**
   - Verify/update company details
   - Enter physical address
   - Enter DUNS number (if applicable)

2. **User Role Assignment**
   - First registrant becomes "Power User" automatically
   - Power Users can manage other users and API credentials

3. **Non-Repudiation Letter**
   - Download template from: https://www.fda.gov/industry/electronic-submissions-gateway/letters-non-repudiation-agreement
   - Complete on company letterhead
   - Sign by authorized company official
   - Upload to ESG NextGen

4. **Submit Registration**
   - Review all information
   - Submit for FDA review

### 3.3 Wait for FDA Approval

- **Timeline:** 1-5 business days
- **Notification:** Email when approved
- **Status:** Check ESG NextGen dashboard for updates

---

## 4. Step 3: Notify FAERS Team

**Important:** Before submitting test files, notify the FAERS electronic submission coordinator.

### 4.1 Send Introduction Email

**To:** faersesub@fda.hhs.gov

**Subject:** New Organization - Request to Begin FAERS Test Submissions

**Email Template:**

```
Dear FAERS Electronic Submission Coordinator,

[Company Name] is preparing to submit Individual Case Safety Reports (ICSRs) 
electronically to FAERS using the E2B(R3) standard.

Company Information:
- Company Name: [Legal Company Name]
- ESG NextGen Account Email: [your registered email]
- DUNS Number: [if applicable]
- Submission Type: [Postmarket / Premarket / Both]

We have:
✓ Created an ESG NextGen account
✓ Uploaded our Non-Repudiation Letter
✓ Validated test XML files using FDA E2B(R3) Validator

We request approval to begin test submissions to FAERS.

Please provide:
1. Confirmation of our Sender Identifier approval
2. Any additional requirements for test submissions
3. Guidance on transitioning to production after successful testing

Contact Information:
- Name: [Your Name]
- Title: [Your Title]
- Email: [Your Email]
- Phone: [Your Phone]

Thank you,
[Your Name]
```

### 4.2 Sender Identifier Approval

**Important:** Your Batch Sender Identifier must be approved by FDA before submissions will be accepted.

- **Recommended:** Use your DUNS ID (9-digit identifier)
- **Alternative:** Request approval for custom identifier
- **OID for DUNS:** 1.3.6.1.4.1.519.1

ICSR batches with non-approved sender identifiers will be rejected.

---

## 5. Step 4: Configure Test XML Files

### 5.1 Test vs Production Routing Identifiers

**Critical:** The routing identifiers in your XML determine whether it goes to test or production.

#### For ESG NextGen USP (Web Upload) and API:

| Report Type | Environment | Batch Receiver (N.1.4) | Message Receiver (N.2.r.3) |
|-------------|-------------|------------------------|---------------------------|
| **Postmarket** | Test | `ZZFDA` | `CDER` or `CBER` |
| **Postmarket** | Production | `ZZFDA` | `CDER` or `CBER` |
| **Premarket (IND)** | Test | `ZZFDA_PREMKT` | `CDER_IND` or `CBER_IND` |
| **Premarket (IND)** | Production | `ZZFDA_PREMKT` | `CDER_IND` or `CBER_IND` |

**Note:** For USP and API submissions, the same identifiers are used for both test and production. The submission type (test vs production) is selected in the portal/API, not in the XML.

#### For AS2 (Legacy System-to-System):

| Environment | AS2-To Header | Endpoint |
|-------------|---------------|----------|
| **Test** | `ZZFDATST` | https://upload-api-esgng.fda.gov:4080/as2/receive/test |
| **Production** | `ZZFDA` | https://upload-api-esgng.fda.gov:4080/as2/receive |

### 5.2 XML Element Locations

**Batch Receiver (N.1.4):**
```xml
<MCCI_IN200100UV01>
  <receiver typeCode="RCV">
    <device classCode="DEV" determinerCode="INSTANCE">
      <id>
        <root>2.16.840.1.113883.3.989.2.1.3.14</root>
        <extension>ZZFDA</extension>  <!-- Batch Receiver ID -->
      </id>
    </device>
  </receiver>
  ...
</MCCI_IN200100UV01>
```

**Message Receiver (N.2.r.3):**
```xml
<controlActProcess>
  <subject>
    <investigationEvent>
      <component>
        <adverseEventAssessment>
          <subject1>
            <primaryRole>
              <subjectOf2>
                <organizer>
                  <component>
                    <substanceAdministration>
                      ...
                    </substanceAdministration>
                  </component>
                </organizer>
              </subjectOf2>
            </primaryRole>
          </subject1>
        </adverseEventAssessment>
      </component>
    </investigationEvent>
  </subject>
</controlActProcess>
```

### 5.3 Test Submission Checklist

Before submitting test files, verify:

- [ ] XML validates with no rejections in FDA E2B(R3) Validator
- [ ] Sender Identifier is FDA-approved
- [ ] Correct Batch Receiver ID for your report type
- [ ] Correct Message Receiver ID for your center (CDER/CBER)
- [ ] Test case contains realistic but fictional data
- [ ] File naming follows FDA conventions: `{SenderID}_{YYYYMMDD}_{Sequence}.xml`

---

## 6. Step 5: Submit Test Files

### 6.1 Via ESG NextGen USP (Web Portal)

1. **Log into ESG NextGen:**
   - URL: https://www.fda.gov/industry/electronic-submissions-gateway
   - Click "Industry USP Log In"
   - Enter credentials and MFA code

2. **Navigate to Submissions:**
   - Click "New Submission" or "Submit"

3. **Select Submission Type:**
   - Choose "Test Submission" (not Production)
   - Select Center: CDER or CBER
   - Select Submission Type: FAERS

4. **Upload File:**
   - First upload will prompt FileCatalyst Transfer Agent installation
   - Install the agent (one-time setup)
   - Select your XML file
   - Upload

5. **Confirm Submission:**
   - Review submission details
   - Click "Submit"
   - Note the Core ID assigned

### 6.2 Via ESG NextGen API

If using API for automated submissions:

1. **Obtain API Credentials:**
   - Log into ESG NextGen USP as Power User
   - Navigate to "API Management"
   - Generate Client ID and Secret Key
   - Store Secret Key securely (shown only once)

2. **Use Test Endpoint:**
   - Refer to FDA API Guide: https://www.fda.gov/media/185957/download
   - Use test submission endpoint (separate from production)

---

## 7. Step 6: Monitor Acknowledgments

### 7.1 Acknowledgment Types

| Type | Name | Meaning | Timing |
|------|------|---------|--------|
| **ACK1** | MDN (Message Delivery Notification) | File received by ESG | Immediate |
| **ACK2** | Routing Acknowledgment | File routed to FAERS | Within hours |
| **ACK3** | Validation Acknowledgment | FAERS validation results | 1-2 business days |
| **NACK** | Negative Acknowledgment | Rejection with errors | Varies |

### 7.2 Check Acknowledgments

1. **In ESG NextGen USP:**
   - Navigate to "Submission History"
   - Find your submission by Core ID
   - View acknowledgments in "Acknowledgments" column

2. **Via Email:**
   - ACK notifications sent to registered email

### 7.3 Understanding ACK3 Results

**Successful ACK3:**
- Indicates XML passed FAERS validation
- Case accepted into test database
- Ready to proceed with more tests or production

**NACK (Rejection):**
- Review error details in acknowledgment
- Common issues:
  - Invalid sender identifier
  - Missing required fields
  - Invalid coded values (MedDRA, etc.)
  - Schema validation errors
- Fix issues and resubmit

---

## 8. Step 7: Transition to Production

### 8.1 When Ready for Production

After successful test submissions:

1. **Notify FAERS Team:**
   - Email faersesub@fda.hhs.gov
   - Reference your successful test submissions
   - Request production approval

2. **Wait for Confirmation:**
   - FDA reviews test results
   - Typically 1-5 business days
   - Email confirmation when approved

### 8.2 Production Submission Differences

| Aspect | Test | Production |
|--------|------|------------|
| USP selection | "Test Submission" | "Production Submission" |
| Data | Fictional test cases | Real adverse event data |
| Database | Test environment | Live FAERS database |
| Regulatory | No regulatory impact | Meets reporting obligations |

### 8.3 Important Notes

- **No Reversion:** Once you submit in E2B(R3) format to production, you cannot revert to E2B(R2) or other legacy formats
- **Sender ID:** Use the same approved Sender Identifier for production
- **Monitoring:** Continue to monitor acknowledgments for all production submissions

---

## 9. Troubleshooting

### 9.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| XML validation errors | Schema non-compliance | Use FDA E2B(R3) Validator, fix errors |
| Sender ID rejected | Not FDA-approved | Contact faersesub@fda.hhs.gov for approval |
| ACK not received | Routing issue | Check routing IDs, contact ESGNGSupport@fda.hhs.gov |
| FileCatalyst won't install | Browser/system issue | Try different browser, check system requirements |
| MFA not working | Email delivery | Check spam folder, contact ESGNGSupport@fda.hhs.gov |

### 9.2 Support Contacts

| Purpose | Contact |
|---------|---------|
| ESG NextGen technical support | ESGNGSupport@fda.hhs.gov |
| FAERS electronic submissions | faersesub@fda.hhs.gov |
| CDER electronic submissions | esub@fda.hhs.gov |
| CBER electronic submissions | esubprep@fda.hhs.gov |

**Support Hours:** 8 AM - 8 PM ET, Monday - Friday

---

## 10. Quick Reference

### 10.1 Key URLs

| Resource | URL |
|----------|-----|
| ESG NextGen Portal | https://www.fda.gov/industry/electronic-submissions-gateway |
| FDA E2B(R3) Validator | https://faers2-validator.preprod.fda.gov/LSMV/Validator |
| USP User Guide | https://www.fda.gov/media/188809/download |
| API User Guide | https://www.fda.gov/media/185957/download |
| Non-Repudiation Letters | https://www.fda.gov/industry/electronic-submissions-gateway/letters-non-repudiation-agreement |
| E2B(R3) Technical Specs | https://www.fda.gov/regulatory-information/search-fda-guidance-documents/fda-regional-implementation-guide-e2br3-electronic-transmission-individual-case-safety-reports-drug |
| FAERS Electronic Submissions | https://www.fda.gov/drugs/fdas-adverse-event-reporting-system-faers/fda-adverse-event-reporting-system-faers-electronic-submissions |

### 10.2 Routing Identifiers Summary

**For USP and API (select test/production in portal):**

| Report Type | Batch Receiver (N.1.4) | Message Receiver (N.2.r.3) |
|-------------|------------------------|---------------------------|
| Postmarket to CDER | ZZFDA | CDER |
| Postmarket to CBER | ZZFDA | CBER |
| Premarket IND to CDER | ZZFDA_PREMKT | CDER_IND |
| Premarket IND to CBER | ZZFDA_PREMKT | CBER_IND |
| IND-exempt BA/BE to CDER | ZZFDA_PREMKT | CDER_IND_EXEMPT_BA_BE |

**For AS2 only:**

| Environment | AS2-To Header |
|-------------|---------------|
| Test | ZZFDATST |
| Production | ZZFDA |

### 10.3 Complete Setup Checklist

**Phase 1: Preparation**
- [ ] E2B(R3) XML generation capability ready
- [ ] Company information gathered
- [ ] Authorized representative identified
- [ ] XML files validated with FDA E2B(R3) Validator

**Phase 2: Registration**
- [ ] ESG NextGen account created
- [ ] Email verified
- [ ] MFA configured
- [ ] Company information entered
- [ ] Non-Repudiation Letter uploaded
- [ ] FDA account approval received

**Phase 3: FAERS Coordination**
- [ ] Introduction email sent to faersesub@fda.hhs.gov
- [ ] Sender Identifier approved by FDA

**Phase 4: Testing**
- [ ] Test XML configured with correct routing IDs
- [ ] Test submission uploaded via USP
- [ ] ACK1 received
- [ ] ACK2 received
- [ ] ACK3 received (successful validation)

**Phase 5: Production**
- [ ] Production approval requested
- [ ] FDA confirmation received
- [ ] First production submission sent
- [ ] Production acknowledgments verified

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2025 | Initial version |
