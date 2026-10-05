// Optional browser checks: npm install --no-save playwright, then node tests/ui.cjs.
// Set LAB4NET_BROWSER_CHANNEL=msedge to use an installed Edge browser.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ channel: process.env.LAB4NET_BROWSER_CHANNEL || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href);
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload();
    assert.equal(await page.locator('#tabs button').count(), 3);
    // Type into the actual console, reload inside interface mode, and continue.
    for (const line of ['enable', 'configure terminal', 'interface g0/0', 'description RESTORED']) {
      await page.locator('#tin').fill(line);
      await page.locator('#tin').press('Enter');
    }
    await page.locator('[data-task="3"]').check();
    await page.reload();
    assert.equal(await page.locator('#mode').textContent(), 'Interface configuration');
    assert.ok(await page.locator('[data-task="3"]').isChecked());
    await page.locator('#tin').fill('ip address 192.168.1.1 255.255.255.0');
    await page.locator('#tin').press('Enter');
    assert.equal(await page.evaluate(() => IF(cur.net,'R1','g0/0').ip), 3232235777);
    // Every walkthrough through the UI execution path, followed by actual Grade button.
    const count = await page.evaluate(() => LABS.length);
    for (let i = 0; i < count; i++) {
      await page.evaluate(i => {
        openLab(i,true);
        for (const [device, commands] of Object.entries(cur.lab.solution)) {
          select(device);
          commands.forEach(execute);
        }
      }, i);
      await page.locator('#bGrade').click();
      assert.match(await page.locator('#grade strong').textContent(), /Lab complete/);
      assert.equal(await page.locator('#grade .no').count(), 0);
    }
    // The troubleshooting incidents come after the build labs, so return to Static NAT for the trace checks.
    await page.evaluate(() => {
      openLab(LABS.findIndex(l => l.title === 'Static NAT: publish a server'), true);
      for (const [device, commands] of Object.entries(cur.lab.solution)) { select(device); commands.forEach(execute); }
    });
    await page.locator('#bGrade').click();
    // Persistent trace survives animation and describes both directions.
    assert.match(await page.locator('#trace').textContent(), /Reply received/);
    assert.match(await page.locator('#trace').textContent(), /CLIENT → ISP → R1 → WEB/);
    await page.evaluate(() => { select('R1');execute('show ip nat translations'); });
    assert.match(await page.locator('#grade').textContent(),/Grade again/);
    assert.match(await page.locator('#trace').textContent(),/Reply received/);
    // Export, modify the configuration, import, verify the saved configuration returned.
    await page.locator('#transfer').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await downloadPromise;
    const backup = fs.readFileSync(await download.path());
    await page.locator('#closeDialog').click();
    await page.evaluate(() => { select('R1'); execute('configure terminal'); execute('no ip nat inside source static 192.168.1.10 203.0.113.10'); });
    assert.equal(await page.evaluate(() => cur.net.devs.R1.nat.statics.length), 0);
    await page.locator('#transfer').click();
    await page.locator('#import').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
    await page.waitForFunction(() => document.getElementById('transferStatus').textContent.startsWith('Backup imported'));
    assert.equal(await page.evaluate(() => cur.net.devs.R1.nat.statics.length), 1);
    // An invalid import must not replace saved work.
    await page.locator('#import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"lab4net","version":1,"progress":{},"drafts":{"Static NAT: publish a server":{"journal":[{"device":"UNKNOWN","line":"enable"}],"tasks":[]}}}') });
    await page.waitForFunction(() => document.getElementById('transferStatus').textContent.startsWith('Import failed'));
    assert.equal(await page.evaluate(() => cur.net.devs.R1.nat.statics.length), 1);
    await page.locator('#closeDialog').click();
    // Searchable library and guide.
    await page.locator('#library').click();
    await page.locator('#labSearch').fill('triangle');
    assert.equal(await page.locator('.lab-card').count(), 1);
    await page.locator('.lab-card').click();
    await page.locator('#reference').click();
    await page.locator('#allModes').check();
    await page.locator('#cmdSearch').fill('show ip route');
    await page.locator('.command-card').first().click();
    assert.equal(await page.locator('#tin').inputValue(), 'show ip route');
    // Multiline paste remains reviewable and applies only after the explicit Run action.
    await page.evaluate(() => {
      const data=new DataTransfer();data.setData('text/plain','enable\nconfigure terminal\nhostname REVIEWED');
      document.getElementById('tin').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
    });
    assert.match(await page.locator('#dialogBody').textContent(),/Run these 3 commands/);
    assert.notEqual(await page.evaluate(() => cur.net.devs.R1.hostname),'REVIEWED');
    await page.locator('#runPaste').click();
    assert.equal(await page.evaluate(() => cur.net.devs.R1.hostname),'REVIEWED');
    await page.locator('#tin').press('Control+z');
    assert.equal(await page.locator('#mode').textContent(),'Privileged EXEC');
    // Capstones open with the step-by-step guide off, whatever the global setting, and switching it on there
    // is remembered for that capstone only.
    await page.evaluate(() => openLab(LABS.findIndex(l => l.title === 'Basic device setup'), true));
    if (!(await page.locator('#guideToggle').isChecked())) await page.locator('#guideToggle').check({ force: true });
    assert.ok(await page.locator('.steps').count() > 0);
    await page.evaluate(() => openLab(LABS.findIndex(l => l.capstone), true));
    assert.equal(await page.locator('#guideToggle').isChecked(), false);
    assert.equal(await page.locator('.steps').count(), 0);
    assert.match(await page.locator('#brief').textContent(), /CAPSTONE 01/);
    await page.locator('#guideToggle').check({ force: true });
    assert.ok(await page.locator('.steps').count() > 0);
    await page.evaluate(() => openLab(LABS.findIndex(l => l.title === 'Basic device setup'), true));
    assert.equal(await page.locator('#guideToggle').isChecked(), true);
    await page.evaluate(() => openLab(LABS.findIndex(l => l.capstone), true));
    assert.equal(await page.locator('#guideToggle').isChecked(), true);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lab4net-capstone-guide'))['Capstone: branch office from scratch']), true);
    await page.locator('#guideToggle').uncheck({ force: true });
    // Practice views hide the network and remain interactive.
    await page.selectOption('#labs', 'drill');
    assert.equal(await page.locator('#bench').isVisible(), false);
    await page.evaluate(() => DF.forEach(([,f],i) => document.getElementById('d'+i).value=f(cur.drillQ)));
    await page.locator('#dCheck').click();
    assert.equal(await page.locator('.drill .ok').count(), 6);
    await page.selectOption('#labs', 'quiz');
    await page.locator('[data-answer="0"]').click();
    assert.match(await page.locator('#practice').textContent(), /Correct\./);
    // Reduced motion can change while the page is open.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => REDUCED);
    assert.equal(await page.evaluate(() => REDUCED), true);
    await page.selectOption('#labs', '0');
    assert.equal(await page.locator('.selring').evaluate(el => getComputedStyle(el).animationName), 'none');
    // Phone: no horizontal viewport overflow; dialogs and console remain usable.
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#networkView').click();
    assert.equal(await page.locator('#bench').isVisible(),true);
    assert.equal(await page.locator('#brief').isVisible(),false);
    await page.locator('#tin').fill('show ip interface brief');
    await page.locator('#tin').press('Enter');
    assert.match(await page.locator('#tout').textContent(),/IP-Address/);
    await page.locator('#missionView').click();
    assert.equal(await page.locator('#brief').isVisible(),true);
    await page.locator('#library').click();
    assert.ok(await page.evaluate(() => document.getElementById('dialog').getBoundingClientRect().width<=innerWidth));
    await page.locator('#closeDialog').click();
    await page.setViewportSize({width:320,height:700});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth));
    await page.setViewportSize({width:390,height:844});
    if (process.env.LAB4NET_SCREENSHOTS) {
      fs.mkdirSync(process.env.LAB4NET_SCREENSHOTS,{recursive:true});
      await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'phone.png'),fullPage:true});
      await page.locator('#networkView').click();
      await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'phone-console.png'),fullPage:true});
      await page.setViewportSize({width:1440,height:1000});
      await page.evaluate(() => {openLab(9);select('R1');});
      await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'desktop.png'),fullPage:true});
    }
    assert.deepEqual(errors, []);
    console.log(`PASS browser: ${count} lab grades, console restore, task restore, backup round-trip, invalid import, library, guide, capstone guide default, drill, quiz, phone, reduced motion; no page errors.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
