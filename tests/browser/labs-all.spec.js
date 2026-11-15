// Every lab: open it, run its solution through L4N.test.exec (the same path as pressing Enter),
// press the real Grade button, see every check pass and the lab marked done. Then reload and see it still done.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');
const slugs = require('../fixtures/slugs.json').labs.map(l => l.slug);

test.describe.configure({ mode: 'parallel' });

for (const slug of slugs) {
  test('lab: ' + slug, async ({ page }) => {
    const errors = watch(page);
    await open(page, '#/labs/' + slug, { main: { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } } });
    await expect(page.locator('#gradeBtn')).toBeVisible();
    const rejected = await page.evaluate(slug => {
      const lab = LABS.find(l => L4N.slug(l.title) === slug);
      const bad = [];
      for (const [dev, cmds] of Object.entries(lab.solution)) for (const c of cmds) {
        const out = L4N.test.exec(dev, c) || [];
        if (out.some(l => /^% (Invalid|Incomplete|Ambiguous|Unrecognized)/i.test(l))) bad.push(dev + ': ' + c);
      }
      return bad;
    }, slug);
    expect(rejected).toEqual([]);
    await page.locator('#gradeBtn').click();
    const results = page.getByRole('region', { name: 'Results' });
    await expect(results.locator('.results__sum')).toContainText('Lab complete');
    expect(await results.locator('.check-row.is-bad').count()).toBe(0);
    expect(await results.locator('.check-row.is-ok').count()).toBeGreaterThan(0);
    await expect(page.locator('.topbar__status')).toContainText('Done');
    await page.reload();
    await expect(page.locator('#gradeBtn')).toBeVisible();
    await expect(page.locator('.topbar__status')).toContainText('Done');
    expect(await page.evaluate(() => L4N.test.state().done)).toBe(true);
    expect(errors()).toEqual([]);
  });
}
