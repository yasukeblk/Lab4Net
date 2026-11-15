---
title: Port security
name: How a switch decides who may plug in
mins: 8
---

## The problem: any device can plug in
<p>A switch port forwards for whatever is connected to it. Anyone who unplugs a desk PC, or finds a live wall jack, gets onto the LAN. They could also flood the switch with fake source MAC addresses to fill its MAC address table.</p><p><b>Port security</b> limits which and how many <b>MAC addresses</b> (the hardware address of a network card) may send frames into a port. A frame from any other address is a <b>violation</b>, and the switch takes the action you chose.</p>

## How it works
<ol><li>You set a <b>maximum</b> number of secure MAC addresses per port. The default is 1.</li><li>The switch learns secure addresses, either typed in by hand or learned from the first frames it sees, up to the maximum.</li><li>A frame from a new address after the maximum is reached is a violation.</li></ol><p>Port security only works on a port fixed as access (or trunk). A port left in a dynamic mode, which could negotiate either way, refuses the command. That is why the lab starts with <code>switchport mode access</code>.</p>

## Sticky learning
<p>Typing every MAC address by hand is slow. <code>switchport port-security mac-address sticky</code> learns the addresses currently plugged in and writes them into the running configuration as if you had typed them. Save with <code>copy running-config startup-config</code> and they survive a reload. Without saving, they are lost when the switch restarts.</p>

## Three violation modes
<ul><li><b>shutdown</b> (the default): the port goes into the <b>err-disabled</b> state and stops all traffic, including the legitimate device. It stays down until an administrator runs <code>shutdown</code> then <code>no shutdown</code>, or automatic recovery is set up.</li><li><b>restrict</b>: frames from the unknown address are dropped, a log message is sent, and the violation counter goes up. The port stays up.</li><li><b>protect</b>: frames from the unknown address are dropped silently. No log, no counter.</li></ul>

## How it is configured here
<p>Fa0/1 has one PC, so it keeps the defaults: maximum 1, shutdown. Fa0/2 has a PC and an IP phone, so it allows a <b>maximum of 2</b> with violation <code>restrict</code>, so one wrong device does not take the whole desk offline. Both use sticky learning. The unused ports Fa0/3 to Fa0/8 are simply shut down: a port that is off cannot be used at all, which is the simplest security there is.</p>

## Check it worked
<p><code>show port-security</code> lists each secured port with its maximum, current count, violation count and action. <code>show port-security interface f0/2</code> gives the detail, including the last source address seen. <code>show running-config</code> shows the sticky addresses. A port in err-disabled shows in <code>show interfaces status</code>. Finally, ping PC2 from PC1 to show legitimate traffic still flows.</p>

## @terms
- Port security :: A switch feature that limits which and how many MAC addresses may use a port.
- Secure MAC address :: An address the port is allowed to accept, typed in or learned.
- Sticky learning :: Learning the connected MAC addresses and saving them into the running configuration.
- Violation :: A frame from a MAC address that is not allowed once the maximum is reached.
- err-disabled :: The state a port is put into by the shutdown violation mode. It passes no traffic until reset.
- restrict :: Violation mode that drops, logs and counts offending frames while keeping the port up.
- protect :: Violation mode that drops offending frames silently, with no log or counter.

## @exam
- 5.7: configure and verify Layer 2 security features (DHCP snooping, dynamic ARP inspection, and port security).
- Defaults: maximum 1 address, violation mode shutdown.
- Compare the modes: shutdown err-disables the port; restrict drops, logs and counts; protect drops silently.
- Sticky addresses go into the running configuration and must be saved to survive a reload.
- Recover an err-disabled port with <code>shutdown</code> then <code>no shutdown</code> on the interface.

## @mistakes
- Enabling port security on a port still in a dynamic mode: the command is rejected.
- Leaving maximum 1 on a desk with a PC and a phone: the second device causes a violation and, in shutdown mode, takes the port down.
- Forgetting to save after sticky learning: after a reload the switch learns whatever is plugged in first, which may not be the right device.
- Clearing the cause of a violation but not bouncing the port: it stays err-disabled until <code>shutdown</code> and <code>no shutdown</code>.

## @quiz

### A port is configured with <code>switchport port-security</code> and nothing else. A second MAC address appears. What happens?
- The frames are dropped silently
- The frames are dropped and logged, and the port stays up
- [x] The port goes into err-disabled
- The second address is learned and allowed
> The defaults are maximum 1 and violation shutdown, so the second address err-disables the port.

### Which violation mode drops the offending frames and logs them but keeps the port up?
- shutdown
- protect
- disable
- [x] restrict
> restrict drops, logs and increments the violation counter. protect also keeps the port up but drops silently, with no log or counter.

### Why does the lab set Fa0/1 and Fa0/2 to <code>switchport mode access</code> first?
- [x] Port security is refused on a port that could still negotiate its mode
- Access mode is needed for sticky learning to save
- It raises the maximum to 2
- It turns off CDP
> Port security needs a port fixed in access (or trunk) mode. A port in a dynamic mode rejects the command.

### After sticky learning, the switch reloads and the learned addresses are gone. Why?
- Sticky addresses age out after one hour
- [x] The running configuration was not saved to startup
- Sticky only works with violation protect
- The ports were shut down
> Sticky writes addresses into the running configuration. Like any change there, they must be saved with copy running-config startup-config to survive a reload.

### Fa0/1 is err-disabled. The wrong device has been removed. What brings it back?
- It recovers on its own after the device is removed
- <code>clear port-security</code> only
- [x] <code>shutdown</code> then <code>no shutdown</code> on the interface
- Reloading PC1
> An err-disabled port stays down until it is reset by hand (or automatic recovery is configured). Removing the cause is not enough.

## @story
```json
[
 {
  "path": [
   "PC1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "STICKY LEARN",
  "t": "SW1 learns PC1",
  "x": "PC1 sends its first frame into Fa0/1. Sticky learning records its MAC address as secure and writes it into the running configuration. Fa0/1 is now full at its maximum of 1."
 },
 {
  "path": [
   "PC2",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "2 OF 2",
  "t": "Fa0/2 learns two addresses",
  "x": "The PC and the IP phone on Fa0/2 both send frames. With maximum 2, both MAC addresses are learned as secure."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "PC2"
  ],
  "cls": "req",
  "at": "PC2",
  "label": "ALLOWED",
  "good": 1,
  "t": "Legitimate traffic flows",
  "x": "PC1 pings PC2. Both source addresses are secure on their ports, so SW1 forwards normally."
 },
 {
  "path": [
   "PC2",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "RESTRICT",
  "bad": 1,
  "t": "A third device on Fa0/2",
  "x": "Someone adds a laptop to the desk at Fa0/2. Its MAC address would be the third, so SW1 drops its frames, logs it and counts a violation. The PC and phone keep working."
 },
 {
  "path": [
   "PC1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "ERR-DISABLED",
  "bad": 1,
  "t": "A different device on Fa0/1",
  "x": "PC1 is unplugged and a laptop is plugged into the same jack. Its address is not the sticky one, so the default shutdown mode puts Fa0/1 into err-disabled and the port stops passing any traffic."
 },
 {
  "path": [
   "PC1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "RECOVERED",
  "good": 1,
  "t": "The admin brings it back",
  "x": "With PC1 back on the jack, an administrator runs shutdown and then no shutdown on Fa0/1. The port comes up and PC1 is accepted again."
 }
]
```
