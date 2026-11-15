// The Labs list: keyboard (/, J, K, Enter), filters that combine, the empty state, the detail pane.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('Labs list keyboard and filters', async ({ page }) => {
  await open(page, '#/labs');
  await page.locator('.lst__main').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox', { name: 'Filter labs' })).toBeFocused();
  await page.keyboard.type('ospf');
  await expect(page.locator('.lst .row').first()).toContainText(/OSPF/i);
  const count = await page.locator('.lst .row').count();
  expect(count).toBeGreaterThan(2);
  // objective numbers match too
  await page.getByRole('searchbox', { name: 'Filter labs' }).fill('3.4');
  await expect(page.locator('.lst .row').first()).toBeVisible();
  // filters combine: type Incident and the text
  await page.getByRole('searchbox', { name: 'Filter labs' }).fill('ospf');
  await page.getByRole('combobox', { name: 'Type' }).selectOption('incident');
  const inc = await page.locator('.lst .row').count();
  expect(inc).toBeGreaterThan(0);
  expect(inc).toBeLessThan(count);
  for (const id of await page.locator('.lst .row .row__id').allTextContents()) expect(id).toMatch(/^INC-/);
  // the empty state, and clearing it
  await page.getByRole('combobox', { name: 'Status' }).selectOption('done');
  await expect(page.getByText('No labs match.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('searchbox', { name: 'Filter labs' })).toHaveValue('');
  // J, K and Enter
  await page.locator('.lst .row').first().click();
  await expect(page.locator('.lst__detail h2')).toHaveText('Basic device setup');
  await page.keyboard.press('j');
  await expect(page.locator('.lst__detail h2')).toHaveText('Switch management access');
  await page.keyboard.press('j'); await page.keyboard.press('k');
  await expect(page.locator('.lst__detail h2')).toHaveText('Switch management access');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/labs\/switch-management-access$/);
});

test('Group by Type and Exam topic; the palette opens a lab by objective number', async ({ page }) => {
  await open(page, '#/labs');
  await page.getByRole('combobox', { name: 'Group by' }).selectOption('type');
  await expect(page.locator('.list__group').first()).toContainText('Build labs');
  await page.getByRole('combobox', { name: 'Group by' }).selectOption('topic');
  await expect(page.locator('.list__group').first()).toContainText('Network fundamentals');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
  await page.keyboard.type('open lab 3.4');
  await expect(page.locator('.pal__row').first()).toContainText('Open lab:');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/labs\/[a-z0-9-]+$/);
});
