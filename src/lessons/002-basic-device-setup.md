---
title: Basic device setup
name: How to give a device a safe starting point
mins: 8
---

## Why a baseline matters
<p>A router or switch out of the box is called <i>Router</i> or <i>Switch</i>, has no passwords, and (on a router) every interface is shut down. Anyone who plugs a cable into the console port gets full control.</p><p>A <b>baseline</b> is the small set of settings every device gets before it does real work: a name, passwords, a warning banner, an address for management, and a saved configuration. In this lab R1 becomes HQ-R1 and SW1 becomes ACCESS-SW1.</p>

## Modes, and where the configuration lives
<p>The Cisco command line has levels. <b>User EXEC</b> (prompt <code>&gt;</code>) can only look at a few things. <code>enable</code> moves to <b>privileged EXEC</b> (<code>#</code>), which can see everything and reload the device. <code>configure terminal</code> enters <b>global configuration</b>, and from there you enter sub-modes for an interface or a line.</p><p>Every change goes into the <b>running-config</b>, held in RAM. The device boots from the <b>startup-config</b>, held in NVRAM (memory that survives power loss). Until you run <code>copy running-config startup-config</code>, a reload throws your work away.</p>

## Locking the doors
<ul><li><code>enable secret</code> protects privileged mode and stores the password as a hash. The older <code>enable password</code> is stored in clear text. If both exist, the secret is used.</li><li>The <b>console line</b> is the physical port. The <b>VTY lines</b> (virtual terminal, 0 to 4 here, so five sessions at once) are where Telnet and SSH sessions arrive. Each line needs a <code>password</code>, and <code>login</code> tells the line to actually ask for it.</li><li><code>banner motd</code> shows a message before the login prompt: the legal notice that access is restricted.</li><li><code>no ip domain-lookup</code> stops the router treating a typo as a hostname and stalling while it tries to resolve it.</li></ul>

## Addresses: router port versus switch
<p>A router interface is a Layer 3 port: it gets its own IP address. R1 G0/0 gets 192.168.1.1/24, which makes it the default gateway for PC1. Router interfaces start shut down, so <code>no shutdown</code> is required.</p><p>Switch ports are Layer 2: they forward frames and have no addresses. To manage SW1 over the network, you give an address to a virtual interface, the <b>SVI</b> (switch virtual interface) <code>interface vlan 1</code>, here 192.168.1.2/24, and bring it up. The switch does not route, so it also needs <code>ip default-gateway 192.168.1.1</code> to reply to anyone outside its own subnet.</p>

## Check it worked
<p><code>show ip interface brief</code> lists every interface with its address and two columns: Status (Layer 1) and Protocol (Layer 2). You want <b>up up</b>. <i>administratively down</i> means the interface is still shut down. <code>show running-config</code> shows what is active, and <code>show startup-config</code> shows what will survive a reload. Finally, a ping from PC1 to 192.168.1.1 and 192.168.1.2 proves the cabling, addressing and interfaces work end to end.</p>

## @terms
- Running-config :: The active configuration, held in RAM. Lost on reload unless saved.
- Startup-config :: The saved configuration in NVRAM that the device loads when it boots.
- Privileged EXEC :: The # mode, reached with enable, where everything can be viewed and changed.
- enable secret :: The password for privileged mode, stored as a hash.
- Console line :: The physical management port, used with a console cable.
- VTY lines :: Virtual terminal lines that accept remote Telnet or SSH sessions.
- SVI :: Switch virtual interface: a logical interface for a VLAN, used here to give the switch a management address.
- MOTD banner :: A message of the day shown before login, usually a legal warning.

## @exam
- 5.3: configure and verify device access control using local passwords. 1.6: configure and verify IPv4 addressing and subnetting.
- enable secret is hashed and overrides enable password. <code>service password-encryption</code> only applies weak, reversible encryption to the other passwords.
- A line password has no effect without <code>login</code> (or <code>login local</code> for usernames).
- A Layer 2 switch takes its management address on an SVI and needs <code>ip default-gateway</code>, not a routing table.
- Know the prompts: <code>&gt;</code>, <code>#</code>, <code>(config)#</code>, <code>(config-if)#</code>, <code>(config-line)#</code>.

## @mistakes
- Forgetting <code>no shutdown</code> on the router interface: <code>show ip interface brief</code> shows administratively down and nothing can ping it.
- Setting a line password without <code>login</code>: the console still opens with no prompt.
- No default gateway on the switch: it answers pings from its own subnet but not from anywhere else.
- Not saving: everything works until the next reload, then the device is back to factory settings.

## @quiz

### A router has both <code>enable password</code> and <code>enable secret</code> configured. Which one unlocks privileged mode?
- Either one works
- enable password, because it was configured first
- [x] enable secret
- Neither, until one is removed
> When both exist, IOS uses enable secret. It is also the one to use, because it is stored as a hash rather than clear text.

### You set <code>password conpass</code> under <code>line console 0</code> but forget <code>login</code>. What happens at the console?
- It asks for conpass
- [x] It opens with no password prompt
- It asks for the enable secret instead
- It refuses all access
> The password is stored but the line is never told to ask for it. login turns the check on.

### PC1 can ping SW1 at 192.168.1.2, but a PC in another subnet cannot. Routing on R1 is fine. What is SW1 most likely missing?
- A hostname
- An enable secret
- no shutdown on Fa0/1
- [x] ip default-gateway
> The switch receives the ping but has no gateway to send its reply through, so it can only answer hosts in its own subnet.

### After a power cut R1 is back to its factory settings. What was skipped?
- [x] copy running-config startup-config
- no ip domain-lookup
- banner motd
- line vty 0 4
> Changes live in RAM until saved to NVRAM. The startup-config is what the router loads at boot.

### <code>show ip interface brief</code> shows G0/0 as <i>administratively down</i>. What fixes it?
- Add an IP address
- Replace the cable
- [x] no shutdown on the interface
- Save the configuration
> Administratively down means someone (or the factory default) shut the interface. A cable fault would show down, not administratively down.

## @story
```json
[
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "ARP FOR .1",
  "t": "Finding the router",
  "x": "PC1 wants to ping 192.168.1.1, which is in its own subnet. It first broadcasts an ARP request asking which MAC address owns that IP. SW1 floods it and it reaches R1 G0/0."
 },
 {
  "path": [
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "ARP REPLY",
  "t": "R1 answers",
  "x": "R1 answers only because G0/0 has an address and is no longer shut down. PC1 now knows the MAC address to put on its frames."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "ECHO",
  "t": "Echo request",
  "x": "PC1 sends an ICMP echo request to 192.168.1.1. SW1 forwards it straight to the port where it learned R1."
 },
 {
  "path": [
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "ECHO REPLY",
  "good": 1,
  "t": "Echo reply",
  "x": "R1 replies. The ping proves Layers 1 to 3 work between PC1 and its default gateway."
 },
 {
  "path": [
   "PC1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "SVI ANSWERS",
  "good": 1,
  "t": "Pinging the switch",
  "x": "A ping to 192.168.1.2 is answered by the switch itself, through its VLAN 1 SVI. Without that address the switch forwards frames but cannot be reached for management."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "VTY PASSWORD?",
  "t": "Remote login",
  "x": "A remote session to R1 lands on a VTY line. R1 shows the MOTD banner and asks for the VTY password, because the line has <code>login</code>."
 }
]
```
