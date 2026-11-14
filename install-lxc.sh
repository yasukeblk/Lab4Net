#!/usr/bin/env bash
# Installs Lab4Net on a plain Debian/Ubuntu LXC (no Docker needed).
set -euo pipefail
cd "$(dirname "$0")"
apt-get update
apt-get install -y nginx
install -m 644 index.html /var/www/html/index.html
rm -f /var/www/html/index.nginx-debian.html
systemctl enable --now nginx
echo "Lab4Net is running at: http://$(hostname -I | awk '{print $1}')/"
