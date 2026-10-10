// Multi-area OSPF: intra-area (O) and inter-area (O IA) routes, area border routers, the backbone rule, and
// the preference of intra-area over inter-area. Single-area behaviour is unchanged (labs.cjs covers every lab).
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const context=vm.createContext({assert,console});
vm.runInContext(engine+`
function solve(title){const lab=LABS.find(l=>l.title===title),net=lab.build();for(const [name,commands] of Object.entries(lab.solution)){const d=net.devs[name],s={mode:d.type==='pc'?'pc':'user'};commands.forEach(c=>execLine(net,d,s,c));}return net;}
const cmd=(net,dev,line)=>{const d=net.devs[dev],s={mode:'priv'};return execLine(net,d,s,line).join('\\n');};
const code=(net,dev,ip,len)=>{const r=routes(net,net.devs[dev]).find(x=>x.net===ip2n(ip)&&x.len===len);return r?r.code+' '+r.metric:null;};
const ios=(net,dev,lines)=>{const d=net.devs[dev],s={mode:'priv'};for(const l of lines)execLine(net,d,s,l);};
{
let net=solve('Multi-area OSPF');
// ABRs and areas
assert.deepEqual(['R1','R2','R3','R4'].map(r=>ospfAreasOf(net,net.devs[r]).sort().join('/')),['1','0/1','0/2','2']);
assert.deepEqual(['R1','R2','R3','R4'].map(r=>ospfIsAbr(net,net.devs[r])),[false,true,true,false]);
// codes and metrics: R1 sees everything beyond R2 as inter-area; R2 sees area 1 intra and area 2 inter
assert.equal(code(net,'R1','192.168.4.0',24),'O IA 4');assert.equal(code(net,'R1','10.0.23.0',30),'O IA 2');assert.equal(code(net,'R1','10.0.34.0',30),'O IA 3');
assert.equal(code(net,'R2','192.168.1.0',24),'O 2');assert.equal(code(net,'R2','192.168.4.0',24),'O IA 3');assert.equal(code(net,'R2','10.0.34.0',30),'O IA 2');
assert.equal(code(net,'R3','192.168.1.0',24),'O IA 3');assert.equal(code(net,'R4','192.168.1.0',24),'O IA 4');
assert.equal(reach(net,net.devs.PC1,ip2n('192.168.4.10')).ok,true);
// output: O IA lines, the detail says inter area, show ip route ospf lists both kinds, show ip ospf says ABR
let t=cmd(net,'R1','show ip route');assert.match(t,/^O IA  192\\.168\\.4\\.0\\/24 \\[110\\/4\\] via 10\\.0\\.12\\.2, 00:00:41, GigabitEthernet0\\/1$/m);
assert.match(cmd(net,'R1','show ip route 192.168.4.10'),/Known via "ospf 1", distance 110, metric 4, type inter area/);
assert.match(cmd(net,'R2','show ip route 192.168.1.10'),/type intra area/);
t=cmd(net,'R2','show ip route ospf');assert.match(t,/^O     192\\.168\\.1\\.0\\/24/m);assert.match(t,/^O IA  192\\.168\\.4\\.0\\/24/m);
t=cmd(net,'R2','show ip ospf');assert.match(t,/Number of areas in this router is 2/);assert.match(t,/It is an area border router/);assert.ok(!/area border/.test(cmd(net,'R1','show ip ospf')));
// the backbone rule: move R2's backbone link into area 1 -> no ABR, adjacency gone, area 1 isolated
ios(net,'R2',['configure terminal','router ospf 1','no network 10.0.23.0 0.0.0.3 area 0','network 10.0.23.0 0.0.0.3 area 1','end']);
assert.equal(ospfIsAbr(net,net.devs.R2),false);assert.equal(ospfNeighbors(net,net.devs.R2).length,1);assert.equal(code(net,'R1','192.168.4.0',24),null);assert.equal(reach(net,net.devs.PC1,ip2n('192.168.4.10')).ok,false);
// REVIEW-FIXES 25: an ABR uses only the backbone's copies of other areas' routes (RFC 2328 16.2). R2 and R3 share area 0
// (a link made to cost 100) and area 1 (a new cheap link); R2 reaches area 2 through the backbone at 100+1+1, as IOS does,
// not through the area-1 shortcut, and R1 (inside area 1) still uses every summary it hears.
{const n=solve('Multi-area OSPF');link(n,'R2','g0/2','R3','g0/2');
  ios(n,'R2',['configure terminal','interface g0/2','ip address 10.0.99.1 255.255.255.252','no shutdown','interface g0/1','ip ospf cost 100','router ospf 1','network 10.0.99.0 0.0.0.3 area 1','end']);
  ios(n,'R3',['configure terminal','interface g0/2','ip address 10.0.99.2 255.255.255.252','no shutdown','interface g0/0','ip ospf cost 100','router ospf 1','network 10.0.99.0 0.0.0.3 area 1','end']);
  const r=routes(n,n.devs.R2).find(x=>x.net===ip2n('192.168.4.0'));assert.deepEqual([r.code,r.metric,r.ifc.name],['O IA',102,'GigabitEthernet0/1']);
  assert.equal(code(n,'R1','192.168.4.0',24),'O IA 4','a non-ABR uses the summary it hears in its own area');}
// REVIEW-FIXES 26: an area mismatch logs %OSPF-4-ERRRCV on both ends (the console of the router you typed on, the log of the
// other), then at most once a minute.
{const n=solve('Multi-area OSPF'),s={mode:'priv'},R2=n.devs.R2,R3=n.devs.R3;execLine(n,R2,s,'configure terminal');execLine(n,R2,s,'router ospf 1');execLine(n,R2,s,'no network 10.0.23.0 0.0.0.3 area 0');
  const out=execLine(n,R2,s,'network 10.0.23.0 0.0.0.3 area 1');
  assert.ok(out.includes('%OSPF-4-ERRRCV: Received invalid packet: mismatched area ID from backbone area must be virtual-link but not found from 10.0.23.2, GigabitEthernet0/1'),out.join('|'));
  assert.ok((R3.logBuf||[]).some(l=>l.endsWith('%OSPF-4-ERRRCV: Received invalid packet: mismatched area ID from 10.0.23.1, GigabitEthernet0/0')),'R3 logs the non-backbone form');
  assert.ok(!execLine(n,R2,s,'end').some(l=>/ERRRCV/.test(l)),'not repeated on the next command');
  try{SIM_NOW=Date.now()+61000;assert.ok(execLine(n,R2,{mode:'priv'},'show clock').some(l=>/ERRRCV/.test(l)),'repeated after a minute');}finally{SIM_NOW=null;}
  const fixed=solve('Multi-area OSPF');assert.ok(!execLine(fixed,fixed.devs.R2,{mode:'priv'},'show ip ospf neighbor').some(l=>/ERRRCV/.test(l)),'no message when areas match');}
// an area attached to a non-backbone area only: R3 in areas 1 and 2 (no area 0) is not an ABR, so areas 1 and 2 stay apart
net=solve('Multi-area OSPF');
ios(net,'R2',['configure terminal','router ospf 1','no network 10.0.23.0 0.0.0.3 area 0','network 10.0.23.0 0.0.0.3 area 1','end']);
ios(net,'R3',['configure terminal','router ospf 1','no network 10.0.23.0 0.0.0.3 area 0','network 10.0.23.0 0.0.0.3 area 1','end']);
assert.deepEqual(ospfAreasOf(net,net.devs.R3).sort(),[1,2]);assert.equal(ospfIsAbr(net,net.devs.R3),false);
assert.equal(ospfNeighbors(net,net.devs.R2).length,2,'R2-R3 neighbours again, both in area 1');
assert.equal(code(net,'R1','10.0.23.0',30),'O 2','area 1 grew: the R2-R3 link is intra-area for R1 now');
assert.equal(code(net,'R1','192.168.4.0',24),null,'area 2 is unreachable: nothing summarises it without a backbone');
assert.equal(code(net,'R4','192.168.1.0',24),null);
// intra-area beats inter-area to the same prefix even when the inter-area path is cheaper
net=solve('Multi-area OSPF');
ios(net,'R2',['configure terminal','interface loopback 0','ip address 10.9.9.9 255.255.255.255','ip ospf cost 50','router ospf 1','network 10.9.9.9 0.0.0.0 area 1','end']);
ios(net,'R3',['configure terminal','interface loopback 0','ip address 10.9.9.9 255.255.255.255','router ospf 1','network 10.9.9.9 0.0.0.0 area 0','end']);
assert.equal(code(net,'R1','10.9.9.9',32),'O 51','R1 keeps the area-1 intra route (cost 51) over the cheaper summary R2 would give it from area 0 (cost 3)');
assert.equal(code(net,'R2','10.9.9.9',32).split(' ')[0],'C','R2 owns that loopback itself');
assert.equal(code(net,'R4','10.9.9.9',32),'O IA 2','R4 only has summaries, and takes the cheaper one (R3 own loopback)');
// single-area labs are untouched
net=solve('Single-area OSPF');assert.ok(routes(net,net.devs.R1).filter(r=>r.code==='O').length>=1);assert.ok(!routes(net,net.devs.R1).some(r=>r.code==='O IA'));
}
`,context);
console.log('PASS ospfarea: areas and ABRs, O versus O IA with metrics, show ip route / detail / ospf filter / show ip ospf, backbone rule (mismatched area, area without backbone), intra beats inter, single-area unchanged.');
