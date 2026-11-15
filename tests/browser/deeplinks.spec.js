// Deep links (section 3.1): ?lab=, ?lesson=, unknown slugs, hash routes, ?welcome, and the landing section.
const { test, expect } = require('@playwright/test');
const { seed, watch } = require('./helpers');

test('?lab=static-routing opens that lab and cleans the URL', async ({ page }) => {
  await seed(page);
  await page.goto('/?lab=static-routing');
  await expect(page).toHaveURL(/\/#\/labs\/static-routing$/);
  expect(new URL(page.url()).search).toBe('');
  await expect(page.locator('.con__prompt')).toHaveText('R1>');
  await expect(page.locator('#landing')).toBeHidden();
});

test('?lesson= opens the lesson and an unknown slug lands on the list with a toast', async ({ page }) => {
  await seed(page);
  await page.goto('/?lesson=static-routing');
  await expect(page).toHaveURL(/#\/lessons\/static-routing$/);
  await page.goto('/?lab=no-such-lab');
  await expect(page).toHaveURL(/#\/labs$/);
  await expect(page.getByText('That link is out of date.')).toBeVisible();
  await page.goto('/?lesson=%3Cimg%20src%3Dx%3E');
  await expect(page).toHaveURL(/#\/lessons$/);
  await page.goto('/#/labs/also-not-a-lab');
  await expect(page).toHaveURL(/#\/labs$/);
});

test('a first visit shows the landing section; Start goes Home; a second visit does not show it', async ({ page }) => {
  const errors = watch(page);
  await page.goto('/');
  await expect(page.locator('#landing')).toBeVisible();
  await expect(page.locator('#app')).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: 'Learn the CCNA by doing it.' })).toBeVisible();
  await expect(page.locator('#landing [data-w="labs"]')).toHaveText(String(await page.evaluate(() => L4N.data.labs.length)));
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#screen[data-screen="home"]')).toBeVisible();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#landing')).toBeHidden();
  expect(errors()).toEqual([]);
});

test('Esc leaves the landing section; ?welcome always shows it; Settings can show it again', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#landing')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toBeVisible();
  await page.goto('/?welcome');
  await expect(page.locator('#landing')).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
  await page.keyboard.press('Escape');
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Show the landing page again' }).click();
  await expect(page.locator('#landing')).toBeVisible();
});

test('a deep link on a first visit skips the landing section', async ({ page }) => {
  await page.goto('/?lab=vlans-and-access-ports');
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page.locator('.con__prompt')).toHaveText('SW1>');
  await page.goto('/#/labs');
  await expect(page.locator('#landing')).toBeHidden();
});
