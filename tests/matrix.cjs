// Optional local browser verification for the Matrix workspace and window controls.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({ channel: process.env.LAB4NET_BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
    await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    assert.equal(await page.locator('#matrixRain').getAttribute('data-running'), 'true');
    await page.locator('#rainToggle').click();
    assert.equal(await page.locator('#matrixRain').getAttribute('data-running'), 'false');
    await page.reload();
    assert.equal(await page.locator('#rainToggle').getAttribute('aria-pressed'), 'false');
    await page.locator('#rainToggle').click();
    // Brief, address plan, objectives and explanations survive hiding command guidance.
    await page.locator('#guideToggle').uncheck();
    assert.equal(await page.locator('#checkBody .step').count(), 0);
    assert.ok(await page.locator('#brief').isVisible());
    assert.ok(await page.locator('#brief table').isVisible());
    assert.equal(await page.locator('.tasks>li').count(), await page.evaluate(() => cur.lab.tasks.length));
    assert.equal(await page.locator('.tasks details').count(), await page.evaluate(() => cur.lab.why.length));
    await page.reload();
    assert.equal(await page.locator('#guideToggle').isChecked(), false);
    await page.locator('#guidePopBtn').click();
    assert.ok(await page.locator('#guideWin').isVisible());
    assert.equal(await page.locator('#guideToggle').isChecked(), true);
    assert.equal(await page.locator('#checkBody .step').count(), 0);
    const command = page.locator('#guideBody .step').first();
    const before = await page.evaluate(() => cur.journal.length);
    await command.click();
    assert.notEqual(await page.locator('#tin').inputValue(), '');
    assert.equal(await page.evaluate(() => cur.journal.length), before);
    await page.locator('#guideToggle').uncheck();
    assert.equal(await page.locator('#guideWin').isVisible(), false);
    await page.locator('#guideToggle').check();
    assert.ok(await page.locator('#guideWin').isVisible());
    await page.locator('#guideClose').click();
    assert.equal(await page.locator('#guideWin').isVisible(), false);
    assert.ok(await page.locator('#checkBody .step').count() > 0);
    // Drag and resize a real window; persisted geometry restores after reload.
    const original = await page.locator('#mapPanel').boundingBox();
    await page.keyboard.down('Alt');
    await page.mouse.move(original.x + 80, original.y + 20);
    await page.mouse.down();
    await page.mouse.move(original.x + 105, original.y + 45, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Alt');
    const moved = await page.locator('#mapPanel').boundingBox();
    assert.ok(moved.y > original.y + 10);
    await page.mouse.move(moved.x + moved.width - 2, moved.y + moved.height - 2);
    await page.mouse.down();
    await page.mouse.move(moved.x + moved.width - 42, moved.y + moved.height - 22, { steps: 8 });
    await page.mouse.up();
    const resized = await page.locator('#mapPanel').boundingBox();
    assert.ok(resized.width < moved.width - 20);
    await page.reload();
    const restored = await page.locator('#mapPanel').boundingBox();
    assert.ok(Math.abs(restored.width - resized.width) < 2);
    await page.locator('#resetLayout').click();
    // Default windows stay fully on screen at common desktop resolutions.
    for (const [width,height] of [[1920,1080],[1366,768],[1024,768]]) {
      await page.setViewportSize({width,height});
      await page.locator('#resetLayout').click();
      for (const id of ['brief','checkWin','mapPanel','console']) {
        const r=await page.locator('#'+id).boundingBox();
        assert.ok(r.x>=0 && r.y>=0 && r.x+r.width<=width+1 && r.y+r.height<=height+1, `${id} fits ${width}×${height}`);
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.getElementById('matrixRain').dataset.running === 'false');
    assert.equal(await page.locator('#matrixRain').getAttribute('data-running'), 'false');
    assert.equal(await page.locator('#matrixRain').isVisible(), false);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.getElementById('matrixRain').dataset.running === 'true');
    assert.equal(await page.locator('#matrixRain').getAttribute('data-running'), 'true');
    if (process.env.LAB4NET_SCREENSHOTS) {
      fs.mkdirSync(process.env.LAB4NET_SCREENSHOTS,{recursive:true});
      await page.setViewportSize({width:1920,height:1080});
      await page.locator('#resetLayout').click();
      await page.selectOption('#labs','9');
      await page.locator('#guideToggle').uncheck();
      await page.evaluate(() => { select('R1');execute('enable');execute('show ip interface brief'); });
      await page.waitForTimeout(1600);
      await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'matrix-workspace.png'),fullPage:true});
      await page.locator('#guidePopBtn').click();
      await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'matrix-guide.png'),fullPage:true});
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    console.log('PASS Matrix workspace: rain toggle/restore, live reduced motion, persistent mission and objectives, guide toggle/pop-out/dock, command insertion, drag/resize/restore, 3 desktop resolutions; no page errors or network requests.');
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
