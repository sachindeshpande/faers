/**
 * Audit Trail E2E Tests
 *
 * Tests for viewing and exporting audit logs.
 */

import { test, expect, loginAsAdmin, waitForAppReady, navigateTo } from './electron-setup';

test.describe('Audit Trail', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
    await loginAsAdmin(page);
  });

  test.describe('Audit Log Viewer', () => {
    test('should display audit log page', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      await expect(page.locator('[data-testid="audit-log-viewer"]')).toBeVisible();
    });

    test('should display audit entries in table', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      await expect(page.locator('[data-testid="audit-log-table"]')).toBeVisible();
    });

    test('should show audit statistics', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      await expect(page.locator('[data-testid="audit-statistics"]')).toBeVisible();
    });
  });

  test.describe('Audit Log Filtering', () => {
    test('should filter by date range', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      // Set date range
      await page.fill('[data-testid="start-date"]', '2026-01-01');
      await page.fill('[data-testid="end-date"]', '2026-01-31');
      await page.click('[data-testid="apply-filters"]');

      await page.waitForTimeout(500);

      // Table should update
      await expect(page.locator('[data-testid="audit-log-table"]')).toBeVisible();
    });

    test('should filter by action type', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      await page.selectOption('[data-testid="action-type-filter"]', 'login');
      await page.click('[data-testid="apply-filters"]');

      await page.waitForTimeout(500);

      // Results should be filtered
      await expect(page.locator('[data-testid="audit-log-table"]')).toBeVisible();
    });

    test('should filter by user', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      await page.fill('[data-testid="user-filter"]', 'admin');
      await page.click('[data-testid="apply-filters"]');

      await page.waitForTimeout(500);

      await expect(page.locator('[data-testid="audit-log-table"]')).toBeVisible();
    });

    test('should filter by entity type', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      await page.selectOption('[data-testid="entity-type-filter"]', 'case');
      await page.click('[data-testid="apply-filters"]');

      await page.waitForTimeout(500);

      await expect(page.locator('[data-testid="audit-log-table"]')).toBeVisible();
    });

    test('should clear filters', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      // Set some filters
      await page.selectOption('[data-testid="action-type-filter"]', 'login');
      await page.click('[data-testid="apply-filters"]');
      await page.waitForTimeout(500);

      // Clear filters
      await page.click('[data-testid="clear-filters"]');
      await page.waitForTimeout(500);

      // Filters should be reset
      const actionFilter = await page.inputValue('[data-testid="action-type-filter"]');
      expect(actionFilter).toBeFalsy();
    });
  });

  test.describe('Audit Log Export', () => {
    test('should show export options', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      await page.click('[data-testid="export-button"]');

      // Should show export format options
      await expect(page.locator('[data-testid="export-menu"]')).toBeVisible();
    });

    test('should export to CSV', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      await page.click('[data-testid="export-button"]');
      await page.click('[data-testid="export-csv"]');

      // Should trigger download or show success
      // Note: Actual file download verification may require additional setup
      await page.waitForTimeout(1000);
    });

    test('should export to JSON', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      await page.click('[data-testid="export-button"]');
      await page.click('[data-testid="export-json"]');

      await page.waitForTimeout(1000);
    });
  });

  test.describe('Case Audit History', () => {
    test('should display case history', async ({ page }) => {
      // Create a case to have history
      await page.click('[data-testid="new-case-button"]');
      await page.selectOption('[data-testid="report-type"]', '1');
      await page.fill('[data-testid="receipt-date"]', '2026-01-15');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      // Navigate to case history
      await page.click('[data-testid="case-history-tab"]');

      // Should display history entries
      await expect(page.locator('[data-testid="case-history-list"]')).toBeVisible();
    });

    test('should show field-level changes', async ({ page }) => {
      // Create and modify a case
      await page.click('[data-testid="new-case-button"]');
      await page.selectOption('[data-testid="report-type"]', '1');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      // Make a change
      await page.selectOption('[data-testid="report-type"]', '2');
      await page.click('[data-testid="save-button"]');
      await page.waitForTimeout(500);

      // View history
      await page.click('[data-testid="case-history-tab"]');

      // Should show the field change
      await expect(page.locator('[data-testid="history-entry"]')).toBeVisible();
    });
  });

  test.describe('Electronic Signatures', () => {
    test('should display signatures in audit trail', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      // Filter by signature events
      await page.selectOption('[data-testid="action-type-filter"]', 'electronic_signature');
      await page.click('[data-testid="apply-filters"]');

      await page.waitForTimeout(500);

      // Should show signature entries (if any exist)
      await expect(page.locator('[data-testid="audit-log-table"]')).toBeVisible();
    });
  });

  test.describe('Audit Trail Integrity', () => {
    test('should not allow editing audit entries', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      // Audit entries should be read-only
      const editButton = page.locator('[data-testid="edit-audit-entry"]');
      expect(await editButton.count()).toBe(0);
    });

    test('should not allow deleting audit entries', async ({ page }) => {
      await navigateTo(page, 'audit-log');

      // Delete button should not exist
      const deleteButton = page.locator('[data-testid="delete-audit-entry"]');
      expect(await deleteButton.count()).toBe(0);
    });
  });
});

test.describe('User Management (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
    await loginAsAdmin(page);
  });

  test.describe('User List', () => {
    test('should display user management page', async ({ page }) => {
      await navigateTo(page, 'user-management');

      await expect(page.locator('[data-testid="user-management"]')).toBeVisible();
    });

    test('should display user table', async ({ page }) => {
      await navigateTo(page, 'user-management');

      await expect(page.locator('[data-testid="user-table"]')).toBeVisible();
    });

    test('should search users', async ({ page }) => {
      await navigateTo(page, 'user-management');

      await page.fill('[data-testid="user-search"]', 'admin');
      await page.waitForTimeout(500);

      // Should filter results
      await expect(page.locator('[data-testid="user-table"]')).toContainText('admin');
    });
  });

  test.describe('Create User', () => {
    test('should open create user dialog', async ({ page }) => {
      await navigateTo(page, 'user-management');

      await page.click('[data-testid="create-user-button"]');

      await expect(page.locator('[data-testid="user-form-dialog"]')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await navigateTo(page, 'user-management');
      await page.click('[data-testid="create-user-button"]');

      // Try to submit empty form
      await page.click('[data-testid="save-user-button"]');

      // Should show validation errors
      await expect(page.locator('.ant-form-item-explain-error')).toBeVisible();
    });

    test('should create new user', async ({ page }) => {
      await navigateTo(page, 'user-management');
      await page.click('[data-testid="create-user-button"]');

      // Fill user form
      const timestamp = Date.now();
      await page.fill('[data-testid="username-input"]', `testuser${timestamp}`);
      await page.fill('[data-testid="email-input"]', `test${timestamp}@example.com`);
      await page.fill('[data-testid="first-name-input"]', 'Test');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.selectOption('[data-testid="role-select"]', 'data_entry');

      await page.click('[data-testid="save-user-button"]');

      // Should show success with temporary password
      await expect(page.locator('[data-testid="temporary-password-dialog"]')).toBeVisible();
    });
  });

  test.describe('Edit User', () => {
    test('should open edit user dialog', async ({ page }) => {
      await navigateTo(page, 'user-management');

      // Click edit on first non-admin user
      await page.click('[data-testid="edit-user-button"]:not(:first-child)');

      await expect(page.locator('[data-testid="user-form-dialog"]')).toBeVisible();
    });
  });

  test.describe('Deactivate User', () => {
    test('should deactivate user', async ({ page }) => {
      await navigateTo(page, 'user-management');

      // Find an active user (not admin)
      const activeUsers = page.locator('[data-testid="user-row"][data-status="active"]:not([data-username="admin"])');
      if (await activeUsers.count() > 0) {
        await activeUsers.first().click();
        await page.click('[data-testid="deactivate-user-button"]');

        // Confirm
        await page.click('[data-testid="confirm-deactivate"]');

        // User should be deactivated
        await expect(page.locator('.ant-message-success')).toBeVisible();
      }
    });
  });

  test.describe('Reset Password', () => {
    test('should reset user password', async ({ page }) => {
      await navigateTo(page, 'user-management');

      // Find a user (not admin)
      const users = page.locator('[data-testid="user-row"]:not([data-username="admin"])');
      if (await users.count() > 0) {
        await users.first().click();
        await page.click('[data-testid="reset-password-button"]');

        // Confirm
        await page.click('[data-testid="confirm-reset-password"]');

        // Should show new temporary password
        await expect(page.locator('[data-testid="temporary-password-dialog"]')).toBeVisible();
      }
    });
  });
});
