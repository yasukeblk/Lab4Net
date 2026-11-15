---
title: Virtualization and the cloud
name: How virtual machines, containers and VRFs work
topic: true
ccna: 1.12
mins: 9
---

## The problem virtualization solves
<p>Running one application per physical server wastes money. Most servers sit mostly idle, yet each needs its own power, cooling, rack space and cabling. <b>Virtualization</b> splits one physical machine into many independent virtual ones, so the hardware is shared and used far more fully. The same idea applies to the network: one router can hold several separate routing tables.</p>

## Virtual machines and hypervisors
<p>A <b>virtual machine</b> (VM) is a complete computer in software: virtual CPU, memory, disk and network card, running its own operating system. The <b>hypervisor</b> is the software that creates VMs and shares the real hardware between them.</p><ul><li>A <b>Type 1</b> (bare-metal) hypervisor runs directly on the hardware. VMware ESXi, Microsoft Hyper-V and KVM are examples. Data centers use this type.</li><li>A <b>Type 2</b> (hosted) hypervisor runs as an application on a normal operating system, such as VirtualBox or VMware Workstation on a laptop.</li></ul><p>Because a VM is just files, it can be copied, backed up, or moved to another host while it is running.</p>

## The virtual switch
<p>VMs on one host still need a network. The hypervisor provides a <b>virtual switch</b> (vSwitch) in software. Each VM's virtual network card plugs into it, and it forwards frames between VMs on the same host by MAC address, just like a physical switch. The host's real network cards are the vSwitch's uplinks to the physical network.</p><p>Because VMs on one host often belong to different VLANs, the physical switch port facing the host is usually an <b>802.1Q trunk</b>, and the vSwitch tags each VM's traffic with its VLAN.</p><p>This matters when a VM moves to another host. It keeps its IP address and MAC address, so its VLAN must exist on the new host's trunk as well. If it does not, the VM arrives on a host where its VLAN goes nowhere and it drops off the network. Traffic between VMs on the same host may never touch a physical switch at all, which also means a physical switch cannot see or filter it.</p>

## Containers
<p>A <b>container</b> packages an application with the libraries it needs, but not a whole operating system. All containers on a host share the host's operating system kernel and are kept apart from each other by it. That makes them much smaller than VMs and quick to start, usually in seconds. <b>Docker</b> is a common container engine, and <b>Kubernetes</b> orchestrates containers across many hosts, starting, stopping and moving them as demand changes.</p><p>In short: a VM virtualizes the hardware, a container virtualizes the operating system.</p>

## VRFs: virtual routers
<p>A <b>VRF</b> (virtual routing and forwarding instance) gives a router several separate routing tables. Each interface is placed in one VRF, and traffic in one VRF can only use that VRF's routes. It is like having several routers in one box.</p><p>Because the tables are separate, two VRFs can even use the <b>same overlapping IP addresses</b>, for example two customers both using 10.1.1.0/24. Service providers use this to carry many customers on shared routers. Using VRFs without MPLS is called <b>VRF-Lite</b>.</p><p>Commands to recognise: <code>ip vrf forwarding NAME</code> on an interface (it removes the interface's IP address, which must then be configured again), <code>show ip route vrf NAME</code> and <code>ping vrf NAME</code>.</p>

## The cloud
<p><b>Cloud computing</b> is virtualization offered as a service. Its defining traits (from NIST) are on-demand self-service, broad network access, resource pooling, rapid elasticity (grow and shrink quickly) and measured service (pay for what you use).</p><ul><li><b>IaaS</b> (infrastructure): you rent VMs, storage and networks and manage everything above them.</li><li><b>PaaS</b> (platform): the provider also runs the operating system and tools; you supply the application.</li><li><b>SaaS</b> (software): you just use a finished application, such as web email.</li></ul><p>A <b>public</b> cloud is shared by many customers, a <b>private</b> cloud serves one organisation, and a <b>hybrid</b> cloud combines them.</p>

## @terms
- Virtual machine :: A software computer with its own operating system, running on a hypervisor.
- Hypervisor :: Software that creates virtual machines and shares physical hardware between them.
- Type 1 hypervisor :: A bare-metal hypervisor that runs directly on the server hardware.
- Virtual switch :: A software switch inside a host that connects VMs to each other and to the physical network.
- Container :: An isolated application package that shares the host operating system kernel.
- VRF :: A separate routing table on a router; interfaces in one VRF use only its routes.
- IaaS :: Infrastructure as a Service: rented virtual servers, storage and networking.

## @exam
- 1.12: explain virtualization fundamentals (server virtualization, containers, and VRFs).
- Type 1 hypervisors run on bare metal; Type 2 run on a host operating system.
- VMs each run a full operating system; containers share the host kernel, so they are lighter and start faster.
- VRFs separate routing tables on one router and allow overlapping IP addresses.
- Cloud service models: IaaS, PaaS, SaaS. Deployment models: public, private, hybrid.

## @mistakes
- Saying a container includes its own operating system kernel: it shares the host's; a VM has its own.
- Applying <code>ip vrf forwarding</code> to a configured interface and forgetting the IP address is removed: the interface goes quiet until it is readdressed.
- Leaving the switch port to a VM host as an access port: only one VLAN's VMs can reach the network.
- Pinging inside a VRF with a plain <code>ping</code>: it uses the global table and fails; use <code>ping vrf NAME</code>.

## @quiz

### What is the main difference between a virtual machine and a container?
- [x] A VM runs its own operating system; containers share the host's kernel
- Containers need a Type 1 hypervisor
- VMs cannot be moved between hosts
- Containers have their own virtual hardware
> A VM virtualizes the hardware and carries a full operating system. Containers virtualize the operating system, which is why they are smaller and start quickly.

### Two customers both use 10.1.1.0/24 and connect to the same provider router. What keeps their traffic apart?
- NAT on every interface
- Separate VLANs on the router's routing table
- [x] Different VRFs, each with its own routing table
- A Type 2 hypervisor
> Each VRF has its own routing table, so overlapping addresses can exist side by side without being confused.

### Which is a Type 1 hypervisor?
- VirtualBox on a laptop
- VMware Workstation
- Docker
- [x] VMware ESXi
> ESXi runs directly on the server hardware. VirtualBox and Workstation run on top of an operating system (Type 2), and Docker is a container engine.

### A company rents virtual servers and installs and patches its own operating systems on them. Which cloud model is this?
- SaaS
- [x] IaaS
- PaaS
- On-premises
> With IaaS the provider supplies the virtual hardware and the customer manages the operating system and everything above it.
