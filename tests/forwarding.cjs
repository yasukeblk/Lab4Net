const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const context=vm.createContext({assert,console});
vm.runInContext(engine+`
function solve(lab){const net=lab.build();for(const [name,commands] of Object.entries(lab.solution)){const d=net.devs[name],s={mode:d.type==='pc'?'pc':'user'};commands.forEach(c=>execLine(net,d,s,c));}return net;}
// Both directions matter: static-routing baseline has no outbound route.
const staticLab=LABS.find(l=>l.title==='Static routing');
let net=staticLab.build();
let result=reach(net,net.devs.PC1,ip2n('192.168.3.10'));
assert.equal(result.ok,false);assert.match(result.f.reason,/No usable route/);
net=solve(staticLab);net.devs.R3.statics=[];
LIVE=true;reach(net,net.devs.PC1,ip2n('192.168.3.10'));LIVE=false;
assert.equal(TRACE.f.ok,true);assert.equal(TRACE.r.ok,false);assert.match(TRACE.r.reason,/No usable route/);
// ACL failure includes its name, interface and direction.
net=solve(LABS.find(l=>l.title==='Extended named ACL'));
result=reach(net,net.devs.PC1,ip2n('192.168.3.10'));
assert.equal(result.ok,false);assert.match(result.f.reason,/WEB-ONLY inbound on Gi0\\/0/);
assert.equal(reach(net,net.devs.PC1,ip2n('192.168.3.10'),'tcp',80).ok,true);
net=solve(LABS.find(l=>l.title==='Standard ACL'));
result=reach(net,net.devs.PC2,ip2n('192.168.3.10'));
assert.match(result.f.reason,/10 outbound on Gi0\\/1/);
// A functioning route with a closed destination port is a distinct failure.
net=solve(LABS.find(l=>l.title.startsWith('Static NAT:')));
result=reach(net,net.devs.CLIENT,ip2n('203.0.113.10'),'tcp',22);
assert.equal(result.f.ok,true);assert.equal(result.refused,true);
assert.equal(reach(net,net.devs.CLIENT,ip2n('203.0.113.10'),'tcp',80).ok,true);
assert.equal(reach(net,net.devs.CLIENT,ip2n('192.168.1.10')).ok,false);
// The forwarding path must follow VLAN eligibility, not the shortest physical path.
net=mkNet([mkSwitch('A'),mkSwitch('B'),mkSwitch('C'),mkPC('X','192.168.10.1',24),mkPC('Y','192.168.10.2',24)]);
link(net,'X','f0','A','f0/1');link(net,'Y','f0','B','f0/1');link(net,'A','g0/1','B','g0/1');link(net,'A','g0/2','C','g0/1');link(net,'C','g0/2','B','g0/2');
for(const name of ['A','B','C']){const d=net.devs[name];d.vlans[10]={name:'TEST'};for(const i of Object.values(d.ifs)){if(i.name.startsWith('Gigabit')){i.mode='trunk';i.allowed=[10];}}}
preAccess(net,'A','f0/1',10);preAccess(net,'B','f0/1',10);IF(net,'A','g0/1').allowed=[20];IF(net,'B','g0/1').allowed=[20];
result=reach(net,net.devs.X,ip2n('192.168.10.2'));
assert.equal(result.ok,true);assert.deepEqual(result.f.hops.path,['X','A','C','B','Y']);
IF(net,'A','g0/2').shutdown=true;
result=reach(net,net.devs.X,ip2n('192.168.10.2'));
assert.equal(result.ok,false);assert.match(result.f.reason,/Next hop.*unreachable/);
// Run IOS lines on a device from privileged mode.
function ios(net,dev,lines){const s={mode:'priv'};lines.forEach(c=>execLine(net,net.devs[dev],s,c));}
// Floating static: the higher-distance route installs only when the primary route's next hop disappears.
net=solve(LABS.find(l=>l.title==='Floating static route'));
assert.equal(nextHop(net,net.devs.R1,ip2n('192.168.2.10')).nh,ip2n('10.0.12.2'));
assert.equal(routes(net,net.devs.R1).filter(r=>r.net===ip2n('192.168.2.0')).length,1);
IF(net,'R1','g0/1').shutdown=true;
assert.equal(nextHop(net,net.devs.R1,ip2n('192.168.2.10')).nh,ip2n('10.0.21.2'));
assert.equal(nextHop(net,net.devs.R2,ip2n('192.168.1.10')).nh,ip2n('10.0.21.1'));
assert.equal(reach(net,net.devs.PC1,ip2n('192.168.2.10')).ok,true);
IF(net,'R1','g0/1').shutdown=false;
assert.equal(nextHop(net,net.devs.R1,ip2n('192.168.2.10')).nh,ip2n('10.0.12.2'));
// Administrative distance decides between sources for the same prefix: OSPF (110) beats a static at 120 and loses to one at 100.
net=solve(LABS.find(l=>l.title==='Single-area OSPF'));
ios(net,'R1',['configure terminal','ip route 192.168.3.0 255.255.255.0 10.0.12.2 120','end']);
assert.equal(nextHop(net,net.devs.R1,ip2n('192.168.3.10')).route.code,'O');
ios(net,'R1',['configure terminal','ip route 192.168.3.0 255.255.255.0 10.0.12.2 100','end']);
assert.equal(nextHop(net,net.devs.R1,ip2n('192.168.3.10')).route.code,'S');
// Longest prefix match comes before administrative distance: an OSPF /32 beats the static /24 for its one address.
ios(net,'R3',['configure terminal','interface loopback 0','ip address 192.168.3.77 255.255.255.255','router ospf 1','network 192.168.3.77 0.0.0.0 area 0','end']);
assert.equal(nextHop(net,net.devs.R1,ip2n('192.168.3.77')).route.code,'O');
assert.equal(nextHop(net,net.devs.R1,ip2n('192.168.3.77')).route.len,32);
assert.equal(nextHop(net,net.devs.R1,ip2n('192.168.3.10')).route.code,'S');
// An exit-interface-only static route on Ethernet works through the neighbor's proxy ARP, and fails without it.
net=solve(LABS.find(l=>l.title==='Static routing'));
ios(net,'R1',['configure terminal','no ip route 192.168.3.0 255.255.255.0 10.0.12.2','ip route 192.168.3.0 255.255.255.0 g0/1','end']);
assert.equal(nextHop(net,net.devs.R1,ip2n('192.168.3.10')).proxy,true);
result=reach(net,net.devs.PC1,ip2n('192.168.3.10'));
assert.equal(result.ok,true);assert.equal(result.f.hops[1],ip2n('10.0.12.2'));
ios(net,'R2',['configure terminal','interface g0/0','no ip proxy-arp','end']);
result=reach(net,net.devs.PC1,ip2n('192.168.3.10'));
assert.equal(result.ok,false);assert.match(result.f.reason,/Next hop.*unreachable/);
// Dynamic NAT without overload: one pool address per host; the third host is dropped with a reason. Overload shares one address.
net=LABS.find(l=>l.title==='Dynamic NAT with a pool').build();
ios(net,'R1',['configure terminal','access-list 1 permit 192.168.1.0 0.0.0.255','interface g0/0','ip nat inside','interface g0/1','ip nat outside','exit','ip nat pool PUBLIC 203.0.113.33 203.0.113.34 netmask 255.255.255.248','ip nat inside source list 1 pool PUBLIC','end']);
LIVE=true;
assert.equal(reach(net,net.devs.PC1,ip2n('198.51.100.10')).ok,true);
assert.equal(reach(net,net.devs.PC2,ip2n('198.51.100.10')).ok,true);
result=reach(net,net.devs.PC3,ip2n('198.51.100.10'));
LIVE=false;
assert.equal(result.ok,false);assert.match(result.f.reason,/NAT pool PUBLIC has no free address/);
assert.deepEqual(net.devs.R1.nat.dyn.map(m=>n2ip(m.ig)),['203.0.113.33','203.0.113.34']);
assert.equal(net.devs.R1.nat.misses,1);
// The ISP can reach a host on its borrowed address while the binding lasts (one-to-one, not PAT).
assert.equal(reach(net,net.devs.ISP,ip2n('203.0.113.33')).ok,true);
assert.equal(execLine(net,net.devs.R1,{mode:'config'},'no ip nat inside source list 1 pool PUBLIC')[0],'%Dynamic mapping in use, cannot remove');
ios(net,'R1',['clear ip nat translation *','configure terminal','no ip nat inside source list 1 pool PUBLIC','ip nat inside source list 1 pool PUBLIC overload','end']);
LIVE=true;for(const p of ['PC1','PC2','PC3'])assert.equal(reach(net,net.devs[p],ip2n('198.51.100.10')).ok,true);LIVE=false;
assert.deepEqual([...new Set(net.devs.R1.nat.table.map(x=>n2ip(x.ig)))],['203.0.113.33']);
assert.deepEqual(net.devs.R1.nat.table.map(x=>x.gport),[1,1024,1025]);
// Voice VLAN: the phone tags with the VLAN its switch port advertises; the PC behind it stays untagged in the data VLAN.
net=LABS.find(l=>l.title==='Voice VLAN').build();
assert.equal(phoneVlan(net,net.devs.PHONE1),null);
ios(net,'SW1',['configure terminal','vlan 150','name VOICE','interface f0/1','switchport voice vlan 150','end']);
assert.equal(phoneVlan(net,net.devs.PHONE1),150);
assert.equal(l2peers(net,net.devs.PHONE1,nic(net.devs.PHONE1)).find(p=>p.dev.name==='R1').ifc.name,'GigabitEthernet0/0.150');
assert.equal(l2peers(net,net.devs.PC1,nic(net.devs.PC1)).find(p=>p.dev.name==='R1').ifc.name,'GigabitEthernet0/0.10');
assert.deepEqual(Array.from(l2peers(net,net.devs.PC1,nic(net.devs.PC1)).find(p=>p.dev.name==='R1').path),['PC1','PHONE1','SW1','R1']);
ios(net,'SW1',['configure terminal','interface f0/1','no cdp enable','end']);
assert.equal(phoneVlan(net,net.devs.PHONE1),null);
// OSPF DR election (RFC 2328): no pre-emption by a higher priority, priority 0 gives the role up, and the BDR is promoted.
net=LABS.find(l=>l.title==='OSPF on a shared segment').build();
const role=r=>ospfRole(net,net.devs[r],IF(net,r,'g0/0'));
assert.deepEqual(['R1','R2','R3','R4'].map(role),['DR','BDR','DROTHER','DROTHER']);
ios(net,'R4',['configure terminal','interface g0/0','ip ospf priority 255','end']);
assert.deepEqual(['R1','R2','R3','R4'].map(role),['DR','BDR','DROTHER','DROTHER']);
ios(net,'R1',['configure terminal','interface g0/0','ip ospf priority 0','end']);
assert.deepEqual(['R1','R2','R3','R4'].map(role),['DROTHER','DR','DROTHER','BDR']);
// Clearing the DR's process: the BDR (R4) is promoted, R3 becomes BDR, and R2 rejoins as DROTHER.
ios(net,'R2',['clear ip ospf process']);
assert.deepEqual(['R1','R2','R3','R4'].map(role),['DROTHER','DROTHER','BDR','DR']);
// IPv6 text form: parsing, the RFC 5952 compressed form IOS prints, and EUI-64 interface IDs.
assert.equal(fmt6(parse6('2001:0DB8:0000:0000:0008:0800:200C:417A')),'2001:DB8::8:800:200C:417A');
assert.equal(fmt6(parse6('2001:db8:0:0:1:0:0:1')),'2001:DB8::1:0:0:1');
assert.equal(fmt6(parse6('fe80::1')),'FE80::1');
assert.equal(fmt6(parse6('::')),'::');
assert.equal(fmt6(parse6('2001:db8::1'),true),'2001:db8::1');
assert.equal(parse6('2001:db8::1::2'),null);
assert.equal(parse6('2001:db8:1:2:3:4:5:6:7'),null);
assert.equal(parse6('2001:db8::g'),null);
assert.equal(fmt6(eui64(parse6('2001:db8:acad:1::'),'00e0.b012.3410')),'2001:DB8:ACAD:1:2E0:B0FF:FE12:3410');
// IPv6 forwarding: a router that has not enabled IPv6 unicast routing does not forward IPv6.
net=mkNet([mkRouter('R1'),mkRouter('R2'),mkPC('PC1',null,24),mkPC('PC2',null,24)]);
link(net,'PC1','f0','R1','g0/0');link(net,'R1','g0/1','R2','g0/1');link(net,'R2','g0/0','PC2','f0');
ios(net,'R1',['configure terminal','ipv6 unicast-routing','interface g0/0','ipv6 address 2001:db8:1::1/64','ipv6 address fe80::1 link-local','no shutdown','interface g0/1','ipv6 address 2001:db8:12::1/64','no shutdown','exit','ipv6 route 2001:db8:2::/64 2001:db8:12::2','end']);
ios(net,'R2',['configure terminal','interface g0/0','ipv6 address 2001:db8:2::1/64','ipv6 address fe80::2 link-local','no shutdown','interface g0/1','ipv6 address 2001:db8:12::2/64','no shutdown','end']);
execLine(net,net.devs.PC1,{mode:'pc'},'ipv6config /autoconfig');
execLine(net,net.devs.PC2,{mode:'pc'},'ipv6config 2001:db8:2::10/64 fe80::2');
assert.equal(fmt6(nic(net.devs.PC1).v6[0].a),fmt6(eui64(parse6('2001:db8:1::'),macOf(net.devs.PC1))));
assert.equal(net.devs.PC1.gw6,parse6('fe80::1'));
result=reach6(net,net.devs.PC1,parse6('2001:db8:2::10'));
assert.equal(result.ok,false);assert.match(result.f.reason,/IPv6 unicast routing is off on R2/);
ios(net,'R2',['configure terminal','ipv6 unicast-routing','end']);
result=reach6(net,net.devs.PC1,parse6('2001:db8:2::10'));
assert.equal(result.ok,false);assert.match(result.r.reason,/No IPv6 route/);
// A link-local next hop is only meaningful with an exit interface; IOS insists on one.
assert.match(execLine(net,net.devs.R2,{mode:'config'},'ipv6 route ::/0 fe80::1').join(' '),/Interface has to be specified/);
ios(net,'R2',['configure terminal','ipv6 route ::/0 g0/1 fe80::1','end']);
// The route installs, but nobody answers neighbor discovery for FE80::1 on that link until R1 uses it.
result=reach6(net,net.devs.PC1,parse6('2001:db8:2::10'));
assert.equal(result.ok,false);assert.match(result.r.reason,/Next hop FE80::1 unreachable/);
ios(net,'R1',['configure terminal','interface g0/1','ipv6 address fe80::1 link-local','end']);
result=reach6(net,net.devs.PC1,parse6('2001:db8:2::10'));
assert.equal(result.ok,true);assert.deepEqual(Array.from(result.f.hops.path),['PC1','R1','R2','PC2']);
// Longest match and a floating IPv6 default route.
ios(net,'R1',['configure terminal','ipv6 route ::/0 2001:db8:12::2 50','end']);
assert.equal(nextHop6(net,net.devs.R1,parse6('2001:db8:2::10')).route.len,64);
assert.equal(nextHop6(net,net.devs.R1,parse6('2001:db8:99::1')).route.len,0);
assert.equal(nextHop6(net,net.devs.R1,parse6('2001:db8:99::1')).route.ad,50);
// Layer 3 switch: routes between its VLAN interfaces once ip routing is on, and only then.
net=LABS.find(l=>l.title==='Inter-VLAN routing on a Layer 3 switch').build();
ios(net,'DSW1',['configure terminal','interface vlan 10','ip address 192.168.10.1 255.255.255.0','interface vlan 20','ip address 192.168.20.1 255.255.255.0','end']);
result=reach(net,net.devs.PC1,ip2n('192.168.20.12'));
assert.equal(result.ok,false);assert.match(result.f.reason,/not a router/);
ios(net,'DSW1',['configure terminal','ip routing','interface g0/2','no switchport','ip address 10.0.0.1 255.255.255.252','exit','ip route 0.0.0.0 0.0.0.0 10.0.0.2','end']);
assert.deepEqual(Array.from(reach(net,net.devs.PC1,ip2n('192.168.20.12')).f.hops.path),['PC1','DSW1','PC2']);
assert.deepEqual(Array.from(reach(net,net.devs.PC3,ip2n('203.0.113.1')).f.hops.path),['PC3','ASW1','DSW1','R1']);
// A routed port is not in any VLAN: the access switch cannot reach it through VLAN 1.
assert.equal(IF(net,'DSW1','g0/2').routed,true);
// DHCP snooping: the nearer rogue wins until snooping drops its offers; option 82 then silences the IOS server until trusted.
net=LABS.find(l=>l.title==='DHCP snooping').build();
assert.equal(dhcpCandidates(net,net.devs.PC1)[0].S.name,'ROGUE');
ios(net,'SW1',['configure terminal','ip dhcp snooping','ip dhcp snooping vlan 10','interface g0/1','ip dhcp snooping trust','end']);
assert.equal(dhcpCandidates(net,net.devs.PC1).length,0);
ios(net,'R1',['configure terminal','ip dhcp relay information trust-all','end']);
assert.deepEqual(dhcpCandidates(net,net.devs.PC1).map(c=>c.S.name),['R1']);
// Dynamic ARP Inspection: untrusted senders need a binding; trusted ports are not checked.
net=LABS.find(l=>l.title==='Dynamic ARP Inspection').build();
ios(net,'SW1',['configure terminal','ip arp inspection vlan 10','end']);
result=reach(net,net.devs.PC1,ip2n('192.168.10.1'));
// PC1's own ARP passes (it has a binding), but R1's answer arrives on the untrusted uplink, so the first hop fails.
assert.equal(result.ok,false);assert.match(result.f.reason,/Dynamic ARP Inspection on SW1 Gi0\\/1/);
ios(net,'SW1',['configure terminal','interface g0/1','ip arp inspection trust','end']);
assert.equal(reach(net,net.devs.PC1,ip2n('192.168.10.1')).ok,true);
assert.equal(reach(net,net.devs.PRINTER,ip2n('192.168.10.1')).ok,false);
ios(net,'SW1',['configure terminal','ip source binding '+macOf(net.devs.PRINTER)+' vlan 10 192.168.10.5 interface f0/3','end']);
assert.equal(reach(net,net.devs.PRINTER,ip2n('192.168.10.1')).ok,true);
assert.match(reach(net,net.devs.ATTACKER,ip2n('192.168.10.1')).f.reason,/Dynamic ARP Inspection on SW1 Fa0\\/6/);
// HSRP: the active router owns the virtual IP; when its LAN link fails the standby router takes it over.
net=LABS.find(l=>l.title==='First-hop redundancy with HSRP').build();
ios(net,'R1',['configure terminal','interface g0/0','standby 1 ip 192.168.1.1','standby 1 priority 110','end']);
ios(net,'R2',['configure terminal','interface g0/0','standby 1 ip 192.168.1.1','end']);
assert.deepEqual(Array.from(reach(net,net.devs.PC1,ip2n('203.0.113.10')).f.hops.path).slice(0,3),['PC1','SW1','R1']);
ios(net,'R1',['configure terminal','interface g0/0','shutdown','end']);
assert.deepEqual(Array.from(reach(net,net.devs.PC1,ip2n('203.0.113.10')).f.hops.path).slice(0,3),['PC1','SW1','R2']);
// Without preempt on R1, R2 keeps the active role when R1 returns.
ios(net,'R1',['configure terminal','interface g0/0','no shutdown','end']);
assert.equal(ownsIp(net,net.devs.R2,ip2n('192.168.1.1')),true);assert.equal(ownsIp(net,net.devs.R1,ip2n('192.168.1.1')),false);
ios(net,'R1',['configure terminal','interface g0/0','standby 1 preempt','end']);
assert.equal(ownsIp(net,net.devs.R1,ip2n('192.168.1.1')),true);
// BPDU Guard on a port facing another switch err-disables it (both ends down); shut/no shut alone trips it again,
// removing the cause first recovers it.
net=LABS.find(l=>l.title==='Spanning tree: root bridge and edge ports').build();
ios(net,'SW3',['configure terminal','interface g0/1','spanning-tree bpduguard enable','end']);
assert.equal(IF(net,'SW3','g0/1').errdis,'bpduguard');assert.equal(ifUp(net,net.devs.SW1,IF(net,'SW1','g0/2')),false);
ios(net,'SW3',['configure terminal','interface g0/1','shutdown','no shutdown','end']);
assert.equal(IF(net,'SW3','g0/1').errdis,'bpduguard');
ios(net,'SW3',['configure terminal','interface g0/1','no spanning-tree bpduguard enable','shutdown','no shutdown','end']);
assert.equal(IF(net,'SW3','g0/1').errdis,undefined);assert.equal(ifUp(net,net.devs.SW3,IF(net,'SW3','g0/1')),true);
// EtherChannel guard: mode on against LACP err-disables the "on" side's members and cuts the link.
net=solve(LABS.find(l=>l.title==='EtherChannel with LACP'));
assert.equal(reach(net,net.devs.PC1,ip2n('192.168.10.12')).ok,true);
ios(net,'SW2',['configure terminal','interface range g0/1 - 2','no channel-group 1','channel-group 1 mode on','end']);
assert.deepEqual(['g0/1','g0/2'].map(p=>IF(net,'SW2',p).errdis),['channel-misconfig','channel-misconfig']);
assert.equal(reach(net,net.devs.PC1,ip2n('192.168.10.12')).ok,false);
// Port security: a second address beyond the maximum err-disables a shutdown-mode port; restrict mode keeps the port
// up and drops only the offending host.
net=solve(LABS.find(l=>l.title==='Port security'));
ios(net,'SW1',['configure terminal','interface f0/1','shutdown','no switchport port-security mac-address sticky '+macOf(net.devs.PC1),'switchport port-security mac-address sticky 0011.2233.4455','no shutdown','end']);
assert.equal(IF(net,'SW1','f0/1').errdis,'psecure-violation');assert.equal(IF(net,'SW1','f0/1').ps.viol,1);
assert.equal(reach(net,net.devs.PC1,ip2n('192.168.1.12')).ok,false);
// Clearing the stale address and bouncing the port recovers PC1.
ios(net,'SW1',['configure terminal','interface f0/1','shutdown','no switchport port-security mac-address sticky 0011.2233.4455','no shutdown','end']);
assert.equal(IF(net,'SW1','f0/1').errdis,undefined);assert.equal(reach(net,net.devs.PC1,ip2n('192.168.1.12')).ok,true);
ios(net,'SW1',['configure terminal','interface f0/2','shutdown','switchport port-security maximum 1','no switchport port-security mac-address sticky '+macOf(net.devs.PC2),'switchport port-security mac-address sticky 0011.2233.6677','no shutdown','end']);
assert.equal(IF(net,'SW1','f0/2').errdis,undefined);assert.equal(ifUp(net,net.devs.SW1,IF(net,'SW1','f0/2')),true);
result=reach(net,net.devs.PC2,ip2n('192.168.1.11'));
assert.equal(result.ok,false);assert.match(result.f.reason,/Port security \\(restrict\\)/);
console.log('PASS forwarding: outbound route, return route, inbound/outbound ACL, static NAT, closed port, actual VLAN path, link failure, floating static, administrative distance, longest match, proxy ARP, NAT pool exhaustion and overload, voice VLAN tagging, the OSPF DR election, IPv6 addressing, SLAAC and forwarding, Layer 3 switching, DHCP snooping, Dynamic ARP Inspection, HSRP failover, err-disable (BPDU Guard, EtherChannel guard, port security) and port security restrict.');
`,context);
