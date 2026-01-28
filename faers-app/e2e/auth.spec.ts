/**
 * Authentication E2E Tests
 *
 * Tests for login, logout, password change, and session management.
 */

import { test, expect, loginAsAdmin, login, logout, waitForAppReady } from './electron-setup';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
  });

  test('should display login form on initial launch', async ({ page }) => {
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginAsAdmin(page);

    // Should see main layout after login
    await expect(page.locator('[data-testid="main-layout"]')).toBeVisible();

    // Should see user info in header
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await login(page, 'admin', 'wrongpassword');

    // Should show error message
    await expect(page.locator('.ant-message-error, [data-testid="login-error"]')).toBeVisible();

    // Should remain on login page
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should show error for non-existent user', async ({ page }) => {
    await login(page, 'nonexistentuser', 'anypassword');

    await expect(page.locator('.ant-message-error, [data-testid="login-error"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);

    // Should return to login page
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should remember username when checkbox is checked', async ({ page }) => {
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.check('[data-testid="remember-username"]');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Wait for error
    await page.waitForTimeout(1000);

    // Username should still be filled
    const usernameValue = await page.inputValue('[data-testid="username-input"]');
    expect(usernameValue).toBe('admin');
  });

  test('should track failed login attempts', async ({ page }) => {
    // Attempt multiple failed logins
    for (let i = 0; i < 3; i++) {
      await login(page, 'admin', 'wrongpassword');
      await page.waitForTimeout(500);
    }

    // Should show remaining attempts message
    const errorText = await page.textContent('.ant-message-error, [data-testid="login-error"]');
    expect(errorText).toBeTruthy();
  });
});

test.describe('Password Change', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
    await loginAsAdmin(page);
  });

  test('should open change password dialog', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="change-password-button"]');

    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();
  });

  test('should show password requirements', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="change-password-button"]');

    await expect(page.locator('[data-testid="password-requirements"]')).toBeVisible();
  });

  test('should validate password policy', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="change-password-button"]');

    // Enter weak password
    await page.fill('[data-testid="new-password-input"]', 'weak');

    // Should show validation errors
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('should require password confirmation to match', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="change-password-button"]');

    await page.fill('[data-testid="new-password-input"]', 'NewPassword123!@#');
    await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!@#');

    // Should show mismatch error
    await expect(page.locator('[data-testid="confirm-password-error"]')).toBeVisible();
  });
});

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
  });

  test('should maintain session across navigation', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to different sections
    await page.click('[data-testid="nav-case-list"]');
    await page.waitForTimeout(500);

    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForTimeout(500);

    // Should still be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});
