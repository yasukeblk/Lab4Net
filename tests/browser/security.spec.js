// Hostile input never runs. Every case uses the same probe; the test passes when window.__pwn is never set and
// no page error is thrown. (Backup, storage, message and sandbox parts are added in later phases.)
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const PROBE = '<img src=x onerror=window.__pwn=1>';
const INSTANT = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } };

async function clean(page, errors) {
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__pwn)).toBeUndefined();
  expect(await page.evaluate(() => document.querySelectorAll('#app img, #app script').length)).toBe(0);
  expect(errors().filter(e => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
}

test.describe('console', () => {
  test('markup typed into consoles stays text everywhere it is shown', async ({ page }) => {
    const errors = watch(page);
    await open(page, '#/labs/static-routing', { main: INSTANT });
    const run = (dev, lines) => page.evaluate(([dev, lines]) => { for (const l of lines) L4N.test.exec(dev, l); }, [dev, lines]);
    await run('R1', ['enable', 'configure terminal',
      'hostname ' + PROBE, 'banner motd #' + PROBE + '#', 'interface g0/0', 'description ' + PROBE, 'exit',
      'ip host ' + PROBE + ' 10.0.12.2', 'username ' + PROBE + ' secret x', 'end', PROBE, 'ping ' + PROBE, 'show running-config']);
    await run('PC1', ['hostname ' + PROBE, PROBE, 'ping ' + PROBE, 'tracert ' + PROBE, 'telnet ' + PROBE, 'ssh -l ' + PROBE + ' 10.0.0.1']);
    // and through the real input, including ? help and Tab on it
    const input = page.locator('.con__input');
    await page.locator('.con__tab').first().click();
    await input.fill(PROBE); await input.press('Tab'); await input.press('Enter');
    await input.pressSequentially('show ' + PROBE + '?');
    await page.getByRole('button', { name: 'Grade', exact: true }).click();
    // every place that shows those values: console, tabs, map labels, results
    for (const tab of await page.locator('.con__tab').all()) await tab.click();
    await page.locator('.con__tab').first().click();
    await expect(page.locator('.con__out')).toContainText(PROBE);
    await clean(page, errors);
    await page.reload();
    await expect(page.locator('.con__out')).toBeVisible();
    await clean(page, errors);
  });
});

test.describe('messages', () => {
  const SEED = () => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('lab4net:v2', JSON.stringify({ v: 2, settings: { pace: 'instant', guideDefault: true }, ui: { landingSeen: true, hints: { stepTip: true } } }));
  };

  const HOSTILE = (baseURL, which) => `<!doctype html><title>evil</title><script>
      const P = ${JSON.stringify(PROBE)};
      const w = window.open(${JSON.stringify(baseURL)} + ${JSON.stringify(which)}, 'target');
      const bc = new BroadcastChannel('lab4net-tasks');
      let n = 0;
      const t = setInterval(() => {
        try {
          w.postMessage({ type: 'hello' }, '*');
          w.postMessage({ type: 'state', slug: 'static-routing', theme: P, tasks: [true], graded: { pass: [true], grade: P } }, '*');
          w.postMessage({ type: 'step', device: 'R1', command: P }, '*');
          w.postMessage({ type: 'show', html: P, title: P }, '*');
          w.postMessage(P, '*');
        } catch (e) {}
        bc.postMessage({ type: 'hello' }); bc.postMessage({ type: 'step', device: 'R1', command: 'enable' });
        if (++n > 15) clearInterval(t);
      }, 150);
    </script>`;

  test('a hostile site that opens the app cannot inject markup, type into the console, or pose as the pop-out', async ({ page, context, baseURL }) => {
    await context.addInitScript(SEED);
    const errors = [];
    context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
    await context.route('http://evil.test/**', r => r.fulfill({ contentType: 'text/html', body: HOSTILE(baseURL, '/#/labs/static-routing') }));
    const [app] = await Promise.all([context.waitForEvent('page'), page.goto('http://evil.test/')]);
    await app.waitForLoadState();
    await page.waitForTimeout(3000);
    expect(await app.evaluate(() => window.__pwn)).toBeUndefined();
    expect(await app.evaluate(() => document.querySelectorAll('#app img').length)).toBe(0);
    await expect(app.locator('.con__input')).toHaveValue('');
    expect(await app.evaluate(() => L4N.test.state().journal)).toBe(0);
    await expect(app.locator('#ws-tasks')).toBeVisible();          // never taken for a pop-out
    expect(errors).toEqual([]);
  });

  test('a hostile site that opens the pop-out cannot make it render anything', async ({ page, context, baseURL }) => {
    const errors = [];
    context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
    await context.route('http://evil.test/**', r => r.fulfill({ contentType: 'text/html', body: HOSTILE(baseURL, '/index.html?panel=tasks') }));
    const [pop] = await Promise.all([context.waitForEvent('page'), page.goto('http://evil.test/')]);
    await pop.waitForLoadState();
    await page.waitForTimeout(3000);
    expect(await pop.evaluate(() => window.__pwn)).toBeUndefined();
    expect(await pop.evaluate(() => document.querySelectorAll('#app img').length)).toBe(0);
    await expect(pop.locator('.popout__body')).toContainText('Connecting to the main window');
    expect(await pop.evaluate(() => Object.keys(localStorage).length)).toBe(0);   // the pop-out never touches storage
    expect(errors).toEqual([]);
  });

  test('channel messages with wrong types, huge strings, extra fields or commands that are not steps are ignored', async ({ page, context }) => {
    await context.addInitScript(SEED);
    const errors = watch(page);
    await page.goto('/#/labs/static-routing');
    await expect(page.locator('.con__input')).toBeVisible();
    await page.evaluate(P => {
      const bc = new BroadcastChannel('lab4net-tasks');
      const huge = 'x'.repeat(200000);
      bc.postMessage({ type: 'hello' });
      for (const m of [null, 42, P, [], { type: P }, { type: huge }, { type: 'step', device: 'R1', command: P }, { type: 'step', device: P, command: 'enable' },
        { type: 'step', device: 'R1', command: huge }, { type: 'step', device: 'R1', command: 'reload', extra: P }, { type: 'tick', i: -1, v: true },
        { type: 'tick', i: 999, v: true }, { type: 'tick', i: 0, v: P }, { type: 'guide', on: P }, { type: '__proto__' }, { type: 'constructor' }]) bc.postMessage(m);
    }, PROBE);
    await page.waitForTimeout(500);
    await expect(page.locator('.con__input')).toHaveValue('');
    expect(await page.evaluate(() => L4N.test.state().journal)).toBe(0);
    expect(await page.evaluate(() => L4N.workspace.current().tasks.filter(Boolean).length)).toBe(0);
    await clean(page, errors);
    // and the pop-out ignores bad state messages
    const pop = await context.newPage();
    const perr = watch(pop);
    await pop.goto('/index.html?panel=tasks');
    await pop.evaluate(P => {
      const bc = new BroadcastChannel('lab4net-tasks');
      for (const m of [{ type: 'state', slug: P }, { type: 'state', slug: 'static-routing', tasks: [P] }, { type: 'state', slug: 'static-routing', graded: { pass: P } },
        { type: 'state', slug: '../../x' }, { type: 'state', slug: 'static-routing', theme: P, graded: { pass: [true, true, true, true, true, true], grade: P } }]) bc.postMessage(m);
    }, PROBE);
    await pop.waitForTimeout(500);
    expect(await pop.evaluate(() => window.__pwn)).toBeUndefined();
    expect(await pop.evaluate(() => document.querySelectorAll('#app img').length)).toBe(0);
    await expect(pop.locator('.results__sum')).not.toContainText('<img');
    expect(perr()).toEqual([]);
  });
});
