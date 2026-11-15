---
title: DHCP snooping
name: How a switch stops fake DHCP servers
mins: 8
---

## The problem: anyone can answer
<p>DHCP is first come, first served. A client broadcasts a Discover and takes the first Offer it gets. It has no way to tell a real server from a fake one.</p><p>In this lab, ROGUE, a laptop on Fa0/5, runs its own DHCP server. It is on the same switch as the clients, so it answers before R1. It names itself as the default gateway, so the clients send all their traffic to it. That is either a man-in-the-middle attack or, at best, an outage. A rogue server is not always malicious: a home router plugged in by a user does the same damage.</p>

## Trusted and untrusted ports
<p><b>DHCP snooping</b> makes the switch inspect DHCP messages in the VLANs you choose. Each port is <b>trusted</b> or <b>untrusted</b>, and every port is untrusted by default.</p><ul><li>Client messages (Discover, Request) are allowed in on any port.</li><li>Server messages (Offer, Acknowledge) are allowed in only on <b>trusted</b> ports. If one arrives on an untrusted port, it is dropped.</li></ul><p>So you trust only the ports that lead toward the real server: here SW1 Gi0/1, the uplink to R1. ROGUE's offers are dropped at Fa0/5 and never reach a client.</p>

## The binding table
<p>As leases are handed out, the switch records each one in the <b>DHCP snooping binding table</b>: MAC address, IP address, lease time, VLAN and port. Snooping itself only needs it to check later messages, such as a release, against the right port. Other features use it too: Dynamic ARP Inspection checks ARP against it.</p><p>Hosts with fixed addresses never appear in it, because they never ask for a lease. That is fine for snooping, but it matters as soon as a feature such as DAI relies on the table.</p>

## The option 82 surprise
<p>When snooping is on, a Cisco switch adds <b>option 82</b> to client requests by default. Option 82 records which switch and port the request came from. But SW1 is not a relay, so the request carries option 82 while its relay address field (<i>giaddr</i>) is still 0.0.0.0. A Cisco IOS DHCP server treats that combination as suspicious and drops it, so R1 stays silent.</p><p>In this lab the fix is <code>no ip dhcp snooping information option</code> on SW1. Telling R1 to trust option 82 would also work.</p>

## How it is set up and checked
<p>Turn it on globally with <code>ip dhcp snooping</code>, then for VLAN 10 with <code>ip dhcp snooping vlan 10</code>. Both are needed. Then <code>ip dhcp snooping trust</code> on Gi0/1. <code>show ip dhcp snooping</code> shows the VLANs, the trusted ports and the option 82 setting. <code>show ip dhcp snooping binding</code> should list PC1 and PC2 with their port. User ports can also be given <code>ip dhcp snooping limit rate</code>, to stop one host flooding the server with requests.</p>

## @terms
- DHCP snooping :: A switch feature that filters DHCP messages so only trusted ports can carry server replies.
- Trusted port :: A port allowed to deliver DHCP server messages. Usually the uplink toward the real server.
- Untrusted port :: A port where server messages are dropped. Every port is untrusted by default.
- Rogue DHCP server :: An unauthorised device handing out addresses, often naming itself as the gateway.
- Binding table :: The switch's list of leases: MAC, IP, lease, VLAN and port.
- Option 82 :: DHCP relay agent information: which switch and port a request came from.

## @exam
- 5.7: configure and verify Layer 2 security features: DHCP snooping, dynamic ARP inspection, and port security.
- Server messages (Offer, Ack) are dropped on untrusted ports. Client messages are allowed.
- All ports are untrusted by default. Trust the uplinks toward the server.
- Snooping must be enabled globally and per VLAN.
- The binding table feeds Dynamic ARP Inspection.

## @mistakes
- Enabling snooping without trusting the uplink: every legitimate offer is dropped and nobody gets an address.
- Enabling it globally but not for the VLAN: nothing is inspected, and the rogue still wins.
- Option 82 left on with a Cisco router as the server: requests reach R1 but it never answers.
- Trusting user ports "to be safe": a trusted port lets a rogue server through.

## @quiz

### With DHCP snooping on, which message is dropped when it arrives on an untrusted port?
- Discover
- Request
- [x] Offer
- Release from the same host
> Offers and Acks are server messages and only pass trusted ports. Discover and Request come from clients and are allowed.

### Snooping is on and Gi0/1 is trusted, but R1 never answers. What fits best?
- [x] Option 82 is being inserted and the Cisco server drops the request
- The rogue is still winning
- The client ports must be trusted
- The binding table is full
> The switch adds option 82 with no relay address, and an IOS DHCP server drops that by default. Turning the option off on the switch fixes it.

### Which port on SW1 should be trusted?
- Fa0/5, so you can monitor the rogue
- Every port
- Fa0/1 and Fa0/2, where the clients are
- [x] Gi0/1, toward R1
> Trust only the path toward the legitimate server. Trusting client ports would let any server on them through.

### What does the snooping binding table record?
- Only the rogue servers seen
- [x] MAC, IP, VLAN, lease and port for each lease
- Every ARP reply
- The DHCP pools on R1
> Each lease that passes is recorded with its port. Dynamic ARP Inspection uses this table next.

## @story
```json
[
 {
  "path": [
   "PC1",
   "SW1",
   "ROGUE"
  ],
  "cls": "req",
  "at": "ROGUE",
  "label": "DISCOVER",
  "t": "PC1 asks for an address",
  "x": "PC1 broadcasts a Discover. SW1 floods it out every port in VLAN 10, so it reaches both R1 and ROGUE."
 },
 {
  "path": [
   "ROGUE",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "FAKE GATEWAY",
  "bad": 1,
  "t": "Before snooping",
  "x": "ROGUE answers first and names itself, 192.168.10.250, as the gateway. PC1 accepts it and cannot reach 203.0.113.10."
 },
 {
  "path": [
   "ROGUE",
   "SW1"
  ],
  "cls": "rep",
  "at": "SW1",
  "label": "DROPPED",
  "good": 1,
  "t": "Snooping on, Fa0/5 untrusted",
  "x": "Now the rogue's Offer arrives on an untrusted port. Server messages are not allowed there, so SW1 drops it."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "OPTION 82",
  "bad": 1,
  "t": "The real server stays silent",
  "x": "SW1 adds option 82 with no relay address to PC1's request. R1 treats that as inconsistent and drops it."
 },
 {
  "path": [
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "OFFER VIA GI0/1",
  "good": 1,
  "t": "Option 82 off: R1 answers",
  "x": "With the option turned off, R1 answers. Its Offer enters SW1 on trusted Gi0/1, so it is allowed through to PC1."
 },
 {
  "path": [
   "R1",
   "SW1"
  ],
  "cls": "rep",
  "at": "SW1",
  "label": "BINDING SAVED",
  "good": 1,
  "t": "The lease is recorded",
  "x": "When R1's Ack passes, SW1 records PC1's MAC, IP, VLAN 10 and port Fa0/1 in its binding table."
 }
]
```
