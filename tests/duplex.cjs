// Duplex and speed: autonegotiation, the forced-vs-auto duplex mismatch (link up, CDP warning, late collisions on
// the half end, CRC and runts on the full end), a forced speed mismatch (link down), counters and clear counters.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const context=vm.createContext({assert,console});
vm.runInContext(engine+`
function solve(title){const lab=LABS.find(l=>l.title===title),net=lab.build();for(const [name,commands] of Object.entries(lab.solution)){const d=net.devs[name],s={mode:d.type==='pc'?'pc':'user'};commands.forEach(c=>execLine(net,d,s,c));}return net;}
const go=(net,d,s,line)=>{const out=execLine(net,d,s,line);return {out,text:out.join('\\n')};};
const S=()=>({mode:'priv',ctx:null,hist:[],hi:0,lines:[]});
{
// Static routing: R1 Gi0/1 <-> R2 Gi0/0, both auto
let net=solve('Static routing');const R1=net.devs.R1,R2=net.devs.R2,s1=S(),s2=S();
const r1=R1.ifs['GigabitEthernet0/1'],r2=R2.ifs['GigabitEthernet0/0'];
let st=linkSettle(net,R1,r1);assert.deepEqual([st.speed,st.duplex,st.mismatch,st.speedOk],['1000','full',false,true],'both auto: gigabit full duplex');
assert.match(go(net,R1,s1,'show interfaces g0/1').text,/Full Duplex, 1Gbps/);
// REVIEW-FIXES 5: forcing duplex alone does not turn autonegotiation off, so both ends still agree on full
let r=go(net,R1,s1,'configure terminal');go(net,R1,s1,'interface g0/1');r=go(net,R1,s1,'duplex full');go(net,R1,s1,'end');
st=linkSettle(net,R2,r2);assert.deepEqual([st.speed,st.duplex,st.farDuplex,st.mismatch],['1000','full','full',false],'duplex alone: still negotiated');
assert.ok(!r.text.includes('DUPLEX_MISMATCH'),r.text);
// forcing both at 1000 turns negotiation off; the auto end senses 1000 and falls back to FULL (gigabit is never half)
go(net,R1,s1,'configure terminal');go(net,R1,s1,'interface g0/1');go(net,R1,s1,'speed 1000');go(net,R1,s1,'end');
st=linkSettle(net,R2,r2);assert.deepEqual([st.speed,st.duplex,st.mismatch],['1000','full',false],'auto end at 1000 falls back to full');
assert.match(go(net,R2,s2,'show interfaces g0/0').text,/Full Duplex, 1Gbps/);
// the classic mismatch: speed 100 and duplex full forced on one end, auto on the other: the auto end senses 100 Mb/s and
// falls back to half duplex, and both ends log the CDP mismatch
go(net,R1,s1,'configure terminal');go(net,R1,s1,'interface g0/1');r=go(net,R1,s1,'speed 100');go(net,R1,s1,'end');
st=linkSettle(net,R2,r2);assert.deepEqual([st.speed,st.duplex,st.farDuplex],['100','half','full']);assert.equal(st.mismatch,true);assert.equal(ifUp(net,R2,r2),true,'a duplex mismatch keeps the link up');
assert.ok(r.text.includes('%CDP-4-DUPLEX_MISMATCH: duplex mismatch discovered on GigabitEthernet0/1 (not half duplex), with R2 GigabitEthernet0/0 (half duplex).'),r.text);
assert.ok((R2.logBuf||[]).some(l=>/CDP-4-DUPLEX_MISMATCH: duplex mismatch discovered on GigabitEthernet0\\/0 \\(not full duplex\\), with R1 GigabitEthernet0\\/1 \\(full duplex\\)/.test(l)),'the far end logs it from its own point of view');
assert.match(go(net,R2,s2,'show interfaces g0/0').text,/Half Duplex, 100Mbps/);
// light traffic still gets through, and the counters tell the story
r=go(net,net.devs.PC1,{mode:'pc'},'ping 192.168.3.10');assert.match(r.text,/Reply from 192.168.3.10/);
const c1=r1.cnt,c2=r2.cnt;assert.ok(c1&&c2,'counters exist on both ends');
assert.ok(c1.crc>0&&c1.runts>0&&c1.late===0,'full end sees CRC and runts: '+JSON.stringify(c1));assert.ok(c2.late>0&&c2.crc===0,'half end sees late collisions: '+JSON.stringify(c2));
assert.ok(c1.in>0&&c1.out>0&&c2.in>0&&c2.out>0);
// REVIEW-FIXES 24: errors count on the right frames and at a realistic rate: CRC and runts only on received frames at the
// full-duplex end (never more errors than frames in), late collisions only on sent frames at the half-duplex end.
assert.ok(c1.crc+c1.runts<=c1.in&&c1.crc<c1.in,'input errors cannot exceed packets input: '+JSON.stringify(c1));assert.ok(c2.late<=c2.out&&c2.late<c2.out,'late collisions only on sent frames: '+JSON.stringify(c2));
assert.ok(c1.late===0&&c2.crc===0&&c2.runts===0);
let sh=go(net,R1,s1,'show interfaces g0/1').text;assert.match(sh,new RegExp(c1.in+' packets input'));assert.match(sh,new RegExp(c1.crc+' CRC'));assert.match(sh,/0 late collision/);
sh=go(net,R2,s2,'show interfaces g0/0').text;assert.match(sh,new RegExp(c2.late+' late collision'));
// matching the far end removes the mismatch; no new warning
go(net,R2,s2,'configure terminal');go(net,R2,s2,'interface g0/0');go(net,R2,s2,'duplex full');go(net,R2,s2,'end');
assert.equal(linkSettle(net,R1,r1).mismatch,false);assert.match(go(net,R2,s2,'show interfaces g0/0').text,/Full Duplex/);
// half forced on one end with auto on the other is NOT a mismatch (auto falls back to half as well)
go(net,R2,s2,'configure terminal');go(net,R2,s2,'interface g0/0');go(net,R2,s2,'no duplex');go(net,R2,s2,'end');
go(net,R1,s1,'configure terminal');go(net,R1,s1,'interface g0/1');go(net,R1,s1,'no speed');go(net,R1,s1,'end');
go(net,R1,s1,'configure terminal');go(net,R1,s1,'interface g0/1');go(net,R1,s1,'duplex half');go(net,R1,s1,'end');
st=linkSettle(net,R2,r2);assert.deepEqual([st.duplex,st.farDuplex,st.mismatch],['half','half',false]);
go(net,R1,s1,'configure terminal');go(net,R1,s1,'interface g0/1');go(net,R1,s1,'no duplex');go(net,R1,s1,'end');
// clear counters asks, then zeroes and logs
r=go(net,R1,s1,'clear counters');assert.equal(promptOf(R1,s1),'Clear "show interface" counters on all interfaces [confirm]');
r=go(net,R1,s1,'');assert.ok(r.text.includes('%CLEAR-5-COUNTERS: Clear counter on all interfaces by console'));assert.equal(r1.cnt.in,0);assert.equal(r1.cnt.crc,0);
assert.match(go(net,R1,s1,'show interfaces g0/1').text,/Last clearing of "show interface" counters 00:00:/);
// a forced speed on one end is sensed by the auto end; two forced, different speeds keep the link down
go(net,R1,s1,'configure terminal');go(net,R1,s1,'interface g0/1');go(net,R1,s1,'speed 100');go(net,R1,s1,'end');
assert.equal(ifUp(net,R2,r2),true);assert.equal(linkSettle(net,R2,r2).speed,'100');assert.match(go(net,R2,s2,'show interfaces g0/0').text,/Full Duplex, 100Mbps/);
r=go(net,R2,s2,'configure terminal');go(net,R2,s2,'interface g0/0');r=go(net,R2,s2,'speed 10');go(net,R2,s2,'end');
assert.equal(ifUp(net,R1,r1),false);assert.equal(ifUp(net,R2,r2),false,'speed mismatch: link down at both ends');
assert.ok(r.text.includes('%LINK-3-UPDOWN: Interface GigabitEthernet0/0, changed state to down'),r.text);
assert.match(go(net,R1,s1,'show ip interface brief').text,/GigabitEthernet0\\/1 +10.0.12.1 +YES manual down +down/);
assert.equal(reach(net,net.devs.PC1,ip2n('192.168.3.10')).ok,false);
go(net,R2,s2,'configure terminal');go(net,R2,s2,'interface g0/0');go(net,R2,s2,'no speed');go(net,R2,s2,'end');assert.equal(ifUp(net,R1,r1),true);
// a switch port forced full with an auto PC behind it is a mismatch too; show interfaces status shows what was negotiated or forced
net=solve('VLANs and access ports');const SW=net.devs.SW1,ss=S();
let stat=go(net,SW,ss,'show interfaces status').text;assert.match(stat,/Fa0\\/1 .*connected .*a-full +a-100/);
go(net,SW,ss,'configure terminal');go(net,SW,ss,'interface f0/1');go(net,SW,ss,'duplex full');go(net,SW,ss,'speed 100');go(net,SW,ss,'end');
stat=go(net,SW,ss,'show interfaces status').text;assert.match(stat,/Fa0\\/1 .*connected .* full +100 /);
assert.equal(linkSettle(net,SW,SW.ifs['FastEthernet0/1']).mismatch,true,'the PC NIC autonegotiates and falls back to half');
// the exam fault generator for speed produces a link that stays down
const lab=LABS.find(l=>l.title==='Static routing');const f=EXAM_FAULTS.find(g=>g.id==='speed').gen(solvedNet(lab),seedRng('x'));assert.ok(f&&Object.keys(f.cmds).length===2,'two devices configured');
const n2=solvedNet(lab);applyCmds(n2,f.cmds);assert.ok(failingChecks(lab,n2)>0);
}
`,context);
console.log('PASS duplex: autonegotiation, forced-vs-auto duplex mismatch (link up, CDP warning both ends, late collisions vs CRC/runts), matching ends, half/auto not a mismatch, counters and clear counters, speed sensed by auto, forced speed mismatch brings the link down, show interfaces status columns, PC NIC fallback, the speed exam fault.');
