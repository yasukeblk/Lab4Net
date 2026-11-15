---
title: 802.1Q trunking
name: How one link carries many VLANs
mins: 8
---

## The problem trunks solve
<p>A VLAN is a separate broadcast domain inside a switch. When VLAN 10 and VLAN 20 exist on both SW1 and SW2, the hosts in each VLAN need to reach their partners on the other switch. One cable per VLAN works, but it wastes ports and does not scale to dozens of VLANs.</p><p>A <b>trunk</b> is one link that carries frames for many VLANs. The catch: the switch at the far end must be able to tell which VLAN each frame belongs to.</p>

## The 802.1Q tag
<p><b>IEEE 802.1Q</b> solves it by inserting a 4-byte <b>tag</b> into the Ethernet frame, just after the source MAC address. Inside the tag is a 12-bit <b>VLAN ID</b> (usable values 1 to 4094) and a 3-bit priority field used by QoS.</p><ol><li>PC1 sends an ordinary untagged frame into SW1 Fa0/1, an access port in VLAN 10.</li><li>SW1 sends it out the trunk G0/1 with a tag saying VLAN 10.</li><li>SW2 reads the tag, removes it, and delivers the frame only to VLAN 10 ports.</li></ol><p>The PCs never see a tag. ISL, an older Cisco-only method, is obsolete.</p>

## The native VLAN
<p>One VLAN on a trunk travels <b>untagged</b>: the <b>native VLAN</b>, VLAN 1 by default. Any untagged frame that arrives on a trunk is placed in the native VLAN. Both ends must agree on it. If they do not, frames from one VLAN come out in another, and CDP reports a native VLAN mismatch. A common hardening step is to make the native VLAN an unused one.</p>

## VLANs on both ends, and the allowed list
<p>A switch only forwards a VLAN it knows about, so VLAN 10 and 20 must be created on SW2 too. That is the lab's first step.</p><p>By default a trunk allows all VLANs, 1 to 4094. <code>switchport trunk allowed vlan 10,20</code> restricts it to the VLANs in use, which keeps broadcasts of other VLANs off the link. To change the list later use <code>switchport trunk allowed vlan add 30</code>. Without <code>add</code>, the command replaces the whole list.</p>

## Forcing the trunk
<p><code>switchport mode trunk</code> makes the port a trunk unconditionally. Cisco switches can also negotiate with <b>DTP</b> (Dynamic Trunking Protocol): <i>dynamic desirable</i> actively asks to trunk, <i>dynamic auto</i> only agrees if asked. Two auto ends never form a trunk and stay access ports. Setting the mode by hand is clearer and safer, and <code>switchport nonegotiate</code> turns DTP off. Some switches that also support ISL need <code>switchport trunk encapsulation dot1q</code> before they accept trunk mode.</p>

## Check it worked
<p><code>show interfaces trunk</code> lists each trunk with its mode, encapsulation (802.1q), status (trunking) and native VLAN, then the allowed VLANs, the allowed VLANs that exist on the switch, and those actually forwarding. <code>show interfaces g0/1 switchport</code> shows the administrative and operational mode. Then ping PC3 from PC1 and PC4 from PC2.</p>

## @terms
- Trunk :: A link that carries frames for several VLANs, identifying each with a tag.
- 802.1Q :: The IEEE standard for VLAN tagging on trunks.
- VLAN tag :: 4 bytes added to a frame on a trunk, holding a 12-bit VLAN ID and a priority.
- Native VLAN :: The one VLAN sent untagged on an 802.1Q trunk. VLAN 1 by default.
- Allowed VLAN list :: The VLANs a trunk is permitted to carry. All by default.
- DTP :: Dynamic Trunking Protocol: Cisco's way for two ports to negotiate whether to trunk.

## @exam
- 2.2: configure and verify interswitch connectivity: trunk ports, 802.1Q, native VLAN. 2.1: VLANs spanning multiple switches.
- The 802.1Q tag is 4 bytes with a 12-bit VLAN ID. Native VLAN frames are untagged.
- The native VLAN must match on both ends. The default is VLAN 1.
- dynamic auto plus dynamic auto gives an access link; auto with desirable, or trunk with either, gives a trunk.
- <code>allowed vlan add</code> appends; plain <code>allowed vlan</code> replaces the list.

## @mistakes
- VLAN missing on one switch: the trunk is up but that VLAN does not pass. <code>show interfaces trunk</code> leaves it out of the allowed-and-active list.
- Forgetting <code>add</code> when allowing a new VLAN: every other VLAN on the trunk suddenly stops working.
- Native VLAN mismatch: CDP logs a mismatch and traffic in those VLANs leaks into each other.
- Leaving both ends on dynamic auto: the link silently stays an access link in VLAN 1.

## @quiz

### How long is the VLAN ID field in an 802.1Q tag?
- 8 bits
- [x] 12 bits
- 16 bits
- 32 bits
> 12 bits gives 4096 values, of which 1 to 4094 are usable. The whole tag is 4 bytes (32 bits), which is the tempting wrong answer.

### How are frames in the native VLAN sent across an 802.1Q trunk?
- Tagged with VLAN 1
- Tagged with the native VLAN number
- [x] Untagged
- They are not allowed on trunks
> The native VLAN is the one VLAN sent without a tag. A frame arriving untagged on a trunk is placed in the native VLAN.

### Both ends of a link are set to <code>switchport mode dynamic auto</code>. What happens?
- The link becomes a trunk
- The link goes err-disabled
- The link becomes a trunk only for VLAN 1
- [x] The link stays an access link
> Auto waits to be asked. With two auto ends nobody asks, so no trunk forms.

### A trunk carries VLANs 10 and 20. You enter <code>switchport trunk allowed vlan 30</code>. What happens?
- [x] Only VLAN 30 is carried; 10 and 20 stop
- VLAN 30 is added to 10 and 20
- The command is rejected
- VLAN 30 becomes the native VLAN
> Without the add keyword the list is replaced. To append, use switchport trunk allowed vlan add 30.

### The trunk is up and VLAN 10 pings work, but VLAN 20 pings fail. <code>show vlan brief</code> on SW2 has no VLAN 20. Why?
- The native VLAN is wrong
- [x] VLAN 20 does not exist on SW2, so SW2 will not forward it
- The trunk needs a second cable for VLAN 20
- PC4 needs a tag
> A switch only forwards VLANs it has. Create VLAN 20 on SW2 and it appears in the trunk's active list.

## @story
```json
[
 {
  "path": [
   "PC1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "UNTAGGED IN",
  "t": "Into an access port",
  "x": "PC1 sends a frame for PC3. It arrives untagged on Fa0/1, and SW1 knows it is in VLAN 10 because of the port."
 },
 {
  "path": [
   "SW1",
   "SW2"
  ],
  "cls": "req",
  "at": "SW2",
  "label": "TAG 10",
  "t": "Tagged on the trunk",
  "x": "PC3 is reached through G0/1, a trunk. SW1 inserts an 802.1Q tag with VLAN ID 10 and sends the frame across."
 },
 {
  "path": [
   "SW2",
   "PC3"
  ],
  "cls": "req",
  "at": "PC3",
  "label": "TAG REMOVED",
  "good": 1,
  "t": "Delivered in VLAN 10",
  "x": "SW2 reads VLAN 10 from the tag, removes the tag, and sends the frame out Fa0/1, its VLAN 10 access port."
 },
 {
  "path": [
   "PC2",
   "SW1",
   "SW2"
  ],
  "cls": "req",
  "at": "SW2",
  "label": "TAG 20",
  "t": "Same cable, other VLAN",
  "x": "PC2 is in VLAN 20, so its frames cross the same trunk tagged 20. The tag keeps the two VLANs apart on one wire."
 },
 {
  "path": [
   "SW2",
   "PC4"
  ],
  "cls": "req",
  "at": "PC4",
  "label": "VLAN 20 ONLY",
  "good": 1,
  "t": "Delivered in VLAN 20",
  "x": "SW2 delivers the frame only to VLAN 20 ports. PC3 never sees it."
 },
 {
  "path": [
   "SW1",
   "SW2"
  ],
  "cls": "req",
  "at": "SW2",
  "label": "VLAN 30 BLOCKED",
  "bad": 1,
  "t": "Not on the allowed list",
  "x": "If SW1 also had a VLAN 30, its frames would not be sent on G0/1, because the allowed list is only 10 and 20."
 }
]
```
