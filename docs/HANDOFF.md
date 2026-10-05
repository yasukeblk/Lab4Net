# Lab4Net handoff

State as of lab library phase 5 on `main` (4 Oct 2026). Read this before touching anything. The lab library is being expanded phase by phase following `docs/LESSONS-SPEC.md`.

## What this is

Lab4Net is a browser-based lab simulator for the Cisco CCNA exam, modeled on Boson NetSim with a Packet Tracer style sandbox. The owner, Yasuke, is the learner and the only user. He is studying for the CCNA and wants the tool to be accurate first, then rewarding and fun to use.

It currently has:

- 36 graded build labs: the original 15 (device basics, VLANs, trunking, router-on-a-stick, static routing, OSPF, spanning tree, EtherChannel, DHCP and relay, PAT, static NAT, standard and extended ACLs, port security, SSH) plus phases 1 and 2 of the library expansion (native VLAN and trunk pruning, switch management access, locking down device access, OSPF router IDs and passive interfaces, per-VLAN root bridges, mapping a network with CDP, a small office build, floating static routes, how a router chooses a route, OSPF on a shared segment, LLDP, voice VLAN with an IP phone, dynamic NAT with a pool, named ACLs edited by sequence number, NTP and syslog, inter-VLAN routing on a Layer 3 switch, DHCP snooping, Dynamic ARP Inspection, IPv6 addressing, IPv6 static and default routes, HSRP)
- 35 troubleshooting incidents built from those labs (one or more for every build lab), each with three clues that cost rank points
- 2 capstones that build a whole network from factory defaults (a branch office; a campus core with a Layer 3 switch). They open with the step-by-step guide off
- CCNA 200-301 v1.1 objective tags on every lab, and a Study map by exam domain
- A simulated IOS-style console per device, with `?` help, Tab completion, abbreviations and history
- A network map that animates each ping, telnet or ssh along the path the packet really takes, and labels where and why it fails
- Step-by-step instructions per task (switchable, and can pop out into its own window), plus a "why" for every task and every command
- Lessons that teach the concept before the lab (pilot: DHCP only): explanation, a step-through animation on the lab's map, key terms, exam notes, common mistakes and a quick check
- A subnetting drill and a 28-question theory check
- Stage ranks (S to D), XP and levels, combos, trophies, generated sound effects
- Movable, resizable, snapping windows with a saved layout. Dropped windows swap, split or fill the space, and shared edges resize like dividers
- A sandbox: place devices (including a Layer 3 switch), choose ports when cabling, zoom and pan, notes, starter kits, save and load files, undo, and four goal-checked challenges

## Where everything is

| Thing | Location |
| --- | --- |
| Repo | https://github.com/yasukeblk/Lab4Net (public) |
| Working branch | `main` |
| Local clone | `Documents/Lab4Net` on Yasuke's desktop |
| Live copy | LXC container "Lab4Net" on his Proxmox server, `http://192.168.1.106/`, repo cloned at `/opt/lab4net`, served by nginx. Only reachable on his home network. |
| Other branch | `chatgpt/improvements` is ChatGPT's independent line of work. Never merge it into `main`. |

The whole app is one self-contained file, `index.html`. There is no build step, no backend and no dependencies. Fonts are embedded as base64. Opening the file in a browser runs it.

Deploying to the container, once a change is pushed:

```
cd /opt/lab4net && git checkout main && git pull && bash install-lxc.sh
```

Then he hard-refreshes the page.

## How Yasuke works

- He does not write code. Give him finished results and plain-language summaries, mostly as short bullet lists.
- Do the work without asking permission for design or implementation choices. Tell him afterwards what you did and what you chose not to do.
- Every command block you show him needs a one-line label saying which machine it runs on (his desktop, the Proxmox host, or the Lab4Net container). He treats a missing label as dangerous.
- Only show deploy commands when a change is actually ready to deploy.
- Keep the "Still owed" list at the bottom of this file current, and repeat it at the end of each summary. Dropped follow-ups have burned him before.
- Report honestly what you verified and what you did not.

## The workflow if you are working in chat

This is how the project has run so far, and Yasuke wants it to continue the same way. You build and test in your own sandbox; Claude Code on his desktop commits and pushes; the container pulls.

1. Clone the public repo in your sandbox and work on `index.html` there. You cannot push, and you cannot reach his desktop or the container.
2. Run `node tests/labs.cjs`, `node tests/forwarding.cjs` and `node tests/curriculum.cjs` before handing anything over.
3. Check visual and interactive changes in a real browser. In the chat sandbox, `npm i @sparticuz/chromium puppeteer-core` gives a headless Chromium that works: launch it with `executablePath: await chromium.executablePath()` and `args: ['--no-sandbox','--disable-gpu','--single-process','--no-zygote']`, open the file, drive it, and take screenshots. `tests/ui.cjs` also runs there if you install `playwright-core` and point its `chromium.launch` at that same executable. The executable path sometimes comes back empty on the first call; it extracts to `/tmp/chromium`, so pointing at that path directly is reliable.
4. Give him a zip containing only the files that changed, laid out as they sit in the repo.
5. Give him a prompt to paste into Claude Code that says: fetch and pull `main`, copy the files from the zip in his Downloads folder over the repo, confirm `index.html` is the exact byte size you state, run the three Node tests, commit with a given message, push, and report the commit hash. Stating the byte size matters: Code once picked up an older zip of the same name.
6. Give him the container command from the section above, labelled for the Lab4Net container.
7. If he says the change is not showing, clone the repo again and compare `main` with your build before guessing. Twice the cause was that the build had not been pushed, and once the container was still on ChatGPT's branch.

Publishing the page as an artifact in chat as well lets him see a change before deploying it.

## Design direction

He chose this after several rounds, so do not restyle without being asked:

- A remastered arcade game, in the spirit of Streets of Rage 4: an old game brought back with modern art, lighting and shadows.
- Neon night palette, dark panels with soft shadows and coloured glows, bold italic arcade lettering, chunky slanted buttons, comic hit-sparks.
- The console stays a retro amber CRT. The DOS-style path line and the boot screen stay.
- Desktop is the target. The phone layout only has to stay usable.
- He wants lots of animation, but everything must be disabled under `prefers-reduced-motion`.

Design tokens are CSS variables on `:root` at the top of the stylesheet (`--night`, `--panel`, `--yel`, `--mag`, `--cy`, `--go`, `--bad`, `--ph` and so on). Display type is Barlow Condensed italic (`--px`), console and code are VT323 (`--mono`), reading text is IBM Plex Sans (`--ui`). Window title bars are colour-coded: Mission gold, Checklist orange, Network map magenta, Console blue, Guide green.

## Map of index.html

Line numbers are approximate. Search for the markers rather than trusting them.

| Lines | What |
| --- | --- |
| 1 to 456 | `<head>` and the stylesheet. The first six `@font-face` lines are base64 font data, tens of kilobytes each. Never print or read them in full; skip them with a line range or grep. |
| 458 to 488 | Page markup: header, status line, the windows, dialog, overlays |
| 490 to 1252 | The simulator, between `//ENGINE-START` and `//ENGINE-END` |
| 1252 to end | The interface |

### Engine (pure logic, no DOM)

In file order:

1. Core: address helpers (`ip2n`, `n2ip`, `lenMask`, `netOf`), device constructors (`mkRouter`, `mkSwitch`, `mkPC`, `mkNet`, `link`, `setIp`, `addIf`), link state (`ifUp`), Layer 2 flooding with VLANs and trunks (`l2peers`), routing (`routes`, `nextHop`, OSPF), the command table, the parser, and labs 1 to 6.
2. `// ---------- v2 engine`: ACLs, NAT, packet forwarding (`fwd`, `reach`), DHCP, port security, SSH, CDP, spanning tree (`stpCalc`), EtherChannel (`bundled`), `runningConfig` extras, per-command explanations (`WHYC`, `whyOf`), and the later labs.
3. `// ---------- step-by-step instructions`: `STEPS` (keyed by lab title) and `guideFor`.
4. `// ---------- CCNA objective map and troubleshooting incidents` (between `//CCNA-CURRICULUM-START` and `//CCNA-CURRICULUM-END`, just before `guideFor`): `CCNA_SCOPE`, `CCNA_DOMAINS`, `CCNA_OBJECTIVES`, `CCNA_LAB_MAP` (sets `l.ccna` and `l.kind='build'`), and `INCIDENTS`. Each incident spec names a `base` lab, a `fault` (commands applied after the base solution), a `repair` (becomes `solution`), its own `steps`, three `hints` and a `lesson`. Incidents are appended to `LABS` with `kind:'incident'`, `group:'Troubleshooting'`, `baseTitle`, and the base lab's `checks`, `pos` and `addr`. Their steps are written inline, not in `STEPS`.
5. `//LIBRARY-START` to `//LIBRARY-END`, straight after the curriculum block: the lab library expansion. Helpers: `Cn(modes, pattern, fn, types, first)` registers a command after the "why" recorder has already run (so `s.last` still works) and can put it ahead of general patterns; `cfg(net, {dev:[commands]})` configures a fresh build through real IOS commands (it throws if any is rejected, so a typo in a build fails loudly); `addLab(lab, steps)` stores the guide in `STEPS`, sets `ccna` from `CCNA_LAB_MAP` and `kind:'build'`, and appends to `LABS`. New objective IDs, `CCNA_LAB_MAP` entries and `WHYC` entries are added at the top of the block or beside each lab. A lab may set `hidePorts:true` to hide port names on the map.

The `// ---------- v3 engine` section, just before the "why" recorder, holds commands added for the library (`clear ip ospf process`, `show ip protocols`, `show ip ospf`) and an `execLine` wrapper that logs native VLAN mismatches. The library block adds a second `execLine` wrapper that logs OSPF adjacency changes. Other library changes were made in place: `type7`/`pwText` near the top (type 7 passwords), `isPassive` and the router-ID lock (`ospf.active`) beside `ospfNeighbors`/`routerId`, `vtyDenied` beside `reach` (access-class), `cdpPeers` with the CDP commands, and the `root primary` macro with the spanning-tree commands.

Phase 2 changed the core in place too:

- Routing: `routes()` builds a real table, one route per prefix with the lowest administrative distance (connected 0, static `ad` default 1, OSPF 110). `staticRoutes()` decides which statics are usable (exit interface up, or next hop on a connected subnet). `nextHop()` does longest match and returns `{ifc, nh, proxy, route}`; `fwd()` uses proxy ARP for exit-interface-only statics. Statics are `{net, len, nh, ifn, ad, name}`.
- OSPF: `ospfRoutes()` is Dijkstra over `ospfCost()` (interface `ospfCost`, else reference bandwidth `ospf.refBw` / speed). Interfaces may carry `ospfArea` (from `ip ospf PID area N`), `ospfPrio`, `ospfNet` ('point-to-point'). `ospfElect(net)` runs the RFC 2328 election after every command (an `execLine` wrapper in the v3 section) and keeps state in `net.ospfDR[segment]`; `ospfRole(net, d, ifc)` reads it. `ospf.resetting` is set briefly by `clear ip ospf process` so the router leaves every segment.
- Layer 2: access ports may have `voiceVlan`. Phones are `pc` devices with `phone:true`, a PC port `FastEthernet1` and a CDP name `cdpId`; `phoneVlan()` gives the VLAN a phone tags with, and `l2peers()` bridges through the phone.
- NAT: `nat.pools`, pool rules `{acl, pool, overload}`, one-to-one bindings in `nat.dyn`, `nat.hits`/`misses`. `natOut()` returns a reason string when it has to drop a packet. Echo requests use query ID 1 as their "port".
- ACL entries have `seq` and are kept sorted; `aclLine()` formats standard entries for show access-lists.
- Phase 3: `isL3(d)` (a router, or a switch with `ipRouting`) replaced `type==='router'` wherever routing happens; switch ports may be `routed`; Layer 3 switches have `l3:true` and come from `mkL3Switch()`. DHCP: `dhcpCandidates()` gathers every server that can answer and `snoopPath()` applies snooping and option 82; bindings live in `switch.snoop.bind`. `daiBlock()` is called from `fwd()` for both ends of each hop. HSRP: `hsrpElect(net)` keeps `net.hsrp`, `hsrpVip()` lets the active router own the virtual IP (used by `ownsIp()` and `fwd()`). IPv6 lives in its own section of the library block: `parse6`/`fmt6`, `eui64`, `macIf` (a MAC per router port), `linkLocal`, `routes6`/`nextHop6`/`fwd6`/`reach6`, interface fields `v6`, `ll`, `v6on`, device fields `v6routing`, `statics6`, `gw6`. The `<ip6>` argument token is handled in `matchPat()`.
- Phase 4: ports can be `errdis` (a reason: bpduguard, channel-misconfig, psecure-violation); `ifUp()` treats them as down at both ends. `errScan()` runs after every command from the outermost `execLine` wrapper, logs the real messages, and a port is recovered by `shutdown` then `no shutdown` (the scan trips it again if the cause remains). Port security keeps `ps.macs` (`{mac, kind: dynamic|sticky|static}`), `ps.viol`, `ps.blocked` (restrict/protect drops, checked in the `daiBlock` wrapper). OSPF interfaces have `ospfHello`/`ospfDead` (`ospfTimers()`), which must match; a network-type mismatch now forms the adjacency but SPF skips that link. `addIncident(spec)` appends an incident like the original six, with an optional `setup` applied before the `fault`.
- Phase 5: `addCapstone(l, steps)` is `addLab` with `capstone:true` and group `Capstone` (kind stays `build`, so code that needs build labs only filters `!l.capstone`). Router subinterfaces may have `nativeTag` (`encapsulation dot1Q N native`): `l2peers` sends untagged frames on the parent port to it. `dhcpCandidates()` applies the client-side interface's inbound ACL to the discover. The capstone guide default lives in its own block just before `</script>`, which wraps `openLab` and `openSandbox` and listens on `#guideToggle` in the capture phase.
- In the library block: `lldpPeers()`, `mkPhone()`, `together(net, fn)` (run checks as if the traffic were simultaneous, then restore NAT and ACL counters), `whileDown(net, dev, ifn, fn)` (run a check with a link shut, then restore it), `udpOk()`, `ntpState()`, `logEvent()` and the outermost `execLine` wrapper, which logs link changes on the far-end device, adds %SYS-5-CONFIG_I, applies timestamps and sends syslog.

Key facts:

- A network is `{devs:{name:device}, links:[...]}`. A device has `type` (`router`, `switch`, `pc`), `hostname`, `ifs` keyed by full interface name, plus feature state (`statics`, `ospf`, `vlans`, `acls`, `nat`, `dhcp`, `stp`, `users`, `lines`). Servers are `pc` devices with a `services` port list.
- Commands are registered with `C(modes, pattern, handler, deviceTypes)`. Modes are `user`, `priv`, `config`, `if`, `vlan`, `line`, `ospf`, `acl`, `dhcp`, `pc`. Pattern tokens are literal keywords (prefix-matched, which gives abbreviations) or `<ip>`, `<n>`, `<w>`, `<rest>`, `<rest?>`. The first matching entry wins, so order matters.
- `execLine(net, device, session, line)` runs one command and returns output lines. A session is `{mode, ctx}`.
- `reach(net, src, dstIp, proto, port)` forwards a packet and its reply through routing, ACLs and NAT. When called from a live command it records `TRACE`, which the map animation and the trace panel read.
- Several engine functions are wrapped later in the same section by reassigning the function name (`run`, `ifUp`, `promptOf`, `runningConfig`, `canPing`, `tracePath`, `execLine`). The last definition is the live one.
- OSPF state: `ospf.rid` is the configured router-id, `ospf.active` the one in use (set when the process starts, changed by `clear ip ospf process`); `routerId(d)` returns the active one. Use `isPassive(d, ifname)`, not `ospf.passive`, because `passive-interface default` keeps a `nonPassive` list instead.

A lab is an object in `LABS`:

```
{ title, group, brief, pos:{device:[x,y]}, start, build(), addr:[[device, interface, address]],
  tasks:[html], why:[text], checks:[[description, net=>boolean]], solution:{device:[commands]} }
```

`steps` is filled from `STEPS[title]`: one entry per task, written as `"DEV: cmd | cmd ; DEV2: cmd"`. A command starting with `#` is a note, not a command. Every lab must have exactly one `why` and one `STEPS` entry per task. Every lab needs at least one `ccna` objective that exists in `CCNA_OBJECTIVES`. Keep lab titles stable: progress, ranks and journals are keyed by title.

### Interface

The base layer was written by ChatGPT on top of the original: global state (`cur`, `progress`, `drafts`), `openLab`, `replay`, `saveWork`, `renderAll`, `renderLabs`, `renderBrief`, `renderDrill`, `renderQuiz`, `drawTopo`, `fly`, `burst`, `playTrace`, `renderTerm`, `execute`, `select`, `library`, `help`, `transfer`, `dialog`, `notify`. A lab's saved work is its command journal, replayed onto a fresh `build()`.

Later blocks, each under a `// ----------` comment, extend it in this order:

1. Guide switch (`stepsHtml`, `stepsBlock`), defined just before the first `openLab` call
2. Menu clock and boot screen
3. Pop-out guide window and the window manager (move, resize, snap, saved layout). On drop, `plan()` decides swap, split or fill (`freeRect()`) and `grow()` lets a flush neighbour take the space left; `links()` finds every window on a resized edge so it moves like a divider; `bounds()` takes the outer edges from where the windows already sit. Alt skips all of it. `ui.cjs` drags real windows to test it
4. Rewards (ranks, XP, levels, combos, trophies, sound, device hover card)
5. Troubleshooting clues, CCNA tags and Study map. `ccnaTags`, `clueHtml`, `bindClues`, `clueLevel`, `setClueLevel` and `studyMap` are top-level function declarations so the base `renderBrief` can call them on the first render. This block also wraps `openLab` to hide clues on a fresh start. The rewards block exposes `window.l4nFun = {run, save}` so clue use reaches the current run.
6. Sandbox (devices, cabling, zoom and pan, notes, kits, challenges, files, undo). Undo keeps up to 80 snapshots of devices, links, notes, challenge and journal; `mark()` runs from `saveDef` and after each sandbox command.
7. Backup (adds ranks, layout, sandbox and incident clues to Transfer progress)
8. Capstone guide default
9. Lessons. `LESSONS` is keyed by build lab title: `name`, `mins`, `sections` ([heading, html]), `story` (steps with `path` of device names, `cls` req/rep, `at`, `label`, `good`/`bad`, `t` title, `x` text), `terms`, `exam`, `mistakes`, `quiz` ([question, options, correct index, explanation]; the display order is rotated). The block wraps `renderBrief` (lesson replaces the mission window's content, or a card is inserted after the CCNA tags) and `openLab` (opens on the lesson until it is read). Incidents use their `baseTitle`'s lesson; capstones have none. `window.lessonFor(lab)` returns a lab's lesson

**The pattern to know:** these blocks do not edit the base functions. They wrap them by reassigning the name, for example `const ex0 = execute; execute = function(line){ ex0(line); ... }`. `renderAll`, `openLab`, `execute`, `celebrate`, `library`, `renderBrief`, `renderTerm`, `drawTopo`, `select`, `renderLabs` and `transfer` are all wrapped, some more than once. The outermost wrapper is the one defined last. Before changing behaviour, grep for every `name=function` to see the whole chain.

Browser storage keys: `lab4net-workspace-v1` (progress, journals, last lab), `lab4net-layout-v3`, `lab4net-fun-v1`, `lab4net-sandbox-v1`, `lab4net-guide`, `lab4net-guide-pop`, `lab4net-last`, `lab4net-incident-hints` (clues revealed per incident), `lab4net-capstone-guide` (guide switched on per capstone), `lab4net-lessons-v1` (lessons read and quick-check answers), `lab4net-pending` (extras from an imported backup, applied on the next load), and `l4n-boot` in session storage.

## Verifying changes

Run these before every commit. All four pass on `main` at the end of phase 5.

```
node tests/labs.cjs
node tests/forwarding.cjs
node tests/curriculum.cjs
node tests/ui.cjs
```

Current result: 73 labs (36 build, 35 incidents, 2 capstones), 416 checks, 1439 guide commands.

On Yasuke's desktop there is no Node install. Claude Code runs the tests with Deno's Node-compatible binary (`%LOCALAPPDATA%\deno\node_compat_bin\node.exe`) and runs `ui.cjs` with Playwright installed by Deno into a folder outside the repo, linked in as `node_modules` (git-ignored), with `LAB4NET_BROWSER_CHANNEL=msedge`.

- `labs.cjs` builds every lab, runs its solution and asserts every check passes, then does the same following the step-by-step instructions. It also runs in GitHub Actions on every push.
- `forwarding.cjs` covers routing, ACL direction, static NAT, closed ports, VLAN paths and link failure.
- `curriculum.cjs` checks objective mappings and that every incident starts with a real failing service and is fixed by its repair without breaking any original check. It runs in GitHub Actions.
- An incident's `symptom` is either `[source, target, proto, port]` (a packet test with `reach`) or a function of the network for services that are not a single packet (CDP or LLDP discovery, NTP, IPv6, a preferred path). The curriculum test checks it fails after the build and works after the repair, and compares configuration before and after the probe, ignoring counters, logs and NAT translations.
- `ui.cjs` reopens Static NAT for its trace checks, because incidents now come after it in the lab list.
- `ui.cjs` also checks the capstone guide default: off on opening a capstone, remembered per capstone once switched on.
- `ui.cjs` drives the real page in a browser at desktop and phone sizes. It needs Playwright and a Chromium-family browser installed locally (`npm i -D playwright`), and it is not part of CI.

For anything visual, open the page in a real browser and look at it. Earlier in this project several bugs were only caught by screenshots or by driving the page: a CSS class named `.switch` that restyled the switch device icon, a transformed element that covered a hidden checkbox, and a results dialog that blocked later clicks.

## Rules that keep it working

1. Every lab must stay completable and gradable. Do not weaken a check to make a test pass.
2. `git pull && bash install-lxc.sh` on a plain Debian container must keep working. If you ever split the file, update `install-lxc.sh`, the `Dockerfile` and the `README`.
3. Keep it fully offline: no external requests, fonts stay embedded.
4. Keep the "why" explanations. Understanding the reason for each step is the point of the project.
5. Do not open modal dialogs or reload the page automatically after an action; both have broken the browser test. Non-modal cards and a "Reload now" button are the established answers.
6. If you change the default size of a window, bump the layout storage key so saved layouts re-derive.
7. Ctrl+Z inside the console is IOS `end`. Sandbox undo only takes Ctrl+Z when focus is outside inputs.
8. `ui.cjs` relies on some specifics: the text "Reply received", the `.selring` class having no animation under reduced motion, task checkboxes being clickable, and the page not navigating mid-run.
9. New CSS class names must not collide with device type names (`router`, `switch`, `pc`, `srv`), which are used as classes on map devices and console tabs.
10. Update `CHANGES.md` with each change, in plain language.

## Known limits

- The simulator implements the commands the labs need, not all of IOS. Anything else returns "Invalid input".
- `?` help lists options without descriptions, there is no `^` error marker, ambiguous abbreviations silently take the first match, and there is no `--More--` paging or `| include`.
- Spanning tree is calculated and shown per VLAN, and labs check it, but the data path ignores blocking: a ping takes any VLAN-valid path.
- `clear ip ospf process` answers its own "Reset ALL OSPF processes?" prompt with yes. Hello and dead timers must match, as on a real router; a network-type mismatch forms the adjacency but the link is left out of SPF, so routes through it disappear. Authentication is not modelled. Equal-cost paths are not load-shared; one is used.
- Syslog messages appear on the console of the device where the command was typed; other devices only log them (show logging, syslog server). The NTP clock stays synchronised as long as its server is configured. Log timestamps use the browser's clock.
- show access-lists lists standard entries in sequence order; real IOS may list host entries first.
- `enable` and line passwords are stored and graded but never prompted for.
- No wireless. IPv6 has static routing only: no OSPFv3, no DHCPv6, no IPv6 ACLs. Only the Layer 3 switch model (a 3560) routes; 2960s reject ip routing and static routes.
- HSRP has no object tracking and fails over at once rather than after the 10-second hold time. The DHCP snooping rate limit is stored and shown but not enforced. DAI has no ARP ACLs or extra validation options.
- Sandbox challenges do not award XP or trophies. Incidents are fixed scenarios, not randomised faults. Sandbox device models are fixed (3 or 5 port routers, 10 or 26 port switches).
- Ranks, XP and trophies live in the browser. Transfer progress carries them, but a different browser starts fresh until an import.

## ChatGPT's branch

`chatgpt/improvements` has diverged and Yasuke compares the two by eye. Its first round (saved work, lab library, command guide, trace diagnostics, static NAT lab, theory check, the test files) was folded into `main` by hand. Its later commits add a sandbox, Cisco and Juniper hardware profiles with a Junos interpreter, an AI tutor that calls OpenAI through a server-side relay, a CCNA objective map and six fault investigations. The objective map, study map, the six incidents with their three-step hints, and an undo idea were rebuilt on `main`. Deliberately left out: the AI tutor (needs a backend and key), the Juniper/Junos work (not CCNA), the Matrix design and the sandbox ping probe. If Yasuke asks for one of its features, read the branch and rebuild the feature here; a git merge cannot combine two single-file apps. Note that the AI tutor needs a backend and an API key, and `main` is a static page.

## Still owed

Carry this list forward and keep it in every summary.

- `enable` and console password prompts
- Lessons for the other 35 build labs, once Yasuke has reviewed the DHCP pilot (format, length, where it opens)
- A fuller theory question bank (28 questions so far)
- XP and trophies for sandbox challenges
- Closer-to-real `?` help: descriptions, the `^` marker, "% Ambiguous command", `| include` and `| begin` (offered, not yet confirmed)
- Whether the pop-out guide should also open in a separate browser window for a second monitor (waiting on his decision)
- Randomised faults for incidents (every incident is still a fixed scenario)
- Make the data path follow spanning-tree blocking, so a ping's animated path matches `show spanning-tree`

His most recent direction was to fold the best of ChatGPT's branch into `main` (done in the "Troubleshooting incidents" build), "continue to build" on the sandbox, and make the app "more rewarding and fun".
