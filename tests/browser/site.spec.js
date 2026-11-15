// The hosted build (FIXES-PLAN.md phase 10), only in the "site" project: lesson text loads when a lesson is opened,
// one file per lesson, and without a connection the reader says so and offers the single file.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

test.beforeEach(({}, info) => test.skip(info.project.name !== 'site', 'hosted build only'));

const lessonFiles = page => { const urls = []; page.on('request', r => { if (r.url().includes('/lesson-data/')) urls.push(r.url().replace(/^.*\/lesson-data\//, '')); }); return urls; };

test('the page holds the lesson index only; opening a lesson fetches just that lesson', async ({ page }) => {
  const errors = watch(page);
  const urls = lessonFiles(page);
  await open(page, '#/');
  expect(await page.evaluate(() => L4N.data.lessons.every(l => !Array.isArray(l.lesson.sections) && l.lesson.quizCount > 0))).toBe(true);
  await page.waitForTimeout(300);
  expect(urls).toEqual([]);
  await page.evaluate(() => L4N.shell.go('#/lessons/static-routing'));
  await expect(page.locator('.reader__title')).toHaveText('Static routing');
  await expect(page.locator('.reader__html').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quick check' })).toBeVisible();
  expect(urls).toEqual(['static-routing.json']);
  // a second visit uses what was loaded
  await page.evaluate(() => L4N.shell.go('#/'));
  await page.evaluate(() => L4N.shell.go('#/lessons/static-routing'));
  await expect(page.locator('.reader__html').first()).toBeVisible();
  expect(urls).toEqual(['static-routing.json']);
  expect(errors()).toEqual([]);
});

test('offline, a lesson says it needs a connection and offers the single file, which is there', async ({ page, request }) => {
  await page.route('**/lesson-data/**', r => r.abort());
  await open(page, '#/lessons/static-routing');
  await expect(page.getByText('This lesson needs a connection.')).toBeVisible();
  const link = page.getByRole('link', { name: 'Download Lab4Net for offline use' });
  await expect(link).toHaveAttribute('href', 'lab4net.html');
  const res = await request.get('/lab4net.html');
  expect(res.status()).toBe(200);
  expect((await res.text()).includes('//LESSONS-DATA-START')).toBe(true);
  // the rest of the app still works
  await page.evaluate(() => L4N.shell.go('#/labs/static-routing'));
  await expect(page.locator('#gradeBtn')).toBeVisible();
  // and with the connection back, Try again loads it
  await page.evaluate(() => L4N.shell.go('#/lessons/static-routing'));
  await expect(page.getByText('This lesson needs a connection.')).toBeVisible();
  await page.unroute('**/lesson-data/**');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.reader__html').first()).toBeVisible();
});

test('the lesson pages, sitemap, share image and licences are at the same addresses', async ({ request }) => {
  for (const p of ['/lessons/', '/lessons/static-routing.html', '/lessons/site.css', '/sitemap.xml', '/og.png', '/LICENSE', '/THIRD-PARTY-NOTICES.md'])
    expect((await request.get(p)).status(), p).toBe(200);
});
