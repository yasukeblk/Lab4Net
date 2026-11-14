// ---------- ping and traceroute with a source, and the interactive (extended) forms ----------
// The source must be an address on one of this device's up interfaces, or such an interface's name.
function srcResolve(net,d,txt){const up=Object.values(d.ifs).filter(i=>i.ip!==null&&ifUp(net,d,i));
  if(isIp(txt)){const ip=ip2n(txt);return up.some(i=>i.ip===ip)?{ip}:{err:'% Invalid source address - IP address not on any of our up interfaces'};}
  const n=parseIf(txt);if(!n||!d.ifs[n])return {err:BAD};const i=d.ifs[n];return i.ip!==null&&ifUp(net,d,i)?{ip:i.ip}:{err:'% Invalid source address - IP address not on any of our up interfaces'};}
function pingDialog(e){const s=e.s,d=e.d,net=e.net,q={dst:null,count:5,size:100,timeout:2,src:null,df:false,sweep:null};
  const E=env=>Object.assign({},env,{d,net});
  const num=(txt,def,lo,hi,set,next)=>{const again=()=>ask(s,txt+' ['+def+']: ',(a,env)=>{a=a.trim();if(a===''){set(def);return next(env);}if(!/^\d+$/.test(a)||+a<lo||+a>hi){env.out('% A decimal number between '+lo+' and '+hi+'.');return again();}set(+a);next(env);});again();};
  const fire=env=>{if(!q.sweep)return iosPing(E(env),q.dst,q.count,q.size,q.src,q.timeout,{df:q.df});
    const {min,max,step}=q.sweep,sizes=[];for(let v=min;v<=max;v+=step)for(let k=0;k<q.count;k++)sizes.push(v);
    iosPing(E(env),q.dst,sizes.length,min,q.src,q.timeout,{df:q.df,sizes,maxSize:max,sizeLabel:'['+min+'..'+max+']'});};
  const yes=a=>/^y(es)?$/i.test(a.trim());
  const sweep=env=>ask(s,'Sweep range of sizes [n]: ',(a,e9)=>{if(!yes(a))return fire(e9);q.sweep={min:36,max:18024,step:1};
    num('Sweep min size',36,36,18024,v=>q.sweep.min=v,()=>num('Sweep max size',18024,36,18024,v=>q.sweep.max=Math.max(v,q.sweep.min),()=>num('Sweep interval',1,1,18024,v=>q.sweep.step=v,fire)));});
  const tail=env=>ask(s,'Type of service [0]: ',(_,e4)=>ask(s,'Set DF bit in IP header? [no]: ',(a5,e5)=>{q.df=yes(a5);ask(s,'Validate reply data? [no]: ',(_,e6)=>ask(s,'Data pattern [0xABCD]: ',(_,e7)=>ask(s,'Loose, Strict, Record, Timestamp, Verbose[none]: ',(_,e8)=>sweep(e8))));}));
  const source=()=>ask(s,'Source address or interface: ',(a,env)=>{a=a.trim();if(!a)return tail(env);const r=srcResolve(net,d,a);if(r.err){env.out(r.err==BAD?'% Invalid source address - IP address not on any of our up interfaces':r.err);return source();}q.src=r.ip;tail(env);});
  const ext=()=>ask(s,'Extended commands [n]: ',(a,env)=>{a=a.trim().toLowerCase();if(a===''||a==='n'||a==='no')return fire(env);if(a==='y'||a==='yes')return source();env.out('% Please answer \'yes\' or \'no\'.');ext();});
  const target=()=>ask(s,'Target IP address: ',(a,env)=>{a=a.trim();const ip=isIp(a)?ip2n(a):a?resolveHost(E(env),a):null;if(ip==null){if(!a)env.out('% Bad IP address or host name');return target();}q.dst=ip;
    num('Repeat count',5,1,2147483647,v=>q.count=v,()=>num('Datagram size',100,36,18024,v=>q.size=v,()=>num('Timeout in seconds',2,0,3600,v=>q.timeout=v,ext)));});
  const proto=()=>ask(s,'Protocol [ip]: ',(a,env)=>{a=a.trim().toLowerCase();if(a&&a!=='ip'){env.out('% Unknown protocol - "'+a+'", type "ping ?" for help');return proto();}target();});
  proto();}
function traceDialog(e){const s=e.s,d=e.d,net=e.net,q={dst:null,src:null};const E=env=>Object.assign({},env,{d,net});
  const fire=env=>iosTrace(E(env),q.dst,q.src);
  const rest=env=>ask(s,'Numeric display [n]: ',(_,e1)=>ask(s,'Timeout in seconds [3]: ',(_,e2)=>ask(s,'Probe count [3]: ',(_,e3)=>ask(s,'Minimum Time to Live [1]: ',(_,e4)=>ask(s,'Maximum Time to Live [30]: ',(_,e5)=>ask(s,'Port Number [33434]: ',(_,e6)=>ask(s,'Loose, Strict, Record, Timestamp, Verbose[none]: ',(_,e7)=>fire(e7))))))));
  const source=()=>ask(s,'Source address: ',(a,env)=>{a=a.trim();if(!a)return rest(env);const r=srcResolve(net,d,a);if(r.err){env.out(r.err==BAD?'% Invalid source address - IP address not on any of our up interfaces':r.err);return source();}q.src=r.ip;rest(env);});
  const target=()=>ask(s,'Target IP address: ',(a,env)=>{a=a.trim();const ip=isIp(a)?ip2n(a):a?resolveHost(E(env),a):null;if(ip==null){if(!a)env.out('% Bad IP address or host name');return target();}q.dst=ip;source();});
  const proto=()=>ask(s,'Protocol [ip]: ',(a,env)=>{a=a.trim().toLowerCase();if(a&&a!=='ip'){env.out('% Unknown protocol - "'+a+'", type "traceroute ?" for help');return proto();}target();});
  proto();}
Cn(EX,'ping',e=>pingDialog(e),['router','switch']);
Cn(EX,'traceroute',e=>traceDialog(e),['router','switch']);
Object.assign(KWHELP,{source:'Specify source address or name'});
Object.assign(WHYC,{
'ping':'The extended ping: IOS asks for the target, repeat count, size, timeout, and with "Extended commands" a source address. Pinging from a LAN interface tests the return path to that network, which a plain ping from the router never does.',
'traceroute':'The extended traceroute: asks for the target and a source address, then shows each hop. A source on the far side of the router proves both directions of routing.',
'traceroute <ip> <rest>':'traceroute x source y: trace from a chosen address or interface, so the replies have to find their way back to that network.'});
