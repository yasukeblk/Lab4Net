// Real-life ping and traceroute output: ARP on the first echo, unreachables from routers, Windows quirks,
// extended options, ARP tables, and the timing data the console uses to play output live.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const context=vm.createContext({assert,console});
vm.runInContext(engine+`
function solve(title){const lab=LABS.find(l=>l.title===title),net=lab.build();for(const [name,commands] of Object.entries(lab.solution)){const d=net.devs[name],s={mode:d.type==='pc'?'pc':'user'};commands.forEach(c=>execLine(net,d,s,c));}return net;}
function cmd(net,dev,line){const d=net.devs[dev],s={mode:d.type==='pc'?'pc':'priv'};const out=execLine(net,d,s,line);return {out,text:out.join('\\n'),pace:s.pace};}
const bang=r=>r.out.find(l=>/^[!.U]+$/.test(l));
const pacedLines=p=>p.t.length;

// A fresh network: every router that has to ARP for its next hop drops one echo, then the cache is warm.
let net=solve('Static routing');
let r=cmd(net,'R1','ping 192.168.3.10');
assert.match(bang(r),/^\\.+!+$/,'first ping loses echoes to ARP: '+bang(r));
assert.equal(pacedLines(r.pace),r.out.length,'timing covers every output line');
assert.equal(bang(cmd(net,'R1','ping 192.168.3.10')),'!!!!!');
assert.match(cmd(net,'R1','ping 192.168.3.10').text,/Success rate is 100 percent \\(5\\/5\\), round-trip min\\/avg\\/max = \\d+\\/\\d+\\/\\d+ ms/);
assert.match(cmd(net,'R1','show ip arp').text,/Internet  10\\.0\\.12\\.2 +0   \\S+ +ARPA   GigabitEthernet0\\/1/);
cmd(net,'R1','clear arp-cache');
assert.match(bang(cmd(net,'R1','ping 192.168.3.10')),/^\\.!!!!$/,'only R1 needs to ARP again');
// Extended ping.
r=cmd(net,'R1','ping 192.168.3.10 repeat 100 size 1500');
assert.match(r.text,/Sending 100, 1500-byte ICMP Echos/);
assert.equal(r.out.filter(l=>/^!+$/.test(l)).map(l=>l.length).join(','),'70,30','IOS wraps at 70 characters');
assert.equal(cmd(net,'R1','ping 192.168.3.10 repeat x').text,BAD);
// The reply path still decides the outcome; the same TRACE drives the map animation.
LIVE=true;cmd(net,'PC1','ping 192.168.3.10');LIVE=false;
r=cmd(net,'PC1','ping 192.168.3.10');
assert.equal(r.out.filter(l=>/^Reply from 192\\.168\\.3\\.10: bytes=32 time(<1|=\\d+)ms TTL=125$/.test(l)).length,4,'TTL drops by one per router');
assert.match(r.text,/Lost = 0 \\(0% loss\\),\\nApproximate round trip times in milli-seconds:/);
assert.match(cmd(net,'PC1','ping -n 2 -l 1000 192.168.1.1').text,/Pinging 192\\.168\\.1\\.1 with 1000 bytes of data:[\\s\\S]*Sent = 2/);
assert.match(cmd(net,'PC1','arp -a').text,/192\\.168\\.1\\.1 +00-e0-b0-\\S+ +dynamic/);
r=cmd(net,'PC1','tracert 192.168.3.10');
assert.match(r.text,/  1 .*192\\.168\\.1\\.1\\n  2 .*10\\.0\\.12\\.2\\n  3 .*10\\.0\\.23\\.2\\n  4 .*192\\.168\\.3\\.10\\n\\nTrace complete\\./);
r=cmd(net,'R1','traceroute 192.168.3.10');
assert.match(r.text,/  1 10\\.0\\.12\\.2 \\d msec \\d msec \\d msec\\n  2 10\\.0\\.23\\.2 .*\\n  3 192\\.168\\.3\\.10 /);
assert.ok(r.out.length<10,'a working trace stops at the destination');

// Return route missing: the request arrives but nothing comes back. Hops past the break print * to hop 30.
net=solve('Static routing');net.devs.R3.statics=[];
r=cmd(net,'R1','ping 192.168.3.10');assert.equal(bang(r),'.....');assert.match(r.text,/Success rate is 0 percent \\(0\\/5\\)$/);
assert.match(cmd(net,'PC1','ping 192.168.3.10').text,/Request timed out\\.[\\s\\S]*Received = 0, Lost = 4 \\(100% loss\\),/);
r=cmd(net,'R1','traceroute 192.168.3.10');
assert.match(r.out[3],/^  1 10\\.0\\.12\\.2 /);assert.match(r.out[4],/^  2 \\*  \\*  \\*$/,'R3 cannot answer without a route back');assert.match(r.out.at(-1),/^ 30 \\*/);

// A router with no route answers with an ICMP unreachable: U.U.U on IOS, !H in traceroute,
// and on Windows a "Destination host unreachable" that still counts as received.
net=solve('Static routing');net.devs.R2.statics=net.devs.R2.statics.filter(s=>s.net!==ip2n('192.168.3.0'));
assert.equal(bang(cmd(net,'R1','ping 192.168.3.10')),'U.U.U');
assert.match(cmd(net,'R1','traceroute 192.168.3.10').out.at(-1),/^  2 10\\.0\\.12\\.2 !H  !H  !H$/);
r=cmd(net,'PC1','ping 192.168.3.10');
assert.equal(r.out.filter(l=>l==='Reply from 10.0.12.2: Destination host unreachable.').length,4);
assert.match(r.text,/Received = 4, Lost = 0 \\(0% loss\\),/);assert.doesNotMatch(r.text,/Approximate round trip/);
assert.match(cmd(net,'PC1','tracert 192.168.3.10').text,/  3  10\\.0\\.12\\.2  reports: Destination host unreachable\\.\\n\\nTrace complete\\./);

// An inbound ACL drop is reported by the router that applied it.
net=solve('Extended named ACL');
assert.equal(cmd(net,'PC1','ping 192.168.3.10').out.filter(l=>/^Reply from 192\\.168\\.1\\.1: Destination host unreachable\\.$/.test(l)).length,4);
assert.match(cmd(net,'PC1','tracert 192.168.3.10').text,/  1  192\\.168\\.1\\.1  reports:/);

// Host-side failures.
net=LABS.find(l=>l.title==='Static routing').build();
assert.match(cmd(net,'PC1','ping 192.168.1.99').text,/Reply from 192\\.168\\.1\\.10: Destination host unreachable\\./,'no ARP reply on the local subnet');
net.devs.PC1.gw=null;assert.equal(nextHop(net,net.devs.PC1,ip2n('10.9.9.9')),null);
assert.match(cmd(net,'PC1','ping 10.9.9.9').text,/PING: transmit failed\\. General failure\\.[\\s\\S]*Received = 0, Lost = 4/,'no default gateway');
assert.match(cmd(net,'PC1','ping banana').text,/could not find host banana/);
assert.match(cmd(net,'PC1','ping -x 1.1.1.1').text,/^Bad option/);

// Abort (Ctrl+C / Ctrl+Shift+6) summaries are built from the echoes already sent.
net=solve('Static routing');cmd(net,'R1','ping 192.168.3.10');
r=cmd(net,'R1','ping 192.168.3.10 repeat 20');assert.equal(r.pace.abort(3)[0].slice(0,46),'Success rate is 100 percent (3/3), round-trip ');
r=cmd(net,'PC1','ping 192.168.3.10');assert.match(r.pace.abort(2).join('\\n'),/Sent = 2, Received = 2[\\s\\S]*Control-C\\n\\^C$/);
`,context);
console.log('PASS ping: ARP on the first echo, warm cache, clear arp-cache, extended ping, Windows TTL and statistics, tracert/traceroute paths, return-route stars, U.U.U and !H, unreachable counted as received, ACL reports, host-side failures, abort summaries.');
