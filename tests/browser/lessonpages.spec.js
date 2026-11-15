// The generated lesson web pages (lessons/): one h1, no script but the counter, links into the app work,
// no sideways scroll at 390 wide, and the right colours in both prefers-color-scheme settings.
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', '..', 'lessons');
const pages = fs.readdirSync(DIR).filter(f => f.endsWith('.html'));
const tokens = fs.readFileSync(path.join(__dirname, '..', '..', 'src/styles/tokens.css'), 'utf8');
const tok = (block, n) => new RegExp('--' + n + ':\\s*(#[0-9A-Fa-f]{6})').exec(block)[1];
const DARK = /:root, \[data-theme="dark"\] \{([^}]+)\}/.exec(tokens)[1], LIGHT = /\[data-theme="light"\] \{([^}]+)\}/.exec(tokens)[1];
const rgb = hex => 'rgb(' + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')';

test('the set of pages is the same as on main, one per lesson plus the index', () => {
  const slugs = require('../fixtures/slugs.json').lessons.map(l => l.slug + '.html').concat('index.html').sort();
  expect(pages.slice().sort()).toEqual(slugs);
});

test('every page: one h1, only the counter script, no sideways scroll at 390 wide', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const f of pages) {
    await page.goto('/lessons/' + f);
    expect(await page.locator('h1').count(), f).toBe(1);
    const scripts = await page.evaluate(() => [...document.scripts].filter(s => s.type !== 'application/ld+json').map(s => s.textContent));
    expect(scripts.length, f).toBeLessThanOrEqual(1);
    for (const s of scripts) expect(s, f).toContain('goatcounter');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), f + ' scrolls sideways').toBe(true);
  }
});

for (const scheme of ['dark', 'light']) {
  test('colours follow prefers-color-scheme: ' + scheme, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/lessons/static-routing.html');
    const block = scheme === 'dark' ? DARK : LIGHT;
    const c = await page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, fg: getComputedStyle(document.body).color, a: getComputedStyle(document.querySelector('main a')).color }));
    expect(c.bg).toBe(rgb(tok(block, 'bg-surface')));
    expect(c.fg).toBe(rgb(tok(block, 'text')));
    expect(c.a).toBe(rgb(tok(block, 'accent')));
  });
}

test('links back into the app open the right lab and lesson', async ({ page }) => {
  await page.goto('/lessons/static-routing.html');
  await page.getByRole('link', { name: 'Open the Static routing lab' }).click();
  await expect(page).toHaveURL(/#\/labs\/static-routing$/);
  await expect(page.locator('.con__prompt')).toHaveText('R1>');
  await page.goto('/lessons/tcp-and-udp.html');
  await page.getByRole('link', { name: 'Open this lesson in Lab4Net' }).click();
  await expect(page).toHaveURL(/#\/lessons\/tcp-and-udp$/);
  await expect(page.locator('.reader__title')).toBeVisible();
  await page.goto('/lessons/index.html');
  await page.getByRole('link', { name: 'Open the app' }).click();
  await expect(page.locator('#landing, #app').first()).toBeAttached();
});
