---
title: Switch management access
name: How to reach and manage a switch remotely
mins: 8
---

## Switching needs no IP address
<p>A Layer 2 switch forwards frames using MAC addresses. It can do that all day with no IP address at all, which is why SW1 already passes PC1's traffic.</p><p>Managing it is different. The <b>console</b> port works with no address, but only for someone standing next to the switch with a cable. To log in from ADMIN, SSH needs an IP address on the switch, a way for replies to get back to another subnet, and a secure login. This lab adds all three.</p>

## The SVI: the switch's own address
<p>A switch's physical ports have no IP addresses. Instead you give it a <b>switch virtual interface</b> (SVI): <code>interface vlan 99</code>. The SVI is the switch itself, as a host, inside VLAN 99.</p><p>Using a dedicated <b>management VLAN</b> keeps the login prompt away from user VLANs. PC1 in VLAN 10 cannot reach 192.168.99.2 unless the router lets it.</p><p>An SVI is only <b>up/up</b> when the VLAN exists on the switch and at least one port carrying that VLAN is up and forwarding. Here that port is Gi0/1, the trunk to R1, where R1 subinterface G0/0.99 is 192.168.99.1.</p>

## Why the switch needs a default gateway
<p>Once the SVI is up, ADMIN's ping still fails. The request reaches the switch, but the reply is for 192.168.50.10, which is not in 192.168.99.0/24. A Layer 2 switch does not route, so it does not know where to send it.</p><p>The fix is the same as on a PC: <code>ip default-gateway 192.168.99.1</code>. Traffic for any other subnet now goes to R1, which routes it to the admin LAN. This command is for switches that are not routing. A Layer 3 switch with <code>ip routing</code> enabled uses a default route instead.</p>

## SSH instead of Telnet
<p>The <b>VTY lines</b> are the switch's virtual terminals for remote logins. <b>Telnet</b> (TCP port 23) sends everything, including the password, in clear text. <b>SSH</b> (TCP port 22) encrypts the session. Enabling SSH takes a few pieces:</p><ol><li>A hostname other than the default, and a domain name (<code>lab.local</code>). The key is named hostname.domain.</li><li>An RSA key pair: <code>crypto key generate rsa</code> with a 2048-bit modulus. SSH version 2 needs at least 768 bits.</li><li>A local user, <code>netadmin</code>, stored with <code>secret</code> so it is hashed.</li><li>On <code>line vty 0 4</code>: <code>login local</code> to ask for that username and password, and <code>transport input ssh</code> to refuse Telnet.</li></ol>

## Check it worked
<p><code>show ip interface brief</code> should show Vlan99 up/up with 192.168.99.2. <code>show ip ssh</code> shows whether SSH is enabled and which version. The real test is from ADMIN: <code>ssh -l netadmin 192.168.99.2</code> works, which proves the address, the gateway and the login, and Telnet to the same address is refused.</p>

## @terms
- SVI :: Switch virtual interface: a Layer 3 interface for a VLAN, such as interface vlan 99. Gives the switch an IP address.
- Management VLAN :: A VLAN set aside for reaching network devices, kept separate from user traffic.
- Default gateway (on a switch) :: ip default-gateway: where a non-routing switch sends traffic for other subnets.
- VTY lines :: Virtual terminal lines that accept remote Telnet or SSH sessions. Lines 0 to 4 are the usual first five.
- SSH :: Secure Shell: encrypted remote login on TCP port 22.
- Telnet :: Unencrypted remote login on TCP port 23. Sends passwords in clear text.
- RSA key pair :: The public and private keys SSH uses to set up encryption. Generated with crypto key generate rsa.
- login local :: Makes a line ask for a username and password from the device's own user list.

## @exam
- 2.8: describe network device management access (Telnet, SSH, console). 4.8: configure network devices for remote access using SSH. 1.6: IPv4 addressing.
- A switch is managed through an SVI, and it needs <code>ip default-gateway</code> to answer other subnets.
- SSH prerequisites: hostname, domain name, RSA key, local user, VTY <code>login local</code>, <code>transport input ssh</code>.
- SSH uses TCP 22, Telnet TCP 23. Use <code>ip ssh version 2</code> to force version 2.
- An SVI needs its VLAN to exist and an active port in that VLAN to be up/up.

## @mistakes
- No default gateway: the switch can be pinged from its own subnet but not from anywhere else.
- SVI left shut down, or the VLAN never created: the interface shows down and nothing answers.
- <code>login</code> instead of <code>login local</code>: the line asks for a line password, not the user accounts, and SSH logins fail.
- Generating the RSA key before setting the domain name: IOS refuses, because the key is named after hostname and domain.

## @quiz

### ADMIN on 192.168.50.0/24 cannot ping SW1 at 192.168.99.2, but R1 can. The SVI is up/up. What is most likely missing on SW1?
- A trunk to R1
- transport input ssh
- ip domain-name
- [x] ip default-gateway 192.168.99.1
> R1 is on the switch's own subnet, so it works. ADMIN is on another subnet, and the switch needs a gateway to send the reply there.

### Which command gives a Layer 2 switch an IP address for management?
- [x] ip address on interface vlan 99
- ip address on interface FastEthernet0/1
- ip default-gateway 192.168.99.2
- switchport access vlan 99
> Physical switch ports have no IP addresses. The SVI, interface vlan 99, is the switch's own Layer 3 interface.

### Which is NOT required before SSH logins work on a switch?
- An RSA key pair
- A domain name
- [x] An enable password
- A local username used with login local
> SSH needs the key, and the key needs hostname and domain. The VTY login uses the local user. An enable secret is good practice but not needed for the SSH session itself.

### What does <code>transport input ssh</code> do on the VTY lines?
- Encrypts the console port
- [x] Allows only SSH for remote sessions, refusing Telnet
- Generates the RSA key
- Forces SSH version 2
> It limits which protocols may open a VTY session. Version 2 is forced with <code>ip ssh version 2</code>.

## @story
```json
[
 {
  "path": [
   "ADMIN",
   "R1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "NO ADDRESS",
  "bad": 1,
  "t": "Nothing to answer",
  "x": "ADMIN pings 192.168.99.2. R1 routes the ping into VLAN 99, but SW1 has no address there yet, so nothing answers."
 },
 {
  "path": [
   "ADMIN",
   "R1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "SVI VLAN 99",
  "t": "The SVI receives the ping",
  "x": "With interface vlan 99 up at 192.168.99.2, the ping arrives at the switch itself. R1 G0/0.99 tagged it for VLAN 99 on the trunk."
 },
 {
  "path": [
   "SW1",
   "R1"
  ],
  "cls": "rep",
  "at": "SW1",
  "label": "NO GATEWAY",
  "bad": 1,
  "t": "The reply has nowhere to go",
  "x": "The reply is for 192.168.50.10, outside 192.168.99.0/24. The switch does not route, and with no default gateway it cannot send the reply."
 },
 {
  "path": [
   "SW1",
   "R1",
   "ADMIN"
  ],
  "cls": "rep",
  "at": "ADMIN",
  "label": "REPLY",
  "good": 1,
  "t": "Default gateway set",
  "x": "With ip default-gateway 192.168.99.1, SW1 sends the reply to R1, which routes it to the admin LAN. The ping works."
 },
 {
  "path": [
   "ADMIN",
   "R1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "TELNET REFUSED",
  "bad": 1,
  "t": "Telnet is closed",
  "x": "ADMIN tries Telnet on TCP 23. transport input ssh on the VTY lines refuses it, so no password crosses the network in clear text."
 },
 {
  "path": [
   "ADMIN",
   "R1",
   "SW1"
  ],
  "cls": "req",
  "at": "SW1",
  "label": "SSH LOGIN",
  "good": 1,
  "t": "SSH works",
  "x": "ADMIN connects with ssh -l netadmin. The session is encrypted with SW1's RSA key, and login local checks the netadmin account."
 }
]
```
