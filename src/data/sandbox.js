// Sandbox starter kits and goals (the old sandbox's "challenges"), as data. Each goal is checked against the live
// network with the engine's own functions, so it runs only after the engine.
const SANDBOX=(function(){
  const P = (name, type, x, y) => ({ name, type, x, y }), Lk = (a, ai, b, bi) => ({ a, ai: parseIf(ai), b, bi: parseIf(bi) });
  const kits = [
    ['Small office', 'A router, a switch, two PCs and a server.', () => ({ devs: [P('R1', 'router', 400, 65), P('SW1', 'switch', 400, 160), P('PC1', 'pc', 240, 255), P('PC2', 'pc', 400, 262), P('SRV1', 'srv', 560, 250)], links: [Lk('R1', 'g0/0', 'SW1', 'g0/1'), Lk('PC1', 'f0', 'SW1', 'f0/1'), Lk('PC2', 'f0', 'SW1', 'f0/2'), Lk('SRV1', 'f0', 'SW1', 'f0/3')] })],
    ['Two sites', 'Two routers, each with its own switch and PCs.', () => ({ devs: [P('R1', 'router', 300, 75), P('R2', 'router', 500, 75), P('SW1', 'switch', 180, 165), P('SW2', 'switch', 620, 165), P('PC1', 'pc', 90, 258), P('PC2', 'pc', 250, 258), P('PC3', 'pc', 550, 258), P('PC4', 'pc', 710, 258)], links: [Lk('R1', 'g0/1', 'R2', 'g0/1'), Lk('R1', 'g0/0', 'SW1', 'g0/1'), Lk('R2', 'g0/0', 'SW2', 'g0/1'), Lk('PC1', 'f0', 'SW1', 'f0/1'), Lk('PC2', 'f0', 'SW1', 'f0/2'), Lk('PC3', 'f0', 'SW2', 'f0/1'), Lk('PC4', 'f0', 'SW2', 'f0/2')] })],
    ['Router triangle', 'Three routers in a loop, each with a PC. Good for OSPF.', () => ({ devs: [P('R1', 'router', 400, 70), P('R2', 'router', 250, 200), P('R3', 'router', 550, 200), P('PC1', 'pc', 560, 70), P('PC2', 'pc', 100, 200), P('PC3', 'pc', 700, 200)], links: [Lk('R1', 'g0/1', 'R2', 'g0/1'), Lk('R2', 'g0/2', 'R3', 'g0/2'), Lk('R1', 'g0/2', 'R3', 'g0/1'), Lk('R1', 'g0/0', 'PC1', 'f0'), Lk('R2', 'g0/0', 'PC2', 'f0'), Lk('R3', 'g0/0', 'PC3', 'f0')] })],
    ['Switch pair', 'Two switches joined by two cables. Good for trunks, EtherChannel and spanning tree.', () => ({ devs: [P('SW1', 'switch', 260, 100), P('SW2', 'switch', 540, 100), P('PC1', 'pc', 260, 235), P('PC2', 'pc', 540, 235)], links: [Lk('SW1', 'g0/1', 'SW2', 'g0/1'), Lk('SW1', 'g0/2', 'SW2', 'g0/2'), Lk('PC1', 'f0', 'SW1', 'f0/1'), Lk('PC2', 'f0', 'SW2', 'f0/1')] })]];
  const hostIp = (n, h) => n.devs[h] && n.devs[h].ifs.FastEthernet0 ? n.devs[h].ifs.FastEthernet0.ip : null;
  const pingH = (n, a, b) => { const ip = hostIp(n, b); return ip != null && !!n.devs[a] && canPing(n, n.devs[a], ip); };
  const goals = [
    { kit: 0, title: 'Get the office online', desc: 'Address everything, then get the PCs talking to each other, the router and the web server.', goals: [
      ['PC1, PC2 and SRV1 each have an IP address', n => ['PC1', 'PC2', 'SRV1'].every(h => hostIp(n, h) != null)], ['PC1 can ping PC2', n => pingH(n, 'PC1', 'PC2')],
      ['R1 Gi0/0 has an address and PC1 can ping it', n => { const i = n.devs.R1.ifs['GigabitEthernet0/0']; return i.ip !== null && canPing(n, n.devs.PC1, i.ip); }],
      ['PC1 can open the web server on SRV1 (TCP 80)', n => { const ip = hostIp(n, 'SRV1'); return ip != null && reach(n, n.devs.PC1, ip, 'tcp', 80).ok; }]] },
    { kit: 1, title: 'Connect two sites', desc: 'Two LANs on different subnets, joined by two routers. Make a PC at one site reach a PC at the other.', goals: [
      ['All four PCs have an address and a default gateway', n => ['PC1', 'PC2', 'PC3', 'PC4'].every(h => hostIp(n, h) != null && n.devs[h].gw != null)],
      ['The two sites use different subnets', n => { const a = n.devs.PC1.ifs.FastEthernet0, b = n.devs.PC3.ifs.FastEthernet0; return a.ip !== null && b.ip !== null && netOf(a.ip, a.len) !== netOf(b.ip, b.len); }],
      ['PC1 can ping PC2 at its own site', n => pingH(n, 'PC1', 'PC2')], ['PC1 can ping PC4 at the other site', n => pingH(n, 'PC1', 'PC4')], ['PC3 can ping PC2 the other way', n => pingH(n, 'PC3', 'PC2')]] },
    { kit: 2, title: 'OSPF, no static routes', desc: 'Three routers in a loop. Let OSPF find every LAN. Static routes are not allowed.', goals: [
      ['No router has a static route', n => ['R1', 'R2', 'R3'].every(r => n.devs[r].statics.length === 0)], ['Every router has two OSPF neighbors', n => ['R1', 'R2', 'R3'].every(r => ospfNeighbors(n, n.devs[r]).length === 2)],
      ['PC1 can ping PC2', n => pingH(n, 'PC1', 'PC2')], ['PC1 can ping PC3', n => pingH(n, 'PC1', 'PC3')]] },
    { kit: 3, title: 'One VLAN over a bundle', desc: 'Put both PCs in VLAN 10 and carry it between the switches over an EtherChannel trunk.', goals: [
      ['VLAN 10 exists on both switches', n => ['SW1', 'SW2'].every(w => !!n.devs[w].vlans[10])],
      ['Both PC ports are access ports in VLAN 10', n => ['SW1', 'SW2'].every(w => { const i = n.devs[w].ifs['FastEthernet0/1']; return i.mode === 'access' && i.accessVlan === 10; })],
      ['Both cables are bundled into one EtherChannel', n => ['SW1', 'SW2'].every(w => ['GigabitEthernet0/1', 'GigabitEthernet0/2'].every(p => bundled(n, n.devs[w], n.devs[w].ifs[p])))],
      ['PC1 can ping PC2', n => pingH(n, 'PC1', 'PC2')]] }];
  return { kits, goals };
})();
