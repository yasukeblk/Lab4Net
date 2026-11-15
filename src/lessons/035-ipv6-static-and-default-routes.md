---
title: IPv6 static and default routes
name: How static routes work in IPv6
mins: 8
---

## The problem: routers only know their own links
<p>A router knows its <b>connected</b> networks without being told. To reach anything else it needs a route. Here HQ knows the HQ LAN and the link to BR; BR knows the branch LAN and the same link. Neither knows the other's LAN, so PC2 cannot reach PC1.</p><p>IPv6 static routes work just as IPv4 ones do. The command is <code>ipv6 route</code>, and the router must have <code>ipv6 unicast-routing</code> on.</p>

## Four kinds of static route
<ul><li><b>Network route</b>: one remote prefix. HQ uses 2001:DB8:ACAD:20::/64 via 2001:DB8:ACAD:12::2.</li><li><b>Default route</b>: ::/0, matching everything, like 0.0.0.0/0. BR has one way out, so one default via 2001:DB8:ACAD:12::1 covers HQ and the internet.</li><li><b>Host route</b>: a /128, exactly one address, like a /32 in IPv4. HQ uses one for BR's management loopback, 2001:DB8:ACAD:99::1.</li><li><b>Floating route</b>: a backup with a higher administrative distance, used only when the main route is gone.</li></ul>

## Choosing the next hop
<p>A route can name a next-hop address, an exit interface, or both. A global next hop such as 2001:DB8:ACAD:12::2 is fine on its own: HQ finds it in a connected prefix and knows which interface to use.</p><p>The backup link has only link-local addresses, FE80::1 and FE80::2. A link-local address is unique only on its own link, and FE80::2 could exist on any of HQ's links. So IOS refuses a link-local next hop unless you also name the exit interface: <code>ipv6 route ::/0 g0/2 fe80::1 10</code>.</p>

## Which route wins
<p>When more than one route matches a destination, the router picks the <b>longest prefix match</b>: the route with the most bits in common. On HQ, a packet for 2001:DB8:ACAD:99::1 matches the /128 host route and nothing else. On BR, a packet for PC1 matches only ::/0, the shortest possible prefix, so the default is a last resort.</p><p>Administrative distance only decides between routes to the <b>same</b> prefix with the same length. That is the case for the two default routes on BR, which is where floating routes come in.</p>

## Floating routes and administrative distance
<p><b>Administrative distance</b> (AD) is how much a router trusts a source of routes: lower wins. Connected is 0 and static is 1. The backup routes are given AD 10.</p><p>While the primary route exists, its AD of 1 beats 10, so the backup stays out of the routing table. It is "floating" in the background. When G0/1 goes down, its connected prefix disappears, the primary route's next hop can no longer be reached, and the floating route is installed.</p>

## Check it worked
<p><code>show ipv6 route</code> marks static routes with S, and shows [1/0] for AD 1, metric 0. With G0/1 up you should see the primary routes only. Shut HQ G0/1 and look again: the routes via G0/2 appear with [10/0]. Pings from PC2 to PC1 should still work. Bring G0/1 back up and the primary routes return without any change to the configuration.</p>

## @terms
- Static route :: A route typed in by hand with ipv6 route or ip route.
- Default route (::/0) :: The IPv6 route that matches every destination, used when nothing more specific does.
- Host route :: A /128 route that matches exactly one IPv6 address.
- Floating static route :: A backup static route with a higher administrative distance than the main route.
- Administrative distance :: How trusted a route source is. Lower wins. Connected 0, static 1.
- Next hop :: The address of the next router on the path.
- Fully specified route :: A static route that names both the exit interface and the next-hop address.

## @exam
- 3.3: configure and verify IPv4 and IPv6 static routing: default route, network route, host route, floating static.
- The default IPv6 route is ::/0 and a host route is /128.
- A link-local next hop must be paired with an exit interface.
- Floating routes need an AD higher than the route they back up. Static is 1 by default.
- Read <code>[AD/metric]</code> in the routing table output.

## @mistakes
- A link-local next hop without an interface: IOS rejects the command.
- A floating route with the same AD as the primary: the router uses both, or the wrong one, and the backup is no longer a backup.
- Routing in one direction only: the ping leaves but the reply has no route back.
- Forgetting <code>ipv6 unicast-routing</code>: the routes are in the table but nothing is forwarded.

## @quiz

### Which command adds an IPv6 default route on BR via the backup link's link-local address?
- ipv6 route ::/0 fe80::1
- ipv6 route ::/128 g0/2 fe80::1
- ipv6 route 0::0 fe80::1 g0/2
- [x] ipv6 route ::/0 g0/2 fe80::1
> The default route is ::/0, and a link-local next hop needs the exit interface named before it. Without the interface IOS refuses the command.

### A floating static route is configured with AD 10. When does it appear in the routing table?
- [x] Only when the route with the lower AD is gone
- Always, alongside the primary route
- Only after a reload
- When the primary route has a higher metric
> Lower AD wins. While the primary static route (AD 1) exists, the AD 10 route is held back.

### What does a /128 IPv6 route match?
- Every address
- One subnet of 64 addresses
- [x] Exactly one address
- All link-local addresses
> A /128 uses all 128 bits, so only one address matches. It is the IPv6 equivalent of a /32 host route.

### What is the default administrative distance of a static route?
- 0
- [x] 1
- 10
- 110
> Connected routes are 0 and static routes are 1. 110 is OSPF. The 10 in this lab is a value chosen for the floating routes.

## @story
```json
[
 {
  "path": [
   "PC2",
   "BR"
  ],
  "cls": "req",
  "at": "BR",
  "label": "NO ROUTE",
  "bad": 1,
  "t": "No routes yet",
  "x": "PC2 pings PC1. BR only knows its connected prefixes, so it has no route to 2001:DB8:ACAD:10::/64 and drops the packet."
 },
 {
  "path": [
   "PC2",
   "BR",
   "HQ",
   "PC1"
  ],
  "cls": "req",
  "at": "PC1",
  "label": "VIA ::/0",
  "t": "The default route",
  "x": "With ::/0 via 2001:DB8:ACAD:12::1, BR sends the packet to HQ on G0/1. HQ's LAN is connected, so it delivers to PC1."
 },
 {
  "path": [
   "PC1",
   "HQ",
   "BR",
   "PC2"
  ],
  "cls": "rep",
  "at": "PC2",
  "label": "VIA 20::/64",
  "good": 1,
  "t": "The reply needs a route too",
  "x": "HQ's network route sends the reply to BR at 2001:DB8:ACAD:12::2. Both directions now work."
 },
 {
  "path": [
   "HQ",
   "BR"
  ],
  "cls": "req",
  "at": "BR",
  "label": "/128 HOST ROUTE",
  "good": 1,
  "t": "Reaching the loopback",
  "x": "HQ pings 2001:DB8:ACAD:99::1. The /128 route matches that one address and sends it to BR."
 },
 {
  "path": [
   "PC2",
   "BR",
   "HQ",
   "PC1"
  ],
  "cls": "req",
  "at": "PC1",
  "label": "FLOATING AD 10",
  "good": 1,
  "t": "The primary link fails",
  "x": "With HQ G0/1 shut, the primary routes go. The floating routes via G0/2 and FE80::1 and FE80::2 take over, and the ping still gets through."
 }
]
```
