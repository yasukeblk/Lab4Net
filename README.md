# CCNA Lab Bench

A single-page CCNA lab simulator. Everything runs in the browser; the server only serves one static file.

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

Replace `index.html` and re-run `install-lxc.sh` (LXC) or `docker compose up -d --build` (Docker).

## Notes

- Lab progress is stored in each browser (localStorage), not on the server.
- Fonts load from Google Fonts; without internet access the page falls back to system fonts.
