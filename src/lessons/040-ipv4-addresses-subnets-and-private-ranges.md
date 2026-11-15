---
title: IPv4 addresses, subnets and private ranges
name: How to read and split an IPv4 address
topic: true
ccna: 1.6, 1.7, 1.10
mins: 12
---

## Two parts in one address
<p>An IPv4 address is 32 bits, written as four numbers from 0 to 255 (<b>octets</b>), such as 192.168.10.77. Every address has two parts. The <b>network bits</b> on the left say which network the host is on; every device on that network shares them. The <b>host bits</b> on the right identify one device on that network.</p><p>Routers only care about the network part. That is what lets a router hold one route for a whole subnet instead of one entry per device.</p>

## Masks and prefix length
<p>The <b>subnet mask</b> marks where the network part ends. In binary it is a run of 1s (network bits) followed by 0s (host bits). 255.255.255.0 is twenty-four 1s and eight 0s.</p><p>The <b>prefix length</b> writes the same thing as a count of the 1s: 255.255.255.0 is <b>/24</b>. Learn the last-octet values: /25 is 128, /26 is 192, /27 is 224, /28 is 240, /29 is 248, /30 is 252.</p><p>Borrowing host bits to make the network part longer is <b>subnetting</b>. Each bit borrowed doubles the number of subnets and halves the hosts in each.</p>

## Network, broadcast and usable hosts
<p>Each subnet has two addresses you cannot give to a device:</p><ul><li>The <b>network address</b>: all host bits 0. It names the subnet itself, as in routing tables.</li><li>The <b>broadcast address</b>: all host bits 1. A packet sent to it goes to every host on the subnet.</li></ul><p>Everything between them is usable. With <b>h</b> host bits there are 2 to the power h addresses, so <b>2^h - 2</b> usable hosts. A /24 has 8 host bits: 256 addresses, 254 hosts. A /30 has 2 host bits: 4 addresses, 2 hosts, exactly enough for a link between two routers.</p>

## A worked example: 192.168.10.77/26
<ol><li>/26 means 26 network bits and 6 host bits. The mask is 255.255.255.192.</li><li>The interesting octet is the fourth. The <b>block size</b> is 256 - 192 = 64, so the subnets start at .0, .64, .128 and .192.</li><li>77 falls between 64 and 128, so the network address is <b>192.168.10.64</b>.</li><li>The broadcast is one less than the next subnet: <b>192.168.10.127</b>.</li><li>Usable hosts run from <b>.65 to .126</b>: 2^6 - 2 = <b>62</b> hosts.</li></ol><p>The same method works for any prefix: find the octet where the mask stops being 255, take 256 minus that mask value as the block size, and count up in blocks.</p>

## Private ranges (RFC 1918)
<p>There are not enough IPv4 addresses for every device to have its own public one. RFC 1918 sets aside three <b>private</b> ranges that anyone may use inside their own network:</p><ul><li><b>10.0.0.0/8</b>: 10.0.0.0 to 10.255.255.255</li><li><b>172.16.0.0/12</b>: 172.16.0.0 to 172.31.255.255</li><li><b>192.168.0.0/16</b>: 192.168.0.0 to 192.168.255.255</li></ul><p>Internet routers do not route private addresses, so many companies can reuse the same ranges. To reach the internet, a router translates private addresses to a public one with <b>NAT</b>. Also worth knowing: 127.0.0.0/8 is <b>loopback</b> (the host itself), and 169.254.0.0/16 is what a client gives itself when DHCP fails.</p>

## Checking a client's settings
<p>A host needs four settings: address, mask, default gateway and DNS server. How to see them:</p><ul><li><b>Windows</b>: <code>ipconfig</code> shows address, mask and gateway. <code>ipconfig /all</code> adds the MAC address, DNS servers, DHCP server and lease times.</li><li><b>macOS</b>: <code>ifconfig</code> shows interface addresses and masks, and <code>netstat -rn</code> shows the routing table, where the default entry is the gateway. The same details are under the network settings in System Settings.</li><li><b>Linux</b>: <code>ip addr</code> shows addresses with their prefix length, <code>ip route</code> shows the default gateway (the line starting <i>default via</i>), and DNS servers are listed in <code>/etc/resolv.conf</code>.</li></ul><p>Then check the result makes sense: the gateway must be inside the host's own subnet, and the mask must match the rest of the subnet.</p>

## @terms
- Octet :: One of the four 8-bit numbers in an IPv4 address, 0 to 255.
- Subnet mask :: A 32-bit value whose 1s mark the network bits of an address.
- Prefix length :: The number of network bits, written after a slash, as in /24.
- Network address :: The first address of a subnet, with all host bits 0; it names the subnet.
- Broadcast address :: The last address of a subnet, with all host bits 1; it reaches every host on the subnet.
- Block size :: 256 minus the mask value in the octet being subnetted; the gap between subnet numbers.
- RFC 1918 :: The standard that reserves 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 for private use.
- Loopback :: 127.0.0.0/8, addresses that always mean the local host.

## @exam
- 1.6: configure and verify IPv4 addressing and subnetting. 1.7: describe private IPv4 addressing. 1.10: verify IP parameters for client OS (Windows, Mac OS, Linux).
- Usable hosts = 2^h - 2, where h is the number of host bits. A /30 gives 2 hosts for point-to-point links.
- Be fast with the block size method: network address, broadcast and host range for any prefix.
- Private ranges: 10.0.0.0/8, 172.16.0.0/12 (172.16 to 172.31), 192.168.0.0/16.
- <code>ipconfig /all</code> (Windows), <code>ifconfig</code> (macOS), <code>ip addr</code> and <code>ip route</code> (Linux).

## @mistakes
- Forgetting to subtract 2: a /26 has 62 usable hosts, not 64.
- Assigning the network or broadcast address to a host: the router refuses it, or the host cannot communicate.
- Thinking 172.32.0.0 is private: the private block stops at 172.31.255.255.
- A gateway outside the host's subnet, often from a wrong mask: the host can reach its neighbours but nothing beyond them.
- Reading a 169.254 address as a configuration error on the PC: it means no DHCP server answered.

## @quiz

### What is the network address of 172.16.5.200/27?
- [x] 172.16.5.192
- 172.16.5.0
- 172.16.5.224
- 172.16.5.128
> /27 has a mask of 224 in the last octet, so the block size is 32: subnets at .160, .192, .224. 200 falls in the .192 subnet, whose broadcast is .223.

### How many usable host addresses does a /28 subnet have?
- 16
- 30
- [x] 14
- 12
> A /28 leaves 4 host bits: 2^4 = 16 addresses, minus the network and broadcast addresses, gives 14.

### Which of these addresses is private under RFC 1918?
- 172.32.1.1
- [x] 172.20.1.1
- 192.169.1.1
- 11.0.0.1
> 172.16.0.0/12 covers 172.16 to 172.31, so 172.20.1.1 is private. 172.32 is just outside the range, and 192.169 is not 192.168.

### A Linux host can reach other hosts on its LAN but not the internet. Which command shows its default gateway?
- ip addr
- cat /etc/hosts
- ifconfig -a
- [x] ip route
> <code>ip route</code> shows the routing table, and the <i>default via</i> line is the gateway. <code>ip addr</code> shows addresses but not the gateway.

### What is the broadcast address of 10.1.1.70/26?
- 10.1.1.63
- [x] 10.1.1.127
- 10.1.1.255
- 10.1.1.71
> The block size for /26 is 64, so 70 is in the 10.1.1.64 subnet. The next subnet starts at .128, so the broadcast is .127.
