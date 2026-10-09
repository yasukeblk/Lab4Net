# Lab4Net handoff

State as of the prompts build (passwords, Telnet/SSH sessions, reload) on `main` (9 Oct 2026). Read this before touching anything. The lab library is being expanded phase by phase following `docs/LESSONS-SPEC.md`.

## What this is

Lab4Net is a browser-based lab simulator for the Cisco CCNA exam, modeled on Boson NetSim with a Packet Tracer style sandbox. The owner, Yasuke, is the learner and the only user. He is studying for the CCNA and wants the tool to be accurate first, then rewarding and fun to use.

It currently has:

- 36 graded build labs: the original 15 (device basics, VLANs, trunking, router-on-a-stick, static routing, OSPF, spanning tree, EtherChannel, DHCP and relay, PAT, static NAT, standard and extended ACLs, port security, SSH) plus phases 1 and 2 of the library expansion (native VLAN and trunk pruning, switch management access, locking down device access, OSPF router IDs and passive interfaces, per-VLAN root bridges, mapping a network with CDP, a small office build, floating static routes, how a router chooses a route, OSPF on a shared segment, LLDP, voice VLAN with an IP phone, dynamic NAT with a pool, named ACLs edited by sequence number, NTP and syslog, inter-VLAN routing on a Layer 3 switch, DHCP snooping, Dynamic ARP Inspection, IPv6 addressing, IPv6 static and default routes, HSRP)
- 35 troubleshooting incidents built from those labs (one or more for every build lab), each with three clues that cost rank points
- 2 capstones that build a whole network from factory defaults (a branch office; a campus core with a Layer 3 switch). They open with the step-by-step guide off
- CCNA 200-301 v1.1 objective tags on every lab, and a Study map by exam domain
- Real-life ping and traceroute: output plays live, ARP loses the first echo through a cold router, routers send unreachables (`U.U.U`, `!H`, `!A`), Windows quirks are kept, Ctrl+C or Ctrl+Shift+6 stops a run
- Switching realism: each switch learns a MAC address table from the frames the console sends, floods unknown destinations and ARP requests (the map shows the flood), ages entries out, and frames follow the spanning tree, so the animated path matches `show spanning-tree`. `show mac address-table` and friends, `clear mac address-table dynamic`, static entries and aging time
- Prompts: `enable` asks for the secret, the console logs out on `exit` and asks for the line password or local login, Telnet and SSH open a real session on the far device (its prompt, its commands, VTY login, `login block-for` quiet mode, Windows and OpenSSH messages from PCs), `reload` asks Save?/confirm and restores the saved config, `copy run start` asks for the filename
- An IOS-style console that errors like IOS (`^` marker, % Incomplete, % Ambiguous, hostname lookup on a typo), with `| include/exclude/begin/section/count` and `?` descriptions; PCs answer like Windows
- The step-by-step guide can open in its own browser window for a second monitor
- A simulated IOS-style console per device, with `?` help, Tab completion, abbreviations and history
- A network map that animates each ping, telnet or ssh along the path the packet really takes, and labels where and why it fails
- Step-by-step instructions per task (switchable, and can pop out into its own window), plus a "why" for every task and every command
- 54 lessons that teach the concept before the commands: one per build lab (opens on the first visit, with a step-through animation on the lab's map) and 18 topic lessons for exam objectives with no lab, in a Lessons view and on the Study map. Each has key terms, exam notes, common mistakes and a quick check
- A subnetting drill and a 28-question theory check
- Stage ranks (S to D) scored on results, not speed or command count; XP and levels, combos, trophies, generated sound effects
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
2. Run `node tests/labs.cjs`, `node tests/forwarding.cjs`, `node tests/curriculum.cjs`, `node tests/lessons.cjs` and `node tests/ping.cjs` before handing anything over.
3. Check visual and interactive changes in a real browser. In the chat sandbox, `npm i @sparticuz/chromium puppeteer-core` gives a headless Chromium that works: launch it with `executablePath: await chromium.executablePath()` and `args: ['--no-sandbox','--disable-gpu','--single-process','--no-zygote']`, open the file, drive it, and take screenshots. `tests/ui.cjs` also runs there if you install `playwright-core` and point its `chromium.launch` at that same executable. The executable path sometimes comes back empty on the first call; it extracts to `/tmp/chromium`, so pointing at that path directly is reliable.
4. Give him a zip containing only the files that changed, laid out as they sit in the repo.
5. Give him a prompt to paste into Claude Code that says: fetch and pull `main`, copy the files from the zip in his Downloads folder over the repo, confirm `index.html` is the exact byte size you state, run the Node tests, commit with a given message, push, and report the commit hash. Stating the byte size matters: Code once picked up an older zip of the same name.
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
2. `// ---------- v2 engine`: ACLs, NAT, packet forwarding (`fwd`, `reach`), DHCP, port security, SSH, CDP, spanning tree (`stpCalc`: per VLAN, bundled EtherChannel members count as their port-channel with the combined-bandwidth cost, switches that cannot hear each other each elect their own root, `info[sw].root`), EtherChannel (`bundled`), `runningConfig` extras, per-command explanations (`WHYC`, `whyOf`), and the later labs.
3. `// ---------- step-by-step instructions`: `STEPS` (keyed by lab title) and `guideFor`.
4. `// ---------- CCNA objective map and troubleshooting incidents` (between `//CCNA-CURRICULUM-START` and `//CCNA-CURRICULUM-END`, just before `guideFor`): `CCNA_SCOPE`, `CCNA_DOMAINS`, `CCNA_OBJECTIVES`, `CCNA_LAB_MAP` (sets `l.ccna` and `l.kind='build'`), and `INCIDENTS`. Each incident spec names a `base` lab, a `fault` (commands applied after the base solution), a `repair` (becomes `solution`), its own `steps`, three `hints` and a `lesson`. Incidents are appended to `LABS` with `kind:'incident'`, `group:'Troubleshooting'`, `baseTitle`, and the base lab's `checks`, `pos` and `addr`. Their steps are written inline, not in `STEPS`.
5. `//LIBRARY-START` to `//LIBRARY-END`, straight after the curriculum block: the lab library expansion. Helpers: `Cn(modes, pattern, fn, types, first)` registers a command after the "why" recorder has already run (so `s.last` still works) and can put it ahead of general patterns; `cfg(net, {dev:[commands]})` configures a fresh build through real IOS commands (it throws if any is rejected, so a typo in a build fails loudly); `addLab(lab, steps)` stores the guide in `STEPS`, sets `ccna` from `CCNA_LAB_MAP` and `kind:'build'`, and appends to `LABS`. New objective IDs, `CCNA_LAB_MAP` entries and `WHYC` entries are added at the top of the block or beside each lab. A lab may set `hidePorts:true` to hide port names on the map.

6. `// ---------- real-life ping and traceroute`, just before the step-prompt recorder at the end of the engine: `pingRun` (per-echo result from `reach`, plus ARP drops), `iosPing`, `winPing`, `traceRun`, `iosTrace`, `winTrace`, `pingOpts`, ARP helpers (`arpWalk`, `arpPrune`, `arpLearn`, `arpRows`) and `pq` (runs `fwd` quietly without touching NAT tables or counters). Each device's ARP cache is `d.arpc` ({ip: interface name}); entries drop when their interface goes down or leaves the subnet. The four original `ping`/`traceroute`/`tracert` handlers now just call these. Handlers put timing on `s.pace = {t, abort}`: one `t` entry per output line (a delay in ms, `{d, pkt}`, `{chars:[ms…], pkt}` or `{parts:[[ms, text]…]}`), and `abort(n)` returns the summary lines after n echoes. Engine callers ignore `s.pace`.

7. `// ---------- console realism`, after the ping block: the parser helpers used by `run()` (`patsFor`, `depthOf`, `shadowed`, `ambiguousAt`, `badIndex`, `caretAt`, `withCaret`, `parseFail`, `hostLookup`, `resolveHost`, `pipeRun`), `KWHELP` (the `?` descriptions), and the everyday commands (`show version`, `show vlan id`, `show running-config interface`, `show interfaces description`, duplex/speed/bandwidth, `ip host`, `ip name-server`, `security passwords min-length`, `enable algorithm-type`, `login block-for`, `debug ip icmp`, PC `hostname`/`netstat`/`help`). It wraps `ospfCost` (bandwidth), the `show interfaces` handler (hardware/MTU/duplex lines), the password handlers (min-length) and `runningConfig`.

How `run()` decides now: output modifiers first (`pipeRun`). Then it takes the first matching pattern, skipping any pattern that treats a token as an abbreviation when another pattern has that token as an exact keyword (`shadowed`). If an abbreviation fits two keywords it prints `% Ambiguous command:  "<line>"` (`ambiguousAt`; aliases where one keyword is a prefix of another, like `run`/`running-config`, count as one). If nothing matches it calls `parseFail`: Windows messages in `pc` mode, `% Incomplete command.` when a pattern needed more, a hostname lookup for one unknown word in user/priv mode, otherwise a `^` line plus `BAD`. `env.raw` and `env.p0` (prompt length) are set on the first `run` of an `execLine`, so nested runs (`do`, pings by name, pipes) still place the caret correctly. Handlers that emit `BAD` get a caret under the last word via `withCaret`. Any test that compared output to `BAD` alone must now expect the caret line first.

`debug ip icmp` puts messages on `d.conq` (from `pingDebug`, called by `pingRun` when `LIVE`). The interface moves them into that device's console tab with `drainConsoles`: after each command (other devices immediately, the typing device once its output has finished playing) and during replay.

8. `// ---------- switching realism`, after console realism and just before `//ENGINE-END`: the MAC address table. Each switch has `d.mact` (`[{mac, vlan, ifn, kind: DYNAMIC|STATIC, t}]`) and `d.macAging` (seconds, default 300). `macTx(net, d, ifc)` is the source MAC a device uses on an interface (hosts one address, router and switch ports their own via `macIf`, SVIs and port-channels the chassis address); `macLearn`, `macPrune` (age, port down, VLAN gone; also run after every command by an `execLine` wrapper) and `macLookup` (the switch's own address is a CPU entry). `stpBlocked(net, vlan)` is the set of `switch|port` the spanning tree blocks; `l2peers` consults it, so a blocked port carries nothing. `l2frame()` is called from `fwd()` for every Layer 2 hop of a live console command (`LIVE && L2LIVE`; `L2LIVE` is set by the `run` wrapper, so grading, tests and `pq` never learn): it decides whether the sender had to ARP (a broadcast every switch in the VLAN learns from; `L2WARM` marks the reply's first hop as already resolved), otherwise learns the sender on each switch's ingress port and floods at the first switch that does not know the destination. Events go on `hops.l2` as `{at, seg, from, to, nh, srcMac, dstMac, arp, flood, sw:[{sw, vlan, out, known}], edges:[[from, to, blocked]]}`; `l2peers` results now carry `trail` (per switch: `sw, vlan, inp, outp`) and the array has `edges` (every link the flood reached). `dhcpRenew` is wrapped so a lease learns the client and the answering server or relay. The commands (`show mac address-table …`, `show mac-address-table`, `clear mac address-table dynamic …`, `mac address-table static|aging-time`) are registered here with `Cn`; `globalExtra` is wrapped for the running-config.

9. `// ---------- prompts`, after the switching block and just before `//ENGINE-END`: questions and remote sessions. `ask(s, text, on, mask)` puts `s.prompt = {text, mask, on(answer, env)}` on a session; the base `execLine` feeds the next line to `on` instead of parsing it (so every wrapper still runs), and maps the line `<cr>` (the `CR` constant, defined at the top of the engine) to an empty line, which is how guides, tests and journals press Enter. `s.remote = {d, s, ip, proto, win, from, user}` sends lines to the far device's own session (`vty:true`); `closeMsg(R)` is printed when it closes (`exit` sets `s.closed`), the far device's syslog lines are moved to its `conq` unless `terminal monitor` set `s.termMon`, and `s.pace`/`s.last` are copied back. `promptOf` is wrapped to show the prompt text or the far prompt; `effSess`, `effPair`, `effPrompt` follow the chain for the UI. `lineLogin(d, kind)` says what a line asks for; `authLine(d, sIn, sTo, kind, done, fail, fixedUser)` runs the three-try password or local login; `conLogout`/`conLogin` handle the console (Press RETURN, banner, User Access Verification, "% Login disabled on line 0"); `vtyOpen(e, ip, proto, user)` opens Telnet/SSH (IOS or Windows/OpenSSH messages, `knownHosts` on PCs, `d.vtys` for `show users`); `loginFailed`/`loginOk`/`quietMode` implement `login block-for` with `d.loginFails`, `d.quietUntil`, `d.loginLog`. Saved configuration: `snapBoot(net, d)` stores `d.boot` (a `deepClone` of the device) and `d.bootCfg` (the running-config text); `mkNet` is wrapped to snapshot factory devices (`d.factoryCfg`) and every lab's `build` is wrapped to snapshot after the build and set `d.startup` when the build configured anything; `saveCfg` (copy run start after the filename prompt, write) refreshes both; `reload` asks Save? when `cfgText` differs from `bootCfg`, then `doReload` calls `restoreBoot` (puts the clone back, re-links from `net.links`, `clearVolatile` drops ARP, MAC, logs, NAT, DHCP, snooping, err-disable, dynamic secure MACs, `ospf.active`, bumps `d.boots` so remote sessions into it drop), prints a paced boot (`BOOT_ROUTER`/`BOOT_SWITCH`) and the setup-dialog question for a never-saved factory device. The `enable`, `exit`, `telnet`, `ssh -l`, `copy running-config startup-config`, `write`, `show login` and `terminal monitor` handlers are replaced in place by looking them up in `CMDS`.

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
4. Rewards (ranks, XP, levels, combos, trophies, sound, device hover card). Ranks are scored on results only (Yasuke, 8 Oct: extra checking commands must never lower the grade). A clear means every check passes. Score starts at 100, minus walkthrough 25, guide 15, each incident clue 5, and 2 per rejected command after the first two (cap 10). A run with no check command of its own (`CHECKCMD`: show, ping, traceroute, tracert, telnet, ssh, ipconfig, arp) is capped at A. Time and command count are shown but never scored. Do not reintroduce a par or a speed penalty.
5. Troubleshooting clues, CCNA tags and Study map. `ccnaTags`, `clueHtml`, `bindClues`, `clueLevel`, `setClueLevel` and `studyMap` are top-level function declarations so the base `renderBrief` can call them on the first render. This block also wraps `openLab` to hide clues on a fresh start. The rewards block exposes `window.l4nFun = {run, save}` so clue use reaches the current run.
6. Sandbox (devices, cabling, zoom and pan, notes, kits, challenges, files, undo). Undo keeps up to 80 snapshots of devices, links, notes, challenge and journal; `mark()` runs from `saveDef` and after each sandbox command.
7. Backup (adds ranks, layout, sandbox and incident clues to Transfer progress)
8. Capstone guide default
9. Switching realism: replaces `playTrace` (each Layer 2 event in turn: an ARP broadcast or unknown-MAC flood fans out along `ev.edges` with `floodFly`, the ARP reply flies back, then the frame continues; `flyWay` per direction) and wraps `renderTrace` with a Switching section (one line per switch per direction, plus a `show mac address-table` tip after a flood). The rewards `sfx` object gained `flood`
10. Lessons. The data sits between `//LESSONS-DATA-START` and `//LESSONS-DATA-END` as `Object.assign(LESSONS,{...})` blocks. Lab lessons are keyed by build lab title; topic lessons have `topic:true` and `ccna` ids and no story. Fields: `name`, `mins`, `sections` ([heading, html]), `story` (lab lessons: steps with `path` of cabled device names, `cls` req/rep, `at`, `label`, `good`/`bad`, `t`, `x`), `terms`, `exam`, `mistakes`, `quiz` ([question, options, correct index, explanation]; the display order is a fixed shuffle per question). The block after the data wraps `renderBrief` (a lab lesson replaces the mission window, or a card is inserted after the CCNA tags; the Lessons view renders the list in the mission window and a topic lesson in the practice window), `openLab` (opens on the lesson until read), `renderLabs` (adds Lessons under Practice) and `studyMap` (adds topic lessons per domain). It also fills in `CCNA_OBJECTIVES` for every v1.1 objective. `window.lessonFor(lab)`, `window.openLesson(key)` and `window.lessonStats()` (used by XP and the Bookworm trophy) are exposed. New lessons follow `docs/LESSON-WRITING.md` and `tests/lessons.cjs`

**The pattern to know:** these blocks do not edit the base functions. They wrap them by reassigning the name, for example `const ex0 = execute; execute = function(line){ ex0(line); ... }`. `renderAll`, `openLab`, `execute`, `celebrate`, `library`, `renderBrief`, `renderTerm`, `drawTopo`, `select`, `renderLabs` and `transfer` are all wrapped, some more than once. The outermost wrapper is the one defined last. Before changing behaviour, grep for every `name=function` to see the whole chain.

The base `execute` plays any output that comes with `s.pace` through `streamStart` / `streamTick` / `streamStop` (`// ---------- live console output`, just before `renderTrace`). Only one output plays at a time (`STREAM`). `execute` calls `streamStop(false)` first, which finishes the current output instantly, so every wrapper still sees complete output. Ctrl+C (with no text selected in the input) or Ctrl+Shift+6 calls `streamStop(true)`. `renderTerm` hides the prompt while that session is playing. Reduced motion skips playback. `PACE_SCALE` (0.4) scales every engine delay, so playback runs at 40% of real time; Yasuke asked for it quicker than real (8 Oct). Sounds come from `window.l4nFun.sfx` (`echo`, `drop`, `unreach`) in the rewards block.

`execute` stores each command's full output on `s.lastOut`; the rewards wrapper reads that rather than the console lines, because paced output may still be playing.

The guide window: `index.html?guide` stops right after `//ENGINE-END` (the guide-only block throws a marked object, suppressed in its own `error` handler) after showing only `#guideWin`, so it never runs the app or touches storage. It talks to the main window on the `lab4net-guide` BroadcastChannel and, as a fallback, by `postMessage` with its opener. Messages: `hello` (sent on load and every 3 s; a main window that hears nothing for 9 s treats it as gone), `bye`, `dock`, `step {dev, cmd}` from the guide window; `show {html, title, keep}`, `ping`, `close` from the main window. On the main side, `extAlive` hides the in-page `#guideWin` and the inline steps; `renderGuideWin` sends the guide HTML whenever it changes; `openGuideWindow` is the "New window ↗" button; `setGuidePop(false)` closes the guide window.

Browser storage keys: `lab4net-workspace-v1` (progress, journals, last lab), `lab4net-layout-v3`, `lab4net-fun-v1`, `lab4net-sandbox-v1`, `lab4net-guide`, `lab4net-guide-pop`, `lab4net-last`, `lab4net-incident-hints` (clues revealed per incident), `lab4net-capstone-guide` (guide switched on per capstone), `lab4net-lessons-v1` (lessons read and quick-check answers), `lab4net-pending` (extras from an imported backup, applied on the next load), and `l4n-boot` in session storage.

## Verifying changes

Run these before every commit. All of them pass on `main`.

```
node tests/labs.cjs
node tests/forwarding.cjs
node tests/curriculum.cjs
node tests/lessons.cjs
node tests/ping.cjs
node tests/console.cjs
node tests/switching.cjs
node tests/prompts.cjs
node tests/ui.cjs
node tests/guidewin.cjs
```

Current result: 73 labs (36 build, 35 incidents, 2 capstones), 416 checks, 1465 guide commands; 54 lessons (36 lab, 18 topic).

On Yasuke's desktop there is no Node install. Claude Code runs the tests with Deno's Node-compatible binary (`%LOCALAPPDATA%\deno\node_compat_bin\node.exe`) and runs `ui.cjs` with Playwright installed by Deno into a folder outside the repo, linked in as `node_modules` (git-ignored), with `LAB4NET_BROWSER_CHANNEL=msedge`.

- `labs.cjs` builds every lab, runs its solution and asserts every check passes, then does the same following the step-by-step instructions. It also runs in GitHub Actions on every push.
- `forwarding.cjs` covers routing, ACL direction, static NAT, closed ports, VLAN paths and link failure.
- `lessons.cjs` checks every lesson (structure, markup, quiz answers, story steps on cabled devices) and that every build lab has one. It also takes draft files as arguments. It runs in GitHub Actions.
- `curriculum.cjs` checks objective mappings and that every incident starts with a real failing service and is fixed by its repair without breaking any original check. It runs in GitHub Actions.
- An incident's `symptom` is either `[source, target, proto, port]` (a packet test with `reach`) or a function of the network for services that are not a single packet (CDP or LLDP discovery, NTP, IPv6, a preferred path). The curriculum test checks it fails after the build and works after the repair, and compares configuration before and after the probe, ignoring counters, logs and NAT translations.
- `console.cjs` covers the parser errors (caret, incomplete, ambiguous, exact keywords, hostname lookup, Windows messages), output modifiers, `?` help and the everyday commands. It runs in GitHub Actions.
- `switching.cjs` covers the spanning-tree path (blocking honoured, root change, island roots, EtherChannel as one port), MAC learning from ARP and unicast frames, flooding, every `show mac address-table` form and layout, clear/static/aging, per-port router MACs, the HSRP virtual MAC, DHCP learning and a switch SVI as sender. It runs in GitHub Actions.
- `prompts.cjs` covers enable and line passwords, console logout and login (password, local, locked), Telnet and SSH sessions from IOS and from PCs, three-strike closes, syslog kept off the VTY, `login block-for`, the filename prompt, `write`, `<cr>`, and `reload` (Save?, confirm, restore, volatile state cleared, setup dialog). It runs in GitHub Actions.
- `guidewin.cjs` (optional, Playwright, like `ui.cjs`) serves the page over http and checks the guide window: open, steps to the console, lab changes, reconnect after reload, fall back when closed, dock.
- `ping.cjs` covers the ping and traceroute output rules (ARP first echo, unreachables, Windows quirks, extended options, abort summaries). It runs in GitHub Actions.
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
- No `--More--` paging. `?` descriptions cover the common keywords only; argument help is generic (A.B.C.D, WORD) rather than IOS's specific ranges. The ambiguity check only knows the keywords Lab4Net implements, so a few abbreviations that are ambiguous on real IOS (because of commands we lack) are accepted here.
- No interactive extended ping or `ping x source y` yet. Duplex and speed are saved and shown but a mismatch has no effect. No DNS server, so no `nslookup`; names resolve only from `ip host`. Only `debug ip icmp` exists. `show version` uses fixed models (2911, 2960-24TT, 3560-24PS) whatever the port count.
- Prompts: `exec-timeout` is stored but never fires; `show users` has no idle times; the setup dialog is not simulated (answer no); a reload's boot text is fixed per device type; Telnet to ports other than 23 stays a port test; the IOS SSH client has no host-key prompt (real IOS has none either), but a PC's known hosts are per device and never expire. Password answers are stored in the saved journal in clear text (it is a simulator).
- Spanning tree: frames follow it, so a blocked port carries nothing and the animated path matches `show spanning-tree`. Every switch always runs PVST or Rapid PVST on every VLAN; there is no `no spanning-tree vlan`, so a loop without STP (a broadcast storm) cannot be shown. Costs are the IEEE short values (19, 4; a two-link bundle 12 or 3). Rapid PVST+ and PVST+ converge instantly and identically.
- MAC address tables learn only from the traffic you send from a console (ping, traceroute, telnet, ssh, DHCP). A real switch would also learn its neighbours from their CDP, STP and other background frames, so a freshly opened lab has empty tables until you send something. IPv6 traffic does not learn. Aging uses the browser clock; after a reload the replayed journal relearns everything with fresh timestamps. No per-VLAN aging time, no `mac address-table notification`.
- `clear ip ospf process` answers its own "Reset ALL OSPF processes?" prompt with yes. Hello and dead timers must match, as on a real router; a network-type mismatch forms the adjacency but the link is left out of SPF, so routes through it disappear. Authentication is not modelled. Equal-cost paths are not load-shared; one is used.
- Syslog messages appear on the console of the device where the command was typed; other devices only log them (show logging, syslog server). The NTP clock stays synchronised as long as its server is configured. Log timestamps use the browser's clock.
- show access-lists lists standard entries in sequence order; real IOS may list host entries first.
- Ping and traceroute use ICMP for every probe (real IOS traceroute uses UDP), so an extended ACL that permits only some ICMP or UDP can disagree slightly with real gear. Unreachables are sent only for no-route and ACL drops; a failed next-hop ARP on a router gives timeouts. Extended ping has `repeat` and `size` but not `source`, and there is no interactive extended ping. IPv6 pings do not play live and have no ARP/ND first-echo loss. Playback runs at 40% of real time (`PACE_SCALE`), at Yasuke's request.
- No wireless. IPv6 has static routing only: no OSPFv3, no DHCPv6, no IPv6 ACLs. Only the Layer 3 switch model (a 3560) routes; 2960s reject ip routing and static routes.
- HSRP has no object tracking and fails over at once rather than after the 10-second hold time. The DHCP snooping rate limit is stored and shown but not enforced. DAI has no ARP ACLs or extra validation options.
- Sandbox challenges do not award XP or trophies. Incidents are fixed scenarios, not randomised faults. Sandbox device models are fixed (3 or 5 port routers, 10 or 26 port switches).
- Ranks, XP and trophies live in the browser. Transfer progress carries them, but a different browser starts fresh until an import.

## ChatGPT's branch

`chatgpt/improvements` has diverged and Yasuke compares the two by eye. Its first round (saved work, lab library, command guide, trace diagnostics, static NAT lab, theory check, the test files) was folded into `main` by hand. Its later commits add a sandbox, Cisco and Juniper hardware profiles with a Junos interpreter, an AI tutor that calls OpenAI through a server-side relay, a CCNA objective map and six fault investigations. The objective map, study map, the six incidents with their three-step hints, and an undo idea were rebuilt on `main`. Deliberately left out: the AI tutor (needs a backend and key), the Juniper/Junos work (not CCNA), the Matrix design and the sandbox ping probe. If Yasuke asks for one of its features, read the branch and rebuild the feature here; a git merge cannot combine two single-file apps. Note that the AI tutor needs a backend and an API key, and `main` is a static page.

## Still owed

Carry this list forward and keep it in every summary.

- Switching follow-ups: learning neighbours from CDP/STP background frames, per-VLAN aging time, IPv6 neighbour learning, and a broadcast storm when STP is switched off (needs `no spanning-tree vlan`)
- Interactive extended ping (`ping` alone, with the question sequence) and `ping x source <interface|address>`; `traceroute` with a source
- Exam sim mode (random lab or incident, countdown, no guide or "why"), with randomised faults for incidents
- A fuller theory question bank (28 questions so far)
- XP and trophies for sandbox challenges
- Live, real-life output for IPv6 pings and traceroutes
- Duplex and speed mismatch effects
- Waiting on his decision: keep or drop "test it yourself" as a requirement for an S rank

His most recent direction (9 Oct 2026): build freely in milestones, accuracy first, keep the arcade design, keep every test green, and keep this list current. The console realism fixes, the guide window, the switching realism build and the prompts build (passwords, Telnet/SSH sessions, reload) are done.
