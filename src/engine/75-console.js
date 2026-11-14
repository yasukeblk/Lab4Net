// ---------- console realism: parser errors, output filters, everyday commands ----------
// run() (near the command table) calls these. Errors follow IOS: a ^ under the first token nothing accepts,
// "% Incomplete command." when more is needed, "% Ambiguous command:" when an abbreviation fits two keywords,
// and in exec mode a single unknown word is looked up as a hostname ("Translating ..."), which is why
// "no ip domain-lookup" is taught. PCs answer like Windows.
// A token that is exactly a keyword never counts as an abbreviation of a longer one ("ip" is not "ipv6").
function shadowed(d,mode,pat,toks){for(let i=0;i<toks.length&&i<pat.length;i++){const p=pat[i];if(p[0]==='<')continue;const t=toks[i].toLowerCase();if(p===t)continue;
    if(patsFor(d,mode).some(q=>q[i]===t&&depthOf(q,toks.slice(0,i))>=i))return true;}return false;}
function patsFor(d,mode){return CMDS.filter(c=>c.modes.includes(mode)&&(!c.types||c.types.includes(d.type))).map(c=>c.pat);}
function depthOf(pat,toks){let j=0;for(;j<toks.length;j++){const p=pat[j];if(p===undefined)return j;if(p.startsWith('<rest'))return toks.length;const t=toks[j];
  if(p==='<ip>'){if(!isIp(t))return j;}else if(p==='<ip6>'){if(parse6(t)===null)return j;}else if(p==='<n>'){if(!/^\d+$/.test(t))return j;}else if(p!=='<w>'&&!p.startsWith(t.toLowerCase()))return j;}return j;}
function ambiguousAt(d,mode,toks){const P=patsFor(d,mode);
  for(let i=0;i<toks.length;i++){const t=toks[i].toLowerCase();let exact=false,set=new Set();
    for(const pat of P){if(depthOf(pat,toks.slice(0,i))<i)continue;const p=pat[i];if(!p||p[0]==='<')continue;if(p===t)exact=true;else if(p.startsWith(t))set.add(p);}
    // aliases such as run / running-config count as one keyword
    const ks=[...set].filter(k=>![...set].some(o=>o!==k&&o.startsWith(k)));if(!exact&&ks.length>1)return i;}
  return -1;}
function badIndex(d,mode,toks){const modes=[mode];if(!['config','user','priv','pc'].includes(mode))modes.push('config');let best=0;
  for(const m of modes)for(const pat of patsFor(d,m))best=Math.max(best,depthOf(pat,toks));return Math.min(best,toks.length-1);}
function caretCol(env,line,ch){const base=Math.max(0,(env.raw||line).indexOf(line));return ' '.repeat((env.p0||0)+base+ch)+'^';}
function caretAt(env,line,ti){const re=/\S+/g;let m,k=0;while((m=re.exec(line))){if(k===ti)return caretCol(env,line,m.index);k++;}return caretCol(env,line,line.length);}
// Handlers that reject a value emit BAD themselves; put the ^ under the last word, as IOS would for a bad value.
function withCaret(env,line,toks,fn){const o=env.out;let prev='';env.out=(...x)=>{for(const l of x){if(l===BAD&&!/^\s*\^$/.test(prev))o(caretAt(env,line,toks.length-1));o(l);prev=l;}};try{fn();}finally{env.out=o;}}
const WIN_USAGE={ping:['','Usage: ping [-t] [-a] [-n count] [-l size] [-f] [-i TTL] [-v TOS]','            [-r count] [-s count] [[-j host-list] | [-k host-list]]','            [-w timeout] [-R] [-S srcaddr] [-c compartment] [-p]','            [-4] [-6] target_name',''],
  tracert:['','Usage: tracert [-d] [-h maximum_hops] [-j host-list] [-w timeout]','               [-R] [-S srcaddr] [-4] [-6] target_name','']};
function parseFail(env,line,toks,mode,partial){const d=env.d,k=toks[0].toLowerCase();
  if(mode==='pc'){const known=patsFor(d,'pc').some(p=>p[0].startsWith(k));
    if(!known)return env.out("'"+toks[0]+"' is not recognized as an internal or external command,",'operable program or batch file.');
    const cmd=['ping','tracert'].find(c=>c.startsWith(k)&&k.length>1);return env.out(...(cmd?WIN_USAGE[cmd]:['Error: unrecognized or incomplete command line.']));}
  if(partial)return env.out('% Incomplete command.');
  if((mode==='user'||mode==='priv')&&toks.length===1&&!patsFor(d,mode).some(p=>p[0][0]!=='<'&&p[0].startsWith(k)))return hostLookup(env,toks[0],mode);
  env.out(caretAt(env,line,badIndex(d,mode,toks)),BAD);}
// exec mode: an unknown single word is treated as a host to telnet to
function hostLookup(env,name,mode){const d=env.d,ip=(d.hosts||{})[name.toLowerCase()];if(ip!=null)return run(env,'telnet '+n2ip(ip),mode);
  const L=d.noLookup?['Translating "'+name+'"']:['Translating "'+name+'"...domain server ('+(d.nameServer!=null?n2ip(d.nameServer):'255.255.255.255')+')'];
  L.push('% Unknown command or computer name, or unable to find computer address');env.out(...L);env.s.pace={t:[0,d.noLookup?150:5000],abort:()=>[]};}
function resolveHost(env,name){const d=env.d,ip=(d.hosts||{})[name.toLowerCase()];if(ip!=null)return ip;
  env.out(...(d.noLookup?[]:['Translating "'+name+'"...domain server ('+(d.nameServer!=null?n2ip(d.nameServer):'255.255.255.255')+')']),'% Unrecognized host or address, or protocol not running.');
  if(!d.noLookup)env.s.pace={t:[0,5000],abort:()=>[]};return null;}
// Output modifiers: show ... | include / exclude / begin / section / count <regex>
function pipeRun(env,line,mode){const i=line.indexOf('|'),left=line.slice(0,i).trim(),spec=line.slice(i+1).trim();
  if(!left||!/^(do\s+)?sh/i.test(left))return env.out(caretCol(env,line,i),BAD);
  if(!spec)return env.out('% Incomplete command.');
  const w=spec.split(/\s+/)[0],ops=['begin','count','exclude','include','section'].filter(o=>o.startsWith(w.toLowerCase()));
  if(ops.length!==1)return env.out(caretCol(env,line,line.indexOf(w,i)),BAD);
  const rx=spec.slice(w.length).trim();if(!rx)return env.out('% Incomplete command.');
  let re;try{re=new RegExp(rx);}catch(x){re=new RegExp(rx.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));}
  const buf=[],o=env.out;env.out=(...x)=>buf.push(...x);try{run(env,left,mode);}finally{env.out=o;}env.s.pace=null;
  let L=buf.join('\n').split('\n');if(L.some(l=>/^% (Invalid|Incomplete|Ambiguous)/.test(l)))return env.out(...L);
  if(ops[0]==='include')L=L.filter(l=>re.test(l));else if(ops[0]==='exclude')L=L.filter(l=>!re.test(l));
  else if(ops[0]==='begin'){const k=L.findIndex(l=>re.test(l));L=k<0?[]:L.slice(k);}
  else if(ops[0]==='section'){const R=[];for(let k=0;k<L.length;k++){if(!/^\s/.test(L[k])&&re.test(L[k])){R.push(L[k]);while(k+1<L.length&&/^\s/.test(L[k+1]))R.push(L[++k]);}else if(/^\s/.test(L[k])&&re.test(L[k]))R.push(L[k]);}L=R;}
  else L=['Number of lines which match regexp = '+L.filter(l=>re.test(l)).length];
  if(L.length)env.out(...L);}
// Short help for ? (IOS-style wording, kept brief)
const KWHELP={access:'Set access mode characteristics of the interface','access-class':'Filter connections based on an IP access list','access-group':'Specify access control for packets','access-list':'Add an access list entry','access-lists':'List access lists',address:'Set the IP address of an interface',allowed:'Set allowed VLAN characteristics when interface is in trunking mode',area:'Set the OSPF area ID',arp:'Show or clear the ARP table','arp-cache':'Clear the entire ARP cache',banner:'Define a login banner',bandwidth:'Set bandwidth informational parameter',begin:'Begin with the line that matches',binding:'DHCP address bindings',bpduguard:'Don\'t accept BPDUs on this interface',brief:'Brief summary',cdp:'CDP information',clear:'Reset functions',clock:'Manage the system clock',configure:'Enter configuration mode',copy:'Copy from one file to another',count:'Count number of lines which match regexp',crypto:'Encryption module',debug:'Debugging functions',default:'Set a command to its defaults','default-gateway':'Specify default gateway (if not routing IP)','default-router':'Default routers',deny:'Specify packets to reject',description:'Interface specific description',detail:'Detailed information',dhcp:'Configure DHCP server and relay parameters',disable:'Turn off privileged commands','dns-server':'DNS servers',do:'To run exec commands in config mode','domain-lookup':'Enable IP Domain Name System hostname translation','domain-name':'Define the default domain name',dot1q:'IEEE 802.1Q Virtual LAN',duplex:'Configure duplex operation',enable:'Turn on privileged commands / modify enable password parameters',encapsulation:'Set encapsulation type for an interface',end:'Exit from configure mode',etherchannel:'EtherChannel information','exec-timeout':'Set the EXEC timeout',exclude:'Exclude lines that match','excluded-address':'Prevent DHCP from assigning certain addresses',exit:'Exit from the current mode',host:'Add an entry to the ip hostname table',hostname:'Set system\'s network name',hosts:'IP domain-name, lookup style, nameservers, and host table',icmp:'ICMP transactions',id:'VTP VLAN status by VLAN id',include:'Include lines that match',interface:'Select an interface to configure',interfaces:'Interface status and configuration',ip:'Global IP configuration subcommands',ipconfig:'Display or change IP settings',ipv6:'Global IPv6 configuration subcommands',lease:'Address lease time',length:'Set number of lines on a screen',line:'Configure a terminal line',lldp:'Global LLDP configuration',logging:'Modify message logging facilities',login:'Enable password checking','min-length':'Minimum length of passwords',mode:'Set mode',monitor:'Copy debug output to the current terminal line',motd:'Set Message of the Day banner',name:'Ascii name of the VLAN','name-server':'Specify address of name server to use',nat:'NAT configuration',native:'Set native VLAN when interface is in trunking mode',neighbor:'Neighbor list',neighbors:'CDP neighbor entries',netstat:'Display protocol statistics and connections',network:'Network number and mask',no:'Negate a command or set its defaults',ntp:'Configure NTP',ospf:'OSPF information','passive-interface':'Suppress routing updates on an interface',password:'Set a password','password-encryption':'Encrypt system passwords',permit:'Specify packets to forward',ping:'Send echo messages',pool:'Configure DHCP address pools','port-security':'Security related command',portfast:'Portfast options for the interface',priority:'Set priority',range:'interface range command',remark:'Access list entry comment',root:'Configure switch as root',route:'Establish static routes',router:'Enable a routing process','router-id':'router-id for this OSPF process',routing:'Enable IP routing',run:'Current operating configuration','running-config':'Current operating configuration',secret:'Assign the privileged level secret',section:'Filter a section of output',security:'Infra Security CLIs',service:'Modify use of network based services',show:'Show running system information',shutdown:'Shutdown the selected interface',snooping:'DHCP Snooping',speed:'Configure speed operation','spanning-tree':'Spanning Tree Subsystem',ssh:'Open a secure shell client connection',standby:'HSRP interface configuration',static:'Static routes','startup-config':'Contents of startup configuration',summary:'Summary',switchport:'Set switching mode characteristics',telnet:'Open a telnet connection',terminal:'Set terminal line parameters',timestamps:'Timestamp debug/log messages',traceroute:'Trace route to destination',tracert:'Trace the route to a destination',translations:'Translation entries',transport:'Define transport protocols for line',trunk:'Set trunking characteristics of the interface',undebug:'Disable debugging functions (see also \'debug\')',username:'Establish User Name Authentication',version:'System hardware and software status',violation:'Security violation mode',vlan:'VLAN commands',vty:'Virtual terminal',write:'Write running configuration to memory, network, or terminal','|':'Output modifiers','<cr>':'',
  'A.B.C.D':'IP address or mask','WORD':'Name, value or password','LINE':'Text to the end of the line','<number>':'Number'};
// ---- everyday commands ----
const VER={router:{sw:'C2900 Software (C2900-UNIVERSALK9-M), Version 15.2(4)M7, RELEASE SOFTWARE (fc2)',img:'flash0:c2900-universalk9-mz.SPA.152-4.M7.bin',hw:'cisco CISCO2911/K9 (revision 1.0) with 491520K/32768K bytes of memory.',reg:'0x2102'},
  switch:{sw:'C2960 Software (C2960-LANBASEK9-M), Version 15.0(2)SE11, RELEASE SOFTWARE (fc3)',img:'flash:/c2960-lanbasek9-mz.150-2.SE11.bin',hw:'cisco WS-C2960-24TT-L (PowerPC405) processor (revision B0) with 65536K bytes of memory.',reg:'0xF',model:'WS-C2960-24TT-L'},
  l3:{sw:'C3560 Software (C3560-IPSERVICESK9-M), Version 15.0(2)SE11, RELEASE SOFTWARE (fc3)',img:'flash:/c3560-ipservicesk9-mz.150-2.SE11.bin',hw:'cisco WS-C3560-24PS (PowerPC405) processor (revision P0) with 131072K bytes of memory.',reg:'0xF',model:'WS-C3560-24PS-S'}};
function uptimeStr(net){net.boot=net.boot||Date.now();const m=Math.floor((Date.now()-net.boot)/60000),h=Math.floor(m/60);return (h?h+' hour'+(h>1?'s':'')+', ':'')+(m%60)+' minute'+(m%60===1?'':'s');}
Cn(EX,'show version',e=>{const d=e.d,V=VER[d.type==='router'?'router':d.l3?'l3':'switch'],phys=Object.keys(d.ifs).filter(n=>!/^(Vlan|Loopback|Port-channel)|\./.test(n));
  const cnt=p=>phys.filter(n=>n.startsWith(p)).length,mac=macOf(d).replace(/\./g,'').toUpperCase().replace(/(..)(?=.)/g,'$1:');
  e.out('Cisco IOS Software, '+V.sw,'Technical Support: http://www.cisco.com/techsupport','Copyright (c) 1986-2015 by Cisco Systems, Inc.','','ROM: Bootstrap program is '+(d.type==='router'?'C2900':'C2960')+' boot loader','',
    d.hostname+' uptime is '+uptimeStr(e.net),'System returned to ROM by power-on','System image file is "'+V.img+'"','',V.hw,'Processor board ID FTX18'+(macOf(d).slice(-5).replace('.','')).toUpperCase(),
    ...(cnt('Fast')?[cnt('Fast')+' FastEthernet interfaces']:[]),...(cnt('Gigabit')?[cnt('Gigabit')+' Gigabit Ethernet interfaces']:[]),'',
    ...(d.type==='switch'?['Base ethernet MAC Address       : '+mac,'Model number                    : '+V.model,'']:['255K bytes of non-volatile configuration memory.','']),'Configuration register is '+V.reg);},['router','switch']);
Cn(EX,'show vlan id <n>',e=>{const buf=[],o=e.out;e.out=(...x)=>buf.push(...x);showVlan(e);e.out=o;const L=buf.join('\n').split('\n'),id=String(e.args[0]);
  const rows=L.filter(l=>l.split(/\s+/)[0]===id);if(!rows.length)return e.out('VLAN id '+id+' not found in current VLAN database');e.out(L[0],L[1],...rows);},['switch']);
Cn('priv','show running-config interface <rest>',e=>{const n=parseIf(e.args[0]);if(!n||!e.d.ifs[n])return e.out(BAD);const L=runningConfig(e.net,e.d),k=L.indexOf('interface '+n);if(k<0)return e.out(BAD);
  const blk=[L[k]];for(let j=k+1;j<L.length&&L[j]!=='!';j++)blk.push(L[j]);const bytes=blk.join('\n').length+2;
  e.out('Building configuration...','','Current configuration : '+bytes+' bytes','!',...blk,'end');});
Cn(EX,'show interfaces description',e=>{const{d,net}=e;e.out('Interface                      Status         Protocol Description');
  for(const n of sortIfs(Object.keys(d.ifs))){const i=d.ifs[n],up=ifUp(net,d,i),st=i.shutdown?'admin down':up?'up':'down';e.out(shortIf(n).padEnd(31)+st.padEnd(15)+(up?'up':'down').padEnd(9)+(i.desc||''));}},['router','switch'],true);
// duplex / speed / bandwidth: stored, shown in show interfaces and the running-config; bandwidth feeds the OSPF cost.
const physIf=i=>/^(Gigabit|Fast)Ethernet/.test(i.name)&&!i.name.includes('.');
Cn('if','duplex <w>',e=>{const v=['auto','full','half'].find(x=>x.startsWith(e.args[0].toLowerCase()));if(!v||!e.s.ctx.every(physIf))return e.out(BAD);e.s.ctx.forEach(i=>{i.duplex=v==='auto'?null:v;});},['router','switch']);
Cn('if','speed <w>',e=>{const w=e.args[0].toLowerCase(),v=w==='auto'||'auto'.startsWith(w)&&w.length>1?'auto':w;
  if(!e.s.ctx.every(i=>physIf(i)&&(v==='auto'||['10','100'].includes(v)||(v==='1000'&&i.name.startsWith('Gigabit')))))return e.out(BAD);e.s.ctx.forEach(i=>{i.speed=v==='auto'?null:v;});},['router','switch']);
Cn('if','bandwidth <n>',e=>{const v=e.args[0];if(v<1||v>10000000)return e.out(BAD);e.s.ctx.forEach(i=>{i.bw=v;});},['router','switch']);
Cn('if','no duplex',e=>{e.s.ctx.forEach(i=>{i.duplex=null;});},['router','switch']);
Cn('if','no speed',e=>{e.s.ctx.forEach(i=>{i.speed=null;});},['router','switch']);
Cn('if','no bandwidth <rest?>',e=>{e.s.ctx.forEach(i=>{i.bw=null;});},['router','switch']);
{const oc0=ospfCost;ospfCost=function(d,i){const bw=i.bw||(i.speed?+i.speed*1000:0);if(i.ospfCost!=null||!bw)return oc0(d,i);const ref=((d.ospf&&d.ospf.refBw)||100)*1000;return Math.max(1,Math.floor(ref/bw));};}
const bwOf=i=>i.bw||(i.speed?+i.speed*1000:0)||(i.name.startsWith('Fast')?100000:i.name.startsWith('Loopback')?8000000:i.name.startsWith('Serial')?1544:1000000);
// show interfaces: add the hardware, MTU/bandwidth and duplex/speed lines real IOS prints
{const c=CMDS.find(c=>c.pat.join(' ')==='show interfaces <rest?>'),f0=c.fn;c.fn=e=>{const buf=[],o=e.out;e.out=(...x)=>buf.push(...x);try{f0(e);}finally{e.out=o;}
  const {d,net}=e,L=buf.join('\n').split('\n'),R=[];let cur=null;
  const tail=i=>{if(!i)return [];const lo=i.name.startsWith('Loopback'),svi=i.name.startsWith('Vlan'),sub=i.name.includes('.'),up=ifUp(net,d,i);
    const T=['  MTU '+(lo?1514:1500)+' bytes, BW '+bwOf(i)+' Kbit/sec, DLY '+(lo?5000:i.name.startsWith('Fast')?100:10)+' usec,','     reliability 255/255, txload 1/255, rxload 1/255',
      '  Encapsulation '+(sub&&i.dot1q!=null?'802.1Q Virtual LAN, Vlan ID  '+i.dot1q+'.':'ARPA, loopback not set'),'  Keepalive set (10 sec)'];
    if(physIf(i)){const st=linkSettle(net,d,i),sp=st.speed,dx=st.duplex==='half'?'Half':'Full';
      const media=d.type==='router'?'RJ45':i.name.startsWith('Gig')?'10/100/1000BaseTX':'10/100BaseTX';
      T.push(!up?'  Auto-duplex, Auto-speed, media type is '+media:d.type==='router'?'  '+dx+' Duplex, '+(sp==='1000'?'1Gbps':sp+'Mbps')+', media type is RJ45':'  '+dx+'-duplex, '+sp+'Mb/s, media type is '+media);T.push(...cntLines(i));}
    else if(svi||lo)void 0;return T;};
  for(const l of L){const m=/^(\S+) is (up|down|administratively down), line protocol is/.exec(l);
    if(m){R.push(...tail(cur));cur=d.ifs[m[1]];R.push(l);if(cur){const lo=cur.name.startsWith('Loopback'),svi=cur.name.startsWith('Vlan');
      R.push('  Hardware is '+(lo?'Loopback':svi?'EtherSVI, address is '+macOf(d)+' (bia '+macOf(d)+')':(cur.name.startsWith('Fast')?'Fast Ethernet':'iGbE')+', address is '+macTx(null,d,cur)+' (bia '+macTx(null,d,cur)+')'));
      if(cur.desc&&!L.some(x=>x.trim()==='Description: '+cur.desc))R.push('  Description: '+cur.desc);}continue;}
    R.push(l);}
  R.push(...tail(cur));e.out(...R);};}
Cn(EX,'terminal length <n>',e=>{});Cn(EX,'terminal width <n>',e=>{});Cn(EX,'terminal monitor',e=>{e.s.termMon=true;});Cn(EX,'terminal no monitor',e=>{e.s.termMon=false;});
// host table and name servers
Cn('config','ip host <w> <ip>',e=>{(e.d.hosts=e.d.hosts||{})[e.args[0].toLowerCase()]=e.args[1];(e.d.hostNames=e.d.hostNames||{})[e.args[0].toLowerCase()]=e.args[0];},['router','switch']);
Cn('config','no ip host <w> <rest?>',e=>{if(e.d.hosts)delete e.d.hosts[e.args[0].toLowerCase()];},['router','switch']);
Cn('config','ip name-server <ip>',e=>{e.d.nameServer=e.args[0];},['router','switch']);
Cn('config','no ip name-server <rest?>',e=>{e.d.nameServer=null;},['router','switch']);
Cn(EX,'show hosts',e=>{const d=e.d,H=d.hosts||{};e.out('Default domain is '+(d.domain||'not set'),'Name/address lookup uses '+(d.noLookup?'static mappings':'domain service'),'Name servers are '+(d.nameServer!=null?n2ip(d.nameServer):'255.255.255.255'),'','Codes: UN - unknown, EX - expired, OK - OK, ?? - revalidate','       temp - temporary, perm - permanent','       NA - Not Applicable None - Not defined','','Host                      Port  Flags      Age Type   Address(es)',
  ...Object.keys(H).sort().map(k=>((d.hostNames||{})[k]||k).padEnd(26)+'None  (perm, OK)  0   IP     '+n2ip(H[k])));},['router','switch']);
Cn(EX,'ping <w>',e=>{const ip=resolveHost(e,e.args[0]);if(ip!=null)run(e,'ping '+n2ip(ip),e.s.mode);},['router','switch']);
Cn(EX,'ping <w> <rest>',e=>{const ip=resolveHost(e,e.args[0]);if(ip!=null)run(e,'ping '+n2ip(ip)+' '+e.args[1],e.s.mode);},['router','switch']);
Cn(EX,'traceroute <w>',e=>{const ip=resolveHost(e,e.args[0]);if(ip!=null)run(e,'traceroute '+n2ip(ip),e.s.mode);},['router','switch']);
Cn(EX,'telnet <w> <rest?>',e=>{const ip=resolveHost(e,e.args[0]);if(ip!=null)run(e,('telnet '+n2ip(ip)+' '+e.args[1]).trim(),e.s.mode);},['router','switch']);
// password policy and login protection
Cn('config','security passwords min-length <n>',e=>{const n=e.args[0];if(n<0||n>16)return e.out(BAD);e.d.pwMin=n||null;},['router','switch']);
Cn('config','no security passwords min-length <rest?>',e=>{e.d.pwMin=null;},['router','switch']);
for(const c of CMDS){const k=c.pat.join(' ');if(!(['enable secret <w>','enable password <w>','username <w> <rest>'].includes(k)||(c.modes.includes('line')&&k==='password <w>')))continue;const f0=c.fn;
  c.fn=e=>{const pw=(e.args[e.args.length-1]||'').trim().split(/\s+/).pop();if(e.d.pwMin&&pw.length<e.d.pwMin)return e.out('% Password too short - must be at least '+e.d.pwMin+' characters. Password configuration failed');
    if(k==='enable secret <w>')e.d.secretType=null;f0(e);};}
Cn('config','enable algorithm-type <w> secret <w>',e=>{const t=['scrypt','sha256'].find(x=>x.startsWith(e.args[0].toLowerCase()));if(!t)return e.out(BAD);const pw=e.args[1];
  if(e.d.pwMin&&pw.length<e.d.pwMin)return e.out('% Password too short - must be at least '+e.d.pwMin+' characters. Password configuration failed');e.d.secret=pw;e.d.secretType=t==='scrypt'?9:8;},['router','switch']);
Cn('config','login block-for <n> attempts <n> within <n>',e=>{const[b,a,w]=e.args;if(b<1||a<1||w<1)return e.out(BAD);e.d.blockFor={b,a,w};},['router','switch']);
Cn('config','no login block-for <rest?>',e=>{e.d.blockFor=null;},['router','switch']);
Cn(EX,'show login',e=>{const B=e.d.blockFor;e.out(...(B?['     A login delay of 1 seconds is applied.','     No Quiet-Mode access list has been configured.','','     Router enabled to watch for login Attacks.','     If more than '+B.a+' login failures occur in '+B.w+' seconds or less,','     logins will be disabled for '+B.b+' seconds.','','     Router presently in Normal-Mode.','     Current Watch Window','         Time remaining: '+B.w+' seconds.','         Login failures for current window: 0.','     Total login failures: 0.']:['     No login delay has been applied.','     No Quiet-Mode access list has been configured.','','     Router NOT enabled to watch for login Attacks']));},['router','switch']);
{const rc2=runningConfig;runningConfig=function(net,d){const L=rc2(net,d);if(d.type==='pc')return L;
  if(d.secretType){const k=L.findIndex(l=>/^enable secret /.test(l));if(k>=0)L[k]=d.secretType===9?'enable secret 9 $9$nhEmQVczB7dqsO$X.HsgL6x1il0RxkOSSvyQYwucySCt7qFm4v7pqCxkKM':'enable secret 8 $8$mERr8cmN1ZTUWE$Dk3mBo1KqUCQcLtUmHt9GDxxWzBr7JH1ZcG9lHBNwbE';}
  const top=[...(d.pwMin?['security passwords min-length '+d.pwMin]:[]),...(d.blockFor?['login block-for '+d.blockFor.b+' attempts '+d.blockFor.a+' within '+d.blockFor.w]:[])];
  if(top.length){let k=L.findIndex(l=>/^enable (secret|password) /.test(l));if(k<0)k=L.findIndex(l=>/^hostname /.test(l));L.splice(k+1,0,...top);}
  const hosts=[...Object.keys(d.hosts||{}).sort().map(h=>'ip host '+((d.hostNames||{})[h]||h)+' '+n2ip(d.hosts[h])),...(d.nameServer!=null?['ip name-server '+n2ip(d.nameServer)]:[])];
  if(hosts.length){let k=L.indexOf('no ip domain-lookup');if(k>=0)L.splice(k+1,0,...hosts);else{k=L.findIndex(l=>/^interface /.test(l));L.splice(k<0?L.length-1:k,0,...hosts,'!');}}
  for(let k=0;k<L.length;k++){const m=/^interface (\S+)$/.exec(L[k]);if(!m)continue;const i=d.ifs[m[1]];if(!i)continue;let j=k+1;while(j<L.length&&L[j]!=='!'&&!/^interface /.test(L[j]))j++;
    const add=[...(i.duplex?[' duplex '+i.duplex]:[]),...(i.speed?[' speed '+i.speed]:[])];if(add.length)L.splice(j,0,...add);
    if(i.bw){const dk=L[k+1]&&L[k+1].startsWith(' description ')?k+2:k+1;L.splice(dk,0,' bandwidth '+i.bw);}}
  return L;};}
// debug ip icmp: messages queue on the device's own console (d.conq); the interface prints them in that device's tab.
Cn('priv','debug ip icmp',e=>{e.d.dbgIcmp=true;e.out('ICMP packet debugging is on');},['router','switch']);
Cn('priv','undebug ip icmp',e=>{e.d.dbgIcmp=false;e.out('ICMP packet debugging is off');},['router','switch']);
Cn('priv','no debug ip icmp',e=>{e.d.dbgIcmp=false;e.out('ICMP packet debugging is off');},['router','switch']);
Cn('priv','undebug all',e=>{e.d.dbgIcmp=false;e.out('All possible debugging has been turned off');},['router','switch']);
Cn('priv','no debug all',e=>{e.d.dbgIcmp=false;e.out('All possible debugging has been turned off');},['router','switch']);
Cn('priv','show debugging',e=>{e.out(...(e.d.dbgIcmp?['IP:','  ICMP packet debugging is on']:[]));},['router','switch']);
function dbg(net,d,msg){if(d&&d.dbgIcmp&&d.type!=='pc')(d.conq=d.conq||[]).push(stamp(net,d)+msg);}
function pingDebug(net,src,dst,P){const f=P.f,L=P.res,tail=', topology BASE, dscp 0 topoid 0';if(P.srcIp==null)return;
  L.forEach(p=>{if(p.c==='!')dbg(net,src,'ICMP: echo reply rcvd, src '+n2ip(dst)+', dst '+n2ip(P.srcIp)+tail);else if(p.c==='U')dbg(net,src,'ICMP: dst ('+n2ip(P.srcIp)+') host unreachable rcv from '+n2ip(p.from));});
  if(f.ok&&f.dest!==src&&f.dest.dbgIcmp){const n=P.R.ok?L.filter(p=>p.c==='!').length:L.length;for(let k=0;k<n;k++)dbg(net,f.dest,'ICMP: echo reply sent, src '+n2ip(f.pk.dst)+', dst '+n2ip(f.pk.src)+tail);}
  if(P.unreach){const X=f.hops.path&&net.devs[f.hops.path.at(-1)];L.filter(p=>p.c==='U').forEach(()=>dbg(net,X,'ICMP: dst ('+n2ip(dst)+') host unreachable sent to '+n2ip(P.srcIp)));}}
// PCs
Cn('pc','hostname',e=>{e.out(e.d.hostname);});
Cn('pc','netstat <rest?>',e=>{e.out('','Active Connections','','  Proto  Local Address          Foreign Address        State','');});
Cn('pc','tracert -d <ip>',e=>winTrace(e,e.args[0]));
Cn('pc','help <rest?>',e=>{e.out('For more information on a specific command, type the command name.','ARP            Displays and modifies the IP-to-physical address translation tables.','HOSTNAME       Prints the name of the current host.','IPCONFIG       Displays IP configuration and renews DHCP leases.','IPV6CONFIG     Displays IPv6 configuration.','NETSTAT        Displays protocol statistics and current TCP/IP network connections.','PING           Sends ICMP echo requests to a host.','SSH            Opens a secure shell session to a device.','TELNET         Opens a Telnet session to a device.','TRACERT        Traces the route to a destination.');});
Object.assign(WHYC,{
'show version':'Shows the IOS version, model, uptime, memory and the configuration register. 0x2102 is the normal boot setting; recovering a lost password changes it.',
'show vlan id <n>':'Shows one VLAN: its name, status and the access ports in it.',
'show running-config interface <rest>':'Shows only one interface\'s part of the running configuration, which is quicker than scrolling the whole thing.',
'show interfaces description':'One line per interface: status, protocol and description. Good for checking that every link is labelled and up.',
'duplex <w>':'Sets half, full or auto duplex. Both ends of a link must agree; a mismatch causes collisions and slow, error-filled traffic rather than a hard failure.',
'speed <w>':'Sets 10, 100, 1000 Mb/s or auto. Hard-setting one end and leaving the other on auto is a classic cause of a duplex mismatch.',
'bandwidth <n>':'Tells IOS the link\'s bandwidth in Kbit/s. It does not change the real speed, but OSPF uses it to calculate the interface cost.',
'terminal length <n>':'Sets how many lines appear before --More--. 0 turns paging off, which is handy when copying output.',
'ip host <w> <ip>':'Adds a static name-to-address entry, so you can ping or telnet by name without DNS.',
'ip name-server <ip>':'Sets the DNS server the device asks when it needs to resolve a name.',
'show hosts':'Lists the static host table and the name servers the device uses.',
'ping <w>':'Pings by name. The name comes from the ip host table; without an entry the device tries DNS first.',
'security passwords min-length <n>':'Rejects any new password shorter than this. Existing passwords are not checked until they are changed.',
'enable algorithm-type <w> secret <w>':'Stores the enable secret with a modern hash: scrypt shows as type 9, SHA-256 as type 8. Both are far stronger than the type 5 MD5 of plain enable secret.',
'login block-for <n> attempts <n> within <n>':'Blocks all logins for a while after too many failures in a short window, slowing down password-guessing attacks.',
'show login':'Shows the login protection settings and whether the device is currently blocking logins.',
'debug ip icmp':'Prints a message on this device\'s console for every ICMP packet it sends or receives itself. Debugs can load a busy router, so turn them off with undebug all.',
'undebug all':'Turns off every debug. A good habit as soon as you have the information you need.',
'show debugging':'Lists which debugs are currently running.',
'hostname':'Prints the PC\'s name.','netstat <rest?>':'Lists the PC\'s active TCP connections.','tracert -d <ip>':'tracert without name lookups, which makes it faster.','help <rest?>':'Lists the commands this PC console understands.'});
// Runs the steps on a scratch copy of the lab to record the prompt that precedes each command.
function guideFor(lab){const keep=TRACE,net=lab.build(),sess={};
  const out=lab.steps.map(task=>task.map(g=>{const d=net.devs[g.dev],s=sess[g.dev]||(sess[g.dev]={mode:d.type==='pc'?'pc':'user',ctx:null});
    return {dev:g.dev,lines:g.cmds.map(c=>{if(c[0]==='#')return {note:c.slice(1).trim()};const prompt=promptOf(d,s);execLine(net,d,s,c);return {prompt,cmd:c};})};}));
  TRACE=keep;return out;}
