const CR='<cr>'; // in guides, tests and journals: press Enter (an empty line)
// The engine's clock for anything whose outcome depends on time (login quiet mode, MAC aging). It is the real clock,
// except while saved work is replayed: replay sets SIM_NOW to the time each command was first typed (journal t),
// so a replay reproduces exactly what happened live instead of running the whole history in one instant.
let SIM_NOW=null;function simNow(){return SIM_NOW!=null?SIM_NOW:Date.now();}
const ip2n=s=>{const p=String(s).split('.');if(p.length!==4)return null;let n=0;for(const x of p){if(!/^\d+$/.test(x)||+x>255)return null;n=n*256+ +x;}return n;};
const n2ip=n=>[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
const isIp=s=>ip2n(s)!==null;
const lenMask=l=>l===0?0:((0xFFFFFFFF<<(32-l))>>>0);
const maskLenN=n=>{for(let l=0;l<=32;l++)if(lenMask(l)===n)return l;return null;};
const netOf=(ip,len)=>(ip&lenMask(len))>>>0;
const IFT=['FastEthernet','GigabitEthernet','Loopback','Vlan'];
function parseIf(str){const m=/^([a-z]+)([\d\/.]+)$/i.exec(String(str).replace(/\s+/g,''));if(!m)return null;const t=IFT.find(t=>t.toLowerCase().startsWith(m[1].toLowerCase()));return t?t+m[2]:null;}
const shortIf=n=>n.replace('FastEthernet','Fa').replace('GigabitEthernet','Gi').replace('Loopback','Lo').replace('Vlan','Vl').replace('Port-channel','Po');
function sortIfs(names){const key=n=>{const t=IFT.findIndex(t=>n.startsWith(t));return [t].concat((n.match(/\d+/g)||[]).map(Number));};
  return names.slice().sort((a,b)=>{const x=key(a),y=key(b);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]??-1)-(y[i]??-1);if(d)return d;}return 0;});}
const pad=(s,n)=>String(s).padEnd(n);
// A router, or a Layer 3 switch with ip routing on: something that routes between its interfaces.
const isL3=d=>d.type==='router'||(d.type==='switch'&&!!d.ipRouting);
// Cisco type 7, shown once service password-encryption is on. It is a reversible obfuscation, not real encryption.
const SEVN=['emergencies','alerts','critical','errors','warnings','notifications','informational','debugging'];
const XLAT='dsfd;kfoA,.iyewrkldJKDHSUBsgvca69834ncxv9873254k;fg87';
function type7(pw){let s=0;for(const c of pw)s=(s+c.charCodeAt(0))%16;let o=String(s).padStart(2,'0');
  for(let k=0;k<pw.length;k++)o+=(pw.charCodeAt(k)^XLAT.charCodeAt((s+k)%XLAT.length)).toString(16).toUpperCase().padStart(2,'0');return o;}
const pwText=(d,pw)=>d.svcEnc?'7 '+type7(pw):pw;

function addIf(d,n,o){d.ifs[n]=Object.assign({name:n,ip:null,len:null,shutdown:false,desc:'',link:null,mode:'access',modeSet:false,accessVlan:1,native:1,allowed:'all',dot1q:null},o||{});return d.ifs[n];}
// A fresh IOS 15 device has `login` on line vty 0 4 and no password, so Telnet answers "Password required, but none set".
function mkRouter(name){const d={name,type:'router',hostname:name,ifs:{},statics:[],ospf:null,lines:{con:{},vty:{login:true}}};['0/0','0/1','0/2'].forEach(x=>addIf(d,'GigabitEthernet'+x,{shutdown:true}));return d;}
function mkSwitch(name){const d={name,type:'switch',hostname:name,ifs:{},vlans:{1:{name:'default'}},gw:null,lines:{con:{},vty:{login:true}}};
  for(let i=1;i<=8;i++)addIf(d,'FastEthernet0/'+i);addIf(d,'GigabitEthernet0/1');addIf(d,'GigabitEthernet0/2');addIf(d,'Vlan1',{shutdown:true});return d;}
function mkPC(name,ip,len,gw){const d={name,type:'pc',hostname:name,ifs:{},gw:gw?ip2n(gw):null};addIf(d,'FastEthernet0',{ip:ip2n(ip),len});return d;}
function mkNet(devs){const net={devs:{},links:[]};devs.forEach(d=>net.devs[d.name]=d);return net;}
function link(net,a,ai,b,bi){ai=parseIf(ai);bi=parseIf(bi);net.devs[a].ifs[ai].link={dev:b,ifn:bi};net.devs[b].ifs[bi].link={dev:a,ifn:ai};net.links.push({a,ai,b,bi});}
function setIp(net,dev,ifn,ip,len){const i=net.devs[dev].ifs[parseIf(ifn)];i.ip=ip2n(ip);i.len=len;i.shutdown=false;}

const allowed=(p,v)=>p.allowed==='all'||p.allowed.includes(v);
const phys=(d,i)=>i.name.includes('.')?d.ifs[i.name.split('.')[0]]:i;
function ifUp(net,d,i){
  if(i.shutdown||i.errdis)return false;
  if(i.name.startsWith('Loopback'))return true;
  if(i.name.startsWith('Vlan')){const v=+i.name.slice(4);if(!d.vlans[v])return false;
    return Object.values(d.ifs).some(p=>p.link&&!p.name.startsWith('Vlan')&&!p.routed&&ifUp(net,d,p)&&(p.mode==='trunk'?allowed(p,v):p.accessVlan===v||p.voiceVlan===v));}
  const p=phys(d,i);if(p.shutdown||p.errdis||!p.link)return false;
  const q=net.devs[p.link.dev].ifs[p.link.ifn];return !q.shutdown&&!q.errdis;
}
// Frames follow the spanning tree: a port that STP has put in the blocking state sends nothing and drops what
// arrives (stpBlocked). Every result carries its Layer 2 trail (each switch crossed, with the VLAN and the ports
// in and out), and out.edges lists every link the flood reached, which the MAC table and the map's flooding use.
function l2peers(net,d,i){
  const out=[];out.edges=[];if(i.name.startsWith('Loopback')||!ifUp(net,d,i))return out;
  const seen=new Set(),seenPath={},blk={};
  const loopOf=(a,b)=>{let L=0;while(L<a.length&&L<b.length&&a[L]===b[L])L++;const cyc=a.slice(Math.max(0,L-1)).concat(b.slice(L,-1).reverse());return [...new Set(cyc.filter(n=>net.devs[n].type==='switch'))];};
  const blocking=(sw,vlan,p)=>{let b=blk[vlan];if(!b)b=blk[vlan]=stpBlocked(net,vlan);return b.has(sw.name+'|'+p.name);};
  function flood(sw,vlan,inPort,path,trail){
    if(!sw.vlans[vlan])return;
    // a broadcast arriving at a switch that already flooded it came round a loop: a storm
    const k=sw.name+'|'+vlan;if(seen.has(k)){if(!out.storm)out.storm={vlan,sws:loopOf(seenPath[k],path)};return;}seen.add(k);seenPath[k]=path;
    const svi=sw.ifs['Vlan'+vlan];if(svi&&svi!==i&&!svi.shutdown&&(svi.ip!==null||svi.v6on))out.push({dev:sw,ifc:svi,path,trail});
    for(const p of Object.values(sw.ifs)){
      if(p===inPort||!p.link||p.name.startsWith('Vlan')||p.routed||!ifUp(net,sw,p)||blocking(sw,vlan,p))continue;
      if(p.chan&&bundled(net,sw,p)){const ms=members(sw,sw.ifs['Port-channel'+p.chan]).filter(m=>bundled(net,sw,m));if(ms[0]!==p||(inPort&&inPort.chan===p.chan))continue;}
      let tag=null;
      if(p.mode==='trunk'){if(!allowed(p,vlan))continue;tag=vlan===p.native?null:vlan;}
      else if(p.accessVlan!==vlan){if(p.voiceVlan===vlan)tag=vlan;else continue;}
      const last=trail[trail.length-1],t=last&&last.sw===sw.name?trail.slice(0,-1).concat([Object.assign({},last,{outp:p.name})]):trail;
      deliver(net.devs[p.link.dev],p.link.ifn,tag,path,t,p.name);
    }
  }
  function deliver(dev,ifn,tag,previous,trail,fromPort){
    const path=previous.concat(dev.name);
    const port=dev.ifs[ifn];
    const edge={from:previous[previous.length-1],fromPort,to:dev.name,toPort:ifn,vlan:null};out.edges.push(edge);
    // A routed switch port (no switchport) behaves like a router interface.
    if(dev.type==='switch'&&port.routed){if(tag===null&&(port.ip!==null||port.v6on)&&port!==i)out.push({dev,ifc:port,path,trail});return;}
    if(dev.type==='switch'){
      let vlan;
      if(port.mode==='trunk'){vlan=tag===null?port.native:tag;if(!allowed(port,vlan))return;}
      else if(tag!==null&&port.voiceVlan===tag)vlan=tag;
      else{if(tag!==null&&tag!==port.accessVlan)return;vlan=port.accessVlan;}
      edge.vlan=vlan;if(blocking(dev,vlan,port)){edge.blocked=true;return;}
      flood(dev,vlan,port,path,trail.concat([{sw:dev.name,vlan,inp:port.name,outp:null}]));
    }else if(dev.phone){
      // An IP phone is a small two-port bridge: its own traffic uses the voice VLAN it learned over CDP (untagged
      // if it learned none); the PC port passes untagged frames straight through to the switch port.
      const up=dev.ifs.FastEthernet0,pcp=dev.ifs.FastEthernet1,vv=phoneVlan(net,dev);
      if(port===pcp){if(tag===null&&up.link&&ifUp(net,dev,up))deliver(net.devs[up.link.dev],up.link.ifn,null,path,trail,up.name);}
      else if(tag===null){if(pcp.link&&ifUp(net,dev,pcp))deliver(net.devs[pcp.link.dev],pcp.link.ifn,null,path,trail,pcp.name);if(vv==null&&(up.ip!==null||up.v6on)&&up!==i)out.push({dev,ifc:up,path,trail});}
      else if(tag===vv&&up.ip!==null&&up!==i)out.push({dev,ifc:up,path,trail});
    }else if(tag===null){if((port.ip!==null||port.v6on)&&port!==i)out.push({dev,ifc:port,path,trail});
      else for(const s of Object.values(dev.ifs))if(s.name.startsWith(ifn+'.')&&s.nativeTag&&!s.shutdown&&s!==i)out.push({dev,ifc:s,path,trail});}
    else for(const s of Object.values(dev.ifs))if(s.name.startsWith(ifn+'.')&&s.dot1q===tag&&!s.shutdown&&s!==i)out.push({dev,ifc:s,path,trail});
  }
  // A switch sending from its own SVI is a bridge too: it looks the destination up in its own table first.
  if(d.type==='switch'&&!i.routed){const v=+i.name.slice(4);flood(d,v,null,[d.name],[{sw:d.name,vlan:v,inp:null,outp:null}]);}
  else{const p=phys(d,i);const tag=d.phone?phoneVlan(net,d):p===i||i.nativeTag?null:i.dot1q;if(!d.phone&&p!==i&&tag==null&&!i.nativeTag)return out;deliver(net.devs[p.link.dev],p.link.ifn,tag,[d.name],[],p.name);}
  return out;
}
function connected(net,d){const r=[];for(const i of Object.values(d.ifs))if(i.ip!==null&&ifUp(net,d,i))r.push({code:'C',net:netOf(i.ip,i.len),len:i.len,ifc:i,nh:null,ad:0});return r;}
function ospfIfs(net,d){if(!d.ospf)return [];const r=[];for(const i of Object.values(d.ifs)){if(i.ip===null||!ifUp(net,d,i))continue;
  if(i.ospfArea!=null){r.push({ifc:i,area:i.ospfArea});continue;}
  const n=d.ospf.networks.find(n=>((i.ip&~n.wild)>>>0)===((n.net&~n.wild)>>>0));if(n)r.push({ifc:i,area:n.area});}return r;}
// Hello and dead intervals: dead defaults to four hellos. Both must match for two routers to become neighbors.
const ospfTimers=i=>{const h=i.ospfHello||10;return [h,i.ospfDead||h*4];};
const isPassive=(d,n)=>d.ospf.passiveDef?!(d.ospf.nonPassive||[]).includes(n):d.ospf.passive.includes(n);
function ospfNeighbors(net,d){const res=[];if(d.ospf&&d.ospf.resetting)return res;for(const o of ospfIfs(net,d)){if(isPassive(d,o.ifc.name))continue;
  for(const p of l2peers(net,d,o.ifc)){const pd=p.dev;if(!isL3(pd)||!pd.ospf)continue;
    const po=ospfIfs(net,pd).find(x=>x.ifc===p.ifc);if(!po||po.area!==o.area||isPassive(pd,p.ifc.name)||pd.ospf.resetting)continue;
    if(ospfTimers(o.ifc).join()!==ospfTimers(p.ifc).join())continue;
    if(routerId(pd)===routerId(d))continue;
    if(p.ifc.len!==o.ifc.len||netOf(p.ifc.ip,p.ifc.len)!==netOf(o.ifc.ip,o.ifc.len))continue;
    res.push({dev:pd,ifc:o.ifc,pifc:p.ifc,area:o.area});}}return res;}
function routerId(d){if(d.ospf&&d.ospf.active!=null)return d.ospf.active;if(d.ospf&&d.ospf.rid!=null)return d.ospf.rid;const all=Object.values(d.ifs).filter(i=>i.ip!==null);const lo=all.filter(i=>i.name.startsWith('Loopback'));const s=(lo.length?lo:all).map(i=>i.ip);return s.length?Math.max(...s):0;}
// Interface cost is reference bandwidth (100 Mbps unless auto-cost changes it) divided by the interface speed, at least 1.
function ospfCost(d,i){if(i.ospfCost!=null)return i.ospfCost;const ref=(d.ospf&&d.ospf.refBw)||100,bw=i.name.startsWith('Fast')?100:i.name.startsWith('Loop')?8000000:1000;return Math.max(1,Math.floor(ref/bw));}
// Multi-area OSPF. SPF runs inside each area a router belongs to, over the adjacencies on that area's interfaces;
// those give the intra-area routes (O). An area border router (an interface in area 0 and in another area) advertises
// summaries: its other areas' intra routes into each area, and, into a non-backbone area, the summaries it heard over
// area 0 from other ABRs. A summary heard over a non-backbone area is never passed on, so an area that does not touch
// area 0 stays isolated (there are no virtual links here). Inter-area routes (O IA) never beat an intra-area route to
// the same prefix, whatever the metric; between routes of the same kind the lower metric wins.
const ospfAreasOf=(net,R)=>[...new Set(ospfIfs(net,R).map(o=>o.area))];
const ospfIsAbr=(net,R)=>{const a=ospfAreasOf(net,R);return a.includes(0)&&a.length>1;};
function ospfRoutes(net,d){if(!d.ospf)return [];
  const memo=new Map();
  const spf=(R,area)=>{const key=R.name+'|'+area;if(memo.has(key))return memo.get(key);const dist=new Map([[R.name,{cost:0,first:null}]]),done=new Set();
    for(;;){let u=null;for(const [n,v] of dist)if(!done.has(n)&&(u===null||v.cost<dist.get(u).cost))u=n;if(u===null)break;done.add(u);const U=net.devs[u],du=dist.get(u);
      for(const nb of ospfNeighbors(net,U)){if(nb.area!==area)continue;if((nb.ifc.ospfNet||'broadcast')!==(nb.pifc.ospfNet||'broadcast'))continue;const c=du.cost+ospfCost(U,nb.ifc),cur=dist.get(nb.dev.name);if(!cur||c<cur.cost)dist.set(nb.dev.name,{cost:c,first:du.first||{ifc:nb.ifc,nh:nb.pifc.ip}});}}
    memo.set(key,dist);return dist;};
  // what a router advertises into an area: its interfaces there (a loopback as a /32 host route, whatever its mask)
  const nets=(R,area)=>ospfIfs(net,R).filter(o=>o.area===area).map(o=>{const lo=o.ifc.name.startsWith('Loopback');return {net:lo?o.ifc.ip:netOf(o.ifc.ip,o.ifc.len),len:lo?32:o.ifc.len,cost:ospfCost(R,o.ifc)};});
  const intra=(R,area)=>{const key='i|'+R.name+'|'+area;if(memo.has(key))return memo.get(key);const best=new Map();
    for(const [name,info] of spf(R,area)){const X=net.devs[name];for(const o of nets(X,area)){const k=o.net+'/'+o.len,m=info.cost+o.cost;if(!best.has(k)||best.get(k).metric>m)best.set(k,{net:o.net,len:o.len,metric:m,first:info.first,from:routerId(X)});}}
    memo.set(key,best);return best;};
  const own=new Set(connected(net,d).map(c=>c.net+'/'+c.len)),best=new Map();
  const add=(k,r)=>{if(own.has(k))return;const b=best.get(k);if(b){if(b.code==='O'&&r.code==='O IA')return;if(b.code===r.code&&b.metric<=r.metric)return;}best.set(k,r);};
  const isAbr=ospfIsAbr(net,d);
  for(const A of ospfAreasOf(net,d)){
    for(const [k,r] of intra(d,A))if(r.first)add(k,{key:k,code:'O',net:r.net,len:r.len,ifc:r.first.ifc,nh:r.first.nh,ad:110,metric:r.metric,from:r.from});
    // An ABR examines only summaries heard in area 0 (RFC 2328 section 16.2); a router inside one area uses them all.
    // Every ABR therefore advertises the cost it really uses itself.
    if(isAbr&&A!==0)continue;
    for(const [name,info] of spf(d,A)){const B=net.devs[name];if(B===d||!info.first||!ospfIsAbr(net,B))continue;
      const sums=new Map(),offer=(k,r,m)=>{if(!sums.has(k)||sums.get(k).metric>m)sums.set(k,{net:r.net,len:r.len,metric:m});};
      for(const X of ospfAreasOf(net,B)){if(X===A)continue;for(const [k,r] of intra(B,X))offer(k,r,r.metric);}
      if(A!==0)for(const [n2,i2] of spf(B,0)){const C=net.devs[n2];if(C===B||!ospfIsAbr(net,C))continue;for(const X of ospfAreasOf(net,C)){if(X===0)continue;for(const [k,r] of intra(C,X))offer(k,r,i2.cost+r.metric);}}
      for(const [k,r] of sums)add(k,{key:k,code:'O IA',net:r.net,len:r.len,ifc:info.first.ifc,nh:info.first.nh,ad:110,metric:info.cost+r.metric,from:routerId(B)});}}
  return [...best.values()];}
// A static route is usable when its exit interface is up, or when its next hop sits on a connected subnet.
function staticRoutes(net,d,conn){const r=[];
  for(const s of d.statics){const ad=s.ad||1;
    if(s.ifn){const i=d.ifs[s.ifn];if(!i||!ifUp(net,d,i))continue;r.push({code:'S',net:s.net,len:s.len,nh:s.nh??null,ifc:i,ad,st:s});}
    else if(conn.some(c=>netOf(s.nh,c.len)===c.net))r.push({code:'S',net:s.net,len:s.len,nh:s.nh,ad,st:s});}
  return r;}
// The routing table keeps, per prefix, only the route with the lowest administrative distance.
function routes(net,d){const conn=connected(net,d);
  if(!isL3(d)){if(d.gw!=null)conn.push({code:'S',net:0,len:0,nh:d.gw,ad:1});return conn;}
  const best=new Map();
  for(const x of conn.concat(staticRoutes(net,d,conn),ospfRoutes(net,d))){const k=x.net+'/'+x.len,b=best.get(k);if(!b||x.ad<b.ad)best.set(k,x);}
  return [...best.values()];}
// Longest prefix match. A static route with only an exit interface treats the destination as on-link (proxy ARP).
function nextHop(net,d,dst){const rt=routes(net,d);let best=null;
  for(const r of rt)if(netOf(dst,r.len)===r.net&&(!best||r.len>best.len))best=r;
  if(!best)return null;let ifc=best.ifc;const nh=best.nh==null?dst:best.nh;
  if(!ifc){const c=rt.find(c=>c.code==='C'&&netOf(nh,c.len)===c.net);if(!c)return null;ifc=c.ifc;}
  return {ifc,nh,proxy:best.code==='S'&&best.nh==null,route:best};}
// The active HSRP router also owns its group's virtual IP.
const ownsIp=(net,d,ip)=>Object.values(d.ifs).some(i=>(i.ip===ip||hsrpVip(net,d,i)===ip)&&ifUp(net,d,i));
function tracePath(net,src,dst){let d=src,hops=[],srcIp=null;
  for(let t=0;t<20;t++){
    if(ownsIp(net,d,dst))return {ok:true,hops,srcIp,dest:d};
    if(t>0&&d.type!=='router')return {ok:false,hops};
    const h=nextHop(net,d,dst);if(!h)return {ok:false,hops};
    if(t===0)srcIp=h.ifc.ip;
    const peer=l2peers(net,d,h.ifc).find(p=>p.ifc.ip===h.nh);if(!peer)return {ok:false,hops};
    hops.push(h.nh);d=peer.dev;}
  return {ok:false,hops};}
function canPing(net,src,dst){const f=tracePath(net,src,dst);if(!f.ok)return false;if(f.srcIp===null)return true;return tracePath(net,f.dest,f.srcIp).ok;}

function parseVlanList(s){const r=[];for(const part of s.split(',')){const m=/^(\d+)(?:-(\d+))?$/.exec(part.trim());if(!m)return null;const a=+m[1],b=m[2]?+m[2]:a;for(let v=a;v<=b&&v<4095;v++)r.push(v);}return r;}
function runningConfig(net,d){
  const L=['Building configuration...','','Current configuration:','!','version 15.2',...(d.tsLog?['service timestamps log datetime msec']:[]),(d.svcEnc?'':'no ')+'service password-encryption','!','hostname '+d.hostname,'!'];
  if(d.secret)L.push('enable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0');
  if(d.enPass)L.push('enable password '+pwText(d,d.enPass));
  if(d.type==='switch'&&d.ipRouting)L.push('ip routing');
  if(d.noLookup)L.push('no ip domain-lookup');
  L.push('!');
  for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];L.push('interface '+n);
    if(i.desc)L.push(' description '+i.desc);
    if(i.dot1q!=null)L.push(' encapsulation dot1Q '+i.dot1q+(i.nativeTag?' native':''));
    if(d.type==='switch'&&i.routed&&!n.startsWith('Vlan'))L.push(' no switchport');
    if(d.type==='switch'&&!n.startsWith('Vlan')&&!i.routed){
      if(i.accessVlan!==1)L.push(' switchport access vlan '+i.accessVlan);
      if(i.encap)L.push(' switchport trunk encapsulation '+i.encap);
      if(i.allowed!=='all')L.push(' switchport trunk allowed vlan '+i.allowed.join(','));
      if(i.native!==1)L.push(' switchport trunk native vlan '+i.native);
      if(i.modeSet)L.push(' switchport mode '+i.mode);
    }else L.push(i.ip!==null?' ip address '+n2ip(i.ip)+' '+n2ip(lenMask(i.len)):' no ip address');
    if(i.shutdown)L.push(' shutdown');L.push('!');}
  if(d.ospf){L.push('router ospf '+d.ospf.pid);if(d.ospf.rid!=null)L.push(' router-id '+n2ip(d.ospf.rid));
    if(d.ospf.passiveDef){L.push(' passive-interface default');(d.ospf.nonPassive||[]).forEach(p=>L.push(' no passive-interface '+p));}else d.ospf.passive.forEach(p=>L.push(' passive-interface '+p));
    if(d.ospf.refBw&&d.ospf.refBw!==100)L.push(' auto-cost reference-bandwidth '+d.ospf.refBw);
    d.ospf.networks.forEach(n=>L.push(' network '+n2ip(n.net)+' '+n2ip(n.wild)+' area '+n.area));L.push('!');}
  if(d.type==='switch'&&d.gw!=null)L.push('ip default-gateway '+n2ip(d.gw));
  (d.statics||[]).forEach(s=>L.push('ip route '+n2ip(s.net)+' '+n2ip(lenMask(s.len))+(s.ifn?' '+s.ifn:'')+(s.nh!=null?' '+n2ip(s.nh):'')+(s.ad&&s.ad!==1?' '+s.ad:'')+(s.name?' name '+s.name:'')));
  if(d.banner)L.push('!','banner motd ^C'+d.banner+'^C');
  L.push('!');
  [['con','line con 0'],['vty','line vty 0 4']].forEach(([k,h])=>{L.push(h);const l=d.lines[k];if(l.aclClass)L.push(' access-class '+l.aclClass+' '+(l.aclDir||'in'));
    if(l.timeout&&(l.timeout[0]!==10||l.timeout[1]!==0))L.push(' exec-timeout '+l.timeout[0]+' '+l.timeout[1]);
    if(l.password)L.push(' password '+pwText(d,l.password));if(l.login)L.push(l.local?' login local':' login');if(l.transport)L.push(' transport input '+l.transport);});
  L.push('!','end');return L;}

const CMDS=[];
const C=(modes,pat,fn,types)=>CMDS.push({modes:modes.split(','),pat:pat.split(' '),fn,types});
const EX='user,priv',ALLCFG='config,if,vlan,line,ospf',BAD="% Invalid input detected at '^' marker.";
C('user','enable',e=>{e.s.mode='priv';});
C('priv','disable',e=>{e.s.mode='user';});
C('priv','configure terminal',e=>{e.s.mode='config';e.out('Enter configuration commands, one per line.  End with CNTL/Z.');});
C('priv','show running-config',e=>runningConfig(e.net,e.d).forEach(l=>e.out(l)));
C('priv','show startup-config',e=>e.d.startup?e.d.startup.forEach(l=>e.out(l)):e.out('startup-config is not present'));
C(EX,'show ip interface brief',e=>{const{net,d,out}=e;out(pad('Interface',23)+pad('IP-Address',16)+'OK? Method Status                Protocol');
  for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n],up=ifUp(net,d,i);
    out(pad(n,23)+pad(i.ip!==null?n2ip(i.ip):'unassigned',16)+'YES '+pad(i.ip!==null?'manual':'unset',7)+pad(i.shutdown?'administratively down':up?'up':'down',22)+(up?'up':'down'));}});
function routeLines(rt){const L=[];rt=rt.slice().sort((a,b)=>a.net-b.net||a.len-b.len);
  for(const r of rt){const p=n2ip(r.net)+'/'+r.len;
    if(r.code==='C'){L.push('C     '+p+' is directly connected, '+r.ifc.name);if(r.len<32)L.push('L     '+n2ip(r.ifc.ip)+'/32 is directly connected, '+r.ifc.name);}
    else if(r.code==='S')L.push('S'+(r.len===0?'*':' ')+'    '+p+(r.nh==null?' is directly connected, '+r.ifc.name:' ['+r.ad+'/0] via '+n2ip(r.nh)+(r.ifc?', '+r.ifc.name:'')));
    else L.push((r.code==='O IA'?'O IA ':'O'+(r.len===0?'*':' ')+'   ')+' '+p+' [110/'+r.metric+'] via '+n2ip(r.nh)+', 00:00:41, '+r.ifc.name);}
  return L;}
const ROUTECODES=['Codes: L - local, C - connected, S - static, O - OSPF, IA - OSPF inter area, * - candidate default',''];
C(EX,'show ip route',e=>{const{net,d,out}=e,rt=routes(net,d);out(...ROUTECODES);
  const def=rt.find(r=>r.len===0);out(def?'Gateway of last resort is '+(def.nh!=null?n2ip(def.nh):'0.0.0.0')+' to network 0.0.0.0':'Gateway of last resort is not set','');
  out(...routeLines(rt));},['router']);
// show ip route ADDRESS: the entry the router would use for that address (longest match), as IOS describes it.
C(EX,'show ip route <ip>',e=>{const{net,d,out}=e,ip=e.args[0],rt=routes(net,d);let r=null;for(const x of rt)if(netOf(ip,x.len)===x.net&&(!r||x.len>r.len))r=x;
  if(!r)return out('% Network not in table');
  out('Routing entry for '+n2ip(r.net)+'/'+r.len+(r.len===0?', supernet':''));
  if(r.code==='C'){out('  Known via "connected", distance 0, metric 0 (connected, via interface)','  Routing Descriptor Blocks:','  * directly connected, via '+r.ifc.name,'      Route metric is 0, traffic share count is 1');return;}
  if(r.code==='S'){out('  Known via "static", distance '+r.ad+', metric 0'+(r.len===0?', candidate default path':''),'  Routing Descriptor Blocks:',r.nh==null?'  * directly connected, via '+r.ifc.name:'  * '+n2ip(r.nh)+(r.ifc?', via '+r.ifc.name:''),'      Route metric is 0, traffic share count is 1');return;}
  out('  Known via "ospf '+d.ospf.pid+'", distance 110, metric '+r.metric+', type '+(r.code==='O IA'?'inter area':'intra area'),'  Last update from '+n2ip(r.nh)+' on '+r.ifc.name+', 00:00:41 ago','  Routing Descriptor Blocks:','  * '+n2ip(r.nh)+', from '+n2ip(r.from)+', 00:00:41 ago, via '+r.ifc.name,'      Route metric is '+r.metric+', traffic share count is 1');},['router']);
C(EX,'show ip route <w>',e=>{const{net,d,out}=e,w=e.args[0].toLowerCase(),code=[['static','S'],['ospf','O'],['connected','C']].find(([k])=>k.startsWith(w));if(!code)return out(BAD);
  out(...ROUTECODES,...routeLines(routes(net,d).filter(r=>r.code===code[1]||(code[1]==='O'&&r.code==='O IA'))));},['router']);
C(EX,'show ip ospf neighbor',e=>{const{net,d,out}=e;if(!d.ospf)return;const nb=ospfNeighbors(net,d);if(!nb.length)return;
  out('Neighbor ID     Pri   State           Dead Time   Address         Interface');
  // DROTHERs on the same segment only reach 2WAY with each other; they go FULL with the DR and BDR.
  nb.forEach(n=>{const p2p=(n.ifc.ospfNet||'broadcast')==='point-to-point',role=p2p?null:ospfRole(net,n.dev,n.pifc),me=p2p?null:ospfRole(net,d,n.ifc);
    const state=p2p?'FULL/  -':role==='DROTHER'&&me==='DROTHER'?'2WAY/DROTHER':'FULL/'+role;
    out(pad(n2ip(routerId(n.dev)),16)+String(p2p?0:ospfPrio(n.pifc)).padStart(3)+'   '+pad(state,16)+'00:00:3'+(n.pifc.ip%10)+'    '+pad(n2ip(n.pifc.ip),16)+n.ifc.name);});},['router']);
const showVlan=e=>{const{d,out}=e;out('VLAN Name                             Status    Ports','---- -------------------------------- --------- -------------------------------');
  for(const v of Object.keys(d.vlans).map(Number).sort((a,b)=>a-b)){const ports=sortIfs(Object.keys(d.ifs)).filter(n=>!n.startsWith('Vlan')&&!d.ifs[n].routed&&d.ifs[n].mode!=='trunk'&&(d.ifs[n].accessVlan===v||d.ifs[n].voiceVlan===v)).map(shortIf);
    const head=pad(v,5)+pad(d.vlans[v].name,33)+pad('active',10);
    if(!ports.length)out(head);for(let k=0;k<ports.length;k+=4)out((k?' '.repeat(48):head)+ports.slice(k,k+4).join(', '));}};
C(EX,'show vlan brief',showVlan,['switch']);
C(EX,'show vlan',showVlan,['switch']);
C(EX,'show interfaces trunk',e=>{const{net,d,out}=e;const t=sortIfs(Object.keys(d.ifs)).map(n=>d.ifs[n]).filter(i=>i.mode==='trunk'&&ifUp(net,d,i));if(!t.length)return;
  const al=i=>i.allowed==='all'?'1-4094':i.allowed.join(',');
  out('Port        Mode         Encapsulation  Status        Native vlan');t.forEach(i=>out(pad(shortIf(i.name),12)+'on           802.1q         trunking      '+i.native));
  out('','Port        Vlans allowed on trunk');t.forEach(i=>out(pad(shortIf(i.name),12)+al(i)));
  out('','Port        Vlans allowed and active in management domain');t.forEach(i=>out(pad(shortIf(i.name),12)+Object.keys(d.vlans).map(Number).filter(v=>allowed(i,v)).join(',')));},['switch']);
C(EX,'show interfaces <rest?>',e=>{const{net,d,out}=e;const rest=e.args[0];const names=rest?[parseIf(rest)]:sortIfs(Object.keys(d.ifs));
  for(const n of names){const i=d.ifs[n];if(!i)return out(BAD);const up=ifUp(net,d,i);
    out(n+' is '+(i.shutdown?'administratively down':up?'up':'down')+', line protocol is '+(up?'up':'down')+(i.errdis?' (err-disabled)':''));if(i.desc)out('  Description: '+i.desc);if(i.ip!==null)out('  Internet address is '+n2ip(i.ip)+'/'+i.len);}});
const save=e=>{e.d.startup=runningConfig(e.net,e.d).slice(2);e.out('Building configuration...','[OK]');};
C('priv','copy running-config startup-config',save);
C('priv','write <rest?>',save);
C(EX,'ping <ip>',e=>iosPing(e,e.args[0],5,100));
C(EX,'traceroute <ip>',e=>iosTrace(e,e.args[0]));
C(EX,'exit',()=>{});
C('config','hostname <w>',e=>{e.d.hostname=e.args[0];});
C('config','enable secret <w>',e=>{e.d.secret=e.args[0];});
C('config','enable password <w>',e=>{e.d.enPass=e.args[0];});
C('config','no ip domain-lookup',e=>{e.d.noLookup=true;});
C('config','ip domain-lookup',e=>{e.d.noLookup=false;});
C('config','ip routing',e=>{if(e.d.type==='switch'){if(!e.d.l3)return e.out(BAD);e.d.ipRouting=true;}});
C('config','no ip routing',e=>{if(e.d.type==='switch'){if(!e.d.l3)return e.out(BAD);e.d.ipRouting=false;}});
C('config','service password-encryption',e=>{e.d.svcEnc=true;});
C('config','banner motd <rest>',e=>{const r=e.args[0],del=r[0];let t=r.slice(1);const k=t.indexOf(del);if(k>=0)t=t.slice(0,k);e.d.banner=t;});
C('config','line console <n>',e=>{e.s.mode='line';e.s.ctx='con';});
C('config','line vty <n> <n>',e=>{e.s.mode='line';e.s.ctx='vty';});
C('config','interface range <rest>',e=>{const m=/^([a-z]+)((?:\d+\/)+)(\d+)-(\d+)$/i.exec(e.args[0].replace(/\s+/g,''));const list=[];
  if(m)for(let k=+m[3];k<=+m[4];k++){const i=e.d.ifs[parseIf(m[1]+m[2]+k)];if(i)list.push(i);}
  if(!list.length)return e.out('% Invalid interface range');e.s.mode='if';e.s.ctx=list;},['switch']);
C('config','interface <rest>',e=>{const{d}=e,n=parseIf(e.args[0]);let i=n&&d.ifs[n];
  if(n&&!i){if(d.type==='router'&&(/^Loopback\d+$/.test(n)||(n.includes('.')&&d.ifs[n.split('.')[0]])))i=addIf(d,n);else if(d.type==='switch'&&/^Vlan\d+$/.test(n))i=addIf(d,n);}
  if(!i)return e.out('% Invalid interface type and number');e.s.mode='if';e.s.ctx=[i];});
C('config','vlan <n>',e=>{const v=e.args[0];if(v<1||v>4094)return e.out('% Bad VLAN list');if(!e.d.vlans[v])e.d.vlans[v]={name:'VLAN'+String(v).padStart(4,'0')};e.s.mode='vlan';e.s.ctx=v;},['switch']);
C('config','no vlan <n>',e=>{if(e.args[0]!==1)delete e.d.vlans[e.args[0]];},['switch']);
// ip route NETWORK MASK {NEXT-HOP | INTERFACE [NEXT-HOP]} [DISTANCE] [name TEXT]
function parseStatic(e,rest,needTarget){const t=rest.trim()?rest.trim().split(/\s+/):[],r={nh:null,ifn:null,ad:1,name:null};
  if(t.length&&!isIp(t[0])&&!/^\d+$/.test(t[0])&&t[0].toLowerCase()!=='name'){const n=parseIf(t[0]);if(!n||!e.d.ifs[n])return null;r.ifn=n;t.shift();}
  if(t.length&&isIp(t[0]))r.nh=ip2n(t.shift());
  if(t.length&&/^\d+$/.test(t[0])){r.ad=+t.shift();if(r.ad<1||r.ad>255)return null;}
  if(t.length&&'name'.startsWith(t[0].toLowerCase())&&t[1]){r.name=t[1];t.splice(0,2);}
  if(t.length&&'permanent'.startsWith(t[0].toLowerCase()))t.shift();
  if(t.length||(needTarget&&r.nh==null&&!r.ifn))return null;return r;}
C('config','ip route <ip> <ip> <rest>',e=>{const[n,m]=e.args,len=maskLenN(m);if(len===null||netOf(n,len)!==n)return e.out('%Inconsistent address and mask');
  const r=parseStatic(e,e.args[2],true);if(!r)return e.out(BAD);
  const old=e.d.statics.find(s=>s.net===n&&s.len===len&&(s.nh??null)===r.nh&&(s.ifn||null)===r.ifn);
  if(old)Object.assign(old,{ad:r.ad,name:r.name});else e.d.statics.push({net:n,len,nh:r.nh,ifn:r.ifn,ad:r.ad,name:r.name});},['router']);
C('config','no ip route <ip> <ip> <rest?>',e=>{const[n,m]=e.args,len=maskLenN(m),r=parseStatic(e,e.args[2]||'',false);if(!r)return e.out(BAD);
  e.d.statics=e.d.statics.filter(s=>!(s.net===n&&s.len===len&&(r.nh==null||(s.nh??null)===r.nh)&&(!r.ifn||s.ifn===r.ifn)));},['router']);
// The router ID is chosen when the process starts and only changes on clear ip ospf process (or a reload).
C('config','router ospf <n>',e=>{if(!e.d.ospf){e.d.ospf={pid:e.args[0],rid:null,networks:[],passive:[],passiveDef:false,nonPassive:[],active:null};e.d.ospf.active=routerId(e.d)||null;}e.s.mode='ospf';},['router']);
C('config','no router ospf <n>',e=>{e.d.ospf=null;},['router']);
C('config','ip default-gateway <ip>',e=>{e.d.gw=e.args[0];},['switch']);
C(ALLCFG,'end',e=>{e.s.mode='priv';e.s.ctx=null;});
C(ALLCFG,'exit',e=>{e.s.mode=e.s.mode==='config'?'priv':'config';e.s.ctx=null;});
C(ALLCFG,'do <rest>',e=>run(e,e.args[0],'priv'));
const l3ok=(e,i)=>!(e.d.type==='switch'&&!i.name.startsWith('Vlan')&&!i.routed);
C('if','ip address <ip> <ip>',e=>{const[ip,m]=e.args,len=maskLenN(m);if(len===null)return e.out('Bad mask 0x'+m.toString(16).toUpperCase()+' for address '+n2ip(ip));
  for(const i of e.s.ctx){if(!l3ok(e,i))return e.out(BAD);
    if(i.name.includes('.')&&i.dot1q==null)return e.out('% Configuring IP routing on a LAN subinterface is only allowed if that','subinterface is already configured as part of an IEEE 802.10, IEEE 802.1Q,','or ISL vLAN.');
    i.ip=ip;i.len=len;}});
C('if','no ip address',e=>e.s.ctx.forEach(i=>{i.ip=null;i.len=null;}));
C('if','shutdown',e=>e.s.ctx.forEach(i=>{i.shutdown=true;}));
C('if','no shutdown',e=>e.s.ctx.forEach(i=>{i.shutdown=false;}));
C('if','description <rest>',e=>e.s.ctx.forEach(i=>{i.desc=e.args[0];}));
C('if','encapsulation dot1q <n>',e=>{for(const i of e.s.ctx){if(!i.name.includes('.'))return e.out(BAD);i.dot1q=e.args[0];}},['router']);
// A switch that also supports ISL (the Layer 3 models here) needs the trunk encapsulation set before trunk mode.
C('if','switchport mode <w>',e=>{const w=e.args[0].toLowerCase(),mode=['access','trunk'].find(m=>m.startsWith(w));if(!mode)return e.out(BAD);
  if(mode==='trunk'&&e.d.l3&&e.s.ctx.some(i=>i.encap!=='dot1q'))return e.out('Command rejected: An interface whose trunk encapsulation is "Auto" can not be configured to "trunk" mode.');e.s.ctx.forEach(i=>{i.mode=mode;i.modeSet=true;});},['switch']);
C('if','switchport access vlan <n>',e=>{const v=e.args[0];if(!e.d.vlans[v]){e.d.vlans[v]={name:'VLAN'+String(v).padStart(4,'0')};e.out('% Access VLAN does not exist. Creating vlan '+v);}e.s.ctx.forEach(i=>{i.accessVlan=v;});},['switch']);
C('if','switchport trunk allowed vlan <rest>',e=>{const r=e.args[0].toLowerCase().split(/\s+/);
  for(const i of e.s.ctx){if(r[0]==='all'){i.allowed='all';continue;}
    const list=parseVlanList(r[r.length-1]);if(!list)return e.out('% Bad VLAN list');
    if(r[0]==='add')i.allowed=i.allowed==='all'?'all':[...new Set(i.allowed.concat(list))].sort((a,b)=>a-b);
    else if(r[0]==='remove'){if(i.allowed!=='all')i.allowed=i.allowed.filter(v=>!list.includes(v));}
    else i.allowed=list;}},['switch']);
C('if','no switchport trunk allowed vlan',e=>e.s.ctx.forEach(i=>{i.allowed='all';}),['switch']);
C('if','switchport trunk native vlan <n>',e=>e.s.ctx.forEach(i=>{i.native=e.args[0];}),['switch']);
C('if','switchport trunk encapsulation dot1q',e=>e.s.ctx.forEach(i=>{i.encap='dot1q';}),['switch']);
C('vlan','name <w>',e=>{e.d.vlans[e.s.ctx].name=e.args[0];});
C('line','password <w>',e=>{e.d.lines[e.s.ctx].password=e.args[0];});
C('line','login',e=>{const l=e.d.lines[e.s.ctx];l.login=true;l.local=false;});
C('line','no login',e=>{e.d.lines[e.s.ctx].login=false;});
C('line','transport input <rest>',e=>{e.d.lines[e.s.ctx].transport=e.args[0];});
C('line','exec-timeout <rest>',e=>{const t=e.args[0].trim().split(/\s+/);if(t.length>2||!t.every(x=>/^\d+$/.test(x)))return e.out(BAD);e.d.lines[e.s.ctx].timeout=[+t[0],t[1]?+t[1]:0];});
C('line','logging synchronous',()=>{});
C('ospf','router-id <ip>',e=>{const o=e.d.ospf;o.rid=e.args[0];
  if(o.active!=null&&o.active!==o.rid&&ospfNeighbors(e.net,e.d).length)e.out('% OSPF: Reload or use "clear ip ospf process" command, for this to take effect');else o.active=o.rid;});
C('ospf','network <ip> <ip> area <n>',e=>{const[n,w,a]=e.args;if(!e.d.ospf.networks.some(x=>x.net===n&&x.wild===w&&x.area===a))e.d.ospf.networks.push({net:n,wild:w,area:a});});
C('ospf','no network <ip> <ip> area <n>',e=>{const[n,w,a]=e.args;e.d.ospf.networks=e.d.ospf.networks.filter(x=>!(x.net===n&&x.wild===w&&x.area===a));});
C('ospf','passive-interface <rest>',e=>{const o=e.d.ospf;o.nonPassive=o.nonPassive||[];if(/^default$/i.test(e.args[0].trim())){o.passiveDef=true;o.nonPassive=[];return;}
  const n=parseIf(e.args[0]);if(!n||!e.d.ifs[n])return e.out(BAD);if(o.passiveDef)o.nonPassive=o.nonPassive.filter(p=>p!==n);else if(!o.passive.includes(n))o.passive.push(n);});
C('ospf','no passive-interface <rest>',e=>{const o=e.d.ospf;o.nonPassive=o.nonPassive||[];if(/^default$/i.test(e.args[0].trim())){o.passiveDef=false;o.nonPassive=[];o.passive=[];return;}
  const n=parseIf(e.args[0]);if(!n||!e.d.ifs[n])return e.out(BAD);if(o.passiveDef){if(!o.nonPassive.includes(n))o.nonPassive.push(n);}else o.passive=o.passive.filter(p=>p!==n);});
const nic=d=>d.ifs.FastEthernet0;
C('pc','ipconfig',e=>{const i=nic(e.d);e.out('','FastEthernet0 Connection:','   IPv4 Address. . . . . . . . . . . : '+(i.ip!==null?n2ip(i.ip):'0.0.0.0'),'   Subnet Mask . . . . . . . . . . . : '+(i.ip!==null?n2ip(lenMask(i.len)):'0.0.0.0'),'   Default Gateway . . . . . . . . . : '+(e.d.gw!=null?n2ip(e.d.gw):'0.0.0.0'),'');});
C('pc','ipconfig /ip <ip> <ip>',e=>{const len=maskLenN(e.args[1]);if(len===null)return e.out('Invalid subnet mask.');nic(e.d).ip=e.args[0];nic(e.d).len=len;});
C('pc','ipconfig /dg <ip>',e=>{e.d.gw=e.args[0];});
// The reply's TTL starts at 128 from a host or 255 from IOS and loses one per router on the way back.
C('pc','ping <ip>',e=>winPing(e,e.args[0],4,32));
C('pc','tracert <ip>',e=>winTrace(e,e.args[0]));

function matchPat(pat,toks){const args=[];let i=0;
  for(const p of pat){
    if(p==='<rest>'){if(i>=toks.length)return 'partial';args.push(toks.slice(i).join(' '));return {args};}
    if(p==='<rest?>'){args.push(toks.slice(i).join(' '));return {args};}
    if(i>=toks.length)return 'partial';
    const t=toks[i];
    if(p==='<ip>'){if(!isIp(t))return null;args.push(ip2n(t));}
    else if(p==='<ip6>'){const a=parse6(t);if(a===null)return null;args.push(a);}
    else if(p==='<n>'){if(!/^\d+$/.test(t))return null;args.push(+t);}
    else if(p==='<w>')args.push(t);
    else if(!p.startsWith(t.toLowerCase()))return null;
    i++;}
  return i===toks.length?{args}:null;}
function run(env,line,mode){if(env.raw==null){env.raw=line;env.p0=env.s.mode==='pc'?0:promptOf(env.d,env.s).length;}line=line.trim();if(!line)return;
  if(mode!=='pc'&&line.includes('|'))return pipeRun(env,line,mode);
  const toks=line.split(/\s+/),{d,s}=env;let partial=false;
  const find=m=>{for(const c of CMDS){if(!c.modes.includes(m)||(c.types&&!c.types.includes(d.type)))continue;const r=matchPat(c.pat,toks);if(r&&shadowed(d,m,c.pat,toks))continue;if(r==='partial')partial=true;else if(r)return {c,args:r.args};}return null;};
  let m=find(mode),used=mode;
  if(!m&&!['config','user','priv','pc'].includes(mode)){m=find('config');if(m)used='config';}
  // an abbreviation that fits two keywords is refused, as IOS does ("sh i")
  if(m&&mode!=='pc'&&ambiguousAt(d,used,toks)>=0)return env.out('% Ambiguous command:  "'+line+'"');
  if(m){if(used!==mode){s.mode='config';s.ctx=null;}env.args=m.args;withCaret(env,line,toks,()=>m.c.fn(env));return;}
  parseFail(env,line,toks,mode,partial);}
function execLine(net,d,s,line){const out=[];const env={net,d,s,out:(...x)=>out.push(...x)};
  if(line===CR)line='';
  // A pending question takes the line as its answer; a remote (telnet/ssh) session takes it on the far device.
  if(s.prompt){const p=s.prompt;s.prompt=null;p.on(line,env);return out;}
  if(s.remote){const R=s.remote,rd=R.d,rs=R.s;
    if((rd.boots||0)!==rs.boot){s.remote=null;rd.vtys=(rd.vtys||[]).filter(x=>x!==R);out.push('',closeMsg(R));return out;}
    const o=execLine(net,rd,rs,line);
    for(const l of o){if(!rs.termMon&&/^(\*?[A-Z][a-z]{2} +\d+ [\d:.]+: )?%[A-Z0-9_]+-\d-/.test(l))(rd.conq=rd.conq||[]).push(l);else out.push(l);}
    s.pace=rs.pace;rs.pace=null;s.last=rs.last;
    if(rs.closed){s.remote=null;rd.vtys=(rd.vtys||[]).filter(x=>x!==R);out.push('',closeMsg(R));}
    return out;}
  const snap=()=>{const m={};for(const n in d.ifs)m[n]=ifUp(net,d,d.ifs[n]);return m;};
  const before=d.type==='pc'?null:snap();
  run(env,line,s.mode);
  // An administrative shutdown logs LINK-5-CHANGED; any other change of state logs LINK-3-UPDOWN.
  if(before){const after=snap();for(const n in after)if(!!before[n]!==after[n]){const st=after[n]?'up':'down';out.push(!after[n]&&d.ifs[n].shutdown?'%LINK-5-CHANGED: Interface '+n+', changed state to administratively down':'%LINK-3-UPDOWN: Interface '+n+', changed state to '+st,'%LINEPROTO-5-UPDOWN: Line protocol on Interface '+n+', changed state to '+st);}}
  return out;}
function promptOf(d,s){const h=d.hostname;switch(s.mode){case 'pc':return 'C:\\>';case 'user':return h+'>';case 'priv':return h+'#';case 'config':return h+'(config)#';
  case 'if':return h+(s.ctx.length>1?'(config-if-range)#':s.ctx[0].name.includes('.')?'(config-subif)#':'(config-if)#');case 'vlan':return h+'(config-vlan)#';case 'line':return h+'(config-line)#';default:return h+'(config-router)#';}}
const HELP={'<ip>':'A.B.C.D','<ip6>':'X:X:X:X::X','<n>':'<number>','<w>':'WORD','<rest>':'LINE','<rest?>':'<cr>'};
function candidates(d,mode,line){if(mode!=='pc'&&line.includes('|')){const sp0=/\s$/.test(line),r=line.slice(line.indexOf('|')+1).trim().split(/\s+/).filter(Boolean);
    if(!r.length||(r.length===1&&!sp0))return ['begin','count','exclude','include','section'].filter(o=>!r[0]||o.startsWith(r[0].toLowerCase()));return ['LINE'];}
  const sp=line===''||/\s$/.test(line);const toks=line.trim()?line.trim().split(/\s+/):[];const part=sp?'':toks.pop().toLowerCase();const set=new Set();
  for(const c of CMDS){if(!c.modes.includes(mode)||(c.types&&!c.types.includes(d.type)))continue;const pat=c.pat;let ok=true,rest=false;
    for(let j=0;j<toks.length;j++){const p=pat[j];if(p===undefined){ok=false;break;}if(p.startsWith('<rest')){rest=true;break;}if(p[0]==='<')continue;if(!p.startsWith(toks[j].toLowerCase())){ok=false;break;}}
    if(!ok)continue;if(rest){set.add('LINE');continue;}
    const p=pat[toks.length];if(p===undefined){if(!part){set.add('<cr>');if(/^sh/i.test(toks[0]||'')||(/^do$/i.test(toks[0]||'')&&/^sh/i.test(toks[1]||'')))set.add('|');}continue;}
    if(p[0]==='<')set.add(HELP[p]);else if(p.startsWith(part))set.add(p);}
  return [...set];}

const P=(net,from,ip)=>canPing(net,net.devs[from],ip2n(ip));
const IF=(net,dev,ifn)=>net.devs[dev].ifs[parseIf(ifn)];
const hasIp=(net,dev,ifn,ip,len)=>{const i=IF(net,dev,ifn);return !!i&&i.ip===ip2n(ip)&&i.len===len;};
const vlanIs=(net,dev,v,name)=>!!net.devs[dev].vlans[v]&&net.devs[dev].vlans[v].name.toLowerCase()===name.toLowerCase();
const acc=(net,dev,ifn,v)=>{const i=IF(net,dev,ifn);return i.mode==='access'&&i.modeSet&&i.accessVlan===v;};
const trunk=(net,dev,ifn,list)=>{const i=IF(net,dev,ifn);return i.mode==='trunk'&&(!list||(i.allowed!=='all'&&i.allowed.join()===list.join()));};
const preAccess=(net,dev,ifn,v)=>{const i=IF(net,dev,ifn);i.mode='access';i.modeSet=true;i.accessVlan=v;};

const LABS=[
{title:'Basic device setup',brief:'Take a router and a switch from factory defaults to a secured, addressed, saved baseline.',
 pos:{R1:[110,110],SW1:[300,110],PC1:[490,110]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkSwitch('SW1'),mkPC('PC1','192.168.1.10',24,'192.168.1.1')]);link(n,'R1','g0/0','SW1','g0/1');link(n,'SW1','f0/1','PC1','f0');return n;},
 addr:[['R1','G0/0','192.168.1.1/24'],['SW1','VLAN 1','192.168.1.2/24'],['PC1','NIC','192.168.1.10/24']],
 tasks:['On R1, set the hostname to <code>HQ-R1</code>.','Set the enable secret to <code>cisco123</code>.','Set the console password to <code>conpass</code> and require login.','Set the VTY 0–4 password to <code>vtypass</code> and require login.','Turn off DNS lookup so typos don\'t hang the console.','Add a message-of-the-day banner containing the word <code>Authorized</code>.','Configure G0/0 with the description <code>LAN</code> and its address from the table, then bring it up.','Save the running configuration to startup.','On SW1, set the hostname to <code>ACCESS-SW1</code>, address interface VLAN 1, bring it up, and set the default gateway to R1.','From PC1, ping the router and the switch.'],
 checks:[['R1 hostname is HQ-R1',n=>n.devs.R1.hostname==='HQ-R1'],['Enable secret is set',n=>n.devs.R1.secret==='cisco123'],['Console line has password and login',n=>n.devs.R1.lines.con.password==='conpass'&&n.devs.R1.lines.con.login],['VTY lines have password and login',n=>n.devs.R1.lines.vty.password==='vtypass'&&n.devs.R1.lines.vty.login],['DNS lookup is disabled',n=>n.devs.R1.noLookup===true],['Banner contains "Authorized"',n=>/authorized/i.test(n.devs.R1.banner||'')],['G0/0 is addressed, described and up',n=>hasIp(n,'R1','g0/0','192.168.1.1',24)&&!IF(n,'R1','g0/0').shutdown&&/^lan$/i.test(IF(n,'R1','g0/0').desc.trim())],['R1 configuration is saved with the interface address',n=>!!n.devs.R1.startup&&n.devs.R1.startup.some(l=>l.includes('ip address 192.168.1.1'))],['SW1 hostname, VLAN 1 address and gateway are set',n=>n.devs.SW1.hostname==='ACCESS-SW1'&&hasIp(n,'SW1','vlan1','192.168.1.2',24)&&n.devs.SW1.gw===ip2n('192.168.1.1')],['PC1 can ping the router and the switch',n=>P(n,'PC1','192.168.1.1')&&P(n,'PC1','192.168.1.2')]],
 solution:{R1:['enable','configure terminal','hostname HQ-R1','enable secret cisco123','no ip domain-lookup','banner motd #Authorized access only#','line console 0','password conpass','login','line vty 0 4','password vtypass','login','interface g0/0','description LAN','ip address 192.168.1.1 255.255.255.0','no shutdown','end','copy running-config startup-config','<cr>'],
  SW1:['enable','configure terminal','hostname ACCESS-SW1','interface vlan 1','ip address 192.168.1.2 255.255.255.0','no shutdown','exit','ip default-gateway 192.168.1.1','end']}},
{title:'VLANs and access ports',brief:'Split one switch into two broadcast domains and prove hosts only reach their own VLAN.',
 pos:{SW1:[300,60],PC1:[90,190],PC2:[230,190],PC3:[370,190],PC4:[510,190]},start:'SW1',
 build(){const n=mkNet([mkSwitch('SW1'),mkPC('PC1','192.168.10.11',24),mkPC('PC2','192.168.10.12',24),mkPC('PC3','192.168.20.13',24),mkPC('PC4','192.168.20.14',24)]);[1,2,3,4].forEach(k=>link(n,'SW1','f0/'+k,'PC'+k,'f0'));return n;},
 addr:[['PC1','Fa0/1, VLAN 10','192.168.10.11/24'],['PC2','Fa0/2, VLAN 10','192.168.10.12/24'],['PC3','Fa0/3, VLAN 20','192.168.20.13/24'],['PC4','Fa0/4, VLAN 20','192.168.20.14/24']],
 tasks:['Create VLAN 10 named <code>SALES</code> and VLAN 20 named <code>ENGINEERING</code>.','Set Fa0/1 and Fa0/2 as access ports in VLAN 10.','Set Fa0/3 and Fa0/4 as access ports in VLAN 20.','Check your work with <code>show vlan brief</code>.','Ping PC2 from PC1 (should work) and PC3 from PC1 (should fail, since nothing routes between the VLANs yet).'],
 checks:[['VLAN 10 exists and is named SALES',n=>vlanIs(n,'SW1',10,'SALES')],['VLAN 20 exists and is named ENGINEERING',n=>vlanIs(n,'SW1',20,'ENGINEERING')],['Fa0/1 and Fa0/2 are access ports in VLAN 10',n=>acc(n,'SW1','f0/1',10)&&acc(n,'SW1','f0/2',10)],['Fa0/3 and Fa0/4 are access ports in VLAN 20',n=>acc(n,'SW1','f0/3',20)&&acc(n,'SW1','f0/4',20)],['PC1 reaches PC2, and PC3 reaches PC4',n=>P(n,'PC1','192.168.10.12')&&P(n,'PC3','192.168.20.14')]],
 solution:{SW1:['enable','configure terminal','vlan 10','name SALES','vlan 20','name ENGINEERING','interface range f0/1 - 2','switchport mode access','switchport access vlan 10','interface range f0/3 - 4','switchport mode access','switchport access vlan 20','end','show vlan brief']}},
{title:'802.1Q trunking',brief:'Carry two VLANs between switches over a single link. SW1 already has its VLANs and access ports; SW2 is blank.',
 pos:{SW1:[180,70],SW2:[420,70],PC1:[90,195],PC2:[250,195],PC3:[350,195],PC4:[510,195]},start:'SW2',
 build(){const n=mkNet([mkSwitch('SW1'),mkSwitch('SW2'),mkPC('PC1','192.168.10.11',24),mkPC('PC2','192.168.20.12',24),mkPC('PC3','192.168.10.13',24),mkPC('PC4','192.168.20.14',24)]);
  link(n,'SW1','g0/1','SW2','g0/1');link(n,'SW1','f0/1','PC1','f0');link(n,'SW1','f0/2','PC2','f0');link(n,'SW2','f0/1','PC3','f0');link(n,'SW2','f0/2','PC4','f0');
  n.devs.SW1.vlans[10]={name:'SALES'};n.devs.SW1.vlans[20]={name:'ENGINEERING'};preAccess(n,'SW1','f0/1',10);preAccess(n,'SW1','f0/2',20);return n;},
 addr:[['PC1','SW1 Fa0/1, VLAN 10','192.168.10.11/24'],['PC2','SW1 Fa0/2, VLAN 20','192.168.20.12/24'],['PC3','SW2 Fa0/1, VLAN 10','192.168.10.13/24'],['PC4','SW2 Fa0/2, VLAN 20','192.168.20.14/24']],
 tasks:['On SW2, create VLAN 10 (<code>SALES</code>) and VLAN 20 (<code>ENGINEERING</code>).','On SW2, put Fa0/1 in VLAN 10 and Fa0/2 in VLAN 20 as access ports.','Make G0/1 a trunk on both switches.','Restrict the trunk to VLANs 10 and 20 on both switches.','Verify with <code>show interfaces trunk</code>, then ping PC3 from PC1 and PC4 from PC2.'],
 checks:[['SW2 has VLANs 10 and 20 with the right names',n=>vlanIs(n,'SW2',10,'SALES')&&vlanIs(n,'SW2',20,'ENGINEERING')],['SW2 access ports are in the right VLANs',n=>acc(n,'SW2','f0/1',10)&&acc(n,'SW2','f0/2',20)],['G0/1 is a trunk on both switches',n=>trunk(n,'SW1','g0/1')&&trunk(n,'SW2','g0/1')],['Trunk allows only VLANs 10 and 20 on both ends',n=>trunk(n,'SW1','g0/1',[10,20])&&trunk(n,'SW2','g0/1',[10,20])],['PC1 reaches PC3 and PC2 reaches PC4 across the trunk',n=>P(n,'PC1','192.168.10.13')&&P(n,'PC2','192.168.20.14')]],
 solution:{SW2:['enable','configure terminal','vlan 10','name SALES','vlan 20','name ENGINEERING','interface f0/1','switchport mode access','switchport access vlan 10','interface f0/2','switchport mode access','switchport access vlan 20','interface g0/1','switchport mode trunk','switchport trunk allowed vlan 10,20','end'],
  SW1:['enable','configure terminal','interface g0/1','switchport mode trunk','switchport trunk allowed vlan 10,20','end','show interfaces trunk']}},
{title:'Router-on-a-stick',brief:'Route between two VLANs using subinterfaces on a single router port. The switch VLANs and access ports are already in place.',
 pos:{R1:[300,45],SW1:[300,130],PC1:[160,210],PC2:[440,210]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkSwitch('SW1'),mkPC('PC1','192.168.10.10',24,'192.168.10.1'),mkPC('PC2','192.168.20.10',24,'192.168.20.1')]);
  link(n,'R1','g0/0','SW1','g0/1');link(n,'SW1','f0/1','PC1','f0');link(n,'SW1','f0/2','PC2','f0');
  n.devs.SW1.vlans[10]={name:'SALES'};n.devs.SW1.vlans[20]={name:'ENGINEERING'};preAccess(n,'SW1','f0/1',10);preAccess(n,'SW1','f0/2',20);return n;},
 addr:[['R1','G0/0.10 (VLAN 10)','192.168.10.1/24'],['R1','G0/0.20 (VLAN 20)','192.168.20.1/24'],['PC1','VLAN 10','192.168.10.10/24'],['PC2','VLAN 20','192.168.20.10/24']],
 tasks:['On SW1, make G0/1 a trunk.','On R1, bring up the physical interface G0/0 (no address on it).','Create subinterface G0/0.10, set 802.1Q encapsulation for VLAN 10, then give it its address.','Do the same for G0/0.20 and VLAN 20.','Check <code>show ip route</code> on R1, then ping PC2 from PC1.'],
 checks:[['SW1 G0/1 is a trunk',n=>trunk(n,'SW1','g0/1')],['R1 G0/0 is enabled',n=>!IF(n,'R1','g0/0').shutdown],['G0/0.10 is tagged for VLAN 10 with the right address',n=>hasIp(n,'R1','g0/0.10','192.168.10.1',24)&&IF(n,'R1','g0/0.10').dot1q===10],['G0/0.20 is tagged for VLAN 20 with the right address',n=>hasIp(n,'R1','g0/0.20','192.168.20.1',24)&&IF(n,'R1','g0/0.20').dot1q===20],['PC1 can ping PC2 through the router',n=>P(n,'PC1','192.168.20.10')]],
 solution:{SW1:['enable','configure terminal','interface g0/1','switchport mode trunk','end'],
  R1:['enable','configure terminal','interface g0/0','no shutdown','interface g0/0.10','encapsulation dot1q 10','ip address 192.168.10.1 255.255.255.0','interface g0/0.20','encapsulation dot1q 20','ip address 192.168.20.1 255.255.255.0','end','show ip route']}},
{title:'Static routing',brief:'Three routers in a row, all interfaces already addressed. Add the routes that let the two LANs talk.',
 pos:{PC1:[45,125],R1:[165,125],R2:[300,125],R3:[435,125],PC2:[555,125]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('R2'),mkRouter('R3'),mkPC('PC1','192.168.1.10',24,'192.168.1.1'),mkPC('PC2','192.168.3.10',24,'192.168.3.1')]);
  link(n,'PC1','f0','R1','g0/0');link(n,'R1','g0/1','R2','g0/0');link(n,'R2','g0/1','R3','g0/0');link(n,'R3','g0/1','PC2','f0');
  setIp(n,'R1','g0/0','192.168.1.1',24);setIp(n,'R1','g0/1','10.0.12.1',30);setIp(n,'R2','g0/0','10.0.12.2',30);setIp(n,'R2','g0/1','10.0.23.1',30);setIp(n,'R3','g0/0','10.0.23.2',30);setIp(n,'R3','g0/1','192.168.3.1',24);return n;},
 addr:[['R1','G0/0 / G0/1','192.168.1.1/24, 10.0.12.1/30'],['R2','G0/0 / G0/1','10.0.12.2/30, 10.0.23.1/30'],['R3','G0/0 / G0/1','10.0.23.2/30, 192.168.3.1/24'],['PC1 / PC2','NIC','192.168.1.10, 192.168.3.10']],
 tasks:['On R1, add static routes to <code>192.168.3.0/24</code> and <code>10.0.23.0/30</code> via R2.','On R2, add static routes to both LANs (<code>192.168.1.0/24</code> via R1, <code>192.168.3.0/24</code> via R3).','On R3, add a default route via R2 instead of individual routes.','Check each table with <code>show ip route</code>.','Ping PC2 from PC1, and try <code>tracert</code> to see the path.'],
 checks:[['R1 has a static route to 192.168.3.0/24',n=>n.devs.R1.statics.some(s=>s.net===ip2n('192.168.3.0')&&s.len===24&&s.nh===ip2n('10.0.12.2'))],['R1 has a static route to 10.0.23.0/30',n=>n.devs.R1.statics.some(s=>s.net===ip2n('10.0.23.0')&&s.len===30&&s.nh===ip2n('10.0.12.2'))],['R2 has static routes to both LANs',n=>n.devs.R2.statics.some(s=>s.net===ip2n('192.168.1.0')&&s.len===24)&&n.devs.R2.statics.some(s=>s.net===ip2n('192.168.3.0')&&s.len===24)],['R3 has a default route via R2',n=>n.devs.R3.statics.some(s=>s.len===0&&s.nh===ip2n('10.0.23.1'))],['PC1 can ping PC2 end to end',n=>P(n,'PC1','192.168.3.10')],['R1 can ping R3 at 10.0.23.2',n=>canPing(n,n.devs.R1,ip2n('10.0.23.2'))]],
 solution:{R1:['enable','configure terminal','ip route 192.168.3.0 255.255.255.0 10.0.12.2','ip route 10.0.23.0 255.255.255.252 10.0.12.2','end','show ip route'],
  R2:['enable','configure terminal','ip route 192.168.1.0 255.255.255.0 10.0.12.1','ip route 192.168.3.0 255.255.255.0 10.0.23.2','end'],
  R3:['enable','configure terminal','ip route 0.0.0.0 0.0.0.0 10.0.23.1','end']}},
{title:'Single-area OSPF',brief:'Three routers in a triangle, all interfaces already addressed. Bring up OSPF in area 0 so every LAN is reachable.',
 pos:{R1:[300,50],R2:[150,165],R3:[450,165],PC1:[480,50],PC2:[40,165],PC3:[560,165]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('R2'),mkRouter('R3'),mkPC('PC1','192.168.1.10',24,'192.168.1.1'),mkPC('PC2','192.168.2.10',24,'192.168.2.1'),mkPC('PC3','192.168.3.10',24,'192.168.3.1')]);
  link(n,'R1','g0/0','PC1','f0');link(n,'R2','g0/0','PC2','f0');link(n,'R3','g0/0','PC3','f0');link(n,'R1','g0/1','R2','g0/1');link(n,'R2','g0/2','R3','g0/2');link(n,'R1','g0/2','R3','g0/1');
  setIp(n,'R1','g0/0','192.168.1.1',24);setIp(n,'R1','g0/1','10.0.12.1',30);setIp(n,'R1','g0/2','10.0.13.1',30);
  setIp(n,'R2','g0/0','192.168.2.1',24);setIp(n,'R2','g0/1','10.0.12.2',30);setIp(n,'R2','g0/2','10.0.23.1',30);
  setIp(n,'R3','g0/0','192.168.3.1',24);setIp(n,'R3','g0/1','10.0.13.2',30);setIp(n,'R3','g0/2','10.0.23.2',30);return n;},
 addr:[['R1','LAN, to R2, to R3','192.168.1.0/24, 10.0.12.0/30, 10.0.13.0/30'],['R2','LAN, to R1, to R3','192.168.2.0/24, 10.0.12.0/30, 10.0.23.0/30'],['R3','LAN, to R1, to R2','192.168.3.0/24, 10.0.13.0/30, 10.0.23.0/30']],
 tasks:['On each router, start OSPF process 1 and set the router ID (<code>1.1.1.1</code>, <code>2.2.2.2</code>, <code>3.3.3.3</code>).','Advertise all three connected networks on each router in area 0 using wildcard masks.','Make each LAN interface (G0/0) passive so hellos aren\'t sent toward hosts.','Verify adjacencies with <code>show ip ospf neighbor</code> and learned routes with <code>show ip route</code>.','Ping PC2 and PC3 from PC1.'],
 checks:[['Router IDs are 1.1.1.1, 2.2.2.2 and 3.3.3.3',n=>['R1','R2','R3'].every((r,k)=>n.devs[r].ospf&&n.devs[r].ospf.rid===ip2n(`${k+1}.${k+1}.${k+1}.${k+1}`))],['Every router has two OSPF neighbors',n=>['R1','R2','R3'].every(r=>ospfNeighbors(n,n.devs[r]).length===2)],['G0/0 is passive on every router',n=>['R1','R2','R3'].every(r=>n.devs[r].ospf&&isPassive(n.devs[r],'GigabitEthernet0/0'))],['R1 learned 192.168.3.0/24 through OSPF',n=>ospfRoutes(n,n.devs.R1).some(o=>o.net===ip2n('192.168.3.0')&&o.len===24)],['PC1 can ping PC2 and PC3',n=>P(n,'PC1','192.168.2.10')&&P(n,'PC1','192.168.3.10')]],
 solution:{R1:['enable','configure terminal','router ospf 1','router-id 1.1.1.1','network 192.168.1.0 0.0.0.255 area 0','network 10.0.12.0 0.0.0.3 area 0','network 10.0.13.0 0.0.0.3 area 0','passive-interface g0/0','end'],
  R2:['enable','configure terminal','router ospf 1','router-id 2.2.2.2','network 192.168.2.0 0.0.0.255 area 0','network 10.0.12.0 0.0.0.3 area 0','network 10.0.23.0 0.0.0.3 area 0','passive-interface g0/0','end'],
  R3:['enable','configure terminal','router ospf 1','router-id 3.3.3.3','network 192.168.3.0 0.0.0.255 area 0','network 10.0.13.0 0.0.0.3 area 0','network 10.0.23.0 0.0.0.3 area 0','passive-interface g0/0','end','show ip ospf neighbor','show ip route']}}
];

