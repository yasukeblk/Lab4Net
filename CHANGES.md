# Lab4Net changes

## Duplex and speed mismatches that behave like the real thing

- Every physical port now settles its speed and duplex against the far end by the IEEE rules. Two ends forced to different speeds keep the link down (down/down, with the LINK-3-UPDOWN logs). A forced speed on one end is simply sensed by an auto end. A forced duplex on one end leaves an autonegotiating far end at half duplex: the classic mismatch.
- A duplex mismatch keeps the link up and light traffic still gets through, as in real life. CDP reports it on both devices with the real message (`%CDP-4-DUPLEX_MISMATCH: duplex mismatch discovered on GigabitEthernet0/1 (not half duplex), with R2 GigabitEthernet0/0 (half duplex).`), and the counters show it: late collisions on the half-duplex end, CRC errors and runts on the full-duplex end. Forcing half on one end with auto on the other is not a mismatch (the auto end falls back to half as well).
- `show interfaces` now ends with the full counter block (packets and bytes in and out, runts, CRC, input errors, late collisions, and the rest), counted from the live pings, traceroutes, Telnet and SSH you send, and it shows the negotiated duplex and speed. `show interfaces status` shows a-full/a-100 when negotiated and full/100 when forced.
- `clear counters` (all interfaces or one), with the real confirm prompt and `%CLEAR-5-COUNTERS` log.
- A switch port forced to full duplex with a PC behind it is a mismatch too: PC NICs always autonegotiate.
- The exam sim gained a fault: both ends of a link forced to different speeds, so the link never comes up.

Tests: new `tests/duplex.cjs` (in GitHub Actions). `tests/console.cjs` now expects the CDP warning when `duplex full` is forced against an auto far end.

Verification: all twelve suites pass. In a real browser: forcing `duplex full` on R1 printed the CDP warning, and after a ping `show interfaces g0/0` on R2 showed Half Duplex and 2 late collisions in the real layout.

## Theory check grows to 110 questions; sandbox challenges earn XP and trophies

- The theory check now has 110 questions (82 new) across every exam domain: network fundamentals 16, security 17, automation 15, IP services 15, routing 13, switching 13, wireless 12, IPv6 9. New ones cover switching (MAC learning and flooding, native VLAN, STP roles and root election, BPDU guard, Rapid PVST+, LACP modes, EtherChannel, port security, CDP/LLDP), routing (longest match, administrative distance order, floating statics, default routes, OSPF DR election, router ID, neighbour requirements, cost, passive interfaces, HSRP, VRF), services (DORA, helper addresses, PAT, static NAT, NTP, syslog levels, SNMPv3, DSCP EF, TFTP, WRED), security (AAA, TACACS+ vs RADIUS, enable secret, DHCP snooping, DAI, wildcard masks, ACL placement, 802.1X roles, IPsec, social engineering, sticky MACs, password types), wireless (bands and channels, SSID, CAPWAP, AP modes, WPA2/WPA3, AP switch ports, WLC) and automation (REST codes, Ansible, planes, statelessness, northbound APIs, YAML, controllers).
- Your earlier answers are kept: new questions were added after the existing ones.
- The right answer no longer sits in the first slot of the bank: the new questions are spread across all four, on top of the on-screen rotation.
- Completing a sandbox challenge now counts: 60 XP each, the Builder trophy for the first, Architect for all four. Challenges you completed before this change are not known to the new counter; complete one again to register it.

Tests: new `tests/quiz.cjs` (in GitHub Actions) checks every question has four distinct options, a valid answer, an explanation and a known domain, that no question is duplicated, that each domain has at least four, and that answer slots are not lopsided.

Verification: all eleven suites pass. In a real browser: the theory check showed question 110 of 110 with its options and explanation, and finishing a sandbox challenge unlocked Builder.

## Exam sim: a random lab, a clock, and no help

**Where to find it**: Lab library → "Exam sim →", or "Exam sim" at the bottom of the lab menu.

**Three kinds of exam**
- **Sabotage** (the one that cannot be memorised): a finished lab, built and working, with one or two hidden faults. You get the lab's requirements (the checklist) and nothing else: find what changed, fix it, and prove it. The faults are real misconfigurations chosen to fit the lab: a shut interface, a port in the wrong VLAN, a deleted VLAN, a missing or misdirected static route, a trunk turned into an access port, a VLAN pruned from a trunk, a native VLAN mismatch, a missing OSPF network statement, a passive interface facing a neighbour, a duplicate router ID, a wrong mask or address, NAT missing from an interface, a wrong default gateway, a "deny any" slipped into an applied ACL, Telnet-only VTY lines on an SSH lab, ip routing switched off on a Layer 3 switch, a subinterface tagging the wrong VLAN, a bogus static MAC on a secure port. Every fault is applied through real IOS commands and is only used when it breaks one of the lab's own checks.
- **Build lab**: a random build lab, timed, with no help.
- **Incident**: a random troubleshooting incident with no clues.
- **Daily challenge**: a sabotage with two faults, chosen by the date, so it is the same for everyone on that day. Cleared, it is recorded for the day.

**The rules**
- No step-by-step guide, no "why" after commands, no walkthrough, no clues, no command guide. The console still gives `?` and Tab, as IOS does.
- A clock (10, 15, 20 or 30 minutes; the daily is 20). The exam bar at the top of the mission window shows it; the last minute flashes. When it runs out the network is graded as it stands, the console locks, and a card shows what passed and what was wrong. "Review the network" unlocks the console; nothing more counts for that exam.
- Ranks are scored on results, exactly as in any lab: a clear before the clock runs out gets the normal rank, and time and command count never lower it. Grade whenever you like; a full pass ends the exam.
- Leaving the exam for another lab leaves the clock running. A reload resumes the exam where it was.
- New trophies: Exam Ready (clear an exam), Fault Hunter (clear a sabotage with no help), Daily Grind (three daily challenges). Each cleared exam is worth 80 XP, and recent exams are listed in the Exam sim card.

**Behind the scenes**
- An exam is a temporary lab, "Exam · <lab>", that exists while it runs and is not counted in the lab totals.
- Sabotage faults come from a seeded random generator, so the same seed always gives the same exam (that is how the daily works).

Tests: new `tests/exam.cjs` (in GitHub Actions) builds every build lab, applies its solution, and proves that each fault generator produces real, accepted configuration that breaks a check on at least one lab, that most lab/seed pairs yield a fault, that a seed reproduces its fault, and that the exam lab carries the base requirements, checks and root cause.

Verification: all ten suites pass (labs, forwarding, curriculum, lessons, ping, console, switching, prompts, exam, ui, guidewin). In a real browser: the Exam sim card showed today's daily; a 10-minute sabotage started with the exam bar and clock, the guide switch, why text, walkthrough and command guide hidden, and two faults applied; a shortened deadline plus a reload resumed the exam and ended it with the time's-up card and a locked console; a second sabotage was fixed and graded, which stopped the clock, recorded the result with its rank, and unlocked Exam Ready; the guide setting came back untouched after the exam.

## Ping and traceroute from a chosen source, and the interactive extended ping

- `ping 192.168.3.10 source g0/0` (or `source 192.168.1.1`, or `source loopback 0`) sends the echoes from that address, and prints "Packet sent with a source address of 192.168.1.1" like IOS. The replies must find their way back to that address, so this is the real test of a return route: a ping from a loopback nobody has a route to comes back `.....`, and the map shows the reply failing.
- An address or interface that is not one of the router's own up interfaces is refused with "% Invalid source address - IP address not on any of our up interfaces".
- `traceroute 192.168.3.10 source g0/0` works the same way.
- `ping` on its own (on a router or switch) starts the extended ping dialog with the real questions and defaults: Protocol [ip], Target IP address, Repeat count [5], Datagram size [100], Timeout in seconds [2], Extended commands [n], and with `y`: Source address or interface, Type of service, DF bit, Validate reply data, Data pattern, Loose/Strict/Record/Timestamp/Verbose, Sweep range of sizes. Enter accepts a default; a bad number gets "% A decimal number between 1 and 2147483647." and the question again; a host name is looked up like anywhere else.
- `traceroute` on its own asks its own questions (target, source, numeric display, timeout, probe count, TTLs, port).
- The walkthrough shows "⏎ Enter" where a step is just Enter.

Tests: `tests/prompts.cjs` now also covers source by address, interface and spaced interface name, the invalid-source message, the traceroute source, both dialogs question by question, and a bare `ping` on a PC still printing the Windows usage text.

Verification: all nine suites pass.

## Passwords that are asked for, real Telnet and SSH sessions, and reload

**The console now asks**
- `enable` asks for the enable secret (or the enable password when there is no secret). What you type is hidden, as on a real router. Three misses: `% Bad secrets`.
- `exit` or `logout` at the `>` or `#` prompt ends the console session, as on real gear: "R1 con0 is now available … Press RETURN to get started." The next Enter starts a new session, and if the console line has `login` it asks for the password (or, with `login local`, a username and password; a privilege-15 user lands straight in `#`). Three misses: `% Bad passwords` and back to Press RETURN. A banner motd is shown first. `login` with no password set locks the console with the real message ("% Login disabled on line 0, until 'password' is set"), so set the password first.
- `copy running-config startup-config` asks "Destination filename [startup-config]?"; press Enter to accept. `write memory` and `wr` save without asking.
- Guides and walkthroughs show the extra lines: the password after `enable` where a lab starts with one set, and "⏎ Enter" where a prompt wants Enter.

**Telnet and SSH open a real session on the other device**
- `telnet 10.0.12.2` from a router or switch: "Trying … Open", the far device's banner, "User Access Verification", its VTY password (or username and password with `login local`), and then you are on that device: its prompt, its commands, its `enable` secret. `exit` prints "[Connection to 10.0.12.2 closed by foreign host]". Three bad passwords close the connection.
- From a PC, Windows messages: "Connecting To 10.0.12.2...", and "Connection to host lost." when it ends; a refused connection says "Could not open connection to the host, on port 23: Connect failed".
- `ssh -l admin 192.168.1.1` from IOS asks only for the password. From a PC it behaves like OpenSSH: the first connection asks you to accept the host key ("Are you sure you want to continue connecting (yes/no/[fingerprint])?"), then "admin@192.168.1.1's password:", "Permission denied, please try again." on a miss, and "Connection to 192.168.1.1 closed." at the end. `ssh admin@192.168.1.1` works too.
- A VTY line with `login` but no password answers "Password required, but none set". Console messages from the far device stay on its own console (switch to its tab), unless you run `terminal monitor` in the session.
- `show users` lists the console and every open Telnet or SSH session with where it came from. `login block-for` now really triggers: too many failures put the device in quiet mode (new connections refused, `%SEC_LOGIN-1-QUIET_MODE_ON` logged, `show login` shows the countdown). `login on-failure log` and `login on-success log` log each attempt.
- Commands you run over Telnet or SSH count for grading and for your rank like any other.

**reload**
- "System configuration has been modified. Save? [yes/no]:" when the running config differs from what is saved, then "Proceed with reload? [confirm]" (Enter or y; n cancels). The device logs `%SYS-5-RELOAD`, prints a short boot, and comes back with its saved configuration. Everything a real device loses is gone: unsaved changes, ARP and MAC tables, logs, NAT translations, DHCP bindings, err-disabled ports, unsaved sticky addresses.
- A lab that starts with a configured device counts that as saved (so `show startup-config` shows it, and a reload keeps it). A factory device that was never saved boots into "Would you like to enter the initial configuration dialog? [yes/no]:"; answer no.
- Any Telnet or SSH session into a device that reloads is dropped.

**Mind the change**
- Saved work in your browser replays through the new prompts. A journal that typed `exit` at the `#` prompt and carried on, or saved with `copy run start` and carried on, will now stop at the prompt it never answered. If a lab you resume looks wrong, start it over.

Tests: new `tests/prompts.cjs` (in GitHub Actions) covers every flow above. `labs.cjs` now runs 1465 guide commands (the extra lines are the passwords, the host-key answers and the Enters).

Verification: all nine suites pass (labs, forwarding, curriculum, lessons, ping, console, switching, prompts, ui, guidewin). In a real browser: `enable` on R1 showed "Password:" with the typed text hidden; telnet from R1 to R2 asked for R2's VTY password, showed `R2>` with the mode chip "User EXEC", ran `show ip interface brief` on R2 and closed with the foreign-host message; `reload` asked Save?, then confirm, played the boot, and came back as R1 without the unsaved enable secret.

## Switching realism: MAC address tables, flooding on the map, and frames that follow the spanning tree

**Switches learn, like real ones**
- Every switch now keeps a MAC address table. It learns the source address of each frame you send from a console (ping, traceroute, telnet, ssh, a DHCP request) on the port the frame arrived on, per VLAN.
- A frame to an address the switch has not learned is flooded out of every other port in that VLAN. A frame to a known address goes out one port. An ARP request is a broadcast, so it is flooded everywhere in the VLAN and every switch learns the sender; the ARP reply comes back along one path.
- Learned entries age out after 300 seconds of silence from that address (real time), leave at once when their port goes down, and leave when their VLAN is deleted.
- `show mac address-table` in the real 2960 layout, with the reserved CPU addresses, the switch's own address per SVI, secure port addresses as STATIC, then the learned entries, and "Total Mac Addresses for this criterion". Also `dynamic`, `static`, `vlan N`, `interface X`, `address H.H.H`, `count` and `aging-time`, in any combination, and the older spelling `show mac-address-table`.
- `clear mac address-table dynamic` (all, or by vlan, interface or address), `mac address-table static H.H.H vlan N interface X`, `mac address-table aging-time N` (0, or 10 to 1000000) and their `no` forms. Static entries and a changed aging time appear in the running-config.
- Router and switch ports each have their own MAC address now. `show interfaces`, `show ip arp`, `arp -a` and the MAC tables all agree, so you can trace an address from one device to the next.
- The HSRP virtual MAC (0000.0c07.acXX) is what a switch learns for the gateway, on the active router's port, as on real gear.

**The map shows the flood**
- When a frame has to be flooded, the map fans it out along every link it reaches at once, with a label ("ARP broadcast" or "Unknown MAC: flooded"). A frame that reaches a spanning-tree blocked port is shown dying there. The ARP reply then comes back along one path before the ping itself goes.
- The trace panel has a new Switching section: for each switch, which VLAN, whether it flooded or forwarded out one port, and which address it learned. Floods end with a reminder to run `show mac address-table`.
- A soft three-note sound plays on a flood (when sound is on). Everything is still off under reduced motion.

**Pings follow the spanning tree**
- A blocked (Altn/BLK) port carries nothing, so the animated path now matches `show spanning-tree`. Making a different switch root really changes the path a ping takes.
- EtherChannel bundles are one spanning-tree port: `show spanning-tree` lists `Po1` (cost 3 for two gigabit links, 12 for two FastEthernet) instead of the members.
- A switch cut off from the others elects itself root instead of believing in one it cannot hear.

**Not in this build**
- Switches only learn from traffic you send. A real switch would also learn its neighbours' addresses from their CDP, STP and other background frames, so a freshly opened lab starts with empty tables.
- Per-VLAN aging time, `mac address-table notification`, and IPv6 traffic do not touch the table.
- There is no `no spanning-tree vlan`, so a broadcast storm cannot be shown yet.

Tests: new `tests/switching.cjs` (runs in GitHub Actions) covers the spanning-tree path change, island roots, ARP and unicast learning, flooding of unknown addresses, every show/clear/static/aging form and its layout, per-port router MACs, the HSRP virtual MAC, EtherChannel as one STP port, DHCP learning and a switch SVI as the sender.

Verification: labs.cjs (73 labs, 416 checks, 1439 guide commands), forwarding.cjs, curriculum.cjs, lessons.cjs, ping.cjs, console.cjs, switching.cjs, ui.cjs and guidewin.cjs all pass. In a real browser: the ARP broadcast fanned out over every link of the spanning-tree lab, the trace panel's Switching section read correctly, `show mac address-table` on SW1 listed the two PCs on the right ports, and after `clear mac address-table dynamic` the next ping showed "Unknown MAC: flooded" at SW1 while SW3 still knew the address.

## Console realism, and the guide in its own browser window

**Errors that behave like IOS and Windows**
- Invalid input now shows the `^` under the word IOS could not accept, with the "% Invalid input detected at '^' marker." line underneath. A value a command rejects (for example `duplex sideways`) gets the `^` under that value.
- Unfinished commands say "% Incomplete command." (for example `ip add 1.1.1.1` with no mask).
- Ambiguous abbreviations are refused, as on a real router: `sh i` now says `% Ambiguous command:  "sh i"` instead of quietly running `show interfaces`. `sh ip int br` and `sh run` still work.
- A word that exactly matches a keyword is never treated as an abbreviation of a longer one, so `ip` no longer slips into an `ipv6` command.
- Typing a single unknown word at the `>` or `#` prompt does what real IOS does: it tries to look it up as a hostname ("Translating "hellp"...domain server (255.255.255.255)"), pauses, then says "% Unknown command or computer name". With `no ip domain-lookup` it answers at once. This is why that command is in every lab's basic setup.
- PCs answer like Windows: "'foo' is not recognized as an internal or external command", "Error: unrecognized or incomplete command line.", and the ping or tracert usage text when you leave out the target.
- All of these count as rejected commands for ranks, including output that is still playing when the command finishes.

**Output filters and help**
- `show ... | include`, `| exclude`, `| begin`, `| section` and `| count`, with regular expressions, as on IOS (`show run | section interface`, `show ip int br | exclude down`).
- `?` now gives a short description next to each keyword, and lists `|` after a complete show command.

**Everyday commands that were missing**
- `show version` (model, IOS version, uptime, interfaces, configuration register 0x2102 or 0xF).
- `show vlan id <n>`, `show running-config interface <name>`, `show interfaces description`.
- `show interfaces` now prints the hardware/MAC, description, MTU and bandwidth, encapsulation and duplex/speed lines.
- `duplex`, `speed` and `bandwidth` on interfaces: saved, shown in the running-config and `show interfaces`. `bandwidth` changes the OSPF cost, as on IOS.
- `terminal length 0` and `terminal monitor`.
- `ip host <name> <address>` and `ip name-server`, `show hosts`, and `ping`, `traceroute` and `telnet` by name. Unknown names try DNS first unless lookups are off.
- `security passwords min-length`, which rejects short new passwords with the real IOS message; `enable algorithm-type scrypt secret` (type 9) and `sha256` (type 8); `login block-for ... attempts ... within ...` with `show login`.
- `debug ip icmp`, `undebug all`, `no debug all` and `show debugging`. Debug messages appear in that router's own console tab (for example, ping a router from a PC, then switch to the router's tab), and they survive a reload.
- On PCs: `hostname`, `netstat`, `tracert -d` and `help`.

**Step-by-step guide in its own browser window**
- The pop-out guide has a new "New window ↗" button. It opens the guide as a separate browser window you can drag to a second monitor.
- Clicking a command in that window puts it in the main window's console, on the right device. Changing lab updates it. Reloading the main window reconnects to it. Closing it brings back the guide inside the page. "Dock to Lab4Net" in that window closes it and docks the guide.
- The guide window never starts the app itself, so it cannot change or overwrite your saved work.
- If the browser blocks pop-ups, a message says so.

**Not in this build**
- `show mac address-table` is saved for the switching realism build, where switches will learn MAC addresses from traffic.
- Prompts are saved for a later build with password prompts: `reload`, the interactive extended ping, and `copy run start` asking for a filename.
- Speed and duplex mismatches are not simulated yet; the settings are saved and shown only.
- `login block-for` is shown but cannot trigger until logins prompt for passwords.
- `nslookup` is not added, because there is no DNS server in the simulator.

Tests: new `tests/console.cjs` covers all of the above and runs in GitHub Actions. New `tests/guidewin.cjs` (optional, needs Playwright, like `ui.cjs`) opens the guide window over http and checks steps, lab changes, reconnecting, closing and docking. `tests/ping.cjs` now expects the `^` line.

Verification: labs.cjs (73 labs, 416 checks, 1439 guide commands; none of them rejected under the stricter parser), forwarding.cjs, curriculum.cjs, lessons.cjs, ping.cjs, console.cjs, ui.cjs and guidewin.cjs all pass. In headless Chromium: `?` help, the caret, the hostname-lookup pause, a typo counted as rejected, and debug messages in R1's tab after a PC ping (still there after reload) were driven and screenshotted. The guide window was tested over http, as on the container, and over file://.

## Ranks scored on results, not on how many commands you run

- Checking your work no longer costs anything. Extra `show`, `ping` or other commands, and the time they take, are never counted against your rank. Time and command count still appear on the results card, marked "not scored".
- A rank now comes from:
  - **Finishing the lab.** Every check must pass, as before.
  - **Testing it yourself.** An S needs at least one check of your own during the run: `show`, `ping`, `traceroute`/`tracert`, `telnet`, `ssh`, `ipconfig` or `arp`. Without one the best you can get is A, because a real engineer verifies before closing a ticket.
  - **Doing it yourself.** Help still lowers the rank: the walkthrough costs 25 points (B), the step-by-step guide 15 (A), each incident clue 5.
  - **Typos.** The first two rejected commands are free; after that each costs 2 points, up to 10.
- Removed: the command par and the time par. The results card now shows checks passed, how many checks you ran, rejected commands, time and commands (not scored), and help used.
- The Trophy case explains the new rules. Ranks you already earned are kept.

Verification: all six test files pass. In headless Chromium: Static routing with 150 extra show commands still gave S; a run with no check commands gave A; the guide gave A; two typos stayed S; five typos dropped to A. No page errors; the results card was checked by eye.

## Quicker ping and traceroute playback

- Live ping and traceroute output now plays at 40% of real time. A router timeout (`.`) takes 0.8 seconds instead of 2, PC replies arrive every 0.4 seconds instead of 1, and a clean `!!!!!` takes about a third of a second. Traceroute stars are quicker too, so a broken path reaches hop 30 in well under a minute (Ctrl+C or Ctrl+Shift+6 still stops it sooner).
- The engine still describes real-world timings; the console applies one speed setting (`PACE_SCALE` in the live console block), so the pace can be changed in one place.

Verification: all six test files pass. In headless Chromium a cold router ping (`...!!`) finished in about 3 seconds, a warm `!!!!!` in under half a second, and a PC ping in about 2 seconds, with no page errors.

## Pings and traceroutes that behave like real life

- Ping and traceroute output now plays live in the console instead of appearing all at once. On a router each `!` lands as its echo returns, a `.` waits the full 2-second timeout, and the prompt only comes back when the run is over. On a PC each "Reply from" line arrives about a second apart. Ctrl+C or Ctrl+Shift+6 stops a run early and prints the summary for the echoes actually sent, as IOS and Windows do. Typing the next command finishes the current output instantly. Reduced motion shows everything at once.
- Each device now keeps an ARP cache. The first ping through routers that have not yet resolved their next hop loses one echo per router (`.!!!!` or `...!!` on a fresh network); the next ping is `!!!!!`. New commands: `show ip arp` and `show arp`, `clear arp-cache`, and on PCs `arp -a` and `arp -d`.
- Failures now look the way they do on real gear:
  - A router with no route, or an ACL that drops the echo, sends an ICMP unreachable back if it can reach you: `U.U.U` on IOS, and "Reply from 10.0.12.2: Destination host unreachable." on Windows. Windows counts those as received, so the statistics can say 0% loss while nothing got through. That quirk is real and is called out in the code.
  - A missing return route gives timeouts (`.....`, "Request timed out.").
  - A PC with no default gateway prints "PING: transmit failed. General failure." A PC that cannot ARP for a host on its own subnet gets "Destination host unreachable" from its own address.
- Traceroute (`traceroute` on IOS, `tracert` on Windows) now:
  - shows `* * *` for a hop that has no route back to you, and keeps going to hop 30 until you stop it, as the real tools do
  - shows `!H` (no route) or `!A` (ACL) from the router that refused the probe, or "reports: Destination host unreachable." on Windows
  - shows a `*` on the last hop when the destination is a Cisco device, because of its ICMP rate limit
- Round-trip times vary a little per echo and grow with the number of routers. Windows TTL counts down from 128 (PC) or 255 (Cisco) per router. Windows statistics include the "Approximate round trip times" block and the trailing comma.
- Extended options: IOS `ping <ip> repeat <n> size <bytes>` (wrapping at 70 characters per line), Windows `ping -n <count> -l <bytes> <ip>` in either order. Up to 500 echoes per run. Unknown names say "could not find host"; bad options say how to use the command.
- New sounds when sound is on: a tick for each reply, a low note for each timeout, a buzz for each unreachable.
- Console colours: an all-`!` line is green, a mixed line amber, an all-`.` or `U` line red; the success rate line follows the same rule, and unreachables are red.
- The "why" text for ping, traceroute and tracert now explains `!`, `.`, `U`, `*`, `!H` and `!A`.
- Timings: router timeouts are the real 2 seconds; Windows timeouts are shortened (2 seconds per echo, about 1.5 seconds per traceroute star instead of 4) so a failing test does not drag.
- Not changed: IPv6 pings still print all at once with the old fixed output. Pings run from the step-by-step guide's prompt recorder and from saved-work replay print instantly, since those are not typed live.
- Tests: new `tests/ping.cjs` covers the ARP first echo, warm cache, `clear arp-cache`, extended ping, Windows TTL and statistics, both traceroute formats, return-route stars, `U.U.U` and `!H`, unreachables counted as received, ACL reports, host-side failures and abort summaries. It runs in GitHub Actions.

Verification: labs.cjs (73 labs, 416 checks, 1439 guide commands), forwarding.cjs, curriculum.cjs, lessons.cjs, ping.cjs and ui.cjs all pass. In headless Chromium at 1440x1000, a live router ping was watched mid-run with the prompt hidden, a 30-echo ping was stopped with Ctrl+Shift+6, a running PC ping was flushed by typing the next command, a tracert with a broken return route was stopped with Ctrl+C, a lab was switched mid-ping, and reduced motion printed instantly, with no page errors. Screenshots checked by eye. Not tested: the Lab4Net container, Firefox, Safari, and how the new sounds actually sound.

## Lessons for every lab and every exam topic

The DHCP pilot is now the full set: 54 lessons.

- **36 lab lessons**, one for every build lab. Each opens in the mission window the first time you open its lab, until you press Start the lab. It explains the problem the feature solves, how it works and how this lab configures and checks it, using the lab's own devices and addresses. Its "See it happen" story steps through the traffic on the lab's own map (a frame being tagged, a route chosen, an address translated, a port blocking). Then key terms, what the exam expects, common mistakes and a 4 or 5 question quick check. Incidents link to the lesson of the lab they break.
- **18 topic lessons** for the CCNA 200-301 v1.1 objectives that have no lab: network components and topologies, cabling and interface faults, TCP and UDP, IPv4 addressing and subnetting, how a switch forwards frames, virtualization and the cloud, wireless principles, wireless architectures and AP modes, securing and configuring a WLAN (the controller GUI described step by step), device management and AAA, security concepts, passwords, MFA and VPNs, SNMP, TFTP and FTP, QoS, controller-based networking, REST APIs and JSON, Ansible and Terraform, and AI in network operations.
- **Lessons view**: a new Lessons entry under Practice in the lab menu lists every lesson by exam domain with what you have read. Topic lessons open beside the list; "Mark read, next lesson" moves through them. Lab lessons (tagged Lab) open in their lab.
- **Study map**: each exam domain lists its topic lessons. Domains with no lab say the lessons cover them.
- **Rewards**: 30 XP for each lesson read and 10 for each quick-check answer right. A new trophy, Bookworm, for reading every lesson.
- Quick-check answers appear in a fixed shuffled order per question, so the right answer is not always in the same place.
- The objective tags now cover every CCNA v1.1 objective, so topic lessons show theirs.

How they were made: written to one brief (now `docs/LESSON-WRITING.md`), then every lesson was read for accuracy, and specific claims about the labs (for example which address a PC is leased) were checked against the simulator.

Tests: new `tests/lessons.cjs` (also in CI) checks every lesson's structure and allowed markup, that every quiz has four different options and a valid answer, that every story step uses devices on the lab's map that are cabled together, and that every build lab has a lesson. It can also check a draft file before it is added. ui.cjs checks the lesson opening on the first visit, the story, an answer being kept, the incident link and the Lessons view.

Verification: labs, forwarding, curriculum, lessons and ui all pass (ui grades all 73 labs in Edge with every lesson in place). Checked in Edge at 1440x1000 and 390x844 with no page errors. index.html is now about 1.16 MB. Not checked: the container, Firefox, Safari.

## Lessons: learn the concept before the commands (pilot: DHCP)

The labs taught which commands to type but not the networking behind them. A lab can now have a lesson that teaches the concept first. This is a pilot with one lesson, for DHCP server and relay, so the format can be reviewed before the other labs get theirs.

- The first time you open the lab, the mission window shows the lesson instead of the mission. "Start the lab" marks it read and goes to the mission. After that, a card at the top of the mission offers the lesson again, with whether you have read it and your quick-check score.
- The lesson covers what DHCP solves, pools (one per subnet, and how the server picks one), leases and exclusions, the four DORA messages, why remote subnets need a relay and where the helper address goes, and how to check it worked.
- See it happen: seven steps, each animated on the lab's own network map with an explanation (Discover, Offer, Request, Acknowledge, a broadcast stopping at R2, the relayed Discover, the reply coming back). You step through at your own pace.
- Key terms, what the CCNA exam expects (objectives 4.3 and 4.6), common mistakes, and a four-question quick check with an explanation for each answer.
- The DHCP incident links to the same lesson ("Lesson for this topic").
- Lesson progress is saved in the browser (lab4net-lessons-v1) and included in Transfer progress.

Tests: ui.cjs checks the lesson opens on first visit, steps the story, records an answer, closes with Start the lab, does not reopen, and is linked from the incident. All four tests pass, and the lesson was checked in Edge at 1440x1000 and 390x844 with no page errors.

## Windows fit where you drop them

Dragging a window by its title bar now places it in the layout instead of leaving it floating over the others. A dashed preview shows where it will land, cyan outlines show what else will move, and a label says what will happen.

- Drop on the middle of another window: the two swap places and sizes.
- Drop near another window's edge: that window's space is split in half between the two.
- Drop in empty space: the window grows to fill the empty area around the pointer.
- A window that sat flush against the space the dragged window left, and is no wider (or taller) than it, grows to fill it.
- A short nudge returns the window to its place.
- Resizing an edge that other windows share moves it like a divider: the windows on both sides resize together, and none goes below the minimum size.
- Hold Alt to place or resize one window freely, as before. The screen-edge half and full snaps are unchanged. Windows slide into place (no animation with reduced motion).
- How to use explains all of this under "Arrange your windows".

Fixed on the way: the mission window could never be taller than 45% of the screen in the free layout (an older stacked-layout rule outranked the free-layout one), so it was cut short after a resize or swap.

Tests: ui.cjs drags real windows with the mouse: a nudge, a swap, a split with the neighbour filling the space, and a shared-edge resize. Verification: all four tests pass, and swap, split, fill, Alt placement and the layout surviving a reload were checked in Edge at 1440x1000 with screenshots. Not checked: the container, Firefox, Safari.

## Lab library, phase 5: capstones and theory questions

A new Capstone group, after the incidents. Each capstone starts from factory defaults and is graded on the whole network working, so it pulls several labs together without telling you the order.

- **Capstone: branch office from scratch**: VLANs for staff and guests, a trunk with native VLAN 99, router-on-a-stick with a native subinterface, DHCP pools for both VLANs, PAT to the ISP, a guest ACL that only allows web browsing (and still lets DHCP through), and SSH-only management limited to the staff subnet.
- **Capstone: campus core**: a Catalyst 3560 distribution switch with an LACP EtherChannel trunk to the access switch, port security on the access ports, the distribution switch as the spanning-tree root, SVIs as gateways, a routed uplink running OSPF with the router, and DHCP relay to a central server.

Capstones open with the step-by-step guide off, whatever the global guide setting. Turning it on inside a capstone is remembered for that capstone only (`lab4net-capstone-guide`, included in Transfer progress), and the global setting is untouched. The library and brief label them CAPSTONE 01 and 02, the Study map counts them separately, and its note explains the guide default.

Engine changes behind them:

- `encapsulation dot1Q N native` on a router subinterface: untagged frames on the parent port go to that subinterface, and it appears in the running config.
- An inbound ACL now filters DHCP discovers (UDP 68 to 67, to 255.255.255.255) before they reach a server or relay, so a guest ACL must permit bootps. The `bootps`, `bootpc`, `ntp`, `snmp` and `syslog` port names are accepted.

Theory check: 12 new questions (28 in all) on automation (Ansible, northbound APIs, JSON, why automate), wireless (WPA3, lightweight access points and the controller), security (DHCP starvation, multifactor authentication), network fundamentals (control plane, private ranges) and IPv6 (solicited-node multicast). They were added at the end, so saved answers keep their places.

Tests: ui.cjs checks that a capstone opens with the guide off when the global guide is on, that turning it on is remembered per capstone, and that the brief shows CAPSTONE 01.

Verification: labs.cjs passes 73 labs, 416 checks and 1439 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass (ui.cjs grades all 73 in Edge). Both capstone guides were run through the real console in Edge and graded, with no rejected commands and no page errors, and the screens were checked at 1440x1000 and 390x844. Not checked: the container, Firefox, Safari.

## Lab library, phase 4: 29 more troubleshooting incidents

The Troubleshooting group now has 35 incidents, at least one for every build lab. Each starts from the finished lab with one fault added (sometimes with a little background setup), reproduces a real failing service, has three clues (Direction, Evidence, Repair), a lesson, and an inline step-by-step guide, and is graded with the original lab's checks.

- Spec list: OSPF uplinks in the wrong area (07), BPDU Guard err-disabling a switch's uplinks (08), an EtherChannel forced on against LACP (09), PAT inside and outside reversed (10), a standard ACL on the wrong interface and direction (11), an extended ACL deny inserted above the permit (12), a port security violation in shutdown mode after a laptop swap (13), and static NAT to the wrong inside global (14).
- Phase 1 labs: native VLAN mismatch breaking switch management (15), a wrong switch default gateway (16), access-class permitting the wrong subnet (17), the OSPF uplink made passive (18), a deleted VLAN (19), CDP turned off globally instead of per interface (20), a wrong DHCP default-router (21).
- Phase 2 labs: a primary static route with an unreachable next hop hidden by the floating route (22), a host route on the wrong server (23), mismatched OSPF hello timers (24), LLDP transmit and receive swapped (25), a deleted voice VLAN (26), a NAT pool outside the routed block (27), an ACL exception added after the deny (28), a wrong NTP server (29).
- Phase 3 labs: ip routing off on the Layer 3 switch (30), the snooping uplink untrusted (31), a DAI static binding on the wrong port (32), IPv6 unicast routing off (33), an IPv6 route to a mistyped prefix (34), the HSRP virtual IP changed away from the hosts' gateway (35).

Engine changes behind them:

- Err-disabled ports: BPDU Guard on a port that hears BPDUs, the EtherChannel guard when one end is forced on, and port security violations in shutdown mode. The real log messages appear, the port is down at both ends, show interfaces says (err-disabled), and recovery is shutdown then no shutdown (it trips again if the cause is still there). The map shows the dead links.
- Port security tracks MAC addresses: dynamic, sticky (written to the config, kept until removed) and static, with the maximum enforced and violations counted. restrict and protect keep the port up and drop the offending host. show port-security, show port-security interface and show port-security address show the real details.
- show interfaces status (and err-disabled), spanning-tree portfast bpduguard default, no channel-group, no switchport trunk native vlan, no ip nat inside source static, and IOS refusing to redefine a NAT pool in use.
- OSPF hello and dead intervals (ip ospf hello-interval and dead-interval) must match for an adjacency. A network-type mismatch now forms the adjacency but loses the routes through it, as on a real router (phase 2 had simplified this).
- show spanning-tree vlan N says when the VLAN has no instance.
- The Fault Finder trophy now asks for every incident, not six.

Tests: tests/curriculum.cjs accepts any number of incidents and non-packet symptoms (a check function, for discovery, NTP, IPv6 or a preferred path), requires a lesson, rejects any repair command IOS would refuse, and ignores counters, logs and NAT translations when it checks that the diagnostic probe changed no configuration. tests/forwarding.cjs adds BPDU Guard trip and recovery, the EtherChannel guard, and port security shutdown and restrict.

Verification: labs.cjs passes 71 labs, 400 checks and 1262 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass (ui.cjs grades all 71 in Edge). Every new incident's guide was run through the real console in Edge and graded, with no rejected commands and no page errors, and the screens were checked at 1440x1000 and 390x844. Not checked: the container, Firefox, Safari.

Not done: randomised faults. Every incident is still a fixed scenario.

## Lab library, phase 3: Layer 3 switching, Layer 2 security, IPv6 and HSRP

New labs, appended after phase 2, plus a new IPv6 group in the lab library:

- **Inter-VLAN routing on a Layer 3 switch** (Switching): a Catalyst 3560 becomes the gateway for both VLANs with ip routing and SVIs, and gets a routed uplink with no switchport. The trace shows one hop between VLANs instead of a trip through the router.
- **DHCP snooping** (Security): a rogue DHCP server on the access switch answers first and hands out itself as the gateway. Snooping with a trusted uplink silences it; then the real server goes quiet too, because of option 82, which the learner has to diagnose and fix.
- **Dynamic ARP Inspection** (Security): DAI against the snooping binding table. Turning it on first cuts off the gateway until the uplink is trusted; the printer with a fixed address needs a static source binding; the host with a hand-set address is dropped.
- **IPv6 addressing** (IPv6): global, link-local and EUI-64 addresses on R1, multicast groups in show ipv6 interface, SLAAC on two hosts and a static host.
- **IPv6 static and default routes** (IPv6): a network route, a default route, a /128 host route, and floating routes over a backup link that only has link-local addresses, which forces the exit-interface rule.
- **First-hop redundancy with HSRP** (Routing): R1 and R2 share a virtual gateway; R2 takes over when R1's LAN link fails and R1 pre-empts back when it returns.

Engine changes behind them:

- Layer 3 switch: a Catalyst 3560-24PS model with ip routing off by default. When routing is on it routes between SVIs and routed ports and runs static routes, OSPF, ACLs and DHCP relay. It refuses switchport mode trunk until the trunk encapsulation is set to dot1q, as the real switch does. show ip route on a switch without routing shows its default gateway. **The sandbox has a Layer 3 switch** (this clears that owed item).
- DHCP: a client takes the nearest answer from every server that can reply, including a host running a DHCP service. DHCP snooping (per VLAN, trusted ports, option 82, binding table, rate limit), and the IOS server and relay rule that drops option 82 without a relay address unless trusted.
- Dynamic ARP Inspection in the forwarding path: on each Layer 2 hop, both ends' ARP is checked on untrusted ports against the binding table; drops show in the trace panel and the counters. ip source binding for fixed-address hosts. ipconfig /all shows the MAC address.
- IPv6: 128-bit addresses printed the IOS and Windows way, global/link-local/EUI-64 addresses with a separate MAC per router port, ipv6 unicast-routing, IPv6 static routes with distance and the link-local next-hop rule, a separate IPv6 routing table and forwarding path, SLAAC and static addressing on hosts (ipv6config, as in Packet Tracer), ping and traceroute, show ipv6 interface (with joined multicast groups) and show ipv6 route.
- HSRP: groups with virtual IP, priority, preempt and version 2; election state kept between commands; the active router answers for the virtual IP; state changes logged; show standby and show standby brief.
- The Study map note now says what is not simulated: wireless, automation and IPv6 routing protocols.

Tests: tests/forwarding.cjs was extended first for IPv6 (address text forms, EUI-64, SLAAC, the unicast-routing switch, the link-local next-hop rule, longest match and a floating default), then for Layer 3 switching, DHCP snooping against a rogue server, DAI drops and static bindings, and HSRP failover with and without pre-emption.

Verification: labs.cjs passes 42 labs, 239 checks and 881 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass (ui.cjs in Edge). Each new lab's guide was run through the real console in Edge and graded, with no rejected commands and no page errors; the maps were checked at 1440x1000 and the Mission window at 390x844. The DAI map's port labels crowded around the switch and the devices were spread out. Not checked: the container, Firefox, Safari.

Simplified, and recorded in the handoff: IPv6 has static routing only (no OSPFv3, no DHCPv6, no IPv6 ACLs); HSRP has no object tracking and fails over instantly instead of after the hold time; the DHCP snooping rate limit is configured and shown but not enforced; DAI has no ARP ACLs or extra validation options.

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
