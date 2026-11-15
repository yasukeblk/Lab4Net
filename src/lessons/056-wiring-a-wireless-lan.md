---
title: Wiring a wireless LAN
name: How an access point joins its controller
mins: 8
---

## Two ways to run Wi-Fi
<p>An <b>autonomous</b> access point is a complete Wi-Fi device: you configure each one by itself and it needs a trunk carrying every client VLAN. In a <b>controller-based</b> design the access points are <b>lightweight</b>: the wireless LAN controller (WLC) holds the configuration, and every AP tunnels its clients back to the controller. You build a WLAN once, on the controller, and every AP serves it. Harbor Street chose a controller, so the wiring in this lab is the controller-based kind.</p>

## CAPWAP: the tunnel between AP and controller
<p>A lightweight AP finds its controller, then opens two <b>CAPWAP</b> tunnels to it over the wired network: control on UDP 5246, data on UDP 5247. Control carries the AP's configuration, its radio settings and statistics. Data carries the wireless clients' frames. A client associated with AP1 does not enter the switch on AP1's port as a normal frame; it travels inside the data tunnel to the controller, which drops it into the VLAN mapped to that WLAN.</p><p>That is why the AP needs only one thing from the wire: an IP address in the management network and a path to the controller's management address. If UDP 5246 cannot get through, the AP never joins and no radio turns on.</p>

## Which port is which
<ul><li><b>The AP's port</b> is an access port in the management VLAN (VLAN 10 here). Client VLANs do not need to exist on it. PortFast suits it: a single device, no loop risk.</li><li><b>The controller's port</b> is a trunk, because the controller must place clients into VLAN 20 (staff) or VLAN 30 (guest). Its management interface can be tagged, or untagged as in this lab; untagged means it must be the trunk's native VLAN.</li><li><b>The router's port</b> is a trunk too, so the router can hold the gateway for every VLAN on one subinterface each.</li></ul><p>Larger controllers bundle several ports into a LAG (an EtherChannel) for bandwidth and redundancy; one trunk is enough here.</p>

## How the AP finds the controller
<p>In the real world the AP usually gets its address by DHCP in the management VLAN, and learns the controller's address from DHCP option 43, from a DNS name (cisco-capwap-controller), from a broadcast on its own subnet, or from an address saved earlier. In this lab the AP has a fixed address, so the join path is simply: AP1 to its gateway, AP1 to 10.10.10.2 on UDP 5246 and 5247. If the AP and controller are in different subnets, the router must route between them and nothing on the way may block those ports.</p>

## Managing the controller
<p>Administrators reach the controller's web page over HTTPS (TCP 443) and its command line over SSH (TCP 22) at the management address. That is where the WLANs are built: name (SSID), security such as WPA2 with a pre-shared key, and the interface (VLAN) each WLAN maps to. The exam expects you to recognise those GUI steps; here the admin PC in VLAN 10 proves it can open the page.</p>

## Check it worked
<p><code>show vlan brief</code> shows the three VLANs and Fa0/1 and Fa0/2 in VLAN 10. <code>show interfaces trunk</code> shows Gi0/1 with native VLAN 10 and Gi0/2 with native VLAN 1, both allowing 10, 20 and 30. From AP1, ping 10.10.10.1 and 10.10.10.2. From PC1, <code>telnet 10.10.10.2 443</code> opens: the controller's page is reachable.</p>

## @terms
- Lightweight access point :: An AP that takes its configuration from a controller and tunnels its clients to it.
- Wireless LAN controller (WLC) :: The device that configures and manages lightweight APs and places their clients into VLANs.
- CAPWAP :: The protocol between AP and controller: control on UDP 5246, data on UDP 5247.
- Management interface :: The controller's address used by APs to join and by admins to log in.
- Dynamic interface :: A controller interface mapped to a client VLAN; each WLAN is tied to one.
- Native VLAN :: The VLAN whose frames cross a trunk untagged.
- LAG :: A bundle of controller ports acting as one link, like an EtherChannel.

## @exam
- 1.1: network components, including access points and controllers. 2.7: AP and WLC physical connections: AP access port, WLC trunk, LAG. 2.8: AP and WLC management access (Telnet, SSH, HTTP, HTTPS, console, TACACS+/RADIUS).
- 5.10: configure a WLAN with WPA2 PSK in the controller GUI: WLAN name, security, interface mapping.
- A lightweight AP's switch port is an access port in the management VLAN; an autonomous AP needs a trunk.
- CAPWAP ports: 5246 control, 5247 data, both UDP.
- AP modes: local serves clients; monitor, sniffer and rogue detector do not.

## @mistakes
- Trunking the lightweight AP's port "to be safe": it works, but the AP uses only the native VLAN, and an untagged management VLAN mismatch leaves it unable to join.
- Forgetting the client VLANs on the controller trunk: APs join, clients associate, and then get no DHCP and no gateway.
- Blocking UDP 5246 or 5247 between AP and controller with an ACL: the AP shows as never joined with no obvious error on the switch.
- Putting the controller's untagged management interface on a trunk whose native VLAN is 1: the controller ends up in the wrong VLAN.

## @quiz

### Which switch port configuration does a lightweight access point need?
- A trunk carrying every client VLAN
- [x] An access port in the management VLAN
- A routed port
- An EtherChannel to the controller
> Its clients ride inside the CAPWAP tunnel, so the AP needs only the management VLAN. An autonomous AP would need the trunk.

### CAPWAP uses which ports?
- TCP 5246 and 5247
- [x] UDP 5246 (control) and 5247 (data)
- UDP 67 and 68
- TCP 443 and 22
> Both tunnels are UDP: 5246 carries control, 5247 carries client data. 443 and 22 are for managing the controller.

### The controller's management interface is untagged. What must be true of its switch trunk?
- [x] The native VLAN must be the management VLAN
- The trunk must allow only VLAN 1
- DTP must be enabled
- The port must be an access port
> Untagged frames on a trunk belong to the native VLAN, so the native VLAN must be the management VLAN or the controller lands in the wrong VLAN.

### An AP has an address and can ping the controller, but never joins. Which is the most likely cause?
- The AP port is in the wrong VLAN
- [x] UDP 5246 is blocked between them
- The controller trunk lacks VLAN 20
- The AP has no default gateway
> Ping proves addressing and routing. A blocked control port stops the join itself; a missing client VLAN would affect clients after the join.

### Where is a WLAN with WPA2 PSK created in a controller-based design?
- On each access point
- On the switch, per VLAN
- [x] In the controller's web interface
- On the router subinterface
> The controller holds the WLAN definitions (SSID, security, interface) and pushes them to every lightweight AP.

## @story
```json
[
 {
  "path": [
   "AP1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "VLAN 10",
  "t": "The access point on its access port",
  "x": "AP1 sends frames untagged. SW1 puts them in VLAN 10, the management VLAN, because Fa0/1 is an access port there."
 },
 {
  "path": [
   "AP1",
   "SW1",
   "WLC1"
  ],
  "cls": "req",
  "at": "WLC1",
  "label": "CAPWAP 5246",
  "t": "The join request",
  "x": "AP1 asks the controller to join on UDP 5246. The frame leaves SW1 on the Gi0/1 trunk untagged, because VLAN 10 is the native VLAN there, which is how the controller's untagged management interface expects it."
 },
 {
  "path": [
   "WLC1",
   "SW1",
   "AP1"
  ],
  "cls": "rep",
  "at": "AP1",
  "label": "JOIN RESPONSE",
  "t": "The controller answers",
  "x": "The controller accepts the AP and pushes its configuration down the control tunnel. Only now do the radios switch on."
 },
 {
  "path": [
   "AP1",
   "SW1",
   "WLC1"
  ],
  "cls": "req",
  "at": "WLC1",
  "label": "CLIENT DATA 5247",
  "t": "A wireless client's traffic",
  "x": "A staff laptop's frames travel inside the data tunnel to the controller, which places them in VLAN 20 on its trunk. The switch port of the AP never sees VLAN 20."
 },
 {
  "path": [
   "WLC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "VLAN 20 TAG",
  "t": "Out to the gateway",
  "x": "From the controller the frame crosses the trunk tagged 20 to R1's subinterface G0/0.20, the gateway for the staff WLAN."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "WLC1"
  ],
  "cls": "req",
  "at": "WLC1",
  "label": "HTTPS 443",
  "t": "The admin builds the WLAN",
  "x": "PC1 opens the controller's web page in VLAN 10. The SSID, WPA2 pre-shared key and the mapping to VLAN 20 are set there, not on the switch."
 }
]
```
