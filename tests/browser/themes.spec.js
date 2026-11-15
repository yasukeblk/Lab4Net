// Themes: dark, light and system on every route; "Console: always dark"; no unstyled flash on load.
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const { ROUTES, open, go } = require('./helpers');
const tokens = fs.readFileSync(path.join(__dirname, '..', '..', 'src/styles/tokens.css'), 'utf8');
const DARK = /:root, \[data-theme="dark"\] \{([^}]+)\}/.exec(tokens)[1], LIGHT = /\[data-theme="light"\] \{([^}]+)\}/.exec(tokens)[1];
const rgb = (block, n) => { const h = new RegExp('--' + n + ':\\s*(#[0-9A-Fa-f]{6})').exec(block)[1]; return 'rgb(' + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')'; };
const bg = page => page.evaluate(() => getComputedStyle(document.querySelector('.main') || document.body).backgroundColor);

for (const [theme, scheme, want] of [['dark', 'light', 'dark'], ['light', 'dark', 'light'], ['system', 'light', 'light'], ['system', 'dark', 'dark']]) {
  test(`theme ${theme} (system ${scheme}) on every route`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, '#/', { theme });
    for (const r of ROUTES) {
      await go(page, r);
      await expect(page.locator('html')).toHaveAttribute('data-theme', want);
      expect(await bg(page), r).toBe(rgb(want === 'dark' ? DARK : LIGHT, 'bg-surface'));
    }
  });
}

test('"Console: always dark" keeps the console dark in the light theme', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: { v: 2, settings: { theme: 'light', consoleTheme: 'dark' }, ui: { landingSeen: true } } });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.con__out')).backgroundColor)).toBe(rgb(DARK, 'bg-console'));
  expect(await bg(page)).toBe(rgb(LIGHT, 'bg-surface'));
  await page.goto('/#/settings');
  await page.getByRole('radio', { name: 'Match theme' }).click();
  await page.goto('/#/labs/static-routing');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.con__out')).backgroundColor)).toBe(rgb(LIGHT, 'bg-console'));
});

test('no unstyled flash: the first paint already has the theme and its colours', async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('lab4net:v2', JSON.stringify({ v: 2, settings: { theme: 'light' }, ui: { landingSeen: true } })); } catch (e) {}
    document.addEventListener('DOMContentLoaded', () => { window.__first = { theme: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor, font: getComputedStyle(document.body).fontFamily }; });
  });
  await page.goto('/#/');
  const f = await page.evaluate(() => window.__first);
  expect(f.theme).toBe('light');
  expect(f.bg).toBe(rgb(LIGHT, 'bg-app'));
  expect(f.font).toContain('Inter');
});
