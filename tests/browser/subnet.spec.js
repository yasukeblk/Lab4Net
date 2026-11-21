// The subnetting drill: six fields, marks and the worked reason; only the first check of a question counts.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('right answers score, the first check counts once, ranges work', async ({ page }) => {
  await open(page, '#/practice/subnetting');
  // before any try, it says what to do rather than "0 of 0"
  await expect(page.locator('.page .muted.num')).toHaveText('Fill in all six fields, then check your answers.');
  await page.getByRole('combobox', { name: 'Range' }).selectOption('small');
  const q = await page.locator('.subnet__q').textContent();
  expect(+q.split('/')[1]).toBeGreaterThanOrEqual(27);
  const ans = await page.evaluate(t => { const [ip, len] = t.split('/'); return L4N.sim.subnet.answers({ ip: ip2n(ip), len: +len }); }, q);
  const fields = page.locator('.subnet__grid input');
  for (let k = 0; k < 6; k++) await fields.nth(k).fill(k === 5 ? '999' : ans[k]);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('.field__res.ok')).toHaveCount(5);
  await expect(page.locator('.field__res.bad')).toContainText('Answer: ' + ans[5]);
  await expect(page.getByText('How to work it out')).toBeVisible();
  expect(await page.evaluate(() => L4N.store.get().subnet)).toEqual({ right: 5, total: 6 });
  // Next gives a new question; the score counted once
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.subnet__grid input').first()).toHaveValue('');
  expect(await page.evaluate(() => L4N.store.get().subnet)).toEqual({ right: 5, total: 6 });
  await expect(page.locator('.page .muted.num')).toHaveText('5 of 6 fields right on the first try');
  // Enter in a field checks
  await page.locator('.subnet__grid input').first().press('Enter');
  expect(await page.evaluate(() => L4N.store.get().subnet.total)).toBe(12);
});
