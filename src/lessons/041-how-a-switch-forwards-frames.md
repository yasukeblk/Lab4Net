---
title: How a switch forwards frames
name: How a switch learns, forwards and floods
topic: true
ccna: 1.13
mins: 8
---

## The job of a switch
<p>A switch connects devices on the same LAN and sends each Ethernet frame only where it needs to go. To do that it must know which port leads to which device. It works this out by itself, by watching traffic, and keeps the answers in its <b>MAC address table</b> (also called the CAM table).</p><p>Every Ethernet frame carries a <b>destination MAC</b> address and a <b>source MAC</b> address. A MAC address is 48 bits, written in hexadecimal, for example 0050.7966.6801. The first half is the <b>OUI</b>, which identifies the maker.</p><p>A frame is laid out as: destination MAC, source MAC, a <b>type</b> field saying what is inside (for example IPv4), the data, and a <b>frame check sequence</b> (FCS) at the end. The FCS lets the receiver detect damage. A switch that receives a frame with a bad FCS drops it rather than passing the damage on. The switch reads the MAC addresses but does not change them: the frame leaves exactly as it arrived.</p>

## Learning: reading the source
<p>When a frame arrives, the switch looks at its <b>source</b> MAC address and the port it came in on, and records that pair in the table. It now knows that the device can be reached through that port. If the device moves to another port, the next frame it sends updates the entry.</p><p>Learning only ever uses the source address. A device that never sends anything is never learned.</p>

## Forwarding, filtering and flooding
<p>Next the switch looks up the frame's <b>destination</b> MAC address:</p><ul><li><b>Known unicast</b>: the address is in the table. The switch forwards the frame out of that one port only.</li><li><b>Filtering</b>: if the table says the destination is on the same port the frame arrived on, the switch drops it, because the device has already received it.</li><li><b>Unknown unicast</b>: the address is not in the table. The switch <b>floods</b> the frame out of every port in the same VLAN except the one it arrived on. When the destination replies, its source address is learned, and later frames go to one port only.</li><li><b>Broadcast</b> (FFFF.FFFF.FFFF): always flooded out of every port in the VLAN except the incoming one. ARP requests and DHCP Discovers are broadcasts.</li></ul><p>Flooding stays inside the VLAN. A frame in VLAN 10 is never flooded to ports in VLAN 20.</p>

## A short example
<ol><li>The table is empty. PC-A on port Fa0/1 sends a frame to PC-B.</li><li>The switch learns PC-A is on Fa0/1. PC-B is unknown, so it floods the frame out of every other port in the VLAN.</li><li>PC-B, on Fa0/2, replies to PC-A. The switch learns PC-B is on Fa0/2, finds PC-A in the table and forwards the reply out of Fa0/1 only.</li><li>From now on, frames between the two go straight from port to port. Other devices no longer see them.</li></ol>

## Aging
<p>Each learned entry has a timer. If no frame is seen from that address for the <b>aging time</b>, the entry is removed. On Cisco switches the default is <b>300 seconds</b> (5 minutes), changed with <code>mac address-table aging-time</code>. Aging keeps the table from filling with devices that have left, and lets moved devices be relearned. Every frame from a device resets its timer.</p><p>Entries you configure by hand are <b>static</b> and never age out.</p>

## Checking the table
<p><code>show mac address-table</code> lists each entry with its VLAN, MAC address, type (DYNAMIC or STATIC) and port. <code>show mac address-table dynamic</code> shows only learned entries, and you can filter by <code>address</code> or <code>interface</code>. <code>show mac address-table aging-time</code> shows the timer, and <code>clear mac address-table dynamic</code> empties the learned entries so the switch learns them again.</p><p>If many MAC addresses appear on one port, that port leads to another switch (or to a hub or AP), not to a single host.</p>

## @terms
- MAC address table :: The switch's list of MAC addresses, each with the VLAN and port it was learned on. Also called the CAM table.
- MAC learning :: Recording a frame's source MAC address against the port it arrived on.
- Unknown unicast :: A frame whose destination MAC is not in the table; the switch floods it.
- Flooding :: Sending a frame out of every port in the VLAN except the one it arrived on.
- Filtering :: Dropping a frame whose destination is on the same port it came in on.
- Aging time :: How long a dynamic entry stays without new frames from that address; 300 seconds by default.
- OUI :: The first 24 bits of a MAC address, which identify the manufacturer.

## @exam
- 1.13: describe switching concepts: MAC learning and aging, frame switching, frame flooding, MAC address table.
- Switches learn from the source MAC and forward on the destination MAC.
- Unknown unicast and broadcast frames are flooded out of all ports in the VLAN except the incoming port.
- Default MAC aging time on Cisco switches is 300 seconds.
- <code>show mac address-table</code> shows VLAN, MAC, type and port.

## @mistakes
- Saying the switch learns from the destination address: it learns only from the source.
- Expecting a silent device (a printer that never sends) to appear in the table: it shows up only after it sends a frame.
- Thinking flooding crosses VLANs: it stays in the VLAN the frame belongs to.
- Reading many MACs on one port as an attack: usually it is just an uplink to another switch.

## @quiz

### A frame arrives on Gi0/3. What does the switch do with the frame's source MAC address?
- Floods it to every port
- [x] Records it in the MAC address table against Gi0/3
- Looks it up to decide where to forward
- Ignores it
> Learning uses the source address and the incoming port. The destination address is what the switch looks up to forward.

### The destination MAC of a unicast frame is not in the table. What does the switch do?
- Drops the frame
- Sends it to the default gateway
- [x] Floods it out of all ports in the VLAN except the one it arrived on
- Sends an ARP request first
> An unknown unicast is flooded within the VLAN. When the destination answers, the switch learns where it is.

### What is the default MAC address table aging time on a Cisco switch?
- 30 seconds
- [x] 5 minutes
- 4 hours
- Entries never age out
> Dynamic entries are removed after 300 seconds without a frame from that address. Static entries do not age.

### A frame's destination MAC is in the table on the same port the frame arrived on. What happens?
- [x] The switch filters (drops) the frame
- The switch floods the frame
- The switch forwards it back out of that port
- The switch removes the table entry
> The destination is on the segment the frame came from, so it has already received it. Sending it back would only duplicate it.
