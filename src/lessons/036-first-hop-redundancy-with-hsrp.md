---
title: First-hop redundancy with HSRP
name: How two routers share one gateway
mins: 9
---

## The problem: one gateway, two routers
<p>A PC can have only one default gateway. The LAN has two routers to the core, R1 and R2, but if the PCs point at R1's address and R1 fails, they are cut off, even though R2 is right there. The PCs will not try another gateway on their own.</p><p>A <b>first-hop redundancy protocol</b> (FHRP) solves this. Two routers share a <b>virtual IP address</b> and a <b>virtual MAC address</b>. The PCs use the virtual IP as their gateway, and whichever router is in charge answers for it.</p>

## How HSRP works
<p><b>HSRP</b> (Hot Standby Router Protocol) is Cisco's FHRP. The routers in a <b>group</b> elect one <b>active</b> router, which forwards traffic for the virtual IP, and one <b>standby</b> router, which waits to take over.</p><ul><li>The highest <b>priority</b> wins. The default is 100; if priorities tie, the highest interface IP wins.</li><li>Routers send <b>hellos</b> every 3 seconds. If the standby hears nothing for the <b>hold time</b>, 10 seconds, it becomes active.</li><li>For HSRP version 1, the virtual MAC is 0000.0C07.ACxx, where xx is the group number in hex. Group 1 is 0000.0C07.AC01.</li></ul>

## Preempt
<p>By default a router does not take the active role back once someone else holds it, even if its priority is higher. <b>Preempt</b> lets it do so. In this lab R1 has priority 110 and preempt, so when its link comes back it becomes active again. Without preempt, R2 would stay active until it failed itself.</p><p>Notice what HSRP watches: hellos on the LAN. If R1's uplink to CORE failed instead, its LAN side would stay up and it would stay active, sending traffic toward a dead link. Interface tracking, which lowers the priority when an uplink fails, exists for that, but it is beyond this lab.</p>

## How it is set up here
<p>Both routers join group 1 on G0/0 with <code>standby 1 ip 192.168.1.1</code>. They keep their real addresses, 192.168.1.2 and 192.168.1.3. R1 adds <code>standby 1 priority 110</code> and both add <code>standby 1 preempt</code>. The group number and virtual IP must match on both routers. The PCs keep 192.168.1.1 as their gateway and never change.</p>

## Other FHRPs
<p><b>VRRP</b> is the open standard version, with a master and backups instead of active and standby. <b>GLBP</b> is a Cisco protocol that can share traffic across several routers at once. HSRP uses one active router per group, so R2 carries no LAN traffic while R1 is up.</p>

## Check it worked
<p><code>show standby brief</code> lists the group, priority, the P flag for preempt, the state (Active or Standby), and the other router's address. R1 should be Active and R2 Standby. Shut R1 G0/0 and R2 becomes Active within the hold time. Pings from PC1 to 203.0.113.10 resume with no change on the PC.</p>

## @terms
- FHRP :: First-hop redundancy protocol. Lets several routers act as one default gateway.
- HSRP :: Hot Standby Router Protocol, Cisco's FHRP with one active and one standby router per group.
- Virtual IP :: The shared gateway address that hosts use. Owned by whichever router is active.
- Virtual MAC :: The shared MAC address for the virtual IP. 0000.0C07.ACxx in HSRP version 1.
- Active router :: The HSRP router that forwards traffic for the virtual IP.
- Standby router :: The HSRP router that takes over if the active router fails.
- Preempt :: Lets a higher-priority router take the active role back when it returns.

## @exam
- 3.5: describe the purpose, functions, and concepts of first hop redundancy protocols.
- HSRP: active and standby, default priority 100, higher wins, preempt is off by default.
- Hello 3 seconds, hold 10 seconds.
- HSRPv1 virtual MAC 0000.0C07.ACxx, where xx is the group in hex.
- HSRP and GLBP are Cisco protocols; VRRP is an open standard. GLBP load balances.

## @mistakes
- Different virtual IPs or group numbers on the two routers: each believes it is alone, and both become active.
- Setting a higher priority without preempt: the router does not take over again after a failure.
- Using a router's real address as the PCs' gateway: the redundancy is there, but nobody uses it.
- Assuming lower priority wins, as with some other protocols: in HSRP higher wins.

## @quiz

### R1 has HSRP priority 110 and R2 has the default. Neither has preempt. R1 reloads and comes back. Which router is active?
- R1, because 110 is higher
- [x] R2, because preempt is off
- Both, until the hold time runs out
- Neither, until the PCs renew
> Without preempt, a returning router does not take the role back even with a higher priority. R2 stays active.

### What is the HSRP version 1 virtual MAC address for group 1?
- 0000.5E00.0101
- 0000.0C9F.F001
- [x] 0000.0C07.AC01
- 0007.B400.0101
> HSRPv1 uses 0000.0C07.ACxx with the group number in hex. 0000.0C9F.Fxxx is HSRPv2 and 0000.5E00.01xx is VRRP.

### What default gateway do the PCs use in this lab?
- [x] 192.168.1.1, the virtual IP
- 192.168.1.2, R1's real address
- 192.168.1.3, R2's real address
- Both real addresses, in turn
> The PCs use the virtual IP. Whichever router is active answers for it, so the PCs never need to change.

### Which FHRP is an open standard rather than Cisco proprietary?
- HSRP
- GLBP
- CDP
- [x] VRRP
> VRRP is defined by the IETF. HSRP and GLBP are Cisco protocols, and CDP is not an FHRP.

### What is the default HSRP hold time?
- 3 seconds
- [x] 10 seconds
- 30 seconds
- 1 second
> Hellos are sent every 3 seconds and the hold time is 10. If the standby hears no hello for 10 seconds, it takes over.

## @story
```json
[
 {
  "path": [
   "R1",
   "SW1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "HELLO PRI 110",
  "t": "The routers elect",
  "x": "R1 and R2 exchange HSRP hellos every 3 seconds. R1 has priority 110 and R2 has 100, so R1 becomes active and R2 standby."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "ARP .1",
  "t": "PC1 looks for its gateway",
  "x": "PC1 sends an ARP request for 192.168.1.1. Only the active router answers, with the virtual MAC 0000.0C07.AC01."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1",
   "CORE",
   "NET"
  ],
  "cls": "req",
  "at": "NET",
  "label": "VIA ACTIVE R1",
  "good": 1,
  "t": "Normal forwarding",
  "x": "Traffic for 203.0.113.10 goes to the virtual MAC, which R1 owns. R1 forwards it through CORE to NET."
 },
 {
  "path": [
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "G0/0 DOWN",
  "bad": 1,
  "t": "R1's LAN link fails",
  "x": "R1 G0/0 is shut down. R2 stops hearing R1's hellos."
 },
 {
  "path": [
   "R2",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "R2 ACTIVE",
  "t": "R2 takes over",
  "x": "R2 becomes active and starts answering for 192.168.1.1 and the same virtual MAC. PC1 changes nothing."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R2",
   "CORE",
   "NET"
  ],
  "cls": "req",
  "at": "NET",
  "label": "VIA R2",
  "good": 1,
  "t": "Traffic flows again",
  "x": "PC1's traffic now leaves through R2 and CORE to NET."
 },
 {
  "path": [
   "R1",
   "SW1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "PREEMPT",
  "t": "R1 comes back",
  "x": "When G0/0 is back up, R1 hears R2 as active. With higher priority and preempt on, it takes the active role back."
 }
]
```
