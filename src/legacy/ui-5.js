(function(){
  const KEY='lab4net-campaign-v1';let C={stage:null};try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');if(p&&typeof p==='object'&&!Array.isArray(p))C=Object.assign(C,p);}catch(e){}if(C.stage!==null&&typeof C.stage!=='string')C.stage=null;
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(C));}catch(e){}};
  const sfx=n=>{const f=window.l4nFun&&window.l4nFun.sfx;if(f&&f[n])try{f[n]();}catch(e){}};
  const unlock=id=>{if(window.l4nFun&&window.l4nFun.unlock)window.l4nFun.unlock(id);};
  const missions=ch=>LABS.filter(l=>l.group===ch.group&&!l.exam);
  const ranks=()=>{try{return JSON.parse(localStorage.getItem('lab4net-fun-v1')||'{}').ranks||{};}catch(e){return {};}};
  const bossDone=ch=>{if(!ch.boss)return true;if(ch.boss.mode==='incident')return !!progress[ch.boss.title];
    const h=(window.l4nExam&&window.l4nExam.history()||[]).find(x=>x.cleared&&x.tag==='campaign:'+ch.id);return !!h;};
  const stateOf=k=>{const ch=CAMPAIGN[k],ms=missions(ch),done=ms.filter(l=>progress[l.title]).length,need=ch.need||ms.length,missionsDone=done>=need,boss=bossDone(ch);
    const prev=k===0?true:stateOf(k-1).missionsDone;return {ch,ms,done,need,missionsDone,boss,unlocked:prev,clear:missionsDone&&boss};};
  const all=()=>CAMPAIGN.map((_,k)=>stateOf(k));
  window.campaignStats=()=>({cleared:all().filter(s=>s.clear).length,total:CAMPAIGN.length});
  let known=null;
  function checkCampaign(quiet){const st=all(),n=st.filter(s=>s.clear).length;if(n>=1)unlock('chapter');if(n===CAMPAIGN.length)unlock('campaign');
    if(known!==null&&n>known&&!quiet){const s=st.filter(s=>s.clear).pop();notify('Stage '+(CAMPAIGN.indexOf(s.ch)+1)+' cleared: '+s.ch.title+'.');sfx('clear');}known=n;if(window.l4nFun&&window.l4nFun.check)window.l4nFun.check();}
  function fightBoss(ch){if(!ch.boss)return;if(ch.boss.mode==='incident'){const i=LABS.findIndex(l=>l.title===ch.boss.title);if(i>=0)openLab(i);return;}
    const pool=ch.boss.mode==='boss'?null:missions(ch).map(l=>l.title);
    if(!(window.l4nExam&&window.l4nExam.start(ch.boss.mode,ch.boss.minutes,'campaign-'+ch.id+'-'+Date.now(),pool,'campaign:'+ch.id)))notify('Could not start the boss right now.');}
  function renderCampaign(){const st=all();let k=CAMPAIGN.findIndex(c=>c.id===C.stage);if(k<0||!st[k].unlocked)k=Math.max(0,st.findIndex(s=>!s.clear&&s.unlocked));if(k<0)k=CAMPAIGN.length-1;C.stage=CAMPAIGN[k].id;save();
    const cleared=st.filter(s=>s.clear).length,R=ranks();
    $('brief').innerHTML=`<div class="eyebrow">Campaign · Harbor Street Logistics</div><h2>Stage select.</h2><p>Eight stages, one per topic, in the order a new engineer meets them. Finish a stage's missions to open the next; beat its boss to clear it. The missions are the labs you know, graded exactly as always.</p><p><b>${cleared} / ${CAMPAIGN.length}</b> stages cleared.</p>
      <div class="stage-map">${st.map((s,i)=>`<button class="stage${s.clear?' clear':s.unlocked?' open':' locked'}${i===k?' current':''}" data-stage="${i}"${s.unlocked?'':' disabled'}><span class="stage-no">Stage ${i+1}</span><b>${esc(s.ch.title)}</b><div class="progressbar"><span style="width:${Math.min(100,s.done/s.need*100)}%"></span></div><small>${s.clear?'CLEAR':s.unlocked?s.done+' / '+s.need+' missions'+(s.ch.boss?(s.boss?' · boss down':' · boss waiting'):''):'LOCKED'}</small></button>`).join('')}</div>`;
    $('brief').querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{C.stage=CAMPAIGN[+b.dataset.stage].id;save();renderCampaign();});
    const s=st[k],ch=s.ch,next=s.ms.find(l=>!progress[l.title]);
    const bossHtml=!ch.boss?'':`<h3>Boss</h3><p>${ch.boss.mode==='incident'?`<b>${esc(ch.boss.title.replace(/^Incident \d+: /,'').replace(/^./,c=>c.toUpperCase()))}</b> · a troubleshooting incident; clues, guide and walkthrough are allowed but cost rank.`:ch.boss.mode==='boss'?'<b>Boss fight</b> · two or three hidden faults on a finished lab (three when the labs of the stage allow it), 30 minutes, no help.':`<b>Sabotage</b> · one of this stage's labs, finished and then broken; ${ch.boss.minutes} minutes, no help.`}</p>
      ${s.boss?'<p class="good"><b>Boss down.</b></p>':s.missionsDone?`<button class="btn primary" id="cFight">${ch.boss.mode==='incident'?'Open the incident →':'Fight the boss →'}</button>`:'<p class="study-note">Finish the missions first.</p>'}`;
    $('practice').innerHTML=`<div class="eyebrow">Stage ${k+1} <span>${esc(ch.group)}</span></div><h2>${esc(ch.title)}</h2><p>${esc(ch.story)}</p>
      ${s.clear?`<div class="lesson-tip"><b>Stage clear.</b><br>${esc(ch.outro)}</div>`:''}
      <h3>Missions <span>${s.done}/${s.need}${ch.need?' of '+s.ms.length:''}</span></h3><ol class="missions">${s.ms.map(l=>{const i=LABS.indexOf(l),rk=R[l.title];return `<li class="${progress[l.title]?'ok':''}"><button class="small-btn" data-lab="${i}">${progress[l.title]?'✓ ':''}${esc(l.kind==='incident'?l.title.replace(/^Incident \d+: /,''):l.title)}</button>${rk?`<i class="rankbadge r${rk}">${rk}</i>`:''}</li>`;}).join('')}</ol>
      ${next&&!s.missionsDone?`<button class="btn primary" id="cNext">Next mission: ${esc(next.kind==='incident'?next.title.replace(/^Incident \d+: /,''):next.title)} →</button>`:''}
      ${bossHtml}
      ${s.clear&&k<CAMPAIGN.length-1?`<div class="actions"><button class="btn" id="cNextStage">Stage ${k+2} →</button></div>`:''}`;
    $('practice').querySelectorAll('[data-lab]').forEach(b=>b.onclick=()=>openLab(+b.dataset.lab));
    if($('cNext'))$('cNext').onclick=()=>openLab(LABS.indexOf(next));
    if($('cFight'))$('cFight').onclick=()=>fightBoss(ch);
    if($('cNextStage'))$('cNextStage').onclick=()=>{C.stage=CAMPAIGN[k+1].id;save();renderCampaign();};
    $('workspaceTitle').textContent='Campaign';}
  const rb0=renderBrief;renderBrief=function(){if(cur&&cur.view==='campaign')return renderCampaign();return rb0();};
  const rl0=renderLabs;renderLabs=function(){rl0();const g=[...$('labs').querySelectorAll('optgroup')].find(o=>o.label==='Practice');
    if(g&&!g.querySelector('option[value="campaign"]')){const o=document.createElement('option');o.value='campaign';o.textContent='Campaign';g.prepend(o);}
    if(cur&&cur.view==='campaign'){$('labs').value='campaign';$('workspaceTitle').textContent='Campaign';}};
  $('labs').addEventListener('change',e=>{if(e.target.value==='campaign'){e.stopImmediatePropagation();openPractice('campaign');}},true);
  const lib0=library;library=function(){lib0();const pb=$('dialogBody').querySelector('.practice-buttons');if(pb&&!$('campaignBtn')){pb.insertAdjacentHTML('afterbegin','<button class="btn primary" id="campaignBtn">Campaign →</button>');$('campaignBtn').onclick=()=>{$('dialog').close();openPractice('campaign');};}};
  $('library').onclick=library;
  const cel0=celebrate;celebrate=function(){cel0();setTimeout(()=>checkCampaign(false),1600);};
  window.openCampaign=()=>openPractice('campaign');
  $('campaignTop').onclick=()=>openPractice('campaign');
  {const ra=renderAll;renderAll=function(){ra();const b=$('campaignTop');if(b){if(cur&&cur.view==='campaign')b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}};}
  checkCampaign(true);
})();
// ---------- title screen and site settings ----------
// SITE: the public site's donation link and GoatCounter code. Both stay off until set.
// The counter only runs on the public site (SITE.host), never on a self-hosted copy or a local file,
// and not when the browser sends Do Not Track. It sends one cookieless page view per visit.
const SITE={host:'yasukeblk.github.io',donate:'https://buymeacoffee.com/yasukeblk',counter:'lab4net'};
(function(){const w=$('welcome');if(!w)return;
  const n={labs:LABS.length,build:LABS.filter(l=>l.kind==='build'&&!l.capstone).length,inc:LABS.filter(l=>l.kind==='incident').length,cap:LABS.filter(l=>l.capstone).length,lessons:typeof LESSONS==='object'?Object.keys(LESSONS).length:56};
  w.querySelectorAll('[data-w]').forEach(s=>{if(n[s.dataset.w]!=null)s.textContent=n[s.dataset.w];});
  if(SITE.donate){const d=$('wDonate');d.href=SITE.donate;d.hidden=false;}
  if(SITE.counter&&location.hostname===SITE.host)$('wCount').hidden=false;
  const start=()=>{try{localStorage.setItem('lab4net-welcomed','1');}catch(e){}w.hidden=true;document.documentElement.classList.remove('welcome-on');count('start',true);$('tin').focus({preventScroll:true});};
  $('wStart').onclick=start;
  w.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();start();}});
  if(!w.hidden)setTimeout(()=>$('wStart').focus({preventScroll:true}),0);
  window.showWelcome=()=>{w.hidden=false;document.documentElement.classList.add('welcome-on');w.scrollTop=0;$('wStart').focus({preventScroll:true});};
  function count(path,event){if(!SITE.counter||location.hostname!==SITE.host||navigator.doNotTrack==='1'||window.doNotTrack==='1')return;
    try{const u='https://'+SITE.counter+'.goatcounter.com/count?p='+encodeURIComponent(path)+(event?'&e=true':'&t='+encodeURIComponent(document.title)+(document.referrer?'&r='+encodeURIComponent(document.referrer):''))+'&rnd='+Math.random().toString(36).slice(2);
      const i=new Image();i.src=u;}catch(e){}}
  count('/',false);})();
// Deep links from the lesson pages (lessons/*.html): ?lab=<slug> opens that lab, ?lesson=<slug> opens that lesson.
// Slugs match tools/build-site.cjs. Saved work is kept (the lab is not reset), and the parameter is removed
// from the address bar so a later reload returns to wherever the learner has moved on to.
(function(){const q=new URLSearchParams(location.search),lab=q.get('lab'),les=q.get('lesson');if(!lab&&!les)return;
  const slug=s=>String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
  if(lab){const i=LABS.findIndex(l=>slug(l.title)===slug(lab));if(i>=0)openLab(i);else notify('That lab link is out of date, so you are on your last lab instead.');return;}
  const k=typeof LESSONS==='object'&&Object.keys(LESSONS).find(k=>slug(k)===slug(les));if(k&&window.openLesson)window.openLesson(k);})();
