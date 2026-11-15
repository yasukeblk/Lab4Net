---
title: Passwords, MFA and VPNs
name: How logins and VPNs keep access private
topic: true
ccna: 5.4, 5.5
mins: 10
---

## The problem: passwords alone are weak
<p>A password is only something you <b>know</b>, and anything known can be guessed, phished, reused from another breached site or read off a sticky note. A security policy sets rules that make passwords harder to break, and adds other proofs of identity where passwords are not enough. Separately, data crossing the internet needs protecting, which is what VPNs do.</p>

## Password policy
<p>A password policy usually covers:</p><ul><li><b>Length and complexity</b>: a minimum length, and a mix of character types. Length adds more strength than complexity; a long passphrase beats a short jumble.</li><li><b>Management</b>: no sharing, no reuse across systems, changes when a password may be exposed, and history so old passwords cannot be reused.</li><li><b>Lockout</b>: blocking logins after several failures, which defeats online guessing.</li></ul><p>On Cisco IOS, <code>security passwords min-length</code> enforces a minimum length, and <code>login block-for</code> stops logins for a time after repeated failures. <code>enable secret</code> stores a hash rather than the password. <code>service password-encryption</code> only applies weak, reversible type 7 encoding, which stops shoulder surfing, not attackers.</p><p>Rules that are too strict backfire. Forcing a new complex password every month leads people to write passwords down or add a number to the old one. That is why many policies now favour long passphrases, changed when there is reason to think they leaked, together with MFA.</p>

## MFA, certificates and biometrics
<p><b>Multifactor authentication (MFA)</b> requires proofs from two or more different <b>factors</b>:</p><ol><li>Something you <b>know</b>: a password or PIN.</li><li>Something you <b>have</b>: a phone with an authenticator app, a hardware token or a smart card.</li><li>Something you <b>are</b>: a fingerprint or face, called <b>biometrics</b>.</li></ol><p>Two passwords are still one factor. A stolen password alone is no longer enough when MFA is used.</p><p><b>Digital certificates</b> prove identity with public key cryptography. A trusted <b>certificate authority (CA)</b> signs a certificate that binds a name to a public key. The owner keeps the matching private key secret and proves identity by using it. Certificates identify websites in HTTPS, devices in 802.1X and peers in VPNs. Because the private key never leaves its owner, there is nothing for a user to type and nothing to phish.</p><p>Biometrics are convenient, but a fingerprint cannot be changed if it is ever copied, so they are usually one factor among several rather than the only one.</p>

## VPNs: a private tunnel over a public network
<p>A <b>VPN</b> (virtual private network) carries private traffic across the internet inside an encrypted tunnel. It gives <b>confidentiality</b> (encryption, such as AES), <b>integrity</b> (a hash such as SHA shows nothing changed), <b>authentication</b> (each end proves who it is with a pre-shared key or certificate) and <b>anti-replay</b> (old packets cannot be resent).</p><p><b>IPsec</b> is the standard framework for this. <b>IKE</b> (on UDP 500, or UDP 4500 when NAT is in the path) negotiates the keys. <b>ESP</b> (IP protocol 50) then encrypts and authenticates the traffic; <b>AH</b> (IP protocol 51) authenticates but does not encrypt, so ESP is what is normally used. In <b>tunnel mode</b> the whole original packet is encrypted and a new IP header is added; <b>transport mode</b> protects only the payload.</p>

## Site-to-site and remote access
<ul><li><b>Site-to-site VPN</b>: two routers or firewalls, one at each office, build a permanent tunnel. Hosts send ordinary traffic; the devices at the edge encrypt it. Users need no VPN software and do not know it is there. Plain IPsec does not carry multicast, so routing protocols are often run through <b>GRE over IPsec</b>, and <b>DMVPN</b> builds tunnels between many branches on demand.</li><li><b>Remote access VPN</b>: one user's device builds a tunnel to the company firewall when needed, using client software such as Cisco Secure Client (formerly AnyConnect). These usually use <b>TLS</b>, the protocol behind HTTPS, though IPsec is also used. A <b>clientless</b> VPN runs inside a web browser for limited access.</li></ul>

## @terms
- MFA :: Multifactor authentication: proofs from at least two of know, have and are.
- Biometrics :: Authentication by a physical trait, such as a fingerprint or face.
- Digital certificate :: A CA-signed document that binds an identity to a public key.
- IPsec :: A framework of protocols that secure IP traffic with encryption, integrity and authentication.
- ESP :: IPsec protocol (IP protocol 50) that encrypts and authenticates packets.
- IKE :: The protocol that negotiates IPsec keys, on UDP 500 (UDP 4500 through NAT).
- Site-to-site VPN :: A permanent tunnel between two networks, built by edge devices.
- Remote access VPN :: An on-demand tunnel from one user's device to the company network, usually with TLS.

## @exam
- 5.4: describe security password policy elements, such as management, complexity and password alternatives (multifactor authentication, certificates and biometrics). 5.5: describe IPsec remote access and site-to-site VPNs.
- The three factors: know, have, are. Two passwords are not MFA.
- Site-to-site: always on, built by routers or firewalls, invisible to users. Remote access: on demand, built by client software, usually TLS.
- ESP encrypts (protocol 50); AH does not encrypt (protocol 51); IKE uses UDP 500.
- GRE over IPsec carries multicast and routing protocols that plain IPsec cannot.

## @mistakes
- Relying on <code>service password-encryption</code>: type 7 passwords can be reversed in seconds. Use <code>enable secret</code> and <code>username ... secret</code>.
- Counting a password plus a security question as MFA: both are things you know.
- Expecting OSPF to run across a plain IPsec site-to-site tunnel: plain IPsec does not carry multicast, so neighbours never form; GRE over IPsec fixes it.
- Choosing AH for confidentiality: it authenticates but sends the data unencrypted.

## @quiz

### A user logs in with a password and then a code from a phone app. Which factors are used?
- [x] Something you know and something you have
- Something you know and something you are
- Two things you know
- Something you have and something you are
> The password is something you know; the phone that generates the code is something you have. Two different factors make it MFA.

### Which VPN type needs no software on users' computers?
- Remote access with a VPN client
- [x] Site-to-site
- Remote access with TLS
- Clientless browser VPN
> In a site-to-site VPN the edge routers or firewalls encrypt traffic, so hosts just send normal packets. A clientless VPN still needs the user to open it in a browser.

### Which IPsec protocol provides encryption?
- AH
- IKE
- GRE
- [x] ESP
> ESP encrypts and authenticates. AH only authenticates. IKE negotiates keys, and GRE is a tunnel with no encryption at all.

### Two offices need OSPF to run between them over the internet, encrypted. What fits?
- Plain IPsec tunnel mode
- AH in transport mode
- [x] GRE over IPsec
- A clientless TLS VPN
> Plain IPsec does not carry multicast, so OSPF hellos would not cross it. GRE carries them, and IPsec encrypts the GRE tunnel.

### What does <code>service password-encryption</code> do?
- Hashes passwords with a strong algorithm
- [x] Applies weak, reversible type 7 encoding to plain-text passwords
- Encrypts SSH sessions
- Enforces a minimum password length
> Type 7 encoding only hides passwords from casual view; tools reverse it instantly. <code>enable secret</code> stores a real hash.
