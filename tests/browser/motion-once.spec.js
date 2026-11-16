// Motion plays once, when something happens: a task that has just ticked, the ticket resolving, fresh grade results.
// Nothing already done when the lab opens animates, results drawn again do not replay, and Reduce motion leaves no delays
// (motion.spec.js checks that nothing runs).
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

const MAIN = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true, hints: { stepTip: true } } };
const solve = page => page.evaluate(() => {
  for (const [d, cc] of Object.entries(L4N.data.lab('static-routing').lab.solution)) for (const c of cc) L4N.test.exec(d, c);
});

test('a fresh tick, the ticket resolving and fresh results animate once', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: MAIN });
  await expect(page.locator('.task.is-new, .ticket.is-new')).toHaveCount(0);
  await solve(page);
  await expect(page.locator('.task.is-new').first()).toBeAttached();
  await page.evaluate(() => L4N.test.grade());
  await expect(page.locator('.ticket.is-new .ticket__state')).toHaveText('Resolved');
  await expect(page.locator('.results.is-fresh .check-row').first()).toBeAttached();
  // results drawn again (a command after grading) do not replay
  await page.evaluate(() => L4N.test.exec('R1', 'show ip route'));
  await expect(page.locator('.results')).not.toHaveClass(/is-fresh/);
  // reopening the finished lab: nothing animates
  await page.reload();
  await expect(page.locator('.ticket.is-done')).toBeVisible();
  await expect(page.locator('.task.is-new, .ticket.is-new')).toHaveCount(0);
});

test('Reduce motion leaves no animation time and no delay', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: Object.assign({}, MAIN, { settings: { pace: 'instant', motion: 'reduce' } }) });
  await solve(page);
  await page.evaluate(() => L4N.test.grade());
  const timing = await page.evaluate(() => document.getAnimations().map(a => { const t = a.effect.getComputedTiming(); return t.duration + t.delay; }));
  expect(timing.every(t => t === 0)).toBe(true);
});
