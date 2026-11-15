---
title: Per-VLAN root bridges
name: How spanning tree picks a root for each VLAN
mins: 9
---

## The problem
<p>Redundant switch links protect against a failed cable, but they form loops, and a broadcast caught in a Layer 2 loop circles for ever. <b>Spanning Tree Protocol</b> (STP) prevents that by blocking just enough ports to leave one loop-free path, a tree, centred on one switch: the <b>root bridge</b>.</p><p>Which switch is root matters. Here the old access switch ASW1 is root for both VLANs, so traffic is pulled through the weakest box, and one of the distribution uplinks sits idle.</p>

## How the root is elected
<p>Switches exchange messages called <b>BPDUs</b>. Each carries a <b>bridge ID</b>: a priority plus the switch's MAC address. The lowest bridge ID becomes root.</p><ul><li>The default priority is 32768. Priority goes up in steps of 4096, because its low bits carry the VLAN number (the <i>extended system ID</i>). So DSW1 shows priority 32778 in VLAN 10 by default.</li><li>When priorities tie, the lowest MAC wins. ASW1's 0009.7c11.0100 is lower than both distribution switches', so ASW1 wins every VLAN.</li></ul><p>Changing the priority is how you choose the root yourself.</p>

## One tree per VLAN
<p><b>PVST+</b> runs a separate spanning tree for every VLAN, and <b>Rapid PVST+</b> is its faster version based on 802.1w. It reconverges in about a second where classic STP can take 30 to 50 seconds. Because each VLAN has its own tree, each can have its own root.</p><p><code>spanning-tree vlan 10 root primary</code> is a macro. It sets priority 24576, or lower if needed to beat the current root. <code>root secondary</code> sets 28672, so that switch becomes root if the primary fails. DSW1 is primary for 10 and secondary for 20; DSW2 is the mirror.</p>

## Port roles after the change
<p>Every non-root switch picks one <b>root port</b>: its lowest-cost path to the root. A Gigabit link costs 4 by default. Every link has one <b>designated port</b>, the side closer to the root, which forwards. In Rapid PVST+, a port that is neither becomes an <b>alternate port</b> and is discarding.</p><ol><li>VLAN 10, root DSW1: ASW1 reaches it directly through Gi0/1 (cost 4), so Gi0/1 is its root port.</li><li>On the ASW1 to DSW2 link, both ends are cost 4 from the root. The tie goes to the lower bridge ID, DSW2 at 28672, so DSW2's end is designated and ASW1 Gi0/2 is alternate.</li><li>VLAN 20 is the mirror image: root port Gi0/2, alternate Gi0/1.</li></ol><p>Both uplinks now carry traffic, one VLAN each.</p>

## Check it worked
<p><code>show spanning-tree vlan 10</code> on ASW1 shows the root's bridge ID, this switch's own, and each port's role (Root, Desg, Altn) and state (FWD or BLK). Run it for VLAN 20 too. Then ping PC3 from PC1 and PC4 from PC2: spanning tree changes paths, never reachability.</p>

## @terms
- Root bridge :: The switch at the centre of a spanning tree. The one with the lowest bridge ID.
- Bridge ID :: Priority plus MAC address. Lower is better.
- BPDU :: Bridge protocol data unit: the message switches exchange to build the spanning tree.
- Root port :: A non-root switch's port with the lowest-cost path to the root. Forwards.
- Designated port :: The forwarding port on each link, on the side closer to the root.
- Alternate port :: In Rapid PVST+, a backup path to the root that is discarding.
- Rapid PVST+ :: Cisco's per-VLAN version of Rapid STP (802.1w). One tree per VLAN, fast convergence.
- Extended system ID :: The VLAN number added into the bridge priority, which is why priorities step by 4096.

## @exam
- 2.5: interpret basic operations of Rapid PVST+: root port, root bridge (primary/secondary), and other port names; port states and roles.
- Default priority 32768; it must be a multiple of 4096. Lowest bridge ID wins; on a tie, lowest MAC.
- <code>root primary</code> sets 24576 (or lower if needed); <code>root secondary</code> sets 28672.
- Rapid PVST+ port states: discarding, learning, forwarding. Roles: root, designated, alternate, backup.
- Default port cost (short method): 4 for 1 Gbps, 19 for 100 Mbps.

## @mistakes
- Leaving all priorities at the default: the switch with the lowest MAC, often the oldest, becomes root.
- Setting a priority that is not a multiple of 4096: IOS rejects it.
- Making the same switch primary for every VLAN: the other uplink stays blocked and the load is not shared.
- Expecting <code>root primary</code> to keep a switch root forever: it sets a value once, and a switch added later with a lower priority can still take over.

## @quiz

### All three switches have priority 32768. Which becomes root?
- The switch with the most ports
- [x] The switch with the lowest MAC address
- The switch with the highest MAC address
- The switch powered on first
> With equal priority, the bridge ID tie is broken by the lowest MAC address. Boot order does not matter.

### What priority does <code>spanning-tree vlan 20 root secondary</code> set?
- 24576
- 32768
- [x] 28672
- 4096
> Secondary sets 28672: lower than the default 32768, but higher than the primary's 24576, so it takes over only if the primary fails.

### Why can DSW1 be root for VLAN 10 and DSW2 root for VLAN 20 at the same time?
- [x] Rapid PVST+ runs a separate spanning tree per VLAN
- Each switch has two MAC addresses
- The trunks carry only one VLAN each
- STP ignores VLANs
> PVST+ and Rapid PVST+ build one tree per VLAN, each with its own root election.

### In VLAN 10, DSW1 is root. Which port on ASW1 is alternate (discarding)?
- Gi0/1, towards DSW1
- Fa0/1, towards PC1
- [x] Gi0/2, towards DSW2
- None; all ports forward
> Gi0/1 is the lowest-cost path to DSW1, so it is the root port. On the DSW2 link DSW2 has the lower bridge ID, so ASW1's end is alternate.

### An engineer types <code>spanning-tree vlan 10 priority 30000</code>. What happens?
- It is accepted
- [x] It is rejected: the priority must be a multiple of 4096
- It is rounded to 28672
- The switch becomes root
> The low bits of the priority field carry the VLAN number, so only multiples of 4096 (0 to 61440) are allowed.

## @story
```json
[
 {
  "path": [
   "ASW1",
   "DSW1"
  ],
  "cls": "req",
  "at": "DSW1",
  "label": "ASW1 IS ROOT",
  "bad": 1,
  "t": "Before: the oldest switch wins",
  "x": "All three switches have priority 32768, so the lowest MAC decides. ASW1's BPDUs claim root for both VLANs, and traffic is forced through the access switch."
 },
 {
  "path": [
   "DSW1",
   "ASW1"
  ],
  "cls": "req",
  "at": "ASW1",
  "label": "ROOT VLAN 10",
  "t": "DSW1 claims VLAN 10",
  "x": "After root primary, DSW1 sends VLAN 10 BPDUs with priority 24576 plus 10. That beats ASW1, and every switch accepts DSW1 as root for VLAN 10."
 },
 {
  "path": [
   "DSW2",
   "ASW1"
  ],
  "cls": "req",
  "at": "ASW1",
  "label": "ALTN VLAN 10",
  "t": "One uplink blocks for VLAN 10",
  "x": "For VLAN 10, ASW1 Gi0/1 to DSW1 is the root port. On the DSW2 link DSW2 has the lower bridge ID, so ASW1 Gi0/2 becomes alternate and discards VLAN 10 frames."
 },
 {
  "path": [
   "DSW2",
   "ASW1"
  ],
  "cls": "req",
  "at": "ASW1",
  "label": "ROOT VLAN 20",
  "t": "DSW2 claims VLAN 20",
  "x": "DSW2 is primary for VLAN 20, so in that tree ASW1 Gi0/2 is the root port and Gi0/1 is the one that discards."
 },
 {
  "path": [
   "PC1",
   "ASW1",
   "DSW1",
   "DSW2",
   "PC3"
  ],
  "cls": "req",
  "at": "PC3",
  "label": "VLAN 10 VIA DSW1",
  "good": 1,
  "t": "VLAN 10 uses the left uplink",
  "x": "PC1's frames to PC3 go up Gi0/1 to DSW1, the VLAN 10 root, then across to DSW2."
 },
 {
  "path": [
   "PC2",
   "ASW1",
   "DSW2",
   "DSW1",
   "PC4"
  ],
  "cls": "req",
  "at": "PC4",
  "label": "VLAN 20 VIA DSW2",
  "good": 1,
  "t": "VLAN 20 uses the right uplink",
  "x": "PC2's frames to PC4 go up Gi0/2 to DSW2, the VLAN 20 root. Both uplinks now carry traffic."
 }
]
```
