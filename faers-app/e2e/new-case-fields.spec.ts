/**
 * E2E smoke test for the 5 new E2B(R3) case fields added alongside migration 024:
 *   - patientRace         (B.1.7 race NCIt code)             [Patient section]
 *   - patientEthnicity    (B.1.7 ethnicity NCIt code)        [Patient section]
 *   - medicalHistoryText  (D.7.2 free-text history narrative) [Patient section]
 *   - hasConcomitantTherapy (D.7.3 boolean)                   [Patient section]
 *   - localReportTypeCode (C.1.7 15-Day vs 7-Day)             [Report Info section]
 *
 * The case form is multi-section with a left sidebar (Report Info, Patient, etc.),
 * so the spec navigates between sections via sidebar menu items. Form inputs use
 * `.ant-form-item:has-text(...)` selectors because the Form.Items have no `name`
 * prop, so Antd's label↔input ARIA association isn't set up.
 *
 * The default admin password is overridden via TEST_ADMIN_PASSWORD to match
 * authService.ts's actual default ('Admin@123456'), not the stale value in
 * electron-setup.ts.
 *
 *   npm run test:e2e -- e2e/new-case-fields.spec.ts
 *   # or headed:
 *   TEST_ADMIN_PASSWORD='Admin@123456' \
 *     npx playwright test e2e/new-case-fields.spec.ts --headed
 */

import { test, expect, loginAsAdmin, waitForAppReady, createCase } from './electron-setup';

async function navigateToSection(page: import('playwright').Page, section: 'Report Info' | 'Patient') {
  // Case form sidebar: the menuitems use ant-menu-item with visible text.
  await page.locator('.ant-menu-item', { hasText: section }).click();
  await page.waitForTimeout(300);
}

async function selectAntdOption(
  page: import('playwright').Page,
  formItemLabel: string,
  optionText: string
) {
  const formItem = page.locator('.ant-form-item', { hasText: formItemLabel }).first();
  await formItem.locator('.ant-select').click();
  // Antd renders the dropdown into a portal; options live in `.ant-select-dropdown`.
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: optionText })
    .first()
    .click();
}

test.describe('New case fields (migration 024) — smoke test', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
    await loginAsAdmin(page);
  });

  test('populates, persists, and re-reads all 5 new fields', async ({ page }) => {
    // 1. Create a new case — this opens the form on the Report Info section.
    await createCase(page);
    await navigateToSection(page, 'Report Info');

    // 2. Report type (required) + local report type (new).
    await selectAntdOption(page, 'Report Type', 'Spontaneous');
    await selectAntdOption(page, 'Local Report Type (C.1.7)', '7-Day');

    // 3. Switch to the Patient section and fill the 4 demographics fields.
    await navigateToSection(page, 'Patient');

    // Patient sex is required for save.
    await selectAntdOption(page, 'Sex', 'Male');

    await selectAntdOption(page, 'Race', 'Asian');
    await selectAntdOption(page, 'Ethnicity', 'Not Hispanic or Latino');

    const historyItem = page.locator('.ant-form-item', {
      hasText: 'Relevant Medical History and Concurrent Conditions'
    });
    await historyItem.locator('textarea').fill('History of hypertension treated with lisinopril.');

    const concomitantItem = page.locator('.ant-form-item', { hasText: 'Concomitant Therapy' });
    const concomitantSwitch = concomitantItem.locator('.ant-switch');
    if ((await concomitantSwitch.getAttribute('aria-checked')) !== 'true') {
      await concomitantSwitch.click();
    }

    // 4. Save. The top bar's Save button is enabled once required fields are set.
    const saveBtn = page.locator('button', { hasText: 'Save' }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await expect(
      page.locator('.ant-message-success', { hasText: 'Case saved successfully' })
    ).toBeVisible({ timeout: 5000 });

    // 5. Navigate to the case list and re-open the case to force a DB round trip.
    await page.locator('.ant-menu-item', { hasText: 'Case List' }).click();
    await page.waitForTimeout(500);
    // Antd renders a hidden measure-row as the first tr — skip it.
    await page.locator('.ant-table-tbody tr.ant-table-row').first().click();
    // Wait for the form to render again.
    await page.waitForSelector('.ant-menu-item:has-text("Patient")');

    // 6. Assert Report Info side: Local Report Type round-tripped.
    await navigateToSection(page, 'Report Info');
    await expect(
      page.locator('.ant-form-item', { hasText: 'Local Report Type (C.1.7)' }).locator('.ant-select-selection-item')
    ).toContainText('7-Day');

    // 7. Assert Patient side: Race, Ethnicity, History, Concomitant all round-tripped.
    await navigateToSection(page, 'Patient');

    await expect(
      page.locator('.ant-form-item', { hasText: 'Race' }).locator('.ant-select-selection-item')
    ).toContainText('Asian');

    await expect(
      page.locator('.ant-form-item', { hasText: 'Ethnicity' }).locator('.ant-select-selection-item')
    ).toContainText('Not Hispanic or Latino');

    await expect(
      page
        .locator('.ant-form-item', { hasText: 'Relevant Medical History and Concurrent Conditions' })
        .locator('textarea')
    ).toHaveValue('History of hypertension treated with lisinopril.');

    await expect(
      page.locator('.ant-form-item', { hasText: 'Concomitant Therapy' }).locator('.ant-switch')
    ).toHaveAttribute('aria-checked', 'true');
  });
});
