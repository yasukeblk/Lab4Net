// Shared helpers for the browser tests.
const path = require('path');
const { expect } = require('@playwright/test');

const ROOT = path.join(__dirname, '..', '..');
const FILE_URL = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/').replace(/^\/+/, '');

const ROUTES = ['#/', '#/labs', '#/labs/static-routing', '#/lessons', '#/lessons/static-routing', '#/practice', '#/practice/exam', '#/practice/quiz',
  '#/practice/subnetting', '#/sandbox', '#/progress', '#/settings', '#/dev/components'];

// Seed storage once per tab (a reload keeps what the page saved since).
async function seed(page, { theme, main, keys } = {}) {
  await page.addInitScript(([theme, main, keys]) => {
    try {
      if (sessionStorage.getItem('__seeded')) return;
      sessionStorage.setItem('__seeded', '1');
      for (const k in keys || {}) localStorage.setItem(k, typeof keys[k] === 'string' ? keys[k] : JSON.stringify(keys[k]));
      const v = main || JSON.parse(localStorage.getItem('lab4net:v2') || '{"v":2}');
      v.ui = Object.assign({ landingSeen: true }, v.ui);
      if (theme) v.settings = Object.assign({}, v.settings, { theme });
      localStorage.setItem('lab4net:v2', JSON.stringify(v));
    } catch (e) {}
  }, [theme || null, main || null, keys || null]);
}

// Collect page errors and console errors; call errors() at the end of a test.
function watch(page) {
  const list = [];
  page.on('pageerror', e => list.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') list.push('console: ' + m.text()); });
  return () => list;
}

async function open(page, route, opts) {
  await seed(page, opts);
  await page.goto('/' + (route || '#/'));
  await expect(page.locator('#screen')).toBeAttached();
  await settled(page);
}

// Wait until the app has drawn the screen the URL names (the hash changes before the app reacts).
async function settled(page) {
  await page.waitForFunction(() => window.L4N && L4N.router && document.querySelector('#screen') && document.querySelector('#screen').dataset.screen === L4N.router.parse(location.hash).screen);
}

// Go to a hash route in the same page and wait for it.
async function go(page, route) {
  await page.goto('/' + route);
  await settled(page);
}

module.exports = { ROOT, FILE_URL, ROUTES, seed, watch, open, settled, go };
