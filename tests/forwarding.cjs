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
console.log('PASS forwarding: outbound route, return route, inbound/outbound ACL, static NAT, closed port, actual VLAN path, link failure, floating static, administrative distance, longest match and proxy ARP.');
`,context);
