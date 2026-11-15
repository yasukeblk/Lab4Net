---
title: Cables, interfaces and their faults
name: Which cable to use and how links go wrong
topic: true
ccna: 1.3, 1.4
mins: 9
---

## Copper or fiber
<p>Ethernet runs over two kinds of cable. <b>Copper</b> twisted-pair cable (UTP, unshielded twisted pair) is cheap and easy to fit with RJ45 plugs, but it is limited to <b>100 metres</b> and picks up electrical noise. <b>Fiber</b> carries light through glass. It goes much further, ignores electrical noise and handles high speeds, but costs more. Switches often take a small plug-in module, an <b>SFP</b> transceiver, so a port can be fitted for copper or for either kind of fiber.</p>

## Single-mode and multimode fiber
<ul><li><b>Multimode</b> fiber has a wider core (50 or 62.5 microns). Light bounces along many paths at once, which spreads the signal out, so it is used for shorter runs, such as inside a building or a data center. Its transmitters are cheaper (LEDs or low-cost lasers).</li><li><b>Single-mode</b> fiber has a very thin core (about 9 microns). Light from a laser travels one path, so the signal stays clean over many kilometres. It is used between buildings and across cities, and its optics cost more.</li></ul><p>The transceiver at each end must match the fiber type.</p>

## Copper cable categories and pinouts
<p>Higher categories carry higher speeds. Cat5e supports 1 Gbps, and Cat6a supports 10 Gbps for the full 100 m. 10 and 100 Mbps Ethernet use two of the four pairs; 1 Gbps and faster use all four.</p><p>A <b>straight-through</b> cable connects unlike devices (PC to switch). A <b>crossover</b> cable connects like devices (switch to switch). Most modern ports support <b>Auto-MDIX</b>, which detects the cable and swaps the pairs itself, so either cable usually works.</p>

## Shared media and point-to-point
<p>Old Ethernet used <b>shared media</b>: every device on a hub or coax cable shared one wire. Only one device could send at a time, so links ran <b>half duplex</b>. Devices listened before sending and, if two sent at once, a <b>collision</b> occurred and both waited a random time and tried again (CSMA/CD).</p><p>A switch gives each device its own <b>point-to-point</b> link. With only two devices on a cable, both can send and receive at once: <b>full duplex</b>. Collisions cannot happen on a working full-duplex link.</p>

## Speed and duplex mismatches
<p>Both ends of a link normally <b>autonegotiate</b> speed and duplex. Trouble starts when one end is set by hand and the other is left on auto. The auto end can still sense the speed, but it cannot learn the duplex, so for 10 or 100 Mbps it falls back to half duplex.</p><p>The result is a <b>duplex mismatch</b>: the link is up, pings work, but it is slow. The half-duplex end sees <b>late collisions</b> (collisions after the first 64 bytes of a frame), and the full-duplex end sees <b>CRC errors</b> and runts. A <b>speed mismatch</b> is simpler: the link does not come up at all. The fix is to set both ends the same way, ideally both on auto.</p>

## Reading the counters
<p><code>show interfaces</code> shows the speed, duplex and error counters. <code>show interfaces status</code> gives one line per port: connected, notconnect or err-disabled, with VLAN, duplex and speed.</p><ul><li><b>Runts</b>: frames shorter than 64 bytes.</li><li><b>Giants</b>: frames larger than the maximum size.</li><li><b>CRC</b>: the frame check sequence failed, so the frame was damaged. Think bad cable, noise or duplex mismatch.</li><li><b>Input errors</b>: a total that includes runts, giants and CRC errors.</li><li><b>Collisions</b> and <b>late collisions</b>: normal in small numbers on half duplex, a warning sign everywhere else.</li></ul><p>The first line of <code>show interfaces</code> gives two states: the physical line, then the line protocol. <b>up/up</b> is working. <b>administratively down</b> means someone typed <code>shutdown</code>. <b>down/down</b> usually means no cable, a dead far end or a speed mismatch. A port shown as <b>err-disabled</b> was shut by the switch itself, for example by port security, and needs <code>shutdown</code> then <code>no shutdown</code> once the cause is fixed.</p>

## @terms
- UTP :: Unshielded twisted-pair copper cable, limited to 100 metres for Ethernet.
- Multimode fiber :: Fiber with a wide core where light takes many paths; used for shorter distances.
- Single-mode fiber :: Fiber with a thin core and a laser light source; used for long distances.
- SFP :: A small plug-in transceiver that sets what kind of cable a switch port takes.
- Auto-MDIX :: A port feature that detects the cable type and swaps transmit and receive pairs automatically.
- Full duplex :: Sending and receiving at the same time on a point-to-point link, with no collisions.
- Late collision :: A collision detected after the first 64 bytes of a frame; a classic sign of a duplex mismatch.
- CRC error :: A received frame whose check value does not match, meaning the frame was damaged.

## @exam
- 1.3: compare physical interface and cabling types (single-mode fiber, multimode fiber, copper; shared media and point-to-point). 1.4: identify interface and cable issues (collisions, errors, mismatched duplex and/or speed).
- Single-mode: thin core, laser, long distance. Multimode: wider core, shorter distance, cheaper optics.
- UTP Ethernet runs reach 100 metres.
- Duplex mismatch: link up but slow; late collisions on the half-duplex side, CRC errors on the full-duplex side.
- Speed mismatch keeps the link down.

## @mistakes
- Hard-coding speed and duplex on one end only: the other end falls back to half duplex and the link crawls.
- Fitting a multimode transceiver on a single-mode fiber run (or the reverse): the link stays down or flaps.
- Treating CRC errors as a software problem: they usually point at the cable, a connector or a duplex mismatch.
- Running copper past 100 metres: the link may come up but show errors or drop.

## @quiz

### Two buildings are 8 km apart. Which cable fits best?
- Cat6a UTP
- Multimode fiber
- [x] Single-mode fiber
- Cat5e with a crossover
> Single-mode fiber carries a laser signal for many kilometres. Copper stops at 100 m, and multimode is meant for shorter runs.

### One switch port is set to 100 Mbps full duplex; the PC is on auto. The link is up but slow. What will the PC side most likely use?
- [x] 100 Mbps half duplex
- 100 Mbps full duplex
- 1000 Mbps full duplex
- The link will be down
> The PC can sense the speed but cannot negotiate duplex with a hard-coded peer, so at 100 Mbps it falls back to half duplex: a duplex mismatch.

### On a duplex mismatch, which counter rises on the half-duplex end?
- Giants
- [x] Late collisions
- Output drops only
- Nothing; the counters stay at zero
> The half-duplex end thinks the other side is interrupting it mid-frame and logs late collisions. The full-duplex end logs CRC errors and runts.

### Why do collisions not happen on a switch port running full duplex?
- The switch buffers every frame for one second
- The cable is shielded
- Collisions are counted as CRC errors instead
- [x] The link has only two devices, each with its own transmit and receive path
> A point-to-point link gives each direction its own path, so both ends can send at once without clashing.
