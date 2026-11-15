---
title: Network components and topologies
name: What the boxes do and how networks are laid out
topic: true
ccna: 1.1, 1.2
mins: 9
---

## Why the parts matter
<p>A network is built from a small set of device types, each with one main job. If you know what each box does, you can read any network diagram and guess where a problem lives. The CCNA expects you to name each component, say what it does and know where it normally sits.</p>

## Moving traffic: switches and routers
<ul><li>A <b>Layer 2 switch</b> connects devices in the same network. It forwards Ethernet frames by <b>MAC address</b> (the hardware address burned into each network card). It keeps everything inside one subnet.</li><li>A <b>router</b> connects different networks. It forwards packets by <b>IP address</b>, using its routing table, and it is the default gateway that lets hosts leave their own subnet. Routers also connect sites across a WAN and to the internet.</li><li>A <b>Layer 3 switch</b> does both: it switches frames inside a VLAN and routes packets between VLANs in hardware, very fast. It usually has fewer WAN features than a router, so it routes inside a campus while routers handle the edge.</li></ul>

## Protecting and serving
<ul><li>A <b>firewall</b> decides which traffic may pass between zones, such as inside and outside. It is <b>stateful</b>: it remembers connections started from inside and lets their replies back in. A <b>next-generation firewall</b> (NGFW) also recognises applications and users, not just ports, and often includes an IPS.</li><li>An <b>IPS</b> (intrusion prevention system) inspects traffic for known attack patterns (signatures) and drops matching traffic as it passes.</li><li><b>Endpoints</b> are the devices people and things use: PCs, phones, printers, cameras. <b>Servers</b> provide services to them, such as files, web pages, DHCP or DNS.</li></ul>

## Wireless and power
<p>An <b>access point</b> (AP) connects wireless clients to the wired network. In a small site each AP is configured on its own (autonomous). In larger sites, lightweight APs are managed by a <b>wireless LAN controller</b> (WLC), which pushes one configuration to all of them and handles roaming. More generally, a <b>controller</b> is software that manages many devices from one place.</p><p><b>PoE</b> (Power over Ethernet) sends electrical power down the same copper cable as the data. A PoE switch can power APs, IP phones and cameras without a power socket at each one. The standard 802.3af supplies up to 15.4 W per port, and 802.3at (PoE+) up to 30 W.</p>

## Campus designs: two-tier and three-tier
<p>A campus network is built in layers.</p><ul><li><b>Access layer</b>: the switches end devices plug into. PoE and port security live here.</li><li><b>Distribution layer</b>: aggregates the access switches, routes between VLANs and applies policy. It is usually built from Layer 3 switches.</li><li><b>Core layer</b>: a fast backbone that connects the distribution blocks. Its only job is to move traffic quickly and reliably.</li></ul><p>A <b>three-tier</b> design has all three. A smaller site merges core and distribution into one layer, called a <b>collapsed core</b> or <b>two-tier</b> design. Access switches connect up to two distribution switches, so losing one uplink does not cut them off.</p>

## Data centers, WANs and small offices
<p><b>Spine-leaf</b> is the data center design. Servers connect to <b>leaf</b> switches. Every leaf connects to every <b>spine</b> switch, but leaves never connect to each other and spines never connect to each other. Any server reaches any other server in the same number of hops (leaf, spine, leaf), so delay is predictable, and adding a spine adds capacity.</p><p>A <b>WAN</b> (wide area network) joins sites that are far apart, usually over links rented from a provider or over the internet. A <b>SOHO</b> (small office/home office) network often uses one box that is a router, switch, firewall and AP together.</p>

## On-premises or cloud
<p><b>On-premises</b> means the company owns the servers and runs them in its own building or data center. It buys hardware up front and its staff maintain it. <b>Cloud</b> means the servers belong to a provider and the company rents what it needs, reaching it over the internet or a private WAN link. Many networks are a mix of the two.</p>

## @terms
- Layer 2 switch :: Forwards frames between devices in the same network, using MAC addresses.
- Router :: Forwards packets between networks, using IP addresses and a routing table.
- Layer 3 switch :: A switch that can also route between VLANs in hardware.
- Next-generation firewall :: A stateful firewall that also identifies applications and users and usually includes intrusion prevention.
- IPS :: Intrusion prevention system: inspects traffic inline and drops traffic that matches attack signatures.
- Wireless LAN controller :: A device that centrally configures and manages lightweight access points.
- PoE :: Power over Ethernet: power delivered over the data cable to devices such as APs and IP phones.
- Collapsed core :: A two-tier design where core and distribution are combined into one layer.
- Spine-leaf :: A data center design where every leaf switch connects to every spine switch and to nothing else in the fabric.

## @exam
- 1.1: explain the role and function of network components. 1.2: describe characteristics of network topology architectures.
- Routers separate networks and forward by IP; Layer 2 switches forward by MAC inside one network; Layer 3 switches do both.
- Know the three campus layers and that two-tier merges core and distribution.
- Spine-leaf: every leaf to every spine, no leaf-to-leaf and no spine-to-spine links; servers attach to leaves.
- PoE: 802.3af up to 15.4 W per port, 802.3at (PoE+) up to 30 W.

## @mistakes
- Thinking a switch can route between subnets: a Layer 2 switch cannot, so hosts in two VLANs cannot talk without a router or Layer 3 switch.
- Cabling two leaf switches together in a spine-leaf design: it breaks the equal-hop rule the design depends on.
- Plugging an AP or phone into a non-PoE port: the link is fine but the device never powers up.
- Confusing an IDS with an IPS: an IDS only alerts on a copy of the traffic, an IPS sits inline and can drop it.

## @quiz

### Which device forwards traffic between two different IP subnets?
- A Layer 2 switch
- [x] A router
- An access point
- A hub
> A router (or a Layer 3 switch) forwards packets between networks using IP addresses. A Layer 2 switch only forwards frames inside one network.

### In a spine-leaf design, what does each leaf switch connect to?
- Only to its neighbouring leaf switches
- To one spine switch and its servers
- [x] To every spine switch, and to its servers
- To the core layer, then to the spines
> Every leaf connects to every spine, and servers attach to leaves. Leaves do not link to each other, so any path is leaf, spine, leaf.

### A small site has access switches and one pair of switches that act as both core and distribution. What is this design called?
- Spine-leaf
- Three-tier
- Point-to-point
- [x] Collapsed core (two-tier)
> Merging core and distribution is a collapsed core, also called two-tier. Three-tier keeps them separate.

### What does PoE let a switch do?
- [x] Supply electrical power to devices over the Ethernet cable
- Route between VLANs
- Encrypt traffic between switches
- Increase the link speed to 10 Gbps
> PoE carries power and data on the same copper cable, so APs, IP phones and cameras need no separate power supply.

### Which component inspects traffic inline and drops packets that match known attack signatures?
- A wireless LAN controller
- A Layer 2 switch
- [x] An IPS
- A DHCP server
> An intrusion prevention system sits in the traffic path and blocks matches. A next-generation firewall often includes one.
