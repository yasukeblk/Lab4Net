---
title: DHCP server and relay
name: How devices get their addresses
mins: 8
---

## The problem DHCP solves
<p>Every device needs four settings before it can talk beyond itself: an <b>IP address</b>, a <b>subnet mask</b>, a <b>default gateway</b> (the router that leads off its subnet) and a <b>DNS server</b> (which turns names like example.com into addresses).</p><p>Typing those by hand on every laptop, phone and printer is slow, and one typo or one address used twice breaks a device. <b>DHCP</b> (Dynamic Host Configuration Protocol) hands them out automatically. In this lab R1 is the DHCP server.</p>

## Pools: one per subnet
<p>A <b>DHCP pool</b> (Windows servers call it a <i>scope</i>) is the server's settings for one subnet. It says which network to hand addresses from, and which options to give clients with them: at least <code>default-router</code> (the gateway) and <code>dns-server</code>.</p><p>R1 serves two subnets, so it needs two pools: <code>LAN10</code> for 192.168.10.0/24 and <code>LAN20</code> for 192.168.20.0/24. When a request arrives, the server uses the pool whose network contains the address of the interface the request came in on. That is how one server serves many subnets without mixing them up.</p>

## Leases and exclusions
<p>An address is not given away for ever. It is <b>leased</b> for a set time (one day by default on a Cisco router). About halfway through, the client asks its server to renew. If a device leaves and stops renewing, the address returns to the pool. The server records who has which address in its <b>binding table</b>.</p><p>Some addresses are set by hand: router interfaces, switches, servers and printers. <code>ip dhcp excluded-address</code> keeps them out of the pool, so the server never leases one of them to someone else and causes a duplicate. Here .1 to .10 in each LAN are kept for that.</p>

## DORA: the four messages
<p>Getting an address takes four messages, remembered as <b>DORA</b>. Use <b>See it happen</b> below to watch them cross this lab's map.</p><ol><li><b>Discover</b>: the client has no address and does not know where the server is, so it broadcasts to everyone: from 0.0.0.0 to 255.255.255.255, UDP port 68 to port 67.</li><li><b>Offer</b>: a server answers with an address it is willing to lease, plus the options.</li><li><b>Request</b>: the client asks for that address. This is broadcast too, so any other server that made an offer knows it was not chosen.</li><li><b>Acknowledge</b>: the server confirms. The lease starts and the client configures itself.</li></ol>

## Remote subnets need a relay
<p>Routers do not forward broadcasts, so PC3's Discover reaches R2 and goes no further. R1 never hears it.</p><p><code>ip helper-address 10.0.0.1</code> on R2 fixes that. It goes on the interface that <b>receives the client broadcasts</b>: R2 G0/1, facing PC3. R2 then <b>relays</b> each DHCP broadcast to R1 as a normal unicast packet, and writes its own interface address (192.168.20.1) into the message. That address, called the <i>giaddr</i>, tells R1 which pool to use: LAN20.</p>

## Check it worked
<p>On the server: <code>show ip dhcp binding</code> lists every lease (address, client, expiry). <code>show ip dhcp pool</code> shows each pool and how many addresses are in use. On a PC: <code>ipconfig /renew</code> asks again, and <code>ipconfig</code> shows the result. An address starting 169.254 means no server answered and the PC gave itself a placeholder that cannot reach other networks.</p>

## @terms
- DHCP pool (scope) :: The server's settings for one subnet: the network to lease from, plus options such as gateway and DNS.
- Lease :: An address lent to a client for a set time. Renewed at about half the time.
- Excluded address :: An address the server will never lease, because it is set by hand on some device.
- Binding :: The server's record that a client has a particular address.
- Default router (option 3) :: The gateway address handed to clients.
- DNS server (option 6) :: The name server address handed to clients.
- DHCP relay / helper address :: A router setting that forwards DHCP broadcasts from its LAN to a server elsewhere as unicast.
- APIPA (169.254.x.x) :: The address a Windows client gives itself when no DHCP server answers.

## @exam
- 4.3: explain the role of DHCP and DNS in the network. 4.6: configure and verify a DHCP client and relay.
- Know DORA in order, and that Discover and Request are broadcasts.
- Ports: the server listens on UDP 67, the client on UDP 68.
- The helper address goes on the interface facing the clients, not the one facing the server.
- <code>ip address dhcp</code> makes a router interface a DHCP client (common on ISP links).

## @mistakes
- Helper address on the wrong interface: the broadcast never reaches the interface that would relay it.
- Pool without <code>default-router</code>: clients get an address but cannot leave their own subnet.
- Pool network that does not match the subnet: the server has no pool for requests from that LAN, so nobody gets an address.
- No exclusions: a client can be leased the same address as a printer or server.

## @quiz

### A PC has just been plugged in and has no address. What is the first DHCP message it sends, and how?
- [x] A Discover, broadcast to every device on the LAN
- A Request, sent straight to the DHCP server
- An Offer, broadcast to every device on the LAN
- A Discover, sent to its default gateway
> It has no address and does not know the server or the gateway yet, so the only thing it can do is broadcast a Discover.

### PC3 is on R2's LAN and the DHCP server is R1. Where does <code>ip helper-address 10.0.0.1</code> go?
- [x] On R2 G0/1, the interface facing PC3
- On R2 G0/0, the interface facing R1
- On R1 G0/1, facing R2
- On PC3
> The relay has to be on the interface that receives the client's broadcast. That is the LAN interface, G0/1.

### Clients get addresses but cannot reach anything outside their own subnet. What is the pool most likely missing?
- [x] default-router
- dns-server
- network
- lease
> Without default-router the clients have no gateway, so they can only talk inside their own subnet. A missing dns-server would break names, not addresses.

### What does <code>ip dhcp excluded-address 192.168.10.1 192.168.10.10</code> do?
- [x] Stops the server leasing those addresses, so they can be set by hand
- Blocks DHCP requests from those hosts
- Reserves them for particular MAC addresses
- Makes them the pool's gateways
> Exclusions keep hand-set addresses (gateway, switches, servers) out of the pool so no client gets a duplicate.

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
  "label": "DISCOVER",
  "t": "Discover",
  "x": "PC1 has no address, so it broadcasts: \"Is there a DHCP server out there?\" SW1 floods the broadcast and it reaches R1."
 },
 {
  "path": [
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "OFFER .11",
  "t": "Offer",
  "x": "R1 picks the LAN10 pool, because the request arrived on G0/0 in 192.168.10.0/24. It skips the excluded .1 to .10 and offers 192.168.10.11, with gateway 192.168.10.1 and DNS 8.8.8.8."
 },
 {
  "path": [
   "PC1",
   "SW1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "REQUEST",
  "t": "Request",
  "x": "PC1 broadcasts again: \"I would like 192.168.10.11, from R1.\" Broadcasting tells any other server that its offer was turned down."
 },
 {
  "path": [
   "R1",
   "SW1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "ACK",
  "good": 1,
  "t": "Acknowledge",
  "x": "R1 confirms and records the binding. PC1 configures the address, mask, gateway and DNS. The lease has started."
 },
 {
  "path": [
   "PC3",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "STOPS HERE",
  "bad": 1,
  "t": "Remote subnet, no relay",
  "x": "PC3 broadcasts a Discover too, but routers do not forward broadcasts. Without a helper address it stops at R2, and PC3 ends up with a 169.254 address."
 },
 {
  "path": [
   "PC3",
   "R2",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "RELAYED",
  "t": "With ip helper-address",
  "x": "With <code>ip helper-address 10.0.0.1</code> on G0/1, R2 relays the Discover to R1 as unicast and stamps it with 192.168.20.1. R1 reads that and chooses the LAN20 pool."
 },
 {
  "path": [
   "R1",
   "R2",
   "PC3"
  ],
  "cls": "rep",
  "at": "PC3",
  "label": "OFFER .11",
  "good": 1,
  "t": "The reply comes back through R2",
  "x": "R1 sends its Offer to R2, which passes it to PC3. Request and Acknowledge follow the same way. PC3 ends up with 192.168.20.11."
 }
]
```
