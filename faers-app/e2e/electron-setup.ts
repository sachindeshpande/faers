/**
 * Electron E2E Test Setup
 *
 * Utility functions for launching and interacting with the Electron app.
 */

import { _electron as electron, ElectronApplication, Page } from 'playwright';
import { test as base } from '@playwright/test';
import path from 'path';

// Extend base test with Electron fixtures
export const test = base.extend<{
  electronApp: ElectronApplication;
  page: Page;
}>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    // Build the app first (assumes 'npm run build' has been run)
    const appPath = path.join(__dirname, '..');

    // Launch Electron app - pass the app directory, not the main file
    const electronApp = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_RUN_AS_NODE: ''  // Ensure it's not set
      }
    });

    await use(electronApp);

    // Clean up
    await electronApp.close();
  },

  page: async ({ electronApp }, use) => {
    // Wait for the first window to open
    const page = await electronApp.firstWindow();

    // Wait for the DOM to be ready
    await page.waitForLoadState('domcontentloaded');

    // Wait for network to settle (IPC calls to complete)
    await page.waitForLoadState('networkidle');

    // Give React time to mount and render
    await page.waitForTimeout(3000);

    await use(page);
  }
});

export { expect } from '@playwright/test';

/**
 * Helper to wait for the app to be fully loaded
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // First wait for any of the app states to appear (loading, login, or main)
  await page.waitForSelector(
    '[data-testid="loading-screen"], [data-testid="login-form"], [data-testid="main-layout"]',
    { timeout: 30000 }
  );

  // If we hit the loading screen, wait for it to transition to login or main
  const loadingScreen = page.locator('[data-testid="loading-screen"]');
  if (await loadingScreen.isVisible()) {
    await page.waitForSelector('[data-testid="login-form"], [data-testid="main-layout"]', {
      timeout: 30000
    });
  }
}

// Test credentials - can be overridden via environment variables
export const TEST_ADMIN_USERNAME = process.env.TEST_ADMIN_USERNAME || 'admin';
export const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'DeepQuence@1234';

/**
 * Helper to login to the app
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="login-form"]');

  await page.fill('[data-testid="username-input"]', TEST_ADMIN_USERNAME);
  await page.fill('[data-testid="password-input"]', TEST_ADMIN_PASSWORD);
  await page.click('[data-testid="login-button"]');

  // Wait for login to complete
  await page.waitForSelector('[data-testid="main-layout"]', { timeout: 10000 });
}

/**
 * Helper to login with specific credentials
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  await page.waitForSelector('[data-testid="login-form"]');

  await page.fill('[data-testid="username-input"]', username);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
}

/**
 * Helper to logout
 */
export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForSelector('[data-testid="login-form"]');
}

/**
 * Helper to navigate to a specific section
 */
export async function navigateTo(page: Page, section: string): Promise<void> {
  await page.click(`[data-testid="nav-${section}"]`);
  await page.waitForTimeout(500); // Wait for navigation animation
}

/**
 * Helper to create a new case
 */
export async function createCase(page: Page): Promise<string> {
  await page.click('[data-testid="new-case-button"]');
  await page.waitForSelector('[data-testid="case-form"]');

  // Get the case ID from the form or URL
  const caseId = await page.getAttribute('[data-testid="case-id"]', 'data-value') || 'CASE-UNKNOWN';
  return caseId;
}
