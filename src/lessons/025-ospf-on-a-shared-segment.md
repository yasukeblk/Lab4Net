---
title: OSPF on a shared segment
name: How OSPF picks a DR on a shared LAN
mins: 9
---

## The problem: too many neighbours
<p>OSPF routers become <b>neighbours</b> by exchanging Hello messages, then form an <b>adjacency</b>: they swap their whole link-state database and keep it in sync. On a link with two routers that is one adjacency. On one Ethernet segment with four routers (R1 to R4 on 10.0.0.0/24), full adjacencies between every pair would be six, and every change would be flooded by everyone to everyone.</p><p>OSPF fixes this on <b>broadcast</b> networks such as Ethernet by electing a <b>Designated Router</b> (DR) and a <b>Backup DR</b> (BDR).</p>

## What the DR does
<ol><li>Every router forms a full adjacency with the DR and the BDR only.</li><li>A router with news sends it to 224.0.0.6, the address only the DR and BDR listen to.</li><li>The DR floods it to everyone on 224.0.0.5, the all-OSPF-routers address.</li><li>The BDR listens to everything, ready to take over at once if the DR fails.</li></ol><p>Routers that are neither are called <b>DROTHERs</b>. Two DROTHERs stop at the <b>2-Way</b> state with each other. That is normal, not a fault. In this lab R3 sees R4 as 2WAY for exactly this reason.</p>

## How the election works
<p>Each router's interface has an OSPF <b>priority</b>, 0 to 255, default 1. The highest priority becomes DR, the next highest BDR. If priorities tie, the highest <b>router ID</b> wins. Priority 0 means the router never takes either role.</p><p>There is no pre-emption. Once a DR and BDR exist, a router that arrives later or raises its priority does not take over. That is why giving R4 priority 255 and R3 priority 100 changes nothing at first. When a DR leaves, the BDR is promoted and a new BDR is elected.</p>

## Moving the roles here
<p>R1 is DR and R2 is BDR because they booted first. Setting <code>ip ospf priority 0</code> on R1's G0/0 removes it from the roles: R2 is promoted to DR and R4, with the highest priority left, becomes BDR. Doing the same on R2 promotes R4 to DR, and R3 becomes BDR. The election is per interface, so the command goes on G0/0, the shared LAN.</p>

## Point-to-point links and cost
<p>The WAN link R4 to BR has only two routers, so a DR adds nothing. <code>ip ospf network point-to-point</code> on both ends skips the election, the adjacency forms faster, and the neighbour shows as <code>FULL/ -</code>. Both ends must agree, or the hello settings do not match.</p><p>OSPF <b>cost</b> is reference bandwidth (default 100 Mbps) divided by the interface bandwidth, minimum 1. G0/1 is a gigabit port, so OSPF sees cost 1 even though the circuit behind it is only 10 Mbps. Setting <code>ip ospf cost 10</code> on both ends makes BR's metric to 10.0.0.0/24 10 + 1 = 11.</p>

## Check it worked
<p><code>show ip ospf neighbor</code> lists each neighbour's state and role: FULL/DR, FULL/BDR, 2WAY/DROTHER, or FULL/ - on point-to-point. <code>show ip ospf interface brief</code> shows each interface's role, cost and neighbour count. <code>show ip ospf interface g0/0</code> names the DR and BDR by router ID and address, and the network type.</p>

## @terms
- Designated Router (DR) :: The router on a broadcast segment that every other router forms a full adjacency with and that floods updates to all.
- Backup DR (BDR) :: Keeps full adjacencies like the DR and takes over if the DR fails.
- DROTHER :: A router on the segment that is neither DR nor BDR.
- OSPF priority :: A per-interface value 0 to 255, default 1. Highest wins the election; 0 means never DR or BDR.
- Router ID :: A 32-bit OSPF name written like an IPv4 address. Breaks ties in the election.
- 2-Way :: The neighbour state where each router has seen itself in the other's hello. Final state between two DROTHERs.
- Network type :: How OSPF treats a link: broadcast (with a DR) or point-to-point (no DR).

## @exam
- 3.4: configure and verify single-area OSPFv2: neighbor adjacencies, point-to-point, broadcast (DR/BDR selection), router ID.
- DR election: highest priority, then highest router ID. Default priority 1; 0 means ineligible.
- No pre-emption: a better router does not take over from a working DR.
- Multicast: 224.0.0.5 all OSPF routers, 224.0.0.6 DR and BDR.
- Default hello 10 seconds and dead 40 seconds on broadcast and point-to-point links. Hello and dead timers must match for routers to become neighbours.

## @mistakes
- Raising a priority and expecting the DR to change at once: nothing moves until the DR or BDR goes away.
- Setting priority in router configuration mode: it is an interface command.
- Treating 2WAY between DROTHERs as a broken adjacency.
- Point-to-point on one end only: the network types differ and the routers may not form a working adjacency.
- Leaving a slow circuit on a gigabit port at the default cost of 1, so OSPF prefers it over better paths.

## @quiz

### R1 is DR. You set R4's priority to 255. What happens?
- R4 becomes DR at once
- R4 becomes BDR at once
- [x] Nothing until the current DR or BDR goes away
- R1 and R4 share the DR role
> OSPF has no pre-emption. A higher priority only matters at the next election.

### R3 and R4 are both DROTHERs on the same LAN. What neighbour state do they show for each other?
- FULL
- [x] 2WAY
- EXSTART
- INIT
> DROTHERs only form full adjacencies with the DR and BDR. With each other they stop at 2-Way, which is normal.

### Two routers both have priority 1. Which becomes DR?
- The one with the lowest router ID
- The one with the lowest interface address
- The one with the most neighbours
- [x] The one with the highest router ID
> Equal priorities are broken by the highest router ID.

### A gigabit interface runs over a 10 Mbps circuit. With default settings, what OSPF cost does it get?
- [x] 1
- 10
- 100
- 1000
> Cost is 100 Mbps divided by interface bandwidth, minimum 1. OSPF sees the gigabit port, not the circuit, so it gets 1. That is why you set the cost by hand.

### Which address does a DROTHER send its link-state updates to on a broadcast segment?
- 224.0.0.5
- [x] 224.0.0.6
- 255.255.255.255
- The DR's unicast address only
> 224.0.0.6 reaches only the DR and BDR. The DR then floods to 224.0.0.5, all OSPF routers.

## @story
```json
[
 {
  "path": [
   "R4",
   "SW1",
   "R3"
  ],
  "cls": "req",
  "at": "R3",
  "label": "HELLO",
  "t": "Hellos find the neighbours",
  "x": "Every router sends hellos to 224.0.0.5 every 10 seconds. Through SW1, all four routers on 10.0.0.0/24 see each other."
 },
 {
  "path": [
   "R3",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "TO 224.0.0.6",
  "t": "News goes to the DR",
  "x": "R1 is DR because it booted first. When R3 has a change it sends it to 224.0.0.6, which only the DR and BDR hear."
 },
 {
  "path": [
   "R1",
   "SW1",
   "R4"
  ],
  "cls": "rep",
  "at": "R4",
  "label": "FLOOD TO ALL",
  "t": "The DR floods it",
  "x": "R1 repeats the update to 224.0.0.5 so every router hears it once. R3 and R4 never exchange databases directly, so they stay 2WAY."
 },
 {
  "path": [
   "R2",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "PRIORITY 0",
  "bad": 1,
  "t": "R1 gives up the role",
  "x": "With priority 0 on R1 G0/0, R1 drops out. BDR R2 is promoted to DR and R4, now the highest priority left, becomes BDR."
 },
 {
  "path": [
   "R3",
   "SW1",
   "R4"
  ],
  "cls": "req",
  "at": "R4",
  "label": "R4 DR, R3 BDR",
  "good": 1,
  "t": "The roles land where planned",
  "x": "Priority 0 on R2 removes it too. R4 is promoted to DR and R3, at priority 100, is elected BDR."
 },
 {
  "path": [
   "R4",
   "BR"
  ],
  "cls": "req",
  "at": "BR",
  "label": "FULL/ -",
  "good": 1,
  "t": "No election on point-to-point",
  "x": "With network type point-to-point on both ends, R4 and BR skip the election and go straight to FULL. The cost of 10 reflects the slow circuit."
 },
 {
  "path": [
   "PC1",
   "BR",
   "R4",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "REACHABLE",
  "good": 1,
  "t": "Roles change, reachability does not",
  "x": "PC1 pings R1. BR reaches 10.0.0.0/24 with metric 11, and the new DR and BDR made no difference to the path."
 }
]
```
