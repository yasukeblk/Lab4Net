// Run with node tests/lessons.cjs. Checks every lesson in index.html: shape, allowed markup, quiz answers,
// story steps that use devices on the lab's map and cabled together, and a lesson for every build lab.
// docs/LESSON-WRITING.md explains how lessons are written. Pass extra .js files to check drafts before splicing.
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const ctx=vm.createContext({console});vm.runInContext(engine+'\nthis.api={LABS};',ctx);
const LABS=ctx.api.LABS.filter(l=>l.kind!=='incident'&&!l.capstone),byTitle=Object.fromEntries(LABS.map(l=>[l.title,l]));
const OBJ=['1.1','1.2','1.3','1.4','1.5','1.6','1.7','1.8','1.9','1.10','1.11','1.12','1.13','2.1','2.2','2.3','2.4','2.5','2.6','2.7','2.8','2.9','3.1','3.2','3.3','3.4','3.5','4.1','4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9','5.1','5.2','5.3','5.4','5.5','5.6','5.7','5.8','5.9','5.10','6.1','6.2','6.3','6.4','6.5','6.6','6.7'];
let errors=0,seen={};const err=(k,m)=>{errors++;console.log('ERROR',k+':',m);};
const words=s=>String(s).replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length;
function tags(k,where,s){if(typeof s!=='string')return err(k,where+' is not a string');
  if(/<script|\$\{|on\w+=|<img|<svg|<a /i.test(s))err(k,where+' has forbidden markup');
  const st=[];for(const m of s.matchAll(/<(\/?)(\w+)[^>]*>/g)){const t=m[2].toLowerCase();if(t==='br')continue;
    if(!['p','b','i','code','ol','ul','li','small','kbd'].includes(t))err(k,where+' uses <'+t+'>');
    if(m[1]){if(st.pop()!==t)err(k,where+' has unbalanced </'+t+'>');}else st.push(t);}
  if(st.length)err(k,where+' leaves <'+st.join(',')+'> open');}
const data=html.split('//LESSONS-DATA-START')[1]?.split('//LESSONS-DATA-END')[0];
if(!data){console.log('ERROR lesson data markers missing');process.exit(1);}
const sources=[['index.html',data],...process.argv.slice(2).map(f=>[f,fs.readFileSync(f,'utf8')])],all={};
for(const [f,code] of sources){const LESSONS={};
  try{vm.runInContext(code,vm.createContext({LESSONS}));}catch(e){err(f,'does not parse: '+e.message);continue;}
  Object.assign(all,LESSONS);
  for(const [k,L] of Object.entries(LESSONS)){if(seen[k])err(k,'defined twice');seen[k]=1;
    const lab=byTitle[k];
    if(L.topic){if(lab)err(k,'topic lesson uses a lab title');if(!Array.isArray(L.ccna)||!L.ccna.length||L.ccna.some(c=>!OBJ.includes(c)))err(k,'topic lesson needs ccna ids from the v1.1 list');}
    else if(!lab){err(k,'is not a build lab title (topic lessons need topic:true)');continue;}
    if(typeof L.name!=='string'||L.name.length>48)err(k,'name missing or over 48 chars');
    if(!(L.mins>=4&&L.mins<=12))err(k,'mins should be 4 to 12');
    if(!Array.isArray(L.sections)||L.sections.length<4||L.sections.length>8)err(k,'needs 4 to 8 sections');
    (L.sections||[]).forEach(([h,b],i)=>{if(typeof h!=='string'||!h)err(k,'section '+i+' heading');tags(k,'section '+i,b);if(!/^<(p|ol|ul)>/.test(b||''))err(k,'section '+i+' must start with <p>, <ol> or <ul>');});
    if(!Array.isArray(L.terms)||L.terms.length<5)err(k,'needs at least 5 terms');(L.terms||[]).forEach(t=>{if(!Array.isArray(t)||t.length!==2||/</.test(t[0]+t[1]))err(k,'terms are [term, definition] plain text');});
    for(const f2 of ['exam','mistakes']){if(!Array.isArray(L[f2])||L[f2].length<3)err(k,f2+' needs at least 3');(L[f2]||[]).forEach((x,i)=>tags(k,f2+' '+i,x));}
    if(!Array.isArray(L.quiz)||L.quiz.length<4||L.quiz.length>5)err(k,'quiz needs 4 or 5 questions');
    (L.quiz||[]).forEach((q,i)=>{if(!Array.isArray(q)||q.length!==4)return err(k,'quiz '+i+' shape');tags(k,'quiz '+i,q[0]);q[1].forEach(o=>tags(k,'quiz '+i+' option',o));tags(k,'quiz '+i+' why',q[3]);
      if(q[1].length!==4||!(q[2]>=0&&q[2]<=3))err(k,'quiz '+i+' needs 4 options and a correct index 0-3');if(new Set(q[1]).size!==4)err(k,'quiz '+i+' repeats an option');});
    if(L.topic){if(L.story)err(k,'topic lessons have no story');}
    else{const n=lab.build(),linked=(a,b)=>n.links.some(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));
      if(!Array.isArray(L.story)||L.story.length<3||L.story.length>8)err(k,'story needs 3 to 8 steps');
      (L.story||[]).forEach((s,i)=>{const w='story '+i;if(!Array.isArray(s.path)||s.path.length<2)return err(k,w+' path');
        s.path.forEach(d=>{if(!lab.pos[d])err(k,w+' device '+d+' is not on the map');});
        for(let j=1;j<s.path.length;j++)if(!linked(s.path[j-1],s.path[j]))err(k,w+' '+s.path[j-1]+' and '+s.path[j]+' are not cabled together');
        if(!lab.pos[s.at])err(k,w+' at '+s.at+' not on the map');if(!['req','rep'].includes(s.cls))err(k,w+' cls must be req or rep');
        if(typeof s.label!=='string'||s.label.length>16||s.label!==s.label.toUpperCase())err(k,w+' label must be UPPERCASE, max 16 chars');
        if(typeof s.t!=='string'||!s.t)err(k,w+' t');tags(k,w+' x',s.x);if(s.good&&s.bad)err(k,w+' both good and bad');});}
    const total=words((L.sections||[]).map(s=>s[1]).join(' '))+words((L.story||[]).map(s=>s.x).join(' '));
    if(total<450)err(k,'is only '+total+' words; aim for 550 to 900');}}
for(const l of LABS)if(!all[l.title])err(l.title,'has no lesson');
const ks=Object.keys(all),topics=ks.filter(k=>all[k].topic).length;
if(errors){console.log(errors+' lesson errors');process.exitCode=1;}
else console.log(`PASS lessons: ${ks.length} lessons (${ks.length-topics} lab, ${topics} topic), every build lab covered, every story step on cabled devices, every quiz answer valid.`);
