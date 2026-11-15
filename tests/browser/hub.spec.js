// Home, Progress and Practice (FIXES-PLAN.md phase 6).
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const SEEDED = { v: 2, ui: { landingSeen: true, lastLab: 'static-routing', recent: ['static-routing'] },
  labs: { 'static-routing': { done: true, grade: 'S', doneAt: 1731600000000 }, 'basic-device-setup': { done: true, grade: 'B', doneAt: 1731500000000 } },
  lessons: { 'static-routing': { read: true, readAt: 1731650000000, quiz: {} } },
  quiz: { answers: { 0: true, 1: true, 2: false } },
  exam: { history: [{ at: 1731700000000, mode: 'sabotage', base: 'static-routing', cleared: true, passed: 6, total: 6, grade: 'A', secs: 300, minutes: 20 }] } };

test('Home: the next step, then Recently, then Next up and one line of totals; no bars or exam topics', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/', { main: SEEDED });
  const titles = await page.locator('#screen .section__title').allTextContents();
  expect(titles.slice(0, 3)).toEqual(['Static routing', 'Recently', 'Next up']);
  await expect(page.locator('#screen .bar')).toHaveCount(0);
  await expect(page.locator('#screen').getByText('Exam topics')).toHaveCount(0);
  const recent = page.locator('section[aria-labelledby="home-recent"] .row');
  await expect(recent).toHaveCount(3);
  await expect(recent.first()).toContainText('Lesson');           // the lesson, read last
  await expect(recent.nth(1)).toContainText('Static routing');    // the lab, with its grade
  await expect(recent.nth(1)).toContainText('S');
  await page.locator('.home__summary').getByRole('link', { name: 'See your progress' }).click();
  await expect(page).toHaveURL(/#\/progress$/);
  expect(errors()).toEqual([]);
});

test('a new visitor sees Start here and Next up, without Recently', async ({ page }) => {
  await open(page, '#/');
  await expect(page.getByRole('heading', { name: 'Start here' })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="home-recent"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Next up' })).toBeVisible();
});

test('no bar has a percentage next to it that is not its own value', async ({ page }) => {
  for (const route of ['#/', '#/progress', '#/practice', '#/practice/quiz', '#/lessons', '#/labs']) {
    await open(page, route, { main: JSON.parse(JSON.stringify(SEEDED)) });
    const near = await page.evaluate(() => [...document.querySelectorAll('#screen .bar')].map(b => {
      const box = b.closest('.row__meta, .stat, .stat__row') || b.parentElement;
      const own = b.textContent;
      return box.textContent.replace(own, '');
    }).filter(t => /\d\s*%/.test(t)));
    expect(near, route).toEqual([]);
  }
  // the exam weight is written in words, next to the topic's name
  await open(page, '#/progress', { main: JSON.parse(JSON.stringify(SEEDED)) });
  await expect(page.locator('.topic__weight').first()).toHaveText(/^\d+% of the exam$/);
});

test('Practice: each card has Start and its last result; Review opens the quiz filtered, and the count goes down', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/practice', { main: SEEDED });
  const n = await page.evaluate(() => QUIZ.length);
  const quizCard = page.getByRole('region', { name: 'Quiz' });
  await expect(quizCard).toContainText(`2 of ${n} correct · ${n - 2} to review`);
  await expect(page.getByRole('region', { name: 'Exam', exact: true })).toContainText('Last: grade A, 6 of 6 checks');
  for (const name of ['Start an exam', 'Start the quiz', 'Start the subnetting drill']) await expect(page.getByRole('button', { name }).or(page.getByRole('link', { name }))).toBeVisible();
  await expect(page.locator('section[aria-labelledby="pr-last"] tbody tr')).toHaveCount(1);

  await quizCard.getByRole('button', { name: `Review ${n - 2} missed or unanswered questions` }).click();
  await expect(page).toHaveURL(/#\/practice\/quiz$/);
  await expect(page.getByRole('switch', { name: 'Only missed or unanswered' })).toBeChecked();
  await expect(page.locator('.quiz__count')).toHaveText(`Question 1 of ${n - 2}`);
  // answer the first one right: one fewer to review
  const i = await page.evaluate(() => QUIZ.findIndex((q, k) => L4N.store.get().quiz.answers[k] !== true));
  const right = await page.evaluate(k => QUIZ[k][3], i);
  await page.locator(`.qc__opt[data-a="${right}"]`).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('.quiz__left')).toHaveText(`${n - 3} left to review`);
  // Start goes back to the full set
  await open(page, '#/practice');
  await page.getByRole('button', { name: 'Start the quiz' }).click();
  await expect(page.getByRole('switch', { name: 'Only missed or unanswered' })).not.toBeChecked();
  await expect(page.locator('.quiz__count')).toHaveText(`Question 1 of ${n}`);
  expect(errors()).toEqual([]);
});
