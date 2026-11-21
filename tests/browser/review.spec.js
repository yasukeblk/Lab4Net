// "Review these" on Home: exam topics with missed quiz questions, missed automation drill items or unfinished labs,
// weakest first, each with a lesson, a lab and a way back into its missed questions. Quiz results count per exam topic.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

// three Routing questions missed (IP connectivity), one Automation question and one drill item, one Switching question
const MAIN = () => ({ v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true },
  labs: { 'basic-device-setup': { done: true, grade: 'A', doneAt: 1731500000000 } },
  quiz: { rev: 2, answers: { 53: false, 54: false, 55: true, 57: false, 40: false, 0: false } }, automation: { answers: { 0: false } } });

test('Home lists the weakest exam topics first, with a lesson, a lab and the missed questions', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/labs/static-routing', { main: MAIN() });
  await page.evaluate(() => L4N.test.exec('R1', 'enable'));          // started, not finished
  await page.evaluate(() => L4N.shell.go('#/'));
  const rows = page.locator('#home-review + .review > li');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('IP connectivity');
  await expect(rows.nth(0)).toContainText('3 quiz questions missed · Static routing not finished');
  await expect(rows.nth(0).getByRole('link', { name: 'Lab: Static routing' })).toHaveAttribute('href', '#/labs/static-routing');
  await expect(rows.nth(0).getByRole('link', { name: /^Lesson: / })).toBeVisible();
  await expect(rows.nth(1)).toContainText('Automation and programmability');
  await expect(rows.nth(1)).toContainText('1 quiz question missed · 1 automation item missed');
  await expect(rows.nth(1).getByRole('link', { name: 'Automation drill' })).toHaveAttribute('href', '#/practice/automation');
  await expect(rows.nth(2)).toContainText('Network access');

  // Retry opens the quiz on that topic's missed and unanswered questions
  await rows.nth(0).getByRole('button', { name: 'Retry the missed IP connectivity quiz questions' }).click();
  await expect(page).toHaveURL(/#\/practice\/quiz$/);
  await expect(page.getByRole('combobox', { name: 'Topic' })).toHaveValue('3');
  await expect(page.getByRole('switch', { name: 'Only missed or unanswered' })).toBeChecked();
  await expect(page.locator('.quiz__count')).toHaveText('Question 1 of 13');   // 14 in the topic, one answered right
  await expect(page.locator('.quiz .label-caps')).toContainText('missed before');
  expect(errors()).toEqual([]);
});

test('Progress shows each exam topic\'s quiz score; Home has no review list when nothing is missed', async ({ page }) => {
  await open(page, '#/progress', { main: MAIN() });
  const rows = page.locator('.topic-d summary');
  await expect(rows.nth(2)).toContainText('1/14 quiz');
  await expect(rows.nth(1)).toContainText('0/18 quiz');
  const totals = await page.evaluate(() => L4N.stats.domains().reduce((n, d) => n + d.quiz.total, 0));
  expect(totals).toBe(await page.evaluate(() => QUIZ.length));     // every question is in exactly one topic

  await page.evaluate(() => L4N.store.set({ quiz: { rev: 2, answers: { 0: true } }, automation: { answers: {} } }));
  await page.evaluate(() => L4N.shell.go('#/'));
  await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'home');
  await expect(page.locator('#home-review')).toHaveCount(0);
});
