---
title: Small office build
name: How a small office reaches the internet
mins: 10
---

## The goal
<p>A branch office needs three things from its router, R1: to <b>route</b> traffic out to the internet, to <b>hand out addresses</b> to the PCs, and to let the whole office share the <b>single public address</b>, 203.0.113.2, that the ISP assigned. This lab builds all three on one router, the usual design for a small office.</p>

## Step 1: addresses and a default route
<p>Router interfaces start shut down with no address. G0/0 gets 192.168.1.1/24 and becomes the PCs' gateway. G0/1 gets 203.0.113.2/30 on the link to the ISP.</p><p>The office has only one way out, so it does not need a route to every network on the internet. One <b>default route</b>, <code>ip route 0.0.0.0 0.0.0.0 203.0.113.1</code>, matches any destination with no better route. A static route has administrative distance 1, and <code>show ip route</code> lists it as the <i>gateway of last resort</i>. R1 can now ping the web server, because its own pings come from 203.0.113.2, an address the ISP can reply to.</p>

## Step 2: DHCP for the PCs
<p>R1 also acts as the DHCP server. The excluded range 192.168.1.1 to .20 is kept for the router, switch and anything set by hand. Pool <code>OFFICE</code> leases the rest of 192.168.1.0/24 with gateway 192.168.1.1 and DNS 198.51.100.53. After <code>ipconfig /renew</code>, the PCs have working settings, starting at 192.168.1.21.</p>

## Why the PCs still cannot reach the web
<p>192.168.1.0/24 is a <b>private</b> range (RFC 1918, along with 10.0.0.0/8 and 172.16.0.0/12). Private addresses are reused in millions of networks, so internet routers do not route them. PC1's ping can reach the web server, but the reply is addressed to 192.168.1.21, and the ISP has no route back. The traffic dies on the return trip.</p>

## Step 3: PAT, one address for everyone
<p><b>NAT</b> (Network Address Translation) rewrites the source address as packets leave. <b>PAT</b> (port address translation, also called NAT overload) lets many inside hosts share one public address by also tracking the source port of each session.</p><ol><li>ACL 1 permits 192.168.1.0/24. Here it is not a filter: it only <b>selects</b> which sources get translated.</li><li><code>ip nat inside</code> on G0/0 and <code>ip nat outside</code> on G0/1 tell R1 which side is which.</li><li><code>ip nat inside source list 1 interface g0/1 overload</code> translates matched sources to G0/1's address, with <code>overload</code> turning on PAT.</li></ol><p>When a reply comes back to 203.0.113.2, R1 looks up the port in its translation table and sends it to the right PC.</p>

## Check it worked
<p><code>show ip dhcp binding</code> lists the PCs' leases. <code>show ip nat translations</code> shows each session: the <b>inside local</b> address (the PC's private address) and the <b>inside global</b> address (203.0.113.2), with port numbers keeping them apart. PC1's <code>telnet 198.51.100.10 80</code> tests a web connection on TCP 80, and PC2's ping tests ICMP.</p>

## @terms
- Default route :: 0.0.0.0/0: the route used when nothing more specific matches. Also called the gateway of last resort.
- Private address :: An address from 10.0.0.0/8, 172.16.0.0/12 or 192.168.0.0/16, not routed on the internet.
- NAT :: Network Address Translation: rewriting addresses as packets cross a router.
- PAT (NAT overload) :: NAT that maps many inside hosts to one address, using port numbers to keep sessions apart.
- Inside local :: The private address of an inside host, as seen inside.
- Inside global :: The public address that represents an inside host on the outside.
- DHCP pool :: The server's settings for one subnet: the network to lease from and options such as gateway and DNS.

## @exam
- 3.3: configure and verify IPv4 static routing, including the default route. 4.1: configure and verify inside source NAT using static and pools. 4.6: configure and verify DHCP client and relay.
- A default route is <code>ip route 0.0.0.0 0.0.0.0 next-hop</code>; static routes have administrative distance 1.
- Know the NAT terms: inside local, inside global, outside local, outside global.
- PAT uses the <code>overload</code> keyword. Without it, one public address serves only one inside host at a time.
- The ACL in a NAT rule selects traffic to translate; it does not filter.

## @mistakes
- Swapping <code>ip nat inside</code> and <code>outside</code>: nothing is translated and the PCs still cannot reach the internet.
- ACL that does not match the LAN, for example a wrong wildcard mask: those hosts are not translated.
- Forgetting <code>overload</code>: the first PC works and the second does not.
- Leaving interfaces shut down, or no default route: the router itself cannot reach the internet, so nothing behind it can either.

## @quiz

### PC1 has a DHCP lease and a gateway, but cannot reach 198.51.100.10 before NAT is set up. Why?
- The default route is missing
- [x] The reply is addressed to a private address the ISP does not route
- DNS is not configured
- The PC has no default gateway
> R1 can already reach the server, so routing outbound works. The return traffic to 192.168.1.x has no path back.

### What does <code>overload</code> add to the NAT rule?
- [x] It lets many inside hosts share one public address using port numbers
- It translates both source and destination
- It allows more than one ACL
- It speeds up translation
> Overload turns on PAT. Each session gets its own port on the shared address, so replies can be matched to the right host.

### In <code>show ip nat translations</code>, what is 192.168.1.21?
- Inside global
- Outside local
- [x] Inside local
- Outside global
> Inside local is the inside host's own private address. Its public stand-in, 203.0.113.2, is the inside global.

### What is the role of ACL 1 in <code>ip nat inside source list 1 interface g0/1 overload</code>?
- It blocks traffic from outside
- [x] It selects which source addresses are translated
- It filters DHCP requests
- It permits replies to return
> In a NAT rule the ACL only identifies which traffic to translate. Traffic it does not permit is simply not translated.

### Which command creates R1's default route to the ISP?
- ip default-gateway 203.0.113.1
- ip route 0.0.0.0 255.255.255.255 203.0.113.1
- [x] ip route 0.0.0.0 0.0.0.0 203.0.113.1
- ip route 203.0.113.1 0.0.0.0 0.0.0.0
> A default route is network 0.0.0.0 with mask 0.0.0.0, matching everything. ip default-gateway is for hosts and non-routing switches.

## @story
```json
[
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "DISCOVER",
  "t": "PC1 asks for an address",
  "x": "PC1 broadcasts a DHCP Discover. R1 picks pool OFFICE, skips the excluded .1 to .20, and leases 192.168.1.21 with gateway 192.168.1.1 and DNS 198.51.100.53."
 },
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
  "label": "SRC 192.168.1.21",
  "t": "Out without translation",
  "x": "PC1 pings the web server. R1 follows its default route to the ISP, and the request arrives, still carrying PC1's private source address."
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
  "x": "The reply is addressed to 192.168.1.21. That is a private address the ISP does not route, so the reply is dropped."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "PAT TO .2",
  "t": "R1 translates",
  "x": "With NAT configured, the source 192.168.1.21 matches ACL 1. R1 rewrites it to 203.0.113.2 and records the port in its translation table."
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
  "t": "A public source",
  "x": "The web server sees the request coming from 203.0.113.2, R1's public address, which the ISP knows how to reach."
 },
 {
  "path": [
   "WEB",
   "ISP",
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "REPLY",
  "good": 1,
  "t": "Translated back",
  "x": "The reply comes back to 203.0.113.2. R1 finds the session in its table, rewrites the destination to 192.168.1.21 and sends it to PC1."
 }
]
```
