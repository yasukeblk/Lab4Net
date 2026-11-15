---
title: Floating static route
name: How a backup route waits for a failure
mins: 8
---

## The problem: one path, no plan B
<p>HQ (R1, PC1) and the branch (R2, PC2) are joined by two links. G0/1 is the fast primary link (10.0.12.0/30). G0/2 is a slower backup link (10.0.21.0/30). Today each router has a <b>static route</b>, a route typed by hand, to the other LAN through the primary link only.</p><p>A static route does not look for alternatives. If the primary link fails, the route disappears and the branch is cut off, even though a working cable sits right next to it. You want a second route that is ready, but only used when the first one is gone.</p>

## Administrative distance decides between sources
<p>A router can learn a route to the same network from several places: a connected interface, a static route, OSPF and so on. <b>Administrative distance</b> (AD) is a number that says how much to trust each source. Lower wins. The defaults to know:</p><ul><li>Connected 0, static 1</li><li>eBGP 20, EIGRP 90, OSPF 110, RIP 120</li><li>iBGP 200; 255 means never use</li></ul><p>Only the best route for each network goes into the routing table. The others are not mixed in or shared; they simply wait.</p>

## A floating route is a static route with a worse AD
<p>A <b>floating static route</b> is a static route given a higher AD than the route it backs up. The number goes at the end of the command: <code>ip route 192.168.2.0 255.255.255.0 10.0.21.2 5</code> on R1.</p><p>The primary static route has AD 1, so it wins. The floating route with AD 5 stays in the running configuration but does not appear in <code>show ip route</code>. It "floats" above the table, ready to drop in. To back up an OSPF route the floating AD must be higher than 110, or it would replace OSPF instead of backing it up.</p>

## How failover happens
<ol><li>R1 G0/1 goes down. Its connected subnet 10.0.12.0/30 leaves the routing table.</li><li>The primary route points to next hop 10.0.12.2. R1 can no longer reach that next hop, so it removes the route.</li><li>The floating route is now the best route left to 192.168.2.0/24, so R1 installs it.</li><li>When G0/1 comes back, the AD 1 route returns and pushes the floating route out again. Nobody has to touch anything.</li></ol><p>Routing works in both directions, so R2 needs its own floating route to 192.168.1.0/24 via 10.0.21.1. Without it, PC1's packets reach PC2 but the replies still head for the dead link.</p>

## Check it worked
<p><code>show ip route</code> shows the primary as <code>S 192.168.2.0/24 [1/0] via 10.0.12.2</code>. The first number in the brackets is the AD, the second the metric. <code>show ip route 192.168.2.10</code> shows exactly which entry that address uses. After shutting G0/1, the same command shows <code>[5/0] via 10.0.21.2</code>, and <code>tracert</code> from PC1 shows the hop through the backup link. <code>show running-config | include ip route</code> lists both routes, including the one that is hidden from the table.</p>

## @terms
- Static route :: A route typed in by hand. It does not change unless the router loses the way to its next hop.
- Administrative distance :: How trusted a route source is, from 0 to 255. Lower wins when two sources offer the same prefix.
- Floating static route :: A static route with a higher administrative distance than the main route, used only when the main route is gone.
- Next hop :: The address of the neighbouring router a packet is handed to.
- Metric :: The cost of a route within one source. Static routes have metric 0.
- Failover :: Traffic moving to a backup path automatically when the main path fails.

## @exam
- 3.3: configure and verify IPv4 and IPv6 static routing, including floating static. 3.2: how a router decides, using administrative distance.
- Default AD values: connected 0, static 1, eBGP 20, EIGRP 90, OSPF 110, RIP 120, iBGP 200.
- A floating static route is not shown in <code>show ip route</code> until the main route is removed.
- In <code>[1/0]</code> the first number is AD, the second the metric.
- IPv6 works the same way: <code>ipv6 route ::/0 2001:db8::2 5</code> floats with AD 5.

## @mistakes
- Floating route on one router only: traffic fails over one way and replies are lost.
- AD lower than or equal to the primary: the "backup" replaces or shares with the primary instead of waiting.
- Backing up OSPF with AD 5: the static route beats OSPF (110) and becomes the main path.
- Primary link fails somewhere beyond the interface (for example behind a switch) while the interface stays up: the router still thinks the next hop is reachable and never fails over.

## @quiz

### R1 has <code>ip route 192.168.2.0 255.255.255.0 10.0.12.2</code> and <code>ip route 192.168.2.0 255.255.255.0 10.0.21.2 5</code>. What does <code>show ip route</code> show for 192.168.2.0/24?
- [x] Only the route via 10.0.12.2
- Both routes, sharing the traffic
- Only the route via 10.0.21.2
- Neither, because the routes conflict
> Only the best route per prefix is installed. AD 1 beats AD 5, so the second route waits outside the table. Equal-cost sharing needs equal AD and metric.

### A company wants a static route to back up an OSPF-learned route. Which AD should the static route use?
- 1
- 90
- [x] 120
- 100
> To wait behind OSPF the static route needs an AD higher than 110, so 120 works. Any of the others is lower than 110 and would replace the OSPF route.

### Failover worked on R1, but pings from PC1 to PC2 still fail while the primary is down. What is the most likely cause?
- R1 needs a lower AD on its floating route
- [x] R2 has no floating route back to 192.168.1.0/24
- PC2 has the wrong subnet mask
- The backup link needs OSPF
> Routing is needed both ways. The request reaches PC2, but R2 still tries to send the reply through the dead primary link.

### In <code>S 192.168.2.0/24 [5/0] via 10.0.21.2</code>, what does the 5 mean?
- The metric
- The hop count
- The number of failovers
- [x] The administrative distance
> The first number in the brackets is the administrative distance, the second is the metric. Static routes always have metric 0.

## @story
```json
[
 {
  "path": [
   "PC1",
   "R1",
   "R2",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "PRIMARY G0/1",
  "t": "Normal path",
  "x": "PC1 pings PC2. R1 looks up 192.168.2.0/24 and finds the static route [1/0] via 10.0.12.2, so the packet crosses the fast primary link."
 },
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "AD 1 BEATS 5",
  "t": "The backup waits",
  "x": "R1 now also has a route via 10.0.21.2 with AD 5. Only the best route per network enters the table, so AD 1 wins and the backup stays in the config."
 },
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "G0/1 DOWN",
  "bad": 1,
  "t": "The primary link fails",
  "x": "G0/1 shuts down. Subnet 10.0.12.0/30 disappears, the next hop 10.0.12.2 becomes unreachable, and R1 removes the primary route."
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
  "label": "FLOAT AD 5",
  "good": 1,
  "t": "The floating route drops in",
  "x": "The AD 5 route is now the best one left, so R1 installs it. The packet crosses the backup link G0/2 to R2 and on to PC2."
 },
 {
  "path": [
   "PC2",
   "R2",
   "R1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "REPLY VIA G0/2",
  "good": 1,
  "t": "The reply needs R2's backup too",
  "x": "R2 lost its primary route as well and has installed its own floating route via 10.0.21.1. Without it the reply would be lost."
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
  "label": "BACK TO G0/1",
  "t": "The primary returns",
  "x": "G0/1 comes back up. The AD 1 route returns and pushes the floating route back out, so traffic moves back to the fast link on its own."
 }
]
```
