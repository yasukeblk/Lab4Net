const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:process.env.LAB4NET_BROWSER_CHANNEL||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.locator('#studyMap').click();assert.equal(await page.locator('.study-domain').count(),6);assert.match(await page.locator('.study-next').textContent(),/Basic device setup/);
  assert.match(await page.locator('#dialogBody').textContent(),/not an exam-readiness score/);await page.locator('#closeDialog').click();
  await page.locator('#library').click();await page.locator('#labSearch').fill('Troubleshooting');assert.equal(await page.locator('.lab-card').count(),6);
  await page.locator('.lab-card').filter({hasText:'Incident 03:'}).click();assert.match(await page.locator('#brief').textContent(),/3.3/);
  await page.locator('#guideToggle').uncheck();assert.equal(await page.locator('#checkBody .step').count(),0);
  assert.ok(await page.locator('.tasks').isVisible());assert.match(await page.locator('#brief').textContent(),/reply/);
  for(let i=0;i<3;i++)await page.locator('#incidentHint').click();assert.equal(await page.locator('.incident-clue').count(),3);assert.ok(await page.locator('#incidentHint').isDisabled());
  assert.match(await page.locator('.incident-clue').last().textContent(),/10.0.23.1/);
  await page.reload();assert.equal(await page.locator('.incident-clue').count(),3);assert.equal(await page.locator('#checkBody .step').count(),0);
  await page.locator('#incidentHintReset').click();assert.equal(await page.locator('.incident-clue').count(),0);
  await page.locator('#tin').fill('ping 192.168.3.10');await page.locator('#tin').press('Enter');
  assert.match(await page.locator('#trace').textContent(),/Reply failed/);assert.match(await page.locator('#trace').textContent(),/PC1 → R1 → R2 → R3 → PC2/);
  await page.locator('#bGrade').click();assert.ok(await page.locator('#grade .no').count()>0);
  await page.locator('#guideToggle').check();await page.locator('#guidePopBtn').click();assert.ok(await page.locator('#guideWin').isVisible());
  const repair=await page.locator('#guideBody .step').evaluateAll(bs=>bs.filter(b=>b.dataset.cmd==='ip route 0.0.0.0 0.0.0.0 10.0.23.1').length);assert.equal(repair,1);
  await page.locator('#guideClose').click();
  // Repair by following each task's actual clickable commands through the console.
  const commands=await page.locator('#checkBody .step').evaluateAll(bs=>bs.map(b=>({dev:b.dataset.dev,cmd:b.dataset.cmd})));
  for(const {dev,cmd} of commands){await page.locator('#checkBody .step').evaluateAll((bs,c)=>bs.find(b=>b.dataset.dev===c.dev&&b.dataset.cmd===c.cmd).click(),{dev,cmd});await page.locator('#tin').press('Enter');}
  await page.locator('#bGrade').click();assert.match(await page.locator('#grade strong').textContent(),/Lab complete/);
  assert.match(await page.locator('#grade').textContent(),/return journey/);
  const saved=await page.evaluate(()=>progress[cur.lab.title]);await page.locator('#studyMap').click();assert.ok(saved);assert.match(await page.locator('#dialogBody').textContent(),/1\/6 troubleshooting/);
  if(process.env.LAB4NET_SCREENSHOTS){fs.mkdirSync(process.env.LAB4NET_SCREENSHOTS,{recursive:true});await page.waitForTimeout(350);await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'ccna-study-map.png'),fullPage:true});}
  await page.locator('#closeDialog').click();await page.locator('#library').click();await page.locator('#labSearch').fill('4.6');assert.equal(await page.locator('.lab-card').count(),2);
  await page.locator('.lab-card').filter({hasText:'Incident 05:'}).click();await page.locator('#guideToggle').uncheck();await page.locator('#incidentHint').click();
  if(process.env.LAB4NET_SCREENSHOTS){await page.waitForTimeout(900);await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'ccna-incident-desktop.png'),fullPage:true});}
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.locator('#incidentHint').isVisible());
  if(process.env.LAB4NET_SCREENSHOTS)await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'ccna-incident-phone.png'),fullPage:true});
  await page.locator('#studyMap').click();assert.ok(await page.locator('.study-domain').first().isVisible());
  assert.deepEqual(errors,[]);console.log('PASS CCNA browser: six incidents searchable by scope, study map/recommendations, independent objectives, persistent progressive hints, pop-out guide, real failed return path, command-by-command repair, grade and lesson, phone/reduced motion.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
