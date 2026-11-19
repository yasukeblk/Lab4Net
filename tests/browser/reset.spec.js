// Reset lab really resets: the commands, the ticks and the device state go, and stay gone after a reload.
// (The lab view saves its work as it closes, and that save once put the deleted work straight back.)
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

const MAIN = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true, hints: { stepTip: true } } };

test('Reset lab clears the commands and ticks, and a reload keeps it cleared', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: MAIN });
  // R1's part of the solution ticks task 1 by itself; the hostname shows in the prompt
  const n = await page.evaluate(() => { const cmds = L4N.data.lab('static-routing').lab.solution.R1.concat(['configure terminal', 'hostname EDGE', 'end']); for (const c of cmds) L4N.test.exec('R1', c); return cmds.length; });
  await expect(page.getByRole('checkbox', { name: /^Task 1 done/ })).toBeChecked();
  expect((await page.evaluate(() => L4N.test.state().prompt)).text).toBe('EDGE#');
  expect(await page.evaluate(() => L4N.test.state().journal)).toBe(n);

  await page.getByRole('button', { name: 'More lab actions' }).click();
  await page.getByRole('menuitem', { name: 'Reset lab' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset lab' }).click();

  await expect.poll(() => page.evaluate(() => L4N.test.state().journal)).toBe(0);
  expect((await page.evaluate(() => L4N.test.state().prompt)).text).toBe('R1>');
  await expect(page.getByRole('checkbox', { name: /^Task 1 done/ })).not.toBeChecked();
  expect(await page.evaluate(() => L4N.work.get('static-routing'))).toBeNull();

  await page.evaluate(() => L4N.work.flush());
  await page.reload();
  await expect(page.locator('#gradeBtn')).toBeVisible();
  expect(await page.evaluate(() => L4N.test.state().journal)).toBe(0);
  expect((await page.evaluate(() => L4N.test.state().prompt)).text).toBe('R1>');
});
