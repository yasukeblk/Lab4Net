const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:process.env.LAB4NET_BROWSER_CHANNEL||undefined});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
 async function command(line){await page.locator('#tin').fill(line);await page.locator('#tin').press('Enter');}
 await command('show ip banana');
 const rows=await page.locator('#tout span').allTextContents();assert.equal(rows.at(-1),"% Invalid input detected at '^' marker.");const echo=rows.at(-3),caret=rows.at(-2);assert.equal(caret.indexOf('^'),echo.indexOf('banana'));
 assert.ok(await page.locator('#tout span').nth(rows.length-2).evaluate(el=>el.classList.contains('bad')));
 // Compare actual character positions, including the preserved spaces, in the rendered terminal.
 const alignment=await page.locator('#tout').evaluate(el=>{const spans=[...el.children],a=spans.at(-3).firstChild,b=spans.at(-2).firstChild;function box(node,start){const r=document.createRange();r.setStart(node,start);r.setEnd(node,start+1);return r.getBoundingClientRect().x;}return Math.abs(box(a,a.textContent.indexOf('banana'))-box(b,b.textContent.indexOf('^')));});assert.ok(alignment<1,'caret must render below rejected token');
 await command('enable');await command('configure terminal');await command('do show ip banana');const nested=await page.locator('#tout span').allTextContents();assert.equal(nested.at(-2).indexOf('^'),nested.at(-3).indexOf('banana'));
 await page.reload();const replay=await page.locator('#tout span').allTextContents();assert.equal(replay.at(-2).indexOf('^'),replay.at(-3).indexOf('banana'),'saved command replay retains caret');assert.deepEqual(errors,[]);
 console.log('PASS terminal invalid input: actual rendered caret alignment, error styling, nested do and saved replay.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
