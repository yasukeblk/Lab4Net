#!/usr/bin/env bash
# Installs CCNA Lab Bench on a plain Debian/Ubuntu LXC (no Docker needed).
set -euo pipefail
cd "$(dirname "$0")"
apt-get update
apt-get install -y nginx python3 ca-certificates
install -m 644 index.html /var/www/html/index.html
install -d -m 755 /opt/lab4net-assistant
install -m 644 assistant_server.py /opt/lab4net-assistant/assistant_server.py
install -d -m 700 /etc/lab4net
if [ ! -f /etc/lab4net/assistant.env ]; then
  install -m 600 assistant.env.example /etc/lab4net/assistant.env
fi
install -m 644 deploy/lab4net-assistant.service /etc/systemd/system/lab4net-assistant.service
install -m 644 deploy/nginx-lxc.conf /etc/nginx/sites-available/lab4net
ln -sfn /etc/nginx/sites-available/lab4net /etc/nginx/sites-enabled/default
rm -f /var/www/html/index.nginx-debian.html
nginx -t
systemctl daemon-reload
systemctl enable lab4net-assistant
systemctl restart lab4net-assistant
systemctl enable --now nginx
systemctl reload nginx
echo "CCNA Lab Bench is running at: http://$(hostname -I | awk '{print $1}')/"
echo "Operator AI: set OPENAI_API_KEY in /etc/lab4net/assistant.env, then systemctl restart lab4net-assistant."
