---
title: IPv6 neighbor discovery
name: How IPv6 hosts find routers and each other
topic: true
ccna: 1.8, 1.9
mins: 9
---

## IPv6 has no ARP and no broadcast
<p>IPv4 uses ARP broadcasts to find MAC addresses and DHCP broadcasts to find a server. IPv6 has no broadcast at all. Both jobs, and several more, are done by the <b>Neighbor Discovery Protocol</b> (NDP), which uses ICMPv6 messages sent to <b>multicast</b> groups.</p><p>The gain is that only the devices that need a message have to process it.</p>

## The multicast groups to know
<ul><li><b>FF02::1</b>: all nodes on the link. The closest thing IPv6 has to a broadcast.</li><li><b>FF02::2</b>: all routers on the link.</li><li><b>FF02::5</b> and <b>FF02::6</b>: OSPFv3 routers and designated routers.</li><li><b>Solicited-node</b> addresses: <b>FF02::1:FF</b> followed by the last 24 bits of a unicast address. Every address a device has joins one.</li></ul><p>FF02 means the group is link-local in scope: these packets are never routed.</p>

## Finding a neighbour: NS and NA
<p>This pair replaces ARP.</p><ol><li>A host wants the MAC for 2001:DB8:1:1::10. It sends a <b>Neighbor Solicitation</b> (NS) to that address's solicited-node group, FF02::1:FF00:10.</li><li>Only devices whose address ends in the same 24 bits listen to that group. In practice that is the one target.</li><li>The target answers with a <b>Neighbor Advertisement</b> (NA) carrying its MAC address.</li><li>The host stores the pair in its <b>neighbor table</b>.</li></ol><p><code>show ipv6 neighbors</code> on a router is the IPv6 version of <code>show ip arp</code>.</p>

## Finding a router: RS and RA
<ol><li>A host that has just connected sends a <b>Router Solicitation</b> (RS) to FF02::2.</li><li>Each router answers with a <b>Router Advertisement</b> (RA), sent to FF02::1. Routers also send RAs on a timer without being asked.</li><li>The RA carries the link's <b>prefix</b> and prefix length, and flags that say whether to use DHCPv6.</li><li>The host uses the RA's source, the router's <b>link-local address</b>, as its default gateway.</li></ol><p>A Cisco router only sends RAs when <code>ipv6 unicast-routing</code> is enabled. Without that command it has IPv6 addresses but does not act as an IPv6 router.</p>

## Three ways to get an address
<ul><li><b>SLAAC</b>: the host takes the prefix from the RA and builds its own interface ID, with EUI-64 or a random value. No server is involved.</li><li><b>Stateless DHCPv6</b>: the host still builds its address with SLAAC, and asks a DHCPv6 server only for extras such as the DNS server.</li><li><b>Stateful DHCPv6</b>: a DHCPv6 server assigns the address and keeps track of it, as DHCP does in IPv4.</li></ul><p>In every case the <b>default gateway comes from the RA</b>. DHCPv6 does not supply one.</p>

## Duplicate address detection
<p>Before using any address, a device checks that nobody else has it. It sends an NS for <b>its own</b> new address. If an NA comes back, the address is a duplicate and is not used. If there is silence, the address is safe. This is <b>DAD</b>, and it runs for link-local addresses too.</p>

## One more address type: anycast
<p>An <b>anycast</b> address is one address configured on several devices. Routing delivers a packet to the nearest of them. It is taken from the unicast range, so it looks like any other address; what differs is that more than one device answers to it.</p><p>Summary: unicast is one to one, multicast is one to many, anycast is one to nearest. IPv6 has no broadcast.</p>

## @terms
- NDP :: Neighbor Discovery Protocol: the ICMPv6-based protocol that replaces ARP and adds router discovery in IPv6.
- Neighbor Solicitation :: The NDP message that asks for the MAC address of an IPv6 address; also used for duplicate address detection.
- Router Advertisement :: The NDP message a router sends with the link prefix and other settings.
- Solicited-node multicast :: The group FF02::1:FF plus the last 24 bits of an address; where an NS for that address is sent.
- SLAAC :: Stateless address autoconfiguration: a host builds its own address from the prefix in an RA.
- DAD :: Duplicate address detection: checking that an address is unused before taking it.
- Anycast :: One address on several devices; traffic goes to the nearest.

## @exam
- 1.8: configure and verify IPv6 addressing and prefix. 1.9: describe IPv6 address types, including anycast, multicast and modified EUI-64.
- NS and NA replace ARP. RS and RA let hosts find routers and prefixes.
- FF02::1 is all nodes; FF02::2 is all routers.
- A router sends RAs only with <code>ipv6 unicast-routing</code> configured.
- With SLAAC and with DHCPv6, the default gateway is the router's link-local address learned from the RA.

## @mistakes
- Forgetting <code>ipv6 unicast-routing</code>. Interfaces have addresses and can be pinged, but hosts never get a prefix or a gateway and the router does not forward IPv6.
- Looking for an IPv6 broadcast address. There is none; FF02::1 does that job.
- Expecting DHCPv6 to hand out a default gateway. It does not.

## @quiz

### Which IPv6 messages do the job that ARP does in IPv4?
- Router Solicitation and Router Advertisement
- [x] Neighbor Solicitation and Neighbor Advertisement
- DHCPv6 Solicit and Advertise
- Echo Request and Echo Reply
> NS asks who has an address and NA answers with the MAC. RS and RA are for finding routers and prefixes.

### To which address does a host send a Router Solicitation?
- FF02::1
- FE80::1
- [x] FF02::2
- ::1
> FF02::2 is the all-routers group. FF02::1 is all nodes, which is where routers send their advertisements.

### A host uses SLAAC. Where does it learn its default gateway?
- [x] From the source address of the Router Advertisement
- From a DHCPv6 server
- From the DNS server
- From its own EUI-64 calculation
> The gateway is the link-local address of the router that sent the RA. DHCPv6 never supplies a gateway.

### R1 has IPv6 addresses on its interfaces, but hosts on its LAN get no global address by SLAAC. What is the most likely cause?
- The interfaces need EUI-64
- The LAN prefix must be /48
- A DHCPv6 pool is missing
- [x] ipv6 unicast-routing is not configured
> Without <code>ipv6 unicast-routing</code> the router does not send Router Advertisements, so hosts never learn the prefix.

### Which statement describes an anycast address?
- It is delivered to every node on the link
- [x] It is assigned to several devices and reaches the nearest one
- It is only valid on one link
- It always starts with FF
> Anycast is one address on several devices, with routing choosing the closest. Addresses starting FF are multicast.
