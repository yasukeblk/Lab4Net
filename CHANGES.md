# Lab4Net changes

## Matrix redesign — based on main c20f45b

Copied the current main branch into `chatgpt/improvements` through a merge, preserving main's movable/resizable windows, task-by-task instructions and separate Mission and Checklist windows. Main itself was not changed.

### What changed and why

- Replaced the arcade design with a Matrix-inspired network terminal: near-black surfaces, phosphor green, restrained glows, fine borders, numbered window headers, compact navigation and a grid-backed topology. Reading panels stay opaque so the atmosphere does not obscure instructions.
- Rebuilt the stylesheet rather than recolouring the arcade controls. Removed skewed buttons, coloured gradients, city skyline, comic sparks and oversized display lettering. Kept a locally embedded reading font and switched the console to crisp system monospace; removed 87 KB of unused arcade font data.
- Redrew routers, switches, PCs and servers as green schematic hardware. Animated links, selected-device indicators, real-path packets and reply/failure labels remain. Successful grading now shows an ACCESS GRANTED banner.
- Added bounded canvas digital rain, running at at most 20 updates per second with a capped pixel ratio. Rain on/off is remembered. It stops when the tab is hidden and when reduced motion is requested, including live preference changes. The simulated packet path is independent of this decorative effect.
- Reworked boot text into a short network connection sequence. Desktop remains the primary workspace, with movable, resizable, snapping windows and a saved layout. Phone navigation and console input remain available.
- Kept mission information, the address plan and objectives separate from optional command instructions. Fixed the instruction switch to hide a popped-out guide too. Opening the guide enables instructions; docking returns them to the checklist. Command clicks still insert without executing. Checkbox and guide changes now preserve the checklist's scroll position. Phone checklists use normal page flow to avoid retaining a desktop scroll offset.

### Verification

- Before redesigning the copied main: `node tests/labs.cjs` passed **15 labs / 85 checks** and **284 instruction commands**. Forwarding checks also passed.
- The text between ENGINE markers is identical to main c20f45b. No lab, grading, solution, forwarding or explanation content was changed for this redesign.
- After redesign: the same lab/instruction and forwarding checks pass. `tests/ui.cjs` passes all 15 grades through the UI, configuration/checklist restoration, backup transfer, invalid imports, library, command guide, drill, quiz, phone layouts and reduced motion; no page errors.
- Added optional `tests/matrix.cjs`: rain preference restoration and live reduced motion, persistent mission/objective/why content with guidance hidden, pop-out/dock, command insertion without execution, actual pointer drag/resize and saved geometry, and on-screen default windows at 1920×1080, 1366×768 and 1024×768. No external HTTP requests or page errors.
- Ran browser checks against the local file in headless Microsoft Edge. Inspected desktop and phone captures, including a fresh phone load and the popped-out guide.

### Choices and limits

- Kept this pass focused on the design and existing learning controls. No new labs, backend, account system or automatic cloud sync were introduced; offline progress transfer remains available.
- The app remains a self-contained index.html with no runtime dependencies or build. Existing install-lxc.sh and Dockerfile still copy that file, so deployment needs no script changes. `git pull && bash install-lxc.sh` remains the update command.
- Could not test the private home container, nginx installation, Docker runtime, physical phones, Safari or Firefox. Local Edge covered behavior and responsive layouts; simulator tests cover the supported exercises rather than full Cisco IOS equivalence.

---

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
