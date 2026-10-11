// Optional browser check (Playwright, like ui.cjs) for the title screen: shown to first-time visitors and with
// ?welcome, hidden for returning visitors and browser tests, Start and Esc enter the lab, How to use reopens it,
// live lab counts, share-preview tags, and no network requests while the counter is not configured.
// npm install --no-save playwright, then node tests/landing.cjs. Set LAB4NET_BROWSER_CHANNEL=msedge to use Edge.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const url = pathToFileURL(path.join(__dirname, '../index.html')).href;
  const browser = await chromium.launch({ channel: process.env.LAB4NET_BROWSER_CHANNEL || undefined });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (!/^(file|data):/.test(r.url())) requests.push(r.url()); });
    await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload();
    assert.equal(await page.locator('#welcome').isVisible(), false, 'browser tests go straight to the lab');
    await page.goto(url + '?welcome'); await page.waitForTimeout(300);
    assert.equal(await page.locator('#welcome').isVisible(), true, '?welcome shows the title screen');
    const n = await page.evaluate(() => ({ labs: LABS.length, shown: document.querySelector('[data-w="labs"]').textContent }));
    assert.equal(+n.shown, n.labs, 'the lab count is live');
    await page.locator('#wStart').click();
    assert.equal(await page.locator('#welcome').isVisible(), false, 'Start enters the lab');
    assert.equal(await page.evaluate(() => localStorage.getItem('lab4net-welcomed')), '1');
    await page.locator('#help').click(); await page.locator('#showTitle').click();
    assert.equal(await page.locator('#welcome').isVisible(), true, 'How to use reopens it');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#welcome').isVisible(), false, 'Esc enters the lab');
    const meta = await page.evaluate(() => ['og:title', 'og:image', 'og:description'].map(p => document.querySelector(`meta[property="${p}"]`)?.content));
    assert.ok(meta.every(Boolean), 'share-preview tags'); assert.match(meta[1], /og\.png$/);
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
    await phone.goto(url + '?welcome'); await phone.waitForTimeout(300);
    assert.ok(await phone.evaluate(() => document.getElementById('welcome').scrollWidth - innerWidth) <= 1, 'no sideways scroll on a phone');
    assert.deepEqual(errors, []); assert.deepEqual(requests, [], 'no network requests while the counter is off');
    console.log('PASS landing: title screen for first visits and ?welcome, skipped for returning visitors and tests, Start/Esc/How to use, live counts, share tags, phone, no requests.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
