# Lab4Net changes

## Requested tall-column workspace

- Added **Tall columns**: Mission and Tasks stand independently from top to bottom on the left, while Topology and Console share equal-height halves of the right-hand column. The left columns each use 28% of available width and the right uses 44%, with consistent gaps. The preset includes an accurate miniature preview and remains adjustable through existing shared dividers.
- Made this the default for fresh desktop lab workspaces and the target of **Reset layout** in labs. Existing saved arrangements and named layouts are preserved; choose **Layouts → Tall columns** or reset to activate it in an existing browser. Selecting/resetting this preset docks a popped-out command guide into Tasks to keep the requested three-column structure; undo restores the previous geometry and guide state. Sandbox/practice defaults remain Balanced and phones remain stacked.
- Refined tall-column divider behavior: changing the Mission/Tasks boundary adjusts those immediate neighbors without shifting the right-hand stack. Existing split-based resizing remains available for other arrangements.
- Baseline/final lab regression: **21 missions / 119 grading checks / 358 guided commands pass**. New Edge test checks actual full-height left columns, equal-height right halves, fresh default, preserving existing saves, preset/reset/reload, guide docking and undo, shared divider behavior, 1920×1080/1366×768/1024×768 and phone/reduced motion. Existing drag, docking, layouts, focus, Matrix, curriculum, sandbox, hardware, mocked Operator and full lab browser suites pass. The requested desktop arrangement was visually reviewed.
- No simulator, curriculum or deployment changes. Private Debian, physical phones and Safari were unavailable; verification used local Edge and emulated phone dimensions.

## More assistance during dragging

- Enlarged exact drop buttons and made the full receiving panel a drop area. Hovering toward an edge suggests insertion; its center suggests swapping. Workspace-edge capture is wider, and small button near misses or gaps between panels are caught automatically. When two panels are equally close in a gap, the drag direction selects the recipient.
- Added magnetic stability around button, panel-region and shared-gutter boundaries to avoid flickering between suggestions on small pointer movements. Exact button hits remain authoritative; moving clearly into another region changes the suggestion. Crowded/invalid splits still show feedback instead of applying a broken arrangement.
- Added a cursor-side placement hint, receiving-panel outline and highlighted insertion region. Other panels' target buttons hide while a recipient is active, reducing clutter. The source fades during the drag and the complete layout preview remains visible. Successful placement gets a brief confirmation and an Undo reminder. Reduced-motion settings suppress the landing animation.
- Alt suspends recipient highlighting and smart placement while retaining free-placement guidance. Escape, cancellation and release clean up all assist overlays. Presets, expansion, named saves, shared resizing and undo remain available. Help, README and Operator's interface context describe the assisted areas.
- Baseline/final lab regression: **21 missions / 119 grading checks / 358 guided commands pass**. New Edge coverage verifies broad edge/center drops without button aiming, shared-gutter capture, stable suggestions, receiving-region/cursor feedback, exact buttons, Undo feedback, Alt/Escape cleanup and phone/reduced motion. Existing docking, layouts, focus, Matrix, curriculum, sandbox, hardware, mocked Operator and full lab browser suites pass. An assisted-drag screenshot was inspected.
- No simulator, curriculum, deployment or new dependency changes. Smart drops with no reachable destination still cancel; free placement remains available with Alt or the smart-mode toggle. Private Debian, physical touch hardware and Safari were unavailable; tests used local Edge and emulated phone dimensions.

## Uncapped panels and visible, coordinated docking

- Fixed the Mission briefing expansion bug: `#side #brief` still imposed a 43% maximum height with higher CSS specificity than the desktop override. Saved geometry could request a larger window while the actual rendered panel stayed capped. The desktop selector now removes that cap. Earlier layout tests checked screen bounds/non-overlap but missed the discrepancy between requested and rendered height; the new regression compares both and checks full-height mission docking.
- Added consistent desktop panel chrome, including a real sticky Mission/Practice title bar. Every panel has Expand/Restore and an Arrange menu. Expansion is temporary, supports Escape and title-bar double-click, and preserves saved positions. Arrange offers keyboard-accessible docking/relative placement. Phone layouts retain the original stacked headings/navigation.
- Replaced invisible center-drop areas with labeled Above/Below/Left/Right/Swap targets and four workspace-edge targets. Smart-mode drops outside a target cancel instead of leaving overlapping panels. Alt and the existing smart-mode toggle still permit free placement. Whole-layout previews and unavailable-target feedback explain the result before release.
- Docking now infers a split layout from existing panel rectangles. Relative insertion removes the source from its old split, expands its former neighbor into the vacancy, then inserts it beside the chosen target. Edge docking preserves the remaining panels' relationships instead of repacking them arbitrarily. For an overlapping free arrangement, a structured fallback is previewed before applying the split. Shared divider resizing follows the affected split; unrelated aligned rows stay in place.
- Preserved presets, named saves, lock, undo, guide state, existing valid saved geometry and the separate mission/tasks/guide model. Updated in-app help and Operator's interface description for the new controls. No engine, curriculum or deployment changes.
- Baseline and final lab regression: **21 missions / 119 grading checks / 358 guided commands pass**. New Edge tests verify actual Mission height beyond 43%, saved/reloaded height, full-height docking, expansion/restore for all six panel types, keyboard/double-click, visible relative targets, source-vacancy closure, cancellation outside targets, the Arrange menu, subtree resizing, smaller desktops and phone/reduced motion. Existing layout, focus, Matrix, curriculum, sandbox, hardware, Operator (mock model) and full lab browser suites pass. Docking and expanded-Mission screenshots were reviewed.
- Limits: extremely crowded relative splits may be unavailable; workspace-edge docking or temporary expansion remains available. Free placement intentionally permits overlaps. Physical touch hardware, Safari and the private Debian container were not accessible; browser checks used local Edge and emulated phone dimensions.

## Suggested layouts and smarter window arrangement

- Added a **Layouts** picker with visual cards for Balanced, Console first, Map first, Study desk and Guided practice. Guided practice opens a separate guide and reserves a full-height column. A newly opened guide is given space rather than covering the map/console. Layout selection works with keyboard-accessible buttons; phones keep stacked panels and their existing navigation.
- Replaced isolated edge snaps with whole-workspace docking. Drag toward any of the four edges to preview a docked panel plus an arrangement of all other visible panels. Drop over another panel's center to swap both positions and dimensions. Release applies the preview; Escape or pointer cancellation restores the starting arrangement without saving changes. Holding Alt bypasses smart docking and allows independent placement.
- Shared-edge resizing updates panels ending/starting at that divider, including multiple panels on either side. Minimum sizes constrain the movement so neighbors cannot be resized away. Alt or the smart-layout toggle restores independent resizing. Window positions can be locked, while presets/restoration remain available.
- Added undo for the last 20 arrangement changes per workspace during the session, plus up to 12 named layouts saved in this browser. Names render safely as text. Named layouts restore guide visibility/preferences and geometry; lab, sandbox and practice libraries remain separate. Existing valid `lab4net-layout-v2` geometry is reused and malformed rectangles are ignored. Reset now restores Balanced for only the current workspace and is undoable.
- Baseline and final engine checks: **21 missions / 119 grading checks / 358 guided commands pass**. New Edge tests cover five presets at 1920×1080, 1366×768 and 1024×768; panel fit/non-overlap, guide reopening, swaps, four-edge docking/reflow, both shared divider directions, undo, Escape, Alt, named save/reload/delete, lock/preferences, independent resizing and sandbox/practice/phone/reduced motion. Existing browser suites for grading, focus, Matrix, curriculum, sandbox, hardware and mocked Operator pass. Layout-picker and guided-workspace screenshots were inspected.
- No simulator, curriculum, AI relay or deployment dependencies changed. Free placement can intentionally overlap panels; structured presets, docking and swaps provide the orderly alternative. Saved layouts are browser-local and not included in progress backups; undo history lasts for the current session. No private Debian container, physical touchscreen or Safari test was possible; local verification used Edge and emulated phone dimensions.

## Clearer attention and a more comfortable workspace

- Kept the Matrix identity while separating reading from interaction: brighter neutral text, calmer panel surfaces, better-spaced task cards, amber for the working task/selected map device and green for controls and successful results. Reduced ambient rain intensity and stopped decorative idle cable/selection motion; actual packet-path and completion animations remain, with reduced-motion support.
- Added a persistent working-task ribbon and active-console label. Choose a task explicitly with **Work on this** or previous/next arrows. The ribbon remains visible with command instructions off or in focus view. Task selection is independent of completion checkboxes and simulator grading; it lasts for the currently open mission, without adding another saved-progress format.
- Added desktop **Focus view**: full-width map/console with the task still visible. **View task**, **Exit focus** and Escape restore the existing window arrangement. Focus does not save temporary geometry and disables window dragging/resizing until exited. Switching workspaces exits focus. Phone users retain their mission/network navigation and can return directly to the selected task.
- Made the selected console tab stronger, increased desktop terminal readability and gave command input a distinct outlined surface and focus feedback. Mission information, address plans, why explanations and optional docked/popped-out guides remain available in the normal workspace.
- Baseline and final lab test: **21 missions / 119 grading checks / 358 guided commands passed**. All six engine suites pass. Edge browser suites pass for full lab grading, Matrix layouts, curriculum, sandbox, hardware and mocked Operator. New attention browser coverage checks task selection without completion, guide-off context, task navigation, focus console commands, unchanged saved geometry, Escape, workspace changes and phone/reduced motion. Desktop screenshots were inspected.
- Intentionally avoided timers, streak penalties, automatic task completion and additional idle animation: emphasis should follow the learner's work. No curriculum, engine or deployment changes. Could not test the private Debian container, physical phones or Safari; the browser checks used local Edge and emulated phone dimensions. Existing Operator browser checks use a mocked model.

## CCNA curriculum rule, study map and troubleshooting incidents

- Recorded the CCNA-only graded curriculum/default coaching rule in `AGENTS.md`. Scope is Cisco 200-301 v1.1, verified against the official blueprint on 2026-10-04. Optional Juniper sandbox functionality remains available outside the curriculum. No other certification courses were added.
- Mapped all 21 missions to objective IDs and added searchable objective labels to the mission/library. Study map groups practice by exam domain, separates build labs from incidents, shows saved pass progress and recommends a next mission. It explicitly distinguishes partial practice from complete objective coverage and exam readiness, and identifies simulator gaps.
- Added six actual fault investigations based on working CCNA labs: access VLAN, trunk allowed list, return route, router subinterface tag, DHCP relay and SSH transport. Each starts broken, reuses the source lab’s grading checks and has a minimal repair solution. Four tasks and reasons teach reproduce/inspect/repair/verify; completion explains the specific cause.
- Added a three-stage hint ladder independent of command instructions: direction, evidence, repair. Reveal state survives reopen in this browser and can be hidden; it works in memory if storage is unavailable. Mission/objectives/address plan remain separate from toggled or popped-out step commands. Existing original lab titles/indexes and saved work are unchanged; incident entries are appended.
- Operator snapshots include curriculum scope and objective mappings; its server prompt prioritizes CCNA investigation coaching and identifies Junos sandbox exploration as outside exam practice. No API transport changes or new deployment dependencies were needed; normal nginx/container updates still work.
- Baseline before changes: **15 labs / 85 grading checks / 284 guided commands passed**. Final: **21 missions / 119 grading checks / 358 guided commands passed**. Added curriculum regression verifies objective mappings, Cisco-only graded devices, initial service failures, request/reply failure distinction, all original requirements after repair and trace preservation.
- Local Edge tests grade all 21 missions successfully. New browser tests cover objective searching, study map/progress/recommendations, persistent incremental hints, independent tasks with guides off, pop-out guides, failed reply path, actual clickable-command repair, completion lesson, phone and reduced motion. Existing browser/engine and mocked AI relay tests pass. Desktop and phone captures were reviewed.
- Deliberate limits: fixed, explainable incidents rather than randomized or timed exams; no claim of complete CCNA coverage. IPv6 forwarding, wireless GUI simulation and full protocol/firmware realism remain deferred. Hint preferences are local UI state, not included in progress backups. No non-CCNA graded content was introduced.
- Could not test the private Debian/nginx container, Docker runtime, physical phones/Safari or live OpenAI coaching without a key. AI prompt/context checks and relay behavior were tested with mocks; answer quality still requires a configured model. No deployment files changed this turn.

## Operator AI: embedded network tutor

- Added a Matrix-styled assistant panel for navigation, learning and configuration troubleshooting. It has chat, a resizable/wide desktop view, phone layout, shortcuts, connection settings, cancellation and clear chat. Commands are proposed with explanations and inserted for review; the learner presses Enter. Navigation actions are allowlisted; new-project help opens a menu without discarding work.
- Added fresh grounding from the actual application: manual, lab catalog/tasks/why, current grading checks, supported command syntax/explanations, selected console/mode, full redacted network configuration, interface status, ACL/NAT/routes and Junos active/candidate state. A stale response is identified, and old command proposals are rejected after configuration changes.
- Added read-only ping/SSH/Telnet inspection on a cloned network, including request/reply paths, failure device/reason and closed services. Questions naming an IP or one addressed destination can auto-inspect from the selected device. Inspection does not change live NAT, journals or packet history. Switch-origin management reachability is tested independently of host switching.
- Added a Python standard-library OpenAI Responses relay. The key stays in a server environment file. Responses use a strict JSON schema and `store:false`; chat remains in tab memory. Credential fields/configuration lines are redacted in the client and relay. Arbitrary prose may still contain secrets: fictional lab data is required. Answers render as escaped text, and model-proposed actions cannot run arbitrary code.
- Updated `install-lxc.sh` to install Python, preserve `/etc/lab4net/assistant.env`, manage a localhost `www-data` systemd relay and install the nginx default site/proxy. The usual `git pull && bash install-lxc.sh` still works. README documents the one-time key setup and customized-nginx considerations. Docker Compose adds an internal relay; plain nginx still serves the simulator independently. Git/build exclusions protect environment files.
- The service has same-origin/custom JSON checks, optional shared access token, bounded requests, two simultaneous calls and 12 questions/minute/container. It is intended for the home-network deployment, not a public account/billing platform. No API key, live API request or paid inference was created during development.
- Deliberate limits: no autonomous configuration edits, external network access, arbitrary shell execution, web browsing, cross-device chat sync or persistent server history. The model reasons from supplied simulated state, not hidden physical-network data. Responses can still be wrong; packet evidence and supported commands constrain guidance rather than guarantee correctness.
- Before and after: **15 labs / 85 checks / 284 guided commands pass**. Forwarding, sandbox and hardware tests pass. New context tests inspect every solved lab, preserve live state, verify bidirectional paths/switch management failure/closed service and test redaction. Four Python tests exercise the real relay HTTP handler with mocked OpenAI transport: authentication, origins, bounds, error handling, API request/schema and private key handling.
- All existing local Edge browser suites pass. New assistant browser tests with a mock model pass live context/inspection, conversation history, safe rendering, navigation, insertion without execution, cancellation, phone and reduced motion. Desktop/phone captures were visually inspected. Installer shell syntax passes.
- Could not test a live OpenAI response without a configured key, the private Debian/nginx container, a Docker build, physical phone or Safari/iOS. Server/browser integration uses mocks, so model answer quality and live credentials/quota/model access remain unverified. README includes server activation and status checks. Local-file navigation and inspection remain available without AI.

## Cisco and Juniper hardware profiles

- Added a sandbox hardware catalog with Catalyst 2960-24TT-L and EX2300-24T switches. Real port counts/names make cabling practice model-specific. Expandable port panels show live/shutdown/free status and select free cable endpoints.
- Added a focused Junos ELS interpreter with operational/configuration prompts, candidate edits, comparisons, validation, atomic commits, previous-commit rollback, explained command reference, show commands and simulated ping. An uncommitted indicator makes the candidate/active distinction visible. The existing IOS interpreter remains the Catalyst console.
- Added VLAN, access/trunk, native VLAN, description, shutdown and management IRB support for the Juniper profile. Packet forwarding uses committed configuration. Model port speeds reject incompatible 10G/1G links; rates are metadata, not throughput simulation.
- Added an optional Cisco + Juniper VLAN starter with separate task statements, why explanations and clickable commands. It teaches tagged VLAN interoperability and commit activation across a four-device path.
- Existing project replay now restores hardware, candidate configuration and commit history, preserving the sandbox storage recovery behavior. Runtime remains one self-contained HTML file; deployment scripts need no changes.
- Deliberate limits: educational profiles rather than firmware emulation, a simplified default VLAN 1 configuration, fixed 10G EX2300 uplink mode, full ELS statements rather than hierarchical edit navigation, management-only IRB, no Junos routing/firewall filters/Virtual Chassis/authentication or physical optic simulation. Original labs retain generic devices. Official model/CLI references are linked in README and the hardware cards.
- Before and after hardware work: **15 labs / 85 grading checks pass**, and **284 step commands** reach passing grades. Forwarding and sandbox engine tests pass. New hardware tests cover port layouts, speed compatibility, command separation, candidate isolation, atomic failed commits, rollback, shutdown, management ping, actual mixed-vendor path and saved-project replay.
- Local Edge browser tests pass for all lab grades, Matrix desktop controls, sandbox editor, storage recovery and new hardware UI. The new browser test completes the mixed-vendor exercise through actual guide/console controls, restores pending changes after reload, transfers projects and checks phone/reduced-motion use. No page errors. Desktop and phone captures were visually reviewed.
- Could not test the private nginx container, physical hardware, physical phones, Safari/iOS or Docker deployment. No emulator-equivalence claim is made; CI execution is separate from the local passing checks.

## Sandbox save compatibility fix

- Fixed sandbox opening when another branch wrote a different save format to the shared `lab4net-sandbox-v1` key. Matrix sandbox projects now use the distinct `lab4net-sandbox-events-v1` key. Supported earlier Matrix saves migrate intact; the original key is preserved.
- Unsupported older saves open a fresh workspace with a recovery notice and **Download previous save**. Main's topology format is retained with its saved command journal in the recovery download. Damaged current saves are archived before replacement; if archiving fails, autosave is blocked to preserve the original. Lab drafts and earned progress are not cleared. Explicit invalid imports still reject without replacing work.
- Added `tests/sandbox-storage.cjs`: reproduces the main-format collision and checks opening, recovery download, lab-progress retention, reload, valid Matrix migration, corrupt-save archiving and non-destructive import rejection. Local Edge storage and full sandbox browser tests pass; lab tests remain **15 labs / 85 checks / 284 guide commands**, and forwarding/sandbox model tests pass. The private nginx container remains untested.

## Free-build network sandbox

- Added **Sandbox** to the header and lab selector, retaining the Matrix theme. Build freely with up to 16 routers, switches, PCs or servers. Desktop windows have their own saved sandbox arrangement; graded-lab windows retain theirs.
- Added a device palette, draggable topology nodes with cables following during movement, keyboard arrow positioning, a port-aware cable builder, cable removal and confirmed device removal. Empty projects disable console input safely. Overlapping node positions do not create invalid SVG coordinates.
- Added IPv4/mask/gateway controls and DHCP requests for hosts, while keeping IOS consoles and command explanations for device configuration. Server nodes use the engine's simulated port checks on 80 and 443.
- Added a source/destination ping probe using real simulator forwarding, packet animation and persistent request/reply diagnostics. Router probes leave configuration mode before testing. Mission information explains how to build, configure and troubleshoot; the sandbox has no grading.
- Added a working switch/two-PC LAN starter, an empty-canvas option, Undo for one action/command, local autosave and automatic sandbox resume. Projects record topology edits and commands chronologically, so DHCP leases acquired before cable changes and IOS session contexts restore correctly. Export/import moves projects between devices. Validation builds an imported project before replacing existing work; lab progress and drafts stay separate.
- Fixed reduced-motion layout resets: disabling transitions fully prevents the window manager from measuring intermediate geometry and collapsing panels. Added a browser regression check.
- Preserved the simulator between ENGINE markers without changes. The original 15 labs, their grading and the 284-command guides remain intact. No runtime dependency, backend or deployment restructuring was introduced.

Verification: `tests/labs.cjs` passes **15 labs / 85 checks / 284 guide commands** before and after this work. Forwarding tests pass. Added dependency-free `tests/sandbox.cjs` covering real paths, IOS configuration, port validation, disconnect/reconnect/removal, position replay, and DHCP acquired before subsequent edits; included it in GitHub Actions. Local headless Edge passes existing lab and Matrix browser suites plus new `tests/sandbox-ui.cjs` covering editor controls, probes, export/import, invalid import preservation, restored configuration modes, drag positions, lab isolation, phone layouts and reduced motion. Inspected desktop and phone sandbox previews.

Limits: this is a free-build workspace for the existing CCNA engine, not a complete Packet Tracer replacement. No IPv6 forwarding, wireless devices, interchangeable hardware modules or real IOS runtime. One project autosaves locally; export separate files to keep multiple projects. Project limits are 16 concurrent devices, 10,000 actions, 5,000 commands and 5 MB imports. Progress backups and sandbox project files are separate. The home nginx container, Docker runtime, Safari/Firefox and physical touch devices could not be tested; deployment still copies the single index.html.

---

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
