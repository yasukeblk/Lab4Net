// ---------- prompts: enable and line passwords, console logout, telnet and ssh sessions, login block, reload, copy ----------
// A session may hold a pending question, s.prompt = {text, mask, on(answer, env)}: the next line typed answers it
// instead of being parsed (mask hides what is typed, as IOS does for passwords). A session may also be inside a
// remote device, s.remote = {d, s, ip, proto, win}: lines go to that device's session until it closes. The base
// execLine checks both before parsing, so every wrapper still runs around them. In guides, tests and journals the
// line "<cr>" means "press Enter" (an empty line), which is how a default answer is accepted.
function ask(s,text,on,mask){s.prompt={text,mask:!!mask,on};}
function effSess(s){while(s.remote)s=s.remote.s;return s;}
function effPair(d,s){while(s.remote){d=s.remote.d;s=s.remote.s;}return [d,s];}
function effPrompt(s){while(s){if(s.prompt)return s.prompt;s=s.remote&&s.remote.s;}return null;}
{const p0=promptOf;promptOf=function(d,s){if(s.prompt)return s.prompt.text;if(s.remote)return promptOf(s.remote.d,s.remote.s);return p0(d,s);};}
const privOfUser=u=>u&&u.priv===15?'priv':'user';
// What a line asks for when a session opens on it: a password, a local username and password, or nothing.
function lineLogin(d,kind){const l=(d.lines||{})[kind]||{};if(!l.login)return null;return l.local?'local':l.password?'password':'none';}
const iosClock=()=>{const t=new Date(),p=n=>String(n).padStart(2,'0'),D=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return p(t.getUTCHours())+':'+p(t.getUTCMinutes())+':'+p(t.getUTCSeconds())+' UTC '+D[t.getUTCDay()]+' '+M[t.getUTCMonth()]+' '+t.getUTCDate()+' '+t.getUTCFullYear();};
// Login block: after too many failures inside the watch window the device refuses every new login for a while.
function quietMode(net,d){if(!d.quietUntil)return false;if(simNow()<d.quietUntil)return true;delete d.quietUntil;logEvent(net,d,'%SEC_LOGIN-5-QUIET_MODE_OFF: Quiet Mode is OFF, because block period timed out at '+iosClock());return false;}
function loginFailed(net,d,srcIp,user,port){const now=simNow(),B=d.blockFor;d.loginTotal=(d.loginTotal||0)+1;
  if(d.loginLog&&d.loginLog.fail)logEvent(net,d,'%SEC_LOGIN-4-LOGIN_FAILED: Login failed [user: '+(user||'')+'] [Source: '+n2ip(srcIp)+'] [localport: '+port+'] [Reason: Login Authentication Failed - BadPassword] at '+iosClock());
  if(!B||quietMode(net,d))return;(d.loginFails=d.loginFails||[]).push(now);d.loginFails=d.loginFails.filter(t=>now-t<=B.w*1000);
  if(d.loginFails.length>=B.a){d.quietUntil=now+B.b*1000;d.loginFails=[];
    logEvent(net,d,'%SEC_LOGIN-1-QUIET_MODE_ON: Still timeleft for watching failures is 0 secs, [user: '+(user||'')+'] [Source: '+n2ip(srcIp)+'] [localport: '+port+'] [Reason: Login Authentication Failed - BadPassword] [ACL: sl_def_acl] at '+iosClock());}}
function loginOk(net,d,srcIp,user,port){if(d.loginLog&&d.loginLog.success)logEvent(net,d,'%SEC_LOGIN-5-LOGIN_SUCCESS: Login Success [user: '+(user||'')+'] [Source: '+n2ip(srcIp)+'] [localport: '+port+'] at '+iosClock());}
// Authenticate a session on a line. Questions go to sIn (the session typing); the mode lands on sTo (the session
// being opened). done(ok, env) runs after success or the third failure; fail(env, user) after each failure.
function authLine(d,sIn,sTo,kind,done,fail,fixedUser){const how=lineLogin(d,kind);let tries=0;
  const pw=()=>ask(sIn,'Password: ',(a,env)=>{if(a===d.lines[kind].password){sTo.mode='user';return done(true,env,null);}
    tries++;if(fail)fail(env,null);if(tries>=3)return done(false,env,null);pw();},true);
  const local=u=>ask(sIn,'Password: ',(p,env)=>{const x=(d.users||[]).find(x=>x.name===u&&x.pw===p);
    if(x){sTo.mode=privOfUser(x);return done(true,env,u);}tries++;if(fail)fail(env,u);if(tries>=3)return done(false,env,u);
    if(fixedUser)return local(u);env.out('% Login invalid','');user();},true);
  const user=()=>ask(sIn,'Username: ',(u,env)=>local(u.trim()));
  if(how==='local')fixedUser?local(fixedUser):user();else pw();}
// The console: exit or logout at the > or # prompt ends the session, and the next Enter starts a new one.
function conLogout(e){const d=e.d,s=e.s;s.mode='user';s.ctx=null;e.out('',d.hostname+' con0 is now available','','','','Press RETURN to get started.','');
  ask(s,'',(a,env)=>conLogin(env));}
function conLogin(e){const d=e.d,s=e.s,how=lineLogin(d,'con');
  if(how==='none'){e.out('','% Login disabled on line 0, until \'password\' is set','');return ask(s,'',(a,env)=>conLogin(env));}
  if(d.banner)e.out(d.banner);
  if(how===null){s.mode='user';return;}
  e.out('User Access Verification','');
  authLine(d,s,s,'con',(ok,env)=>{if(ok)return;env.out('% Bad passwords','',d.hostname+' con0 is now available','','','','Press RETURN to get started.','');ask(env.s,'',(a,env2)=>conLogin(env2));});}
{const c=CMDS.find(c=>c.pat.join(' ')==='exit'&&c.modes.includes('user'));c.fn=e=>{if(e.s.vty){e.s.closed=true;return;}conLogout(e);};
 C(EX,'logout',e=>c.fn(e));}
// enable asks for the secret (or the enable password when there is no secret). Three misses: % Bad secrets.
// With neither set, the console goes straight in, but a VTY (Telnet/SSH) session is refused: IOS says
// "% No password set", which is why a router cannot be managed remotely without an enable secret.
{const c=CMDS.find(c=>c.pat.join(' ')==='enable'&&c.modes.includes('user'));c.fn=e=>{const d=e.d,s=e.s,pw=d.secret||d.enPass;if(!pw){if(s.vty)return e.out('% No password set');s.mode='priv';return;}
  let tries=0;const again=()=>ask(s,'Password: ',(a,env)=>{if(a===pw){s.mode='priv';return;}tries++;if(tries>=3)return env.out(d.secret?'% Bad secrets':'% Bad passwords');again();},true);again();};}
// A remote session: telnet or ssh into a device that listens, then that device's own login.
const closeMsg=R=>R.win?(R.proto==='ssh'?'Connection to '+n2ip(R.ip)+' closed.':'Connection to host lost.'):'[Connection to '+n2ip(R.ip)+' closed by foreign host]';
function vtyOpen(e,ip,proto,user){const{net,d,s}=e,r=reach(net,d,ip,'tcp',proto==='ssh'?22:23),win=d.type==='pc',port=proto==='ssh'?22:23;
  const iosTel=!win&&proto==='telnet',tl='Trying '+n2ip(ip)+' ...';
  if(win&&proto==='telnet')e.out('Connecting To '+n2ip(ip)+'...');
  const rd=r.f.ok?r.f.dest:null;
  if(r.ok&&rd&&quietMode(net,rd)){if(iosTel)e.out(tl);e.out(win?(proto==='ssh'?'ssh: connect to host '+n2ip(ip)+' port 22: Connection refused':'Could not open connection to the host, on port 23: Connect failed'):'% Connection refused by remote host');return;}
  if(!r.ok){if(iosTel)e.out(tl);e.out(win?(proto==='ssh'?'ssh: connect to host '+n2ip(ip)+' port 22: Connection '+(r.refused?'refused':'timed out'):'Could not open connection to the host, on port 23: Connect failed'):FAILMSG(r));return;}
  if(iosTel)e.out(tl+' Open','','');
  // login with no password set: IOS accepts the connection, says so, and closes it
  if(proto==='telnet'&&lineLogin(rd,'vty')==='none'){if(win)e.out('','Password required, but none set','','Connection to host lost.');else e.out('Password required, but none set','','[Connection to '+n2ip(ip)+' closed by foreign host]');return;}
  const srcIp=r.f.pk.src,rs={mode:'user',ctx:null,vty:true,boot:rd.boots||0,hist:[],hi:0,lines:[]};
  s.remote={d:rd,s:rs,ip,proto,win,from:srcIp,user:null};
  const R=s.remote,finish=(ok,env,u)=>{if(ok){R.user=u;(rd.vtys=rd.vtys||[]).push(R);loginOk(net,rd,srcIp,u,port);return;}
    if(proto==='telnet'&&!win)env.out('% Bad passwords');if(win&&proto==='ssh')env.out((user||'')+'@'+n2ip(ip)+': Permission denied (password).');
    env.out('',closeMsg(R));env.s.remote=null;};
  const failed=(env,u)=>{if(win&&proto==='ssh')env.out('Permission denied, please try again.');loginFailed(net,rd,srcIp,u,port);};
  // no login on the VTY lines: straight in with no password at all (the insecure case)
  if(proto==='telnet'&&lineLogin(rd,'vty')===null){if(rd.banner)e.out(rd.banner);finish(true,e,null);return;}
  if(proto==='telnet'){if(rd.banner)e.out(rd.banner);e.out('User Access Verification','');authLine(rd,s,rs,'vty',finish,failed);return;}
  // ssh: the username came on the command line; the server only asks for the password
  if(lineLogin(rd,'vty')!=='local'){e.out(win?'Permission denied (publickey,password).':'% Authentication failed.','',closeMsg(R));s.remote=null;return;}
  if(rd.banner)e.out(rd.banner);
  if(win){const known=d.knownHosts||(d.knownHosts=[]),pq='Password: '.replace('Password: ',user+'@'+n2ip(ip)+'\'s password: ');
    const go=()=>{let tries=0;const check=(p2,env2)=>{const y=(rd.users||[]).find(x=>x.name===user&&x.pw===p2);if(y){rs.mode=privOfUser(y);return finish(true,env2,user);}tries++;failed(env2,user);if(tries>=3)return finish(false,env2,user);ask(s,pq,check,true);};ask(s,pq,check,true);};
    if(!known.includes(ip)){e.out('The authenticity of host \''+n2ip(ip)+' ('+n2ip(ip)+')\' can\'t be established.','RSA key fingerprint is SHA256:'+fp(rd)+'.');
      const q=()=>ask(s,'Are you sure you want to continue connecting (yes/no/[fingerprint])? ',(a,env)=>{const x=a.trim().toLowerCase();if(x==='yes'){known.push(ip);env.out('Warning: Permanently added \''+n2ip(ip)+'\' (RSA) to the list of known hosts.');return go();}
        if(x==='no'){env.out('Host key verification failed.');env.s.remote=null;return;}env.out('Please type \'yes\', \'no\' or the fingerprint: ');q();});q();}
    else go();return;}
  authLine(rd,s,rs,'vty',finish,failed,user);}
const fp=d=>{const A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let h=7,o='';for(const c of d.name+macOf(d))h=(h*33+c.charCodeAt(0))>>>0;for(let k=0;k<43;k++){h=(h*1103515245+12345)>>>0;o+=A[(h>>>16)&63];}return o;};
{const t=CMDS.find(c=>c.pat.join(' ')==='telnet <ip> <rest?>'),t0=t.fn;t.fn=e=>{const p=/^\d+$/.test(e.args[1])?+e.args[1]:23;if(p!==23)return t0(e);vtyOpen(e,e.args[0],'telnet');};
 const sh=CMDS.find(c=>c.pat.join(' ')==='ssh -l <w> <ip>');sh.fn=e=>vtyOpen(e,e.args[1],'ssh',e.args[0]);
 Cn('pc','ssh <w>',e=>{const m=/^([^@]+)@(.+)$/.exec(e.args[0]);if(!m||!isIp(m[2]))return e.out('ssh: Could not resolve hostname '+(m?m[2]:e.args[0])+': Name or service not known');vtyOpen(e,ip2n(m[2]),'ssh',m[1]);});}
Cn(EX,'show users',e=>{const d=e.d,rows=[],onVty=!!e.s.vty;rows.push('    Line       User       Host(s)              Idle       Location');rows.push((onVty?'   ':'*  ')+'0 con 0                idle                 00:00:00   ');
  (d.vtys||[]).forEach((R,k)=>rows.push(pad((R.s===e.s?'*':' ')+(514+k)+' vty '+k,15)+pad(R.user||'',11)+pad('idle',21)+pad('00:00:00',11)+n2ip(R.from)));rows.push('','  Interface    User               Mode         Idle     Peer Address','');e.out(...rows);},['router','switch']);
Cn('line','no password <rest?>',e=>{delete e.d.lines[e.s.ctx].password;});
Cn('config','no banner motd <rest?>',e=>{delete e.d.banner;});
Cn('config','login on-failure log',e=>{(e.d.loginLog=e.d.loginLog||{}).fail=true;},['router','switch']);
Cn('config','login on-success log',e=>{(e.d.loginLog=e.d.loginLog||{}).success=true;},['router','switch']);
Cn('config','no login on-failure <rest?>',e=>{if(e.d.loginLog)e.d.loginLog.fail=false;},['router','switch']);
Cn('config','no login on-success <rest?>',e=>{if(e.d.loginLog)e.d.loginLog.success=false;},['router','switch']);
{const c=CMDS.find(c=>c.pat.join(' ')==='show login');c.fn=e=>{const d=e.d,B=d.blockFor,q=quietMode(e.net,d);const L=[];
  if(!B)L.push('     No login delay has been applied.','     No Quiet-Mode access list has been configured.','','     Router NOT enabled to watch for login Attacks');
  else{L.push('     A login delay of 1 seconds is applied.','     No Quiet-Mode access list has been configured.','','     Router enabled to watch for login Attacks.','     If more than '+B.a+' login failures occur in '+B.w+' seconds or less,','     logins will be disabled for '+B.b+' seconds.','');
    if(q)L.push('     Router presently in Quiet-Mode.','     Will remain in Quiet-Mode for '+Math.max(1,Math.ceil((d.quietUntil-simNow())/1000))+' seconds.','     Denying logins from all sources.');
    else{const f=(d.loginFails||[]).filter(t=>simNow()-t<=B.w*1000);L.push('     Router presently in Normal-Mode.','     Current Watch Window','         Time remaining: '+(f.length?Math.max(1,Math.ceil((f[0]+B.w*1000-simNow())/1000)):B.w)+' seconds.','         Login failures for current window: '+f.length+'.','     Total login failures: '+(d.loginTotal||0)+'.');}}
  e.out(...L);};}
{const ge0=globalExtra;globalExtra=function(d){const L=ge0(d);if(d.loginLog&&d.loginLog.fail)L.push('login on-failure log');if(d.loginLog&&d.loginLog.success)L.push('login on-success log');return L;};}

// ----- saved configuration and reload
// d.boot is a copy of the device as it was last saved (or as the lab built it); reload puts it back and clears
// everything a real device loses: ARP and MAC tables, logs, NAT translations, DHCP bindings, err-disabled ports.
function deepClone(x){if(x===null||typeof x!=='object')return x;if(Array.isArray(x))return x.map(deepClone);const o={};for(const k in x)o[k]=deepClone(x[k]);return o;}
const cfgText=(net,d)=>runningConfig(net,d).slice(2).join('\n');
function snapBoot(net,d){if(d.type==='pc')return;const {boot,boots,startup,bootCfg,factoryCfg,...rest}=d;d.boot=deepClone(rest);d.bootCfg=cfgText(net,d);}
function clearVolatile(d){delete d.arpc;delete d.mact;delete d.conq;delete d.logBuf;delete d.trapSent;delete d.icmpSeq;delete d.loginFails;delete d.quietUntil;delete d.vtys;
  if(d.nat){d.nat.table=[];d.nat.dyn=[];d.nat.hits=0;d.nat.misses=0;}if(d.dhcp)d.dhcp.bindings=[];if(d.snoop)d.snoop.bind=[];if(d.dai){d.dai.drops=0;d.dai.fwd=0;}
  if(d.ospf){d.ospf.active=null;d.ospf.resetting=false;}for(const a of Object.values(d.acls||{}))for(const en of a.entries||[])en.hits=0;
  for(const i of Object.values(d.ifs)){delete i.errdis;if(i.ps){i.ps.macs=(i.ps.macs||[]).filter(m=>m.kind!=='dynamic');i.ps.viol=0;i.ps.blocked=[];delete i.ps.last;}}}
function restoreBoot(net,d){const snap=d.boot;if(!snap)return;const keep={name:d.name,type:d.type,boot:d.boot,boots:(d.boots||0)+1,startup:d.startup,bootCfg:d.bootCfg,factoryCfg:d.factoryCfg};
  for(const k of Object.keys(d))delete d[k];Object.assign(d,deepClone(snap),keep);
  for(const l of net.links){if(l.a===d.name&&d.ifs[l.ai])d.ifs[l.ai].link={dev:l.b,ifn:l.bi};if(l.b===d.name&&d.ifs[l.bi])d.ifs[l.bi].link={dev:l.a,ifn:l.ai};}
  clearVolatile(d);if(net.hsrp)for(const k of Object.keys(net.hsrp))if(String(net.hsrp[k].active).startsWith(d.name+'|')||String(net.hsrp[k].standby).startsWith(d.name+'|'))delete net.hsrp[k];}
// Every device starts with a factory copy; a lab's build then saves what it configured, as if someone had written it to NVRAM.
{const mk0=mkNet;mkNet=function(devs){const net=mk0(devs);for(const d of devs){snapBoot(net,d);d.factoryCfg=d.bootCfg;}return net;};
 for(const l of LABS){const b=l.build;l.build=function(){const net=b.apply(this,arguments);for(const d of Object.values(net.devs)){if(d.type==='pc')continue;snapBoot(net,d);if(d.bootCfg!==d.factoryCfg&&!d.startup)d.startup=runningConfig(net,d).slice(2);}return net;};}}
function saveCfg(e){e.d.startup=runningConfig(e.net,e.d).slice(2);snapBoot(e.net,e.d);e.out('Building configuration...','[OK]');}
{const c=CMDS.find(c=>c.pat.join(' ')==='copy running-config startup-config');c.fn=e=>ask(e.s,'Destination filename [startup-config]? ',(a,env)=>{const f=a.trim().replace(/^nvram:/i,'');
   if(!f||f.toLowerCase()==='startup-config')return saveCfg(Object.assign({},env,{d:e.d}));
   // another name: IOS writes a copy into NVRAM under that name; the startup-config (what a reload uses) is unchanged
   const txt=runningConfig(env.net||e.net,e.d).slice(2);(e.d.nvram=e.d.nvram||{})[f]=txt;env.out(txt.join('\n').length+' bytes copied in 0.084 secs');});
 const w=CMDS.find(c=>c.pat.join(' ')==='write <rest?>');w.fn=e=>{const a=(e.args[0]||'').trim().toLowerCase();if(a&&!'memory'.startsWith(a))return e.out(BAD);saveCfg(e);};}
const BOOT_ROUTER=['','System Bootstrap, Version 15.0(1r)M16, RELEASE SOFTWARE (fc1)','Technical Support: http://www.cisco.com/techsupport','Copyright (c) 2012 by cisco Systems, Inc.','','Total memory size = 512 MB - On-board = 512 MB, DIMM0 = 0 MB','CISCO2911/K9 platform with 524288 Kbytes of main memory with parity disabled','','Readonly ROMMON initialized','','program load complete, entry point: 0x80803000, size: 0x1b340','','Self decompressing the image : ################################################ [OK]','','Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.2(4)M3, RELEASE SOFTWARE (fc2)','Copyright (c) 1986-2012 by Cisco Systems, Inc.','','cisco CISCO2911/K9 (revision 1.0) with 491520K/32768K bytes of memory.','3 Gigabit Ethernet interfaces','255K bytes of non-volatile configuration memory.','250880K bytes of ATA System CompactFlash 0 (Read/Write)',''];
const BOOT_SWITCH=['','Base ethernet MAC Address: 0019.e8a2.3c00','Xmodem file system is available.','Initializing Flash...','flashfs[0]: 2 files, 1 directories','flashfs[0]: 0 orphaned files, 0 orphaned directories','flashfs[0]: Total bytes: 32514048','flashfs[0]: Bytes used: 11015680','flashfs[0]: Bytes available: 21498368','flashfs[0]: flashfs fsck took 1 seconds.','...done Initializing Flash.','','Loading "flash:/c2960-lanbasek9-mz.150-2.SE4.bin"...','########################################################################## [OK]','','Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2(7)E2, RELEASE SOFTWARE (fc3)','Copyright (c) 1986-2019 by Cisco Systems, Inc.','','cisco WS-C2960-24TT-L (PowerPC405) processor (revision B0) with 65536K bytes of memory.','24 FastEthernet interfaces','2 Gigabit Ethernet interfaces','',''];
function doReload(e){const{net,d,s}=e;const hadStartup=!!d.startup||(d.bootCfg!==d.factoryCfg);
  restoreBoot(net,d);s.boot=d.boots||0;
  const boot=(d.type==='router'?BOOT_ROUTER:BOOT_SWITCH.map(l=>l.startsWith('Base ethernet MAC')?'Base ethernet MAC Address: '+macOf(d):l)).slice();
  const lines=[(d.tsLog?stamp(net,d):'')+'%SYS-5-RELOAD: Reload requested by console. Reload Reason: Reload Command.',...boot];
  const t=lines.map((l,k)=>k===0?0:l===''?80:220);
  if(hadStartup){lines.push('','Press RETURN to get started!','');t.push(300,0,0);ask(s,'',(a,env)=>conLogin(env));}
  else{lines.push('','         --- System Configuration Dialog ---','','');t.push(300,0,0,0);
    const dlg=()=>ask(s,'Would you like to enter the initial configuration dialog? [yes/no]: ',(a,env)=>{const x=a.trim().toLowerCase();
      if(x==='no'||x==='n'){env.out('','Press RETURN to get started!','');return ask(env.s,'',(a2,env2)=>conLogin(env2));}
      if(x==='yes'||x==='y'){env.out('[Lab4Net does not simulate the setup dialog. Answer no and configure from the console.]','');return dlg();}
      env.out('% Please answer \'yes\' or \'no\'.');dlg();});dlg();}
  s.mode='user';s.ctx=null;e.out(...lines);s.pace={t,abort:()=>[]};}
// A reload typed over Telnet or SSH: the session closes, and the boot messages land on the device's own console.
function vtyReload(net,d,s){const who=s.user||'',from=s.from?' ('+n2ip(s.from)+')':'';restoreBoot(net,d);
  const boot=(d.type==='router'?BOOT_ROUTER:BOOT_SWITCH.map(l=>l.startsWith('Base ethernet MAC')?'Base ethernet MAC Address: '+macOf(d):l));
  (d.conq=d.conq||[]).push((d.tsLog?stamp(net,d):'')+'%SYS-5-RELOAD: Reload requested by '+(who||'vty0')+' on vty0'+from+'. Reload Reason: Reload Command.',...boot,'','Press RETURN to get started!','');
  s.closed=true;}
Cn('priv','reload',e=>{const{net,d,s}=e;
  const dirty=cfgText(net,d)!==(d.bootCfg||'');
  const go=()=>ask(s,'Proceed with reload? [confirm]',(a,env)=>{if(/^n/i.test(a.trim()))return;if(env.s.vty)return vtyReload(net,d,env.s);doReload(Object.assign({},env,{d}));});
  const saveQ=()=>ask(s,'System configuration has been modified. Save? [yes/no]: ',(a,env)=>{const x=a.trim().toLowerCase();
    if(x==='yes'||x==='y'){saveCfg(Object.assign({},env,{d}));return go();}if(x==='no'||x==='n')return go();env.out('% Please answer \'yes\' or \'no\'.');saveQ();});
  if(dirty)saveQ();else go();},['router','switch']);
{const ex0=execLine;execLine=function(net,d,s,line){if(d&&s&&d.type!=='pc'&&!s.vty){const b=d.boots||0;
    if(s.boot===undefined)s.boot=b;else if(s.boot!==b){s.boot=b;s.mode='user';s.ctx=null;s.remote=null;s.prompt=null;ask(s,'',(a,env)=>conLogin(env));}}
  return ex0(net,d,s,line);};}
Object.assign(KWHELP,{reload:'Halt and perform a cold restart',logout:'Exit from the EXEC',users:'Display information about terminal lines','on-failure':'Set options for failed login attempt','on-success':'Set options for successful login attempt'});
Object.assign(WHYC,{
'reload':'Restarts the device from its saved startup configuration. Anything not saved with copy running-config startup-config is lost, which is why IOS asks first.',
'logout':'Ends this console session. The next person to press Enter gets the login prompt, if the console line has one.',
'show users':'Who is connected: the console and every open Telnet or SSH session, with where it came from.',
'login on-failure log':'Logs every failed login with the user and source address, so brute-force attempts leave a trail.',
'login on-success log':'Logs every successful login, so you can see who got in and from where.',
'no login on-failure <rest?>':'Stops logging failed logins.','no login on-success <rest?>':'Stops logging successful logins.',
'ssh <w>':'OpenSSH on a PC: ssh user@address. The first connection asks you to accept the host key; then the device asks for that user\'s password.'});
