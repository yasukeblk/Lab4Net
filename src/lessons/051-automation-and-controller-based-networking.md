---
title: Automation and controller-based networking
name: How controllers change network management
topic: true
ccna: 6.1, 6.2, 6.3
mins: 10
---

## The problem with one box at a time
<p>In a traditional network, every router and switch is configured on its own, usually by someone typing CLI commands over SSH. That works for ten devices. For five hundred, it is slow, and each typo or forgotten device makes the network a little less consistent. This drift from the intended configuration causes outages that are hard to trace.</p><p><b>Network automation</b> means software makes the changes instead. The benefits the exam expects you to know: fewer human errors, the same change applied the same way everywhere, faster rollout, easier compliance checks, and staff time freed for design work instead of repetitive tasks.</p>

## Three planes
<p>Every network device does three jobs, called <b>planes</b>:</p><ul><li><b>Data plane</b> (forwarding plane): moves packets and frames from one interface to another, using tables already built. This is most of the work and is done in hardware.</li><li><b>Control plane</b>: builds those tables. OSPF, STP, ARP and MAC learning are all control plane.</li><li><b>Management plane</b>: how people and tools reach the device to configure and monitor it: SSH, SNMP, syslog, APIs.</li></ul>

## Traditional versus controller-based
<p>In a <b>traditional</b> network the control plane is <b>distributed</b>. Each device runs its own protocols, talks to its neighbours and makes its own decisions, and each is managed separately.</p><p>In a <b>controller-based</b> network, also called <b>software-defined networking</b> (SDN), a central <b>controller</b> holds the view of the whole network. It works out the policy and configuration and pushes it to the devices. Some or all control plane work moves from the devices to the controller. The devices keep forwarding packets themselves: the data plane stays on the device.</p><p>The operator stops configuring boxes and instead tells the controller what outcome is wanted, for example which groups of users may reach which applications. This is often called <b>intent-based networking</b>.</p>

## Northbound and southbound APIs
<p>An <b>API</b> (Application Programming Interface) is a defined way for one program to talk to another. A controller has two kinds, named by their direction in the usual diagram, where applications sit above the controller and devices below it.</p><ul><li><b>Northbound APIs</b> face up, to applications, scripts and dashboards. They are usually <b>REST</b> APIs that exchange JSON.</li><li><b>Southbound APIs</b> face down, to the network devices. Examples are <b>NETCONF</b>, <b>RESTCONF</b>, <b>OpenFlow</b> and <b>OpFlex</b>. Some controllers also still use SSH and SNMP southbound.</li></ul>

## Underlay, overlay and fabric
<ul><li>The <b>underlay</b> is the physical network: the cables, switches and the IP routing that lets every device reach every other.</li><li>The <b>overlay</b> is a set of virtual networks built on top, using <b>tunnels</b>. A tunnel wraps the original packet inside a new header so it crosses the underlay as if the two ends were directly connected. VXLAN is a common tunnel type.</li><li>The <b>fabric</b> is the underlay and overlay together, managed as one system.</li></ul><p>The overlay lets the controller create segments and apply policy without changing the physical network for each one.</p>

## What changes for the engineer
<p>In a traditional network a change to a security policy may mean logging in to dozens of switches and editing ACLs on each. With a controller the engineer edits the policy once, and the controller works out which devices need which configuration and pushes it. The controller also collects status from every device, so it can show the health of the whole network in one place and check that each device still matches what it was told.</p><p>The work moves from typing commands to defining policy, reading dashboards and writing scripts against the controller's API.</p>

## Cisco examples
<p><b>Cisco SD-Access</b> builds a campus fabric managed by <b>Catalyst Center</b> (formerly DNA Center). Its overlay uses LISP for the control plane and VXLAN for the data plane. <b>Cisco SD-WAN</b> uses a controller-based design for WAN links between sites. <b>Cisco ACI</b> runs data centre spine-leaf fabrics from a controller called the APIC.</p><p>The exam does not ask you to configure these. It asks you to recognise the parts and explain what changes when control moves to a controller.</p>

## @terms
- Data plane :: The part of a device that forwards packets using tables already built.
- Control plane :: The part that builds forwarding tables, through protocols such as OSPF and STP.
- Management plane :: The access used to configure and monitor a device, such as SSH, SNMP and APIs.
- SDN :: Software-defined networking: a central controller programs network devices.
- Northbound API :: The controller interface used by applications and scripts, usually REST.
- Southbound API :: The controller interface used to program devices, such as NETCONF or OpenFlow.
- Underlay :: The physical network and its IP routing.
- Overlay :: Virtual networks carried in tunnels across the underlay.
- Fabric :: Underlay and overlay managed together as one system.
- Configuration drift :: Devices slowly moving away from their intended configuration through manual changes.

## @exam
- 6.1: explain how automation impacts network management. 6.2: compare traditional networks with controller-based networking. 6.3: describe controller-based, software-defined architecture (overlay, underlay, and fabric), separation of control plane and data plane, and northbound and southbound APIs.
- Controllers centralise the control plane. The data plane stays on the devices.
- Northbound faces applications (REST, JSON). Southbound faces devices (NETCONF, RESTCONF, OpenFlow, OpFlex).
- The overlay is built from tunnels such as VXLAN, and the underlay is the routed physical network.
- Know the benefits of automation: consistency, fewer errors, speed, scale.

## @mistakes
- Saying a controller forwards the user traffic: it does not. Packets still flow device to device in the data plane.
- Swapping north and south: think of the diagram, with applications on top and switches underneath.
- Thinking an overlay replaces the underlay: the tunnels only work if the underlay can already route between their end points.
- Assuming automation means no CLI knowledge is needed: troubleshooting still needs you to read what the devices are doing.

## @quiz

### In a controller-based network, which plane is centralised on the controller?
- The data plane
- [x] The control plane
- The management plane only
- None, all planes stay on the devices
> The controller takes over the control plane decisions and pushes the results down. Forwarding (the data plane) still happens on each device.

### A Python script asks the controller for a list of all switches. Which interface does it use?
- A southbound API
- The data plane
- [x] A northbound API
- The console port
> Applications and scripts talk to the controller through its northbound API, usually REST. Southbound APIs are how the controller talks to the devices.

### Which of these is a southbound API?
- [x] NETCONF
- A web dashboard
- A REST call from a ticketing system
- SMTP
> NETCONF is used by a controller or tool to configure devices, so it is southbound. The dashboard and the ticketing system are applications using the northbound side.

### What is an overlay network?
- The physical cabling between switches
- A routing protocol that replaces OSPF
- A backup copy of the configuration
- [x] Virtual networks built from tunnels that run across the physical network
> The overlay uses tunnels, such as VXLAN, on top of the routed underlay. The physical cabling and routing are the underlay.

### Which is a main benefit of network automation?
- Devices no longer need a data plane
- [x] Changes are applied the same way everywhere, with fewer human errors
- Routing protocols are no longer needed anywhere
- Links get more bandwidth
> Automation removes repetitive manual typing, so changes are consistent and faster. It does not change what devices need to forward traffic or add bandwidth.
