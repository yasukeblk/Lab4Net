---
title: Quality of service
name: How QoS decides which traffic goes first
topic: true
ccna: 4.7
mins: 10
---

## The problem QoS solves
<p>When more traffic arrives at an interface than it can send, packets wait in a <b>queue</b>, and when the queue is full they are dropped. A file download barely notices: TCP resends what was lost. A phone call does notice. Voice and video need packets to arrive on time and evenly.</p><p><b>QoS</b> (Quality of Service) is a set of tools that decide which traffic is sent first, which waits and which is dropped when a link is busy. It does not add bandwidth. It shares out what there is.</p>

## What traffic needs
<p>Four things describe how a network treats traffic:</p><ul><li><b>Bandwidth</b>: how much data the link can carry per second.</li><li><b>Delay</b> (latency): how long a packet takes to arrive.</li><li><b>Jitter</b>: how much that delay varies between packets.</li><li><b>Loss</b>: how many packets are dropped.</li></ul><p>Cisco guidance for voice is one-way delay of no more than 150 ms, jitter of no more than 30 ms and loss of no more than 1 percent. Voice uses little bandwidth but is very sensitive to the other three.</p>

## Classification and marking
<p><b>Classification</b> sorts packets into classes, for example by protocol, port, address or an ACL. <b>Marking</b> writes the class into the packet so that later devices do not have to classify again.</p><ul><li><b>CoS</b> (Class of Service): 3 bits in the 802.1Q tag of a frame, values 0 to 7. It only exists on trunks, and it is lost when a router removes the Layer 2 header.</li><li><b>DSCP</b> (Differentiated Services Code Point): 6 bits in the IP header, values 0 to 63. It travels with the packet end to end. The older IP Precedence used only 3 of those bits.</li></ul><p>Key DSCP values: <b>EF</b> (Expedited Forwarding) is 46, used for voice. <b>AF</b> (Assured Forwarding) classes are written AFxy, where x is the class (1 to 4) and y the drop likelihood (1 to 3). AF41 is 34, AF31 is 26. <b>CS</b> values (CS0 to CS7) match the old precedence values, and <b>default</b> (best effort) is 0.</p>

## The trust boundary
<p>A PC could mark all its own traffic EF and jump the queue. So the network chooses a <b>trust boundary</b>: the point where markings start to be believed. Before it, markings are ignored or rewritten. A common design trusts the Cisco IP phone, so the access switch accepts the phone's voice marking but re-marks traffic from the PC plugged in behind it.</p>

## Queuing and congestion
<p>Each router or switch decides <b>per hop</b> how to treat each class. This is called per-hop behaviour.</p><ul><li><b>CBWFQ</b> (Class-Based Weighted Fair Queuing) gives each class its own queue and a guaranteed share of bandwidth when the link is congested.</li><li><b>LLQ</b> (Low Latency Queuing) adds a <b>priority queue</b> that is always sent first. Voice goes there. The priority queue is policed to its configured rate, so it cannot starve the others.</li></ul><p>When a queue fills, new packets are dropped (<b>tail drop</b>). If many TCP flows lose packets at once, they all slow down and speed up together, wasting the link. <b>WRED</b> (Weighted Random Early Detection) drops a few packets early and at random, favouring low-priority markings, so TCP flows back off one at a time.</p>

## Policing and shaping
<p>Both limit traffic to a rate, but they treat the excess differently.</p><ul><li><b>Policing</b> drops the excess, or re-marks it to a lower class. It adds no delay and can apply inbound or outbound. ISPs police customers to the rate they pay for.</li><li><b>Shaping</b> holds the excess in a buffer and sends it later. It smooths traffic but adds delay, and works outbound only. A customer shapes outbound so the ISP's policer does not drop its traffic.</li></ul><p>On IOS all of this is built with the Modular QoS CLI: a <code>class-map</code> matches traffic, a <code>policy-map</code> says what to do with each class, and <code>service-policy</code> applies it to an interface in one direction.</p>

## @terms
- QoS :: Tools that decide which traffic is sent, delayed or dropped when a link is congested.
- Jitter :: Variation in delay between packets of the same flow.
- CoS :: A 3-bit priority value in the 802.1Q tag, from 0 to 7.
- DSCP :: A 6-bit priority value in the IP header, from 0 to 63.
- EF (DSCP 46) :: The DSCP marking used for voice traffic.
- Trust boundary :: The point in the network where QoS markings start to be accepted.
- LLQ :: Queuing with a strict priority queue for voice, plus guaranteed shares for other classes.
- WRED :: Dropping some lower-priority packets early so TCP slows down before the queue is full.
- Policing :: Dropping or re-marking traffic above a rate, without buffering it.
- Shaping :: Buffering traffic above a rate and sending it later, outbound only.

## @exam
- 4.7: explain the forwarding per-hop behavior (PHB) for QoS, such as classification, marking, queuing, congestion, policing, and shaping.
- CoS is 3 bits in the 802.1Q tag (0 to 7). DSCP is 6 bits in the IP header (0 to 63). Voice is EF, DSCP 46.
- AFxy: x is the class, y the drop likelihood. A higher y is dropped first within the same class.
- Policing drops or re-marks and adds no delay. Shaping buffers, adds delay and is outbound only.
- Voice targets: one-way delay up to 150 ms, jitter up to 30 ms, loss up to 1 percent.

## @mistakes
- Expecting QoS to fix a link that is always full: it only chooses who suffers, it does not add bandwidth.
- Relying on CoS across a router: the 802.1Q tag is removed at Layer 3, so the marking must be carried in DSCP.
- Trusting markings from PCs: users can mark their own traffic EF and take the priority queue.
- Confusing the two limiters: a policer causes drops, while a shaper causes delay. The symptom tells you which one is configured.

## @quiz

### Which marking travels with a packet across routers from one end of the network to the other?
- CoS in the 802.1Q tag
- [x] DSCP in the IP header
- The VLAN ID
- The MAC address
> DSCP is part of the IP header, so it survives routing. CoS lives in the 802.1Q tag, which is removed whenever a router rewrites the Layer 2 header.

### What is the standard DSCP marking for voice traffic?
- AF41 (34)
- CS3 (24)
- Default (0)
- [x] EF (46)
> Voice is marked Expedited Forwarding, DSCP 46. AF41 is often used for video, and CS3 for call signalling.

### An ISP limits a customer to 50 Mbps and drops anything above it. Which tool is that?
- [x] Policing
- Shaping
- WRED
- LLQ
> Dropping the excess immediately is policing. Shaping would buffer the excess and send it later.

### What does LLQ add to class-based queuing?
- Random early drops for TCP
- Marking of traffic with CoS
- [x] A strict priority queue that is always served first
- A buffer that delays traffic to a set rate
> LLQ adds a priority queue for delay-sensitive traffic such as voice. It is policed so it cannot starve the other queues.

### Why does WRED drop some packets before a queue is completely full?
- [x] To make TCP flows slow down gradually instead of all at once
- To give voice more bandwidth
- Because UDP needs the drops to resend
- To save buffer memory on the switch
> Tail drop hits many TCP flows together, and they all back off and return at the same moment. Early random drops slow flows one at a time and keep the link busy.
