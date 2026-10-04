// Browser regression for saves written by the other sandbox implementation on main.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:process.env.LAB4NET_BROWSER_CHANNEL||undefined});
 try{
  const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  const old={devs:[{type:'switch',name:'SW1',x:800,y:330}],links:[],notes:[],view:null,ch:null,chDone:false};
  await page.evaluate(old=>{
   localStorage.clear();localStorage.setItem('lab4net-sandbox-v1',JSON.stringify(old));
   localStorage.setItem('ccna-bench-v2',JSON.stringify({'Basic device setup':true}));
   localStorage.setItem('lab4net-workspace-v1',JSON.stringify({lastLab:0,drafts:{Sandbox:{journal:[{device:'SW1',line:'enable'}],tasks:[]}}}));
  },old);
  await page.reload();await page.locator('#sandbox').click();
  assert.equal(await page.evaluate(()=>!!cur.sandbox),true);
  assert.equal(await page.locator('#tin').isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('lab4net-sandbox-v1'))),old);
  assert.equal(await page.evaluate(()=>progress['Basic device setup']),true);
  assert.ok(await page.locator('#sbRecover').isVisible());
  const downloadPromise=page.waitForEvent('download');await page.locator('#sbRecover').click();
  const saved=JSON.parse(fs.readFileSync(await (await downloadPromise).path(),'utf8'));
  assert.deepEqual(saved.def,old);assert.deepEqual(saved.journal,[{device:'SW1',line:'enable'}]);
  await page.locator('[data-add=router]').click();await page.reload();
  assert.equal(await page.locator('#tabs button').count(),1);
  assert.ok(await page.locator('#sbRecover').isVisible());
  // Earlier Matrix projects migrate intact from the old key into the isolated key.
  const native={format:'lab4net-sandbox',version:1,events:[{op:'add',type:'pc',name:'PC1',x:100,y:100}]};
  await page.evaluate(native=>{localStorage.clear();localStorage.setItem('lab4net-sandbox-v1',JSON.stringify(native));},native);
  await page.reload();await page.locator('#sandbox').click();
  assert.equal(await page.locator('#tabs button').count(),1);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('lab4net-sandbox-events-v1'))),native);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('lab4net-sandbox-v1'))),native);
  // A damaged current save is archived before a new project is saved over it.
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('lab4net-sandbox-events-v1','{broken');});
  await page.reload();await page.locator('#sandbox').click();
  assert.equal(await page.evaluate(()=>!!cur.sandbox),true);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lab4net-sandbox-recovery-v1')).raw),'{broken');
  assert.ok(await page.locator('#sbRecover').isVisible());
  // Explicit unsupported project imports still fail without replacing current work.
  await page.locator('[data-add=switch]').click();
  await page.locator('#sbImport').setInputFiles({name:'unsupported.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
  await page.waitForFunction(()=>document.getElementById('sbStatus').textContent.startsWith('Import failed'));
  assert.equal(await page.locator('#tabs button').count(),1);
  assert.deepEqual(errors,[]);
  console.log('PASS sandbox storage: main-format save opens safely and remains recoverable, grades retained, previous Matrix projects migrate intact, corrupt saves archived, invalid imports remain non-destructive; no page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
