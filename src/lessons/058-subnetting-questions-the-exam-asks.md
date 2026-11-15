---
title: Subnetting questions the exam asks
name: How to answer any subnetting question
topic: true
ccna: 1.6
mins: 10
---

## One method, five questions
<p>Subnetting questions come in a few shapes. All of them are answered with the same three numbers: the <b>mask value</b> in the interesting octet, the <b>block size</b> (256 minus that value) and the <b>host bits</b> (32 minus the prefix).</p><p>This lesson works one example of each shape. Cover the answers and try each one first.</p>

## 1. Which subnet is this host in?
<p>Take <b>172.16.77.200/20</b>.</p><ol><li>/20 is 16 bits plus 4. Four bits is 240, in the third octet. Mask: 255.255.240.0.</li><li>Block size: 256 - 240 = 16. Subnets in the third octet start at 0, 16, 32, 48, 64, 80 and so on.</li><li>77 falls between 64 and 80. Network: <b>172.16.64.0</b>.</li><li>Broadcast is one less than the next subnet, with the rest all ones: <b>172.16.79.255</b>.</li><li>Usable hosts: <b>172.16.64.1 to 172.16.79.254</b>.</li></ol><p>Notice that 172.16.70.0 and 172.16.70.255 are ordinary host addresses in this subnet. Only the first and last address of the whole block are special.</p>

## 2. How many subnets and hosts?
<p><i>A company has 10.0.0.0/8 and uses /20 for every subnet. How many subnets, and how many hosts in each?</i></p><ol><li>Borrowed bits: 20 - 8 = 12. Subnets: 2^12 = <b>4096</b>.</li><li>Host bits: 32 - 20 = 12. Hosts: 2^12 - 2 = <b>4094</b>.</li></ol><p>For big powers, remember 2^10 = 1024 and double from there: 2048, 4096.</p>

## 3. Which mask fits this many hosts?
<p><i>A subnet must hold 50 hosts. What is the smallest subnet that fits?</i></p><ol><li>Find the first power of two that is at least hosts + 2. 50 + 2 = 52, and the next power of two is 64.</li><li>64 is 2^6, so 6 host bits are needed.</li><li>Prefix: 32 - 6 = <b>/26</b>, mask 255.255.255.192, 62 usable hosts.</li></ol><p>For 500 hosts: 512 is 2^9, so /23 with 510 hosts. Watch the edge: 30 hosts fit a /27, but 31 hosts need a /26.</p>

## 4. Are these two hosts in the same subnet?
<p><i>10.1.1.120/25 and 10.1.1.130/25.</i></p><p>/25 has a block size of 128 in the fourth octet, so the subnets are .0 to .127 and .128 to .255. 120 is in the first and 130 is in the second. They are in <b>different subnets</b> and need a router to talk.</p><p>This is the idea behind many troubleshooting questions. Two hosts on the same switch with a wrong mask or a wrong address cannot reach each other, or cannot reach their gateway.</p>

## 5. Is this address usable?
<p><i>Can 192.168.5.63/26 be given to a PC?</i></p><p>Block size is 64, so the subnets are .0, .64, .128, .192. The first subnet runs from .0 to .63, which makes .63 its <b>broadcast address</b>. It cannot be assigned. In the same way 192.168.5.64 is a network address.</p><p>With /24 these addresses would be fine. Whether an address is usable always depends on the mask.</p>

## Checking on a device
<p>A router refuses a network or broadcast address on an interface with <code>Bad mask /26 for address 192.168.5.63</code>. It refuses two interfaces in the same subnet with an <code>overlaps</code> message.</p><p><code>show ip interface brief</code> lists addresses without masks. Use <code>show interfaces</code> or <code>show running-config</code> to see the mask, and <code>show ip route connected</code> to see the network the router worked out from it.</p>

## @terms
- Network address :: The first address in a subnet, with all host bits 0.
- Broadcast address :: The last address in a subnet, with all host bits 1.
- Borrowed bits :: Host bits turned into network bits to make more, smaller subnets.
- Block size :: The gap between subnet numbers in the interesting octet.
- Usable range :: Every address between the network address and the broadcast address.
- Overlap :: Two subnets that share some addresses; a router will not accept both.

## @exam
- 1.6: configure and verify IPv4 addressing and subnetting. Expect several questions that depend on it, including troubleshooting ones.
- The broadcast address is always one less than the next network address.
- For "how many hosts" add 2 before picking the power of two; for "how many subnets" do not.
- When the interesting octet is the second or third, the octets after it are 0 in the network address and 255 in the broadcast address.

## @mistakes
- Doing the block-size maths in the wrong octet. For /20 the blocks are in the third octet, not the fourth.
- Picking a mask that holds exactly the number of hosts and forgetting the two reserved addresses. 30 hosts fit a /27; 31 do not.
- Assuming an address ending in .0 or .255 is never usable. In 172.16.64.0/20, the address 172.16.70.255 is a normal host.

## @quiz

### Which subnet contains the host 192.168.10.100/27?
- 192.168.10.64
- [x] 192.168.10.96
- 192.168.10.100
- 192.168.10.128
> /27 has a block size of 32: .0, .32, .64, .96, .128. 100 falls between 96 and 128, so the network is 192.168.10.96 and the broadcast is .127.

### What is the broadcast address of 10.20.30.40/21?
- 10.20.30.255
- 10.20.32.255
- [x] 10.20.31.255
- 10.20.39.255
> /21 puts 248 in the third octet, a block size of 8. 30 falls in the block 24 to 31, so the network is 10.20.24.0 and the broadcast is 10.20.31.255.

### A subnet needs 120 hosts. What is the longest prefix that fits?
- /24
- /26
- [x] /25
- /27
> 120 + 2 = 122, and the next power of two is 128, which is 2^7. Seven host bits means /25, with 126 usable hosts. A /26 only holds 62.

### PC-A is 172.16.5.200/23 and PC-B is 172.16.4.10/23. Are they in the same subnet?
- [x] Yes, both are in 172.16.4.0/23
- No, PC-A is in 172.16.5.0/23
- No, a /23 cannot be used on a LAN
- Only if the gateway is 172.16.5.1
> /23 has a block size of 2 in the third octet: 0, 2, 4, 6. Both 4 and 5 fall in the block that starts at 4, so both hosts are in 172.16.4.0/23, which runs to 172.16.5.255.

### Which address can be assigned to a host with the mask 255.255.255.240?
- 192.168.1.32
- 192.168.1.47
- 192.168.1.63
- [x] 192.168.1.33
> The block size is 16. .32 is a network address, .47 and .63 are broadcast addresses. .33 is the first usable host in 192.168.1.32/28.
