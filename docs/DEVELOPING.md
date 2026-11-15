# Developing Lab4Net

The technical guide for anyone changing Lab4Net: how the source is laid out, how the one `index.html` is built, how the simulator and the interface fit together, how to test, and the rules that keep it working. Start with the README for what Lab4Net is and how to run it.

## Where everything is

| Thing | Location |
| --- | --- |
| Repo | https://github.com/yasukeblk/Lab4Net |
| Live site | GitHub Pages, deployed by the "Test and deploy" workflow after a merge to `main`, only if every test passes (see "Shipping a change") |
| The arcade version | Tag `v1-arcade`, the last commit before the redesign |

The app people use is one self-contained file, `index.html`: the simulator, the data, the interface, the styles, the icons and the fonts are all inside it, and it runs from a file with no network. You edit `src/`, and `node tools/build.cjs` writes `index.html`. Commit the built file with every change, because the live site and the Node tests read it.

## File layout

```
src/
  manifest.json          the build order: template, fonts, styles, icons, engine, data, app
  index.template.html    <head>, the theme pre-paint script, the static landing section, #app
  engine/                the simulator, 15 files (00-core.js to 90-ipv6-live.js); see "The engine"
  lessons/               the lessons, one Markdown file each (NNN-slug.md); see docs/LESSON-WRITING.md
  data/                  content: quiz.js (QUIZ), automation.js (the automation drill), campaign.js (the eight stages),
                         lessons.js (LESSONS: the build fills it from lessons/), lesson-order.js (teaching order),
                         objectives.js (extra CCNA objective names), sandbox.js (starter kits and goals)
  app/
    core/                no DOM: slug, store (state and storage), validate, router, search,
                         sim (the engine bridge), grade, progress, migrate (old storage, backups), exam
    ui/                  dom.js (el, and the one innerHTML door), theme, shortcuts, shell (sidebar,
                         top bar, palette commands), components/ (button, dialog, list, menu, palette,
                         tabs, toast, tooltip)
    screens/             one file per screen, plus the workspace parts (tasks, map, trace, console,
                         panes, popout)
    site.js              SITE (host, donate, counter): the only code that makes a network request
    main.js              boot: pending backup, migration, deep links, the first screen
  styles/                tokens.css (every colour, size and duration, dark and light), one file per area
  icons/                 ui.svg (57 interface icons) and devices.svg (7 device icons), as <symbol>s
  fonts/                 Inter (variable) and JetBrains Mono 400, woff2 files from Fontsource
tools/
  build.cjs              src/ → index.html, with the size report (--check: fail if index.html is stale)
  build-site.cjs         index.html → lessons/ and sitemap.xml (the public lesson pages)
  build-og.cjs, og.html  og.png, the share image (needs Playwright); --check says if og.png is out of date
  build-demo.cjs         docs/demo.gif, recorded from the app (needs Playwright and ffmpeg)
  serve.cjs              a small static server for the browser tests and local previews
tests/                   Node tests (*.cjs) and browser/ (Playwright)
lessons/, sitemap.xml    generated: never edit by hand
```

## The build

```
node tools/build.cjs           # write index.html and print the size report
node tools/build.cjs --check   # fail if index.html is not what src/ builds (CI runs this)
node tools/build.cjs --site    # write site/, the hosted build (CI makes it; never committed)
```

There are two outputs from the same source:

- **`index.html`**, the single file: everything inline, including every lesson's text. It works from `file://` with no network, and it is the download.
- **`site/`**, what GitHub Pages serves. It's the same app, but the page holds only each lesson's index (name, minutes, topic, objectives, number of quiz questions), and each lesson's text is `site/lesson-data/<slug>.json`, fetched when the lesson is opened. Offline, a lesson says it needs a connection and links to `lab4net.html`, the single file, which `site/` also carries. `site/` also has the lesson pages, `sitemap.xml`, `og.png` and the licences, at the same addresses as before.

`build.cjs` uses Node only, no packages. It reads `src/manifest.json` and fills each of the template's markers once: `/*@fonts*/` (the woff2 files as base64 `@font-face` rules), `/*@css*/`, `<!--@icons-->`, `//@js` (engine, then data, then app), `/*@version*/` and `/*@date*/` (from `package.json`). Full-line `//` comments in the app's JavaScript and `/* */` comments in the CSS are left out of the output, so comment freely in `src/`. The engine and the data are copied byte for byte.

The base64 font lines in `index.html` are tens of kilobytes each. Never print or read them in full; use a line range or grep.

**Size budget** (KB = 1,000 bytes; the build fails above it): app JavaScript 300, CSS 70, fonts 170, markup and icons 30, `index.html` 1,900, gzipped 700. For `site/`: the first load (everything but lesson text) 1,210, and each lesson's text 25. The engine and data (about 1,045 KB) have no budget of their own. Today: app JS 297, CSS 68, fonts 93, markup 20, total 1,523, gzipped 498. Content such as stages, kits and goals belongs in `src/data/`, outside the app budget.

After changing lessons, a lab title, a lab map or the fonts, also run `node tools/build-site.cjs` and commit `lessons/` and `sitemap.xml`. `tests/sitepages.cjs` fails until you do.

## The interface

Plain scripts, no framework. Every file is an IIFE that attaches to `window.L4N`, and the manifest's order is the load order.

- **Markup** is made with `L4N.dom.el(tag, attrs, ...children)`, which sets text with `textContent`. `dom.trusted()` is the only `innerHTML` in the app, and it only takes our own lesson and task HTML. Anything typed, stored, imported or received goes on the page as text.
- **State** is one store (`L4N.store`: `get`, `set`, `subscribe`). Screens read from it and redraw on change. Saved lab work is in `L4N.work`.
- **Screens** register with `L4N.screens.register(name, {title, crumbs, nav, mount})`. The router (`core/router.js`) maps the hash to a screen: `#/`, `#/labs`, `#/labs/<slug>`, `#/lessons`, `#/lessons/<slug>`, `#/practice`, `#/practice/exam`, `#/practice/exam/run`, `#/practice/quiz`, `#/practice/subnetting`, `#/sandbox`, `#/progress`, `#/settings` and `#/dev/components` (the component gallery). `L4N.guard` lets a running exam refuse other screens. `?lab=<slug>` and `?lesson=<slug>` still work and become hash routes.
- **The palette** collects commands from providers (`L4N.commands.add(() => [...])`). **Shortcuts** are `L4N.keys.add({keys, label, group, when, run})`; the `?` list is built from the same table. Alt shortcuts match the physical key (`e.code`), so they work on every keyboard layout.
- **The engine bridge** is `core/sim.js`: open a lab, run a line, the prompt, help, completion, grading, draining consoles, links, device details, steps, why, the subnet drill, exams and the sandbox build. Screens never touch engine globals directly.
- **The workspace** (`screens/workspace.js`) is one component for labs, exams and the sandbox: the Tasks panel (`tasks.js`; the Build panel in the sandbox), the map (`map.js`, which lessons and the sandbox use too), the trace line (`trace.js`), the console (`console.js`) and the resizable panes (`panes.js`). A lab's saved work is its command journal, replayed onto a fresh `build()`. Journal entries are `{device, line, t}`; replay sets the engine clock to each `t`, so anything timed replays as it happened. A command that throws prints `% Lab4Net internal error` and nothing else breaks.
- **Grades** (`core/grade.js`): a run starts at 100, minus 25 for the walkthrough, 15 for step-by-step, 5 per incident clue, and 2 per rejected command after the first two (at most 10). A run with no check command of its own (show, ping, traceroute, tracert, telnet, ssh, ipconfig, arp) is capped at A. Time and command count are never scored. A grade is only awarded for a run that started from a fresh lab, and the best is kept.
- **The pop-out** (`?panel=tasks`, `screens/popout.js`) talks to the main window on the `lab4net-tasks` BroadcastChannel. Messages carry data only and are checked on both sides. The pop-out never writes storage.
- **Exams** (`core/exam.js`, `screens/exam.js`) are rebuilt from their seed: storage keeps the mode, seed, minutes, tag, start time, journal and run, never the faults. One exam runs at a time, and an exam never changes the labs.
- **Theme and motion**: the inline script in the template sets `data-theme` on `<html>` before the first paint. Every colour is a token in `tokens.css`. Reduced motion (the system setting, or Settings) turns off every transition and animation, prints console output at once, and shows packet results as still pictures.

The test hook `window.L4N.test` (`openLab`, `exec`, `grade`, `state`) uses the same code paths a person does: `exec` is pressing Enter.

## Storage

| Key | What |
| --- | --- |
| `lab4net:v2` | `{v, settings, labs, lessons, quiz, subnet, exam, ui, migrated}`. Labs and lessons are keyed by slug. Quiz answers are kept by question index, so new questions only go at the end of `QUIZ`. |
| `lab4net:v2:work` | Saved work per lab slug: the journal and the run. |
| `lab4net:v2:sandbox` | The sandbox build: devices, cables, notes, the view, a goal and the commands. |
| `lab4net:v2:pending` | A checked backup waiting for "Reload now". |

Everything read from storage, a backup file, a sandbox file or another window goes through `core/validate.js` first. Each function builds a fresh object from known keys, so odd values are dropped and keys like `__proto__` never reach the app.

On the first load with no `lab4net:v2`, `core/migrate.js` imports the old app's keys (`lab4net-workspace-v1`, `lab4net-fun-v1`, `lab4net-lessons-v1`, `lab4net-exam-v1` and the rest) and says what it brought over. **The old keys are never changed or deleted**, so going back to the old version loses nothing. Backups (Settings › Data) are JSON files of the keys above; old-format backups import too, through the same migration.

## The engine (pure logic, no DOM)

The engine is `src/engine/`, fifteen files cut at the section comments below, in this order (core is `00-core.js`, the v2 engine `10-v2.js`, and so on to `90-ipv6-live.js`). The build joins them between `//ENGINE-START` and `//ENGINE-END`, and `tests/fixtures/engine.sha256` holds the hash of the joined text: `tests/build.cjs` fails if one byte changes. The redesign did not change the engine; read rule 2 under "Rules that keep it working" before you do.

1. Core: address helpers (`ip2n`, `n2ip`, `lenMask`, `netOf`), device constructors (`mkRouter`, `mkSwitch`, `mkPC`, `mkNet`, `link`, `setIp`, `addIf`), link state (`ifUp`), Layer 2 flooding with VLANs and trunks (`l2peers`), routing (`routes`, `nextHop`, OSPF), the command table, the parser, and labs 1 to 6.
2. `// ---------- v2 engine`: ACLs, NAT, packet forwarding (`fwd`, `reach`), DHCP, port security, SSH, CDP, spanning tree (`stpCalc`: per VLAN, bundled EtherChannel members count as their port-channel with the combined-bandwidth cost, switches that cannot hear each other each elect their own root, `info[sw].root`; switches with `stpOff(d, v)` are left out and `through()` lets a port see the STP switch beyond a chain of them, a port whose BPDUs come back to its own switch blocks; when every switch is off for a VLAN the result is `{root:null, info:{}}`), EtherChannel (`bundled`), `runningConfig` extras, per-command explanations (`WHYC`, `whyOf`), and the later labs.
3. `// ---------- step-by-step instructions`: `STEPS` (keyed by lab title) and `guideFor`.
4. `// ---------- CCNA objective map and troubleshooting incidents` (between `//CCNA-CURRICULUM-START` and `//CCNA-CURRICULUM-END`, just before `guideFor`): `CCNA_SCOPE`, `CCNA_DOMAINS`, `CCNA_OBJECTIVES`, `CCNA_LAB_MAP` (sets `l.ccna` and `l.kind='build'`), and `INCIDENTS`. Each incident spec names a `base` lab, a `fault` (commands applied after the base solution), a `repair` (becomes `solution`), its own `steps`, three `hints` and a `lesson`. Incidents are appended to `LABS` with `kind:'incident'`, `group:'Troubleshooting'`, `baseTitle`, and the base lab's `checks`, `pos` and `addr`. Their steps are written inline, not in `STEPS`.
5. `//LIBRARY-START` to `//LIBRARY-END`, straight after the curriculum block: the lab library expansion. Helpers: `Cn(modes, pattern, fn, types, first)` registers a command after the "why" recorder has already run (so `s.last` still works) and can put it ahead of general patterns; `cfg(net, {dev:[commands]})` configures a fresh build through real IOS commands (it throws if any is rejected, so a typo in a build fails loudly); `addLab(lab, steps)` stores the guide in `STEPS`, sets `ccna` from `CCNA_LAB_MAP` and `kind:'build'`, and appends to `LABS`. New objective IDs, `CCNA_LAB_MAP` entries and `WHYC` entries are added at the top of the block or beside each lab. A lab may set `hidePorts:true` to hide port names on the map.

6. `// ---------- real-life ping and traceroute`, just before the step-prompt recorder at the end of the engine: `pingRun` (per-echo result from `reach`, plus ARP drops), `iosPing`, `winPing`, `traceRun`, `iosTrace`, `winTrace`, `pingOpts`, ARP helpers (`arpWalk`, `arpPrune`, `arpLearn`, `arpRows`) and `pq` (runs `fwd` quietly without touching NAT tables or counters). Each device's ARP cache is `d.arpc` ({ip: interface name}); entries drop when their interface goes down or leaves the subnet. The four original `ping`/`traceroute`/`tracert` handlers now just call these. Handlers put timing on `s.pace = {t, abort}`: one `t` entry per output line (a delay in ms, `{d, pkt}`, `{chars:[ms…], pkt}` or `{parts:[[ms, text]…]}`), and `abort(n)` returns the summary lines after n echoes. Engine callers ignore `s.pace`.

7. `// ---------- console realism`, after the ping block: the parser helpers used by `run()` (`patsFor`, `depthOf`, `shadowed`, `ambiguousAt`, `badIndex`, `caretAt`, `withCaret`, `parseFail`, `hostLookup`, `resolveHost`, `pipeRun`), `KWHELP` (the `?` descriptions), and the everyday commands (`show version`, `show vlan id`, `show running-config interface`, `show interfaces description`, duplex/speed/bandwidth, `ip host`, `ip name-server`, `security passwords min-length`, `enable algorithm-type`, `login block-for`, `debug ip icmp`, PC `hostname`/`netstat`/`help`). It wraps `ospfCost` (bandwidth), the `show interfaces` handler (hardware/MTU/duplex lines), the password handlers (min-length) and `runningConfig`.

How `run()` decides now: output modifiers first (`pipeRun`). Then it takes the first matching pattern, skipping any pattern that treats a token as an abbreviation when another pattern has that token as an exact keyword (`shadowed`). If an abbreviation fits two keywords it prints `% Ambiguous command:  "<line>"` (`ambiguousAt`; aliases where one keyword is a prefix of another, like `run`/`running-config`, count as one). If nothing matches it calls `parseFail`: Windows messages in `pc` mode, `% Incomplete command.` when a pattern needed more, a hostname lookup for one unknown word in user/priv mode, otherwise a `^` line plus `BAD`. `env.raw` and `env.p0` (prompt length) are set on the first `run` of an `execLine`, so nested runs (`do`, pings by name, pipes) still place the caret correctly. Handlers that emit `BAD` get a caret under the last word via `withCaret`. Any test that compared output to `BAD` alone must now expect the caret line first.

`debug ip icmp` puts messages on `d.conq` (from `pingDebug`, called by `pingRun` when `LIVE`). The interface moves them into that device's console tab with `drainConsoles`: after each command (other devices immediately, the typing device once its output has finished playing) and during replay.

8. `// ---------- switching realism`, after console realism and just before `//ENGINE-END`: the MAC address table. `macBackground` skips ports spanning tree blocks and learns a neighbour from BPDUs only when its port forwards; after every command `stpFlush` compares `stpSig(net, v)` (the tree between switches, edge ports left out) with `net.stpSig` and flushes that VLAN's dynamic entries when it changed; `l2frame` treats a lookup pointing back out of the ingress port as unknown. STP port costs follow `linkSettle` speed (100/19/4, bundles 56/12/3), and a forced speed is the bandwidth for `bwOf` and `ospfCost`. Each switch has `d.mact` (`[{mac, vlan, ifn, kind: DYNAMIC|STATIC, t}]`) and `d.macAging` (seconds, default 300). `macTx(net, d, ifc)` is the source MAC a device uses on an interface (hosts one address, router and switch ports their own via `macIf`, SVIs and port-channels the chassis address); `macLearn`, `macPrune` (age per VLAN via `macAgeFor`, port down, VLAN gone; also run after every command by an `execLine` wrapper), `macLookup` (the switch's own address is a CPU entry; `macBackground` rows count as known) and `stormLog` (the MAC flap message on every switch of a loop, called from `fwd`/`fwd6` when live). `l2frame(…, nd)` takes an IPv6 option (`cold`, `nhText`) from `fwd6`, which records `hops.l2` like `fwd` (`L2WARM6` marks the reply's first hop resolved). `stpBlocked(net, vlan)` is the set of `switch|port` the spanning tree blocks; `l2peers` consults it, so a blocked port carries nothing. `l2frame()` is called from `fwd()` for every Layer 2 hop of a live console command (`LIVE && L2LIVE`; `L2LIVE` is set by the `run` wrapper, so grading, tests and `pq` never learn): it decides whether the sender had to ARP (a broadcast every switch in the VLAN learns from; `L2WARM` marks the reply's first hop as already resolved), otherwise learns the sender on each switch's ingress port and floods at the first switch that does not know the destination. Events go on `hops.l2` as `{at, seg, from, to, nh, srcMac, dstMac, arp, flood, sw:[{sw, vlan, out, known}], edges:[[from, to, blocked]]}`; `l2peers` results now carry `trail` (per switch: `sw, vlan, inp, outp`) and the array has `edges` (every link the flood reached). `dhcpRenew` is wrapped so a lease learns the client and the answering server or relay. The commands (`show mac address-table …`, `show mac-address-table`, `clear mac address-table dynamic …`, `mac address-table static|aging-time`) are registered here with `Cn`; `globalExtra` is wrapped for the running-config.

9. `// ---------- ping and traceroute with a source`, after the switching block: `srcResolve(net, d, text)` (an address on an up interface, or such an interface's name; `% Invalid source address - IP address not on any of our up interfaces`), `pingDialog`/`traceDialog` (the question chains built from `ask`), and the `ping`/`traceroute` bare commands. `reach(net, src, dst, proto, dport, srcIp)`, `pingRun(net, src, dst, count, srcOv)`, `iosPing(e, dst, count, size, srcOv, timeout)`, `traceRun`/`iosTrace(…, srcOv)` carry the source; `pingOpts` parses `source X` (a spaced interface name is joined) and `traceroute <ip> <rest>` accepts only `source`.
10. `// ---------- exam sim: surprise faults`, after the prompts block and just before `//ENGINE-END`: `seedRng(seed)` (FNV hash into mulberry32), `rpick`, `shuffled`, `enterCfg(d)` (enable, its password if any, configure terminal), `applyCmds(net, {dev:[lines]})` (throws on a rejected line), `solvedNet(lab)`, `labPasses`, `failingChecks`, `EXAM_FAULTS` (each `{id, generic?, gen(net, rnd) → {cmds, desc} | null}`), `examFault(lab, seed, count)` (specific generators first, generic ones last; a fault is kept only when a check fails) and `examLab(base, faults, title)` (the exam's lab object: `kind:'exam'`, `exam:true`, `baseTitle`, no why/steps, `lesson` = the faults, `build()` = solved base plus faults).
11. `// ---------- duplex and speed`, last before `//ENGINE-END`: `linkSettle(net, d, i)` → `{speed, duplex, farDuplex, speedOk, mismatch}`; `ifUp` is wrapped so a speed mismatch is down; `duplexMismatches(net, d)` and an `execLine` wrapper log the CDP message on the typing device (console) and on the far end (`logEvent`); counters live in `i.cnt` (`cntOf`), `portTraffic` adds in/out packets and the mismatch errors, `trafficCount(net, res, n, bytes)` is called from `pingRun` for both directions of a live ping (one call per echo count), `cntLines(i)` prints the IOS counter block (used by the `show interfaces` wrapper), the `show interfaces status` wrapper rewrites the duplex/speed columns, `clear counters` uses `ask`, and the `speed` generic exam fault is pushed onto `EXAM_FAULTS`.
12. `// ---------- IPv6: live ping and traceroute`, after the duplex block and last before `//ENGINE-END`: `d.ndc` (the neighbour cache, `{addr: {ifn, mac, addr}}` keyed by `fmt6`), `nd6Prune`/`nd6Learn`/`nd6Walk` (the ND equivalent of `arpWalk`), `pingRun6`, `iosPing6`, `winPing6`, `traceRun6`, `iosTrace6`, `winTrace6`; the existing `ping <ip6>` (IOS and PC), `ping ipv6 <ip6>` and `tracert <ip6>` handlers are replaced in place, and `traceroute <ip6>`, `traceroute ipv6 <ip6>`, `ping <ip6> <rest>` (IOS and PC) are registered with `first` so they beat the hostname forms. `show ipv6 neighbors`, `clear ipv6 neighbors`.
13. `// ---------- prompts`, after that and just before `//ENGINE-END` (VTY lines default to `login`; port 23 listens whenever the transport allows Telnet, and `vtyOpen` handles no password set, `no login` and `login local`; a reload over a VTY asks the same questions and runs `vtyReload`; every session carries `s.boot`, and an `execLine` wrapper restarts a session whose device rebooted at `>` with Press RETURN): questions and remote sessions. `ask(s, text, on, mask)` puts `s.prompt = {text, mask, on(answer, env)}` on a session; the base `execLine` feeds the next line to `on` instead of parsing it (so every wrapper still runs), and maps the line `<cr>` (the `CR` constant, defined at the top of the engine) to an empty line, which is how guides, tests and journals press Enter. `s.remote = {d, s, ip, proto, win, from, user}` sends lines to the far device's own session (`vty:true`); `closeMsg(R)` is printed when it closes (`exit` sets `s.closed`), the far device's syslog lines are moved to its `conq` unless `terminal monitor` set `s.termMon`, and `s.pace`/`s.last` are copied back. `promptOf` is wrapped to show the prompt text or the far prompt; `effSess`, `effPair`, `effPrompt` follow the chain for the UI. `lineLogin(d, kind)` says what a line asks for; `authLine(d, sIn, sTo, kind, done, fail, fixedUser)` runs the three-try password or local login; `conLogout`/`conLogin` handle the console (Press RETURN, banner, User Access Verification, "% Login disabled on line 0"); `vtyOpen(e, ip, proto, user)` opens Telnet/SSH (IOS or Windows/OpenSSH messages, `knownHosts` on PCs, `d.vtys` for `show users`); `loginFailed`/`loginOk`/`quietMode` implement `login block-for` with `d.loginFails`, `d.quietUntil`, `d.loginLog`. Saved configuration: `snapBoot(net, d)` stores `d.boot` (a `deepClone` of the device) and `d.bootCfg` (the running-config text); `mkNet` is wrapped to snapshot factory devices (`d.factoryCfg`) and every lab's `build` is wrapped to snapshot after the build and set `d.startup` when the build configured anything; `saveCfg` (copy run start after the filename prompt, write) refreshes both; `reload` asks Save? when `cfgText` differs from `bootCfg`, then `doReload` calls `restoreBoot` (puts the clone back, re-links from `net.links`, `clearVolatile` drops ARP, MAC, logs, NAT, DHCP, snooping, err-disable, dynamic secure MACs, `ospf.active`, bumps `d.boots` so remote sessions into it drop), prints a paced boot (`BOOT_ROUTER`/`BOOT_SWITCH`) and the setup-dialog question for a never-saved factory device. The `enable`, `exit`, `telnet`, `ssh -l`, `copy running-config startup-config`, `write`, `show login` and `terminal monitor` handlers are replaced in place by looking them up in `CMDS`.

The `// ---------- v3 engine` section, just before the "why" recorder, holds commands added for the library (`clear ip ospf process`, `show ip protocols`, `show ip ospf`) and an `execLine` wrapper that logs native VLAN mismatches. The library block adds a second `execLine` wrapper that logs OSPF adjacency changes. Other library changes were made in place: `type7`/`pwText` near the top (type 7 passwords), `isPassive` and the router-ID lock (`ospf.active`) beside `ospfNeighbors`/`routerId`, `vtyDenied` beside `reach` (access-class), `cdpPeers` with the CDP commands, and the `root primary` macro with the spanning-tree commands.

Phase 2 changed the core in place too:

- Routing: `routes()` builds a real table, one route per prefix with the lowest administrative distance (connected 0, static `ad` default 1, OSPF 110). `staticRoutes()` decides which statics are usable (exit interface up, or next hop on a connected subnet). `nextHop()` does longest match and returns `{ifc, nh, proxy, route}`; `fwd()` uses proxy ARP for exit-interface-only statics. Statics are `{net, len, nh, ifn, ad, name}`.
- OSPF: an ABR uses only summaries heard in area 0 (RFC 2328 16.2). `ospfAreaMismatches(net, d)` and an `execLine` wrapper log `%OSPF-4-ERRRCV` mismatched-area messages (rate limit 60 s on `simNow`, kept in `net.ospfErr`).
- OSPF: `ospfRoutes()` is a per-area SPF (`ospfAreasOf`, `ospfIsAbr`; intra-area routes are `O`, summaries from area border routers are `O IA` and never beat an intra-area route; summaries only cross area 0, so an area without a backbone interface is isolated; `ospfNeighbors` entries carry `area`) over `ospfCost()` (interface `ospfCost`, else reference bandwidth `ospf.refBw` / speed). Interfaces may carry `ospfArea` (from `ip ospf PID area N`), `ospfPrio`, `ospfNet` ('point-to-point'). `ospfElect(net)` runs the RFC 2328 election after every command (an `execLine` wrapper in the v3 section) and keeps state in `net.ospfDR[segment]`; `ospfRole(net, d, ifc)` reads it. `ospf.resetting` is set briefly by `clear ip ospf process` so the router leaves every segment.
- Layer 2: access ports may have `voiceVlan`. Phones are `pc` devices with `phone:true`, a PC port `FastEthernet1` and a CDP name `cdpId`; `phoneVlan()` gives the VLAN a phone tags with, and `l2peers()` bridges through the phone.
- NAT: `nat.pools`, pool rules `{acl, pool, overload}`, one-to-one bindings in `nat.dyn`, `nat.hits`/`misses`. `natOut()` returns a reason string when it has to drop a packet. Echo requests use query ID 1 as their "port".
- ACL entries have `seq` and are kept sorted; `aclLine()` formats standard entries for show access-lists.
- Phase 3: `isL3(d)` (a router, or a switch with `ipRouting`) replaced `type==='router'` wherever routing happens; switch ports may be `routed`; Layer 3 switches have `l3:true` and come from `mkL3Switch()`. DHCP: `dhcpCandidates()` gathers every server that can answer and `snoopPath()` applies snooping and option 82; bindings live in `switch.snoop.bind`. `daiBlock()` is called from `fwd()` for both ends of each hop. HSRP: `hsrpElect(net)` keeps `net.hsrp`, `hsrpVip()` lets the active router own the virtual IP (used by `ownsIp()` and `fwd()`). IPv6 lives in its own section of the library block: `parse6`/`fmt6`, `eui64`, `macIf` (a MAC per router port), `linkLocal`, `routes6`/`nextHop6`/`fwd6`/`reach6`, interface fields `v6`, `ll`, `v6on`, device fields `v6routing`, `statics6`, `gw6`. The `<ip6>` argument token is handled in `matchPat()`.
- Phase 4: ports can be `errdis` (a reason: bpduguard, channel-misconfig, psecure-violation); `ifUp()` treats them as down at both ends. `errScan()` runs after every command from the outermost `execLine` wrapper, logs the real messages, and a port is recovered by `shutdown` then `no shutdown` (the scan trips it again if the cause remains). Port security keeps `ps.macs` (`{mac, kind: dynamic|sticky|static}`), `ps.viol`, `ps.blocked` (restrict/protect drops, checked in the `daiBlock` wrapper). OSPF interfaces have `ospfHello`/`ospfDead` (`ospfTimers()`), which must match; a network-type mismatch now forms the adjacency but SPF skips that link. `addIncident(spec)` appends an incident like the original six, with an optional `setup` applied before the `fault`.
- Phase 5: `addCapstone(l, steps)` is `addLab` with `capstone:true` and group `Capstone` (kind stays `build`, so code that needs build labs only filters `!l.capstone`). Router subinterfaces may have `nativeTag` (`encapsulation dot1Q N native`): `l2peers` sends untagged frames on the parent port to it. `dhcpCandidates()` applies the client-side interface's inbound ACL to the discover. Capstones open with step-by-step off (`src/app/screens/workspace.js`).
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

`steps` is filled from `STEPS[title]`: one entry per task, written as `"DEV: cmd | cmd ; DEV2: cmd"`. A command starting with `#` is a note, not a command. Every lab must have exactly one `why` and one `STEPS` entry per task. Every lab needs at least one `ccna` objective that exists in `CCNA_OBJECTIVES`. Keep lab titles stable: a lab's slug comes from its title, and saved progress, saved work and every `?lab=` link use the slug (`tests/slugs.cjs` freezes the list).

## Testing

```
npm run build       # node tools/build.cjs
npm run check       # node tools/build.cjs --check
npm test            # every Node test
npx playwright install chromium firefox webkit   # once
npx playwright test # the browser tests (they serve the repo on 127.0.0.1:8138)
```

The Node tests read the built `index.html`, so build first.

- The fourteen engine tests (`labs`, `forwarding`, `curriculum`, `lessons`, `ping`, `console`, `switching`, `prompts`, `exam`, `quiz`, `duplex`, `ping6`, `campaign`, `ospfarea`) and `sitepages` are the ones from before the redesign. Do not edit them or weaken a check. `labs.cjs` builds every lab, runs its solution and its step-by-step guide, and asserts every check passes.
- `build.cjs` (markers, engine hash, budget, `--check`), `slugs.cjs` (lab and lesson slugs unique and frozen), `grade.cjs`, `migrate.cjs` and `validate.cjs` cover the new code. `app-core.cjs` loads the engine, the data and the DOM-free core in Node.
- `tests/browser/` (Playwright, pinned in `package.json`): `shell`, `labs-all` (all 77 labs solved and graded through the real Grade button), `guide`, `console`, `map`, `popout`, `deeplinks`, `firstrun`, `offline`, `labs`, `lessons`, `counts`, `lessonpages`, `exam`, `quiz`, `subnet`, `sandbox`, `security`, `phone` (390 by 844), `a11y` (axe on every route in both themes, the keyboard-only run, keyboard patterns, live regions), `themes` and `motion`. `shell`, `console` and `map` also run in Firefox and WebKit.
- `visual.spec` compares screenshots of the main screens. Baselines are made on Linux, so it only compares in CI. At most 2 pixels may differ (on the CI machines a changed digit alters 5 to 7, and unchanged screens match to the pixel), parts that change on purpose (the exam clock) are masked, "full" states grow the window until `#screen` no longer scrolls, and a missing baseline fails. After an intended change, refresh them with the "Update screenshot baselines" workflow (Actions › Update screenshot baselines › Run workflow), which commits them to the branch.
- `counts.spec` checks every lab, lesson and quiz total the app shows against the data in the page. It has no typed numbers, so it keeps working as content grows.
- `lessons-markdown.cjs` proves that `lessons.cjs` rejects Markdown (links, bold, backticks) in a lesson.
- `lessons-order.cjs` checks `src/data/lesson-order.js`: every lesson once, in the group of its first objective. A new lesson goes in that file too.
- Totals are never typed. In `src/index.template.html` and `tools/og.html` they are tokens (`{{LABS}}`, `{{BUILD_LABS}}`, `{{INCIDENTS}}`, `{{CAPSTONES}}`, `{{LESSONS}}`, `{{QUIZ}}`, `{{LAB_LESSONS}}`, `{{TOPIC_LESSONS}}`) that the build fills from the data. The docs are written by hand, and `counts.cjs` checks every total they state. The browser tests read totals from the page.
- Generated files are checked: CI fails if `lessons/` or `sitemap.xml` differ from what `tools/build-site.cjs` writes, or if `og.png` was built from other counts or another `tools/og.html` (`node tools/build-og.cjs --check`, which compares a fingerprint in `tools/og-source.sha256`).
- CI never retries a failed test. A test that only passes on a second try is a bug: find the cause. For timing, control the page's clock (`page.clock`) instead of waiting longer.

Current numbers: 77 labs (38 build, 37 incidents, 2 capstones), 445 checks, 1,571 guide commands; 66 lessons (38 lab, 28 topic); 110 quiz questions.

For anything visual, open the page in a real browser at 1366 by 768 in both themes and at 390 wide, and look at it. Tests catch a lot, not everything.

## Shipping a change

`main` is protected: nobody pushes to it directly, and a pull request merges only when its checks pass.

1. Work on a branch and open a pull request.
2. Two workflows check it:
   - "Simulator regression checks" (`lab-tests.yml`, job `labs`) runs the build check and every Node test, on every push to a branch and every pull request.
   - "Test and deploy" (`deploy.yml`, job `browser`) runs the build check, every Node test, a check that `lessons/` and `sitemap.xml` match `tools/build-site.cjs`, and every browser test.
3. Both `labs` and `browser` must pass before the pull request can merge.
4. After the merge, "Test and deploy" runs the whole suite again on `main`. Only if it passes does its `deploy` job publish the site to GitHub Pages. A failed run leaves the live site as it was.

The deploy builds `site/` (`node tools/build.cjs --site`) and publishes exactly that folder:

- the app (`index.html`), with `lesson-data/` for the lessons' text;
- `lab4net.html`, the single file for offline use;
- `og.png`, `sitemap.xml`, `LICENSE` and `THIRD-PARTY-NOTICES.md`;
- the `lessons/` folder (the pages, `site.css` and `fonts/`).

Nothing else in the repository is on the public site. To publish a new file, copy it in `writeSite()` in `tools/build.cjs`. The browser tests run twice, once against the single file and once against `site/` (the Playwright project "site").

To roll back, open a pull request that reverts the bad change. For a merge commit, that's `git revert -m 1 <merge commit>` on a new branch. When it merges, the deploy tests the reverted code and publishes it. A hand run of "Test and deploy" on `main` (Actions › Test and deploy › Run workflow) republishes the current `main`.

## Rules that keep it working

1. Every lab must stay completable and gradable. Do not weaken a check to make a test pass.
2. Do not change the engine for the interface's sake. If a hook is truly needed, keep it as small as possible, update `tests/fixtures/engine.sha256` in the same commit, and say why in `CHANGES.md`.
3. Keep it fully offline: no external requests (except the visit counter in `site.js`, on the public host only, never with Do Not Track), and the fonts stay embedded.
4. Keep the "why" explanations. Understanding the reason for each step is the point.
5. Build and commit `index.html` with every change, inside the size budget.
6. Treat everything from outside the code as untrusted: console input, stored data, backup and sandbox files, BroadcastChannel messages and the URL. Text goes through `textContent`; stored and imported data through `validate.js`.
7. Slugs are frozen. Renaming a lab or lesson breaks saved progress, shared `?lab=` and `?lesson=` links, and the lesson pages' search ranking.
8. Ctrl+Z inside the console is IOS `end`. Sandbox undo only takes Ctrl+Z when focus is outside the console.
9. Colours, sizes and durations come from `tokens.css`. Check both themes, reduced motion and a phone.
10. `git pull && bash install-lxc.sh` on a plain Debian container must keep working; it installs `index.html` only.
11. Update `CHANGES.md` with each change, in plain language.

## Known limits

- The simulator implements the commands the labs need, not all of IOS. Anything else returns "Invalid input".
- No `--More--` paging. `?` descriptions cover the common keywords only; argument help is generic (A.B.C.D, WORD) rather than IOS's specific ranges. The ambiguity check only knows the keywords Lab4Net implements, so a few abbreviations that are ambiguous on real IOS (because of commands we lack) are accepted here.
- The extended ping asks every real question; target, repeat count, size, timeout, source, the DF bit and the size sweep change the result (MTU is 1500 everywhere, so DF matters only above that). `copy running-config startup-config` to another filename keeps the copy in `d.nvram` (there is no `dir nvram:`). Counters count only the traffic you send (pings, traceroutes, Telnet/SSH); a duplex mismatch never drops a ping here, it only shows in the counters and the CDP log. No DNS server, so no `nslookup`; names resolve only from `ip host`. Only `debug ip icmp` exists. `show version` uses fixed models (2911, 2960-24TT, 3560-24PS) whatever the port count.
- Duplex: a port negotiates unless both speed and duplex are forced (the textbook rule). Some Catalyst models refuse `duplex` while speed is auto ("Duplex will not be set until speed is set to non-auto value"); which ones could not be confirmed, so every model accepts it here.
- Prompts: `exec-timeout` is stored but never fires; `show users` has no idle times; the setup dialog is not simulated (answer no); a reload's boot text is fixed per device type; Telnet to ports other than 23 stays a port test; the IOS SSH client has no host-key prompt (real IOS has none either), but a PC's known hosts are per device and never expire. Password answers are stored in the saved journal in clear text (it is a simulator).
- Spanning tree: frames follow it, so a blocked port carries nothing and the animated path matches `show spanning-tree`. `no spanning-tree vlan` is modelled: a transparent switch, a self-loop block, and a storm when the whole loop is off. A transparent switch joining three or more STP switches is approximated as pairwise links rather than one shared segment. A storm makes the whole VLAN segment unusable at once (no partial degradation). Costs are the IEEE short values (19, 4; a two-link bundle 12 or 3). Rapid PVST+ and PVST+ converge instantly and identically.
- MAC address tables learn from the traffic you send from a console (ping, traceroute, telnet, ssh, DHCP, IPv4 and IPv6) plus the computed neighbour rows (CDP and BPDUs); hosts are unknown until they send something. Aging uses the browser clock; after a reload the replayed journal relearns everything with fresh timestamps. No `mac address-table notification`.
- OSPF areas: no virtual links, no stub or NSSA areas, no external (E1/E2) routes. A transparent (STP-off) switch joining three or more STP switches is approximated as pairwise links.
- The wireless lab models only the wired side: the AP is a host-type device (its console has the host tools), the controller a server listening on 5246, 5247, 443 and 22; no radios, clients, WLANs or controller GUI.
- `clear ip ospf process` answers its own "Reset ALL OSPF processes?" prompt with yes. Hello and dead timers must match, as on a real router; a network-type mismatch forms the adjacency but the link is left out of SPF, so routes through it disappear. Authentication is not modelled. Equal-cost paths are not load-shared; one is used.
- Syslog messages appear on the console of the device where the command was typed; other devices only log them (show logging, syslog server). The NTP clock stays synchronised as long as its server is configured. Log timestamps use the browser's clock.
- show access-lists lists standard entries in sequence order; real IOS may list host entries first.
- Ping and traceroute use ICMP for every probe (real IOS traceroute uses UDP), so an extended ACL that permits only some ICMP or UDP can disagree slightly with real gear. Unreachables are sent only for no-route and ACL drops; a failed next-hop ARP on a router gives timeouts. Extended ping has `repeat` and `size` but not `source`, and there is no interactive extended ping. Playback runs at 40% of real time (`PACE_SCALE`).
- IPv6 neighbours age REACH (30 s) then STALE, with no DELAY or PROBE states; the first echo is queued, not lost.
- No wireless. IPv6 has static routing only: no OSPFv3, no DHCPv6, no IPv6 ACLs. Only the Layer 3 switch model (a 3560) routes; 2960s reject ip routing and static routes.
- HSRP has no object tracking and fails over at once rather than after the 10-second hold time. The DHCP snooping rate limit is stored and shown but not enforced. DAI has no ARP ACLs or extra validation options.
- Incidents are fixed scenarios; randomised faults live in the exam sim's sabotage mode. Sandbox device models are fixed (3 or 5 port routers, 10 or 26 port switches).
- Exam sim: sabotage faults are drawn from a fixed set of generators (see `EXAM_FAULTS`); a few lab/seed pairs yield none and fall back to another lab. Faults that only matter at the next DHCP lease (exclusions, pool changes) are not used because existing leases rightly survive them. An exam never writes to the labs; exam history keeps the last 40. The clock runs on the wall clock, so leaving the tab does not pause it.
- Progress lives in the browser. A backup (Settings › Data) carries it to another browser or device.

## Known gaps (roadmap)

- `show ip ospf database`.
- Suspending a Telnet/SSH session: Ctrl+Shift+6 then x, `show sessions`, `resume`, `disconnect`.
- Grade rule (a design decision, not a gap): an S grade requires at least one check command of your own during the run (show, ping, traceroute, telnet, ssh, ipconfig or arp). Keep it.

