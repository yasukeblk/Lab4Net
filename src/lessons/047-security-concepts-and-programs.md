---
title: Security concepts and programs
name: How networks are attacked and defended
topic: true
ccna: 5.1, 5.2
mins: 9
---

## The problem: networks are worth attacking
<p>Networks carry money, health records and trade secrets, and businesses stop when they go down. Security aims to protect three things, often called the <b>CIA triad</b>: <b>confidentiality</b> (only the right people can read data), <b>integrity</b> (data is not changed without permission) and <b>availability</b> (systems are there when needed).</p>

## Four words to keep apart
<ol><li><b>Vulnerability</b>: a weakness. An unpatched router, a default password, an open telnet port.</li><li><b>Threat</b>: something or someone that could use the weakness to cause harm.</li><li><b>Exploit</b>: the actual method or tool that takes advantage of a vulnerability.</li><li><b>Mitigation</b>: a step that reduces the risk, such as patching, removing the default password or blocking the port.</li></ol><p>A useful test: a vulnerability exists even if no one knows about it; an exploit is what turns it into an attack.</p><p>Mitigation rarely removes risk completely. It makes an attack harder, less likely or less damaging. A default password changed, an unused port shut down and a switch closet locked are each small mitigations; together they close most of the easy ways in.</p>

## Common attacks
<ul><li><b>Denial of service (DoS)</b>: flooding a target so real users cannot reach it. A <b>DDoS</b> uses many machines at once, often a <b>botnet</b> of infected devices.</li><li><b>Spoofing</b>: faking an address. A forged source IP or MAC address lets an attacker hide or pose as another device.</li><li><b>Reflection and amplification</b>: the attacker sends small requests with the victim's address spoofed as the source, so servers send large replies to the victim.</li><li><b>Man-in-the-middle</b>: the attacker places itself between two parties, for example by ARP spoofing so traffic for the gateway goes to the attacker first.</li><li><b>Reconnaissance</b>: scanning and gathering information before an attack.</li><li><b>Malware</b>: a <b>virus</b> attaches to files and spreads when they are run; a <b>worm</b> spreads on its own across the network; a <b>trojan</b> hides inside software that looks useful.</li><li><b>Password attacks</b>: guessing from a word list (dictionary) or trying every combination (brute force).</li><li><b>Buffer overflow</b>: sending more data than a program expects, so it overwrites memory and crashes or runs the attacker's code.</li></ul>

## Social engineering
<p>Many attacks target people rather than devices. <b>Phishing</b> sends fake emails that lure people to give away passwords or open malware. <b>Spear phishing</b> targets particular people; <b>whaling</b> targets executives. <b>Vishing</b> uses phone calls and <b>smishing</b> uses text messages. A <b>watering hole</b> attack infects a website the targets are known to visit. <b>Tailgating</b> is following an authorised person through a secured door.</p>

## Defence in depth
<p>No single control stops everything, so defences are layered. Examples covered in other lessons:</p><ul><li>Firewalls and IPS to filter and inspect traffic at the edge.</li><li>ACLs on routers to limit which traffic and which hosts are allowed.</li><li>Port security, DHCP snooping and dynamic ARP inspection to stop spoofing on switch ports.</li><li>SSH and AAA so device access is encrypted and accountable.</li><li>Patching software and changing default passwords to remove known vulnerabilities.</li></ul>

## A security program
<p>Technology is only part of it. A <b>security program</b> is the organisation's plan for security, and the CCNA names three elements:</p><ol><li><b>User awareness</b>: keeping everyone alert, for example with reminders or fake phishing emails that show people what to look for.</li><li><b>User training</b>: formal sessions that teach policies and safe practice, often tailored to the person's role.</li><li><b>Physical access control</b>: badges, locked wiring closets, cameras and mantraps (two-door entries that let one person through at a time). Anyone with a console cable and a few minutes alone with a router can take it over by password recovery.</li></ol><p>The program also needs a written <b>security policy</b> that says what is allowed, who is responsible and what happens after an incident, so awareness, training and physical controls all point at the same rules.</p>

## @terms
- Vulnerability :: A weakness in a system that could be used to cause harm.
- Threat :: A person or event with the potential to exploit a vulnerability.
- Exploit :: The method or tool that takes advantage of a vulnerability.
- Mitigation :: An action that reduces the likelihood or impact of an attack.
- DDoS :: A denial-of-service attack launched from many machines at once.
- Man-in-the-middle :: An attack in which the attacker secretly relays traffic between two parties.
- Phishing :: Fraudulent messages that trick people into revealing information or running malware.
- Defence in depth :: Layering several independent security controls.

## @exam
- 5.1: define key security concepts (threats, vulnerabilities, exploits and mitigation techniques). 5.2: describe security program elements (user awareness, training and physical access control).
- Be able to tell a vulnerability, a threat, an exploit and a mitigation apart in a short scenario.
- Recognise attack types from a description: DoS/DDoS, spoofing, reflection and amplification, man-in-the-middle, reconnaissance, malware, password attacks.
- Know the social engineering variants: phishing, spear phishing, whaling, vishing, smishing, watering hole, tailgating.
- User awareness is ongoing and informal; training is formal; physical access control protects the equipment itself.

## @mistakes
- Calling a missing patch a threat: it is a vulnerability. The attacker who would use it is the threat.
- Confusing a virus with a worm: a worm spreads by itself; a virus needs someone to run the infected file.
- Securing the CLI but leaving the wiring closet unlocked: physical access allows password recovery.
- Treating one firewall as enough: once something gets past it, nothing inside stops it.

## @quiz

### A router runs software with a known flaw that has not been patched. What is the flaw?
- A threat
- [x] A vulnerability
- An exploit
- A mitigation
> The flaw is a weakness, which is a vulnerability. The attacker is the threat, the attack code is the exploit, and installing the patch is the mitigation.

### Small requests are sent to many servers with the victim's address as the source, and the servers send large replies to the victim. What is this?
- A man-in-the-middle attack
- A trojan
- [x] A reflection and amplification attack
- A dictionary attack
> Spoofing the victim as the source makes the servers reflect replies to it, and the replies are larger than the requests, so the traffic is amplified.

### Which malware spreads across a network on its own without a user running anything?
- [x] A worm
- A virus
- A trojan
- Phishing
> A worm copies itself across the network by itself. A virus needs an infected file to be run, and a trojan relies on the user installing it.

### A company sends staff fake phishing emails and shows those who clicked what they missed. Which security program element is this?
- Physical access control
- Accounting
- Defence in depth
- [x] User awareness
> Ongoing reminders and simulated phishing build user awareness. Formal classes would be training.

### Someone follows an employee through a badge-controlled door without using their own badge. What is this called?
- Vishing
- [x] Tailgating
- Spoofing
- Whaling
> Tailgating is following an authorised person through a secured entry. Mantraps are one physical control that stops it.
