// Switching realism: frames follow the spanning tree, switches learn MAC addresses from live traffic, unknown
// destinations and ARP requests are flooded, and show/clear mac address-table behave like IOS.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const context=vm.createContext({assert,console});
vm.runInContext(engine+`
function build(title){return LABS.find(l=>l.title===title).build();}
function solve(title){const lab=LABS.find(l=>l.title===title),net=lab.build();for(const [name,commands] of Object.entries(lab.solution)){const d=net.devs[name],s={mode:d.type==='pc'?'pc':'user'};commands.forEach(c=>execLine(net,d,s,c));}return net;}
function cmd(net,dev,line,mode){const d=net.devs[dev],s={mode:mode||(d.type==='pc'?'pc':'priv')};const out=execLine(net,d,s,line);return {out,text:out.join('\\n')};}
function ios(net,dev,lines){const d=net.devs[dev],s={mode:'priv'};for(const l of lines)execLine(net,d,s,l);}
const tab=sw=>(sw.mact||[]).map(e=>e.mac+' '+e.vlan+' '+shortIf(e.ifn)).sort();
const entry=(sw,mac)=>(sw.mact||[]).find(e=>e.mac===mac);
const role=(net,sw,v,ifn)=>stpCalc(net,v).info[sw].ports[parseIf(ifn)].role;
{

// ----- Frames follow the spanning tree
let net=build('Spanning tree: root bridge and edge ports');
const SW1=net.devs.SW1,SW2=net.devs.SW2,SW3=net.devs.SW3,PC1=net.devs.PC1,PC2=net.devs.PC2;
// SW3 has the lowest MAC, so it is root by accident; SW1's link to SW2 blocks on SW1's side.
assert.equal(stpCalc(net,1).root,SW3);
assert.equal(role(net,'SW1',1,'g0/1'),'Altn');assert.equal(role(net,'SW2',1,'g0/1'),'Desg');
let r=reach(net,PC1,ip2n('192.168.1.12'));
assert.equal(r.ok,true);assert.deepEqual(Array.from(r.f.hops.path),['PC1','SW1','SW3','PC2']);
// Nothing learned while grading or testing (LIVE off, and no console command involved).
assert.equal(SW1.mact,undefined);assert.equal(SW3.mact,undefined);
// Make SW2 the root: the SW1-SW3 link now blocks on SW1's side and the ping goes the long way round, as show spanning-tree says.
ios(net,'SW2',['configure terminal','spanning-tree vlan 1 root primary','end']);
assert.equal(stpCalc(net,1).root,SW2);assert.equal(role(net,'SW1',1,'g0/2'),'Altn');assert.equal(role(net,'SW1',1,'g0/1'),'Root');
r=reach(net,PC1,ip2n('192.168.1.12'));
assert.equal(r.ok,true);assert.deepEqual(Array.from(r.f.hops.path),['PC1','SW1','SW2','SW3','PC2']);
assert.match(cmd(net,'SW1','show spanning-tree').text,/Gi0\\/2\\s+Altn BLK/);
// A switch cut off from the others elects itself root instead of believing in one it cannot hear.
ios(net,'SW1',['configure terminal','interface range g0/1 - 2','shutdown','end']);
assert.equal(stpCalc(net,1).info.SW1.root,SW1);assert.match(cmd(net,'SW1','show spanning-tree').text,/This bridge is the root/);
assert.equal(stpCalc(net,1).info.SW3.root,SW2);
ios(net,'SW1',['configure terminal','interface range g0/1 - 2','no shutdown','end']);

// ----- MAC learning from a live ping: ARP broadcast floods, the reply is unicast, then everything is known
net=build('Spanning tree: root bridge and edge ports');
const pc1=macOf(net.devs.PC1),pc2=macOf(net.devs.PC2);
let out=cmd(net,'PC1','ping 192.168.1.12');
assert.match(out.text,/Reply from 192.168.1.12/);
let T=TRACE;assert.ok(T&&T.f.hops.l2&&T.f.hops.l2.length===1,'one Layer 2 hop recorded');
let ev=T.f.hops.l2[0];
assert.equal(ev.arp,true,'the first frame needs ARP');assert.equal(ev.flood,'PC1');
assert.equal(ev.srcMac,pc1);assert.equal(ev.dstMac,pc2);
// The broadcast reached every link in VLAN 1, including the one that dies at SW1's blocked port.
assert.ok(ev.edges.some(([a,b,blk])=>a==='SW2'&&b==='SW1'&&blk),'flood hits the blocked port and stops there');
assert.ok(ev.edges.some(([a,b])=>a==='SW3'&&b==='PC2'));
assert.deepEqual(tab(net.devs.SW1),[pc1+' 1 Fa0/1',pc2+' 1 Gi0/2'].sort());
assert.deepEqual(tab(net.devs.SW3),[pc1+' 1 Gi0/1',pc2+' 1 Fa0/1'].sort());
// SW2 saw the broadcast (so it knows PC1) but not the unicast reply, so it does not know PC2.
assert.deepEqual(tab(net.devs.SW2),[pc1+' 1 Gi0/2']);
// The reply did not need ARP: PC2 learned PC1 from the request.
assert.equal(T.r.hops.l2[0].arp,false);assert.equal(T.r.hops.l2[0].flood,null);
assert.ok(T.r.hops.l2[0].sw.every(x=>x.known));
// Second ping: everything known, nothing flooded.
cmd(net,'PC1','ping 192.168.1.12');ev=TRACE.f.hops.l2[0];
assert.equal(ev.arp,false);assert.equal(ev.flood,null);assert.ok(ev.sw.every(x=>x.known));
assert.deepEqual(ev.sw.map(x=>x.sw+':'+shortIf(x.out)),['SW1:Gi0/2','SW3:Fa0/1']);
// Clear SW1's table: the ARP cache is still warm, so the next frame is an unknown unicast that SW1 floods.
cmd(net,'SW1','clear mac address-table dynamic');assert.deepEqual(tab(net.devs.SW1),[]);
cmd(net,'PC1','ping 192.168.1.12');ev=TRACE.f.hops.l2[0];
assert.equal(ev.arp,false);assert.equal(ev.flood,'SW1');assert.equal(ev.sw[0].known,false);assert.equal(ev.sw[1].known,true,'SW3 still knew PC2');
assert.ok(ev.edges.some(([a,b])=>a==='SW1'&&b==='SW3')&&!ev.edges.some(([a])=>a==='PC1'),'the flood starts at SW1');
assert.deepEqual(tab(net.devs.SW1),[pc1+' 1 Fa0/1',pc2+' 1 Gi0/2'].sort());

// ----- show mac address-table in the IOS layout
out=cmd(net,'SW1','show mac address-table');
assert.equal(out.out[0],'          Mac Address Table');
assert.equal(out.out[3],'Vlan    Mac Address       Type        Ports');
assert.ok(out.out.includes(' All    0100.0ccc.cccc    STATIC      CPU'));
assert.ok(out.out.includes(' All    ffff.ffff.ffff    STATIC      CPU'));
assert.ok(out.out.includes('   1    '+pc1+'    DYNAMIC     Fa0/1'),out.text);
// REVIEW-FIXES 21: SW1 Gi0/1 (to SW2) is the blocked Altn port, so SW2 is not learned there; SW3 is heard on Gi0/2.
assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 23','20 CPU rows, 2 learned PCs, 1 neighbour switch heard over CDP and BPDUs on a forwarding port');
{const S2=net.devs.SW2,S3=net.devs.SW3,m2=macTx(net,S2,S2.ifs[parseIf('g0/1')]),m3=macTx(net,S3,S3.ifs[parseIf('g0/1')]);
  assert.equal(role(net,'SW1',1,'g0/1'),'Altn');assert.ok(!out.text.includes(m2),'nothing is learned on a blocked port');assert.ok(out.out.includes('   1    '+m3+'    DYNAMIC     Gi0/2'),out.text);}
out=cmd(net,'SW1','show mac address-table dynamic');
assert.equal(out.out.length,5+3+1);assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 3');
assert.ok(!out.text.includes('CPU'));
out=cmd(net,'SW1','show mac address-table address '+pc2);assert.ok(out.out.includes('   1    '+pc2+'    DYNAMIC     Gi0/2'));assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 1');
out=cmd(net,'SW1','show mac address-table interface fa0/1');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 1');assert.ok(out.text.includes(pc1));
out=cmd(net,'SW1','show mac address-table interface fastethernet 0/1');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 1');
out=cmd(net,'SW1','show mac address-table vlan 1');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 3');
out=cmd(net,'SW1','show mac address-table dynamic vlan 1');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 3');
out=cmd(net,'SW1','show mac address-table vlan 99');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 0');
out=cmd(net,'SW1','show mac-address-table dynamic');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 3','old spelling works');
out=cmd(net,'SW1','sh mac add dyn');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 3','abbreviations work');
out=cmd(net,'SW1','show mac address-table aging-time');assert.deepEqual(out.out,['Global Aging Time:  300','Vlan    Aging Time','----    ----------']);
out=cmd(net,'SW1','show mac address-table count');assert.ok(out.text.includes('Mac Entries for Vlan 1:')&&out.text.includes('Dynamic Address Count  : 3'),out.text);
out=cmd(net,'SW1','show mac address-table bogus');assert.ok(out.out.includes(BAD));
out=cmd(net,'SW1','show mac address-table vlan 5000');assert.ok(out.out.includes(BAD));
assert.ok(cmd(net,'SW1','clear mac address-table','priv').text.includes('% Incomplete command.'));
// Not a switch command.
net.devs.PC1.type==='pc';
const rn=build('Static routing');assert.ok(cmd(rn,'R1','show mac address-table').out.includes(BAD));

// ----- clear with a filter, static entries, aging time, the running-config
cmd(net,'SW1','clear mac address-table dynamic interface gi0/2');assert.deepEqual(tab(net.devs.SW1),[pc1+' 1 Fa0/1']);
cmd(net,'SW1','clear mac address-table dynamic address '+pc1);assert.deepEqual(tab(net.devs.SW1),[]);
cmd(net,'PC1','ping 192.168.1.12');cmd(net,'SW1','clear mac address-table dynamic vlan 1');assert.deepEqual(tab(net.devs.SW1),[]);
ios(net,'SW1',['configure terminal','mac address-table static 0000.1111.2222 vlan 1 interface fa0/5','mac address-table aging-time 600','end']);
out=cmd(net,'SW1','show mac address-table static');assert.ok(out.out.includes('   1    0000.1111.2222    STATIC      Fa0/5'),out.text);
assert.ok(!cmd(net,'SW1','show mac address-table dynamic').text.includes('0000.1111.2222'));
assert.equal(cmd(net,'SW1','show mac address-table aging-time').out[0],'Global Aging Time:  600');
let run=cmd(net,'SW1','show running-config').text;
assert.ok(run.includes('mac address-table aging-time 600'));assert.ok(run.includes('mac address-table static 0000.1111.2222 vlan 1 interface FastEthernet0/5'));
assert.ok(cmd(net,'SW1','mac address-table aging-time 5','config').out.includes(BAD),'5 seconds is out of range');
assert.ok(cmd(net,'SW1','mac address-table static 0000.1111.2222 vlan 1 interface vlan1','config').out.includes(BAD));
ios(net,'SW1',['configure terminal','no mac address-table static 0000.1111.2222 vlan 1 interface fa0/5','no mac address-table aging-time','end']);
run=cmd(net,'SW1','show running-config').text;assert.ok(!run.includes('mac address-table'));
// Entries age out after the aging time with no traffic, and leave at once when their port goes down.
cmd(net,'PC1','ping 192.168.1.12');assert.equal(tab(net.devs.SW1).length,2);
net.devs.SW1.macAging=10;for(const e of net.devs.SW1.mact)e.t-=11000;
assert.equal(cmd(net,'SW1','show mac address-table dynamic').out.at(-1),'Total Mac Addresses for this criterion: 1','only the neighbour on the forwarding port (SW3) remains; SW2 is behind the blocked port');
delete net.devs.SW1.macAging;cmd(net,'PC1','ping 192.168.1.12');assert.equal(tab(net.devs.SW1).length,2);
ios(net,'SW1',['configure terminal','interface f0/1','shutdown','end']);
assert.deepEqual(tab(net.devs.SW1),[pc2+' 1 Gi0/2']);
ios(net,'SW1',['configure terminal','interface f0/1','no shutdown','end']);
// Aging 0 keeps entries for ever.
ios(net,'SW1',['configure terminal','mac address-table aging-time 0','end']);cmd(net,'PC1','ping 192.168.1.12');for(const e of net.devs.SW1.mact)e.t-=1e9;
assert.equal(tab(net.devs.SW1).length,2);

// ----- Routers: the switch learns the port's own MAC, the one show interfaces prints; a router that floods
net=solve('Router-on-a-stick');
cmd(net,'PC1','ping '+n2ip(net.devs.PC2.ifs.FastEthernet0.ip));
const R1=net.devs.R1,sw=net.devs.SW1,r1mac=macTx(net,R1,R1.ifs['GigabitEthernet0/0']);
assert.match(cmd(net,'R1','show interfaces g0/0').text,new RegExp('address is '+r1mac.replace(/\\./g,'\\\\.')));
assert.equal(entry(sw,r1mac).ifn,Object.values(sw.ifs).find(i=>i.link&&i.link.dev==='R1').name);
assert.ok(cmd(net,'PC1','arp -a').text.includes(r1mac.replace(/\\./g,'').replace(/(..)(?=.)/g,'$1-')),'arp -a shows the same MAC');
// A ping from the router to a PC it has not spoken to: the router ARPs, every host in that VLAN sees the broadcast.
cmd(net,'R1','clear arp-cache');cmd(net,'SW1','clear mac address-table dynamic');
cmd(net,'R1','ping '+n2ip(net.devs.PC1.ifs.FastEthernet0.ip));
ev=TRACE.f.hops.l2[0];assert.equal(ev.arp,true);assert.equal(ev.flood,'R1');assert.ok(ev.edges.some(([a,b])=>a==='SW1'&&b==='PC1'));

// ----- HSRP: the virtual MAC is what the switch learns for the gateway, on the active router's port
net=solve('First-hop redundancy with HSRP');
cmd(net,'PC1','ping 203.0.113.10');
const vm1=(net.devs.SW1.mact||[]).find(e=>e.mac.startsWith('0000.0c07.ac'));
assert.ok(vm1,'virtual MAC learned');
assert.equal(vm1.ifn,'GigabitEthernet0/1','toward R1, the active router');
assert.match(cmd(net,'PC1','arp -a').text,/00-00-0c-07-ac-01/);

// ----- EtherChannel: one STP port, the bundle's cost, both members usable
net=solve('EtherChannel with LACP');
out=cmd(net,'SW1','show spanning-tree').text;
assert.match(out,/Po1 +(Root|Desg) FWD 3 /);assert.ok(!/Gi0\\/[12] /.test(out),'members are not listed separately');
cmd(net,'PC1','ping 192.168.10.12');assert.equal(entry(net.devs.SW2,macOf(net.devs.PC1)).vlan,10);
assert.equal(role(net,'SW1',10,'po1')!=='Altn'||role(net,'SW2',10,'po1')!=='Altn',true);

// ----- DHCP: the discover is a broadcast, the offer comes back from the server or relay
net=solve('DHCP server and relay');
cmd(net,'SW1','clear mac address-table dynamic');
cmd(net,'PC1','ipconfig /renew');
assert.ok(entry(net.devs.SW1,macOf(net.devs.PC1)),'client learned');
assert.ok(entry(net.devs.SW1,macTx(net,net.devs.R1,net.devs.R1.ifs['GigabitEthernet0/0'])),'server learned');

// ----- A switch SVI as the sender looks its own table up first
net=solve('Switch management access');
const ssw=Object.values(net.devs).find(d=>d.type==='switch'&&Object.values(d.ifs).some(i=>i.name.startsWith('Vlan')&&i.ip!==null));
const target=Object.values(net.devs).find(d=>d.type==='pc');
if(ssw&&target){cmd(net,ssw.name,'ping '+n2ip(target.ifs.FastEthernet0.ip));assert.ok(TRACE.f.hops.l2.length>=1);
  const e0=TRACE.f.hops.l2[0];assert.equal(e0.srcMac,macOf(ssw));assert.ok(e0.sw.some(x=>x.sw===ssw.name));
  // The switch's own address is a CPU entry, and show lists it in the SVI's VLAN.
  const svi=Object.values(ssw.ifs).find(i=>i.name.startsWith('Vlan')&&i.ip!==null);
  assert.ok(cmd(net,ssw.name,'show mac address-table').out.includes(String(+svi.name.slice(4)).padStart(4)+'    '+macOf(ssw)+'    STATIC      CPU'));}

// ----- Incidents still start broken and the walkthroughs still pass with the spanning tree enforced (labs.cjs covers all; spot check the per-VLAN root lab)
net=solve('Per-VLAN root bridges');
assert.deepEqual(Array.from(reach(net,net.devs.PC1,ip2n('192.168.10.13')).f.hops.path),['PC1','ASW1','DSW1','DSW2','PC3']);
assert.deepEqual(Array.from(reach(net,net.devs.PC2,ip2n('192.168.20.14')).f.hops.path),['PC2','ASW1','DSW2','DSW1','PC4']);

// ----- Neighbours are known before any traffic: CDP and BPDUs carry their port MACs
net=build('Spanning tree: root bridge and edge ports');
const bg=macBackground(net,net.devs.SW1);
// (SW1 Gi0/1 is the blocked Altn port, so SW2 is not learned through it: REVIEW-FIXES 21)
assert.deepEqual(bg.map(r=>shortIf(r.ifn)+'='+r.mac+'@'+r.vlan).sort(),['Gi0/2='+macTx(net,net.devs.SW3,net.devs.SW3.ifs['GigabitEthernet0/1'])+'@1']);
assert.ok(cmd(net,'SW1','show mac address-table dynamic').out.some(l=>/DYNAMIC +Gi0\\/2$/.test(l)),'a neighbour row shows as DYNAMIC on its (forwarding) port');
assert.equal(macLookup(net,net.devs.SW1,1,bg[0].mac).ifn,bg[0].ifn,'known to the forwarding decision');
// a router behind a trunk is known in the native VLAN; a frame to it is not flooded
net=solve('Router-on-a-stick');{const sw=net.devs.SW1,up=Object.values(sw.ifs).find(i=>i.link&&i.link.dev==='R1');assert.ok(macBackground(net,sw).some(r=>r.ifn===up.name&&r.vlan===up.native),'router port MAC in the native VLAN');}
// no CDP, no BPDUs: nothing known (a router with cdp off)
net=solve('Static routing');assert.deepEqual(macBackground(net,net.devs.R1),[]);

// ----- per-VLAN aging time
net=build('Per-VLAN root bridges');
ios(net,'ASW1',['configure terminal','mac address-table aging-time 1000 vlan 10','end']);
assert.deepEqual(cmd(net,'ASW1','show mac address-table aging-time').out,['Global Aging Time:  300','Vlan    Aging Time','----    ----------','  10    1000']);
assert.ok(cmd(net,'ASW1','show running-config').text.includes('mac address-table aging-time 1000 vlan 10'));
assert.equal(macAgeFor(net.devs.ASW1,10),1000);assert.equal(macAgeFor(net.devs.ASW1,20),300);
ios(net,'ASW1',['configure terminal','no mac address-table aging-time vlan 10','end']);assert.equal(macAgeFor(net.devs.ASW1,10),300);

// ----- no spanning-tree vlan: a triangle with STP off everywhere is a broadcast storm
net=build('Spanning tree: root bridge and edge ports');
for(const sw of ['SW1','SW2','SW3'])ios(net,sw,['configure terminal','no spanning-tree vlan 1','end']);
assert.equal(cmd(net,'SW1','show spanning-tree vlan 1').out[0],'Spanning tree instance(s) for vlan 1 does not exist.');
assert.ok(cmd(net,'SW1','show running-config').text.includes('no spanning-tree vlan 1'));
r=reach(net,net.devs.PC1,ip2n('192.168.1.12'));
assert.equal(r.ok,false);assert.match(r.f.reason,/^Broadcast storm in VLAN 1: /);assert.ok(r.f.hops.storm&&r.f.hops.storm.sws.length===3,JSON.stringify(r.f.hops.storm));
// a live ping logs the MAC flap on every switch in the loop, on their consoles
out=cmd(net,'PC1','ping 192.168.1.12');assert.match(out.text,/Request timed out/);
for(const sw of ['SW1','SW2','SW3']){assert.ok((net.devs[sw].logBuf||[]).some(l=>/%SW_MATM-4-MACFLAP_NOTIF: Host .* in vlan 1 is flapping between port Gi0\\/[12] and port Gi0\\/[12]/.test(l)),sw+' logs the flap');assert.ok((net.devs[sw].conq||[]).length,sw+' console gets it');}
// one switch with STP off is a transparent bridge: the other two still block one port and the network works
net=build('Spanning tree: root bridge and edge ports');ios(net,'SW3',['configure terminal','no spanning-tree vlan 1','end']);
r=reach(net,net.devs.PC1,ip2n('192.168.1.12'));assert.equal(r.ok,true,'no storm with one transparent switch');
{const c=stpCalc(net,1);assert.ok(!c.info.SW3,'SW3 is not in the tree');const roles=[...Object.values(c.info.SW1.ports),...Object.values(c.info.SW2.ports)].map(x=>x.role);assert.ok(roles.includes('Altn'),'one of SW1/SW2 blocks the segment through SW3: '+roles.join(','));}
// two switches off: the remaining one sees its own BPDUs come back and blocks one of its two ports
net=build('Spanning tree: root bridge and edge ports');for(const sw of ['SW2','SW3'])ios(net,sw,['configure terminal','no spanning-tree vlan 1','end']);
r=reach(net,net.devs.PC1,ip2n('192.168.1.12'));assert.equal(r.ok,true,'no storm with one STP switch left');
assert.ok(Object.values(stpCalc(net,1).info.SW1.ports).some(x=>x.role==='Altn'));
// turning it back on repairs the storm
net=build('Spanning tree: root bridge and edge ports');for(const sw of ['SW1','SW2','SW3'])ios(net,sw,['configure terminal','no spanning-tree vlan 1','end']);
for(const sw of ['SW1','SW2','SW3'])ios(net,sw,['configure terminal','spanning-tree vlan 1','end']);
assert.equal(reach(net,net.devs.PC1,ip2n('192.168.1.12')).ok,true);assert.ok(!cmd(net,'SW1','show running-config').text.includes('no spanning-tree'));
// an EtherChannel's two cables are one link, never a loop
net=solve('EtherChannel with LACP');assert.equal(reach(net,net.devs.PC1,ip2n('192.168.10.12')).ok,true);assert.equal(l2peers(net,net.devs.PC1,nic(net.devs.PC1)).storm,undefined);
// the storm exam fault and the storm incident
{const lab=LABS.find(l=>l.title==='Spanning tree: root bridge and edge ports'),g=EXAM_FAULTS.find(x=>x.id==='stp'),f=g.gen(solvedNet(lab),seedRng('s'));assert.ok(f&&Object.keys(f.cmds).length===3,'all three switches');
  const n=solvedNet(lab);applyCmds(n,f.cmds);assert.ok(failingChecks(lab,n)>0);}
assert.ok(LABS.some(l=>l.title.startsWith('Incident 36')),'incident 36 exists');
// REVIEW-FIXES 22: a topology change flushes the dynamic entries in that VLAN, and a lookup pointing back out of the
// ingress port counts as unknown, so the trace never says a switch sent a frame out of the port it came in on.
{const n=build('Spanning tree: root bridge and edge ports');cmd(n,'PC1','ping 192.168.1.12');cmd(n,'PC2','ping 192.168.1.11');
  assert.ok(tab(n.devs.SW3).length>0&&tab(n.devs.SW2).length>0,'tables learned');
  ios(n,'SW1',['configure terminal','interface g0/2','shutdown','end']);
  assert.deepEqual(['SW1','SW2','SW3'].map(x=>tab(n.devs[x]).filter(e=>!e.includes(' Fa0')).length),[0,0,0],'switch-to-switch entries flushed by the topology change');
  cmd(n,'PC2','ping 192.168.1.11');const ev=TRACE.f.hops.l2[0],seg=ev.seg;
  for(const x of ev.sw){if(!x.out)continue;const k=seg.indexOf(x.sw),prev=seg[k-1],inp=Object.values(n.devs[x.sw].ifs).find(i=>i.link&&i.link.dev===prev);
    assert.ok(!inp||inp.name!==x.out,x.sw+' never forwards out of the port the frame came in on ('+x.out+')');}
  assert.equal(TRACE.ok,true);
  // a host port going down is not a topology change: the other entries stay
  const n2=build('Spanning tree: root bridge and edge ports');cmd(n2,'PC1','ping 192.168.1.12');const before=tab(n2.devs.SW3);
  ios(n2,'SW1',['configure terminal','interface f0/1','shutdown','end']);assert.deepEqual(tab(n2.devs.SW3),before);}
// REVIEW-FIXES 23: a forced speed changes the spanning-tree cost (both ends) and the bandwidth (show interfaces, OSPF cost).
{const n=build('Spanning tree: root bridge and edge ports');assert.equal(stpCalc(n,1).info.SW1.ports['GigabitEthernet0/2'].cost,4);
  ios(n,'SW1',['configure terminal','interface g0/2','speed 10','end']);
  assert.equal(stpCalc(n,1).info.SW1.ports['GigabitEthernet0/2'].cost,100,'10 Mb/s costs 100');assert.equal(stpCalc(n,1).info.SW3.ports['GigabitEthernet0/1'].cost,100,'the auto end senses 10 Mb/s too');
  assert.match(cmd(n,'SW1','show interfaces g0/2').text,/BW 10000 Kbit/);
  ios(n,'SW1',['configure terminal','interface g0/2','speed 100','end']);assert.equal(stpCalc(n,1).info.SW1.ports['GigabitEthernet0/2'].cost,19);
  const r=solve('Static routing'),R1=r.devs.R1,i=R1.ifs['GigabitEthernet0/1'];ios(r,'R1',['configure terminal','interface g0/1','speed 10','end']);
  assert.equal(ospfCost(R1,i),10,'OSPF cost follows the bandwidth of a forced speed');assert.match(cmd(r,'R1','show interfaces g0/1').text,/BW 10000 Kbit/);}
// REVIEW-FIXES polish (switching): an unanswered ARP still floods and teaches the switches the sender; a storm names only
// the switches on the loop, in cabled order; status columns right-aligned; gigabit media type.
{const n=solve('VLANs and access ports'),SWx=n.devs.SW1;delete SWx.mact;cmd(n,'PC1','ping 192.168.10.99');
  const ev=(TRACE.f.hops.l2||[]).find(e=>e.lost);assert.ok(ev&&ev.arp&&ev.flood==='PC1','the ARP broadcast is recorded');assert.deepEqual(tab(SWx),[macOf(n.devs.PC1)+' 10 Fa0/1'],'SW1 learned the sender');
  const st=cmd(n,'SW1','show interfaces status').text;assert.ok(st.includes('a-full  a-100 10/100BaseTX'),st);
  assert.ok(st.includes('  auto   auto 10/100BaseTX'),'right-aligned like IOS: '+st);
  assert.ok(cmd(n,'SW1','show interfaces g0/1').text.includes('media type is 10/100/1000BaseTX'));assert.ok(cmd(n,'SW1','show interfaces f0/5').text.includes('media type is 10/100BaseTX'));}
{const n=build('Spanning tree: root bridge and edge ports');for(const sw of ['SW1','SW2','SW3'])ios(n,sw,['configure terminal','no spanning-tree vlan 1','end']);
  const T=mkSwitch('SW4');n.devs.SW4=T;link(n,'SW4','g0/1','SW1','f0/3');const p9=mkPC('PC9','192.168.1.50',24);n.devs.PC9=p9;link(n,'PC9','f0','SW4','f0/1');
  const s=reach(n,p9,ip2n('192.168.1.12')).f.hops.storm;assert.deepEqual([...s.sws].sort(),['SW1','SW2','SW3'],'SW4 is not on the loop');
  const cabled=(a,b)=>n.links.some(l=>(l.a===a&&l.b===b)||(l.a===b&&l.b===a));const loop=s.sws.concat(s.sws[0]);for(let k=1;k<loop.length;k++)assert.ok(cabled(loop[k-1],loop[k]),loop.join('>'));}
// REVIEW-FIXES 1: spanning tree off on a dead-end switch (a chain of STP-off switches leading nowhere) used to crash
// stpCalc, which broke pings, show spanning-tree and the map. The STP switch now sees an edge port there.
{const n=solve('802.1Q trunking');ios(n,'SW2',['configure terminal','no spanning-tree vlan 10','end']);
  const r=stpCalc(n,10);assert.equal(r.root,n.devs.SW1);assert.equal(r.info.SW1.ports[parseIf('g0/1')].role,'Desg');
  assert.ok(cmd(n,'SW1','show spanning-tree vlan 10').text.includes('This bridge is the root'));
  assert.equal(reach(n,n.devs.PC1,ip2n('192.168.10.13')).ok,true);}
// a tail switch hanging off a triangle whose switches all have STP off
{const n=build('Spanning tree: root bridge and edge ports');const T=mkSwitch('SW4');n.devs.SW4=T;link(n,'SW3','f0/2','SW4','g0/1');
  for(const sw of ['SW1','SW2','SW3'])ios(n,sw,['configure terminal','no spanning-tree vlan 1','end']);
  const r=stpCalc(n,1);assert.equal(r.root,T);assert.equal(r.info.SW4.ports[parseIf('g0/1')].role,'Desg');}
}
`,context);
console.log('PASS switching: spanning-tree forwarding, island roots, MAC learning from ARP and unicast, flooding of unknown addresses, clear/static/aging, show mac address-table layouts, per-port router MACs, HSRP virtual MAC, EtherChannel as one STP port, DHCP learning, SVI as sender, neighbours known from CDP/BPDUs, per-VLAN aging, no spanning-tree vlan with a real broadcast storm (MAC flap logs, transparent switch, self-loop block, repair), EtherChannel never a loop, the storm exam fault and incident.');
