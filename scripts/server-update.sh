#!/usr/bin/env bash
set -euo pipefail

branch="${1:-main}"
service_name="${2:-nyx-site}"
app_root="${NYX_APP_ROOT:-/home/ubuntu/nyx-site}"
state_root="${NYX_STATE_ROOT:-/var/lib/nyx-site}"
release_root="$app_root/releases"
current_link="$app_root/current"
env_file="$state_root/.env.local"
data_dir="$state_root/data"
port="${PORT:-3001}"
bind_host="${NYX_BIND_HOST:-127.0.0.1}"

if [[ ! "$branch" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo "Branch invalida."
  exit 2
fi

if [[ ! "$service_name" =~ ^[A-Za-z0-9_.@-]+$ ]]; then
  echo "Servico invalido."
  exit 2
fi

repo_root="$(pwd -P)"
if ! git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "O diretorio da aplicacao nao e um repositorio Git."
  exit 2
fi

git fetch origin "$branch"
git merge --ff-only "origin/$branch"
nice -n 15 npm ci
NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512}" nice -n 15 npm run build

standalone_dir="$repo_root/.next/standalone"
if [[ ! -f "$standalone_dir/server.js" ]]; then
  echo "O build standalone nao gerou server.js."
  exit 1
fi

if [[ ! -f "$env_file" ]]; then
  echo "Arquivo persistente $env_file nao encontrado."
  exit 1
fi

mkdir -p "$release_root"
release_id="$(date -u +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
new_release="$release_root/$release_id"
mkdir -p "$new_release/.next"
cp -a "$standalone_dir/." "$new_release/"
rm -rf -- "$new_release/.next/static" "$new_release/public" "$new_release/data" "$new_release/.env.local"
cp -a "$repo_root/.next/static" "$new_release/.next/static"
cp -a "$repo_root/public" "$new_release/public"
ln -s "$data_dir" "$new_release/data"
ln -s "$env_file" "$new_release/.env.local"

old_release=""
if [[ -L "$current_link" ]]; then
  old_release="$(readlink -f "$current_link")"
fi

ln -sfn "$new_release" "$current_link.next"
mv -Tf "$current_link.next" "$current_link"

start_release() {
  pm2 delete "$service_name" >/dev/null 2>&1 || true
  PORT="$port" HOSTNAME="$bind_host" pm2 start "$current_link/server.js" \
    --name "$service_name" \
    --cwd "$current_link" \
    --node-args="--env-file=$current_link/.env.local" >/dev/null
}

start_release
sleep 2

if ! curl --fail --silent --show-error "http://127.0.0.1:$port/" >/dev/null; then
  echo "A nova versao nao respondeu; restaurando a anterior."
  if [[ -n "$old_release" && -d "$old_release" ]]; then
    ln -sfn "$old_release" "$current_link.next"
    mv -Tf "$current_link.next" "$current_link"
    start_release
  fi
  exit 1
fi

pm2 save >/dev/null
echo "Servidor atualizado para $(git rev-parse --short HEAD) no release $release_id."
