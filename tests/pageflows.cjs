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

    // A fresh browser context per exam scenario, so a faked clock or stored exam never leaks into the next one.
    const scenario = async (offsetMs) => {
      const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      if (offsetMs) await c.addInitScript(off => { const r = Date.now.bind(Date); Date.now = () => r() + off; }, offsetMs);
      const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
      await p.goto(base); await p.evaluate(() => { localStorage.clear(); sessionStorage.setItem('l4n-boot', '1'); }); await p.reload(); await p.waitForTimeout(400);
      return { c, p };
    };
    const xpOf = p => p.evaluate(() => +(document.querySelector('#hud .xpbar').title.match(/(\d+) XP/) || [0, 0])[1]);

    // REVIEW-FIXES 8: one exam at a time. While it runs, starting another is refused (the dialog offers Resume or Give up)
    // and nothing else opens: other labs (including the exam's own base lab), practice views, lessons, the sandbox.
    {
      const { c, p } = await scenario(0);
      await p.evaluate(() => openLab(LABS.findIndex(l => l.title === 'Static routing')));
      assert.ok(await p.evaluate(() => window.l4nExam.start('daily', 20, 'pf-daily-1')));
      const cur0 = await p.evaluate(() => window.l4nExam.current());
      assert.equal(await p.evaluate(() => window.l4nExam.start('daily', 20, 'pf-daily-2')), false, 'a second start is refused');
      assert.equal(await p.evaluate(() => window.l4nExam.current().seed), cur0.seed, 'the running exam keeps its clock');
      assert.equal(await p.locator('#exResume').count(), 1, 'the dialog offers Resume'); assert.equal(await p.locator('#exStart').count(), 0);
      await p.locator('#closeDialog').click();
      const stays = async (fn, what) => { await p.evaluate(fn); assert.equal(await p.evaluate(() => !!(cur.view === 'lab' && cur.lab.exam)), true, what + ' is blocked'); };
      await stays(() => openLab(LABS.findIndex(l => l.title === window.l4nExam.current().base)), 'the base lab');
      await stays(() => openLab(0), 'another lab');
      await stays(() => openPractice('quiz'), 'the theory check');
      await stays(() => openLesson('TCP and UDP'), 'a lesson');
      await stays(() => window.openSandbox(), 'the sandbox');
      assert.match(await p.locator('#notice').textContent(), /An exam is running/);
      // REVIEW-FIXES 14: the notice clears itself
      await p.waitForFunction(() => document.getElementById('notice').textContent === '', null, { timeout: 7000 });
      // REVIEW-FIXES 9: give it up from the bar: recorded as not cleared, and the lock lifts
      await p.locator('#examQuit').click(); await p.locator('#exConfirmQuit').click();
      const h = await p.evaluate(() => window.l4nExam.history().at(-1));
      assert.deepEqual([h.mode, h.cleared], ['daily', false]); assert.equal(await p.evaluate(() => window.l4nExam.active()), false);
      await p.evaluate(() => openPractice('quiz')); assert.equal(await p.evaluate(() => cur.view), 'quiz');
      await c.close(); done.push('one exam at a time, nothing else opens, give up is recorded, notices clear');
    }

    // REVIEW-FIXES 9, 10, 11: an exam whose time ran out while the page was closed is graded from its saved work on the next
    // load, without dragging you back into it; exam titles leave lab progress, saved work and ranks; XP holds across reloads;
    // the page reopens the last real lab.
    {
      const { c, p } = await scenario(0);
      await p.evaluate(() => openLab(LABS.findIndex(l => l.title === 'VLANs and access ports')));
      assert.ok(await p.evaluate(() => window.l4nExam.start('lab', 10, 'pf-lab-2', ['Static routing'])));
      await p.evaluate(() => { for (const [d, cs] of Object.entries(cur.lab.solution)) { select(d); cs.forEach(execute); } saveWork(); });
      await c.addInitScript(() => { const r = Date.now.bind(Date); Date.now = () => r() + 3600e3; });
      await p.reload(); await p.waitForTimeout(500);
      const h = await p.evaluate(() => window.l4nExam.history().at(-1));
      assert.equal(h.cleared, true, 'the saved network passed every check, so the time-up counts as a clear');
      assert.equal(await p.evaluate(() => cur.lab.title), 'VLANs and access ports', 'the last real lab opens, not the exam');
      assert.match(await p.locator('#notice').textContent(), /ended while you were away/);
      const leftovers = await p.evaluate(() => [Object.keys(progress), Object.keys(drafts), Object.keys(JSON.parse(localStorage.getItem('lab4net-fun-v1')).ranks || {})].flat().filter(t => t.startsWith('Exam · ')));
      assert.deepEqual(leftovers, [], 'no exam titles left behind');
      const x1 = await xpOf(p); await p.reload(); await p.waitForTimeout(500); assert.equal(await xpOf(p), x1, 'XP holds across a reload');
      await c.close(); done.push('exam settled after the page was closed, no exam titles left, XP stable, last real lab');
    }

    // REVIEW-FIXES 10 (live clear): XP from an exam clear does not drop after a reload.
    {
      const { c, p } = await scenario(0);
      assert.ok(await p.evaluate(() => window.l4nExam.start('lab', 10, 'pf-lab-3', ['Static routing'])));
      await p.evaluate(() => { for (const [d, cs] of Object.entries(cur.lab.solution)) { select(d); cs.forEach(execute); } });
      await p.locator('#bGrade').click(); await p.waitForTimeout(300);
      assert.equal(await p.evaluate(() => window.l4nExam.history().at(-1).cleared), true);
      const x1 = await xpOf(p); await p.reload(); await p.waitForTimeout(500);
      assert.equal(await xpOf(p), x1, 'XP after a reload equals XP before it');
      assert.ok(!(await p.evaluate(() => Object.keys(progress).some(t => t.startsWith('Exam · ')))));
      await c.close(); done.push('exam XP stable');
    }

    // REVIEW-FIXES 12, 15: a boss has three faults; its health bar starts at the real number of failing checks and keeps its
    // last graded value across a reload.
    {
      const { c, p } = await scenario(0);
      assert.ok(await p.evaluate(() => window.l4nExam.start('boss', 30, 'pf-boss-1')));
      const ex = await p.evaluate(() => window.l4nExam.current());
      assert.equal(ex.faults.length, 3, 'three faults'); assert.ok(ex.hp0 > 0 && ex.hp0 === ex.hp);
      assert.equal(await p.locator('.boss span').textContent(), ex.hp0 + ' / ' + ex.hp0 + ' HP · grade to strike');
      assert.match(await p.locator('.exam-note').textContent(), /three hidden faults/);
      // repair what the base lab's own solution repairs, then grade
      await p.evaluate(() => { const b = LABS.find(l => l.title === cur.lab.baseTitle); for (const [d, cs] of Object.entries(b.solution)) { select(d); cs.forEach(execute); } });
      await p.locator('#bGrade').click(); await p.waitForTimeout(200);
      const hp = await p.evaluate(() => window.l4nExam.current() ? window.l4nExam.current().hp : 0);
      if (hp > 0) {
        await p.reload(); await p.waitForTimeout(500);
        assert.equal(await p.locator('.boss span').textContent(), hp + ' / ' + ex.hp0 + ' HP · grade to strike', 'health survives a reload');
      }
      await c.close(); done.push('boss: three faults, real starting health, health kept on reload');
    }

    // REVIEW-FIXES polish (exam UI): Quit asks first; after giving up the bar reads cleanly; Boss locks the clock to 30 minutes;
    // on a phone the bar wraps instead of squeezing its note into a narrow column.
    {
      const { c, p } = await scenario(0);
      assert.ok(await p.evaluate(() => window.l4nExam.start('sabotage', 15, 'pf-sab-2')));
      await p.locator('#examQuit').click(); assert.equal(await p.locator('#exConfirmQuit').count(), 1, 'Quit asks first');
      await p.locator('#exKeep').click(); assert.equal(await p.evaluate(() => window.l4nExam.active()), true, 'Keep going keeps the exam');
      await p.locator('#examQuit').click(); await p.locator('#exConfirmQuit').click();
      const note = await p.locator('.exam-note').textContent(); assert.ok(!/· ·|^ ·|· $/.test(note) && /15 min/.test(note), 'bar after giving up: ' + note);
      await p.evaluate(() => window.examDialog()); await p.locator('input[name=exMode][value=boss]').check();
      assert.equal(await p.locator('input[name=exMin][value="30"]').isChecked(), true); assert.equal(await p.locator('input[name=exMin][value="10"]').isDisabled(), true);
      await p.locator('input[name=exMode][value=lab]').check(); assert.equal(await p.locator('input[name=exMin][value="10"]').isDisabled(), false);
      await p.locator('#closeDialog').click();
      await p.setViewportSize({ width: 390, height: 844 });
      assert.ok(await p.evaluate(() => window.l4nExam.start('boss', 30, 'pf-boss-2')));
      const h = await p.locator('.exam-note').evaluate(e => e.getBoundingClientRect().height);
      assert.ok(h < 80, 'the note wraps under the clock on a phone, not into a tall column: ' + h + 'px');
      assert.ok(await p.evaluate(() => document.getElementById('examClock').getBoundingClientRect().top < innerHeight), 'the clock is on screen');
      await c.close(); done.push('exam UI polish');
    }

    // REVIEW-FIXES polish (quiz): answers saved for the rewritten theory questions are cleared once; others are kept.
    {
      const { c, p } = await scenario(0);
      await p.evaluate(() => { localStorage.setItem('ccna-bench-v2', JSON.stringify({ quiz: { 13: true, 29: true, 90: false, 104: true } })); });
      await p.reload(); await p.waitForTimeout(400);
      const q = await p.evaluate(() => JSON.parse(localStorage.getItem('ccna-bench-v2')));
      assert.deepEqual([q.quiz[13], q.quiz[29], q.quiz[90], q.quiz[104], q.quizRev], [true, undefined, undefined, undefined, 2]);
      await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('ccna-bench-v2')); x.quiz[29] = true; localStorage.setItem('ccna-bench-v2', JSON.stringify(x)); });
      await p.reload(); await p.waitForTimeout(300);
      assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('ccna-bench-v2')).quiz[29]), true, 'cleared only once');
      await c.close(); done.push('rewritten quiz answers cleared once');
    }

    // REVIEW-FIXES 13: the time's-up card is titled Time's up, not Stage clear.
    {
      const { c, p } = await scenario(0);
      assert.ok(await p.evaluate(() => window.l4nExam.start('sabotage', 10, 'pf-sab-1')));
      await p.evaluate(() => { const r = Date.now.bind(Date); Date.now = () => r() + 3600e3; });
      await p.waitForFunction(() => !document.getElementById('resultCard').hidden, null, { timeout: 5000 });
      assert.equal(await p.locator('#resultTitle').textContent(), "Time's up");
      await c.close(); done.push("time's-up card title");
    }

    assert.deepEqual(errors, []);
    console.log('PASS page flows: ' + done.join(', ') + '; no page errors.');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
