---
title: Static NAT: publish a server
name: How an outside client reaches an inside server
mins: 8
---

## The problem: an inside server nobody outside can reach
<p>WEB has the private address 192.168.1.10. Internet routers do not route private addresses, so CLIENT (198.51.100.10) has no way to send anything to it.</p><p>With PAT, inside hosts can start connections out, but an outside host cannot start one in: there is no translation until an inside host creates it. A server must be reachable at any time, at an address that never changes. <b>Static NAT</b> gives it one: a permanent one-to-one mapping between the private address and a public address.</p>

## The addresses in this lab
<ul><li><b>Inside local</b> 192.168.1.10: WEB's real address.</li><li><b>Inside global</b> 203.0.113.10: the public address that represents WEB. This is what CLIENT connects to.</li><li><b>Outside global</b> 198.51.100.10: CLIENT's real address.</li></ul><p>The ISP already routes the public block that includes 203.0.113.10 to R1, so packets for the published address arrive at R1 G0/1.</p>

## How a static mapping works
<ol><li>A packet for 203.0.113.10 arrives on G0/1, marked <code>ip nat outside</code>.</li><li>R1 finds the static entry and rewrites the <b>destination</b> to 192.168.1.10, then routes it out G0/0 to WEB.</li><li>WEB replies from 192.168.1.10. As the reply crosses from inside to outside, R1 rewrites the <b>source</b> back to 203.0.113.10.</li></ol><p>CLIENT only ever sees 203.0.113.10. The mapping also works the other way: if WEB starts a connection out, it leaves as 203.0.113.10.</p>

## Static NAT compared with PAT
<p>PAT creates entries only when inside hosts send traffic, and shares one address among many hosts by port. Static NAT is one address for one host, every port, all the time. Its entry is in the NAT table as soon as you type the command, before any traffic flows. That is the main thing to notice in this lab.</p><p>NAT is not a firewall. Static NAT publishes every port of WEB, not just port 80. Limiting what outsiders may reach is a job for an ACL.</p><p>The cost is addresses. Each published server uses up one public address for itself, and public addresses are scarce and paid for. That is why offices publish only the few servers that must be reached from outside, and let every other host share an address with PAT.</p>

## How it is configured here
<p>R1 needs <code>ip route 0.0.0.0 0.0.0.0 203.0.113.1</code> so replies can reach CLIENT, because translating an address does not create a route. Then G0/0 gets <code>ip nat inside</code> and G0/1 gets <code>ip nat outside</code>. One line creates the mapping: <code>ip nat inside source static 192.168.1.10 203.0.113.10</code>, inside local first, inside global second.</p>

## Check it worked
<p>Run <code>show ip nat translations</code> before sending anything. The static entry is already there, with inside global 203.0.113.10 and inside local 192.168.1.10, and dashes for the outside columns. Then from CLIENT ping 203.0.113.10 and try <code>telnet 203.0.113.10 80</code>. Look at the table again: entries for the live connections appear next to the static one, with ports and CLIENT's address filled in.</p>

## @terms
- Static NAT :: A permanent one-to-one mapping between an inside local and an inside global address.
- Inside local :: The real private address of the inside host, here 192.168.1.10.
- Inside global :: The public address that represents the inside host, here 203.0.113.10.
- Outside global :: The real address of the outside host, here 198.51.100.10.
- Publishing a server :: Making an inside server reachable from outside at a fixed public address.
- NAT inside / outside :: Interface labels that tell the router which side of the translation each interface is on.

## @exam
- 4.1: configure and verify inside source NAT using static and pools.
- <code>ip nat inside source static</code> takes the inside local address first and the inside global second.
- A static entry shows in <code>show ip nat translations</code> before any traffic; dynamic and PAT entries only appear when traffic flows.
- Static NAT is one to one and lets outside hosts start connections in; PAT is many to one and does not.
- For traffic coming in, static NAT translates the destination; for replies going out, it translates the source.

## @mistakes
- Addresses in the wrong order in the static command: R1 maps the public address as if it were the inside host, and nothing works.
- Inside and outside labels swapped: the packet arrives but is never translated, so WEB never sees it.
- No default route on R1: CLIENT's request reaches WEB but the reply has no route back out.
- Assuming static NAT protects the server: every port on WEB is reachable from outside unless an ACL restricts it.

## @quiz

### Which command publishes WEB at 203.0.113.10?
- ip nat inside source static 203.0.113.10 192.168.1.10
- ip nat outside source static 192.168.1.10 203.0.113.10
- ip nat inside source list 1 interface g0/1 overload
- [x] ip nat inside source static 192.168.1.10 203.0.113.10
> Inside local comes first and inside global second. The overload line is PAT, which does not let outside hosts start connections to a fixed address.

### Before any traffic, what does <code>show ip nat translations</code> show in this lab?
- Nothing, because entries appear only when traffic flows
- [x] The static entry for 203.0.113.10 and 192.168.1.10
- An entry for CLIENT
- An error, because no traffic has been translated
> Static entries exist from the moment they are configured. It is PAT and dynamic NAT entries that appear only with traffic.

### When CLIENT's request crosses R1 toward WEB, which address does R1 change?
- [x] The destination, from 203.0.113.10 to 192.168.1.10
- The source, from 198.51.100.10 to 203.0.113.10
- Both source and destination
- Neither; static NAT only changes replies
> Traffic coming in is addressed to the public address, so R1 rewrites the destination. On the reply it rewrites the source back.

### Why does R1 still need a default route after the static mapping is added?
- The static mapping needs a route to be activated
- The ISP uses it to reach 203.0.113.10
- [x] Translation does not create routes, so replies to 198.51.100.10 need a path out
- It is needed for the inside label to work
> NAT changes addresses; routing still decides where packets go. Without a route to CLIENT's network, R1 cannot send the reply.

### Which statement about static NAT is true?
- It shares one public address among many hosts by port
- It only allows port 80
- It filters traffic, so an ACL is not needed
- [x] It lets outside hosts start connections to the inside host
> A permanent one-to-one mapping means outsiders can reach the server at any time. It does not filter: every port is published unless an ACL limits it.

## @story
```json
[
 {
  "path": [
   "WEB",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "STATIC ENTRY",
  "t": "The mapping exists first",
  "x": "As soon as the static command is entered, show ip nat translations lists 203.0.113.10 to 192.168.1.10. No traffic has been sent yet, unlike PAT."
 },
 {
  "path": [
   "CLIENT",
   "ISP",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "DST 203.0.113.10",
  "t": "CLIENT connects to the public address",
  "x": "CLIENT opens a connection to 203.0.113.10 port 80. The ISP routes the published block to R1, so the packet arrives on G0/1, the outside interface."
 },
 {
  "path": [
   "R1",
   "WEB"
  ],
  "cls": "req",
  "at": "WEB",
  "label": "DST 192.168.1.10",
  "t": "R1 translates the destination",
  "x": "R1 matches the static entry and rewrites the destination to 192.168.1.10, then forwards out G0/0. WEB sees a request from 198.51.100.10."
 },
 {
  "path": [
   "WEB",
   "R1"
  ],
  "cls": "rep",
  "at": "R1",
  "label": "SRC TRANSLATED",
  "t": "R1 translates the reply",
  "x": "WEB replies from 192.168.1.10. Crossing from inside to outside, R1 rewrites the source to 203.0.113.10 and uses its default route toward the ISP."
 },
 {
  "path": [
   "R1",
   "ISP",
   "CLIENT"
  ],
  "cls": "rep",
  "at": "CLIENT",
  "label": "FROM .10",
  "good": 1,
  "t": "CLIENT gets its answer",
  "x": "The reply arrives from 203.0.113.10, the address CLIENT connected to. CLIENT never learns the private address behind it."
 }
]
```
