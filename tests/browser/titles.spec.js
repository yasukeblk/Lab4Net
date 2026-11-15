// How labs are named and numbered on screen (FIXES-PLAN.md phase 3).
// - Incidents drop "Incident NN: " and start with a capital letter everywhere they are shown on their own.
// - Display numbers count in Path order: LAB-01, LAB-02 … then INC-01 … then CAP-01, with no gaps.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');
const SLUGS = require('../fixtures/slugs.json');

const incidents = SLUGS.labs.filter(l => l.kind === 'incident');
const startsWithCapital = /^[A-Z0-9]/;

test('every incident row in the Labs list starts with a capital and has no "Incident NN:" prefix', async ({ page }) => {
  await open(page, '#/labs');
  const titles = await page.evaluate(() => [...document.querySelectorAll('.row')].filter(r => !r.closest('.detail'))
    .map(r => ({ id: (r.querySelector('.row__id') || {}).textContent || '', title: (r.querySelector('.row__title') || {}).textContent || '' }))
    .filter(r => /^INC-/.test(r.id)));
  expect(titles.length).toBe(incidents.length);
  for (const t of titles) {
    expect(t.title, t.id).toMatch(startsWithCapital);
    expect(t.title, t.id).not.toMatch(/^Incident \d+/);
  }
});

// The workspace header (breadcrumb) of every incident, in a few batches so the tests run in parallel.
const BATCH = 10;
for (let start = 0; start < incidents.length; start += BATCH) {
  const batch = incidents.slice(start, start + BATCH);
  test(`incident headers ${start + 1} to ${start + batch.length} start with a capital`, async ({ page }) => {
    const errors = watch(page);
    for (const l of batch) {
      await open(page, '#/labs/' + l.slug);
      const crumb = page.locator('nav[aria-label="Breadcrumb"] [aria-current="page"]');
      await expect(crumb).toHaveText(startsWithCapital);
      const text = (await crumb.textContent()).trim();
      expect(text, l.slug).not.toMatch(/^Incident \d+/);
      // the same words as the title, apart from the prefix and the first letter
      expect(text.toLowerCase(), l.slug).toBe(l.title.replace(/^Incident \d+:\s*/, '').toLowerCase());
    }
    expect(errors()).toEqual([]);
  });
}

test('the Labs list numbers labs in Path order with no gaps', async ({ page }) => {
  await open(page, '#/labs');
  await expect(page.getByRole('combobox', { name: 'Group by' })).toHaveValue('path').catch(() => {});
  const ids = await page.evaluate(() => [...document.querySelectorAll('.row__id')].filter(e => !e.closest('.detail, .detail__head')).map(e => e.textContent.trim()));
  const counts = { 'LAB-': 0, 'INC-': 0, 'CAP-': 0 };
  for (const pre of Object.keys(counts)) {
    const seq = ids.filter(t => t.startsWith(pre));
    seq.forEach((t, i) => expect(t).toBe(pre + String(i + 1).padStart(2, '0')));
    counts[pre] = seq.length;
  }
  const kinds = k => SLUGS.labs.filter(l => (k === 'capstone' ? l.capstone : !l.capstone && l.kind === k)).length;
  expect(counts).toEqual({ 'LAB-': kinds('build'), 'INC-': kinds('incident'), 'CAP-': kinds('capstone') });
  // LAB numbers come before INC numbers, which come before CAP numbers, as the Path goes
  const firstOf = pre => ids.findIndex(t => t.startsWith(pre));
  expect(firstOf('LAB-')).toBeLessThan(firstOf('INC-'));
  expect(firstOf('INC-')).toBeLessThan(firstOf('CAP-'));
});
