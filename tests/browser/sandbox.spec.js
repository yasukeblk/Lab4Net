// The sandbox (Phase 8 acceptance).
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const MAIN = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true } };
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
const node = (page, n) => page.locator(`#ws-map .node[data-dev="${n}"]`);
const sbx = page => page.evaluate(() => JSON.parse(JSON.stringify(L4N.sandbox.def())));

async function build(page) {
  await page.getByRole('button', { name: 'PC', exact: true }).click();
  await expect(node(page, 'PC1')).toBeVisible();
  await page.getByRole('button', { name: 'PC', exact: true }).click();
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
  await expect(node(page, 'SW1')).toBeVisible();
  await page.getByRole('radio', { name: 'Cable' }).click();
  for (const [pc, port] of [['PC1', 'Fa0/1'], ['PC2', 'Fa0/2']]) {
    await node(page, pc).click();                       // a PC has one port: chosen at once
    await node(page, 'SW1').click();
    await page.getByRole('menu').getByRole('menuitem', { name: new RegExp('^' + port) }).click();
    await expect(page.getByText(new RegExp('Connected ' + pc))).toBeVisible();
  }
  await page.getByRole('radio', { name: 'Select' }).click();
}

test('build two PCs and a switch, address them, ping across and see the packet on the map', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/sandbox', { main: MAIN });
  await expect(page.getByText('No devices yet.')).toBeVisible();
  await build(page);
  expect((await sbx(page)).links.length).toBe(2);
  await node(page, 'PC1').click();
  const input = page.locator('.con__input');
  await input.fill('ipconfig /ip 192.168.1.10 255.255.255.0'); await input.press('Enter');
  await node(page, 'PC2').click();
  await input.fill('ipconfig /ip 192.168.1.11 255.255.255.0'); await input.press('Enter');
  await input.fill('ping 192.168.1.10'); await input.press('Enter');
  await expect(page.locator('#ws-trace')).toContainText('Reply received');
  await expect(page.locator('#ws-trace')).toContainText('PC2 → SW1 → PC1');
  await expect(node(page, 'PC2').locator('.badge__icon.is-ok')).toBeAttached();
  expect(errors()).toEqual([]);
});

test('undo and redo each step; Ctrl+Z is IOS end in the console and undo outside it', async ({ page }) => {
  await open(page, '#/sandbox', { main: MAIN });
  await build(page);
  expect((await sbx(page)).devs.length).toBe(3);
  await page.getByRole('button', { name: 'Undo' }).click();
  expect((await sbx(page)).links.length).toBe(1);
  await page.getByRole('button', { name: 'Undo' }).click();
  expect((await sbx(page)).links.length).toBe(0);
  await page.getByRole('button', { name: 'Redo' }).click();
  expect((await sbx(page)).links.length).toBe(1);
  // Ctrl+Z outside the console: undo
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press(MOD + '+z');
  expect((await sbx(page)).links.length).toBe(0);
  await page.keyboard.press(MOD + '+Shift+z');
  expect((await sbx(page)).links.length).toBe(1);
  // Ctrl+Z inside the console: IOS end
  await node(page, 'SW1').click();
  const input = page.locator('.con__input');
  for (const l of ['enable', 'configure terminal', 'interface f0/1']) { await input.fill(l); await input.press('Enter'); }
  await input.press(MOD + '+z');
  await expect(page.locator('.con__prompt')).toHaveText('SW1#');
  expect((await sbx(page)).links.length).toBe(1);
});

test('save, reset, load and get the same network; a doctored file is refused and runs nothing', async ({ page }) => {
  await open(page, '#/sandbox', { main: MAIN });
  await build(page);
  await node(page, 'PC1').click();
  await page.locator('.con__input').fill('ipconfig /ip 10.0.0.1 255.0.0.0'); await page.locator('.con__input').press('Enter');
  const before = await sbx(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save to file' }).click()]);
  const file = await dl.path();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('No devices yet.')).toBeVisible();
  await page.locator('.build input[type="file"]').setInputFiles(file);
  await expect(page.getByText(/Sandbox loaded/)).toBeVisible();
  const after = await sbx(page);
  expect(after.devs).toEqual(before.devs);
  expect(after.links).toEqual(before.links);
  expect(after.journal.map(e => e.line)).toEqual(before.journal.map(e => e.line));
  await node(page, 'PC1').click();
  await expect(page.locator('.con__out')).toContainText('ipconfig /ip 10.0.0.1');
  // doctored files
  const P = '<img src=x onerror=window.__pwn=1>';
  for (const bad of [
    { format: 'lab4net-sandbox', version: 2, sandbox: { devs: [{ name: P, type: 'pc', x: 1, y: 1 }], links: [] } },
    { format: 'lab4net-sandbox', version: 2, sandbox: { devs: [{ name: 'R1', type: 'router', x: 1, y: 1 }, { name: 'R2', type: 'router', x: 2, y: 2 }], links: [{ a: 'R1', ai: 'g0/9', b: 'R2', bi: 'g0/0' }] } },
    { format: 'lab4net-sandbox', version: 2, sandbox: { devs: new Array(21).fill(0).map((_, i) => ({ name: 'PC' + i, type: 'pc', x: 1, y: 1 })), links: [] } },
    { format: 'something-else' }]) {
    await page.locator('.build input[type="file"]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) });
    await expect(page.getByText(/That file could not be loaded/).last()).toBeVisible();
  }
  // notes and names with markup are cleaned
  await page.locator('.build input[type="file"]').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'lab4net-sandbox', version: 2, sandbox: { devs: [{ name: 'PC1', type: 'pc', x: 100, y: 100 }], links: [], notes: [{ text: P, x: 100, y: 50 }], journal: [{ device: 'PC1', line: P }] } })) });
  await expect(page.getByText(/Sandbox loaded/).last()).toBeVisible();
  expect(await page.evaluate(() => window.__pwn)).toBeUndefined();
  expect(await page.evaluate(() => document.querySelectorAll('#app img').length)).toBe(0);
  expect((await sbx(page)).devs.map(d => d.name)).toEqual(['PC1']);
});

test('at most 20 devices, explained in words', async ({ page }) => {
  await open(page, '#/sandbox', { main: MAIN });
  await page.evaluate(() => { const d = L4N.sandbox.def(); for (let i = 0; i < 20; i++) d.devs.push({ name: 'PC' + (i + 1), type: 'pc', x: 60 + (i % 10) * 100, y: 80 + Math.floor(i / 10) * 120 }); L4N.storage.write('lab4net:v2:sandbox', d); });
  await page.reload();
  await page.getByRole('button', { name: 'Router', exact: true }).click();
  await expect(page.getByText('The sandbox holds up to 20 devices. Delete one to add another.')).toBeVisible();
  expect((await sbx(page)).devs.length).toBe(20);
});

for (let g = 0; g < 4; g++) {
  test('goal ' + (g + 1) + ' can be met', async ({ page }) => {
    await open(page, '#/sandbox', { main: MAIN });
    await page.locator('.build__goal').nth(g).getByRole('button', { name: 'Start' }).click();
    await expect(page.locator('.build .check-row').first()).toBeVisible();
    const SOL = [
      { R1: ['enable', 'configure terminal', 'interface g0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown', 'end'], PC1: ['ipconfig /ip 192.168.1.10 255.255.255.0', 'ipconfig /dg 192.168.1.1'], PC2: ['ipconfig /ip 192.168.1.11 255.255.255.0'], SRV1: ['ipconfig /ip 192.168.1.20 255.255.255.0'] },
      { R1: ['enable', 'configure terminal', 'interface g0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown', 'interface g0/1', 'ip address 10.0.12.1 255.255.255.252', 'no shutdown', 'exit', 'ip route 192.168.2.0 255.255.255.0 10.0.12.2', 'end'],
        R2: ['enable', 'configure terminal', 'interface g0/0', 'ip address 192.168.2.1 255.255.255.0', 'no shutdown', 'interface g0/1', 'ip address 10.0.12.2 255.255.255.252', 'no shutdown', 'exit', 'ip route 192.168.1.0 255.255.255.0 10.0.12.1', 'end'],
        PC1: ['ipconfig /ip 192.168.1.10 255.255.255.0', 'ipconfig /dg 192.168.1.1'], PC2: ['ipconfig /ip 192.168.1.11 255.255.255.0', 'ipconfig /dg 192.168.1.1'], PC3: ['ipconfig /ip 192.168.2.10 255.255.255.0', 'ipconfig /dg 192.168.2.1'], PC4: ['ipconfig /ip 192.168.2.11 255.255.255.0', 'ipconfig /dg 192.168.2.1'] },
      { R1: ['enable', 'configure terminal', 'interface g0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown', 'interface g0/1', 'ip address 10.0.12.1 255.255.255.252', 'no shutdown', 'interface g0/2', 'ip address 10.0.13.1 255.255.255.252', 'no shutdown', 'router ospf 1', 'network 0.0.0.0 255.255.255.255 area 0', 'end'],
        R2: ['enable', 'configure terminal', 'interface g0/0', 'ip address 192.168.2.1 255.255.255.0', 'no shutdown', 'interface g0/1', 'ip address 10.0.12.2 255.255.255.252', 'no shutdown', 'interface g0/2', 'ip address 10.0.23.2 255.255.255.252', 'no shutdown', 'router ospf 1', 'network 0.0.0.0 255.255.255.255 area 0', 'end'],
        R3: ['enable', 'configure terminal', 'interface g0/0', 'ip address 192.168.3.1 255.255.255.0', 'no shutdown', 'interface g0/1', 'ip address 10.0.13.2 255.255.255.252', 'no shutdown', 'interface g0/2', 'ip address 10.0.23.3 255.255.255.252', 'no shutdown', 'router ospf 1', 'network 0.0.0.0 255.255.255.255 area 0', 'end'],
        PC1: ['ipconfig /ip 192.168.1.10 255.255.255.0', 'ipconfig /dg 192.168.1.1'], PC2: ['ipconfig /ip 192.168.2.10 255.255.255.0', 'ipconfig /dg 192.168.2.1'], PC3: ['ipconfig /ip 192.168.3.10 255.255.255.0', 'ipconfig /dg 192.168.3.1'] },
      { SW1: ['enable', 'configure terminal', 'vlan 10', 'exit', 'interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'exit', 'interface range g0/1 - 2', 'channel-group 1 mode active', 'exit', 'interface port-channel 1', 'switchport mode trunk', 'end'],
        SW2: ['enable', 'configure terminal', 'vlan 10', 'exit', 'interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'exit', 'interface range g0/1 - 2', 'channel-group 1 mode active', 'exit', 'interface port-channel 1', 'switchport mode trunk', 'end'],
        PC1: ['ipconfig /ip 192.168.10.10 255.255.255.0'], PC2: ['ipconfig /ip 192.168.10.11 255.255.255.0'] }][g];
    await page.evaluate(sol => { for (const [d, cmds] of Object.entries(sol)) for (const c of cmds) L4N.test.exec(d, c); }, SOL);
    await expect(page.getByText(/^Goal met:/)).toBeVisible();
    await expect(page.locator('.build .check-row.is-bad')).toHaveCount(0);
  });
}
