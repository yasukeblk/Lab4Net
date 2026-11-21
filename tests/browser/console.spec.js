// Console realism (Phase 2 acceptance): prompts, errors, help, Tab, history, passwords, Telnet, reload, live ping
// pacing, Ctrl+C, pasting, reduced motion, saved work, engine errors.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const INSTANT = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } };
const FAST = { v: 2, settings: { pace: 'fast' }, ui: { landingSeen: true } };
const REAL = { v: 2, settings: { pace: 'real' }, ui: { landingSeen: true } };

const input = page => page.locator('.con__input');
const prompt = page => page.locator('.con__prompt');
const out = page => page.locator('.con__out');
async function type(page, line) { await input(page).fill(line); await input(page).press('Enter'); }
async function lab(page, slug, main) { await open(page, '#/labs/' + slug, { main: main || INSTANT }); await expect(input(page)).toBeVisible(); await input(page).focus(); }
async function device(page, name) { await page.locator('.con__tab', { hasText: new RegExp('^' + name) }).click(); }

test('prompts follow the mode', async ({ page }) => {
  await lab(page, 'static-routing');
  await expect(prompt(page)).toHaveText('R1>');
  await expect(page.locator('.con__mode')).toHaveText('User EXEC');
  await type(page, 'enable');
  await expect(prompt(page)).toHaveText('R1#');
  await type(page, 'configure terminal');
  await expect(prompt(page)).toHaveText('R1(config)#');
  await type(page, 'interface g0/0');
  await expect(prompt(page)).toHaveText('R1(config-if)#');
  await expect(page.locator('.con__mode')).toHaveText('Interface configuration');
  await expect(input(page)).toHaveAttribute('aria-label', 'Console for R1, interface configuration');
  await input(page).press('Control+z');
  await expect(prompt(page)).toHaveText('R1#');
  await device(page, 'PC1');
  await expect(prompt(page)).toHaveText('C:\\>');
  await expect(page.locator('.con__mode')).toHaveText('Host console');
});

test('errors: the ^ marker, % Incomplete and % Ambiguous', async ({ page }) => {
  await lab(page, 'static-routing');
  await type(page, 'enable');
  await type(page, 'show ip rout xyz');
  await expect(out(page).locator('.cl--bad', { hasText: /^\s*\^$/ }).last()).toBeVisible();
  await expect(out(page)).toContainText("% Invalid input detected at '^' marker.");
  await type(page, 'show ip');
  await expect(out(page)).toContainText('% Incomplete command.');
  await type(page, 'sh i');
  await expect(out(page)).toContainText('% Ambiguous command:  "sh i"');
});

test('? lists choices at once, Tab completes, arrows walk the history', async ({ page }) => {
  await lab(page, 'static-routing');
  await type(page, 'enable');
  await input(page).pressSequentially('show ?');
  await expect(out(page)).toContainText('R1#show ?');
  await expect(out(page).locator('.cl', { hasText: /^\s+running-config/ })).toHaveCount(1);
  await expect(input(page)).toHaveValue('show ');
  await input(page).fill('conf');
  await input(page).press('Tab');
  await expect(input(page)).toHaveValue('configure ');
  await expect(input(page)).toBeFocused();
  await input(page).fill('');
  await type(page, 'show clock');
  await type(page, 'show version');
  await input(page).press('ArrowUp');
  await expect(input(page)).toHaveValue('show version');
  await input(page).press('ArrowUp');
  await expect(input(page)).toHaveValue('show clock');
  await input(page).press('ArrowDown');
  await expect(input(page)).toHaveValue('show version');
  await input(page).press('Control+u');
  await expect(input(page)).toHaveValue('');
  await input(page).press('Control+l');
  await expect(out(page).locator('.cl')).toHaveCount(0);
  await input(page).press('Escape');
  await expect(input(page)).not.toBeFocused();
});

test('a password is masked, never echoed and kept out of history', async ({ page }) => {
  await lab(page, 'static-routing');
  for (const l of ['enable', 'configure terminal', 'enable secret s3cret99', 'end', 'disable', 'enable']) await type(page, l);
  await expect(prompt(page)).toHaveText('Password: ');
  await expect(input(page)).toHaveAttribute('type', 'password');
  await type(page, 's3cret99');
  await expect(prompt(page)).toHaveText('R1#');
  await expect(input(page)).toHaveAttribute('type', 'text');
  const lines = await page.evaluate(() => L4N.test.state().lines);
  expect(lines.filter(l => l.includes('s3cret99') && !l.includes('enable secret'))).toEqual([]);
  await input(page).press('ArrowUp');
  await expect(input(page)).toHaveValue('enable');
});

test('Telnet into another device and back', async ({ page }) => {
  await lab(page, 'static-routing');
  await device(page, 'R2');
  for (const l of ['enable', 'configure terminal', 'line vty 0 4', 'password vtypass', 'login', 'end']) await type(page, l);
  await device(page, 'R1');
  await type(page, 'telnet 10.0.12.2');
  await expect(out(page)).toContainText('Trying 10.0.12.2 ... Open');
  await expect(prompt(page)).toHaveText('Password: ');
  await type(page, 'vtypass');
  await expect(prompt(page)).toHaveText('R2>');
  await type(page, 'exit');
  await expect(out(page)).toContainText('[Connection to 10.0.12.2 closed by foreign host]');
  await expect(prompt(page)).toHaveText('R1>');
});

test('reload asks Save? and confirm, then boots', async ({ page }) => {
  await lab(page, 'static-routing');
  for (const l of ['enable', 'configure terminal', 'hostname EDGE', 'end']) await type(page, l);
  await type(page, 'reload');
  await expect(prompt(page)).toHaveText('System configuration has been modified. Save? [yes/no]: ');
  await type(page, 'no');
  await expect(prompt(page)).toHaveText('Proceed with reload? [confirm]');
  await type(page, '');
  await expect(out(page)).toContainText('Press RETURN to get started');
  await type(page, '');
  await expect(prompt(page)).toHaveText('R1>');
});

test('live ping output plays at the chosen pace, and Ctrl+C stops it', async ({ page }) => {
  await lab(page, 'static-routing', REAL);
  await device(page, 'PC1');
  await type(page, 'ping 192.168.1.1');
  await expect(input(page)).toHaveAttribute('placeholder', 'Running… Ctrl+C to stop');
  await expect(prompt(page)).toHaveText('');
  expect(await out(page).textContent()).not.toContain('Ping statistics');
  await input(page).press('Control+c');
  await expect(prompt(page)).toHaveText('C:\\>');
  await expect(out(page)).toContainText('Ping statistics');
  await expect(out(page)).toContainText('Control-C');
});

test('fast pace finishes on its own; another command finishes it at once', async ({ page }) => {
  // The page's clock is frozen while the ping plays, so "Running…" can't finish before it is checked,
  // however slow the machine is. Then time is moved on by hand to show the ping also ends by itself.
  await page.clock.install({ time: new Date('2026-01-05T09:00:00Z') });
  await lab(page, 'static-routing', FAST);
  await device(page, 'PC1');
  await page.clock.pauseAt(new Date('2026-01-05T09:01:00Z'));
  await type(page, 'ping 192.168.1.1');
  await expect(input(page)).toHaveAttribute('placeholder', 'Running… Ctrl+C to stop');
  await expect(out(page)).not.toContainText('Ping statistics');
  // another command finishes the ping at once, before its own output
  await type(page, 'ipconfig');
  await expect(out(page)).toContainText('Ping statistics');
  await expect(out(page)).toContainText('IPv4 Address');
  const text = await out(page).textContent();
  expect(text.indexOf('Ping statistics')).toBeLessThan(text.indexOf('IPv4 Address'));
  // on its own: a second ping, left alone, plays to the end as time passes
  await type(page, 'ping 192.168.1.1');
  await expect(input(page)).toHaveAttribute('placeholder', 'Running… Ctrl+C to stop');
  await page.clock.runFor(20000);
  await expect(out(page).getByText('Ping statistics')).toHaveCount(2);
  await expect(input(page)).toHaveAttribute('placeholder', '');
  await expect(prompt(page)).toHaveText('C:\\>');
});

test('with reduced motion the output is instant', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await lab(page, 'static-routing', REAL);
  await device(page, 'PC1');
  await type(page, 'ping 192.168.1.1');
  await expect(out(page)).toContainText('Ping statistics');
  await expect(prompt(page)).toHaveText('C:\\>');
});

test('pasting several lines runs them in order', async ({ page, browserName }) => {
  await lab(page, 'static-routing');
  const text = ['enable', 'configure terminal', 'hostname PASTED', ''].join(String.fromCharCode(10));
  if (browserName !== 'firefox') {
    // Chromium and WebKit: a paste event carrying the text (the OS clipboard is shared by parallel test runs)
    await page.evaluate(t => {
      const dt = new DataTransfer(); dt.setData('text/plain', t);
      document.querySelector('.con__input').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, text);
    await expect(prompt(page)).toHaveText('PASTED(config)#');
    return;
  }
  // Firefox empties scripted paste data, so it uses a real copy and paste through the clipboard
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.evaluate(() => { const t = document.createElement('textarea'); t.id = 'clip'; t.value = ['enable', 'configure terminal', 'hostname PASTED', ''].join(String.fromCharCode(10)); document.body.append(t); });
  await page.locator('#clip').focus();
  await page.keyboard.press(mod + '+a');
  await page.keyboard.press(mod + '+c');
  await page.evaluate(() => document.getElementById('clip').remove());
  await input(page).focus();
  await page.keyboard.press(mod + '+v');
  await expect(prompt(page)).toHaveText('PASTED(config)#');
});

test('reload restores the console from saved commands', async ({ page }) => {
  await lab(page, 'static-routing');
  for (const l of ['enable', 'configure terminal', 'hostname SAVED', 'interface g0/0']) await type(page, l);
  await page.waitForTimeout(400);
  await page.reload();
  await expect(prompt(page)).toHaveText('SAVED(config-if)#');
  await expect(out(page)).toContainText('R1(config)#hostname SAVED');
  await expect(page.locator('.topbar__status')).toContainText('In progress');
});

test('a corrupt saved lab opens fresh with a toast', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: INSTANT, keys: { 'lab4net:v2:work': { 'static-routing': { journal: [{ device: 'R9', line: 'enable' }], tasks: [] } } } });
  await expect(page.getByText('Could not restore this lab. A fresh topology is ready.')).toBeVisible();
  await expect(prompt(page)).toHaveText('R1>');
  // Write the bad entry in a page where no lab has been open: saved work is written 150 ms after a change (store.js),
  // and on a slow run the first lab's write landed after the bad entry and replaced it (WebKit, about 1 run in 10 under load).
  await page.goto('/#/settings');
  await page.reload();
  await page.evaluate(() => localStorage.setItem('lab4net:v2:work', '{"vlans-and-access-ports":{"journal":"nope"}}'));
  await page.reload();
  await page.goto('/#/labs/vlans-and-access-ports');
  await expect(page.getByText('Could not restore this lab. A fresh topology is ready.')).toBeVisible();
});

test('an engine error in one command prints the internal error line and the lab carries on', async ({ page }) => {
  const errors = watch(page);
  await lab(page, 'static-routing');
  await type(page, 'enable');
  await page.evaluate(() => { const c = CMDS.find(c => c.pat.join(' ') === 'show version'); c.fn = () => { throw new Error('boom'); }; });
  await type(page, 'show version');
  await expect(out(page)).toContainText('% Lab4Net internal error: boom');
  await type(page, 'configure terminal');
  await expect(prompt(page)).toHaveText('R1(config)#');
  expect(errors().filter(e => !/boom|Lab4Net engine error/.test(e))).toEqual([]);
});

test('Ctrl/Cmd+Enter grades from the console; Alt+. and Alt+, switch devices', async ({ page }) => {
  await lab(page, 'static-routing');
  await input(page).press((process.platform === 'darwin' ? 'Meta' : 'Control') + '+Enter');
  await expect(page.getByRole('region', { name: 'Results' })).toContainText('checks pass');
  await input(page).focus();
  await input(page).press('Alt+Period');
  await expect(prompt(page)).toHaveText('R2>');
  await input(page).press('Alt+Comma');
  await expect(prompt(page)).toHaveText('R1>');
  await expect(input(page)).toBeFocused();
});
