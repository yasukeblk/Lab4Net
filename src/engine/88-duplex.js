// ---------- duplex and speed: autonegotiation, mismatches, interface counters ----------
// Each physical port settles its speed and duplex against the far end (IEEE 802.3 rules): two forced, different
// speeds keep the link down; a forced speed on one end is sensed by an auto end. A port stops autonegotiating only
// when BOTH its speed and duplex are hard-coded; forcing just one of them limits what it advertises. An
// autonegotiating port facing one that does not negotiate senses the speed and falls back to half duplex at 10 or
// 100 Mb/s, and full at 1000 Mb/s (half-duplex gigabit does not exist in practice). So the classic mismatch is
// "speed 100 + duplex full" on one end against auto on the other. A mismatch keeps the link up and lets light
// traffic through, logs %CDP-4-DUPLEX_MISMATCH on both ends when CDP sees it, and shows up in the counters: late
// collisions on the half-duplex end, CRC errors and runts on the full-duplex end. PC NICs always autonegotiate.
const defSpeed=i=>i.name.startsWith('Gigabit')?'1000':'100';
function linkSettle(net,d,i){const p=i.link&&net.devs[i.link.dev],q=p&&p.ifs[i.link.ifn];
  if(!physIf(i)||!q)return {speed:i.speed||defSpeed(i),duplex:i.duplex||'full',farDuplex:i.duplex||'full',speedOk:true,mismatch:false};
  const my=i.speed||null,far=q.speed||null;let speed,speedOk=true;
  if(my&&far){speed=my;speedOk=my===far;}else if(my)speed=my;else if(far)speed=far;else speed=String(Math.min(+defSpeed(i),+defSpeed(q)));
  const neg=x=>!(x.speed&&x.duplex),adv=x=>x.duplex?[x.duplex]:['full','half'],fall=+speed>=1000?'full':'half';
  let duplex,farDuplex;
  if(neg(i)&&neg(q)){const c=adv(i).filter(x=>adv(q).includes(x));if(c.length)duplex=farDuplex=c.includes('full')?'full':'half';else{duplex=i.duplex;farDuplex=q.duplex;}}
  else if(neg(i)){duplex=i.duplex||fall;farDuplex=q.duplex;}
  else if(neg(q)){duplex=i.duplex;farDuplex=q.duplex||fall;}
  else{duplex=i.duplex;farDuplex=q.duplex;}
  return {speed,duplex,farDuplex,speedOk,mismatch:speedOk&&duplex!==farDuplex};}
{const up0=ifUp;ifUp=function(net,d,i){const r=up0(net,d,i);if(!r||!physIf(i)||!i.link)return r;return linkSettle(net,d,i).speedOk;};}
function duplexMismatches(net,d){if(d.type==='pc'||d.cdp===false)return [];const r=[];
  for(const x of cdpPeers(net,d)){const s=linkSettle(net,d,x.i);if(!s.mismatch)continue;
    r.push('%CDP-4-DUPLEX_MISMATCH: duplex mismatch discovered on '+x.i.name+' (not '+s.farDuplex+' duplex), with '+x.p.hostname+' '+x.pi.name+' ('+s.farDuplex+' duplex).');}
  return r;}
{const ex0=execLine;execLine=function(net,d,s,line){const devs=Object.values(net.devs).filter(x=>x.type!=='pc'),before=new Map(devs.map(x=>[x,new Set(duplexMismatches(net,x))]));
  const out=ex0(net,d,s,line);
  const L=net.dupLog||(net.dupLog={}),now=simNow();
  for(const x of devs){const b=before.get(x);for(const m of duplexMismatches(net,x)){const k=x.name+'|'+m;if(b.has(m)&&L[k]!=null&&now-L[k]<60000)continue;if(b.has(m)&&L[k]==null){L[k]=now;continue;}L[k]=now;if(x===d)out.push(m);else logEvent(net,x,m);}}
  return out;};}
// Counters per physical port: packets and bytes in and out, and the errors a mismatch causes.
const cntOf=i=>i.cnt||(i.cnt={in:0,inB:0,out:0,outB:0,crc:0,runts:0,late:0,resets:1,cleared:null});
function portTraffic(net,dev,ifn,dir,n,bytes){const d=net.devs[dev],i=d&&d.ifs[ifn];if(!i||!physIf(i))return;const c=cntOf(i);
  if(dir==='in'){c.in+=n;c.inB+=n*bytes;}else{c.out+=n;c.outB+=n*bytes;}
  const s=linkSettle(net,d,i);if(!s.mismatch)return;const f=c.f||(c.f={crc:0,runts:0,late:0}),up=(k,r)=>{f[k]+=n*r;c[k]=Math.max(c[k],Math.ceil(f[k]-1e-9));};
  if(s.duplex==='half'&&dir==='out')up('late',0.3);else if(s.duplex==='full'&&dir==='in'){up('crc',0.3);up('runts',0.1);}}
// Count one direction of a live result (its Layer 2 events) as n frames of the given size.
function trafficCount(net,res,n,bytes){if(!res||!res.hops||!res.hops.l2||n<=0)return;bytes=bytes||114;
  for(const ev of res.hops.l2){const path=ev.seg;
    // the sender's own port, then every link the frame (or its flood) crossed
    const sd=net.devs[ev.from];if(sd){const i=Object.values(sd.ifs).find(x=>x.link&&x.link.dev===path[1]);if(i)portTraffic(net,ev.from,i.name,'out',n,bytes);}
    const seen=new Set();const links=ev.edges&&ev.edges.length?ev.edges.map(e=>[e[0],e[1]]):[];
    for(let k=0;k<path.length-1;k++)links.push([path[k],path[k+1]]);
    for(const [a,b] of links){const key=a+'>'+b;if(seen.has(key))continue;seen.add(key);const A=net.devs[a],B=net.devs[b];if(!A||!B)continue;
      const ai=Object.values(A.ifs).find(x=>x.link&&x.link.dev===b),bi=ai&&B.ifs[ai.link.ifn];if(!ai||!bi)continue;
      if(a!==ev.from)portTraffic(net,a,ai.name,'out',n,bytes);portTraffic(net,b,bi.name,'in',n,bytes);}}}
const cntHms=s=>[Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':');
const cntLines=i=>{const c=cntOf(i),errs=c.crc+c.runts;return ['  Last input '+(c.in?'00:00:0'+(1+c.in%8):'never')+', output '+(c.out?'00:00:0'+(1+c.out%8):'never')+', output hang never',
  '  Last clearing of "show interface" counters '+(c.cleared==null?'never':typeof c.cleared==='number'?cntHms(Math.max(0,Math.floor((simNow()-c.cleared)/1000))):c.cleared),'  Input queue: 0/75/0/0 (size/max/drops/flushes); Total output drops: 0','  Queueing strategy: fifo','  Output queue: 0/40 (size/max)',
  '  5 minute input rate 0 bits/sec, 0 packets/sec','  5 minute output rate 0 bits/sec, 0 packets/sec','     '+c.in+' packets input, '+c.inB+' bytes, 0 no buffer','     Received 0 broadcasts (0 IP multicasts)',
  '     '+c.runts+' runts, 0 giants, 0 throttles','     '+errs+' input errors, '+c.crc+' CRC, 0 frame, 0 overrun, 0 ignored','     0 watchdog, 0 multicast, 0 pause input',
  '     '+c.out+' packets output, '+c.outB+' bytes, 0 underruns','     0 output errors, 0 collisions, '+c.resets+' interface resets','     0 unknown protocol drops','     0 babbles, '+c.late+' late collision, 0 deferred',
  '     0 lost carrier, 0 no carrier, 0 pause output','     0 output buffer failures, 0 output buffers swapped out'];};
// show interfaces status: the duplex and speed columns show what was negotiated (a-full, a-100) or forced (full, 100)
{const c=CMDS.find(c=>c.pat.join(' ')==='show interfaces status <rest?>'),f0=c.fn;c.fn=e=>{const buf=[],o=e.out;e.out=(...x)=>buf.push(...x);try{f0(e);}finally{e.out=o;}
  const {d,net}=e;e.out(...buf.map(l=>{const m=/^(\S+) /.exec(l);const n=m&&Object.keys(d.ifs).find(k=>shortIf(k)===m[1]);const i=n&&d.ifs[n];if(!i||!physIf(i)||l.length<56)return l;
    const up=ifUp(net,d,i),s=linkSettle(net,d,i),dx=i.duplex?i.duplex:up?'a-'+s.duplex:'auto',sp=i.speed?i.speed:up?'a-'+s.speed:'auto';
    return l.slice(0,53)+dx.padStart(6)+' '+sp.padStart(6)+' '+l.slice(67);}));};}
Cn('priv','clear counters <rest?>',e=>{const w=(e.args[0]||'').trim();let n=null;if(w){n=parseIf(w);if(!n||!e.d.ifs[n])return e.out(BAD);}
  ask(e.s,'Clear "show interface" counters on '+(n?'this interface':'all interfaces')+' [confirm]',(a,env)=>{if(/^n/i.test(a.trim()))return;const st=simNow();
    for(const i of Object.values(e.d.ifs)){if(n&&i.name!==n)continue;if(!physIf(i))continue;const c=cntOf(i);Object.assign(c,{in:0,inB:0,out:0,outB:0,crc:0,runts:0,late:0,cleared:st});}
    env.out((e.d.tsLog?stamp(env.net,e.d):'')+'%CLEAR-5-COUNTERS: Clear counter on '+(n?'interface '+n:'all interfaces')+' by console');});},['router','switch']);
function ctrRows(d,cols,vals){const ports=sortIfs(Object.keys(d.ifs)).filter(n=>physIf(d.ifs[n])),W=cols.map(c=>Math.max(c[1],c[0].length));
  return [pad('Port',cols[0][2]||8)+cols.map((c,k)=>c[0].padStart(W[k])).join(' '),...ports.map(n=>{const c=cntOf(d.ifs[n]);return pad(shortIf(n),cols[0][2]||8)+vals(c).map((v,k)=>String(v).padStart(W[k])).join(' ');})];}
Cn(EX,'show interfaces counters <rest?>',e=>{const a=(e.args[0]||'').trim().toLowerCase(),d=e.d;
  if(a&&!'errors'.startsWith(a))return e.out(BAD);
  if(a){e.out('',...ctrRows(d,[['Align-Err',13,8],['FCS-Err',11],['Xmit-Err',11],['Rcv-Err',11],['UnderSize',10],['OutDiscards',12]],c=>[0,c.crc,0,c.crc+c.runts,0,0]),'',
    ...ctrRows(d,[['Single-Col',12,8],['Multi-Col',10],['Late-Col',10],['Excess-Col',11],['Carri-Sen',10],['Runts',10],['Giants',10]],c=>[0,0,c.late,0,0,c.runts,0]));return;}
  e.out('',...ctrRows(d,[['InOctets',16,8],['InUcastPkts',14],['InMcastPkts',14],['InBcastPkts',14]],c=>[c.inB,c.in,0,0]),'',
    ...ctrRows(d,[['OutOctets',16,8],['OutUcastPkts',14],['OutMcastPkts',14],['OutBcastPkts',14]],c=>[c.outB,c.out,0,0]));},['switch'],true);
Object.assign(WHYC,{'show interfaces counters <rest?>':'Packets and bytes per switch port, or with errors, the error counters per port: FCS errors and runts on the receiving end, late collisions on the half-duplex end of a duplex mismatch.'});
// an exam fault: both ends of a link forced to different speeds
EXAM_FAULTS.push({id:'stp',gen(net,rnd){const c=[];for(const d of netDevs(net,['switch']))for(const v of Object.keys(d.vlans).map(Number)){if(v>=1002||stpOff(d,v))continue;const r=stpCalc(net,v);if(r&&r.info[d.name]&&Object.values(r.info[d.name].ports).some(x=>x.role==='Altn'))c.push(v);}
  const v=rpick(rnd,[...new Set(c)]);if(v==null)return null;const sws=netDevs(net,['switch']).filter(d=>d.vlans[v]);const cmds={};for(const d of sws)cmds[d.name]=[...enterCfg(d),'no spanning-tree vlan '+v,'end'];
  return {cmds,desc:'spanning tree was switched off for VLAN '+v+' on '+sws.map(d=>d.hostname).join(', ')+', so the redundant links became a loop and a broadcast storm'};}});
EXAM_FAULTS.push({id:'speed',generic:true,gen(net,rnd){const c=[];for(const d of netDevs(net,['router','switch']))for(const i of physPorts(d)){const p=net.devs[i.link.dev];if(p.type==='pc'||i.shutdown)continue;const q=p.ifs[i.link.ifn];if(q.shutdown)continue;c.push([d,i,p,q]);}
  const x=rpick(rnd,c);if(!x)return null;const [d,i,p,q]=x;
  return {cmds:{[d.name]:[...enterCfg(d),'interface '+i.name,'speed 10','end'],[p.name]:[...enterCfg(p),'interface '+q.name,'speed 100','end']},desc:d.hostname+' '+shortIf(i.name)+' is forced to 10 Mb/s while '+p.hostname+' '+shortIf(q.name)+' is forced to 100, so the link never comes up'};}});
Object.assign(KWHELP,{counters:'Clear counters on one or all interfaces'});
Object.assign(WHYC,{'clear counters <rest?>':'Zeroes the interface counters so you can watch errors grow from now, instead of guessing whether old CRC or late-collision counts still matter.'});
