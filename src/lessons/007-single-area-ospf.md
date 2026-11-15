---
title: Single-area OSPF
name: How OSPF routers share a map of the network
mins: 10
---

## Why a routing protocol
<p>The triangle in this lab has three LANs and three links between routers. Static routes would mean six or more routes per router, typed by hand, and none of them would react if a link failed. A <b>routing protocol</b> lets routers tell each other about networks and adapt when something changes. <b>OSPF</b> (Open Shortest Path First) is the one the CCNA covers in depth.</p>

## How link state works
<p>OSPF is a <b>link-state</b> protocol. Each router describes its own links (its networks and their costs) in messages called <b>LSAs</b> (link-state advertisements) and floods them to every router in the area. Every router stores them in its <b>LSDB</b> (link-state database), so all routers in the area hold the same map.</p><p>Each router then runs the <b>SPF</b> (shortest path first) algorithm on that map, with itself at the centre, and puts the best route to each network in its routing table. In a single-area design everything is in <b>area 0</b>, the backbone area.</p>

## Neighbours and hellos
<p>Routers find each other with <b>Hello</b> packets, sent to the multicast address 224.0.0.5 every 10 seconds on Ethernet. If no hello is heard for the <b>dead interval</b> (40 seconds), the neighbour is declared down.</p><p>Two routers become neighbours only if they agree on the area, the subnet and mask of the link, the hello and dead timers, and authentication, and their router IDs must be different. They then exchange databases and reach the <b>FULL</b> state. On Ethernet links a <b>DR</b> and <b>BDR</b> (designated and backup designated router) are elected, which is why neighbours show as FULL/DR or FULL/BDR.</p>

## Router ID
<p>The <b>router ID</b> is a 32-bit name written like an IP address. It is chosen in this order: the <code>router-id</code> command; otherwise the highest loopback address; otherwise the highest address on an up interface. Setting it by hand (1.1.1.1, 2.2.2.2, 3.3.3.3 here) keeps it stable and readable. Changing it on a running process only takes effect after <code>clear ip ospf process</code> or a reload.</p>

## The network command and passive interfaces
<p><code>network 10.0.12.0 0.0.0.3 area 0</code> does not advertise a network directly. It says: any interface whose address falls in this range runs OSPF in area 0, and its subnet is advertised. The second value is a <b>wildcard mask</b>, the inverse of the subnet mask: 255.255.255.252 becomes 0.0.0.3, and 255.255.255.0 becomes 0.0.0.255.</p><p>Each LAN interface G0/0 is made <code>passive-interface</code>. Its subnet is still advertised, but no hellos are sent there, because no OSPF router could ever answer from a LAN of PCs.</p>

## Cost and the chosen path
<p>OSPF picks the path with the lowest total <b>cost</b>. An interface cost is the reference bandwidth (100 Mbps by default) divided by the interface bandwidth, never less than 1, so FastEthernet and GigabitEthernet both cost 1 unless you raise the reference with <code>auto-cost reference-bandwidth</code>. A route cost adds up the outgoing interfaces along the way.</p><p>From R1, 192.168.2.0/24 costs 2 through R2 and 3 through R3, so R1 uses R2. If the R1-R2 link fails, SPF runs again and the route moves to R3. OSPF routes appear as O with administrative distance 110.</p>

## Check it worked
<p><code>show ip ospf neighbor</code> should list two neighbours on each router, both FULL. <code>show ip route</code> should show O routes to the two remote LANs and the link that is not connected. <code>show ip protocols</code> shows the router ID, networks and passive interfaces.</p>

## @terms
- Link-state protocol :: A routing protocol where every router builds the same map of the area and computes its own best paths.
- LSA :: Link-state advertisement: a router's description of its links, flooded to the area.
- LSDB :: Link-state database: the collected LSAs, identical on every router in the area.
- Router ID :: A 32-bit OSPF name for a router, written like an IPv4 address.
- Hello packet :: The message OSPF routers send to find and keep neighbours, every 10 seconds on Ethernet.
- Wildcard mask :: The inverse of a subnet mask, used by the network command to match interfaces.
- Passive interface :: An interface whose subnet is advertised but which sends no hellos.
- Cost :: The OSPF metric: reference bandwidth divided by interface bandwidth, added up along a path.

## @exam
- 3.4: configure and verify single-area OSPFv2: neighbour adjacencies, point-to-point, broadcast (DR/BDR selection), router ID. 3.1 and 3.2: interpret the routing table and how the best path is chosen.
- OSPF AD is 110. Hello 10 seconds and dead 40 seconds on Ethernet; hellos go to 224.0.0.5.
- Router ID order: router-id command, highest loopback, highest active interface address.
- The process ID is local and does not have to match between routers; the area does.
- Default reference bandwidth is 100 Mbps, so every link of 100 Mbps or faster costs 1.

## @mistakes
- Wrong wildcard mask, such as 0.0.0.255 typed as 255.255.255.0: the network command matches the wrong interfaces or none.
- Area mismatch on a link: no adjacency, and <code>show ip ospf neighbor</code> is empty for that link.
- Duplicate router IDs: the routers do not form a proper adjacency and the log reports the duplicate.
- Making a router-to-router link passive: no hellos, so the neighbour disappears.

## @quiz

### Which wildcard mask matches a /30 link such as 10.0.12.0/30?
- 0.0.0.255
- [x] 0.0.0.3
- 255.255.255.252
- 0.0.0.4
> The wildcard is the inverse of the mask: 255.255.255.252 inverted is 0.0.0.3. The mask itself is the tempting wrong answer.

### What is the default administrative distance of OSPF?
- [x] 110
- 90
- 120
- 1
> OSPF is 110. EIGRP is 90, RIP is 120 and static is 1.

### A router has no <code>router-id</code> command, a loopback 5.5.5.5, and interfaces 192.168.1.1 and 10.0.12.1. What is its router ID?
- 192.168.1.1
- 10.0.12.1
- 1.1.1.1
- [x] 5.5.5.5
> Without the command, the highest loopback address is used before any physical interface, even though 192.168.1.1 is numerically higher.

### What does <code>passive-interface g0/0</code> do here?
- Removes 192.168.1.0/24 from OSPF
- [x] Stops hellos on G0/0 but still advertises its subnet
- Shuts down G0/0
- Makes G0/0 the DR
> A passive interface stays in OSPF, so its network is still advertised. It just sends no hellos, so no neighbour forms there.

### R1 and R2 do not become neighbours. Which mismatch would cause that?
- Different OSPF process IDs
- Different hostnames
- [x] Different area numbers on the shared link
- Different router IDs
> The area must match on a link. Process IDs are local to each router, and router IDs must be different, not the same.

## @story
```json
[
 {
  "path": [
   "R1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "HELLO",
  "t": "Saying hello",
  "x": "R1 sends a hello out G0/1 to 224.0.0.5. It carries its router ID 1.1.1.1, area 0, and its timers."
 },
 {
  "path": [
   "R2",
   "R1"
  ],
  "cls": "rep",
  "at": "R1",
  "label": "FULL",
  "good": 1,
  "t": "Neighbours",
  "x": "R2 replies with its own hello, which lists 1.1.1.1 as seen. The parameters match, so they exchange databases and reach FULL. The same happens on the other two links."
 },
 {
  "path": [
   "R1",
   "R2",
   "R3"
  ],
  "cls": "req",
  "at": "R3",
  "label": "LSA FLOOD",
  "t": "Sharing the map",
  "x": "R1 floods an LSA describing its links, including 192.168.1.0/24. R2 passes it on, so every router ends up with the same database."
 },
 {
  "path": [
   "R1",
   "PC1"
  ],
  "cls": "req",
  "at": "PC1",
  "label": "PASSIVE",
  "t": "No hellos to the LAN",
  "x": "G0/0 is passive, so R1 sends no hellos toward PC1. The LAN is still in R1's LSA, so the other routers learn it."
 },
 {
  "path": [
   "PC1",
   "R1",
   "R2",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "COST 2",
  "good": 1,
  "t": "Shortest path",
  "x": "R1 runs SPF. 192.168.2.0/24 costs 2 through R2 and 3 through R3, so traffic to PC2 goes direct to R2."
 },
 {
  "path": [
   "PC1",
   "R1",
   "R3",
   "R2",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "REROUTED",
  "good": 1,
  "t": "When a link fails",
  "x": "If the R1-R2 link fails, R1 loses that neighbour, floods the change, and runs SPF again. The route to 192.168.2.0/24 now goes through R3 at cost 3, with no one typing a command."
 }
]
```
