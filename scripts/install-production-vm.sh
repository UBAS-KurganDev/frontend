#!/usr/bin/env bash

set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root: sudo bash scripts/install-production-vm.sh" >&2
  exit 2
fi

readonly REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DEPLOY_ROOT="/opt/ubas-frontend"

if ! id ubas >/dev/null 2>&1; then
  echo "The ubas VM user is missing" >&2
  exit 2
fi
for command in docker jq nginx; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "Required command is missing: ${command}" >&2
    exit 2
  fi
done

# The deployment user must create lock and state files in DEPLOY_ROOT. Nginx
# needs traverse-only access to serve the world-readable current-release file.
install -d -o ubas -g ubas -m 0711 "${DEPLOY_ROOT}"
install -d -o ubas -g ubas -m 0750 "${DEPLOY_ROOT}/staging"
install -o ubas -g ubas -m 0750 \
  "${REPOSITORY_ROOT}/scripts/poll-production.sh" \
  "${DEPLOY_ROOT}/poll-production.sh"
install -o ubas -g ubas -m 0750 \
  "${REPOSITORY_ROOT}/scripts/deploy-production.sh" \
  "${DEPLOY_ROOT}/deploy-production.sh"
if [[ ! -f "${DEPLOY_ROOT}/current-release" ]]; then
  printf '%s\n' 'none' >"${DEPLOY_ROOT}/current-release"
fi
chown ubas:ubas "${DEPLOY_ROOT}/current-release"
chmod 0644 "${DEPLOY_ROOT}/current-release"

install -m 0644 \
  "${REPOSITORY_ROOT}/deployment/ubas-frontend-deploy.service" \
  /etc/systemd/system/ubas-frontend-deploy.service
install -m 0644 \
  "${REPOSITORY_ROOT}/deployment/ubas-frontend-deploy.timer" \
  /etc/systemd/system/ubas-frontend-deploy.timer
install -m 0644 \
  "${REPOSITORY_ROOT}/deployment/nginx-ubas.conf" \
  /etc/nginx/sites-available/ubas
ln -sfn /etc/nginx/sites-available/ubas /etc/nginx/sites-enabled/ubas
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
systemctl daemon-reload
systemctl enable --now ubas-frontend-deploy.timer
echo "UBAS frontend deployment timer installed"
