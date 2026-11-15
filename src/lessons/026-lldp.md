---
title: LLDP
name: How devices discover their neighbours
mins: 7
---

## The problem: what is on that port?
<p>A contractor plugged a Linux file server into SW1 and nobody wrote down where. A <b>Layer 2 discovery protocol</b> solves this: each device regularly tells the device on the other end of each cable its name, its port, what kind of device it is and how to reach it.</p><p>Cisco devices already run <b>CDP</b> (Cisco Discovery Protocol), on by default. But CDP is Cisco's own protocol. The Linux server does not speak it, so <code>show cdp neighbors</code> on SW1 shows R1 and SW2 and nothing on Fa0/5.</p>

## LLDP: the open standard
<p><b>LLDP</b> (Link Layer Discovery Protocol) is the IEEE 802.1AB standard, so any vendor can run it. The server runs an LLDP agent (lldpd). On Cisco routers and switches LLDP is <b>off by default</b>, so you must turn it on with the global command <code>lldp run</code>.</p><p>Like CDP, LLDP only reaches the directly connected device. A switch does not forward LLDP frames, so SW1 learns about R1, SW2 and the server, but never about PC1 behind SW2.</p>

## What an advertisement contains
<p>Each LLDP message is a set of fields called <b>TLVs</b> (type, length, value). The ones you will read most:</p><ul><li><b>System name</b>: what the device calls itself. Shown as Device ID.</li><li><b>Port ID</b>: its own port on the other end of the cable.</li><li><b>Capabilities</b>: R router, B bridge (switch), T telephone, W access point, S station (an end host).</li><li><b>System description</b> and <b>management address</b>: often the exact OS version and an IP address to reach it.</li></ul><p>LLDP sends every 30 seconds by default and neighbours keep the entry for 120 seconds (CDP: 60 and 180).</p>

## CDP and LLDP side by side
<ul><li><b>Owner</b>: CDP is Cisco proprietary; LLDP is an IEEE standard.</li><li><b>Default on Cisco</b>: CDP on; LLDP off.</li><li><b>Turn on globally</b>: <code>cdp run</code>; <code>lldp run</code>.</li><li><b>Per interface</b>: <code>cdp enable</code>; <code>lldp transmit</code> and <code>lldp receive</code>, set separately.</li><li><b>Timers</b>: CDP 60 seconds and hold 180; LLDP 30 seconds and hold 120.</li></ul><p>Both can run at the same time. Many networks keep CDP for Cisco gear and add LLDP for everything else, which is what this lab does on SW1, SW2 and R1.</p>

## Transmit and receive are separate
<p>Each interface can send and listen independently. <code>no lldp transmit</code> on Fa0/5 stops SW1 telling the contractor's server anything about your switch, while the default <code>lldp receive</code> keeps listening, so the server stays in your neighbour table.</p><p>This matters because discovery data is useful to attackers too: model, software version and addresses. A common practice is to turn discovery off on ports facing devices you do not manage. <code>no lldp run</code> would do far more: it stops LLDP on every port.</p>

## Check it worked
<p><code>show lldp neighbors</code> lists Device ID, local interface, hold time, capabilities and port ID. On SW1 you find the server on Fa0/5 with capability S. <code>show lldp neighbors detail</code> adds the system description and management address, which you can ping from R1. <code>show lldp interface</code> shows Tx and Rx state per port, and <code>show lldp</code> shows the timers.</p>

## @terms
- CDP :: Cisco Discovery Protocol. Cisco-only, enabled by default on Cisco devices.
- LLDP :: Link Layer Discovery Protocol, IEEE 802.1AB. Vendor-neutral, disabled by default on Cisco routers and switches.
- TLV :: Type, length, value: one field of information in an LLDP message.
- Device ID :: The name a neighbour calls itself, from its system name.
- Capability S :: Station: the neighbour is an end host, not a network device.
- Hold time :: How long a neighbour entry is kept without a fresh advertisement. LLDP default 120 seconds.
- Management address :: An address the neighbour advertises for reaching and managing it.

## @exam
- 2.3: configure and verify Layer 2 discovery protocols (Cisco Discovery Protocol and LLDP).
- CDP is Cisco proprietary and on by default; LLDP is IEEE 802.1AB and off by default on Cisco.
- Global commands: <code>cdp run</code> and <code>lldp run</code>. Per interface: <code>cdp enable</code>, <code>lldp transmit</code>, <code>lldp receive</code>.
- LLDP timers: 30 seconds between advertisements, 120 seconds hold time. CDP: 60 and 180.
- Both only see directly connected neighbours.

## @mistakes
- Expecting LLDP to work without <code>lldp run</code>: the neighbour table stays empty.
- Running LLDP on one end only: the other end never advertises, so you see it from one side only.
- Using <code>no lldp run</code> to hide from one port: the switch goes blind on every port.
- Turning off receive instead of transmit: you stop learning about the server while still telling it about you.
- Looking for a host two switches away in the LLDP table: discovery is one hop only.

## @quiz

### A Linux server is plugged into a Cisco switch. <code>show cdp neighbors</code> does not list it. Why?
- The server is on the wrong VLAN
- [x] CDP is Cisco proprietary and the server does not run it
- CDP only lists routers
- The hold time has expired
> CDP is Cisco's own protocol. Non-Cisco devices use LLDP, which must be enabled on the switch.

### What is the default state of LLDP on a Cisco switch?
- Enabled globally, disabled per port
- Enabled on trunk ports only
- [x] Disabled; enable it with lldp run
- Enabled on all ports
> LLDP is off by default on Cisco routers and switches. CDP is the one that is on by default.

### You want SW1 to keep learning about the server on Fa0/5 but stop telling it anything. What do you configure?
- [x] no lldp transmit on Fa0/5
- no lldp receive on Fa0/5
- no lldp run
- no cdp enable on Fa0/5
> Transmit and receive are separate. Turning off transmit hides the switch; receive stays on. no lldp run would stop LLDP on every port.

### What does capability code S mean in <code>show lldp neighbors</code>?
- Switch
- Server only
- Secure port
- [x] Station, an end host
> S is station. A switch is shown as B, for bridge.

## @story
```json
[
 {
  "path": [
   "SW1",
   "SW2"
  ],
  "cls": "req",
  "at": "SW2",
  "label": "CDP OK",
  "t": "CDP sees Cisco devices",
  "x": "SW1 and SW2 exchange CDP every 60 seconds, so each knows the other. R1 shows up the same way."
 },
 {
  "path": [
   "SRV1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "IGNORED",
  "bad": 1,
  "t": "The server speaks LLDP only",
  "x": "The Linux server sends LLDP frames, but LLDP is off on SW1, so they are dropped and Fa0/5 shows no neighbour."
 },
 {
  "path": [
   "SRV1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "SRV1 FOUND",
  "good": 1,
  "t": "lldp run",
  "x": "With LLDP on, SW1 reads the server's advertisement: its system name, capability S, its OS description and a management address."
 },
 {
  "path": [
   "R1",
   "SW1",
   "SRV1"
  ],
  "cls": "req",
  "at": "SRV1",
  "label": "PING MGMT",
  "good": 1,
  "t": "Use what you learned",
  "x": "R1 pings the management address read from <code>show lldp neighbors detail</code>. Now you know where the box is and how to reach it."
 },
 {
  "path": [
   "SW1",
   "SRV1"
  ],
  "cls": "req",
  "at": "SRV1",
  "label": "TX OFF",
  "bad": 1,
  "t": "Stop advertising to it",
  "x": "<code>no lldp transmit</code> on Fa0/5 means SW1 tells the contractor's server nothing about itself."
 },
 {
  "path": [
   "SRV1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "STILL HEARD",
  "good": 1,
  "t": "Receive is still on",
  "x": "The server keeps advertising and SW1 keeps listening, so the entry stays in the neighbour table."
 }
]
```
