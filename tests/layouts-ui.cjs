const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:process.env.LAB4NET_BROWSER_CHANNEL||undefined});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
 const rects=()=>page.evaluate(()=>Object.fromEntries(['brief','checkWin','mapPanel','console','guideWin'].filter(id=>document.getElementById(id).getClientRects().length).map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{x:r.x,y:r.y,w:r.width,h:r.height}];})));
 async function tiled(){const p=await rects(),v=Object.entries(p),size=page.viewportSize();for(const [id,r]of v){assert.ok(r.w>100&&r.h>90,`${id} readable size`);assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=size.width+1&&r.y+r.h<=size.height+1,`${id} within screen`);}for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++){const [a,p]=v[i],[b,q]=v[j];assert.ok(Math.min(p.x+p.w,q.x+q.w)-Math.max(p.x,q.x)<1||Math.min(p.y+p.h,q.y+q.h)-Math.max(p.y,q.y)<1,`${a}/${b} do not overlap`);}return p;}
 async function preset(id){await page.locator('#layouts').click();await page.locator(`[data-layout="${id}"]`).click();return tiled();}
 async function move(id,x,y,alt=false){const b=await page.locator('#'+id).boundingBox();if(alt)await page.keyboard.down('Alt');await page.mouse.move(b.x+80,b.y+20);await page.mouse.down();await page.mouse.move(x,y,{steps:8});}
 async function drop(alt=false){await page.mouse.up();if(alt)await page.keyboard.up('Alt');}
 const same=(a,b)=>{for(const id of Object.keys(a))for(const k of ['x','y','w','h'])assert.ok(Math.abs(a[id][k]-b[id][k])<2,`${id}.${k} restored`);};
 for(const presetId of ['balanced','console','map','reading','guided'])await preset(presetId);
 assert.ok(await page.locator('#guideWin').isVisible());await page.locator('#guideClose').click();await preset('balanced');await page.locator('#guidePopBtn').click();await tiled();await page.locator('#guideClose').click();
 let before=await preset('balanced');
 // Swap moves both panels, including their dimensions, with a whole-layout preview.
 const target=before.console;await move('mapPanel',target.x+target.w/2,target.y+target.h/2);
 assert.equal(await page.locator('.layout-preview-box').count(),4);assert.match(await page.locator('#layoutDragTip').textContent(),/Swap/);await drop();
 let after=await tiled();same({mapPanel:before.console,console:before.mapPanel},{mapPanel:after.mapPanel,console:after.console});
 await page.locator('#undoLayout').click();same(before,await tiled());
 // Edge docking rearranges all neighbors, rather than covering them.
 for(const side of ['left','right','top','bottom']){before=await preset('balanced');const m=await page.locator('main').boundingBox(),x=side==='left'?m.x+4:side==='right'?m.x+m.width-4:m.x+m.width/2,y=side==='top'?m.y+4:side==='bottom'?m.y+m.height-4:m.y+m.height/2;
  await move('console',x,y);assert.match(await page.locator('#layoutDragTip').textContent(),/Dock/);await drop();await tiled();await page.locator('#undoLayout').click();same(before,await tiled());}
 // Resize a shared horizontal edge; lower console starts later and becomes shorter.
 before=await preset('balanced');let r=before.mapPanel;await page.mouse.move(r.x+r.w/2,r.y+r.h-2);await page.mouse.down();await page.mouse.move(r.x+r.w/2,r.y+r.h+38,{steps:6});await page.mouse.up();
 after=await tiled();assert.ok(after.mapPanel.h>before.mapPanel.h+25);assert.ok(after.console.y>before.console.y+25);assert.ok(after.console.h<before.console.h-25);
 await page.locator('#undoLayout').click();same(before,await tiled());
 // Vertical divider moves both left panels and both right panels together.
 r=before.mapPanel;await page.mouse.move(r.x+2,r.y+r.h/2);await page.mouse.down();await page.mouse.move(r.x+42,r.y+r.h/2,{steps:6});await page.mouse.up();after=await tiled();assert.ok(after.brief.w>before.brief.w+25);assert.ok(after.checkWin.w>before.checkWin.w+25);assert.ok(after.console.x>before.console.x+25);
 await page.locator('#undoLayout').click();same(before,await tiled());
 // Escape cancels a live drag without saving it or adding an undo step.
 const storage=await page.evaluate(()=>localStorage.getItem('lab4net-layout-v2'));await move('console',before.mapPanel.x+before.mapPanel.w/2,before.mapPanel.y+before.mapPanel.h/2);await page.keyboard.press('Escape');await drop();same(before,await tiled());assert.equal(await page.evaluate(()=>localStorage.getItem('lab4net-layout-v2')),storage);
 await move('mapPanel',before.mapPanel.x+110,before.mapPanel.y+65,true);assert.equal(await page.locator('.layout-preview-box').count(),0);await drop(true);await page.locator('#undoLayout').click();same(before,await tiled());
 // Named layout restores all geometry and survives reload, including safe rendering of names.
 before=await preset('reading');await page.locator('#layouts').click();await page.locator('#layoutName').fill('My desk <test>');await page.locator('#layoutSaveForm button').click();assert.match(await page.locator('#savedLayouts').textContent(),/My desk <test>/);await page.locator('#closeDialog').click();await preset('map');await page.reload();await page.locator('#layouts').click();await page.locator('[data-restore-layout]').click();same(before,await tiled());
 // Lock disables mouse move and resizing; presets and named layouts are still usable.
 await page.locator('#layouts').click();await page.locator('#layoutLock').check();await page.locator('#closeDialog').click();r=await page.locator('#mapPanel').boundingBox();await move('mapPanel',r.x+130,r.y+70);await drop();same(before,await tiled());await page.reload();await page.locator('#layouts').click();assert.ok(await page.locator('#layoutLock').isChecked());await page.locator('#layoutLock').uncheck();await page.locator('#layoutSmart').uncheck();await page.locator('#closeDialog').click();
 before=await rects();r=before.mapPanel;await page.mouse.move(r.x+r.w/2,r.y+r.h-2);await page.mouse.down();await page.mouse.move(r.x+r.w/2,r.y+r.h+28);await page.mouse.up();after=await rects();assert.ok(Math.abs(after.console.h-before.console.h)<2);await page.locator('#undoLayout').click();
 await page.locator('#layouts').click();await page.locator('#layoutSmart').check();await page.locator('[data-remove-layout]').click();assert.equal(await page.locator('[data-restore-layout]').count(),0);await page.locator('#closeDialog').click();
 for(const [w,h] of [[1920,1080],[1366,768],[1024,768]]){await page.setViewportSize({width:w,height:h});for(const id of ['balanced','console','map','reading','guided'])await preset(id);await page.locator('#guideClose').click();}
 await page.setViewportSize({width:1440,height:1000});await preset('guided');if(process.env.LAB4NET_SCREENSHOTS){fs.mkdirSync(process.env.LAB4NET_SCREENSHOTS,{recursive:true});await page.waitForTimeout(300);await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'guided-layout.png')});await page.locator('#layouts').click();await page.waitForTimeout(300);await page.screenshot({path:path.join(process.env.LAB4NET_SCREENSHOTS,'layout-picker.png')});await page.locator('#closeDialog').click();}
 await page.locator('#sandbox').click();if(await page.locator('#dialog').isVisible())await page.locator('#closeDialog').click();await preset('console');await page.locator('#labs').selectOption('quiz');await page.locator('#layouts').click();assert.equal(await page.locator('.layout-card').count(),0);await page.locator('#closeDialog').click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('#layouts').isVisible(),false);assert.deepEqual(errors,[]);
 console.log('PASS layouts: five presets at three resolutions, non-overlapping guide, swap, four edge docks/reflow, two shared dividers, undo, Escape, Alt, named save/reload/delete, lock/settings, free resize, sandbox/practice and phone/reduced motion.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
