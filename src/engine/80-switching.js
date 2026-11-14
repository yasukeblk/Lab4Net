// ---------- switching realism: the MAC address table, flooding, and frames that follow the spanning tree ----------
// Each switch keeps d.mact: [{mac, vlan, ifn, kind: DYNAMIC|STATIC, t}]. Dynamic entries are learned from the source
// address of every frame the console sends (pings, traceroutes, telnet, ssh, DHCP), on the port it arrived on, and
// age out after d.macAging seconds (300) of silence, like a real switch. A frame whose destination is unknown in that
// VLAN is flooded out of every other port in the VLAN (the map shows it); a known one goes out one port.
// Learning happens only for commands typed in a console (L2LIVE, set by run()), never during grading or tests.
const MACRE=/^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i;
// The source MAC a device puts on a frame it sends from an interface: hosts have one address; router and switch
// ports each have their own; a switch's SVIs and port-channels use the chassis address.
function macTx(net,d,i){if(d.type==='pc')return macOf(d);const p=phys(d,i);return p.name.startsWith('Vlan')||p.name.startsWith('Port-channel')?macOf(d):macIf(d,p);}
const macNow=()=>simNow();
// Neighbours announce themselves all the time (CDP every 60 s, BPDUs every 2 s), so a switch always knows the MAC of the
// switch or router port on the other end of a link: these rows are computed, never age, and come straight back after a clear.
function macBackground(net,sw){const rows=[];if(sw.type!=='switch')return rows;const blk=new Map(),blocked=v=>{if(!blk.has(v))blk.set(v,stpBlocked(net,v));return blk.get(v);};
  for(const p of Object.values(sw.ifs)){if(!p.link||!physIf(p)||p.routed||!ifUp(net,sw,p))continue;const nb=net.devs[p.link.dev],np=nb.ifs[p.link.ifn];if(nb.type==='pc')continue;
    const mac=macTx(net,nb,np),vls=new Set();if(cdpOn(sw,p)&&cdpOn(nb,np))vls.add(p.mode==='trunk'?p.native:p.accessVlan);
    if(nb.type==='switch'&&!np.routed){for(const v of Object.keys(nb.vlans).map(Number))if(v<1002&&sw.vlans[v]&&!stpOff(nb,v)&&!blocked(v).has(nb.name+'|'+np.name)&&(p.mode==='trunk'?allowed(p,v)&&(np.mode==='trunk'?allowed(np,v):np.accessVlan===v):p.accessVlan===v&&(np.mode==='trunk'?np.native===v:np.accessVlan===v)))vls.add(v);}
    // a port spanning tree blocks (discarding) learns no addresses in that VLAN
    for(const v of vls)if(sw.vlans[v]&&!blocked(v).has(sw.name+'|'+p.name))rows.push({mac,vlan:v,ifn:p.name,kind:'DYNAMIC',bg:true});}return rows;}
const macAgeFor=(sw,v)=>(sw.macAgingV&&sw.macAgingV[v]!=null?sw.macAgingV[v]:sw.macAging??300);
function macLearn(sw,vlan,ifn,mac){if(!ifn||!sw.vlans[vlan]||mac===macOf(sw))return;const T=sw.mact||(sw.mact=[]);const e=T.find(x=>x.mac===mac&&x.vlan===vlan);
  if(e){if(e.kind==='STATIC')return;e.ifn=ifn;e.t=macNow();return;}T.push({mac,vlan,ifn,kind:'DYNAMIC',t:macNow()});}
// Dynamic entries leave when they age out, when their port goes down, or when their VLAN is deleted.
function macPrune(net,sw){const T=sw.mact;if(!T)return [];const now=macNow();
  sw.mact=T.filter(e=>{if(e.kind!=='DYNAMIC')return true;const p=sw.ifs[e.ifn],age=macAgeFor(sw,e.vlan)*1000;return !!p&&!!sw.vlans[e.vlan]&&ifUp(net,sw,p)&&(age===0||now-e.t<age);});return sw.mact;}
// A switch's own address counts as known (it is the CPU entry for every SVI).
function macLookup(net,sw,vlan,mac){if(mac===macOf(sw))return {mac,vlan,ifn:'CPU',kind:'STATIC'};return macPrune(net,sw).find(e=>e.mac===mac&&e.vlan===vlan)||macBackground(net,sw).find(e=>e.mac===mac&&e.vlan===vlan)||null;}
// A broadcast storm: every switch on the loop sees the same source address arriving on two ports, over and over.
function stormLog(net,d,ifc,storm){const mac=macTx(net,d,ifc);for(const n of storm.sws){const sw=net.devs[n];const ports=Object.values(sw.ifs).filter(p=>p.link&&physIf(p)&&!p.routed&&ifUp(net,sw,p)&&storm.sws.includes(p.link.dev)&&(p.mode==='trunk'?allowed(p,storm.vlan):p.accessVlan===storm.vlan));
    if(ports.length<2)continue;const msg='%SW_MATM-4-MACFLAP_NOTIF: Host '+mac+' in vlan '+storm.vlan+' is flapping between port '+shortIf(ports[0].name)+' and port '+shortIf(ports[1].name);logEvent(net,sw,msg);(sw.conq=sw.conq||[]).push((sw.tsLog?stamp(net,sw):'')+msg);}}
// Ports the spanning tree has blocked for a VLAN, as 'switch|port'. Members of a blocked port-channel are blocked with it.
function stpBlocked(net,v){const s=new Set(),r=stpCalc(net,v);if(!r)return s;
  for(const [n,me] of Object.entries(r.info))for(const [pn,x] of Object.entries(me.ports))if(x.role==='Altn'){s.add(n+'|'+pn);if(pn.startsWith('Port-channel'))for(const m of members(net.devs[n],net.devs[n].ifs[pn]))s.add(n+'|'+m.name);}
  return s;}
// One Layer 2 hop of a live frame: who sent it, who it was for, which switches learned what, and whether it was
// flooded. edges holds every link a flood reached ([from, to, blocked]); the map animates them.
function l2frame(net,d,ifc,peer,hopIp,at,edges,nd){
  const srcMac=macTx(net,d,ifc),vip=nd?null:(peer.ifc.hsrp||[]).find(g=>g.ip===hopIp&&hsrpVip(net,peer.dev,peer.ifc)===hopIp)||null;
  const dstMac=vip?vmac(peer.ifc,vip):macTx(net,peer.dev,peer.ifc);
  const arp=nd?nd.cold:(arpPrune(net,d)[hopIp]==null&&hopIp!==L2WARM);L2WARM=null;
  const ev={at,seg:peer.path,from:d.name,to:peer.dev.name,nh:hopIp,nhText:nd?nd.nhText:null,nd:!!nd,srcIp:ifc.ip,srcMac,dstMac,arp,flood:null,sw:[],edges:[]};
  const trail=peer.trail||[];
  const subtree=start=>{const r=[],q=[start],been=new Set([start]);while(q.length){const x=q.shift();for(const e of edges){if(e.from!==x)continue;r.push(e);if(!e.blocked&&!been.has(e.to)){been.add(e.to);q.push(e.to);}}}return r;};
  const learnAll=start=>{const r=subtree(start);for(const e of r)if(!e.blocked&&e.vlan!=null&&net.devs[e.to].type==='switch')macLearn(net.devs[e.to],e.vlan,e.toPort,srcMac);return r.map(e=>[e.from,e.to,!!e.blocked]);};
  if(arp){
    // The ARP request is a broadcast: every switch in the VLAN learns the sender. The reply is a unicast frame back
    // along one path, so only those switches learn the target.
    ev.flood=d.name;ev.edges=learnAll(d.name);
    for(const t of trail){const sw=net.devs[t.sw];macLearn(sw,t.vlan,t.outp,dstMac);ev.sw.push({sw:t.sw,vlan:t.vlan,out:t.outp,known:true});}
  }else{
    for(const t of trail){const sw=net.devs[t.sw];macLearn(sw,t.vlan,t.inp,srcMac);
      if(vip)macLearn(sw,t.vlan,t.outp,dstMac);// HSRP hellos from the active router keep the virtual MAC learned
      let hit=macLookup(net,sw,t.vlan,dstMac);if(hit&&hit.ifn===t.inp)hit=null;
      if(!hit&&!ev.flood){ev.flood=t.sw;ev.edges=learnAll(t.sw);}
      ev.sw.push({sw:t.sw,vlan:t.vlan,out:hit?hit.ifn:null,known:!!hit});}
  }
  return ev;}
// An ARP request that nobody answers: the broadcast still floods the VLAN and every switch it reaches learns the sender.
function l2arpLost(net,d,ifc,hopIp,edges,at){const srcMac=macTx(net,d,ifc),ev={at,seg:[d.name],from:d.name,to:null,nh:hopIp,srcIp:ifc.ip,srcMac,dstMac:'ffff.ffff.ffff',arp:true,lost:true,flood:d.name,sw:[],edges:[]};
  const r=[],q=[d.name],been=new Set([d.name]);while(q.length){const x=q.shift();for(const e of edges){if(e.from!==x)continue;r.push(e);if(!e.blocked&&!been.has(e.to)){been.add(e.to);q.push(e.to);}}}
  for(const e of r)if(!e.blocked&&e.vlan!=null&&net.devs[e.to].type==='switch'){macLearn(net.devs[e.to],e.vlan,e.toPort,srcMac);ev.sw.push({sw:e.to,vlan:e.vlan,out:null,inp:e.toPort,known:false,lost:true});}
  ev.edges=r.map(e=>[e.from,e.to,!!e.blocked]);return ev;}
// A DHCP exchange: the discover is a broadcast from the client; the offer comes back along one path from the server or relay.
{const dr0=dhcpRenew;dhcpRenew=function(net,pc){const learn=LIVE&&L2LIVE,c=learn?dhcpCandidates(net,pc)[0]:null,o=dr0(net,pc);
  if(o&&c&&c.p){const ps=l2peers(net,pc,nic(pc)),mine=macOf(pc),ans=c.p,ansMac=macTx(net,ans.dev,ans.ifc);
    for(const e of ps.edges)if(!e.blocked&&e.vlan!=null&&net.devs[e.to].type==='switch')macLearn(net.devs[e.to],e.vlan,e.toPort,mine);
    for(const t of ans.trail||[])macLearn(net.devs[t.sw],t.vlan,t.outp,ansMac);}
  return o;};}

// A real switch drops a learned entry the moment its port goes down or its VLAN is deleted; prune after every command.
// The tree as spanning tree sees it between switches. Edge ports (to hosts) are left out: a host port going up or down is
// not a topology change in Rapid PVST+, so it must not flush anyone's table.
function stpSig(net,v){const r=stpCalc(net,v);if(!r)return '';const inter=(n,p)=>{const i=net.devs[n].ifs[p];if(!i)return false;if(p.startsWith('Port-channel'))return true;const nb=i.link&&net.devs[i.link.dev];return !!nb&&nb.type==='switch';};
  return (r.root?r.root.name:'-')+'#'+Object.keys(r.info).sort().map(n=>n+':'+Object.entries(r.info[n].ports).filter(([p])=>inter(n,p)).map(([p,x])=>p+'='+x.role).sort().join(',')).join(';');}
function stpFlush(net){const vls=new Set();for(const x of Object.values(net.devs))for(const e of x.mact||[])if(e.kind==='DYNAMIC')vls.add(e.vlan);
  const S=net.stpSig||(net.stpSig={});for(const v of vls){const sig=stpSig(net,v);if(S[v]!==undefined&&S[v]!==sig)for(const x of Object.values(net.devs))if(x.mact)x.mact=x.mact.filter(e=>e.kind!=='DYNAMIC'||e.vlan!==v);S[v]=sig;}}
{const ex0=execLine;execLine=function(net,d,s,line){const out=ex0(net,d,s,line);for(const x of Object.values(net.devs))if(x.mact)macPrune(net,x);stpFlush(net);return out;};}
// ----- show mac address-table and friends
const CPU_MACS=['0100.0ccc.cccc','0100.0ccc.cccd'].concat(Array.from({length:17},(_,k)=>'0180.c200.00'+k.toString(16).padStart(2,'0')),['ffff.ffff.ffff']);
const MAC_HDR=['          Mac Address Table','-------------------------------------------','','Vlan    Mac Address       Type        Ports','----    -----------       --------    -----'];
const macLine=r=>String(r.vlan).padStart(4)+'    '+r.mac+'    '+pad(r.kind,12)+(r.ifn==='CPU'?'CPU':shortIf(r.ifn));
// Every row the switch would list: the reserved CPU addresses, its own address per SVI, secure addresses, then the learned and configured ones.
function macRows(net,sw,f){const rows=[];
  if(f.kind!=='DYNAMIC'&&f.vlan==null&&!f.ifn&&!f.mac)CPU_MACS.forEach(m=>rows.push({vlan:'All',mac:m,kind:'STATIC',ifn:'CPU'}));
  for(const n of sortIfs(Object.keys(sw.ifs))){const i=sw.ifs[n];if(n.startsWith('Vlan')&&i.ip!==null&&ifUp(net,sw,i))rows.push({vlan:+n.slice(4),mac:macOf(sw),kind:'STATIC',ifn:'CPU'});}
  for(const p of Object.values(sw.ifs))if(p.ps&&p.ps.on&&ifUp(net,sw,p))for(const m of p.ps.macs||[])rows.push({vlan:p.accessVlan,mac:m.mac,kind:'STATIC',ifn:p.name});
  for(const e of macPrune(net,sw))if(!rows.some(r=>r.mac===e.mac&&r.vlan===e.vlan))rows.push(e);
  for(const e of macBackground(net,sw))if(!rows.some(r=>r.mac===e.mac&&r.vlan===e.vlan))rows.push(e);
  const num=v=>v==='All'?-1:v;
  return rows.filter(r=>(f.kind==null||r.kind===f.kind)&&(f.vlan==null||r.vlan===f.vlan)&&(!f.ifn||r.ifn===f.ifn)&&(!f.mac||r.mac===f.mac)).sort((a,b)=>num(a.vlan)-num(b.vlan)||(a.mac<b.mac?-1:a.mac>b.mac?1:0));}
// vlan N, interface X and address H.H.H, in any order. Returns null for anything else.
function macFilter(rest){const f={},t=(rest||'').trim().split(/\s+/).filter(Boolean);
  while(t.length){const w=t.shift().toLowerCase();
    if(w&&'vlan'.startsWith(w)){const n=t.shift();if(!/^\d+$/.test(n||'')||+n<1||+n>4094)return null;f.vlan=+n;}
    else if(w&&'interface'.startsWith(w)){let n=parseIf(t[0]||'');if(n)t.shift();else{n=parseIf((t[0]||'')+(t[1]||''));if(!n)return null;t.splice(0,2);}f.ifn=n;}
    else if(w&&'address'.startsWith(w)){const m=(t.shift()||'').toLowerCase();if(!MACRE.test(m))return null;f.mac=m;}
    else return null;}
  return f;}
function macShow(e,kind,rest){const f=macFilter(rest);if(!f)return e.out(BAD);f.kind=kind;const rows=macRows(e.net,e.d,f);
  e.out(...MAC_HDR,...rows.map(macLine),'Total Mac Addresses for this criterion: '+rows.length);}
Cn(EX,'show mac address-table',e=>macShow(e,null,''),['switch']);
Cn(EX,'show mac address-table dynamic <rest?>',e=>macShow(e,'DYNAMIC',e.args[0]),['switch']);
Cn(EX,'show mac address-table static <rest?>',e=>macShow(e,'STATIC',e.args[0]),['switch']);
Cn(EX,'show mac address-table vlan <n>',e=>macShow(e,null,'vlan '+e.args[0]),['switch']);
Cn(EX,'show mac address-table interface <rest>',e=>macShow(e,null,'interface '+e.args[0]),['switch']);
Cn(EX,'show mac address-table address <w>',e=>macShow(e,null,'address '+e.args[0]),['switch']);
Cn(EX,'show mac address-table aging-time',e=>e.out('Global Aging Time:  '+(e.d.macAging??300),'Vlan    Aging Time','----    ----------',...Object.entries(e.d.macAgingV||{}).sort((a,b)=>a[0]-b[0]).map(([v,n])=>String(v).padStart(4)+'    '+n)),['switch']);
Cn(EX,'show mac address-table aging-time vlan <n>',e=>{const v=+e.args[0];e.out('Global Aging Time:  '+(e.d.macAging??300),'Vlan    Aging Time','----    ----------',...(e.d.macAgingV&&e.d.macAgingV[v]!=null?[String(v).padStart(4)+'    '+e.d.macAgingV[v]]:[]));},['switch']);
Cn(EX,'show mac address-table count <rest?>',e=>{const f=macFilter(e.args[0]);if(!f||f.ifn||f.mac)return e.out(BAD);const rows=macRows(e.net,e.d,{vlan:f.vlan}).filter(r=>r.vlan!=='All');
  const vls=[...new Set(rows.map(r=>r.vlan))].sort((a,b)=>a-b);if(f.vlan!=null&&!vls.length)vls.push(f.vlan);e.out('');
  for(const v of vls){const dyn=rows.filter(r=>r.vlan===v&&r.kind==='DYNAMIC').length,st=rows.filter(r=>r.vlan===v&&r.kind==='STATIC').length;
    e.out('Mac Entries for Vlan '+v+':','---------------------------','Dynamic Address Count  : '+dyn,'Static  Address Count  : '+st,'Total Mac Addresses    : '+(dyn+st),'');}
  e.out('Total Mac Address Space Available: '+(8192-rows.length-CPU_MACS.length));},['switch']);
Cn(EX,'show mac-address-table <rest?>',e=>run(e,'show mac address-table '+(e.args[0]||''),e.s.mode),['switch']);
Cn('priv','clear mac address-table dynamic <rest?>',e=>{const f=macFilter(e.args[0]);if(!f)return e.out(BAD);
  e.d.mact=(e.d.mact||[]).filter(x=>x.kind!=='DYNAMIC'||(f.vlan!=null&&x.vlan!==f.vlan)||(f.ifn&&x.ifn!==f.ifn)||(f.mac&&x.mac!==f.mac));},['switch']);
Cn('priv','clear mac-address-table dynamic <rest?>',e=>run(e,'clear mac address-table dynamic '+(e.args[0]||''),e.s.mode),['switch']);
Cn('config','mac address-table static <w> vlan <n> interface <rest>',e=>{const m=e.args[0].toLowerCase(),v=+e.args[1],n=parseIf(e.args[2]);
  if(!MACRE.test(m)||!(v>=1&&v<=4094)||!n||!e.d.ifs[n]||/^(Vlan|Loopback)/.test(n))return e.out(BAD);
  const T=e.d.mact||(e.d.mact=[]);const k=T.findIndex(x=>x.mac===m&&x.vlan===v);if(k>=0)T.splice(k,1);T.push({mac:m,vlan:v,ifn:n,kind:'STATIC',t:macNow()});},['switch']);
Cn('config','no mac address-table static <w> vlan <n> <rest?>',e=>{const m=e.args[0].toLowerCase(),v=+e.args[1];e.d.mact=(e.d.mact||[]).filter(x=>!(x.kind==='STATIC'&&x.mac===m&&x.vlan===v));},['switch']);
Cn('config','mac address-table aging-time <n>',e=>{const n=+e.args[0];if(!(n===0||(n>=10&&n<=1000000)))return e.out(BAD);e.d.macAging=n;},['switch']);
Cn('config','mac address-table aging-time <n> vlan <n>',e=>{const n=+e.args[0],v=+e.args[1];if(!(n===0||(n>=10&&n<=1000000))||!(v>=1&&v<=4094))return e.out(BAD);(e.d.macAgingV=e.d.macAgingV||{})[v]=n;},['switch']);
Cn('config','no mac address-table aging-time <n> vlan <n>',e=>{if(e.d.macAgingV)delete e.d.macAgingV[+e.args[1]];},['switch']);
Cn('config','no mac address-table aging-time vlan <n>',e=>{if(e.d.macAgingV)delete e.d.macAgingV[+e.args[0]];},['switch']);
Cn('config','no mac address-table aging-time <rest?>',e=>{delete e.d.macAging;},['switch']);
{const ge0=globalExtra;globalExtra=function(d){const L=ge0(d);if(d.type!=='switch')return L;
  if(d.macAging!=null&&d.macAging!==300)L.push('mac address-table aging-time '+d.macAging);for(const [v,n] of Object.entries(d.macAgingV||{}))L.push('mac address-table aging-time '+n+' vlan '+v);
  for(const e of d.mact||[])if(e.kind==='STATIC')L.push('mac address-table static '+e.mac+' vlan '+e.vlan+' interface '+e.ifn);return L;};}
Object.assign(KWHELP,{'address-table':'MAC forwarding table','aging-time':'aging-time keyword',count:'count keyword',dynamic:'dynamic entry type','mac-address-table':'MAC forwarding table'});
if(!KWHELP.mac)KWHELP.mac='MAC configuration subcommands';if(!KWHELP.static)KWHELP.static='static entry type';
Object.assign(WHYC,{
'show mac address-table':'The table a switch forwards by: which MAC address it has seen on which port, per VLAN. A frame to a known address goes out that one port; an unknown one is flooded out of every port in the VLAN. Entries are learned from the source address of frames and age out after 300 seconds.',
'show mac address-table dynamic <rest?>':'Only the learned entries, without the switch\'s own CPU addresses. Add vlan, interface or address to narrow it down.',
'show mac address-table static <rest?>':'Entries that never age out: the switch\'s own addresses, secure port addresses, and ones you configured by hand.',
'show mac address-table vlan <n>':'The entries for one VLAN. A host missing here has not sent a frame lately, or sits in another VLAN.',
'show mac address-table interface <rest>':'What the switch has learned behind one port. Several addresses on one port mean another switch, a phone or a hub is there.',
'show mac address-table address <w>':'Finds which port and VLAN one MAC address was learned on: the quickest way to locate a host on a switch.',
'show mac address-table aging-time':'How long an entry lives after the last frame from that address. The default is 300 seconds.',
'show mac address-table count <rest?>':'How many addresses are known per VLAN, and how much table space is left.',
'show mac-address-table <rest?>':'The older spelling of show mac address-table; both work on most IOS versions.',
'clear mac address-table dynamic <rest?>':'Forgets every learned address (or those for one VLAN, port or address). The next frame to each host is flooded again until the switch relearns it.',
'clear mac-address-table dynamic <rest?>':'The older spelling of clear mac address-table dynamic.',
'mac address-table static <w> vlan <n> interface <rest>':'Pins an address to a port so it never ages out or moves. Used for devices that rarely talk, or to lock a server to its port.',
'no mac address-table static <w> vlan <n> <rest?>':'Removes a pinned entry.',
'mac address-table aging-time <n>':'Changes how long learned addresses live (0 keeps them forever). A short time means more flooding; a long time means stale entries after a host moves.',
'mac address-table aging-time <n> vlan <n>':'An aging time for one VLAN only, overriding the global value there.',
'no spanning-tree vlan <w>':'Turns spanning tree off for a VLAN on this switch. With redundant links that is how you get a broadcast storm: one broadcast circles for ever and the MAC table flaps between ports.',
'spanning-tree vlan <w>':'Turns spanning tree back on for a VLAN (it is on by default).',
'no mac address-table aging-time <rest?>':'Back to the default of 300 seconds.'});
