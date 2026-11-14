// ---------- IPv6: live ping and traceroute, the neighbour cache ----------
// Mirrors the IPv4 ping: each echo's fate comes from reach6. Each device keeps an IPv6 neighbour cache (d.ndc, the
// ND equivalent of ARP); an IOS device that still has to resolve its next hop loses the first echo, a Windows host
// queues it. A router with no route answers with an ICMPv6 unreachable (U) when it can reach the source.
// Output carries s.pace, so it plays live in the console like the IPv4 commands.
function nd6Prune(net,d){const c=d.ndc;if(!c)return {};for(const k in c){const i=d.ifs[c[k].ifn];if(!i||!i.v6on||!ifUp(net,d,i))delete c[k];}return c;}
function nd6Learn(net,d,addr,ifc,mac){(d.ndc=d.ndc||{})[fmt6(addr)]={ifn:ifc.name,mac,addr,t:simNow()};}
// Walk one direction, resolving each hop's next hop: a device whose cache did not hold it drops that echo.
function nd6Walk(net,start,dst){let d=start,miss=0;for(let t=0;t<20;t++){if(owns6(net,d,dst))break;if(t>0&&!v6router(d))break;const h=nextHop6(net,d,dst);if(!h)break;
  const peer=l2peers(net,d,h.ifc).find(p=>has6(p.dev,p.ifc,h.nh));if(!peer)break;const c=nd6Prune(net,d),k=fmt6(h.nh);if(!c[k]&&d.type!=='pc')miss++;
  nd6Learn(net,d,h.nh,h.ifc,macTx(net,peer.dev,peer.ifc));
  const mine=(h.ifc.v6||[])[0];nd6Learn(net,peer.dev,mine?mine.a:linkLocal(d,h.ifc),peer.ifc,macTx(net,d,h.ifc));
  // neighbour discovery runs from link-local addresses, so each end also learns the other's FE80 address
  if(mine)nd6Learn(net,peer.dev,linkLocal(d,h.ifc),peer.ifc,macTx(net,d,h.ifc));if(peer.ifc.v6&&peer.ifc.v6.length&&fmt6(h.nh)!==fmt6(linkLocal(peer.dev,peer.ifc)))nd6Learn(net,d,linkLocal(peer.dev,peer.ifc),h.ifc,macTx(net,peer.dev,peer.ifc));
  d=peer.dev;}return miss;}
function pingRun6(net,src,dst,count){const R=reach6(net,src,dst),f=R.f,r=R.r;
  const drops=nd6Walk(net,src,dst)+(f.ok&&f.dest!==src&&f.src!=null?nd6Walk(net,f.dest,f.src):0);
  if(LIVE&&L2LIVE){trafficCount(net,f,count,114);if(r)trafficCount(net,r,count,114);}
  let mode='.',from=null;if(R.ok)mode='!';
  else if(!f.ok&&f.hops.length&&f.src!=null){const X=net.devs[f.hops.path[f.hops.path.length-1]];if(X&&X!==src&&/^No IPv6 route/.test(f.reason||'')&&pq(net,()=>fwd6(net,X,f.src)).ok){mode='U';from=f.hops[f.hops.length-1];}}
  const routers=Math.max(0,f.hops.length-1),out=[];
  // (IOS and Windows queue the echo while the neighbour resolves, so unlike IPv4's ARP the first echo is not lost)
  for(let k=0;k<count;k++){
    if(mode==='!'){const x=pingRng(src);out.push({c:'!',rtt:routers+(x<.55?0:x<.88?1:2)});}
    else if(mode==='U')out.push({c:src.type==='pc'||k%2===0?'U':'.',from});else out.push({c:'.'});}
  return {R,f,r,res:out};}
function iosPing6(e,dst,count,size){const P=pingRun6(e.net,e.d,dst,count),L=P.res,chars=L.map(p=>p.c).join(''),lines=[],t=[];
  lines.push('Type escape sequence to abort.','Sending '+count+', '+size+'-byte ICMP Echos to '+fmt6(dst)+', timeout is 2 seconds:');t.push(0,0);
  for(let k=0;k<chars.length;k+=70){const part=chars.slice(k,k+70);lines.push(part);t.push({chars:[...part].map(c=>c==='!'?140+(L[k].rtt||0)*20:c==='U'?260:2000),pkt:true});}
  lines.push(iosRate(L,count));t.push(60);e.out(...lines);e.s.pace={t,abort:n=>[iosRate(L,n)]};}
function winPing6(e,dst,count,size){const a=fmt6(dst,true),lines=['','Pinging '+a+' with '+size+' bytes of data:'],t=[0,0],P=pingRun6(e.net,e.d,dst,count),L=P.res;
  L.forEach((p,k)=>{if(p.c==='!'){lines.push('Reply from '+a+': '+(p.rtt?'time='+p.rtt+'ms':'time<1ms'));t.push({d:k?1000:300+p.rtt*20,pkt:true});}
    else if(p.c==='U'){lines.push('Reply from '+fmt6(p.from,true)+': Destination host unreachable.');t.push({d:k?1000:300,pkt:true});}
    else{lines.push('Request timed out.');t.push({d:k?2000:2500,pkt:true});}});
  const st=winStats(a,L,count,false);lines.push(...st);st.forEach((x,k)=>t.push(k===1?60:0));
  e.out(...lines);e.s.pace={t,abort:n=>winStats(a,L,n,true)};}
// Traceroute: the address each hop answers from is its global address on the interface the probe arrived on.
function traceRun6(net,src,dst){const P=pingRun6(net,src,dst,1),f=P.f,hops=[];
  const back=X=>f.src!=null&&(X===src||pq(net,()=>fwd6(net,X,f.src)).ok);
  const ips=f.hops.slice();if(f.ok&&ips.length)ips[ips.length-1]=dst;
  ips.forEach((ip,k)=>{const last=f.ok&&k===ips.length-1;let X=null,show=ip;
    for(const d of Object.values(net.devs))for(const i of Object.values(d.ifs))if(has6(d,i,ip)){X=d;const g=(i.v6||[])[0];if(g&&!last)show=g.a;}
    const reply=last?P.R.ok:!!X&&back(X);hops.push(reply?{ip:show,dest:last,cisco:X&&X.type!=='pc'}:null);});
  if(!f.ok&&P.res[0]&&P.res[0].c==='U')hops.push({ip:P.res[0].from,code:'!H'});
  return {hops,done:f.ok&&P.R.ok||!!(P.res[0]&&P.res[0].c==='U')};}
function iosTrace6(e,dst){const T=traceRun6(e.net,e.d,dst),lines=['Type escape sequence to abort.','Tracing the route to '+fmt6(dst)],t=[0,0],r=()=>pingRng(e.d);
  const ms=()=>{const x=r();return (x<.5?0:x<.85?1:2)+' msec';},add=parts=>{lines.push(parts.map(p=>p[1]).join(''));t.push({parts});};
  const n=T.done?T.hops.length:30;
  for(let k=0;k<n;k++){const h=T.hops[k],no=String(k+1).padStart(3)+' ';
    if(!h){add([[0,no],[1200,'*  '],[1200,'*  '],[1200,'*']]);continue;}
    if(h.code){add([[0,no+fmt6(h.ip)+' '],[250,h.code+'  '],[250,h.code+'  '],[250,h.code]]);continue;}
    add([[0,no+fmt6(h.ip)+' '],[160,ms()+' '],[90,h.dest&&h.cisco?'*  ':ms()+' '],[h.dest&&h.cisco?2000:90,ms()]]);}
  e.out(...lines);e.s.pace={t,abort:()=>[]};}
function winTrace6(e,dst){const T=traceRun6(e.net,e.d,dst),a=fmt6(dst,true),lines=['','Tracing route to '+a+' over a maximum of 30 hops',''],t=[0,0,0],r=()=>pingRng(e.d);
  const ms=()=>{const x=r();return (x<.6?'<1':x<.9?'1':'2').padStart(6)+' ms';},add=parts=>{lines.push(parts.map(p=>p[1]).join(''));t.push({parts});};
  const n=T.done?T.hops.length:30;
  for(let k=0;k<n;k++){const h=T.hops[k],no=String(k+1).padStart(3);
    if(!h){add([[0,no],[1500,'     *   '],[1500,'     *   '],[1500,'     *     Request timed out.']]);continue;}
    if(h.code){add([[0,no],[600,'  '+fmt6(h.ip,true)+'  reports: Destination host unreachable.']]);continue;}
    add([[0,no],[180,ms()],[90,ms()],[90,ms()+'  '+fmt6(h.ip,true)]]);}
  lines.push('','Trace complete.');t.push(0,0);e.out(...lines);e.s.pace={t,abort:()=>['^C']};}
{const find=(pat,mode)=>CMDS.find(c=>c.pat.join(' ')===pat&&c.modes.includes(mode));
  const a=find('ping <ip6>','priv');if(a)a.fn=e=>iosPing6(e,e.args[0],5,100);
  const b=find('ping ipv6 <ip6>','priv');if(b)b.fn=e=>iosPing6(e,e.args[0],5,100);
  const c=find('ping <ip6>','pc');if(c)c.fn=e=>winPing6(e,e.args[0],4,32);
  const d=find('tracert <ip6>','pc');if(d)d.fn=e=>winTrace6(e,e.args[0]);}
Cn(EX,'traceroute <ip6>',e=>iosTrace6(e,e.args[0]),['router','switch'],true);
Cn(EX,'traceroute ipv6 <ip6>',e=>iosTrace6(e,e.args[0]),['router','switch'],true);
Cn(EX,'ping <ip6> <rest>',e=>{const o=pingOpts(e.args[1],false);if(o.bad||o.source)return e.out(BAD);iosPing6(e,e.args[0],o.count,o.size);},['router','switch'],true);
Cn('pc','ping <ip6> <rest>',e=>{const o=pingOpts(e.args[1],true);if(o.bad){e.out('Bad option. Use: ping [-n count] [-l size] address');return;}winPing6(e,e.args[0],o.count,o.size);},null,true);
Cn(EX,'show ipv6 neighbors',e=>{const c=nd6Prune(e.net,e.d),rows=Object.values(c).sort((x,y)=>x.ifn<y.ifn?-1:1);
  const now=simNow(),age=x=>Math.max(0,Math.floor((now-(x.t||now))/60000)),state=x=>now-(x.t||now)<30000?'REACH':'STALE';
  e.out('IPv6 Address                              Age Link-layer Addr State Interface',...rows.map(x=>pad(fmt6(x.addr),42)+String(age(x)).padStart(3)+' '+pad(x.mac,16)+pad(state(x),6)+shortIf(x.ifn)));},['router','switch']);
Cn('priv','clear ipv6 neighbors',e=>{e.d.ndc={};},['router','switch']);
Object.assign(KWHELP,{neighbors:'Show IPv6 neighbor cache entries'});
Object.assign(WHYC,{'show ipv6 neighbors':'The IPv6 equivalent of show ip arp: which link-layer (MAC) address each neighbour resolved to, learned through Neighbor Discovery. An entry missing for the next hop explains a lost first echo.',
'clear ipv6 neighbors':'Forgets every learned neighbour, so the next packet has to go through Neighbor Discovery again.',
'traceroute <ip6>':'Shows each IPv6 hop on the way to the destination. A hop that answers from a global address can route back to you; stars mean it cannot, or the probe never got there.'});
