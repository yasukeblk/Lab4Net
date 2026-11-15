---
title: Static routing
name: How to tell a router about distant networks
mins: 8
---

## What a router knows on its own
<p>A router builds its <b>routing table</b> from the networks on its own interfaces. When an interface is up with an address, the router adds a <b>connected</b> route (C) for the subnet and a <b>local</b> route (L), a /32 for its own address. R1 therefore knows 192.168.1.0/24 and 10.0.12.0/30, and nothing else.</p><p>When a packet arrives for a network that matches no route, the router drops it. R1 has never heard of 192.168.3.0/24, so a ping from PC1 to PC2 dies at R1.</p>

## Static routes
<p>A <b>static route</b> is a route you type in by hand: <code>ip route 192.168.3.0 255.255.255.0 10.0.12.2</code> means "to reach 192.168.3.0/24, send to 10.0.12.2". That <b>next hop</b> must be on a network the router can already reach, which is why R1 uses R2's address on their shared link, not R3's.</p><p>Static routes appear as S in the table. Their <b>administrative distance</b> (AD), the trust ranking used when two sources offer the same network, is 1. Connected routes are 0. A route can also name an exit interface instead of a next hop, which is best kept for point-to-point links. A route with mask 255.255.255.255 points to one single address and is called a <b>host route</b>.</p>

## Routes are needed in both directions
<p>Each router decides on its own, one hop at a time. Getting the echo request to PC2 is only half the job: the reply needs a route from R3 and R2 back to 192.168.1.0/24. R2 sits in the middle, so it needs both LANs: 192.168.1.0/24 via R1 and 192.168.3.0/24 via R3. A one-way route gives a ping that silently times out.</p>

## Default routes and longest match
<p>R3 has a single way out, through R2. That makes it a <b>stub</b>, and instead of listing every remote network it gets one <b>default route</b>: <code>ip route 0.0.0.0 0.0.0.0 10.0.23.1</code>. 0.0.0.0/0 matches every destination.</p><p>When several routes match, the router uses the <b>longest prefix match</b>: the most specific route wins. A /24 beats a /0, so the default route is only used when nothing else fits. The table shows it as S* and reports a <i>gateway of last resort</i>. Administrative distance only matters when two routes have exactly the same prefix. A <b>floating static route</b> uses that: a backup route with a higher AD, which only appears if the main route disappears.</p>

## Check it worked
<p>Read each table with <code>show ip route</code> before testing: S lines for the static routes, S* for the default. Then ping PC2 from PC1. If it fails, <code>tracert</code> from PC1 lists every router that answers along the way, and the last hop that replies tells you where the path breaks.</p>

## @terms
- Routing table :: The router's list of known networks and how to reach each one.
- Connected route :: A route the router adds itself for a subnet on an up interface, marked C.
- Static route :: A route configured by hand, marked S, with administrative distance 1.
- Next hop :: The address of the neighbouring router a packet is sent to next.
- Default route :: The route 0.0.0.0/0, used when no more specific route matches.
- Administrative distance :: A trust value used to choose between routing sources for the same prefix. Lower wins.
- Longest prefix match :: The rule that the most specific matching route is used.

## @exam
- 3.3: configure and verify IPv4 and IPv6 static routing: default route, network route, host route, floating static. 3.1: interpret the routing table. 3.2: longest prefix match and administrative distance.
- AD values: connected 0, static 1, OSPF 110.
- Longest prefix match is applied first; AD only decides between equal prefixes from different sources.
- A default route is <code>ip route 0.0.0.0 0.0.0.0 next-hop</code> and shows as S* with a gateway of last resort.
- A floating static route has an AD set higher than the main route, so it is used only as a backup. A host route is a /32.

## @mistakes
- No return route: the echo reaches the far end but the reply is dropped on the way back.
- Next hop that is not directly reachable, such as R3's address on R1: the route does not work.
- Wrong mask, such as 255.255.255.0 for the /30 transit link: the route covers the wrong range.
- Testing before reading the table: check <code>show ip route</code> first, it shows a missing route at once.

## @quiz

### Which command gives R1 a working route to 192.168.3.0/24?
- ip route 192.168.3.0 255.255.255.0 10.0.23.2
- ip route 192.168.3.0 255.255.255.0 10.0.12.1
- ip route 192.168.3.0 255.255.255.252 10.0.12.2
- [x] ip route 192.168.3.0 255.255.255.0 10.0.12.2
> The next hop must be directly reachable: R2 at 10.0.12.2. 10.0.23.2 is two hops away, 10.0.12.1 is R1 itself, and /30 is the wrong mask for the LAN.

### What is the default administrative distance of a static route?
- 0
- [x] 1
- 90
- 110
> Static routes have AD 1. Connected routes are 0 and OSPF is 110.

### R2 has routes to 192.168.3.0/24 and 0.0.0.0/0. A packet arrives for 192.168.3.10. Which route is used?
- [x] 192.168.3.0/24, because it is the longest match
- 0.0.0.0/0, because it matches everything
- Whichever was configured first
- Both, sharing the load
> The most specific match wins. The default route is only used when nothing more specific matches.

### PC1 pings PC2. PC2 receives the echo but PC1 sees a timeout. What is the most likely cause?
- R1 has no route to 192.168.3.0/24
- PC2 has the wrong IP address
- [x] A router on the way back has no route to 192.168.1.0/24
- The default route is on the wrong router
> The echo arrived, so the forward path works. Something on the return path has no route back to PC1's subnet.

### What does S* in <code>show ip route</code> mean?
- A static route that is down
- A summary route
- A route learned from a neighbour
- [x] A static default route, the candidate default
> S is static and the asterisk marks the candidate default. The table also shows it as the gateway of last resort.

## @story
```json
[
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "TO GATEWAY",
  "t": "To the default gateway",
  "x": "PC1 sends a packet for 192.168.3.10. It is outside PC1's subnet, so it goes to the default gateway, R1."
 },
 {
  "path": [
   "R1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "S 192.168.3.0",
  "t": "R1 uses its static route",
  "x": "R1 has no connected route to 192.168.3.0/24, but its static route says next hop 10.0.12.2. It forwards the packet to R2."
 },
 {
  "path": [
   "R2",
   "R3"
  ],
  "cls": "req",
  "at": "R3",
  "label": "NEXT HOP R3",
  "t": "R2 uses its static route",
  "x": "R2 has its own static route to 192.168.3.0/24 via 10.0.23.2. Each router decides independently; R1's route means nothing to R2."
 },
 {
  "path": [
   "R3",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "CONNECTED",
  "good": 1,
  "t": "Delivered",
  "x": "192.168.3.0/24 is connected on R3, so R3 delivers the packet to PC2."
 },
 {
  "path": [
   "PC2",
   "R3",
   "R2"
  ],
  "cls": "rep",
  "at": "R2",
  "label": "DEFAULT ROUTE",
  "t": "The reply uses the default route",
  "x": "PC2 replies to 192.168.1.10. R3 has no route for 192.168.1.0/24, but 0.0.0.0/0 matches everything, so it sends the reply to R2."
 },
 {
  "path": [
   "R2",
   "R1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "REPLY HOME",
  "good": 1,
  "t": "Back to PC1",
  "x": "R2 uses its route to 192.168.1.0/24 via R1, and R1 delivers the reply. The ping works because there are routes both ways."
 },
 {
  "path": [
   "PC2",
   "R3",
   "R2"
  ],
  "cls": "rep",
  "at": "R2",
  "label": "NO ROUTE",
  "bad": 1,
  "t": "Without R2's return route",
  "x": "If R2 had no route to 192.168.1.0/24, it would drop the reply here. PC2 got the echo, yet PC1 sees a timeout."
 }
]
```
