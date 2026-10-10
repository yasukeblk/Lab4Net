// Optional browser check for the step-by-step guide in its own browser window (second monitor).
// npm install --no-save playwright, then node tests/guidewin.cjs. Set LAB4NET_BROWSER_CHANNEL=msedge to use Edge.
// Serves index.html over http, as the container does, so both windows share one origin.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const file = path.join(__dirname, '../index.html');
  const server = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(fs.readFileSync(file)); });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ channel: process.env.LAB4NET_BROWSER_CHANNEL || undefined });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push('main: ' + e.message));
    await page.goto(base);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.setItem('l4n-boot', '1'); });
    await page.reload(); await page.waitForTimeout(400);
    await page.evaluate(() => openLab(LABS.findIndex(l => l.title === 'Static routing'), true));
    await page.locator('#guidePopBtn').click();
    assert.equal(await page.locator('#guideWin').isVisible(), true, 'in-page pop-out first');
    // a pop-out buried under other windows is pointed to from the checklist and comes to the front on request
    for (const sel of ['#mapPanel .panel-title', '#console', '#checkWin .panel-title']) await page.locator(sel).first().click({ position: { x: 5, y: 5 } });
    const onTop = () => page.evaluate(() => { const g = document.getElementById('guideWin').getBoundingClientRect(); const el = document.elementFromPoint(g.left + g.width / 2, g.top + g.height / 2); return !!(el && el.closest('#guideWin')); });
    assert.equal(await page.locator('.pop-note').count(), 1, 'checklist says where the steps are');
    await page.locator('#guideShow').click(); await page.waitForTimeout(200);
    assert.equal(await onTop(), true, 'Bring it to the front');
    await page.locator('#console').click({ position: { x: 5, y: 5 } });
    await page.locator('label.gswitch').first().click(); await page.locator('label.gswitch').first().click(); await page.waitForTimeout(200);
    assert.equal(await onTop(), true, 'switching the guide on raises the pop-out');
    const [pop] = await Promise.all([ctx.waitForEvent('page'), page.locator('#guideExt').click()]);
    pop.on('pageerror', e => errors.push('guide: ' + e.message));
    await pop.waitForFunction(() => document.querySelector('#guideBody .step'), null, { timeout: 8000 });
    assert.match(await pop.title(), /Static routing · guide/);
    assert.equal(await page.locator('#guideWin').isVisible(), false, 'in-page window hides while the guide window is open');
    // a step clicked in the guide window lands in the main console
    const step = pop.locator('#guideBody .step').nth(2);
    const want = await step.getAttribute('data-cmd'), dev = await step.getAttribute('data-dev');
    await step.click(); await page.waitForTimeout(400);
    assert.equal(await page.locator('#tin').inputValue(), want);
    assert.equal(await page.evaluate(() => cur.sel), dev);
    // changing lab updates it; reloading the main window finds it again
    await page.evaluate(() => openLab(LABS.findIndex(l => l.title === 'Standard ACL')));
    await pop.waitForFunction(() => /Standard ACL/.test(document.title), null, { timeout: 4000 });
    await page.reload(); await page.waitForTimeout(1500);
    assert.equal(await page.locator('#guideWin').isVisible(), false, 'reconnected after the main window reloaded');
    await page.evaluate(() => openLab(LABS.findIndex(l => l.title === 'Static routing')));
    await pop.waitForFunction(() => /Static routing/.test(document.title), null, { timeout: 5000 });
    // the guide window never starts the app, so it cannot touch saved work
    assert.equal(await pop.evaluate(() => { try { return typeof cur; } catch (e) { return 'never initialised'; } }), 'never initialised');
    // closing it brings the in-page window back; docking from it closes it
    await pop.close(); await page.waitForTimeout(600);
    assert.equal(await page.locator('#guideWin').isVisible(), true, 'falls back to the in-page window');
    const [pop2] = await Promise.all([ctx.waitForEvent('page'), page.locator('#guideExt').click()]);
    await pop2.waitForFunction(() => document.querySelector('#guideBody .step'));
    await pop2.locator('#guideClose').click(); await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => guidePop), false, 'docked');
    assert.deepEqual(errors, []);
    console.log('PASS guide window: buried pop-out is pointed to and raised, opens, shows the lab, sends steps to the console, follows lab changes, reconnects after reload, falls back when closed, docks.');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
