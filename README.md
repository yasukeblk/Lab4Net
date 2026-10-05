# Lab4Net · CCNA Lab Bench

A single-page CCNA learning workspace. Open `index.html` directly in a modern browser, or serve it with nginx. All simulator code, styles and content live in that file; no build, runtime dependencies, external fonts or backend are required.

## Learning workspace

- 36 configurable build labs, 35 troubleshooting incidents and 2 capstones, each with a live topology, IOS-style device consoles, independent grading and an explained walkthrough. Every lab is tagged with its CCNA 200-301 v1.1 objectives.
- Labs cover switching (VLANs, trunks, native VLAN, voice VLAN, EtherChannel, spanning tree, CDP and LLDP, Layer 3 switching), routing (static and floating routes, route selection, OSPF including DR/BDR, HSRP), IPv6 addressing and static routing, IP services (DHCP and relay, PAT, static and dynamic NAT, NTP, syslog) and security (ACLs, port security, DHCP snooping, Dynamic ARP Inspection, device hardening and SSH).
- Every mission task retains its **Why this step** explanation. Task checkboxes track your own work; grading checks the network configuration and connectivity.
- Searchable lab library, command field guide and console mode indicators.
- Packet paths come from the forwarding model, including traversed switches. Persistent request/reply results distinguish missing routes, unreachable next hops, ACL drops and closed ports. Replay shows the last test; run the command again to test a changed configuration.
- 54 lessons that teach the concept before the commands: one per build lab (opening on the first visit, with a step-through animation on the lab's own map) and 18 topic lessons for the exam objectives with no lab (wireless, QoS, SNMP, VPNs, AAA, automation, REST APIs, Ansible and Terraform, AI). Each has key terms, exam notes, common mistakes and a quick check.
- Subnetting drill with mixed, warm-up and small-network prefix ranges; 28 explained theory questions across wireless, IPv6 concepts, security, services and automation.
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

The live copy should track `main`. The `chatgpt/improvements` branch is a separate line of work and is not merged into `main`; see `docs/HANDOFF.md`.

For Docker, run `git pull && docker compose up -d --build`.

## Verification

The lab test extracts only the code between the ENGINE markers, creates every lab, executes its per-device solution through `execLine`, and asserts every grading check passes. It also requires an explanation for each task. Node is only needed for development tests, not for nginx deployment.

    node tests/labs.cjs
    node tests/forwarding.cjs
    node tests/curriculum.cjs
    node tests/lessons.cjs

`labs.cjs` also follows every lab's step-by-step guide to a passing grade. `forwarding.cjs` tests the packet engine (routing, ACLs, NAT, VLANs, IPv6, HSRP, DHCP snooping, DAI, err-disabled ports). `curriculum.cjs` checks the objective map and that every incident starts broken and is fixed by its repair. `lessons.cjs` checks every lesson's structure, quiz answers and animation steps, and that every build lab has one (see `docs/LESSON-WRITING.md`). GitHub Actions runs all four on pushes and pull requests.

Optional browser integration tests use Playwright:

    npm install --no-save --package-lock=false playwright
    npx playwright install chromium
    node tests/ui.cjs

Alternatively set `LAB4NET_BROWSER_CHANNEL=msedge` to use an installed Edge browser. The browser suite opens the local file, grades every lab, checks command/session restoration and backup import/export, and exercises the library, guide, practices, phone layout and reduced motion. `LAB4NET_SCREENSHOTS` optionally specifies a directory for desktop and phone captures.

## Notes

- Passes use the existing `ccna-bench-v2` localStorage key, preserving earlier progress. Command journals and task marks use `lab4net-workspace-v1`.
- Storage is per browser and origin. Export before clearing browser data or switching from a local file to a server. A backup includes simulated passwords and configurations; use fictional lab credentials.
- Import validates command journals by rebuilding them before replacing saved work. Earned lab passes are merged; included lab drafts replace their corresponding saved configurations.
- Saved command history is capped at 5,000 commands per lab; backups at 5 MB. Start over removes that lab's draft and checklist, while preserving its earned pass.
- There is no automatic account/cloud synchronization; JSON transfer works entirely offline.
- This is an educational IOS-style model, not a full IOS emulator. Timers, authentication prompts and some protocol details are simplified (see Known limits in `docs/HANDOFF.md`). SSH/Telnet report connection results rather than opening interactive remote shells. IPv6 has static routing only, and wireless is covered by lessons and theory questions, with no simulated wireless.
