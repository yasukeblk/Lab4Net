# Lab4Net · CCNA Lab Bench

A single-page CCNA learning workspace. Open `index.html` directly in a modern browser, or serve it with nginx. All simulator code, styles and content live in that file; no build, external fonts or simulator backend are required. Optional **Operator AI** uses a Python standard-library relay on the server to connect to OpenAI.

## Learning workspace

- Matrix-inspired desktop: black and phosphor green, schematic topology devices, animated real-path packets and optional digital rain. **Rain on/off** remembers your choice; rain pauses in hidden tabs and under reduced motion.
- **Working on** keeps your chosen task and active device visible above the workspace. Choose **Work on this** on a task, or use the arrow buttons to move between tasks. Amber highlights the current task/device; choosing a task does not complete it or change grading. This selection lasts while that mission is open.
- **Focus view** expands the desktop map and console while keeping the task visible. **View task**, **Exit focus** or Escape restores the arranged windows. Window dragging/resizing pauses in focus view so the temporary layout cannot overwrite your arrangement. On phones, **View task** returns from the console to the checklist.
- Separate **Mission briefing** and **Checklist** windows keep the goal, address plan and objectives visible even with **Step-by-step instructions** off. Every task retains its reasoning. **Pop out guide** opens a movable guide window; **Dock** returns commands to the checklist. Clicking a command inserts it into the right console for you to review and run.
- Drag desktop windows by their title bars and resize from their edges or corners. They snap to one another; hold Alt to move freely. Drag to the left/right edge for a half-screen window, or the top edge to fill the workspace. **Reset layout** restores the default arrangement. Layout is saved per browser.
- 21 CCNA missions: 15 configuration labs and six troubleshooting incidents, with live topology, IOS-style consoles, independent grading and explained walkthroughs.
- Every mission task retains its **Why this step** explanation. Task checkboxes track your own work; grading checks the network configuration and connectivity.
- Searchable lab library, command field guide and console mode indicators.
- Packet paths come from the forwarding model, including traversed switches. Persistent request/reply results distinguish missing routes, unreachable next hops, ACL drops and closed ports. Replay shows the last test; run the command again to test a changed configuration.
- Subnetting drill with mixed, warm-up and small-network prefix ranges; 16 explained theory questions across wireless, IPv6 concepts, security, services and automation.
- Saved configurations and checklists resume when you reopen a lab. **Transfer progress** exports a JSON backup for import on another browser or device.
- On phones, switch between **Mission & tasks** and **Topology & console**. System reduced-motion preferences disable movement while keeping readable packet results.

For theory scope, see [Cisco's CCNA v1.1 topic outline](https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf). The questions are supplementary concept practice, not a full exam bank.

## Curriculum rule and investigation practice

Graded labs and default Operator coaching stay focused on **Cisco CCNA 200-301 v1.1**, verified against the [official Cisco exam topics](https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf) on 2026-10-04. The repository rule is recorded in `AGENTS.md`. Every mission carries objective IDs, searchable in **Lab library**. Existing Juniper devices remain optional sandbox exploration, outside the graded CCNA curriculum. CCNP/CCIE/JNCIA, BGP and MPLS courses are out of scope.

Open **Study map** to see practice organized by exam domain, build/incident progress and a suggested next mission. Domain weights provide study context; lab completion is not an exam-readiness score. A lab exercises selected parts of an objective, not all of it. IPv6 configuration, wireless GUI work and other gaps remain outside the current simulator and need complementary study. The automation domain currently has theory practice only.

The **Troubleshooting** library group contains six preconfigured incidents: an isolated Sales host, a VLAN that cannot cross floors, a lost return path, a VLAN gateway failure, a remote client without a lease, and unavailable SSH despite working ping. Each starts with an actual failing configuration. Use the address plan and four tasks to reproduce, inspect, repair and verify. Grade checks preserve all the source lab's requirements, including unaffected services.

Turn **Step-by-step instructions** off to investigate independently. Mission, address plan, tasks and per-task reasons remain visible. **Reveal next clue** offers direction, evidence and then the explicit repair. Clues can be hidden and their reveal level is remembered in this browser, separately from transferred progress. The guide still supports pop-out/dock, and the walkthrough provides the repair commands. Successful grading ends with an explanation of the cause. Original lab titles, ordering and saved configurations are preserved; incidents are appended.

## Network sandbox

Choose **Sandbox** in the header or lab selector to build a network without grading. Start on an empty canvas, or choose **New / starter → Working LAN starter** for two addressed PCs and a switch.

1. Add routers, switches, PCs or servers from the device palette (up to 16 devices). Drag nodes to arrange them; focus a node and use arrow keys for keyboard positioning.
2. In **Cable builder**, choose devices and free physical ports, then connect them. Remove cables with their × buttons. Router interfaces need `no shutdown`; switch access ports start in VLAN 1.
3. Select a device to use its IOS-style console and command guide. PCs and servers also have an IPv4/mask/gateway form and a DHCP request button. Servers listen on simulated ports 80 and 443.
4. Use **Connectivity probe** or console `ping` commands to trace the real request/reply path and read failure reasons. Experiment with the engine's VLAN, trunk, static route, OSPF, DHCP, ACL and NAT commands.

The project autosaves separately from graded labs and resumes after reopening the app. **Export project / Import project** transfers topology and ordered command history; sandbox files are separate from **Transfer progress** lab backups. Export before choosing a new project. **Undo** reverses one edit or console command; applying a host IP generates two or three commands, so undo those individually if needed. Removing a device also removes its cables. Sandbox actions never earn or change lab grades.

Matrix sandbox saves use `lab4net-sandbox-events-v1` to avoid clashes with other branches' sandbox formats. Supported older Matrix saves migrate automatically. An incompatible save is preserved and offered through **Download previous save**, while a fresh sandbox opens. The recovery file for main's format can be restored in that version. Lab progress is unaffected; clearing browser storage is unnecessary.

Projects support up to 10,000 edits, 5,000 commands and 5 MB imports. Reopening replays actions in order, preserving configuration modes and DHCP acquisition before later cable changes. Local storage remains per browser/origin. This uses the same simplified IPv4 learning engine as the labs, rather than full Packet Tracer protocol/device coverage; IPv6 forwarding, wireless simulation and interchangeable hardware modules are not included. Model-specific hardware profiles are available as described below.

## Operator AI

Open **Operator AI** in the header for an embedded network tutor. It receives the current workspace, actual device configurations, physical/logical interface state, routes, ACL/NAT data, Junos candidate changes, current lab objectives/check results, the lab catalog and the simulator's supported command reference. It can explain application navigation, teach the next step, and reason about your simulated configuration.

- **Inspect connectivity** chooses a source, IPv4 destination and ping/SSH/Telnet protocol. It runs the real forwarding engine on a cloned network, reports request/reply paths and failures, and includes that fresh evidence with your next question. It does not change NAT state, console journals or your last animated packet result.
- A question mentioning an IPv4 address (or one uniquely named, addressed destination device) automatically inspects it from the selected console when there is no current explicit inspection. If source/destination are ambiguous, select them in the inspection form.
- Answers offer explained commands through **Place in console**. Review and press Enter yourself. A changed configuration invalidates old command proposals; ask again for current guidance. Navigation buttons open UI controls; **New / starter** opens the menu before any replacement.
- Wide mode and horizontal resize give the conversation more space on desktop. On a phone it becomes a full-height panel. Close it to return to the console. Enter sends; Shift+Enter adds a line. **Stop** cancels waiting in the browser, though the upstream request may already be running and billed.
- Conversation stays in this tab's memory, not localStorage or a server database. **Clear chat** clears conversation and inspection. Each question uses a new snapshot. Historical packet tests are labeled historical; stale inspections are dropped.
- With no server/key, navigation and local inspection still work, and chat clearly reports that OpenAI is not configured. The static file performs no assistant network requests until you open the panel; local-file mode never calls the API.

### Enable OpenAI on the Debian container

Update the preview branch and install as usual:

    cd /opt/lab4net
    git pull
    bash install-lxc.sh
    nano /etc/lab4net/assistant.env

In that **server-only** file set `OPENAI_API_KEY` to your API key. The default `LAB4NET_AI_MODEL=gpt-4.1-mini` is configurable; choose a model supporting structured output in the Responses API. Optionally set `LAB4NET_AI_TOKEN` to a shared access token, then enter that token in the app's **Connection settings**. Never enter an OpenAI key in the browser or commit it to Git.

    systemctl restart lab4net-assistant
    systemctl status lab4net-assistant --no-pager
    curl http://127.0.0.1:8787/api/assistant/status

Reload the app and open **Operator AI**. The panel should show **OPENAI** with your model name. The relay binds only to localhost; nginx proxies `/api/assistant/`. The installer preserves `/etc/lab4net/assistant.env` across updates, copies the Python relay to `/opt/lab4net-assistant`, and manages a `www-data` systemd service. It installs the app's default nginx site; if you maintain a customized TLS/reverse-proxy site, retain your custom configuration and add the assistant location from `deploy/nginx-lxc.conf`.

The relay accepts same-origin JSON requests, has a 400 KB request cap, two simultaneous model calls and a container-wide 12-question/minute limit. It stores no conversations and does not log request bodies. It sends `store:false` to the [OpenAI Responses API](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create), with [structured output](https://developers.openai.com/api/docs/guides/structured-outputs). [GPT-4.1 Mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) is the initial default, not a requirement. API billing belongs to your server key; no ChatGPT subscription integration is included.

Configuration credential fields and credential command lines are redacted before transmission, with a second redaction pass on the relay. Arbitrary descriptions or pasted prose can still contain secrets that automated redaction cannot identify: use fictional lab values. Questions, redacted network state and recent conversation go to OpenAI when you send. `store:false` does not promise zero provider retention; see [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). Use an access token and HTTPS/authentication if you expose the service beyond your trusted home network; the relay is not an account system or public multi-user gateway.

### Docker assistant settings

Copy `assistant.env.example` to `.env` beside `docker-compose.yml`, fill in the server values, then run `docker compose up -d --build`. Compose adds an internal Python relay container without exposing its port. The nginx-only Docker image still serves the simulator if the relay is absent; AI reports unavailable. Neither image contains your API key, and `.env` is excluded from Git and build context.

## Option A: plain LXC on Proxmox (simplest)

1. In the Proxmox UI, create an unprivileged container from a Debian 12 or 13 template.
   1 core, 256-512 MB RAM and 2 GB disk is plenty. Give it a static IP or a DHCP reservation.
2. Copy this folder into the container and run, inside the container:

       bash install-lxc.sh

3. Browse to `http://<container-ip>/`.

## Option B: Docker (any Docker host, or an LXC with nesting enabled)

    docker compose up -d --build

Then browse to `http://<host-ip>:8080/`. Change the port in `docker-compose.yml` if 8080 is taken.

## Updating

For an existing Git checkout in the LXC:

    cd /opt/lab4net
    git pull && bash install-lxc.sh

To preview the improvements branch before merging:

    cd /opt/lab4net
    git fetch origin
    git switch --track origin/chatgpt/improvements
    bash install-lxc.sh

If that branch already exists locally, use `git switch chatgpt/improvements` instead. Future updates on it use the same `git pull && bash install-lxc.sh` command.

For Docker, run `git pull && docker compose up -d --build`.

## Verification

### Sandbox hardware

Open **Sandbox → Hardware catalog**, choose a model, then **Add model**. The Catalyst 2960-24TT-L has 24 Fast Ethernet copper ports and two Gigabit copper uplinks. The EX2300-24T has 24 Gigabit copper ports and four SFP+ uplinks modeled at fixed 10G. Expand **Front panel** to see port status; clicking a free port selects it in the cable builder. Incompatible model-port speeds are rejected. Speed labels describe hardware; this simulator does not model bandwidth or transceiver installation.

The Catalyst uses the existing IOS learning commands. The EX2300 uses a focused Junos ELS command subset: `configure`, full `set`/`delete` statements for VLANs and access/trunk ports, native VLAN, descriptions, shutdown and management IRB. `show | compare` previews pending changes, `commit check` validates, and `commit` applies valid changes atomically. `rollback 0` discards pending edits; `rollback 1` loads the previous committed configuration into the candidate and requires a commit to activate. `run show ...` and `run ping ...` work from configuration mode. The command guide explains the supported commands.

Choose **New / starter → Cisco + Juniper VLAN exercise** for a working two-switch topology and an optional, explained guide to moving its hosts into tagged VLAN 10. Click commands to put them in the appropriate console, then press Enter. Project export/import and local autosave retain model selection, configuration mode, candidate changes and commit history.

These are educational hardware profiles, not firmware emulators. The Juniper profile starts with a simplified VLAN 1 learning configuration, accepts full statements rather than hierarchical `edit` navigation, and models IRB as management only. Junos routing, firewall filters, Virtual Chassis, authentication, dual-speed optic installation and hardware throughput are not implemented. Existing CCNA labs keep their generic IOS devices.

Hardware and CLI references: [Cisco 2960 model table](https://www.cisco.com/c/dam/en_us/solutions/small-business/products/routers-switches/catalyst-2960-series-switches/C45-484155-03_2960_AAG_v1b.pdf), [Juniper EX2300 interface naming](https://www.juniper.net/documentation/us/en/hardware/ex2300/topics/topic-map/ex2300-configuring-junos-os.html), [Junos commits](https://www.juniper.net/documentation/us/en/software/junos/cli/topics/topic-map/junos-configuration-commit.html), [rollback](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/rollback.html), and [ELS IRB configuration](https://www.juniper.net/documentation/us/en/software/junos/multicast-l2/topics/topic-map/irb-and-bridging.html).

The lab test extracts only the code between the ENGINE markers, creates every lab, executes its per-device solution through `execLine`, and asserts every grading check passes. It also requires an explanation for each task and runs all task-by-task instruction commands to a passing grade. Node is only needed for development tests, not for nginx deployment.

    node tests/labs.cjs
    node tests/forwarding.cjs
    node tests/sandbox.cjs
    node tests/hardware.cjs
    node tests/operator.cjs
    node tests/curriculum.cjs
    python3 tests/assistant_server_test.py

GitHub Actions runs all six dependency-free Node checks, Python relay tests and installer shell syntax checks on pushes and pull requests.

Optional browser integration tests use Playwright:

    npm install --no-save --package-lock=false playwright
    npx playwright install chromium
    node tests/ui.cjs
    node tests/matrix.cjs
    node tests/sandbox-ui.cjs
    node tests/sandbox-storage.cjs
    node tests/hardware-ui.cjs
    node tests/operator-ui.cjs
    node tests/curriculum-ui.cjs

Alternatively set `LAB4NET_BROWSER_CHANNEL=msedge` to use an installed Edge browser. The browser suite opens the local file, grades every lab, checks command/session restoration and backup import/export, and exercises the library, guide, practices, phone layout and reduced motion. The sandbox suite covers actual editor controls, cabling, configuration/position restoration, project transfer, packet paths and phone use. The Matrix suite additionally checks rain preferences, pop-out guidance, window dragging/resizing/restoration and common desktop resolutions. `LAB4NET_SCREENSHOTS` optionally specifies a directory for desktop and phone captures.

## Notes

- Passes use the existing `ccna-bench-v2` localStorage key, preserving earlier progress. Command journals and task marks use `lab4net-workspace-v1`.
- Storage is per browser and origin. Export before clearing browser data or switching from a local file to a server. A backup includes simulated passwords and configurations; use fictional lab credentials.
- Import validates command journals by rebuilding them before replacing saved work. Earned lab passes are merged; included lab drafts replace their corresponding saved configurations.
- Saved command history is capped at 5,000 commands per lab; backups at 5 MB. Start over removes that lab's draft and checklist, while preserving its earned pass.
- There is no automatic account/cloud synchronization; JSON transfer works entirely offline.
- This is an educational IOS-style model, not a full IOS emulator. Authentication, timing, STP, EtherChannel and port security are simplified. SSH/Telnet report connection results rather than opening interactive remote shells. IPv6 forwarding and HSRP labs are not implemented.
