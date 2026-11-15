// Screenshot checks (section 8.4). Compared on Linux in CI only; elsewhere the pictures are saved in
// test-results/shots for a person to look at.
const { test, expect } = require('@playwright/test');
const path = require('path');
const { open } = require('./helpers');

const SIZES = [[1366, 768], [1920, 1080], [390, 844]];
const COMPARE = process.platform === 'linux' && !!process.env.CI;

const STATES = [
  { name: 'gallery', route: '#/dev/components', full: true },
  { name: 'landing', route: '?welcome', full: true },
  { name: 'home-new', route: '#/' },
  { name: 'home-seeded', route: '#/', main: { v: 2, labs: { 'basic-device-setup': { done: true, grade: 'S' }, 'switch-management-access': { done: true, grade: 'A' }, 'vlans-and-access-ports': { done: true, grade: 'B' } }, lessons: { 'static-routing': { read: true, quiz: {} } }, quiz: { answers: { 0: true, 1: true, 2: false } }, ui: { landingSeen: true, lastLab: 'static-routing', recent: ['static-routing'] } }, keys: { 'lab4net:v2:work': { 'static-routing': { journal: [{ device: 'R1', line: 'enable' }], tasks: [true, true] } } } },
  { name: 'labs', route: '#/labs' },
  { name: 'settings', route: '#/settings' },
  { name: 'workspace', route: '#/labs/static-routing', act: async page => { await page.evaluate(() => { for (const l of ['enable', 'configure terminal', 'ip route 192.168.3.0 255.255.255.0 10.0.12.2', 'end', 'show ip route']) L4N.test.exec('R1', l); }); } },
  { name: 'workspace-failed-ping', route: '#/labs/static-routing', act: async page => { await page.evaluate(() => L4N.test.exec('PC1', 'ping 192.168.3.10')); await page.locator('#ws-map .badge__icon.is-bad').waitFor({ state: 'attached' }); const d = page.getByRole('button', { name: 'Details' }); if (await d.isVisible()) await d.click(); } },
  { name: 'workspace-tasks-collapsed', route: '#/labs/static-routing', act: async page => { const b = page.getByRole('button', { name: 'Collapse the Tasks panel' }); if (await b.isVisible()) await b.click(); } },
  { name: 'lesson-reader', route: '#/lessons/static-routing' },
  { name: 'practice', route: '#/practice' },
  { name: 'quiz-answered', route: '#/practice/quiz', act: async page => { await page.locator('.qc__opt').first().click(); await page.getByRole('button', { name: 'Check' }).click(); } },
  { name: 'exam-running', route: '#/practice/exam', act: async page => { await page.evaluate(() => { L4N.exam.begin('sabotage', 20, { seed: 'visual' }); L4N.shell.go('#/practice/exam/run'); }); await page.locator('#gradeBtn').waitFor(); } },
  { name: 'progress-seeded', route: '#/progress', main: { v: 2, ui: { landingSeen: true }, labs: { 'static-routing': { done: true, grade: 'S', doneAt: 1731600000000 }, 'basic-device-setup': { done: true, grade: 'B', doneAt: 1731500000000 } }, lessons: { 'static-routing': { read: true, readAt: 1731650000000, quiz: {} } }, quiz: { answers: { 0: true, 1: true } }, exam: { history: [{ at: 1731700000000, mode: 'sabotage', base: 'static-routing', cleared: true, passed: 6, total: 6, grade: 'A', secs: 300, minutes: 20 }] } } },
  { name: 'sandbox', route: '#/sandbox', act: async page => { await page.locator('.build__goal').nth(4).getByRole('button', { name: 'Load' }).click(); await page.locator('#ws-map .node').first().waitFor({ state: 'attached' }); } },
  { name: 'palette', route: '#/', act: async page => { await page.locator('.sb__search').click({ force: true }).catch(() => {}); if (!(await page.locator('dialog[open]').count())) await page.evaluate(() => L4N.palette.open()); } }
];

// The lesson web page follows prefers-color-scheme instead of the app's theme.
for (const scheme of ['dark', 'light']) for (const [w, h] of SIZES) {
  test(`lesson-page ${scheme} ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('/lessons/static-routing.html');
    const name = `lesson-page-${scheme}-${w}x${h}.png`;
    if (COMPARE) await expect(page).toHaveScreenshot(name);
    else await page.screenshot({ path: path.join(__dirname, '..', '..', 'test-results', 'shots', name) });
  });
}

// Later phases add their states here.
module.exports.STATES = STATES;

for (const theme of ['dark', 'light']) {
  for (const [w, h] of SIZES) {
    for (const s of STATES) {
      test(`${s.name} ${theme} ${w}x${h}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page, s.route, { theme, main: s.main && JSON.parse(JSON.stringify(s.main)), keys: s.keys });
        if (s.act) await s.act(page);
        await page.waitForTimeout(150);
        const name = `${s.name}-${theme}-${w}x${h}.png`;
        if (COMPARE) await expect(page).toHaveScreenshot(name, { fullPage: !!s.full });
        else await page.screenshot({ path: path.join(__dirname, '..', '..', 'test-results', 'shots', name), fullPage: !!s.full });
      });
    }
  }
}
