const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:process.env.LAB4NET_BROWSER_CHANNEL||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.locator('#sandbox').click();
  assert.ok(await page.locator('#tin').isDisabled());
  assert.equal(await page.locator('#bGrade').count(),0);
  await page.locator('[data-add="router"]').click();
  assert.equal(await page.locator('#tabs button').count(),1);
  for(const command of ['enable','configure terminal','hostname TESTROUTER']){
   await page.locator('#tin').fill(command);await page.locator('#tin').press('Enter');
  }
  await page.reload();assert.equal(await page.evaluate(()=>!!cur.sandbox),true);await page.locator('#sandbox').click();
  assert.equal(await page.locator('#mode').textContent(),'Global configuration');
  assert.match(await page.locator('#tabs').textContent(),/TESTROUTER/);
  // Work through the actual starter controls and probe form.
  await page.locator('#sbNew').click();await page.locator('#sbStarter').click();
  await page.locator('#sbProbe [name=source]').selectOption('PC1');
  await page.locator('#sbProbe [name=target]').fill('192.168.1.20');
  await page.locator('#sbProbe button').click();
  assert.match(await page.locator('#trace').textContent(),/Reply received/);
  assert.match(await page.locator('#trace').textContent(),/PC1 → SW1 → PC2/);
  const downloadPromise=page.waitForEvent('download');await page.locator('#sbExport').click();
  const backup=fs.readFileSync(await (await downloadPromise).path());
  await page.locator('[data-unlink="1"]').click();
  await page.locator('#sbProbe [name=target]').fill('192.168.1.20');await page.locator('#sbProbe button').click();
  assert.doesNotMatch(await page.locator('#trace').textContent(),/Reply received/);
  // Cable builder offers free ports and reconnects the actual model.
  await page.locator('#sbA').selectOption('SW1');await page.locator('#sbAP').selectOption('FastEthernet0/2');
  await page.locator('#sbB').selectOption('PC2');await page.locator('#sbBP').selectOption('FastEthernet0');
  await page.locator('#sbConnect').click();
  assert.equal(await page.locator('.sb-cables>div').count(),2);
  await page.locator('#sbImport').setInputFiles({name:'sandbox.json',mimeType:'application/json',buffer:backup});
  await page.waitForFunction(()=>cur.project.events.at(-1).line==='ping 192.168.1.20');
  const events=await page.evaluate(()=>cur.project.events.length);
  await page.locator('#sbImport').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"format":"lab4net-sandbox","version":1,"events":[{"op":"link","a":"MISSING"}]}')});
  await page.waitForFunction(()=>document.getElementById('sbStatus').textContent.startsWith('Import failed'));
  assert.equal(await page.evaluate(()=>cur.project.events.length),events);
  const keyboardPosition=await page.evaluate(()=>cur.pos.PC2.slice());
  await page.locator('#topo [data-dev=PC2]').focus();
  await page.locator('#topo [data-dev=PC2]').press('ArrowLeft');
  assert.equal(await page.evaluate(()=>cur.pos.PC2[0]),keyboardPosition[0]-10);
  await page.locator('#sbUndo').click();
  assert.deepEqual(await page.evaluate(()=>cur.pos.PC2),keyboardPosition);
  // Host controls generate real commands and save the exact result.
  await page.locator('#tab-PC2').click();
  await page.locator('#sbHost [name=address]').fill('192.168.1.22');
  await page.locator('#sbHost [name=gateway]').fill('192.168.1.1');
  await page.locator('#sbHost button[type=submit]').click();
  assert.equal(await page.evaluate(()=>n2ip(nic(cur.net.devs.PC2).ip)),'192.168.1.22');
  // Drag an actual topology node; geometry and command configuration survive reload.
  const node=await page.locator('#topo [data-dev=PC2]').boundingBox();
  const old=await page.evaluate(()=>cur.pos.PC2.slice());
  await page.mouse.move(node.x+node.width/2,node.y+node.height/2);await page.mouse.down();
  await page.mouse.move(node.x+node.width/2-55,node.y+node.height/2+25,{steps:8});await page.mouse.up();
  assert.notDeepEqual(await page.evaluate(()=>cur.pos.PC2),old);
  const pos=await page.evaluate(()=>cur.pos.PC2.slice());
  await page.selectOption('#labs','0');assert.ok(await page.locator('#bGrade').isVisible());
  await page.locator('#sandbox').click();assert.deepEqual(await page.evaluate(()=>cur.pos.PC2),pos);
  await page.reload();await page.locator('#sandbox').click();
  assert.equal(await page.evaluate(()=>n2ip(nic(cur.net.devs.PC2).ip)),'192.168.1.22');
  assert.deepEqual(await page.evaluate(()=>cur.pos.PC2),pos);
  assert.equal(await page.evaluate(()=>Object.keys(progress).length),0);
  await page.locator('[data-add="server"]').click();
  assert.deepEqual(await page.evaluate(()=>cur.net.devs.SRV1.services),[80,443]);
  await page.locator('#sbDelete').click();await page.locator('#sbConfirmDelete').click();
  assert.equal(await page.locator('#tab-SRV1').count(),0);
  await page.locator('#sbUndo').click();
  assert.ok(await page.locator('#tab-SRV1').isVisible());
  await page.locator('#sbUndo').click();
  assert.equal(await page.locator('#tab-SRV1').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#missionView').click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#networkView').click();
  assert.ok(await page.locator('#bench').isVisible());
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#resetLayout').click();
  assert.ok((await page.locator('#checkWin').boundingBox()).height>200,'Reduced-motion layout reset keeps the workbench open');
  if(process.env.LAB4NET_SCREENSHOTS){
   fs.mkdirSync(process.env.LAB4NET_SCREENSHOTS,{recursive:true});
   await page.setViewportSize({width:390,height:844});
   await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'sandbox-phone.png'),fullPage:true});
   await page.setViewportSize({width:1920,height:1080});await page.reload();await page.locator('#resetLayout').click();
   await page.evaluate(()=>document.getElementById('notice').textContent='');
   await page.waitForTimeout(200);
   await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'sandbox-desktop.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS sandbox browser: empty canvas, add/remove/undo, IOS config and automatic mode restore, starter LAN, actual packet path, cable failure/reconnect, export/import, invalid import preservation, host settings, keyboard/drag positioning, lab isolation, phone and reduced motion; no page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
