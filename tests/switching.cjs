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
assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 22');
out=cmd(net,'SW1','show mac address-table dynamic');
assert.equal(out.out.length,5+2+1);assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 2');
assert.ok(!out.text.includes('CPU'));
out=cmd(net,'SW1','show mac address-table address '+pc2);assert.ok(out.out.includes('   1    '+pc2+'    DYNAMIC     Gi0/2'));assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 1');
out=cmd(net,'SW1','show mac address-table interface fa0/1');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 1');assert.ok(out.text.includes(pc1));
out=cmd(net,'SW1','show mac address-table interface fastethernet 0/1');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 1');
out=cmd(net,'SW1','show mac address-table vlan 1');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 2');
out=cmd(net,'SW1','show mac address-table dynamic vlan 1');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 2');
out=cmd(net,'SW1','show mac address-table vlan 99');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 0');
out=cmd(net,'SW1','show mac-address-table dynamic');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 2','old spelling works');
out=cmd(net,'SW1','sh mac add dyn');assert.equal(out.out.at(-1),'Total Mac Addresses for this criterion: 2','abbreviations work');
out=cmd(net,'SW1','show mac address-table aging-time');assert.deepEqual(out.out,['Global Aging Time:  300','Vlan    Aging Time','----    ----------']);
out=cmd(net,'SW1','show mac address-table count');assert.ok(out.text.includes('Mac Entries for Vlan 1:')&&out.text.includes('Dynamic Address Count  : 2'),out.text);
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
assert.equal(cmd(net,'SW1','show mac address-table dynamic').out.at(-1),'Total Mac Addresses for this criterion: 0');
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
}
`,context);
console.log('PASS switching: spanning-tree forwarding, island roots, MAC learning from ARP and unicast, flooding of unknown addresses, clear/static/aging, show mac address-table layouts, per-port router MACs, HSRP virtual MAC, EtherChannel as one STP port, DHCP learning, SVI as sender.');
