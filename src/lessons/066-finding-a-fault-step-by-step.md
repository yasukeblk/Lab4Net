---
title: Finding a fault step by step
name: How to find where a network is broken
topic: true
ccna: 1.4, 3.1
mins: 9
---

## Have a method
<p>Troubleshooting questions give you a diagram, some output and a symptom. Guessing is slow. A method is fast: start at the bottom layer, test outward one step at a time, and stop where the test first fails. The fault is between the last thing that worked and the first that did not.</p>

## Layers 1 and 2: is the interface up?
<p><code>show ip interface brief</code> on a router gives two columns for each interface. Learn the four combinations:</p><ul><li><b>up / up</b>: working.</li><li><b>administratively down / down</b>: the interface has the <code>shutdown</code> command. Fix with <code>no shutdown</code>.</li><li><b>down / down</b>: a layer 1 problem. No cable, a bad cable, or the other end is off or shut.</li><li><b>up / down</b>: a layer 2 problem. The signal is there but the two ends do not agree on the link protocol.</li></ul><p>On a switch, <code>show interfaces status</code> gives one word per port: <b>connected</b>, <b>notconnect</b>, <b>disabled</b> (shut down) or <b>err-disabled</b> (shut by a feature such as port security or BPDU Guard).</p>

## Layer 3: ping outward
<p>From the device with the problem, ping in this order:</p><ol><li>Its <b>own address</b>. Proves the interface and IP stack are up.</li><li>Its <b>default gateway</b>. Proves the local link, VLAN, address and mask.</li><li>The <b>far side</b> of the gateway, or the next router. Proves the first hop routes.</li><li>The <b>destination</b>.</li></ol><p>Cisco ping output uses one character per packet: <code>!</code> is a reply, <code>.</code> is a timeout, and <code>U</code> means a router sent back "destination unreachable", usually because it has no route.</p><p>A single lost packet at the start, <code>.!!!!</code>, is ARP at work and is not a fault.</p>

## Traceroute shows the path
<p><code>traceroute</code> (on Windows, <code>tracert</code>) lists the routers on the way to a destination.</p><p>It sends packets with a <b>TTL</b> of 1, then 2, then 3. Each router that lowers the TTL to zero drops the packet and reports back, which reveals that router's address. The last line that answers is the last hop that works. The fault is at that router or just after it.</p><p>Lines of <code>* * *</code> mean no answer came back for that hop. On a Cisco device, stop a long trace with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>6</kbd>.</p>

## Remember the way back
<p>A ping needs two routes: one to the destination and one back to the source. If a trace reaches the last router but the host never answers, check the host's <b>default gateway</b> and the routers' routes back to the <b>source subnet</b>.</p><p>Test this with an extended ping that sets the source: <code>ping 192.168.20.10 source g0/1</code>. If a ping from the router's nearest interface works but a ping sourced from its LAN interface fails, the far end has no route back to that LAN.</p>

## Read the routing table
<p>On each router along the path, ask: does it have a route for the <b>destination</b>? <code>show ip route 192.168.20.10</code> shows the route that would be used, or <code>% Network not in table</code>.</p><p>Check the route points the right way: correct next hop, and an exit interface that is up. If there is a default route, the line <b>Gateway of last resort</b> near the top says where it leads. A wrong default route sends everything unknown to the wrong place.</p>

## When the link is up but slow
<p>If everything pings but the connection is slow or drops, look at the interface counters with <code>show interfaces g0/1</code>:</p><ul><li><b>CRC</b> and <b>input errors</b> climbing: a bad cable, interference or a duplex mismatch.</li><li><b>Late collisions</b>: the classic sign of a <b>duplex mismatch</b>. The half-duplex side counts them.</li><li><b>Runts</b> and <b>giants</b>: frames that are too small or too large.</li></ul><p>The top of the same output shows the negotiated speed and duplex. Both ends must agree.</p>

## @terms
- Administratively down :: The interface state caused by the shutdown command.
- Err-disabled :: A switch port state in which a protection feature has shut the port.
- Traceroute :: A tool that lists each router on the path by sending packets with rising TTL values.
- Extended ping :: A ping with options set, such as the source interface.
- Gateway of last resort :: The next hop of the default route, shown at the top of the routing table.
- Late collision :: A collision detected after the first 64 bytes of a frame; a sign of a duplex mismatch.
- CRC error :: A received frame whose checksum failed, meaning it was damaged on the way.

## @exam
- 1.4: identify interface and cable issues (collisions, errors, mismatched duplex and speed). 3.1: interpret the components of the routing table.
- administratively down/down is <code>shutdown</code>. down/down is layer 1. up/down is layer 2.
- In ping output, <code>!</code> is success, <code>.</code> is a timeout and <code>U</code> is unreachable.
- Traceroute relies on TTL expiring at each hop. The last hop that answers is the last one that works.
- Late collisions on a full-duplex capable link point to a duplex mismatch.

## @mistakes
- Changing configuration before finding where the fault is. Test first, then change one thing.
- Checking only the route to the destination. The reply needs a route back to the source.
- Reading down/down as a shutdown. A shut interface says administratively down.

## @quiz

### An interface shows "administratively down" and "down". What fixes it?
- Replacing the cable
- Setting the speed and duplex
- [x] Entering no shutdown on the interface
- Adding a default route
> Administratively down means the <code>shutdown</code> command is on the interface. <code>no shutdown</code> brings it up.

### A ping from a Cisco router returns U.U.U. What does U mean?
- The destination replied late
- [x] A router reported the destination unreachable
- The packet was sent as UDP
- The interface is up
> U is a "destination unreachable" message, usually from a router with no route to the destination. A dot is a timeout.

### How does traceroute discover each router on a path?
- [x] It sends packets with increasing TTL values
- It reads the routing table of each router
- It uses CDP
- It sends ARP requests to each hop
> A router that lowers the TTL to zero drops the packet and reports back, which reveals its address. Raising the TTL by one each time reveals the next router.

### PC1 can ping its gateway R1. A ping from R1 to PC2 works, but PC1 cannot ping PC2. What should you check first?
- The cable between PC1 and the switch
- PC1's subnet mask
- The speed of R1's interface
- [x] Whether PC2 and the routers near it have a route back to PC1's subnet
> PC1 reaches its gateway, so its own link is fine. R1 reaches PC2 from an address PC2 can answer. The likely gap is the return route to PC1's subnet, or PC2's default gateway.

### An interface has a rising count of late collisions. What is the most likely cause?
- [x] A duplex mismatch
- A wrong subnet mask
- A missing VLAN
- An ACL
> Late collisions happen when one end is half duplex and the other is full. Check the duplex setting on both ends.
