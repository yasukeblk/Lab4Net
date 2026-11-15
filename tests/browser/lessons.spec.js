// Lessons in the app: the list, the reader, story steps, the quick check, marking read, the banner in labs.
const { test, expect } = require('@playwright/test');
const { open, watch, go } = require('./helpers');
const lessons = require('../fixtures/slugs.json').lessons;

test('all 66 lessons open in the reader', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/lessons');
  for (const l of lessons) {
    await go(page, '#/lessons/' + l.slug);
    await expect(page.locator('.reader__title')).toBeVisible();
    await expect(page.locator('.reader__sect').first()).toBeVisible();
  }
  expect(lessons.length).toBe(66);
  expect(errors()).toEqual([]);
});

test('?lesson= opens the reader; reaching the end marks it read; Mark as read works too', async ({ page }) => {
  await open(page, '#/');
  await page.goto('/?lesson=static-routing');
  await expect(page.locator('.reader__title')).toHaveText('Static routing');
  await expect(page.locator('.reader__name')).toHaveText('How to tell a router about distant networks');
  await expect(page.locator('.topbar__status')).toContainText('Not read yet');
  await page.locator('.reader__sentinel').scrollIntoViewIfNeeded();
  await expect(page.locator('.topbar__status')).toContainText('Read', { timeout: 5000 });
  await expect.poll(() => page.evaluate(() => L4N.store.get().lessons['static-routing'].read)).toBe(true);
  await page.goto('/#/lessons/vlans-and-access-ports');
  await page.getByRole('button', { name: 'Mark as read' }).click();
  await expect(page.locator('.topbar__status')).toContainText('Read');
  await page.goto('/#/lessons');
  await expect(page.locator('.sidebar [data-nav="lessons"] .sb__count')).toHaveText('2/66');
});

test('quick-check answers are saved by question index', async ({ page }) => {
  await open(page, '#/lessons/static-routing');
  const q1 = page.locator('.qc__q').first();
  const right = await page.evaluate(() => { const L = LESSONS['Static routing']; return L.quiz[0][2]; });
  await q1.locator(`.qc__opt[data-a="${right}"]`).click();
  await expect(q1.locator('.qc__res')).toContainText('Right.');
  const q2 = page.locator('.qc__q').nth(1);
  const wrong = await page.evaluate(() => { const L = LESSONS['Static routing']; return (L.quiz[1][2] + 1) % L.quiz[1][1].length; });
  await q2.locator(`.qc__opt[data-a="${wrong}"]`).click();
  await expect(q2.locator('.qc__res')).toContainText('Not quite.');
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('.qc__q').first().locator('.qc__res')).toContainText('You answered this before.');
  expect(await page.evaluate(() => L4N.store.get().lessons['static-routing'].quiz)).toEqual({ 0: true, 1: false });
});

for (const reduce of [false, true]) {
  test('story steps play on the shared map' + (reduce ? ' (reduced motion: still pictures)' : ''), async ({ page }) => {
    if (reduce) await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '#/lessons/static-routing');
    const story = page.locator('.story');
    await story.scrollIntoViewIfNeeded();
    await story.getByRole('button', { name: 'Start' }).click();
    await expect(story.locator('.num')).toHaveText(/^1 of \d+$/);
    await story.getByRole('button', { name: 'Next' }).click();
    await expect(story.locator('.num')).toHaveText(/^2 of \d+$/);
    await expect(story.locator('.badge__icon')).toHaveCount(1, { timeout: 8000 });
    await story.getByRole('button', { name: 'Previous' }).click();
    await expect(story.locator('.num')).toHaveText(/^1 of \d+$/);
  });
}

test('the lessons list groups by exam topic and type; N and P move between sections', async ({ page }) => {
  await open(page, '#/lessons');
  await expect(page.locator('.list__group').first()).toContainText('Network fundamentals');
  await page.getByRole('combobox', { name: 'Group by' }).selectOption('type');
  await expect(page.locator('.list__group').first()).toContainText('Lab lessons');
  await page.locator('.lst .row').first().click();
  await page.getByRole('link', { name: 'Read' }).click();
  await expect(page.locator('.reader__title')).toBeVisible();
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('n');
  await expect(page.locator('.reader__h').first()).toBeFocused();
  await page.keyboard.press('n');
  await expect(page.locator('.reader__h').nth(1)).toBeFocused();
});

test('a build lab with a lesson shows the banner the first time; Skip hides it for good', async ({ page }) => {
  await open(page, '#/labs/static-routing');
  const banner = page.getByRole('note').filter({ hasText: 'Read the lesson first (8 min)' });
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Skip' }).click();
  await expect(banner).toHaveCount(0);
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('.con__prompt')).toBeVisible();
  await expect(page.getByText('Read the lesson first')).toHaveCount(0);
  await page.goto('/#/labs/vlans-and-access-ports');
  await page.getByRole('note').getByRole('button', { name: 'Open lesson' }).click();
  await expect(page).toHaveURL(/#\/lessons\/vlans-and-access-ports$/);
});
