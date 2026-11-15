// Records docs/demo.gif from the built app: Incident 07, where R3 sits in the wrong OSPF area.
// Needs Playwright (npm install) and ffmpeg on the PATH (or FFMPEG=/path/to/ffmpeg).
// Usage: node tools/serve.cjs 8139 & node tools/build-demo.cjs [http://127.0.0.1:8139/]
const path = require('path'), fs = require('fs'), os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('@playwright/test');

const BASE = process.argv[2] || 'http://127.0.0.1:8139/';
const OUT = path.join(__dirname, '..', 'docs', 'demo.gif');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const W = 1280, H = 720;

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l4n-demo-'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir, size: { width: W, height: H } }, colorScheme: 'dark' });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('demo')) return;
    sessionStorage.setItem('demo', '1');
    localStorage.setItem('lab4net:v2', JSON.stringify({ v: 2, settings: { theme: 'dark', pace: 'fast' }, ui: { landingSeen: true, hints: { stepTip: true } } }));
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(BASE + '#/labs/incident-07-one-branch-fell-off-the-map');
  await page.locator('#gradeBtn').waitFor();
  await page.mouse.move(W - 10, H - 10);
  const input = page.locator('.con__input');
  const type = async (line, wait = 250) => { await input.pressSequentially(line, { delay: 38 }); await page.waitForTimeout(120); await input.press('Enter'); await page.waitForTimeout(wait); };
  const tab = async name => { await page.locator('.con__tab', { hasText: name }).click(); await page.waitForTimeout(400); };
  const start = Date.now() - t0;
  await page.waitForTimeout(1200);
  // the symptom: PC1 cannot reach PC3
  await tab('PC1');
  await type('ping 192.168.3.10', 300);
  await page.locator('.con__out').getByText('Ping statistics').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1800);
  // the cause and the fix on R3
  await tab('R3');
  await type('en');
  await type('show ip ospf interface brief', 1600);
  await type('conf t');
  await type('router ospf 1');
  await type('no network 10.0.13.0 0.0.0.3 area 1');
  await type('no network 10.0.23.0 0.0.0.3 area 1');
  await type('network 10.0.13.0 0.0.0.3 area 0');
  await type('network 10.0.23.0 0.0.0.3 area 0', 600);
  await type('end');
  await type('show ip ospf neighbor', 1800);
  // proof
  await tab('PC1');
  await type('ping 192.168.3.10', 300);
  await page.locator('.con__out').getByText('Ping statistics').nth(1).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1600);
  await page.locator('#gradeBtn').click();
  await page.waitForTimeout(2600);
  const video = page.video();
  await ctx.close();
  await browser.close();
  const webm = await video.path();
  const ss = (start / 1000).toFixed(2);
  const filters = 'fps=7,scale=880:-1:flags=lanczos';
  const pal = path.join(dir, 'pal.png');
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-ss', ss, '-i', webm, '-vf', filters + ',palettegen=max_colors=64:stats_mode=diff', pal]);
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-ss', ss, '-i', webm, '-i', pal, '-lavfi', filters + ' [x]; [x][1:v] paletteuse=dither=none:diff_mode=rectangle', OUT]);
  console.log('wrote', OUT, fs.statSync(OUT).size, 'bytes');
  fs.rmSync(dir, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
