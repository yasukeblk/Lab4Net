# Lab4Net changes

## Lab library, phase 2: eight labs with engine extensions

New labs, appended after phase 1:

- **Floating static route** (Routing): a backup route at distance 5 that stays out of the routing table until the primary link fails, then takes over and steps back when it returns.
- **How a router chooses a route** (Routing): OSPF cost moves the preferred path, a /32 host route pins one server to the other path (longest match first), and a /24 backup at distance 130 loses to OSPF's 110.
- **OSPF on a shared segment** (Routing): four routers on one LAN. Raising a priority changes nothing (no pre-emption); priority 0 makes the DR and BDR give up their roles in turn; the WAN link runs point-to-point with a realistic cost.
- **LLDP** (Switching): a Linux server that CDP cannot see shows up once LLDP runs; transmit is turned off on its port while receive stays on.
- **Voice VLAN** (Switching): an IP phone with a PC plugged into it, on one switch port. Before the voice VLAN both land in the data VLAN; after it, the phone renews into the voice subnet and the PC stays in data.
- **Dynamic NAT with a pool** (IP services): two public addresses for three PCs, so the third fails and the miss counter climbs; IOS refuses to change the rule until the translations are cleared; overload then shares one address.
- **Named ACLs and sequence numbers** (Security): insert lines between existing ones, delete one line by number, and resequence.
- **NTP and syslog** (IP services): both routers sync to a stratum 1 server, log with date-and-time stamps, and send only warnings and worse to the syslog server. The eight severity levels are taught in the explanations.

Engine changes behind them:

- The routing table now holds one route per prefix: the lowest administrative distance wins. ip route takes a distance, an exit interface or both, and a name. A route whose next hop is no longer on a connected subnet drops out, which is what makes floating routes work. Exit-interface-only routes on Ethernet work through the neighbor's proxy ARP (no ip proxy-arp turns it off).
- show ip route ADDRESS (the entry a given address uses, as IOS describes it) and show ip route static, ospf or connected.
- OSPF uses shortest-path costs: ip ospf cost, auto-cost reference-bandwidth, ip ospf network point-to-point, ip ospf priority and ip ospf PID area N. The DR/BDR election follows RFC 2328 and persists between commands. Neighbor states are the real ones (FULL/DR, FULL/BDR, FULL/DROTHER, 2WAY/DROTHER, FULL/ -). New show ip ospf interface and its brief form.
- LLDP: lldp run, lldp transmit and receive per port, show lldp, show lldp neighbors (and detail), show lldp interface.
- IP phones: a new device that bridges a PC behind it, learns its voice VLAN from the switch over CDP and tags its own traffic. Access ports carry a voice VLAN everywhere it matters (forwarding, VLAN interface state, spanning tree, show vlan brief). show interfaces switchport. DHCP option 150.
- NAT: ip nat pool, pool rules with and without overload, pool exhaustion with a reason in the trace panel, the IOS "Dynamic mapping in use" refusal, show ip nat statistics. PAT keeps a host's own port when it is free, and pings carry an ICMP query ID.
- ACLs have real sequence numbers: insert with "15 permit ...", delete with "no 30", ip access-list resequence. show access-lists prints standard lists the IOS way.
- NTP (sync over the real UDP 123 path, stratum, held when the server goes quiet), show clock with the * for unsynchronised time, clock timezone, service timestamps log datetime msec, logging host and trap level, show logging with a log buffer, and a syslog viewer on the log server ("syslog" at its prompt). Link changes are now logged on the device at the far end of a link too, and leaving configuration mode logs %SYS-5-CONFIG_I.
- An administrative shutdown now logs %LINK-5-CHANGED (administratively down) instead of %LINK-3-UPDOWN, as IOS does.

Tests: tests/forwarding.cjs adds floating static failover, administrative distance against OSPF, longest match against distance, proxy ARP with and without, NAT pool exhaustion and overload, voice VLAN tagging, and the DR election rules.

Verification: labs.cjs passes 36 labs, 203 checks and 749 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass (ui.cjs in Edge). Each new lab's guide was run through the real console in Edge and graded, with no rejected commands and no page errors; the maps were checked at 1440x1000 and the Mission window at 390x844. The phone's console tab first showed its CDP name (SEP...); it now shows PHONE1 and only CDP uses the SEP name. Not checked: the container, Firefox, Safari.

Simplified, and recorded in the handoff: equal-cost paths are not load-shared (one is used); an OSPF network-type mismatch stops the adjacency forming, where real IOS forms it but loses routes; the NTP clock stays synchronised as long as its server is configured; syslog messages are shown on the console of the device the command was typed on, and only logged on others.

## Lab library, phase 1: seven new labs on the existing engine

New labs, added after the incidents so saved progress is unaffected:

- **Native VLAN and allowed VLANs on trunks** (Switching): move the native VLAN to an unused VLAN on both ends and prune the trunk. Changing one end first shows the real CDP native VLAN mismatch message.
- **Switch management access** (Fundamentals): a management VLAN, an SVI and a default gateway, then SSH from another subnet. The ping fails until the gateway is set, which is the point of the lab.
- **Locking down device access** (Security): service password-encryption, an enable secret in place of the enable password, local accounts, exec-timeout, SSH only, an access-class that admits only the admin subnet, and saving the config.
- **OSPF router IDs and passive interfaces** (Routing): a rogue router on the user LAN is injecting a route. Fix the router IDs (they only take effect after clear ip ospf process), then passive-interface default with the uplink re-opened.
- **Per-VLAN root bridges** (Switching): DSW1 root for VLAN 10 and backup for 20, DSW2 the other way round, so the access switch blocks a different uplink in each VLAN.
- **Map an unknown network with CDP** (Switching): the map hides port names. Use CDP to label every link TO-neighbor-port, turn CDP off towards the ISP only, and use the detail view to find a management address.
- **Small office build** (IP services): a factory-fresh router to a working branch: addressing, default route, DHCP pool and PAT.

Engine changes behind them:

- service password-encryption now really hides line, enable and username passwords as Cisco type 7 in the config. The encoding is the real one, so the strings decode like on a router.
- exec-timeout is stored and shown in the config. access-class on the VTY lines is now enforced: a denied source gets "Connection refused".
- CDP: cdp run and cdp enable (and their no forms) are modelled, show cdp neighbors has the real header and totals, and show cdp neighbors detail and show cdp are new. A native VLAN mismatch between two trunk ends is logged the moment it appears.
- OSPF: passive-interface default with no passive-interface exceptions; the router ID is fixed when the process starts and a new one waits for clear ip ospf process, with the real warning; neighbors with the same router ID refuse to form; loopbacks are advertised as /32; adjacency changes are logged (%OSPF-5-ADJCHG); new show ip protocols and show ip ospf.
- spanning-tree vlan ... root primary now works like the real macro (24576, or 4096 below the current root if that is not enough) and accepts VLAN lists such as 10,20.
- no enable password is supported.
- Accuracy fixes found while building: host pings now show a real TTL (128 from a host, 255 from a router, minus one per router on the way back) instead of always 126, and show ip nat translations has the real five columns with the host's own inside port.
- Lab numbers in the Mission window and guide now count build labs only, so the first new lab is LAB 16. Incidents keep their INCIDENT number. Labs can hide port names on the map (used by the CDP lab).
- Every new command has a "why" explanation in the walkthrough and command guide.

Tests: tests/ui.cjs searches the library for a word unique to Single-area OSPF, since "OSPF" now matches two labs. tests/curriculum.cjs reports the real lab count.

Verification: labs.cjs passes 28 labs, 163 checks and 557 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass (ui.cjs in Edge through Playwright). Each new lab's guide was also run through the real console in Edge and graded, with no rejected commands and no page errors; the maps were checked at 1440x1000 and the Mission window at 390x844 from screenshots. Two maps had host labels clipped at the bottom and were moved up. Not checked: the container itself, Firefox, Safari.

Not changed: the data path still ignores spanning-tree blocking (the tree is computed and shown, and the labs check it, but pings take any VLAN-valid path).

## Troubleshooting incidents, clues, CCNA study map and sandbox undo (ideas from ChatGPT's branch, rebuilt on main)

- Six troubleshooting incidents in a new Troubleshooting group. Each one starts from a working lab with one fault added: a PC in the wrong VLAN, a trunk missing a VLAN, a missing return route, the wrong 802.1Q tag on a subinterface, a bad DHCP relay address, and SSH blocked on the VTY lines. The four tasks are reproduce, inspect, repair and verify. Grading uses all of the original lab's checks, so a fix that breaks something else does not pass. Passing shows the root cause.
- Each incident has three clues (Direction, Evidence, Repair) that you reveal one at a time. Each clue costs 5 rank points. Starting the incident over hides them again so a retry can earn a clean rank.
- Ranks for incidents use the whole investigate-and-repair path as par, so show commands are not penalised. The results card lists clues used.
- Two new trophies: Detective (solve an incident with no clues, guide or walkthrough) and Fault Finder (solve all six incidents).
- Every lab shows the CCNA 200-301 v1.1 objectives it practises. The lab library search also matches objective numbers, for example "3.4" finds OSPF.
- New Study map button in the menu bar: the six exam domains with their exam weights, your progress in each, and a suggested next mission. It says plainly that it is a practice map, not a readiness score, and what is not simulated yet.
- Sandbox Undo: a button at the top of the Toolbox, and Ctrl+Z when the map has focus. It undoes the last device, cable, note, challenge or configuration change. Show, ping and mode commands fold into the step before them, so one press undoes one real change.
- Transfer progress now also carries which incident clues you have revealed.
- Not taken from ChatGPT's branch: the AI tutor (needs a server and an OpenAI key, and main is an offline static page), the Juniper switch and Junos commands (not CCNA), the Matrix design, and a separate sandbox ping-probe tool (pinging from a console already does this).
- Tests: tests/curriculum.cjs (ported from ChatGPT's branch) checks that every lab maps to real objectives, that each incident starts with a real failure and that its repair passes every original check. It now runs in GitHub Actions too. tests/ui.cjs reopens Static NAT for its trace checks, since the incidents now come after it in the lab list.

Verification: labs.cjs passes 21 labs, 119 checks and 358 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass. The new features were driven in headless Chromium at 1440x1000 and on a 390x844 phone with reduced motion on (clues, an incident cleared through the console, results card, retry, study map, objective search, sandbox undo by button and by Ctrl+Z, trophies), with no page errors, and the screenshots were checked by eye. Not tested: the Lab4Net container itself, Firefox, Safari.

## Retro redesign and merge (Claude, on top of the chatgpt/improvements branch)

Kept from ChatGPT's branch, unchanged in behaviour: saved work per lab (command journal replay), progress export/import, the lab library, the command guide, the trace panel with failure reasons and replay, grade invalidation after new commands, the task checklist, console shortcuts and paste review, the Static NAT lab, the theory check, the subnetting prefix ranges, offline operation, and the three test files plus the CI workflow.

Changed:

- New visual direction: a remastered arcade game, in the spirit of a classic brought back with modern art and lighting. Neon night palette, a city skyline behind the workspace, dark panels with soft shadows and coloured glows, gradient title bars colour-coded per window (mission, map, console), and bold italic arcade lettering.
- The console stays a retro amber CRT with scanlines and glass shading, and the DOS-style path line and boot screen remain, so the old-machine roots still show.
- Fonts are embedded in the page (Barlow Condensed italic for display, VT323 for the console, IBM Plex Sans for reading text), so the look is identical offline. No external requests.
- Topology devices are redrawn as bold-outlined, shaded illustrations with ground shadows. The selected device gets a bobbing marker and a pulsing ring.
- Animations are smooth and punchy: glowing cables with moving light, a glowing packet with a light trail along the real forwarding path, comic hit-sparks on success and failure, a shake on the device where a packet dies, and a "LAB CLEAR!" banner. All of it is disabled under reduced motion.
- Added step-by-step instructions, NetSim style: under every task, the exact commands to type, each shown with the prompt you should be at. A switch above the checklist turns them on or off and the choice is remembered. Clicking a command places it in the right device's console without running it. tests/labs.cjs also follows the instructions for every lab and checks the result grades as a pass.
- Windows can be rearranged on desktop: drag any window by its title bar, resize from any edge or corner, and they snap to the screen margins and to each other (hold Alt to place freely). Dragging to the left or right screen edge snaps a window to that half; the top edge fills the screen. The arrangement is saved per browser, and "Reset layout" in the menu bar restores the default.
- The step-by-step guide can be popped out into its own window ("Pop out guide" beside the switch) and docked again.
- The mission is split into two windows: Mission (the brief and address plan) and Checklist (the guide switch, tasks, grading and walkthrough). Each can be moved and resized on its own.
- Rewards: each lab run is timed and scored into a stage rank (S to D) from time, command count, rejected commands and help used, shown on a results card with XP earned. XP feeds eight levels shown in the header, there are twelve trophies, a combo counter for consecutive valid commands, a study-day streak, and rank badges in the lab library. Sound effects are generated in the browser and can be switched off.
- Hovering a device on the map shows its interfaces, addresses and link state. The trace panel under the map is always present, so the map keeps its size.
- "Transfer progress" and "Reset layout" moved to the status line under the menu bar, next to the new sound switch.
- Sandbox mode (under "Free build" in the lab picker, and in the Lab library): place up to 20 routers, switches, PCs and servers on a larger canvas, drag them around, and configure them from the console. Nothing is graded. The cable tool lets you choose the port on each end, showing which ports are free or in use. Right-click a device for console, cabling, IP settings, rename and delete; click or right-click a cable to remove it. PCs and servers have an IP settings dialog that runs the matching ipconfig commands. Four starter kits load ready-cabled topologies, and a sandbox can be saved to and loaded from a file. The build and its configuration are saved in the browser.
- Sandbox additions: a five-port router and a 24-port switch; zoom (scroll, or the + and − buttons), pan (drag empty space) and Fit over a canvas four times the default view; text notes on the map; and four challenges that load a cabled topology and check goals against the live network after every command, with no instructions.
- Transfer progress now also carries ranks, XP, trophies, the window layout and the sandbox.
- Fixed: commands with no output no longer add a blank line to the console.
- Desktop is the primary target. The phone layout from ChatGPT's branch is kept and still passes its overflow checks.

Verification: tests/labs.cjs (15 labs, 85 checks), tests/forwarding.cjs and tests/ui.cjs all pass. The browser suite was run in headless Chromium at 1440x1000 and 390x844.

---


## Learning and interaction

- Reworked the dark cyan/violet interface into a calmer workspace with clearer hierarchy, readable panels, console mode labels and a quieter topology. Removed external font requests so the app works fully offline.
- Added a searchable mission library grouped by topic, showing ready/resume/passed status. Added a short onboarding guide and a next-unpassed-lab action after successful grading.
- Preserved all task explanations and command explanations. Added manual task tracking that is explicitly independent of real configuration grading.
- Added a searchable command guide sourced from the actual command table, filtered to the device and current mode. It inserts syntax for review without executing it.
- Added Ctrl+Z/Ctrl+L shortcuts, keyboard tab navigation and a review dialog for multiline command pastes. Console display clearing does not discard configuration history.
- Grade feedback is invalidated after further console commands so old results cannot masquerade as a current grade.

## Continuity

- Automatically save per-lab command journals and checklists. Replaying commands restores the network and real configuration-mode contexts, including interface references, instead of serializing broken object pointers.
- Added offline JSON export/import for moving lab passes, configurations, checklists, subnetting results and theory results between devices. Existing earned passes remain compatible.
- Import rebuilds and validates included journals before replacing saved work, merges earned lab passes, and reports invalid files without discarding the current configuration.
- Added a deliberate reset flow that explains what is removed and preserves earned passes.

## Packet learning

- The forwarding model records the switches it actually traverses. Animation no longer guesses a shortest physical path that might cross a VLAN-ineligible link.
- Added diagnostic reasons for missing routes, unreachable next hops, inbound/outbound ACL drops and hop-limit failures.
- Added persistent request/reply results with troubleshooting guidance and replay. Results are labeled as the last test; rerun the command after changing configuration.
- Disabled ambient spinning/flow effects. Packet movement remains available, while reduced-motion users get the same readable outcomes. Live preference changes cancel movement safely.

## Content

- Added **Static NAT: publish a server**, with an outside client, a routed public block, a permanent one-to-one mapping, explanations, a solution and five grading checks. The original 14 labs and their grading requirements remain.
- Added 16 explained theory questions covering wireless, AAA, NTP, syslog, SNMP, QoS, VPNs, IPv6 concepts, transport and automation. This is supplementary practice rather than a complete exam bank. Topic scope follows [Cisco's CCNA v1.1 outline](https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf).
- Added prefix ranges to the subnetting drill, preserved first-attempt scoring and improved the block-method explanation. Strict answer comparison avoids silently turning malformed input into a correct answer.

## Accessibility and mobile

- Added a skip link, labeled dialogs, proper keyboard focus in device tabs, accessible task controls, explicit progress semantics and textual packet results.
- Added phone panel navigation between the mission and network console so a long checklist does not bury the console. Practice views hide the unrelated network workspace.
- Kept touch controls, bounded dialogs, responsive tables and reduced-motion styles. Fonts fall back to local system fonts with no network needed.

## Verification

- Added `tests/labs.cjs` **before changing the app**. Baseline: **14 labs / 80 checks passed**.
- Final solution test: **15 labs / 85 checks passed**, including a why explanation for every task.
- `tests/forwarding.cjs` passes outbound/return-route failures, inbound/outbound ACL diagnostics, static NAT publication, closed ports, a longer VLAN-valid path and link failure.
- `tests/ui.cjs` passes in local headless Microsoft Edge: all 15 labs through the UI execution path and Grade button, actual console entry, restoration inside interface mode, task restoration, backup round-trip, invalid import, library search, command guide, subnetting answers, theory feedback, phone navigation, viewport overflow and reduced motion. No page errors.
- Visually inspected desktop (1440×1000) and phone (390×844) captures.
- Added GitHub Actions for the two dependency-free simulator checks. Browser testing remains optional developer tooling; no runtime dependency was added.

## Deployment and deliberate limits

- The app remains one self-contained `index.html`. `install-lxc.sh` and the Dockerfile still deploy that same file, so no deployment restructuring was needed. README now includes branch-preview and Git update instructions.
- Automatic cloud sync was not added: offline backup transfer preserves the no-backend architecture.
- Full IPv6 forwarding, HSRP labs and interactive enable/console/remote password prompts were deferred. Those require broader engine and authentication work; IPv6 and gateway redundancy are introduced in theory practice instead.
- Existing timing, STP, EtherChannel, port-security and authentication models remain simplified; the regression suite protects supported exercises, not equivalence with real IOS hardware.
- Could not test the user's private Debian/nginx container, a Docker build, Safari/iOS or physical touch devices. The container is unreachable from this environment. Local file testing used desktop Edge with a phone-sized viewport, not a physical phone. CI execution on GitHub must be checked after publishing the branch.
