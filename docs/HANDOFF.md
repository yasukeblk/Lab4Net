# Lab4Net handoff

State as of commit `a856918` on `main` (4 Oct 2026). Read this before touching anything.

## What this is

Lab4Net is a browser-based lab simulator for the Cisco CCNA exam, modeled on Boson NetSim with a Packet Tracer style sandbox. The owner, Yasuke, is the learner and the only user. He is studying for the CCNA and wants the tool to be accurate first, then rewarding and fun to use.

It currently has:

- 15 graded labs (device basics, VLANs, trunking, router-on-a-stick, static routing, OSPF, spanning tree, EtherChannel, DHCP and relay, PAT, static NAT, standard and extended ACLs, port security, SSH)
- A simulated IOS-style console per device, with `?` help, Tab completion, abbreviations and history
- A network map that animates each ping, telnet or ssh along the path the packet really takes, and labels where and why it fails
- Step-by-step instructions per task (switchable, and can pop out into its own window), plus a "why" for every task and every command
- A subnetting drill and a 16-question theory check
- Stage ranks (S to D), XP and levels, combos, trophies, generated sound effects
- Movable, resizable, snapping windows with a saved layout
- A sandbox: place devices, choose ports when cabling, zoom and pan, notes, starter kits, save and load files, and four goal-checked challenges

## Where everything is

| Thing | Location |
| --- | --- |
| Repo | https://github.com/yasukeblk/Lab4Net (public) |
| Working branch | `main` |
| Local clone | `Documents/Lab4Net` on Yasuke's desktop |
| Live copy | LXC container "Lab4Net" on his Proxmox server, `http://192.168.1.106/`, repo cloned at `/opt/lab4net`, served by nginx. Only reachable on his home network. |
| Other branch | `chatgpt/improvements` is ChatGPT's independent line of work. Never merge it into `main`. |

The whole app is one self-contained file, `index.html`. There is no build step, no backend and no dependencies. Fonts are embedded as base64. Opening the file in a browser runs it.

Deploying to the container, once a change is pushed:

```
cd /opt/lab4net && git checkout main && git pull && bash install-lxc.sh
```

Then he hard-refreshes the page.

## How Yasuke works

- He does not write code. Give him finished results and plain-language summaries, mostly as short bullet lists.
- Do the work without asking permission for design or implementation choices. Tell him afterwards what you did and what you chose not to do.
- Every command block you show him needs a one-line label saying which machine it runs on (his desktop, the Proxmox host, or the Lab4Net container). He treats a missing label as dangerous.
- Only show deploy commands when a change is actually ready to deploy.
- Keep the "Still owed" list at the bottom of this file current, and repeat it at the end of each summary. Dropped follow-ups have burned him before.
- Report honestly what you verified and what you did not.

## The workflow if you are working in chat

This is how the project has run so far, and Yasuke wants it to continue the same way. You build and test in your own sandbox; Claude Code on his desktop commits and pushes; the container pulls.

1. Clone the public repo in your sandbox and work on `index.html` there. You cannot push, and you cannot reach his desktop or the container.
2. Run `node tests/labs.cjs` and `node tests/forwarding.cjs` before handing anything over.
3. Check visual and interactive changes in a real browser. In the chat sandbox, `npm i @sparticuz/chromium puppeteer-core` gives a headless Chromium that works: launch it with `executablePath: await chromium.executablePath()` and `args: ['--no-sandbox','--disable-gpu','--single-process','--no-zygote']`, open the file, drive it, and take screenshots. `tests/ui.cjs` also runs there if you install `playwright-core` and point its `chromium.launch` at that same executable.
4. Give him a zip containing only the files that changed, laid out as they sit in the repo.
5. Give him a prompt to paste into Claude Code that says: fetch and pull `main`, copy the files from the zip in his Downloads folder over the repo, confirm `index.html` is the exact byte size you state, run the two Node tests, commit with a given message, push, and report the commit hash. Stating the byte size matters: Code once picked up an older zip of the same name.
6. Give him the container command from the section above, labelled for the Lab4Net container.
7. If he says the change is not showing, clone the repo again and compare `main` with your build before guessing. Twice the cause was that the build had not been pushed, and once the container was still on ChatGPT's branch.

Publishing the page as an artifact in chat as well lets him see a change before deploying it.

## Design direction

He chose this after several rounds, so do not restyle without being asked:

- A remastered arcade game, in the spirit of Streets of Rage 4: an old game brought back with modern art, lighting and shadows.
- Neon night palette, dark panels with soft shadows and coloured glows, bold italic arcade lettering, chunky slanted buttons, comic hit-sparks.
- The console stays a retro amber CRT. The DOS-style path line and the boot screen stay.
- Desktop is the target. The phone layout only has to stay usable.
- He wants lots of animation, but everything must be disabled under `prefers-reduced-motion`.

Design tokens are CSS variables on `:root` at the top of the stylesheet (`--night`, `--panel`, `--yel`, `--mag`, `--cy`, `--go`, `--bad`, `--ph` and so on). Display type is Barlow Condensed italic (`--px`), console and code are VT323 (`--mono`), reading text is IBM Plex Sans (`--ui`). Window title bars are colour-coded: Mission gold, Checklist orange, Network map magenta, Console blue, Guide green.

## Map of index.html

Line numbers are approximate. Search for the markers rather than trusting them.

| Lines | What |
| --- | --- |
| 1 to 456 | `<head>` and the stylesheet. The first six `@font-face` lines are base64 font data, tens of kilobytes each. Never print or read them in full; skip them with a line range or grep. |
| 458 to 488 | Page markup: header, status line, the windows, dialog, overlays |
| 490 to 1252 | The simulator, between `//ENGINE-START` and `//ENGINE-END` |
| 1252 to end | The interface |

### Engine (pure logic, no DOM)

In file order:

1. Core: address helpers (`ip2n`, `n2ip`, `lenMask`, `netOf`), device constructors (`mkRouter`, `mkSwitch`, `mkPC`, `mkNet`, `link`, `setIp`, `addIf`), link state (`ifUp`), Layer 2 flooding with VLANs and trunks (`l2peers`), routing (`routes`, `nextHop`, OSPF), the command table, the parser, and labs 1 to 6.
2. `// ---------- v2 engine`: ACLs, NAT, packet forwarding (`fwd`, `reach`), DHCP, port security, SSH, CDP, spanning tree (`stpCalc`), EtherChannel (`bundled`), `runningConfig` extras, per-command explanations (`WHYC`, `whyOf`), and the later labs.
3. `// ---------- step-by-step instructions`: `STEPS` (keyed by lab title) and `guideFor`.

Key facts:

- A network is `{devs:{name:device}, links:[...]}`. A device has `type` (`router`, `switch`, `pc`), `hostname`, `ifs` keyed by full interface name, plus feature state (`statics`, `ospf`, `vlans`, `acls`, `nat`, `dhcp`, `stp`, `users`, `lines`). Servers are `pc` devices with a `services` port list.
- Commands are registered with `C(modes, pattern, handler, deviceTypes)`. Modes are `user`, `priv`, `config`, `if`, `vlan`, `line`, `ospf`, `acl`, `dhcp`, `pc`. Pattern tokens are literal keywords (prefix-matched, which gives abbreviations) or `<ip>`, `<n>`, `<w>`, `<rest>`, `<rest?>`. The first matching entry wins, so order matters.
- `execLine(net, device, session, line)` runs one command and returns output lines. A session is `{mode, ctx}`.
- `reach(net, src, dstIp, proto, port)` forwards a packet and its reply through routing, ACLs and NAT. When called from a live command it records `TRACE`, which the map animation and the trace panel read.
- Several engine functions are wrapped later in the same section by reassigning the function name (`run`, `ifUp`, `promptOf`, `runningConfig`, `canPing`, `tracePath`). The last definition is the live one.

A lab is an object in `LABS`:

```
{ title, group, brief, pos:{device:[x,y]}, start, build(), addr:[[device, interface, address]],
  tasks:[html], why:[text], checks:[[description, net=>boolean]], solution:{device:[commands]} }
```

`steps` is filled from `STEPS[title]`: one entry per task, written as `"DEV: cmd | cmd ; DEV2: cmd"`. A command starting with `#` is a note, not a command. Every lab must have exactly one `why` and one `STEPS` entry per task.

### Interface

The base layer was written by ChatGPT on top of the original: global state (`cur`, `progress`, `drafts`), `openLab`, `replay`, `saveWork`, `renderAll`, `renderLabs`, `renderBrief`, `renderDrill`, `renderQuiz`, `drawTopo`, `fly`, `burst`, `playTrace`, `renderTerm`, `execute`, `select`, `library`, `help`, `transfer`, `dialog`, `notify`. A lab's saved work is its command journal, replayed onto a fresh `build()`.

Later blocks, each under a `// ----------` comment, extend it in this order:

1. Guide switch (`stepsHtml`, `stepsBlock`), defined just before the first `openLab` call
2. Menu clock and boot screen
3. Pop-out guide window and the window manager (move, resize, snap, saved layout)
4. Rewards (ranks, XP, levels, combos, trophies, sound, device hover card)
5. Sandbox (devices, cabling, zoom and pan, notes, kits, challenges, files)
6. Backup (adds ranks, layout and sandbox to Transfer progress)

**The pattern to know:** these blocks do not edit the base functions. They wrap them by reassigning the name, for example `const ex0 = execute; execute = function(line){ ex0(line); ... }`. `renderAll`, `openLab`, `execute`, `celebrate`, `library`, `renderBrief`, `renderTerm`, `drawTopo`, `select`, `renderLabs` and `transfer` are all wrapped, some more than once. The outermost wrapper is the one defined last. Before changing behaviour, grep for every `name=function` to see the whole chain.

Browser storage keys: `lab4net-workspace-v1` (progress, journals, last lab), `lab4net-layout-v3`, `lab4net-fun-v1`, `lab4net-sandbox-v1`, `lab4net-guide`, `lab4net-guide-pop`, `lab4net-last`, `lab4net-pending` (extras from an imported backup, applied on the next load), and `l4n-boot` in session storage.

## Verifying changes

Run these before every commit. All three pass at `a856918`.

```
node tests/labs.cjs
node tests/forwarding.cjs
node tests/ui.cjs
```

- `labs.cjs` builds every lab, runs its solution and asserts every check passes, then does the same following the step-by-step instructions. It also runs in GitHub Actions on every push.
- `forwarding.cjs` covers routing, ACL direction, static NAT, closed ports, VLAN paths and link failure.
- `ui.cjs` drives the real page in a browser at desktop and phone sizes. It needs Playwright and a Chromium-family browser installed locally (`npm i -D playwright`), and it is not part of CI.

For anything visual, open the page in a real browser and look at it. Earlier in this project several bugs were only caught by screenshots or by driving the page: a CSS class named `.switch` that restyled the switch device icon, a transformed element that covered a hidden checkbox, and a results dialog that blocked later clicks.

## Rules that keep it working

1. Every lab must stay completable and gradable. Do not weaken a check to make a test pass.
2. `git pull && bash install-lxc.sh` on a plain Debian container must keep working. If you ever split the file, update `install-lxc.sh`, the `Dockerfile` and the `README`.
3. Keep it fully offline: no external requests, fonts stay embedded.
4. Keep the "why" explanations. Understanding the reason for each step is the point of the project.
5. Do not open modal dialogs or reload the page automatically after an action; both have broken the browser test. Non-modal cards and a "Reload now" button are the established answers.
6. If you change the default size of a window, bump the layout storage key so saved layouts re-derive.
7. `ui.cjs` relies on some specifics: the text "Reply received", the `.selring` class having no animation under reduced motion, task checkboxes being clickable, and the page not navigating mid-run.
8. New CSS class names must not collide with device type names (`router`, `switch`, `pc`, `srv`), which are used as classes on map devices and console tabs.
9. Update `CHANGES.md` with each change, in plain language.

## Known limits

- The simulator implements the commands the labs need, not all of IOS. Anything else returns "Invalid input".
- `?` help lists options without descriptions, there is no `^` error marker, ambiguous abbreviations silently take the first match, and there is no `--More--` paging or `| include`.
- `enable` and line passwords are stored and graded but never prompted for.
- No IPv6, HSRP or wireless. Switches do not route.
- Sandbox challenges do not award XP or trophies. Sandbox device models are fixed (3 or 5 port routers, 10 or 26 port switches).
- Ranks, XP and trophies live in the browser. Transfer progress carries them, but a different browser starts fresh until an import.

## ChatGPT's branch

`chatgpt/improvements` has diverged and Yasuke compares the two by eye. Its first round (saved work, lab library, command guide, trace diagnostics, static NAT lab, theory check, the test files) was folded into `main` by hand. Its later commits add an AI tutor that calls OpenAI through a server-side relay, and "guided fault investigations". None of that is in `main`. If Yasuke asks for one of its features, read the branch and rebuild the feature here; a git merge cannot combine two single-file apps. Note that the AI tutor needs a backend and an API key, and `main` is a static page.

## Still owed

Carry this list forward and keep it in every summary.

- IPv6 addressing and routing
- HSRP lab
- `enable` and console password prompts
- A fuller theory question bank (16 questions so far)
- Layer 3 switch for the sandbox
- XP and trophies for sandbox challenges
- Closer-to-real `?` help: descriptions, the `^` marker, "% Ambiguous command", `| include` and `| begin` (offered, not yet confirmed)
- Whether the pop-out guide should also open in a separate browser window for a second monitor (waiting on his decision)

His most recent direction was "continue to build" on the sandbox and to make the app "more rewarding and fun", so sandbox depth and troubleshooting-style content are the likeliest next asks.
