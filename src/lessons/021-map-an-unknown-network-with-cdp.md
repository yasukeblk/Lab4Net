---
title: Map an unknown network with CDP
name: How to discover what is plugged in where
mins: 8
---

## The problem: no documentation
<p>You have inherited five devices with no notes. You know their names, EDGE, CORE, ACC-A, ACC-B and the provider's ISP-PE, but not which port connects to which. Tracing cables by hand is slow. The devices can tell you themselves.</p>

## How CDP works
<p><b>CDP</b> (Cisco Discovery Protocol) is a Cisco protocol that runs at <b>Layer 2</b>. Each device sends a short advertisement out of every CDP-enabled port, every 60 seconds by default, to a multicast address that only the directly connected neighbor reads. Neighbors keep the information for a <b>holdtime</b> of 180 seconds.</p><p>Because it is Layer 2, CDP works before any IP is configured and between devices in different subnets. It only ever sees <b>directly connected</b> neighbors: CORE learns about EDGE, ACC-A and ACC-B, but not about ISP-PE, which is two hops away.</p>

## Reading show cdp neighbors
<p>Each line of <code>show cdp neighbors</code> describes one cable:</p><ul><li><b>Device ID</b>: the neighbor's hostname.</li><li><b>Local Intrfce</b>: your port.</li><li><b>Holdtme</b>: seconds left before the entry expires.</li><li><b>Capability</b>: R for router, S for switch, and so on.</li><li><b>Platform</b>: the model.</li><li><b>Port ID</b>: the neighbor's port at the far end.</li></ul><p>Local Intrfce and Port ID together describe both ends of the cable. On CORE, one line shows ACC-B on local Fa0/8: an uplink on a FastEthernet port, which nobody would have guessed. CDP reports what is really plugged in.</p><p><code>show cdp neighbors detail</code> adds each neighbor's IP address and software version. That is how you find ACC-B's management address to ping it.</p>

## Labelling links with descriptions
<p><code>description</code> attaches a note to an interface. It changes nothing about forwarding, but it appears in <code>show interfaces</code> and <code>show interfaces description</code>. The format here, <code>TO-&lt;neighbor&gt;-&lt;neighbor port&gt;</code>, names the far device and its port, so the next engineer can follow the cable from either end.</p>

## Where CDP should be off
<p>CDP tells the neighbor your hostname, model, software version and addresses. Inside your network that helps you. Towards a provider, or on a port anyone can plug into, it hands an attacker a list of which software to target.</p><p><code>no cdp enable</code> on an interface stops CDP on that port only. <code>no cdp run</code> stops it on the whole device. Here only EDGE G0/1, facing ISP-PE, is turned off. After the holdtime runs out, EDGE disappears from ISP-PE's table.</p><p><b>LLDP</b> (IEEE 802.1AB) is the open-standard equivalent, for mixed-vendor networks. On Cisco devices it is off by default and turned on with <code>lldp run</code>.</p>

## Check it worked
<p><code>show interfaces description</code> lists every port with its status and label, so a wrong description stands out next to the CDP output. On ISP-PE, <code>show cdp neighbors</code> should no longer list EDGE once the holdtime has run out. Finally, ping ACC-B's management address from EDGE to prove the address you found is real.</p>

## @terms
- CDP :: Cisco Discovery Protocol: a Layer 2 protocol where Cisco devices advertise themselves to directly connected neighbors.
- LLDP :: Link Layer Discovery Protocol, IEEE 802.1AB: the vendor-neutral equivalent of CDP.
- Device ID :: The neighbor's hostname in the CDP table.
- Local interface :: Your own port, on which the neighbor was heard.
- Port ID :: The neighbor's port at the far end of the cable.
- Holdtime :: How long a device keeps a neighbor's information without a fresh advertisement. 180 seconds by default for CDP.
- Interface description :: A free-text label on an interface, shown in show commands. Does not affect traffic.

## @exam
- 2.3: configure and verify Layer 2 discovery protocols (Cisco Discovery Protocol and LLDP).
- CDP is Cisco proprietary and on by default; LLDP is an open standard and off by default on Cisco devices.
- CDP defaults: advertisements every 60 seconds, holdtime 180 seconds. LLDP: 30 and 120 seconds.
- <code>no cdp enable</code> is per interface; <code>no cdp run</code> is global. For LLDP: <code>lldp run</code>, and per interface <code>lldp transmit</code> and <code>lldp receive</code>.
- CDP sees only directly connected neighbors, and <code>detail</code> shows their IP addresses.

## @mistakes
- Swapping Local Intrfce and Port ID, so every description names the wrong end of the cable.
- Using <code>no cdp run</code> to hide the edge: it also blinds you on every internal link.
- Expecting a neighbor to vanish the moment CDP is disabled: the old entry stays until its holdtime expires.
- Expecting CDP to show devices two hops away. It shows only the next device on each cable.

## @quiz

### On EDGE, a CDP line reads: Device ID CORE, Local Intrfce Gig 0/0, Port ID Gig 0/2. What does it mean?
- [x] EDGE Gi0/0 connects to CORE Gi0/2
- EDGE Gi0/2 connects to CORE Gi0/0
- CORE is two hops away through Gi0/0
- CORE has IP address 0.0.0.2
> Local Intrfce is your own port and Port ID is the neighbor's. The description on EDGE G0/0 is therefore TO-CORE-Gi0/2.

### How do you stop EDGE advertising CDP to the ISP but keep it on the LAN?
- no cdp run
- [x] no cdp enable on the ISP-facing interface
- lldp run
- shutdown on the ISP-facing interface
> no cdp enable works per interface. no cdp run would turn CDP off everywhere, and shutdown would cut the internet link.

### Which statement about CDP is true?
- It needs IP addresses on both ends
- It shows every Cisco device in the network
- [x] It runs at Layer 2 and shows only directly connected neighbors
- It is an IEEE standard
> CDP is a Cisco Layer 2 protocol, so it needs no IP and only sees the next device. LLDP is the IEEE standard.

### Which command shows a neighbor's IP address?
- show cdp
- show cdp neighbors
- show interfaces description
- [x] show cdp neighbors detail
> The plain neighbors view has no addresses. The detail view adds IP address, platform and software version.

### An engineer needs neighbor discovery between a Cisco switch and another vendor's switch. What should they use?
- CDP, which every vendor supports
- [x] LLDP, enabled with lldp run
- STP BPDUs
- ARP
> LLDP is the vendor-neutral standard. On Cisco devices it is off by default and turned on with lldp run.

## @story
```json
[
 {
  "path": [
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "CDP: CORE",
  "t": "CORE introduces itself",
  "x": "CORE sends a CDP advertisement out of Gi0/2. EDGE records Device ID CORE, its own port Gi0/0 as Local Intrfce, and Gi0/2 as Port ID."
 },
 {
  "path": [
   "SW3",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "ACC-B ON FA0/8",
  "t": "An unexpected uplink",
  "x": "ACC-B advertises from its Gi0/1, and CORE hears it on Fa0/8. Without CDP, nobody would have looked for an uplink on a FastEthernet port."
 },
 {
  "path": [
   "SW2",
   "SW3"
  ],
  "cls": "req",
  "at": "SW3",
  "label": "CDP: ACC-A",
  "t": "The cross-link between access switches",
  "x": "ACC-A and ACC-B also hear each other, on their Gi0/1 and Gi0/2. Cross-links like this are easy to miss without discovery."
 },
 {
  "path": [
   "R1",
   "ISP"
  ],
  "cls": "req",
  "at": "ISP",
  "label": "MODEL, VERSION",
  "bad": 1,
  "t": "Leaking to the provider",
  "x": "EDGE also advertises out of G0/1, so ISP-PE learns EDGE's hostname, platform, software version and address. That is information an attacker could use."
 },
 {
  "path": [
   "R1",
   "ISP"
  ],
  "cls": "req",
  "at": "ISP",
  "label": "CDP OFF",
  "good": 1,
  "t": "No CDP on the edge port",
  "x": "With no cdp enable on G0/1, EDGE stops advertising there. After the 180-second holdtime, EDGE disappears from ISP-PE's neighbor table."
 },
 {
  "path": [
   "R1",
   "SW1",
   "SW3"
  ],
  "cls": "req",
  "at": "SW3",
  "label": "PING ACC-B",
  "good": 1,
  "t": "From discovery to reachability",
  "x": "show cdp neighbors detail on CORE gives ACC-B's management address. EDGE pings it through CORE."
 }
]
```
