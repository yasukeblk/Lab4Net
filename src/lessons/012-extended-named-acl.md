---
title: Extended named ACL
name: How to filter by protocol and port
mins: 9
---

## The problem: allow one service, not the whole host
<p>Staff on 192.168.1.0/24 may use the web server on SRV1 (192.168.3.10) but nothing else on it: no ping, no file sharing, no remote login. Everything else staff do must keep working.</p><p>A standard ACL cannot do this, because it only sees the source. An <b>extended ACL</b> matches the <b>protocol</b>, the <b>source</b>, the <b>destination</b> and, for TCP and UDP, the <b>port</b>. That is enough to say "staff to SRV1 on TCP port 80 only".</p>

## Reading an extended line
<p>Each line follows the same pattern: action, protocol, source, destination, then an optional port test.</p><p><code>permit tcp 192.168.1.0 0.0.0.255 host 192.168.3.10 eq 80</code> reads as: permit TCP from any staff address to exactly 192.168.3.10, destination port equal to 80 (HTTP). The port goes after the address it belongs to; placed after the destination it tests the destination port, which is the service being used.</p><p>The protocol <code>ip</code> means any IP packet, whatever is inside. <code>tcp</code>, <code>udp</code> and <code>icmp</code> narrow it. Other port tests include <code>gt</code>, <code>lt</code>, <code>neq</code> and <code>range</code>.</p>

## Order matters: specific first
<p>The rules are the same as for any ACL: top down, first match wins, implicit deny at the end. So the order of WEB-ONLY is the design:</p><ol><li>Permit staff to SRV1 on TCP 80. Web traffic matches here and stops.</li><li>Deny all other IP from staff to SRV1. Ping and anything else to the server stop here.</li><li>Permit ip any any. Everything else passes, instead of hitting the implicit deny.</li></ol><p>Swap lines 1 and 2 and web traffic would match the deny first, so nothing would reach the server.</p>

## Named ACLs
<p>Instead of a number, <code>ip access-list extended WEB-ONLY</code> gives the list a name that says what it is for, and opens a sub-mode for its lines. IOS numbers the lines 10, 20, 30, so you can later add a line between them (for example sequence 15) or remove one with <code>no 20</code>, without rewriting the whole list.</p>

## Placement: close to the source
<p>Because an extended ACL knows the destination, it can sit <b>close to the source</b> without blocking too much. Here it is applied inbound on R1 G0/0, the staff LAN interface. Unwanted packets are dropped at the first router instead of crossing R1, the transit link and R2 before being thrown away.</p><p>Applied inbound, it checks traffic from PC1 entering R1. The server's replies leave R1 on G0/0, so this ACL does not check them.</p>

## Check it worked
<p>From PC1: <code>telnet 192.168.3.10 80</code> should open (TCP 80 is allowed), <code>ping 192.168.3.10</code> should fail (ICMP is not TCP 80), and <code>ping 10.0.0.2</code> should work (permit ip any any). PC2 is on G0/1, so it is not affected at all. <code>show access-lists WEB-ONLY</code> shows the match count on each line.</p>

## @terms
- Extended ACL :: An ACL that matches protocol, source, destination and port. Numbered 100 to 199 or 2000 to 2699, or named.
- Named ACL :: An ACL identified by a name instead of a number, edited line by line in its own sub-mode.
- Sequence number :: The number of each line in an ACL, used to insert or delete individual lines.
- eq :: Port test meaning equal to, as in eq 80.
- Destination port :: The port of the service being reached, such as 80 for HTTP or 22 for SSH.
- permit ip any any :: A final line that allows everything not matched earlier, overriding the implicit deny.

## @exam
- 5.6: configure and verify access control lists.
- Extended ACLs: numbers 100 to 199 and 2000 to 2699, or a name. Place them close to the source.
- Know common ports: HTTP 80, HTTPS 443, SSH 22, Telnet 23, DNS 53, DHCP 67/68.
- A port test after the source address checks the source port; after the destination it checks the destination port.
- Named ACLs let you insert and delete lines by sequence number.

## @mistakes
- Putting the deny line before the permit: web traffic matches the deny first and the server becomes unreachable.
- Forgetting <code>permit ip any any</code>: staff lose every destination, including R2 at 10.0.0.2.
- Writing <code>eq 80</code> after the source address: it tests the client's source port, which is a random high number, so the permit never matches.
- Applying the ACL in the wrong direction: <code>out</code> on G0/0 checks traffic going to the staff LAN, so nothing staff send is filtered.

## @quiz

### Which line permits staff to reach the web server on SRV1?
- permit tcp host 192.168.3.10 eq 80 192.168.1.0 0.0.0.255
- permit tcp 192.168.1.0 0.0.0.255 eq 80 host 192.168.3.10
- permit ip 192.168.1.0 0.0.0.255 host 192.168.3.10 eq 80
- [x] permit tcp 192.168.1.0 0.0.0.255 host 192.168.3.10 eq 80
> Source first, then destination, then the port after the destination to test the service port. The second option tests the client's source port, and ip cannot take a port.

### WEB-ONLY has the deny line above the permit tcp line. What happens when PC1 opens port 80 on SRV1?
- It works, because the permit is more specific
- [x] It is dropped, because the deny matches first
- It works, because named ACLs sort lines automatically
- It is dropped by the implicit deny
> ACLs stop at the first match. The deny ip line matches web traffic too, so it is dropped before the permit is ever read.

### Where is an extended ACL normally placed, and why?
- [x] Close to the source, because it can see the destination and drops unwanted traffic early
- Close to the destination, because it only sees the source
- On the server itself
- Outbound on every interface
> An extended ACL is precise enough to sit near the source without blocking other destinations, so it saves carrying traffic that will be dropped anyway.

### PC1's <code>ping 192.168.3.10</code> fails but <code>telnet 192.168.3.10 80</code> opens. Why?
- Ping uses UDP port 80
- The ACL only filters inbound replies
- [x] Ping is ICMP, which does not match permit tcp ... eq 80, and the deny line catches it
- The server does not answer pings
> Line 10 only allows TCP to port 80. ICMP falls to line 20, which denies everything else from staff to the server.

### What does a named ACL let you do that an old numbered one typed in global config does not?
- Match on port numbers
- [x] Insert or delete single lines by sequence number
- Apply the ACL to more than one direction at once
- Skip the implicit deny
> Named ACLs number their lines (10, 20, 30), so you can add line 15 or remove line 20 alone. Ports and direction work the same in both kinds.

## @story
```json
[
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "TCP 80 PERMIT",
  "good": 1,
  "t": "Web traffic matches line 10",
  "x": "PC1 opens TCP port 80 to 192.168.3.10. ACL WEB-ONLY checks it as it enters R1 G0/0, and the first line permits it."
 },
 {
  "path": [
   "R1",
   "R2",
   "SRV1"
  ],
  "cls": "req",
  "at": "SRV1",
  "label": "WEB OPEN",
  "good": 1,
  "t": "It reaches the server",
  "x": "R1 routes the packet across the transit link and R2 delivers it. The web connection opens."
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
  "label": "NOT CHECKED",
  "t": "Replies are not filtered",
  "x": "The server's reply leaves R1 on G0/0. The ACL is inbound on G0/0, so traffic going out toward PC1 is not checked."
 },
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "ICMP DENIED",
  "bad": 1,
  "t": "A ping to the server is dropped",
  "x": "PC1 pings 192.168.3.10. ICMP is not TCP 80, so line 10 does not match. Line 20 denies all IP from staff to the server, and R1 drops it right at the edge."
 },
 {
  "path": [
   "PC1",
   "R1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "PERMIT ANY",
  "good": 1,
  "t": "Other destinations still work",
  "x": "PC1 pings 10.0.0.2. Lines 10 and 20 are about the server only, so the packet falls to line 30, permit ip any any, and reaches R2."
 },
 {
  "path": [
   "PC2",
   "R1",
   "R2",
   "SRV1"
  ],
  "cls": "req",
  "at": "SRV1",
  "label": "OTHER LAN",
  "good": 1,
  "t": "Guests are not affected",
  "x": "PC2 enters R1 on G0/1, where no ACL is applied, so its ping reaches the server. WEB-ONLY only checks traffic entering G0/0."
 }
]
```
