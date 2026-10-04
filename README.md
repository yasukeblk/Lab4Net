# Lab4Net · CCNA Lab Bench

A single-page CCNA learning workspace. Open `index.html` directly in a modern browser, or serve it with nginx. All simulator code, styles and content live in that file; no build, runtime dependencies, external fonts or backend are required.

## Learning workspace

- Matrix-inspired desktop: black and phosphor green, schematic topology devices, animated real-path packets and optional digital rain. **Rain on/off** remembers your choice; rain pauses in hidden tabs and under reduced motion.
- Separate **Mission briefing** and **Checklist** windows keep the goal, address plan and objectives visible even with **Step-by-step instructions** off. Every task retains its reasoning. **Pop out guide** opens a movable guide window; **Dock** returns commands to the checklist. Clicking a command inserts it into the right console for you to review and run.
- Drag desktop windows by their title bars and resize from their edges or corners. They snap to one another; hold Alt to move freely. Drag to the left/right edge for a half-screen window, or the top edge to fill the workspace. **Reset layout** restores the default arrangement. Layout is saved per browser.
- 15 configurable labs with a live topology, IOS-style device consoles, independent grading and an explained walkthrough.
- Every mission task retains its **Why this step** explanation. Task checkboxes track your own work; grading checks the network configuration and connectivity.
- Searchable lab library, command field guide and console mode indicators.
- Packet paths come from the forwarding model, including traversed switches. Persistent request/reply results distinguish missing routes, unreachable next hops, ACL drops and closed ports. Replay shows the last test; run the command again to test a changed configuration.
- Subnetting drill with mixed, warm-up and small-network prefix ranges; 16 explained theory questions across wireless, IPv6 concepts, security, services and automation.
- Saved configurations and checklists resume when you reopen a lab. **Transfer progress** exports a JSON backup for import on another browser or device.
- On phones, switch between **Mission & tasks** and **Topology & console**. System reduced-motion preferences disable movement while keeping readable packet results.

For theory scope, see [Cisco's CCNA v1.1 topic outline](https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf). The questions are supplementary concept practice, not a full exam bank.

## Network sandbox

Choose **Sandbox** in the header or lab selector to build a network without grading. Start on an empty canvas, or choose **New / starter → Working LAN starter** for two addressed PCs and a switch.

1. Add routers, switches, PCs or servers from the device palette (up to 16 devices). Drag nodes to arrange them; focus a node and use arrow keys for keyboard positioning.
2. In **Cable builder**, choose devices and free physical ports, then connect them. Remove cables with their × buttons. Router interfaces need `no shutdown`; switch access ports start in VLAN 1.
3. Select a device to use its IOS-style console and command guide. PCs and servers also have an IPv4/mask/gateway form and a DHCP request button. Servers listen on simulated ports 80 and 443.
4. Use **Connectivity probe** or console `ping` commands to trace the real request/reply path and read failure reasons. Experiment with the engine's VLAN, trunk, static route, OSPF, DHCP, ACL and NAT commands.

The project autosaves separately from graded labs and resumes after reopening the app. **Export project / Import project** transfers topology and ordered command history; sandbox files are separate from **Transfer progress** lab backups. Export before choosing a new project. **Undo** reverses one edit or console command; applying a host IP generates two or three commands, so undo those individually if needed. Removing a device also removes its cables. Sandbox actions never earn or change lab grades.

Projects support up to 10,000 edits, 5,000 commands and 5 MB imports. Reopening replays actions in order, preserving configuration modes and DHCP acquisition before later cable changes. Local storage remains per browser/origin. This uses the same simplified IPv4 learning engine as the labs, rather than full Packet Tracer protocol/device coverage; IPv6 forwarding, wireless simulation and hardware/module customization are not included.

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

The lab test extracts only the code between the ENGINE markers, creates every lab, executes its per-device solution through `execLine`, and asserts every grading check passes. It also requires an explanation for each task and runs all task-by-task instruction commands to a passing grade. Node is only needed for development tests, not for nginx deployment.

    node tests/labs.cjs
    node tests/forwarding.cjs
    node tests/sandbox.cjs

GitHub Actions runs all three dependency-free checks on pushes and pull requests.

Optional browser integration tests use Playwright:

    npm install --no-save --package-lock=false playwright
    npx playwright install chromium
    node tests/ui.cjs
    node tests/matrix.cjs
    node tests/sandbox-ui.cjs

Alternatively set `LAB4NET_BROWSER_CHANNEL=msedge` to use an installed Edge browser. The browser suite opens the local file, grades every lab, checks command/session restoration and backup import/export, and exercises the library, guide, practices, phone layout and reduced motion. The sandbox suite covers actual editor controls, cabling, configuration/position restoration, project transfer, packet paths and phone use. The Matrix suite additionally checks rain preferences, pop-out guidance, window dragging/resizing/restoration and common desktop resolutions. `LAB4NET_SCREENSHOTS` optionally specifies a directory for desktop and phone captures.

## Notes

- Passes use the existing `ccna-bench-v2` localStorage key, preserving earlier progress. Command journals and task marks use `lab4net-workspace-v1`.
- Storage is per browser and origin. Export before clearing browser data or switching from a local file to a server. A backup includes simulated passwords and configurations; use fictional lab credentials.
- Import validates command journals by rebuilding them before replacing saved work. Earned lab passes are merged; included lab drafts replace their corresponding saved configurations.
- Saved command history is capped at 5,000 commands per lab; backups at 5 MB. Start over removes that lab's draft and checklist, while preserving its earned pass.
- There is no automatic account/cloud synchronization; JSON transfer works entirely offline.
- This is an educational IOS-style model, not a full IOS emulator. Authentication, timing, STP, EtherChannel and port security are simplified. SSH/Telnet report connection results rather than opening interactive remote shells. IPv6 forwarding and HSRP labs are not implemented.
