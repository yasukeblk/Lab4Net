// "the table" / "the address plan" in a task is a link that opens the address table right there, under the task, as
// well as in the Addresses tab. It stays open while the panel redraws, and closes again.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

const MAIN = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true, hints: { stepTip: true } } };

test('a task opens the address table in place, keeps it open across a redraw, and closes it', async ({ page }) => {
  await open(page, '#/labs/basic-device-setup', { main: MAIN });
  const task = page.locator('.task').filter({ hasText: 'its address from the table' });
  const link = task.getByRole('button', { name: 'the table' });
  await expect(link).toHaveAttribute('aria-expanded', 'false');
  await expect(task.locator('.addr-inline')).toBeHidden();
  // the sentence still reads as one
  await expect(task.locator('.task__text')).toContainText('its address from the table, then bring it up');

  await link.click();
  await expect(link).toHaveAttribute('aria-expanded', 'true');
  const table = task.locator('.addr-inline table');
  await expect(table).toBeVisible();
  const rows = await page.evaluate(() => L4N.data.lab('basic-device-setup').lab.addr.length);
  await expect(table.locator('tbody tr')).toHaveCount(rows);

  // the panel is drawn again (as when a task ticks itself): the table is still open under the same task
  await page.evaluate(() => L4N.workspace.current().tasksView.rebuild());
  await expect(task.locator('.addr-inline table')).toBeVisible();
  await expect(task.getByRole('button', { name: 'the table' })).toHaveAttribute('aria-expanded', 'true');

  await task.getByRole('button', { name: 'the table' }).click();
  await expect(task.locator('.addr-inline')).toBeHidden();
  // the full plan is also in the Addresses tab
  await expect(page.getByRole('tab', { name: 'Addresses' })).toBeVisible();
});

test('incident tasks link "the address plan"; a capstone brief and Why notes about other tables do not', async ({ page }) => {
  await open(page, '#/labs/incident-01-one-sales-pc-is-isolated', { main: MAIN });
  await page.getByRole('button', { name: 'the address plan' }).click();
  await expect(page.locator('.task .addr-inline table')).toBeVisible();

  // the capstone brief says "Work from the address plan", and the plan is open right under it: no second copy
  await page.goto('/#/labs/capstone-branch-office-from-scratch');
  await expect(page.locator('.tasks__intro')).toContainText('Work from the address plan');
  await expect(page.locator('.tasks__intro .addr-link')).toHaveCount(0);
  await expect(page.locator('.tasks__intro + details.addr-plan table')).toBeVisible();

  // "Read the table before testing" (a Why note in static routing) is about the routing table: no link
  await page.goto('/#/labs/static-routing');
  await expect(page.locator('.why .addr-link')).toHaveCount(0);
});
