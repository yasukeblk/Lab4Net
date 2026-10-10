// Exam sim: seeded surprise faults on finished labs. Every fault must be real configuration the engine accepts,
// must make at least one of the lab's own checks fail, and must be reproducible from its seed.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const context=vm.createContext({assert,console});
vm.runInContext(engine+`
{
const builds=LABS.filter(l=>l.kind==='build'&&!l.capstone);
const used=new Map();let withFault=0,total=0;
for(const lab of builds){
  assert.ok(labPasses(lab,solvedNet(lab)),lab.title+': the solution must pass before anything is broken');
  for(const seed of ['a','b','c']){total++;
    const f=examFault(lab,seed,1);if(!f)continue;withFault++;
    assert.equal(f.length,1);assert.ok(f[0].desc&&f[0].id&&f[0].cmds,lab.title+': fault needs id, desc and cmds');
    used.set(f[0].id,(used.get(f[0].id)||0)+1);
    const net=solvedNet(lab);applyCmds(net,f[0].cmds);
    assert.ok(failingChecks(lab,net)>0,lab.title+' / '+f[0].id+': the fault must break a check');
    assert.deepEqual(examFault(lab,seed,1),f,lab.title+': the same seed gives the same fault');
    const ex=examLab(lab,f,'Exam · '+lab.title),en=ex.build();
    assert.ok(failingChecks(ex,en)>0&&ex.kind==='exam'&&ex.exam&&ex.tasks.length===lab.tasks.length&&ex.checks===lab.checks&&ex.lesson.toLowerCase().includes(f[0].desc.toLowerCase()));
  }
  // two faults at once
  const f2=examFault(lab,'two',2);if(f2){const net=solvedNet(lab);for(const f of f2)applyCmds(net,f.cmds);assert.ok(failingChecks(lab,net)>0);assert.ok(f2.length<=2);}
}
assert.ok(withFault/total>0.85,'most labs and seeds must yield a fault ('+withFault+'/'+total+')');
console.log('Faults found for '+withFault+'/'+total+' lab/seed pairs; generators used: '+[...used.entries()].map(([k,v])=>k+'×'+v).join(', '));
// every generator must produce a check-breaking fault on at least one lab when asked directly
const dead=[];for(const g of EXAM_FAULTS){let hits=0;for(const lab of builds)for(const sd of ['1','2','3']){const net=solvedNet(lab);let r=null;try{r=g.gen(net,seedRng(g.id+sd));}catch(e){r=null;}if(!r)continue;try{applyCmds(net,r.cmds);}catch(e){throw Error(g.id+' rejected on '+lab.title+': '+e.message);}if(failingChecks(lab,net)>0)hits++;}if(!hits)dead.push(g.id);}
assert.deepEqual(dead,[],'generators that break nothing anywhere');
// the seeded generator is stable
const r1=seedRng('lab4net'),r2=seedRng('lab4net');assert.equal(r1(),r2());assert.notEqual(seedRng('x')(),seedRng('y')());
// REVIEW-FIXES polish: the default-gateway fault points at a free address in the right subnet, and root causes start upper case
{const g=EXAM_FAULTS.find(x=>x.id==='gw');let n=0;for(const l of LABS.filter(l=>l.kind==='build'&&!l.capstone)){const net=solvedNet(l);
  for(let k=0;k<4;k++){const f=g.gen(net,seedRng(l.title+k));if(!f)continue;n++;const ip=ip2n(f.desc.match(/points at ([0-9.]+)/)[1]);assert.ok(!ownerOf(net,ip),l.title+': '+f.desc);}}
  assert.ok(n>0,'the gateway fault appears');
  const lab=LABS.find(l=>l.title==='Static routing'),ex=examLab(lab,[{cmds:{},desc:'the route to the far LAN was removed'}],'Exam · x');assert.ok(/^The route/.test(ex.lesson),ex.lesson);}
}
`,context);
console.log('PASS exam: seeded sabotage faults on every build lab break a check, are real IOS configuration, reproduce from their seed, and the exam lab carries the base requirements, checks and root cause.');
