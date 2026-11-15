#!/usr/bin/env node
// Builds og.png (1200 by 630), the share image, with Playwright:
//   1. opens the built index.html, runs a ping in the Static routing lab and photographs the workspace;
//   2. puts that picture into tools/og.html with the mark, the wordmark and the headline, and photographs that.
// Needs the test-only dev dependency @playwright/test and its Chromium (npx playwright install chromium).
//   node tools/build-og.cjs
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('@playwright/test');
const ROOT = path.join(__dirname, '..');
const fileUrl = p => 'file:///' + path.join(ROOT, p).replace(/\\/g, '/').replace(/^\/+/, '');

(async () => {
  const browser = await chromium.launch();
  // 1. the workspace, dark theme, after a successful ping
  const app = await browser.newPage({ viewport: { width: 1520, height: 1004 }, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'reduce' });
  await app.addInitScript(() => { try { localStorage.setItem('lab4net:v2', JSON.stringify({ v: 2, settings: { theme: 'dark', pace: 'instant' }, ui: { landingSeen: true, sidebarLab: 'rail', hints: { stepTip: true }, seenLesson: { 'static-routing': true } } })); } catch (e) {} });
  await app.goto(fileUrl('index.html') + '#/labs/static-routing');
  await app.waitForSelector('#ws-map .node');
  await app.evaluate(() => {
    const lab = LABS.find(l => l.title === 'Static routing');
    for (const [d, cmds] of Object.entries(lab.solution)) for (const c of cmds) L4N.test.exec(d, c);
    L4N.test.exec('R1', 'show ip route');
    L4N.test.exec('PC1', 'ping 192.168.3.10');
  });
  await app.waitForSelector('#ws-map .badge__icon.is-ok', { state: 'attached' });
  await app.waitForTimeout(300);
  const shot = await app.screenshot({ type: 'png' });
  await app.close();

  // 2. the share card
  const fonts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/manifest.json'), 'utf8')).fonts.map(f =>
    '@font-face{font-family:"' + f.family + '";font-weight:' + f.weight + ';src:url(data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'src', f.file)).toString('base64') + ') format("woff2")}').join('\n');
  const html = fs.readFileSync(path.join(__dirname, 'og.html'), 'utf8').replace('/*FONTS*/', fonts);
  const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await card.setContent(html);
  await card.evaluate(src => new Promise(res => { const i = document.getElementById('shot'); i.onload = res; i.src = src; }), 'data:image/png;base64,' + shot.toString('base64'));
  await card.evaluate(() => document.fonts.ready);
  await card.screenshot({ path: path.join(ROOT, 'og.png'), type: 'png' });
  await browser.close();
  console.log('wrote og.png');
})().catch(e => { console.error(e); process.exit(1); });
