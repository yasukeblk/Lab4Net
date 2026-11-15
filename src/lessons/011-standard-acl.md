---
title: Standard ACL
name: How a router filters by source address
mins: 8
---

## The problem: some traffic should not get through
<p>Routing makes every network reachable from every other. That is usually the goal, but not always. Guests on 192.168.2.0/24 should not reach the server LAN, 192.168.3.0/24, while staff on 192.168.1.0/24 should.</p><p>An <b>access control list</b> (ACL) is an ordered list of permit and deny lines. Applied to an interface, it makes the router check every packet against the list as it passes, and either forward or drop it.</p>

## How a router reads an ACL
<ol><li>It checks the packet against the first line, then the next, from the top down.</li><li>The <b>first match wins</b>. The router permits or denies the packet and stops reading.</li><li>If no line matches, the packet hits the <b>implicit deny</b>: an invisible <code>deny any</code> at the end of every ACL.</li></ol><p>That last rule is why ACL 10 needs <code>permit any</code> after its deny line. Without it, staff traffic would match nothing and be dropped too.</p>

## Standard ACLs and wildcard masks
<p>A <b>standard ACL</b> matches on the <b>source address only</b>. Numbered standard ACLs use 1 to 99 and 1300 to 1999.</p><p>The address is followed by a <b>wildcard mask</b>. A 0 bit means "this bit must match" and a 1 bit means "ignore it". So <code>192.168.2.0 0.0.0.255</code> matches anything starting 192.168.2. The keyword <code>host</code> means a wildcard of 0.0.0.0 (one exact address), and <code>any</code> means 255.255.255.255 (every address). A quick way to find the wildcard is 255.255.255.255 minus the subnet mask.</p>

## Direction and placement
<p>An ACL does nothing until it is applied with <code>ip access-group</code>, inbound (<code>in</code>, as packets enter) or outbound (<code>out</code>, as they leave). Each interface can have one ACL per direction for IPv4.</p><p>Because a standard ACL cannot see the destination, put it <b>as close to the destination as possible</b>. Applied on R1 near the guests, ACL 10 would block guests from everything beyond R1. Applied outbound on R2 G0/1, the interface facing SRV1, it only affects traffic going to the server LAN.</p>

## How it is configured here
<p>On R2: <code>access-list 10 deny 192.168.2.0 0.0.0.255</code>, then <code>access-list 10 permit any</code>, then <code>ip access-group 10 out</code> on G0/1. Test it both ways: PC1 (192.168.1.10) still reaches SRV1 (192.168.3.10), PC2 (192.168.2.10) does not, and PC2 can still ping R2 at 10.0.0.2, because that traffic never leaves G0/1.</p>

## Check it worked
<p><code>show access-lists</code> shows each line with a match counter. When PC2 pings the server, the counter on the deny line should rise. <code>show ip interface g0/1</code> confirms which ACL is applied and in which direction. A counter that never moves means the ACL is not in the path you think it is.</p>

## @terms
- ACL :: Access control list: an ordered list of permit and deny lines a router checks packets against.
- Standard ACL :: An ACL that matches only the source IP address. Numbered 1 to 99 or 1300 to 1999.
- Wildcard mask :: A mask where 0 bits must match and 1 bits are ignored.
- Implicit deny :: The invisible deny any at the end of every ACL that drops anything not matched.
- Inbound / outbound :: Whether the ACL checks packets as they enter or as they leave the interface.
- host / any :: Shorthand for wildcard 0.0.0.0 (one address) and 255.255.255.255 (all addresses).

## @exam
- 5.6: configure and verify access control lists.
- Standard ACLs: source only, numbers 1 to 99 and 1300 to 1999. Place them close to the destination.
- Lines are read top down, first match wins, and every ACL ends with an implicit deny.
- Know how to turn a subnet mask into a wildcard: /24 is 0.0.0.255, /26 is 0.0.0.63.
- One ACL per interface, per direction, per protocol.

## @mistakes
- Only a deny line and no <code>permit any</code>: the implicit deny drops everyone, so staff lose the server too.
- Using the subnet mask instead of the wildcard (<code>255.255.255.0</code>): the line matches the wrong addresses.
- Placing the standard ACL near the source: guests are cut off from every network beyond R1, not just the servers.
- Creating the ACL but never applying it with <code>ip access-group</code>: nothing is blocked and the counters stay at zero.

## @quiz

### What does a standard ACL match on?
- Source and destination address
- [x] Source address only
- Destination address and port
- Protocol and source address
> Standard ACLs only look at the source IP. Matching on destination, protocol or port needs an extended ACL.

### ACL 10 has only <code>deny 192.168.2.0 0.0.0.255</code>. What happens to staff traffic from 192.168.1.10?
- It is permitted, because it does not match the deny
- [x] It is dropped by the implicit deny at the end
- It is permitted, but logged
- It is dropped only if it is ICMP
> A packet that matches no line hits the invisible deny any. That is why the lab adds permit any as the second line.

### Which wildcard mask matches the subnet 10.1.1.0/26?
- 255.255.255.192
- 0.0.0.192
- 0.0.0.31
- [x] 0.0.0.63
> Wildcard = 255.255.255.255 minus the mask. A /26 mask is 255.255.255.192, so the wildcard is 0.0.0.63.

### Why is ACL 10 applied outbound on R2 G0/1 rather than on R1?
- [x] A standard ACL cannot see the destination, so near the source it would block guests from everything
- Standard ACLs only work outbound
- R1 has no free interfaces
- ACLs must be on the router closest to the server
> Placing a source-only filter near the destination limits its effect to traffic heading there. Standard ACLs can be applied in either direction.

### PC2 still pings 10.0.0.2 after the ACL is applied. Why?
- 10.0.0.2 is on the permit list
- ACLs never filter ICMP
- [x] The packet is addressed to R2 itself and never leaves G0/1
- The implicit deny only applies to TCP
> An outbound ACL on G0/1 only checks packets leaving G0/1. Traffic for R2's own address is handled by R2 and never goes out that interface.

## @story
```json
[
 {
  "path": [
   "PC1",
   "R1",
   "R2",
   "SRV1"
  ],
  "cls": "req",
  "at": "SRV1",
  "label": "PERMIT ANY",
  "good": 1,
  "t": "Staff traffic passes",
  "x": "PC1 pings 192.168.3.10. As the packet leaves R2 G0/1, ACL 10 checks the source 192.168.1.10. It does not match the deny line, so the permit any line lets it through."
 },
 {
  "path": [
   "SRV1",
   "R2",
   "R1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "REPLY",
  "good": 1,
  "t": "The reply comes back",
  "x": "The reply enters R2 on G0/1. ACL 10 is outbound only, so it does not check traffic coming in from the server."
 },
 {
  "path": [
   "PC2",
   "R1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "DENY 192.168.2.0",
  "bad": 1,
  "t": "Guest traffic is dropped",
  "x": "PC2 pings the server. R2 routes the packet toward G0/1, and ACL 10 checks it on the way out. The source matches the deny line, so R2 drops it and the counter on that line goes up."
 },
 {
  "path": [
   "PC2",
   "R1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "NOT FILTERED",
  "good": 1,
  "t": "The guest can still reach R2",
  "x": "PC2 pings 10.0.0.2, R2's own address. That packet is for R2 itself and never leaves G0/1, so ACL 10 never sees it."
 },
 {
  "path": [
   "R1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "WRONG PLACE",
  "bad": 1,
  "t": "Why not filter on R1?",
  "x": "A standard ACL cannot see the destination. Denying guests near the source would block them from everything beyond R1, not just the server LAN, so it goes near the destination."
 }
]
```
