// Console realism: IOS error markers, incomplete and ambiguous commands, hostname lookup on a typo, Windows
// errors on PCs, output modifiers, and the everyday commands added in the console realism build.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const context=vm.createContext({assert,console});
vm.runInContext(engine+`
function solve(title){const lab=LABS.find(l=>l.title===title),net=lab.build();for(const [name,commands] of Object.entries(lab.solution)){const d=net.devs[name],s={mode:d.type==='pc'?'pc':'user'};commands.forEach(c=>execLine(net,d,s,c));}return net;}
const sess={};
function cmd(net,dev,line){const d=net.devs[dev],s=sess[dev]||(sess[dev]={mode:d.type==='pc'?'pc':'priv'});const p=promptOf(d,s);const out=execLine(net,d,s,line);return {out,text:out.join('\\n'),p,pace:s.pace};}
const caretUnder=(r,line,word)=>{assert.equal(r.out[1],BAD);assert.equal(r.out[0].length-1,r.p.length+line.indexOf(word),'caret under '+word+': '+JSON.stringify(r.out[0]));};

let net=solve('Static routing');
// Invalid input: the ^ sits under the first word nothing accepts.
let line='show ip interfce brief',r=cmd(net,'R1',line);caretUnder(r,line,'interfce');
line='  show ip route banana';r=cmd(net,'R1',line);assert.match(r.out[1],/% Invalid input/);
// Incomplete, and an exact keyword is never an abbreviation of a longer one (ip is not ipv6).
assert.equal(cmd(net,'R1','show').text,'% Incomplete command.');
cmd(net,'R1','configure terminal');cmd(net,'R1','interface g0/0');
assert.equal(cmd(net,'R1','ip add 1.1.1.1').text,'% Incomplete command.');
line='ip address 1.1.1.1 255.255.255.1';r=cmd(net,'R1',line);assert.match(r.text,/^Bad mask|Invalid/);
// Values a handler rejects get the ^ under the bad value.
line='duplex sideways';r=cmd(net,'R1',line);caretUnder(r,line,'sideways');
cmd(net,'R1','end');
// Ambiguous abbreviations are refused instead of running the first match.
assert.equal(cmd(net,'R1','sh i').text,'% Ambiguous command:  "sh i"');
assert.match(cmd(net,'R1','sh ip int br').text,/GigabitEthernet0\\/0 +192\\.168\\.1\\.1/);
assert.match(cmd(net,'R1','sh run').text,/^Building configuration/,'run and running-config are one keyword');
// A single unknown word in exec mode is looked up as a host (the reason for no ip domain-lookup).
r=cmd(net,'R1','hellp');
assert.deepEqual(r.out,['Translating "hellp"...domain server (255.255.255.255)','% Unknown command or computer name, or unable to find computer address']);
assert.equal(r.pace.t[1],5000,'the lookup pauses');
cmd(net,'R1','configure terminal');assert.match(cmd(net,'R1','hellp').text,/\\^\\n% Invalid input/,'config mode never looks up hosts');
cmd(net,'R1','no ip domain-lookup');cmd(net,'R1','ip host R3 192.168.3.1');cmd(net,'R1','end');
assert.deepEqual(cmd(net,'R1','hellp').out,['Translating "hellp"','% Unknown command or computer name, or unable to find computer address']);
assert.match(cmd(net,'R1','ping R3').text,/Sending 5, 100-byte ICMP Echos to 192\\.168\\.3\\.1/);
assert.equal(cmd(net,'R1','ping R9').text,'% Unrecognized host or address, or protocol not running.');
assert.match(cmd(net,'R1','show hosts').text,/R3 +None +\\(perm, OK\\) +0 +IP +192\\.168\\.3\\.1/);
// Windows errors on PCs.
assert.equal(cmd(net,'PC1','foo').text,"'foo' is not recognized as an internal or external command,\\noperable program or batch file.");
assert.equal(cmd(net,'PC1','ipconfig /bogus').text,'Error: unrecognized or incomplete command line.');
assert.match(cmd(net,'PC1','ping').text,/Usage: ping \\[-t\\]/);
assert.equal(cmd(net,'PC1','hostname').text,'PC1');
assert.match(cmd(net,'PC1','netstat').text,/Active Connections/);
assert.match(cmd(net,'PC1','tracert -d 192.168.1.1').text,/192\\.168\\.1\\.1\\n\\nTrace complete\\./);
// Output modifiers.
assert.equal(cmd(net,'R1','show run | include ip route').out.length,2);
assert.ok(cmd(net,'R1','show ip int br | exclude down').out.every(l=>!/down/.test(l)));
assert.match(cmd(net,'R1','show ip route | begin Gateway').out[0],/^Gateway of last resort/);
assert.deepEqual(cmd(net,'R1','show run | section GigabitEthernet0/1').out,['interface GigabitEthernet0/1',' ip address 10.0.12.1 255.255.255.252']);
assert.match(cmd(net,'R1','show run | count interface').text,/^Number of lines which match regexp = 3$/);
assert.equal(cmd(net,'R1','show run |').text,'% Incomplete command.');
line='show run | grab x';r=cmd(net,'R1',line);caretUnder(r,line,'grab');
line='ping 1.1.1.1 | include !';r=cmd(net,'R1',line);caretUnder(r,line,'|');
// Help for ? includes descriptions and the output modifier.
assert.ok(candidates(net.devs.R1,'priv','show ip route ').includes('|'));
assert.deepEqual(candidates(net.devs.R1,'priv','show run | '),['begin','count','exclude','include','section']);
assert.equal(KWHELP.show,'Show running system information');

// Everyday commands.
assert.match(cmd(net,'R1','show version').text,/C2900 Software[\\s\\S]*R1 uptime is[\\s\\S]*3 Gigabit Ethernet interfaces[\\s\\S]*Configuration register is 0x2102$/);
cmd(net,'R1','configure terminal');cmd(net,'R1','interface g0/1');
['description TO-R2','bandwidth 10000','duplex full','speed 100'].forEach(c=>assert.deepEqual(cmd(net,'R1',c).out,[]));
assert.match(cmd(net,'R1','speed 1000x').text,/% Invalid/);cmd(net,'R1','end');
assert.match(cmd(net,'R1','show running-config interface g0/1').text,/interface GigabitEthernet0\\/1\\n description TO-R2\\n bandwidth 10000\\n ip address 10\\.0\\.12\\.1 255\\.255\\.255\\.252\\n duplex full\\n speed 100\\nend$/);
r=cmd(net,'R1','show interfaces g0/1').text;assert.match(r,/Hardware is iGbE[\\s\\S]*Description: TO-R2[\\s\\S]*BW 10000 Kbit\\/sec[\\s\\S]*Full Duplex, 100Mbps/);
assert.match(cmd(net,'R1','show interfaces description').text,/Gi0\\/1 +up +up +TO-R2/);
assert.equal(ospfCost(net.devs.R1,net.devs.R1.ifs['GigabitEthernet0/1']),10,'bandwidth 10000 Kbit/s gives OSPF cost 10');
assert.deepEqual(cmd(net,'R1','terminal length 0').out,[]);
// Password policy and login protection.
cmd(net,'R1','configure terminal');cmd(net,'R1','security passwords min-length 8');
assert.equal(cmd(net,'R1','enable secret short').text,'% Password too short - must be at least 8 characters. Password configuration failed');
assert.deepEqual(cmd(net,'R1','enable algorithm-type scrypt secret LongEnough1').out,[]);assert.equal(net.devs.R1.secret,'LongEnough1');
cmd(net,'R1','login block-for 60 attempts 3 within 30');cmd(net,'R1','end');
r=cmd(net,'R1','show running-config').text;
assert.match(r,/enable secret 9 \\$9\\$/);assert.match(r,/security passwords min-length 8\\nlogin block-for 60 attempts 3 within 30/);assert.match(r,/no ip domain-lookup\\nip host R3 192\\.168\\.3\\.1/);
assert.match(cmd(net,'R1','show login').text,/If more than 3 login failures occur in 30 seconds/);
// debug ip icmp queues messages on the router's own console.
net=solve('Static routing');cmd(net,'R1','debug ip icmp');assert.match(cmd(net,'R1','show debugging').text,/ICMP packet debugging is on/);
LIVE=true;execLine(net,net.devs.PC1,{mode:'pc'},'ping -n 2 192.168.1.1');LIVE=false;
assert.equal((net.devs.R1.conq||[]).filter(l=>/ICMP: echo reply sent, src 192\\.168\\.1\\.1, dst 192\\.168\\.1\\.10, topology BASE/.test(l)).length,2);
assert.equal(cmd(net,'R1','undebug all').text,'All possible debugging has been turned off');
// Switch commands.
net=solve('VLANs and access ports');
assert.match(cmd(net,'SW1','show vlan id 10').text,/^VLAN Name[\\s\\S]*\\n10 +SALES +active/);
assert.equal(cmd(net,'SW1','show vlan id 99').text,'VLAN id 99 not found in current VLAN database');
assert.match(cmd(net,'SW1','show version').text,/C2960 Software[\\s\\S]*Model number +: WS-C2960/);
`,context);
console.log('PASS console: ^ marker, incomplete, ambiguous, exact keywords, hostname lookup, Windows errors, output modifiers, ? help, show version, show vlan id, show running-config interface, duplex/speed/bandwidth, show interfaces, host table, password policy, login block-for, debug ip icmp.');
