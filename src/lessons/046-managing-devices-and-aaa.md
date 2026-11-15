---
title: Managing devices and AAA
name: How you reach devices and who is let in
topic: true
ccna: 2.8, 5.8
mins: 9
---

## The problem: getting in, safely
<p>Routers and switches need to be configured and checked, often from far away. Every way in is also a way in for an attacker, and a shared admin password tells you nothing about who used it. Good management access gives administrators a reliable path, keeps their passwords and commands private, and records who changed what.</p>

## The ways in
<ul><li><b>Console</b>: a cable plugged straight into the device's console port, usually at 9600 baud. It works with no network and no IP address, so it is the way to recover a device. It needs physical access.</li><li><b>Telnet</b> (TCP 23): remote CLI over the network. Everything, including the password, crosses the network in clear text. Avoid it.</li><li><b>SSH</b> (TCP 22): remote CLI, encrypted. The standard way in. It needs a hostname, a domain name, an RSA key pair (at least 768 bits for SSH version 2), a username, and <code>transport input ssh</code> with <code>login local</code> on the VTY lines.</li><li><b>HTTP</b> (TCP 80) and <b>HTTPS</b> (TCP 443): web management, enabled by <code>ip http server</code> and <code>ip http secure-server</code>. Only HTTPS is encrypted.</li><li><b>Cloud managed</b>: devices such as Meraki connect out to a cloud dashboard, and administrators manage them through a browser.</li></ul><p><b>In-band</b> management uses the same network as user traffic. <b>Out-of-band</b> management uses a separate path, such as a console server or a dedicated management network, so the device can still be reached when the main network is broken.</p>

## AAA: three questions
<p><b>AAA</b> answers three separate questions:</p><ol><li><b>Authentication</b>: who are you? A username and password, a certificate or a token.</li><li><b>Authorization</b>: what may you do? For example, read-only access, or only certain commands.</li><li><b>Accounting</b>: what did you do? A record of logins and commands, for audits and troubleshooting.</li></ol><p>Local usernames on each device work for a few devices, but every device has its own list to keep up to date. A central AAA server, such as Cisco ISE, holds one set of accounts for all of them, so removing a leaver is one change. It can also give different people different rights: a help desk engineer might be allowed <code>show</code> commands only, while a senior engineer may change the configuration.</p>

## TACACS+ and RADIUS
<p>Devices talk to the AAA server with one of two protocols:</p><ul><li><b>TACACS+</b>: Cisco-developed, uses <b>TCP 49</b>, encrypts the <b>whole</b> message body, and handles authentication, authorization and accounting <b>separately</b>. That allows per-command authorization, which makes it the usual choice for administrators logging in to network devices.</li><li><b>RADIUS</b>: an open standard, uses <b>UDP 1812</b> for authentication and <b>UDP 1813</b> for accounting (older servers use 1645 and 1646), encrypts <b>only the password</b>, and combines authentication and authorization. It is the usual choice for network access: 802.1X on switch ports and Wi-Fi, and VPN users.</li></ul>

## How it is configured
<p><code>aaa new-model</code> switches on AAA. From then on, logins follow <b>method lists</b>, ordered lists of where to check credentials. The server is defined by name, for example <code>tacacs server ISE1</code> with its <code>address ipv4</code> and shared <code>key</code> (or <code>radius server</code> for RADIUS). Then:</p><p><code>aaa authentication login default group tacacs+ local</code></p><p>This says: ask the TACACS+ servers first; use the local user list only if no server answers. If a server answers and rejects the password, the login fails; the local list is not tried. Keeping <code>local</code> at the end, with a local user configured, means administrators can still get in when the server is down.</p>

## Check it worked
<p>Log in over SSH and confirm the server sees the attempt. <code>show aaa servers</code> shows whether each server is up and how many requests it has answered. <code>show ip ssh</code> shows the SSH version, and <code>show ssh</code> lists active sessions. <code>show users</code> lists who is connected on which line.</p>

## @terms
- Console port :: A physical port for direct CLI access that works without any network.
- SSH :: Encrypted remote CLI access on TCP 22.
- Out-of-band management :: Managing devices over a separate path from user traffic.
- AAA :: Authentication, authorization and accounting.
- TACACS+ :: Cisco AAA protocol on TCP 49; encrypts the whole body; separates the three As.
- RADIUS :: Open-standard AAA protocol on UDP 1812/1813; encrypts only the password; combines authentication and authorization.
- Method list :: An ordered list of where a device checks credentials, such as a server group then local users.

## @exam
- 2.8: describe network device management access (Telnet, SSH, HTTP, HTTPS, console, TACACS+/RADIUS, cloud managed). 5.8: describe authentication, authorization and accounting concepts.
- Ports: Telnet TCP 23, SSH TCP 22, HTTP TCP 80, HTTPS TCP 443, TACACS+ TCP 49, RADIUS UDP 1812/1813.
- TACACS+ encrypts the whole payload and separates all three functions; RADIUS encrypts only the password and combines authentication with authorization.
- TACACS+ suits device administration; RADIUS suits network access such as 802.1X.
- A method list falls back to the next method only when the previous one gives no answer, not when it rejects the user.

## @mistakes
- Typing <code>aaa new-model</code> with a server-only method list and no local fallback: if the server is unreachable, nobody can log in remotely.
- Mismatched shared key between device and AAA server: every login fails, and the server logs show bad requests.
- Generating RSA keys before setting the hostname and domain name: IOS refuses, because the key is named from them.
- Leaving <code>transport input telnet ssh</code> on the VTY lines: Telnet still works and passwords cross the network in clear text.

## @quiz

### Which protocol encrypts the entire AAA message body?
- RADIUS
- [x] TACACS+
- Telnet
- HTTP
> TACACS+ encrypts the whole body. RADIUS encrypts only the password field. Telnet and HTTP are management protocols, not AAA protocols, and are unencrypted.

### A switch port must authenticate users with 802.1X. Which protocol normally carries the request to the AAA server?
- TACACS+
- SNMP
- SSH
- [x] RADIUS
> RADIUS is the standard protocol for network access such as 802.1X and VPN users. TACACS+ is mainly used for administrators logging in to devices.

### With <code>aaa authentication login default group tacacs+ local</code>, the server answers and rejects the password. What happens?
- The local user list is checked next
- The login is allowed read-only
- [x] The login fails
- The device tries RADIUS
> The local method is used only when the server gives no answer. An answer of "rejected" ends the attempt.

### Which access method still works when the device has no IP address configured?
- [x] Console
- SSH
- HTTPS
- Telnet
> The console is a direct serial connection and needs no network settings. SSH, HTTPS and Telnet all need IP.

### A company wants a log of every command an administrator ran. Which part of AAA provides it?
- Authentication
- Authorization
- [x] Accounting
- Auditing by SNMP
> Accounting records what users did. Authorization decides what they are allowed to do; authentication checks who they are.
