---
title: Named ACLs and sequence numbers
name: How to edit an ACL without retyping it
mins: 8
---

## The problem: changing a list in place
<p>An <b>access control list</b> (ACL) is an ordered list of permit and deny lines that a router checks against packets. R1 applies a standard ACL called SRV-ACCESS outbound on G0/2, the interface toward the file server SRV1. It starts with three lines:</p><ol><li>10 permit 192.168.10.0 0.0.0.255 (staff)</li><li>20 deny 192.168.20.0 0.0.0.255 (contractors)</li><li>30 permit 172.16.0.0 0.0.255.255 (an old VPN range)</li></ol><p>Three changes have arrived. With old-style numbered ACLs you would delete the list and type it all again. Named ACLs with sequence numbers let you edit one line at a time.</p>

## How an ACL is checked
<ol><li>Lines are checked from the lowest sequence number up.</li><li>The <b>first match</b> wins and checking stops.</li><li>If nothing matches, the hidden <b>implicit deny</b> at the end drops the packet.</li></ol><p>So order is everything. A permit for one host after a deny for its whole subnet is never reached. A <b>standard</b> ACL matches only the source address, which is why it is placed close to the destination, here on G0/2 facing the server.</p>

## Named ACLs and sequence numbers
<p><code>ip access-list standard SRV-ACCESS</code> enters the list's own configuration mode. Each line you add gets a <b>sequence number</b>, 10, 20, 30 by default. Type a number first to choose where a line goes:</p><ul><li><code>15 permit host 192.168.20.50</code> lands between 10 and 20, so the contractor laptop matches before the contractor deny.</li><li><code>5 deny host 192.168.10.66</code> lands before 10, so HR's PC is denied before the staff permit.</li><li><code>no 30</code> removes only the VPN line.</li></ul><p>A name also says what the list is for, which a number cannot.</p>

## Named versus numbered
<p>A numbered ACL is created with global commands such as <code>access-list 10 permit ...</code>. Each new line is added at the end, and <code>no access-list 10</code> removes the whole list, not one line. A named ACL is created with <code>ip access-list standard</code> or <code>ip access-list extended</code> and edited inside its own mode, line by line.</p><p>On current IOS a numbered ACL also has sequence numbers, and you can edit it the same way by entering <code>ip access-list standard 10</code>. Names are still preferred because they explain themselves in the configuration.</p>

## Resequencing
<p>After a few insertions the numbers are 5, 10, 15, 20, with no room left between some lines. <code>ip access-list resequence SRV-ACCESS 10 10</code> renumbers from 10 in steps of 10. The order does not change: the list becomes 10 deny HR, 20 permit staff, 30 permit laptop, 40 deny contractors.</p>

## Check it worked
<p><code>show access-lists</code> shows each line with its sequence number and a match counter, so you can see which line a test hit. Test every rule you changed and one you did not: PC1 and LAPTOP should reach 192.168.30.10, HR and CONTR should not. <code>show ip interface g0/2</code> confirms the list is still applied outbound.</p>

## @terms
- ACL :: Access control list: an ordered list of permit and deny lines used to filter or select traffic.
- Standard ACL :: Matches the source address only. Numbers 1 to 99 and 1300 to 1999, or a name.
- Extended ACL :: Matches source, destination, protocol and ports. Numbers 100 to 199 and 2000 to 2699, or a name.
- Sequence number :: The number in front of each ACL line that sets its order and lets you insert or delete it.
- Implicit deny :: The hidden last line of every ACL that drops anything not matched.
- Wildcard mask :: The inverse of a mask in an ACL: 0 bits must match, 1 bits are ignored. 0.0.0.255 matches a /24.
- Resequence :: Renumbering an ACL's lines with even gaps, without changing their order.

## @exam
- 5.6: configure and verify access control lists.
- Lines are processed top-down by sequence number, first match wins, implicit deny at the end.
- Standard ACLs match source only and go near the destination; extended ACLs go near the source.
- <code>host 192.168.20.50</code> is the same as 192.168.20.50 0.0.0.0.
- Only one ACL per interface, per direction, per protocol.

## @mistakes
- Adding the laptop permit at the end: it sits after the contractor deny and is never reached.
- Typing <code>no access-list 10</code> to remove one line of a numbered ACL: it deletes the whole list.
- An ACL with only deny lines: the implicit deny blocks everything else too.
- Applying the list in the wrong direction: outbound on G0/2 filters traffic toward the server; inbound would check the server's replies instead.
- Testing only the changed hosts and missing that a new line also caught others.

## @quiz

### SRV-ACCESS has 10 permit 192.168.10.0/24 and 20 deny 192.168.20.0/24. Where must <code>permit host 192.168.20.50</code> go to work?
- After line 20, for example 25
- Anywhere, because host entries are always checked first
- [x] Between 10 and 20, for example 15
- At the end, after the implicit deny
> First match wins. The host permit must come before the subnet deny, or the deny catches the laptop first.

### In a named ACL, what does <code>no 30</code> do?
- [x] Removes only the line with sequence number 30
- Removes the whole ACL
- Removes the first 30 lines
- Disables the ACL on its interface
> In named ACL mode, no plus a sequence number deletes exactly one line.

### What does <code>ip access-list resequence SRV-ACCESS 10 10</code> change?
- The order of the lines
- [x] The sequence numbers only, keeping the order
- The direction the ACL is applied
- The match counters
> Resequencing gives the lines new numbers starting at 10 in steps of 10. The order stays exactly the same.

### A standard ACL contains only <code>deny host 192.168.10.66</code>. What happens to traffic from 192.168.10.10?
- It is permitted, because it does not match
- It is permitted only outbound
- It is logged and permitted
- [x] It is denied by the implicit deny at the end
> Every ACL ends with an implicit deny. A list with only deny lines blocks everything; add a permit for the rest.

### Where should a standard ACL usually be placed?
- Close to the source
- [x] Close to the destination
- On every interface
- On the switch, not the router
> A standard ACL matches only the source, so placing it near the source would block that host from everywhere. Near the destination it blocks only what you intend.

## @story
```json
[
 {
  "path": [
   "PC1",
   "SW1",
   "R1",
   "SRV1"
  ],
  "cls": "req",
  "at": "SRV1",
  "label": "LINE 10 PERMIT",
  "good": 1,
  "t": "Staff are allowed",
  "x": "PC1 (192.168.10.10) pings the server. As the packet leaves G0/2, R1 checks SRV-ACCESS: line 10 matches the staff subnet and permits it."
 },
 {
  "path": [
   "LAPTOP",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "LINE 20 DENY",
  "bad": 1,
  "t": "The laptop is caught by the subnet deny",
  "x": "Before the change, 192.168.20.50 matches line 20, the deny for the whole contractor subnet. The first match wins, so it is dropped."
 },
 {
  "path": [
   "LAPTOP",
   "SW1",
   "R1",
   "SRV1"
  ],
  "cls": "req",
  "at": "SRV1",
  "label": "LINE 15 PERMIT",
  "good": 1,
  "t": "An exception inserted in place",
  "x": "<code>15 permit host 192.168.20.50</code> sits between 10 and 20. The laptop now matches line 15 before reaching the deny."
 },
 {
  "path": [
   "HR",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "LINE 5 DENY",
  "bad": 1,
  "t": "HR is blocked before the staff permit",
  "x": "HR (192.168.10.66) used to match line 10. Line 5 denies that one host, and it is checked first."
 },
 {
  "path": [
   "CONTR",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "STILL DENIED",
  "bad": 1,
  "t": "The rest of the subnet is unchanged",
  "x": "CONTR (192.168.20.20) does not match line 15, so it still hits the contractor deny. One exception did not open the whole subnet."
 },
 {
  "path": [
   "SRV1",
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "REPLY",
  "good": 1,
  "t": "Replies are not filtered",
  "x": "The ACL is outbound on G0/2. The server's reply enters G0/2 and leaves another interface, so SRV-ACCESS does not check it."
 }
]
```
