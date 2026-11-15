// The app shell: routes, sidebar, palette, shortcuts, focus, titles, theme and motion.
const { test, expect } = require('@playwright/test');
const { ROUTES, FILE_URL, seed, watch, open, settled, go } = require('./helpers');

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('routes', () => {
  test('every route loads from a local server with no console errors', async ({ page }) => {
    const errors = watch(page);
    await open(page, '#/');
    for (const r of ROUTES) {
      await page.goto('/' + r);
      await expect(page.locator('#screen h1')).toBeVisible();
    }
    expect(errors()).toEqual([]);
  });

  test('every route loads from a local file with no console errors', async ({ page }) => {
    const errors = watch(page);
    await seed(page);
    for (const r of ROUTES) {
      await page.goto(FILE_URL + r);
      await expect(page.locator('#screen h1')).toBeVisible();
    }
    expect(errors()).toEqual([]);
  });

  test('document titles follow the screen', async ({ page }) => {
    await open(page, '#/settings');
    await expect(page).toHaveTitle('Settings · Lab4Net');
    await page.goto('/#/labs/static-routing');
    await expect(page).toHaveTitle('Static routing · Lab4Net');
    await page.goto('/#/');
    await expect(page).toHaveTitle(/^Lab4Net/);
  });

  test('an unknown slug lands on the list with a toast, and markup in the hash is never shown', async ({ page }) => {
    const errors = watch(page);
    await open(page, '#/');
    await page.goto('/#/labs/no-such-lab');
    await expect(page.getByText('That link is out of date.')).toBeVisible();
    await expect(page).toHaveURL(/#\/labs$/);
    await page.goto('/#/labs/%3Cimg%20src=x%20onerror=window.__pwn=1%3E');
    await expect(page.locator('#screen h1')).toHaveText('Labs');
    expect(await page.evaluate(() => window.__pwn)).toBeUndefined();
    expect(errors()).toEqual([]);
  });
});

test.describe('sidebar', () => {
  test('[ collapses to a rail and back, and the choice is remembered', async ({ page }) => {
    await open(page, '#/settings');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('[');
    await expect(page.locator('#app')).toHaveAttribute('data-sidebar', 'rail');
    await page.reload();
    await expect(page.locator('#app')).toHaveAttribute('data-sidebar', 'rail');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('[');
    await expect(page.locator('#app')).toHaveAttribute('data-sidebar', 'open');
  });

  test('the current item is marked, and links navigate', async ({ page }) => {
    await open(page, '#/');
    await page.locator('.sidebar').getByRole('link', { name: /^Lessons/ }).click();
    await expect(page).toHaveURL(/#\/lessons$/);
    await expect(page.locator('.sidebar [aria-current="page"]')).toHaveAttribute('data-nav', 'lessons');
  });
});

test.describe('command palette', () => {
  test('Ctrl/Cmd+K opens it from every screen and Esc returns focus', async ({ page }) => {
    await open(page, '#/');
    for (const r of ROUTES) {
      await go(page, r);
      const btn = page.locator('.sb__search');
      await btn.focus();
      await page.keyboard.press(MOD + '+k');
      await expect(page.getByRole('combobox', { name: 'Search or jump to' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      await expect(btn).toBeFocused();
    }
  });

  test('filters and runs a command', async ({ page }) => {
    await open(page, '#/');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press(MOD + '+k');
    await page.keyboard.type('light');
    await expect(page.getByRole('option').first()).toContainText('Theme: light');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.keyboard.press(MOD + '+k');
    await page.keyboard.type('settings');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.locator('#screen h1')).toBeFocused();
  });

  test('typed markup stays text', async ({ page }) => {
    await open(page, '#/');
    await page.keyboard.press(MOD + '+k');
    await page.keyboard.type('<img src=x onerror=window.__pwn=1>');
    await expect(page.locator('.pal__empty')).toBeVisible();
    expect(await page.evaluate(() => window.__pwn)).toBeUndefined();
  });
});

test.describe('shortcuts', () => {
  test('G then a letter goes to each screen', async ({ page }) => {
    await open(page, '#/');
    const go = { l: /#\/labs$/, e: /#\/lessons$/, p: /#\/practice$/, b: /#\/sandbox$/, r: /#\/progress$/, ',': /#\/settings$/, h: /#\/$/ };
    for (const [k, url] of Object.entries(go)) {
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press('g');
      await page.keyboard.press(k);
      try { await expect(page).toHaveURL(url); } catch (err) { console.log('KEYLOG', JSON.stringify(await page.evaluate(() => window.__log.slice(-8)))); throw err; }
      await settled(page);
    }
  });

  test('? shows the shortcut list, Esc closes it', async ({ page }) => {
    await open(page, '#/');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Shift+?');
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('single keys do nothing while typing in an input', async ({ page }) => {
    await open(page, '#/dev/components');
    const f = page.getByRole('searchbox', { name: 'Filter labs (Dark)' });
    await f.click();
    await page.keyboard.type('g l [');
    await expect(page).toHaveURL(/#\/dev\/components$/);
    await expect(page.locator('#app')).toHaveAttribute('data-sidebar', 'open');
    await expect(f).toHaveValue('g l [');
  });

  test('Alt shortcuts are read from the physical key in this browser', async ({ page }) => {
    await open(page, '#/');
    await page.evaluate(() => { window.__alt = []; window.addEventListener('keydown', e => { for (const k of ['alt+.', 'alt+,']) if (L4N.keys.matches(e, k)) window.__alt.push(k); }, true); });
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Alt+Period');
    await page.keyboard.press('Alt+Comma');
    expect(await page.evaluate(() => window.__alt)).toEqual(['alt+.', 'alt+,']);
  });
});

test.describe('keyboard only', () => {
  test('the shell works with Tab and Enter, and focus is always visible', async ({ page }) => {
    await open(page, '#/');
    await page.keyboard.press('Tab');
    let seen = 0;
    for (let i = 0; i < 14; i++) {
      const info = await page.evaluate(() => {
        const a = document.activeElement;
        const cs = getComputedStyle(a);
        const ring = cs.boxShadow !== 'none' || (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0);
        const inner = a.querySelector && a.querySelector('.toggle__track, .check__box');
        return { tag: a.tagName, ring: ring || (inner && getComputedStyle(inner).boxShadow !== 'none') };
      });
      if (info.tag !== 'BODY') { expect(info.ring, 'focus ring on ' + info.tag).toBeTruthy(); seen++; }
      await page.keyboard.press('Tab');
    }
    expect(seen).toBeGreaterThan(8);
    // reach Settings from the sidebar with the keyboard
    await page.locator('.sidebar').getByRole('link', { name: 'Settings' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/settings$/);
  });

  test('the theme menu works with arrows and Enter', async ({ page }) => {
    await open(page, '#/');
    await page.getByRole('button', { name: 'Theme' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu', { name: 'Theme' })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'Theme' })).toBeFocused();
  });
});

test.describe('theme', () => {
  test('changes at once and is remembered', async ({ page }) => {
    await open(page, '#/settings');
    await page.getByRole('radio', { name: 'Light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('System follows the operating system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page, '#/settings', { theme: 'system' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the theme is set before the first paint', async ({ page }) => {
    await seed(page, { theme: 'light' });
    let early = null;
    await page.exposeFunction('__early', v => { early = v; });
    await page.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => window.__early(document.documentElement.getAttribute('data-theme'))); });
    await page.goto('/#/');
    await expect.poll(() => early).toBe('light');
  });
});

test.describe('motion', () => {
  for (const how of ['media', 'setting']) {
    test('with reduced motion (' + how + ') no transition or animation runs', async ({ page }) => {
      if (how === 'media') await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page, '#/dev/components', how === 'setting' ? { main: { v: 2, settings: { motion: 'reduce' }, ui: { landingSeen: true } } } : {});
      await page.getByRole('button', { name: 'Open dialog' }).first().click();
      const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().duration > 0).length);
      expect(running).toBe(0);
      const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.btn')).transitionDuration);
      expect(dur.split(',').every(d => parseFloat(d) === 0)).toBeTruthy();
    });
  }
});
