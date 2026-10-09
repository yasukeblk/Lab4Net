// Prompts: enable and line passwords, console logout and login, telnet and ssh sessions (IOS and Windows messages),
// login block-for quiet mode, reload with Save? and the saved config restored, copy run start's filename prompt.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const context=vm.createContext({assert,console});
vm.runInContext(engine+`
function build(title){return LABS.find(l=>l.title===title).build();}
function solve(title){const lab=LABS.find(l=>l.title===title),net=lab.build();for(const [name,commands] of Object.entries(lab.solution)){const d=net.devs[name],s={mode:d.type==='pc'?'pc':'user'};commands.forEach(c=>execLine(net,d,s,c));}return net;}
const S=()=>({mode:'user',ctx:null,hist:[],hi:0,lines:[]});
const go=(net,d,s,line)=>{const out=execLine(net,d,s,line);return {out,text:out.join('\\n'),prompt:promptOf(d,s)};};
{
// ----- enable asks for the secret, three misses give % Bad secrets
let net=build('Basic device setup'),R1=net.devs.R1,s=S();
go(net,R1,s,'enable');assert.equal(s.mode,'priv','no secret: straight in');
go(net,R1,s,'configure terminal');go(net,R1,s,'enable secret cisco123');go(net,R1,s,'end');go(net,R1,s,'disable');
let r=go(net,R1,s,'enable');assert.equal(r.prompt,'Password: ');assert.equal(s.prompt.mask,true);assert.equal(s.mode,'user');
r=go(net,R1,s,'wrong');assert.equal(r.prompt,'Password: ');assert.equal(s.mode,'user');
r=go(net,R1,s,'cisco123');assert.equal(s.mode,'priv');assert.equal(r.prompt,'R1#');assert.equal(s.prompt,null);
go(net,R1,s,'disable');go(net,R1,s,'enable');go(net,R1,s,'a');go(net,R1,s,'b');r=go(net,R1,s,'c');
assert.deepEqual(r.out,['% Bad secrets']);assert.equal(s.mode,'user');assert.equal(r.prompt,'R1>');
// enable password is used only when there is no secret
net=build('Basic device setup');R1=net.devs.R1;s=S();go(net,R1,s,'enable');go(net,R1,s,'configure terminal');go(net,R1,s,'enable password plain');go(net,R1,s,'end');go(net,R1,s,'disable');
go(net,R1,s,'enable');go(net,R1,s,'plain');assert.equal(s.mode,'priv');

// ----- exit at the exec prompt logs out; the console line decides what the next Enter asks for
net=build('Basic device setup');R1=net.devs.R1;s=S();
r=go(net,R1,s,'exit');assert.ok(r.text.includes('Press RETURN to get started.'));assert.equal(r.prompt,'');
r=go(net,R1,s,'');assert.equal(r.prompt,'R1>','no console password yet');
go(net,R1,s,'enable');go(net,R1,s,'configure terminal');go(net,R1,s,'banner motd #Keep out#');go(net,R1,s,'line console 0');go(net,R1,s,'password conpass');go(net,R1,s,'login');go(net,R1,s,'end');
r=go(net,R1,s,'exit');assert.ok(r.text.includes('R1 con0 is now available'));
r=go(net,R1,s,'enable');assert.ok(r.text.includes('Keep out')&&r.text.includes('User Access Verification'),'anything typed at Press RETURN just starts the session');
assert.equal(r.prompt,'Password: ');
r=go(net,R1,s,'nope');assert.equal(r.prompt,'Password: ');r=go(net,R1,s,'nope');r=go(net,R1,s,'nope');
assert.ok(r.text.includes('% Bad passwords')&&r.text.includes('Press RETURN'));assert.equal(r.prompt,'');
go(net,R1,s,'');r=go(net,R1,s,'conpass');assert.equal(r.prompt,'R1>');assert.equal(s.mode,'user');
// logout works the same, from privileged mode too
go(net,R1,s,'enable');r=go(net,R1,s,'logout');assert.ok(r.text.includes('Press RETURN'));
// login local on the console: username, then privilege 15 lands in #
go(net,R1,s,'');go(net,R1,s,'conpass');go(net,R1,s,'enable');go(net,R1,s,'configure terminal');go(net,R1,s,'username bob privilege 15 secret bobpw');go(net,R1,s,'line console 0');go(net,R1,s,'login local');go(net,R1,s,'end');go(net,R1,s,'exit');go(net,R1,s,'');
assert.equal(promptOf(R1,s),'Username: ');r=go(net,R1,s,'bob');assert.equal(r.prompt,'Password: ');r=go(net,R1,s,'bad');assert.ok(r.text.includes('% Login invalid'));assert.equal(r.prompt,'Username: ');
go(net,R1,s,'bob');r=go(net,R1,s,'bobpw');assert.equal(r.prompt,'R1#');
// login without a password locks the console, as IOS does
go(net,R1,s,'configure terminal');go(net,R1,s,'line console 0');go(net,R1,s,'no login');go(net,R1,s,'login');go(net,R1,s,'no password');go(net,R1,s,'end');
if(!R1.lines.con.password&&!R1.lines.con.local){go(net,R1,s,'exit');r=go(net,R1,s,'');assert.ok(r.text.includes("% Login disabled on line 0, until 'password' is set"));}

// ----- telnet from a router: the VTY login, then commands run on the far device
net=solve('Static routing');const PC1=net.devs.PC1;R1=net.devs.R1;const R2=net.devs.R2;s=S();
go(net,R1,s,'enable');go(net,R1,s,'configure terminal');go(net,R1,s,'line vty 0 4');go(net,R1,s,'password vtypass');go(net,R1,s,'login');go(net,R1,s,'end');
go(net,R2,{mode:'user'},'enable');const s2=S();go(net,R2,s2,'enable');go(net,R2,s2,'configure terminal');go(net,R2,s2,'line vty 0 4');go(net,R2,s2,'password r2pass');go(net,R2,s2,'login');go(net,R2,s2,'banner motd #R2 here#');go(net,R2,s2,'enable secret r2en');go(net,R2,s2,'end');
r=go(net,R1,s,'telnet 10.0.12.2');
assert.ok(r.out[0].startsWith('Trying 10.0.12.2 ...')&&r.out.includes('Open')&&r.text.includes('R2 here')&&r.text.includes('User Access Verification'),r.text);
assert.equal(r.prompt,'Password: ');assert.ok(s.remote&&s.remote.d===R2);
r=go(net,R1,s,'r2pass');assert.equal(r.prompt,'R2>','now on R2');
r=go(net,R1,s,'enable');assert.equal(r.prompt,'Password: ');r=go(net,R1,s,'r2en');assert.equal(r.prompt,'R2#');
go(net,R1,s,'configure terminal');r=go(net,R1,s,'hostname CORE');assert.equal(r.prompt,'CORE(config)#');assert.equal(R2.hostname,'CORE');
go(net,R1,s,'end');
assert.match(go(net,R2,{mode:'priv'},'show users').text,/vty 0 +[^\\n]*10\\.0\\.12\\.1/);
r=go(net,R1,s,'exit');assert.ok(r.text.includes('[Connection to 10.0.12.2 closed by foreign host]'));assert.equal(r.prompt,'R1#');assert.equal(s.remote,null);
assert.ok(!/vty 0/.test(go(net,R2,{mode:'priv'},'show users').text));
R2.hostname='R2';
// three bad passwords close the connection
go(net,R1,s,'telnet 10.0.12.2');go(net,R1,s,'x');go(net,R1,s,'y');r=go(net,R1,s,'z');
assert.ok(r.text.includes('% Bad passwords')&&r.text.includes('closed by foreign host'));assert.equal(s.remote,null);
// a reload typed over telnet drops the session, and the remote's console messages stay on the remote console
go(net,R1,s,'telnet 10.0.12.2');go(net,R1,s,'r2pass');go(net,R1,s,'enable');go(net,R1,s,'r2en');go(net,R1,s,'configure terminal');go(net,R1,s,'interface loopback 9');go(net,R1,s,'ip address 9.9.9.9 255.255.255.255');r=go(net,R1,s,'end');
assert.ok(!r.text.includes('%LINK'),'syslog from the far device does not print on the VTY');assert.ok((R2.conq||[]).some(l=>/Loopback9/.test(l)),'it is queued for R2\\'s own console');
// login block-for: three failures in a minute block every login for 2 seconds
go(net,R2,s2,'configure terminal');go(net,R2,s2,'login block-for 2 attempts 3 within 60');go(net,R2,s2,'login on-failure log');go(net,R2,s2,'end');
go(net,R1,s,'exit');go(net,R1,s,'telnet 10.0.12.2');go(net,R1,s,'x');go(net,R1,s,'y');go(net,R1,s,'z');
assert.ok((R2.logBuf||[]).some(l=>/SEC_LOGIN-1-QUIET_MODE_ON/.test(l)),'quiet mode logged');assert.ok((R2.logBuf||[]).some(l=>/SEC_LOGIN-4-LOGIN_FAILED.*Source: 10.0.12.1/.test(l)));
r=go(net,R1,s,'telnet 10.0.12.2');assert.ok(r.text.includes('% Connection refused by remote host'),r.text);
assert.match(go(net,R2,s2,'show login').text,/presently in Quiet-Mode/);
R2.quietUntil=Date.now()-1;assert.match(go(net,R2,s2,'show login').text,/presently in Normal-Mode/);assert.ok(R2.logBuf.some(l=>/QUIET_MODE_OFF/.test(l)));
// a VTY line with login but no password: Password required, but none set
go(net,R2,s2,'configure terminal');go(net,R2,s2,'line vty 0 4');go(net,R2,s2,'no password');go(net,R2,s2,'end');
r=go(net,R1,s,'telnet 10.0.12.2');assert.ok(r.text.includes('Password required, but none set'),r.text);assert.equal(s.remote,null);

// ----- REVIEW-FIXES 4: enable over Telnet with no enable secret or password: % No password set, still at R2>.
// The console still goes straight in.
{const n=solve('Static routing'),a=S(),b=S();go(n,n.devs.R2,b,'enable');go(n,n.devs.R2,b,'configure terminal');go(n,n.devs.R2,b,'line vty 0 4');go(n,n.devs.R2,b,'password vv');go(n,n.devs.R2,b,'login');go(n,n.devs.R2,b,'end');
  go(n,n.devs.R1,a,'enable');go(n,n.devs.R1,a,'telnet 10.0.12.2');let q=go(n,n.devs.R1,a,'vv');assert.equal(q.prompt,'R2>');
  q=go(n,n.devs.R1,a,'enable');assert.deepEqual(q.out,['% No password set']);assert.equal(q.prompt,'R2>');
  const c=S();q=go(n,n.devs.R2,c,'enable');assert.equal(q.prompt,'R2#','the console needs no password');
  go(n,n.devs.R2,c,'configure terminal');go(n,n.devs.R2,c,'enable secret es');go(n,n.devs.R2,c,'end');
  q=go(n,n.devs.R1,a,'enable');assert.equal(q.prompt,'Password: ');q=go(n,n.devs.R1,a,'es');assert.equal(q.prompt,'R2#');}

// ----- REVIEW-FIXES 2: replaying saved work must give the live result. Quiet mode is timed on the engine clock, and a
// replay runs each journal line at the time it was typed (SIM_NOW = entry.t), as the interface's replay() does.
{const t0=1700000000000,J=[];const add=(dev,line,sec)=>J.push({device:dev,line,t:t0+sec*1000});
  add('R2','enable',0);add('R2','configure terminal',0);add('R2','line vty 0 4',1);add('R2','password vv',1);add('R2','login',1);add('R2','enable secret es',1);add('R2','login block-for 30 attempts 3 within 60',2);add('R2','end',2);
  add('R1','enable',3);add('R1','telnet 10.0.12.2',4);add('R1','a',5);add('R1','b',6);add('R1','c',7);   // three failures: 30 s of quiet mode
  add('R1','telnet 10.0.12.2',52);add('R1','vv',53);add('R1','enable',54);add('R1','es',55);add('R1','configure terminal',56);add('R1','hostname HACKED',57);add('R1','end',58);
  const replayJ=journal=>{const n=build('Static routing'),ss={};for(const k in n.devs)ss[k]=S();
    try{for(const e of journal){SIM_NOW=e.t;execLine(n,n.devs[e.device],ss[e.device],e.line);}}finally{SIM_NOW=null;}return n;};
  const n=replayJ(J);assert.equal(n.devs.R2.hostname,'HACKED','45 s later the login worked, so the rename happened on R2');assert.equal(n.devs.R1.hostname,'R1','R1 kept its name');
  // and inside the 30 s the telnet is still refused, so nothing reaches R2 (the later lines run on R1 and are rejected or harmless)
  const J2=J.map(e=>e.t>=t0+52000?{...e,t:e.t-40000}:e),n2=replayJ(J2);assert.equal(n2.devs.R2.hostname,'R2');
  assert.equal(simNow()>t0+1e9,true,'the clock is real again after a replay');}

// ----- ssh from a PC: OpenSSH host key question, password, then the far prompt; from IOS: just the password
net=solve('SSH remote access');const pc=net.devs.PC1;const sp={mode:'pc',hist:[],hi:0,lines:[]};R1=net.devs.R1;delete pc.knownHosts;
r=go(net,pc,sp,'ssh -l admin 192.168.1.1');assert.ok(r.text.includes("can't be established")&&r.text.includes('RSA key fingerprint is SHA256:'),r.text);
assert.ok(r.prompt.startsWith('Are you sure you want to continue connecting'));
r=go(net,pc,sp,'no');assert.ok(r.text.includes('Host key verification failed.'));assert.equal(sp.remote,null);
go(net,pc,sp,'ssh admin@192.168.1.1');r=go(net,pc,sp,'yes');assert.ok(r.text.includes("Permanently added '192.168.1.1'"));assert.equal(r.prompt,"admin@192.168.1.1's password: ");
r=go(net,pc,sp,'bad');assert.ok(r.text.includes('Permission denied, please try again.'));r=go(net,pc,sp,'S3cure-Pass');assert.equal(r.prompt,'R1#','privilege 15 lands in enable mode');
r=go(net,pc,sp,'show ip interface brief');assert.ok(r.text.includes('GigabitEthernet0/0'));
r=go(net,pc,sp,'exit');assert.ok(r.text.includes('Connection to 192.168.1.1 closed.'));assert.equal(r.prompt,'C:\\\\>');
// the second connection skips the host key question
r=go(net,pc,sp,'ssh -l admin 192.168.1.1');assert.equal(r.prompt,"admin@192.168.1.1's password: ");go(net,pc,sp,'a');go(net,pc,sp,'b');r=go(net,pc,sp,'c');
assert.ok(r.text.includes('admin@192.168.1.1: Permission denied (password).'));assert.equal(sp.remote,null);
// Windows telnet messages
r=go(net,pc,sp,'telnet 192.168.1.1');assert.ok(r.text.includes('Connecting To 192.168.1.1...')&&r.text.includes('Could not open connection to the host, on port 23: Connect failed'),r.text);
// IOS ssh client
const R1s=S();go(net,R1,R1s,'enable');go(net,R1,R1s,'configure terminal');go(net,R1,R1s,'interface loopback 1');go(net,R1,R1s,'ip address 1.1.1.1 255.255.255.255');go(net,R1,R1s,'end');
r=go(net,R1,R1s,'ssh -l admin 1.1.1.1');assert.equal(r.prompt,'Password: ');r=go(net,R1,R1s,'S3cure-Pass');assert.equal(r.prompt,'R1#');r=go(net,R1,R1s,'exit');assert.ok(r.text.includes('[Connection to 1.1.1.1 closed by foreign host]'));

// ----- copy run start asks for the filename; write does not
net=build('Basic device setup');R1=net.devs.R1;s=S();go(net,R1,s,'enable');go(net,R1,s,'configure terminal');go(net,R1,s,'hostname HQ');go(net,R1,s,'end');
r=go(net,R1,s,'copy running-config startup-config');assert.equal(r.prompt,'Destination filename [startup-config]? ');assert.equal(R1.startup,undefined);
r=go(net,R1,s,'');assert.deepEqual(r.out,['Building configuration...','[OK]']);assert.ok(R1.startup.includes('hostname HQ'));
go(net,R1,s,'configure terminal');go(net,R1,s,'hostname HQ2');go(net,R1,s,'end');r=go(net,R1,s,'write memory');assert.deepEqual(r.out,['Building configuration...','[OK]']);assert.ok(R1.startup.includes('hostname HQ2'));
assert.ok(go(net,R1,s,'wr').out.includes('[OK]'));
// <cr> in a guide or journal is an empty line
go(net,R1,s,'copy run start');r=go(net,R1,s,'<cr>');assert.ok(r.out.includes('[OK]'));

// ----- reload: Save? only when something changed, confirm, then the saved config comes back and learned state is gone
net=build('Static routing');R1=net.devs.R1;s=S();go(net,R1,s,'enable');
assert.ok(R1.startup&&R1.startup.some(l=>/ip address 192.168.1.1/.test(l)),'a lab that builds a configured device has it saved');
r=go(net,R1,s,'reload');assert.equal(r.prompt,'Proceed with reload? [confirm]','nothing changed since the lab was built');
r=go(net,R1,s,'n');assert.equal(r.prompt,'R1#');assert.equal(R1.boots||0,0);
go(net,R1,s,'configure terminal');go(net,R1,s,'hostname TEMP');go(net,R1,s,'ip route 192.168.3.0 255.255.255.0 10.0.12.2');go(net,R1,s,'end');
go(net,net.devs.PC1,{mode:'pc'},'ping 10.0.12.2');assert.ok(R1.arpc&&Object.keys(R1.arpc).length,'ARP learned before the reload');
r=go(net,R1,s,'reload');assert.equal(r.prompt,'System configuration has been modified. Save? [yes/no]: ');
r=go(net,R1,s,'maybe');assert.ok(r.text.includes("Please answer 'yes' or 'no'."));r=go(net,R1,s,'no');assert.equal(r.prompt,'Proceed with reload? [confirm]');
r=go(net,R1,s,'');assert.ok(r.text.includes('%SYS-5-RELOAD')&&r.text.includes('System Bootstrap')&&r.text.includes('Press RETURN to get started!'),r.text);
assert.equal(R1.hostname,'R1','unsaved hostname lost');assert.equal(R1.statics.length,0,'unsaved route lost');assert.equal(R1.boots,1);assert.equal(R1.arpc,undefined,'ARP cache cleared');assert.ok(s.pace&&s.pace.t.length,'the boot plays over time');
assert.equal(r.prompt,'');r=go(net,R1,s,'');assert.equal(r.prompt,'R1>');assert.equal(s.mode,'user');
assert.equal(n2ip(R1.ifs['GigabitEthernet0/0'].ip),'192.168.1.1','the saved addressing is back');
// save yes keeps the change
go(net,R1,s,'enable');go(net,R1,s,'configure terminal');go(net,R1,s,'hostname KEEP');go(net,R1,s,'ip route 192.168.3.0 255.255.255.0 10.0.12.2');go(net,R1,s,'end');go(net,R1,s,'reload');r=go(net,R1,s,'yes');
assert.ok(r.text.includes('[OK]'));assert.equal(r.prompt,'Proceed with reload? [confirm]');go(net,R1,s,'');go(net,R1,s,'');assert.equal(R1.hostname,'KEEP');assert.equal(R1.statics.length,1,'saved route survives');
assert.ok(R1.startup.some(l=>/hostname KEEP/.test(l)));
// a factory device that was never saved boots into the setup dialog
net=build('Basic device setup');R1=net.devs.R1;s=S();go(net,R1,s,'enable');assert.equal(R1.startup,undefined);
go(net,R1,s,'reload');r=go(net,R1,s,'');assert.ok(r.text.includes('System Configuration Dialog'));assert.equal(r.prompt,'Would you like to enter the initial configuration dialog? [yes/no]: ');
r=go(net,R1,s,'no');assert.ok(r.text.includes('Press RETURN'));r=go(net,R1,s,'');assert.equal(r.prompt,'R1>');
// MAC tables are gone after a switch reloads; port-security sticky addresses stay only because the config was saved first
net=solve('Port security');const SW1=net.devs.SW1,ss=S();go(net,SW1,ss,'enable');
go(net,net.devs.PC1,{mode:'pc'},'ping '+n2ip(net.devs.PC2.ifs.FastEthernet0.ip));assert.ok(SW1.mact&&SW1.mact.length);
const sticky=Object.values(SW1.ifs).flatMap(i=>(i.ps&&i.ps.macs||[]).filter(m=>m.kind==='sticky').map(m=>m.mac));
go(net,SW1,ss,'reload');go(net,SW1,ss,'yes');r=go(net,SW1,ss,'');assert.ok(r.text.includes('C2960')||r.text.includes('Base ethernet MAC'),r.text);
assert.equal(SW1.mact,undefined);assert.deepEqual(Object.values(SW1.ifs).flatMap(i=>(i.ps&&i.ps.macs||[]).filter(m=>m.kind==='sticky').map(m=>m.mac)),sticky);

// ----- ping and traceroute with a source address: the reply must find its way back to that address
net=solve('Static routing');R1=net.devs.R1;s=S();go(net,R1,s,'enable');
r=go(net,R1,s,'ping 192.168.3.10 source g0/0');
assert.ok(r.out.includes('Packet sent with a source address of 192.168.1.1 '),r.text);assert.ok(/^\\.{0,3}!{2,5}$/.test(r.out.find(l=>/^[!.U]+$/.test(l))),r.text);
assert.ok(r.out.includes('Packet sent with a source address of 192.168.1.1 ')&&r.out[1].endsWith('timeout is 2 seconds:'));
r=go(net,R1,s,'ping 192.168.3.10 source 192.168.1.1');assert.ok(/!{4,5}/.test(r.text));
go(net,R1,s,'configure terminal');go(net,R1,s,'interface loopback 0');go(net,R1,s,'ip address 9.9.9.9 255.255.255.255');go(net,R1,s,'end');
r=go(net,R1,s,'ping 192.168.3.10 source loopback 0');assert.ok(r.out.includes('Packet sent with a source address of 9.9.9.9 '));assert.equal(r.out.find(l=>/^[!.U]+$/.test(l)),'.....','nobody has a route back to the loopback');
assert.equal(TRACE.r.ok,false,'the trace shows the reply failing');
r=go(net,R1,s,'ping 192.168.3.10 source 1.2.3.4');assert.deepEqual(r.out,['% Invalid source address - IP address not on any of our up interfaces']);
r=go(net,R1,s,'ping 192.168.3.10 source g0/9');assert.ok(r.out.includes(BAD));
r=go(net,R1,s,'traceroute 192.168.3.10 source g0/0');assert.ok(r.text.includes('Tracing the route to 192.168.3.10')&&/192\\.168\\.3\\.10/.test(r.out.at(-1)),r.text);
r=go(net,R1,s,'traceroute 192.168.3.10 source loopback 0');assert.ok(/\\*  \\*  \\*/.test(r.text),'no reply can come back to the loopback');
// the interactive (extended) ping asks the real questions, with defaults on Enter
r=go(net,R1,s,'ping');assert.equal(r.prompt,'Protocol [ip]: ');
r=go(net,R1,s,'ipx');assert.ok(r.text.includes('% Unknown protocol'));assert.equal(r.prompt,'Protocol [ip]: ');
r=go(net,R1,s,'');assert.equal(r.prompt,'Target IP address: ');r=go(net,R1,s,'192.168.3.10');assert.equal(r.prompt,'Repeat count [5]: ');
r=go(net,R1,s,'abc');assert.ok(r.text.includes('% A decimal number between 1 and 2147483647.'));assert.equal(r.prompt,'Repeat count [5]: ');
r=go(net,R1,s,'3');assert.equal(r.prompt,'Datagram size [100]: ');r=go(net,R1,s,'');assert.equal(r.prompt,'Timeout in seconds [2]: ');r=go(net,R1,s,'');assert.equal(r.prompt,'Extended commands [n]: ');
r=go(net,R1,s,'y');assert.equal(r.prompt,'Source address or interface: ');r=go(net,R1,s,'g0/0');assert.equal(r.prompt,'Type of service [0]: ');
for(const q of ['Set DF bit in IP header? [no]: ','Validate reply data? [no]: ','Data pattern [0xABCD]: ','Loose, Strict, Record, Timestamp, Verbose[none]: ','Sweep range of sizes [n]: ']){r=go(net,R1,s,'');assert.equal(r.prompt,q);}
r=go(net,R1,s,'');assert.ok(r.out[0]==='Type escape sequence to abort.'&&r.out[1]==='Sending 3, 100-byte ICMP Echos to 192.168.3.10, timeout is 2 seconds:'&&r.out[2]==='Packet sent with a source address of 192.168.1.1 ',r.text);
assert.ok(/^[!.]{3}$/.test(r.out[3]));assert.equal(r.prompt,'R1#');assert.ok(s.pace&&s.pace.t.length,'plays live');
// plain Enter everywhere gives a normal 5-echo ping
go(net,R1,s,'ping');go(net,R1,s,'');go(net,R1,s,'192.168.3.10');go(net,R1,s,'');go(net,R1,s,'');go(net,R1,s,'');r=go(net,R1,s,'');
assert.ok(r.out[1].startsWith('Sending 5, 100-byte')&&!r.text.includes('Packet sent with'),r.text);
// the interactive traceroute
r=go(net,R1,s,'traceroute');assert.equal(r.prompt,'Protocol [ip]: ');go(net,R1,s,'');r=go(net,R1,s,'192.168.3.10');assert.equal(r.prompt,'Source address: ');r=go(net,R1,s,'');assert.equal(r.prompt,'Numeric display [n]: ');
for(let k=0;k<7;k++){r=go(net,R1,s,'');}
assert.ok(r.text.includes('Tracing the route to 192.168.3.10'),r.text);assert.equal(r.prompt,'R1#');
// a PC still prints the usage text for a bare ping
assert.ok(go(net,net.devs.PC1,{mode:'pc'},'ping').text.includes('Usage: ping'));
}
`,context);
console.log('PASS prompts: enable secret and password prompts, console logout/login (password, local, locked), telnet sessions with VTY login and remote commands, three-strike close, syslog kept off the VTY, login block-for quiet mode and logs, password-required-but-none-set, OpenSSH host key and password flow, Windows telnet messages, IOS ssh client, copy run start filename prompt, write, <cr>, reload with Save?/confirm, saved config restored, learned state cleared, setup dialog on a factory device, switch reload, ping/traceroute source (address, interface, invalid), interactive extended ping and traceroute.');
