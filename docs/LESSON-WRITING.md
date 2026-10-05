# Writing Lab4Net lessons

This is the brief the current 54 lessons were written to. Use it for any new lesson, so they stay consistent.

Lab4Net is a browser CCNA 200-301 v1.1 lab simulator. Its owner is studying for the CCNA. The labs teach which commands to type; the lessons teach the networking behind them, so he understands what he is doing and can answer exam questions. He asked for this because he "is not learning stuff, like what is DHCP pooling".

A lesson is read in a small window before the lab, takes about 6 to 10 minutes, and ends with a short quick check. The DHCP server and relay lesson (in `index.html`, between `//LESSONS-DATA-START` and `//LESSONS-DATA-END`) is the model for length, tone, structure and depth. Read it first, and match it.

## Two kinds of lesson

1. **Lab lessons**: keyed by the exact lab `title`. They teach the concept behind that lab, using that lab's real devices, interfaces and addresses as the worked example, and they have a `story` animated on the lab's own network map.
2. **Topic lessons**: for CCNA objectives that have no lab (wireless, QoS, automation and so on). Keyed by a short title of your choosing (it must not be a lab title), with `topic:true`, `ccna:[...]` objective ids, and **no** `story`.

## Format

Write a draft file (anywhere outside the repo is fine) containing only:

```js
Object.assign(LESSONS,{
'Exact lab title':{name:'Short lesson title',mins:8,
 sections:[['Heading','<p>...</p>'], ...],
 terms:[['Term','Plain-text definition.'], ...],
 exam:['...'], mistakes:['...'],
 story:[{path:['PC1','SW1','R1'],cls:'req',at:'R1',label:'DISCOVER',t:'Step title',x:'What happens and why.'}, ...],
 quiz:[['Question?',['A','B','C','D'],0,'Why the right answer is right (and the tempting wrong one wrong).'], ...]},
'A topic lesson title':{topic:true,ccna:['1.11'],name:'...',mins:8, sections:[...], terms:[...], exam:[...], mistakes:[...], quiz:[...]}
});
```

Rules `tests/lessons.cjs` enforces. Check a draft before adding it, and fix everything it reports:

```
node tests/lessons.cjs path/to/draft.js
```

Then paste the draft's entries into `index.html` inside the lesson data block (before `//LESSONS-DATA-END`) and run `node tests/lessons.cjs` again with no arguments.

- `name` at most 48 characters, written as what you will learn ("How devices get their addresses", "Why VLANs split a switch"). `mins` 4 to 12.
- 4 to 8 `sections`, each `[heading, html]`. The html starts with `<p>`, `<ol>` or `<ul>`. Allowed tags only: `p b i code ol ul li small kbd br`. No links, images, SVG or `${`.
- At least 5 `terms` as `[term, definition]`, plain text (no tags).
- At least 3 `exam` items and 3 `mistakes` (these may use the allowed tags).
- 4 or 5 `quiz` questions, each with exactly 4 different options and the index (0 to 3) of the correct one. **Vary where the correct answer is** across questions. Wrong options must be plausible, not silly. The explanation teaches.
- Lab lessons: 3 to 8 `story` steps. Every device in `path` must be on the lab's map (its `pos`), and each consecutive pair must be directly cabled in the lab's `build()`. `cls` is `req` for traffic going out and `rep` for traffic coming back. `at` is the device where the step's label pops up (usually the last in the path). `label` is UPPERCASE, at most 16 characters. Add `good:1` for a success and `bad:1` for a failure or drop. `t` is a short step title, `x` explains the step in 1 to 3 sentences. Steps are clicked through one at a time, so each must make sense on its own and the sequence must tell the story of the concept (a frame being tagged, a route being chosen, a packet being translated or dropped).
- Use JS single-quoted strings; escape apostrophes as `\'`.

## Content rules

- **Accurate for CCNA 200-301 v1.1 and real Cisco IOS behaviour.** If you are not sure of a detail, leave it out rather than guess. Defaults (timers, administrative distances, priorities, port numbers, ranges) must be right.
- Teach the concept first: what problem it solves, how it works, then how it is configured and verified in this lab. Name the commands in `<code>`, but the lesson explains ideas; the lab's own tasks and step-by-step guide already list every command.
- Use the lab's own devices and addresses as the worked example (from its definition in `index.html`: brief, build, addr, tasks, why, solution). Read the lab's tasks and why text so the lesson prepares for exactly what the lab does, without contradicting it.
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
