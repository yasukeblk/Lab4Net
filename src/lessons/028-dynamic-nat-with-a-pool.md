---
title: Dynamic NAT with a pool
name: How dynamic NAT lends public addresses
mins: 8
---

## The problem: private inside, public outside
<p>PC1 to PC3 use private addresses (192.168.1.11 to .13). Private addresses are not routed on the internet, so before a packet leaves, R1 must replace the source with a public address. That is <b>NAT</b> (Network Address Translation). The ISP has routed a small public block to R1, and the plan is to lend each inside host its own public address from it.</p>

## The four NAT address names
<p>NAT names addresses by which side of the router they belong to and from which side you look at them:</p><ul><li><b>Inside local</b>: the inside host's real address, 192.168.1.11.</li><li><b>Inside global</b>: the public address it appears as, 203.0.113.33.</li><li><b>Outside global</b>: the outside host's real address, 198.51.100.10.</li><li><b>Outside local</b>: how the outside host appears from inside. Without outside NAT it is the same as outside global.</li></ul>

## The parts of dynamic NAT
<ol><li><b>Inside and outside</b>: <code>ip nat inside</code> on G0/0 and <code>ip nat outside</code> on G0/1 set the direction of translation.</li><li><b>Who is translated</b>: standard ACL 1 permits 192.168.1.0 0.0.0.255. Here the ACL only selects traffic; it does not block anything.</li><li><b>The pool</b>: <code>ip nat pool PUBLIC 203.0.113.33 203.0.113.34 netmask 255.255.255.248</code>. The netmask need not match an interface; it must contain the whole range.</li><li><b>The rule</b>: <code>ip nat inside source list 1 pool PUBLIC</code> ties them together.</li></ol>

## How a packet is translated
<ol><li>PC1 sends a packet to 198.51.100.10. It enters R1 on G0/0, a NAT inside interface.</li><li>R1 routes it toward G0/1, a NAT outside interface. Because the packet crosses from inside to outside and its source matches ACL 1, R1 looks for an existing translation for 192.168.1.11.</li><li>There is none, so R1 takes a free address from the pool, rewrites the source, and records the pair in its <b>translation table</b>.</li><li>The reply arrives addressed to 203.0.113.33. The ISP routes the whole public block to R1, so it gets there. R1 finds the entry and rewrites the destination back to 192.168.1.11.</li></ol><p>Only one side of the pair is ever seen outside: the web server talks to 203.0.113.33 and nothing else.</p>

## One-to-one, and the pool runs dry
<p>Without the word <code>overload</code>, dynamic NAT is <b>one-to-one</b>. The first packet from PC1 borrows 203.0.113.33, PC2 borrows .34, and each keeps its address while its translation lasts (24 hours after last use by default for this kind of entry). PC3 matches the ACL but the pool is empty, so its packets are dropped. Nothing is wrong with PC3; there are simply more hosts than addresses.</p>

## The fix: overload the pool
<p>Adding <code>overload</code> turns the rule into <b>PAT</b> (Port Address Translation). Many hosts share one public address, and R1 keeps them apart by the source port number of each connection. All three PCs now share 203.0.113.33.</p><p>IOS will not change a NAT rule while translations made by it exist. Clear them with <code>clear ip nat translation *</code>, then replace the rule.</p>

## Check it worked
<p><code>show ip nat translations</code> lists each entry: inside global, inside local, outside local, outside global. With PAT the addresses carry port or ICMP id numbers. <code>show ip nat statistics</code> shows the inside and outside interfaces, hit counts, and the pool line: total addresses, how many are allocated, and misses when a host found the pool empty.</p>

## @terms
- NAT :: Network Address Translation: rewriting addresses in a packet as it crosses a router.
- Inside local :: The real address of an inside host, usually private.
- Inside global :: The public address an inside host appears as on the outside.
- NAT pool :: A range of public addresses that dynamic NAT may lend.
- Dynamic NAT :: One-to-one translation using a pool: each host borrows a whole address.
- PAT (overload) :: Many-to-one translation that tells hosts apart by port number.
- Static NAT :: A fixed one-to-one mapping, typed in, used for servers reached from outside.

## @exam
- 4.1: configure and verify inside source NAT using static and pools.
- Know the four names: inside local, inside global, outside local, outside global.
- Dynamic NAT without overload is one-to-one; when the pool is used up, new hosts are dropped.
- <code>overload</code> on a pool or an interface makes it PAT.
- The ACL in a NAT rule selects traffic for translation; a host the ACL does not match is not translated.

## @mistakes
- Inside and outside swapped on the interfaces: nothing is translated, or translation runs backwards.
- Wildcard written as a subnet mask in the ACL (255.255.255.0): it matches the wrong hosts.
- Pool netmask too small to contain the range: IOS rejects the pool.
- Trying to change the NAT rule while translations exist: IOS refuses until they are cleared.
- Blaming PC3 when the pool is simply exhausted: check the allocated count in the statistics.

## @quiz

### A pool has two addresses and the NAT rule has no overload. A third inside host sends traffic. What happens?
- It shares the first address
- [x] Its packets are dropped until an address is free
- It is sent untranslated
- R1 asks the ISP for another address
> Dynamic NAT without overload is one-to-one. With the pool used up, new hosts cannot be translated and their packets are dropped.

### In NAT terms, what is 192.168.1.11 for PC1?
- Inside global
- Outside local
- [x] Inside local
- Outside global
> The real address of an inside host is inside local. Its public face, 203.0.113.33, is inside global.

### What does the ACL in <code>ip nat inside source list 1 pool PUBLIC</code> do?
- [x] Selects which inside addresses are translated
- Blocks traffic from the outside
- Lists the public addresses in the pool
- Filters which servers can be reached
> In a NAT rule the ACL only chooses traffic to translate. Traffic it does not permit is simply not translated.

### You try to add overload to the NAT rule and IOS refuses. What do you do first?
- Delete the pool
- Shut G0/1
- Remove ip nat inside
- [x] Clear the translations with clear ip nat translation *
> IOS will not change a rule that has active translations. Clear them, then replace the rule.

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
  "label": ".11 TO .33",
  "t": "PC1 borrows an address",
  "x": "PC1 pings the web server. Its source 192.168.1.11 matches ACL 1, so R1 takes the first free pool address, 203.0.113.33, and rewrites the source."
 },
 {
  "path": [
   "R1",
   "ISP",
   "WEB"
  ],
  "cls": "req",
  "at": "WEB",
  "label": "FROM .33",
  "t": "Only the public address leaves",
  "x": "The web server sees a packet from 203.0.113.33. It never learns the private address."
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
  "label": ".33 BACK TO .11",
  "good": 1,
  "t": "The reply is translated back",
  "x": "The ISP routes the reply to R1. R1 finds 203.0.113.33 in its translation table and rewrites the destination back to 192.168.1.11."
 },
 {
  "path": [
   "PC2",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": ".12 TO .34",
  "t": "PC2 takes the last address",
  "x": "PC2 borrows 203.0.113.34. The pool now has no free addresses."
 },
 {
  "path": [
   "PC3",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "POOL EMPTY",
  "bad": 1,
  "t": "PC3 is dropped",
  "x": "PC3 matches the ACL, but without overload each host needs a whole address and none are left. R1 drops the packet."
 },
 {
  "path": [
   "PC3",
   "SW1",
   "R1",
   "ISP",
   "WEB"
  ],
  "cls": "req",
  "at": "WEB",
  "label": ".33 + PORT",
  "good": 1,
  "t": "Overload shares the address",
  "x": "With <code>overload</code>, PC3 shares 203.0.113.33 with the others. R1 tells their traffic apart by port number."
 }
]
```
