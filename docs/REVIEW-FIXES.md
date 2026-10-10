# Lab4Net review fixes (review of cf0e852..440ac77, 9 Oct 2026)

Review of Fable's 14 commits (switching realism through multi-area OSPF). All 14 Node test files, `ui.cjs` and `guidewin.cjs` pass, and the design holds up. The items below were found by driving the engine and the page directly; the HIGH ones were each reproduced twice. Fix them in this order. **Add a regression test for every HIGH and MEDIUM fix** (in the matching `tests/*.cjs`), so they stay fixed.

Rules from docs/HANDOFF.md still apply: accuracy first, never weaken a test, full suite before each push, check visual changes in a real browser, update CHANGES.md / HANDOFF.md / "Still owed".

---

## Must fix (HIGH)

### 1. Simulator crash: spanning tree off on a dead-end switch
- **Done (milestone 1).** `stpCalc` counts a neighbour as a bridge only when that switch runs STP for the VLAN (`ports.has`), so a dead-end chain of STP-off switches is an edge port. The console and replay call the engine through `safeExec`: an engine error prints `% Lab4Net internal error: …` for that one command and the rest carries on. Tests: `switching.cjs` (dead end, tail off a triangle), `pageflows.cjs` (error contained live and in replay).
- **Repro:** two switches A–B cabled, STP on A, then on B `no spanning-tree vlan 1`. Any ping from a PC, or `show spanning-tree` on A, throws `TypeError: ports.get is not a function`. A tail switch off an STP-off triangle does the same.
- **Cause:** `through()` inside `stpCalc` (~line 1300) returns the STP-off neighbour's name when a chain of STP-off switches dead-ends; `stpCalc` then looks it up in `ports`, which doesn't have it.
- **Impact:** `stpCalc` sits under `l2peers`, so pings, OSPF and the map all break. A student who turns STP off "to see what happens" kills the lab.
- **Also:** wrap the UI's command execution (`execute` and the replay loop) in a try/catch that prints a console error line instead of leaving the page half-updated.

### 2. Saved work replays onto the wrong device (login block-for)
- **Done (milestone 1).** Journal entries now keep the time they were typed (`t`), and the engine has its own clock (`simNow()`, `SIM_NOW`). Replay runs each command at its typed time, so quiet mode ends exactly as it did live. MAC aging uses the same clock. Old journals without times replay as before. Tests: `prompts.cjs` (the exact journal, both inside and after the quiet period), `pageflows.cjs` (a real page reload of that journal: R1 keeps its name).
- **Repro:** R2 has `login block-for 30 attempts 3 within 60`. Fail three telnet logins from R1, wait 45 s, telnet again, log in, `enable`, `configure terminal`, `hostname HACKED`. Live, R2 is renamed. Reload the page: the journal replays instantly, quiet mode is still "on", the telnet is refused, and the remaining lines run on **R1**, so R1 becomes HACKED.
- **Cause:** quiet mode is timed with the real clock (`quietMode`/`loginFailed`, ~3722) while replay is instant.
- **Fix:** replay must reproduce the live result. Record time-dependent outcomes in the journal entry (e.g. accepted/refused), or use a simulated clock advanced by journal timestamps. Add a test that replays this exact journal and checks R1 keeps its hostname.

### 3. Transfer progress loses the new progress
- **Done (milestone 1).** The three keys are in `EXTRA` and in the HANDOFF storage list. The exam, campaign and sandbox-challenge stores repair damaged values on load, and a failed exam resume is dropped instead of breaking the page. Test: `pageflows.cjs` (export carries the keys, a clean browser imports them, damaged values load with no errors).
- `EXTRA` in the backup block (~4918) is missing `lab4net-exam-v1`, `lab4net-campaign-v1` and `lab4net-sbx-done-v1`. Export then import in a clean browser: XP 640 → 350, stages cleared 1 → 0, exam history and daily count gone.
- Add the keys; add them to the HANDOFF storage-key list too. Make loading tolerant of damaged values (`{"history":null}` in `lab4net-exam-v1` currently throws on load).

### 4. `enable` over Telnet works with no enable password
- **Done (milestone 1).** A VTY session with no enable secret or password gets `% No password set` and stays at `>`; the console still goes straight in. Test: `prompts.cjs`.
- **Repro:** R2 has `line vty 0 4`, `password vv`, `login`, and no enable secret or password. From R1: `telnet 10.0.12.2`, `vv`, `enable`. The result is `R2#`.
- **Real IOS:** `% No password set`, and you stay at `R2>`. This is a classic CCNA point: you can't manage a router remotely without an enable secret. The console still allows `enable` with no password. Fix around line 3751 by checking the session is a VTY.

### 5. Gigabit links fall back to half duplex
- **Done (milestone 1).** A port stops autonegotiating only when both speed and duplex are forced; forcing one of them limits what it advertises. An auto port facing a non-negotiating one falls back to half at 10/100 and full at 1000. Which Catalysts refuse `duplex` with speed auto could not be confirmed, so the textbook rule is used and noted in Known limits. `tests/duplex.cjs` was corrected: the classic mismatch is now `speed 100` + `duplex full` against auto, and gigabit forced against auto settles at full.
- **Repro:** set `duplex full` on SW1 Gi0/1 (Spanning tree lab) and leave SW2 on auto. SW2 shows `a-half a-1000`, and both ends log a duplex mismatch. `tests/duplex.cjs` locks in "Half Duplex, 1Gbps" on R2.
- **Real rule (the CCNA one):** an auto port that can't negotiate falls back to half duplex at 10/100 and full at 1000. Half duplex at 1 Gb/s effectively doesn't exist.
- **Also:** forcing duplex alone, with speed still auto, should not count as turning negotiation off. Only forcing both speed and duplex does. Check how a 2960 handles `duplex` with `speed auto`; some Catalysts refuse with "Duplex will not be set until speed is set to non-auto value". If you can't confirm the behaviour, use the textbook rule and note it in Known limits. Fix `linkSettle` (~3941) and correct the test.

### 6. Exams: a pass when time runs out is never recorded
- **Done (milestone 1).** `timeUp` grades while the exam still counts as running, so an all-passing network is recorded as a clear (campaign bosses included); only a failing one becomes a time-up. Test: `pageflows.cjs`.
- **Repro:** fix every fault, then let the clock reach 0. `timeUp` sets the state to `timeup` before `gradeNow()`, so the `celebrate` wrapper returns early (~6363/6406).
- **Result:** no clear and no fail are recorded, no card shows, the console isn't locked, and the campaign boss isn't cleared. Meanwhile `progress['Exam · X']` and a rank are still saved.
- **Rule:** the network is graded as it stands when time runs out, so an all-passing network counts as a clear.

### 7. Quiz #60 marks the wrong answer (~4261)
- **Done (milestone 1).** The answer is 1, and the explanation now reads 100/100 = 1, with 10 for 10 Mbps Ethernet. Test: `quiz.cjs`.
- The question is "Default OSPF cost of a FastEthernet interface". It marks **10** with the explanation "100/100 = 10".
- **Correct:** **1** (100 Mbps ÷ 100 Mbps). Cost 10 is for 10 Mbps Ethernet. The explanation also contradicts itself ("GigabitEthernet also gets 1"), and the lab engine itself gives FastEthernet a cost of 1.
- Fix the answer index and the explanation.

---

## Should fix (MEDIUM)

**Exams and campaign**
8. **Exams can be cheated, and runs go unrecorded.**
   - **Done (milestone 2).** One exam at a time: a second start (daily or any other) is refused and the Exam dialog offers Resume or Give up. While an exam or boss runs, nothing else opens (other labs, its own base lab, practice views, lessons, the sandbox); the notice says why. Giving up is recorded as not cleared. Test: `pageflows.cjs`.
   - The daily challenge can be restarted with a fresh 20-minute clock by reopening Exam sim and clicking start again; the abandoned run is never recorded. The same goes for any exam replaced by a new start. An exam already in progress should resume, not restart.
   - The exam title names the base lab, so you can switch to it, read its Walkthrough or lesson, and come back.
   - **Fix:** while an exam or boss is running, block opening other labs (or count it as help and record it), and block Walkthrough/lesson access.
9. **Leaving a running exam strands it.**
   - **Done (milestone 2).** You can no longer leave it, and the Exam dialog has Resume. An exam whose time ran out while its lab was not open (the page closed) is graded from its saved work and recorded on the next load or tick, with a notice, instead of dragging you back into a Time's-up card. Test: `pageflows.cjs`.
   - Once you open another lab there's no way back. The menu has no entry and the Exam dialog has no "Resume".
   - `timeUp` only fires while the exam lab is open.
   - The next reload drags you back into it with a Time's-up fail.
   - Add Resume, and record time-up even when the exam isn't the open lab.
10. **XP goes up, then down after a reload.**
   - **Done (milestone 2).** Exam labs never write lab progress; their XP comes only from the exam store (`examStats`). `xp()`, the Halfway/Full Clear trophies and the Study map skip exam labs. Old `Exam · …` titles are cleared from progress, saved work and ranks (`l4nFun.forget`) when the exam is over. Test: `pageflows.cjs` (XP equal before and after a reload, no exam titles left). `xp()` (~4584) loops over `LABS`, which includes the temporary exam lab, so its XP disappears after a reload. Exam titles also stay forever in `ccna-bench-v2`, the drafts and the ranks. Keep exam XP in the exam store and keep exam titles out of normal lab progress.
11. **Reloading after an exam opens the wrong lab.**
   - **Done (milestone 2).** `saveWork` keeps `lastLab` on the last real lab. Test: `pageflows.cjs`. `lastLab` is saved as the exam's index (77), which doesn't exist after a reload, so it opens a capstone instead. Save the last real lab.
12. **Boss health refills on reload**
   - **Done (milestone 2).** The last graded health is saved on the exam (`hp`) and shown after a reload. Test: `pageflows.cjs`. (2/6 → 6/6). Save the last graded state, or re-grade silently on load.
13. **The time's-up failure card is titled "STAGE CLEAR"**
   - **Done (milestone 2).** The card title is set per result: "Time's up" for a time-up, "Stage clear" for a clear. Test: `pageflows.cjs`. (fixed header text, ~575). Give it a proper failure title.
14. **The "Exam started…" notice covers the Grade lab button**
   - **Done (milestone 2).** Every notice clears itself after five seconds (click still dismisses it at once). Test: `pageflows.cjs`. at 1440×1000 and never goes away by itself. Auto-dismiss it after a few seconds, or move it.
15. **Boss fights sometimes have only two faults**
   - **Done (milestone 2).** A boss now looks for three faults across its whole pool first and settles for two only when no lab can give three (40 of 40 free-choice seeds give three; a campaign boss limited to the IPv6 labs can give two). The exam bar names the real count, the trophy and campaign texts say "two or three", and the health bar starts at the real number of failing checks (`hp0`). Test: `pageflows.cjs`. (8 of 40 seeds; `makeExam` accepts `f.length>=2`). Either always build three, or make the UI and trophy text say "two or three". The health bar should also start at the real number of failing checks.

**Sessions and logins**
16. **`reload` over Telnet/SSH skips "Save? [yes/no]" and "[confirm]"**
   - **Done (milestone 3).** A VTY reload asks Save? (when the configuration changed) and [confirm] exactly like the console; confirming closes the session and puts `%SYS-5-RELOAD … on vty0` and the boot messages on the device's own console (`vtyReload`); `n` keeps the session. Test: `prompts.cjs`. and throws away unsaved changes (~3835). Real IOS asks on VTY lines too.
17. **After a reload over Telnet, the device's own console is left in a dead mode.**
   - **Done (milestone 3).** Every session records which boot of its device it belongs to (`s.boot` against `d.boots`, set by an `execLine` wrapper). After a reload any other session on that device starts again at `>` and its next line is the RETURN of "Press RETURN to get started". Test: `prompts.cjs` (a console left in interface configuration comes back at `R2>`). It stays at `(config-if)#` pointing at the old interface objects, so its next commands are silently lost (`restoreBoot`, ~3810). After a reload, reset every session on that device to `>` with "Press RETURN to get started".
18. **VTY defaults are wrong**
   - **Done (milestone 3).** Routers and switches start with `login` on `line vty 0 4` and no password. Port 23 answers whenever the VTY transport allows Telnet; the login decides the rest: no password set gives "Password required, but none set" (IOS) or "Connection to host lost." (Windows), `no login` lets you straight in, `login local` with no users asks `Username:` and says "% Login invalid". Test: `prompts.cjs`. (`listens()` ~1157, default lines ~602):
    - A fresh IOS 15 router has `login` on `line vty 0 4` by default, so telnet should say "Password required, but none set", not "% Connection refused by remote host".
    - `no login` on the VTY should let you straight in with no password. That's the insecure case students should see.
    - `login local` with no usernames should show `Username:` and then "% Login invalid".
19. **`login` after `login local` stays local**
   - **Done (milestone 3).** `login` now clears `login local`. Test: `prompts.cjs`. (~902). In IOS, `login` replaces `login local`.
20. **Passwords end up in command history after a reload.**
   - **Done (milestone 3).** Fixed with item 2 in milestone 1: `replay` checks whether each line answered a masked prompt and keeps it out of history, as live typing does. Test: `pageflows.cjs` (after the reload of the block-for journal, the history holds no password answers). Live typing keeps masked answers out of history (~4146), but replay (~4108) pushes every journal line. Mark password answers in the journal and keep them out of history on replay.

**Switching**
21. **Blocked ports still learn MAC addresses**
   - **Done (milestone 4).** `macBackground` skips a port spanning tree blocks in that VLAN, and learns a neighbour switch from its BPDUs only when the far port is forwarding. `switching.cjs` had locked in the bug (SW2 learned on SW1's blocked Gi0/1); its counts were corrected and an explicit check added. (`macBackground`, ~3551). In the spanning-tree lab, SW1 lists SW2's MAC as DYNAMIC on Gi0/1, which is Altn BLK. Skip blocked ports, and only learn BPDU senders when the far port is forwarding.
22. **MAC entries go stale after a topology change.**
   - **Done (milestone 4).** A change in the spanning tree between switches (`stpSig`, edge ports excluded) flushes the dynamic entries in that VLAN on every switch after the command (`stpFlush`); a host port going down does not. In `l2frame` a lookup that points back out of the ingress port counts as unknown. Test: `switching.cjs` (the review's repro: no switch forwards out of its ingress port, entries flushed, a host port does not flush). Ping both ways, shut SW1 Gi0/2, then ping PC2 → PC1. The trace says SW2 forwarded out the same port the frame came in on. On a spanning-tree topology change, flush dynamic entries (or age them in 15 s), and treat a lookup that points back at the ingress port as unknown.
23. **Forced speed doesn't change STP cost or BW.**
   - **Done (milestone 4).** STP port cost follows the speed the link runs at (100 at 10 Mb/s, 19 at 100, 4 at 1000; 56/12/3 for a two-link bundle), and `bwOf`/`ospfCost` use a forced speed as the bandwidth (`speed 10`: BW 10000 Kbit, OSPF cost 10). Test: `switching.cjs`. After `speed 10` the STP cost should be 100 (19 at 100 Mb/s) and `show interfaces` should show BW 10000 Kbit (~1292).
24. **Error counters count the wrong direction**
   - **Done (milestone 4).** CRC errors and runts count only on frames the full-duplex end receives, late collisions only on frames the half-duplex end sends, and each builds up at its own rate (so 4 echoes give 2 CRC and 1 runt, not 4 and 4). Test: `duplex.cjs`. (~3956). After a 4-echo ping the full-duplex end showed "4 packets input, 6 input errors, 4 CRC". CRC and runts count only on received frames; late collisions only on sent frames.

**OSPF**
25. **An ABR uses inter-area routes from non-backbone areas.**
   - **Done (milestone 4).** An ABR now examines only summaries heard in area 0 (RFC 2328 §16.2), so it also advertises the cost it really uses. Test: `ospfarea.cjs` (the review's two-ABR scenario: `O IA` 102 through area 0, not 3 through area 1; a router inside area 1 still uses the cheaper summary). In real OSPF (RFC 2328 §16.2) an ABR uses only the area-0 copies of other areas' routes.
    - Repro: two ABRs share areas 0 and 1, and the area-0 link between them costs 100. The sim installs `O IA … [110/3]` through area 1. Real IOS gives `[110/101]` through area 0.
    - When an ABR advertises a route into another area, it should use the cost it actually uses itself.
26. **No log message for an area mismatch**
   - **Done (milestone 4).** `%OSPF-4-ERRRCV: Received invalid packet: mismatched area ID …` is logged on both ends: the backbone-virtual-link form where an area-0 hello reaches a non-backbone interface, the plain form otherwise; on the console of the router you typed on, in the log of the other; then at most once a minute (engine clock). Test: `ospfarea.cjs`. (this is Incident 37's main clue). Real IOS repeatedly logs `%OSPF-4-ERRRCV: Received invalid packet: mismatched area ID from backbone area must be virtual-link but not found from <ip>, <interface>` (or `mismatched area ID` for non-backbone areas). Log it, rate-limited, the same way other syslog messages are.

**Quiz**
27. **Quiz #45 (~4246) is misleading.**
   - **Done (milestone 4).** Reworded to ask for one feature: "Which feature err-disables a PortFast access port as soon as a switch is plugged into it?" (BPDU guard); the explanation says why BPDU filter is the wrong answer. Test: `quiz.cjs`. It marks "BPDU guard and BPDU filter" as the protection when someone plugs a switch into a PortFast port. BPDU filter set on an interface makes the port ignore BPDUs, which can cause a loop. Reword to ask for a single feature (BPDU guard), or pair BPDU guard with root guard.

---

## Polish (LOW)

- **Phone:**
  - the exam/boss bar squeezes its text into a one-word column about 330px tall; let it wrap under the clock **Done (milestone 5).** Test: `pageflows.cjs` (the note stays under 80px tall at 390px wide).
  - starting a campaign boss on a phone leaves the page scrolled down, with the clock off screen **Done (milestone 5).** Starting any exam scrolls back to the top. Test: `pageflows.cjs`.
- **Exam UI:**
  - after Quit the bar reads "· · no guide…" (minutes missing) **Done (milestone 5).** Test: `pageflows.cjs`.
  - Quit has no confirmation **Done (milestone 5).** "Give up this exam?" with Give it up / Keep going. Test: `pageflows.cjs`.
  - the Exam dialog's Clock option stays on 20 when Boss is picked **Done (milestone 5).** Boss sets 30 and locks the other clock choices. Test: `pageflows.cjs`.
  - root-cause text can start a sentence in lower case **Done (milestone 5).** Test: `exam.cjs`.
- **Telnet and SSH:**
  - IOS prints `Trying x ... Open` on one line, then blank lines before "User Access Verification" **Done (milestone 5).** Test: `prompts.cjs`.
  - `show users` inside a VTY session should put `*` on your own VTY line **Done (milestone 5).** Test: `prompts.cjs`.
  - three failed `enable password` attempts should say `% Bad passwords` (with `enable secret` set, `% Bad secrets` is correct) **Done (milestone 5).** Test: `prompts.cjs`.
  - Windows telnet to a VTY with `login` and no password should show "Password required, but none set" then "Connection to host lost.", not "Connect failed" **Done (milestone 3, with item 18).**
  - suspending a session (Ctrl+Shift+6 then x, `show sessions`, `resume`, `disconnect`) doesn't exist yet; add it to Still owed **Done (milestone 5).** Added to Still owed in HANDOFF.md.
- **Copy and extended ping:**
  - `copy run start` ignores a typed destination filename **Done (milestone 5).** Another name saves a copy in NVRAM ("… bytes copied") and leaves the startup-config alone. Test: `prompts.cjs`.
  - extended ping: answering "Sweep range of sizes" with `y` skips the min/max/interval questions, and the DF-bit and timeout answers are ignored **Done (milestone 5).** The sweep asks min, max and interval and pings every size; DF set on a packet over the 1500-byte MTU answers `M` (could not fragment); the timeout sets how long each `.` takes. Test: `prompts.cjs`.
- **Switching:**
  - `show interfaces counters` and `show interfaces counters errors` are missing; they're the standard duplex-troubleshooting views
  - `clear counters fa0/1` should ask "Clear "show interface" counters on this interface [confirm]"
  - "Last clearing" shows the clock time instead of time elapsed
  - the CDP mismatch warning should repeat every 60 s
  - `show interfaces status` should right-align Duplex and Speed
  - Gig ports say "media type is 10/100BaseTX"
  - an ARP that gets no reply should still flood the VLAN and teach switches the sender's MAC
  - the storm description names switches that aren't in the loop, and the map animates a link that doesn't exist
- **OSPF show commands:**
  - `show ip ospf` / `show ip protocols` count areas from `network` statements only, missing `ip ospf 1 area 0`
  - areas should be listed in number order
  - `show ip protocols` should say "It is an area border router"
  - `show ip ospf database` is missing (Still owed)
- **IPv6:** neighbours are always REACH with age 0 (no STALE/DELAY/PROBE, no FE80 entries). IOS usually holds the first IPv6 echo while it resolves the neighbour, so `!!!!!` is often seen first time. Check before changing; if unsure, leave it and note it.
- **Exam faults:** the `gw` fault uses the gateway +1 without checking that address is free. **Done (milestone 5).** It now picks a free address in the switch's subnet. Test: `exam.cjs`.
- **Quiz:**
  - near-duplicate question pairs to merge or vary: 13/29, 4/90, 17/98, 7/69, 8/70, 16/97, 11/104, 3/99, 2/18/101
  - #75's explanation should say the hang comes from `ip domain-lookup` being on (the default) with no reachable name server
- **Speed:** the Exam sim dialog builds the daily challenge (~240 ms) every time it opens; cache it per day. **Done (milestone 5).** Built once per day.

---

## Checked and fine
- Ranks still score results only: extra `show` commands never lower a rank. 50 extras with the guide off still gave S on 3 labs.
- No external requests.
- Old saved progress loads, and the campaign unlocks from existing passes.
- Reduced motion turns the new animations off.
- No JS errors across campaign, exam, sandbox and lab switching.
- The design matches the arcade style at desktop and phone sizes.
- Performance is fine (a 20-switch ping takes 5–16 ms).
- The basics are right: enable/console prompts, the MAC table format and filters, the duplex-mismatch symptoms, the O IA metric and next hop, the IPv6 ping formats, and 108 of 110 quiz answers.
