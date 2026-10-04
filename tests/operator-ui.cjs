const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 let bodies=[],pending=false;
 const app=fs.readFileSync(path.join(__dirname,'../index.html'));
 const server=http.createServer((req,res)=>{
  res.setHeader('Content-Type',req.url.startsWith('/api/')?'application/json':'text/html');
  if(req.url==='/api/assistant/status')return res.end(JSON.stringify({configured:true,model:'test-model',tokenRequired:false}));
  if(req.url==='/api/assistant/chat'){
   let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{bodies.push(JSON.parse(raw));if(pending)return;
    res.end(JSON.stringify({answer:'Inspect the management SVI. `<img src=x onerror=alert(1)>`\nA switch needs an active IP interface for its own ping.',commands:[{device:'SW1',line:'enable',why:'Enter privileged mode to inspect configuration.'},{device:'SW1',line:'show ip interface brief',why:'Check management addressing and state.'}],actions:[{id:'newSandbox',label:'Open starter menu'},{id:'javascript:bad',label:'INVALID ACTION'}]}));});return;
  }res.end(app);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:process.env.LAB4NET_BROWSER_CHANNEL||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('#sandbox').click();await page.locator('#sbNew').click();await page.locator('#sbStarter').click();
  await page.locator('#tab-SW1').click();await page.locator('#assistantToggle').click();
  await page.waitForFunction(()=>operator.status?.configured);
  await page.locator('#opInspectForm summary').click();await page.locator('#opSource').selectOption('SW1');await page.locator('#opTarget').fill('192.168.1.20');
  const original=await page.evaluate(()=>JSON.stringify(cur.net));await page.locator('#opInspect').click();
  assert.match(await page.locator('#opEvidence').textContent(),/No usable route/);assert.equal(await page.evaluate(()=>JSON.stringify(cur.net)),original);
  await page.locator('#opQuestion').fill('Why can SW1 not connect to PC2?');await page.locator('#opSend').click();
  await page.waitForFunction(()=>operator.messages.some(m=>m.commands?.length));
  assert.equal(bodies[0].snapshot.diagnostic.source,'SW1');assert.equal(bodies[0].snapshot.diagnostic.ok,false);
  assert.ok(JSON.stringify(bodies[0]).length<400000);assert.equal(bodies[0].snapshot.devices.length,3);
  assert.equal(await page.locator('#opMessages img').count(),0);assert.equal(await page.locator('#opMessages button').filter({hasText:'INVALID ACTION'}).count(),0);
  await page.locator('[data-op-command="2:0"]').click();assert.equal(await page.locator('#tin').inputValue(),'enable');
  assert.equal(await page.evaluate(()=>cur.sess.SW1.mode),'user','suggestion never auto-executes');
  await page.locator('#tin').press('Enter');await page.locator('[data-op-command="2:1"]').click();assert.equal(await page.locator('#tin').inputValue(),'show ip interface brief');
  await page.locator('[data-op-action="2:0"]').click();assert.ok(await page.locator('#sbBlank').isVisible());assert.equal(await page.evaluate(()=>Object.keys(cur.net.devs).length),3,'new project opens menu without discarding');await page.locator('#closeDialog').click();
  await page.locator('#opSource').selectOption('PC1');await page.locator('#opInspect').click();assert.match(await page.locator('#opEvidence').textContent(),/Reachable/);
  await page.locator('#opQuestion').fill('Explain the successful path.');await page.locator('#opSend').click();await page.waitForFunction(()=>operator.history.length===4);
  assert.equal(bodies[1].history.length,2);assert.equal(bodies[1].snapshot.diagnostic.ok,true);
  await page.locator('#opSettings').click();assert.ok(await page.locator('#opToken').isVisible());assert.match(await page.locator('#dialogBody').textContent(),/\/etc\/lab4net\/assistant.env/);await page.locator('#closeDialog').click();
  await page.locator('#opClear').click();await page.locator('#opQuestion').fill('Why can the selected switch not reach PC2?');await page.locator('#opSend').click();await page.waitForFunction(()=>operator.history.length===2);
  assert.equal(bodies[2].snapshot.diagnostic.source,'SW1');assert.equal(bodies[2].snapshot.diagnostic.target,'192.168.1.20','named destination auto-inspected');
  for(const command of ['configure terminal','hostname UPDATED']){await page.locator('#tin').fill(command);await page.locator('#tin').press('Enter');}
  await page.locator('#tin').fill('preserve-input');await page.locator('[data-op-command="1:0"]').click();assert.equal(await page.locator('#tin').inputValue(),'preserve-input');
  assert.match(await page.locator('#notice').textContent(),/Workspace changed/);
  if(process.env.LAB4NET_SCREENSHOTS){fs.mkdirSync(process.env.LAB4NET_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'operator-desktop.png'),fullPage:true});}
  pending=true;await page.locator('#opQuestion').fill('Wait test');await page.locator('#opSend').click();await page.locator('#opStop').click();await page.waitForFunction(()=>!operator.busy);assert.match(await page.locator('#opMessages').textContent(),/Request stopped/);
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('#opSend').isVisible());
  if(process.env.LAB4NET_SCREENSHOTS)await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'operator-phone.png'),fullPage:true});
  await page.locator('#opClose').click();assert.equal(await page.locator('#assistantToggle').getAttribute('aria-expanded'),'false');
  await page.goto(require('node:url').pathToFileURL(path.join(__dirname,'../index.html')).href);await page.locator('#assistantToggle').click();
  assert.match(await page.locator('#opConnection').textContent(),/LOCAL FILE/);await page.locator('#opQuestion').fill('Open a new sandbox');await page.locator('#opSend').click();
  assert.match(await page.locator('#opMessages').textContent(),/AI chat needs the container connection/);
  assert.deepEqual(errors,[]);console.log('PASS Operator browser (mock model): live context/read-only inspection, conversation history, safe rendering, navigation without discard, command insertion without execution, settings, cancellation, phone and reduced motion.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
