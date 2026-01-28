/**
 * Case Management E2E Tests
 *
 * Tests for creating, editing, validating, and exporting cases.
 */

import { test, expect, loginAsAdmin, waitForAppReady, createCase, navigateTo } from './electron-setup';

test.describe('Case Management', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
    await loginAsAdmin(page);
  });

  test.describe('Case Creation', () => {
    test('should create a new case', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Should navigate to case form
      await expect(page.locator('[data-testid="case-form"]')).toBeVisible();

      // Should have a case ID assigned
      await expect(page.locator('[data-testid="case-id"]')).toBeVisible();
    });

    test('should auto-generate safety report ID', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      const safetyReportId = await page.inputValue('[data-testid="safety-report-id"]');
      expect(safetyReportId).toBeTruthy();
      expect(safetyReportId.length).toBeGreaterThan(0);
    });

    test('should save case with minimal data', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Fill minimum required fields
      await page.selectOption('[data-testid="report-type"]', '1'); // Spontaneous
      await page.fill('[data-testid="receipt-date"]', '2026-01-15');

      // Save
      await page.click('[data-testid="save-button"]');

      // Should show success message
      await expect(page.locator('.ant-message-success')).toBeVisible();
    });
  });

  test.describe('Case List', () => {
    test('should display case list', async ({ page }) => {
      await navigateTo(page, 'case-list');

      await expect(page.locator('[data-testid="case-list-table"]')).toBeVisible();
    });

    test('should filter cases by status', async ({ page }) => {
      await navigateTo(page, 'case-list');

      await page.selectOption('[data-testid="status-filter"]', 'draft');
      await page.waitForTimeout(500);

      // All visible cases should be in draft status
      const statusCells = await page.locator('[data-testid="case-status"]').allTextContents();
      statusCells.forEach(status => {
        expect(status.toLowerCase()).toContain('draft');
      });
    });

    test('should search cases', async ({ page }) => {
      await navigateTo(page, 'case-list');

      await page.fill('[data-testid="search-input"]', 'CASE-');
      await page.waitForTimeout(500);

      // Should show filtered results
      await expect(page.locator('[data-testid="case-list-table"]')).toBeVisible();
    });

    test('should open case when clicked', async ({ page }) => {
      // First create a case
      await page.click('[data-testid="new-case-button"]');
      await page.selectOption('[data-testid="report-type"]', '1');
      await page.fill('[data-testid="receipt-date"]', '2026-01-15');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      // Navigate to case list
      await navigateTo(page, 'case-list');

      // Click on first case
      await page.click('[data-testid="case-row"]:first-child');

      // Should open case form
      await expect(page.locator('[data-testid="case-form"]')).toBeVisible();
    });
  });

  test.describe('Case Editing', () => {
    test('should edit patient information', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Navigate to patient section
      await page.click('[data-testid="nav-patient"]');

      // Fill patient data
      await page.fill('[data-testid="patient-initials"]', 'JD');
      await page.selectOption('[data-testid="patient-sex"]', '1'); // Male
      await page.fill('[data-testid="patient-age"]', '45');
      await page.selectOption('[data-testid="patient-age-unit"]', '801'); // Years

      // Save
      await page.click('[data-testid="save-button"]');

      await expect(page.locator('.ant-message-success')).toBeVisible();
    });

    test('should add reporter', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Navigate to reporter section
      await page.click('[data-testid="nav-reporter"]');

      // Add reporter
      await page.click('[data-testid="add-reporter-button"]');

      await page.selectOption('[data-testid="reporter-qualification"]', '1'); // Physician
      await page.fill('[data-testid="reporter-given-name"]', 'John');
      await page.fill('[data-testid="reporter-family-name"]', 'Doe');

      await page.click('[data-testid="save-reporter-button"]');

      // Should show reporter in list
      await expect(page.locator('[data-testid="reporter-list"]')).toContainText('John Doe');
    });

    test('should add reaction', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Navigate to reactions section
      await page.click('[data-testid="nav-reactions"]');

      // Add reaction
      await page.click('[data-testid="add-reaction-button"]');

      await page.fill('[data-testid="reaction-term"]', 'Rash');
      await page.check('[data-testid="seriousness-hospitalization"]');

      await page.click('[data-testid="save-reaction-button"]');

      // Should show reaction in list
      await expect(page.locator('[data-testid="reaction-list"]')).toContainText('Rash');
    });

    test('should add suspect drug', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Navigate to drugs section
      await page.click('[data-testid="nav-drugs"]');

      // Add drug
      await page.click('[data-testid="add-drug-button"]');

      await page.selectOption('[data-testid="drug-characterization"]', '1'); // Suspect
      await page.fill('[data-testid="drug-name"]', 'Test Drug');
      await page.fill('[data-testid="drug-indication"]', 'Hypertension');

      await page.click('[data-testid="save-drug-button"]');

      // Should show drug in list
      await expect(page.locator('[data-testid="drug-list"]')).toContainText('Test Drug');
    });
  });

  test.describe('Case Validation', () => {
    test('should show validation errors for incomplete case', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Try to validate without required data
      await page.click('[data-testid="validate-button"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
    });

    test('should pass validation for complete case', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Fill all required fields
      // Report
      await page.selectOption('[data-testid="report-type"]', '1');
      await page.fill('[data-testid="receipt-date"]', '2026-01-15');
      await page.check('[data-testid="serious-checkbox"]');
      await page.check('[data-testid="seriousness-hospitalization"]');

      // Patient
      await page.click('[data-testid="nav-patient"]');
      await page.selectOption('[data-testid="patient-sex"]', '1');

      // Reporter
      await page.click('[data-testid="nav-reporter"]');
      await page.click('[data-testid="add-reporter-button"]');
      await page.selectOption('[data-testid="reporter-qualification"]', '1');
      await page.click('[data-testid="save-reporter-button"]');

      // Reaction
      await page.click('[data-testid="nav-reactions"]');
      await page.click('[data-testid="add-reaction-button"]');
      await page.fill('[data-testid="reaction-term"]', 'Rash');
      await page.click('[data-testid="save-reaction-button"]');

      // Drug
      await page.click('[data-testid="nav-drugs"]');
      await page.click('[data-testid="add-drug-button"]');
      await page.selectOption('[data-testid="drug-characterization"]', '1');
      await page.fill('[data-testid="drug-name"]', 'Test Drug');
      await page.click('[data-testid="save-drug-button"]');

      // Narrative
      await page.click('[data-testid="nav-narrative"]');
      await page.fill('[data-testid="case-narrative"]', 'Patient experienced rash after taking Test Drug.');

      // Validate
      await page.click('[data-testid="validate-button"]');

      // Should pass validation (no error panel or success message)
      await expect(page.locator('.ant-message-success')).toBeVisible();
    });
  });

  test.describe('Case Duplication', () => {
    test('should duplicate a case', async ({ page }) => {
      // Create a case first
      await page.click('[data-testid="new-case-button"]');
      await page.selectOption('[data-testid="report-type"]', '1');
      await page.fill('[data-testid="receipt-date"]', '2026-01-15');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      // Navigate to case list
      await navigateTo(page, 'case-list');

      // Right-click on case and duplicate
      await page.click('[data-testid="case-row"]:first-child', { button: 'right' });
      await page.click('[data-testid="duplicate-case"]');

      // Should create new case with copied data
      await expect(page.locator('[data-testid="case-form"]')).toBeVisible();
    });
  });

  test.describe('Case Deletion', () => {
    test('should delete draft case', async ({ page }) => {
      // Create a case
      await page.click('[data-testid="new-case-button"]');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      // Navigate to case list
      await navigateTo(page, 'case-list');

      const initialCount = await page.locator('[data-testid="case-row"]').count();

      // Delete the case
      await page.click('[data-testid="case-row"]:first-child', { button: 'right' });
      await page.click('[data-testid="delete-case"]');

      // Confirm deletion
      await page.click('[data-testid="confirm-delete"]');

      await page.waitForTimeout(500);

      // Case count should decrease
      const finalCount = await page.locator('[data-testid="case-row"]').count();
      expect(finalCount).toBeLessThan(initialCount);
    });
  });
});
