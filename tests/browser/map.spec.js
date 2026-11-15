// The network map and the workspace panes (Phase 3 acceptance).
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const INSTANT = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } };
const node = (page, dev) => page.locator(`#ws-map .node[data-dev="${dev}"]`);
const prompt = page => page.locator('.con__prompt');
async function lab(page, slug, main) { await open(page, '#/labs/' + (slug || 'static-routing'), { main: main || INSTANT }); await expect(node(page, 'R1')).toBeVisible(); }
const exec = (page, dev, lines) => page.evaluate(([d, l]) => { for (const x of l) L4N.test.exec(d, x); }, [dev, [].concat(lines)]);
async function solve(page) { await page.evaluate(() => { const lab = LABS.find(l => l.title === 'Static routing'); for (const [d, cmds] of Object.entries(lab.solution)) for (const c of cmds) L4N.test.exec(d, c); }); }

test('clicking a device or pressing Enter on it opens its console', async ({ page }) => {
  await lab(page);
  await node(page, 'R2').click();
  await expect(prompt(page)).toHaveText('R2>');
  await expect(page.locator('.con__input')).toBeFocused();
  await expect(node(page, 'R2')).toHaveAttribute('aria-pressed', 'true');
  await node(page, 'R3').focus();
  await page.keyboard.press('Enter');
  await expect(prompt(page)).toHaveText('R3>');
  // arrow keys move between devices by position
  await node(page, 'R2').focus();
  await page.keyboard.press('ArrowRight');
  await expect(node(page, 'R3')).toBeFocused();
});

test('hover: icon to label and back in 2 px steps shows the tooltip once and never hides it', async ({ page }) => {
  await lab(page);
  const box = await node(page, 'R2').locator('.node__icon').boundingBox();
  const label = await node(page, 'R2').locator('.node__label').boundingBox();
  const x = box.x + box.width / 2, y0 = box.y + box.height / 2, y1 = label.y + label.height / 2;
  await page.evaluate(() => {
    window.__shows = 0;
    const t = document.querySelector('.maptip');
    new MutationObserver(() => { if (!t.hidden) window.__shows++; }).observe(t, { attributes: true, attributeFilter: ['hidden'] });
  });
  await page.mouse.move(x, y0);
  await expect(page.locator('.maptip')).toBeVisible();
  await expect(page.locator('.maptip')).toContainText('R2');
  for (const [a, b] of [[y0, y1], [y1, y0]]) {
    const step = a < b ? 2 : -2;
    for (let y = a; step > 0 ? y <= b : y >= b; y += step) {
      await page.mouse.move(x, y);
      const r = await page.evaluate(([px, py]) => { const t = document.querySelector('.maptip'), b = t.getBoundingClientRect(); return { hidden: t.hidden, under: px >= b.left && px <= b.right && py >= b.top && py <= b.bottom }; }, [x, y]);
      expect(r.hidden, 'tooltip hidden at y=' + y).toBe(false);
      expect(r.under, 'tooltip under the pointer at y=' + y).toBe(false);
    }
  }
  expect(await page.evaluate(() => window.__shows)).toBe(1);
  // moving away hides it; keyboard focus shows it; Esc hides it
  await page.mouse.move(5, 5);
  await expect(page.locator('.maptip')).toBeHidden();
  await node(page, 'R1').focus();
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.maptip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.maptip')).toBeHidden();
});

test('device and link elements are the same DOM nodes before and after 20 commands', async ({ page }) => {
  await lab(page);
  await page.evaluate(() => { document.querySelectorAll('#ws-map .node, #ws-map .link').forEach((n, i) => { n.__keep = i + 1; }); });
  const before = await page.evaluate(() => document.querySelectorAll('#ws-map .node, #ws-map .link').length);
  const cmds = ['enable', 'configure terminal', 'hostname CORE', 'interface g0/1', 'shutdown', 'no shutdown', 'exit', 'ip route 192.168.3.0 255.255.255.0 10.0.12.2',
    'end', 'show ip route', 'ping 192.168.3.10', 'show ip interface brief', 'configure terminal', 'hostname R1', 'end', 'show version', 'ping 10.0.12.2', 'show running-config', 'show clock', 'show cdp neighbors'];
  expect(cmds.length).toBe(20);
  await exec(page, 'R1', cmds);
  const after = await page.evaluate(() => [...document.querySelectorAll('#ws-map .node, #ws-map .link')].map(n => n.__keep || 0));
  expect(after.length).toBe(before);
  expect(after.every(Boolean)).toBe(true);
});

test('a working ping ends with the success marker and "Reply received"', async ({ page }) => {
  await lab(page);
  await solve(page);
  await exec(page, 'PC1', 'ping 192.168.3.10');
  await expect(node(page, 'PC1').locator('.badge__icon.is-ok')).toBeAttached({ timeout: 15000 });
  await expect(page.locator('#ws-trace')).toContainText('Reply received');
  await expect(page.locator('#ws-trace')).toContainText('PC1 → R1 → R2 → R3 → PC2');
});

test('a failing ping ends with the failure marker on the right device and the reason in words', async ({ page }) => {
  await lab(page);
  await exec(page, 'PC1', 'ping 192.168.3.10');
  await expect(node(page, 'R1').locator('.badge__icon.is-bad')).toBeAttached({ timeout: 15000 });
  await expect(page.locator('.mapchip')).toHaveText('No route from here');
  await expect(page.locator('#ws-trace')).toContainText('stopped at R1');
  // markers stay until the next command
  await page.waitForTimeout(2000);
  await expect(node(page, 'R1').locator('.badge__icon.is-bad')).toBeAttached();
  await exec(page, 'PC1', 'ipconfig');
  await expect(node(page, 'R1').locator('.badge__icon')).toHaveCount(0);
});

test('a link taken down with shutdown changes to the down style at both ends', async ({ page }) => {
  await lab(page);
  const link = page.locator('#ws-map .link').filter({ has: page.locator('.link__mark') }).nth(1); // R1 G0/1 to R2
  await expect(link).not.toHaveClass(/is-down/);
  await exec(page, 'R1', ['enable', 'configure terminal', 'interface g0/1', 'shutdown']);
  const down = page.locator('#ws-map .link.is-down');
  await expect(down).toHaveCount(1);
  await expect(down.locator('.link__mark.is-down')).toHaveCount(2);
  await expect(page.locator('#ws-map ul.sr-only')).toContainText('R1 Gi0/1 to R2 Gi0/0, down.');
  await exec(page, 'R1', 'no shutdown');
  await expect(page.locator('#ws-map .link.is-down')).toHaveCount(0);
});

test('with reduced motion no dot moves and the result still shows', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await lab(page);
  await solve(page);
  await page.evaluate(() => { window.__dots = 0; new MutationObserver(m => { for (const r of m) for (const n of r.addedNodes) if (n.classList && n.classList.contains('pkt')) window.__dots++; }).observe(document.querySelector('#ws-map .l-fx'), { childList: true }); });
  await exec(page, 'PC1', 'ping 192.168.3.10');
  await expect(node(page, 'PC1').locator('.badge__icon.is-ok')).toBeAttached();
  await expect(page.locator('#ws-map .hi')).not.toHaveCount(0);
  expect(await page.evaluate(() => window.__dots)).toBe(0);
});

test('dividers: pointer and keyboard, limits, reset and survival across a reload', async ({ page }) => {
  await lab(page);
  const h1 = page.getByRole('separator', { name: 'Resize the Tasks panel' });
  const tasks = page.locator('#ws-tasks');
  const width = async () => Math.round((await tasks.boundingBox()).width);
  expect(await width()).toBe(340);
  // pointer: drag far right stops at 520 (or earlier, to keep 80 console columns), far left stops at 280
  const b = await h1.boundingBox();
  await page.mouse.move(b.x + 0.5, b.y + 200); await page.mouse.down(); await page.mouse.move(b.x + 600, b.y + 200, { steps: 5 }); await page.mouse.up();
  expect(await width()).toBeLessThanOrEqual(520);
  expect(await width()).toBeGreaterThan(400);
  const b2 = await h1.boundingBox();
  await page.mouse.move(b2.x + 0.5, b2.y + 200); await page.mouse.down(); await page.mouse.move(0, b2.y + 200, { steps: 5 }); await page.mouse.up();
  expect(await width()).toBe(280);
  // keyboard: arrows move 16 px, Home and End go to the limits
  await h1.focus();
  await page.keyboard.press('ArrowRight');
  expect(await width()).toBe(296);
  await page.keyboard.press('End');
  const max = await width();
  expect(max).toBeLessThanOrEqual(520);
  await page.keyboard.press('Home');
  expect(await width()).toBe(280);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  expect(await width()).toBe(312);
  await page.waitForTimeout(300);
  await page.reload();
  await expect(node(page, 'R1')).toBeVisible();
  expect(await width()).toBe(312);
  // the map divider: the map never goes under 160 px, the console never under 200 px
  const h2 = page.getByRole('separator', { name: 'Resize the map and the console' });
  await h2.focus();
  await page.keyboard.press('Home');
  expect(Math.round((await page.locator('#ws-map').boundingBox()).height)).toBe(160);
  await page.keyboard.press('End');
  expect(Math.round((await page.locator('#ws-console').boundingBox()).height)).toBeGreaterThanOrEqual(200);
  // double-click resets
  await h1.dblclick();
  expect(await width()).toBe(340);
});

test('collapse, maximise, and the console keeps 80 columns at 1366 by 768', async ({ page }) => {
  await lab(page);
  const cols = await page.evaluate(() => {
    const out = document.querySelector('.con__out'), m = document.createElement('span');
    m.textContent = '0'.repeat(80); m.style.cssText = 'position:absolute;visibility:hidden;white-space:pre'; out.append(m);
    const w = m.getBoundingClientRect().width; m.remove();
    return { need: w, have: out.clientWidth - parseFloat(getComputedStyle(out).paddingLeft) - parseFloat(getComputedStyle(out).paddingRight) };
  });
  expect(cols.have).toBeGreaterThanOrEqual(cols.need);
  // Tasks collapses to a strip with the count; the strip opens it again
  await page.getByRole('button', { name: 'Collapse the Tasks panel' }).click();
  await expect(page.locator('#ws-tasks')).toBeHidden();
  const strip = page.getByRole('button', { name: /Expand the Tasks panel, 0 of 5 done/ });
  await expect(strip).toBeVisible();
  expect(Math.round((await page.locator('.tasks-strip').boundingBox()).width)).toBe(36);
  await strip.click();
  await expect(page.locator('#ws-tasks')).toBeVisible();
  // the map collapses to its header; the trace strip stays
  await page.getByRole('button', { name: 'Collapse the map' }).click();
  expect(Math.round((await page.locator('#ws-map').boundingBox()).height)).toBe(32);
  await expect(page.locator('#ws-trace')).toBeVisible();
  await page.getByRole('button', { name: 'Expand the map' }).click();
  // Maximise the console collapses the map; again restores it to exactly the height it had
  const before = Math.round((await page.locator('#ws-map').boundingBox()).height);
  expect(before).toBeGreaterThan(32);
  await page.getByRole('button', { name: 'Maximise the console' }).click();
  expect(Math.round((await page.locator('#ws-map').boundingBox()).height)).toBe(32);
  await page.getByRole('button', { name: 'Restore the map' }).click();
  expect(Math.round((await page.locator('#ws-map').boundingBox()).height)).toBe(before);
});

test('side by side layout from 1600 px, and its own saved sizes', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = watch(page);
  await lab(page);
  await page.getByRole('button', { name: 'More lab actions' }).click();
  await page.getByRole('menuitem', { name: 'Layout: side by side' }).click();
  await expect(page.locator('.ws')).toHaveAttribute('data-layout', 'side');
  const m = await page.locator('#ws-map').boundingBox(), c = await page.locator('#ws-console').boundingBox();
  expect(c.x).toBeGreaterThan(m.x + m.width - 2);
  await page.reload();
  await expect(page.locator('.ws')).toHaveAttribute('data-layout', 'side');
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('.ws')).toHaveAttribute('data-layout', 'stacked');
  expect(errors()).toEqual([]);
});
