// First run: a new visitor, a returning visitor with the old app's keys, the one-time toast, callouts shown once.
const { test, expect } = require('@playwright/test');
const { watch } = require('./helpers');

const OLD = {
  'ccna-bench-v2': JSON.stringify({ 'Basic device setup': true, 'Static routing': true, quiz: { 0: true, 1: true, 2: false }, quizRev: 2, drill: { r: 5, t: 6 } }),
  'lab4net-fun-v1': JSON.stringify({ ranks: { 'Static routing': 'S', 'Basic device setup': 'B' }, cleared: { 'VLANs and access ports': true }, xp: 4000 }),
  'lab4net-lessons-v1': JSON.stringify({ 'Static routing': { read: true, q: { 0: true } } }),
  'lab4net-workspace-v1': JSON.stringify({ drafts: { 'Single-area OSPF': { journal: [{ device: 'R1', line: 'enable' }, { device: 'R1', line: 'configure terminal' }, { device: 'R1', line: 'hostname KEPT' }], tasks: [true] } }, lastLab: 5 }),
  'lab4net-welcomed': '1'
};

test('a browser with the old keys shows the same finished labs, grades and read lessons, once, and keeps the old keys', async ({ page }) => {
  const errors = watch(page);
  await page.addInitScript(old => { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1'); localStorage.clear(); for (const k in old) localStorage.setItem(k, old[k]); }, OLD);
  await page.goto('/');
  await expect(page.locator('#landing')).toBeHidden();          // they had seen the old title screen
  await expect(page.getByText('Your progress was carried over: 3 labs and 1 lesson.')).toBeVisible();
  await expect(page.locator('.sidebar [data-nav="labs"] .sb__count')).toHaveText('3/77');
  await expect(page.locator('.sidebar [data-nav="lessons"] .sb__count')).toHaveText('1/66');
  // the Labs list shows them done, with their grades
  await page.goto('/#/labs');
  const row = page.locator('.row[data-key="static-routing"]');
  await expect(row.locator('.chip--grade')).toHaveText('S');
  await expect(row.locator('.st--done')).toBeAttached();
  await expect(page.locator('.row[data-key="basic-device-setup"] .chip--grade')).toHaveText('B');
  await expect(page.locator('.row[data-key="vlans-and-access-ports"] .st--done')).toBeAttached();
  // saved work carried over and replays
  await page.goto('/#/labs/single-area-ospf');
  await expect(page.locator('.con__prompt')).toHaveText('KEPT(config)#');
  // the old keys still exist
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  for (const k of Object.keys(OLD)) expect(keys).toContain(k);
  // the toast shows once
  await page.reload();
  await expect(page.locator('.con__prompt')).toHaveText('KEPT(config)#');
  await expect(page.getByText(/Your progress was carried over/)).toHaveCount(0);
  expect(errors()).toEqual([]);
});

test('a new visitor: landing, Start here, the step-by-step callout shown once', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Start here' })).toBeVisible();
  await expect(page.getByText('Read the tasks.')).toBeVisible();
  await page.getByRole('link', { name: 'Start lab' }).click();
  await expect(page).toHaveURL(/#\/labs\/basic-device-setup$/);
  const tip = page.getByText('New here? Turn on step-by-step to see the commands for each task.');
  await expect(tip).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(tip).toHaveCount(0);
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('.con__prompt')).toBeVisible();
  await expect(tip).toHaveCount(0);
  // no toast about carried-over progress for a new visitor
  await expect(page.getByText(/carried over/)).toHaveCount(0);
});
