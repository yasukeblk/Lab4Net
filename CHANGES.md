# Lab4Net improvements

## Toggleable step-by-step instructions

- Added a command-by-command guide for all 15 labs, generated from each lab's tested solution. Every command identifies the device, expected prompt/mode, command, changed prompt and why explanation. A final verification/grading step keeps configuration and proof separate.
- Added Back, Next and Jump controls. Navigation does not execute commands. Successfully entering the exact expected command advances the guide; rejected commands do not. Abbreviated equivalents can be followed with Next.
- Added an Instructions ON/OFF control to the workspace bar. Hiding instructions gives the topology and console full width. A console Grade button keeps grading available and shows detailed results when the mission panel is hidden.
- Added a real separate browser window for the instructions, with live lab/step synchronization, device selection, address-plan/task explanations and final-step grading. Dock returns it to the workspace; closing it also restores the panel, including browsers that skip unload callbacks. Blocked pop-ups leave the instructions in place and display recovery guidance.
- Saved visibility preferences and per-lab guide bookmarks locally. The guide follows the active lab; it pauses with explanatory text during subnetting/theory practice. The simulator and its grading functions are unchanged.
- Verification: 15 labs / 85 checks pass; forwarding and existing browser suites pass. New `tests/instructions.cjs` passes all 15 guide lengths, navigation without execution, automatic advancement, rejected-command behavior, saved state, popup synchronization/grading, docking, native window closure, popup blocking and phone layout. No browser errors. Visually inspected docked and popped-out instructions.
- Separate-window testing used local Edge. Browser policy may open the requested popup as a tab, and physical multi-monitor placement was not tested. The app still deploys as one static `index.html`.

## Desktop retro PC redesign

- Replaced the rounded dashboard styling with an original retro PC workstation: lavender title bars, square beveled controls, mint terminal text, dotted desktop background, segmented progress and a persistent session status bar. Local fonts and the single-file architecture remain.
- Made the desktop workspace fit the viewport with independently scrolling mission and terminal panels. Kept mission grading controls visible while scrolling.
- Added draggable mission-width and map/console dividers, with arrow-key adjustment and browser-local size preferences. Added console maximization, Restore/Escape, F1 help and F2 library shortcuts.
- On wide desktops, packet diagnostics appear beside the topology to preserve the drawing's height. Phones retain the mission/network panel switcher.
- Replaced the device artwork with angular routers, classic CRT hosts, square switch ports and server towers. Selected devices use an animated rectangular targeting frame.
- Added device boot animations, link pulses, a subtle map scan, stepped window opening, control press feedback, console command feedback, square packet motion and trails, and a mission-complete banner with pixel particles. Reduced-motion preferences suppress all of these animations, including when changed during use.
- Consolidated the old layered stylesheet into one coherent theme. The simulator engine and grading functions were unchanged in this design revision.
- Verification before and after: **15 labs / 85 checks passed**; forwarding regression checks pass. Browser integration passes with no page errors, now including desktop sizes 1024×768, 1440×1000 and 1920×1080, mouse/keyboard dividers, maximize/restore, F2 library and moving packet coordinates. Existing saved-work, backup, grading, practice, phone and reduced-motion checks continue to pass.
- Visually inspected the desktop with packet diagnostics, the mission library and phone console. No external art, fonts or dependencies were introduced. Private-container, Docker, Safari/iOS and physical-device testing limitations below still apply.

## Learning and interaction

- Reworked the interface with clearer hierarchy, readable panels and console mode labels. The later desktop revision above establishes the final retro PC visual direction. Removed external font requests so the app works fully offline.
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
- Replaced ambient spinning with the retro animation system described above. Reduced-motion users get the same readable outcomes; live preference changes cancel packet movement safely.

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
