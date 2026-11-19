// The lab screen layout (FIXES-PLAN.md phase 5): tasks first, a map sized to the network, room for the console,
// and a "Why" line that opens to full size.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');
const SLUGS = require('../fixtures/slugs.json');

const NEW = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } };
const labs = SLUGS.labs.filter(l => !l.capstone);   // every build lab and incident

// Is the first task's text fully inside the Tasks panel (and the window) without scrolling?
const firstTaskShown = page => page.evaluate(() => {
  const panel = document.querySelector('#ws-tasks [role="tabpanel"]') || document.querySelector('#ws-tasks');
  const t = document.querySelector('#ws-tasks .task .task__text');
  const pr = panel.getBoundingClientRect(), tr = t.getBoundingClientRect();
  return tr.top >= pr.top && tr.bottom <= Math.min(pr.bottom, innerHeight);
});

const BATCH = 15;
for (let start = 0; start < labs.length; start += BATCH) {
  const batch = labs.slice(start, start + BATCH);
  test(`1366x768: the first task shows without scrolling (labs ${start + 1} to ${start + batch.length})`, async ({ browser }) => {
    for (const l of batch) {
      const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      await open(page, '#/labs/' + l.slug, { main: JSON.parse(JSON.stringify(NEW)) });
      await expect(page.locator('#ws-tasks .task').first()).toBeVisible();
      expect(await firstTaskShown(page), l.slug).toBe(true);
      await page.close();
    }
  });
}

test('Static routing: the map is short for a line of routers and the console shows at least 18 lines', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: NEW });
  const m = await page.evaluate(() => {
    const out = document.querySelector('.con__out'), lh = parseFloat(getComputedStyle(out).lineHeight) || 20;
    return { map: document.querySelector('#ws-map').getBoundingClientRect().height, lines: Math.floor(out.clientHeight / lh) };
  });
  expect(m.lines).toBeGreaterThanOrEqual(18);
  expect(m.map).toBeLessThan(200);
});

test('a mesh gets a taller map than a line', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: NEW });
  const line = await page.locator('#ws-map').evaluate(e => e.getBoundingClientRect().height);
  await open(page, '#/labs/incident-07-one-branch-fell-off-the-map', { main: NEW });
  const mesh = await page.locator('#ws-map').evaluate(e => e.getBoundingClientRect().height);
  expect(mesh).toBeGreaterThan(line + 60);
});

test('the address plan is an Addresses tab, in view from anywhere in the tasks; a capstone also has it open under the brief', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: NEW });
  // nothing about addresses in the Tasks tab of a build lab, so the first task keeps its place (tests above)
  await expect(page.locator('#ws-tasks .addr-plan')).toHaveCount(0);
  // scrolled to the last task, the tab is still in view
  await page.locator('#ws-tasks .task').last().scrollIntoViewIfNeeded();
  const tab = page.getByRole('tab', { name: 'Addresses' });
  await expect(tab).toBeInViewport();
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  const rows = await page.evaluate(() => L4N.data.lab('static-routing').lab.addr.length);
  await expect(page.getByRole('tabpanel').locator('table.addr tbody tr')).toHaveCount(rows);
  await expect(page.locator('#ws-tasks .tasklist')).toBeHidden();
  // the header holds three tabs and the widest count ("10 of 10 checks") on one line
  const head = await page.evaluate(() => {
    const h = document.querySelector('#ws-tasks .pane__head'), c = h.querySelector('.tasks__count');
    c.textContent = '10 of 10 checks';
    return { overflow: h.scrollWidth - h.clientWidth, countH: c.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(c).lineHeight) || 20 };
  });
  expect(head.overflow).toBeLessThanOrEqual(0);
  expect(head.countH).toBeLessThanOrEqual(head.lh * 1.5);
  await page.getByRole('tab', { name: 'Tasks' }).click();
  await expect(page.locator('#ws-tasks .tasklist')).toBeVisible();

  // a capstone: the plan is the brief, so it is open right under it, and a redraw keeps it as it was left
  const cap = SLUGS.labs.find(l => l.capstone);
  await open(page, '#/labs/' + cap.slug, { main: NEW });
  const plan = page.locator('#ws-tasks .tasks__intro + details.addr-plan');
  await expect(plan).toHaveJSProperty('open', true);
  await plan.locator('summary').click();
  await page.evaluate(() => L4N.workspace.current().tasksView.rebuild());
  await expect(page.locator('#ws-tasks .addr-plan')).toHaveJSProperty('open', false);
  await expect(page.getByRole('tab', { name: 'Addresses' })).toBeVisible();
});

test('phone: on the Tasks tab, task 1 shows without scrolling', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await open(page, '#/labs/static-routing', { main: NEW });
  await expect(page.locator('#ws-tasks .task').first()).toBeVisible();
  expect(await firstTaskShown(page)).toBe(true);
  await ctx.close();
});

test('the Why line opens to body size with More and closes with Less', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/labs/static-routing', { main: NEW });
  await page.locator('.con__input').fill('enable'); await page.locator('.con__input').press('Enter');
  await page.locator('.con__input').fill('show ip route'); await page.locator('.con__input').press('Enter');
  const why = page.locator('.con__why');
  const more = why.getByRole('button', { name: 'Show all about this command' });
  await expect(why).toContainText('What it does:');
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  const small = await why.evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  await more.click();
  await expect(why).toHaveClass(/is-open/);
  const less = why.getByRole('button', { name: 'Show less about this command' });
  await expect(less).toHaveAttribute('aria-expanded', 'true');
  await expect(less).toBeFocused();
  expect(await why.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThan(small);
  // it stays open for the next command
  await page.locator('.con__input').fill('show ip interface brief'); await page.locator('.con__input').press('Enter');
  await expect(why).toHaveClass(/is-open/);
  await less.click();
  await expect(why).not.toHaveClass(/is-open/);
  expect(errors()).toEqual([]);
});
