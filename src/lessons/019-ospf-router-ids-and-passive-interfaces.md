---
title: OSPF router IDs and passive interfaces
name: How OSPF routers name themselves and pick peers
mins: 9
---

## The problem
<p><b>OSPF</b> lets routers share routes automatically. Here R1 and R2 run it, but two things were left to chance. The routers chose their own identities, and every interface sends <b>hellos</b>, the messages OSPF uses to find neighbors. A rogue router on R1's user LAN heard those hellos, became a neighbor, and is now injecting a route that R2 believes.</p>

## The router ID
<p>Every OSPF router has a <b>router ID</b>: a 32-bit number written like an IPv4 address. Other routers use it to name this router in their neighbor tables and in the link-state database. When the process starts, IOS chooses it in this order:</p><ol><li>The <code>router-id</code> command, if configured.</li><li>Otherwise, the highest IP address on an up loopback interface.</li><li>Otherwise, the highest IP address on an up physical interface.</li></ol><p>With no loopbacks, R1 would pick 192.168.1.1 over 10.0.12.1, which says little about which router it is. Two routers with the <b>same</b> router ID will not form an adjacency. Setting 1.1.1.1 and 2.2.2.2 makes the IDs fixed and readable.</p>

## Why a restart is needed
<p>The router ID is chosen once, when the process starts. Typing <code>router-id</code> on a running router only prints a message telling you to reload or use <code>clear ip ospf process</code>. Clearing the process restarts OSPF: every adjacency drops and forms again, now with the new ID. On a live network that is a short outage, so it is done in a maintenance window.</p>

## Hellos and neighbors
<p>OSPF sends hellos out of every interface it runs on, every 10 seconds on Ethernet by default. A dead interval of 40 seconds without hellos means the neighbor is gone. Two routers become neighbors only if key settings in the hellos match, including area, subnet, hello and dead timers, and they have different router IDs.</p><p>Any interface that sends hellos will accept a neighbor. On R1's G0/0 that means anything plugged into the user LAN, which is how ROGUE got in.</p>

## Passive interfaces
<p>A <b>passive interface</b> does not send hellos and does not form neighbors, but OSPF still <b>advertises its network</b>. That is exactly what a user LAN needs: R2 must still learn 192.168.1.0/24, but nobody on that LAN should be a neighbor.</p><p><code>passive-interface default</code> makes every interface passive. <code>no passive-interface g0/1</code> then reopens only the link between the routers. Starting from passive is safer, because a new interface added later is passive until you decide otherwise.</p>

## Check it worked
<p><code>show ip protocols</code> shows the router ID and the passive interfaces. <code>show ip ospf neighbor</code> on R1 should list only 2.2.2.2. On R2, <code>show ip route ospf</code> should still have 192.168.1.0/24, marked O, but no rogue route. Finally PC1 pings PC2.</p>

## @terms
- Router ID :: A 32-bit identifier, written like an IPv4 address, that names an OSPF router.
- Hello :: The OSPF message that discovers neighbors and keeps adjacencies alive. Every 10 seconds on Ethernet by default.
- Dead interval :: How long without a hello before a neighbor is declared down. 40 seconds by default on Ethernet.
- Adjacency :: A full OSPF neighbor relationship over which routing information is exchanged.
- Passive interface :: An interface whose network is advertised but which sends no hellos and forms no neighbors.
- Loopback interface :: A virtual interface that is always up. A common source for the router ID.
- Link-state database :: Each router's copy of the network map built from the information its neighbors share.

## @exam
- 3.4: configure and verify single-area OSPFv2: neighbor adjacencies, point-to-point, broadcast (DR/BDR selection), router ID.
- Router ID order: manual router-id, highest up loopback, highest up physical interface.
- A new router ID takes effect only after <code>clear ip ospf process</code> or a reload.
- Passive interfaces still advertise their networks; they only stop hellos.
- Duplicate router IDs prevent adjacency. OSPF's administrative distance is 110.

## @mistakes
- Setting <code>router-id</code> and not clearing the process: <code>show ip protocols</code> still shows the old ID.
- Making the router-to-router link passive as well: the adjacency drops and remote routes disappear.
- Thinking passive removes the network from OSPF: the LAN is still advertised, which is the point.
- Copying a config between routers including the same router-id: the two routers never become neighbors.

## @quiz

### A router has no router-id command, a loopback at 10.255.255.1, and physical interfaces at 192.168.1.1 and 172.16.0.1. Which router ID does OSPF choose?
- 192.168.1.1
- 172.16.0.1
- [x] 10.255.255.1
- 0.0.0.0
> A loopback beats any physical interface, even one with a higher address. Physical interfaces are used only when no loopback is up.

### You type <code>router-id 1.1.1.1</code> on a router already running OSPF. What happens?
- The ID changes immediately
- [x] Nothing until the OSPF process is restarted or the router reloads
- OSPF shuts down
- The command is rejected
> The router ID is chosen when the process starts. IOS tells you to use <code>clear ip ospf process</code>.

### What does a passive interface still do in OSPF?
- Send hellos every 10 seconds
- Form adjacencies with routers on its LAN
- [x] Have its network advertised to other routers
- Nothing at all; it is removed from OSPF
> Passive stops hellos and neighbors, but the network is still advertised. That is why R2 keeps its route to R1's user LAN.

### After <code>passive-interface default</code> on R1 and R2, the routers lose their adjacency. What was missed?
- clear ip ospf process
- [x] no passive-interface g0/1
- router-id
- network 10.0.12.0 0.0.0.3 area 0
> Default-passive also silences the link between the routers. That link needs hellos turned back on.

### Two routers on a shared link are both configured with router ID 1.1.1.1. What is the result?
- They form an adjacency normally
- The one with the higher interface IP wins
- OSPF picks a new ID automatically
- [x] They do not form an adjacency
> A duplicate router ID stops the adjacency, and IOS logs the duplicate. OSPF never renames a router by itself; you fix it by setting a unique router-id.

## @story
```json
[
 {
  "path": [
   "ROGUE",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "HELLO",
  "bad": 1,
  "t": "A rogue neighbor",
  "x": "ROGUE sends OSPF hellos on the user LAN. R1 G0/0 is not passive, so it accepts ROGUE as a neighbor."
 },
 {
  "path": [
   "R1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "ROGUE ROUTE",
  "bad": 1,
  "t": "The bad route spreads",
  "x": "R1 shares ROGUE's route with R2, as OSPF shares everything in the area. R2 installs it and will send traffic towards a device nobody approved."
 },
 {
  "path": [
   "R1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "RID 1.1.1.1",
  "t": "Fixed router IDs",
  "x": "After router-id and clear ip ospf process, R1 restarts as 1.1.1.1 and R2 as 2.2.2.2. The adjacency forms again under the new names."
 },
 {
  "path": [
   "ROGUE",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "IGNORED",
  "good": 1,
  "t": "Passive on the user LAN",
  "x": "G0/0 is now passive. R1 sends no hellos there and forms no neighbor, so ROGUE's hellos get nowhere and its route ages out."
 },
 {
  "path": [
   "R2",
   "R1"
  ],
  "cls": "rep",
  "at": "R1",
  "label": "HELLO G0/1",
  "good": 1,
  "t": "The real link still talks",
  "x": "no passive-interface g0/1 keeps hellos on the link between the routers, so R1 and R2 stay neighbors."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1",
   "R2",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "PING OK",
  "good": 1,
  "t": "Routes still flow",
  "x": "R1 still advertises 192.168.1.0/24 from its passive LAN. R2 has the route, so PC1 reaches PC2."
 }
]
```
