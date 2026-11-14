// ---------- real-life ping and traceroute ----------
// What happens to each echo is worked out from the real forwarding result: a reply, a timeout, or an ICMP
// unreachable sent back by the router that dropped it. Each device keeps an ARP cache, so the first ping
// through a router that has not yet resolved its next hop loses a packet, like IOS (".!!!!").
// Output is plain text for the engine and tests; e.s.pace adds timing that the console uses to play it live.
function pq(net,fn){const saved=[],was=LIVE;for(const n in net.devs){const x=net.devs[n].nat;if(x)saved.push([x,x.table.length,(x.dyn||[]).length]);}
  LIVE=false;try{return fn();}finally{LIVE=was;saved.forEach(([x,l,m])=>{x.table.length=l;if(x.dyn)x.dyn.length=m;});}}
function ipOwner(net,ip){return Object.values(net.devs).find(x=>ownsIp(net,x,ip))||null;}
function onLinkIf(net,d,ip){return Object.values(d.ifs).find(i=>i.ip!=null&&i.len!=null&&ifUp(net,d,i)&&netOf(i.ip,i.len)===netOf(ip,i.len))||null;}
function arpPrune(net,d){const c=d.arpc;if(!c)return {};for(const ip in c){const i=d.ifs[c[ip]];if(!i||i.ip==null||!ifUp(net,d,i)||netOf(+ip,i.len)!==netOf(i.ip,i.len))delete c[ip];}return c;}
function arpLearn(net,d,ip){const i=onLinkIf(net,d,ip);if(!i)return;(d.arpc=d.arpc||{})[ip]=i.name;}
// Walk one direction of a forwarding result: every L3 device that had to ARP for its next hop drops the packet
// that triggered it (a Windows host queues it instead). Both ends of each resolved hop learn each other.
function arpWalk(net,start,res){let d=start,miss=0;if(!res)return 0;
  for(const ip of res.hops){const c=arpPrune(net,d);if(c[ip]==null&&d.type!=='pc')miss++;arpLearn(net,d,ip);
    const nx=ipOwner(net,ip);if(!nx)break;const back=onLinkIf(net,d,ip);if(back)arpLearn(net,nx,back.ip);d=nx;}
  return miss;}
function pingRng(d){d.icmpSeq=(d.icmpSeq||0)+1;const x=Math.sin(d.icmpSeq*12.9898+d.name.length*78.233)*43758.5453;return x-Math.floor(x);}
// Results per echo: {c:'!'|'.'|'U', rtt, from}. from is the address an unreachable came back from.
function pingRun(net,src,dst,count,srcOv){
  const R=reach(net,src,dst,'icmp',0,srcOv),T=TRACE&&TRACE.src===src?TRACE:null,f=R.f,r=T?T.r:null;
  const h0=ownsIp(net,src,dst)?null:nextHop(net,src,dst),srcIp=srcOv??(ownsIp(net,src,dst)?dst:h0?h0.ifc.ip:null);
  const drops=arpWalk(net,src,f)+(f.ok&&f.dest!==src?arpWalk(net,f.dest,r):0);
  if(LIVE&&L2LIVE){trafficCount(net,f,count,114);if(r)trafficCount(net,r,count,114);}
  let mode='.',from=null,unreach=null;
  if(R.ok)mode='!';
  else if(!f.ok&&srcIp!=null&&f.hops.length){const xName=f.hops.path.at(-1),X=net.devs[xName],acl=/^Blocked by ACL/.test(f.reason||''),noRoute=/^No usable route/.test(f.reason||'');
    if(X&&X!==src&&(acl||noRoute)&&pq(net,()=>fwd(net,X,{src:null,dst:srcIp,proto:'icmp',sport:0,dport:0})).ok){mode='U';from=f.hops.at(-1);unreach=acl?'A':'H';}}
  const routers=Math.max(0,(f.hops||[]).length-1),out=[];
  for(let k=0;k<count;k++){
    if(mode==='!'&&k<drops){out.push({c:'.'});continue;}
    if(mode==='!'){const x=pingRng(src);out.push({c:'!',rtt:routers+(x<.55?0:x<.88?1:2)});}
    else if(mode==='U')out.push({c:src.type==='pc'||k%2===0?'U':'.',from});
    else out.push({c:'.'});}
  if(LIVE)pingDebug(net,src,dst,{R,f,r,srcIp,res:out,unreach});
  return {R,f,r,srcIp,res:out,unreach,ttl:R.ok&&r?(f.dest.type==='pc'?128:255)-Math.max(0,r.hops.length-1):(src.type==='pc'?128:255)};}
function rttStats(L){const t=L.filter(p=>p.c==='!').map(p=>p.rtt);if(!t.length)return null;return {min:Math.min(...t),max:Math.max(...t),avg:Math.round(t.reduce((a,b)=>a+b,0)/t.length),n:t.length};}
function iosRate(L,n){const s=rttStats(L.slice(0,n)),ok=s?s.n:0;return 'Success rate is '+Math.floor(ok*100/Math.max(1,n))+' percent ('+ok+'/'+n+')'+(s?', round-trip min/avg/max = '+s.min+'/'+s.avg+'/'+s.max+' ms':'');}
function iosPing(e,dst,count,size,srcOv,timeout,opt){opt=opt||{};const P=pingRun(e.net,e.d,dst,count,srcOv);let L=P.res;
  if(opt.df&&(opt.maxSize||size)>1500)L=L.map((p,k)=>(opt.sizes?opt.sizes[k]:size)>1500?{c:k%2?'.':'M',rtt:0}:p);
  const chars=L.map(p=>p.c).join(''),lines=[],t=[],tmo=timeout??2;
  lines.push('Type escape sequence to abort.','Sending '+count+', '+(opt.sizeLabel||size)+'-byte ICMP Echos to '+n2ip(dst)+', timeout is '+tmo+' seconds:');t.push(0,0);
  if(srcOv!=null){lines.push('Packet sent with a source address of '+n2ip(srcOv)+' ');t.push(0);}
  if(opt.df){lines.push('Packet sent with the DF bit set');t.push(0);}
  for(let k=0;k<chars.length;k+=70){const part=chars.slice(k,k+70);lines.push(part);t.push({chars:[...part].map(c=>c==='!'?140+(L[k].rtt||0)*20:c==='U'||c==='M'?260:tmo*1000),pkt:true});}
  lines.push(iosRate(L,count));t.push(60);
  e.out(...lines);e.s.pace={t,abort:n=>[iosRate(L,n)]};}
function winStats(a,L,n,ctrlC){const s=rttStats(L.slice(0,n)),got=L.slice(0,n).filter(p=>p.c!=='.').length,lost=n-got;
  // Windows counts an ICMP unreachable as a received reply, so a failing ping can still report 0% loss.
  return ['','Ping statistics for '+a+':','    Packets: Sent = '+n+', Received = '+got+', Lost = '+lost+' ('+Math.round(lost*100/Math.max(1,n))+'% loss),',
    ...(s?['Approximate round trip times in milli-seconds:','    Minimum = '+s.min+'ms, Maximum = '+s.max+'ms, Average = '+s.avg+'ms']:[]),...(ctrlC?['Control-C','^C']:[''])];}
function winPing(e,dst,count,size){const a=n2ip(dst),i=nic(e.d),lines=['','Pinging '+a+' with '+size+' bytes of data:'],t=[0,0];
  const noRoute=i.ip==null||(!ownsIp(e.net,e.d,dst)&&!nextHop(e.net,e.d,dst));
  if(noRoute){reach(e.net,e.d,dst);for(let k=0;k<count;k++){lines.push('PING: transmit failed. General failure. ');t.push({d:k?1000:250,pkt:true});}
    const fin=n=>['','Ping statistics for '+a+':','    Packets: Sent = '+n+', Received = 0, Lost = '+n+' (100% loss),',''];lines.push(...fin(count));t.push(60,0,0,0);
    e.out(...lines);e.s.pace={t,abort:n=>[...fin(n).slice(0,-1),'Control-C','^C']};return;}
  const P=pingRun(e.net,e.d,dst,count),L=P.res,own=n2ip(i.ip);
  // A host that cannot ARP for its next hop answers itself: "Destination host unreachable" from its own address.
  const selfUnreach=!P.R.ok&&!P.f.ok&&!P.f.hops.length&&/^Next hop/.test(P.f.reason||'');
  if(selfUnreach)L.forEach(p=>{p.c='U';p.from=i.ip;});
  L.forEach((p,k)=>{if(p.c==='!'){lines.push('Reply from '+a+': bytes='+size+' '+(p.rtt?'time='+p.rtt+'ms':'time<1ms')+' TTL='+P.ttl);t.push({d:k?1000:300+p.rtt*20,pkt:true});}
    else if(p.c==='U'){lines.push('Reply from '+n2ip(p.from)+': Destination host unreachable.');t.push({d:selfUnreach?(k?1000:3000):(k?1000:300),pkt:true});}
    else{lines.push('Request timed out.');t.push({d:k?2000:2500,pkt:true});}});
  const st=winStats(a,L,count,false);lines.push(...st);st.forEach((x,k)=>t.push(k===1?60:0));
  e.out(...lines);e.s.pace={t,abort:n=>winStats(a,L,n,true)};}
// Traceroute: each hop answers only if it has a route back to the source; the router that drops the probe
// answers with !H (no route) or !A (ACL) when it can reach the source. Unanswered hops print * up to hop 30.
function traceRun(net,src,dst,srcOv){const P=pingRun(net,src,dst,1,srcOv),f=P.f,hops=[];
  const back=X=>P.srcIp!=null&&(X===src||pq(net,()=>fwd(net,X,{src:null,dst:P.srcIp,proto:'icmp',sport:0,dport:0})).ok);
  const ips=f.hops.slice();if(f.ok&&ips.length)ips[ips.length-1]=dst;
  ips.forEach((ip,k)=>{const X=ipOwner(net,f.ok&&k===ips.length-1?f.hops.at(-1):ip);
    const last=f.ok&&k===ips.length-1,reply=last?P.R.ok:!!X&&back(X);hops.push(reply?{ip,dest:last,cisco:X&&X.type!=='pc'}:null);});
  if(!f.ok&&P.unreach){const k=hops.length-1;if(P.unreach==='A'&&/inbound/.test(f.reason))hops[k]={ip:P.res[0].from,code:'!A'};else hops.push({ip:P.res[0].from,code:'!'+P.unreach});}
  return {hops,done:f.ok&&P.R.ok||!!P.unreach};}
function iosTrace(e,dst,srcOv){const T=traceRun(e.net,e.d,dst,srcOv),lines=['Type escape sequence to abort.','Tracing the route to '+n2ip(dst),'VRF info: (vrf in name/id, vrf out name/id)'],t=[0,0,0],r=()=>pingRng(e.d);
  const ms=()=>{const x=r();return (x<.5?0:x<.85?1:2)+' msec';},add=parts=>{lines.push(parts.map(p=>p[1]).join(''));t.push({parts});};
  const n=T.done?T.hops.length:30;
  for(let k=0;k<n;k++){const h=T.hops[k],no=String(k+1).padStart(3)+' ';
    if(!h){add([[0,no],[1200,'*  '],[1200,'*  '],[1200,'*']]);continue;}
    if(h.code){add([[0,no+n2ip(h.ip)+' '],[250,h.code+'  '],[250,h.code+'  '],[250,h.code]]);continue;}
    add([[0,no+n2ip(h.ip)+' '],[160,ms()+' '],[90,h.dest&&h.cisco?'*  ':ms()+' '],[h.dest&&h.cisco?2000:90,ms()]]);}
  e.out(...lines);e.s.pace={t,abort:()=>[]};}
function winTrace(e,dst){const T=traceRun(e.net,e.d,dst),lines=['','Tracing route to '+n2ip(dst)+' over a maximum of 30 hops',''],t=[0,0,0],r=()=>pingRng(e.d);
  const ms=()=>{const x=r();return (x<.6?'<1':x<.9?'1':'2').padStart(6)+' ms';},add=parts=>{lines.push(parts.map(p=>p[1]).join(''));t.push({parts});};
  const n=T.done?T.hops.length:30;
  for(let k=0;k<n;k++){const h=T.hops[k],no=String(k+1).padStart(3);
    if(!h){add([[0,no],[1500,'     *   '],[1500,'     *   '],[1500,'     *     Request timed out.']]);continue;}
    if(h.code){add([[0,no],[600,'  '+n2ip(h.ip)+'  reports: Destination host unreachable.']]);continue;}
    add([[0,no],[180,ms()],[90,ms()],[90,ms()+'  '+n2ip(h.ip)]]);}
  lines.push('','Trace complete.');t.push(0,0);
  e.out(...lines);e.s.pace={t,abort:()=>['^C']};}
// Extended options: IOS "ping A repeat N size B", Windows "ping -n N -l B A" (either order).
function pingOpts(rest,win){const o={count:win?4:5,size:win?32:100,bad:false},w=(rest||'').trim().split(/\s+/).filter(Boolean);
  for(let k=0;k<w.length;k++){const x=w[k].toLowerCase(),v=w[k+1];
    if(win?(x==='-n'):('repeat'.startsWith(x)&&x.length>1)){if(!/^\d+$/.test(v||'')){o.bad=true;break;}o.count=+v;k++;}
    else if(win?(x==='-l'):('size'.startsWith(x)&&x.length>1)){if(!/^\d+$/.test(v||'')){o.bad=true;break;}o.size=+v;k++;}
    else if(!win&&'source'.startsWith(x)&&x.length>1){if(!v){o.bad=true;break;}o.source=v;k++;if(!isIp(v)&&/^[a-z-]+$/i.test(v)&&/^[\d\/.]+$/.test(w[k+1]||'')){o.source=v+w[k+1];k++;}}
    else{o.bad=true;break;}}
  if(!o.bad&&(o.count<1||(win?o.size>65500:(o.size<36||o.size>18024))))o.bad=true;o.count=Math.min(o.count,500);return o;}
Cn(EX,'ping <ip> <rest>',e=>{const o=pingOpts(e.args[1],false);if(o.bad){e.out(BAD);return;}let src=null;if(o.source){const r=srcResolve(e.net,e.d,o.source);if(r.err)return e.out(r.err);src=r.ip;}iosPing(e,e.args[0],o.count,o.size,src);});
Cn(EX,'traceroute <ip> <rest>',e=>{const w=e.args[1].trim().split(/\s+/);if(w.length===3&&/^[a-z-]+$/i.test(w[1])&&/^[\d\/.]+$/.test(w[2]))w.splice(1,2,w[1]+w[2]);if(w.length!==2||!'source'.startsWith(w[0].toLowerCase())||w[0].length<2)return e.out(BAD);const r=srcResolve(e.net,e.d,w[1]);if(r.err)return e.out(r.err);iosTrace(e,e.args[0],r.ip);});
Cn('pc','ping <ip> <rest>',e=>{const o=pingOpts(e.args[1],true);if(o.bad){e.out('Bad option. Use: ping [-n count] [-l size] address');return;}winPing(e,e.args[0],o.count,o.size);});
Cn('pc','ping <rest>',e=>{const w=e.args[0].split(/\s+/),ip=w.find(isIp);if(!ip){e.out('Ping request could not find host '+w.at(-1)+'. Please check the name and try again.');return;}
  const o=pingOpts(w.filter(x=>x!==ip).join(' '),true);if(o.bad){e.out('Bad option. Use: ping [-n count] [-l size] address');return;}winPing(e,ip2n(ip),o.count,o.size);});
// ARP tables
function arpRows(net,d){const c=arpPrune(net,d);return Object.keys(c).map(Number).sort((a,b)=>a-b).map(ip=>{const o=ipOwner(net,ip),i=o&&Object.values(o.ifs).find(x=>x.hsrp&&hsrpVip(net,o,x)===ip),g=i&&i.hsrp.find(g=>g.ip===ip);
  return {ip,ifn:c[ip],mac:g?vmac(i,g):o?macTx(net,o,Object.values(o.ifs).find(x=>x.ip===ip)||Object.values(o.ifs)[0]):'Incomplete'};});}
Cn(EX,'show ip arp',e=>{const d=e.d,rows=[];for(const i of Object.values(d.ifs))if(i.ip!=null&&ifUp(e.net,d,i))rows.push({ip:i.ip,age:'-',mac:macTx(e.net,d,i),ifn:i.name});
  arpRows(e.net,d).forEach(r=>rows.push({...r,age:'0'}));rows.sort((a,b)=>a.ip-b.ip);
  e.out('Protocol  Address          Age (min)  Hardware Addr   Type   Interface',...rows.map(r=>'Internet  '+n2ip(r.ip).padEnd(17)+r.age.padStart(9)+'   '+r.mac.padEnd(16)+'ARPA   '+r.ifn));});
Cn(EX,'show arp',e=>run(e,'show ip arp',e.s.mode));
Cn('priv','clear arp-cache',e=>{e.d.arpc={};});
Cn('pc','arp -a',e=>{const rows=arpRows(e.net,e.d),i=nic(e.d);if(!rows.length){e.out('No ARP Entries Found.');return;}
  e.out('','Interface: '+n2ip(i.ip)+' --- 0x3','  Internet Address      Physical Address      Type',...rows.map(r=>'  '+n2ip(r.ip).padEnd(22)+r.mac.replace(/\./g,'').replace(/(..)(?=.)/g,'$1-').padEnd(22)+'dynamic'),'');});
Cn('pc','arp -d <rest?>',e=>{e.d.arpc={};});
Object.assign(WHYC,{
'ping <ip> <rest>':'Extended ping: repeat sends more echoes and size changes the packet size. A long run of ! shows a stable path; a run that flips between ! and . shows something intermittent. Add source <address or interface> to ping from another of your own addresses, which tests the return route to that network.',
'show ip arp':'Lists the IP-to-MAC mappings this device has learned. A missing or Incomplete entry for the next hop explains why the first ping loses a packet, or why nothing gets through at all.',
'show arp':'Same as show ip arp: the IP-to-MAC mappings this device has learned.',
'clear arp-cache':'Empties the ARP table. The next ping has to resolve every next hop again, which is why its first echo usually times out.',
'arp -a':'Shows the PC\'s ARP cache: the MAC address it learned for each IP on its own subnet, usually just the default gateway and local hosts.',
'arp -d <rest?>':'Clears the PC\'s ARP cache, so the next packet has to ARP for its next hop again.'});
