// The pop-out Tasks window: open, step to console, change lab, reload the main window and reconnect,
// close the pop-out and see it dock, and the Dock button.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

const MAIN = { v: 2, settings: { pace: 'instant', guideDefault: true }, ui: { landingSeen: true, hints: { stepTip: true } } };

async function popOut(page, context) {
  await page.getByRole('button', { name: 'More lab actions' }).click();
  const [pop] = await Promise.all([context.waitForEvent('page'), page.getByRole('menuitem', { name: 'Pop out tasks' }).click()]);
  await pop.waitForLoadState();
  return pop;
}

test('open, step to the console, change lab, reconnect after a reload, dock', async ({ page, context }) => {
  await open(page, '#/labs/static-routing', { main: MAIN });
  const pop = await popOut(page, context);
  await expect(pop.locator('.popout__title')).toHaveText('Static routing');
  await expect(pop.locator('.task')).toHaveCount(5);
  await expect(page.locator('.tasks-strip.is-out')).toBeVisible();
  await expect(page.locator('#ws-tasks')).toBeHidden();

  // a step goes into the main console's input; it does not run
  const journal = await page.evaluate(() => L4N.test.state().journal);
  const first = pop.locator('button.step').first();
  const cmd = await first.textContent();
  await first.click();
  await expect(page.locator('.con__input')).toHaveValue(cmd.replace(/^.*?[>#]/, ''));
  expect(await page.evaluate(() => L4N.test.state().journal)).toBe(journal);

  // ticking a task in the pop-out ticks it in the main window
  await pop.getByRole('checkbox', { name: 'Task 1 done' }).check();
  await expect.poll(() => page.evaluate(() => L4N.workspace.current().tasks[0])).toBe(true);

  // change lab
  await page.goto('/#/labs/vlans-and-access-ports');
  await expect(pop.locator('.popout__title')).toHaveText('VLANs and access ports');

  // reload the main window: the pop-out reconnects
  await page.reload();
  await expect(page.locator('.tasks-strip.is-out')).toBeVisible({ timeout: 8000 });
  await expect(pop.locator('.popout__title')).toHaveText('VLANs and access ports');

  // the Dock button in the pop-out closes it and docks the panel. The window can close before Playwright finishes
  // the click and report it as failed, so that error is accepted only when the window really did close.
  await pop.getByRole('button', { name: 'Dock' }).click({ noWaitAfter: true }).catch(e => { if (!pop.isClosed()) throw e; });
  await expect.poll(() => pop.isClosed()).toBe(true);
  await expect(page.locator('#ws-tasks')).toBeVisible();
});

test('closing the pop-out docks the panel; the main Dock button closes it', async ({ page, context }) => {
  await open(page, '#/labs/static-routing', { main: MAIN });
  let pop = await popOut(page, context);
  await expect(pop.locator('.popout__title')).toHaveText('Static routing');
  await pop.close();
  await expect(page.locator('#ws-tasks')).toBeVisible({ timeout: 12000 });
  pop = await popOut(page, context);
  await expect(page.locator('.tasks-strip.is-out')).toBeVisible();
  await page.getByRole('button', { name: 'Dock the Tasks panel' }).click();
  await expect.poll(() => pop.isClosed()).toBe(true);
  await expect(page.locator('#ws-tasks')).toBeVisible();
});

test('the pop-out is not offered from a local file', async ({ page }) => {
  const { FILE_URL, seed } = require('./helpers');
  await seed(page, { main: MAIN });
  await page.goto(FILE_URL + '#/labs/static-routing');
  await page.getByRole('button', { name: 'More lab actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Reset lab' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Pop out tasks' })).toHaveCount(0);
});
