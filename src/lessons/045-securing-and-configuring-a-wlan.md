---
title: Securing and configuring a WLAN
name: How WPA2 and WPA3 secure a wireless LAN
topic: true
ccna: 5.9, 5.10, 2.9
mins: 10
---

## The problem: anyone can listen
<p>Radio does not stop at the office wall. Anyone in the car park can capture wireless frames, and anyone can try to join. A secure WLAN therefore needs three things: <b>authentication</b> (only allowed users join), <b>encryption</b> (captured frames are unreadable) and <b>integrity</b> (frames cannot be changed in transit, checked with a message integrity check, or MIC).</p>

## From WEP to WPA3
<p>The original 802.11 offered <b>open</b> authentication (anyone may join) and <b>WEP</b>, which used the RC4 cipher with a short static key. WEP can be cracked in minutes and must not be used. The Wi-Fi Alliance then certified three generations:</p><ol><li><b>WPA</b>: a stopgap that ran on WEP hardware, using <b>TKIP</b> for encryption. Now deprecated.</li><li><b>WPA2</b>: based on 802.11i, using <b>AES-CCMP</b> for encryption and integrity. The long-standing baseline.</li><li><b>WPA3</b>: uses AES with <b>GCMP</b> (the enterprise 192-bit mode uses GCMP-256), requires <b>Protected Management Frames</b> (PMF) so attackers cannot forge disconnect messages, and replaces the pre-shared key exchange with <b>SAE</b>.</li></ol>

## Personal and Enterprise
<p>Each WPA generation has two ways to authenticate:</p><ul><li><b>Personal</b>: everyone shares one passphrase, the <b>PSK</b> (pre-shared key), 8 to 63 characters. Simple, but everyone who knows it can join, and changing it means changing every device. With WPA2-PSK, an attacker who captures the four-way handshake can try passwords offline. WPA3-Personal uses <b>SAE</b> (Simultaneous Authentication of Equals), which defeats that offline guessing and gives forward secrecy.</li><li><b>Enterprise</b>: each user logs in with their own credentials using <b>802.1X</b>. The client (the <i>supplicant</i>) talks EAP to the AP or WLC (the <i>authenticator</i>), which asks a <b>RADIUS</b> server (the <i>authentication server</i>). One user can be removed without touching anyone else.</li></ul><p>Either way, the result is a key the client and AP share, from which a <b>four-way handshake</b> derives fresh encryption keys for that session.</p>

## Building a WPA2-PSK WLAN on a WLC
<p>On a Cisco AireOS WLC, in the web GUI:</p><ol><li><b>Dynamic interface</b> first. Under <i>Controller &gt; Interfaces &gt; New</i>, give it a name and VLAN ID, then an IP address, mask, gateway, physical port and DHCP server for that VLAN. This is where the WLAN's clients will land.</li><li><b>Create the WLAN</b>. Under <i>WLANs</i>, choose <i>Create New</i> and <i>Go</i>. Enter a profile name (the WLC's own label), the SSID (the name clients see) and an ID number.</li><li><b>General tab</b>: tick <i>Status: Enabled</i> and choose the dynamic interface from step 1, which maps the SSID to its VLAN. <i>Broadcast SSID</i> controls whether beacons name it.</li><li><b>Security tab, Layer 2</b>: choose <i>WPA+WPA2</i>, tick the <i>WPA2 Policy</i> with <i>AES</i> encryption, and under authentication key management untick <i>802.1X</i> and tick <i>PSK</i>. Choose ASCII and type the passphrase.</li><li>Click <i>Apply</i>. For Enterprise instead, leave 802.1X ticked and pick a RADIUS server on the <i>AAA Servers</i> tab, after adding it under <i>Security &gt; AAA &gt; RADIUS</i> with its IP address and shared secret.</li></ol>

## QoS and Advanced tabs
<p>The <b>QoS tab</b> picks a profile that sets how the WLAN's traffic is prioritised:</p><ul><li><b>Platinum</b>: voice.</li><li><b>Gold</b>: video.</li><li><b>Silver</b>: best effort, the default.</li><li><b>Bronze</b>: background traffic.</li></ul><p>The <b>Advanced tab</b> holds settings such as <i>Allow AAA Override</i> (let RADIUS assign a VLAN or policy per user), session timeout, client exclusion after repeated failed logins, whether clients must get their address by DHCP, peer-to-peer blocking and FlexConnect local switching.</p>

## Check it worked
<p>On the WLC, the <i>WLANs</i> list shows each WLAN as enabled, with its SSID and security policy (for example <i>[WPA2][Auth(PSK)]</i>). The <i>Monitor &gt; Clients</i> page lists connected clients with their AP, WLAN, IP address and status. On a client, check it joined the right SSID and got an address in the expected VLAN's subnet. A client that associates but never gets an address points at the interface mapping or the DHCP server; one that is refused at once points at the passphrase or security settings.</p>

## @terms
- WPA2 :: Wi-Fi Alliance security certification using AES-CCMP; Personal (PSK) or Enterprise (802.1X).
- WPA3 :: Current certification: GCMP, required PMF, and SAE in place of PSK for Personal mode.
- PSK :: Pre-shared key: one passphrase, 8 to 63 characters, shared by every user of a WLAN.
- SAE :: Simultaneous Authentication of Equals: WPA3-Personal's key exchange, resistant to offline password guessing.
- 802.1X :: Port-based access control: each user authenticates with EAP to a RADIUS server.
- TKIP :: The WPA-era encryption built to run on WEP hardware; deprecated.
- CCMP :: The AES-based encryption and integrity protocol of WPA2.
- Dynamic interface :: A WLC interface tied to a VLAN; a WLAN mapped to it puts its clients in that VLAN.
- PMF :: Protected Management Frames: stops forged disassociation and deauthentication frames.

## @exam
- 5.9: describe wireless security protocols (WPA, WPA2, WPA3). 5.10: configure and verify a WLAN within the GUI using WPA2 PSK. 2.9: interpret the WLAN GUI configuration for client connectivity: WLAN creation, security settings, QoS profiles and advanced settings.
- Match each generation to its encryption: WPA with TKIP, WPA2 with AES-CCMP, WPA3 with GCMP.
- WPA3-Personal uses SAE; WPA3 makes PMF mandatory.
- Enterprise mode: supplicant, authenticator, authentication server (RADIUS), using EAP.
- QoS profiles: Platinum voice, Gold video, Silver best effort (default), Bronze background.
- Profile name is the WLC's label; SSID is what clients see. They can differ.

## @mistakes
- Leaving 802.1X ticked alongside PSK when only a passphrase is intended: clients are asked for credentials no one has, or behave unpredictably.
- Mapping the WLAN to the management interface instead of its dynamic interface: clients land in the wrong VLAN and get the wrong addresses or none.
- Choosing TKIP for compatibility: modern clients may refuse it and throughput is limited; use AES.
- Forgetting to enable the WLAN: it is configured but never broadcast.
- A passphrase shorter than 8 characters: the WLC rejects it.

## @quiz

### Which encryption protocol does WPA2 use?
- TKIP
- RC4
- [x] AES-CCMP
- GCMP-256
> WPA2 is built on AES-CCMP. TKIP belongs to WPA, RC4 to WEP, and GCMP to WPA3.

### What does WPA3-Personal use in place of the WPA2 pre-shared key exchange?
- [x] SAE
- TKIP
- 802.1X
- WEP
> SAE protects the passphrase from offline guessing even if an attacker records the handshake. 802.1X is the Enterprise method, not Personal.

### On the WLC, a new WLAN's clients get addresses from the wrong subnet. Which setting should you check first?
- The QoS profile
- [x] The interface chosen on the General tab
- The session timeout
- The SSID broadcast setting
> The interface (or interface group) on the General tab maps the WLAN to its VLAN, which decides which subnet clients join.

### A WLAN carries voice calls. Which QoS profile fits it?
- Silver
- Bronze
- Gold
- [x] Platinum
> Platinum is for voice. Gold is for video, Silver is best effort (the default) and Bronze is background.

### In WPA2-Enterprise, which device checks the user's credentials?
- The client, as supplicant
- The AP or WLC, as authenticator
- [x] The RADIUS server, as authentication server
- The DHCP server
> The authenticator only relays EAP messages; the RADIUS server decides whether the credentials are valid.
