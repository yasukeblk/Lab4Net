---
title: IPv6 addressing
name: How IPv6 addresses are built
mins: 10
---

## What an IPv6 address looks like
<p>An IPv6 address is 128 bits, written as eight groups of four hex digits separated by colons. Two rules shorten it:</p><ol><li>Leading zeros in a group can be dropped: 0DB8 becomes DB8.</li><li>One run of all-zero groups can become <b>::</b>, once per address.</li></ol><p>So 2001:0DB8:ACAD:0001:0000:0000:0000:0001 is written 2001:DB8:ACAD:1::1. On a LAN the first 64 bits are the <b>prefix</b> (the network) and the last 64 are the <b>interface ID</b> (the host).</p>

## The address types you need
<ul><li><b>Global unicast</b> (2000::/3): routable everywhere, like a public IPv4 address. 2001:DB8::/32 is reserved for examples like this lab.</li><li><b>Link-local</b> (FE80::/10): valid only on one link and never routed. Every IPv6 interface has one.</li><li><b>Unique local</b> (FC00::/7): private addresses, like 10.0.0.0/8.</li><li><b>Multicast</b> (FF00::/8): one to many. IPv6 has no broadcast at all.</li><li><b>Loopback</b> ::1, and <b>unspecified</b> :: for "no address yet".</li></ul>

## R1's addresses
<p>IPv6 routing is off on a Cisco router until <code>ipv6 unicast-routing</code>. Without it R1 will not forward IPv6 or send router advertisements.</p><p>On G0/0, R1 gets 2001:DB8:ACAD:1::1/64 typed in full. On G0/1, <code>eui-64</code> gives only the prefix and lets R1 build the interface ID itself. Both interfaces also get the link-local address FE80::1. That is allowed, because link-local addresses only need to be unique on their own link, and it makes the gateway easy to type.</p>

## EUI-64: an interface ID from a MAC
<p>A MAC address is 48 bits; an interface ID is 64. EUI-64 fills the gap:</p><ol><li>Split the MAC in half: 00E0.B0 | 63.3710.</li><li>Insert FFFE in the middle: 00E0:B0FF:FE63:3710.</li><li>Flip the seventh bit of the first byte: 00 becomes 02.</li></ol><p>The result is 02E0:B0FF:FE63:3710. <code>show ipv6 interface</code> marks such an address with [EUI]. Because the MAC is on R1 G0/1, you only find out its global address after configuring it, which is why the lab asks you to look it up.</p>

## SLAAC: hosts configure themselves
<p>With <b>SLAAC</b> (stateless address autoconfiguration), a host needs no DHCP server. It sends a <b>Router Solicitation</b> to FF02::2, all routers. R1 answers with a <b>Router Advertisement</b> carrying the /64 prefix. The host adds its own interface ID (EUI-64 in this lab) and uses R1's link-local address, FE80::1, as its default gateway. R1 also sends advertisements on its own every few minutes.</p><p>Before using a new address, the host checks nobody else has it, with <b>duplicate address detection</b>. Router Solicitation, Router Advertisement and the neighbor messages that replace ARP are all <b>ICMPv6</b> messages, together called Neighbor Discovery Protocol (NDP). Many real Windows hosts use a random interface ID instead of EUI-64, for privacy; the prefix still comes from the advertisement.</p>

## Multicast groups and checking
<p>Every IPv6 interface joins FF02::1 (all nodes); a router also joins FF02::2 (all routers). Each unicast address adds a <b>solicited-node</b> group, FF02::1:FF plus the last 24 bits of the address. Neighbor Discovery uses it to find a MAC address, the job ARP does in IPv4. Check with <code>show ipv6 interface brief</code>, then <code>show ipv6 interface g0/1</code> for the [EUI] address and the groups joined.</p>

## @terms
- Global unicast address :: A routable IPv6 address from 2000::/3.
- Link-local address :: An FE80::/10 address valid only on one link. Used as next hop and gateway.
- Prefix :: The network part of an IPv6 address, written with a length such as /64.
- Interface ID :: The host part of an IPv6 address, normally the last 64 bits.
- EUI-64 :: A way to build a 64-bit interface ID from a 48-bit MAC by inserting FFFE and flipping the seventh bit.
- SLAAC :: Stateless address autoconfiguration. A host builds its own address from a router advertisement.
- Solicited-node multicast :: FF02::1:FF plus the last 24 bits of an address. Used by Neighbor Discovery instead of ARP broadcasts.

## @exam
- 1.8: configure and verify IPv6 addressing and prefix. 1.9: describe IPv6 address types: unicast (global, unique local, link local), anycast, multicast, modified EUI-64.
- Abbreviate and expand addresses: drop leading zeros, and use :: only once.
- Know the prefixes: 2000::/3, FE80::/10, FC00::/7, FF00::/8.
- Work EUI-64 by hand, including flipping the seventh bit.
- IPv6 has no broadcast. RS goes to FF02::2, and unsolicited RAs go to FF02::1.

## @mistakes
- Using :: twice in one address: it becomes impossible to tell how many zeros each one stands for.
- Forgetting <code>ipv6 unicast-routing</code>: interfaces have addresses, but hosts get no router advertisements and nothing is forwarded.
- Forgetting to flip the seventh bit when working out an EUI-64 address.
- Expecting a link-local address to be reachable from another subnet: it never leaves its link.

## @quiz

### Which is a valid shortened form of 2001:0DB8:0000:0000:0001:0000:0000:0010?
- 2001:DB8::1::10
- [x] 2001:DB8::1:0:0:10
- 2001:DB8:0:0:1::1
- 2001:DB8::1:0:0:1
> :: can appear only once, so one zero run is collapsed and the other kept as 0:0. Leading zeros can drop, but trailing ones cannot: 0010 is 10, not 1.

### What is the EUI-64 interface ID for MAC 00E0.B063.3710?
- 00E0:B0FF:FE63:3710
- 02E0:B063:FFFE:3710
- 00E0:B0FE:FF63:3710
- [x] 02E0:B0FF:FE63:3710
> Split the MAC, insert FFFE, then flip the seventh bit: 00 becomes 02.

### Which address range is link-local?
- [x] FE80::/10
- FC00::/7
- FF00::/8
- 2000::/3
> FE80::/10 is link-local. FC00::/7 is unique local, FF00::/8 multicast and 2000::/3 global unicast.

### PC1 used SLAAC. Where did its default gateway come from?
- A DHCPv6 server
- [x] The Router Advertisement, which gives R1's link-local address
- Its own EUI-64 calculation
- A broadcast from R1
> The RA's source is R1's link-local address, and the host uses it as its gateway. IPv6 has no broadcast.

### Why can R1 use FE80::1 on both G0/0 and G0/1?
- [x] Link-local addresses only need to be unique on their own link
- Because it uses EUI-64
- IOS ignores duplicates on routers
- FE80::1 is a multicast address
> A link-local address is never routed, so the same one can appear on every link of the router.

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
  "label": "RS FF02::2",
  "t": "PC1 asks for a router",
  "x": "PC1 has only its own link-local address. It sends a Router Solicitation to FF02::2, the all-routers group."
 },
 {
  "path": [
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "RA 1::/64",
  "t": "R1 advertises the prefix",
  "x": "R1 replies with a Router Advertisement: the prefix is 2001:DB8:ACAD:1::/64 and the gateway is FE80::1."
 },
 {
  "path": [
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "SLAAC DONE",
  "good": 1,
  "t": "PC1 builds its address",
  "x": "PC1 adds an EUI-64 interface ID from MAC 00E0.B063.3710, giving 2001:DB8:ACAD:1:2E0:B0FF:FE63:3710. No DHCP server was needed."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "ECHO",
  "t": "PC1 pings the server",
  "x": "PC1 sends to 2001:DB8:ACAD:2::10 through its gateway. R1 has both prefixes as connected routes and forwards the packet onto LAN 2."
 },
 {
  "path": [
   "PC2",
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "ECHO REPLY",
  "good": 1,
  "t": "The reply comes back",
  "x": "PC2 has a fixed address and FE80::1 as its gateway, so its reply goes to R1 and back to PC1."
 }
]
```
