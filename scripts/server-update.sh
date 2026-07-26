#!/usr/bin/env bash
set -euo pipefail

branch="${1:-main}"
service_name="${2:-nyx-site}"

if [[ ! "$branch" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo "Branch invalida."
  exit 2
fi

if [[ ! "$service_name" =~ ^[A-Za-z0-9_.@-]+$ ]]; then
  echo "Servico invalido."
  exit 2
fi

git fetch origin "$branch"
git merge --ff-only "origin/$branch"
npm ci
npm run build
sudo systemctl restart "$service_name"
sudo systemctl is-active --quiet "$service_name"

echo "Servidor atualizado para $(git rev-parse --short HEAD)."
