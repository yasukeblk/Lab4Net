---
title: Wireless architectures and AP modes
name: How access points and controllers fit together
topic: true
ccna: 2.6, 2.7
mins: 9
---

## The problem: many APs to manage
<p>A home needs one access point. A hospital or campus needs hundreds. Each one needs the same SSIDs, the same security, sensible channels and power levels, and clients must roam between them without dropping a call. Configuring hundreds of APs one by one is slow and error-prone, and no single AP can see the whole picture of which channels its neighbours use. So Cisco offers several architectures that differ in where the brains live.</p>

## Autonomous and cloud-based APs
<p>An <b>autonomous AP</b> is self-contained. It is configured on its own (by its CLI or web page) and bridges wireless traffic straight onto the wired network. Each SSID maps to a VLAN, so an autonomous AP serving several SSIDs connects to a switch <b>trunk port</b>. It suits small sites, but every AP is a separate box to manage.</p><p>A <b>cloud-based AP</b>, such as Cisco Meraki, is managed from a dashboard on the internet. The AP downloads its settings from the cloud, but user traffic still goes from the AP onto the local network, not through the cloud.</p>

## Lightweight APs and the WLC
<p>In the <b>split-MAC</b> architecture the work is divided. A <b>lightweight AP</b> handles the real-time radio jobs: sending beacons, answering probes, acknowledging frames and encrypting traffic. A <b>wireless LAN controller (WLC)</b> handles the management jobs: authentication, association, roaming, security policy, QoS and choosing channels and power for every AP.</p><p>The AP and WLC talk over <b>CAPWAP</b> (Control and Provisioning of Wireless Access Points), which builds two tunnels between them:</p><ul><li><b>Control</b> tunnel on UDP 5246, always encrypted with DTLS.</li><li><b>Data</b> tunnel on UDP 5247, carrying client traffic to the WLC; encryption is optional.</li></ul><p>Because client traffic of every SSID travels inside the tunnel, the WLC is where it meets the wired VLANs.</p>

## Where the WLC sits
<p>Cisco describes four deployment models:</p><ol><li><b>Unified</b> (centralized): a hardware WLC in a central place such as the data centre, for large sites.</li><li><b>Cloud</b>: a WLC running as a virtual machine in a data centre or public cloud.</li><li><b>Embedded</b>: the WLC runs inside a switch, for smaller sites.</li><li><b>Mobility Express</b>: one AP also acts as the WLC for the others, for small branches.</li></ol>

## AP modes
<p>A lightweight AP can be put in a <b>mode</b> that sets its job:</p><ul><li><b>Local</b>: the default. Serves clients and tunnels their traffic to the WLC; briefly scans other channels when it can.</li><li><b>FlexConnect</b>: for branch offices over a WAN. It can switch client traffic onto the local network itself, and keep serving clients if the link to the WLC fails.</li><li><b>Monitor</b>: serves no clients; listens to find rogue APs, detect attacks and help locate devices.</li><li><b>Rogue detector</b>: radio off; watches the wired network for traffic from rogue devices.</li><li><b>Sniffer</b>: captures 802.11 frames and sends them to a computer running a tool such as Wireshark.</li><li><b>SE-Connect</b>: spectrum analysis, to find non-Wi-Fi interference.</li><li><b>Bridge / mesh</b>: links APs to each other over the air, where cabling is not possible.</li></ul>

## Cabling it up
<p>APs are usually powered over the network cable by <b>PoE</b> from the switch.</p><ul><li>A lightweight AP in <b>local mode</b> goes on an <b>access port</b>. It only needs one VLAN for its own address, because client traffic for every SSID rides inside CAPWAP.</li><li>An autonomous AP, or a FlexConnect AP switching several VLANs locally, goes on a <b>trunk port</b>.</li><li>A WLC connects to the switch with <b>trunk ports</b>, its <i>distribution system</i> ports, so it can put each WLAN on its VLAN. It also has a <b>service port</b> for out-of-band management, a console port and a redundancy port for a standby WLC.</li></ul><p>Several distribution ports can be bundled into one logical link with <b>LAG</b> (link aggregation). A Cisco WLC does not negotiate with LACP or PAgP, so the switch side must be a static EtherChannel: <code>channel-group 1 mode on</code>.</p>

## @terms
- Autonomous AP :: An AP configured and run on its own, bridging wireless traffic straight onto the wired network.
- Lightweight AP :: An AP that handles only real-time radio work and is managed by a WLC.
- WLC :: Wireless LAN controller: centrally manages lightweight APs, security, roaming and RF settings.
- Split-MAC :: The division of 802.11 work between a lightweight AP and a WLC.
- CAPWAP :: The tunnel protocol between AP and WLC: control on UDP 5246, data on UDP 5247.
- FlexConnect :: An AP mode that can switch traffic locally and survive loss of the WAN link to the WLC.
- LAG :: Bundling WLC distribution ports into one logical link; the switch uses a static EtherChannel.

## @exam
- 2.6: describe Cisco wireless architectures and AP modes. 2.7: describe physical infrastructure connections of WLAN components (AP, WLC, access/trunk ports, LAG).
- CAPWAP uses UDP 5246 for control (DTLS encrypted) and UDP 5247 for data.
- Local mode is the default; know what monitor, rogue detector, sniffer, SE-Connect, FlexConnect and bridge modes do.
- Local-mode AP: access port. Autonomous AP or locally switching FlexConnect AP: trunk port. WLC: trunk.
- WLC LAG supports only static EtherChannel (mode on), not LACP or PAgP.

## @mistakes
- Setting the switch side of a WLC LAG to LACP <code>mode active</code>: the WLC never negotiates, so the bundle does not come up.
- Putting a local-mode AP on a trunk and expecting each SSID on its own VLAN at the switch: client traffic is inside CAPWAP and is placed on VLANs at the WLC.
- Putting an autonomous AP with several SSIDs on an access port: only one VLAN reaches it, so clients on the other SSIDs get no addresses.
- Expecting a monitor-mode AP to serve clients: it only listens.

## @quiz

### Which UDP port carries CAPWAP control traffic?
- 5247
- [x] 5246
- 1812
- 161
> CAPWAP control is UDP 5246 and is always DTLS encrypted. 5247 is the data tunnel. 1812 is RADIUS and 161 is SNMP.

### A branch AP must keep serving clients if the WAN link to the central WLC fails. Which mode fits?
- Local
- Monitor
- Sniffer
- [x] FlexConnect
> FlexConnect can switch traffic locally and keep working without the WLC. A local-mode AP depends on its CAPWAP tunnel to the WLC.

### What kind of switch port does a lightweight AP in local mode normally connect to?
- [x] An access port
- A trunk port carrying every WLAN VLAN
- A routed port
- An EtherChannel with LACP
> All client traffic rides inside CAPWAP to the WLC, so the AP needs only one VLAN for itself. The WLC connects on trunks.

### Four WLC ports are bundled with LAG. How is the switch side configured?
- channel-group 1 mode active
- channel-group 1 mode desirable
- [x] channel-group 1 mode on
- channel-group 1 mode passive
> A Cisco WLC does not run LACP or PAgP, so only a static EtherChannel (mode on) matches it. Active and passive are LACP; desirable is PAgP.

### In split-MAC, which job stays on the lightweight AP rather than the WLC?
- [x] Sending beacons and acknowledging frames
- Client authentication
- Choosing channels for every AP
- Applying security policy
> Real-time radio work such as beacons, probe responses and acknowledgements must happen at the AP. Management decisions are made centrally on the WLC.
