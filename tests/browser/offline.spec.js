// Network use (section 6.6): from a file, no requests at all; from a local server, none to other hosts; on the public
// host name, exactly one count, and none with Do Not Track.
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const { FILE_URL, ROUTES, seed } = require('./helpers');
const HTML = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

test('opened from file://, the app makes no network request at all', async ({ page }) => {
  const reqs = [];
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) reqs.push(r.url()); });
  await page.goto(FILE_URL);
  await page.getByRole('button', { name: 'Start' }).click();
  for (const r of ROUTES) { await page.goto(FILE_URL + r); await expect(page.locator('#screen h1')).toBeAttached(); }
  await page.goto(FILE_URL + '#/labs/static-routing');
  await page.evaluate(() => { L4N.test.exec('PC1', 'ping 192.168.1.1'); });
  await page.waitForTimeout(500);
  expect(reqs).toEqual([]);
});

test('served from a local server, nothing goes to another host', async ({ page, baseURL }) => {
  const other = [];
  page.on('request', r => { if (!r.url().startsWith(baseURL) && !r.url().startsWith('data:')) other.push(r.url()); });
  await seed(page);
  for (const r of ROUTES) { await page.goto('/' + r); await expect(page.locator('#screen h1')).toBeAttached(); }
  expect(other).toEqual([]);
});

for (const dnt of [false, true]) {
  test('on the public host name: ' + (dnt ? 'no count with Do Not Track' : 'exactly one count'), async ({ page }) => {
    const counts = [], other = [];
    await page.route('https://yasukeblk.github.io/**', r => r.fulfill({ contentType: 'text/html', body: HTML }));
    await page.route('https://lab4net.goatcounter.com/**', r => { counts.push(r.request().url()); r.fulfill({ status: 204, body: '' }); });
    page.on('request', r => { const u = r.url(); if (!u.startsWith('https://yasukeblk.github.io/') && !u.startsWith('https://lab4net.goatcounter.com/') && !u.startsWith('data:')) other.push(u); });
    if (dnt) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'doNotTrack', { get: () => '1' }));
    await page.addInitScript(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.setItem('lab4net:v2', JSON.stringify({ v: 2, ui: { landingSeen: true } })); } });
    await page.goto('https://yasukeblk.github.io/Lab4Net/');
    await expect(page.locator('#screen h1')).toBeAttached();
    await page.goto('https://yasukeblk.github.io/Lab4Net/#/labs');
    await page.goto('https://yasukeblk.github.io/Lab4Net/#/settings');
    await page.waitForTimeout(800);
    expect(counts.length).toBe(dnt ? 0 : 1);
    if (!dnt) expect(counts[0]).toMatch(/^https:\/\/lab4net\.goatcounter\.com\/count\?p=%2FLab4Net%2F/);
    await expect(page.locator('#about')).toContainText(dnt ? 'This copy makes no network requests.' : 'counts visits anonymously');
    expect(other).toEqual([]);
  });
}
