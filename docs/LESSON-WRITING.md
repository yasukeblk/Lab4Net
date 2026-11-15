# Writing Lab4Net lessons

This is the brief the current 66 lessons were written to. Use it for any new lesson, so they stay consistent.

Lab4Net is a browser CCNA 200-301 v1.1 lab simulator. Its owner is studying for the CCNA. The labs teach which commands to type; the lessons teach the networking behind them, so he understands what he is doing and can answer exam questions. He asked for this because he "is not learning stuff, like what is DHCP pooling".

A lesson is read in the lesson reader (the Lessons screen, and the lesson card a build lab shows before you start), takes about 6 to 10 minutes, and ends with a short quick check. The DHCP server and relay lesson (`src/lessons/001-dhcp-server-and-relay.md`) is the model for length, tone, structure and depth. Read it first, and match it.

## Two kinds of lesson

1. **Lab lessons**: keyed by the exact lab `title`. They teach the concept behind that lab, using that lab's real devices, interfaces and addresses as the worked example, and they have a `story` animated on the lab's own network map.
2. **Topic lessons**: for CCNA objectives that have no lab (wireless, QoS, automation and so on). Keyed by a short title of your choosing (it must not be a lab title), with `topic:true`, `ccna:[...]` objective ids, and **no** `story`.

## Format

Each lesson is one file in `src/lessons/`, named `NNN-slug.md`. The number is the order lessons were added in: give a new lesson the next free number. The slug is the title in lower case with hyphens. The build turns the files into the app's lesson data, so you never edit `src/data/lessons.js`.

A complete topic lesson looks like this (a lab lesson has no `topic` or `ccna` line, its title is the lab's exact title, and it adds a `## @story`):

~~~text
---
title: DNS: names to addresses
name: How names become addresses
topic: true
ccna: 4.3
mins: 8
---

## The problem DNS solves
<p>Devices talk to IP addresses. People remember names. <b>DNS</b> turns a name into an address.</p>

## Ports
<p>DNS uses port <b>53</b>: UDP for normal queries, TCP for large answers.</p>

## @terms
- DNS :: Domain Name System: the service that maps names to IP addresses.
- Resolver :: The DNS server a host is configured to ask.

## @exam
- 4.3: explain the role of DHCP and DNS within the network.

## @mistakes
- Blaming routing when only names fail. If a ping to an address works and a ping to a name does not, look at DNS.

## @quiz

### Which transport and port does a normal DNS query use?
- [x] UDP 53
- TCP 23
- UDP 67
- TCP 443
> DNS queries use UDP port 53. TCP 53 is also used, for large answers and zone transfers.
~~~

How the file is read:

- **The header** is between the two `---` lines: `title` (the lesson's title, which also makes its address, so never change it once published), `name` (the line under the title), `topic: true` and `ccna` (comma-separated objective ids) for topic lessons, and `mins`.
- **A section** is `## Heading` followed by its body: one line of HTML.
- **`## @terms`**: one `- term :: definition` per line.
- **`## @exam` and `## @mistakes`**: one `- item` per line (the items may use the allowed tags).
- **`## @quiz`**: each question is `### question`, then four `- option` lines with the right one marked `- [x]`, then `> why`.
- **`## @story`** (lab lessons): the steps as a ```` ```json ```` block, an array of `{path, cls, at, label, t, x}` objects (plus `good: 1` or `bad: 1`).

Check a new file before adding it, and fix everything it reports:

```
node tests/lessons.cjs path/to/new-lesson.md
```

Then put the file in `src/lessons/`, add its slug to `src/data/lesson-order.js` (in its exam topic, where it should be taught) and to `tests/fixtures/slugs.json` (at the end), and run `node tools/build.cjs`, `node tools/build-site.cjs` and every test. `tests/lessons-files.cjs` checks that each file is in the exact layout above; if it complains, match the layout of an existing file. A `.js` draft (`Object.assign(LESSONS,{...})`) can still be checked the same way.

The rules `tests/lessons.cjs` enforces:

- `name` at most 48 characters, written as what you will learn ("How devices get their addresses", "Why VLANs split a switch"). `mins` 4 to 12.
- 4 to 8 `sections`, each `[heading, html]`. The html starts with `<p>`, `<ol>` or `<ul>`. Allowed tags only: `p b i code ol ul li small kbd br`. No links, images, SVG or `${`.
- At least 5 `terms` as `[term, definition]`, plain text (no tags).
- At least 3 `exam` items and 3 `mistakes` (these may use the allowed tags).
- 4 or 5 `quiz` questions, each with exactly 4 different options and the index (0 to 3) of the correct one. **Vary where the correct answer is** across questions. Wrong options must be plausible, not silly. The explanation teaches.
- Lab lessons: 3 to 8 `story` steps. Every device in `path` must be on the lab's map (its `pos`), and each consecutive pair must be directly cabled in the lab's `build()`. `cls` is `req` for traffic going out and `rep` for traffic coming back. `at` is the device where the step's label pops up (usually the last in the path). `label` is UPPERCASE, at most 16 characters. Add `good:1` for a success and `bad:1` for a failure or drop. `t` is a short step title, `x` explains the step in 1 to 3 sentences. Steps are clicked through one at a time, so each must make sense on its own and the sequence must tell the story of the concept (a frame being tagged, a route being chosen, a packet being translated or dropped).

## Content rules

- **Accurate for CCNA 200-301 v1.1 and real Cisco IOS behaviour.** If you are not sure of a detail, leave it out rather than guess. Defaults (timers, administrative distances, priorities, port numbers, ranges) must be right.
- Teach the concept first: what problem it solves, how it works, then how it is configured and verified in this lab. Name the commands in `<code>`, but the lesson explains ideas; the lab's own tasks and step-by-step guide already list every command.
- Use the lab's own devices and addresses as the worked example (from its definition in `src/engine/`: brief, build, addr, tasks, why, solution). Read the lab's tasks and why text so the lesson prepares for exactly what the lab does, without contradicting it.
- Plain language. Short sentences. Define a term the first time you use it. Write for a motivated beginner, not an expert. No marketing tone, no exclamation marks, no emoji, no "Let's dive in", no "In this lesson we will".
- Sections typically: the problem it solves; how it works (2 to 3 sections); how it is configured here; how to check it worked. Use `<ol>` for sequences and `<ul>` sparingly.
- `exam`: start with the objective numbers and what they ask (for example "2.2: configure and verify interswitch connectivity: trunk ports, 802.1Q, native VLAN."), then the facts the exam likes to test.
- `mistakes`: real mistakes people make with this, and what the symptom looks like.
- Avoid repeating another lesson at length: if VLAN basics are needed in a trunking lesson, recap in two sentences.
- Length: sections plus story about 550 to 900 words (the validator prints the count). Topic lessons about 600 to 900 words of sections.

## CCNA 200-301 v1.1 objective ids (for topic lessons' `ccna` and the exam notes)

1.1 network components (routers, L2/L3 switches, next-generation firewalls and IPS, access points, controllers, endpoints, servers, PoE); 1.2 topology architectures (two-tier, three-tier, spine-leaf, WAN, small office/home office, on-premises and cloud); 1.3 physical interface and cabling types (single-mode fiber, multimode fiber, copper; shared media and point-to-point); 1.4 interface and cable issues (collisions, errors, mismatched duplex and/or speed); 1.5 TCP vs UDP; 1.6 IPv4 addressing and subnetting; 1.7 private IPv4 addressing; 1.8 IPv6 addressing and prefix; 1.9 IPv6 address types; 1.10 verify IP parameters for client OS (Windows, Mac OS, Linux); 1.11 wireless principles (nonoverlapping Wi-Fi channels, SSID, RF, encryption); 1.12 virtualization fundamentals (server virtualization, containers, VRFs); 1.13 switching concepts (MAC learning and aging, frame switching, frame flooding, MAC address table).
2.1 VLANs; 2.2 interswitch connectivity (trunks, 802.1Q, native VLAN); 2.3 Layer 2 discovery protocols (CDP, LLDP); 2.4 EtherChannel (LACP); 2.5 Rapid PVST+ (root port, root bridge primary/secondary, port states and roles, PortFast, root guard, loop guard, BPDU filter, BPDU guard); 2.6 Cisco wireless architectures and AP modes; 2.7 physical infrastructure connections of WLAN components (AP, WLC, access/trunk ports, LAG); 2.8 network device management access (Telnet, SSH, HTTP, HTTPS, console, TACACS+/RADIUS, cloud managed); 2.9 interpret the wireless LAN GUI configuration for client connectivity (WLAN creation, security settings, QoS profiles, advanced settings).
3.1 interpret the routing table; 3.2 how a router makes a forwarding decision (longest prefix match, administrative distance, routing protocol metric); 3.3 IPv4 and IPv6 static routing; 3.4 single-area OSPFv2; 3.5 first hop redundancy protocols.
4.1 inside source NAT (static and pools); 4.2 NTP client and server mode; 4.3 DHCP and DNS; 4.4 SNMP; 4.5 syslog features including facilities and severity levels; 4.6 DHCP client and relay; 4.7 QoS per-hop behavior (classification, marking, queuing, congestion, policing, shaping); 4.8 SSH remote access; 4.9 TFTP/FTP.
5.1 key security concepts (threats, vulnerabilities, exploits, mitigation techniques); 5.2 security program elements (user awareness, training, physical access control); 5.3 device access control using local passwords; 5.4 security password policy elements (management, complexity, password alternatives: multifactor authentication, certificates, biometrics); 5.5 IPsec remote access and site-to-site VPNs; 5.6 access control lists; 5.7 Layer 2 security (DHCP snooping, dynamic ARP inspection, port security); 5.8 authentication, authorization and accounting; 5.9 wireless security protocols (WPA, WPA2, WPA3); 5.10 configure and verify a WLAN within the GUI using WPA2 PSK.
6.1 how automation impacts network management; 6.2 controller-based vs traditional networking; 6.3 controller-based, software-defined architecture (overlay, underlay, fabric; separation of control plane and data plane; northbound and southbound APIs); 6.4 AI (generative and predictive) and machine learning in network operations; 6.5 REST-based APIs (authentication types, CRUD, HTTP verbs, data encoding); 6.6 configuration management such as Ansible and Terraform; 6.7 components of JSON-encoded data.

## Before it ships

Read the whole lesson for accuracy, check any specific claim about the lab (an address a host is leased, which port blocks) against the simulator, and look at it in the browser: the lesson in the mission window, every story step on the map, and the quick check.
