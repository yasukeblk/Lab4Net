// The free-build editor reuses the unchanged simulator, without a browser dependency.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const extract=label=>html.split(`//${label}-START`)[1].split(`//${label}-END`)[0];
const ctx=vm.createContext({console});
vm.runInContext(extract('ENGINE')+extract('SANDBOX')+'\nthis.api={sandboxModel,sandboxApply,canPing,ip2n,TRACE:()=>TRACE};',ctx);
const {sandboxModel,sandboxApply,canPing,ip2n}=ctx.api;
const events=[
 {op:'add',name:'PC1',type:'pc',x:100,y:100},{op:'add',name:'SW1',type:'switch',x:260,y:100},{op:'add',name:'PC2',type:'pc',x:430,y:100},
 {op:'link',a:'PC1',ai:'f0',b:'SW1',bi:'f0/1'},{op:'link',a:'SW1',ai:'f0/2',b:'PC2',bi:'f0'},
 {op:'command',device:'PC1',line:'ipconfig /ip 192.168.1.10 255.255.255.0'},
 {op:'command',device:'PC2',line:'ipconfig /ip 192.168.1.20 255.255.255.0'}
];
const project=()=>({format:'lab4net-sandbox',version:1,events});
const m=sandboxModel(project());
assert.ok(canPing(m.net,m.net.devs.PC1,ip2n('192.168.1.20')));
sandboxApply(m,{op:'command',device:'PC1',line:'ping 192.168.1.20'});
assert.deepEqual(Array.from(ctx.api.TRACE().f.hops.path),['PC1','SW1','PC2']);
assert.throws(()=>sandboxApply(m,{op:'link',a:'PC1',ai:'f0',b:'SW1',bi:'f0/3'}),/free physical ports/);
assert.throws(()=>sandboxApply(m,{op:'link',a:'SW1',ai:'vlan1',b:'PC2',bi:'f0'}),/free physical ports/);
assert.throws(()=>sandboxApply(m,{op:'move',name:'PC1',x:Infinity,y:100}),/position/);
assert.throws(()=>sandboxModel({...project(),events:[{op:'add',name:'<script>',type:'router',x:100,y:100}]}),/name/);
const edit=e=>{sandboxApply(m,e);events.push(e);};
edit({op:'unlink',name:'SW1',port:'f0/2'});
assert.equal(canPing(m.net,m.net.devs.PC1,ip2n('192.168.1.20')),false);
assert.equal(m.net.devs.PC2.ifs.FastEthernet0.link,null);
edit({op:'link',a:'SW1',ai:'f0/2',b:'PC2',bi:'f0'});
edit({op:'add',name:'R1',type:'router',x:300,y:180});
edit({op:'link',a:'SW1',ai:'g0/1',b:'R1',bi:'g0/0'});
for(const line of ['enable','configure terminal','interface g0/0','ip address 192.168.1.1 255.255.255.0','no shutdown','end'])edit({op:'command',device:'R1',line});
assert.ok(canPing(m.net,m.net.devs.PC1,ip2n('192.168.1.1')));
edit({op:'move',name:'R1',x:350,y:180});
// Chronological replay preserves a lease acquired before later topology changes.
for(const line of ['configure terminal','ip dhcp excluded-address 192.168.1.1 192.168.1.30','ip dhcp pool LAN','network 192.168.1.0 255.255.255.0','default-router 192.168.1.1','end'])edit({op:'command',device:'R1',line});
edit({op:'command',device:'PC2',line:'ipconfig /renew'});
const leased=m.net.devs.PC2.ifs.FastEthernet0.ip;
assert.equal(leased,ip2n('192.168.1.31'));
edit({op:'unlink',name:'R1',port:'g0/0'});
const restored=sandboxModel(JSON.parse(JSON.stringify(project())));
assert.equal(restored.net.devs.PC2.ifs.FastEthernet0.ip,leased);
assert.equal(restored.sess.R1.mode,'priv');
assert.deepEqual(Array.from(restored.pos.R1),[350,180]);
assert.equal(restored.net.links.length,m.net.links.length);
edit({op:'remove',name:'SW1'});
assert.equal(m.net.links.length,0);
assert.equal(m.net.devs.PC1.ifs.FastEthernet0.link,null);
assert.equal(m.net.devs.PC2.ifs.FastEthernet0.link,null);
assert.equal(sandboxModel(project()).net.devs.SW1,undefined);
console.log('PASS sandbox: topology building, port validation, IOS configuration, actual switch path, cable failure/removal, device removal, movement, DHCP and ordered project restoration.');
