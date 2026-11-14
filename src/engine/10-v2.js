// ---------- v2 engine ----------
IFT.push('Port-channel');
parseIf=function(str){const m=/^([a-z-]+?)([\d\/.]+)$/i.exec(String(str).replace(/\s+/g,''));if(!m)return null;const t=IFT.find(t=>t.toLowerCase().startsWith(m[1].toLowerCase()));return t?t+m[2]:null;};
function macOf(d){if(d.mac)return d.mac;let h=7;for(const c of d.name)h=(h*31+c.charCodeAt(0))%65536;const x=h.toString(16).padStart(4,'0');return '00e0.b0'+x.slice(0,2)+'.'+x.slice(2)+'10';}
let LIVE=false,TRACE=null,L2LIVE=false,L2WARM=null,L2WARM6=null;
const run0=run;run=function(env,line,mode){const was=LIVE,wl=L2LIVE;LIVE=true;L2LIVE=true;try{run0(env,line,mode);}finally{LIVE=was;L2LIVE=wl;}};
const SUBX='acl,dhcp';
C(SUBX,'end',e=>{e.s.mode='priv';e.s.ctx=null;});
C(SUBX,'exit',e=>{e.s.mode='config';e.s.ctx=null;});
C(SUBX,'do <rest>',e=>run(e,e.args[0],'priv'));

// ACLs
const PORTS={www:80,http:80,https:443,telnet:23,ssh:22,ftp:21,domain:53,smtp:25,tftp:69,bootps:67,bootpc:68,ntp:123,snmp:161,syslog:514};
function addrSpec(t){const a=(t.shift()||'').toLowerCase();if(a==='any')return {net:0,wild:0xFFFFFFFF};if(a==='host'){const h=t.shift()||'';return isIp(h)?{net:ip2n(h),wild:0}:null;}
  if(!isIp(a))return null;if(t.length&&isIp(t[0]))return {net:ip2n(a),wild:ip2n(t.shift())};return {net:ip2n(a),wild:0};}
// Each entry has a sequence number: the next multiple of 10 unless one is given. Entries are kept in sequence order.
function aclAdd(e,name,type,action,rest,seq){const t=rest.trim().split(/\s+/),en={action,proto:'ip',dport:null,text:action+' '+rest.trim(),hits:0};
  if(type==='standard'){en.src=addrSpec(t);if(!en.src||t.length)return e.out(BAD);}
  else{en.proto=(t.shift()||'').toLowerCase();if(!['ip','tcp','udp','icmp'].includes(en.proto))return e.out(BAD);en.src=addrSpec(t);en.dst=addrSpec(t);if(!en.src||!en.dst)return e.out(BAD);
    if(t.length){if(t.shift().toLowerCase()!=='eq'||!t.length)return e.out(BAD);const p=t.shift().toLowerCase();en.dport=PORTS[p]??(/^\d+$/.test(p)?+p:null);if(en.dport===null)return e.out(BAD);}}
  const A=e.d.acls||(e.d.acls={}),acl=A[name]||(A[name]={type,entries:[]});
  if(seq!=null&&acl.entries.some(x=>x.seq===seq))return e.out('% Duplicate sequence number');
  en.seq=seq??(acl.entries.length?Math.floor(Math.max(...acl.entries.map(x=>x.seq||0))/10)*10+10:10);acl.entries.push(en);acl.entries.sort((a,b)=>a.seq-b.seq);}
const hit=(s,ip)=>((ip&~s.wild)>>>0)===((s.net&~s.wild)>>>0);
function aclPermit(d,name,pk){const acl=d.acls&&d.acls[name];if(!acl)return true;
  for(const en of acl.entries){if(en.proto!=='ip'&&en.proto!==pk.proto)continue;if(!hit(en.src,pk.src))continue;if(en.dst&&!hit(en.dst,pk.dst))continue;if(en.dport!=null&&en.dport!==pk.dport)continue;if(LIVE)en.hits++;return en.action==='permit';}
  return false;}
C('config','access-list <n> <w> <rest>',e=>{const[n,a,r]=e.args,w=a.toLowerCase();if(w==='remark')return;const act=['permit','deny'].find(x=>x.startsWith(w));if(!act||n<1||n>199)return e.out(BAD);aclAdd(e,String(n),n<100?'standard':'extended',act,r);},['router']);
C('config','no access-list <n>',e=>{if(e.d.acls)delete e.d.acls[e.args[0]];},['router']);
C('config','ip access-list <w> <w>',e=>{const ty=['standard','extended'].find(x=>x.startsWith(e.args[0].toLowerCase()));if(!ty)return e.out(BAD);const A=e.d.acls||(e.d.acls={});if(!A[e.args[1]])A[e.args[1]]={type:ty,entries:[]};e.s.mode='acl';e.s.ctx=e.args[1];},['router']);
C('acl','permit <rest>',e=>aclAdd(e,e.s.ctx,e.d.acls[e.s.ctx].type,'permit',e.args[0]));
C('acl','deny <rest>',e=>aclAdd(e,e.s.ctx,e.d.acls[e.s.ctx].type,'deny',e.args[0]));
C('acl','remark <rest>',()=>{});
C('if','ip access-group <w> <w>',e=>{const dir=['in','out'].find(x=>x.startsWith(e.args[1].toLowerCase()));if(!dir)return e.out(BAD);e.s.ctx.forEach(i=>{i[dir==='in'?'aclIn':'aclOut']=e.args[0];});},['router']);
C('if','no ip access-group <w> <w>',e=>{const dir=['in','out'].find(x=>x.startsWith(e.args[1].toLowerCase()));e.s.ctx.forEach(i=>{i[dir==='in'?'aclIn':'aclOut']=null;});},['router']);
C('line','access-class <w> <w>',e=>{const dir=['in','out'].find(x=>x.startsWith(e.args[1].toLowerCase()));if(!dir)return e.out(BAD);const l=e.d.lines[e.s.ctx];l.aclClass=e.args[0];l.aclDir=dir;});
C('line','no access-class <w> <w>',e=>{const l=e.d.lines[e.s.ctx];l.aclClass=null;l.aclDir=null;});
// Standard lists print like IOS: a host as a bare address, a range with ", wildcard bits".
const aclLine=(a,en)=>{if(a.type!=='standard')return en.text;const s=en.src;return pad(en.action,6)+' '+(s.wild===0xFFFFFFFF?'any':s.wild===0?n2ip(s.net):n2ip(s.net)+', wildcard bits '+n2ip(s.wild));};
const showAcl=e=>{for(const[n,a]of Object.entries(e.d.acls||{})){e.out((a.type==='standard'?'Standard':'Extended')+' IP access list '+n);a.entries.forEach(en=>e.out('    '+en.seq+' '+aclLine(a,en)+(en.hits?' ('+en.hits+' match'+(en.hits>1?'es':'')+')':'')));}};
C(EX,'show access-lists',showAcl);
C(EX,'show ip access-lists',showAcl);

// NAT
const natOf=d=>d.nat||(d.nat={statics:[],rules:[],table:[]});
C('if','ip nat <w>',e=>{const side=['inside','outside'].find(x=>x.startsWith(e.args[0].toLowerCase()));if(!side)return e.out(BAD);e.s.ctx.forEach(i=>{i.nat=side;});},['router']);
C('if','no ip nat <w>',e=>e.s.ctx.forEach(i=>{i.nat=null;}),['router']);
C('config','ip nat inside source list <w> interface <rest>',e=>{const t=e.args[1].split(/\s+/);const ov=t.length>1&&'overload'.startsWith(t[t.length-1].toLowerCase());if(ov)t.pop();const n=parseIf(t.join(''));if(!n||!e.d.ifs[n])return e.out(BAD);const N=natOf(e.d);N.rules=N.rules.filter(r=>r.acl!==e.args[0]);N.rules.push({acl:e.args[0],ifn:n,overload:ov});},['router']);
C('config','ip nat inside source static <ip> <ip>',e=>{natOf(e.d).statics.push({local:e.args[0],global:e.args[1]});},['router']);
C('config','no ip nat inside source static <ip> <ip>',e=>{const N=natOf(e.d);N.statics=N.statics.filter(s=>!(s.local===e.args[0]&&s.global===e.args[1]));},['router']);
C('config','no ip nat inside source <rest>',e=>{const N=natOf(e.d);N.rules=[];N.statics=[];N.table=[];},['router']);
C(EX,'show ip nat translations',e=>{const N=e.d.nat;if(!N||(!N.table.length&&!N.statics.length&&!(N.dyn||[]).length))return;e.out('Pro  Inside global         Inside local          Outside local         Outside global');
  N.statics.concat((N.dyn||[]).map(m=>({global:m.ig,local:m.il}))).forEach(s=>e.out('---  '+pad(n2ip(s.global),22)+pad(n2ip(s.local),22)+pad('---',22)+'---'));
  // The inside local side keeps the host's own port (or ICMP query ID); the outside shows the translated one for ICMP.
  N.table.forEach(x=>{const lp=x.lport??x.gport,rp=x.proto==='icmp'?x.gport:x.port;
    e.out(pad(x.proto,5)+pad(n2ip(x.ig)+':'+x.gport,22)+pad(n2ip(x.il)+':'+lp,22)+pad(n2ip(x.remote)+':'+rp,22)+n2ip(x.remote)+':'+rp);});},['router']);
C('priv','clear ip nat translation <rest>',e=>{if(e.d.nat){e.d.nat.table=[];e.d.nat.dyn=[];}},['router']);
// Inside to outside. Static first; then the first rule whose ACL permits the source:
//  - interface overload (PAT): every host shares the interface address, told apart by port;
//  - pool overload: the same, sharing the pool's first address;
//  - pool without overload: each host borrows its own pool address (1:1) until the pool runs out.
// Returns a reason string when the packet has to be dropped.
function natOut(d,pk){const N=d.nat;if(!N)return;const st=N.statics.find(s=>s.local===pk.src);if(st){pk.src=st.global;return;}
  for(const r of N.rules){const acl=d.acls&&d.acls[r.acl];if(!acl)continue;const en=acl.entries.find(en=>hit(en.src,pk.src));if(!en||en.action!=='permit')continue;
    const flow=x=>x.il===pk.src&&x.remote===pk.dst&&x.proto===pk.proto&&(x.lport??pk.sport)===pk.sport;
    if(r.pool&&!r.overload){const P=(N.pools||{})[r.pool];if(!P)return;N.dyn=N.dyn||[];let m=N.dyn.find(m=>m.il===pk.src);
      if(!m){const used=new Set(N.dyn.map(m=>m.ig).concat(N.statics.map(s=>s.global)));let g=null;for(let a=P.start;a<=P.end;a++)if(!used.has(a)){g=a;break;}
        if(g===null){if(LIVE)N.misses=(N.misses||0)+1;return 'NAT pool '+r.pool+' has no free address for '+n2ip(pk.src);}m={il:pk.src,ig:g};N.dyn.push(m);}
      if(!N.table.some(flow))N.table.push({il:pk.src,ig:m.ig,remote:pk.dst,proto:pk.proto,port:pk.dport,lport:pk.sport,gport:pk.sport});
      if(LIVE)N.hits=(N.hits||0)+1;pk.src=m.ig;return;}
    const g=r.pool?((N.pools||{})[r.pool]||{}).start:d.ifs[r.ifn].ip;if(g==null)return;let x=N.table.find(flow);
    // PAT keeps the host's own port when it is free on the shared address, otherwise takes the next free one from 1024.
    if(!x){const taken=p=>N.table.some(y=>y.ig===g&&y.proto===pk.proto&&y.gport===p);let gp=pk.sport;if(taken(gp))for(gp=1024;taken(gp);gp++);
      x={il:pk.src,ig:g,remote:pk.dst,proto:pk.proto,port:pk.dport,lport:pk.sport,gport:gp};N.table.push(x);}
    if(LIVE)N.hits=(N.hits||0)+1;pk.src=g;pk.sport=x.gport;return;}}
// Outside to inside: static mappings, then live translations, then a 1:1 pool address still bound to a host.
function natIn(d,pk){const N=d.nat;if(!N)return;const st=N.statics.find(s=>s.global===pk.dst);if(st){pk.dst=st.local;return;}
  const x=N.table.find(x=>x.ig===pk.dst&&x.gport===pk.dport&&x.proto===pk.proto);if(x){pk.dst=x.il;return;}
  const m=(N.dyn||[]).find(m=>m.ig===pk.dst);if(m)pk.dst=m.il;}

// Dynamic ARP Inspection on a Layer 2 path from an ARP sender to its target. On an untrusted port of a switch
// inspecting the VLAN, the sender's IP and MAC must match a DHCP snooping binding (or a static source binding)
// for that VLAN and port. Links between switches and toward routers are normally trusted.
function daiBlock(net,path,sender,ifc){if(!ifc||ifc.ip==null)return null;let vlan=null;
  for(let k=1;k<path.length-1;k++){const sw=net.devs[path[k]];if(sw.type!=='switch')continue;const toS=portTo(net,sw,path[k-1]);if(!toS)continue;
    if(vlan===null){if(toS.mode==='trunk')return null;const prev=net.devs[path[k-1]];vlan=prev.phone&&phoneVlan(net,prev)!=null?phoneVlan(net,prev):toS.accessVlan;}
    const A=sw.dai;if(!A||!A.vlans.includes(vlan)||toS.daiTrust)continue;
    if(!((sw.snoop&&sw.snoop.bind)||[]).some(b=>b.ip===ifc.ip&&b.mac===macOf(sender)&&b.vlan===vlan&&b.ifn===toS.name)){if(LIVE)A.drops=(A.drops||0)+1;
      return {sw:sw.name,text:'ARP from '+n2ip(ifc.ip)+' dropped by Dynamic ARP Inspection on '+sw.hostname+' '+shortIf(toS.name)+': no matching binding'};}
    if(LIVE)A.fwd=(A.fwd||0)+1;}
  return null;}
// packet forwarding with ACL + NAT
function fwd(net,src,pk0){let d=src,inIf=null;const hops=[],pk=Object.assign({},pk0);hops.path=[src.name];
  for(let t=0;t<20;t++){
    if(isL3(d)&&inIf){if(inIf.aclIn&&!aclPermit(d,inIf.aclIn,pk))return {ok:false,hops,blocked:d,reason:'Blocked by ACL '+inIf.aclIn+' inbound on '+shortIf(inIf.name)};if(inIf.nat==='outside')natIn(d,pk);}
    if(ownsIp(net,d,pk.dst))return {ok:true,hops,dest:d,pk};
    if(t>0&&!isL3(d))return {ok:false,hops,reason:'Destination is not a router'};
    const h=nextHop(net,d,pk.dst);if(!h)return {ok:false,hops,reason:'No usable route to '+n2ip(pk.dst)};
    if(pk.src==null)pk.src=h.ifc.ip;
    if(isL3(d)){if(inIf&&inIf.nat==='inside'&&h.ifc.nat==='outside'){const why=natOut(d,pk);if(why)return {ok:false,hops,blocked:d,reason:why};}
      if(t>0&&h.ifc.aclOut&&!aclPermit(d,h.ifc.aclOut,pk))return {ok:false,hops,blocked:d,reason:'Blocked by ACL '+h.ifc.aclOut+' outbound on '+shortIf(h.ifc.name)};}
    const ps=l2peers(net,d,h.ifc);if(ps.storm){if(LIVE)stormLog(net,d,h.ifc,ps.storm);hops.storm=ps.storm;return {ok:false,hops,reason:'Broadcast storm in VLAN '+ps.storm.vlan+': '+ps.storm.sws.join(', ')+' form a loop with no spanning tree'};}let hopIp=h.nh,peer=ps.find(p=>p.ifc.ip===h.nh||hsrpVip(net,p.dev,p.ifc)===h.nh||(p.ifc.nat==='outside'&&p.dev.nat&&p.dev.nat.statics.some(s=>s.global===h.nh)));
    // An exit-interface-only static route ARPs for the destination itself; a router on the segment with a route to it answers (proxy ARP).
    if(!peer&&h.proxy){peer=ps.find(p=>p.dev.type==='router'&&p.ifc.proxyArp!==false&&(x=>!!x&&x.ifc!==p.ifc)(nextHop(net,p.dev,h.nh)));if(peer)hopIp=peer.ifc.ip;}
    if(!peer){if(LIVE&&L2LIVE&&arpPrune(net,d)[h.nh]==null)(hops.l2=hops.l2||[]).push(l2arpLost(net,d,h.ifc,h.nh,ps.edges,hops.path.length-1));
      return {ok:false,hops,reason:'Next hop '+n2ip(h.nh)+' unreachable on '+shortIf(h.ifc.name)+'; check links, VLANs and addressing'};}
    // Dynamic ARP Inspection: both ends' ARP must pass every switch that inspects their VLAN.
    {const why=daiBlock(net,peer.path,d,h.ifc)||daiBlock(net,peer.path.slice().reverse(),peer.dev,peer.ifc);if(why)return {ok:false,hops,blocked:net.devs[why.sw],reason:why.text};}
    // Switches along the way learn the sender's MAC and flood or forward the frame (switching realism block).
    if(LIVE&&L2LIVE)(hops.l2=hops.l2||[]).push(l2frame(net,d,h.ifc,peer,hopIp,hops.path.length-1,ps.edges));
    hops.push(hopIp);hops.path.push(...peer.path.slice(1));d=peer.dev;inIf=peer.ifc;}
  return {ok:false,hops,reason:'Hop limit reached; check for a routing loop'};}
function listens(d,port){if(d.services)return d.services.includes(port);if(d.type==='pc')return false;if(port===123)return !!(d.ntpMaster||(d.ntpServers||[]).length);const v=d.lines.vty,tr=(v.transport||'all').toLowerCase();
  if(port===23)return tr.includes('telnet')||tr==='all';
  if(port===22)return (tr.includes('ssh')||tr==='all')&&!!d.rsa&&!!v.local&&!!(d.users&&d.users.length);return false;}
// access-class on the VTY lines filters who may open a Telnet or SSH session to the device itself; a denied source is refused.
function vtyDenied(d,port,src){if(d.type==='pc'||(port!==22&&port!==23))return false;const v=d.lines.vty;if(!v.aclClass||v.aclDir!=='in')return false;
  return !aclPermit(d,v.aclClass,{src,dst:0,proto:'tcp',dport:port});}
function reach(net,src,dst,proto,dport,srcIp){proto=proto||'icmp';dport=dport||0;const saved=[];for(const n in net.devs){const x=net.devs[n].nat;if(x)saved.push([x,x.table.length,(x.dyn||[]).length]);}
  // An echo request carries a query ID (1) instead of a source port.
  const f=fwd(net,src,{src:srcIp??null,dst,proto,sport:proto==='icmp'?1:50000,dport});let ok=false,refused=false,r=null;
  if(f.ok){if(proto==='tcp'&&(!listens(f.dest,dport)||vtyDenied(f.dest,dport,f.pk.src)))refused=true;else if(f.dest===src)ok=true;
    else{L2WARM=f.hops.l2?f.hops.l2[f.hops.l2.length-1].srcIp:null;r=fwd(net,f.dest,{src:f.pk.dst,dst:f.pk.src,proto,sport:dport,dport:f.pk.sport});L2WARM=null;ok=r.ok&&r.dest===src;}}
  if(!LIVE)saved.forEach(([x,l,m])=>{x.table.length=l;if(x.dyn)x.dyn.length=m;});
  if(LIVE)TRACE={src,f,r,ok,refused};return {ok,refused,f};}
canPing=function(net,src,dst){return reach(net,src,dst).ok;};
tracePath=function(net,src,dst){return fwd(net,src,{src:null,dst,proto:'icmp',sport:50000,dport:0});};
const FAILMSG=r=>r.refused?'% Connection refused by remote host':'% Connection timed out; remote host not responding';
C('pc,user,priv','telnet <ip> <rest?>',e=>{const p=/^\d+$/.test(e.args[1])?+e.args[1]:23,r=reach(e.net,e.d,e.args[0],'tcp',p),tl='Trying '+n2ip(e.args[0])+(p===23?'':', '+p)+' ...';
  if(r.ok)e.out(tl+' Open','['+(p===23?'Telnet':'TCP port '+p)+' connection to '+r.f.dest.hostname+' works. Session closed.]');else e.out(tl,FAILMSG(r));});
C('pc,user,priv','ssh -l <w> <ip>',e=>{const r=reach(e.net,e.d,e.args[1],'tcp',22);if(!r.ok)return e.out(FAILMSG(r));const u=(r.f.dest.users||[]).find(u=>u.name===e.args[0]);
  e.out('Password:',u?'[SSH login to '+r.f.dest.hostname+' as '+u.name+' works. Session closed.]':'% Authentication failed.');});

// DHCP
const dhcpOf=d=>d.dhcp||(d.dhcp={excluded:[],pools:{},bindings:[]});
C('config','ip dhcp excluded-address <ip> <rest?>',e=>{const hi=isIp(e.args[1])?ip2n(e.args[1]):e.args[0];dhcpOf(e.d).excluded.push([e.args[0],hi]);},['router']);
C('config','ip dhcp pool <w>',e=>{const D=dhcpOf(e.d);if(!D.pools[e.args[0]])D.pools[e.args[0]]={net:null,len:null,gw:null,dns:null};e.s.mode='dhcp';e.s.ctx=e.args[0];},['router']);
C('dhcp','network <ip> <ip>',e=>{const len=maskLenN(e.args[1]);if(len===null)return e.out(BAD);const p=e.d.dhcp.pools[e.s.ctx];p.net=netOf(e.args[0],len);p.len=len;});
C('dhcp','default-router <ip>',e=>{e.d.dhcp.pools[e.s.ctx].gw=e.args[0];});
C('dhcp','dns-server <ip>',e=>{e.d.dhcp.pools[e.s.ctx].dns=e.args[0];});
C('dhcp','lease <rest>',()=>{});
C('dhcp','domain-name <w>',()=>{});
C('if','ip helper-address <ip>',e=>e.s.ctx.forEach(i=>{i.helper=e.args[0];}),['router']);
C(EX,'show ip dhcp binding',e=>{e.out('IP address       Hardware address    Lease expiration     Type');((e.d.dhcp||{}).bindings||[]).forEach(b=>e.out(pad(n2ip(b.ip),17)+pad(b.mac,20)+pad('23 hours',21)+'Automatic'));},['router']);
function dhcpOffer(net,S,gi,pc,dry){const D=S.dhcp;if(!D)return null;const pool=Object.values(D.pools).find(p=>p.net!==null&&netOf(gi,p.len)===p.net);if(!pool)return null;
  let b=D.bindings.find(b=>b.client===pc.name&&netOf(b.ip,pool.len)===pool.net);
  if(!b){const used=new Set(D.bindings.map(b=>b.ip));const bc=(pool.net|~lenMask(pool.len))>>>0;
    for(let ip=pool.net+1;ip<bc;ip++){if(used.has(ip)||D.excluded.some(([lo,hi])=>ip>=lo&&ip<=hi))continue;b={ip,client:pc.name,mac:macOf(pc)};if(!dry)D.bindings.push(b);break;}}
  return b?{ip:b.ip,len:pool.len,gw:pool.gw,dns:pool.dns,server:S}:null;}
// The port on a switch that leads to the named neighbour device.
const portTo=(net,sw,name)=>Object.values(sw.ifs).find(x=>x.link&&x.link.dev===name&&ifUp(net,sw,x));
// DHCP snooping along a Layer 2 path from the client to the device answering it. Server messages arriving on an
// untrusted port of a snooping switch are dropped; the switch also inserts option 82 unless told not to.
function snoopPath(net,path){let vlan=null,opt82=false,sws=[];
  for(let k=1;k<path.length-1;k++){const sw=net.devs[path[k]];if(sw.type!=='switch')continue;const toC=portTo(net,sw,path[k-1]),toS=portTo(net,sw,path[k+1]);
    if(vlan===null&&toC&&toC.mode!=='trunk'){const prev=net.devs[path[k-1]];vlan=prev.phone&&phoneVlan(net,prev)!=null?phoneVlan(net,prev):toC.accessVlan;}
    const sn=sw.snoop;if(!sn||!sn.on||vlan===null||!sn.vlans.includes(vlan))continue;
    if(!toS||!toS.snoopTrust)return {blocked:sw,vlan};sws.push({sw,port:toC,vlan});if(sn.opt82!==false)opt82=true;}
  return {blocked:null,opt82,sws,vlan};}
// Every DHCP server that can answer the client: a router or L3 switch on the segment (its own pool, or a relay to a
// remote server) and any host running a DHCP service. The nearest answer wins, as the first offer would.
function dhcpCandidates(net,pc){const i=nic(pc),out=[];
  for(const p of l2peers(net,pc,i)){const sp=snoopPath(net,p.path);if(sp.blocked)continue;
    if(isL3(p.dev)&&p.ifc.ip!==null){
      // An IOS server or relay drops a request carrying option 82 with no relay address unless told to trust it.
      if(sp.opt82&&!p.dev.relayTrustAll&&!p.ifc.relayTrust)continue;
      if(p.ifc.aclIn&&!aclPermit(p.dev,p.ifc.aclIn,{src:0,dst:0xFFFFFFFF,proto:'udp',sport:68,dport:67}))continue;
      let o=dhcpOffer(net,p.dev,p.ifc.ip,pc,true),S=p.dev;
      if(!o&&p.ifc.helper!=null){S=Object.values(net.devs).find(x=>isL3(x)&&ownsIp(net,x,p.ifc.helper));if(S&&reach(net,p.dev,p.ifc.helper).ok&&reach(net,S,p.ifc.ip).ok)o=dhcpOffer(net,S,p.ifc.ip,pc,true);}
      if(o)out.push({o,S,gi:p.ifc.ip,p,sp});}
    else if(p.dev.dhcpServe&&p.dev.services&&p.dev.services.includes(67)){const R=p.dev.dhcpServe;R.leases=R.leases||{};let ip=R.leases[pc.name];
      if(ip==null){const used=new Set(Object.values(R.leases));for(let a=R.start;a<=R.end;a++)if(!used.has(a)){ip=a;break;}}
      if(ip!=null)out.push({o:{ip,len:R.len,gw:R.gw,dns:R.dns,server:p.dev},S:p.dev,rogue:true,p,sp});}}
  out.sort((a,b)=>a.p.path.length-b.p.path.length||(b.rogue?1:0)-(a.rogue?1:0));return out;}
function dhcpRenew(net,pc){const i=nic(pc);i.ip=null;dropSnoopBindings(net,pc);
  const c=dhcpCandidates(net,pc)[0];if(!c)return null;let o=c.o;
  if(c.rogue)c.S.dhcpServe.leases[pc.name]=o.ip;else o=dhcpOffer(net,c.S,c.gi,pc);
  i.ip=o.ip;i.len=o.len;pc.gw=o.gw;
  for(const {sw,port,vlan} of c.sp.sws)(sw.snoop.bind||(sw.snoop.bind=[])).push({mac:macOf(pc),ip:o.ip,vlan,ifn:port.name,client:pc.name});
  return o;}
function dropSnoopBindings(net,pc){for(const d of Object.values(net.devs))if(d.snoop&&d.snoop.bind)d.snoop.bind=d.snoop.bind.filter(b=>b.client!==pc.name);}
C('pc','ipconfig /renew',e=>{const o=dhcpRenew(e.net,e.d);if(!o)return e.out('DHCP request failed: no DHCP server answered.');e.out('Lease obtained from '+o.server.hostname+'.','   IPv4 Address. . . : '+n2ip(o.ip),'   Subnet Mask . . . : '+n2ip(lenMask(o.len)),'   Default Gateway . : '+(o.gw!=null?n2ip(o.gw):'(none)'));});
C('pc','ipconfig /release',e=>{nic(e.d).ip=null;e.d.gw=null;dropSnoopBindings(e.net,e.d);});

// Port security
const psOf=i=>i.ps||(i.ps={on:false,max:1,violation:'shutdown',sticky:false});
C('if','switchport port-security',e=>{for(const i of e.s.ctx){if(!i.modeSet)return e.out('Command rejected: '+shortIf(i.name)+' is a dynamic port.');psOf(i).on=true;}},['switch']);
C('if','switchport port-security maximum <n>',e=>e.s.ctx.forEach(i=>{psOf(i).max=e.args[0];}),['switch']);
C('if','switchport port-security violation <w>',e=>{const v=['shutdown','restrict','protect'].find(x=>x.startsWith(e.args[0].toLowerCase()));if(!v)return e.out(BAD);e.s.ctx.forEach(i=>{psOf(i).violation=v;});},['switch']);
// Turning sticky on converts addresses already learned into sticky ones.
C('if','switchport port-security mac-address sticky',e=>e.s.ctx.forEach(i=>{const P=psOf(i);P.sticky=true;(P.macs||[]).forEach(m=>{if(m.kind==='dynamic')m.kind='sticky';});}),['switch']);
C(EX,'show port-security <rest?>',e=>{const{net,d,out}=e,rest=(e.args[0]||'').trim();
  if(/^int/i.test(rest)){const n=parseIf(rest.split(/\s+/).slice(1).join(''));const i=n&&d.ifs[n];if(!i)return out(BAD);const P=i.ps||{on:false,max:1,violation:'shutdown',sticky:false};
    return out('Port Security              : '+(P.on?'Enabled':'Disabled'),'Port Status                : '+(!P.on?'Secure-down':i.errdis==='psecure-violation'?'Secure-shutdown':ifUp(net,d,i)?'Secure-up':'Secure-down'),'Violation Mode             : '+P.violation[0].toUpperCase()+P.violation.slice(1),'Aging Time                 : 0 mins','Aging Type                 : Absolute','SecureStatic Address Aging : Disabled',
      'Maximum MAC Addresses      : '+P.max,'Total MAC Addresses        : '+(P.macs||[]).length,'Configured MAC Addresses   : '+(P.macs||[]).filter(m=>m.kind==='static').length,'Sticky MAC Addresses       : '+(P.macs||[]).filter(m=>m.kind==='sticky').length,'Last Source Address:Vlan   : '+(P.last?P.last+':'+i.accessVlan:'0000.0000.0000:0'),'Security Violation Count   : '+(P.viol||0));}
  if(/^addr/i.test(rest)){out('               Secure Mac Address Table','-----------------------------------------------------------------------------','Vlan    Mac Address       Type                          Ports   Remaining Age','----    -----------       ----                          -----   -------------');
    for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];for(const m of (i.ps&&i.ps.on&&i.ps.macs)||[])out(pad(i.accessVlan,8)+pad(m.mac,18)+pad(m.kind==='sticky'?'SecureSticky':m.kind==='static'?'SecureConfigured':'SecureDynamic',30)+pad(shortIf(n),8)+'  -');}return;}
  out('Secure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action','               (Count)       (Count)          (Count)','---------------------------------------------------------------------------');
  for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];if(!i.ps||!i.ps.on)continue;
    out(pad('    '+shortIf(n),13)+pad(String(i.ps.max).padStart(8),15)+pad(String((i.ps.macs||[]).length).padStart(7),13)+pad(String(i.ps.viol||0).padStart(10),19)+i.ps.violation[0].toUpperCase()+i.ps.violation.slice(1));}
  out('---------------------------------------------------------------------------');},['switch']);

// SSH
C('config','ip domain-name <w>',e=>{e.d.domain=e.args[0];});
C('config','username <w> <rest>',e=>{const t=e.args[1].split(/\s+/);let priv=1;if(t.length>=4&&'privilege'.startsWith(t[0].toLowerCase())){priv=+t[1];t.splice(0,2);}
  const kind=['secret','password'].find(x=>x.startsWith(t[0].toLowerCase()));if(!kind||!t[1])return e.out(BAD);const U=e.d.users||(e.d.users=[]),u=U.find(u=>u.name===e.args[0]);
  if(u)Object.assign(u,{priv,kind,pw:t[1]});else U.push({name:e.args[0],priv,kind,pw:t[1]});});
C('config','crypto key generate rsa <rest?>',e=>{if(!e.d.domain)return e.out('% Please define a domain-name first.');const m=/(\d+)/.exec(e.args[0]||''),bits=m?+m[1]:2048;e.d.rsa=bits;
  e.out('The name for the keys will be: '+e.d.hostname+'.'+e.d.domain,'% Generating '+bits+' bit RSA keys, keys will be non-exportable...[OK]');});
C('config','ip ssh version <n>',e=>{if(!e.d.rsa)return e.out('Please create RSA keys to enable SSH.');e.d.sshv=e.args[0];});
C('line','login local',e=>{const l=e.d.lines[e.s.ctx];l.login=true;l.local=true;});
C(EX,'show ip ssh',e=>e.out(e.d.rsa?'SSH Enabled - version '+(e.d.sshv===2?'2.0':'1.99'):'SSH Disabled - version 1.99'));

// CDP
// A neighbor appears only when both ends run CDP globally and on that interface. Hosts do not send CDP here.
const cdpOn=(d,i)=>(d.type!=='pc'||!!d.phone)&&d.cdp!==false&&i.cdp!==false;
const cdpCap=p=>p.phone?'H P M':p.type==='router'?'R B S I':p.l3?'R S I':'S I',cdpPlat=p=>p.phone?'IP Phone':p.type==='router'?'ISR4321':p.l3?'WS-C3560':'WS-C2960';
// The voice VLAN a phone uses: the one its switch port advertises over CDP, or none (untagged, so the data VLAN).
function phoneVlan(net,d){const up=d.ifs.FastEthernet0;if(!up||!up.link)return null;const sw=net.devs[up.link.dev],sp=sw.ifs[up.link.ifn];
  return sw.type==='switch'&&sp.voiceVlan!=null&&sp.mode!=='trunk'&&cdpOn(sw,sp)&&cdpOn(d,up)?sp.voiceVlan:null;}
function cdpPeers(net,d){const r=[];for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];if(!i.link||!ifUp(net,d,i)||!cdpOn(d,i))continue;
  const p=net.devs[i.link.dev],pi=p.ifs[i.link.ifn];if(cdpOn(p,pi))r.push({i,p,pi});}return r;}
const CDPCAPS=['Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge','                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone,','                  D - Remote, C - CVTA, M - Two-port Mac Relay',''];
C(EX,'show cdp neighbors',e=>{const{net,d,out}=e;if(d.cdp===false)return out('% CDP is not enabled');const ps=cdpPeers(net,d);out(...CDPCAPS,'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID');
  ps.forEach(({i,p,pi})=>out(pad(p.cdpId||p.hostname,17)+pad(shortIf(i.name),18)+pad(150,11)+pad(cdpCap(p),12)+pad(cdpPlat(p),10)+(p.phone?'Port 1':shortIf(pi.name))));
  out('','Total cdp entries displayed : '+ps.length);});
C(EX,'show cdp neighbors detail',e=>{const{net,d,out}=e;if(d.cdp===false)return out('% CDP is not enabled');const ps=cdpPeers(net,d);
  ps.forEach(({i,p,pi})=>{const mgmt=p.phone?nic(p).ip:p.type==='router'?(pi.ip!==null?pi.ip:(Object.values(p.ifs).find(x=>x.ip!==null)||{}).ip):(Object.values(p.ifs).find(x=>x.name.startsWith('Vlan')&&x.ip!==null&&ifUp(net,p,x))||{}).ip;
    out('-------------------------','Device ID: '+(p.cdpId||p.hostname),'Entry address(es): ',...(mgmt!=null?['  IP address: '+n2ip(mgmt)]:[]),'Platform: '+(p.phone?'Cisco IP Phone 8845':'cisco '+(p.type==='router'?'ISR4321/K9':p.l3?'WS-C3560-24PS':'WS-C2960-24TT-L'))+',  Capabilities: '+(p.phone?'Host Phone Two-port Mac Relay':p.type==='router'?'Router Source-Route-Bridge Switch IGMP':'Switch IGMP'),
      'Interface: '+i.name+',  Port ID (outgoing port): '+(p.phone?'Port 1':pi.name),'Holdtime : 150 sec','','Version :',p.phone?'sip88xx.14-1-1-0001-136':'Cisco IOS Software, '+(p.type==='router'?'ISR Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 16.9.4':'C2960 Software (C2960-LANBASEK9-M), Version 15.2(7)E2'),'','advertisement version: 2',...(p.type==='switch'&&pi.mode==='trunk'?['Native VLAN: '+pi.native]:[]),'Duplex: full','');});
  out('','Total cdp entries displayed : '+ps.length);});
C(EX,'show cdp',e=>e.out(...(e.d.cdp===false?['% CDP is not enabled']:['Global CDP information:','\tSending CDP packets every 60 seconds','\tSending a holdtime value of 180 seconds','\tSending CDPv2 advertisements is  enabled'])));
C('config','cdp run',e=>{e.d.cdp=true;});
C('config','no cdp run',e=>{e.d.cdp=false;});
C('if','cdp enable',e=>e.s.ctx.forEach(i=>{i.cdp=true;}));
C('if','no cdp enable',e=>e.s.ctx.forEach(i=>{i.cdp=false;}));

// Spanning tree
const stpOf=d=>d.stp||(d.stp={prio:{},mode:'pvst'});
const stpOff=(d,v)=>!!(d.stp&&d.stp.off&&d.stp.off[v]);
const stpPrio=(sw,v)=>((sw.stp&&sw.stp.prio[v])??32768)+v;
const bid=(sw,v)=>String(stpPrio(sw,v)).padStart(6,'0')+macOf(sw);
// Spanning tree per VLAN. Bundled EtherChannel members count as their port-channel (one STP port, the cost of the
// combined bandwidth), as on a real switch. Switches that cannot hear each other each elect their own root.
function stpCalc(net,v){const sws=Object.values(net.devs).filter(d=>d.type==='switch'&&d.vlans[v]&&!stpOff(d,v));
  if(!sws.length)return Object.values(net.devs).some(d=>d.type==='switch'&&d.vlans[v])?{root:null,info:{}}:null;
  const carries=(sw,p)=>!!p.link&&!p.routed&&ifUp(net,sw,p)&&(p.mode==='trunk'?allowed(p,v):p.accessVlan===v||p.voiceVlan===v);
  // IEEE short path costs by the speed the link actually runs at (a forced speed counts): 10 Mb/s 100, 100 Mb/s 19,
  // 1000 Mb/s 4; a two-link bundle 12 (100) or 3 (1000).
  // (labs built while the page loads compute STP before the duplex block exists, so fall back to the port type then)
  const cost=(sw,p,n)=>{let sp=p.name.startsWith('Gig')?1000:100;try{if(p.link)sp=+linkSettle(net,sw,p).speed;}catch(e){}return sp>=1000?(n>1?3:4):sp>=100?(n>1?12:19):(n>1?56:100);};
  // The STP ports of a switch: each physical port that is not a bundled member, plus each port-channel with bundled members.
  const stpPorts=sw=>{const r=[];for(const n of sortIfs(Object.keys(sw.ifs))){const p=sw.ifs[n];
      if(n.startsWith('Port-channel')){const ms=members(sw,p).filter(m=>bundled(net,sw,m));if(ms.length&&carries(sw,ms[0]))r.push({p,name:n,nb:ms[0].link.dev,cost:cost(sw,ms[0],ms.length)});continue;}
      if(p.chan&&bundled(net,sw,p))continue;
      if(carries(sw,p))r.push({p,name:n,nb:through(sw,p),cost:cost(sw,p,1)});}
    return r;};
  // follow a chain of switches with STP off for this VLAN until an STP switch (possibly this one) or a dead end
  function through(sw,p){const q=[[net.devs[p.link.dev],p.link.ifn]],been=new Set([sw.name]);
    while(q.length){const [nb,inIfn]=q.shift();if(nb.type!=='switch'||!nb.vlans[v])continue;if(!stpOff(nb,v))return nb.name;if(been.has(nb.name))continue;been.add(nb.name);
      for(const x of Object.values(nb.ifs)){if(x.name===inIfn||!x.link||x.routed||x.name.startsWith('Vlan')||!ifUp(net,nb,x)||!(x.mode==='trunk'?allowed(x,v):x.accessVlan===v||x.voiceVlan===v))continue;const y=net.devs[x.link.dev];if(y.type!=='switch'||!y.vlans[v])continue;if(!stpOff(y,v))return y.name;if(!been.has(y.name))q.push([y,x.link.ifn]);}}
    return p.link.dev;}
  // Only switches that run STP for this VLAN are neighbours in the tree. A port whose chain of STP-off switches
  // dead-ends (through() returns an STP-off switch) leads to no bridge, so it is treated like an edge port.
  const ports=new Map(sws.map(s=>[s.name,stpPorts(s)])),isSw=n=>ports.has(n);
  // Connected groups of switches; each group elects the lowest bridge ID it can hear as its root.
  const comp=new Map();
  for(const s of sws){if(comp.has(s.name))continue;const grp=[s];comp.set(s.name,null);
    for(let k=0;k<grp.length;k++)for(const x of ports.get(grp[k].name))if(isSw(x.nb)&&!comp.has(x.nb)){comp.set(x.nb,null);grp.push(net.devs[x.nb]);}
    const r=grp.reduce((a,b)=>bid(a,v)<bid(b,v)?a:b);grp.forEach(g=>comp.set(g.name,r));}
  const root=sws.reduce((a,b)=>bid(a,v)<bid(b,v)?a:b);
  const dist=new Map();
  for(const r of new Set(comp.values())){dist.set(r.name,0);const todo=new Set(sws.filter(s=>comp.get(s.name)===r).map(s=>s.name));
    while(todo.size){let u=null;for(const n of todo)if(dist.has(n)&&(u===null||dist.get(n)<dist.get(u)))u=n;if(u===null)break;todo.delete(u);
      for(const x of ports.get(u)){if(!isSw(x.nb))continue;const c=dist.get(u)+x.cost;if(!dist.has(x.nb)||c<dist.get(x.nb))dist.set(x.nb,c);}}}
  const key=sw=>String(dist.get(sw.name)).padStart(6,'0')+bid(sw,v),info={};
  for(const sw of sws){const mine={};let rp=null,best=null;const myRoot=comp.get(sw.name);
    if(sw!==myRoot&&dist.has(sw.name))for(const x of ports.get(sw.name)){if(!isSw(x.nb)||!dist.has(x.nb))continue;
      const k=String(dist.get(x.nb)+x.cost).padStart(6,'0')+bid(net.devs[x.nb],v);if(best===null||k<best){best=k;rp=x.p;}}
    const selfLoop=ports.get(sw.name).filter(x=>x.nb===sw.name);
    for(const x of ports.get(sw.name)){const nb=net.devs[x.nb];let role='Desg';
      if(x.p===rp)role='Root';else if(x.nb===sw.name){if(selfLoop.indexOf(x)>0)role='Altn';}else if(isSw(x.nb)&&dist.has(nb.name)&&dist.has(sw.name)&&key(sw)>key(nb))role='Altn';
      mine[x.name]={role,cost:x.cost};}
    info[sw.name]={ports:mine,rp,cost:dist.get(sw.name),root:myRoot};}
  return {root,info};}
C('config','spanning-tree vlan <w> priority <n>',e=>{const vl=parseVlanList(e.args[0]);if(!vl)return e.out(BAD);if(e.args[1]%4096||e.args[1]>61440)return e.out('% Bridge Priority must be in increments of 4096.','% Allowed values are: 0 4096 8192 12288 ... 61440');vl.forEach(v=>{stpOf(e.d).prio[v]=e.args[1];});},['switch']);
// root primary is a macro: 24576, or 4096 below the current root if 24576 would not win. secondary is always 28672.
C('config','spanning-tree vlan <w> root <w>',e=>{const vl=parseVlanList(e.args[0]),w=e.args[1].toLowerCase(),prim='primary'.startsWith(w);if(!vl||(!prim&&!'secondary'.startsWith(w)))return e.out(BAD);
  for(const v of vl){let p=prim?24576:28672;if(prim&&e.d.vlans[v]){const r=stpCalc(e.net,v);if(r&&r.root&&r.root!==e.d&&String(24576+v).padStart(6,'0')+macOf(e.d)>bid(r.root,v))p=Math.max(0,stpPrio(r.root,v)-v-4096);}stpOf(e.d).prio[v]=p;}},['switch']);
C('config','no spanning-tree vlan <w>',e=>{const vl=parseVlanList(e.args[0]);if(!vl)return e.out(BAD);const S=stpOf(e.d);S.off=S.off||{};vl.forEach(v=>{S.off[v]=true;});},['switch']);
C('config','spanning-tree vlan <w>',e=>{const vl=parseVlanList(e.args[0]);if(!vl)return e.out(BAD);const S=stpOf(e.d);if(S.off)vl.forEach(v=>{delete S.off[v];});},['switch']);
C('config','spanning-tree mode <w>',e=>{const m=['pvst','rapid-pvst'].find(x=>x.startsWith(e.args[0].toLowerCase()));if(!m)return e.out(BAD);stpOf(e.d).mode=m;},['switch']);
C('if','spanning-tree portfast',e=>{e.s.ctx.forEach(i=>{i.portfast=true;});e.out('%Warning: portfast should only be enabled on ports connected to a single host.');},['switch']);
C('if','spanning-tree bpduguard enable',e=>e.s.ctx.forEach(i=>{i.bpduguard=true;}),['switch']);
C(EX,'show spanning-tree <rest?>',e=>{const{net,d,out}=e,m=/(\d+)/.exec(e.args[0]||''),vl=m?[+m[1]]:Object.keys(d.vlans).map(Number);
  for(const v of vl){if(!d.vlans[v]||stpOff(d,v)){if(m)out('Spanning tree instance(s) for vlan '+v+' does not exist.');continue;}const r=stpCalc(net,v),me=r.info[d.name],rt=me.root;
    out('VLAN'+String(v).padStart(4,'0'),'  Spanning tree enabled protocol '+(d.stp&&d.stp.mode==='rapid-pvst'?'rstp':'ieee'),'  Root ID    Priority    '+stpPrio(rt,v),'             Address     '+macOf(rt));
    if(rt===d)out('             This bridge is the root');else out('             Cost        '+me.cost,'             Port        '+(me.rp?shortIf(me.rp.name):'-'));
    out('','  Bridge ID  Priority    '+stpPrio(d,v)+'  (priority '+(stpPrio(d,v)-v)+' sys-id-ext '+v+')','             Address     '+macOf(d),'','Interface           Role Sts Cost      Type','------------------- ---- --- --------- ----');
    for(const[n,p]of Object.entries(me.ports))out(pad(shortIf(n),20)+pad(p.role,5)+pad(p.role==='Altn'?'BLK':'FWD',4)+pad(p.cost,10)+(d.ifs[n].portfast?'P2p Edge':'P2p'));out('');}},['switch']);

// EtherChannel
const CH={on:['on'],active:['active','passive'],passive:['active'],desirable:['desirable','auto'],auto:['desirable']};
const ifUp0=ifUp;
const members=(d,po)=>Object.values(d.ifs).filter(p=>p.chan===+po.name.slice(12));
const bundled=(net,d,p)=>{if(!p.chan||!p.link||!ifUp0(net,d,p))return false;const q=net.devs[p.link.dev].ifs[p.link.ifn];return !!q.chan&&CH[p.chanMode].includes(q.chanMode);};
ifUp=function(net,d,i){return i.name.startsWith('Port-channel')?members(d,i).some(p=>bundled(net,d,p)):ifUp0(net,d,i);};
C('if','channel-group <n> mode <w>',e=>{const m=Object.keys(CH).find(x=>x.startsWith(e.args[1].toLowerCase()));if(!m)return e.out(BAD);const n='Port-channel'+e.args[0];
  if(!e.d.ifs[n]){addIf(e.d,n);e.out('Creating a port-channel interface Port-channel '+e.args[0]);}e.s.ctx.forEach(i=>{i.chan=e.args[0];i.chanMode=m;});},['switch']);
{const c=CMDS.find(c=>c.pat.join(' ')==='interface <rest>'),f0=c.fn;c.fn=e=>{const n=parseIf(e.args[0]);
  if(n&&/^Port-channel\d+$/.test(n)&&e.d.type==='switch'){if(!e.d.ifs[n])addIf(e.d,n);e.s.mode='if';e.s.ctx=[e.d.ifs[n],...members(e.d,e.d.ifs[n])];return;}f0(e);};}
C(EX,'show etherchannel summary',e=>{const{net,d,out}=e;out('Flags:  D - down        P - bundled in port-channel','        I - stand-alone S - Layer2      U - in use','','Group  Port-channel  Protocol    Ports','------+-------------+-----------+----------------------------------');
  for(const n of sortIfs(Object.keys(d.ifs))){if(!n.startsWith('Port-channel'))continue;const po=d.ifs[n],ms=members(d,po),md=ms[0]?ms[0].chanMode:'';
    out(pad(n.slice(12),7)+pad('Po'+n.slice(12)+(ifUp(net,d,po)?'(SU)':'(SD)'),14)+pad(md==='on'?'-':['active','passive'].includes(md)?'LACP':'PAgP',12)+ms.map(p=>shortIf(p.name)+(bundled(net,d,p)?'(P)':ifUp0(net,d,p)?'(I)':'(D)')).join(' '));}},['switch']);

// prompt + running-config extensions
const prompt0=promptOf;promptOf=function(d,s){const h=d.hostname;if(s.mode==='acl')return h+(d.acls[s.ctx].type==='standard'?'(config-std-nacl)#':'(config-ext-nacl)#');if(s.mode==='dhcp')return h+'(dhcp-config)#';
  if(s.mode==='if'&&s.ctx[0].name.startsWith('Port-channel'))return h+'(config-if)#';return prompt0(d,s);};
function ifExtra(i,d0){const L=[];if(i.helper!=null)L.push(' ip helper-address '+n2ip(i.helper));if(i.aclIn)L.push(' ip access-group '+i.aclIn+' in');if(i.aclOut)L.push(' ip access-group '+i.aclOut+' out');if(i.nat)L.push(' ip nat '+i.nat);
  if(i.chan)L.push(' channel-group '+i.chan+' mode '+i.chanMode);
  if(i.ps&&i.ps.on){L.push(' switchport port-security');if(i.ps.max!==1)L.push(' switchport port-security maximum '+i.ps.max);if(i.ps.violation!=='shutdown')L.push(' switchport port-security violation '+i.ps.violation);if(i.ps.sticky)L.push(' switchport port-security mac-address sticky');for(const m of i.ps.macs||[])if(m.kind!=='dynamic')L.push(' switchport port-security mac-address '+(m.kind==='sticky'?'sticky ':'')+m.mac);}
  if(i.portfast)L.push(' spanning-tree portfast');if(i.bpduguard)L.push(' spanning-tree bpduguard enable');if(i.cdp===false)L.push(' no cdp enable');if(i.proxyArp===false)L.push(' no ip proxy-arp');if(i.voiceVlan!=null)L.push(' switchport voice vlan '+i.voiceVlan);if(i.snoopRate)L.push(' ip dhcp snooping limit rate '+i.snoopRate);if(i.daiTrust)L.push(' ip arp inspection trust');if(i.snoopTrust)L.push(' ip dhcp snooping trust');if(i.relayTrust)L.push(' ip dhcp relay information trusted');if(i.lldpTx===false)L.push(' no lldp transmit');if(i.lldpRx===false)L.push(' no lldp receive');
  if(i.hsrpV2)L.push(' standby version 2');for(const g of i.hsrp||[]){if(g.ip!=null)L.push(' standby '+g.grp+' ip '+n2ip(g.ip));if(g.prio!==100)L.push(' standby '+g.grp+' priority '+g.prio);if(g.preempt)L.push(' standby '+g.grp+' preempt');}
  if(i.ospfNet)L.push(' ip ospf network '+i.ospfNet);if(i.ospfPrio!=null)L.push(' ip ospf priority '+i.ospfPrio);if(i.ospfCost!=null)L.push(' ip ospf cost '+i.ospfCost);if(i.ospfHello)L.push(' ip ospf hello-interval '+i.ospfHello);if(i.ospfDead)L.push(' ip ospf dead-interval '+i.ospfDead);if(i.ospfArea!=null&&d0.ospf)L.push(' ip ospf '+d0.ospf.pid+' area '+i.ospfArea);return L;}
function globalExtra(d){const L=[];
  if(d.tz)L.push('clock timezone '+d.tz.name+' '+d.tz.off);if(d.cdp===false)L.push('no cdp run');if(d.lldp&&d.type!=='pc')L.push('lldp run');
  (d.users||[]).forEach(u=>L.push('username '+u.name+(u.priv>1?' privilege '+u.priv:'')+(u.kind==='secret'?' secret 5 $1$mERr$9cTjUIEqNGurQiFU.ZeCi1':' password '+pwText(d,u.pw))));
  if(d.domain)L.push('ip domain-name '+d.domain);if(d.sshv)L.push('ip ssh version '+d.sshv);
  if(d.stp){if(d.stp.mode!=='pvst')L.push('spanning-tree mode '+d.stp.mode);for(const v in d.stp.off||{})if(d.stp.off[v])L.push('no spanning-tree vlan '+v);if(d.stp.bpduDefault)L.push('spanning-tree portfast bpduguard default');for(const v in d.stp.prio)L.push('spanning-tree vlan '+v+' priority '+d.stp.prio[v]);}
  if(d.dhcp){d.dhcp.excluded.forEach(([a,b])=>L.push('ip dhcp excluded-address '+n2ip(a)+(b!==a?' '+n2ip(b):'')));
    for(const[n,p]of Object.entries(d.dhcp.pools)){L.push('ip dhcp pool '+n);if(p.net!==null)L.push(' network '+n2ip(p.net)+' '+n2ip(lenMask(p.len)));if(p.gw!=null)L.push(' default-router '+n2ip(p.gw));if(p.dns!=null)L.push(' dns-server '+n2ip(p.dns));for(const[o,v] of Object.entries(p.opts||{}))L.push(' option '+o+' ip '+n2ip(v));}}
  if(d.nat){d.nat.statics.forEach(s=>L.push('ip nat inside source static '+n2ip(s.local)+' '+n2ip(s.global)));for(const[n,P] of Object.entries(d.nat.pools||{}))L.push('ip nat pool '+n+' '+n2ip(P.start)+' '+n2ip(P.end)+' netmask '+n2ip(lenMask(P.len)));d.nat.rules.forEach(r=>L.push('ip nat inside source list '+r.acl+(r.pool?' pool '+r.pool:' interface '+r.ifn)+(r.overload?' overload':'')));}
  for(const[n,a]of Object.entries(d.acls||{})){if(/^\d+$/.test(n))a.entries.forEach(en=>L.push('access-list '+n+' '+en.text));else{L.push('ip access-list '+a.type+' '+n);a.entries.forEach(en=>L.push(' '+en.text));}}
  if(d.snoop&&d.snoop.on){if(d.snoop.vlans.length)L.push('ip dhcp snooping vlan '+d.snoop.vlans.join(','));if(d.snoop.opt82===false)L.push('no ip dhcp snooping information option');L.push('ip dhcp snooping');}
  if(d.relayTrustAll)L.push('ip dhcp relay information trust-all');
  if(d.dai&&d.dai.vlans.length)L.push('ip arp inspection vlan '+d.dai.vlans.join(','));((d.snoop&&d.snoop.bind)||[]).filter(b=>b.static).forEach(b=>L.push('ip source binding '+b.mac+' vlan '+b.vlan+' '+n2ip(b.ip)+' interface '+b.ifn));
  if(d.trapLevel!=null&&d.trapLevel!==6)L.push('logging trap '+SEVN[d.trapLevel]);(d.logHosts||[]).forEach(h=>L.push('logging host '+n2ip(h)));
  if(d.ntpMaster)L.push('ntp master '+d.ntpMaster);(d.ntpServers||[]).forEach(h=>L.push('ntp server '+n2ip(h)));
  if(L.length)L.push('!');return L;}
const rc0=runningConfig;runningConfig=function(net,d){const out=[];let cur=null,vty=false;
  for(const l of rc0(net,d)){
    if(l.startsWith('interface '))cur=d.ifs[l.slice(10)];
    else if(l==='!'&&cur){out.push(...ifExtra(cur,d));cur=null;}
    if(l==='line con 0')out.push(...globalExtra(d));
    if(l==='line vty 0 4')vty=true;
    if(vty&&l===' login'&&d.lines.vty.local){out.push(' login local');continue;}
    out.push(l);}
  return out;};

