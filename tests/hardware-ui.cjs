const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:process.env.LAB4NET_BROWSER_CHANNEL||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.locator('#sandbox').click();
  await page.locator('#sbHardware').selectOption('ex2300-24t');await page.locator('#sbAddHardware').click();
  assert.equal(await page.locator('#prompt').textContent(),'lab@EX1>');
  await page.locator('.hw-card summary').click();assert.equal(await page.locator('.hw-port').count(),28);
  await page.locator('[data-hw-port="ge-0/0/22"]').click();assert.equal(await page.locator('#sbAP').inputValue(),'ge-0/0/22');
  await page.locator('#sbNew').click();await page.locator('#sbMixed').click();
  const commands=await page.locator('.hw-exercise .step').evaluateAll(bs=>bs.map(b=>({dev:b.dataset.dev,cmd:b.dataset.cmd})));
  assert.ok(commands.length>20);
  for(const {dev,cmd} of commands){
   await page.locator('.hw-exercise').evaluate(e=>e.open=true);
   await page.locator('.hw-exercise .step').filter({hasText:cmd}).evaluateAll((bs,c)=>bs.find(b=>b.dataset.cmd===c.cmd&&b.dataset.dev===c.dev).click(),{dev,cmd});
   assert.equal(await page.locator('#tin').inputValue(),cmd);await page.locator('#tin').press('Enter');
   if(cmd==='commit check'){
    assert.ok(await page.locator('#commitState').isVisible());
    assert.equal(await page.evaluate(()=>cur.net.devs.EX1.ifs['ge-0/0/0'].accessVlan),1);
    await page.reload();await page.locator('#sandbox').click();await page.locator('#tab-EX1').click();
    assert.ok(await page.locator('#commitState').isVisible());
   }
  }
  assert.match(await page.locator('#trace').textContent(),/Reply received/);
  assert.match(await page.locator('#trace').textContent(),/PC1 → CAT1 → EX1 → PC2/);
  await page.locator('#tab-EX1').click();assert.ok(await page.locator('#commitState').isHidden());
  await page.locator('#reference').click();assert.match(await page.locator('#dialog').textContent(),/commit/);await page.locator('#dialog').evaluate(d=>d.close());
  await page.locator('.hw-card summary').click();assert.equal(await page.locator('.hw-port.live').count(),2);
  const downloading=page.waitForEvent('download');await page.locator('#sbExport').click();
  const backup=fs.readFileSync(await (await downloading).path());
  await page.locator('#sbImport').setInputFiles({name:'hardware.json',mimeType:'application/json',buffer:backup});
  await page.waitForFunction(()=>cur.net.devs.EX1.ifs['ge-0/0/0'].accessVlan===10);
  if(process.env.LAB4NET_SCREENSHOTS){
   fs.mkdirSync(process.env.LAB4NET_SCREENSHOTS,{recursive:true});
   await page.locator('#tab-EX1').click();await page.locator('.hw-card summary').click();
   await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'hardware-desktop.png'),fullPage:true});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
  await page.locator('#missionView').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(process.env.LAB4NET_SCREENSHOTS)await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'hardware-phone.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS hardware browser: model picker, port panel/cable selection, complete mixed-vendor guide, pending commit/reload, packet path, Junos reference, hardware export/import, phone and reduced motion; no page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
