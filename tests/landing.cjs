// Optional browser check (Playwright, like ui.cjs) for the title screen: shown to first-time visitors and with
// ?welcome, hidden for returning visitors and browser tests, Start and Esc enter the lab, How to use reopens it,
// live lab counts, share-preview tags, deep links from the lesson pages, the lesson pages themselves, and no network
// requests from a local copy.
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
    const don = await page.evaluate(() => SITE.donate);
    if (don) { assert.equal(await page.locator('#wDonate').isVisible(), true, 'donation button shows'); assert.equal(await page.locator('#wDonate').getAttribute('href'), don); assert.equal(await page.locator('#wDonate').getAttribute('target'), '_blank'); }
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
    // deep links from the lesson pages open the lab or lesson, skip the title screen and tidy the address bar
    const fresh = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    fresh.on('pageerror', e => errors.push(e.message));
    await fresh.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    await fresh.goto(url + '?lab=static-routing'); await fresh.waitForTimeout(400);
    assert.equal(await fresh.locator('#welcome').isVisible(), false, 'a lab link skips the title screen');
    assert.equal(await fresh.evaluate(() => cur.lab.title), 'Static routing', '?lab= opens that lab');
    assert.equal(await fresh.evaluate(() => location.search), '', 'the link parameter is removed');
    await fresh.goto(url + '?lesson=tcp-and-udp'); await fresh.waitForTimeout(400);
    assert.equal(await fresh.evaluate(() => cur.view), 'lessons', '?lesson= opens the lessons view');
    assert.match(await fresh.locator('#practice').innerText(), /TCP and UDP/i);
    await fresh.goto(url + '?lab=no-such-lab'); await fresh.waitForTimeout(400);
    assert.match(await fresh.locator('#notice').innerText(), /out of date/, 'an old link explains itself');
    // the lesson pages render with their fonts, make no requests from a file, and fit a phone
    const lp = pathToFileURL(path.join(__dirname, '../lessons/static-routing.html')).href;
    for (const vp of [{ width: 1366, height: 768 }, { width: 390, height: 844, isMobile: true }]) {
      const { isMobile, ...viewport } = vp;
      const pg = await (await browser.newContext({ viewport, isMobile: !!isMobile })).newPage();
      pg.on('pageerror', e => errors.push('lesson page: ' + e.message));
      pg.on('request', r => { if (!/^(file|data):/.test(r.url())) requests.push(r.url()); });
      for (const u of [lp, lp.replace('static-routing.html', 'index.html')]) {
        await pg.goto(u); await pg.evaluate(() => document.fonts.ready);
        assert.ok(await pg.evaluate(() => document.fonts.check('italic 800 20px "Barlow Condensed"') && document.fonts.check('16px "IBM Plex Sans"')), 'fonts load');
        assert.ok(await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'no sideways scroll at ' + viewport.width + 'px: ' + u);
      }
    }
    assert.deepEqual(errors, []); assert.deepEqual(requests, [], 'no network requests while the counter is off');
    console.log('PASS landing: title screen for first visits and ?welcome, skipped for returning visitors and tests, Start/Esc/How to use, live counts, share tags, phone, ?lab= and ?lesson= deep links, lesson pages render and fit a phone, no requests.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
