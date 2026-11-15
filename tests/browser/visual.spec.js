// Screenshot checks (section 8.4). Compared on Linux in CI only; elsewhere the pictures are saved in
// test-results/shots for a person to look at.
const { test, expect } = require('@playwright/test');
const path = require('path');
const { open } = require('./helpers');

const SIZES = [[1366, 768], [1920, 1080], [390, 844]];
const COMPARE = process.platform === 'linux' && !!process.env.CI;

const STATES = [
  { name: 'gallery', route: '#/dev/components', full: true },
  { name: 'home-new', route: '#/' },
  { name: 'settings', route: '#/settings' },
  { name: 'palette', route: '#/', act: async page => { await page.locator('.sb__search').click({ force: true }).catch(() => {}); if (!(await page.locator('dialog[open]').count())) await page.evaluate(() => L4N.palette.open()); } }
];

// Later phases add their states here.
module.exports.STATES = STATES;

for (const theme of ['dark', 'light']) {
  for (const [w, h] of SIZES) {
    for (const s of STATES) {
      test(`${s.name} ${theme} ${w}x${h}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page, s.route, { theme });
        if (s.act) await s.act(page);
        await page.waitForTimeout(150);
        const name = `${s.name}-${theme}-${w}x${h}.png`;
        if (COMPARE) await expect(page).toHaveScreenshot(name, { fullPage: !!s.full });
        else await page.screenshot({ path: path.join(__dirname, '..', '..', 'test-results', 'shots', name), fullPage: !!s.full });
      });
    }
  }
}
