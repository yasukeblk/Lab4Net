# Lab4Net changes

## Retro redesign and merge (Claude, on top of the chatgpt/improvements branch)

Kept from ChatGPT's branch, unchanged in behaviour: saved work per lab (command journal replay), progress export/import, the lab library, the command guide, the trace panel with failure reasons and replay, grade invalidation after new commands, the task checklist, console shortcuts and paste review, the Static NAT lab, the theory check, the subnetting prefix ranges, offline operation, and the three test files plus the CI workflow.

Changed:

- New visual direction: a retro PC / video game desktop. Dithered desktop background, hard-edged windows with solid title bars and drop shadows, a menu bar with a clock, a DOS-style path line, and an amber CRT console with scanlines.
- Fonts are embedded in the page (VT323 for the console and interface labels, IBM Plex Sans for reading text), so the look is identical offline. No external requests.
- Topology devices are pixel sprites (router, switch, PC, server). The selected device gets a blinking targeting reticle.
- Animations are back, in stepped retro style: marching pixels on live links, a square packet sprite that hops along the real forwarding path, pixel bursts on success and failure, a shake on the device where a packet dies, and a "LAB CLEAR!" banner when a lab is passed. All of it is disabled under reduced motion.
- A short boot screen is shown once per browser session (skipped under reduced motion).
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
