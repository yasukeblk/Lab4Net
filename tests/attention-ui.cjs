const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:process.env.LAB4NET_BROWSER_CHANNEL||undefined});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
 await page.locator('#guideToggle').uncheck();
 await page.locator('.task-focus').nth(2).click();assert.match(await page.locator('#attentionTask').textContent(),/TASK 3 OF/);
 assert.equal(await page.locator('[data-task="2"]').isChecked(),false);
 assert.ok(!(await page.locator('#attentionTask').textContent()).includes('<code>'));
 await page.locator('#taskNext').click();assert.match(await page.locator('#attentionTask').textContent(),/TASK 4 OF/);await page.locator('#taskPrevious').click();
 await page.locator('#tabs [data-dev="SW1"]').click();assert.match(await page.locator('#attentionDevice').textContent(),/SW1/);
 const before=await page.evaluate(()=>localStorage.getItem('lab4net-layout-v2'));
 await page.locator('#focusToggle').click();assert.equal(await page.locator('#checkWin').isVisible(),false);assert.equal(await page.locator('#brief').isVisible(),false);
 assert.ok(await page.locator('#attentionTask').isVisible());assert.ok(await page.locator('#console').isVisible());
 const bounds=await page.locator('#console').boundingBox();assert.ok(bounds.width>1300);
 await page.locator('#tin').fill('enable');await page.locator('#tin').press('Enter');assert.match(await page.locator('#mode').textContent(),/Privileged/);
 assert.match(await page.locator('#attentionTask').textContent(),/TASK 3 OF/);
 if(process.env.LAB4NET_SCREENSHOTS){fs.mkdirSync(process.env.LAB4NET_SCREENSHOTS,{recursive:true});await page.waitForTimeout(300);await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'focus-workspace.png')});}
 await page.locator('#taskReturn').click();assert.ok(await page.locator('#brief').isVisible());assert.equal(await page.evaluate(()=>localStorage.getItem('lab4net-layout-v2')),before);
 await page.locator('#focusToggle').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#focusToggle').getAttribute('aria-pressed'),'false');
 if(process.env.LAB4NET_SCREENSHOTS){await page.waitForTimeout(300);await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'clear-workspace.png')});}
 await page.locator('#labs').selectOption('quiz');assert.equal(await page.locator('#attentionBar').isVisible(),false);
 await page.locator('#labs').selectOption('0');assert.match(await page.locator('#attentionTask').textContent(),/TASK 1 OF/);
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#networkView').click();await page.locator('#taskReturn').click();assert.ok(await page.locator('.current-task').isVisible());
 assert.deepEqual(errors,[]);console.log('PASS attention UI: chosen task independent of completion/guide, device context, focus console commands, restored geometry, Escape, practice navigation, phone/reduced motion.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
