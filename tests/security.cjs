// Optional browser check (Playwright, like ui.cjs) that outside content can never run code in Lab4Net:
// 1. another website that opens the guide page (?guide) or the app cannot push HTML into it with postMessage;
// 2. markup typed into consoles (hostnames, banners, descriptions, host names, commands) is shown as text;
// 3. a doctored backup file, with markup in every stored value and key, imports without running anything,
//    including the Exam sim history.
// npm install --no-save playwright, then node tests/security.cjs. Set LAB4NET_BROWSER_CHANNEL=msedge to use Edge.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const P = '<img src=x onerror=window.__pwn=(window.__pwn||0)+1>';
(async () => {
  const file = path.join(__dirname, '../index.html');
  const app = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(fs.readFileSync(file)); });
  await new Promise(ok => app.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${app.address().port}/`;
  // a different origin (localhost vs 127.0.0.1) playing a hostile website
  const evil = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(`<script>
    window.go=u=>{window.w=open(u,'h'+Math.random().toString(36).slice(2));let n=0;const t=setInterval(()=>{try{w.postMessage({l4nGuide:{t:'show',html:${JSON.stringify(P)}}},'*');w.postMessage({l4nGuide:{t:'hello'}},'*');w.postMessage({l4nGuide:{t:'step',dev:'R1',cmd:'reload'}},'*');}catch(e){}if(++n>8)clearInterval(t);},300);};</script>`); });
  await new Promise(ok => evil.listen(0, 'localhost', ok));
  const evilUrl = `http://localhost:${evil.address().port}/`;
  const browser = await chromium.launch({ channel: process.env.LAB4NET_BROWSER_CHANNEL || undefined });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    // 1. hostile opener
    const e = await ctx.newPage(); await e.goto(evilUrl);
    for (const target of [base + '?guide', base]) {
      const [w] = await Promise.all([e.waitForEvent('popup', { timeout: 15000 }), e.evaluate(u => go(u), target)]);
      await w.waitForLoadState('load');
      w.on('pageerror', x => errors.push(x.message));
      await w.waitForTimeout(3200);
      assert.equal(await w.evaluate(() => window.__pwn || 0), 0, 'a hostile opener cannot inject HTML into ' + target);
      if (target === base) {
        assert.notEqual(await w.locator('#tin').inputValue(), 'reload', 'a hostile opener cannot type into the console');
        assert.equal(await w.evaluate(() => extAlive), false, 'a hostile opener is not taken for the guide window');
      } else assert.doesNotMatch(await w.locator('#guideBody').innerHTML(), /onerror/);
      await w.close();
    }
    // 2. markup typed into consoles
    const p = await ctx.newPage(); p.on('pageerror', x => errors.push(x.message));
    await p.goto(base); await p.evaluate(() => { localStorage.clear(); sessionStorage.setItem('l4n-boot', '1'); }); await p.reload(); await p.waitForTimeout(400);
    await p.evaluate(async P => {
      const run = async (dev, c) => { select(dev); const t = document.getElementById('tin'); t.value = c; t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await new Promise(r => setTimeout(r, 200)); };
      openLab(LABS.findIndex(l => l.title === 'Static routing'), true); await new Promise(r => setTimeout(r, 300));
      for (const c of ['enable', 'configure terminal', 'hostname ' + P, 'banner motd #' + P + '#', 'interface g0/0', 'description ' + P, 'exit', 'ip host ' + P + ' 1.1.1.1', 'username ' + P + ' secret x', 'end', 'show run', 'show interfaces description', 'show hosts', P, 'ping ' + P]) await run('R1', c);
      for (const c of [P, 'ping ' + P, 'ipconfig ' + P]) await run('PC1', c);
    }, P);
    assert.equal(await p.evaluate(() => window.__pwn || 0), 0, 'console output is text');
    // 3. a doctored backup: export a real one, put markup into every stored string and key, add a poisoned exam history, import it
    await p.evaluate(() => { localStorage.setItem('lab4net-exam-v1', JSON.stringify({ current: null, history: [{ date: '2026-10-01', base: 'Static routing', mode: 'quick', cleared: true, rank: 'S', passed: 3, total: 3 }] })); });
    await p.evaluate(() => transfer()); await p.locator('#export').waitFor();
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.locator('#export').click()]);
    const backup = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    const mut = v => typeof v === 'string' ? v + P : Array.isArray(v) ? v.map(mut) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).flatMap(([k, x]) => [[k, mut(x)], [k + P, mut(x)]])) : v;
    for (const k of Object.keys(backup.extras || {})) { let j; try { j = JSON.parse(backup.extras[k]); backup.extras[k] = JSON.stringify(mut(j)); } catch (x) { backup.extras[k] += P; } }
    backup.extras['lab4net-exam-v1'] = JSON.stringify({ current: { base: P, mode: P, seed: P }, history: [{ date: P, base: P, mode: P, cleared: true, rank: P, passed: P, total: P }, { date: P, base: 'x', cleared: false, passed: P, total: P }] });
    const bad = path.join(os.tmpdir(), 'lab4net-doctored.json'); fs.writeFileSync(bad, JSON.stringify(backup));
    await p.evaluate(() => { if (!document.getElementById('dialog').open) transfer(); }); await p.locator('#import').waitFor({ state: 'attached' });
    await p.locator('#import').setInputFiles(bad); await p.waitForTimeout(800);
    await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), close = () => { try { document.getElementById('dialog').close(); } catch (e) {} };
      for (const f of [() => openSandbox(), () => openPractice('campaign'), () => openPractice('lessons'), () => openLab(0), () => { library(); document.getElementById('examBtn').click(); }, () => document.getElementById('help').click(), () => library()]) { try { f(); } catch (e) {} await w(400); close(); }
    });
    assert.equal(await p.evaluate(() => window.__pwn || 0), 0, 'a doctored backup cannot run code');
    fs.unlinkSync(bad);
    assert.deepEqual(errors, []);
    console.log('PASS security: hostile sites cannot drive the guide window or the app, console markup is text, a doctored backup runs nothing.');
  } finally { await browser.close(); app.close(); evil.close(); }
})().catch(e => { console.error(e); process.exit(1); });
