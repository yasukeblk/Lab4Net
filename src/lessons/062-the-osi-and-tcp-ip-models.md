---
title: The OSI and TCP/IP models
name: How the layers fit together
topic: true
ccna: 1.5, 1.13
mins: 8
---

## Why split networking into layers
<p>Sending a web page involves many separate jobs: electrical signals, addressing on a link, finding a path across networks, keeping data in order, and the web protocol itself. A <b>layered model</b> gives each job its own layer. Each layer only has to work with the one above and below it.</p><p>The layers are also the shared language of troubleshooting. "It is a layer 1 problem" tells a colleague to look at cables, not routes.</p>

## The seven OSI layers
<ol><li><b>Physical</b>: bits on a cable, fiber or radio. Connectors, speed, signal.</li><li><b>Data link</b>: frames between devices on the same link. MAC addresses, Ethernet, VLANs, error checking.</li><li><b>Network</b>: packets between networks. IP addresses and routing.</li><li><b>Transport</b>: delivery between applications. TCP and UDP, port numbers.</li><li><b>Session</b>: starting, keeping and ending conversations.</li><li><b>Presentation</b>: data format, encryption and compression.</li><li><b>Application</b>: the protocol the program uses, such as HTTP, DNS or SSH.</li></ol><p>One way to remember the order from 1 to 7: <i>Please Do Not Throw Sausage Pizza Away</i>.</p>

## Names for the data at each layer
<p>The unit of data has a different name at each of the lower layers. These names are tested.</p><ul><li>Layer 4: a <b>segment</b> (TCP) or datagram (UDP).</li><li>Layer 3: a <b>packet</b>.</li><li>Layer 2: a <b>frame</b>.</li><li>Layer 1: <b>bits</b>.</li></ul><p>When a host sends, each layer wraps what it gets from above in its own header. This is <b>encapsulation</b>: data goes in a segment, the segment in a packet, the packet in a frame. The receiver unwraps in the opposite order.</p>

## Which device works at which layer
<ul><li><b>Layer 1</b>: cables, hubs and repeaters. They pass bits and understand nothing.</li><li><b>Layer 2</b>: switches and access points. They read MAC addresses.</li><li><b>Layer 3</b>: routers and Layer 3 switches. They read IP addresses.</li><li><b>Layers 4 to 7</b>: firewalls and load balancers can read ports and application data.</li></ul><p>A device understands its own layer and every layer below it. A router reads the frame before it reads the packet.</p>

## The TCP/IP model
<p>Real networks run the TCP/IP suite, which is described with fewer layers:</p><ul><li><b>Application</b>: covers OSI layers 5, 6 and 7.</li><li><b>Transport</b>: the same as OSI layer 4.</li><li><b>Internet</b>: the same as OSI layer 3.</li><li><b>Network access</b> (also called link): covers OSI layers 1 and 2.</li></ul><p>People still use the OSI numbers in daily speech. A "layer 3 switch" and a "layer 2 loop" are OSI terms.</p>

## Where common protocols sit
<ul><li><b>Layer 7</b>: HTTP, HTTPS, DNS, DHCP, SSH, Telnet, FTP, TFTP, SNMP, NTP.</li><li><b>Layer 4</b>: TCP and UDP.</li><li><b>Layer 3</b>: IPv4, IPv6, ICMP. Routing protocols such as OSPF belong here too.</li><li><b>Layer 2</b>: Ethernet, 802.1Q, STP, CDP, LLDP. ARP works between layers 2 and 3 and is usually listed with layer 2.</li></ul>

## Using the layers to find a fault
<p>Work upwards from the bottom, because each layer depends on the ones beneath it.</p><ol><li>Layer 1: is the interface up? Is there a link light?</li><li>Layer 2: right VLAN, trunk working, MAC address learned?</li><li>Layer 3: right address, mask and gateway? Is there a route, both ways?</li><li>Layer 4 and above: is an ACL blocking the port? Is the service running?</li></ol><p><code>show ip interface brief</code> shows layers 1 and 2 at a glance: the Status column is layer 1 and the Protocol column is layer 2.</p>

## @terms
- OSI model :: A seven-layer reference model for how network communication is divided up.
- Encapsulation :: Adding a layer's header (and sometimes trailer) around the data from the layer above.
- PDU :: Protocol data unit: the name for the data at a given layer.
- Segment :: The layer 4 PDU for TCP.
- Packet :: The layer 3 PDU.
- Frame :: The layer 2 PDU.
- TCP/IP model :: The four-layer model that describes the protocol suite used on real networks.

## @exam
- The models support 1.5 (TCP and UDP at the transport layer) and 1.13 (switching at the data link layer), and they are assumed knowledge throughout.
- Know the PDU names: segment at layer 4, packet at layer 3, frame at layer 2, bits at layer 1.
- Switches forward on MAC addresses at layer 2. Routers forward on IP addresses at layer 3.
- The TCP/IP application layer covers OSI layers 5 to 7; its network access layer covers OSI layers 1 and 2.

## @mistakes
- Mixing up frame and packet. A switch forwards frames; a router forwards packets.
- Starting at the top when troubleshooting. Checking an ACL is a waste of time if the cable is unplugged.
- Thinking a router ignores layer 2. It must receive and rebuild a frame on every link.

## @quiz

### What is the layer 2 PDU called?
- Packet
- Segment
- Bits
- [x] Frame
> Layer 2 uses frames. Packets are layer 3, segments are layer 4 and bits are layer 1.

### At which OSI layer does a router make its forwarding decision?
- Layer 2
- [x] Layer 3
- Layer 4
- Layer 7
> A router forwards on the destination IP address, which is a layer 3 address. A switch decides at layer 2 using MAC addresses.

### Which OSI layers are covered by the TCP/IP application layer?
- [x] 5, 6 and 7
- 1 and 2
- 4 and 5
- Only 7
> The TCP/IP model folds session, presentation and application into one application layer.

### During encapsulation on a sending host, what is the correct order?
- Frame, packet, segment, data
- Data, packet, segment, frame
- [x] Data, segment, packet, frame
- Segment, data, frame, packet
> Data is wrapped in a segment at layer 4, then a packet at layer 3, then a frame at layer 2, and sent as bits.

### In <code>show ip interface brief</code>, an interface shows Status up and Protocol down. Which layer has the problem?
- Layer 1
- Layer 3
- [x] Layer 2
- Layer 4
> Status is the physical layer and Protocol is the data link layer. Up and down means the cable is good but layer 2 is not working.
