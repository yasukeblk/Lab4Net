---
title: Dynamic ARP Inspection
name: How a switch stops ARP lies
mins: 8
---

## The problem: ARP believes anyone
<p><b>ARP</b> (Address Resolution Protocol) finds the MAC address for an IPv4 address on the local subnet. A host broadcasts "who has 192.168.10.1?" and the owner replies with its MAC.</p><p>ARP has no checks. Any host can send a reply, even unasked, saying "192.168.10.1 is at my MAC". Other hosts update their ARP cache and send their gateway traffic to the liar. This is <b>ARP spoofing</b> (or ARP poisoning), and it is how a man-in-the-middle attack starts.</p>

## What an attack looks like
<ol><li>The attacker sends PC1 an ARP reply: "192.168.10.1 is at my MAC".</li><li>PC1 overwrites its ARP cache entry for the gateway.</li><li>The attacker sends R1 a matching lie: "PC1's address is at my MAC".</li><li>Traffic between PC1 and the gateway now passes through the attacker, who can read or change it and pass it on. Neither side notices.</li></ol><p>The switch forwards these frames normally, because each one is a valid frame to a valid MAC. Port security does not stop it either. Only a check of what the ARP <i>says</i> catches the lie.</p>

## How DAI checks ARP
<p><b>Dynamic ARP Inspection</b> (DAI) makes the switch read every ARP message that enters an <b>untrusted</b> port in the chosen VLANs. It compares the sender's IP and MAC with the <b>DHCP snooping binding table</b>. If the pair is listed for that port, the ARP passes. If not, it is dropped and logged.</p><p>PC1 and PC2 got their addresses by DHCP, so they are in the table and pass. ATTACKER set 192.168.10.99 by hand and never got a lease, so its ARPs are dropped. It cannot reach the gateway, and it cannot claim anyone else's address.</p>

## Trusted ports
<p>As with snooping, every port is untrusted by default. R1's address is set by hand, so R1 is not in the binding table either. Once DAI is on, R1's ARP replies arriving on Gi0/1 are dropped and nobody can reach the gateway.</p><p>The fix is <code>ip arp inspection trust</code> on Gi0/1. Trust ports toward routers and other switches. Check only edge ports, where users plug in.</p>

## Devices with fixed addresses
<p>The printer is legitimate, but with a fixed address it has no lease, so DAI drops it too. A <b>static binding</b> adds it to the table by hand: <code>ip source binding</code>, with its MAC, VLAN 10, 192.168.10.5 and port Fa0/3. IOS writes MAC addresses as three dotted groups, such as 00e0.b08e.1310. An ARP ACL is another way to allow fixed hosts.</p>

## Turning it on and checking it
<p>DAI depends on DHCP snooping, which is already running in this lab. Turn DAI on with <code>ip arp inspection vlan 10</code>. <code>show ip arp inspection</code> shows counters of ARPs forwarded and dropped per VLAN. DAI also limits untrusted ports to 15 ARP packets per second by default; a port that goes over is error-disabled. After testing from ATTACKER, its ARPs should show in the drop counter.</p>

## @terms
- ARP :: Address Resolution Protocol. Maps an IPv4 address to a MAC address on the local subnet.
- ARP spoofing :: Sending false ARP replies so other hosts send traffic to the attacker's MAC.
- Dynamic ARP Inspection :: A switch feature that drops ARP messages whose IP and MAC do not match a known binding.
- Trusted port (DAI) :: A port whose ARP messages are not checked. Used toward routers and switches.
- Static source binding :: A hand-made entry in the binding table for a host with a fixed address.
- Error-disabled :: A port the switch has shut down because of a violation, such as too many ARPs.

## @exam
- 5.7: configure and verify Layer 2 security features: DHCP snooping, dynamic ARP inspection, and port security.
- DAI checks ARP against the DHCP snooping binding table, so it relies on snooping.
- Only untrusted ports are checked. All ports start untrusted.
- Default rate limit on untrusted ports: 15 ARP packets per second, then err-disable.
- Hosts with static addresses need a static binding or an ARP ACL.

## @mistakes
- Not trusting the uplink: the router's ARP replies are dropped and the whole VLAN loses its gateway.
- Forgetting fixed-address devices: printers and servers stop working the moment DAI is on.
- Turning on DAI in a VLAN without DHCP snooping bindings: every untrusted host is dropped.
- Typing the MAC with dashes, as Windows shows it: IOS wants dotted groups.

## @quiz

### What does DAI compare an ARP message against?
- The MAC address table
- [x] The DHCP snooping binding table
- The routing table
- The ARP cache of the gateway
> DAI checks the sender IP and MAC against the snooping bindings for that port. The MAC address table has no IP addresses.

### After DAI is turned on, no PC can reach the gateway. What is the most likely cause?
- DHCP snooping is off on Fa0/1
- The PCs have no static bindings
- [x] The uplink to the router is not trusted for DAI
- The rate limit is too high
> The router's address is not leased, so its ARP replies are dropped on an untrusted uplink. Trusting the uplink fixes it.

### A printer with a fixed address stops working once DAI is on. Which fix keeps the protection on?
- Trust the printer's port
- Turn off DAI for VLAN 10
- Give the printer a DHCP reservation on another VLAN
- [x] Add a static source binding for the printer
> A static binding allows only the printer's own IP and MAC on that port. Trusting the port would let anything through it.

### What happens by default when an untrusted port sends more than 15 ARP packets per second?
- [x] The port is error-disabled
- The extra ARPs are queued
- The port becomes trusted
- Nothing; there is no default limit
> DAI rate-limits untrusted ports to 15 packets per second by default, and a port over the limit is error-disabled.

## @story
```json
[
 {
  "path": [
   "ATTACKER",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "ARP .99 DROPPED",
  "good": 1,
  "t": "The attacker is checked",
  "x": "ATTACKER sends an ARP from 192.168.10.99. DAI finds no binding for that address on Fa0/6, so SW1 drops it. Spoofed replies claiming .1 are dropped the same way."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "ARP REQUEST",
  "t": "PC1 asks for the gateway",
  "x": "PC1's ARP request matches its lease in the binding table, so it passes and reaches R1."
 },
 {
  "path": [
   "R1",
   "SW1"
  ],
  "cls": "rep",
  "at": "SW1",
  "label": "REPLY DROPPED",
  "bad": 1,
  "t": "The gateway is dropped",
  "x": "R1's reply enters on Gi0/1, which is untrusted. R1 has no lease, so DAI drops its reply and PC1 cannot reach the gateway."
 },
 {
  "path": [
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "GI0/1 TRUSTED",
  "good": 1,
  "t": "Uplink trusted",
  "x": "With Gi0/1 trusted, R1's ARP replies are not checked. PC1 learns the gateway MAC and its pings work."
 },
 {
  "path": [
   "PRINTER",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "STATIC BINDING",
  "good": 1,
  "t": "The printer is back",
  "x": "The static binding lists 192.168.10.5 with the printer's MAC on Fa0/3. Its ARP now matches and passes."
 }
]
```
