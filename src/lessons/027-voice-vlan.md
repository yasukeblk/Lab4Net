---
title: Voice VLAN
name: How a phone and a PC share one switch port
mins: 8
---

## The problem: two devices, one cable
<p>Offices often have one network jack per desk. An IP phone (PHONE1) has a small built-in switch with two ports: one to the wall (here SW1 Fa0/1) and one for the PC (PC1). Both devices now share Fa0/1.</p><p>An access port normally carries one VLAN. Right now both the phone and the PC land in VLAN 10, the data VLAN. Voice traffic is mixed with data, cannot be given priority on its own, and the phone cannot use the voice network to reach its call server, CUCM.</p>

## Two VLANs on an access port
<p>A <b>voice VLAN</b> lets one access port carry two VLANs:</p><ul><li>The <b>access VLAN</b> (10) for the PC, sent <b>untagged</b>, as on any access port.</li><li>The <b>voice VLAN</b> (150) for the phone, sent with an <b>802.1Q tag</b> that names VLAN 150.</li></ul><p>It is still an access port, not a trunk. The PC's untagged frames go into VLAN 10, and the PC cannot reach other VLANs by tagging its own frames. The tag also has a 3-bit priority field (<b>CoS</b>), and phones normally mark voice CoS 5 so switches can queue it ahead of data.</p>

## How the phone learns its VLAN
<ol><li>The switch advertises the voice VLAN to the phone in <b>CDP</b> (or LLDP-MED, for other vendors' phones).</li><li>The phone starts tagging its own traffic with VLAN 150.</li><li>It sends a new DHCP request, which now arrives in VLAN 150, at R1's subinterface G0/0.150. R1 answers from the VOICE pool with a 192.168.150.x address.</li><li>The VOICE pool includes <b>option 150</b>, the address of the TFTP server the phone loads its configuration from; here that is the call server.</li><li>Frames from the PC pass through the phone untagged and stay in VLAN 10.</li></ol>

## Why voice gets its own VLAN
<p>Voice is sensitive in a way data is not. A file download that pauses for a moment is fine; a call that loses or delays packets sounds broken. Keeping phones in their own VLAN and subnet makes it easy to:</p><ul><li>recognise voice traffic and give it priority (QoS) all the way to the call server,</li><li>keep the PCs' broadcasts away from the phones,</li><li>apply separate security rules, so a PC cannot easily reach the call system.</li></ul>

## Configured here
<p>On SW1, the VLAN must exist first: <code>vlan 150</code> and <code>name VOICE</code>. Then on Fa0/1, keep <code>switchport access vlan 10</code> and add <code>switchport voice vlan 150</code>. R1 already routes both VLANs on subinterfaces G0/0.10 and G0/0.150 and has a DHCP pool for each. CDP shows the phone as SEP followed by its MAC address, with capability P (phone).</p>

## Check it worked
<p><code>show interfaces fa0/1 switchport</code> shows Access Mode VLAN 10 and Voice VLAN 150. <code>show vlan brief</code> lists Fa0/1 under both VLAN 10 and VLAN 150. After renewing, the phone has a 192.168.150.x address and pings the call server at 192.168.200.5, while the PC still has 192.168.10.x and reaches its gateway 192.168.10.1.</p>

## @terms
- Voice VLAN :: A second VLAN on an access port, used by an IP phone with 802.1Q tags.
- Access VLAN :: The VLAN for untagged frames on an access port, here the PC's data VLAN.
- 802.1Q tag :: A 4-byte field added to a frame that carries the VLAN number and a priority.
- CoS :: Class of Service: the 3-bit priority field in the 802.1Q tag. Voice is usually 5.
- CDP :: Cisco Discovery Protocol, used here to tell the phone which voice VLAN to use.
- DHCP option 150 :: Gives Cisco IP phones the address of the TFTP server they load their configuration from.

## @exam
- 2.1: configure and verify VLANs (normal range) spanning multiple switches: access ports (data and voice), default VLAN, InterVLAN connectivity.
- A port with a voice VLAN is still an access port: data untagged, voice tagged.
- The command is <code>switchport voice vlan</code> on the interface; the VLAN should exist in the VLAN database.
- <code>show interfaces switchport</code> shows the Voice VLAN line.
- The switch tells a Cisco phone its voice VLAN through CDP.

## @mistakes
- Making the port a trunk to carry two VLANs: it works, but the PC could then send tagged frames into any allowed VLAN. A voice VLAN is the intended way.
- Forgetting to create VLAN 150: the port lists a voice VLAN that does not exist, so the phone's tagged traffic goes nowhere.
- Disabling CDP on the port: a Cisco phone never learns the voice VLAN and stays in the data VLAN.
- Not renewing the phone's address: it keeps its old 192.168.10.x lease until it asks again.

## @quiz

### A port has <code>switchport access vlan 10</code> and <code>switchport voice vlan 150</code>. How are the PC's frames sent?
- Tagged with VLAN 10
- [x] Untagged, in VLAN 10
- Tagged with VLAN 150
- Untagged, in VLAN 150
> The access VLAN is untagged as on any access port. Only the phone's voice traffic carries an 802.1Q tag.

### How does a Cisco IP phone learn which voice VLAN to use?
- From DHCP option 150
- From the PC plugged into it
- [x] From the switch, through CDP
- It always uses VLAN 1
> The switch advertises the voice VLAN in CDP. Option 150 gives the TFTP server address, not the VLAN.

### Which command confirms the access and voice VLANs on Fa0/1?
- [x] show interfaces fa0/1 switchport
- show interfaces trunk
- show ip interface brief
- show mac address-table
> show interfaces switchport lists Access Mode VLAN and Voice VLAN. A voice port is not a trunk, so show interfaces trunk does not list it.

### What priority value do IP phones usually mark in the 802.1Q tag for voice?
- CoS 0
- CoS 3
- CoS 7
- [x] CoS 5
> Voice is usually marked CoS 5 so switches can queue it ahead of data. 0 is best effort.

## @story
```json
[
 {
  "path": [
   "PHONE1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "UNTAGGED VLAN 10",
  "bad": 1,
  "t": "Before: everything is data",
  "x": "With no voice VLAN on Fa0/1 the phone sends untagged frames, so they land in VLAN 10 and it gets a 192.168.10.x address like the PC."
 },
 {
  "path": [
   "SW1",
   "PHONE1"
  ],
  "cls": "rep",
  "at": "PHONE1",
  "label": "CDP: VOICE 150",
  "t": "The switch tells the phone",
  "x": "After <code>switchport voice vlan 150</code>, SW1 includes VLAN 150 in its CDP messages to the phone."
 },
 {
  "path": [
   "PHONE1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "TAG 150",
  "t": "The phone tags its traffic",
  "x": "The phone tags its frames with VLAN 150 and CoS 5 and asks DHCP again. The request arrives on R1 G0/0.150 and is answered from the VOICE pool."
 },
 {
  "path": [
   "PC1",
   "PHONE1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "UNTAGGED 10",
  "good": 1,
  "t": "The PC stays in data",
  "x": "PC1's frames pass through the phone untagged. SW1 puts them in the access VLAN, 10, and the PC keeps its 192.168.10.x address."
 },
 {
  "path": [
   "PHONE1",
   "SW1",
   "R1",
   "CUCM"
  ],
  "cls": "req",
  "at": "CUCM",
  "label": "CALL SERVER",
  "good": 1,
  "t": "Voice reaches the call server",
  "x": "From its 192.168.150.x address the phone reaches CUCM at 192.168.200.5, the server option 150 pointed it to."
 },
 {
  "path": [
   "CUCM",
   "R1",
   "SW1",
   "PHONE1"
  ],
  "cls": "rep",
  "at": "PHONE1",
  "label": "REPLY TAG 150",
  "good": 1,
  "t": "Replies come back tagged",
  "x": "R1 sends the reply out G0/0.150, and SW1 delivers it to Fa0/1 tagged for VLAN 150, so it goes to the phone and not the PC."
 }
]
```
