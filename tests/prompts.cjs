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
}
`,context);
console.log('PASS prompts: enable secret and password prompts, console logout/login (password, local, locked), telnet sessions with VTY login and remote commands, three-strike close, syslog kept off the VTY, login block-for quiet mode and logs, password-required-but-none-set, OpenSSH host key and password flow, Windows telnet messages, IOS ssh client, copy run start filename prompt, write, <cr>, reload with Save?/confirm, saved config restored, learned state cleared, setup dialog on a factory device, switch reload.');
