//LIBRARY-START
// ---------- lab library expansion ----------
// New labs are appended after the incidents so saved lab indexes stay valid. Each one's guide goes into STEPS,
// and its CCNA objectives come from CCNA_LAB_MAP like every other build lab.
// Cn registers a command like C and records it for the "why" hint; first=true puts it ahead of general patterns.
const Cn=(modes,pat,fn,types,first)=>{C(modes,pat,fn,types);const c=CMDS.pop(),f=c.fn;c.fn=e=>{e.s.last=pat;f(e);};if(first)CMDS.unshift(c);else CMDS.push(c);};
const cfg=incidentCommands;
const stepsOf=list=>list.map(t=>t.split(' ; ').map(g=>{const k=g.indexOf(': ');return {dev:g.slice(0,k),cmds:g.slice(k+2).split(' | ')};}));
function addLab(l,steps){STEPS[l.title]=steps;l.steps=stepsOf(steps);l.ccna=CCNA_LAB_MAP[l.title]||[];l.kind='build';LABS.push(l);}
const descIs=(n,dev,ifn,want)=>(IF(n,dev,ifn).desc||'').trim().toUpperCase()===want.toUpperCase();
Object.assign(CCNA_OBJECTIVES,{'2.3':'CDP and LLDP','3.2':'Forwarding decisions','3.5':'First-hop redundancy','1.8':'IPv6 addressing and prefixes','1.9':'IPv6 address types','4.2':'NTP client and server','4.5':'Syslog facilities and levels'});
Object.assign(CCNA_LAB_MAP,{
 'Native VLAN and allowed VLANs on trunks':['2.2']});
Object.assign(WHYC,{
'switchport trunk native vlan <n>':'Untagged frames on a trunk belong to the native VLAN. Moving it off VLAN 1 to an unused VLAN defeats double-tagging VLAN hopping. Both ends must agree, or traffic leaks between VLANs.',
'show interfaces trunk':'Shows which ports are trunking, the native VLAN on each, and which VLANs are allowed and active on them.'});

// ----- phase 1, lab 1
addLab({title:'Native VLAN and allowed VLANs on trunks',group:'Switching',
 brief:'Two floor switches share a trunk that still uses the factory defaults: native VLAN 1 and every VLAN allowed. Security wants the native VLAN moved to an unused VLAN, and the test-bench VLAN kept off the trunk so each floor\'s benches stay isolated.',
 pos:{SW1:[180,70],SW2:[420,70],PC1:[70,195],PC3:[250,195],PC2:[350,195],PC4:[530,195]},start:'SW1',
 build(){const n=mkNet([mkSwitch('SW1'),mkSwitch('SW2'),mkPC('PC1','192.168.10.11',24),mkPC('PC2','192.168.10.12',24),mkPC('PC3','192.168.30.13',24),mkPC('PC4','192.168.30.14',24)]);
  link(n,'SW1','g0/1','SW2','g0/1');link(n,'SW1','f0/1','PC1','f0');link(n,'SW2','f0/1','PC2','f0');link(n,'SW1','f0/3','PC3','f0');link(n,'SW2','f0/3','PC4','f0');
  const base=['enable','configure terminal','vlan 10','name STAFF','vlan 30','name BENCH','interface f0/1','switchport mode access','switchport access vlan 10','interface f0/3','switchport mode access','switchport access vlan 30','interface g0/1','switchport mode trunk','end'];
  cfg(n,{SW1:base,SW2:base});return n;},
 addr:[['PC1','SW1 Fa0/1, VLAN 10 STAFF','192.168.10.11/24'],['PC2','SW2 Fa0/1, VLAN 10 STAFF','192.168.10.12/24'],['PC3','SW1 Fa0/3, VLAN 30 BENCH','192.168.30.13/24'],['PC4','SW2 Fa0/3, VLAN 30 BENCH','192.168.30.14/24'],['Trunk','SW1 Gi0/1 to SW2 Gi0/1','Native 99, allowed 10 and 99']],
 tasks:['Run <code>show interfaces trunk</code> on both switches and note the native VLAN and allowed list. Ping PC4 from PC3: the bench VLAN crosses the trunk today.','On both switches, create VLAN 99 named <code>NATIVE</code>. No host will ever use it.','On SW1, set the native VLAN of Gi0/1 to 99. Read the message that appears.','On SW2, set the native VLAN of Gi0/1 to 99 as well.','On both switches, allow only VLANs 10 and 99 on Gi0/1.','Verify with <code>show interfaces trunk</code>. PC1 should still reach PC2, and PC3 should no longer reach PC4.'],
 why:['A trunk that works is not necessarily a trunk that is configured well. The defaults carry every VLAN and send VLAN 1 untagged, which is what attackers expect.','The native VLAN should be a VLAN no host is in. Then even if an attacker sends a double-tagged frame, the outer tag strips off into a VLAN with nobody to attack.','Each switch puts untagged frames into its own native VLAN. While the two ends disagree, untagged traffic from VLAN 99 on SW1 lands in VLAN 1 on SW2. CDP spots this and logs a native VLAN mismatch.','With both ends on VLAN 99 the mismatch clears. Always change both ends of a trunk together.','Pruning stops VLANs crossing a link that does not need them. Fewer VLANs on a trunk means less broadcast traffic and a smaller blast radius. The native VLAN stays in the list so untagged control traffic is accepted.','Check both the thing you changed and the things that must keep working. STAFF crosses because VLAN 10 is allowed; BENCH stops at each switch because VLAN 30 is not.'],
 checks:[['VLAN 99 named NATIVE exists on both switches',n=>vlanIs(n,'SW1',99,'NATIVE')&&vlanIs(n,'SW2',99,'NATIVE')],['Both ends of the trunk use native VLAN 99',n=>IF(n,'SW1','g0/1').native===99&&IF(n,'SW2','g0/1').native===99&&trunk(n,'SW1','g0/1')&&trunk(n,'SW2','g0/1')],['The trunk allows only VLANs 10 and 99 on both switches',n=>trunk(n,'SW1','g0/1',[10,99])&&trunk(n,'SW2','g0/1',[10,99])],['STAFF still crosses: PC1 reaches PC2',n=>P(n,'PC1','192.168.10.12')],['BENCH stays local: PC3 cannot reach PC4',n=>!P(n,'PC3','192.168.30.14')]],
 solution:{SW1:['enable','configure terminal','vlan 99','name NATIVE','interface g0/1','switchport trunk native vlan 99','switchport trunk allowed vlan 10,99','end','show interfaces trunk'],
  SW2:['enable','configure terminal','vlan 99','name NATIVE','interface g0/1','switchport trunk native vlan 99','switchport trunk allowed vlan 10,99','end']}},
 ['SW1: enable | show interfaces trunk ; SW2: enable | show interfaces trunk ; PC3: # VLAN 30 crosses the trunk today | ping 192.168.30.14',
  'SW1: configure terminal | vlan 99 | name NATIVE | exit ; SW2: configure terminal | vlan 99 | name NATIVE | exit',
  'SW1: interface g0/1 | switchport trunk native vlan 99 | # a native VLAN mismatch is logged: SW2 still uses VLAN 1',
  'SW2: interface g0/1 | switchport trunk native vlan 99',
  'SW1: switchport trunk allowed vlan 10,99 | end ; SW2: switchport trunk allowed vlan 10,99 | end',
  'SW1: show interfaces trunk ; PC1: ping 192.168.10.12 ; PC3: # this ping should now fail: VLAN 30 stays on each switch | ping 192.168.30.14']);

// ----- phase 1, lab 2
CCNA_LAB_MAP['Switch management access']=['1.6','5.3'];
Object.assign(WHYC,{
'show ip ssh':'Confirms SSH is enabled and which version the device accepts. 1.99 means both versions; 2.0 means version 2 only.'});
addLab({title:'Switch management access',group:'Fundamentals',
 brief:'The new access switch forwards user traffic fine, but nobody can manage it remotely: it has no management address. Give it one in the management VLAN, make sure it can answer the admin subnet, and allow SSH only.',
 pos:{ADMIN:[60,75],R1:[210,75],SW1:[380,120],PC1:[530,185]},start:'SW1',
 build(){const n=mkNet([mkRouter('R1'),mkSwitch('SW1'),mkPC('ADMIN','192.168.50.10',24,'192.168.50.1'),mkPC('PC1','192.168.10.20',24,'192.168.10.1')]);
  link(n,'ADMIN','f0','R1','g0/1');link(n,'R1','g0/0','SW1','g0/1');link(n,'SW1','f0/1','PC1','f0');
  cfg(n,{R1:['enable','configure terminal','interface g0/1','ip address 192.168.50.1 255.255.255.0','no shutdown','interface g0/0','no shutdown','interface g0/0.10','encapsulation dot1q 10','ip address 192.168.10.1 255.255.255.0','interface g0/0.99','encapsulation dot1q 99','ip address 192.168.99.1 255.255.255.0','end'],
   SW1:['enable','configure terminal','vlan 10','name USERS','interface f0/1','switchport mode access','switchport access vlan 10','interface g0/1','switchport mode trunk','end']});return n;},
 addr:[['ADMIN','Admin LAN','192.168.50.10/24'],['R1','G0/1 / G0/0.10 / G0/0.99','192.168.50.1, 192.168.10.1, 192.168.99.1'],['SW1','Interface VLAN 99 (MGMT)','192.168.99.2/24'],['PC1','VLAN 10 USERS','192.168.10.20/24'],['Login','netadmin','Mgmt-Pass1']],
 tasks:['From ADMIN, ping the switch at <code>192.168.99.2</code>. It fails: the switch has no management address yet.','On SW1, create VLAN 99 named <code>MGMT</code>.','Create <code>interface vlan 99</code>, give it 192.168.99.2/24 and bring it up.','Ping again from ADMIN. It still fails. Work out why, then set the switch\'s default gateway to R1 (192.168.99.1).','Prepare SSH on SW1: domain name <code>lab.local</code>, a 2048-bit RSA key, and user <code>netadmin</code> with secret <code>Mgmt-Pass1</code>.','On VTY lines 0 to 4, use the local user database and allow only SSH.','From ADMIN, <code>ssh -l netadmin 192.168.99.2</code> should work and Telnet should be refused.'],
 why:['Start from the symptom. A switch can forward frames perfectly while having no IP address at all: switching needs none. Management does.','A dedicated management VLAN keeps management traffic away from user VLANs, so users cannot even reach the switch\'s login prompt unless you route them there.','The SVI is the switch\'s own Layer 3 interface in that VLAN. It only comes up when the VLAN exists and at least one port carrying it is up, here the trunk to R1.','The ping request reaches the switch, but the reply is addressed to 192.168.50.10, which is not on the switch\'s subnet. A Layer 2 switch does not route, so it needs a default gateway, exactly like a PC.','SSH needs an RSA key, the key is named hostname.domain, and SSH logins need a username. Individual accounts beat one shared VTY password.','login local asks for a username and password; transport input ssh closes Telnet, which would send that password in clear text.','Test both sides: the secure way in works from another subnet, which proves the gateway too, and the insecure way is closed.'],
 checks:[['VLAN 99 named MGMT exists on SW1',n=>vlanIs(n,'SW1',99,'MGMT')],['Interface VLAN 99 is 192.168.99.2/24 and up',n=>hasIp(n,'SW1','vlan99','192.168.99.2',24)&&ifUp(n,n.devs.SW1,IF(n,'SW1','vlan99'))],['SW1 uses R1 as its default gateway',n=>n.devs.SW1.gw===ip2n('192.168.99.1')],['ADMIN, on another subnet, can ping SW1',n=>P(n,'ADMIN','192.168.99.2')],['VTY lines use local login and SSH only',n=>{const v=n.devs.SW1.lines.vty;return !!v.local&&(v.transport||'').trim().toLowerCase()==='ssh'&&(n.devs.SW1.users||[]).some(u=>u.name==='netadmin'&&u.kind==='secret');}],['ADMIN can SSH to SW1 and Telnet is refused',n=>T(n,'ADMIN','192.168.99.2',22)&&!T(n,'ADMIN','192.168.99.2',23)]],
 solution:{SW1:['enable','configure terminal','vlan 99','name MGMT','interface vlan 99','ip address 192.168.99.2 255.255.255.0','no shutdown','exit','ip default-gateway 192.168.99.1','ip domain-name lab.local','crypto key generate rsa modulus 2048','username netadmin privilege 15 secret Mgmt-Pass1','line vty 0 4','login local','transport input ssh','end'],ADMIN:['ssh -l netadmin 192.168.99.2','yes','Mgmt-Pass1','exit']}},
 ['ADMIN: # this ping fails: SW1 has no management address yet | ping 192.168.99.2',
  'SW1: enable | configure terminal | vlan 99 | name MGMT | exit',
  'SW1: interface vlan 99 | ip address 192.168.99.2 255.255.255.0 | no shutdown | end | show ip interface brief',
  'ADMIN: # still fails: the reply to 192.168.50.10 has nowhere to go | ping 192.168.99.2 ; SW1: configure terminal | ip default-gateway 192.168.99.1 ; ADMIN: ping 192.168.99.2',
  'SW1: ip domain-name lab.local | crypto key generate rsa modulus 2048 | username netadmin privilege 15 secret Mgmt-Pass1',
  'SW1: line vty 0 4 | login local | transport input ssh | end | show ip ssh',
  'ADMIN: ssh -l netadmin 192.168.99.2 | yes | Mgmt-Pass1 | exit | # Telnet should be refused | telnet 192.168.99.2']);

// ----- phase 1, lab 3
Cn('config','no enable password',e=>{e.d.enPass=null;});
CCNA_LAB_MAP['Locking down device access']=['5.3','4.8'];
Object.assign(WHYC,{
'service password-encryption':'Scrambles every clear-text password in the config (line, enable password, username password) with Cisco type 7. Type 7 is reversible, so it only stops shoulder-surfing; secrets are the real protection.',
'no enable password':'Removes the old clear-text enable password. When an enable secret exists IOS ignores the password anyway, but leaving it in the config hands out a password someone may reuse elsewhere.',
'exec-timeout <rest>':'Logs an idle session out after minutes and seconds. An unattended, logged-in console or SSH session is an open door. 0 0 disables the timer, which you should never do in production.',
'access-class <w> <w>':'Filters which source addresses may open a Telnet or SSH session to the device itself. It uses an ACL on the VTY lines, not on an interface, so it protects every address the router owns.',
'show startup-config':'The configuration saved in NVRAM, which the device loads on boot. Compare it with show running-config to see unsaved changes.',
'show running-config':'The configuration currently active in RAM. Read it before and after a change; it is also where clear-text passwords give themselves away.'});
addLab({title:'Locking down device access',group:'Security',
 brief:'The previous admin left R1 with shared clear-text passwords and Telnet open to everyone. Replace that with individual logins, SSH only from the admin subnet, idle timeouts and nothing readable in the config, then save it.',
 pos:{ADMIN:[90,65],PC1:[90,190],R1:[330,125]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkPC('ADMIN','192.168.10.10',24,'192.168.10.1'),mkPC('PC1','192.168.20.10',24,'192.168.20.1')]);link(n,'ADMIN','f0','R1','g0/0');link(n,'PC1','f0','R1','g0/1');
  cfg(n,{R1:['enable','configure terminal','interface g0/0','ip address 192.168.10.1 255.255.255.0','no shutdown','interface g0/1','ip address 192.168.20.1 255.255.255.0','no shutdown','exit','enable password cisco','ip domain-name lab.local','crypto key generate rsa modulus 2048','ip ssh version 2','line console 0','password conpass','login','line vty 0 4','password vtypass','login','transport input telnet ssh','end']});return n;},
 addr:[['ADMIN','Admin subnet (G0/0)','192.168.10.10/24'],['PC1','User subnet (G0/1)','192.168.20.10/24'],['R1','G0/0 / G0/1','192.168.10.1, 192.168.20.1'],['Login','admin','Adm1n-Pass'],['Enable secret','','En-Secret9']],
 tasks:['Run <code>show running-config</code> on R1 and find the readable passwords. Turn on <code>service password-encryption</code> and look again.','Replace the shared enable password with <code>enable secret En-Secret9</code>, remove the old one, and create user <code>admin</code> with privilege 15 and secret <code>Adm1n-Pass</code>.','On VTY lines 0 to 4: log in with local accounts, allow only SSH, and time idle sessions out after 5 minutes.','On the console line: log in with local accounts and time out after 5 minutes.','Create standard ACL 10 that permits only the admin subnet, 192.168.10.0/24.','Apply ACL 10 to the VTY lines with <code>access-class 10 in</code>.','Test: SSH from ADMIN as admin works; SSH from PC1 is refused.','Save the configuration and confirm it with <code>show startup-config</code>.'],
 why:['Anyone who sees a printout or a screen share of the config learns every password. Type 7 hides them from casual view, but it is reversible, so it is the first step, not the last.','enable secret is stored as a hash, unlike enable password. Personal accounts mean every login is attributable, and one person leaving does not force a password change for everyone.','login local asks for a username. transport input ssh closes Telnet, which sends credentials in clear text. The timeout closes sessions people forget about.','The console is physical access and deserves the same rules: a name per person and no session left logged in on an unattended laptop.','A standard ACL matches only the source address, which is exactly what access-class needs: who is allowed to log in. Anything not permitted hits the implicit deny.','access-class filters connections to the VTY lines themselves. Unlike an interface ACL, it protects the router however the connection arrives, on any of its addresses.','A refused connection from the user subnet proves the filter, and a working one from the admin subnet proves you did not lock yourself out.','Everything so far is in RAM. Until you copy it to startup-config, a reload undoes the whole hardening job.'],
 checks:[['No password is readable in the running config',n=>{const d=n.devs.R1;return !!d.svcEnc&&!runningConfig(n,d).some(l=>/(password|secret) (conpass|vtypass|cisco|Adm1n-Pass|En-Secret9)\b/.test(l));}],['An enable secret replaces the enable password, and admin has its own secret',n=>{const d=n.devs.R1;return d.secret==='En-Secret9'&&!d.enPass&&(d.users||[]).some(u=>u.name==='admin'&&u.kind==='secret'&&u.priv===15);}],['VTY lines: local login, SSH only, 5-minute timeout',n=>{const v=n.devs.R1.lines.vty;return !!v.local&&(v.transport||'').trim().toLowerCase()==='ssh'&&!!v.timeout&&v.timeout[0]===5&&v.timeout[1]===0;}],['Console: local login and a 5-minute timeout',n=>{const c=n.devs.R1.lines.con;return !!c.local&&!!c.timeout&&c.timeout[0]===5&&c.timeout[1]===0;}],['access-class 10 lets only the admin subnet reach the VTY lines',n=>{const d=n.devs.R1,v=d.lines.vty;return v.aclClass==='10'&&v.aclDir==='in'&&!vtyDenied(d,22,ip2n('192.168.10.10'))&&vtyDenied(d,22,ip2n('192.168.20.10'));}],['ADMIN can SSH to R1',n=>T(n,'ADMIN','192.168.10.1',22)],['PC1 is refused, even over SSH',n=>!T(n,'PC1','192.168.20.1',22)&&!T(n,'PC1','192.168.20.1',23)],['The startup config matches the running config',n=>{const d=n.devs.R1;return !!d.startup&&JSON.stringify(d.startup)===JSON.stringify(runningConfig(n,d).slice(2));}]],
 solution:{R1:['enable','cisco','configure terminal','service password-encryption','enable secret En-Secret9','no enable password','username admin privilege 15 secret Adm1n-Pass','line vty 0 4','login local','transport input ssh','exec-timeout 5 0','line console 0','login local','exec-timeout 5 0','exit','access-list 10 permit 192.168.10.0 0.0.0.255','line vty 0 4','access-class 10 in','end','copy running-config startup-config','<cr>'],ADMIN:['ssh -l admin 192.168.10.1','yes','Adm1n-Pass','exit']}},
 ['R1: enable | cisco | show running-config | configure terminal | service password-encryption | do show running-config',
  'R1: enable secret En-Secret9 | no enable password | username admin privilege 15 secret Adm1n-Pass',
  'R1: line vty 0 4 | login local | transport input ssh | exec-timeout 5 0',
  'R1: line console 0 | login local | exec-timeout 5 0 | exit',
  'R1: access-list 10 permit 192.168.10.0 0.0.0.255',
  'R1: line vty 0 4 | access-class 10 in | end',
  'ADMIN: ssh -l admin 192.168.10.1 | yes | Adm1n-Pass | exit ; PC1: # refused: the user subnet is not in ACL 10 | ssh -l admin 192.168.20.1',
  'R1: copy running-config startup-config | <cr> | show startup-config']);

// ----- phase 1, lab 4
// Adjacency changes are logged on the router where the command was typed, as IOS does.
{const nbKeys=(net,d)=>d.type==='router'&&d.ospf?new Map(ospfNeighbors(net,d).map(n=>[n2ip(routerId(n.dev))+' on '+n.ifc.name,n])):new Map();
 const ex0=execLine;execLine=function(net,d,s,line){const before=nbKeys(net,d),out=ex0(net,d,s,line),after=nbKeys(net,d),pid=d.ospf?d.ospf.pid:1;
  if(/^\s*cl/i.test(line))return out;
  for(const k of before.keys())if(!after.has(k))out.push('%OSPF-5-ADJCHG: Process '+pid+', Nbr '+k+' from FULL to DOWN, Neighbor Down: Interface down or detached');
  for(const k of after.keys())if(!before.has(k))out.push('%OSPF-5-ADJCHG: Process '+pid+', Nbr '+k+' from LOADING to FULL, Loading Done');
  return out;};}
// A hello arriving with the wrong area ID is dropped and logged, the main clue to an area mismatch. A router whose
// interface is not in area 0 but hears an area-0 hello logs the virtual-link form; otherwise the plain form. Each
// mismatch is logged when it appears and then at most once a minute (on the engine clock), like a rate-limited syslog.
function ospfAreaMismatches(net,d){const res=[];if(!d.ospf||d.ospf.resetting)return res;
  for(const o of ospfIfs(net,d)){if(isPassive(d,o.ifc.name))continue;
    for(const p of l2peers(net,d,o.ifc)){const pd=p.dev;if(!isL3(pd)||!pd.ospf||pd.ospf.resetting)continue;const po=ospfIfs(net,pd).find(x=>x.ifc===p.ifc);
      if(!po||po.area===o.area||isPassive(pd,p.ifc.name))continue;if(p.ifc.len!==o.ifc.len||netOf(p.ifc.ip,p.ifc.len)!==netOf(o.ifc.ip,o.ifc.len))continue;
      res.push({key:d.name+'|'+o.ifc.name+'|'+p.ifc.ip,msg:'%OSPF-4-ERRRCV: Received invalid packet: mismatched area ID'+(po.area===0&&o.area!==0?' from backbone area must be virtual-link but not found':'')+' from '+n2ip(p.ifc.ip)+', '+o.ifc.name});}}
  return res;}
{const ex0=execLine;execLine=function(net,d,s,line){const out=ex0(net,d,s,line),L=net.ospfErr||(net.ospfErr={}),now=simNow();
  for(const x of Object.values(net.devs)){if(x.type!=='router'&&!(x.type==='switch'&&isL3(x)))continue;
    for(const m of ospfAreaMismatches(net,x)){if(L[m.key]!=null&&now-L[m.key]<60000)continue;L[m.key]=now;if(x===d&&!s.vty)out.push(m.msg);else logEvent(net,x,m.msg);}}
  return out;};}
CCNA_LAB_MAP['OSPF router IDs and passive interfaces']=['3.4'];
Object.assign(WHYC,{
'passive-interface <rest>':'Keeps advertising the network but stops sending and receiving hellos on the port, so no neighbor can form there. passive-interface default makes every port passive; then you open only the router-to-router links with no passive-interface.',
'no passive-interface <rest>':'After passive-interface default, this re-enables hellos on one interface: the links where you expect a neighbor router.',
'clear ip ospf process':'Restarts OSPF. Neighbors drop and re-form, and the router picks up a newly configured router ID. Disruptive, so do it in a maintenance window.',
'show ip protocols':'Summarises each routing protocol: its router ID, which networks it runs on, which interfaces are passive, and which routers it is learning from.',
'show ip ospf':'Shows the OSPF process: its router ID and how many interfaces are in each area.',
'show ip ospf neighbor':'Lists adjacencies. FULL means the two routers have exchanged their complete databases. A neighbor you did not expect is a red flag.'});
addLab({title:'OSPF router IDs and passive interfaces',group:'Routing',
 brief:'OSPF is running between R1 and R2, but nobody set router IDs and every interface sends hellos. Someone has plugged a router into the user LAN and it is now injecting a route into your network. Give the routers fixed IDs and stop OSPF talking on user ports.',
 pos:{PC1:[45,60],ROGUE:[45,195],SW1:[150,125],R1:[290,125],R2:[430,125],PC2:[555,125]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('R2'),mkRouter('ROGUE'),mkSwitch('SW1'),mkPC('PC1','192.168.1.10',24,'192.168.1.1'),mkPC('PC2','192.168.2.10',24,'192.168.2.1')]);
  link(n,'PC1','f0','SW1','f0/1');link(n,'ROGUE','g0/0','SW1','f0/2');link(n,'SW1','g0/1','R1','g0/0');link(n,'R1','g0/1','R2','g0/1');link(n,'R2','g0/0','PC2','f0');
  cfg(n,{R1:['enable','configure terminal','interface g0/0','ip address 192.168.1.1 255.255.255.0','no shutdown','interface g0/1','ip address 10.0.12.1 255.255.255.252','no shutdown','router ospf 1','network 192.168.1.0 0.0.0.255 area 0','network 10.0.12.0 0.0.0.3 area 0','end'],
   R2:['enable','configure terminal','interface g0/0','ip address 192.168.2.1 255.255.255.0','no shutdown','interface g0/1','ip address 10.0.12.2 255.255.255.252','no shutdown','router ospf 1','network 192.168.2.0 0.0.0.255 area 0','network 10.0.12.0 0.0.0.3 area 0','end'],
   ROGUE:['enable','configure terminal','interface g0/0','ip address 192.168.1.99 255.255.255.0','no shutdown','interface loopback 0','ip address 10.66.66.1 255.255.255.0','router ospf 9','network 0.0.0.0 255.255.255.255 area 0','end']});return n;},
 addr:[['R1','G0/0 (user LAN) / G0/1','192.168.1.1/24, 10.0.12.1/30'],['R2','G0/0 (user LAN) / G0/1','192.168.2.1/24, 10.0.12.2/30'],['ROGUE','Unauthorised, on R1\'s LAN','192.168.1.99'],['Router IDs','R1 / R2','1.1.1.1 / 2.2.2.2']],
 tasks:['On R1, run <code>show ip ospf neighbor</code> and <code>show ip protocols</code>: note the router ID R1 chose and the neighbor on the user LAN. On R2, find the rogue route in <code>show ip route</code>.','Set the router IDs: <code>1.1.1.1</code> on R1 and <code>2.2.2.2</code> on R2. Read the message.','Restart OSPF on both routers with <code>clear ip ospf process</code> so the new IDs take effect.','On both routers, make every interface passive with <code>passive-interface default</code>.','Re-enable hellos only on the link between the routers, G0/1, on both routers.','Verify: R1\'s only neighbor is R2, the rogue route is gone from R2, R2 still has a route to R1\'s user LAN, and PC1 can ping PC2.'],
 why:['Without router-id, OSPF picks the highest loopback address, or failing that the highest active interface address, when the process starts. That ID can surprise you, and neighbors that see a duplicate ID refuse to form at all.','The router ID is how every other router names this one in its database. A fixed, meaningful ID makes neighbor tables and logs readable at a glance.','The ID is chosen once, when the process starts. Changing it on a live router needs a restart of the process, which briefly drops every adjacency.','Any port that sends hellos will accept a neighbor. On a user LAN that means anyone with a router, or a laptop running routing software, can inject routes. Default-passive is the safe starting point.','The networks on passive interfaces are still advertised. Only the links that really have a neighbor router on them need hellos.','Check all three outcomes: the unwanted adjacency is gone, the routes you need are still there, and traffic still flows end to end.'],
 checks:[['R1 and R2 are running with router IDs 1.1.1.1 and 2.2.2.2',n=>routerId(n.devs.R1)===ip2n('1.1.1.1')&&routerId(n.devs.R2)===ip2n('2.2.2.2')],['Both routers are passive by default, with G0/1 still sending hellos',n=>['R1','R2'].every(r=>{const d=n.devs[r];return !!d.ospf&&!!d.ospf.passiveDef&&isPassive(d,'GigabitEthernet0/0')&&!isPassive(d,'GigabitEthernet0/1');})],['R1\'s only OSPF neighbor is R2',n=>{const nb=ospfNeighbors(n,n.devs.R1);return nb.length===1&&nb[0].dev===n.devs.R2;}],['R2 no longer learns the rogue route to 10.66.66.1',n=>!ospfRoutes(n,n.devs.R2).some(o=>netOf(ip2n('10.66.66.1'),o.len)===o.net)],['R2 still learns R1\'s user LAN, 192.168.1.0/24',n=>ospfRoutes(n,n.devs.R2).some(o=>o.net===ip2n('192.168.1.0')&&o.len===24)],['PC1 can ping PC2',n=>P(n,'PC1','192.168.2.10')]],
 solution:{R1:['enable','configure terminal','router ospf 1','router-id 1.1.1.1','passive-interface default','no passive-interface g0/1','end','clear ip ospf process'],
  R2:['enable','configure terminal','router ospf 1','router-id 2.2.2.2','passive-interface default','no passive-interface g0/1','end','clear ip ospf process']}},
 ['R1: enable | show ip ospf neighbor | show ip protocols ; R2: enable | # look for the O route to 10.66.66.1 | show ip route',
  'R1: configure terminal | router ospf 1 | router-id 1.1.1.1 ; R2: configure terminal | router ospf 1 | router-id 2.2.2.2',
  'R1: end | clear ip ospf process ; R2: end | clear ip ospf process ; R1: show ip ospf',
  'R1: configure terminal | router ospf 1 | passive-interface default ; R2: configure terminal | router ospf 1 | passive-interface default',
  'R1: no passive-interface g0/1 | end ; R2: no passive-interface g0/1 | end',
  'R1: show ip ospf neighbor | show ip protocols ; R2: show ip route ; PC1: ping 192.168.2.10']);

// ----- phase 1, lab 5
CCNA_LAB_MAP['Per-VLAN root bridges']=['2.5'];
const stpRole=(n,sw,v,ifn)=>{const r=stpCalc(n,v),p=r&&r.info[sw]&&r.info[sw].ports[parseIf(ifn)];return p?p.role:null;};
addLab({title:'Per-VLAN root bridges',group:'Switching',
 brief:'Two distribution switches and one access switch, with VLAN 10 and VLAN 20 on every trunk. Right now the old access switch is root for everything, and one uplink sits idle. Make each distribution switch root for one VLAN and backup for the other, so both uplinks carry traffic.',
 pos:{PC4:[55,50],DSW1:[180,50],DSW2:[420,50],PC3:[545,50],ASW1:[300,120],PC1:[175,190],PC2:[425,190]},start:'ASW1',
 build(){const a=mkSwitch('DSW1'),b=mkSwitch('DSW2'),c=mkSwitch('ASW1');a.mac='0019.e8a2.3c00';b.mac='0019.e8a2.4d00';c.mac='0009.7c11.0100';
  const n=mkNet([a,b,c,mkPC('PC1','192.168.10.11',24),mkPC('PC2','192.168.20.12',24),mkPC('PC3','192.168.10.13',24),mkPC('PC4','192.168.20.14',24)]);
  link(n,'DSW1','g0/1','DSW2','g0/1');link(n,'DSW1','g0/2','ASW1','g0/1');link(n,'DSW2','g0/2','ASW1','g0/2');
  link(n,'ASW1','f0/1','PC1','f0');link(n,'ASW1','f0/2','PC2','f0');link(n,'DSW2','f0/1','PC3','f0');link(n,'DSW1','f0/1','PC4','f0');
  const v=['enable','configure terminal','vlan 10','name STAFF','vlan 20','name GUEST','interface range g0/1 - 2','switchport mode trunk','exit'];
  cfg(n,{DSW1:v.concat('interface f0/1','switchport mode access','switchport access vlan 20','end'),DSW2:v.concat('interface f0/1','switchport mode access','switchport access vlan 10','end'),
   ASW1:v.concat('interface f0/1','switchport mode access','switchport access vlan 10','interface f0/2','switchport mode access','switchport access vlan 20','end')});return n;},
 addr:[['DSW1','Root for VLAN 10, backup for 20','MAC 0019.e8a2.3c00'],['DSW2','Root for VLAN 20, backup for 10','MAC 0019.e8a2.4d00'],['ASW1','Access switch, oldest','MAC 0009.7c11.0100'],['PC1 / PC3','VLAN 10 STAFF','192.168.10.11, .13'],['PC2 / PC4','VLAN 20 GUEST','192.168.20.12, .14']],
 tasks:['On ASW1, run <code>show spanning-tree vlan 10</code> and <code>show spanning-tree vlan 20</code>. Which switch is root, and why?','Switch all three switches to Rapid PVST+.','On DSW1, make it the primary root for VLAN 10 and the secondary root for VLAN 20.','On DSW2, make it the primary root for VLAN 20 and the secondary root for VLAN 10.','On ASW1, check both VLANs again: the root port for VLAN 10 should be Gi0/1 and for VLAN 20 Gi0/2, with the other uplink blocking in each.','Ping PC3 from PC1 and PC4 from PC2.'],
 why:['With every priority at the default 32768, the lowest MAC address wins, and the oldest switch usually has it. An access switch as root forces traffic through the weakest box in the network.','Rapid PVST+ runs a separate tree per VLAN, which is what makes per-VLAN roots possible, and it reconverges in about a second instead of 30 to 50.','root primary is a macro, not a value: it sets 24576, or 4096 below the current root if 24576 would not be enough. root secondary sets 28672, so this switch takes over if the primary fails.','Mirroring the roles splits the VLANs across the two distribution switches. Each one is the centre of one tree and the standby for the other.','Each VLAN has its own tree, so each blocks a different uplink. Both uplinks now carry traffic: VLAN 10 on one, VLAN 20 on the other. If either distribution switch fails, its VLAN fails over to the other.','Spanning tree changes paths, never reachability. Hosts in the same VLAN must still reach each other after the change.'],
 checks:[['All three switches run Rapid PVST+',n=>['DSW1','DSW2','ASW1'].every(s=>n.devs[s].stp&&n.devs[s].stp.mode==='rapid-pvst')],['DSW1 is root for VLAN 10 and DSW2 is root for VLAN 20',n=>stpCalc(n,10).root===n.devs.DSW1&&stpCalc(n,20).root===n.devs.DSW2],['Each distribution switch is secondary root for the other VLAN',n=>stpPrio(n.devs.DSW2,10)===28672+10&&stpPrio(n.devs.DSW1,20)===28672+20],['ASW1 uses Gi0/1 for VLAN 10 and Gi0/2 for VLAN 20, blocking the other uplink',n=>stpRole(n,'ASW1',10,'g0/1')==='Root'&&stpRole(n,'ASW1',10,'g0/2')==='Altn'&&stpRole(n,'ASW1',20,'g0/2')==='Root'&&stpRole(n,'ASW1',20,'g0/1')==='Altn'],['PC1 reaches PC3 and PC2 reaches PC4',n=>P(n,'PC1','192.168.10.13')&&P(n,'PC2','192.168.20.14')]],
 solution:{DSW1:['enable','configure terminal','spanning-tree mode rapid-pvst','spanning-tree vlan 10 root primary','spanning-tree vlan 20 root secondary','end'],
  DSW2:['enable','configure terminal','spanning-tree mode rapid-pvst','spanning-tree vlan 20 root primary','spanning-tree vlan 10 root secondary','end'],
  ASW1:['enable','configure terminal','spanning-tree mode rapid-pvst','end','show spanning-tree vlan 10']}},
 ['ASW1: enable | show spanning-tree vlan 10 | show spanning-tree vlan 20',
  'DSW1: enable | configure terminal | spanning-tree mode rapid-pvst ; DSW2: enable | configure terminal | spanning-tree mode rapid-pvst ; ASW1: configure terminal | spanning-tree mode rapid-pvst | end',
  'DSW1: spanning-tree vlan 10 root primary | spanning-tree vlan 20 root secondary | end',
  'DSW2: spanning-tree vlan 20 root primary | spanning-tree vlan 10 root secondary | end',
  'ASW1: # root port Gi0/1, and Gi0/2 Altn BLK | show spanning-tree vlan 10 | # now the other way round | show spanning-tree vlan 20',
  'PC1: ping 192.168.10.13 ; PC2: ping 192.168.20.14']);

// ----- phase 1, lab 6
CCNA_LAB_MAP['Map an unknown network with CDP']=['2.3'];
// Every cabled interface to another router or switch must read TO-<neighbor hostname>-<neighbor port>, judged against the real cabling.
const linksDescribed=(n,dev)=>Object.values(n.devs[dev].ifs).filter(i=>i.link&&n.devs[i.link.dev].type!=='pc').every(i=>{const p=n.devs[i.link.dev];return (i.desc||'').trim().toUpperCase()===('TO-'+p.hostname+'-'+shortIf(i.link.ifn)).toUpperCase();});
Object.assign(WHYC,{
'show cdp neighbors':'Lists the Cisco devices directly connected to this one: their hostname, which of your ports they are on (Local Intrfce) and which of their ports you are on (Port ID). It sees only one hop.',
'show cdp neighbors detail':'Adds each neighbor\'s IP address, platform and software version. Useful for documentation, and exactly what an attacker would like to read.',
'show cdp':'Shows whether CDP is running globally and its timers: an advertisement every 60 seconds, forgotten after 180.',
'cdp run':'Turns CDP on for the whole device. It is on by default on Cisco gear.',
'no cdp run':'Turns CDP off on every interface. That also blinds you to your own neighbors, so prefer disabling it per interface where it faces outsiders.',
'cdp enable':'Turns CDP back on for one interface.',
'no cdp enable':'Stops CDP on this interface only. Use it on ports facing the internet, a provider or untrusted users, so they cannot learn your device names, models and addresses.'});
addLab({title:'Map an unknown network with CDP',group:'Switching',hidePorts:true,
 brief:'You have inherited a network with no documentation: nobody knows which port connects to what, and the map shows devices but not ports. Use CDP to discover the cabling, label every link, and stop the internet edge advertising your devices to the provider.',
 pos:{SW2:[110,200],SW1:[250,110],R1:[400,60],ISP:[545,60],SW3:[400,200]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('ISP'),mkSwitch('SW1'),mkSwitch('SW2'),mkSwitch('SW3')]);
  link(n,'R1','g0/1','ISP','g0/0');link(n,'R1','g0/0','SW1','g0/2');link(n,'SW1','g0/1','SW2','g0/2');link(n,'SW1','f0/8','SW3','g0/1');link(n,'SW2','g0/1','SW3','g0/2');
  const sw=(h,ip)=>['enable','configure terminal','hostname '+h,'interface vlan 1','ip address '+ip+' 255.255.255.0','no shutdown','exit','ip default-gateway 192.168.1.1','end'];
  cfg(n,{R1:['enable','configure terminal','hostname EDGE','interface g0/0','ip address 192.168.1.1 255.255.255.0','no shutdown','interface g0/1','ip address 203.0.113.2 255.255.255.252','no shutdown','end'],
   ISP:['enable','configure terminal','hostname ISP-PE','interface g0/0','ip address 203.0.113.1 255.255.255.252','no shutdown','end'],SW1:sw('CORE','192.168.1.2'),SW2:sw('ACC-A','192.168.1.3'),SW3:sw('ACC-B','192.168.1.4')});return n;},
 addr:[['EDGE','LAN / internet','192.168.1.1/24, 203.0.113.2/30'],['ISP-PE','Provider router (not yours)','203.0.113.1/30'],['Switches','Management, VLAN 1','192.168.1.2 to .4'],['Description format','TO-&lt;neighbor&gt;-&lt;neighbor port&gt;','e.g. TO-SW9-Fa0/3']],
 tasks:['On EDGE, run <code>show cdp neighbors</code>. Work out which of EDGE\'s ports leads where, and the neighbor\'s port at the far end.','On EDGE, describe both cabled interfaces as <code>TO-&lt;neighbor hostname&gt;-&lt;neighbor port&gt;</code>, using the short port name CDP shows, for example <code>TO-SW9-Fa0/3</code>.','Do the same for the three cabled interfaces on CORE.','Do the same for the two cabled interfaces on ACC-A.','Do the same for the two cabled interfaces on ACC-B.','Stop CDP on EDGE\'s internet-facing interface only, then confirm on ISP-PE that EDGE has disappeared from <code>show cdp neighbors</code>.','On CORE, use <code>show cdp neighbors detail</code> to find ACC-B\'s management address, and ping it from EDGE.'],
 why:['CDP is a Layer 2 protocol, so it works before any IP is configured and between devices in different subnets. Device ID is the neighbor\'s hostname; Local Intrfce is your port; Port ID is theirs.','A description costs nothing and saves the next engineer from tracing cables. Naming both the device and its port means you can follow the cable from either end.','A core switch has the most links, so it is where a wrong label would mislead the most people. CDP runs per port, so every port gives its own answer.','Access switches often connect to each other as well as to the core. Those cross-links are easy to miss without discovery.','Fa0/8 on CORE is not where you would expect an uplink. CDP does not care about expectations; it reports what is really plugged in.','CDP advertises your hostname, model, software version and addresses to whoever is on the other end, including your provider or an attacker. Turn it off per interface where you do not trust the neighbor, and keep it inside, where it helps you.','The detail view gives each neighbor\'s management address, which turns discovery into something you can reach and log in to.'],
 checks:[['EDGE\'s links are labelled to match the cabling',n=>linksDescribed(n,'R1')],['CORE\'s links are labelled to match the cabling',n=>linksDescribed(n,'SW1')],['ACC-A\'s links are labelled to match the cabling',n=>linksDescribed(n,'SW2')],['ACC-B\'s links are labelled to match the cabling',n=>linksDescribed(n,'SW3')],['ISP-PE can no longer see EDGE through CDP',n=>!cdpPeers(n,n.devs.ISP).some(x=>x.p===n.devs.R1)],['CDP still runs inside: EDGE still sees CORE',n=>cdpPeers(n,n.devs.R1).some(x=>x.p===n.devs.SW1)],['EDGE can ping ACC-B\'s management address',n=>P(n,'R1','192.168.1.4')]],
 solution:{R1:['enable','configure terminal','interface g0/0','description TO-CORE-Gi0/2','interface g0/1','description TO-ISP-PE-Gi0/0','no cdp enable','end'],
  SW1:['enable','configure terminal','interface g0/2','description TO-EDGE-Gi0/0','interface g0/1','description TO-ACC-A-Gi0/2','interface f0/8','description TO-ACC-B-Gi0/1','end'],
  SW2:['enable','configure terminal','interface g0/2','description TO-CORE-Gi0/1','interface g0/1','description TO-ACC-B-Gi0/2','end'],
  SW3:['enable','configure terminal','interface g0/1','description TO-CORE-Fa0/8','interface g0/2','description TO-ACC-A-Gi0/1','end']}},
 ['R1: enable | show cdp neighbors',
  'R1: configure terminal | interface g0/0 | description TO-CORE-Gi0/2 | interface g0/1 | description TO-ISP-PE-Gi0/0 | end',
  'SW1: enable | show cdp neighbors | configure terminal | interface g0/2 | description TO-EDGE-Gi0/0 | interface g0/1 | description TO-ACC-A-Gi0/2 | interface f0/8 | description TO-ACC-B-Gi0/1 | end',
  'SW2: enable | show cdp neighbors | configure terminal | interface g0/2 | description TO-CORE-Gi0/1 | interface g0/1 | description TO-ACC-B-Gi0/2 | end',
  'SW3: enable | show cdp neighbors | configure terminal | interface g0/1 | description TO-CORE-Fa0/8 | interface g0/2 | description TO-ACC-A-Gi0/1 | end',
  'R1: configure terminal | interface g0/1 | no cdp enable | end ; ISP: enable | # EDGE is no longer listed | show cdp neighbors',
  'SW1: show cdp neighbors detail ; R1: ping 192.168.1.4']);

// ----- phase 1, lab 7
CCNA_LAB_MAP['Small office build']=['3.3','4.1','4.6'];
Object.assign(WHYC,{
'ipconfig /release':'Gives the DHCP lease back, leaving the host with no address. Pair it with /renew to watch a fresh lease being handed out.',
'ipconfig':'Shows the host\'s address, mask and default gateway. The first thing to check when a host cannot reach anything.',
'ping <ip>':'Sends ICMP echo requests and waits for replies. A reply proves the path works in both directions, not just one. On IOS each echo prints a symbol: ! is a reply, . is a timeout (often the first echo, lost while a router ARPs for its next hop), and U is an unreachable sent back by a router with no route or an ACL that dropped it.',
'show ip dhcp binding':'Lists the leases the server has handed out: which address went to which client hardware address.'});
addLab({title:'Small office build',group:'IP services',
 brief:'A new branch office: two PCs, a switch, and a router fresh out of the box with a link to the ISP. Bring the router up, give the PCs their addresses automatically, and get them to the internet through the single public address the ISP assigned.',
 pos:{PC1:[45,70],PC2:[45,185],SW1:[160,125],R1:[285,125],ISP:[415,125],WEB:[545,125]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('ISP'),mkSwitch('SW1'),mkPC('PC1',null,24),mkPC('PC2',null,24),srv('WEB','198.51.100.10',24,'198.51.100.1',[80])]);
  link(n,'PC1','f0','SW1','f0/1');link(n,'PC2','f0','SW1','f0/2');link(n,'SW1','g0/1','R1','g0/0');link(n,'R1','g0/1','ISP','g0/0');link(n,'ISP','g0/1','WEB','f0');
  setIp(n,'ISP','g0/0','203.0.113.1',30);setIp(n,'ISP','g0/1','198.51.100.1',24);return n;},
 addr:[['R1','G0/0 (office LAN)','192.168.1.1/24'],['R1','G0/1 (to ISP)','203.0.113.2/30'],['ISP','Next hop','203.0.113.1'],['DHCP','Pool OFFICE, .1 to .20 reserved','DNS 198.51.100.53'],['WEB','Web server','198.51.100.10']],
 tasks:['On R1, address G0/0 and G0/1 from the table and bring both up.','Add a default route to the ISP. From R1, ping 198.51.100.10: the router itself can already reach the internet.','Reserve 192.168.1.1 to 192.168.1.20, then create pool <code>OFFICE</code> for 192.168.1.0/24 with gateway 192.168.1.1 and DNS server 198.51.100.53.','On both PCs run <code>ipconfig /renew</code> and check the lease. Ping the web server from PC1: it fails. Why?','Create standard ACL 1 permitting 192.168.1.0/24, and mark G0/0 as NAT inside and G0/1 as NAT outside.','Translate everything ACL 1 permits to G0/1\'s address, with <code>overload</code>.','Test: PC1 opens the website with <code>telnet 198.51.100.10 80</code>, PC2 pings it, and <code>show ip nat translations</code> on R1 shows the shared address.'],
 why:['Router interfaces ship shut down with no address. The LAN address becomes the PCs\' gateway; the outside address is the one the ISP gave you.','A branch has one way out, so one default route covers the whole internet. R1\'s own pings work because they come from 203.0.113.2, an address the ISP knows how to reach.','The reserved range keeps DHCP away from the router, switches and printers. The pool tells clients their address, how to leave the subnet (gateway) and how to resolve names (DNS).','The PCs now have addresses and a gateway, and the request reaches the server. But the reply is addressed to 192.168.1.x, a private range the ISP will never route back.','The ACL is not a filter here: it only selects which source addresses get translated. inside and outside tell R1 which direction is which.','PAT rewrites each private source to R1\'s one public address and keeps the sessions apart by port number, so the whole office shares a single address.','The translation table is the proof: inside local addresses on the left, the shared inside global address on the right.'],
 checks:[['R1 G0/0 and G0/1 are addressed and up',n=>hasIp(n,'R1','g0/0','192.168.1.1',24)&&hasIp(n,'R1','g0/1','203.0.113.2',30)&&ifUp(n,n.devs.R1,IF(n,'R1','g0/0'))&&ifUp(n,n.devs.R1,IF(n,'R1','g0/1'))],['R1 has a default route to the ISP',n=>n.devs.R1.statics.some(s=>s.len===0&&s.nh===ip2n('203.0.113.1'))],['Pool OFFICE serves 192.168.1.0/24 with the gateway and DNS, and .1 to .20 are reserved',n=>{const D=n.devs.R1.dhcp;return !!D&&!!D.pools.OFFICE&&D.pools.OFFICE.net===ip2n('192.168.1.0')&&D.pools.OFFICE.len===24&&D.pools.OFFICE.gw===ip2n('192.168.1.1')&&D.pools.OFFICE.dns===ip2n('198.51.100.53')&&D.excluded.some(([a,b])=>a<=ip2n('192.168.1.1')&&b>=ip2n('192.168.1.20'));}],['PC1 and PC2 hold leases above .20 with gateway 192.168.1.1',n=>['PC1','PC2'].every(p=>{const ip=nic(n.devs[p]).ip;return ip!==null&&ip>ip2n('192.168.1.20')&&ip<ip2n('192.168.1.255')&&n.devs[p].gw===ip2n('192.168.1.1');})],['PAT overloads G0/1 for the office LAN',n=>{const d=n.devs.R1;return IF(n,'R1','g0/0').nat==='inside'&&IF(n,'R1','g0/1').nat==='outside'&&!!d.nat&&d.nat.rules.some(r=>r.overload&&r.ifn==='GigabitEthernet0/1'&&d.acls&&d.acls[r.acl]&&d.acls[r.acl].entries.some(e=>e.action==='permit'&&hit(e.src,ip2n('192.168.1.21'))));}],['PC1 opens the website and PC2 can ping it',n=>T(n,'PC1','198.51.100.10',80)&&P(n,'PC2','198.51.100.10')],['The ISP was not given a route to the private LAN',n=>!n.devs.ISP.statics.some(s=>netOf(ip2n('192.168.1.21'),s.len)===s.net)&&!n.devs.ISP.ospf]],
 solution:{R1:['enable','configure terminal','interface g0/0','ip address 192.168.1.1 255.255.255.0','no shutdown','interface g0/1','ip address 203.0.113.2 255.255.255.252','no shutdown','exit','ip route 0.0.0.0 0.0.0.0 203.0.113.1','ip dhcp excluded-address 192.168.1.1 192.168.1.20','ip dhcp pool OFFICE','network 192.168.1.0 255.255.255.0','default-router 192.168.1.1','dns-server 198.51.100.53','exit','access-list 1 permit 192.168.1.0 0.0.0.255','interface g0/0','ip nat inside','interface g0/1','ip nat outside','exit','ip nat inside source list 1 interface g0/1 overload','end'],
  PC1:['ipconfig /renew','telnet 198.51.100.10 80'],PC2:['ipconfig /renew','ping 198.51.100.10']}},
 ['R1: enable | configure terminal | interface g0/0 | ip address 192.168.1.1 255.255.255.0 | no shutdown | interface g0/1 | ip address 203.0.113.2 255.255.255.252 | no shutdown | exit',
  'R1: ip route 0.0.0.0 0.0.0.0 203.0.113.1 | do ping 198.51.100.10',
  'R1: ip dhcp excluded-address 192.168.1.1 192.168.1.20 | ip dhcp pool OFFICE | network 192.168.1.0 255.255.255.0 | default-router 192.168.1.1 | dns-server 198.51.100.53 | exit',
  'PC1: ipconfig /renew ; PC2: ipconfig /renew ; R1: do show ip dhcp binding ; PC1: # fails: the reply is addressed to a private range the ISP cannot route | ping 198.51.100.10',
  'R1: access-list 1 permit 192.168.1.0 0.0.0.255 | interface g0/0 | ip nat inside | interface g0/1 | ip nat outside | exit',
  'R1: ip nat inside source list 1 interface g0/1 overload | end',
  'PC1: telnet 198.51.100.10 80 ; PC2: ping 198.51.100.10 ; R1: show ip nat translations']);

// ===== phase 2 =====
Cn('if','no ip proxy-arp',e=>e.s.ctx.forEach(i=>{i.proxyArp=false;}),['router']);
Cn('if','ip proxy-arp',e=>e.s.ctx.forEach(i=>{i.proxyArp=true;}),['router']);
// Run fn with an interface shut, then put it back: lets a check prove what happens when a link fails.
function whileDown(n,dev,ifn,fn){const i=IF(n,dev,ifn),was=i.shutdown;i.shutdown=true;try{return fn();}finally{i.shutdown=was;}}
const pathVia=(n,from,to,hop)=>{const f=tracePath(n,n.devs[from],ip2n(to));return f.ok&&f.hops.includes(ip2n(hop));};
Object.assign(WHYC,{
'show ip route <ip>':'Shows the single entry the router would use for that address, how it was learned and its distance and metric. The fastest way to answer "which route wins?"',
'show ip route <w>':'Shows only one kind of route: static, ospf or connected.',
'no ip proxy-arp':'Stops this interface answering ARP requests on behalf of other networks. Proxy ARP hides misconfigurations, so many networks turn it off.',
'ip proxy-arp':'Lets the router answer ARP for addresses it can route to. It is on by default.',
'traceroute <ip>':'Lists each router on the path, one per line. * means that hop sent nothing back (often it has no route back to you); !H or !A means a router refused the packet because it had no route or an ACL denied it. Stop a long run of * with Ctrl+Shift+6.',
'tracert <ip>':'Windows traceroute: lists each router on the path to the destination. A row of * with Request timed out means that hop did not answer; press Ctrl+C to stop.'});

// ----- phase 2, lab 8
CCNA_LAB_MAP['Floating static route']=['3.2','3.3'];
addLab({title:'Floating static route',group:'Routing',
 brief:'HQ and the branch are joined by a fast primary link and a slower backup link. Static routes use the primary today, so if it fails the branch is cut off. Add backup routes that stay out of the routing table until the primary route disappears.',
 pos:{PC1:[50,125],R1:[200,125],R2:[400,125],PC2:[550,125]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('R2'),mkPC('PC1','192.168.1.10',24,'192.168.1.1'),mkPC('PC2','192.168.2.10',24,'192.168.2.1')]);
  link(n,'PC1','f0','R1','g0/0');link(n,'R1','g0/1','R2','g0/1');link(n,'R1','g0/2','R2','g0/2');link(n,'R2','g0/0','PC2','f0');
  cfg(n,{R1:['enable','configure terminal','interface g0/0','ip address 192.168.1.1 255.255.255.0','no shutdown','interface g0/1','description PRIMARY','ip address 10.0.12.1 255.255.255.252','no shutdown','interface g0/2','description BACKUP','ip address 10.0.21.1 255.255.255.252','no shutdown','exit','ip route 192.168.2.0 255.255.255.0 10.0.12.2','end'],
   R2:['enable','configure terminal','interface g0/0','ip address 192.168.2.1 255.255.255.0','no shutdown','interface g0/1','description PRIMARY','ip address 10.0.12.2 255.255.255.252','no shutdown','interface g0/2','description BACKUP','ip address 10.0.21.2 255.255.255.252','no shutdown','exit','ip route 192.168.1.0 255.255.255.0 10.0.12.1','end']});return n;},
 addr:[['R1 / R2','G0/1, primary link','10.0.12.1, 10.0.12.2 /30'],['R1 / R2','G0/2, backup link','10.0.21.1, 10.0.21.2 /30'],['PC1','HQ LAN','192.168.1.10/24'],['PC2','Branch LAN','192.168.2.10/24']],
 tasks:['On R1, run <code>show ip route</code> and <code>tracert 192.168.2.10</code> from PC1 to see the path over the primary link.','On R1, add a backup route to 192.168.2.0/24 via R2\'s backup address 10.0.21.2, with administrative distance 5.','On R2, add the matching backup route to 192.168.1.0/24 via 10.0.21.1, with administrative distance 5.','Check <code>show ip route</code> on R1 again. The backup route is not there. Use <code>show ip route 192.168.2.10</code> to see which route wins.','Simulate a failure: shut down R1 G0/1. Check the routing table, then trace from PC1 again.','Bring G0/1 back up and confirm traffic returns to the primary link.'],
 why:['Know the normal path before you plan for failure. The S route with [1/0] is the primary; 1 is the default administrative distance of a static route.','Administrative distance is how believable a route source is: lower wins. Two static routes to the same network with different distances do not share; the higher one waits. That is why it is called floating.','Routing is needed in both directions. If only R1 fails over, requests reach the branch but replies still try the dead link.','Only the best route per network goes into the routing table. The floating route is stored in the config, ready, but invisible in show ip route until the primary goes away.','When G0/1 goes down, its connected subnet disappears, so the primary route\'s next hop is unreachable and the route is removed. The floating route is next in line and installs itself, on both routers.','When the primary link returns, its route with distance 1 beats distance 5 again and traffic moves back with nobody touching anything.'],
 checks:[['R1 has a floating route to 192.168.2.0/24 via 10.0.21.2 with a distance above 1',n=>n.devs.R1.statics.some(s=>s.net===ip2n('192.168.2.0')&&s.len===24&&s.nh===ip2n('10.0.21.2')&&(s.ad||1)>1)],['R2 has a floating route to 192.168.1.0/24 via 10.0.21.1 with a distance above 1',n=>n.devs.R2.statics.some(s=>s.net===ip2n('192.168.1.0')&&s.len===24&&s.nh===ip2n('10.0.21.1')&&(s.ad||1)>1)],['With both links up, traffic uses the primary link',n=>pathVia(n,'PC1','192.168.2.10','10.0.12.2')&&pathVia(n,'PC2','192.168.1.10','10.0.12.1')],['With the primary link down, PC1 still reaches PC2 over the backup',n=>whileDown(n,'R1','g0/1',()=>P(n,'PC1','192.168.2.10')&&pathVia(n,'PC1','192.168.2.10','10.0.21.2'))],['The primary link is back up',n=>!IF(n,'R1','g0/1').shutdown&&ifUp(n,n.devs.R1,IF(n,'R1','g0/1'))],['PC1 can ping PC2',n=>P(n,'PC1','192.168.2.10')]],
 solution:{R1:['enable','configure terminal','ip route 192.168.2.0 255.255.255.0 10.0.21.2 5','end'],R2:['enable','configure terminal','ip route 192.168.1.0 255.255.255.0 10.0.21.1 5','end']}},
 ['R1: enable | show ip route ; PC1: tracert 192.168.2.10',
  'R1: configure terminal | ip route 192.168.2.0 255.255.255.0 10.0.21.2 5 | end',
  'R2: enable | configure terminal | ip route 192.168.1.0 255.255.255.0 10.0.21.1 5 | end',
  'R1: # the backup route is not listed: distance 1 beats 5 | show ip route | show ip route 192.168.2.10',
  'R1: configure terminal | interface g0/1 | shutdown | end | # now the S route shows [5/0] via 10.0.21.2 | show ip route ; PC1: tracert 192.168.2.10',
  'R1: configure terminal | interface g0/1 | no shutdown | end | show ip route ; PC1: tracert 192.168.2.10']);

// ----- phase 2, lab 9
CCNA_LAB_MAP['How a router chooses a route']=['3.1','3.2'];
Object.assign(WHYC,{
'ip ospf cost <n>':'Sets this interface\'s OSPF cost directly. OSPF adds up the costs along a path and uses the lowest total, so raising a cost pushes traffic away from a link.',
'show ip ospf interface brief':'One line per OSPF interface: area, cost, state (DR, BDR, DROTH, P2P) and how many neighbors are fully adjacent out of how many there are.'});
const ospfStd=(rid,nets)=>['router ospf 1','router-id '+rid].concat(nets.map(x=>'network '+x+' area 0'));
addLab({title:'How a router chooses a route',group:'Routing',
 brief:'R1 can reach the server LAN through R2 or through R3, and it learns that LAN from OSPF. Change which path OSPF prefers, then pin one server to the other path and add a backup route, predicting each time which route R1 will really use.',
 pos:{PC1:[45,125],R1:[170,125],R2:[310,60],R3:[310,190],SW1:[440,125],SRV1:[555,60],SRV2:[555,190]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('R2'),mkRouter('R3'),mkSwitch('SW1'),mkPC('PC1','192.168.1.10',24,'192.168.1.1'),srv('SRV1','10.10.5.10',24,'10.10.5.2',[80]),srv('SRV2','10.10.5.20',24,'10.10.5.2',[80])]);
  link(n,'PC1','f0','R1','g0/0');link(n,'R1','g0/1','R2','g0/1');link(n,'R1','g0/2','R3','g0/1');link(n,'R2','g0/0','SW1','g0/1');link(n,'R3','g0/0','SW1','g0/2');link(n,'SW1','f0/1','SRV1','f0');link(n,'SW1','f0/2','SRV2','f0');
  const ifs=l=>l.flatMap(([i,a,m])=>['interface '+i,'ip address '+a+' '+m,'no shutdown']);
  cfg(n,{R1:['enable','configure terminal',...ifs([['g0/0','192.168.1.1','255.255.255.0'],['g0/1','10.0.12.1','255.255.255.252'],['g0/2','10.0.13.1','255.255.255.252']]),'interface g0/1','ip ospf cost 10',...ospfStd('1.1.1.1',['192.168.1.0 0.0.0.255','10.0.12.0 0.0.0.3','10.0.13.0 0.0.0.3']),'passive-interface g0/0','end'],
   R2:['enable','configure terminal',...ifs([['g0/1','10.0.12.2','255.255.255.252'],['g0/0','10.10.5.2','255.255.255.0']]),...ospfStd('2.2.2.2',['10.0.12.0 0.0.0.3','10.10.5.0 0.0.0.255']),'end'],
   R3:['enable','configure terminal',...ifs([['g0/1','10.0.13.2','255.255.255.252'],['g0/0','10.10.5.3','255.255.255.0']]),...ospfStd('3.3.3.3',['10.0.13.0 0.0.0.3','10.10.5.0 0.0.0.255']),'end']});return n;},
 addr:[['R1','G0/1 to R2 / G0/2 to R3','10.0.12.1, 10.0.13.1 /30'],['R2 / R3','Server LAN','10.10.5.2, 10.10.5.3 /24'],['SRV1','Must go via R3','10.10.5.10'],['SRV2','Server','10.10.5.20'],['PC1','User LAN','192.168.1.10/24']],
 tasks:['On R1, run <code>show ip route ospf</code> and <code>show ip ospf interface brief</code>, and trace from PC1 to SRV2 (10.10.5.20). Which path does OSPF use, and why?','The R3 link is being replaced next week. Make OSPF prefer R2 for the server LAN by setting the cost of R1 G0/2 to 50. Check the route and its metric again.','Security wants all traffic to SRV1 (10.10.5.10) inspected by R3. On R1, add a host route for 10.10.5.10/32 via R3 (10.0.13.2).','Use <code>show ip route 10.10.5.10</code> and <code>show ip route 10.10.5.20</code> to see which entry each address uses, and trace to both servers.','Add a backup static route for the whole server LAN via R3 with administrative distance 130. Is it in the routing table?'],
 why:['OSPF picks the path with the lowest total cost. Someone set G0/1\'s cost to 10, so the path through R3 (1 + 1 = 2) beats the path through R2 (10 + 1 = 11). The metric is the number in [110/2].','Within one routing source, the metric decides. With G0/2 at 50, the R3 path costs 51 and the R2 path 11, so OSPF switches without any static route.','A host route is the most specific route possible. It only affects one address, so the rest of the server LAN keeps following OSPF.','The router always uses the longest matching prefix first. 10.10.5.10 matches both the /32 and the /24, and /32 wins, even though static and OSPF have different distances. 10.10.5.20 only matches the /24.','Administrative distance only decides between routes to the same prefix and length. The static /24 at 130 loses to OSPF\'s /24 at 110, so it waits in the config and only appears if OSPF loses the route.'],
 checks:[['OSPF now prefers the path through R2 for the server LAN',n=>{const r=routes(n,n.devs.R1).find(x=>x.net===ip2n('10.10.5.0')&&x.len===24);return !!r&&r.code==='O'&&r.nh===ip2n('10.0.12.2');}],['A host route sends SRV1 traffic through R3',n=>{const h=nextHop(n,n.devs.R1,ip2n('10.10.5.10'));return !!h&&h.route.code==='S'&&h.route.len===32&&h.nh===ip2n('10.0.13.2');}],['A /24 backup via R3 at distance 130 exists but OSPF\'s route stays in the table',n=>n.devs.R1.statics.some(s=>s.net===ip2n('10.10.5.0')&&s.len===24&&s.nh===ip2n('10.0.13.2')&&s.ad===130)&&routes(n,n.devs.R1).find(x=>x.net===ip2n('10.10.5.0')&&x.len===24).code==='O'],['PC1 reaches SRV1 through R3 and SRV2 through R2',n=>P(n,'PC1','10.10.5.10')&&P(n,'PC1','10.10.5.20')&&pathVia(n,'PC1','10.10.5.10','10.0.13.2')&&pathVia(n,'PC1','10.10.5.20','10.0.12.2')]],
 solution:{R1:['enable','configure terminal','interface g0/2','ip ospf cost 50','exit','ip route 10.10.5.10 255.255.255.255 10.0.13.2','ip route 10.10.5.0 255.255.255.0 10.0.13.2 130','end']}},
 ['R1: enable | show ip route ospf | show ip ospf interface brief ; PC1: tracert 10.10.5.20',
  'R1: configure terminal | interface g0/2 | ip ospf cost 50 | end | # now [110/11] via 10.0.12.2 | show ip route ospf',
  'R1: configure terminal | ip route 10.10.5.10 255.255.255.255 10.0.13.2 | end',
  'R1: show ip route 10.10.5.10 | show ip route 10.10.5.20 ; PC1: tracert 10.10.5.10 | tracert 10.10.5.20',
  'R1: configure terminal | ip route 10.10.5.0 255.255.255.0 10.0.13.2 130 | end | # the /24 is still O: 110 beats 130 | show ip route 10.10.5.20']);

// ----- phase 2, lab 10
CCNA_LAB_MAP['OSPF on a shared segment']=['3.4'];
Object.assign(WHYC,{
'ip ospf priority <n>':'Sets this router\'s priority in the DR/BDR election on this segment, 0 to 255. Highest wins, router ID breaks ties, and 0 means it can never be DR or BDR. A higher priority does not take over from a DR that is already elected.',
'ip ospf network <w>':'point-to-point tells OSPF there can only be one neighbor on this link, so it skips the DR/BDR election and its wait timer. Both ends must match.',
'show ip ospf interface <rest?>':'Shows OSPF on each interface: network type, cost, this router\'s state and priority, who the DR and BDR are, and how many neighbors are adjacent.',
'auto-cost reference-bandwidth <n>':'The bandwidth, in Mbps, that counts as cost 1. The default of 100 makes FastEthernet and Gigabit both cost 1; 1000 or more lets OSPF tell them apart. Set the same value on every router.'});
addLab({title:'OSPF on a shared segment',group:'Routing',
 brief:'Four routers share one Ethernet segment, and R4 also has a WAN link to a branch. The election went to whichever routers booted first, so the weakest box, R1, is DR. Make R4 the DR and R3 the BDR, keep R1 and R2 out of the election, and run the WAN link as point-to-point with a realistic cost.',
 pos:{R1:[110,50],R2:[390,50],SW1:[250,120],R3:[110,190],R4:[390,190],BR:[530,190],PC1:[530,60]},start:'R3',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('R2'),mkRouter('R3'),mkRouter('R4'),mkRouter('BR'),mkSwitch('SW1'),mkPC('PC1','192.168.50.10',24,'192.168.50.1')]);
  link(n,'R1','g0/0','SW1','f0/1');link(n,'R2','g0/0','SW1','f0/2');link(n,'R3','g0/0','SW1','f0/3');link(n,'R4','g0/0','SW1','f0/4');link(n,'R4','g0/1','BR','g0/1');link(n,'BR','g0/0','PC1','f0');
  const lan=(k)=>['enable','configure terminal','interface g0/0','ip address 10.0.0.'+k+' 255.255.255.0','no shutdown','exit'];
  cfg(n,{R1:lan(1).concat(ospfStd('1.1.1.1',['10.0.0.0 0.0.0.255']),'end'),R2:lan(2).concat(ospfStd('2.2.2.2',['10.0.0.0 0.0.0.255']),'end'),R3:lan(3).concat(ospfStd('3.3.3.3',['10.0.0.0 0.0.0.255']),'end'),
   R4:lan(4).concat('interface g0/1','ip address 172.16.0.1 255.255.255.252','no shutdown','exit',ospfStd('4.4.4.4',['10.0.0.0 0.0.0.255','172.16.0.0 0.0.0.3']),'end'),
   BR:['enable','configure terminal','interface g0/1','ip address 172.16.0.2 255.255.255.252','no shutdown','interface g0/0','ip address 192.168.50.1 255.255.255.0','no shutdown','exit',...ospfStd('5.5.5.5',['172.16.0.0 0.0.0.3','192.168.50.0 0.0.0.255']),'passive-interface g0/0','end']});return n;},
 addr:[['R1 to R4','Shared LAN, G0/0','10.0.0.1 to .4 /24'],['Router IDs','R1 to R4, BR','1.1.1.1 to 4.4.4.4, 5.5.5.5'],['R4 / BR','WAN, G0/1','172.16.0.1, 172.16.0.2 /30'],['PC1','Branch LAN','192.168.50.10/24']],
 tasks:['On R3, run <code>show ip ospf neighbor</code> and <code>show ip ospf interface brief</code>. Who is DR and BDR, and why is R4 only 2WAY?','On the LAN interface G0/0, give R4 priority 255 and R3 priority 100. Look again: did anything change?','Set priority 0 on R1\'s and R2\'s G0/0. Watch the roles move, and check from R3.','On both ends of the WAN link (R4 and BR G0/1), set the OSPF network type to point-to-point.','The WAN is a 10 Mbps circuit: set its OSPF cost to 10 on both ends. On BR, check the metric to 10.0.0.0/24.','From PC1, ping R1 at 10.0.0.1, then confirm on R1 with <code>show ip ospf interface g0/0</code> who the DR and BDR are.'],
 why:['On a shared segment OSPF elects a Designated Router so each router forms one full adjacency with the DR (and BDR) instead of one with every other router. Routers that are neither stay at 2WAY with each other, which is normal, not a fault.','The election has no pre-emption. A router that arrives later, or raises its priority, does not take over while the current DR and BDR are still there. That keeps the segment stable.','Priority 0 makes a router ineligible, so the current DR and BDR give the roles up. Each time, the BDR is promoted first and a new BDR is chosen: R1 out makes R2 DR, then R2 out makes R4 DR with R3 as BDR.','A link with only two routers gains nothing from an election. Point-to-point skips it, forms the adjacency faster, and shows FULL/ - in the neighbor table.','OSPF cost is reference bandwidth divided by link bandwidth. With the default reference of 100 Mbps both a gigabit LAN and a 10 Mbps circuit would cost 1, so set the slow link\'s cost yourself. BR\'s metric to the LAN becomes 10 + 1 = 11.','Elections change roles, never reachability. The detail view names the DR and BDR by router ID and by interface address.'],
 checks:[['R4 is the DR and R3 the BDR on the shared LAN',n=>ospfRole(n,n.devs.R4,IF(n,'R4','g0/0'))==='DR'&&ospfRole(n,n.devs.R3,IF(n,'R3','g0/0'))==='BDR'],['R1 and R2 have priority 0, so they can never be elected',n=>ospfPrio(IF(n,'R1','g0/0'))===0&&ospfPrio(IF(n,'R2','g0/0'))===0],['The WAN link runs as point-to-point and the adjacency is up',n=>['R4','BR'].every(r=>IF(n,r,'g0/1').ospfNet==='point-to-point')&&ospfNeighbors(n,n.devs.BR).some(x=>x.dev===n.devs.R4)],['BR reaches the LAN at metric 11 over the 10-cost WAN link',n=>{const r=routes(n,n.devs.BR).find(x=>x.net===ip2n('10.0.0.0')&&x.len===24);return !!r&&r.code==='O'&&r.metric===11&&ospfCost(n.devs.R4,IF(n,'R4','g0/1'))===10;}],['PC1 can ping R1 on the shared LAN',n=>P(n,'PC1','10.0.0.1')]],
 solution:{R4:['enable','configure terminal','interface g0/0','ip ospf priority 255','interface g0/1','ip ospf network point-to-point','ip ospf cost 10','end'],R3:['enable','configure terminal','interface g0/0','ip ospf priority 100','end'],
  R1:['enable','configure terminal','interface g0/0','ip ospf priority 0','end'],R2:['enable','configure terminal','interface g0/0','ip ospf priority 0','end'],BR:['enable','configure terminal','interface g0/1','ip ospf network point-to-point','ip ospf cost 10','end']}},
 ['R3: enable | show ip ospf neighbor | show ip ospf interface brief',
  'R4: enable | configure terminal | interface g0/0 | ip ospf priority 255 ; R3: configure terminal | interface g0/0 | ip ospf priority 100 | do show ip ospf neighbor',
  'R1: enable | configure terminal | interface g0/0 | ip ospf priority 0 ; R3: do show ip ospf neighbor ; R2: enable | configure terminal | interface g0/0 | ip ospf priority 0 ; R3: do show ip ospf neighbor',
  'R4: interface g0/1 | ip ospf network point-to-point ; BR: enable | configure terminal | interface g0/1 | ip ospf network point-to-point | do show ip ospf neighbor',
  'R4: ip ospf cost 10 | end ; BR: ip ospf cost 10 | end | show ip route ospf',
  'PC1: ping 10.0.0.1 ; R1: end | show ip ospf interface g0/0']);

// ----- phase 2, lab 11
// LLDP (802.1AB). Off by default on Cisco routers and switches; a host running an LLDP agent has d.lldp set.
// A device learns a neighbor when both run LLDP, the neighbor transmits on its port and this port receives.
function lldpPeers(net,d){if(!d.lldp)return [];const r=[];for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];if(!i.link||!ifUp(net,d,i)||i.lldpRx===false)continue;
  const p=net.devs[i.link.dev],pi=p.ifs[i.link.ifn];if(p.lldp&&pi.lldpTx!==false)r.push({i,p,pi});}return r;}
const lldpCap=p=>p.type==='router'?'R':p.type==='switch'?'B':'S';
const lldpPort=(p,pi)=>p.type==='pc'?'eth0':shortIf(pi.name);
const LLDPCAPS=['Capability codes:','    (R) Router, (B) Bridge, (T) Telephone, (C) DOCSIS Cable Device','    (W) WLAN Access Point, (P) Repeater, (S) Station, (O) Other',''];
Cn(EX,'show lldp neighbors',e=>{const{net,d,out}=e;if(!d.lldp)return out('% LLDP is not enabled');const ps=lldpPeers(net,d);
  out(...LLDPCAPS,'Device ID           Local Intf     Hold-time  Capability      Port ID',...ps.map(({i,p,pi})=>pad(p.hostname.slice(0,19),20)+pad(shortIf(i.name),15)+pad(120,11)+pad(lldpCap(p),16)+lldpPort(p,pi)),'','Total entries displayed: '+ps.length);},['router','switch']);
Cn(EX,'show lldp neighbors detail',e=>{const{net,d,out}=e;if(!d.lldp)return out('% LLDP is not enabled');const ps=lldpPeers(net,d);
  ps.forEach(({i,p,pi})=>{const mgmt=p.type==='pc'?nic(p).ip:p.type==='router'?pi.ip:(Object.values(p.ifs).find(x=>x.name.startsWith('Vlan')&&x.ip!==null)||{}).ip;
    out('------------------------------------------------','Local Intf: '+shortIf(i.name),'Chassis id: '+macOf(p),'Port id: '+lldpPort(p,pi),'Port Description: '+(p.type==='pc'?'eth0':(pi.desc||pi.name)),'System Name: '+p.hostname,'','System Description: ',
      p.type==='pc'?(p.sysDescr||'Linux '+p.hostname+' 6.1.0-18-amd64 #1 SMP Debian 6.1.76-1 x86_64'):p.type==='router'?'Cisco IOS Software [Fuji], ISR Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 16.9.4':'Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2(7)E2','',
      'Time remaining: 112 seconds','System Capabilities: '+lldpCap(p),'Enabled Capabilities: '+lldpCap(p),'Management Addresses:',mgmt!=null?'    IP: '+n2ip(mgmt):'    - not advertised','Auto Negotiation - supported, enabled','');});
  out('','Total entries displayed: '+ps.length);},['router','switch']);
Cn(EX,'show lldp',e=>e.out(...(e.d.lldp?['','Global LLDP Information:','    Status: ACTIVE','    LLDP advertisements are sent every 30 seconds','    LLDP hold time advertised is 120 seconds','    LLDP interface reinitialisation delay is 2 seconds']:['% LLDP is not enabled'])),['router','switch']);
Cn(EX,'show lldp interface <rest?>',e=>{const{d,out}=e;if(!d.lldp)return out('% LLDP is not enabled');const want=e.args[0]?parseIf(e.args[0]):null;if(e.args[0]&&(!want||!d.ifs[want]))return out(BAD);
  for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];if(n.startsWith('Vlan')||n.startsWith('Loopback')||(want&&n!==want))continue;
    out('',shortIf(n)+':','    Tx: '+(i.lldpTx===false?'disabled':'enabled'),'    Rx: '+(i.lldpRx===false?'disabled':'enabled'),'    Tx state: '+(i.lldpTx===false?'INIT':'IDLE'),'    Rx state: '+(i.lldpRx===false?'INIT':'WAIT FOR FRAME'));}},['router','switch']);
Cn('config','lldp run',e=>{e.d.lldp=true;},['router','switch']);
Cn('config','no lldp run',e=>{e.d.lldp=false;},['router','switch']);
Cn('if','lldp transmit',e=>e.s.ctx.forEach(i=>{i.lldpTx=true;}),['router','switch']);
Cn('if','no lldp transmit',e=>e.s.ctx.forEach(i=>{i.lldpTx=false;}),['router','switch']);
Cn('if','lldp receive',e=>e.s.ctx.forEach(i=>{i.lldpRx=true;}),['router','switch']);
Cn('if','no lldp receive',e=>e.s.ctx.forEach(i=>{i.lldpRx=false;}),['router','switch']);
CCNA_LAB_MAP['LLDP']=['2.3'];
Object.assign(WHYC,{
'lldp run':'Turns on LLDP (IEEE 802.1AB), the vendor-neutral discovery protocol. Cisco ships it off; CDP is on instead.',
'no lldp run':'Turns LLDP off on the whole device.',
'show lldp neighbors':'Lists neighbors heard over LLDP: their system name, your port, their capabilities (B bridge, R router, S station, T phone) and their port.',
'show lldp neighbors detail':'Adds each neighbor\'s chassis ID, system description (often the exact OS version), and management address.',
'show lldp':'Shows whether LLDP is running and its timers: an advertisement every 30 seconds, held for 120.',
'show lldp interface <rest?>':'Shows, per interface, whether LLDP is transmitting and receiving.',
'no lldp transmit':'Stops advertising this device out of the port while still listening. Useful where you want to learn about what is connected without telling it anything about you.',
'lldp transmit':'Resumes sending LLDP advertisements out of this port.',
'no lldp receive':'Ignores LLDP advertisements arriving on this port.',
'lldp receive':'Resumes listening for LLDP advertisements on this port.'});
addLab({title:'LLDP',group:'Switching',hidePorts:true,
 brief:'A contractor has installed a Linux file server on SW1 and nobody wrote down where. CDP only talks to Cisco devices, so it cannot see the server. Turn on LLDP, the open standard, find the server and its details, and stop SW1 advertising itself to the contractor\'s box.',
 pos:{R1:[110,110],SW1:[300,110],SW2:[490,110],SRV1:[300,195],PC1:[490,195]},start:'SW1',
 build(){const files=srv('SRV1','10.1.1.50',24,'10.1.1.1',[445]);files.hostname='files01';files.lldp=true;
  const n=mkNet([mkRouter('R1'),mkSwitch('SW1'),mkSwitch('SW2'),files,mkPC('PC1','10.1.1.20',24,'10.1.1.1')]);
  link(n,'R1','g0/0','SW1','g0/2');link(n,'SW1','g0/1','SW2','g0/2');link(n,'SW1','f0/5','SRV1','f0');link(n,'SW2','f0/1','PC1','f0');
  const sw=ip=>['enable','configure terminal','interface vlan 1','ip address '+ip+' 255.255.255.0','no shutdown','exit','ip default-gateway 10.1.1.1','end'];
  cfg(n,{R1:['enable','configure terminal','interface g0/0','ip address 10.1.1.1 255.255.255.0','no shutdown','end'],SW1:sw('10.1.1.2'),SW2:sw('10.1.1.3')});return n;},
 addr:[['R1','G0/0','10.1.1.1/24'],['SW1 / SW2','Management, VLAN 1','10.1.1.2, 10.1.1.3'],['SRV1','Contractor\'s Linux server, runs lldpd','find it with LLDP'],['PC1','Workstation','10.1.1.20']],
 tasks:['On SW1, run <code>show cdp neighbors</code>, then <code>show lldp neighbors</code>. What can CDP see, and what is missing?','Turn on LLDP on SW1, SW2 and R1.','On SW1, run <code>show lldp neighbors</code> again and find the server: which port is it on, and what does it call itself?','Use <code>show lldp neighbors detail</code> on SW1 to read the server\'s operating system and management address, then ping that address from R1.','The server is not yours. Stop SW1 sending LLDP out of the server\'s port, but keep listening to it.','Check the port with <code>show lldp interface</code> and confirm SW1 still lists the server.'],
 why:['CDP is Cisco\'s own protocol, so a Linux server, a non-Cisco switch or most phones from other vendors never show up in it. LLDP is off on Cisco gear by default, so you get nothing until you turn it on.','LLDP has to run at both ends of a link. Turning it on everywhere you manage gives a consistent, vendor-neutral view of the network.','Capability S means station: an end host. The device ID is whatever the server calls itself (its system name), which is often the only clue to what a box is.','The system description often contains the exact OS and kernel version, and the management address tells you how to reach the box. It is great for documentation and equally useful to an attacker.','Transmit and receive are separate switches per port. Turning off transmit means the contractor\'s server learns nothing about your switch, while you still learn about it.','Receive is still on, so the entry stays. If you had used no lldp run instead, SW1 would have gone blind on every port.'],
 checks:[['LLDP runs on SW1, SW2 and R1',n=>['SW1','SW2','R1'].every(x=>n.devs[x].lldp===true)],['SW1 discovers the Linux server, which CDP cannot see',n=>lldpPeers(n,n.devs.SW1).some(x=>x.p===n.devs.SRV1)&&!cdpPeers(n,n.devs.SW1).some(x=>x.p===n.devs.SRV1)],['SW1 no longer advertises itself to the server but still listens on that port',n=>{const i=IF(n,'SW1','f0/5');return i.lldpTx===false&&i.lldpRx!==false&&!lldpPeers(n,n.devs.SRV1).some(x=>x.p===n.devs.SW1);}],['The Cisco devices see each other over LLDP',n=>{const sees=(a,b)=>lldpPeers(n,n.devs[a]).some(x=>x.p===n.devs[b]);return sees('SW1','SW2')&&sees('SW1','R1')&&sees('SW2','SW1')&&sees('R1','SW1');}],['R1 can ping the server',n=>P(n,'R1','10.1.1.50')]],
 solution:{SW1:['enable','configure terminal','lldp run','interface f0/5','no lldp transmit','end'],SW2:['enable','configure terminal','lldp run','end'],R1:['enable','configure terminal','lldp run','end']}},
 ['SW1: enable | show cdp neighbors | show lldp neighbors',
  'SW1: configure terminal | lldp run | end ; SW2: enable | configure terminal | lldp run | end ; R1: enable | configure terminal | lldp run | end',
  'SW1: # the server shows as files01 on Fa0/5 with capability S | show lldp neighbors',
  'SW1: show lldp neighbors detail ; R1: ping 10.1.1.50',
  'SW1: configure terminal | interface f0/5 | no lldp transmit | end',
  'SW1: show lldp interface f0/5 | show lldp neighbors']);

// ----- phase 2, lab 12
// An IP phone: FastEthernet0 is its uplink and its own address, FastEthernet1 the PC port on its back. CDP names it SEP + MAC.
function mkPhone(name){const d=mkPC(name,null,24);d.phone=true;addIf(d,'FastEthernet1');d.cdpId='SEP'+macOf(d).replace(/\./g,'').toUpperCase();return d;}
{const p0=promptOf;promptOf=function(d,s){return d.phone&&s.mode==='pc'?'Phone>':p0(d,s);};}
Cn('if','switchport voice vlan <n>',e=>{const v=e.args[0];if(v<1||v>4094)return e.out(BAD);if(!e.d.vlans[v]){e.d.vlans[v]={name:'VLAN'+String(v).padStart(4,'0')};e.out('% Voice VLAN does not exist. Creating vlan '+v);}e.s.ctx.forEach(i=>{i.voiceVlan=v;});},['switch']);
Cn('if','no switchport voice vlan',e=>e.s.ctx.forEach(i=>{delete i.voiceVlan;}),['switch']);
Cn('dhcp','option <n> ip <ip>',e=>{const p=e.d.dhcp.pools[e.s.ctx];(p.opts||(p.opts={}))[e.args[0]]=e.args[1];});
const vname=(d,v)=>v+' ('+((d.vlans[v]||{}).name||'Inactive')+')';
function switchportLines(net,d,i){const tr=i.mode==='trunk',L=['Name: '+shortIf(i.name),'Switchport: Enabled','Administrative Mode: '+(tr?'trunk':i.modeSet?'static access':'dynamic auto'),'Operational Mode: '+(tr?'trunk':'static access'),
  'Administrative Trunking Encapsulation: dot1q','Operational Trunking Encapsulation: '+(tr?'dot1q':'native'),'Negotiation of Trunking: '+(tr?'On':i.modeSet?'Off':'On'),
  'Access Mode VLAN: '+vname(d,i.accessVlan),'Trunking Native Mode VLAN: '+vname(d,i.native),'Administrative Native VLAN tagging: enabled','Voice VLAN: '+(i.voiceVlan!=null?vname(d,i.voiceVlan):'none'),
  'Administrative private-vlan host-association: none','Trunking VLANs Enabled: '+(i.allowed==='all'?'ALL':i.allowed.join(',')),'Pruning VLANs Enabled: 2-1001','Protected: false','Unknown unicast blocked: disabled','Unknown multicast blocked: disabled','Appliance trust: none',''];return L;}
Cn(EX,'show interfaces switchport',e=>{for(const n of sortIfs(Object.keys(e.d.ifs)))if(!/^(Vlan|Port-channel|Loopback)/.test(n))e.out(...switchportLines(e.net,e.d,e.d.ifs[n]));},['switch'],true);
Cn(EX,'show interfaces <w> switchport',e=>{const n=parseIf(e.args[0]);if(!n||!e.d.ifs[n]||n.startsWith('Vlan'))return e.out(BAD);e.out(...switchportLines(e.net,e.d,e.d.ifs[n]));},['switch'],true);
CCNA_LAB_MAP['Voice VLAN']=['2.1'];
Object.assign(WHYC,{
'switchport voice vlan <n>':'Lets one access port carry two VLANs: untagged frames go into the access (data) VLAN for the PC, and frames tagged with this VLAN carry the phone\'s voice traffic. The switch tells the phone which VLAN to tag through CDP.',
'no switchport voice vlan':'Removes the voice VLAN from the port; the phone then sends untagged and lands in the data VLAN.',
'show interfaces switchport':'Shows each port\'s administrative and operational mode, its access VLAN, native VLAN and voice VLAN.',
'show interfaces <w> switchport':'Shows one port\'s mode, access VLAN, native VLAN and voice VLAN. The quickest way to confirm a phone port.',
'option <n> ip <ip>':'Adds a DHCP option to the pool. Option 150 tells Cisco IP phones where their TFTP server is, so they can download their configuration.'});
addLab({title:'Voice VLAN',group:'Switching',
 brief:'A new IP phone has been installed with a PC plugged into the back of it, sharing one switch port. Right now both end up in the data VLAN, so the phone cannot be given voice quality of service or reach its call server through the voice network. Give the port a voice VLAN so the phone and the PC each land in the right VLAN.',
 pos:{PC1:[60,195],PHONE1:[190,195],SW1:[300,110],R1:[440,110],CUCM:[560,195]},start:'SW1',
 build(){const n=mkNet([mkRouter('R1'),mkSwitch('SW1'),mkPhone('PHONE1'),mkPC('PC1',null,24),srv('CUCM','192.168.200.5',24,'192.168.200.1',[69,2000])]);
  link(n,'PC1','f0','PHONE1','f1');link(n,'PHONE1','f0','SW1','f0/1');link(n,'SW1','g0/1','R1','g0/0');link(n,'R1','g0/1','CUCM','f0');
  cfg(n,{R1:['enable','configure terminal','interface g0/0','no shutdown','interface g0/0.10','encapsulation dot1q 10','ip address 192.168.10.1 255.255.255.0','interface g0/0.150','encapsulation dot1q 150','ip address 192.168.150.1 255.255.255.0','interface g0/1','ip address 192.168.200.1 255.255.255.0','no shutdown','exit',
     'ip dhcp excluded-address 192.168.10.1 192.168.10.10','ip dhcp excluded-address 192.168.150.1 192.168.150.10','ip dhcp pool DATA','network 192.168.10.0 255.255.255.0','default-router 192.168.10.1','ip dhcp pool VOICE','network 192.168.150.0 255.255.255.0','default-router 192.168.150.1','option 150 ip 192.168.200.5','end'],
   SW1:['enable','configure terminal','vlan 10','name DATA','interface f0/1','switchport mode access','switchport access vlan 10','interface g0/1','switchport mode trunk','end'],PHONE1:['ipconfig /renew'],PC1:['ipconfig /renew']});return n;},
 addr:[['R1','G0/0.10 (DATA) / G0/0.150 (VOICE)','192.168.10.1, 192.168.150.1 /24'],['R1','DHCP pools','DATA and VOICE, option 150'],['CUCM','Call server, G0/1 side','192.168.200.5'],['PHONE1','IP phone on SW1 Fa0/1','DHCP'],['PC1','Plugged into the phone','DHCP']],
 tasks:['Check what the phone and PC have now: <code>ipconfig</code> on both. On SW1, find the phone in <code>show cdp neighbors</code>.','On SW1, create VLAN 150 named <code>VOICE</code>.','On Fa0/1, keep the access VLAN at 10 and add voice VLAN 150.','Check the port with <code>show interfaces fa0/1 switchport</code> and <code>show vlan brief</code>.','Renew the phone\'s address and the PC\'s address. Which VLAN did each one land in?','From the phone, ping the call server at 192.168.200.5. From the PC, ping its gateway.'],
 why:['Both devices are on 192.168.10.x because the phone has no voice VLAN to use: it sends untagged frames, which go into the port\'s access VLAN like the PC\'s. CDP shows the phone as SEP followed by its MAC address, with capability P.','The voice VLAN must exist on the switch like any other VLAN. Keeping voice in its own VLAN lets you prioritise it and keep its broadcasts and security apart from data.','An access port with a voice VLAN carries two VLANs: untagged for the PC and 802.1Q-tagged for the phone. It is still an access port, not a trunk, so the PC cannot send tagged traffic into other VLANs.','show interfaces switchport lists Access Mode VLAN 10 and Voice VLAN 150. show vlan brief lists Fa0/1 under both VLANs.','The switch advertises VLAN 150 to the phone in CDP. The phone then tags its own traffic and asks DHCP again, now from the VOICE pool, while the PC behind it keeps sending untagged frames into VLAN 10.','The phone now reaches its call server from the voice subnet, and option 150 in its lease told it where that server is. The PC is unaffected.'],
 checks:[['VLAN 150 named VOICE exists on SW1',n=>vlanIs(n,'SW1',150,'VOICE')],['Fa0/1 is an access port in VLAN 10 with voice VLAN 150',n=>{const i=IF(n,'SW1','f0/1');return acc(n,'SW1','f0/1',10)&&i.voiceVlan===150;}],['The phone has a voice-VLAN lease (192.168.150.x)',n=>{const ip=nic(n.devs.PHONE1).ip;return ip!==null&&netOf(ip,24)===ip2n('192.168.150.0')&&n.devs.PHONE1.gw===ip2n('192.168.150.1');}],['The PC behind the phone has a data-VLAN lease (192.168.10.x)',n=>{const ip=nic(n.devs.PC1).ip;return ip!==null&&netOf(ip,24)===ip2n('192.168.10.0')&&n.devs.PC1.gw===ip2n('192.168.10.1');}],['The phone reaches the call server and the PC reaches its gateway',n=>P(n,'PHONE1','192.168.200.5')&&P(n,'PC1','192.168.10.1')]],
 solution:{SW1:['enable','configure terminal','vlan 150','name VOICE','interface f0/1','switchport voice vlan 150','end'],PHONE1:['ipconfig /renew','ping 192.168.200.5'],PC1:['ipconfig /renew']}},
 ['PHONE1: ipconfig ; PC1: ipconfig ; SW1: enable | show cdp neighbors',
  'SW1: configure terminal | vlan 150 | name VOICE | exit',
  'SW1: interface f0/1 | switchport voice vlan 150 | end',
  'SW1: show interfaces fa0/1 switchport | show vlan brief',
  'PHONE1: ipconfig /renew ; PC1: ipconfig /renew',
  'PHONE1: ping 192.168.200.5 ; PC1: ping 192.168.10.1']);

// ----- phase 2, lab 13
// ip nat pool NAME START END {netmask MASK | prefix-length N}
Cn('config','ip nat pool <w> <ip> <ip> <rest>',e=>{const[name,a,b,rest]=e.args,t=rest.trim().split(/\s+/),k=(t[0]||'').toLowerCase();let len=null;
  if('netmask'.startsWith(k)&&t[1]&&isIp(t[1]))len=maskLenN(ip2n(t[1]));else if('prefix-length'.startsWith(k)&&/^\d+$/.test(t[1]||''))len=+t[1];
  if(len===null||len<1||len>32||t.length!==2)return e.out(BAD);if(b<a||netOf(a,len)!==netOf(b,len))return e.out('%Pool '+name+' mask '+n2ip(lenMask(len))+' too small; reduce pool size or increase mask');
  const N=natOf(e.d);if(N.pools&&N.pools[name]&&N.rules.some(r=>r.pool===name)&&((N.dyn||[]).length||N.table.length))return e.out('%Pool '+name+' in use, cannot redefine');
  (N.pools||(N.pools={}))[name]={start:a,end:b,len};},['router']);
Cn('config','no ip nat pool <w>',e=>{const N=natOf(e.d);if(N.rules.some(r=>r.pool===e.args[0])&&((N.dyn||[]).length||N.table.length))return e.out('%Pool '+e.args[0]+' in use, cannot destroy');if(N.pools)delete N.pools[e.args[0]];},['router']);
const natBusy=N=>(N.dyn||[]).length>0||N.table.length>0;
Cn('config','ip nat inside source list <w> pool <w> <rest?>',e=>{const[acl,pool,rest]=e.args,ov=!!rest&&'overload'.startsWith(rest.trim().toLowerCase());if(rest&&!ov)return e.out(BAD);
  const N=natOf(e.d),old=N.rules.find(r=>r.acl===acl);if(old&&(old.pool!==pool||!!old.overload!==ov)&&natBusy(N))return e.out('%Dynamic mapping in use, cannot change');
  N.rules=N.rules.filter(r=>r.acl!==acl);N.rules.push({acl,pool,overload:ov});},['router'],true);
Cn('config','no ip nat inside source list <w> <rest>',e=>{const N=natOf(e.d);if(!N.rules.some(r=>r.acl===e.args[0]))return;if(natBusy(N))return e.out('%Dynamic mapping in use, cannot remove');N.rules=N.rules.filter(r=>r.acl!==e.args[0]);},['router'],true);
Cn(EX,'show ip nat statistics',e=>{const{d,out}=e,N=d.nat||{statics:[],rules:[],table:[]},dyn=(N.dyn||[]).length,ifs=side=>sortIfs(Object.keys(d.ifs)).filter(n=>d.ifs[n].nat===side);
  out('Total active translations: '+(N.statics.length+dyn+N.table.length)+' ('+N.statics.length+' static, '+(dyn+N.table.length)+' dynamic; '+N.table.length+' extended)','Peak translations: '+(N.statics.length+dyn+N.table.length),
    'Outside interfaces:',...ifs('outside').map(n=>'  '+n),'Inside interfaces:',...ifs('inside').map(n=>'  '+n),'Hits: '+(N.hits||0)+'  Misses: '+(N.misses||0),'Expired translations: 0','Dynamic mappings:');
  N.rules.forEach((r,k)=>{out('-- Inside Source','[Id: '+(k+1)+'] access-list '+r.acl+(r.pool?' pool '+r.pool:' interface '+r.ifn)+(r.overload?' overload':'')+' refcount '+(r.pool&&!r.overload?dyn:N.table.length));
    const P=r.pool&&(N.pools||{})[r.pool];if(P){const total=P.end-P.start+1,alloc=r.overload?(N.table.length?1:0):dyn;
      out(' pool '+r.pool+': id '+(k+1)+', netmask '+n2ip(lenMask(P.len)),'\tstart '+n2ip(P.start)+' end '+n2ip(P.end),'\ttype generic, total addresses '+total+', allocated '+alloc+' ('+Math.round(alloc*100/total)+'%), misses '+(N.misses||0));}});},['router']);
// Run checks as if the traffic happened at the same moment (translations accumulate), then put everything back.
function together(n,fn){const keep=TRACE,was=LIVE,nats=Object.values(n.devs).filter(d=>d.nat).map(d=>[d.nat,d.nat.table.slice(),(d.nat.dyn||[]).slice(),d.nat.hits,d.nat.misses]),hits=[];
  for(const d of Object.values(n.devs))for(const a of Object.values(d.acls||{}))for(const en of a.entries)hits.push([en,en.hits]);
  LIVE=true;try{return fn();}finally{LIVE=was;TRACE=keep;nats.forEach(([N,t,m,h,x])=>{N.table=t;N.dyn=m;N.hits=h;N.misses=x;});hits.forEach(([en,h])=>{en.hits=h;});}}
CCNA_LAB_MAP['Dynamic NAT with a pool']=['4.1'];
Object.assign(WHYC,{
'ip nat pool <w> <ip> <ip> <rest>':'Defines a range of public addresses NAT may hand out. The netmask (or prefix length) only checks that the range fits one subnet.',
'ip nat inside source list <w> pool <w> <rest?>':'Dynamic NAT: sources the ACL permits borrow an address from the pool, one public address per inside host. Add overload to let them share, told apart by port numbers.',
'no ip nat inside source list <w> <rest>':'Removes a dynamic NAT rule. IOS refuses while translations created by it still exist; clear them first.',
'show ip nat statistics':'Counts active translations, shows which interfaces are inside and outside, hits and misses, and how much of each pool is allocated. Misses climbing means the pool ran out.',
'clear ip nat translation <rest>':'Deletes dynamic translations (* means all), freeing pool addresses. Static mappings stay.'});
addLab({title:'Dynamic NAT with a pool',group:'IP services',
 brief:'The ISP has routed a small public block to R1, and the plan is to give each inside host its own public address from it. There are three PCs and only two addresses in the pool. Find out what happens when the pool runs dry, then fix it without asking the ISP for more addresses.',
 pos:{PC1:[45,50],PC2:[45,125],PC3:[45,195],SW1:[160,125],R1:[290,125],ISP:[420,125],WEB:[550,125]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('ISP'),mkSwitch('SW1'),mkPC('PC1','192.168.1.11',24,'192.168.1.1'),mkPC('PC2','192.168.1.12',24,'192.168.1.1'),mkPC('PC3','192.168.1.13',24,'192.168.1.1'),srv('WEB','198.51.100.10',24,'198.51.100.1',[80])]);
  link(n,'PC1','f0','SW1','f0/1');link(n,'PC2','f0','SW1','f0/2');link(n,'PC3','f0','SW1','f0/3');link(n,'SW1','g0/1','R1','g0/0');link(n,'R1','g0/1','ISP','g0/0');link(n,'ISP','g0/1','WEB','f0');
  cfg(n,{R1:['enable','configure terminal','interface g0/0','ip address 192.168.1.1 255.255.255.0','no shutdown','interface g0/1','ip address 203.0.113.2 255.255.255.252','no shutdown','exit','ip route 0.0.0.0 0.0.0.0 203.0.113.1','end'],
   ISP:['enable','configure terminal','interface g0/0','ip address 203.0.113.1 255.255.255.252','no shutdown','interface g0/1','ip address 198.51.100.1 255.255.255.0','no shutdown','exit','ip route 203.0.113.32 255.255.255.248 203.0.113.2','end']});return n;},
 addr:[['PC1 to PC3','Inside LAN','192.168.1.11 to .13 /24'],['R1','G0/0 inside / G0/1 outside','192.168.1.1, 203.0.113.2'],['Pool PUBLIC','From the ISP\'s /29','203.0.113.33 to .34'],['WEB','Web server','198.51.100.10']],
 tasks:['On R1, create standard ACL 1 permitting 192.168.1.0/24, and mark G0/0 as NAT inside and G0/1 as NAT outside.','Create pool <code>PUBLIC</code> from 203.0.113.33 to 203.0.113.34 with netmask 255.255.255.248.','Translate sources matching ACL 1 using pool PUBLIC, without overload.','Ping the web server from PC1, then PC2, then PC3. On R1, look at <code>show ip nat translations</code> and <code>show ip nat statistics</code>. Why did PC3 fail?','Change the rule to overload the pool. IOS will not let you change a rule that is in use: clear the translations first, then replace the rule.','Ping from all three PCs again and look at the translations.'],
 why:['As with PAT, the ACL only selects who gets translated, and inside/outside set the direction.','The pool is the set of public addresses NAT may use. The netmask does not have to match any interface; it just has to contain the whole range.','Without overload, dynamic NAT is one-to-one: each inside host borrows a whole public address for as long as its translation lasts.','PC1 and PC2 took the two addresses. PC3 matches the ACL but finds the pool empty, so its packets are dropped and the misses counter goes up. On a real router the borrowed addresses are held for 24 hours after the last use.','Adding overload turns the pool into PAT: every host shares the first address, kept apart by port numbers. IOS refuses to change or remove a rule while translations made by it still exist, which is why clear ip nat translation * comes first.','All three now share 203.0.113.33. The inside local ports are each host\'s own; the inside global ports are what R1 picked to keep them apart.'],
 checks:[['Pool PUBLIC is 203.0.113.33 to .34 in a /29',n=>{const P=((n.devs.R1.nat||{}).pools||{}).PUBLIC;return !!P&&P.start===ip2n('203.0.113.33')&&P.end===ip2n('203.0.113.34')&&P.len===29;}],['ACL 1 is translated through pool PUBLIC with overload',n=>{const d=n.devs.R1;return !!d.nat&&d.nat.rules.some(r=>r.acl==='1'&&r.pool==='PUBLIC'&&r.overload)&&!!d.acls&&!!d.acls['1']&&d.acls['1'].entries.some(e=>e.action==='permit'&&hit(e.src,ip2n('192.168.1.13')));}],['G0/0 is NAT inside and G0/1 is NAT outside',n=>IF(n,'R1','g0/0').nat==='inside'&&IF(n,'R1','g0/1').nat==='outside'],['All three PCs reach the web server at the same time',n=>together(n,()=>['PC1','PC2','PC3'].every(p=>P(n,p,'198.51.100.10')))],['They share one public address',n=>together(n,()=>{['PC1','PC2','PC3'].forEach(p=>P(n,p,'198.51.100.10'));const t=n.devs.R1.nat.table;return t.length>=3&&new Set(t.map(x=>x.ig)).size===1&&t[0].ig===ip2n('203.0.113.33');})]],
 solution:{R1:['enable','configure terminal','access-list 1 permit 192.168.1.0 0.0.0.255','interface g0/0','ip nat inside','interface g0/1','ip nat outside','exit','ip nat pool PUBLIC 203.0.113.33 203.0.113.34 netmask 255.255.255.248','ip nat inside source list 1 pool PUBLIC overload','end']}},
 ['R1: enable | configure terminal | access-list 1 permit 192.168.1.0 0.0.0.255 | interface g0/0 | ip nat inside | interface g0/1 | ip nat outside | exit',
  'R1: ip nat pool PUBLIC 203.0.113.33 203.0.113.34 netmask 255.255.255.248',
  'R1: ip nat inside source list 1 pool PUBLIC | end',
  'PC1: ping 198.51.100.10 ; PC2: ping 198.51.100.10 ; PC3: # this one fails: the pool is empty | ping 198.51.100.10 ; R1: show ip nat translations | show ip nat statistics',
  'R1: configure terminal | # refused while translations exist | no ip nat inside source list 1 pool PUBLIC | do clear ip nat translation * | no ip nat inside source list 1 pool PUBLIC | ip nat inside source list 1 pool PUBLIC overload | end',
  'PC1: ping 198.51.100.10 ; PC2: ping 198.51.100.10 ; PC3: ping 198.51.100.10 ; R1: show ip nat translations']);

// ----- phase 2, lab 14
Cn('acl','<n> permit <rest>',e=>aclAdd(e,e.s.ctx,e.d.acls[e.s.ctx].type,'permit',e.args[1],e.args[0]));
Cn('acl','<n> deny <rest>',e=>aclAdd(e,e.s.ctx,e.d.acls[e.s.ctx].type,'deny',e.args[1],e.args[0]));
Cn('acl','no <n>',e=>{const a=e.d.acls[e.s.ctx];a.entries=a.entries.filter(x=>x.seq!==e.args[0]);});
Cn('acl','no <w> <rest>',e=>{const w=e.args[0].toLowerCase(),act=['permit','deny'].find(x=>x.startsWith(w));if(!act)return e.out(BAD);const a=e.d.acls[e.s.ctx],txt=(act+' '+e.args[1]).replace(/\s+/g,' ').trim().toLowerCase();
  a.entries=a.entries.filter(x=>x.text.replace(/\s+/g,' ').trim().toLowerCase()!==txt);});
// ip access-list resequence NAME START STEP renumbers the entries in their current order.
Cn('config','ip access-list resequence <w> <n> <n>',e=>{const a=(e.d.acls||{})[e.args[0]];if(!a)return e.out('%Access list '+e.args[0]+' does not exist');a.entries.forEach((x,k)=>{x.seq=e.args[1]+k*e.args[2];});},['router'],true);
CCNA_LAB_MAP['Named ACLs and sequence numbers']=['5.6'];
Object.assign(WHYC,{
'<n> permit <rest>':'Adds a permit line at this sequence number. A number between two existing lines inserts it between them, so you do not have to rebuild the whole list.',
'<n> deny <rest>':'Adds a deny line at this sequence number, between existing lines if you pick a number between theirs.',
'no <n>':'Deletes the line with this sequence number, leaving the rest of the ACL in place.',
'ip access-list resequence <w> <n> <n>':'Renumbers the ACL\'s lines from a start value in even steps, opening gaps again for future insertions.'});
addLab({title:'Named ACLs and sequence numbers',group:'Security',
 brief:'R1 filters access to the file server with a named standard ACL. Three change requests have arrived: let one contractor laptop through, block one staff PC, and remove a line for a VPN range that no longer exists. Edit the ACL in place by sequence number instead of deleting and retyping it.',
 pos:{PC1:[70,50],HR:[70,125],CONTR:[70,195],LAPTOP:[220,195],SW1:[220,110],R1:[380,110],SRV1:[540,110]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkSwitch('SW1'),mkPC('PC1','192.168.10.10',24,'192.168.10.1'),mkPC('HR','192.168.10.66',24,'192.168.10.1'),mkPC('CONTR','192.168.20.20',24,'192.168.20.1'),mkPC('LAPTOP','192.168.20.50',24,'192.168.20.1'),srv('SRV1','192.168.30.10',24,'192.168.30.1',[445])]);
  link(n,'PC1','f0','SW1','f0/1');link(n,'HR','f0','SW1','f0/2');link(n,'CONTR','f0','SW1','f0/3');link(n,'LAPTOP','f0','SW1','f0/4');link(n,'SW1','g0/1','R1','g0/0');link(n,'SW1','g0/2','R1','g0/1');link(n,'R1','g0/2','SRV1','f0');
  cfg(n,{SW1:['enable','configure terminal','vlan 10','name STAFF','vlan 20','name CONTRACTORS','interface range f0/1 - 2','switchport mode access','switchport access vlan 10','interface range f0/3 - 4','switchport mode access','switchport access vlan 20',
     'interface g0/1','switchport mode access','switchport access vlan 10','interface g0/2','switchport mode access','switchport access vlan 20','end'],
   R1:['enable','configure terminal','interface g0/0','ip address 192.168.10.1 255.255.255.0','no shutdown','interface g0/1','ip address 192.168.20.1 255.255.255.0','no shutdown','interface g0/2','ip address 192.168.30.1 255.255.255.0','no shutdown','exit',
     'ip access-list standard SRV-ACCESS','permit 192.168.10.0 0.0.0.255','deny 192.168.20.0 0.0.0.255','permit 172.16.0.0 0.0.255.255','exit','interface g0/2','ip access-group SRV-ACCESS out','end']});return n;},
 addr:[['PC1 / HR','Staff, VLAN 10','192.168.10.10, 192.168.10.66'],['CONTR / LAPTOP','Contractors, VLAN 20','192.168.20.20, 192.168.20.50'],['SRV1','File server','192.168.30.10'],['ACL','SRV-ACCESS, outbound on R1 G0/2','standard, named']],
 tasks:['On R1, run <code>show access-lists</code>. Note the sequence numbers. Ping the server from PC1, HR, CONTR and LAPTOP, and look at the match counters again.','The contractor LAPTOP (192.168.20.50) needs the server. Enter the ACL and insert a permit for that host between lines 10 and 20.','HR\'s PC (192.168.10.66) must lose access. Insert a deny for that host before line 10.','The 172.16.0.0/16 VPN range was retired. Delete its line by sequence number.','Renumber the ACL from 10 in steps of 10, then look at it again.','Test: PC1 and LAPTOP reach the server; HR and CONTR do not.'],
 why:['Every ACL line has a sequence number, usually 10, 20, 30. Lines are checked from the lowest number up and the first match wins. The counters show which line each test hit.','Line 20 denies the whole contractor subnet, so a permit for one laptop only works if it comes first. Sequence 15 puts it between 10 and 20 without touching anything else.','The same logic: line 10 permits the whole staff subnet, so the host deny must come before it. Any number below 10 works.','no followed by a sequence number removes exactly one line. With a numbered ACL edited the old way, no access-list 10 would have deleted the whole list.','After a few insertions the numbers are uneven (5, 10, 15, 20). Resequencing restores even gaps so the next change can be inserted cleanly. The order does not change.','Test every rule you changed and one you did not. The laptop is an exception to line 20, HR is an exception to line 10, and the rest of each subnet behaves as before.'],
 checks:[['LAPTOP reaches the server and CONTR is still blocked',n=>P(n,'LAPTOP','192.168.30.10')&&!P(n,'CONTR','192.168.30.10')],['HR is blocked and PC1 still reaches the server',n=>!P(n,'HR','192.168.30.10')&&P(n,'PC1','192.168.30.10')],['The retired 172.16.0.0/16 line is gone',n=>!n.devs.R1.acls['SRV-ACCESS'].entries.some(x=>x.src.net===ip2n('172.16.0.0'))],['SRV-ACCESS is renumbered 10, 20, 30, 40 in the right order',n=>{const E=n.devs.R1.acls['SRV-ACCESS'].entries;return E.map(x=>x.seq).join()==='10,20,30,40'&&E[0].action==='deny'&&E[0].src.net===ip2n('192.168.10.66')&&E[0].src.wild===0&&E[2].src.net===ip2n('192.168.20.50')&&E[2].action==='permit';}],['The ACL is still applied outbound on G0/2',n=>IF(n,'R1','g0/2').aclOut==='SRV-ACCESS']],
 solution:{R1:['enable','configure terminal','ip access-list standard SRV-ACCESS','15 permit host 192.168.20.50','5 deny host 192.168.10.66','no 30','exit','ip access-list resequence SRV-ACCESS 10 10','end']}},
 ['R1: enable | show access-lists ; PC1: ping 192.168.30.10 ; HR: ping 192.168.30.10 ; CONTR: ping 192.168.30.10 ; LAPTOP: ping 192.168.30.10 ; R1: show access-lists',
  'R1: configure terminal | ip access-list standard SRV-ACCESS | 15 permit host 192.168.20.50',
  'R1: 5 deny host 192.168.10.66 | do show access-lists',
  'R1: no 30 | exit',
  'R1: ip access-list resequence SRV-ACCESS 10 10 | end | show access-lists',
  'PC1: ping 192.168.30.10 ; LAPTOP: ping 192.168.30.10 ; HR: # blocked by the new line 10 | ping 192.168.30.10 ; CONTR: ping 192.168.30.10']);

// ----- phase 2, lab 15
// Does a UDP service answer? Uses the real forwarding path (routes, ACLs, NAT) without touching the trace panel.
function udpOk(net,src,ip,port){const keep=TRACE,was=LIVE;LIVE=false;try{const r=reach(net,src,ip,'udp',port);if(!r.ok)return false;const d=r.f.dest;return d.services?d.services.includes(port):listens(d,port);}finally{LIVE=was;TRACE=keep;}}
const ownerOf=(net,ip)=>Object.values(net.devs).find(x=>Object.values(x.ifs).some(i=>i.ip===ip));
// NTP: a client syncs to the reachable configured server with the lowest stratum and becomes that stratum plus one.
// A server device has ntpStratum; a router is a source when it is "ntp master" or is itself synchronised.
function ntpState(net,d,depth=0){if(d.ntpMaster)return {synced:true,stratum:d.ntpMaster,ref:null,master:true};
  let best=null;if(depth<5)for(const ip of d.ntpServers||[]){const s=ownerOf(net,ip);if(!s||s===d||!udpOk(net,d,ip,123))continue;
    const st=s.ntpStratum??(s.type==='router'?(x=>x.synced?x.stratum:16)(ntpState(net,s,depth+1)):16);if(st<16&&(!best||st<best.st))best={ip,st,src:s};}
  // A clock that has synchronised keeps running on its own for a long time after the server goes quiet,
  // so it stays synchronised while its server is still configured.
  if(best){d.ntpLast={stratum:best.st+1,ip:best.ip};return {synced:true,stratum:best.st+1,ref:best.ip,src:best.src};}
  if(d.ntpLast&&(d.ntpServers||[]).includes(d.ntpLast.ip))return {synced:true,stratum:d.ntpLast.stratum,ref:d.ntpLast.ip,held:true};
  return {synced:false,stratum:16,ref:null};}
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function devTime(d){const now=new Date(Date.now()+((d.tz&&d.tz.off)||0)*3600000);return now;}
const hms=t=>[t.getUTCHours(),t.getUTCMinutes(),t.getUTCSeconds()].map(x=>String(x).padStart(2,'0')).join(':')+'.'+String(t.getUTCMilliseconds()).padStart(3,'0');
// A timestamp starts with * while the clock is not authoritative (not synchronised to NTP).
const stamp=(net,d)=>{const t=devTime(d);return (ntpState(net,d).synced?'':'*')+MON[t.getUTCMonth()]+' '+String(t.getUTCDate()).padStart(2,' ')+' '+hms(t)+': ';};
// Syslog: every message goes into the log buffer; those at or below the trap level also go to each logging host over UDP 514.
const SEV=line=>{const m=/^%[A-Z0-9_]+-(\d)-[A-Z0-9_]+:/.exec(line);return m?+m[1]:null;};
function logEvent(net,d,msg){const sev=SEV(msg);if(sev===null||d.type==='pc')return;const line=(d.tsLog?stamp(net,d):'')+msg;
  (d.logBuf||(d.logBuf=[])).push(line);if(d.logBuf.length>200)d.logBuf.shift();
  if(sev<=(d.trapLevel??6))for(const h of d.logHosts||[]){const s=ownerOf(net,h);if(s&&s.services&&s.services.includes(514)&&udpOk(net,d,h,514)){d.trapSent=(d.trapSent||0)+1;(s.syslog||(s.syslog=[])).push({from:d.hostname,ip:null,sev,line});}}}
{const ex0=execLine;execLine=function(net,d,s,line){
  // Interface changes caused on other devices (the far end of a link) are logged there, not on this console.
  const others=Object.values(net.devs).filter(x=>x!==d&&x.type!=='pc'),snap=x=>{const m={};for(const n in x.ifs)m[n]=ifUp(net,x,x.ifs[n]);return m;},before=new Map(others.map(x=>[x,snap(x)]));
  const wasCfg=!['user','priv','pc'].includes(s.mode),out=ex0(net,d,s,line);
  if(wasCfg&&s.mode==='priv'&&d.type!=='pc')out.push('%SYS-5-CONFIG_I: Configured from console by console');
  for(let k=0;k<out.length;k++)if(SEV(out[k])!==null){logEvent(net,d,out[k]);if(d.tsLog)out[k]=stamp(net,d)+out[k];}
  for(const x of others){const b=before.get(x),a=snap(x);for(const n in a)if(!!b[n]!==a[n]){const st=a[n]?'up':'down';logEvent(net,x,'%LINK-3-UPDOWN: Interface '+n+', changed state to '+st);logEvent(net,x,'%LINEPROTO-5-UPDOWN: Line protocol on Interface '+n+', changed state to '+st);}}
  return out;};}
const sevOf=w=>{w=String(w).toLowerCase();if(/^[0-7]$/.test(w))return +w;const k=SEVN.findIndex(x=>x.startsWith(w));return k<0?null:k;};
Cn('config','ntp server <ip>',e=>{const L=e.d.ntpServers||(e.d.ntpServers=[]);if(!L.includes(e.args[0]))L.push(e.args[0]);},['router','switch']);
Cn('config','no ntp server <ip>',e=>{e.d.ntpServers=(e.d.ntpServers||[]).filter(x=>x!==e.args[0]);},['router','switch']);
Cn('config','ntp master <n>',e=>{if(e.args[0]<1||e.args[0]>15)return e.out(BAD);e.d.ntpMaster=e.args[0];},['router']);
Cn('config','clock timezone <w> <n>',e=>{e.d.tz={name:e.args[0],off:e.args[1]};},['router','switch']);
Cn('config','clock timezone <w> -<n>',e=>{},['router','switch']);
CMDS.pop();
Cn('config','service timestamps log datetime msec',e=>{e.d.tsLog=true;},['router','switch']);
Cn('config','service timestamps <rest>',e=>{const t=e.args[0].toLowerCase();if(/^debug/.test(t))return;if(/^log/.test(t))e.d.tsLog=/datetime/.test(t);else e.out(BAD);},['router','switch']);
Cn('config','no service timestamps <rest?>',e=>{e.d.tsLog=false;},['router','switch']);
Cn('config','logging host <ip>',e=>{const L=e.d.logHosts||(e.d.logHosts=[]);if(!L.includes(e.args[0]))L.push(e.args[0]);},['router','switch']);
Cn('config','logging <ip>',e=>{const L=e.d.logHosts||(e.d.logHosts=[]);if(!L.includes(e.args[0]))L.push(e.args[0]);},['router','switch']);
Cn('config','no logging host <ip>',e=>{e.d.logHosts=(e.d.logHosts||[]).filter(x=>x!==e.args[0]);},['router','switch']);
Cn('config','logging trap <w>',e=>{const v=sevOf(e.args[0]);if(v===null)return e.out(BAD);e.d.trapLevel=v;},['router','switch']);
Cn(EX,'show ntp status',e=>{const st=ntpState(e.net,e.d);if(st.synced)e.out('Clock is synchronized, stratum '+st.stratum+', reference is '+(st.master?'127.127.1.1':n2ip(st.ref)));else e.out('Clock is unsynchronized, stratum 16, no reference clock');
  e.out('nominal freq is 250.0000 Hz, actual freq is 250.0000 Hz, precision is 2**10','ntp uptime is 51200 (1/100 of seconds), resolution is 4000','clock offset is 0.0000 msec, root delay is '+(st.synced?'1.00':'0.00')+' msec','root dispersion is '+(st.synced?'7.85':'0.00')+' msec, peer dispersion is '+(st.synced?'0.12':'0.00')+' msec','system poll interval is 64, '+(st.synced?'last update was 21 sec ago.':'never updated.'));},['router','switch']);
Cn(EX,'show ntp associations',e=>{const{net,d,out}=e,st=ntpState(net,d);out('','  address         ref clock       st   when   poll reach  delay  offset   disp');
  if(d.ntpMaster)out('*~127.127.1.1     .LOCL.          '+String(d.ntpMaster-1).padStart(2)+'     12     16   377  0.000   0.000  0.232');
  for(const ip of d.ntpServers||[]){const s=ownerOf(net,ip),ok=!!s&&udpOk(net,d,ip,123),sst=!ok?16:s.ntpStratum??(s.type==='router'?ntpState(net,s).stratum:16),sel=st.synced&&st.ref===ip;
    out((sel?'*':' ')+'~'+pad(n2ip(ip),16)+pad(ok&&sst<16?(s.ntpRef?'.'+s.ntpRef+'.':n2ip((ntpState(net,s).ref)??ip)):'.INIT.',16)+String(sst).padStart(2)+'     '+(ok?'21':' -').padStart(2)+'     64   '+(ok?'377':'  0')+'  '+(ok?'1.000   0.000  0.120':'0.000   0.000 15937.'));}
  out(' * sys.peer, # selected, + candidate, - outlyer, x falseticker, ~ configured');},['router','switch']);
Cn(EX,'show clock',e=>{const t=devTime(e.d);e.out((ntpState(e.net,e.d).synced?'':'*')+hms(t)+' '+(e.d.tz?e.d.tz.name:'UTC')+' '+DAYS[t.getUTCDay()]+' '+MON[t.getUTCMonth()]+' '+t.getUTCDate()+' '+t.getUTCFullYear());},['router','switch']);
Cn(EX,'show logging',e=>{const{d,out}=e,lvl=SEVN[d.trapLevel??6],buf=d.logBuf||[];
  out('Syslog logging: enabled (0 messages dropped, 0 messages rate-limited, 0 flushes, 0 overruns, xml disabled, filtering disabled)','','    Console logging: level debugging, '+buf.length+' messages logged, xml disabled,','                     filtering disabled','    Buffer logging:  level debugging, '+buf.length+' messages logged, xml disabled,','                     filtering disabled','',
    '    Trap logging: level '+lvl+', '+(d.trapSent||0)+' message lines logged');
  for(const h of d.logHosts||[])out('        Logging to '+n2ip(h)+'  (udp port 514, audit disabled,','              link up),','              '+(d.trapSent||0)+' message lines logged,','              0 message lines rate-limited,','              xml disabled, sequence number disabled','              filtering disabled');
  out('','Log Buffer (8192 bytes):','',...buf);},['router','switch']);
// The syslog server's own viewer.
Cn('pc','syslog',e=>{if(!(e.d.services||[]).includes(514))return e.out("'syslog' is not recognized as an internal or external command.");const L=e.d.syslog||[];
  e.out('Syslog server: '+L.length+' message'+(L.length===1?'':'s')+' received','',...(L.length?L.map(m=>pad(m.from,10)+' '+m.line):['(none yet)']));});
CCNA_LAB_MAP['NTP and syslog']=['4.2','4.5'];
Object.assign(WHYC,{
'ntp server <ip>':'Makes this device an NTP client of that server. Once it synchronises it takes the server\'s stratum plus one, and can serve time to others.',
'ntp master <n>':'Makes the router an authoritative time source at this stratum from its own clock. Only for labs or isolated networks; real networks sync to a proper reference.',
'show ntp status':'Shows whether the clock is synchronised, its stratum, and which server it is following.',
'show ntp associations':'Lists the configured NTP servers. * marks the one in use (sys.peer), ~ means configured, st is its stratum and reach is a bitmap of recent replies (377 means all eight).',
'show clock':'Shows the device time. A leading * means the time is not authoritative: it has not been synchronised.',
'clock timezone <w> <n>':'Sets the time zone name and offset from UTC used for display and log timestamps.',
'service timestamps log datetime msec':'Stamps every log message with the date and time to the millisecond instead of uptime, so messages from different devices can be lined up.',
'logging host <ip>':'Sends log messages to this syslog server (UDP port 514) as well as keeping them on the device.',
'logging trap <w>':'Sets the most detailed severity sent to the syslog server: 0 emergencies, 1 alerts, 2 critical, 3 errors, 4 warnings, 5 notifications, 6 informational, 7 debugging. warnings sends levels 0 to 4.',
'show logging':'Shows the logging levels for each destination, how many messages went to the syslog server, and the log buffer itself.',
'syslog':'On the syslog server: lists the messages it has received, with the sending device.'});
addLab({title:'NTP and syslog',group:'IP services',
 brief:'Two routers keep their own unsynchronised clocks and their logs stay on the box, so when something breaks nobody can line events up. Point both at the NTP server, stamp every message with the date and time, and send everything from warnings up to the syslog server, without flooding it with routine notices.',
 pos:{NTP1:[60,60],LOG1:[60,190],SW1:[190,125],R1:[330,125],R2:[490,125]},start:'R2',
 build(){const ntp=srv('NTP1','192.168.1.50',24,'192.168.1.1',[123]);ntp.ntpStratum=1;ntp.ntpRef='GPS';const log=srv('LOG1','192.168.1.60',24,'192.168.1.1',[514]);
  const n=mkNet([mkRouter('R1'),mkRouter('R2'),mkSwitch('SW1'),ntp,log]);link(n,'NTP1','f0','SW1','f0/1');link(n,'LOG1','f0','SW1','f0/2');link(n,'SW1','g0/1','R1','g0/0');link(n,'R1','g0/1','R2','g0/1');
  cfg(n,{R1:['enable','configure terminal','interface g0/0','ip address 192.168.1.1 255.255.255.0','no shutdown','interface g0/1','ip address 10.0.12.1 255.255.255.252','no shutdown','end'],
   R2:['enable','configure terminal','interface g0/1','ip address 10.0.12.2 255.255.255.252','no shutdown','interface loopback 0','ip address 2.2.2.2 255.255.255.255','exit','ip route 0.0.0.0 0.0.0.0 10.0.12.1','end']});
  for(const d of [n.devs.R1,n.devs.R2])delete d.logBuf;return n;},
 addr:[['NTP1','Stratum 1 time server (GPS)','192.168.1.50'],['LOG1','Syslog server','192.168.1.60'],['R1','G0/0 / G0/1','192.168.1.1, 10.0.12.1'],['R2','G0/1, default route to R1','10.0.12.2']],
 tasks:['On R2, run <code>show clock</code> and <code>show ntp status</code>. What does the * in front of the time mean?','Make R1 and R2 NTP clients of 192.168.1.50. Check <code>show ntp associations</code> and <code>show ntp status</code> on R2, then <code>show clock</code> again.','On both routers, timestamp log messages with the date and time to the millisecond.','On both routers, send syslog to 192.168.1.60, but only severity warnings (4) and more serious.','On R2, shut down G0/1 (the link to R1) and bring it back up. Read the messages on both routers with <code>show logging</code>.','On LOG1, run <code>syslog</code> to see what arrived. Which messages were not sent, and why?'],
 why:['A router\'s clock starts from whatever it was set to, or from 1993 after a reload. The * means the time is not authoritative. Logs stamped with a wrong time cannot be matched against other devices.','NTP needs UDP 123 to work end to end. R1 learns time from the stratum 1 server and becomes stratum 2. R2 follows the same server through R1 and also becomes stratum 2. The * in show ntp associations marks the server in use.','Without datetime stamps a message only says how long the router had been up, which is useless when comparing devices. With NTP behind it, the timestamps on every device agree.','Syslog has eight levels: 0 emergencies, 1 alerts, 2 critical, 3 errors, 4 warnings, 5 notifications, 6 informational, 7 debugging. The trap level is the most detailed one sent: warnings sends 0 to 4. The default, informational, would send almost everything.','R2 logs LINK-5-CHANGED (an administrative shutdown, a notification) and R1 logs LINK-3-UPDOWN (an error: its link went down without anyone touching it). Both, and the LINEPROTO-5 messages, stay in each router\'s local buffer regardless.','Only the level 3 messages reached the server; the level 5 ones were filtered by the trap level. Note that R2 could not send its "down" messages at all: the link it needed was the one that was down. That is why important devices also keep a local buffer.'],
 checks:[['R1 and R2 are synchronised to 192.168.1.50 at stratum 2',n=>['R1','R2'].every(r=>{const s=ntpState(n,n.devs[r]);return s.synced&&s.ref===ip2n('192.168.1.50')&&s.stratum===2;})],['Log messages carry the date and time to the millisecond on both routers',n=>!!n.devs.R1.tsLog&&!!n.devs.R2.tsLog],['Both routers log to 192.168.1.60 at level warnings',n=>['R1','R2'].every(r=>(n.devs[r].logHosts||[]).includes(ip2n('192.168.1.60'))&&n.devs[r].trapLevel===4)],['LOG1 received a LINK-3-UPDOWN error from each router',n=>['R1','R2'].every(r=>(n.devs.LOG1.syslog||[]).some(m=>m.from===n.devs[r].hostname&&/%LINK-3-UPDOWN/.test(m.line)))],['A warning reaches LOG1 but a notification does not',n=>{const L=n.devs.LOG1,keep=(L.syslog||[]).slice(),k1=n.devs.R1.logBuf&&n.devs.R1.logBuf.slice(),sent=n.devs.R1.trapSent;
   try{L.syslog=[];logEvent(n,n.devs.R1,'%SYS-4-TEST: warning');logEvent(n,n.devs.R1,'%SYS-5-TEST: notice');return L.syslog.length===1&&L.syslog[0].sev===4;}finally{L.syslog=keep;n.devs.R1.logBuf=k1;n.devs.R1.trapSent=sent;}}]],
 solution:{R1:['enable','configure terminal','ntp server 192.168.1.50','service timestamps log datetime msec','logging trap warnings','logging host 192.168.1.60','end'],
  R2:['enable','configure terminal','ntp server 192.168.1.50','service timestamps log datetime msec','logging trap warnings','logging host 192.168.1.60','interface g0/1','shutdown','no shutdown','end']}},
 ['R2: enable | show clock | show ntp status',
  'R1: enable | configure terminal | ntp server 192.168.1.50 ; R2: configure terminal | ntp server 192.168.1.50 | do show ntp associations | do show ntp status | do show clock',
  'R1: service timestamps log datetime msec ; R2: service timestamps log datetime msec',
  'R1: logging trap warnings | logging host 192.168.1.60 | end ; R2: logging trap warnings | logging host 192.168.1.60',
  'R2: interface g0/1 | shutdown | no shutdown | end | show logging ; R1: show logging',
  'LOG1: syslog']);

// ===== phase 3 =====
// ----- phase 3, lab 16
// A Catalyst 3560-24PS: 24 FastEthernet and 2 Gigabit ports, classic IOS, so ip routing starts off.
function mkL3Switch(name){const d=mkSwitch(name);d.l3=true;d.statics=[];for(let k=9;k<=24;k++)addIf(d,'FastEthernet0/'+k);return d;}
Cn('if','no switchport',e=>{if(!e.d.l3)return e.out(BAD);e.s.ctx.forEach(i=>{if(i.name.startsWith('Vlan')||i.name.startsWith('Port-channel'))return;i.routed=true;i.mode='access';i.modeSet=false;i.accessVlan=1;delete i.voiceVlan;});},['switch']);
Cn('if','switchport',e=>{if(!e.d.l3)return;e.s.ctx.forEach(i=>{i.routed=false;i.ip=null;i.len=null;});},['switch']);
// Routing, ACL and relay commands also run on a Layer 3 switch.
{const L3CMD=/^(no )?(ip route|router ospf|ip ospf|access-list|ip access-list|ip access-group|ip helper-address|clear ip ospf|show ip ospf|show ip protocols|show ip route)/;
 for(const c of CMDS){const k=c.pat.join(' ');if(!(c.types&&c.types.length===1&&c.types[0]==='router'&&L3CMD.test(k)))continue;c.types=['router','switch'];const f=c.fn;
  c.fn=k.startsWith('show ip route')?e=>{if(e.d.type==='switch'&&!e.d.ipRouting){e.s.last=k;return e.out('Default gateway is '+(e.d.gw!=null?n2ip(e.d.gw):'not set'),'','Host               Gateway           Last Use    Total Uses  Interface','ICMP redirect cache is empty');}f(e);}
   :e=>{if(e.d.type==='switch'&&!e.d.l3)return e.out(BAD);f(e);};}}
CCNA_LAB_MAP['Inter-VLAN routing on a Layer 3 switch']=['2.1','3.3'];
Object.assign(WHYC,{
'ip routing':'Turns on IP routing. A Layer 3 switch only routes between its VLANs once this is on; until then it behaves like a Layer 2 switch with a default gateway.',
'no switchport':'Turns a switch port into a routed port: it leaves every VLAN and takes an IP address itself, like a router interface. Used for links to routers and between Layer 3 switches.',
'switchport':'Turns a routed port back into a Layer 2 switch port.',
'switchport trunk encapsulation dot1q':'Switches that also support Cisco\'s old ISL tagging must be told to use 802.1Q before a port can be made a trunk.'});
addLab({title:'Inter-VLAN routing on a Layer 3 switch',group:'Switching',
 brief:'The site is outgrowing router-on-a-stick: every packet between VLANs crosses the one router link twice. A Catalyst 3560 has been installed in the core. Make it the gateway for both VLANs and route between them in hardware, with a routed uplink to the edge router for everything else.',
 pos:{ASW1:[130,90],DSW1:[330,90],R1:[520,90],PC3:[130,195],PC1:[260,195],PC2:[400,195]},start:'DSW1',
 build(){const n=mkNet([mkL3Switch('DSW1'),mkSwitch('ASW1'),mkRouter('R1'),mkPC('PC1','192.168.10.11',24,'192.168.10.1'),mkPC('PC2','192.168.20.12',24,'192.168.20.1'),mkPC('PC3','192.168.10.13',24,'192.168.10.1')]);
  link(n,'DSW1','g0/1','ASW1','g0/1');link(n,'DSW1','g0/2','R1','g0/0');link(n,'DSW1','f0/1','PC1','f0');link(n,'DSW1','f0/2','PC2','f0');link(n,'ASW1','f0/1','PC3','f0');
  const v=['vlan 10','name STAFF','vlan 20','name GUEST'];
  cfg(n,{DSW1:['enable','configure terminal',...v,'interface f0/1','switchport mode access','switchport access vlan 10','interface f0/2','switchport mode access','switchport access vlan 20','interface g0/1','switchport trunk encapsulation dot1q','switchport mode trunk','end'],
   ASW1:['enable','configure terminal',...v,'interface f0/1','switchport mode access','switchport access vlan 10','interface g0/1','switchport mode trunk','end'],
   R1:['enable','configure terminal','interface g0/0','ip address 10.0.0.2 255.255.255.252','no shutdown','interface loopback 0','ip address 203.0.113.1 255.255.255.255','exit','ip route 192.168.0.0 255.255.0.0 10.0.0.1','end']});return n;},
 addr:[['DSW1','Interface VLAN 10 / VLAN 20','192.168.10.1, 192.168.20.1 /24'],['DSW1','Gi0/2, routed','10.0.0.1/30'],['R1','G0/0 / Loopback 0 (internet)','10.0.0.2, 203.0.113.1'],['PC1 / PC3','VLAN 10','192.168.10.11, .13'],['PC2','VLAN 20','192.168.20.12']],
 tasks:['On DSW1, run <code>show ip route</code>. From PC1, ping PC2: it fails. Why?','Turn on IP routing on DSW1.','Create interface VLAN 10 (192.168.10.1/24) and interface VLAN 20 (192.168.20.1/24) on DSW1.','Make Gi0/2 a routed port with address 10.0.0.1/30.','Add a default route on DSW1 to R1 (10.0.0.2).','Verify: <code>show ip route</code> on DSW1, PC1 pings PC2, a trace from PC1 to PC2 stays on DSW1, and PC3 reaches the internet address 203.0.113.1.'],
 why:['With routing off, a Layer 3 switch is just a switch: show ip route only shows a default gateway. PC1 and PC2 are in different VLANs, and nothing routes between them yet.','ip routing is what turns the switch into a router for its own VLAN interfaces. Classic IOS on a 3560 ships with it off.','A switch virtual interface (SVI) is the switch\'s own Layer 3 interface in a VLAN, and the default gateway for its hosts. It comes up as long as the VLAN exists and one port carrying it is up, here an access port or the trunk to ASW1.','A routed port leaves the VLAN world entirely: it is a point-to-point link like a router interface, with no spanning tree and no VLAN to leak into.','Inter-VLAN traffic is now handled on DSW1, but anything else still needs a way out. One default route to the edge router covers it, and R1 already has a route back for 192.168.0.0/16.','The trace shows a single hop, 192.168.10.1, between PC1 and PC2: the switch routes between VLANs itself, without hairpinning through a router. PC3 proves the SVI works across the trunk too.'],
 checks:[['IP routing is on for DSW1',n=>!!n.devs.DSW1.ipRouting],['VLAN 10 and VLAN 20 interfaces are addressed and up',n=>hasIp(n,'DSW1','vlan10','192.168.10.1',24)&&hasIp(n,'DSW1','vlan20','192.168.20.1',24)&&ifUp(n,n.devs.DSW1,IF(n,'DSW1','vlan10'))&&ifUp(n,n.devs.DSW1,IF(n,'DSW1','vlan20'))],['Gi0/2 is a routed port with 10.0.0.1/30',n=>!!IF(n,'DSW1','g0/2').routed&&hasIp(n,'DSW1','g0/2','10.0.0.1',30)],['DSW1 has a default route to R1',n=>n.devs.DSW1.statics.some(s=>s.len===0&&s.nh===ip2n('10.0.0.2'))],['PC1 reaches PC2 through DSW1 alone',n=>{const f=tracePath(n,n.devs.PC1,ip2n('192.168.20.12'));return P(n,'PC1','192.168.20.12')&&f.ok&&!f.hops.path.includes('R1');}],['PC3 reaches the internet address through DSW1 and R1',n=>P(n,'PC3','203.0.113.1')]],
 solution:{DSW1:['enable','configure terminal','ip routing','interface vlan 10','ip address 192.168.10.1 255.255.255.0','no shutdown','interface vlan 20','ip address 192.168.20.1 255.255.255.0','no shutdown','interface g0/2','no switchport','ip address 10.0.0.1 255.255.255.252','exit','ip route 0.0.0.0 0.0.0.0 10.0.0.2','end']}},
 ['DSW1: enable | show ip route ; PC1: # fails: nothing routes between the VLANs yet | ping 192.168.20.12',
  'DSW1: configure terminal | ip routing',
  'DSW1: interface vlan 10 | ip address 192.168.10.1 255.255.255.0 | no shutdown | interface vlan 20 | ip address 192.168.20.1 255.255.255.0 | no shutdown',
  'DSW1: interface g0/2 | no switchport | ip address 10.0.0.1 255.255.255.252 | exit',
  'DSW1: ip route 0.0.0.0 0.0.0.0 10.0.0.2 | end',
  'DSW1: show ip route ; PC1: ping 192.168.20.12 | tracert 192.168.20.12 ; PC3: ping 203.0.113.1']);

// ----- phase 3, lab 17
const snoopOf=d=>d.snoop||(d.snoop={on:false,vlans:[],opt82:true,bind:[]});
Cn('config','ip dhcp snooping',e=>{snoopOf(e.d).on=true;},['switch']);
Cn('config','no ip dhcp snooping',e=>{snoopOf(e.d).on=false;},['switch']);
Cn('config','ip dhcp snooping vlan <rest>',e=>{const l=parseVlanList(e.args[0].replace(/\s+/g,''));if(!l)return e.out(BAD);const S=snoopOf(e.d);S.vlans=[...new Set(S.vlans.concat(l))].sort((a,b)=>a-b);},['switch']);
Cn('config','no ip dhcp snooping vlan <rest>',e=>{const l=parseVlanList(e.args[0].replace(/\s+/g,''))||[];const S=snoopOf(e.d);S.vlans=S.vlans.filter(v=>!l.includes(v));},['switch']);
Cn('config','ip dhcp snooping information option',e=>{snoopOf(e.d).opt82=true;},['switch']);
Cn('config','no ip dhcp snooping information option',e=>{snoopOf(e.d).opt82=false;},['switch']);
Cn('if','ip dhcp snooping trust',e=>e.s.ctx.forEach(i=>{i.snoopTrust=true;}),['switch']);
Cn('if','no ip dhcp snooping trust',e=>e.s.ctx.forEach(i=>{i.snoopTrust=false;}),['switch']);
Cn('if','ip dhcp snooping limit rate <n>',e=>e.s.ctx.forEach(i=>{i.snoopRate=e.args[0];}),['switch']);
Cn('config','ip dhcp relay information trust-all',e=>{e.d.relayTrustAll=true;},['router','switch']);
Cn('config','no ip dhcp relay information trust-all',e=>{e.d.relayTrustAll=false;},['router','switch']);
Cn('if','ip dhcp relay information trusted',e=>e.s.ctx.forEach(i=>{i.relayTrust=true;}),['router','switch']);
const macColon=m=>m.replace(/\./g,'').toUpperCase().match(/../g).join(':');
Cn(EX,'show ip dhcp snooping',e=>{const{d,out}=e,S=d.snoop||{on:false,vlans:[],opt82:true};
  out('Switch DHCP snooping is '+(S.on?'enabled':'disabled'),'Switch DHCP gleaning is disabled','DHCP snooping is configured on following VLANs:',S.vlans.length?S.vlans.join(','):'none','DHCP snooping is operational on following VLANs:',S.on&&S.vlans.length?S.vlans.filter(v=>d.vlans[v]).join(','):'none',
    'Insertion of option 82 is '+(S.opt82!==false?'enabled':'disabled'),'   circuit-id default format: vlan-mod-port','   remote-id: '+macOf(d)+' (MAC)','Option 82 on untrusted port is not allowed','Verification of hwaddr field is enabled','',
    'Interface                  Trusted    Allow option    Rate limit (pps)','-----------------------    -------    ------------    ----------------',
    ...sortIfs(Object.keys(d.ifs)).filter(n=>d.ifs[n].snoopTrust||d.ifs[n].snoopRate).map(n=>pad(n,27)+pad(d.ifs[n].snoopTrust?'yes':'no',11)+pad(d.ifs[n].snoopTrust?'yes':'no',16)+(d.ifs[n].snoopRate||'unlimited')));},['switch']);
Cn(EX,'show ip dhcp snooping binding',e=>{const B=(e.d.snoop&&e.d.snoop.bind)||[];e.out('MacAddress          IpAddress        Lease(sec)  Type           VLAN  Interface','------------------  ---------------  ----------  -------------  ----  --------------------',
  ...B.map(b=>pad(macColon(b.mac),20)+pad(n2ip(b.ip),17)+pad(b.static?'infinite':'86400',12)+pad(b.static?'static':'dhcp-snooping',15)+pad(b.vlan,6)+b.ifn),'Total number of bindings: '+B.length);},['switch'],true);
CCNA_LAB_MAP['DHCP snooping']=['5.7'];
Object.assign(WHYC,{
'ip dhcp snooping':'Turns DHCP snooping on globally. It still does nothing until you name the VLANs to protect.',
'ip dhcp snooping vlan <rest>':'Protects these VLANs: DHCP server messages are only accepted on trusted ports, and every lease handed out is recorded in the binding table.',
'ip dhcp snooping trust':'Marks the port as leading to legitimate DHCP servers (an uplink). Every other port is untrusted, so a DHCP server plugged into it is silenced.',
'ip dhcp snooping limit rate <n>':'Caps DHCP messages per second on an untrusted port, so one host cannot exhaust the pool by flooding requests.',
'no ip dhcp snooping information option':'Stops the switch adding option 82 to client requests. An IOS DHCP server or relay drops requests that carry option 82 without a relay address, so this is often needed when the server is a Cisco router.',
'ip dhcp relay information trust-all':'Configured on the router: accept requests carrying option 82 from the switch instead of dropping them. The alternative fix to turning option 82 off on the switch.',
'show ip dhcp snooping':'Shows whether snooping is on, for which VLANs, whether option 82 is inserted, and which ports are trusted.',
'show ip dhcp snooping binding':'The binding table: each client\'s MAC address, the IP it leased, its VLAN and the switch port it is on. Dynamic ARP Inspection checks against this table.'});
addLab({title:'DHCP snooping',group:'Security',
 brief:'Users report they get an address but cannot reach anything. Someone has plugged a laptop running a DHCP server into the access switch, and it answers faster than R1, handing out itself as the default gateway. Protect the VLAN so only the real server can answer, and make sure legitimate clients still get their leases.',
 pos:{PC1:[60,60],PC2:[60,190],ROGUE:[330,190],SW1:[200,125],R1:[400,125],NET:[545,125]},start:'SW1',
 build(){const rogue=srv('ROGUE','192.168.10.250',24,null,[67]);rogue.dhcpServe={start:ip2n('192.168.10.200'),end:ip2n('192.168.10.210'),len:24,gw:ip2n('192.168.10.250'),dns:ip2n('192.168.10.250')};
  const n=mkNet([mkRouter('R1'),mkSwitch('SW1'),mkPC('PC1',null,24),mkPC('PC2',null,24),rogue,srv('NET','203.0.113.10',24,'203.0.113.1',[80])]);
  link(n,'PC1','f0','SW1','f0/1');link(n,'PC2','f0','SW1','f0/2');link(n,'ROGUE','f0','SW1','f0/5');link(n,'SW1','g0/1','R1','g0/0');link(n,'R1','g0/1','NET','f0');
  cfg(n,{SW1:['enable','configure terminal','vlan 10','name STAFF','interface range f0/1 - 8','switchport mode access','switchport access vlan 10','interface g0/1','switchport mode access','switchport access vlan 10','end'],
   R1:['enable','configure terminal','interface g0/0','ip address 192.168.10.1 255.255.255.0','no shutdown','interface g0/1','ip address 203.0.113.1 255.255.255.0','no shutdown','exit','ip dhcp excluded-address 192.168.10.1 192.168.10.10','ip dhcp pool STAFF','network 192.168.10.0 255.255.255.0','default-router 192.168.10.1','dns-server 203.0.113.53','end']});return n;},
 addr:[['R1','G0/0, real gateway and DHCP server','192.168.10.1/24'],['ROGUE','Unauthorised DHCP server on Fa0/5','192.168.10.250'],['SW1','Uplink to R1','Gi0/1'],['NET','A server beyond R1','203.0.113.10']],
 tasks:['On PC1, run <code>ipconfig /renew</code>. Who answered, and which gateway did PC1 get? Try to ping 203.0.113.10.','On SW1, turn on DHCP snooping and enable it for VLAN 10.','Trust the uplink to R1, Gi0/1. Leave every other port untrusted.','Renew PC1 again. It fails: read <code>show ip dhcp snooping</code> and work out why the real server stays silent, then fix it on SW1.','Renew PC1 and PC2, ping 203.0.113.10 from both, and look at <code>show ip dhcp snooping binding</code> on SW1.'],
 why:['DHCP is first come, first served. The rogue laptop sits on the same switch, so its offer arrives first and the client believes it. With the rogue as gateway, all traffic goes to the attacker, or nowhere.','Snooping only protects the VLANs you list. Once on, the switch inspects every DHCP message in those VLANs.','Server messages (offers and acknowledgements) are only allowed in through trusted ports. The uplink leads to the real server; the rogue\'s port, like every user port, is untrusted, so its offers are dropped.','With snooping on, the switch adds option 82 (which port the request came from) but no relay address. A Cisco router acting as DHCP server drops such requests as inconsistent. Turning option 82 off on the switch fixes it here; trusting it on the router would too.','Now only R1 answers, both PCs get a lease with the right gateway, and every lease is recorded per port. That binding table is what Dynamic ARP Inspection uses next.'],
 checks:[['DHCP snooping is on for VLAN 10',n=>{const S=n.devs.SW1.snoop;return !!S&&S.on&&S.vlans.includes(10);}],['Gi0/1 is trusted and the rogue\'s port Fa0/5 is not',n=>!!IF(n,'SW1','g0/1').snoopTrust&&!IF(n,'SW1','f0/5').snoopTrust],['Requests reach R1: option 82 is off on SW1 or trusted on R1',n=>n.devs.SW1.snoop&&n.devs.SW1.snoop.opt82===false||!!n.devs.R1.relayTrustAll||!!IF(n,'R1','g0/0').relayTrust],['PC1 and PC2 hold leases from R1 with gateway 192.168.10.1',n=>['PC1','PC2'].every(p=>{const ip=nic(n.devs[p]).ip;return ip!==null&&ip>ip2n('192.168.10.10')&&ip<ip2n('192.168.10.200')&&n.devs[p].gw===ip2n('192.168.10.1');})],['A new request can only be answered by R1',n=>{const c=dhcpCandidates(n,n.devs.PC1);return c.length>0&&c.every(x=>x.S===n.devs.R1);}],['SW1 records both leases in its binding table',n=>['PC1','PC2'].every(p=>((n.devs.SW1.snoop||{}).bind||[]).some(b=>b.client===p&&b.ip===nic(n.devs[p]).ip&&b.vlan===10))],['Both PCs reach the server beyond R1',n=>P(n,'PC1','203.0.113.10')&&P(n,'PC2','203.0.113.10')]],
 solution:{SW1:['enable','configure terminal','ip dhcp snooping','ip dhcp snooping vlan 10','no ip dhcp snooping information option','interface g0/1','ip dhcp snooping trust','end'],PC1:['ipconfig /renew'],PC2:['ipconfig /renew']}},
 ['PC1: ipconfig /renew | # the rogue answered: the gateway is 192.168.10.250 | ping 203.0.113.10',
  'SW1: enable | configure terminal | ip dhcp snooping | ip dhcp snooping vlan 10',
  'SW1: interface g0/1 | ip dhcp snooping trust | exit',
  'PC1: # no answer now, even from R1 | ipconfig /renew ; SW1: do show ip dhcp snooping | no ip dhcp snooping information option | end',
  'PC1: ipconfig /renew | ping 203.0.113.10 ; PC2: ipconfig /renew | ping 203.0.113.10 ; SW1: show ip dhcp snooping binding']);

// ----- phase 3, lab 18
{const r0=dhcpRenew;dhcpRenew=function(net,pc){const o=r0(net,pc);if(o)pc.dhcpOn=true;return o;};}
// Accepts H.H.H, or six octets with dashes or colons; returns Cisco's dotted form.
function parseMac(t){const h=String(t).toLowerCase().replace(/[.:-]/g,'');return /^[0-9a-f]{12}$/.test(h)?h.slice(0,4)+'.'+h.slice(4,8)+'.'+h.slice(8):null;}
Cn('pc','ipconfig /all',e=>{const d=e.d,i=nic(d),m=macOf(d).replace(/\./g,'').toUpperCase().match(/../g).join('-');
  e.out('','Windows IP Configuration','','   Host Name . . . . . . . . . . . . : '+d.hostname,'','Ethernet adapter FastEthernet0:','','   Physical Address. . . . . . . . . : '+m,'   DHCP Enabled. . . . . . . . . . . : '+(d.dhcpOn?'Yes':'No'),
    '   IPv4 Address. . . . . . . . . . . : '+(i.ip!==null?n2ip(i.ip):'0.0.0.0'),'   Subnet Mask . . . . . . . . . . . : '+(i.ip!==null?n2ip(lenMask(i.len)):'0.0.0.0'),'   Default Gateway . . . . . . . . . : '+(d.gw!=null?n2ip(d.gw):'0.0.0.0'),'');},null,true);
const daiOf=d=>d.dai||(d.dai={vlans:[],drops:0,fwd:0});
Cn('config','ip arp inspection vlan <rest>',e=>{const l=parseVlanList(e.args[0].replace(/\s+/g,''));if(!l)return e.out(BAD);const A=daiOf(e.d);A.vlans=[...new Set(A.vlans.concat(l))].sort((a,b)=>a-b);},['switch']);
Cn('config','no ip arp inspection vlan <rest>',e=>{const l=parseVlanList(e.args[0].replace(/\s+/g,''))||[];const A=daiOf(e.d);A.vlans=A.vlans.filter(v=>!l.includes(v));},['switch']);
Cn('if','ip arp inspection trust',e=>e.s.ctx.forEach(i=>{i.daiTrust=true;}),['switch']);
Cn('if','no ip arp inspection trust',e=>e.s.ctx.forEach(i=>{i.daiTrust=false;}),['switch']);
// ip source binding MAC vlan N IP interface IF: a static entry in the binding table, for hosts with fixed addresses.
Cn('config','ip source binding <w> vlan <n> <ip> interface <rest>',e=>{const mac=parseMac(e.args[0]),n=parseIf(e.args[3]);if(!mac||!n||!e.d.ifs[n])return e.out(BAD);
  const S=snoopOf(e.d);S.bind=(S.bind||[]).filter(b=>!(b.static&&b.mac===mac));S.bind.push({mac,ip:e.args[2],vlan:e.args[1],ifn:n,static:true,client:null});},['switch']);
Cn('config','no ip source binding <w> vlan <n> <ip> interface <rest>',e=>{const mac=parseMac(e.args[0]),S=snoopOf(e.d);S.bind=(S.bind||[]).filter(b=>!(b.static&&b.mac===mac));},['switch']);
Cn(EX,'show ip arp inspection',e=>{const{d,out}=e,A=d.dai||{vlans:[]};out('','Source Mac Validation      : Disabled','Destination Mac Validation : Disabled','IP Address Validation      : Disabled','',' Vlan     Configuration    Operation   ACL Match          Static ACL',' ----     -------------    ---------   ---------          ----------',
  ...A.vlans.map(v=>pad('  '+v,10)+pad('Enabled',17)+pad(d.vlans[v]?'Active':'Inactive',12)),'',' Vlan     Forwarded        Dropped     DHCP Drops     ACL Drops',' ----     ---------        -------     ----------     ---------',...A.vlans.map(v=>pad('  '+v,10)+pad(A.fwd||0,17)+pad(A.drops||0,12)+pad(A.drops||0,15)+'0'));},['switch']);
Cn(EX,'show ip arp inspection interfaces',e=>{const{d,out}=e;out('',' Interface        Trust State     Rate (pps)    Burst Interval',' ---------------  -----------     ----------    --------------',
  ...sortIfs(Object.keys(d.ifs)).filter(n=>!/^(Vlan|Port|Loop)/.test(n)).map(n=>' '+pad(shortIf(n),17)+pad(d.ifs[n].daiTrust?'Trusted':'Untrusted',16)+pad(d.ifs[n].daiTrust?'None':'15',14)+(d.ifs[n].daiTrust?'N/A':'1')));},['switch'],true);
CCNA_LAB_MAP['Dynamic ARP Inspection']=['5.7'];
Object.assign(WHYC,{
'ip arp inspection vlan <rest>':'Turns on Dynamic ARP Inspection for these VLANs: every ARP arriving on an untrusted port is checked against the DHCP snooping binding table, and dropped if the IP and MAC do not match a binding on that port.',
'ip arp inspection trust':'Skips ARP checks on this port. Trust uplinks to other switches and to the router; their ARPs come from addresses that were never leased on this switch.',
'ip source binding <w> vlan <n> <ip> interface <rest>':'Adds a static entry to the binding table for a device with a fixed address, such as a printer, so DAI lets its ARPs through.',
'show ip arp inspection':'Shows which VLANs DAI protects and how many ARP packets were forwarded and dropped.',
'show ip arp inspection interfaces':'Shows which ports are trusted and the ARP rate limit on the untrusted ones.',
'ipconfig /all':'Shows everything about the host\'s network adapter, including its physical (MAC) address and whether it uses DHCP.'});
addLab({title:'Dynamic ARP Inspection',group:'Security',
 brief:'DHCP snooping is already protecting VLAN 10. Next, stop hosts lying in ARP: a laptop has been given a static address outside DHCP, which is how ARP spoofing attacks start. Turn on Dynamic ARP Inspection without breaking the gateway, and keep the printer, which has a fixed address, working.',
 pos:{PC1:[80,45],PC2:[80,120],PRINTER:[80,195],ATTACKER:[430,195],SW1:[260,120],R1:[480,60]},start:'SW1',
 build(){const n=mkNet([mkRouter('R1'),mkSwitch('SW1'),mkPC('PC1',null,24),mkPC('PC2',null,24),mkPC('PRINTER','192.168.10.5',24,'192.168.10.1'),mkPC('ATTACKER','192.168.10.99',24,'192.168.10.1')]);
  link(n,'PC1','f0','SW1','f0/1');link(n,'PC2','f0','SW1','f0/2');link(n,'PRINTER','f0','SW1','f0/3');link(n,'ATTACKER','f0','SW1','f0/6');link(n,'SW1','g0/1','R1','g0/0');
  cfg(n,{SW1:['enable','configure terminal','vlan 10','name STAFF','interface range f0/1 - 8','switchport mode access','switchport access vlan 10','interface g0/1','switchport mode access','switchport access vlan 10','ip dhcp snooping trust','exit','ip dhcp snooping','ip dhcp snooping vlan 10','no ip dhcp snooping information option','end'],
   R1:['enable','configure terminal','interface g0/0','ip address 192.168.10.1 255.255.255.0','no shutdown','exit','ip dhcp excluded-address 192.168.10.1 192.168.10.10','ip dhcp pool STAFF','network 192.168.10.0 255.255.255.0','default-router 192.168.10.1','end'],
   PC1:['ipconfig /renew'],PC2:['ipconfig /renew']});return n;},
 addr:[['R1','G0/0, gateway and DHCP server','192.168.10.1/24'],['PC1 / PC2','DHCP clients','leased'],['PRINTER','Fixed address, Fa0/3','192.168.10.5'],['ATTACKER','Static address, bypassed DHCP, Fa0/6','192.168.10.99']],
 tasks:['On SW1, look at <code>show ip dhcp snooping binding</code>. Which hosts are in it? From ATTACKER, ping the gateway: it works today.','Turn on Dynamic ARP Inspection for VLAN 10. Then ping the gateway from PC1. Why does it fail?','Trust the uplink to R1 for ARP inspection, and test PC1 again.','The printer has stopped working. Find its MAC address (<code>ipconfig /all</code> on PRINTER) and add a static source binding for it on Fa0/3.','Test from PRINTER, PC2 and ATTACKER, and look at <code>show ip arp inspection</code> on SW1.'],
 why:['The binding table only holds hosts that got their address through DHCP on this switch. The printer and the attacker set their addresses by hand, so they are not in it.','DAI checks every ARP on an untrusted port. PC1\'s own ARP passes, because its binding matches. But R1\'s ARP replies arrive on Gi0/1, and R1\'s address was never leased, so they are dropped too.','Trust the ports that lead to routers and other switches. Only edge ports, where users plug in, need checking.','A device with a fixed address is legitimate but has no lease, so DAI would drop it forever. A static source binding adds it to the table by hand. The MAC address in ipconfig /all uses dashes; IOS wants it as three dotted groups.','The printer works again, the PCs never noticed, and ATTACKER\'s ARPs are dropped: it cannot reach the gateway, and it cannot pretend to be anyone else either. The drop counter shows the inspection at work.'],
 checks:[['DAI is on for VLAN 10',n=>!!n.devs.SW1.dai&&n.devs.SW1.dai.vlans.includes(10)],['The uplink to R1 is trusted for ARP inspection',n=>!!IF(n,'SW1','g0/1').daiTrust&&!IF(n,'SW1','f0/6').daiTrust],['The printer has a static binding on Fa0/3',n=>((n.devs.SW1.snoop||{}).bind||[]).some(b=>b.static&&b.mac===macOf(n.devs.PRINTER)&&b.ip===ip2n('192.168.10.5')&&b.vlan===10&&b.ifn==='FastEthernet0/3')],['PC1, PC2 and the printer reach the gateway',n=>['PC1','PC2','PRINTER'].every(p=>P(n,p,'192.168.10.1'))],['ATTACKER\'s ARP is dropped by DAI',n=>{const r=reach(n,n.devs.ATTACKER,ip2n('192.168.10.1'));return !r.ok&&/Dynamic ARP Inspection/.test(r.f.reason||'');}]],
 solution:{SW1:['enable','configure terminal','ip arp inspection vlan 10','interface g0/1','ip arp inspection trust','exit','ip source binding '+'PRINTER-MAC'+' vlan 10 192.168.10.5 interface f0/3','end']}},
 ['SW1: enable | show ip dhcp snooping binding ; ATTACKER: ping 192.168.10.1',
  'SW1: configure terminal | ip arp inspection vlan 10 ; PC1: # fails: R1\'s replies arrive on an untrusted port | ping 192.168.10.1',
  'SW1: interface g0/1 | ip arp inspection trust | exit ; PC1: ping 192.168.10.1',
  'PRINTER: # note the Physical Address | ipconfig /all ; SW1: ip source binding PRINTER-MAC vlan 10 192.168.10.5 interface f0/3 | end',
  'PRINTER: ping 192.168.10.1 ; PC2: ping 192.168.10.1 ; ATTACKER: # dropped by DAI | ping 192.168.10.1 ; SW1: show ip arp inspection']);
// The printer's MAC is derived from its name, so put the real value into the solution and guide.
{const L=LABS[LABS.length-1],m=macOf(L.build().devs.PRINTER);L.solution.SW1=L.solution.SW1.map(c=>c.replace('PRINTER-MAC',m));
 STEPS[L.title]=STEPS[L.title].map(t=>t.replace('PRINTER-MAC',m));L.steps=stepsOf(STEPS[L.title]);}

// ---------- IPv6 ----------
// Addresses are 128-bit BigInts. IOS prints them in upper case, Windows in lower case, both in RFC 5952 short form.
function parse6(t){t=String(t);if(!/^[0-9a-fA-F:]+$/.test(t))return null;const parts=t.split('::');if(parts.length>2)return null;
  const side=p=>p===''?[]:p.split(':'),a=side(parts[0]),b=parts.length===2?side(parts[1]):[];
  if(a.concat(b).some(x=>!/^[0-9a-fA-F]{1,4}$/.test(x)))return null;const n=a.length+b.length;if(parts.length===2?n>7:n!==8)return null;
  let v=0n;for(const x of a.concat(Array(8-n).fill('0'),b))v=(v<<16n)|BigInt(parseInt(x,16));return v;}
function fmt6(x,lower){const g=[];for(let k=7;k>=0;k--)g.push(Number((x>>BigInt(k*16))&0xFFFFn));let bs=-1,bl=0;
  for(let k=0;k<8;){if(g[k]===0){let j=k;while(j<8&&g[j]===0)j++;if(j-k>bl&&j-k>=2){bs=k;bl=j-k;}k=j;}else k++;}
  const h=v=>v.toString(16),s=bs<0?g.map(h).join(':'):g.slice(0,bs).map(h).join(':')+'::'+g.slice(bs+bl).map(h).join(':');return lower?s:s.toUpperCase();}
const ALL6=(1n<<128n)-1n,mask6=l=>l===0?0n:(ALL6>>BigInt(128-l))<<BigInt(128-l),net6=(a,l)=>a&mask6(l);
const LLNET=0xFE80n<<112n,isLL=a=>(a>>118n)===(0xFE80n>>6n);
// Modified EUI-64: split the MAC, insert FFFE in the middle and flip the universal/local bit.
function eui64(prefix,mac){const h=mac.replace(/\./g,''),b=h.match(/../g).map(x=>parseInt(x,16));b[0]^=2;
  return net6(prefix,64)|BigInt('0x'+[b[0],b[1],b[2],0xff,0xfe,b[3],b[4],b[5]].map(x=>x.toString(16).padStart(2,'0')).join(''));}
// Each physical router or switch port has its own MAC (subinterfaces share their parent's); a host has one.
function macIf(d,i){if(d.type==='pc')return macOf(d);const p=phys(d,i),names=sortIfs(Object.keys(d.ifs).filter(n=>!n.includes('.'))),k=Math.max(0,names.indexOf(p.name));
  const h=macOf(d).replace(/\./g,''),last=((parseInt(h.slice(10),16)+k+1)&255).toString(16).padStart(2,'0'),m=h.slice(0,10)+last;return m.slice(0,4)+'.'+m.slice(4,8)+'.'+m.slice(8);}
const linkLocal=(d,i)=>i.ll??eui64(LLNET,macIf(d,i));
const has6=(d,i,a)=>!!i.v6on&&((i.v6||[]).some(x=>x.a===a)||linkLocal(d,i)===a);
const owns6=(net,d,a)=>Object.values(d.ifs).some(i=>ifUp(net,d,i)&&has6(d,i,a));
const v6router=d=>(d.type==='router'||(d.type==='switch'&&!!d.l3))&&!!d.v6routing;
function conn6(net,d){const r=[];for(const i of Object.values(d.ifs)){if(!i.v6on||!ifUp(net,d,i))continue;for(const x of i.v6||[])r.push({code:'C',net:net6(x.a,x.len),len:x.len,ifc:i,nh:null,ad:0,addr:x.a});}return r;}
// One route per prefix, lowest administrative distance. A static is usable when its exit interface is up, or its
// global next hop sits on a connected prefix. A host routes to its default gateway (usually a link-local address).
function routes6(net,d){const conn=conn6(net,d);
  if(d.type==='pc'){const i=nic(d);if(d.gw6!=null&&i.v6on)conn.push({code:'S',net:0n,len:0,nh:d.gw6,ifc:i,ad:1});return conn;}
  const st=[];for(const s of d.statics6||[]){if(s.ifn){const i=d.ifs[s.ifn];if(!i||!i.v6on||!ifUp(net,d,i))continue;st.push({code:'S',net:s.net,len:s.len,nh:s.nh,ifc:i,ad:s.ad||1});}
    else if(conn.some(c=>net6(s.nh,c.len)===c.net))st.push({code:'S',net:s.net,len:s.len,nh:s.nh,ad:s.ad||1});}
  const best=new Map();for(const x of conn.concat(st)){const k=x.net+'/'+x.len,b=best.get(k);if(!b||x.ad<b.ad)best.set(k,x);}return [...best.values()];}
function nextHop6(net,d,dst){const rt=routes6(net,d);let best=null;for(const r of rt)if(net6(dst,r.len)===r.net&&(!best||r.len>best.len))best=r;if(!best)return null;
  let ifc=best.ifc;const nh=best.nh??dst;if(!ifc){const c=rt.find(c=>c.code==='C'&&net6(nh,c.len)===c.net);if(!c)return null;ifc=c.ifc;}return {ifc,nh,route:best};}
function fwd6(net,src,dst){let d=src,srcA=null;const hops=[];hops.path=[src.name];
  for(let t=0;t<20;t++){if(owns6(net,d,dst))return {ok:true,hops,dest:d,src:srcA};
    if(t>0&&!v6router(d))return {ok:false,hops,reason:'IPv6 unicast routing is off on '+d.hostname};
    const h=nextHop6(net,d,dst);if(!h)return {ok:false,hops,reason:'No IPv6 route to '+fmt6(dst)+' on '+d.hostname};
    if(t===0){const g=(h.ifc.v6||[])[0]||Object.values(d.ifs).flatMap(i=>i.v6on?i.v6||[]:[])[0];srcA=g?g.a:linkLocal(d,h.ifc);}
    const ps=l2peers(net,d,h.ifc);if(ps.storm){if(LIVE)stormLog(net,d,h.ifc,ps.storm);hops.storm=ps.storm;return {ok:false,hops,reason:'Broadcast storm in VLAN '+ps.storm.vlan+': '+ps.storm.sws.join(', ')+' form a loop with no spanning tree'};}
    const peer=ps.find(p=>has6(p.dev,p.ifc,h.nh));if(!peer)return {ok:false,hops,reason:'Next hop '+fmt6(h.nh)+' unreachable on '+shortIf(h.ifc.name)+'; check links and addressing'};
    if(LIVE&&L2LIVE){const k=fmt6(h.nh),mine=(h.ifc.v6||[])[0];(hops.l2=hops.l2||[]).push(l2frame(net,d,h.ifc,peer,null,hops.path.length-1,ps.edges,{cold:!(nd6Prune(net,d)[k])&&k!==L2WARM6,nhText:k}));hops.l2[hops.l2.length-1].srcAddr=fmt6(mine?mine.a:linkLocal(d,h.ifc));L2WARM6=null;}
    hops.push(h.nh);hops.path.push(...peer.path.slice(1));d=peer.dev;}
  return {ok:false,hops,reason:'Hop limit reached; check for a routing loop'};}
function reach6(net,src,dst){const f=fwd6(net,src,dst);let r=null,ok=false;if(f.ok){if(f.dest===src)ok=true;else{L2WARM6=f.hops.l2?f.hops.l2[f.hops.l2.length-1].srcAddr:null;r=fwd6(net,f.dest,f.src);L2WARM6=null;ok=r.ok&&r.dest===src;}}
  if(LIVE)TRACE={src,f,r,ok,refused:false};return {ok,f,r};}
// "X/len" with an optional keyword: eui-64 builds the interface ID from the MAC; link-local sets the FE80:: address.
function v6arg(t){const m=/^([0-9a-fA-F:]+)\/(\d{1,3})$/.exec(t);if(!m)return null;const a=parse6(m[1]),l=+m[2];return a===null||l>128?null:{a,len:l};}
Cn('if','ipv6 address <rest>',e=>{const t=e.args[0].trim().split(/\s+/),kw=(t[1]||'').toLowerCase();
  for(const i of e.s.ctx){if(!l3ok(e,i))return e.out(BAD);
    if(kw&&'link-local'.startsWith(kw)&&kw.length>1){const a=parse6(t[0]);if(a===null||!isLL(a))return e.out('% Invalid link-local address');i.ll=a;i.v6on=true;continue;}
    const p=v6arg(t[0]);if(!p||t.length>2||(kw&&!'eui-64'.startsWith(kw)))return e.out(BAD);
    if(kw){if(p.len!==64)return e.out('% Invalid prefix length for EUI-64: must be 64');p.eui=net6(p.a,64);p.a=eui64(p.eui,macIf(e.d,i));}
    i.v6=(i.v6||[]).filter(x=>x.a!==p.a);i.v6.push(p);i.v6on=true;}},['router','switch']);
Cn('if','no ipv6 address <rest?>',e=>e.s.ctx.forEach(i=>{const t=(e.args[0]||'').trim();if(!t){i.v6=[];delete i.ll;if(!i.v6en)i.v6on=false;return;}
  const p=v6arg(t.split(/\s+/)[0]);if(/link-local/i.test(t))delete i.ll;else if(p)i.v6=(i.v6||[]).filter(x=>x.a!==p.a&&!(x.eui!=null&&x.eui===net6(p.a,64)));if(!(i.v6||[]).length&&i.ll==null&&!i.v6en)i.v6on=false;}),['router','switch']);
Cn('if','ipv6 enable',e=>e.s.ctx.forEach(i=>{i.v6on=true;i.v6en=true;}),['router','switch']);
Cn('if','no ipv6 enable',e=>e.s.ctx.forEach(i=>{i.v6en=false;if(!(i.v6||[]).length&&i.ll==null)i.v6on=false;}),['router','switch']);
Cn('config','ipv6 unicast-routing',e=>{if(e.d.type==='switch'&&!e.d.l3)return e.out(BAD);e.d.v6routing=true;},['router','switch']);
Cn('config','no ipv6 unicast-routing',e=>{e.d.v6routing=false;},['router','switch']);
// ipv6 route PREFIX/LEN {NEXT-HOP | INTERFACE [NEXT-HOP]} [DISTANCE]
function parseStatic6(e,rest){const t=rest.trim()?rest.trim().split(/\s+/):[],r={nh:null,ifn:null,ad:1};
  if(t.length&&parse6(t[0])===null&&!/^\d+$/.test(t[0])){const n=parseIf(t[0]);if(!n||!e.d.ifs[n])return null;r.ifn=n;t.shift();}
  if(t.length&&parse6(t[0])!==null)r.nh=parse6(t.shift());if(t.length&&/^\d+$/.test(t[0])){r.ad=+t.shift();if(r.ad<1||r.ad>254)return null;}return t.length?null:r;}
Cn('config','ipv6 route <w> <rest>',e=>{if(e.d.type==='switch'&&!e.d.l3)return e.out(BAD);const p=v6arg(e.args[0]),r=parseStatic6(e,e.args[1]);if(!p||!r||(r.nh==null&&!r.ifn))return e.out(BAD);
  if(r.nh!=null&&isLL(r.nh)&&!r.ifn)return e.out('% Interface has to be specified for a link-local nexthop');
  const L=e.d.statics6||(e.d.statics6=[]),net=net6(p.a,p.len),old=L.find(s=>s.net===net&&s.len===p.len&&s.nh===r.nh&&(s.ifn||null)===r.ifn);if(old)old.ad=r.ad;else L.push({net,len:p.len,nh:r.nh,ifn:r.ifn,ad:r.ad});},['router','switch']);
Cn('config','no ipv6 route <w> <rest?>',e=>{const p=v6arg(e.args[0]);if(!p)return e.out(BAD);const r=parseStatic6(e,e.args[1]||'')||{nh:null,ifn:null},net=net6(p.a,p.len);
  e.d.statics6=(e.d.statics6||[]).filter(s=>!(s.net===net&&s.len===p.len&&(r.nh==null||s.nh===r.nh)&&(!r.ifn||s.ifn===r.ifn)));},['router','switch']);
// Hosts: ipv6config (Packet Tracer style) shows, autoconfigures (SLAAC from a router advertisement) or sets an address.
function slaac(net,pc){const i=nic(pc);for(const p of l2peers(net,pc,i)){if(!v6router(p.dev)||!p.ifc.v6on)continue;const g=(p.ifc.v6||[]).find(x=>x.len===64);if(!g)continue;
  return {a:eui64(net6(g.a,64),macOf(pc)),len:64,gw:linkLocal(p.dev,p.ifc),from:p.dev};}return null;}
const v6lines=(d,i)=>{const ll=linkLocal(d,i);return ['   Link-local IPv6 Address . . . . . : '+fmt6(ll,true)+'%11',...(i.v6||[]).map(x=>'   IPv6 Address. . . . . . . . . . . : '+fmt6(x.a,true)+(x.auto?' (autoconfigured)':''))];};
Cn('pc','ipv6config',e=>{const d=e.d,i=nic(d);if(!i.v6on)return e.out('','FastEthernet0 Connection:','   IPv6 is not configured. Use ipv6config /autoconfig or ipv6config ADDRESS/LENGTH GATEWAY.','');
  e.out('','FastEthernet0 Connection:',...v6lines(d,i),'   Default Gateway . . . . . . . . . : '+(d.gw6!=null?fmt6(d.gw6,true)+(isLL(d.gw6)?'%11':''):'::'),'');});
Cn('pc','ipv6config /autoconfig',e=>{const d=e.d,i=nic(d);i.v6on=true;const s=slaac(e.net,d);if(!s)return e.out('IPv6 autoconfiguration failed: no router advertisement was received.');
  i.v6=[{a:s.a,len:64,auto:true}];d.gw6=s.gw;e.out('Router advertisement received from '+s.from.hostname+'.',...v6lines(d,i),'   Default Gateway . . . . . . . . . : '+fmt6(s.gw,true)+'%11');});
Cn('pc','ipv6config <w> <w>',e=>{const p=v6arg(e.args[0]),g=parse6(e.args[1]);if(!p||g===null)return e.out('Invalid IPv6 address or gateway.');const i=nic(e.d);i.v6on=true;i.v6=[{a:p.a,len:p.len}];e.d.gw6=g;});
{const ipc=CMDS.find(c=>c.modes.includes('pc')&&c.pat.join(' ')==='ipconfig'),f=ipc.fn;
 ipc.fn=e=>{const o=e.out;let lines=[];e.out=(...x)=>lines.push(...x);f(e);e.out=o;const i=nic(e.d);
  if(i.v6on){const k=lines.findIndex(l=>/IPv4 Address/.test(l));lines.splice(k,0,...v6lines(e.d,i));const g=lines.findIndex(l=>/Default Gateway/.test(l));if(e.d.gw6!=null)lines.splice(g+1,0,'                                       '+fmt6(e.d.gw6,true)+(isLL(e.d.gw6)?'%11':''));}
  e.out(...lines);};}
const pingOut6=(e,ok,a)=>e.out('Type escape sequence to abort.','Sending 5, 100-byte ICMP Echos to '+fmt6(a)+', timeout is 2 seconds:',ok?'!!!!!':'.....',ok?'Success rate is 100 percent (5/5), round-trip min/avg/max = 0/1/2 ms':'Success rate is 0 percent (0/5)');
Cn(EX,'ping <ip6>',e=>pingOut6(e,reach6(e.net,e.d,e.args[0]).ok,e.args[0]),['router','switch']);
Cn(EX,'ping ipv6 <ip6>',e=>pingOut6(e,reach6(e.net,e.d,e.args[0]).ok,e.args[0]),['router','switch']);
Cn('pc','ping <ip6>',e=>{const ok=reach6(e.net,e.d,e.args[0]).ok,a=fmt6(e.args[0],true);e.out('','Pinging '+a+' with 32 bytes of data:');for(let k=0;k<4;k++)e.out(ok?'Reply from '+a+': time<1ms':'Request timed out.');
  e.out('','Ping statistics for '+a+':','    Packets: Sent = 4, Received = '+(ok?4:0)+', Lost = '+(ok?'0 (0% loss)':'4 (100% loss)'),'');});
Cn(EX,'traceroute <ip6>',e=>{const f=fwd6(e.net,e.d,e.args[0]);e.out('Type escape sequence to abort.','Tracing the route to '+fmt6(e.args[0]),'');f.hops.forEach((h,k)=>e.out('  '+(k+1)+' '+fmt6(h)+' 1 msec 0 msec 1 msec'));if(!f.ok)e.out('  '+(f.hops.length+1)+'  *  *  *');},['router','switch']);
Cn('pc','tracert <ip6>',e=>{const f=fwd6(e.net,e.d,e.args[0]);e.out('','Tracing route to '+fmt6(e.args[0],true)+' over a maximum of 30 hops:','');f.hops.forEach((h,k)=>e.out('  '+(k+1)+'    <1 ms    <1 ms    <1 ms  '+fmt6(h,true)));e.out(f.ok?'':'  *  Request timed out.','Trace complete.');});
// Joined multicast groups: all-nodes, all-routers when routing, and a solicited-node group per unicast address.
function groups6(d,i){const sn=a=>parse6('ff02::1:ff00:0')|(a&0xFFFFFFn),G=[parse6('ff02::1')];if(v6router(d))G.push(parse6('ff02::2'));for(const a of [linkLocal(d,i),...(i.v6||[]).map(x=>x.a)]){const g=sn(a);if(!G.includes(g))G.push(g);}return G;}
const ifState=(net,d,i)=>(i.shutdown?'administratively down':ifUp(net,d,i)?'up':'down')+'/'+(ifUp(net,d,i)?'up':'down');
Cn(EX,'show ipv6 interface brief',e=>{const{net,d,out}=e;for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];if(d.type==='switch'&&!n.startsWith('Vlan')&&!i.routed)continue;
  out(pad(n,23)+'['+ifState(net,d,i)+']',...(i.v6on?[fmt6(linkLocal(d,i)),...(i.v6||[]).map(x=>fmt6(x.a))]:['unassigned']).map(a=>'    '+a));}},['router','switch']);
Cn(EX,'show ipv6 interface <rest?>',e=>{const{net,d,out}=e,want=e.args[0]?parseIf(e.args[0]):null;if(e.args[0]&&(!want||!d.ifs[want]))return out(BAD);
  for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];if((want&&n!==want)||(!want&&!i.v6on))continue;
    out(n+' is '+(i.shutdown?'administratively down':ifUp(net,d,i)?'up':'down')+', line protocol is '+(ifUp(net,d,i)?'up':'down'));if(!i.v6on){out('  IPv6 is not enabled on this interface');continue;}
    out('  IPv6 is enabled, link-local address is '+fmt6(linkLocal(d,i)),'  No Virtual link-local address(es):');
    if((i.v6||[]).length)out('  Global unicast address(es):',...i.v6.map(x=>'    '+fmt6(x.a)+', subnet is '+fmt6(net6(x.a,x.len))+'/'+x.len+(x.eui!=null?' [EUI]':'')));else out('  No global unicast address is configured');
    out('  Joined group address(es):',...groups6(d,i).map(g=>'    '+fmt6(g)),'  MTU is 1500 bytes','  ICMP error messages limited to one every 100 milliseconds','  ICMP redirects are enabled','  ICMP unreachables are sent','  ND DAD is enabled, number of DAD attempts: 1','  ND reachable time is 30000 milliseconds (using 30000)');
    if(v6router(d))out('  ND advertised reachable time is 0 (unspecified)','  ND advertised retransmit interval is 0 (unspecified)','  ND router advertisements are sent every 200 seconds','  ND router advertisements live for 1800 seconds','  ND advertised default router preference is Medium','  Hosts use stateless autoconfig for addresses.');}},['router','switch']);
Cn(EX,'show ipv6 route <rest?>',e=>{const{net,d,out}=e,w=(e.args[0]||'').toLowerCase();if(w&&!['static','connected','local'].some(x=>x.startsWith(w)))return out(BAD);
  const rt=routes6(net,d).sort((a,b)=>a.net<b.net?-1:a.net>b.net?1:a.len-b.len),L=[];
  // A /128 on its own interface (a loopback) is both local and connected: IOS shows it once as LC.
  for(const r of rt){const p=fmt6(r.net)+'/'+r.len;if(r.code==='C'&&r.len===128)L.push(['LC',p+' [0/0]','     via '+r.ifc.name+', receive']);else if(r.code==='C'){L.push(['C',p+' [0/0]','     via '+r.ifc.name+', directly connected']);L.push(['L',fmt6(r.addr)+'/128 [0/0]','     via '+r.ifc.name+', receive']);}
    else L.push(['S',p+' ['+r.ad+'/0]','     via '+(r.nh!=null?fmt6(r.nh)+(r.ifc?', '+r.ifc.name:''):r.ifc.name+', directly connected')]);}
  if(Object.values(d.ifs).some(i=>i.v6on))L.push(['L','FF00::/8 [0/0]','     via Null0, receive']);
  const show=L.filter(x=>!w||x[0].includes(w[0].toUpperCase()));
  out('IPv6 Routing Table - default - '+L.length+' entries','Codes: C - Connected, L - Local, S - Static, LC - Local and connected','       B - BGP, R - RIP, O - OSPF Intra, OI - OSPF Inter','');show.forEach(([c,a,b])=>out(pad(c,4)+a,b));},['router','switch']);
// Running config: IPv6 lines after each interface's IPv4 address, unicast-routing before the interfaces, routes after the IPv4 ones.
{const rc1=runningConfig;runningConfig=function(net,d){const L=rc1(net,d);if(d.type==='pc')return L;const out=[];let cur=null;
  for(const l of L){if(l.startsWith('interface '))cur=d.ifs[l.slice(10)];
    if(l.startsWith('interface ')&&d.v6routing&&!out.includes('ipv6 unicast-routing')){out.push('ipv6 unicast-routing','!');}
    if(l==='line con 0'){for(const s of d.statics6||[])out.push('ipv6 route '+fmt6(s.net)+'/'+s.len+(s.ifn?' '+s.ifn:'')+(s.nh!=null?' '+fmt6(s.nh):'')+(s.ad!==1?' '+s.ad:''));if((d.statics6||[]).length)out.push('!');}
    out.push(l);
    if(cur&&(l.startsWith(' ip address ')||l===' no ip address')){if(cur.ll!=null)out.push(' ipv6 address '+fmt6(cur.ll)+' link-local');
      for(const x of cur.v6||[])out.push(' ipv6 address '+(x.eui!=null?fmt6(x.eui)+'/64 eui-64':fmt6(x.a)+'/'+x.len));if(cur.v6en)out.push(' ipv6 enable');cur=null;}}
  return out;};}
Object.assign(WHYC,{
'ipv6 unicast-routing':'Makes the router forward IPv6 between its interfaces and send router advertisements. Without it a router has IPv6 addresses but behaves like a host.',
'ipv6 address <rest>':'Gives the interface an IPv6 address with its prefix length. eui-64 builds the last 64 bits from the interface MAC; link-local sets the FE80:: address used to talk to neighbors on this link only.',
'ipv6 enable':'Turns IPv6 on with just an automatic link-local address, no global address.',
'ipv6 route <w> <rest>':'An IPv6 static route: to reach this prefix, send to this next hop (or out this interface). ::/0 is the default route. A link-local next hop must name the exit interface, because the same FE80:: address can exist on every link.',
'show ipv6 interface brief':'Each interface\'s state with its link-local and global IPv6 addresses.',
'show ipv6 interface <rest?>':'Full IPv6 detail for an interface: link-local and global addresses with their prefixes, [EUI] for EUI-64 addresses, and the multicast groups it has joined.',
'show ipv6 route <rest?>':'The IPv6 routing table: C connected prefixes, L the router\'s own addresses (/128), S static routes with [distance/metric].',
'ping <ip6>':'Sends ICMPv6 echo requests. A reply proves both directions work.',
'traceroute <ip6>':'Lists each IPv6 router on the path.',
'ipv6config':'Shows the host\'s IPv6 link-local address, global addresses and default gateway.',
'ipv6config /autoconfig':'SLAAC: the host listens for a router advertisement, takes its /64 prefix, builds the interface ID from its own MAC (EUI-64) and uses the router\'s link-local address as its gateway.',
'ipv6config <w> <w>':'Sets a static IPv6 address with prefix length, and the default gateway.'});

// ----- phase 3, lab 19
const P6=(n,from,a)=>reach6(n,n.devs[from],parse6(a)).ok;
const v6has=(n,dev,ifn,a,len)=>{const i=IF(n,dev,ifn);return !!i.v6on&&(i.v6||[]).some(x=>x.a===parse6(a)&&x.len===len);};
CCNA_LAB_MAP['IPv6 addressing']=['1.8','1.9'];
addLab({title:'IPv6 addressing',group:'IPv6',
 brief:'The office is adding IPv6 alongside IPv4. R1 joins two LANs: hosts on LAN 1 should configure themselves from R1\'s router advertisements, and the server on LAN 2 gets a fixed address. Give R1 its IPv6 addresses, including one built from the interface MAC, and get the hosts talking.',
 pos:{PC1:[60,60],PC3:[60,190],SW1:[190,125],R1:[350,125],PC2:[520,125]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkSwitch('SW1'),mkPC('PC1',null,24),mkPC('PC3',null,24),mkPC('PC2',null,24)]);
  link(n,'PC1','f0','SW1','f0/1');link(n,'PC3','f0','SW1','f0/2');link(n,'SW1','g0/1','R1','g0/0');link(n,'R1','g0/1','PC2','f0');
  cfg(n,{R1:['enable','configure terminal','interface g0/0','no shutdown','interface g0/1','no shutdown','end']});return n;},
 addr:[['R1 G0/0','LAN 1, fixed','2001:DB8:ACAD:1::1/64, FE80::1'],['R1 G0/1','LAN 2, EUI-64','2001:DB8:ACAD:2::/64, FE80::1'],['PC1 / PC3','LAN 1','SLAAC'],['PC2','LAN 2, fixed','2001:DB8:ACAD:2::10/64']],
 tasks:['On R1, enable IPv6 routing.','On G0/0, configure 2001:DB8:ACAD:1::1/64 and the link-local address FE80::1.','On G0/1, configure an EUI-64 address in 2001:DB8:ACAD:2::/64 and the link-local address FE80::1.','Check <code>show ipv6 interface brief</code>, then <code>show ipv6 interface g0/1</code>. Find the [EUI] address, and the multicast groups the interface has joined.','On PC1 and PC3, run <code>ipv6config /autoconfig</code>. Look at the addresses and the gateway they chose.','Give PC2 the fixed address 2001:DB8:ACAD:2::10/64 with gateway FE80::1.','Ping PC2 from PC1, and PC1 from PC3, over IPv6.'],
 why:['A router only forwards IPv6, and only sends the router advertisements hosts need to configure themselves, once IPv6 unicast routing is on.','A global unicast address (2000::/3) is routable everywhere; the /64 is the network prefix. The link-local address (FE80::/10) is only valid on this one link, and setting it to FE80::1 makes it easy to type as a gateway.','EUI-64 builds the 64-bit interface ID from the MAC address: split it in half, insert FFFE, and flip the seventh bit of the first byte. The same FE80::1 can be used on every interface because link-local addresses only need to be unique on their own link.','Every IPv6 interface joins FF02::1 (all nodes); a router also joins FF02::2 (all routers). Each unicast address adds a solicited-node group, FF02::1:FF plus its last 24 bits, which replaces ARP broadcasts. IPv6 has no broadcast at all.','SLAAC: the host takes the /64 prefix from R1\'s router advertisement, builds its own interface ID with EUI-64, and uses R1\'s link-local address as its default gateway. No DHCP server is involved.','Servers usually get fixed addresses so clients and DNS always find them. The gateway can be the router\'s link-local address, which never changes even if the global prefix does.','Both directions have to work: PC1 reaches LAN 2 through R1, and PC2\'s reply uses its own gateway on the way back.'],
 checks:[['IPv6 unicast routing is on for R1',n=>!!n.devs.R1.v6routing],['G0/0 has 2001:DB8:ACAD:1::1/64 and link-local FE80::1',n=>v6has(n,'R1','g0/0','2001:db8:acad:1::1',64)&&IF(n,'R1','g0/0').ll===parse6('fe80::1')],['G0/1 has an EUI-64 address in 2001:DB8:ACAD:2::/64 built from its MAC, and link-local FE80::1',n=>{const i=IF(n,'R1','g0/1');return (i.v6||[]).some(x=>x.a===eui64(parse6('2001:db8:acad:2::'),macIf(n.devs.R1,i))&&x.len===64)&&i.ll===parse6('fe80::1');}],['PC1 and PC3 autoconfigured addresses in 2001:DB8:ACAD:1::/64 with gateway FE80::1',n=>['PC1','PC3'].every(p=>{const d=n.devs[p];return (nic(d).v6||[]).some(x=>x.a===eui64(parse6('2001:db8:acad:1::'),macOf(d)))&&d.gw6===parse6('fe80::1');})],['PC2 has 2001:DB8:ACAD:2::10/64 with gateway FE80::1',n=>(nic(n.devs.PC2).v6||[]).some(x=>x.a===parse6('2001:db8:acad:2::10')&&x.len===64)&&n.devs.PC2.gw6===parse6('fe80::1')],['PC1 reaches PC2, and PC3 reaches PC1, over IPv6',n=>P6(n,'PC1','2001:db8:acad:2::10')&&(nic(n.devs.PC1).v6||[]).length>0&&reach6(n,n.devs.PC3,nic(n.devs.PC1).v6[0].a).ok]],
 solution:{R1:['enable','configure terminal','ipv6 unicast-routing','interface g0/0','ipv6 address 2001:db8:acad:1::1/64','ipv6 address fe80::1 link-local','interface g0/1','ipv6 address 2001:db8:acad:2::/64 eui-64','ipv6 address fe80::1 link-local','end'],
  PC1:['ipv6config /autoconfig'],PC3:['ipv6config /autoconfig'],PC2:['ipv6config 2001:db8:acad:2::10/64 fe80::1']}},
 ['R1: enable | configure terminal | ipv6 unicast-routing',
  'R1: interface g0/0 | ipv6 address 2001:db8:acad:1::1/64 | ipv6 address fe80::1 link-local',
  'R1: interface g0/1 | ipv6 address 2001:db8:acad:2::/64 eui-64 | ipv6 address fe80::1 link-local | end',
  'R1: show ipv6 interface brief | show ipv6 interface g0/1',
  'PC1: ipv6config /autoconfig ; PC3: ipv6config /autoconfig',
  'PC2: ipv6config 2001:db8:acad:2::10/64 fe80::1 | ipv6config',
  'PC1: ping 2001:db8:acad:2::10 | # note the address PC1 got from SLAAC | ipv6config ; PC3']);
// The last guide step pings PC1's SLAAC address, which depends on PC1's MAC; fill it in.
{const L=LABS[LABS.length-1],a=fmt6(eui64(parse6('2001:db8:acad:1::'),macOf(L.build().devs.PC1)),true);L.solution.PC3=['ipv6config /autoconfig','ping '+a];
 STEPS[L.title][6]+=': ping '+a;L.steps=stepsOf(STEPS[L.title]);}

// ----- phase 3, lab 20
CCNA_LAB_MAP['IPv6 static and default routes']=['3.3'];
addLab({title:'IPv6 static and default routes',group:'IPv6',
 brief:'HQ and the branch are joined by a primary link with global addresses and a backup link that only has link-local addresses. IPv6 addressing is done; nothing routes between the sites yet. Add a network route, a default route, a host route, and floating routes over the backup link.',
 pos:{PC1:[50,125],HQ:[200,125],BR:[400,125],PC2:[550,125]},start:'BR',
 build(){const n=mkNet([mkRouter('HQ'),mkRouter('BR'),mkPC('PC1',null,24),mkPC('PC2',null,24)]);link(n,'PC1','f0','HQ','g0/0');link(n,'HQ','g0/1','BR','g0/1');link(n,'HQ','g0/2','BR','g0/2');link(n,'BR','g0/0','PC2','f0');
  cfg(n,{HQ:['enable','configure terminal','ipv6 unicast-routing','interface g0/0','ipv6 address 2001:db8:acad:10::1/64','ipv6 address fe80::1 link-local','no shutdown','interface g0/1','description PRIMARY','ipv6 address 2001:db8:acad:12::1/64','no shutdown','interface g0/2','description BACKUP','ipv6 address fe80::1 link-local','no shutdown','interface loopback 0','ipv6 address 2001:db8:ffff::1/128','end'],
   BR:['enable','configure terminal','ipv6 unicast-routing','interface g0/0','ipv6 address 2001:db8:acad:20::1/64','ipv6 address fe80::2 link-local','no shutdown','interface g0/1','description PRIMARY','ipv6 address 2001:db8:acad:12::2/64','no shutdown','interface g0/2','description BACKUP','ipv6 address fe80::2 link-local','no shutdown','interface loopback 0','ipv6 address 2001:db8:acad:99::1/128','end'],
   PC1:['ipv6config 2001:db8:acad:10::10/64 fe80::1'],PC2:['ipv6config 2001:db8:acad:20::20/64 fe80::2']});return n;},
 addr:[['HQ / BR','G0/1, primary','2001:DB8:ACAD:12::1, ::2 /64'],['HQ / BR','G0/2, backup, link-local only','FE80::1, FE80::2'],['HQ','Loopback 0, the internet','2001:DB8:FFFF::1/128'],['BR','Loopback 0, management','2001:DB8:ACAD:99::1/128'],['PC1 / PC2','HQ LAN / branch LAN','2001:DB8:ACAD:10::10, 2001:DB8:ACAD:20::20']],
 tasks:['From PC2, ping PC1: it fails. Look at <code>show ipv6 route</code> on BR.','On HQ, add a route to the branch LAN 2001:DB8:ACAD:20::/64 via BR\'s primary address 2001:DB8:ACAD:12::2.','On BR, add a default route via HQ\'s primary address 2001:DB8:ACAD:12::1. Ping PC1 and the internet address 2001:DB8:FFFF::1 from PC2.','On HQ, add a host route to BR\'s management loopback 2001:DB8:ACAD:99::1/128 via 2001:DB8:ACAD:12::2, and ping it.','Add floating routes over the backup link with distance 10: on BR a default via FE80::1, on HQ the branch LAN via FE80::2. Try it first without naming the interface.','Shut HQ G0/1, check both routing tables and ping PC1 from PC2. Then bring G0/1 back up.'],
 why:['A router only knows its connected prefixes. BR has no route to the HQ LAN and HQ none to the branch LAN, so neither direction works.','A network route covers one remote prefix. The next hop is BR\'s global address on the shared link, which HQ can resolve because that link\'s prefix is connected.','The branch has one way out, so a single default route, ::/0, covers HQ, the internet address and everything else. It works exactly like 0.0.0.0/0 in IPv4.','A /128 route matches exactly one address, the IPv6 equivalent of a /32 host route. Management loopbacks are a typical use: always reachable as long as any path is.','The backup link has no global addresses, only link-local ones. A link-local address is only unique on its own link, so IOS refuses a link-local next hop unless you also name the exit interface. Distance 10 keeps these routes out of the table while the primary routes (distance 1) exist.','With G0/1 down its connected prefix disappears, the primary routes become unusable, and the floating routes take over on both routers. Bringing the link back restores the primary routes automatically.'],
 checks:[['HQ routes 2001:DB8:ACAD:20::/64 via 2001:DB8:ACAD:12::2',n=>(n.devs.HQ.statics6||[]).some(s=>s.net===parse6('2001:db8:acad:20::')&&s.len===64&&s.nh===parse6('2001:db8:acad:12::2')&&s.ad===1)],['BR has a default route via 2001:DB8:ACAD:12::1',n=>(n.devs.BR.statics6||[]).some(s=>s.len===0&&s.nh===parse6('2001:db8:acad:12::1')&&s.ad===1)],['HQ has a host route to BR\'s loopback',n=>(n.devs.HQ.statics6||[]).some(s=>s.net===parse6('2001:db8:acad:99::1')&&s.len===128)],['Floating routes over G0/2 at distance 10 with link-local next hops on both routers',n=>(n.devs.BR.statics6||[]).some(s=>s.len===0&&s.ifn==='GigabitEthernet0/2'&&s.nh===parse6('fe80::1')&&s.ad===10)&&(n.devs.HQ.statics6||[]).some(s=>s.net===parse6('2001:db8:acad:20::')&&s.ifn==='GigabitEthernet0/2'&&s.nh===parse6('fe80::2')&&s.ad===10)],['PC2 reaches PC1 and the internet address, and HQ reaches BR\'s loopback',n=>P6(n,'PC2','2001:db8:acad:10::10')&&P6(n,'PC2','2001:db8:ffff::1')&&P6(n,'HQ','2001:db8:acad:99::1')],['With the primary link down, PC2 still reaches PC1 over the backup',n=>whileDown(n,'HQ','g0/1',()=>{const r=reach6(n,n.devs.PC2,parse6('2001:db8:acad:10::10'));return r.ok&&r.f.hops.includes(parse6('fe80::1'));})]],
 solution:{HQ:['enable','configure terminal','ipv6 route 2001:db8:acad:20::/64 2001:db8:acad:12::2','ipv6 route 2001:db8:acad:99::1/128 2001:db8:acad:12::2','ipv6 route 2001:db8:acad:20::/64 g0/2 fe80::2 10','end'],
  BR:['enable','configure terminal','ipv6 route ::/0 2001:db8:acad:12::1','ipv6 route ::/0 g0/2 fe80::1 10','end']}},
 ['PC2: # fails: nothing routes between the sites yet | ping 2001:db8:acad:10::10 ; BR: enable | show ipv6 route',
  'HQ: enable | configure terminal | ipv6 route 2001:db8:acad:20::/64 2001:db8:acad:12::2',
  'BR: configure terminal | ipv6 route ::/0 2001:db8:acad:12::1 ; PC2: ping 2001:db8:acad:10::10 | ping 2001:db8:ffff::1',
  'HQ: ipv6 route 2001:db8:acad:99::1/128 2001:db8:acad:12::2 | do ping 2001:db8:acad:99::1',
  'BR: # refused: a link-local next hop needs an interface | ipv6 route ::/0 fe80::1 10 | ipv6 route ::/0 g0/2 fe80::1 10 | end ; HQ: ipv6 route 2001:db8:acad:20::/64 g0/2 fe80::2 10 | end | show ipv6 route static',
  'HQ: configure terminal | interface g0/1 | shutdown | end | show ipv6 route static ; BR: show ipv6 route static ; PC2: ping 2001:db8:acad:10::10 ; HQ: configure terminal | interface g0/1 | no shutdown | end']);

// ----- phase 3, lab 21
// HSRP. Members of a group are routers with that group configured on an up interface in the same subnet.
// The active router is the highest priority, then highest interface address, when the group first forms. After
// that it keeps the role (no pre-emption) unless a better router has "preempt", or the active router leaves.
// State lives on the network so it persists between commands; the active router answers for the virtual IP.
const hsrpKey=(i,g)=>netOf(i.ip,i.len)+'/'+i.len+'#'+g.grp;
function hsrpElect(net){const st=net.hsrp||(net.hsrp={}),groups=new Map();
  for(const d of Object.values(net.devs)){if(!isL3(d))continue;for(const i of Object.values(d.ifs)){if(!i.hsrp||i.ip===null||!ifUp(net,d,i))continue;
    for(const g of i.hsrp){if(g.ip==null)continue;const k=hsrpKey(i,g);if(!groups.has(k))groups.set(k,[]);groups.get(k).push({d,i,g});}}}
  const better=(a,b)=>a.g.prio!==b.g.prio?a.g.prio>b.g.prio:a.i.ip>b.i.ip,id=m=>m.d.name+'|'+m.i.name;
  for(const [k,mem] of groups){const s=st[k]||(st[k]={active:null,standby:null});
    // Members must also hear each other: same Layer 2 segment.
    const best=list=>list.reduce((a,b)=>!a||better(b,a)?b:a,null);
    let act=mem.find(m=>id(m)===s.active)||null;const top=best(mem);
    if(!act)act=top;else if(top!==act&&top.g.preempt&&better(top,act))act=top;
    const sb=best(mem.filter(m=>m!==act));s.active=id(act);s.standby=sb?id(sb):null;}
  for(const k of Object.keys(st))if(!groups.has(k))delete st[k];}
function hsrpRole(net,d,i,g){if(!net.hsrp)hsrpElect(net);const s=net.hsrp[hsrpKey(i,g)];if(!s)return 'Init';const me=d.name+'|'+i.name;return s.active===me?'Active':s.standby===me?'Standby':'Listen';}
function hsrpVip(net,d,i){if(!i.hsrp||i.ip===null)return null;for(const g of i.hsrp)if(g.ip!=null&&hsrpRole(net,d,i,g)==='Active')return g.ip;return null;}
const vmac=(i,g)=>i.hsrpV2?'0000.0c9f.f'+g.grp.toString(16).padStart(3,'0'):'0000.0c07.ac'+g.grp.toString(16).padStart(2,'0');
// Re-run the election after every command and log state changes (%HSRP-5-STATECHANGE), on this console or in the other routers' logs.
{const roles=net=>{const m=new Map();for(const d of Object.values(net.devs))for(const i of Object.values(d.ifs))for(const g of i.hsrp||[])m.set(d.name+'|'+i.name+'|'+g.grp,{d,i,g,r:i.ip!==null&&ifUp(net,d,i)&&g.ip!=null&&net.hsrp&&net.hsrp[hsrpKey(i,g)]?hsrpRole(net,d,i,g):'Init'});return m;};
 // The messages IOS logs on the way between two states (Listen and Speak are passed through quickly).
 const steps=(a,b)=>b==='Active'?(a==='Standby'?['Standby -> Active']:['Speak -> Standby','Standby -> Active']):b==='Standby'?(a==='Active'?['Active -> Speak','Speak -> Standby']:['Speak -> Standby']):[a+' -> '+b];
 const any=net=>Object.values(net.devs).some(x=>Object.values(x.ifs).some(i=>i.hsrp&&i.hsrp.length));
 const ex0=execLine;execLine=function(net,d,s,line){const had=any(net);if(had&&!net.hsrp)hsrpElect(net);const before=had?roles(net):new Map(),out=ex0(net,d,s,line);if(!had&&!any(net))return out;hsrpElect(net);
  for(const [k,a] of roles(net)){const b=before.get(k),was=b?b.r:'Init';if(was===a.r)continue;for(const st of steps(was,a.r)){const msg='%HSRP-5-STATECHANGE: '+a.i.name+' Grp '+a.g.grp+' state '+st;if(a.d===d)out.push(msg);else logEvent(net,a.d,msg);}}
  return out;};}
const hsrpOf=(i,g)=>{i.hsrp=i.hsrp||[];let x=i.hsrp.find(x=>x.grp===g);if(!x){x={grp:g,ip:null,prio:100,preempt:false};i.hsrp.push(x);}return x;};
Cn('if','standby <n> ip <ip>',e=>{for(const i of e.s.ctx){if(i.ip===null||netOf(e.args[1],i.len)!==netOf(i.ip,i.len))return e.out('% Address '+n2ip(e.args[1])+' in group '+e.args[0]+' is not in the subnet of '+shortIf(i.name));hsrpOf(i,e.args[0]).ip=e.args[1];}},['router','switch']);
Cn('if','standby <n> priority <n>',e=>{if(e.args[1]>255)return e.out(BAD);e.s.ctx.forEach(i=>{hsrpOf(i,e.args[0]).prio=e.args[1];});},['router','switch']);
Cn('if','standby <n> preempt',e=>e.s.ctx.forEach(i=>{hsrpOf(i,e.args[0]).preempt=true;}),['router','switch']);
Cn('if','no standby <n> preempt',e=>e.s.ctx.forEach(i=>{hsrpOf(i,e.args[0]).preempt=false;}),['router','switch']);
Cn('if','no standby <n> <rest?>',e=>e.s.ctx.forEach(i=>{i.hsrp=(i.hsrp||[]).filter(x=>x.grp!==e.args[0]);}),['router','switch']);
Cn('if','standby version <n>',e=>{if(e.args[0]!==1&&e.args[0]!==2)return e.out(BAD);e.s.ctx.forEach(i=>{i.hsrpV2=e.args[0]===2;});},['router','switch']);
Cn(EX,'show standby brief',e=>{const{net,d,out}=e;out('                     P indicates configured to preempt.','                     |','Interface   Grp  Pri P State   Active          Standby         Virtual IP');
  for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];for(const g of i.hsrp||[]){const r=ifUp(net,d,i)?hsrpRole(net,d,i,g):'Init',s=(net.hsrp||{})[i.ip!==null?hsrpKey(i,g):'']||{},who=x=>!x?'unknown':x===d.name+'|'+n?'local':n2ip(net.devs[x.split('|')[0]].ifs[x.split('|')[1]].ip);
    out(pad(shortIf(n),12)+pad(g.grp,5)+pad(g.prio,4)+(g.preempt?'P ':'  ')+pad(r,8)+pad(r==='Init'?'unknown':who(s.active),16)+pad(r==='Init'?'unknown':who(s.standby),16)+(g.ip!=null?n2ip(g.ip):'unknown'));}}},['router','switch']);
Cn(EX,'show standby',e=>{const{net,d,out}=e;for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];for(const g of i.hsrp||[]){const r=ifUp(net,d,i)?hsrpRole(net,d,i,g):'Init',s=(net.hsrp||{})[i.ip!==null?hsrpKey(i,g):'']||{};
    const other=x=>{if(!x)return null;const[dn,ifn]=x.split('|');return {ip:net.devs[dn].ifs[ifn].ip,prio:(net.devs[dn].ifs[ifn].hsrp||[]).find(y=>y.grp===g.grp).prio,local:dn===d.name};};const A=other(s.active),S=other(s.standby);
    out(n+' - Group '+g.grp+(i.hsrpV2?' (version 2)':''),'  State is '+r,'  Virtual IP address is '+(g.ip!=null?n2ip(g.ip):'unknown'),'  Active virtual MAC address is '+(A?vmac(i,g):'unknown')+(r==='Active'?' (MAC In Use)':''),'    Local virtual MAC address is '+vmac(i,g)+' (v'+(i.hsrpV2?2:1)+' default)',
      '  Hello time 3 sec, hold time 10 sec','  Preemption '+(g.preempt?'enabled':'disabled'),'  Active router is '+(A?(A.local?'local':n2ip(A.ip)+', priority '+A.prio):'unknown'),'  Standby router is '+(S?(S.local?'local':n2ip(S.ip)+', priority '+S.prio):'unknown'),'  Priority '+g.prio+' (configured '+g.prio+')','  Group name is "hsrp-'+shortIf(n)+'-'+g.grp+'" (default)');}}},['router','switch']);
// Check what happens if a link fails and comes back, without disturbing the lab: election state is restored afterwards.
function hsrpWhile(n,dev,ifn,fn){const keep=JSON.stringify(n.hsrp||{});try{return whileDown(n,dev,ifn,()=>{hsrpElect(n);return fn();});}finally{n.hsrp=JSON.parse(keep);}}
CCNA_LAB_MAP['First-hop redundancy with HSRP']=['3.5'];
Object.assign(WHYC,{
'standby <n> ip <ip>':'Joins HSRP group n with this virtual IP. Hosts use the virtual IP as their default gateway; whichever router is active answers for it, with a virtual MAC address.',
'standby <n> priority <n>':'Sets this router\'s priority in the group, 0 to 255, default 100. Highest priority becomes active; the interface IP breaks ties.',
'standby <n> preempt':'Lets this router take the active role back when it has the higher priority, for example after it reboots or its link returns. Without it, the router that is active stays active.',
'standby version <n>':'Version 2 allows group numbers up to 4095, uses virtual MAC 0000.0C9F.FXXX instead of 0000.0C07.ACXX, and supports IPv6. Both routers must match.',
'show standby brief':'One line per group: priority, P if preempt is on, this router\'s state, the active and standby routers, and the virtual IP.',
'show standby':'Full HSRP detail per group: state, virtual IP and MAC, timers, preemption, and who is active and standby.'});
addLab({title:'First-hop redundancy with HSRP',group:'Routing',
 brief:'The LAN has two routers to the core, but every PC can only have one default gateway. Today that gateway address belongs to nobody. Use HSRP so R1 and R2 share a virtual gateway address, R1 normally carries the traffic, and R2 takes over the moment R1\'s LAN link fails.',
 pos:{PC1:[50,60],PC2:[50,190],SW1:[170,125],R1:[320,60],R2:[320,190],CORE:[470,125],NET:[580,125]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('R2'),mkRouter('CORE'),mkSwitch('SW1'),mkPC('PC1','192.168.1.11',24,'192.168.1.1'),mkPC('PC2','192.168.1.12',24,'192.168.1.1'),srv('NET','203.0.113.10',24,'203.0.113.1',[80])]);
  link(n,'PC1','f0','SW1','f0/1');link(n,'PC2','f0','SW1','f0/2');link(n,'SW1','g0/1','R1','g0/0');link(n,'SW1','g0/2','R2','g0/0');link(n,'R1','g0/1','CORE','g0/0');link(n,'R2','g0/1','CORE','g0/1');link(n,'CORE','g0/2','NET','f0');
  const o=(rid,nets)=>['router ospf 1','router-id '+rid,...nets.map(x=>'network '+x+' area 0')];
  cfg(n,{R1:['enable','configure terminal','interface g0/0','ip address 192.168.1.2 255.255.255.0','no shutdown','interface g0/1','ip address 10.0.1.1 255.255.255.252','no shutdown','exit',...o('1.1.1.1',['192.168.1.0 0.0.0.255','10.0.1.0 0.0.0.3']),'passive-interface g0/0','end'],
   R2:['enable','configure terminal','interface g0/0','ip address 192.168.1.3 255.255.255.0','no shutdown','interface g0/1','ip address 10.0.2.1 255.255.255.252','no shutdown','exit',...o('2.2.2.2',['192.168.1.0 0.0.0.255','10.0.2.0 0.0.0.3']),'passive-interface g0/0','end'],
   CORE:['enable','configure terminal','interface g0/0','ip address 10.0.1.2 255.255.255.252','no shutdown','interface g0/1','ip address 10.0.2.2 255.255.255.252','no shutdown','interface g0/2','ip address 203.0.113.1 255.255.255.0','no shutdown','exit',...o('3.3.3.3',['10.0.1.0 0.0.0.3','10.0.2.0 0.0.0.3','203.0.113.0 0.0.0.255']),'passive-interface g0/2','end']});return n;},
 addr:[['PCs','Default gateway (virtual)','192.168.1.1'],['R1 / R2','G0/0 real addresses','192.168.1.2, 192.168.1.3'],['HSRP','Group 1','R1 priority 110, R2 default 100'],['NET','Beyond the core','203.0.113.10']],
 tasks:['From PC1, ping the gateway 192.168.1.1. It fails: no device owns that address yet.','On R1 G0/0, join HSRP group 1 with virtual IP 192.168.1.1, priority 110, and preempt.','On R2 G0/0, join group 1 with the same virtual IP, keep the default priority, and enable preempt.','Check <code>show standby brief</code> on both routers, then ping the gateway and 203.0.113.10 from both PCs.','Fail R1\'s LAN link: shut down R1 G0/0. Watch R2 take over, and ping 203.0.113.10 from PC1 again.','Bring R1 G0/0 back up. Which router is active now, and why?'],
 why:['A host can only have one default gateway, and it has no idea there are two routers. If that one address dies, the host is cut off even though a second router is sitting right there.','HSRP makes the virtual IP the gateway instead of either router\'s real address. The higher priority makes R1 the active router. Preempt lets R1 take the role back after a failure.','Both routers must use the same group number and virtual IP. R2 at priority 100 becomes the standby router, ready to take over within the hold time (10 seconds by default).','The active router answers for 192.168.1.1 with the virtual MAC 0000.0C07.AC01. The PCs\' configuration never changes, which is the whole point.','When R1\'s interface goes down, R2 stops hearing R1\'s hellos and becomes active. The PCs keep using 192.168.1.1, and OSPF moves the return traffic to R2.','R1 comes back with the higher priority and preempt on, so it takes the active role back. Without preempt, R2 would have stayed active until it failed itself.'],
 checks:[['R1 and R2 share virtual IP 192.168.1.1 in group 1',n=>['R1','R2'].every(r=>(IF(n,r,'g0/0').hsrp||[]).some(g=>g.grp===1&&g.ip===ip2n('192.168.1.1')))],['R1 is active with priority 110 and R2 is standby',n=>{const g1=IF(n,'R1','g0/0').hsrp.find(g=>g.grp===1),g2=IF(n,'R2','g0/0').hsrp.find(g=>g.grp===1);return g1.prio===110&&hsrpRole(n,n.devs.R1,IF(n,'R1','g0/0'),g1)==='Active'&&hsrpRole(n,n.devs.R2,IF(n,'R2','g0/0'),g2)==='Standby';}],['R1 has preempt enabled',n=>!!(IF(n,'R1','g0/0').hsrp||[]).find(g=>g.grp===1&&g.preempt)],['Both PCs reach 203.0.113.10 through the virtual gateway',n=>P(n,'PC1','203.0.113.10')&&P(n,'PC2','203.0.113.10')],['With R1\'s LAN link down, R2 is active and PC1 still gets out',n=>hsrpWhile(n,'R1','g0/0',()=>{const g2=IF(n,'R2','g0/0').hsrp.find(g=>g.grp===1);return hsrpRole(n,n.devs.R2,IF(n,'R2','g0/0'),g2)==='Active'&&P(n,'PC1','203.0.113.10');})],['When R1\'s link returns, R1 takes the active role back',n=>{const keep=JSON.stringify(n.hsrp||{});try{whileDown(n,'R1','g0/0',()=>hsrpElect(n));hsrpElect(n);const g1=IF(n,'R1','g0/0').hsrp.find(g=>g.grp===1);return hsrpRole(n,n.devs.R1,IF(n,'R1','g0/0'),g1)==='Active';}finally{n.hsrp=JSON.parse(keep);}}]],
 solution:{R1:['enable','configure terminal','interface g0/0','standby 1 ip 192.168.1.1','standby 1 priority 110','standby 1 preempt','end'],R2:['enable','configure terminal','interface g0/0','standby 1 ip 192.168.1.1','standby 1 preempt','end']}},
 ['PC1: # fails: nobody owns the gateway address yet | ping 192.168.1.1',
  'R1: enable | configure terminal | interface g0/0 | standby 1 ip 192.168.1.1 | standby 1 priority 110 | standby 1 preempt | end',
  'R2: enable | configure terminal | interface g0/0 | standby 1 ip 192.168.1.1 | standby 1 preempt | end',
  'R1: show standby brief ; R2: show standby brief ; PC1: ping 192.168.1.1 | ping 203.0.113.10 ; PC2: ping 203.0.113.10',
  'R1: configure terminal | interface g0/0 | shutdown ; R2: show standby brief ; PC1: ping 203.0.113.10 | tracert 203.0.113.10',
  'R1: no shutdown | end | show standby']);

// ===== phase 4 =====
// ---------- err-disabled ports: BPDU Guard, EtherChannel misconfiguration, port security ----------
// Checked after every command. An err-disabled port is down at both ends until "shutdown" then "no shutdown";
// if the cause is still there, it err-disables again straight away.
function errScan(net,d0,out){
  const say=(sw,msg)=>{if(sw===d0){out.push((sw.tsLog?stamp(net,sw):'')+msg);logEvent(net,sw,msg);}else logEvent(net,sw,msg);};
  const down=(sw,i,why)=>{i.errdis=why;say(sw,'%LINK-3-UPDOWN: Interface '+i.name+', changed state to down');say(sw,'%LINEPROTO-5-UPDOWN: Line protocol on Interface '+i.name+', changed state to down');
    const pd=i.link&&net.devs[i.link.dev];if(pd&&pd.type!=='pc'){say(pd,'%LINK-3-UPDOWN: Interface '+i.link.ifn+', changed state to down');say(pd,'%LINEPROTO-5-UPDOWN: Line protocol on Interface '+i.link.ifn+', changed state to down');}};
  for(const sw of Object.values(net.devs)){if(sw.type!=='switch')continue;
    for(const i of Object.values(sw.ifs)){if(/^(Vlan|Port|Loop)/.test(i.name))continue;const P=i.ps;
      if(P&&P.macs&&(!i.link||!ifUp0(net,sw,i)))P.macs=P.macs.filter(m=>m.kind!=='dynamic');
      if(i.shutdown||i.errdis||!i.link)continue;const pd=net.devs[i.link.dev],pi=pd.ifs[i.link.ifn];if(pi.shutdown||pi.errdis)continue;
      // BPDU Guard: a BPDU from another switch on a guarded port err-disables it.
      if((i.bpduguard||(sw.stp&&sw.stp.bpduDefault&&i.portfast))&&pd.type==='switch'&&!pi.routed){
        say(sw,'%SPANTREE-2-BLOCK_BPDUGUARD: Received BPDU on port '+i.name+' with BPDU Guard enabled. Disabling port.');say(sw,'%PM-4-ERR_DISABLE: bpduguard error detected on '+shortIf(i.name)+', putting '+shortIf(i.name)+' in err-disable state');down(sw,i,'bpduguard');continue;}
      // EtherChannel guard: a bundle forced on while the far end does not bundle statically would loop, so the bundle is err-disabled.
      if(i.chan&&i.chanMode==='on'&&pd.type==='switch'&&!(pi.chan&&pi.chanMode==='on')){const ms=Object.values(sw.ifs).filter(p=>p.chan===i.chan&&!p.errdis);
        say(sw,'%SPANTREE-2-CHNL_MISCFG: Detected loop due to etherchannel misconfiguration of '+ms.map(p=>shortIf(p.name)).join(' '));
        for(const p of ms){say(sw,'%PM-4-ERR_DISABLE: channel-misconfig (STP) error detected on Po'+i.chan+', putting '+shortIf(p.name)+' in err-disable state');down(sw,p,'channel-misconfig');}continue;}
      // Port security: addresses are learned up to the maximum (sticky ones go into the config); one more is a violation.
      if(P&&P.on&&pd.type==='pc'){P.macs=P.macs||[];const seen=[macOf(pd)];if(pd.phone){const pcp=pd.ifs.FastEthernet1;if(pcp&&pcp.link)seen.push(macOf(net.devs[pcp.link.dev]));}
        for(const m of seen){if(P.macs.some(x=>x.mac===m)||(P.blocked||[]).includes(m))continue;if(P.macs.length<P.max){P.macs.push({mac:m,kind:P.sticky?'sticky':'dynamic'});continue;}
          P.viol=(P.viol||0)+1;P.last=m;
          if(P.violation==='shutdown'){say(sw,'%PM-4-ERR_DISABLE: psecure-violation error detected on '+shortIf(i.name)+', putting '+shortIf(i.name)+' in err-disable state');
            say(sw,'%PORT_SECURITY-2-PSECURE_VIOLATION: Security violation occurred, caused by MAC address '+m+' on port '+i.name+'.');down(sw,i,'psecure-violation');break;}
          (P.blocked||(P.blocked=[])).push(m);if(P.violation==='restrict')say(sw,'%PORT_SECURITY-2-PSECURE_VIOLATION: Security violation occurred, caused by MAC address '+m+' on port '+i.name+'.');}}}}}
{const ex0=execLine;execLine=function(net,d,s,line){const sh=new Map();for(const x of Object.values(net.devs))for(const i of Object.values(x.ifs))sh.set(i,!!i.shutdown);
  const out=ex0(net,d,s,line);
  for(const [i,was] of sh)if(i.shutdown&&!was&&i.errdis){delete i.errdis;if(i.ps)i.ps.blocked=[];}
  errScan(net,d,out);return out;};}
// A host whose address port security restricts or protects against gets no frames through.
{const db0=daiBlock;daiBlock=function(net,path,sender,ifc){const r=db0(net,path,sender,ifc);if(r)return r;
  for(let k=1;k<path.length-1;k++){const sw=net.devs[path[k]];if(sw.type!=='switch')continue;const p=portTo(net,sw,path[k-1]);if(p&&p.ps&&p.ps.on&&(p.ps.blocked||[]).includes(macOf(sender)))
    return {sw:sw.name,text:'Port security ('+p.ps.violation+') on '+sw.hostname+' '+shortIf(p.name)+' drops frames from '+macOf(sender)};break;}return null;};}
const psAdd=(e,kind)=>{const m=parseMac(e.args[0]);if(!m)return e.out(BAD);for(const i of e.s.ctx){const P=psOf(i);P.macs=(P.macs||[]).filter(x=>x.mac!==m);
  if(P.macs.length>=P.max)return e.out('Total secure mac-addresses on interface '+i.name+' has reached maximum limit.');P.macs.push({mac:m,kind});}};
Cn('if','switchport port-security mac-address sticky <w>',e=>psAdd(e,'sticky'),['switch']);
Cn('if','no switchport port-security mac-address sticky <w>',e=>{const m=parseMac(e.args[0]);e.s.ctx.forEach(i=>{const P=psOf(i);P.macs=(P.macs||[]).filter(x=>x.mac!==m);});},['switch']);
Cn('if','switchport port-security mac-address <w>',e=>psAdd(e,'static'),['switch']);
Cn('if','no switchport port-security mac-address <w>',e=>{const m=parseMac(e.args[0]);e.s.ctx.forEach(i=>{const P=psOf(i);P.macs=(P.macs||[]).filter(x=>x.mac!==m);});},['switch']);
Cn('if','no switchport trunk native vlan',e=>e.s.ctx.forEach(i=>{i.native=1;}),['switch']);
Cn('if','no channel-group <rest?>',e=>e.s.ctx.forEach(i=>{delete i.chan;delete i.chanMode;}),['switch']);
Cn('if','no spanning-tree bpduguard enable',e=>e.s.ctx.forEach(i=>{i.bpduguard=false;}),['switch']);
Cn('if','no spanning-tree portfast',e=>e.s.ctx.forEach(i=>{i.portfast=false;}),['switch']);
Cn('config','spanning-tree portfast bpduguard default',e=>{stpOf(e.d).bpduDefault=true;},['switch']);
Cn('if','ip ospf hello-interval <n>',e=>{if(e.args[0]<1||e.args[0]>65535)return e.out(BAD);e.s.ctx.forEach(i=>{i.ospfHello=e.args[0];});},['router','switch']);
Cn('if','no ip ospf hello-interval',e=>e.s.ctx.forEach(i=>{delete i.ospfHello;}),['router','switch']);
Cn('if','ip ospf dead-interval <n>',e=>{if(e.args[0]<1||e.args[0]>65535)return e.out(BAD);e.s.ctx.forEach(i=>{i.ospfDead=e.args[0];});},['router','switch']);
Cn('if','no ip ospf dead-interval',e=>e.s.ctx.forEach(i=>{delete i.ospfDead;}),['router','switch']);
Cn(EX,'show interfaces status <rest?>',e=>{const{net,d,out}=e,err=/^err/i.test((e.args[0]||'').trim());if(e.args[0]&&!err)return out(BAD);
  out(err?'Port      Name               Status       Reason               Err-disabled Vlans':'Port      Name               Status       Vlan       Duplex  Speed Type');
  for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n];if(/^(Vlan|Loop)/.test(n)||(err&&!i.errdis))continue;const up=ifUp(net,d,i),fe=n.startsWith('Fast');
    const st=i.errdis?'err-disabled':i.shutdown?'disabled':up?'connected':'notconnect';
    out(err?pad(shortIf(n),10)+pad((i.desc||'').slice(0,18),19)+pad(st,13)+i.errdis:pad(shortIf(n),10)+pad((i.desc||'').slice(0,18),19)+pad(st,13)+pad(i.routed?'routed':i.mode==='trunk'?'trunk':i.accessVlan,11)+(up?'a-full':'auto').padStart(6)+' '+(up?(fe?'a-100':'a-1000'):'auto').padStart(6)+' '+(n.startsWith('Port')?'':fe?'10/100BaseTX':'10/100/1000BaseTX'));}},['switch'],true);
Object.assign(WHYC,{
'show interfaces status <rest?>':'One line per switch port: description, status (connected, notconnect, disabled, err-disabled), VLAN, duplex and speed. Add err-disabled to list only those ports and why.',
'ip ospf hello-interval <n>':'How often this interface sends OSPF hellos. Neighbors must use the same hello and dead intervals or they never become adjacent.',
'ip ospf dead-interval <n>':'How long to wait without hellos before declaring a neighbor dead; four hellos by default. Must match the neighbor.',
'no spanning-tree bpduguard enable':'Removes BPDU Guard from the port. On a port that leads to another switch, it should never have been on.',
'spanning-tree portfast bpduguard default':'Turns BPDU Guard on for every PortFast port automatically.',
'switchport port-security mac-address sticky <w>':'A sticky address learned earlier and saved in the config. It stays allowed on the port until you remove it.',
'no switchport port-security mac-address sticky <w>':'Forgets a stored sticky address, for example after the device on that port has been replaced.'});

// ---------- more troubleshooting incidents (phase 4) ----------
// Built like the original six: the base lab's solution, optional background setup, then the fault. Checks are the base lab's.
const INC0=LABS.find(l=>l.kind==='incident');
function addIncident(spec){const base=LABS.find(l=>l.title===spec.base);if(!base)throw Error('No base lab '+spec.base);INCIDENTS.push(spec);
  LABS.push({title:spec.title,kind:'incident',group:'Troubleshooting',baseTitle:base.title,ccna:base.ccna.slice(),brief:spec.brief,pos:base.pos,start:spec.start,addr:base.addr,hidePorts:base.hidePorts,
    tasks:INC0.tasks.slice(),why:INC0.why.slice(),hints:spec.hints,lesson:spec.lesson,solution:spec.repair,checks:base.checks,steps:stepsOf(spec.steps),
    build(){const net=base.build();incidentCommands(net,base.solution);if(spec.setup)incidentCommands(net,spec.setup);incidentCommands(net,spec.fault);return net;}});}
const EN=['enable','configure terminal'];

// ----- incident 07
addIncident({title:'Incident 07: one branch fell off the map',base:'Single-area OSPF',start:'PC1',
 brief:'After a maintenance window, PC1 can still reach PC2 but nothing behind R3 answers. Every interface is up. The design is a single OSPF area 0. Find out why R3 is isolated and put it back in the design.',
 symptom:['PC1','192.168.3.10'],
 fault:{R3:[...EN,'router ospf 1','no network 10.0.13.0 0.0.0.3 area 0','no network 10.0.23.0 0.0.0.3 area 0','network 10.0.13.0 0.0.0.3 area 1','network 10.0.23.0 0.0.0.3 area 1','end']},
 repair:{R3:[...EN,'router ospf 1','no network 10.0.13.0 0.0.0.3 area 1','no network 10.0.23.0 0.0.0.3 area 1','network 10.0.13.0 0.0.0.3 area 0','network 10.0.23.0 0.0.0.3 area 0','end','show ip ospf neighbor'],PC1:['ping 192.168.3.10']},
 steps:['PC1: ping 192.168.3.10 | ping 192.168.2.10','R1: enable | show ip ospf neighbor ; R3: enable | show ip ospf neighbor | show ip protocols','R3: configure terminal | router ospf 1 | no network 10.0.13.0 0.0.0.3 area 1 | no network 10.0.23.0 0.0.0.3 area 1 | network 10.0.13.0 0.0.0.3 area 0 | network 10.0.23.0 0.0.0.3 area 0 | end','R3: show ip ospf neighbor ; PC1: ping 192.168.3.10 | ping 192.168.2.10'],
 hints:['PC2 works and PC3 does not, and everything behind R3 is missing at once. Look at R3\'s adjacencies before any single route.','R3 has no OSPF neighbors at all. Compare the area numbers in R3\'s network statements (show ip protocols) with R1\'s and R2\'s.','R3 put both uplinks in area 1 while R1 and R2 use area 0. Remove those statements and add the same networks back in area 0.'],
 lesson:'Two routers only become neighbors if they agree on the area of the link between them, as well as the subnet and timers. A router whose uplinks sit in the wrong area is an island even though every interface is up.'});

// ----- incident 08
addIncident({title:'Incident 08: the far switch went dark',base:'Spanning tree: root bridge and edge ports',start:'PC1',
 brief:'Someone tidied up SW3\'s configuration with an interface template. Since then PC2 cannot be reached and SW3 has disappeared from the other switches\' spanning tree. Find what took SW3\'s links down and recover them without weakening protection on the host ports.',
 symptom:['PC1','192.168.1.12'],
 fault:{SW3:[...EN,'interface range g0/1 - 2','spanning-tree portfast','spanning-tree bpduguard enable','end']},
 repair:{SW3:[...EN,'interface range g0/1 - 2','no spanning-tree bpduguard enable','no spanning-tree portfast','shutdown','no shutdown','end','show interfaces status'],PC1:['ping 192.168.1.12']},
 steps:['PC1: ping 192.168.1.12','SW3: enable | show interfaces status | show interfaces status err-disabled | show running-config','SW3: configure terminal | interface range g0/1 - 2 | no spanning-tree bpduguard enable | no spanning-tree portfast | shutdown | no shutdown | end','SW3: show interfaces status ; PC1: ping 192.168.1.12'],
 hints:['Only the host on SW3 is cut off, and both of SW3\'s uplinks are affected together. Something on SW3 itself took them down.','show interfaces status on SW3 lists Gi0/1 and Gi0/2 as err-disabled, and show interfaces status err-disabled gives the reason. show running-config shows what they now share with the host port.','PortFast and BPDU Guard were applied to the uplinks, which hear BPDUs from SW1 and SW2. Remove both from Gi0/1 and Gi0/2, then shut and re-enable the ports to recover them.'],
 lesson:'BPDU Guard belongs on host ports only: any BPDU arriving on a guarded port err-disables it. An err-disabled port stays down until someone shuts and re-enables it, and it trips again at once if the cause is still there.'});

// ----- incident 09
addIncident({title:'Incident 09: the bundle that took both links',base:'EtherChannel with LACP',start:'PC1',
 brief:'An engineer "simplified" the EtherChannel on SW2. Now both links between the switches are down and the two PCs cannot reach each other. Restore the bundle with negotiation, the way the design intends.',
 symptom:['PC1','192.168.10.12'],
 fault:{SW2:[...EN,'interface range g0/1 - 2','no channel-group 1','channel-group 1 mode on','end']},
 repair:{SW2:[...EN,'interface range g0/1 - 2','shutdown','no channel-group 1','channel-group 1 mode active','no shutdown','end','show etherchannel summary'],PC1:['ping 192.168.10.12']},
 steps:['PC1: ping 192.168.10.12','SW2: enable | show etherchannel summary | show interfaces status err-disabled ; SW1: enable | show etherchannel summary','SW2: configure terminal | interface range g0/1 - 2 | shutdown | no channel-group 1 | channel-group 1 mode active | no shutdown | end','SW2: show etherchannel summary ; SW1: show etherchannel summary ; PC1: ping 192.168.10.12'],
 hints:['Both links failed at the same moment, which rules out a cable. Read what SW2 logged and look at its interface states.','show interfaces status err-disabled on SW2 shows the members err-disabled for channel-misconfig. Compare the channel protocol in show etherchannel summary on both switches.','SW2 forces the bundle with mode on while SW1 negotiates LACP. Remove the channel group, add it back in active mode, then bounce the ports to clear the err-disable.'],
 lesson:'mode on never negotiates, so it only works against another on. Against an LACP neighbor it could loop, and EtherChannel guard err-disables the bundle instead. Both ends must use the same protocol, and IOS will not switch a member straight from LACP to on or back.'});

// ----- incident 10
addIncident({title:'Incident 10: the router can, the hosts cannot',base:'NAT overload (PAT)',start:'R1',
 brief:'Since a change on R1, nobody inside can reach the web server, yet R1 itself pings it fine. The default route and the PAT rule look untouched. Find what stops translation and restore internet access for the LAN.',
 symptom:['PC1','198.51.100.10'],
 fault:{R1:[...EN,'interface g0/0','ip nat outside','interface g0/1','ip nat inside','end']},
 repair:{R1:[...EN,'interface g0/0','ip nat inside','interface g0/1','ip nat outside','end'],PC1:['ping 198.51.100.10','telnet 198.51.100.10 80']},
 steps:['PC1: ping 198.51.100.10 ; R1: enable | ping 198.51.100.10','R1: show ip nat translations | show running-config','R1: configure terminal | interface g0/0 | ip nat inside | interface g0/1 | ip nat outside | end','PC1: ping 198.51.100.10 | telnet 198.51.100.10 80 ; R1: show ip nat translations'],
 hints:['R1 reaches the server from its public address; the hosts do not. Their packets leave with a private source the ISP cannot route back to.','show ip nat translations stays empty. In show running-config, check which interface is marked inside and which outside, against the address plan.','The roles are swapped: G0/0 faces the LAN and must be inside, G0/1 faces the ISP and must be outside. The PAT rule itself is correct.'],
 lesson:'NAT only translates traffic that enters an inside interface and leaves an outside one. With the roles reversed nothing matches, so no translation is ever created and the router\'s own traffic is the only thing that still works.'});

// ----- incident 11
addIncident({title:'Incident 11: the guests lost more than the server',base:'Standard ACL',start:'R2',
 brief:'Guests are kept away from the server, as intended. But they have also lost R2 itself, which the policy allows. Find where the guest filter is applied and move it so it blocks exactly what it should.',
 symptom:['PC2','10.0.0.2'],
 fault:{R2:[...EN,'interface g0/1','no ip access-group 10 out','interface g0/0','ip access-group 10 in','end']},
 repair:{R2:[...EN,'interface g0/0','no ip access-group 10 in','interface g0/1','ip access-group 10 out','end','show access-lists'],PC2:['ping 10.0.0.2']},
 steps:['PC2: ping 10.0.0.2 | ping 192.168.3.10 ; PC1: ping 192.168.3.10','R2: enable | show access-lists | show running-config','R2: configure terminal | interface g0/0 | no ip access-group 10 in | interface g0/1 | ip access-group 10 out | end','PC2: ping 10.0.0.2 | # still blocked from the server, as intended | ping 192.168.3.10 ; PC1: ping 192.168.3.10'],
 hints:['The block itself works; it is catching more than it should. That points at where the filter sits, not what it says.','show access-lists shows ACL 10 matching guest packets. show running-config shows the interface and direction it is applied in. Which interface do guest packets cross on their way to R2\'s address?','ACL 10 is inbound on G0/0, so it stops guests at R2\'s front door. Remove it there and apply it outbound on G0/1, next to the server.'],
 lesson:'A standard ACL can only see the source address, so its position decides what it blocks. Near the destination it blocks one destination; anywhere earlier on the path it blocks everything behind that point.'});

// ----- incident 12
addIncident({title:'Incident 12: the web went quiet',base:'Extended named ACL',start:'R1',
 brief:'Staff could use the web server this morning. After a change to the WEB-ONLY ACL, HTTP to the server fails while other traffic still flows. Find the line that is stopping it and remove it without rewriting the ACL.',
 symptom:['PC1','192.168.3.10','tcp',80],
 fault:{R1:[...EN,'ip access-list extended WEB-ONLY','5 deny ip 192.168.1.0 0.0.0.255 host 192.168.3.10','end']},
 repair:{R1:[...EN,'ip access-list extended WEB-ONLY','no 5','end','show access-lists'],PC1:['telnet 192.168.3.10 80']},
 steps:['PC1: telnet 192.168.3.10 80 | ping 10.0.0.2','R1: enable | show access-lists','R1: configure terminal | ip access-list extended WEB-ONLY | no 5 | end','PC1: telnet 192.168.3.10 80 | # still blocked, as intended | ping 192.168.3.10 ; R1: show access-lists'],
 hints:['Only HTTP to the server broke; other destinations work. Something now matches web traffic before the permit does.','show access-lists: read the sequence numbers from the top and watch which line\'s counter goes up when you test.','Line 5 denies all IP to the server above the permit at line 10. Delete line 5; the deny at line 20 already does that job after the permit.'],
 lesson:'ACLs are read top-down and the first match wins, so a broad deny placed above a specific permit silently overrides it. The match counters tell you which line is really doing the work.'});

// ----- incident 13
const PC1MAC=macOf({name:'PC1'});
addIncident({title:'Incident 13: the new laptop is locked out',base:'Port security',start:'SW1',
 brief:'PC1\'s old laptop was replaced with a new one on the same desk. The new machine has no network at all, and its switch port light is off. Keep port security exactly as designed, and get the new laptop working.',
 symptom:['PC1','192.168.1.12'],
 fault:{SW1:[...EN,'interface f0/1','shutdown','no switchport port-security mac-address sticky '+PC1MAC,'switchport port-security mac-address sticky 0011.2233.4455','no shutdown','end']},
 repair:{SW1:[...EN,'interface f0/1','shutdown','no switchport port-security mac-address sticky 0011.2233.4455','no shutdown','end','show port-security interface f0/1'],PC1:['ping 192.168.1.12']},
 steps:['PC1: ping 192.168.1.12 | ipconfig /all','SW1: enable | show interfaces status | show port-security interface f0/1 | show port-security address','SW1: configure terminal | interface f0/1 | shutdown | no switchport port-security mac-address sticky 0011.2233.4455 | no shutdown | end','SW1: show port-security interface f0/1 ; PC1: ping 192.168.1.12'],
 hints:['Only PC1 is cut off and its port is dark: the switch took the port down on purpose rather than a cable failing.','show interfaces status shows Fa0/1 err-disabled. show port-security interface f0/1 shows a violation, and show port-security address shows the stored address. Compare it with the new laptop\'s MAC from ipconfig /all.','The port still remembers the old laptop\'s sticky address, and allows only one. Remove that sticky entry, then shut and re-enable the port so it learns the new laptop.'],
 lesson:'Sticky addresses stay in the config until someone removes them, so replacing a device on a port limited to one address is a violation. In shutdown mode the port err-disables and stays down until the old entry is cleared and the port is bounced.'});

// ----- incident 14
addIncident({title:'Incident 14: published, but to the wrong address',base:'Static NAT: publish a server',start:'R1',
 brief:'The public web server stopped answering on 203.0.113.10 after its NAT entry was retyped. The ISP still routes the whole block to R1 and the server is fine inside. Restore the published address.',
 symptom:['CLIENT','203.0.113.10','tcp',80],
 fault:{R1:[...EN,'no ip nat inside source static 192.168.1.10 203.0.113.10','ip nat inside source static 192.168.1.10 203.0.113.11','end']},
 repair:{R1:[...EN,'no ip nat inside source static 192.168.1.10 203.0.113.11','ip nat inside source static 192.168.1.10 203.0.113.10','end','show ip nat translations'],CLIENT:['telnet 203.0.113.10 80']},
 steps:['CLIENT: ping 203.0.113.10 | telnet 203.0.113.10 80','R1: enable | show ip nat translations | show running-config','R1: configure terminal | no ip nat inside source static 192.168.1.10 203.0.113.11 | ip nat inside source static 192.168.1.10 203.0.113.10 | end','CLIENT: ping 203.0.113.10 | telnet 203.0.113.10 80 ; R1: show ip nat translations'],
 hints:['Packets for 203.0.113.10 reach R1 (the ISP routes the whole block there), but nothing answers. The question is what R1 does with them.','show ip nat translations lists the static pair. Compare its inside global address with the published one in the address plan.','The server is mapped to 203.0.113.11. Remove that entry and map 192.168.1.10 to 203.0.113.10.'],
 lesson:'A static NAT entry is a fixed pair of addresses. If the inside global does not match the address the outside world uses, packets arrive at the router and find no translation, so they go nowhere.'});

// ----- incident 15
addIncident({title:'Incident 15: the switches cannot manage each other',base:'Native VLAN and allowed VLANs on trunks',start:'SW1',
 brief:'Both switches have a management address in VLAN 99, the native VLAN on their trunk. Staff traffic is fine, but SW1 can no longer reach SW2\'s management address after someone "reset" SW2\'s trunk settings. Restore management without touching the VLAN plan.',
 symptom:['SW1','192.168.99.2'],
 setup:{SW1:[...EN,'interface vlan 99','ip address 192.168.99.1 255.255.255.0','no shutdown','end'],SW2:[...EN,'interface vlan 99','ip address 192.168.99.2 255.255.255.0','no shutdown','end']},
 fault:{SW2:[...EN,'interface g0/1','no switchport trunk native vlan','end']},
 repair:{SW2:[...EN,'interface g0/1','switchport trunk native vlan 99','end','show interfaces trunk'],SW1:['enable','ping 192.168.99.2']},
 steps:['SW1: enable | ping 192.168.99.2 ; PC1: ping 192.168.10.12','SW1: show interfaces trunk ; SW2: enable | show interfaces trunk | show logging','SW2: configure terminal | interface g0/1 | switchport trunk native vlan 99 | end','SW1: ping 192.168.99.2 ; SW2: show interfaces trunk'],
 hints:['Tagged VLANs still cross the trunk; only the management VLAN, which travels untagged, is broken. That narrows it to how the two ends treat untagged frames.','Compare the Native vlan column of show interfaces trunk on both switches. show logging on SW2 also records a CDP native VLAN mismatch.','SW2\'s Gi0/1 went back to native VLAN 1. Set it to 99 again so untagged frames land in the same VLAN at both ends.'],
 lesson:'The native VLAN is a per-end setting: each switch drops untagged frames into its own native VLAN. When the ends disagree, untagged traffic lands in the wrong VLAN, and here VLAN 1 is not even allowed on the trunk, so management traffic simply disappears.'});

// ----- incident 16
addIncident({title:'Incident 16: the switch answers only locally',base:'Switch management access',start:'SW1',
 brief:'SW1 still forwards user traffic, and its management interface is up, but the admin workstation on another subnet can no longer ping it or log in. Find what changed on SW1 and restore remote management.',
 symptom:['ADMIN','192.168.99.2'],
 fault:{SW1:[...EN,'ip default-gateway 192.168.99.254','end']},
 repair:{SW1:[...EN,'ip default-gateway 192.168.99.1','end','show running-config'],ADMIN:['ping 192.168.99.2','ssh -l netadmin 192.168.99.2','yes','Mgmt-Pass1','exit']},
 steps:['ADMIN: ping 192.168.99.2 ; R1: enable | ping 192.168.99.2','SW1: enable | show ip interface brief | show running-config','SW1: configure terminal | ip default-gateway 192.168.99.1 | end','ADMIN: ping 192.168.99.2 | ssh -l netadmin 192.168.99.2 | yes | Mgmt-Pass1 | exit'],
 hints:['R1, on the same subnet as SW1\'s management address, can still reach it. Only devices on other subnets cannot, which points at the way back, not the way in.','The VLAN 99 interface is up with the right address. Look for the default gateway in show running-config and compare it with R1\'s address in VLAN 99.','The default gateway points at 192.168.99.254, which does not exist. Set it back to R1, 192.168.99.1.'],
 lesson:'A Layer 2 switch replies to remote managers through its default gateway, exactly like a PC. A wrong gateway leaves the switch reachable from its own subnet and silent to everything else.'});

// ----- incident 17
addIncident({title:'Incident 17: the admins are locked out',base:'Locking down device access',start:'R1',
 brief:'After someone edited the VTY filter, the administrators can no longer SSH to R1 from their own subnet, while the rest of the hardening is intact. Fix the filter, and make sure the fix survives a reload.',
 symptom:['ADMIN','192.168.10.1','tcp',22],
 fault:{R1:['enable','En-Secret9','configure terminal','no access-list 10','access-list 10 permit 192.168.20.0 0.0.0.255','end']},
 repair:{R1:['enable','En-Secret9','configure terminal','ip access-list standard 10','no 10','10 permit 192.168.10.0 0.0.0.255','end','copy running-config startup-config','<cr>'],ADMIN:['ssh -l admin 192.168.10.1','yes','Adm1n-Pass','exit']},
 steps:['ADMIN: ssh -l admin 192.168.10.1 ; PC1: ssh -l admin 192.168.20.1','R1: enable | En-Secret9 | show access-lists | show running-config','R1: configure terminal | ip access-list standard 10 | no 10 | 10 permit 192.168.10.0 0.0.0.255 | end | copy running-config startup-config | <cr>','ADMIN: ssh -l admin 192.168.10.1 | yes | Adm1n-Pass | exit ; PC1: # still refused, as intended | ssh -l admin 192.168.20.1'],
 hints:['SSH is refused, not timing out, so the router is reachable and something is turning the session away on purpose.','The VTY lines still use access-class 10. Read ACL 10 in show access-lists: which subnet does it permit?','ACL 10 permits the user subnet instead of the admin subnet. Edit line 10 to permit 192.168.10.0/24, then save, because the startup config no longer matches.'],
 lesson:'access-class turns away anyone the ACL does not permit, including the people who wrote it. Numbered ACLs can be edited line by line in ip access-list mode, and any change to a saved hardening config needs saving again.'});

// ----- incident 18
addIncident({title:'Incident 18: passive by default, silent by mistake',base:'OSPF router IDs and passive interfaces',start:'R2',
 brief:'The rogue router is still shut out, as intended, but now the two sites cannot reach each other either. Someone added a line to R2\'s OSPF config. Restore the adjacency without opening the user LANs again.',
 symptom:['PC1','192.168.2.10'],
 fault:{R2:[...EN,'router ospf 1','passive-interface g0/1','end']},
 repair:{R2:[...EN,'router ospf 1','no passive-interface g0/1','end','show ip ospf neighbor'],PC1:['ping 192.168.2.10']},
 steps:['PC1: ping 192.168.2.10','R1: enable | show ip ospf neighbor ; R2: enable | show ip ospf neighbor | show ip protocols','R2: configure terminal | router ospf 1 | no passive-interface g0/1 | end','R2: show ip ospf neighbor ; R1: show ip route ; PC1: ping 192.168.2.10'],
 hints:['Neither router has any OSPF neighbor now, but both are still running OSPF and the link between them is up.','show ip protocols on R2 lists its passive interfaces. With passive-interface default, the uplink must be the one exception.','R2\'s G0/1 is passive again. Remove that with no passive-interface g0/1; leave the default in place so the LANs stay protected.'],
 lesson:'A passive interface sends no hellos, so no neighbor can form there. With passive-interface default, every link that needs a neighbor must be listed as an exception, and losing that exception cuts the routers apart.'});

// ----- incident 19
addIncident({title:'Incident 19: a whole VLAN fell off one switch',base:'Per-VLAN root bridges',start:'DSW1',
 brief:'During a clean-up, an engineer removed what they thought was an unused VLAN from DSW1. Since then the GUEST host on DSW1 is unreachable and spanning tree for VLAN 20 has changed shape. Restore the VLAN so both trees match the design again.',
 symptom:['PC2','192.168.20.14'],
 fault:{DSW1:[...EN,'no vlan 20','end']},
 repair:{DSW1:[...EN,'vlan 20','name GUEST','end','show vlan brief'],PC2:['ping 192.168.20.14']},
 steps:['PC2: ping 192.168.20.14 ; PC1: ping 192.168.10.13','DSW1: enable | show vlan brief | show interfaces f0/1 switchport | show spanning-tree vlan 20','DSW1: configure terminal | vlan 20 | name GUEST | end','DSW1: show vlan brief ; ASW1: enable | show spanning-tree vlan 20 ; PC2: ping 192.168.20.14'],
 hints:['VLAN 10 works everywhere and VLAN 20 fails only toward DSW1. Something about VLAN 20 on DSW1 itself has changed.','show vlan brief on DSW1 has no VLAN 20, and show interfaces f0/1 switchport shows its access VLAN as Inactive. show spanning-tree vlan 20 has no instance at all.','VLAN 20 was deleted from DSW1. Create it again with its name; the ports and the spanning-tree priority for it are still configured and come back on their own.'],
 lesson:'Deleting a VLAN does not remove the ports from it: they stay assigned to a VLAN that no longer exists and stop forwarding. Spanning tree for that VLAN disappears from the switch too, which changes the tree on its neighbors.'});

// ----- incident 20
addIncident({title:'Incident 20: CDP went dark at the edge',base:'Map an unknown network with CDP',start:'R1',
 brief:'After a security review, someone "hardened" EDGE by turning off CDP. The provider can no longer see EDGE, as intended, but neither can CORE, and the network documentation tool has lost EDGE. Keep the provider blind and restore discovery inside.',
 symptom:n=>cdpPeers(n,n.devs.SW1).some(x=>x.p===n.devs.R1),
 fault:{R1:[...EN,'no cdp run','end']},
 repair:{R1:[...EN,'cdp run','end','show cdp neighbors'],SW1:['enable','show cdp neighbors']},
 steps:['SW1: enable | show cdp neighbors ; ISP: enable | show cdp neighbors','R1: enable | show cdp | show running-config','R1: configure terminal | cdp run | end','R1: show cdp neighbors ; SW1: show cdp neighbors ; ISP: # still blind, as intended | show cdp neighbors'],
 hints:['CORE lists ACC-A but no longer EDGE. EDGE is up and forwarding, so this is about CDP on EDGE, not the link.','show cdp on EDGE says CDP is not enabled at all. The interface toward the ISP already has its own no cdp enable in show running-config.','Someone used no cdp run, which turns CDP off everywhere. Turn it back on globally; the per-interface setting on G0/1 keeps the provider blind.'],
 lesson:'no cdp run disables CDP on every interface, which blinds you to your own network as well. To hide a device from an outsider, disable CDP only on the interface that faces them.'});

// ----- incident 21
addIncident({title:'Incident 21: addresses, but no internet',base:'Small office build',start:'R1',
 brief:'The branch PCs renewed their leases this morning and now get addresses, but nothing beyond the LAN works, and R1 itself still reaches the internet. Someone edited the DHCP pool. Repair it and get the PCs back online.',
 symptom:['PC1','198.51.100.10'],
 fault:{R1:[...EN,'ip dhcp pool OFFICE','default-router 192.168.1.254','end'],PC1:['ipconfig /release','ipconfig /renew'],PC2:['ipconfig /release','ipconfig /renew']},
 repair:{R1:[...EN,'ip dhcp pool OFFICE','default-router 192.168.1.1','end'],PC1:['ipconfig /renew','ping 198.51.100.10'],PC2:['ipconfig /renew']},
 steps:['PC1: ipconfig | ping 198.51.100.10 ; R1: enable | ping 198.51.100.10','R1: show running-config | show ip dhcp binding','R1: configure terminal | ip dhcp pool OFFICE | default-router 192.168.1.1 | end','PC1: ipconfig /renew | ping 198.51.100.10 ; PC2: ipconfig /renew | ping 198.51.100.10'],
 hints:['The PCs have addresses in the right subnet, and R1 reaches the internet. Compare the PCs\' full IP settings with the address plan, not just their addresses.','ipconfig on PC1 shows the default gateway it was given. Compare it with R1\'s LAN address, then find where that value comes from in R1\'s DHCP pool.','The OFFICE pool hands out 192.168.1.254 as the default router. Set default-router back to 192.168.1.1, then renew both PCs so they pick it up.'],
 lesson:'DHCP options travel with the lease: a wrong default-router gives every client a dead gateway even though their addresses are fine. Clients only see the corrected value when they renew.'});

// ----- incident 22
addIncident({title:'Incident 22: the branch crawls home on the backup',base:'Floating static route',start:'R2',
 brief:'Both links between HQ and the branch are up, yet monitoring shows the branch\'s traffic returning to HQ over the slow backup link. Nothing has failed. Find out why R2 prefers the backup and put traffic back on the primary.',
 symptom:n=>pathVia(n,'PC2','192.168.1.10','10.0.12.1'),
 fault:{R2:[...EN,'no ip route 192.168.1.0 255.255.255.0 10.0.12.1','ip route 192.168.1.0 255.255.255.0 10.0.12.5','end']},
 repair:{R2:[...EN,'no ip route 192.168.1.0 255.255.255.0 10.0.12.5','ip route 192.168.1.0 255.255.255.0 10.0.12.1','end','show ip route'],PC2:['tracert 192.168.1.10']},
 steps:['PC2: tracert 192.168.1.10 ; PC1: tracert 192.168.2.10','R2: enable | show ip route | show ip route 192.168.1.10 | show running-config','R2: configure terminal | no ip route 192.168.1.0 255.255.255.0 10.0.12.5 | ip route 192.168.1.0 255.255.255.0 10.0.12.1 | end','R2: show ip route ; PC2: tracert 192.168.1.10'],
 hints:['Traffic toward the branch uses the primary link, traffic back from it does not. Only R2\'s choice is wrong.','show ip route on R2 shows the HQ LAN learned at distance 5, the floating route. show running-config shows a primary route too, so ask why that one is not in the table.','The primary route points at 10.0.12.5, which is not on the link (10.0.12.0/30), so it can never be used and the backup takes over. Point it at R1, 10.0.12.1.'],
 lesson:'A static route is only installed if its next hop is reachable through a connected network. A typo in the next hop silently disables the route, and a floating route hides the mistake by carrying the traffic over the backup path.'});

// ----- incident 23
addIncident({title:'Incident 23: the inspection path took the wrong server',base:'How a router chooses a route',start:'R1',
 brief:'Security says SRV1\'s traffic is no longer passing through R3\'s inspection, and SRV2\'s traffic now is. Both servers are still reachable. Check which route R1 really uses for each server and correct the policy route.',
 symptom:n=>pathVia(n,'PC1','10.10.5.10','10.0.13.2')&&pathVia(n,'PC1','10.10.5.20','10.0.12.2'),
 fault:{R1:[...EN,'no ip route 10.10.5.10 255.255.255.255 10.0.13.2','ip route 10.10.5.20 255.255.255.255 10.0.13.2','end']},
 repair:{R1:[...EN,'no ip route 10.10.5.20 255.255.255.255 10.0.13.2','ip route 10.10.5.10 255.255.255.255 10.0.13.2','end','show ip route 10.10.5.10'],PC1:['tracert 10.10.5.10']},
 steps:['PC1: tracert 10.10.5.10 | tracert 10.10.5.20','R1: enable | show ip route 10.10.5.10 | show ip route 10.10.5.20 | show ip route static','R1: configure terminal | no ip route 10.10.5.20 255.255.255.255 10.0.13.2 | ip route 10.10.5.10 255.255.255.255 10.0.13.2 | end','R1: show ip route 10.10.5.10 ; PC1: tracert 10.10.5.10 | tracert 10.10.5.20'],
 hints:['Nothing is down; the two servers have swapped paths. Look at how R1 decides per destination address.','show ip route 10.10.5.10 and show ip route 10.10.5.20 show which entry each address matches. One of them hits a /32 host route.','The host route was entered for 10.10.5.20 instead of 10.10.5.10. Move it to SRV1\'s address.'],
 lesson:'The longest matching prefix always wins, so a /32 host route captures exactly one address. Put it on the wrong address and the policy quietly applies to the wrong server while everything still works.'});

// ----- incident 24
addIncident({title:'Incident 24: the branch lost its only neighbor',base:'OSPF on a shared segment',start:'BR',
 brief:'After someone tuned BR\'s WAN interface "for faster failover", the branch lost every route to the shared LAN. The link is up and both ends are configured for OSPF. Restore the adjacency.',
 symptom:['PC1','10.0.0.1'],
 fault:{BR:[...EN,'interface g0/1','ip ospf hello-interval 5','end']},
 repair:{BR:[...EN,'interface g0/1','no ip ospf hello-interval','end','show ip ospf neighbor'],PC1:['ping 10.0.0.1']},
 steps:['PC1: ping 10.0.0.1 ; BR: enable | ping 172.16.0.1','BR: show ip ospf neighbor | show ip ospf interface g0/1 ; R4: enable | show ip ospf interface g0/1','BR: configure terminal | interface g0/1 | no ip ospf hello-interval | end','BR: show ip ospf neighbor | show ip route ospf ; PC1: ping 10.0.0.1'],
 hints:['BR can ping R4 across the WAN, so the link works. The problem is OSPF between them, not IP.','show ip ospf neighbor on BR is empty. Compare the timer line of show ip ospf interface g0/1 on BR and on R4.','BR sends hellos every 5 seconds with a 20-second dead time; R4 uses 10 and 40. Remove the hello-interval change on BR so both ends match.'],
 lesson:'OSPF neighbors must agree on the hello and dead intervals (as well as area, subnet and authentication), or they never form an adjacency. Change timers on both ends of a link, or not at all.'});

// ----- incident 25
addIncident({title:'Incident 25: the contractor\'s server vanished from discovery',base:'LLDP',start:'SW1',
 brief:'The documentation team says SW1 no longer lists the contractor\'s file server in LLDP, and the contractor says their server can now see SW1. Someone edited the server port. Put it back the way the design intended.',
 symptom:n=>lldpPeers(n,n.devs.SW1).some(x=>x.p===n.devs.SRV1)&&!lldpPeers(n,n.devs.SRV1).some(x=>x.p===n.devs.SW1),
 fault:{SW1:[...EN,'interface f0/5','lldp transmit','no lldp receive','end']},
 repair:{SW1:[...EN,'interface f0/5','lldp receive','no lldp transmit','end','show lldp neighbors']},
 steps:['SW1: enable | show lldp neighbors','SW1: show lldp interface f0/5 | show running-config','SW1: configure terminal | interface f0/5 | lldp receive | no lldp transmit | end','SW1: show lldp interface f0/5 | show lldp neighbors'],
 hints:['LLDP still works toward SW2 and R1; only the server port changed, and in both directions at once.','show lldp interface f0/5 shows which of transmit and receive is enabled on that port.','The two settings were swapped: SW1 now advertises itself to the contractor and ignores what the server sends. Enable receive and disable transmit again.'],
 lesson:'LLDP transmit and receive are separate per-port switches. Turning off transmit hides you from a neighbor while still learning about it; turning off receive does the opposite, which is rarely what you want.'});

// ----- incident 26
addIncident({title:'Incident 26: the phone cannot get an address',base:'Voice VLAN',start:'SW1',
 brief:'After a VLAN clean-up on SW1, the desk phone cannot get an address or reach the call server, although the PC plugged into it still works. The port configuration looks unchanged. Get the phone back into the voice network.',
 symptom:['PHONE1','192.168.200.5'],
 fault:{SW1:[...EN,'no vlan 150','end'],PHONE1:['ipconfig /renew']},
 repair:{SW1:[...EN,'vlan 150','name VOICE','end','show vlan brief'],PHONE1:['ipconfig /renew','ping 192.168.200.5']},
 steps:['PHONE1: ipconfig /renew ; PC1: ping 192.168.10.1','SW1: enable | show interfaces fa0/1 switchport | show vlan brief','SW1: configure terminal | vlan 150 | name VOICE | end','PHONE1: ipconfig /renew | ping 192.168.200.5'],
 hints:['The PC behind the phone works, so the port and the data VLAN are fine. Only the phone\'s own traffic, which is tagged, is affected.','show interfaces fa0/1 switchport shows Voice VLAN 150 as Inactive, and show vlan brief has no VLAN 150.','The voice VLAN was deleted from the switch. Create VLAN 150 again (name VOICE), then renew the phone\'s address.'],
 lesson:'The port still tells the phone to use VLAN 150, so the phone keeps tagging its traffic with it. If the VLAN does not exist on the switch, those frames are dropped and the phone is cut off while the PC behind it carries on.'});

// ----- incident 27
addIncident({title:'Incident 27: translated, but nobody answers',base:'Dynamic NAT with a pool',start:'R1',
 brief:'R1 is translating inside traffic, and the translation table fills up as usual, but replies never come back. Someone retyped the NAT pool from a ticket. Compare it with what the ISP actually routes to you and fix it.',
 symptom:['PC1','198.51.100.10'],
 fault:{R1:[...EN,'ip nat pool PUBLIC 203.0.113.43 203.0.113.44 netmask 255.255.255.248','end']},
 repair:{R1:['enable','clear ip nat translation *','configure terminal','ip nat pool PUBLIC 203.0.113.33 203.0.113.34 netmask 255.255.255.248','end','show ip nat statistics'],PC1:['ping 198.51.100.10']},
 steps:['PC1: ping 198.51.100.10 ; R1: enable | show ip nat translations','R1: show ip nat statistics | show running-config ; ISP: enable | show ip route','R1: clear ip nat translation * | configure terminal | ip nat pool PUBLIC 203.0.113.33 203.0.113.34 netmask 255.255.255.248 | end','PC1: ping 198.51.100.10 ; PC3: ping 198.51.100.10 ; R1: show ip nat translations'],
 hints:['Translations are being created, so the ACL, the interfaces and the rule are working. The problem is what happens to the replies.','show ip nat statistics shows the pool range. Compare it with the block in the ISP\'s routing table that points to R1.','The pool is 203.0.113.43 to .44, but the ISP only routes 203.0.113.32/29 (.33 to .38) to R1. Clear the translations, then define the pool as .33 to .34 again.'],
 lesson:'NAT can only use addresses that the outside world routes back to you. IOS also refuses to redefine a pool while translations still use it, so clear them first.'});

// ----- incident 28
addIncident({title:'Incident 28: the exception that came too late',base:'Named ACLs and sequence numbers',start:'R1',
 brief:'The contractor laptop lost access to the file server after someone "tidied" the SRV-ACCESS list. Its permit line is still there. Look at where it sits and put it back where it works, keeping the list numbered 10 to 40.',
 symptom:['LAPTOP','192.168.30.10'],
 fault:{R1:[...EN,'ip access-list standard SRV-ACCESS','no 30','45 permit host 192.168.20.50','end']},
 repair:{R1:[...EN,'ip access-list standard SRV-ACCESS','no 45','30 permit host 192.168.20.50','end','show access-lists'],LAPTOP:['ping 192.168.30.10']},
 steps:['LAPTOP: ping 192.168.30.10 ; PC1: ping 192.168.30.10','R1: enable | show access-lists','R1: configure terminal | ip access-list standard SRV-ACCESS | no 45 | 30 permit host 192.168.20.50 | end','R1: show access-lists ; LAPTOP: ping 192.168.30.10 ; CONTR: # still blocked, as intended | ping 192.168.30.10'],
 hints:['The laptop\'s permit line exists, yet the laptop is denied. Think about which line its packets meet first.','show access-lists: the laptop\'s permit is now line 45, after line 40, which denies the whole contractor subnet. Watch line 40\'s counter.','Delete line 45 and add the permit back as line 30, between the staff permit and the contractor deny.'],
 lesson:'An exception only works if it comes before the broader line it is an exception to. Sequence numbers let you put a line exactly where it has to be.'});

// ----- incident 29
addIncident({title:'Incident 29: one clock has drifted off',base:'NTP and syslog',start:'R2',
 brief:'Log messages from R2 no longer line up with R1\'s: R2\'s timestamps carry an asterisk and its clock is drifting. Someone edited R2\'s time settings. Get R2 synchronised to the time server again.',
 symptom:n=>ntpState(n,n.devs.R2).synced,
 fault:{R2:[...EN,'no ntp server 192.168.1.50','ntp server 192.168.1.5','end']},
 repair:{R2:[...EN,'no ntp server 192.168.1.5','ntp server 192.168.1.50','end','show ntp status']},
 steps:['R2: enable | show clock | show ntp status ; R1: enable | show ntp status','R2: show ntp associations | show running-config','R2: configure terminal | no ntp server 192.168.1.5 | ntp server 192.168.1.50 | end','R2: show ntp associations | show ntp status | show clock'],
 hints:['R1 is synchronised and R2 is not, and they reach the time server through the same path. Look at what R2 is trying to sync to.','show ntp associations on R2 lists the configured server with .INIT. and stratum 16: nothing answers there. Compare the address with the time server in the address plan.','R2 points at 192.168.1.5 instead of 192.168.1.50. Replace the server address.'],
 lesson:'An NTP client only synchronises to a server that actually answers. A wrong server address leaves the clock free-running, and show ntp associations makes it visible with .INIT. and stratum 16.'});

// ----- incident 30
addIncident({title:'Incident 30: the core stopped routing',base:'Inter-VLAN routing on a Layer 3 switch',start:'DSW1',
 brief:'After DSW1\'s configuration was restored from an old template, hosts can still reach their own gateways, but nothing crosses between VLANs or leaves the site. The SVIs and the uplink look fine. Find what the template left out.',
 symptom:['PC1','192.168.20.12'],
 fault:{DSW1:[...EN,'no ip routing','end']},
 repair:{DSW1:[...EN,'ip routing','end','show ip route'],PC1:['ping 192.168.20.12']},
 steps:['PC1: ping 192.168.10.1 | ping 192.168.20.12 ; PC3: ping 203.0.113.1','DSW1: enable | show ip interface brief | show ip route','DSW1: configure terminal | ip routing | end','DSW1: show ip route ; PC1: ping 192.168.20.12 ; PC3: ping 203.0.113.1'],
 hints:['Each host reaches its own gateway address on DSW1, so the SVIs are up. Anything that needs DSW1 to route fails.','show ip route on DSW1 shows only a default gateway line instead of a routing table: the switch is not routing at all.','IP routing is off. Turn it back on with ip routing; the connected and static routes come straight back.'],
 lesson:'A Layer 3 switch with routing off still answers on its SVIs, so hosts can ping their gateway and everything looks half alive. show ip route is the giveaway: no routing table, just a default gateway.'});

// ----- incident 31
addIncident({title:'Incident 31: snooping shut out the real server',base:'DHCP snooping',start:'SW1',
 brief:'The rogue server is still silenced, as intended. But after the uplink was re-patched and reconfigured, no client gets an address from R1 either. Find what snooping is now blocking and restore leases for everyone.',
 symptom:['PC1','203.0.113.10'],
 fault:{SW1:[...EN,'interface g0/1','no ip dhcp snooping trust','end'],PC1:['ipconfig /release','ipconfig /renew'],PC2:['ipconfig /release','ipconfig /renew']},
 repair:{SW1:[...EN,'interface g0/1','ip dhcp snooping trust','end','show ip dhcp snooping'],PC1:['ipconfig /renew','ping 203.0.113.10'],PC2:['ipconfig /renew']},
 steps:['PC1: ipconfig /renew ; PC2: ipconfig /renew','SW1: enable | show ip dhcp snooping | show ip dhcp snooping binding','SW1: configure terminal | interface g0/1 | ip dhcp snooping trust | end','PC1: ipconfig /renew | ping 203.0.113.10 ; PC2: ipconfig /renew ; SW1: show ip dhcp snooping binding'],
 hints:['Nobody gets a lease, from the rogue or from R1. Snooping is doing its job against the rogue, so look at what else it is blocking.','show ip dhcp snooping lists the trusted ports. The uplink toward R1 is no longer among them, and the binding table is empty.','Gi0/1 lost its trust setting when it was reconfigured. Trust it again, then renew the clients.'],
 lesson:'Snooping drops every server reply that arrives on an untrusted port, legitimate or not. Re-patching or rebuilding an uplink means re-applying its trust setting, or the real server is silenced along with the rogue.'});

// ----- incident 32
addIncident({title:'Incident 32: the printer fell off again',base:'Dynamic ARP Inspection',start:'SW1',
 brief:'The printer was moved to the next wall jack during an office shuffle, and since then nobody can print. Its address and VLAN are unchanged. Everything else on the switch works, and DAI must stay on.',
 symptom:['PRINTER','192.168.10.1'],
 fault:{SW1:[...EN,'no ip source binding '+macOf({name:'PRINTER'})+' vlan 10 192.168.10.5 interface f0/3','ip source binding '+macOf({name:'PRINTER'})+' vlan 10 192.168.10.5 interface f0/4','end']},
 repair:{SW1:[...EN,'no ip source binding '+macOf({name:'PRINTER'})+' vlan 10 192.168.10.5 interface f0/4','ip source binding '+macOf({name:'PRINTER'})+' vlan 10 192.168.10.5 interface f0/3','end','show ip dhcp snooping binding'],PRINTER:['ping 192.168.10.1']},
 steps:['PRINTER: ping 192.168.10.1 ; PC1: ping 192.168.10.1','SW1: enable | show ip dhcp snooping binding | show ip arp inspection | show cdp neighbors','SW1: configure terminal | no ip source binding '+macOf({name:'PRINTER'})+' vlan 10 192.168.10.5 interface f0/4 | ip source binding '+macOf({name:'PRINTER'})+' vlan 10 192.168.10.5 interface f0/3 | end','PRINTER: ping 192.168.10.1 ; SW1: show ip arp inspection'],
 hints:['Only the printer is cut off, and it still has its fixed address. DAI drops ARPs that do not match a binding exactly, including the port.','show ip dhcp snooping binding lists the printer\'s static entry. Compare its interface with the port the printer is really connected to (the map, or show interfaces status).','The binding says Fa0/4 but the printer is on Fa0/3. Remove the old binding and add it for Fa0/3.'],
 lesson:'A DAI binding ties an address to a MAC, a VLAN and a port. Move a fixed-address device to another port and its static binding has to move too, or DAI drops its ARPs as spoofed.'});

// ----- incident 33
addIncident({title:'Incident 33: IPv6 stopped at the router',base:'IPv6 addressing',start:'R1',
 brief:'IPv6 hosts on both LANs still have their addresses and can reach R1\'s interfaces, but nothing crosses between the LANs over IPv6 any more. A change was made on R1 overnight. Restore IPv6 between the LANs.',
 symptom:n=>reach6(n,n.devs.PC1,parse6('2001:db8:acad:2::10')).ok,
 fault:{R1:[...EN,'no ipv6 unicast-routing','end']},
 repair:{R1:[...EN,'ipv6 unicast-routing','end','show ipv6 interface g0/0'],PC1:['ping 2001:db8:acad:2::10']},
 steps:['PC1: ping 2001:db8:acad:2::10 | ping 2001:db8:acad:1::1','R1: enable | show ipv6 interface brief | show ipv6 interface g0/0','R1: configure terminal | ipv6 unicast-routing | end','R1: show ipv6 interface g0/0 ; PC1: ping 2001:db8:acad:2::10'],
 hints:['Hosts reach R1\'s own addresses but not the other LAN. R1 is up and addressed, so ask whether it is still willing to forward.','show ipv6 interface g0/0: a router that routes IPv6 joins FF02::2, the all-routers group, and sends router advertisements. Both are missing.','IPv6 unicast routing was turned off. Turn it back on; the addresses were never lost.'],
 lesson:'Without ipv6 unicast-routing, a router keeps its IPv6 addresses but behaves like a host: it stops forwarding, stops sending router advertisements and leaves the all-routers group. New hosts would not even get a SLAAC prefix.'});

// ----- incident 34
addIncident({title:'Incident 34: the branch answers over the backup',base:'IPv6 static and default routes',start:'HQ',
 brief:'Both links between HQ and the branch are up, but HQ sends traffic for the branch LAN over the slow link-local-only backup. Branch-bound traffic still arrives, just the long way. Find the route that should be carrying it.',
 symptom:n=>{const r=reach6(n,n.devs.PC1,parse6('2001:db8:acad:20::20'));return r.ok&&r.f.hops.includes(parse6('2001:db8:acad:12::2'));},
 fault:{HQ:[...EN,'no ipv6 route 2001:db8:acad:20::/64 2001:db8:acad:12::2','ipv6 route 2001:db8:acad:2::/64 2001:db8:acad:12::2','end']},
 repair:{HQ:[...EN,'no ipv6 route 2001:db8:acad:2::/64 2001:db8:acad:12::2','ipv6 route 2001:db8:acad:20::/64 2001:db8:acad:12::2','end','show ipv6 route static'],PC1:['ping 2001:db8:acad:20::20']},
 steps:['PC1: tracert 2001:db8:acad:20::20 ; PC2: tracert 2001:db8:acad:10::10','HQ: enable | show ipv6 route static | show running-config','HQ: configure terminal | no ipv6 route 2001:db8:acad:2::/64 2001:db8:acad:12::2 | ipv6 route 2001:db8:acad:20::/64 2001:db8:acad:12::2 | end','HQ: show ipv6 route static ; PC1: tracert 2001:db8:acad:20::20'],
 hints:['Traffic from the branch uses the primary link; traffic toward it does not. The difference is on HQ.','show ipv6 route static on HQ shows the branch LAN reached at distance 10 via FE80::2: the floating route. The primary route exists in the config but for a different prefix.','The primary route was typed for 2001:DB8:ACAD:2::/64 instead of 2001:DB8:ACAD:20::/64. Replace it with the correct prefix.'],
 lesson:'IPv6 prefixes are easy to mistype, and a route to the wrong prefix is accepted without complaint. A floating backup then hides the mistake by carrying the traffic the long way round.'});

// ----- incident 35
addIncident({title:'Incident 35: the gateway nobody owns',base:'First-hop redundancy with HSRP',start:'R1',
 brief:'After an addressing change on the routers, every PC on the LAN lost its gateway, even though HSRP shows R1 active and R2 standby. The PCs were not changed. Restore the gateway the PCs are using.',
 symptom:['PC1','203.0.113.10'],
 fault:{R1:[...EN,'interface g0/0','standby 1 ip 192.168.1.254','end'],R2:[...EN,'interface g0/0','standby 1 ip 192.168.1.254','end']},
 repair:{R1:[...EN,'interface g0/0','standby 1 ip 192.168.1.1','end','show standby brief'],R2:[...EN,'interface g0/0','standby 1 ip 192.168.1.1','end'],PC1:['ping 203.0.113.10']},
 steps:['PC1: ipconfig | ping 192.168.1.1 | ping 192.168.1.254','R1: enable | show standby brief ; R2: enable | show standby brief','R1: configure terminal | interface g0/0 | standby 1 ip 192.168.1.1 | end ; R2: configure terminal | interface g0/0 | standby 1 ip 192.168.1.1 | end','R1: show standby brief ; PC1: ping 203.0.113.10 ; PC2: ping 203.0.113.10'],
 hints:['HSRP looks healthy, with an active and a standby router. Check whether the address it protects is the one the PCs actually use.','ipconfig on a PC shows gateway 192.168.1.1. show standby brief shows the virtual IP the group is answering for now.','The group\'s virtual IP was changed to 192.168.1.254. Set it back to 192.168.1.1 on both routers.'],
 lesson:'HSRP only protects the address it is given. If the virtual IP does not match the gateway the hosts use, HSRP can be perfectly healthy while every host is cut off.'});

// ----- incident 36: a broadcast storm
addIncident({title:'Incident 36: the network that ate itself',base:'Spanning tree: root bridge and edge ports',start:'SW1',
 brief:'Minutes after someone "tidied up" the switch configs, every ping across the switches started failing and all three switches are logging the same host flapping between ports. Nothing was unplugged. Make the network usable again.',
 symptom:['PC1','192.168.1.12'],
 fault:{SW1:[...EN,'no spanning-tree vlan 1','end'],SW2:[...EN,'no spanning-tree vlan 1','end'],SW3:[...EN,'no spanning-tree vlan 1','end']},
 repair:{SW1:[...EN,'spanning-tree vlan 1','end','show spanning-tree'],SW2:[...EN,'spanning-tree vlan 1','end'],SW3:[...EN,'spanning-tree vlan 1','end'],PC1:['ping 192.168.1.12']},
 steps:['PC1: ping 192.168.1.12','SW1: enable | show logging | show spanning-tree vlan 1 | show running-config','SW1: configure terminal | spanning-tree vlan 1 | end ; SW2: enable | configure terminal | spanning-tree vlan 1 | end ; SW3: enable | configure terminal | spanning-tree vlan 1 | end','SW1: show spanning-tree ; PC1: ping 192.168.1.12'],
 hints:['The links are up and nothing moved, yet a single ping fails and the switches complain that the same MAC address keeps appearing on two ports. Something that used to stop frames going round in circles is missing.','show spanning-tree vlan 1 says the instance does not exist, and the running-config has a line that turned it off. Three switches in a triangle with no spanning tree is a loop.','no spanning-tree vlan 1 was added on every switch. Put spanning-tree vlan 1 back on all three; the root and backup priorities are still configured.'],
 lesson:'Redundant links need spanning tree. With it off, the first broadcast (an ARP request is enough) circles the loop for ever, every switch learns the sender on two ports in turn (%SW_MATM-4-MACFLAP_NOTIF), and the storm starves everything else. One blocked port is the price of a loop-free network.'});

// ===== multi-area OSPF and the wired side of wireless =====
Object.assign(CCNA_LAB_MAP,{'Multi-area OSPF':['3.4'],'Wiring a wireless LAN':['1.1','2.7','2.8','5.10']});
for(const [id,name] of [['1.1','Network components'],['2.7','WLAN physical connections'],['2.8','Device management access'],['5.10','WLAN with WPA2 PSK']])if(!CCNA_OBJECTIVES[id])CCNA_OBJECTIVES[id]=name;
const ospfRouteCode=(n,dev,ip,len)=>{const r=routes(n,n.devs[dev]).find(x=>x.net===ip2n(ip)&&x.len===len);return r?r.code:null;};
addLab({title:'Multi-area OSPF',group:'Routing',
 brief:'Four routers in a line, already addressed. The company wants OSPF, but one flat area would mean every router recalculating when any link flaps. Put the two LAN routers in their own areas, make R2 and R3 the area border routers on the backbone, and prove the far LANs appear as inter-area routes.',
 pos:{PC1:[40,125],R1:[145,125],R2:[255,125],R3:[365,125],R4:[475,125],PC4:[565,125]},start:'R1',
 build(){const n=mkNet([mkRouter('R1'),mkRouter('R2'),mkRouter('R3'),mkRouter('R4'),mkPC('PC1','192.168.1.10',24,'192.168.1.1'),mkPC('PC4','192.168.4.10',24,'192.168.4.1')]);
  link(n,'PC1','f0','R1','g0/0');link(n,'R1','g0/1','R2','g0/0');link(n,'R2','g0/1','R3','g0/0');link(n,'R3','g0/1','R4','g0/0');link(n,'R4','g0/1','PC4','f0');
  setIp(n,'R1','g0/0','192.168.1.1',24);setIp(n,'R1','g0/1','10.0.12.1',30);setIp(n,'R2','g0/0','10.0.12.2',30);setIp(n,'R2','g0/1','10.0.23.1',30);
  setIp(n,'R3','g0/0','10.0.23.2',30);setIp(n,'R3','g0/1','10.0.34.1',30);setIp(n,'R4','g0/0','10.0.34.2',30);setIp(n,'R4','g0/1','192.168.4.1',24);return n;},
 addr:[['R1','G0/0 LAN · G0/1 to R2','192.168.1.1/24 · 10.0.12.1/30 · area 1'],['R2 (ABR)','G0/0 to R1 · G0/1 to R3','10.0.12.2/30 area 1 · 10.0.23.1/30 area 0'],['R3 (ABR)','G0/0 to R2 · G0/1 to R4','10.0.23.2/30 area 0 · 10.0.34.1/30 area 2'],['R4','G0/0 to R3 · G0/1 LAN','10.0.34.2/30 · 192.168.4.1/24 · area 2'],['PC1 / PC4','LANs','192.168.1.10, 192.168.4.10'],['Router IDs','R1 to R4','1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4']],
 tasks:['On R1, start OSPF process 1 with router ID 1.1.1.1, put both of its networks in area 1, and make the LAN interface passive.','On R2, use router ID 2.2.2.2. Its link to R1 belongs to area 1, its link to R3 to area 0.','On R3, use router ID 3.3.3.3. Its link to R2 is area 0, its link to R4 is area 2.','On R4, use router ID 4.4.4.4, put both networks in area 2 and make the LAN interface passive.','On R2, run <code>show ip ospf</code> and <code>show ip ospf neighbor</code>: it should report two areas and call itself an area border router, with R1 and R3 as neighbours.','On R1, run <code>show ip route</code>: the far LAN 192.168.4.0/24 and the backbone links arrive as <code>O IA</code> routes. Then ping PC4 from PC1.'],
 why:['Area 1 is R1\'s own area. The passive LAN interface is still advertised into OSPF but sends no hellos, since there is no router to find on it.','R2 has an interface in area 1 and one in area 0, which makes it an area border router: it summarises area 1 into the backbone and the backbone into area 1. Every non-backbone area must attach to area 0 through an ABR like this.','R3 is the second ABR, joining area 2 to the backbone. Both ABRs sit on area 0, so area 1 and area 2 can reach each other only through it.','Area 2 is R4\'s own area, mirroring R1. A link flap in area 2 makes only R3 and R4 recalculate; R1 just receives an updated summary.','show ip ospf counts the areas a router has interfaces in and prints "It is an area border router" when one of them is area 0 and there is at least one more. The neighbour table shows one adjacency per link, each inside its own area.','O marks a route learned inside your own area; O IA marks one that an ABR summarised from another area. R1 is not in area 0 or area 2, so everything beyond R2 is inter-area. The ping proves the summaries point the right way in both directions.'],
 checks:[['All four routers run OSPF 1 with router IDs 1.1.1.1 to 4.4.4.4',n=>['R1','R2','R3','R4'].every((r,k)=>n.devs[r].ospf&&routerId(n.devs[r])===ip2n(`${k+1}.${k+1}.${k+1}.${k+1}`))],
  ['R1 and R2 are neighbours in area 1',n=>ospfNeighbors(n,n.devs.R1).some(x=>x.dev===n.devs.R2&&x.area===1)],
  ['R2 and R3 are neighbours in area 0, and R3 and R4 in area 2',n=>ospfNeighbors(n,n.devs.R2).some(x=>x.dev===n.devs.R3&&x.area===0)&&ospfNeighbors(n,n.devs.R3).some(x=>x.dev===n.devs.R4&&x.area===2)],
  ['R2 and R3 are area border routers; R1 and R4 are not',n=>ospfIsAbr(n,n.devs.R2)&&ospfIsAbr(n,n.devs.R3)&&!ospfIsAbr(n,n.devs.R1)&&!ospfIsAbr(n,n.devs.R4)],
  ['The LAN interfaces on R1 and R4 are passive',n=>isPassive(n.devs.R1,'GigabitEthernet0/0')&&isPassive(n.devs.R4,'GigabitEthernet0/1')],
  ['R1 learns 192.168.4.0/24 as an inter-area route',n=>ospfRouteCode(n,'R1','192.168.4.0',24)==='O IA'],
  ['R2 has 192.168.1.0/24 as an intra-area route and 192.168.4.0/24 as inter-area',n=>ospfRouteCode(n,'R2','192.168.1.0',24)==='O'&&ospfRouteCode(n,'R2','192.168.4.0',24)==='O IA'],
  ['PC1 can ping PC4',n=>P(n,'PC1','192.168.4.10')]],
 solution:{R1:['enable','configure terminal','router ospf 1','router-id 1.1.1.1','network 192.168.1.0 0.0.0.255 area 1','network 10.0.12.0 0.0.0.3 area 1','passive-interface g0/0','end'],
  R2:['enable','configure terminal','router ospf 1','router-id 2.2.2.2','network 10.0.12.0 0.0.0.3 area 1','network 10.0.23.0 0.0.0.3 area 0','end','show ip ospf','show ip ospf neighbor'],
  R3:['enable','configure terminal','router ospf 1','router-id 3.3.3.3','network 10.0.23.0 0.0.0.3 area 0','network 10.0.34.0 0.0.0.3 area 2','end'],
  R4:['enable','configure terminal','router ospf 1','router-id 4.4.4.4','network 10.0.34.0 0.0.0.3 area 2','network 192.168.4.0 0.0.0.255 area 2','passive-interface g0/1','end'],PC1:['ping 192.168.4.10']}},
 ['R1: enable | configure terminal | router ospf 1 | router-id 1.1.1.1 | network 192.168.1.0 0.0.0.255 area 1 | network 10.0.12.0 0.0.0.3 area 1 | passive-interface g0/0 | end',
  'R2: enable | configure terminal | router ospf 1 | router-id 2.2.2.2 | network 10.0.12.0 0.0.0.3 area 1 | network 10.0.23.0 0.0.0.3 area 0 | end',
  'R3: enable | configure terminal | router ospf 1 | router-id 3.3.3.3 | network 10.0.23.0 0.0.0.3 area 0 | network 10.0.34.0 0.0.0.3 area 2 | end',
  'R4: enable | configure terminal | router ospf 1 | router-id 4.4.4.4 | network 10.0.34.0 0.0.0.3 area 2 | network 192.168.4.0 0.0.0.255 area 2 | passive-interface g0/1 | end',
  'R2: show ip ospf | show ip ospf neighbor',
  'R1: show ip route | # the O IA lines are the other areas, summarised by R2 ; PC1: ping 192.168.4.10']);
addIncident({title:'Incident 37: the area that lost its backbone',base:'Multi-area OSPF',start:'R1',
 brief:'After a change on R2, PC1 can still reach everything on its own side but nothing beyond R2. R3 and R4 were not touched, their links are up, and OSPF is still running everywhere. Find what moved and put the backbone back.',
 symptom:['PC1','192.168.4.10'],
 fault:{R2:[...EN,'router ospf 1','no network 10.0.23.0 0.0.0.3 area 0','network 10.0.23.0 0.0.0.3 area 1','end']},
 repair:{R2:[...EN,'router ospf 1','no network 10.0.23.0 0.0.0.3 area 1','network 10.0.23.0 0.0.0.3 area 0','end','show ip ospf neighbor'],PC1:['ping 192.168.4.10']},
 steps:['PC1: ping 192.168.4.10 | ping 10.0.12.2','R1: enable | show ip route | show ip ospf neighbor','R2: enable | show ip ospf neighbor | show ip ospf | show running-config','R2: configure terminal | router ospf 1 | no network 10.0.23.0 0.0.0.3 area 1 | network 10.0.23.0 0.0.0.3 area 0 | end | show ip ospf neighbor ; PC1: ping 192.168.4.10'],
 hints:['R1 still has its neighbour R2, but every O IA route is gone from its table. Whatever broke is between R2 and the backbone, not on R1.','show ip ospf neighbor on R2 lists R1 only, and show ip ospf says R2 now has one area and no longer calls itself an area border router. Compare the area on its R3 link with R3\'s.','R2\'s link to R3 was moved into area 1. R3 still has it in area 0, so the hello areas disagree and the adjacency never forms. Put the network statement back in area 0.'],
 lesson:'OSPF neighbours must agree on the area of the link between them. Moving one end of the backbone link into area 1 did two things at once: it broke the R2 to R3 adjacency, and it took R2 out of area 0, so it stopped being an area border router. With no ABR, area 1 had no way to learn anything beyond itself.'});
addLab({title:'Wiring a wireless LAN',group:'Fundamentals',
 brief:'A wireless LAN controller and a lightweight access point have arrived for the first floor. The radio side is set up in the controller\'s web page; your job is the wired side, which decides whether the access point can ever join. Build the management and client VLANs, give the controller a trunk and the access point an access port, route between the VLANs, and prove the join path works. The access point\'s console here only offers the host tools (ping, tracert).',
 pos:{WLC1:[110,60],SW1:[300,125],R1:[490,125],AP1:[110,190],PC1:[210,195]},start:'SW1',
 build(){const wlc=srv('WLC1','10.10.10.2',24,'10.10.10.1',[5246,5247,443,22]);wlc.hostname='WLC1';const ap=mkPC('AP1','10.10.10.5',24,'10.10.10.1');ap.hostname='AP1';
  const n=mkNet([mkRouter('R1'),mkSwitch('SW1'),wlc,ap,mkPC('PC1','10.10.10.50',24,'10.10.10.1')]);
  link(n,'WLC1','f0','SW1','g0/1');link(n,'AP1','f0','SW1','f0/1');link(n,'PC1','f0','SW1','f0/2');link(n,'SW1','g0/2','R1','g0/0');
  cfg(n,{R1:['enable','configure terminal','interface g0/0','no shutdown','end']});return n;},
 addr:[['VLAN 10 MGMT','WLC, AP and admin PC','10.10.10.0/24, gateway .1'],['VLAN 20 STAFF','Staff WLAN clients','10.10.20.0/24, gateway .1'],['VLAN 30 GUEST','Guest WLAN clients','10.10.30.0/24, gateway .1'],['WLC1','Management interface, untagged on the trunk','10.10.10.2'],['AP1','Lightweight AP, SW1 Fa0/1','10.10.10.5'],['PC1','Admin PC, SW1 Fa0/2','10.10.10.50'],['R1','G0/0 trunk to SW1 Gi0/2','router-on-a-stick']],
 tasks:['On SW1, create VLAN 10 named MGMT, VLAN 20 named STAFF and VLAN 30 named GUEST.','Make Fa0/1 (the access point) and Fa0/2 (the admin PC) access ports in VLAN 10, and enable PortFast on the access point port.','Make Gi0/1 (the controller) a trunk whose native VLAN is 10 and which allows only VLANs 10, 20 and 30.','Make Gi0/2 (to R1) a trunk that allows VLANs 10, 20 and 30.','On R1, create subinterfaces G0/0.10, G0/0.20 and G0/0.30 with 802.1Q tags 10, 20 and 30 and the gateway address .1 of each VLAN.','From AP1, ping its gateway and the controller. From PC1, open the controller\'s web page with <code>telnet 10.10.10.2 443</code>.'],
 why:['The controller tunnels every wireless client back to itself and drops the traffic into a VLAN per WLAN, so the client VLANs must exist on the switch even though no wired device sits in them. The management VLAN carries the controller, the access points and the admins.','A lightweight access point is a host on the wire: one access port in the management VLAN is all it needs, because its clients travel inside the CAPWAP tunnel to the controller. PortFast lets it come up without waiting for spanning tree.','The controller needs every WLAN\'s VLAN on one cable, so its port is a trunk. Its management interface is untagged in this design, which means the trunk\'s native VLAN must be the management VLAN; the client VLANs arrive tagged.','The router must see all three VLANs to route between them and out to the internet. Only the VLANs you allow can cross a trunk.','One subinterface per VLAN, each tagging its VLAN and holding that VLAN\'s gateway address. Clients in the staff and guest WLANs get these as their default gateway through DHCP.','An access point joins the controller over CAPWAP (UDP 5246 for control, 5247 for data). If it cannot reach the controller\'s management address it never joins, and no radio ever lights up. The web page on 443 is how the WLANs themselves are built.'],
 checks:[['VLANs 10 MGMT, 20 STAFF and 30 GUEST exist on SW1',n=>{const v=n.devs.SW1.vlans;return !!v[10]&&v[10].name==='MGMT'&&!!v[20]&&v[20].name==='STAFF'&&!!v[30]&&v[30].name==='GUEST';}],
  ['Fa0/1 (AP1) and Fa0/2 (PC1) are access ports in VLAN 10, with PortFast on the AP port',n=>['f0/1','f0/2'].every(p=>{const i=IF(n,'SW1',p);return i.mode==='access'&&i.accessVlan===10;})&&!!IF(n,'SW1','f0/1').portfast],
  ['Gi0/1 (WLC1) is a trunk, native VLAN 10, allowing only 10, 20 and 30',n=>{const i=IF(n,'SW1','g0/1');return i.mode==='trunk'&&i.native===10&&Array.isArray(i.allowed)&&i.allowed.slice().sort((a,b)=>a-b).join()==='10,20,30';}],
  ['Gi0/2 (R1) is a trunk carrying VLANs 10, 20 and 30',n=>{const i=IF(n,'SW1','g0/2');return i.mode==='trunk'&&[10,20,30].every(v=>i.allowed==='all'||i.allowed.includes(v));}],
  ['R1 has gateways .1 on subinterfaces tagged 10, 20 and 30',n=>[[10,'10.10.10.1'],[20,'10.10.20.1'],[30,'10.10.30.1']].every(([v,ip])=>{const s=Object.values(n.devs.R1.ifs).find(i=>i.name.startsWith('GigabitEthernet0/0.')&&i.dot1q===v);return !!s&&!s.shutdown&&s.ip===ip2n(ip)&&s.len===24;})],
  ['AP1 can reach its gateway and the controller',n=>P(n,'AP1','10.10.10.1')&&P(n,'AP1','10.10.10.2')],
  ['AP1 reaches the controller\'s CAPWAP ports (UDP 5246 and 5247)',n=>udpOk(n,n.devs.AP1,ip2n('10.10.10.2'),5246)&&udpOk(n,n.devs.AP1,ip2n('10.10.10.2'),5247)],
  ['PC1 can open the controller\'s web page (TCP 443)',n=>T(n,'PC1','10.10.10.2',443)]],
 solution:{SW1:['enable','configure terminal','vlan 10','name MGMT','vlan 20','name STAFF','vlan 30','name GUEST','exit','interface range f0/1 - 2','switchport mode access','switchport access vlan 10','interface f0/1','spanning-tree portfast','interface g0/1','switchport mode trunk','switchport trunk native vlan 10','switchport trunk allowed vlan 10,20,30','interface g0/2','switchport mode trunk','switchport trunk allowed vlan 10,20,30','end'],
  R1:['enable','configure terminal','interface g0/0.10','encapsulation dot1q 10','ip address 10.10.10.1 255.255.255.0','interface g0/0.20','encapsulation dot1q 20','ip address 10.10.20.1 255.255.255.0','interface g0/0.30','encapsulation dot1q 30','ip address 10.10.30.1 255.255.255.0','end'],
  AP1:['ping 10.10.10.1','ping 10.10.10.2'],PC1:['telnet 10.10.10.2 443']}},
 ['SW1: enable | configure terminal | vlan 10 | name MGMT | vlan 20 | name STAFF | vlan 30 | name GUEST | exit',
  'SW1: interface range f0/1 - 2 | switchport mode access | switchport access vlan 10 | interface f0/1 | spanning-tree portfast',
  'SW1: interface g0/1 | switchport mode trunk | switchport trunk native vlan 10 | switchport trunk allowed vlan 10,20,30',
  'SW1: interface g0/2 | switchport mode trunk | switchport trunk allowed vlan 10,20,30 | end | show interfaces trunk',
  'R1: enable | configure terminal | interface g0/0.10 | encapsulation dot1q 10 | ip address 10.10.10.1 255.255.255.0 | interface g0/0.20 | encapsulation dot1q 20 | ip address 10.10.20.1 255.255.255.0 | interface g0/0.30 | encapsulation dot1q 30 | ip address 10.10.30.1 255.255.255.0 | end',
  'AP1: ping 10.10.10.1 | ping 10.10.10.2 ; PC1: telnet 10.10.10.2 443']);

// ===== phase 5: capstones =====
// A capstone is a build lab with capstone:true in the Capstone group. It keeps full step-by-step instructions, so
// tests/labs.cjs proves it reaches a pass, but the guide switch starts off for capstones (see the capstone block in the interface).
Cn('if','encapsulation dot1q <n> native',e=>{for(const i of e.s.ctx){if(!i.name.includes('.'))return e.out(BAD);i.dot1q=e.args[0];i.nativeTag=true;}},['router']);
Object.assign(WHYC,{'encapsulation dot1q <n> native':'Makes this subinterface the native VLAN: it sends and receives untagged frames, matching the switch\'s native VLAN on the trunk.'});
function addCapstone(l,steps){l.capstone=true;l.group='Capstone';addLab(l,steps);}

// ----- capstone 1
CCNA_LAB_MAP['Capstone: branch office from scratch']=['2.1','2.2','4.1','4.6','5.3','5.6','4.8'];
addCapstone({title:'Capstone: branch office from scratch',
 brief:'A new branch needs its whole network built from factory defaults: a switch, a router and a link to the ISP. Staff and guests get separate VLANs and their addresses by DHCP, and both reach the internet through the one public address. Guests may only browse the web and must not reach anything internal. The switch is managed in its own VLAN, which is also the trunk\'s native VLAN, and the router accepts SSH only from staff. Work from the address plan; the guide is off unless you switch it on.',
 pos:{PC1:[60,60],PC2:[60,190],SW1:[190,125],R1:[330,125],ISP:[460,125],WEB:[565,125]},start:'SW1',
 build(){const n=mkNet([mkSwitch('SW1'),mkRouter('R1'),mkRouter('ISP'),mkPC('PC1',null,24),mkPC('PC2',null,24),srv('WEB','198.51.100.10',24,'198.51.100.1',[80,443])]);
  link(n,'PC1','f0','SW1','f0/1');link(n,'PC2','f0','SW1','f0/2');link(n,'SW1','g0/1','R1','g0/0');link(n,'R1','g0/1','ISP','g0/0');link(n,'ISP','g0/1','WEB','f0');
  setIp(n,'ISP','g0/0','203.0.113.1',30);setIp(n,'ISP','g0/1','198.51.100.1',24);return n;},
 addr:[['VLAN 10 STAFF','PC1 on SW1 Fa0/1','192.168.10.0/24, gateway .1'],['VLAN 20 GUEST','PC2 on SW1 Fa0/2','192.168.20.0/24, gateway .1'],['VLAN 99 MGMT (native)','R1 / SW1','192.168.99.1, 192.168.99.2 /24'],['DHCP','Both user VLANs, .1 to .9 reserved','DNS 198.51.100.53'],['R1 G0/1','To the ISP','203.0.113.2/30, next hop .1'],['SSH','user admin','secret Br4nch-Admin, domain branch.local']],
 tasks:['On SW1, create VLAN 10 <code>STAFF</code>, VLAN 20 <code>GUEST</code> and VLAN 99 <code>MGMT</code>, and put Fa0/1 in VLAN 10 and Fa0/2 in VLAN 20.','Make SW1 Gi0/1 a trunk to R1 with native VLAN 99, allowing only VLANs 10, 20 and 99. Give SW1 its management address and default gateway.','On R1, route between the three VLANs on G0/0 with subinterfaces. VLAN 99 is the native VLAN.','On R1, serve DHCP for STAFF and GUEST, reserving .1 to .9 in each.','Connect R1 to the ISP, add the default route, and translate both user VLANs to G0/1\'s address.','Guests may only browse (HTTP and HTTPS, plus DNS) and must not reach anything internal. DHCP must keep working for them.','Allow SSH to R1 only from the STAFF VLAN, with local user admin.','Renew both PCs, then test the web, the guest restrictions, management and SSH.'],
 why:['Separate VLANs keep guests out of the staff broadcast domain before any filtering happens.','A management VLAN that is also the native VLAN keeps VLAN 1 out of use. The allowed list carries only what is needed, and the switch needs a gateway to answer from other subnets.','Router-on-a-stick gives each VLAN its own gateway on one physical port. The native VLAN subinterface sends and receives untagged frames, matching the trunk.','One pool per VLAN; the router picks the pool by the subinterface the request arrives on. Reserving the first addresses keeps gateways and switches out of the pools.','One public address for the whole branch means PAT. Both user VLANs are inside; the ISP-facing interface is outside.','An extended ACL inbound on the guest subinterface filters closest to the source. DHCP discovers arrive there too, so they must be permitted explicitly, or guests lose their addresses.','SSH with individual logins replaces Telnet, and access-class keeps the login prompt away from guests entirely.','A capstone is only done when every requirement is verified, including the ones that should fail.'],
 checks:[['SW1 has VLANs 10, 20 and 99, with Fa0/1 in 10 and Fa0/2 in 20',n=>vlanIs(n,'SW1',10,'STAFF')&&vlanIs(n,'SW1',20,'GUEST')&&vlanIs(n,'SW1',99,'MGMT')&&acc(n,'SW1','f0/1',10)&&acc(n,'SW1','f0/2',20)],
  ['The trunk uses native VLAN 99 and allows only 10, 20 and 99',n=>trunk(n,'SW1','g0/1',[10,20,99])&&IF(n,'SW1','g0/1').native===99],
  ['Both PCs hold DHCP leases from R1 in their own VLAN',n=>{const a=nic(n.devs.PC1).ip,b=nic(n.devs.PC2).ip;return a!==null&&b!==null&&netOf(a,24)===ip2n('192.168.10.0')&&netOf(b,24)===ip2n('192.168.20.0')&&a>ip2n('192.168.10.9')&&b>ip2n('192.168.20.9');}],
  ['Both VLANs reach the web server through PAT',n=>T(n,'PC1','198.51.100.10',80)&&T(n,'PC2','198.51.100.10',443)&&!n.devs.ISP.statics.some(s=>netOf(ip2n('192.168.10.10'),s.len)===s.net)],
  ['Guests reach nothing internal, but still get DHCP',n=>{const a=nic(n.devs.PC1).ip;return a!==null&&!reach(n,n.devs.PC2,a).ok&&!P(n,'PC2','192.168.99.2')&&dhcpCandidates(n,n.devs.PC2).some(c=>c.S===n.devs.R1);}],
  ['PC1 can manage SW1 on 192.168.99.2',n=>P(n,'PC1','192.168.99.2')],
  ['STAFF can SSH to R1 and guests cannot',n=>T(n,'PC1','192.168.10.1',22)&&!T(n,'PC2','192.168.20.1',22)&&(n.devs.R1.lines.vty.transport||'').trim()==='ssh'],
  ['The trunk native VLAN is untagged on R1 too (G0/0.99 native)',n=>IF(n,'R1','g0/0.99').dot1q===99&&!!IF(n,'R1','g0/0.99').nativeTag&&hasIp(n,'R1','g0/0.99','192.168.99.1',24)]],
 solution:{SW1:['enable','configure terminal','vlan 10','name STAFF','vlan 20','name GUEST','vlan 99','name MGMT','interface f0/1','switchport mode access','switchport access vlan 10','interface f0/2','switchport mode access','switchport access vlan 20','interface g0/1','switchport mode trunk','switchport trunk native vlan 99','switchport trunk allowed vlan 10,20,99','interface vlan 99','ip address 192.168.99.2 255.255.255.0','no shutdown','exit','ip default-gateway 192.168.99.1','end'],
  R1:['enable','configure terminal','interface g0/0','no shutdown','interface g0/0.10','encapsulation dot1q 10','ip address 192.168.10.1 255.255.255.0','interface g0/0.20','encapsulation dot1q 20','ip address 192.168.20.1 255.255.255.0','interface g0/0.99','encapsulation dot1q 99 native','ip address 192.168.99.1 255.255.255.0','exit',
   'ip dhcp excluded-address 192.168.10.1 192.168.10.9','ip dhcp excluded-address 192.168.20.1 192.168.20.9','ip dhcp pool STAFF','network 192.168.10.0 255.255.255.0','default-router 192.168.10.1','dns-server 198.51.100.53','ip dhcp pool GUEST','network 192.168.20.0 255.255.255.0','default-router 192.168.20.1','dns-server 198.51.100.53','exit',
   'interface g0/1','ip address 203.0.113.2 255.255.255.252','no shutdown','exit','ip route 0.0.0.0 0.0.0.0 203.0.113.1','access-list 1 permit 192.168.10.0 0.0.0.255','access-list 1 permit 192.168.20.0 0.0.0.255','interface g0/0.10','ip nat inside','interface g0/0.20','ip nat inside','interface g0/1','ip nat outside','exit','ip nat inside source list 1 interface g0/1 overload',
   'ip access-list extended GUEST-IN','permit udp any any eq bootps','deny ip 192.168.20.0 0.0.0.255 192.168.0.0 0.0.255.255','permit udp 192.168.20.0 0.0.0.255 any eq domain','permit tcp 192.168.20.0 0.0.0.255 any eq www','permit tcp 192.168.20.0 0.0.0.255 any eq 443','interface g0/0.20','ip access-group GUEST-IN in','exit',
   'ip domain-name branch.local','crypto key generate rsa modulus 2048','username admin privilege 15 secret Br4nch-Admin','access-list 10 permit 192.168.10.0 0.0.0.255','line vty 0 4','login local','transport input ssh','access-class 10 in','end'],
  PC1:['ipconfig /renew'],PC2:['ipconfig /renew']}},
 ['SW1: enable | configure terminal | vlan 10 | name STAFF | vlan 20 | name GUEST | vlan 99 | name MGMT | interface f0/1 | switchport mode access | switchport access vlan 10 | interface f0/2 | switchport mode access | switchport access vlan 20',
  'SW1: interface g0/1 | switchport mode trunk | switchport trunk native vlan 99 | switchport trunk allowed vlan 10,20,99 | interface vlan 99 | ip address 192.168.99.2 255.255.255.0 | no shutdown | exit | ip default-gateway 192.168.99.1 | end',
  'R1: enable | configure terminal | interface g0/0 | no shutdown | interface g0/0.10 | encapsulation dot1q 10 | ip address 192.168.10.1 255.255.255.0 | interface g0/0.20 | encapsulation dot1q 20 | ip address 192.168.20.1 255.255.255.0 | interface g0/0.99 | encapsulation dot1q 99 native | ip address 192.168.99.1 255.255.255.0 | exit',
  'R1: ip dhcp excluded-address 192.168.10.1 192.168.10.9 | ip dhcp excluded-address 192.168.20.1 192.168.20.9 | ip dhcp pool STAFF | network 192.168.10.0 255.255.255.0 | default-router 192.168.10.1 | dns-server 198.51.100.53 | ip dhcp pool GUEST | network 192.168.20.0 255.255.255.0 | default-router 192.168.20.1 | dns-server 198.51.100.53 | exit',
  'R1: interface g0/1 | ip address 203.0.113.2 255.255.255.252 | no shutdown | exit | ip route 0.0.0.0 0.0.0.0 203.0.113.1 | access-list 1 permit 192.168.10.0 0.0.0.255 | access-list 1 permit 192.168.20.0 0.0.0.255 | interface g0/0.10 | ip nat inside | interface g0/0.20 | ip nat inside | interface g0/1 | ip nat outside | exit | ip nat inside source list 1 interface g0/1 overload',
  'R1: ip access-list extended GUEST-IN | # DHCP discovers come in here too | permit udp any any eq bootps | deny ip 192.168.20.0 0.0.0.255 192.168.0.0 0.0.255.255 | permit udp 192.168.20.0 0.0.0.255 any eq domain | permit tcp 192.168.20.0 0.0.0.255 any eq www | permit tcp 192.168.20.0 0.0.0.255 any eq 443 | interface g0/0.20 | ip access-group GUEST-IN in | exit',
  'R1: ip domain-name branch.local | crypto key generate rsa modulus 2048 | username admin privilege 15 secret Br4nch-Admin | access-list 10 permit 192.168.10.0 0.0.0.255 | line vty 0 4 | login local | transport input ssh | access-class 10 in | end',
  'PC1: ipconfig /renew | telnet 198.51.100.10 80 | ping 192.168.99.2 | ssh -l admin 192.168.10.1 | yes | Br4nch-Admin | exit ; PC2: ipconfig /renew | telnet 198.51.100.10 443 | # blocked: guests reach nothing internal | ping 192.168.99.2']);

// ----- capstone 2
CCNA_LAB_MAP['Capstone: campus core']=['2.1','2.4','2.5','3.4','4.6','5.7'];
addCapstone({title:'Capstone: campus core',
 brief:'Build the core of a small campus. A Catalyst 3560 routes for two user VLANs and is joined to the access switch by an LACP bundle; it is also the spanning-tree root. It runs OSPF with the edge router, which hosts the DHCP server and the server LAN, and relays DHCP for both VLANs. The user ports allow one device each. Work from the address plan; the guide is off unless you switch it on.',
 pos:{ASW1:[130,110],PC1:[60,195],PC2:[200,195],DSW1:[320,110],R1:[475,55],SRV1:[560,175]},start:'DSW1',
 build(){const n=mkNet([mkL3Switch('DSW1'),mkSwitch('ASW1'),mkRouter('R1'),mkPC('PC1',null,24),mkPC('PC2',null,24),srv('SRV1','10.10.10.10',24,'10.10.10.1',[80])]);
  link(n,'ASW1','g0/1','DSW1','g0/1');link(n,'ASW1','g0/2','DSW1','g0/2');link(n,'ASW1','f0/1','PC1','f0');link(n,'ASW1','f0/2','PC2','f0');link(n,'DSW1','f0/24','R1','g0/0');link(n,'R1','g0/1','SRV1','f0');
  setIp(n,'R1','g0/1','10.10.10.1',24);return n;},
 addr:[['VLAN 10 STAFF','PC1 on ASW1 Fa0/1','192.168.10.0/24, gateway .1 on DSW1'],['VLAN 20 LAB','PC2 on ASW1 Fa0/2','192.168.20.0/24, gateway .1 on DSW1'],['DSW1 Fa0/24 / R1 G0/0','Routed link','10.0.0.1, 10.0.0.2 /30'],['R1 G0/1','Server LAN, SRV1 .10','10.10.10.1/24'],['OSPF','Process 1, area 0','DSW1 1.1.1.1, R1 2.2.2.2'],['DHCP','On R1, .1 to .9 reserved','relayed by DSW1']],
 tasks:['On both switches, create VLAN 10 <code>STAFF</code> and VLAN 20 <code>LAB</code>. On ASW1, put Fa0/1 in VLAN 10 and Fa0/2 in VLAN 20, each allowing one sticky MAC address.','Bundle the two links between ASW1 and DSW1 into port-channel 1 with LACP, and make it a trunk.','Run Rapid PVST+ on both switches and make DSW1 the primary root for VLANs 10 and 20.','On DSW1, turn on routing and create the gateways for both VLANs.','Make DSW1 Fa0/24 a routed link to R1 (10.0.0.1/30), and address R1 G0/0 (10.0.0.2/30).','Run OSPF area 0 on DSW1 and R1 for every network, with the router IDs from the plan. Keep hellos off the user VLANs and the server LAN.','On R1, create DHCP pools for both VLANs; on DSW1, relay DHCP from both VLAN interfaces to R1.','Renew both PCs and reach SRV1 from both.'],
 why:['The user VLANs must exist on both switches. Port security with one sticky address per port stops anyone adding a switch or a second device at a desk.','Two links in an LACP bundle give double the bandwidth and survive one failure, without spanning tree blocking either. The 3560 needs the trunk encapsulation set before it will trunk.','Make the core switch root on purpose, so every access switch\'s path points at it.','The 3560 is the default gateway for both VLANs and routes between them itself.','A routed port is a point-to-point Layer 3 link: no VLAN, no spanning tree, just two addresses.','OSPF lets R1 learn the user subnets and DSW1 learn the server LAN without static routes. Passive interfaces keep advertising those networks but send no hellos where no router should ever answer.','The DHCP server is on another subnet, so the gateway for each VLAN has to relay the broadcast to it. R1 picks the pool from the relay address.','A capstone is done when every requirement is verified end to end.'],
 checks:[['Both VLANs exist on both switches and ASW1\'s user ports allow one sticky address',n=>['DSW1','ASW1'].every(s=>vlanIs(n,s,10,'STAFF')&&vlanIs(n,s,20,'LAB'))&&acc(n,'ASW1','f0/1',10)&&acc(n,'ASW1','f0/2',20)&&['f0/1','f0/2'].every(p=>{const P=IF(n,'ASW1',p).ps;return !!P&&P.on&&P.sticky&&P.max===1;})],
  ['Port-channel 1 is an LACP bundle trunking on both switches',n=>['DSW1','ASW1'].every(s=>['g0/1','g0/2'].every(p=>bundled(n,n.devs[s],IF(n,s,p)))&&IF(n,s,'po1').mode==='trunk'&&['active','passive'].includes(IF(n,s,'g0/1').chanMode))],
  ['DSW1 is the Rapid PVST+ root for VLANs 10 and 20',n=>['DSW1','ASW1'].every(s=>n.devs[s].stp&&n.devs[s].stp.mode==='rapid-pvst')&&stpCalc(n,10).root===n.devs.DSW1&&stpCalc(n,20).root===n.devs.DSW1],
  ['DSW1 routes for both VLANs',n=>!!n.devs.DSW1.ipRouting&&hasIp(n,'DSW1','vlan10','192.168.10.1',24)&&hasIp(n,'DSW1','vlan20','192.168.20.1',24)&&!!IF(n,'DSW1','f0/24').routed],
  ['DSW1 and R1 are OSPF neighbors and R1 learns both user subnets',n=>ospfNeighbors(n,n.devs.R1).some(x=>x.dev===n.devs.DSW1)&&['192.168.10.0','192.168.20.0'].every(a=>ospfRoutes(n,n.devs.R1).some(o=>o.net===ip2n(a)&&o.len===24))&&routerId(n.devs.DSW1)===ip2n('1.1.1.1')&&routerId(n.devs.R1)===ip2n('2.2.2.2')],
  ['No OSPF hellos toward users or servers',n=>isPassive(n.devs.DSW1,'Vlan10')&&isPassive(n.devs.DSW1,'Vlan20')&&isPassive(n.devs.R1,'GigabitEthernet0/1')],
  ['Both PCs hold leases relayed by DSW1, with DSW1 as gateway',n=>[['PC1','192.168.10.'],['PC2','192.168.20.']].every(([p,pre])=>{const ip=nic(n.devs[p]).ip;return ip!==null&&ip>ip2n(pre+'9')&&ip<ip2n(pre+'255')&&n.devs[p].gw===ip2n(pre+'1');})],
  ['Both PCs reach SRV1',n=>P(n,'PC1','10.10.10.10')&&P(n,'PC2','10.10.10.10')]],
 solution:{ASW1:['enable','configure terminal','vlan 10','name STAFF','vlan 20','name LAB','interface f0/1','switchport mode access','switchport access vlan 10','switchport port-security','switchport port-security mac-address sticky','interface f0/2','switchport mode access','switchport access vlan 20','switchport port-security','switchport port-security mac-address sticky','interface range g0/1 - 2','channel-group 1 mode active','interface port-channel 1','switchport mode trunk','exit','spanning-tree mode rapid-pvst','end'],
  DSW1:['enable','configure terminal','vlan 10','name STAFF','vlan 20','name LAB','interface range g0/1 - 2','channel-group 1 mode active','interface port-channel 1','switchport trunk encapsulation dot1q','switchport mode trunk','exit','spanning-tree mode rapid-pvst','spanning-tree vlan 10,20 root primary',
   'ip routing','interface vlan 10','ip address 192.168.10.1 255.255.255.0','ip helper-address 10.0.0.2','no shutdown','interface vlan 20','ip address 192.168.20.1 255.255.255.0','ip helper-address 10.0.0.2','no shutdown','interface f0/24','no switchport','ip address 10.0.0.1 255.255.255.252','exit',
   'router ospf 1','router-id 1.1.1.1','network 192.168.10.0 0.0.0.255 area 0','network 192.168.20.0 0.0.0.255 area 0','network 10.0.0.0 0.0.0.3 area 0','passive-interface vlan 10','passive-interface vlan 20','end'],
  R1:['enable','configure terminal','interface g0/0','ip address 10.0.0.2 255.255.255.252','no shutdown','exit','router ospf 1','router-id 2.2.2.2','network 10.0.0.0 0.0.0.3 area 0','network 10.10.10.0 0.0.0.255 area 0','passive-interface g0/1','exit',
   'ip dhcp excluded-address 192.168.10.1 192.168.10.9','ip dhcp excluded-address 192.168.20.1 192.168.20.9','ip dhcp pool STAFF','network 192.168.10.0 255.255.255.0','default-router 192.168.10.1','ip dhcp pool LAB','network 192.168.20.0 255.255.255.0','default-router 192.168.20.1','end'],
  PC1:['ipconfig /renew'],PC2:['ipconfig /renew']}},
 ['ASW1: enable | configure terminal | vlan 10 | name STAFF | vlan 20 | name LAB | interface f0/1 | switchport mode access | switchport access vlan 10 | switchport port-security | switchport port-security mac-address sticky | interface f0/2 | switchport mode access | switchport access vlan 20 | switchport port-security | switchport port-security mac-address sticky ; DSW1: enable | configure terminal | vlan 10 | name STAFF | vlan 20 | name LAB',
  'ASW1: interface range g0/1 - 2 | channel-group 1 mode active | interface port-channel 1 | switchport mode trunk | exit ; DSW1: interface range g0/1 - 2 | channel-group 1 mode active | interface port-channel 1 | switchport trunk encapsulation dot1q | switchport mode trunk | exit',
  'ASW1: spanning-tree mode rapid-pvst | end ; DSW1: spanning-tree mode rapid-pvst | spanning-tree vlan 10,20 root primary',
  'DSW1: ip routing | interface vlan 10 | ip address 192.168.10.1 255.255.255.0 | no shutdown | interface vlan 20 | ip address 192.168.20.1 255.255.255.0 | no shutdown',
  'DSW1: interface f0/24 | no switchport | ip address 10.0.0.1 255.255.255.252 | exit ; R1: enable | configure terminal | interface g0/0 | ip address 10.0.0.2 255.255.255.252 | no shutdown | exit',
  'DSW1: router ospf 1 | router-id 1.1.1.1 | network 192.168.10.0 0.0.0.255 area 0 | network 192.168.20.0 0.0.0.255 area 0 | network 10.0.0.0 0.0.0.3 area 0 | passive-interface vlan 10 | passive-interface vlan 20 | exit ; R1: router ospf 1 | router-id 2.2.2.2 | network 10.0.0.0 0.0.0.3 area 0 | network 10.10.10.0 0.0.0.255 area 0 | passive-interface g0/1 | exit',
  'R1: ip dhcp excluded-address 192.168.10.1 192.168.10.9 | ip dhcp excluded-address 192.168.20.1 192.168.20.9 | ip dhcp pool STAFF | network 192.168.10.0 255.255.255.0 | default-router 192.168.10.1 | ip dhcp pool LAB | network 192.168.20.0 255.255.255.0 | default-router 192.168.20.1 | end ; DSW1: interface vlan 10 | ip helper-address 10.0.0.2 | interface vlan 20 | ip helper-address 10.0.0.2 | end',
  'PC1: ipconfig /renew | ping 10.10.10.10 ; PC2: ipconfig /renew | ping 10.10.10.10 ; DSW1: show etherchannel summary | show ip ospf neighbor']);
//LIBRARY-END
