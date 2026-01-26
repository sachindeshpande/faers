# Claude Code Prompt: Update Phase 2 Implementation

## Context

Phase 2 has already been implemented based on the original requirements. This prompt describes the changes needed to update the existing implementation.

**Summary of Changes Required:**
1. **Text Updates**: Replace "SRP" references with "ESG NextGen USP"
2. **New Feature**: Add Test/Production mode selection (workflow tracking only)
3. **Correction**: The XML routing identifiers are the SAME for test and production (the distinction is made in the FDA portal, not the XML)

---

## Part 1: Text/Documentation Updates (Find & Replace)

Search the codebase and update all occurrences:

| Find | Replace With |
|------|--------------|
| `SRP` | `ESG NextGen USP` or `FDA` (context-dependent) |
| `Safety Reporting Portal` | `ESG NextGen Unified Submission Portal` |
| `safetyreporting.hhs.gov` | `fda.gov/industry/electronic-submissions-gateway` |
| `SRP confirmation number` | `ESG Core ID` |
| `SRP confirmation` | `FDA confirmation` |

**Files likely affected:**
- README.txt template (in export package)
- Help/guidance text
- UI labels and dialogs
- Confirmation messages
- Any hardcoded URLs

---

## Part 2: New Feature - Test/Production Mode

### 2.1 Purpose

Add a setting to track whether exports are intended for test or production submission. This is for **workflow management only** - it does NOT change the XML content (the routing identifiers are the same for test and production when using USP).

### 2.2 New Settings to Add

Add to application settings/configuration:

```
Submission Mode: [Test] / [Production]    (default: Test)
Report Type: [Postmarket] / [Premarket]   (default: Postmarket)
Target Center: [CDER] / [CBER]            (default: CDER)
```

### 2.3 Data Model Changes

Add fields to track submission mode:

```javascript
// Settings/Configuration
{
  submissionMode: 'test' | 'production',  // default: 'test'
  reportType: 'postmarket' | 'premarket', // default: 'postmarket'
  targetCenter: 'CDER' | 'CBER'           // default: 'CDER'
}

// Export History Record - add field
{
  // existing fields...
  exportedAt: Date,
  filename: string,
  // NEW field
  submissionMode: 'test' | 'production'
}
```

### 2.4 UI Changes

#### 2.4.1 Environment Indicator (Header/Banner)

Add a visible indicator showing current mode:

**Test Mode:**
```
┌─────────────────────────────────────────────┐
│ ⚠️ TEST MODE - Exports are for test submission │
└─────────────────────────────────────────────┘
```
- Background color: Orange/Yellow (#FFA500 or #FFD700)
- Visible on main screen and export dialogs

**Production Mode:**
```
┌──────────────────────────────┐
│ ✓ Production Mode            │
└──────────────────────────────┘
```
- Subtle indicator, normal colors
- Less prominent than test mode

#### 2.4.2 Settings Screen

Add new section to settings:

```
FDA Submission Settings
───────────────────────
Submission Mode:  ○ Test  ● Production
                  
Report Type:      ● Postmarket  ○ Premarket

Target Center:    ● CDER  ○ CBER

[Save Settings]
```

When switching from Test to Production, show confirmation dialog (see 2.4.4).

#### 2.4.3 Export Dialog

Update export dialog to show current mode:

```
┌─────────────────────────────────────────────┐
│ Export for FDA Submission                    │
├─────────────────────────────────────────────┤
│                                             │
│ Case: [Case ID]                             │
│ Status: Ready for Export                    │
│                                             │
│ Submission Mode: TEST                       │
│ Report Type: Postmarket                     │
│ Target Center: CDER                         │
│                                             │
│ [Change Settings]                           │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ After export, upload to FDA ESG NextGen │ │
│ │ USP and select "Test Submission"        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│        [Cancel]  [Export]                   │
└─────────────────────────────────────────────┘
```

For Production mode, the instruction box says:
```
│ │ After export, upload to FDA ESG NextGen │ │
│ │ USP and select "Production Submission"  │ │
```

#### 2.4.4 Production Mode Confirmation

When user switches to Production mode (first time), show:

```
┌─────────────────────────────────────────────┐
│ ⚠️ Switch to Production Mode?               │
├─────────────────────────────────────────────┤
│                                             │
│ You are switching to PRODUCTION mode.       │
│                                             │
│ When you upload exports to FDA ESG NextGen  │
│ USP, you should select "Production          │
│ Submission" which will submit to the live   │
│ FAERS database.                             │
│                                             │
│ Make sure you have:                         │
│ ✓ Successfully completed test submissions   │
│ ✓ Received FDA approval for production      │
│ ✓ Verified your sender configuration        │
│                                             │
│ [ ] I understand and want to proceed        │
│                                             │
│        [Cancel]  [Confirm]                  │
└─────────────────────────────────────────────┘
```

- Checkbox must be checked to enable "Confirm" button
- Store flag that user has confirmed (don't show again)

### 2.5 Filename Changes

Update filename generation:

**Test Mode:**
```
{SenderID}_{YYYYMMDD}_{Sequence}_TEST.xml
Example: ACMEPHARMA_20260125_001_TEST.xml
```

**Production Mode:**
```
{SenderID}_{YYYYMMDD}_{Sequence}.xml
Example: ACMEPHARMA_20260125_001.xml
```

### 2.6 README.txt Changes

Update the README.txt template in export packages:

**Test Mode README.txt:**
```
FAERS Export Package
====================
Case ID: {caseId}
Export Date: {exportDate}
Submission Mode: TEST

THIS IS A TEST SUBMISSION
=========================
When uploading to FDA ESG NextGen USP, select "Test Submission".
Test submissions are validated by FDA but do not enter the live FAERS database.

Next Steps:
1. Validate XML (optional): https://faers2-validator.preprod.fda.gov/LSMV/Validator
2. Log into FDA ESG NextGen: https://www.fda.gov/industry/electronic-submissions-gateway
3. Click "Industry USP Log In"
4. Click "New Submission" → Select "Test Submission"
5. Upload the XML file: {filename}
6. Record the ESG Core ID in your application

Files in this package:
- {filename} (E2B(R3) XML)
- README.txt (this file)
```

**Production Mode README.txt:**
```
FAERS Export Package
====================
Case ID: {caseId}
Export Date: {exportDate}
Submission Mode: PRODUCTION

PRODUCTION SUBMISSION
=====================
When uploading to FDA ESG NextGen USP, select "Production Submission".
This will submit to the live FAERS database.

Next Steps:
1. Log into FDA ESG NextGen: https://www.fda.gov/industry/electronic-submissions-gateway
2. Click "Industry USP Log In"
3. Click "New Submission" → Select "Production Submission"
4. Upload the XML file: {filename}
5. Record the ESG Core ID in your application

Files in this package:
- {filename} (E2B(R3) XML)
- README.txt (this file)
```

### 2.7 Submission History Display

Update history/audit log to show submission mode:

```
Export History
──────────────
Date                 | Filename                              | Mode
2026-01-25 10:30:00 | ACMEPHARMA_20260125_001_TEST.xml      | Test
2026-01-24 14:15:00 | ACMEPHARMA_20260124_001.xml           | Production
```

---

## Part 3: XML Generation - NO CHANGES NEEDED

**Important:** The XML routing identifiers do NOT change between test and production for USP submissions. The same values are used:

| Report Type | Batch Receiver (N.1.4) | Message Receiver (N.2.r.3) |
|-------------|------------------------|---------------------------|
| Postmarket to CDER | `ZZFDA` | `CDER` |
| Postmarket to CBER | `ZZFDA` | `CBER` |
| Premarket to CDER | `ZZFDA_PREMKT` | `CDER_IND` |
| Premarket to CBER | `ZZFDA_PREMKT` | `CBER_IND` |

**However**, if your current implementation uses different values, update to match the above.

Verify your XML generation uses these values in the correct locations:

**Batch Receiver (N.1.4):**
```xml
<receiver typeCode="RCV">
  <device classCode="DEV" determinerCode="INSTANCE">
    <id>
      <root>2.16.840.1.113883.3.989.2.1.3.14</root>
      <extension>ZZFDA</extension>  <!-- Use ZZFDA or ZZFDA_PREMKT -->
    </id>
  </device>
</receiver>
```

**Message Receiver (N.2.r.3):** Should be set based on target center (CDER, CBER, CDER_IND, etc.)

---

## Implementation Checklist

### Text Updates
- [ ] Search for "SRP" in codebase and update to "ESG NextGen USP" or "FDA"
- [ ] Update any hardcoded URLs from safetyreporting.hhs.gov
- [ ] Update README.txt template
- [ ] Update help/guidance text
- [ ] Update confirmation dialog text
- [ ] Update field labels ("SRP confirmation" → "ESG Core ID")

### New Settings
- [ ] Add `submissionMode` setting (test/production)
- [ ] Add `reportType` setting (postmarket/premarket)  
- [ ] Add `targetCenter` setting (CDER/CBER)
- [ ] Default new installations to Test mode
- [ ] Persist settings

### UI Updates
- [ ] Add environment indicator (banner/badge) to main screen
- [ ] Add environment indicator to export dialog
- [ ] Add settings section for FDA submission settings
- [ ] Implement production mode confirmation dialog
- [ ] Update export dialog to show current settings

### Export Changes
- [ ] Update filename generation to add `_TEST` suffix in test mode
- [ ] Update README.txt template with mode-specific content
- [ ] Record submission mode in export history

### History/Tracking
- [ ] Add submissionMode field to export records
- [ ] Display submission mode in history view

### XML Verification
- [ ] Verify Batch Receiver uses `ZZFDA` (postmarket) or `ZZFDA_PREMKT` (premarket)
- [ ] Verify Message Receiver uses correct center value
- [ ] No changes needed for test vs production (same identifiers)

---

## Testing

After implementation:

1. **Test Mode:**
   - Verify "TEST MODE" indicator visible
   - Export a case, verify filename has `_TEST` suffix
   - Verify README.txt says "TEST SUBMISSION"
   - Verify export history shows "Test" mode

2. **Production Mode:**
   - Switch to Production, verify confirmation dialog appears
   - After confirming, verify indicator changes
   - Export a case, verify filename has NO `_TEST` suffix
   - Verify README.txt says "PRODUCTION SUBMISSION"
   - Verify export history shows "Production" mode

3. **Settings Persistence:**
   - Change settings, close app, reopen
   - Verify settings persisted

4. **Text Updates:**
   - Search UI for any remaining "SRP" references
   - Verify all URLs point to ESG NextGen

---

## Summary

| Change Type | Scope | Impact |
|-------------|-------|--------|
| Text updates (SRP → ESG) | UI, help, README | Low risk |
| New settings | Data model, UI | Medium - new feature |
| Filename suffix | Export function | Low risk |
| README.txt template | Export function | Low risk |
| Mode indicator | UI | Low risk |
| Production confirmation | UI | Low risk |
| XML changes | None needed | N/A |

The most significant change is adding the submission mode tracking, but this is purely for workflow management and does not affect the XML content or actual FDA submission process.
