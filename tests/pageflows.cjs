// Optional browser checks (Playwright, like ui.cjs) for flows that live in the page rather than the engine: saved work
// replayed on reload, Transfer progress, and the exam sim. Each block names the docs/REVIEW-FIXES.md item it guards.
// npm install --no-save playwright, then node tests/pageflows.cjs. Set LAB4NET_BROWSER_CHANNEL=msedge to use Edge.
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
  const done = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const fresh = async (setup) => { await page.goto(base); await page.evaluate(setup || (() => {}));
      await page.evaluate(() => sessionStorage.setItem('l4n-boot', '1')); await page.reload(); await page.waitForTimeout(400); };
    await page.goto(base); await page.evaluate(() => localStorage.clear());

    // REVIEW-FIXES 2: saved work replays with each command at the time it was typed, so login block-for's quiet mode ends
    // as it did live and the commands after the telnet land on R2, not R1. Password answers stay out of history.
    await fresh(() => {
      const t0 = Date.now() - 600000, J = [], add = (device, line, sec) => J.push({ device, line, t: t0 + sec * 1000 });
      add('R2', 'enable', 0); add('R2', 'configure terminal', 0); add('R2', 'line vty 0 4', 1); add('R2', 'password vv', 1); add('R2', 'login', 1);
      add('R2', 'enable secret es', 1); add('R2', 'login block-for 30 attempts 3 within 60', 2); add('R2', 'end', 2);
      add('R1', 'enable', 3); add('R1', 'telnet 10.0.12.2', 4); add('R1', 'a', 5); add('R1', 'b', 6); add('R1', 'c', 7);
      add('R1', 'telnet 10.0.12.2', 52); add('R1', 'vv', 53); add('R1', 'enable', 54); add('R1', 'es', 55);
      add('R1', 'configure terminal', 56); add('R1', 'hostname HACKED', 57); add('R1', 'end', 58);
      localStorage.clear(); localStorage.setItem('lab4net-workspace-v1', JSON.stringify({ drafts: { 'Static routing': { journal: J, tasks: [] } }, lastLab: 4 }));
    });
    const lab = await page.evaluate(() => { const i = LABS.findIndex(l => l.title === 'Static routing'); if (cur.idx !== i) openLab(i); return cur.lab.title; });
    assert.equal(lab, 'Static routing');
    assert.deepEqual(await page.evaluate(() => [cur.net.devs.R1.hostname, cur.net.devs.R2.hostname]), ['R1', 'HACKED']);
    const hist = await page.evaluate(() => cur.sess.R1.hist);
    assert.ok(!hist.includes('vv') && !hist.includes('es') && !hist.includes('a'), 'password answers are not in history: ' + hist.join('|'));
    assert.ok(hist.includes('hostname HACKED'));
    done.push('replay at typed times');

    // REVIEW-FIXES 1: an engine error on one command prints an error line; the console and the rest of the page keep working,
    // and the same error during replay does not throw the saved work away.
    await page.evaluate(() => { window._ex = execLine; execLine = function (n, d, s, line) { if (line === 'boom') throw new Error('test fault'); return window._ex(n, d, s, line); }; select('R1'); execute('boom'); execute('show clock'); });
    const out = await page.evaluate(() => cur.sess.R1.lines.join('\n'));
    assert.match(out, /% Lab4Net internal error: test fault/); assert.ok(/\d\d:\d\d:\d\d/.test(out.split('test fault')[1]), 'the next command still runs');
    assert.equal(await page.evaluate(() => { saveWork(); openLab(cur.idx); return cur.journal.some(e => e.line === 'boom') && cur.net.devs.R2.hostname; }), 'HACKED', 'replay survives the error');
    await page.evaluate(() => { execLine = window._ex; });
    done.push('engine errors contained');

    // REVIEW-FIXES 3: Transfer progress carries the exam, campaign and sandbox-challenge stores, and a damaged store loads.
    await fresh(() => { localStorage.clear(); localStorage.setItem('lab4net-exam-v1', '{"history":null,"current":7}'); localStorage.setItem('lab4net-campaign-v1', '[1,2]'); localStorage.setItem('lab4net-sbx-done-v1', '5'); });
    assert.deepEqual(errors, [], 'a damaged store does not break the page');
    await page.evaluate(() => { localStorage.setItem('lab4net-exam-v1', JSON.stringify({ current: null, history: [{ date: '2026-10-01', base: 'Static routing', mode: 'daily', cleared: true, passed: 4, total: 4, rank: 'S', secs: 60, minutes: 20 }] }));
      localStorage.setItem('lab4net-campaign-v1', '{"stage":"basics"}'); localStorage.setItem('lab4net-sbx-done-v1', '{"0":1}'); });
    await page.locator('#transfer').click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
    const backup = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    for (const k of ['lab4net-exam-v1', 'lab4net-campaign-v1', 'lab4net-sbx-done-v1']) assert.ok(typeof backup.extras[k] === 'string', 'backup carries ' + k);
    await page.locator('#closeDialog').click();
    await fresh(() => localStorage.clear());
    await page.locator('#transfer').click();
    await page.locator('#import').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.waitForFunction(() => /reload to bring in/.test(document.getElementById('transferStatus').textContent));
    await page.reload(); await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.l4nExam.history().length), 1, 'exam history restored');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lab4net-campaign-v1')).stage), 'basics');
    done.push('backup extras');

    // REVIEW-FIXES 6: a network that passes every check when the clock runs out is a clear, recorded and shown.
    await fresh(() => localStorage.clear());
    assert.ok(await page.evaluate(() => window.l4nExam.start('lab', 10, 'pf-lab-1', ['Static routing'])));
    await page.evaluate(() => { for (const [d, cs] of Object.entries(cur.lab.solution)) { select(d); cs.forEach(execute); } });
    await page.evaluate(() => { const real = Date.now.bind(Date); Date.now = () => real() + 3600e3; });
    await page.waitForFunction(() => window.l4nExam.history().length > 0, null, { timeout: 5000 });
    const h = await page.evaluate(() => window.l4nExam.history().at(-1));
    assert.equal(h.cleared, true, 'time-up with every check passing is a clear: ' + JSON.stringify(h));
    done.push('time-up clear');

    assert.deepEqual(errors, []);
    console.log('PASS page flows: ' + done.join(', ') + '; no page errors.');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
