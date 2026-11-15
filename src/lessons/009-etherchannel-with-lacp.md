---
title: EtherChannel with LACP
name: How two cables become one link
mins: 8
---

## The problem: spanning tree wastes the second cable
<p>SW1 and SW2 are joined by two cables, Gi0/1 and Gi0/2. Two parallel links between the same switches form a loop, so <b>spanning tree</b> (STP, the protocol that stops Layer 2 loops) blocks one of them. The second cable just sits there as a spare. You paid for two links and use one.</p><p><b>EtherChannel</b> fixes this by bundling the physical links into one logical link called a <b>port-channel</b>. Spanning tree sees a single link, so nothing is blocked. Both cables carry traffic, and if one fails the bundle stays up on the other with no spanning tree change.</p>

## How traffic is shared
<p>The switch does not split one conversation across both cables. That could deliver frames out of order. Instead it runs a <b>hash</b> on addresses in each frame (for example source and destination MAC or IP) and the result picks a member link. Every frame of the same flow takes the same link.</p><p>So one big transfer between two hosts still uses one cable. The gain comes from many flows spread over the members. A bundle can have up to 8 active links.</p>

## LACP: agreeing on the bundle
<p>Both switches must agree which ports belong together. If one side bundled and the other did not, frames could loop or be lost. A negotiation protocol checks this first.</p><ul><li><b>LACP</b> (Link Aggregation Control Protocol, IEEE 802.3ad) is the open standard. Its modes are <code>active</code> (sends LACP messages and starts negotiation) and <code>passive</code> (only answers).</li><li><b>PAgP</b> is the older Cisco-only protocol, with modes <code>desirable</code> and <code>auto</code>.</li><li>Mode <code>on</code> forces the bundle with no negotiation at all. Both ends must then be <code>on</code>.</li></ul><p>At least one LACP side must be active. Active with active, or active with passive, forms a bundle. Passive with passive never does, because both wait for the other to speak.</p>

## Members must match
<p>Every member port must have the same speed, duplex, access or trunk mode, allowed VLANs and native VLAN. A port that differs is <b>suspended</b> from the bundle. The safe habit is to configure Layer 2 settings on <code>interface port-channel 1</code>, not on the members. The members inherit them, so they stay identical.</p>

## How it is configured here
<p>On SW1, <code>interface range g0/1 - 2</code> then <code>channel-group 1 mode active</code> puts both ports in group 1 and creates Port-channel 1. SW2 gets the same (active or passive). Then <code>switchport mode trunk</code> on Port-channel 1 on both switches lets VLAN 10 cross, so PC1 (192.168.10.11) can reach PC2 (192.168.10.12).</p>

## Check it worked
<p><code>show etherchannel summary</code> lists each bundle. <b>Po1(SU)</b> means Layer 2 and in use. <b>(P)</b> after a member means bundled. Watch for <b>(s)</b> suspended, <b>(I)</b> stand-alone (the other side is not negotiating) and <b>(D)</b> down. Then ping PC2 from PC1 to prove VLAN 10 crosses the trunk.</p>

## @terms
- EtherChannel :: Several physical links bundled into one logical link.
- Port-channel :: The logical interface that represents the bundle.
- LACP :: Link Aggregation Control Protocol, the IEEE standard for negotiating a bundle. Modes active and passive.
- PAgP :: Port Aggregation Protocol, the Cisco-only alternative. Modes desirable and auto.
- Mode on :: Bundles the ports without any negotiation protocol.
- Load-balancing hash :: The calculation on frame addresses that chooses which member link carries a flow.
- Suspended port :: A member that does not match the bundle and has been left out of it.

## @exam
- 2.4: configure and verify (Layer 2/Layer 3) EtherChannel (LACP).
- LACP is open standard (802.3ad); PAgP is Cisco proprietary. Know which mode pairs form a bundle: active/active and active/passive yes, passive/passive no.
- Mode <code>on</code> only works with <code>on</code> at the other end. It never forms with an LACP or PAgP mode.
- Load balancing is per flow, not per frame, so one flow never exceeds one link's speed.
- Spanning tree treats the port-channel as one link, so no member is blocked.

## @mistakes
- Both ends passive: no bundle forms, the ports show <b>(I)</b> stand-alone, and spanning tree blocks one link again.
- Changing trunk settings on one member instead of the port-channel: that member no longer matches and is shown <b>(s)</b> suspended.
- Port-channel left as an access port in VLAN 1: the bundle is up but PC1 cannot reach PC2 in VLAN 10.
- Mixing <code>on</code> at one end with <code>active</code> at the other: no bundle forms, and the two sides can disagree about whether a loop exists.

## @quiz

### SW1 is set to LACP <code>passive</code> and SW2 is also <code>passive</code>. What happens?
- The bundle forms using LACP
- [x] No bundle forms, because neither side starts the negotiation
- The bundle forms using PAgP instead
- The bundle forms but only one link carries traffic
> Passive only answers LACP messages. With two passive ends nobody sends the first one, so the ports stay separate and spanning tree blocks one.

### Why does one large file copy between PC1 and PC2 not go faster with a two-link bundle?
- LACP only uses the second link as a backup
- Spanning tree still blocks one member
- Port-channels are limited to the speed of the slowest member
- [x] The hash sends every frame of one flow over the same member link
> Load sharing is per flow. Keeping a flow on one link keeps its frames in order, so one flow is limited to one link's speed.

### Which pair of modes forms an EtherChannel?
- [x] active and passive
- on and active
- desirable and active
- auto and passive
> Active and passive are both LACP and one side starts. Mode on does not negotiate, and desirable/auto are PAgP, which cannot talk to LACP.

### <code>show etherchannel summary</code> shows Gi0/2 with the flag (s). What does that mean?
- The port is bundled and working
- The port is a Layer 3 member
- [x] The port is suspended because its settings do not match the bundle
- The port is in standby, waiting for a ninth link to fail
> (s) is suspended, usually from a mismatch such as a different trunk or VLAN setting. (P) would mean bundled.

### Where should you configure <code>switchport mode trunk</code> for the bundle?
- On Gi0/1 only
- [x] On interface port-channel 1
- On VLAN 10
- On the PC-facing ports
> Settings on the port-channel are inherited by every member, which keeps them identical. Setting members one by one risks a mismatch and a suspended port.

## @story
```json
[
 {
  "path": [
   "SW1",
   "SW2"
  ],
  "cls": "req",
  "at": "SW2",
  "label": "LACPDU",
  "t": "SW1 starts the negotiation",
  "x": "Gi0/1 and Gi0/2 on SW1 are in channel group 1 in active mode, so SW1 sends LACP messages down both cables asking SW2 to bundle them."
 },
 {
  "path": [
   "SW2",
   "SW1"
  ],
  "cls": "rep",
  "at": "SW1",
  "label": "LACPDU",
  "t": "SW2 agrees",
  "x": "SW2 answers on the same two ports. Both switches now know the two cables lead to the same neighbour and the settings match."
 },
 {
  "path": [
   "SW1",
   "SW2"
  ],
  "cls": "req",
  "at": "SW2",
  "label": "PO1 (SU)",
  "good": 1,
  "t": "The bundle comes up",
  "x": "The two ports become one logical link, Port-channel 1. Spanning tree sees a single link, so neither cable is blocked."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "SW2",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "VLAN 10",
  "good": 1,
  "t": "Traffic crosses the trunk",
  "x": "PC1 pings 192.168.10.12. SW1 tags the frame for VLAN 10 on the Port-channel 1 trunk, and its hash picks one member link to carry this flow."
 },
 {
  "path": [
   "SW1",
   "SW2"
  ],
  "cls": "req",
  "at": "SW2",
  "label": "GI0/1 FAILS",
  "bad": 1,
  "t": "One cable is cut",
  "x": "Gi0/1 goes down. The bundle loses a member but Port-channel 1 itself stays up, so spanning tree does not need to recalculate."
 },
 {
  "path": [
   "PC2",
   "SW2",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "STILL UP",
  "good": 1,
  "t": "Traffic moves to Gi0/2",
  "x": "Flows that used Gi0/1 are rehashed onto Gi0/2. The pings keep working, at half the total capacity, until the cable is fixed."
 }
]
```
