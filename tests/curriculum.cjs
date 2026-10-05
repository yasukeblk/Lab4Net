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
assert.equal(INCIDENTS.length,6);
for(const spec of INCIDENTS){
 const lab=LABS.find(l=>l.title===spec.title),n=lab.build(),[source,target,proto='icmp',port=0]=spec.symptom;
 assert.ok(lab.checks.some(([,check])=>!check(n)),spec.title+' must start with a failing requirement');
 const before=JSON.stringify(n),keep=ctx.api.trace();lab.build();assert.equal(ctx.api.trace(),keep,'building an incident preserves the live trace');
 ctx.api.setLive(true);const initial=reach(n,n.devs[source],ip2n(target),proto,port),trace=ctx.api.trace();ctx.api.setLive(false);
 assert.equal(initial.ok,false,spec.title+' must reproduce a real service failure');
 if(spec.title.startsWith('Incident 03')){assert.ok(trace.f.ok);assert.equal(trace.r.ok,false);assert.deepEqual(Array.from(trace.f.hops.path),['PC1','R1','R2','R3','PC2']);}
 if(spec.title.startsWith('Incident 06'))assert.ok(initial.refused,'SSH is closed despite IP reachability');
 assert.equal(JSON.stringify(n),before,'diagnostic probe should not modify the initial config');
 assert.equal(lab.hints.length,3);assert.equal(lab.why.length,4);assert.equal(lab.steps.length,4);
 for(const [dev,commands] of Object.entries(lab.solution)){const session={mode:n.devs[dev].type==='pc'?'pc':'user'};for(const command of commands)execLine(n,n.devs[dev],session,command);}
 assert.ok(lab.checks.every(([,check])=>check(n)),spec.title+' repair must preserve all original requirements');
 assert.ok(reach(n,n.devs[source],ip2n(target),proto,port).ok,spec.title+' repaired service works');
}
console.log('PASS CCNA curriculum: all '+LABS.length+' missions mapped, six actual initial service failures, request/reply diagnosis, minimal repairs preserving original requirements, explained hints and trace isolation.');
