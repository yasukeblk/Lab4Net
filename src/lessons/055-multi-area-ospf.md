---
title: Multi-area OSPF
name: Why OSPF is split into areas
mins: 9
---

## The problem: one big area
<p>OSPF works by giving every router the same map of the network and letting each one run the shortest-path calculation on it. In one area that map holds every router and every link. When a link flaps anywhere, every router gets the change, recalculates and may churn its routing table. With four routers nobody notices. With hundreds, a flapping link at a branch can keep a core router busy all day.</p><p><b>Areas</b> cut the map into pieces. A router only holds the full map of the areas it belongs to. What it knows about other areas is a list of prefixes with a cost, not the links behind them.</p>

## Area 0 and the area border routers
<p>Area 0 is the <b>backbone</b>. Every other area must attach to it, and traffic between two non-backbone areas always passes through area 0. The routers that sit in area 0 and in another area are <b>area border routers</b> (ABRs). In this lab R2 is in area 1 and area 0, R3 in area 0 and area 2, so both are ABRs. R1 and R4 are <b>internal routers</b> of area 1 and area 2.</p><p>An ABR advertises <b>summaries</b>: it tells area 1 about every prefix it can reach in area 0 and beyond, and tells area 0 about the prefixes of area 1. Routers inside area 1 never see R3, R4 or the link between them; they see 192.168.4.0/24 as a prefix that R2 can reach at a certain cost.</p>

## What the areas are, exactly
<p>An area is a property of an <b>interface</b>, not of a router. The <code>network 10.0.23.0 0.0.0.3 area 0</code> statement on R2 says: the interface whose address matches this range belongs to area 0. Two routers only become neighbours on a link if both ends put that link in the <b>same area</b>; the area ID travels in every hello. R2 and R3 must both say area 0 for the 10.0.23.0/30 link, and the backbone link is exactly what an ABR needs to earn its title.</p><p>If a change moves one end of that link into area 1, the hellos disagree, the adjacency drops, and R2 stops being an ABR. Area 1 is then an island.</p>

## Reading the routing table
<p>Routes learned inside your own area are marked <code>O</code> (intra-area). Routes an ABR summarised from another area are marked <code>O IA</code> (inter-area). On R1, everything beyond its link to R2 is O IA. On R2, 192.168.1.0/24 is O because R2 is in area 1 itself, while 192.168.4.0/24 is O IA because it comes from R3's summary. All of them keep administrative distance 110; an intra-area route always wins over an inter-area route to the same prefix, before the metric is compared.</p><p>The metric of an O IA route is the cost to reach the ABR plus the cost the ABR advertised, so the far LAN costs more from R1 than from R2 even though both are inter-area.</p>

## Building it here
<ol><li>On each router, <code>router ospf 1</code> and a <code>router-id</code> you chose (1.1.1.1 to 4.4.4.4), so the neighbour tables are readable.</li><li>Network statements with the right area on each link: R1 and the R1 to R2 link in area 1; the R2 to R3 link in area 0 on both routers; the R3 to R4 link and R4's LAN in area 2.</li><li><code>passive-interface</code> on the two LAN interfaces: they are still advertised, but no hellos go out to a segment with no routers.</li></ol>

## Check it worked
<p><code>show ip ospf</code> on R2 reports "Number of areas in this router is 2" and "It is an area border router". <code>show ip ospf neighbor</code> on R2 lists R1 and R3. <code>show ip route</code> on R1 shows the backbone links and 192.168.4.0/24 as O IA via 10.0.12.2. Then ping PC4 from PC1: the summaries have to point the right way in both directions for the reply to come back.</p>

## @terms
- Area :: A set of interfaces that share one link-state map. Routers in an area run SPF over that map only.
- Backbone area :: Area 0. Every other area must connect to it; inter-area traffic crosses it.
- Area border router (ABR) :: A router with interfaces in area 0 and at least one other area. It advertises summaries between them.
- Internal router :: A router whose interfaces are all in one area.
- Summary (inter-area) route :: A prefix and cost that an ABR advertises into an area on behalf of another area. Shown as O IA.
- Intra-area route :: A route to a prefix inside your own area, computed from the full map. Shown as O.

## @exam
- 3.4: configure and verify single area OSPFv2 (neighbor adjacencies, point-to-point, broadcast, router ID). Multi-area design and the O IA code come up in reading-the-table questions.
- Neighbours must agree on the area of the shared link, as well as hello and dead timers, subnet and authentication.
- An ABR has an interface in area 0 and one in another area. Every non-backbone area must touch area 0 (a virtual link is the exception, not on the exam).
- Route preference inside OSPF: intra-area beats inter-area beats external, before metric. All keep AD 110.
- Areas are per interface: one router can be in several areas; one interface is in exactly one.

## @mistakes
- Putting one end of a link in the wrong area: the adjacency never forms, and <code>show ip ospf neighbor</code> is empty on that interface.
- Attaching area 2 to area 1 without touching area 0: the "ABR" between them has no backbone interface, so no summaries flow and the areas cannot reach each other.
- Expecting <code>O</code> for everything: a far LAN learned through an ABR is <code>O IA</code>, and that is correct, not a fault.
- Forgetting the router ID and getting a surprise ID from an interface address that later changes.

## @quiz

### R2 has interfaces in area 1 and area 0. What is R2 called?
- An internal router
- A backbone router only
- [x] An area border router
- A designated router
> An ABR has at least one interface in area 0 and one in another area. It generates the summaries that let areas learn about each other.

### On R1 (area 1 only), how does 192.168.4.0/24 appear in show ip route?
- [x] O IA 192.168.4.0/24 [110/...]
- O 192.168.4.0/24 [110/...]
- S 192.168.4.0/24 [1/0]
- It does not appear; areas do not share routes
> A prefix from another area arrives as a summary from the ABR and is marked O IA. Intra-area (O) is only for prefixes inside the router's own area.

### R2's link to R3 is moved into area 1 while R3 keeps it in area 0. What happens?
- Nothing; the area is only cosmetic
- [x] The adjacency drops because the hello areas disagree, and R2 stops being an ABR
- R3 becomes the ABR instead
- Only the metric changes
> Both ends of a link must be in the same area. With the backbone link gone from R2, area 1 has no ABR and learns nothing beyond itself.

### Area 2 is attached only to area 1, through a router with no area 0 interface. What do routers in area 1 learn about area 2?
- Everything, as O IA routes
- Everything, as O routes
- [x] Nothing: without an area 0 interface that router is not an ABR and sends no summaries
- Only a default route
> Summaries are generated by ABRs and must cross the backbone. A non-backbone area attached to another non-backbone area is isolated (unless a virtual link is configured).

### R2 has an intra-area route and an inter-area route to the same prefix, and the inter-area one has a lower metric. Which is installed?
- The inter-area route, lower metric wins
- [x] The intra-area route; intra-area always beats inter-area
- Both, load-balanced
- Neither, OSPF reports a conflict
> OSPF prefers intra-area over inter-area over external, and only compares metrics between routes of the same kind.

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
  "label": "HELLO AREA 1",
  "t": "Neighbours inside area 1",
  "x": "R1 and R2 send hellos on the 10.0.12.0/30 link. Both say area 1, so they become neighbours and exchange the map of area 1: R1's LAN and this link."
 },
 {
  "path": [
   "R2",
   "R3"
  ],
  "cls": "req",
  "at": "R3",
  "label": "HELLO AREA 0",
  "t": "The backbone link",
  "x": "R2 and R3 both put the 10.0.23.0/30 link in area 0. R2 now has interfaces in two areas, one of them the backbone, so it is an area border router."
 },
 {
  "path": [
   "R2",
   "R3",
   "R4"
  ],
  "cls": "req",
  "at": "R4",
  "label": "SUMMARY LSA",
  "x": "R2 summarises area 1 into area 0: \"192.168.1.0/24, cost 1\". R3, the other ABR, passes the summary into area 2, adding its own cost to R2. R4 installs it as O IA.",
  "t": "Summaries cross the backbone"
 },
 {
  "path": [
   "R3",
   "R2",
   "R1"
  ],
  "cls": "rep",
  "at": "R1",
  "label": "SUMMARY BACK",
  "t": "And back the other way",
  "x": "R3 summarises area 2 into area 0 and R2 passes it into area 1. R1 never learns about R4 or the 10.0.34.0/30 link itself, only the prefix and a cost."
 },
 {
  "path": [
   "PC1",
   "R1",
   "R2",
   "R3",
   "R4",
   "PC4"
  ],
  "cls": "req",
  "at": "PC4",
  "label": "PING",
  "t": "Traffic follows the summaries",
  "x": "PC1's ping leaves area 1 at R2, crosses the backbone, and enters area 2 at R3. Each router forwards on its own routing table; none of them needs the whole map."
 },
 {
  "path": [
   "PC4",
   "R4",
   "R3",
   "R2",
   "R1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "REPLY",
  "t": "The reply needs the reverse summary",
  "x": "R4 reaches 192.168.1.0/24 through the summary R3 gave it. If area 1 were missing from area 0, the reply would be dropped at R4 with no route."
 }
]
```
