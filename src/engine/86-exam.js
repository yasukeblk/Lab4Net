// ---------- exam sim: surprise faults for a finished lab ----------
// examFault(lab, seed, count) takes a build lab, applies its solution, and breaks it with `count` faults chosen by a
// seeded random generator from EXAM_FAULTS. Every fault is real IOS configuration (applied through execLine, so a
// typo in a generator fails loudly), and a fault is only kept when at least one of the lab's own checks fails
// afterwards: the lab's checks are the exam's marking scheme, and they still describe the required end state.
function seedRng(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);let a=h>>>0;
  return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const rpick=(rnd,arr)=>arr.length?arr[Math.floor(rnd()*arr.length)]:null;
function shuffled(rnd,arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const enterCfg=d=>['enable',...(d.secret||d.enPass?[d.secret||d.enPass]:[]),'configure terminal'];
function applyCmds(net,cmds){for(const [name,lines] of Object.entries(cmds)){const d=net.devs[name],s={mode:d.type==='pc'?'pc':'user'};
  for(const line of lines){const out=execLine(net,d,s,line);if(out.some(l=>/^% (Invalid|Incomplete|Ambiguous|Unrecognized|Unknown)|^Command rejected|is not recognized as an internal/.test(l)))throw Error('rejected '+line+' on '+name+': '+out.join(' | '));}}}
function solvedNet(lab){const net=lab.build();applyCmds(net,lab.solution);return net;}
const labPasses=(lab,net)=>lab.checks.every(([,f])=>{try{return !!f(net);}catch(e){return false;}});
const failingChecks=(lab,net)=>lab.checks.filter(([,f])=>{try{return !f(net);}catch(e){return true;}}).length;
const netDevs=(net,types)=>Object.values(net.devs).filter(d=>types.includes(d.type)&&!d.phone);
const physPorts=d=>Object.values(d.ifs).filter(i=>i.link&&!/^(Vlan|Loopback|Port-channel)/.test(i.name)&&!i.name.includes('.'));
const trunkPorts=d=>physPorts(d).filter(i=>i.mode==='trunk'&&!i.routed&&!i.chan);
const accessPorts=d=>physPorts(d).filter(i=>i.mode!=='trunk'&&!i.routed&&!i.chan);
const addrIfs=(net,d)=>Object.values(d.ifs).filter(i=>i.ip!==null&&i.len!=null&&ifUp(net,d,i)&&!i.name.startsWith('Loopback'));
const others=(net,ip)=>Object.values(net.devs).some(x=>Object.values(x.ifs).some(i=>i.ip===ip));
const vlanList=i=>i.allowed==='all'?null:i.allowed.slice();
const EXAM_FAULTS=[
 {id:'shut',generic:true,gen(net,rnd){const c=[];for(const d of netDevs(net,['router','switch']))for(const i of physPorts(d))if(!i.shutdown)c.push([d,i]);const p=rpick(rnd,c);if(!p)return null;const [d,i]=p;
   return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'shutdown','end']},desc:d.hostname+' '+shortIf(i.name)+' was shut down'};}},
 {id:'vlan',gen(net,rnd){const c=[];for(const d of netDevs(net,['switch']))for(const i of accessPorts(d)){const o=Object.keys(d.vlans).map(Number).filter(v=>v!==i.accessVlan&&v<1002);if(o.length)c.push([d,i,o]);}
   const p=rpick(rnd,c);if(!p)return null;const [d,i,o]=p,v=rpick(rnd,o);return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'switchport access vlan '+v,'end']},desc:d.hostname+' '+shortIf(i.name)+' was moved from VLAN '+i.accessVlan+' to VLAN '+v};}},
 {id:'route',gen(net,rnd){const c=[];for(const d of netDevs(net,['router','switch']))for(const s of d.statics||[])c.push([d,s]);const p=rpick(rnd,c);if(!p)return null;const [d,s]=p;
   const spec=n2ip(s.net)+' '+n2ip(lenMask(s.len))+(s.ifn?' '+s.ifn:'')+(s.nh!=null?' '+n2ip(s.nh):'');return {cmds:{[d.name]:[...enterCfg(d),'no ip route '+spec,'end']},desc:'the route to '+n2ip(s.net)+'/'+s.len+' was removed from '+d.hostname};}},
 {id:'nexthop',gen(net,rnd){const c=[];for(const d of netDevs(net,['router','switch']))for(const s of d.statics||[])if(s.nh!=null&&!s.ifn)c.push([d,s]);const p=rpick(rnd,c);if(!p)return null;const [d,s]=p;
   let nh=null;for(const conn of shuffled(rnd,addrIfs(net,d))){for(let k=1;k<6&&nh===null;k++){const x=(conn.ip+k)>>>0;if(x!==s.nh&&netOf(x,conn.len)===netOf(conn.ip,conn.len)&&!others(net,x)&&(x&~lenMask(conn.len))!==(~lenMask(conn.len)>>>0))nh=x;}if(nh!==null)break;}if(nh===null)return null;
   const spec=n2ip(s.net)+' '+n2ip(lenMask(s.len));return {cmds:{[d.name]:[...enterCfg(d),'no ip route '+spec+' '+n2ip(s.nh),'ip route '+spec+' '+n2ip(nh)+(s.ad&&s.ad!==1?' '+s.ad:''),'end']},desc:d.hostname+'\'s route to '+n2ip(s.net)+'/'+s.len+' points at '+n2ip(nh)+', an address nobody has'};}},
 {id:'trunk',gen(net,rnd){const c=[];for(const d of netDevs(net,['switch']))for(const i of trunkPorts(d))c.push([d,i]);const p=rpick(rnd,c);if(!p)return null;const [d,i]=p;
   return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'switchport mode access','end']},desc:d.hostname+' '+shortIf(i.name)+' is an access port instead of a trunk'};}},
 {id:'allowed',gen(net,rnd){const c=[];for(const d of netDevs(net,['switch']))for(const i of trunkPorts(d)){const used=Object.keys(d.vlans).map(Number).filter(v=>v!==1&&v<1002&&v!==i.native&&(i.allowed==='all'||i.allowed.includes(v)));if(used.length)c.push([d,i,used]);}
   const p=rpick(rnd,c);if(!p)return null;const [d,i,used]=p,v=rpick(rnd,used);const keep=(vlanList(i)||Object.keys(d.vlans).map(Number).filter(x=>x<1002)).filter(x=>x!==v);if(!keep.length)return null;
   return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'switchport trunk allowed vlan '+keep.join(','),'end']},desc:'VLAN '+v+' is no longer allowed on '+d.hostname+' '+shortIf(i.name)};}},
 {id:'native',gen(net,rnd){const c=[];for(const d of netDevs(net,['switch']))for(const i of trunkPorts(d))c.push([d,i]);const p=rpick(rnd,c);if(!p)return null;const [d,i]=p,v=i.native===99?98:99;
   return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'switchport trunk native vlan '+v,'end']},desc:d.hostname+' '+shortIf(i.name)+' has native VLAN '+v+' while the other end does not'};}},
 {id:'novlan',gen(net,rnd){const c=[];for(const d of netDevs(net,['switch']))for(const v of Object.keys(d.vlans).map(Number))if(v!==1&&v<1002&&accessPorts(d).some(i=>i.accessVlan===v||i.voiceVlan===v))c.push([d,v]);const p=rpick(rnd,c);if(!p)return null;const [d,v]=p;
   return {cmds:{[d.name]:[...enterCfg(d),'no vlan '+v,'end']},desc:'VLAN '+v+' was deleted from '+d.hostname};}},
 {id:'ospfnet',gen(net,rnd){const c=[];for(const d of netDevs(net,['router','switch']))if(d.ospf)for(const n of d.ospf.networks||[])c.push([d,n]);const p=rpick(rnd,c);if(!p)return null;const [d,n]=p;
   return {cmds:{[d.name]:[...enterCfg(d),'router ospf '+(d.ospf.pid||1),'no network '+n2ip(n.net)+' '+n2ip(n.wild)+' area '+n.area,'end']},desc:d.hostname+' no longer runs OSPF on '+n2ip(n.net)+' ('+n2ip(n.wild)+')'};}},
 {id:'passive',gen(net,rnd){const c=[];for(const d of netDevs(net,['router','switch']))if(d.ospf&&!d.ospf.passiveDef)for(const nb of ospfNeighbors(net,d))if(!c.some(x=>x[1]===nb.ifc))c.push([d,nb.ifc]);const p=rpick(rnd,c);if(!p)return null;const [d,i]=p;
   return {cmds:{[d.name]:[...enterCfg(d),'router ospf '+(d.ospf.pid||1),'passive-interface '+i.name,'end']},desc:d.hostname+' made '+shortIf(i.name)+' passive, so it stopped talking OSPF to its neighbour there'};}},
 {id:'rid',gen(net,rnd){const rs=netDevs(net,['router','switch']).filter(d=>d.ospf&&ospfNeighbors(net,d).length);if(rs.length<2)return null;const d=rpick(rnd,rs),nb=rpick(rnd,ospfNeighbors(net,d)).dev;
   return {cmds:{[d.name]:[...enterCfg(d),'router ospf '+(d.ospf.pid||1),'router-id '+n2ip(routerId(nb)),'end','clear ip ospf process']},desc:d.hostname+' uses the same OSPF router ID as '+nb.hostname+' ('+n2ip(routerId(nb))+')'};}},
 {id:'mask',generic:true,gen(net,rnd){const c=[];for(const d of netDevs(net,['router']))for(const i of addrIfs(net,d))if(i.len===24&&!i.name.includes('.'))c.push([d,i]);const p=rpick(rnd,c);if(!p)return null;const [d,i]=p;
   return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'ip address '+n2ip(i.ip)+' 255.255.255.128','end']},desc:d.hostname+' '+shortIf(i.name)+' has a /25 mask instead of /24'};}},
 {id:'ip',generic:true,gen(net,rnd){const c=[];for(const d of netDevs(net,['router']))for(const i of addrIfs(net,d))if(!i.name.includes('.')&&!i.hsrp){const x=(i.ip+1)>>>0;if(netOf(x,i.len)===netOf(i.ip,i.len)&&(x&~lenMask(i.len))!==(~lenMask(i.len)>>>0)&&!others(net,x))c.push([d,i,x]);}
   const p=rpick(rnd,c);if(!p)return null;const [d,i,x]=p;return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'ip address '+n2ip(x)+' '+n2ip(lenMask(i.len)),'end']},desc:d.hostname+' '+shortIf(i.name)+' is addressed '+n2ip(x)+' instead of '+n2ip(i.ip)};}},
 {id:'nat',gen(net,rnd){const c=[];for(const d of netDevs(net,['router']))for(const i of Object.values(d.ifs))if(i.nat)c.push([d,i]);const p=rpick(rnd,c);if(!p)return null;const [d,i]=p;
   return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'no ip nat '+i.nat,'end']},desc:d.hostname+' '+shortIf(i.name)+' is no longer marked ip nat '+i.nat};}},
 {id:'gw',gen(net,rnd){const c=netDevs(net,['switch']).filter(d=>d.gw!=null);const d=rpick(rnd,c);if(!d)return null;
   const svi=Object.values(d.ifs).find(i=>i.ip!=null&&netOf(i.ip,i.len)===netOf(d.gw,i.len)),len=svi?svi.len:24,base=netOf(d.gw,len),bc=(base+2**(32-len)-1)>>>0;
   let x=null;for(let k=1;k<2**(32-len)&&x===null;k++){const y=((d.gw+k-base)%(bc-base-1||1))+base+1;if(y!==d.gw&&y<bc&&!ownerOf(net,y))x=y>>>0;}if(x===null)return null;
   return {cmds:{[d.name]:[...enterCfg(d),'ip default-gateway '+n2ip(x),'end']},desc:d.hostname+'\'s default gateway points at '+n2ip(x)+' instead of '+n2ip(d.gw)};}},
 {id:'acl',gen(net,rnd){const c=[];for(const d of netDevs(net,['router','switch'])){const used=new Set();for(const i of Object.values(d.ifs)){if(i.aclIn)used.add(i.aclIn);if(i.aclOut)used.add(i.aclOut);}if(d.lines&&d.lines.vty&&d.lines.vty.aclClass)used.add(d.lines.vty.aclClass);
     for(const n of used)if(d.acls&&d.acls[n])c.push([d,n]);}const p=rpick(rnd,c);if(!p)return null;const [d,n]=p,A=d.acls[n],ext=A.type!=='standard';
   return {cmds:{[d.name]:[...enterCfg(d),'ip access-list '+(ext?'extended':'standard')+' '+n,'5 deny '+(ext?'ip any any':'any'),'end']},desc:'a "deny '+(ext?'ip any any':'any')+'" was slipped in at the top of ACL '+n+' on '+d.hostname};}},
 {id:'ssh',gen(net,rnd){const c=netDevs(net,['router','switch']).filter(d=>d.lines&&d.lines.vty&&d.lines.vty.local&&d.rsa&&/ssh/i.test(d.lines.vty.transport||'all')&&!/telnet/i.test(d.lines.vty.transport||''));const d=rpick(rnd,c);if(!d)return null;
   return {cmds:{[d.name]:[...enterCfg(d),'line vty 0 4','transport input telnet','end']},desc:d.hostname+'\'s VTY lines accept only Telnet now, so SSH is refused'};}},
 {id:'l3',gen(net,rnd){const c=netDevs(net,['switch']).filter(d=>d.ipRouting);const d=rpick(rnd,c);if(!d)return null;return {cmds:{[d.name]:[...enterCfg(d),'no ip routing','end']},desc:'ip routing was switched off on '+d.hostname};}},
 {id:'encap',gen(net,rnd){const c=[];for(const d of netDevs(net,['router']))for(const i of Object.values(d.ifs))if(i.name.includes('.')&&i.dot1q&&!i.nativeTag)c.push([d,i]);const p=rpick(rnd,c);if(!p)return null;const [d,i]=p,v=i.dot1q+1;
   return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'encapsulation dot1q '+v,'end']},desc:d.hostname+' '+shortIf(i.name)+' tags VLAN '+v+' instead of VLAN '+i.dot1q};}},
 {id:'portsec',gen(net,rnd){const c=[];for(const d of netDevs(net,['switch']))for(const i of accessPorts(d))if(i.ps&&i.ps.on&&net.devs[i.link.dev].type==='pc'&&!i.errdis)c.push([d,i]);const p=rpick(rnd,c);if(!p)return null;const [d,i]=p;
   return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'switchport port-security maximum 1','switchport port-security mac-address 0000.5e00.5301','end']},desc:'a wrong static MAC address on '+d.hostname+' '+shortIf(i.name)+' made the real device a violation'};}}
];
function examFault(lab,seed,count){const rnd=seedRng(seed),base=solvedNet(lab);if(!labPasses(lab,base))return null;const found=[];
  const order=shuffled(rnd,EXAM_FAULTS.filter(g=>!g.generic)).concat(shuffled(rnd,EXAM_FAULTS.filter(g=>g.generic)));
  for(const g of order){if(found.length>=(count||1))break;
    for(let t=0;t<3;t++){const net=solvedNet(lab);try{for(const f of found)applyCmds(net,f.cmds);}catch(e){break;}
      let r=null;try{r=g.gen(net,rnd);}catch(e){r=null;}if(!r)break;
      try{applyCmds(net,r.cmds);}catch(e){continue;}
      if(failingChecks(lab,net)>0){found.push({id:g.id,desc:r.desc,cmds:r.cmds});break;}}}
  return found.length?found:null;}
// The exam's own lab object: the base lab's topology, requirements and checks, its solution already applied, and the faults on top.
function examLab(base,faults,title){const l=Object.assign({},base,{title,group:'Exam',kind:'exam',exam:true,baseTitle:base.title,why:[],steps:[],ccna:base.ccna,
  brief:'This network was built to the requirements in the checklist and was working. Something has changed since. Find out what, repair it, and prove it works: every check must pass.',
  lesson:faults.map(f=>String(f.desc).replace(/^./,c=>c.toUpperCase())).join('. ')+'.',
  build(){const net=solvedNet(base);for(const f of faults)applyCmds(net,f.cmds);return net;}});
  l.tasks=base.tasks.slice();return l;}
