#!/usr/bin/env bash
# Move the theme to a new dufs release.
#
#   scripts/update.sh [tag]            show what changed upstream (default: latest release)
#   scripts/update.sh [tag] --apply    copy index.js/favicon.ico, rebuild index.html, bump DUFS_VERSION
#
# Needs: bash, curl, diff, awk. Always uses release tags, never main: the UI and
# the server ship together, and main can be ahead of the binary you run.
set -euo pipefail
cd "$(dirname "$0")/.."

RAW=https://raw.githubusercontent.com/sigoden/dufs
FILES=(index.html index.js index.css favicon.ico)
OLD=$(tr -d '[:space:]' < DUFS_VERSION)
NEW=""
APPLY=0

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    v*) NEW=$arg ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

if [[ -z $NEW ]]; then
  NEW=$(curl -sSf https://api.github.com/repos/sigoden/dufs/releases/latest \
    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p')
  [[ -n $NEW ]] || { echo "could not determine latest release" >&2; exit 1; }
fi

if [[ $NEW == "$OLD" ]]; then
  echo "already on $OLD"
  exit 0
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for v in "$OLD" "$NEW"; do
  mkdir "$tmp/$v"
  for f in "${FILES[@]}"; do
    curl -sSfL --retry 3 --retry-all-errors -o "$tmp/$v/$f" "$RAW/$v/assets/$f"
  done
done

echo "== upstream UI changes $OLD -> $NEW =="
if diff -ru "$tmp/$OLD" "$tmp/$NEW"; then
  echo "(none)"
fi
echo

if [[ $APPLY -eq 0 ]]; then
  echo "Nothing changed. Re-run with --apply to update assets/ to $NEW."
  exit 0
fi

# Rebuild index.html from the new upstream file plus our three lines.
awk '
  /href="__ASSETS_PREFIX__index.css"/ {
    print "  <script src=\"__ASSETS_PREFIX__theme-init.js\"></script>"
    print
    print "  <link rel=\"stylesheet\" href=\"__ASSETS_PREFIX__custom.css\">"
    css = 1; next
  }
  /src="__ASSETS_PREFIX__index.js"/ {
    print
    print "  <script src=\"__ASSETS_PREFIX__custom.js\"></script>"
    js = 1; next
  }
  { print }
  END { if (!css || !js) exit 1 }
' "$tmp/$NEW/index.html" > "$tmp/index.html" \
  || { echo "index.html layout changed upstream: merge the three custom lines by hand." >&2; exit 1; }

cp "$tmp/index.html" assets/index.html
cp "$tmp/$NEW/index.js" "$tmp/$NEW/favicon.ico" assets/
echo "$NEW" > DUFS_VERSION

echo "Updated to $NEW."
echo "Next: check the diff above for renamed classes used by assets/index.css and"
echo "assets/custom.js, and new upstream classes that need styling, then try it with"
echo "'dufs --assets assets'."
