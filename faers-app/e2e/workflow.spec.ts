/**
 * Workflow E2E Tests
 *
 * Tests for case workflow transitions, assignments, and approvals.
 */

import { test, expect, loginAsAdmin, waitForAppReady, navigateTo } from './electron-setup';

test.describe('Workflow Management', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
    await loginAsAdmin(page);
  });

  test.describe('Workflow Status Display', () => {
    test('should display workflow status badge on case', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Should show Draft status
      await expect(page.locator('[data-testid="workflow-status-badge"]')).toContainText('Draft');
    });

    test('should display available workflow actions', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Should show workflow action bar
      await expect(page.locator('[data-testid="workflow-action-bar"]')).toBeVisible();
    });
  });

  test.describe('Submit for Review', () => {
    test('should submit case for review', async ({ page }) => {
      // Create and fill a complete case
      await page.click('[data-testid="new-case-button"]');

      // Fill required fields (simplified for test)
      await page.selectOption('[data-testid="report-type"]', '1');
      await page.fill('[data-testid="receipt-date"]', '2026-01-15');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      // Submit for review
      await page.click('[data-testid="submit-for-review-button"]');

      // Confirm if dialog appears
      const confirmButton = page.locator('[data-testid="confirm-submit"]');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Status should change
      await expect(page.locator('[data-testid="workflow-status-badge"]')).not.toContainText('Draft');
    });

    test('should require validation before submit', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');

      // Try to submit without required data
      await page.click('[data-testid="submit-for-review-button"]');

      // Should show validation errors or warning
      const errorVisible = await page.locator('[data-testid="validation-errors"], .ant-message-error').isVisible();
      expect(errorVisible).toBeTruthy();
    });
  });

  test.describe('Case Assignment', () => {
    test('should open assignment dialog', async ({ page }) => {
      // Create a case in Data Entry Complete status
      await page.click('[data-testid="new-case-button"]');
      await page.selectOption('[data-testid="report-type"]', '1');
      await page.fill('[data-testid="receipt-date"]', '2026-01-15');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      // Submit for review (to get to assignable state)
      await page.click('[data-testid="submit-for-review-button"]');
      await page.waitForTimeout(500);

      // Click assign button
      await page.click('[data-testid="assign-case-button"]');

      // Assignment dialog should open
      await expect(page.locator('[data-testid="assignment-dialog"]')).toBeVisible();
    });

    test('should assign case to user', async ({ page }) => {
      // Navigate to a case that can be assigned
      // (This test assumes there's already a case in the right state)
      await navigateTo(page, 'case-list');

      // Filter by status that allows assignment
      await page.selectOption('[data-testid="status-filter"]', 'data_entry_complete');
      await page.waitForTimeout(500);

      const caseRows = await page.locator('[data-testid="case-row"]').count();
      if (caseRows > 0) {
        await page.click('[data-testid="case-row"]:first-child');

        await page.click('[data-testid="assign-case-button"]');

        // Select a user
        await page.selectOption('[data-testid="assignee-select"]', { index: 1 });

        // Set priority
        await page.selectOption('[data-testid="priority-select"]', 'high');

        // Submit assignment
        await page.click('[data-testid="confirm-assignment"]');

        // Should show success
        await expect(page.locator('.ant-message-success')).toBeVisible();
      }
    });
  });

  test.describe('My Cases View', () => {
    test('should display My Cases view', async ({ page }) => {
      await navigateTo(page, 'my-cases');

      await expect(page.locator('[data-testid="my-cases-view"]')).toBeVisible();
    });

    test('should show workload summary', async ({ page }) => {
      await navigateTo(page, 'my-cases');

      await expect(page.locator('[data-testid="workload-summary"]')).toBeVisible();
    });

    test('should filter by priority', async ({ page }) => {
      await navigateTo(page, 'my-cases');

      await page.selectOption('[data-testid="priority-filter"]', 'high');
      await page.waitForTimeout(500);

      // Should show filtered results
      await expect(page.locator('[data-testid="my-cases-table"]')).toBeVisible();
    });
  });

  test.describe('Case Approval', () => {
    test('should show approval dialog with signature requirement', async ({ page }) => {
      // Navigate to a case in review
      await navigateTo(page, 'my-cases');

      const caseRows = await page.locator('[data-testid="case-row"][data-status="in_medical_review"]').count();
      if (caseRows > 0) {
        await page.click('[data-testid="case-row"][data-status="in_medical_review"]:first-child');

        // Click approve
        await page.click('[data-testid="approve-button"]');

        // Should show signature dialog
        await expect(page.locator('[data-testid="signature-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="signature-meaning"]')).toBeVisible();
        await expect(page.locator('[data-testid="signature-password"]')).toBeVisible();
      }
    });

    test('should require password for approval signature', async ({ page }) => {
      // Assuming we have a case in review state
      await navigateTo(page, 'my-cases');

      const caseRows = await page.locator('[data-testid="case-row"][data-status="in_medical_review"]').count();
      if (caseRows > 0) {
        await page.click('[data-testid="case-row"][data-status="in_medical_review"]:first-child');
        await page.click('[data-testid="approve-button"]');

        // Try to sign without password
        await page.click('[data-testid="confirm-signature"]');

        // Should show error
        await expect(page.locator('[data-testid="password-error"], .ant-form-item-explain-error')).toBeVisible();
      }
    });
  });

  test.describe('Case Rejection', () => {
    test('should show rejection dialog', async ({ page }) => {
      await navigateTo(page, 'my-cases');

      const caseRows = await page.locator('[data-testid="case-row"][data-status="in_medical_review"]').count();
      if (caseRows > 0) {
        await page.click('[data-testid="case-row"][data-status="in_medical_review"]:first-child');

        await page.click('[data-testid="reject-button"]');

        // Should show rejection dialog
        await expect(page.locator('[data-testid="rejection-dialog"]')).toBeVisible();
      }
    });

    test('should require reason for rejection', async ({ page }) => {
      await navigateTo(page, 'my-cases');

      const caseRows = await page.locator('[data-testid="case-row"][data-status="in_medical_review"]').count();
      if (caseRows > 0) {
        await page.click('[data-testid="case-row"][data-status="in_medical_review"]:first-child');
        await page.click('[data-testid="reject-button"]');

        // Try to reject without reason
        await page.click('[data-testid="confirm-rejection"]');

        // Should show error
        await expect(page.locator('[data-testid="reason-error"], .ant-form-item-explain-error')).toBeVisible();
      }
    });
  });

  test.describe('Comments', () => {
    test('should display comments section', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');
      await page.click('[data-testid="nav-comments"]');

      await expect(page.locator('[data-testid="comments-section"]')).toBeVisible();
    });

    test('should add a comment', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      await page.click('[data-testid="nav-comments"]');

      await page.selectOption('[data-testid="comment-type"]', 'general');
      await page.fill('[data-testid="comment-input"]', 'This is a test comment');
      await page.click('[data-testid="add-comment-button"]');

      // Comment should appear in list
      await expect(page.locator('[data-testid="comment-list"]')).toContainText('This is a test comment');
    });
  });

  test.describe('Notes', () => {
    test('should display notes section', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');
      await page.click('[data-testid="nav-notes"]');

      await expect(page.locator('[data-testid="notes-section"]')).toBeVisible();
    });

    test('should add a personal note', async ({ page }) => {
      await page.click('[data-testid="new-case-button"]');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      await page.click('[data-testid="nav-notes"]');

      await page.selectOption('[data-testid="note-visibility"]', 'personal');
      await page.fill('[data-testid="note-input"]', 'My personal note');
      await page.click('[data-testid="add-note-button"]');

      // Note should appear in list
      await expect(page.locator('[data-testid="note-list"]')).toContainText('My personal note');
    });

    test('should resolve a note', async ({ page }) => {
      // Create case with note
      await page.click('[data-testid="new-case-button"]');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      await page.click('[data-testid="nav-notes"]');
      await page.fill('[data-testid="note-input"]', 'Note to resolve');
      await page.click('[data-testid="add-note-button"]');
      await page.waitForTimeout(500);

      // Resolve the note
      await page.click('[data-testid="resolve-note-button"]:first-child');

      // Note should be marked as resolved
      await expect(page.locator('[data-testid="note-item"]:first-child')).toHaveClass(/resolved/);
    });
  });
});
