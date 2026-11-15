---
title: ARP and the journey of a packet
name: How a packet crosses a routed network
topic: true
ccna: 1.13, 3.2
mins: 9
---

## Two addresses, two jobs
<p>Every frame on an Ethernet network carries two kinds of address. The <b>IP addresses</b> say where the packet starts and where it must end up. The <b>MAC addresses</b> say which device on this link sent the frame and which device on this link should take it.</p><p>The key idea: across a routed network the IP addresses <b>stay the same</b> the whole way, and the MAC addresses <b>change at every router</b>.</p>

## Step 1: same subnet or not?
<p>Before sending, a host compares the destination IP with its own address and mask.</p><ul><li><b>Same subnet</b>: send the frame straight to the destination's MAC address.</li><li><b>Different subnet</b>: send the frame to the MAC address of the <b>default gateway</b>. The destination IP in the packet is still the far host.</li></ul><p>A host never puts a remote host's MAC address in a frame. It cannot learn it, and does not need to.</p>

## Step 2: ARP finds the MAC
<p>The host knows the IP address it wants to reach on its link but not the MAC. <b>ARP</b> (Address Resolution Protocol) finds it.</p><ol><li>The host sends an <b>ARP request</b> as a broadcast, to FFFF.FFFF.FFFF: "Who has 192.168.10.1? Tell 192.168.10.20."</li><li>Every device in the VLAN receives it. Only the owner of that address answers.</li><li>The <b>ARP reply</b> is a unicast straight back to the asker, carrying the MAC address.</li><li>The host stores the pair in its <b>ARP table</b> and sends the waiting packet.</li></ol><p>ARP broadcasts stay inside one subnet, because routers do not forward broadcasts.</p>

## Step 3: what the router does
<p>The frame arrives at the router, addressed to the router's MAC. The router then:</p><ol><li>Checks the frame for errors and removes the Ethernet header and trailer. The old MAC addresses are gone.</li><li>Looks up the <b>destination IP</b> in its routing table and picks the longest matching route.</li><li>Lowers the packet's <b>TTL</b> by one. If it reaches zero the packet is dropped and an ICMP "time exceeded" message goes back to the sender.</li><li>Uses ARP on the outgoing link, if it has to, to find the MAC of the next hop or of the final host.</li><li>Builds a <b>new frame</b>: source MAC is its own outgoing interface, destination MAC is the next device.</li></ol><p>This repeats at every router until the packet reaches the destination subnet.</p>

## The reply comes back the same way
<p>A ping only succeeds if the reply gets home. The far host runs the same steps in reverse: same subnet or not, ARP for its own gateway, and so on. Each router on the way back needs a route to the original sender.</p><p>Many "ping fails" problems are a missing route or gateway on the <b>return</b> path. The request arrives, and the reply has nowhere to go.</p>

## Seeing it on devices
<ul><li>On a PC, <code>arp -a</code> shows the ARP table.</li><li>On a router, <code>show ip arp</code> shows it. The entry for the router's own interface has a dash for its age.</li><li>An entry marked <b>Incomplete</b> means a request was sent and nobody answered: the address is wrong, the host is off, or it is in another VLAN.</li></ul><p>The first ping to a new destination from a Cisco router often shows <code>.!!!!</code>. The first packet was dropped while ARP was finding the MAC. That is normal.</p>

## Why this matters for troubleshooting
<p>Because MAC addresses only matter on one link, a fault can be pinned down hop by hop. If a host has no ARP entry for its gateway, the problem is local: cable, VLAN, address or mask. If it does, and pings still fail, look at routing further along.</p>

## @terms
- ARP :: Address Resolution Protocol: finds the MAC address that belongs to an IPv4 address on the local link.
- ARP table :: The list of IP-to-MAC pairs a device has learned, kept for a limited time.
- Default gateway :: The router address a host sends frames to when the destination is on another subnet.
- TTL :: Time to live: a counter in the IP header that each router lowers by one, so packets cannot loop for ever.
- Encapsulation :: Wrapping a packet in a frame header and trailer before sending it on a link.
- Next hop :: The next router a packet is handed to on the way to its destination.

## @exam
- 1.13: describe switching concepts. 3.2: determine how a router makes a forwarding decision by default.
- IP addresses do not change from source to destination (unless NAT is in the path). MAC addresses are rewritten at every router.
- An ARP request is a broadcast; the ARP reply is a unicast.
- For a remote destination the frame goes to the MAC of the default gateway, not the MAC of the destination host.

## @mistakes
- Expecting to see a remote host's MAC address in the ARP table. You only ever see devices in your own subnet.
- Setting a default gateway that is not in the host's own subnet. The host cannot ARP for it, so nothing leaves the LAN.
- Checking only the outward path. Half of all reachability faults are on the way back.

## @quiz

### PC1 pings a server in another subnet. What is the destination MAC address of the frame PC1 sends?
- The server's MAC address
- The broadcast address
- [x] The MAC address of PC1's default gateway
- The MAC address of the switch
> A host sends off-subnet traffic to its default gateway, so the frame is addressed to the router's MAC. The destination IP inside is still the server.

### Which statement about ARP is true?
- [x] The request is a broadcast and the reply is a unicast
- Both request and reply are broadcasts
- Routers forward ARP requests between subnets
- ARP maps a name to an IP address
> The asker does not know the MAC, so it broadcasts. The owner answers directly. ARP stays inside one subnet, and name-to-address mapping is DNS.

### As a packet crosses three routers with no NAT, what changes at each hop?
- The source and destination IP addresses
- Only the destination IP address
- Nothing changes
- [x] The source and destination MAC addresses, and the TTL
> Each router builds a new frame with new MAC addresses and lowers the TTL by one. The IP addresses stay the same end to end.

### A router's ARP table shows an address as Incomplete. What does that mean?
- The entry is about to age out
- [x] An ARP request was sent and no reply came back
- The address belongs to the router itself
- The MAC address was learned from a trunk
> Incomplete means the router asked and nobody answered. Check that the host is up, is in the right VLAN and has the right address.
