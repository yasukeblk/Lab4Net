# Lab4Net · CCNA Lab Bench

A single-page CCNA learning workspace. Open `index.html` directly in a modern browser, or serve it with nginx. All simulator code, styles and content live in that file; no build, runtime dependencies, external fonts or backend are required.

## Learning workspace

The interface is a desktop-first retro PC workstation: beveled controls, lavender window frames, a mint terminal and animated pixel packets. On desktop, drag the divider beside the mission to change its width and the divider above the console to change the map/console balance. Focus a divider and use the arrow keys for keyboard resizing. Sizes are remembered in this browser.

**Maximize** expands the console; **Restore** or Escape returns to the full workspace. F1 opens help and F2 opens the lab library. Grading controls stay accessible at the bottom of the mission panel. On wide desktops, packet diagnostics sit beside the topology instead of shrinking its height.

Motion includes device boot sequences, link pulses, window transitions, packet trails and a short mission-complete celebration. System reduced-motion settings disable these effects while preserving all results and controls.

### Step-by-step instructions

Each lab has a command-by-command guide showing the target device, expected IOS prompt, exact command, next prompt when it changes, and the reason for the command. **Back**, **Next** and **Jump to step** navigate without changing the network. Successfully entering the exact displayed command advances the guide automatically; use Next after an abbreviated equivalent.

- **Instructions ON/OFF** shows or hides only the step-by-step command-guide card. Separate **General information**, **Address plan** and **Your objectives** cards remain available, with task checkboxes and their why explanations. Grading remains available in the mission panel and from the console's **Grade** button.
- **Pop out** opens instructions in a separate resizable browser window, suitable for a second monitor. It follows the active lab and step, includes the address plan and task explanations, and can grade the lab at the final step.
- **Dock** returns the guide card to the workspace. Closing the window also restores it. The general-information and objective cards remain in the main workspace while the guide is popped out. If a browser blocks the pop-up, the app keeps the guide docked and explains how to allow it.
- Your show/hide preference and each lab's current step are remembered locally. The guide presents one working solution; it does not execute commands or treat step navigation as grading.

- 15 configurable labs with a live topology, IOS-style device consoles, independent grading and an explained walkthrough.
- Every mission task retains its **Why this step** explanation. Task checkboxes track your own work; grading checks the network configuration and connectivity.
- Searchable lab library, command field guide and console mode indicators.
- Packet paths come from the forwarding model, including traversed switches. Persistent request/reply results distinguish missing routes, unreachable next hops, ACL drops and closed ports. Replay shows the last test; run the command again to test a changed configuration.
- Subnetting drill with mixed, warm-up and small-network prefix ranges; 16 explained theory questions across wireless, IPv6 concepts, security, services and automation.
- Saved configurations and checklists resume when you reopen a lab. **Transfer progress** exports a JSON backup for import on another browser or device.
- On phones, switch between **Mission & tasks** and **Topology & console**. System reduced-motion preferences disable movement while keeping readable packet results.

For theory scope, see [Cisco's CCNA v1.1 topic outline](https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf). The questions are supplementary concept practice, not a full exam bank.

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

The lab test extracts only the code between the ENGINE markers, creates every lab, executes its per-device solution through `execLine`, and asserts every grading check passes. It also requires an explanation for each task. Node is only needed for development tests, not for nginx deployment.

    node tests/labs.cjs
    node tests/forwarding.cjs

GitHub Actions runs both dependency-free checks on pushes and pull requests.

Optional browser integration tests use Playwright:

    npm install --no-save --package-lock=false playwright
    npx playwright install chromium
    node tests/ui.cjs
    node tests/instructions.cjs

Alternatively set `LAB4NET_BROWSER_CHANNEL=msedge` to use an installed Edge browser. The browser suite opens the local file, grades every lab, checks command/session restoration and backup import/export, and exercises the library, guide, practices, phone layout and reduced motion. `LAB4NET_SCREENSHOTS` optionally specifies a directory for desktop and phone captures.

## Notes

- Passes use the existing `ccna-bench-v2` localStorage key, preserving earlier progress. Command journals and task marks use `lab4net-workspace-v1`.
- Desktop panel sizes use `lab4net-layout-v1`; they are local preferences and are not included in progress backups.
- Instruction visibility and per-lab step bookmarks use `lab4net-instructions-v1`. They are local preferences and are not included in progress backups.
- Storage is per browser and origin. Export before clearing browser data or switching from a local file to a server. A backup includes simulated passwords and configurations; use fictional lab credentials.
- Import validates command journals by rebuilding them before replacing saved work. Earned lab passes are merged; included lab drafts replace their corresponding saved configurations.
- Saved command history is capped at 5,000 commands per lab; backups at 5 MB. Start over removes that lab's draft and checklist, while preserving its earned pass.
- There is no automatic account/cloud synchronization; JSON transfer works entirely offline.
- This is an educational IOS-style model, not a full IOS emulator. Authentication, timing, STP, EtherChannel and port security are simplified. SSH/Telnet report connection results rather than opening interactive remote shells. IPv6 forwarding and HSRP labs are not implemented.
