---
title: Spanning tree: root bridge and edge ports
name: How spanning tree stops switching loops
mins: 10
---

## Why loops are deadly
<p>Redundant links between switches are good: if one fails, another takes over. But they form a loop, and Ethernet frames carry no hop count to make them expire. A broadcast sent into the loop circles for ever and multiplies, a <b>broadcast storm</b>. Switches also keep relearning the same MAC address on different ports, and hosts receive duplicate frames. Within seconds the network stops.</p><p><b>STP</b> (Spanning Tree Protocol) prevents this by putting one port in each loop into a blocking state, and unblocking it if an active link fails.</p>

## Electing the root bridge
<p>Switches exchange <b>BPDUs</b> (bridge protocol data units). Each carries a <b>bridge ID</b>: a priority (32768 by default) plus the VLAN number, followed by the switch MAC address. Lowest bridge ID wins and becomes the <b>root bridge</b>. The root sends BPDUs every 2 seconds.</p><p>In this lab all three switches have priority 32769 for VLAN 1, so the tie goes to the lowest MAC: SW3 (000d.bd11.0a00), the oldest switch. Every path is then calculated toward SW3, which nobody chose.</p>

## Port roles
<ol><li>Every non-root switch picks one <b>root port</b>: its port with the lowest total cost to the root. Default costs are 4 for 1 Gbps and 19 for 100 Mbps. Ties go to the lowest neighbour bridge ID, then the lowest port number.</li><li>Every link gets one <b>designated port</b>, on the switch with the lower cost to the root (the lower bridge ID breaks a tie). All the root's own ports are designated.</li><li>Any port left over is an <b>alternate</b> port. It discards frames, which breaks the loop.</li></ol>

## Taking control of the election
<p><code>spanning-tree vlan 1 root primary</code> on SW1 sets its priority to 24576 (or lower, if needed to beat the current root). <code>root secondary</code> on SW2 sets 28672, so SW2 takes over if SW1 fails. SW3 keeps 32768.</p><p>Now SW1 is root and its ports are designated. SW2 and SW3 each reach it over one gigabit link, cost 4, so G0/1 is the root port on both. On the SW2-SW3 link the costs tie, and SW2 has the lower bridge ID, so SW2 G0/2 is designated and <b>SW3 G0/2 is the alternate port that blocks</b>.</p>

## Rapid PVST+
<p>Cisco runs a separate tree per VLAN (<b>PVST+</b>). Classic STP moves a port through listening and learning, 15 seconds each, and can wait 20 seconds more before noticing a failure: 30 to 50 seconds. <b>Rapid PVST+</b> (802.1w, per VLAN) uses only three states, discarding, learning and forwarding, and a quick handshake between switches, so it usually recovers in about a second. <code>spanning-tree mode rapid-pvst</code> turns it on.</p>

## Edge ports: PortFast and BPDU Guard
<p>A port facing a PC cannot create a loop, so waiting is pointless. <b>PortFast</b> sends it straight to forwarding. Used on a port facing another switch, it can create a loop, so it is paired with <b>BPDU Guard</b>: if a BPDU arrives on that port, the switch puts it into the <i>err-disabled</i> state (shut down). <code>shutdown</code> then <code>no shutdown</code> brings it back once the cause is removed.</p>

## Check it worked
<p><code>show spanning-tree</code> shows the Root ID and this switch Bridge ID, and on SW1 the line <i>This bridge is the root</i>. Each port is listed with its role (Root, Desg, Altn) and status. Look on SW3 for G0/2 as Altn and blocking.</p>

## @terms
- STP :: Spanning Tree Protocol: blocks redundant ports so a switched network has no loops.
- BPDU :: Bridge protocol data unit: the message switches use to run spanning tree.
- Bridge ID :: Priority plus VLAN number, then MAC address. The lowest is elected root.
- Root bridge :: The switch every other switch calculates its best path toward.
- Root port :: The port on a non-root switch with the best path to the root.
- Designated port :: The forwarding port on each link, on the switch closer to the root.
- Alternate port :: A port that discards frames to break a loop, ready to take over if the root port fails.
- PortFast :: Lets an edge port forward immediately instead of waiting.
- BPDU Guard :: Err-disables a port if a BPDU arrives on it.

## @exam
- 2.5: interpret basic operations of Rapid PVST+: root port, root bridge (primary/secondary) and other port names, port states and roles, PortFast, root guard, loop guard, BPDU filter and BPDU guard.
- Default priority is 32768, changed in steps of 4096. root primary gives 24576, root secondary 28672.
- Lowest bridge ID wins. With equal priority the lowest MAC wins.
- Default costs: 4 for 1 Gbps, 19 for 100 Mbps.
- Rapid PVST+ states: discarding, learning, forwarding. Roles: root, designated, alternate, backup.

## @mistakes
- Leaving every priority at default: an old, slow switch becomes root and traffic takes poor paths.
- PortFast without BPDU Guard: a switch plugged into a desk port can create a loop.
- Setting priority that is not a multiple of 4096: IOS rejects it.
- Forgetting the tree is per VLAN: setting root for VLAN 1 does not change VLAN 10.

## @quiz

### All three switches have default priority. Which becomes root?
- The one with the highest MAC address
- The one with the most ports
- [x] The one with the lowest MAC address
- The one switched on first
> Lowest bridge ID wins, and with equal priorities the MAC address breaks the tie. That is why SW3, the oldest, wins.

### What priority does <code>spanning-tree vlan 1 root primary</code> normally set?
- [x] 24576
- 28672
- 32768
- 4096
> Primary sets 24576 (or lower if another switch already beats that). 28672 is what secondary sets.

### After the lab is configured, which port blocks?
- SW1 G0/1
- SW2 G0/2
- SW2 G0/1
- [x] SW3 G0/2
> The root SW1 has only designated ports. On the SW2-SW3 link costs tie and SW2 has the lower bridge ID, so SW3 G0/2 is alternate.

### A BPDU arrives on a port with BPDU Guard enabled. What happens?
- The BPDU is dropped and the port stays up
- [x] The port is err-disabled
- The port becomes a root port
- PortFast is turned off on the port
> BPDU Guard shuts the port into err-disabled. Dropping BPDUs silently is what BPDU filter does, a different feature.

### What is the default STP cost of a 1 Gbps link?
- 19
- 100
- [x] 4
- 1
> 4 for 1 Gbps and 19 for 100 Mbps. 1 is the OSPF cost of a gigabit link with the default reference bandwidth.

## @story
```json
[
 {
  "path": [
   "SW3",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "SW3 IS ROOT",
  "bad": 1,
  "t": "Root by accident",
  "x": "With every priority at 32769, SW3 has the lowest MAC, so its BPDUs win and it becomes root. Nobody chose it."
 },
 {
  "path": [
   "SW1",
   "SW2"
  ],
  "cls": "req",
  "at": "SW2",
  "label": "BETTER BID",
  "t": "SW1 claims root",
  "x": "After <code>root primary</code>, SW1 sends BPDUs with priority 24576 plus VLAN 1. That beats SW3, and SW2 accepts SW1 as root."
 },
 {
  "path": [
   "SW1",
   "SW3"
  ],
  "cls": "req",
  "at": "SW3",
  "label": "NEW ROOT",
  "good": 1,
  "t": "SW3 follows",
  "x": "SW3 also accepts SW1 as root. Its G0/1, cost 4 straight to SW1, becomes its root port."
 },
 {
  "path": [
   "SW2",
   "SW3"
  ],
  "cls": "req",
  "at": "SW3",
  "label": "G0/2 DISCARDS",
  "bad": 1,
  "t": "The loop is broken",
  "x": "On the SW2-SW3 link both switches are cost 4 from the root. SW2 has the lower bridge ID (28672), so its end is designated and SW3 G0/2 becomes alternate and discards."
 },
 {
  "path": [
   "PC1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "PORTFAST",
  "good": 1,
  "t": "Host port forwards at once",
  "x": "PC1 connects to Fa0/1, an edge port with PortFast, so it forwards immediately instead of waiting."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "SW3",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "DIRECT PATH",
  "good": 1,
  "t": "The path traffic takes",
  "x": "PC1 to PC2 now goes SW1 to SW3 over G0/2 to G0/1. The blocked SW2-SW3 link carries nothing until another link fails."
 },
 {
  "path": [
   "PC2",
   "SW3"
  ],
  "cls": "req",
  "at": "SW3",
  "label": "ERR-DISABLED",
  "bad": 1,
  "t": "A switch on a desk port",
  "x": "If someone swaps PC2 for a switch, its BPDUs arrive on Fa0/1. BPDU Guard err-disables the port and the topology stays as designed."
 }
]
```
