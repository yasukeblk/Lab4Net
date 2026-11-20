// 390 by 844: no sideways scroll, the drawer, the workspace pane bar, console helper keys, 40 px targets.
const { test, expect } = require('@playwright/test');
const { ROUTES, open, go } = require('./helpers');

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
const INSTANT = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } };

async function noSideways(page) {
  // Measure what is painted: the workspace and sandbox switch to their one-pane phone layout in requestAnimationFrame
  // (panes.js), which runs before the first paint. Measuring before that frame saw the unpainted desktop layout
  // ("screen 561 > 390" on the sandbox, once, on a slow CI runner).
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const r = await page.evaluate(() => {
    const bad = [];
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) bad.push('page ' + de.scrollWidth + ' > ' + de.clientWidth);
    const s = document.querySelector('#screen');
    if (s && s.scrollWidth > s.clientWidth + 1) bad.push('screen ' + s.scrollWidth + ' > ' + s.clientWidth);
    return bad;
  });
  expect(r).toEqual([]);
}

test('no route scrolls sideways', async ({ page }) => {
  await open(page, '#/', { main: INSTANT });
  for (const r of ROUTES) { await go(page, r); await noSideways(page); }
  // and an exam running
  await page.evaluate(() => { L4N.exam.begin('sabotage', 20, { seed: 7 }); L4N.shell.go('#/practice/exam/run'); });
  await expect(page.locator('#gradeBtn')).toBeAttached();
  await noSideways(page);
});

test('touch targets on every screen are at least 40 px tall', async ({ page }) => {
  await open(page, '#/', { main: INSTANT });
  const bad = [];
  for (const r of ROUTES.filter(r => !r.startsWith('#/dev'))) {
    await go(page, r);
    bad.push(...await page.evaluate(r => [...document.querySelectorAll('#screen button, #screen [role="radio"], #screen [role="tab"], #screen select, .topbar button')]
      .filter(b => b.offsetParent && !b.closest('.map, .l-map, svg'))
      .map(b => [r, (b.textContent.trim() || b.getAttribute('aria-label') || '').slice(0, 30), Math.round(b.getBoundingClientRect().height)]).filter(x => x[2] < 40), r));
  }
  expect(bad).toEqual([]);
});

test('the sidebar is a drawer opened from the top bar', async ({ page }) => {
  await open(page, '#/settings', { main: INSTANT });
  await expect(page.locator('#sidebar')).toBeHidden();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('#sidebar')).toBeVisible();
  await page.locator('#sidebar').getByRole('link', { name: /^Labs/ }).click();
  await expect(page).toHaveURL(/#\/labs$/);
  await expect(page.locator('#sidebar')).toBeHidden();
});

test('workspace: one pane at a time, the bottom bar switches, helper keys work', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: INSTANT });
  const bar = page.getByRole('navigation', { name: 'Workspace panes' });
  await expect(bar).toBeVisible();
  await expect(page.locator('#ws-tasks')).toBeVisible();
  await expect(page.locator('#ws-console')).toBeHidden();
  await bar.getByRole('button', { name: 'Map' }).click();
  await expect(page.locator('#ws-map .node[data-dev="R1"]')).toBeVisible();
  await expect(page.locator('#ws-tasks')).toBeHidden();
  await bar.getByRole('button', { name: 'Console' }).click();
  await expect(page.locator('#ws-console')).toBeVisible();
  await noSideways(page);
  const input = page.locator('.con__input');
  const keys = page.getByRole('toolbar', { name: 'Console keys' });
  await input.fill('en');
  await keys.getByRole('button', { name: 'Complete the word' }).click();
  await expect(input).toHaveValue('enable ');
  await input.press('Enter');
  await expect(page.locator('.con__prompt')).toHaveText('R1#');
  await input.fill('show ');
  await keys.getByRole('button', { name: 'Help' }).click();
  await expect(page.locator('.con__out')).toContainText('R1#show ?');
  await input.fill('');
  await keys.getByRole('button', { name: 'Previous command' }).click();
  await expect(input).toHaveValue('enable ');
  await input.fill('configure terminal'); await input.press('Enter');
  await keys.getByRole('button', { name: 'End configuration' }).click();
  await expect(page.locator('.con__prompt')).toHaveText('R1#');
  // a ping shows a one-line result above the input with "View on map"
  await page.locator('.con__tab', { hasText: 'PC1' }).click();
  await input.fill('ping 192.168.3.10'); await input.press('Enter');
  await expect(page.locator('.con__result')).toContainText('No usable route');
  await page.getByRole('button', { name: 'View on map' }).click();
  await expect(page.locator('#ws-map')).toBeVisible();
  await expect(page.locator('#ws-trace')).toBeVisible();
  await noSideways(page);
});

test('touch targets are at least 40 px tall', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: INSTANT });
  await page.getByRole('navigation', { name: 'Workspace panes' }).getByRole('button', { name: 'Console' }).click();
  const small = await page.evaluate(() => [...document.querySelectorAll('.ws__pb, .con__helpers .btn, .topbar .btn, .con__tab')]
    .filter(b => b.offsetParent).map(b => [b.textContent.trim() || b.getAttribute('aria-label'), Math.round(b.getBoundingClientRect().height)]).filter(([, h]) => h < 40));
  expect(small).toEqual([]);
});
