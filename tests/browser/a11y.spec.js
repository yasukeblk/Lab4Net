// Automated accessibility scan (axe) on every route in both themes: zero violations.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { ROUTES, open } = require('./helpers');

for (const theme of ['dark', 'light']) {
  test.describe(theme + ' theme', () => {
    for (const route of ROUTES) {
      test('axe: ' + route, async ({ page }) => {
        await open(page, route, { theme });
        await expect(page.locator('#screen h1')).toBeVisible();
        await page.waitForFunction(() => document.getAnimations().every(x => x.playState !== 'running'));
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const summary = r.violations.map(v => v.id + ': ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | '));
        expect(summary).toEqual([]);
      });
    }

    test('axe: landing section', async ({ page }) => {
      await open(page, '?welcome', { theme });
      await expect(page.locator('#landing')).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.map(v => v.id + ': ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | '))).toEqual([]);
    });

    test('axe: command palette open', async ({ page }) => {
      await open(page, '#/', { theme });
      await page.locator('.sb__search').click();
      await expect(page.getByRole('combobox')).toBeFocused();
      await page.waitForFunction(() => document.getAnimations().every(x => x.playState !== 'running'));
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(r.violations.map(v => v.id + ": " + v.nodes.slice(0, 4).map(n => n.target.join(" ") + " " + (n.any[0] && n.any[0].message || "")).join(" | "))).toEqual([]);
    });
  });
}

test('live region announces the screen name', async ({ page }) => {
  await open(page, '#/');
  await page.locator('.sidebar').getByRole('link', { name: 'Settings' }).click();
  await expect(page.locator('#announcer')).toHaveText('Settings');
});
