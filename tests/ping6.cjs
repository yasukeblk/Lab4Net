// IPv6 pings and traceroutes play live like IPv4: the neighbour cache loses the first echo on a cold IOS device,
// Windows queues it and prints no TTL, routers without a route answer U, and show ipv6 neighbors lists what was learned.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const context=vm.createContext({assert,console});
vm.runInContext(engine+`
function solve(title){const lab=LABS.find(l=>l.title===title),net=lab.build();for(const [name,commands] of Object.entries(lab.solution)){const d=net.devs[name],s={mode:d.type==='pc'?'pc':'user'};commands.forEach(c=>execLine(net,d,s,c));}return net;}
const cmd=(net,dev,line)=>{const d=net.devs[dev],s={mode:d.type==='pc'?'pc':'priv',hist:[],hi:0,lines:[]};const out=execLine(net,d,s,line);return {out,text:out.join('\\n'),pace:s.pace,s};};
const bang=r=>r.out.find(l=>/^[!.U]+$/.test(l));
{
const lab=LABS.find(l=>l.title==='IPv6 static and default routes');assert.ok(lab,'lab exists');
let net=solve(lab.title);
// pick a PC with a global address and a router global address that is not on the PC's own link
const pcs=Object.values(net.devs).filter(d=>d.type==='pc'&&(d.ifs.FastEthernet0.v6||[]).length),routers=Object.values(net.devs).filter(d=>d.type==='router');
assert.ok(pcs.length&&routers.length);
const pc=pcs[0],pcA=pc.ifs.FastEthernet0.v6[0];
let target=null,tdev=null;for(const r of routers)for(const i of Object.values(r.ifs))for(const g of i.v6||[])if(net6(g.a,64)!==net6(pcA.a,64)&&reach6(net,pc,g.a).ok&&!target){target=g.a;tdev=r;}
assert.ok(target,'a reachable far router address');
// Windows: live lines, no TTL on IPv6 replies, statistics
let r=cmd(net,pc.name,'ping '+fmt6(target,true));
assert.equal(r.out[1],'Pinging '+fmt6(target,true)+' with 32 bytes of data:');
assert.equal(r.out.filter(l=>/^Reply from /.test(l)).length,4,r.text);assert.ok(!/TTL=/.test(r.text),'no TTL for IPv6 replies');
assert.ok(r.text.includes('Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)'));assert.ok(r.pace&&r.pace.t.some(x=>x&&x.pkt),'plays live');
assert.ok(pc.ndc&&Object.keys(pc.ndc).length,'the host learned its gateway');
// IOS: the first echo through a cold router is lost, the next ping is clean; show ipv6 neighbors shows the learned MAC
const src=routers.find(x=>x!==tdev&&Object.values(x.ifs).some(i=>(i.v6||[]).length));
if(src){net=solve(lab.title);const S=net.devs[src.name];const dst=(()=>{for(const i of Object.values(net.devs[tdev.name].ifs))for(const g of i.v6||[])if(reach6(net,S,g.a).ok)return g.a;return null;})();
  if(dst){r=cmd(net,S.name,'ping '+fmt6(dst));assert.equal(r.out[1],'Sending 5, 100-byte ICMP Echos to '+fmt6(dst)+', timeout is 2 seconds:');
    const b=bang(r);assert.ok(/^\\.{0,3}!{2,5}$/.test(b),'cold neighbour cache: '+b);assert.match(r.text,/Success rate is \\d+ percent/);assert.ok(r.pace);
    const b2=bang(cmd(net,S.name,'ping '+fmt6(dst)));assert.equal(b2,'!!!!!','warm cache');
    const nb=cmd(net,S.name,'show ipv6 neighbors');assert.ok(nb.out[0].startsWith('IPv6 Address'),nb.text);assert.ok(nb.out.length>=2,'at least one neighbour');
    assert.ok(nb.out.slice(1).every(l=>/REACH (Gi|Fa)/.test(l)),nb.text);
    cmd(net,S.name,'clear ipv6 neighbors');assert.equal(cmd(net,S.name,'show ipv6 neighbors').out.length,1);
    assert.equal(bang(cmd(net,S.name,'ping '+fmt6(dst))).startsWith('.'),true,'cold again after clearing');
    // repeat and size options
    r=cmd(net,S.name,'ping '+fmt6(dst)+' repeat 3 size 1500');assert.equal(r.out[1],'Sending 3, 1500-byte ICMP Echos to '+fmt6(dst)+', timeout is 2 seconds:');assert.equal(bang(r).length,3);
    // traceroute
    r=cmd(net,S.name,'traceroute '+fmt6(dst));assert.equal(r.out[1],'Tracing the route to '+fmt6(dst));assert.ok(r.out.length>=3&&/^  1 /.test(r.out[2]),r.text);assert.ok(r.out.at(-1).includes(fmt6(dst)),r.text);
    r=cmd(net,S.name,'traceroute ipv6 '+fmt6(dst));assert.equal(r.out[1],'Tracing the route to '+fmt6(dst));}}
// IPv6 traffic teaches the switches: a PC's ping leaves its MAC on the switch, and the first exchange floods a neighbor solicitation
net=solve(lab.title);{const sw=Object.values(net.devs).find(d=>d.type==='switch'&&Object.values(d.ifs).some(i=>i.link&&i.link.dev===pc.name));
  if(sw){cmd(net,pc.name,'ping '+fmt6(target,true));assert.ok((sw.mact||[]).some(e=>e.mac===macOf(net.devs[pc.name])),'switch learned the IPv6 sender');
    const ev=TRACE&&TRACE.f.hops.l2&&TRACE.f.hops.l2[0];assert.ok(ev&&ev.nd===true&&ev.nhText,'a neighbor-solicitation event: '+JSON.stringify(ev&&{nd:ev.nd,arp:ev.arp,nh:ev.nhText}));
    cmd(net,pc.name,'ping '+fmt6(target,true));assert.equal(TRACE.f.hops.l2[0].arp,false,'warm the second time');}}
// no route: the PC gets timeouts or unreachables, never a reply; tracert prints its line
net=solve(lab.title);for(const x of routers){const d=net.devs[x.name];d.statics6=[];}
let t2=null;for(const x of routers)for(const i of Object.values(net.devs[x.name].ifs))for(const g of i.v6||[])if(!t2&&net6(g.a,64)!==net6(net.devs[pc.name].ifs.FastEthernet0.v6[0].a,64)&&!reach6(net,net.devs[pc.name],g.a).ok)t2=g.a;
if(t2){r=cmd(net,pc.name,'ping '+fmt6(t2,true));assert.equal(r.out.filter(l=>/^Reply from .*time/.test(l)).length,0,r.text);assert.ok(/Request timed out\\.|Destination host unreachable\\./.test(r.text));
  r=cmd(net,pc.name,'tracert '+fmt6(t2,true));assert.equal(r.out[1],'Tracing route to '+fmt6(t2,true)+' over a maximum of 30 hops');assert.ok(r.pace);}
}
`,context);
console.log('PASS ping6: Windows IPv6 ping (live, no TTL, statistics, neighbour learned), IOS IPv6 ping (cold first echo, warm cache, repeat/size), show/clear ipv6 neighbors, traceroute and traceroute ipv6, no-route behaviour, tracert.');
