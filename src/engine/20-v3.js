// ---------- v3 engine: lab library expansion ----------
C('priv','clear ip ospf process',e=>{const o=e.d.ospf;if(!o)return;const before=ospfNeighbors(e.net,e.d);e.out('Reset ALL OSPF processes? [no]: yes');
  o.resetting=true;ospfElect(e.net);o.resetting=false;o.active=null;o.active=routerId(e.d)||null;ospfElect(e.net);
  before.forEach(n=>e.out('%OSPF-5-ADJCHG: Process '+o.pid+', Nbr '+n2ip(routerId(n.dev))+' on '+n.ifc.name+' from FULL to DOWN, Neighbor Down: Interface down or detached'));
  ospfNeighbors(e.net,e.d).forEach(n=>e.out('%OSPF-5-ADJCHG: Process '+o.pid+', Nbr '+n2ip(routerId(n.dev))+' on '+n.ifc.name+' from LOADING to FULL, Loading Done'));},['router']);
const passiveList=d=>sortIfs(Object.keys(d.ifs)).filter(n=>isPassive(d,n));
// the areas a router is configured in: network statements and interface commands (ip ospf 1 area 0), in number order
const ospfCfgAreas=d=>{const o=d.ospf;if(!o)return [];return [...new Set([...o.networks.map(n=>n.area),...Object.values(d.ifs).filter(i=>i.ospfArea!=null).map(i=>i.ospfArea)])].sort((a,b)=>a-b);};
C(EX,'show ip protocols',e=>{const{net,d,out}=e,o=d.ospf;if(!o)return;const areas=ospfCfgAreas(d);
  out('*** IP Routing is NSF aware ***','','Routing Protocol is "ospf '+o.pid+'"','  Outgoing update filter list for all interfaces is not set','  Incoming update filter list for all interfaces is not set','  Router ID '+n2ip(routerId(d)),...(ospfIsAbr(net,d)?['  It is an area border router']:[]),
    '  Number of areas in this router is '+areas.length+'. '+areas.length+' normal 0 stub 0 nssa','  Maximum path: 4','  Routing for Networks:',...o.networks.map(n=>'    '+n2ip(n.net)+' '+n2ip(n.wild)+' area '+n.area));
  for(const a of areas){const ifs=sortIfs(Object.keys(d.ifs)).filter(n=>d.ifs[n].ospfArea===a);if(ifs.length)out('  Routing on Interfaces Configured Explicitly (Area '+a+'):',...ifs.map(n=>'    '+n));}
  const pl=passiveList(d);if(pl.length)out('  Passive Interface(s):',...pl.map(n=>'    '+n));
  out('  Routing Information Sources:','    Gateway         Distance      Last Update',...[...new Set(ospfNeighbors(net,d).map(n=>routerId(n.dev)))].map(r=>'    '+pad(n2ip(r),16)+pad('110',14)+'00:01:12'),'  Distance: (default is 110)');},['router']);
C(EX,'show ip ospf',e=>{const{net,d,out}=e,o=d.ospf;if(!o)return out('%OSPF: Router process not running');const areas=ospfCfgAreas(d);
  out(' Routing Process "ospf '+o.pid+'" with ID '+n2ip(routerId(d)),' Supports only single TOS(TOS0) routes',...(ospfIsAbr(net,d)?[' It is an area border router']:[]),' Reference bandwidth unit is 100 mbps',' Number of areas in this router is '+areas.length+'. '+areas.length+' normal 0 stub 0 nssa');
  areas.forEach(a=>out('    Area '+(a===0?'BACKBONE(0)':a),'        Number of interfaces in this area is '+ospfIfs(net,d).filter(x=>x.area===a).length));},['router']);

// OSPF interfaces: priority, cost, network type, and the DR/BDR election on broadcast segments.
const ospfPrio=i=>i.ospfPrio??1;
const ospfType=i=>i.name.startsWith('Loopback')?'LOOPBACK':(i.ospfNet||'broadcast')==='point-to-point'?'POINT_TO_POINT':'BROADCAST';
const segKey=i=>netOf(i.ip,i.len)+'/'+i.len;
// Election state lives on the network, per segment, so it persists between commands. It follows RFC 2328 9.4: only
// routers with priority above 0 are eligible; the BDR is chosen first from eligible routers not already DR (one already
// BDR keeps it), then the DR is the current DR if still eligible, otherwise the BDR is promoted and a new BDR chosen.
// So a higher priority never pre-empts, but priority 0 or leaving the segment does trigger a change.
function ospfElect(net){const st=net.ospfDR||(net.ospfDR={}),seen=new Set();
  for(const d of Object.values(net.devs)){if(!isL3(d)||!d.ospf||d.ospf.resetting)continue;
    for(const o of ospfIfs(net,d)){const i=o.ifc;if(ospfType(i)!=='BROADCAST'||isPassive(d,i.name))continue;const k=segKey(i);if(seen.has(k))continue;seen.add(k);
      const mem=[{dev:d,ifc:i}].concat(ospfNeighbors(net,d).filter(n=>n.ifc===i).map(n=>({dev:n.dev,ifc:n.pifc})));
      const s=st[k]||(st[k]={dr:null,bdr:null}),elig=mem.filter(m=>ospfPrio(m.ifc)>0);
      const best=list=>{let b=null;for(const m of list)if(!b||ospfPrio(m.ifc)>ospfPrio(b.ifc)||(ospfPrio(m.ifc)===ospfPrio(b.ifc)&&routerId(m.dev)>routerId(b.dev)))b=m;return b?b.dev.name:null;};
      const curDR=elig.some(m=>m.dev.name===s.dr)?s.dr:null,curBDR=elig.some(m=>m.dev.name===s.bdr)&&s.bdr!==curDR?s.bdr:null;
      let bdr=curBDR||best(elig.filter(m=>m.dev.name!==curDR)),dr=curDR||bdr;
      if(dr===bdr)bdr=best(elig.filter(m=>m.dev.name!==dr));
      s.dr=dr;s.bdr=bdr;}}
  for(const k of Object.keys(st))if(!seen.has(k))delete st[k];}
function ospfRole(net,d,i){const t=ospfType(i);if(t==='LOOPBACK')return 'LOOP';if(t==='POINT_TO_POINT')return 'P2P';if(isPassive(d,i.name))return 'DR';
  const k=segKey(i);if(!net.ospfDR||!net.ospfDR[k])ospfElect(net);const s=(net.ospfDR||{})[k];if(!s)return 'DR';return s.dr===d.name?'DR':s.bdr===d.name?'BDR':'DROTHER';}
{const ex0=execLine;execLine=function(net,d,s,line){const out=ex0(net,d,s,line);if(Object.values(net.devs).some(x=>x.ospf))ospfElect(net);return out;};}

C('if','ip ospf priority <n>',e=>{if(e.args[0]>255)return e.out(BAD);e.s.ctx.forEach(i=>{i.ospfPrio=e.args[0];});},['router']);
C('if','no ip ospf priority',e=>e.s.ctx.forEach(i=>{delete i.ospfPrio;}),['router']);
C('if','ip ospf cost <n>',e=>{if(e.args[0]<1||e.args[0]>65535)return e.out(BAD);e.s.ctx.forEach(i=>{i.ospfCost=e.args[0];});},['router']);
C('if','no ip ospf cost',e=>e.s.ctx.forEach(i=>{delete i.ospfCost;}),['router']);
C('if','ip ospf network <w>',e=>{const t=['point-to-point','broadcast'].find(x=>x.startsWith(e.args[0].toLowerCase()));if(!t)return e.out(BAD);e.s.ctx.forEach(i=>{if(t==='broadcast')delete i.ospfNet;else i.ospfNet=t;});},['router']);
C('if','no ip ospf network',e=>e.s.ctx.forEach(i=>{delete i.ospfNet;}),['router']);
C('if','ip ospf <n> area <n>',e=>{if(!e.d.ospf){e.d.ospf={pid:e.args[0],rid:null,networks:[],passive:[],passiveDef:false,nonPassive:[],active:null};e.d.ospf.active=routerId(e.d)||null;}e.s.ctx.forEach(i=>{i.ospfArea=e.args[1];});},['router']);
C('if','no ip ospf <n> area <n>',e=>e.s.ctx.forEach(i=>{delete i.ospfArea;}),['router']);
C('ospf','auto-cost reference-bandwidth <n>',e=>{e.d.ospf.refBw=e.args[0];e.out('% OSPF: Reference bandwidth is changed.','        Please ensure reference bandwidth is consistent across all routers.');});
C(EX,'show ip ospf interface brief',e=>{const{net,d,out}=e;if(!d.ospf)return;
  out('Interface    PID   Area            IP Address/Mask    Cost  State Nbrs F/C');
  const os=ospfIfs(net,d);for(const o of sortIfs(os.map(x=>x.ifc.name)).map(n=>os.find(x=>x.ifc.name===n))){const i=o.ifc,nb=ospfNeighbors(net,d).filter(n=>n.ifc===i),me=ospfRole(net,d,i);
    const full=nb.filter(n=>me==='P2P'||me==='DR'||me==='BDR'||['DR','BDR'].includes(ospfRole(net,n.dev,n.pifc))).length;
    out(pad(shortIf(i.name),13)+pad(d.ospf.pid,6)+pad(o.area,16)+pad(n2ip(i.ip)+'/'+i.len,19)+pad(ospfCost(d,i),6)+pad(me==='DROTHER'?'DROTH':me,6)+full+'/'+nb.length);}},['router']);
C(EX,'show ip ospf interface <rest?>',e=>{const{net,d,out}=e;if(!d.ospf)return;const want=e.args[0]?parseIf(e.args[0]):null;if(e.args[0]&&(!want||!d.ifs[want]))return out(BAD);
  for(const o of ospfIfs(net,d)){const i=o.ifc;if(want&&i.name!==want)continue;const t=ospfType(i),role=ospfRole(net,d,i),nb=ospfNeighbors(net,d).filter(n=>n.ifc===i);
    out(i.name+' is up, line protocol is up','  Internet Address '+n2ip(i.ip)+'/'+i.len+', Area '+o.area+', Attached via '+(i.ospfArea!=null?'Interface Enable':'Network Statement'),
      '  Process ID '+d.ospf.pid+', Router ID '+n2ip(routerId(d))+', Network Type '+t+', Cost: '+ospfCost(d,i));
    if(t==='LOOPBACK'){out('  Loopback interface is treated as a stub Host');continue;}
    out('  Transmit Delay is 1 sec, State '+(role==='P2P'?'POINT_TO_POINT':role)+(t==='BROADCAST'?', Priority '+ospfPrio(i):''));
    if(t==='BROADCAST'&&!isPassive(d,i.name)){const s=(net.ospfDR||{})[segKey(i)]||{},find=n=>n===d.name?{rid:routerId(d),ip:i.ip}:(m=>m?{rid:routerId(m.dev),ip:m.pifc.ip}:null)(nb.find(m=>m.dev.name===n));
      const dr=find(s.dr),bdr=find(s.bdr);
      if(dr)out('  Designated Router (ID) '+n2ip(dr.rid)+', Interface address '+n2ip(dr.ip));
      out(bdr?'  Backup Designated router (ID) '+n2ip(bdr.rid)+', Interface address '+n2ip(bdr.ip):'  No backup designated router on this network');}
    {const [h,dd]=ospfTimers(i);out('  Timer intervals configured, Hello '+h+', Dead '+dd+', Wait '+dd+', Retransmit 5');}
    if(isPassive(d,i.name)){out('    No Hellos (Passive interface)');continue;}
    const adj=nb.filter(n=>role!=='DROTHER'||['DR','BDR'].includes(ospfRole(net,n.dev,n.pifc)));
    out('  Neighbor Count is '+nb.length+', Adjacent neighbor count is '+adj.length,...adj.map(n=>{const r=role==='P2P'?'':ospfRole(net,n.dev,n.pifc);return '    Adjacent with neighbor '+n2ip(routerId(n.dev))+(r==='DR'?'  (Designated Router)':r==='BDR'?'  (Backup Designated Router)':'');}));}},['router']);

// Native VLAN mismatch: CDP compares the native VLAN on both ends of a trunk and logs the difference.
function nativeMismatches(net,d){if(d.type!=='switch'||d.cdp===false)return [];
  return cdpPeers(net,d).filter(x=>x.p.type==='switch'&&x.i.mode==='trunk'&&x.pi.mode==='trunk'&&x.i.native!==x.pi.native)
    .map(x=>'%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on '+x.i.name+' ('+x.i.native+'), with '+x.p.hostname+' '+x.pi.name+' ('+x.pi.native+').');}
const execLine0=execLine;execLine=function(net,d,s,line){const before=new Set(nativeMismatches(net,d)),out=execLine0(net,d,s,line);
  for(const m of nativeMismatches(net,d))if(!before.has(m))out.push(m);return out;};

// record which command pattern ran, for the "why" hint
CMDS.forEach(c=>{const f=c.fn,k=c.pat.join(' ');c.fn=e=>{e.s.last=k;f(e);};});
const WHYC={
'enable':'Moves from user EXEC to privileged EXEC, where you can see the full config and enter configuration mode.',
'configure terminal':'Enters global configuration mode. Changes apply to the running config immediately.',
'hostname <w>':'Names the device so you always know which box you are on. The name also becomes part of the SSH key name.',
'enable secret <w>':'Protects privileged mode with a hashed password. Use secret, not enable password, which is stored in clear text.',
'no ip domain-lookup':'Stops the device treating a mistyped command as a hostname and hanging while it tries DNS.',
'banner motd <rest>':'Shows a legal warning before login. The first character you type is the delimiter that starts and ends the text.',
'line console <n>':'Selects the physical console port so you can secure local access.',
'line vty <n> <n>':'Selects the virtual lines used for remote Telnet/SSH sessions. 0 4 covers five simultaneous sessions.',
'password <w>':'Sets the password for this line. It is not used until login is also configured.',
'login':'Tells the line to actually prompt for the line password.',
'login local':'Authenticates against local usernames instead of one shared line password. SSH requires a username, so it needs this.',
'transport input <rest>':'Limits which remote-access protocols the VTY lines accept. ssh alone blocks Telnet, which sends passwords in clear text.',
'interface <rest>':'Enters configuration for one interface, or creates a subinterface, loopback, SVI or port-channel.',
'interface range <rest>':'Applies the next commands to several ports at once, which avoids typos from repeating yourself.',
'description <rest>':'Documents what is plugged in. It changes nothing functionally but saves time when troubleshooting.',
'ip address <ip> <ip>':'Gives the interface a Layer 3 address. The mask decides which addresses are local and creates the connected route.',
'no shutdown':'Router interfaces are administratively down by default. This brings the port up.',
'shutdown':'Administratively disables the port. Unused switch ports should be shut so nobody can plug in unnoticed.',
'copy running-config startup-config':'The running config lives in RAM and is lost on reload. This writes it to NVRAM so it survives.',
'ip default-gateway <ip>':'A Layer 2 switch does not route, so it needs a gateway to answer management traffic from other subnets.',
'vlan <n>':'Creates the VLAN in the switch database. A port assigned to a VLAN that does not exist will not forward.',
'name <w>':'Labels the VLAN so show vlan brief is readable months later.',
'switchport mode <w>':'Hard-sets the port: access carries one untagged VLAN to an end device; trunk carries many tagged VLANs between switches and routers. Setting it manually stops the port negotiating.',
'switchport access vlan <n>':'Places the access port in this VLAN, so the attached host joins that broadcast domain.',
'switchport trunk allowed vlan <rest>':'Restricts which VLANs cross the trunk. Fewer VLANs means less broadcast traffic and a smaller attack surface.',
'encapsulation dot1q <n>':'Tells the subinterface which VLAN tag it sends and receives. It must be set before the IP address.',
'ip route <ip> <ip> <rest>':'A static route: to reach this network, hand packets to this next hop (or out this interface). All zeros is the default route. A number at the end is the administrative distance; a higher one makes it a floating backup route.',
'router ospf <n>':'Starts an OSPF process. The process ID is local to this router and does not need to match its neighbors.',
'router-id <ip>':'Gives the router a stable identity in OSPF instead of letting it pick its highest interface address.',
'network <ip> <ip> area <n>':'Enables OSPF on interfaces whose address matches this network and wildcard, and advertises those networks. The wildcard is the inverse of the subnet mask.',
'passive-interface <rest>':'Keeps advertising the network but stops sending hellos out the port. No router lives on a user LAN, so hellos there are wasted and a security risk.',
'access-list <n> <w> <rest>':'Adds a line to a numbered ACL (1-99 standard, 100-199 extended). Lines are read top-down, the first match wins, and anything unmatched hits the invisible deny at the end.',
'ip access-list <w> <w>':'Creates or edits a named ACL. Names are easier to read and let you edit individual lines.',
'permit <rest>':'An ACL entry. Order matters: put specific lines first, because the first match decides.',
'deny <rest>':'An ACL entry. Order matters: put specific lines first, because the first match decides.',
'ip access-group <w> <w>':'An ACL does nothing until it is applied to an interface in a direction. Standard ACLs go close to the destination; extended ACLs go close to the source.',
'ip nat <w>':'Marks the interface as inside (private side) or outside (public side). NAT only translates traffic crossing from one to the other.',
'ip nat inside source list <w> interface <rest>':'PAT: any inside source the ACL permits is translated to this interface address. overload lets many hosts share it by tracking port numbers.',
'ip nat inside source static <ip> <ip>':'A permanent one-to-one mapping so outside hosts can start connections to an inside server.',
'ip dhcp excluded-address <ip> <rest?>':'Keeps the server from handing out addresses already used statically (gateway, switches, servers). Do this before building the pool.',
'ip dhcp pool <w>':'Creates a named pool of addresses and options for one subnet.',
'network <ip> <ip>':'Defines the subnet the pool leases from. The router matches a request to a pool by the interface (or relay) it came in on.',
'default-router <ip>':'The gateway that clients receive. Without it they cannot leave their own subnet.',
'dns-server <ip>':'The DNS server clients receive, so they can resolve names.',
'ip helper-address <ip>':'DHCP discovery is a broadcast and routers do not forward broadcasts. This relays it as a unicast to the server.',
'switchport port-security':'Turns on port security. It only works on ports hard-set to access or trunk, which is why mode comes first.',
'switchport port-security maximum <n>':'Limits how many MAC addresses may use the port, which stops someone hanging a switch or hub off it.',
'switchport port-security violation <w>':'What happens on a violation: shutdown err-disables the port, restrict drops and logs, protect drops silently.',
'switchport port-security mac-address sticky':'Learns the connected MAC and writes it into the config, so you do not type addresses by hand.',
'ip domain-name <w>':'The RSA key is named hostname.domain, so SSH needs both set first.',
'username <w> <rest>':'Creates a local account. secret stores a hash; privilege 15 lands the user straight in privileged mode.',
'crypto key generate rsa <rest?>':'Generates the key pair SSH uses for encryption. Use 2048 bits or more.',
'ip ssh version <n>':'SSH version 1 has known weaknesses, so force version 2.',
'spanning-tree vlan <w> root <w>':'Lowers this switch priority so it wins (primary) or comes second (secondary) in the root election, instead of leaving it to the lowest MAC address.',
'spanning-tree vlan <w> priority <n>':'Sets the bridge priority directly. Lowest wins the root election; values go in steps of 4096.',
'spanning-tree mode <w>':'Rapid PVST+ converges in a second or two instead of the 30-50 seconds classic STP takes.',
'spanning-tree portfast':'Skips the listening/learning delay on a port that connects to a single host, so the device gets on the network immediately.',
'spanning-tree bpduguard enable':'If a switch is ever plugged into this host port, the port err-disables instead of letting it affect the topology.',
'channel-group <n> mode <w>':'Bundles the port into an EtherChannel. active/passive use LACP (open standard), desirable/auto use PAgP (Cisco), on forces it with no negotiation.',
'ipconfig /renew':'Asks for a new DHCP lease, which is how you test that the server and any relay are working.',
'show ip interface brief':'One-line status of every interface: address, and whether it is up at Layer 1 and Layer 2.',
'show vlan brief':'Shows which VLANs exist and which access ports are in each one. Trunk ports do not appear here.',
'show interfaces trunk':'Shows which ports are trunking and which VLANs are allowed and active on them.',
'show ip route':'The routing table: what the router knows how to reach and how it learned it (C connected, S static, O OSPF).',
'show ip ospf neighbor':'Lists adjacencies. FULL means the two routers have exchanged their complete databases.',
'show access-lists':'Shows each ACL line with match counters, which tells you whether traffic is hitting the line you expect.',
'show ip nat translations':'Shows the live translation table: which inside address is using which public address and port.',
'show spanning-tree <rest?>':'Shows the root bridge, this switch priority, and each port role (root, designated, alternate/blocked).',
'show etherchannel summary':'P next to a port means it is bundled. SU on the port-channel means Layer 2 and in use.',
'show port-security <rest?>':'Shows which ports are secured, how many MACs they have learned and what happens on a violation.',
'show ip dhcp binding':'Lists the leases the server has handed out.',
'show running-config':'The configuration currently active in RAM.'
};
function whyOf(cmd){const t=cmd.trim().split(/\s+/);for(const c of CMDS){const r=matchPat(c.pat,t);if(r&&r!=='partial'){const w=WHYC[c.pat.join(' ')];if(w)return w;}}return '';}

