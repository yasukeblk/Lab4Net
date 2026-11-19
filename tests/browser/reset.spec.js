// Reset lab fully resets that one lab, from the lab's own menu and from the Labs list: the commands, ticks and device
// state go, and so do its grade and finished mark. They stay gone after a reload, and other labs are not touched.
// (The lab view saves its work as it closes, and that save once put the deleted work straight back.)
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

const MAIN = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true, hints: { stepTip: true } },
  labs: { 'vlans-and-access-ports': { done: true, grade: 'A', doneAt: 1700000000000 } } };
const OTHER = { done: true, grade: 'A', doneAt: 1700000000000 };

// solve static routing, set a hostname on R1 and grade it: done, grade S
async function finish(page) {
  const n = await page.evaluate(() => {
    const cmds = []; for (const [d, cc] of Object.entries(L4N.data.lab('static-routing').lab.solution)) for (const c of cc) cmds.push([d, c]);
    cmds.push(['R1', 'configure terminal'], ['R1', 'hostname EDGE']);
    for (const [d, c] of cmds) L4N.test.exec(d, c);
    return cmds.length;
  });
  await page.locator('#gradeBtn').click();
  await expect(page.locator('.topbar__status')).toContainText('S');
  expect(await page.evaluate(() => L4N.test.state().journal)).toBe(n);
}
const rec = page => page.evaluate(() => L4N.store.get().labs['static-routing'] || null);
const other = page => page.evaluate(() => L4N.store.get().labs['vlans-and-access-ports'] || null);
const confirm = async page => {
  await expect(page.getByRole('dialog')).toContainText('grade and finished mark');
  await page.getByRole('dialog').getByRole('button', { name: 'Reset lab' }).click();
  await expect(page.getByText('Lab reset.')).toBeVisible();
};

test('from the lab: commands, ticks, grade and finished mark go, and a reload keeps it so', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: MAIN });
  await finish(page);
  await page.getByRole('button', { name: 'More lab actions' }).click();
  await page.getByRole('menuitem', { name: 'Reset lab' }).click();
  await confirm(page);

  await expect.poll(() => page.evaluate(() => L4N.test.state().journal)).toBe(0);
  expect((await page.evaluate(() => L4N.test.state().prompt)).text).toBe('R1>');
  await expect(page.getByRole('checkbox', { name: /^Task 1 done/ })).not.toBeChecked();
  await expect(page.locator('.ticket__state')).toHaveText('Open');
  const r = await rec(page);
  expect(r && r.done).toBe(false);
  expect(r && r.grade).toBeUndefined();
  expect(await page.evaluate(() => L4N.work.get('static-routing'))).toBeNull();
  expect(await other(page)).toEqual(OTHER);

  await page.evaluate(() => L4N.work.flush());
  await page.reload();
  await expect(page.locator('#gradeBtn')).toBeVisible();
  expect(await page.evaluate(() => L4N.test.state().journal)).toBe(0);
  expect((await page.evaluate(() => L4N.test.state().prompt)).text).toBe('R1>');
  expect(((await rec(page)) || {}).done).toBe(false);
  expect(await other(page)).toEqual(OTHER);
});

test('from the Labs list: the same full reset, and Cancel leaves the lab alone', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: MAIN });
  await finish(page);
  await page.goto('/#/labs');
  await page.getByRole('option', { name: /Static routing/ }).click();
  // Cancel keeps everything
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  expect((await rec(page)).grade).toBe('S');
  // Reset clears it all, and the button goes, as there is nothing left to reset
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await confirm(page);
  expect(await rec(page)).toBeNull();
  expect(await page.evaluate(() => L4N.work.get('static-routing'))).toBeNull();
  await expect(page.getByRole('button', { name: 'Reset', exact: true })).toHaveCount(0);
  expect(await other(page)).toEqual(OTHER);
  await page.goto('/#/labs/static-routing');
  await expect(page.locator('#gradeBtn')).toBeVisible();
  expect(await page.evaluate(() => L4N.test.state().journal)).toBe(0);
});
