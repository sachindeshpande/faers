import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for FAERS App E2E Tests
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Electron tests need sequential execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Electron
  reporter: 'html',
  timeout: 60000, // 60 seconds per test

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'electron',
      testMatch: /.*\.spec\.ts/,
      use: {
        // Electron-specific configuration will be handled in test setup
      }
    }
  ]
});
