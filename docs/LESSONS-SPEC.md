# Lab4Net: expand the lab library

A spec for Claude Code. Owner: Yasuke (CCNA learner, the only user, does not write code).
Goal: grow Lab4Net's lab library toward the breadth of Boson NetSim's CCNA library, using original labs, while keeping every lab accurate, gradable and explained.

## 0. Before you start

1. `git fetch && git checkout main && git pull`.
2. Read `docs/HANDOFF.md` in full. It is the source of truth for the file layout, the wrapper pattern, the design rules and the "Rules that keep it working". This spec adds to it and does not replace it.
3. Run the baseline and confirm it passes. Expected result: 21 labs, 119 checks, 358 guide commands.
   ```
   node tests/labs.cjs
   node tests/forwarding.cjs
   node tests/curriculum.cjs
   ```
   If main reports 15 labs, the "Troubleshooting incidents" build has not been pushed yet. Stop and tell Yasuke.
4. Set up the browser test once. Do not commit `node_modules`.
   - Install Playwright: `npm i --no-save playwright && npx playwright install chromium`.
   - Or use installed Edge: `set LAB4NET_BROWSER_CHANNEL=msedge` on Windows.
   - Then `node tests/ui.cjs` must pass.

## 1. Ground rules

- **Original content only.** NetSim is the model for coverage, style and depth: a realistic topology, a short brief, tasks, verification. Do not copy Boson's lab text, topologies, addressing or wording. Write your own.
- **CCNA 200-301 v1.1 scope.** Map every new lab to objective IDs in `CCNA_OBJECTIVES` / `CCNA_LAB_MAP`. Add any new IDs you need, checking the wording against Cisco's published v1.1 exam topics. Do not add CCNP-level content.
- **Every lab has everything.** That means:
  - `title`, `group`, `brief`, `pos`, `start`, `build()`, `addr`
  - `tasks`, with exactly one `why` and one `STEPS` entry per task
  - `checks` and `solution`
  - `ccna` objectives, and `kind: 'build'` (set through `CCNA_LAB_MAP`)
- **Explain every new command.** Each new command gets a `WHYC` entry, so the walkthrough and command guide explain it.
- **Checks test behaviour where possible.** Prefer checks like "PC1 can ping PC3", "the backup route takes over when Gi0/1 is down" or "SSH from PC2 is refused" over checks that only look for a config line. Config-text checks are fine where behaviour can't be observed, for example the NTP server address.
- **Never weaken a check to make a test pass.** Never change an existing lab's title: progress, ranks and journals are keyed by title.
- **Append new labs to the end of `LABS`, after the incidents.** Saved `lastLab` indexes then stay valid.
  - The lab number shown in the Mission window currently uses `cur.idx+1`. Change it so build labs are numbered among build labs only. Incidents already show "INCIDENT nn".
- **Groups.** Use the existing groups (`Fundamentals`, `Switching`, `Routing`, `IP services`, `Security`, `Troubleshooting`). Add an `IPv6` group in phase 3, plus `Capstone` if you build phase 5.
- **Engine changes stay between `//ENGINE-START` and `//ENGINE-END` and stay DOM-free.**
  - Register commands with `C(modes, pattern, handler, types)`. The first match wins, so put specific patterns before general ones.
  - Commands that store config must appear in `runningConfig` output.
  - Unsupported input still returns "Invalid input".
- **Fully offline, one file, no build step.** Keep the arcade design, colour-coded windows and reduced-motion behaviour exactly as described in the handoff. New UI must not use class names `router`, `switch`, `pc` or `srv`.
- **No modal dialogs or page reloads triggered automatically.**

## 2. What a finished lab looks like

- **Topology:** 3 to 7 devices, laid out cleanly in the 600x245 map (`pos`). Device names follow the existing style (R1, SW1, PC1, SRV1, ISP).
- **Brief:** 2 to 4 sentences of real-world framing, the kind of ticket a junior engineer gets.
- **Tasks:** 4 to 8 tasks. Each `why` explains the reason, not just the command.
- **Step-by-step guide:** the `STEPS` entry walks the full solution with verification commands (`show ...`, `ping`). Use `#` notes where a result needs explaining, for example "# this ping should fail".
- **Checks:** 4 to 8. At least one must be an end-to-end reachability or refusal test.
- **Rewards:** ranks, XP and trophies work automatically for anything in `LABS`.
- **Tests:** `tests/labs.cjs` proves the solution and the guide both reach a pass. Add engine-level tests (pattern of `tests/forwarding.cjs`) for any new forwarding behaviour.

## 3. Phases

Work through the phases in order. Inside a phase, make one local commit per lab, so there are checkpoints. Push at the end of each phase (section 4).

### Phase 1: labs on the existing engine

These mostly use commands that already exist. Check each command with `?` in the simulator before you rely on it. If one is missing, add it as a small engine change and note it in `CHANGES.md`.

1. **Native VLAN and allowed VLANs on trunks** (2.2). Move the native VLAN off VLAN 1 on both ends and prune the allowed list. Verify with `show interfaces trunk`.
2. **Switch management access** (1.6, 5.3). Give the switch a management SVI and `ip default-gateway`, then reach it from a PC in another subnet. If switch SVIs or management reachability are not modelled, move this lab to phase 2 and model them.
3. **Locking down device access** (5.3, 4.8):
   - `service password-encryption`, `exec-timeout`, `login local`
   - an `access-class` on the VTY lines so only the admin subnet can SSH in
   - `copy running-config startup-config`
   - Checks: admin PC SSH works, user PC is refused, startup-config matches.
4. **OSPF router IDs and passive interfaces** (3.4). Stop OSPF hellos on LAN ports while still advertising those networks. Verify with `show ip ospf neighbor`.
5. **Per-VLAN root bridges** (2.5). `spanning-tree vlan X root primary/secondary` across two distribution switches, so VLAN 10 and VLAN 20 use different roots.
6. **Map an unknown network with CDP** (2.3). The topology starts with no descriptions. The learner uses `show cdp neighbors` and writes a description on every inter-device link in a given format, for example `TO-SW2-Gi0/1`. Checks compare the descriptions against the real cabling.
7. **Small office build** (3.3, 4.1, 4.6). Default route to the ISP, DHCP for the LAN, and PAT to the internet, in one lab.

### Phase 2: small engine extensions

8. **Floating static route** (3.2, 3.3). Support an administrative distance on `ip route` and exit-interface routes. When the primary link is shut, the backup takes over. Add forwarding tests for this.
9. **How a router chooses a route** (3.2). Longest prefix match against AD against metric, using a host route, a network route and a default route. Add `show ip route <ip>` if useful.
10. **OSPF on a shared segment** (3.4):
    - three routers on one switch
    - `ip ospf priority` to control the DR and BDR election
    - `ip ospf cost`, and `ip ospf network point-to-point` on a WAN link
    - `show ip ospf interface brief`
    - Keep the DR/BDR election rules accurate: highest priority, then highest router ID, priority 0 never elected, no pre-emption. Changes take effect when the neighbour reforms; model this as a `clear ip ospf process` or an interface flap.
11. **LLDP** (2.3). `lldp run`, `lldp transmit/receive` per interface, `show lldp neighbors`. This is the open-standard counterpart to the CDP lab.
12. **Voice VLAN** (2.1). `switchport voice vlan`, with a simple IP phone device or a phone flag on a PC. Show it in `show interfaces switchport`, if you add that command.
13. **Dynamic NAT with a pool** (4.1). `ip nat pool`, `ip nat inside source list N pool NAME`, translations shown in `show ip nat translations`.
14. **Named standard ACLs and editing by sequence number** (5.6). `ip access-list standard NAME`, sequence numbers in `show access-lists`, and removing or inserting a single entry.
15. **NTP and syslog** (4.2, 4.5):
    - `ntp server`, `show ntp associations` and `show ntp status` (simulated as synchronised once the server is reachable)
    - `logging host`, `logging trap <level>`, `service timestamps log datetime msec`
    - The `why` explanations must teach the eight severity levels.

### Phase 3: larger engine work

16. **Inter-VLAN routing on a Layer 3 switch** (2.1). SVIs, `ip routing` on a switch, and optionally `no switchport` routed ports. This also clears the owed "Layer 3 switch for the sandbox": add one to the sandbox device list.
17. **DHCP snooping** (5.7). `ip dhcp snooping`, `ip dhcp snooping vlan`, trusted uplinks. A rogue DHCP server on an untrusted port is blocked, while the real server still hands out leases. Clients learn from the right server.
18. **Dynamic ARP Inspection** (5.7). Builds on the snooping binding table. A host with a spoofed IP/MAC is dropped. Keep the model honest and simple, and document the limits in the lab's `why` text.
19. **IPv6 addressing** (1.8, 1.9):
    - `ipv6 unicast-routing`, `ipv6 address` (manual and EUI-64), link-local addresses
    - SLAAC on PCs, `show ipv6 interface brief`, IPv6 `ping`
    - This needs a real IPv6 path through the forwarding engine. Write forwarding tests first.
20. **IPv6 static and default routes** (3.3). `ipv6 route` with next hop, a default route, and a floating route.
21. **First-hop redundancy with HSRP** (3.5). `standby` IP, priority and preempt. The PC keeps reaching its gateway when the active router's LAN link goes down. Keep it at CCNA depth; the `why` text should cover what any FHRP does.

### Phase 4: more troubleshooting incidents

Use the existing `INCIDENTS` pattern:

- a real failing service at the start
- a minimal repair
- the base lab's checks
- three clues (Direction, Evidence, Repair)
- a lesson
- inline `steps`

Add one incident for each lab that doesn't have one, starting with:

- OSPF (mismatched area or a wrong network/wildcard)
- spanning tree (BPDU Guard err-disabling a port someone moved a switch onto)
- EtherChannel (one side `on`, the other LACP)
- PAT (the inside/outside roles reversed)
- standard ACL (applied in the wrong direction or on the wrong interface)
- extended ACL (the deny line placed above the permit)
- port security (a violation in shutdown mode)
- static NAT (the wrong inside global)

Then add at least one incident for each new phase 1 to 3 lab. Extend `tests/curriculum.cjs`, which iterates `INCIDENTS`, so every new incident is proven to start broken and be fixed by its repair.

### Phase 5 (optional, if everything above is solid): capstones

Two or three larger labs in a `Capstone` group, each combining 5 or more objectives (VLANs, trunks, router-on-a-stick or an L3 switch, OSPF, DHCP relay, PAT, an ACL, SSH). They have a longer brief and no `STEPS` guide: each task's guide entry is just `#` notes giving the goal. Note that `labs.cjs` requires guide entries to reach a pass, so for capstones either keep full `STEPS` but default the guide switch off, or add a flag that the test respects. Choose one and document it.

## 4. At the end of each phase

1. All four tests pass: `labs.cjs`, `forwarding.cjs`, `curriculum.cjs`, `ui.cjs`. Add `ui.cjs` checks only for new UI behaviour.
2. Open `index.html` in a real browser.
   - Open each new lab, run its guide, and grade it.
   - Check the map layout looks clean at 1440x1000.
   - Check the Mission window on a phone-sized viewport.
   - Take screenshots and actually look at them.
3. Update `CHANGES.md` in plain language: what was added, what was not, what was verified.
4. Update `docs/HANDOFF.md`:
   - the "What this is" list
   - the engine map, with any new sections or helpers
   - the storage keys, if any change
   - the "Known limits"
   - the "Still owed" list: remove what you finished and add anything new you deferred
   - the Study map's "Not simulated yet" note in `index.html`, if a gap was closed
5. Commit, push `main`, and report to Yasuke in short bullets:
   - the phase and commit hash
   - the new labs, by title
   - test results (labs/checks/guide-command counts)
   - anything skipped and why
   - the updated "Still owed" list
   - this container command, labelled exactly like this:

   LAB4NET CONTAINER (root@192.168.1.106)
   ```
   cd /opt/lab4net && git checkout main && git pull && bash install-lxc.sh
   ```
6. Continue to the next phase unless something blocks you. If a lab can't be modelled accurately, skip it, record why in `CHANGES.md` and "Still owed", and move on. Do not ship an inaccurate simulation.

## 5. Out of scope

- Wireless/WLC GUI labs.
- Automation and programmability (REST, JSON, Ansible). The theory check covers these. Adding a few more theory questions on them is welcome and counts toward the owed "fuller theory question bank".
- Anything that needs a backend, an API key or network access.
- ChatGPT's `chatgpt/improvements` branch: do not merge it.
