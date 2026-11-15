---
title: Protecting the spanning tree
name: How to keep spanning tree stable
topic: true
ccna: 2.5
mins: 9
---

## What can go wrong
<p>Spanning tree keeps a switched network free of loops by electing a root bridge and blocking spare paths. Three things can upset it:</p><ul><li>Someone plugs a <b>switch into an access port</b>, which adds a path spanning tree did not plan for.</li><li>A new or misconfigured switch claims to be the <b>root bridge</b> and drags traffic through the wrong place.</li><li>A link goes <b>one-way</b>: a blocked port stops hearing BPDUs, decides the path is clear, and starts forwarding into a loop.</li></ul><p>Cisco switches have a feature for each. Objective 2.5 names all of them.</p>

## Recap: Rapid PVST+ roles and states
<p>Rapid PVST+ runs one rapid spanning tree per VLAN. A port has a <b>role</b>:</p><ul><li><b>Root</b>: this switch's best path to the root bridge.</li><li><b>Designated</b>: the port that forwards for a segment.</li><li><b>Alternate</b>: a blocked backup for the root port.</li><li><b>Backup</b>: a blocked backup for a designated port on the same segment.</li></ul><p>And a <b>state</b>: <b>discarding</b>, <b>learning</b> or <b>forwarding</b>. Root and designated ports end up forwarding. Alternate and backup ports stay discarding.</p>

## PortFast and BPDU Guard
<p><b>PortFast</b> is for ports that connect to end devices. The port goes straight to forwarding when it comes up, so a PC does not wait while spanning tree checks for a loop. PortFast does <b>not</b> turn spanning tree off on the port.</p><p><b>BPDU Guard</b> protects those ports. A PC never sends BPDUs, so a BPDU arriving on an access port means a switch has been connected. BPDU Guard puts the port in <b>err-disabled</b> and it stays down until someone fixes it.</p><ul><li>Per port: <code>spanning-tree portfast</code> and <code>spanning-tree bpduguard enable</code>.</li><li>For every access port at once: <code>spanning-tree portfast default</code> and <code>spanning-tree portfast bpduguard default</code>.</li></ul><p>To recover a port, remove the cause, then <code>shutdown</code> and <code>no shutdown</code>.</p>

## BPDU Filter
<p><b>BPDU Filter</b> stops a port sending BPDUs. It behaves differently depending on where it is set, and the exam likes the difference.</p><ul><li><b>Globally</b>, with <code>spanning-tree portfast bpdufilter default</code>: applies to PortFast ports. They stop sending BPDUs. If one of them <b>receives</b> a BPDU, it gives up PortFast and the filter and becomes a normal spanning-tree port. This is fairly safe.</li><li><b>On an interface</b>, with <code>spanning-tree bpdufilter enable</code>: the port neither sends BPDUs nor listens to them. Spanning tree is in effect <b>off</b> on that port, and a loop there will not be caught.</li></ul>

## Root Guard
<p><b>Root Guard</b> goes on ports where the root bridge should never appear, such as ports that face access switches or another company.</p><p>If a <b>superior BPDU</b> arrives, one that claims a better root than the current one, the port is put in the <b>root-inconsistent</b> state and stops forwarding. The current root stays the root. When the superior BPDUs stop, the port recovers by itself.</p><p>Command: <code>spanning-tree guard root</code> on the interface.</p>

## Loop Guard
<p><b>Loop Guard</b> protects against one-way links. It watches ports that are supposed to receive BPDUs: root ports and alternate ports.</p><p>Normally, a blocked port that stops hearing BPDUs assumes the other side has gone and moves to forwarding. With Loop Guard it goes to the <b>loop-inconsistent</b> state and stays blocked. It recovers by itself when BPDUs return.</p><p>Commands: <code>spanning-tree guard loop</code> on an interface, or <code>spanning-tree loopguard default</code> for the whole switch. Root Guard and Loop Guard cannot both be active on the same port.</p>

## Checking
<ul><li><code>show spanning-tree vlan 10</code> shows each port's role and state. Guarded ports show <code>BKN*</code> with the reason <code>ROOT_Inc</code> or <code>LOOP_Inc</code>.</li><li><code>show spanning-tree inconsistentports</code> lists every port a guard has blocked.</li><li><code>show interfaces status err-disabled</code> lists ports shut by BPDU Guard.</li><li><code>show spanning-tree summary</code> shows which features are on by default.</li></ul>

## @terms
- PortFast :: Lets an edge port go straight to forwarding when it comes up.
- BPDU Guard :: Err-disables a port that receives a BPDU.
- BPDU Filter :: Stops a port sending BPDUs; on an interface it also ignores received ones.
- Root Guard :: Blocks a port that receives a superior BPDU, so the root bridge cannot move there.
- Loop Guard :: Keeps a port blocked if it stops receiving BPDUs, instead of letting it forward.
- Superior BPDU :: A BPDU advertising a better root bridge than the one currently known.
- Err-disabled :: A state in which the switch has shut a port because of a fault or violation.

## @exam
- 2.5: interpret basic operations of Rapid PVST+, including root port, root bridge, port states and roles, PortFast, root guard, loop guard, BPDU filter and BPDU guard.
- BPDU Guard err-disables the port and needs manual recovery. Root Guard and Loop Guard put the port in an inconsistent state and recover by themselves.
- Root Guard reacts to superior BPDUs arriving. Loop Guard reacts to BPDUs going missing.
- PortFast and BPDU Guard belong on access ports to end devices, never on links to other switches.
- Rapid PVST+ states: discarding, learning, forwarding.

## @mistakes
- Enabling PortFast on a link to another switch. The port forwards at once and can create a short loop.
- Using interface-level BPDU Filter to "tidy up" an access port. It switches spanning tree off there.
- Reading a root-inconsistent port as a cabling fault. It means another switch is claiming to be root.

## @quiz

### An access port with BPDU Guard receives a BPDU. What happens?
- The port becomes a root port
- [x] The port is put in err-disabled
- The BPDU is silently dropped
- The port goes to root-inconsistent
> BPDU Guard shuts the port by putting it in err-disabled. Dropping silently is what interface-level BPDU Filter does, and root-inconsistent is Root Guard.

### Which feature stops a newly connected switch with a lower priority from becoming the root bridge?
- Loop Guard
- PortFast
- BPDU Filter
- [x] Root Guard
> Root Guard blocks a port that hears a superior BPDU, so the root cannot move behind it.

### What does Loop Guard do when a blocked port stops receiving BPDUs?
- [x] Keeps it blocked in the loop-inconsistent state
- Moves it to forwarding
- Err-disables it
- Makes it a designated port
> Without Loop Guard the port would move to forwarding and could cause a loop. With it, the port stays blocked until BPDUs are heard again.

### What is the effect of spanning-tree bpdufilter enable on an interface?
- The port err-disables when a BPDU arrives
- The port sends BPDUs but ignores received ones
- [x] The port stops sending BPDUs and ignores received ones
- PortFast is enabled on the port
> At interface level the filter works in both directions, which in effect turns spanning tree off on that port.

### Which are the port states in Rapid PVST+?
- Blocking, listening, learning, forwarding
- [x] Discarding, learning, forwarding
- Disabled, blocking, forwarding
- Listening, learning, forwarding
> Rapid spanning tree has three states. Blocking and listening belong to the original 802.1D.
