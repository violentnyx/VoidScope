#!/usr/bin/env bash
set -euo pipefail

app_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
state_dir="/var/lib/planka"
secrets_dir="$state_dir/secrets"
caddyfile="/etc/caddy/Caddyfile"
caddy_marker="blanka.nyxaim.space"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute este script com sudo." >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2
  systemctl enable --now docker
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 não está disponível." >&2
  exit 1
fi

install -d -m 0700 "$secrets_dir"

create_secret() {
  local path="$1"
  local bytes="$2"
  if [[ ! -s "$path" ]]; then
    umask 077
    openssl rand -base64 "$bytes" | tr -d '\n' > "$path"
    printf '\n' >> "$path"
  fi
  # Compose bind-mounts local secret files without remapping ownership.
  # The parent directory remains root-only (0700), while the mounted file
  # must be readable by the unprivileged `node` user inside the container.
  chmod 0644 "$path"
}

create_secret "$secrets_dir/database_password" 32
create_secret "$secrets_dir/secret_key" 48
create_secret "$secrets_dir/admin_password" 24

cd "$app_dir"
docker compose build --pull
docker compose up -d

for _ in $(seq 1 36); do
  if curl --fail --silent http://127.0.0.1:3002/ >/dev/null; then
    break
  fi
  sleep 5
done

curl --fail --silent --show-error http://127.0.0.1:3002/ >/dev/null

if ! grep -Fq "$caddy_marker" "$caddyfile"; then
  backup="${caddyfile}.bak.$(date -u +%Y%m%d-%H%M%S)"
  cp -a "$caddyfile" "$backup"
  printf '\n' >> "$caddyfile"
  cat "$app_dir/Caddyfile" >> "$caddyfile"
  if ! caddy validate --config "$caddyfile"; then
    cp -a "$backup" "$caddyfile"
    echo "Configuração do Caddy inválida; original restaurado." >&2
    exit 1
  fi
  systemctl reload caddy
fi

docker compose ps
echo "Planka saudável em http://127.0.0.1:3002."
echo "Senha inicial do usuário nyxai: $(tr -d '\r\n' < "$secrets_dir/admin_password")"
