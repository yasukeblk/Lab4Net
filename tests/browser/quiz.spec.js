// The quiz (answers saved by index, filters, keys) and the Progress screen's numbers for a seeded profile.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('answers are saved by question index; keys 1 to 4 and Enter; filters work', async ({ page }) => {
  await open(page, '#/practice/quiz');
  const right = await page.evaluate(() => QUIZ[0][3]);
  // keys: the option shown in slot k is answer (k + i % 4) % 4 for question i = 0, so key right+1 picks it
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press(String(right + 1));
  await page.keyboard.press('Enter');
  await expect(page.locator('.qc__res')).toContainText('Right.');
  expect(await page.evaluate(() => L4N.store.get().quiz.answers)).toEqual({ 0: true });
  await page.keyboard.press('Enter');
  await expect(page.locator('.quiz__count')).toHaveText('Question 2 of 110');
  // a wrong answer to question 1
  const wrong = await page.evaluate(() => (QUIZ[1][3] + 1) % 4);
  await page.locator(`.qc__opt[data-a="${wrong}"]`).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('.qc__res')).toContainText('Not quite.');
  expect(await page.evaluate(() => L4N.store.get().quiz.answers)).toEqual({ 0: true, 1: false });
  // filters: a topic, and only missed or unanswered
  await page.getByRole('combobox', { name: 'Topic' }).selectOption('IPv6');
  await expect(page.locator('.quiz .label-caps')).toContainText('IPv6');
  await expect(page.locator('.quiz__count')).toHaveText('Question 1 of 9');
  await page.getByRole('combobox', { name: 'Topic' }).selectOption('all');
  await page.getByRole('switch', { name: 'Only missed or unanswered' }).click();
  await expect(page.locator('.quiz__count')).toHaveText('Question 1 of 109');
  await page.reload();
  expect(await page.evaluate(() => L4N.store.get().quiz.answers)).toEqual({ 0: true, 1: false });
});

test('Progress numbers equal the store for a seeded profile', async ({ page }) => {
  const main = { v: 2, ui: { landingSeen: true },
    labs: { 'static-routing': { done: true, grade: 'S', doneAt: 1731600000000 }, 'basic-device-setup': { done: true, grade: 'B', doneAt: 1731500000000 }, 'vlans-and-access-ports': { done: true, grade: 'S', doneAt: 1731400000000 } },
    lessons: { 'static-routing': { read: true, readAt: 1731650000000, quiz: {} } }, quiz: { answers: { 0: true, 1: true, 2: false } },
    exam: { history: [{ at: 1731700000000, mode: 'sabotage', base: 'static-routing', cleared: true, passed: 6, total: 6, grade: 'A', secs: 300, minutes: 20 }] } };
  await open(page, '#/progress', { main });
  const stats = page.locator('.stats .stat');
  await expect(stats.nth(0)).toContainText('3/77');
  await expect(stats.nth(1)).toContainText('1/66');
  await expect(stats.nth(2)).toContainText('2/110');
  await expect(stats.nth(3)).toContainText('1');
  const grades = page.locator('.grades li');
  await expect(grades.nth(0)).toContainText('S2');
  await expect(grades.nth(2)).toContainText('B1');
  await expect(page.locator('#pg-exams + .table-wrap tbody tr')).toHaveCount(1);
  await expect(page.locator('#pg-recent + .list .row')).toHaveCount(4);
  await expect(page.locator('#pg-recent + .list .row').first()).toContainText('Static routingLesson');
  // exam topics expand to objectives, with labs and lessons as links
  await page.locator('.topic-d summary').nth(2).click();
  await expect(page.locator('.topic-d').nth(2).locator('.objlink').first()).toBeVisible();
});
