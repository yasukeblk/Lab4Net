# Lab4Net

**A free, open-source CCNA lab simulator that runs in your browser.** Configure routers, switches and PCs from IOS-style consoles, watch packets travel the network map, and get graded on whether the network actually works.

**Use it now: https://yasukeblk.github.io/Lab4Net/**

No install, no account and no ads. Your progress stays in your own browser. The public site counts visits anonymously (no cookies, no personal data, and nothing at all if your browser sends Do Not Track); a copy you host yourself or open from a file sends nothing.

> Lab4Net is an independent study tool. It is not affiliated with, endorsed by or sponsored by Cisco Systems, Inc. Cisco, Cisco IOS, CCNA and Catalyst are trademarks or registered trademarks of Cisco Systems, Inc. The simulator models what the labs need; when it and real equipment disagree, trust the real equipment.

## What's inside

- **77 labs** mapped to the CCNA 200-301 v1.1 exam topics:
  - 38 build labs, covering fundamentals, switching, routing, IPv6, IP services and security
  - 37 troubleshooting incidents, where you get a broken network to fix
  - 2 capstones that build a whole network from factory defaults
- **A console that behaves like the real thing:**
  - errors with the `^` marker, `% Incomplete command` and `% Ambiguous command`
  - `?` help, Tab completion and `| include`
  - password prompts, Telnet and SSH sessions, and `reload`
  - live ping and traceroute output (`.!!!!`, `U.U.U`, `!H`) with ARP
  - MAC address tables, spanning tree, duplex mismatches and debug output
- **A network map** that animates every ping along the path it really takes, and shows exactly where and why it failed.
- **Learning support:**
  - 56 lessons that teach the concept before the commands
  - a "why" for every task and command
  - optional step-by-step guides, which can pop out to a second monitor
  - a subnetting drill and a 110-question theory check
- **Reasons to come back:**
  - a campaign mode with eight stages and boss fights
  - an exam simulator with hidden faults and a clock, plus a daily challenge
  - ranks, XP, levels and trophies
  - a free-build sandbox with challenges
- **Transfer progress** exports a backup file you can import on another browser or device.

Desktop is the main target. It works on phones, but a keyboard and a big screen make it much nicer.

## Support Lab4Net

Lab4Net is free and stays free. If it helped you study, you can say thanks at **https://buymeacoffee.com/yasukeblk**. It's entirely optional.

## Run it yourself

It's one file. Download `index.html` and open it in a modern browser. It works offline and makes no network requests (the visit counter only runs on the public site).

To host it on your own network:

- **nginx on Debian/Ubuntu (for example a Proxmox LXC):** copy this folder to the machine and run `bash install-lxc.sh`, then browse to `http://<machine-ip>/`. To update later: `git pull && bash install-lxc.sh`.
- **Docker:** `docker compose up -d --build`, then browse to `http://<host-ip>:8080/`.

## Contributing

Bug reports and corrections are welcome, especially anything the simulator gets wrong compared with real IOS. Please open an issue with the commands you typed, what Lab4Net printed, and what real equipment prints.

Developers: start with [`docs/DEVELOPING.md`](docs/DEVELOPING.md), which covers the file layout, the engine, the tests and the rules that keep every lab gradable. Before any change, run the tests:

    node tests/labs.cjs
    node tests/forwarding.cjs

The other `tests/*.cjs` files cover the console, ping, switching, prompts, OSPF areas, the exam simulator, the quiz and more. GitHub Actions runs the Node tests on every push. The browser tests (`ui.cjs`, `guidewin.cjs`, `pageflows.cjs`) need Playwright:

    npm install --no-save --package-lock=false playwright
    npx playwright install chromium

## Licence

Lab4Net is released under the [MIT licence](LICENSE). The embedded fonts (Barlow Condensed, VT323 and IBM Plex Sans) are under the SIL Open Font License 1.1; see [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
