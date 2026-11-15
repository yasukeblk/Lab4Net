// Hostile input never runs. Every case uses the same probe; the test passes when window.__pwn is never set and
// no page error is thrown. (Backup, storage, message and sandbox parts are added in later phases.)
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const PROBE = '<img src=x onerror=window.__pwn=1>';
const INSTANT = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } };

async function clean(page, errors) {
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__pwn)).toBeUndefined();
  expect(await page.evaluate(() => document.querySelectorAll('#app img, #app script').length)).toBe(0);
  expect(errors().filter(e => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
}

test.describe('console', () => {
  test('markup typed into consoles stays text everywhere it is shown', async ({ page }) => {
    const errors = watch(page);
    await open(page, '#/labs/static-routing', { main: INSTANT });
    const run = (dev, lines) => page.evaluate(([dev, lines]) => { for (const l of lines) L4N.test.exec(dev, l); }, [dev, lines]);
    await run('R1', ['enable', 'configure terminal',
      'hostname ' + PROBE, 'banner motd #' + PROBE + '#', 'interface g0/0', 'description ' + PROBE, 'exit',
      'ip host ' + PROBE + ' 10.0.12.2', 'username ' + PROBE + ' secret x', 'end', PROBE, 'ping ' + PROBE, 'show running-config']);
    await run('PC1', ['hostname ' + PROBE, PROBE, 'ping ' + PROBE, 'tracert ' + PROBE, 'telnet ' + PROBE, 'ssh -l ' + PROBE + ' 10.0.0.1']);
    // and through the real input, including ? help and Tab on it
    const input = page.locator('.con__input');
    await page.locator('.con__tab').first().click();
    await input.fill(PROBE); await input.press('Tab'); await input.press('Enter');
    await input.pressSequentially('show ' + PROBE + '?');
    await page.getByRole('button', { name: 'Grade', exact: true }).click();
    // every place that shows those values: console, tabs, map labels, results
    for (const tab of await page.locator('.con__tab').all()) await tab.click();
    await page.locator('.con__tab').first().click();
    await expect(page.locator('.con__out')).toContainText(PROBE);
    await clean(page, errors);
    await page.reload();
    await expect(page.locator('.con__out')).toBeVisible();
    await clean(page, errors);
  });
});
