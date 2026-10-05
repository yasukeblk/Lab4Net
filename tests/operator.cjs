const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),part=n=>html.split(`//${n}-START`)[1].split(`//${n}-END`)[0];
const ctx=vm.createContext({console});vm.runInContext(part('ENGINE')+part('SANDBOX')+part('OPERATOR')+'\nthis.api={LABS,execLine,operatorSnapshot,operatorInspect,operatorRedact,sandboxModel,trace:()=>TRACE};',ctx);
const {LABS,execLine,operatorSnapshot,operatorInspect,operatorRedact,sandboxModel}=ctx.api;
for(const lab of LABS){
 const net=lab.build(),sess=Object.fromEntries(Object.values(net.devs).map(d=>[d.name,{mode:d.type==='pc'?'pc':'user'}]));
 for(const [name,commands] of Object.entries(lab.solution))for(const command of commands)execLine(net,net.devs[name],sess[name],command);
 const before=JSON.stringify(net),trace=ctx.api.trace();
 const snapshot=operatorSnapshot({view:'lab',lab,net,sess,sel:Object.keys(net.devs)[0],tasks:[]});
 assert.ok(snapshot.lab.checks.every(c=>c.passed),lab.title);assert.equal(snapshot.devices.length,Object.keys(net.devs).length);
 assert.ok(snapshot.supportedCommands.length>50);assert.equal(snapshot.labCatalog.length,LABS.length);
 assert.equal(JSON.stringify(net),before,'snapshot must not change configurations/NAT');assert.equal(ctx.api.trace(),trace);
 assert.equal(snapshot.lab.tasks.length,lab.why.length);
}
const m=sandboxModel({format:'lab4net-sandbox',version:1,events:[
 {op:'add',type:'pc',name:'PC1',x:100,y:100},{op:'add',type:'switch',name:'SW1',x:300,y:100},{op:'add',type:'pc',name:'PC2',x:450,y:100},
 {op:'link',a:'PC1',ai:'f0',b:'SW1',bi:'f0/1'},{op:'link',a:'SW1',ai:'f0/2',b:'PC2',bi:'f0'},
 {op:'command',device:'PC1',line:'ipconfig /ip 192.168.1.10 255.255.255.0'},
 {op:'command',device:'PC2',line:'ipconfig /ip 192.168.1.20 255.255.255.0'}]});
const before=JSON.stringify(m.net),savedTrace=ctx.api.trace();
const success=operatorInspect(m.net,'PC1','192.168.1.20');assert.ok(success.ok);assert.deepEqual(Array.from(success.request.path),['PC1','SW1','PC2']);
assert.deepEqual(Array.from(success.reply.path),['PC2','SW1','PC1']);
const fail=operatorInspect(m.net,'SW1','192.168.1.20');assert.equal(fail.ok,false);assert.match(fail.request.reason,/route/);
assert.equal(JSON.stringify(m.net),before);assert.equal(ctx.api.trace(),savedTrace);
assert.throws(()=>operatorInspect(m.net,'MISSING','192.168.1.20'));
assert.equal(operatorInspect(m.net,'PC1','192.168.1.20','ssh').refused,true);
const clean=operatorRedact({password:'dont-send',nested:{secret:'dont-send',users:[{name:'a',password:'dont-send'}]},config:'enable secret dont-send\ninterface vlan 1',key:'sk-fakecredential123'});
assert.doesNotMatch(JSON.stringify(clean),/dont-send|fakecredential/);assert.match(clean.config,/interface vlan 1/);
assert.equal(operatorRedact('How do I set a console password?'),'How do I set a console password?');
assert.equal(operatorRedact('enable secret <w>'),'enable secret <w>');
console.log(`PASS Operator context: all ${LABS.length} solved lab snapshots/checks, task reasons, command catalog, actual bidirectional paths, switch management failure, closed service, credential redaction and no changes to network/NAT/TRACE.`);
