const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),ctx=vm.createContext({console});
vm.runInContext(html.split('//ENGINE-START')[1].split('//ENGINE-END')[0]+'\nthis.api={LABS,INCIDENTS,CCNA_OBJECTIVES,CCNA_SCOPE,execLine,reach,ip2n,trace:()=>TRACE,setLive:b=>LIVE=b};',ctx);
const {LABS,INCIDENTS,CCNA_OBJECTIVES,CCNA_SCOPE,execLine,reach,ip2n}=ctx.api;
assert.equal(CCNA_SCOPE.exam,'200-301');assert.equal(CCNA_SCOPE.version,'1.1');
assert.equal(new Set(LABS.map(l=>l.title)).size,LABS.length);
for(const lab of LABS){
 assert.ok(lab.ccna.length,lab.title+' needs CCNA mapping');
 for(const id of lab.ccna)assert.ok(Object.hasOwn(CCNA_OBJECTIVES,id),lab.title+' unknown objective '+id);
}
assert.ok(INCIDENTS.length>=6);assert.equal(LABS.filter(l=>l.kind==='incident').length,INCIDENTS.length);
// Configuration, not counters, logs or NAT translations: a live probe may count ACL matches, log, and create a
// translation, and an NTP client remembers its last
// server. IPv6 addresses are BigInts.
const COUNTERS=new Set(['ntpLast','hits','misses','fwd','drops','logBuf','conq','trapSent','syslog','table','dyn']);
const state=n=>JSON.stringify(n,(k,v)=>COUNTERS.has(k)?undefined:typeof v==='bigint'?v.toString():v);
for(const spec of INCIDENTS){
 assert.match(spec.title,/^Incident \d\d: /);
 const lab=LABS.find(l=>l.title===spec.title),n=lab.build();
 // A symptom is either [source, target, proto, port] for a packet test, or a function for any other service (discovery, time, IPv6).
 const works=net=>{if(typeof spec.symptom==='function')return spec.symptom(net);const[source,target,proto='icmp',port=0]=spec.symptom;return reach(net,net.devs[source],ip2n(target),proto,port).ok;};
 assert.ok(lab.checks.some(([,check])=>!check(n)),spec.title+' must start with a failing requirement');
 const before=state(n),keep=ctx.api.trace();lab.build();assert.equal(ctx.api.trace(),keep,'building an incident preserves the live trace');
 if(typeof spec.symptom==='function')assert.equal(spec.symptom(n),false,spec.title+' must reproduce a real service failure');
 else{const[source,target,proto='icmp',port=0]=spec.symptom;
  ctx.api.setLive(true);const initial=reach(n,n.devs[source],ip2n(target),proto,port),trace=ctx.api.trace();ctx.api.setLive(false);
  assert.equal(initial.ok,false,spec.title+' must reproduce a real service failure');
  if(spec.title.startsWith('Incident 03')){assert.ok(trace.f.ok);assert.equal(trace.r.ok,false);assert.deepEqual(Array.from(trace.f.hops.path),['PC1','R1','R2','R3','PC2']);}
  if(spec.title.startsWith('Incident 06'))assert.ok(initial.refused,'SSH is closed despite IP reachability');}
 assert.equal(state(n),before,'diagnostic probe should not modify the initial config');
 assert.equal(lab.hints.length,3);assert.equal(lab.why.length,4);assert.equal(lab.steps.length,4);assert.ok(lab.lesson&&lab.lesson.length>20,spec.title+' needs a lesson');
 for(const [dev,commands] of Object.entries(lab.solution)){const session={mode:n.devs[dev].type==='pc'?'pc':'user'};for(const command of commands){const out=execLine(n,n.devs[dev],session,command);
  assert.ok(!out.some(l=>/^% (Invalid|Incomplete|Ambiguous)/.test(l)),spec.title+' repair rejected '+command);}}
 assert.ok(lab.checks.every(([,check])=>check(n)),spec.title+' repair must preserve all original requirements');
 assert.ok(works(n),spec.title+' repaired service works');
}
console.log('PASS CCNA curriculum: all '+LABS.length+' missions mapped, '+INCIDENTS.length+' incidents with a real initial failure, request/reply diagnosis, minimal repairs preserving original requirements, explained hints and trace isolation.');
