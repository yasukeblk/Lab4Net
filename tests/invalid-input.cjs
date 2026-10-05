const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),ctx=vm.createContext({console});
vm.runInContext(html.split('//ENGINE-START')[1].split('//ENGINE-END')[0]+'\nthis.api={LABS,execLine,promptOf};',ctx);
const {LABS,execLine,promptOf}=ctx.api,net=LABS[0].build(),d=Object.values(net.devs).find(d=>d.type==='switch'),s={mode:'user'};
function invalid(line,token){const prompt=promptOf(d,s),before=JSON.stringify(d),mode=s.mode,out=execLine(net,d,s,line);
 assert.equal(out.at(-1),"% Invalid input detected at '^' marker.",line);
 assert.equal(out.at(-2),' '.repeat(prompt.length+line.indexOf(token))+'^',line);
 assert.equal(JSON.stringify(d),before,'rejected command must not change configuration');assert.equal(s.mode,mode);
}
invalid('shwo version','shwo');invalid('show ip banana','banana');invalid('  show   ip   banana','banana');invalid('configure terminal','configure');invalid('show version extra','extra');
assert.equal(execLine(net,d,s,'show ip').at(-1),'% Incomplete command.');
execLine(net,d,s,'en');execLine(net,d,s,'conf t');
invalid('vlan blue','blue');invalid('ip default-gateway 999.1.1.1','999.1.1.1');invalid('do show ip banana','banana');invalid('  do   show  ip banana','banana');
execLine(net,d,s,'interface f0/1');invalid('switchport mode banana','banana');invalid('ip address 192.0.2.1 255.255.255.0','255.255.255.0');invalid('do show version extra','extra');
execLine(net,d,s,'end');execLine(net,d,s,'conf t');execLine(net,d,s,'hostname LONG-SWITCH-NAME');invalid('show ip route','show');
const pc=Object.values(net.devs).find(d=>d.type==='pc');if(pc){const ps={mode:'pc'},line='ping nope',out=execLine(net,pc,ps,line);assert.equal(out[0],' '.repeat(promptOf(pc,ps).length+5)+'^');}
console.log('PASS invalid input: rejected token, prompt/mode/hostname alignment, spacing, nested do, invalid values, extra tokens, incomplete commands and unchanged configuration.');
