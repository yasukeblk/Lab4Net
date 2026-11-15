---
title: Native VLAN and allowed VLANs on trunks
name: How trunks carry VLANs, tagged and untagged
mins: 8
---

## The problem: a default trunk
<p>A <b>VLAN</b> splits one switch into separate Layer 2 networks. A <b>trunk</b> is a link that carries several VLANs at once, usually between switches. Here SW1 Gi0/1 to SW2 Gi0/1 is the trunk, and it carries STAFF (VLAN 10) and BENCH (VLAN 30).</p><p>Out of the box a trunk works, but two defaults are weak. It carries <b>every</b> VLAN, and its <b>native VLAN</b> is VLAN 1. This lab changes both: native VLAN 99, and only VLANs 10 and 99 allowed.</p>

## How 802.1Q tags frames
<p>When a frame crosses a trunk, the receiving switch must know which VLAN it belongs to. <b>IEEE 802.1Q</b> solves this by inserting a 4-byte <b>tag</b> into the Ethernet frame. The tag holds a 12-bit VLAN ID, so VLANs 1 to 4094 are usable.</p><ol><li>PC1 sends a normal, untagged frame into SW1 Fa0/1, an access port in VLAN 10.</li><li>SW1 adds a tag saying VLAN 10 and sends it over Gi0/1.</li><li>SW2 reads the tag, removes it and delivers the frame only to VLAN 10 ports, such as PC2's.</li></ol><p>The PCs never see a tag. Only trunks carry them.</p>

## The native VLAN: the one sent untagged
<p>One VLAN on each trunk is sent <b>without</b> a tag. That is the native VLAN. A frame that arrives on a trunk with no tag is placed into the receiving switch's own native VLAN.</p><p>That has two consequences:</p><ul><li><b>Both ends must agree.</b> Each switch only knows its own setting. If SW1 uses 99 and SW2 still uses 1, untagged frames leave SW1 in VLAN 99 and arrive in VLAN 1 on SW2: two VLANs are silently joined. CDP notices and logs a <i>native VLAN mismatch</i>. You will see that message between configuring SW1 and SW2.</li><li><b>Use an unused VLAN.</b> In a <i>VLAN hopping</i> attack by double tagging, an attacker in the native VLAN sends a frame with two tags. The first switch strips the outer tag (it matches the native VLAN) and forwards the frame with the inner tag into another VLAN. If no host is in the native VLAN, nobody can start this attack. That is why VLAN 99 is named NATIVE and has no ports.</li></ul>

## The allowed VLAN list
<p>By default a trunk carries all VLANs. <code>switchport trunk allowed vlan 10,99</code> replaces that list. VLAN 30 frames are then never sent across Gi0/1, so the two BENCH ports become two isolated islands: PC3 can no longer reach PC4.</p><p>Pruning the list also keeps broadcasts for unneeded VLANs off the link. Keep the native VLAN in the list. Be careful with the keyword: <code>allowed vlan 30</code> on its own <b>replaces</b> the list, while <code>allowed vlan add 30</code> adds to it.</p>

## Check it worked
<p><code>show interfaces trunk</code> has the answers in separate blocks: the trunk's mode and <b>native VLAN</b>, the <b>VLANs allowed</b> on the trunk, and the VLANs <b>allowed and active</b>. Check both switches, because each shows only its own side. Then test what must still work (PC1 to PC2) and what must now fail (PC3 to PC4).</p>

## @terms
- Trunk :: A switch link that carries frames for several VLANs, telling them apart with tags.
- 802.1Q :: The IEEE standard for VLAN tagging. It inserts a 4-byte tag with a 12-bit VLAN ID.
- Native VLAN :: The one VLAN on a trunk whose frames are sent untagged. VLAN 1 by default.
- Native VLAN mismatch :: The two ends of a trunk use different native VLANs, so untagged traffic leaks between VLANs. CDP reports it.
- Allowed VLAN list :: The VLANs a trunk will carry. All VLANs by default.
- Double tagging :: A VLAN hopping attack that uses two 802.1Q tags to push a frame from the native VLAN into another VLAN.
- Access port :: A port in one VLAN that sends and receives untagged frames, used for end devices.

## @exam
- 2.2: configure and verify interswitch connectivity: trunk ports, 802.1Q, native VLAN.
- The native VLAN is untagged; every other VLAN on the trunk is tagged.
- The default native VLAN is 1, and by default a trunk allows all VLANs.
- <code>allowed vlan</code> replaces the list; <code>allowed vlan add</code> and <code>remove</code> change it.
- Best practice: native VLAN set to an unused VLAN, the same on both ends.

## @mistakes
- Changing the native VLAN on one end only: CDP logs a native VLAN mismatch and untagged traffic lands in the wrong VLAN.
- Typing <code>switchport trunk allowed vlan 30</code> to add one VLAN: it replaces the list and every other VLAN stops crossing the trunk.
- Putting hosts in the native VLAN: they become a starting point for double-tagging attacks.
- Forgetting to create the VLAN on both switches, so traffic for it has nowhere to go on the far side.

## @quiz

### On an 802.1Q trunk, which frames cross without a tag?
- [x] Frames in the native VLAN
- Frames in VLAN 1, whatever the native VLAN is
- Frames in every VLAN except the native VLAN
- Only CDP and STP frames
> Only the native VLAN is sent untagged. It is VLAN 1 by default, but once you change it to 99, VLAN 99 is the untagged one.

### SW1 uses native VLAN 99 and SW2 still uses VLAN 1. What happens?
- The trunk shuts down until they match
- [x] Untagged frames from SW1 land in VLAN 1 on SW2, and CDP logs a mismatch
- SW2 automatically changes to VLAN 99
- Nothing, because the native VLAN only matters locally
> Each switch puts untagged frames into its own native VLAN, so the two VLANs are joined. CDP spots the disagreement and logs it; the trunk itself stays up.

### A trunk allows VLANs 10 and 99. An engineer types <code>switchport trunk allowed vlan 30</code>. What is allowed now?
- 10, 30 and 99
- 10 and 99, because 30 was rejected
- All VLANs
- [x] Only 30
> Without <code>add</code>, the command replaces the whole list. <code>switchport trunk allowed vlan add 30</code> would have kept 10 and 99.

### Why should the native VLAN be one that no host uses?
- It makes the trunk faster
- Cisco switches refuse a native VLAN that has hosts
- [x] It limits double-tagging attacks, which start from the native VLAN
- It stops CDP running on the trunk
> A double-tagged frame only works if the attacker is in the native VLAN. With no hosts there, nobody can start the attack.

### Which command shows a trunk's native VLAN and its allowed VLANs together?
- show vlan brief
- [x] show interfaces trunk
- show mac address-table
- show cdp neighbors
> <code>show interfaces trunk</code> lists mode, native VLAN, allowed VLANs and active VLANs per trunk. <code>show vlan brief</code> lists access ports, not trunks.

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
  "label": "UNTAGGED",
  "t": "An access port receives a frame",
  "x": "PC1 sends a normal Ethernet frame to PC2. SW1 Fa0/1 is an access port in VLAN 10, so SW1 knows the frame belongs to STAFF."
 },
 {
  "path": [
   "SW1",
   "SW2"
  ],
  "cls": "req",
  "at": "SW2",
  "label": "TAG VLAN 10",
  "t": "Tagged across the trunk",
  "x": "SW1 inserts an 802.1Q tag with VLAN ID 10 and sends the frame over Gi0/1. SW2 reads the tag to learn which VLAN it belongs to."
 },
 {
  "path": [
   "SW2",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "DELIVERED",
  "good": 1,
  "t": "Tag removed at the far side",
  "x": "SW2 removes the tag and delivers the frame out of Fa0/1, a VLAN 10 access port. PC2 never sees the tag."
 },
 {
  "path": [
   "SW1",
   "SW2"
  ],
  "cls": "req",
  "at": "SW2",
  "label": "NATIVE MISMATCH",
  "bad": 1,
  "t": "Only one end changed",
  "x": "SW1 now sends VLAN 99 traffic untagged, but SW2 still puts untagged frames into VLAN 1. CDP sees the two ends disagree and logs a native VLAN mismatch."
 },
 {
  "path": [
   "SW2",
   "SW1"
  ],
  "cls": "rep",
  "at": "SW1",
  "label": "NATIVE 99 BOTH",
  "good": 1,
  "t": "Both ends agree",
  "x": "With native VLAN 99 on SW2 too, untagged frames stay in VLAN 99 at both ends and the mismatch message stops."
 },
 {
  "path": [
   "PC3",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "VLAN 30 BLOCKED",
  "bad": 1,
  "t": "BENCH stays on its own switch",
  "x": "PC3 pings PC4. VLAN 30 is not in the trunk's allowed list, so SW1 never sends the frame across Gi0/1. The bench VLAN on each floor is now isolated."
 }
]
```
