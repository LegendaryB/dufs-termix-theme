#!/usr/bin/env bash
# Copy assets/ to the server that runs dufs.
#
#   scripts/deploy.sh user@host:/opt/dufs-theme
#   DUFS_DEPLOY_TARGET=user@host:/opt/dufs-theme scripts/deploy.sh
#
# A target without "host:" is treated as a local folder. Nothing is deleted on
# the target. dufs picks the files up on the next request, no restart needed.
set -euo pipefail
cd "$(dirname "$0")/.."

target=${1:-${DUFS_DEPLOY_TARGET:-}}
[[ -n $target ]] || { echo "usage: scripts/deploy.sh [user@]host:/path" >&2; exit 2; }

if [[ $target == *:* && $target != [A-Za-z]:[/\\]* ]]; then
  host=${target%%:*}
  path=${target#*:}
  ssh "$host" mkdir -p -- "$path"
  scp -r assets/. "$host:$path/"
else
  mkdir -p -- "$target"
  cp -r assets/. "$target/"
fi

echo "Deployed assets/ to $target"
