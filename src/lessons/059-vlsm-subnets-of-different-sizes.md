---
title: VLSM: subnets of different sizes
name: How to fit subnets to the hosts you have
topic: true
ccna: 1.6
mins: 9
---

## The problem with one size
<p>Suppose every subnet in a company is a /24. A link between two routers needs 2 addresses and gets 254. A floor with 300 users does not fit at all. Using one mask everywhere wastes addresses in some places and runs out in others.</p><p><b>VLSM</b> (variable-length subnet masking) means using different prefix lengths inside the same address block, so each subnet is as big as it needs to be and no bigger.</p>

## The method
<ol><li>List every subnet you need and how many hosts each must hold. Include the links between routers.</li><li>Sort the list from <b>largest to smallest</b>.</li><li>For each one, pick the smallest subnet that fits (hosts + 2, rounded up to a power of two).</li><li>Give it the next free block. Then move on to the next one.</li></ol><p>Working from largest to smallest matters. A subnet has to start on a multiple of its own block size. Placing the big ones first keeps every start address on a valid boundary and leaves no gaps.</p>

## A worked example
<p>You have <b>192.168.1.0/24</b> and need: a LAN of 100 hosts, a LAN of 50, a LAN of 20, and two router-to-router links.</p><ol><li><b>100 hosts</b>: needs 128 addresses, a /25. Takes 192.168.1.0/25, which is .0 to .127.</li><li><b>50 hosts</b>: needs 64 addresses, a /26. Next free is .128. Takes 192.168.1.128/26, which is .128 to .191.</li><li><b>20 hosts</b>: needs 32 addresses, a /27. Next free is .192. Takes 192.168.1.192/27, which is .192 to .223.</li><li><b>Link 1</b>: needs 4 addresses, a /30. Takes 192.168.1.224/30, which is .224 to .227.</li><li><b>Link 2</b>: another /30. Takes 192.168.1.228/30, which is .228 to .231.</li></ol><p>Addresses .232 to .255 are still free for later. With /26 everywhere you would have had only four subnets, and the 100-host LAN would not fit.</p>

## Checking for overlap
<p>The one rule VLSM must not break: <b>no two subnets may share an address</b>. To check a design, write each subnet as a first and last address and make sure the ranges do not cross.</p><p>For example 192.168.1.128/26 runs from .128 to .191. A second subnet of 192.168.1.160/27 runs from .160 to .191. It sits inside the first one, so the design is wrong. A router will refuse the second address with an <code>overlaps</code> error if both are on its own interfaces. If they are on different routers nothing complains, and traffic goes to the wrong place.</p>

## What makes VLSM work
<p>Routers can only use subnets of different sizes if every route carries its own mask. That is called <b>classless</b> routing. OSPF, EIGRP and static routes all carry the mask. This is why every route in <code>show ip route</code> is shown with a prefix length, and why the heading says a network is <i>variably subnetted</i> when it holds subnets of more than one size.</p><p>A router picks the route with the <b>longest prefix match</b>, so a /30 link and the /24 around it can both be in the table without confusion.</p>

## Point-to-point links
<p>A link between two routers has exactly two devices on it. A <b>/30</b> gives 4 addresses: network, two hosts, broadcast. That is the classic choice and the one to expect in exam scenarios.</p><p>A <b>/31</b> has only 2 addresses and no network or broadcast address. Cisco routers accept it on point-to-point links and warn you when you configure it. Know that it exists; use /30 unless a question says otherwise.</p>

## @terms
- VLSM :: Variable-length subnet masking: using more than one prefix length inside the same address block.
- Classless routing :: Routing in which every route carries its own mask, so subnets of any size can be mixed.
- Overlap :: Two subnets whose address ranges share one or more addresses.
- Longest prefix match :: The rule that a router uses the matching route with the most network bits.
- Point-to-point link :: A link with exactly two devices, normally addressed with a /30.
- Variably subnetted :: The routing table heading for a network that contains subnets with different masks.

## @exam
- 1.6: configure and verify IPv4 addressing and subnetting. VLSM questions usually ask which subnet to assign next, or which address plan wastes the fewest addresses.
- Always allocate the largest subnet first.
- A /30 has 2 usable hosts and is the standard answer for a router-to-router link.
- A subnet must start on a multiple of its block size. 192.168.1.100/26 is not a network address; 192.168.1.64/26 is.

## @mistakes
- Allocating small subnets first, then finding the big one has no aligned block left.
- Starting a subnet at the next free address without checking the boundary. A /26 cannot start at .32.
- Giving two sites subnets that overlap. Each router looks fine on its own, but hosts in the shared range are unreachable from elsewhere.

## @quiz

### When planning with VLSM, which subnet should be allocated first?
- The one with the fewest hosts
- The router-to-router links
- [x] The one with the most hosts
- The one closest to the internet
> Largest first. Big blocks need to start on big boundaries, and placing them first keeps everything aligned with no gaps.

### 192.168.1.0/25 is in use. Which of these can be assigned next without overlapping it?
- [x] 192.168.1.128/26
- 192.168.1.64/26
- 192.168.1.0/26
- 192.168.1.96/27
> 192.168.1.0/25 covers .0 to .127. The other three options all fall inside that range. 192.168.1.128/26 covers .128 to .191.

### What is the most efficient mask for a link between two routers on this exam?
- 255.255.255.0
- 255.255.255.248
- 255.255.255.240
- [x] 255.255.255.252
> 255.255.255.252 is /30: 4 addresses, 2 usable. A /29 would waste four more addresses on each link.

### Why must a routing protocol be classless for VLSM to work?
- [x] It must send the mask with each route
- It must use multicast updates
- It must support IPv6
- It must run on every interface
> With different subnet sizes in use, a router cannot guess the mask from the address. Each route has to carry its own prefix length.

### A LAN needs 28 hosts and the next free address is 10.1.1.64. Which subnet should it get?
- 10.1.1.64/28
- [x] 10.1.1.64/27
- 10.1.1.64/26
- 10.1.1.72/27
> 28 + 2 = 30, so 32 addresses, a /27. .64 is a multiple of 32, so 10.1.1.64/27 is valid and runs to .95. A /28 holds only 14 hosts, and .72 is not a /27 boundary.
