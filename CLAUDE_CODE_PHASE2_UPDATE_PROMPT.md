# Claude Code Prompt: Phase 2 Documentation Update

## Context

The Phase 2 requirements document incorrectly referenced "FDA Safety Reporting Portal (SRP)" for XML file uploads. However, SRP does NOT accept XML file uploads - it's only for manual data entry via web forms.

The correct portal for XML file uploads is **FDA ESG NextGen Unified Submission Portal (USP)**.

Additionally, Phase 2 was missing the ability to generate **Test vs Production** XML exports with different routing identifiers.

## Changes Required

### Part 1: Documentation/UI Text Updates (No Logic Change)

| Location | Change From | Change To |
|----------|-------------|-----------|
| UI labels/text | "SRP" | "ESG NextGen USP" or "FDA" |
| Help text | "Safety Reporting Portal" | "ESG NextGen Unified Submission Portal" |
| URLs | safetyreporting.hhs.gov | fda.gov/industry/electronic-submissions-gateway |
| Field labels | "SRP confirmation number" | "ESG Core ID / confirmation number" |

### Part 2: New Feature - Test/Production Mode (Code Change Required)

Add the ability to generate Test vs Production XML exports.

#### 2.1 New Settings

Add to application settings:

```
Submission Environment: [Test] / [Production]
Report Type: [Postmarket] / [Premarket]
```

Default: Test mode, Postmarket

#### 2.2 XML Routing Identifiers

When generating XML, set the Batch Receiver element (N.1.4) based on settings:

| Environment | Report Type | Batch Receiver (N.1.4) Value |
|-------------|-------------|------------------------------|
| Test        | Postmarket  | `ZZFDA`                      |
| Test        | Premarket   | `ZZFDA_PREMKT`               |
| Production  | Postmarket  | `FDA_AERS`                   |
| Production  | Premarket   | (appropriate premarket ID)   |

**XML Location:** The Batch Receiver is in the ICSR message header:
```xml
<MCCI_IN200100UV01>
  <receiver>
    <device>
      <id>
        <root>2.16.840.1.113883.3.989.2.1.3.14</root>
        <extension>ZZFDA</extension>  <!-- This value changes -->
      </id>
    </device>
  </receiver>
</MCCI_IN200100UV01>
```

#### 2.3 UI Changes

**Environment Indicator:**
- Add visible indicator showing current mode (Test/Production)
- Test mode: Show "TEST MODE" banner/badge in distinct color (orange/yellow)
- Production mode: Subtle "Production" indicator

**Settings Screen:**
- Add environment selection (Test/Production radio buttons)
- Add report type selection (Postmarket/Premarket)
- Show warning when switching to Production

**Export Dialog:**
- Show current environment
- Allow environment change before export
- Production mode: Show confirmation warning

**Filename:**
- Test mode: Include `_TEST` suffix (e.g., `COMPANY123_20260115_001_TEST.xml`)
- Production mode: No suffix (e.g., `COMPANY123_20260115_001.xml`)

**README.txt:**
- Test mode: Include "THIS IS A TEST SUBMISSION" notice
- Production mode: Standard instructions

#### 2.4 Production Mode Confirmation

First time switching to Production (or first Production export), show:

```
⚠️ Production Mode

You are switching to PRODUCTION mode.

Exports will generate XML for submission to the live FDA FAERS database.

Make sure you have:
✓ Successfully completed test submissions to FDA
✓ Received FDA approval for production access
✓ Verified your sender configuration is correct

[ ] I understand this will submit to the live FDA system

[Cancel] [Confirm]
```

Checkbox must be checked to enable Confirm button.

#### 2.5 Submission History

Record environment with each export:
- Add field: `environment` (test/production)
- Display in history: "Exported (TEST)" or "Exported (PRODUCTION)"

## Implementation Checklist

### Part 1: Text Updates
- [ ] Update README.txt template with ESG NextGen USP URL
- [ ] Update export confirmation dialog text
- [ ] Update help/guidance section
- [ ] Update field label "SRP confirmation" → "ESG Core ID"
- [ ] Search codebase for "SRP" and update all references

### Part 2: Test/Production Mode
- [ ] Add settings for environment (Test/Production)
- [ ] Add settings for report type (Postmarket/Premarket)
- [ ] Update XML generation to use correct Batch Receiver based on settings
- [ ] Add environment indicator to main UI
- [ ] Add environment selection to settings screen
- [ ] Add environment display to export dialog
- [ ] Implement production mode confirmation dialog
- [ ] Update filename generation to include _TEST suffix for test mode
- [ ] Update README.txt generation to indicate test vs production
- [ ] Update submission history to record environment
- [ ] Default new installations to Test mode

## Testing

After implementation:

1. **Test Mode Export:**
   - Verify XML contains `<extension>ZZFDA</extension>` for Batch Receiver
   - Verify filename includes `_TEST` suffix
   - Verify README.txt says "TEST SUBMISSION"
   - Verify UI shows "TEST MODE" indicator

2. **Production Mode Export:**
   - Verify confirmation dialog appears first time
   - Verify XML contains `<extension>FDA_AERS</extension>` for Batch Receiver
   - Verify filename does NOT include `_TEST`
   - Verify README.txt has standard instructions

3. **Validation:**
   - Export test XML and upload to FDA E2B(R3) Validator
   - Verify no routing-related errors

## Reference

- FDA E2B(R3) Validator: https://faers2-validator.preprod.fda.gov/LSMV/Validator
- ESG NextGen Portal: https://www.fda.gov/industry/electronic-submissions-gateway
- Test Batch Receiver: `ZZFDA` (postmarket) or `ZZFDA_PREMKT` (premarket)
- Production Batch Receiver: `FDA_AERS`
