// Every total the app shows (labs, lessons, quiz questions) agrees with the data in the page.
// No numbers are typed in this file: they are read from L4N.data and QUIZ, so adding a lab, a lesson or a
// question can only pass if every screen, the landing page and the page's own description follow.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

async function totals(page) {
  return page.evaluate(() => {
    const labs = L4N.data.labs, kind = k => labs.filter(l => l.kind === k).length;
    return { labs: labs.length, build: kind('build'), incidents: kind('incident'), capstones: kind('capstone'),
      lessons: L4N.data.lessons.length, quiz: QUIZ.length };
  });
}
const exact = s => new RegExp('^\\s*' + s.replace(/[/.]/g, '\\$&') + '\\s*$');

test('the sidebar shows the lab and lesson totals', async ({ page }) => {
  await open(page, '#/');
  const n = await totals(page);
  await expect(page.locator('.sidebar [data-nav="labs"] .sb__count')).toHaveText(exact('0/' + n.labs));
  await expect(page.locator('.sidebar [data-nav="lessons"] .sb__count')).toHaveText(exact('0/' + n.lessons));
});

for (const route of ['#/', '#/progress']) {
  test(`${route} shows the lab, lesson and quiz totals`, async ({ page }) => {
    const errors = watch(page);
    await open(page, route);
    const n = await totals(page);
    for (const t of [n.labs, n.lessons, n.quiz]) await expect(page.locator('.bar__num', { hasText: exact('0/' + t) }).first()).toBeVisible();
    expect(errors()).toEqual([]);
  });
}

test('Practice and the quiz show the number of questions', async ({ page }) => {
  await open(page, '#/practice');
  const n = await totals(page);
  await expect(page.getByText(n.quiz + ' theory questions.')).toBeVisible();
  await expect(page.getByText('0/' + n.quiz + ' correct')).toBeVisible();
  await open(page, '#/practice/quiz');
  await expect(page.locator('.bar__num', { hasText: exact('1/' + n.quiz) }).first()).toBeVisible();
});

test('the lesson groups add up to every lesson', async ({ page }) => {
  await open(page, '#/lessons');
  const n = await totals(page);
  const counts = await page.locator('.count').allTextContents();
  const sum = counts.map(t => +(t.match(/\/(\d+)/) || [0, 0])[1]).reduce((a, b) => a + b, 0);
  expect(sum).toBe(n.lessons);
});

test('the landing page shows every total', async ({ page }) => {
  await open(page, '?welcome');
  const n = await totals(page);
  for (const k of ['labs', 'build', 'incidents', 'capstones', 'lessons']) {
    await expect(page.locator(`#landing [data-w="${k}"]`)).toHaveText(String(n[k]));
  }
});

test('the page description and share tags give the right totals', async ({ page }) => {
  await open(page, '#/');
  const n = await totals(page);
  for (const sel of ['meta[name="description"]', 'meta[property="og:description"]']) {
    const text = await page.locator(sel).getAttribute('content');
    expect(text, sel).toContain(n.labs + ' hands-on labs');
    expect(text, sel).toContain(n.lessons + ' lessons');
  }
});
