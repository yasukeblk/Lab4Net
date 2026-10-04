// Optional: uses the same Playwright setup as tests/ui.cjs.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:process.env.LAB4NET_BROWSER_CHANNEL||undefined});try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  assert.match(await page.locator('#instructionGuide').textContent(),/STEP 1/);
  assert.equal(await page.locator('.guide-command').textContent(),'enable');
  // Merely navigating instructions cannot configure a device.
  await page.locator('[data-guide="next"]').click();
  assert.equal(await page.evaluate(()=>cur.sess.R1.mode),'user');
  await page.locator('[data-guide="prev"]').click();
  await page.locator('#tin').fill('enable');await page.locator('#tin').press('Enter');
  assert.match(await page.locator('#instructionGuide').textContent(),/STEP 2/);
  await page.reload();assert.match(await page.locator('#instructionGuide').textContent(),/STEP 2/);
  // Wrong-mode commands are rejected and must not advance the guide.
  await page.evaluate(()=>{execute('disable');execute('configure terminal');});
  assert.equal(await page.evaluate(()=>cur.guideStep),1);
  await page.locator('#instructionsToggle').click();assert.equal(await page.locator('#brief').isVisible(),true);assert.equal(await page.locator('#instructionGuide').isVisible(),false);
  for(const id of ['missionOverview','addressCard','missionObjectives'])assert.equal(await page.locator('#'+id).isVisible(),true);
  assert.match(await page.locator('#missionObjectives').textContent(),/set the hostname/);
  await page.reload();assert.equal(await page.locator('#brief').isVisible(),true);assert.equal(await page.locator('#instructionGuide').isVisible(),false);
  await page.locator('#quickGrade').click();assert.match(await page.locator('#notice').textContent(),/checks passed/);assert.match(await page.locator('#dialogBody').textContent(),/R1 hostname/);await page.locator('#closeDialog').click();
  await page.locator('#instructionsToggle').click();assert.equal(await page.locator('#brief').isVisible(),true);
  const popupPromise=page.waitForEvent('popup');await page.locator('#instructionsPopout').click();const popup=await popupPromise;
  await popup.waitForLoadState();assert.match(await popup.locator('#popupGuide').textContent(),/STEP 2/);
  assert.equal(await page.locator('#brief').isVisible(),true);assert.equal(await page.locator('#instructionGuide').isVisible(),false);
  await popup.locator('[data-guide="next"]').click();assert.equal(await page.evaluate(()=>cur.guideStep),2);
  await page.selectOption('#labs','14');assert.match(await popup.locator('h2').textContent(),/Static NAT/);
  const checks=await page.evaluate(()=>LABS.map(l=>({title:l.title,commands:Object.values(l.solution).flat().length,steps:guideSteps(l).length})));
  for(const item of checks)assert.equal(item.steps,item.commands+1,item.title);
  // Follow the entire guide using its real commands; then grade from the pop-out.
  await page.evaluate(()=>{for(const[device,commands]of Object.entries(cur.lab.solution)){select(device);commands.forEach(execute);}});
  assert.match(await popup.locator('#popupGuide').textContent(),/Run the verification/);
  await popup.locator('[data-guide="grade"]').click();assert.match(await popup.locator('#popupInstructions').textContent(),/Grade: 5 \/ 5/);
  await page.locator('#instructionsToggle').click();assert.match(await popup.locator('#popupInstructions').textContent(),/Instructions are off/);
  await page.locator('#instructionsToggle').click();
  const dockClose=popup.waitForEvent('close');await popup.locator('#dockInstructions').click();await dockClose;assert.equal(await page.locator('#brief').isVisible(),true);
  const secondPromise=page.waitForEvent('popup');await page.locator('#instructionsPopout').click();const second=await secondPromise;
  await second.close();await page.waitForFunction(()=>instructionWindow===null);assert.equal(await page.locator('#brief').isVisible(),true);
  // Blocked pop-ups keep the instructions docked and explain how to recover.
  await page.evaluate(()=>{window.open=()=>null;});await page.locator('#instructionsPopout').click();
  assert.equal(await page.locator('#brief').isVisible(),true);assert.match(await page.locator('#notice').textContent(),/Pop-up blocked/);
  await page.setViewportSize({width:390,height:844});await page.locator('#instructionsToggle').click();
  assert.equal(await page.locator('#brief').isVisible(),true);assert.equal(await page.locator('#mobileNav').isVisible(),true);assert.equal(await page.locator('#instructionGuide').isVisible(),false);
  await page.locator('#networkView').click();assert.equal(await page.locator('#bench').isVisible(),true);
  await page.locator('#missionView').click();assert.equal(await page.locator('#missionObjectives').isVisible(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS instructions: all 15 lab guides, navigation without execution, auto-advance, rejected command, saved toggle/step, popup synchronization, popup grading, dock, native close, blocked popup and phone.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
