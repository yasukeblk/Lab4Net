---
title: How a router chooses a route
name: How a router picks one route out of many
mins: 9
---

## Three questions, always in the same order
<p>R1 can reach the server LAN 10.10.5.0/24 through R2 or through R3. When it has several routes that could carry a packet, it settles the choice with three rules, always in this order:</p><ol><li><b>Longest prefix match</b>: the most specific route that contains the destination wins.</li><li><b>Administrative distance</b> (AD): for routes to the exact same prefix and length, the more trusted source wins.</li><li><b>Metric</b>: for routes from the same source to the same prefix, the lowest cost wins.</li></ol><p>Most wrong exam answers come from applying these in the wrong order.</p>

## Reading the routing table
<p>Each line of <code>show ip route</code> has a code for the source (<code>C</code> connected, <code>L</code> local, <code>S</code> static, <code>O</code> OSPF), the prefix, the brackets <code>[AD/metric]</code>, and the next hop. <code>O 10.10.5.0/24 [110/2] via 10.0.13.2</code> means: learned by OSPF (AD 110), total cost 2, send it to R3. <code>show ip route 10.10.5.20</code> asks the router which single entry it would use for that address.</p>

## Metric: choosing within OSPF
<p>OSPF adds up the <b>cost</b> of every outgoing interface on the way. At the start someone has set R1 G0/1 to cost 10, so the path through R2 costs 10 + 1 = 11 while the path through R3 costs 1 + 1 = 2. OSPF uses R3.</p><p>Setting <code>ip ospf cost 50</code> on G0/2 makes the R3 path 51. Now R2 wins at 11, and OSPF moves the traffic without a single static route. Metric only compares routes from the same protocol; an OSPF cost means nothing to EIGRP or to a static route.</p>

## Longest prefix: the most specific route wins
<p>A <b>host route</b> is a /32: it matches one address only. Security wants SRV1 (10.10.5.10) reached through R3, so R1 gets <code>ip route 10.10.5.10 255.255.255.255 10.0.13.2</code>.</p><p>Now 10.10.5.10 matches two routes: the static /32 and the OSPF /24. The router does not compare their AD, because they are different prefixes. The longer prefix, /32, wins. SRV2 (10.10.5.20) does not match the /32, so it keeps following OSPF through R2.</p>

## AD: only for the same prefix
<p>The last change adds <code>ip route 10.10.5.0 255.255.255.0 10.0.13.2 130</code>. This /24 is the same prefix as the OSPF route, so now AD decides: OSPF 110 beats static 130. The static route is not installed; it waits as a floating backup and would only appear if OSPF lost the route.</p><p>Remember the defaults: connected 0, static 1, EIGRP 90, OSPF 110, RIP 120.</p>

## Check it worked
<p>Use <code>show ip route 10.10.5.10</code> and <code>show ip route 10.10.5.20</code>: each names the entry it matches. Trace from PC1 to both servers and you will see different second hops, 10.0.13.2 for SRV1 and 10.0.12.2 for SRV2. <code>show ip route ospf</code> shows the metric change from [110/2] to [110/11].</p>

## @terms
- Longest prefix match :: The rule that the route with the most network bits matching the destination is used first.
- Host route :: A /32 route that matches exactly one IPv4 address.
- Administrative distance :: A trust rating for a route source. Lower wins, but only between routes to the same prefix and length.
- Metric :: The cost of a route inside one routing protocol. OSPF uses cost, added up along the path.
- OSPF cost :: A per-interface value. By default reference bandwidth (100 Mbps) divided by interface bandwidth, minimum 1.
- Prefix length :: The number of network bits in a route, the /24 or /32.

## @exam
- 3.1: interpret the routing table (protocol code, prefix, network mask, next hop, AD, metric, gateway of last resort). 3.2: longest prefix match, administrative distance, routing protocol metric.
- Order of decision: longest prefix first, then AD, then metric.
- A default route 0.0.0.0/0 is the shortest prefix of all, so it is used only when nothing more specific matches.
- <code>[110/11]</code> is AD 110 and metric 11.
- Exam questions often list several routes and ask which is used for one address: find every route that contains it, then take the longest.

## @mistakes
- Choosing a route by its lower AD when the other route has a longer prefix: the /32 static would win even if it had AD 200.
- Comparing an OSPF cost with an EIGRP metric: metrics only compare within one protocol.
- Setting <code>ip ospf cost</code> on the far router and expecting R1 to change: OSPF uses the cost of the outgoing interface on each router along the path.
- Expecting a backup static /24 with AD 130 to appear in the table while OSPF still has the /24.

## @quiz

### R1 has <code>S 10.10.5.10/32 [1/0]</code> and <code>O 10.10.5.0/24 [110/11]</code>. Which is used for 10.10.5.10?
- The OSPF /24, because it is a dynamic route
- [x] The static /32, because it has the longer prefix
- The static /32, because AD 1 is lower than 110
- Both, shared equally
> Longest prefix is checked before AD. The /32 would win even with a higher AD. The AD answer gets the right route for the wrong reason.

### R1 has an OSPF route to 10.10.5.0/24 and a static route to 10.10.5.0/24 with AD 130. Which is installed?
- The static route, because static routes always win
- Both, as equal-cost paths
- Neither, until one is removed
- [x] The OSPF route, because 110 is lower than 130
> Same prefix and length, so AD decides and 110 wins. The static route waits as a floating backup.

### Two OSPF routes reach the same /24, one with cost 11 and one with cost 51. What does OSPF install?
- [x] The cost 11 route
- The cost 51 route
- Both, load-balanced
- The route learned first
> Within one protocol the lowest metric wins. Both routes would be installed only if their costs were equal.

### A packet is for 10.10.5.20. The table has 0.0.0.0/0, 10.10.0.0/16 and 10.10.5.0/24. Which route is used?
- 0.0.0.0/0
- 10.10.0.0/16
- [x] 10.10.5.0/24
- The one with the lowest AD
> All three contain the address. The /24 has the most matching bits, so it wins. The default route is only a last resort.

## @story
```json
[
 {
  "path": [
   "PC1",
   "R1",
   "R3",
   "SW1",
   "SRV2"
  ],
  "cls": "req",
  "at": "SRV2",
  "label": "COST 2 VIA R3",
  "t": "OSPF picks the cheaper path",
  "x": "G0/1 has cost 10, so the R2 path costs 11 and the R3 path costs 2. R1 sends traffic for 10.10.5.20 through R3."
 },
 {
  "path": [
   "PC1",
   "R1",
   "R2",
   "SW1",
   "SRV2"
  ],
  "cls": "req",
  "at": "SRV2",
  "label": "COST 11 VIA R2",
  "good": 1,
  "t": "The metric changes the path",
  "x": "With <code>ip ospf cost 50</code> on G0/2 the R3 path costs 51. Both are OSPF routes, so the lower metric wins and traffic moves to R2."
 },
 {
  "path": [
   "PC1",
   "R1",
   "R3",
   "SW1",
   "SRV1"
  ],
  "cls": "req",
  "at": "SRV1",
  "label": "/32 WINS",
  "good": 1,
  "t": "A host route is more specific",
  "x": "10.10.5.10 matches the static /32 and the OSPF /24. Longest prefix is checked first, so the /32 via R3 wins without AD ever being compared."
 },
 {
  "path": [
   "PC1",
   "R1",
   "R2",
   "SW1",
   "SRV2"
  ],
  "cls": "req",
  "at": "SRV2",
  "label": "ONLY /24 FITS",
  "t": "Other servers are unaffected",
  "x": "10.10.5.20 does not match the /32, so the only route that contains it is the OSPF /24, through R2."
 },
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "AD 130 WAITS",
  "t": "Same prefix, so AD decides",
  "x": "The backup static /24 has AD 130. OSPF's /24 has AD 110 and wins, so the static route stays out of the table until OSPF loses the route."
 }
]
```
