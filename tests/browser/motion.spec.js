// Reduced motion: no running CSS animation or transition, console output is instant, no packet movement, results shown.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

const REAL = { v: 2, settings: { pace: 'real' }, ui: { landingSeen: true, hints: { stepTip: true } } };
const running = page => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().duration > 0).map(a => a.animationName || a.transitionProperty || 'animation'));

for (const how of ['the system setting', 'the Settings switch']) {
  test('with reduced motion from ' + how + ': nothing animates, output is instant, results still show', async ({ page }) => {
    const main = JSON.parse(JSON.stringify(REAL));
    if (how === 'the Settings switch') main.settings.motion = 'reduce'; else await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '#/labs/static-routing', { main });
    // chrome: a menu, a dialog, a toast, the palette
    await page.getByRole('button', { name: 'More lab actions' }).click();
    expect(await running(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await page.locator('#gradeBtn').click();
    expect(await running(page)).toEqual([]);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
    expect(await running(page)).toEqual([]);
    await page.keyboard.press('Escape');
    // the console: a real-time ping is printed at once
    await page.evaluate(() => { window.__dots = 0; new MutationObserver(m => { for (const r of m) for (const n of r.addedNodes) if (n.classList && n.classList.contains('pkt')) window.__dots++; }).observe(document.querySelector('#ws-map .l-fx'), { childList: true }); });
    await page.locator('.con__tab', { hasText: 'PC1' }).click();
    await page.locator('.con__input').fill('ping 192.168.1.1');
    await page.locator('.con__input').press('Enter');
    await expect(page.locator('.con__out')).toContainText('Ping statistics', { timeout: 500 });
    // the map: no dot moves, and the result is still shown
    await expect(page.locator('#ws-map .node[data-dev="PC1"] .badge__icon.is-ok')).toBeAttached();
    await expect(page.locator('#ws-trace')).toContainText('Reply received');
    expect(await page.evaluate(() => window.__dots)).toBe(0);
    // a lesson story step is a still picture
    await page.goto('/#/lessons/static-routing');
    await page.locator('.story').getByRole('button', { name: 'Start' }).click();
    await expect(page.locator('.story .badge__icon')).toHaveCount(1);
    expect(await running(page)).toEqual([]);
  });
}
