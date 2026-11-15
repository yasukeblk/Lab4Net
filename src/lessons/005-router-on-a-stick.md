---
title: Router-on-a-stick
name: How a router joins VLANs over one link
mins: 8
---

## The problem
<p>Each VLAN is its own broadcast domain and its own subnet. Hosts in different VLANs cannot reach each other without a <b>Layer 3</b> device, one that routes between subnets. The simple answer is one router port per VLAN, but routers have few ports and networks have many VLANs.</p><p><b>Router-on-a-stick</b> uses one router port and one cable to the switch, configured as an 802.1Q trunk, so every VLAN arrives on the same link with its tag.</p>

## Subinterfaces
<p>A <b>subinterface</b> is a logical interface carved out of a physical one, written with a dot: G0/0.10 and G0/0.20. Each acts like a separate router port.</p><ul><li><code>encapsulation dot1q 10</code> ties G0/0.10 to frames tagged VLAN 10. The number after the dot is only a label; matching it to the VLAN is a convention that keeps things readable.</li><li>Then <code>ip address 192.168.10.1 255.255.255.0</code>. IOS refuses an address until the encapsulation is set.</li><li>The physical G0/0 gets no address but needs <code>no shutdown</code>. If the parent is down, every subinterface is down.</li></ul>

## Each subinterface is a gateway
<p>G0/0.10 (192.168.10.1) is the default gateway for VLAN 10, and G0/0.20 (192.168.20.1) for VLAN 20. As soon as both are up, R1 has two <b>connected routes</b>, marked C in the routing table, plus a local /32 route (L) for each of its own addresses. Connected routes are all it needs: both subnets are directly attached.</p><p>On the switch side, SW1 G0/1 must be a trunk, or the tagged frames have nowhere to go.</p>

## The journey of one packet
<ol><li>PC1 (192.168.10.10) pings PC2 (192.168.20.10). The destination is outside its subnet, so PC1 sends the frame to its gateway, 192.168.10.1.</li><li>SW1 receives it on a VLAN 10 access port and sends it up the trunk tagged 10.</li><li>R1 accepts it on G0/0.10, looks up 192.168.20.10, and finds it connected on G0/0.20.</li><li>R1 sends the packet back down the same cable, tagged 20.</li><li>SW1 removes the tag and delivers it to PC2. The reply does the same in reverse.</li></ol><p>Every inter-VLAN packet crosses the link twice, so the single link is shared and is a single point of failure. Larger networks route on a Layer 3 switch using SVIs instead.</p>

## The native VLAN on a router
<p>Untagged frames on a trunk belong to the native VLAN. If the router needs an address in the native VLAN, its subinterface uses <code>encapsulation dot1q 1 native</code> (with the native VLAN number), so the router sends and accepts that VLAN untagged, matching the switch.</p>

## Check it worked
<p><code>show ip route</code> on R1 should show C routes for 192.168.10.0/24 via G0/0.10 and 192.168.20.0/24 via G0/0.20. <code>show ip interface brief</code> lists the subinterfaces as up up. On SW1, <code>show interfaces trunk</code> confirms G0/1 is trunking. Then ping PC2 from PC1.</p>

## @terms
- Inter-VLAN routing :: Routing packets between hosts in different VLANs and subnets.
- Router-on-a-stick :: Inter-VLAN routing with one router port, trunked, using one subinterface per VLAN.
- Subinterface :: A logical interface on a physical port, such as G0/0.10, with its own address and VLAN.
- encapsulation dot1q :: The subinterface command that ties it to one 802.1Q VLAN tag.
- Connected route :: A route the router creates itself for a subnet on one of its up interfaces, marked C.
- Default gateway :: The router address a host sends to when the destination is outside its own subnet.

## @exam
- 2.1: configure and verify VLANs, including InterVLAN connectivity. 2.2: trunk ports, 802.1Q and native VLAN.
- The router side has subinterfaces with <code>encapsulation dot1q</code>; the switch side is a trunk.
- The subinterface number does not have to equal the VLAN; the encapsulation line decides.
- <code>encapsulation dot1q N native</code> sends that VLAN untagged on the router.
- Each subinterface address is the default gateway for its VLAN and produces a connected route.

## @mistakes
- Switch port to the router left as an access port: only one VLAN arrives, untagged, and none of the tagged subinterfaces receive anything.
- Wrong VLAN in <code>encapsulation dot1q</code>: that VLAN's hosts cannot reach their gateway even though the address looks right.
- Physical interface left shut down: every subinterface shows down.
- PCs with the wrong default gateway: same-VLAN pings work, cross-VLAN pings fail.

## @quiz

### On G0/0.10 you type <code>ip address 192.168.10.1 255.255.255.0</code> and IOS rejects it. What is missing?
- no shutdown on G0/0.10
- An address on G0/0
- A trunk on SW1
- [x] encapsulation dot1q 10
> A subinterface must be tied to a VLAN with encapsulation dot1q before IOS accepts an address on it.

### What decides which VLAN subinterface G0/0.10 handles?
- The number after the dot
- [x] The encapsulation dot1q command
- The IP address
- The switch access port
> The number after the dot is only a name. The encapsulation line is what ties it to a tag; matching the two is just good practice.

### What should PC1 use as its default gateway in this lab?
- [x] 192.168.10.1
- 192.168.20.1
- The IP of SW1
- None, because it is on the same switch as PC2
> PC1 is in VLAN 10, so its gateway is the VLAN 10 subinterface address. Being on the same switch does not matter: PC2 is in a different subnet.

### How must SW1 G0/1, the port facing R1, be configured?
- Access port in VLAN 10
- Access port in VLAN 1
- [x] Trunk
- Routed port
> The link must carry both VLANs with their tags, so it must be a trunk.

### G0/0.10 and G0/0.20 are configured, but G0/0 is still shut down. What state are the subinterfaces in?
- Up, because they have addresses
- [x] Down, because the parent interface is down
- Up for VLAN 10 only
- Up, but with no routes
> Subinterfaces follow their physical interface. A shut parent takes them all down.

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
  "label": "TO GATEWAY",
  "t": "Off-subnet, so to the gateway",
  "x": "PC1 sees that 192.168.20.10 is outside 192.168.10.0/24, so it addresses the frame to its gateway, 192.168.10.1. It enters SW1 untagged on a VLAN 10 port."
 },
 {
  "path": [
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "TAG 10",
  "t": "Up the trunk",
  "x": "SW1 sends the frame up the trunk with an 802.1Q tag of 10. R1 hands it to G0/0.10, the subinterface with encapsulation dot1q 10."
 },
 {
  "path": [
   "R1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "ROUTED, TAG 20",
  "t": "Routed and sent back down",
  "x": "R1 finds 192.168.20.0/24 connected on G0/0.20. It sends the packet back down the same cable, now tagged 20."
 },
 {
  "path": [
   "SW1",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "DELIVERED",
  "good": 1,
  "t": "Delivered in VLAN 20",
  "x": "SW1 reads tag 20, removes it, and sends the frame out to PC2 in VLAN 20."
 },
 {
  "path": [
   "PC2",
   "SW1",
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "REPLY",
  "good": 1,
  "t": "The reply",
  "x": "PC2 replies to its own gateway, 192.168.20.1. The packet goes up tagged 20 and comes back down tagged 10. The ping has crossed VLANs."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "PARENT DOWN",
  "bad": 1,
  "t": "If G0/0 is shut down",
  "x": "Subinterfaces depend on the physical port. With G0/0 still shut down, both gateways are down and nothing crosses between VLANs."
 }
]
```
