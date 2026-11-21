// Grade messages: a failed grade is said once, in Results, unless Results is off screen (a phone's map or console
// pane); a lab's or exam's toast closes when you leave its screen; toasts about a redirect still show.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const INSTANT = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } };
const solve = (page, slug) => page.evaluate(slug => {
  const lab = LABS.find(l => L4N.slug(l.title) === slug);
  for (const [dev, cmds] of Object.entries(lab.solution)) for (const c of cmds) L4N.test.exec(dev, c);
}, slug);

test('a failed grade shows in Results with no toast; Lab complete closes when you leave the lab', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/labs/static-routing', { main: JSON.parse(JSON.stringify(INSTANT)) });
  await page.locator('#gradeBtn').click();
  await expect(page.locator('.results__sum')).toContainText('checks pass');
  await expect(page.locator('.toast')).toHaveCount(0);

  await solve(page, 'static-routing');
  await page.locator('#gradeBtn').click();
  await expect(page.locator('.toast')).toContainText('Lab complete');
  await page.evaluate(() => L4N.shell.go('#/lessons'));
  await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'lessons');
  await expect(page.locator('.toast')).toHaveCount(0);

  // a toast shown just before a redirect is not tied to a screen, so it survives the move
  await page.evaluate(() => L4N.shell.go('#/labs/no-such-lab'));
  await expect(page.locator('.toast')).toContainText('That link is out of date');
  expect(errors()).toEqual([]);
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('grading from the console pane still says how many checks pass, and the lab title fits', async ({ page }) => {
    const errors = watch(page);
    await open(page, '#/labs/basic-device-setup', { main: JSON.parse(JSON.stringify(INSTANT)) });
    // the lab's status chip gives way to the title on a phone; the Tasks panel already counts what's done
    await expect(page.locator('.topbar__lab')).toBeHidden();
    const cut = await page.locator('.crumbs [aria-current="page"], .crumbs li:last-child span').first().evaluate(n => n.scrollWidth > n.clientWidth);
    expect(cut).toBe(false);
    await page.getByRole('navigation', { name: 'Workspace panes' }).getByRole('button', { name: 'Console' }).click();
    await page.locator('#gradeBtn').click();
    await expect(page.locator('.toast')).toContainText('checks pass');
    // on the Tasks pane, Results is in view, so no toast
    await page.locator('.toast').getByRole('button', { name: 'Dismiss' }).click();
    await page.getByRole('navigation', { name: 'Workspace panes' }).getByRole('button', { name: 'Tasks' }).click();
    await page.locator('#gradeBtn').click();
    await expect(page.locator('.results__sum')).toContainText('checks pass');
    await expect(page.locator('.toast')).toHaveCount(0);
    expect(errors()).toEqual([]);
  });
});
