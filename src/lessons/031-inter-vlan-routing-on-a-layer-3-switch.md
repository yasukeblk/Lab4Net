---
title: Inter-VLAN routing on a Layer 3 switch
name: How a switch routes between VLANs
mins: 8
---

## The problem: hosts in different VLANs
<p>A VLAN is its own subnet, and a switch alone will not move traffic between VLANs. Something has to <b>route</b>. With router-on-a-stick, one router link carries every VLAN as a trunk, so a packet from VLAN 10 to VLAN 20 crosses that link twice. As traffic grows, that link fills up.</p><p>A <b>Layer 3 switch</b> such as DSW1, a Catalyst 3560, can route itself, in hardware, at the same speed it switches.</p>

## Turning the switch into a router
<p>On a 3560, routing is off by default. Until <code>ip routing</code> is entered, DSW1 behaves like an ordinary switch, and <code>show ip route</code> only shows a default gateway for its own management traffic.</p><p>Once routing is on, DSW1 builds a routing table like any router: connected networks from its interfaces, plus any static routes you add.</p>

## SVIs: one gateway per VLAN
<p>A <b>switch virtual interface</b> (SVI) is a Layer 3 interface for a whole VLAN, created with <code>interface vlan 10</code>. It has no physical port of its own. Its address, 192.168.10.1, is the default gateway for every host in VLAN 10, wherever it is plugged in.</p><p>PC1 is on DSW1 directly, and PC3 is on ASW1 across the trunk. Both use 192.168.10.1. An SVI comes up when its VLAN exists and at least one port carrying that VLAN is up and forwarding.</p>

## What happens to a packet inside DSW1
<ol><li>PC1 sees that PC2, 192.168.20.12, is not in its own subnet, so it sends the frame to its gateway's MAC address: the VLAN 10 SVI.</li><li>DSW1 receives the frame in VLAN 10, sees its own MAC as the destination, and looks up 192.168.20.12 in its routing table.</li><li>The match is the connected route on the VLAN 20 SVI. DSW1 rewrites the frame with its own MAC as the source and PC2's MAC as the destination, lowers the TTL, and switches it out in VLAN 20.</li></ol><p>This is exactly what a router does. The difference is that the switch does it in hardware, on every port at once.</p>

## Routed ports for links to routers
<p>The link to R1 does not need a VLAN at all. <code>no switchport</code> on Gi0/2 turns it into a <b>routed port</b>: a plain Layer 3 interface, like a router's, with its own address, 10.0.0.1/30. It belongs to no VLAN and spanning tree does not run on it.</p><p>A default route, <code>ip route 0.0.0.0 0.0.0.0 10.0.0.2</code>, then sends everything that is not local to R1. R1 already has a route back to 192.168.0.0/16.</p>

## Check it worked
<p><code>show ip route</code> on DSW1 should list C (connected) routes for 192.168.10.0/24, 192.168.20.0/24 and 10.0.0.0/30, and an S* default route. A trace from PC1 to PC2 shows a single hop, 192.168.10.1: the packet turned around inside DSW1. PC3 reaching 203.0.113.1 proves the SVI works across the trunk and the default route works.</p>

## @terms
- Layer 3 switch :: A switch that can also route between subnets, in hardware.
- SVI :: Switch virtual interface. A Layer 3 interface for a VLAN, used as that VLAN's gateway.
- Routed port :: A switch port turned into a Layer 3 interface with no switchport. It has an address and no VLAN.
- ip routing :: The command that turns on IPv4 routing on a Layer 3 switch.
- Router-on-a-stick :: Routing between VLANs with one router link that carries all VLANs as a trunk, using subinterfaces.
- Default route :: 0.0.0.0/0, the route used when nothing more specific matches.

## @exam
- 2.1: configure and verify VLANs. 3.3: configure and verify IPv4 static routing, including default routes.
- An SVI is up/up only if its VLAN exists and an active port carries that VLAN.
- <code>no switchport</code> makes a routed port; <code>interface vlan</code> makes an SVI. Know which fits a link to a router.
- Compare the three ways to route between VLANs: a router port per VLAN, router-on-a-stick, and a Layer 3 switch.

## @mistakes
- Forgetting <code>ip routing</code>: the SVIs have addresses and answer pings, but nothing is routed between VLANs.
- Creating <code>interface vlan 30</code> for a VLAN that does not exist on the switch: the SVI stays down.
- Putting the address on Gi0/2 without <code>no switchport</code>: a switch port cannot take an IP address.
- Hosts with the wrong default gateway: they reach their own VLAN but nothing else.

## @quiz

### On a Layer 3 switch, PC1 and PC2 can each ping their own SVI but not each other. What is most likely missing?
- A trunk between the VLANs
- [x] ip routing
- no switchport on the access ports
- A default route
> The SVIs answer, so the addresses and VLANs are fine. Without ip routing the switch will not forward between them. A default route only matters for non-local traffic.

### Which command makes Gi0/2 a routed port?
- switchport mode routed
- ip routing
- [x] no switchport
- interface vlan 2
> no switchport turns the port into a Layer 3 interface. There is no switchport mode routed command.

### When is an SVI up/up?
- As soon as it has an IP address
- When ip routing is on
- When a trunk is configured on the switch
- [x] When its VLAN exists and at least one port carrying it is up
> An SVI depends on its VLAN: the VLAN must exist and an active, forwarding port must carry it. An address alone does not bring it up.

### Why is a Layer 3 switch better than router-on-a-stick for heavy inter-VLAN traffic?
- [x] It routes in hardware and avoids sending every packet across one router link twice
- It needs no IP addresses
- It removes the need for VLANs
- It uses spanning tree to balance load
> With router-on-a-stick, traffic between VLANs goes to the router and back on one link. The Layer 3 switch routes internally, at switching speed.

## @story
```json
[
 {
  "path": [
   "PC1",
   "DSW1"
  ],
  "cls": "req",
  "at": "DSW1",
  "label": "NO ROUTING",
  "bad": 1,
  "t": "Before ip routing",
  "x": "PC1 sends a packet for PC2 to its gateway. Without routing turned on, DSW1 has nowhere to route it, so it is lost."
 },
 {
  "path": [
   "PC1",
   "DSW1"
  ],
  "cls": "req",
  "at": "DSW1",
  "label": "SVI VLAN 10",
  "t": "PC1 reaches its gateway",
  "x": "With routing and SVIs in place, PC1 sends the packet to 192.168.10.1, the VLAN 10 SVI on DSW1."
 },
 {
  "path": [
   "DSW1",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "ROUTED",
  "good": 1,
  "t": "Routed out of VLAN 20",
  "x": "DSW1 finds 192.168.20.0/24 as a connected route on its VLAN 20 SVI and forwards the packet to PC2. The trace shows one hop, and no router was involved."
 },
 {
  "path": [
   "PC3",
   "ASW1",
   "DSW1"
  ],
  "cls": "req",
  "at": "DSW1",
  "label": "VIA TRUNK",
  "t": "A host on the access switch",
  "x": "PC3 is on ASW1, but its gateway is the same SVI. The frame crosses the trunk tagged VLAN 10 and reaches 192.168.10.1 on DSW1."
 },
 {
  "path": [
   "DSW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "DEFAULT ROUTE",
  "good": 1,
  "t": "Out to the internet",
  "x": "203.0.113.1 is not a local network, so the default route sends it out the routed port Gi0/2 to R1, at 10.0.0.2."
 }
]
```
