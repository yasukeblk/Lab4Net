(function(){const KEY='lab4net-lessons-v1';let S={};try{S=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}if(window.l4nFun&&l4nFun.check)l4nFun.check();};
  const rec=t=>S[t]||(S[t]={read:false,q:{}});
  const isRead=t=>!!(S[t]&&S[t].read);
  let on=false,step=-1,picked={},topicKey=null;
  const lessonOf=l=>l&&!l.capstone?(LESSONS[l.kind==='incident'?l.baseTitle:l.title]||null):null;
  const keyOf=l=>l.kind==='incident'?l.baseTitle:l.title;
  const labOf=k=>LABS.find(l=>l.title===k&&l.kind==='build');
  const ccnaOf=k=>{const L=LESSONS[k];return L.topic?L.ccna:((labOf(k)||{}).ccna||[]);};
  window.lessonFor=lessonOf;
  window.lessonStats=()=>{const keys=Object.keys(LESSONS);let correct=0;for(const k of keys)if(S[k])correct+=Object.values(S[k].q).filter(v=>v===true).length;return {total:keys.length,read:keys.filter(isRead).length,correct};};
  // A stable shuffle per question, so the right answer is not always in the same place.
  const order=(q,n)=>{let h=2166136261;for(const c of q)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;const o=[...Array(n).keys()];for(let i=n-1;i>0;i--){h=Math.imul(h^(h>>>15),2246822507)>>>0;const j=h%(i+1);[o[i],o[j]]=[o[j],o[i]];}return o;};
  function card(l,L){const r=rec(keyOf(l)),q=Object.values(r.q).filter(Boolean).length;
    return `<div class="lesson-card${r.read?' read':''}"><div><span class="eyebrow">${l.kind==='incident'?'Lesson for this topic':'Learn it first'}</span><b>${esc(L.name)}</b><small>${L.mins} min · ${r.read?'✓ read':'not read yet'}${Object.keys(r.q).length?` · ${q}/${L.quiz.length} correct`:''}</small></div><button class="btn" id="openLesson">Open lesson</button></div>`;}
  function storyBox(L){if(step<0)return `<div class="story"><p>Step through it on the network map. Each step shows where the traffic goes and why.</p><button class="btn primary" id="storyNext">▶ Start</button></div>`;
    const s=L.story[step];return `<div class="story"><div class="story-head"><b>${step+1} / ${L.story.length} · ${esc(s.t)}</b></div><p>${s.x}</p><div class="actions"><button class="btn" id="storyPrev"${step===0?' disabled':''}>← Back</button><button class="btn" id="storyAgain">↻ Replay</button><button class="btn primary" id="storyNext">${step===L.story.length-1?'From the start':'Next →'}</button></div></div>`;}
  function quizHtml(L){return L.quiz.map(([q,opts,ok,why],i)=>{const a=picked[i];return `<div class="lq"><p><b>${i+1}.</b> ${q}</p><div class="quiz-options">${order(q,opts.length).map((j,k)=>`<button class="quiz-option${a!==undefined?(j===ok?' correct':j===a?' incorrect':''):''}" data-lq="${i}" data-a="${j}"${a!==undefined?' disabled':''}><span>${String.fromCharCode(65+k)}</span>${opts[j]}</button>`).join('')}</div>${a!==undefined?`<div class="lesson-tip"><b>${a===ok?'Correct.':'Not quite.'}</b> ${why}</div>`:''}</div>`;}).join('');}
  function lessonHtml(k,L,eyebrow,tagsHtml,navLabel){const r=rec(k);
    return `<div class="eyebrow">${eyebrow} <span>${L.mins} min</span></div><h2>${esc(L.name)}</h2>${tagsHtml}
      <div class="lesson-nav"><button class="btn primary" data-close-lesson>${navLabel} →</button>${r.read?'<small>✓ You have read this lesson.</small>':''}</div>
      ${L.sections.map(([h,b])=>`<h3>${esc(h)}</h3>${b}`).join('')}
      ${L.story?`<h3>See it happen</h3>${storyBox(L)}`:''}
      <h3>Key terms</h3><dl class="terms">${L.terms.map(([t,d])=>`<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>
      <h3>On the exam</h3><ul class="lesson-list">${L.exam.map(x=>`<li>${x}</li>`).join('')}</ul>
      <h3>Common mistakes</h3><ul class="lesson-list">${L.mistakes.map(x=>`<li>${x}</li>`).join('')}</ul>
      <h3>Quick check</h3>${quizHtml(L)}
      <div class="lesson-nav"><button class="btn primary" data-close-lesson>${navLabel} →</button></div>`;}
  async function play(L){const s=L.story[step],tok=++fxToken,g=fxLayer();if(!g)return;g.innerHTML='';
    await fly(s.path,s.cls,tok);if(tok!==fxToken)return;burst(s.at,s.bad?'bad':s.good?'good':'warn',s.label);}
  const keep=(el,fn)=>{const sc=el.scrollTop;fn();el.scrollTop=sc;};
  function bindQuiz(root,k,L,rerender){root.querySelectorAll('[data-lq]').forEach(b=>b.onclick=()=>{const i=+b.dataset.lq,a=+b.dataset.a;picked[i]=a;rec(k).q[i]=a===L.quiz[i][2];save();keep(root,rerender);});}
  // lab lessons, in the mission window
  function bindLab(l,L){const k=keyOf(l),close=()=>{rec(k).read=true;save();on=false;step=-1;fxToken++;renderBrief();$('brief').scrollTop=0;};
    $('brief').querySelectorAll('[data-close-lesson]').forEach(b=>b.onclick=close);
    const go=n=>{step=n;keep($('brief'),renderBrief);play(L);};
    if($('storyNext'))$('storyNext').onclick=()=>go(step>=L.story.length-1?0:step+1);
    if($('storyPrev'))$('storyPrev').onclick=()=>go(Math.max(0,step-1));
    if($('storyAgain'))$('storyAgain').onclick=()=>go(step);
    bindQuiz($('brief'),k,L,renderBrief);}
  // the Lessons view: every lesson by exam domain in the mission window, a topic lesson in the practice window
  // A lesson belongs to the exam domain most of its objectives are in (the first one on a tie).
  const domainOf=k=>{const ds=ccnaOf(k).map(c=>String(c).split('.')[0]);if(!ds.length)return '1';return ds.reduce((a,d)=>ds.filter(x=>x===d).length>ds.filter(x=>x===a).length?d:a,ds[0]);};
  function renderLessons(){const keys=Object.keys(LESSONS),st=lessonStats(),topics=keys.filter(k=>LESSONS[k].topic);
    if(!topicKey||!LESSONS[topicKey])topicKey=topics.find(k=>!isRead(k))||topics[0];
    $('brief').innerHTML=`<div class="eyebrow">Practice · Lessons</div><h2>Learn the concepts.</h2><p>Every lab has a lesson that teaches the idea behind it, and topic lessons cover the exam objectives that have no lab: wireless, security, services and automation.</p><p><b>${st.read} / ${st.total}</b> lessons read · ${st.correct} quick-check answers correct.</p>
      ${CCNA_DOMAINS.map(([id,name])=>{const ks=keys.filter(k=>domainOf(k)===id);if(!ks.length)return '';
        return `<h3>${id}. ${esc(name)}</h3><div class="lesson-links">${ks.map(k=>{const L=LESSONS[k];return `<button class="small-btn${isRead(k)?' passed':''}${L.topic&&k===topicKey?' current':''}" data-lesson="${esc(k)}">${isRead(k)?'✓ ':''}${esc(L.name)}${L.topic?'':'<i class="ltag">Lab</i>'}</button>`;}).join('')}</div>`;}).join('')}
      <p class="study-note">A lesson tagged Lab comes with a lab and opens in it. The others open alongside this list.</p>`;
    $('brief').querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>openLesson(b.dataset.lesson));
    const L=LESSONS[topicKey];if(!L){$('practice').innerHTML='';return;}
    const next=topics[(topics.indexOf(topicKey)+1)%topics.length];
    $('practice').innerHTML=lessonHtml(topicKey,L,'Lesson · '+esc((CCNA_DOMAINS.find(d=>d[0]===domainOf(topicKey))||['',''])[1]),ccnaTags({ccna:L.ccna}),next&&next!==topicKey?'Mark read, next lesson':'Mark as read');
    $('practice').querySelectorAll('[data-close-lesson]').forEach(b=>b.onclick=()=>{rec(topicKey).read=true;save();if(next)topicKey=next;picked={};renderLessons();$('practice').scrollTop=0;});
    bindQuiz($('practice'),topicKey,L,renderLessons);}
  window.openLesson=function(k){const L=LESSONS[k];if(!L)return;picked={};step=-1;
    if(L.topic){topicKey=k;if(cur.view!=='lessons')openPractice('lessons');else renderLessons();$('practice').scrollTop=0;return;}
    const i=LABS.indexOf(labOf(k));if(i<0)return;openLab(i);on=true;renderBrief();$('brief').scrollTop=0;};
  const rb=renderBrief;renderBrief=function(){if(cur&&cur.view==='lessons')return renderLessons();rb();if(!cur||cur.view!=='lab'||cur.sandbox||!cur.lab)return;const l=cur.lab,L=lessonOf(l);if(!L)return;
    if(on){const g=l.kind==='incident'?(labOf(l.baseTitle)||l).group:l.group;$('brief').innerHTML=lessonHtml(keyOf(l),L,'Lesson · '+esc(g),ccnaTags(l),l.kind==='incident'?'Back to the incident':'Start the lab');bindLab(l,L);return;}
    const p=$('brief').querySelector('h2');if(p){const t=p.nextElementSibling&&p.nextElementSibling.classList.contains('ccna-tags')?p.nextElementSibling:p;t.insertAdjacentHTML('afterend',card(l,L));}
    if($('openLesson'))$('openLesson').onclick=()=>{on=true;step=-1;picked={};renderBrief();$('brief').scrollTop=0;};};
  const ol=openLab;openLab=function(idx,isFresh){const l=LABS[idx];on=!!(l&&l.kind==='build'&&!l.capstone&&LESSONS[l.title]&&!isRead(l.title));step=-1;picked={};ol(idx,isFresh);};
  const os=window.openSandbox;if(os)window.openSandbox=function(){on=false;os();};
  // the lab menu, its change handler and the workspace title learn the Lessons view
  const rl=renderLabs;renderLabs=function(){rl();const g=[...$('labs').querySelectorAll('optgroup')].find(o=>o.label==='Practice');
    if(g&&!g.querySelector('option[value="lessons"]')){const o=document.createElement('option');o.value='lessons';o.textContent='Lessons';if(cur.view==='lessons')o.selected=true;g.prepend(o);}
    if(cur.view==='lessons'){$('labs').value='lessons';$('workspaceTitle').textContent='Lessons';}};
  $('labs').addEventListener('change',e=>{if(e.target.value==='lessons'){e.stopImmediatePropagation();openPractice('lessons');}},true);
  // Study map: each exam domain lists its topic lessons
  const sm=studyMap;window.studyMap=studyMap=function(){sm();const body=$('dialogBody');if(!body)return;
    body.querySelectorAll('.study-domain').forEach((sec,i)=>{const id=CCNA_DOMAINS[i]&&CCNA_DOMAINS[i][0],ks=Object.keys(LESSONS).filter(k=>LESSONS[k].topic&&domainOf(k)===id);if(!ks.length)return;
      sec.insertAdjacentHTML('beforeend',`<p class="study-lessons-head">Topic lessons</p><div class="study-links">${ks.map(k=>`<button class="small-btn${isRead(k)?' passed':''}" data-study-lesson="${esc(k)}">${isRead(k)?'✓ ':''}${esc(LESSONS[k].name)}</button>`).join('')}</div>`);});
    body.querySelectorAll('[data-study-lesson]').forEach(b=>b.onclick=()=>{$('dialog').close();openLesson(b.dataset.studyLesson);});};
  $('studyMap').onclick=studyMap;
  if(cur&&cur.view==='lab'&&cur.lab&&LESSONS[cur.lab.title]&&cur.lab.kind==='build'&&!isRead(cur.lab.title)){on=true;renderBrief();}
  renderLabs();
})();
// ---------- exam sim: a random lab, a clock, and no help ----------
// An exam is a temporary lab object ("Exam · <base lab>") appended to LABS while it runs: a random build lab, a
// random incident, or a finished lab with hidden faults (sabotage; the daily challenge is a sabotage seeded by the
// date, the same for everyone). No guide, no "why", no walkthrough, no clues, no command guide. When the clock
// runs out the network is graded as it stands. Ranks are scored on results, exactly as in any lab.
(function(){
  const KEY='lab4net-exam-v1';let X={current:null,history:[]};
  try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');if(p&&typeof p==='object'&&!Array.isArray(p))X=Object.assign(X,p);}catch(e){}
  // A damaged store (a backup edited by hand, an older format) is repaired rather than allowed to break the page.
  if(!Array.isArray(X.history))X.history=[];X.history=X.history.filter(h=>h&&typeof h==='object'&&typeof h.base==='string').map(h=>Object.assign({},h,{date:/^\d{4}-\d{2}-\d{2}$/.test(h.date)?h.date:'',rank:/^[SABCD]$/.test(h.rank)?h.rank:'',passed:Number.isInteger(h.passed)?h.passed:0,total:Number.isInteger(h.total)?h.total:0}));
  if(X.current&&(typeof X.current!=='object'||typeof X.current.seed!=='string'||typeof X.current.base!=='string'))X.current=null;
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(X));}catch(e){}};
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const sfx=n=>{const f=window.l4nFun&&window.l4nFun.sfx;if(f&&f[n])try{f[n]();}catch(e){}};
  const unlock=id=>{if(window.l4nFun&&window.l4nFun.unlock)window.l4nFun.unlock(id);};
  const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
  const buildLabs=()=>LABS.filter(l=>l.kind==='build'&&!l.capstone&&!l.exam),incidents=()=>LABS.filter(l=>l.kind==='incident');
  window.examStats=()=>({cleared:X.history.filter(h=>h.cleared).length,daily:X.history.filter(h=>h.mode==='daily'&&h.cleared).length});
  const MODES={sabotage:'A finished lab with hidden faults',lab:'Build it from the checklist',incident:'A broken network to repair',daily:'Daily challenge · two hidden faults',boss:'Boss fight · three hidden faults'};
  // The exam bar names the real number of faults (a campaign boss can only find two on some stages).
  const WORDS=['no','one','two','three','four'];
  const modeText=(m,n)=>!n||m==='lab'||m==='incident'?(MODES[m]||''):m==='boss'?'Boss fight · '+WORDS[n]+' hidden faults':m==='daily'?'Daily challenge · '+WORDS[n]+' hidden faults':'A finished lab with '+WORDS[n]+' hidden fault'+(n>1?'s':'');
  function makeExam(mode,minutes,seed,pool){const rnd=seedRng(seed);let base=null,faults=null;const inPool=l=>!pool||pool.includes(l.title);
    if(mode==='incident')base=rpick(rnd,incidents().filter(inPool));
    else if(mode==='lab')base=rpick(rnd,buildLabs().filter(inPool));
    else if(mode==='boss'){const order=shuffled(rnd,buildLabs().filter(inPool));
      for(const need of [3,2]){for(const b of order){const f=examFault(b,seed+'|'+b.title,3);if(f&&f.length>=need){base=b;faults=f;break;}}if(base)break;}}
    else for(const b of shuffled(rnd,buildLabs().filter(inPool))){const want=mode==='daily'?2:(rnd()<.3?2:1);const f=examFault(b,seed+'|'+b.title,want);if(f){base=b;faults=f;break;}}
    if(!base)return null;return {mode,seed,base:base.title,faults,minutes,deadline:null,started:null,state:'new',date:today()};}
  // The exam lab object, kept at the end of LABS while the exam exists.
  function labIndex(ex){const title='Exam · '+ex.base;let i=LABS.findIndex(l=>l.exam);
    if(i>=0&&LABS[i].examSeed===ex.seed&&LABS[i].title===title)return i;if(i>=0)LABS.splice(i,1);
    const base=LABS.find(l=>l.title===ex.base);if(!base)return -1;
    const l=ex.faults?examLab(base,ex.faults,title):Object.assign({},base,{title,group:'Exam',kind:'exam',exam:true,baseTitle:base.title,why:[],steps:[]});
    l.examSeed=ex.seed;l.examMode=ex.mode;l.examFaults=ex.faults?ex.faults.length:0;l.examMinutes=ex.minutes;LABS.push(l);return LABS.length-1;}
  const running=()=>X.current&&X.current.state==='running'&&cur&&cur.view==='lab'&&cur.lab&&cur.lab.exam&&cur.lab.examSeed===X.current.seed;
  // An exam counts as running from start until it is cleared, times out or is given up, whether or not its lab is open.
  const active=()=>!!(X.current&&X.current.state==='running');
  const failing=()=>cur.lab.checks.filter(([,f])=>{try{return !f(cur.net);}catch(e){return true;}}).length;
  // Exam labs are temporary: their titles never stay in lab progress, saved work or ranks once the exam is over.
  function purge(keep){for(const store of [progress,drafts])for(const t of Object.keys(store))if(t.startsWith('Exam · ')&&t!==keep)delete store[t];
    persist();}
  function start(ex){if(active()&&X.current.seed!==ex.seed){notify('An exam is already running. Resume it from Exam sim, or give it up first.');return;}
    purge(null);if(window.l4nFun&&window.l4nFun.forget)window.l4nFun.forget('Exam · '+ex.base);
    const i=labIndex(ex);if(i<0)return notify('Could not build that exam.');ex.started=Date.now();ex.deadline=ex.started+ex.minutes*60000;ex.state='running';X.current=ex;save();
    openLab(i,true);ex.hp0=ex.hp=failing();save();renderBrief();try{window.scrollTo(0,0);$('brief').scrollTop=0;}catch(e){}sfx('start');notify('Exam started. '+ex.minutes+' minutes on the clock. No guide, no why, no walkthrough.');tick();}
  function record(ex,cleared,passed,total){const r=cur&&cur.lab&&cur.lab.exam&&cur.lab.examSeed===ex.seed&&window.l4nFun&&window.l4nFun.run&&window.l4nFun.run();
    X.history.push({date:today(),base:ex.base,mode:ex.mode,tag:ex.tag||null,cleared,passed,total,rank:cleared&&r?r.rank||null:null,secs:Math.round((Date.now()-ex.started)/1000),minutes:ex.minutes});X.history=X.history.slice(-40);save();}
  function gradeNow(){const l=cur.lab;cur.graded=l.checks.map(([t,f])=>{try{return [t,!!f(cur.net)];}catch(e){return [t,false];}});const all=cur.graded.every(g=>g[1]);
    const ex=X.current;if(ex&&ex.seed===l.examSeed){ex.hp=cur.graded.filter(g=>!g[1]).length;save();}
    if(all)celebrate();renderLabs();renderBrief();return all;}
  // The network is graded as it stands when the clock runs out. Grade while the exam still counts as running, so an
  // all-passing network is recorded as a clear by the celebrate wrapper (which ends the exam); only a failing one is a time-up.
  function timeUp(){const ex=X.current;if(!ex)return;sfx('timeup');const all=gradeNow();
    if(all&&ex.state==='running'){ex.state='done';save();record(ex,true,cur.graded.length,cur.graded.length);}
    if(!all){ex.state='timeup';save();const ok=cur.graded.filter(g=>g[1]).length;record(ex,false,ok,cur.graded.length);$('tin').disabled=true;
      $('resultBody').innerHTML=`<div class="result"><div class="stamp rD">×</div><div class="rrows"><div style="--i:0"><span>Time's up</span><b>${ok}/${cur.graded.length} checks passed</b></div><div style="--i:1"><span>What was wrong</span><b>${esc(l4nExamCause())}</b></div></div></div><p>The network was graded as it stood when the clock ran out. Review it as long as you like; nothing more counts for this exam.</p><div class="actions"><button class="btn primary" id="exReview">Review the network</button><button class="btn" id="exAgain">New exam</button></div>`;
      $('resultTitle').textContent="Time's up";$('resultCard').hidden=false;$('exReview').onclick=()=>{$('resultCard').hidden=true;$('tin').disabled=false;$('tin').focus();};$('exAgain').onclick=()=>{$('resultCard').hidden=true;$('tin').disabled=false;examDialog();};}
    renderBrief();}
  window.l4nExamCause=()=>{const l=cur&&cur.lab;if(!l||!l.exam)return '';return l.lesson||'';};
  function settleAway(){const ex=X.current;if(!ex||ex.state!=='running'||Date.now()<ex.deadline||running())return false;
    const title='Exam · '+ex.base;let i=-1;try{i=labIndex(ex);}catch(e){i=-1;}let ok=0,total=0;
    if(i>=0){const l=LABS[i];let st=null;try{st=replay(l,drafts[title]||null);}catch(e){st=null;}
      const g=l.checks.map(([,f])=>{try{return !!(st&&f(st.net));}catch(e){return false;}});ok=g.filter(Boolean).length;total=g.length;}
    const all=total>0&&ok===total;ex.state=all?'done':'timeup';record(ex,all,ok,total);delete drafts[title];persist();
    notify('Your exam on '+ex.base+' ended while you were away: '+(all?'every check passed, so it counts as a clear.':ok+'/'+total+' checks passed.'));return true;}
  let lastTickSec=null;
  function tick(){if(!running()){settleAway();return;}const ex=X.current,left=Math.max(0,Math.ceil((ex.deadline-Date.now())/1000)),c=$('examClock');
    if(c){c.textContent=mmss(left);c.classList.toggle('late',left<=60);}
    if(left<=10&&left>0&&left!==lastTickSec)sfx('tick');lastTickSec=left;
    if(left<=0)timeUp();}
  setInterval(tick,1000);
  // No help while an exam runs: the body attribute hides the guide switch, the why, the walkthrough, the command guide and clues.
  const sh0=stepsHtml;stepsHtml=function(k){return cur&&cur.lab&&cur.lab.exam?'':sh0(k);};
  const TAGS={sabotage:'HIDDEN FAULTS',daily:'DAILY CHALLENGE',lab:'BUILD',incident:'INCIDENT',boss:'BOSS FIGHT'};
  const lt0=labTag;labTag=function(idx){return LABS[idx]&&LABS[idx].exam?(TAGS[LABS[idx].examMode]||'EXAM'):lt0(idx);};
  // The guide is hidden during an exam, so it must not count as help: switch it off while an exam lab is open, as the capstone block does.
  const lockMsg=()=>{notify('An exam is running. Finish it, or give it up with Quit on the exam bar.');if(cur)renderLabs();};
  const mine=l=>!!(l&&l.exam&&X.current&&l.examSeed===X.current.seed);
  let savedGuide=null;const ol0=openLab;openLab=function(idx,isFresh){const l=LABS[idx];if(active()&&!mine(l))return lockMsg();if(!(l&&l.exam)&&savedGuide!==null){guideOn=savedGuide;savedGuide=null;}ol0(idx,isFresh);
    if(l&&l.exam){if(savedGuide===null)savedGuide=guideOn;guideOn=false;if(guidePop&&typeof setGuidePop==='function')setGuidePop(false);}};
  const os0=window.openSandbox;if(os0)window.openSandbox=function(){if(active())return lockMsg();if(savedGuide!==null){guideOn=savedGuide;savedGuide=null;}os0();};
  const op0=openPractice;openPractice=function(v){if(active())return lockMsg();op0(v);};
  if(window.openLesson){const oL=window.openLesson;window.openLesson=function(k){if(active())return lockMsg();oL(k);};}
  const rb0=renderBrief;renderBrief=function(){rb0();const l=cur&&cur.view==='lab'&&cur.lab;if(!l||!l.exam){delete document.body.dataset.exam;return;}
    document.body.dataset.exam='1';const ex=X.current&&X.current.seed===l.examSeed?X.current:null;
    const state=ex?ex.state:'done',left=ex&&ex.state==='running'?Math.max(0,Math.ceil((ex.deadline-Date.now())/1000)):0;
    const status=state==='running'?`<span class="exam-clock${left<=60?' late':''}" id="examClock">${mmss(left)}</span>`:state==='timeup'?'<span class="exam-clock late">Time\'s up</span>':'<span class="exam-clock">Done</span>';
    let boss='';if(l.examMode==='boss'){const total=Math.max(1,ex&&typeof ex.hp0==='number'?ex.hp0:l.checks.length);const hp=cur.graded?cur.graded.filter(g=>!g[1]).length:ex&&typeof ex.hp==='number'?ex.hp:total;const pct=Math.min(100,Math.round(hp/total*100));
      boss=`<div class="boss"><b>BOSS</b><div class="boss-hp" role="progressbar" aria-label="Boss health" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${hp}"><i style="width:${pct}%"></i></div><span>${hp?hp+' / '+total+' HP · grade to strike':'BOSS DOWN'}</span></div>`;}
    const bar=`<div class="exam-bar${l.examMode==='boss'?' boss-mode':''}"><b>${l.examMode==='boss'?'BOSS':'EXAM'}</b>${status}<span class="exam-note">${esc([modeText(l.examMode,l.examFaults||0),(ex?ex.minutes:l.examMinutes)?(ex?ex.minutes:l.examMinutes)+' min':'','no guide, no why, no walkthrough'].filter(Boolean).join(' · '))}</span>${state==='running'?'<button class="small-btn" id="examQuit" type="button">Quit</button>':'<button class="small-btn" id="examNew" type="button">New exam</button>'}</div>`;
    $('brief').insertAdjacentHTML('afterbegin',bar+boss);
    if($('examQuit'))$('examQuit').onclick=()=>{dialog('Give up this exam?','<p>It is recorded as not cleared, with the checks that pass right now. You cannot resume it afterwards.</p><div class="actions"><button class="btn primary" id="exConfirmQuit">Give it up</button><button class="btn" id="exKeep">Keep going</button></div>');
      $('exConfirmQuit').onclick=()=>{$('dialog').close();giveUp();renderLabs();};$('exKeep').onclick=()=>$('dialog').close();};
    if($('examNew'))$('examNew').onclick=examDialog;
    // grading in an exam records the result; a clear stops the clock
    $('bGrade').onclick=()=>{const before=cur.graded?cur.graded.filter(g=>!g[1]).length:l.checks.length,all=gradeNow();
      if(l.examMode==='boss'&&!all){const hp=cur.graded.filter(g=>!g[1]).length;if(hp<before){sfx('unreach');const b=$('brief').querySelector('.boss');if(b&&!REDUCED){b.classList.remove('hit');void b.offsetWidth;b.classList.add('hit');}}}
      if(!all&&$('grade'))$('grade').scrollIntoView({block:'nearest',behavior:REDUCED?'auto':'smooth'});};};
  const cel0=celebrate;celebrate=function(){cel0();const l=cur&&cur.lab,ex=X.current;if(!l||!l.exam||!ex||ex.seed!==l.examSeed||ex.state!=='running')return;
    ex.state='done';save();const run=window.l4nFun&&window.l4nFun.run&&window.l4nFun.run();record(ex,true,l.checks.length,l.checks.length);
    unlock('exam');if(ex.faults){const noHelp=run&&!run.help&&!run.walk;if(noHelp)unlock('saboteur');}if(ex.mode==='boss')unlock('boss');if(window.examStats().daily>=3)unlock('daily3');};
  // Leaving the exam lab for another one leaves the clock running until it ends; opening it again shows it.
  // The exam setup card
  function giveUp(){const ex=X.current;if(!ex||ex.state!=='running')return;ex.state='quit';const i=labIndex(ex),l=LABS[i];let ok=0,total=l?l.checks.length:0;
    if(l){const net=mine(cur&&cur.lab)?cur.net:(()=>{try{return replay(l,drafts[l.title]||null).net;}catch(e){return null;}})();ok=l.checks.filter(([,f])=>{try{return !!(net&&f(net));}catch(e){return false;}}).length;}
    record(ex,false,ok,total);X.current=null;save();notify('Exam given up: '+ok+'/'+total+' checks passed. It counts as not cleared.');if(cur&&cur.view==='lab')renderBrief();}
  const dailyCache={day:null,ex:null};
  function examDialog(){if(active()){const ex=X.current,left=Math.max(0,Math.ceil((ex.deadline-Date.now())/1000));
      dialog('Exam sim',`<p>An exam is running: <b>${esc(ex.base)}</b> · ${esc(MODES[ex.mode]||ex.mode)} · <b>${mmss(left)}</b> left. Finish it before starting another; you can give it up, but it counts as not cleared.</p><div class="actions"><button class="btn primary" id="exResume">Resume the exam →</button><button class="btn" id="exGiveUp">Give it up</button></div>`);
      $('exResume').onclick=()=>{$('dialog').close();if(!running()){const i=labIndex(ex);if(i>=0)openLab(i,false);}};
      $('exGiveUp').onclick=()=>{$('dialog').close();giveUp();renderLabs();};return;}
    const seedDaily='daily-'+today(),done=X.history.find(h=>h.mode==='daily'&&h.date===today());
    let daily=null;if(dailyCache.day!==today()){let d0=null;try{d0=makeExam('daily',20,seedDaily);}catch(e){d0=null;}dailyCache.day=today();dailyCache.ex=d0?JSON.stringify(d0):null;}daily=dailyCache.ex?JSON.parse(dailyCache.ex):null;
    const hist=X.history.slice(-8).reverse().map(h=>`<tr><td>${esc(h.date)}</td><td>${esc(h.base)}</td><td>${esc(MODES[h.mode]||h.mode)}</td><td class="${h.cleared?'good':'bad'}">${esc(h.cleared?'Cleared · rank '+(h.rank||'—'):'Not cleared · '+h.passed+'/'+h.total)}</td></tr>`).join('');
    dialog('Exam sim',`<p>A random lab, a clock, and no help: no guide, no "why", no walkthrough, no clues. The network is graded as it stands when time runs out. Ranks are scored on results, as always.</p>
      <div class="exam-daily"><div class="eyebrow">Daily challenge · ${today()}</div>${done?`<p><b>${done.cleared?'Cleared today · rank '+(done.rank||'—'):'Attempted today · '+done.passed+'/'+done.total+' checks'}</b> · ${esc(done.base)}</p>`:daily?`<p><b>${esc(daily.base)}</b> with two hidden faults · 20 minutes · the same for everyone today.</p><button class="btn primary" id="exDaily">Start today's challenge →</button>`:'<p>No daily challenge could be built.</p>'}</div>
      <h3>Pick your own</h3><div class="exam-opts"><label><input type="radio" name="exMode" value="sabotage" checked> <b>Sabotage</b> · a finished lab with one or two hidden faults (never the same twice)</label><label><input type="radio" name="exMode" value="lab"> <b>Build lab</b> · configure it from the checklist alone</label><label><input type="radio" name="exMode" value="incident"> <b>Incident</b> · a troubleshooting incident with no clues</label><label><input type="radio" name="exMode" value="boss"> <b>Boss fight</b> · three hidden faults at once, a health bar that drops as checks pass (30 minutes)</label></div>
      <div class="exam-opts row"><span>Clock</span>${[10,15,20,30].map(m=>`<label><input type="radio" name="exMin" value="${m}"${m===20?' checked':''}> ${m} min</label>`).join('')}</div>
      <div class="actions"><button class="btn primary" id="exStart">Start exam →</button></div>
      ${hist?`<h3>Recent exams</h3><div class="table-wrap"><table><thead><tr><th>Date</th><th>Lab</th><th>Mode</th><th>Result</th></tr></thead><tbody>${hist}</tbody></table></div>`:''}`);
    if($('exDaily'))$('exDaily').onclick=()=>{$('dialog').close();start(daily);};
    const syncClock=()=>{const boss=($('dialogBody').querySelector('input[name=exMode]:checked')||{}).value==='boss';$('dialogBody').querySelectorAll('input[name=exMin]').forEach(r=>{r.disabled=boss&&r.value!=='30';if(boss&&r.value==='30')r.checked=true;});};
    $('dialogBody').querySelectorAll('input[name=exMode]').forEach(r=>r.addEventListener('change',syncClock));
    $('exStart').onclick=()=>{const mode=($('dialogBody').querySelector('input[name=exMode]:checked')||{}).value||'sabotage',min=+(($('dialogBody').querySelector('input[name=exMin]:checked')||{}).value||20);
      let ex=null;try{ex=makeExam(mode,mode==='boss'?30:min,mode+'-'+Date.now()+'-'+Math.floor(Math.random()*1e6));}catch(e){ex=null;}if(!ex)return notify('Could not build an exam of that kind.');$('dialog').close();start(ex);};}
  window.examDialog=examDialog;
  window.l4nExam={start:(mode,minutes,seed,pool,tag)=>{if(active()){examDialog();return false;}let ex=null;try{ex=makeExam(mode,minutes,seed,pool);}catch(e){ex=null;}if(!ex)return false;ex.tag=tag||null;start(ex);return true;},history:()=>X.history.slice(),active:()=>active(),current:()=>X.current?Object.assign({},X.current):null};
  // entry points: the lab library's practice buttons and the lab menu
  const lib0=library;library=function(){lib0();const pb=$('dialogBody').querySelector('.practice-buttons');if(pb&&!$('examBtn')){pb.insertAdjacentHTML('beforeend','<button class="btn" id="examBtn">Exam sim →</button>');$('examBtn').onclick=()=>{$('dialog').close();examDialog();};}};
  $('library').onclick=library;
  const rl0=renderLabs;renderLabs=function(){rl0();const g=[...$('labs').querySelectorAll('optgroup')].find(o=>o.label==='Practice');
    if(g&&!g.querySelector('option[value="exam"]')){const o=document.createElement('option');o.value='exam';o.textContent='Exam sim';g.appendChild(o);}
    if(cur&&cur.view==='lab'&&cur.lab&&cur.lab.exam){const ex=LABS.indexOf(cur.lab);let o=$('labs').querySelector('option[value="'+ex+'"]');if(!o){o=document.createElement('option');o.value=String(ex);g.parentNode.insertBefore(o,g);}o.textContent='Exam · '+cur.lab.baseTitle;o.selected=true;}
    // the progress meter counts real labs only
    const real=LABS.filter(l=>!l.exam),count=real.filter(l=>progress[l.title]).length,m=$('meter');if(m&&LABS.some(l=>l.exam))m.innerHTML=`<div class="progressbar" role="progressbar" aria-label="Labs passed" aria-valuemin="0" aria-valuemax="${real.length}" aria-valuenow="${count}"><span style="width:${count/real.length*100}%"></span></div><span>${count} / ${real.length} passed</span>`;};
  $('labs').addEventListener('change',e=>{if(e.target.value==='exam'){e.stopImmediatePropagation();renderLabs();examDialog();}},true);
  // the why line after a command stays quiet during an exam
  const ex0=execute;execute=function(line){ex0(line);if(cur&&cur.lab&&cur.lab.exam){$('hint').textContent=HINT;$('hint').className='';}};
  // resume a running exam after a reload
  try{settleAway();purge(active()?'Exam · '+X.current.base:null);if(active()){const i=labIndex(X.current);if(i>=0)openLab(i,false);}}catch(e){console.error('Could not resume the exam:',e);X.current=null;save();}
  if(window.l4nFun&&window.l4nFun.forget&&!active())for(const l of X.history)window.l4nFun.forget('Exam · '+l.base);
  if(cur&&cur.view==='lab')renderAll();
})();
// ---------- sandbox challenges count: XP and trophies for completed challenges ----------
(function(){const KEY='lab4net-sbx-done-v1';let D={};try{D=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){}if(typeof D!=='object'||Array.isArray(D))D={};
  window.sandboxStats=()=>({done:Object.keys(D).length});
  window.l4nSbxDone=function(i,total){if(!D[i]){D[i]=Date.now();try{localStorage.setItem(KEY,JSON.stringify(D));}catch(e){}}
    const f=window.l4nFun;if(f&&f.unlock){f.unlock('builder');if(Object.keys(D).length>=total)f.unlock('architect');}if(f&&f.check)f.check();};
})();
// ---------- campaign: the labs as a story in eight stages, each with a boss ----------
// You are the new network engineer at Harbor Street Logistics. Each stage is one lab group in order; its missions are
// the labs you already have, its boss is an incident or a sabotage exam. A stage unlocks when the one before is
// finished (missions only); it is cleared when its missions and its boss are done. Nothing here changes grading.
