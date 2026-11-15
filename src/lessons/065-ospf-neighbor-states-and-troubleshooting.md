---
title: OSPF neighbor states and troubleshooting
name: How OSPF routers become neighbors
topic: true
ccna: 3.4
mins: 10
---

## No neighbour, no routes
<p>OSPF routers only share routes with routers they have formed an <b>adjacency</b> with. When OSPF routes are missing, the first question is always the same: is the neighbour there, and what state is it in?</p><p>This lesson covers what two routers must agree on, the states they pass through, and how to read the output when it goes wrong.</p>

## What must match
<p>Two routers on a link become neighbours only if all of these are true:</p><ul><li>They are in the <b>same subnet</b>, with the same mask.</li><li>The interfaces are in the <b>same area</b>.</li><li>The <b>hello and dead timers</b> match. The defaults on Ethernet are 10 and 40 seconds.</li><li>Their <b>router IDs are different</b>.</li><li><b>Authentication</b> matches, if it is used.</li><li>Neither interface is <b>passive</b>. A passive interface sends no hellos.</li><li>The <b>MTU</b> matches. If it does not, the routers see each other but get stuck part way.</li></ul><p>These do <b>not</b> have to match: the OSPF <b>process ID</b>, which only matters inside one router, and the interface cost.</p>

## The states
<p>A neighbour moves through these states in order:</p><ol><li><b>Down</b>: no hello heard.</li><li><b>Init</b>: a hello was received, but it did not list this router's ID. The neighbour has not heard us yet.</li><li><b>2-Way</b>: each router has seen itself in the other's hello. On Ethernet, the DR and BDR are chosen here.</li><li><b>ExStart</b>: the two decide who leads the database exchange.</li><li><b>Exchange</b>: they swap summaries of their link-state databases.</li><li><b>Loading</b>: each asks for the entries it is missing.</li><li><b>Full</b>: the databases match. Routes can now be calculated.</li></ol>

## 2-Way can be normal
<p>On a shared Ethernet segment, routers form a Full adjacency only with the <b>DR</b> and the <b>BDR</b>. Two routers that are neither (DROTHERs) stay at <b>2-Way</b> with each other, and that is correct.</p><p>In <code>show ip ospf neighbor</code> the State column shows both the state and the neighbour's role: <code>FULL/DR</code>, <code>FULL/BDR</code>, <code>2WAY/DROTHER</code>. On a point-to-point link there is no DR, and it shows <code>FULL/ -</code>.</p>

## Reading the symptoms
<ul><li><b>No neighbour listed at all</b>: hellos are not arriving or are being rejected. Check that the interface is up, that OSPF is enabled on it, that it is not passive, and that area, subnet and timers match.</li><li><b>Stuck in Init</b>: this router hears the neighbour, but the neighbour does not hear this router. Look for a one-way problem, such as an ACL blocking OSPF in one direction.</li><li><b>Stuck in ExStart or Exchange</b>: almost always an MTU mismatch.</li><li><b>Full, but a route is missing</b>: the neighbour is fine. The missing network is not being advertised; check the <code>network</code> statements on the router that owns it.</li></ul>

## The commands
<ul><li><code>show ip ospf neighbor</code>: neighbours, their state, role and dead timer counting down.</li><li><code>show ip ospf interface g0/0</code>: area, network type, cost, hello and dead timers, DR and BDR, and whether the interface is passive.</li><li><code>show ip ospf interface brief</code>: one line per OSPF interface with area and cost.</li><li><code>show ip protocols</code>: router ID, networks being advertised and passive interfaces.</li><li><code>show ip route ospf</code>: the routes learned, marked <b>O</b>.</li></ul><p>Compare <code>show ip ospf interface</code> on both ends of a link. Any setting that differs in the list above is the fault.</p>

## Hello facts worth knowing
<p>Hellos go to the multicast address <b>224.0.0.5</b>, all OSPF routers. Updates to the DR and BDR go to <b>224.0.0.6</b>. OSPF is carried directly in IP as protocol 89; it does not use TCP or UDP.</p><p>The dead timer is four times the hello timer by default. Change the hello with <code>ip ospf hello-interval</code> on an interface and the dead timer follows.</p>

## @terms
- Adjacency :: A full OSPF relationship in which two routers have exchanged their link-state databases.
- Hello timer :: How often an OSPF interface sends a hello; 10 seconds by default on Ethernet.
- Dead timer :: How long a router waits without a hello before declaring a neighbour down; 40 seconds by default on Ethernet.
- 2-Way :: The neighbour state in which both routers have seen each other's hellos.
- Full :: The neighbour state in which both link-state databases match.
- DROTHER :: A router on a shared segment that is neither the DR nor the BDR.
- Passive interface :: An interface whose network is advertised but which sends no hellos, so no neighbours form on it.

## @exam
- 3.4: configure and verify single-area OSPFv2, including neighbor adjacencies, point-to-point, broadcast (DR/BDR selection) and router ID.
- Must match: area, subnet and mask, hello and dead timers, authentication, MTU. Router IDs must differ. Process IDs need not match.
- Default timers on Ethernet are hello 10 and dead 40.
- 2WAY/DROTHER between two non-DR routers is normal. FULL is expected with the DR and BDR.
- Hellos go to 224.0.0.5.

## @mistakes
- Making the LAN-facing interface and the link to the neighbour both passive. A passive interface forms no adjacency.
- Putting the two ends of a link in different areas. No neighbour ever appears, even though both interfaces are up and can ping each other.
- Treating 2WAY/DROTHER as a fault and resetting OSPF.
- Assuming the process IDs must match and changing them.

## @quiz

### Which of these does NOT have to match for two routers to become OSPF neighbours?
- Area ID
- Hello timer
- [x] Process ID
- Subnet mask
> The process ID is local to each router. Area, timers and subnet must all agree.

### R1 and R2 are both DROTHERs on a shared Ethernet segment. What state should they show for each other?
- FULL
- [x] 2WAY
- INIT
- EXSTART
> DROTHERs form Full adjacencies only with the DR and BDR. Between themselves they stay at 2-Way.

### A neighbour is stuck in ExStart. What is the usual cause?
- [x] MTU mismatch
- Mismatched hello timers
- Duplicate router IDs
- A passive interface
> The routers have exchanged hellos, so timers and area match. Getting stuck at the start of the database exchange points to different MTUs.

### What are the default OSPF hello and dead timers on an Ethernet interface?
- 5 and 20 seconds
- 30 and 120 seconds
- 10 and 30 seconds
- [x] 10 and 40 seconds
> Hello is 10 seconds and dead is four times that, 40 seconds.

### R1 shows no OSPF neighbour on G0/0, and G0/0 is up. Which command shows the timers, area and passive setting for that interface?
- show ip route ospf
- [x] show ip ospf interface g0/0
- show ip ospf database
- show cdp neighbors
> <code>show ip ospf interface</code> shows everything that must match with the neighbour. Compare it on both ends.
