// One kind of progress (FIXES-PLAN.md phase 4): a lab that is done looks done everywhere.
// - A grade that passes every check ticks every task and keeps it; the header then counts checks, not ticks.
// - The Labs list and Home's Continue card show Done (and the grade), never "0 of 5".
// - The "Read the lesson first" banner goes once the lab is done.
// - Progress saved before this change (a done lab with no ticked tasks) shows the same, without being rewritten.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const SLUG = 'static-routing';
const ticked = page => page.locator('#ws-tasks .task.is-ticked');
const headCount = page => page.locator('#ws-tasks .pane__head .tasks__count');
const banner = page => page.getByRole('note').filter({ hasText: 'Read the lesson first' });

async function labsRow(page) {
  await open(page, '#/labs');
  return page.locator('.row', { hasText: 'Static routing' }).filter({ hasNot: page.locator('.detail__head') }).first();
}

test('grading every check ticks every task, and the lab shows Done everywhere', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/labs/' + SLUG, { main: { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } } });
  const tasks = await page.evaluate(s => L4N.data.lab(s).lab.tasks.length, SLUG);
  await expect(banner(page)).toBeVisible();
  await expect(ticked(page)).toHaveCount(0);
  await expect(headCount(page)).toHaveText('0 of ' + tasks + ' done');

  const checks = await page.evaluate(s => {
    const lab = L4N.data.lab(s).lab;
    for (const [dev, cmds] of Object.entries(lab.solution)) for (const c of cmds) L4N.test.exec(dev, c);
    return lab.checks.length;
  }, SLUG);
  await page.locator('#gradeBtn').click();

  await expect(ticked(page)).toHaveCount(tasks);
  await expect(headCount(page)).toHaveText(checks + ' of ' + checks + ' checks');
  await expect(banner(page)).toHaveCount(0);
  const saved = await page.evaluate(s => L4N.work.get(s).tasks, SLUG);
  expect(saved.length).toBe(tasks);
  expect(saved.every(Boolean)).toBe(true);
  const grade = await page.evaluate(s => L4N.store.get().labs[s].grade || null, SLUG);

  // a reload keeps the ticks
  await page.reload();
  await expect(ticked(page)).toHaveCount(tasks);
  await expect(headCount(page)).toHaveText(tasks + ' of ' + tasks + ' done');

  const row = await labsRow(page);
  await expect(row).toContainText('Done');
  await expect(row).not.toContainText('0/' + tasks);
  if (grade) await expect(row).toContainText(grade);

  await open(page, '#/');
  const card = page.locator('.home__card');
  await expect(card).toContainText('Static routing');
  await expect(card).toContainText('Done');
  await expect(card).not.toContainText(' of ' + tasks + ' tasks');
  expect(errors()).toEqual([]);
});

test('progress saved before this change (done, nothing ticked) shows as done without being rewritten', async ({ page }) => {
  const errors = watch(page);
  const main = { v: 2, settings: { pace: 'instant' }, labs: { [SLUG]: { done: true, grade: 'S', doneAt: 1731600000000 } },
    ui: { landingSeen: true, lastLab: SLUG, recent: [SLUG] } };
  await open(page, '#/labs/' + SLUG, { main });
  const tasks = await page.evaluate(s => L4N.data.lab(s).lab.tasks.length, SLUG);
  await expect(ticked(page)).toHaveCount(tasks);
  await expect(headCount(page)).toHaveText(tasks + ' of ' + tasks + ' done');
  await expect(banner(page)).toHaveCount(0);
  // shown as ticked, but nothing written on load
  expect(await page.evaluate(s => L4N.work.get(s), SLUG)).toBeNull();

  const row = await labsRow(page);
  await expect(row).toContainText('Done');
  await expect(row).toContainText('S');
  await expect(row).not.toContainText('0/' + tasks);

  await open(page, '#/');
  const card = page.locator('.home__card');
  await expect(card).toContainText('Done');
  await expect(card).not.toContainText('0 of ' + tasks);
  expect(errors()).toEqual([]);
});

test('using step-by-step once retires the tip that points to it', async ({ page }) => {
  await open(page, '#/labs/' + SLUG, { main: { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } } });
  const tip = page.getByText('New here? Turn on step-by-step');
  await expect(tip).toBeVisible();
  await page.getByRole('switch', { name: 'Step-by-step' }).click();
  await page.getByRole('switch', { name: 'Step-by-step' }).click();
  await expect(tip).toHaveCount(0);
  expect(await page.evaluate(() => L4N.store.get().ui.hints.stepTip)).toBe(true);
  await page.reload();
  await expect(page.locator('#gradeBtn')).toBeVisible();
  await expect(tip).toHaveCount(0);
});
