---
title: NAT overload (PAT)
name: How many hosts share one public address
mins: 9
---

## The problem: private addresses do not route
<p>The LAN uses 192.168.1.0/24. Addresses in 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 are <b>private</b> (RFC 1918): anyone may use them inside, and internet routers do not route them. The ISP has no route back to 192.168.1.0/24.</p><p>So when PC1 pings the web server, the request can get there, but the reply is addressed to 192.168.1.10 and dies at the ISP. <b>NAT</b> (Network Address Translation) fixes this by replacing the private source address with a public one that the ISP can route back to.</p>

## Four names for addresses
<p>NAT has its own vocabulary. From R1's point of view:</p><ul><li><b>Inside local</b>: the real address of an inside host, 192.168.1.10 for PC1.</li><li><b>Inside global</b>: the address that host appears as to the outside, here 203.0.113.2 (R1 G0/1).</li><li><b>Outside global</b>: the real address of the outside host, 198.51.100.10 for WEB.</li><li><b>Outside local</b>: that outside host as seen from inside. Without outside NAT it equals the outside global.</li></ul><p>Local means seen from the inside. Global means seen from the outside.</p>

## Overload: sharing by port number
<p>R1 has one public address and two PCs, and a real office has hundreds. <b>PAT</b> (Port Address Translation), configured with the keyword <code>overload</code>, lets them all share it. R1 rewrites the source address and, if needed, the source port too. It keeps the original port when it is free and picks another when it is already in use.</p><p>Each translation is written to the <b>NAT table</b>. When a reply comes back to 203.0.113.2, R1 reads the destination port, finds the matching line and knows whether it belongs to PC1 or PC2. For a ping, which has no ports, the ICMP query ID plays the same role.</p>

## Inside, outside, and which hosts
<p>NAT only acts on traffic that crosses from an interface marked <code>ip nat inside</code> to one marked <code>ip nat outside</code>, and on the replies coming back. Here G0/0 faces the LAN and G0/1 faces the ISP.</p><p>Standard ACL 1 (<code>permit 192.168.1.0 0.0.0.255</code>) says which source addresses may be translated. In this role the ACL filters nothing. A host it does not match is simply forwarded untranslated.</p>

## How it is configured here
<p>R1 first needs <code>ip route 0.0.0.0 0.0.0.0 203.0.113.1</code>, because translation does not create routes. Then the inside and outside labels, ACL 1, and one line ties them together: <code>ip nat inside source list 1 interface g0/1 overload</code>. Using <code>interface g0/1</code> means "translate to whatever address G0/1 has", which also suits a link where the ISP hands out the address.</p>

## Check it worked
<p>Ping 198.51.100.10 from both PCs, then try <code>telnet 198.51.100.10 80</code>. <code>show ip nat translations</code> lists protocol, inside global, inside local, outside local and outside global, each with a port. Both PCs share 203.0.113.2 with different ports. <code>show ip nat statistics</code> shows hit counts and which interfaces are inside and outside. <code>clear ip nat translation *</code> empties the dynamic entries.</p>

## @terms
- NAT :: Network Address Translation: rewriting addresses in packets as they pass through a router.
- PAT (overload) :: NAT where many inside hosts share one public address, told apart by port numbers.
- Inside local :: The real, usually private, address of an inside host.
- Inside global :: The public address that represents an inside host to the outside.
- Outside global :: The real address of a host on the outside network.
- NAT table :: The router's list of current translations, used to send replies to the right inside host.
- RFC 1918 :: The standard that reserves 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 for private use.

## @exam
- 4.1: configure and verify inside source NAT using static and pools.
- Know the four address terms. Inside local is the private address; inside global is the translated public one.
- <code>overload</code> is the keyword that turns dynamic NAT into PAT. It can be used with an interface or with a pool.
- The ACL in a NAT rule selects traffic; it does not block anything.
- <code>show ip nat translations</code> and <code>show ip nat statistics</code> are the verification commands.

## @mistakes
- Inside and outside swapped on G0/0 and G0/1: nothing is translated, and the table stays empty.
- ACL 1 matching the wrong network or wildcard: the PCs are forwarded untranslated and replies die at the ISP.
- Forgetting <code>overload</code> with <code>interface g0/1</code>: only one inside host can be translated at a time.
- No default route: R1 drops the traffic before translation matters, and the table stays empty.

## @quiz

### In this lab, what is PC1's inside global address?
- 192.168.1.10
- 198.51.100.10
- [x] 203.0.113.2
- 203.0.113.1
> Inside global is how an inside host appears to the outside: R1's G0/1 address. 192.168.1.10 is the inside local address, and 198.51.100.10 is outside global.

### Which keyword lets many inside hosts share one public address?
- [x] overload
- static
- pool
- extendable
> overload turns on PAT, which tells hosts apart by port. static makes one fixed one-to-one mapping, and a pool without overload gives each host its own address.

### What is ACL 1 doing in <code>ip nat inside source list 1 interface g0/1 overload</code>?
- Blocking traffic from the outside
- [x] Choosing which source addresses are translated
- Filtering which ports may be used
- Permitting replies back in
> In a NAT rule the ACL only selects traffic for translation. Hosts it does not match are forwarded untranslated, not dropped.

### Before NAT is added, PC1 cannot ping WEB even with a default route. Why?
- R1 drops packets with private source addresses
- WEB blocks private sources
- [x] The ISP has no route back to 192.168.1.0/24, so replies are dropped
- The default route points the wrong way
> The request gets through, because routers forward by destination. The reply is addressed to a private network the ISP cannot route.

### When two PCs share 203.0.113.2, how does R1 know which one a reply belongs to?
- It asks both PCs
- [x] It reads the destination port or ICMP ID and looks it up in the NAT table
- It sends the reply to whichever PC spoke last
- It uses the reply's TTL
> Every translation is recorded with its port (or ICMP ID). The returning packet's destination port picks the right line in the table.

## @story
```json
[
 {
  "path": [
   "PC1",
   "SW1",
   "R1",
   "ISP",
   "WEB"
  ],
  "cls": "req",
  "at": "WEB",
  "label": "SRC 192.168.1.10",
  "t": "Without NAT, the request arrives",
  "x": "PC1 pings 198.51.100.10. R1 and the ISP forward it by destination, so the echo request reaches WEB still carrying the private source address."
 },
 {
  "path": [
   "WEB",
   "ISP"
  ],
  "cls": "rep",
  "at": "ISP",
  "label": "NO ROUTE BACK",
  "bad": 1,
  "t": "The reply is lost",
  "x": "WEB replies to 192.168.1.10. The ISP has no route to a private network, so it drops the reply. The ping fails even though R1 has a default route."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "TRANSLATE",
  "t": "R1 translates PC1",
  "x": "With NAT configured, the packet enters G0/0 (inside), matches ACL 1 and leaves G0/1 (outside). R1 rewrites the source to 203.0.113.2 and records the mapping in its NAT table."
 },
 {
  "path": [
   "PC2",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "SAME IP, NEW ID",
  "t": "PC2 shares the address",
  "x": "PC2 (192.168.1.11) pings at the same time. R1 gives it the same 203.0.113.2. If PC2's port or ICMP ID is already taken by PC1, R1 picks another, so the two stay distinct."
 },
 {
  "path": [
   "R1",
   "ISP",
   "WEB"
  ],
  "cls": "req",
  "at": "WEB",
  "label": "SRC 203.0.113.2",
  "t": "Out to the server",
  "x": "WEB sees both requests coming from 203.0.113.2. It never learns the private addresses."
 },
 {
  "path": [
   "WEB",
   "ISP",
   "R1"
  ],
  "cls": "rep",
  "at": "R1",
  "label": "LOOK UP TABLE",
  "t": "The reply returns to R1",
  "x": "The ISP routes 203.0.113.2 to R1. R1 finds the line in its NAT table that matches the destination port or ID and rewrites the destination back to 192.168.1.10."
 },
 {
  "path": [
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "REPLY",
  "good": 1,
  "t": "PC1 gets its answer",
  "x": "The reply reaches PC1 with its own address restored. PC2's reply is matched to PC2 the same way."
 }
]
```
