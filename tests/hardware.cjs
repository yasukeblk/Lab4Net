const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const extract=n=>html.split(`//${n}-START`)[1].split(`//${n}-END`)[0];
const ctx=vm.createContext({console});vm.runInContext(extract('ENGINE')+extract('SANDBOX')+'\nthis.api={hardwareSwitch,sandboxModel,sandboxApply,execLine,promptOf,ip2n,canPing,candidates,trace:()=>TRACE};',ctx);
const {hardwareSwitch,sandboxModel,sandboxApply,execLine,promptOf,ip2n,canPing,candidates}=ctx.api;
const c=hardwareSwitch('CAT','c2960-24tt'),j=hardwareSwitch('EX','ex2300-24t');
assert.equal(Object.keys(c.ifs).filter(n=>n.startsWith('FastEthernet')).length,24);
assert.ok(c.ifs['GigabitEthernet0/1']);assert.ok(c.ifs['GigabitEthernet0/2']);
assert.equal(Object.keys(j.ifs).length,28);assert.ok(j.ifs['ge-0/0/23']);assert.ok(j.ifs['xe-0/1/3']);
const project={format:'lab4net-sandbox',version:1,events:[
 {op:'add',type:'pc',name:'PC1',x:70,y:125},{op:'add',type:'switch',hardware:'c2960-24tt',name:'CAT1',x:220,y:125},
 {op:'add',type:'switch',hardware:'ex2300-24t',name:'EX1',x:375,y:125},{op:'add',type:'pc',name:'PC2',x:530,y:125},
 {op:'link',a:'PC1',ai:'f0',b:'CAT1',bi:'f0/1'},{op:'link',a:'CAT1',ai:'g0/1',b:'EX1',bi:'ge-0/0/23'},{op:'link',a:'EX1',ai:'ge-0/0/0',b:'PC2',bi:'f0'},
 {op:'command',device:'PC1',line:'ipconfig /ip 192.168.10.10 255.255.255.0'},
 {op:'command',device:'PC2',line:'ipconfig /ip 192.168.10.20 255.255.255.0'}]};
const m=sandboxModel(project),ex=m.net.devs.EX1,s=m.sess.EX1;
const run=(device,line)=>{const output=execLine(m.net,m.net.devs[device],m.sess[device],line);project.events.push({op:'command',device,line});return output;};
const good=(device,line)=>{const out=run(device,line);assert.ok(!out.some(x=>/^error:|^% Invalid|commit failed/.test(x)),`${device}: ${line}: ${out.join('\n')}`);return out;};
assert.equal(s.mode,'junos-op');assert.equal(promptOf(ex,s),'lab@EX1>');
assert.match(run('EX1','enable').join('\n'),/Unsupported/);
assert.throws(()=>sandboxApply(m,{op:'link',a:'CAT1',ai:'g0/2',b:'EX1',bi:'xe-0/1/0'}),/No common link speed/);
assert.equal(m.net.devs.CAT1.ifs['GigabitEthernet0/2'].link,null);
for(const line of ['enable','configure terminal','vlan 10','name BLUE','interface f0/1','switchport mode access','switchport access vlan 10','interface g0/1','switchport mode trunk','switchport trunk allowed vlan 10','end'])good('CAT1',line);
assert.equal(canPing(m.net,m.net.devs.PC1,ip2n('192.168.10.20')),false);
good('EX1','configure');assert.equal(promptOf(ex,s),'lab@EX1#');
for(const line of ['set system host-name edge-ex','set vlans BLUE vlan-id 10','set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode access','set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members BLUE','set interfaces ge-0/0/23 unit 0 family ethernet-switching interface-mode trunk','set interfaces ge-0/0/23 unit 0 family ethernet-switching vlan members BLUE'])good('EX1',line);
assert.equal(ex.hostname,'EX1');assert.equal(ex.ifs['ge-0/0/0'].accessVlan,1);
assert.equal(canPing(m.net,m.net.devs.PC1,ip2n('192.168.10.20')),false);
assert.match(good('EX1','show | compare').join('\n'),/\+ set vlans BLUE vlan-id 10/);
assert.match(good('EX1','commit check').join('\n'),/check succeeds/);
assert.equal(ex.ifs['ge-0/0/0'].accessVlan,1);
good('EX1','commit');assert.equal(ex.hostname,'edge-ex');assert.equal(ex.ifs['ge-0/0/0'].accessVlan,10);
assert.ok(canPing(m.net,m.net.devs.PC1,ip2n('192.168.10.20')));
good('PC1','ping 192.168.10.20');assert.deepEqual(Array.from(ctx.api.trace().f.hops.path),['PC1','CAT1','EX1','PC2']);
// Invalid commits stay atomic and retain the candidate for correction.
good('EX1','delete interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members BLUE');
good('EX1','set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members MISSING');
assert.match(run('EX1','commit').join('\n'),/unknown VLAN/);assert.equal(ex.ifs['ge-0/0/0'].accessVlan,10);
good('EX1','rollback 0');
good('EX1','set interfaces ge-0/0/0 disable');assert.equal(ex.ifs['ge-0/0/0'].shutdown,false);
good('EX1','commit');assert.equal(canPing(m.net,m.net.devs.PC1,ip2n('192.168.10.20')),false);
good('EX1','delete interfaces ge-0/0/0 disable');good('EX1','commit');
// Management IRB works without claiming full EX2300 Layer 3 emulation.
good('EX1','set interfaces irb unit 10 family inet address 192.168.10.1/24');
good('EX1','set vlans BLUE l3-interface irb.10');good('EX1','commit');
assert.ok(canPing(m.net,m.net.devs.PC1,ip2n('192.168.10.1')));
good('EX1','run ping 192.168.10.10');assert.equal(ctx.api.trace().ok,true);
assert.match(good('EX1','run show interfaces terse').join('\n'),/irb.10/);
good('EX1','set vlans DUP vlan-id 10');assert.match(run('EX1','commit check').join('\n'),/unique/);good('EX1','rollback 0');
good('EX1','rollback 1');good('EX1','commit');assert.equal(ex.ifs.Vlan10,undefined);
good('EX1','set system host-name pending-name');assert.match(run('EX1','exit').join('\n'),/Uncommitted/);
assert.equal(s.mode,'junos-config');assert.equal(ex.hostname,'edge-ex');
assert.ok(candidates(ex,'junos-config','comm').includes('commit'));
const restored=sandboxModel(JSON.parse(JSON.stringify(project)));
assert.equal(restored.net.devs.EX1.hardware,'ex2300-24t');assert.equal(restored.net.devs.CAT1.hardware,'c2960-24tt');
assert.equal(restored.net.devs.EX1.hostname,'edge-ex');assert.equal(restored.sess.EX1.candidate.hostname,'pending-name');
assert.equal(restored.sess.EX1.mode,'junos-config');assert.ok(canPing(restored.net,restored.net.devs.PC1,ip2n('192.168.10.20')));
const r=(line)=>execLine(restored.net,restored.net.devs.EX1,restored.sess.EX1,line).join('\n');
r('rollback 0');r('set interfaces ge-0/0/23 native-vlan-id 10');assert.match(r('commit'),/commit complete/);
assert.equal(restored.net.devs.EX1.ifs['ge-0/0/23'].native,10);
r('set interfaces ge-0/0/23 native-vlan-id 20');assert.match(r('commit'),/native VLAN must exist/);
assert.equal(restored.net.devs.EX1.ifs['ge-0/0/23'].native,10);r('rollback 0');
r('set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members all');assert.match(r('commit check'),/access port needs exactly one VLAN/);
assert.equal(restored.net.devs.EX1.ifs['ge-0/0/0'].accessVlan,10);
console.log('PASS hardware: model port layouts, copper speed compatibility, IOS/Junos separation, candidate isolation, atomic commit/check, rollback, shutdown, management IRB, mixed-vendor VLAN path and project/session replay.');
