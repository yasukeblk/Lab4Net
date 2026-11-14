function renderQuiz(){const q=QUIZ[quizIndex],results=progress.quiz||{},known=QUIZ.filter((_,i)=>results[i]===true).length;const order=[0,1,2,3].map((_,i)=>(i+quizIndex%4)%4);
  $('brief').innerHTML=`<div class="eyebrow">Practice · Beyond the CLI</div><h2>Explain the network.</h2><p>Short concept checks for topics that need more than a configuration lab.</p><div class="lesson-tip">Choose an answer, then read the reasoning. An incorrect answer is a topic to revisit, not a penalty.</div><h3>Recall progress</h3><p>${known} / ${QUIZ.length} concepts answered correctly.</p><p>Supplementary practice across wireless, services, security, IPv6 and automation. This is not a full exam bank.</p><button class="btn" id="reviewQuiz">Review missed concepts</button>`;
  $('practice').innerHTML=`<div class="eyebrow">${q[0]} <span>${quizIndex+1} / ${QUIZ.length}</span></div><h2>${q[1]}</h2><div class="quiz-options">${order.map(i=>`<button class="quiz-option ${quizAnswer===i?(i===q[3]?'correct':'incorrect'):quizAnswer!==null&&i===q[3]?'correct':''}" data-answer="${i}"${quizAnswer!==null?' disabled':''}><span>${String.fromCharCode(65+order.indexOf(i))}</span>${esc(q[2][i])}</button>`).join('')}</div><div role="status">${quizAnswer!==null?`<div class="lesson-tip"><b>${quizAnswer===q[3]?'Correct.':'Revisit this concept.'}</b><p>${q[4]}</p></div>`:''}</div><div class="actions"><button class="btn" id="quizPrev"${quizIndex===0?' disabled':''}>← Previous</button><button class="btn primary" id="quizNext">${quizIndex===QUIZ.length-1?'Back to first':'Next concept →'}</button></div>`;
  $('practice').querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{quizAnswer=+b.dataset.answer;progress.quiz=progress.quiz||{};progress.quiz[quizIndex]=quizAnswer===q[3];persist();renderQuiz();});$('quizNext').onclick=()=>{quizIndex=(quizIndex+1)%QUIZ.length;quizAnswer=null;renderQuiz();};$('quizPrev').onclick=()=>{quizIndex=Math.max(0,quizIndex-1);quizAnswer=null;renderQuiz();};$('reviewQuiz').onclick=()=>{const i=QUIZ.findIndex((_,i)=>results[i]===false);quizIndex=i>=0?i:QUIZ.findIndex((_,i)=>results[i]!==true);if(quizIndex<0)quizIndex=0;quizAnswer=null;renderQuiz();};}
function openPractice(view){if(cur.view==='lab')saveWork();fxToken++;cur.view=view;if(view==='drill'&&!cur.drillQ)newDrill();renderAll();}
const DEFS='<defs><linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8af6ff"/><stop offset="1" stop-color="#2a7bff"/></linearGradient><linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9ccb"/><stop offset="1" stop-color="#a23bff"/></linearGradient><linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f3ff"/><stop offset="1" stop-color="#a39cd6"/></linearGradient><linearGradient id="gScr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2ee6ff"/><stop offset="1" stop-color="#1b2f8f"/></linearGradient><linearGradient id="gY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff8a1f"/></linearGradient><radialGradient id="gSh"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>';
const SPR={
  router:'<ellipse class="gshadow" cx="0" cy="17" rx="32" ry="8"/><rect class="body" x="-23" y="-14" width="46" height="28" rx="12" fill="url(#gR)"/><path class="shine" d="M-14 -8H10"/><path class="glyph" d="M-13 3H13M0 -4V10M-13 3l4 -3M-13 3l4 3M13 3l-4 -3M13 3l-4 3"/>',
  switch:'<ellipse class="gshadow" cx="0" cy="16" rx="38" ry="8"/><rect class="body" x="-30" y="-13" width="60" height="26" rx="7" fill="url(#gS)"/><path class="shine" d="M-22 -8H14"/><path class="px" d="M-24 0h6v7h-6zM-15 0h6v7h-6zM-6 0h6v7h-6zM3 0h6v7h-6zM12 0h6v7h-6z"/><circle class="lamp" cx="24" cy="3.5" r="2.4"/>',
  pc:'<ellipse class="gshadow" cx="0" cy="19" rx="26" ry="7"/><rect class="body" x="-19" y="-17" width="38" height="27" rx="5" fill="url(#gP)"/><rect class="scr" x="-14" y="-12.5" width="28" height="18" rx="2.5" fill="url(#gScr)"/><path d="M-11 -10h8l-8 8z" fill="#fff" opacity=".4"/><path class="body" d="M-4 10h8v4h-8z" fill="url(#gP)"/><rect class="body" x="-12" y="13" width="24" height="5" rx="2.5" fill="url(#gP)"/>',
  srv:'<ellipse class="gshadow" cx="0" cy="22" rx="24" ry="7"/><rect class="body" x="-15" y="-21" width="30" height="42" rx="6" fill="url(#gP)"/><path class="shine" d="M-9 -16H5"/><path class="px" d="M-9 -10h18v4h-18zM-9 -3h18v4h-18zM-9 4h18v4h-18z"/><circle class="lamp" cx="7" cy="14" r="2.6"/>'
,
  phone:'<ellipse class="gshadow" cx="0" cy="17" rx="26" ry="7"/><path class="body" d="M-20 12L-15 -9Q-14 -13 -10 -13H14Q18 -13 19 -9L22 12Z" fill="url(#gP)"/><rect class="scr" x="-3" y="-9" width="17" height="10" rx="1.5" fill="url(#gScr)"/><rect class="body" x="-18" y="-17" width="10" height="29" rx="4" fill="url(#gP)"/><path class="px" d="M-2 4h4v3h-4zM4 4h4v3h-4zM10 4h4v3h-4z"/>'
},LABELY={router:36,switch:35,pc:39,srv:43,phone:39};
function drawTopo(){if(cur.view!=='lab')return;const{lab,net}=cur;let h=`<svg viewBox="0 0 600 245" class="${cur.intro?'intro':''}" role="group" aria-label="Interactive lab topology">`+DEFS;cur.intro=false;
  const cnt={},seen={},pk=l=>[l.a,l.b].sort().join('|');net.links.forEach(l=>{cnt[pk(l)]=(cnt[pk(l)]||0)+1;});
  for(const l of net.links){const k=pk(l),idx=seen[k]=(seen[k]??-1)+1,off=(idx-(cnt[k]-1)/2)*16;
    let[ax,ay]=lab.pos[l.a],[bx,by]=lab.pos[l.b];const A=net.devs[l.a],B=net.devs[l.b],up=ifUp(net,A,A.ifs[l.ai])&&ifUp(net,B,B.ifs[l.bi]);
    const id=l.a+'|'+l.ai,was=cur.links[id];cur.links[id]=up;
    const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,side=cnt[k]>1?(off<0?-1:1):1,px=-uy*10*side,py=ux*10*side;
    ax+=-uy*off;ay+=ux*off;bx+=-uy*off;by+=ux*off;const xy=`x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"`;
    h+=`<line class="wire ${up?'base':'off'}" ${xy}/>`;if(up)h+=`<line class="wire flow" ${xy}/>`;if(up&&was===false)h+=`<line class="wire flash" ${xy}/>`;
    [[A,l.ai,ax+ux*42,ay+uy*42,1],[B,l.bi,bx-ux*42,by-uy*42,-1]].forEach(([D,ifn,x,y,s])=>{
      h+=`<rect class="led ${up?'on':'off'}" x="${x-ux*11*s-3}" y="${y-uy*11*s-3}" width="6" height="6"/>`;
      if(D.type!=='pc'&&!lab.hidePorts)h+=`<text class="port" x="${x+px}" y="${y+py+3}">${shortIf(ifn)}</text>`;});}
  Object.keys(net.devs).forEach((n,k)=>{const d=net.devs[n],[x,y]=lab.pos[n],kind=d.type==='pc'?(d.phone?'phone':d.services?'srv':'pc'):d.type;let g;
    g=SPR[kind];
    h+=`<g class="dev ${kind}${n===cur.sel?' sel':''}" data-dev="${n}" transform="translate(${x},${y})" tabindex="0" role="button" aria-label="Open ${n} console"><g class="pop" style="--i:${k}">${n===cur.sel?'<ellipse class="selglow" cx="0" cy="17" rx="34" ry="9"/><path class="selring" d="M-9 -42h18l-9 11z"/>':''}${g}<text y="${LABELY[kind]}">${d.type==='pc'?n:esc(d.hostname)}</text></g></g>`;});
  $('topo').innerHTML=h+'<g id="fx"></g></svg>';}

// packet animation over the topology
const fxLayer=()=>document.querySelector('#topo #fx');
function burst(name,cls,label){const g=fxLayer();if(!g)return;const[x,y]=cur.lab.pos[name];let h='';
  if(cls==='hop')h=`<circle class="burst hop" cx="${x}" cy="${y}" r="24"/>`;
  else{const pts=[];for(let k=0;k<16;k++){const a=k/16*6.283-1.5708,r=k%2?13:34;pts.push((x+Math.cos(a)*r).toFixed(1)+','+(y+Math.sin(a)*r).toFixed(1));}
    h=`<polygon class="spark ${cls}" points="${pts.join(' ')}"/><circle class="burst ${cls}" cx="${x}" cy="${y}" r="30"/>`;
    for(let k=0;k<8;k++){const a=k/8*6.283+.4,r=44+(k%2)*14;h+=`<circle class="bit ${cls}" cx="${x}" cy="${y}" r="3" style="--dx:${Math.round(Math.cos(a)*r)}px;--dy:${Math.round(Math.sin(a)*r)}px"/>`;}
    if(cls==='bad'){const p=[...document.querySelectorAll('#topo .dev')].find(e=>e.dataset.dev===name)?.querySelector('.pop');if(p){p.classList.remove('shake');void p.getBoundingClientRect();p.classList.add('shake');}}}
  if(label)h+=`<text class="fxlabel ${cls}" x="${cur.sandbox?x:Math.min(510,Math.max(90,x))}" y="${y<64?y+62:y-46}">${label}</text>`;
  g.insertAdjacentHTML('beforeend',h);}
function fly(names,cls,tok){return new Promise(res=>{const g=fxLayer();if(!g||names.length<2||REDUCED)return res();
  const pts=names.map(n=>cur.lab.pos[n]),dot=document.createElementNS(NS,'circle');dot.setAttribute('r',5.5);dot.setAttribute('class','pkt '+cls);dot.setAttribute('cx',pts[0][0]);dot.setAttribute('cy',pts[0][1]);g.appendChild(dot);
  let seg=0,t0=null;const step=ts=>{if(tok!==fxToken||!dot.isConnected){dot.remove();return res();}if(t0===null)t0=ts;const a=pts[seg],b=pts[seg+1],dur=Math.max(200,Math.hypot(b[0]-a[0],b[1]-a[1])*2.4),k=Math.min(1,(ts-t0)/dur);
    dot.setAttribute('cx',a[0]+(b[0]-a[0])*k);dot.setAttribute('cy',a[1]+(b[1]-a[1])*k);
    if(k>=1){g.insertAdjacentHTML('afterbegin',`<line class="trail ${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`);seg++;t0=null;
      if(seg>=pts.length-1){dot.remove();return res();}burst(names[seg],'hop');}
    requestAnimationFrame(step);};requestAnimationFrame(step);});}
async function playTrace(T){const tok=++fxToken,g=fxLayer();if(!g)return;g.innerHTML='';
  const fp=T.f.hops.path,end=fp[fp.length-1];await fly(fp,'req',tok);if(tok!==fxToken)return;
  if(!T.f.ok)return burst(end,'bad',T.f.blocked?'Blocked by ACL':'No path from here');
  if(T.refused)return burst(end,'warn','Port closed');
  if(!T.r)return burst(end,'good','');
  const rp=T.r.hops.path,e2=rp[rp.length-1];await fly(rp,'rep',tok);if(tok!==fxToken)return;
  if(T.ok)burst(e2,'good','Reply received');else burst(e2,'bad',T.r.blocked?'Reply blocked by ACL':'Reply has no route back');}
function celebrate(){if(REDUCED)return;const tok=fxToken,g=fxLayer();if(g)g.insertAdjacentHTML('beforeend','<text class="clear" x="300" y="140">LAB CLEAR!</text>');Object.keys(cur.net.devs).forEach((n,k)=>setTimeout(()=>{if(tok===fxToken)burst(n,'good','');},k*120));}


$('labs').onchange=e=>{if(['drill','quiz'].includes(e.target.value))openPractice(e.target.value);else openLab(+e.target.value);};
$('library').onclick=library;$('help').onclick=help;$('transfer').onclick=transfer;$('reference').onclick=reference;
$('missionView').onclick=()=>mobilePanel(false);$('networkView').onclick=()=>mobilePanel(true);window.addEventListener('resize',()=>{if(cur?.view==='lab')$('term').scrollTop=$('term').scrollHeight;});
$('closeDialog').onclick=()=>$('dialog').close();$('dialog').onclick=e=>{if(e.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('dialog').close();}};
$('tabs').onclick=e=>{const b=e.target.closest('[data-dev]');if(b)select(b.dataset.dev);};
$('tabs').onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const names=Object.keys(cur.net.devs),i=names.indexOf(cur.sel);const next=e.key==='Home'?0:e.key==='End'?names.length-1:(i+(e.key==='ArrowRight'?1:-1)+names.length)%names.length;select(names[next]);$('tab-'+names[next]).focus();}};
$('topo').onclick=e=>{const g=e.target.closest('[data-dev]');if(g)select(g.dataset.dev);};$('topo').onkeydown=e=>{const g=e.target.closest('[data-dev]');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(g.dataset.dev);}};
$('clearConsole').onclick=()=>{cur.sess[cur.sel].lines=[];renderTerm();};$('term').onclick=()=>{if(!String(window.getSelection()))$('tin').focus({preventScroll:true});};
const tin=$('tin');tin.oninput=()=>{if(!tin.value.includes('?'))return;const{net,sess,sel}=cur,s0=sess[sel];if(effPrompt(s0))return;const [d,s]=effPair(net.devs[sel],s0),line=tin.value.replace(/\?/g,'');const c=candidates(d,s.mode,line),w=Math.max(0,...c.map(x=>x.length));push(s,['\u0001'+promptOf(d,s)+line+'?',...(c.length?c.map(x=>('  '+x.padEnd(w+2)+(s.mode==='pc'?'':KWHELP[x]||'')).trimEnd()):['% Unrecognized command'])]);tin.value=line;renderTerm();};
tin.onkeydown=e=>{const s=cur.sess[cur.sel],[d,es]=effPair(cur.net.devs[cur.sel],s),asking=!!effPrompt(s);if(STREAM&&e.ctrlKey&&((e.key.toLowerCase()==='c'&&tin.selectionStart===tin.selectionEnd)||e.key==='^'||(e.shiftKey&&(e.key==='6'||e.code==='Digit6')))){e.preventDefault();streamStop(true);return;}if(e.key==='Enter'){e.preventDefault();const line=tin.value;tin.value='';execute(line);}else if(e.ctrlKey&&e.key.toLowerCase()==='z'){e.preventDefault();if(!asking&&d.type!=='pc'&&!['user','priv'].includes(es.mode))execute('end');}else if(e.ctrlKey&&e.key.toLowerCase()==='l'){e.preventDefault();s.lines=[];renderTerm();}else if(e.key==='Tab'){e.preventDefault();if(asking)return;const c=candidates(d,es.mode,tin.value).filter(x=>/^[a-z\/-]/.test(x));if(c.length===1&&!/\s$/.test(tin.value))tin.value=tin.value.replace(/\S*$/,c[0]+' ');}else if(e.key==='ArrowUp'){e.preventDefault();if(s.hi>0)tin.value=s.hist[--s.hi];}else if(e.key==='ArrowDown'){e.preventDefault();tin.value=s.hi<s.hist.length-1?s.hist[++s.hi]:(s.hi=s.hist.length,'');}};
tin.onpaste=e=>{const text=e.clipboardData.getData('text');if(!/[\r\n]/.test(text))return;e.preventDefault();const lines=text.split(/\r?\n/).filter(x=>x.trim());if(lines.length>100||lines.some(x=>x.length>512)){notify('Paste up to 100 commands, each under 512 characters.');return;}dialog('Review pasted commands',`<p>Run these ${lines.length} commands on <b>${esc(cur.net.devs[cur.sel].hostname)}</b> in the order shown.</p><pre class="paste-preview">${esc(lines.join('\n'))}</pre><button class="btn primary" id="runPaste">Run commands</button>`);$('runPaste').onclick=()=>{$('dialog').close();lines.forEach(execute);tin.value='';tin.focus();};};
let guideOn=true;try{guideOn=localStorage.getItem('lab4net-guide')!=='0';}catch(e){}
const DESK=window.matchMedia('(min-width:861px)');let extAlive=false,guidePop=false;try{guidePop=localStorage.getItem('lab4net-guide-pop')==='1';}catch(e){}
function stepsHtml(k){return guideOn&&!(guidePop&&(DESK.matches||extAlive))?stepsBlock(k):'';}
function stepsBlock(k){if(!cur.guide)cur.guide=guideFor(cur.lab);const task=cur.guide[k]||[];
  return '<div class="steps">'+task.map(g=>`<div class="step-dev">On ${esc(g.dev)}</div>`+g.lines.map(x=>x.note?`<div class="step-note">${esc(x.note)}</div>`:`<button class="step" data-dev="${esc(g.dev)}" data-cmd="${esc(x.cmd)}" title="Click to place this command in the console"><span class="sp">${esc(x.prompt)}</span>${x.cmd===CR?'⏎ Enter':esc(x.cmd)}</button>`).join('')).join('')+'</div>';}
document.addEventListener('click',e=>{const b=e.target.closest('.step');if(!b||cur.view!=='lab')return;if($('dialog').open)$('dialog').close();select(b.dataset.dev);$('tin').value=b.dataset.cmd;$('tin').focus({preventScroll:true});});
openLab(Math.max(0,Math.min(LABS.length-1,lastLab)));


// menu-bar clock and one-time boot screen
(function(){const c=$('clock'),tick=()=>{c.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});};tick();setInterval(tick,15000);
  const b=$('boot');let seen=false;try{seen=sessionStorage.getItem('l4n-boot')==='1';sessionStorage.setItem('l4n-boot','1');}catch(e){}
  if(seen||REDUCED||navigator.webdriver){b.remove();return;}
  const lines=['LAB4NET BIOS 2.0','','CPU ......... OK','MEMORY ...... 640K OK','LABS ........ '+LABS.length+' FOUND','CONSOLE ..... READY','','STARTING WORKSPACE'],pre=b.querySelector('pre');let i=0,t;
  const close=()=>{clearInterval(t);window.removeEventListener('keydown',close);b.classList.add('off');setTimeout(()=>b.remove(),280);};
  t=setInterval(()=>{if(i<lines.length)pre.textContent+=lines[i++]+'\n';else close();},140);b.onclick=close;window.addEventListener('keydown',close);})();

// ---------- pop-out guide window ----------
function guideHtml(){if(!cur.guide)cur.guide=guideFor(cur.lab);return `<div class="eyebrow">${cur.lab.group} <span>${labTag(cur.idx)}</span></div><h2>${cur.lab.title}</h2>`+cur.lab.tasks.map((t,k)=>`<div class="gtask"><b>${String(k+1).padStart(2,'0')}</b><div>${t}${stepsBlock(k)}</div></div>`).join('');}
function renderGuideWin(){const lab=cur.view==='lab'&&!cur.sandbox,w=$('guideWin'),show=guidePop&&lab&&DESK.matches&&!extAlive;w.hidden=!show;if(show)$('guideBody').innerHTML=guideHtml();
  if(extAlive){const html=lab?guideHtml():'<p class="guide-wait">Open a lab to see its step-by-step guide here.</p>',key=lab?cur.lab.title:'';
    if(html!==extLast.html){extSend({t:'show',html,title:key,keep:key===extLast.key});extLast={html,key};}}}
// ---------- guide in its own browser window (second monitor) ----------
let extWin=null,extBeat=0,extLast={html:'',key:null},gch=null;try{gch=new BroadcastChannel('lab4net-guide');}catch(e){}
function extSend(m){try{if(gch)gch.postMessage(m);}catch(e){}try{if(extWin&&!extWin.closed)extWin.postMessage({l4nGuide:m},'*');}catch(e){}}
function extRefresh(){if(cur.view==='lab'){const sc=$('brief').scrollTop;renderBrief();$('brief').scrollTop=sc;}renderGuideWin();layoutApply();}
function extMsg(m,src){if(!m||!cur)return;if(src)extWin=src;
  if(m.t==='hello'){extBeat=Date.now();if(!extAlive){extAlive=true;extLast={html:'',key:null};if(!guidePop){guidePop=true;try{localStorage.setItem('lab4net-guide-pop','1');}catch(e){}}extRefresh();}}
  else if(m.t==='bye'){if(extAlive){extAlive=false;extWin=null;extRefresh();}}
  else if(m.t==='dock'){extAlive=false;extWin=null;setGuidePop(false);}
  else if(m.t==='step'&&cur.view==='lab'&&cur.net.devs[m.dev]){select(m.dev);$('tin').value=m.cmd;$('tin').focus({preventScroll:true});}}
if(gch)gch.onmessage=e=>extMsg(e.data);
// Only Lab4Net's own guide window (same origin) may talk to this page: other sites can open or frame it.
window.addEventListener('message',e=>{if(e.origin!==location.origin||!e.data||!e.data.l4nGuide)return;let ok=!extWin||e.source===extWin;try{ok=ok||!!(e.source&&e.source.name==='lab4net-guide');}catch(x){}if(ok)extMsg(e.data.l4nGuide,e.source);});
setInterval(()=>{if(extAlive&&Date.now()-extBeat>9000){extAlive=false;extWin=null;extRefresh();}},2000);
function openGuideWindow(){if(extAlive&&extWin&&!extWin.closed){try{extWin.focus();}catch(e){}return;}
  const w=window.open(location.href.split('#')[0].split('?')[0]+'?guide','lab4net-guide','popup=yes,width=560,height=900');
  if(!w){notify('The browser blocked the guide window. Allow pop-ups for this page, then try again.');return;}extWin=w;if(!guidePop)setGuidePop(true);}
$('guideExt').onclick=openGuideWindow;
// a reloaded main window finds a guide window that is still open
setTimeout(()=>extSend({t:'ping'}),0);
function setGuidePop(on){if(on&&!DESK.matches&&!extAlive){dialog('Step-by-step guide',guideHtml());return;}
  if(!on&&extAlive){extSend({t:'close'});extAlive=false;extWin=null;}
  guidePop=on;try{localStorage.setItem('lab4net-guide-pop',on?'1':'0');}catch(e){}
  if(cur.view==='lab'){const sc=$('brief').scrollTop;renderBrief();$('brief').scrollTop=sc;}renderGuideWin();layoutApply();}

// ---------- movable, resizable, snapping windows (desktop) ----------
(function(){
  // The pop-out guide is raised above the other windows whenever it appears, and on request (flash shows where it is).
  let gWasShown=false;
  window.guideFront=function(flash){if(extAlive&&extWin&&!extWin.closed){try{extWin.focus();}catch(e){}extSend({t:'flash'});return;}
    const g=$('guideWin');if(g.hidden)return;const top=Math.max(0,...IDS.map($).map(el=>+el.style.zIndex||0));g.style.zIndex=Math.max(z,top)+1;z=+g.style.zIndex;
    if(flash){g.classList.remove('flash');void g.offsetWidth;g.classList.add('flash');g.scrollIntoView({block:'nearest'});}};
  const main=document.querySelector('main'),IDS=['brief','checkWin','mapPanel','console','practice','guideWin'],KEY='lab4net-layout-v3',PAD=18,GAP=22,SNAP=12,EDGE=7,MINW=260,MINH=150;
  const CUR={n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize',ne:'nesw-resize',sw:'nesw-resize',nw:'nwse-resize',se:'nwse-resize',move:'move'};
  let L={},z=5,act=null;try{L=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(L));}catch(e){}};
  const view=()=>cur.view==='lab'?'lab':'practice';
  const wins=()=>IDS.map($).filter(el=>!el.hidden&&!el.parentElement.hidden);
  const setVars=(el,r)=>{for(const k of ['x','y','w','h'])el.style.setProperty('--'+k,(r[k]*100).toFixed(3)+'%');};
  const sv=$('snapV'),sh=$('snapH'),sp=$('snapPrev');
  window.layoutApply=function(){
    if(!DESK.matches){main.classList.remove('free');return;}
    const S=L[view()]||(L[view()]={}),vis=wins();
    if(vis.some(el=>!S[el.id])){main.classList.remove('free');const m=main.getBoundingClientRect();
      for(const el of vis){if(S[el.id])continue;
        if(el.id==='guideWin'){S[el.id]={x:.6,y:.04,w:.385,h:.66};continue;}
        const r=el.getBoundingClientRect();S[el.id]={x:(r.left-m.left)/m.width,y:(r.top-m.top)/m.height,w:r.width/m.width,h:r.height/m.height};}
      save();}
    main.classList.add('free');
    for(const el of vis){el.classList.add('fw');setVars(el,S[el.id]);if(el.id==='guideWin'&&!el.style.zIndex)el.style.zIndex=++z;}
    {const g=$('guideWin'),shown=!g.hidden;if(shown&&!gWasShown)guideFront(false);gWasShown=shown;}
  };
  function hit(e){if(!main.classList.contains('free'))return null;
    const vis=wins().sort((a,b)=>(+b.style.zIndex||0)-(+a.style.zIndex||0)),x=e.clientX,y=e.clientY;
    for(const el of vis){const r=el.getBoundingClientRect();if(x<r.left-4||x>r.right+4||y<r.top-4||y>r.bottom+4)continue;
      let m='';if(y<r.top+EDGE)m='n';else if(y>r.bottom-EDGE)m='s';if(x<r.left+EDGE)m+='w';else if(x>r.right-EDGE)m+='e';
      if(!m&&y<r.top+40&&!(e.target.closest&&e.target.closest('button,select,input,a,label,summary')))m='move';
      return {el,mode:m};}
    return null;}
  const TOL=6,rel=(el,m)=>{const q=el.getBoundingClientRect();return {x:q.left-m.left,y:q.top-m.top,w:q.width,h:q.height};};
  const ov=(a,b,c,d)=>a<d-1&&c<b-1;
  // The biggest empty rectangle around (px,py) that keeps GAP from every other window and PAD from the edge.
  function freeRect(px,py,obs,B){const ex=obs.map(o=>({l:o.x-GAP,r:o.x+o.w+GAP,t:o.y-GAP,b:o.y+o.h+GAP}));
    if(px<B.l||px>B.r||py<B.t||py>B.b||ex.some(o=>px>o.l&&px<o.r&&py>o.t&&py<o.b))return null;
    let best=null;
    for(const l of [B.l,...ex.map(o=>o.r).filter(v=>v<=px)])for(const r of [B.r,...ex.map(o=>o.l).filter(v=>v>=px)]){if(r-l<MINW)continue;let t=B.t,b=B.b,ok=true;
      for(const o of ex){if(o.l>=r||o.r<=l)continue;if(o.b<=py)t=Math.max(t,o.b);else if(o.t>=py)b=Math.min(b,o.t);else{ok=false;break;}}
      if(ok&&b-t>=MINH&&(!best||(r-l)*(b-t)>best.w*best.h))best={x:l,y:t,w:r-l,h:b-t};}
    return best;}
  // A window that sat flush against the space a window left, and spans no more than it, grows into that space.
  function grow(P,h,B){
    for(const [o,q] of P){const rest=[...P].filter(([p])=>p!==o).map(([,v])=>v);
      const inX=q.x>=h.x-TOL&&q.x+q.w<=h.x+h.w+TOL,inY=q.y>=h.y-TOL&&q.y+q.h<=h.y+h.h+TOL;
      if(inX&&Math.abs(q.y-(h.y+h.h+GAP))<=TOL){let t=B.t;for(const v of rest)if(ov(q.x,q.x+q.w,v.x,v.x+v.w)&&v.y+v.h<=q.y+1)t=Math.max(t,v.y+v.h+GAP);if(t<q.y-1){q.h+=q.y-t;q.y=t;}}
      else if(inX&&Math.abs(q.y+q.h+GAP-h.y)<=TOL){let b=B.b;for(const v of rest)if(ov(q.x,q.x+q.w,v.x,v.x+v.w)&&v.y>=q.y+q.h-1)b=Math.min(b,v.y-GAP);if(b>q.y+q.h+1)q.h=b-q.y;}
      else if(inY&&Math.abs(q.x-(h.x+h.w+GAP))<=TOL){let l=B.l;for(const v of rest)if(ov(q.y,q.y+q.h,v.y,v.y+v.h)&&v.x+v.w<=q.x+1)l=Math.max(l,v.x+v.w+GAP);if(l<q.x-1){q.w+=q.x-l;q.x=l;}}
      else if(inY&&Math.abs(q.x+q.w+GAP-h.x)<=TOL){let rr=B.r;for(const v of rest)if(ov(q.y,q.y+q.h,v.y,v.y+v.h)&&v.x>=q.x+q.w-1)rr=Math.min(rr,v.x-GAP);if(rr>q.x+q.w+1)q.w=rr-q.x;}}}
  // Where a dropped window goes: the middle of another window swaps the two, near its edge splits its space,
  // and empty space is filled. Returns every window's new rectangle, or null to place it freely.
  function plan(el,px,py){const {m,r,base}=act,W=m.width,H=m.height,P=new Map([...base].map(([o,q])=>[o,{...q}]));P.set(el,{...r});
    const tgt=[...base.keys()].filter(o=>o!==el).sort((a,b)=>(+b.style.zIndex||0)-(+a.style.zIndex||0)).find(o=>{const q=base.get(o);return px>=q.x&&px<=q.x+q.w&&py>=q.y&&py<=q.y+q.h;});
    let kind;
    if(tgt){const T=base.get(tgt),fx=(px-T.x)/T.w,fy=(py-T.y)/T.h,d={w:fx,e:1-fx,n:fy,s:1-fy},side=Object.keys(d).reduce((a,b)=>d[b]<d[a]?b:a),hz=side==='w'||side==='e',half=Math.floor(((hz?T.w:T.h)-GAP)/2);
      if(d[side]<.28&&half>=(hz?MINW:MINH)){kind='Split';const D={...T},N={...T};
        if(hz){D.w=half;N.w=T.w-half-GAP;if(side==='w')N.x=T.x+half+GAP;else D.x=T.x+T.w-half;}
        else{D.h=half;N.h=T.h-half-GAP;if(side==='n')N.y=T.y+half+GAP;else D.y=T.y+T.h-half;}
        P.set(el,D);P.set(tgt,N);}
      else{kind='Swap';P.set(el,{...T});P.set(tgt,{...r});}}
    else{const F=freeRect(px,py,[...base].filter(([o])=>o!==el).map(([,q])=>q),act.B);if(!F)return null;kind='Fill';P.set(el,F);}
    if(kind!=='Swap')grow(P,r,act.B);
    return {kind,P};}
  // Windows whose edges lie on the line being resized (either side of the gap) move with it, like a divider.
  function links(el,mode,m){const out=[],all=wins(),R=new Map(all.map(o=>[o,rel(o,m)]));
    for(const c of mode){const hz=c==='w'||c==='e',me=R.get(el),X=c==='w'?me.x:c==='e'?me.x+me.w:c==='n'?me.y:me.y+me.h,far=c==='e'||c==='s'?GAP:-GAP;
      const lo=q=>hz?q.x:q.y,hi=q=>hz?q.x+q.w:q.y+q.h,plo=q=>hz?q.y:q.x,phi=q=>hz?q.y+q.h:q.x+q.w;
      const nearEdge=c==='w'||c==='n'?lo:hi,farEdge=c==='w'||c==='n'?hi:lo,farSide={w:'e',e:'w',n:'s',s:'n'}[c];
      const group=[el];let grew=true;
      while(grew){grew=false;for(const o of all){if(group.includes(o))continue;const q=R.get(o);
        const same=Math.abs(nearEdge(q)-X)<=TOL,across=Math.abs(farEdge(q)-(X+far))<=TOL;
        if((same||across)&&group.some(g=>ov(plo(q),phi(q),plo(R.get(g)),phi(R.get(g))))){group.push(o);out.push({o,line:c,side:same?c:farSide,off:same?0:far,q});grew=true;}}}}
    return out;}
  // The outer edges windows fill to: PAD from the screen edge, or a window edge that already sits a little further in.
  function bounds(R,W,H){const pick=(edge,vals,dir)=>{for(const v of vals)if(dir*(v-edge)>0&&dir*(v-edge)<=8)edge=v;return edge;};const q=[...R.values()];
    return {l:pick(PAD,q.map(o=>o.x),1),t:pick(PAD,q.map(o=>o.y),1),r:pick(W-PAD,q.map(o=>o.x+o.w),-1),b:pick(H-PAD,q.map(o=>o.y+o.h),-1)};}
  const ghosts=[];
  function preview(pl){let i=0;
    if(pl){const q=pl.P.get(act.el);sp.style.display='flex';sp.style.left=q.x+'px';sp.style.top=q.y+'px';sp.style.width=q.w+'px';sp.style.height=q.h+'px';
      sp.innerHTML='<div>'+({Swap:'Swap',Split:'Split',Fill:'Fill the space'})[pl.kind]+'<small>Hold Alt to place freely</small></div>';
      for(const [o,q] of pl.P){if(o===act.el)continue;const b=act.base.get(o);if(Math.abs(b.x-q.x)+Math.abs(b.y-q.y)+Math.abs(b.w-q.w)+Math.abs(b.h-q.h)<2)continue;
        const g=ghosts[i]||(ghosts[i]=sp.parentElement.appendChild(Object.assign(document.createElement('div'),{className:'snapGhost'})));i++;
        Object.assign(g.style,{display:'block',left:q.x+'px',top:q.y+'px',width:q.w+'px',height:q.h+'px'});}}
    for(;i<ghosts.length;i++)ghosts[i].style.display='none';}
  function drag(e){const {el,mode,m,r}=act,dx=e.clientX-act.px,dy=e.clientY-act.py,W=m.width,H=m.height,xs=[PAD,W-PAD],ys=[PAD,H-PAD];
    const lk=mode==='move'||e.altKey?[]:act.links,moving=new Set(act.links.map(k=>k.o));
    for(const o of wins()){if(o===el||moving.has(o))continue;const q=act.base.get(o)||rel(o,m),l=q.x,t=q.y;xs.push(l,l+q.w,l-GAP,l+q.w+GAP);ys.push(t,t+q.h,t-GAP,t+q.h+GAP);}
    const near=(v,a)=>{if(e.altKey)return null;let b=null;for(const c of a)if(Math.abs(c-v)<=SNAP&&(b===null||Math.abs(c-v)<Math.abs(b-v)))b=c;return b;};
    let x=r.x,y=r.y,w=r.w,h=r.h,gx=null,gy=null,s;act.snap=null;act.plan=null;
    if(mode==='move'){x=r.x+dx;y=r.y+dy;
      if((s=near(x,xs))!==null){x=s;gx=s;}else if((s=near(x+w,xs))!==null){x=s-w;gx=s;}
      if((s=near(y,ys))!==null){y=s;gy=s;}else if((s=near(y+h,ys))!==null){y=s-h;gy=s;}
      x=Math.max(0,Math.min(W-w,x));y=Math.max(0,Math.min(H-h,y));
      const half=(W-2*PAD-GAP)/2,full=H-2*PAD;
      if(e.clientX<=m.left+10)act.snap={x:PAD,y:PAD,w:half,h:full};else if(e.clientX>=m.right-10)act.snap={x:PAD+half+GAP,y:PAD,w:half,h:full};else if(e.clientY<=m.top+10)act.snap={x:PAD,y:PAD,w:W-2*PAD,h:full};
      else if(!e.altKey)act.plan=plan(el,e.clientX-m.left,e.clientY-m.top);
    }else{let x2=r.x+r.w,y2=r.y+r.h;
      if(mode.includes('w')){x=r.x+dx;if((s=near(x,xs))!==null){x=s;gx=s;}x=Math.max(0,Math.min(x2-MINW,x));}
      if(mode.includes('e')){x2=r.x+r.w+dx;if((s=near(x2,xs))!==null){x2=s;gx=s;}x2=Math.min(W,Math.max(x+MINW,x2));}
      if(mode.includes('n')){y=r.y+dy;if((s=near(y,ys))!==null){y=s;gy=s;}y=Math.max(0,Math.min(y2-MINH,y));}
      if(mode.includes('s')){y2=r.y+r.h+dy;if((s=near(y2,ys))!==null){y2=s;gy=s;}y2=Math.min(H,Math.max(y+MINH,y2));}
      // keep every window on a moving line at least its minimum size
      const v={w:x,e:x2,n:y,s:y2};
      for(const k of lk){const hz=k.line==='w'||k.line==='e',mn=hz?MINW:MINH,q=k.q,lo=hz?q.x:q.y,hi=hz?q.x+q.w:q.y+q.h;
        v[k.line]=k.side==='w'||k.side==='n'?Math.min(v[k.line],hi-mn-k.off):Math.max(v[k.line],lo+mn-k.off);}
      x=v.w;x2=v.e;y=v.n;y2=v.s;w=x2-x;h=y2-y;
      act.lr=new Map();
      for(const k of act.links){const q=act.lr.get(k.o)||{...k.q};
        if(lk.length){const val=v[k.line]+k.off;if(k.side==='w'){q.w+=q.x-val;q.x=val;}else if(k.side==='e')q.w=val-q.x;else if(k.side==='n'){q.h+=q.y-val;q.y=val;}else q.h=val-q.y;}
        act.lr.set(k.o,q);}
      for(const [o,q] of act.lr)setVars(o,{x:q.x/W,y:q.y/H,w:q.w/W,h:q.h/H});}
    act.cur={x,y,w,h};setVars(el,{x:x/W,y:y/H,w:w/W,h:h/H});
    const free=!act.snap&&!act.plan;el.classList.toggle('planning',!free);
    sv.style.display=gx!==null&&free?'block':'none';if(gx!==null)sv.style.left=gx+'px';
    sh.style.display=gy!==null&&free?'block':'none';if(gy!==null)sh.style.top=gy+'px';
    if(act.snap){sp.style.display='block';sp.innerHTML='';sp.style.left=act.snap.x+'px';sp.style.top=act.snap.y+'px';sp.style.width=act.snap.w+'px';sp.style.height=act.snap.h+'px';preview(null);}
    else if(act.plan)preview(act.plan);else{sp.style.display='none';preview(null);}}
  function end(){if(!act)return;const {el,m}=act,S=L[view()]||(L[view()]={}),put=(o,f)=>{S[o.id]={x:f.x/m.width,y:f.y/m.height,w:f.w/m.width,h:f.h/m.height};setVars(o,S[o.id]);};
    const f=act.snap||(act.plan&&act.plan.P.get(el))||act.cur;
    if(f){main.classList.add('settle');clearTimeout(end.t);end.t=setTimeout(()=>main.classList.remove('settle'),260);
      put(el,f);if(act.plan&&!act.snap)for(const [o,q] of act.plan.P)if(o!==el)put(o,q);
      if(act.lr)for(const [o,q] of act.lr)put(o,q);save();}
    el.classList.remove('dragging','planning');sv.style.display=sh.style.display=sp.style.display='none';preview(null);document.body.style.userSelect='';act=null;
    if(cur.view==='lab')$('term').scrollTop=$('term').scrollHeight;}
  main.addEventListener('pointermove',e=>{if(act)return drag(e);const h=hit(e),c=h&&h.mode?CUR[h.mode]:'';if(document.body.dataset.cur!==c)document.body.dataset.cur=c;});
  main.addEventListener('pointerleave',()=>{if(!act)document.body.dataset.cur='';});
  main.addEventListener('pointerdown',e=>{if(e.button)return;const h=hit(e);if(!h)return;h.el.style.zIndex=++z;if(!h.mode)return;
    e.preventDefault();e.stopPropagation();const m=main.getBoundingClientRect(),r=h.el.getBoundingClientRect();
    act={el:h.el,mode:h.mode,px:e.clientX,py:e.clientY,m,r:{x:r.left-m.left,y:r.top-m.top,w:r.width,h:r.height},snap:null,cur:null,plan:null,lr:null,
      base:new Map(wins().map(o=>[o,rel(o,m)])),links:h.mode==='move'?[]:links(h.el,h.mode,m)};
    act.B=bounds(act.base,m.width,m.height);h.el.classList.add('dragging');try{main.setPointerCapture(e.pointerId);}catch(x){}document.body.style.userSelect='none';},true);
  main.addEventListener('pointerup',end);main.addEventListener('pointercancel',end);
  $('resetLayout').onclick=()=>{L={};save();for(const el of IDS.map($)){el.classList.remove('fw');el.style.zIndex='';for(const k of ['x','y','w','h'])el.style.removeProperty('--'+k);}main.classList.remove('free');layoutApply();notify('Layout reset to the default.');};
  $('guideClose').onclick=()=>setGuidePop(false);
  window.addEventListener('resize',()=>{renderGuideWin();layoutApply();});
  DESK.addEventListener?.('change',()=>{if(cur.view==='lab')renderBrief();renderGuideWin();layoutApply();});
  let seen=null;const sync=()=>{$('checkWin').hidden=cur.view!=='lab';if(cur!==seen){seen=cur;$('checkBody').scrollTop=0;}renderGuideWin();layoutApply();};
  const ra0=renderAll;renderAll=function(){ra0();sync();};
  sync();
})();

// ---------- rewards: stage ranks, XP and levels, combos, trophies, sound, device info ----------
(function(){
  const KEY='lab4net-fun-v1';let F={ranks:{},ach:{},days:[],runs:{},cleared:{},sound:true};
  try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');if(p&&typeof p==='object')F=Object.assign(F,p);}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(F));}catch(e){}};
  window.l4nFun={run:()=>run(),save:()=>save(),check:()=>checkGlobal(),unlock:id=>unlock(id),forget:t=>{delete F.ranks[t];delete F.cleared[t];delete F.runs[t];save();},sfx:{clear:()=>SFX.clear(),start:()=>[523,659,784].forEach((f,i)=>tone(f,.12,'square',i*.1,.05)),tick:()=>tone(1200,.03,'square',0,.03),timeup:()=>{tone(392,.25,'sawtooth',0,.06);tone(262,.4,'sawtooth',.2,.06);},echo:()=>tone(1568,.03,'square',0,.018),drop:()=>tone(196,.09,'triangle',0,.04),unreach:()=>{tone(220,.05,'sawtooth',0,.03);tone(165,.07,'sawtooth',.05,.03);},flood:()=>{tone(392,.05,'triangle',0,.016);tone(523,.05,'triangle',.05,.016);tone(659,.07,'triangle',.1,.016);}}};
  const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');

  // sound (generated, no audio files)
  let ac=null;
  function tone(freq,dur,type,when,vol){if(!F.sound)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();const t=ac.currentTime+(when||0),o=ac.createOscillator(),g=ac.createGain();
    o.type=type||'square';o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(vol||.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+dur+.02);}catch(e){}}
  const SFX={key:()=>tone(880,.04,'square',0,.02),combo:n=>tone(440+Math.min(n,12)*60,.07,'square',0,.03),
    err:()=>{tone(160,.18,'sawtooth',0,.05);tone(120,.22,'sawtooth',.08,.05);},ok:()=>{tone(660,.08);tone(990,.14,'square',.08);},fail:()=>{tone(300,.12,'triangle',0,.07);tone(200,.22,'triangle',.1,.07);},
    clear:()=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,.18,'square',i*.09,.06)),ach:()=>{tone(1047,.1,'triangle',0,.08);tone(1568,.28,'triangle',.1,.08);}};
  const soundBtn=$('sound'),soundLabel=()=>{soundBtn.textContent='Sound '+(F.sound?'on':'off');};
  soundBtn.onclick=()=>{F.sound=!F.sound;save();soundLabel();SFX.ok();};soundLabel();

  // XP and levels (derived from what has been earned, so nothing is counted twice)
  const TITLES=[[0,'Cable Runner'],[150,'Packet Pusher'],[400,'Switch Hand'],[800,'Route Finder'],[1300,'Subnet Slicer'],[1900,'ACL Enforcer'],[2600,'Core Engineer'],[3400,'CCNA Ready']];
  const BONUS={S:100,A:60,B:30,C:10,D:0},ORDER='DCBAS';
  function xp(){let x=0;for(const l of LABS)if(!l.exam&&progress[l.title])x+=100+(BONUS[F.ranks[l.title]]||0);const d=progress.drill;if(d)x+=Math.min(100,d.r)*5;
    x+=Object.values(progress.quiz||{}).filter(v=>v===true).length*20;
    if(window.lessonStats){const ls=lessonStats();x+=ls.read*30+ls.correct*10;}if(window.examStats)x+=examStats().cleared*80;if(window.sandboxStats)x+=sandboxStats().done*60;if(window.campaignStats)x+=campaignStats().cleared*150;return x+Object.keys(F.ach).length*50;}
  function level(x){let i=0;while(i+1<TITLES.length&&x>=TITLES[i+1][0])i++;const lo=TITLES[i][0],hi=i+1<TITLES.length?TITLES[i+1][0]:lo;return {n:i+1,title:TITLES[i][1],pct:hi>lo?(x-lo)/(hi-lo)*100:100,next:hi>lo?hi-x:0};}
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  function streak(){const set=new Set(F.days);let n=0;const d=new Date();if(!set.has(today()))d.setDate(d.getDate()-1);
    for(;;){const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(!set.has(k))break;n++;d.setDate(d.getDate()-1);}return n;}
  function markDay(){const t=today();if(F.days[F.days.length-1]!==t){F.days.push(t);F.days=F.days.slice(-90);save();}}
  let lastLevel=null;
  function renderHud(){const x=xp(),lv=level(x),st=streak();
    $('hud').innerHTML=`<b>LV ${lv.n}</b><span>${lv.title}</span><div class="xpbar" title="${x} XP${lv.next?' · '+lv.next+' to the next level':''}"><i style="width:${lv.pct}%"></i></div>${st>1?`<span class="streak" title="Days studied in a row">${st}-day streak</span>`:''}`;
    if(lastLevel!==null&&lv.n>lastLevel){toast('Level up','Level '+lv.n+': '+lv.title,'Keep going.','▲');SFX.clear();}lastLevel=lv.n;}

  // trophies
  const ACH=[['first','First Clear','Pass your first lab.'],['nohelp','No Hand-Holding','Pass a lab with the guide off and the walkthrough closed.'],['flawless','Flawless','Pass a lab without a single rejected command.'],['srank','S Rank','Earn an S on any lab.'],
    ['combo10','Combo x10','Enter 10 valid commands in a row.'],['tracer','Tracer','Get your first successful ping.'],['bouncer','Bouncer','Watch an ACL drop a packet.'],['subnet','Subnet Sniper','Get 30 subnetting fields right.'],
    ['theory','Theory Check','Answer every theory question correctly.'],['half','Halfway There','Pass half of the labs.'],['all','Full Clear','Pass every lab.'],['streak3','Three-Day Streak','Study three days in a row.'],
    ['detective','Detective','Solve a troubleshooting incident with no clues, guide or walkthrough.'],['faults','Fault Finder','Solve every troubleshooting incident.'],['scholar','Bookworm','Read every lesson.'],
    ['exam','Exam Ready','Clear an exam sim before the clock runs out.'],['saboteur','Fault Hunter','Clear a sabotage exam: hidden faults, no help.'],['daily3','Daily Grind','Clear three daily challenges.'],
    ['builder','Builder','Complete a sandbox challenge.'],['architect','Architect','Complete every sandbox challenge.'],['boss','Boss Slayer','Win a boss fight: two or three hidden faults, one clock.'],['chapter','Stage Clear','Clear your first campaign stage.'],['campaign','Harbor Street Legend','Clear every campaign stage.']];
  function toast(kicker,title,sub,icon){const t=document.createElement('div');t.className='toast';t.innerHTML=`<i>${icon||'★'}</i><small>${kicker}</small><b>${title}</b><span>${sub}</span>`;$('toasts').appendChild(t);setTimeout(()=>t.remove(),4800);}
  const fresh=[];
  function unlock(id){if(F.ach[id])return;F.ach[id]=Date.now();save();const a=ACH.find(a=>a[0]===id);fresh.push(a[1]);toast('Trophy unlocked',a[1],a[2]);SFX.ach();renderHud();}
  function checkGlobal(){const real=LABS.filter(l=>!l.exam),passed=real.filter(l=>progress[l.title]).length;if(passed>=Math.ceil(real.length/2))unlock('half');if(passed===real.length)unlock('all');{const inc=LABS.filter(l=>l.kind==='incident');if(inc.length&&inc.every(l=>progress[l.title]))unlock('faults');}
    if(progress.drill&&progress.drill.r>=30)unlock('subnet');if(typeof QUIZ!=='undefined'&&QUIZ.every((q,i)=>(progress.quiz||{})[i]===true))unlock('theory');if(streak()>=3)unlock('streak3');if(window.lessonStats){const ls=lessonStats();if(ls.total&&ls.read===ls.total)unlock('scholar');}renderHud();}
  $('trophies').onclick=()=>{const x=xp(),lv=level(x);
    dialog('Trophy case',`<div class="result"><div class="stamp rS" style="font-size:96px;animation:none">${lv.n}</div><div><div class="eyebrow">Level ${lv.n}</div><h2 style="margin:0 0 6px">${lv.title}</h2><p>${x} XP${lv.next?' · '+lv.next+' XP to the next level':' · top level reached'}${streak()>1?' · '+streak()+'-day streak':''}</p></div></div>
      <h3>Trophies ${Object.keys(F.ach).length}/${ACH.length}</h3><div class="trophy-grid">${ACH.map(a=>`<div class="trophy${F.ach[a[0]]?'':' locked'}"><i>${F.ach[a[0]]?'★':'☆'}</i><b>${a[1]}</b><span>${a[2]}</span></div>`).join('')}</div>
      <h3>Stage ranks</h3><div class="table-wrap"><table><thead><tr><th>Lab</th><th>Status</th><th>Best rank</th></tr></thead><tbody>${LABS.map(l=>`<tr><td>${l.title}</td><td>${progress[l.title]?'Passed':'Not yet'}</td><td>${F.ranks[l.title]||'—'}</td></tr>`).join('')}</tbody></table></div>
      <p style="margin-top:14px">Ranks come from results, not speed. Start a lab over, get every check passing on your own, and test your work yourself with a show, ping or similar command. Extra commands and time are never counted, so check as often as you like. Using the guide (A), the walkthrough (B) or incident clues lowers the rank; rejected commands only cost after the first two.</p>`);};

  // per-lab run: time, commands, mistakes, checks run, help used.
  // Ranks are earned on results: every check passes (a clear), the work is your own, and you tested it yourself.
  // Extra commands and time never cost anything, so show, ping and other checks are always free.
  const CHECKCMD=/^\s*(do\s+)?(sh(o(w)?)?|ping|traceroute|tracert|telnet|ssh|ipconfig|arp|debug|netstat)\b/i;
  let combo=0;
  const run=()=>cur&&cur.lab?F.runs[cur.lab.title]:null;
  function ensureRun(isFresh){const t=cur.lab.title;if(isFresh||!F.runs[t]||!cur.journal.length)F.runs[t]={sec:0,cmds:0,errs:0,help:false,walk:false,max:0,done:false,valid:!cur.journal.length};save();}
  function renderRunHud(){if(cur.view!=='lab')return;const r=run(),t=cur.lab.title,el=$('runHud');if(!r)return;
    el.textContent=!r.valid?(F.ranks[t]?'Best rank '+F.ranks[t]:'Start over to play for a rank'):r.done?'Cleared · rank '+(r.rank||F.ranks[t]||'—'):`${mmss(r.sec)} · ${r.cmds} cmds · ${r.errs} rejected`;}
  function renderCombo(broke){const el=$('combo');el.className='';void el.offsetWidth;if(broke){el.textContent='Combo break';el.className='break';setTimeout(()=>{if(el.className==='break')el.textContent='';},700);return;}
    el.textContent=combo>=3?'Combo ×'+combo:'';if(combo>=3)el.className='pop';}
  setInterval(()=>{if(!cur||cur.view!=='lab'||document.visibilityState!=='visible')return;const r=run();if(!r||r.done||!r.valid||!r.cmds)return;
    r.sec++;r.help=r.help||guideOn||guidePop;r.walk=r.walk||!!cur.showSol;if(r.sec%5===0)save();renderRunHud();},1000);
  const closeResult=()=>{$('resultCard').hidden=true;};
  const ol0=openLab;openLab=function(idx,isFresh){closeResult();ol0(idx,isFresh);combo=0;ensureRun(!!isFresh);renderCombo();renderRunHud();};
  const ex0=execute;execute=function(line){if(!cur||cur.view!=='lab'||!line.trim())return ex0(line);
    const s=cur.sess[cur.sel],n0=s.lines.length;ex0(line);const r=run()||{done:true,valid:false,max:0,cmds:0};
    const bad=(s.lastOut||[]).some(l=>/^% (Invalid|Incomplete|Ambiguous|Unrecognized|Unknown|Bad|Please|Login invalid|Password too short)|^%Inconsistent|^Command rejected|^Bad mask|is not recognized as an internal|^Error: unrecognized|^Bad option|^Usage: |^Permission denied/.test(l));
    markDay();if(!r.done&&r.valid){r.cmds++;if(bad)r.errs++;else if(CHECKCMD.test(line))r.checks=(r.checks||0)+1;r.help=r.help||guideOn||guidePop;}
    if(bad){const had=combo>=3;combo=0;SFX.err();renderCombo(had);}
    else{combo++;if(r.valid&&combo>r.max)r.max=combo;if(combo>=3)SFX.combo(combo);else SFX.key();if(combo>=10)unlock('combo10');renderCombo();}
    if(TRACE){if(TRACE.ok){SFX.ok();unlock('tracer');}else{SFX.fail();if(TRACE.f.blocked||(TRACE.r&&TRACE.r.blocked))unlock('bouncer');}}
    save();renderRunHud();};
  const cel0=celebrate;celebrate=function(){cel0();SFX.clear();const lab=cur.lab,t=lab.title,r=run(),before=xp()-(F.cleared[t]?0:100),snap=cur;F.cleared[t]=true;fresh.length=0;unlock('first');
    if(r&&r.valid&&!r.done&&r.cmds>0){r.done=true;r.help=r.help||guideOn||guidePop;r.walk=r.walk||!!cur.showSol;
      const clues=r.clues||0,checks=r.checks||0,lab0=lab;
      // Help and repeated typos are the only deductions; a run with no checks of your own tops out at A.
      let score=100-(r.walk?25:0)-(r.help?15:0)-clues*5-Math.min(10,Math.max(0,r.errs-2)*2);if(!checks)score=Math.min(score,94);
      const rank=score>=95?'S':score>=85?'A':score>=70?'B':score>=55?'C':'D',prev=F.ranks[t];r.rank=rank;
      if(!prev||ORDER.indexOf(rank)>ORDER.indexOf(prev))F.ranks[t]=rank;
      if(!r.help&&!r.walk&&!clues){unlock('nohelp');if(lab.kind==='incident')unlock('detective');}if(r.errs===0)unlock('flawless');if(rank==='S')unlock('srank');
      save();checkGlobal();const gain=xp()-before,got=fresh.slice();
      setTimeout(()=>{if(cur!==snap||cur.view!=='lab')return;
        $('resultBody').innerHTML=`<div class="result"><div class="stamp r${rank}">${rank}</div><div class="rrows">
          <div style="--i:0"><span>Checks passed</span><b>${lab0.checks.length}/${lab0.checks.length}</b></div>
          <div style="--i:1"><span>Tested it yourself</span><b>${checks?checks+' check'+(checks>1?'s':'')+' run':'No <small>needed for S</small>'}</b></div>
          <div style="--i:2"><span>Rejected commands</span><b>${r.errs} <small>${r.errs>2?'first 2 free':'free'}</small></b></div>
          <div style="--i:3"><span>Time · commands</span><b>${mmss(r.sec)} · ${r.cmds} <small>not scored</small></b></div>
          <div style="--i:4"><span>Help used</span><b>${[r.walk&&'Walkthrough',r.help&&'Guide',clues&&clues+(clues>1?' clues':' clue')].filter(Boolean).join(' + ')||'None'}</b></div></div></div>
          <p class="xpgain">${gain>0?'+'+gain+' XP':'No new XP · beat your best rank to earn more'}${prev&&prev!==F.ranks[t]?` · best rank ${prev} → ${F.ranks[t]}`:prev?` · best rank ${F.ranks[t]}`:''}</p>
          ${got.length?`<p>Trophies unlocked: <b>${got.join(', ')}</b></p>`:''}
          <div class="actions"><button class="btn primary" id="rNext">Next lab</button><button class="btn" id="rRetry">Retry for a better rank</button></div>`;
        $('resultTitle').textContent='Stage clear';$('resultCard').hidden=false;$('rNext').onclick=()=>{closeResult();const n=$('nextLab');if(n)n.click();};$('rRetry').onclick=()=>{closeResult();openLab(snap.idx,true);};},1500);
    }else{save();checkGlobal();}
    renderRunHud();};
  $('resultClose').onclick=closeResult;
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeResult();});
  document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#dCheck,[data-answer]')){markDay();setTimeout(checkGlobal,60);}});

  // rank badges in the lab library
  const lib0=library;library=function(){lib0();const deco=()=>$('dialogBody').querySelectorAll('.lab-card[data-lab]').forEach(c=>{const rk=F.ranks[LABS[+c.dataset.lab].title];if(rk&&!c.querySelector('.rankbadge'))c.insertAdjacentHTML('afterbegin',`<i class="rankbadge r${rk}">${rk}</i>`);});
    deco();const q=$('labSearch');if(q)q.addEventListener('input',()=>setTimeout(deco,0));};
  $('library').onclick=library;

  // device details on hover
  const tip=$('tip');let tipDev=null;
  $('topo').addEventListener('pointermove',e=>{const g=e.target.closest&&e.target.closest('[data-dev]');if(!g||document.body.dataset.cur||cur.view!=='lab'){tip.hidden=true;tipDev=null;return;}
    const d=cur.net.devs[g.dataset.dev];if(!d)return;
    if(tipDev!==g.dataset.dev||tip.hidden){tipDev=g.dataset.dev;
      const rows=Object.values(d.ifs).filter(i=>i.link||i.ip!==null).slice(0,9).map(i=>{const up=ifUp(cur.net,d,i);return `<tr><td>${shortIf(i.name)}</td><td>${i.ip!==null?n2ip(i.ip)+'/'+i.len:'no address'}</td><td class="${up?'good':'bad'}">${up?'up':'down'}</td></tr>`;}).join('');
      tip.innerHTML=`<b>${esc(d.hostname)}</b><span>${d.type==='pc'?(d.phone?'IP phone':d.services?'Server':'Host'):d.type==='router'?'Router':d.l3?'Layer 3 switch':'Switch'}${d.type!=='router'&&d.gw!=null?' · gateway '+n2ip(d.gw):''}</span><table>${rows}</table>`;tip.hidden=false;}
    tip.style.left=Math.min(innerWidth-280,e.clientX+16)+'px';tip.style.top=Math.min(innerHeight-tip.offsetHeight-10,e.clientY+20)+'px';});
  $('topo').addEventListener('pointerleave',()=>{tip.hidden=true;tipDev=null;});
  $('topo').addEventListener('pointerdown',()=>{tip.hidden=true;tipDev=null;});

  for(const l of LABS)if(progress[l.title])F.cleared[l.title]=true;
  ensureRun(false);renderHud();renderRunHud();checkGlobal();
})();

// ---------- troubleshooting clues, CCNA objective tags and study map (ideas from the chatgpt/improvements branch) ----------
// Function declarations so the base renderBrief can call them on the very first render.
function ccnaTags(l){if(!l||!l.ccna||!l.ccna.length)return '';return `<div class="ccna-tags" aria-label="CCNA 200-301 objectives">${l.ccna.map(id=>`<span title="CCNA 200-301 v1.1, objective ${id}"><b>${id}</b>${esc(CCNA_OBJECTIVES[id])}</span>`).join('')}</div>`;}
function clueStore(){if(!window.l4nClues){let m={};try{m=JSON.parse(localStorage.getItem('lab4net-incident-hints')||'{}');if(!m||typeof m!=='object'||Array.isArray(m))m={};}catch(e){m={};}window.l4nClues=m;}return window.l4nClues;}
function clueLevel(t){const n=clueStore()[t];return Number.isInteger(n)?Math.max(0,Math.min(3,n)):0;}
function setClueLevel(t,n){clueStore()[t]=n;try{localStorage.setItem('lab4net-incident-hints',JSON.stringify(clueStore()));}catch(e){}
  const f=window.l4nFun;if(f&&cur&&cur.lab&&cur.lab.title===t){const r=f.run();if(r&&r.valid&&!r.done&&n>(r.clues||0)){r.clues=n;f.save();}}}
function clueHtml(l){if(l.kind!=='incident')return '';const n=clueLevel(l.title);
  return `<div class="clues"><div class="clues-head"><b>Clues</b><span>${n}/3 revealed · each costs 5 rank points</span></div>${l.hints.slice(0,n).map((c,i)=>`<div class="clue"><i>${['Direction','Evidence','Repair'][i]}</i><p>${esc(c)}</p></div>`).join('')}<div class="actions"><button class="small-btn" id="clueNext" type="button"${n>=3?' disabled':''}>${n>=3?'All clues revealed':n?'Reveal next clue':'Stuck? Reveal a clue'}</button>${n?'<button class="small-btn" id="clueHide" type="button">Hide clues</button>':''}</div></div>`;}
function bindClues(){if(!cur||!cur.lab||cur.lab.kind!=='incident')return;const t=cur.lab.title,go=n=>{setClueLevel(t,n);renderBrief();};
  if($('clueNext'))$('clueNext').onclick=()=>go(Math.min(3,clueLevel(t)+1));if($('clueHide'))$('clueHide').onclick=()=>go(0);}
function studyMap(){
  const passed=LABS.filter(l=>!l.exam&&progress[l.title]).length,builds=LABS.filter(l=>l.kind==='build'&&!l.capstone),incs=LABS.filter(l=>l.kind==='incident'),caps=LABS.filter(l=>l.capstone);
  const rec=LABS.find(l=>!progress[l.title]&&(l.kind==='build'||progress[l.baseTitle]));
  const btn=l=>`<button class="small-btn${progress[l.title]?' passed':''}" data-study-lab="${LABS.indexOf(l)}">${progress[l.title]?'✓ ':''}${l.kind==='incident'?'⚠ ':''}${esc(l.kind==='incident'?l.title.slice(0,11):l.title)}</button>`;
  dialog('CCNA study map',`<p>Your practice mapped to the <b>CCNA 200-301 v${CCNA_SCOPE.version}</b> exam domains. ${passed}/${LABS.filter(l=>!l.exam).length} missions passed: ${builds.filter(l=>progress[l.title]).length}/${builds.length} build labs, ${incs.filter(l=>progress[l.title]).length}/${incs.length} troubleshooting incidents${caps.length?` and ${caps.filter(l=>progress[l.title]).length}/${caps.length} capstones`:''}.</p>
    ${rec?`<div class="study-next"><span class="eyebrow">Next up</span><button class="btn primary" data-study-lab="${LABS.indexOf(rec)}">${esc(rec.title)} →</button><p>${rec.kind==='incident'?'You have passed the lab it is based on. Now find and fix a fault in that same network.':'Build the skill first, then try the incident that breaks it.'}</p></div>`:'<p>Every mission passed. Replay the incidents with the guide off and no clues for a Detective run.</p>'}
    <div class="study-domains">${CCNA_DOMAINS.map(([id,name,weight])=>{const m=LABS.filter(l=>!l.exam&&l.ccna.some(c=>c.startsWith(id+'.'))),done=m.filter(l=>progress[l.title]).length;
      return `<section class="study-domain"><div class="sd-head"><b>${id}. ${esc(name)}</b><span>${weight}% of the exam</span></div>${m.length?`<div class="study-meter" aria-label="${done} of ${m.length} passed"><span style="width:${done/m.length*100}%"></span></div><p>${done}/${m.length} missions passed</p><div class="study-links">${m.map(btn).join('')}</div>`:`<p>No hands-on lab yet. The topic lessons below and the theory check cover this domain.</p><button class="small-btn" id="studyTheory">Theory check →</button>`}</section>`;}).join('')}</div>
    <p class="study-note">A mission covers part of an objective, not all of it, so this is a practice map rather than an exam-readiness score. Not simulated: wireless and automation (topic lessons and the theory check cover both), and IPv6 routing protocols. Capstones open with the step-by-step guide off; switch it on in a capstone if you need it. Domain weights are from Cisco's 200-301 v1.1 exam topics.</p>`);
  $('dialogBody').querySelectorAll('[data-study-lab]').forEach(b=>b.onclick=()=>{$('dialog').close();openLab(+b.dataset.studyLab);});
  if($('studyTheory'))$('studyTheory').onclick=()=>{$('dialog').close();openPractice('quiz');};}
$('studyMap').onclick=studyMap;
{const olc=openLab;openLab=function(idx,isFresh){const l=LABS[idx];
  // a fresh run starts with the clues hidden again, so a retry can earn a clean rank
  if(isFresh&&l&&l.kind==='incident'&&clueLevel(l.title)){clueStore()[l.title]=0;setClueLevel(l.title,0);}
  olc(idx,isFresh);
  if(l&&l.kind==='incident'&&window.l4nFun){const r=window.l4nFun.run(),n=clueLevel(l.title);if(r&&r.valid&&!r.done&&n>(r.clues||0)){r.clues=n;window.l4nFun.save();}}};}

// ---------- sandbox: build any topology, Packet Tracer style ----------
(function(){
  const KEY='lab4net-sandbox-v1',MAX=20,W=1600,H=660,VW=800,VH=330,topo=$('topo'),ctx=$('ctx');
  const blank=()=>({devs:[],links:[],notes:[],view:null,ch:null,chDone:false});let def=blank(),cable=false,pick=null,dragging=null;
  const KIND={router:['R','Router'],router5:['R','Router, 5 ports'],switch:['SW','Switch'],switch24:['SW','Switch, 24 ports'],l3switch:['DSW','Layer 3 switch'],pc:['PC','PC'],srv:['SRV','Server']},TYPES=Object.keys(KIND);
  const clean=p=>{if(!p||!Array.isArray(p.devs)||!Array.isArray(p.links)||p.devs.length>MAX)return null;const names=new Set(),devs=[];
    for(const d of p.devs){if(!d||typeof d.name!=='string'||!/^[A-Za-z][A-Za-z0-9-]{0,14}$/.test(d.name)||names.has(d.name)||!TYPES.includes(d.type))return null;names.add(d.name);
      devs.push({name:d.name,type:d.type,x:Math.max(34,Math.min(W-34,Math.round(+d.x)||100)),y:Math.max(34,Math.min(H-40,Math.round(+d.y)||100))});}
    const links=[];for(const l of p.links){if(!l||!names.has(l.a)||!names.has(l.b)||l.a===l.b)return null;const ai=parseIf(l.ai),bi=parseIf(l.bi);if(!ai||!bi)return null;links.push({a:l.a,ai,b:l.b,bi});}
    const notes=(Array.isArray(p.notes)?p.notes:[]).filter(n=>n&&typeof n.text==='string'&&n.text.trim()).slice(0,30).map(n=>({text:n.text.slice(0,60),x:Math.max(10,Math.min(W-10,Math.round(+n.x)||100)),y:Math.max(16,Math.min(H-6,Math.round(+n.y)||40))}));
    const v=p.view,view=v&&[v.x,v.y,v.w].every(Number.isFinite)?{x:v.x,y:v.y,w:v.w,h:v.w*VH/VW}:null;
    return {devs,links,notes,view,ch:Number.isInteger(p.ch)&&p.ch>=0&&p.ch<4?p.ch:null,chDone:!!p.chDone};};
  try{const c=clean(JSON.parse(localStorage.getItem(KEY)||'null'));if(c)def=c;}catch(e){}
  // undo: a snapshot of the build and its command journal after every change (read-only and mode commands fold into the last one)
  let hist=[];const snap=()=>JSON.stringify({d:def.devs,l:def.links,n:def.notes,c:def.ch,cd:def.chDone,j:cur&&cur.sandbox?cur.journal:[]});
  function mark(soft){if(!cur||!cur.sandbox)return;const s=snap();if(hist[hist.length-1]===s)return;if(soft&&hist.length)hist[hist.length-1]=s;else{hist.push(s);if(hist.length>80)hist.shift();}const b=$('sbUndo');if(b)b.disabled=hist.length<2;}
  function undo(){if(!cur||!cur.sandbox||hist.length<2)return;hist.pop();const p=JSON.parse(hist[hist.length-1]);Object.assign(def,{devs:p.d,links:p.l,notes:p.n,ch:p.c,chDone:p.cd});cur.journal=p.j;pick=null;cable=false;closeMenu();rebuild();notify('Undone. '+(hist.length-1)+' more step'+(hist.length===2?'':'s')+' can be undone.');}
  const READONLY=/^\s*(do\s+)?(sh\w*|ping|traceroute|tracert|telnet|ssh)\b|^\s*ipconfig\s*$|^\s*(en\w*|exit|end|disable|conf\w*(\s+t\w*)?)\s*$/i;
  const saveDef=()=>{try{localStorage.setItem(KEY,JSON.stringify(def));}catch(e){}mark();};
  const setLast=v=>{try{localStorage.setItem('lab4net-last',v);}catch(e){}};
  function make(d){if(d.type==='router'||d.type==='router5'){const r=mkRouter(d.name);if(d.type==='router5'){addIf(r,'GigabitEthernet0/3',{shutdown:true});addIf(r,'GigabitEthernet0/4',{shutdown:true});}return r;}
    if(d.type==='l3switch')return mkL3Switch(d.name);
    if(d.type==='switch'||d.type==='switch24'){const s=mkSwitch(d.name);if(d.type==='switch24')for(let i=9;i<=24;i++)addIf(s,'FastEthernet0/'+i);return s;}
    const p=mkPC(d.name,null,24);if(d.type==='srv')p.services=[80];return p;}
  const SBX={title:'Sandbox',group:'Free build',brief:'',addr:[],tasks:[],why:[],checks:[],solution:{},steps:[],pos:{},start:null,
    build(){const net=mkNet(def.devs.map(make));for(const l of def.links)link(net,l.a,l.ai,l.b,l.bi);SBX.pos={};for(const d of def.devs)SBX.pos[d.name]=[d.x,d.y];return net;}};
  function load(keepSel){const names=new Set(def.devs.map(d=>d.name)),journal=((drafts[SBX.title]||{}).journal||[]).filter(e=>e&&names.has(e.device));let state;
    try{state=replay(SBX,{journal});}catch(e){try{state=replay(SBX,null);}catch(x){def=blank();state=replay(SBX,null);}}
    return {state,sel:keepSel&&names.has(keepSel)?keepSel:(def.devs[0]?def.devs[0].name:null)};}
  window.openSandbox=function(){if(cur&&cur.view==='lab'&&!cur.sandbox)saveWork();const {state,sel}=load(null);
    cur={view:'lab',idx:-1,lab:SBX,...state,sel,graded:null,showSol:false,tasks:[],intro:true,links:{},trace:null,sandbox:true};
    fxToken++;mobilePanel(false);$('tin').value='';$('hint').textContent=HINT;$('hint').className='';$('trace').innerHTML='';$('resultCard').hidden=true;cable=false;pick=null;setLast('sandbox');hist=[];mark();renderAll();saveWork();};
  function rebuild(){drafts[SBX.title]={journal:cur.journal,tasks:[]};const {state,sel}=load(cur.sel);Object.assign(cur,state,{sel,links:{},trace:null});$('trace').innerHTML='';saveDef();drawTopo();renderTerm();renderBrief();saveWork();}
  const isHost=n=>{const d=def.devs.find(x=>x.name===n);return !!d&&(d.type==='pc'||d.type==='srv');};
  const ports=d=>sortIfs(Object.keys(d.ifs)).map(n=>d.ifs[n]).filter(i=>/^(Fast|Gigabit)Ethernet[\d\/]+$/.test(i.name));

  // view: zoom and pan over a canvas four times the size of the default view
  const view=()=>def.view||(def.view={x:0,y:0,w:VW,h:VH});
  function setView(v){const w=Math.max(400,Math.min(W,v.w)),h=w*VH/VW;def.view={x:Math.max(0,Math.min(W-w,v.x)),y:Math.max(0,Math.min(H-h,v.y)),w,h};}
  function zoom(f,cx,cy){const v=view();if(cx==null){cx=v.x+v.w/2;cy=v.y+v.h/2;}const w=Math.max(400,Math.min(W,v.w*f)),k=w/v.w;setView({x:cx-(cx-v.x)*k,y:cy-(cy-v.y)*k,w});saveDef();drawTopo();}
  function fit(){if(!def.devs.length)def.view={x:0,y:0,w:VW,h:VH};else{const xs=def.devs.map(d=>d.x),ys=def.devs.map(d=>d.y),x0=Math.min(...xs)-80,x1=Math.max(...xs)+80,y0=Math.min(...ys)-70,y1=Math.max(...ys)+80,w=Math.max(x1-x0,(y1-y0)*VW/VH,640);
      setView({x:(x0+x1)/2-w/2,y:(y0+y1)/2-w*VH/VW/2,w});}saveDef();drawTopo();}
  $('zoomCtl').querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{const z=b.dataset.z;if(z==='fit')fit();else zoom(z==='in'?1/1.25:1.25);});

  // floating menu used for the port picker and right-click actions
  function menu(x,y,title,items){ctx.innerHTML=`<b>${esc(title)}</b>`+items.map((it,i)=>`<button data-i="${i}"${it.disabled?' disabled':''}><span>${esc(it.label)}</span>${it.sub?`<small>${esc(it.sub)}</small>`:''}</button>`).join('');
    ctx.hidden=false;ctx.style.left=Math.max(8,Math.min(innerWidth-ctx.offsetWidth-8,x))+'px';ctx.style.top=Math.max(8,Math.min(innerHeight-ctx.offsetHeight-8,y))+'px';
    ctx.querySelectorAll('button').forEach(b=>b.onclick=()=>{ctx.hidden=true;items[+b.dataset.i].fn();});}
  const closeMenu=()=>{ctx.hidden=true;};
  document.addEventListener('pointerdown',e=>{if(!ctx.hidden&&!ctx.contains(e.target))closeMenu();},true);

  function addDev(type){if(def.devs.length>=MAX)return notify('The sandbox holds up to '+MAX+' devices.');const pre=KIND[type][0],v=view();let n=1;while(def.devs.some(d=>d.name===pre+n))n++;
    let spot=null;outer:for(let y=v.y+80;y<=v.y+v.h-60;y+=90)for(let x=v.x+80;x<=v.x+v.w-70;x+=100)if(!def.devs.some(d=>Math.hypot(d.x-x,d.y-y)<70)){spot=[x,y];break outer;}
    if(!spot)spot=[v.x+60+Math.random()*(v.w-120),v.y+50+Math.random()*(v.h-110)];
    def.devs.push({name:pre+n,type,x:Math.round(spot[0]),y:Math.round(spot[1])});cur.sel=pre+n;rebuild();}
  function delDev(n){if(!n||!cur.net.devs[n])return notify('Select a device on the map first.');def.devs=def.devs.filter(d=>d.name!==n);def.links=def.links.filter(l=>l.a!==n&&l.b!==n);cur.journal=cur.journal.filter(e=>e.device!==n);if(pick&&pick.dev===n)pick=null;rebuild();notify(n+' deleted.');}
  function connect(a,ai,b,bi){if(a===b)return notify('A cable needs two different devices.');def.links.push({a,ai,b,bi});rebuild();notify(`Connected ${a} ${shortIf(ai)} to ${b} ${shortIf(bi)}.`);}
  function pickPort(n,x,y,cb){const d=cur.net.devs[n],all=ports(d),free=all.filter(i=>!i.link);if(!free.length)return notify('Every port on '+n+' is in use.');
    if(all.length===1)return cb(free[0].name);
    menu(x,y,n+': choose a port',all.map(i=>({label:shortIf(i.name),sub:i.link?'in use → '+i.link.dev+' '+shortIf(i.link.ifn):'free',disabled:!!i.link,fn:()=>cb(i.name)})));}
  function cableClick(n,x,y){if(!pick)return pickPort(n,x,y,p=>{pick={dev:n,port:p};drawTopo();notify(`${n} ${shortIf(p)} selected. Now click the device to connect it to.`);});
    if(pick.dev===n)return notify('Pick a different device for the other end.');
    pickPort(n,x,y,p=>{const a=pick;pick=null;connect(a.dev,a.port,n,p);});}
  function ipDialog(n){const d=cur.net.devs[n],i=d.ifs.FastEthernet0;
    dialog('IP settings: '+n,`<p>This runs the same <code>ipconfig</code> commands you would type in the ${esc(n)} console, so you can see them there afterwards.</p>
      <div class="drill"><label>IP address<input id="ipA" autocomplete="off" value="${i.ip!==null?n2ip(i.ip):''}" placeholder="192.168.1.10"><span></span></label><label>Subnet mask<input id="ipM" autocomplete="off" value="${i.ip!==null?n2ip(lenMask(i.len)):'255.255.255.0'}"><span></span></label><label>Default gateway<input id="ipG" autocomplete="off" value="${d.gw!=null?n2ip(d.gw):''}" placeholder="192.168.1.1"><span></span></label></div>
      <div class="actions"><button class="btn primary" id="ipApply">Apply address</button><button class="btn" id="ipDhcp">Get an address by DHCP</button></div><p id="ipMsg" role="status" class="bad"></p>`);
    $('ipApply').onclick=()=>{const a=$('ipA').value.trim(),m=$('ipM').value.trim(),g=$('ipG').value.trim();
      if(!isIp(a))return $('ipMsg').textContent='Enter a valid IP address, such as 192.168.1.10.';if(!isIp(m)||maskLenN(ip2n(m))===null)return $('ipMsg').textContent='Enter a valid subnet mask, such as 255.255.255.0.';if(g&&!isIp(g))return $('ipMsg').textContent='The gateway is not a valid address. Leave it empty if there is none.';
      $('dialog').close();select(n);execute(`ipconfig /ip ${a} ${m}`);if(g)execute('ipconfig /dg '+g);notify(n+' is now '+a+'.');};
    $('ipDhcp').onclick=()=>{$('dialog').close();select(n);execute('ipconfig /renew');};}
  function renameDialog(n){dialog('Rename '+n,`<p>Letters, digits and hyphens, starting with a letter. On routers and switches this is the device label; the <code>hostname</code> command still sets the prompt.</p><input id="rnName" class="search" autocomplete="off" value="${esc(n)}" maxlength="15"><div class="actions"><button class="btn primary" id="rnOk">Rename</button></div><p id="rnMsg" role="status" class="bad"></p>`);
    const go=()=>{const v=$('rnName').value.trim();if(v===n)return $('dialog').close();if(!/^[A-Za-z][A-Za-z0-9-]{0,14}$/.test(v))return $('rnMsg').textContent='Use letters, digits and hyphens, starting with a letter.';if(def.devs.some(d=>d.name===v))return $('rnMsg').textContent='Another device already has that name.';
      def.devs.find(d=>d.name===n).name=v;for(const l of def.links){if(l.a===n)l.a=v;if(l.b===n)l.b=v;}cur.journal=cur.journal.map(e=>e.device===n?{...jEntry(e),device:v}:e);if(cur.sel===n)cur.sel=v;$('dialog').close();rebuild();};
    $('rnOk').onclick=go;$('rnName').onkeydown=e=>{if(e.key==='Enter')go();};$('rnName').select();}
  function noteDialog(i){const n=i==null?null:def.notes[i];dialog(n?'Edit note':'Add a note',`<p>A short label on the map, such as a subnet or a site name. Drag it wherever you like.</p><input id="ntText" class="search" autocomplete="off" maxlength="60" value="${n?esc(n.text):''}" placeholder="LAN A · 192.168.1.0/24"><div class="actions"><button class="btn primary" id="ntOk">${n?'Save note':'Add note'}</button></div>`);
    const go=()=>{const t=$('ntText').value.trim();if(!t)return;if(n)n.text=t;else{if(def.notes.length>=30)return notify('The sandbox holds up to 30 notes.');const v=view();def.notes.push({text:t,x:Math.round(v.x+v.w/2),y:Math.round(v.y+30+def.notes.length%6*18)});}$('dialog').close();saveDef();drawTopo();};
    $('ntOk').onclick=go;$('ntText').onkeydown=e=>{if(e.key==='Enter')go();};$('ntText').focus();}
  function devMenu(n,x,y){const items=[{label:'Open console',fn:()=>select(n)},{label:'Connect a cable from here',fn:()=>{cable=true;pick=null;renderSandbox();cableClick(n,x,y);}}];
    if(isHost(n))items.push({label:'IP settings',fn:()=>ipDialog(n)});
    items.push({label:'Rename',fn:()=>renameDialog(n)},{label:'Delete',fn:()=>delDev(n)});menu(x,y,n,items);}
  function linkMenu(i,x,y){const l=def.links[i];if(!l)return;menu(x,y,`${l.a} ${shortIf(l.ai)} ↔ ${l.b} ${shortIf(l.bi)}`,[{label:'Remove this cable',fn:()=>{def.links.splice(i,1);rebuild();}}]);}
  function noteMenu(i,x,y){menu(x,y,'Note',[{label:'Edit text',fn:()=>noteDialog(i)},{label:'Delete note',fn:()=>{def.notes.splice(i,1);saveDef();drawTopo();}}]);}

  const P=(n,t,x,y)=>({name:n,type:t,x,y}),Lk=(a,ai,b,bi)=>({a,ai,b,bi});
  const KITS=[
    ['Small office','A router, a switch, two PCs and a server.',{devs:[P('R1','router',400,65),P('SW1','switch',400,160),P('PC1','pc',240,255),P('PC2','pc',400,262),P('SRV1','srv',560,250)],links:[Lk('R1','g0/0','SW1','g0/1'),Lk('PC1','f0','SW1','f0/1'),Lk('PC2','f0','SW1','f0/2'),Lk('SRV1','f0','SW1','f0/3')]}],
    ['Two sites','Two routers, each with its own switch and PCs.',{devs:[P('R1','router',300,75),P('R2','router',500,75),P('SW1','switch',180,165),P('SW2','switch',620,165),P('PC1','pc',90,258),P('PC2','pc',250,258),P('PC3','pc',550,258),P('PC4','pc',710,258)],links:[Lk('R1','g0/1','R2','g0/1'),Lk('R1','g0/0','SW1','g0/1'),Lk('R2','g0/0','SW2','g0/1'),Lk('PC1','f0','SW1','f0/1'),Lk('PC2','f0','SW1','f0/2'),Lk('PC3','f0','SW2','f0/1'),Lk('PC4','f0','SW2','f0/2')]}],
    ['Router triangle','Three routers in a loop, each with a PC. Good for OSPF.',{devs:[P('R1','router',400,70),P('R2','router',250,200),P('R3','router',550,200),P('PC1','pc',560,70),P('PC2','pc',100,200),P('PC3','pc',700,200)],links:[Lk('R1','g0/1','R2','g0/1'),Lk('R2','g0/2','R3','g0/2'),Lk('R1','g0/2','R3','g0/1'),Lk('R1','g0/0','PC1','f0'),Lk('R2','g0/0','PC2','f0'),Lk('R3','g0/0','PC3','f0')]}],
    ['Switch pair','Two switches joined by two cables. Good for trunks, EtherChannel and spanning tree.',{devs:[P('SW1','switch',260,100),P('SW2','switch',540,100),P('PC1','pc',260,235),P('PC2','pc',540,235)],links:[Lk('SW1','g0/1','SW2','g0/1'),Lk('SW1','g0/2','SW2','g0/2'),Lk('PC1','f0','SW1','f0/1'),Lk('PC2','f0','SW2','f0/1')]}]];

  // challenges: a starter kit plus goals that are checked against the live network
  const hostIp=(n,h)=>n.devs[h]&&n.devs[h].ifs.FastEthernet0?n.devs[h].ifs.FastEthernet0.ip:null;
  const pingH=(n,a,b)=>{const ip=hostIp(n,b);return ip!=null&&!!n.devs[a]&&canPing(n,n.devs[a],ip);};
  const CHALL=[
    {kit:0,title:'Get the office online',desc:'Address everything, then get the PCs talking to each other, the router and the web server.',goals:[
      ['PC1, PC2 and SRV1 each have an IP address',n=>['PC1','PC2','SRV1'].every(h=>hostIp(n,h)!=null)],
      ['PC1 can ping PC2',n=>pingH(n,'PC1','PC2')],
      ['R1 Gi0/0 has an address and PC1 can ping it',n=>{const i=n.devs.R1.ifs['GigabitEthernet0/0'];return i.ip!==null&&canPing(n,n.devs.PC1,i.ip);}],
      ['PC1 can open the web server on SRV1 (TCP 80)',n=>{const ip=hostIp(n,'SRV1');return ip!=null&&reach(n,n.devs.PC1,ip,'tcp',80).ok;}]]},
    {kit:1,title:'Connect two sites',desc:'Two LANs on different subnets, joined by two routers. Make a PC at one site reach a PC at the other.',goals:[
      ['All four PCs have an address and a default gateway',n=>['PC1','PC2','PC3','PC4'].every(h=>hostIp(n,h)!=null&&n.devs[h].gw!=null)],
      ['The two sites use different subnets',n=>{const a=n.devs.PC1.ifs.FastEthernet0,b=n.devs.PC3.ifs.FastEthernet0;return a.ip!==null&&b.ip!==null&&netOf(a.ip,a.len)!==netOf(b.ip,b.len);}],
      ['PC1 can ping PC2 at its own site',n=>pingH(n,'PC1','PC2')],
      ['PC1 can ping PC4 at the other site',n=>pingH(n,'PC1','PC4')],
      ['PC3 can ping PC2 the other way',n=>pingH(n,'PC3','PC2')]]},
    {kit:2,title:'OSPF, no static routes',desc:'Three routers in a loop. Let OSPF find every LAN. Static routes are not allowed.',goals:[
      ['No router has a static route',n=>['R1','R2','R3'].every(r=>n.devs[r].statics.length===0)],
      ['Every router has two OSPF neighbors',n=>['R1','R2','R3'].every(r=>ospfNeighbors(n,n.devs[r]).length===2)],
      ['PC1 can ping PC2',n=>pingH(n,'PC1','PC2')],
      ['PC1 can ping PC3',n=>pingH(n,'PC1','PC3')]]},
    {kit:3,title:'One VLAN over a bundle',desc:'Put both PCs in VLAN 10 and carry it between the switches over an EtherChannel trunk.',goals:[
      ['VLAN 10 exists on both switches',n=>['SW1','SW2'].every(s=>!!n.devs[s].vlans[10])],
      ['Both PC ports are access ports in VLAN 10',n=>['SW1','SW2'].every(s=>{const i=n.devs[s].ifs['FastEthernet0/1'];return i.mode==='access'&&i.accessVlan===10;})],
      ['Both cables are bundled into one EtherChannel',n=>['SW1','SW2'].every(s=>['GigabitEthernet0/1','GigabitEthernet0/2'].every(p=>bundled(n,n.devs[s],n.devs[s].ifs[p])))],
      ['PC1 can ping PC2',n=>pingH(n,'PC1','PC2')]]}];
  const goalState=()=>def.ch==null?[]:CHALL[def.ch].goals.map(([t,f])=>{try{return [t,!!f(cur.net)];}catch(e){return [t,false];}});
  function afterCmd(){if(def.ch==null)return;const g=goalState();renderSandbox();
    if(!def.chDone&&g.length&&g.every(x=>x[1])){def.chDone=true;saveDef();renderSandbox();notify('Challenge complete: '+CHALL[def.ch].title+'.');if(window.l4nSbxDone)window.l4nSbxDone(def.ch,CHALL.length);
      const layer=fxLayer(),v=view();if(layer&&!REDUCED){layer.insertAdjacentHTML('beforeend',`<text class="clear" x="${v.x+v.w/2}" y="${v.y+v.h/2+16}" style="font-size:${Math.round(52*v.w/VW)}px">CHALLENGE CLEAR!</text>`);def.devs.forEach((d,k)=>setTimeout(()=>{if(inSbx())burst(d.name,'good','');},k*110));}}}

  function replaceWith(next,journal,what){const go=()=>{def=next;cur.journal=journal;cur.sel=null;pick=null;cable=false;rebuild();fit();notify(what);};
    if(!def.devs.length)return go();dialog('Replace the current sandbox?',`<p>This replaces every device, cable and command now in the sandbox. Save it to a file first if you want to keep it.</p><button class="btn primary" id="sbYes">Replace it</button>`);$('sbYes').onclick=()=>{$('dialog').close();go();};}
  function saveFile(){const url=URL.createObjectURL(new Blob([JSON.stringify({format:'lab4net-sandbox',version:1,def,journal:cur.journal},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='lab4net-sandbox.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Sandbox saved to lab4net-sandbox.json.');}
  async function loadFile(file){try{if(!file)return;if(file.size>2*1024*1024)throw Error('the file is larger than 2 MB');const p=JSON.parse(await file.text());if(p.format!=='lab4net-sandbox')throw Error('it is not a Lab4Net sandbox file');
      const next=clean(p.def);if(!next)throw Error('its devices or cables are not valid');const names=new Set(next.devs.map(d=>d.name));
      const journal=(Array.isArray(p.journal)?p.journal:[]).filter(e=>e&&names.has(e.device)&&typeof e.line==='string'&&e.line.length<=512&&!/[\r\n]/.test(e.line)).slice(0,5000).map(jEntry);
      const keep=def;def=next;try{replay(SBX,{journal});}catch(e){def=keep;throw Error('its cables use ports that do not exist');}def=keep;
      replaceWith(next,journal,'Sandbox loaded from file.');}catch(err){notify('Could not load that file: '+err.message+'.');}}

  function renderSandbox(){const cb=$('checkBody'),sc=cb.scrollTop,sel=cur.sel&&cur.net.devs[cur.sel]?cur.sel:null,goals=goalState(),ch=def.ch==null?null:CHALL[def.ch];
    $('checkTitle').textContent='Toolbox';$('runHud').textContent=ch?`Challenge · ${goals.filter(g=>g[1]).length}/${goals.length} goals`:'Free build';topo.classList.toggle('cabling',cable);topo.classList.add('sandbox');$('zoomCtl').hidden=false;
    $('brief').innerHTML=ch?`<div class="eyebrow">Challenge <span>SANDBOX</span></div><h2>${ch.title}</h2><p>${ch.desc}</p><div class="lesson-tip"><b>No instructions this time</b><br>The goals in the Toolbox are checked against the live network after every command. How you get there is up to you. Use <code>?</code> and the Command guide if you get stuck.</div>`
      :`<div class="eyebrow">Free build <span>SANDBOX</span></div><h2>Build your own network</h2><p>Nothing is graded here. Add devices, cable them, and configure them from the console exactly as in the labs.</p>
      <div class="lesson-tip"><b>How it works</b><br>Add devices from the Toolbox and drag them around the map. Turn the cable tool on, click a device and choose its port, then do the same on the other device. Right-click a device or a cable for more actions.</div>
      <h3>Good to know</h3><ul class="plain"><li>Scroll over the map to zoom, and drag empty space to pan. Fit brings everything back into view.</li><li>Router ports start shut down. Bring them up with <code>no shutdown</code>.</li><li>PCs and servers start with no address. Use IP settings in the Toolbox, or type <code>ipconfig /ip 192.168.1.10 255.255.255.0</code> and <code>ipconfig /dg 192.168.1.1</code> in the console.</li><li>Servers listen on TCP port 80, so <code>telnet 192.168.1.20 80</code> tests one.</li><li>Your build and its configuration are saved in this browser. Save to file to keep copies or move them.</li></ul>`;
    cb.innerHTML=(ch?`<h3>Goals <span>${goals.filter(g=>g[1]).length}/${goals.length}</span></h3><ul class="goals">${goals.map(g=>`<li class="${g[1]?'ok':'no'}">${g[0]}</li>`).join('')}</ul>${def.chDone?'<p><b>Challenge complete.</b> Keep building, or pick another one below.</p>':''}<div class="tool-grid"><button class="btn" id="sbLeave">Leave challenge</button></div>`:'')+
      `<div class="tool-grid"><button class="btn" id="sbUndo" title="Undo the last device, cable, note or configuration change (Ctrl+Z on the map)"${hist.length<2?' disabled':''}>↶ Undo</button></div><h3>Add a device <span>${def.devs.length}/${MAX}</span></h3><div class="tool-grid">${Object.entries(KIND).map(([k,v])=>`<button class="btn" data-add="${k}">+ ${v[1]}</button>`).join('')}</div>
      <h3>Selected ${sel?`<span>${esc(sel)}</span>`:''}</h3>${sel?`<div class="tool-grid">${isHost(sel)?'<button class="btn" id="sbIp">IP settings</button>':''}<button class="btn" id="sbFrom">Cable from here</button><button class="btn" id="sbRen">Rename</button><button class="btn" id="sbDel">Delete</button></div>`:'<p>Click a device on the map to select it.</p>'}
      <h3>Cables <span>${def.links.length}</span></h3><div class="tool-grid"><button class="btn${cable?' primary':''}" id="sbCable" aria-pressed="${cable}">Cable tool: ${cable?'on':'off'}</button><button class="btn" id="sbNote">Add a note</button></div>
      <ul class="cable-list">${def.links.map((l,i)=>`<li><span>${esc(l.a)} ${shortIf(l.ai)} ↔ ${esc(l.b)} ${shortIf(l.bi)}</span><button class="small-btn" data-cut="${i}">Remove</button></li>`).join('')||'<li><span>No cables yet.</span></li>'}</ul>
      <h3>Challenges</h3><div class="kit-list">${CHALL.map((c,i)=>`<button class="lab-card" data-ch="${i}"><b>${c.title}</b><span>${c.desc}</span><small>${c.goals.length} goals${def.ch===i?(def.chDone?' · complete':' · in progress'):''}</small></button>`).join('')}</div>
      <h3>Starter kits</h3><div class="kit-list">${KITS.map((k,i)=>`<button class="lab-card" data-kit="${i}"><b>${k[0]}</b><span>${k[1]}</span></button>`).join('')}</div>
      <h3>Files</h3><div class="tool-grid"><button class="btn" id="sbSave">Save to file</button><label class="btn">Load from file<input type="file" id="sbLoad" accept="application/json,.json" hidden></label></div>
      <h3>Manage</h3><div class="tool-grid"><button class="btn" id="sbWipe">Erase all configuration</button><button class="btn" id="sbClear">Clear the sandbox</button></div>`;
    cb.scrollTop=sc;
    $('sbUndo').onclick=undo;cb.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addDev(b.dataset.add));
    cb.querySelectorAll('[data-cut]').forEach(b=>b.onclick=()=>{def.links.splice(+b.dataset.cut,1);rebuild();});
    cb.querySelectorAll('[data-kit]').forEach(b=>b.onclick=()=>{const k=KITS[+b.dataset.kit];replaceWith(clean(k[2]),[],k[0]+' loaded. Nothing is configured yet.');});
    cb.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{const i=+b.dataset.ch,next=clean(KITS[CHALL[i].kit][2]);next.ch=i;replaceWith(next,[],'Challenge started: '+CHALL[i].title+'.');});
    if($('sbLeave'))$('sbLeave').onclick=()=>{def.ch=null;def.chDone=false;saveDef();renderSandbox();};
    $('sbCable').onclick=()=>{cable=!cable;pick=null;renderSandbox();drawTopo();if(cable)notify('Cable tool on: click a device and choose its port. Press Esc to stop.');};
    $('sbNote').onclick=()=>noteDialog(null);
    if(sel){if($('sbIp'))$('sbIp').onclick=()=>ipDialog(sel);$('sbRen').onclick=()=>renameDialog(sel);$('sbDel').onclick=()=>delDev(sel);
      $('sbFrom').onclick=e=>{cable=true;pick=null;renderSandbox();const r=e.target.getBoundingClientRect();cableClick(sel,r.right+8,r.top);};}
    $('sbSave').onclick=saveFile;$('sbLoad').onchange=e=>{loadFile(e.target.files[0]);e.target.value='';};
    $('sbWipe').onclick=()=>{dialog('Erase all configuration?',`<p>Every device goes back to factory defaults. Devices and cables stay where they are.</p><button class="btn primary" id="sbYes">Erase configuration</button>`);$('sbYes').onclick=()=>{$('dialog').close();cur.journal=[];def.chDone=false;rebuild();};};
    $('sbClear').onclick=()=>{dialog('Clear the sandbox?',`<p>This removes every device, cable, note and command in the sandbox.</p><button class="btn primary" id="sbYes">Clear everything</button>`);$('sbYes').onclick=()=>{$('dialog').close();def=blank();cur.journal=[];cur.sel=null;pick=null;rebuild();};};}

  // hooks into the existing workspace
  const inSbx=()=>cur&&cur.view==='lab'&&cur.sandbox;
  const rb0=renderBrief;renderBrief=function(){if(inSbx())return renderSandbox();$('checkTitle').textContent='Checklist';topo.classList.remove('sandbox','cabling');$('zoomCtl').hidden=true;rb0();};
  const rt0=renderTerm;renderTerm=function(){const none=inSbx()&&!cur.net.devs[cur.sel];$('tin').disabled=!!none;
    if(none){$('tabs').innerHTML='';$('tout').textContent='Add a device from the Toolbox to get a console.';$('prompt').textContent='';$('mode').textContent='No device';$('deviceInfo').textContent='';return;}rt0();};
  const dt0=drawTopo;drawTopo=function(){dt0();if(!inSbx())return;const svg=topo.querySelector('svg');if(!svg)return;const v=view();svg.setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`);
    const under=def.links.map((l,i)=>{const a=SBX.pos[l.a],b=SBX.pos[l.b];return `<line class="hitwire" data-link="${i}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}).join('')+def.notes.map((n,i)=>`<text class="note" data-note="${i}" x="${n.x}" y="${n.y}">${esc(n.text)}</text>`).join('');
    const first=svg.querySelector('.dev');if(first)first.insertAdjacentHTML('beforebegin',under);else svg.insertAdjacentHTML('afterbegin',under);
    if(!def.devs.length)svg.insertAdjacentHTML('beforeend',`<text class="emptyhint" x="${v.x+v.w/2}" y="${v.y+v.h/2}">Add a device, or pick a challenge or starter kit in the Toolbox</text>`);
    if(pick){const g=[...svg.querySelectorAll('.dev')].find(e=>e.dataset.dev===pick.dev);if(g)g.classList.add('pick');}};
  const sel0=select;select=function(n){sel0(n);if(inSbx())renderSandbox();};
  const ex0=execute;execute=function(line){ex0(line);if(inSbx()){afterCmd();mark(READONLY.test(line));}};
  document.addEventListener('keydown',e=>{if(!inSbx()||!(e.ctrlKey||e.metaKey)||e.shiftKey||e.key.toLowerCase()!=='z')return;const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)||$('dialog').open)return;e.preventDefault();undo();});
  const rl0=renderLabs;renderLabs=function(){rl0();$('labs').insertAdjacentHTML('beforeend','<optgroup label="Free build"><option value="sandbox">Sandbox and challenges</option></optgroup>');if(inSbx())$('labs').value='sandbox';};
  const ol0=openLab;openLab=function(idx,isFresh){if(!(idx>=0))return openSandbox();cable=false;pick=null;closeMenu();setLast('lab');ol0(idx,isFresh);};
  $('labs').onchange=e=>{const v=e.target.value;if(v==='sandbox')openSandbox();else if(['drill','quiz'].includes(v))openPractice(v);else openLab(+v);};
  const lb0=library;library=function(){lb0();const pb=$('dialogBody').querySelector('.practice-buttons');if(pb){pb.insertAdjacentHTML('afterbegin','<button class="btn primary" id="sbOpen">Sandbox and challenges →</button>');$('sbOpen').onclick=()=>{$('dialog').close();openSandbox();};}};
  $('library').onclick=library;

  // map interactions: drag devices and notes, pan, zoom, cable tool, right-click menus
  const svgPt=e=>{const svg=topo.querySelector('svg');return new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());};
  topo.addEventListener('pointerdown',e=>{if(!inSbx()||cable||e.button)return;const g=e.target.closest('[data-dev]'),nt=e.target.closest('[data-note]'),hw=e.target.closest('[data-link]'),base={moved:false,sx:e.clientX,sy:e.clientY};
    if(g){const d=def.devs.find(x=>x.name===g.dataset.dev);if(!d)return;const p=svgPt(e);dragging={...base,d,ox:d.x-p.x,oy:d.y-p.y};}
    else if(nt){const n=def.notes[+nt.dataset.note];if(!n)return;const p=svgPt(e);dragging={...base,note:n,ni:+nt.dataset.note,ox:n.x-p.x,oy:n.y-p.y};}
    else if(!hw){const svg=topo.querySelector('svg');if(!svg)return;const v=view();dragging={...base,pan:true,vx:v.x,vy:v.y,k:1/svg.getScreenCTM().a};}});
  window.addEventListener('pointermove',e=>{if(!dragging)return;dragging.lx=e.clientX;dragging.ly=e.clientY;if(!dragging.moved&&Math.hypot(e.clientX-dragging.sx,e.clientY-dragging.sy)<4)return;dragging.moved=true;
    if(dragging.pan){setView({x:dragging.vx-(e.clientX-dragging.sx)*dragging.k,y:dragging.vy-(e.clientY-dragging.sy)*dragging.k,w:view().w});drawTopo();return;}
    const p=svgPt(e);
    if(dragging.note){dragging.note.x=Math.round(Math.max(10,Math.min(W-10,p.x+dragging.ox)));dragging.note.y=Math.round(Math.max(16,Math.min(H-6,p.y+dragging.oy)));drawTopo();return;}
    const d=dragging.d;d.x=Math.round(Math.max(34,Math.min(W-34,p.x+dragging.ox)));d.y=Math.round(Math.max(34,Math.min(H-40,p.y+dragging.oy)));SBX.pos[d.name]=[d.x,d.y];cur.sel=d.name;drawTopo();});
  window.addEventListener('pointerup',e=>{if(!dragging)return;const was=dragging;dragging=null;
    if(was.moved){saveDef();if(was.d){renderTerm();renderSandbox();}}else if(was.note)noteMenu(was.ni,e.clientX,e.clientY);});
  topo.addEventListener('wheel',e=>{if(!inSbx())return;e.preventDefault();const p=svgPt(e);zoom(e.deltaY>0?1.15:1/1.15,p.x,p.y);},{passive:false});
  topo.addEventListener('click',e=>{if(!inSbx())return;const g=e.target.closest('[data-dev]'),w=e.target.closest('[data-link]');
    if(cable){e.stopImmediatePropagation();if(g)cableClick(g.dataset.dev,e.clientX,e.clientY);return;}
    if(w&&!g){e.stopImmediatePropagation();linkMenu(+w.dataset.link,e.clientX,e.clientY);}},true);
  topo.addEventListener('contextmenu',e=>{if(!inSbx())return;const g=e.target.closest('[data-dev]'),w=e.target.closest('[data-link]'),nt=e.target.closest('[data-note]');if(!g&&!w&&!nt)return;e.preventDefault();
    if(g)devMenu(g.dataset.dev,e.clientX,e.clientY);else if(nt)noteMenu(+nt.dataset.note,e.clientX,e.clientY);else linkMenu(+w.dataset.link,e.clientX,e.clientY);});
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;closeMenu();if(cable&&inSbx()){cable=false;pick=null;renderSandbox();drawTopo();}});

  let last=null;try{last=localStorage.getItem('lab4net-last');}catch(e){}
  if(last==='sandbox')openSandbox();else{$('zoomCtl').hidden=true;renderLabs();}
})();

// ---------- backup: include ranks, trophies, layout and the sandbox in Transfer progress ----------
(function(){
  const EXTRA=['lab4net-fun-v1','lab4net-sandbox-v1','lab4net-layout-v3','lab4net-guide','lab4net-guide-pop','lab4net-trace-open','lab4net-last','lab4net-incident-hints','lab4net-capstone-guide','lab4net-lessons-v1','lab4net-exam-v1','lab4net-campaign-v1','lab4net-sbx-done-v1'];
  const tr0=transfer;transfer=function(){tr0();
    $('export').onclick=()=>{saveWork();const extras={};for(const k of EXTRA){try{const v=localStorage.getItem(k);if(v!=null)extras[k]=v;}catch(e){}}
      const sj=drafts.Sandbox&&Array.isArray(drafts.Sandbox.journal)?drafts.Sandbox.journal:[];
      const url=URL.createObjectURL(new Blob([JSON.stringify({format:'lab4net',version:1,progress,drafts,lastLab,extras,sandboxJournal:sj},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='lab4net-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      $('transferStatus').textContent='Backup exported, including ranks, trophies, your window layout and the sandbox. Import it on your other device to continue.';};
    $('import').addEventListener('change',async e=>{const file=e.target.files[0];if(!file||file.size>5*1024*1024)return;let p;try{p=JSON.parse(await file.text());}catch(x){return;}
      if(!p||p.format!=='lab4net'||p.version!==1||!p.extras||typeof p.extras!=='object')return;
      setTimeout(()=>{const st=$('transferStatus');if(st&&/^Import failed/.test(st.textContent))return;
        try{const pend={},safe=x=>typeof x==='string'?x.replace(/</g,'‹').replace(/>/g,'›'):Array.isArray(x)?x.map(safe):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([a,b])=>[safe(a),safe(b)])):x;
          for(const k of EXTRA){const v=p.extras[k];if(typeof v!=='string'||v.length>2e6)continue;let j;try{j=JSON.parse(v);}catch(x){if(/-v\d$/.test(k))continue;pend[k]=safe(v);continue;}pend[k]=JSON.stringify(safe(j));}
          localStorage.setItem('lab4net-pending',JSON.stringify(pend));
          if(Array.isArray(p.sandboxJournal)){drafts.Sandbox={journal:p.sandboxJournal.filter(x=>x&&typeof x.device==='string'&&typeof x.line==='string'&&x.line.length<=512&&!/[\r\n]/.test(x.line)).slice(0,5000).map(jEntry),tasks:[]};persist();}
          if(st){st.textContent='Backup imported. Lab progress is restored now; reload to bring in ranks, trophies, your window layout and the sandbox. ';const btn=document.createElement('button');btn.className='small-btn';btn.textContent='Reload now';btn.onclick=()=>location.reload();st.appendChild(btn);}
        }catch(x){}},700);});};
  $('transfer').onclick=transfer;
})();

// ---------- capstones: the step-by-step guide starts switched off, and the choice is remembered per capstone ----------
// Capstones keep full instructions (tests/labs.cjs proves they reach a pass), but they are meant to be done without them.
(function(){const KEY='lab4net-capstone-guide';let store={},saved=null;try{store=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){}
  const set=lab=>{if(lab&&lab.capstone){if(saved===null)saved=guideOn;guideOn=!!store[lab.title];}else if(saved!==null){guideOn=saved;saved=null;}};
  const ol=openLab;openLab=function(idx,isFresh){set(idx>=0?LABS[idx]:null);ol(idx,isFresh);};
  const os=window.openSandbox;window.openSandbox=function(){set(null);os();};
  // The guide switch inside a capstone changes only that capstone's setting, not the global one.
  document.addEventListener('change',e=>{if(!e.target||e.target.id!=='guideToggle'||!(cur&&cur.view==='lab'&&cur.lab&&cur.lab.capstone))return;e.stopImmediatePropagation();
    guideOn=e.target.checked;store[cur.lab.title]=guideOn;try{localStorage.setItem(KEY,JSON.stringify(store));}catch(x){}const sc=$('brief').scrollTop;renderBrief();$('brief').scrollTop=sc;},true);
  if(cur&&cur.view==='lab'&&cur.lab&&cur.lab.capstone){set(cur.lab);renderBrief();}
})();


// ---------- switching realism: flooding on the map, the switching story in the trace panel ----------
// A live frame carries its Layer 2 events (hops.l2 from the engine). An ARP broadcast or an unknown-address flood
// fans out to every link it reached before the frame carries on; the trace panel says what each switch did.
{
  const sfx=n=>{const f=window.l4nFun&&window.l4nFun.sfx;if(f&&f[n])try{f[n]();}catch(e){}};
  const floodFly=(edges,tok)=>Promise.all((edges||[]).map(([a,b,blocked])=>fly([a,b],blocked?'flood blk':'flood',tok)));
  async function flyWay(res,cls,tok){const path=res.hops.path,evs=res.hops.l2;
    if(!evs||!evs.length||REDUCED)return fly(path,cls,tok);
    let pos=0;
    for(const ev of evs){if(tok!==fxToken)return;
      if(ev.at>pos)await fly(path.slice(pos,ev.at+1),cls,tok);
      const seg=ev.seg;
      if(ev.arp){burst(ev.from,'flood',ev.nd?'Neighbor solicitation':'ARP broadcast');sfx('flood');await floodFly(ev.edges,tok);if(tok!==fxToken)return;
        await fly(seg.slice().reverse(),'arp',tok);if(tok!==fxToken)return;await fly(seg,cls,tok);}
      else if(ev.flood){const k=Math.max(0,seg.indexOf(ev.flood));if(k>0)await fly(seg.slice(0,k+1),cls,tok);if(tok!==fxToken)return;
        burst(ev.flood,'flood','Unknown MAC: flooded');sfx('flood');await floodFly(ev.edges,tok);if(tok!==fxToken)return;
        if(k<seg.length-1)await fly(seg.slice(k),cls,tok);}
      else await fly(seg,cls,tok);
      pos=ev.at+seg.length-1;}
    if(pos<path.length-1)await fly(path.slice(pos),cls,tok);}
  playTrace=async function(T){const tok=++fxToken,g=fxLayer();if(!g)return;g.innerHTML='';
    const fp=T.f.hops.path,end=fp[fp.length-1];await flyWay(T.f,'req',tok);if(tok!==fxToken)return;
    if(!T.f.ok&&T.f.hops.storm){const st=T.f.hops.storm,loop=st.sws.concat(st.sws[0]);for(let k=0;k<3&&tok===fxToken;k++){await fly(loop,'flood blk',tok);}if(tok!==fxToken)return;st.sws.forEach((n,k)=>setTimeout(()=>{if(tok===fxToken)burst(n,'bad',k===0?'Broadcast storm':'');},k*120));return;}
    if(!T.f.ok)return burst(end,'bad',T.f.blocked?'Blocked by ACL':'No path from here');
    if(T.refused)return burst(end,'warn','Port closed');
    if(!T.r)return burst(end,'good','');
    const rp=T.r.hops.path,e2=rp[rp.length-1];await flyWay(T.r,'rep',tok);if(tok!==fxToken)return;
    if(T.ok)burst(e2,'good','Reply received');else burst(e2,'bad',T.r.blocked?'Reply blocked by ACL':'Reply has no route back');};
  const who=(net,name)=>{const d=net.devs[name];return d?esc(d.type==='pc'?name:d.hostname):esc(name);};
  const rt0=renderTrace;renderTrace=function(){rt0();const T=cur.trace,el=$('trace');if(!T||!el)return;const net=cur.net,L=[];let flooded=null;
    if(T.f.hops.storm){const st=T.f.hops.storm;L.push(`<div><b>Storm</b> VLAN ${st.vlan} · ${st.sws.map(n=>who(net,n)).join(' → ')} → ${who(net,st.sws[0])} · no spanning tree, so the frame circles for ever. Every switch logs %SW_MATM-4-MACFLAP_NOTIF. Put spanning tree back (spanning-tree vlan ${st.vlan}) or break the loop.</div>`);}
    for(const [res,dir] of [[T.f,'Request'],[T.r,'Reply']]){if(!res||!res.hops.l2)continue;
      for(const ev of res.hops.l2)for(const x of ev.sw){
        const sw=who(net,x.sw),v=`VLAN ${x.vlan}`;let what;
        if(ev.arp&&ev.lost)what=`${who(net,ev.from)}'s ARP broadcast for ${esc(n2ip(ev.nh))} flooded every port · nobody answered · learned ${who(net,ev.from)} on ${esc(shortIf(x.inp||'?'))}`;
        else if(ev.arp)what=`${who(net,ev.from)}'s ${ev.nd?'neighbor solicitation':'ARP broadcast'} for ${esc(ev.nhText||n2ip(ev.nh))} flooded every port · ${who(net,ev.to)}'s reply learned on ${esc(shortIf(x.out||'?'))}`;
        else if(x.known)what=x.out==='CPU'?`for the switch itself (${esc(ev.dstMac)})`:`${esc(ev.dstMac)} known · out ${esc(shortIf(x.out))}`;
        else{what=`${esc(ev.dstMac)} unknown · flooded out every port`;flooded=flooded||x.sw;}
        L.push(`<div><b>${esc(dir)}</b> ${sw} · ${v} · ${what}</div>`);}}
    if(!L.length)return;const tip=flooded?`<div class="tip">Run <code>show mac address-table</code> on ${who(net,flooded)}: it has learned the addresses now, so the next frame goes out one port.</div>`:'';
    const div=document.createElement('div');div.className='trace-l2';div.innerHTML=`<div class="trace-l2-h">Switching</div>${L.join('')}${tip}`;
    const box=el.querySelector('.trace-more')||el,ps=box.querySelectorAll('p');box.insertBefore(div,ps.length?ps[ps.length-1]:null);};
}
// ---------- lessons: the concept behind a lab, taught before the commands ----------
// Lesson data: written per lab or topic, checked by the validator in the lesson tooling.
