---
title: VLANs and access ports
name: Why VLANs split a switch
mins: 8
---

## One switch, one broadcast domain
<p>A <b>broadcast</b> is a frame sent to every device on the LAN, for example an ARP request (which asks who owns an IP address) or a DHCP Discover. A plain switch floods broadcasts out of every port, so every device hears every other device. That set of devices is called a <b>broadcast domain</b>.</p><p>As a network grows, that means more noise, and it means Sales and Engineering sit on the same LAN with nothing between them. A <b>VLAN</b> (virtual LAN) splits one physical switch into several separate broadcast domains.</p>

## How a switch forwards frames
<p>A switch learns by reading the <b>source MAC address</b> of each frame and recording which port it came in on, in its <b>MAC address table</b>. Entries age out after 300 seconds of silence by default.</p><p>To forward, it reads the destination MAC. If the address is in the table, the frame goes out that one port. If it is a broadcast, or an unknown address, the switch <b>floods</b> it out of every other port. With VLANs, all of this happens per VLAN: the table records the VLAN, and flooding stays inside the VLAN the frame arrived in.</p>

## What a VLAN is
<p>Think of each VLAN as a separate switch living inside the real one. Each VLAN is its own broadcast domain and normally its own IP subnet. In this lab VLAN 10 (SALES) uses 192.168.10.0/24 and VLAN 20 (ENGINEERING) uses 192.168.20.0/24.</p><p>Every port starts in <b>VLAN 1</b>, the default VLAN, which cannot be deleted. VLANs 1 to 1005 are the normal range (1002 to 1005 are reserved for old technologies) and 1006 to 4094 the extended range. The <code>name</code> is only a label for people.</p>

## Access ports
<p>An <b>access port</b> belongs to exactly one VLAN and is meant for an end device. Frames leave it <b>untagged</b>, so the PC has no idea VLANs exist. The switch knows a frame is in VLAN 10 purely because it arrived on a VLAN 10 port.</p><p><code>switchport mode access</code> fixes the port as an access port, so it never negotiates itself into a trunk. <code>switchport access vlan 10</code> puts it in VLAN 10. Here Fa0/1 and Fa0/2 go to VLAN 10, Fa0/3 and Fa0/4 to VLAN 20. The port assignment, not the PC address, is what separates the hosts.</p>

## Why PC1 cannot reach PC3
<p>PC1 (192.168.10.11) and PC2 (192.168.10.12) share a VLAN and a subnet, so they ARP for each other directly. PC3 is 192.168.20.13: PC1 sees that address is outside its own subnet and must hand the packet to a router. There is none in this lab, so the ping fails, even though all four PCs are on the same switch. Moving traffic between VLANs needs a Layer 3 device, which is what the router-on-a-stick lab adds.</p>

## Check it worked
<p><code>show vlan brief</code> lists each VLAN, its name, and the access ports in it. It does not list trunk ports. <code>show interfaces fa0/1 switchport</code> shows a single port mode and access VLAN. <code>show mac address-table</code> shows the learned addresses with their VLAN.</p>

## @terms
- Broadcast domain :: The set of devices that receive each other's broadcasts.
- VLAN :: A virtual LAN: a separate broadcast domain on a switch, identified by a number.
- Access port :: A switch port in one VLAN that sends and receives untagged frames, used for end devices.
- MAC address table :: The switch's list of which MAC address was seen on which port, in which VLAN.
- Flooding :: Sending a frame out of every port in the VLAN except the one it came in on.
- Default VLAN :: VLAN 1, where every port starts. It cannot be deleted.
- MAC aging :: Removing a table entry that has not been seen for a while, 300 seconds by default.

## @exam
- 2.1: configure and verify VLANs (normal range) spanning multiple switches: access ports, default VLAN, InterVLAN connectivity. 1.13: describe switching concepts: MAC learning and aging, frame switching, flooding, MAC address table.
- A switch learns from the source MAC and forwards on the destination MAC.
- Unknown unicast and broadcast frames are flooded, but only within their VLAN.
- Each VLAN is a separate broadcast domain and needs a router or Layer 3 switch to reach another VLAN.
- Normal range is 1 to 1005, extended 1006 to 4094. VLAN 1 is the default and cannot be deleted.

## @mistakes
- Assigning a port to the wrong VLAN: the PC looks fine but cannot reach its neighbours. <code>show vlan brief</code> shows it in the wrong row.
- Expecting two VLANs to talk because they share a switch: they need routing.
- Giving PCs in different VLANs addresses from the same subnet: they think they are local to each other, ARP fails, and nothing works.
- Looking for a trunk port in <code>show vlan brief</code>: trunks are not listed there; use <code>show interfaces trunk</code>.

## @quiz

### After the lab, PC1 sends a broadcast. Which PCs receive it?
- PC2, PC3 and PC4
- PC3 and PC4
- None of them
- [x] PC2 only
> Broadcasts are flooded only inside the VLAN they arrived in. PC2 is the only other host in VLAN 10.

### Which VLAN is every switch port in before you change anything?
- VLAN 0
- [x] VLAN 1
- VLAN 1002
- No VLAN until one is assigned
> VLAN 1 is the default VLAN. Every port starts there, and it cannot be deleted.

### PC1 and PC3 are on the same switch. Why does the ping between them fail?
- The cables are on the wrong ports
- The VLAN names are different
- [x] They are in different VLANs and subnets, and nothing routes between them
- Access ports block ICMP
> A VLAN is a separate broadcast domain and subnet. Crossing from one to another needs a router or Layer 3 switch. Names are only labels.

### Which command quickly shows which access ports are in each VLAN?
- [x] show vlan brief
- show interfaces trunk
- show ip interface brief
- show mac address-table
> show vlan brief lists each VLAN with its access ports. The MAC table shows learned addresses, not port membership.

### What does an access port send to a PC?
- Frames tagged with the VLAN ID
- Frames tagged with VLAN 1
- [x] Untagged frames
- Only broadcast frames
> Access ports send untagged frames. The VLAN is known to the switch from the port; the PC never sees a tag.

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
  "label": "LEARN MAC",
  "t": "A broadcast arrives",
  "x": "PC1 broadcasts an ARP request for 192.168.10.12. It arrives on Fa0/1, so SW1 records PC1's MAC address on Fa0/1 in VLAN 10."
 },
 {
  "path": [
   "SW1",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "FLOOD VLAN 10",
  "t": "Flooded inside VLAN 10",
  "x": "SW1 floods the broadcast, but only to the other ports in VLAN 10. That is just Fa0/2, so PC2 receives it."
 },
 {
  "path": [
   "SW1",
   "PC3"
  ],
  "cls": "req",
  "at": "PC3",
  "label": "NOT SENT",
  "bad": 1,
  "t": "VLAN 20 never sees it",
  "x": "Fa0/3 and Fa0/4 are in VLAN 20, a different broadcast domain. SW1 does not send the broadcast to PC3 or PC4."
 },
 {
  "path": [
   "PC2",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "ARP REPLY",
  "good": 1,
  "t": "Unicast reply",
  "x": "PC2 answers with a unicast frame. SW1 already knows PC1 is on Fa0/1 in VLAN 10, so it forwards the reply out that one port. The ping can now go ahead."
 },
 {
  "path": [
   "PC1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "NO ROUTER",
  "bad": 1,
  "t": "Trying another VLAN",
  "x": "PC1 pings 192.168.20.13. That is outside its subnet, so the packet has to go to a router. Nothing routes between the VLANs, so the ping fails."
 }
]
```
